import { NextRequest, NextResponse } from 'next/server'
import { asaas } from '@/lib/asaas'

export async function POST(request: NextRequest) {
  try {
    const { paymentId } = await request.json()

    const payment = await asaas.payments.get(paymentId)

    return NextResponse.json({
      status: payment.status,
      value: payment.value,
      dueDate: payment.dueDate,
      invoiceUrl: payment.invoiceUrl,
    })
  } catch (error) {
    console.error('Erro ao verificar pagamento:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar pagamento' },
      { status: 500 }
    )
  }
}