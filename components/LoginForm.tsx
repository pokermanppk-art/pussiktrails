'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type UsuarioLocal = {
  id: string
  nome?: string | null
  email?: string | null
  tipo?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
}

export default function LoginForm() {
  const router = useRouter()

  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    router.prefetch('/cliente/dashboard')
    router.prefetch('/guia/dashboard')
    router.prefetch('/roteiros')
  }, [router])

  function texto(valor: unknown) {
    return String(valor || '').trim()
  }

  function limparCpf(valor: string) {
    return valor.replace(/\D/g, '')
  }

  function formatarCPF(valor: string) {
    let numeros = limparCpf(valor)

    if (numeros.length > 11) numeros = numeros.slice(0, 11)
    if (numeros.length <= 3) return numeros
    if (numeros.length <= 6) return `${numeros.slice(0, 3)}.${numeros.slice(3)}`
    if (numeros.length <= 9) return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`

    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9, 11)}`
  }

  function handleLoginChange(valor: string) {
    const apenasNumeros = limparCpf(valor)

    if (apenasNumeros.length > 0 && apenasNumeros.length <= 11 && !valor.includes('@')) {
      setLogin(formatarCPF(valor))
      return
    }

    setLogin(valor)
  }

  function rotaPorTipo(tipo?: string | null, redirectAfterLogin?: string) {
    const t = String(tipo || '').toLowerCase()

    if (
      redirectAfterLogin &&
      redirectAfterLogin.startsWith('/') &&
      !redirectAfterLogin.startsWith('/api') &&
      !redirectAfterLogin.startsWith('/admin') &&
      !redirectAfterLogin.startsWith('//')
    ) {
      if (t === 'cliente') return redirectAfterLogin
      if (t === 'guia' && redirectAfterLogin.startsWith('/roteiros')) return redirectAfterLogin
    }

    if (t === 'admin') return '/admin/dashboard'
    if (t === 'guia') return '/guia/dashboard'

    return '/cliente/dashboard'
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault()

    if (carregando) return

    setErro('')

    const loginFinal = texto(login)
    const senhaFinal = texto(senha)

    if (!loginFinal) {
      setErro('Informe seu CPF ou e-mail.')
      return
    }

    if (!senhaFinal) {
      setErro('Informe sua senha.')
      return
    }

    setCarregando(true)

    try {
      const redirectAfterLogin = localStorage.getItem('redirectAfterLogin') || ''

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          login: loginFinal,
          cpf: loginFinal,
          email: loginFinal,
          senha: senhaFinal,
          redirectAfterLogin,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.sucesso || !data?.user?.id) {
        setErro(data?.erro || data?.error || 'Usuário ou senha inválidos.')
        return
      }

      const user: UsuarioLocal = data.user
      const destino = data.redirectTo || rotaPorTipo(user.tipo, redirectAfterLogin)

      localStorage.setItem('user', JSON.stringify(user))
      localStorage.removeItem('redirectAfterLogin')

      router.replace(destino)
    } catch (error) {
      console.error('Erro no login:', error)
      setErro('Erro ao conectar com o servidor.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <form className="mt-8 space-y-6" onSubmit={handleLogin}>
      <div className="rounded-md shadow-sm -space-y-px">
        <div>
          <input
            type="text"
            required
            autoComplete="username"
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
            placeholder="CPF ou e-mail"
            value={login}
            onChange={(event) => handleLoginChange(event.target.value)}
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
            onChange={(event) => setSenha(event.target.value)}
          />
        </div>
      </div>

      {erro && (
        <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">
          {erro}
        </div>
      )}

      <button
        type="submit"
        disabled={carregando}
        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
      >
        {carregando ? 'Entrando...' : 'Entrar'}
      </button>

      <div className="text-center">
        <a href="/recuperar-senha" className="text-sm text-green-600 hover:text-green-500">
          Esqueceu sua senha?
        </a>
      </div>
    </form>
  )
}