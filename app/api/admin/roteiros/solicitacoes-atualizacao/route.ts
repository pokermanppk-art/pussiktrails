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
  if (valor === null || valor === undefined || valor === '') return null

  const normalizado = String(valor).replace(',', '.')
  const numero = Number(normalizado)

  if (!Number.isFinite(numero)) return null

  return numero
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
    mensagem.includes('violates check') ||
    mensagem.includes('violates check constraint')
  )
}

function extrairColunaInexistente(error: any) {
  const textoErro = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')

  const matchRoteiros = textoErro.match(/roteiros\.([a-zA-Z0-9_]+)/)
  if (matchRoteiros?.[1]) return matchRoteiros[1]

  const matchSolicitacoes = textoErro.match(/roteiros_solicitacoes_atualizacao\.([a-zA-Z0-9_]+)/)
  if (matchSolicitacoes?.[1]) return matchSolicitacoes[1]

  const matchColumn = textoErro.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i)
  if (matchColumn?.[1]) return matchColumn[1]

  const matchAspas = textoErro.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

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

  for (let tentativa = 0; tentativa < 24; tentativa++) {
    const { data, error } = await supabase
      .from(tabela)
      .update(payload)
      .eq('id', id)
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
      throw new Error(`Nenhuma coluna disponível para atualizar ${tabela}.`)
    }
  }

  throw new Error(`Não foi possível atualizar ${tabela}.`)
}

async function atualizarRoteiroComStatusPermitido(params: {
  supabase: any
  roteiroId: string
  payloadBase: AnyRecord
}) {
  const { supabase, roteiroId, payloadBase } = params

  const statusTentativas = [
    'ativo',
    'aprovado',
    'publicado',
    'confirmado',
    'confirmada',
    'aprovada',
  ]

  let ultimoErro: any = null

  for (const status of statusTentativas) {
    try {
      return await atualizarComFallback({
        supabase,
        tabela: 'roteiros',
        id: roteiroId,
        payloadOriginal: {
          ...payloadBase,
          status,
        },
      })
    } catch (error: any) {
      ultimoErro = error

      if (!erroCheckConstraint(error)) {
        throw error
      }
    }
  }

  try {
    const payloadSemStatus = { ...payloadBase }
    delete payloadSemStatus.status

    return await atualizarComFallback({
      supabase,
      tabela: 'roteiros',
      id: roteiroId,
      payloadOriginal: payloadSemStatus,
    })
  } catch (error: any) {
    throw ultimoErro || error
  }
}

function montarDataHoraBrasil(data: string, hora: string) {
  const dataLimpa = texto(data)
  const horaLimpa = texto(hora)

  if (!dataLimpa || !horaLimpa) return ''

  const horaNormalizada = horaLimpa.length === 5 ? `${horaLimpa}:00` : horaLimpa

  return `${dataLimpa}T${horaNormalizada}-03:00`
}

function extrairData(valor: unknown) {
  const bruto = texto(valor)

  if (!bruto) return ''

  const match = bruto.match(/\d{4}-\d{2}-\d{2}/)

  return match?.[0] || bruto
}

function extrairHora(valor: unknown) {
  const bruto = texto(valor)

  if (!bruto) return ''

  const match = bruto.match(/\d{2}:\d{2}/)

  return match?.[0] || bruto
}

function primeiroTexto(...valores: unknown[]) {
  for (const valor of valores) {
    const textoValor = texto(valor)
    if (textoValor) return textoValor
  }

  return ''
}

