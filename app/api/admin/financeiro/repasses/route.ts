import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  ''

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function getSupabaseAdmin() {
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ausente no ambiente.')
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente no ambiente.')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('repasses_guias')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2500)

    if (error) {
      return json(
        {
          sucesso: false,
          erro: error.message || 'Erro ao buscar repasses.'
        },
        500
      )
    }

    return json({
      sucesso: true,
      repasses: data || []
    })
  } catch (error: any) {
    console.error('Erro em /api/admin/financeiro/repasses:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao buscar repasses.'
      },
      500
    )
  }
}