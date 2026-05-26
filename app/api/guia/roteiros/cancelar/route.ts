import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type AnyRecord = Record<string, any>

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

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

function erroColunaAusente(error: any) {
  const mensagem = String(
    error?.message ||
      error?.details ||
      error?.hint ||
      ''
  ).toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    mensagem.includes('column') ||
    mensagem.includes('schema cache') ||
    mensagem.includes('could not find')
  )
}

function extrairColunaAusente(error: any) {
  const mensagem = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')

  const matchAspas = mensagem.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  const matchColumn = mensagem.match(/column\s+([a-zA-Z0-9_]+)/i)
  if (matchColumn?.[1]) return matchColumn[1]

  return ''
}

async function atualizarComFallback(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tabela: string,
  id: string,
  payloadOriginal: AnyRecord
) {
  let payload = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 15; tentativa++) {
    if (Object.keys(payload).length === 0) {
      return null
    }

    const { data, error } = await supabase
      .from(tabela)
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (!error) return data

    if (!erroColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payload)) throw error

    delete payload[coluna]
  }

  throw new Error(`Não foi possível atualizar ${tabela}.`)
}

async function buscarReservasDoRoteiro(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  roteiroId: string
) {
  const colunasPossiveis = ['roteiro_id', 'id_roteiro']
  const todas: AnyRecord[] = []

  for (const coluna of colunasPossiveis) {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq(coluna, roteiroId)
      .limit(500)

    if (error) {
      if (erroColunaAusente(error)) continue
      throw error
    }

    if (data?.length) {
      todas.push(...(data as AnyRecord[]))
    }
  }

  const mapa = new Map<string, AnyRecord>()

  for (const reserva of todas) {
    if (reserva?.id) {
      mapa.set(String(reserva.id), reserva)
    }
  }

  return Array.from(mapa.values())
}

function reservaCancelavel(reserva: AnyRecord) {
  const status = normalizar(reserva.status)
  const pagamentoStatus = normalizar(reserva.pagamento_status)

  if (status === 'cancelada' || status === 'cancelado') return false
  if (status === 'realizada' || status === 'realizado') return false

  return (
    pagamentoStatus === 'pago' ||
    pagamentoStatus === 'confirmado' ||
    status === 'confirmada' ||
    status === 'confirmado' ||
    status === 'pendente' ||
    status === 'aguardando_pagamento'
  )
}