function normalizarSolicitacao(item: AnyRecord, guia?: AnyRecord, roteiro?: AnyRecord) {
  const dadosSolicitados = item.dados_solicitados || {}
  const dadosAtuais = item.dados_atuais || {}

  return {
    ...item,
    dados_solicitados: dadosSolicitados,
    dados_atuais: dadosAtuais,
    guia_nome: guia?.nome || guia?.email || 'Guia',
    guia_avatar: guia?.avatar_url || guia?.foto_url || guia?.imagem_url || '',
    roteiro_titulo:
      roteiro?.titulo ||
      roteiro?.nome ||
      item.titulo_atual ||
      dadosAtuais.titulo ||
      'Roteiro',
    roteiro_foto:
      roteiro?.foto_capa ||
      roteiro?.foto_url ||
      roteiro?.imagem_url ||
      roteiro?.image_url ||
      roteiro?.capa_url ||
      '',
    roteiro_status: roteiro?.status || '',
    roteiro_ativo: roteiro?.ativo ?? null,
  }
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)

    const status = texto(searchParams.get('status') || 'pendente')
    const limiteRaw = Number(searchParams.get('limite') || 80)
    const limite = Number.isFinite(limiteRaw) ? limiteRaw : 80

    const query = supabase
      .from('roteiros_solicitacoes_atualizacao')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite)

    if (status && status !== 'todos') {
      query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    const solicitacoes: AnyRecord[] = Array.isArray(data) ? data : []

    const guiaIds = Array.from(
      new Set(
        solicitacoes
          .map((item) => texto(item.guia_id))
          .filter(Boolean)
      )
    )

    const roteiroIds = Array.from(
      new Set(
        solicitacoes
          .map((item) => texto(item.roteiro_id))
          .filter(Boolean)
      )
    )

    const { data: guias, error: guiasError } = guiaIds.length > 0
      ? await supabase
          .from('users')
          .select('id, nome, email, avatar_url, foto_url, imagem_url')
          .in('id', guiaIds)
      : { data: [], error: null }

    if (guiasError) {
      console.warn('[admin/roteiros/solicitacoes] Erro ao buscar guias:', guiasError)
    }

    const { data: roteiros, error: roteirosError } = roteiroIds.length > 0
      ? await supabase
          .from('roteiros')
          .select('*')
          .in('id', roteiroIds)
      : { data: [], error: null }

    if (roteirosError) {
      console.warn('[admin/roteiros/solicitacoes] Erro ao buscar roteiros:', roteirosError)
    }

    const resposta = solicitacoes.map((item) => {
      const guia = (guias || []).find((g: AnyRecord) => g.id === item.guia_id)
      const roteiro = (roteiros || []).find((r: AnyRecord) => r.id === item.roteiro_id)

      return normalizarSolicitacao(item, guia, roteiro)
    })

    return NextResponse.json({
      sucesso: true,
      solicitacoes: resposta,
    })
  } catch (error: any) {
    console.error('Erro em GET /api/admin/roteiros/solicitacoes-atualizacao:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    })

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
    const acao = normalizar(body.acao || body.status)
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

    const statusSolicitacao = normalizar(solicitacao.status)

    if (statusSolicitacao !== 'pendente') {
      return NextResponse.json(
        { sucesso: false, erro: 'Esta solicitação já foi analisada.' },
        { status: 400 }
      )
    }

    if (acao === 'rejeitar' || acao === 'rejeitada' || acao === 'rejeitado') {
      const rejeitada = await atualizarComFallback({
        supabase,
        tabela: 'roteiros_solicitacoes_atualizacao',
        id: solicitacaoId,
        payloadOriginal: {
          status: 'rejeitada',
          admin_id: adminId,
          observacao_admin: observacaoAdmin || null,
          rejeitado_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      })

      return NextResponse.json({
        sucesso: true,
        mensagem: 'Solicitação rejeitada.',
        solicitacao: rejeitada,
      })
    }

    const dados = solicitacao.dados_solicitados || {}

    const titulo = primeiroTexto(
      body.titulo,
      dados.titulo,
      solicitacao.titulo_solicitado
    )

    const descricao = primeiroTexto(
      body.descricao,
      dados.descricao,
      solicitacao.descricao_solicitada
    )

    const data = extrairData(
      primeiroTexto(
        body.data,
        dados.data,
        solicitacao.data_solicitada
      )
    )

    const hora = extrairHora(
      primeiroTexto(
        body.hora,
        dados.hora,
        solicitacao.hora_solicitada
      )
    )

    const local = primeiroTexto(
      body.local,
      dados.local,
      solicitacao.local_solicitado
    )

    const precoInformado = numeroOuNull(
      body.preco !== undefined
        ? body.preco
        : dados.preco !== undefined
          ? dados.preco
          : solicitacao.preco_solicitado
    )

    const dataHoraBrasil = montarDataHoraBrasil(data, hora)

    const payloadRoteiro: AnyRecord = {
      updated_at: new Date().toISOString(),
      ativo: true,
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
      payloadRoteiro.embarque_data = data
      payloadRoteiro.data_texto = data
    }

    if (hora) {
      payloadRoteiro.hora_trilha = hora
      payloadRoteiro.hora_texto = hora
    }

    if (dataHoraBrasil) {
      payloadRoteiro.proxima_data = dataHoraBrasil
      payloadRoteiro.data_trilha = dataHoraBrasil
      payloadRoteiro.data_roteiro = dataHoraBrasil
      payloadRoteiro.embarque_data_hora = dataHoraBrasil
    }

    if (local) {
      payloadRoteiro.local = local
      payloadRoteiro.localizacao = local
      payloadRoteiro.embarque_local = local
      payloadRoteiro.local_encontro = local
      payloadRoteiro.ponto_encontro = local
    }

    if (precoInformado !== null) {
      payloadRoteiro.preco = precoInformado
      payloadRoteiro.valor = precoInformado
      payloadRoteiro.preco_total = precoInformado
      payloadRoteiro.preco_por_pessoa = precoInformado
    }

    if (observacaoAdmin) {
      payloadRoteiro.observacao_admin = observacaoAdmin
    }

    const roteiroAtualizado = await atualizarRoteiroComStatusPermitido({
      supabase,
      roteiroId: solicitacao.roteiro_id,
      payloadBase: payloadRoteiro,
    })

    const solicitacaoAtualizada = await atualizarComFallback({
      supabase,
      tabela: 'roteiros_solicitacoes_atualizacao',
      id: solicitacaoId,
      payloadOriginal: {
        status: 'aprovada',
        admin_id: adminId,
        observacao_admin: observacaoAdmin || null,
        aprovado_em: new Date().toISOString(),
        aplicado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    })

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
