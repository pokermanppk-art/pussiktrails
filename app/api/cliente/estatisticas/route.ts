import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>
type AnySupabaseClient = any

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  ''

function json(data: AnyRecord, status = 200) {
  return NextResponse.json(data, { status })
}

function getSupabaseAdmin() {
  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL ausente no ambiente.')
  if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente no ambiente.')

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function normalizar(valor?: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function numeroSeguro(valor: unknown, fallback = 0) {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor

  const raw = String(valor ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
    .trim()

  const numero = Number(raw)
  return Number.isFinite(numero) ? numero : fallback
}

function primeiroValor(registro: AnyRecord | null | undefined, campos: string[]) {
  for (const campo of campos) {
    const valor = registro?.[campo]
    if (valor !== null && valor !== undefined && String(valor).trim() !== '') return valor
  }

  return null
}

function idRoteiroDaReserva(reserva: AnyRecord) {
  return texto(
    primeiroValor(reserva, [
      'roteiro_id',
      'id_roteiro',
      'roteiroId',
      'roteiro',
      'experiencia_id',
      'experienciaId',
    ])
  )
}

function kmRoteiro(roteiro?: AnyRecord | null) {
  return numeroSeguro(
    primeiroValor(roteiro, [
      'km',
      'distancia_km',
      'distanciaKm',
      'distancia',
      'quilometragem',
      'km_total',
      'distancia_total_km',
      'percurso_km',
    ]),
    0
  )
}

function tituloRoteiro(roteiro?: AnyRecord | null) {
  return texto(roteiro?.titulo || roteiro?.nome || roteiro?.name) || 'Roteiro'
}

function dataSegura(valor: unknown): Date | null {
  if (!valor) return null
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) return valor

  const raw = texto(valor)
  if (!raw) return null

  const matchDataBR = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/)
  if (matchDataBR) {
    const [, dia, mes, ano, hora = '12', minuto = '00'] = matchDataBR
    const dataBR = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto))
    if (!Number.isNaN(dataBR.getTime())) return dataBR
  }

  const data = new Date(raw)
  if (Number.isNaN(data.getTime())) return null

  const ano = data.getFullYear()
  if (ano < 2020 || ano > 2100) return null

  return data
}

function dataExecucaoRegistro(registro?: AnyRecord | null): Date | null {
  const camposPreferidos = [
    'embarque_data_hora',
    'saida_data_hora',
    'data_hora',
    'data_roteiro',
    'data_trilha',
    'data_inicio',
    'data_saida',
    'data_evento',
    'data_realizacao',
    'data_execucao',
    'data_agendada',
    'data_agendamento',
    'inicio_em',
    'realizado_em',
    'executado_em',
    'start_date',
    'starts_at',
    'data',
  ]

  for (const campo of camposPreferidos) {
    const data = dataSegura(registro?.[campo])
    if (data) return data
  }

  const dataSeparada =
    registro?.data ||
    registro?.data_roteiro ||
    registro?.data_trilha ||
    registro?.data_inicio ||
    registro?.data_saida ||
    registro?.data_evento

  const horaSeparada =
    registro?.hora ||
    registro?.horario ||
    registro?.horario_saida ||
    registro?.hora_saida ||
    registro?.hora_inicio

  if (dataSeparada && horaSeparada) {
    const dataComHora = dataSegura(`${texto(dataSeparada)} ${texto(horaSeparada)}`)
    if (dataComHora) return dataComHora
  }

  for (const [chave, valor] of Object.entries(registro || {})) {
    const chaveNormalizada = normalizar(chave)

    if (chaveNormalizada === 'created_at' || chaveNormalizada === 'updated_at') continue

    const pareceCampoDeData =
      chaveNormalizada.includes('data') ||
      chaveNormalizada.includes('date') ||
      chaveNormalizada.endsWith('_em') ||
      chaveNormalizada.endsWith('_at')

    if (!pareceCampoDeData) continue

    const data = dataSegura(valor)
    if (data) return data
  }

  return null
}

function dataJaPassou(registro?: AnyRecord | null) {
  const data = dataExecucaoRegistro(registro)
  if (!data) return false

  const fimDoDia = new Date(data)
  fimDoDia.setHours(23, 59, 59, 999)

  return fimDoDia.getTime() < Date.now()
}

