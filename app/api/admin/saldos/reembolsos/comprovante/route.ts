import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Buffer } from 'node:buffer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

const BUCKET_COMPROVANTES = 'comprovantes-reembolsos'
const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

const MIME_PERMITIDOS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
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
  if (mime === 'application/pdf') return 'pdf'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg'
  return 'bin'
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

async function atualizarReembolsoComFallback(params: {
  supabase: any
  reembolsoId: string
  payloadOriginal: AnyRecord
}) {
  const { supabase, reembolsoId } = params
  let payload: AnyRecord = { ...params.payloadOriginal }

  for (let tentativa = 0; tentativa < 14; tentativa++) {
    const { data, error } = await supabase
      .from('solicitacoes_reembolso')
      .update(payload)
      .eq('id', reembolsoId)
      .select('*')
      .maybeSingle()

    if (!error) return data

    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payload)) {
      throw error
    }

    delete payload[coluna]
  }

  throw new Error('Não foi possível atualizar o reembolso após ajustar colunas.')
}

async function garantirBucket(supabase: any) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()

  if (listError) {
    console.warn('[reembolso/comprovante] Não foi possível listar buckets:', listError)
    return
  }

  const existe = (buckets || []).some(
    (bucket: AnyRecord) => bucket.name === BUCKET_COMPROVANTES
  )

  if (existe) return

  const { error: createError } = await supabase.storage.createBucket(
    BUCKET_COMPROVANTES,
    {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE_BYTES,
      allowedMimeTypes: MIME_PERMITIDOS,
    }
  )

  if (createError) {
    console.warn('[reembolso/comprovante] Não foi possível criar bucket:', createError)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const formData = await request.formData()

    const arquivo = formData.get('file')

    const reembolsoId = texto(
      formData.get('reembolsoId') ||
        formData.get('reembolso_id') ||
        formData.get('solicitacaoId') ||
        formData.get('solicitacao_id')
    )

    const adminId = texto(
      formData.get('adminId') ||
        formData.get('admin_id') ||
        formData.get('usuarioId') ||
        formData.get('usuario_id')
    )

    const referencia = texto(
      formData.get('referencia') ||
        formData.get('referencia_pagamento') ||
        formData.get('comprovante_referencia')
    )

    if (!reembolsoId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'reembolsoId é obrigatório.',
        },
        { status: 400 }
      )
    }

    if (!(arquivo instanceof File)) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Nenhum arquivo de comprovante foi enviado.',
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
          erro: `O comprovante deve ter no máximo ${MAX_FILE_SIZE_MB} MB.`,
        },
        { status: 400 }
      )
    }

    const mime = arquivo.type || 'application/octet-stream'

    if (!MIME_PERMITIDOS.includes(mime)) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Formato não permitido. Envie PDF, JPG, PNG ou WEBP.',
        },
        { status: 400 }
      )
    }

    const { data: reembolso, error: reembolsoError } = await supabase
      .from('solicitacoes_reembolso')
      .select('*')
      .eq('id', reembolsoId)
      .maybeSingle()

    if (reembolsoError) throw reembolsoError

    if (!reembolso) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Solicitação de reembolso não encontrada.',
        },
        { status: 404 }
      )
    }

    await garantirBucket(supabase)

    const extensao = extensaoPorMime(mime)
    const nomeOriginal = limparNomeArquivo(
      arquivo.name || `comprovante.${extensao}`
    )

    const nomeFinal = nomeOriginal.includes('.')
      ? nomeOriginal
      : `${nomeOriginal}.${extensao}`

    const clienteId = texto((reembolso as AnyRecord).cliente_id) || 'cliente'

    const caminho = [
      'reembolsos-clientes',
      clienteId,
      reembolsoId,
      `${Date.now()}-${nomeFinal}`,
    ].join('/')

    const arrayBuffer = await arquivo.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let upload = await supabase.storage
      .from(BUCKET_COMPROVANTES)
      .upload(caminho, buffer, {
        contentType: mime,
        upsert: true,
      })

    if (
      upload.error &&
      String(upload.error.message || '').toLowerCase().includes('bucket')
    ) {
      await garantirBucket(supabase)

      upload = await supabase.storage
        .from(BUCKET_COMPROVANTES)
        .upload(caminho, buffer, {
          contentType: mime,
          upsert: true,
        })
    }

    if (upload.error) throw upload.error

    const { data: publicData } = supabase.storage
      .from(BUCKET_COMPROVANTES)
      .getPublicUrl(caminho)

    const comprovanteUrl = publicData?.publicUrl || ''

    if (!comprovanteUrl) {
      throw new Error('Não foi possível gerar a URL pública do comprovante.')
    }

    const agora = new Date().toISOString()

    const payloadAtualizacao: AnyRecord = {
      comprovante_url: comprovanteUrl,
      comprovante_path: caminho,
      comprovante_nome: nomeFinal,
      comprovante_mime_type: mime,
      comprovante_tamanho: arquivo.size,
      comprovante_referencia: referencia || null,
      comprovante_enviado_em: agora,
      comprovante_enviado_por: adminId || null,
      updated_at: agora,
      metadata_comprovante: {
        bucket: BUCKET_COMPROVANTES,
        path: caminho,
        url: comprovanteUrl,
        nome_original: arquivo.name || nomeFinal,
        nome_final: nomeFinal,
        mime_type: mime,
        tamanho_bytes: arquivo.size,
        referencia: referencia || null,
        admin_id: adminId || null,
        enviado_em: agora,
      },
    }

    const atualizado = await atualizarReembolsoComFallback({
      supabase,
      reembolsoId,
      payloadOriginal: payloadAtualizacao,
    })

    return NextResponse.json({
      sucesso: true,
      comprovante: {
        url: comprovanteUrl,
        path: caminho,
        nome: nomeFinal,
        mime_type: mime,
        tamanho: arquivo.size,
        referencia: referencia || null,
      },
      reembolso: atualizado,
    })
  } catch (error) {
    console.error('Erro em POST /api/admin/saldos/reembolsos/comprovante:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao anexar comprovante do reembolso.',
      },
      { status: 500 }
    )
  }
}