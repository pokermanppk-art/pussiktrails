import { NextResponse } from 'next/server'

import {
  cpfFingerprint,
  hashPassword,
  isAdult,
  isValidCpf,
  isValidEmail,
  normalizeCpf,
  normalizeEmail,
  normalizePhone,
  normalizeText,
} from '@/lib/affiliate-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))

    const fullName = normalizeText(body?.nome || body?.full_name)
    const email = normalizeEmail(body?.email)
    const phone = normalizePhone(body?.telefone || body?.phone)
    const cpf = normalizeCpf(body?.cpf)
    const birthDate = normalizeText(body?.data_nascimento || body?.birth_date)
    const password = normalizeText(body?.senha || body?.password)
    const confirmPassword = normalizeText(
      body?.confirmar_senha || body?.confirm_password,
    )
    const acceptedTerms = Boolean(body?.aceitou_termos || body?.accepted_terms)
    const acceptedPrivacy = Boolean(
      body?.aceitou_privacidade || body?.accepted_privacy,
    )

    if (fullName.split(/\s+/).filter(Boolean).length < 2) {
      return NextResponse.json(
        { sucesso: false, erro: 'Informe seu nome completo.' },
        { status: 400 },
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { sucesso: false, erro: 'Informe um e-mail válido.' },
        { status: 400 },
      )
    }

    if (phone.length < 10) {
      return NextResponse.json(
        { sucesso: false, erro: 'Informe um celular válido.' },
        { status: 400 },
      )
    }

    if (!isValidCpf(cpf)) {
      return NextResponse.json(
        { sucesso: false, erro: 'Informe um CPF válido.' },
        { status: 400 },
      )
    }

    if (!birthDate || !isAdult(birthDate)) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'O cadastro de afiliado é permitido somente para maiores de 18 anos.',
        },
        { status: 400 },
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'A senha deve ter pelo menos 8 caracteres.',
        },
        { status: 400 },
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { sucesso: false, erro: 'As senhas não conferem.' },
        { status: 400 },
      )
    }

    if (!acceptedTerms || !acceptedPrivacy) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Confirme o aceite dos Termos e da Política de Privacidade.',
        },
        { status: 400 },
      )
    }

    const supabase = getSupabaseAdmin()
    const fingerprint = cpfFingerprint(cpf)

    const { data: existing, error: existingError } = await supabase
      .from('affiliate_accounts')
      .select('id, email, status')
      .or(`email.eq.${email},cpf_fingerprint.eq.${fingerprint}`)
      .limit(1)
      .maybeSingle()

    if (existingError) throw existingError

    if (existing) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            'Já existe uma solicitação de afiliado vinculada a este e-mail ou CPF.',
        },
        { status: 409 },
      )
    }

    const { data: affiliate, error } = await supabase
      .from('affiliate_accounts')
      .insert({
        full_name: fullName,
        email,
        phone,
        cpf_fingerprint: fingerprint,
        cpf_last4: cpf.slice(-4),
        birth_date: birthDate,
        password_hash: hashPassword(password),
        status: 'pending',
        terms_accepted_at: new Date().toISOString(),
        privacy_accepted_at: new Date().toISOString(),
        approval_requested_at: new Date().toISOString(),
      })
      .select('id, full_name, email, phone, status, created_at')
      .single()

    if (error) throw error

    await supabase.from('affiliate_audit_log').insert({
      affiliate_id: affiliate.id,
      action: 'affiliate_registration_requested',
      actor_type: 'affiliate',
      actor_identifier: email,
      metadata: {
        source: 'exclusive_affiliate_portal',
      },
    })

    return NextResponse.json(
      {
        sucesso: true,
        mensagem:
          'Cadastro recebido. Seu perfil será analisado pela equipe PrussikTrails.',
        afiliado: affiliate,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Erro ao cadastrar afiliado:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro: 'Não foi possível concluir o cadastro do afiliado.',
      },
      { status: 500 },
    )
  }
}
