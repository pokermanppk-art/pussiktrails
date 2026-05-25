import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
    valor
  )
}

function pagamentoConfirmado(reserva: any) {
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

function guiaIdDoRoteiro(roteiro: any) {
  return (
    roteiro?.id_guia ||
    roteiro?.guia_id ||
    roteiro?.user_id ||
    roteiro?.usuario_id ||
    ''
  )
}

function tituloRoteiro(roteiro: any) {
  return roteiro?.titulo || roteiro?.nome || 'Roteiro'
}

function nomeUsuario(usuario: any) {
  return usuario?.nome || usuario?.name || usuario?.email || 'Usuário'
}

async function buscarUsuario(supabase: any, userId: string) {
  if (!userId || !uuidValido(userId)) return null

  const { data, error } = await supabase
    .from('users')
    .select('id, nome, name, email, tipo')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.warn('Erro ao buscar usuário:', error)
    return null
  }

  return data || null
}

async function buscarReserva(supabase: any, reservaId: string) {
  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .eq('id', reservaId)
    .maybeSingle()

  if (error) throw error

  return data || null
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

async function buscarAvaliacaoExistente(
  supabase: any,
  params: {
    reservaId: string
    avaliadorId: string
  }
) {
  if (!params.reservaId || !params.avaliadorId) return null

  const { data, error } = await supabase
    .from('avaliacoes')
    .select('*')
    .eq('reserva_id', params.reservaId)
    .eq('avaliador_id', params.avaliadorId)
    .eq('tipo_avaliacao', 'cliente_para_guia')
    .maybeSingle()

  if (error) throw error

  return data || null
}

async function montarDiagnostico(
  supabase: any,
  params: {
    reservaId: string
    clienteId?: string
  }
) {
  const reserva = await buscarReserva(supabase, params.reservaId)

  if (!reserva?.id) {
    return {
      sucesso: false,
      podeAvaliar: false,
      erro: 'Reserva não encontrada.',
      checks: {
        reservaEncontrada: false
      }
    }
  }

  const clienteId = limparTexto(params.clienteId || reserva.cliente_id || '')

  const roteiro = reserva.roteiro_id
    ? await buscarRoteiro(supabase, reserva.roteiro_id)
    : null

  const guiaId = limparTexto(guiaIdDoRoteiro(roteiro))

  const cliente = clienteId
    ? await buscarUsuario(supabase, clienteId)
    : null

  const guia = guiaId
    ? await buscarUsuario(supabase, guiaId)
    : null

  const avaliacao = clienteId
    ? await buscarAvaliacaoExistente(supabase, {
        reservaId: reserva.id,
        avaliadorId: clienteId
      })
    : null

  const reservaPertenceAoCliente =
    !!clienteId &&
    !!reserva.cliente_id &&
    reserva.cliente_id === clienteId

  const pagamentoOk = pagamentoConfirmado(reserva)

  const checks = {
    reservaEncontrada: !!reserva?.id,
    clienteVinculado: !!reserva?.cliente_id,
    clienteInformado: !!clienteId,
    reservaPertenceAoCliente,
    pagamentoConfirmado: pagamentoOk,
    roteiroVinculado: !!reserva?.roteiro_id,
    roteiroEncontrado: !!roteiro?.id,
    guiaVinculado: !!guiaId,
    guiaEncontrado: !!guia?.id,
    avaliacaoExistente: !!avaliacao?.id
  }

  const pendencias = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([chave]) => chave)

  const bloqueios: string[] = []

  if (!checks.clienteInformado) {
    bloqueios.push('Cliente não informado.')
  }

  if (!checks.reservaPertenceAoCliente) {
    bloqueios.push('A reserva não pertence ao cliente informado.')
  }

  if (!checks.pagamentoConfirmado) {
    bloqueios.push('Pagamento ainda não confirmado.')
  }

  if (!checks.roteiroEncontrado) {
    bloqueios.push('Roteiro da reserva não encontrado.')
  }

  if (!checks.guiaVinculado) {
    bloqueios.push('Roteiro sem guia vinculado.')
  }

  if (checks.avaliacaoExistente) {
    bloqueios.push('Esta reserva já foi avaliada por este cliente.')
  }

  const podeAvaliar =
    checks.reservaEncontrada &&
    checks.clienteInformado &&
    checks.reservaPertenceAoCliente &&
    checks.pagamentoConfirmado &&
    checks.roteiroEncontrado &&
    checks.guiaVinculado &&
    !checks.avaliacaoExistente

  return {
    sucesso: true,
    podeAvaliar,
    bloqueios,
    pendencias,
    checks,
    reserva: {
      id: reserva.id,
      cliente_id: reserva.cliente_id || null,
      roteiro_id: reserva.roteiro_id || null,
      status: reserva.status || null,
      pagamento_status: reserva.pagamento_status || null,
      valor_total: reserva.valor_total || null,
      created_at: reserva.created_at || null
    },
    cliente: cliente
      ? {
          id: cliente.id,
          nome: nomeUsuario(cliente),
          email: cliente.email || null,
          tipo: cliente.tipo || null
        }
      : null,
    roteiro: roteiro
      ? {
          id: roteiro.id,
          titulo: tituloRoteiro(roteiro),
          guia_id: guiaId,
          status: roteiro.status || null
        }
      : null,
    guia: guia
      ? {
          id: guia.id,
          nome: nomeUsuario(guia),
          email: guia.email || null
        }
      : null,
    avaliacao: avaliacao
      ? {
          id: avaliacao.id,
          nota: avaliacao.nota || null,
          orientacoes: avaliacao.orientacoes || null,
          seguranca: avaliacao.seguranca || null,
          experiencia: avaliacao.experiencia || null,
          comentario: avaliacao.comentario || null,
          status: avaliacao.status || null,
          created_at: avaliacao.created_at || null
        }
      : null
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

    const clienteId = limparTexto(
      body.clienteId ||
        body.cliente_id ||
        body.avaliadorId ||
        body.avaliador_id
    )

    if (!reservaId || !uuidValido(reservaId)) {
      return json(
        {
          sucesso: false,
          podeAvaliar: false,
          erro: 'Informe uma reserva válida.'
        },
        400
      )
    }

    if (clienteId && !uuidValido(clienteId)) {
      return json(
        {
          sucesso: false,
          podeAvaliar: false,
          erro: 'clienteId inválido.'
        },
        400
      )
    }

    const diagnostico = await montarDiagnostico(supabase, {
      reservaId,
      clienteId
    })

    return json(diagnostico)
  } catch (error: any) {
    console.error('Erro em /api/avaliacoes/diagnostico-reserva:', error)

    return json(
      {
        sucesso: false,
        podeAvaliar: false,
        erro: error?.message || 'Erro interno ao diagnosticar avaliação.'
      },
      500
    )
  }
}

export async function GET() {
  return json({
    sucesso: true,
    rota: '/api/avaliacoes/diagnostico-reserva',
    metodo: 'POST',
    mensagem:
      'Rota ativa. Envie reservaId e, se quiser, clienteId para verificar se a reserva pode ser avaliada.'
  })
}