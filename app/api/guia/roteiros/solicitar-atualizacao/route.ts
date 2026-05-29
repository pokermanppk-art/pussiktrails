import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function numeroOuNull(valor: unknown) {
  if (valor === null || valor === undefined || valor === '') return null
  const n = Number(String(valor).replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : null
}

function getSupabaseAdmin(): any {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE

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
      roteiro.created_by
  )
}

export async function POST(request: Request) {
  let body: AnyRecord = {}

  try {
    const supabase = getSupabaseAdmin()
    body = await request.json().catch(() => ({}))

    const roteiroId = texto(body.roteiroId || body.roteiro_id)
    const guiaId = texto(body.guiaId || body.guia_id || body.userId || body.user_id)

    const tituloSolicitado = texto(body.titulo)
    const descricaoSolicitada = texto(body.descricao)
    const dataSolicitada = texto(body.data)
    const horaSolicitada = texto(body.hora)
    const localSolicitado = texto(body.local)
    const precoSolicitado = numeroOuNull(body.preco)
    const observacaoGuia = texto(body.observacao)

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
        { sucesso: false, erro: 'Este roteiro não pertence ao guia informado.' },
        { status: 403 }
      )
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

    const dadosAtuais = {
      titulo: roteiro.titulo || roteiro.nome || null,
      descricao: roteiro.descricao || roteiro.roteiro_detalhado || roteiro.detalhes || null,
      data:
        roteiro.proxima_data ||
        roteiro.data_trilha ||
        roteiro.data_roteiro ||
        roteiro.embarque_data ||
        roteiro.embarque_data_hora ||
        null,
      local:
        roteiro.local ||
        roteiro.localizacao ||
        roteiro.embarque_local ||
        roteiro.local_encontro ||
        roteiro.ponto_encontro ||
        null,
      preco: roteiro.preco || roteiro.valor || null,
      status: roteiro.status || null,
      ativo: roteiro.ativo ?? null,
    }

    const { data: solicitacao, error: insertError } = await supabase
      .from('roteiros_solicitacoes_atualizacao')
      .insert({
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

        hora_atual: null,
        hora_solicitada: horaSolicitada || null,

        local_atual: dadosAtuais.local,
        local_solicitado: localSolicitado || null,

        preco_atual: dadosAtuais.preco,
        preco_solicitado: precoSolicitado,

        observacao_guia: observacaoGuia || null,

        dados_atuais: dadosAtuais,
        dados_solicitados: dadosSolicitados,
      })
      .select('*')
      .maybeSingle()

    if (insertError) throw insertError

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
