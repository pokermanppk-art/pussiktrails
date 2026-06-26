import Link from 'next/link'
import { DOCUMENTOS_LEGAIS, type DocumentoLegalCodigo } from '@/lib/legalDocuments'

export default function LegalDocumentPage({ documento }: { documento: DocumentoLegalCodigo }) {
  const doc = DOCUMENTOS_LEGAIS[documento]
  const linhas = doc.texto.split('\n')

  return (
    <main className="legalPage">
      <section className="legalHero">
        <Link href="/">← Voltar para PrussikTrails</Link>
        <p>Documentos legais</p>
        <h1>{doc.titulo}</h1>
        <span>Versão {doc.versao} • Atualizado em {doc.ultimaAtualizacao}</span>
      </section>

      <section className="legalContent">
        <aside>
          <strong>Resumo</strong>
          <p>{doc.resumo}</p>
          <nav>
            <Link href="/termos">Termos</Link>
            <Link href="/politica-de-privacidade">Privacidade</Link>
            <Link href="/politica-de-cookies">Cookies</Link>
            <Link href="/fornecedores">Fornecedores</Link>
            <Link href="/termo-do-guia">Termo do Guia</Link>
            <Link href="/termo-de-riscos">Termo de Riscos</Link>
          </nav>
        </aside>

        <article>
          {linhas.map((linha, index) => {
            const t = linha.trim()
            if (!t) return <br key={index} />
            const heading = t === t.toUpperCase() || /^\d+(\.\d+)*\.\s/.test(t) || t.startsWith('ANEXO') || t.startsWith('PARTE')
            if (heading) return <h2 key={index}>{t}</h2>
            return <p key={index}>{t}</p>
          })}
        </article>
      </section>

      <style>{styles}</style>
    </main>
  )
}

const styles = `
.legalPage { min-height: 100vh; background: #fffdf7; color: #203c2e; }
.legalHero { padding: 38px 20px 34px; background: linear-gradient(135deg,#203c2e,#294735); color: #fffdf7; }
.legalHero > * { width: min(1180px, 100%); margin-left: auto; margin-right: auto; }
.legalHero a { display: block; color: #fffdf7; text-decoration: none; opacity: .82; margin-bottom: 22px; }
.legalHero p { margin-top: 0; margin-bottom: 8px; text-transform: uppercase; letter-spacing: .14em; font-size: 12px; opacity: .75; }
.legalHero h1 { margin-top: 0; margin-bottom: 10px; font-family: Georgia, 'Times New Roman', serif; font-size: clamp(34px, 6vw, 64px); line-height: 1; }
.legalHero span { display: block; opacity: .78; }
.legalContent { width: min(1180px, 100%); margin: 0 auto; padding: 34px 20px 60px; display: grid; grid-template-columns: 300px 1fr; gap: 28px; align-items: start; }
aside { position: sticky; top: 18px; padding: 18px; border-radius: 24px; background: #f3f5ea; border: 1px solid rgba(32,60,46,.1); }
aside strong { display: block; margin-bottom: 8px; }
aside p { color: rgba(32,60,46,.72); font-size: 14px; line-height: 1.55; margin-top: 0; }
aside nav { display: grid; gap: 8px; margin-top: 14px; }
aside a { text-decoration: none; color: #203c2e; padding: 10px 12px; border-radius: 14px; background: #fffdf7; font-size: 13px; font-weight: 800; }
article { padding: 26px; border-radius: 26px; background: white; border: 1px solid rgba(32,60,46,.08); box-shadow: 0 18px 54px rgba(32,60,46,.08); }
article h2 { margin: 22px 0 10px; font-size: 18px; color: #203c2e; line-height: 1.35; }
article p { margin: 0 0 10px; color: rgba(32,60,46,.84); font-size: 15px; line-height: 1.66; }
@media (max-width: 860px) { .legalContent { grid-template-columns: 1fr; } aside { position: static; } article { padding: 20px; } }
`
