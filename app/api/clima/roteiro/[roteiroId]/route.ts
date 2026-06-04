import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

type OpenMeteoDaily = {
  time?: string[]
  weather_code?: number[]
  temperature_2m_max?: number[]
  temperature_2m_min?: number[]
  precipitation_probability_max?: number[]
  precipitation_sum?: number[]
  wind_speed_10m_max?: number[]
  uv_index_max?: number[]
}

type OpenMeteoForecast = {
  latitude?: number
  longitude?: number
  timezone?: string
  daily?: OpenMeteoDaily
}

type OpenMeteoGeoResult = {
  id?: number
  name?: string
  latitude?: number
  longitude?: number
  admin1?: string
  admin2?: string
  country?: string
  country_code?: string
  timezone?: string
}

function getSupabaseServer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const key = serviceRoleKey || anonKey

  if (!supabaseUrl || !key) {
    throw new Error('Credenciais Supabase ausentes no servidor.')
  }

  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function numero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null

  const normalizado = String(valor)
    .trim()
    .replace(',', '.')

  const n = Number(normalizado)
  return Number.isFinite(n) ? n : null
}

function dataIsoHoje() {
  const agora = new Date()
  const yyyy = agora.getFullYear()
  const mm = String(agora.getMonth() + 1).padStart(2, '0')
  const dd = String(agora.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function extrairDataIso(valor: unknown) {
  const raw = texto(valor)
  if (!raw) return ''

  const match = raw.match(/\d{4}-\d{2}-\d{2}/)
  if (match?.[0]) return match[0]

  const data = new Date(raw)
  if (Number.isNaN(data.getTime())) return ''

  const yyyy = data.getFullYear()
  const mm = String(data.getMonth() + 1).padStart(2, '0')
  const dd = String(data.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function dataDoRoteiro(roteiro: AnyRecord, dataQuery: string) {
  return (
    extrairDataIso(dataQuery) ||
    extrairDataIso(roteiro.data_disponivel) ||
    extrairDataIso(roteiro.proxima_data) ||
    extrairDataIso(roteiro.data_trilha) ||
    extrairDataIso(roteiro.embarque_data_hora) ||
    extrairDataIso(roteiro.embarque_data) ||
    extrairDataIso(roteiro.data_saida) ||
    extrairDataIso(roteiro.data_inicio) ||
    extrairDataIso(roteiro.data_evento) ||
    extrairDataIso(roteiro.created_at) ||
    dataIsoHoje()
  )
}

function dataDentroDaJanelaOpenMeteo(dataIso: string) {
  const hoje = new Date(`${dataIsoHoje()}T00:00:00`)
  const alvo = new Date(`${dataIso}T00:00:00`)

  if (Number.isNaN(alvo.getTime())) {
    return {
      dataConsulta: dataIsoHoje(),
      dentro: false,
      aviso: 'Data inválida. Exibindo previsão atual.',
    }
  }

  const diffMs = alvo.getTime() - hoje.getTime()
  const diffDias = Math.round(diffMs / 86_400_000)

  if (diffDias < 0) {
    return {
      dataConsulta: dataIsoHoje(),
      dentro: false,
      aviso: 'Data do roteiro já passou. Exibindo previsão atual.',
    }
  }

  if (diffDias > 15) {
    return {
      dataConsulta: dataIsoHoje(),
      dentro: false,
      aviso: 'A previsão por data ainda não está disponível. Exibindo previsão atual.',
    }
  }

  return {
    dataConsulta: dataIso,
    dentro: true,
    aviso: '',
  }
}

function primeiroNumero(...valores: unknown[]) {
  for (const valor of valores) {
    const n = numero(valor)
    if (n !== null) return n
  }

  return null
}

function coordenadasDoRoteiro(roteiro: AnyRecord) {
  const latitude = primeiroNumero(
    roteiro.latitude,
    roteiro.lat,
    roteiro.coordenada_latitude,
    roteiro.geo_latitude
  )

  const longitude = primeiroNumero(
    roteiro.longitude,
    roteiro.lng,
    roteiro.lon,
    roteiro.coordenada_longitude,
    roteiro.geo_longitude
  )

  if (latitude === null || longitude === null) return null

  return { latitude, longitude }
}

function termosGeocoding(roteiro: AnyRecord) {
  const candidatos = [
    texto(roteiro.endereco_formatado),
    texto(roteiro.endereco_local),
    texto(roteiro.localizacao),
    texto(roteiro.local),
    texto(roteiro.cidade && roteiro.uf ? `${roteiro.cidade}, ${roteiro.uf}` : ''),
    texto(roteiro.cidade),
    texto(roteiro.ponto_encontro),
    texto(roteiro.embarque_local),
  ].filter(Boolean)

  return Array.from(new Set(candidatos)).filter((item) => item.length >= 3)
}

async function geocodificarPorOpenMeteo(roteiro: AnyRecord) {
  const termos = termosGeocoding(roteiro)

  for (const termo of termos) {
    const params = new URLSearchParams({
      name: termo,
      count: '3',
      language: 'pt',
      format: 'json',
      countryCode: 'BR',
    })

    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })

      const data = await response.json().catch(() => null)
      const resultados = Array.isArray(data?.results) ? (data.results as OpenMeteoGeoResult[]) : []
      const resultado = resultados.find((item) => texto(item.country_code) === 'BR') || resultados[0]

      const latitude = numero(resultado?.latitude)
      const longitude = numero(resultado?.longitude)

      if (response.ok && latitude !== null && longitude !== null) {
        return {
          latitude,
          longitude,
          origem: 'open-meteo-geocoding',
          endereco: [resultado?.name, resultado?.admin2, resultado?.admin1, resultado?.country]
            .map(texto)
            .filter(Boolean)
            .filter((item, index, array) => array.indexOf(item) === index)
            .join(', '),
        }
      }
    } catch (error) {
      console.warn('[clima/roteiro] Falha ao geocodificar termo:', termo, error)
    }
  }

  return null
}

function resumoPorCodigoClima(codigo: number | null) {
  if (codigo === null) return { icone: '🌤️', resumo: 'Previsão disponível' }

  if ([0].includes(codigo)) return { icone: '☀️', resumo: 'Céu limpo' }
  if ([1, 2].includes(codigo)) return { icone: '🌤️', resumo: 'Parcialmente nublado' }
  if ([3].includes(codigo)) return { icone: '☁️', resumo: 'Nublado' }
  if ([45, 48].includes(codigo)) return { icone: '🌫️', resumo: 'Neblina' }
  if ([51, 53, 55, 56, 57].includes(codigo)) return { icone: '🌦️', resumo: 'Garoa' }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(codigo)) return { icone: '🌧️', resumo: 'Chuva' }
  if ([71, 73, 75, 77, 85, 86].includes(codigo)) return { icone: '❄️', resumo: 'Neve' }
  if ([95, 96, 99].includes(codigo)) return { icone: '⛈️', resumo: 'Tempestade' }

  return { icone: '🌤️', resumo: 'Previsão disponível' }
}

