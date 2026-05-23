import { NextResponse } from 'next/server'
import axios from 'axios'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Credenciais Supabase ausentes no servidor. Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel.'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

function procurarCampoRecursivo(obj: any, nomes: string[]): string {
  if (!obj) return ''

  if (typeof obj !== 'object') return ''

  for (const nome of nomes) {
    const valor = obj[nome]

    if (typeof valor === 'string' && valor.trim()) {
      return valor
    }

    if (typeof valor === 'number') {
      return String(valor)
    }
  }

  for (const key of Object.keys(obj)) {
    const encontrado = procurarCampoRecursivo(obj[key], nomes)

    if (encontrado) return encontrado
  }

  return ''
}

function normalizarStatusPagHiper(status: string) {
  const texto = String(status || '').toLowerCase().trim()

  if (
    texto.includes('paid') ||
    texto.includes('pago') ||
    texto.includes('aprovado') ||
    texto.includes('approved') ||
    texto.includes('completed') ||
    texto.includes('completo') ||
    texto.includes('liquidado') ||
    texto.includes('confirmado') ||
    texto === 'success'
  ) {
    return 'pago'
  }

  if (
    texto.includes('cancel') ||
    texto.includes('expired') ||
    texto.includes('expirado') ||
    texto.includes('vencido') ||
    texto.includes('estornado')
  ) {
    return 'cancelado'
  }

  return 'pendente'
}

function extrairReservaIdDoOrderId(orderId: string) {
  if (!orderId) return ''

  if (orderId.startsWith('RESERVA-')) {
    return orderId.replace('RESERVA-', '')
  }

  return orderId
}

async function lerPayload(req: Request) {
  const contentType = req.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return await req.json()
  }

  const text = await req.text()

  try {
    return JSON.parse(text)
  } catch {
    const params = new URLSearchParams(text)
    const obj: Record<string, string> = {}

    params.forEach((value, key) => {
      obj[key] = value
    })

    return obj
  }
}

async function consultarPagHiperPorNotificacao(
  notificationId: string,
  transactionId: string
) {
  const apiKey = process.env.PAGHIPER_API_KEY
  const token = process.env.PAGHIPER_TOKEN

  if (!apiKey || !token || !notificationId) {
    return null
  }

  try {
    const response = await axios.post(
      'https://pix.paghiper.com/invoice/notification/',
      {
        apiKey,
        token,
        notification_id: notificationId,
        transaction_id: transactionId || undefined,
        idTransacao: transactionId || undefined
      },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    )

    return response.data || null
  } catch (error: any) {
    console.warn(
      'Não foi possível consultar notification na PagHiper:',
      error.response?.data || error.message
    )

    return null
  }
}

