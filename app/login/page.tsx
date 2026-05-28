'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
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

const LOGO_LOGIN_SRC = '/logo-login-montanha-prussik.jpg?v=20260528'

export default function LoginPage() {
  const router = useRouter()

  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [checandoSessao, setChecandoSessao] = useState(true)

  useEffect(() => {
    const userData = localStorage.getItem('user')

    if (!userData) {
      setChecandoSessao(false)
      return
    }

    try {
      const user = JSON.parse(userData) as UsuarioLocal
      const tipo = String(user?.tipo || '').toLowerCase()

      if (user?.id && tipo === 'cliente') {
        router.replace('/cliente/dashboard')
        return
      }

      if (user?.id && tipo === 'guia') {
        router.replace('/guia/dashboard')
        return
      }

      if (user?.id && tipo === 'admin') {
        router.replace('/admin/dashboard')
        return
      }

      localStorage.removeItem('user')
      setChecandoSessao(false)
    } catch {
      localStorage.removeItem('user')
      setChecandoSessao(false)
    }
  }, [router])

  const redirectAfterLogin = useMemo(() => {
    if (typeof window === 'undefined') return ''

    const salvo = localStorage.getItem('redirectAfterLogin') || ''

    if (
      salvo.startsWith('/') &&
      !salvo.startsWith('/api') &&
      !salvo.startsWith('/admin') &&
      !salvo.startsWith('//')
    ) {
      return salvo
    }

    return ''
  }, [])

  function texto(valor: unknown) {
    return String(valor || '').trim()
  }

  function normalizarLogin(valor: string) {
    return texto(valor).toLowerCase()
  }

  function rotaPorTipo(tipo?: string | null) {
    const t = String(tipo || '').toLowerCase()

    if (redirectAfterLogin && t === 'cliente') return redirectAfterLogin

    if (
      redirectAfterLogin &&
      t === 'guia' &&
      redirectAfterLogin.startsWith('/roteiros')
    ) {
      return redirectAfterLogin
    }

    if (t === 'admin') return '/admin/dashboard'
    if (t === 'guia') return '/guia/dashboard'

    return '/cliente/dashboard'
  }

  async function entrar(event: FormEvent) {
    event.preventDefault()

    if (carregando) return

    setMensagem('')

    const loginFinal = normalizarLogin(login)
    const senhaFinal = texto(senha)

    if (!loginFinal) {
      setMensagem('Informe seu e-mail ou CPF.')
      return
    }

    if (!senhaFinal) {
      setMensagem('Informe sua senha.')
      return
    }

    setCarregando(true)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          login: loginFinal,
          email: loginFinal,
          cpf: loginFinal,
          senha: senhaFinal,
          redirectAfterLogin,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.sucesso || !data?.user?.id) {
        setMensagem(data?.erro || data?.error || 'Usuário ou senha inválidos.')
        setCarregando(false)
        return
      }

      const user: UsuarioLocal = data.user
      const destino = data.redirectTo || rotaPorTipo(user.tipo)

      localStorage.setItem('user', JSON.stringify(user))
      localStorage.removeItem('redirectAfterLogin')

      router.replace(destino)
    } catch (error) {
      console.error('Erro no login:', error)
      setMensagem('Erro ao fazer login. Tente novamente.')
      setCarregando(false)
    }
  }

  if (checandoSessao) {
    return (
      <main className="page loadingPage">
        <style>{`
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            background: #fffdf7;
            font-family:
              Inter,
              ui-sans-serif,
              system-ui,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
          }

          .page {
            min-height: 100vh;
            min-height: 100dvh;
            background:
              radial-gradient(circle at top left, rgba(132, 204, 22, 0.10), transparent 30%),
              linear-gradient(180deg, #fffdf7 0%, #eef2e5 100%);
            color: #203c2e;
          }

          .loadingPage {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .loadingBox {
            text-align: center;
            color: #203c2e;
            font-size: 14px;
            font-weight: 850;
          }

          .loadingMark {
            width: 42px;
            height: 42px;
            border-radius: 999px;
            margin: 0 auto 14px;
            border: 3px solid rgba(32, 60, 46, 0.12);
            border-top-color: #203c2e;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>

        <div className="loadingBox">
          <div className="loadingMark" aria-hidden="true" />
          Abrindo sua área...
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #fffdf7;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .page {
          min-height: 100vh;
          min-height: 100dvh;
          background:
            radial-gradient(circle at 8% 0%, rgba(132, 204, 22, 0.15), transparent 30%),
            radial-gradient(circle at 92% 8%, rgba(251, 146, 60, 0.10), transparent 28%),
            linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
          color: #111827;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px 14px;
        }

        .container {
          width: 100%;
          max-width: 492px;
          margin: 0 auto;
        }

        .card {
          background: rgba(255, 255, 255, 0.94);
          border-radius: 34px;
          padding: 30px 30px 34px;
          box-shadow:
            0 24px 58px rgba(32, 60, 46, 0.12),
            0 8px 22px rgba(15, 23, 42, 0.06);
          border: 1px solid rgba(15, 23, 42, 0.055);
          backdrop-filter: blur(14px);
          overflow: hidden;
        }

        .brand {
          display: flex;
          justify-content: center;
          margin: 0 auto 16px;
          width: 100%;
          overflow: visible;
        }

        .brandLogoCrop {
          width: 220px;
          height: 116px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          flex: 0 0 auto;
        }

        .brandLogoCrop img {
          width: 220px;
          height: 220px;
          object-fit: contain;
          display: block;
          transform: scale(1.58);
          transform-origin: center;
        }

        .heroPhrase {
          margin: 0 auto 28px;
          max-width: 330px;
          text-align: center;
          color: #172018;
          font-size: 30px;
          line-height: 1.03;
          font-weight: 950;
          letter-spacing: -0.065em;
        }

        .heroPhrase span {
          color: #203c2e;
        }

        .form {
          display: grid;
          gap: 17px;
        }

        .formGroup {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        label {
          font-size: 13px;
          font-weight: 900;
          color: #334155;
          letter-spacing: -0.01em;
        }

        input {
          width: 100%;
          border: 1px solid #dbe4f2;
          border-radius: 18px;
          padding: 15px 17px;
          font-size: 16px;
          color: #111827;
          background: #eef5ff;
          outline: none;
          transition: 0.2s ease;
        }

        input:focus {
          background: #ffffff;
          border-color: #203c2e;
          box-shadow: 0 0 0 4px rgba(32, 60, 46, 0.11);
        }

        input::placeholder {
          color: #94a3b8;
        }

        input:disabled {
          opacity: 0.72;
          cursor: not-allowed;
        }

        .message {
          padding: 13px 15px;
          border-radius: 18px;
          font-size: 13px;
          line-height: 1.45;
          text-align: center;
          font-weight: 800;
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .submitButton {
          width: 100%;
          border: none;
          border-radius: 999px;
          padding: 17px;
          background: #203c2e;
          color: #ffffff;
          font-size: 17px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
          margin-top: 6px;
          box-shadow: 0 14px 26px rgba(32, 60, 46, 0.18);
        }

        .submitButton:hover:not(:disabled) {
          background: #294735;
          transform: translateY(-1px);
          box-shadow: 0 18px 32px rgba(32, 60, 46, 0.24);
        }

        .submitButton:disabled {
          opacity: 0.72;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .linkRow {
          display: flex;
          justify-content: center;
          margin-top: 18px;
        }

        .textButton {
          border: none;
          background: transparent;
          color: #203c2e;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          text-decoration: none;
          padding: 4px 6px;
        }

        .textButton:hover {
          text-decoration: underline;
        }

        .textButton:disabled {
          opacity: 0.58;
          cursor: not-allowed;
        }

        .divider {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 14px;
          margin: 25px 0;
          color: #9ca3af;
          font-size: 14px;
          font-weight: 850;
        }

        .divider::before,
        .divider::after {
          content: "";
          height: 1px;
          background: #e5e7eb;
        }

        .secondaryButton {
          width: 100%;
          border: 1.5px solid #203c2e;
          border-radius: 999px;
          padding: 15px;
          background: #ffffff;
          color: #203c2e;
          font-size: 16px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .secondaryButton:hover:not(:disabled) {
          background: #f0fdf4;
          transform: translateY(-1px);
        }

        .secondaryButton:disabled {
          opacity: 0.58;
          cursor: not-allowed;
        }

        .hint {
          margin: 20px 0 0;
          text-align: center;
          color: #7b8372;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
        }

        @media (max-width: 520px) {
          .page {
            align-items: flex-start;
            padding: 18px 12px 26px;
          }

          .container {
            max-width: 100%;
          }

          .card {
            border-radius: 30px;
            padding: 26px 20px 30px;
          }

          .brand {
            margin-bottom: 14px;
          }

          .brandLogoCrop {
            width: 198px;
            height: 106px;
          }

          .brandLogoCrop img {
            width: 198px;
            height: 198px;
            transform: scale(1.54);
          }

          .heroPhrase {
            font-size: 27px;
            max-width: 300px;
            margin-bottom: 26px;
          }

          .form {
            gap: 16px;
          }

          input {
            font-size: 15px;
            padding: 14px 15px;
          }

          .submitButton {
            padding: 15px;
            font-size: 16px;
          }

          .secondaryButton {
            padding: 14px;
            font-size: 15px;
          }
        }

        @media (max-width: 380px) {
          .card {
            padding: 24px 18px 28px;
          }

          .brandLogoCrop {
            width: 184px;
            height: 98px;
          }

          .brandLogoCrop img {
            width: 184px;
            height: 184px;
            transform: scale(1.50);
          }

          .heroPhrase {
            font-size: 25px;
          }
        }
      `}</style>

      <div className="container">
        <section className="card">
          <div className="brand">
            <div className="brandLogoCrop">
              <img
                src={LOGO_LOGIN_SRC}
                alt="PrussikTrails"
                loading="eager"
                decoding="async"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            </div>
          </div>

          <p className="heroPhrase">
            Sua próxima
            <br />
            aventura começa
            <br />
            <span>aqui.</span>
          </p>

          <form className="form" onSubmit={entrar}>
            <div className="formGroup">
              <label>E-mail ou CPF *</label>
              <input
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                placeholder="seuemail@email.com ou CPF"
                type="text"
                autoComplete="username"
                inputMode="email"
                disabled={carregando}
              />
            </div>

            <div className="formGroup">
              <label>Senha *</label>
              <input
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                placeholder="Digite sua senha"
                type="password"
                autoComplete="current-password"
                disabled={carregando}
              />
            </div>

            {mensagem && (
              <div className="message">
                {mensagem}
              </div>
            )}

            <button
              type="submit"
              className="submitButton"
              disabled={carregando}
            >
              {carregando ? 'Entrando...' : 'Acessar minha conta'}
            </button>
          </form>

          <div className="linkRow">
            <button
              type="button"
              className="textButton"
              onClick={() => router.push('/recuperar-senha')}
              disabled={carregando}
            >
              Esqueci minha senha
            </button>
          </div>

          <div className="divider">ou</div>

          <button
            type="button"
            className="secondaryButton"
            onClick={() => router.push('/cadastro')}
            disabled={carregando}
          >
            Criar nova conta
          </button>

          <p className="hint">
            Use o mesmo e-mail ou CPF cadastrado no app.
          </p>
        </section>
      </div>
    </main>
  )
}