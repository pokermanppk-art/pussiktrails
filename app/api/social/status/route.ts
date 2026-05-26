import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Variáveis de ambiente do Supabase não configuradas.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)

    const seguidorId = String(
      searchParams.get('seguidorId') || searchParams.get('seguidor_id') || ''
    ).trim()

    const seguidoId = String(
      searchParams.get('seguidoId') || searchParams.get('seguido_id') || ''
    ).trim()

    if (!seguidorId || !seguidoId) {
      return NextResponse.json(
        { sucesso: false, erro: 'seguidorId e seguidoId são obrigatórios.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('seguidores')
      .select('id, status')
      .eq('seguidor_id', seguidorId)
      .eq('seguido_id', seguidoId)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({
      sucesso: true,
      seguindo: data?.status === 'ativo',
      registro: data || null,
    })
  } catch (error) {
    console.error('Erro em /api/social/status:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao verificar status social.',
      },
      { status: 500 }
    )
  }
}