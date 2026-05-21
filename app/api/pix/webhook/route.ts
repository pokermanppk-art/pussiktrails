import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('🔔 Webhook recebido da PagHiper:', JSON.stringify(body, null, 2))

    // PagHiper envia o status no campo 'status' ou 'transaction_status'
    const transactionId = body.transaction_id || body.id
    const status = body.status || body.transaction_status

    if (status === 'paid' || status === 'confirmed' || status === 'pago') {
      // Buscar reserva pelo transaction_id (que é o order_id)
      const { data: reserva } = await supabase
        .from('reservas')
        .select('id')
        .eq('id', transactionId)
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
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}