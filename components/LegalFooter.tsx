import Link from 'next/link'
import { LINKS_LEGAIS } from '@/lib/legalDocuments'

export default function LegalFooter() {
  return (
    <footer className="legalFooter">
      <div className="legalFooterInner">
        <p>© PrussikTrails — Sua próxima história começa fora da tela.</p>
        <nav aria-label="Documentos legais">
          {LINKS_LEGAIS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          <a href="mailto:contato@prussiktrails.com.br">Contato</a>
        </nav>
      </div>

      <style>{styles}</style>
    </footer>
  )
}

const styles = `
.legalFooter {
  margin-top: 42px;
  padding: 28px 18px 34px;
  background: #203c2e;
  color: #fffdf7;
}
.legalFooterInner {
  width: min(1180px, 100%);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.legalFooter p {
  margin: 0;
  font-size: 13px;
  opacity: .8;
}
.legalFooter nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px 16px;
}
.legalFooter a {
  color: #fffdf7;
  text-decoration: none;
  font-size: 13px;
  opacity: .86;
}
.legalFooter a:hover {
  opacity: 1;
  text-decoration: underline;
}
@media (max-width: 760px) {
  .legalFooterInner { flex-direction: column; align-items: flex-start; }
  .legalFooter nav { justify-content: flex-start; }
}
`
