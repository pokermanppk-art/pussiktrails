import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const paghiperApiKey = process.env.PAGHIPER_API_KEY || ''
const paghiperToken = process.env.PAGHIPER_TOKEN || ''
const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

type ResultadoWebhook = {
  reservaId: string
  orderId?: string | null
  transactionId?: string | null
  pagamentoConfirmado: boolean
  reservaAtualizada: boolean
  grupoLiberado: boolean
  grupoId?: string | null
  erro?: string | null
  detalhe?: any
}

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function getSupabaseAdmin() {
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ausente no ambiente.')
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente no ambiente.')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

function limparTexto(valor: any) {
  return String(valor || '').trim()
}

function normalizar(valor: any) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function uuidValido(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor
  )
}

function removerPrefixoReserva(orderId: string) {
  return limparTexto(orderId).replace(/^RESERVA-/i, '')
}

function garantirPrefixoReserva(valor: string) {
  const limpo = limparTexto(valor)

  if (!limpo) return ''

  if (/^RESERVA-/i.test(limpo)) return limpo

  return `RESERVA-${limpo}`
}

function candidatosOrderId(valor: string) {
  const limpo = limparTexto(valor)
  const semPrefixo = removerPrefixoReserva(limpo)
  const comPrefixo = garantirPrefixoReserva(semPrefixo || limpo)

  return Array.from(
    new Set(
      [limpo, semPrefixo, comPrefixo]
        .map((item) => limparTexto(item))
        .filter(Boolean)
    )
  )
}

function pagamentoEstaConfirmado(reserva: any) {
  const pagamento = normalizar(reserva?.pagamento_status)
  const status = normalizar(reserva?.status)

  return (
    pagamento === 'pago' ||
    pagamento === 'confirmado' ||
    pagamento === 'aprovado' ||
    pagamento === 'paid' ||
    pagamento === 'approved' ||
    status === 'confirmada' ||
    status === 'realizada' ||
    status === 'pago' ||
    status === 'paga'
  )
}

function statusExternoPago(valor: any) {
  const texto = normalizar(valor)

  return (
    texto === 'paid' ||
    texto === 'approved' ||
    texto === 'completed' ||
    texto === 'confirmed' ||
    texto === 'pago' ||
    texto === 'aprovado' ||
    texto === 'confirmado' ||
    texto === 'liquidado' ||
    texto === 'settled'
  )
}

function coletarCamposStatus(obj: any, encontrados: string[] = []) {
  if (!obj || typeof obj !== 'object') return encontrados

  for (const [key, value] of Object.entries(obj)) {
    const chave = normalizar(key)

    if (
      chave === 'status' ||
      chave === 'payment_status' ||
      chave === 'pagamento_status' ||
      chave === 'status_request' ||
      chave === 'transaction_status' ||
      chave === 'status_pagamento'
    ) {
      encontrados.push(String(value || ''))
    }

    if (value && typeof value === 'object') {
      coletarCamposStatus(value, encontrados)
    }
  }

  return encontrados
}

function respostaIndicaPagamento(data: any) {
  const statusEncontrados = coletarCamposStatus(data)

  return statusEncontrados.some(statusExternoPago)
}

function buscarValorRecursivo(obj: any, nomes: string[]): string {
  if (!obj || typeof obj !== 'object') return ''

  for (const [key, value] of Object.entries(obj)) {
    const chave = normalizar(key)

    if (nomes.includes(chave)) {
      const texto = limparTexto(value)

      if (texto) return texto
    }

    if (value && typeof value === 'object') {
      const encontrado = buscarValorRecursivo(value, nomes)

      if (encontrado) return encontrado
    }
  }

  return ''
}

function extrairTransactionId(data: any) {
  return (
    buscarValorRecursivo(data, [
      'transaction_id',
      'transactionid',
      'transaction',
      'id_transacao',
      'transacao_id'
    ]) || ''
  )
}

function extrairOrderId(data: any) {
  return (
    buscarValorRecursivo(data, [
      'order_id',
      'orderid',
      'order',
      'pedido',
      'pedido_id',
      'id_pedido'
    ]) || ''
  )
}

