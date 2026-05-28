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

async function inserirReservaComFallback(params: {
  supabase: any
  payloadOriginal: AnyRecord
}) {
  const { supabase } = params
  let payload: AnyRecord = { ...params.payloadOriginal }

  for (let tentativa = 0; tentativa < 16; tentativa++) {
    const { data, error } = await supabase
      .from('reservas')
      .insert(payload)
      .select('*')
      .maybeSingle()

    if (!error) {
      return data
    }

    if (!erroDeColunaAusente(error)) {
      throw error
    }

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payload)) {
      throw error
    }

    delete payload[coluna]
  }

  throw new Error('Não foi possível criar a reserva após ajustar colunas opcionais.')
}

function dataNormalizada(valor: unknown) {
  const bruto = texto(valor)

  if (!bruto) return null

  const yyyyMmDd = bruto.slice(0, 10)

  if (/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return yyyyMmDd

  return null
}

function roteiroAtivo(roteiro: AnyRecord) {
  const status = normalizar(roteiro.status)

  if (roteiro.excluido_admin === true) return false
  if (status === 'excluido_admin') return false
  if (status === 'cancelado' || status === 'cancelada') return false
  if (status === 'reprovado') return false

  if (typeof roteiro.ativo === 'boolean') return roteiro.ativo

  return status === 'ativo' || status === 'publicado' || status === 'publicada' || !status
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const clienteId = texto(
      body.clienteId ||
        body.cliente_id ||
        body.usuarioId ||
        body.usuario_id ||
        body.userId ||
        body.user_id
    )

    const roteiroId = texto(
      body.roteiroId ||
        body.roteiro_id ||
        body.idRoteiro ||
        body.id_roteiro
    )

    const quantidadePessoas = Math.max(
      1,
      Math.floor(numero(body.quantidadePessoas || body.quantidade_pessoas || 1))
    )

    if (!clienteId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'clienteId é obrigatório para criar a reserva.',
        },
        { status: 400 }
      )
    }

    if (!roteiroId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'roteiroId é obrigatório para criar a reserva.',
        },
        { status: 400 }
      )
    }

    const { data: cliente, error: clienteError } = await supabase
      .from('users')
      .select('id, nome, name, email, tipo')
      .eq('id', clienteId)
      .maybeSingle()

    if (clienteError) throw clienteError

    if (!cliente?.id) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Cliente não encontrado. Faça login novamente.',
        },
        { status: 404 }
      )
    }

    if (normalizar(cliente.tipo) !== 'cliente') {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'A reserva só pode ser criada por um perfil de cliente.',
        },
        { status: 403 }
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
        {
          sucesso: false,
          erro: 'Roteiro não encontrado.',
        },
        { status: 404 }
      )
    }

    if (!roteiroAtivo(roteiro as AnyRecord)) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Este roteiro não está disponível para reserva no momento.',
        },
        { status: 409 }
      )
    }

    const valorUnitarioServidor = numero(
      (roteiro as AnyRecord).preco || (roteiro as AnyRecord).valor
    )

    if (valorUnitarioServidor <= 0) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Este roteiro está sem valor válido para reserva.',
        },
        { status: 409 }
      )
    }

    const limitePessoas = numero(
      (roteiro as AnyRecord).limite_pessoas ||
        (roteiro as AnyRecord).capacidade ||
        (roteiro as AnyRecord).max_pessoas
    )

    if (limitePessoas > 0 && quantidadePessoas > limitePessoas) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: `Este roteiro permite no máximo ${limitePessoas} pessoa(s) por reserva.`,
        },
        { status: 409 }
      )
    }

    const valorTotal = Number((valorUnitarioServidor * quantidadePessoas).toFixed(2))
    const agora = new Date().toISOString()

    const dataTrilha =
      dataNormalizada(body.dataTrilha || body.data_trilha) ||
      dataNormalizada(
        (roteiro as AnyRecord).data_roteiro ||
          (roteiro as AnyRecord).data_saida ||
          (roteiro as AnyRecord).data_trilha ||
          (roteiro as AnyRecord).proxima_data ||
          (roteiro as AnyRecord).data
      )

    const payload: AnyRecord = {
      cliente_id: clienteId,
      roteiro_id: roteiroId,
      quantidade_pessoas: quantidadePessoas,
      valor_total: valorTotal,
      status: 'pendente',
      pagamento_status: 'pendente',
      forma_pagamento: 'pix',
      data_trilha: dataTrilha,
      created_at: agora,
      updated_at: agora,
    }

    const reserva = await inserirReservaComFallback({
      supabase,
      payloadOriginal: payload,
    })

    if (!reserva?.id) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Reserva criada sem identificador. Verifique a tabela reservas.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sucesso: true,
      reserva,
      reservaId: reserva.id,
      valorUnitario: valorUnitarioServidor,
      valorTotal,
      quantidadePessoas,
    })
  } catch (error: any) {
    console.error('Erro em POST /api/reservas/criar:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      raw: error,
    })

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error?.message ||
          'Erro interno ao criar reserva.',
        detalhe: {
          code: error?.code || null,
          details: error?.details || null,
          hint: error?.hint || null,
        },
      },
      { status: 500 }
    )
  }
}
