'use client'

import { useState } from 'react'

type AlterarSenhaButtonProps = {
  userId: string
}

export default function AlterarSenhaButton({ userId }: AlterarSenhaButtonProps) {
  const [aberto, setAberto] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [tipoMensagem, setTipoMensagem] = useState<'erro' | 'sucesso' | ''>('')

  const fechar = () => {
    if (carregando) return

    setAberto(false)
    setSenhaAtual('')
    setNovaSenha('')
    setConfirmarSenha('')
    setMensagem('')
    setTipoMensagem('')
  }

  const alterarSenha = async () => {
    setMensagem('')
    setTipoMensagem('')

    if (!senhaAtual) {
      setMensagem('Informe sua senha atual.')
      setTipoMensagem('erro')
      return
    }

    if (!novaSenha || novaSenha.length < 6) {
      setMensagem('A nova senha deve ter pelo menos 6 caracteres.')
      setTipoMensagem('erro')
      return
    }

    if (novaSenha !== confirmarSenha) {
      setMensagem('A confirmação da nova senha não confere.')
      setTipoMensagem('erro')
      return
    }

    setCarregando(true)

    try {
      const response = await fetch('/api/alterar-senha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          senhaAtual,
          novaSenha,
          confirmarSenha
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.sucesso) {
        throw new Error(data?.erro || 'Não foi possível alterar a senha.')
      }

      setMensagem('Senha alterada com sucesso.')
      setTipoMensagem('sucesso')

      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarSenha('')

      setTimeout(() => {
        fechar()
      }, 1000)
    } catch (error: any) {
      setMensagem(error?.message || 'Erro ao alterar senha.')
      setTipoMensagem('erro')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="alterarSenhaBtn"
        onClick={() => setAberto(true)}
      >
        <span className="alterarSenhaIcon">🔐</span>
        <span>
          <strong>Alterar senha</strong>
          <small>Atualize seu acesso com segurança</small>
        </span>
      </button>

      {aberto && (
        <div className="modalOverlay">
          <div className="modalCard">
            <div className="modalHeader">
              <div>
                <h2>Alterar senha</h2>
                <p>Informe sua senha atual e escolha uma nova senha.</p>
              </div>

              <button
                type="button"
                className="closeBtn"
                onClick={fechar}
                disabled={carregando}
              >
                ×
              </button>
            </div>

            <div className="formBox">
              <label>Senha atual</label>
              <input
                type="password"
                value={senhaAtual}
                onChange={(event) => setSenhaAtual(event.target.value)}
                placeholder="Digite sua senha atual"
                autoComplete="current-password"
              />

              <label>Nova senha</label>
              <input
                type="password"
                value={novaSenha}
                onChange={(event) => setNovaSenha(event.target.value)}
                placeholder="Mínimo de 6 caracteres"
                autoComplete="new-password"
              />

              <label>Confirmar nova senha</label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={(event) => setConfirmarSenha(event.target.value)}
                placeholder="Digite novamente a nova senha"
                autoComplete="new-password"
              />

              {mensagem && (
                <div className={`senhaMsg ${tipoMensagem}`}>
                  {mensagem}
                </div>
              )}

              <div className="modalActions">
                <button
                  type="button"
                  className="cancelBtn"
                  onClick={fechar}
                  disabled={carregando}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="saveBtn"
                  onClick={alterarSenha}
                  disabled={carregando}
                >
                  {carregando ? 'Alterando...' : 'Salvar nova senha'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .alterarSenhaBtn {
          width: 100%;
          border: 1px solid #e5e7eb;
          background: linear-gradient(135deg, #ffffff, #f8fafc);
          border-radius: 22px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          text-align: left;
          transition: 0.2s ease;
          color: #111827;
        }

        .alterarSenhaBtn:hover {
          border-color: #16a34a;
          transform: translateY(-1px);
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.10);
        }

        .alterarSenhaIcon {
          width: 42px;
          height: 42px;
          border-radius: 16px;
          background: #f0fdf4;
          color: #16a34a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex: none;
        }

        .alterarSenhaBtn strong {
          display: block;
          font-size: 14px;
          font-weight: 950;
          color: #111827;
        }

        .alterarSenhaBtn small {
          display: block;
          margin-top: 3px;
          font-size: 12px;
          color: #64748b;
          font-weight: 700;
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 999;
          background: rgba(15, 23, 42, 0.62);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }

        .modalCard {
          width: 100%;
          max-width: 460px;
          background: #ffffff;
          border-radius: 30px;
          box-shadow: 0 28px 80px rgba(15, 23, 42, 0.35);
          overflow: hidden;
          border: 1px solid #eef2f7;
        }

        .modalHeader {
          padding: 22px;
          background:
            radial-gradient(circle at top right, rgba(22, 163, 74, 0.14), transparent 35%),
            #111827;
          color: #ffffff;
          display: flex;
          justify-content: space-between;
          gap: 14px;
        }

        .modalHeader h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .modalHeader p {
          margin: 6px 0 0;
          color: #cbd5e1;
          font-size: 13px;
          line-height: 1.5;
        }

        .closeBtn {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.20);
          background: rgba(255,255,255,0.08);
          color: #ffffff;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
          flex: none;
        }

        .formBox {
          padding: 22px;
          display: grid;
          gap: 10px;
        }

        .formBox label {
          color: #374151;
          font-size: 13px;
          font-weight: 900;
          margin-top: 4px;
        }

        .formBox input {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 14px 15px;
          font-size: 15px;
          outline: none;
          color: #111827;
        }

        .formBox input:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.12);
        }

        .senhaMsg {
          margin-top: 8px;
          border-radius: 16px;
          padding: 12px 14px;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.4;
          text-align: center;
        }

        .senhaMsg.erro {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .senhaMsg.sucesso {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .modalActions {
          display: flex;
          gap: 10px;
          margin-top: 12px;
        }

        .cancelBtn,
        .saveBtn {
          flex: 1;
          border: none;
          border-radius: 999px;
          padding: 13px 14px;
          font-size: 13px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .cancelBtn {
          background: #f1f5f9;
          color: #334155;
        }

        .saveBtn {
          background: #16a34a;
          color: #ffffff;
        }

        .cancelBtn:disabled,
        .saveBtn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        @media (max-width: 520px) {
          .modalCard {
            border-radius: 26px;
          }

          .modalActions {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  )
}