'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const LOGO_SRC = '/logo-login-montanha-prussik.jpg?v=20260528'

type AffiliateLoginResponse = {
  sucesso?: boolean
  erro?: string
  redirectTo?: string
  afiliado?: {
    id: string
    nome: string
    email: string
    telefone?: string
    status: string
  }
}

export default function AffiliateLoginPage() {
  const router = useRouter()
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [checando, setChecando] = useState(true)

  useEffect(() => {
    fetch('/api/afiliados/me', { cache: 'no-store' })
      .then((response) => {
        if (response.ok) router.replace('/afiliados/dashboard')
      })
      .finally(() => setChecando(false))
  }, [router])

  function onlyDigits(value: string) {
    return value.replace(/\D/g, '')
  }

  function formatCpf(value: string) {
    const numbers = onlyDigits(value).slice(0, 11)
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
    if (numbers.length <= 9) {
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
    }
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`
  }

  function handleLoginChange(value: string) {
    const isCpfInput = !value.includes('@') && !/[a-zA-Z]/.test(value)
    setLogin(isCpfInput ? formatCpf(value) : value)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (carregando) return

    setMensagem('')

    if (!login.trim() || !senha.trim()) {
      setMensagem('Informe seu e-mail ou CPF e sua senha.')
      return
    }

    setCarregando(true)

    try {
      const response = await fetch('/api/afiliados/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ login: login.trim(), senha }),
      })

      const data = (await response.json().catch(() => ({}))) as AffiliateLoginResponse

      if (!response.ok || !data.sucesso || !data.afiliado) {
        throw new Error(data.erro || 'Não foi possível acessar sua conta.')
      }

      localStorage.setItem('affiliate', JSON.stringify(data.afiliado))
      router.replace(data.redirectTo || '/afiliados/dashboard')
    } catch (error) {
      setMensagem(
        error instanceof Error
          ? error.message
          : 'Não foi possível acessar o Portal de Afiliados.',
      )
    } finally {
      setCarregando(false)
    }
  }

  if (checando) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8fafc' }}>
        <strong style={{ color: '#0f172a' }}>Abrindo o Portal de Afiliados...</strong>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #f8fafc; }
        .page {
          min-height: 100vh; min-height: 100dvh;
          display: grid; place-items: center; padding: 22px 14px;
          background:
            radial-gradient(circle at 8% 0%, rgba(34,197,94,.15), transparent 30%),
            linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
          color: #0f172a;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .card {
          width: min(500px, 100%); padding: 30px; border-radius: 32px;
          background: rgba(255,255,255,.96); border: 1px solid rgba(15,23,42,.08);
          box-shadow: 0 24px 70px rgba(15,23,42,.14);
        }
        .brand { display: flex; justify-content: center; }
        .logoBox { width: 200px; height: 105px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .logoBox img { width: 200px; height: 200px; object-fit: contain; transform: scale(1.53); }
        .eyebrow { text-align: center; color: #16a34a; font-size: 12px; font-weight: 950; letter-spacing: .12em; text-transform: uppercase; margin: 5px 0 10px; }
        h1 { text-align: center; margin: 0; font-size: 36px; line-height: 1.02; letter-spacing: -.055em; }
        .intro { text-align: center; color: #64748b; line-height: 1.55; margin: 14px auto 25px; }
        form { display: grid; gap: 16px; }
        label { display: grid; gap: 8px; color: #334155; font-size: 13px; font-weight: 900; }
        input { width: 100%; border: 1px solid #dbe4f2; border-radius: 17px; padding: 15px 16px; background: #f1f5f9; color: #0f172a; font-size: 16px; outline: none; }
        input:focus { background: white; border-color: #22c55e; box-shadow: 0 0 0 4px rgba(34,197,94,.12); }
        .error { padding: 12px 14px; border-radius: 16px; background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; font-size: 13px; line-height: 1.45; font-weight: 800; text-align: center; }
        button { border: 0; border-radius: 999px; padding: 16px 18px; font-size: 16px; font-weight: 950; cursor: pointer; }
        .primary { background: #22c55e; color: #052e16; box-shadow: 0 14px 28px rgba(34,197,94,.2); }
        .primary:hover:not(:disabled) { background: #16a34a; color: white; transform: translateY(-1px); }
        button:disabled { opacity: .65; cursor: not-allowed; }
        .links { display: grid; gap: 10px; margin-top: 20px; text-align: center; }
        .linkButton { background: transparent; color: #166534; padding: 5px; font-size: 14px; box-shadow: none; }
        .linkButton:hover { text-decoration: underline; }
        .back { color: #64748b; }
        @media (max-width: 520px) { .card { padding: 25px 20px 29px; border-radius: 28px; } h1 { font-size: 31px; } }
      `}</style>

      <section className="card">
        <div className="brand">
          <div className="logoBox">
            <img src={LOGO_SRC} alt="PrussikTrails" />
          </div>
        </div>

        <p className="eyebrow">Portal de Afiliados</p>
        <h1>Bem-vindo de volta.</h1>
        <p className="intro">
          Entre com o e-mail ou CPF utilizado na solicitação de afiliado.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            E-mail ou CPF
            <input
              value={login}
              onChange={(event) => handleLoginChange(event.target.value)}
              type="text"
              autoComplete="username"
              placeholder="seuemail@email.com ou CPF"
              disabled={carregando}
            />
          </label>

          <label>
            Senha
            <input
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              type="password"
              autoComplete="current-password"
              placeholder="Digite sua senha"
              disabled={carregando}
            />
          </label>

          {mensagem ? <div className="error">{mensagem}</div> : null}

          <button className="primary" type="submit" disabled={carregando}>
            {carregando ? 'Entrando...' : 'Acessar Portal de Afiliados'}
          </button>
        </form>

        <div className="links">
          <button className="linkButton" onClick={() => router.push('/afiliados/cadastro')}>
            Ainda não sou afiliado. Solicitar cadastro
          </button>
          <button className="linkButton back" onClick={() => router.push('/afiliados')}>
            Voltar ao início do Portal
          </button>
        </div>
      </section>
    </main>
  )
}
