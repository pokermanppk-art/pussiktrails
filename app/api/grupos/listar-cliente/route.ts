import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const COLUNAS_USUARIO_MEMBRO = ['user_id', 'usuario_id', 'membro_id']
const PAPEIS_GUIA = ['guia_admin', 'admin', 'guia']
const PAPEIS_CLIENTE = ['cliente', 'participante', 'membro']

function json(data: AnyRecord, status = 200) {
  return NextResponse.json(data, { status })
}

function getSupabaseAdmin() {
  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL ausente no ambiente.')
  if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente no ambiente.')

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
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

function agoraIso() {
  return new Date().toISOString()
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

function erroDePapelInvalido(error: AnyRecord) {
  const mensagem = String(error?.message || error?.details || error?.hint || '').toLowerCase()
  return error?.code === '23514' || mensagem.includes('check constraint')
}

function isPago(reserva: AnyRecord) {
  const pagamento = normalizar(
    reserva?.pagamento_status ||
      reserva?.status_pagamento ||
      reserva?.paghiper_status ||
      reserva?.payment_status ||
      reserva?.status_payment
  )
  const status = normalizar(reserva?.status)

  return (
    pagamento === 'pago' ||
    pagamento === 'paid' ||
    pagamento === 'confirmado' ||
    pagamento === 'confirmada' ||
    pagamento === 'aprovado' ||
    pagamento === 'approved' ||
    status === 'pago' ||
    status === 'paga' ||
    status === 'confirmado' ||
    status === 'confirmada' ||
    status === 'realizada' ||
    status === 'realizado'
  )
}

function isCancelada(reserva: AnyRecord) {
  const status = normalizar(reserva?.status)
  return status === 'cancelada' || status === 'cancelado'
}

function tituloDoRoteiro(roteiro: AnyRecord | null) {
  return texto(roteiro?.titulo || roteiro?.nome || roteiro?.name) || 'Roteiro PrussikTrails'
}

function guiaIdDoRoteiro(roteiro: AnyRecord | null) {
  return texto(
    roteiro?.id_guia ||
      roteiro?.guia_id ||
      roteiro?.user_id ||
      roteiro?.usuario_id ||
      roteiro?.criado_por ||
      roteiro?.created_by ||
      roteiro?.owner_id ||
      ''
  )
}

function roteiroIdDaReserva(reserva: AnyRecord) {
  return texto(reserva?.roteiro_id || reserva?.id_roteiro || reserva?.roteiroId || reserva?.idRoteiro)
}

function clienteIdDaReserva(reserva: AnyRecord) {
  return texto(reserva?.cliente_id || reserva?.usuario_id || reserva?.user_id || reserva?.clienteId)
}

function dataRoteiro(roteiro: AnyRecord | null, reserva?: AnyRecord | null) {
  return (
    reserva?.data_trilha ||
    reserva?.data_reserva ||
    roteiro?.proxima_data ||
    roteiro?.data_inicio ||
    roteiro?.data_roteiro ||
    roteiro?.data_saida ||
    roteiro?.data_trilha ||
    roteiro?.data ||
    null
  )
}

function horaRoteiro(roteiro: AnyRecord | null) {
  return roteiro?.hora_inicio || roteiro?.hora_roteiro || roteiro?.hora_saida || roteiro?.hora || roteiro?.hora_trilha || null
}

function localRoteiro(roteiro: AnyRecord | null) {
  return texto(roteiro?.local || roteiro?.localizacao || roteiro?.cidade || roteiro?.local_encontro || roteiro?.ponto_encontro) || 'Local a confirmar'
}

function fotoRoteiro(roteiro: AnyRecord | null) {
  return texto(
    roteiro?.foto_capa ||
      roteiro?.foto_url ||
      roteiro?.imagem_url ||
      roteiro?.imagem ||
      roteiro?.image_url ||
      roteiro?.capa_url
  )
}

function roteiroAtivoParaCliente(roteiro: AnyRecord | null) {
  if (!roteiro?.id) return false

  const status = normalizar(roteiro?.status)

  return ![
    'excluido',
    'excluida',
    'deletado',
    'deletada',
    'cancelado',
    'cancelada',
    'rascunho',
    'inativo',
    'inativa'
  ].includes(status)
}

function dataJaPassou(dataValor: unknown) {
  if (!dataValor) return false

  const data = new Date(String(dataValor))
  if (Number.isNaN(data.getTime())) return false

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const dataBase = new Date(data)
  dataBase.setHours(0, 0, 0, 0)

  return dataBase.getTime() < hoje.getTime()
}

async function inserirComFallback(supabase: any, tabela: string, payloadOriginal: AnyRecord, select = '*') {
  let payload = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 18; tentativa++) {
    const { data, error } = await supabase
      .from(tabela)
      .insert(payload)
      .select(select)
      .maybeSingle()

    if (!error) return data
    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)
    if (!coluna || !(coluna in payload)) throw error

    delete payload[coluna]

    if (Object.keys(payload).length === 0) {
      throw new Error(`Nenhuma coluna válida restante para inserir em ${tabela}.`)
    }
  }

  throw new Error(`Não foi possível inserir em ${tabela}.`)
}

