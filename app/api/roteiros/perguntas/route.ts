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

async function inserirComFallback(params: {
  supabase: any
  tabela: string
  payloadOriginal: AnyRecord
}) {
  const { supabase, tabela } = params
  let payload: AnyRecord = { ...params.payloadOriginal }

  for (let tentativa = 0; tentativa < 16; tentativa++) {
    const { data, error } = await supabase
      .from(tabela)
      .insert(payload)
      .select('*')
      .maybeSingle()

    if (!error) return data as AnyRecord | null

    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payload)) throw error

    delete payload[coluna]
  }

  throw new Error(`Não foi possível inserir em ${tabela} após ajustar colunas.`)
}

function normalizarPergunta(item: AnyRecord) {
  return {
    ...item,
    cliente_nome:
      item.cliente_nome ||
      item.usuario_nome ||
      item.nome_cliente ||
      'Aventureiro PrussikTrails',
    status: item.status || 'pendente',
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)

    const roteiroId = texto(searchParams.get('roteiroId') || searchParams.get('roteiro_id'))
    const guiaId = texto(searchParams.get('guiaId') || searchParams.get('guia_id'))
    const status = normalizar(searchParams.get('status'))
    const limite = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 60)))

    let query = supabase
      .from('roteiro_perguntas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite)

    if (roteiroId) {
      query = query.eq('roteiro_id', roteiroId)
    }

    if (guiaId) {
      query = query.eq('guia_id', guiaId)
    }

    if (status && status !== 'todas' && status !== 'todos') {
      query = query.eq('status', status)
    } else {
      query = query.neq('status', 'removida')
    }

    const { data, error } = await query

    if (error) throw error

    const perguntas = (data || []).map((item: AnyRecord) => normalizarPergunta(item))

    let roteiros: AnyRecord[] = []

    const roteiroIds = Array.from(
      new Set(perguntas.map((item: AnyRecord) => item.roteiro_id).filter(Boolean))
    )

    if (roteiroIds.length > 0) {
      const { data: roteirosData, error: roteirosError } = await supabase
        .from('roteiros')
        .select('*')
        .in('id', roteiroIds)

      if (!roteirosError && Array.isArray(roteirosData)) {
        roteiros = roteirosData
      }
    }

    const perguntasComRoteiro = perguntas.map((pergunta: AnyRecord) => {
      const roteiro =
        roteiros.find((item: AnyRecord) => String(item.id) === String(pergunta.roteiro_id)) || null

      return {
        ...pergunta,
        roteiro_titulo: roteiro?.titulo || roteiro?.nome || 'Roteiro',
        roteiro_local: roteiro?.local || roteiro?.localizacao || roteiro?.cidade || '',
        roteiro,
      }
    })

    const pendentes = perguntasComRoteiro.filter(
      (item: AnyRecord) => normalizar(item.status) === 'pendente' || !item.resposta
    ).length

    return NextResponse.json({
      sucesso: true,
      perguntas: perguntasComRoteiro,
      total: perguntasComRoteiro.length,
      pendentes,
    })
  } catch (error: any) {
    console.error('Erro em GET /api/roteiros/perguntas:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack,
      raw: error,
    })

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error?.message ||
          'Erro ao carregar perguntas dos roteiros.',
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

export async function POST(request: NextRequest) {
  let recebido: AnyRecord = {}

  try {
    const supabase = getSupabaseAdmin()
    recebido = await request.json().catch(() => ({}))

    const roteiroId = texto(recebido.roteiroId || recebido.roteiro_id)
    const clienteId = texto(recebido.clienteId || recebido.cliente_id || recebido.usuarioId || recebido.usuario_id)
    const pergunta = texto(recebido.pergunta || recebido.mensagem || recebido.texto)
    const paginaOrigem = texto(recebido.paginaOrigem || recebido.pagina_origem)

    if (!roteiroId) {
      return NextResponse.json(
        { sucesso: false, erro: 'roteiroId é obrigatório.', recebido },
        { status: 400 }
      )
    }

    if (!clienteId) {
      return NextResponse.json(
        { sucesso: false, erro: 'clienteId é obrigatório.', recebido },
        { status: 400 }
      )
    }

    if (!pergunta || pergunta.length < 4) {
      return NextResponse.json(
        { sucesso: false, erro: 'A pergunta precisa ter pelo menos 4 caracteres.', recebido },
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
        { sucesso: false, erro: 'Roteiro não encontrado.', recebido },
        { status: 404 }
      )
    }

    const guiaId = guiaIdDoRoteiro(roteiro)

    if (!guiaId) {
      return NextResponse.json(
        { sucesso: false, erro: 'Este roteiro ainda não possui guia vinculado.', recebido },
        { status: 400 }
      )
    }

    if (guiaId === clienteId) {
      return NextResponse.json(
        { sucesso: false, erro: 'O guia responsável não pode perguntar no próprio roteiro.', recebido },
        { status: 403 }
      )
    }

    const { data: cliente } = await supabase
      .from('users')
      .select('*')
      .eq('id', clienteId)
      .maybeSingle()

    const clienteNome =
      cliente?.nome ||
      cliente?.name ||
      cliente?.email ||
      recebido.clienteNome ||
      recebido.cliente_nome ||
      'Aventureiro PrussikTrails'

    const agora = new Date().toISOString()

    const perguntaCriada = await inserirComFallback({
      supabase,
      tabela: 'roteiro_perguntas',
      payloadOriginal: {
        roteiro_id: roteiroId,
        cliente_id: clienteId,
        guia_id: guiaId,
        cliente_nome: clienteNome,
        pergunta,
        resposta: null,
        status: 'pendente',
        pagina_origem: paginaOrigem || `/roteiros/${roteiroId}`,
        created_at: agora,
        updated_at: agora,
        metadata: {
          origem: 'roteiro_publico',
          roteiro_titulo: roteiro.titulo || roteiro.nome || '',
          cliente_email: cliente?.email || '',
        },
      },
    })

    return NextResponse.json({
      sucesso: true,
      pergunta: perguntaCriada,
      mensagem: 'Pergunta enviada ao guia.',
    })
  } catch (error: any) {
    console.error('Erro em POST /api/roteiros/perguntas:', {
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
          'Erro ao enviar pergunta ao guia.',
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
