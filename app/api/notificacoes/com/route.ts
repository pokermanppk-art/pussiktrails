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

    const usuarioId = String(
      searchParams.get('usuarioId') || searchParams.get('usuario_id') || ''
    ).trim()

    if (!usuarioId) {
      return NextResponse.json(
        { sucesso: false, erro: 'usuarioId é obrigatório.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('notificacoes_com')
      .select('*')
      .eq('destinatario_id', usuarioId)
      .order('created_at', { ascending: false })
      .limit(40)

    if (error) throw error

    return NextResponse.json({
      sucesso: true,
      notificacoes: data || [],
    })
  } catch (error) {
    console.error('Erro em GET /api/notificacoes/com:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao carregar notificações COM.',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()

    const usuarioId = String(body.usuarioId || body.usuario_id || '').trim()
    const notificacaoId = body.notificacaoId || body.notificacao_id || null

    if (!usuarioId) {
      return NextResponse.json(
        { sucesso: false, erro: 'usuarioId é obrigatório.' },
        { status: 400 }
      )
    }

    let update = supabase
      .from('notificacoes_com')
      .update({ lida: true })
      .eq('destinatario_id', usuarioId)

    if (notificacaoId) {
      update = update.eq('id', notificacaoId)
    }

    const { error } = await update

    if (error) throw error

    return NextResponse.json({
      sucesso: true,
    })
  } catch (error) {
    console.error('Erro em POST /api/notificacoes/com:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao marcar notificação como lida.',
      },
      { status: 500 }
    )
  }
}