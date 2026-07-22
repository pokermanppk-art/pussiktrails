import Link from 'next/link'
import { DOCUMENTOS_LEGAIS, type DocumentoLegalCodigo } from '../lib/legalDocuments'

type DocumentoLegalPageProps = {
  documento: DocumentoLegalCodigo
}

type LegalNavItem = {
  codigo: DocumentoLegalCodigo
  label: string
  href: string
}

const LEGAL_NAV: LegalNavItem[] = [
  {
    codigo: 'termos_uso',
    label: 'Termos',
    href: '/termos',
  },
  {
    codigo: 'politica_privacidade',
    label: 'Privacidade',
    href: '/politica-de-privacidade',
  },
  {
    codigo: 'politica_cookies',
    label: 'Cookies',
    href: '/politica-de-cookies',
  },
  {
    codigo: 'fornecedores',
    label: 'Fornecedores',
    href: '/fornecedores',
  },
  {
    codigo: 'termo_guia',
    label: 'Termo do Guia',
    href: '/termo-do-guia',
  },
  {
    codigo: 'termo_riscos',
    label: 'Termo de Riscos',
    href: '/termo-de-riscos',
  },
  {
    codigo: 'politica_cancelamento',
    label: 'Cancelamento',
    href: '/politica-de-cancelamento',
  },
  {
    codigo: 'termo_afiliado',
    label: 'Afiliados',
    href: '/termo-do-afiliado',
  },
]

const RESUMOS: Record<DocumentoLegalCodigo, string> = {
  termos_uso:
    'Regras gerais da PrussikTrails, cadastro, marketplace outdoor, responsabilidades, pagamentos, grupos, avaliações, conduta, limites de responsabilidade, Beta e aceite geral.',
  politica_privacidade:
    'Tratamento de dados pessoais, LGPD, retenção, compartilhamento, segurança e direitos dos titulares.',
  politica_cookies:
    'Uso de cookies, localStorage, analytics, segurança, preferências de navegação e tecnologias similares.',
  fornecedores:
    'Lista de fornecedores tecnológicos utilizados pela PrussikTrails, incluindo infraestrutura, hospedagem, banco de dados, pagamentos e serviços auxiliares.',
  termo_guia:
    'Responsabilidade, confidencialidade, tratamento de dados, segurança operacional, atuação independente e regras aplicáveis aos Guias.',
  termo_riscos:
    'Ciência de riscos outdoor, declaração de participação, informações de saúde, menores, acompanhantes e aceite antes da reserva.',
  politica_cancelamento:
    'Cancelamentos, remarcações, reembolsos, estornos, Saldo de Jornada e reflexos financeiros sobre reservas e comissões.',
  termo_afiliado:
    'Regras do Programa de Afiliados, indicações, comissões, saques, uso do saldo, publicidade, proteção de dados e prevenção de fraudes.',
}

const MARCADOR_INICIAL: Record<DocumentoLegalCodigo, string> = {
  termos_uso: 'PARTE I',
  politica_privacidade: 'PARTE II',
  politica_cookies: 'ANEXO II',
  fornecedores: 'ANEXO III',
  termo_guia: 'ANEXO IV',
  termo_riscos: 'ANEXO V',
  politica_cancelamento: 'POLÍTICA DE CANCELAMENTO',
  termo_afiliado: 'ANEXO VI',
}

function texto(valor: unknown): string {
  return String(valor || '').trim()
}

function removerCapaInicial(conteudoOriginal: string, documento: DocumentoLegalCodigo): string {
  const conteudo = texto(conteudoOriginal)
  const marcador = MARCADOR_INICIAL[documento]

  if (!conteudo || !marcador) return conteudo

  const posicao = conteudo.indexOf(marcador)

  if (posicao <= 0) return conteudo

  return conteudo.slice(posicao).trim()
}

