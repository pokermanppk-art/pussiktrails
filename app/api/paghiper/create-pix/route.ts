import { NextResponse } from 'next/server'
import axios from 'axios'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

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

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function somenteNumeros(valor: unknown) {
  return texto(valor).replace(/\D/g, '')
}

function emailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function mascararDocumento(documento: string) {
  const numeros = somenteNumeros(documento)

  if (numeros.length === 11) {
    return `***.***.${numeros.slice(6, 9)}-${numeros.slice(9)}`
  }

  if (numeros.length === 14) {
    return `**.***.${numeros.slice(5, 8)}/${numeros.slice(8, 12)}-${numeros.slice(12)}`
  }

  return 'documento inválido ou ausente'
}

function normalizarValorEmCentavos(valor: unknown) {
  const numero = Number(String(valor || '').replace(',', '.'))

  if (!Number.isFinite(numero) || numero <= 0) {
    throw new Error('Valor da reserva inválido para gerar PIX.')
  }

  return Math.round(numero * 100)
}

function todosDigitosIguais(valor: string) {
  return /^(\d)\1+$/.test(valor)
}

function cpfValido(cpfOriginal: string) {
  const cpf = somenteNumeros(cpfOriginal)

  if (cpf.length !== 11 || todosDigitosIguais(cpf)) return false

  let soma = 0
  for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i)
  let resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  if (resto !== Number(cpf[9])) return false

  soma = 0
  for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i)
  resto = (soma * 10) % 11
  if (resto === 10) resto = 0

  return resto === Number(cpf[10])
}

function cnpjValido(cnpjOriginal: string) {
  const cnpj = somenteNumeros(cnpjOriginal)

  if (cnpj.length !== 14 || todosDigitosIguais(cnpj)) return false

  const pesosPrimeiro = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const pesosSegundo = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const calcularDigito = (base: string, pesos: number[]) => {
    const soma = pesos.reduce((total, peso, index) => total + Number(base[index]) * peso, 0)
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }

  const primeiro = calcularDigito(cnpj.slice(0, 12), pesosPrimeiro)
  const segundo = calcularDigito(cnpj.slice(0, 13), pesosSegundo)

  return primeiro === Number(cnpj[12]) && segundo === Number(cnpj[13])
}

function documentoValido(documento: string) {
  const numeros = somenteNumeros(documento)

  if (numeros.length === 11) return cpfValido(numeros)
  if (numeros.length === 14) return cnpjValido(numeros)

  return false
}

function telefoneParaPagHiper(...valores: unknown[]) {
  for (const valor of valores) {
    const numeros = somenteNumeros(valor)

    if (numeros.length >= 10 && numeros.length <= 13) {
      return numeros
    }
  }

  return ''
}

function primeiroTexto(...valores: unknown[]) {
  for (const valor of valores) {
    const item = texto(valor)
    if (item) return item
  }

  return ''
}

function primeiroNumeroDocumento(...valores: unknown[]) {
  for (const valor of valores) {
    const item = somenteNumeros(valor)
    if (item) return item
  }

  return ''
}

function procurarCampoRecursivo(obj: any, nomes: string[]): string {
  if (!obj) return ''
  if (typeof obj !== 'object') return ''

  for (const nome of nomes) {
    const valor = obj[nome]

    if (typeof valor === 'string' && valor.trim()) return valor
    if (typeof valor === 'number') return String(valor)
  }

  for (const key of Object.keys(obj)) {
    const encontrado = procurarCampoRecursivo(obj[key], nomes)
    if (encontrado) return encontrado
  }

  return ''
}

function extrairDadosPix(data: any) {
  const transactionId = procurarCampoRecursivo(data, [
    'transaction_id',
    'transactionId',
    'idTransacao',
    'id_transacao',
    'id_transaction',
    'hash'
  ])

  const pixCode = procurarCampoRecursivo(data, [
    'pix_code',
    'pix_copia_cola',
    'codigo_pix',
    'qr_code_text',
    'emv',
    'copy_paste',
    'copia_cola',
    'qrcode_text',
    'qrCodeText'
  ])

  const qrCodeBase64 = procurarCampoRecursivo(data, [
    'qr_code_base64',
    'qrcode_base64',
    'pix_qr_code_base64',
    'pix_qrcode_base64',
    'qrcode_image',
    'qrCodeBase64'
  ])

  const status = procurarCampoRecursivo(data, [
    'status',
    'status_request',
    'status_pagamento',
    'payment_status'
  ])

  return {
    transactionId,
    pixCode,
    qrCodeBase64,
    status
  }
}

function erroDeColunaAusente(error: any) {
  const mensagem = String(error?.message || error?.details || error?.hint || '').toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    mensagem.includes('could not find') ||
    mensagem.includes('schema cache') ||
    mensagem.includes('column') ||
    mensagem.includes('does not exist')
  )
}

