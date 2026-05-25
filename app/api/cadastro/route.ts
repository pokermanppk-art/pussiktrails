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
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY ausente no ambiente. Sem ela, o cadastro cai no bloqueio RLS da tabela users.'
    )
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

function somenteNumeros(valor: any) {
  return String(valor || '').replace(/\D/g, '')
}

function emailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function normalizarTipo(tipo: any) {
  const valor = limparTexto(tipo).toLowerCase()

  if (valor === 'guia') return 'guia'
  if (valor === 'admin') return 'admin'

  return 'cliente'
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

async function inserirUsuarioComFallback(
  supabase: any,
  payloadOriginal: Record<string, any>
) {
  let payloadAtual = { ...payloadOriginal }
  const colunasIgnoradas: string[] = []

  for (let tentativa = 0; tentativa < 15; tentativa++) {
    const { data, error } = await supabase
      .from('users')
      .insert(payloadAtual)
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

  throw new Error('Não foi possível cadastrar usuário.')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const nome = limparTexto(body.nome || body.name)
    const email = limparTexto(body.email).toLowerCase()
    const telefone = limparTexto(body.telefone || body.celular || body.phone)
    const cpf = somenteNumeros(body.cpf)
    const dataNascimento = limparTexto(
      body.data_nascimento ||
        body.dataNascimento ||
        body.nascimento
    )
    const senha = limparTexto(body.senha || body.password)
    const confirmarSenha = limparTexto(
      body.confirmar_senha ||
        body.confirmarSenha ||
        body.confirmPassword
    )
    const tipo = normalizarTipo(body.tipo)

    if (!nome) {
      return json(
        {
          sucesso: false,
          origem: 'api-cadastro-service-role',
          erro: 'Informe o nome.'
        },
        400
      )
    }

    if (!email || !emailValido(email)) {
      return json(
        {
          sucesso: false,
          origem: 'api-cadastro-service-role',
          erro: 'Informe um e-mail válido.'
        },
        400
      )
    }

    if (!telefone) {
      return json(
        {
          sucesso: false,
          origem: 'api-cadastro-service-role',
          erro: 'Informe o celular.'
        },
        400
      )
    }

    if (!cpf || cpf.length !== 11) {
      return json(
        {
          sucesso: false,
          origem: 'api-cadastro-service-role',
          erro: 'Informe um CPF válido.'
        },
        400
      )
    }

    if (!dataNascimento) {
      return json(
        {
          sucesso: false,
          origem: 'api-cadastro-service-role',
          erro: 'Informe a data de nascimento.'
        },
        400
      )
    }

    if (!senha || senha.length < 6) {
      return json(
        {
          sucesso: false,
          origem: 'api-cadastro-service-role',
          erro: 'A senha deve ter pelo menos 6 caracteres.'
        },
        400
      )
    }

    if (senha !== confirmarSenha) {
      return json(
        {
          sucesso: false,
          origem: 'api-cadastro-service-role',
          erro: 'As senhas não conferem.'
        },
        400
      )
    }

    const { data: usuarioExistente, error: buscaError } = await supabase
      .from('users')
      .select('id, email, cpf')
      .or(`email.eq.${email},cpf.eq.${cpf}`)
      .maybeSingle()

    if (buscaError) {
      console.warn('Erro ao verificar usuário existente:', buscaError)
    }

    if (usuarioExistente) {
      return json(
        {
          sucesso: false,
          origem: 'api-cadastro-service-role',
          erro: 'Já existe uma conta cadastrada com este e-mail ou CPF.'
        },
        409
      )
    }

    const payload: Record<string, any> = {
      nome,
      name: nome,
      email,
      telefone,
      celular: telefone,
      cpf,
      data_nascimento: dataNascimento,
      nascimento: dataNascimento,
      senha,
      password: senha,
      tipo,
      status: 'ativo',
      ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const resultado = await inserirUsuarioComFallback(supabase, payload)

    if (!resultado.data?.id) {
      return json(
        {
          sucesso: false,
          origem: 'api-cadastro-service-role',
          erro: 'Usuário não foi criado corretamente.'
        },
        500
      )
    }

    return json({
      sucesso: true,
      origem: 'api-cadastro-service-role',
      mensagem: 'Cadastro realizado com sucesso.',
      usuario: {
        id: resultado.data.id,
        nome: resultado.data.nome || resultado.data.name || nome,
        email: resultado.data.email || email,
        tipo: resultado.data.tipo || tipo
      },
      colunasIgnoradas: resultado.colunasIgnoradas
    })
  } catch (error: any) {
    console.error('Erro no cadastro:', error)

    return json(
      {
        sucesso: false,
        origem: 'api-cadastro-service-role',
        erro: error?.message || 'Erro interno ao cadastrar usuário.'
      },
      500
    )
  }
}

export async function GET() {
  return json({
    sucesso: true,
    origem: 'api-cadastro-service-role',
    rota: '/api/cadastro',
    metodo: 'POST',
    mensagem: 'Rota de cadastro ativa.'
  })
}