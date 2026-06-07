import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const CAMPOS_GUIA_ROTEIRO = ['id_guia', 'guia_id', 'user_id', 'usuario_id']
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
      autoRefreshToken: false,
    },
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
    .trim()
}

function agoraIso() {
  return new Date().toISOString()
}

function tituloDoRoteiro(roteiro: AnyRecord) {
  return texto(roteiro?.titulo || roteiro?.nome || roteiro?.name) || 'Roteiro PrussikTrails'
}

function roteiroVisivelParaGrupo(roteiro: AnyRecord) {
  const status = normalizar(roteiro?.status)

  if (!status) return true

  return ![
    'excluido',
    'excluida',
    'excluído',
    'excluída',
    'cancelado',
    'cancelada',
    'arquivado',
    'arquivada',
    'rejeitado',
    'rejeitada',
  ].includes(status)
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
      reserva?.status_payment ||
      reserva?.status_transacao ||
      reserva?.transaction_status
  )

  return (
    pagamento === 'pago' ||
    pagamento === 'paid' ||
    pagamento === 'confirmado' ||
    pagamento === 'confirmada' ||
    pagamento === 'aprovado' ||
    pagamento === 'aprovada' ||
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
  }

  throw new Error(`Não foi possível inserir em ${tabela}.`)
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

    if (Object.keys(payload).length === 0) return null
  }

  throw new Error(`Não foi possível atualizar ${tabela}.`)
}

