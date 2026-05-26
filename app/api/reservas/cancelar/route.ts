import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type AnyRecord = Record<string, any>

type PoliticaCalculada = {
  codigo: string
  percentualCredito: number
  percentualRetencaoPlataforma: number
  titulo: string
}

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Variáveis de ambiente do Supabase não configuradas.')
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

function idOuNull(valor: unknown) {
  const id = texto(valor)
  return id || null
}

function numero(valor: unknown) {
  const n = Number(valor || 0)
  return Number.isFinite(n) ? n : 0
}

function primeiroId(...valores: unknown[]) {
  for (const valor of valores) {
    const id = texto(valor)
    if (id) return id
  }

  return ''
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function extrairDataRoteiro(roteiro: AnyRecord) {
  const candidatos = [
    roteiro.data_inicio,
    roteiro.data_fim,
    roteiro.data_final,
    roteiro.data_trilha,
    roteiro.data_roteiro,
    roteiro.embarque_data_hora,
    roteiro.data,
  ]

  for (const candidato of candidatos) {
    if (!candidato) continue

    const data = new Date(String(candidato))

    if (!Number.isNaN(data.getTime())) return data
  }

  return null
}

function diferencaHorasAte(data: Date | null) {
  if (!data) return null

  return (data.getTime() - Date.now()) / (1000 * 60 * 60)
}

function calcularPolitica(params: {
  canceladoPorTipo: string
  dataRoteiro: Date | null
  arrependimentoLegal?: boolean
  percentualCreditoManual?: number | null
}): PoliticaCalculada {
  const tipo = normalizar(params.canceladoPorTipo)

  if (typeof params.percentualCreditoManual === 'number') {
    const credito = Math.max(0, Math.min(100, params.percentualCreditoManual))

    return {
      codigo: 'admin_percentual_manual',
      percentualCredito: credito,
      percentualRetencaoPlataforma: 100 - credito,
      titulo: 'Percentual definido pelo administrador',
    }
  }

  if (tipo === 'guia' || tipo === 'admin' || tipo === 'sistema') {
    return {
      codigo:
        tipo === 'guia'
          ? 'guia_cancela_100_credito'
          : 'admin_cancela_100_credito',
      percentualCredito: 100,
      percentualRetencaoPlataforma: 0,
      titulo:
        tipo === 'guia'
          ? 'Cancelamento pelo guia'
          : 'Cancelamento administrativo',
    }
  }

  if (params.arrependimentoLegal) {
    return {
      codigo: 'cliente_arrependimento_legal',
      percentualCredito: 100,
      percentualRetencaoPlataforma: 0,
      titulo: 'Arrependimento legal',
    }
  }

  const horas = diferencaHorasAte(params.dataRoteiro)

  if (horas === null) {
    return {
      codigo: 'cliente_analise_admin',
      percentualCredito: 0,
      percentualRetencaoPlataforma: 0,
      titulo: 'Cancelamento pendente de análise administrativa',
    }
  }

  const dias = horas / 24

  if (dias >= 7) {
    return {
      codigo: 'cliente_7_dias_ou_mais',
      percentualCredito: 90,
      percentualRetencaoPlataforma: 10,
      titulo: 'Cliente cancela com 7 dias ou mais',
    }
  }

  if (dias >= 3) {
    return {
      codigo: 'cliente_3_a_6_dias',
      percentualCredito: 70,
      percentualRetencaoPlataforma: 30,
      titulo: 'Cliente cancela entre 3 e 6 dias',
    }
  }

  if (horas >= 24) {
    return {
      codigo: 'cliente_24h_a_72h',
      percentualCredito: 50,
      percentualRetencaoPlataforma: 50,
      titulo: 'Cliente cancela entre 24h e 72h',
    }
  }

  return {
    codigo: 'cliente_menos_24h_no_show',
    percentualCredito: 0,
    percentualRetencaoPlataforma: 100,
    titulo: 'Menos de 24h ou não comparecimento',
  }
}

async function atualizarReserva(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  reservaId: string,
  payload: AnyRecord
) {
  const { data, error } = await supabase
    .from('reservas')
    .update(payload)
    .eq('id', reservaId)
    .select('*')
    .maybeSingle()

  if (error) throw error

  return data
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()

    const reservaId = texto(body.reservaId || body.reserva_id)
    const canceladoPorTipo = normalizar(
      body.canceladoPorTipo || body.cancelado_por_tipo || 'cliente'
    )
    const canceladoPorId = idOuNull(
      body.canceladoPorId ||
        body.cancelado_por_id ||
        body.usuarioId ||
        body.usuario_id
    )
    const motivoDescricao = texto(
      body.motivoDescricao || body.motivo_descricao || body.motivo
    )
    const motivoCodigoInformado = texto(body.motivoCodigo || body.motivo_codigo)
    const observacao = texto(
      body.observacao ||
        body.observacao_admin ||
        body.observacao_guia ||
        body.observacao_cliente
    )
    const percentualCreditoManual =
      body.percentualCredito !== undefined ? numero(body.percentualCredito) : null

    const arrependimentoLegal = Boolean(
      body.arrependimentoLegal || body.arrependimento_legal
    )

    if (!reservaId) {
      return NextResponse.json(
        { sucesso: false, erro: 'reservaId é obrigatório.' },
        { status: 400 }
      )
    }

    if (!['guia', 'cliente', 'admin', 'sistema'].includes(canceladoPorTipo)) {
      return NextResponse.json(
        { sucesso: false, erro: 'canceladoPorTipo inválido.' },
        { status: 400 }
      )
    }

    if (!motivoDescricao) {
      return NextResponse.json(
        { sucesso: false, erro: 'Informe o motivo do cancelamento.' },
        { status: 400 }
      )
    }

    const { data: reserva, error: reservaError } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', reservaId)
      .maybeSingle()

    if (reservaError) throw reservaError

    if (!reserva) {
      return NextResponse.json(
        { sucesso: false, erro: 'Reserva não encontrada.' },
        { status: 404 }
      )
    }

    const statusAtual = normalizar(reserva.status)

    if (statusAtual === 'cancelada' || statusAtual === 'cancelado') {
      return NextResponse.json(
        { sucesso: false, erro: 'Esta reserva já está cancelada.' },
        { status: 409 }
      )
    }

    const clienteId = primeiroId(
      reserva.cliente_id,
      reserva.usuario_id,
      reserva.user_id,
      body.clienteId,
      body.cliente_id
    )

    const roteiroId = primeiroId(
      reserva.roteiro_id,
      reserva.id_roteiro,
      body.roteiroId,
      body.roteiro_id
    )

    let roteiro: AnyRecord | null = null

    if (roteiroId) {
      const { data } = await supabase
        .from('roteiros')
        .select('*')
        .eq('id', roteiroId)
        .maybeSingle()

      roteiro = data || null
    }

    const guiaId = primeiroId(
      reserva.guia_id,
      reserva.id_guia,
      roteiro?.guia_id,
      roteiro?.id_guia,
      roteiro?.user_id,
      roteiro?.usuario_id,
      body.guiaId,
      body.guia_id
    )

    if (!clienteId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Não foi possível identificar o cliente da reserva.',
        },
        { status: 400 }
      )
    }

    const valorOriginal =
      numero(reserva.valor_total) ||
      numero(reserva.valor_pago) ||
      numero(reserva.valor) ||
      numero(reserva.total) ||
      numero(roteiro?.preco) *
        Math.max(1, numero(reserva.quantidade_pessoas) || 1)

    const politica = calcularPolitica({
      canceladoPorTipo,
      dataRoteiro: extrairDataRoteiro(roteiro || {}),
      arrependimentoLegal,
      percentualCreditoManual,
    })

    const valorCreditado = Number(
      ((valorOriginal * politica.percentualCredito) / 100).toFixed(2)
    )

    const valorRetidoPlataforma = Number(
      ((valorOriginal * politica.percentualRetencaoPlataforma) / 100).toFixed(2)
    )

    let movimentacaoId: string | null = null

    if (valorCreditado > 0) {
      const tipoCredito =
        canceladoPorTipo === 'guia'
          ? 'credito_cancelamento_guia'
          : politica.codigo === 'cliente_arrependimento_legal'
            ? 'credito_arrependimento'
            : 'credito_cancelamento_cliente'

      const { data: movId, error: rpcError } = await supabase.rpc(
        'creditar_saldo_cliente',
        {
          p_cliente_id: clienteId,
          p_valor: valorCreditado,
          p_tipo: tipoCredito,
          p_origem: canceladoPorTipo,
          p_descricao: `Crédito gerado por cancelamento de reserva. Política: ${politica.titulo}.`,
          p_motivo: motivoDescricao,
          p_reserva_id: reservaId,
          p_roteiro_id: roteiroId || null,
          p_guia_id: guiaId || null,
          p_criado_por_id: canceladoPorId,
        }
      )

      if (rpcError) throw rpcError

      movimentacaoId = movId || null
    }

    const { data: cancelamento, error: cancelamentoError } = await supabase
      .from('reserva_cancelamentos')
      .insert({
        reserva_id: reservaId,
        cliente_id: clienteId,
        roteiro_id: roteiroId || null,
        guia_id: guiaId || null,
        cancelado_por_tipo: canceladoPorTipo,
        cancelado_por_id: canceladoPorId,
        motivo_codigo: motivoCodigoInformado || politica.codigo,
        motivo_descricao: motivoDescricao,
        valor_original: valorOriginal,
        valor_creditado: valorCreditado,
        valor_retido_plataforma: valorRetidoPlataforma,
        valor_retido_guia: 0,
        percentual_credito: politica.percentualCredito,
        percentual_retencao_plataforma: politica.percentualRetencaoPlataforma,
        status: 'processado',
        saldo_movimentacao_id: movimentacaoId,
        observacao_admin: canceladoPorTipo === 'admin' ? observacao : null,
        observacao_guia: canceladoPorTipo === 'guia' ? observacao : null,
        observacao_cliente: canceladoPorTipo === 'cliente' ? observacao : null,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .maybeSingle()

    if (cancelamentoError) throw cancelamentoError

    const reservaAtualizada = await atualizarReserva(supabase, reservaId, {
      status: 'cancelada',
      cancelado_por_tipo: canceladoPorTipo,
      cancelado_por_id: canceladoPorId,
      cancelamento_motivo: motivoDescricao,
      cancelamento_motivo_codigo: motivoCodigoInformado || politica.codigo,
      cancelado_em: new Date().toISOString(),
      saldo_creditado: valorCreditado,
      taxa_cancelamento_plataforma: valorRetidoPlataforma,
      saldo_movimentacao_id: movimentacaoId,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({
      sucesso: true,
      reserva: reservaAtualizada,
      cancelamento,
      saldoCreditado: valorCreditado,
      valorRetidoPlataforma,
      politica,
    })
  } catch (error) {
    console.error('Erro em POST /api/reservas/cancelar:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao cancelar reserva.',
      },
      { status: 500 }
    )
  }
}