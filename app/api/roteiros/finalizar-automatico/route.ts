import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const cronSecret = process.env.CRON_SECRET || process.env.ROTEIROS_AUTO_SECRET || ''

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

function erroDeColunaAusente(error: AnyRecord) {
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

function extrairColunaAusente(error: AnyRecord) {
  const textoErro = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ')

  const matchTabelaColuna = textoErro.match(/[a-zA-Z0-9_]+\.([a-zA-Z0-9_]+)/)
  if (matchTabelaColuna?.[1]) return matchTabelaColuna[1]

  const matchColumn = textoErro.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i)
  if (matchColumn?.[1]) return matchColumn[1]

  const matchAspas = textoErro.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  return ''
}

function idRoteiroDaReserva(reserva: AnyRecord) {
  return texto(reserva?.roteiro_id || reserva?.id_roteiro)
}

function dataRoteiro(roteiro: AnyRecord) {
  return (
    roteiro?.embarque_data_hora ||
    roteiro?.proxima_data ||
    roteiro?.data_roteiro ||
    roteiro?.data_trilha ||
    roteiro?.data_saida ||
    roteiro?.embarque_data ||
    roteiro?.data ||
    roteiro?.data_inicio ||
    null
  )
}

function tituloRoteiro(roteiro: AnyRecord) {
  return texto(roteiro?.titulo || roteiro?.nome || roteiro?.name) || 'Roteiro PrussikTrails'
}

function guiaIdDoRoteiro(roteiro: AnyRecord) {
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

function parseDataRoteiro(valor: unknown) {
  const raw = texto(valor)
  if (!raw) return null

  /*
    Quando a data vem apenas como YYYY-MM-DD, consideramos que o roteiro só
    deve ser encerrado automaticamente depois do fim daquele dia.
  */
  const dataOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dataOnly) {
    const data = new Date(`${raw}T23:59:59-03:00`)
    return Number.isNaN(data.getTime()) ? null : data
  }

  const data = new Date(raw)
  if (!Number.isNaN(data.getTime())) return data

  const dataBR = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (dataBR) {
    const dataConvertida = new Date(`${dataBR[3]}-${dataBR[2]}-${dataBR[1]}T23:59:59-03:00`)
    return Number.isNaN(dataConvertida.getTime()) ? null : dataConvertida
  }

  return null
}

function dataJaPassou(roteiro: AnyRecord) {
  const data = parseDataRoteiro(dataRoteiro(roteiro))
  if (!data) return false

  return data.getTime() < Date.now()
}

function roteiroJaEncerrado(roteiro: AnyRecord) {
  const status = normalizar(roteiro?.status)

  return (
    roteiro?.excluido_admin === true ||
    roteiro?.removido_pelo_admin === true ||
    Boolean(roteiro?.excluido_em) ||
    Boolean(roteiro?.removido_em) ||
    status === 'excluido' ||
    status === 'excluido_admin' ||
    status === 'ocultado_admin' ||
    status === 'removido_admin' ||
    status === 'realizado' ||
    status === 'realizada' ||
    status === 'concluido' ||
    status === 'concluida' ||
    status === 'finalizado' ||
    status === 'finalizada' ||
    status === 'encerrado' ||
    status === 'encerrada'
  )
}

function reservaCanceladaOuInvalida(reserva: AnyRecord) {
  const status = normalizar(reserva?.status)
  const pagamento = normalizar(reserva?.pagamento_status)

  return [
    status,
    pagamento,
  ].some((valor) =>
    [
      'cancelada',
      'cancelado',
      'cancelled',
      'canceled',
      'estornada',
      'estornado',
      'reembolsada',
      'reembolsado',
      'recusada',
      'recusado',
      'rejeitada',
      'rejeitado',
      'expirada',
      'expirado',
      'expired',
      'invalidada',
      'invalidado',
    ].includes(valor)
  )
}

function reservaPaga(reserva: AnyRecord) {
  if (reservaCanceladaOuInvalida(reserva)) return false

  const status = normalizar(reserva?.status)
  const pagamento = normalizar(reserva?.pagamento_status)

  return (
    pagamento === 'pago' ||
    pagamento === 'paga' ||
    pagamento === 'confirmado' ||
    pagamento === 'confirmada' ||
    pagamento === 'aprovado' ||
    pagamento === 'aprovada' ||
    pagamento === 'paid' ||
    pagamento === 'approved' ||
    status === 'pago' ||
    status === 'paga' ||
    status === 'confirmado' ||
    status === 'confirmada' ||
    status === 'realizada' ||
    status === 'realizado'
  )
}

