import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AnyRecord = Record<string, any>

type OpenMeteoGeoResult = {
  id?: number
  name?: string
  latitude?: number
  longitude?: number
  country_code?: string
  country?: string
  admin1?: string
  admin2?: string
  timezone?: string
}

type Coordenadas = {
  latitude: number
  longitude: number
  origem: string
  termo?: string
  endereco_formatado?: string
  timezone?: string
}

const UF_POR_NOME: Record<string, string> = {
  acre: 'AC',
  alagoas: 'AL',
  amapá: 'AP',
  amapa: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceará: 'CE',
  ceara: 'CE',
  'distrito federal': 'DF',
  'espírito santo': 'ES',
  'espirito santo': 'ES',
  goiás: 'GO',
  goias: 'GO',
  maranhão: 'MA',
  maranhao: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  pará: 'PA',
  para: 'PA',
  paraíba: 'PB',
  paraiba: 'PB',
  paraná: 'PR',
  parana: 'PR',
  pernambuco: 'PE',
  piauí: 'PI',
  piaui: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondônia: 'RO',
  rondonia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'são paulo': 'SP',
  'sao paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
}

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function numero(valor: unknown) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

function coordenadasValidas(latitude: unknown, longitude: unknown) {
  const lat = numero(latitude)
  const lng = numero(longitude)

  if (lat === null || lng === null) return false
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false

  // 0,0 é o Golfo da Guiné. Para nossos roteiros no Brasil, isso é dado inválido.
  if (lat === 0 && lng === 0) return false

  return true
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Credenciais Supabase ausentes no servidor.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
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

function extrairUfSigla(valor: unknown) {
  const raw = texto(valor)
  if (!raw) return ''

  const upper = raw.toUpperCase()
  if (/^[A-Z]{2}$/.test(upper)) return upper

  const norm = normalizar(raw)
  return UF_POR_NOME[norm] || ''
}

function limparTermoBusca(valor: unknown) {
  return texto(valor)
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, ' ')
    .replace(/\s*-\s*/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim()
}

function adicionarTermo(lista: string[], termo: unknown) {
  const limpo = limparTermoBusca(termo)
  if (!limpo || limpo.length < 3) return

  const chave = normalizar(limpo)
  if (!lista.some((item) => normalizar(item) === chave)) {
    lista.push(limpo)
  }
}

function montarTermosLocalizacao(roteiro: AnyRecord) {
  const termos: string[] = []

  const cidade = texto(roteiro.cidade)
  const uf = extrairUfSigla(roteiro.uf || roteiro.estado)

  adicionarTermo(termos, roteiro.endereco_formatado)
  adicionarTermo(termos, roteiro.endereco_local)
  adicionarTermo(termos, roteiro.localizacao)
  adicionarTermo(termos, roteiro.local)
  adicionarTermo(termos, roteiro.ponto_referencia)
  adicionarTermo(termos, roteiro.ponto_encontro)
  adicionarTermo(termos, roteiro.embarque_local)

  if (cidade && uf) adicionarTermo(termos, `${cidade} ${uf}`)
  if (cidade) adicionarTermo(termos, cidade)

  // Quando o local vem como "Estação de Ribeirão Pires", tentamos também a cidade mais provável.
  const candidatos = [...termos]
  candidatos.forEach((termo) => {
    const semEstacao = termo.replace(/^estação\s+de\s+/i, '').replace(/^estacao\s+de\s+/i, '')
    adicionarTermo(termos, semEstacao)

    termo.split(',').forEach((parte) => adicionarTermo(termos, parte))

    const partesEspaco = termo.split(/\s+/)
    if (partesEspaco.length > 3) {
      adicionarTermo(termos, partesEspaco.slice(-2).join(' '))
      adicionarTermo(termos, partesEspaco.slice(-3).join(' '))
    }
  })

  // Evita buscar título genérico antes de endereço/cidade.
  adicionarTermo(termos, roteiro.destino)

  return termos.slice(0, 12)
}

async function geocodificarTermo(termo: string): Promise<Coordenadas | null> {
  const params = new URLSearchParams({
    name: termo,
    count: '8',
    language: 'pt',
    format: 'json',
    countryCode: 'BR',
  })

  const url = `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`

  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok || data?.error) return null

  const resultados: OpenMeteoGeoResult[] = Array.isArray(data?.results)
    ? data.results
    : []

  const resultado =
    resultados.find((item) => texto(item.country_code).toUpperCase() === 'BR') ||
    resultados[0]

  if (!resultado) return null

  const latitude = Number(resultado.latitude)
  const longitude = Number(resultado.longitude)

  if (!coordenadasValidas(latitude, longitude)) return null

  return {
    latitude,
    longitude,
    origem: 'open_meteo_geocoding',
    termo,
    endereco_formatado: montarEnderecoFormatado(resultado),
    timezone: texto(resultado.timezone) || 'America/Sao_Paulo',
  }
}

