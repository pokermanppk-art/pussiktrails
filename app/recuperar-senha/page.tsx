'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

const LOGO_RECUPERAR_SRC = '/logo-login-montanha-prussik.jpg?v=20260528'

export default function RecuperarSenhaPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [tipoMensagem, setTipoMensagem] = useState<'erro' | 'sucesso' | ''>('')

  function texto(valor: unknown) {
    return String(valor || '').trim()
  }

  function validarEmail(valor: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)
  }

  async function solicitarRecuperacao(event: FormEvent) {
    event.preventDefault()

    if (carregando) return

    setMensagem('')
    setTipoMensagem('')

    const emailFinal = texto(email).toLowerCase()

    if (!emailFinal || !validarEmail(emailFinal)) {
      setMensagem('Informe um e-mail válido.')
      setTipoMensagem('erro')
      return
    }

    setCarregando(true)

    try {
      const response = await fetch('/api/recuperar-senha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          email: emailFinal,
        }),
      })

      const respostaTexto = await response.text()
      let data: any = null

      try {
        data = respostaTexto ? JSON.parse(respostaTexto) : null
      } catch {
        throw new Error('A rota de recuperação retornou uma resposta inválida.')
      }

      if (!response.ok || !data?.sucesso) {
        throw new Error(
          data?.erro ||
            data?.message ||
            'Não foi possível solicitar a recuperação de senha.'
        )
      }

      setMensagem(
        data?.mensagem ||
          'Se este e-mail estiver cadastrado, enviaremos as instruções de recuperação.'
      )
      setTipoMensagem('sucesso')
      setEmail('')
    } catch (error: any) {
      console.error('Erro ao solicitar recuperação de senha:', error)

      setMensagem(
        error?.message ||
          'Erro ao solicitar recuperação de senha. Tente novamente.'
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
          margin: 0 auto 12px;
          max-width: 340px;
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

        .supportText {
          max-width: 390px;
          margin: 0 auto 28px;
          text-align: center;
          color: #7b8372;
          font-size: 13px;
          line-height: 1.55;
          font-weight: 750;
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
          font-weight: 850;
          border: 1px solid transparent;
        }

        .message.erro {
          background: #fee2e2;
          color: #991b1b;
          border-color: #fecaca;
        }

        .message.sucesso {
          background: #dcfce7;
          color: #166534;
          border-color: #bbf7d0;
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
            max-width: 320px;
          }

          .supportText {
            margin-bottom: 24px;
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
                src={LOGO_RECUPERAR_SRC}
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
            Recuperar
            <br />
            acesso à sua
            <br />
            <span>jornada.</span>
          </p>

          <p className="supportText">
            Informe o e-mail cadastrado no app. Se encontrarmos sua conta,
            enviaremos as instruções para redefinir sua senha.
          </p>

          <form className="form" onSubmit={solicitarRecuperacao}>
            <div className="formGroup">
              <label>E-mail cadastrado *</label>
              <input
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setMensagem('')
                  setTipoMensagem('')
                }}
                placeholder="seuemail@email.com"
                type="email"
                autoComplete="email"
                inputMode="email"
                disabled={carregando}
              />
            </div>

            {mensagem && (
              <div className={`message ${tipoMensagem || 'erro'}`}>
                {mensagem}
              </div>
            )}

            <button
              type="submit"
              className="submitButton"
              disabled={carregando}
            >
              {carregando ? 'Enviando instruções...' : 'Enviar instruções'}
            </button>
          </form>

          <div className="divider">ou</div>

          <button
            type="button"
            className="secondaryButton"
            onClick={() => router.push('/login')}
            disabled={carregando}
          >
            Voltar para o login
          </button>

          <div className="linkRow">
            <button
              type="button"
              className="textButton"
              onClick={() => router.push('/cadastro')}
              disabled={carregando}
            >
              Ainda não tenho conta
            </button>
          </div>

          <p className="hint">
            Por segurança, não informamos se o e-mail existe ou não na base.
          </p>
        </section>
      </div>
    </main>
  )
}