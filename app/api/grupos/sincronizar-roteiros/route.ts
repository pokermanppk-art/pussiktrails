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

function erroDeColunaAusente(error: any) {
  const texto = String(
    error?.message ||
      error?.details ||
      error?.hint ||
      ''
  ).toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    texto.includes('could not find') ||
    texto.includes('schema cache') ||
    texto.includes('column')
  )
}

async function buscarRoteirosDoGuia(supabase: any, guiaId: string) {
  const tentativaIdGuia = await supabase
    .from('roteiros')
    .select('*')
    .eq('id_guia', guiaId)
    .order('created_at', { ascending: false })

  if (!tentativaIdGuia.error) {
    return (tentativaIdGuia.data || []) as any[]
  }

  if (!erroDeColunaAusente(tentativaIdGuia.error)) {
    throw tentativaIdGuia.error
  }

  const tentativaGuiaId = await supabase
    .from('roteiros')
    .select('*')
    .eq('guia_id', guiaId)
    .order('created_at', { ascending: false })

  if (!tentativaGuiaId.error) {
    return (tentativaGuiaId.data || []) as any[]
  }

  if (!erroDeColunaAusente(tentativaGuiaId.error)) {
    throw tentativaGuiaId.error
  }

  const tentativaTodos = await supabase
    .from('roteiros')
    .select('*')
    .order('created_at', { ascending: false })

  if (tentativaTodos.error) {
    throw tentativaTodos.error
  }

  return ((tentativaTodos.data || []) as any[]).filter((roteiro) => {
    return guiaIdDoRoteiro(roteiro) === guiaId
  })
}

async function buscarTodosRoteiros(supabase: any) {
  const { data, error } = await supabase
    .from('roteiros')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data || []) as any[]
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
    return {
      grupo: data,
      novo: true
    }
  }

  if (error?.code === '23505') {
    const grupoExistente = await buscarGrupoPorRoteiro(
      supabase,
      params.roteiroId
    )

    if (grupoExistente?.id) {
      return {
        grupo: grupoExistente,
        novo: false
      }
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

async function criarMensagemSistema(
  supabase: any,
  params: {
    grupoId: string
    tituloRoteiro: string
  }
) {
  const { error } = await supabase
    .from('grupo_mensagens')
    .insert({
      grupo_id: params.grupoId,
      user_id: null,
      mensagem: `Grupo interno criado automaticamente para o roteiro antigo ${params.tituloRoteiro}.`,
      tipo: 'sistema',
      status: 'ativa',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

  if (error) {
    console.warn('Aviso ao criar mensagem de sistema:', error)
  }
}

async function sincronizarRoteiro(supabase: any, roteiro: any) {
  const roteiroId = limparTexto(roteiro?.id)
  const guiaId = limparTexto(guiaIdDoRoteiro(roteiro))
  const tituloRoteiro = tituloDoRoteiro(roteiro)

  if (!roteiroId) {
    return {
      sucesso: false,
      motivo: 'Roteiro sem id.',
      roteiro_id: null,
      titulo: tituloRoteiro
    }
  }

  if (!guiaId) {
    return {
      sucesso: false,
      motivo: 'Roteiro sem guia vinculado.',
      roteiro_id: roteiroId,
      titulo: tituloRoteiro
    }
  }

  let grupo = await buscarGrupoPorRoteiro(supabase, roteiroId)
  let grupoNovo = false

  if (!grupo?.id) {
    const resultadoGrupo = await criarGrupo(supabase, {
      roteiroId,
      guiaId,
      tituloRoteiro
    })

    grupo = resultadoGrupo.grupo
    grupoNovo = resultadoGrupo.novo

    if (grupoNovo) {
      await criarMensagemSistema(supabase, {
        grupoId: grupo.id,
        tituloRoteiro
      })
    }
  }

  const guiaAdmin = await garantirGuiaAdmin(supabase, {
    grupoId: grupo.id,
    guiaId
  })

  return {
    sucesso: true,
    roteiro_id: roteiroId,
    titulo: tituloRoteiro,
    guia_id: guiaId,
    grupo_id: grupo.id,
    grupo_novo: grupoNovo,
    guia_admin_novo: guiaAdmin.novo
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const guiaId = limparTexto(
      body.guiaId ||
        body.guia_id ||
        body.id_guia
    )

    const sincronizarTodos = Boolean(body.todos || body.sincronizarTodos)

    let roteiros: any[] = []

    if (guiaId) {
      roteiros = await buscarRoteirosDoGuia(supabase, guiaId)
    } else if (sincronizarTodos) {
      roteiros = await buscarTodosRoteiros(supabase)
    } else {
      return json(
        {
          sucesso: false,
          erro: 'Informe guiaId ou envie todos=true para sincronizar todos os roteiros.'
        },
        400
      )
    }

    const resultados: any[] = []

    for (const roteiro of roteiros) {
      try {
        const resultado = await sincronizarRoteiro(supabase, roteiro)
        resultados.push(resultado)
      } catch (error: any) {
        resultados.push({
          sucesso: false,
          roteiro_id: roteiro?.id || null,
          titulo: tituloDoRoteiro(roteiro),
          motivo: error?.message || 'Erro ao sincronizar roteiro.'
        })
      }
    }

    const criados = resultados.filter((item) => item.grupo_novo).length
    const garantidos = resultados.filter((item) => item.sucesso).length
    const falhas = resultados.filter((item) => !item.sucesso).length

    return json({
      sucesso: true,
      mensagem: 'Sincronização de grupos concluída.',
      guiaId: guiaId || null,
      sincronizarTodos,
      totalRoteiros: roteiros.length,
      gruposCriados: criados,
      gruposGarantidos: garantidos,
      falhas,
      resultados
    })
  } catch (error: any) {
    console.error('Erro em /api/grupos/sincronizar-roteiros:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao sincronizar grupos dos roteiros.'
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
    mensagem:
      'Rota ativa. Envie guiaId para sincronizar os roteiros de um guia ou todos=true para todos os roteiros.'
  })
}