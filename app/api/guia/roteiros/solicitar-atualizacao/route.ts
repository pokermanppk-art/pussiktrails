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

function numeroOuNull(valor: unknown) {
  if (valor === undefined || valor === null || valor === '') return null

  const numero = Number(valor)

  if (!Number.isFinite(numero) || numero < 0) return null

  return numero
}

function getSupabaseAdmin(): any {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Variáveis do Supabase não configuradas.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function guiaIdDoRoteiro(roteiro: AnyRecord) {
  return texto(
    roteiro.id_guia ||
      roteiro.guia_id ||
      roteiro.user_id ||
      roteiro.usuario_id ||
      roteiro.id_user ||
      roteiro.criador_id ||
      roteiro.created_by ||
      roteiro.owner_id
  )
}

function tituloDoRoteiro(roteiro: AnyRecord) {
  return texto(roteiro.titulo || roteiro.nome || roteiro.nome_roteiro)
}

function descricaoDoRoteiro(roteiro: AnyRecord) {
  return texto(
    roteiro.descricao ||
      roteiro.roteiro_detalhado ||
      roteiro.detalhes ||
      roteiro.descricao_roteiro
  )
}

function dataAtualDoRoteiro(roteiro: AnyRecord) {
  return texto(
    roteiro.embarque_data ||
      roteiro.data_roteiro ||
      roteiro.data_trilha ||
      roteiro.proxima_data ||
      roteiro.embarque_data_hora ||
      roteiro.data ||
      roteiro.data_evento
  )
}

function horaAtualDoRoteiro(roteiro: AnyRecord) {
  return texto(
    roteiro.hora_trilha ||
      roteiro.hora ||
      roteiro.hora_roteiro ||
      roteiro.horario ||
      roteiro.horario_saida
  )
}

function localAtualDoRoteiro(roteiro: AnyRecord) {
  return texto(
    roteiro.local ||
      roteiro.localizacao ||
      roteiro.embarque_local ||
      roteiro.local_encontro ||
      roteiro.ponto_encontro ||
      roteiro.cidade ||
      roteiro.destino
  )
}

function precoAtualDoRoteiro(roteiro: AnyRecord) {
  const preco =
    roteiro.preco ??
    roteiro.valor ??
    roteiro.preco_total ??
    roteiro.preco_por_pessoa ??
    null

  const numero = Number(preco)

  return Number.isFinite(numero) ? numero : null
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

function extrairColunaInexistente(error: any) {
  const textoErro = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')

  const matchTabela = textoErro.match(/roteiros_solicitacoes_atualizacao\.([a-zA-Z0-9_]+)/)

  if (matchTabela?.[1]) return matchTabela[1]

  const matchColumn = textoErro.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i)

  if (matchColumn?.[1]) return matchColumn[1]

  const matchAspas = textoErro.match(/'([^']+)'/)

  if (matchAspas?.[1]) return matchAspas[1]

  return ''
}

async function inserirSolicitacaoComFallback(params: {
  supabase: any
  payloadOriginal: AnyRecord
}) {
  const { supabase } = params
  let payload: AnyRecord = { ...params.payloadOriginal }

  for (let tentativa = 0; tentativa < 20; tentativa++) {
    const { data, error } = await supabase
      .from('roteiros_solicitacoes_atualizacao')
      .insert(payload)
      .select('*')
      .maybeSingle()

    if (!error) return data as AnyRecord | null

    if (!erroColunaInexistente(error)) {
      console.error('[guia/roteiros/solicitar-atualizacao] Erro ao inserir solicitação:', {
        payloadKeys: Object.keys(payload),
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      })

      throw error
    }

    const coluna = extrairColunaInexistente(error)

    if (!coluna || !(coluna in payload)) {
      console.error('[guia/roteiros/solicitar-atualizacao] Coluna ausente não identificada:', {
        coluna,
        payloadKeys: Object.keys(payload),
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      })

      throw error
    }

    delete payload[coluna]

    if (Object.keys(payload).length === 0) {
      throw new Error('Nenhuma coluna disponível para registrar a solicitação.')
    }
  }

  throw new Error('Não foi possível registrar a solicitação de atualização.')
}