function extrairColunaAusente(error: any) {
  const textoErro = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ')

  const matchTabela = textoErro.match(/reservas\.([a-zA-Z0-9_]+)/)
  if (matchTabela?.[1]) return matchTabela[1]

  const matchColumn = textoErro.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i)
  if (matchColumn?.[1]) return matchColumn[1]

  const matchAspas = textoErro.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  return ''
}

async function atualizarReservaComFallback(params: {
  supabase: any
  reservaId: string
  payloadOriginal: AnyRecord
}) {
  const { supabase, reservaId } = params
  let payload: AnyRecord = { ...params.payloadOriginal }

  for (let tentativa = 0; tentativa < 20; tentativa++) {
    const { data, error } = await supabase
      .from('reservas')
      .update(payload)
      .eq('id', reservaId)
      .select('*')
      .maybeSingle()

    if (!error) return data

    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payload)) throw error

    delete payload[coluna]

    if (Object.keys(payload).length === 0) {
      throw new Error('Nenhuma coluna disponível para atualizar a reserva com os dados do PIX.')
    }
  }

  throw new Error('Não foi possível atualizar a reserva com os dados do PIX.')
}

function clienteIdDaReserva(reserva: AnyRecord, body: AnyRecord) {
  return primeiroTexto(
    reserva.cliente_id,
    reserva.id_cliente,
    reserva.usuario_id,
    reserva.user_id,
    reserva.comprador_id,
    body.clienteId,
    body.cliente_id,
    body.userId,
    body.user_id
  )
}

async function buscarClienteDaReserva(supabase: any, reserva: AnyRecord, body: AnyRecord) {
  const clienteId = clienteIdDaReserva(reserva, body)

  if (!clienteId) return null

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', clienteId)
    .maybeSingle()

  if (error) {
    console.warn('[PagHiper/create-pix] Não foi possível buscar cliente da reserva:', {
      code: error?.code,
      message: error?.message
    })
    return null
  }

  return data || null
}

function montarDadosPagador(params: {
  body: AnyRecord
  reserva: AnyRecord
  cliente: AnyRecord | null
}) {
  const { body, reserva, cliente } = params

  const nome = primeiroTexto(
    cliente?.nome,
    cliente?.nome_completo,
    cliente?.razao_social,
    reserva.nome_cliente,
    reserva.cliente_nome,
    reserva.payer_name,
    body.nome,
    body.nomeCliente,
    body.payer_name
  )

  const email = primeiroTexto(
    cliente?.email,
    reserva.email_cliente,
    reserva.cliente_email,
    reserva.email,
    reserva.payer_email,
    body.email,
    body.emailCliente,
    body.payer_email
  ).toLowerCase()

  const cpfCnpj = primeiroNumeroDocumento(
    cliente?.cpf,
    cliente?.cpf_cnpj,
    cliente?.documento,
    cliente?.cnpj,
    reserva.cpf,
    reserva.cpf_cnpj,
    reserva.documento_cliente,
    reserva.payer_cpf_cnpj,
    body.cpf,
    body.cpfCnpj,
    body.cpf_cnpj,
    body.payer_cpf_cnpj
  )

  const telefone = telefoneParaPagHiper(
    cliente?.telefone,
    cliente?.celular,
    cliente?.whatsapp,
    reserva.telefone_cliente,
    reserva.cliente_telefone,
    reserva.celular_cliente,
    reserva.payer_phone,
    body.telefone,
    body.celular,
    body.whatsapp,
    body.payer_phone
  )

  return {
    nome,
    email,
    cpfCnpj,
    telefone
  }
}

function respostaDadosPagamentoIncompletos(params: {
  nome: string
  email: string
  cpfCnpj: string
}) {
  const { nome, email, cpfCnpj } = params

  const campos: string[] = []

  if (!nome) campos.push('nome')
  if (!email || !emailValido(email)) campos.push('e-mail')
  if (!cpfCnpj || !documentoValido(cpfCnpj)) campos.push('CPF/CNPJ válido')

  if (campos.length === 0) return null

  return NextResponse.json(
    {
      success: false,
      error: true,
      code: 'DADOS_PAGADOR_INCOMPLETOS',
      message: `Para gerar o PIX, complete os dados do cliente: ${campos.join(', ')}.`,
      campos,
      documento: mascararDocumento(cpfCnpj)
    },
    { status: 422 }
  )
}

export async function GET() {
  return NextResponse.json({
    success: true,
    rota: '/api/paghiper/create-pix',
    message: 'Rota ativa. Use POST com reservaId para gerar PIX PagHiper.',
    required: ['reservaId', 'cliente com nome, email e CPF/CNPJ válido no banco']
  })
}