async function validarAdminSeNecessario(supabase: any, adminId: string) {
  if (!adminId) return false

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', adminId)
    .maybeSingle()

  if (error) throw error

  return Boolean(data?.id && normalizar(data?.tipo) === 'admin')
}

function autorizacaoCron(request: NextRequest) {
  if (!cronSecret) return false

  const headerSecret = texto(request.headers.get('x-cron-secret') || request.headers.get('authorization')).replace(/^Bearer\s+/i, '')
  const querySecret = texto(request.nextUrl.searchParams.get('secret'))

  return headerSecret === cronSecret || querySecret === cronSecret
}

async function atualizarLinhaComFallback(
  supabase: any,
  tabela: string,
  id: string,
  payloadOriginal: AnyRecord,
  select = '*'
) {
  let payload = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 24; tentativa++) {
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

async function atualizarLinhasPorColunaComFallback(
  supabase: any,
  tabela: string,
  colunaWhere: string,
  valorWhere: string,
  payloadOriginal: AnyRecord
) {
  let payload = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 24; tentativa++) {
    const { data, error } = await supabase
      .from(tabela)
      .update(payload)
      .eq(colunaWhere, valorWhere)
      .select('*')

    if (!error) return data || []

    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)
    if (!coluna || !(coluna in payload)) throw error

    delete payload[coluna]

    if (Object.keys(payload).length === 0) return []
  }

  throw new Error(`Não foi possível atualizar ${tabela}.`)
}

async function inserirMensagemSistema(supabase: any, grupoId: string, mensagem: string) {
  if (!grupoId) return null

  let payload: AnyRecord = {
    grupo_id: grupoId,
    user_id: null,
    mensagem,
    tipo: 'sistema',
    status: 'ativa',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  for (let tentativa = 0; tentativa < 18; tentativa++) {
    const { data, error } = await supabase
      .from('grupo_mensagens')
      .insert(payload)
      .select('*')
      .maybeSingle()

    if (!error) return data || null

    if (!erroDeColunaAusente(error)) {
      console.warn('Aviso ao criar mensagem de sistema:', error)
      return null
    }

    const coluna = extrairColunaAusente(error)
    if (!coluna || !(coluna in payload)) {
      console.warn('Aviso ao criar mensagem de sistema:', error)
      return null
    }

    delete payload[coluna]
  }

  return null
}

async function expirarReservasNaoPagas(supabase: any, reservas: AnyRecord[]) {
  const resultado = {
    tentadas: reservas.length,
    atualizadas: 0,
    erros: [] as string[],
  }

  for (const reserva of reservas) {
    if (!reserva?.id) continue

    /*
      Como ainda não confirmamos o check constraint da coluna status de reservas,
      usamos uma sequência segura. Se algum valor for recusado, tentamos o próximo.
    */
    const tentativas = [
      { status: 'expirada', pagamento_status: 'expirado' },
      { status: 'cancelada', pagamento_status: 'cancelado' },
      { pagamento_status: 'expirado' },
      { pagamento_status: 'cancelado' },
    ]

    let atualizou = false
    let ultimoErro = ''

    for (const payloadBase of tentativas) {
      try {
        await atualizarLinhaComFallback(supabase, 'reservas', String(reserva.id), {
          ...payloadBase,
          updated_at: new Date().toISOString(),
        })

        atualizou = true
        resultado.atualizadas += 1
        break
      } catch (error: any) {
        ultimoErro = error?.message || 'Erro desconhecido.'
      }
    }

    if (!atualizou && ultimoErro) {
      resultado.erros.push(`Reserva ${reserva.id}: ${ultimoErro}`)
    }
  }

  return resultado
}

async function carregarRoteiros(supabase: any, limite: number) {
  const { data, error } = await supabase
    .from('roteiros')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limite)

  if (error) throw error

  return (data || []) as AnyRecord[]
}

