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

    const seguidorId = String(body.seguidorId || body.seguidor_id || '').trim()
    const seguidoId = String(body.seguidoId || body.seguido_id || '').trim()
    const origem = String(body.origem || 'perfil')
    const acao = String(body.acao || '').trim()

    if (!seguidorId || !seguidoId) {
      return NextResponse.json(
        { sucesso: false, erro: 'seguidorId e seguidoId são obrigatórios.' },
        { status: 400 }
      )
    }

    if (seguidorId === seguidoId) {
      return NextResponse.json(
        { sucesso: false, erro: 'O usuário não pode seguir a si mesmo.' },
        { status: 400 }
      )
    }

    const { data: existente, error: buscaError } = await supabase
      .from('seguidores')
      .select('*')
      .eq('seguidor_id', seguidorId)
      .eq('seguido_id', seguidoId)
      .maybeSingle()

    if (buscaError) {
      throw buscaError
    }

    if (acao === 'deixar_de_seguir' || acao === 'remover') {
      if (existente?.id) {
        const { error } = await supabase
          .from('seguidores')
          .update({
            status: 'removido',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existente.id)

        if (error) throw error
      }

      return NextResponse.json({
        sucesso: true,
        seguindo: false,
        mensagem: 'Você deixou de seguir este perfil.',
      })
    }

    if (existente?.id) {
      const novoStatus = existente.status === 'ativo' ? 'removido' : 'ativo'

      const { error } = await supabase
        .from('seguidores')
        .update({
          status: novoStatus,
          origem,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existente.id)

      if (error) throw error

      return NextResponse.json({
        sucesso: true,
        seguindo: novoStatus === 'ativo',
        mensagem:
          novoStatus === 'ativo'
            ? 'Agora você segue este perfil.'
            : 'Você deixou de seguir este perfil.',
      })
    }

    const { error: insertError } = await supabase.from('seguidores').insert({
      seguidor_id: seguidorId,
      seguido_id: seguidoId,
      status: 'ativo',
      origem,
      updated_at: new Date().toISOString(),
    })

    if (insertError) throw insertError

    return NextResponse.json({
      sucesso: true,
      seguindo: true,
      mensagem: 'Agora você segue este perfil.',
    })
  } catch (error) {
    console.error('Erro em /api/social/seguir:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao seguir/deixar de seguir.',
      },
      { status: 500 }
    )
  }
}