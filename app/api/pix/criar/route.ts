import { NextResponse } from 'next/server'

// Função para calcular CRC16 (necessário para o payload PIX)
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

// Função para gerar o payload PIX (código copiável)
function gerarPayloadPIX(dados: {
  chave: string
  nome: string
  cidade: string
  valor: number
  txid: string
}) {
  const { chave, nome, cidade, valor, txid } = dados
  
  let payload = ''
  
  // 00 - Payload Format Indicator
  payload += '000201'
  
  // 26 - Merchant Account Information (GUI + chave PIX)
  const gui = '0014BR.GOV.BCB.PIX'
  const guiLength = gui.length.toString().padStart(2, '0')
  const chaveLength = chave.length.toString().padStart(2, '0')
  let merchantInfo = `26${guiLength}${gui}${chaveLength}${chave}`
  
  // Adicionar TXID se fornecido (máx 25 caracteres)
  if (txid) {
    const txidField = `05${txid.length.toString().padStart(2, '0')}${txid}`
    merchantInfo += txidField
  }
  
  // Atualizar tamanho do campo 26
  const field26Length = (merchantInfo.length - 2).toString().padStart(2, '0')
  const field26Complete = `26${field26Length}${merchantInfo.substring(2)}`
  payload += field26Complete
  
  // 52 - Merchant Category Code (0000 para PIX)
  payload += '52040000'
  
  // 53 - Currency Code (986 = BRL)
  payload += '5303986'
  
  // 54 - Transaction Amount
  const valorFormatado = valor.toFixed(2)
  const valorLength = valorFormatado.length.toString().padStart(2, '0')
  payload += `54${valorLength}${valorFormatado}`
  
  // 58 - Country Code (BR)
  payload += '5802BR'
  
  // 59 - Merchant Name (até 25 caracteres)
  const nomeLimpo = nome.substring(0, 25)
  const nomeLength = nomeLimpo.length.toString().padStart(2, '0')
  payload += `59${nomeLength}${nomeLimpo}`
  
  // 60 - Merchant City (até 15 caracteres)
  const cidadeLimpa = cidade.substring(0, 15)
  const cidadeLength = cidadeLimpa.length.toString().padStart(2, '0')
  payload += `60${cidadeLength}${cidadeLimpa}`
  
  // 63 - CRC16 (calculado sobre o payload + '6304')
  const crc = calcularCRC16(payload + '6304')
  payload += `6304${crc}`
  
  return payload
}

export async function POST(request: Request) {
  try {
    const { reservaId, valor, email, nome, descricao } = await request.json()

    console.log('🔵 Gerando PIX manual para reserva:', { reservaId, valor, nome })

    // ========== SUA CHAVE PIX REAL ==========
    // Configure no arquivo .env.local: PIX_KEY=seu-email@dominio.com
    const CHAVE_PIX = process.env.PIX_KEY
    if (!CHAVE_PIX) {
      console.error('❌ PIX_KEY não configurada no .env.local')
      return NextResponse.json({ error: 'Chave PIX não configurada' }, { status: 500 })
    }
    // ========================================

    // Gerar TXID único (máximo 25 caracteres, apenas letras/números)
    const txid = reservaId.replace(/-/g, '').slice(0, 25)

    // Gerar payload PIX
    const payload = gerarPayloadPIX({
      chave: CHAVE_PIX,
      nome: 'PussikTrails',
      cidade: 'SAO PAULO',
      valor: valor,
      txid: txid
    })

    // Gerar QR Code usando API pública (Google Charts)
    const qrCodeUrl = `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(payload)}&choe=UTF-8`

    return NextResponse.json({
      success: true,
      qrCode: qrCodeUrl,
      codigoPix: payload,
      transactionId: reservaId,
      expiresDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
    })

  } catch (error: any) {
    console.error('❌ Erro ao criar PIX:', error)
    return NextResponse.json({ 
      error: 'Erro interno ao criar PIX',
      details: error?.message || 'Erro desconhecido'
    }, { status: 500 })
  }
}