async function carregarReservasPorRoteiros(supabase: any, roteiroIds: string[]) {
  if (roteiroIds.length === 0) return [] as AnyRecord[]

  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .in('roteiro_id', roteiroIds)
    .limit(5000)

  if (!error) return (data || []) as AnyRecord[]

  if (!erroDeColunaAusente(error)) throw error

  const { data: dataFallback, error: errorFallback } = await supabase
    .from('reservas')
    .select('*')
    .in('id_roteiro', roteiroIds)
    .limit(5000)

  if (errorFallback) throw errorFallback

  return (dataFallback || []) as AnyRecord[]
}

async function carregarGruposPorRoteiros(supabase: any, roteiroIds: string[]) {
  if (roteiroIds.length === 0) return [] as AnyRecord[]

  const { data, error } = await supabase
    .from('grupos_roteiros')
    .select('*')
    .in('roteiro_id', roteiroIds)
    .limit(3000)

  if (!error) return (data || []) as AnyRecord[]

  if (!erroDeColunaAusente(error)) throw error

  const { data: dataFallback, error: errorFallback } = await supabase
    .from('grupos_roteiros')
    .select('*')
    .in('id_roteiro', roteiroIds)
    .limit(3000)

  if (errorFallback) throw errorFallback

  return (dataFallback || []) as AnyRecord[]
}

async function finalizarAutomaticamente(params: {
  supabase: any
  limite: number
  dryRun: boolean
}) {
  const { supabase, limite, dryRun } = params

  const roteiros = await carregarRoteiros(supabase, limite)
  const candidatos = roteiros.filter((roteiro) => {
    if (!roteiro?.id) return false
    if (roteiroJaEncerrado(roteiro)) return false
    if (!dataJaPassou(roteiro)) return false
    return true
  })

  const roteiroIds = candidatos.map((roteiro) => String(roteiro.id))
  const reservas = await carregarReservasPorRoteiros(supabase, roteiroIds)
  const grupos = await carregarGruposPorRoteiros(supabase, roteiroIds)

  const reservasPorRoteiro = new Map<string, AnyRecord[]>()
  reservas.forEach((reserva) => {
    const roteiroId = idRoteiroDaReserva(reserva)
    if (!roteiroId) return

    const lista = reservasPorRoteiro.get(roteiroId) || []
    lista.push(reserva)
    reservasPorRoteiro.set(roteiroId, lista)
  })

  const gruposPorRoteiro = new Map<string, AnyRecord>()
  grupos.forEach((grupo) => {
    const roteiroId = texto(grupo?.roteiro_id || grupo?.id_roteiro)
    if (roteiroId) gruposPorRoteiro.set(roteiroId, grupo)
  })

  const finalizados: AnyRecord[] = []
  const ignorados: AnyRecord[] = []
  const erros: AnyRecord[] = []

  for (const roteiro of candidatos) {
    const roteiroId = String(roteiro.id)
    const reservasDoRoteiro = reservasPorRoteiro.get(roteiroId) || []
    const reservasPagas = reservasDoRoteiro.filter(reservaPaga)
    const reservasNaoPagas = reservasDoRoteiro.filter((reserva) => !reservaPaga(reserva) && !reservaCanceladaOuInvalida(reserva))

    if (reservasPagas.length > 0) {
      ignorados.push({
        roteiro_id: roteiroId,
        titulo: tituloRoteiro(roteiro),
        motivo: 'Possui reserva paga/confirmada. Deve ser finalizado manualmente pelo guia ou Admin para virar realizado.',
        reservas_total: reservasDoRoteiro.length,
        reservas_pagas: reservasPagas.length,
      })
      continue
    }

    const grupo = gruposPorRoteiro.get(roteiroId) || null

    if (dryRun) {
      finalizados.push({
        dryRun: true,
        roteiro_id: roteiroId,
        titulo: tituloRoteiro(roteiro),
        data: dataRoteiro(roteiro),
        reservas_total: reservasDoRoteiro.length,
        reservas_nao_pagas: reservasNaoPagas.length,
        grupo_id: grupo?.id || null,
      })
      continue
    }

    try {
      const roteiroAtualizado = await atualizarLinhaComFallback(supabase, 'roteiros', roteiroId, {
        status: 'pausado',
        ativo: false,
        finalizado_auto: true,
        finalizado_sem_reservas_pagas: true,
        finalizado_em: new Date().toISOString(),
        motivo_finalizacao: reservasDoRoteiro.length === 0
          ? 'Finalização automática após a data do roteiro sem reservas.'
          : 'Finalização automática após a data do roteiro sem reservas pagas.',
        updated_at: new Date().toISOString(),
      })

      const expiracao = await expirarReservasNaoPagas(supabase, reservasNaoPagas)

      let grupoAtualizado: AnyRecord | null = null
      if (grupo?.id) {
        grupoAtualizado = await atualizarLinhaComFallback(supabase, 'grupos_roteiros', String(grupo.id), {
          status: 'encerrado',
          ativo: false,
          permite_mensagens: false,
          encerrado_em: new Date().toISOString(),
          encerrado_motivo: 'Encerramento automático: roteiro passou da data sem reserva paga.',
          updated_at: new Date().toISOString(),
        })

        await inserirMensagemSistema(
          supabase,
          String(grupo.id),
          `Grupo encerrado automaticamente: o roteiro ${tituloRoteiro(roteiro)} passou da data e não possuía reservas pagas.`
        )
      } else {
        /*
          Se não existe grupo, nada precisa ser criado. O roteiro apenas sai da operação ativa.
        */
      }

      finalizados.push({
        roteiro_id: roteiroId,
        titulo: tituloRoteiro(roteiro),
        guia_id: guiaIdDoRoteiro(roteiro),
        data: dataRoteiro(roteiro),
        reservas_total: reservasDoRoteiro.length,
        reservas_nao_pagas: reservasNaoPagas.length,
        reservas_expiradas: expiracao.atualizadas,
        grupo_id: grupo?.id || null,
        roteiro_status: roteiroAtualizado?.status || 'pausado',
        grupo_status: grupoAtualizado?.status || null,
        avisos_reservas: expiracao.erros,
      })
    } catch (error: any) {
      erros.push({
        roteiro_id: roteiroId,
        titulo: tituloRoteiro(roteiro),
        erro: error?.message || 'Erro desconhecido.',
      })
    }
  }

  return {
    analisados: roteiros.length,
    candidatos: candidatos.length,
    finalizados,
    ignorados,
    erros,
    total_finalizados: finalizados.length,
    total_ignorados: ignorados.length,
    total_erros: erros.length,
    dryRun,
    executado_em: new Date().toISOString(),
  }
}

