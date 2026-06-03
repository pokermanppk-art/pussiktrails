import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  ''

function json(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  })
}

function getSupabaseAdmin() {
  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL ausente.')
  if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.')

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>

function limparTexto(valor: any) {
  return String(valor || '').trim()
}

function normalizar(valor: any) {
  return limparTexto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function uuidValido(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(valor || '')
  )
}

function normalizarValorMonetario(valor: any) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0

  const textoOriginal = String(valor || '').trim()
  if (!textoOriginal) return 0

  let texto = textoOriginal.replace(/\s/g, '').replace(/R\$/gi, '')
  const temVirgula = texto.includes(',')
  const temPonto = texto.includes('.')

  if (temVirgula && temPonto) {
    texto = texto.replace(/\./g, '').replace(',', '.')
  } else if (temVirgula) {
    texto = texto.replace(',', '.')
  }

  texto = texto.replace(/[^\d.]/g, '')
  const numero = Number(texto)
  return Number.isFinite(numero) ? numero : 0
}

function moeda(valor: any) {
  return Math.round(Number(valor || 0) * 100) / 100
}

function emCentavos(valor: any) {
  return Math.round(Number(valor || 0) * 100)
}

function deCentavos(valor: number) {
  return Math.round(Number(valor || 0)) / 100
}

function erroDeColunaAusente(error: any) {
  const textoErro = String(error?.message || error?.details || error?.hint || '').toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    textoErro.includes('could not find') ||
    textoErro.includes('schema cache') ||
    textoErro.includes('column')
  )
}

function extrairColunaAusente(error: any) {
  const textoErro = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ')

  const matchAspas = textoErro.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  const matchColumn = textoErro.match(/column\s+([a-zA-Z0-9_]+)/i)
  if (matchColumn?.[1]) return matchColumn[1]

  return ''
}

async function inserirComFallback(params: {
  supabase: SupabaseAdmin
  tabela: string
  payloadOriginal: AnyRecord
}) {
  const { supabase, tabela, payloadOriginal } = params
  let payloadAtual = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 24; tentativa++) {
    const { data, error } = await supabase
      .from(tabela)
      .insert(payloadAtual)
      .select('*')
      .maybeSingle()

    if (!error) return data

    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)
    if (!coluna || !(coluna in payloadAtual)) throw error

    delete payloadAtual[coluna]
  }

  throw new Error(`Não foi possível inserir registro em ${tabela}.`)
}

