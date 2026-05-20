import { NextResponse } from 'next/server'

// Dados mockados para teste (SUBSTITUA pelos dados reais do seu banco)
const USUARIOS_MOCK = [
  {
    id: '1',
    nome: 'Admin Teste',
    email: 'admin@prussik.com',
    cpf: '111.222.333-44',
    senha: '123456',
    tipo: 'admin',
    status: 'ativo'
  },
  {
    id: '2',
    nome: 'Cliente Teste',
    email: 'cliente@prussik.com',
    cpf: '222.333.444-55',
    senha: '123456',
    tipo: 'cliente',
    status: 'ativo'
  },
  {
    id: '3',
    nome: 'Guia Teste',
    email: 'guia@prussik.com',
    cpf: '333.444.555-66',
    senha: '123456',
    tipo: 'guia',
    status: 'ativo'
  }
]

export async function POST(request: Request) {
  try {
    const { cpf, senha } = await request.json()
    
    // Busca usuário no mock
    const user = USUARIOS_MOCK.find(u => u.cpf === cpf)
    
    if (!user) {
      return NextResponse.json({ error: 'CPF não encontrado' }, { status: 401 })
    }
    
    if (user.senha !== senha) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
    }
    
    if (user.status !== 'ativo') {
      return NextResponse.json({ error: 'Usuário inativo' }, { status: 401 })
    }
    
    // Retorna usuário sem a senha
    const { senha: _, ...userSemSenha } = user
    
    return NextResponse.json({ user: userSemSenha })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}