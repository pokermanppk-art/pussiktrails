import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

function getSupabaseAdmin(): any {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Variáveis de ambiente do Supabase não configuradas.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function numero(valor: unknown) {
  const n = Number(valor || 0)
  return Number.isFinite(n) ? n : 0
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function erroDeColunaAusente(error: any) {
  const mensagem = String(
    error?.message ||
      error?.details ||
      error?.hint ||
      ''
  ).toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    mensagem.includes('could not find') ||
    mensagem.includes('schema cache') ||
    mensagem.includes('column')
  )
}

function extrairColunaAusente(error: any) {
  const mensagem = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')

  const matchAspas = mensagem.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  const matchColumn = mensagem.match(/column\s+([a-zA-Z0-9_]+)/i)
  if (matchColumn?.[1]) return matchColumn[1]

  return ''
}

async function atualizarComFallback(params: {
  supabase: any
  tabela: string
  id: string
  payloadOriginal: AnyRecord
}) {
  const { supabase, tabela, id } = params
  let payload: AnyRecord = { ...params.payloadOriginal }

  for (let tentativa = 0; tentativa < 18; tentativa++) {
    const { data, error } = await supabase
      .from(tabela)
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (!error) return data as AnyRecord | null

    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payload)) {
      throw error
    }

    delete payload[coluna]
  }

  throw new Error(`Não foi possível atualizar ${tabela} após ajustar colunas.`)
}

async function inserirComFallback(params: {
  supabase: any
  tabela: string
  payloadOriginal: AnyRecord
}) {
  const { supabase, tabela } = params
  let payload: AnyRecord = { ...params.payloadOriginal }

  for (let tentativa = 0; tentativa < 18; tentativa++) {
    const { data, error } = await supabase
      .from(tabela)
      .insert(payload)
      .select('*')
      .maybeSingle()

    if (!error) return data as AnyRecord | null

    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payload)) {
      throw error
    }

    delete payload[coluna]
  }

  throw new Error(`Não foi possível inserir em ${tabela} após ajustar colunas.`)
}

/**
 * REGRA CENTRAL — QUARTA FASE / MECÂNICA FINANCEIRA
 *
 * Reserva pendente cancelada NÃO gera Saldo de Jornada.
 *
 * Não usamos transaction_id como prova de pagamento.
 * A transação pode existir apenas porque o PIX foi criado.
 *
 * Também não usamos reservas.status como prova financeira,
 * porque ele é status operacional da reserva.
 *
 * Para gerar crédito, precisa existir:
 * 1. pagamento_status ou status_pagamento pago/aprovado/confirmado; ou
 * 2. pagamento_confirmado_em preenchido; ou
 * 3. pagamento integral com Saldo de Jornada já utilizado.
 */
function pagamentoFinanceiramenteConfirmado(reserva: AnyRecord) {
  const pagamento = normalizar(
    reserva.pagamento_status ||
      reserva.status_pagamento ||
      reserva.payment_status ||
      reserva.status_pagamento_gateway
  )

  const statusGateway = normalizar(
    reserva.paghiper_status ||
      reserva.gateway_status ||
      reserva.transaction_status ||
      reserva.status_gateway
  )

  const formaPagamento = normalizar(reserva.forma_pagamento)

  const statusPagos = [
    'pago',
    'paga',
    'confirmado',
    'confirmada',
    'aprovado',
    'aprovada',
    'paid',
    'approved',
    'settled',
    'completed',
    'liquidado',
    'liquidada',
  ]

  const statusNaoPagos = [
    'pendente',
    'pending',
    'aguardando',
    'aguardando_pagamento',
    'cancelado',
    'cancelada',
    'cancelled',
    'canceled',
    'expirado',
    'expirada',
    'expired',
    'falhou',
    'failed',
    'erro',
    'recusado',
    'recusada',
    'rejected',
  ]

  const statusFinanceiroOk =
    statusPagos.includes(pagamento) ||
    statusPagos.includes(statusGateway)

  const statusFinanceiroNegativo =
    statusNaoPagos.includes(pagamento) ||
    statusNaoPagos.includes(statusGateway)

  const temConfirmacaoFinanceira = Boolean(
    texto(
      reserva.pagamento_confirmado_em ||
        reserva.pago_em ||
        reserva.data_pagamento ||
        reserva.payment_date ||
        reserva.paid_at
    )
  )

  const pagoIntegralComSaldo =
    formaPagamento.includes('saldo') &&
    numero(reserva.saldo_utilizado) > 0 &&
    numero(reserva.valor_total) > 0 &&
    numero(reserva.saldo_utilizado) >= numero(reserva.valor_total)

  if (statusFinanceiroOk) return true

  if (temConfirmacaoFinanceira && !statusFinanceiroNegativo) return true

  if (pagoIntegralComSaldo) return true

  return false
}

