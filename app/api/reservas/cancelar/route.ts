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

  for (let tentativa = 0; tentativa < 16; tentativa++) {
    const { data, error } = await supabase
      .from(tabela)
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (!error) return data as AnyRecord | null

    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payload)) throw error

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

  for (let tentativa = 0; tentativa < 16; tentativa++) {
    const { data, error } = await supabase
      .from(tabela)
      .insert(payload)
      .select('*')
      .maybeSingle()

    if (!error) return data as AnyRecord | null

    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payload)) throw error

    delete payload[coluna]
  }

  throw new Error(`Não foi possível inserir em ${tabela} após ajustar colunas.`)
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
    console.warn('[cancelar-reserva] Erro ao buscar cliente_saldos:', saldoSelectError)
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

/**
 * REGRA CRÍTICA:
 * Não usar `reservas.status === confirmada/realizada` para gerar crédito.
 * Só gera Saldo de Jornada se houver confirmação financeira real.
 *
 * Motivo: algumas reservas podem ter status operacional "confirmada" sem pagamento real,
 * ou podem estar pendentes/canceladas por teste. Nesses casos, cancelamento NÃO gera crédito.
 */
function pagamentoFinanceiramenteConfirmado(reserva: AnyRecord) {
  const pagamento = normalizar(reserva.pagamento_status)
  const forma = normalizar(reserva.forma_pagamento)

  const statusFinanceiroOk = [
    'pago',
    'paga',
    'confirmado',
    'confirmada',
    'aprovado',
    'aprovada',
    'paid',
    'approved',
  ].includes(pagamento)

  const temDataPagamento = Boolean(texto(reserva.pago_em || reserva.data_pagamento || reserva.payment_date))
  const temTransacaoPaga =
    Boolean(texto(reserva.transaction_id || reserva.transacao_id)) &&
    statusFinanceiroOk

  const pagoIntegralComSaldo =
    forma.includes('saldo') &&
    numero(reserva.saldo_utilizado) > 0 &&
    numero(reserva.valor_total) > 0 &&
    numero(reserva.saldo_utilizado) >= numero(reserva.valor_total)

  return statusFinanceiroOk || temDataPagamento || temTransacaoPaga || pagoIntegralComSaldo
}

function reservaCancelada(reserva: AnyRecord) {
  const status = normalizar(reserva.status)
  return status === 'cancelada' || status === 'cancelado' || status === 'cancelled'
}

async function jaExisteCreditoCancelamento(params: {
  supabase: any
  clienteId: string
  reservaId: string
}) {
  const { supabase, clienteId, reservaId } = params

  const queries = [
    async () =>
      supabase
        .from('cliente_saldo_movimentacoes')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('reserva_id', reservaId)
        .in('tipo', ['credito_cancelamento', 'cancelamento_reserva', 'cancelamento'])
        .limit(1),
    async () =>
      supabase
        .from('cliente_saldo_movimentacoes')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('origem_id', reservaId)
        .limit(1),
  ]

  for (const executar of queries) {
    const { data, error } = await executar()

    if (!error && Array.isArray(data) && data.length > 0) {
      return data[0] as AnyRecord
    }

    if (error && !erroDeColunaAusente(error)) {
      console.warn('[cancelar-reserva] Não foi possível checar duplicidade de crédito:', error)
    }
  }

  return null
}

export async function GET() {
  return NextResponse.json({
    sucesso: true,
    rota: '/api/reservas/cancelar',
    mensagem: 'Rota ativa. Use POST para cancelar uma reserva.',
    regra:
      'Saldo de Jornada só é creditado quando pagamento_status/pago_em indicam pagamento real.',
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
        recebido.cliente_id
    )

    const motivoCodigo = texto(
      recebido.motivoCodigo ||
        recebido.motivo_codigo ||
        'cancelamento'
    )

    const motivoDescricao = texto(
      recebido.motivoDescricao ||
        recebido.motivo_descricao ||
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

    if (reservaCancelada(reservaAtual)) {
      return NextResponse.json({
        sucesso: true,
        reserva: reservaAtual,
        saldoCreditado: 0,
        mensagem: 'Reserva já estava cancelada.',
      })
    }

    const pagamentoConfirmado = pagamentoFinanceiramenteConfirmado(reservaAtual)

    const valorReserva =
      numero(reservaAtual.valor_total) ||
      numero(reservaAtual.valor_pago) ||
      numero(reservaAtual.valor) ||
      0

    const valorJaUsadoDeSaldo = numero(reservaAtual.saldo_utilizado)

    /**
     * Regra atual de segurança:
     * - Reserva pendente, aguardando pagamento, sem pago_em e sem pagamento_status pago: NÃO gera saldo.
     * - Reserva financeiramente paga: gera crédito líquido, evitando duplicidade.
     */
    const valorCredito = pagamentoConfirmado
      ? Math.max(0, Number((valorReserva - valorJaUsadoDeSaldo).toFixed(2)))
      : 0

    const agora = new Date().toISOString()

    const reservaAtualizada = await atualizarComFallback({
      supabase,
      tabela: 'reservas',
      id: reservaId,
      payloadOriginal: {
        status: 'cancelada',
        cancelado_em: agora,
        cancelada_em: agora,
        data_cancelamento: agora,
        cancelado_por_tipo: canceladoPorTipo || 'cliente',
        cancelado_por_id: canceladoPorId,
        cancelamento_motivo_codigo: motivoCodigo,
        cancelamento_motivo: motivoDescricao,
        motivo_cancelamento: motivoDescricao,
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
      } else {
        const descricao =
          motivoDescricao ||
          'Crédito gerado pelo cancelamento da reserva paga.'

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
              regra: 'credito_somente_pagamento_confirmado',
              reserva_id: reservaId,
              cancelado_por_tipo: canceladoPorTipo,
              cancelado_por_id: canceladoPorId,
              motivo_codigo: motivoCodigo,
              motivo_descricao: motivoDescricao,
              valor_reserva: valorReserva,
              saldo_utilizado: valorJaUsadoDeSaldo,
              pagamento_status: reservaAtual.pagamento_status || null,
              pago_em: reservaAtual.pago_em || null,
              forma_pagamento: reservaAtual.forma_pagamento || null,
            },
          },
        })

        saldoCreditado = valorCredito

        const { error: rpcError } = await supabase.rpc('recalcular_saldo_cliente', {
          p_cliente_id: clienteId,
        })

        if (rpcError) {
          console.warn(
            '[cancelar-reserva] RPC recalcular_saldo_cliente falhou; atualizando saldo manualmente:',
            rpcError
          )

          saldoAtualizado = await upsertSaldoCliente({
            supabase,
            clienteId,
            valorCredito,
          })
        } else {
          const { data } = await supabase
            .from('cliente_saldos')
            .select('*')
            .eq('cliente_id', clienteId)
            .maybeSingle()

          saldoAtualizado = data || null
        }
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
      mensagem:
        saldoCreditado > 0
          ? 'Reserva cancelada e Saldo de Jornada creditado.'
          : 'Reserva cancelada sem crédito automático porque não havia pagamento confirmado.',
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
