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

async function contarCurtidas(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  fotoId?: string | null,
  fotoUrl?: string | null
) {
  let query = supabase
    .from('foto_curtidas')
    .select('id', { count: 'exact', head: true })

  if (fotoId) {
    query = query.eq('foto_id', fotoId)
  } else {
    query = query.eq('foto_url', fotoUrl)
  }

  const { count } = await query

  return count || 0
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()

    const usuarioId = String(body.usuarioId || body.usuario_id || '').trim()
    const fotoId = body.fotoId || body.foto_id || null
    const fotoUrl = body.fotoUrl || body.foto_url || null
    const donoId = body.donoId || body.dono_id || null
    const origem = String(body.origem || 'perfil')

    if (!usuarioId) {
      return NextResponse.json(
        { sucesso: false, erro: 'usuarioId é obrigatório.' },
        { status: 400 }
      )
    }

    if (!fotoId && !fotoUrl) {
      return NextResponse.json(
        { sucesso: false, erro: 'fotoId ou fotoUrl é obrigatório.' },
        { status: 400 }
      )
    }

    let busca = supabase
      .from('foto_curtidas')
      .select('*')
      .eq('usuario_id', usuarioId)

    if (fotoId) {
      busca = busca.eq('foto_id', fotoId)
    } else {
      busca = busca.eq('foto_url', fotoUrl)
    }

    const { data: existente, error: buscaError } = await busca.maybeSingle()

    if (buscaError) {
      throw buscaError
    }

    if (existente?.id) {
      const { error: deleteError } = await supabase
        .from('foto_curtidas')
        .delete()
        .eq('id', existente.id)

      if (deleteError) throw deleteError

      const totalCurtidas = await contarCurtidas(supabase, fotoId, fotoUrl)

      return NextResponse.json({
        sucesso: true,
        curtido: false,
        totalCurtidas,
      })
    }

    const { error: insertError } = await supabase.from('foto_curtidas').insert({
      usuario_id: usuarioId,
      foto_id: fotoId,
      foto_url: fotoUrl,
      dono_id: donoId,
      origem,
    })

    if (insertError) throw insertError

    if (donoId && donoId !== usuarioId) {
      await supabase.rpc('criar_notificacoes_para_seguidores', {
        p_ator_id: usuarioId,
        p_tipo: 'foto_curtida',
        p_titulo: 'Foto curtida',
        p_mensagem: 'Alguém curtiu uma foto de aventura.',
        p_destino_url: donoId ? `/cliente/publico/${donoId}` : '/cliente/dashboard',
        p_entidade_tipo: 'foto',
        p_entidade_id: fotoId || null,
      })
    }

    const totalCurtidas = await contarCurtidas(supabase, fotoId, fotoUrl)

    return NextResponse.json({
      sucesso: true,
      curtido: true,
      totalCurtidas,
    })
  } catch (error) {
    console.error('Erro em /api/social/curtir-foto:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao curtir/descurtir foto.',
      },
      { status: 500 }
    )
  }
}