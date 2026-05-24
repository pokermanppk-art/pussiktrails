import { NextResponse } from 'next/server'
import axios from 'axios'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

function extrairIdentificadores(payload: any) {
  const orderId = procurarCampoRecursivo(payload, [
    'order_id',
    'orderId',
    'order',
    'id_pedido',
    'pedido'
  ])

  const transactionId = procurarCampoRecursivo(payload, [
    'transaction_id',
    'transactionId',
    'idTransacao',
    'id_transacao',
    'id_transaction',
    'hash'
  ])

  const notificationId = procurarCampoRecursivo(payload, [
    'notification_id',
    'notificationId',
    'idNotificacao',
    'id_notification'
  ])

  const statusRecebido = procurarCampoRecursivo(payload, [
    'status',
    'status_request',
    'status_pagamento',
    'payment_status',
    'status_transaction'
  ])

  return {
    orderId,
    transactionId,
    notificationId,
    statusRecebido
  }
}

async function consultarPagHiper(params: {
  notificationId?: string
  transactionId?: string
  orderId?: string
}) {
  const apiKey = process.env.PAGHIPER_API_KEY
  const token = process.env.PAGHIPER_TOKEN

  if (!apiKey || !token) {
    throw new Error(
      'Credenciais PagHiper ausentes. Configure PAGHIPER_API_KEY e PAGHIPER_TOKEN na Vercel.'
    )
  }

  const tentativas: Array<{
    nome: string
    url: string
    body: Record<string, any>
  }> = []

  if (params.notificationId) {
    tentativas.push({
      nome: 'invoice/notification',
      url: 'https://pix.paghiper.com/invoice/notification/',
      body: {
        apiKey,
        token,
        notification_id: params.notificationId,
        transaction_id: params.transactionId || undefined,
        idTransacao: params.transactionId || undefined
      }
    })
  }

  if (params.transactionId) {
    tentativas.push({
      nome: 'invoice/status por transaction_id',
      url: 'https://pix.paghiper.com/invoice/status/',
      body: {
        apiKey,
        token,
        transaction_id: params.transactionId,
        idTransacao: params.transactionId
      }
    })
  }

  if (params.orderId) {
    tentativas.push({
      nome: 'invoice/status por order_id',
      url: 'https://pix.paghiper.com/invoice/status/',
      body: {
        apiKey,
        token,
        order_id: params.orderId
      }
    })
  }

  const erros: any[] = []

  for (const tentativa of tentativas) {
    try {
      const response = await axios.post(tentativa.url, tentativa.body, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 20000
      })

      if (response.data) {
        return {
          sucesso: true,
          origemConsulta: tentativa.nome,
          data: response.data,
          erros
        }
      }
    } catch (error: any) {
      erros.push({
        origemConsulta: tentativa.nome,
        erro: error.response?.data || error.message || String(error)
      })
    }
  }

  return {
    sucesso: false,
    origemConsulta: null,
    data: null,
    erros
  }
}

async function registrarLogPagHiper(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  payload: {
    reserva_id?: string | null
    order_id?: string | null
    transaction_id?: string | null
    notification_id?: string | null
    status_recebido?: string | null
    payload?: any
    processado?: boolean
    erro?: string | null
  }
) {
  try {
    await supabase
      .from('paghiper_webhook_logs')
      .insert({
        reserva_id: payload.reserva_id || null,
        order_id: payload.order_id || null,
        transaction_id: payload.transaction_id || null,
        notification_id: payload.notification_id || null,
        status_recebido: payload.status_recebido || null,
        payload: payload.payload || null,
        processado: payload.processado || false,
        erro: payload.erro || null
      })
  } catch (error) {
    console.warn(
      'Log PagHiper não foi gravado. Se desejar logs, crie a tabela paghiper_webhook_logs.',
      error
    )
  }
}

