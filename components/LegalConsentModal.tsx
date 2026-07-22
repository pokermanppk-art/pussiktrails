'use client'

import Link from 'next/link'
import { useState } from 'react'
import { DOCUMENTOS_LEGAIS, type DocumentoLegalCodigo } from '@/lib/legalDocuments'

type LegalConsentModalProps = {
  documento: DocumentoLegalCodigo
  aberto: boolean
  onClose: () => void
  onAccept?: () => void | Promise<void>
  tituloBotaoAceite?: string
  mostrarBotaoAceite?: boolean
  textoAceite?: string
  contexto?: string
}

function texto(valor: unknown): string {
  return String(valor || '').trim()
}

function tituloContexto(contexto?: string) {
  const valor = texto(contexto)

  if (valor === 'cadastro') return 'Aceite necessário para criar sua conta'
  if (valor === 'reserva') return 'Aceite necessário antes da reserva ou pagamento'
  if (valor === 'publicacao_roteiro') return 'Aceite necessário para enviar o roteiro'
  if (valor === 'ativacao_afiliado') return 'Aceite necessário para ativar o Programa de Afiliados'
  if (valor === 'perfil') return 'Documento legal da sua conta'

  return 'Documento legal PrussikTrails'
}

export default function LegalConsentModal({
  documento,
  aberto,
  onClose,
  onAccept,
  tituloBotaoAceite = 'Li e concordo',
  mostrarBotaoAceite = true,
  textoAceite,
  contexto,
}: LegalConsentModalProps) {
  const [liTudo, setLiTudo] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const doc = DOCUMENTOS_LEGAIS[documento]

  if (!aberto) return null

  if (!doc) {
    return (
      <div className="legalOverlay" role="dialog" aria-modal="true" aria-label="Documento legal">
        <div className="legalModal">
          <button type="button" className="legalClose" onClick={onClose} aria-label="Fechar">
            ×
          </button>

          <header className="legalHeader">
            <p>PrussikTrails · documentos legais</p>
            <h2>Documento não encontrado</h2>
          </header>

          <section className="legalBody">
            <p>Não foi possível localizar este documento legal.</p>
          </section>
        </div>

        <style>{styles}</style>
      </div>
    )
  }

  const textoFinalAceite =
    texto(textoAceite) ||
    `Li, compreendi e concordo com ${doc.titulo} da PrussikTrails.`

  async function confirmarAceite() {
    if (!liTudo || salvando) return

    try {
      setSalvando(true)
      await onAccept?.()
      setLiTudo(false)
      onClose()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="legalOverlay" role="dialog" aria-modal="true" aria-label={doc.titulo}>
      <div className="legalModal">
        <button type="button" className="legalClose" onClick={onClose} aria-label="Fechar">
          ×
        </button>

        <header className="legalHeader">
          <p>{tituloContexto(contexto)}</p>
          <h2>{doc.titulo}</h2>
          <span>Versão {doc.versao}</span>
        </header>

        <section className="legalSummary">
          <strong>Resumo do documento</strong>
          <p>{doc.descricao}</p>
        </section>

        <section className="legalBody">
          <div className="legalNotice">
            <h3>Leitura do documento completo</h3>
            <p>
              Para preservar a fluidez do app, este modal apresenta o resumo operacional e mantém o
              acesso ao documento completo em página própria. O aceite será registrado eletronicamente
              com data, hora, versão, origem, IP e user agent, conforme a estrutura jurídica da
              PrussikTrails.
            </p>

            <Link href={doc.rota} target="_blank" rel="noopener noreferrer" className="legalFullLink">
              Abrir documento completo
            </Link>
          </div>

          {documento === 'termo_riscos' ? (
            <div className="legalImportant">
              <h3>Ciência de riscos outdoor</h3>
              <p>
                Atividades outdoor podem envolver riscos naturais, físicos, climáticos, ambientais,
                operacionais e logísticos. O aceite deste termo é condição para prosseguir com a
                reserva ou geração do PIX.
              </p>
            </div>
          ) : null}

          {documento === 'termo_guia' ? (
            <div className="legalImportant">
              <h3>Responsabilidade do Guia</h3>
              <p>
                O Guia atua como prestador independente e assume responsabilidade técnica,
                operacional, confidencialidade dos dados de clientes e vedação de negociação por fora
                da plataforma.
              </p>
            </div>
          ) : null}

          {documento === 'termos_uso' ? (
            <div className="legalImportant">
              <h3>Uso da plataforma</h3>
              <p>
                O cadastro e a interação na PrussikTrails são permitidos apenas para maiores de 18
                anos. Menores podem participar presencialmente apenas vinculados a responsável legal.
              </p>
            </div>
          ) : null}

          {documento === 'termo_afiliado' ? (
            <div className="legalImportant">
              <h3>Programa de Afiliados</h3>
              <p>
                O Programa envolve indicação rastreada, comissão somente sobre vendas qualificadas,
                regras de estorno, uso de saldo, saque, publicidade identificada e prevenção de
                fraude. A participação não garante renda e não cria vínculo empregatício.
              </p>
            </div>
          ) : null}
        </section>

        {mostrarBotaoAceite ? (
          <footer className="legalActions">
            <label className="legalCheck">
              <input
                type="checkbox"
                checked={liTudo}
                onChange={(event) => setLiTudo(event.target.checked)}
              />
              <span>{textoFinalAceite}</span>
            </label>

            <button type="button" disabled={!liTudo || salvando} onClick={confirmarAceite}>
              {salvando ? 'Registrando...' : tituloBotaoAceite}
            </button>
          </footer>
        ) : null}
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
  width: min(840px, 100%);
  max-height: min(88vh, 880px);
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

.legalSummary strong {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.legalSummary p {
  margin: 0;
}

.legalBody {
  flex: 1;
  overflow: auto;
  padding: 22px 34px 28px;
}

.legalNotice,
.legalImportant {
  border: 1px solid rgba(32, 60, 46, .12);
  background: rgba(243, 245, 234, .72);
  border-radius: 20px;
  padding: 16px;
  margin-bottom: 14px;
}

.legalImportant {
  background: rgba(212, 179, 90, .12);
  border-color: rgba(212, 179, 90, .28);
}

.legalBody h3 {
  margin: 0 0 8px;
  color: #203c2e;
  font-size: 16px;
  line-height: 1.35;
}

.legalBody p {
  margin: 0 0 12px;
  color: rgba(32, 60, 46, .86);
  font-size: 14px;
  line-height: 1.64;
}

.legalFullLink {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 11px 16px;
  background: #203c2e;
  color: #fffdf7;
  text-decoration: none;
  font-size: 13px;
  font-weight: 900;
}

.legalFullLink:hover {
  filter: brightness(1.06);
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
  font-weight: 900;
  cursor: pointer;
  background: #203c2e;
  color: #fffdf7;
}

.legalActions button:disabled {
  opacity: .45;
  cursor: not-allowed;
}

@media (max-width: 720px) {
  .legalOverlay {
    padding: 0;
    align-items: stretch;
  }

  .legalModal {
    border-radius: 0;
    max-height: 100vh;
    height: 100vh;
  }

  .legalHeader {
    padding: 26px 22px 16px;
  }

  .legalSummary {
    margin: 16px 22px 0;
  }

  .legalBody {
    padding: 18px 22px 22px;
  }

  .legalActions {
    padding: 14px 22px 18px;
    flex-direction: column;
    align-items: stretch;
  }

  .legalActions button {
    width: 100%;
  }
}
`
