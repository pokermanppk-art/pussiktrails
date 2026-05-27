import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

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

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurada.')
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function extrairColunaAusente(error: any) {
  const conteudo = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')

  const matchAspas = conteudo.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  const matchColumn = conteudo.match(/column\s+([a-zA-Z0-9_]+)/i)
  if (matchColumn?.[1]) return matchColumn[1]

  return ''
}

function erroDeColunaAusente(error: any) {
  const conteudo = String(
    error?.message ||
      error?.details ||
      error?.hint ||
      ''
  ).toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    conteudo.includes('could not find') ||
    conteudo.includes('schema cache') ||
    conteudo.includes('column')
  )
}

async function atualizarComFallback(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>
  tabela: string
  id: string
  payloadOriginal: AnyRecord
}) {
  const { supabase, tabela, id, payloadOriginal } = params

  let payloadAtual = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 18; tentativa++) {
    const { data, error } = await supabase
      .from(tabela)
      .update(payloadAtual)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (!error) return data

    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payloadAtual)) {
      throw error
    }

    delete payloadAtual[coluna]
  }

  throw new Error(`Não foi possível atualizar ${tabela}.`)
}

async function inserirComFallback(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>
  tabela: string
  payloadOriginal: AnyRecord
}) {
  const { supabase, tabela, payloadOriginal } = params

  let payloadAtual = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 18; tentativa++) {
    const { data, error } = await supabase
      .from(tabela)
      .insert(payloadAtual)
      .select('*')
      .maybeSingle()

    if (!error) return data

    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payloadAtual)) {
      throw error
    }

    delete payloadAtual[coluna]
  }

  throw new Error(`Não foi possível inserir em ${tabela}.`)
}

