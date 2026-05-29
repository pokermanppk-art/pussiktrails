import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

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

function getSupabaseAdmin(): any {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Variáveis SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configuradas.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
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
    mensagem.includes('does not exist') ||
    mensagem.includes('could not find')
  )
}

function erroCheckConstraint(error: any) {
  const mensagem = String(
    error?.message ||
      error?.details ||
      error?.hint ||
      ''
  ).toLowerCase()

  return (
    error?.code === '23514' ||
    mensagem.includes('check constraint') ||
    mensagem.includes('violates check')
  )
}

function extrairColunaInexistente(error: any) {
  const textoErro = [
    error?.message,
    error?.details,
    error?.hint
  ]
    .filter(Boolean)
    .join(' ')

  const matchRoteiros = textoErro.match(/roteiros\.([a-zA-Z0-9_]+)/)

  if (matchRoteiros?.[1]) return matchRoteiros[1]

  const matchColumn = textoErro.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i)

  if (matchColumn?.[1]) return matchColumn[1]

  const matchAspas = textoErro.match(/'([^']+)'/)

  if (matchAspas?.[1]) return matchAspas[1]

  return ''
}

function guiaIdDoRoteiro(roteiro: AnyRecord) {
  return texto(
    roteiro.id_guia ||
      roteiro.guia_id ||
      roteiro.user_id ||
      roteiro.usuario_id ||
      roteiro.id_user ||
      roteiro.criador_id ||
      roteiro.created_by
  )
}

function montarDataHora(data: string, hora: string) {
  const dataLimpa = texto(data)
  const horaLimpa = texto(hora)

  if (!dataLimpa) return ''

  if (!horaLimpa) return dataLimpa

  return `${dataLimpa}T${horaLimpa}:00`
}

async function atualizarRoteiroComFallback(params: {
  supabase: any
  roteiroId: string
  payloadOriginal: AnyRecord
}) {
  const { supabase, roteiroId } = params
  let payload: AnyRecord = { ...params.payloadOriginal }

  for (let tentativa = 0; tentativa < 20; tentativa++) {
    const { data, error } = await supabase
      .from('roteiros')
      .update(payload)
      .eq('id', roteiroId)
      .select('*')
      .maybeSingle()

    if (!error) return data as AnyRecord | null

    if (!erroColunaInexistente(error)) {
      throw error
    }

    const coluna = extrairColunaInexistente(error)

    if (!coluna || !(coluna in payload)) {
      throw error
    }

    delete payload[coluna]

    if (Object.keys(payload).length === 0) {
      throw new Error('Nenhuma coluna disponível para atualizar o roteiro.')
    }
  }

  throw new Error('Não foi possível atualizar o roteiro.')
}

async function atualizarComStatusPermitido(params: {
  supabase: any
  roteiroId: string
  payloadBase: AnyRecord
}) {
  const { supabase, roteiroId, payloadBase } = params

  const statusTentativas = [
    'pendente_aprovacao',
    'aguardando_aprovacao',
    'em_analise',
    'pendente',
    'rascunho'
  ]

  let ultimoErro: any = null

  for (const status of statusTentativas) {
    try {
      return await atualizarRoteiroComFallback({
        supabase,
        roteiroId,
        payloadOriginal: {
          ...payloadBase,
          status
        }
      })
    } catch (error: any) {
      ultimoErro = error

      if (!erroCheckConstraint(error)) {
        throw error
      }
    }
  }

  throw ultimoErro || new Error('Nenhum status de aprovação foi aceito pelo banco.')
}

export async function POST(request: Request) {
  let body: AnyRecord = {}

  try {
    const supabase = getSupabaseAdmin()
    body = await request.json().catch(() => ({}))

    const roteiroId = texto(body.roteiroId || body.roteiro_id || body.id)
    const guiaId = texto(body.guiaId || body.guia_id || body.userId || body.user_id)

    const novaData = texto(body.data || body.dataTrilha || body.data_trilha || body.proxima_data)
    const novaHora = texto(body.hora || body.horaTrilha || body.hora_trilha)
    const dataHora = montarDataHora(novaData, novaHora)

    const embarqueLocal = texto(body.embarqueLocal || body.embarque_local || body.localEncontro || body.local_encontro)
    const observacao = texto(body.observacao || body.mensagem || body.justificativa)

    if (!roteiroId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'ID do roteiro não informado.'
        },
        { status: 400 }
      )
    }

    if (!guiaId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'ID do guia não informado.'
        },
        { status: 400 }
      )
    }

    if (!novaData) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Informe a nova data do roteiro.'
        },
        { status: 400 }
      )
    }

    const { data: roteiroAtual, error: roteiroError } = await supabase
      .from('roteiros')
      .select('*')
      .eq('id', roteiroId)
      .maybeSingle()

    if (roteiroError) {
      throw roteiroError
    }

    if (!roteiroAtual?.id) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Roteiro não encontrado.'
        },
        { status: 404 }
      )
    }

    const donoRoteiro = guiaIdDoRoteiro(roteiroAtual)

    if (donoRoteiro && donoRoteiro !== guiaId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Este roteiro não pertence ao guia informado.'
        },
        { status: 403 }
      )
    }

    const payloadBase: AnyRecord = {
      ativo: false,

      proxima_data: dataHora || novaData,
      data_trilha: dataHora || novaData,
      data_roteiro: dataHora || novaData,
      embarque_data: novaData,
      embarque_data_hora: dataHora || novaData,

      embarque_local: embarqueLocal || roteiroAtual.embarque_local || roteiroAtual.local_encontro || roteiroAtual.ponto_encontro || null,
      local_encontro: embarqueLocal || roteiroAtual.local_encontro || roteiroAtual.embarque_local || roteiroAtual.ponto_encontro || null,
      ponto_encontro: embarqueLocal || roteiroAtual.ponto_encontro || roteiroAtual.embarque_local || roteiroAtual.local_encontro || null,

      solicitacao_ativacao_em: new Date().toISOString(),
      solicitado_ativacao_em: new Date().toISOString(),
      revisao_solicitada_em: new Date().toISOString(),
      enviado_para_aprovacao_em: new Date().toISOString(),

      observacao_guia: observacao || null,
      observacao_aprovacao: observacao || null,

      updated_at: new Date().toISOString()
    }

    const atualizado = await atualizarComStatusPermitido({
      supabase,
      roteiroId,
      payloadBase
    })

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Roteiro atualizado e reenviado para aprovação.',
      roteiro: atualizado
    })
  } catch (error: any) {
    console.error('Erro em POST /api/guia/roteiros/solicitar-aprovacao:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      body
    })

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error?.message ||
          'Erro interno ao solicitar aprovação do roteiro.'
      },
      { status: 500 }
    )
  }
}