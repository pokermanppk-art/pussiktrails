import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const statsInicial = {
  totalGrupos: 0,
  gruposAtivos: 0,
  clientesConfirmados: 0,
  reservasConfirmadas: 0,
  notificacoesNaoLidas: 0,
}

function json(data: AnyRecord, status = 200) {
  return NextResponse.json(data, { status })
}

function getSupabaseAdmin() {
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ausente no ambiente.')
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente no ambiente.')
  }

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

function papelCliente(papel: unknown) {
  const valor = normalizar(papel)
  return valor === 'cliente' || valor === 'participante' || valor === 'membro'
}

function pagamentoConfirmado(reserva: AnyRecord) {
  const pagamento = normalizar(
    reserva?.pagamento_status ||
      reserva?.status_pagamento ||
      reserva?.payment_status ||
      reserva?.pix_status ||
      reserva?.status_pix ||
      reserva?.paghiper_status ||
      reserva?.transaction_status ||
      reserva?.status_transacao ||
      ''
  )

  const status = normalizar(reserva?.status)

  return (
    pagamento === 'pago' ||
    pagamento === 'paga' ||
    pagamento === 'confirmado' ||
    pagamento === 'confirmada' ||
    pagamento === 'aprovado' ||
    pagamento === 'aprovada' ||
    pagamento === 'paid' ||
    pagamento === 'approved' ||
    status === 'confirmada' ||
    status === 'confirmado' ||
    status === 'realizada' ||
    status === 'realizado' ||
    status === 'pago' ||
    status === 'paga'
  )
}

function tituloRoteiro(roteiro: AnyRecord | null) {
  return roteiro?.titulo || roteiro?.nome || 'Roteiro'
}

function roteiroVisivelNoGrupo(roteiro: AnyRecord | null) {
  if (!roteiro?.id) return false

  const status = normalizar(roteiro?.status)

  if (!status) return true

  return ![
    'excluido',
    'excluida',
    'excluído',
    'excluída',
    'cancelado',
    'cancelada',
    'rejeitado',
    'rejeitada',
    'rascunho',
    'inativo',
    'inativa',
  ].includes(status)
}

function ordenarMensagensDesc(a: AnyRecord, b: AnyRecord) {
  const dataA = new Date(a?.created_at || '').getTime()
  const dataB = new Date(b?.created_at || '').getTime()

  return (Number.isNaN(dataB) ? 0 : dataB) - (Number.isNaN(dataA) ? 0 : dataA)
}

async function buscarTabelaPorIds(
  supabase: any,
  tabela: string,
  coluna: string,
  ids: string[],
  orderBy?: string
): Promise<AnyRecord[]> {
  if (ids.length === 0) return []

  let query = supabase.from(tabela).select('*').in(coluna, ids)

  if (orderBy) {
    query = query.order(orderBy, { ascending: false })
  }

  const { data, error } = await query

  if (error) {
    console.warn(`Aviso ao buscar ${tabela}:`, error)
    return []
  }

  return Array.isArray(data) ? (data as AnyRecord[]) : []
}

