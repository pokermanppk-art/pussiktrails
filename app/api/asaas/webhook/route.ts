import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('🔔 Webhook Asaas recebido:', JSON.stringify(body, null, 2))

    // Evento de pagamento recebido
    if (body.event === 'PAYMENT_RECEIVED') {
      const payment = body.payment
      const reservaId = payment.externalReference

      if (reservaId) {
        const { error } = await supabase
          .from('reservas')
          .update({
            pagamento_status: 'pago',
            status: 'confirmada',
          })
          .eq('id', reservaId)

        if (error) {
          console.error('❌ Erro ao atualizar reserva:', error)
        } else {
          console.log(`✅ Pagamento confirmado para reserva ${reservaId}`)
        }
      }
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('❌ Erro no webhook:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}