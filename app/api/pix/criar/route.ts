import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { reservaId, valor, email, nome, descricao } = await request.json()

    const response = await fetch('https://187.45.245.52/transaction/create/', {
  headers: {
    'Host': 'api.paghiper.com.br'
  },
      body: JSON.stringify({
        apiKey: process.env.PAGHIPER_API_KEY,
        token: process.env.PAGHIPER_TOKEN,
        order_id: reservaId,
        payer_email: email,
        payer_name: nome,
        amount: valor.toFixed(2),
        days_due_date: 1,
        type: 'pix',
        description: descricao || 'Reserva PussikTrails',
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/pix/webhook`
      })
    })

    const data = await response.json()

    if (data.status !== 'success') {
      console.error('Erro PagHiper:', data)
      return NextResponse.json({ error: data.message || 'Erro ao criar cobrança' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      qrCode: data.pix_qr_code,
      codigoPix: data.pix_code,
      transactionId: data.transaction_id
    })

  } catch (error) {
    console.error('Erro ao criar PIX:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}