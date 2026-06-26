import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AnyRecord = Record<string, any>

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

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function erroDeColunaAusente(error: AnyRecord | null | undefined) {
  const mensagem = String(error?.message || error?.details || error?.hint || '').toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    mensagem.includes('schema cache') ||
    mensagem.includes('could not find') ||
    mensagem.includes('column') ||
    mensagem.includes('does not exist')
  )
}

function extrairColunaAusente(error: AnyRecord | null | undefined) {
  const textoErro = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ')

  // Erros do PostgREST costumam vir como:
  // Could not find the 'finalizada_em' column of 'reservas' in the schema cache
  // Por isso precisamos priorizar o conteúdo entre aspas antes do padrão genérico "column ...".
  const matchAspas = textoErro.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  const matchTabelaColuna = textoErro.match(/[a-zA-Z0-9_]+\.([a-zA-Z0-9_]+)/)
  if (matchTabelaColuna?.[1]) return matchTabelaColuna[1]

  const matchColumn = textoErro.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i)
  if (matchColumn?.[1] && matchColumn[1] !== 'of') return matchColumn[1]

  return ''
}

function erroDeConstraintStatus(error: AnyRecord | null | undefined) {
  const mensagem = String(error?.message || error?.details || error?.hint || '').toLowerCase()

  return (
    error?.code === '23514' ||
    mensagem.includes('violates check constraint') ||
    mensagem.includes('check constraint') ||
    mensagem.includes('status')
  )
}

function guiaIdDoRoteiro(roteiro?: AnyRecord | null) {
  return texto(
    roteiro?.id_guia ||
      roteiro?.guia_id ||
      roteiro?.user_id ||
      roteiro?.usuario_id ||
      roteiro?.criado_por ||
      roteiro?.created_by ||
      roteiro?.owner_id
  )
}

function tituloRoteiro(roteiro?: AnyRecord | null) {
  return texto(roteiro?.titulo || roteiro?.nome || roteiro?.name) || 'Roteiro PrussikTrails'
}

function idRoteiroDaReserva(reserva: AnyRecord) {
  return texto(reserva?.roteiro_id || reserva?.id_roteiro)
}

function idClienteDaReserva(reserva: AnyRecord) {
  return texto(reserva?.cliente_id || reserva?.user_id || reserva?.usuario_id)
}

function numero(valor: unknown) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0
  const normalizado = texto(valor).replace(/\./g, '').replace(',', '.')
  const n = Number(normalizado || 0)
  return Number.isFinite(n) ? n : 0
}

function kmRoteiro(roteiro?: AnyRecord | null) {
  return (
    numero(roteiro?.km) ||
    numero(roteiro?.distancia_km) ||
    numero(roteiro?.distancia) ||
    numero(roteiro?.quilometragem) ||
    numero(roteiro?.percurso_km)
  )
}

function reservaCanceladaOuInvalida(reserva: AnyRecord) {
  const status = normalizar(reserva?.status)
  const pagamento = normalizar(reserva?.pagamento_status || reserva?.status_pagamento)

  return [
    'cancelado',
    'cancelada',
    'canceled',
    'cancelled',
    'recusado',
    'recusada',
    'rejeitado',
    'rejeitada',
    'estornado',
    'estornada',
    'reembolsado',
    'reembolsada',
    'refund',
    'refunded',
  ].includes(status) || [
    'cancelado',
    'cancelada',
    'estornado',
    'estornada',
    'reembolsado',
    'reembolsada',
    'refund',
    'refunded',
  ].includes(pagamento)
}

function pagamentoConfirmado(reserva: AnyRecord) {
  const pagamento = normalizar(reserva?.pagamento_status || reserva?.status_pagamento || reserva?.payment_status)
  const status = normalizar(reserva?.status)

  return [
    'pago',
    'paga',
    'confirmado',
    'confirmada',
    'aprovado',
    'aprovada',
    'paid',
    'approved',
    'settled',
    'liquidado',
    'liquidada',
    'realizado',
    'realizada',
    'concluido',
    'concluida',
    'finalizado',
    'finalizada',
  ].includes(pagamento) || [
    'confirmado',
    'confirmada',
    'pago',
    'paga',
    'realizado',
    'realizada',
    'concluido',
    'concluida',
    'finalizado',
    'finalizada',
  ].includes(status)
}

function reservaRealizada(reserva: AnyRecord) {
  const status = normalizar(reserva?.status)

  return [
    'realizado',
    'realizada',
    'concluido',
    'concluida',
    'finalizado',
    'finalizada',
    'executado',
    'executada',
  ].includes(status)
}

