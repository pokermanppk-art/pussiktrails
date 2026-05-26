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

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function numero(valor: unknown) {
  const n = Number(valor || 0)
  return Number.isFinite(n) ? n : 0
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)

    const busca = texto(searchParams.get('busca')).toLowerCase()
    const status = texto(searchParams.get('status') || 'todos')
    const tipo = texto(searchParams.get('tipo') || 'todos')
    const limite = Math.min(
      500,
      Math.max(20, Number(searchParams.get('limite') || 200))
    )

    let query = supabase
      .from('reserva_cancelamentos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite)

    if (status !== 'todos') {
      query = query.eq('status', status)
    }

    if (tipo !== 'todos') {
      query = query.eq('cancelado_por_tipo', tipo)
    }

    const { data: cancelamentos, error } = await query

    if (error) throw error

    const listaBase: AnyRecord[] = (cancelamentos || []) as AnyRecord[]

    const clienteIds = Array.from(
      new Set(listaBase.map((item) => item.cliente_id).filter(Boolean))
    )

    const guiaIds = Array.from(
      new Set(listaBase.map((item) => item.guia_id).filter(Boolean))
    )

    const roteiroIds = Array.from(
      new Set(listaBase.map((item) => item.roteiro_id).filter(Boolean))
    )

    const usuarioIds = Array.from(new Set([...clienteIds, ...guiaIds]))

    let usuarios: AnyRecord[] = []
    let roteiros: AnyRecord[] = []

    if (usuarioIds.length > 0) {
      const { data, error: usuariosError } = await supabase
        .from('users')
        .select('*')
        .in('id', usuarioIds)

      if (!usuariosError && data) {
        usuarios = data as AnyRecord[]
      }
    }

    if (roteiroIds.length > 0) {
      const { data, error: roteirosError } = await supabase
        .from('roteiros')
        .select('*')
        .in('id', roteiroIds)

      if (!roteirosError && data) {
        roteiros = data as AnyRecord[]
      }
    }

    const lista: AnyRecord[] = listaBase.map((item: AnyRecord): AnyRecord => {
      const cliente =
        usuarios.find((user) => String(user.id) === String(item.cliente_id)) ||
        {}

      const guia =
        usuarios.find((user) => String(user.id) === String(item.guia_id)) ||
        {}

      const roteiro =
        roteiros.find((r) => String(r.id) === String(item.roteiro_id)) || {}

      return {
        ...item,

        cliente_nome:
          cliente.nome ||
          cliente.name ||
          cliente.full_name ||
          cliente.email ||
          'Cliente',

        cliente_email: cliente.email || '',

        guia_nome:
          guia.nome ||
          guia.name ||
          guia.full_name ||
          guia.email ||
          'Guia',

        guia_email: guia.email || '',

        roteiro_titulo: roteiro.titulo || roteiro.nome || 'Roteiro',
      }
    })

    const filtrada: AnyRecord[] = busca
      ? lista.filter((item: AnyRecord) => {
          const alvo = [
            item.cliente_nome,
            item.cliente_email,
            item.guia_nome,
            item.guia_email,
            item.roteiro_titulo,
            item.motivo_descricao,
            item.motivo_codigo,
            item.reserva_id,
            item.roteiro_id,
          ]
            .join(' ')
            .toLowerCase()

          return alvo.includes(busca)
        })
      : lista

    const totalCreditado = filtrada.reduce(
      (acc: number, item: AnyRecord) => acc + numero(item.valor_creditado),
      0
    )

    const totalRetidoPlataforma = filtrada.reduce(
      (acc: number, item: AnyRecord) =>
        acc + numero(item.valor_retido_plataforma),
      0
    )

    const totalOriginal = filtrada.reduce(
      (acc: number, item: AnyRecord) => acc + numero(item.valor_original),
      0
    )

    const porTipo = filtrada.reduce<Record<string, number>>(
      (acc, item: AnyRecord) => {
        const chave = texto(item.cancelado_por_tipo || 'indefinido')
        acc[chave] = (acc[chave] || 0) + 1
        return acc
      },
      {}
    )

    const porStatus = filtrada.reduce<Record<string, number>>(
      (acc, item: AnyRecord) => {
        const chave = texto(item.status || 'indefinido')
        acc[chave] = (acc[chave] || 0) + 1
        return acc
      },
      {}
    )

    return NextResponse.json({
      sucesso: true,
      cancelamentos: filtrada,
      resumo: {
        total: filtrada.length,
        totalOriginal,
        totalCreditado,
        totalRetidoPlataforma,
        porTipo,
        porStatus,
      },
    })
  } catch (error) {
    console.error('Erro em GET /api/admin/cancelamentos:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao carregar cancelamentos.',
      },
      { status: 500 }
    )
  }
}