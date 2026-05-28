import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

function getSupabaseAdmin(): any {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Variáveis de ambiente do Supabase não configuradas.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function erroDeColunaAusente(error: any) {
  const mensagem = String(
    error?.message ||
      error?.details ||
      error?.hint ||
      ''
  ).toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    mensagem.includes('could not find') ||
    mensagem.includes('schema cache') ||
    mensagem.includes('column')
  )
}

function extrairColunaAusente(error: any) {
  const mensagem = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')

  const matchAspas = mensagem.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  const matchColumn = mensagem.match(/column\s+([a-zA-Z0-9_]+)/i)
  if (matchColumn?.[1]) return matchColumn[1]

  return ''
}

function extrairUserId(request: NextRequest, body: AnyRecord = {}) {
  const { searchParams } = new URL(request.url)

  return texto(
    body.userId ||
      body.usuarioId ||
      body.usuario_id ||
      body.guiaId ||
      body.guia_id ||
      body.id ||
      searchParams.get('userId') ||
      searchParams.get('usuarioId') ||
      searchParams.get('usuario_id') ||
      searchParams.get('guiaId') ||
      searchParams.get('guia_id') ||
      searchParams.get('id')
  )
}

async function atualizarUsuarioComFallback(params: {
  supabase: any
  userId: string
  payloadOriginal: AnyRecord
}) {
  const { supabase, userId } = params
  let payload: AnyRecord = { ...params.payloadOriginal }

  for (let tentativa = 0; tentativa < 12; tentativa++) {
    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', userId)
      .select('*')
      .maybeSingle()

    if (!error) return data as AnyRecord | null

    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payload)) throw error

    delete payload[coluna]
  }

  throw new Error('Não foi possível atualizar a bio após ajustar colunas ausentes.')
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const userId = extrairUserId(request)

    if (!userId) {
      return NextResponse.json(
        {
          sucesso: false,
          success: false,
          erro: 'userId é obrigatório.',
          error: 'userId é obrigatório.',
        },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw error

    if (!data?.id) {
      return NextResponse.json(
        {
          sucesso: false,
          success: false,
          erro: 'Usuário não encontrado.',
          error: 'Usuário não encontrado.',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      sucesso: true,
      success: true,
      usuario: data,
      user: data,
      bio: data.bio_guia || data.bio || '',
    })
  } catch (error: any) {
    console.error('Erro em GET /api/usuario/bio:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    })

    return NextResponse.json(
      {
        sucesso: false,
        success: false,
        erro: error?.message || 'Erro ao carregar bio.',
        error: error?.message || 'Erro ao carregar bio.',
        detalhe: {
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          message: error?.message,
        },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return salvarBio(request)
}

export async function PATCH(request: NextRequest) {
  return salvarBio(request)
}

async function salvarBio(request: NextRequest) {
  let body: AnyRecord = {}

  try {
    const supabase = getSupabaseAdmin()
    body = await request.json().catch(() => ({}))

    const userId = extrairUserId(request, body)
    const bio = String(body.bio ?? body.bio_guia ?? '').trim()
    const tipoUsuario = normalizar(
      body.tipoUsuario ||
        body.tipo_usuario ||
        body.tipo ||
        'guia'
    )

    if (!userId) {
      return NextResponse.json(
        {
          sucesso: false,
          success: false,
          erro: 'userId é obrigatório.',
          error: 'userId é obrigatório.',
          recebido: body,
        },
        { status: 400 }
      )
    }

    if (bio.length > 2500) {
      return NextResponse.json(
        {
          sucesso: false,
          success: false,
          erro: 'A bio está muito longa. Limite recomendado: 2.500 caracteres.',
          error: 'A bio está muito longa. Limite recomendado: 2.500 caracteres.',
        },
        { status: 400 }
      )
    }

    const { data: usuarioAtual, error: usuarioError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (usuarioError) throw usuarioError

    if (!usuarioAtual?.id) {
      return NextResponse.json(
        {
          sucesso: false,
          success: false,
          erro: 'Usuário não encontrado.',
          error: 'Usuário não encontrado.',
        },
        { status: 404 }
      )
    }

    const tipoAtual = normalizar(usuarioAtual.tipo)

    if (tipoAtual && tipoUsuario && tipoAtual !== tipoUsuario) {
      return NextResponse.json(
        {
          sucesso: false,
          success: false,
          erro: `Este usuário não é do tipo ${tipoUsuario}.`,
          error: `Este usuário não é do tipo ${tipoUsuario}.`,
          tipoAtual: usuarioAtual.tipo,
        },
        { status: 403 }
      )
    }

    const payload: AnyRecord = {
      bio,
      updated_at: new Date().toISOString(),
    }

    if (tipoUsuario === 'guia') {
      payload.bio_guia = bio
    }

    const atualizado = await atualizarUsuarioComFallback({
      supabase,
      userId,
      payloadOriginal: payload,
    })

    const usuarioFinal = atualizado || {
      ...usuarioAtual,
      ...payload,
    }

    return NextResponse.json({
      sucesso: true,
      success: true,
      mensagem: 'Biografia atualizada com sucesso.',
      message: 'Biografia atualizada com sucesso.',
      usuario: usuarioFinal,
      user: usuarioFinal,
      data: usuarioFinal,
      bio,
    })
  } catch (error: any) {
    console.error('Erro em POST/PATCH /api/usuario/bio:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      body,
    })

    return NextResponse.json(
      {
        sucesso: false,
        success: false,
        erro: error?.message || 'Erro ao salvar bio.',
        error: error?.message || 'Erro ao salvar bio.',
        detalhe: {
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          message: error?.message,
        },
        recebido: body,
      },
      { status: 500 }
    )
  }
}