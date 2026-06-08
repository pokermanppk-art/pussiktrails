import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const COLUNAS_USUARIO_MEMBRO = ['user_id', 'usuario_id', 'membro_id']

function json(data: AnyRecord, status = 200) {
  return NextResponse.json(data, { status })
}

function getSupabaseAdmin() {
  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL ausente no ambiente.')
  if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente no ambiente.')
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
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
  return error?.code === '42703' || error?.code === 'PGRST204' || mensagem.includes('schema cache') || mensagem.includes('could not find') || mensagem.includes('column')
}

function membroUserId(membro: AnyRecord) {
  return texto(membro?.user_id || membro?.usuario_id || membro?.membro_id)
}

function tituloRoteiro(roteiro: AnyRecord | null) {
  return texto(roteiro?.titulo || roteiro?.nome || roteiro?.name) || 'Roteiro'
}

function fotoRoteiro(roteiro: AnyRecord | null) {
  return texto(roteiro?.foto_capa || roteiro?.foto_url || roteiro?.imagem_url || roteiro?.imagem || roteiro?.image_url || roteiro?.capa_url)
}

function localRoteiro(roteiro: AnyRecord | null) {
  return texto(roteiro?.local || roteiro?.localizacao || roteiro?.cidade || roteiro?.local_encontro || roteiro?.ponto_encontro) || 'Local a confirmar'
}

function dataRoteiro(roteiro: AnyRecord | null, reserva?: AnyRecord | null) {
  return reserva?.data_trilha || reserva?.data_reserva || roteiro?.proxima_data || roteiro?.data_inicio || roteiro?.data_roteiro || roteiro?.data_saida || roteiro?.data_trilha || roteiro?.data || null
}

function horaRoteiro(roteiro: AnyRecord | null) {
  return roteiro?.hora_inicio || roteiro?.hora_roteiro || roteiro?.hora_saida || roteiro?.hora || roteiro?.hora_trilha || null
}

function grupoPermiteMensagens(grupo: AnyRecord | null) {
  if (!grupo?.id) return false
  if (normalizar(grupo.status) !== 'ativo') return false
  if (grupo.permite_mensagens === false) return false
  return true
}

function papelCliente(papel: unknown) {
  const valor = normalizar(papel)
  return valor === 'cliente' || valor === 'participante' || valor === 'membro'
}

function papelGuia(papel: unknown) {
  const valor = normalizar(papel)
  return valor === 'guia_admin' || valor === 'guia' || valor === 'admin'
}

async function buscarGrupo(supabase: any, grupoId: string) {
  const { data, error } = await supabase.from('grupos_roteiros').select('*').eq('id', grupoId).maybeSingle()
  if (error) throw error
  return (data || null) as AnyRecord | null
}

async function buscarMembroCliente(supabase: any, grupoId: string, clienteId: string) {
  for (const coluna of COLUNAS_USUARIO_MEMBRO) {
    const { data, error } = await supabase
      .from('grupo_membros')
      .select('*')
      .eq('grupo_id', grupoId)
      .eq(coluna, clienteId)
      .eq('status', 'ativo')
      .maybeSingle()

    if (!error) return (data || null) as AnyRecord | null
    if (erroDeColunaAusente(error)) continue
    throw error
  }

  return null
}

async function carregarUsuarios(supabase: any, ids: string[]) {
  const unicos = Array.from(new Set(ids.map(texto).filter(Boolean)))
  if (unicos.length === 0) return [] as AnyRecord[]

  const { data, error } = await supabase.from('users').select('id, nome, name, email, avatar_url, foto_url, imagem_url').in('id', unicos)
  if (error) return [] as AnyRecord[]
  return (data || []) as AnyRecord[]
}

function nomeUsuario(usuario?: AnyRecord | null) {
  return texto(usuario?.nome || usuario?.name || usuario?.email) || 'Participante'
}