async function resolverCoordenadas(roteiro: AnyRecord) {
  const termosTentados: string[] = []

  if (coordenadasValidas(roteiro.latitude, roteiro.longitude)) {
    return {
      coordenadas: {
        latitude: Number(roteiro.latitude),
        longitude: Number(roteiro.longitude),
        origem: 'coordenadas_salvas',
        timezone: 'America/Sao_Paulo',
      } as Coordenadas,
      termosTentados,
    }
  }

  const termos = montarTermosLocalizacao(roteiro)

  for (const termo of termos) {
    termosTentados.push(termo)

    try {
      const resultado = await geocodificarTermo(termo)
      if (resultado) return { coordenadas: resultado, termosTentados }
    } catch (error) {
      console.warn('[api/clima/roteiro] Falha ao geocodificar termo:', termo, error)
    }
  }

  return { coordenadas: null, termosTentados }
}

function extrairDataRoteiro(roteiro: AnyRecord) {
  const raw = texto(
    roteiro.data_disponivel ||
      roteiro.proxima_data ||
      roteiro.data_trilha ||
      roteiro.embarque_data_hora ||
      roteiro.embarque_data ||
      roteiro.data_saida ||
      roteiro.data_inicio ||
      roteiro.data_evento
  )

  if (!raw) return null

  const data = raw.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null

  return data
}

function indiceDataNoForecast(datas: string[], dataRoteiro: string | null) {
  if (!Array.isArray(datas) || datas.length === 0) return 0
  if (!dataRoteiro) return 0

  const index = datas.findIndex((data) => data === dataRoteiro)
  return index >= 0 ? index : 0
}

function iconePorCodigo(codigo: unknown, chanceChuva: number) {
  const code = Number(codigo)

  if (chanceChuva >= 70) return '🌧️'
  if (chanceChuva >= 35) return '🌦️'

  if ([0, 1].includes(code)) return '🌤️'
  if ([2, 3].includes(code)) return '⛅'
  if ([45, 48].includes(code)) return '🌫️'
  if (code >= 51 && code <= 67) return '🌦️'
  if (code >= 80 && code <= 82) return '🌧️'
  if (code >= 95) return '⛈️'

  return '🌤️'
}

