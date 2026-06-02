import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

type InsertResult = {
  data: AnyRecord | null
  colunasIgnoradas: string[]
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''

function json(data: AnyRecord, status = 200) {
  return NextResponse.json(data, { status })
}

function getSupabaseAdmin() {
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ausente no ambiente.')
  }

  if (!supabaseServiceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY ausente no ambiente. Sem ela, o cadastro pode cair no bloqueio RLS da tabela users.'
    )
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

function limparTexto(valor: unknown) {
  return String(valor || '').trim()
}

function somenteNumeros(valor: unknown) {
  return String(valor || '').replace(/\D/g, '')
}

function emailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function normalizarTipo(tipo: unknown) {
  const valor = limparTexto(tipo).toLowerCase()

  if (valor === 'guia') return 'guia'
  if (valor === 'admin') return 'admin'

  return 'cliente'
}

function dataValida(data: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false

  const parsed = new Date(`${data}T12:00:00`)

  if (Number.isNaN(parsed.getTime())) return false

  const [ano, mes, dia] = data.split('-').map(Number)

  return (
    parsed.getFullYear() === ano &&
    parsed.getMonth() + 1 === mes &&
    parsed.getDate() === dia
  )
}

function idadeEmAnos(dataNascimento: string) {
  const nascimento = new Date(`${dataNascimento}T12:00:00`)

  if (Number.isNaN(nascimento.getTime())) return 0

  const hoje = new Date()
  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const mes = hoje.getMonth() - nascimento.getMonth()

  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--
  }

  return idade
}

function cpfValido(cpfEntrada: string) {
  const cpf = somenteNumeros(cpfEntrada)

  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  let soma = 0

  for (let i = 0; i < 9; i++) {
    soma += Number(cpf.charAt(i)) * (10 - i)
  }

  let digito = 11 - (soma % 11)
  if (digito >= 10) digito = 0

  if (digito !== Number(cpf.charAt(9))) return false

  soma = 0

  for (let i = 0; i < 10; i++) {
    soma += Number(cpf.charAt(i)) * (11 - i)
  }

  digito = 11 - (soma % 11)
  if (digito >= 10) digito = 0

  return digito === Number(cpf.charAt(10))
}

function telefoneValido(telefone: string) {
  const numeros = somenteNumeros(telefone)
  return numeros.length >= 10 && numeros.length <= 13
}

function mascararDocumento(documento: string) {
  const numeros = somenteNumeros(documento)

  if (numeros.length === 11) {
    return `***.***.***-${numeros.slice(-2)}`
  }

  if (numeros.length === 14) {
    return `**.***.***/****-${numeros.slice(-2)}`
  }

  return 'documento informado'
}

function extrairColunaAusente(error: any) {
  const texto = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')

  const matchUsers = texto.match(/users\.([a-zA-Z0-9_]+)/)
  if (matchUsers?.[1]) return matchUsers[1]

  const matchAspas = texto.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  const matchColumn = texto.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i)
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
    texto.includes('column') ||
    texto.includes('does not exist')
  )
}

function erroDuplicidade(error: any) {
  const texto = String(error?.message || error?.details || '').toLowerCase()
  return error?.code === '23505' || texto.includes('duplicate key') || texto.includes('already exists')
}

