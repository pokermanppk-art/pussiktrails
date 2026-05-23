import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Credenciais Supabase ausentes no servidor. Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

function procurarCampoRecursivo(obj: any, nomes: string[]): string {
  if (!obj) return ''

  if (typeof obj !== 'object') return ''

  for (const nome of nomes) {
    const valor = obj[nome]

    if (typeof valor === 'string' && valor.trim()) {
      return valor
    }

    if (typeof valor === 'number') {
      return String(valor)
    }
  }

  for (const key of Object.keys(obj)) {
    const encontrado = procurarCampoRecursivo(obj[key], nomes)

    if (encontrado) return encontrado
  }

  return ''
}

function normalizarStatusPagHiper(status: string) {
  const texto = String(status || '').toLowerCase().trim()

  if (
    texto.includes('paid') ||
    texto.includes('pago') ||
    texto.includes('aprovado') ||
    texto.includes('approved') ||
    texto.includes('completed') ||
    texto.includes('completo') ||
    texto === 'success'
  ) {
    return 'pago'
  }

  if (
    texto.includes('cancel') ||
    texto.includes('expired') ||
    texto.includes('expirado') ||
    texto.includes('vencido')
  ) {
    return 'cancelado'
  }

  return 'pendente'
}

function extrairReservaIdDoOrderId(orderId: string) {
  if (!orderId) return ''

  if (orderId.startsWith('RESERVA-')) {
    return orderId.replace('RESERVA-', '')
  }

  return orderId
}

async function lerPayload(req: Request) {
  const contentType = req.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return await req.json()
  }

  const text = await req.text()

  try {
    return JSON.parse(text)
  } catch {
    const params = new URLSearchParams(text)
    const obj: Record<string, string> = {}

    params.forEach((value, key) => {
      obj[key] = value
    })

    return obj
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Webhook PagHiper ativo.'
  })
}

export async function POST(req: Request) {
  try {
    const payload = await lerPayload(req)

    console.log('WEBHOOK PAGHIPER RECEBIDO:')
    console.log(JSON.stringify(payload, null, 2))

    const orderId = procurarCampoRecursivo(payload, [
      'order_id',
      'orderId',
      'order',
      'id_pedido',
      'pedido'
    ])

    const transactionId = procurarCampoRecursivo(payload, [
      'transaction_id',
      'transactionId',
      'idTransacao',
      'id_transaction',
      'hash'
    ])

    const statusRecebido = procurarCampoRecursivo(payload, [
      'status',
      'status_request',
      'status_pagamento',
      'payment_status'
    ])

    const reservaId = extrairReservaIdDoOrderId(orderId)
    const pagamentoStatus = normalizarStatusPagHiper(statusRecebido)

    if (!orderId && !transactionId && !reservaId) {
      return NextResponse.json(
        {
          error: true,
          message: 'Webhook recebido sem order_id ou transaction_id.',
          payload
        },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('reservas')
      .select('*')
      .limit(1)

    if (reservaId) {
      query = query.eq('id', reservaId)
    } else if (orderId) {
      query = query.eq('paghiper_order_id', orderId)
    } else {
      query = query.eq('paghiper_transaction_id', transactionId)
    }

    const { data: reservas, error: reservaError } = await query

    if (reservaError) {
      throw reservaError
    }

    const reserva = reservas?.[0]

    if (!reserva) {
      return NextResponse.json(
        {
          error: true,
          message: 'Reserva não encontrada para o webhook PagHiper.',
          orderId,
          transactionId,
          reservaId,
          payload
        },
        { status: 404 }
      )
    }

    const updatePayload: Record<string, any> = {
      paghiper_order_id: orderId || reserva.paghiper_order_id || null,
      paghiper_transaction_id:
        transactionId || reserva.paghiper_transaction_id || null,
      paghiper_status: statusRecebido || pagamentoStatus,
      paghiper_response: payload,
      pagamento_status: pagamentoStatus
    }

    if (pagamentoStatus === 'pago') {
      updatePayload.pagamento_confirmado_em = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('reservas')
      .update(updatePayload)
      .eq('id', reserva.id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processado com sucesso.',
      reserva_id: reserva.id,
      order_id: orderId,
      transaction_id: transactionId,
      status_recebido: statusRecebido,
      pagamento_status: pagamentoStatus
    })

  } catch (error: any) {
    console.error('ERRO WEBHOOK PAGHIPER:')
    console.error(error.message || error)

    return NextResponse.json(
      {
        error: true,
        message:
          error.message || 'Erro interno no webhook PagHiper.'
      },
      { status: 500 }
    )
  }
}