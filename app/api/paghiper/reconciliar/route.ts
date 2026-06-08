import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const paghiperApiKey = process.env.PAGHIPER_API_KEY || ''
const paghiperToken = process.env.PAGHIPER_TOKEN || ''
const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

type ResultadoReserva = {
  reservaId: string
  orderId?: string | null
  transactionId?: string | null
  statusAnterior?: string | null
  pagamentoAnterior?: string | null
  statusAtual?: string | null
  pagamentoAtual?: string | null
  confirmouPagamento: boolean
  jaEstavaConfirmada: boolean
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
      chave === 'transaction_status'
    ) {
      encontrados.push(String(value || ''))
    }

    if (value && typeof value === 'object') {
      coletarCamposStatus(value, encontrados)
    }
  }

  return encontrados
}

function respostaPagHiperIndicaPagamento(data: any) {
  const statusEncontrados = coletarCamposStatus(data)

  return statusEncontrados.some(statusExternoPago)
}

function extrairTransactionId(data: any) {
  const candidatos = [
    data?.transaction_id,
    data?.transactionId,
    data?.response?.transaction_id,
    data?.response?.transactionId,
    data?.data?.transaction_id,
    data?.data?.transactionId,
    data?.invoice?.transaction_id,
    data?.invoice?.transactionId
  ]

  return candidatos.map(limparTexto).find(Boolean) || ''
}

