import { NextResponse } from 'next/server'

const ASAAS_API_URL = 'https://api-sandbox.asaas.com/v3'
const ASAAS_API_KEY = process.env.ASAAS_API_KEY

export async function POST(request: Request) {
  try {
    const { customerId, valor, descricao, reservaId } = await request.json()

    if (!ASAAS_API_KEY) return NextResponse.json({ error: 'API key não configurada' }, { status: 500 })
    if (!customerId) return NextResponse.json({ error: 'Cliente não identificado' }, { status: 400 })

    // Criar cobrança
    const paymentRes = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: { 'access_token': ASAAS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        value: Number(valor).toFixed(2),
        dueDate: new Date().toISOString().split('T')[0],
        description: descricao || `Reserva ${reservaId}`,
        externalReference: reservaId,
      }),
    })

    const payment = await paymentRes.json()
    if (!paymentRes.ok) return NextResponse.json({ error: payment.errors?.[0]?.description }, { status: paymentRes.status })

    // Buscar QR Code
    const qrRes = await fetch(`${ASAAS_API_URL}/payments/${payment.id}/pixQrCode`, {
      headers: { 'access_token': ASAAS_API_KEY },
    })
    const qrData = await qrRes.json()
    if (!qrRes.ok) return NextResponse.json({ error: 'Erro ao gerar QR Code' }, { status: qrRes.status })

    return NextResponse.json({
      success: true,
      qrCode: qrData.encodedImage,
      codigoPix: qrData.payload,
      paymentId: payment.id,
      expiresDate: qrData.expirationDate,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}