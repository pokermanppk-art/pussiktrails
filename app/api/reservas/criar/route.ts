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

function apenasData(valor: unknown) {
  const bruto = texto(valor)

  if (!bruto) return ''

  // Já veio como YYYY-MM-DD.
  if (/^\d{4}-\d{2}-\d{2}$/.test(bruto)) return bruto

  const data = new Date(bruto)

  if (Number.isNaN(data.getTime())) return bruto

  return data.toISOString().slice(0, 10)
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
}): Promise<AnyRecord> {
  const { supabase } = params
  let payload: AnyRecord = { ...params.payloadOriginal }

  for (let tentativa = 0; tentativa < 14; tentativa++) {
    const { data, error } = await supabase
      .from('reservas')
      .insert(payload)
      .select('*')
      .single()

    if (!error) return (data || {}) as AnyRecord

    if (!erroDeColunaAusente(error)) {
      throw error
    }

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payload)) {
      throw error
    }

    delete payload[coluna]
  }

  throw new Error('Não foi possível criar a reserva após ajustar colunas ausentes.')
}

export async function GET() {
  return NextResponse.json({
    sucesso: true,
    rota: '/api/reservas/criar',
    mensagem: 'Rota ativa. Use POST para criar reserva.',
  })
}

export async function POST(request: NextRequest) {
  let recebido: AnyRecord = {}

  try {
    const supabase = getSupabaseAdmin()

    recebido = await request.json().catch(() => ({}))

    const clienteId = texto(
      recebido.clienteId ||
        recebido.cliente_id ||
        recebido.usuarioId ||
        recebido.usuario_id
    )

    const roteiroId = texto(
      recebido.roteiroId ||
        recebido.roteiro_id ||
        recebido.idRoteiro ||
        recebido.id_roteiro
    )

    const quantidadePessoas = Math.max(
      1,
      Math.floor(numero(recebido.quantidadePessoas || recebido.quantidade_pessoas || 1))
    )

    const valorUnitarioInformado = numero(
      recebido.valorUnitario ||
        recebido.valor_unitario ||
        recebido.preco ||
        recebido.valor
    )

    const valorTotalInformado = numero(
      recebido.valorTotal ||
        recebido.valor_total
    )

    if (!clienteId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'clienteId é obrigatório.',
          recebido,
        },
        { status: 400 }
      )
    }

    if (!roteiroId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'roteiroId é obrigatório.',
          recebido,
        },
        { status: 400 }
      )
    }

    const { data: cliente, error: clienteError } = await supabase
      .from('users')
      .select('*')
      .eq('id', clienteId)
      .maybeSingle()

    if (clienteError) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: clienteError.message || 'Erro ao localizar cliente.',
          detalhe: {
            code: clienteError.code,
            details: clienteError.details,
            hint: clienteError.hint,
            message: clienteError.message,
          },
          recebido,
        },
        { status: 500 }
      )
    }

    if (!cliente) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Cliente não encontrado.',
          recebido,
        },
        { status: 404 }
      )
    }

    const tipoCliente = normalizar((cliente as AnyRecord).tipo)

    if (tipoCliente && tipoCliente !== 'cliente') {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Apenas usuários do tipo cliente podem reservar roteiros.',
          recebido,
          cliente: {
            id: (cliente as AnyRecord).id,
            tipo: (cliente as AnyRecord).tipo,
            nome: (cliente as AnyRecord).nome || (cliente as AnyRecord).email || '',
          },
        },
        { status: 403 }
      )
    }

    const { data: roteiro, error: roteiroError } = await supabase
      .from('roteiros')
      .select('*')
      .eq('id', roteiroId)
      .maybeSingle()

    if (roteiroError) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: roteiroError.message || 'Erro ao localizar roteiro.',
          detalhe: {
            code: roteiroError.code,
            details: roteiroError.details,
            hint: roteiroError.hint,
            message: roteiroError.message,
          },
          recebido,
        },
        { status: 500 }
      )
    }

    if (!roteiro) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Roteiro não encontrado.',
          recebido,
        },
        { status: 404 }
      )
    }

    const roteiroRecord = roteiro as AnyRecord

    const precoBanco = numero(roteiroRecord.preco || roteiroRecord.valor)
    const valorUnitario = valorUnitarioInformado || precoBanco

    if (valorUnitario <= 0) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Não foi possível calcular o valor do roteiro.',
          recebido,
          roteiro: {
            id: roteiroRecord.id,
            titulo: roteiroRecord.titulo || roteiroRecord.nome || '',
            preco: roteiroRecord.preco,
            valor: roteiroRecord.valor,
          },
        },
        { status: 400 }
      )
    }

    const valorTotal = Number(
      (valorTotalInformado > 0
        ? valorTotalInformado
        : valorUnitario * quantidadePessoas
      ).toFixed(2)
    )

    const dataTrilha = apenasData(
      recebido.dataTrilha ||
        recebido.data_trilha ||
        recebido.dataRoteiro ||
        recebido.data_roteiro ||
        roteiroRecord.data_trilha ||
        roteiroRecord.data_roteiro ||
        roteiroRecord.data_saida ||
        roteiroRecord.data
    )

    if (!dataTrilha) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            'A data da trilha é obrigatória para criar a reserva. Preencha a data do roteiro antes de reservar.',
          recebido,
          roteiro: {
            id: roteiroRecord.id,
            titulo: roteiroRecord.titulo || roteiroRecord.nome || '',
            data_trilha: roteiroRecord.data_trilha || null,
            data_roteiro: roteiroRecord.data_roteiro || null,
            data_saida: roteiroRecord.data_saida || null,
            data: roteiroRecord.data || null,
          },
        },
        { status: 400 }
      )
    }

    const agora = new Date().toISOString()

    const payloadReserva: AnyRecord = {
      cliente_id: clienteId,
      roteiro_id: roteiroId,
      quantidade_pessoas: quantidadePessoas,
      valor_total: valorTotal,
      data_trilha: dataTrilha,
      status: 'pendente',
      pagamento_status: 'pendente',
      forma_pagamento: null,
      saldo_utilizado: 0,
      created_at: agora,
      updated_at: agora,
    }

    const reservaCriada: AnyRecord = await inserirReservaComFallback({
      supabase,
      payloadOriginal: payloadReserva,
    })

    const reservaCriadaId = texto(reservaCriada.id)

    return NextResponse.json({
      sucesso: true,
      reserva: reservaCriada,
      reservaId: reservaCriadaId,
      redirectUrl: reservaCriadaId
        ? `/cliente/pagamento/${reservaCriadaId}`
        : '',
      cliente: {
        id: (cliente as AnyRecord).id,
        nome: (cliente as AnyRecord).nome || (cliente as AnyRecord).email || '',
        email: (cliente as AnyRecord).email || '',
      },
      roteiro: {
        id: roteiroRecord.id,
        titulo: roteiroRecord.titulo || roteiroRecord.nome || 'Roteiro',
        valor_unitario: valorUnitario,
        data_trilha: dataTrilha,
      },
      payload: payloadReserva,
    })
  } catch (error: any) {
    console.error('Erro em POST /api/reservas/criar:', {
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
          'Erro ao criar reserva.',
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
