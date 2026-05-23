import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Credenciais Supabase ausentes no servidor. Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel.'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const reservaId = searchParams.get('reservaId')

    if (!reservaId) {
      return NextResponse.json(
        {
          error: true,
          message: 'reservaId não informado.'
        },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: reserva, error } = await supabase
      .from('reservas')
      .select(
        'id, pagamento_status, paghiper_status, paghiper_order_id, paghiper_transaction_id, pagamento_confirmado_em'
      )
      .eq('id', reservaId)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!reserva) {
      return NextResponse.json(
        {
          error: true,
          message: 'Reserva não encontrada.'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      reserva_id: reserva.id,
      pagamento_status: reserva.pagamento_status || 'pendente',
      paghiper_status: reserva.paghiper_status || null,
      paghiper_order_id: reserva.paghiper_order_id || null,
      paghiper_transaction_id: reserva.paghiper_transaction_id || null,
      pagamento_confirmado_em: reserva.pagamento_confirmado_em || null,
      pago: reserva.pagamento_status === 'pago'
    })

  } catch (error: any) {
    console.error('ERRO STATUS PAGHIPER:')
    console.error(error.message || error)

    return NextResponse.json(
      {
        error: true,
        message:
          error.message || 'Erro interno ao consultar status do pagamento.'
      },
      { status: 500 }
    )
  }
}