function statusExecutado(registro?: AnyRecord | null) {
  const status = normalizar(registro?.status)

  return [
    'realizado',
    'realizada',
    'executado',
    'executada',
    'concluido',
    'concluida',
    'concluido',
    'concluida',
    'finalizado',
    'finalizada',
    'encerrado',
    'encerrada',
  ].includes(status)
}

function registroCanceladoOuInvalido(registro?: AnyRecord | null) {
  const status = normalizar(registro?.status)

  return [
    'rascunho',
    'cancelado',
    'cancelada',
    'cancelled',
    'canceled',
    'excluido',
    'excluida',
    'excluido',
    'excluida',
    'rejeitado',
    'rejeitada',
    'recusado',
    'recusada',
    'arquivado',
    'arquivada',
    'inativo',
    'inativa',
    'estornado',
    'estornada',
    'reembolsado',
    'reembolsada',
  ].includes(status)
}

function pagamentoConfirmado(reserva: AnyRecord) {
  const pagamento = normalizar(
    primeiroValor(reserva, [
      'pagamento_status',
      'status_pagamento',
      'payment_status',
      'pix_status',
      'status_pix',
      'paghiper_status',
      'status_paghiper',
      'transaction_status',
      'status_transacao',
      'status_pix_paghiper',
    ])
  )

  const status = normalizar(reserva?.status)

  const confirmados = [
    'pago',
    'paga',
    'pagamento_confirmado',
    'confirmado',
    'confirmada',
    'aprovado',
    'aprovada',
    'approved',
    'paid',
    'completed',
    'complete',
    'succeeded',
    'success',
    'sucesso',
    'liquidado',
    'liquidada',
    'settled',
    'realizado',
    'realizada',
    'executado',
    'executada',
    'concluido',
    'concluida',
  ]

  return (
    confirmados.includes(pagamento) ||
    confirmados.includes(status) ||
    Boolean(texto(reserva?.pagamento_confirmado_em)) ||
    Boolean(texto(reserva?.paid_at)) ||
    Boolean(texto(reserva?.confirmado_em))
  )
}

function contaParaJornada(reserva: AnyRecord, roteiro?: AnyRecord | null) {
  if (registroCanceladoOuInvalido(reserva)) return false
  if (roteiro && registroCanceladoOuInvalido(roteiro)) return false

  // Regra operacional final:
  // pagamento confirmado libera grupo/comunicação;
  // somente reserva marcada como realizada soma trilhas, KM e medalhas.
  if (statusExecutado(reserva)) return true

  return false
}
function erroDeColunaAusente(error: AnyRecord | null | undefined) {
  const msg = String(error?.message || error?.details || error?.hint || '').toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    msg.includes('column') ||
    msg.includes('schema cache') ||
    msg.includes('could not find') ||
    msg.includes('does not exist')
  )
}

function extrairColunaAusente(error: AnyRecord | null | undefined) {
  const textoErro = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ')

  const matchTabelaColuna = textoErro.match(/[a-zA-Z0-9_]+\.([a-zA-Z0-9_]+)/)
  if (matchTabelaColuna?.[1]) return matchTabelaColuna[1]

  const matchColumn = textoErro.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i)
  if (matchColumn?.[1]) return matchColumn[1]

  const matchAspas = textoErro.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  return ''
}

async function buscarPorCampos(
  supabase: AnySupabaseClient,
  tabela: string,
  campos: string[],
  valor: string
) {
  const mapa = new Map<string, AnyRecord>()

  for (const campo of campos) {
    const { data, error } = await supabase
      .from(tabela)
      .select('*')
      .eq(campo, valor)
      .limit(2500)

    if (error) {
      if (!erroDeColunaAusente(error as AnyRecord)) {
        console.warn(`Erro ao buscar ${tabela}.${campo}:`, error.message)
      }
      continue
    }

    ;((data || []) as AnyRecord[]).forEach((item) => {
      if (item?.id) mapa.set(String(item.id), item)
    })
  }

  return Array.from(mapa.values())
}

async function buscarRoteirosPorIds(supabase: AnySupabaseClient, roteiroIds: string[]) {
  const ids = Array.from(new Set(roteiroIds.filter(Boolean)))
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('roteiros')
    .select('*')
    .in('id', ids)
    .limit(2500)

  if (error) {
    console.warn('Erro ao buscar roteiros das métricas do cliente:', error)
    return []
  }

  return (data || []) as AnyRecord[]
}

