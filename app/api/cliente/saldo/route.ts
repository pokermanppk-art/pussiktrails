import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type AnyRecord = Record<string, any>

function getSupabaseAdmin() {
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

function extrairClienteId(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  return String(
    searchParams.get('clienteId') ||
      searchParams.get('cliente_id') ||
      searchParams.get('usuarioId') ||
      searchParams.get('usuario_id') ||
      ''
  ).trim()
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const clienteId = extrairClienteId(request)

    if (!clienteId) {
      return NextResponse.json(
        { sucesso: false, erro: 'clienteId é obrigatório.' },
        { status: 400 }
      )
    }

    try {
      await supabase.rpc('recalcular_saldo_cliente', {
        p_cliente_id: clienteId,
      })
    } catch (rpcError) {
      console.warn('Aviso ao recalcular saldo do cliente:', rpcError)
    }

    const { data: saldo, error: saldoError } = await supabase
      .from('cliente_saldos')
      .select('*')
      .eq('cliente_id', clienteId)
      .maybeSingle()

    if (saldoError) throw saldoError

    const { data: movimentacoes, error: movError } = await supabase
      .from('cliente_saldo_movimentacoes')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })
      .limit(40)

    if (movError) throw movError

    let reembolsos: AnyRecord[] = []

    try {
      const { data: reembolsosData, error: reembolsoError } = await supabase
        .from('solicitacoes_reembolso')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (reembolsoError) {
        console.warn('Aviso ao carregar reembolsos do cliente:', reembolsoError)
      } else {
        reembolsos = (reembolsosData || []) as AnyRecord[]
      }
    } catch (reembolsoCatch) {
      console.warn('Aviso: tabela solicitacoes_reembolso indisponível:', reembolsoCatch)
    }

    const saldoSeguro: AnyRecord = saldo || {
      cliente_id: clienteId,
      saldo_disponivel: 0,
      saldo_reservado: 0,
      saldo_utilizado: 0,
      saldo_expirado: 0,
      moeda: 'BRL',
    }

    return NextResponse.json({
      sucesso: true,
      saldo: saldoSeguro,
      movimentacoes: movimentacoes || [],
      reembolsos,
    })
  } catch (error) {
    console.error('Erro em GET /api/cliente/saldo:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao carregar saldo do cliente.',
      },
      { status: 500 }
    )
  }
}
