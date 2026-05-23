'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function ResetarSenhaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [token, setToken] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    const tokenUrl =
      searchParams.get('token') ||
      searchParams.get('code') ||
      ''

    const emailUrl =
      searchParams.get('email') ||
      ''

    if (tokenUrl) {
      setToken(tokenUrl)
    }

    if (emailUrl) {
      setEmail(emailUrl)
    }
  }, [searchParams])

  const validarFormulario = () => {
    if (!email.trim()) {
      setMensagem('Informe o e-mail cadastrado.')
      return false
    }

    if (!novaSenha.trim()) {
      setMensagem('Informe a nova senha.')
      return false
    }

    if (novaSenha.length < 6) {
      setMensagem('A senha deve ter pelo menos 6 caracteres.')
      return false
    }

    if (novaSenha !== confirmarSenha) {
      setMensagem('As senhas não conferem.')
      return false
    }

    return true
  }

  const handleResetarSenha = async (event: React.FormEvent) => {
    event.preventDefault()

    setMensagem('')
    setSucesso(false)

    if (!validarFormulario()) return

    setCarregando(true)

    try {
      const response = await fetch('/api/resetar-senha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          novaSenha,
          token
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.message ||
          data?.error ||
          'Erro ao resetar senha.'
        )
      }

      setSucesso(true)
      setMensagem('Senha alterada com sucesso. Você já pode fazer login.')

      setTimeout(() => {
        router.push('/login')
      }, 1800)

    } catch (error: any) {
      console.error('Erro ao resetar senha:', error)

      setMensagem(
        error?.message ||
        'Não foi possível resetar a senha. Tente novamente.'
      )

    } finally {
      setCarregando(false)
    }
  }

  return (
    <>
      <style jsx global>{`
        .reset-page {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #111827 0%, #1f2937 45%, #dc2626 100%);
          padding: 20px;
        }

        .reset-card {
          width: 100%;
          max-width: 440px;
          background: #ffffff;
          border-radius: 24px;
          padding: 28px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
        }

        .reset-logo {
          text-align: center;
          margin-bottom: 22px;
        }

        .reset-logo h1 {
          color: #dc2626;
          font-size: 28px;
          font-weight: 800;
          margin: 0;
        }

        .reset-logo p {
          color: #6b7280;
          font-size: 13px;
          margin: 6px 0 0;
        }

        .reset-title {
          font-size: 22px;
          font-weight: 800;
          color: #111827;
          margin: 0 0 8px;
          text-align: center;
        }

        .reset-subtitle {
          color: #6b7280;
          font-size: 14px;
          line-height: 1.5;
          text-align: center;
          margin: 0 0 22px;
        }

        .reset-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field-group label {
          font-size: 13px;
          font-weight: 700;
          color: #374151;
        }

        .field-group input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 14px;
          padding: 13px 14px;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
        }

        .field-group input:focus {
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
        }

        .reset-button {
          width: 100%;
          border: none;
          border-radius: 999px;
          background: #dc2626;
          color: #ffffff;
          padding: 14px 18px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          margin-top: 8px;
          min-height: 50px;
        }

        .reset-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .reset-message {
          margin-top: 16px;
          padding: 13px 14px;
          border-radius: 14px;
          font-size: 13px;
          line-height: 1.45;
          text-align: center;
        }

        .reset-message.success {
          background: #dcfce7;
          color: #166534;
        }

        .reset-message.error {
          background: #fee2e2;
          color: #991b1b;
        }

        .reset-footer {
          margin-top: 20px;
          text-align: center;
        }

        .reset-footer button {
          background: transparent;
          border: none;
          color: #dc2626;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        @media (max-width: 480px) {
          .reset-page {
            padding: 14px;
            align-items: flex-start;
            padding-top: 44px;
          }

          .reset-card {
            border-radius: 20px;
            padding: 22px;
          }

          .reset-logo h1 {
            font-size: 25px;
          }

          .reset-title {
            font-size: 20px;
          }
        }
      `}</style>

      <main className="reset-page">
        <section className="reset-card">
          <div className="reset-logo">
            <h1>PrussikTrails</h1>
            <p>Sua aventura começa aqui</p>
          </div>

          <h2 className="reset-title">
            Redefinir senha
          </h2>

          <p className="reset-subtitle">
            Informe seu e-mail e cadastre uma nova senha de acesso.
          </p>

          <form
            className="reset-form"
            onSubmit={handleResetarSenha}
          >
            <div className="field-group">
              <label htmlFor="email">
                E-mail
              </label>

              <input
                id="email"
                type="email"
                value={email}
                placeholder="seuemail@exemplo.com"
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="field-group">
              <label htmlFor="novaSenha">
                Nova senha
              </label>

              <input
                id="novaSenha"
                type="password"
                value={novaSenha}
                placeholder="Digite sua nova senha"
                autoComplete="new-password"
                onChange={(event) => setNovaSenha(event.target.value)}
              />
            </div>

            <div className="field-group">
              <label htmlFor="confirmarSenha">
                Confirmar nova senha
              </label>

              <input
                id="confirmarSenha"
                type="password"
                value={confirmarSenha}
                placeholder="Confirme sua nova senha"
                autoComplete="new-password"
                onChange={(event) => setConfirmarSenha(event.target.value)}
              />
            </div>

            <button
              type="submit"
              className="reset-button"
              disabled={carregando}
            >
              {carregando
                ? 'Alterando senha...'
                : 'Alterar senha'}
            </button>
          </form>

          {mensagem && (
            <div
              className={`reset-message ${
                sucesso ? 'success' : 'error'
              }`}
            >
              {mensagem}
            </div>
          )}

          <div className="reset-footer">
            <button
              type="button"
              onClick={() => router.push('/login')}
            >
              Voltar para o login
            </button>
          </div>
        </section>
      </main>
    </>
  )
}

export default function ResetarSenhaPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f3f4f6',
            color: '#374151'
          }}
        >
          Carregando...
        </div>
      }
    >
      <ResetarSenhaContent />
    </Suspense>
  )
}