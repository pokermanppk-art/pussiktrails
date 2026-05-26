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

function idOuNull(valor: unknown) {
  const id = texto(valor)
  return id || null
}

function normalizarTipo(valor: unknown) {
  const tipo = texto(valor).toLowerCase()
  if (tipo === 'bug') return 'bug'
  if (tipo === 'sugestao' || tipo === 'sugestão') return 'sugestao'
  return 'suporte'
}

function normalizarTipoUsuario(valor: unknown) {
  const tipo = texto(valor).toLowerCase()
  if (tipo === 'guia') return 'guia'
  if (tipo === 'admin') return 'admin'
  if (tipo === 'sistema') return 'sistema'
  return 'cliente'
}

function normalizarPrioridade(valor: unknown) {
  const prioridade = texto(valor).toLowerCase()
  if (prioridade === 'baixa') return 'baixa'
  if (prioridade === 'alta') return 'alta'
  if (prioridade === 'urgente') return 'urgente'
  return 'normal'
}

function normalizarStatus(valor: unknown) {
  const status = texto(valor).toLowerCase()
  if (status === 'em_analise') return 'em_analise'
  if (status === 'respondido') return 'respondido'
  if (status === 'resolvido') return 'resolvido'
  if (status === 'arquivado') return 'arquivado'
  return 'novo'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()

    const usuarioId = idOuNull(body.usuarioId || body.usuario_id || body.userId || body.user_id)
    const tipoUsuario = normalizarTipoUsuario(body.tipoUsuario || body.tipo_usuario)
    const tipoChamado = normalizarTipo(body.tipoChamado || body.tipo_chamado || body.tipo)
    const assunto = texto(body.assunto)
    const descricao = texto(body.descricao)
    const paginaOrigem = texto(body.paginaOrigem || body.pagina_origem || body.rota || body.url)
    const prioridade = normalizarPrioridade(body.prioridade)

    if (!assunto) {
      return NextResponse.json(
        { sucesso: false, erro: 'Informe o assunto da solicitação.' },
        { status: 400 }
      )
    }

    if (!descricao || descricao.length < 8) {
      return NextResponse.json(
        { sucesso: false, erro: 'Descreva melhor o que aconteceu.' },
        { status: 400 }
      )
    }

    const userAgent = request.headers.get('user-agent') || ''

    const { data, error } = await supabase
      .from('suporte_chamados')
      .insert({
        usuario_id: usuarioId,
        tipo_usuario: tipoUsuario,
        tipo_chamado: tipoChamado,
        assunto,
        descricao,
        pagina_origem: paginaOrigem || null,
        navegador: texto(body.navegador) || null,
        dispositivo: texto(body.dispositivo) || null,
        user_agent: userAgent,
        prioridade,
        status: 'novo',
        metadata: body.metadata || {},
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({
      sucesso: true,
      chamado: data,
      mensagem: 'Solicitação enviada com sucesso.',
    })
  } catch (error) {
    console.error('Erro em POST /api/suporte/chamados:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao enviar solicitação de suporte.',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)

    const usuarioId = texto(searchParams.get('usuarioId') || searchParams.get('usuario_id'))
    const status = texto(searchParams.get('status') || 'todos')
    const tipo = texto(searchParams.get('tipo') || 'todos')
    const prioridade = texto(searchParams.get('prioridade') || 'todas')
    const busca = texto(searchParams.get('busca')).toLowerCase()
    const limite = Math.min(500, Math.max(20, Number(searchParams.get('limite') || 200)))

    let query = supabase
      .from('suporte_chamados')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite)

    if (usuarioId) query = query.eq('usuario_id', usuarioId)
    if (status !== 'todos') query = query.eq('status', normalizarStatus(status))
    if (tipo !== 'todos') query = query.eq('tipo_chamado', normalizarTipo(tipo))
    if (prioridade !== 'todas') query = query.eq('prioridade', normalizarPrioridade(prioridade))

    const { data, error } = await query

    if (error) throw error

    const listaBase: AnyRecord[] = (data || []) as AnyRecord[]
    const usuarioIds = Array.from(new Set(listaBase.map((item) => item.usuario_id).filter(Boolean)))

    let usuarios: AnyRecord[] = []

    if (usuarioIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .in('id', usuarioIds)

      usuarios = (users || []) as AnyRecord[]
    }

    const lista: AnyRecord[] = listaBase.map((item) => {
      const usuario = usuarios.find((user) => String(user.id) === String(item.usuario_id)) || {}

      return {
        ...item,
        usuario_nome:
          usuario.nome ||
          usuario.name ||
          usuario.full_name ||
          usuario.email ||
          'Usuário',
        usuario_email: usuario.email || '',
        usuario_avatar: usuario.avatar_url || usuario.foto_url || usuario.imagem_url || '',
      }
    })

    const filtrada = busca
      ? lista.filter((item) => {
          const alvo = [
            item.usuario_nome,
            item.usuario_email,
            item.assunto,
            item.descricao,
            item.tipo_chamado,
            item.status,
            item.pagina_origem,
            item.id,
          ]
            .join(' ')
            .toLowerCase()

          return alvo.includes(busca)
        })
      : lista

    const resumo = filtrada.reduce(
      (acc, item) => {
        acc.total += 1
        acc.porStatus[item.status || 'novo'] = (acc.porStatus[item.status || 'novo'] || 0) + 1
        acc.porTipo[item.tipo_chamado || 'suporte'] = (acc.porTipo[item.tipo_chamado || 'suporte'] || 0) + 1
        acc.porPrioridade[item.prioridade || 'normal'] = (acc.porPrioridade[item.prioridade || 'normal'] || 0) + 1
        return acc
      },
      {
        total: 0,
        porStatus: {} as Record<string, number>,
        porTipo: {} as Record<string, number>,
        porPrioridade: {} as Record<string, number>,
      }
    )

    return NextResponse.json({
      sucesso: true,
      chamados: filtrada,
      resumo,
    })
  } catch (error) {
    console.error('Erro em GET /api/suporte/chamados:', error)

    return NextResponse.json(
      {
        sucesso: false,
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
        { sucesso: false, erro: 'chamadoId é obrigatório.' },
        { status: 400 }
      )
    }

    const respostaAdmin = texto(body.respostaAdmin || body.resposta_admin)
    const respondidoPorId = idOuNull(body.respondidoPorId || body.respondido_por_id || body.adminId || body.admin_id)
    const status = normalizarStatus(body.status)
    const prioridade = body.prioridade ? normalizarPrioridade(body.prioridade) : undefined

    const payload: AnyRecord = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (prioridade) payload.prioridade = prioridade

    if (respostaAdmin) {
      payload.resposta_admin = respostaAdmin
      payload.respondido_por_id = respondidoPorId
      payload.respondido_em = new Date().toISOString()
      if (status === 'novo' || status === 'em_analise') payload.status = 'respondido'
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
      chamado: data,
    })
  } catch (error) {
    console.error('Erro em PATCH /api/suporte/chamados:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao atualizar chamado.',
      },
      { status: 500 }
    )
  }
}
