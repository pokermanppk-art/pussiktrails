import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

function texto(valor: unknown) {
  return String(valor || '').trim()
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

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function statusPermitido(status: string) {
  const statusNorm = normalizar(status)

  return [
    'novo',
    'pendente',
    'solicitado',
    'em_analise',
    'aprovado',
    'recusado',
    'cancelado',
    'pago',
  ].includes(statusNorm)
}

function erroDeColunaAusente(error: any) {
  const textoErro = String(
    error?.message || error?.details || error?.hint || ''
  ).toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    textoErro.includes('could not find') ||
    textoErro.includes('schema cache') ||
    textoErro.includes('column')
  )
}

function extrairColunaAusente(error: any) {
  const textoErro = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')

  const matchAspas = textoErro.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  const matchColumn = textoErro.match(/column\s+([a-zA-Z0-9_]+)/i)
  if (matchColumn?.[1]) return matchColumn[1]

  return ''
}

async function atualizarSaqueComFallback(params: {
  supabase: SupabaseAdmin
  saqueId: string
  payloadOriginal: AnyRecord
}) {
  const { supabase, saqueId, payloadOriginal } = params
  let payloadAtual = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 18; tentativa++) {
    const { data, error } = await supabase
      .from('solicitacoes_saque_guias')
      .update(payloadAtual)
      .eq('id', saqueId)
      .select('*')
      .maybeSingle()

    if (!error) return data

    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payloadAtual)) throw error

    delete payloadAtual[coluna]
  }

  throw new Error('Não foi possível atualizar a solicitação de saque.')
}

