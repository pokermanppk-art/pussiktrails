import { NextResponse } from 'next/server'

const ASAAS_API_URL = 'https://api-sandbox.asaas.com/v3'
const ASAAS_API_KEY = process.env.ASAAS_API_KEY

export async function POST(request: Request) {
  try {
    const { email, nome, cpfCnpj } = await request.json()

    if (!ASAAS_API_KEY) {
      console.error('❌ ASAAS_API_KEY não configurada')
      return NextResponse.json({ error: 'API key não configurada' }, { status: 500 })
    }

    const body: any = {
      name: nome,
      email: email,
    }

    if (cpfCnpj && cpfCnpj.replace(/\D/g, '').length >= 11) {
      body.cpfCnpj = cpfCnpj.replace(/\D/g, '')
    }

    console.log('🔵 Criando cliente Asaas:', body)

    const response = await fetch(`${ASAAS_API_URL}/customers`, {
      method: 'POST',
      headers: {
        'access_token': ASAAS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Erro ao criar cliente:', data)
      return NextResponse.json({ error: data.errors?.[0]?.description || 'Erro ao criar cliente' }, { status: response.status })
    }

    console.log('✅ Cliente criado:', data.id)
    return NextResponse.json({ customerId: data.id })

  } catch (error) {
    console.error('❌ Erro ao criar cliente Asaas:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}