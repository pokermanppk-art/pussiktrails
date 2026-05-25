import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Reserva = {
  id: string
  cliente_id?: string | null
  roteiro_id?: string | null
  status?: string | null
  pagamento_status?: string | null
  paghiper_order_id?: string | null
  paghiper_transaction_id?: string | null
  order_id?: string | null
  transaction_id?: string | null
  chat_id?: string | null
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''

const pagHiperApiKey = process.env.PAGHIPER_API_KEY || ''
const pagHiperToken = process.env.PAGHIPER_TOKEN || ''

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Credenciais Supabase ausentes.')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
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

function statusCancelado(status: string) {
  const s = normalizarTexto(status)

  return [
    'cancelado',
    'cancelada',
    'canceled',
    'cancelled',
    'expired',
    'expirado',
    'rejected',
    'recusado',
    'recusada'
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

async function parseBody(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''
  const texto = await request.text()

  if (!texto) {
    return {}
  }

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(texto)
    } catch {
      return {
        raw: texto
      }
    }
  }

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    texto.includes('=')
  ) {
    const params = new URLSearchParams(texto)
    const obj: Record<string, any> = {}

    params.forEach((value, key) => {
      obj[key] = value
    })

    return obj
  }

  try {
    return JSON.parse(texto)
  } catch {
    return {
      raw: texto
    }
  }
}

async function atualizarReservaComFallback(
  supabase: ReturnType<typeof createClient>,
  reservaId: string,
  payloadOriginal: Record<string, any>
) {
  let payloadAtual = { ...payloadOriginal }
  const colunasIgnoradas: string[] = []

  for (let tentativa = 0; tentativa < 15; tentativa++) {
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

async function buscarReserva({
  supabase,
  reservaId,
  orderId,
  transactionId
}: {
  supabase: ReturnType<typeof createClient>
  reservaId?: string
  orderId?: string
  transactionId?: string
}) {
  if (reservaId) {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', reservaId)
      .maybeSingle()

    if (error) throw error
    if (data) return data as Reserva
  }

  if (transactionId) {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .or(
        `paghiper_transaction_id.eq.${transactionId},transaction_id.eq.${transactionId}`
      )
      .maybeSingle()

    if (error) throw error
    if (data) return data as Reserva
  }

  if (orderId) {
    const orderIdLimpo = limparOrderId(orderId)

    const filtros = [
      `paghiper_order_id.eq.${orderId}`,
      `order_id.eq.${orderId}`
    ]

    if (orderIdLimpo) {
      filtros.push(`id.eq.${orderIdLimpo}`)
      filtros.push(`paghiper_order_id.eq.${orderIdLimpo}`)
      filtros.push(`order_id.eq.${orderIdLimpo}`)
    }

    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .or(filtros.join(','))
      .maybeSingle()

    if (error) throw error
    if (data) return data as Reserva
  }

  return null
}

async function consultarStatusPagHiper({
  transactionId,
  orderId
}: {
  transactionId?: string
  orderId?: string
}) {
  if (!pagHiperApiKey || !pagHiperToken) {
    return {
      sucesso: false,
      status: '',
      erro: 'Credenciais PagHiper ausentes.'
    }
  }

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
          'paghiper_transaction_id',
          'id_transacao'
        ])

        respostas.push({
          endpoint,
          statusHttp: response.status,
          ok: response.ok,
          statusEncontrado,
          transactionIdEncontrado,
          data
        })

        if (response.ok && statusEncontrado) {
          return {
            sucesso: true,
            status: statusEncontrado,
            transactionId: transactionIdEncontrado,
            data,
            respostas
          }
        }
      } catch (error: any) {
        respostas.push({
          endpoint,
          erro: error?.message || 'Erro ao consultar PagHiper.'
        })
      }
    }
  }

  return {
    sucesso: false,
    status: '',
    respostas
  }
}

