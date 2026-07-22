import { NextResponse } from 'next/server'

import { validateAdminSecret } from '@/lib/affiliate-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = request.headers.get('x-affiliate-admin-secret')

  if (!validateAdminSecret(secret)) {
    return NextResponse.json(
      { sucesso: false, erro: 'Acesso administrativo não autorizado.' },
      { status: 401 },
    )
  }

  try {
    const supabase = getSupabaseAdmin()

    const { data: affiliates, error } = await supabase
      .from('affiliate_accounts')
      .select(
        'id, full_name, email, phone, cpf_last4, birth_date, status, rejection_reason, approval_requested_at, approved_at, created_at, last_login_at',
      )
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      sucesso: true,
      afiliados: affiliates || [],
    })
  } catch (error) {
    console.error('Erro ao listar afiliados no admin:', error)

    return NextResponse.json(
      { sucesso: false, erro: 'Não foi possível carregar os afiliados.' },
      { status: 500 },
    )
  }
}
