import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type AnyRecord = Record<string, any>

function getSupabaseAdmin() {
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

function arredondar(valor: number) {
  return Number(valor.toFixed(2))
}

function primeiroId(...valores: unknown[]) {
  for (const valor of valores) {
    const id = texto(valor)
    if (id) return id
  }

  return ''
}

async function atualizarReservaComFallback(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  reservaId: string,
  payloadOriginal: AnyRecord
) {
  let payload = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 12; tentativa++) {
    if (Object.keys(payload).length === 0) {
      throw new Error('Nenhuma coluna disponível para atualizar a reserva.')
    }

    const { data, error } = await supabase
      .from('reservas')
      .update(payload)
      .eq('id', reservaId)
      .select('*')
      .maybeSingle()

    if (!error) return data

    const mensagem = String(
      error?.message ||
        error?.details ||
        error?.hint ||
        ''
    )

    const erroColuna =
      error?.code === '42703' ||
      error?.code === 'PGRST204' ||
      mensagem.toLowerCase().includes('column') ||
      mensagem.toLowerCase().includes('schema cache') ||
      mensagem.toLowerCase().includes('could not find')

    if (!erroColuna) throw error

    const matchAspas = mensagem.match(/'([^']+)'/)
    const coluna = matchAspas?.[1]

    if (!coluna || !(coluna in payload)) throw error

    delete payload[coluna]
  }

  throw new Error('Não foi possível atualizar a reserva após ajustar colunas.')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()

    const reservaId = texto(body.reservaId || body.reserva_id)
    const clienteIdBody = texto(body.clienteId || body.cliente_id)
    const valorSolicitado = numero(body.valorSolicitado || body.valor_solicitado)

    if (!reservaId) {
      return NextResponse.json(
        { sucesso: false, erro: 'reservaId é obrigatório.' },
        { status: 400 }
      )
    }

    const { data: reserva, error: reservaError } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', reservaId)
      .maybeSingle()

    if (reservaError) throw reservaError

    if (!reserva) {
      return NextResponse.json(
        { sucesso: false, erro: 'Reserva não encontrada.' },
        { status: 404 }
      )
    }

    const clienteId = primeiroId(
      reserva.cliente_id,
      reserva.usuario_id,
      reserva.user_id,
      clienteIdBody
    )

    if (!clienteId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Não foi possível identificar o cliente da reserva.',
        },
        { status: 400 }
      )
    }

    if (clienteIdBody && clienteIdBody !== clienteId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Esta reserva não pertence ao cliente informado.',
        },
        { status: 403 }
      )
    }

    const roteiroId = primeiroId(
      reserva.roteiro_id,
      reserva.id_roteiro,
      body.roteiroId,
      body.roteiro_id
    )

    let roteiro: AnyRecord | null = null

    if (roteiroId) {
      const { data } = await supabase
        .from('roteiros')
        .select('*')
        .eq('id', roteiroId)
        .maybeSingle()

      roteiro = data || null
    }

    const guiaId = primeiroId(
      reserva.guia_id,
      reserva.id_guia,
      roteiro?.guia_id,
      roteiro?.id_guia,
      roteiro?.user_id,
      roteiro?.usuario_id
    )

    const quantidadePessoas = Math.max(
      1,
      numero(reserva.quantidade_pessoas) || numero(reserva.pessoas) || 1
    )

    const valorTotal = arredondar(
      numero(reserva.valor_total) ||
        numero(reserva.valor_pago) ||
        numero(reserva.valor) ||
        numero(reserva.total) ||
        numero(roteiro?.preco) * quantidadePessoas
    )

    if (valorTotal <= 0) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Não foi possível calcular o valor da reserva.',
        },
        { status: 400 }
      )
    }

    const saldoJaUsado = numero(reserva.saldo_utilizado)

    if (saldoJaUsado > 0) {
      const valorAPagarAtual = Math.max(0, arredondar(valorTotal - saldoJaUsado))

      return NextResponse.json({
        sucesso: true,
        jaAplicado: true,
        mensagem: 'Saldo já aplicado nesta reserva.',
        reserva,
        valorTotal,
        saldoAplicado: saldoJaUsado,
        valorAPagar: valorAPagarAtual,
        pagoIntegralComSaldo: valorAPagarAtual <= 0,
      })
    }

    await supabase.rpc('recalcular_saldo_cliente', {
      p_cliente_id: clienteId,
    })

    const { data: saldo, error: saldoError } = await supabase
      .from('cliente_saldos')
      .select('*')
      .eq('cliente_id', clienteId)
      .maybeSingle()

    if (saldoError) throw saldoError

    const saldoDisponivel = arredondar(numero(saldo?.saldo_disponivel))

    if (saldoDisponivel <= 0) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Cliente não possui saldo disponível.',
          saldoDisponivel: 0,
        },
        { status: 400 }
      )
    }

    const valorBase = valorSolicitado > 0 ? valorSolicitado : saldoDisponivel

    const saldoAplicado = arredondar(
      Math.min(valorBase, saldoDisponivel, valorTotal)
    )

    if (saldoAplicado <= 0) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Valor de saldo inválido para aplicação.',
        },
        { status: 400 }
      )
    }

    const { error: movError } = await supabase
      .from('cliente_saldo_movimentacoes')
      .insert({
        cliente_id: clienteId,
        reserva_id: reservaId,
        roteiro_id: roteiroId || null,
        guia_id: guiaId || null,
        tipo: 'uso_saldo_reserva',
        origem: 'checkout',
        valor: -Math.abs(saldoAplicado),
        moeda: 'BRL',
        status: 'efetivado',
        descricao: 'Uso de Saldo de Jornada em nova reserva.',
        motivo: 'abatimento_checkout',
        usado_em_reserva_id: reservaId,
        updated_at: new Date().toISOString(),
      })

    if (movError) throw movError

    await supabase.rpc('recalcular_saldo_cliente', {
      p_cliente_id: clienteId,
    })

    const valorAPagar = Math.max(0, arredondar(valorTotal - saldoAplicado))
    const pagoIntegralComSaldo = valorAPagar <= 0

    const payloadReserva: AnyRecord = {
      saldo_utilizado: saldoAplicado,
      valor_total: valorTotal,
      updated_at: new Date().toISOString(),
    }

    if (pagoIntegralComSaldo) {
      payloadReserva.pagamento_status = 'pago'
      payloadReserva.status = 'confirmada'
      payloadReserva.pago_em = new Date().toISOString()
      payloadReserva.forma_pagamento = 'saldo'
    }

    const reservaAtualizada = await atualizarReservaComFallback(
      supabase,
      reservaId,
      payloadReserva
    )

    const { data: saldoAtualizado } = await supabase
      .from('cliente_saldos')
      .select('*')
      .eq('cliente_id', clienteId)
      .maybeSingle()

    return NextResponse.json({
      sucesso: true,
      reserva: reservaAtualizada,
      saldo: saldoAtualizado,
      valorTotal,
      saldoAplicado,
      valorAPagar,
      pagoIntegralComSaldo,
      mensagem: pagoIntegralComSaldo
        ? 'Reserva paga integralmente com Saldo de Jornada.'
        : 'Saldo aplicado. O valor restante pode ser pago via PIX.',
    })
  } catch (error) {
    console.error('Erro em POST /api/reservas/aplicar-saldo:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao aplicar saldo na reserva.',
      },
      { status: 500 }
    )
  }
}