async function tentarCriarChatSePossivel({
  supabase,
  reserva
}: {
  supabase: ReturnType<typeof createClient>
  reserva: Reserva
}) {
  try {
    if (reserva.chat_id) {
      return {
        criado: false,
        chatId: reserva.chat_id,
        motivo: 'Reserva já possui chat_id.'
      }
    }

    const { data: roteiro, error: roteiroError } = await supabase
      .from('roteiros')
      .select('id, id_guia')
      .eq('id', reserva.roteiro_id)
      .maybeSingle()

    if (roteiroError || !roteiro?.id_guia || !reserva.cliente_id) {
      return {
        criado: false,
        motivo: 'Não foi possível identificar cliente ou guia para criar chat.'
      }
    }

    const { data: chatExistente, error: chatExistenteError } = await supabase
      .from('chats')
      .select('*')
      .eq('reserva_id', reserva.id)
      .maybeSingle()

    if (!chatExistenteError && chatExistente?.id) {
      await atualizarReservaComFallback(supabase, reserva.id, {
        chat_id: chatExistente.id,
        updated_at: new Date().toISOString()
      })

      return {
        criado: false,
        chatId: chatExistente.id,
        motivo: 'Chat já existia.'
      }
    }

    const { data: novoChat, error: novoChatError } = await supabase
      .from('chats')
      .insert({
        reserva_id: reserva.id,
        cliente_id: reserva.cliente_id,
        guia_id: roteiro.id_guia,
        status: 'aberto',
        encerrado: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .maybeSingle()

    if (novoChatError || !novoChat?.id) {
      return {
        criado: false,
        erro: novoChatError?.message || 'Não foi possível criar chat.'
      }
    }

    await atualizarReservaComFallback(supabase, reserva.id, {
      chat_id: novoChat.id,
      updated_at: new Date().toISOString()
    })

    return {
      criado: true,
      chatId: novoChat.id
    }
  } catch (error: any) {
    return {
      criado: false,
      erro: error?.message || 'Chat não criado.'
    }
  }
}

async function processarConfirmacaoPagamento({
  supabase,
  reserva,
  statusPagHiper,
  transactionId,
  orderId,
  payloadOriginal
}: {
  supabase: ReturnType<typeof createClient>
  reserva: Reserva
  statusPagHiper: string
  transactionId?: string
  orderId?: string
  payloadOriginal: any
}) {
  const updatePayload = {
    pagamento_status: 'pago',
    status: 'confirmada',
    paghiper_status: statusPagHiper,
    paghiper_transaction_id:
      transactionId ||
      reserva.paghiper_transaction_id ||
      reserva.transaction_id ||
      null,
    transaction_id:
      transactionId ||
      reserva.transaction_id ||
      reserva.paghiper_transaction_id ||
      null,
    paghiper_order_id:
      orderId ||
      reserva.paghiper_order_id ||
      reserva.order_id ||
      reserva.id,
    order_id:
      orderId ||
      reserva.order_id ||
      reserva.paghiper_order_id ||
      reserva.id,
    pagamento_confirmado_em: new Date().toISOString(),
    webhook_paghiper_payload: payloadOriginal,
    updated_at: new Date().toISOString()
  }

  const update = await atualizarReservaComFallback(
    supabase,
    reserva.id,
    updatePayload
  )

  const chat = await tentarCriarChatSePossivel({
    supabase,
    reserva: {
      ...reserva,
      status: 'confirmada',
      pagamento_status: 'pago'
    }
  })

  return {
    update,
    chat
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await parseBody(request)

    console.log('Webhook PagHiper recebido:', body)

    const orderIdRecebido = buscarRecursivo(body, [
      'order_id',
      'orderId',
      'paghiper_order_id'
    ])

    const transactionIdRecebido = buscarRecursivo(body, [
      'transaction_id',
      'transactionId',
      'paghiper_transaction_id',
      'id_transacao'
    ])

    const reservaIdRecebido =
      buscarRecursivo(body, [
        'reservaId',
        'reserva_id',
        'id_reserva'
      ]) || limparOrderId(orderIdRecebido)

    const statusRecebido = buscarRecursivo(body, [
      'status',
      'status_transaction',
      'transaction_status',
      'payment_status',
      'status_pagamento',
      'result'
    ])

    const reserva = await buscarReserva({
      supabase,
      reservaId: reservaIdRecebido,
      orderId: orderIdRecebido,
      transactionId: transactionIdRecebido
    })

    if (!reserva) {
      console.error('Webhook PagHiper: reserva não encontrada.', {
        reservaIdRecebido,
        orderIdRecebido,
        transactionIdRecebido,
        body
      })

      return json({
        sucesso: false,
        erro: 'Reserva não encontrada.',
        recebido: {
          reservaIdRecebido,
          orderIdRecebido,
          transactionIdRecebido,
          statusRecebido
        }
      }, 200)
    }

    let statusFinal = statusRecebido
    let transactionIdFinal = transactionIdRecebido

    if (!statusFinal || (!statusPago(statusFinal) && !statusPendente(statusFinal))) {
      const consulta = await consultarStatusPagHiper({
        transactionId: transactionIdRecebido ||
          reserva.paghiper_transaction_id ||
          reserva.transaction_id ||
          undefined,
        orderId: orderIdRecebido ||
          reserva.paghiper_order_id ||
          reserva.order_id ||
          reserva.id
      })

      if (consulta.status) {
        statusFinal = consulta.status
      }

      if (consulta.transactionId) {
        transactionIdFinal = consulta.transactionId
      }
    }

    if (statusPago(statusFinal)) {
      const resultado = await processarConfirmacaoPagamento({
        supabase,
        reserva,
        statusPagHiper: statusFinal,
        transactionId: transactionIdFinal,
        orderId: orderIdRecebido ||
          reserva.paghiper_order_id ||
          reserva.order_id ||
          reserva.id,
        payloadOriginal: body
      })

      console.log('Webhook PagHiper: reserva confirmada.', {
        reservaId: reserva.id,
        statusFinal,
        resultado
      })

      return json({
        sucesso: true,
        mensagem: 'Pagamento confirmado e reserva atualizada.',
        reservaId: reserva.id,
        statusPagHiper: statusFinal,
        resultado
      })
    }

    if (statusCancelado(statusFinal)) {
      const resultado = await atualizarReservaComFallback(
        supabase,
        reserva.id,
        {
          pagamento_status: 'cancelado',
          paghiper_status: statusFinal,
          webhook_paghiper_payload: body,
          updated_at: new Date().toISOString()
        }
      )

      return json({
        sucesso: true,
        mensagem: 'Pagamento cancelado/expirado registrado.',
        reservaId: reserva.id,
        statusPagHiper: statusFinal,
        resultado
      })
    }

    return json({
      sucesso: true,
      mensagem: 'Webhook recebido, mas pagamento ainda não confirmado.',
      reservaId: reserva.id,
      statusPagHiper: statusFinal || 'status não informado'
    })
  } catch (error: any) {
    console.error('Erro no webhook PagHiper:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno no webhook PagHiper.'
      },
      500
    )
  }
}

export async function GET() {
  return json({
    sucesso: true,
    rota: '/api/paghiper/webhook',
    metodo: 'POST',
    mensagem: 'Webhook PagHiper ativo.'
  })
}