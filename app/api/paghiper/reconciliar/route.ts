import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''

const pagHiperApiKey = process.env.PAGHIPER_API_KEY || ''
const pagHiperToken = process.env.PAGHIPER_TOKEN || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

type Reserva = {
  id: string
  cliente_id?: string | null
  status?: string | null
  pagamento_status?: string | null
  paghiper_transaction_id?: string | null
  paghiper_order_id?: string | null
  transaction_id?: string | null
  order_id?: string | null
  created_at?: string | null
}

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function normalizarTexto(valor: any) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function limparOrderId(orderId: string) {
  return String(orderId || '')
    .replace(/^RESERVA-/i, '')
    .trim()
}

function buscarRecursivo(obj: any, nomes: string[]): string {
  if (!obj || typeof obj !== 'object') return ''

  for (const nome of nomes) {
    const valor = obj[nome]

    if (typeof valor === 'string' && valor.trim()) {
      return valor.trim()
    }

    if (typeof valor === 'number') {
      return String(valor)
    }
  }

  for (const key of Object.keys(obj)) {
    const encontrado = buscarRecursivo(obj[key], nomes)

    if (encontrado) return encontrado
  }

  return ''
}

function pagamentoJaConfirmado(reserva: Reserva) {
  const pagamento = normalizarTexto(reserva.pagamento_status)
  const status = normalizarTexto(reserva.status)

  return (
    pagamento === 'pago' ||
    pagamento === 'confirmado' ||
    status === 'confirmada'
  )
}

function statusPago(status: string) {
  const s = normalizarTexto(status)

  return [
    'paid',
    'pago',
    'aprovado',
    'aprovada',
    'approved',
    'complete',
    'completed',
    'completo',
    'confirmado',
    'confirmed',
    'liquidado',
    'settled',
    'reserved',
    'reservado'
  ].includes(s)
}

function statusPendente(status: string) {
  const s = normalizarTexto(status)

  return [
    'pending',
    'pendente',
    'waiting',
    'aguardando',
    'created',
    'criado',
    'processing',
    'processando',
    'em aberto',
    'open'
  ].includes(s)
}

function extrairColunaAusente(error: any) {
  const texto = [
    error?.message,
    error?.details,
    error?.hint
  ]
    .filter(Boolean)
    .join(' ')

  const matchAspas = texto.match(/'([^']+)'/)

  if (matchAspas?.[1]) {
    return matchAspas[1]
  }

  const matchColumn = texto.match(/column\s+([a-zA-Z0-9_]+)/i)

  if (matchColumn?.[1]) {
    return matchColumn[1]
  }

  return ''
}

function erroDeColunaAusente(error: any) {
  const texto = String(
    error?.message ||
      error?.details ||
      error?.hint ||
      ''
  ).toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    texto.includes('could not find') ||
    texto.includes('schema cache') ||
    texto.includes('column')
  )
}

async function atualizarReservaComFallback(
  reservaId: string,
  payloadOriginal: Record<string, any>
) {
  let payloadAtual = { ...payloadOriginal }
  const colunasIgnoradas: string[] = []

  for (let tentativa = 0; tentativa < 12; tentativa++) {
    const { data, error } = await supabase
      .from('reservas')
      .update(payloadAtual)
      .eq('id', reservaId)
      .select()
      .maybeSingle()

    if (!error) {
      return {
        data,
        colunasIgnoradas
      }
    }

    if (!erroDeColunaAusente(error)) {
      throw error
    }

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payloadAtual)) {
      throw error
    }

    delete payloadAtual[coluna]
    colunasIgnoradas.push(coluna)
  }

  throw new Error('Não foi possível atualizar a reserva.')
}

async function consultarPagHiper({
  transactionId,
  orderId
}: {
  transactionId?: string | null
  orderId?: string | null
}) {
  const endpoints = [
    'https://pix.paghiper.com/invoice/status/',
    'https://api.paghiper.com/transaction/status/'
  ]

  const payloads: Record<string, any>[] = []

  if (transactionId) {
    payloads.push({
      apiKey: pagHiperApiKey,
      token: pagHiperToken,
      transaction_id: transactionId
    })
  }

  if (orderId) {
    payloads.push({
      apiKey: pagHiperApiKey,
      token: pagHiperToken,
      order_id: orderId
    })

    const orderIdLimpo = limparOrderId(orderId)

    if (orderIdLimpo && orderIdLimpo !== orderId) {
      payloads.push({
        apiKey: pagHiperApiKey,
        token: pagHiperToken,
        order_id: orderIdLimpo
      })
    }
  }

  const respostas: any[] = []

  for (const endpoint of endpoints) {
    for (const payload of payloads) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        const texto = await response.text()

        let data: any = null

        try {
          data = texto ? JSON.parse(texto) : null
        } catch {
          data = {
            raw: texto
          }
        }

        const statusEncontrado = buscarRecursivo(data, [
          'status',
          'status_transaction',
          'transaction_status',
          'payment_status',
          'status_pagamento',
          'result'
        ])

        const transactionIdEncontrado = buscarRecursivo(data, [
          'transaction_id',
          'transactionId',
          'id_transacao'
        ])

        respostas.push({
          endpoint,
          statusHttp: response.status,
          ok: response.ok,
          payloadUsado: payload,
          statusEncontrado,
          transactionIdEncontrado,
          data
        })

        if (response.ok && statusEncontrado) {
          return {
            sucesso: true,
            endpoint,
            status: statusEncontrado,
            transactionId: transactionIdEncontrado,
            data,
            respostas
          }
        }
      } catch (error: any) {
        respostas.push({
          endpoint,
          erro: error?.message || 'Erro ao consultar endpoint PagHiper.'
        })
      }
    }
  }

  return {
    sucesso: false,
    status: '',
    data: null,
    respostas
  }
}

