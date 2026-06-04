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

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function numero(valor: unknown) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function dataISO(valor: unknown) {
  const raw = texto(valor)
  if (!raw) return ''

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)

  const data = new Date(raw)
  if (Number.isNaN(data.getTime())) return ''

  return data.toISOString().slice(0, 10)
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function dataDoRoteiro(roteiro: AnyRecord) {
  return (
    dataISO(roteiro.data_disponivel) ||
    dataISO(roteiro.proxima_data) ||
    dataISO(roteiro.embarque_data_hora) ||
    dataISO(roteiro.embarque_data) ||
    dataISO(roteiro.data_trilha) ||
    dataISO(roteiro.data_saida) ||
    dataISO(roteiro.data_inicio) ||
    dataISO(roteiro.data_evento) ||
    hojeISO()
  )
}

function iconePorCodigo(codigo: unknown) {
  const code = Number(codigo)

  if ([0, 1].includes(code)) return '🌤️'
  if ([2, 3].includes(code)) return '⛅'
  if ([45, 48].includes(code)) return '🌫️'
  if ([51, 53, 55, 56, 57].includes(code)) return '🌦️'
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️'
  if ([95, 96, 99].includes(code)) return '⛈️'

  return '🌤️'
}

function montarTermosGeocoding(roteiro: AnyRecord) {
  const termos = [
    texto(roteiro.endereco_formatado),
    texto(roteiro.endereco_local),
    texto(roteiro.localizacao),
    texto(roteiro.local),
    [roteiro.cidade, roteiro.uf].map(texto).filter(Boolean).join('/'),
    [roteiro.cidade, roteiro.uf].map(texto).filter(Boolean).join(', '),
    texto(roteiro.cidade),
    texto(roteiro.ponto_referencia),
    texto(roteiro.ponto_encontro),
    texto(roteiro.embarque_local),
  ]
    .filter(Boolean)
    .map((item) => item.replace(/\s+/g, ' ').trim())

  const extras: string[] = []

  termos.forEach((termo) => {
    extras.push(termo)
    termo.split(',').forEach((parte) => {
      const limpa = parte.trim()
      if (limpa.length >= 3) extras.push(limpa)
    })
  })

  return Array.from(new Set(extras)).filter((item) => item.length >= 3)
}

