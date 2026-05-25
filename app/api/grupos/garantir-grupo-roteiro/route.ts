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

async function criarGrupo(
  supabase: any,
  params: {
    roteiroId: string
    guiaId: string
    tituloRoteiro: string
  }
) {
  const { data, error } = await supabase
    .from('grupos_roteiros')
    .insert({
      roteiro_id: params.roteiroId,
      guia_id: params.guiaId,
      titulo: `Grupo - ${params.tituloRoteiro}`,
      descricao: `Grupo interno do roteiro ${params.tituloRoteiro}.`,
      status: 'ativo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select('*')
    .maybeSingle()

  if (!error && data?.id) {
    return data
  }

  /*
    Se duas chamadas tentarem criar o mesmo grupo ao mesmo tempo,
    o unique(roteiro_id) evita duplicidade. Neste caso buscamos de novo.
  */
  if (error?.code === '23505') {
    const grupoExistente = await buscarGrupoPorRoteiro(
      supabase,
      params.roteiroId
    )

    if (grupoExistente?.id) {
      return grupoExistente
    }
  }

  throw error || new Error('Não foi possível criar o grupo do roteiro.')
}

async function buscarMembro(
  supabase: any,
  params: {
    grupoId: string
    userId: string
  }
) {
  const { data, error } = await supabase
    .from('grupo_membros')
    .select('*')
    .eq('grupo_id', params.grupoId)
    .eq('user_id', params.userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

async function garantirGuiaAdmin(
  supabase: any,
  params: {
    grupoId: string
    guiaId: string
  }
) {
  const membroExistente = await buscarMembro(supabase, {
    grupoId: params.grupoId,
    userId: params.guiaId
  })

  const payload = {
    grupo_id: params.grupoId,
    user_id: params.guiaId,
    reserva_id: null,
    papel: 'guia_admin',
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

async function criarMensagemSistemaSeGrupoNovo(
  supabase: any,
  params: {
    grupoId: string
    tituloRoteiro: string
    grupoNovo: boolean
  }
) {
  if (!params.grupoNovo) return

  const { error } = await supabase
    .from('grupo_mensagens')
    .insert({
      grupo_id: params.grupoId,
      user_id: null,
      mensagem: `Grupo interno criado automaticamente para o roteiro ${params.tituloRoteiro}.`,
      tipo: 'sistema',
      status: 'ativa',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

  if (error) {
    console.warn('Aviso ao criar mensagem de sistema do grupo:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const roteiroId = limparTexto(
      body.roteiroId ||
        body.roteiro_id ||
        body.id_roteiro ||
        body.id
    )

    if (!roteiroId) {
      return json(
        {
          sucesso: false,
          erro: 'Informe roteiroId para criar/garantir o grupo do roteiro.'
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

    return json({
      sucesso: true,
      mensagem: grupoNovo
        ? 'Grupo do roteiro criado com sucesso.'
        : 'Grupo do roteiro já existia e foi garantido.',
      grupoNovo,
      guiaAdminNovo: guiaAdmin.novo,
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
      redirectGuiaUrl: `/guia/grupos/${grupo.id}`
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
    mensagem:
      'Rota ativa. Envie roteiroId para criar/garantir o grupo interno do roteiro.'
  })
}