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

function papelCliente(papel?: string | null) {
  const valor = normalizar(papel)
  return valor === 'cliente' || valor === 'participante' || valor === 'membro'
}

function pagamentoConfirmado(reserva: AnyRecord) {
  const pagamento = normalizar(
    reserva?.pagamento_status ||
      reserva?.status_pagamento ||
      reserva?.paghiper_status ||
      reserva?.payment_status ||
      reserva?.status_payment ||
      reserva?.status_transacao ||
      reserva?.transaction_status
  )

  const status = normalizar(reserva?.status)

  return (
    pagamento === 'pago' ||
    pagamento === 'confirmado' ||
    pagamento === 'aprovado' ||
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

async function buscarTabelaPorIds(
  supabase: any,
  tabela: string,
  ids: string[],
  coluna = 'id',
  extra?: (query: any) => any
) {
  const idsLimpos = Array.from(new Set(ids.map(texto).filter(Boolean)))

  if (idsLimpos.length === 0) return []

  let query = supabase.from(tabela).select('*').in(coluna, idsLimpos)

  if (extra) query = extra(query)

  const { data, error } = await query

  if (error) {
    console.warn(`Aviso ao buscar ${tabela}:`, error)
    return []
  }

  return (data || []) as AnyRecord[]
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

  const gruposBase = (gruposData || []) as AnyRecord[]

  if (gruposBase.length === 0) {
    return {
      grupos: [],
      stats: statsInicial,
    }
  }

  const grupoIds = gruposBase.map((grupo) => texto(grupo.id)).filter(Boolean)
  const roteiroIds = gruposBase.map((grupo) => texto(grupo.roteiro_id)).filter(Boolean)

  const [roteiros, membros, mensagens, notificacoes, reservas] = await Promise.all([
    buscarTabelaPorIds(supabase, 'roteiros', roteiroIds),
    buscarTabelaPorIds(supabase, 'grupo_membros', grupoIds, 'grupo_id', (query) =>
      query.eq('status', 'ativo')
    ),
    buscarTabelaPorIds(supabase, 'grupo_mensagens', grupoIds, 'grupo_id', (query) =>
      query.eq('status', 'ativa').order('created_at', { ascending: false }).limit(500)
    ),
    buscarTabelaPorIds(supabase, 'grupo_notificacoes', grupoIds, 'grupo_id', (query) =>
      query.eq('user_id_destino', guiaId).eq('lida', false)
    ),
    buscarTabelaPorIds(supabase, 'reservas', roteiroIds, 'roteiro_id'),
  ])

  const gruposCompletos = gruposBase.map((grupo) => {
    const roteiro = roteiros.find((item) => texto(item.id) === texto(grupo.roteiro_id)) || null

    const membrosGrupo = membros.filter((membro) => texto(membro.grupo_id) === texto(grupo.id))
    const clientesGrupo = membrosGrupo.filter((membro) => papelCliente(membro.papel))
    const mensagensGrupo = mensagens.filter((mensagem) => texto(mensagem.grupo_id) === texto(grupo.id))
    const notificacoesGrupo = notificacoes.filter((notificacao) => texto(notificacao.grupo_id) === texto(grupo.id))

    const reservasGrupo = reservas.filter((reserva) =>
      texto(reserva.roteiro_id || reserva.id_roteiro) === texto(grupo.roteiro_id)
    )

    const reservasConfirmadas = reservasGrupo.filter(pagamentoConfirmado)

    const pessoasConfirmadas = reservasConfirmadas.reduce(
      (total, reserva) => total + Number(reserva.quantidade_pessoas || 0),
      0
    )

    const valorConfirmado = reservasConfirmadas.reduce(
      (total, reserva) => total + Number(reserva.valor_total || 0),
      0
    )

    const ultimaMensagem =
      mensagensGrupo.sort((a, b) => {
        const dataA = new Date(a.created_at || '').getTime()
        const dataB = new Date(b.created_at || '').getTime()

        return (Number.isNaN(dataB) ? 0 : dataB) - (Number.isNaN(dataA) ? 0 : dataA)
      })[0] || null

    return {
      ...grupo,
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

  const totalClientes = gruposCompletos.reduce(
    (total, grupo) => total + Number(grupo.clientes_count || 0),
    0
  )

  const totalReservasConfirmadas = gruposCompletos.reduce(
    (total, grupo) => total + Number(grupo.reservas_confirmadas || 0),
    0
  )

  const totalNotificacoes = gruposCompletos.reduce(
    (total, grupo) => total + Number(grupo.notificacoes_nao_lidas || 0),
    0
  )

  return {
    grupos: gruposCompletos,
    stats: {
      totalGrupos: gruposCompletos.length,
      gruposAtivos: gruposCompletos.filter((grupo) => normalizar(grupo.status) === 'ativo').length,
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
    const guiaId = texto(body.guiaId || body.guia_id || body.id_guia || body.userId || body.user_id)

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
