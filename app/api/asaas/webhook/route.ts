import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    
    console.log('📦 Webhook Asaas recebido:', payload)

    const event = payload.event
    const payment = payload.payment

    // Verificar se é um evento de pagamento
    if (!payment || !payment.id) {
      return NextResponse.json({ success: true })
    }

    const reservaId = payment.externalReference
    const paymentStatus = payment.status

    // Atualizar status da reserva conforme evento
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      // Pagamento confirmado
      await supabase
        .from('reservas')
        .update({
          pagamento_status: 'pago',
          asaas_payment_id: payment.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservaId)

      console.log(`✅ Pagamento confirmado para reserva ${reservaId}`)
    } else if (event === 'PAYMENT_OVERDUE') {
      // Pagamento vencido
      await supabase
        .from('reservas')
        .update({
          pagamento_status: 'overdue',
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservaId)
      
      console.log(`⚠️ Pagamento vencido para reserva ${reservaId}`)
    } else if (event === 'PAYMENT_REFUNDED') {
      // Pagamento estornado
      await supabase
        .from('reservas')
        .update({
          pagamento_status: 'refunded',
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservaId)
      
      console.log(`🔄 Pagamento estornado para reserva ${reservaId}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro no webhook Asaas:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}