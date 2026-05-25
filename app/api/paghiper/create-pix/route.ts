import { NextResponse } from 'next/server'
import axios from 'axios'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Credenciais Supabase ausentes no servidor. Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel.'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

function normalizarValorEmCentavos(valor: unknown) {
  const numero = Number(valor)

  if (!Number.isFinite(numero) || numero <= 0) {
    throw new Error('Valor da reserva inválido para gerar PIX.')
  }

  return Math.round(numero * 100)
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

function extrairDadosPix(data: any) {
  const transactionId = procurarCampoRecursivo(data, [
    'transaction_id',
    'transactionId',
    'idTransacao',
    'id_transacao',
    'id_transaction',
    'hash'
  ])

  const pixCode = procurarCampoRecursivo(data, [
    'pix_code',
    'pix_copia_cola',
    'codigo_pix',
    'qr_code_text',
    'emv',
    'copy_paste',
    'copia_cola',
    'qrcode_text',
    'qrCodeText'
  ])

  const qrCodeBase64 = procurarCampoRecursivo(data, [
    'qr_code_base64',
    'qrcode_base64',
    'pix_qr_code_base64',
    'pix_qrcode_base64',
    'qrcode_image',
    'qrCodeBase64'
  ])

  const status = procurarCampoRecursivo(data, [
    'status',
    'status_request',
    'status_pagamento',
    'payment_status'
  ])

  return {
    transactionId,
    pixCode,
    qrCodeBase64,
    status
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const apiKey = process.env.PAGHIPER_API_KEY
    const token = process.env.PAGHIPER_TOKEN
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://prussiktrails.vercel.app'

    if (!apiKey || !token) {
      return NextResponse.json(
        {
          error: true,
          message:
            'Credenciais PagHiper ausentes no ambiente. Configure PAGHIPER_API_KEY e PAGHIPER_TOKEN na Vercel.'
        },
        { status: 500 }
      )
    }

    if (!body.reservaId) {
      return NextResponse.json(
        {
          error: true,
          message: 'reservaId não enviado.'
        },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: reserva, error: reservaError } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', body.reservaId)
      .maybeSingle()

    if (reservaError) {
      throw reservaError
    }

    if (!reserva) {
      return NextResponse.json(
        {
          error: true,
          message: 'Reserva não encontrada.'
        },
        { status: 404 }
      )
    }

    if (reserva.pagamento_status === 'pago') {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        message: 'Reserva já está paga.',
        reserva
      })
    }

    if (
      reserva.paghiper_order_id &&
      (reserva.paghiper_pix_code || reserva.paghiper_qrcode_base64)
    ) {
      return NextResponse.json({
        success: true,
        reused: true,
        message: 'PIX já existente para esta reserva.',
        order_id: reserva.paghiper_order_id,
        transaction_id: reserva.paghiper_transaction_id,
        pix_code: reserva.paghiper_pix_code,
        qr_code_base64: reserva.paghiper_qrcode_base64,
        status: reserva.paghiper_status,
        reserva
      })
    }

    const valorReserva =
      body.valor ||
      reserva.valor_total ||
      reserva.valor ||
      0

    const priceCents = normalizarValorEmCentavos(valorReserva)

    const nomeCliente =
      body.nome ||
      reserva.nome_cliente ||
      reserva.cliente_nome ||
      'Cliente PrussikTrails'

    const emailCliente =
      body.email ||
      reserva.email_cliente ||
      reserva.cliente_email ||
      reserva.email ||
      'cliente@prussiktrails.com.br'

    const orderId = `RESERVA-${reserva.id}`

    const response = await axios.post(
      'https://pix.paghiper.com/invoice/create/',
      {
        apiKey,
        token,

        order_id: orderId,

        payer_email: emailCliente,
        payer_name: nomeCliente,

        payer_cpf_cnpj:
          body.cpf ||
          reserva.cpf ||
          reserva.payer_cpf_cnpj ||
          '12345678909',

        days_due_date: 1,

        type_bank_slip: 'PIX',

        items: [
          {
            description: `Reserva PrussikTrails ${reserva.id}`,
            quantity: 1,
            item_id: String(reserva.id),
            price_cents: priceCents
          }
        ],

        notification_url:
          `${appUrl}/api/paghiper/webhook`
      },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    )

    const retornoPagHiper = response.data
    const dadosPix = extrairDadosPix(retornoPagHiper)

    const { error: updateError } = await supabase
      .from('reservas')
      .update({
        paghiper_order_id: orderId,
        paghiper_transaction_id: dadosPix.transactionId || null,
        paghiper_pix_code: dadosPix.pixCode || null,
        paghiper_qrcode_base64: dadosPix.qrCodeBase64 || null,
        paghiper_status: dadosPix.status || 'created',
        paghiper_response: retornoPagHiper,
        pagamento_status: 'pendente',
        pagamento_criado_em: new Date().toISOString()
      })
      .eq('id', reserva.id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      order_id: orderId,
      transaction_id: dadosPix.transactionId,
      pix_code: dadosPix.pixCode,
      qr_code_base64: dadosPix.qrCodeBase64,
      status: dadosPix.status,
      paghiper: retornoPagHiper
    })

  } catch (error: any) {
    console.error('ERRO CREATE PIX PAGHIPER:')
    console.error(error.response?.data || error.message || error)

    return NextResponse.json(
      {
        error: true,
        message:
          error.message || 'Erro interno ao gerar PIX PagHiper.',
        details:
          error.response?.data || null
      },
      { status: 500 }
    )
  }
}