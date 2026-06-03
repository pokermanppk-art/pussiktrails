import { NextRequest, NextResponse } from 'next/server'
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

function limparTexto(valor: unknown) {
  return String(valor || '').trim()
}

function normalizarTipo(valor: unknown) {
  const tipo = String(valor || '').toLowerCase().trim()
  return tipo === 'guia' ? 'guia' : 'cliente'
}

function cortarTexto(valor: unknown, limite = 120) {
  const texto = limparTexto(valor).replace(/\s+/g, ' ')
  if (texto.length <= limite) return texto
  return `${texto.slice(0, limite - 1).trim()}…`
}

function erroDeColunaAusente(error: unknown) {
  const err = error as { code?: string; message?: string; details?: string; hint?: string }
  const texto = String(err?.message || err?.details || err?.hint || '').toLowerCase()

  return (
    err?.code === '42703' ||
    err?.code === 'PGRST204' ||
    texto.includes('does not exist') ||
    texto.includes('could not find') ||
    texto.includes('schema cache') ||
    texto.includes('column')
  )
}

function extrairColunaAusente(error: unknown, colunas: string[]) {
  const err = error as { message?: string; details?: string; hint?: string }
  const texto = [err?.message, err?.details, err?.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  for (const coluna of colunas) {
    if (texto.includes(coluna.toLowerCase())) return coluna
  }

  return ''
}

async function buscarUsuariosComFallback(params: {
  q: string
  excludeId: string
}) {
  const supabase = getSupabaseAdmin()

  // Importante: NÃO incluir "nivel" aqui.
  // A tabela users do projeto atual não possui users.nivel.
  // O nível público do cliente deve ser calculado futuramente por KM/medalhas,
  // não lido diretamente da tabela users.
  let colunas = [
    'id',
    'nome',
    'tipo',
    'avatar_url',
    'foto_url',
    'imagem_url',
    'bio',
    'cadastur',
    'created_at'
  ]

  for (let tentativa = 0; tentativa < 10; tentativa++) {
    let query = supabase
      .from('users')
      .select(colunas.join(','))
      .in('tipo', ['cliente', 'guia'])
      .ilike('nome', `%${params.q}%`)
      .order('nome', { ascending: true })
      .limit(12)

    if (params.excludeId) {
      query = query.neq('id', params.excludeId)
    }

    const { data, error } = await query

    if (!error) return (data || []) as AnyRecord[]

    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error, colunas)

    if (!coluna) {
      throw error
    }

    colunas = colunas.filter((item) => item !== coluna)
  }

  throw new Error('Não foi possível buscar comunidade após ajustar colunas disponíveis.')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = limparTexto(searchParams.get('q')).slice(0, 80)
    const excludeId = limparTexto(searchParams.get('excludeId') || searchParams.get('usuarioId'))

    if (q.length < 2) {
      return json({
        sucesso: true,
        resultados: []
      })
    }

    const usuarios = await buscarUsuariosComFallback({ q, excludeId })

    const resultados = usuarios
      .filter((usuario) => limparTexto(usuario.id) && limparTexto(usuario.nome))
      .map((usuario) => {
        const tipo = normalizarTipo(usuario.tipo)
        const avatar =
          limparTexto(usuario.avatar_url) ||
          limparTexto(usuario.foto_url) ||
          limparTexto(usuario.imagem_url) ||
          ''

        return {
          id: String(usuario.id),
          nome: limparTexto(usuario.nome),
          tipo,
          avatar_url: avatar,
          bio: cortarTexto(usuario.bio, 110),
          cadastur: tipo === 'guia' ? limparTexto(usuario.cadastur) : '',
          nivel: '',
          rota: tipo === 'guia' ? `/guia/publico/${usuario.id}` : `/cliente/publico/${usuario.id}`
        }
      })

    return json({
      sucesso: true,
      resultados
    })
  } catch (error: any) {
    console.error('Erro em /api/comunidade/buscar:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao buscar comunidade.'
      },
      500
    )
  }
}
