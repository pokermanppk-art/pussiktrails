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
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0'
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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(valor || '')
  )
}

function numeroSeguro(valor: any) {
  const numero = Number(valor || 0)

  if (!Number.isFinite(numero)) return 0

  return numero
}

function arredondarMoeda(valor: any) {
  return Math.round(numeroSeguro(valor) * 100) / 100
}

function emCentavos(valor: any) {
  return Math.round(numeroSeguro(valor) * 100)
}

function deCentavos(valor: any) {
  return Math.round(numeroSeguro(valor)) / 100
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
  return numeroSeguro(
    repasse?.valor_pago ??
      repasse?.valor_repasse ??
      repasse?.valor_repassado ??
      repasse?.valor ??
      repasse?.valor_total ??
      0
  )
}

function guiaIdDoRepasse(repasse: any) {
  return limparTexto(
    repasse?.guia_id ||
      repasse?.id_guia ||
      repasse?.user_id ||
      repasse?.usuario_id ||
      repasse?.guiaId ||
      ''
  )
}

function idsCompativeis(idRepasse: string, guiaId: string) {
  const repasse = limparTexto(idRepasse).toLowerCase()
  const guia = limparTexto(guiaId).toLowerCase()

  if (!repasse || !guia) return false

  if (repasse === guia) return true

  if (repasse.startsWith(guia) || guia.startsWith(repasse)) return true

  if (repasse.includes(guia) || guia.includes(repasse)) return true

  const prefixoGuia = guia.slice(0, 8)
  const prefixoRepasse = repasse.slice(0, 8)

  if (prefixoGuia && prefixoRepasse && prefixoGuia === prefixoRepasse) {
    return true
  }

  return false
}

function tituloRoteiro(roteiro: any) {
  return roteiro?.titulo || roteiro?.nome || 'Roteiro'
}

function dataRepasse(repasse: any) {
  return repasse?.data_pagamento || repasse?.created_at || repasse?.updated_at || null
}

async function buscarGuia(supabase: any, guiaId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', guiaId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || 'Erro ao buscar guia.')
  }

  return data || null
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
        if (roteiro?.id) {
          mapa.set(roteiro.id, roteiro)
        }
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
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .in('roteiro_id', roteiroIds)

    if (!error && data) {
      data.forEach((reserva: any) => {
        if (reserva?.id) {
          mapa.set(reserva.id, reserva)
        }
      })
    }
  }

  const camposGuiaReserva = ['guia_id', 'id_guia', 'user_id', 'usuario_id']

  for (const campo of camposGuiaReserva) {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq(campo, guiaId)

    if (!error && data) {
      data.forEach((reserva: any) => {
        if (reserva?.id) {
          mapa.set(reserva.id, reserva)
        }
      })
    }
  }

  return Array.from(mapa.values())
}

async function buscarRepassesDoGuia(supabase: any, guiaId: string) {
  const mapa = new Map<string, any>()

  const consultas = [
    supabase
      .from('repasses_guias')
      .select('*')
      .eq('guia_id', guiaId)
      .order('created_at', { ascending: false }),

    supabase
      .from('repasses_guias')
      .select('*')
      .eq('id_guia', guiaId)
      .order('created_at', { ascending: false })
  ]

  for (const consulta of consultas) {
    const { data, error } = await consulta

    if (!error && data) {
      data.forEach((repasse: any) => {
        if (repasse?.id) {
          mapa.set(repasse.id, repasse)
        }
      })
    }
  }

  if (mapa.size === 0) {
    const { data, error } = await supabase
      .from('repasses_guias')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message || 'Erro ao buscar repasses_guias.')
    }

    ;(data || []).forEach((repasse: any) => {
      if (!repasse?.id) return

      const idRepasse = guiaIdDoRepasse(repasse)

      if (idsCompativeis(idRepasse, guiaId)) {
        mapa.set(repasse.id, repasse)
      }
    })
  }

  return Array.from(mapa.values()).filter((repasse) => !repasseCancelado(repasse))
}

function montarReservasCompletas(
  reservasConfirmadas: any[],
  roteiros: any[],
  guiaId: string
) {
  return reservasConfirmadas.map((reserva) => {
    const roteiro = roteiros.find((item) => item.id === reserva.roteiro_id) || null

    return {
      ...reserva,
      roteiro,
      roteiro_titulo: tituloRoteiro(roteiro),
      guia_id_real: guiaId
    }
  })
}

