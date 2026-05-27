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

function numero(valor: unknown) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0

  const normalizado = String(valor || '')
    .replace(/R\$/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  const n = Number(normalizado)
  return Number.isFinite(n) ? n : 0
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({} as AnyRecord))

    const clienteId = texto(
      body.clienteId ||
        body.cliente_id ||
        body.usuarioId ||
        body.usuario_id
    )

    const valorSolicitado = numero(
      body.valorSolicitado ||
        body.valor_solicitado ||
        body.valor
    )

    const pixTipo = texto(body.pixTipo || body.pix_tipo || 'cpf')
    const chavePix = texto(body.chavePix || body.chave_pix || body.pixChave || body.pix_chave)
    const titularNome = texto(body.titularNome || body.titular_nome)
    const titularDocumento = texto(body.titularDocumento || body.titular_documento)
    const motivo = texto(body.motivo) || 'Solicitação de reembolso do Saldo de Jornada.'

    if (!clienteId) {
      return NextResponse.json(
        { sucesso: false, erro: 'clienteId é obrigatório.' },
        { status: 400 }
      )
    }

    if (!valorSolicitado || valorSolicitado <= 0) {
      return NextResponse.json(
        { sucesso: false, erro: 'Informe um valor válido para reembolso.' },
        { status: 400 }
      )
    }

    if (!chavePix) {
      return NextResponse.json(
        { sucesso: false, erro: 'A chave PIX é obrigatória.' },
        { status: 400 }
      )
    }

    if (!titularNome) {
      return NextResponse.json(
        { sucesso: false, erro: 'O nome do titular do PIX é obrigatório.' },
        { status: 400 }
      )
    }

    try {
      await supabase.rpc('recalcular_saldo_cliente', {
        p_cliente_id: clienteId,
      })
    } catch (rpcError) {
      console.warn('Aviso ao recalcular saldo antes do reembolso:', rpcError)
    }

    const { data: saldo, error: saldoError } = await supabase
      .from('cliente_saldos')
      .select('*')
      .eq('cliente_id', clienteId)
      .maybeSingle()

    if (saldoError) throw saldoError

    const saldoDisponivel = numero((saldo as AnyRecord | null)?.saldo_disponivel)

    if (valorSolicitado > saldoDisponivel) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: `O valor solicitado (${valorSolicitado.toFixed(2)}) é maior que o saldo disponível (${saldoDisponivel.toFixed(2)}).`,
        },
        { status: 400 }
      )
    }

    const { data: pendentes, error: pendentesError } = await supabase
      .from('solicitacoes_reembolso')
      .select('id, status')
      .eq('cliente_id', clienteId)
      .in('status', ['pendente', 'em_analise', 'aprovado'])
      .limit(1)

    if (pendentesError) throw pendentesError

    if ((pendentes || []).length > 0) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Já existe uma solicitação de reembolso em análise para este cliente.',
        },
        { status: 409 }
      )
    }

    const payload: AnyRecord = {
      cliente_id: clienteId,
      valor_solicitado: valorSolicitado,
      motivo,
      pix_tipo: pixTipo,
      chave_pix: chavePix,
      titular_nome: titularNome,
      titular_documento: titularDocumento || null,
      status: 'pendente',
      moeda: 'BRL',
      metadata: {
        origem: 'cliente_minhas_reservas',
        saldo_disponivel_no_momento: saldoDisponivel,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: reembolso, error: insertError } = await supabase
      .from('solicitacoes_reembolso')
      .insert(payload)
      .select('*')
      .single()

    if (insertError) throw insertError

    return NextResponse.json({
      sucesso: true,
      reembolso,
      mensagem: 'Solicitação de reembolso enviada ao Admin.',
    })
  } catch (error) {
    console.error('Erro em POST /api/cliente/saldo/solicitar-reembolso:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao solicitar reembolso.',
      },
      { status: 500 }
    )
  }
}
