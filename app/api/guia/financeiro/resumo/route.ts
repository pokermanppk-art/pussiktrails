import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  ''

function json(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    }
  })
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
    String(valor || '')
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

function repasseCancelado(repasse: any) {
  const status = normalizar(repasse?.status)

  return (
    status === 'cancelado' ||
    status === 'cancelada' ||
    status === 'estornado' ||
    status === 'estornada'
  )
}

function valorDoRepasse(repasse: any) {
  return Number(
    repasse?.valor_pago ||
      repasse?.valor_repassado ||
      repasse?.valor ||
      repasse?.valor_total ||
      0
  )
}

function guiaIdDoRepasse(repasse: any) {
  return limparTexto(
    repasse?.guia_id ||
      repasse?.id_guia ||
      repasse?.user_id ||
      repasse?.usuario_id ||
      ''
  )
}

function idsCompatíveis(idA: string, idB: string) {
  const a = limparTexto(idA)
  const b = limparTexto(idB)

  if (!a || !b) return false

  return a === b || a.startsWith(b) || b.startsWith(a)
}

function tituloRoteiro(roteiro: any) {
  return roteiro?.titulo || roteiro?.nome || 'Roteiro'
}

function dataRepasse(repasse: any) {
  return repasse?.data_pagamento || repasse?.created_at || repasse?.updated_at || null
}

async function buscarRoteirosDoGuia(supabase: any, guiaId: string) {
  const campos = ['id_guia', 'guia_id', 'user_id', 'usuario_id']
  const mapa = new Map<string, any>()

  for (const campo of campos) {
    const { data, error } = await supabase
      .from('roteiros')
      .select('*')
      .eq(campo, guiaId)

    if (!error && data) {
      data.forEach((roteiro: any) => {
        if (roteiro?.id) mapa.set(roteiro.id, roteiro)
      })
    }
  }

  return Array.from(mapa.values())
}

async function buscarReservasDoGuia(
  supabase: any,
  guiaId: string,
  roteiros: any[]
) {
  const mapa = new Map<string, any>()
  const roteiroIds = roteiros.map((roteiro) => roteiro.id).filter(Boolean)

  if (roteiroIds.length > 0) {
    const { data } = await supabase
      .from('reservas')
      .select('*')
      .in('roteiro_id', roteiroIds)

    ;(data || []).forEach((reserva: any) => {
      if (reserva?.id) mapa.set(reserva.id, reserva)
    })
  }

  const camposGuiaReserva = ['guia_id', 'id_guia', 'user_id', 'usuario_id']

  for (const campo of camposGuiaReserva) {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq(campo, guiaId)

    if (!error && data) {
      data.forEach((reserva: any) => {
        if (reserva?.id) mapa.set(reserva.id, reserva)
      })
    }
  }

  return Array.from(mapa.values())
}

async function buscarRepassesDoGuia(supabase: any, guiaId: string) {
  const { data, error } = await supabase
    .from('repasses_guias')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message || 'Erro ao buscar repasses_guias.')
  }

  return (data || []).filter((repasse: any) => {
    const idRepasse = guiaIdDoRepasse(repasse)

    return !repasseCancelado(repasse) && idsCompatíveis(idRepasse, guiaId)
  })
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)

    const guiaId = limparTexto(
      searchParams.get('guiaId') ||
        searchParams.get('guia_id') ||
        searchParams.get('id_guia') ||
        ''
    )

    if (!guiaId || !uuidValido(guiaId)) {
      return json(
        {
          sucesso: false,
          erro: 'Guia inválido ou não informado.'
        },
        400
      )
    }

    const { data: guia, error: guiaError } = await supabase
      .from('users')
      .select('*')
      .eq('id', guiaId)
      .maybeSingle()

    if (guiaError) {
      return json(
        {
          sucesso: false,
          erro: guiaError.message || 'Erro ao buscar guia.'
        },
        500
      )
    }

    if (!guia) {
      return json(
        {
          sucesso: false,
          erro: 'Guia não encontrado.'
        },
        404
      )
    }

    const roteiros = await buscarRoteirosDoGuia(supabase, guiaId)
    const reservas = await buscarReservasDoGuia(supabase, guiaId, roteiros)
    const repasses = await buscarRepassesDoGuia(supabase, guiaId)

    const reservasConfirmadas = reservas.filter(pagamentoConfirmado)

    const reservasCompletas = reservasConfirmadas.map((reserva: any) => {
      const roteiro =
        roteiros.find((item: any) => item.id === reserva.roteiro_id) || null

      return {
        ...reserva,
        roteiro,
        roteiro_titulo: tituloRoteiro(roteiro),
        guia_id_real: guiaId
      }
    })

    const receitaBruta = reservasCompletas.reduce(
      (total: number, reserva: any) => total + Number(reserva.valor_total || 0),
      0
    )

    const taxaPercentual = Number(guia?.taxa_plataforma_percentual || 5)
    const taxaPlataforma = receitaBruta * (taxaPercentual / 100)
    const taxaPagHiper = 0

    const valorLiquidoGuia = Math.max(
      0,
      receitaBruta - taxaPlataforma - taxaPagHiper
    )

    const valorPago = repasses.reduce(
      (total: number, repasse: any) => total + valorDoRepasse(repasse),
      0
    )

    const saldoPendente = Math.max(0, valorLiquidoGuia - valorPago)

    return json({
      sucesso: true,
      guia: {
        id: guia.id,
        nome: guia.nome || guia.name || guia.email || 'Guia',
        email: guia.email || null,
        pix_tipo: guia.pix_tipo || null,
        pix_chave: guia.pix_chave || null,
        cadastur: guia.cadastur || null,
        guia_beta: Boolean(guia.guia_beta),
        guia_pioneiro_beta: Boolean(guia.guia_pioneiro_beta),
        beneficio_taxa_beta_ativo: Boolean(guia.beneficio_taxa_beta_ativo),
        taxa_plataforma_percentual: taxaPercentual
      },
      resumo: {
        receita_bruta: receitaBruta,
        taxa_percentual: taxaPercentual,
        taxa_plataforma: taxaPlataforma,
        taxa_paghiper: taxaPagHiper,
        valor_liquido_guia: valorLiquidoGuia,
        valor_pago: valorPago,
        saldo_pendente: saldoPendente,
        reservas_confirmadas: reservasCompletas.length,
        roteiros_total: roteiros.length,
        repasses_total: repasses.length,
        ultimo_pagamento_em: dataRepasse(repasses[0])
      },
      reservas: reservasCompletas,
      repasses,
      debug: {
        guia_id_consultado: guiaId,
        roteiros_encontrados: roteiros.length,
        reservas_encontradas: reservas.length,
        reservas_confirmadas: reservasCompletas.length,
        repasses_encontrados: repasses.length,
        valor_pago_repasses: valorPago,
        saldo_pendente: saldoPendente
      }
    })
  } catch (error: any) {
    console.error('Erro em /api/guia/financeiro/resumo:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao carregar financeiro do guia.'
      },
      500
    )
  }
}