async function atualizarResumoNoUsuario(
  supabase: AnySupabaseClient,
  userId: string,
  payloadOriginal: AnyRecord
) {
  let payload: AnyRecord = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 18; tentativa++) {
    if (Object.keys(payload).length === 0) return null

    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', userId)
      .select('*')
      .maybeSingle()

    if (!error) return data || null
    if (!erroDeColunaAusente(error as AnyRecord)) {
      console.warn('Resumo de jornada calculado, mas não foi salvo em users:', error)
      return null
    }

    const coluna = extrairColunaAusente(error as AnyRecord)
    if (!coluna || !(coluna in payload)) return null
    delete payload[coluna]
  }

  return null
}

async function calcularMetricasCliente(supabase: AnySupabaseClient, userId: string) {
  const reservas = await buscarPorCampos(
    supabase,
    'reservas',
    [
      'cliente_id',
      'id_cliente',
      'usuario_cliente_id',
      'user_cliente_id',
      'comprador_id',
      'id_usuario_cliente',
      'usuario_id',
      'user_id',
    ],
    userId
  )

  const roteiroIds = Array.from(
    new Set(reservas.map((reserva) => idRoteiroDaReserva(reserva)).filter(Boolean))
  )

  const roteiros = await buscarRoteirosPorIds(supabase, roteiroIds)
  const mapaRoteiros = new Map<string, AnyRecord>()

  roteiros.forEach((roteiro) => {
    if (roteiro?.id) mapaRoteiros.set(String(roteiro.id), roteiro)
  })

  const reservasJornada = reservas.filter((reserva) => {
    const roteiroId = idRoteiroDaReserva(reserva)
    const roteiro = roteiroId ? mapaRoteiros.get(roteiroId) : null
    return contaParaJornada(reserva, roteiro)
  })

  const experiencias = reservasJornada.map((reserva) => {
    const roteiroId = idRoteiroDaReserva(reserva)
    const roteiro = roteiroId ? mapaRoteiros.get(roteiroId) || null : null
    const km = kmRoteiro(roteiro)

    return {
      reserva_id: reserva.id || '',
      roteiro_id: roteiroId,
      titulo: tituloRoteiro(roteiro),
      km,
      status: reserva.status || '',
      pagamento_status: reserva.pagamento_status || reserva.status_pagamento || '',
      created_at: reserva.created_at || null,
    }
  })

  const totalKm = experiencias.reduce((total, item) => total + numeroSeguro(item.km), 0)
  const roteiroIdsJornada = Array.from(new Set(experiencias.map((item) => item.roteiro_id).filter(Boolean)))

  return {
    totalKm,
    totalTrilhas: reservasJornada.length,
    totalReservas: reservas.length,
    reservasValidas: reservasJornada.length,
    roteirosValidos: roteiroIdsJornada.length,
    experiencias,
    resumo: {
      reservasEncontradas: reservas.length,
      reservasComputadas: reservasJornada.length,
      roteirosEncontrados: roteiros.length,
      roteirosComputados: roteiroIdsJornada.length,
    },
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = texto(
      request.nextUrl.searchParams.get('userId') ||
        request.nextUrl.searchParams.get('clienteId') ||
        request.nextUrl.searchParams.get('cliente_id') ||
        request.nextUrl.searchParams.get('usuarioId') ||
        request.nextUrl.searchParams.get('usuario_id')
    )

    if (!userId) {
      return json({ sucesso: false, erro: 'ID do cliente não informado.' }, 400)
    }

    const supabase = getSupabaseAdmin()
    const metricas = await calcularMetricasCliente(supabase, userId)

    const usuarioAtualizado = await atualizarResumoNoUsuario(supabase, userId, {
      km_percorridos: metricas.totalKm,
      total_km: metricas.totalKm,
      trilhas_realizadas: metricas.totalTrilhas,
      total_trilhas: metricas.totalTrilhas,
      reservas_confirmadas: metricas.reservasValidas,
      updated_at: new Date().toISOString(),
    })

    return json({
      sucesso: true,
      stats: {
        totalKm: metricas.totalKm,
        totalTrilhas: metricas.totalTrilhas,
        totalReservas: metricas.totalReservas,
        reservasValidas: metricas.reservasValidas,
        roteirosValidos: metricas.roteirosValidos,
      },
      resumo: metricas.resumo,
      experiencias: metricas.experiencias,
      usuarioAtualizado: Boolean(usuarioAtualizado),
    })
  } catch (error: any) {
    console.error('Erro em /api/cliente/estatisticas:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao calcular métricas do cliente.',
      },
      500
    )
  }
}
