import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BUCKET = 'comprovantes-saques'
const MAX_FILE_SIZE = 10 * 1024 * 1024

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
  const partes = texto(nome).split('.')
  const extensao = partes.length > 1 ? partes.pop() || 'bin' : 'bin'
  const base = partes.join('.') || 'comprovante'

  const baseLimpa = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'comprovante'

  const extensaoLimpa = extensao
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 8) || 'bin'

  return `${baseLimpa}.${extensaoLimpa}`
}

function tipoPermitido(file: File) {
  const tipo = texto(file.type).toLowerCase()
  const nome = texto(file.name).toLowerCase()

  const tipos = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/heic',
    'image/heif',
  ]

  if (tipo && tipos.includes(tipo)) return true

  return (
    nome.endsWith('.pdf') ||
    nome.endsWith('.png') ||
    nome.endsWith('.jpg') ||
    nome.endsWith('.jpeg') ||
    nome.endsWith('.webp') ||
    nome.endsWith('.heic') ||
    nome.endsWith('.heif')
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const formData = await request.formData()

    const file = formData.get('file')
    const saqueId = texto(formData.get('saqueId'))
    const guiaId = texto(formData.get('guiaId'))
    const adminId = texto(formData.get('adminId'))

    if (!saqueId) {
      return NextResponse.json(
        { sucesso: false, erro: 'saqueId é obrigatório.' },
        { status: 400 }
      )
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { sucesso: false, erro: 'Arquivo do comprovante é obrigatório.' },
        { status: 400 }
      )
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { sucesso: false, erro: 'Arquivo vazio ou inválido.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { sucesso: false, erro: 'O comprovante deve ter no máximo 10 MB.' },
        { status: 400 }
      )
    }

    if (!tipoPermitido(file)) {
      return NextResponse.json(
        { sucesso: false, erro: 'Formato não permitido. Envie PDF, PNG, JPG, WEBP ou HEIC.' },
        { status: 400 }
      )
    }

    const { data: saqueAtual, error: saqueError } = await supabase
      .from('solicitacoes_saque_guias')
      .select('id, guia_id, status')
      .eq('id', saqueId)
      .maybeSingle()

    if (saqueError) {
      return NextResponse.json(
        { sucesso: false, erro: saqueError.message },
        { status: 500 }
      )
    }

    if (!saqueAtual) {
      return NextResponse.json(
        { sucesso: false, erro: 'Solicitação de saque não encontrada.' },
        { status: 404 }
      )
    }

    const guiaIdFinal = guiaId || saqueAtual.guia_id || 'sem-guia'
    const nomeArquivo = limparNomeArquivo(file.name || 'comprovante')
    const path = `guias/${guiaIdFinal}/saques/${saqueId}/${Date.now()}-${nomeArquivo}`

    const arrayBuffer = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { sucesso: false, erro: uploadError.message },
        { status: 500 }
      )
    }

    const { data: publicData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path)

    const publicUrl = publicData?.publicUrl || ''

    try {
      await supabase.from('logs_atividades').insert({
        usuario_id: adminId || guiaIdFinal || null,
        tipo_usuario: 'admin',
        escopo: 'admin',
        tipo_evento: 'saque_guia_comprovante_anexado',
        titulo: 'Comprovante de saque anexado',
        mensagem: `Comprovante anexado à solicitação de saque ${saqueId}.`,
        metadata: {
          saque_id: saqueId,
          guia_id: guiaIdFinal,
          admin_id: adminId || null,
          bucket: BUCKET,
          path,
          filename: file.name,
          mime_type: file.type || null,
          size: file.size,
          public_url: publicUrl,
        },
        created_at: new Date().toISOString(),
      })
    } catch (logError) {
      console.warn('[admin/financeiro/saques/comprovante] Log não registrado:', logError)
    }

    return NextResponse.json({
      sucesso: true,
      publicUrl,
      url: publicUrl,
      path,
      filename: file.name,
      mimeType: file.type || '',
      size: file.size,
    })
  } catch (error: any) {
    console.error('[admin/financeiro/saques/comprovante][POST] Erro:', error)

    return NextResponse.json(
      { sucesso: false, erro: error?.message || 'Erro ao anexar comprovante.' },
      { status: 500 }
    )
  }
}