async function montarDetalhe(supabase: any, params: { grupoId: string; clienteId: string }) {
  const grupo = await buscarGrupo(supabase, params.grupoId)

  if (!grupo?.id) {
    return { erro: 'Grupo não encontrado.', status: 404 }
  }

  const membroCliente = await buscarMembroCliente(supabase, grupo.id, params.clienteId)

  if (!membroCliente?.id) {
    return {
      erro: 'Seu acesso a este grupo ainda não está liberado. Ele é ativado após a confirmação do pagamento da reserva.',
      status: 403,
      grupo: {
        id: grupo.id,
        roteiro_id: grupo.roteiro_id,
        status: grupo.status
      }
    }
  }

  if (!grupoPermiteMensagens(grupo)) {
    return {
      erro: 'Este grupo está encerrado no momento. O histórico permanece preservado.',
      status: 403,
      grupo: {
        id: grupo.id,
        roteiro_id: grupo.roteiro_id,
        status: grupo.status
      }
    }
  }

  let roteiro: AnyRecord | null = null
  let reserva: AnyRecord | null = null

  if (grupo.roteiro_id) {
    const { data: roteiroData } = await supabase.from('roteiros').select('*').eq('id', grupo.roteiro_id).maybeSingle()
    roteiro = (roteiroData || null) as AnyRecord | null
  }

  if (membroCliente.reserva_id) {
    const { data: reservaData } = await supabase.from('reservas').select('*').eq('id', membroCliente.reserva_id).maybeSingle()
    reserva = (reservaData || null) as AnyRecord | null
  }

  const { data: membrosData } = await supabase
    .from('grupo_membros')
    .select('*')
    .eq('grupo_id', grupo.id)
    .eq('status', 'ativo')
    .order('entrou_em', { ascending: true })

  const membrosBase = (membrosData || []) as AnyRecord[]
  const usuarios = await carregarUsuarios(supabase, membrosBase.map(membroUserId))

  const membros = membrosBase.map((membro): AnyRecord => {
    const usuario = usuarios.find((item) => item.id === membroUserId(membro))
    return {
      ...membro,
      user_id: membroUserId(membro),
      usuario_nome: nomeUsuario(usuario),
      usuario_email: usuario?.email || '',
      papel_visual: papelGuia(membro.papel) ? 'Guia administrador' : 'Cliente confirmado'
    }
  })

  const { data: mensagensData } = await supabase
    .from('grupo_mensagens')
    .select('*')
    .eq('grupo_id', grupo.id)
    .eq('status', 'ativa')
    .order('created_at', { ascending: true })
    .limit(250)

  const mensagensBase = (mensagensData || []) as AnyRecord[]
  const usuariosMensagens = await carregarUsuarios(supabase, mensagensBase.map((mensagem) => texto(mensagem.user_id)))

  const mensagens = mensagensBase.map((mensagem): AnyRecord => {
    const usuario = usuariosMensagens.find((item) => item.id === texto(mensagem.user_id))
    return {
      ...mensagem,
      usuario_nome: mensagem.user_id ? nomeUsuario(usuario) : 'Sistema'
    }
  })

  try {
    await supabase
      .from('grupo_notificacoes')
      .update({ lida: true, lida_em: agoraIso(), updated_at: agoraIso() })
      .eq('grupo_id', grupo.id)
      .eq('user_id_destino', params.clienteId)
      .eq('lida', false)
  } catch {
    // A tabela de notificações pode não ter todas as colunas em alguns ambientes.
  }

  return {
    sucesso: true,
    grupo,
    roteiro: roteiro
      ? {
          ...roteiro,
          titulo_visual: tituloRoteiro(roteiro),
          foto_visual: fotoRoteiro(roteiro),
          local_visual: localRoteiro(roteiro),
          data_visual: dataRoteiro(roteiro, reserva),
          hora_visual: horaRoteiro(roteiro)
        }
      : null,
    reserva,
    membro: membroCliente,
    membros,
    mensagens,
    stats: {
      membros: membros.length,
      mensagens: mensagens.length,
      clientes: membros.filter((membro) => papelCliente(membro.papel)).length
    },
    ultimaAtualizacao: new Date().toLocaleTimeString('pt-BR')
  }
}

async function enviarMensagem(supabase: any, params: { grupoId: string; clienteId: string; mensagem: string }) {
  const detalhe = await montarDetalhe(supabase, { grupoId: params.grupoId, clienteId: params.clienteId })

  if (!detalhe?.sucesso) {
    return detalhe
  }

  const textoMensagem = texto(params.mensagem)
  if (!textoMensagem) {
    return { erro: 'Escreva uma mensagem antes de enviar.', status: 400 }
  }

  if (textoMensagem.length > 1000) {
    return { erro: 'Mensagem muito longa. Use até 1000 caracteres.', status: 400 }
  }

  const { error } = await supabase.from('grupo_mensagens').insert({
    grupo_id: params.grupoId,
    user_id: params.clienteId,
    mensagem: textoMensagem,
    tipo: 'texto',
    status: 'ativa',
    created_at: agoraIso(),
    updated_at: agoraIso()
  })

  if (error) throw error

  return montarDetalhe(supabase, { grupoId: params.grupoId, clienteId: params.clienteId })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))
    const action = normalizar(body.action || body.acao || 'detalhar')
    const grupoId = texto(body.grupoId || body.grupo_id || body.id)
    const clienteId = texto(body.clienteId || body.cliente_id || body.userId || body.user_id || body.usuarioId || body.usuario_id)

    if (!grupoId) return json({ sucesso: false, erro: 'Informe grupoId.' }, 400)
    if (!clienteId) return json({ sucesso: false, erro: 'Informe clienteId.' }, 400)

    const resultado = action === 'enviar_mensagem'
      ? await enviarMensagem(supabase, { grupoId, clienteId, mensagem: texto(body.mensagem || body.message) })
      : await montarDetalhe(supabase, { grupoId, clienteId })

    if (!resultado?.sucesso) {
      return json({ sucesso: false, ...resultado }, Number(resultado?.status || 400))
    }

    return json(resultado)
  } catch (error: any) {
    console.error('Erro em /api/grupos/detalhe-cliente:', error)
    return json({ sucesso: false, erro: error?.message || 'Erro interno ao carregar grupo do cliente.' }, 500)
  }
}

export async function GET(request: NextRequest) {
  const grupoId = texto(request.nextUrl.searchParams.get('grupoId') || request.nextUrl.searchParams.get('id'))
  const clienteId = texto(request.nextUrl.searchParams.get('clienteId') || request.nextUrl.searchParams.get('userId'))

  if (!grupoId || !clienteId) {
    return json({
      sucesso: true,
      rota: '/api/grupos/detalhe-cliente',
      metodo: 'POST',
      mensagem: 'Envie grupoId e clienteId para carregar o detalhe do grupo do cliente.'
    })
  }

  try {
    const supabase = getSupabaseAdmin()
    const resultado = await montarDetalhe(supabase, { grupoId, clienteId })

    if (!resultado?.sucesso) {
      return json({ sucesso: false, ...resultado }, Number(resultado?.status || 400))
    }

    return json(resultado)
  } catch (error: any) {
    return json({ sucesso: false, erro: error?.message || 'Erro interno ao carregar grupo do cliente.' }, 500)
  }
}
