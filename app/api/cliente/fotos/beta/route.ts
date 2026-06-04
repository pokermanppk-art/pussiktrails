import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  ''

const BENEFICIO_TIPO = 'fotos_beta'
const MEDALHA_CODIGOS = ['fotos_beta_3', 'memorias_do_beta', 'olhar_da_jornada_beta']
const BONUS_FOTOS_BETA_PADRAO = 3

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

function numeroSeguro(valor: unknown, fallback = 0) {
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : fallback
}

function erroDeTabelaOuColuna(error: AnyRecord | null | undefined) {
  const texto = String(error?.message || error?.details || error?.hint || '').toLowerCase()

  return (
    error?.code === '42P01' ||
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    texto.includes('could not find') ||
    texto.includes('schema cache') ||
    texto.includes('column') ||
    texto.includes('relation')
  )
}

async function contarFotosCliente(supabase: any, clienteId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('fotos_aventuras')
    .eq('id', clienteId)
    .maybeSingle()

  if (error) throw error

  const fotos = Array.isArray(data?.fotos_aventuras) ? data.fotos_aventuras : []
  return fotos.length
}

async function garantirBeneficioBeta(supabase: any, clienteId: string, fotosPublicadas: number) {
  const fallback = {
    cliente_id: clienteId,
    tipo: BENEFICIO_TIPO,
    quantidade: BONUS_FOTOS_BETA_PADRAO,
    usado: Math.min(fotosPublicadas, BONUS_FOTOS_BETA_PADRAO),
    ativo: true
  }

  const { data: existente, error: erroBusca } = await supabase
    .from('beneficios_beta_clientes')
    .select('*')
    .eq('cliente_id', clienteId)
    .eq('tipo', BENEFICIO_TIPO)
    .maybeSingle()

  if (erroBusca && erroDeTabelaOuColuna(erroBusca as AnyRecord)) {
    return fallback
  }

  if (erroBusca) throw erroBusca

  if (existente) {
    const quantidade = numeroSeguro(existente.quantidade, BONUS_FOTOS_BETA_PADRAO)
    const ativo = existente.ativo !== false
    const usado = Math.min(fotosPublicadas, quantidade)

    const { data: atualizado, error: erroUpdate } = await supabase
      .from('beneficios_beta_clientes')
      .update({
        usado,
        updated_at: new Date().toISOString()
      })
      .eq('id', existente.id)
      .select('*')
      .maybeSingle()

    if (erroUpdate && !erroDeTabelaOuColuna(erroUpdate as AnyRecord)) {
      throw erroUpdate
    }

    return atualizado || {
      ...existente,
      quantidade,
      usado,
      ativo
    }
  }

  const { data: criado, error: erroInsert } = await supabase
    .from('beneficios_beta_clientes')
    .insert({
      cliente_id: clienteId,
      tipo: BENEFICIO_TIPO,
      quantidade: BONUS_FOTOS_BETA_PADRAO,
      usado: Math.min(fotosPublicadas, BONUS_FOTOS_BETA_PADRAO),
      ativo: true
    })
    .select('*')
    .maybeSingle()

  if (erroInsert && erroDeTabelaOuColuna(erroInsert as AnyRecord)) {
    return fallback
  }

  if (erroInsert) throw erroInsert

  return criado || fallback
}

async function buscarMedalhaFotosBeta(supabase: any) {
  const { data, error } = await supabase
    .from('medalhas')
    .select('*')
    .in('codigo', MEDALHA_CODIGOS)
    .limit(1)

  if (error) {
    if (erroDeTabelaOuColuna(error as AnyRecord)) return null
    throw error
  }

  return Array.isArray(data) ? data[0] || null : null
}

async function usuarioJaTemMedalha(supabase: any, clienteId: string, medalhaId: string) {
  const { data, error } = await supabase
    .from('usuarios_medalhas')
    .select('id')
    .eq('usuario_id', clienteId)
    .eq('medalha_id', medalhaId)
    .maybeSingle()

  if (error && erroDeTabelaOuColuna(error as AnyRecord)) return false
  if (error) throw error

  return Boolean(data?.id)
}

