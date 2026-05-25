import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const STATUS_VALIDOS = [
  'publicada',
  'pendente_moderacao',
  'oculta',
  'removida'
]

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

function normalizar(valor: any) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function uuidValido(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
    valor
  )
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

async function buscarAdmin(supabase: any, adminId: string) {
  if (!adminId || !uuidValido(adminId)) return null

  const { data, error } = await supabase
    .from('users')
    .select('id, nome, name, email, tipo')
    .eq('id', adminId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

async function buscarAvaliacao(supabase: any, avaliacaoId: string) {
  const { data, error } = await supabase
    .from('avaliacoes')
    .select('*')
    .eq('id', avaliacaoId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

async function atualizarAvaliacaoComFallback(
  supabase: any,
  avaliacaoId: string,
  payloadOriginal: Record<string, any>
) {
  let payloadAtual = { ...payloadOriginal }
  const colunasIgnoradas: string[] = []

  for (let tentativa = 0; tentativa < 20; tentativa++) {
    const { data, error } = await supabase
      .from('avaliacoes')
      .update(payloadAtual)
      .eq('id', avaliacaoId)
      .select('*')
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

  throw new Error('Não foi possível atualizar a avaliação.')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const adminId = limparTexto(
      body.adminId ||
        body.admin_id ||
        body.usuarioId ||
        body.usuario_id
    )

    const avaliacaoId = limparTexto(
      body.avaliacaoId ||
        body.avaliacao_id ||
        body.id
    )

    const novoStatus = normalizar(
      body.status ||
        body.novoStatus ||
        body.novo_status
    )

    const motivo = limparTexto(
      body.motivo ||
        body.motivoModeracao ||
        body.motivo_moderacao ||
        body.observacao
    )

    if (!adminId || !uuidValido(adminId)) {
      return json(
        {
          sucesso: false,
          erro: 'Informe o adminId válido.'
        },
        400
      )
    }

    if (!avaliacaoId || !uuidValido(avaliacaoId)) {
      return json(
        {
          sucesso: false,
          erro: 'Informe uma avaliação válida.'
        },
        400
      )
    }

    if (!novoStatus || !STATUS_VALIDOS.includes(novoStatus)) {
      return json(
        {
          sucesso: false,
          erro: 'Status inválido para avaliação.',
          statusValidos: STATUS_VALIDOS
        },
        400
      )
    }

    const admin = await buscarAdmin(supabase, adminId)

    if (!admin?.id || admin.tipo !== 'admin') {
      return json(
        {
          sucesso: false,
          erro: 'Usuário não autorizado para moderar avaliações.'
        },
        403
      )
    }

    const avaliacao = await buscarAvaliacao(supabase, avaliacaoId)

    if (!avaliacao?.id) {
      return json(
        {
          sucesso: false,
          erro: 'Avaliação não encontrada.'
        },
        404
      )
    }

    const agora = new Date().toISOString()

    const payload: Record<string, any> = {
      status: novoStatus,
      motivo_moderacao: motivo || null,
      moderado_por: adminId,
      moderado_em: agora,
      updated_at: agora
    }

    const resultado = await atualizarAvaliacaoComFallback(
      supabase,
      avaliacaoId,
      payload
    )

    return json({
      sucesso: true,
      mensagem: 'Avaliação moderada com sucesso.',
      avaliacao: {
        id: resultado.data?.id || avaliacaoId,
        status_anterior: avaliacao.status || null,
        status_atual: resultado.data?.status || novoStatus,
        motivo_moderacao: resultado.data?.motivo_moderacao || motivo || null,
        moderado_por: adminId,
        moderado_em: resultado.data?.moderado_em || agora
      },
      colunasIgnoradas: resultado.colunasIgnoradas
    })
  } catch (error: any) {
    console.error('Erro em /api/avaliacoes/moderar:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao moderar avaliação.'
      },
      500
    )
  }
}

export async function GET() {
  return json({
    sucesso: true,
    rota: '/api/avaliacoes/moderar',
    metodo: 'POST',
    mensagem:
      'Rota ativa. Envie adminId, avaliacaoId, status e motivo opcional.',
    statusValidos: STATUS_VALIDOS
  })
}