async function buscarReserva(params: {
  reservaId?: string
  orderId?: string
  transactionId?: string
}) {
  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('reservas')
    .select('*')
    .limit(1)

  if (params.reservaId) {
    query = query.eq('id', params.reservaId)
  } else if (params.orderId) {
    query = query.eq('paghiper_order_id', params.orderId)
  } else if (params.transactionId) {
    query = query.eq('paghiper_transaction_id', params.transactionId)
  } else {
    throw new Error(
      'Informe reservaId, orderId ou transactionId para reconciliar.'
    )
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  const reserva = data?.[0]

  if (!reserva) {
    throw new Error('Reserva não encontrada para reconciliação.')
  }

  return reserva
}

async function buscarGuiaDaReserva(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  reserva: any
) {
  const guiaDireto =
    reserva.id_guia ||
    reserva.guia_id ||
    null

  if (guiaDireto) return guiaDireto

  const roteiroId = reserva.roteiro_id || null

  if (!roteiroId) return null

  const { data: roteiro, error } = await supabase
    .from('roteiros')
    .select('id, id_guia')
    .eq('id', roteiroId)
    .maybeSingle()

  if (error) {
    console.warn('Erro ao buscar guia pelo roteiro:', error)
    return null
  }

  return roteiro?.id_guia || null
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
    dadosComprovante.idTransacao ||
    'sem-transacao'

  const filePath =
    `paghiper/reconciliacao-reserva-${reserva.id}-${transactionId}-${Date.now()}.json`

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
      origem: 'reconciliacao_paghiper'
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
        'Pagamento confirmado por reconciliação PagHiper. Chat liberado entre cliente e guia. Este chat poderá ser moderado futuramente por um moderador.',
      metadata: {
        reserva_id: reserva.id,
        origem: 'reconciliacao_paghiper',
        escopo: 'moderacao_futura'
      }
    })

  return novoChat.id
}

