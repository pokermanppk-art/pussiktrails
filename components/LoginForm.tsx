'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase/client'
import { registrarAtividade } from '@/lib/logAtividade'

export default function LoginForm() {
  const router = useRouter()
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  // Função para formatar CPF visualmente
  const formatarCPF = (valor: string) => {
    let numeros = valor.replace(/\D/g, '')
    if (numeros.length > 11) numeros = numeros.slice(0, 11)
    if (numeros.length <= 3) return numeros
    if (numeros.length <= 6) return `${numeros.slice(0, 3)}.${numeros.slice(3)}`
    if (numeros.length <= 9) return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`
    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9, 11)}`
  }

  const extrairNumerosCPF = (cpfFormatado: string) => cpfFormatado.replace(/\D/g, '')

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatarCPF(e.target.value))
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const cpfLimpo = extrairNumerosCPF(cpf)

    try {
      // Buscar usuário pelo CPF
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, nome, email, tipo, status, senha_hash')
        .eq('cpf', cpfLimpo)
        .maybeSingle()

      if (userError || !user) {
        setErro('CPF não encontrado')
        setCarregando(false)
        return
      }

      // Verificar status do usuário
      if (user.status !== 'ativo') {
        let mensagem = 'Usuário inativo'
        if (user.status === 'pendente') {
          mensagem = '⏳ Seu cadastro está pendente de aprovação. Aguarde o administrador.'
        } else if (user.status === 'suspenso') {
          mensagem = '⚠️ Sua conta está suspensa. Entre em contato com o suporte.'
        }
        setErro(mensagem)
        setCarregando(false)
        return
      }

      // Verificar se tem senha_hash
      if (!user.senha_hash) {
        console.error('Usuário sem senha_hash configurada')
        setErro('Erro de configuração. Contate o suporte.')
        setCarregando(false)
        return
      }

      // Verificar senha usando bcrypt
      const senhaValida = await bcrypt.compare(senha, user.senha_hash)
      
      if (!senhaValida) {
        setErro('Senha incorreta')
        setCarregando(false)
        return
      }

      // Salvar sessão
      localStorage.setItem('user', JSON.stringify({
        id: user.id,
        nome: user.nome,
        email: user.email,
        tipo: user.tipo,
      }))

      // Registrar atividade de login
      const primeiroNome = user.nome?.split(' ')[0] || user.email?.split('@')[0] || 'Usuário'
      const tipoUsuario = user.tipo === 'cliente' ? 'cliente' : (user.tipo === 'guia' ? 'guia' : 'admin')
      const detalhes = `${primeiroNome} (${tipoUsuario === 'cliente' ? 'Aventureiro' : tipoUsuario === 'guia' ? 'Navegador' : 'Administrador'}) fez login`

      await registrarAtividade(
        user.id,
        tipoUsuario,
        primeiroNome,
        'login',
        detalhes
      )

      // Redirecionar conforme o tipo
      if (user.tipo === 'cliente') {
        router.push('/cliente/dashboard')
      } else if (user.tipo === 'guia') {
        router.push('/guia/dashboard')
      } else {
        router.push('/admin/dashboard')
      }

    } catch (err: any) {
      console.error('Erro no login:', err)
      setErro('Erro ao conectar com o servidor.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="text-4xl mb-2">🏔️</div>
          <h2 className="text-3xl font-extrabold text-gray-900">PussikTrails</h2>
          <p className="mt-2 text-sm text-gray-600">Digite seu CPF e senha</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="text"
                required
                autoComplete="username"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="CPF (ex: 111.222.333-44)"
                value={cpf}
                onChange={handleCpfChange}
                maxLength={14}
              />
            </div>
            <div>
              <input
                type="password"
                required
                autoComplete="current-password"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
          </div>

          {erro && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">
              {erro}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={carregando}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>

        <div className="text-center">
          <a href="/recuperar-senha" className="text-sm text-green-600 hover:text-green-500">
            Esqueceu sua senha?
          </a>
        </div>

        <div className="text-center text-xs text-gray-500">
          Ao continuar, você concorda com nossos Termos de Uso
        </div>
      </div>
    </div>
  )
}