function renderizarBloco(bloco: string, index: number) {
  const textoBloco = bloco.trim()

  if (!textoBloco) return null

  const tituloPrincipal =
    /^PARTE\s+[IVXLCDM]+/i.test(textoBloco) ||
    /^ANEXO\s+[IVXLCDM]+/i.test(textoBloco)

  const tituloSecundario =
    textoBloco.length <= 130 &&
    (
      textoBloco === textoBloco.toUpperCase() ||
      /^[0-9]+(\.[0-9]+)*\.?\s+/.test(textoBloco)
    )

  const pareceTabela = textoBloco.includes(' | ')
  const pareceLista = /^[-•]\s+/.test(textoBloco)

  if (tituloPrincipal) {
    return (
      <h2 key={`h2-${index}`} className="legal-doc-h2">
        {textoBloco}
      </h2>
    )
  }

  if (tituloSecundario) {
    return (
      <h3 key={`h3-${index}`} className="legal-doc-h3">
        {textoBloco}
      </h3>
    )
  }

  if (pareceTabela) {
    return (
      <p key={`table-${index}`} className="legal-doc-table-line">
        {textoBloco}
      </p>
    )
  }

  if (pareceLista) {
    return (
      <p key={`list-${index}`} className="legal-doc-list-line">
        {textoBloco}
      </p>
    )
  }

  return (
    <p key={`p-${index}`} className="legal-doc-p">
      {textoBloco}
    </p>
  )
}

