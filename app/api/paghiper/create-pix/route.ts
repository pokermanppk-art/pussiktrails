import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Reserva = {
  id: string
  cliente_id?: string | null
  roteiro_id?: string | null
  valor_total?: number | null
  quantidade_pessoas?: number | null
  status?: string | null
  pagamento_status?: string | null
  paghiper_order_id?: string | null
  paghiper_transaction_id?: string | null
  order_id?: string | null
  transaction_id?: string | null
  qr_code_base64?: string | null
  pix_qr_code?: string | null
  pix_copia_cola?: string | null
  codigo_pix?: string | null
}

type Cliente = {
  id?: string | null
  nome?: string | null
  email?: string | null
  telefone?: string | null
  cpf?: string | null
}

type Roteiro = {
  id?: string | null
  titulo?: string | null
  preco?: number | null
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''

const pagHiperApiKey = process.env.PAGHIPER_API_KEY || ''
const pagHiperToken = process.env.PAGHIPER_TOKEN || ''

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://prussiktrails.vercel.app'

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

function pagamentoJaConfirmado(reserva?: Reserva | null) {
  if (!reserva) return false

  const pagamento = normalizarTexto(reserva.pagamento_status)
  const status = normalizarTexto(reserva.status)

  return (
    pagamento === 'pago' ||
    pagamento === 'confirmado' ||
    status === 'confirmada'
  )
}

function somenteNumeros(valor: any) {
  return String(valor || '').replace(/\D/g, '')
}

function limparTelefone(valor: any) {
  const numeros = somenteNumeros(valor)

  if (!numeros) return ''

  return numeros.slice(0, 11)
}

function formatarValorNumero(valor: any) {
  if (typeof valor === 'number') return valor

  const texto = String(valor || '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '')

  const numero = Number(texto)

  if (Number.isNaN(numero)) return 0

  return numero
}

function paraCentavos(valor: number) {
  return Math.round(Number(valor || 0) * 100)
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
  supabase: any,
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

async function buscarReserva(supabase: any, reservaId: string) {
  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .eq('id', reservaId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as Reserva | null
}

async function buscarCliente(supabase: any, clienteId?: string | null) {
  if (!clienteId) return null

  const { data, error } = await supabase
    .from('users')
    .select('id, nome, email, telefone, cpf')
    .eq('id', clienteId)
    .maybeSingle()

  if (error) {
    console.warn('Erro ao buscar cliente:', error)
    return null
  }

  return data as Cliente | null
}

async function buscarRoteiro(supabase: any, roteiroId?: string | null) {
  if (!roteiroId) return null

  const { data, error } = await supabase
    .from('roteiros')
    .select('id, titulo, preco')
    .eq('id', roteiroId)
    .maybeSingle()

  if (error) {
    console.warn('Erro ao buscar roteiro:', error)
    return null
  }

  return data as Roteiro | null
}

function montarNotificationUrl(body: any) {
  const urlRecebida =
    body?.notification_url ||
    body?.notificationUrl ||
    ''

  if (urlRecebida && String(urlRecebida).startsWith('https://')) {
    return String(urlRecebida)
  }

  const base = String(appUrl || 'https://prussiktrails.vercel.app')
    .replace(/\/$/, '')
    .replace('http://localhost:3000', 'https://prussiktrails.vercel.app')

  return `${base}/api/paghiper/webhook`
}

function montarPayloadPagHiper({
  body,
  reserva,
  cliente,
  roteiro,
  valorFinal,
  orderId,
  notificationUrl
}: {
  body: any
  reserva: Reserva
  cliente: Cliente | null
  roteiro: Roteiro | null
  valorFinal: number
  orderId: string
  notificationUrl: string
}) {
  const clienteBody = body?.cliente || {}

  const nomeCliente =
    body?.payer_name ||
    body?.nome ||
    clienteBody?.nome ||
    cliente?.nome ||
    'Cliente PrussikTrails'

  const emailCliente =
    body?.payer_email ||
    body?.email ||
    clienteBody?.email ||
    cliente?.email ||
    'cliente@prussiktrails.com'

  const telefoneCliente =
    limparTelefone(
      body?.payer_phone ||
        body?.telefone ||
        clienteBody?.telefone ||
        cliente?.telefone ||
        ''
    )

  const cpfCliente =
    somenteNumeros(
      body?.payer_cpf_cnpj ||
        body?.cpf ||
        clienteBody?.cpf ||
        cliente?.cpf ||
        ''
    )

  const tituloRoteiro =
    body?.descricao ||
    body?.description ||
    body?.roteiro?.titulo ||
    roteiro?.titulo ||
    'Reserva PrussikTrails'

  const itemDescricao = String(tituloRoteiro).slice(0, 100)

  const payload: Record<string, any> = {
    apiKey: pagHiperApiKey,
    token: pagHiperToken,
    order_id: orderId,
    payer_email: emailCliente,
    payer_name: nomeCliente,
    type_bank_slip: 'PIX',
    days_due_date: '1',
    notification_url: notificationUrl,
    items: [
      {
        item_id: roteiro?.id || reserva.roteiro_id || reserva.id,
        description: itemDescricao,
        quantity: 1,
        price_cents: paraCentavos(valorFinal)
      }
    ]
  }

  if (cpfCliente) {
    payload.payer_cpf_cnpj = cpfCliente
  }

  if (telefoneCliente) {
    payload.payer_phone = telefoneCliente
  }

  return payload
}

function extrairDadosPix(respostaPagHiper: any) {
  const transactionId = buscarRecursivo(respostaPagHiper, [
    'transaction_id',
    'transactionId',
    'paghiper_transaction_id',
    'id_transacao'
  ])

  const orderId = buscarRecursivo(respostaPagHiper, [
    'order_id',
    'orderId',
    'paghiper_order_id'
  ])

  const qrCodeBase64 = buscarRecursivo(respostaPagHiper, [
    'qr_code_base64',
    'qrCodeBase64',
    'pix_qr_code_base64',
    'qrcode_base64',
    'qrcode_image',
    'pix_qrcode',
    'qr_code'
  ])

  const codigoPix = buscarRecursivo(respostaPagHiper, [
    'qr_code_text',
    'qrCodeText',
    'pix_copia_cola',
    'codigo_pix',
    'copy_paste',
    'emv',
    'pix_code',
    'qrcode'
  ])

  const status = buscarRecursivo(respostaPagHiper, [
    'status',
    'status_transaction',
    'transaction_status',
    'payment_status',
    'status_pagamento',
    'result'
  ])

  return {
    transactionId,
    orderId,
    qrCodeBase64,
    codigoPix,
    status
  }
}

async function criarPixNaPagHiper(payloadPagHiper: Record<string, any>) {
  const response = await fetch('https://pix.paghiper.com/invoice/create/', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payloadPagHiper)
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

  if (!response.ok) {
    throw new Error(
      data?.error ||
        data?.erro ||
        data?.message ||
        data?.response_message ||
        data?.raw ||
        `Erro HTTP ${response.status} ao gerar PIX PagHiper.`
    )
  }

  return data
}

function respostaPixExistente(reserva: Reserva) {
  return {
    sucesso: true,
    reutilizado: true,
    message: 'PIX já existia para esta reserva.',
    reservaId: reserva.id,
    order_id: reserva.paghiper_order_id || reserva.order_id || reserva.id,
    transaction_id:
      reserva.paghiper_transaction_id ||
      reserva.transaction_id ||
      null,
    qr_code_base64:
      reserva.qr_code_base64 ||
      reserva.pix_qr_code ||
      null,
    pix_copia_cola:
      reserva.pix_copia_cola ||
      reserva.codigo_pix ||
      null,
    codigo_pix:
      reserva.codigo_pix ||
      reserva.pix_copia_cola ||
      null,
    pix_qr_code:
      reserva.pix_qr_code ||
      reserva.qr_code_base64 ||
      null,
    pagamento_status: reserva.pagamento_status || 'pendente',
    status: reserva.status || 'pendente'
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!pagHiperApiKey || !pagHiperToken) {
      return json(
        {
          sucesso: false,
          error: 'Credenciais PagHiper ausentes no .env.local'
        },
        500
      )
    }

    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const reservaId =
      body?.reservaId ||
      body?.reserva_id ||
      body?.id ||
      ''

    if (!reservaId) {
      return json(
        {
          sucesso: false,
          error: 'reservaId é obrigatório para gerar PIX.'
        },
        400
      )
    }

    const reserva = await buscarReserva(supabase, reservaId)

    if (!reserva) {
      return json(
        {
          sucesso: false,
          error: 'Reserva não encontrada.'
        },
        404
      )
    }

    if (pagamentoJaConfirmado(reserva)) {
      return json({
        sucesso: true,
        jaConfirmada: true,
        message: 'Reserva já está confirmada/paga.',
        reservaId: reserva.id,
        pagamento_status: reserva.pagamento_status,
        status: reserva.status
      })
    }

    const pixJaExiste =
      reserva.qr_code_base64 ||
      reserva.pix_qr_code ||
      reserva.pix_copia_cola ||
      reserva.codigo_pix

    if (pixJaExiste) {
      return json(respostaPixExistente(reserva))
    }

    const roteiro = await buscarRoteiro(supabase, reserva.roteiro_id)
    const cliente = await buscarCliente(supabase, reserva.cliente_id)

    const valorBody = formatarValorNumero(body?.valor)
    const valorReserva = Number(reserva.valor_total || 0)
    const valorRoteiro = Number(roteiro?.preco || 0)
    const quantidade = Number(reserva.quantidade_pessoas || 1)

    const valorFinal =
      valorBody > 0
        ? valorBody
        : valorReserva > 0
          ? valorReserva
          : valorRoteiro > 0
            ? valorRoteiro * quantidade
            : 0

    if (!valorFinal || valorFinal <= 0) {
      return json(
        {
          sucesso: false,
          error: 'Valor inválido para gerar PIX.'
        },
        400
      )
    }

    const orderId = String(
      body?.order_id ||
        body?.orderId ||
        reserva.paghiper_order_id ||
        reserva.order_id ||
        reserva.id
    )

    const notificationUrl = montarNotificationUrl(body)

    const payloadPagHiper = montarPayloadPagHiper({
      body,
      reserva,
      cliente,
      roteiro,
      valorFinal,
      orderId,
      notificationUrl
    })

    console.log('Criando PIX PagHiper:', {
      reservaId: reserva.id,
      orderId,
      notificationUrl,
      valorFinal,
      price_cents: paraCentavos(valorFinal)
    })

    const respostaPagHiper = await criarPixNaPagHiper(payloadPagHiper)

    console.log('Resposta PagHiper create-pix:', respostaPagHiper)

    const dadosPix = extrairDadosPix(respostaPagHiper)

    const transactionIdFinal =
      dadosPix.transactionId ||
      reserva.paghiper_transaction_id ||
      reserva.transaction_id ||
      null

    const orderIdFinal =
      dadosPix.orderId ||
      orderId ||
      reserva.paghiper_order_id ||
      reserva.order_id ||
      reserva.id

    const updatePayload = {
      paghiper_order_id: orderIdFinal,
      order_id: orderIdFinal,
      paghiper_transaction_id: transactionIdFinal,
      transaction_id: transactionIdFinal,
      qr_code_base64: dadosPix.qrCodeBase64 || null,
      pix_qr_code: dadosPix.qrCodeBase64 || null,
      pix_copia_cola: dadosPix.codigoPix || null,
      codigo_pix: dadosPix.codigoPix || null,
      paghiper_status: dadosPix.status || 'created',
      pagamento_status: 'pendente',
      status: reserva.status === 'cancelada' ? 'cancelada' : 'pendente',
      paghiper_create_payload: respostaPagHiper,
      notification_url: notificationUrl,
      updated_at: new Date().toISOString()
    }

    const update = await atualizarReservaComFallback(
      supabase,
      reserva.id,
      updatePayload
    )

    return json({
      sucesso: true,
      message: 'PIX criado com sucesso.',
      reservaId: reserva.id,
      valor: valorFinal,
      order_id: orderIdFinal,
      transaction_id: transactionIdFinal,
      paghiper_order_id: orderIdFinal,
      paghiper_transaction_id: transactionIdFinal,
      qr_code_base64: dadosPix.qrCodeBase64 || null,
      pix_qr_code: dadosPix.qrCodeBase64 || null,
      pix_copia_cola: dadosPix.codigoPix || null,
      codigo_pix: dadosPix.codigoPix || null,
      status: dadosPix.status || 'created',
      notification_url: notificationUrl,
      update,
      raw: respostaPagHiper
    })
  } catch (error: any) {
    console.error('Erro ao criar PIX PagHiper:', error)

    return json(
      {
        sucesso: false,
        error: error?.message || 'Erro interno ao criar PIX PagHiper.'
      },
      500
    )
  }
}

export async function GET() {
  return json({
    sucesso: true,
    rota: '/api/paghiper/create-pix',
    metodo: 'POST',
    mensagem: 'Rota de criação PIX PagHiper ativa.'
  })
}