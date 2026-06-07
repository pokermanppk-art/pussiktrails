import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function json(data: AnyRecord, status = 200) {
  return NextResponse.json(data, { status })
}

function getSupabaseAdmin() {
  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL ausente no ambiente.')
  if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente no ambiente.')

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
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
}

function idUsuarioDeMembro(membro: AnyRecord) {
  return texto(membro.user_id || membro.usuario_id || membro.membro_id || membro.cliente_id || membro.guia_id)
}

function papelGuiaAdmin(papel: unknown) {
  const valor = normalizar(papel)
  return valor === 'guia_admin' || valor === 'admin' || valor === 'guia' || valor === 'administrador'
}

function papelCliente(papel: unknown) {
  const valor = normalizar(papel)
  return valor === 'cliente' || valor === 'participante' || valor === 'membro'
}

function pagamentoConfirmado(reserva: AnyRecord) {
  const pagamento = normalizar(
    reserva.pagamento_status ||
      reserva.status_pagamento ||
      reserva.payment_status ||
      reserva.pix_status ||
      reserva.status_pix ||
      reserva.paghiper_status ||
      reserva.transaction_status ||
      reserva.status_transacao
  )

  const status = normalizar(reserva.status)

  const confirmados = new Set([
    'pago',
    'paga',
    'confirmado',
    'confirmada',
    'aprovado',
    'aprovada',
    'paid',
    'approved',
    'completed',
    'complete',
    'succeeded',
    'success',
    'sucesso',
    'liquidado',
    'liquidada',
    'realizado',
    'realizada',
    'concluido',
    'concluida',
    'concluído',
    'concluída'
  ])

  return confirmados.has(pagamento) || confirmados.has(status)
}

function nomeUsuario(usuario?: AnyRecord | null) {
  return usuario?.nome || usuario?.name || usuario?.email || 'Participante'
}

async function buscarGrupo(supabase: any, grupoOuRoteiroId: string) {
  const id = texto(grupoOuRoteiroId)

  if (!id) return null

  const porId = await supabase
    .from('grupos_roteiros')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (porId.error) throw porId.error
  if (porId.data?.id) return porId.data as AnyRecord

  const porRoteiro = await supabase
    .from('grupos_roteiros')
    .select('*')
    .eq('roteiro_id', id)
    .maybeSingle()

  if (porRoteiro.error) throw porRoteiro.error
  return (porRoteiro.data || null) as AnyRecord | null
}

async function buscarUsuarios(supabase: any, ids: string[]) {
  const idsUnicos = Array.from(new Set(ids.map(texto).filter(Boolean)))

  if (idsUnicos.length === 0) return [] as AnyRecord[]

  const { data, error } = await supabase
    .from('users')
    .select('id, nome, name, email, avatar_url, foto_url, imagem_url')
    .in('id', idsUnicos)

  if (error) {
    console.warn('Aviso ao buscar usuários do grupo:', error)
    return [] as AnyRecord[]
  }

  return (data || []) as AnyRecord[]
}

