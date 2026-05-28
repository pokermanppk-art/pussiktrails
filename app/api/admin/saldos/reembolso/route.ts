import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TARGET_PATH = '/api/admin/saldos/reembolsos'

async function proxy(request: NextRequest) {
  try {
    const targetUrl = new URL(TARGET_PATH, request.url)

    request.nextUrl.searchParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value)
    })

    const method = request.method.toUpperCase()

    const body =
      method === 'GET' || method === 'HEAD'
        ? undefined
        : await request.text()

    const headers: HeadersInit = {}

    const contentType = request.headers.get('content-type')
    if (contentType) headers['Content-Type'] = contentType

    const response = await fetch(targetUrl.toString(), {
      method,
      headers,
      body,
      cache: 'no-store',
    })

    const responseContentType = response.headers.get('content-type') || ''

    if (responseContentType.includes('application/json')) {
      const data = await response.json().catch(() => null)
      return NextResponse.json(data, { status: response.status })
    }

    const text = await response.text().catch(() => '')

    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': responseContentType || 'text/plain',
      },
    })
  } catch (error) {
    console.error('Erro na rota /api/admin/saldos/reembolso:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao encaminhar reembolso.',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return proxy(request)
}

export async function PATCH(request: NextRequest) {
  return proxy(request)
}

export async function POST(request: NextRequest) {
  return proxy(request)
}