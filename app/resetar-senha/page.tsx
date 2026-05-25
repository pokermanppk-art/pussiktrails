'use client'

import { FormEvent, Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function ResetarSenhaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [token, setToken] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [tipoMensagem, setTipoMensagem] = useState<'erro' | 'sucesso' | ''>('')

  useEffect(() => {
    const tokenUrl = searchParams.get('token') || ''
    setToken(tokenUrl)

    if (!tokenUrl) {
      setMensagem('Link inválido. Solicite uma nova recuperação de senha.')
      setTipoMensagem('erro')
    }
  }, [searchParams])

  const validarFormulario = () => {
    if (!token) {
      return 'Token de recuperação ausente. Solicite uma nova recuperação de senha.'
    }

    if (!senha || senha.length < 6) {
      return 'A nova senha deve ter pelo menos 6 caracteres.'
    }

    if (senha !== confirmarSenha) {
      return 'As senhas não conferem.'
    }

    return ''
  }

  const resetarSenha = async (event: FormEvent) => {
    event.preventDefault()

    setMensagem('')
    setTipoMensagem('')

    const erroValidacao = validarFormulario()

    if (erroValidacao) {
      setMensagem(erroValidacao)
      setTipoMensagem('erro')
      return
    }

    setCarregando(true)

    try {
      const response = await fetch('/api/resetar-senha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          senha,
          password: senha,
          confirmar_senha: confirmarSenha,
          confirmarSenha
        })
      })

      const texto = await response.text()

      let data: any = null

      try {
        data = texto ? JSON.parse(texto) : null
      } catch {
        throw new Error('A rota de redefinição retornou uma resposta inválida.')
      }

      if (!response.ok || !data?.sucesso) {
        throw new Error(
          data?.erro ||
            data?.message ||
            'Não foi possível redefinir a senha.'
        )
      }

      setMensagem('Senha atualizada com sucesso. Você já pode fazer login.')
      setTipoMensagem('sucesso')

      setSenha('')
      setConfirmarSenha('')

      setTimeout(() => {
        router.replace('/login')
      }, 1400)
    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error)

      setMensagem(
        error?.message ||
          'Erro ao redefinir senha. Solicite um novo link e tente novamente.'
      )
      setTipoMensagem('erro')
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
            radial-gradient(circle at top left, rgba(22, 163, 74, 0.10), transparent 30%),
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
          max-width: 560px;
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
          height: 72px;
          width: auto;
          object-fit: contain;
        }

        .title {
          margin: 0;
          text-align: center;
          font-size: 30px;
          font-weight: 900;
          color: #111827;
          letter-spacing: -0.04em;
        }

        .subtitle {
          margin: 10px auto 26px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.6;
          max-width: 430px;
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
        }

        .message.erro {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .message.sucesso {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .submitButton {
          width: 100%;
          border: none;
          border-radius: 999px;
          padding: 16px;
          background: #15803d;
          color: #ffffff;
          font-size: 17px;
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

        .secondaryButton {
          width: 100%;
          border: 1px solid #16a34a;
          border-radius: 999px;
          padding: 15px;
          background: #ffffff;
          color: #16a34a;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
          transition: 0.2s ease;
          margin-top: 12px;
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

        .tokenBox {
          margin-bottom: 18px;
          padding: 12px 14px;
          border-radius: 16px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 12px;
          line-height: 1.45;
          word-break: break-all;
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
            height: 62px;
          }

          .title {
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

          <h1 className="title">Criar nova senha</h1>

          <p className="subtitle">
            Digite sua nova senha abaixo. Depois da confirmação, você será
            redirecionado para o login.
          </p>

          {token && (
            <div className="tokenBox">
              Link de recuperação identificado.
            </div>
          )}

          <form className="form" onSubmit={resetarSenha}>
            <div className="formGroup">
              <label>Nova senha *</label>
              <input
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                type="password"
                placeholder="Mínimo de 6 caracteres"
                autoComplete="new-password"
                disabled={!token || carregando}
              />
            </div>

            <div className="formGroup">
              <label>Confirmar nova senha *</label>
              <input
                value={confirmarSenha}
                onChange={(event) => setConfirmarSenha(event.target.value)}
                type="password"
                placeholder="Digite novamente a nova senha"
                autoComplete="new-password"
                disabled={!token || carregando}
              />
            </div>

            {mensagem && (
              <div className={`message ${tipoMensagem}`}>
                {mensagem}
              </div>
            )}

            <button
              type="submit"
              className="submitButton"
              disabled={!token || carregando}
            >
              {carregando ? 'Atualizando senha...' : 'Atualizar senha'}
            </button>
          </form>

          <button
            type="button"
            className="secondaryButton"
            onClick={() => router.push('/login')}
          >
            Voltar para login
          </button>

          <p className="hint">
            Se o link estiver expirado, solicite uma nova recuperação de senha.
          </p>
        </section>
      </div>
    </main>
  )
}

function LoadingResetarSenha() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6',
        color: '#374151',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      }}
    >
      Carregando redefinição de senha...
    </main>
  )
}

export default function ResetarSenhaPage() {
  return (
    <Suspense fallback={<LoadingResetarSenha />}>
      <ResetarSenhaContent />
    </Suspense>
  )
}