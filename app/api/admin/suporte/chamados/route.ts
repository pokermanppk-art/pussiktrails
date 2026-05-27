import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

type ChamadoComUsuario = AnyRecord & {
  id: string
  usuario_id?: string | null
  tipo_usuario?: string | null
  tipo_chamado?: string | null
  assunto?: string | null
  descricao?: string | null
  pagina_origem?: string | null
  prioridade?: string | null
  status?: string | null
  resposta_admin?: string | null
  respondido_em?: string | null
  respondido_por_id?: string | null
  nota_resposta_admin?: number | null
  avaliacao_resposta_nota?: number | null
  comentario_avaliacao_resposta?: string | null
  avaliacao_resposta_comentario?: string | null
  avaliado_em?: string | null
  concluido_em?: string | null
  finalizado_em?: string | null
  created_at?: string | null
  updated_at?: string | null
  usuario_nome?: string | null
  usuario_email?: string | null
  usuario_avatar?: string | null
}

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

function idOuNull(valor: unknown) {
  const id = texto(valor)
  return id || null
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function normalizarTipo(valor: unknown) {
  const tipo = normalizar(valor)

  if (tipo === 'bug') return 'bug'
  if (tipo === 'sugestao' || tipo === 'sugestão') return 'sugestao'

  return 'suporte'
}

function normalizarTipoUsuario(valor: unknown) {
  const tipo = normalizar(valor)

  if (tipo === 'guia') return 'guia'
  if (tipo === 'admin') return 'admin'
  if (tipo === 'sistema') return 'sistema'

  return 'cliente'
}

function normalizarPrioridade(valor: unknown) {
  const prioridade = normalizar(valor)

  if (prioridade === 'baixa') return 'baixa'
  if (prioridade === 'alta') return 'alta'
  if (prioridade === 'urgente') return 'urgente'

  return 'normal'
}

function normalizarStatus(valor: unknown) {
  const status = normalizar(valor)

  if (status === 'em_analise') return 'em_analise'
  if (status === 'respondido') return 'respondido'
  if (status === 'resolvido') return 'resolvido'
  if (status === 'arquivado') return 'arquivado'

  return 'novo'
}

function numeroNota(valor: unknown) {
  const nota = Number(valor || 0)
  return Number.isFinite(nota) ? nota : 0
}

function notaDoChamado(chamado: ChamadoComUsuario) {
  return numeroNota(
    chamado.nota_resposta_admin ||
      chamado.avaliacao_resposta_nota ||
      chamado.avaliacao_nota ||
      chamado.nota ||
      0
  )
}

function montarResumo(chamados: ChamadoComUsuario[]) {
  const notas = chamados
    .map(notaDoChamado)
    .filter((nota) => nota >= 1 && nota <= 5)

  const somaNotas = notas.reduce((total, nota) => total + nota, 0)

  return chamados.reduce(
    (acc, item) => {
      const status = item.status || 'novo'
      const tipo = item.tipo_chamado || 'suporte'
      const prioridade = item.prioridade || 'normal'

      acc.total += 1
      acc.porStatus[status] = (acc.porStatus[status] || 0) + 1
      acc.porTipo[tipo] = (acc.porTipo[tipo] || 0) + 1
      acc.porPrioridade[prioridade] = (acc.porPrioridade[prioridade] || 0) + 1

      if (status === 'novo') acc.novos += 1
      if (status === 'em_analise') acc.emAnalise += 1
      if (status === 'respondido') acc.respondidos += 1
      if (status === 'resolvido') acc.resolvidos += 1
      if (prioridade === 'urgente') acc.urgentes += 1
      if (tipo === 'bug') acc.bugs += 1

      return acc
    },
    {
      total: 0,
      novos: 0,
      emAnalise: 0,
      respondidos: 0,
      resolvidos: 0,
      urgentes: 0,
      bugs: 0,
      mediaNotaResposta: notas.length > 0 ? somaNotas / notas.length : 0,
      totalAvaliacoesResposta: notas.length,
      porStatus: {} as Record<string, number>,
      porTipo: {} as Record<string, number>,
      porPrioridade: {} as Record<string, number>,
    }
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)

    const usuarioId = texto(searchParams.get('usuarioId') || searchParams.get('usuario_id'))
    const tipoUsuario = texto(searchParams.get('tipoUsuario') || searchParams.get('tipo_usuario') || 'todos')
    const status = texto(searchParams.get('status') || 'todos')
    const tipo = texto(searchParams.get('tipo') || 'todos')
    const prioridade = texto(searchParams.get('prioridade') || 'todas')
    const busca = normalizar(searchParams.get('busca'))
    const limite = Math.min(1000, Math.max(20, Number(searchParams.get('limite') || 300)))

    let query = supabase
      .from('suporte_chamados')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite)

    if (usuarioId) query = query.eq('usuario_id', usuarioId)
    if (tipoUsuario !== 'todos') query = query.eq('tipo_usuario', normalizarTipoUsuario(tipoUsuario))
    if (status !== 'todos') query = query.eq('status', normalizarStatus(status))
    if (tipo !== 'todos') query = query.eq('tipo_chamado', normalizarTipo(tipo))
    if (prioridade !== 'todas') query = query.eq('prioridade', normalizarPrioridade(prioridade))

    const { data, error } = await query

    if (error) throw error

    const listaBase = (data || []) as AnyRecord[]
    const usuarioIds = Array.from(
      new Set(listaBase.map((item) => item.usuario_id).filter(Boolean))
    )

    let usuarios: AnyRecord[] = []

    if (usuarioIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, nome, name, full_name, email, avatar_url, foto_url, imagem_url')
        .in('id', usuarioIds)

      if (usersError) {
        console.warn('[admin/suporte/chamados] Aviso ao buscar usuários:', usersError)
      }

      usuarios = (users || []) as AnyRecord[]
    }

    /**
     * Importante:
     * manter o spread `...item` para preservar campos do chamado como
     * resposta_admin, status, prioridade, notas e datas.
     */
    const lista: ChamadoComUsuario[] = listaBase.map((item: AnyRecord) => {
      const usuario =
        usuarios.find((registro) => String(registro.id) === String(item.usuario_id)) || {}

      return {
        ...item,
        usuario_nome:
          usuario.nome ||
          usuario.name ||
          usuario.full_name ||
          usuario.email ||
          item.usuario_nome ||
          'Usuário',
        usuario_email: usuario.email || item.usuario_email || '',
        usuario_avatar:
          usuario.avatar_url ||
          usuario.foto_url ||
          usuario.imagem_url ||
          item.usuario_avatar ||
          '',
      } as ChamadoComUsuario
    })

    const filtrada: ChamadoComUsuario[] = busca
      ? lista.filter((item) => {
          const alvo = normalizar(
            [
              item.usuario_nome,
              item.usuario_email,
              item.tipo_usuario,
              item.tipo_chamado,
              item.status,
              item.prioridade,
              item.assunto,
              item.descricao,
              item.resposta_admin,
              item.pagina_origem,
              item.id,
            ].join(' ')
          )

          return alvo.includes(busca)
        })
      : lista

    const resumo = montarResumo(filtrada)

    return NextResponse.json({
      sucesso: true,
      success: true,
      chamados: filtrada,
      suporte_chamados: filtrada,
      items: filtrada,
      resumo,
    })
  } catch (error) {
    console.error('Erro em GET /api/admin/suporte/chamados:', error)

    return NextResponse.json(
      {
        sucesso: false,
        success: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao carregar chamados de suporte.',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()

    const chamadoId = texto(body.chamadoId || body.chamado_id || body.id)

    if (!chamadoId) {
      return NextResponse.json(
        { sucesso: false, success: false, erro: 'chamadoId é obrigatório.' },
        { status: 400 }
      )
    }

    const respostaAdmin = texto(body.respostaAdmin || body.resposta_admin)
    const respondidoPorId = idOuNull(
      body.respondidoPorId ||
        body.respondido_por_id ||
        body.adminId ||
        body.admin_id
    )
    const status = normalizarStatus(body.status)
    const prioridade = body.prioridade ? normalizarPrioridade(body.prioridade) : ''

    const payload: AnyRecord = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (prioridade) payload.prioridade = prioridade

    if (respostaAdmin) {
      payload.resposta_admin = respostaAdmin
      payload.respondido_por_id = respondidoPorId
      payload.respondido_em = new Date().toISOString()

      if (status === 'novo' || status === 'em_analise') {
        payload.status = 'respondido'
      }
    }

    const { data, error } = await supabase
      .from('suporte_chamados')
      .update(payload)
      .eq('id', chamadoId)
      .select('*')
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({
      sucesso: true,
      success: true,
      chamado: data,
    })
  } catch (error) {
    console.error('Erro em PATCH /api/admin/suporte/chamados:', error)

    return NextResponse.json(
      {
        sucesso: false,
        success: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao atualizar chamado.',
      },
      { status: 500 }
    )
  }
}
