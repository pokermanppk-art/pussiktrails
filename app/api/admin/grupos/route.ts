import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function json(data: AnyRecord, status = 200) {
  return NextResponse.json(data, { status })
}

function getSupabaseAdmin() {
  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL ausente no ambiente.')
  if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente no ambiente.')

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function erroDeColunaAusente(error: AnyRecord) {
  const mensagem = String(error?.message || error?.details || error?.hint || '').toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    mensagem.includes('schema cache') ||
    mensagem.includes('could not find') ||
    mensagem.includes('column') ||
    mensagem.includes('does not exist')
  )
}

function extrairColunaAusente(error: AnyRecord) {
  const textoErro = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ')

  const matchTabelaColuna = textoErro.match(/[a-zA-Z0-9_]+\.([a-zA-Z0-9_]+)/)
  if (matchTabelaColuna?.[1]) return matchTabelaColuna[1]

  const matchAspas = textoErro.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  const matchColumn = textoErro.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i)
  if (matchColumn?.[1]) return matchColumn[1]

  return ''
}

function idGrupoDoMembro(item: AnyRecord) {
  return texto(item?.grupo_id || item?.grupo_roteiro_id)
}

function idGrupoDaMensagem(item: AnyRecord) {
  return texto(item?.grupo_id || item?.grupo_roteiro_id)
}

function idUsuarioDoMembro(item: AnyRecord) {
  return texto(item?.user_id || item?.usuario_id || item?.cliente_id || item?.guia_id || item?.membro_id)
}

function idUsuarioDaMensagem(item: AnyRecord) {
  return texto(item?.user_id || item?.usuario_id || item?.cliente_id || item?.guia_id || item?.membro_id)
}

function tituloRoteiro(roteiro?: AnyRecord | null) {
  return texto(roteiro?.titulo || roteiro?.nome || roteiro?.name) || 'Roteiro PrussikTrails'
}

function localRoteiro(roteiro?: AnyRecord | null) {
  return texto(roteiro?.local || roteiro?.localizacao || roteiro?.cidade || roteiro?.local_encontro || roteiro?.ponto_encontro) || 'Local a confirmar'
}

function dataRoteiro(roteiro?: AnyRecord | null) {
  return (
    roteiro?.proxima_data ||
    roteiro?.embarque_data_hora ||
    roteiro?.data_inicio ||
    roteiro?.data_roteiro ||
    roteiro?.data_saida ||
    roteiro?.data_trilha ||
    roteiro?.data ||
    null
  )
}

function horaRoteiro(roteiro?: AnyRecord | null) {
  return roteiro?.hora_inicio || roteiro?.hora_roteiro || roteiro?.hora_saida || roteiro?.hora || roteiro?.hora_trilha || null
}

function fotoRoteiro(roteiro?: AnyRecord | null) {
  return texto(roteiro?.foto_capa || roteiro?.foto_url || roteiro?.imagem_url || roteiro?.imagem || roteiro?.image_url || roteiro?.capa_url)
}

function grupoAtivo(grupo: AnyRecord) {
  const status = normalizar(grupo?.status)

  if (grupo?.ativo === true) return true
  if (grupo?.ativo === false) return false

  return !status || status === 'ativo' || status === 'active'
}

function grupoEncerradoOuHistorico(grupo: AnyRecord, roteiro?: AnyRecord | null) {
  const status = normalizar(grupo?.status)

  if (
    grupo?.ativo === false ||
    status === 'encerrado' ||
    status === 'finalizado' ||
    status === 'arquivado' ||
    status === 'pausado' ||
    status === 'inativo'
  ) {
    return true
  }

  const data = dataRoteiro(roteiro)
  if (!data) return false

  const date = new Date(String(data))
  if (Number.isNaN(date.getTime())) return false

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  return date.getTime() < hoje.getTime()
}

function membroEhGuia(membro: AnyRecord) {
  const papel = normalizar(membro?.papel || membro?.tipo || membro?.role)
  return papel === 'guia' || papel === 'guia_admin' || papel === 'admin'
}

function nomeUsuario(usuario?: AnyRecord | null) {
  return texto(usuario?.nome || usuario?.name || usuario?.email) || 'Usuário'
}

function dentroDoMesAtual(valor: unknown) {
  if (!valor) return false

  const data = new Date(String(valor))
  if (Number.isNaN(data.getTime())) return false

  const agora = new Date()
  return data.getFullYear() === agora.getFullYear() && data.getMonth() === agora.getMonth()
}

