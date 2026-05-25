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
          background: #ffffff;
          border-radius: 32px;
          padding: 40px 30px;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.10);
          border: 1px solid #eef2f7;
        }

        .brand {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
        }

        .brand img {
          height: 88px;
          width: auto;
          object-fit: contain;
          display: block;
        }

        .heroPhrase {
          margin: 0 auto 32px;
          text-align: center;
          color: #111827;
          font-size: 26px;
          line-height: 1.2;
          font-weight: 900;
          letter-spacing: -0.05em;
        }

        .heroPhrase span {
          color: #16a34a;
        }

        .form {
          display: grid;
          gap: 20px;
        }

        .formGroup {
          display: flex;
          flex-direction: column;
          gap: 8px;
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
          background: #16a34a;
          color: #ffffff;
          font-size: 17px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
          margin-top: 8px;
        }

        .submitButton:hover:not(:disabled) {
          background: #15803d;
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
          margin-top: 18px;
        }

        .textButton {
          border: none;
          background: transparent;
          color: #16a34a;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          text-decoration: none;
        }

        .divider {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 14px;
          margin: 24px 0;
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
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .secondaryButton:hover {
          background: #f0fdf4;
        }

        .hint {
          margin: 20px 0 0;
          text-align: center;
          color: #9ca3af;
          font-size: 12px;
          line-height: 1.45;
        }

        @media (max-width: 520px) {
          .container {
            padding: 24px 14px 34px;
          }

          .card {
            border-radius: 28px;
            padding: 28px 20px;
          }

          .brand img {
            height: 72px;
          }

          .heroPhrase {
            font-size: 22px;
            margin-bottom: 28px;
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
              src="/logo-prussik-display.png"
              alt="PrussikTrails"
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
              {carregando ? 'Entrando...' : 'Acessar minha conta'}
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
            Criar nova conta
          </button>

          <p className="hint">
            Use o mesmo e-mail cadastrado no app.
          </p>
        </section>
      </div>
    </main>
  )
}