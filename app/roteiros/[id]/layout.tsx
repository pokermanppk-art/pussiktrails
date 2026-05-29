import type { Metadata } from 'next'
import type { ReactNode } from 'react'

type AnyRecord = Record<string, any>

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://prussiktrails.com.br'

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function limparTexto(valor: unknown) {
  return texto(valor)
    .replace(/^#{1,6}\s?/gm, '')
    .replace(/\*\*/g, '')
    .replace(/^[-]{3,}$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function resolverParams(params: any) {
  if (params && typeof params.then === 'function') {
    return await params
  }

  return params || {}
}

async function buscarRoteiro(id: string): Promise<AnyRecord | null> {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

  if (!supabaseUrl || !serviceRoleKey || !id) return null

  const url = `${supabaseUrl}/rest/v1/roteiros?id=eq.${encodeURIComponent(
    id
  )}&select=*&limit=1`

  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json'
    },
    cache: 'no-store'
  })

  if (!response.ok) return null

  const data = await response.json().catch(() => [])

  return Array.isArray(data) && data.length > 0 ? data[0] : null
}

function tituloRoteiro(roteiro: AnyRecord | null) {
  return (
    texto(roteiro?.titulo) ||
    texto(roteiro?.nome) ||
    'Roteiro PrussikTrails'
  )
}

function localRoteiro(roteiro: AnyRecord | null) {
  return (
    texto(roteiro?.local) ||
    texto(roteiro?.localizacao) ||
    texto(roteiro?.cidade) ||
    texto(roteiro?.destino) ||
    texto(roteiro?.embarque_local) ||
    texto(roteiro?.local_encontro) ||
    texto(roteiro?.ponto_encontro) ||
    'Experiência outdoor'
  )
}

function descricaoRoteiro(roteiro: AnyRecord | null) {
  const descricao =
    limparTexto(roteiro?.descricao) ||
    limparTexto(roteiro?.roteiro_detalhado) ||
    limparTexto(roteiro?.detalhes) ||
    'Conheça este roteiro outdoor no PrussikTrails.'

  const local = localRoteiro(roteiro)

  const frase = local
    ? `${descricao} Local: ${local}. Veja detalhes e reserve pelo app.`
    : `${descricao} Veja detalhes e reserve pelo app.`

  return frase.slice(0, 210)
}

export async function generateMetadata({
  params
}: {
  params: any
}): Promise<Metadata> {
  const resolvedParams = await resolverParams(params)
  const id = texto(resolvedParams?.id)

  const roteiro = await buscarRoteiro(id)

  const titulo = tituloRoteiro(roteiro)
  const descricao = descricaoRoteiro(roteiro)
  const url = `${APP_URL}/roteiros/${id}`
  const imagem = `${APP_URL}/roteiros/${id}/opengraph-image?v=20260529`

  return {
    title: `${titulo} | PrussikTrails`,
    description: descricao,
    alternates: {
      canonical: url
    },
    openGraph: {
      title: titulo,
      description: descricao,
      url,
      siteName: 'PrussikTrails',
      type: 'website',
      locale: 'pt_BR',
      images: [
        {
          url: imagem,
          width: 1200,
          height: 630,
          alt: titulo
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: titulo,
      description: descricao,
      images: [imagem]
    },
    other: {
      'og:image:secure_url': imagem,
      'og:image:type': 'image/png',
      'og:image:width': '1200',
      'og:image:height': '630'
    }
  }
}

export default function RoteiroDetalheLayout({
  children
}: {
  children: ReactNode
}) {
  return children
}