function calcularResumoFinanceiro(guia: any, reservasCompletas: any[], repasses: any[]) {
  const receitaBruta = arredondarMoeda(
    reservasCompletas.reduce(
      (total: number, reserva: any) => total + numeroSeguro(reserva.valor_total),
      0
    )
  )

  const taxaPercentual = numeroSeguro(guia?.taxa_plataforma_percentual || 5)

  const taxaPlataforma = arredondarMoeda(
    receitaBruta * (taxaPercentual / 100)
  )

  const taxaPagHiper = 0

  const valorLiquidoGuia = arredondarMoeda(
    Math.max(0, receitaBruta - taxaPlataforma - taxaPagHiper)
  )

  const valorPago = arredondarMoeda(
    repasses.reduce(
      (total: number, repasse: any) => total + valorDoRepasse(repasse),
      0
    )
  )

  const saldoCentavos = emCentavos(valorLiquidoGuia) - emCentavos(valorPago)
  const saldoPendente = deCentavos(Math.max(0, saldoCentavos))
  const excessoRepasse = deCentavos(Math.max(0, Math.abs(Math.min(0, saldoCentavos))))

  return {
    receitaBruta,
    taxaPercentual,
    taxaPlataforma,
    taxaPagHiper,
    valorLiquidoGuia,
    valorPago,
    saldoPendente,
    excessoRepasse
  }
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

    const guia = await buscarGuia(supabase, guiaId)

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
    const reservasCompletas = montarReservasCompletas(
      reservasConfirmadas,
      roteiros,
      guiaId
    )

    const resumoCalculado = calcularResumoFinanceiro(
      guia,
      reservasCompletas,
      repasses
    )

    const ultimoRepasse = repasses[0] || null

    return json({
      sucesso: true,
      guia: {
        id: guia.id,
        nome: guia.nome || guia.email || 'Guia',
        email: guia.email || null,
        pix_tipo: guia.pix_tipo || null,
        pix_chave: guia.pix_chave || null,
        cadastur: guia.cadastur || null,
        guia_beta: Boolean(guia.guia_beta),
        guia_pioneiro_beta: Boolean(guia.guia_pioneiro_beta),
        medalha_guia_pioneiro_beta: Boolean(guia.medalha_guia_pioneiro_beta),
        beneficio_taxa_beta_ativo: Boolean(guia.beneficio_taxa_beta_ativo),
        taxa_plataforma_percentual: resumoCalculado.taxaPercentual
      },
      resumo: {
        receita_bruta: resumoCalculado.receitaBruta,
        taxa_percentual: resumoCalculado.taxaPercentual,
        taxa_plataforma: resumoCalculado.taxaPlataforma,
        taxa_paghiper: resumoCalculado.taxaPagHiper,
        valor_liquido_guia: resumoCalculado.valorLiquidoGuia,
        valor_pago: resumoCalculado.valorPago,
        saldo_pendente: resumoCalculado.saldoPendente,
        excesso_repasse: resumoCalculado.excessoRepasse,
        reservas_confirmadas: reservasCompletas.length,
        reservas_total: reservas.length,
        roteiros_total: roteiros.length,
        repasses_total: repasses.length,
        ultimo_pagamento_em: dataRepasse(ultimoRepasse)
      },
      reservas: reservasCompletas,
      repasses,
      debug: {
        guia_id_consultado: guiaId,
        roteiros_encontrados: roteiros.length,
        reservas_encontradas: reservas.length,
        reservas_confirmadas: reservasCompletas.length,
        repasses_encontrados: repasses.length,
        valor_pago_repasses: resumoCalculado.valorPago,
        valor_liquido_guia: resumoCalculado.valorLiquidoGuia,
        saldo_pendente: resumoCalculado.saldoPendente,
        excesso_repasse: resumoCalculado.excessoRepasse,
        ids_repasses: repasses.map((repasse: any) => ({
          id: repasse.id,
          guia_id: repasse.guia_id || null,
          id_guia: repasse.id_guia || null,
          valor: repasse.valor || null,
          valor_pago: repasse.valor_pago || null,
          valor_repasse: repasse.valor_repasse || null,
          status: repasse.status || null,
          tipo: repasse.tipo || null,
          data_pagamento: repasse.data_pagamento || null
        }))
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