async function executar(request: NextRequest, bodyData?: AnyRecord) {
  const supabase = getSupabaseAdmin()

  const query = request.nextUrl.searchParams
  const body = bodyData || {}

  const dryRun =
    String(body.dryRun ?? body.dry_run ?? query.get('dryRun') ?? query.get('dry_run') ?? '').toLowerCase() === 'true'

  const limite = Math.min(
    Math.max(Number(body.limite || body.limit || query.get('limite') || query.get('limit') || 1500), 1),
    3000
  )

  const adminId = texto(body.adminId || body.admin_id || query.get('adminId') || query.get('admin_id'))
  const autorizadoPorCron = autorizacaoCron(request)
  const adminValido = adminId ? await validarAdminSeNecessario(supabase, adminId) : false

  /*
    Em desenvolvimento local, caso ainda não tenha CRON_SECRET configurado,
    permitimos execução sem bloqueio. Em produção, configure CRON_SECRET.
  */
  const ambiente = process.env.NODE_ENV || ''
  const execucaoLocal = ambiente !== 'production'

  if (!autorizadoPorCron && !adminValido && !execucaoLocal) {
    return json(
      {
        sucesso: false,
        erro: 'Acesso não autorizado para finalização automática.',
      },
      401
    )
  }

  const resultado = await finalizarAutomaticamente({
    supabase,
    limite,
    dryRun,
  })

  return json({
    sucesso: true,
    mensagem: dryRun
      ? 'Simulação concluída. Nenhum roteiro foi alterado.'
      : 'Finalização automática concluída.',
    ...resultado,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    return await executar(request, body)
  } catch (error: any) {
    console.error('Erro em POST /api/roteiros/finalizar-automatico:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao finalizar roteiros automaticamente.',
      },
      500
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    return await executar(request)
  } catch (error: any) {
    console.error('Erro em GET /api/roteiros/finalizar-automatico:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao finalizar roteiros automaticamente.',
      },
      500
    )
  }
}