async function buscarRoteirosDoGuia(supabase: any, guiaId: string) {
  const mapa = new Map<string, AnyRecord>()

  for (const campo of CAMPOS_GUIA_ROTEIRO) {
    const { data, error } = await supabase
      .from('roteiros')
      .select('*')
      .eq(campo, guiaId)
      .limit(500)

    if (error) {
      if (erroDeColunaAusente(error)) continue
      console.warn(`Aviso ao buscar roteiros por ${campo}:`, error)
      continue
    }

    ;((data || []) as AnyRecord[]).forEach((roteiro) => {
      if (roteiro?.id && roteiroVisivelParaGrupo(roteiro)) {
        mapa.set(String(roteiro.id), roteiro)
      }
    })
  }

  return Array.from(mapa.values())
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

async function criarGrupo(supabase: any, roteiro: AnyRecord, guiaId: string) {
  const tituloRoteiro = tituloDoRoteiro(roteiro)
  const agora = agoraIso()

  const payload = {
    roteiro_id: roteiro.id,
    guia_id: guiaId,
    titulo: `Grupo - ${tituloRoteiro}`,
    descricao: `Grupo interno do roteiro ${tituloRoteiro}.`,
    aviso_fixado: 'Grupo criado automaticamente. Clientes entram somente após pagamento confirmado.',
    status: 'ativo',
    permite_mensagens: true,
    created_at: agora,
    updated_at: agora,
  }

  try {
    const grupo = await inserirComFallback(supabase, 'grupos_roteiros', payload)
    if (grupo?.id) return grupo
  } catch (error: any) {
    if (error?.code === '23505') {
      const existente = await buscarGrupoPorRoteiro(supabase, String(roteiro.id))
      if (existente?.id) return existente
    }

    throw error
  }

  throw new Error(`Não foi possível criar grupo do roteiro ${tituloRoteiro}.`)
}

async function garantirGrupo(supabase: any, roteiro: AnyRecord, guiaId: string) {
  let grupo = await buscarGrupoPorRoteiro(supabase, String(roteiro.id))
  let novo = false

  if (!grupo?.id) {
    grupo = await criarGrupo(supabase, roteiro, guiaId)
    novo = true
  } else {
    const atualizado = await atualizarComFallback(supabase, 'grupos_roteiros', grupo.id, {
      guia_id: guiaId,
      titulo: grupo.titulo || `Grupo - ${tituloDoRoteiro(roteiro)}`,
      descricao: grupo.descricao || `Grupo interno do roteiro ${tituloDoRoteiro(roteiro)}.`,
      status: grupo.status || 'ativo',
      permite_mensagens: grupo.permite_mensagens ?? true,
      updated_at: agoraIso(),
    }).catch((error: any) => {
      console.warn('Aviso ao atualizar grupo existente:', error)
      return null
    })

    if (atualizado?.id) grupo = atualizado
  }

  if (novo) {
    await inserirComFallback(supabase, 'grupo_mensagens', {
      grupo_id: grupo.id,
      user_id: null,
      mensagem: `Grupo interno criado automaticamente para o roteiro ${tituloDoRoteiro(roteiro)}.`,
      tipo: 'sistema',
      status: 'ativa',
      created_at: agoraIso(),
      updated_at: agoraIso(),
    }).catch((error: any) => {
      console.warn('Aviso ao criar mensagem inicial do grupo:', error)
    })
  }

  return { grupo, novo }
}

async function descobrirMembro(supabase: any, grupoId: string, userId: string) {
  for (const colunaUsuario of COLUNAS_USUARIO_MEMBRO) {
    const { data, error } = await supabase
      .from('grupo_membros')
      .select('*')
      .eq('grupo_id', grupoId)
      .eq(colunaUsuario, userId)
      .maybeSingle()

    if (!error) {
      return {
        colunaUsuario,
        membro: data || null,
      }
    }

    if (erroDeColunaAusente(error)) continue
    throw error
  }

  throw new Error('Não foi possível identificar a coluna de usuário em grupo_membros.')
}

async function inserirOuAtualizarMembro(
  supabase: any,
  params: {
    grupoId: string
    userId: string
    reservaId?: string | null
    papeis: string[]
  }
) {
  const { colunaUsuario, membro } = await descobrirMembro(supabase, params.grupoId, params.userId)
  let ultimoErro: any = null

  for (const papel of params.papeis) {
    const agora = agoraIso()
    const payload: AnyRecord = {
      grupo_id: params.grupoId,
      [colunaUsuario]: params.userId,
      reserva_id: params.reservaId || null,
      papel,
      status: 'ativo',
      updated_at: agora,
    }

    try {
      if (membro?.id) {
        const atualizado = await atualizarComFallback(supabase, 'grupo_membros', membro.id, payload)
        return {
          membro: atualizado || membro,
          novo: false,
          papel,
        }
      }

      const novo = await inserirComFallback(supabase, 'grupo_membros', {
        ...payload,
        entrou_em: agora,
        created_at: agora,
      })

      return {
        membro: novo,
        novo: true,
        papel,
      }
    } catch (error: any) {
      ultimoErro = error

      if (error?.code === '23505') {
        const busca = await descobrirMembro(supabase, params.grupoId, params.userId)
        if (busca.membro?.id) {
          return {
            membro: busca.membro,
            novo: false,
            papel,
          }
        }
      }

      if (erroDePapelInvalido(error)) continue
      throw error
    }
  }

  throw ultimoErro || new Error('Não foi possível inserir membro no grupo.')
}

async function garantirGuiaAdmin(supabase: any, grupoId: string, guiaId: string) {
  return inserirOuAtualizarMembro(supabase, {
    grupoId,
    userId: guiaId,
    reservaId: null,
    papeis: PAPEIS_GUIA,
  })
}

async function garantirClientePago(supabase: any, grupoId: string, reserva: AnyRecord) {
  const clienteId = texto(reserva?.cliente_id || reserva?.id_cliente || reserva?.usuario_id || reserva?.user_id)

  if (!clienteId || !reserva?.id || !pagamentoConfirmado(reserva)) {
    return {
      liberado: false,
      novo: false,
    }
  }

  const resultado = await inserirOuAtualizarMembro(supabase, {
    grupoId,
    userId: clienteId,
    reservaId: reserva.id,
    papeis: PAPEIS_CLIENTE,
  })

  if (resultado.novo) {
    await inserirComFallback(supabase, 'grupo_mensagens', {
      grupo_id: grupoId,
      user_id: null,
      reserva_id: reserva.id,
      mensagem: 'Um novo participante com pagamento confirmado entrou no grupo da experiência.',
      tipo: 'sistema',
      status: 'ativa',
      created_at: agoraIso(),
      updated_at: agoraIso(),
    }).catch((error: any) => {
      console.warn('Aviso ao criar mensagem de entrada de cliente:', error)
    })
  }

  return {
    liberado: true,
    novo: Boolean(resultado.novo),
  }
}

async function buscarReservasDosRoteiros(supabase: any, roteiroIds: string[]) {
  if (roteiroIds.length === 0) return []

  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .in('roteiro_id', roteiroIds)
    .limit(5000)

  if (error) throw error
  return (data || []) as AnyRecord[]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))
    const guiaId = texto(body.guiaId || body.guia_id || body.id_guia || body.userId || body.user_id)

    if (!guiaId) {
      return json(
        {
          sucesso: false,
          erro: 'Informe guiaId para sincronizar os grupos dos roteiros.',
        },
        400
      )
    }

    const roteiros = await buscarRoteirosDoGuia(supabase, guiaId)
    const roteiroIds = roteiros.map((roteiro) => String(roteiro.id)).filter(Boolean)
    const reservas = await buscarReservasDosRoteiros(supabase, roteiroIds)

    const reservasPorRoteiro = new Map<string, AnyRecord[]>()
    reservas.forEach((reserva) => {
      const roteiroId = texto(reserva.roteiro_id || reserva.id_roteiro)
      if (!roteiroId) return
      const lista = reservasPorRoteiro.get(roteiroId) || []
      lista.push(reserva)
      reservasPorRoteiro.set(roteiroId, lista)
    })

    let gruposCriados = 0
    let gruposGarantidos = 0
    let guiasGarantidos = 0
    let clientesLiberados = 0
    let clientesNovos = 0
    let reservasPagas = 0
    let falhas = 0
    const detalhesFalhas: AnyRecord[] = []
    const grupos: AnyRecord[] = []

    for (const roteiro of roteiros) {
      try {
        const { grupo, novo } = await garantirGrupo(supabase, roteiro, guiaId)
        if (novo) gruposCriados += 1
        gruposGarantidos += 1

        const guiaAdmin = await garantirGuiaAdmin(supabase, grupo.id, guiaId)
        if (guiaAdmin?.membro?.id) guiasGarantidos += 1

        const reservasDoRoteiro = reservasPorRoteiro.get(String(roteiro.id)) || []
        const reservasConfirmadas = reservasDoRoteiro.filter(pagamentoConfirmado)
        reservasPagas += reservasConfirmadas.length

        for (const reserva of reservasConfirmadas) {
          const cliente = await garantirClientePago(supabase, grupo.id, reserva)
          if (cliente.liberado) clientesLiberados += 1
          if (cliente.novo) clientesNovos += 1
        }

        grupos.push({
          id: grupo.id,
          roteiro_id: grupo.roteiro_id,
          titulo: grupo.titulo,
          grupoNovo: novo,
          reservas_confirmadas: reservasConfirmadas.length,
        })
      } catch (error: any) {
        falhas += 1
        detalhesFalhas.push({
          roteiro_id: roteiro.id,
          titulo: tituloDoRoteiro(roteiro),
          erro: error?.message || 'Erro ao sincronizar roteiro.',
        })
        console.error('Falha ao sincronizar grupo do roteiro:', roteiro?.id, error)
      }
    }

    return json({
      sucesso: true,
      mensagem: 'Sincronização de grupos concluída.',
      guiaId,
      roteirosEncontrados: roteiros.length,
      gruposCriados,
      gruposGarantidos,
      guiasGarantidos,
      reservasPagas,
      clientesLiberados,
      clientesNovos,
      falhas,
      detalhesFalhas,
      grupos,
    })
  } catch (error: any) {
    console.error('Erro em /api/grupos/sincronizar-roteiros:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao sincronizar grupos dos roteiros.',
      },
      500
    )
  }
}

export async function GET() {
  return json({
    sucesso: true,
    rota: '/api/grupos/sincronizar-roteiros',
    metodo: 'POST',
    mensagem: 'Rota ativa. Envie guiaId para criar/garantir grupos dos roteiros e liberar clientes pagos.',
  })
}
