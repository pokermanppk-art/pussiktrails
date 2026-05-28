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
              radial-gradient(circle at top left, rgba(22, 163, 74, 0.10), transparent 30%),
              linear-gradient(180deg, #fffdf7 0%, #eef2e5 100%);
            color: #111827;
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
            font-weight: 800;
          }

          .loadingBox img {
            width: 128px;
            height: 128px;
            object-fit: contain;
            display: block;
            margin: 0 auto 14px;
          }
        `}</style>

        <div className="loadingBox">
          <img
            src="/logo-login-montanha-prussik.jpg"
            alt="PrussikTrails"
            loading="eager"
            decoding="async"
          />
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
            radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.13), transparent 28%),
            radial-gradient(circle at 90% 10%, rgba(251, 146, 60, 0.10), transparent 28%),
            linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
          color: #111827;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .container {
          width: 100%;
          max-width: 520px;
          margin: 0 auto;
          padding: 34px 18px 44px;
        }

        .card {
          background: rgba(255, 255, 255, 0.92);
          border-radius: 32px;
          padding: 38px 30px;
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.09);
          border: 1px solid rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(14px);
        }

        .brand {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }

        .brand img {
          width: 168px;
          height: 168px;
          object-fit: contain;
          display: block;
          border-radius: 0;
        }

        .heroPhrase {
          margin: 0 auto 30px;
          text-align: center;
          color: #172018;
          font-size: 26px;
          line-height: 1.2;
          font-weight: 950;
          letter-spacing: -0.055em;
        }

        .heroPhrase span {
          color: #203c2e;
        }

        .form {
          display: grid;
          gap: 18px;
        }

        .formGroup {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        label {
          font-size: 13px;
          font-weight: 850;
          color: #374151;
        }

        input {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 15px 16px;
          font-size: 16px;
          color: #111827;
          background: #ffffff;
          outline: none;
          transition: 0.2s ease;
        }

        input:focus {
          border-color: #203c2e;
          box-shadow: 0 0 0 4px rgba(32, 60, 46, 0.11);
        }

        input::placeholder {
          color: #9ca3af;
        }

        .message {
          padding: 14px 16px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.45;
          text-align: center;
          font-weight: 750;
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .submitButton {
          width: 100%;
          border: none;
          border-radius: 999px;
          padding: 16px;
          background: #203c2e;
          color: #ffffff;
          font-size: 17px;
          font-weight: 850;
          cursor: pointer;
          transition: 0.2s ease;
          margin-top: 6px;
        }

        .submitButton:hover:not(:disabled) {
          background: #294735;
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(32, 60, 46, 0.22);
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
          font-weight: 850;
          cursor: pointer;
          text-decoration: none;
        }

        .textButton:hover {
          text-decoration: underline;
        }

        .divider {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 14px;
          margin: 24px 0;
          color: #9ca3af;
          font-size: 14px;
          font-weight: 700;
        }

        .divider::before,
        .divider::after {
          content: "";
          height: 1px;
          background: #e5e7eb;
        }

        .secondaryButton {
          width: 100%;
          border: 1px solid #203c2e;
          border-radius: 999px;
          padding: 15px;
          background: #ffffff;
          color: #203c2e;
          font-size: 16px;
          font-weight: 850;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .secondaryButton:hover {
          background: #f0fdf4;
        }

        .hint {
          margin: 20px 0 0;
          text-align: center;
          color: #7b8372;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 650;
        }

        @media (max-width: 520px) {
          .container {
            padding: 22px 14px 34px;
          }

          .card {
            border-radius: 28px;
            padding: 28px 20px;
          }

          .brand {
            margin-bottom: 16px;
          }

          .brand img {
            width: 138px;
            height: 138px;
          }

          .heroPhrase {
            font-size: 22px;
            margin-bottom: 26px;
          }

          input {
            font-size: 15px;
            padding: 13px 14px;
          }

          .submitButton {
            padding: 14px;
            font-size: 16px;
          }
        }
      `}</style>

      <div className="container">
        <section className="card">
          <div className="brand">
            <img
              src="/logo-login-montanha-prussik.jpg"
              alt="PrussikTrails"
              loading="eager"
              decoding="async"
              onError={(event) => {
                event.currentTarget.src = '/logo-prussik-display.png'
              }}
            />
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