async function buscarCoordenadasPorTexto(termos: string[]) {
  for (const termo of termos) {
    try {
      const params = new URLSearchParams({
        name: termo,
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
          headers: { Accept: 'application/json' },
        }
      )

      const data = await response.json().catch(() => null)
      const resultados = Array.isArray(data?.results) ? (data.results as OpenMeteoGeoResult[]) : []

      const resultado =
        resultados.find((item) => texto(item.country_code) === 'BR') ||
        resultados[0]

      const latitude = numero(resultado?.latitude)
      const longitude = numero(resultado?.longitude)

      if (latitude !== null && longitude !== null) {
        return {
          latitude,
          longitude,
          termo,
          cidade: texto(resultado?.name),
          uf: texto(resultado?.admin1),
          timezone: texto(resultado?.timezone) || 'America/Sao_Paulo',
        }
      }
    } catch (error) {
      console.warn('[api/clima/roteiro] Falha no geocoding fallback:', {
        termo,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return null
}

function respostaIndisponivel(params: {
  codigo: string
  mensagem: string
  status?: number
  roteiroId?: string
  termosTentados?: string[]
}) {
  return NextResponse.json(
    {
      sucesso: true,
      disponivel: false,
      codigo: params.codigo,
      mensagem: params.mensagem,
      roteiro_id: params.roteiroId || null,
      termos_tentados: params.termosTentados || [],
      badge: null,
      clima: null,
      previsao: null,
    },
    { status: params.status || 200 }
  )
}

function extrairValorPorData(listaDatas: string[], listaValores: any[], dataAlvo: string) {
  const index = listaDatas.findIndex((item) => item === dataAlvo)
  if (index < 0) return null
  return numero(listaValores?.[index])
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ roteiroId: string }> | { roteiroId: string } }
) {
  let roteiroId = ''

  try {
    const paramsResolvidos = await Promise.resolve(context.params)
    roteiroId = texto(paramsResolvidos?.roteiroId)

    if (!roteiroId) {
      return respostaIndisponivel({
        codigo: 'ROTEIRO_ID_AUSENTE',
        mensagem: 'ID do roteiro não informado.',
        status: 400,
      })
    }

    const supabase = getSupabaseAdmin()

    const { data: roteiro, error } = await supabase
      .from('roteiros')
      .select('*')
      .eq('id', roteiroId)
      .maybeSingle()

    if (error) {
      console.error('[api/clima/roteiro] Erro Supabase:', error)
      return respostaIndisponivel({
        codigo: 'ROTEIRO_ERRO_SUPABASE',
        mensagem: error.message || 'Erro ao buscar roteiro.',
        roteiroId,
      })
    }

    if (!roteiro) {
      return respostaIndisponivel({
        codigo: 'ROTEIRO_NAO_ENCONTRADO',
        mensagem: 'Roteiro não encontrado.',
        roteiroId,
      })
    }

    let latitude = numero(roteiro.latitude ?? roteiro.lat)
    let longitude = numero(roteiro.longitude ?? roteiro.lng ?? roteiro.lon)
    let origemCoordenadas = 'roteiro'
    let termoUsado = ''
    let termosTentados: string[] = []

    if (latitude === null || longitude === null) {
      termosTentados = montarTermosGeocoding(roteiro)
      const geo = await buscarCoordenadasPorTexto(termosTentados)

      if (geo) {
        latitude = geo.latitude
        longitude = geo.longitude
        origemCoordenadas = 'open-meteo-geocoding-fallback'
        termoUsado = geo.termo
      }
    }

    if (latitude === null || longitude === null) {
      return respostaIndisponivel({
        codigo: 'COORDENADAS_AUSENTES',
        mensagem: 'Roteiro sem latitude/longitude e sem local reconhecível para clima.',
        roteiroId,
        termosTentados,
      })
    }

    const dataReferencia = dataDoRoteiro(roteiro)

    const weatherParams = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: 'temperature_2m,weather_code,precipitation',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum',
      forecast_days: '16',
      timezone: 'auto',
    })

    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?${weatherParams.toString()}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      }
    )

    const weather = await weatherResponse.json().catch(() => null)

    if (!weatherResponse.ok || weather?.error) {
      return respostaIndisponivel({
        codigo: 'OPEN_METEO_WEATHER_ERROR',
        mensagem: weather?.reason || 'Open-Meteo não retornou previsão agora.',
        roteiroId,
        termosTentados,
      })
    }

    const datas: string[] = Array.isArray(weather?.daily?.time) ? weather.daily.time : []

    const tempMaxPorData = extrairValorPorData(datas, weather?.daily?.temperature_2m_max || [], dataReferencia)
    const tempMinPorData = extrairValorPorData(datas, weather?.daily?.temperature_2m_min || [], dataReferencia)
    const chuvaPorData = extrairValorPorData(datas, weather?.daily?.precipitation_probability_max || [], dataReferencia)
    const chuvaMmPorData = extrairValorPorData(datas, weather?.daily?.precipitation_sum || [], dataReferencia)
    const codigoPorData = extrairValorPorData(datas, weather?.daily?.weather_code || [], dataReferencia)

    const tempAtual = numero(weather?.current?.temperature_2m)
    const codigoAtual = numero(weather?.current?.weather_code)

    const temperaturaBase =
      tempMaxPorData ??
      tempAtual ??
      tempMinPorData ??
      null

    const temperatura = temperaturaBase !== null ? Math.round(temperaturaBase) : null
    const chanceChuva = chuvaPorData !== null ? Math.round(chuvaPorData) : 0
    const icone = iconePorCodigo(codigoPorData ?? codigoAtual)

    if (temperatura === null) {
      return respostaIndisponivel({
        codigo: 'TEMPERATURA_AUSENTE',
        mensagem: 'Previsão encontrada, mas sem temperatura disponível.',
        roteiroId,
        termosTentados,
      })
    }

    const badgeTexto = `${icone} ${temperatura}° · ${chanceChuva}%`

    const payload = {
      sucesso: true,
      disponivel: true,
      roteiro_id: roteiroId,
      fonte: 'open-meteo',
      data_referencia: dataReferencia,
      latitude,
      longitude,
      origem_coordenadas: origemCoordenadas,
      termo_usado: termoUsado || null,
      temperatura,
      temperatura_atual: tempAtual !== null ? Math.round(tempAtual) : temperatura,
      temperatura_max: tempMaxPorData !== null ? Math.round(tempMaxPorData) : temperatura,
      temperatura_min: tempMinPorData !== null ? Math.round(tempMinPorData) : null,
      chance_chuva: chanceChuva,
      chuva_probabilidade: chanceChuva,
      chuva_mm: chuvaMmPorData ?? 0,
      codigo_clima: codigoPorData ?? codigoAtual ?? null,
      icone,
      badge: {
        icone,
        temperatura,
        chance_chuva: chanceChuva,
        texto: badgeTexto,
      },
      clima: {
        icone,
        temperatura,
        temperatura_atual: tempAtual !== null ? Math.round(tempAtual) : temperatura,
        temperatura_max: tempMaxPorData !== null ? Math.round(tempMaxPorData) : temperatura,
        temperatura_min: tempMinPorData !== null ? Math.round(tempMinPorData) : null,
        chance_chuva: chanceChuva,
        chuva_probabilidade: chanceChuva,
        chuva_mm: chuvaMmPorData ?? 0,
        texto_badge: badgeTexto,
      },
      previsao: {
        icone,
        temperatura,
        temperatura_max: tempMaxPorData !== null ? Math.round(tempMaxPorData) : temperatura,
        temperatura_min: tempMinPorData !== null ? Math.round(tempMinPorData) : null,
        chance_chuva: chanceChuva,
        chuva_mm: chuvaMmPorData ?? 0,
        texto_badge: badgeTexto,
      },
      termos_tentados: termosTentados,
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('[api/clima/roteiro] Erro:', error)

    return respostaIndisponivel({
      codigo: 'ERRO_INTERNO_CLIMA',
      mensagem: error instanceof Error ? error.message : 'Erro interno na rota de clima.',
      roteiroId,
    })
  }
}
