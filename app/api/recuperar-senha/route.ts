import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { Resend } from 'resend'
import { randomBytes } from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { identificador } = await request.json()
    
    console.log('📝 API recuperar-senha chamada com:', identificador)

    if (!identificador) {
      return NextResponse.json({ error: 'CPF ou e-mail é obrigatório' }, { status: 400 })
    }

    // Determinar se é CPF ou e-mail
    const isCPF = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(identificador) || /^\d{11}$/.test(identificador)
    const valorBusca = isCPF ? identificador.replace(/\D/g, '') : identificador

    // Buscar usuário
    let query = supabase.from('users').select('id, email, nome')
    if (isCPF) {
      query = query.eq('cpf', valorBusca)
    } else {
      query = query.eq('email', valorBusca)
    }

    const { data: user, error } = await query.single()

    if (error || !user) {
      console.log('⚠️ Usuário não encontrado')
      // Não revelamos se o usuário existe por segurança
      return NextResponse.json({ 
        success: true, 
        message: 'Se o e-mail/CPF existir, você receberá as instruções.' 
      })
    }

    console.log('✅ Usuário encontrado:', user.email)

    // Gerar token
    const token = randomBytes(32).toString('hex')
    const expiraEm = new Date()
    expiraEm.setHours(expiraEm.getHours() + 1)

    // Salvar token no banco
    const { error: insertError } = await supabase
      .from('password_resets')
      .insert({
        usuario_id: user.id,
        token: token,
        expira_em: expiraEm.toISOString(),
        usado: false
      })

    if (insertError) {
      console.error('❌ Erro ao salvar token:', insertError)
      return NextResponse.json({ error: 'Erro ao processar solicitação' }, { status: 500 })
    }

    // Link de recuperação
    const resetLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/resetar-senha?token=${token}`

    // Enviar e-mail
    try {
      const { data, error: emailError } = await resend.emails.send({
        from: 'PussikTrails <naoresponda@pussiktrails.com>',
        to: user.email,
        subject: 'Recuperação de senha - PussikTrails',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #dc2626; padding: 20px; text-align: center; border-radius: 16px 16px 0 0;">
              <h1 style="color: white; margin: 0;">🏔️ PussikTrails</h1>
            </div>
            <div style="background-color: #f3f4f6; padding: 30px; border-radius: 0 0 16px 16px;">
              <h2 style="color: #111827; margin-top: 0;">Olá, ${user.nome || 'Aventureiro'}!</h2>
              <p style="color: #4b5563;">Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 40px; font-weight: bold;">
                  Redefinir minha senha
                </a>
              </div>
              <p style="color: #4b5563; font-size: 12px;">Este link é válido por 1 hora. Se você não solicitou essa alteração, ignore este e-mail.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="color: #9ca3af; font-size: 10px; text-align: center;">PussikTrails - Sua aventura começa aqui</p>
            </div>
          </div>
        `
      })

      if (emailError) {
        console.error('❌ Erro ao enviar e-mail:', emailError)
        return NextResponse.json({ 
          error: 'Erro ao enviar e-mail. Tente novamente.' 
        }, { status: 500 })
      }

      console.log('✅ E-mail enviado com sucesso para:', user.email)
      
      return NextResponse.json({ 
        success: true, 
        message: '✅ Um link de recuperação foi enviado para seu e-mail!' 
      })

    } catch (emailError) {
      console.error('❌ Erro ao enviar e-mail:', emailError)
      return NextResponse.json({ 
        error: 'Erro ao enviar e-mail. Tente novamente.' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Erro fatal:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}