import type { Metadata } from 'next'
import type { ReactNode } from 'react'

type AnyRecord = Record<string, any>

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://prussiktrails.com.br'

function texto(valor: unknown) {
  return String(valor || '').trim()
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

function descricaoRoteiro(roteiro: AnyRecord | null) {
  const descricao =
    texto(roteiro?.descricao) ||
    texto(roteiro?.roteiro_detalhado) ||
    texto(roteiro?.detalhes) ||
    'Conheça este roteiro outdoor no PrussikTrails.'

  return descricao
    .replace(/^#{1,6}\s?/gm, '')
    .replace(/\*\*/g, '')
    .replace(/^[-]{3,}$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 190)
}

function imagemRoteiro(roteiro: AnyRecord | null, id: string) {
  const imagem =
    texto(roteiro?.foto_capa) ||
    texto(roteiro?.foto_url) ||
    texto(roteiro?.imagem_url) ||
    texto(roteiro?.image_url) ||
    texto(roteiro?.capa_url)

  if (imagem) return imagem

  return `${APP_URL}/roteiros/${id}/opengraph-image`
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
  const imagem = imagemRoteiro(roteiro, id)

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