function extrairNotificationId(data: any) {
  return (
    buscarValorRecursivo(data, [
      'notification_id',
      'notificationid',
      'notification',
      'id_notificacao',
      'notificacao_id'
    ]) || ''
  )
}

function extrairColunaAusente(error: any) {
  const texto = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')

  const matchAspas = texto.match(/'([^']+)'/)

  if (matchAspas?.[1]) return matchAspas[1]

  const matchColumn = texto.match(/column\s+([a-zA-Z0-9_]+)/i)

  if (matchColumn?.[1]) return matchColumn[1]

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

async function lerBody(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''

  const queryData: Record<string, any> = {}

  request.nextUrl.searchParams.forEach((value, key) => {
    queryData[key] = value
  })

  try {
    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => ({}))

      return {
        ...queryData,
        ...body
      }
    }

    if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const formData = await request.formData()
      const body: Record<string, any> = {}

      formData.forEach((value, key) => {
        body[key] = typeof value === 'string' ? value : value.name
      })

      return {
        ...queryData,
        ...body
      }
    }

    const texto = await request.text().catch(() => '')

    if (!texto) return queryData

    try {
      return {
        ...queryData,
        ...JSON.parse(texto)
      }
    } catch {
      const params = new URLSearchParams(texto)
      const body: Record<string, any> = {}

      params.forEach((value, key) => {
        body[key] = value
      })

      return {
        ...queryData,
        ...body
      }
    }
  } catch {
    return queryData
  }
}

async function atualizarReservaComFallback(
  supabase: any,
  reservaId: string,
  payloadOriginal: Record<string, any>
) {
  let payloadAtual = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 20; tentativa++) {
    const { data, error } = await supabase
      .from('reservas')
      .update(payloadAtual)
      .eq('id', reservaId)
      .select('*')
      .maybeSingle()

    if (!error) {
      return data
    }

    if (!erroDeColunaAusente(error)) {
      throw error
    }

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payloadAtual)) {
      throw error
    }

    delete payloadAtual[coluna]
  }

  throw new Error('Não foi possível atualizar a reserva.')
}

async function buscarReservasPorIdentificadores(
  supabase: any,
  params: {
    reservaId?: string
    orderId?: string
    transactionId?: string
  }
) {
  const mapa = new Map<string, any>()

  const adicionar = (items: any[] = []) => {
    items.forEach((item) => {
      if (item?.id) mapa.set(item.id, item)
    })
  }

  if (params.reservaId && uuidValido(params.reservaId)) {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', params.reservaId)
      .maybeSingle()

    if (!error && data?.id) mapa.set(data.id, data)
  }

  if (params.transactionId) {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('transaction_id', params.transactionId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error) adicionar(data || [])
  }

  if (params.orderId) {
    const candidatos = candidatosOrderId(params.orderId)

    for (const candidato of candidatos) {
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .eq('order_id', candidato)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!error) adicionar(data || [])
    }

    const semPrefixo = removerPrefixoReserva(params.orderId)

    if (uuidValido(semPrefixo)) {
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .eq('id', semPrefixo)
        .maybeSingle()

      if (!error && data?.id) mapa.set(data.id, data)
    }
  }

  return Array.from(mapa.values())
}

