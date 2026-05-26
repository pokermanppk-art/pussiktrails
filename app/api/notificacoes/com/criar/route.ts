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

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()

    const atorId = String(body.atorId || body.ator_id || '').trim()
    const tipo = String(body.tipo || '').trim()
    const titulo = String(body.titulo || '').trim()
    const mensagem = String(body.mensagem || '').trim()
    const destinoUrl = String(body.destinoUrl || body.destino_url || '').trim()
    const entidadeTipo = body.entidadeTipo || body.entidade_tipo || null
    const entidadeId = body.entidadeId || body.entidade_id || null

    if (!atorId || !tipo || !titulo) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'atorId, tipo e titulo são obrigatórios.',
        },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.rpc(
      'criar_notificacoes_para_seguidores',
      {
        p_ator_id: atorId,
        p_tipo: tipo,
        p_titulo: titulo,
        p_mensagem: mensagem,
        p_destino_url: destinoUrl || '/cliente/dashboard',
        p_entidade_tipo: entidadeTipo,
        p_entidade_id: entidadeId,
      }
    )

    if (error) throw error

    return NextResponse.json({
      sucesso: true,
      totalCriadas: data || 0,
    })
  } catch (error) {
    console.error('Erro em /api/notificacoes/com/criar:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao criar notificações COM.',
      },
      { status: 500 }
    )
  }
}