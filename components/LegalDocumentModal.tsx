'use client'

import { DOCUMENTOS_LEGAIS, type DocumentoLegalCodigo } from '@/lib/legalDocuments'

type LegalDocumentModalProps = {
  documento: DocumentoLegalCodigo | null
  aberto: boolean
  onClose: () => void
}

function texto(valor: unknown): string {
  return String(valor || '').trim()
}

function renderizarBloco(bloco: string, index: number) {
  const textoBloco = bloco.trim()

  if (!textoBloco) return null

  const pareceTitulo =
    textoBloco.length <= 140 &&
    (
      /^[0-9]+(\.[0-9]+)*\.?\s+/.test(textoBloco) ||
      /^ANEXO\s+[IVXLCDM]+/i.test(textoBloco) ||
      /^PARTE\s+[IVXLCDM]+/i.test(textoBloco) ||
      textoBloco === textoBloco.toUpperCase()
    )

  const pareceLinhaTabela = textoBloco.includes(' | ')
  const pareceLista = /^[-•]\s+/.test(textoBloco)

  if (pareceTitulo) {
    return (
      <h2 key={`titulo-${index}`} className="legalModalHeading">
        {textoBloco}
      </h2>
    )
  }

  if (pareceLinhaTabela) {
    return (
      <p key={`tabela-${index}`} className="legalModalTableLine">
        {textoBloco}
      </p>
    )
  }

  if (pareceLista) {
    return (
      <p key={`lista-${index}`} className="legalModalListLine">
        {textoBloco}
      </p>
    )
  }

  return (
    <p key={`p-${index}`} className="legalModalParagraph">
      {textoBloco}
    </p>
  )
}

export default function LegalDocumentModal({
  documento,
  aberto,
  onClose,
}: LegalDocumentModalProps) {
  if (!aberto || !documento) return null

  const doc = DOCUMENTOS_LEGAIS[documento]

  if (!doc) return null

  const blocos = texto(doc.texto)
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map((bloco) => bloco.trim())
    .filter(Boolean)

  return (
    <div className="legalModalOverlay" role="dialog" aria-modal="true" aria-label={doc.titulo}>
      <div className="legalModalBox">
        <button type="button" className="legalModalClose" onClick={onClose} aria-label="Fechar">
          ×
        </button>

        <header className="legalModalHero">
          <p>PrussikTrails · Documentos legais</p>
          <h1>{doc.titulo}</h1>
          <span>Versão: {doc.versao}</span>
        </header>

        {doc.descricao ? (
          <section className="legalModalSummary">
            {doc.descricao}
          </section>
        ) : null}

        <article className="legalModalContent">
          {blocos.map((bloco, index) => renderizarBloco(bloco, index))}
        </article>

        <footer className="legalModalFooter">
          <div>
            <strong>Contato oficial</strong>
            <span>contato@prussiktrails.com.br</span>
            <span>dpo@prussiktrails.com.br</span>
          </div>

          <button type="button" onClick={onClose}>
            Fechar
          </button>
        </footer>
      </div>

      <style>{`
        .legalModalOverlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(15, 23, 42, 0.72);
          backdrop-filter: blur(10px);
        }

        .legalModalBox {
          width: min(980px, 100%);
          max-height: min(90vh, 920px);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
          border-radius: 30px;
          background: #fffdf7;
          color: #203c2e;
          border: 1px solid rgba(212, 179, 90, 0.26);
          box-shadow: 0 28px 88px rgba(15, 23, 42, 0.34);
        }

        .legalModalClose {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 40px;
          height: 40px;
          border-radius: 999px;
          border: 1px solid rgba(255, 253, 247, 0.22);
          background: rgba(255, 253, 247, 0.16);
          color: #fffdf7;
          cursor: pointer;
          font-size: 28px;
          line-height: 1;
          z-index: 2;
        }

        .legalModalHero {
          padding: 30px 34px 24px;
          background: linear-gradient(135deg, #203c2e 0%, #294735 100%);
          color: #fffdf7;
        }

        .legalModalHero p {
          margin: 0 0 10px;
          color: rgba(255, 253, 247, 0.72);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.72rem;
          font-weight: 900;
        }

        .legalModalHero h1 {
          margin: 0;
          max-width: 820px;
          font-size: clamp(2rem, 5vw, 3.5rem);
          line-height: 0.98;
          letter-spacing: -0.05em;
          font-family: Georgia, 'Times New Roman', serif;
        }

        .legalModalHero span {
          display: inline-flex;
          margin-top: 18px;
          border-radius: 999px;
          padding: 8px 11px;
          background: rgba(255, 253, 247, 0.12);
          border: 1px solid rgba(255, 253, 247, 0.16);
          color: rgba(255, 253, 247, 0.88);
          font-size: 0.78rem;
          font-weight: 800;
        }

        .legalModalSummary {
          margin: 18px 28px 0;
          padding: 16px 18px;
          border-radius: 20px;
          background: #f3f5ea;
          color: #294735;
          font-size: 0.95rem;
          line-height: 1.65;
          border: 1px solid rgba(32, 60, 46, 0.08);
        }

        .legalModalContent {
          flex: 1;
          overflow: auto;
          padding: 24px 28px 30px;
        }

        .legalModalHeading {
          margin: 28px 0 12px;
          color: #203c2e;
          font-size: 1.12rem;
          line-height: 1.35;
          letter-spacing: -0.02em;
        }

        .legalModalHeading:first-child {
          margin-top: 0;
        }

        .legalModalParagraph,
        .legalModalListLine,
        .legalModalTableLine {
          margin: 0 0 14px;
          color: #39483e;
          line-height: 1.82;
          font-size: 0.94rem;
          white-space: pre-wrap;
        }

        .legalModalListLine {
          padding-left: 12px;
          border-left: 3px solid rgba(212, 179, 90, 0.5);
        }

        .legalModalTableLine {
          padding: 10px 12px;
          border-radius: 14px;
          background: #f3f5ea;
          border: 1px solid rgba(32, 60, 46, 0.08);
          font-size: 0.88rem;
        }

        .legalModalFooter {
          padding: 16px 28px 20px;
          border-top: 1px solid rgba(32, 60, 46, 0.1);
          background: rgba(255, 253, 247, 0.96);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .legalModalFooter div {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          color: #294735;
          font-size: 0.86rem;
        }

        .legalModalFooter button {
          border: 0;
          border-radius: 999px;
          padding: 11px 18px;
          background: #203c2e;
          color: #fffdf7;
          cursor: pointer;
          font-weight: 900;
        }

        @media (max-width: 720px) {
          .legalModalOverlay {
            padding: 0;
            align-items: stretch;
          }

          .legalModalBox {
            height: 100vh;
            max-height: 100vh;
            border-radius: 0;
          }

          .legalModalHero {
            padding: 26px 22px 20px;
          }

          .legalModalSummary {
            margin: 16px 18px 0;
          }

          .legalModalContent {
            padding: 20px 18px 24px;
          }

          .legalModalParagraph,
          .legalModalListLine,
          .legalModalTableLine {
            font-size: 0.9rem;
            line-height: 1.72;
          }

          .legalModalFooter {
            padding: 14px 18px 18px;
          }

          .legalModalFooter button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
