import { NextResponse } from 'next/server'

const ASAAS_API_URL = 'https://api-sandbox.asaas.com/v3'
const ASAAS_API_KEY = process.env.ASAAS_API_KEY

export async function POST(request: Request) {
  try {
    const { customerId, valor, descricao, reservaId } = await request.json()

    if (!ASAAS_API_KEY) {
      console.error('❌ ASAAS_API_KEY não configurada')
      return NextResponse.json({ error: 'API key não configurada' }, { status: 500 })
    }

    if (!customerId) {
      console.error('❌ customerId não fornecido')
      return NextResponse.json({ error: 'Cliente não identificado' }, { status: 400 })
    }

    console.log('🔵 Criando cobrança PIX para cliente:', customerId)

    // 1. Criar a cobrança
    const paymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'access_token': ASAAS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        value: Number(valor).toFixed(2),
        dueDate: new Date().toISOString().split('T')[0],
        description: descricao || `Reserva ${reservaId}`,
        externalReference: reservaId,
      }),
    })

    const payment = await paymentResponse.json()

    if (!paymentResponse.ok) {
      console.error('❌ Erro ao criar cobrança:', payment)
      return NextResponse.json({ error: payment.errors?.[0]?.description || 'Erro ao criar cobrança' }, { status: paymentResponse.status })
    }

    console.log('✅ Cobrança criada:', payment.id)

    // 2. Buscar QR Code
    const qrResponse = await fetch(`${ASAAS_API_URL}/payments/${payment.id}/pixQrCode`, {
      headers: { 'access_token': ASAAS_API_KEY },
    })

    const qrData = await qrResponse.json()

    if (!qrResponse.ok) {
      console.error('❌ Erro ao buscar QR Code:', qrData)
      return NextResponse.json({ error: 'Erro ao gerar QR Code' }, { status: qrResponse.status })
    }

    return NextResponse.json({
      success: true,
      qrCode: qrData.encodedImage,
      codigoPix: qrData.payload,
      paymentId: payment.id,
      expiresDate: qrData.expirationDate,
    })

  } catch (error: any) {
    console.error('❌ Erro ao criar PIX Asaas:', error)
    return NextResponse.json({ error: 'Erro interno ao criar PIX' }, { status: 500 })
  }
}