function reservaCancelada(reserva: AnyRecord) {
  const status = normalizar(reserva.status)

  return (
    status === 'cancelada' ||
    status === 'cancelado' ||
    status === 'cancelled' ||
    status === 'canceled'
  )
}

function calcularValorCredito(reserva: AnyRecord, pagamentoConfirmado: boolean) {
  if (!pagamentoConfirmado) return 0

  const valorReserva =
    numero(reserva.valor_total) ||
    numero(reserva.valor_pago) ||
    numero(reserva.valor) ||
    0

  const saldoJaUtilizado = numero(reserva.saldo_utilizado)

  const valorCredito = Math.max(
    0,
    Number((valorReserva - saldoJaUtilizado).toFixed(2))
  )

  return valorCredito
}

async function jaExisteCreditoCancelamento(params: {
  supabase: any
  clienteId: string
  reservaId: string
}) {
  const { supabase, clienteId, reservaId } = params

  const tentativas = [
    async () =>
      supabase
        .from('cliente_saldo_movimentacoes')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('reserva_id', reservaId)
        .in('tipo', [
          'credito_cancelamento',
          'cancelamento_reserva',
          'cancelamento',
        ])
        .neq('status', 'estornado')
        .limit(1),

    async () =>
      supabase
        .from('cliente_saldo_movimentacoes')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('origem_id', reservaId)
        .neq('status', 'estornado')
        .limit(1),
  ]

  for (const executar of tentativas) {
    const { data, error } = await executar()

    if (!error && Array.isArray(data) && data.length > 0) {
      return data[0] as AnyRecord
    }

    if (error && !erroDeColunaAusente(error)) {
      console.warn(
        '[cancelar-reserva] Aviso ao verificar duplicidade de crédito:',
        error
      )
    }
  }

  return null
}

async function upsertSaldoCliente(params: {
  supabase: any
  clienteId: string
  valorCredito: number
}) {
  const { supabase, clienteId, valorCredito } = params

  if (valorCredito <= 0) return null

  const agora = new Date().toISOString()

  const { data: saldoAtual, error: saldoSelectError } = await supabase
    .from('cliente_saldos')
    .select('*')
    .eq('cliente_id', clienteId)
    .maybeSingle()

  if (saldoSelectError && saldoSelectError.code !== 'PGRST116') {
    console.warn(
      '[cancelar-reserva] Erro ao buscar cliente_saldos:',
      saldoSelectError
    )
  }

  if (saldoAtual?.cliente_id) {
    const novoDisponivel = Number(
      (numero(saldoAtual.saldo_disponivel) + valorCredito).toFixed(2)
    )

    let payload: AnyRecord = {
      saldo_disponivel: novoDisponivel,
      updated_at: agora,
    }

    for (let tentativa = 0; tentativa < 10; tentativa++) {
      const { data, error } = await supabase
        .from('cliente_saldos')
        .update(payload)
        .eq('cliente_id', clienteId)
        .select('*')
        .maybeSingle()

      if (!error) return data

      if (!erroDeColunaAusente(error)) throw error

      const coluna = extrairColunaAusente(error)

      if (!coluna || !(coluna in payload)) throw error

      delete payload[coluna]
    }

    return null
  }

  await inserirComFallback({
    supabase,
    tabela: 'cliente_saldos',
    payloadOriginal: {
      cliente_id: clienteId,
      saldo_disponivel: valorCredito,
      saldo_reservado: 0,
      saldo_utilizado: 0,
      saldo_expirado: 0,
      moeda: 'BRL',
      created_at: agora,
      updated_at: agora,
    },
  })

  const { data } = await supabase
    .from('cliente_saldos')
    .select('*')
    .eq('cliente_id', clienteId)
    .maybeSingle()

  return data || null
}

