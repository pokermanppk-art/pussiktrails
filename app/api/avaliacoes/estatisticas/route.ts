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

function numero(valor: unknown) {
  const n = Number(valor || 0)
  return Number.isFinite(n) ? n : 0
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function extrairGuiaId(request: NextRequest, body: AnyRecord) {
  const { searchParams } = new URL(request.url)

  return texto(
    body.guiaId ||
      body.guia_id ||
      body.id_guia ||
      body.usuarioId ||
      body.usuario_id ||
      body.userId ||
      body.user_id ||
      searchParams.get('guiaId') ||
      searchParams.get('guia_id') ||
      searchParams.get('id_guia') ||
      searchParams.get('usuarioId') ||
      searchParams.get('usuario_id') ||
      searchParams.get('userId') ||
      searchParams.get('user_id')
  )
}

function notaAvaliacao(item: AnyRecord) {
  return numero(
    item.nota_geral ??
      item.nota ??
      item.avaliacao ??
      item.rating ??
      item.estrelas ??
      0
  )
}

function respostaPergunta(item: AnyRecord, chave: string) {
  const respostas =
    item.respostas && typeof item.respostas === 'object' ? item.respostas : {}

  const metadata =
    item.metadata && typeof item.metadata === 'object' ? item.metadata : {}

  return normalizar(item[chave] || respostas[chave] || metadata[chave] || '')
}

function contarPorResposta(avaliacoes: AnyRecord[], chave: string) {
  return avaliacoes.reduce((acc: Record<string, number>, item) => {
    const valor = respostaPergunta(item, chave) || 'nao_informado'
    acc[valor] = (acc[valor] || 0) + 1
    return acc
  }, {})
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

async function buscarAvaliacoesPorCampo(params: {
  supabase: any
  campo: string
  guiaId: string
}) {
  const { supabase, campo, guiaId } = params

  const { data, error } = await supabase
    .from('avaliacoes')
    .select('*')
    .eq(campo, guiaId)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    if (erroDeColunaAusente(error)) {
      return {
        data: [] as AnyRecord[],
        error: null,
      }
    }

    return {
      data: [] as AnyRecord[],
      error,
    }
  }

  return {
    data: (data || []) as AnyRecord[],
    error: null,
  }
}

async function carregarAvaliacoes(supabase: any, guiaId: string) {
  const campos = ['guia_id', 'id_guia', 'usuario_id', 'user_id']

  const acumuladas: AnyRecord[] = []
  const ids = new Set<string>()
  const camposTentados: string[] = []

  for (const campo of campos) {
    camposTentados.push(campo)

    const resultado = await buscarAvaliacoesPorCampo({
      supabase,
      campo,
      guiaId,
    })

    if (resultado.error) {
      throw resultado.error
    }

    for (const item of resultado.data) {
      const id = texto(item.id) || JSON.stringify(item)

      if (!ids.has(id)) {
        ids.add(id)
        acumuladas.push(item)
      }
    }
  }

  return {
    avaliacoes: acumuladas,
    camposTentados,
  }
}

function montarResposta(avaliacoes: AnyRecord[], guiaId: string) {
  const notas = avaliacoes
    .map((item) => notaAvaliacao(item))
    .filter((nota) => nota > 0)

  const totalAvaliacoes = avaliacoes.length
  const somaNotas = notas.reduce((acc, nota) => acc + nota, 0)
  const mediaGeral = notas.length
    ? Number((somaNotas / notas.length).toFixed(2))
    : 0

  const comComentario = avaliacoes.filter((item) => {
    return texto(
      item.comentario ||
        item.observacao ||
        item.depoimento ||
        item.resposta
    )
  }).length

  const distribuicaoNotas = notas.reduce((acc: Record<string, number>, nota) => {
    const chave = String(Math.round(nota))
    acc[chave] = (acc[chave] || 0) + 1
    return acc
  }, {})

  return {
    sucesso: true,
    guiaId,
    totalAvaliacoes,
    total: totalAvaliacoes,
    mediaGeral,
    media: mediaGeral,
    notaMedia: mediaGeral,
    respondidas: comComentario,
    comComentario,
    distribuicaoNotas,
    respostas: {
      orientacoes: contarPorResposta(avaliacoes, 'orientacoes'),
      seguranca: contarPorResposta(avaliacoes, 'seguranca'),
      experiencia: contarPorResposta(avaliacoes, 'experiencia'),
    },
    estatisticas: {
      totalAvaliacoes,
      mediaGeral,
      notaMedia: mediaGeral,
      respondidas: comComentario,
      comComentario,
    },
    avaliacoes: avaliacoes.slice(0, 20),
  }
}

function respostaZerada(aviso = 'guiaId não informado. Estatísticas zeradas.') {
  return {
    sucesso: true,
    aviso,
    guiaId: '',
    totalAvaliacoes: 0,
    total: 0,
    mediaGeral: 0,
    media: 0,
    notaMedia: 0,
    respondidas: 0,
    comComentario: 0,
    distribuicaoNotas: {},
    respostas: {
      orientacoes: {},
      seguranca: {},
      experiencia: {},
    },
    estatisticas: {
      totalAvaliacoes: 0,
      mediaGeral: 0,
      notaMedia: 0,
      respondidas: 0,
      comComentario: 0,
    },
    avaliacoes: [],
  }
}

export async function GET(request: NextRequest) {
  return responder(request)
}

export async function POST(request: NextRequest) {
  return responder(request)
}

async function responder(request: NextRequest) {
  let body: AnyRecord = {}

  try {
    const supabase = getSupabaseAdmin()

    if (request.method !== 'GET') {
      body = await request.json().catch(() => ({}))
    }

    const guiaId = extrairGuiaId(request, body)

    if (!guiaId || guiaId === 'undefined' || guiaId === 'null') {
      return NextResponse.json(respostaZerada())
    }

    const { avaliacoes, camposTentados } = await carregarAvaliacoes(
      supabase,
      guiaId
    )

    return NextResponse.json({
      ...montarResposta(avaliacoes, guiaId),
      camposTentados,
    })
  } catch (error: any) {
    console.error('Erro em /api/avaliacoes/estatisticas:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack,
      body,
    })

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error?.message ||
          'Erro ao carregar estatísticas de avaliações.',
        detalhe: {
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          message: error?.message,
        },
      },
      { status: 500 }
    )
  }
}
