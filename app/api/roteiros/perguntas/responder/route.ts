import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

function getSupabaseAdmin(): any {
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

function guiaIdDoRoteiro(roteiro: AnyRecord | null) {
  if (!roteiro) return ''

  return texto(
    roteiro.id_guia ||
      roteiro.guia_id ||
      roteiro.id_user ||
      roteiro.usuario_id ||
      roteiro.criador_id ||
      roteiro.created_by ||
      roteiro.user_id
  )
}

function erroDeColunaAusente(error: any) {
  const mensagem = String(
    error?.message ||
      error?.details ||
      error?.hint ||
      ''
  ).toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    mensagem.includes('could not find') ||
    mensagem.includes('schema cache') ||
    mensagem.includes('column')
  )
}

function extrairColunaAusente(error: any) {
  const mensagem = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')

  const matchAspas = mensagem.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  const matchColumn = mensagem.match(/column\s+([a-zA-Z0-9_]+)/i)
  if (matchColumn?.[1]) return matchColumn[1]

  return ''
}

async function atualizarComFallback(params: {
  supabase: any
  tabela: string
  id: string
  payloadOriginal: AnyRecord
}) {
  const { supabase, tabela, id } = params
  let payload: AnyRecord = { ...params.payloadOriginal }

  for (let tentativa = 0; tentativa < 16; tentativa++) {
    const { data, error } = await supabase
      .from(tabela)
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (!error) return data as AnyRecord | null

    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payload)) throw error

    delete payload[coluna]
  }

  throw new Error(`Não foi possível atualizar ${tabela} após ajustar colunas.`)
}

export async function GET() {
  return NextResponse.json({
    sucesso: true,
    rota: '/api/roteiros/perguntas/responder',
    mensagem: 'Rota ativa. Use POST para responder uma pergunta.',
  })
}

export async function POST(request: NextRequest) {
  let recebido: AnyRecord = {}

  try {
    const supabase = getSupabaseAdmin()
    recebido = await request.json().catch(() => ({}))

    const perguntaId = texto(recebido.perguntaId || recebido.pergunta_id || recebido.id)
    const roteiroId = texto(recebido.roteiroId || recebido.roteiro_id)
    const guiaId = texto(recebido.guiaId || recebido.guia_id || recebido.usuarioId || recebido.usuario_id)
    const resposta = texto(recebido.resposta)

    if (!perguntaId) {
      return NextResponse.json(
        { sucesso: false, erro: 'perguntaId é obrigatório.', recebido },
        { status: 400 }
      )
    }

    if (!guiaId) {
      return NextResponse.json(
        { sucesso: false, erro: 'guiaId é obrigatório.', recebido },
        { status: 400 }
      )
    }

    if (!resposta || resposta.length < 3) {
      return NextResponse.json(
        { sucesso: false, erro: 'A resposta precisa ter pelo menos 3 caracteres.', recebido },
        { status: 400 }
      )
    }

    const { data: pergunta, error: perguntaError } = await supabase
      .from('roteiro_perguntas')
      .select('*')
      .eq('id', perguntaId)
      .maybeSingle()

    if (perguntaError) throw perguntaError

    if (!pergunta?.id) {
      return NextResponse.json(
        { sucesso: false, erro: 'Pergunta não encontrada.', recebido },
        { status: 404 }
      )
    }

    if (roteiroId && String(pergunta.roteiro_id) !== roteiroId) {
      return NextResponse.json(
        { sucesso: false, erro: 'A pergunta não pertence ao roteiro informado.', recebido },
        { status: 403 }
      )
    }

    const { data: roteiro, error: roteiroError } = await supabase
      .from('roteiros')
      .select('*')
      .eq('id', pergunta.roteiro_id)
      .maybeSingle()

    if (roteiroError) throw roteiroError

    const guiaDono = guiaIdDoRoteiro(roteiro)

    if (!guiaDono || guiaDono !== guiaId) {
      return NextResponse.json(
        { sucesso: false, erro: 'Apenas o guia responsável pelo roteiro pode responder esta pergunta.', recebido },
        { status: 403 }
      )
    }

    const statusAtual = normalizar(pergunta.status)

    if (statusAtual === 'removida' || statusAtual === 'arquivada') {
      return NextResponse.json(
        { sucesso: false, erro: 'Esta pergunta não pode mais ser respondida.', recebido },
        { status: 409 }
      )
    }

    const agora = new Date().toISOString()

    const atualizada = await atualizarComFallback({
      supabase,
      tabela: 'roteiro_perguntas',
      id: perguntaId,
      payloadOriginal: {
        resposta,
        respondido_por: guiaId,
        respondido_em: agora,
        updated_at: agora,
        status: 'respondida',
        metadata: {
          ...(pergunta.metadata || {}),
          respondida_por_guia: true,
          respondida_em: agora,
        },
      },
    })

    return NextResponse.json({
      sucesso: true,
      pergunta: atualizada,
      mensagem: 'Resposta publicada no roteiro.',
    })
  } catch (error: any) {
    console.error('Erro em POST /api/roteiros/perguntas/responder:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack,
      recebido,
      raw: error,
    })

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error?.message ||
          'Erro ao responder pergunta do roteiro.',
        detalhe: {
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          message: error?.message,
        },
        recebido,
      },
      { status: 500 }
    )
  }
}
