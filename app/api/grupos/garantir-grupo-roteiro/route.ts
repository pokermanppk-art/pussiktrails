import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const COLUNAS_USUARIO_MEMBRO = ['user_id', 'usuario_id', 'membro_id']
const PAPEIS_GUIA = ['guia_admin', 'admin', 'guia']
const PAPEIS_CLIENTE = ['cliente', 'participante', 'membro']

function json(data: AnyRecord, status = 200) {
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

function limparTexto(valor: unknown) {
  return String(valor || '').trim()
}

function normalizar(valor: unknown) {
  return limparTexto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function agoraIso() {
  return new Date().toISOString()
}

function tituloDoRoteiro(roteiro: AnyRecord) {
  return limparTexto(roteiro?.titulo || roteiro?.nome || roteiro?.name) || 'Roteiro PrussikTrails'
}

function guiaIdDoRoteiro(roteiro: AnyRecord) {
  return limparTexto(
    roteiro?.id_guia ||
      roteiro?.guia_id ||
      roteiro?.user_id ||
      roteiro?.usuario_id ||
      roteiro?.criado_por ||
      roteiro?.created_by ||
      ''
  )
}

function erroDeColunaAusente(error: AnyRecord) {
  const mensagem = String(error?.message || error?.details || error?.hint || '').toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    mensagem.includes('schema cache') ||
    mensagem.includes('could not find') ||
    mensagem.includes('column') ||
    mensagem.includes('does not exist')
  )
}

function extrairColunaAusente(error: AnyRecord) {
  const textoErro = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ')

  const matchTabelaColuna = textoErro.match(/[a-zA-Z0-9_]+\.([a-zA-Z0-9_]+)/)
  if (matchTabelaColuna?.[1]) return matchTabelaColuna[1]

  const matchAspas = textoErro.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  const matchColumn = textoErro.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i)
  if (matchColumn?.[1]) return matchColumn[1]

  return ''
}

function erroDePapelInvalido(error: AnyRecord) {
  const mensagem = String(error?.message || error?.details || error?.hint || '').toLowerCase()
  return error?.code === '23514' || mensagem.includes('check constraint')
}

function pagamentoConfirmado(reserva: AnyRecord) {
  const status = normalizar(reserva?.status)
  const pagamento = normalizar(
    reserva?.pagamento_status ||
      reserva?.status_pagamento ||
      reserva?.paghiper_status ||
      reserva?.payment_status ||
      reserva?.status_payment
  )

  return (
    pagamento === 'pago' ||
    pagamento === 'paid' ||
    pagamento === 'confirmado' ||
    pagamento === 'confirmada' ||
    pagamento === 'aprovado' ||
    pagamento === 'approved' ||
    status === 'pago' ||
    status === 'paga' ||
    status === 'confirmado' ||
    status === 'confirmada' ||
    status === 'realizada' ||
    status === 'realizado'
  )
}

async function inserirComFallback(
  supabase: any,
  tabela: string,
  payloadOriginal: AnyRecord,
  select = '*'
) {
  let payload = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 18; tentativa++) {
    const { data, error } = await supabase
      .from(tabela)
      .insert(payload)
      .select(select)
      .maybeSingle()

    if (!error) return data

    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)
    if (!coluna || !(coluna in payload)) throw error

    delete payload[coluna]

    if (Object.keys(payload).length === 0) {
      throw new Error(`Nenhuma coluna válida restante para inserir em ${tabela}.`)
    }
  }

  throw new Error(`Não foi possível inserir em ${tabela} após remover colunas ausentes.`)
}

async function atualizarComFallback(
  supabase: any,
  tabela: string,
  id: string,
  payloadOriginal: AnyRecord,
  select = '*'
) {
  let payload = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 18; tentativa++) {
    const { data, error } = await supabase
      .from(tabela)
      .update(payload)
      .eq('id', id)
      .select(select)
      .maybeSingle()

    if (!error) return data

    if (!erroDeColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)
    if (!coluna || !(coluna in payload)) throw error

    delete payload[coluna]

    if (Object.keys(payload).length === 0) {
      return null
    }
  }

  throw new Error(`Não foi possível atualizar ${tabela} após remover colunas ausentes.`)
}

