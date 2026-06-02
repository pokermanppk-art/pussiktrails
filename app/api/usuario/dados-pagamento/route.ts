import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function somenteNumeros(valor: unknown) {
  return texto(valor).replace(/\D/g, '')
}

function validarCpf(valor: unknown) {
  const cpf = somenteNumeros(valor)

  if (cpf.length !== 11) return false
  if (/^(\d)\1+$/.test(cpf)) return false

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

function formatarCpf(valor: unknown) {
  const cpf = somenteNumeros(valor).slice(0, 11)

  if (cpf.length <= 3) return cpf
  if (cpf.length <= 6) return `${cpf.slice(0, 3)}.${cpf.slice(3)}`
  if (cpf.length <= 9) return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`

  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`
}

function mascararCpf(valor: unknown) {
  const cpf = somenteNumeros(valor)
  if (cpf.length !== 11) return ''
  return `***.***.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`
}

function telefoneValido(valor: unknown) {
  const telefone = somenteNumeros(valor)
  return telefone.length === 10 || telefone.length === 11
}

function formatarTelefone(valor: unknown) {
  const telefone = somenteNumeros(valor).slice(0, 11)

  if (telefone.length <= 2) return telefone
  if (telefone.length <= 6) return `(${telefone.slice(0, 2)}) ${telefone.slice(2)}`
  if (telefone.length <= 10) return `(${telefone.slice(0, 2)}) ${telefone.slice(2, 6)}-${telefone.slice(6)}`

  return `(${telefone.slice(0, 2)}) ${telefone.slice(2, 7)}-${telefone.slice(7)}`
}

function getSupabaseAdmin(): any {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Variáveis do Supabase não configuradas.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

function erroColunaAusente(error: any) {
  const mensagem = String(error?.message || error?.details || error?.hint || '').toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    mensagem.includes('column') ||
    mensagem.includes('schema cache') ||
    mensagem.includes('does not exist') ||
    mensagem.includes('could not find')
  )
}

function extrairColunaAusente(error: any) {
  const textoErro = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ')

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

  for (let tentativa = 0; tentativa < 20; tentativa++) {
    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', userId)
      .select('*')
      .maybeSingle()

    if (!error) return data as AnyRecord | null

    if (!erroColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payload)) throw error

    delete payload[coluna]

    if (Object.keys(payload).length === 0) {
      throw new Error('Nenhuma coluna disponível para atualizar os dados de pagamento.')
    }
  }

  throw new Error('Não foi possível atualizar os dados de pagamento.')
}

