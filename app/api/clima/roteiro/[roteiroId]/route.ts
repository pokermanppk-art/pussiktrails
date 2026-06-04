import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AnyRecord = Record<string, any>

type WeatherDaily = {
  time?: string[]
  temperature_2m_min?: number[]
  temperature_2m_max?: number[]
  precipitation_probability_max?: number[]
  precipitation_sum?: number[]
  wind_speed_10m_max?: number[]
  uv_index_max?: number[]
  weather_code?: number[]
}

type WeatherCurrent = {
  time?: string
  temperature_2m?: number
  relative_humidity_2m?: number
  precipitation?: number
  wind_speed_10m?: number
  weather_code?: number
}

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function numero(valor: unknown) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

function resposta(status: number, body: AnyRecord) {
  return NextResponse.json(body, { status })
}

function dataISO(valor: unknown) {
  const raw = texto(valor)
  if (!raw) return ''

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10)
  }

  const data = new Date(raw)
  if (Number.isNaN(data.getTime())) return ''

  return data.toISOString().slice(0, 10)
}

function dataDoRoteiro(roteiro: AnyRecord) {
  return (
    dataISO(roteiro.data_disponivel) ||
    dataISO(roteiro.proxima_data) ||
    dataISO(roteiro.data_roteiro) ||
    dataISO(roteiro.data_trilha) ||
    dataISO(roteiro.data_saida) ||
    dataISO(roteiro.data_evento) ||
    dataISO(roteiro.data_inicio) ||
    dataISO(roteiro.embarque_data_hora) ||
    dataISO(roteiro.embarque_data)
  )
}

function hojeISO() {
  const agora = new Date()
  const brasil = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const year = brasil.getFullYear()
  const month = String(brasil.getMonth() + 1).padStart(2, '0')
  const day = String(brasil.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function diffDias(dataAlvo: string) {
  const hoje = new Date(`${hojeISO()}T12:00:00-03:00`)
  const alvo = new Date(`${dataAlvo}T12:00:00-03:00`)
  if (Number.isNaN(alvo.getTime())) return null
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000)
}

function descricaoCodigoClima(code: number | null) {
  if (code === null) return { resumo: 'Clima a confirmar', icone: '🌦️' }

  if (code === 0) return { resumo: 'Céu limpo', icone: '☀️' }
  if ([1, 2].includes(code)) return { resumo: 'Parcialmente nublado', icone: '⛅' }
  if (code === 3) return { resumo: 'Nublado', icone: '☁️' }
  if ([45, 48].includes(code)) return { resumo: 'Neblina', icone: '🌫️' }
  if ([51, 53, 55, 56, 57].includes(code)) return { resumo: 'Garoa', icone: '🌦️' }
  if ([61, 63, 65, 66, 67].includes(code)) return { resumo: 'Chuva', icone: '🌧️' }
  if ([71, 73, 75, 77].includes(code)) return { resumo: 'Neve', icone: '❄️' }
  if ([80, 81, 82].includes(code)) return { resumo: 'Pancadas de chuva', icone: '🌧️' }
  if ([85, 86].includes(code)) return { resumo: 'Pancadas de neve', icone: '🌨️' }
  if ([95, 96, 99].includes(code)) return { resumo: 'Tempestade', icone: '⛈️' }

  return { resumo: 'Condição variável', icone: '🌦️' }
}

async function buscarRoteiro(roteiroId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Variáveis do Supabase não configuradas no servidor.')
  }

  const url = `${supabaseUrl}/rest/v1/roteiros?id=eq.${encodeURIComponent(roteiroId)}&select=*`

  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json',
    },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.message || 'Não foi possível buscar o roteiro.')
  }

  if (!Array.isArray(data) || data.length === 0) {
    return null
  }

  return data[0] as AnyRecord
}

