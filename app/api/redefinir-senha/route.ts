import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

function getSupabaseAdmin(): any {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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

function hashToken(token: string) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex')
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
    error?.hint,
  ]
    .filter(Boolean)
    .join(' ')

  const matchUsers = textoErro.match(/users\.([a-zA-Z0-9_]+)/)

  if (matchUsers?.[1]) return matchUsers[1]

  const matchReset = textoErro.match(/senha_reset_tokens\.([a-zA-Z0-9_]+)/)

  if (matchReset?.[1]) return matchReset[1]

  const matchColumn = textoErro.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i)

  if (matchColumn?.[1]) return matchColumn[1]

  const matchAspas = textoErro.match(/'([^']+)'/)

  if (matchAspas?.[1]) return matchAspas[1]

  return ''
}

async function buscarTokenAtivo(params: {
  supabase: any
  tokenHash: string
}) {
  const { supabase, tokenHash } = params

  const { data, error } = await supabase
    .from('senha_reset_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('status', 'ativo')
    .limit(1)

  if (error) {
    console.error('[redefinir-senha] Erro ao buscar token:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    })

    throw new Error(
      'Não foi possível validar o link de recuperação. Verifique a tabela senha_reset_tokens.'
    )
  }

  if (Array.isArray(data) && data[0]?.id) {
    return data[0] as AnyRecord
  }

  return null
}

async function atualizarTokenComFallback(params: {
  supabase: any
  tokenId: string
  payloadOriginal: AnyRecord
}) {
  const { supabase, tokenId } = params
  let payload: AnyRecord = { ...params.payloadOriginal }

  for (let tentativa = 0; tentativa < 10; tentativa++) {
    const { error } = await supabase
      .from('senha_reset_tokens')
      .update(payload)
      .eq('id', tokenId)

    if (!error) return

    if (!erroColunaInexistente(error)) {
      console.warn('[redefinir-senha] Erro ao atualizar token:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      })

      return
    }

    const coluna = extrairColunaInexistente(error)

    if (!coluna || !(coluna in payload)) {
      console.warn('[redefinir-senha] Erro de coluna no token sem fallback:', {
        coluna,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      })

      return
    }

    delete payload[coluna]
  }
}

async function atualizarUsuarioComFallback(params: {
  supabase: any
  userId: string
  senhaHash: string
  senhaTexto: string
}) {
  const { supabase, userId, senhaHash, senhaTexto } = params

  let payload: AnyRecord = {
    senha_hash: senhaHash,
    senha: null,
    updated_at: new Date().toISOString(),
  }

  let ultimaMensagem = ''

  for (let tentativa = 0; tentativa < 12; tentativa++) {
    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', userId)
      .select('id')
      .limit(1)

    if (!error) {
      if (Array.isArray(data) && data[0]?.id) {
        return data[0] as AnyRecord
      }

      return { id: userId }
    }

    ultimaMensagem = error?.message || 'Erro desconhecido ao atualizar senha.'

    if (!erroColunaInexistente(error)) {
      console.error('[redefinir-senha] Erro ao atualizar usuário:', {
        userId,
        payloadKeys: Object.keys(payload),
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      })

      throw new Error(error?.message || 'Erro ao atualizar a senha do usuário.')
    }

    const coluna = extrairColunaInexistente(error)

    if (!coluna || !(coluna in payload)) {
      console.error('[redefinir-senha] Coluna ausente não mapeada no update:', {
        coluna,
        payloadKeys: Object.keys(payload),
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      })

      throw new Error(error?.message || 'Erro de estrutura ao atualizar senha.')
    }

    delete payload[coluna]

    console.warn('[redefinir-senha] Coluna removida do UPDATE por não existir:', coluna)

    if (!('senha_hash' in payload) && !('senha' in payload)) {
      payload = {
        senha: senhaTexto,
      }
    }

    if (Object.keys(payload).length === 0) {
      throw new Error('Nenhuma coluna disponível para salvar a nova senha.')
    }
  }

  throw new Error(ultimaMensagem || 'Não foi possível atualizar a senha.')
}

export async function POST(request: Request) {
  let body: AnyRecord = {}

  try {
    const supabase = getSupabaseAdmin()

    body = await request.json().catch(() => ({}))

    const token = texto(body.token)
    const senha = texto(body.senha || body.password)
    const confirmarSenha = texto(
      body.confirmar_senha ||
        body.confirmarSenha ||
        body.confirmacaoSenha
    )

    if (!token) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Token de recuperação ausente.',
        },
        { status: 400 }
      )
    }

    if (!senha || senha.length < 6) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'A nova senha deve ter pelo menos 6 caracteres.',
        },
        { status: 400 }
      )
    }

    if (confirmarSenha && senha !== confirmarSenha) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'As senhas não conferem.',
        },
        { status: 400 }
      )
    }

    const tokenHash = hashToken(token)

    const tokenRow = await buscarTokenAtivo({
      supabase,
      tokenHash,
    })

    if (!tokenRow?.id) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Link inválido ou já utilizado. Solicite uma nova recuperação de senha.',
        },
        { status: 400 }
      )
    }

    const expiresAtMs = new Date(tokenRow.expires_at || '').getTime()

    if (!expiresAtMs || Number.isNaN(expiresAtMs) || expiresAtMs < Date.now()) {
      await atualizarTokenComFallback({
        supabase,
        tokenId: tokenRow.id,
        payloadOriginal: {
          status: 'expirado',
          used_at: new Date().toISOString(),
        },
      })

      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Este link expirou. Solicite uma nova recuperação de senha.',
        },
        { status: 400 }
      )
    }

    if (!tokenRow.user_id) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Token inválido: usuário não vinculado.',
        },
        { status: 400 }
      )
    }

    const senhaHash = await bcrypt.hash(senha, 10)

    await atualizarUsuarioComFallback({
      supabase,
      userId: tokenRow.user_id,
      senhaHash,
      senhaTexto: senha,
    })

    await atualizarTokenComFallback({
      supabase,
      tokenId: tokenRow.id,
      payloadOriginal: {
        status: 'usado',
        used_at: new Date().toISOString(),
      },
    })

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Senha redefinida com sucesso.',
    })
  } catch (error: any) {
    console.error('Erro em POST /api/redefinir-senha:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack,
      body: {
        ...body,
        token: body?.token ? '[presente]' : undefined,
        senha: body?.senha ? '[oculta]' : undefined,
        password: body?.password ? '[oculta]' : undefined,
        confirmar_senha: body?.confirmar_senha ? '[oculta]' : undefined,
        confirmarSenha: body?.confirmarSenha ? '[oculta]' : undefined,
      },
    })

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error?.message ||
          'Erro interno ao redefinir senha.',
      },
      { status: 500 }
    )
  }
}