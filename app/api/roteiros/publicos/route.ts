import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

const STATUS_OCULTOS = new Set([
  'rascunho',
  'pendente',
  'pendente_aprovacao',
  'aguardando_aprovacao',
  'em_analise',
  'analise',
  'reprovado',
  'reprovada',
  'cancelado',
  'cancelada',
  'excluido',
  'excluida',
  'removido',
  'removida',
  'arquivado',
  'arquivada',
  'pausado',
  'pausada',
])

const STATUS_PUBLICOS = new Set([
  'ativo',
  'ativa',
  'aprovado',
  'aprovada',
  'publicado',
  'publicada',
  'disponivel',
  'disponível',
])

const NOMES_GENERICOS_GUIA = new Set([
  'guia/agencia prussiktrails',
  'guia/agência prussiktrails',
  'guia agencia prussiktrails',
  'guia agência prussiktrails',
  'guia prussiktrails',
  'prussiktrails',
  'onlyprussik',
  'guia responsavel',
  'guia responsável',
  'guia nao identificado',
  'guia não identificado',
])

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

function textoNomeGuia(valor: unknown) {
  const valorTexto = texto(valor)
  if (!valorTexto) return ''

  const normalizado = normalizar(valorTexto)
  if (!normalizado) return ''
  if (NOMES_GENERICOS_GUIA.has(normalizado)) return ''
  if (normalizado.includes('guia/agencia prussiktrails')) return ''
  if (normalizado.includes('guia agencia prussiktrails')) return ''

  return valorTexto
}

