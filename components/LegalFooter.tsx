'use client'

import Link from 'next/link'
import { useState } from 'react'
import { LEGAL_LINKS } from '@/lib/legalDocuments'

export default function LegalFooter() {
  const [empresaAberta, setEmpresaAberta] = useState(false)
  const [documentosAbertos, setDocumentosAbertos] = useState(false)

  return (
    <footer className="legal-footer">
      <div className="legal-footer-inner">
        <span>© 2026 PrussikTrails, Co., Beta MVP</span>

        <nav className="legal-links" aria-label="Documentos legais">
          <Link href="/politica-de-privacidade">
            Privacidade
          </Link>

          <Link href="/termos">
            Termos
          </Link>

          <button type="button" onClick={() => setDocumentosAbertos(true)}>
            Documentos legais
          </button>

          <button type="button" onClick={() => setEmpresaAberta(true)}>
            Informações da empresa
          </button>
        </nav>
      </div>

      <DocumentosLegaisModal
        aberta={documentosAbertos}
        onClose={() => setDocumentosAbertos(false)}
      />

      <EmpresaModal
        aberta={empresaAberta}
        onClose={() => setEmpresaAberta(false)}
      />

      <style>{`
        .legal-footer {
          width: 100%;
          margin-top: 48px;
          padding: 24px 20px;
          border-top: 1px solid rgba(32, 60, 46, 0.12);
          background: rgba(255, 253, 247, 0.94);
        }

        .legal-footer-inner {
          width: min(1120px, 100%);
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          color: #7b8372;
          font-size: 0.86rem;
          line-height: 1.6;
          text-align: center;
        }

        .legal-links {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .legal-links::before {
          content: "·";
          color: #7b8372;
          font-weight: 900;
        }

        .legal-links a,
        .legal-links button {
          appearance: none;
          border: 0;
          background: transparent;
          color: #203c2e;
          text-decoration: none;
          font-size: 0.86rem;
          font-weight: 800;
          cursor: pointer;
          padding: 0;
          font-family: inherit;
        }

        .legal-links a:not(:last-child)::after,
        .legal-links button:not(:last-child)::after {
          content: " ·";
          color: #7b8372;
          font-weight: 700;
          margin-left: 8px;
          text-decoration: none;
          display: inline-block;
        }

        .legal-links a:hover,
        .legal-links button:hover {
          text-decoration: underline;
        }

        @media (max-width: 720px) {
          .legal-footer {
            margin-top: 36px;
            padding: 22px 16px 28px;
          }

          .legal-footer-inner {
            gap: 4px 8px;
            font-size: 0.82rem;
          }

          .legal-links a,
          .legal-links button {
            font-size: 0.82rem;
          }
        }
      `}</style>
    </footer>
  )
}


type DocumentosLegaisModalProps = {
  aberta: boolean
  onClose: () => void
}

