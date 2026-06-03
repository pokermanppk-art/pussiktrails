import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

function json(data: AnyRecord, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })
}

function getSupabaseAdmin(): any {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    ''

  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL ausente no ambiente.')
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente no ambiente.')

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
    .trim()
}

function numeroSeguro(valor: unknown) {
  const numero = Number(valor || 0)
  return Number.isFinite(numero) ? numero : 0
}

function moeda(valor: unknown) {
  return Math.round(numeroSeguro(valor) * 100) / 100
}

function dataMs(valor?: string | null) {
  if (!valor) return 0
  const data = new Date(valor)
  const ms = data.getTime()
  return Number.isNaN(ms) ? 0 : ms
}

function isColumnError(error: any) {
  const msg = String(error?.message || error?.details || error?.hint || '').toLowerCase()
  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    msg.includes('column') ||
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('could not find')
  )
}

function isTableError(error: any) {
  const msg = String(error?.message || error?.details || error?.hint || '').toLowerCase()
  return (
    error?.code === '42P01' ||
    msg.includes('relation') ||
    msg.includes('does not exist') ||
    msg.includes('schema cache')
  )
}

function statusCancelado(item: AnyRecord) {
  const status = normalizar(item.status || item.pagamento_status)
  return (
    status === 'cancelado' ||
    status === 'cancelada' ||
    status === 'estornado' ||
    status === 'estornada' ||
    status === 'recusado' ||
    status === 'recusada' ||
    status === 'reembolsado' ||
    status === 'reembolsada'
  )
}

function pagamentoConfirmado(reserva: AnyRecord) {
  if (statusCancelado(reserva)) return false

  const pagamento = normalizar(reserva.pagamento_status)
  const status = normalizar(reserva.status)

  return (
    pagamento === 'pago' ||
    pagamento === 'paga' ||
    pagamento === 'confirmado' ||
    pagamento === 'confirmada' ||
    pagamento === 'aprovado' ||
    pagamento === 'aprovada' ||
    pagamento === 'paid' ||
    pagamento === 'approved' ||
    status === 'confirmada' ||
    status === 'confirmado' ||
    status === 'realizada' ||
    status === 'realizado' ||
    status === 'pago' ||
    status === 'paga'
  )
}

function repassePago(repasse: AnyRecord) {
  if (statusCancelado(repasse)) return false

  const status = normalizar(repasse.status)

  if (
    status === 'pago' ||
    status === 'paga' ||
    status === 'concluido' ||
    status === 'concluida' ||
    status === 'concluído' ||
    status === 'concluída' ||
    status === 'confirmado' ||
    status === 'confirmada' ||
    status === 'aprovado' ||
    status === 'aprovada' ||
    status === 'realizado' ||
    status === 'realizada' ||
    status === 'quitado' ||
    status === 'quitada'
  ) {
    return true
  }

  // Compatibilidade: alguns repasses antigos podem ter sido marcados como pagos
  // apenas por data/comprovante, sem status padronizado.
  const temComprovante = Boolean(
    repasse.comprovante_url ||
      repasse.url_comprovante ||
      repasse.comprovante ||
      repasse.recibo_url ||
      repasse.arquivo_url ||
      repasse.comprovante_pagamento_url
  )

  return Boolean(repasse.data_pagamento || repasse.pago_em || repasse.paid_at || temComprovante)
}

function valorReserva(reserva: AnyRecord) {
  return moeda(
    reserva.valor_total ??
      reserva.valor_pago ??
      reserva.valor ??
      reserva.preco_total ??
      reserva.total ??
      0
  )
}

function valorRepasse(repasse: AnyRecord) {
  return moeda(
    repasse.valor_pago ??
      repasse.valor_repasse ??
      repasse.valor_repassado ??
      repasse.valor_liquido ??
      repasse.valor_solicitado ??
      repasse.valor ??
      repasse.valor_total ??
      0
  )
}

function dataReserva(reserva: AnyRecord) {
  return (
    reserva.data_pagamento ||
    reserva.pago_em ||
    reserva.paid_at ||
    reserva.updated_at ||
    reserva.created_at ||
    null
  )
}