async function reconciliarReserva(params: {
  reservaId?: string
  orderId?: string
  transactionId?: string
  notificationId?: string
}) {
  const supabase = getSupabaseAdmin()

  let reserva = await buscarReserva({
    reservaId: params.reservaId,
    orderId: params.orderId,
    transactionId: params.transactionId
  })

  const identificadoresDaReserva = extrairIdentificadores({
    order_id: reserva.paghiper_order_id,
    transaction_id: reserva.paghiper_transaction_id,
    notification_id:
      params.notificationId ||
      procurarCampoRecursivo(reserva.paghiper_response, [
        'notification_id',
        'notificationId',
        'idNotificacao',
        'id_notification'
      ]),
    paghiper_response: reserva.paghiper_response
  })

  const orderId =
    params.orderId ||
    reserva.paghiper_order_id ||
    identificadoresDaReserva.orderId ||
    ''

  const transactionId =
    params.transactionId ||
    reserva.paghiper_transaction_id ||
    identificadoresDaReserva.transactionId ||
    ''

  const notificationId =
    params.notificationId ||
    identificadoresDaReserva.notificationId ||
    ''

  const consulta = await consultarPagHiper({
    notificationId,
    transactionId,
    orderId
  })

  const payloadConsulta = consulta.data || null

  const identificadoresConsulta = extrairIdentificadores(payloadConsulta || {})

  const statusRecebido =
    identificadoresConsulta.statusRecebido ||
    identificadoresDaReserva.statusRecebido ||
    reserva.paghiper_status ||
    ''

  const pagamentoStatus = normalizarStatusPagHiper(statusRecebido)

  const orderIdFinal =
    identificadoresConsulta.orderId ||
    orderId ||
    reserva.paghiper_order_id ||
    null

  const transactionIdFinal =
    identificadoresConsulta.transactionId ||
    transactionId ||
    reserva.paghiper_transaction_id ||
    null

  const notificationIdFinal =
    identificadoresConsulta.notificationId ||
    notificationId ||
    null

  const dadosComprovante = {
    origem: 'paghiper',
    tipo: 'reconciliacao',
    reserva_id: reserva.id,
    order_id: orderIdFinal,
    transaction_id: transactionIdFinal,
    notification_id: notificationIdFinal,
    status_recebido: statusRecebido || null,
    pagamento_status: pagamentoStatus,
    reconciliado_em: new Date().toISOString(),
    origem_consulta: consulta.origemConsulta,
    payload_consulta: payloadConsulta,
    erros_consulta: consulta.erros
  }

  await registrarLogPagHiper(supabase, {
    reserva_id: reserva.id,
    order_id: orderIdFinal,
    transaction_id: transactionIdFinal,
    notification_id: notificationIdFinal,
    status_recebido: statusRecebido || pagamentoStatus,
    payload: dadosComprovante,
    processado: pagamentoStatus === 'pago',
    erro: consulta.sucesso ? null : 'Consulta PagHiper não retornou dados válidos.'
  })

  if (pagamentoStatus !== 'pago') {
    await supabase
      .from('reservas')
      .update({
        paghiper_order_id: orderIdFinal,
        paghiper_transaction_id: transactionIdFinal,
        paghiper_status: statusRecebido || pagamentoStatus,
        paghiper_response: payloadConsulta || reserva.paghiper_response || null,
        paghiper_comprovante: dadosComprovante,
        pagamento_status:
          pagamentoStatus === 'cancelado'
            ? 'cancelado'
            : reserva.pagamento_status || 'pendente'
      })
      .eq('id', reserva.id)

    return {
      reconciliado: false,
      motivo:
        'A consulta à PagHiper não retornou pagamento confirmado.',
      reserva_id: reserva.id,
      pagamento_status: pagamentoStatus,
      status_recebido: statusRecebido || null,
      order_id: orderIdFinal,
      transaction_id: transactionIdFinal,
      notification_id: notificationIdFinal,
      origem_consulta: consulta.origemConsulta,
      erros_consulta: consulta.erros
    }
  }

  const guiaId = await buscarGuiaDaReserva(supabase, reserva)

  const comprovanteUrl = await subirComprovantePagHiper(
    supabase,
    reserva,
    dadosComprovante
  )

  const chatId = await criarOuBuscarChatDaReserva(
    supabase,
    reserva,
    guiaId
  )

  const updatePayload: Record<string, any> = {
    pagamento_status: 'pago',
    status: reserva.status === 'cancelada' ? reserva.status : 'confirmada',
    pagamento_confirmado_em:
      reserva.pagamento_confirmado_em || new Date().toISOString(),
    comprovante_origem: 'paghiper',
    comprovante_status: 'paghiper_confirmado',
    paghiper_order_id: orderIdFinal,
    paghiper_transaction_id: transactionIdFinal,
    paghiper_status: statusRecebido || 'pago',
    paghiper_response: payloadConsulta || reserva.paghiper_response || null,
    paghiper_comprovante: dadosComprovante,
    chat_id: chatId
  }

  if (comprovanteUrl) {
    updatePayload.comprovante_url = comprovanteUrl
  }

  const { error: updateError } = await supabase
    .from('reservas')
    .update(updatePayload)
    .eq('id', reserva.id)

  if (updateError) {
    throw updateError
  }

  return {
    reconciliado: true,
    reserva_id: reserva.id,
    pagamento_status: 'pago',
    reserva_status: updatePayload.status,
    status_recebido: statusRecebido || 'pago',
    order_id: orderIdFinal,
    transaction_id: transactionIdFinal,
    notification_id: notificationIdFinal,
    comprovante_url: comprovanteUrl,
    chat_id: chatId,
    guia_id: guiaId,
    origem_consulta: consulta.origemConsulta
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Rota de reconciliação PagHiper ativa.',
    uso: {
      metodo: 'POST',
      exemplo_body: {
        reservaId: 'uuid-da-reserva'
      }
    }
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const reservaId =
      body?.reservaId ||
      body?.reserva_id ||
      ''

    const orderId =
      body?.orderId ||
      body?.order_id ||
      ''

    const transactionId =
      body?.transactionId ||
      body?.transaction_id ||
      body?.idTransacao ||
      ''

    const notificationId =
      body?.notificationId ||
      body?.notification_id ||
      body?.idNotificacao ||
      ''

    const resultado = await reconciliarReserva({
      reservaId,
      orderId,
      transactionId,
      notificationId
    })

    return NextResponse.json({
      success: true,
      message: resultado.reconciliado
        ? 'Pagamento reconciliado com sucesso.'
        : 'Reconciliação executada, mas pagamento ainda não foi confirmado pela PagHiper.',
      ...resultado
    })

  } catch (error: any) {
    console.error('ERRO RECONCILIAR PAGHIPER:')
    console.error(error.response?.data || error.message || error)

    return NextResponse.json(
      {
        error: true,
        message:
          error.message || 'Erro interno ao reconciliar pagamento PagHiper.',
        details:
          error.response?.data || null
      },
      { status: 500 }
    )
  }
}