function DocumentosLegaisModal({
  aberta,
  onClose,
}: DocumentosLegaisModalProps) {
  if (!aberta) return null

  return (
    <div
      className="documentsOverlay"
      role="dialog"
      aria-modal="true"
      aria-label="Documentos legais"
    >
      <div className="documentsBox">
        <button
          type="button"
          className="documentsClose"
          onClick={onClose}
          aria-label="Fechar"
        >
          ×
        </button>

        <header className="documentsHero">
          <p>PrussikTrails · Transparência</p>
          <h2>Documentos legais</h2>
          <span>Consulte as regras vigentes da Plataforma.</span>
        </header>

        <section className="documentsGrid">
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.codigo}
              href={link.href}
              onClick={onClose}
            >
              <strong>{link.label}</strong>
              <span>Abrir documento completo</span>
            </Link>
          ))}
        </section>

        <footer className="documentsActions">
          <button type="button" onClick={onClose}>
            Fechar
          </button>
        </footer>
      </div>

      <style>{`
        .documentsOverlay {
          position: fixed;
          inset: 0;
          z-index: 9998;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(15, 23, 42, 0.72);
          backdrop-filter: blur(10px);
        }

        .documentsBox {
          width: min(760px, 100%);
          max-height: min(88vh, 780px);
          overflow: hidden;
          position: relative;
          border-radius: 30px;
          background: #fffdf7;
          color: #203c2e;
          border: 1px solid rgba(212, 179, 90, 0.26);
          box-shadow: 0 28px 88px rgba(15, 23, 42, 0.34);
        }

        .documentsClose {
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

        .documentsHero {
          padding: 30px 34px 24px;
          background: linear-gradient(135deg, #203c2e 0%, #294735 100%);
          color: #fffdf7;
        }

        .documentsHero p {
          margin: 0 0 10px;
          color: rgba(255, 253, 247, 0.72);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.72rem;
          font-weight: 900;
        }

        .documentsHero h2 {
          margin: 0;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(2rem, 5vw, 3.3rem);
          line-height: 0.98;
          letter-spacing: -0.05em;
        }

        .documentsHero span {
          display: block;
          margin-top: 14px;
          color: rgba(255, 253, 247, 0.82);
        }

        .documentsGrid {
          padding: 24px 28px;
          max-height: 54vh;
          overflow: auto;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .documentsGrid a {
          display: grid;
          gap: 5px;
          min-height: 88px;
          align-content: center;
          padding: 15px 16px;
          border-radius: 18px;
          background: #f3f5ea;
          border: 1px solid rgba(32, 60, 46, 0.1);
          color: #203c2e;
          text-decoration: none;
        }

        .documentsGrid a:hover {
          border-color: rgba(212, 179, 90, 0.55);
          background: rgba(212, 179, 90, 0.14);
        }

        .documentsGrid strong {
          font-size: 0.92rem;
        }

        .documentsGrid span {
          color: #7b8372;
          font-size: 0.78rem;
        }

        .documentsActions {
          padding: 16px 28px 22px;
          display: flex;
          justify-content: flex-end;
          border-top: 1px solid rgba(32, 60, 46, 0.08);
        }

        .documentsActions button {
          border: 0;
          border-radius: 999px;
          padding: 11px 18px;
          background: #203c2e;
          color: #fffdf7;
          cursor: pointer;
          font-weight: 900;
        }

        @media (max-width: 720px) {
          .documentsOverlay {
            padding: 0;
            align-items: stretch;
          }

          .documentsBox {
            height: 100vh;
            max-height: 100vh;
            border-radius: 0;
          }

          .documentsHero {
            padding: 26px 22px 20px;
          }

          .documentsGrid {
            grid-template-columns: 1fr;
            padding: 20px 18px;
            max-height: calc(100vh - 220px);
          }

          .documentsActions {
            padding: 14px 18px 18px;
          }

          .documentsActions button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}

type EmpresaModalProps = {
  aberta: boolean
  onClose: () => void
}

function EmpresaModal({ aberta, onClose }: EmpresaModalProps) {
  if (!aberta) return null

  return (
    <div className="companyOverlay" role="dialog" aria-modal="true" aria-label="Informações da empresa">
      <div className="companyBox">
        <button type="button" className="companyClose" onClick={onClose} aria-label="Fechar">
          ×
        </button>

        <header className="companyHero">
          <p>PrussikTrails · Transparência</p>
          <h2>Informações da empresa</h2>
          <span>Detalhes da empresa a partir de 23/04/2026.</span>
        </header>

        <section className="companyInfo">
          <h3>Detalhes da empresa</h3>

          <p>
            <strong>Informações da empresa, a partir de 23/04/2026:</strong>
          </p>

          <p>
            Provedor do site e parte contratada para serviços de pagamento para usuários residentes
            ou estabelecidos no Brasil:
          </p>

          <p>
            <strong>PrussikTrails.Co.</strong>
            <br />
            Rua Delmiro Perdiz
            <br />
            CEP: 09403-440
            <br />
            Ribeirão Pires - SP - Brasil
          </p>

          <p>
            <strong>CNPJ:</strong> 62.394.914/0001-31
          </p>

          <p>
            <strong>Fale conosco:</strong>
            <br />
            email: <a href="mailto:termos@prussiktrails.com">termos@prussiktrails.com</a>
            <br />
            site: <a href="https://www.prussiktrails.com.br/termos" target="_blank" rel="noopener noreferrer">www.prussiktrails.com.br/termos</a>
          </p>
        </section>

        <footer className="companyActions">
          <button type="button" onClick={onClose}>
            Fechar
          </button>
        </footer>
      </div>

      <style>{`
        .companyOverlay {
          position: fixed;
          inset: 0;
          z-index: 9998;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(15, 23, 42, 0.72);
          backdrop-filter: blur(10px);
        }

        .companyBox {
          width: min(720px, 100%);
          max-height: min(88vh, 760px);
          overflow: hidden;
          position: relative;
          border-radius: 30px;
          background: #fffdf7;
          color: #203c2e;
          border: 1px solid rgba(212, 179, 90, 0.26);
          box-shadow: 0 28px 88px rgba(15, 23, 42, 0.34);
        }

        .companyClose {
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

        .companyHero {
          padding: 30px 34px 24px;
          background: linear-gradient(135deg, #203c2e 0%, #294735 100%);
          color: #fffdf7;
        }

        .companyHero p {
          margin: 0 0 10px;
          color: rgba(255, 253, 247, 0.72);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.72rem;
          font-weight: 900;
        }

        .companyHero h2 {
          margin: 0;
          max-width: 640px;
          font-size: clamp(2rem, 5vw, 3.3rem);
          line-height: 0.98;
          letter-spacing: -0.05em;
          font-family: Georgia, 'Times New Roman', serif;
        }

        .companyHero span {
          display: block;
          margin-top: 14px;
          color: rgba(255, 253, 247, 0.82);
          font-size: 0.95rem;
          line-height: 1.55;
        }

        .companyInfo {
          padding: 24px 28px 12px;
          max-height: 52vh;
          overflow: auto;
        }

        .companyInfo h3 {
          margin: 0 0 16px;
          color: #203c2e;
          font-size: 1.2rem;
        }

        .companyInfo p {
          margin: 0 0 14px;
          color: #39483e;
          line-height: 1.72;
          font-size: 0.95rem;
        }

        .companyInfo a {
          color: #203c2e;
          font-weight: 800;
          text-decoration: underline;
        }

        .companyActions {
          padding: 16px 28px 22px;
          display: flex;
          justify-content: flex-end;
          border-top: 1px solid rgba(32, 60, 46, 0.08);
        }

        .companyActions button {
          border: 0;
          border-radius: 999px;
          padding: 11px 18px;
          background: #203c2e;
          color: #fffdf7;
          cursor: pointer;
          font-weight: 900;
        }

        @media (max-width: 720px) {
          .companyOverlay {
            padding: 0;
            align-items: stretch;
          }

          .companyBox {
            height: 100vh;
            max-height: 100vh;
            border-radius: 0;
          }

          .companyHero {
            padding: 26px 22px 20px;
          }

          .companyInfo {
            padding: 20px 18px;
            max-height: calc(100vh - 220px);
          }

          .companyActions {
            padding: 14px 18px 18px;
          }

          .companyActions button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
