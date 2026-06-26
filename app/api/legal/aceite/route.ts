import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AnyRecord = Record<string, any>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const DOCUMENTOS: Record<string, { titulo: string; versao: string; rota: string }> = {
  termos_uso: { titulo: 'Termos de Uso', versao: 'V8_FINAL_BETA_MVP_EI_2026_06_17', rota: '/termos' },
  politica_privacidade: { titulo: 'Política de Privacidade', versao: 'V8_FINAL_BETA_MVP_EI_2026_06_17', rota: '/politica-de-privacidade' },
  politica_cookies: { titulo: 'Política de Cookies', versao: 'V8_FINAL_BETA_MVP_EI_2026_06_17', rota: '/politica-de-cookies' },
  fornecedores: { titulo: 'Lista de Fornecedores Tecnológicos', versao: 'V8_FINAL_BETA_MVP_EI_2026_06_17', rota: '/fornecedores' },
  termo_guia: { titulo: 'Termo do Guia', versao: 'V8_FINAL_BETA_MVP_EI_2026_06_17', rota: '/termo-do-guia' },
  termo_riscos: { titulo: 'Termo de Ciência de Riscos', versao: 'V8_FINAL_BETA_MVP_EI_2026_06_17', rota: '/termo-de-riscos' },
}

function json(data: AnyRecord, status = 200) {
  return NextResponse.json(data, { status })
}

function admin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Variáveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes.')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function getIp(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')?.[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    ''
  )
}

function getHashBase(payload: AnyRecord) {
  return [
    payload.documento_codigo,
    payload.documento_versao,
    payload.user_id,
    payload.contexto,
    payload.contexto_id,
    payload.reserva_id,
    payload.roteiro_id,
    payload.created_at,
  ].map((item) => texto(item)).join('|')
}

async function sha256Hex(valor: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(valor)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function erroDeColunaAusente(error: AnyRecord) {
  const mensagem = String(error?.message || error?.details || error?.hint || '').toLowerCase()
  return error?.code === '42703' || error?.code === 'PGRST204' || mensagem.includes('schema cache') || mensagem.includes('could not find') || mensagem.includes('column')
}

function extrairColunaAusente(error: AnyRecord) {
  const textoErro = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ')
  const match = textoErro.match(/'([^']+)'/) || textoErro.match(/column\s+"?([a-zA-Z0-9_]+)"?/i)
  return match?.[1] || ''
}

async function inserirComFallback(supabase: any, tabela: string, payloadOriginal: AnyRecord) {
  let payload = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 24; tentativa++) {
    const { data, error } = await supabase.from(tabela).insert(payload).select('*').maybeSingle()
    if (!error) return data

    if (!erroDeColunaAusente(error)) throw error
    const coluna = extrairColunaAusente(error)
    if (!coluna || !(coluna in payload)) throw error
    delete payload[coluna]
  }

  throw new Error(`Não foi possível inserir em ${tabela}.`)
}

async function updateComFallback(supabase: any, tabela: string, id: string, payloadOriginal: AnyRecord) {
  let payload = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 24; tentativa++) {
    const { error } = await supabase.from(tabela).update(payload).eq('id', id)
    if (!error) return true

    if (!erroDeColunaAusente(error)) throw error
    const coluna = extrairColunaAusente(error)
    if (!coluna || !(coluna in payload)) throw error
    delete payload[coluna]
    if (Object.keys(payload).length === 0) return true
  }

  return true
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const supabase = admin()

    const documentoCodigo = texto(body.documentoCodigo || body.documento_codigo)
    const contexto = texto(body.contexto || body.origem || 'app')
    const userId = texto(body.userId || body.user_id)

    if (!documentoCodigo) return json({ sucesso: false, erro: 'documentoCodigo é obrigatório.' }, 400)
    if (!DOCUMENTOS[documentoCodigo]) return json({ sucesso: false, erro: `Documento legal inválido: ${documentoCodigo}` }, 400)
    if (!contexto) return json({ sucesso: false, erro: 'contexto é obrigatório.' }, 400)

    const documento = DOCUMENTOS[documentoCodigo]
    const agora = new Date().toISOString()

    const payload: AnyRecord = {
      user_id: userId || null,
      tipo_usuario: texto(body.tipoUsuario || body.tipo_usuario) || null,
      documento_codigo: documentoCodigo,
      documento_titulo: documento.titulo,
      documento_versao: texto(body.versao || body.documento_versao) || documento.versao,
      contexto,
      contexto_id: texto(body.contextoId || body.contexto_id) || null,
      reserva_id: texto(body.reservaId || body.reserva_id) || null,
      roteiro_id: texto(body.roteiroId || body.roteiro_id) || null,
      guia_id: texto(body.guiaId || body.guia_id) || null,
      participantes: Array.isArray(body.participantes) ? body.participantes : [],
      dados_declarados: body.dadosDeclarados || body.dados_declarados || {},
      aceite_texto: texto(body.aceiteTexto || body.aceite_texto) || null,
      origem: texto(body.origem) || contexto,
      ip: getIp(request),
      user_agent: request.headers.get('user-agent') || '',
      metadata: body.metadata || {},
      created_at: agora,
    }

    payload.documento_hash = await sha256Hex(getHashBase(payload))

    const aceite = await inserirComFallback(supabase, 'aceites_legais', payload)

    if (userId && documentoCodigo === 'termos_uso') {
      await updateComFallback(supabase, 'users', userId, {
        termos_aceitos_em: agora,
        termos_aceitos_versao: payload.documento_versao,
      }).catch(() => null)
    }

    if (userId && documentoCodigo === 'termo_guia') {
      await updateComFallback(supabase, 'users', userId, {
        termo_guia_aceito_em: agora,
        termo_guia_aceito_versao: payload.documento_versao,
      }).catch(() => null)
    }

    if (payload.reserva_id && documentoCodigo === 'termo_riscos') {
      await updateComFallback(supabase, 'reservas', payload.reserva_id, {
        termo_riscos_aceito_em: agora,
        termo_riscos_aceito_versao: payload.documento_versao,
      }).catch(() => null)
    }

    if (payload.roteiro_id && documentoCodigo === 'termo_guia') {
      await updateComFallback(supabase, 'roteiros', payload.roteiro_id, {
        termo_guia_aceito_em: agora,
        termo_guia_aceito_versao: payload.documento_versao,
      }).catch(() => null)
    }

    return json({ sucesso: true, aceite })
  } catch (error: any) {
    console.error('Erro em /api/legal/aceite:', error)
    return json({ sucesso: false, erro: error?.message || 'Erro ao registrar aceite legal.' }, 500)
  }
}