async function atualizarComFallback(supabase: any, tabela: string, id: string, payloadOriginal: AnyRecord, select = '*') {
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

async function descobrirColunaUsuarioMembro(supabase: any, grupoId: string, userId: string) {
  for (const colunaUsuario of COLUNAS_USUARIO_MEMBRO) {
    const { data, error } = await supabase
      .from('grupo_membros')
      .select('*')
      .eq('grupo_id', grupoId)
      .eq(colunaUsuario, userId)
      .maybeSingle()

    if (!error) {
      return {
        colunaUsuario,
        membro: data || null
      }
    }

    if (erroDeColunaAusente(error)) continue
    throw error
  }

  throw new Error('Não foi possível identificar a coluna de usuário em grupo_membros.')
}

async function inserirOuAtualizarMembro(
  supabase: any,
  params: {
    grupoId: string
    userId: string
    reservaId?: string | null
    papeis: string[]
  }
) {
  const { colunaUsuario, membro } = await descobrirColunaUsuarioMembro(
    supabase,
    params.grupoId,
    params.userId
  )

  let ultimoErro: AnyRecord | null = null

  for (const papel of params.papeis) {
    const agora = agoraIso()
    const payloadBase: AnyRecord = {
      grupo_id: params.grupoId,
      [colunaUsuario]: params.userId,
      reserva_id: params.reservaId || null,
      papel,
      status: 'ativo',
      updated_at: agora
    }

    try {
      if (membro?.id) {
        const membroAtualizado = await atualizarComFallback(
          supabase,
          'grupo_membros',
          membro.id,
          payloadBase
        )

        return {
          membro: membroAtualizado || membro,
          novo: false,
          colunaUsuario,
          papel
        }
      }

      const novoMembro = await inserirComFallback(supabase, 'grupo_membros', {
        ...payloadBase,
        entrou_em: agora,
        created_at: agora
      })

      return {
        membro: novoMembro,
        novo: true,
        colunaUsuario,
        papel
      }
    } catch (error: any) {
      ultimoErro = error

      if (error?.code === '23505') {
        const busca = await descobrirColunaUsuarioMembro(supabase, params.grupoId, params.userId)
        if (busca.membro?.id) {
          return {
            membro: busca.membro,
            novo: false,
            colunaUsuario,
            papel
          }
        }
      }

      if (erroDePapelInvalido(error)) continue
      throw error
    }
  }

  throw ultimoErro || new Error('Não foi possível inserir/atualizar membro do grupo.')
}

async function buscarGrupoPorRoteiro(supabase: any, roteiroId: string) {
  const { data, error } = await supabase
    .from('grupos_roteiros')
    .select('*')
    .eq('roteiro_id', roteiroId)
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) throw error

  return Array.isArray(data) && data.length > 0 ? (data[0] as AnyRecord) : null
}

async function criarGrupo(supabase: any, roteiro: AnyRecord) {
  const roteiroId = texto(roteiro?.id)
  const guiaId = guiaIdDoRoteiro(roteiro)
  const tituloRoteiro = tituloDoRoteiro(roteiro)
  const agora = agoraIso()

  if (!roteiroId || !guiaId) return null

  const payload = {
    roteiro_id: roteiroId,
    guia_id: guiaId,
    titulo: `Grupo - ${tituloRoteiro}`,
    descricao: `Grupo interno do roteiro ${tituloRoteiro}.`,
    aviso_fixado: 'Grupo liberado para participantes com pagamento confirmado. Use este espaço para orientações oficiais da experiência.',
    status: 'ativo',
    permite_mensagens: true,
    created_at: agora,
    updated_at: agora
  }

  try {
    return await inserirComFallback(supabase, 'grupos_roteiros', payload)
  } catch (error: any) {
    if (error?.code === '23505') return buscarGrupoPorRoteiro(supabase, roteiroId)
    throw error
  }
}

