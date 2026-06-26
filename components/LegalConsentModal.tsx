'use client'

import { useMemo, useState } from 'react'
import { DOCUMENTOS_LEGAIS, type DocumentoLegalCodigo } from '@/lib/legalDocuments'

type Props = {
  documento: DocumentoLegalCodigo
  aberto: boolean
  onClose: () => void
  onAccept?: () => void
  tituloBotaoAceite?: string
  mostrarBotaoAceite?: boolean
}

export default function LegalConsentModal({
  documento,
  aberto,
  onClose,
  onAccept,
  tituloBotaoAceite = 'Li e concordo',
  mostrarBotaoAceite = true,
}: Props) {
  const [liTudo, setLiTudo] = useState(false)
  const doc = DOCUMENTOS_LEGAIS[documento]

  const textoFormatado = useMemo(() => {
    return doc.texto.split('\n').map((linha, index) => {
      const trimmed = linha.trim()
      if (!trimmed) return <br key={index} />

      const pareceTitulo =
        trimmed === trimmed.toUpperCase() ||
        /^\d+(\.\d+)*\.\s/.test(trimmed) ||
        trimmed.startsWith('ANEXO') ||
        trimmed.startsWith('PARTE')

      if (pareceTitulo) {
        return <h3 key={index}>{trimmed}</h3>
      }

      return <p key={index}>{trimmed}</p>
    })
  }, [doc.texto])

  if (!aberto) return null

  return (
    <div className="legalOverlay" role="dialog" aria-modal="true" aria-label={doc.titulo}>
      <div className="legalModal">
        <button type="button" className="legalClose" onClick={onClose} aria-label="Fechar">
          ×
        </button>

        <header className="legalHeader">
          <p>PrussikTrails • documentos legais</p>
          <h2>{doc.titulo}</h2>
          <span>Versão {doc.versao} • Atualizado em {doc.ultimaAtualizacao}</span>
        </header>

        <section className="legalSummary">
          {doc.resumo}
        </section>

        <section className="legalBody">{textoFormatado}</section>

        {mostrarBotaoAceite && (
          <footer className="legalActions">
            <label className="legalCheck">
              <input
                type="checkbox"
                checked={liTudo}
                onChange={(event) => setLiTudo(event.target.checked)}
              />
              <span>Li, compreendi e concordo com este documento.</span>
            </label>

            <button
              type="button"
              disabled={!liTudo}
              onClick={() => {
                onAccept?.()
                onClose()
              }}
            >
              {tituloBotaoAceite}
            </button>
          </footer>
        )}
      </div>

      <style>{styles}</style>
    </div>
  )
}

const styles = `
.legalOverlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, .72);
  backdrop-filter: blur(10px);
}
.legalModal {
  width: min(960px, 100%);
  max-height: min(88vh, 920px);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid rgba(212, 179, 90, .26);
  background: #fffdf7;
  color: #203c2e;
  box-shadow: 0 24px 80px rgba(15, 23, 42, .34);
}
.legalClose {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid rgba(32, 60, 46, .16);
  background: rgba(255,255,255,.84);
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  color: #203c2e;
}
.legalHeader {
  padding: 30px 34px 18px;
  background: linear-gradient(135deg, #203c2e, #294735);
  color: #fffdf7;
}
.legalHeader p {
  margin: 0 0 8px;
  font-size: 12px;
  letter-spacing: .12em;
  text-transform: uppercase;
  opacity: .78;
}
.legalHeader h2 {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(24px, 4vw, 38px);
  line-height: 1.05;
}
.legalHeader span {
  display: inline-block;
  margin-top: 10px;
  opacity: .82;
  font-size: 13px;
}
.legalSummary {
  margin: 18px 34px 0;
  padding: 14px 16px;
  border-radius: 18px;
  background: #f3f5ea;
  color: #294735;
  font-size: 14px;
  line-height: 1.55;
}
.legalBody {
  flex: 1;
  overflow: auto;
  padding: 22px 34px 28px;
}
.legalBody h3 {
  margin: 24px 0 8px;
  color: #203c2e;
  font-size: 17px;
  line-height: 1.35;
}
.legalBody p {
  margin: 0 0 10px;
  color: rgba(32, 60, 46, .86);
  font-size: 14px;
  line-height: 1.64;
}
.legalActions {
  padding: 18px 34px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-top: 1px solid rgba(32, 60, 46, .1);
  background: rgba(255, 253, 247, .94);
}
.legalCheck {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 14px;
  line-height: 1.45;
  color: #294735;
}
.legalCheck input {
  margin-top: 2px;
  width: 18px;
  height: 18px;
  accent-color: #203c2e;
}
.legalActions button {
  min-width: 180px;
  border: 0;
  border-radius: 999px;
  padding: 13px 18px;
  font-weight: 800;
  cursor: pointer;
  background: #203c2e;
  color: #fffdf7;
}
.legalActions button:disabled {
  opacity: .45;
  cursor: not-allowed;
}
@media (max-width: 720px) {
  .legalOverlay { padding: 0; align-items: stretch; }
  .legalModal { border-radius: 0; max-height: 100vh; height: 100vh; }
  .legalHeader { padding: 26px 22px 16px; }
  .legalSummary { margin: 16px 22px 0; }
  .legalBody { padding: 18px 22px 22px; }
  .legalActions { padding: 14px 22px 18px; flex-direction: column; align-items: stretch; }
  .legalActions button { width: 100%; }
}
`