async function validarAdmin(supabase: any, adminId: string) {
  if (!adminId) {
    return {
      valido: false,
      status: 401,
      erro: 'Admin não identificado.',
    }
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', adminId)
    .maybeSingle()

  if (error) throw error

  if (!data?.id || normalizar(data?.tipo) !== 'admin') {
    return {
      valido: false,
      status: 403,
      erro: 'Acesso restrito ao administrador.',
    }
  }

  return {
    valido: true,
    admin: data,
  }
}

async function buscarInPorColunas(
  supabase: any,
  tabela: string,
  colunas: string[],
  ids: string[],
  options?: { orderBy?: string; ascending?: boolean; limit?: number }
) {
  if (ids.length === 0) return []

  for (const coluna of colunas) {
    let query = supabase.from(tabela).select('*').in(coluna, ids)

    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false })
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (!error) return data || []
    if (erroDeColunaAusente(error)) continue

    throw error
  }

  return []
}

async function atualizarComFallback(
  supabase: any,
  tabela: string,
  id: string,
  payloadOriginal: AnyRecord,
  select = '*'
) {
  let payload = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 18; tentativa++) {
    const { data, error } = await supabase
      .from(tabela)
      .update(payload)
      .eq('id', id)
      .select(select)
      .maybeSingle()

    if (!error) return data

    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)
    if (!coluna || !(coluna in payload)) throw error

    delete payload[coluna]

    if (Object.keys(payload).length === 0) return null
  }

  throw new Error(`Não foi possível atualizar ${tabela}.`)
}

