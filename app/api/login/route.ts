import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

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

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function limparCpf(valor: unknown) {
  return texto(valor).replace(/\D/g, '')
}

async function senhaConfere(senhaDigitada: string, user: AnyRecord) {
  const senhaHash = texto(user.senha_hash)
  const senhaAntiga = texto(user.senha || user.password)

  if (!senhaDigitada) return false

  if (senhaHash) {
    const pareceBcrypt =
      senhaHash.startsWith('$2a$') ||
      senhaHash.startsWith('$2b$') ||
      senhaHash.startsWith('$2y$')

    if (pareceBcrypt) {
      try {
        return await bcrypt.compare(senhaDigitada, senhaHash)
      } catch {
        return false
      }
    }

    return senhaHash === senhaDigitada
  }

  if (senhaAntiga) {
    return senhaAntiga === senhaDigitada
  }

  return false
}

function rotaPorTipo(tipo: string, redirectAfterLogin?: string) {
  const tipoNormalizado = normalizar(tipo)

  if (
    redirectAfterLogin &&
    redirectAfterLogin.startsWith('/') &&
    !redirectAfterLogin.startsWith('/admin') &&
    !redirectAfterLogin.startsWith('/api') &&
    !redirectAfterLogin.startsWith('//')
  ) {
    if (tipoNormalizado === 'cliente') return redirectAfterLogin
    if (tipoNormalizado === 'guia' && redirectAfterLogin.startsWith('/roteiros')) return redirectAfterLogin
  }

  if (tipoNormalizado === 'admin') return '/admin/dashboard'
  if (tipoNormalizado === 'guia') return '/guia/dashboard'

  return '/cliente/dashboard'
}

export async function POST(request: Request) {
  let body: AnyRecord = {}

  try {
    const supabase = getSupabaseAdmin()
    body = await request.json().catch(() => ({}))

    const login = texto(body.login || body.email || body.cpf)
    const senha = texto(body.senha || body.password)
    const redirectAfterLogin = texto(body.redirectAfterLogin)

    if (!login) {
      return NextResponse.json(
        { sucesso: false, erro: 'Informe e-mail ou CPF.' },
        { status: 400 }
      )
    }

    if (!senha) {
      return NextResponse.json(
        { sucesso: false, erro: 'Informe sua senha.' },
        { status: 400 }
      )
    }

    const cpfLimpo = limparCpf(login)
    const ehCpf = cpfLimpo.length === 11
    const email = normalizar(login)

    let query = supabase
      .from('users')
      .select(`
        id,
        nome,
        name,
        email,
        cpf,
        tipo,
        status,
        ativo,
        avatar_url,
        foto_url,
        imagem_url,
        senha_hash,
        senha,
        password
      `)
      .limit(1)

    if (ehCpf) {
      query = query.eq('cpf', cpfLimpo)
    } else {
      query = query.eq('email', email)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('Erro em POST /api/login:', error)

      return NextResponse.json(
        { sucesso: false, erro: 'Erro ao acessar sua conta.' },
        { status: 500 }
      )
    }

    if (!data?.id) {
      return NextResponse.json(
        { sucesso: false, erro: 'Usuário ou senha inválidos.' },
        { status: 401 }
      )
    }

    const user = data as AnyRecord
    const status = normalizar(user.status)

    if (
      status === 'pendente' ||
      status === 'aguardando' ||
      status === 'aguardando_aprovacao'
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Seu cadastro está pendente de aprovação.',
        },
        { status: 403 }
      )
    }

    if (
      status === 'inativo' ||
      status === 'suspenso' ||
      status === 'bloqueado' ||
      user.ativo === false
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Sua conta está inativa. Entre em contato com o suporte.',
        },
        { status: 403 }
      )
    }

    const senhaValida = await senhaConfere(senha, user)

    if (!senhaValida) {
      return NextResponse.json(
        { sucesso: false, erro: 'Usuário ou senha inválidos.' },
        { status: 401 }
      )
    }

    const tipo = normalizar(user.tipo || 'cliente') || 'cliente'
    const usuarioLocal = {
      id: user.id,
      nome: user.nome || user.name || user.email || 'Usuário',
      email: user.email || '',
      tipo,
      avatar_url: user.avatar_url || null,
      foto_url: user.foto_url || null,
      imagem_url: user.imagem_url || null,
    }

    return NextResponse.json({
      sucesso: true,
      user: usuarioLocal,
      redirectTo: rotaPorTipo(tipo, redirectAfterLogin),
    })
  } catch (error: any) {
    console.error('Erro interno em POST /api/login:', {
      message: error?.message,
      stack: error?.stack,
      body,
    })

    return NextResponse.json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao fazer login.',
      },
      { status: 500 }
    )
  }
}