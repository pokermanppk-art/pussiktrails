import { NextResponse } from 'next/server'
import axios from 'axios'

export const dynamic = 'force-dynamic'

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
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://prussiktrails.vercel.app'

    if (!apiKey || !token) {
      console.error('Credenciais PagHiper ausentes:', {
        hasApiKey: Boolean(apiKey),
        hasToken: Boolean(token)
      })

      return NextResponse.json(
        {
          error: true,
          message:
            'Credenciais PagHiper ausentes no ambiente de produção. Configure PAGHIPER_API_KEY e PAGHIPER_TOKEN na Vercel.'
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

    if (!body.valor) {
      return NextResponse.json(
        {
          error: true,
          message: 'Valor da reserva não enviado.'
        },
        { status: 400 }
      )
    }

    const nomeCliente =
      body.nome ||
      'Cliente PrussikTrails'

    const emailCliente =
      body.email ||
      'cliente@prussiktrails.com.br'

    const priceCents = normalizarValorEmCentavos(body.valor)

    console.log('VALOR EM CENTAVOS ENVIADO AO PAGHIPER:')
    console.log(priceCents)

    const response = await axios.post(
      'https://pix.paghiper.com/invoice/create/',
      {
        apiKey,
        token,

        order_id: `RESERVA-${body.reservaId}`,

        payer_email: emailCliente,
        payer_name: nomeCliente,

        // CPF teste. Depois podemos trocar pelo CPF real do cliente.
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
    console.error('ERRO PAGHIPER:')
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