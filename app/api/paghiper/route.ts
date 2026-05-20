import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { amount, email, description, reservationId } = await request.json()

    console.log('=== PAGHIPER API ===')
    console.log('Amount:', amount)
    console.log('Email:', email)
    console.log('Description:', description)
    console.log('ReservationId:', reservationId)

    const apiKey = process.env.PAGHIPER_API_KEY

    if (!apiKey) {
      console.error('API Key não configurada no .env.local')
      return NextResponse.json({ error: 'API Key não configurada' }, { status: 500 })
    }

    console.log('API Key configurada:', apiKey.substring(0, 10) + '...')

    // Criar transação no PagHiper
    const requestBody = {
      apiKey: apiKey,
      payer_email: email,
      order_id: `pussik_${reservationId}_${Date.now()}`,
      items: [
        {
          description: description,
          quantity: 1,
          price_cents: Math.round(amount * 100)
        }
      ],
      pix_days_due: 3,
      notification_url: '' // Será configurado depois
    }

    console.log('Enviando para PagHiper:', JSON.stringify(requestBody, null, 2))

    const response = await fetch('https://api.paghiper.com/transaction/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    const data = await response.json()
    console.log('Resposta PagHiper:', JSON.stringify(data, null, 2))

    if (data.status === 'success' && data.pix_qr_code) {
      return NextResponse.json({
        success: true,
        qr_code_text: data.pix_qr_code,
        qr_code_base64: data.pix_qr_code_base64,
        transaction_id: data.transaction_id
      })
    } else {
      console.error('Erro PagHiper:', data.error_message || data)
      return NextResponse.json(
        { error: data.error_message || 'Erro ao gerar PIX' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Erro na API:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno no servidor' },
      { status: 500 }
    )
  }
}