function arredondar(valor: unknown) {
  const n = numero(valor)
  if (n === null) return null
  return Math.round(n)
}

async function buscarPrevisao(params: {
  latitude: number
  longitude: number
}) {
  const query = new URLSearchParams({
    latitude: String(params.latitude),
    longitude: String(params.longitude),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'precipitation_sum',
      'wind_speed_10m_max',
      'uv_index_max',
    ].join(','),
    timezone: 'America/Sao_Paulo',
    forecast_days: '16',
  })

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query.toString()}`, {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })

  const data = (await response.json().catch(() => null)) as OpenMeteoForecast | null

  if (!response.ok || !data?.daily?.time?.length) {
    throw new Error('Não foi possível consultar a previsão do tempo agora.')
  }

  return data
}

function montarClima(data: OpenMeteoForecast, dataConsulta: string) {
  const daily = data.daily || {}
  const datas = daily.time || []
  let index = datas.findIndex((item) => item === dataConsulta)

  if (index < 0) index = 0

  const codigo = numero(daily.weather_code?.[index])
  const visual = resumoPorCodigoClima(codigo)

  const temperaturaMax = arredondar(daily.temperature_2m_max?.[index])
  const temperaturaMin = arredondar(daily.temperature_2m_min?.[index])
  const temperatura = temperaturaMax ?? temperaturaMin ?? null
  const chanceChuva = arredondar(daily.precipitation_probability_max?.[index]) ?? 0
  const chuvaMm = numero(daily.precipitation_sum?.[index]) ?? 0
  const ventoKmh = arredondar(daily.wind_speed_10m_max?.[index]) ?? null
  const indiceUv = numero(daily.uv_index_max?.[index]) ?? null

  const badgeTemperatura = temperatura !== null ? `${temperatura}°` : '--°'
  const badgeChuva = `${chanceChuva}%`

  return {
    icone: visual.icone,
    resumo: visual.resumo,
    temperatura,
    temperatura_atual: temperatura,
    temperatura_max: temperaturaMax,
    temperatura_min: temperaturaMin,
    chance_chuva: chanceChuva,
    chuva_percentual: chanceChuva,
    chuva_mm: chuvaMm,
    vento_kmh: ventoKmh,
    indice_uv: indiceUv,
    weather_code: codigo,
    badge: {
      icone: visual.icone,
      temperatura,
      chance_chuva: chanceChuva,
      texto: `${visual.icone} ${badgeTemperatura} · ${badgeChuva}`,
    },
  }
}

function respostaOk(payload: AnyRecord) {
  return NextResponse.json(payload, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}

export async function GET(
  request: NextRequest,
  context: { params: { roteiroId: string } | Promise<{ roteiroId: string }> }
) {
  try {
    const params = await Promise.resolve(context.params)
    const roteiroId = texto(params?.roteiroId)
    const dataQuery = texto(request.nextUrl.searchParams.get('data'))

    if (!roteiroId) {
      return respostaOk({
        sucesso: false,
        disponivel: false,
        motivo: 'ROTEIRO_ID_AUSENTE',
        mensagem: 'ID do roteiro não informado.',
      })
    }

    const supabase = getSupabaseServer()

    const { data: roteiro, error } = await supabase
      .from('roteiros')
      .select('*')
      .eq('id', roteiroId)
      .maybeSingle()

    if (error) throw error

    if (!roteiro) {
      return respostaOk({
        sucesso: false,
        disponivel: false,
        motivo: 'ROTEIRO_NAO_ENCONTRADO',
        mensagem: 'Roteiro não encontrado.',
      })
    }

    const dataOriginal = dataDoRoteiro(roteiro, dataQuery)
    const janela = dataDentroDaJanelaOpenMeteo(dataOriginal)

    let coordenadas = coordenadasDoRoteiro(roteiro)
    let origemCoordenadas = 'roteiro'
    let enderecoGeocodificado = ''

    if (!coordenadas) {
      const geocoding = await geocodificarPorOpenMeteo(roteiro)

      if (geocoding) {
        coordenadas = {
          latitude: geocoding.latitude,
          longitude: geocoding.longitude,
        }
        origemCoordenadas = geocoding.origem
        enderecoGeocodificado = geocoding.endereco
      }
    }

    if (!coordenadas) {
      return respostaOk({
        sucesso: true,
        disponivel: false,
        motivo: 'COORDENADAS_AUSENTES',
        mensagem: 'Informe latitude/longitude ou um local/cidade reconhecível no roteiro para exibir clima.',
        roteiro_id: roteiroId,
      })
    }

    const previsao = await buscarPrevisao(coordenadas)
    const clima = montarClima(previsao, janela.dataConsulta)

    return respostaOk({
      sucesso: true,
      disponivel: true,
      provider: 'open-meteo',
      roteiro_id: roteiroId,
      data_referencia: dataOriginal,
      data_consulta: janela.dataConsulta,
      usando_data_atual: dataOriginal !== janela.dataConsulta,
      aviso: janela.aviso,
      latitude: coordenadas.latitude,
      longitude: coordenadas.longitude,
      origem_coordenadas: origemCoordenadas,
      endereco_geocodificado: enderecoGeocodificado,
      clima,
      previsao: clima,
      badge: clima.badge,
      icone: clima.icone,
      resumo: clima.resumo,
      temperatura: clima.temperatura,
      temperatura_atual: clima.temperatura_atual,
      temperatura_max: clima.temperatura_max,
      temperatura_min: clima.temperatura_min,
      chance_chuva: clima.chance_chuva,
      chuva_percentual: clima.chuva_percentual,
      chuva_mm: clima.chuva_mm,
      vento_kmh: clima.vento_kmh,
      indice_uv: clima.indice_uv,
    })
  } catch (error: any) {
    console.error('[api/clima/roteiro] Erro:', {
      message: error?.message,
      stack: error?.stack,
    })

    return NextResponse.json(
      {
        sucesso: false,
        disponivel: false,
        motivo: 'ERRO_INTERNO',
        mensagem: error?.message || 'Não foi possível carregar o clima agora.',
      },
      { status: 500 }
    )
  }
}
