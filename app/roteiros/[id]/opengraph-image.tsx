import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'PrussikTrails'
export const size = {
  width: 1200,
  height: 630
}
export const contentType = 'image/png'

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://prussiktrails.com.br'

type AnyRecord = Record<string, any>

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
  const titulo =
    texto(roteiro?.titulo) ||
    texto(roteiro?.nome) ||
    'Roteiro PrussikTrails'

  return titulo.length > 68 ? `${titulo.slice(0, 65).trim()}...` : titulo
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

function imagemRoteiro(roteiro: AnyRecord | null) {
  return (
    texto(roteiro?.foto_capa) ||
    texto(roteiro?.foto_url) ||
    texto(roteiro?.imagem_url) ||
    texto(roteiro?.image_url) ||
    texto(roteiro?.capa_url)
  )
}

function dificuldadeRoteiro(roteiro: AnyRecord | null) {
  return (
    texto(roteiro?.dificuldade) ||
    texto(roteiro?.nivel) ||
    texto(roteiro?.intensidade) ||
    'Nível informado no app'
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

function descricaoCurta(roteiro: AnyRecord | null) {
  const descricao =
    limparTexto(roteiro?.descricao) ||
    limparTexto(roteiro?.roteiro_detalhado) ||
    limparTexto(roteiro?.detalhes) ||
    'Veja detalhes, informações e reserva no PrussikTrails.'

  return descricao.length > 145 ? `${descricao.slice(0, 142).trim()}...` : descricao
}

export default async function Image({ params }: { params: any }) {
  const resolvedParams = await resolverParams(params)
  const id = texto(resolvedParams?.id)

  const roteiro = await buscarRoteiro(id)

  const titulo = tituloRoteiro(roteiro)
  const local = localRoteiro(roteiro)
  const imagem = imagemRoteiro(roteiro)
  const preco = precoRoteiro(roteiro)
  const dificuldade = dificuldadeRoteiro(roteiro)
  const descricao = descricaoCurta(roteiro)

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
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 15% 10%, rgba(190,242,100,0.22), transparent 30%), radial-gradient(circle at 90% 20%, rgba(251,146,60,0.18), transparent 34%), linear-gradient(135deg, #203c2e 0%, #5f7547 52%, #d7c6a1 100%)'
            }}
          />
        )}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, rgba(23,32,24,0.94) 0%, rgba(23,32,24,0.82) 42%, rgba(23,32,24,0.40) 100%)'
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 34,
            border: '1px solid rgba(255,253,247,0.20)',
            borderRadius: 34
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 72,
            top: 54,
            right: 72,
            bottom: 54,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 24
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
                src={`${APP_URL}/logo-prussik-display.png`}
                alt=""
                style={{
                  width: 112,
                  height: 74,
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
                    fontWeight: 900,
                    letterSpacing: '-0.045em'
                  }}
                >
                  PrussikTrails
                </div>

                <div
                  style={{
                    fontSize: 14,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: '#d9f99d',
                    fontWeight: 800
                  }}
                >
                  Roteiro outdoor
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                borderRadius: 999,
                padding: '12px 18px',
                background: 'rgba(190,242,100,0.17)',
                border: '1px solid rgba(190,242,100,0.26)',
                color: '#d9f99d',
                fontSize: 22,
                fontWeight: 900
              }}
            >
              {preco}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              maxWidth: 770
            }}
          >
            <div
              style={{
                display: 'flex',
                width: 'fit-content',
                borderRadius: 999,
                padding: '10px 15px',
                background: 'rgba(255,253,247,0.16)',
                border: '1px solid rgba(255,253,247,0.20)',
                color: '#fffdf7',
                fontSize: 18,
                fontWeight: 850,
                marginBottom: 18
              }}
            >
              {dificuldade}
            </div>

            <div
              style={{
                fontSize: 68,
                lineHeight: 0.93,
                fontWeight: 950,
                letterSpacing: '-0.078em'
              }}
            >
              {titulo}
            </div>

            <div
              style={{
                marginTop: 22,
                fontSize: 27,
                color: '#d9f99d',
                fontWeight: 850
              }}
            >
              {local}
            </div>

            <div
              style={{
                marginTop: 16,
                maxWidth: 720,
                fontSize: 20,
                lineHeight: 1.35,
                color: 'rgba(255,253,247,0.80)',
                fontWeight: 650
              }}
            >
              {descricao}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 24,
              fontSize: 22,
              color: 'rgba(255,253,247,0.84)',
              fontWeight: 800
            }}
          >
            <div>Veja detalhes e reserve pelo app</div>
            <div>prussiktrails.com.br</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size
    }
  )
}
