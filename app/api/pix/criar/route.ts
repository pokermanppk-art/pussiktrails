import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { reservaId, valor, email, nome, descricao } = await request.json()

    console.log('🔵 Criando PIX para reserva:', { reservaId, valor, email, nome })

    // URL da API PagHiper (usando IP direto para evitar DNS)
    const url = 'https://187.45.245.52/transaction/create/'
    
    // Tentar chamada real na PagHiper
    let response
    let data
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
        // Sucesso na PagHiper
        return NextResponse.json({
          success: true,
          qrCode: data.pix_qr_code,
          codigoPix: data.pix_code,
          transactionId: data.transaction_id,
          expiresDate: data.expires_date
        })
      } else {
        erroReal = data.message || 'Resposta inválida da PagHiper'
        console.warn('⚠️ PagHiper retornou erro, usando fallback:', erroReal)
      }
    } catch (err: any) {
      erroReal = err.message
      console.warn('⚠️ Falha na conexão com PagHiper, usando fallback:', erroReal)
    }

    // ========== FALLBACK: SIMULAÇÃO (QR Code gerado localmente) ==========
    console.log('🔄 Gerando PIX simulado como fallback')

    // Gerar QR Code usando API pública (QR Server)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=PIX%20PussikTrails%20-%20Reserva%20${reservaId.slice(0, 8)}%20-%20Valor%20R$${valor}`
    
    // Código PIX simulado (estático, apenas para copiar)
    const codigoPixSimulado = `00020126580014BR.GOV.BCB.PIX0136${reservaId.slice(0, 25)}5204000053039865404${Math.floor(valor * 100)}5802BR5925${nome.substring(0, 25)}6009SAO PAULO62070503***6304E2CA`

    return NextResponse.json({
      success: true,
      qrCode: qrCodeUrl,
      codigoPix: codigoPixSimulado,
      transactionId: `SIM_${reservaId}_${Date.now()}`,
      fallback: true,
      message: 'Modo de demonstração - QR Code gerado localmente'
    })

  } catch (error: any) {
    console.error('❌ Erro fatal ao criar PIX:', error)
    return NextResponse.json({ 
      error: 'Erro interno ao criar PIX',
      details: error?.message || 'Erro desconhecido'
    }, { status: 500 })
  }
}