function dataRoteiro(roteiro?: AnyRecord | null) {
  return (
    roteiro?.proxima_data ||
    roteiro?.embarque_data_hora ||
    roteiro?.data_roteiro ||
    roteiro?.data_trilha ||
    roteiro?.data_saida ||
    roteiro?.data_inicio ||
    roteiro?.data_disponivel ||
    roteiro?.embarque_data ||
    roteiro?.data ||
    null
  )
}

function dataDaExperienciaJaPassou(roteiro?: AnyRecord | null) {
  const valor = dataRoteiro(roteiro)
  if (!valor) return false

  const raw = texto(valor)
  const data = raw.length <= 10 ? new Date(`${raw.slice(0, 10)}T23:59:59`) : new Date(raw)

  if (Number.isNaN(data.getTime())) return false

  return data.getTime() < Date.now()
}

async function buscarUsuario(supabase: any, userId: string) {
  if (!userId) return null

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function buscarRoteiro(supabase: any, roteiroId: string) {
  const { data, error } = await supabase
    .from('roteiros')
    .select('*')
    .eq('id', roteiroId)
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function buscarReservasDoRoteiro(supabase: any, roteiroId: string) {
  const acumuladas: AnyRecord[] = []

  for (const coluna of ['roteiro_id', 'id_roteiro']) {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq(coluna, roteiroId)

    if (error) {
      if (erroDeColunaAusente(error)) continue
      throw error
    }

    if (Array.isArray(data)) acumuladas.push(...data)
  }

  const mapa = new Map<string, AnyRecord>()
  acumuladas.forEach((item) => {
    if (item?.id) mapa.set(String(item.id), item)
  })

  return Array.from(mapa.values())
}

async function buscarGruposDoRoteiro(supabase: any, roteiroId: string) {
  const acumulados: AnyRecord[] = []

  for (const coluna of ['roteiro_id', 'id_roteiro']) {
    const { data, error } = await supabase
      .from('grupos_roteiros')
      .select('*')
      .eq(coluna, roteiroId)

    if (error) {
      if (erroDeColunaAusente(error)) continue
      throw error
    }

    if (Array.isArray(data)) acumulados.push(...data)
  }

  const mapa = new Map<string, AnyRecord>()
  acumulados.forEach((item) => {
    if (item?.id) mapa.set(String(item.id), item)
  })

  return Array.from(mapa.values())
}

async function atualizarPorIdsComFallback(
  supabase: any,
  tabela: string,
  ids: string[],
  payloadOriginal: AnyRecord,
  select = 'id, status'
) {
  if (ids.length === 0) return []

  let payload = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 22; tentativa++) {
    const { data, error } = await supabase
      .from(tabela)
      .update(payload)
      .in('id', ids)
      .select(select)

    if (!error) return data || []

    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)
    if (!coluna || !(coluna in payload)) throw error

    delete payload[coluna]

    if (Object.keys(payload).length === 0) return []
  }

  throw new Error(`Não foi possível atualizar ${tabela}.`)
}

async function atualizarUmComFallback(
  supabase: any,
  tabela: string,
  id: string,
  payloadOriginal: AnyRecord,
  select = '*'
) {
  let payload = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 22; tentativa++) {
    const { data, error } = await supabase
      .from(tabela)
      .update(payload)
      .eq('id', id)
      .select(select)
      .maybeSingle()

    if (!error) return data || null

    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)
    if (!coluna || !(coluna in payload)) throw error

    delete payload[coluna]

    if (Object.keys(payload).length === 0) return null
  }

  throw new Error(`Não foi possível atualizar ${tabela}.`)
}

async function atualizarReservasComoRealizadas(supabase: any, reservas: AnyRecord[]) {
  const ids = reservas.map((reserva) => texto(reserva.id)).filter(Boolean)
  if (ids.length === 0) return { statusUsado: '', atualizadas: [] as AnyRecord[] }

  let ultimoErro: AnyRecord | null = null

  for (const status of ['realizada', 'realizado', 'concluida', 'finalizada']) {
    try {
      const atualizadas = await atualizarPorIdsComFallback(
        supabase,
        'reservas',
        ids,
        {
          status,
          // A tabela reservas do projeto atual não possui finalizada_em.
          // updated_at também pode variar; se não existir, o fallback remove sem quebrar.
          updated_at: new Date().toISOString(),
        },
        'id, status, cliente_id, roteiro_id'
      )

      return { statusUsado: status, atualizadas }
    } catch (error: any) {
      ultimoErro = error
      if (!erroDeConstraintStatus(error)) throw error
    }
  }

  throw ultimoErro || new Error('Nenhum status de reserva realizada foi aceito pelo banco.')
}