async function listarGruposDoGuia(supabase: any, guiaId: string) {
  const { data: gruposData, error: gruposError } = await supabase
    .from('grupos_roteiros')
    .select('*')
    .eq('guia_id', guiaId)
    .order('created_at', { ascending: false })

  if (gruposError) {
    throw gruposError
  }

  const gruposBase: AnyRecord[] = Array.isArray(gruposData)
    ? (gruposData as AnyRecord[])
    : []

  if (gruposBase.length === 0) {
    return {
      grupos: [] as AnyRecord[],
      stats: statsInicial,
    }
  }

  const grupoIds = gruposBase
    .map((grupoItem: AnyRecord) => texto(grupoItem?.id))
    .filter(Boolean)

  const roteiroIds = Array.from(
    new Set(
      gruposBase
        .map((grupoItem: AnyRecord) => texto(grupoItem?.roteiro_id))
        .filter(Boolean)
    )
  )

  const [roteiros, membros, mensagens, notificacoes, reservas] = await Promise.all([
    buscarTabelaPorIds(supabase, 'roteiros', 'id', roteiroIds),
    buscarTabelaPorIds(supabase, 'grupo_membros', 'grupo_id', grupoIds),
    buscarTabelaPorIds(supabase, 'grupo_mensagens', 'grupo_id', grupoIds, 'created_at'),
    buscarTabelaPorIds(supabase, 'grupo_notificacoes', 'grupo_id', grupoIds, 'created_at'),
    buscarTabelaPorIds(supabase, 'reservas', 'roteiro_id', roteiroIds, 'created_at'),
  ])

  const membrosAtivos = membros.filter(
    (membro: AnyRecord) => normalizar(membro?.status || 'ativo') === 'ativo'
  )

  const mensagensAtivas = mensagens.filter(
    (mensagem: AnyRecord) => normalizar(mensagem?.status || 'ativa') === 'ativa'
  )

  const notificacoesNaoLidas = notificacoes.filter((notificacao: AnyRecord) => {
    const destino = texto(notificacao?.user_id_destino || notificacao?.usuario_id_destino)
    return destino === guiaId && notificacao?.lida !== true
  })

  const gruposCompletos: AnyRecord[] = gruposBase.map((grupoItem: AnyRecord): AnyRecord => {
    const grupoId = texto(grupoItem?.id)
    const roteiroId = texto(grupoItem?.roteiro_id)

    const roteiro =
      roteiros.find((item: AnyRecord) => texto(item?.id) === roteiroId) || null

    const membrosGrupo = membrosAtivos.filter(
      (membro: AnyRecord) => texto(membro?.grupo_id) === grupoId
    )

    const clientesGrupo = membrosGrupo.filter((membro: AnyRecord) =>
      papelCliente(membro?.papel)
    )

    const mensagensGrupo = mensagensAtivas.filter(
      (mensagem: AnyRecord) => texto(mensagem?.grupo_id) === grupoId
    )

    const notificacoesGrupo = notificacoesNaoLidas.filter(
      (notificacao: AnyRecord) => texto(notificacao?.grupo_id) === grupoId
    )

    const reservasGrupo = reservas.filter(
      (reserva: AnyRecord) => texto(reserva?.roteiro_id) === roteiroId
    )

    const reservasConfirmadas = reservasGrupo.filter((reserva: AnyRecord) =>
      pagamentoConfirmado(reserva)
    )

    const pessoasConfirmadas = reservasConfirmadas.reduce(
      (total: number, reserva: AnyRecord) =>
        total + Number(reserva?.quantidade_pessoas || 0),
      0
    )

    const valorConfirmado = reservasConfirmadas.reduce(
      (total: number, reserva: AnyRecord) => total + Number(reserva?.valor_total || 0),
      0
    )

    const mensagensOrdenadas = [...mensagensGrupo].sort(ordenarMensagensDesc)
    const ultimaMensagem = mensagensOrdenadas[0] || null

    return {
      ...grupoItem,
      id: grupoId,
      roteiro_id: roteiroId,
      guia_id: texto(grupoItem?.guia_id),
      titulo: grupoItem?.titulo || `Grupo - ${tituloRoteiro(roteiro)}`,
      descricao: grupoItem?.descricao || null,
      aviso_fixado: grupoItem?.aviso_fixado || null,
      status: grupoItem?.status || 'ativo',
      created_at: grupoItem?.created_at || null,
      updated_at: grupoItem?.updated_at || null,
      roteiro,
      membros_count: membrosGrupo.length,
      clientes_count: clientesGrupo.length,
      mensagens_count: mensagensGrupo.length,
      notificacoes_nao_lidas: notificacoesGrupo.length,
      reservas_confirmadas: reservasConfirmadas.length,
      pessoas_confirmadas: pessoasConfirmadas,
      valor_confirmado: valorConfirmado,
      ultima_mensagem: ultimaMensagem,
    }
  })

  const gruposValidos = gruposCompletos.filter((grupoItem: AnyRecord) =>
    roteiroVisivelNoGrupo(grupoItem?.roteiro || null)
  )

  const totalClientes = gruposValidos.reduce(
    (total: number, grupoItem: AnyRecord) => total + Number(grupoItem?.clientes_count || 0),
    0
  )

  const totalReservasConfirmadas = gruposValidos.reduce(
    (total: number, grupoItem: AnyRecord) =>
      total + Number(grupoItem?.reservas_confirmadas || 0),
    0
  )

  const totalNotificacoes = gruposValidos.reduce(
    (total: number, grupoItem: AnyRecord) =>
      total + Number(grupoItem?.notificacoes_nao_lidas || 0),
    0
  )

  const gruposAtivos = gruposValidos.reduce((total: number, grupoItem: AnyRecord) => {
    const statusGrupo = normalizar(grupoItem?.status || 'ativo')
    return total + (statusGrupo === 'ativo' ? 1 : 0)
  }, 0)

  return {
    grupos: gruposValidos,
    stats: {
      totalGrupos: gruposValidos.length,
      gruposAtivos,
      clientesConfirmados: totalClientes,
      reservasConfirmadas: totalReservasConfirmadas,
      notificacoesNaoLidas: totalNotificacoes,
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))
    const guiaId = texto(body?.guiaId || body?.guia_id || body?.id_guia || body?.id)

    if (!guiaId) {
      return json(
        {
          sucesso: false,
          erro: 'Informe guiaId para listar os grupos do guia.',
        },
        400
      )
    }

    const resultado = await listarGruposDoGuia(supabase, guiaId)

    return json({
      sucesso: true,
      guiaId,
      ...resultado,
      ultimaAtualizacao: new Date().toLocaleTimeString('pt-BR'),
    })
  } catch (error: any) {
    console.error('Erro em /api/grupos/listar-guia:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao listar grupos do guia.',
        codigo: error?.code || '',
        detalhe: error?.details || error?.hint || '',
      },
      500
    )
  }
}

export async function GET(request: NextRequest) {
  const guiaId = texto(request.nextUrl.searchParams.get('guiaId'))

  if (!guiaId) {
    return json({
      sucesso: true,
      rota: '/api/grupos/listar-guia',
      metodo: 'POST ou GET?guiaId=',
      mensagem: 'Rota ativa. Envie guiaId para listar os grupos do guia usando service role.',
    })
  }

  try {
    const supabase = getSupabaseAdmin()
    const resultado = await listarGruposDoGuia(supabase, guiaId)

    return json({
      sucesso: true,
      guiaId,
      ...resultado,
      ultimaAtualizacao: new Date().toLocaleTimeString('pt-BR'),
    })
  } catch (error: any) {
    console.error('Erro em GET /api/grupos/listar-guia:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao listar grupos do guia.',
        codigo: error?.code || '',
        detalhe: error?.details || error?.hint || '',
      },
      500
    )
  }
}