async function buscarReservaPorPayload(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  payload: any,
  payloadOriginal: any
) {
  const orderId = procurarCampoRecursivo(payload, [
    'order_id',
    'orderId',
    'order',
    'id_pedido',
    'pedido'
  ])

  const transactionId =
    procurarCampoRecursivo(payload, [
      'transaction_id',
      'transactionId',
      'idTransacao',
      'id_transacao',
      'id_transaction',
      'hash'
    ]) ||
    procurarCampoRecursivo(payloadOriginal, [
      'transaction_id',
      'transactionId',
      'idTransacao',
      'id_transacao',
      'id_transaction',
      'hash'
    ])

  const reservaId = extrairReservaIdDoOrderId(orderId)

  let query = supabase
    .from('reservas')
    .select('*')
    .limit(1)

  if (reservaId) {
    query = query.eq('id', reservaId)
  } else if (orderId) {
    query = query.eq('paghiper_order_id', orderId)
  } else if (transactionId) {
    query = query.eq('paghiper_transaction_id', transactionId)
  } else {
    throw new Error('Webhook recebido sem order_id ou transaction_id.')
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  const reserva = data?.[0]

  if (!reserva) {
    throw new Error('Reserva não encontrada para o webhook PagHiper.')
  }

  return {
    reserva,
    orderId,
    transactionId,
    reservaId
  }
}

async function buscarGuiaDaReserva(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  reserva: any
) {
  const guiaDireto =
    reserva.guia_id ||
    reserva.id_guia ||
    null

  if (guiaDireto) return guiaDireto

  const roteiroId =
    reserva.roteiro_id ||
    reserva.id_roteiro ||
    null

  if (!roteiroId) return null

  const { data: roteiro, error } = await supabase
    .from('roteiros')
    .select('id, id_guia, guia_id')
    .eq('id', roteiroId)
    .maybeSingle()

  if (error) {
    console.warn('Erro ao buscar guia pelo roteiro:', error)
    return null
  }

  return (
    roteiro?.id_guia ||
    roteiro?.guia_id ||
    null
  )
}

async function subirComprovantePagHiper(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  reserva: any,
  dadosComprovante: any
) {
  const conteudo = JSON.stringify(dadosComprovante, null, 2)
  const buffer = Buffer.from(conteudo, 'utf-8')

  const transactionId =
    dadosComprovante.transaction_id ||
    dadosComprovante.transactionId ||
    dadosComprovante.idTransacao ||
    'sem-transacao'

  const filePath =
    `paghiper/reserva-${reserva.id}-${transactionId}-${Date.now()}.json`

  const { error: uploadError } = await supabase.storage
    .from('comprovantes')
    .upload(filePath, buffer, {
      contentType: 'application/json',
      upsert: true
    })

  if (uploadError) {
    console.warn('Erro ao subir comprovante PagHiper:', uploadError)
    return null
  }

  const {
    data: { publicUrl }
  } = supabase.storage
    .from('comprovantes')
    .getPublicUrl(filePath)

  return publicUrl
}

async function criarOuBuscarChatDaReserva(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  reserva: any,
  guiaId: string | null
) {
  if (reserva.chat_id) {
    return reserva.chat_id
  }

  const { data: chatExistente, error: chatExistenteError } = await supabase
    .from('chats')
    .select('*')
    .eq('reserva_id', reserva.id)
    .maybeSingle()

  if (chatExistenteError) {
    throw chatExistenteError
  }

  if (chatExistente) {
    await supabase
      .from('reservas')
      .update({ chat_id: chatExistente.id })
      .eq('id', reserva.id)

    return chatExistente.id
  }

  const clienteId =
    reserva.cliente_id ||
    reserva.id_cliente ||
    null

  const { data: novoChat, error: novoChatError } = await supabase
    .from('chats')
    .insert({
      reserva_id: reserva.id,
      cliente_id: clienteId,
      guia_id: guiaId,
      moderador_id: null,
      status: 'ativo',
      escopo_moderacao: 'cliente_guia_com_moderacao_futura',
      origem: 'pagamento_confirmado'
    })
    .select()
    .single()

  if (novoChatError) {
    throw novoChatError
  }

  await supabase
    .from('reservas')
    .update({ chat_id: novoChat.id })
    .eq('id', reserva.id)

  await supabase
    .from('chat_mensagens')
    .insert({
      chat_id: novoChat.id,
      remetente_id: null,
      remetente_tipo: 'sistema',
      tipo: 'sistema',
      mensagem:
        'Pagamento confirmado. Chat liberado entre cliente e guia. Este chat poderá ser moderado futuramente por um moderador.',
      metadata: {
        reserva_id: reserva.id,
        escopo: 'moderacao_futura'
      }
    })

  return novoChat.id
}

async function processarConfirmacaoPagamento(payloadOriginal: any) {
  const notificationId = procurarCampoRecursivo(payloadOriginal, [
    'notification_id',
    'notificationId',
    'idNotificacao',
    'id_notification'
  ])

  const transactionIdOriginal = procurarCampoRecursivo(payloadOriginal, [
    'transaction_id',
    'transactionId',
    'idTransacao',
    'id_transacao',
    'id_transaction',
    'hash'
  ])

  const payloadConsultado = await consultarPagHiperPorNotificacao(
    notificationId,
    transactionIdOriginal
  )

  const payload = payloadConsultado || payloadOriginal

  const statusRecebido = procurarCampoRecursivo(payload, [
    'status',
    'status_request',
    'status_pagamento',
    'payment_status',
    'status_transaction'
  ])

  const pagamentoStatus = normalizarStatusPagHiper(statusRecebido)

  const supabase = getSupabaseAdmin()

  const {
    reserva,
    orderId,
    transactionId
  } = await buscarReservaPorPayload(
    supabase,
    payload,
    payloadOriginal
  )

  const guiaId = await buscarGuiaDaReserva(supabase, reserva)

  const dadosComprovante = {
    origem: 'paghiper',
    reserva_id: reserva.id,
    order_id: orderId || reserva.paghiper_order_id || null,
    transaction_id:
      transactionId ||
      reserva.paghiper_transaction_id ||
      transactionIdOriginal ||
      null,
    status_recebido: statusRecebido || null,
    pagamento_status: pagamentoStatus,
    recebido_em: new Date().toISOString(),
    payload_original: payloadOriginal,
    payload_consultado: payloadConsultado || null
  }

  let comprovanteUrl: string | null = null

  if (pagamentoStatus === 'pago') {
    comprovanteUrl = await subirComprovantePagHiper(
      supabase,
      reserva,
      dadosComprovante
    )
  }

  let chatId: string | null = reserva.chat_id || null

  if (pagamentoStatus === 'pago') {
    chatId = await criarOuBuscarChatDaReserva(
      supabase,
      reserva,
      guiaId
    )
  }

  const updatePayload: Record<string, any> = {
    paghiper_order_id:
      orderId || reserva.paghiper_order_id || null,
    paghiper_transaction_id:
      transactionId ||
      reserva.paghiper_transaction_id ||
      transactionIdOriginal ||
      null,
    paghiper_status:
      statusRecebido || pagamentoStatus,
    paghiper_response: payload,
    paghiper_comprovante: dadosComprovante,
    pagamento_status: pagamentoStatus
  }

  if (pagamentoStatus === 'pago') {
    updatePayload.status = 'confirmada'
    updatePayload.pagamento_confirmado_em = new Date().toISOString()
    updatePayload.comprovante_status = 'paghiper_confirmado'
    updatePayload.comprovante_origem = 'paghiper'
    updatePayload.chat_id = chatId

    if (comprovanteUrl) {
      updatePayload.comprovante_url = comprovanteUrl
    }
  }

  if (pagamentoStatus === 'cancelado') {
    updatePayload.pagamento_status = 'cancelado'
  }

  const { error: updateError } = await supabase
    .from('reservas')
    .update(updatePayload)
    .eq('id', reserva.id)

  if (updateError) {
    throw updateError
  }

  return {
    reserva_id: reserva.id,
    order_id: updatePayload.paghiper_order_id,
    transaction_id: updatePayload.paghiper_transaction_id,
    status_recebido: statusRecebido,
    pagamento_status: pagamentoStatus,
    comprovante_url: comprovanteUrl,
    chat_id: chatId,
    payload_consultado_na_paghiper: Boolean(payloadConsultado)
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Webhook PagHiper ativo.'
  })
}

export async function POST(req: Request) {
  try {
    const payload = await lerPayload(req)

    console.log('WEBHOOK PAGHIPER RECEBIDO:')
    console.log(JSON.stringify(payload, null, 2))

    const resultado = await processarConfirmacaoPagamento(payload)

    return NextResponse.json({
      success: true,
      message: 'Webhook processado com sucesso.',
      ...resultado
    })

  } catch (error: any) {
    console.error('ERRO WEBHOOK PAGHIPER:')
    console.error(error.message || error)

    return NextResponse.json(
      {
        error: true,
        message:
          error.message || 'Erro interno no webhook PagHiper.'
      },
      { status: 500 }
    )
  }
}