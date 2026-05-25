import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function getSupabaseAdmin() {
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ausente no ambiente.')
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente no ambiente.')
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

function pagamentoConfirmado(reserva: any) {
  const pagamento = normalizar(reserva?.pagamento_status)
  const status = normalizar(reserva?.status)

  return (
    pagamento === 'pago' ||
    pagamento === 'confirmado' ||
    pagamento === 'aprovado' ||
    pagamento === 'approved' ||
    pagamento === 'paid' ||
    status === 'confirmada' ||
    status === 'realizada' ||
    status === 'pago' ||
    status === 'paga'
  )
}

function tituloDoRoteiro(roteiro: any) {
  return (
    roteiro?.titulo ||
    roteiro?.nome ||
    roteiro?.name ||
    'Roteiro PrussikTrails'
  )
}

function guiaIdDoRoteiro(roteiro: any) {
  return (
    roteiro?.id_guia ||
    roteiro?.guia_id ||
    roteiro?.user_id ||
    roteiro?.usuario_id ||
    ''
  )
}

async function buscarUsuario(supabase: any, userId: string) {
  if (!userId) return null

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, nome, name, email, tipo')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.warn('Aviso ao buscar usuário:', error)
      return null
    }

    return data || null
  } catch {
    return null
  }
}

async function buscarReserva(supabase: any, reservaId: string) {
  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .eq('id', reservaId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

async function buscarRoteiro(supabase: any, roteiroId: string) {
  const { data, error } = await supabase
    .from('roteiros')
    .select('*')
    .eq('id', roteiroId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

async function buscarGrupoPorRoteiro(supabase: any, roteiroId: string) {
  const { data, error } = await supabase
    .from('grupos_roteiros')
    .select('*')
    .eq('roteiro_id', roteiroId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

async function criarOuBuscarGrupo(supabase: any, roteiro: any, guiaId: string) {
  const roteiroId = roteiro?.id

  let grupo = await buscarGrupoPorRoteiro(supabase, roteiroId)

  if (grupo?.id) {
    return grupo
  }

  const tituloRoteiro = tituloDoRoteiro(roteiro)

  const payload = {
    roteiro_id: roteiroId,
    guia_id: guiaId,
    titulo: `Grupo - ${tituloRoteiro}`,
    descricao: `Grupo interno do roteiro ${tituloRoteiro}.`,
    status: 'ativo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('grupos_roteiros')
    .insert(payload)
    .select('*')
    .maybeSingle()

  if (!error && data?.id) {
    return data
  }

  /*
    Proteção para caso duas chamadas tentem criar o mesmo grupo ao mesmo tempo.
    Como temos unique(roteiro_id), se der conflito, buscamos novamente.
  */
  if (error?.code === '23505') {
    grupo = await buscarGrupoPorRoteiro(supabase, roteiroId)

    if (grupo?.id) {
      return grupo
    }
  }

  throw error || new Error('Não foi possível criar o grupo do roteiro.')
}

async function buscarMembro(supabase: any, grupoId: string, userId: string) {
  const { data, error } = await supabase
    .from('grupo_membros')
    .select('*')
    .eq('grupo_id', grupoId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

async function garantirMembro(
  supabase: any,
  params: {
    grupoId: string
    userId: string
    reservaId?: string | null
    papel: 'guia_admin' | 'cliente'
  }
) {
  const membroExistente = await buscarMembro(
    supabase,
    params.grupoId,
    params.userId
  )

  const payload: Record<string, any> = {
    grupo_id: params.grupoId,
    user_id: params.userId,
    reserva_id: params.reservaId || null,
    papel: params.papel,
    status: 'ativo',
    updated_at: new Date().toISOString()
  }

  if (membroExistente?.id) {
    const { data, error } = await supabase
      .from('grupo_membros')
      .update(payload)
      .eq('id', membroExistente.id)
      .select('*')
      .maybeSingle()

    if (error) {
      throw error
    }

    return {
      membro: data,
      novo: false
    }
  }

  const { data, error } = await supabase
    .from('grupo_membros')
    .insert({
      ...payload,
      entrou_em: new Date().toISOString(),
      created_at: new Date().toISOString()
    })
    .select('*')
    .maybeSingle()

  if (error) {
    throw error
  }

  return {
    membro: data,
    novo: true
  }
}

async function criarMensagemSistema(
  supabase: any,
  params: {
    grupoId: string
    mensagem: string
  }
) {
  const { error } = await supabase
    .from('grupo_mensagens')
    .insert({
      grupo_id: params.grupoId,
      user_id: null,
      mensagem: params.mensagem,
      tipo: 'sistema',
      status: 'ativa',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

  if (error) {
    console.warn('Aviso ao criar mensagem de sistema:', error)
  }
}

async function notificacaoJaExiste(
  supabase: any,
  params: {
    grupoId: string
    guiaId: string
    reservaId: string
    tipo: string
  }
) {
  const { data, error } = await supabase
    .from('grupo_notificacoes')
    .select('id')
    .eq('grupo_id', params.grupoId)
    .eq('user_id_destino', params.guiaId)
    .eq('reserva_id', params.reservaId)
    .eq('tipo', params.tipo)
    .maybeSingle()

  if (error) {
    console.warn('Aviso ao verificar notificação existente:', error)
    return false
  }

  return !!data?.id
}

async function criarNotificacaoGuia(
  supabase: any,
  params: {
    grupoId: string
    guiaId: string
    reservaId: string
    clienteNome: string
    roteiroTitulo: string
  }
) {
  const tipo = 'reserva_confirmada'

  const jaExiste = await notificacaoJaExiste(supabase, {
    grupoId: params.grupoId,
    guiaId: params.guiaId,
    reservaId: params.reservaId,
    tipo
  })

  if (jaExiste) return

  const { error } = await supabase
    .from('grupo_notificacoes')
    .insert({
      grupo_id: params.grupoId,
      user_id_destino: params.guiaId,
      reserva_id: params.reservaId,
      titulo: 'Nova reserva confirmada',
      mensagem: `${params.clienteNome} entrou no grupo do roteiro ${params.roteiroTitulo}.`,
      tipo,
      lida: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

  if (error) {
    console.warn('Aviso ao criar notificação para o guia:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const reservaId = limparTexto(
      body.reservaId ||
        body.reserva_id ||
        body.id_reserva ||
        body.id
    )

    if (!reservaId) {
      return json(
        {
          sucesso: false,
          erro: 'Informe reservaId para garantir acesso ao grupo.'
        },
        400
      )
    }

    const reserva = await buscarReserva(supabase, reservaId)

    if (!reserva?.id) {
      return json(
        {
          sucesso: false,
          erro: 'Reserva não encontrada.'
        },
        404
      )
    }

    if (!reserva.roteiro_id) {
      return json(
        {
          sucesso: false,
          erro: 'Reserva não possui roteiro_id.'
        },
        400
      )
    }

    if (!reserva.cliente_id) {
      return json(
        {
          sucesso: false,
          erro: 'Reserva não possui cliente_id.'
        },
        400
      )
    }

    if (!pagamentoConfirmado(reserva)) {
      return json(
        {
          sucesso: false,
          erro: 'Reserva ainda não está paga ou confirmada.',
          reserva: {
            id: reserva.id,
            status: reserva.status,
            pagamento_status: reserva.pagamento_status
          }
        },
        403
      )
    }

    const roteiro = await buscarRoteiro(supabase, reserva.roteiro_id)

    if (!roteiro?.id) {
      return json(
        {
          sucesso: false,
          erro: 'Roteiro da reserva não encontrado.'
        },
        404
      )
    }

    const guiaId = limparTexto(guiaIdDoRoteiro(roteiro))

    if (!guiaId) {
      return json(
        {
          sucesso: false,
          erro: 'Roteiro não possui guia vinculado.',
          detalhe: 'Esperado campo id_guia ou guia_id na tabela roteiros.'
        },
        400
      )
    }

    const grupo = await criarOuBuscarGrupo(supabase, roteiro, guiaId)

    await garantirMembro(supabase, {
      grupoId: grupo.id,
      userId: guiaId,
      reservaId: null,
      papel: 'guia_admin'
    })

    const resultadoCliente = await garantirMembro(supabase, {
      grupoId: grupo.id,
      userId: reserva.cliente_id,
      reservaId: reserva.id,
      papel: 'cliente'
    })

    const cliente = await buscarUsuario(supabase, reserva.cliente_id)
    const clienteNome =
      cliente?.nome ||
      cliente?.name ||
      cliente?.email ||
      'Cliente'

    const roteiroTitulo = tituloDoRoteiro(roteiro)

    if (resultadoCliente.novo) {
      await criarMensagemSistema(supabase, {
        grupoId: grupo.id,
        mensagem: `${clienteNome} entrou no grupo após confirmação da reserva.`
      })
    }

    await criarNotificacaoGuia(supabase, {
      grupoId: grupo.id,
      guiaId,
      reservaId: reserva.id,
      clienteNome,
      roteiroTitulo
    })

    return json({
      sucesso: true,
      mensagem: 'Acesso ao grupo garantido.',
      grupo: {
        id: grupo.id,
        roteiro_id: grupo.roteiro_id,
        guia_id: grupo.guia_id,
        titulo: grupo.titulo,
        status: grupo.status
      },
      reserva: {
        id: reserva.id,
        cliente_id: reserva.cliente_id,
        roteiro_id: reserva.roteiro_id,
        status: reserva.status,
        pagamento_status: reserva.pagamento_status
      },
      cliente: {
        id: reserva.cliente_id,
        nome: clienteNome
      },
      novoMembroCliente: resultadoCliente.novo,
      redirectUrl: `/cliente/grupos/${grupo.id}`
    })
  } catch (error: any) {
    console.error('Erro em /api/grupos/garantir-acesso:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao garantir acesso ao grupo.'
      },
      500
    )
  }
}

export async function GET() {
  return json({
    sucesso: true,
    rota: '/api/grupos/garantir-acesso',
    metodo: 'POST',
    mensagem: 'Rota ativa. Envie reservaId para criar/garantir acesso ao grupo do roteiro.'
  })
}