export async function POST(req: Request) {
  let reservaIdLog = ''

  try {
    const body = (await req.json().catch(() => ({}))) as AnyRecord

    const apiKey = process.env.PAGHIPER_API_KEY
    const token = process.env.PAGHIPER_TOKEN
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://prussiktrails.com.br').replace(/\/+$/, '')

    if (!apiKey || !token) {
      return NextResponse.json(
        {
          success: false,
          error: true,
          message: 'Credenciais PagHiper ausentes no ambiente. Configure PAGHIPER_API_KEY e PAGHIPER_TOKEN na Vercel.'
        },
        { status: 500 }
      )
    }

    const reservaId = primeiroTexto(body.reservaId, body.reserva_id, body.id)
    reservaIdLog = reservaId

    if (!reservaId) {
      return NextResponse.json(
        {
          success: false,
          error: true,
          message: 'reservaId não enviado.'
        },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: reserva, error: reservaError } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', reservaId)
      .maybeSingle()

    if (reservaError) throw reservaError

    if (!reserva) {
      return NextResponse.json(
        {
          success: false,
          error: true,
          message: 'Reserva não encontrada.'
        },
        { status: 404 }
      )
    }

    const forcarNovoPix = Boolean(body.forcarNovoPix || body.forceNew || body.novoPix)

    if (reserva.pagamento_status === 'pago') {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        message: 'Reserva já está paga.',
        reserva
      })
    }

    if (
      !forcarNovoPix &&
      reserva.paghiper_order_id &&
      (reserva.paghiper_pix_code || reserva.paghiper_qrcode_base64)
    ) {
      return NextResponse.json({
        success: true,
        reused: true,
        message: 'PIX já existente para esta reserva.',
        order_id: reserva.paghiper_order_id,
        transaction_id: reserva.paghiper_transaction_id,
        pix_code: reserva.paghiper_pix_code,
        qr_code_base64: reserva.paghiper_qrcode_base64,
        status: reserva.paghiper_status,
        reserva
      })
    }

    const cliente = await buscarClienteDaReserva(supabase, reserva, body)
    const dadosPagador = montarDadosPagador({ body, reserva, cliente })
    const respostaIncompleta = respostaDadosPagamentoIncompletos(dadosPagador)

    if (respostaIncompleta) return respostaIncompleta

    const valorReserva = body.valor || reserva.valor_total || reserva.valor || reserva.preco || 0
    const priceCents = normalizarValorEmCentavos(valorReserva)

    const orderId = forcarNovoPix
      ? `RESERVA-${reserva.id}-${Date.now()}`
      : `RESERVA-${reserva.id}`

    const descricaoItem = primeiroTexto(
      body.descricao,
      reserva.descricao_pagamento,
      reserva.roteiro_titulo,
      reserva.titulo_roteiro,
      `Reserva PrussikTrails ${reserva.id}`
    )

    const payloadPagHiper: AnyRecord = {
      apiKey,
      token,
      order_id: orderId,
      payer_email: dadosPagador.email,
      payer_name: dadosPagador.nome,
      payer_cpf_cnpj: dadosPagador.cpfCnpj,
      days_due_date: 1,
      type_bank_slip: 'PIX',
      items: [
        {
          description: descricaoItem,
          quantity: 1,
          item_id: String(reserva.id),
          price_cents: priceCents
        }
      ],
      notification_url: `${appUrl}/api/paghiper/webhook`
    }

    if (dadosPagador.telefone) {
      payloadPagHiper.payer_phone = dadosPagador.telefone
    }

    console.info('[PagHiper/create-pix] Gerando PIX:', {
      reservaId: reserva.id,
      orderId,
      clienteId: cliente?.id || clienteIdDaReserva(reserva, body) || null,
      documento: mascararDocumento(dadosPagador.cpfCnpj),
      email: dadosPagador.email,
      valorCentavos: priceCents,
      telefoneInformado: Boolean(dadosPagador.telefone)
    })

    const response = await axios.post(
      'https://pix.paghiper.com/invoice/create/',
      payloadPagHiper,
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    )

    const retornoPagHiper = response.data
    const dadosPix = extrairDadosPix(retornoPagHiper)

    const reservaAtualizada = await atualizarReservaComFallback({
      supabase,
      reservaId: reserva.id,
      payloadOriginal: {
        paghiper_order_id: orderId,
        paghiper_transaction_id: dadosPix.transactionId || null,
        paghiper_pix_code: dadosPix.pixCode || null,
        paghiper_qrcode_base64: dadosPix.qrCodeBase64 || null,
        paghiper_status: dadosPix.status || 'created',
        paghiper_response: retornoPagHiper,
        pagamento_status: 'pendente',
        pagamento_criado_em: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      order_id: orderId,
      transaction_id: dadosPix.transactionId,
      pix_code: dadosPix.pixCode,
      qr_code_base64: dadosPix.qrCodeBase64,
      status: dadosPix.status,
      reserva: reservaAtualizada || reserva,
      paghiper: retornoPagHiper
    })
  } catch (error: any) {
    const paghiperDetails = error?.response?.data || null

    console.error('[PagHiper/create-pix] ERRO:', {
      reservaId: reservaIdLog || null,
      message: error?.message,
      status: error?.response?.status,
      paghiperDetails
    })

    return NextResponse.json(
      {
        success: false,
        error: true,
        message: error?.message || 'Erro interno ao gerar PIX PagHiper.',
        details: paghiperDetails
      },
      { status: error?.response?.status || 500 }
    )
  }
}
