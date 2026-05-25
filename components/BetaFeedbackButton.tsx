'use client'

import { useEffect, useMemo, useState } from 'react'

type FeedbackTipo = 'feedback' | 'bug' | 'melhoria' | 'elogio' | 'duvida'
type FeedbackPrioridade = 'baixa' | 'normal' | 'alta' | 'critica'

type UsuarioLocal = {
  id?: string
  nome?: string
  email?: string
  tipo?: string
}

const tipos: { value: FeedbackTipo; label: string; descricao: string }[] = [
  {
    value: 'feedback',
    label: 'Feedback',
    descricao: 'Algo que você sentiu usando o app.',
  },
  {
    value: 'bug',
    label: 'Bug',
    descricao: 'Algo que não funcionou como deveria.',
  },
  {
    value: 'melhoria',
    label: 'Melhoria',
    descricao: 'Uma ideia para deixar a experiência melhor.',
  },
  {
    value: 'duvida',
    label: 'Dúvida',
    descricao: 'Algo que ficou confuso ou pouco claro.',
  },
  {
    value: 'elogio',
    label: 'Elogio',
    descricao: 'Algo que você gostou na experiência.',
  },
]

function detectarDispositivo(): string {
  if (typeof window === 'undefined') return 'desconhecido'

  const largura = window.innerWidth

  if (largura <= 640) return 'mobile'
  if (largura <= 1024) return 'tablet'

  return 'desktop'
}

function prioridadePorTipo(tipo: FeedbackTipo): FeedbackPrioridade {
  if (tipo === 'bug') return 'alta'
  return 'normal'
}

