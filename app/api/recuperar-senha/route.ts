import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body?.email || '').trim().toLowerCase()

    if (!email) {
      return NextResponse.json(
        {
          error: true,
          message: 'E-mail não informado.'
        },
        { status: 400 }
      )
    }

    const resendApiKey = process.env.RESEND_API_KEY
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://prussiktrails.vercel.app'

    if (!resendApiKey) {
      console.error('RESEND_API_KEY ausente na Vercel.')

      return NextResponse.json(
        {
          error: true,
          message:
            'Serviço de e-mail não configurado. Configure RESEND_API_KEY na Vercel.'
        },
        { status: 500 }
      )
    }

    const resend = new Resend(resendApiKey)

    const resetUrl = `${appUrl}/resetar-senha?email=${encodeURIComponent(email)}`

    const { data, error } = await resend.emails.send({
      from: 'PrussikTrails <onboarding@resend.dev>',
      to: email,
      subject: 'Recuperação de senha - PrussikTrails',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Recuperação de senha</h2>
          <p>Recebemos uma solicitação para recuperar sua senha no PrussikTrails.</p>
          <p>Clique no botão abaixo para continuar:</p>
          <p>
            <a href="${resetUrl}" style="background:#dc2626;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block;">
              Redefinir senha
            </a>
          </p>
          <p>Se você não solicitou isso, ignore este e-mail.</p>
        </div>
      `
    })

    if (error) {
      console.error('Erro Resend:', error)

      return NextResponse.json(
        {
          error: true,
          message: 'Erro ao enviar e-mail de recuperação.',
          details: error
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'E-mail de recuperação enviado.',
      data
    })
  } catch (error: any) {
    console.error('Erro recuperar senha:', error)

    return NextResponse.json(
      {
        error: true,
        message:
          error?.message || 'Erro interno ao solicitar recuperação de senha.'
      },
      { status: 500 }
    )
  }
}