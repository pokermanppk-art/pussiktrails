import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Evento de pagamento recebido
    if (body.event === 'PAYMENT_RECEIVED') {
      const payment = body.payment
      const reservaId = payment.externalReference
      
      if (reservaId) {
        await supabase
          .from('reservas')
          .update({
            pagamento_status: 'pago',
            status: 'confirmada',
          })
          .eq('id', reservaId)
          
        console.log(`✅ Pagamento confirmado para reserva ${reservaId}`)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Erro no webhook Asaas:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}