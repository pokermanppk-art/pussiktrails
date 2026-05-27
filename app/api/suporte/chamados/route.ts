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
  if (status === 'resolvido' || status === 'concluido' || status === 'concluído' || status === 'finalizado') return 'resolvido'
  if (status === 'arquivado') return 'arquivado'
  return 'novo'
}

function normalizarAcao(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function normalizarNota(valor: unknown) {
  const nota = Number(valor)

  if (!Number.isFinite(nota)) return 0

  return Math.max(0, Math.min(5, Math.round(nota)))
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

    const usuarioId = texto(
      searchParams.get('usuarioId') ||
        searchParams.get('usuario_id') ||
        searchParams.get('userId') ||
        searchParams.get('user_id')
    )
    const tipoUsuario = texto(searchParams.get('tipoUsuario') || searchParams.get('tipo_usuario') || 'todos')
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
    if (tipoUsuario !== 'todos') query = query.eq('tipo_usuario', normalizarTipoUsuario(tipoUsuario))
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

    const acao = normalizarAcao(body.acao || body.action || body.operacao)

    if (acao === 'finalizar' || acao === 'avaliar' || acao === 'concluir') {
      const usuarioId = idOuNull(body.usuarioId || body.usuario_id || body.userId || body.user_id)
      const tipoUsuario = normalizarTipoUsuario(body.tipoUsuario || body.tipo_usuario)
      const nota = normalizarNota(
        body.nota ||
          body.avaliacaoNota ||
          body.avaliacao_nota ||
          body.avaliacao_resposta_nota
      )
      const comentario = texto(
        body.comentario ||
          body.avaliacaoComentario ||
          body.avaliacao_comentario ||
          body.avaliacao_resposta_comentario
      )

      if (!usuarioId) {
        return NextResponse.json(
          { sucesso: false, erro: 'usuarioId é obrigatório para finalizar o chamado.' },
          { status: 400 }
        )
      }

      if (nota < 1 || nota > 5) {
        return NextResponse.json(
          { sucesso: false, erro: 'Informe uma nota de 1 a 5 para avaliar a resposta.' },
          { status: 400 }
        )
      }

      const { data: chamadoAtual, error: chamadoError } = await supabase
        .from('suporte_chamados')
        .select('*')
        .eq('id', chamadoId)
        .maybeSingle()

      if (chamadoError) throw chamadoError

      if (!chamadoAtual) {
        return NextResponse.json(
          { sucesso: false, erro: 'Chamado não encontrado.' },
          { status: 404 }
        )
      }

      if (chamadoAtual.usuario_id && String(chamadoAtual.usuario_id) !== String(usuarioId)) {
        return NextResponse.json(
          { sucesso: false, erro: 'Você não pode finalizar um chamado de outro usuário.' },
          { status: 403 }
        )
      }

      if (!texto(chamadoAtual.resposta_admin)) {
        return NextResponse.json(
          { sucesso: false, erro: 'Aguarde a resposta do Admin antes de concluir e avaliar este chamado.' },
          { status: 400 }
        )
      }

      const agora = new Date().toISOString()

      const payload: AnyRecord = {
        status: 'resolvido',
        finalizado_pelo_usuario: true,
        finalizado_por_id: usuarioId,
        finalizado_por_tipo: tipoUsuario,
        finalizado_em: agora,
        avaliacao_resposta_nota: nota,
        avaliacao_resposta_comentario: comentario || null,
        avaliacao_resposta_em: agora,
        updated_at: agora,
      }

      let payloadAtual = { ...payload }
      let data: AnyRecord | null = null
      let ultimoErro: any = null

      for (let tentativa = 0; tentativa < 10; tentativa++) {
        const { data: dataTentativa, error } = await supabase
          .from('suporte_chamados')
          .update(payloadAtual)
          .eq('id', chamadoId)
          .select('*')
          .maybeSingle()

        if (!error) {
          data = dataTentativa as AnyRecord | null
          ultimoErro = null
          break
        }

        ultimoErro = error

        if (!erroDeColunaAusente(error)) break

        const coluna = extrairColunaAusente(error)

        if (!coluna || !(coluna in payloadAtual)) break

        delete payloadAtual[coluna]
      }

      if (ultimoErro) throw ultimoErro

      return NextResponse.json({
        sucesso: true,
        chamado: data,
        mensagem: 'Chamado concluído e resposta avaliada com sucesso.',
      })
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

    let payloadAtual = { ...payload }
    let data: AnyRecord | null = null
    let ultimoErro: any = null

    for (let tentativa = 0; tentativa < 8; tentativa++) {
      const { data: dataTentativa, error } = await supabase
        .from('suporte_chamados')
        .update(payloadAtual)
        .eq('id', chamadoId)
        .select('*')
        .maybeSingle()

      if (!error) {
        data = dataTentativa as AnyRecord | null
        ultimoErro = null
        break
      }

      ultimoErro = error

      if (!erroDeColunaAusente(error)) break

      const coluna = extrairColunaAusente(error)

      if (!coluna || !(coluna in payloadAtual)) break

      delete payloadAtual[coluna]
    }

    if (ultimoErro) throw ultimoErro

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
