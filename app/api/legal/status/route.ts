import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AnyRecord = Record<string, any>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const VERSAO_LEGAL_ATUAL = 'V8_FINAL_BETA_MVP_EI_2026_06_17'

function json(data: AnyRecord, status = 200) {
  return NextResponse.json(data, { status })
}

function admin() {
  if (!supabaseUrl || !supabaseServiceKey) throw new Error('Supabase env ausente.')
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function texto(valor: unknown) {
  return String(valor || '').trim()
}

export async function GET(request: NextRequest) {
  try {
    const supabase = admin()
    const userId = texto(request.nextUrl.searchParams.get('userId'))
    const documentoCodigo = texto(request.nextUrl.searchParams.get('documentoCodigo'))
    const contexto = texto(request.nextUrl.searchParams.get('contexto'))
    const contextoId = texto(request.nextUrl.searchParams.get('contextoId'))
    const versao = texto(request.nextUrl.searchParams.get('versao')) || VERSAO_LEGAL_ATUAL

    if (!userId) return json({ sucesso: false, erro: 'userId é obrigatório.' }, 400)
    if (!documentoCodigo) return json({ sucesso: false, erro: 'documentoCodigo é obrigatório.' }, 400)

    let query = supabase
      .from('aceites_legais')
      .select('*')
      .eq('user_id', userId)
      .eq('documento_codigo', documentoCodigo)
      .eq('documento_versao', versao)
      .order('created_at', { ascending: false })
      .limit(1)

    if (contexto) query = query.eq('contexto', contexto)
    if (contextoId) query = query.eq('contexto_id', contextoId)

    const { data, error } = await query
    if (error) throw error

    return json({
      sucesso: true,
      aceito: Boolean(data?.[0]?.id),
      aceite: data?.[0] || null,
      documentoCodigo,
      versao,
    })
  } catch (error: any) {
    console.error('Erro em /api/legal/status:', error)
    return json({ sucesso: false, erro: error?.message || 'Erro ao consultar aceite legal.' }, 500)
  }
}