function dataRepasse(repasse: AnyRecord) {
  return (
    repasse.data_pagamento ||
    repasse.pago_em ||
    repasse.paid_at ||
    repasse.updated_at ||
    repasse.created_at ||
    null
  )
}

function guiaIdDoRoteiro(roteiro: AnyRecord) {
  return texto(
    roteiro.id_guia ||
      roteiro.guia_id ||
      roteiro.user_id ||
      roteiro.usuario_id ||
      roteiro.criado_por ||
      roteiro.created_by ||
      roteiro.owner_id ||
      ''
  )
}

function roteiroIdDaReserva(reserva: AnyRecord) {
  return texto(reserva.roteiro_id || reserva.id_roteiro || reserva.roteiroId || '')
}

function guiaIdDaReserva(reserva: AnyRecord) {
  return texto(
    reserva.guia_id ||
      reserva.id_guia ||
      reserva.user_id ||
      reserva.usuario_id ||
      reserva.guiaId ||
      ''
  )
}

function guiaIdDoRepasse(repasse: AnyRecord) {
  return texto(
    repasse.guia_id ||
      repasse.id_guia ||
      repasse.user_id ||
      repasse.usuario_id ||
      repasse.guiaId ||
      ''
  )
}

function tituloRoteiro(roteiro: AnyRecord) {
  return roteiro?.titulo || roteiro?.nome || 'Roteiro'
}

function taxaDoGuia(guia: AnyRecord | null) {
  const valor = numeroSeguro(guia?.taxa_plataforma_percentual)
  if (valor > 0 && valor <= 100) return valor
  return 5
}

function calcularTaxas(reservasConfirmadas: AnyRecord[], taxaPercentual: number) {
  const taxaDecimal = taxaPercentual / 100
  const receitaBruta = moeda(reservasConfirmadas.reduce((total, reserva) => total + valorReserva(reserva), 0))
  const taxaPlataforma = moeda(receitaBruta * taxaDecimal)
  const taxaPagHiper = moeda(
    reservasConfirmadas.reduce((total, reserva) => {
      return (
        total +
        numeroSeguro(
          reserva.taxa_paghiper ??
            reserva.paghiper_taxa ??
            reserva.taxa_gateway ??
            reserva.taxa_pagamento ??
            0
        )
      )
    }, 0)
  )

  // Regra financeira aprovada: a taxa Prussik incide sobre o bruto.
  // A tela do guia usa o líquido do guia para definir saldo sacável.
  const valorLiquidoGuia = moeda(Math.max(0, receitaBruta - taxaPlataforma))

  return {
    receitaBruta,
    taxaPlataforma,
    taxaPagHiper,
    valorLiquidoGuia,
  }
}

function montarReservaResposta(reserva: AnyRecord, roteiro?: AnyRecord | null) {
  return {
    ...reserva,
    roteiro: roteiro || reserva.roteiro || null,
    roteiro_titulo: reserva.roteiro_titulo || tituloRoteiro(roteiro || reserva.roteiro || {}),
  }
}