async function concederMedalhaFotosBeta(supabase: any, clienteId: string, fotosPublicadas: number) {
  if (fotosPublicadas < 3) {
    return {
      concedida: false,
      motivo: 'Ainda não completou 3 fotos.'
    }
  }

  const medalha = await buscarMedalhaFotosBeta(supabase)

  if (!medalha?.id) {
    return {
      concedida: false,
      motivo: 'Medalha fotos_beta_3 não encontrada.'
    }
  }

  const jaTem = await usuarioJaTemMedalha(supabase, clienteId, medalha.id)

  if (jaTem) {
    return {
      concedida: false,
      jaExistia: true,
      medalha
    }
  }

  const { error } = await supabase
    .from('usuarios_medalhas')
    .insert({
      usuario_id: clienteId,
      medalha_id: medalha.id,
      status: 'conquistada',
      progresso_atual: 3,
      progresso_total: 3,
      conquistada_em: new Date().toISOString()
    })

  if (error) {
    if (erroDeTabelaOuColuna(error as AnyRecord)) {
      return {
        concedida: false,
        motivo: 'Tabela usuarios_medalhas indisponível.'
      }
    }

    throw error
  }

  return {
    concedida: true,
    medalha
  }
}

async function responder(clienteId: string, modo: 'GET' | 'POST') {
  const supabase = getSupabaseAdmin()
  const fotosPublicadas = await contarFotosCliente(supabase, clienteId)
  const beneficio = await garantirBeneficioBeta(supabase, clienteId, fotosPublicadas)
  const quantidade = numeroSeguro(beneficio?.quantidade, BONUS_FOTOS_BETA_PADRAO)
  const ativo = beneficio?.ativo !== false
  const bonusFotosBeta = ativo ? quantidade : 0

  const medalhaResultado =
    modo === 'POST' || fotosPublicadas >= 3
      ? await concederMedalhaFotosBeta(supabase, clienteId, fotosPublicadas)
      : {
          concedida: false,
          motivo: 'Sincronização sem concessão.'
        }

  return {
    sucesso: true,
    beneficio: {
      tipo: BENEFICIO_TIPO,
      ativo,
      quantidade,
      usado: Math.min(fotosPublicadas, quantidade),
      bonusFotosBeta
    },
    fotosBetaPublicadas: Math.min(fotosPublicadas, quantidade),
    totalFotosPublicadas: fotosPublicadas,
    medalhaConcedida: Boolean((medalhaResultado as AnyRecord)?.concedida),
    medalhaJaExistia: Boolean((medalhaResultado as AnyRecord)?.jaExistia),
    medalha: (medalhaResultado as AnyRecord)?.medalha || null,
    mensagem:
      (medalhaResultado as AnyRecord)?.concedida
        ? 'Medalha Memórias do Beta desbloqueada.'
        : ''
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const clienteId = String(
      url.searchParams.get('clienteId') ||
        url.searchParams.get('userId') ||
        ''
    ).trim()

    if (!clienteId) {
      return json({ sucesso: false, erro: 'ID do cliente não informado.' }, 400)
    }

    return json(await responder(clienteId, 'GET'))
  } catch (error: any) {
    console.error('Erro em GET /api/cliente/fotos/beta:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao sincronizar benefício Beta.'
      },
      500
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const clienteId = String(
      body?.clienteId ||
        body?.userId ||
        body?.usuarioId ||
        body?.usuario_id ||
        ''
    ).trim()

    if (!clienteId) {
      return json({ sucesso: false, erro: 'ID do cliente não informado.' }, 400)
    }

    return json(await responder(clienteId, 'POST'))
  } catch (error: any) {
    console.error('Erro em POST /api/cliente/fotos/beta:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao processar fotos Beta.'
      },
      500
    )
  }
}
