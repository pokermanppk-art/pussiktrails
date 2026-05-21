import { NextResponse } from 'next/server'

const ASAAS_API_URL = 'https://api-sandbox.asaas.com/v3' // use produção depois
const ASAAS_API_KEY = process.env.ASAAS_API_KEY

export async function POST(request: Request) {
  try {
    const { email, nome, cpfCnpj } = await request.json()

    const response = await fetch(`${ASAAS_API_URL}/customers`, {
      method: 'POST',
      headers: {
        'access_token': ASAAS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: nome,
        email: email,
        cpfCnpj: cpfCnpj,
        notificationDisabled: false,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.errors?.[0]?.description || 'Erro ao criar cliente' }, { status: response.status })
    }

    return NextResponse.json({ customerId: data.id })
  } catch (error) {
    console.error('Erro ao criar cliente Asaas:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}