async function buscarSaldoCliente(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>
  clienteId: string
}) {
  const { supabase, clienteId } = params

  try {
    await supabase.rpc('recalcular_saldo_cliente', {
      p_cliente_id: clienteId,
    })
  } catch (error) {
    console.warn('[admin/saldos/reembolsos] Aviso ao recalcular saldo:', error)
  }

  const { data, error } = await supabase
    .from('cliente_saldos')
    .select('*')
    .eq('cliente_id', clienteId)
    .maybeSingle()

  if (error) {
    console.warn('[admin/saldos/reembolsos] Aviso ao buscar saldo:', error)
  }

  return data || null
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)

    const status = normalizar(searchParams.get('status') || 'todos')
    const busca = normalizar(searchParams.get('busca') || '')
    const limite = Math.min(Number(searchParams.get('limite') || 300), 800)

    let query = supabase
      .from('solicitacoes_reembolso')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite)

    if (status && status !== 'todos') {
      query = query.eq('status', status)
    }

    const { data: reembolsosData, error: reembolsosError } = await query

    if (reembolsosError) throw reembolsosError

    const reembolsosBase = (reembolsosData || []) as AnyRecord[]

    const clienteIds = Array.from(
      new Set(
        reembolsosBase
          .map((item) => texto(item.cliente_id))
          .filter(Boolean)
      )
    )

    let usuarios: AnyRecord[] = []
    let saldos: AnyRecord[] = []

    if (clienteIds.length > 0) {
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('users')
        .select('id, nome, name, full_name, email, avatar_url, foto_url, imagem_url')
        .in('id', clienteIds)

      if (usuariosError) {
        console.warn('[admin/saldos/reembolsos] Aviso ao buscar usuários:', usuariosError)
      } else {
        usuarios = (usuariosData || []) as AnyRecord[]
      }

      const { data: saldosData, error: saldosError } = await supabase
        .from('cliente_saldos')
        .select('*')
        .in('cliente_id', clienteIds)

      if (saldosError) {
        console.warn('[admin/saldos/reembolsos] Aviso ao buscar saldos:', saldosError)
      } else {
        saldos = (saldosData || []) as AnyRecord[]
      }
    }

    /**
     * Importante:
     * O spread "...reembolso" precisa vir primeiro para preservar os campos reais
     * da solicitação, como status, valor_solicitado, cliente_id etc.
     * Sem a tipagem explícita abaixo, o TypeScript pode inferir apenas os campos
     * adicionados do cliente e gerar erro "Property status does not exist".
     */
    const reembolsosEnriquecidos: AnyRecord[] = reembolsosBase.map(
      (reembolso: AnyRecord): AnyRecord => {
        const cliente =
          usuarios.find((usuario) => texto(usuario.id) === texto(reembolso.cliente_id)) || {}

        const saldo =
          saldos.find((item) => texto(item.cliente_id) === texto(reembolso.cliente_id)) || {}

        return {
          ...reembolso,
          cliente_nome:
            cliente.nome ||
            cliente.name ||
            cliente.full_name ||
            cliente.email ||
            `Cliente ${texto(reembolso.cliente_id).slice(0, 8)}`,
          cliente_email: cliente.email || '',
          cliente_avatar: cliente.avatar_url || cliente.foto_url || cliente.imagem_url || '',
          saldo_disponivel_atual: numero(saldo.saldo_disponivel),
          saldo_reservado_atual: numero(saldo.saldo_reservado),
          saldo_utilizado_atual: numero(saldo.saldo_utilizado),
        }
      }
    )

    const listaFiltrada = busca
      ? reembolsosEnriquecidos.filter((item: AnyRecord) => {
          const alvo = normalizar(
            [
              item.id,
              item.cliente_id,
              item.cliente_nome,
              item.cliente_email,
              item.status,
              item.motivo,
              item.chave_pix,
              item.titular_nome,
              item.titular_documento,
            ].join(' ')
          )

          return alvo.includes(busca)
        })
      : reembolsosEnriquecidos

    const resumo = {
      total: listaFiltrada.length,
      pendentes: listaFiltrada.filter((item) => normalizar(item.status) === 'pendente').length,
      em_analise: listaFiltrada.filter((item) => normalizar(item.status) === 'em_analise').length,
      aprovados: listaFiltrada.filter((item) => normalizar(item.status) === 'aprovado').length,
      pagos: listaFiltrada.filter((item) => normalizar(item.status) === 'pago').length,
      recusados: listaFiltrada.filter((item) => normalizar(item.status) === 'recusado').length,
      cancelados: listaFiltrada.filter((item) => normalizar(item.status) === 'cancelado').length,
      valor_pendente: listaFiltrada
        .filter((item) => ['pendente', 'em_analise', 'aprovado'].includes(normalizar(item.status)))
        .reduce((total, item) => total + numero(item.valor_solicitado), 0),
      valor_pago: listaFiltrada
        .filter((item) => normalizar(item.status) === 'pago')
        .reduce((total, item) => total + numero(item.valor_solicitado), 0),
    }

    return NextResponse.json({
      sucesso: true,
      reembolsos: listaFiltrada,
      solicitacoes: listaFiltrada,
      resumo,
    })
  } catch (error) {
    console.error('Erro em GET /api/admin/saldos/reembolsos:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao carregar solicitações de reembolso.',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const reembolsoId = texto(
      body.reembolsoId ||
        body.reembolso_id ||
        body.solicitacaoId ||
        body.solicitacao_id ||
        body.id
    )

    const acao = normalizar(body.acao || body.status || '')
    const adminId = texto(body.adminId || body.admin_id) || null
    const observacaoAdmin = texto(body.observacaoAdmin || body.observacao_admin)
    const referenciaPagamento = texto(body.referenciaPagamento || body.referencia_pagamento)
    const comprovanteUrl = texto(body.comprovanteUrl || body.comprovante_url)

    if (!reembolsoId) {
      return NextResponse.json(
        { sucesso: false, erro: 'reembolsoId é obrigatório.' },
        { status: 400 }
      )
    }

    const { data: reembolso, error: reembolsoError } = await supabase
      .from('solicitacoes_reembolso')
      .select('*')
      .eq('id', reembolsoId)
      .maybeSingle()

    if (reembolsoError) throw reembolsoError

    if (!reembolso) {
      return NextResponse.json(
        { sucesso: false, erro: 'Solicitação de reembolso não encontrada.' },
        { status: 404 }
      )
    }

    const statusAtual = normalizar(reembolso.status)
    const valorSolicitado = numero(reembolso.valor_solicitado)
    const clienteId = texto(reembolso.cliente_id)

    if (!clienteId) {
      return NextResponse.json(
        { sucesso: false, erro: 'Solicitação sem cliente vinculado.' },
        { status: 400 }
      )
    }

    if (valorSolicitado <= 0) {
      return NextResponse.json(
        { sucesso: false, erro: 'Valor solicitado inválido.' },
        { status: 400 }
      )
    }

    const agora = new Date().toISOString()

    if (acao === 'aprovar' || acao === 'aprovado') {
      const saldo = await buscarSaldoCliente({ supabase, clienteId })
      const saldoDisponivel = numero(saldo?.saldo_disponivel)

      if (valorSolicitado > saldoDisponivel) {
        return NextResponse.json(
          {
            sucesso: false,
            erro: `Saldo disponível insuficiente. Disponível: R$ ${saldoDisponivel.toFixed(2)}.`,
          },
          { status: 400 }
        )
      }

      const atualizado = await atualizarComFallback({
        supabase,
        tabela: 'solicitacoes_reembolso',
        id: reembolsoId,
        payloadOriginal: {
          status: 'aprovado',
          aprovado_em: agora,
          aprovado_por: adminId,
          observacao_admin: observacaoAdmin || reembolso.observacao_admin || null,
          updated_at: agora,
        },
      })

      return NextResponse.json({
        sucesso: true,
        reembolso: atualizado,
        mensagem: 'Reembolso aprovado.',
      })
    }

    if (acao === 'analise' || acao === 'em_analise') {
      const atualizado = await atualizarComFallback({
        supabase,
        tabela: 'solicitacoes_reembolso',
        id: reembolsoId,
        payloadOriginal: {
          status: 'em_analise',
          analisado_em: agora,
          analisado_por: adminId,
          observacao_admin: observacaoAdmin || reembolso.observacao_admin || null,
          updated_at: agora,
        },
      })

      return NextResponse.json({
        sucesso: true,
        reembolso: atualizado,
        mensagem: 'Reembolso marcado como em análise.',
      })
    }

    if (acao === 'recusar' || acao === 'recusado') {
      const atualizado = await atualizarComFallback({
        supabase,
        tabela: 'solicitacoes_reembolso',
        id: reembolsoId,
        payloadOriginal: {
          status: 'recusado',
          recusado_em: agora,
          recusado_por: adminId,
          observacao_admin:
            observacaoAdmin ||
            reembolso.observacao_admin ||
            'Solicitação recusada administrativamente.',
          updated_at: agora,
        },
      })

      return NextResponse.json({
        sucesso: true,
        reembolso: atualizado,
        mensagem: 'Reembolso recusado.',
      })
    }

    if (acao === 'cancelar' || acao === 'cancelado') {
      const atualizado = await atualizarComFallback({
        supabase,
        tabela: 'solicitacoes_reembolso',
        id: reembolsoId,
        payloadOriginal: {
          status: 'cancelado',
          cancelado_em: agora,
          cancelado_por: adminId,
          observacao_admin:
            observacaoAdmin ||
            reembolso.observacao_admin ||
            'Solicitação cancelada administrativamente.',
          updated_at: agora,
        },
      })

      return NextResponse.json({
        sucesso: true,
        reembolso: atualizado,
        mensagem: 'Reembolso cancelado.',
      })
    }

    if (acao === 'pagar' || acao === 'pago' || acao === 'registrar_pagamento') {
      if (statusAtual === 'pago') {
        return NextResponse.json(
          { sucesso: false, erro: 'Este reembolso já está marcado como pago.' },
          { status: 400 }
        )
      }

      const saldo = await buscarSaldoCliente({ supabase, clienteId })
      const saldoDisponivel = numero(saldo?.saldo_disponivel)

      if (valorSolicitado > saldoDisponivel) {
        return NextResponse.json(
          {
            sucesso: false,
            erro: `Saldo disponível insuficiente. Disponível: R$ ${saldoDisponivel.toFixed(2)}.`,
          },
          { status: 400 }
        )
      }

      const movimentacao = await inserirComFallback({
        supabase,
        tabela: 'cliente_saldo_movimentacoes',
        payloadOriginal: {
          cliente_id: clienteId,
          tipo: 'debito',
          origem: 'reembolso_cliente',
          valor: valorSolicitado,
          status: 'efetivado',
          descricao: `Reembolso pago ao cliente no valor de R$ ${valorSolicitado.toFixed(2)}.`,
          solicitacao_reembolso_id: reembolsoId,
          referencia_pagamento: referenciaPagamento || null,
          comprovante_url: comprovanteUrl || reembolso.comprovante_url || null,
          metadata: {
            reembolso_id: reembolsoId,
            admin_id: adminId,
            chave_pix: reembolso.chave_pix || null,
            titular_nome: reembolso.titular_nome || null,
            titular_documento: reembolso.titular_documento || null,
          },
          created_at: agora,
        },
      })

      const atualizado = await atualizarComFallback({
        supabase,
        tabela: 'solicitacoes_reembolso',
        id: reembolsoId,
        payloadOriginal: {
          status: 'pago',
          pago_em: agora,
          pago_por: adminId,
          referencia_pagamento: referenciaPagamento || reembolso.referencia_pagamento || null,
          comprovante_url: comprovanteUrl || reembolso.comprovante_url || null,
          saldo_movimentacao_id: movimentacao?.id || reembolso.saldo_movimentacao_id || null,
          observacao_admin: observacaoAdmin || reembolso.observacao_admin || null,
          updated_at: agora,
        },
      })

      try {
        await supabase.rpc('recalcular_saldo_cliente', {
          p_cliente_id: clienteId,
        })
      } catch (error) {
        console.warn('[admin/saldos/reembolsos] Aviso ao recalcular saldo após pagamento:', error)
      }

      return NextResponse.json({
        sucesso: true,
        reembolso: atualizado,
        movimentacao,
        mensagem: 'Pagamento do reembolso registrado com sucesso.',
      })
    }

    return NextResponse.json(
      {
        sucesso: false,
        erro: 'Ação inválida. Use aprovar, em_analise, recusar, cancelar ou pagar.',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Erro em PATCH /api/admin/saldos/reembolsos:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao atualizar solicitação de reembolso.',
      },
      { status: 500 }
    )
  }
}
