import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = body?.email

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
      console.error('RESEND_API_KEY ausente no ambiente.')

      return NextResponse.json(
        {
          error: true,
          message:
            'Serviço de e-mail não configurado. Defina RESEND_API_KEY na Vercel.'
        },
        { status: 500 }
      )
    }

    const resend = new Resend(resendApiKey)

    const linkRecuperacao = `${appUrl}/login`

    const { data, error } = await resend.emails.send({
      from: 'PrussikTrails <onboarding@resend.dev>',
      to: email,
      subject: 'Recuperação de senha - PrussikTrails',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2>Recuperação de senha</h2>

          <p>Olá,</p>

          <p>Recebemos uma solicitação de recuperação de senha para sua conta no PrussikTrails.</p>

          <p>
            Acesse o app para redefinir ou solicitar nova senha:
          </p>

          <p>
            <a 
              href="${linkRecuperacao}" 
              style="display:inline-block;background:#16a34a;color:#ffffff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:bold;"
            >
              Acessar PrussikTrails
            </a>
          </p>

          <p>Se você não solicitou essa recuperação, ignore este e-mail.</p>

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

          <p style="font-size:12px;color:#6b7280;">
            PrussikTrails - Sua aventura começa aqui.
          </p>
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
      message: 'E-mail de recuperação enviado com sucesso.',
      data
    })

  } catch (error: any) {
    console.error('Erro em recuperar-senha:', error)

    return NextResponse.json(
      {
        error: true,
        message: error?.message || 'Erro interno ao recuperar senha.'
      },
      { status: 500 }
    )
  }
}