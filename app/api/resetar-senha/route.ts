import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function getSupabaseAdmin() {
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ausente no ambiente.')
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente no ambiente.')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

function limparTexto(valor: any) {
  return String(valor || '').trim()
}

function extrairColunaAusente(error: any) {
  const texto = [
    error?.message,
    error?.details,
    error?.hint
  ]
    .filter(Boolean)
    .join(' ')

  const matchAspas = texto.match(/'([^']+)'/)

  if (matchAspas?.[1]) {
    return matchAspas[1]
  }

  const matchColumn = texto.match(/column\s+([a-zA-Z0-9_]+)/i)

  if (matchColumn?.[1]) {
    return matchColumn[1]
  }

  return ''
}

function erroDeColunaAusente(error: any) {
  const texto = String(
    error?.message ||
      error?.details ||
      error?.hint ||
      ''
  ).toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    texto.includes('could not find') ||
    texto.includes('schema cache') ||
    texto.includes('column')
  )
}

async function atualizarUsuarioComFallback(
  supabase: any,
  userId: string,
  payloadOriginal: Record<string, any>
) {
  let payloadAtual = { ...payloadOriginal }
  const colunasIgnoradas: string[] = []

  for (let tentativa = 0; tentativa < 10; tentativa++) {
    const { data, error } = await supabase
      .from('users')
      .update(payloadAtual)
      .eq('id', userId)
      .select()
      .maybeSingle()

    if (!error) {
      return {
        data,
        colunasIgnoradas
      }
    }

    if (!erroDeColunaAusente(error)) {
      throw error
    }

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payloadAtual)) {
      throw error
    }

    delete payloadAtual[coluna]
    colunasIgnoradas.push(coluna)
  }

  throw new Error('Não foi possível atualizar a senha.')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const token = limparTexto(body.token)
    const senha = limparTexto(body.senha || body.password)
    const confirmarSenha = limparTexto(
      body.confirmar_senha ||
        body.confirmarSenha ||
        body.confirmPassword
    )

    if (!token) {
      return json(
        {
          sucesso: false,
          erro: 'Token de recuperação ausente.'
        },
        400
      )
    }

    if (!senha || senha.length < 6) {
      return json(
        {
          sucesso: false,
          erro: 'A nova senha deve ter pelo menos 6 caracteres.'
        },
        400
      )
    }

    if (senha !== confirmarSenha) {
      return json(
        {
          sucesso: false,
          erro: 'As senhas não conferem.'
        },
        400
      )
    }

    const { data: usuario, error: usuarioError } = await supabase
      .from('users')
      .select('*')
      .eq('reset_token', token)
      .maybeSingle()

    if (usuarioError) {
      throw usuarioError
    }

    if (!usuario) {
      return json(
        {
          sucesso: false,
          erro: 'Link de recuperação inválido ou expirado.'
        },
        400
      )
    }

    const expiraEm = usuario.reset_token_expires_at
      ? new Date(usuario.reset_token_expires_at).getTime()
      : 0

    if (!expiraEm || expiraEm < Date.now()) {
      return json(
        {
          sucesso: false,
          erro: 'Link de recuperação expirado. Solicite uma nova recuperação.'
        },
        400
      )
    }

    await atualizarUsuarioComFallback(supabase, usuario.id, {
      senha,
      password: senha,
      reset_token: null,
      reset_token_expires_at: null,
      updated_at: new Date().toISOString()
    })

    return json({
      sucesso: true,
      mensagem: 'Senha atualizada com sucesso.'
    })
  } catch (error: any) {
    console.error('Erro ao resetar senha:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao atualizar senha.'
      },
      500
    )
  }
}

export async function GET() {
  return json({
    sucesso: true,
    rota: '/api/resetar-senha',
    metodo: 'POST',
    mensagem: 'Rota de redefinição de senha ativa.'
  })
}