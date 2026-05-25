'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Usuario = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
  senha?: string | null
  password?: string | null
  tipo?: string | null
  status?: string | null
  ativo?: boolean | null
}

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    const userData = localStorage.getItem('user')

    if (!userData) return

    try {
      const user = JSON.parse(userData)

      if (user?.tipo === 'cliente') {
        router.replace('/cliente/dashboard')
        return
      }

      if (user?.tipo === 'guia') {
        router.replace('/guia/dashboard')
        return
      }

      if (user?.tipo === 'admin') {
        router.replace('/admin/dashboard')
      }
    } catch {
      localStorage.removeItem('user')
    }
  }, [router])

  const normalizarTexto = (valor: any) => {
    return String(valor || '').trim()
  }

  const normalizarEmail = (valor: string) => {
    return normalizarTexto(valor).toLowerCase()
  }

  const validarEmail = (valor: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)
  }

  const redirecionarUsuario = (tipo: string) => {
    if (tipo === 'admin') {
      router.replace('/admin/dashboard')
      return
    }

    if (tipo === 'guia') {
      router.replace('/guia/dashboard')
      return
    }

    router.replace('/cliente/dashboard')
  }

  const entrar = async (event: FormEvent) => {
    event.preventDefault()

    setMensagem('')

    const emailFinal = normalizarEmail(email)
    const senhaFinal = normalizarTexto(senha)

    if (!emailFinal || !validarEmail(emailFinal)) {
      setMensagem('Informe um e-mail válido.')
      return
    }

    if (!senhaFinal) {
      setMensagem('Informe sua senha.')
      return
    }

    setCarregando(true)

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', emailFinal)
        .maybeSingle()

      if (error) {
        console.error('Erro ao buscar usuário:', error)
        setMensagem('Erro ao acessar sua conta. Tente novamente.')
        return
      }

      if (!data) {
        setMensagem('E-mail ou senha inválidos.')
        return
      }

      const usuario = data as Usuario
      const senhaBanco = normalizarTexto(usuario.senha || usuario.password)

      if (senhaBanco !== senhaFinal) {
        setMensagem('E-mail ou senha inválidos.')
        return
      }

      const status = normalizarTexto(usuario.status).toLowerCase()

      if (status === 'inativo' || usuario.ativo === false) {
        setMensagem('Sua conta está inativa. Entre em contato com o suporte.')
        return
      }

      const tipo = normalizarTexto(usuario.tipo || 'cliente').toLowerCase()

      const usuarioLocal = {
        id: usuario.id,
        nome: usuario.nome || usuario.name || 'Usuário',
        email: usuario.email || emailFinal,
        tipo
      }

      localStorage.setItem('user', JSON.stringify(usuarioLocal))

      redirecionarUsuario(tipo)
    } catch (error) {
      console.error('Erro no login:', error)
      setMensagem('Erro ao fazer login. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f3f4f6;
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
            radial-gradient(circle at top left, rgba(22, 163, 74, 0.12), transparent 30%),
            linear-gradient(180deg, #ffffff 0%, #eef2f7 100%);
          color: #111827;
        }

        .topBar {
          height: 64px;
          background: #dc2626;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
        }

        .topLogo {
          height: 42px;
          width: auto;
          object-fit: contain;
          display: block;
        }

        .container {
          width: 100%;
          max-width: 520px;
          margin: 0 auto;
          padding: 34px 18px 44px;
        }

        .card {
          background: #ffffff;
          border-radius: 32px;
          padding: 30px;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.10);
          border: 1px solid #eef2f7;
        }

        .brand {
          display: flex;
          justify-content: center;
          margin-bottom: 18px;
        }

        .brand img {
          height: 78px;
          width: auto;
          object-fit: contain;
          display: block;
        }

        .title {
          margin: 0;
          text-align: center;
          font-size: 32px;
          font-weight: 900;
          color: #111827;
          letter-spacing: -0.04em;
        }

        .heroPhrase {
          margin: 12px auto 28px;
          text-align: center;
          color: #111827;
          font-size: 28px;
          line-height: 1.08;
          font-weight: 900;
          letter-spacing: -0.05em;
        }

        .heroPhrase span {
          color: #16a34a;
        }

        .form {
          display: grid;
          gap: 16px;
        }

        .formGroup {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        label {
          font-size: 13px;
          font-weight: 800;
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
          border-color: #16a34a;
          box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.12);
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
          font-weight: 700;
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .submitButton {
          width: 100%;
          border: none;
          border-radius: 999px;
          padding: 16px;
          background: #15803d;
          color: #ffffff;
          font-size: 18px;
          font-weight: 900;
          cursor: pointer;
          transition: 0.2s ease;
          margin-top: 4px;
        }

        .submitButton:hover:not(:disabled) {
          background: #166534;
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(22, 101, 52, 0.22);
        }

        .submitButton:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .linkRow {
          display: flex;
          justify-content: center;
          margin-top: 14px;
        }

        .textButton {
          border: none;
          background: transparent;
          color: #16a34a;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          text-decoration: none;
        }

        .divider {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 14px;
          margin: 22px 0;
          color: #9ca3af;
          font-size: 14px;
        }

        .divider::before,
        .divider::after {
          content: "";
          height: 1px;
          background: #e5e7eb;
        }

        .secondaryButton {
          width: 100%;
          border: 1px solid #16a34a;
          border-radius: 999px;
          padding: 15px;
          background: #ffffff;
          color: #16a34a;
          font-size: 17px;
          font-weight: 900;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .secondaryButton:hover {
          background: #f0fdf4;
        }

        .hint {
          margin: 16px 0 0;
          text-align: center;
          color: #9ca3af;
          font-size: 12px;
          line-height: 1.45;
        }

        @media (max-width: 520px) {
          .topBar {
            height: 62px;
          }

          .container {
            padding: 24px 14px 34px;
          }

          .card {
            border-radius: 28px;
            padding: 24px 18px;
          }

          .brand img {
            height: 68px;
          }

          .title {
            font-size: 28px;
          }

          .heroPhrase {
            font-size: 26px;
          }

          input {
            font-size: 16px;
            padding: 14px 15px;
          }
        }
      `}</style>

      <header className="topBar">
        <img
          src="/logo-prussik-display.png"
          alt="PrussikTrails"
          className="topLogo"
        />
      </header>

      <div className="container">
        <section className="card">
          <div className="brand">
            <img
              src="/logo-prussik-display.png"
              alt="PrussikTrails"
            />
          </div>

          <h1 className="title">Entrar</h1>

          <p className="heroPhrase">
            Sua próxima
            <br />
            aventura começa
            <br />
            <span>aqui.</span>
          </p>

          <form className="form" onSubmit={entrar}>
            <div className="formGroup">
              <label>E-mail *</label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seuemail@email.com"
                type="email"
                autoComplete="email"
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
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="linkRow">
            <button
              type="button"
              className="textButton"
              onClick={() => router.push('/recuperar-senha')}
            >
              Esqueci minha senha
            </button>
          </div>

          <div className="divider">ou</div>

          <button
            type="button"
            className="secondaryButton"
            onClick={() => router.push('/cadastro')}
          >
            Criar conta
          </button>

          <p className="hint">
            Use o mesmo e-mail cadastrado no app.
          </p>
        </section>
      </div>
    </main>
  )
}