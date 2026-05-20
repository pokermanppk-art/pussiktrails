import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(request: Request) {
  try {
    console.log('🔍 [API] Iniciando requisição')
    
    const body = await request.json()
    console.log('🔍 [API] Body recebido:', body)
    
    const { userId, fotos } = body

    if (!userId) {
      console.error('❌ [API] userId não fornecido')
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      )
    }

    if (!fotos || !Array.isArray(fotos)) {
      console.error('❌ [API] fotos não é um array:', fotos)
      return NextResponse.json(
        { error: 'fotos deve ser um array' },
        { status: 400 }
      )
    }

    console.log('🔍 [API] userId:', userId)
    console.log('🔍 [API] fotos:', fotos)

    // Verificar se a chave service_role existe
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ [API] SUPABASE_SERVICE_ROLE_KEY não configurada')
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      )
    }

    // Criar cliente Supabase com service_role
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

    console.log('🔍 [API] Atualizando usuário...')

    // Atualizar as fotos
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ fotos_aventuras: fotos })
      .eq('id', userId)
      .select()

    if (error) {
      console.error('❌ [API] Erro no Supabase:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ [API] Sucesso! Dados:', data)

    return NextResponse.json({
      success: true,
      message: 'Fotos atualizadas com sucesso',
      data: data
    })

  } catch (error: any) {
    console.error('❌ [API] Erro fatal:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}