async function buscarRoteiro(supabase: any, roteiroId: string) {
  const { data, error } = await supabase
    .from('roteiros')
    .select('*')
    .eq('id', roteiroId)
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function buscarReserva(supabase: any, reservaId: string) {
  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .eq('id', reservaId)
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function buscarGrupoPorRoteiro(supabase: any, roteiroId: string) {
  const { data, error } = await supabase
    .from('grupos_roteiros')
    .select('*')
    .eq('roteiro_id', roteiroId)
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) throw error
  return Array.isArray(data) && data.length > 0 ? data[0] : null
}

async function criarGrupo(
  supabase: any,
  params: {
    roteiroId: string
    guiaId: string
    tituloRoteiro: string
  }
) {
  const tituloGrupo = `Grupo - ${params.tituloRoteiro}`
  const agora = agoraIso()

  const payload = {
    roteiro_id: params.roteiroId,
    guia_id: params.guiaId,
    titulo: tituloGrupo,
    descricao: `Grupo interno do roteiro ${params.tituloRoteiro}.`,
    aviso_fixado: 'Grupo liberado para participantes com pagamento confirmado. Use este espaço para orientações oficiais da experiência.',
    status: 'ativo',
    permite_mensagens: true,
    created_at: agora,
    updated_at: agora
  }

  try {
    const data = await inserirComFallback(supabase, 'grupos_roteiros', payload)
    if (data?.id) return data
  } catch (error: any) {
    if (error?.code === '23505') {
      const grupoExistente = await buscarGrupoPorRoteiro(supabase, params.roteiroId)
      if (grupoExistente?.id) return grupoExistente
    }

    throw error
  }

  throw new Error('Não foi possível criar o grupo do roteiro.')
}

async function garantirGrupoAtualizado(
  supabase: any,
  grupo: AnyRecord,
  params: {
    guiaId: string
    tituloRoteiro: string
  }
) {
  if (!grupo?.id) return grupo

  const payload = {
    guia_id: params.guiaId,
    titulo: grupo.titulo || `Grupo - ${params.tituloRoteiro}`,
    descricao: grupo.descricao || `Grupo interno do roteiro ${params.tituloRoteiro}.`,
    status: grupo.status || 'ativo',
    permite_mensagens: grupo.permite_mensagens ?? true,
    updated_at: agoraIso()
  }

  try {
    const atualizado = await atualizarComFallback(supabase, 'grupos_roteiros', grupo.id, payload)
    return atualizado || grupo
  } catch (error) {
    console.warn('Aviso ao atualizar dados do grupo existente:', error)
    return grupo
  }
}

async function descobrirColunaUsuarioMembro(
  supabase: any,
  params: {
    grupoId: string
    userId: string
  }
) {
  for (const colunaUsuario of COLUNAS_USUARIO_MEMBRO) {
    const { data, error } = await supabase
      .from('grupo_membros')
      .select('*')
      .eq('grupo_id', params.grupoId)
      .eq(colunaUsuario, params.userId)
      .maybeSingle()

    if (!error) {
      return {
        colunaUsuario,
        membro: data || null
      }
    }

    if (erroDeColunaAusente(error)) {
      continue
    }

    throw error
  }

  throw new Error('Não foi possível identificar a coluna de usuário em grupo_membros. Esperado user_id ou usuario_id.')
}

async function inserirOuAtualizarMembroComPapel(
  supabase: any,
  params: {
    grupoId: string
    userId: string
    reservaId?: string | null
    papeis: string[]
  }
) {
  const { colunaUsuario, membro } = await descobrirColunaUsuarioMembro(supabase, {
    grupoId: params.grupoId,
    userId: params.userId
  })

  let ultimoErro: any = null

  for (const papel of params.papeis) {
    const agora = agoraIso()
    const payloadBase: AnyRecord = {
      grupo_id: params.grupoId,
      [colunaUsuario]: params.userId,
      reserva_id: params.reservaId || null,
      papel,
      status: 'ativo',
      updated_at: agora
    }

    try {
      if (membro?.id) {
        const membroAtualizado = await atualizarComFallback(
          supabase,
          'grupo_membros',
          membro.id,
          payloadBase
        )

        return {
          membro: membroAtualizado || membro,
          novo: false,
          colunaUsuario,
          papel
        }
      }

      const novoMembro = await inserirComFallback(supabase, 'grupo_membros', {
        ...payloadBase,
        entrou_em: agora,
        created_at: agora
      })

      return {
        membro: novoMembro,
        novo: true,
        colunaUsuario,
        papel
      }
    } catch (error: any) {
      ultimoErro = error

      if (error?.code === '23505') {
        const busca = await descobrirColunaUsuarioMembro(supabase, {
          grupoId: params.grupoId,
          userId: params.userId
        })

        if (busca.membro?.id) {
          return {
            membro: busca.membro,
            novo: false,
            colunaUsuario,
            papel
          }
        }
      }

      if (erroDePapelInvalido(error)) {
        continue
      }

      throw error
    }
  }

  throw ultimoErro || new Error('Não foi possível inserir/atualizar membro do grupo.')
}

async function garantirGuiaAdmin(
  supabase: any,
  params: {
    grupoId: string
    guiaId: string
  }
) {
  return inserirOuAtualizarMembroComPapel(supabase, {
    grupoId: params.grupoId,
    userId: params.guiaId,
    reservaId: null,
    papeis: PAPEIS_GUIA
  })
}

async function garantirClienteParticipante(
  supabase: any,
  params: {
    grupoId: string
    clienteId: string
    reservaId: string
  }
) {
  return inserirOuAtualizarMembroComPapel(supabase, {
    grupoId: params.grupoId,
    userId: params.clienteId,
    reservaId: params.reservaId,
    papeis: PAPEIS_CLIENTE
  })
}

async function criarMensagemSistemaSeGrupoNovo(
  supabase: any,
  params: {
    grupoId: string
    tituloRoteiro: string
    grupoNovo: boolean
  }
) {
  if (!params.grupoNovo) return

  try {
    await inserirComFallback(supabase, 'grupo_mensagens', {
      grupo_id: params.grupoId,
      user_id: null,
      mensagem: `Grupo interno criado automaticamente para o roteiro ${params.tituloRoteiro}.`,
      tipo: 'sistema',
      status: 'ativa',
      created_at: agoraIso(),
      updated_at: agoraIso()
    })
  } catch (error) {
    console.warn('Aviso ao criar mensagem de sistema do grupo:', error)
  }
}

async function criarMensagemSistemaClienteLiberado(
  supabase: any,
  params: {
    grupoId: string
    reservaId: string
  }
) {
  try {
    await inserirComFallback(supabase, 'grupo_mensagens', {
      grupo_id: params.grupoId,
      user_id: null,
      reserva_id: params.reservaId,
      mensagem: 'Um novo participante com pagamento confirmado entrou no grupo da experiência.',
      tipo: 'sistema',
      status: 'ativa',
      created_at: agoraIso(),
      updated_at: agoraIso()
    })
  } catch (error) {
    console.warn('Aviso ao criar mensagem de participante liberado:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const reservaId = limparTexto(
      body.reservaId ||
        body.reserva_id ||
        body.id_reserva
    )

    let roteiroId = limparTexto(
      body.roteiroId ||
        body.roteiro_id ||
        body.id_roteiro ||
        body.id
    )

    let clienteId = limparTexto(
      body.clienteId ||
        body.cliente_id ||
        body.usuarioId ||
        body.usuario_id
    )

    let reserva: AnyRecord | null = null

    if (reservaId) {
      reserva = await buscarReserva(supabase, reservaId)

      if (!reserva?.id) {
        return json(
          {
            sucesso: false,
            erro: 'Reserva não encontrada.'
          },
          404
        )
      }

      roteiroId = roteiroId || limparTexto(reserva.roteiro_id || reserva.id_roteiro)
      clienteId = clienteId || limparTexto(reserva.cliente_id || reserva.usuario_id || reserva.user_id)
    }

    if (!roteiroId) {
      return json(
        {
          sucesso: false,
          erro: 'Informe roteiroId ou reservaId para criar/garantir o grupo do roteiro.'
        },
        400
      )
    }

    const roteiro = await buscarRoteiro(supabase, roteiroId)

    if (!roteiro?.id) {
      return json(
        {
          sucesso: false,
          erro: 'Roteiro não encontrado.'
        },
        404
      )
    }

    const guiaId = limparTexto(body.guiaId || body.guia_id) || guiaIdDoRoteiro(roteiro)

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

    const tituloRoteiro = tituloDoRoteiro(roteiro)

    let grupo = await buscarGrupoPorRoteiro(supabase, roteiro.id)
    let grupoNovo = false

    if (!grupo?.id) {
      grupo = await criarGrupo(supabase, {
        roteiroId: roteiro.id,
        guiaId,
        tituloRoteiro
      })

      grupoNovo = true
    } else {
      grupo = await garantirGrupoAtualizado(supabase, grupo, {
        guiaId,
        tituloRoteiro
      })
    }

    const guiaAdmin = await garantirGuiaAdmin(supabase, {
      grupoId: grupo.id,
      guiaId
    })

    await criarMensagemSistemaSeGrupoNovo(supabase, {
      grupoId: grupo.id,
      tituloRoteiro,
      grupoNovo
    })

    let clienteParticipante: AnyRecord | null = null
    let clienteLiberado = false
    let clienteBloqueadoMotivo = ''

    if (reservaId || clienteId) {
      if (!clienteId) {
        clienteBloqueadoMotivo = 'Reserva não possui cliente vinculado.'
      } else if (!reserva?.id && reservaId) {
        clienteBloqueadoMotivo = 'Reserva não encontrada.'
      } else if (reserva?.id && !pagamentoConfirmado(reserva)) {
        clienteBloqueadoMotivo = 'Cliente só é liberado no grupo após pagamento confirmado.'
      } else if (reserva?.id) {
        clienteParticipante = await garantirClienteParticipante(supabase, {
          grupoId: grupo.id,
          clienteId,
          reservaId: reserva.id
        })
        clienteLiberado = true

        if (clienteParticipante?.novo) {
          await criarMensagemSistemaClienteLiberado(supabase, {
            grupoId: grupo.id,
            reservaId: reserva.id
          })
        }
      }
    }

    return json({
      sucesso: true,
      mensagem: grupoNovo
        ? 'Grupo do roteiro criado com sucesso.'
        : 'Grupo do roteiro já existia e foi garantido.',
      grupoNovo,
      guiaAdminNovo: Boolean(guiaAdmin?.novo),
      clienteLiberado,
      clienteBloqueadoMotivo,
      clienteParticipanteNovo: Boolean(clienteParticipante?.novo),
      grupo: {
        id: grupo.id,
        roteiro_id: grupo.roteiro_id,
        guia_id: grupo.guia_id,
        titulo: grupo.titulo,
        status: grupo.status
      },
      roteiro: {
        id: roteiro.id,
        titulo: tituloRoteiro,
        guia_id: guiaId
      },
      reserva: reserva?.id
        ? {
            id: reserva.id,
            cliente_id: clienteId,
            status: reserva.status || null,
            pagamento_status: reserva.pagamento_status || reserva.status_pagamento || null,
            liberada_para_grupo: clienteLiberado
          }
        : null,
      redirectGuiaUrl: `/guia/grupos/${grupo.id}`,
      redirectClienteUrl: clienteLiberado ? `/cliente/grupos/${grupo.id}` : null
    })
  } catch (error: any) {
    console.error('Erro em /api/grupos/garantir-grupo-roteiro:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao garantir grupo do roteiro.'
      },
      500
    )
  }
}

export async function GET() {
  return json({
    sucesso: true,
    rota: '/api/grupos/garantir-grupo-roteiro',
    metodo: 'POST',
    mensagem: 'Rota ativa. Envie roteiroId para criar/garantir o grupo interno do roteiro. Envie reservaId para liberar cliente pago no grupo.'
  })
}