function pagamentoConfirmado(reserva: AnyRecord) {
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

function repasseCancelado(repasse: AnyRecord) {
  const status = normalizar(repasse?.status)

  return (
    status === 'cancelado' ||
    status === 'cancelada' ||
    status === 'estornado' ||
    status === 'estornada' ||
    status === 'recusado' ||
    status === 'recusada'
  )
}

function valorDoRepasse(repasse: AnyRecord) {
  return Number(
    repasse?.valor_pago ??
      repasse?.valor_repassado ??
      repasse?.valor_repasse ??
      repasse?.valor ??
      repasse?.valor_total ??
      0
  )
}

function valorDaReserva(reserva: AnyRecord, roteiro?: AnyRecord | null) {
  const valorTotal = Number(reserva?.valor_total || 0)
  if (valorTotal > 0) return valorTotal

  const preco = Number(roteiro?.preco || roteiro?.valor || 0)
  const pessoas = Math.max(1, Number(reserva?.quantidade_pessoas || 1))

  return preco * pessoas
}

function guiaIdDoRoteiro(roteiro?: AnyRecord | null) {
  return limparTexto(
    roteiro?.id_guia || roteiro?.guia_id || roteiro?.user_id || roteiro?.usuario_id || ''
  )
}

function guiaIdDaReserva(reserva: AnyRecord, roteiro?: AnyRecord | null) {
  return limparTexto(
    reserva?.guia_id ||
      reserva?.id_guia ||
      reserva?.user_id ||
      reserva?.usuario_id ||
      guiaIdDoRoteiro(roteiro)
  )
}

function guiaIdDoRepasse(repasse: AnyRecord) {
  return limparTexto(
    repasse?.guia_id ||
      repasse?.id_guia ||
      repasse?.user_id ||
      repasse?.usuario_id ||
      repasse?.guiaId ||
      ''
  )
}

async function buscarPorCampos(params: {
  supabase: SupabaseAdmin
  tabela: string
  campos: string[]
  valor: string
  limite?: number
}) {
  const { supabase, tabela, campos, valor, limite = 1000 } = params
  const mapa = new Map<string, AnyRecord>()

  for (const campo of campos) {
    const { data, error } = await supabase
      .from(tabela)
      .select('*')
      .eq(campo, valor)
      .limit(limite)

    if (error) {
      if (erroDeColunaAusente(error)) continue
      console.warn(`[registrar-repasse] Erro ao buscar ${tabela}.${campo}:`, error)
      continue
    }

    ;(data || []).forEach((item: AnyRecord) => {
      if (item?.id) mapa.set(String(item.id), item)
    })
  }

  return Array.from(mapa.values())
}

async function buscarGuia(supabase: SupabaseAdmin, guiaId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', guiaId)
    .maybeSingle()

  if (error) throw new Error(error.message || 'Erro ao buscar guia.')
  if (!data) throw new Error('Guia não encontrado.')

  return data as AnyRecord
}

async function buscarRoteirosDoGuia(supabase: SupabaseAdmin, guiaId: string) {
  return buscarPorCampos({
    supabase,
    tabela: 'roteiros',
    campos: ['id_guia', 'guia_id', 'user_id', 'usuario_id'],
    valor: guiaId,
    limite: 2500,
  })
}

async function buscarReservasConfirmadasDoGuia(
  supabase: SupabaseAdmin,
  guiaId: string,
  roteiros: AnyRecord[]
) {
  const mapa = new Map<string, AnyRecord>()
  const roteirosPorId = new Map<string, AnyRecord>()

  roteiros.forEach((roteiro) => {
    if (roteiro?.id) roteirosPorId.set(String(roteiro.id), roteiro)
  })

  const roteiroIds = Array.from(roteirosPorId.keys())

  for (let i = 0; i < roteiroIds.length; i += 100) {
    const bloco = roteiroIds.slice(i, i + 100)
    if (bloco.length === 0) continue

    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .in('roteiro_id', bloco)
      .limit(2500)

    if (error) {
      console.warn('[registrar-repasse] Erro ao buscar reservas por roteiro:', error)
    }

    ;(data || []).forEach((reserva: AnyRecord) => {
      if (reserva?.id) mapa.set(String(reserva.id), reserva)
    })
  }

  const reservasPorGuia = await buscarPorCampos({
    supabase,
    tabela: 'reservas',
    campos: ['guia_id', 'id_guia', 'user_id', 'usuario_id'],
    valor: guiaId,
    limite: 2500,
  })

  reservasPorGuia.forEach((reserva) => {
    if (reserva?.id) mapa.set(String(reserva.id), reserva)
  })

  return Array.from(mapa.values()).filter((reserva) => {
    const roteiro = reserva?.roteiro_id ? roteirosPorId.get(String(reserva.roteiro_id)) : null
    const idGuia = guiaIdDaReserva(reserva, roteiro)
    return idGuia === guiaId && pagamentoConfirmado(reserva)
  })
}

async function buscarRepassesDoGuia(supabase: SupabaseAdmin, guiaId: string) {
  const repasses = await buscarPorCampos({
    supabase,
    tabela: 'repasses_guias',
    campos: ['guia_id', 'id_guia', 'user_id', 'usuario_id'],
    valor: guiaId,
    limite: 2500,
  })

  return repasses.filter((repasse) => guiaIdDoRepasse(repasse) === guiaId && !repasseCancelado(repasse))
}

async function calcularSaldoDoGuia(supabase: SupabaseAdmin, guiaId: string) {
  const guia = await buscarGuia(supabase, guiaId)
  const roteiros = await buscarRoteirosDoGuia(supabase, guiaId)
  const reservasConfirmadas = await buscarReservasConfirmadasDoGuia(supabase, guiaId, roteiros)
  const repasses = await buscarRepassesDoGuia(supabase, guiaId)

  const roteirosPorId = new Map<string, AnyRecord>()
  roteiros.forEach((roteiro) => {
    if (roteiro?.id) roteirosPorId.set(String(roteiro.id), roteiro)
  })

  const receitaBruta = moeda(
    reservasConfirmadas.reduce((total: number, reserva: AnyRecord) => {
      const roteiro = reserva?.roteiro_id ? roteirosPorId.get(String(reserva.roteiro_id)) : null
      return total + valorDaReserva(reserva, roteiro)
    }, 0)
  )

  const taxaPercentual = Number(guia?.taxa_plataforma_percentual || 5)
  const taxaPlataforma = moeda(receitaBruta * (taxaPercentual / 100))
  const valorLiquidoGuia = moeda(Math.max(0, receitaBruta - taxaPlataforma))
  const valorPago = moeda(repasses.reduce((total: number, repasse: AnyRecord) => total + valorDoRepasse(repasse), 0))

  const saldoCentavos = emCentavos(valorLiquidoGuia) - emCentavos(valorPago)
  const saldoPendente = deCentavos(Math.max(0, saldoCentavos))
  const excessoRepasse = deCentavos(Math.max(0, Math.abs(Math.min(0, saldoCentavos))))

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
    saldoPendente,
    excessoRepasse,
  }
}