async function pausarRoteiroAposRealizacao(supabase: any, roteiroId: string) {
  let ultimoErro: AnyRecord | null = null

  for (const status of ['pausado', 'inativo', 'pendente']) {
    try {
      const roteiro = await atualizarUmComFallback(
        supabase,
        'roteiros',
        roteiroId,
        {
          status,
          ativo: false,
          realizado_em: new Date().toISOString(),
          finalizado_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      )

      return { statusUsado: status, roteiro }
    } catch (error: any) {
      ultimoErro = error
      if (!erroDeConstraintStatus(error)) throw error
    }
  }

  throw ultimoErro || new Error('Nenhum status de pausa foi aceito pelo banco.')
}

async function encerrarGrupo(supabase: any, grupo: AnyRecord, actorId: string, titulo: string) {
  if (!grupo?.id) return null

  let grupoAtualizado: AnyRecord | null = null

  try {
    grupoAtualizado = await atualizarUmComFallback(
      supabase,
      'grupos_roteiros',
      String(grupo.id),
      {
        status: 'encerrado',
        ativo: false,
        permite_mensagens: false,
        encerrado_em: new Date().toISOString(),
        encerrado_motivo: 'Roteiro marcado como realizado.',
        updated_at: new Date().toISOString(),
      }
    )
  } catch (error) {
    console.warn('Aviso ao encerrar grupo do roteiro:', error)
  }

  await inserirMensagemSistema(supabase, String(grupo.id), actorId, `Roteiro realizado. O grupo interno de ${titulo} foi encerrado e preservado como histórico.`)

  return grupoAtualizado || grupo
}

async function inserirMensagemSistema(supabase: any, grupoId: string, actorId: string, mensagem: string) {
  let payload: AnyRecord = {
    grupo_id: grupoId,
    user_id: actorId || null,
    mensagem,
    tipo: 'sistema',
    status: 'ativa',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  for (let tentativa = 0; tentativa < 16; tentativa++) {
    const { error } = await supabase.from('grupo_mensagens').insert(payload)

    if (!error) return true

    if (!erroDeColunaAusente(error)) {
      console.warn('Aviso ao inserir mensagem de sistema do grupo:', error)
      return false
    }

    const coluna = extrairColunaAusente(error)
    if (!coluna || !(coluna in payload)) return false
    delete payload[coluna]
  }

  return false
}

async function buscarRoteirosPorIds(supabase: any, ids: string[]): Promise<AnyRecord[]> {
  const limpos = Array.from(new Set(ids.filter(Boolean)))
  if (limpos.length === 0) return []

  const { data, error } = await supabase
    .from('roteiros')
    .select('*')
    .in('id', limpos)

  if (error) throw error
  return data || []
}

async function buscarReservasDoCliente(supabase: any, clienteId: string) {
  const acumuladas: AnyRecord[] = []

  for (const coluna of ['cliente_id', 'user_id', 'usuario_id']) {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq(coluna, clienteId)

    if (error) {
      if (erroDeColunaAusente(error)) continue
      throw error
    }

    if (Array.isArray(data)) acumuladas.push(...data)
  }

  const mapa = new Map<string, AnyRecord>()
  acumuladas.forEach((item) => {
    if (item?.id) mapa.set(String(item.id), item)
  })

  return Array.from(mapa.values())
}

async function atualizarMetricasCliente(supabase: any, clienteId: string) {
  if (!clienteId) return null

  try {
    const reservas = await buscarReservasDoCliente(supabase, clienteId)
    const realizadas = reservas.filter((reserva) => reservaRealizada(reserva) && !reservaCanceladaOuInvalida(reserva))
    const roteiroIds = Array.from(new Set(realizadas.map(idRoteiroDaReserva).filter(Boolean)))
    const roteiros = await buscarRoteirosPorIds(supabase, roteiroIds)
    const mapaRoteiros = new Map<string, AnyRecord>()

    roteiros.forEach((roteiro: AnyRecord) => {
      if (roteiro?.id) mapaRoteiros.set(String(roteiro.id), roteiro)
    })

    const totalKm = realizadas.reduce((total, reserva) => {
      const roteiroId = idRoteiroDaReserva(reserva)
      const roteiro = roteiroId ? mapaRoteiros.get(roteiroId) || null : null
      return total + kmRoteiro(roteiro)
    }, 0)

    const payload = {
      km_percorridos: totalKm,
      total_km: totalKm,
      trilhas_realizadas: realizadas.length,
      total_trilhas: realizadas.length,
      updated_at: new Date().toISOString(),
    }

    await atualizarUmComFallback(supabase, 'users', clienteId, payload, 'id')

    return {
      cliente_id: clienteId,
      trilhas_realizadas: realizadas.length,
      km_percorridos: totalKm,
    }
  } catch (error) {
    console.warn(`Aviso ao atualizar métricas do cliente ${clienteId}:`, error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const roteiroId = texto(body.roteiroId || body.roteiro_id || body.id)
    const actorId = texto(body.userId || body.usuarioId || body.guiaId || body.adminId || body.user_id || body.usuario_id || body.guia_id || body.admin_id)
    const forcarAdmin = body.forcar === true || body.force === true

    if (!roteiroId) {
      return json({ sucesso: false, erro: 'Informe roteiroId.' }, 400)
    }

    if (!actorId) {
      return json({ sucesso: false, erro: 'Usuário não identificado.' }, 401)
    }

    const [usuario, roteiro] = await Promise.all([
      buscarUsuario(supabase, actorId),
      buscarRoteiro(supabase, roteiroId),
    ])

    if (!usuario?.id) {
      return json({ sucesso: false, erro: 'Usuário não localizado.' }, 401)
    }

    if (!roteiro?.id) {
      return json({ sucesso: false, erro: 'Roteiro não encontrado.' }, 404)
    }

    const tipoUsuario = normalizar(usuario.tipo || body.tipo || body.tipoUsuario)
    const admin = tipoUsuario === 'admin'
    const guia = tipoUsuario === 'guia'
    const guiaDoRoteiro = guiaIdDoRoteiro(roteiro)

    if (!admin && !guia) {
      return json({ sucesso: false, erro: 'Apenas guia ou admin pode finalizar roteiro.' }, 403)
    }

    if (guia && guiaDoRoteiro && guiaDoRoteiro !== actorId) {
      return json({ sucesso: false, erro: 'Este roteiro não pertence ao guia informado.' }, 403)
    }

    if (!dataDaExperienciaJaPassou(roteiro) && !(admin && forcarAdmin)) {
      return json(
        {
          sucesso: false,
          erro: 'O roteiro só pode ser finalizado depois da data da experiência.',
          detalhe: 'Atualize a data do roteiro se a experiência foi remarcada.',
        },
        400
      )
    }

    const reservas = await buscarReservasDoRoteiro(supabase, roteiroId)
    const reservasPagas = reservas.filter((reserva) => pagamentoConfirmado(reserva) && !reservaCanceladaOuInvalida(reserva))
    const reservasJaRealizadas = reservasPagas.filter(reservaRealizada)
    const reservasParaRealizar = reservasPagas.filter((reserva) => !reservaRealizada(reserva))

    const atualizacaoReservas = await atualizarReservasComoRealizadas(supabase, reservasParaRealizar)
    const atualizacaoRoteiro = await pausarRoteiroAposRealizacao(supabase, roteiroId)

    const grupos = await buscarGruposDoRoteiro(supabase, roteiroId)
    const gruposAtualizados: AnyRecord[] = []

    for (const grupo of grupos) {
      const atualizado = await encerrarGrupo(supabase, grupo, actorId, tituloRoteiro(roteiro))
      if (atualizado) gruposAtualizados.push(atualizado)
    }

    const clienteIds = Array.from(new Set(reservasPagas.map(idClienteDaReserva).filter(Boolean)))
    const metricasClientes: AnyRecord[] = []

    for (const clienteId of clienteIds) {
      const metricas = await atualizarMetricasCliente(supabase, clienteId)
      if (metricas) metricasClientes.push(metricas)
    }

    return json({
      sucesso: true,
      mensagem: 'Roteiro finalizado como realizado. Reservas confirmadas foram marcadas como realizadas, o roteiro foi pausado e o grupo foi encerrado.',
      roteiro: {
        id: roteiro.id,
        titulo: tituloRoteiro(roteiro),
        status_usado: atualizacaoRoteiro.statusUsado,
      },
      reservas: {
        total: reservas.length,
        pagas_confirmadas: reservasPagas.length,
        ja_realizadas: reservasJaRealizadas.length,
        marcadas_agora: reservasParaRealizar.length,
        status_usado: atualizacaoReservas.statusUsado,
      },
      grupos: {
        encontrados: grupos.length,
        encerrados: gruposAtualizados.length,
      },
      clientes_atualizados: metricasClientes.length,
      metricas_clientes: metricasClientes,
    })
  } catch (error: any) {
    console.error('Erro em /api/roteiros/finalizar:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao finalizar roteiro.',
      },
      500
    )
  }
}

export async function GET() {
  return json({
    sucesso: true,
    rota: '/api/roteiros/finalizar',
    metodo: 'POST',
    descricao:
      'Marca roteiro como realizado após a data da experiência, transforma reservas pagas em realizadas, pausa o roteiro e encerra o grupo.',
  })
}