export async function POST(request: Request) {
  let body: AnyRecord = {}

  try {
    const supabase = getSupabaseAdmin()
    body = await request.json().catch(() => ({}))

    const roteiroId = texto(body.roteiroId || body.roteiro_id || body.id)
    const guiaId = texto(body.guiaId || body.guia_id || body.userId || body.user_id)

    const tituloSolicitado = texto(body.titulo || body.tituloSolicitado || body.titulo_solicitado)
    const descricaoSolicitada = texto(body.descricao || body.descricaoSolicitada || body.descricao_solicitada)
    const dataSolicitada = texto(body.data || body.dataSolicitada || body.data_solicitada)
    const horaSolicitada = texto(body.hora || body.horaSolicitada || body.hora_solicitada)
    const localSolicitado = texto(body.local || body.localSolicitado || body.local_solicitado || body.embarqueLocal || body.embarque_local)
    const precoSolicitado = numeroOuNull(body.preco ?? body.precoSolicitado ?? body.preco_solicitado)
    const observacaoGuia = texto(body.observacao || body.observacaoGuia || body.observacao_guia || body.mensagem || body.justificativa)

    if (!roteiroId) {
      return NextResponse.json(
        { sucesso: false, erro: 'ID do roteiro não informado.' },
        { status: 400 }
      )
    }

    if (!guiaId) {
      return NextResponse.json(
        { sucesso: false, erro: 'ID do guia não informado.' },
        { status: 400 }
      )
    }

    const houveAlgumaMudanca = Boolean(
      tituloSolicitado ||
        descricaoSolicitada ||
        dataSolicitada ||
        horaSolicitada ||
        localSolicitado ||
        precoSolicitado !== null ||
        observacaoGuia
    )

    if (!houveAlgumaMudanca) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Informe ao menos uma alteração ou uma mensagem para o Admin.',
        },
        { status: 400 }
      )
    }

    const { data: roteiro, error: roteiroError } = await supabase
      .from('roteiros')
      .select('*')
      .eq('id', roteiroId)
      .maybeSingle()

    if (roteiroError) throw roteiroError

    if (!roteiro?.id) {
      return NextResponse.json(
        { sucesso: false, erro: 'Roteiro não encontrado.' },
        { status: 404 }
      )
    }

    const donoRoteiro = guiaIdDoRoteiro(roteiro)

    if (donoRoteiro && donoRoteiro !== guiaId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Este roteiro não pertence ao guia informado.',
        },
        { status: 403 }
      )
    }

    const dadosAtuais = {
      titulo: tituloDoRoteiro(roteiro) || null,
      descricao: descricaoDoRoteiro(roteiro) || null,
      data: dataAtualDoRoteiro(roteiro) || null,
      hora: horaAtualDoRoteiro(roteiro) || null,
      local: localAtualDoRoteiro(roteiro) || null,
      preco: precoAtualDoRoteiro(roteiro),
      status: roteiro.status || null,
      ativo: roteiro.ativo ?? null,
    }

    const dadosSolicitados = {
      titulo: tituloSolicitado || null,
      descricao: descricaoSolicitada || null,
      data: dataSolicitada || null,
      hora: horaSolicitada || null,
      local: localSolicitado || null,
      preco: precoSolicitado,
      observacao: observacaoGuia || null,
    }

    const payload: AnyRecord = {
      roteiro_id: roteiroId,
      guia_id: guiaId,
      status: 'pendente',
      tipo_solicitacao: 'atualizacao_roteiro',

      titulo_atual: dadosAtuais.titulo,
      titulo_solicitado: tituloSolicitado || null,

      descricao_atual: dadosAtuais.descricao,
      descricao_solicitada: descricaoSolicitada || null,

      data_atual: dadosAtuais.data,
      data_solicitada: dataSolicitada || null,

      hora_atual: dadosAtuais.hora,
      hora_solicitada: horaSolicitada || null,

      local_atual: dadosAtuais.local,
      local_solicitado: localSolicitado || null,

      preco_atual: dadosAtuais.preco,
      preco_solicitado: precoSolicitado,

      observacao_guia: observacaoGuia || null,
      observacao_admin: null,

      dados_atuais: dadosAtuais,
      dados_solicitados: dadosSolicitados,

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const solicitacao = await inserirSolicitacaoComFallback({
      supabase,
      payloadOriginal: payload,
    })

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Solicitação enviada para análise do Admin.',
      solicitacao,
    })
  } catch (error: any) {
    console.error('Erro em POST /api/guia/roteiros/solicitar-atualizacao:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      body,
    })

    return NextResponse.json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao solicitar atualização.',
      },
      { status: 500 }
    )
  }
}