async function registrarLog(params: {
  supabase: SupabaseAdmin
  saqueId: string
  guiaId?: string | null
  adminId?: string | null
  status: string
  observacaoAdmin?: string | null
  repasseId?: string | null
  comprovanteUrl?: string | null
}) {
  const {
    supabase,
    saqueId,
    guiaId,
    adminId,
    status,
    observacaoAdmin,
    repasseId,
    comprovanteUrl,
  } = params

  try {
    await supabase.from('logs_atividades').insert({
      usuario_id: guiaId || adminId || null,
      tipo_usuario: guiaId ? 'guia' : 'admin',
      escopo: 'admin',
      tipo_evento: 'saque_guia_status_admin',
      titulo: 'Solicitação de saque atualizada pelo Admin',
      mensagem: `Solicitação de saque ${saqueId} atualizada para ${status}.`,
      metadata: {
        saque_id: saqueId,
        guia_id: guiaId || null,
        admin_id: adminId || null,
        status,
        observacao_admin: observacaoAdmin || null,
        repasse_id: repasseId || null,
        comprovante_url: comprovanteUrl || null,
      },
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.warn('[admin/financeiro/saques] Não foi possível registrar log:', error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)

    const status = normalizar(searchParams.get('status') || 'todos')
    const guiaId = texto(searchParams.get('guiaId') || searchParams.get('guia_id'))
    const limite = Math.min(Number(searchParams.get('limite') || 200), 500)

    let query = supabase
      .from('solicitacoes_saque_guias')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite)

    if (guiaId) {
      query = query.eq('guia_id', guiaId)
    }

    if (status && status !== 'todos') {
      if (status === 'pendentes') {
        query = query.in('status', ['novo', 'pendente', 'solicitado', 'em_analise'])
      } else if (status === 'aprovados') {
        query = query.in('status', ['aprovado', 'aprovada'])
      } else if (status === 'pagos') {
        query = query.in('status', ['pago', 'paga', 'concluido', 'concluida'])
      } else if (status === 'recusados') {
        query = query.in('status', ['recusado', 'recusada', 'cancelado', 'cancelada'])
      } else {
        query = query.eq('status', status)
      }
    }

    const { data: saques, error } = await query

    if (error) {
      return NextResponse.json(
        { sucesso: false, erro: error.message },
        { status: 500 }
      )
    }

    const lista = Array.isArray(saques) ? (saques as AnyRecord[]) : []
    const guiaIds = Array.from(
      new Set(lista.map((item) => texto(item.guia_id)).filter(Boolean))
    )

    let usuarios: AnyRecord[] = []

    if (guiaIds.length > 0) {
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('users')
        .select('id, nome, name, email, pix_tipo, pix_chave, avatar_url, foto_url, imagem_url')
        .in('id', guiaIds)

      if (usuariosError) {
        console.warn('[admin/financeiro/saques] Erro ao buscar guias:', usuariosError)
      }

      usuarios = (usuariosData || []) as AnyRecord[]
    }

    const usuariosPorId = new Map<string, AnyRecord>()
    usuarios.forEach((usuario) => {
      if (usuario?.id) usuariosPorId.set(String(usuario.id), usuario)
    })

    const saquesEnriquecidos: AnyRecord[] = lista.map((saque: AnyRecord): AnyRecord => {
      const guia = usuariosPorId.get(texto(saque.guia_id)) || {}

      return {
        ...saque,
        guia_nome:
          guia.nome ||
          guia.name ||
          guia.email ||
          saque?.metadata?.guia_nome ||
          `Guia ${texto(saque.guia_id).slice(0, 8)}`,
        guia_email: guia.email || saque?.metadata?.guia_email || '',
        guia_pix_tipo: guia.pix_tipo || '',
        guia_pix_chave: guia.pix_chave || '',
        guia_avatar: guia.avatar_url || guia.foto_url || guia.imagem_url || '',
      }
    })

    const resumo = saquesEnriquecidos.reduce<{
      total: number
      pendentes: number
      aprovados: number
      pagos: number
      recusados: number
      valor_pendente: number
      valor_aprovado: number
      valor_pago: number
    }>(
      (acc, saque: AnyRecord) => {
        const statusNorm = normalizar(saque.status || 'novo')
        const valor = Number(saque.valor_solicitado || 0)

        acc.total += 1

        if (['novo', 'pendente', 'solicitado', 'em_analise'].includes(statusNorm)) {
          acc.pendentes += 1
          acc.valor_pendente += valor
        }

        if (['aprovado', 'aprovada'].includes(statusNorm)) {
          acc.aprovados += 1
          acc.valor_aprovado += valor
        }

        if (['pago', 'paga', 'concluido', 'concluida'].includes(statusNorm)) {
          acc.pagos += 1
          acc.valor_pago += valor
        }

        if (['recusado', 'recusada', 'cancelado', 'cancelada'].includes(statusNorm)) {
          acc.recusados += 1
        }

        return acc
      },
      {
        total: 0,
        pendentes: 0,
        aprovados: 0,
        pagos: 0,
        recusados: 0,
        valor_pendente: 0,
        valor_aprovado: 0,
        valor_pago: 0,
      }
    )

    return NextResponse.json({
      sucesso: true,
      saques: saquesEnriquecidos,
      resumo,
    })
  } catch (error: any) {
    console.error('[admin/financeiro/saques][GET] Erro:', error)

    return NextResponse.json(
      { sucesso: false, erro: error?.message || 'Erro ao listar solicitações de saque.' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({} as AnyRecord))

    const saqueId = texto(body.saqueId || body.saque_id || body.id)
    const statusNovo = normalizar(body.status || body.statusNovo || body.status_novo)
    const adminId = texto(body.adminId || body.admin_id || body.respondidoPor || body.respondido_por)
    const observacaoAdmin = texto(body.observacaoAdmin || body.observacao_admin)
    const comprovanteUrl = texto(body.comprovanteUrl || body.comprovante_url)
    const comprovanteReferencia = texto(body.comprovanteReferencia || body.comprovante_referencia)
    const comprovanteNome = texto(body.comprovanteNome || body.comprovante_nome)
    const comprovanteMimeType = texto(body.comprovanteMimeType || body.comprovante_mime_type)
    const comprovanteTamanhoBytes = Number(body.comprovanteTamanhoBytes || body.comprovante_tamanho_bytes || 0)
    const comprovanteStoragePath = texto(body.comprovanteStoragePath || body.comprovante_storage_path)
    const repasseId = texto(body.repasseId || body.repasse_id)

    if (!saqueId) {
      return NextResponse.json(
        { sucesso: false, erro: 'saqueId é obrigatório.' },
        { status: 400 }
      )
    }

    if (!statusNovo || !statusPermitido(statusNovo)) {
      return NextResponse.json(
        { sucesso: false, erro: 'Status inválido para solicitação de saque.' },
        { status: 400 }
      )
    }

    const { data: saqueAtual, error: buscaError } = await supabase
      .from('solicitacoes_saque_guias')
      .select('*')
      .eq('id', saqueId)
      .maybeSingle()

    if (buscaError) {
      return NextResponse.json(
        { sucesso: false, erro: buscaError.message },
        { status: 500 }
      )
    }

    if (!saqueAtual) {
      return NextResponse.json(
        { sucesso: false, erro: 'Solicitação de saque não encontrada.' },
        { status: 404 }
      )
    }

    const statusAtual = normalizar(saqueAtual.status)

    if (['pago', 'paga', 'concluido', 'concluida'].includes(statusAtual) && statusNovo !== 'pago') {
      return NextResponse.json(
        { sucesso: false, erro: 'Esta solicitação já foi paga e não pode voltar de status.' },
        { status: 409 }
      )
    }

    if (['recusado', 'recusada', 'cancelado', 'cancelada'].includes(statusAtual) && statusNovo !== 'recusado') {
      return NextResponse.json(
        { sucesso: false, erro: 'Esta solicitação já foi recusada/cancelada.' },
        { status: 409 }
      )
    }

    const agora = new Date().toISOString()

    const payload: AnyRecord = {
      status: statusNovo,
      observacao_admin: observacaoAdmin || saqueAtual.observacao_admin || null,
      respondido_por: adminId || saqueAtual.respondido_por || null,
      respondido_em: agora,
      updated_at: agora,
    }

    if (comprovanteUrl) payload.comprovante_url = comprovanteUrl
    if (comprovanteReferencia) payload.comprovante_referencia = comprovanteReferencia
    if (comprovanteNome) payload.comprovante_nome = comprovanteNome
    if (comprovanteMimeType) payload.comprovante_mime_type = comprovanteMimeType
    if (comprovanteTamanhoBytes > 0) payload.comprovante_tamanho_bytes = comprovanteTamanhoBytes
    if (comprovanteStoragePath) payload.comprovante_storage_path = comprovanteStoragePath
    if (repasseId) payload.repasse_id = repasseId

    const saque = await atualizarSaqueComFallback({
      supabase,
      saqueId,
      payloadOriginal: payload,
    })

    await registrarLog({
      supabase,
      saqueId,
      guiaId: saqueAtual.guia_id || null,
      adminId: adminId || null,
      status: statusNovo,
      observacaoAdmin,
      repasseId: repasseId || null,
      comprovanteUrl: comprovanteUrl || null,
    })

    return NextResponse.json({
      sucesso: true,
      message: 'Solicitação de saque atualizada.',
      saque,
    })
  } catch (error: any) {
    console.error('[admin/financeiro/saques][PATCH] Erro:', error)

    return NextResponse.json(
      { sucesso: false, erro: error?.message || 'Erro ao atualizar solicitação de saque.' },
      { status: 500 }
    )
  }
}
