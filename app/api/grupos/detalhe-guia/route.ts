import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AnyRecord = Record<string, any>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function json(data: any, status = 200) {
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
}

function primeiroValor(registro: AnyRecord | null | undefined, campos: string[]) {
  for (const campo of campos) {
    const valor = texto(registro?.[campo])
    if (valor) return valor
  }
  return ''
}

function usuarioIdDeMembro(membro: AnyRecord) {
  return primeiroValor(membro, ['user_id', 'usuario_id', 'membro_id', 'cliente_id', 'guia_id'])
}

function papelCliente(papel: unknown) {
  const valor = normalizar(papel)
  return valor === 'cliente' || valor === 'participante' || valor === 'membro'
}

function papelGuiaAdmin(papel: unknown) {
  const valor = normalizar(papel)
  return valor === 'guia_admin' || valor === 'guia' || valor === 'admin'
}

function pagamentoConfirmado(reserva: AnyRecord) {
  const pagamento = normalizar(
    reserva.pagamento_status ||
      reserva.status_pagamento ||
      reserva.payment_status ||
      reserva.pix_status ||
      reserva.status_pix ||
      reserva.paghiper_status ||
      reserva.transaction_status ||
      reserva.status_transacao
  )
  const status = normalizar(reserva.status)

  const confirmados = new Set([
    'pago',
    'paga',
    'confirmado',
    'confirmada',
    'aprovado',
    'aprovada',
    'paid',
    'approved',
    'completed',
    'complete',
    'succeeded',
    'success',
    'liquidado',
    'liquidada',
    'realizado',
    'realizada',
  ])

  return confirmados.has(pagamento) || confirmados.has(status)
}

async function buscarGrupo(supabase: any, grupoId: string) {
  const { data, error } = await supabase
    .from('grupos_roteiros')
    .select('*')
    .eq('id', grupoId)
    .maybeSingle()

  if (error) throw error
  return (data || null) as AnyRecord | null
}

async function buscarGrupoPorRoteiro(supabase: any, roteiroId: string) {
  const { data, error } = await supabase
    .from('grupos_roteiros')
    .select('*')
    .eq('roteiro_id', roteiroId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return (data || null) as AnyRecord | null
}

async function validarGuiaAdmin(supabase: any, grupo: AnyRecord, guiaId: string) {
  if (!guiaId) return false

  if (texto(grupo.guia_id) === guiaId) return true

  const { data, error } = await supabase
    .from('grupo_membros')
    .select('*')
    .eq('grupo_id', grupo.id)
    .eq('status', 'ativo')

  if (error) throw error

  const membros = Array.isArray(data) ? (data as AnyRecord[]) : []

  return membros.some((membro) => {
    const id = usuarioIdDeMembro(membro)
    return id === guiaId && papelGuiaAdmin(membro.papel)
  })
}

async function carregarRoteiro(supabase: any, roteiroId: string) {
  if (!roteiroId) return null

  const { data, error } = await supabase
    .from('roteiros')
    .select('*')
    .eq('id', roteiroId)
    .maybeSingle()

  if (error) {
    console.warn('Aviso ao buscar roteiro do grupo:', error)
    return null
  }

  return (data || null) as AnyRecord | null
}

async function carregarUsuariosPorIds(supabase: any, ids: string[]) {
  const idsUnicos = Array.from(new Set(ids.map(texto).filter(Boolean)))
  if (idsUnicos.length === 0) return [] as AnyRecord[]

  const { data, error } = await supabase
    .from('users')
    .select('id, nome, name, email, avatar_url, foto_url, imagem_url')
    .in('id', idsUnicos)

  if (error) {
    console.warn('Aviso ao buscar usuários:', error)
    return [] as AnyRecord[]
  }

  return Array.isArray(data) ? (data as AnyRecord[]) : []
}

async function carregarMembros(supabase: any, grupoId: string) {
  const { data, error } = await supabase
    .from('grupo_membros')
    .select('*')
    .eq('grupo_id', grupoId)
    .eq('status', 'ativo')
    .order('entrou_em', { ascending: true })

  if (error) {
    console.warn('Aviso ao buscar membros:', error)
    return [] as AnyRecord[]
  }

  const membrosBase = Array.isArray(data) ? (data as AnyRecord[]) : []
  const usuarios = await carregarUsuariosPorIds(supabase, membrosBase.map(usuarioIdDeMembro))

  return membrosBase.map((membro): AnyRecord => {
    const usuarioId = usuarioIdDeMembro(membro)
    const usuario = usuarios.find((item) => item.id === usuarioId)

    return {
      ...membro,
      user_id: membro.user_id || membro.usuario_id || membro.membro_id || usuarioId,
      usuario_nome: usuario?.nome || usuario?.name || usuario?.email || 'Participante',
      usuario_email: usuario?.email || '',
      usuario_avatar_url: usuario?.avatar_url || usuario?.foto_url || usuario?.imagem_url || '',
    }
  })
}

async function carregarReservas(supabase: any, roteiroId: string) {
  if (!roteiroId) return [] as AnyRecord[]

  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .eq('roteiro_id', roteiroId)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('Aviso ao buscar reservas:', error)
    return [] as AnyRecord[]
  }

  const reservasBase = Array.isArray(data) ? (data as AnyRecord[]) : []
  const usuarios = await carregarUsuariosPorIds(
    supabase,
    reservasBase.map((reserva) => texto(reserva.cliente_id || reserva.id_cliente || reserva.clienteId))
  )

  return reservasBase.map((reserva): AnyRecord => {
    const clienteId = texto(reserva.cliente_id || reserva.id_cliente || reserva.clienteId)
    const cliente = usuarios.find((item) => item.id === clienteId)

    return {
      ...reserva,
      cliente_id: clienteId,
      cliente_nome: cliente?.nome || cliente?.name || cliente?.email || 'Cliente',
      cliente_email: cliente?.email || '',
      cliente_avatar_url: cliente?.avatar_url || cliente?.foto_url || cliente?.imagem_url || '',
    }
  })
}