async function consultarStatusPagHiper(params: {
  reserva?: any
  orderId?: string
  transactionId?: string
  notificationId?: string
}) {
  if (!paghiperApiKey || !paghiperToken) {
    return {
      consultou: false,
      pago: false,
      erro: 'Credenciais PagHiper ausentes.',
      data: null
    }
  }

  const transactionId =
    limparTexto(params.transactionId) ||
    limparTexto(params.reserva?.transaction_id)

  const orderId =
    limparTexto(params.orderId) ||
    limparTexto(params.reserva?.order_id) ||
    (params.reserva?.id ? `RESERVA-${params.reserva.id}` : '')

  const notificationId = limparTexto(params.notificationId)

  const payload: Record<string, any> = {
    apiKey: paghiperApiKey,
    token: paghiperToken
  }

  if (transactionId) {
    payload.transaction_id = transactionId
  }

  if (orderId) {
    payload.order_id = orderId
  }

  if (notificationId) {
    payload.notification_id = notificationId
  }

  try {
    const response = await fetch('https://pix.paghiper.com/invoice/status/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    })

    const data = await response.json().catch(() => null)
    const pago = respostaIndicaPagamento(data)

    return {
      consultou: true,
      httpOk: response.ok,
      pago,
      data,
      transactionId: extrairTransactionId(data) || transactionId,
      orderId: extrairOrderId(data) || orderId
    }
  } catch (error: any) {
    return {
      consultou: false,
      pago: false,
      erro: error?.message || 'Erro ao consultar PagHiper.',
      data: null
    }
  }
}

async function liberarGrupoDaReserva(
  request: NextRequest,
  reservaId: string
) {
  const baseUrl = appUrl || request.nextUrl.origin

  try {
    const response = await fetch(`${baseUrl}/api/grupos/garantir-grupo-roteiro`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reservaId
      }),
      cache: 'no-store'
    })

    const data = await response.json().catch(() => null)

    if (!response.ok || !data?.sucesso) {
      return {
        sucesso: false,
        erro: data?.erro || data?.message || 'Não foi possível liberar o grupo.',
        data
      }
    }

    return {
      sucesso: true,
      grupoId: data?.grupo?.id || null,
      redirectUrl: data?.redirectUrl || null,
      data
    }
  } catch (error: any) {
    return {
      sucesso: false,
      erro: error?.message || 'Erro ao liberar grupo.',
      data: null
    }
  }
}

