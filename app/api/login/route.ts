import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: Request) {
  try {
    const { cpf, senha } = await request.json()

    const cpfLimpo = cpf.replace(/\D/g, '')

    // Buscar usuário
    const { data: user, error } = await supabase
      .from('users')
      .select('id, nome, email, tipo, status, senha_hash, senha')
      .eq('cpf', cpfLimpo)
      .maybeSingle()

    if (error) {
      console.error('Erro:', error)
      return NextResponse.json({ error: 'Erro ao buscar usuário' }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json({ error: 'CPF não encontrado' }, { status: 401 })
    }

    // Verifica status
    if (user.status !== 'ativo') {
      return NextResponse.json({ error: 'Usuário inativo' }, { status: 401 })
    }

    // 🔓 VERIFICAÇÃO SIMPLES (apenas para teste)
    // Tenta comparar com senha_hash primeiro, se não, com senha antiga
    let senhaValida = false
    
    if (user.senha_hash) {
      // Se tiver bcrypt, usa (mas vamos pular por enquanto)
      senhaValida = user.senha_hash === senha // apenas para teste!
    } else if (user.senha) {
      senhaValida = user.senha === senha
    }

    if (!senhaValida) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
    }

    const { senha_hash, senha: _, ...userSemSenha } = user
    return NextResponse.json({ user: userSemSenha })

  } catch (err) {
    console.error('Erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}