async function garantirGrupoReserva(supabase: any, reserva: AnyRecord, roteiro: AnyRecord | null) {
  if (!reserva?.id || !roteiro?.id) return null

  let grupo = await buscarGrupoPorRoteiro(supabase, String(roteiro.id))

  if (!grupo?.id) grupo = await criarGrupo(supabase, roteiro)
  if (!grupo?.id) return null

  const guiaId = guiaIdDoRoteiro(roteiro)
  const clienteId = clienteIdDaReserva(reserva)

  if (guiaId) {
    await inserirOuAtualizarMembro(supabase, {
      grupoId: grupo.id,
      userId: guiaId,
      reservaId: null,
      papeis: PAPEIS_GUIA
    })
  }

  if (clienteId && isPago(reserva) && !isCancelada(reserva)) {
    await inserirOuAtualizarMembro(supabase, {
      grupoId: grupo.id,
      userId: clienteId,
      reservaId: reserva.id,
      papeis: PAPEIS_CLIENTE
    })
  }

  return grupo
}

async function carregarUsuarios(supabase: any, ids: string[]) {
  const unicos = Array.from(new Set(ids.map(texto).filter(Boolean)))
  if (unicos.length === 0) return [] as AnyRecord[]

  const { data, error } = await supabase
    .from('users')
    .select('id, nome, name, email, avatar_url, foto_url, imagem_url')
    .in('id', unicos)

  if (error) return [] as AnyRecord[]
  return (data || []) as AnyRecord[]
}

function nomeUsuario(usuario?: AnyRecord | null) {
  return texto(usuario?.nome || usuario?.name || usuario?.email) || 'Participante'
}

