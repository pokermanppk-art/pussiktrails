import { NextResponse } from 'next/server'

// ========== FUNÇÕES AUXILIARES ==========

function calcularCRC16(payload: string): string {
  let crc = 0xFFFF
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')
}

function gerarPayloadManual(chave: string, nome: string, cidade: string, valor: number, txid: string): string {
  let payload = '000201'
  const gui = '0014BR.GOV.BCB.PIX'
  const guiLength = gui.length.toString().padStart(2, '0')
  const chaveLength = chave.length.toString().padStart(2, '0')
  let merchantInfo = `26${guiLength}${gui}${chaveLength}${chave}`
  if (txid) {
    const txidField = `05${txid.length.toString().padStart(2, '0')}${txid}`
    merchantInfo += txidField
  }
  const field26Length = (merchantInfo.length - 2).toString().padStart(2, '0')
  payload += `26${field26Length}${merchantInfo.substring(2)}`
  payload += '52040000'
  payload += '5303986'
  const valorFormatado = valor.toFixed(2)
  payload += `54${valorFormatado.length.toString().padStart(2, '0')}${valorFormatado}`
  payload += '5802BR'
  const nomeLimpo = nome.substring(0, 25)
  payload += `59${nomeLimpo.length.toString().padStart(2, '0')}${nomeLimpo}`
  const cidadeLimpa = cidade.substring(0, 15)
  payload += `60${cidadeLimpa.length.toString().padStart(2, '0')}${cidadeLimpa}`
  const crc = calcularCRC16(payload + '6304')
  payload += `6304${crc}`
  return payload
}

// ========== INTEGRAÇÃO PAGHIPER ==========
async function gerarPixPagHiper(
  reservaId: string,
  valor: number,
  email: string,
  nome: string,
  descricao: string
) {
  const url = 'https://api.paghiper.com.br/transaction/create/'
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: process.env.PAGHIPER_API_KEY,
      token: process.env.PAGHIPER_TOKEN,
      order_id: reservaId,
      payer_email: email,
      payer_name: nome,
      amount: Number(valor).toFixed(2),
      days_due_date: 1,
      type: 'pix',
      description: descricao,
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/paghiper`,
    }),
  })
  const data = await response.json()
  if (data.status === 'success' && data.pix_qr_code && data.pix_code) {
    return { success: true, qrCode: data.pix_qr_code, codigoPix: data.pix_code, provider: 'PagHiper' }
  }
  throw new Error(data.message || 'Erro PagHiper')
}

// ========== INTEGRAÇÃO ASAAS ==========
async function gerarPixAsaas(
  reservaId: string,
  valor: number,
  email: string,
  nome: string,
  cpfCnpj?: string
) {
  const ASAAS_API_URL = 'https://api-sandbox.asaas.com/v3'
  const ASAAS_API_KEY = process.env.ASAAS_API_KEY

  // Criar cliente
  const customerBody: any = { name: nome, email }
  if (cpfCnpj && cpfCnpj.replace(/\D/g, '').length >= 11) {
    customerBody.cpfCnpj = cpfCnpj.replace(/\D/g, '')
  }
  const customerRes = await fetch(`${ASAAS_API_URL}/customers`, {
    method: 'POST',
    headers: { access_token: ASAAS_API_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify(customerBody),
  })
  const customer = await customerRes.json()
  if (!customerRes.ok) throw new Error(customer.errors?.[0]?.description)

  // Criar cobrança
  const paymentRes = await fetch(`${ASAAS_API_URL}/payments`, {
    method: 'POST',
    headers: { access_token: ASAAS_API_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: customer.id,
      billingType: 'PIX',
      value: Number(valor).toFixed(2),
      dueDate: new Date().toISOString().split('T')[0],
      description: `Reserva ${reservaId}`,
      externalReference: reservaId,
    }),
  })
  const payment = await paymentRes.json()
  if (!paymentRes.ok) throw new Error(payment.errors?.[0]?.description)

  // Buscar QR Code
  const qrRes = await fetch(`${ASAAS_API_URL}/payments/${payment.id}/pixQrCode`, {
    headers: { access_token: ASAAS_API_KEY! },
  })
  const qrData = await qrRes.json()
  if (!qrRes.ok) throw new Error('Erro ao gerar QR Code')

  return {
    success: true,
    qrCode: qrData.encodedImage,
    codigoPix: qrData.payload,
    provider: 'Asaas',
    expiresDate: qrData.expirationDate,
  }
}

// ========== FALLBACK MANUAL ==========
function gerarPixManual(reservaId: string, valor: number, nome: string) {
  const chavePix = process.env.PIX_KEY || 'chave-pix-nao-configurada@exemplo.com'
  const txid = reservaId.replace(/-/g, '').slice(0, 25)
  const payload = gerarPayloadManual(chavePix, 'PussikTrails', 'SAO PAULO', valor, txid)
  const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=250`
  return {
    success: true,
    qrCode: qrCodeUrl,
    codigoPix: payload,
    provider: 'Manual',
    expiresDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

// ========== ENDPOINT PRINCIPAL ==========
export async function POST(request: Request) {
  try {
    const { reservaId, valor, email, nome, cpfCnpj, descricao } = await request.json()

    // 1. Tentar PagHiper
    try {
      if (!process.env.PAGHIPER_API_KEY || !process.env.PAGHIPER_TOKEN) {
        throw new Error('PagHiper não configurado')
      }
      const result = await gerarPixPagHiper(reservaId, valor, email, nome, descricao)
      return NextResponse.json(result)
    } catch (err: any) {
      console.warn('⚠️ PagHiper falhou:', err.message)
    }

    // 2. Tentar Asaas
    try {
      if (!process.env.ASAAS_API_KEY) {
        throw new Error('Asaas não configurado')
      }
      const result = await gerarPixAsaas(reservaId, valor, email, nome, cpfCnpj)
      return NextResponse.json(result)
    } catch (err: any) {
      console.warn('⚠️ Asaas falhou:', err.message)
    }

    // 3. Fallback Manual
    console.log('🔄 Usando fallback manual')
    const fallback = gerarPixManual(reservaId, valor, nome)
    return NextResponse.json(fallback)
  } catch (error: any) {
    console.error('❌ Erro fatal:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}