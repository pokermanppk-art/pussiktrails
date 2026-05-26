import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

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

function extrairId(valor: unknown) {
  return String(valor || '').trim()
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

async function atualizarRoteiroComFallback(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  roteiroId: string,
  payloadOriginal: Record<string, any>
) {
  let payloadAtual = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 12; tentativa++) {
    if (Object.keys(payloadAtual).length === 0) {
      throw new Error('Nenhuma coluna disponível para atualizar o roteiro.')
    }

    const { data, error } = await supabase
      .from('roteiros')
      .update(payloadAtual)
      .eq('id', roteiroId)
      .select('*')
      .maybeSingle()

    if (!error) return data

    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payloadAtual)) throw error

    delete payloadAtual[coluna]
  }

  throw new Error('Não foi possível atualizar o roteiro após ajustar colunas.')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()

    const roteiroId = extrairId(body.roteiroId || body.roteiro_id)
    const guiaId = extrairId(body.guiaId || body.guia_id || body.userId || body.user_id)

    if (!roteiroId) {
      return NextResponse.json(
        { sucesso: false, erro: 'roteiroId é obrigatório.' },
        { status: 400 }
      )
    }

    if (!guiaId) {
      return NextResponse.json(
        { sucesso: false, erro: 'guiaId é obrigatório.' },
        { status: 400 }
      )
    }

    const { data: roteiro, error: roteiroError } = await supabase
      .from('roteiros')
      .select('*')
      .eq('id', roteiroId)
      .maybeSingle()

    if (roteiroError) throw roteiroError

    if (!roteiro) {
      return NextResponse.json(
        { sucesso: false, erro: 'Roteiro não encontrado.' },
        { status: 404 }
      )
    }

    const donoRoteiro = String(
      roteiro.id_guia ||
        roteiro.guia_id ||
        roteiro.user_id ||
        roteiro.usuario_id ||
        ''
    ).trim()

    if (donoRoteiro && donoRoteiro !== guiaId) {
      return NextResponse.json(
        { sucesso: false, erro: 'Este roteiro não pertence ao guia logado.' },
        { status: 403 }
      )
    }

    const atualizado = await atualizarRoteiroComFallback(supabase, roteiroId, {
      status: 'excluido',
      ativo: false,
      excluido_em: new Date().toISOString(),
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({
      sucesso: true,
      roteiro: atualizado,
    })
  } catch (error) {
    console.error('Erro em /api/guia/roteiros/excluir:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao excluir roteiro.',
      },
      { status: 500 }
    )
  }
}