async function inserirUsuarioComFallback(
  supabase: any,
  payloadOriginal: AnyRecord
): Promise<InsertResult> {
  let payloadAtual = { ...payloadOriginal }
  const colunasIgnoradas: string[] = []

  for (let tentativa = 0; tentativa < 22; tentativa++) {
    const { data, error } = await supabase
      .from('users')
      .insert(payloadAtual)
      .select('*')
      .maybeSingle()

    if (!error) {
      return {
        data,
        colunasIgnoradas
      }
    }

    if (erroDuplicidade(error)) {
      throw new Error('Já existe uma conta cadastrada com este e-mail ou CPF.')
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

    if (Object.keys(payloadAtual).length === 0) {
      throw new Error('Nenhuma coluna compatível encontrada para cadastrar usuário.')
    }
  }

  throw new Error('Não foi possível cadastrar usuário.')
}

async function verificarUsuarioExistente(params: {
  supabase: any
  email: string
  cpf: string
}) {
  const { supabase, email, cpf } = params

  const { data: usuarioPorEmail, error: emailError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email)
    .maybeSingle()

  if (emailError && !erroDeColunaAusente(emailError)) {
    console.warn('[cadastro] Erro ao verificar e-mail existente:', emailError)
  }

  if (usuarioPorEmail?.id) return usuarioPorEmail

  const documentosParaTestar = ['cpf', 'cpf_cnpj', 'documento']

  for (const coluna of documentosParaTestar) {
    const { data, error } = await supabase
      .from('users')
      .select(`id, email, ${coluna}`)
      .eq(coluna, cpf)
      .maybeSingle()

    if (error) {
      if (erroDeColunaAusente(error)) continue
      console.warn(`[cadastro] Erro ao verificar documento existente pela coluna ${coluna}:`, error)
      continue
    }

    if (data?.id) return data
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const nome = limparTexto(body.nome || body.name || body.nome_completo || body.nomeCompleto)
    const email = limparTexto(body.email).toLowerCase()
    const telefone = somenteNumeros(body.telefone || body.celular || body.whatsapp || body.phone)
    const telefoneFormatado = limparTexto(
      body.telefone_formatado ||
        body.telefoneFormatado ||
        body.celular_formatado ||
        body.celularFormatado ||
        body.telefone ||
        body.celular ||
        body.whatsapp ||
        body.phone
    )
    const cpf = somenteNumeros(body.cpf || body.cpf_cnpj || body.cpfCnpj || body.documento)
    const cpfFormatado = limparTexto(body.cpf_formatado || body.cpfFormatado || body.cpf || body.cpf_cnpj || body.documento)
    const dataNascimento = limparTexto(
      body.data_nascimento ||
        body.dataNascimento ||
        body.nascimento ||
        body.data_de_nascimento
    )
    const senha = limparTexto(body.senha || body.password)
    const confirmarSenha = limparTexto(
      body.confirmar_senha ||
        body.confirmarSenha ||
        body.confirmPassword ||
        body.senhaConfirmacao
    )
    const tipo = normalizarTipo(body.tipo)
    const termosAceitos = Boolean(
      body.termos_aceitos ??
        body.termosAceitos ??
        body.aceite_termos ??
        body.aceiteTermos ??
        true
    )

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

    if (!telefone || !telefoneValido(telefone)) {
      return json(
        {
          sucesso: false,
          origem: 'api-cadastro-service-role',
          erro: 'Informe um celular válido com DDD.'
        },
        400
      )
    }

    if (!cpf || !cpfValido(cpf)) {
      return json(
        {
          sucesso: false,
          origem: 'api-cadastro-service-role',
          erro: 'Informe um CPF válido.'
        },
        400
      )
    }

    if (!dataNascimento || !dataValida(dataNascimento)) {
      return json(
        {
          sucesso: false,
          origem: 'api-cadastro-service-role',
          erro: 'Informe uma data de nascimento válida.'
        },
        400
      )
    }

    if (idadeEmAnos(dataNascimento) < 18) {
      return json(
        {
          sucesso: false,
          origem: 'api-cadastro-service-role',
          erro: 'O cadastro é permitido apenas para maiores de 18 anos.'
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

    if (!termosAceitos) {
      return json(
        {
          sucesso: false,
          origem: 'api-cadastro-service-role',
          erro: 'É necessário aceitar os termos para continuar.'
        },
        400
      )
    }

    const usuarioExistente = await verificarUsuarioExistente({ supabase, email, cpf })

    if (usuarioExistente?.id) {
      return json(
        {
          sucesso: false,
          origem: 'api-cadastro-service-role',
          erro: 'Já existe uma conta cadastrada com este e-mail ou CPF.'
        },
        409
      )
    }

    const agora = new Date().toISOString()

    const payload: AnyRecord = {
      nome,
      name: nome,
      nome_completo: nome,
      email,
      telefone,
      telefone_formatado: telefoneFormatado || telefone,
      celular: telefone,
      celular_formatado: telefoneFormatado || telefone,
      whatsapp: telefone,
      cpf,
      cpf_cnpj: cpf,
      documento: cpf,
      cpf_formatado: cpfFormatado || cpf,
      data_nascimento: dataNascimento,
      nascimento: dataNascimento,
      data_de_nascimento: dataNascimento,
      senha,
      password: senha,
      tipo,
      status: 'ativo',
      ativo: true,
      termos_aceitos: true,
      termos_aceitos_em: agora,
      aceite_termos: true,
      aceite_termos_em: agora,
      created_at: agora,
      updated_at: agora
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

    const documentoSalvo =
      somenteNumeros(resultado.data.cpf) ||
      somenteNumeros(resultado.data.cpf_cnpj) ||
      somenteNumeros(resultado.data.documento) ||
      ''

    if (!documentoSalvo) {
      console.error('[cadastro] Usuário criado sem coluna de documento compatível. Verifique users.cpf/cpf_cnpj/documento.', {
        userId: resultado.data.id,
        colunasIgnoradas: resultado.colunasIgnoradas
      })
    }

    const telefoneSalvo =
      somenteNumeros(resultado.data.telefone) ||
      somenteNumeros(resultado.data.celular) ||
      somenteNumeros(resultado.data.whatsapp) ||
      telefone

    return json({
      sucesso: true,
      origem: 'api-cadastro-service-role',
      mensagem: 'Cadastro realizado com sucesso.',
      usuario: {
        id: resultado.data.id,
        nome: resultado.data.nome || resultado.data.name || nome,
        email: resultado.data.email || email,
        tipo: resultado.data.tipo || tipo,
        cpf: documentoSalvo || cpf,
        cpf_cnpj: documentoSalvo || cpf,
        documento: documentoSalvo || cpf,
        cpf_mascarado: mascararDocumento(documentoSalvo || cpf),
        telefone: telefoneSalvo,
        celular: telefoneSalvo,
        data_nascimento: resultado.data.data_nascimento || resultado.data.nascimento || dataNascimento,
        avatar_url: resultado.data.avatar_url || resultado.data.foto_url || resultado.data.imagem_url || null,
        foto_url: resultado.data.foto_url || resultado.data.avatar_url || resultado.data.imagem_url || null,
        imagem_url: resultado.data.imagem_url || resultado.data.avatar_url || resultado.data.foto_url || null
      },
      colunasIgnoradas: resultado.colunasIgnoradas
    })
  } catch (error: any) {
    console.error('Erro no cadastro:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint
    })

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
    mensagem: 'Rota de cadastro ativa. Use POST para cadastrar cliente ou guia com CPF e telefone compatíveis com PagHiper.'
  })
}