async function recalcularSaldoCliente(params: {
  supabase: any
  clienteId: string
  valorCreditoFallback: number
}) {
  const { supabase, clienteId, valorCreditoFallback } = params

  const { error: rpcError } = await supabase.rpc('recalcular_saldo_cliente', {
    p_cliente_id: clienteId,
  })

  if (!rpcError) {
    const { data } = await supabase
      .from('cliente_saldos')
      .select('*')
      .eq('cliente_id', clienteId)
      .maybeSingle()

    return data || null
  }

  console.warn(
    '[cancelar-reserva] RPC recalcular_saldo_cliente falhou; atualizando saldo manualmente:',
    rpcError
  )

  return upsertSaldoCliente({
    supabase,
    clienteId,
    valorCredito: valorCreditoFallback,
  })
}

export async function GET() {
  return NextResponse.json({
    sucesso: true,
    rota: '/api/reservas/cancelar',
    mensagem: 'Rota ativa. Use POST para cancelar reserva.',
    regra:
      'Reserva pendente sem pagamento financeiro confirmado não gera Saldo de Jornada.',
  })
}

export async function POST(request: NextRequest) {
  let recebido: AnyRecord = {}

  try {
    const supabase = getSupabaseAdmin()
    recebido = await request.json().catch(() => ({}))

    const reservaId = texto(
      recebido.reservaId ||
        recebido.reserva_id ||
        recebido.id
    )

    const canceladoPorTipo = normalizar(
      recebido.canceladoPorTipo ||
        recebido.cancelado_por_tipo ||
        recebido.tipoUsuario ||
        recebido.tipo_usuario ||
        'cliente'
    )

    const canceladoPorId = texto(
      recebido.canceladoPorId ||
        recebido.cancelado_por_id ||
        recebido.usuarioId ||
        recebido.usuario_id ||
        recebido.clienteId ||
        recebido.cliente_id ||
        recebido.adminId ||
        recebido.admin_id
    )

    const motivoCodigo = texto(
      recebido.motivoCodigo ||
        recebido.motivo_codigo ||
        recebido.cancelamento_motivo_codigo ||
        'cancelamento'
    )

    const motivoDescricao = texto(
      recebido.motivoDescricao ||
        recebido.motivo_descricao ||
        recebido.cancelamento_motivo ||
        recebido.motivo ||
        'Cancelamento solicitado.'
    )

    if (!reservaId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'reservaId é obrigatório.',
          recebido,
        },
        { status: 400 }
      )
    }

    if (!canceladoPorId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'canceladoPorId é obrigatório.',
          recebido,
        },
        { status: 400 }
      )
    }

    const { data: reserva, error: reservaError } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', reservaId)
      .maybeSingle()

    if (reservaError) throw reservaError

    if (!reserva?.id) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Reserva não encontrada.',
          recebido,
        },
        { status: 404 }
      )
    }

    const reservaAtual = reserva as AnyRecord
    const clienteId = texto(reservaAtual.cliente_id)

    if (!clienteId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Reserva sem cliente_id vinculado.',
          reserva: reservaAtual,
          recebido,
        },
        { status: 400 }
      )
    }

    if (canceladoPorTipo === 'cliente' && clienteId !== canceladoPorId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Esta reserva não pertence ao cliente informado.',
          recebido,
        },
        { status: 403 }
      )
    }

    const pagamentoConfirmado = pagamentoFinanceiramenteConfirmado(reservaAtual)

    if (reservaCancelada(reservaAtual)) {
      return NextResponse.json({
        sucesso: true,
        reserva: reservaAtual,
        pagamentoConfirmado,
        saldoCreditado: 0,
        movimento: null,
        saldo: null,
        mensagem: 'Reserva já estava cancelada. Nenhum novo saldo foi gerado.',
      })
    }

    const valorCredito = calcularValorCredito(reservaAtual, pagamentoConfirmado)
    const agora = new Date().toISOString()

    /**
     * Primeiro cancela a reserva.
     * Para reserva sem pagamento confirmado, já grava saldo_creditado = 0
     * e saldo_movimentacao_id = null.
     */
    const reservaAtualizada = await atualizarComFallback({
      supabase,
      tabela: 'reservas',
      id: reservaId,
      payloadOriginal: {
        status: 'cancelada',
        cancelado_em: agora,
        cancelado_por_tipo: canceladoPorTipo || 'cliente',
        cancelado_por_id: canceladoPorId,
        cancelamento_motivo_codigo: motivoCodigo,
        cancelamento_motivo: motivoDescricao,
        saldo_creditado: 0,
        saldo_movimentacao_id: null,
        updated_at: agora,
      },
    })

    let movimento: AnyRecord | null = null
    let saldoAtualizado: AnyRecord | null = null
    let saldoCreditado = 0

    if (valorCredito > 0) {
      const existente = await jaExisteCreditoCancelamento({
        supabase,
        clienteId,
        reservaId,
      })

      if (existente?.id) {
        movimento = existente
        saldoCreditado = 0

        await atualizarComFallback({
          supabase,
          tabela: 'reservas',
          id: reservaId,
          payloadOriginal: {
            saldo_creditado: numero(existente.valor),
            saldo_movimentacao_id: existente.id,
            updated_at: agora,
          },
        })
      } else {
        const descricao =
          motivoDescricao ||
          'Crédito gerado pelo cancelamento de reserva financeiramente paga.'

        movimento = await inserirComFallback({
          supabase,
          tabela: 'cliente_saldo_movimentacoes',
          payloadOriginal: {
            cliente_id: clienteId,
            reserva_id: reservaId,
            origem_id: reservaId,
            origem_tipo: 'reserva_cancelada',
            tipo: 'credito_cancelamento',
            valor: valorCredito,
            descricao,
            motivo: descricao,
            status: 'ativo',
            moeda: 'BRL',
            created_at: agora,
            updated_at: agora,
            metadata: {
              regra: 'credito_somente_com_pagamento_financeiro_confirmado',
              reserva_id: reservaId,
              cancelado_por_tipo: canceladoPorTipo,
              cancelado_por_id: canceladoPorId,
              motivo_codigo: motivoCodigo,
              motivo_descricao: motivoDescricao,
              valor_reserva:
                numero(reservaAtual.valor_total) ||
                numero(reservaAtual.valor_pago) ||
                numero(reservaAtual.valor) ||
                0,
              saldo_utilizado: numero(reservaAtual.saldo_utilizado),
              pagamento_status: reservaAtual.pagamento_status || null,
              status_pagamento: reservaAtual.status_pagamento || null,
              pagamento_confirmado_em:
                reservaAtual.pagamento_confirmado_em || null,
              pagamento_criado_em: reservaAtual.pagamento_criado_em || null,
              forma_pagamento: reservaAtual.forma_pagamento || null,
              transaction_id: reservaAtual.transaction_id || null,
              paghiper_order_id: reservaAtual.paghiper_order_id || null,
              paghiper_transaction_id:
                reservaAtual.paghiper_transaction_id || null,
              observacao:
                'transaction_id/paghiper_transaction_id não foram usados como prova isolada de pagamento.',
            },
          },
        })

        saldoCreditado = valorCredito

        if (movimento?.id) {
          await atualizarComFallback({
            supabase,
            tabela: 'reservas',
            id: reservaId,
            payloadOriginal: {
              saldo_creditado: valorCredito,
              saldo_movimentacao_id: movimento.id,
              updated_at: agora,
            },
          })
        }

        saldoAtualizado = await recalcularSaldoCliente({
          supabase,
          clienteId,
          valorCreditoFallback: valorCredito,
        })
      }
    }

    return NextResponse.json({
      sucesso: true,
      reserva: reservaAtualizada || {
        ...reservaAtual,
        status: 'cancelada',
      },
      pagamentoConfirmado,
      saldoCreditado,
      movimento,
      saldo: saldoAtualizado,
      motivoSemCredito:
        valorCredito <= 0
          ? 'Reserva sem pagamento financeiro confirmado ou sem valor elegível para crédito.'
          : null,
      mensagem:
        saldoCreditado > 0
          ? 'Reserva cancelada e Saldo de Jornada creditado.'
          : 'Reserva cancelada sem crédito automático porque não havia pagamento financeiro confirmado.',
    })
  } catch (error: any) {
    console.error('Erro em POST /api/reservas/cancelar:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack,
      recebido,
      raw: error,
    })

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error?.message ||
          'Erro ao cancelar reserva.',
        detalhe: {
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          message: error?.message,
        },
        recebido,
      },
      { status: 500 }
    )
  }
}