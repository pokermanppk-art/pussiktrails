import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

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

function getSupabaseAdmin(): any {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Variáveis SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configuradas.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

function erroColunaInexistente(error: any) {
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
    mensagem.includes('does not exist') ||
    mensagem.includes('could not find')
  )
}

function extrairColunaInexistente(error: any) {
  const textoErro = [
    error?.message,
    error?.details,
    error?.hint
  ]
    .filter(Boolean)
    .join(' ')

  const matchUsers = textoErro.match(/users\.([a-zA-Z0-9_]+)/)

  if (matchUsers?.[1]) return matchUsers[1]

  const matchColumn = textoErro.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i)

  if (matchColumn?.[1]) return matchColumn[1]

  const matchAspas = textoErro.match(/'([^']+)'/)

  if (matchAspas?.[1]) return matchAspas[1]

  return ''
}

async function atualizarUsuarioComFallback(params: {
  supabase: any
  userId: string
  payloadOriginal: AnyRecord
}) {
  const { supabase, userId } = params
  let payload: AnyRecord = { ...params.payloadOriginal }

  for (let tentativa = 0; tentativa < 18; tentativa++) {
    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', userId)
      .select('*')
      .maybeSingle()

    if (!error) return data as AnyRecord | null

    if (!erroColunaInexistente(error)) {
      console.error('[guia/perfil/salvar-dados] Erro ao atualizar usuário:', {
        userId,
        payloadKeys: Object.keys(payload),
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })

      throw error
    }

    const coluna = extrairColunaInexistente(error)

    if (!coluna || !(coluna in payload)) {
      console.error('[guia/perfil/salvar-dados] Coluna ausente não mapeada:', {
        coluna,
        payloadKeys: Object.keys(payload),
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })

      throw error
    }

    delete payload[coluna]

    if (Object.keys(payload).length === 0) {
      throw new Error('Nenhuma coluna disponível para atualizar o perfil do guia.')
    }
  }

  throw new Error('Não foi possível atualizar o perfil do guia.')
}

export async function POST(request: Request) {
  let body: AnyRecord = {}

  try {
    const supabase = getSupabaseAdmin()
    body = await request.json().catch(() => ({}))

    const userId = texto(
      body.userId ||
        body.usuarioId ||
        body.usuario_id ||
        body.guiaId ||
        body.guia_id
    )

    const pixTipo = texto(body.pixTipo || body.pix_tipo)
    const pixChave = texto(body.pixChave || body.pix_chave)
    const cadastur = texto(body.cadastur || body.cadasturNumero || body.cadastur_numero)

    if (!userId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'ID do guia não informado.'
        },
        { status: 400 }
      )
    }

    const { data: usuarioAtual, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (userError) {
      throw userError
    }

    if (!usuarioAtual?.id) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Guia não encontrado.'
        },
        { status: 404 }
      )
    }

    const tipoUsuario = normalizar(usuarioAtual.tipo)

    if (tipoUsuario !== 'guia') {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Este usuário não está cadastrado como guia.'
        },
        { status: 403 }
      )
    }

    const statusAtual = normalizar(usuarioAtual.cadastur_status)

    const jaVerificado = Boolean(
      usuarioAtual.cadastur_verificado ||
        usuarioAtual.guia_verificado_cadastur ||
        statusAtual === 'verificado' ||
        statusAtual === 'ativo'
    )

    const payload: AnyRecord = {
      pix_tipo: pixTipo || null,
      pix_chave: pixChave || null,

      cadastur: cadastur || null,
      cadastur_numero: cadastur || null,
      cadastur_status: cadastur
        ? jaVerificado
          ? usuarioAtual.cadastur_status || 'verificado'
          : 'informado'
        : null,
      cadastur_informado_em: cadastur
        ? usuarioAtual.cadastur_informado_em || new Date().toISOString()
        : null,

      updated_at: new Date().toISOString()
    }

    const usuarioAtualizado = await atualizarUsuarioComFallback({
      supabase,
      userId,
      payloadOriginal: payload
    })

    return NextResponse.json({
      sucesso: true,
      mensagem: cadastur
        ? 'Dados do guia atualizados. CADASTUR aguardando conferência administrativa.'
        : 'Dados do guia atualizados.',
      usuario: usuarioAtualizado
    })
  } catch (error: any) {
    console.error('Erro em POST /api/guia/perfil/salvar-dados:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      body: {
        ...body,
        pixChave: body?.pixChave ? '[oculta]' : undefined,
        pix_chave: body?.pix_chave ? '[oculta]' : undefined
      }
    })

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error?.message ||
          'Erro interno ao salvar dados do guia.'
      },
      { status: 500 }
    )
  }
}