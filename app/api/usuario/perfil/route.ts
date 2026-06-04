import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  ''

function json(data: AnyRecord, status = 200) {
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

function somenteNumeros(valor?: unknown) {
  return String(valor || '').replace(/\D/g, '')
}

function telefoneValido(valor?: unknown) {
  const telefone = somenteNumeros(valor)
  return !telefone || telefone.length === 10 || telefone.length === 11
}

function formatarTelefone(valor?: unknown) {
  const telefone = somenteNumeros(valor).slice(0, 11)

  if (telefone.length <= 2) return telefone
  if (telefone.length <= 6) return `(${telefone.slice(0, 2)}) ${telefone.slice(2)}`
  if (telefone.length <= 10) return `(${telefone.slice(0, 2)}) ${telefone.slice(2, 6)}-${telefone.slice(6)}`

  return `(${telefone.slice(0, 2)}) ${telefone.slice(2, 7)}-${telefone.slice(7)}`
}

function erroDeColunaAusente(error: AnyRecord | null | undefined) {
  const texto = String(error?.message || error?.details || error?.hint || '').toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    texto.includes('could not find') ||
    texto.includes('schema cache') ||
    texto.includes('column')
  )
}

function extrairColunaAusente(error: AnyRecord | null | undefined) {
  const texto = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ')

  const matchAspas = texto.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  const matchColumn = texto.match(/column\s+([a-zA-Z0-9_]+)/i)
  if (matchColumn?.[1]) return matchColumn[1]

  return ''
}

async function atualizarUsuarioComFallback(
  supabase: any,
  userId: string,
  payloadOriginal: AnyRecord
) {
  let payloadAtual = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 14; tentativa++) {
    const { data, error } = await supabase
      .from('users')
      .update(payloadAtual)
      .eq('id', userId)
      .select('*')
      .maybeSingle()

    if (!error) return data || payloadAtual

    if (!erroDeColunaAusente(error as AnyRecord)) {
      throw error
    }

    const coluna = extrairColunaAusente(error as AnyRecord)

    if (!coluna || !(coluna in payloadAtual)) {
      throw error
    }

    delete payloadAtual[coluna]
  }

  throw new Error('Não foi possível atualizar o perfil após ajustar colunas.')
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))

    const userId = String(
      body?.userId ||
        body?.usuarioId ||
        body?.usuario_id ||
        body?.id ||
        ''
    ).trim()

    if (!userId) {
      return json({ sucesso: false, erro: 'ID do usuário não informado.' }, 400)
    }

    const nome = String(body?.nome || '').trim()
    const telefoneLimpo = somenteNumeros(
      body?.telefone ||
        body?.celular ||
        body?.whatsapp ||
        ''
    )

    if (!nome) {
      return json({ sucesso: false, erro: 'Nome não informado.' }, 400)
    }

    if (!telefoneValido(telefoneLimpo)) {
      return json({ sucesso: false, erro: 'Telefone inválido.' }, 400)
    }

    const payload: AnyRecord = {
      nome,
      updated_at: new Date().toISOString()
    }

    if (telefoneLimpo) {
      payload.telefone = telefoneLimpo
      payload.celular = telefoneLimpo
      payload.whatsapp = telefoneLimpo
      payload.telefone_formatado = formatarTelefone(telefoneLimpo)
      payload.celular_formatado = formatarTelefone(telefoneLimpo)
    }

    const supabase = getSupabaseAdmin()
    const usuario = await atualizarUsuarioComFallback(supabase, userId, payload)

    return json({
      sucesso: true,
      nome: usuario?.nome || nome,
      telefone: usuario?.telefone || usuario?.celular || telefoneLimpo || '',
      usuario
    })
  } catch (error: any) {
    console.error('Erro em /api/usuario/perfil:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao salvar perfil.'
      },
      500
    )
  }
}
