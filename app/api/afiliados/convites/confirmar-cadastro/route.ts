import { NextResponse } from 'next/server'

import {
  normalizeEmail,
  normalizePhone,
  normalizeText,
} from '@/lib/affiliate-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))

    const invitationToken = normalizeText(
      body?.invitationToken || body?.invitation_token || body?.convite,
    )
    const guideUserId = normalizeText(
      body?.guideUserId || body?.guide_user_id || body?.userId,
    )
    const guideName = normalizeText(body?.guideName || body?.guide_name)
    const guideEmail = normalizeEmail(body?.guideEmail || body?.guide_email)
    const guidePhone = normalizePhone(body?.guidePhone || body?.guide_phone)

    if (!invitationToken || !guideUserId || !guideEmail || !guidePhone) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Dados insuficientes para confirmar a indicação do guia.',
        },
        { status: 400 },
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: lead, error } = await supabase
      .from('affiliate_guide_leads')
      .select(
        'id, affiliate_id, guide_name, guide_email, guide_phone, status, invitation_expires_at, referred_user_id',
      )
      .eq('invitation_token', invitationToken)
      .maybeSingle()

    if (error) throw error

    if (!lead) {
      return NextResponse.json(
        { sucesso: false, erro: 'Convite de afiliado não encontrado.' },
        { status: 404 },
      )
    }

    if (new Date(lead.invitation_expires_at).getTime() < Date.now()) {
      await supabase
        .from('affiliate_guide_leads')
        .update({ status: 'expired' })
        .eq('id', lead.id)

      return NextResponse.json(
        { sucesso: false, erro: 'Este convite expirou.' },
        { status: 410 },
      )
    }

    if (lead.referred_user_id && lead.referred_user_id !== guideUserId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Este convite já foi utilizado por outro cadastro.',
        },
        { status: 409 },
      )
    }

    const emailMatches = lead.guide_email.toLowerCase() === guideEmail
    const phoneMatches = lead.guide_phone === guidePhone

    if (!emailMatches && !phoneMatches) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            'Os dados do cadastro não correspondem ao pré-cadastro realizado pelo afiliado.',
        },
        { status: 409 },
      )
    }

    const now = new Date().toISOString()

    const { error: updateError } = await supabase
      .from('affiliate_guide_leads')
      .update({
        guide_name: guideName || lead.guide_name,
        guide_email: guideEmail,
        guide_phone: guidePhone,
        referred_user_id: guideUserId,
        guide_confirmed_at: now,
        invitation_accessed_at: now,
        status: 'registration_completed',
      })
      .eq('id', lead.id)

    if (updateError) throw updateError

    await supabase.from('affiliate_audit_log').insert({
      affiliate_id: lead.affiliate_id,
      guide_lead_id: lead.id,
      action: 'guide_registration_linked',
      actor_type: 'guide',
      actor_identifier: guideUserId,
      metadata: {
        email_match: emailMatches,
        phone_match: phoneMatches,
      },
    })

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Cadastro do guia vinculado ao afiliado com sucesso.',
    })
  } catch (error) {
    console.error('Erro ao confirmar cadastro indicado:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro: 'Não foi possível confirmar o vínculo com o afiliado.',
      },
      { status: 500 },
    )
  }
}
