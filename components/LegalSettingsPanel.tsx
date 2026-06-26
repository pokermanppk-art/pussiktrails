'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { LEGAL_LINKS, type LegalFooterLink } from '@/lib/legalDocuments'

type LegalSettingsPanelProps = {
  userId?: string | null
  tipoUsuario?: 'cliente' | 'guia' | 'admin' | string
}

type AceiteLegal = {
  id?: string
  user_id?: string
  documento_id?: string | null
  codigo_documento?: string | null
  documento_codigo?: string | null
  documento?: string | null
  tipo_documento?: string | null
  titulo?: string | null
  versao?: string | null
  contexto?: string | null
  origem?: string | null
  reserva_id?: string | null
  roteiro_id?: string | null
  ip?: string | null
  user_agent?: string | null
  created_at?: string | null
  aceito_em?: string | null
}

function texto(valor: unknown): string {
  return String(valor || '').trim()
}

function formatarData(dataISO?: string | null): string {
  const raw = texto(dataISO)
  if (!raw) return 'Data não registrada'

  const data = new Date(raw)
  if (Number.isNaN(data.getTime())) return raw

  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function tituloContexto(contexto?: string | null): string {
  const valor = texto(contexto)

  if (valor === 'cadastro') return 'Cadastro'
  if (valor === 'reserva') return 'Reserva / Termo de Riscos'
  if (valor === 'publicacao_roteiro') return 'Publicação de roteiro'
  if (valor === 'perfil') return 'Perfil'
  if (valor === 'atualizacao_termos') return 'Atualização de termos'

  return valor || 'Aceite registrado'
}

function tituloDocumento(aceite: AceiteLegal): string {
  const codigo =
    texto(aceite.codigo_documento) ||
    texto(aceite.documento_codigo) ||
    texto(aceite.documento) ||
    texto(aceite.tipo_documento)

  const link = LEGAL_LINKS.find((item: LegalFooterLink) => item.codigo === codigo)

  return texto(aceite.titulo) || link?.label || codigo || 'Documento legal'
}

export default function LegalSettingsPanel({
  userId,
  tipoUsuario = 'cliente',
}: LegalSettingsPanelProps) {
  const [aceites, setAceites] = useState<AceiteLegal[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const linksVisiveis = useMemo(() => {
    if (tipoUsuario === 'cliente') {
      return LEGAL_LINKS.filter(
        (link: LegalFooterLink) => link.codigo !== 'termo_guia'
      )
    }

    if (tipoUsuario === 'guia') {
      return LEGAL_LINKS
    }

    return LEGAL_LINKS
  }, [tipoUsuario])

  useEffect(() => {
    const idSeguro = texto(userId)

    if (!idSeguro) {
      setAceites([])
      return
    }

    let ativo = true

    async function carregarAceites() {
      try {
        setCarregando(true)
        setErro('')

        const resposta = await fetch(
          `/api/legal/meus-aceites?userId=${encodeURIComponent(idSeguro)}`,
          {
            method: 'GET',
            cache: 'no-store',
          }
        )

        const json = await resposta.json().catch(() => ({}))

        if (!resposta.ok) {
          throw new Error(json?.erro || json?.message || 'Não foi possível carregar seus aceites.')
        }

        const lista =
          Array.isArray(json?.aceites)
            ? json.aceites
            : Array.isArray(json?.data)
              ? json.data
              : Array.isArray(json)
                ? json
                : []

        if (ativo) {
          setAceites(lista as AceiteLegal[])
        }
      } catch (error: any) {
        if (ativo) {
          setErro(error?.message || 'Não foi possível carregar seus aceites.')
        }
      } finally {
        if (ativo) {
          setCarregando(false)
        }
      }
    }

    carregarAceites()

    return () => {
      ativo = false
    }
  }, [userId])

  return (
    <section className="legalSettingsPanel">
      <header className="legalSettingsHeader">
        <div>
          <p>Transparência e segurança jurídica</p>
          <h3>Documentos legais e aceites</h3>
        </div>
      </header>

      <div className="legalSettingsBlock">
        <h4>Documentos disponíveis</h4>

        <div className="legalDocumentsGrid">
          {linksVisiveis.map((link: LegalFooterLink) => (
            <Link key={link.codigo} href={link.href} target="_blank" rel="noopener noreferrer">
              <span>{link.label}</span>
              <small>Abrir documento</small>
            </Link>
          ))}

          <a href="mailto:contato@prussiktrails.com.br">
            <span>Contato</span>
            <small>Suporte e dúvidas</small>
          </a>

          <a href="mailto:dpo@prussiktrails.com.br">
            <span>DPO / LGPD</span>
            <small>Dados pessoais</small>
          </a>
        </div>
      </div>

      <div className="legalSettingsBlock">
        <h4>Meus aceites registrados</h4>

        {carregando ? (
          <p className="legalMuted">Carregando histórico de aceites...</p>
        ) : erro ? (
          <p className="legalError">{erro}</p>
        ) : aceites.length === 0 ? (
          <p className="legalMuted">
            Nenhum aceite registrado ainda. Os aceites aparecerão aqui após cadastro, reserva ou
            publicação de roteiro.
          </p>
        ) : (
          <div className="legalAcceptancesList">
            {aceites.map((aceite: AceiteLegal, index: number) => (
              <article key={aceite.id || `${tituloDocumento(aceite)}-${index}`}>
                <strong>{tituloDocumento(aceite)}</strong>
                <span>{tituloContexto(aceite.contexto)}</span>
                <small>
                  {formatarData(aceite.created_at || aceite.aceito_em)}
                  {aceite.versao ? ` · versão ${aceite.versao}` : ''}
                </small>
              </article>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .legalSettingsPanel {
          width: 100%;
          display: grid;
          gap: 16px;
          color: #203c2e;
        }

        .legalSettingsHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 18px;
          border-radius: 22px;
          background: linear-gradient(135deg, rgba(32, 60, 46, .08), rgba(212, 179, 90, .12));
          border: 1px solid rgba(32, 60, 46, .12);
        }

        .legalSettingsHeader p {
          margin: 0 0 4px;
          color: #7b8372;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .legalSettingsHeader h3 {
          margin: 0;
          color: #203c2e;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 24px;
          line-height: 1.08;
        }

        .legalSettingsBlock {
          padding: 18px;
          border-radius: 22px;
          background: rgba(255, 253, 247, .92);
          border: 1px solid rgba(32, 60, 46, .12);
        }

        .legalSettingsBlock h4 {
          margin: 0 0 12px;
          font-size: 15px;
          color: #203c2e;
        }

        .legalDocumentsGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .legalDocumentsGrid a {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 13px 14px;
          border-radius: 16px;
          border: 1px solid rgba(32, 60, 46, .1);
          background: #f3f5ea;
          text-decoration: none;
          color: #203c2e;
        }

        .legalDocumentsGrid a:hover {
          border-color: rgba(212, 179, 90, .55);
          background: rgba(212, 179, 90, .14);
        }

        .legalDocumentsGrid span {
          font-size: 13px;
          font-weight: 900;
        }

        .legalDocumentsGrid small,
        .legalMuted {
          color: #7b8372;
          font-size: 12px;
          line-height: 1.5;
        }

        .legalError {
          margin: 0;
          color: #dc2626;
          font-size: 13px;
          line-height: 1.5;
        }

        .legalAcceptancesList {
          display: grid;
          gap: 10px;
        }

        .legalAcceptancesList article {
          display: grid;
          gap: 4px;
          padding: 13px 14px;
          border-radius: 16px;
          background: #f3f5ea;
          border: 1px solid rgba(32, 60, 46, .1);
        }

        .legalAcceptancesList strong {
          color: #203c2e;
          font-size: 13px;
        }

        .legalAcceptancesList span {
          color: #294735;
          font-size: 12px;
          font-weight: 800;
        }

        .legalAcceptancesList small {
          color: #7b8372;
          font-size: 12px;
        }

        @media (max-width: 640px) {
          .legalDocumentsGrid {
            grid-template-columns: 1fr;
          }

          .legalSettingsHeader,
          .legalSettingsBlock {
            padding: 16px;
            border-radius: 20px;
          }

          .legalSettingsHeader h3 {
            font-size: 21px;
          }
        }
      `}</style>
    </section>
  )
}