async function registrarLogRepasse(params: {
  supabase: SupabaseAdmin
  guiaId: string
  adminId?: string | null
  valor: number
  repasseId?: string | null
  observacao?: string | null
}) {
  const { supabase, guiaId, adminId, valor, repasseId, observacao } = params

  try {
    await supabase.from('logs_atividades').insert({
      usuario_id: guiaId,
      tipo_usuario: 'guia',
      contexto: 'admin',
      escopo: 'admin',
      acao: 'repasse_guia_pago',
      tipo_evento: 'repasse_guia_pago',
      titulo: 'Repasse ao guia registrado',
      descricao: `Repasse de R$ ${valor.toFixed(2).replace('.', ',')} registrado pelo Admin.`,
      mensagem: `Repasse de R$ ${valor.toFixed(2).replace('.', ',')} registrado pelo Admin.`,
      rota: '/guia/financeiro/historico',
      metadata: {
        guia_id: guiaId,
        admin_id: adminId || null,
        valor_pago: valor,
        repasse_id: repasseId || null,
        observacao: observacao || null,
      },
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.warn('[registrar-repasse] Não foi possível registrar log:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({} as AnyRecord))

    const guiaId = limparTexto(
      body.guiaId || body.guia_id || body.id_guia || body.user_id || body.usuario_id || ''
    )

    const adminId = limparTexto(body.adminId || body.admin_id || body.criado_por || '')
    const observacao = limparTexto(body.observacao || body.descricao || '')
    const comprovanteUrl = limparTexto(
      body.comprovanteUrl ||
        body.comprovante_url ||
        body.url_comprovante ||
        body.comprovante ||
        body.recibo_url ||
        ''
    )

    const valorSolicitado = normalizarValorMonetario(
      body.valorPago ||
        body.valor_pago ||
        body.valorRepasse ||
        body.valor_repassado ||
        body.valor_repasse ||
        body.valor ||
        0
    )

    if (!guiaId || !uuidValido(guiaId)) {
      return json({ sucesso: false, erro: 'Guia inválido.' }, 400)
    }

    if (valorSolicitado <= 0) {
      return json({ sucesso: false, erro: 'Informe um valor de repasse maior que zero.' }, 400)
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
            receita_bruta: saldo.receitaBruta,
            taxa_percentual: saldo.taxaPercentual,
            taxa_plataforma: saldo.taxaPlataforma,
            valor_liquido_guia: saldo.valorLiquidoGuia,
            valor_pago: saldo.valorPago,
            saldo_pendente: 0,
            excesso_repasse: saldo.excessoRepasse,
            repasses_total: saldo.repasses.length,
          },
        },
        400
      )
    }

    if (valorSolicitadoCentavos > saldoPendenteCentavos) {
      return json(
        {
          sucesso: false,
          erro: `O valor informado é maior que o saldo disponível do guia. Valor máximo permitido: ${deCentavos(
            saldoPendenteCentavos
          ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
          valor_informado: deCentavos(valorSolicitadoCentavos),
          valor_maximo_permitido: deCentavos(saldoPendenteCentavos),
          resumo: {
            receita_bruta: saldo.receitaBruta,
            taxa_percentual: saldo.taxaPercentual,
            taxa_plataforma: saldo.taxaPlataforma,
            valor_liquido_guia: saldo.valorLiquidoGuia,
            valor_pago: saldo.valorPago,
            saldo_pendente: saldo.saldoPendente,
            excesso_repasse: saldo.excessoRepasse,
            repasses_total: saldo.repasses.length,
          },
        },
        400
      )
    }

    const valorFinal = deCentavos(valorSolicitadoCentavos)
    const agora = new Date().toISOString()

    const payload: AnyRecord = {
      guia_id: guiaId,
      id_guia: guiaId,
      user_id: guiaId,
      usuario_id: guiaId,
      admin_id: adminId || null,
      criado_por: adminId || null,
      valor: valorFinal,
      valor_pago: valorFinal,
      valor_repassado: valorFinal,
      valor_repasse: valorFinal,
      valor_total: valorFinal,
      status: 'pago',
      tipo: 'repasse_guia',
      metodo_pagamento: 'pix',
      observacao: observacao || null,
      descricao: observacao || `Repasse ao guia ${saldo.guia?.nome || saldo.guia?.email || guiaId}`,
      comprovante_url: comprovanteUrl || null,
      url_comprovante: comprovanteUrl || null,
      comprovante: comprovanteUrl || null,
      data_pagamento: agora,
      pago_em: agora,
      created_at: agora,
      updated_at: agora,
      metadata: {
        origem: 'admin_financeiro',
        guia_id: guiaId,
        admin_id: adminId || null,
        valor_pago: valorFinal,
        saldo_antes: saldo.saldoPendente,
        observacao: observacao || null,
        comprovante_url: comprovanteUrl || null,
      },
    }

    const repasse = await inserirComFallback({
      supabase,
      tabela: 'repasses_guias',
      payloadOriginal: payload,
    })

    await registrarLogRepasse({
      supabase,
      guiaId,
      adminId: adminId || null,
      valor: valorFinal,
      repasseId: repasse?.id || null,
      observacao: observacao || null,
    })

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
        excesso_repasse: saldoAtualizado.excessoRepasse,
        reservas_confirmadas: saldoAtualizado.reservasConfirmadas.length,
        repasses_total: saldoAtualizado.repasses.length,
      },
    })
  } catch (error: any) {
    console.error('Erro em registrar-repasse:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao registrar repasse.',
      },
      500
    )
  }
}
