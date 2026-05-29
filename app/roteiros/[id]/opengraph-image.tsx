import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'PrussikTrails'
export const size = {
  width: 1200,
  height: 630
}
export const contentType = 'image/png'

type AnyRecord = Record<string, any>

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

function localRoteiro(roteiro: AnyRecord | null) {
  return (
    texto(roteiro?.local) ||
    texto(roteiro?.localizacao) ||
    texto(roteiro?.cidade) ||
    texto(roteiro?.destino) ||
    texto(roteiro?.embarque_local) ||
    texto(roteiro?.local_encontro) ||
    'Experiência outdoor'
  )
}

function imagemRoteiro(roteiro: AnyRecord | null) {
  return (
    texto(roteiro?.foto_capa) ||
    texto(roteiro?.foto_url) ||
    texto(roteiro?.imagem_url) ||
    texto(roteiro?.image_url) ||
    texto(roteiro?.capa_url)
  )
}

function precoRoteiro(roteiro: AnyRecord | null) {
  const valor = Number(
    roteiro?.preco ||
      roteiro?.valor ||
      roteiro?.preco_por_pessoa ||
      roteiro?.preco_total ||
      0
  )

  if (!Number.isFinite(valor) || valor <= 0) return 'Reserve pelo app'

  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

export default async function Image({ params }: { params: any }) {
  const resolvedParams = await resolverParams(params)
  const id = texto(resolvedParams?.id)

  const roteiro = await buscarRoteiro(id)

  const titulo = tituloRoteiro(roteiro)
  const local = localRoteiro(roteiro)
  const imagem = imagemRoteiro(roteiro)
  const preco = precoRoteiro(roteiro)

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: '#203c2e',
          color: '#fffdf7',
          fontFamily: 'Arial, sans-serif'
        }}
      >
        {imagem ? (
          <img
            src={imagem}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '1200px',
              height: '630px',
              objectFit: 'cover'
            }}
          />
        ) : null}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, rgba(23,32,24,0.92) 0%, rgba(23,32,24,0.74) 46%, rgba(23,32,24,0.28) 100%)'
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 64,
            top: 56,
            right: 64,
            bottom: 56,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18
            }}
          >
            <img
              src="https://prussiktrails.com.br/logo-prussik-display.png"
              alt=""
              style={{
                width: 116,
                height: 76,
                objectFit: 'contain'
              }}
            />

            <div
              style={{
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 800,
                  letterSpacing: '-0.04em'
                }}
              >
                PrussikTrails
              </div>

              <div
                style={{
                  fontSize: 15,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: '#d9f99d',
                  fontWeight: 700
                }}
              >
                Roteiro outdoor
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              maxWidth: 760
            }}
          >
            <div
              style={{
                display: 'flex',
                width: 'fit-content',
                borderRadius: 999,
                padding: '10px 16px',
                background: 'rgba(190,242,100,0.16)',
                color: '#d9f99d',
                fontSize: 20,
                fontWeight: 800,
                marginBottom: 20
              }}
            >
              {preco}
            </div>

            <div
              style={{
                fontSize: 70,
                lineHeight: 0.92,
                fontWeight: 900,
                letterSpacing: '-0.075em'
              }}
            >
              {titulo}
            </div>

            <div
              style={{
                marginTop: 24,
                fontSize: 28,
                color: 'rgba(255,253,247,0.86)',
                fontWeight: 700
              }}
            >
              {local}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: 22,
              color: 'rgba(255,253,247,0.80)',
              fontWeight: 700
            }}
          >
            Veja detalhes e reserve em prussiktrails.com.br
          </div>
        </div>
      </div>
    ),
    {
      ...size
    }
  )
}