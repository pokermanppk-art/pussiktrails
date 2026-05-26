import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BUCKET = 'fotos-aventuras'

type AnyRecord = Record<string, any>

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurada.')
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function limparNomeArquivo(nome: string) {
  return String(nome || 'arquivo')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
}

function erroColunaAusente(error: any) {
  const mensagem = String(
    error?.message ||
      error?.details ||
      error?.hint ||
      ''
  ).toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    mensagem.includes('column') ||
    mensagem.includes('schema cache') ||
    mensagem.includes('could not find')
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

async function atualizarUsuarioComFallback(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  payloadOriginal: AnyRecord
) {
  let payload = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 12; tentativa++) {
    if (Object.keys(payload).length === 0) {
      throw new Error('Nenhuma coluna disponível para atualizar o usuário.')
    }

    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', userId)
      .select('*')
      .maybeSingle()

    if (!error) return data

    if (!erroColunaAusente(error)) {
      throw new Error(error.message || 'Erro ao atualizar usuário.')
    }

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payload)) {
      throw new Error(error.message || 'Erro ao ajustar coluna ausente.')
    }

    delete payload[coluna]
  }

  throw new Error('Não foi possível atualizar o usuário após ajustar colunas.')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()

    const formData = await request.formData()

    const file = formData.get('file') as File | null
    const userId = texto(formData.get('userId'))
    const pasta = limparNomeArquivo(texto(formData.get('pasta')) || 'usuarios')

    if (!userId) {
      return NextResponse.json(
        {
          sucesso: false,
          success: false,
          erro: 'userId é obrigatório.',
        },
        { status: 400 }
      )
    }

    if (!file) {
      return NextResponse.json(
        {
          sucesso: false,
          success: false,
          erro: 'Arquivo não enviado.',
        },
        { status: 400 }
      )
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        {
          sucesso: false,
          success: false,
          erro: 'O arquivo enviado não é uma imagem.',
        },
        { status: 400 }
      )
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        {
          sucesso: false,
          success: false,
          erro: 'A imagem ultrapassa o limite de 8MB.',
        },
        { status: 400 }
      )
    }

    const extensao =
      file.type === 'image/webp'
        ? 'webp'
        : file.type === 'image/png'
          ? 'png'
          : file.type === 'image/gif'
            ? 'gif'
            : 'jpg'

    const caminho = `${pasta}/${userId}/avatar-${Date.now()}.${extensao}`

    const arrayBuffer = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(caminho, arrayBuffer, {
        upsert: true,
        contentType: file.type || 'image/jpeg',
      })

    if (uploadError) {
      return NextResponse.json(
        {
          sucesso: false,
          success: false,
          etapa: 'upload_storage',
          erro: uploadError.message,
        },
        { status: 500 }
      )
    }

    const { data: publicData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(caminho)

    const publicUrl = publicData?.publicUrl || ''

    if (!publicUrl) {
      return NextResponse.json(
        {
          sucesso: false,
          success: false,
          etapa: 'public_url',
          erro: 'Não foi possível gerar URL pública.',
        },
        { status: 500 }
      )
    }

    const usuarioAtualizado = await atualizarUsuarioComFallback(
      supabase,
      userId,
      {
        avatar_url: publicUrl,
        foto_url: publicUrl,
        imagem_url: publicUrl,
        updated_at: new Date().toISOString(),
      }
    )

    return NextResponse.json({
      sucesso: true,
      success: true,
      message: 'Foto salva com sucesso.',
      publicUrl,
      url: publicUrl,
      caminho,
      usuario: usuarioAtualizado,
      data: usuarioAtualizado,
    })
  } catch (error: any) {
    console.error('Erro em POST /api/usuario/avatar:', error)

    return NextResponse.json(
      {
        sucesso: false,
        success: false,
        etapa: 'catch_final',
        erro: error?.message || 'Erro interno ao salvar avatar.',
      },
      { status: 500 }
    )
  }
}