async function carregarDetalheGrupo(
  supabase: any,
  params: {
    grupoId: string
    guiaId: string
    marcarLidas?: boolean
  }
) {
  const grupoId = texto(params.grupoId)
  const guiaId = texto(params.guiaId)

  if (!grupoId) {
    return {
      status: 400,
      body: {
        sucesso: false,
        erro: 'Grupo não identificado.'
      }
    }
  }

  if (!guiaId) {
    return {
      status: 401,
      body: {
        sucesso: false,
        erro: 'Guia não identificado.'
      }
    }
  }

  const grupo = await buscarGrupo(supabase, grupoId)

  if (!grupo?.id) {
    return {
      status: 404,
      body: {
        sucesso: false,
        erro: 'Não foi possível localizar o grupo.',
        grupoId
      }
    }
  }

  const { data: membrosData, error: membrosError } = await supabase
    .from('grupo_membros')
    .select('*')
    .eq('grupo_id', grupo.id)
    .eq('status', 'ativo')
    .order('entrou_em', { ascending: true })

  if (membrosError) throw membrosError

  const membrosBase = (membrosData || []) as AnyRecord[]

  const guiaEhDonoDoGrupo = texto(grupo.guia_id) === guiaId
  const guiaEhMembroAdmin = membrosBase.some((membro) => {
    return idUsuarioDeMembro(membro) === guiaId && papelGuiaAdmin(membro.papel)
  })

  if (!guiaEhDonoDoGrupo && !guiaEhMembroAdmin) {
    return {
      status: 403,
      body: {
        sucesso: false,
        erro: 'Você não tem permissão para administrar este grupo.',
        detalhe: 'O guia logado não é o guia_id do grupo e não consta como guia_admin ativo.',
        grupo: {
          id: grupo.id,
          roteiro_id: grupo.roteiro_id,
          guia_id: grupo.guia_id,
          titulo: grupo.titulo,
          status: grupo.status
        },
        guiaId
      }
    }
  }

  let roteiro: AnyRecord | null = null

  if (grupo.roteiro_id) {
    const { data: roteiroData, error: roteiroError } = await supabase
      .from('roteiros')
      .select('*')
      .eq('id', grupo.roteiro_id)
      .maybeSingle()

    if (!roteiroError && roteiroData?.id) {
      roteiro = roteiroData as AnyRecord
    }
  }

  let reservas: AnyRecord[] = []

  if (grupo.roteiro_id) {
    const { data: reservasData, error: reservasError } = await supabase
      .from('reservas')
      .select('*')
      .eq('roteiro_id', grupo.roteiro_id)
      .order('created_at', { ascending: false })

    if (!reservasError && Array.isArray(reservasData)) {
      reservas = reservasData as AnyRecord[]
    }
  }

  const { data: mensagensData, error: mensagensError } = await supabase
    .from('grupo_mensagens')
    .select('*')
    .eq('grupo_id', grupo.id)
    .eq('status', 'ativa')
    .order('created_at', { ascending: true })
    .limit(250)

  if (mensagensError) throw mensagensError

  const mensagensBase = (mensagensData || []) as AnyRecord[]

  const usuarioIds = [
    ...membrosBase.map(idUsuarioDeMembro),
    ...mensagensBase.map((mensagem) => texto(mensagem.user_id || mensagem.usuario_id)),
    ...reservas.map((reserva) => texto(reserva.cliente_id || reserva.id_cliente || reserva.clienteId))
  ].filter(Boolean)

  const usuarios = await buscarUsuarios(supabase, usuarioIds)

  const usuarioPorId = new Map<string, AnyRecord>()
  usuarios.forEach((usuario) => {
    if (usuario?.id) usuarioPorId.set(String(usuario.id), usuario)
  })

  const membros: AnyRecord[] = membrosBase.map((membro): AnyRecord => {
    const usuarioId = idUsuarioDeMembro(membro)
    const usuario = usuarioPorId.get(usuarioId)

    return {
      ...membro,
      user_id: membro.user_id || usuarioId,
      usuario_nome: nomeUsuario(usuario),
      usuario_email: usuario?.email || ''
    }
  })

  const mensagens: AnyRecord[] = mensagensBase.map((mensagem): AnyRecord => {
    const usuarioId = texto(mensagem.user_id || mensagem.usuario_id)
    const usuario = usuarioPorId.get(usuarioId)

    return {
      ...mensagem,
      user_id: mensagem.user_id || usuarioId || null,
      usuario_nome: usuarioId ? nomeUsuario(usuario) : 'Sistema'
    }
  })

  const reservasComCliente: AnyRecord[] = reservas.map((reserva): AnyRecord => {
    const clienteId = texto(reserva.cliente_id || reserva.id_cliente || reserva.clienteId)
    const cliente = usuarioPorId.get(clienteId)

    return {
      ...reserva,
      cliente_id: reserva.cliente_id || clienteId || null,
      cliente_nome: nomeUsuario(cliente),
      cliente_email: cliente?.email || ''
    }
  })

  const reservasConfirmadas: AnyRecord[] = reservasComCliente.filter((reserva: AnyRecord) => pagamentoConfirmado(reserva))
  const membrosClientes: AnyRecord[] = membros.filter((membro: AnyRecord) => papelCliente(membro['papel']))

  const pessoasConfirmadas = reservasConfirmadas.reduce(
    (total: number, reserva: AnyRecord) => total + Number(reserva['quantidade_pessoas'] || 0),
    0
  )

  const valorConfirmado = reservasConfirmadas.reduce(
    (total: number, reserva: AnyRecord) => total + Number(reserva['valor_total'] || 0),
    0
  )

  if (params.marcarLidas !== false) {
    await supabase
      .from('grupo_notificacoes')
      .update({
        lida: true,
        lida_em: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('grupo_id', grupo.id)
      .eq('user_id_destino', guiaId)
      .eq('lida', false)
  }

  return {
    status: 200,
    body: {
      sucesso: true,
      grupo,
      roteiro,
      membros,
      mensagens,
      reservas: reservasComCliente,
      stats: {
        clientesConfirmados: membrosClientes.length,
        reservasConfirmadas: reservasConfirmadas.length,
        pessoasConfirmadas,
        valorConfirmado
      },
      ultimaAtualizacao: new Date().toLocaleTimeString('pt-BR')
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const acao = normalizar(body?.acao || body?.action || 'detalhe')
    const grupoId = texto(body?.grupoId || body?.grupo_id || body?.id || body?.roteiroId || body?.roteiro_id)
    const guiaId = texto(body?.guiaId || body?.guia_id || body?.userId || body?.user_id)

    const carregado = await carregarDetalheGrupo(supabase, {
      grupoId,
      guiaId,
      marcarLidas: acao === 'detalhe'
    })

    if (carregado.status !== 200) {
      return json(carregado.body, carregado.status)
    }

    const grupo = carregado.body.grupo as AnyRecord

    if (acao === 'enviar_mensagem') {
      const mensagem = texto(body?.mensagem || body?.texto)

      if (!mensagem) {
        return json({ sucesso: false, erro: 'Informe a mensagem.' }, 400)
      }

      const { error } = await supabase
        .from('grupo_mensagens')
        .insert({
          grupo_id: grupo.id,
          user_id: guiaId,
          mensagem,
          tipo: 'texto',
          status: 'ativa',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) throw error
    }

    if (acao === 'salvar_aviso') {
      const aviso = texto(body?.aviso || body?.aviso_fixado || body?.texto)

      const { error } = await supabase
        .from('grupos_roteiros')
        .update({
          aviso_fixado: aviso || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', grupo.id)

      if (error) throw error

      if (aviso) {
        await supabase
          .from('grupo_mensagens')
          .insert({
            grupo_id: grupo.id,
            user_id: guiaId,
            mensagem: `Aviso do guia: ${aviso}`,
            tipo: 'aviso_guia',
            status: 'ativa',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
      }
    }

    if (acao === 'encerrar') {
      const { error } = await supabase
        .from('grupos_roteiros')
        .update({
          status: 'encerrado',
          encerrado_em: new Date().toISOString(),
          encerrado_motivo: texto(body?.motivo) || 'Encerrado pelo guia.',
          updated_at: new Date().toISOString()
        })
        .eq('id', grupo.id)

      if (error) throw error

      await supabase
        .from('grupo_mensagens')
        .insert({
          grupo_id: grupo.id,
          user_id: null,
          mensagem: 'O guia encerrou este grupo.',
          tipo: 'sistema',
          status: 'ativa',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
    }

    if (acao === 'detalhe') {
      return json(carregado.body)
    }

    const atualizado = await carregarDetalheGrupo(supabase, {
      grupoId: grupo.id,
      guiaId,
      marcarLidas: false
    })

    return json({
      ...atualizado.body,
      mensagem:
        acao === 'enviar_mensagem'
          ? 'Mensagem enviada.'
          : acao === 'salvar_aviso'
            ? 'Aviso do grupo atualizado.'
            : acao === 'encerrar'
              ? 'Grupo encerrado.'
              : 'Grupo atualizado.'
    }, atualizado.status)
  } catch (error: any) {
    console.error('Erro em /api/grupos/detalhe-guia:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao carregar o grupo do guia.'
      },
      500
    )
  }
}

export async function GET() {
  return json({
    sucesso: true,
    rota: '/api/grupos/detalhe-guia',
    metodo: 'POST',
    mensagem: 'Envie grupoId e guiaId para carregar/administrar o grupo do guia.'
  })
}