async function buscarClimaOpenMeteo(params: {
  latitude: number
  longitude: number
  dataRoteiro: string | null
  timezone?: string
}) {
  const { latitude, longitude, dataRoteiro } = params
  const timezone = params.timezone || 'America/Sao_Paulo'

  const chamadas = [
    new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      timezone,
      forecast_days: '16',
      current: 'temperature_2m,weather_code,precipitation',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum',
    }),
    new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      timezone,
      forecast_days: '16',
      current: 'temperature_2m,weather_code',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
    }),
    new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      timezone,
      current_weather: 'true',
      forecast_days: '1',
    }),
  ]

  let ultimoErro = ''

  for (const query of chamadas) {
    const url = `https://api.open-meteo.com/v1/forecast?${query.toString()}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.error) {
        ultimoErro = data?.reason || response.statusText || `HTTP ${response.status}`
        continue
      }

      const daily = data?.daily || {}
      const current = data?.current || {}
      const currentWeather = data?.current_weather || {}

      const datas = Array.isArray(daily.time) ? daily.time : []
      const index = indiceDataNoForecast(datas, dataRoteiro)

      const tempAtual = numero(current.temperature_2m)
      const tempCurrentWeather = numero(currentWeather.temperature)
      const tempMax = numero(Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max[index] : null)
      const tempMin = numero(Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min[index] : null)

      const chance = numero(
        Array.isArray(daily.precipitation_probability_max)
          ? daily.precipitation_probability_max[index]
          : null
      )

      const chuvaMm = numero(
        Array.isArray(daily.precipitation_sum)
          ? daily.precipitation_sum[index]
          : current.precipitation
      )

      const weatherCode =
        numero(Array.isArray(daily.weather_code) ? daily.weather_code[index] : null) ??
        numero(current.weather_code) ??
        numero(currentWeather.weathercode) ??
        1

      const temperatura =
        tempMax ??
        tempAtual ??
        tempCurrentWeather ??
        tempMin

      if (temperatura === null) {
        ultimoErro = 'Resposta sem temperatura.'
        continue
      }

      const chanceChuva =
        chance !== null
          ? Math.round(chance)
          : chuvaMm !== null && chuvaMm > 0
            ? 65
            : 0

      const temperaturaBadge = Math.round(temperatura)
      const icone = iconePorCodigo(weatherCode, chanceChuva)

      return {
        sucesso: true,
        temperatura: temperaturaBadge,
        temperatura_atual: tempAtual ?? tempCurrentWeather ?? temperaturaBadge,
        temperatura_max: tempMax ?? temperaturaBadge,
        temperatura_min: tempMin ?? null,
        chance_chuva: chanceChuva,
        chuva_mm: chuvaMm ?? 0,
        weather_code: weatherCode,
        icone,
        data_referencia: Array.isArray(daily.time) && daily.time[index] ? daily.time[index] : null,
        fonte_url: url,
      }
    } catch (error: any) {
      ultimoErro = error?.message || 'fetch failed'
    }
  }

  return {
    sucesso: false,
    erro: ultimoErro || 'Open-Meteo não retornou previsão agora.',
  }
}

async function obterParams(context: any) {
  const params = await Promise.resolve(context?.params || {})
  return params as { roteiroId?: string }
}

export async function GET(request: NextRequest, context: any) {
  const params = await obterParams(context)
  const roteiroId = texto(params.roteiroId)

  try {
    if (!roteiroId) {
      return NextResponse.json(
        {
          sucesso: false,
          disponivel: false,
          codigo: 'ROTEIRO_ID_AUSENTE',
          mensagem: 'ID do roteiro não informado.',
          badge: null,
          clima: null,
          previsao: null,
        },
        { status: 200 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: roteiro, error } = await supabase
      .from('roteiros')
      .select('*')
      .eq('id', roteiroId)
      .maybeSingle()

    if (error) throw error

    if (!roteiro) {
      return NextResponse.json(
        {
          sucesso: true,
          disponivel: false,
          codigo: 'ROTEIRO_NAO_ENCONTRADO',
          mensagem: 'Roteiro não encontrado.',
          roteiro_id: roteiroId,
          badge: null,
          clima: null,
          previsao: null,
        },
        { status: 200 }
      )
    }

    const { coordenadas, termosTentados } = await resolverCoordenadas(roteiro)

    if (!coordenadas) {
      return NextResponse.json(
        {
          sucesso: true,
          disponivel: false,
          codigo: 'COORDENADAS_AUSENTES',
          mensagem: 'Roteiro sem latitude/longitude válidas e sem local reconhecível para buscar clima.',
          roteiro_id: roteiroId,
          termos_tentados: termosTentados,
          badge: null,
          clima: null,
          previsao: null,
        },
        { status: 200 }
      )
    }

    const dataRoteiro = extrairDataRoteiro(roteiro)
    const clima = await buscarClimaOpenMeteo({
      latitude: coordenadas.latitude,
      longitude: coordenadas.longitude,
      dataRoteiro,
      timezone: coordenadas.timezone,
    })

    if (!clima.sucesso) {
      return NextResponse.json(
        {
          sucesso: true,
          disponivel: false,
          codigo: 'OPEN_METEO_WEATHER_ERROR',
          mensagem: clima.erro || 'Open-Meteo não retornou previsão agora.',
          roteiro_id: roteiroId,
          latitude: coordenadas.latitude,
          longitude: coordenadas.longitude,
          origem_localizacao: coordenadas.origem,
          termos_tentados: termosTentados,
          badge: null,
          clima: null,
          previsao: null,
        },
        { status: 200 }
      )
    }

    const badge = {
      icone: clima.icone,
      temperatura: clima.temperatura,
      chance_chuva: clima.chance_chuva,
      texto: `${clima.icone} ${clima.temperatura}° · ${clima.chance_chuva}%`,
    }

    const previsao = {
      temperatura: clima.temperatura,
      temperatura_atual: clima.temperatura_atual,
      temperatura_max: clima.temperatura_max,
      temperatura_min: clima.temperatura_min,
      chance_chuva: clima.chance_chuva,
      chuva_mm: clima.chuva_mm,
      weather_code: clima.weather_code,
      icone: clima.icone,
      data_referencia: clima.data_referencia,
      data_roteiro: dataRoteiro,
      fonte: 'open-meteo',
    }

    return NextResponse.json(
      {
        sucesso: true,
        disponivel: true,
        roteiro_id: roteiroId,
        latitude: coordenadas.latitude,
        longitude: coordenadas.longitude,
        origem_localizacao: coordenadas.origem,
        endereco_formatado: coordenadas.endereco_formatado || null,
        termo_localizacao: coordenadas.termo || null,
        termos_tentados: termosTentados,
        temperatura: clima.temperatura,
        chance_chuva: clima.chance_chuva,
        icone: clima.icone,
        badge,
        clima: previsao,
        previsao,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[api/clima/roteiro] Erro fatal:', error)

    return NextResponse.json(
      {
        sucesso: true,
        disponivel: false,
        codigo: 'ERRO_INTERNO_CLIMA',
        mensagem: error?.message || 'Erro interno ao buscar clima.',
        roteiro_id: roteiroId || null,
        badge: null,
        clima: null,
        previsao: null,
      },
      { status: 200 }
    )
  }
}
