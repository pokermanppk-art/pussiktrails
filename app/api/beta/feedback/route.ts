import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type FeedbackTipo = 'feedback' | 'bug' | 'melhoria' | 'elogio' | 'duvida'
type FeedbackPrioridade = 'baixa' | 'normal' | 'alta' | 'critica'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

function criarSupabaseAdmin() {
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

function normalizarTexto(valor: unknown): string {
  if (typeof valor !== 'string') return ''
  return valor.trim()
}

function normalizarTipo(valor: unknown): FeedbackTipo {
  const tipo = normalizarTexto(valor).toLowerCase()

  if (
    tipo === 'feedback' ||
    tipo === 'bug' ||
    tipo === 'melhoria' ||
    tipo === 'elogio' ||
    tipo === 'duvida'
  ) {
    return tipo
  }

  return 'feedback'
}

function normalizarPrioridade(valor: unknown): FeedbackPrioridade {
  const prioridade = normalizarTexto(valor).toLowerCase()

  if (
    prioridade === 'baixa' ||
    prioridade === 'normal' ||
    prioridade === 'alta' ||
    prioridade === 'critica'
  ) {
    return prioridade
  }

  return 'normal'
}

function limitarTexto(texto: string, limite: number): string {
  if (!texto) return ''
  return texto.length > limite ? texto.slice(0, limite) : texto
}

function obterIp(req: NextRequest): string | null {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || null
  }

  const realIp = req.headers.get('x-real-ip')
  return realIp || null
}

export async function POST(req: NextRequest) {
  try {
    const supabase = criarSupabaseAdmin()
    const body = await req.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          ok: false,
          error: 'Corpo da requisição inválido.',
        },
        { status: 400 }
      )
    }

    const usuarioId = normalizarTexto((body as any).usuarioId || (body as any).userId)
    const tipo = normalizarTipo((body as any).tipo)
    const prioridade = normalizarPrioridade((body as any).prioridade)

    const titulo = limitarTexto(normalizarTexto((body as any).titulo), 160)
    const mensagem = limitarTexto(normalizarTexto((body as any).mensagem), 3000)

    const pagina = limitarTexto(normalizarTexto((body as any).pagina), 500)
    const navegador = limitarTexto(normalizarTexto((body as any).navegador), 500)
    const dispositivo = limitarTexto(normalizarTexto((body as any).dispositivo), 500)

    const origem =
      limitarTexto(normalizarTexto((body as any).origem), 120) ||
      'dashboard_principal'

    if (!mensagem) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Escreva uma mensagem antes de enviar.',
        },
        { status: 400 }
      )
    }

    const metadata = {
      beta: true,
      userAgent: req.headers.get('user-agent'),
      ip: obterIp(req),
      recebidoEm: new Date().toISOString(),
      payloadOrigem: {
        pagina,
        navegador,
        dispositivo,
      },
    }

    const insertPayload: Record<string, any> = {
      tipo,
      origem,
      titulo: titulo || null,
      mensagem,
      pagina: pagina || null,
      navegador: navegador || null,
      dispositivo: dispositivo || null,
      prioridade,
      status: 'novo',
      metadata,
    }

    if (usuarioId) {
      insertPayload.usuario_id = usuarioId
    }

    const { data, error } = await supabase
      .from('feedback_beta')
      .insert(insertPayload)
      .select('id, tipo, status, created_at')
      .single()

    if (error) {
      console.error('[BETA_FEEDBACK_POST_ERROR]', error)

      return NextResponse.json(
        {
          ok: false,
          error: 'Não foi possível registrar o feedback agora.',
          details: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: 'Feedback registrado com sucesso.',
      feedback: data,
    })
  } catch (error: any) {
    console.error('[BETA_FEEDBACK_POST_FATAL]', error)

    return NextResponse.json(
      {
        ok: false,
        error: 'Erro interno ao registrar feedback.',
        details: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = criarSupabaseAdmin()
    const { searchParams } = new URL(req.url)

    const usuarioId = searchParams.get('usuarioId')
    const status = searchParams.get('status')
    const tipo = searchParams.get('tipo')
    const limiteParam = Number(searchParams.get('limite') || 50)

    const limite = Number.isFinite(limiteParam)
      ? Math.min(Math.max(limiteParam, 1), 200)
      : 50

    let query = supabase
      .from('feedback_beta')
      .select(
        `
        id,
        usuario_id,
        tipo,
        origem,
        titulo,
        mensagem,
        pagina,
        navegador,
        dispositivo,
        prioridade,
        status,
        admin_observacao,
        resolvido_em,
        created_at,
        updated_at
      `
      )
      .order('created_at', { ascending: false })
      .limit(limite)

    if (usuarioId) {
      query = query.eq('usuario_id', usuarioId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (tipo) {
      query = query.eq('tipo', tipo)
    }

    const { data, error } = await query

    if (error) {
      console.error('[BETA_FEEDBACK_GET_ERROR]', error)

      return NextResponse.json(
        {
          ok: false,
          error: 'Não foi possível carregar os feedbacks.',
          details: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      total: data?.length || 0,
      feedbacks: data || [],
    })
  } catch (error: any) {
    console.error('[BETA_FEEDBACK_GET_FATAL]', error)

    return NextResponse.json(
      {
        ok: false,
        error: 'Erro interno ao carregar feedbacks.',
        details: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}