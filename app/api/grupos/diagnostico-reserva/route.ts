import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

function json(data: any, status = 200) {
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

function limparTexto(valor: any) {
  return String(valor || '').trim()
}

function normalizar(valor: any) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function uuidValido(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor
  )
}

function removerPrefixoReserva(orderId: string) {
  return limparTexto(orderId).replace(/^RESERVA-/i, '')
}

function garantirPrefixoReserva(valor: string) {
  const limpo = limparTexto(valor)

  if (!limpo) return ''

  if (/^RESERVA-/i.test(limpo)) return limpo

  return `RESERVA-${limpo}`
}

function candidatosOrderId(valor: string) {
  const limpo = limparTexto(valor)
  const semPrefixo = removerPrefixoReserva(limpo)
  const comPrefixo = garantirPrefixoReserva(semPrefixo || limpo)

  return Array.from(
    new Set(
      [limpo, semPrefixo, comPrefixo]
        .map((item) => limparTexto(item))
        .filter(Boolean)
    )
  )
}

function pagamentoEstaConfirmado(reserva: any) {
  const pagamento = normalizar(reserva?.pagamento_status)
  const status = normalizar(reserva?.status)

  return (
    pagamento === 'pago' ||
    pagamento === 'confirmado' ||
    pagamento === 'aprovado' ||
    pagamento === 'paid' ||
    pagamento === 'approved' ||
    status === 'confirmada' ||
    status === 'realizada' ||
    status === 'pago' ||
    status === 'paga'
  )
}

function tituloDoRoteiro(roteiro: any) {
  return roteiro?.titulo || roteiro?.nome || roteiro?.name || 'Roteiro'
}

function guiaIdDoRoteiro(roteiro: any) {
  return (
    roteiro?.id_guia ||
    roteiro?.guia_id ||
    roteiro?.user_id ||
    roteiro?.usuario_id ||
    ''
  )
}

async function buscarReserva(
  supabase: any,
  params: {
    reservaId?: string
    orderId?: string
    transactionId?: string
  }
) {
  const reservaId = limparTexto(params.reservaId || '')
  const orderId = limparTexto(params.orderId || '')
  const transactionId = limparTexto(params.transactionId || '')

  if (reservaId && uuidValido(reservaId)) {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', reservaId)
      .maybeSingle()

    if (error) throw error
    if (data?.id) return data
  }

  if (transactionId) {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!error && data?.[0]?.id) return data[0]
  }

  if (orderId) {
    const candidatos = candidatosOrderId(orderId)

    for (const candidato of candidatos) {
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .eq('order_id', candidato)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!error && data?.[0]?.id) return data[0]
    }

    const semPrefixo = removerPrefixoReserva(orderId)

    if (uuidValido(semPrefixo)) {
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .eq('id', semPrefixo)
        .maybeSingle()

      if (!error && data?.id) return data
    }
  }

  return null
}

async function buscarRoteiro(supabase: any, roteiroId: string) {
  if (!roteiroId) return null

  const { data, error } = await supabase
    .from('roteiros')
    .select('*')
    .eq('id', roteiroId)
    .maybeSingle()

  if (error) throw error

  return data || null
}

async function buscarGrupoPorRoteiro(supabase: any, roteiroId: string) {
  if (!roteiroId) return null

  const { data, error } = await supabase
    .from('grupos_roteiros')
    .select('*')
    .eq('roteiro_id', roteiroId)
    .maybeSingle()

  if (error) throw error

  return data || null
}

async function buscarMembro(
  supabase: any,
  params: {
    grupoId: string
    userId: string
  }
) {
  if (!params.grupoId || !params.userId) return null

  const { data, error } = await supabase
    .from('grupo_membros')
    .select('*')
    .eq('grupo_id', params.grupoId)
    .eq('user_id', params.userId)
    .maybeSingle()

  if (error) throw error

  return data || null
}