function calcularValorReserva(reserva: AnyRecord, roteiro: AnyRecord) {
  const quantidade = Math.max(
    1,
    numero(reserva.quantidade_pessoas) || numero(reserva.pessoas) || 1
  )

  const valor =
    numero(reserva.valor_total) ||
    numero(reserva.valor_pago) ||
    numero(reserva.valor) ||
    numero(reserva.total) ||
    numero(roteiro.preco) * quantidade

  return Number(valor.toFixed(2))
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()

    const roteiroId = texto(body.roteiroId || body.roteiro_id)
    const guiaId = texto(body.guiaId || body.guia_id || body.userId || body.user_id)
    const motivoCodigo = texto(body.motivoCodigo || body.motivo_codigo)
    const motivoDescricao = texto(
      body.motivoDescricao || body.motivo_descricao || body.motivo
    )
    const observacaoGuia = texto(body.observacao || body.observacao_guia)

    if (!roteiroId) {
      return NextResponse.json(
        { sucesso: false, erro: 'roteiroId é obrigatório.' },
        { status: 400 }
      )
    }

    if (!guiaId) {
      return NextResponse.json(
        { sucesso: false, erro: 'guiaId é obrigatório.' },
        { status: 400 }
      )
    }

    if (!motivoDescricao) {
      return NextResponse.json(
        { sucesso: false, erro: 'Informe o motivo do cancelamento.' },
        { status: 400 }
      )
    }

    const { data: roteiro, error: roteiroError } = await supabase
      .from('roteiros')
      .select('*')
      .eq('id', roteiroId)
      .maybeSingle()

    if (roteiroError) throw roteiroError

    if (!roteiro) {
      return NextResponse.json(
        { sucesso: false, erro: 'Roteiro não encontrado.' },
        { status: 404 }
      )
    }

    const donoRoteiro = primeiroId(
      roteiro.id_guia,
      roteiro.guia_id,
      roteiro.user_id,
      roteiro.usuario_id,
      roteiro.criador_id,
      roteiro.created_by
    )

    if (donoRoteiro && donoRoteiro !== guiaId) {
      return NextResponse.json(
        { sucesso: false, erro: 'Este roteiro não pertence ao guia logado.' },
        { status: 403 }
      )
    }

    const reservas = await buscarReservasDoRoteiro(supabase, roteiroId)
    const reservasCancelaveis = reservas.filter(reservaCancelavel)

    const resultados: Array<{
      reservaId: string
      clienteId: string
      valorCreditado: number
      movimentacaoId: string | null
      cancelada: boolean
      erro?: string
    }> = []

    for (const reserva of reservasCancelaveis) {
      try {
        const clienteId = primeiroId(
          reserva.cliente_id,
          reserva.usuario_id,
          reserva.user_id
        )

        if (!clienteId) {
          resultados.push({
            reservaId: String(reserva.id),
            clienteId: '',
            valorCreditado: 0,
            movimentacaoId: null,
            cancelada: false,
            erro: 'Cliente não identificado na reserva.',
          })
          continue
        }

        const valorOriginal = calcularValorReserva(reserva, roteiro)
        let movimentacaoId: string | null = null

        if (valorOriginal > 0) {
          const { data: movId, error: rpcError } = await supabase.rpc(
            'creditar_saldo_cliente',
            {
              p_cliente_id: clienteId,
              p_valor: valorOriginal,
              p_tipo: 'credito_cancelamento_guia',
              p_origem: 'guia',
              p_descricao:
                'Crédito integral gerado por cancelamento do roteiro pelo guia.',
              p_motivo: motivoDescricao,
              p_reserva_id: reserva.id,
              p_roteiro_id: roteiroId,
              p_guia_id: guiaId,
              p_criado_por_id: guiaId,
            }
          )

          if (rpcError) throw rpcError

          movimentacaoId = movId || null
        }

        const { data: cancelamento, error: cancelamentoError } = await supabase
          .from('reserva_cancelamentos')
          .insert({
            reserva_id: reserva.id,
            cliente_id: clienteId,
            roteiro_id: roteiroId,
            guia_id: guiaId,
            cancelado_por_tipo: 'guia',
            cancelado_por_id: guiaId,
            motivo_codigo: motivoCodigo || 'guia_cancelou_roteiro',
            motivo_descricao: motivoDescricao,
            valor_original: valorOriginal,
            valor_creditado: valorOriginal,
            valor_retido_plataforma: 0,
            valor_retido_guia: 0,
            percentual_credito: 100,
            percentual_retencao_plataforma: 0,
            status: 'processado',
            saldo_movimentacao_id: movimentacaoId,
            observacao_guia: observacaoGuia || null,
            updated_at: new Date().toISOString(),
          })
          .select('*')
          .maybeSingle()

        if (cancelamentoError) throw cancelamentoError

        await atualizarComFallback(supabase, 'reservas', reserva.id, {
          status: 'cancelada',
          cancelado_por_tipo: 'guia',
          cancelado_por_id: guiaId,
          cancelamento_motivo: motivoDescricao,
          cancelamento_motivo_codigo: motivoCodigo || 'guia_cancelou_roteiro',
          cancelado_em: new Date().toISOString(),
          saldo_creditado: valorOriginal,
          taxa_cancelamento_plataforma: 0,
          saldo_movimentacao_id: movimentacaoId,
          updated_at: new Date().toISOString(),
        })

        resultados.push({
          reservaId: String(reserva.id),
          clienteId,
          valorCreditado: valorOriginal,
          movimentacaoId,
          cancelada: Boolean(cancelamento),
        })
      } catch (error) {
        resultados.push({
          reservaId: String(reserva.id || ''),
          clienteId: String(reserva.cliente_id || ''),
          valorCreditado: 0,
          movimentacaoId: null,
          cancelada: false,
          erro:
            error instanceof Error
              ? error.message
              : 'Erro ao cancelar reserva vinculada.',
        })
      }
    }

    const roteiroAtualizado = await atualizarComFallback(
      supabase,
      'roteiros',
      roteiroId,
      {
        status: 'cancelado',
        cancelado_por_tipo: 'guia',
        cancelado_por_id: guiaId,
        cancelamento_motivo_codigo: motivoCodigo || 'guia_cancelou_roteiro',
        cancelamento_motivo: motivoDescricao,
        cancelado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    )

    return NextResponse.json({
      sucesso: true,
      roteiro: roteiroAtualizado,
      reservasEncontradas: reservas.length,
      reservasCanceladas: resultados.filter((item) => item.cancelada).length,
      totalCreditado: resultados.reduce(
        (acc, item) => acc + Number(item.valorCreditado || 0),
        0
      ),
      resultados,
    })
  } catch (error) {
    console.error('Erro em /api/guia/roteiros/cancelar:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao cancelar roteiro pelo guia.',
      },
      { status: 500 }
    )
  }
}