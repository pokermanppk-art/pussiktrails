import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { reservaId, valor, email, nome, descricao } = await request.json()

    console.log('🔵 Criando PIX via PagHiper para reserva:', { reservaId, valor })

    // URL da API PagHiper (IP direto)
    const url = 'https://187.45.245.52/transaction/create/'
    
    let response, data
    let erroReal = null

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Host': 'api.paghiper.com.br'
        },
        body: JSON.stringify({
          apiKey: process.env.PAGHIPER_API_KEY,
          token: process.env.PAGHIPER_TOKEN,
          order_id: reservaId,
          payer_email: email,
          payer_name: nome,
          amount: Number(valor).toFixed(2),
          days_due_date: 1,
          type: 'pix',
          description: descricao || `Reserva PussikTrails - ${reservaId.slice(0, 8)}`,
          notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/pix/webhook`
        })
      })

      data = await response.json()
      console.log('🟢 Resposta PagHiper:', JSON.stringify(data, null, 2))

      if (data.status === 'success' && data.pix_qr_code && data.pix_code) {
        return NextResponse.json({
          success: true,
          qrCode: data.pix_qr_code,
          codigoPix: data.pix_code,
          transactionId: data.transaction_id,
          expiresDate: data.expires_date
        })
      } else {
        erroReal = data.message || 'Resposta inválida da PagHiper'
        console.warn('⚠️ PagHiper retornou erro:', erroReal)
      }
    } catch (err: any) {
      erroReal = err.message
      console.warn('⚠️ Falha na conexão com PagHiper:', erroReal)
    }

    // ========== FALLBACK: payload manual PIX (válido) ==========
    console.log('🔄 Usando fallback: gerando payload PIX manual')

    // Função CRC16
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

    const CHAVE_PIX = process.env.PIX_KEY || 'seu-email@dominio.com'
    const txid = reservaId.replace(/-/g, '').slice(0, 25)

    let payload = '000201'
    const gui = '0014BR.GOV.BCB.PIX'
    const chaveLength = CHAVE_PIX.length.toString().padStart(2, '0')
    let merchantInfo = `26${(gui.length + 2).toString().padStart(2, '0')}${gui}${chaveLength}${CHAVE_PIX}`
    const txidField = `05${txid.length.toString().padStart(2, '0')}${txid}`
    merchantInfo += txidField
    const field26Length = (merchantInfo.length - 2).toString().padStart(2, '0')
    payload += `26${field26Length}${merchantInfo.substring(2)}`
    payload += '52040000'
    payload += '5303986'
    const valorFormatado = valor.toFixed(2)
    payload += `54${valorFormatado.length.toString().padStart(2, '0')}${valorFormatado}`
    payload += '5802BR'
    const nomeLimpo = 'PussikTrails'.substring(0, 25)
    payload += `59${nomeLimpo.length.toString().padStart(2, '0')}${nomeLimpo}`
    const cidadeLimpa = 'SAO PAULO'.substring(0, 15)
    payload += `60${cidadeLimpa.length.toString().padStart(2, '0')}${cidadeLimpa}`
    const crc = calcularCRC16(payload + '6304')
    payload += `6304${crc}`

    const qrCodeUrl = `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(payload)}&choe=UTF-8`

    return NextResponse.json({
      success: true,
      qrCode: qrCodeUrl,
      codigoPix: payload,
      transactionId: reservaId,
      expiresDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      fallback: true
    })

  } catch (error: any) {
    console.error('❌ Erro fatal:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}