import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>
type AnySupabaseClient = any

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  ''

function json(data: AnyRecord, status = 200) {
  return NextResponse.json(data, { status })
}

function getSupabaseAdmin() {
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ausente no ambiente.')
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente no ambiente.')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

function normalizar(valor?: unknown) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function numeroSeguro(valor: unknown, fallback = 0) {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor

  const texto = String(valor ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
    .trim()

  const numero = Number(texto)
  return Number.isFinite(numero) ? numero : fallback
}

function primeiroValor(registro: AnyRecord, campos: string[]) {
  for (const campo of campos) {
    const valor = registro?.[campo]
    if (valor !== null && valor !== undefined && String(valor).trim() !== '') return valor
  }

  return null
}

function idRoteiroDaReserva(reserva: AnyRecord) {
  return String(
    primeiroValor(reserva, [
      'roteiro_id',
      'id_roteiro',
      'roteiroId',
      'roteiro',
      'experiencia_id',
      'experienciaId'
    ]) || ''
  ).trim()
}

function idClienteDaReserva(reserva: AnyRecord) {
  return String(
    primeiroValor(reserva, [
      'cliente_id',
      'id_cliente',
      'clienteId',
      'usuario_cliente_id',
      'user_cliente_id',
      'comprador_id',
      'id_usuario_cliente'
    ]) || ''
  ).trim()
}

function kmRoteiro(roteiro: AnyRecord) {
  return numeroSeguro(
    primeiroValor(roteiro, [
      'km',
      'distancia_km',
      'distanciaKm',
      'distancia',
      'quilometragem',
      'km_total',
      'distancia_total_km',
      'percurso_km'
    ]),
    0
  )
}

function dataSegura(valor: unknown): Date | null {
  if (!valor) return null

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) return valor

  const texto = String(valor).trim()
  if (!texto) return null

  const matchDataBR = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/)
  if (matchDataBR) {
    const [, dia, mes, ano, hora = '12', minuto = '00'] = matchDataBR
    const dataBR = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto))
    if (!Number.isNaN(dataBR.getTime())) return dataBR
  }

  const data = new Date(texto)
  if (Number.isNaN(data.getTime())) return null

  const ano = data.getFullYear()
  if (ano < 2020 || ano > 2100) return null

  return data
}

