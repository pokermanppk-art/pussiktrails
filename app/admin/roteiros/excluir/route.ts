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
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Variáveis SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configuradas.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function erroColunaInexistente(error: any) {
  const mensagem = String(error?.message || error?.details || error?.hint || '').toLowerCase()

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
  const mensagem = String(error?.message || error?.details || error?.hint || '').toLowerCase()
  return error?.code === '23514' || mensagem.includes('check constraint') || mensagem.includes('violates check')
}

function extrairColunaInexistente(error: any) {
  const textoErro = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ')

  const matchRoteiros = textoErro.match(/roteiros\.([a-zA-Z0-9_]+)/)
  if (matchRoteiros?.[1]) return matchRoteiros[1]

  const matchColumn = textoErro.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i)
  if (matchColumn?.[1]) return matchColumn[1]

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

  for (let tentativa = 0; tentativa < 18; tentativa++) {
    const { data, error } = await supabase
      .from('roteiros')
      .update(payload)
      .eq('id', roteiroId)
      .select('*')
      .maybeSingle()

    if (!error) return data as AnyRecord | null

    if (!erroColunaInexistente(error)) throw error

    const coluna = extrairColunaInexistente(error)

    if (!coluna || !(coluna in payload)) throw error

    delete payload[coluna]

    if (Object.keys(payload).length === 0) {
      throw new Error('Nenhuma coluna disponível para remover o roteiro.')
    }
  }

  throw new Error('Não foi possível remover o roteiro.')
}

async function atualizarComStatusPermitido(params: {
  supabase: any
  roteiroId: string
  payloadBase: AnyRecord
}) {
  const { supabase, roteiroId, payloadBase } = params

  const statusTentativas = ['excluido', 'arquivado', 'cancelado', 'pausado', 'rascunho']
  let ultimoErro: any = null

  for (const status of statusTentativas) {
    try {
      return await atualizarRoteiroComFallback({
        supabase,
        roteiroId,
        payloadOriginal: {
          ...payloadBase,
          status,
        },
      })
    } catch (error: any) {
      ultimoErro = error
      if (!erroCheckConstraint(error)) throw error
    }
  }

  throw ultimoErro || new Error('Nenhum status de exclusão foi aceito pelo banco.')
}

export async function POST(request: Request) {
  let body: AnyRecord = {}

  try {
    const supabase = getSupabaseAdmin()
    body = await request.json().catch(() => ({}))

    const roteiroId = texto(body.roteiroId || body.roteiro_id || body.id)
    const adminId = texto(body.adminId || body.admin_id || body.userId || body.user_id)

    if (!roteiroId) {
      return NextResponse.json({ sucesso: false, erro: 'ID do roteiro não informado.' }, { status: 400 })
    }

    if (!adminId) {
      return NextResponse.json({ sucesso: false, erro: 'ID do admin não informado.' }, { status: 400 })
    }

    const { data: roteiro, error: roteiroError } = await supabase
      .from('roteiros')
      .select('*')
      .eq('id', roteiroId)
      .maybeSingle()

    if (roteiroError) throw roteiroError

    if (!roteiro?.id) {
      return NextResponse.json({ sucesso: false, erro: 'Roteiro não encontrado.' }, { status: 404 })
    }

    const { data: reservas, error: reservasError } = await supabase
      .from('reservas')
      .select('id, status, pagamento_status')
      .eq('roteiro_id', roteiroId)
      .limit(200)

    if (reservasError) {
      console.warn('[admin/roteiros/excluir] Não foi possível checar reservas:', reservasError)
    }

    const reservasAtivas = Array.isArray(reservas)
      ? reservas.filter((reserva: AnyRecord) => {
          const status = normalizar(reserva.status)
          return status !== 'cancelada' && status !== 'cancelado'
        })
      : []

    if (reservasAtivas.length > 0) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Este roteiro possui reservas vinculadas. Cancele o roteiro em vez de remover, para preservar o histórico e tratar os clientes corretamente.',
        },
        { status: 409 }
      )
    }

    const atualizado = await atualizarComStatusPermitido({
      supabase,
      roteiroId,
      payloadBase: {
        ativo: false,
        removido_pelo_admin: true,
        removido_por_tipo: 'admin',
        removido_por_id: adminId,
        removido_em: new Date().toISOString(),
        excluido_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    })

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Roteiro removido pelo admin.',
      roteiro: atualizado,
    })
  } catch (error: any) {
    console.error('Erro em POST /api/admin/roteiros/excluir:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      body,
    })

    return NextResponse.json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao remover roteiro.',
      },
      { status: 500 }
    )
  }
}