async function carregarMensagensAtivas(supabase: any, grupoId: string) {
  const { data, error } = await supabase
    .from('grupo_mensagens')
    .select('*')
    .eq('grupo_id', grupoId)
    .eq('status', 'ativa')
    .order('created_at', { ascending: true })
    .limit(250)

  if (error) {
    console.warn('Aviso ao buscar mensagens:', error)
    return [] as AnyRecord[]
  }

  const mensagensBase = Array.isArray(data) ? (data as AnyRecord[]) : []
  const usuarios = await carregarUsuariosPorIds(
    supabase,
    mensagensBase.map((mensagem) => texto(mensagem.user_id || mensagem.usuario_id))
  )

  return mensagensBase.map((mensagem): AnyRecord => {
    const userId = texto(mensagem.user_id || mensagem.usuario_id)
    const usuario = usuarios.find((item) => item.id === userId)

    return {
      ...mensagem,
      user_id: userId || null,
      usuario_nome: userId ? usuario?.nome || usuario?.name || usuario?.email || 'Participante' : 'Sistema',
    }
  })
}

async function marcarNotificacoesComoLidas(supabase: any, grupoId: string, userId: string) {
  if (!grupoId || !userId) return

  const { error } = await supabase
    .from('grupo_notificacoes')
    .update({
      lida: true,
      lida_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('grupo_id', grupoId)
    .eq('user_id_destino', userId)
    .eq('lida', false)

  if (error) console.warn('Aviso ao marcar notificações como lidas:', error)
}

async function detalheGrupo(supabase: any, grupo: AnyRecord, guiaId: string) {
  const roteiro = await carregarRoteiro(supabase, texto(grupo.roteiro_id))
  const membros = await carregarMembros(supabase, grupo.id)
  const reservas = await carregarReservas(supabase, texto(grupo.roteiro_id))
  const mensagens = await carregarMensagensAtivas(supabase, grupo.id)
  const reservasConfirmadas = reservas.filter(pagamentoConfirmado)
  const clientesConfirmados = membros.filter((membro) => papelCliente(membro.papel))

  const pessoasConfirmadas = reservasConfirmadas.reduce(
    (total, reserva) => total + Number(reserva['quantidade_pessoas'] || 0),
    0
  )

  const valorConfirmado = reservasConfirmadas.reduce(
    (total, reserva) => total + Number(reserva['valor_total'] || 0),
    0
  )

  await marcarNotificacoesComoLidas(supabase, grupo.id, guiaId)

  return {
    grupo,
    roteiro,
    membros,
    mensagens,
    reservas,
    stats: {
      clientesConfirmados: clientesConfirmados.length,
      reservasConfirmadas: reservasConfirmadas.length,
      pessoasConfirmadas,
      valorConfirmado,
    },
    ultimaAtualizacao: new Date().toLocaleTimeString('pt-BR'),
  }
}

async function inserirMensagemSistema(supabase: any, grupoId: string, mensagem: string) {
  const { error } = await supabase.from('grupo_mensagens').insert({
    grupo_id: grupoId,
    user_id: null,
    mensagem,
    tipo: 'sistema',
    status: 'ativa',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  if (error) console.warn('Aviso ao criar mensagem de sistema:', error)
}

async function arquivarMensagensAtivas(supabase: any, grupoId: string) {
  const basePayload = {
    updated_at: new Date().toISOString(),
  }

  const tentativa = await supabase
    .from('grupo_mensagens')
    .update({
      ...basePayload,
      status: 'historico_admin',
    })
    .eq('grupo_id', grupoId)
    .eq('status', 'ativa')

  if (!tentativa.error) return

  console.warn('Falha ao arquivar mensagens como historico_admin; tentando arquivada:', tentativa.error)

  const fallback = await supabase
    .from('grupo_mensagens')
    .update({
      ...basePayload,
      status: 'arquivada',
    })
    .eq('grupo_id', grupoId)
    .eq('status', 'ativa')

  if (fallback.error) throw fallback.error
}

async function desativarClientesAntigos(supabase: any, grupoId: string) {
  const { data, error } = await supabase
    .from('grupo_membros')
    .select('*')
    .eq('grupo_id', grupoId)
    .eq('status', 'ativo')

  if (error) {
    console.warn('Aviso ao buscar membros para desativar:', error)
    return
  }

  const membros = Array.isArray(data) ? (data as AnyRecord[]) : []
  const clientes = membros.filter((membro) => papelCliente(membro.papel)).map((membro) => membro.id).filter(Boolean)

  if (clientes.length === 0) return

  const tentativa = await supabase
    .from('grupo_membros')
    .update({ status: 'historico', updated_at: new Date().toISOString() })
    .in('id', clientes)

  if (!tentativa.error) return

  console.warn('Falha ao mover clientes para historico; tentando inativo:', tentativa.error)

  const fallback = await supabase
    .from('grupo_membros')
    .update({ status: 'inativo', updated_at: new Date().toISOString() })
    .in('id', clientes)

  if (fallback.error) throw fallback.error
}

async function encerrarGrupo(supabase: any, grupo: AnyRecord, motivo: string) {
  const agora = new Date().toISOString()

  const { data, error } = await supabase
    .from('grupos_roteiros')
    .update({
      status: 'encerrado',
      permite_mensagens: false,
      encerrado_em: agora,
      encerrado_motivo: motivo || 'Grupo finalizado pelo guia após o roteiro.',
      updated_at: agora,
    })
    .eq('id', grupo.id)
    .select('*')
    .maybeSingle()

  if (error) throw error

  await inserirMensagemSistema(
    supabase,
    grupo.id,
    'O guia finalizou este grupo. O histórico ficará preservado para consulta administrativa.'
  )

  return (data || grupo) as AnyRecord
}

async function iniciarNovoCiclo(supabase: any, grupo: AnyRecord) {
  const agora = new Date().toISOString()

  await arquivarMensagensAtivas(supabase, grupo.id)
  await desativarClientesAntigos(supabase, grupo.id)

  const { data, error } = await supabase
    .from('grupos_roteiros')
    .update({
      status: 'ativo',
      permite_mensagens: true,
      encerrado_em: null,
      encerrado_motivo: null,
      aviso_fixado: null,
      updated_at: agora,
    })
    .eq('id', grupo.id)
    .select('*')
    .maybeSingle()

  if (error) throw error

  await inserirMensagemSistema(
    supabase,
    grupo.id,
    'Novo ciclo do roteiro iniciado. O chat começa limpo para a próxima data.'
  )

  return (data || grupo) as AnyRecord
}

async function enviarMensagem(supabase: any, grupo: AnyRecord, guiaId: string, mensagem: string) {
  const permiteMensagens = grupo.permite_mensagens !== false && normalizar(grupo.status) === 'ativo'

  if (!permiteMensagens) {
    throw new Error('Este grupo está encerrado. Reabra para uma nova data antes de enviar mensagens.')
  }

  const textoMensagem = texto(mensagem)
  if (!textoMensagem) throw new Error('Digite uma mensagem.')

  const { error } = await supabase.from('grupo_mensagens').insert({
    grupo_id: grupo.id,
    user_id: guiaId,
    mensagem: textoMensagem,
    tipo: 'texto',
    status: 'ativa',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  if (error) throw error
}

async function salvarAviso(supabase: any, grupo: AnyRecord, guiaId: string, aviso: string) {
  const textoAviso = texto(aviso)

  const { data, error } = await supabase
    .from('grupos_roteiros')
    .update({
      aviso_fixado: textoAviso || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', grupo.id)
    .select('*')
    .maybeSingle()

  if (error) throw error

  if (textoAviso && normalizar(data?.status) === 'ativo') {
    const { error: msgError } = await supabase.from('grupo_mensagens').insert({
      grupo_id: grupo.id,
      user_id: guiaId,
      mensagem: `Aviso do guia: ${textoAviso}`,
      tipo: 'aviso_guia',
      status: 'ativa',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (msgError) console.warn('Aviso ao inserir mensagem de aviso fixado:', msgError)
  }

  return (data || grupo) as AnyRecord
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const acao = normalizar(body?.acao || body?.action || 'detalhar')
    const guiaId = texto(body?.guiaId || body?.guia_id || body?.userId || body?.user_id)
    const grupoId = texto(body?.grupoId || body?.grupo_id || body?.id)
    const roteiroId = texto(body?.roteiroId || body?.roteiro_id)

    if (!guiaId) {
      return json({ sucesso: false, erro: 'Informe guiaId.' }, 400)
    }

    let grupo: AnyRecord | null = null

    if (grupoId) grupo = await buscarGrupo(supabase, grupoId)
    if (!grupo && roteiroId) grupo = await buscarGrupoPorRoteiro(supabase, roteiroId)

    if (!grupo?.id) {
      return json({ sucesso: false, erro: 'Grupo não encontrado.' }, 404)
    }

    const autorizado = await validarGuiaAdmin(supabase, grupo, guiaId)

    if (!autorizado) {
      return json(
        {
          sucesso: false,
          erro: 'Você não tem permissão para administrar este grupo.',
          detalhe: 'Apenas o guia vinculado ao roteiro ou membro guia_admin ativo pode administrar.',
        },
        403
      )
    }

    let grupoAtual: AnyRecord = grupo as AnyRecord

    if (acao === 'enviar_mensagem') {
      await enviarMensagem(supabase, grupoAtual, guiaId, body?.mensagem)

      const grupoRecarregado = await buscarGrupo(supabase, texto(grupoAtual.id))
      if (grupoRecarregado?.id) {
        grupoAtual = grupoRecarregado
      }
    }

    if (acao === 'salvar_aviso') {
      grupoAtual = await salvarAviso(
        supabase,
        grupoAtual,
        guiaId,
        body?.aviso || body?.aviso_fixado
      )
    }

    if (acao === 'encerrar_grupo' || acao === 'finalizar_grupo') {
      grupoAtual = await encerrarGrupo(
        supabase,
        grupoAtual,
        texto(body?.motivo || body?.encerrado_motivo)
      )
    }

    if (acao === 'iniciar_novo_ciclo' || acao === 'reabrir_grupo' || acao === 'reiniciar_chat') {
      grupoAtual = await iniciarNovoCiclo(supabase, grupoAtual)
    }

    const detalhe = await detalheGrupo(supabase, grupoAtual, guiaId)

    return json({
      sucesso: true,
      acao,
      ...detalhe,
    })
  } catch (error: any) {
    console.error('Erro em /api/grupos/detalhe-guia:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao carregar/administrar grupo.',
      },
      500
    )
  }
}

export async function GET() {
  return json({
    sucesso: true,
    rota: '/api/grupos/detalhe-guia',
    metodo: 'POST',
    acoes: ['detalhar', 'enviar_mensagem', 'salvar_aviso', 'finalizar_grupo', 'iniciar_novo_ciclo'],
  })
}
