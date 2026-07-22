import { NextResponse } from 'next/server'

import {
  getAffiliateSession,
  isValidEmail,
  normalizeEmail,
  normalizePhone,
  normalizeText,
} from '@/lib/affiliate-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getApprovedAffiliate() {
  const session = await getAffiliateSession()

  if (!session) {
    return {
      error: NextResponse.json(
        { sucesso: false, erro: 'Sessão de afiliado não encontrada.' },
        { status: 401 },
      ),
    }
  }

  const supabase = getSupabaseAdmin()
  const { data: affiliate, error } = await supabase
    .from('affiliate_accounts')
    .select('id, status, full_name, email')
    .eq('id', session.sub)
    .single()

  if (error || !affiliate) {
    return {
      error: NextResponse.json(
        { sucesso: false, erro: 'Conta de afiliado não encontrada.' },
        { status: 404 },
      ),
    }
  }

  return { affiliate, supabase }
}

export async function GET() {
  try {
    const result = await getApprovedAffiliate()
    if ('error' in result) return result.error

    const { affiliate, supabase } = result

    const { data: leads, error } = await supabase
      .from('affiliate_guide_leads')
      .select(
        'id, guide_name, guide_phone, guide_email, cadastur_number, invitation_token, invitation_expires_at, invitation_accessed_at, status, referred_user_id, guide_confirmed_at, rejection_reason, created_at, updated_at',
      )
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const now = Date.now()
    const expiredIds = (leads || [])
      .filter(
        (lead) =>
          lead.status === 'invitation_pending' &&
          new Date(lead.invitation_expires_at).getTime() < now,
      )
      .map((lead) => lead.id)

    if (expiredIds.length > 0) {
      await supabase
        .from('affiliate_guide_leads')
        .update({ status: 'expired' })
        .in('id', expiredIds)
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      'https://prussiktrails.com.br'

    return NextResponse.json({
      sucesso: true,
      afiliado_status: affiliate.status,
      guias: (leads || []).map((lead) => ({
        ...lead,
        status: expiredIds.includes(lead.id) ? 'expired' : lead.status,
        invitation_url: `${appUrl}/cadastro?tipo=guia&convite=${lead.invitation_token}`,
      })),
    })
  } catch (error) {
    console.error('Erro ao listar guias indicados:', error)

    return NextResponse.json(
      { sucesso: false, erro: 'Não foi possível carregar suas indicações.' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const result = await getApprovedAffiliate()
    if ('error' in result) return result.error

    const { affiliate, supabase } = result

    if (affiliate.status !== 'approved') {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            'Seu cadastro precisa ser aprovado antes de você indicar guias.',
        },
        { status: 403 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const guideName = normalizeText(body?.nome || body?.guide_name)
    const guidePhone = normalizePhone(body?.telefone || body?.guide_phone)
    const guideEmail = normalizeEmail(body?.email || body?.guide_email)
    const cadasturNumber = normalizeText(
      body?.cadastur || body?.cadastur_number,
    )

    if (guideName.split(/\s+/).filter(Boolean).length < 2) {
      return NextResponse.json(
        { sucesso: false, erro: 'Informe o nome completo do guia.' },
        { status: 400 },
      )
    }

    if (guidePhone.length < 10) {
      return NextResponse.json(
        { sucesso: false, erro: 'Informe um telefone válido para o guia.' },
        { status: 400 },
      )
    }

    if (!isValidEmail(guideEmail)) {
      return NextResponse.json(
        { sucesso: false, erro: 'Informe um e-mail válido para o guia.' },
        { status: 400 },
      )
    }

    const { data: duplicate, error: duplicateError } = await supabase
      .from('affiliate_guide_leads')
      .select('id, affiliate_id, guide_name, status, invitation_expires_at')
      .or(`guide_email.eq.${guideEmail},guide_phone.eq.${guidePhone}`)
      .not('status', 'in', '(rejected,expired)')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (duplicateError) throw duplicateError

    if (duplicate) {
      const sameAffiliate = duplicate.affiliate_id === affiliate.id

      return NextResponse.json(
        {
          sucesso: false,
          erro: sameAffiliate
            ? 'Este guia já possui uma indicação ativa na sua conta.'
            : 'Este guia já possui uma indicação ativa. A equipe analisará eventual disputa de atribuição.',
        },
        { status: 409 },
      )
    }

    const { data: lead, error } = await supabase
      .from('affiliate_guide_leads')
      .insert({
        affiliate_id: affiliate.id,
        guide_name: guideName,
        guide_phone: guidePhone,
        guide_email: guideEmail,
        cadastur_number: cadasturNumber || null,
        status: 'invitation_pending',
      })
      .select(
        'id, guide_name, guide_phone, guide_email, cadastur_number, invitation_token, invitation_expires_at, status, created_at',
      )
      .single()

    if (error) throw error

    await supabase.from('affiliate_audit_log').insert({
      affiliate_id: affiliate.id,
      guide_lead_id: lead.id,
      action: 'guide_pre_registration_created',
      actor_type: 'affiliate',
      actor_identifier: affiliate.email,
      metadata: {
        cadastur_informed: Boolean(cadasturNumber),
      },
    })

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      'https://prussiktrails.com.br'

    return NextResponse.json(
      {
        sucesso: true,
        mensagem: 'Guia pré-cadastrado e convite gerado com sucesso.',
        guia: {
          ...lead,
          invitation_url: `${appUrl}/cadastro?tipo=guia&convite=${lead.invitation_token}`,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Erro ao pré-cadastrar guia:', error)

    return NextResponse.json(
      { sucesso: false, erro: 'Não foi possível registrar a indicação.' },
      { status: 500 },
    )
  }
}
