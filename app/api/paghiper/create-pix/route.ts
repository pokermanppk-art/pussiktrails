import { NextResponse } from 'next/server'
import axios from 'axios'

function normalizarValorEmCentavos(valor: unknown) {
  const numero = Number(valor)

  if (!Number.isFinite(numero) || numero <= 0) {
    throw new Error('Valor da reserva inválido para gerar PIX.')
  }

  return Math.round(numero * 100)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    console.log('BODY RECEBIDO PARA PIX:')
    console.log(body)

    const apiKey = process.env.PAGHIPER_API_KEY
    const token = process.env.PAGHIPER_TOKEN
    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    if (!apiKey || !token) {
      return NextResponse.json(
        {
          error: true,
          message: 'Credenciais PagHiper ausentes no .env.local'
        },
        { status: 500 }
      )
    }

    if (!appUrl) {
      return NextResponse.json(
        {
          error: true,
          message: 'NEXT_PUBLIC_APP_URL ausente no .env.local'
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

    if (!body.email) {
      return NextResponse.json(
        {
          error: true,
          message: 'E-mail do cliente não enviado.'
        },
        { status: 400 }
      )
    }

    if (!body.nome) {
      return NextResponse.json(
        {
          error: true,
          message: 'Nome do cliente não enviado.'
        },
        { status: 400 }
      )
    }

    const priceCents = normalizarValorEmCentavos(body.valor)

    console.log('VALOR EM CENTAVOS ENVIADO AO PAGHIPER:')
    console.log(priceCents)

    const response = await axios.post(
      'https://pix.paghiper.com/invoice/create/',
      {
        apiKey,
        token,

        order_id: `RESERVA-${body.reservaId}`,

        payer_email: body.email,
        payer_name: body.nome,

        // CPF teste. Depois trocamos pelo CPF real do cliente.
        payer_cpf_cnpj: '12345678909',

        days_due_date: 1,

        type_bank_slip: 'PIX',

        items: [
          {
            description: `Reserva PrussikTrails ${body.reservaId}`,
            quantity: 1,
            item_id: String(body.reservaId),
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

    console.log('RESPOSTA PAGHIPER:')
    console.log(JSON.stringify(response.data, null, 2))

    return NextResponse.json(response.data)

  } catch (error: any) {
    console.log('ERRO PAGHIPER:')
    console.log(error.response?.data || error.message || error)

    return NextResponse.json(
      {
        error: true,
        message:
          error.message || 'Erro interno ao gerar PIX PagHiper',
        details:
          error.response?.data || null
      },
      { status: 500 }
    )
  }
}