async function buscarGuia(supabase: any, guiaId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', guiaId)
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function buscarPorCampo(
  supabase: any,
  tabela: string,
  campo: string,
  valor: string,
  limite = 2000
) {
  const { data, error } = await supabase
    .from(tabela)
    .select('*')
    .eq(campo, valor)
    .limit(limite)

  if (error) {
    if (isColumnError(error) || isTableError(error)) return []
    console.warn(`[financeiro/resumo] Erro ao buscar ${tabela}.${campo}:`, error)
    return []
  }

  return Array.isArray(data) ? data : []
}

async function buscarRoteirosDoGuia(supabase: any, guiaId: string) {
  const mapa = new Map<string, AnyRecord>()
  const campos = ['id_guia', 'guia_id', 'user_id', 'usuario_id', 'criado_por', 'created_by', 'owner_id']

  for (const campo of campos) {
    const lista = await buscarPorCampo(supabase, 'roteiros', campo, guiaId, 2500)
    lista.forEach((roteiro: AnyRecord) => {
      if (roteiro?.id) mapa.set(roteiro.id, roteiro)
    })
  }

  return Array.from(mapa.values()).filter((roteiro) => guiaIdDoRoteiro(roteiro) === guiaId || true)
}

async function buscarReservasPorRoteiros(supabase: any, roteiros: AnyRecord[]) {
  const roteiroIds = roteiros.map((roteiro) => texto(roteiro.id)).filter(Boolean)
  if (roteiroIds.length === 0) return []

  const mapa = new Map<string, AnyRecord>()
  const campos = ['roteiro_id', 'id_roteiro']

  for (const campo of campos) {
    // O Supabase/PostgREST aceita listas relativamente grandes, mas fatiar evita URL excessiva.
    for (let i = 0; i < roteiroIds.length; i += 150) {
      const bloco = roteiroIds.slice(i, i + 150)
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .in(campo, bloco)
        .limit(3000)

      if (error) {
        if (isColumnError(error) || isTableError(error)) continue
        console.warn(`[financeiro/resumo] Erro ao buscar reservas por ${campo}:`, error)
        continue
      }

      ;(data || []).forEach((reserva: AnyRecord) => {
        if (reserva?.id) mapa.set(reserva.id, reserva)
      })
    }
  }

  return Array.from(mapa.values())
}

async function buscarReservasPorGuiaDireto(supabase: any, guiaId: string) {
  const mapa = new Map<string, AnyRecord>()
  const campos = ['guia_id', 'id_guia']

  for (const campo of campos) {
    const lista = await buscarPorCampo(supabase, 'reservas', campo, guiaId, 3000)
    lista.forEach((reserva: AnyRecord) => {
      if (reserva?.id) mapa.set(reserva.id, reserva)
    })
  }

  return Array.from(mapa.values())
}

async function buscarReservasDoGuia(supabase: any, guiaId: string, roteiros: AnyRecord[]) {
  const mapa = new Map<string, AnyRecord>()

  const [porRoteiros, porGuiaDireto] = await Promise.all([
    buscarReservasPorRoteiros(supabase, roteiros),
    buscarReservasPorGuiaDireto(supabase, guiaId),
  ])

  ;[...porRoteiros, ...porGuiaDireto].forEach((reserva) => {
    if (reserva?.id) mapa.set(reserva.id, reserva)
  })

  return Array.from(mapa.values())
}

async function buscarRepassesDoGuia(supabase: any, guiaId: string) {
  const mapa = new Map<string, AnyRecord>()
  const campos = ['guia_id', 'id_guia', 'user_id', 'usuario_id']

  for (const campo of campos) {
    const lista = await buscarPorCampo(supabase, 'repasses_guias', campo, guiaId, 3000)
    lista.forEach((repasse: AnyRecord) => {
      if (repasse?.id) mapa.set(repasse.id, repasse)
    })
  }

  return Array.from(mapa.values())
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const guiaId = texto(
      searchParams.get('guiaId') ||
        searchParams.get('guia_id') ||
        searchParams.get('userId') ||
        searchParams.get('usuarioId') ||
        ''
    )

    if (!guiaId) {
      return json(
        {
          sucesso: false,
          erro: 'ID do guia não informado.',
        },
        400
      )
    }

    const guia = await buscarGuia(supabase, guiaId)

    if (!guia?.id) {
      return json(
        {
          sucesso: false,
          erro: 'Guia não encontrado.',
        },
        404
      )
    }

    const taxaPercentual = taxaDoGuia(guia)
    const taxaDecimal = taxaPercentual / 100

    const roteiros = await buscarRoteirosDoGuia(supabase, guiaId)
    const roteiroMap = new Map<string, AnyRecord>()
    roteiros.forEach((roteiro) => {
      if (roteiro?.id) roteiroMap.set(roteiro.id, roteiro)
    })

    const [reservasTodas, repassesTodas] = await Promise.all([
      buscarReservasDoGuia(supabase, guiaId, roteiros),
      buscarRepassesDoGuia(supabase, guiaId),
    ])

    const reservasConfirmadas = reservasTodas
      .filter(pagamentoConfirmado)
      .sort((a, b) => dataMs(dataReserva(b)) - dataMs(dataReserva(a)))

    const repassesValidos = repassesTodas
      .filter((repasse) => !statusCancelado(repasse))
      .filter((repasse) => {
        const idRepasse = guiaIdDoRepasse(repasse)
        return !idRepasse || idRepasse === guiaId
      })
      .sort((a, b) => dataMs(dataRepasse(b)) - dataMs(dataRepasse(a)))

    const repassesPagos = repassesValidos.filter(repassePago)

    const { receitaBruta, taxaPlataforma, taxaPagHiper, valorLiquidoGuia } = calcularTaxas(
      reservasConfirmadas,
      taxaPercentual
    )

    const valorPago = moeda(repassesPagos.reduce((total, repasse) => total + valorRepasse(repasse), 0))
    const saldoPendente = moeda(Math.max(0, valorLiquidoGuia - valorPago))
    const excessoRepasse = moeda(Math.max(0, valorPago - valorLiquidoGuia))

    const brutoPendente = moeda(
      saldoPendente > 0 && taxaDecimal < 1 ? saldoPendente / (1 - taxaDecimal) : 0
    )

    const taxaPendente = moeda(Math.max(0, brutoPendente - saldoPendente))

    const ultimoPagamento = reservasConfirmadas
      .map(dataReserva)
      .filter(Boolean)
      .sort((a, b) => dataMs(b) - dataMs(a))[0] || null

    const reservasResposta = reservasConfirmadas.map((reserva) => {
      const roteiroId = roteiroIdDaReserva(reserva)
      const roteiro = roteiroMap.get(roteiroId) || null
      return montarReservaResposta(reserva, roteiro)
    })

    const resumo = {
      // Histórico total gerado no app.
      receita_bruta: receitaBruta,
      taxa_percentual: taxaPercentual,
      taxa_plataforma: taxaPlataforma,
      taxa_paghiper: taxaPagHiper,
      valor_liquido_guia: valorLiquidoGuia,

      // Valor já pago/baixado pelo Admin.
      valor_pago: valorPago,
      repasses_total: repassesPagos.length,

      // Saldo atual sacável. A tela principal deve usar este valor.
      saldo_pendente: saldoPendente,
      excesso_repasse: excessoRepasse,

      // Campos novos para evitar recálculo inconsistente no front.
      bruto_pendente: brutoPendente,
      taxa_pendente: taxaPendente,
      liquido_disponivel: saldoPendente,

      reservas_confirmadas: reservasConfirmadas.length,
      reservas_total: reservasTodas.length,
      roteiros_total: roteiros.length,
      ultimo_pagamento_em: ultimoPagamento,
    }

    return json({
      sucesso: true,
      guia: {
        id: guia.id,
        nome: guia.nome || guia.email || 'Guia',
        email: guia.email || null,
        avatar_url: guia.avatar_url || null,
        foto_url: guia.foto_url || null,
        imagem_url: guia.imagem_url || null,
        pix_tipo: guia.pix_tipo || null,
        pix_chave: guia.pix_chave || null,
        cadastur: guia.cadastur || null,
        cadastur_numero: guia.cadastur_numero || null,
        guia_beta: guia.guia_beta ?? null,
        guia_pioneiro_beta: guia.guia_pioneiro_beta ?? null,
        medalha_guia_pioneiro_beta: guia.medalha_guia_pioneiro_beta ?? null,
        beneficio_taxa_beta_ativo: guia.beneficio_taxa_beta_ativo ?? null,
        taxa_plataforma_percentual: taxaPercentual,
      },
      resumo,
      reservas: reservasResposta,
      repasses: repassesValidos,
      meta: {
        regra: 'Resumo principal mostra apenas saldo atual sacável; histórico geral permanece separado.',
        calculo_saldo_pendente: 'valor_liquido_guia_historico - repasses_pagos_admin',
        calculo_bruto_pendente: 'saldo_pendente / (1 - taxa_percentual)',
      },
    })
  } catch (error: any) {
    console.error('Erro em GET /api/guia/financeiro/resumo:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    })

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro ao carregar resumo financeiro do guia.',
      },
      500
    )
  }
}