async function processarReservaConfirmada(
  request: NextRequest,
  supabase: any,
  reserva: any,
  params: {
    dadosRecebidos?: any
    statusPagHiper?: any
    orderId?: string
    transactionId?: string
  }
): Promise<ResultadoWebhook> {
  const resultado: ResultadoWebhook = {
    reservaId: reserva.id,
    orderId: reserva.order_id || params.orderId || null,
    transactionId: reserva.transaction_id || params.transactionId || null,
    pagamentoConfirmado: true,
    reservaAtualizada: false,
    grupoLiberado: false,
    grupoId: null,
    detalhe: params.statusPagHiper?.data || params.dadosRecebidos || null
  }

  let reservaAtualizada = reserva

  if (!pagamentoEstaConfirmado(reserva)) {
    const agora = new Date().toISOString()

    const payload: Record<string, any> = {
      pagamento_status: 'pago',
      status: 'confirmada',
      order_id:
        params.statusPagHiper?.orderId ||
        params.orderId ||
        reserva.order_id ||
        `RESERVA-${reserva.id}`,
      transaction_id:
        params.statusPagHiper?.transactionId ||
        params.transactionId ||
        reserva.transaction_id ||
        null,
      webhook_received_at: agora,
      paid_at: agora,
      pago_em: agora,
      data_pagamento: agora,
      updated_at: agora
    }

    reservaAtualizada = await atualizarReservaComFallback(
      supabase,
      reserva.id,
      payload
    )

    resultado.reservaAtualizada = true
    resultado.orderId = reservaAtualizada?.order_id || payload.order_id
    resultado.transactionId =
      reservaAtualizada?.transaction_id || payload.transaction_id
  }

  const grupo = await liberarGrupoDaReserva(request, reserva.id)

  resultado.grupoLiberado = !!grupo.sucesso
  resultado.grupoId = grupo.grupoId || null

  if (!grupo.sucesso) {
    resultado.erro = grupo.erro || 'Pagamento confirmado, mas grupo não liberado.'
  }

  return resultado
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await lerBody(request)

    const orderIdRecebido =
      limparTexto(
        body.orderId ||
          body.order_id ||
          body.order ||
          body.id_pedido ||
          extrairOrderId(body)
      )

    const transactionIdRecebido =
      limparTexto(
        body.transactionId ||
          body.transaction_id ||
          body.transaction ||
          body.id_transacao ||
          extrairTransactionId(body)
      )

    const notificationIdRecebido =
      limparTexto(
        body.notificationId ||
          body.notification_id ||
          body.notification ||
          body.id_notificacao ||
          extrairNotificationId(body)
      )

    const reservaIdRecebida = removerPrefixoReserva(orderIdRecebido)

    let reservas = await buscarReservasPorIdentificadores(supabase, {
      reservaId: uuidValido(reservaIdRecebida) ? reservaIdRecebida : '',
      orderId: orderIdRecebido,
      transactionId: transactionIdRecebido
    })

    let statusPagHiper: any = null

    if (reservas.length === 0) {
      statusPagHiper = await consultarStatusPagHiper({
        orderId: orderIdRecebido,
        transactionId: transactionIdRecebido,
        notificationId: notificationIdRecebido
      })

      const orderIdStatus = statusPagHiper?.orderId || ''
      const transactionIdStatus = statusPagHiper?.transactionId || ''

      reservas = await buscarReservasPorIdentificadores(supabase, {
        reservaId: uuidValido(removerPrefixoReserva(orderIdStatus))
          ? removerPrefixoReserva(orderIdStatus)
          : '',
        orderId: orderIdStatus || orderIdRecebido,
        transactionId: transactionIdStatus || transactionIdRecebido
      })
    }

    if (reservas.length === 0) {
      return json({
        sucesso: true,
        recebido: true,
        mensagem: 'Webhook recebido, mas nenhuma reserva correspondente foi localizada.',
        identificadores: {
          orderId: orderIdRecebido || null,
          transactionId: transactionIdRecebido || null,
          notificationId: notificationIdRecebido || null
        },
        body
      })
    }

    const webhookIndicaPagamento = respostaIndicaPagamento(body)
    const resultados: ResultadoWebhook[] = []

    for (const reserva of reservas) {
      try {
        let consulta = statusPagHiper

        if (!consulta) {
          consulta = await consultarStatusPagHiper({
            reserva,
            orderId: orderIdRecebido,
            transactionId: transactionIdRecebido,
            notificationId: notificationIdRecebido
          })
        }

        const confirmado =
          pagamentoEstaConfirmado(reserva) ||
          webhookIndicaPagamento ||
          !!consulta?.pago

        if (!confirmado) {
          resultados.push({
            reservaId: reserva.id,
            orderId: reserva.order_id || orderIdRecebido || null,
            transactionId: reserva.transaction_id || transactionIdRecebido || null,
            pagamentoConfirmado: false,
            reservaAtualizada: false,
            grupoLiberado: false,
            grupoId: null,
            detalhe: consulta?.data || body || null
          })

          continue
        }

        const resultado = await processarReservaConfirmada(
          request,
          supabase,
          reserva,
          {
            dadosRecebidos: body,
            statusPagHiper: consulta,
            orderId: orderIdRecebido,
            transactionId: transactionIdRecebido
          }
        )

        resultados.push(resultado)
      } catch (error: any) {
        resultados.push({
          reservaId: reserva.id,
          orderId: reserva.order_id || orderIdRecebido || null,
          transactionId: reserva.transaction_id || transactionIdRecebido || null,
          pagamentoConfirmado: false,
          reservaAtualizada: false,
          grupoLiberado: false,
          grupoId: null,
          erro: error?.message || 'Erro ao processar reserva no webhook.',
          detalhe: body
        })
      }
    }

    const confirmadas = resultados.filter((item) => item.pagamentoConfirmado).length
    const atualizadas = resultados.filter((item) => item.reservaAtualizada).length
    const gruposLiberados = resultados.filter((item) => item.grupoLiberado).length
    const erros = resultados.filter((item) => item.erro).length

    return json({
      sucesso: true,
      recebido: true,
      mensagem: 'Webhook PagHiper processado.',
      identificadores: {
        orderId: orderIdRecebido || null,
        transactionId: transactionIdRecebido || null,
        notificationId: notificationIdRecebido || null
      },
      totalReservas: reservas.length,
      confirmadas,
      atualizadas,
      gruposLiberados,
      erros,
      resultados
    })
  } catch (error: any) {
    console.error('Erro em /api/paghiper/webhook:', error)

    return json(
      {
        sucesso: false,
        recebido: false,
        erro: error?.message || 'Erro interno no webhook PagHiper.'
      },
      500
    )
  }
}

export async function GET(request: NextRequest) {
  const queryData: Record<string, any> = {}

  request.nextUrl.searchParams.forEach((value, key) => {
    queryData[key] = value
  })

  return json({
    sucesso: true,
    rota: '/api/paghiper/webhook',
    metodo: 'POST',
    mensagem:
      'Webhook PagHiper ativo. A confirmação de pagamento atualiza reserva e libera grupo.',
    query: queryData
  })
}