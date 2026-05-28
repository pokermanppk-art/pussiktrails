import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

const CAMPOS_USUARIO_BASE = [
  'id',
  'nome',
  'email',
  'cpf',
  'tipo',
  'status',
  'ativo',
  'avatar_url',
  'foto_url',
  'imagem_url',
  'senha_hash',
  'senha',
]

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

function formatarCPF(valor: unknown) {
  const numeros = limparCpf(valor).slice(0, 11)

  if (numeros.length <= 3) return numeros

  if (numeros.length <= 6) {
    return `${numeros.slice(0, 3)}.${numeros.slice(3)}`
  }

  if (numeros.length <= 9) {
    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`
  }

  return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9, 11)}`
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
    mensagem.includes('does not exist')
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

  const matchColumn = textoErro.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i)

  if (matchColumn?.[1]) return matchColumn[1]

  const matchAspas = textoErro.match(/'([^']+)'/)

  if (matchAspas?.[1]) return matchAspas[1]

  return ''
}

async function executarBuscaUsuariosComFallback(params: {
  supabase: any
  aplicarFiltros: (query: any) => any
  limite?: number
}) {
  const { supabase, aplicarFiltros, limite = 1 } = params

  let campos = [...CAMPOS_USUARIO_BASE]

  for (let tentativa = 0; tentativa < 18; tentativa++) {
    const select = campos.join(', ')

    let query = supabase
      .from('users')
      .select(select)

    query = aplicarFiltros(query)

    if (limite > 0) {
      query = query.limit(limite)
    }

    const { data, error } = await query

    if (!error) {
      return Array.isArray(data) ? (data as AnyRecord[]) : []
    }

    if (!erroColunaInexistente(error)) {
      console.warn('[login] Erro ao buscar usuário:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      })

      return []
    }

    const coluna = extrairColunaInexistente(error)

    if (!coluna) {
      console.warn('[login] Erro de coluna sem identificação:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      })

      return []
    }

    campos = campos.filter((campo) => campo !== coluna)

    console.warn('[login] Coluna removida do SELECT por não existir:', coluna)

    if (campos.length === 0) {
      return []
    }
  }

  return []
}

async function senhaConfere(senhaDigitada: string, user: AnyRecord) {
  const senhaHash = texto(user.senha_hash)
  const senhaAntiga = texto(user.senha)

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

    if (
      tipoNormalizado === 'guia' &&
      redirectAfterLogin.startsWith('/roteiros')
    ) {
      return redirectAfterLogin
    }
  }

  if (tipoNormalizado === 'admin') return '/admin/dashboard'
  if (tipoNormalizado === 'guia') return '/guia/dashboard'

  return '/cliente/dashboard'
}

async function buscarUsuarioPorCpfExato(supabase: any, cpfValor: string) {
  const cpf = texto(cpfValor)

  if (!cpf) return null

  const usuarios = await executarBuscaUsuariosComFallback({
    supabase,
    limite: 1,
    aplicarFiltros: (query) => query.eq('cpf', cpf),
  })

  if (usuarios[0]?.id) {
    return usuarios[0]
  }

  return null
}

async function buscarUsuarioPorCpfNormalizado(supabase: any, cpfEntrada: string) {
  const cpfLimpo = limparCpf(cpfEntrada)

  if (cpfLimpo.length !== 11) return null

  const cpfFormatado = formatarCPF(cpfLimpo)
  const cpfOriginal = texto(cpfEntrada)

  const tentativas = Array.from(
    new Set([
      cpfLimpo,
      cpfFormatado,
      cpfOriginal,
      cpfOriginal.replace(/\s/g, ''),
    ].filter(Boolean))
  )

  for (const tentativa of tentativas) {
    const encontrado = await buscarUsuarioPorCpfExato(supabase, tentativa)

    if (encontrado?.id) {
      return encontrado
    }
  }

  const usuarios = await executarBuscaUsuariosComFallback({
    supabase,
    limite: 5000,
    aplicarFiltros: (query) => query.not('cpf', 'is', null),
  })

  const encontrado = usuarios.find((usuario: AnyRecord) => {
    return limparCpf(usuario.cpf) === cpfLimpo
  })

  return encontrado?.id ? encontrado : null
}

async function buscarUsuarioPorEmail(supabase: any, emailEntrada: string) {
  const email = normalizar(emailEntrada)

  if (!email || !email.includes('@')) return null

  const usuarios = await executarBuscaUsuariosComFallback({
    supabase,
    limite: 1,
    aplicarFiltros: (query) => query.ilike('email', email),
  })

  if (usuarios[0]?.id) {
    return usuarios[0]
  }

  return null
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
        {
          sucesso: false,
          erro: 'Informe e-mail ou CPF.',
        },
        { status: 400 }
      )
    }

    if (!senha) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Informe sua senha.',
        },
        { status: 400 }
      )
    }

    const cpfLimpo = limparCpf(login)
    const contemArroba = login.includes('@')
    const pareceCpf = cpfLimpo.length === 11 && !contemArroba

    let user: AnyRecord | null = null

    if (pareceCpf) {
      user = await buscarUsuarioPorCpfNormalizado(supabase, login)
    } else {
      user = await buscarUsuarioPorEmail(supabase, login)
    }

    if (!user?.id) {
      console.warn('[login] Usuário não encontrado pelo login informado:', {
        tipoBusca: pareceCpf ? 'cpf' : 'email',
        loginMascarado: pareceCpf
          ? `${cpfLimpo.slice(0, 3)}.***.***-${cpfLimpo.slice(9, 11)}`
          : normalizar(login),
      })

      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Usuário ou senha inválidos.',
        },
        { status: 401 }
      )
    }

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
      console.warn('[login] Senha inválida para usuário encontrado:', {
        userId: user.id,
        tipo: user.tipo,
        cpf: user.cpf ? `${limparCpf(user.cpf).slice(0, 3)}.***.***-${limparCpf(user.cpf).slice(9, 11)}` : null,
      })

      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Usuário ou senha inválidos.',
        },
        { status: 401 }
      )
    }

    const tipo = normalizar(user.tipo || 'cliente') || 'cliente'

    const usuarioLocal = {
      id: user.id,
      nome: user.nome || user.email || 'Usuário',
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
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack,
      body: {
        ...body,
        senha: body?.senha ? '[oculta]' : undefined,
        password: body?.password ? '[oculta]' : undefined,
      },
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