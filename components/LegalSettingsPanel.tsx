'use client'

import Link from 'next/link'
import { LINKS_LEGAIS } from '@/lib/legalDocuments'

type AceiteLegal = {
  id?: string
  documento_codigo?: string
  documento_titulo?: string
  documento_versao?: string
  contexto?: string
  created_at?: string
}

type Props = {
  aceites?: AceiteLegal[]
}

function formatDate(value?: string) {
  if (!value) return 'Ainda não registrado'
  const data = new Date(value)
  if (Number.isNaN(data.getTime())) return value
  return data.toLocaleString('pt-BR')
}

export default function LegalSettingsPanel({ aceites = [] }: Props) {
  return (
    <section className="legalSettingsPanel">
      <header>
        <span>⚖️</span>
        <div>
          <h3>Documentos legais e aceites</h3>
          <p>Consulte os termos vigentes e o histórico de confirmações registradas no app.</p>
        </div>
      </header>

      <div className="legalLinksGrid">
        {LINKS_LEGAIS.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </div>

      <div className="legalAcceptancesList">
        {aceites.length === 0 ? (
          <p className="empty">Os aceites aparecerão aqui conforme você usar a plataforma.</p>
        ) : (
          aceites.map((aceite) => (
            <article key={aceite.id || `${aceite.documento_codigo}-${aceite.created_at}`}>
              <strong>{aceite.documento_titulo || aceite.documento_codigo}</strong>
              <span>{aceite.documento_versao}</span>
              <small>{aceite.contexto} • {formatDate(aceite.created_at)}</small>
            </article>
          ))
        )}
      </div>

      <style>{styles}</style>
    </section>
  )
}

const styles = `
.legalSettingsPanel {
  padding: 18px;
  border-radius: 22px;
  background: #f3f5ea;
  border: 1px solid rgba(32, 60, 46, .1);
}
.legalSettingsPanel header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
}
.legalSettingsPanel header span {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #fffdf7;
}
.legalSettingsPanel h3 {
  margin: 0 0 4px;
  color: #203c2e;
  font-size: 18px;
}
.legalSettingsPanel p {
  margin: 0;
  color: rgba(32, 60, 46, .7);
  font-size: 13px;
  line-height: 1.45;
}
.legalLinksGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 16px;
}
.legalLinksGrid a {
  padding: 10px 12px;
  border-radius: 14px;
  text-decoration: none;
  color: #203c2e;
  background: #fffdf7;
  font-size: 13px;
  font-weight: 800;
}
.legalAcceptancesList {
  display: grid;
  gap: 8px;
}
.legalAcceptancesList article {
  display: grid;
  gap: 3px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255,253,247,.72);
}
.legalAcceptancesList strong { color: #203c2e; font-size: 13px; }
.legalAcceptancesList span, .legalAcceptancesList small { color: rgba(32, 60, 46, .64); font-size: 12px; }
.empty { padding: 10px 0; }
@media (max-width: 640px) { .legalLinksGrid { grid-template-columns: 1fr; } }
`
