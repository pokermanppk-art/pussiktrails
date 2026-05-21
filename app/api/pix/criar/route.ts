import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { reservaId, valor, email, nome, descricao } = await request.json()

    console.log('🔵 Criando cobrança PIX na PagHiper para:', { reservaId, valor, email, nome })

    // URL da API PagHiper (usando IP direto para evitar DNS)
    const url = 'https://187.45.245.52/transaction/create/'
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
        description: descricao || `Reserva PussikTrails - ${reservaId.slice(0, 8)}`,
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/pix/webhook`
      })
    })

    const data = await response.json()
    console.log('🟢 Resposta PagHiper:', JSON.stringify(data, null, 2))

    if (data.status !== 'success') {
      console.error('❌ Erro PagHiper:', data)
      return NextResponse.json({ 
        error: data.message || 'Erro ao criar cobrança',
        details: data 
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      qrCode: data.pix_qr_code,
      codigoPix: data.pix_code,
      transactionId: data.transaction_id,
      expiresDate: data.expires_date
    })

  } catch (error: any) {
    console.error('❌ Erro ao criar PIX:', error)
    return NextResponse.json({ 
      error: 'Erro interno ao criar PIX',
      details: error?.message || 'Erro desconhecido'
    }, { status: 500 })
  }
}