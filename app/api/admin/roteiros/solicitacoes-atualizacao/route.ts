import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

function texto(valor: unknown) {
  return String(valor || '').trim()
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
  const textoErro = [
    error?.message,
    error?.details,
    error?.hint
  ]
    .filter(Boolean)
    .join(' ')

  const match = textoErro.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i)
  if (match?.[1]) return match[1]

  const matchAspas = textoErro.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  return ''
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

    if (!error) return data

    if (!erroColunaInexistente(error)) throw error

    const coluna = extrairColunaInexistente(error)

    if (!coluna || !(coluna in payload)) throw error

    delete payload[coluna]

    if (Object.keys(payload).length === 0) {
      throw new Error('Nenhuma coluna disponível para atualizar o roteiro.')
    }
  }

  throw new Error('Não foi possível atualizar o roteiro.')
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)

    const status = texto(searchParams.get('status') || 'pendente')
    const limite = Number(searchParams.get('limite') || 80)

    const { data, error } = await supabase
      .from('roteiros_solicitacoes_atualizacao')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(Number.isFinite(limite) ? limite : 80)

    if (error) throw error

    const solicitacoes = Array.isArray(data) ? data : []

    const guiaIds = Array.from(
      new Set(
        solicitacoes
          .map((item: AnyRecord) => texto(item.guia_id))
          .filter(Boolean)
      )
    )

    const roteiroIds = Array.from(
      new Set(
        solicitacoes
          .map((item: AnyRecord) => texto(item.roteiro_id))
          .filter(Boolean)
      )
    )

    const { data: guias } =
      guiaIds.length > 0
        ? await supabase
            .from('users')
            .select('id, nome, email, avatar_url, foto_url, imagem_url')
            .in('id', guiaIds)
        : { data: [] }

    const { data: roteiros } =
      roteiroIds.length > 0
        ? await supabase
            .from('roteiros')
            .select('id, titulo, nome, foto_capa, foto_url, imagem_url, status, ativo')
            .in('id', roteiroIds)
        : { data: [] }

    const resposta = solicitacoes.map((item: AnyRecord) => {
      const guia = (guias || []).find((g: AnyRecord) => g.id === item.guia_id)
      const roteiro = (roteiros || []).find((r: AnyRecord) => r.id === item.roteiro_id)

      return {
        ...item,
        guia_nome: guia?.nome || guia?.email || 'Guia',
        guia_avatar: guia?.avatar_url || guia?.foto_url || guia?.imagem_url || '',
        roteiro_titulo: roteiro?.titulo || roteiro?.nome || item.titulo_atual || 'Roteiro',
        roteiro_foto: roteiro?.foto_capa || roteiro?.foto_url || roteiro?.imagem_url || '',
        roteiro_status: roteiro?.status || '',
        roteiro_ativo: roteiro?.ativo ?? null,
      }
    })

    return NextResponse.json({
      sucesso: true,
      solicitacoes: resposta,
    })
  } catch (error: any) {
    console.error('Erro em GET /api/admin/roteiros/solicitacoes-atualizacao:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro: error?.message || 'Erro ao listar solicitações.',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  let body: AnyRecord = {}

  try {
    const supabase = getSupabaseAdmin()
    body = await request.json().catch(() => ({}))

    const solicitacaoId = texto(body.solicitacaoId || body.solicitacao_id)
    const adminId = texto(body.adminId || body.admin_id)
    const acao = texto(body.acao || body.status)
    const observacaoAdmin = texto(body.observacaoAdmin || body.observacao_admin)

    if (!solicitacaoId) {
      return NextResponse.json(
        { sucesso: false, erro: 'ID da solicitação não informado.' },
        { status: 400 }
      )
    }

    if (!adminId) {
      return NextResponse.json(
        { sucesso: false, erro: 'ID do Admin não informado.' },
        { status: 400 }
      )
    }

    const { data: solicitacao, error: solicitacaoError } = await supabase
      .from('roteiros_solicitacoes_atualizacao')
      .select('*')
      .eq('id', solicitacaoId)
      .maybeSingle()

    if (solicitacaoError) throw solicitacaoError

    if (!solicitacao?.id) {
      return NextResponse.json(
        { sucesso: false, erro: 'Solicitação não encontrada.' },
        { status: 404 }
      )
    }

    if (solicitacao.status !== 'pendente') {
      return NextResponse.json(
        { sucesso: false, erro: 'Esta solicitação já foi analisada.' },
        { status: 400 }
      )
    }

    if (acao === 'rejeitar' || acao === 'rejeitada') {
      const { data: rejeitada, error: rejeitarError } = await supabase
        .from('roteiros_solicitacoes_atualizacao')
        .update({
          status: 'rejeitada',
          admin_id: adminId,
          observacao_admin: observacaoAdmin || null,
          rejeitado_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', solicitacaoId)
        .select('*')
        .maybeSingle()

      if (rejeitarError) throw rejeitarError

      return NextResponse.json({
        sucesso: true,
        mensagem: 'Solicitação rejeitada.',
        solicitacao: rejeitada,
      })
    }

    const dados = solicitacao.dados_solicitados || {}

    const titulo = texto(body.titulo ?? dados.titulo ?? solicitacao.titulo_solicitado)
    const descricao = texto(body.descricao ?? dados.descricao ?? solicitacao.descricao_solicitada)
    const data = texto(body.data ?? dados.data ?? solicitacao.data_solicitada)
    const hora = texto(body.hora ?? dados.hora ?? solicitacao.hora_solicitada)
    const local = texto(body.local ?? dados.local ?? solicitacao.local_solicitado)

    const precoInformado =
      body.preco !== undefined
        ? Number(body.preco)
        : dados.preco !== undefined
          ? Number(dados.preco)
          : solicitacao.preco_solicitado !== null
            ? Number(solicitacao.preco_solicitado)
            : null

    const dataHora = data && hora ? `${data}T${hora}:00` : data

    const payloadRoteiro: AnyRecord = {
      updated_at: new Date().toISOString(),
      ativo: true,
      status: 'ativo',
    }

    if (titulo) {
      payloadRoteiro.titulo = titulo
      payloadRoteiro.nome = titulo
    }

    if (descricao) {
      payloadRoteiro.descricao = descricao
      payloadRoteiro.roteiro_detalhado = descricao
      payloadRoteiro.detalhes = descricao
    }

    if (data) {
      payloadRoteiro.proxima_data = dataHora
      payloadRoteiro.data_trilha = dataHora
      payloadRoteiro.data_roteiro = dataHora
      payloadRoteiro.embarque_data = data
      payloadRoteiro.embarque_data_hora = dataHora
    }

    if (local) {
      payloadRoteiro.local = local
      payloadRoteiro.localizacao = local
      payloadRoteiro.embarque_local = local
      payloadRoteiro.local_encontro = local
      payloadRoteiro.ponto_encontro = local
    }

    if (precoInformado !== null && Number.isFinite(precoInformado)) {
      payloadRoteiro.preco = precoInformado
      payloadRoteiro.valor = precoInformado
    }

    const roteiroAtualizado = await atualizarRoteiroComFallback({
      supabase,
      roteiroId: solicitacao.roteiro_id,
      payloadOriginal: payloadRoteiro,
    })

    const { data: solicitacaoAtualizada, error: updateSolicitacaoError } =
      await supabase
        .from('roteiros_solicitacoes_atualizacao')
        .update({
          status: 'aprovada',
          admin_id: adminId,
          observacao_admin: observacaoAdmin || null,
          aprovado_em: new Date().toISOString(),
          aplicado_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', solicitacaoId)
        .select('*')
        .maybeSingle()

    if (updateSolicitacaoError) throw updateSolicitacaoError

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Solicitação aprovada e roteiro atualizado.',
      roteiro: roteiroAtualizado,
      solicitacao: solicitacaoAtualizada,
    })
  } catch (error: any) {
    console.error('Erro em POST /api/admin/roteiros/solicitacoes-atualizacao:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      body,
    })

    return NextResponse.json(
      {
        sucesso: false,
        erro: error?.message || 'Erro ao processar solicitação.',
      },
      { status: 500 }
    )
  }
}