function dataExecucaoRegistro(registro: AnyRecord): Date | null {
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
    'data'
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
    const dataComHora = dataSegura(`${String(dataSeparada).trim()} ${String(horaSeparada).trim()}`)
    if (dataComHora) return dataComHora
  }

  for (const [chave, valor] of Object.entries(registro || {})) {
    const chaveNormalizada = normalizar(chave)

    if (
      chaveNormalizada === 'created_at' ||
      chaveNormalizada === 'updated_at' ||
      chaveNormalizada.includes('cadastur')
    ) {
      continue
    }

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

function dataJaPassou(registro: AnyRecord) {
  const data = dataExecucaoRegistro(registro)
  if (!data) return false

  const fimDoDia = new Date(data)
  fimDoDia.setHours(23, 59, 59, 999)

  return fimDoDia.getTime() < Date.now()
}

function statusExecutado(registro: AnyRecord) {
  const status = normalizar(registro?.status)

  return [
    'realizado',
    'realizada',
    'executado',
    'executada',
    'concluido',
    'concluida',
    'concluído',
    'concluída',
    'finalizado',
    'finalizada',
    'encerrado',
    'encerrada'
  ].includes(status)
}

function registroCanceladoOuInvalido(registro: AnyRecord) {
  const status = normalizar(registro?.status)

  return [
    'rascunho',
    'cancelado',
    'cancelada',
    'excluido',
    'excluida',
    'excluído',
    'excluída',
    'rejeitado',
    'rejeitada',
    'arquivado',
    'arquivada',
    'inativo',
    'inativa',
    'estornado',
    'estornada',
    'reembolsado',
    'reembolsada'
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
      'status_pix_paghiper'
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
    'concluído',
    'concluída'
  ]

  return confirmados.includes(pagamento) || confirmados.includes(status)
}

function reservaRealizada(reserva: AnyRecord) {
  return statusExecutado(reserva)
}

function erroDeColunaAusente(error: AnyRecord | null | undefined) {
  const texto = String(error?.message || error?.details || error?.hint || '').toLowerCase()
  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    texto.includes('column') ||
    texto.includes('schema cache') ||
    texto.includes('could not find')
  )
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

async function buscarReservasPorRoteiros(
  supabase: AnySupabaseClient,
  roteiroIds: string[]
) {
  const ids = Array.from(new Set(roteiroIds.filter(Boolean)))
  const mapa = new Map<string, AnyRecord>()

  if (ids.length === 0) return []

  const campos = ['roteiro_id', 'id_roteiro']

  for (const campo of campos) {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .in(campo, ids)
      .limit(2500)

    if (error) {
      if (!erroDeColunaAusente(error as AnyRecord)) {
        console.warn(`Erro ao buscar reservas por ${campo}:`, error.message)
      }
      continue
    }

    ;((data || []) as AnyRecord[]).forEach((item) => {
      if (item?.id) mapa.set(String(item.id), item)
    })
  }

  return Array.from(mapa.values())
}

async function buscarRoteirosPorIds(
  supabase: AnySupabaseClient,
  roteiroIds: string[]
) {
  const ids = Array.from(new Set(roteiroIds.filter(Boolean)))

  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('roteiros')
    .select('*')
    .in('id', ids)
    .limit(500)

  if (error || !data) return []

  return data as AnyRecord[]
}

function mediaAvaliacoes(avaliacoes: AnyRecord[]) {
  if (avaliacoes.length === 0) return 0

  const soma = avaliacoes.reduce((total, avaliacao) => total + numeroSeguro(avaliacao?.nota, 0), 0)
  return soma / avaliacoes.length
}

export async function GET(_request: Request, context: any) {
  try {
    const params = await context?.params
    const guiaId = String(params?.id || '').trim()

    if (!guiaId) {
      return json({ sucesso: false, erro: 'ID do guia não informado.' }, 400)
    }

    const supabase = getSupabaseAdmin()

    const [roteirosDiretos, reservasDiretas, avaliacoes] = await Promise.all([
      buscarPorCampos(supabase, 'roteiros', ['id_guia', 'guia_id', 'user_id', 'usuario_id'], guiaId),
      buscarPorCampos(supabase, 'reservas', ['guia_id', 'id_guia', 'user_id', 'usuario_id'], guiaId),
      buscarPorCampos(supabase, 'avaliacoes', ['guia_id', 'id_guia'], guiaId)
    ])

    const roteirosVisiveis = roteirosDiretos.filter((roteiro) => !registroCanceladoOuInvalido(roteiro))
    const roteiroIdsDiretos = roteirosVisiveis.map((roteiro) => String(roteiro.id)).filter(Boolean)

    const reservasPorRoteiro = await buscarReservasPorRoteiros(supabase, roteiroIdsDiretos)
    const mapaReservas = new Map<string, AnyRecord>()

    ;[...reservasDiretas, ...reservasPorRoteiro].forEach((reserva) => {
      if (reserva?.id) mapaReservas.set(String(reserva.id), reserva)
    })

    const reservas = Array.from(mapaReservas.values())

    const roteiroIdsReservas = Array.from(
      new Set(reservas.map((reserva) => idRoteiroDaReserva(reserva)).filter(Boolean))
    )

    const roteirosExtras = await buscarRoteirosPorIds(
      supabase,
      roteiroIdsReservas.filter((id) => !roteiroIdsDiretos.includes(id))
    )

    const mapaRoteiros = new Map<string, AnyRecord>()
    ;[...roteirosVisiveis, ...roteirosExtras].forEach((roteiro) => {
      if (roteiro?.id && !registroCanceladoOuInvalido(roteiro)) {
        mapaRoteiros.set(String(roteiro.id), roteiro)
      }
    })

    const clientesComAvaliacao = new Set(
      avaliacoes
        .map((avaliacao) => String(avaliacao?.cliente_id || avaliacao?.id_cliente || '').trim())
        .filter(Boolean)
    )

    const reservasPagas = reservas.filter((reserva) => pagamentoConfirmado(reserva))

    const reservasExecutadas = reservas.filter((reserva) => {
      if (reservaRealizada(reserva)) return true

      const clienteId = idClienteDaReserva(reserva)
      if (clienteId && clientesComAvaliacao.has(clienteId)) return true

      if (!pagamentoConfirmado(reserva)) return false

      const roteiroId = idRoteiroDaReserva(reserva)
      const roteiro = roteiroId ? mapaRoteiros.get(roteiroId) : null

      return dataJaPassou(reserva) || Boolean(roteiro && (statusExecutado(roteiro) || dataJaPassou(roteiro)))
    })

    // Para MVP comercial/público: se existem reservas pagas, elas contam como histórico comercial atendido.
    // Se ainda não houver status/data confiáveis, isso evita zerar o perfil do guia.
    const reservasComerciais = reservasPagas.length > 0 ? reservasPagas : reservasExecutadas

    const roteiroIdsComerciais = new Set<string>()

    Array.from(mapaRoteiros.values()).forEach((roteiro) => {
      if (statusExecutado(roteiro) || dataJaPassou(roteiro)) {
        roteiroIdsComerciais.add(String(roteiro.id))
      }
    })

    reservasComerciais.forEach((reserva) => {
      const roteiroId = idRoteiroDaReserva(reserva)
      if (roteiroId) roteiroIdsComerciais.add(roteiroId)
    })

    const roteirosExecutados = Array.from(mapaRoteiros.values()).filter((roteiro) =>
      roteiroIdsComerciais.has(String(roteiro.id))
    )

    const clientesUnicos = new Set<string>()

    reservasComerciais.forEach((reserva) => {
      const clienteId = idClienteDaReserva(reserva)
      if (clienteId) {
        clientesUnicos.add(clienteId)
      } else if (reserva?.id) {
        clientesUnicos.add(`reserva:${String(reserva.id)}`)
      }
    })

    clientesComAvaliacao.forEach((clienteId) => {
      if (clienteId) clientesUnicos.add(clienteId)
    })

    const totalKm = roteirosExecutados.reduce((total, roteiro) => total + kmRoteiro(roteiro), 0)

    return json({
      sucesso: true,
      stats: {
        totalKm,
        totalRoteiros: roteirosExecutados.length,
        totalReservas: reservas.length,
        reservasConfirmadas: reservasComerciais.length,
        totalClientes: clientesUnicos.size,
        avaliacaoMedia: mediaAvaliacoes(avaliacoes),
        totalAvaliacoes: avaliacoes.length
      },
      resumo: {
        roteirosEncontrados: mapaRoteiros.size,
        reservasEncontradas: reservas.length,
        reservasPagas: reservasPagas.length,
        reservasExecutadas: reservasExecutadas.length,
        roteirosExecutados: roteirosExecutados.length,
        clientesAtendidos: clientesUnicos.size,
        avaliacoes: avaliacoes.length
      }
    })
  } catch (error: any) {
    console.error('Erro em /api/guia/publico/[id]/metricas:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao calcular métricas públicas do guia.'
      },
      500
    )
  }
}