function membroUserId(membro: AnyRecord) {
  return texto(membro?.user_id || membro?.usuario_id || membro?.membro_id)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const clienteId = texto(
      body.clienteId ||
        body.cliente_id ||
        body.userId ||
        body.user_id ||
        body.usuarioId ||
        body.usuario_id
    )

    if (!clienteId) {
      return json({ sucesso: false, erro: 'Informe clienteId para listar os grupos do cliente.' }, 400)
    }

    const { data: reservasData, error: reservasError } = await supabase
      .from('reservas')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })

    if (reservasError) throw reservasError

    const reservasPagas: AnyRecord[] = ((reservasData || []) as AnyRecord[]).filter((reserva) => {
      return isPago(reserva) && !isCancelada(reserva)
    })

    const roteiroIds = Array.from(
      new Set(reservasPagas.map(roteiroIdDaReserva).filter(Boolean))
    )

    let roteiros: AnyRecord[] = []

    if (roteiroIds.length > 0) {
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .in('id', roteiroIds)

      if (!error) roteiros = ((data || []) as AnyRecord[]).filter(roteiroAtivoParaCliente)
    }

    const roteirosPorId = new Map<string, AnyRecord>()
    roteiros.forEach((roteiro) => {
      if (roteiro?.id) roteirosPorId.set(String(roteiro.id), roteiro)
    })

    const gruposGarantidos: AnyRecord[] = []
    const idsGrupos = new Set<string>()

    for (const reserva of reservasPagas) {
      const roteiroId = roteiroIdDaReserva(reserva)
      const roteiro = roteirosPorId.get(roteiroId) || null

      if (!roteiro) continue

      try {
        const grupo = await garantirGrupoReserva(supabase, reserva, roteiro)
        if (grupo?.id && !idsGrupos.has(String(grupo.id))) {
          idsGrupos.add(String(grupo.id))
          gruposGarantidos.push(grupo)
        }
      } catch (error) {
        console.warn('Aviso ao garantir grupo do cliente:', error)
      }
    }

    const grupoIds = Array.from(idsGrupos)

    if (grupoIds.length === 0) {
      return json({
        sucesso: true,
        grupos: [],
        stats: {
          totalGrupos: 0,
          gruposAtivos: 0,
          mensagens: 0,
          notificacoesNaoLidas: 0,
          participantes: 0,
          historico: 0
        },
        ultimaAtualizacao: new Date().toLocaleTimeString('pt-BR')
      })
    }

    const { data: gruposData, error: gruposError } = await supabase
      .from('grupos_roteiros')
      .select('*')
      .in('id', grupoIds)
      .order('created_at', { ascending: false })

    if (gruposError) throw gruposError

    const grupos = (gruposData || []) as AnyRecord[]

    const { data: membrosData } = await supabase
      .from('grupo_membros')
      .select('*')
      .in('grupo_id', grupoIds)
      .eq('status', 'ativo')

    const membros = (membrosData || []) as AnyRecord[]

    const { data: mensagensData } = await supabase
      .from('grupo_mensagens')
      .select('*')
      .in('grupo_id', grupoIds)
      .eq('status', 'ativa')
      .order('created_at', { ascending: false })
      .limit(200)

    const mensagens = (mensagensData || []) as AnyRecord[]

    let notificacoes: AnyRecord[] = []

    try {
      const { data } = await supabase
        .from('grupo_notificacoes')
        .select('*')
        .in('grupo_id', grupoIds)
        .eq('user_id_destino', clienteId)
        .eq('lida', false)

      notificacoes = (data || []) as AnyRecord[]
    } catch {
      notificacoes = []
    }

    const usuarios = await carregarUsuarios(supabase, membros.map(membroUserId))
    const gruposCompletos: AnyRecord[] = []

    for (const grupo of grupos) {
      const roteiro = roteirosPorId.get(String(grupo?.roteiro_id)) || null
      if (!roteiroAtivoParaCliente(roteiro)) continue

      const reserva = reservasPagas.find((item) => roteiroIdDaReserva(item) === texto(grupo?.roteiro_id)) || null
      if (!reserva?.id || !isPago(reserva) || isCancelada(reserva)) continue

      const membrosGrupo = membros.filter((membro) => texto(membro?.grupo_id) === texto(grupo?.id))
      const mensagensGrupo = mensagens.filter((mensagem) => texto(mensagem?.grupo_id) === texto(grupo?.id))
      const notificacoesGrupo = notificacoes.filter((notificacao) => texto(notificacao?.grupo_id) === texto(grupo?.id))
      const ultimaMensagem = mensagensGrupo[0] || null
      const dataBase = dataRoteiro(roteiro, reserva)
      const historico = normalizar(grupo?.status) === 'encerrado' || normalizar(grupo?.status) === 'arquivado' || dataJaPassou(dataBase)

      gruposCompletos.push({
        ...grupo,
        roteiro,
        reserva,
        reserva_id: reserva.id,
        reserva_pago: true,
        reserva_status: reserva.status || null,
        reserva_pagamento_status: reserva.pagamento_status || reserva.status_pagamento || null,
        roteiro_titulo: tituloDoRoteiro(roteiro),
        roteiro_foto: fotoRoteiro(roteiro),
        roteiro_local: localRoteiro(roteiro),
        roteiro_data: dataBase,
        roteiro_hora: horaRoteiro(roteiro),
        historico,
        membros_count: membrosGrupo.length,
        mensagens_count: mensagensGrupo.length,
        notificacoes_nao_lidas: notificacoesGrupo.length,
        ultima_mensagem: ultimaMensagem,
        membros: membrosGrupo.map((membro): AnyRecord => {
          const usuario = usuarios.find((item) => texto(item?.id) === membroUserId(membro))

          return {
            ...membro,
            user_id: membroUserId(membro),
            usuario_nome: nomeUsuario(usuario),
            usuario_email: usuario?.email || ''
          }
        })
      })
    }

    const ativos = gruposCompletos.filter((grupo) => !grupo.historico && normalizar(grupo.status) !== 'encerrado')
    const historico = gruposCompletos.filter((grupo) => Boolean(grupo.historico) || normalizar(grupo.status) === 'encerrado')

    return json({
      sucesso: true,
      grupos: gruposCompletos,
      stats: {
        totalGrupos: gruposCompletos.length,
        gruposAtivos: ativos.length,
        mensagens: mensagens.length,
        notificacoesNaoLidas: notificacoes.length,
        participantes: membros.length,
        historico: historico.length
      },
      ultimaAtualizacao: new Date().toLocaleTimeString('pt-BR')
    })
  } catch (error: any) {
    console.error('Erro em /api/grupos/listar-cliente:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao listar grupos do cliente.'
      },
      500
    )
  }
}

export async function GET() {
  return json({
    sucesso: true,
    rota: '/api/grupos/listar-cliente',
    metodo: 'POST',
    mensagem: 'Envie clienteId para listar apenas grupos liberados por reserva paga confirmada.'
  })
}
