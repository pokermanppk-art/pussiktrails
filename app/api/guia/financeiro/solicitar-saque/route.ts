import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

function texto(valor: unknown) {
  return String(valor || '').trim()
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

async function registrarLog(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>
  guiaId: string
  saqueId?: string | null
  valor: number
  pixTipo: string
  titularNome: string
}) {
  const { supabase, guiaId, saqueId, valor, pixTipo, titularNome } = params

  try {
    await supabase.from('logs_atividades').insert({
      usuario_id: guiaId,
      tipo_usuario: 'guia',
      escopo: 'admin',
      tipo_evento: 'solicitacao_saque_guia',
      titulo: 'Solicitação de saque enviada pelo guia',
      mensagem: `Guia solicitou saque de R$ ${valor.toFixed(2)} para chave PIX ${pixTipo}.`,
      metadata: {
        guia_id: guiaId,
        saque_id: saqueId || null,
        valor,
        pix_tipo: pixTipo,
        titular_nome: titularNome,
      },
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.warn('[guia/financeiro/solicitar-saque] Não foi possível registrar log:', error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const guiaId = texto(searchParams.get('guiaId') || searchParams.get('guia_id'))

    if (!guiaId) {
      return NextResponse.json(
        { sucesso: false, erro: 'guiaId é obrigatório.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('solicitacoes_saque_guias')
      .select('*')
      .eq('guia_id', guiaId)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      return NextResponse.json(
        { sucesso: false, erro: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sucesso: true,
      saques: data || [],
    })
  } catch (error: any) {
    console.error('[guia/financeiro/solicitar-saque][GET] Erro:', error)

    return NextResponse.json(
      { sucesso: false, erro: error?.message || 'Erro ao listar saques.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({} as AnyRecord))

    const guiaId = texto(body.guiaId || body.guia_id || body.userId || body.usuarioId)
    const valorSolicitado = numero(body.valorSolicitado || body.valor_solicitado)
    const valorDisponivel = numero(body.valorDisponivel || body.valor_disponivel || body.saldoDisponivel)
    const pixTipo = texto(body.pixTipo || body.pix_tipo)
    const pixChave = texto(body.pixChave || body.pix_chave)
    const titularNome = texto(body.titularNome || body.titular_nome)
    const observacaoGuia = texto(body.observacaoGuia || body.observacao_guia)

    if (!guiaId) {
      return NextResponse.json(
        { sucesso: false, erro: 'guiaId é obrigatório.' },
        { status: 400 }
      )
    }

    if (valorSolicitado <= 0) {
      return NextResponse.json(
        { sucesso: false, erro: 'Valor solicitado inválido.' },
        { status: 400 }
      )
    }

    if (valorDisponivel > 0 && valorSolicitado > valorDisponivel) {
      return NextResponse.json(
        { sucesso: false, erro: 'Valor solicitado maior que o saldo disponível.' },
        { status: 400 }
      )
    }

    if (!pixTipo || !pixChave) {
      return NextResponse.json(
        { sucesso: false, erro: 'Informe o tipo e a chave PIX.' },
        { status: 400 }
      )
    }

    if (!titularNome) {
      return NextResponse.json(
        { sucesso: false, erro: 'Informe o nome do titular da chave PIX.' },
        { status: 400 }
      )
    }

    const { data: guia, error: guiaError } = await supabase
      .from('users')
      .select('id, nome, email, tipo')
      .eq('id', guiaId)
      .maybeSingle()

    if (guiaError) {
      return NextResponse.json(
        { sucesso: false, erro: guiaError.message },
        { status: 500 }
      )
    }

    if (!guia) {
      return NextResponse.json(
        { sucesso: false, erro: 'Guia não encontrado.' },
        { status: 404 }
      )
    }

    const { data: pendentes, error: pendentesError } = await supabase
      .from('solicitacoes_saque_guias')
      .select('id, status, valor_solicitado, created_at')
      .eq('guia_id', guiaId)
      .in('status', ['novo', 'pendente', 'solicitado', 'em_analise'])
      .limit(1)

    if (pendentesError) {
      return NextResponse.json(
        { sucesso: false, erro: pendentesError.message },
        { status: 500 }
      )
    }

    if (Array.isArray(pendentes) && pendentes.length > 0) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Já existe uma solicitação de saque em análise. Aguarde a resposta do Admin.',
          saque: pendentes[0],
        },
        { status: 409 }
      )
    }

    const agora = new Date().toISOString()

    const payload = {
      guia_id: guiaId,
      valor_solicitado: valorSolicitado,
      valor_disponivel_no_momento: valorDisponivel,
      pix_tipo: pixTipo,
      pix_chave: pixChave,
      titular_nome: titularNome,
      status: 'novo',
      observacao_guia: observacaoGuia || null,
      metadata: {
        origem: 'guia_financeiro',
        guia_nome: guia.nome || guia.email || null,
        guia_email: guia.email || null,
      },
      created_at: agora,
      updated_at: agora,
    }

    const { data: saque, error: insertError } = await supabase
      .from('solicitacoes_saque_guias')
      .insert(payload)
      .select('*')
      .maybeSingle()

    if (insertError) {
      return NextResponse.json(
        { sucesso: false, erro: insertError.message },
        { status: 500 }
      )
    }

    await registrarLog({
      supabase,
      guiaId,
      saqueId: saque?.id || null,
      valor: valorSolicitado,
      pixTipo,
      titularNome,
    })

    return NextResponse.json({
      sucesso: true,
      message: 'Solicitação de saque enviada ao Admin.',
      saque,
    })
  } catch (error: any) {
    console.error('[guia/financeiro/solicitar-saque][POST] Erro:', error)

    return NextResponse.json(
      { sucesso: false, erro: error?.message || 'Erro ao solicitar saque.' },
      { status: 500 }
    )
  }
}
