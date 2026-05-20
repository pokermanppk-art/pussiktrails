'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const router = useRouter()
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf, senha })
      })

      const data = await res.json()

      if (!res.ok) {
        setErro(data.error || 'Erro no login')
        return
      }

      const user = data.user

      localStorage.setItem('user', JSON.stringify({
        id: user.id,
        nome: user.nome,
        email: user.email,
        tipo: user.tipo,
      }))

      // Redireciona conforme o tipo
      if (user.tipo === 'cliente') router.push('/cliente/dashboard')
      else if (user.tipo === 'guia') router.push('/guia/dashboard')
      else router.push('/admin/dashboard')
    } catch (err) {
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
          <h2 className="text-3xl font-extrabold text-gray-900">Prussik Trails</h2>
          <p className="mt-2 text-sm text-gray-600">Digite seu CPF e senha</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="CPF (ex: 111.222.333-44)"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
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

          <button
            type="submit"
            disabled={carregando}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}