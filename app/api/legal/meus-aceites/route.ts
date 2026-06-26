import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AnyRecord = Record<string, any>
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function json(data: AnyRecord, status = 200) { return NextResponse.json(data, { status }) }
function texto(v: unknown) { return String(v || '').trim() }
function admin() {
  if (!supabaseUrl || !supabaseServiceKey) throw new Error('Supabase env ausente.')
  return createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function GET(request: NextRequest) {
  try {
    const userId = texto(request.nextUrl.searchParams.get('userId'))
    if (!userId) return json({ sucesso: false, erro: 'userId é obrigatório.' }, 400)

    const { data, error } = await admin()
      .from('aceites_legais')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return json({ sucesso: true, aceites: data || [] })
  } catch (error: any) {
    console.error('Erro em /api/legal/meus-aceites:', error)
    return json({ sucesso: false, erro: error?.message || 'Erro ao listar aceites.' }, 500)
  }
}
