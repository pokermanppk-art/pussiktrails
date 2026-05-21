import { NextResponse } from 'next/server'

const ASAAS_API_URL = 'https://api-sandbox.asaas.com/v3'
const ASAAS_API_KEY = process.env.ASAAS_API_KEY

export async function POST(request: Request) {
  try {
    const { email, nome, cpfCnpj } = await request.json()

    if (!ASAAS_API_KEY) {
      return NextResponse.json({ error: 'API key não configurada' }, { status: 500 })
    }

    const body: any = { name: nome, email }
    if (cpfCnpj && cpfCnpj.replace(/\D/g, '').length >= 11) {
      body.cpfCnpj = cpfCnpj.replace(/\D/g, '')
    }

    const response = await fetch(`${ASAAS_API_URL}/customers`, {
      method: 'POST',
      headers: { 'access_token': ASAAS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    if (!response.ok) return NextResponse.json({ error: data.errors?.[0]?.description }, { status: response.status })

    return NextResponse.json({ customerId: data.id })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}