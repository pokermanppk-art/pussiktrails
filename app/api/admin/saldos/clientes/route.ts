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

function numero(valor: unknown) {
  const n = Number(valor || 0)
  return Number.isFinite(n) ? n : 0
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)

    const busca = String(searchParams.get('busca') || '').trim().toLowerCase()
    const somenteComSaldo =
      String(searchParams.get('somenteComSaldo') || 'true') !== 'false'

    let query = supabase
      .from('cliente_saldos')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(300)

    if (somenteComSaldo) {
      query = query.gt('saldo_disponivel', 0)
    }

    const { data: saldos, error: saldosError } = await query

    if (saldosError) throw saldosError

    const clienteIds = Array.from(
      new Set(
        (saldos || [])
          .map((item: AnyRecord) => item.cliente_id)
          .filter(Boolean)
      )
    )

    let usuarios: AnyRecord[] = []

    if (clienteIds.length > 0) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('id', clienteIds)

      if (!error && data) {
        usuarios = data as AnyRecord[]
      }
    }

    let reembolsosPendentes: AnyRecord[] = []

    try {
      if (clienteIds.length > 0) {
        const { data: reembolsosData } = await supabase
          .from('solicitacoes_reembolso')
          .select('id, cliente_id, valor_solicitado, status')
          .in('cliente_id', clienteIds)
          .in('status', ['pendente', 'em_analise', 'aprovado'])

        reembolsosPendentes = (reembolsosData || []) as AnyRecord[]
      }
    } catch (error) {
      console.warn('Aviso ao carregar reembolsos pendentes:', error)
    }

    const lista = (saldos || []).map((saldo: AnyRecord) => {
      const usuario =
        usuarios.find((u) => String(u.id) === String(saldo.cliente_id)) || {}

      const reembolsosCliente = reembolsosPendentes.filter(
        (item) => String(item.cliente_id) === String(saldo.cliente_id)
      )

      return {
        ...saldo,
        cliente_nome:
          usuario.nome ||
          usuario.name ||
          usuario.full_name ||
          usuario.email ||
          'Cliente',
        cliente_email: usuario.email || '',
        cliente_avatar:
          usuario.avatar_url || usuario.foto_url || usuario.imagem_url || '',
        saldo_disponivel_num: numero(saldo.saldo_disponivel),
        reembolsos_pendentes: reembolsosCliente.length,
        valor_reembolsos_pendentes: reembolsosCliente.reduce(
          (acc, item) => acc + numero(item.valor_solicitado),
          0
        ),
      }
    })

    const filtrada = busca
      ? lista.filter((item: AnyRecord) => {
          const alvo =
            `${item.cliente_nome} ${item.cliente_email} ${item.cliente_id}`.toLowerCase()

          return alvo.includes(busca)
        })
      : lista

    const totalDisponivel = filtrada.reduce(
      (acc: number, item: AnyRecord) => acc + numero(item.saldo_disponivel),
      0
    )

    const totalReembolsosPendentes = filtrada.reduce(
      (acc: number, item: AnyRecord) => acc + numero(item.valor_reembolsos_pendentes),
      0
    )

    return NextResponse.json({
      sucesso: true,
      clientes: filtrada,
      totalClientes: filtrada.length,
      totalDisponivel,
      resumo: {
        totalClientes: filtrada.length,
        totalDisponivel,
        reembolsosPendentes: filtrada.reduce(
          (acc: number, item: AnyRecord) => acc + numero(item.reembolsos_pendentes),
          0
        ),
        totalReembolsosPendentes,
      },
    })
  } catch (error) {
    console.error('Erro em GET /api/admin/saldos/clientes:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao carregar saldos dos clientes.',
      },
      { status: 500 }
    )
  }
}
