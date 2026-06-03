import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  ''

function json(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  })
}

function getSupabaseAdmin() {
  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL ausente no ambiente.')
  if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente no ambiente.')

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function erroDeColunaAusente(error: any) {
  const textoErro = String(error?.message || error?.details || error?.hint || '').toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    textoErro.includes('could not find') ||
    textoErro.includes('schema cache') ||
    textoErro.includes('column')
  )
}

function valorDoRepasse(repasse: AnyRecord) {
  return Number(
    repasse?.valor_pago ??
      repasse?.valor_repassado ??
      repasse?.valor_repasse ??
      repasse?.valor ??
      repasse?.valor_total ??
      0
  )
}

function repasseCancelado(repasse: AnyRecord) {
  const status = normalizar(repasse?.status)
  return ['cancelado', 'cancelada', 'estornado', 'estornada', 'recusado', 'recusada'].includes(status)
}

async function buscarRepassesPorGuia(params: {
  supabase: SupabaseAdmin
  guiaId: string
  limite: number
}) {
  const { supabase, guiaId, limite } = params
  const campos = ['guia_id', 'id_guia', 'user_id', 'usuario_id']
  const mapa = new Map<string, AnyRecord>()

  for (const campo of campos) {
    const { data, error } = await supabase
      .from('repasses_guias')
      .select('*')
      .eq(campo, guiaId)
      .order('created_at', { ascending: false })
      .limit(limite)

    if (error) {
      if (erroDeColunaAusente(error)) continue
      console.warn(`[admin/financeiro/repasses] Erro ao filtrar por ${campo}:`, error)
      continue
    }

    ;(data || []).forEach((repasse: AnyRecord) => {
      if (repasse?.id) mapa.set(String(repasse.id), repasse)
    })
  }

  return Array.from(mapa.values()).sort((a, b) => {
    const dataA = new Date(a.created_at || a.data_pagamento || 0).getTime()
    const dataB = new Date(b.created_at || b.data_pagamento || 0).getTime()
    return dataB - dataA
  })
}

function calcularResumo(repasses: AnyRecord[]) {
  return repasses.reduce(
    (acc, repasse) => {
      const valor = valorDoRepasse(repasse)
      acc.total += 1
      acc.valor_total += valor

      const status = normalizar(repasse.status)
      if (
        ['pago', 'paga', 'concluido', 'concluida', 'confirmado', 'aprovado', 'realizado', 'quitado'].includes(status) ||
        Boolean(repasse.data_pagamento || repasse.pago_em || repasse.comprovante_url)
      ) {
        acc.pagos += 1
        acc.valor_pago += valor
      }

      return acc
    },
    {
      total: 0,
      pagos: 0,
      valor_total: 0,
      valor_pago: 0,
    }
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)

    const guiaId = texto(searchParams.get('guiaId') || searchParams.get('guia_id') || searchParams.get('id_guia'))
    const limite = Math.min(Math.max(Number(searchParams.get('limite') || 2500), 1), 5000)
    const incluirCancelados = ['1', 'true', 'sim'].includes(normalizar(searchParams.get('incluirCancelados')))

    let repasses: AnyRecord[] = []

    if (guiaId) {
      repasses = await buscarRepassesPorGuia({ supabase, guiaId, limite })
    } else {
      const { data, error } = await supabase
        .from('repasses_guias')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limite)

      if (error) {
        return json(
          {
            sucesso: false,
            erro: error.message || 'Erro ao buscar repasses.',
          },
          500
        )
      }

      repasses = Array.isArray(data) ? (data as AnyRecord[]) : []
    }

    if (!incluirCancelados) {
      repasses = repasses.filter((repasse) => !repasseCancelado(repasse))
    }

    return json({
      sucesso: true,
      repasses,
      data: repasses,
      resumo: calcularResumo(repasses),
    })
  } catch (error: any) {
    console.error('Erro em /api/admin/financeiro/repasses:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao buscar repasses.',
      },
      500
    )
  }
}
