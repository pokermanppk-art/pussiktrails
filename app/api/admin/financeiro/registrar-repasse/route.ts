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
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ausente.')
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.')
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

function normalizarValorMonetario(valor: any) {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : 0
  }

  const textoOriginal = String(valor || '').trim()

  if (!textoOriginal) return 0

  let texto = textoOriginal
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')

  const temVirgula = texto.includes(',')
  const temPonto = texto.includes('.')

  if (temVirgula && temPonto) {
    texto = texto.replace(/\./g, '').replace(',', '.')
  } else if (temVirgula) {
    texto = texto.replace(',', '.')
  }

  texto = texto.replace(/[^\d.]/g, '')

  const numero = Number(texto)

  if (!Number.isFinite(numero)) return 0

  return numero
}

function emCentavos(valor: any) {
  return Math.round(Number(valor || 0) * 100)
}

function deCentavos(valor: number) {
  return Math.round(Number(valor || 0)) / 100
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
      repasse?.valor_repasse ||
      repasse?.valor_repassado ||
      repasse?.valor ||
      0
  )
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

async function buscarReservasConfirmadasDoGuia(
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

  return Array.from(mapa.values()).filter(pagamentoConfirmado)
}

async function buscarRepassesDoGuia(supabase: any, guiaId: string) {
  const { data, error } = await supabase
    .from('repasses_guias')
    .select('*')
    .or(`guia_id.eq.${guiaId},id_guia.eq.${guiaId}`)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message || 'Erro ao buscar repasses do guia.')
  }

  return (data || []).filter((repasse: any) => !repasseCancelado(repasse))
}

async function calcularSaldoDoGuia(supabase: any, guiaId: string) {
  const { data: guia, error: guiaError } = await supabase
    .from('users')
    .select('*')
    .eq('id', guiaId)
    .maybeSingle()

  if (guiaError) {
    throw new Error(guiaError.message || 'Erro ao buscar guia.')
  }

  if (!guia) {
    throw new Error('Guia não encontrado.')
  }

  const roteiros = await buscarRoteirosDoGuia(supabase, guiaId)
  const reservasConfirmadas = await buscarReservasConfirmadasDoGuia(
    supabase,
    guiaId,
    roteiros
  )
  const repasses = await buscarRepassesDoGuia(supabase, guiaId)

  const receitaBruta = reservasConfirmadas.reduce(
    (total: number, reserva: any) => total + Number(reserva.valor_total || 0),
    0
  )

  const taxaPercentual = Number(guia?.taxa_plataforma_percentual || 5)
  const taxaPlataforma = receitaBruta * (taxaPercentual / 100)
  const valorLiquidoGuia = Math.max(0, receitaBruta - taxaPlataforma)

  const valorPago = repasses.reduce(
    (total: number, repasse: any) => total + valorDoRepasse(repasse),
    0
  )

  const saldoPendente = Math.max(0, valorLiquidoGuia - valorPago)

  return {
    guia,
    roteiros,
    reservasConfirmadas,
    repasses,
    receitaBruta,
    taxaPercentual,
    taxaPlataforma,
    valorLiquidoGuia,
    valorPago,
    saldoPendente
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const guiaId = limparTexto(
      body.guiaId ||
        body.guia_id ||
        body.id_guia ||
        body.user_id ||
        body.usuario_id ||
        ''
    )

    const adminId = limparTexto(
      body.adminId ||
        body.admin_id ||
        body.criado_por ||
        ''
    )

    const observacao = limparTexto(body.observacao || body.descricao || '')
    const valorSolicitado = normalizarValorMonetario(
      body.valorPago ||
        body.valor_pago ||
        body.valorRepasse ||
        body.valor_repasse ||
        body.valor ||
        0
    )

    if (!guiaId || !uuidValido(guiaId)) {
      return json(
        {
          sucesso: false,
          erro: 'Guia inválido.'
        },
        400
      )
    }

    if (valorSolicitado <= 0) {
      return json(
        {
          sucesso: false,
          erro: 'Informe um valor de repasse maior que zero.'
        },
        400
      )
    }

    const saldo = await calcularSaldoDoGuia(supabase, guiaId)

    const valorSolicitadoCentavos = emCentavos(valorSolicitado)
    const saldoPendenteCentavos = emCentavos(saldo.saldoPendente)

    if (saldoPendenteCentavos <= 0) {
      return json(
        {
          sucesso: false,
          erro: 'Este guia não possui saldo pendente para repasse.',
          resumo: {
            saldo_pendente: 0,
            valor_liquido_guia: saldo.valorLiquidoGuia,
            valor_pago: saldo.valorPago,
            repasses_total: saldo.repasses.length
          }
        },
        400
      )
    }

    if (valorSolicitadoCentavos > saldoPendenteCentavos) {
      return json(
        {
          sucesso: false,
          erro: `O valor informado é maior que o saldo disponível do guia. Valor máximo permitido: ${deCentavos(saldoPendenteCentavos).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          })}.`,
          valor_informado: deCentavos(valorSolicitadoCentavos),
          valor_maximo_permitido: deCentavos(saldoPendenteCentavos),
          resumo: {
            receita_bruta: saldo.receitaBruta,
            taxa_percentual: saldo.taxaPercentual,
            taxa_plataforma: saldo.taxaPlataforma,
            valor_liquido_guia: saldo.valorLiquidoGuia,
            valor_pago: saldo.valorPago,
            saldo_pendente: saldo.saldoPendente,
            repasses_total: saldo.repasses.length
          }
        },
        400
      )
    }

    const valorFinal = deCentavos(valorSolicitadoCentavos)
    const agora = new Date().toISOString()

    const payload = {
      guia_id: guiaId,
      id_guia: guiaId,
      admin_id: adminId || null,
      criado_por: adminId || null,
      valor: valorFinal,
      valor_pago: valorFinal,
      valor_repasse: valorFinal,
      status: 'pago',
      tipo: 'repasse_guia',
      observacao: observacao || null,
      descricao:
        observacao ||
        `Repasse ao guia ${saldo.guia?.nome || saldo.guia?.email || guiaId}`,
      data_pagamento: agora,
      created_at: agora,
      updated_at: agora
    }

    const { data: repasse, error: insertError } = await supabase
      .from('repasses_guias')
      .insert(payload)
      .select('*')
      .maybeSingle()

    if (insertError) {
      return json(
        {
          sucesso: false,
          erro: insertError.message || 'Erro ao registrar repasse.'
        },
        500
      )
    }

    const saldoAtualizado = await calcularSaldoDoGuia(supabase, guiaId)

    return json({
      sucesso: true,
      mensagem: 'Repasse registrado com sucesso.',
      repasse,
      resumo: {
        receita_bruta: saldoAtualizado.receitaBruta,
        taxa_percentual: saldoAtualizado.taxaPercentual,
        taxa_plataforma: saldoAtualizado.taxaPlataforma,
        valor_liquido_guia: saldoAtualizado.valorLiquidoGuia,
        valor_pago: saldoAtualizado.valorPago,
        saldo_pendente: saldoAtualizado.saldoPendente,
        reservas_confirmadas: saldoAtualizado.reservasConfirmadas.length,
        repasses_total: saldoAtualizado.repasses.length
      }
    })
  } catch (error: any) {
    console.error('Erro em registrar-repasse:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao registrar repasse.'
      },
      500
    )
  }
}