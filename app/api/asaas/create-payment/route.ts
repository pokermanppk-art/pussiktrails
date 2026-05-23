import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { asaasClient, asaas } from '@/lib/asaas'

export async function POST(request: NextRequest) {
  try {
    const { reservaId, valor, descricao, clienteNome, clienteEmail, clienteCpf, clienteCelular } = await request.json()

    // 1. Criar ou buscar cliente no Asaas
    let customerId: string
    
    // Buscar cliente existente pelo CPF
    try {
      const response = await asaasClient.get('/customers', {
        params: { cpfCnpj: clienteCpf?.replace(/\D/g, '') }
      })
      
      if (response.data?.data?.length > 0) {
        customerId = response.data.data[0].id
      } else {
        // Criar novo cliente
        const customer = await asaas.customers.create({
          name: clienteNome,
          email: clienteEmail,
          cpfCnpj: clienteCpf?.replace(/\D/g, '') || '',
          mobilePhone: clienteCelular?.replace(/\D/g, ''),
        })
        customerId = customer.id
      }
    } catch (err) {
      // Se não encontrou, criar novo cliente
      const customer = await asaas.customers.create({
        name: clienteNome,
        email: clienteEmail,
        cpfCnpj: clienteCpf?.replace(/\D/g, '') || '',
        mobilePhone: clienteCelular?.replace(/\D/g, ''),
      })
      customerId = customer.id
    }

    // 2. Data de vencimento (amanhã)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 1)
    const dueDateStr = dueDate.toISOString().split('T')[0]

    // 3. Criar pagamento PIX
    const payment = await asaas.payments.create({
      customer: customerId,
      billingType: 'PIX',
      value: valor,
      dueDate: dueDateStr,
      description: descricao || `Reserva PussikTrails - ${reservaId}`,
      externalReference: reservaId,
    })

    // 4. Buscar QR Code do PIX
    const pixQrCode = await asaas.payments.getPixQrCode(payment.id)

    // 5. Salvar referência no banco
    await supabase
      .from('reservas')
      .update({ 
        asaas_payment_id: payment.id,
        pagamento_status: 'aguardando'
      })
      .eq('id', reservaId)

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      qrCode: pixQrCode.payload,
      qrCodeBase64: pixQrCode.encodedImage,
      status: payment.status,
      invoiceUrl: payment.invoiceUrl,
    })
  } catch (error: any) {
    console.error('Erro ao criar pagamento Asaas:', error.response?.data || error.message)
    return NextResponse.json(
      { error: error.response?.data?.errors?.[0]?.description || 'Erro ao gerar pagamento' },
      { status: 500 }
    )
  }
}