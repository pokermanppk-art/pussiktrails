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
  const texto = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')

  const matchAspas = texto.match(/'([^']+)'/)

  if (matchAspas?.[1]) return matchAspas[1]

  const matchColumn = texto.match(/column\s+([a-zA-Z0-9_]+)/i)

  if (matchColumn?.[1]) return matchColumn[1]

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

  for (let tentativa = 0; tentativa < 10; tentativa++) {
    const { data, error } = await supabase
      .from('users')
      .update(payloadAtual)
      .eq('id', userId)
      .select()
      .maybeSingle()

    if (!error) {
      return data
    }

    if (!erroDeColunaAusente(error)) {
      throw error
    }

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payloadAtual)) {
      throw error
    }

    delete payloadAtual[coluna]
  }

  throw new Error('Não foi possível atualizar a senha.')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const userId = limparTexto(body.userId || body.user_id || body.id)
    const senhaAtual = limparTexto(body.senhaAtual || body.senha_atual)
    const novaSenha = limparTexto(body.novaSenha || body.nova_senha || body.senha)
    const confirmarSenha = limparTexto(
      body.confirmarSenha ||
        body.confirmar_senha ||
        body.confirmacao
    )

    if (!userId) {
      return json(
        {
          sucesso: false,
          erro: 'Usuário não identificado.'
        },
        400
      )
    }

    if (!senhaAtual) {
      return json(
        {
          sucesso: false,
          erro: 'Informe sua senha atual.'
        },
        400
      )
    }

    if (!novaSenha || novaSenha.length < 6) {
      return json(
        {
          sucesso: false,
          erro: 'A nova senha deve ter pelo menos 6 caracteres.'
        },
        400
      )
    }

    if (novaSenha !== confirmarSenha) {
      return json(
        {
          sucesso: false,
          erro: 'A confirmação da nova senha não confere.'
        },
        400
      )
    }

    if (senhaAtual === novaSenha) {
      return json(
        {
          sucesso: false,
          erro: 'A nova senha precisa ser diferente da senha atual.'
        },
        400
      )
    }

    const { data: usuario, error: usuarioError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (usuarioError) {
      throw usuarioError
    }

    if (!usuario) {
      return json(
        {
          sucesso: false,
          erro: 'Usuário não encontrado.'
        },
        404
      )
    }

    const senhaBanco = limparTexto(usuario.senha || usuario.password)

    if (senhaBanco !== senhaAtual) {
      return json(
        {
          sucesso: false,
          erro: 'Senha atual incorreta.'
        },
        401
      )
    }

    await atualizarUsuarioComFallback(supabase, userId, {
      senha: novaSenha,
      password: novaSenha,
      updated_at: new Date().toISOString()
    })

    return json({
      sucesso: true,
      mensagem: 'Senha alterada com sucesso.'
    })
  } catch (error: any) {
    console.error('Erro ao alterar senha:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao alterar senha.'
      },
      500
    )
  }
}

export async function GET() {
  return json({
    sucesso: true,
    rota: '/api/alterar-senha',
    metodo: 'POST',
    mensagem: 'Rota de alteração de senha ativa.'
  })
}