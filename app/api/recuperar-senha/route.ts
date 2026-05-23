import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { randomBytes } from 'crypto'

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

    console.log('🔍 Buscando por:', valorBusca, isCPF ? '(CPF)' : '(E-mail)')

    // Buscar usuário
    let query = supabase.from('users').select('id, email, nome')
    if (isCPF) {
      query = query.eq('cpf', valorBusca)
    } else {
      query = query.eq('email', valorBusca)
    }

    const { data: user, error } = await query.single()

    if (error || !user) {
      console.log('⚠️ Usuário não encontrado ou erro:', error?.message)
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

    // Tentar salvar token - se a tabela não existir, vamos criar via SQL manual
    const { error: insertError } = await supabase
      .from('password_resets')
      .insert({
        usuario_id: user.id,
        token: token,
        expira_em: expiraEm.toISOString(),
        usado: false
      })

    if (insertError) {
      console.error('❌ Erro ao salvar token:', insertError.message)
      
      // Se a tabela não existe, informa o erro claramente
      if (insertError.message.includes('relation "password_resets" does not exist')) {
        console.log('📦 A tabela password_resets não existe!')
        return NextResponse.json({ 
          error: 'Erro de configuração: tabela password_resets não existe. Execute o SQL no Supabase.' 
        }, { status: 500 })
      }
      
      return NextResponse.json({ error: 'Erro ao processar solicitação: ' + insertError.message }, { status: 500 })
    }

    // Link de recuperação
    const resetLink = `http://localhost:3000/resetar-senha?token=${token}`
    
    console.log('🔗 LINK DE RECUPERAÇÃO:', resetLink)

    // Retorna o link diretamente (para desenvolvimento)
    return NextResponse.json({ 
      success: true, 
      message: `✅ Link gerado! Clique aqui: ${resetLink}`,
      link: resetLink
    })

  } catch (error) {
    console.error('❌ Erro fatal:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor: ' + (error as Error).message },
      { status: 500 }
    )
  }
}