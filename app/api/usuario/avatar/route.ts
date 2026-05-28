import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Buffer } from 'node:buffer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

const BUCKET_AVATARES = 'fotos-aventuras'
const MAX_FILE_SIZE_MB = 8
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

const MIME_PERMITIDOS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

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
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function limparNomeArquivo(nome: string) {
  return texto(nome)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function extensaoPorMime(mime: string) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg'
  return 'webp'
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

async function atualizarUsuarioComFallback(params: {
  supabase: any
  userId: string
  payloadOriginal: AnyRecord
}) {
  const { supabase, userId } = params
  let payload: AnyRecord = { ...params.payloadOriginal }

  for (let tentativa = 0; tentativa < 14; tentativa++) {
    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', userId)
      .select('*')
      .maybeSingle()

    if (!error) return (data || {}) as AnyRecord

    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payload)) {
      throw error
    }

    delete payload[coluna]
  }

  throw new Error('Não foi possível atualizar o avatar após ajustar colunas.')
}

async function garantirBucketPublico(supabase: any) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()

  if (listError) {
    console.warn('[usuario/avatar] Não foi possível listar buckets:', listError)
    return
  }

  const bucket = (buckets || []).find((item: AnyRecord) => item.name === BUCKET_AVATARES)

  if (!bucket) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET_AVATARES, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE_BYTES,
      allowedMimeTypes: MIME_PERMITIDOS,
    })

    if (createError) {
      console.warn('[usuario/avatar] Não foi possível criar bucket:', createError)
    }

    return
  }

  if (bucket.public !== true) {
    const { error: updateError } = await supabase.storage.updateBucket(BUCKET_AVATARES, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE_BYTES,
      allowedMimeTypes: MIME_PERMITIDOS,
    })

    if (updateError) {
      console.warn('[usuario/avatar] Não foi possível tornar bucket público:', updateError)
    }
  }
}

export async function GET() {
  return NextResponse.json({
    sucesso: true,
    rota: '/api/usuario/avatar',
    mensagem: 'Rota ativa. Use POST com multipart/form-data para salvar avatar.',
    bucket: BUCKET_AVATARES,
  })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const formData = await request.formData()

    const arquivo = formData.get('file')

    const userId = texto(
      formData.get('userId') ||
        formData.get('user_id') ||
        formData.get('usuarioId') ||
        formData.get('usuario_id')
    )

    const tipoUsuario = texto(
      formData.get('tipoUsuario') ||
        formData.get('tipo_usuario') ||
        'cliente'
    )

    if (!userId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'userId é obrigatório.',
        },
        { status: 400 }
      )
    }

    if (!(arquivo instanceof File)) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Nenhum arquivo de avatar foi enviado.',
        },
        { status: 400 }
      )
    }

    if (arquivo.size <= 0) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'O arquivo enviado está vazio.',
        },
        { status: 400 }
      )
    }

    if (arquivo.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: `A imagem deve ter no máximo ${MAX_FILE_SIZE_MB} MB.`,
        },
        { status: 400 }
      )
    }

    const mime = arquivo.type || 'application/octet-stream'

    if (!MIME_PERMITIDOS.includes(mime)) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Formato não permitido. Envie JPG, PNG ou WEBP.',
        },
        { status: 400 }
      )
    }

    const { data: usuario, error: usuarioError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (usuarioError) throw usuarioError

    if (!usuario) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Usuário não encontrado.',
        },
        { status: 404 }
      )
    }

    await garantirBucketPublico(supabase)

    const extensao = extensaoPorMime(mime)
    const nomeOriginal = limparNomeArquivo(arquivo.name || `avatar.${extensao}`)
    const nomeFinal = nomeOriginal.includes('.')
      ? nomeOriginal
      : `${nomeOriginal}.${extensao}`

    const pastaTipo =
      tipoUsuario === 'guia'
        ? 'guias'
        : tipoUsuario === 'admin'
          ? 'admins'
          : 'clientes'

    const caminho = [
      pastaTipo,
      userId,
      'avatar',
      `${Date.now()}-${nomeFinal}`,
    ].join('/')

    const arrayBuffer = await arquivo.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let upload = await supabase.storage
      .from(BUCKET_AVATARES)
      .upload(caminho, buffer, {
        contentType: mime,
        upsert: true,
      })

    if (
      upload.error &&
      String(upload.error.message || '').toLowerCase().includes('bucket')
    ) {
      await garantirBucketPublico(supabase)

      upload = await supabase.storage
        .from(BUCKET_AVATARES)
        .upload(caminho, buffer, {
          contentType: mime,
          upsert: true,
        })
    }

    if (upload.error) throw upload.error

    const { data: publicData } = supabase.storage
      .from(BUCKET_AVATARES)
      .getPublicUrl(caminho)

    const publicUrl = publicData?.publicUrl || ''

    if (!publicUrl) {
      throw new Error('Não foi possível gerar a URL pública do avatar.')
    }

    const agora = new Date().toISOString()

    const usuarioAtualizado = await atualizarUsuarioComFallback({
      supabase,
      userId,
      payloadOriginal: {
        avatar_url: publicUrl,
        foto_url: publicUrl,
        imagem_url: publicUrl,
        updated_at: agora,
      },
    })

    return NextResponse.json({
      sucesso: true,
      avatarUrl: publicUrl,
      avatar_url: publicUrl,
      foto_url: publicUrl,
      imagem_url: publicUrl,
      path: caminho,
      bucket: BUCKET_AVATARES,
      usuario: usuarioAtualizado,
    })
  } catch (error: any) {
    console.error('Erro em POST /api/usuario/avatar:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack,
      raw: error,
    })

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error?.message ||
          'Erro ao salvar avatar do usuário.',
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
