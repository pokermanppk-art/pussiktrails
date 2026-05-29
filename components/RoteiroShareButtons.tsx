'use client'

import { useMemo, useState } from 'react'

type RoteiroShareButtonsProps = {
  roteiroId: string
  titulo?: string | null
  className?: string
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://prussiktrails.com.br'

function texto(valor: unknown) {
  return String(valor || '').trim()
}

export default function RoteiroShareButtons({
  roteiroId,
  titulo,
  className = ''
}: RoteiroShareButtonsProps) {
  const [copiado, setCopiado] = useState(false)

  const link = useMemo(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/roteiros/${roteiroId}`
    }

    return `${APP_URL}/roteiros/${roteiroId}`
  }, [roteiroId])

  const tituloFinal = texto(titulo) || 'Roteiro PrussikTrails'

  const mensagem = `Olha esse roteiro no PrussikTrails: ${tituloFinal}\n${link}`

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 2200)
    } catch {
      window.prompt('Copie o link do roteiro:', link)
    }
  }

  async function compartilharNativo() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: tituloFinal,
          text: 'Veja este roteiro no PrussikTrails.',
          url: link
        })

        return
      }

      await copiarLink()
    } catch {
      // usuário cancelou ou o navegador não permitiu
    }
  }

  function enviarWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(mensagem)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function prepararInstagram() {
    await copiarLink()
    alert(
      'Link copiado. Para Instagram, use o sticker de link no Story e cole o link do roteiro.'
    )
  }

  return (
    <div className={`shareBox ${className}`}>
      <style>{`
        .shareBox {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
          margin-top: 16px;
        }

        .shareButton {
          border: 1px solid rgba(32, 60, 46, 0.12);
          background: rgba(255, 253, 247, 0.86);
          color: #203c2e;
          border-radius: 999px;
          padding: 11px 14px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.18s ease;
          white-space: nowrap;
        }

        .shareButton:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.10);
        }

        .shareButton.primary {
          background: #203c2e;
          color: #fffdf7;
          border-color: #203c2e;
        }

        .shareButton.whatsapp {
          background: #dcfce7;
          color: #166534;
          border-color: #bbf7d0;
        }

        .shareButton.instagram {
          background: #fff7ed;
          color: #9a3412;
          border-color: #fed7aa;
        }

        .shareFeedback {
          color: #166534;
          font-size: 12px;
          font-weight: 850;
        }

        @media (max-width: 560px) {
          .shareBox {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .shareButton {
            width: 100%;
          }

          .shareFeedback {
            grid-column: 1 / -1;
          }
        }
      `}</style>

      <button
        type="button"
        className="shareButton primary"
        onClick={compartilharNativo}
      >
        Compartilhar
      </button>

      <button
        type="button"
        className="shareButton whatsapp"
        onClick={enviarWhatsApp}
      >
        WhatsApp
      </button>

      <button
        type="button"
        className="shareButton instagram"
        onClick={prepararInstagram}
      >
        Instagram
      </button>

      <button
        type="button"
        className="shareButton"
        onClick={copiarLink}
      >
        Copiar link
      </button>

      {copiado && <span className="shareFeedback">Link copiado.</span>}
    </div>
  )
}