function extrairOrderId(data: any) {
  const candidatos = [
    data?.order_id,
    data?.orderId,
    data?.response?.order_id,
    data?.response?.orderId,
    data?.data?.order_id,
    data?.data?.orderId,
    data?.invoice?.order_id,
    data?.invoice?.orderId
  ]

  return candidatos.map(limparTexto).find(Boolean) || ''
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

async function buscarReservasPorFiltros(
  supabase: any,
  params: {
    reservaId?: string
    clienteId?: string
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

    if (error) throw error
    if (data?.id) mapa.set(data.id, data)
  }

  if (params.clienteId && uuidValido(params.clienteId)) {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('cliente_id', params.clienteId)
      .order('created_at', { ascending: false })
      .limit(80)

    if (error) throw error
    adicionar(data || [])
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

async function consultarStatusPagHiper(reserva: any) {
  if (!paghiperApiKey || !paghiperToken) {
    return {
      consultou: false,
      pago: false,
      erro: 'Credenciais PagHiper ausentes.',
      data: null
    }
  }

  const transactionId = limparTexto(reserva.transaction_id)
  const orderId = limparTexto(reserva.order_id || `RESERVA-${reserva.id}`)

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

  if (!payload.transaction_id && !payload.order_id) {
    payload.order_id = `RESERVA-${reserva.id}`
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
    const pago = respostaPagHiperIndicaPagamento(data)

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

async function processarReserva(
  request: NextRequest,
  supabase: any,
  reserva: any
): Promise<ResultadoReserva> {
  const resultado: ResultadoReserva = {
    reservaId: reserva.id,
    orderId: reserva.order_id || null,
    transactionId: reserva.transaction_id || null,
    statusAnterior: reserva.status || null,
    pagamentoAnterior: reserva.pagamento_status || null,
    statusAtual: reserva.status || null,
    pagamentoAtual: reserva.pagamento_status || null,
    confirmouPagamento: false,
    jaEstavaConfirmada: false,
    grupoLiberado: false,
    grupoId: null,
    erro: null
  }

  if (pagamentoEstaConfirmado(reserva)) {
    resultado.jaEstavaConfirmada = true
    resultado.confirmouPagamento = true

    const grupo = await liberarGrupoDaReserva(request, reserva.id)

    resultado.grupoLiberado = !!grupo.sucesso
    resultado.grupoId = grupo.grupoId || null

    if (!grupo.sucesso) {
      resultado.erro = grupo.erro || 'Pagamento já confirmado, mas grupo não liberado.'
    }

    return resultado
  }

  const statusPagHiper = await consultarStatusPagHiper(reserva)

  resultado.detalhe = statusPagHiper.data || statusPagHiper.erro || null

  if (!statusPagHiper.pago) {
    return resultado
  }

  const agora = new Date().toISOString()

  const updatePayload: Record<string, any> = {
    pagamento_status: 'pago',
    status: 'confirmada',
    order_id: statusPagHiper.orderId || reserva.order_id || `RESERVA-${reserva.id}`,
    transaction_id: statusPagHiper.transactionId || reserva.transaction_id || null,
    paid_at: agora,
    pago_em: agora,
    data_pagamento: agora,
    updated_at: agora
  }

  const reservaAtualizada = await atualizarReservaComFallback(
    supabase,
    reserva.id,
    updatePayload
  )

  resultado.confirmouPagamento = true
  resultado.statusAtual = reservaAtualizada?.status || 'confirmada'
  resultado.pagamentoAtual = reservaAtualizada?.pagamento_status || 'pago'
  resultado.orderId = reservaAtualizada?.order_id || updatePayload.order_id
  resultado.transactionId =
    reservaAtualizada?.transaction_id || updatePayload.transaction_id

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
    const body = await request.json().catch(() => ({}))

    const reservaId = limparTexto(
      body.reservaId ||
        body.reserva_id ||
        body.id_reserva ||
        body.id
    )

    const clienteId = limparTexto(
      body.clienteId ||
        body.cliente_id ||
        body.id_cliente
    )

    const orderId = limparTexto(
      body.orderId ||
        body.order_id ||
        body.order
    )

    const transactionId = limparTexto(
      body.transactionId ||
        body.transaction_id ||
        body.transaction
    )

    if (!reservaId && !clienteId && !orderId && !transactionId) {
      return json(
        {
          sucesso: false,
          erro: 'Informe reservaId, clienteId, orderId ou transactionId para reconciliar.'
        },
        400
      )
    }

    const reservas = await buscarReservasPorFiltros(supabase, {
      reservaId,
      clienteId,
      orderId,
      transactionId
    })

    if (reservas.length === 0) {
      return json(
        {
          sucesso: true,
          mensagem: 'Nenhuma reserva encontrada para os filtros informados.',
          total: 0,
          atualizadas: 0,
          jaConfirmadas: 0,
          gruposLiberados: 0,
          resultados: []
        }
      )
    }

    const resultados: ResultadoReserva[] = []

    for (const reserva of reservas) {
      try {
        const resultado = await processarReserva(request, supabase, reserva)
        resultados.push(resultado)
      } catch (error: any) {
        resultados.push({
          reservaId: reserva.id,
          orderId: reserva.order_id || null,
          transactionId: reserva.transaction_id || null,
          statusAnterior: reserva.status || null,
          pagamentoAnterior: reserva.pagamento_status || null,
          statusAtual: reserva.status || null,
          pagamentoAtual: reserva.pagamento_status || null,
          confirmouPagamento: false,
          jaEstavaConfirmada: false,
          grupoLiberado: false,
          grupoId: null,
          erro: error?.message || 'Erro ao processar reserva.'
        })
      }
    }

    const atualizadas = resultados.filter(
      (item) => item.confirmouPagamento && !item.jaEstavaConfirmada
    ).length

    const jaConfirmadas = resultados.filter(
      (item) => item.jaEstavaConfirmada
    ).length

    const gruposLiberados = resultados.filter(
      (item) => item.grupoLiberado
    ).length

    const erros = resultados.filter((item) => item.erro).length

    return json({
      sucesso: true,
      mensagem: 'Reconciliação concluída.',
      filtros: {
        reservaId: reservaId || null,
        clienteId: clienteId || null,
        orderId: orderId || null,
        transactionId: transactionId || null
      },
      total: reservas.length,
      atualizadas,
      jaConfirmadas,
      gruposLiberados,
      erros,
      resultados
    })
  } catch (error: any) {
    console.error('Erro em /api/paghiper/reconciliar:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao reconciliar pagamento.'
      },
      500
    )
  }
}

export async function GET() {
  return json({
    sucesso: true,
    rota: '/api/paghiper/reconciliar',
    metodo: 'POST',
    mensagem:
      'Rota ativa. Envie reservaId, clienteId, orderId ou transactionId para reconciliar pagamento e liberar grupo.'
  })
}