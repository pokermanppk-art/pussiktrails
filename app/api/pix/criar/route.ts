import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { reservaId, valor, email, nome } = await request.json()

    // Gerar um QR Code estático de exemplo (usando API pública para teste)
    // QR Code com o texto: "PIX SIMULADO - Reserva " + reservaId
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PIX%20SIMULADO%20-%20Reserva%20${reservaId}%20-%20Valor%20R$${valor}`
    
    // Código PIX simulado
    const codigoPixSimulado = `00020126580014BR.GOV.BCB.PIX0136${reservaId}5204000053039865404${valor}5802BR5925${nome}6009SAO PAULO62070503***6304E2CA`

    return NextResponse.json({
      success: true,
      qrCode: qrCodeUrl,
      codigoPix: codigoPixSimulado,
      transactionId: `SIM_${reservaId}_${Date.now()}`,
      simulacao: true
    })

  } catch (error) {
    console.error('Erro ao criar PIX simulado:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}