function montarUrlOpenMeteo(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    timezone: 'America/Sao_Paulo',
    forecast_days: '16',
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'precipitation_sum',
      'wind_speed_10m_max',
      'uv_index_max',
    ].join(','),
  })

  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ roteiroId: string }> | { roteiroId: string } }
) {
  try {
    const paramsResolvidos = await Promise.resolve(context.params)
    const roteiroId = texto(paramsResolvidos.roteiroId)

    if (!roteiroId) {
      return resposta(400, {
        sucesso: false,
        disponivel: false,
        erro: 'Roteiro não informado.',
      })
    }

    const roteiro = await buscarRoteiro(roteiroId)

    if (!roteiro) {
      return resposta(404, {
        sucesso: false,
        disponivel: false,
        erro: 'Roteiro não encontrado.',
      })
    }

    const latitude = numero(roteiro.latitude)
    const longitude = numero(roteiro.longitude)

    if (latitude === null || longitude === null) {
      return resposta(200, {
        sucesso: true,
        disponivel: false,
        motivo: 'sem_coordenadas',
        mensagem: 'Clima indisponível porque este roteiro ainda não tem latitude e longitude salvas.',
      })
    }

    const dataReferencia = dataDoRoteiro(roteiro) || hojeISO()
    const diferenca = diffDias(dataReferencia)

    if (diferenca !== null && diferenca > 15) {
      return resposta(200, {
        sucesso: true,
        disponivel: false,
        motivo: 'fora_da_janela',
        data_referencia: dataReferencia,
        mensagem: 'A previsão climática gratuita fica disponível mais perto da data do roteiro.',
      })
    }

    const response = await fetch(montarUrlOpenMeteo(latitude, longitude), {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })

    const data = await response.json().catch(() => null)

    if (!response.ok || data?.error) {
      return resposta(502, {
        sucesso: false,
        disponivel: false,
        erro: data?.reason || 'Erro ao consultar previsão climática.',
      })
    }

    const daily = (data?.daily || {}) as WeatherDaily
    const current = (data?.current || {}) as WeatherCurrent
    const dias = Array.isArray(daily.time) ? daily.time : []
    const indice = Math.max(0, dias.indexOf(dataReferencia))
    const dataUsada = dias[indice] || dataReferencia
    const codigo = numero(daily.weather_code?.[indice] ?? current.weather_code)
    const descricao = descricaoCodigoClima(codigo)

    const temperaturaMin = numero(daily.temperature_2m_min?.[indice])
    const temperaturaMax = numero(daily.temperature_2m_max?.[indice])
    const temperaturaAtual = numero(current.temperature_2m)
    const chanceChuva = numero(daily.precipitation_probability_max?.[indice])
    const chuvaMm = numero(daily.precipitation_sum?.[indice])
    const ventoKmh = numero(daily.wind_speed_10m_max?.[indice] ?? current.wind_speed_10m)
    const umidade = numero(current.relative_humidity_2m)
    const uv = numero(daily.uv_index_max?.[indice])

    return resposta(200, {
      sucesso: true,
      disponivel: true,
      provider: 'open-meteo',
      roteiro_id: roteiroId,
      data_referencia: dataUsada,
      latitude,
      longitude,
      resumo: descricao.resumo,
      icone: descricao.icone,
      temperatura_min: temperaturaMin,
      temperatura_max: temperaturaMax,
      temperatura_atual: temperaturaAtual,
      chance_chuva: chanceChuva,
      chuva_mm: chuvaMm,
      vento_kmh: ventoKmh,
      umidade,
      indice_uv: uv,
      atualizado_em: new Date().toISOString(),
      mensagem:
        'Previsão gratuita estimada pela Open-Meteo. Confirme as orientações finais com o guia perto da data da atividade.',
    })
  } catch (error) {
    console.error('Erro em /api/clima/roteiro/[roteiroId]:', error)

    return resposta(500, {
      sucesso: false,
      disponivel: false,
      erro: error instanceof Error ? error.message : 'Erro interno ao consultar clima.',
    })
  }
}