export default function BetaFeedbackButton() {
  const [aberto, setAberto] = useState(false)
  const [usuario, setUsuario] = useState<UsuarioLocal | null>(null)

  const [tipo, setTipo] = useState<FeedbackTipo>('feedback')
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    try {
      const salvo = localStorage.getItem('user')

      if (!salvo) {
        setUsuario(null)
        return
      }

      const parseado = JSON.parse(salvo) as UsuarioLocal
      setUsuario(parseado)
    } catch {
      setUsuario(null)
    }
  }, [])

  const tipoSelecionado = useMemo(() => {
    return tipos.find((item) => item.value === tipo) || tipos[0]
  }, [tipo])

  function abrirModal() {
    setAberto(true)
    setErro('')
    setSucesso(false)
  }

  function fecharModal() {
    if (enviando) return

    setAberto(false)
    setErro('')
    setSucesso(false)
  }

  async function enviarFeedback() {
    try {
      setErro('')
      setSucesso(false)

      const mensagemLimpa = mensagem.trim()
      const tituloLimpo = titulo.trim()

      if (!mensagemLimpa) {
        setErro('Conte rapidamente o que aconteceu ou o que você gostaria de sugerir.')
        return
      }

      setEnviando(true)

      const resposta = await fetch('/api/beta/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuarioId: usuario?.id || null,
          tipo,
          prioridade: prioridadePorTipo(tipo),
          titulo: tituloLimpo || null,
          mensagem: mensagemLimpa,
          origem: 'dashboard_principal',
          pagina:
            typeof window !== 'undefined'
              ? window.location.pathname
              : 'dashboard_principal',
          navegador:
            typeof navigator !== 'undefined'
              ? navigator.userAgent
              : 'desconhecido',
          dispositivo: detectarDispositivo(),
        }),
      })

      const json = await resposta.json().catch(() => null)

      if (!resposta.ok || !json?.ok) {
        throw new Error(json?.error || 'Não foi possível enviar agora.')
      }

      setSucesso(true)
      setTitulo('')
      setMensagem('')
      setTipo('feedback')
    } catch (error: unknown) {
      const mensagemErro =
        error instanceof Error ? error.message : 'Não foi possível enviar agora.'
      setErro(mensagemErro)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <button className="beta-feedback-tab" type="button" onClick={abrirModal}>
        <span className="beta-dot" />
        <span>Beta · Feedback e Bug</span>
      </button>

      {aberto && (
        <div className="beta-feedback-overlay" role="dialog" aria-modal="true">
          <div className="beta-feedback-modal">
            <div className="beta-feedback-header">
              <div>
                <p className="beta-kicker">Fase Beta</p>
                <h2>Ajude a melhorar a PrussikTrails</h2>
                <p>
                  Conte o que funcionou, o que travou ou o que poderia ficar mais
                  claro. Esse retorno ajuda a construir a próxima versão do app.
                </p>
              </div>

              <button
                type="button"
                className="beta-close"
                onClick={fecharModal}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            {sucesso ? (
              <div className="beta-success">
                <div className="beta-success-icon">✓</div>
                <h3>Feedback enviado</h3>
                <p>
                  Obrigado por contribuir com a fase Beta. Esse retorno ajuda a
                  deixar a jornada mais segura, leve e intuitiva.
                </p>

                <button type="button" className="beta-primary" onClick={fecharModal}>
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <div className="beta-type-grid">
                  {tipos.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={
                        tipo === item.value ? 'beta-type-card active' : 'beta-type-card'
                      }
                      onClick={() => setTipo(item.value)}
                    >
                      <strong>{item.label}</strong>
                      <span>{item.descricao}</span>
                    </button>
                  ))}
                </div>

                <div className="beta-selected">
                  <span>Tipo selecionado:</span>
                  <strong>{tipoSelecionado.label}</strong>
                </div>

                <label className="beta-field">
                  <span>Título opcional</span>
                  <input
                    value={titulo}
                    onChange={(event) => setTitulo(event.target.value)}
                    placeholder="Ex.: botão de pagar não apareceu"
                    maxLength={160}
                  />
                </label>

                <label className="beta-field">
                  <span>Mensagem</span>
                  <textarea
                    value={mensagem}
                    onChange={(event) => setMensagem(event.target.value)}
                    placeholder="Descreva com suas palavras. Pode ser simples: onde estava, o que tentou fazer e o que aconteceu."
                    maxLength={3000}
                    rows={6}
                  />
                </label>

                <div className="beta-footer-info">
                  <p>
                    O envio inclui a página atual e o tipo de dispositivo para facilitar
                    a correção.
                  </p>
                </div>

                {erro && <div className="beta-error">{erro}</div>}

                <div className="beta-actions">
                  <button
                    type="button"
                    className="beta-secondary"
                    onClick={fecharModal}
                    disabled={enviando}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className="beta-primary"
                    onClick={enviarFeedback}
                    disabled={enviando}
                  >
                    {enviando ? 'Enviando...' : 'Enviar feedback'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .beta-feedback-tab {
          position: fixed;
          left: 50%;
          bottom: 14px;
          z-index: 80;
          transform: translateX(-50%);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(62, 74, 45, 0.16);
          background: rgba(255, 253, 247, 0.92);
          color: #27321f;
          border-radius: 999px;
          padding: 10px 15px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: -0.01em;
          box-shadow: 0 16px 40px rgba(25, 35, 18, 0.18);
          backdrop-filter: blur(14px);
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .beta-feedback-tab:hover {
          transform: translateX(-50%) translateY(-2px);
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 18px 46px rgba(25, 35, 18, 0.24);
        }

        .beta-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #991b1b;
          box-shadow: 0 0 0 4px rgba(153, 27, 27, 0.12);
        }

        .beta-feedback-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 18px;
          background: rgba(9, 12, 7, 0.52);
          backdrop-filter: blur(8px);
        }

        .beta-feedback-modal {
          width: min(680px, 100%);
          max-height: min(86vh, 780px);
          overflow: auto;
          border-radius: 30px;
          border: 1px solid rgba(255, 255, 255, 0.55);
          background:
            radial-gradient(circle at 8% 0%, rgba(132, 204, 22, 0.16), transparent 28%),
            radial-gradient(circle at 100% 0%, rgba(251, 146, 60, 0.16), transparent 26%),
            linear-gradient(180deg, #fffdf7 0%, #f4f6ec 100%);
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.35);
          padding: 22px;
        }

        .beta-feedback-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }

        .beta-kicker {
          margin: 0 0 6px;
          color: #991b1b;
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .beta-feedback-header h2 {
          margin: 0;
          color: #1d2618;
          font-size: clamp(24px, 4vw, 34px);
          line-height: 0.95;
          font-weight: 950;
          letter-spacing: -0.05em;
        }

        .beta-feedback-header p {
          max-width: 520px;
          margin: 10px 0 0;
          color: rgba(29, 38, 24, 0.72);
          font-size: 14px;
          line-height: 1.5;
        }

        .beta-close {
          width: 38px;
          height: 38px;
          flex: 0 0 auto;
          border: 1px solid rgba(29, 38, 24, 0.1);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.68);
          color: #1d2618;
          font-size: 26px;
          line-height: 1;
          cursor: pointer;
        }

        .beta-type-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin: 18px 0;
        }

        .beta-type-card {
          min-height: 92px;
          border: 1px solid rgba(62, 74, 45, 0.13);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.64);
          padding: 12px;
          text-align: left;
          cursor: pointer;
          transition:
            border-color 0.2s ease,
            transform 0.2s ease,
            background 0.2s ease,
            box-shadow 0.2s ease;
        }

        .beta-type-card:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.86);
        }

        .beta-type-card.active {
          border-color: rgba(153, 27, 27, 0.38);
          background: rgba(153, 27, 27, 0.06);
          box-shadow: inset 0 0 0 1px rgba(153, 27, 27, 0.12);
        }

        .beta-type-card strong {
          display: block;
          color: #1d2618;
          font-size: 13px;
          font-weight: 950;
          margin-bottom: 5px;
        }

        .beta-type-card span {
          display: block;
          color: rgba(29, 38, 24, 0.62);
          font-size: 11px;
          line-height: 1.35;
        }

        .beta-selected {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(62, 74, 45, 0.1);
          padding: 8px 12px;
          color: rgba(29, 38, 24, 0.65);
          font-size: 12px;
        }

        .beta-selected strong {
          color: #991b1b;
        }

        .beta-field {
          display: block;
          margin-top: 12px;
        }

        .beta-field span {
          display: block;
          margin-bottom: 7px;
          color: #25311f;
          font-size: 13px;
          font-weight: 900;
        }

        .beta-field input,
        .beta-field textarea {
          width: 100%;
          border: 1px solid rgba(62, 74, 45, 0.14);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.78);
          color: #1d2618;
          outline: none;
          padding: 13px 14px;
          font-size: 14px;
          line-height: 1.45;
          box-sizing: border-box;
        }

        .beta-field textarea {
          resize: vertical;
          min-height: 140px;
        }

        .beta-field input:focus,
        .beta-field textarea:focus {
          border-color: rgba(153, 27, 27, 0.45);
          box-shadow: 0 0 0 4px rgba(153, 27, 27, 0.08);
        }

        .beta-footer-info {
          margin-top: 12px;
          color: rgba(29, 38, 24, 0.58);
          font-size: 12px;
          line-height: 1.4;
        }

        .beta-footer-info p {
          margin: 0;
        }

        .beta-error {
          margin-top: 12px;
          border-radius: 16px;
          background: rgba(153, 27, 27, 0.08);
          border: 1px solid rgba(153, 27, 27, 0.18);
          color: #7f1d1d;
          padding: 11px 12px;
          font-size: 13px;
          font-weight: 750;
        }

        .beta-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 18px;
        }

        .beta-primary,
        .beta-secondary {
          border-radius: 999px;
          padding: 12px 17px;
          font-size: 13px;
          font-weight: 950;
          cursor: pointer;
        }

        .beta-primary {
          border: 0;
          background: #991b1b;
          color: #fffdf7;
          box-shadow: 0 14px 28px rgba(153, 27, 27, 0.22);
        }

        .beta-secondary {
          background: rgba(255, 255, 255, 0.75);
          color: #27321f;
          border: 1px solid rgba(62, 74, 45, 0.12);
        }

        .beta-primary:disabled,
        .beta-secondary:disabled {
          opacity: 0.62;
          cursor: not-allowed;
        }

        .beta-success {
          text-align: center;
          padding: 30px 16px 14px;
        }

        .beta-success-icon {
          width: 58px;
          height: 58px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(22, 101, 52, 0.1);
          color: #166534;
          font-size: 28px;
          font-weight: 950;
          margin-bottom: 14px;
        }

        .beta-success h3 {
          margin: 0;
          color: #1d2618;
          font-size: 24px;
          font-weight: 950;
          letter-spacing: -0.03em;
        }

        .beta-success p {
          max-width: 430px;
          margin: 10px auto 20px;
          color: rgba(29, 38, 24, 0.66);
          font-size: 14px;
          line-height: 1.5;
        }

        @media (max-width: 760px) {
          .beta-feedback-overlay {
            align-items: flex-end;
            padding: 10px;
          }

          .beta-feedback-modal {
            border-radius: 26px;
            padding: 18px;
            max-height: 88vh;
          }

          .beta-type-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .beta-type-card {
            min-height: 86px;
          }

          .beta-actions {
            flex-direction: column-reverse;
          }

          .beta-primary,
          .beta-secondary {
            width: 100%;
          }
        }

        @media (max-width: 420px) {
          .beta-feedback-tab {
            bottom: 10px;
            padding: 9px 12px;
            font-size: 11px;
          }

          .beta-type-grid {
            gap: 8px;
          }
        }
      `}</style>
    </>
  )
}