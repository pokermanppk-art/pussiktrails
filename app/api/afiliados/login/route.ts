import { NextResponse } from 'next/server'

import {
  AFFILIATE_COOKIE_NAME,
  affiliateCookieOptions,
  cpfFingerprint,
  createAffiliateSessionToken,
  normalizeCpf,
  normalizeEmail,
  normalizeText,
  verifyPassword,
} from '@/lib/affiliate-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const login = normalizeText(body?.login || body?.email || body?.cpf)
    const password = normalizeText(body?.senha || body?.password)

    if (!login || !password) {
      return NextResponse.json(
        { sucesso: false, erro: 'Informe seu e-mail ou CPF e sua senha.' },
        { status: 400 },
      )
    }

    const supabase = getSupabaseAdmin()
    const normalizedEmail = normalizeEmail(login)
    const cpf = normalizeCpf(login)

    let query = supabase
      .from('affiliate_accounts')
      .select(
        'id, full_name, email, phone, cpf_last4, password_hash, status, rejection_reason, created_at, approved_at',
      )

    if (cpf.length === 11) {
      query = query.eq('cpf_fingerprint', cpfFingerprint(cpf))
    } else {
      query = query.eq('email', normalizedEmail)
    }

    const { data: affiliate, error } = await query.maybeSingle()

    if (error) throw error

    if (!affiliate || !verifyPassword(password, affiliate.password_hash)) {
      return NextResponse.json(
        { sucesso: false, erro: 'E-mail/CPF ou senha inválidos.' },
        { status: 401 },
      )
    }

    if (affiliate.status === 'rejected') {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            affiliate.rejection_reason ||
            'Sua solicitação de afiliado não foi aprovada.',
        },
        { status: 403 },
      )
    }

    if (affiliate.status === 'suspended') {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Seu acesso ao Portal de Afiliados está temporariamente suspenso.',
        },
        { status: 403 },
      )
    }

    const token = createAffiliateSessionToken({
      affiliateId: affiliate.id,
      email: affiliate.email,
    })

    await supabase
      .from('affiliate_accounts')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', affiliate.id)

    const response = NextResponse.json({
      sucesso: true,
      redirectTo: '/afiliados/dashboard',
      afiliado: {
        id: affiliate.id,
        nome: affiliate.full_name,
        email: affiliate.email,
        telefone: affiliate.phone,
        cpf_final: affiliate.cpf_last4,
        status: affiliate.status,
        motivo_rejeicao: affiliate.rejection_reason,
        criado_em: affiliate.created_at,
        aprovado_em: affiliate.approved_at,
      },
    })

    response.cookies.set(AFFILIATE_COOKIE_NAME, token, affiliateCookieOptions())

    return response
  } catch (error) {
    console.error('Erro no login de afiliado:', error)

    return NextResponse.json(
      { sucesso: false, erro: 'Não foi possível acessar o Portal de Afiliados.' },
      { status: 500 },
    )
  }
}