async function buscarReservasParaReconciliar({
  reservaId,
  clienteId,
  orderId,
  transactionId
}: {
  reservaId?: string
  clienteId?: string
  orderId?: string
  transactionId?: string
}) {
  if (reservaId) {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', reservaId)

    if (error) throw error

    return (data || []) as Reserva[]
  }

  if (clienteId) {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('cliente_id', clienteId)
      .not('status', 'eq', 'cancelada')
      .order('created_at', { ascending: false })

    if (error) throw error

    return ((data || []) as Reserva[]).filter(
      (reserva) => !pagamentoJaConfirmado(reserva)
    )
  }

  if (transactionId) {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .or(
        `paghiper_transaction_id.eq.${transactionId},transaction_id.eq.${transactionId}`
      )

    if (error) throw error

    return (data || []) as Reserva[]
  }

  if (orderId) {
    const orderIdLimpo = limparOrderId(orderId)

    const filtros = [
      `paghiper_order_id.eq.${orderId}`,
      `order_id.eq.${orderId}`
    ]

    if (orderIdLimpo && orderIdLimpo !== orderId) {
      filtros.push(`paghiper_order_id.eq.${orderIdLimpo}`)
      filtros.push(`order_id.eq.${orderIdLimpo}`)
      filtros.push(`id.eq.${orderIdLimpo}`)
    }

    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .or(filtros.join(','))

    if (error) throw error

    return (data || []) as Reserva[]
  }

  return []
}

async function reconciliarReserva(reserva: Reserva) {
  if (pagamentoJaConfirmado(reserva)) {
    return {
      reservaId: reserva.id,
      jaEstavaConfirmada: true,
      atualizado: false
    }
  }

  const transactionId =
    reserva.paghiper_transaction_id ||
    reserva.transaction_id ||
    ''

  const orderId =
    reserva.paghiper_order_id ||
    reserva.order_id ||
    reserva.id

  if (!transactionId && !orderId) {
    return {
      reservaId: reserva.id,
      atualizado: false,
      motivo:
        'Reserva sem transaction_id/order_id. Não foi possível consultar a PagHiper.'
    }
  }

  const consulta = await consultarPagHiper({
    transactionId,
    orderId
  })

  const statusPagHiper = consulta.status || ''

  if (!statusPagHiper) {
    return {
      reservaId: reserva.id,
      atualizado: false,
      motivo: 'PagHiper não retornou status reconhecível.',
      consulta
    }
  }

  if (statusPago(statusPagHiper)) {
    const payloadUpdate = {
      pagamento_status: 'pago',
      status: 'confirmada',
      paghiper_status: statusPagHiper,
      pagamento_confirmado_em: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const update = await atualizarReservaComFallback(
      reserva.id,
      payloadUpdate
    )

    return {
      reservaId: reserva.id,
      atualizado: true,
      statusPagHiper,
      update
    }
  }

  if (statusPendente(statusPagHiper)) {
    return {
      reservaId: reserva.id,
      atualizado: false,
      statusPagHiper,
      motivo: 'Pagamento ainda pendente na PagHiper.'
    }
  }

  return {
    reservaId: reserva.id,
    atualizado: false,
    statusPagHiper,
    motivo: 'Status PagHiper não tratado como confirmado.',
    consulta
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return json(
        {
          sucesso: false,
          erro: 'Credenciais Supabase ausentes.'
        },
        500
      )
    }

    if (!pagHiperApiKey || !pagHiperToken) {
      return json(
        {
          sucesso: false,
          erro: 'Credenciais PagHiper ausentes.'
        },
        500
      )
    }

    const body = await request.json().catch(() => ({}))

    const reservaId =
      body.reservaId ||
      body.reserva_id ||
      body.id ||
      ''

    const clienteId =
      body.clienteId ||
      body.cliente_id ||
      ''

    const orderId =
      body.orderId ||
      body.order_id ||
      body.paghiper_order_id ||
      ''

    const transactionId =
      body.transactionId ||
      body.transaction_id ||
      body.paghiper_transaction_id ||
      ''

    if (!reservaId && !clienteId && !orderId && !transactionId) {
      return json(
        {
          sucesso: false,
          erro:
            'Informe reservaId, clienteId, orderId ou transactionId para reconciliar.'
        },
        400
      )
    }

    const reservas = await buscarReservasParaReconciliar({
      reservaId,
      clienteId,
      orderId,
      transactionId
    })

    if (reservas.length === 0) {
      return json(
        {
          sucesso: false,
          erro: 'Nenhuma reserva encontrada para reconciliar.',
          filtros: {
            reservaId,
            clienteId,
            orderId,
            transactionId
          }
        },
        404
      )
    }

    const resultados = []

    for (const reserva of reservas) {
      const resultado = await reconciliarReserva(reserva)
      resultados.push(resultado)
    }

    const atualizadas = resultados.filter(
      (item: any) => item.atualizado
    ).length

    const jaConfirmadas = resultados.filter(
      (item: any) => item.jaEstavaConfirmada
    ).length

    return json({
      sucesso: true,
      total: resultados.length,
      atualizadas,
      jaConfirmadas,
      resultados
    })
  } catch (error: any) {
    console.error('Erro na reconciliação PagHiper:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno na reconciliação PagHiper.'
      },
      500
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const reservaId = searchParams.get('reservaId') || ''
  const clienteId = searchParams.get('clienteId') || ''
  const orderId = searchParams.get('orderId') || ''
  const transactionId = searchParams.get('transactionId') || ''

  const fakeRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      reservaId,
      clienteId,
      orderId,
      transactionId
    })
  })

  return POST(fakeRequest)
}