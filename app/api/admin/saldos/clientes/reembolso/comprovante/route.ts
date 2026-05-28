import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BUCKET = 'comprovantes-reembolsos'

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

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function limparNomeArquivo(nome: string) {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const formData = await request.formData()

    const file = formData.get('file')
    const reembolsoId = texto(formData.get('reembolsoId') || formData.get('reembolso_id'))

    if (!reembolsoId) {
      return NextResponse.json(
        { sucesso: false, erro: 'reembolsoId é obrigatório.' },
        { status: 400 }
      )
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { sucesso: false, erro: 'Arquivo não enviado.' },
        { status: 400 }
      )
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { sucesso: false, erro: 'O arquivo deve ter no máximo 10 MB.' },
        { status: 400 }
      )
    }

    const nomeOriginal = limparNomeArquivo(file.name || 'comprovante')
    const extensao = nomeOriginal.includes('.') ? nomeOriginal.split('.').pop() : 'bin'
    const nomeFinal = `reembolso-${reembolsoId}-${Date.now()}.${extensao}`
    const path = `reembolsos/${reembolsoId}/${nomeFinal}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data: publicData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path)

    const publicUrl = publicData?.publicUrl || ''

    const { error: updateError } = await supabase
      .from('solicitacoes_reembolso')
      .update({
        comprovante_url: publicUrl,
        comprovante_nome: file.name || nomeFinal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reembolsoId)

    if (updateError) throw updateError

    return NextResponse.json({
      sucesso: true,
      url: publicUrl,
      publicUrl,
      path,
      filename: file.name || nomeFinal,
    })
  } catch (error) {
    console.error('Erro em POST /api/admin/saldos/reembolsos/comprovante:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao anexar comprovante.',
      },
      { status: 500 }
    )
  }
}