async function carregarDadosGrupos(supabase: any, limite: number) {
  const { data: gruposData, error: gruposError } = await supabase
    .from('grupos_roteiros')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limite)

  if (gruposError) throw gruposError

  const gruposBase: AnyRecord[] = gruposData || []
  const grupoIds = gruposBase.map((grupo) => texto(grupo.id)).filter(Boolean)

  const roteiroIds = Array.from(
    new Set(gruposBase.map((grupo) => texto(grupo.roteiro_id || grupo.id_roteiro)).filter(Boolean))
  )

  const roteiros: AnyRecord[] = roteiroIds.length
    ? ((await supabase.from('roteiros').select('*').in('id', roteiroIds)).data || [])
    : []

  const membros: AnyRecord[] = await buscarInPorColunas(
    supabase,
    'grupo_membros',
    ['grupo_id', 'grupo_roteiro_id'],
    grupoIds,
    { orderBy: 'created_at', ascending: true, limit: 5000 }
  )

  const mensagensLista: AnyRecord[] = await buscarInPorColunas(
    supabase,
    'grupo_mensagens',
    ['grupo_id', 'grupo_roteiro_id'],
    grupoIds,
    { orderBy: 'created_at', ascending: false, limit: 5000 }
  )

  const guiaIdsDiretos = gruposBase.map((grupo) => texto(grupo.guia_id || grupo.id_guia)).filter(Boolean)

  const guiaIdsDosRoteiros = roteiros
    .map((roteiro) => texto(roteiro.id_guia || roteiro.guia_id || roteiro.user_id || roteiro.usuario_id))
    .filter(Boolean)

  const idsUsuariosMembros = membros.map(idUsuarioDoMembro).filter(Boolean)
  const idsUsuariosMensagens = mensagensLista.map(idUsuarioDaMensagem).filter(Boolean)

  const usuariosIds = Array.from(
    new Set([...guiaIdsDiretos, ...guiaIdsDosRoteiros, ...idsUsuariosMembros, ...idsUsuariosMensagens])
  )

  let usuarios: AnyRecord[] = []
  if (usuariosIds.length > 0) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('id', usuariosIds)

    if (!error) usuarios = data || []
  }

  const usuariosMap = new Map<string, AnyRecord>()
  usuarios.forEach((usuario) => {
    if (usuario?.id) usuariosMap.set(String(usuario.id), usuario)
  })

  const grupos: AnyRecord[] = gruposBase.map((grupo): AnyRecord => {
    const roteiro = roteiros.find((item) => String(item.id) === texto(grupo.roteiro_id || grupo.id_roteiro)) || null
    const guiaId = texto(grupo.guia_id || grupo.id_guia || roteiro?.id_guia || roteiro?.guia_id || roteiro?.user_id || roteiro?.usuario_id)
    const guia = guiaId ? usuariosMap.get(guiaId) || null : null
    const membrosDoGrupo = membros.filter((membro) => idGrupoDoMembro(membro) === String(grupo.id))
    const mensagensDoGrupo: AnyRecord[] = mensagensLista
      .filter((mensagem) => idGrupoDaMensagem(mensagem) === String(grupo.id))
      .map((mensagem): AnyRecord => {
        const usuarioId = idUsuarioDaMensagem(mensagem)
        const usuario = usuarioId ? usuariosMap.get(usuarioId) || null : null

        return {
          ...mensagem,
          usuario_nome: usuarioId ? nomeUsuario(usuario) : 'Sistema',
          usuario_email: usuario?.email || '',
        }
      })

    const ultimaMensagem = mensagensDoGrupo[0] || null
    const clientes = membrosDoGrupo.filter((membro) => !membroEhGuia(membro))
    const historico = grupoEncerradoOuHistorico(grupo, roteiro)

    return {
      ...grupo,
      roteiro,
      guia,
      guia_id: guiaId || grupo.guia_id || null,
      guia_nome: nomeUsuario(guia),
      roteiro_titulo: tituloRoteiro(roteiro),
      roteiro_local: localRoteiro(roteiro),
      roteiro_data: dataRoteiro(roteiro),
      roteiro_hora: horaRoteiro(roteiro),
      roteiro_foto: fotoRoteiro(roteiro),
      membros: membrosDoGrupo.map((membro): AnyRecord => {
        const usuarioId = idUsuarioDoMembro(membro)
        const usuario = usuarioId ? usuariosMap.get(usuarioId) || null : null

        return {
          ...membro,
          usuario_id_resolvido: usuarioId,
          usuario_nome: nomeUsuario(usuario),
          usuario_email: usuario?.email || '',
          is_guia: membroEhGuia(membro),
        }
      }),
      mensagens: mensagensDoGrupo.slice(0, 120),
      total_membros: membrosDoGrupo.length,
      total_clientes: clientes.length,
      total_mensagens: mensagensDoGrupo.length,
      ultima_mensagem: ultimaMensagem,
      ultima_mensagem_em: ultimaMensagem ? ultimaMensagem['created_at'] || null : null,
      ativo_calculado: grupoAtivo(grupo),
      historico,
    }
  })

  const ativos = grupos.filter((grupo) => grupo.ativo_calculado && !grupo.historico)
  const pausados = grupos.filter((grupo) => !grupo.ativo_calculado)
  const historico = grupos.filter((grupo) => grupo.historico)
  const gruposVazios = grupos.filter((grupo) => Number(grupo.total_clientes || 0) <= 0)
  const gruposComMembros = grupos.filter((grupo) => Number(grupo.total_clientes || 0) > 0)

  return {
    grupos,
    stats: {
      total: grupos.length,
      ativos: ativos.length,
      pausados: pausados.length,
      historico: historico.length,
      gruposMes: grupos.filter((grupo) => dentroDoMesAtual(grupo['created_at'])).length,
      membrosTotal: membros.length,
      mensagensTotal: mensagensLista.length,
      gruposVazios: gruposVazios.length,
      gruposComMembros: gruposComMembros.length,
    },
    ultimaAtualizacao: new Date().toLocaleTimeString('pt-BR'),
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const adminId = texto(request.nextUrl.searchParams.get('adminId'))
    const limite = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limite') || 800), 1), 1500)

    const admin = await validarAdmin(supabase, adminId)
    if (!admin.valido) {
      return json({ sucesso: false, erro: admin.erro }, admin.status || 401)
    }

    const dados = await carregarDadosGrupos(supabase, limite)

    return json({
      sucesso: true,
      admin: admin.admin || null,
      ...dados,
    })
  } catch (error: any) {
    console.error('Erro em GET /api/admin/grupos:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao listar grupos do Admin.',
      },
      500
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const adminId = texto(body.adminId || body.admin_id || body.usuarioId || body.usuario_id)
    const grupoId = texto(body.grupoId || body.grupo_id || body.id)
    const acao = normalizar(body.acao || body.action)

    const admin = await validarAdmin(supabase, adminId)
    if (!admin.valido) {
      return json({ sucesso: false, erro: admin.erro }, admin.status || 401)
    }

    if (!grupoId) {
      return json({ sucesso: false, erro: 'Informe grupoId.' }, 400)
    }

    let status = texto(body.status)
    let ativo: boolean | null = typeof body.ativo === 'boolean' ? body.ativo : null
    let permiteMensagens: boolean | null = typeof body.permite_mensagens === 'boolean' ? body.permite_mensagens : null

    if (acao === 'encerrar' || acao === 'finalizar') {
      status = 'encerrado'
      ativo = false
      permiteMensagens = false
    }

    if (acao === 'ativar' || acao === 'reabrir') {
      status = 'ativo'
      ativo = true
      permiteMensagens = true
    }

    if (!status && ativo === null && permiteMensagens === null) {
      return json({ sucesso: false, erro: 'Informe uma ação, status ou ativo.' }, 400)
    }

    const payload: AnyRecord = {
      updated_at: new Date().toISOString(),
    }

    if (status) payload.status = status
    if (ativo !== null) payload.ativo = ativo
    if (permiteMensagens !== null) payload.permite_mensagens = permiteMensagens

    const grupo = await atualizarComFallback(supabase, 'grupos_roteiros', grupoId, payload)

    return json({
      sucesso: true,
      mensagem: 'Grupo atualizado.',
      grupo,
    })
  } catch (error: any) {
    console.error('Erro em PATCH /api/admin/grupos:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao atualizar grupo do Admin.',
      },
      500
    )
  }
}