async function buscarMensagensDoGrupo(supabase: any, grupoId: string) {
  if (!grupoId) return []

  const { data, error } = await supabase
    .from('grupo_mensagens')
    .select('*')
    .eq('grupo_id', grupoId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.warn('Erro ao buscar mensagens do grupo:', error)
    return []
  }

  return data || []
}

async function buscarNotificacoes(
  supabase: any,
  params: {
    grupoId: string
    guiaId: string
    reservaId: string
  }
) {
  if (!params.grupoId || !params.guiaId) return []

  let query = supabase
    .from('grupo_notificacoes')
    .select('*')
    .eq('grupo_id', params.grupoId)
    .eq('user_id_destino', params.guiaId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (params.reservaId) {
    query = query.eq('reserva_id', params.reservaId)
  }

  const { data, error } = await query

  if (error) {
    console.warn('Erro ao buscar notificações:', error)
    return []
  }

  return data || []
}

async function liberarGrupoDaReserva(
  request: NextRequest,
  reservaId: string
) {
  const baseUrl = appUrl || request.nextUrl.origin

  try {
    const response = await fetch(`${baseUrl}/api/grupos/garantir-acesso`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reservaId
      }),
      cache: 'no-store'
    })

    const data = await response.json().catch(() => null)

    if (!response.ok || !data?.sucesso) {
      return {
        sucesso: false,
        erro: data?.erro || data?.message || 'Não foi possível garantir acesso ao grupo.',
        data
      }
    }

    return {
      sucesso: true,
      grupoId: data?.grupo?.id || null,
      redirectUrl: data?.redirectUrl || null,
      data
    }
  } catch (error: any) {
    return {
      sucesso: false,
      erro: error?.message || 'Erro ao chamar garantir-acesso.',
      data: null
    }
  }
}

