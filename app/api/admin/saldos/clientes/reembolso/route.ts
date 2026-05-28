import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TARGET_PATH = '/api/admin/saldos/reembolsos'

async function encaminharParaRotaPrincipal(request: NextRequest) {
  try {
    const targetUrl = new URL(TARGET_PATH, request.url)

    request.nextUrl.searchParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value)
    })

    const headers: Record<string, string> = {
      'Content-Type': request.headers.get('content-type') || 'application/json',
    }

    const method = request.method.toUpperCase()

    const body =
      method === 'GET' || method === 'HEAD'
        ? undefined
        : await request.text()

    const response = await fetch(targetUrl.toString(), {
      method,
      headers,
      body,
      cache: 'no-store',
    })

    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const data = await response.json().catch(() => null)

      return NextResponse.json(data, {
        status: response.status,
      })
    }

    const text = await response.text().catch(() => '')

    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': contentType || 'text/plain',
      },
    })
  } catch (error) {
    console.error(
      'Erro na rota de compatibilidade /api/admin/saldos/clientes/reembolso:',
      error
    )

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao encaminhar solicitação de reembolso.',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return encaminharParaRotaPrincipal(request)
}

export async function PATCH(request: NextRequest) {
  return encaminharParaRotaPrincipal(request)
}

export async function POST(request: NextRequest) {
  return encaminharParaRotaPrincipal(request)
}