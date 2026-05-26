import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

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

function limparId(valor: unknown) {
  return String(valor || '').trim() || null
}

function numeroPositivo(valor: unknown) {
  const n = Number(valor || 0)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()

    const clienteId = limparId(body.clienteId || body.cliente_id)
    const valor = numeroPositivo(body.valor)
    const operacao = String(body.operacao || 'credito').trim()
    const descricao = String(body.descricao || '').trim()
    const motivo = String(body.motivo || '').trim()
    const criadoPorId = limparId(
      body.adminId ||
        body.admin_id ||
        body.criadoPorId ||
        body.criado_por_id
    )
    const reservaId = limparId(body.reservaId || body.reserva_id)
    const roteiroId = limparId(body.roteiroId || body.roteiro_id)
    const guiaId = limparId(body.guiaId || body.guia_id)

    if (!clienteId) {
      return NextResponse.json(
        { sucesso: false, erro: 'clienteId é obrigatório.' },
        { status: 400 }
      )
    }

    if (!valor) {
      return NextResponse.json(
        { sucesso: false, erro: 'valor deve ser maior que zero.' },
        { status: 400 }
      )
    }

    if (operacao === 'debito') {
      const { error } = await supabase
        .from('cliente_saldo_movimentacoes')
        .insert({
          cliente_id: clienteId,
          reserva_id: reservaId,
          roteiro_id: roteiroId,
          guia_id: guiaId,
          tipo: 'ajuste_admin_debito',
          origem: 'admin',
          valor: -Math.abs(valor),
          status: 'efetivado',
          descricao: descricao || 'Ajuste administrativo de débito.',
          motivo: motivo || 'ajuste_admin',
          criado_por_id: criadoPorId,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      await supabase.rpc('recalcular_saldo_cliente', {
        p_cliente_id: clienteId,
      })

      return NextResponse.json({
        sucesso: true,
        operacao: 'debito',
      })
    }

    const { data: movimentacaoId, error: rpcError } = await supabase.rpc(
      'creditar_saldo_cliente',
      {
        p_cliente_id: clienteId,
        p_valor: valor,
        p_tipo: String(body.tipo || 'ajuste_admin_credito'),
        p_origem: 'admin',
        p_descricao:
          descricao || 'Crédito administrativo em saldo PrussikTrails.',
        p_motivo: motivo || 'ajuste_admin',
        p_reserva_id: reservaId,
        p_roteiro_id: roteiroId,
        p_guia_id: guiaId,
        p_criado_por_id: criadoPorId,
      }
    )

    if (rpcError) throw rpcError

    return NextResponse.json({
      sucesso: true,
      operacao: 'credito',
      movimentacaoId,
    })
  } catch (error) {
    console.error('Erro em POST /api/admin/saldos/creditar:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao ajustar saldo do cliente.',
      },
      { status: 500 }
    )
  }
}