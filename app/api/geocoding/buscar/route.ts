import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type OpenMeteoGeoResult = {
  id?: number
  name?: string
  latitude?: number
  longitude?: number
  elevation?: number
  feature_code?: string
  country_code?: string
  country?: string
  country_id?: number
  population?: number
  postcodes?: string[]
  admin1?: string
  admin2?: string
  admin3?: string
  admin4?: string
  timezone?: string
}

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function respostaErro(status: number, erro: string) {
  return NextResponse.json(
    {
      sucesso: false,
      erro,
    },
    { status }
  )
}

function montarEnderecoFormatado(resultado: OpenMeteoGeoResult) {
  return [
    resultado.name,
    resultado.admin2,
    resultado.admin1,
    resultado.country,
  ]
    .map(texto)
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index)
    .join(', ')
}

function calcularConfianca(resultado: OpenMeteoGeoResult, consulta: string) {
  const nome = texto(resultado.name).toLowerCase()
  const termo = texto(consulta).toLowerCase()

  if (!nome) return 'aproximada'
  if (nome === termo) return 'alta'
  if (termo.includes(nome) || nome.includes(termo)) return 'media'

  return 'aproximada'
}

export async function GET() {
  return NextResponse.json({
    sucesso: true,
    rota: '/api/geocoding/buscar',
    provider: 'open-meteo',
    message: 'Rota ativa. Use POST com endereco e/ou pontoReferencia.',
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    const endereco = texto(body?.endereco)
    const pontoReferencia = texto(body?.pontoReferencia)

    const consultaPrincipal = endereco || pontoReferencia

    if (consultaPrincipal.length < 3) {
      return respostaErro(400, 'Informe pelo menos 3 caracteres do local do roteiro.')
    }

    const params = new URLSearchParams({
      name: consultaPrincipal,
      count: '5',
      language: 'pt',
      format: 'json',
      countryCode: 'BR',
    })

    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      }
    )

    const data = await response.json().catch(() => null)

    if (!response.ok || data?.error) {
      return respostaErro(
        502,
        data?.reason || 'Erro ao consultar a geolocalização gratuita.'
      )
    }

    const resultados = Array.isArray(data?.results)
      ? (data.results as OpenMeteoGeoResult[])
      : []

    if (resultados.length === 0) {
      return respostaErro(
        404,
        'Não encontramos esse local. Tente informar cidade, estado ou uma referência maior. Ex.: Mogi das Cruzes/SP.'
      )
    }

    const resultado =
      resultados.find((item) => texto(item.country_code) === 'BR') ||
      resultados[0]

    const latitude = Number(resultado.latitude)
    const longitude = Number(resultado.longitude)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return respostaErro(
        422,
        'Encontramos o local, mas não foi possível obter latitude e longitude.'
      )
    }

    const enderecoFormatado = montarEnderecoFormatado(resultado)

    return NextResponse.json({
      sucesso: true,
      resultado: {
        endereco_formatado: enderecoFormatado || consultaPrincipal,
        latitude,
        longitude,
        cidade: texto(resultado.name),
        uf: texto(resultado.admin1),
        pais: texto(resultado.country) || 'Brasil',
        provider: 'open-meteo',
        place_id: resultado.id ? String(resultado.id) : '',
        confianca: calcularConfianca(resultado, consultaPrincipal),
        timezone: texto(resultado.timezone) || 'America/Sao_Paulo',
        consulta: consultaPrincipal,
        ponto_referencia: pontoReferencia,
        resultados_alternativos: resultados.slice(1, 5).map((item) => ({
          endereco_formatado: montarEnderecoFormatado(item),
          latitude: item.latitude,
          longitude: item.longitude,
          cidade: item.name,
          uf: item.admin1,
          pais: item.country,
          provider: 'open-meteo',
          place_id: item.id ? String(item.id) : '',
        })),
      },
    })
  } catch (error) {
    console.error('Erro em /api/geocoding/buscar:', error)

    return respostaErro(500, 'Erro interno ao buscar localização.')
  }
}