function normalizarUsuario(usuario: AnyRecord | null, cpfInformado = '', telefoneInformado = '') {
  const cpf = somenteNumeros(usuario?.cpf || usuario?.cpf_cnpj || usuario?.documento || cpfInformado)
  const telefone = somenteNumeros(usuario?.telefone || usuario?.celular || usuario?.whatsapp || telefoneInformado)

  return {
    id: usuario?.id || '',
    nome: usuario?.nome || '',
    email: usuario?.email || '',
    tipo: usuario?.tipo || '',
    cpf,
    cpf_cnpj: cpf,
    documento: cpf,
    cpf_formatado: formatarCpf(cpf),
    cpf_mascarado: mascararCpf(cpf),
    telefone,
    celular: telefone,
    whatsapp: telefone,
    telefone_formatado: formatarTelefone(telefone),
    celular_formatado: formatarTelefone(telefone)
  }
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const userId = texto(
      searchParams.get('userId') ||
        searchParams.get('usuarioId') ||
        searchParams.get('usuario_id') ||
        searchParams.get('id')
    )

    if (!userId) {
      return NextResponse.json(
        { sucesso: false, erro: 'ID do usuário não informado.' },
        { status: 400 }
      )
    }

    const { data: usuario, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw error

    if (!usuario?.id) {
      return NextResponse.json(
        { sucesso: false, erro: 'Usuário não encontrado.' },
        { status: 404 }
      )
    }

    const usuarioNormalizado = normalizarUsuario(usuario)

    return NextResponse.json({
      sucesso: true,
      usuario: usuarioNormalizado,
      cpf: usuarioNormalizado.cpf,
      cpf_formatado: usuarioNormalizado.cpf_formatado,
      cpf_mascarado: usuarioNormalizado.cpf_mascarado,
      telefone: usuarioNormalizado.telefone,
      telefone_formatado: usuarioNormalizado.telefone_formatado
    })
  } catch (error: any) {
    console.error('Erro em GET /api/usuario/dados-pagamento:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint
    })

    return NextResponse.json(
      { sucesso: false, erro: error?.message || 'Erro ao carregar dados de pagamento.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  let body: AnyRecord = {}

  try {
    const supabase = getSupabaseAdmin()
    body = await request.json().catch(() => ({}))

    const userId = texto(body.userId || body.usuarioId || body.usuario_id || body.id)
    const tipoUsuario = texto(body.tipoUsuario || body.tipo || 'cliente').toLowerCase()
    const cpf = somenteNumeros(body.cpf || body.cpf_cnpj || body.documento)
    const telefone = somenteNumeros(body.telefone || body.celular || body.whatsapp)

    if (!userId) {
      return NextResponse.json(
        { sucesso: false, erro: 'ID do usuário não informado.' },
        { status: 400 }
      )
    }

    if (tipoUsuario && !['cliente', 'guia', 'admin'].includes(tipoUsuario)) {
      return NextResponse.json(
        { sucesso: false, erro: 'Tipo de usuário inválido.' },
        { status: 400 }
      )
    }

    if (!validarCpf(cpf)) {
      return NextResponse.json(
        { sucesso: false, erro: 'CPF inválido. Informe um CPF válido para gerar PIX.' },
        { status: 422 }
      )
    }

    if (!telefoneValido(telefone)) {
      return NextResponse.json(
        { sucesso: false, erro: 'Telefone inválido. Informe um telefone com DDD.' },
        { status: 422 }
      )
    }

    const { data: usuarioExistente, error: usuarioError } = await supabase
      .from('users')
      .select('id, tipo')
      .eq('id', userId)
      .maybeSingle()

    if (usuarioError) throw usuarioError

    if (!usuarioExistente?.id) {
      return NextResponse.json(
        { sucesso: false, erro: 'Usuário não encontrado.' },
        { status: 404 }
      )
    }

    const tipoBanco = texto(usuarioExistente.tipo).toLowerCase()

    if (tipoUsuario && tipoBanco && tipoBanco !== tipoUsuario) {
      return NextResponse.json(
        { sucesso: false, erro: 'Tipo de usuário não corresponde ao cadastro.' },
        { status: 403 }
      )
    }

    const payload: AnyRecord = {
      cpf,
      cpf_cnpj: cpf,
      documento: cpf,
      cpf_formatado: formatarCpf(cpf),
      telefone,
      telefone_formatado: formatarTelefone(telefone),
      celular: telefone,
      celular_formatado: formatarTelefone(telefone),
      whatsapp: telefone,
      updated_at: new Date().toISOString()
    }

    const usuarioAtualizado = await atualizarUsuarioComFallback({
      supabase,
      userId,
      payloadOriginal: payload
    })

    const usuarioNormalizado = normalizarUsuario(usuarioAtualizado, cpf, telefone)

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Dados de pagamento atualizados com sucesso.',
      usuario: usuarioNormalizado,
      cpf: usuarioNormalizado.cpf,
      cpf_formatado: usuarioNormalizado.cpf_formatado,
      cpf_mascarado: usuarioNormalizado.cpf_mascarado,
      telefone: usuarioNormalizado.telefone,
      telefone_formatado: usuarioNormalizado.telefone_formatado
    })
  } catch (error: any) {
    console.error('Erro em POST /api/usuario/dados-pagamento:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      userId: body?.userId || body?.usuarioId || body?.usuario_id || null
    })

    return NextResponse.json(
      { sucesso: false, erro: error?.message || 'Erro ao salvar dados de pagamento.' },
      { status: 500 }
    )
  }
}
