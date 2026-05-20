import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET: Buscar bio do guia
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('bio')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Erro ao buscar bio do guia:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      bio: data?.bio || ''
    })

  } catch (error: any) {
    console.error('Erro na API GET:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PATCH: Atualizar bio do guia
export async function PATCH(request: Request) {
  try {
    const { userId, bio } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ bio: bio })
      .eq('id', userId)
      .select()

    if (error) {
      console.error('Erro ao salvar bio do guia:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Bio atualizada com sucesso',
      data: data
    })

  } catch (error: any) {
    console.error('Erro na API PATCH:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}