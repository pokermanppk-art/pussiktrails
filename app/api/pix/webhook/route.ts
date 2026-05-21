import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('🔔 Webhook recebido:', JSON.stringify(body, null, 2))

    const { transaction_id, status } = body

    if (status === 'paid' || status === 'confirmado') {
      const { data: reserva } = await supabase
        .from('reservas')
        .select('id')
        .eq('id', transaction_id)
        .single()

      if (reserva) {
        await supabase
          .from('reservas')
          .update({
            pagamento_status: 'pago',
            status: 'confirmada'
          })
          .eq('id', reserva.id)

        console.log(`✅ Pagamento confirmado para reserva ${reserva.id}`)
      }
    }

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error('❌ Erro no webhook:', error)
    return NextResponse.json({ 
      error: 'Erro interno',
      details: error?.message || 'Erro desconhecido'
    }, { status: 500 })
  }
}