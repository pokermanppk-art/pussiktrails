import { NextResponse } from 'next/server'

import { getAffiliateSession } from '@/lib/affiliate-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getAffiliateSession()

    if (!session) {
      return NextResponse.json(
        { sucesso: false, erro: 'Sessão de afiliado não encontrada.' },
        { status: 401 },
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: affiliate, error } = await supabase
      .from('affiliate_accounts')
      .select(
        'id, full_name, email, phone, cpf_last4, status, rejection_reason, linked_profile_id, created_at, approved_at, last_login_at',
      )
      .eq('id', session.sub)
      .single()

    if (error || !affiliate) {
      return NextResponse.json(
        { sucesso: false, erro: 'Conta de afiliado não encontrada.' },
        { status: 404 },
      )
    }

    if (affiliate.status === 'suspended' || affiliate.status === 'rejected') {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'O acesso desta conta não está disponível.',
          status: affiliate.status,
        },
        { status: 403 },
      )
    }

    return NextResponse.json({
      sucesso: true,
      afiliado: {
        id: affiliate.id,
        nome: affiliate.full_name,
        email: affiliate.email,
        telefone: affiliate.phone,
        cpf_final: affiliate.cpf_last4,
        status: affiliate.status,
        motivo_rejeicao: affiliate.rejection_reason,
        perfil_principal_id: affiliate.linked_profile_id,
        criado_em: affiliate.created_at,
        aprovado_em: affiliate.approved_at,
        ultimo_login_em: affiliate.last_login_at,
      },
    })
  } catch (error) {
    console.error('Erro ao carregar afiliado:', error)

    return NextResponse.json(
      { sucesso: false, erro: 'Não foi possível carregar sua conta.' },
      { status: 500 },
    )
  }
}