function getSupabaseAdmin(): any {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Variáveis NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configuradas.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function guiaIdRoteiro(roteiro: AnyRecord) {
  return texto(
    roteiro.id_guia ||
      roteiro.guia_id ||
      roteiro.user_id ||
      roteiro.id_user ||
      roteiro.usuario_id ||
      roteiro.criador_id ||
      roteiro.created_by ||
      roteiro.criado_por ||
      roteiro.owner_id
  )
}

function nomeRoteiroGuia(roteiro: AnyRecord) {
  return (
    textoNomeGuia(roteiro.guia_nome) ||
    textoNomeGuia(roteiro.nome_guia) ||
    textoNomeGuia(roteiro.guia_name) ||
    textoNomeGuia(roteiro.nome_agencia) ||
    textoNomeGuia(roteiro.agencia_nome) ||
    textoNomeGuia(roteiro.empresa_nome) ||
    textoNomeGuia(roteiro.nome_empresa) ||
    textoNomeGuia(roteiro.nome_fantasia) ||
    textoNomeGuia(roteiro.razao_social) ||
    textoNameFromEmail(roteiro.guia_email)
  )
}

function textoNameFromEmail(valor: unknown) {
  const email = texto(valor)
  if (!email || !email.includes('@')) return ''
  return email.split('@')[0].replace(/[._-]+/g, ' ').trim()
}

function roteiroEstaDisponivel(roteiro: AnyRecord) {
  if (!roteiro?.id) return false
  if (roteiro.removido_em || roteiro.excluido_em) return false
  if (roteiro.removido_pelo_admin || roteiro.removido_pelo_guia) return false

  const status = normalizar(roteiro.status)
  const situacao = normalizar(roteiro.situacao)
  const publicacao = normalizar(roteiro.publicacao || roteiro.estado_publicacao)

  if (STATUS_OCULTOS.has(status) || STATUS_OCULTOS.has(situacao) || STATUS_OCULTOS.has(publicacao)) {
    return false
  }

  if (roteiro.ativo === true) return true
  if (STATUS_PUBLICOS.has(status) || STATUS_PUBLICOS.has(situacao) || STATUS_PUBLICOS.has(publicacao)) return true

  return false
}

function dataOrdenacao(roteiro: AnyRecord) {
  const valor = texto(roteiro.updated_at || roteiro.created_at)
  const data = valor ? new Date(valor) : null
  const time = data && !Number.isNaN(data.getTime()) ? data.getTime() : 0
  return time
}

async function buscarGuias(supabase: any, guiaIds: string[]) {
  if (guiaIds.length === 0) return new Map<string, AnyRecord>()

  const tentativasSelect = [
    'id, nome, email, tipo, avatar_url, foto_url, imagem_url, nome_agencia, agencia_nome, empresa_nome, nome_empresa, nome_fantasia, razao_social, cadastur, cadastur_numero',
    'id, nome, email, tipo, avatar_url, foto_url, imagem_url',
    'id, nome, email, tipo, avatar_url',
    'id, nome, email, tipo',
    'id, nome, email',
    'id, email',
  ]

  let guiasData: AnyRecord[] = []
  let ultimoErro: any = null

  for (const campos of tentativasSelect) {
    const { data, error } = await supabase
      .from('users')
      .select(campos)
      .in('id', guiaIds)

    if (!error && Array.isArray(data)) {
      guiasData = data as AnyRecord[]
      ultimoErro = null
      break
    }

    ultimoErro = error
  }

  if (ultimoErro && guiasData.length === 0) {
    console.warn('[api/roteiros/publicos] Não foi possível buscar guias:', {
      message: ultimoErro?.message,
      code: ultimoErro?.code,
      details: ultimoErro?.details,
      hint: ultimoErro?.hint,
    })
  }

  const mapa = new Map<string, AnyRecord>()

  guiasData.forEach((guia) => {
    if (guia?.id) mapa.set(String(guia.id), guia)
  })

  return mapa
}

function nomeGuiaResolvido(guia: AnyRecord | undefined, roteiro: AnyRecord) {
  const nomeBanco = textoNomeGuia(guia?.nome)
  if (nomeBanco) return nomeBanco

  const nomeAgenciaBanco =
    textoNomeGuia(guia?.nome_agencia) ||
    textoNomeGuia(guia?.agencia_nome) ||
    textoNomeGuia(guia?.empresa_nome) ||
    textoNomeGuia(guia?.nome_empresa) ||
    textoNomeGuia(guia?.nome_fantasia) ||
    textoNomeGuia(guia?.razao_social)

  if (nomeAgenciaBanco) return nomeAgenciaBanco

  const nomeNoRoteiro = nomeRoteiroGuia(roteiro)
  if (nomeNoRoteiro) return nomeNoRoteiro

  const emailBanco = textoNameFromEmail(guia?.email)
  if (emailBanco) return emailBanco

  return 'Guia responsável'
}

function avatarGuiaResolvido(guia: AnyRecord | undefined, roteiro: AnyRecord) {
  return texto(
    guia?.avatar_url ||
      guia?.foto_url ||
      guia?.imagem_url ||
      roteiro.guia_avatar_url ||
      roteiro.guia_foto_url
  )
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('roteiros')
      .select('*')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false })

    if (error) throw error

    const roteirosBase = ((data || []) as AnyRecord[])
      .filter(roteiroEstaDisponivel)
      .sort((a, b) => dataOrdenacao(b) - dataOrdenacao(a))

    const guiaIds = Array.from(
      new Set(
        roteirosBase
          .map((roteiro) => guiaIdRoteiro(roteiro))
          .filter(Boolean)
      )
    )

    const guias = await buscarGuias(supabase, guiaIds)

    const roteiros = roteirosBase.map((roteiro) => {
      const guiaId = guiaIdRoteiro(roteiro)
      const guia = guiaId ? guias.get(guiaId) : undefined
      const nomeGuia = nomeGuiaResolvido(guia, roteiro)
      const avatarGuia = avatarGuiaResolvido(guia, roteiro)

      return {
        ...roteiro,
        guia_id_resolvido: guiaId || null,
        guia_nome_resolvido: nomeGuia,
        guia_email_resolvido: texto(guia?.email || roteiro.guia_email) || null,
        guia_avatar_resolvido: avatarGuia || null,
        guia_nome: textoNomeGuia(roteiro.guia_nome) || nomeGuia,
        nome_guia: textoNomeGuia(roteiro.nome_guia) || nomeGuia,
      }
    })

    return NextResponse.json({
      sucesso: true,
      roteiros,
      total: roteiros.length,
    })
  } catch (error: any) {
    console.error('Erro em GET /api/roteiros/publicos:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    })

    return NextResponse.json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao listar roteiros públicos.',
      },
      { status: 500 }
    )
  }
}