async function montarDiagnostico(
  request: NextRequest,
  supabase: any,
  reserva: any,
  corrigir: boolean
) {
  const pagamentoConfirmado = pagamentoEstaConfirmado(reserva)

  let roteiro = null
  let grupo = null
  let guiaAdmin = null
  let clienteMembro = null
  let mensagens: any[] = []
  let notificacoes: any[] = []
  let correcao: any = null

  if (reserva?.roteiro_id) {
    roteiro = await buscarRoteiro(supabase, reserva.roteiro_id)
  }

  const guiaId = limparTexto(guiaIdDoRoteiro(roteiro))

  if (roteiro?.id) {
    grupo = await buscarGrupoPorRoteiro(supabase, roteiro.id)
  }

  if (corrigir && pagamentoConfirmado && reserva?.id) {
    correcao = await liberarGrupoDaReserva(request, reserva.id)

    if (correcao?.sucesso && roteiro?.id) {
      grupo = await buscarGrupoPorRoteiro(supabase, roteiro.id)
    }
  }

  if (grupo?.id && guiaId) {
    guiaAdmin = await buscarMembro(supabase, {
      grupoId: grupo.id,
      userId: guiaId
    })
  }

  if (grupo?.id && reserva?.cliente_id) {
    clienteMembro = await buscarMembro(supabase, {
      grupoId: grupo.id,
      userId: reserva.cliente_id
    })
  }

  if (grupo?.id) {
    mensagens = await buscarMensagensDoGrupo(supabase, grupo.id)

    notificacoes = await buscarNotificacoes(supabase, {
      grupoId: grupo.id,
      guiaId,
      reservaId: reserva.id
    })
  }

  const checks = {
    reservaEncontrada: !!reserva?.id,
    pagamentoConfirmado,
    roteiroEncontrado: !!roteiro?.id,
    guiaVinculadoAoRoteiro: !!guiaId,
    grupoEncontrado: !!grupo?.id,
    guiaAdminNoGrupo:
      !!guiaAdmin?.id &&
      guiaAdmin?.papel === 'guia_admin' &&
      guiaAdmin?.status === 'ativo',
    clienteMembroNoGrupo:
      !!clienteMembro?.id &&
      clienteMembro?.papel === 'cliente' &&
      clienteMembro?.status === 'ativo',
    notificacaoGuiaCriada: notificacoes.length > 0,
    mensagensDoGrupo: mensagens.length > 0
  }

  const pendencias = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([nome]) => nome)

  const pronto =
    checks.reservaEncontrada &&
    checks.pagamentoConfirmado &&
    checks.roteiroEncontrado &&
    checks.guiaVinculadoAoRoteiro &&
    checks.grupoEncontrado &&
    checks.guiaAdminNoGrupo &&
    checks.clienteMembroNoGrupo

  return {
    sucesso: true,
    pronto,
    corrigir,
    pendencias,
    checks,
    reserva: {
      id: reserva.id,
      cliente_id: reserva.cliente_id || null,
      roteiro_id: reserva.roteiro_id || null,
      status: reserva.status || null,
      pagamento_status: reserva.pagamento_status || null,
      order_id: reserva.order_id || null,
      transaction_id: reserva.transaction_id || null,
      valor_total: reserva.valor_total || null
    },
    roteiro: roteiro
      ? {
          id: roteiro.id,
          titulo: tituloDoRoteiro(roteiro),
          guia_id: guiaId,
          status: roteiro.status || null
        }
      : null,
    grupo: grupo
      ? {
          id: grupo.id,
          titulo: grupo.titulo || null,
          roteiro_id: grupo.roteiro_id || null,
          guia_id: grupo.guia_id || null,
          status: grupo.status || null,
          aviso_fixado: grupo.aviso_fixado || null
        }
      : null,
    membros: {
      guiaAdmin: guiaAdmin
        ? {
            id: guiaAdmin.id,
            user_id: guiaAdmin.user_id,
            papel: guiaAdmin.papel,
            status: guiaAdmin.status
          }
        : null,
      cliente: clienteMembro
        ? {
            id: clienteMembro.id,
            user_id: clienteMembro.user_id,
            reserva_id: clienteMembro.reserva_id,
            papel: clienteMembro.papel,
            status: clienteMembro.status
          }
        : null
    },
    notificacoes: notificacoes.map((item) => ({
      id: item.id,
      titulo: item.titulo,
      tipo: item.tipo,
      lida: item.lida,
      created_at: item.created_at
    })),
    ultimasMensagens: mensagens.map((item) => ({
      id: item.id,
      tipo: item.tipo,
      mensagem: item.mensagem,
      created_at: item.created_at
    })),
    correcao
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const reservaId = limparTexto(
      body.reservaId ||
        body.reserva_id ||
        body.id_reserva ||
        body.id
    )

    const orderId = limparTexto(
      body.orderId ||
        body.order_id ||
        body.order
    )

    const transactionId = limparTexto(
      body.transactionId ||
        body.transaction_id ||
        body.transaction
    )

    const corrigir = Boolean(body.corrigir || body.corrigirGrupo)

    if (!reservaId && !orderId && !transactionId) {
      return json(
        {
          sucesso: false,
          erro: 'Informe reservaId, orderId ou transactionId.'
        },
        400
      )
    }

    const reserva = await buscarReserva(supabase, {
      reservaId,
      orderId,
      transactionId
    })

    if (!reserva?.id) {
      return json(
        {
          sucesso: false,
          erro: 'Reserva não encontrada para os identificadores informados.',
          identificadores: {
            reservaId: reservaId || null,
            orderId: orderId || null,
            transactionId: transactionId || null
          }
        },
        404
      )
    }

    const diagnostico = await montarDiagnostico(
      request,
      supabase,
      reserva,
      corrigir
    )

    return json(diagnostico)
  } catch (error: any) {
    console.error('Erro em /api/grupos/diagnostico-reserva:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao diagnosticar reserva/grupo.'
      },
      500
    )
  }
}

export async function GET() {
  return json({
    sucesso: true,
    rota: '/api/grupos/diagnostico-reserva',
    metodo: 'POST',
    mensagem:
      'Rota ativa. Envie reservaId, orderId ou transactionId. Use corrigir=true para tentar liberar o grupo se a reserva já estiver paga.'
  })
}