export default function LegalDocumentPage({ documento }: DocumentoLegalPageProps) {
  const doc = DOCUMENTOS_LEGAIS[documento]

  if (!doc) {
    return (
      <main className="legal-page">
        <section className="legal-hero">
          <div className="legal-shell">
            <Link href="/" className="legal-back">
              ← Voltar para PrussikTrails
            </Link>

            <p className="legal-kicker">Documentos legais</p>
            <h1>Documento não encontrado</h1>
          </div>
        </section>

        <style>{styles}</style>
      </main>
    )
  }

  const resumo = RESUMOS[documento] || doc.descricao
  const conteudo = removerCapaInicial(texto(doc.texto), documento) || resumo

  const blocos = conteudo
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map((bloco) => bloco.trim())
    .filter(Boolean)

  return (
    <main className="legal-page">
      <section className="legal-hero">
        <div className="legal-shell">
          <Link href="/" className="legal-back">
            ← Voltar para PrussikTrails
          </Link>

          <p className="legal-kicker">Documentos legais</p>
          <h1>{doc.titulo}</h1>

          <p className="legal-version">
            Versão {doc.versao} • Atualizado em {doc.atualizadoEm || '17/06/2026'}
          </p>
        </div>
      </section>

      <section className="legal-body">
        <div className="legal-shell legal-grid">
          <aside className="legal-sidebar">
            <h2>Resumo</h2>
            <p>{resumo}</p>

            <nav className="legal-nav" aria-label="Navegação dos documentos legais">
              {LEGAL_NAV.map((item) => (
                <Link
                  key={item.codigo}
                  href={item.href}
                  className={item.codigo === documento ? 'active' : ''}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          <article className="legal-card">
            {blocos.map((bloco, index) => renderizarBloco(bloco, index))}
          </article>
        </div>
      </section>

      <style>{styles}</style>
    </main>
  )
}

const styles = `
  .legal-page {
    min-height: 100vh;
    background: #fffdf7;
    color: #203c2e;
  }

  .legal-shell {
    width: min(1160px, calc(100% - 36px));
    margin: 0 auto;
  }

  .legal-hero {
    background: #203c2e;
    color: #fffdf7;
    padding: 42px 0 36px;
  }

  .legal-back {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 28px;
    color: rgba(255, 253, 247, 0.76);
    text-decoration: none;
    font-size: 0.92rem;
    font-weight: 800;
  }

  .legal-back:hover {
    color: #fffdf7;
    text-decoration: underline;
  }

  .legal-kicker {
    margin: 0 0 10px;
    color: rgba(255, 253, 247, 0.7);
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 0.74rem;
    font-weight: 950;
  }

  .legal-hero h1 {
    margin: 0;
    color: #fffdf7;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: clamp(3rem, 7vw, 5.2rem);
    line-height: 0.94;
    letter-spacing: -0.065em;
  }

  .legal-version {
    margin: 16px 0 0;
    color: rgba(255, 253, 247, 0.72);
    font-size: 0.92rem;
    font-weight: 800;
  }

  .legal-body {
    background:
      radial-gradient(circle at top left, rgba(212, 179, 90, 0.14), transparent 34%),
      linear-gradient(180deg, #fffdf7 0%, #f3f5ea 100%);
    padding: 34px 0 72px;
  }

  .legal-grid {
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
    gap: 28px;
    align-items: start;
  }

  .legal-sidebar {
    position: sticky;
    top: 24px;
    border-radius: 24px;
    padding: 18px;
    background: #f3f5ea;
    border: 1px solid rgba(32, 60, 46, 0.12);
    box-shadow: 0 18px 50px rgba(32, 60, 46, 0.06);
  }

  .legal-sidebar h2 {
    margin: 2px 0 10px;
    color: #203c2e;
    font-size: 0.94rem;
    font-weight: 950;
  }

  .legal-sidebar p {
    margin: 0 0 16px;
    color: #607060;
    font-size: 0.94rem;
    line-height: 1.52;
  }

  .legal-nav {
    display: grid;
    gap: 9px;
  }

  .legal-nav a {
    display: flex;
    align-items: center;
    min-height: 40px;
    padding: 9px 13px;
    border-radius: 14px;
    background: rgba(255, 253, 247, 0.86);
    color: #203c2e;
    text-decoration: none;
    font-size: 0.86rem;
    font-weight: 950;
    border: 1px solid rgba(32, 60, 46, 0.04);
  }

  .legal-nav a:hover {
    border-color: rgba(212, 179, 90, 0.46);
    background: rgba(212, 179, 90, 0.12);
  }

  .legal-nav a.active {
    background: #203c2e;
    color: #fffdf7;
    border-color: #203c2e;
  }

  .legal-card {
    min-height: 640px;
    border-radius: 28px;
    padding: 46px 46px 54px;
    background: rgba(255, 255, 255, 0.88);
    border: 1px solid rgba(32, 60, 46, 0.08);
    box-shadow: 0 24px 70px rgba(32, 60, 46, 0.08);
  }

  .legal-doc-h2 {
    margin: 0 0 42px;
    color: #00352b;
    font-size: 1.15rem;
    line-height: 1.35;
    font-weight: 950;
    letter-spacing: -0.02em;
  }

  .legal-doc-h2:not(:first-child) {
    margin-top: 44px;
  }

  .legal-doc-h3 {
    margin: 0 0 34px;
    color: #00352b;
    font-size: 1.08rem;
    line-height: 1.4;
    font-weight: 950;
  }

  .legal-doc-p,
  .legal-doc-list-line,
  .legal-doc-table-line {
    margin: 0 0 34px;
    color: #123b33;
    font-size: 1rem;
    line-height: 1.46;
    white-space: pre-wrap;
  }

  .legal-doc-p strong {
    font-weight: 950;
  }

  .legal-doc-list-line {
    padding-left: 14px;
    border-left: 3px solid rgba(212, 179, 90, 0.55);
  }

  .legal-doc-table-line {
    padding: 12px 14px;
    border-radius: 14px;
    background: #f3f5ea;
    border: 1px solid rgba(32, 60, 46, 0.08);
    font-size: 0.92rem;
  }

  @media (max-width: 900px) {
    .legal-grid {
      grid-template-columns: 1fr;
    }

    .legal-sidebar {
      position: static;
    }

    .legal-nav {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .legal-shell {
      width: min(100% - 28px, 1160px);
    }

    .legal-hero {
      padding: 32px 0 30px;
    }

    .legal-back {
      margin-bottom: 22px;
    }

    .legal-body {
      padding: 24px 0 52px;
    }

    .legal-sidebar {
      border-radius: 22px;
      padding: 16px;
    }

    .legal-nav {
      grid-template-columns: 1fr;
    }

    .legal-card {
      border-radius: 24px;
      padding: 28px 22px 36px;
    }

    .legal-doc-h2 {
      margin-bottom: 28px;
      font-size: 1.05rem;
    }

    .legal-doc-h3 {
      margin-bottom: 24px;
      font-size: 1rem;
    }

    .legal-doc-p,
    .legal-doc-list-line,
    .legal-doc-table-line {
      margin-bottom: 24px;
      font-size: 0.94rem;
      line-height: 1.58;
    }
  }
`
