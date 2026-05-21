import { NextResponse } from 'next/server'

// Função CRC16 (mesma de antes)
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

function gerarPayloadPIX(dados: {
  chave: string
  nome: string
  cidade: string
  valor: number
  txid: string
}) {
  const { chave, nome, cidade, valor, txid } = dados
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

export async function POST(request: Request) {
  try {
    const { reservaId, valor, nome } = await request.json()

    // Verifica se a chave PIX está configurada
    const chavePix = process.env.PIX_KEY
    if (!chavePix) {
      console.error('❌ PIX_KEY não definida no .env.local')
      return NextResponse.json(
        { error: 'Chave PIX não configurada. Defina PIX_KEY no ambiente.' },
        { status: 500 }
      )
    }

    const txid = reservaId.replace(/-/g, '').slice(0, 25)
    const payload = gerarPayloadPIX({
      chave: chavePix,
      nome: 'PussikTrails',
      cidade: 'SAO PAULO',
      valor: valor,
      txid: txid,
    })

    const qrCodeUrl = `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(payload)}&choe=UTF-8`

    return NextResponse.json({
      success: true,
      qrCode: qrCodeUrl,
      codigoPix: payload,
      transactionId: reservaId,
      expiresDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
  } catch (error: any) {
    console.error('❌ Erro ao criar PIX:', error)
    return NextResponse.json(
      { error: 'Erro interno ao criar PIX', details: error?.message },
      { status: 500 }
    )
  }
}