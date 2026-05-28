'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type UsuarioLocal = {
  id?: string | null
  guia_id?: string | null
  usuario_id?: string | null
  user_id?: string | null
  nome?: string | null
  email?: string | null
  tipo?: string | null
}

type PerguntaRoteiro = {
  id: string
  roteiro_id: string
  roteiro_titulo?: string | null
  roteiro_local?: string | null
  cliente_nome?: string | null
  pergunta: string
  resposta?: string | null
  status?: string | null
  created_at?: string | null
}

function extrairUsuarioId(usuario: UsuarioLocal | null) {
  return String(
    usuario?.id ||
      usuario?.guia_id ||
      usuario?.usuario_id ||
      usuario?.user_id ||
      ''
  ).trim()
}

export default function PerguntasRoteirosCard() {
  const router = useRouter()

  const [guiaId, setGuiaId] = useState('')
  const [perguntas, setPerguntas] = useState<PerguntaRoteiro[]>([])
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [carregando, setCarregando] = useState(true)
  const [respondendoId, setRespondendoId] = useState('')
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    const salvo = localStorage.getItem('user')
    const usuario = salvo ? (JSON.parse(salvo) as UsuarioLocal) : null
    const id = extrairUsuarioId(usuario)

    setGuiaId(id)

    if (id) {
      carregarPerguntas(id)
    } else {
      setCarregando(false)
    }
  }, [])

  async function carregarPerguntas(idGuia = guiaId) {
    if (!idGuia) return

    try {
      setCarregando(true)
      setAviso('')

      const response = await fetch(
        `/api/roteiros/perguntas?guiaId=${encodeURIComponent(idGuia)}&status=pendente&limit=8`,
        {
          headers: {
            'Cache-Control': 'no-store',
            Pragma: 'no-cache',
          },
        }
      )

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.erro || 'Não foi possível carregar perguntas.')
      }

      setPerguntas(Array.isArray(data?.perguntas) ? data.perguntas : [])
    } catch (error) {
      console.error('Erro ao carregar perguntas do guia:', error)
      setAviso(error instanceof Error ? error.message : 'Erro ao carregar perguntas.')
    } finally {
      setCarregando(false)
    }
  }

  async function responder(pergunta: PerguntaRoteiro) {
    const resposta = String(respostas[pergunta.id] || '').trim()

    if (!resposta) {
      setAviso('Escreva uma resposta antes de publicar.')
      return
    }

    try {
      setRespondendoId(pergunta.id)
      setAviso('')

      const response = await fetch('/api/roteiros/perguntas/responder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          perguntaId: pergunta.id,
          roteiroId: pergunta.roteiro_id,
          guiaId,
          resposta,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.erro || 'Não foi possível publicar a resposta.')
      }

      setRespostas((prev) => ({ ...prev, [pergunta.id]: '' }))
      setAviso('Resposta publicada no roteiro.')
      await carregarPerguntas()
    } catch (error) {
      console.error('Erro ao responder pergunta:', error)
      setAviso(error instanceof Error ? error.message : 'Erro ao responder pergunta.')
    } finally {
      setRespondendoId('')
    }
  }

  const totalPendentes = useMemo(() => perguntas.length, [perguntas.length])

  return (
    <section className="perguntasCard">
      <div className="perguntasHeader">
        <div>
          <span>Comunicação dos roteiros</span>
          <h2>Perguntas dos aventureiros</h2>
          <p>
            Responda dúvidas públicas dos seus roteiros. A resposta aparece no próprio roteiro.
          </p>
        </div>

        <strong>{carregando ? '...' : totalPendentes}</strong>
      </div>

      {aviso && <div className="perguntasAviso">{aviso}</div>}

      {carregando ? (
        <div className="perguntasEmpty">Carregando perguntas...</div>
      ) : perguntas.length === 0 ? (
        <div className="perguntasEmpty">
          <strong>Nenhuma pergunta pendente.</strong>
          <p>Quando um cliente perguntar em um roteiro, a pendência aparecerá aqui.</p>
        </div>
      ) : (
        <div className="perguntasLista">
          {perguntas.map((pergunta) => (
            <article key={pergunta.id} className="perguntaItem">
              <div className="perguntaTop">
                <div>
                  <strong>{pergunta.roteiro_titulo || 'Roteiro'}</strong>
                  <span>{pergunta.cliente_nome || 'Aventureiro'} perguntou</span>
                </div>

                <button
                  type="button"
                  onClick={() => router.push(`/roteiros/${pergunta.roteiro_id}`)}
                >
                  Abrir roteiro
                </button>
              </div>

              <p className="perguntaTexto">{pergunta.pergunta}</p>

              <textarea
                value={respostas[pergunta.id] || ''}
                onChange={(event) =>
                  setRespostas((prev) => ({
                    ...prev,
                    [pergunta.id]: event.target.value,
                  }))
                }
                placeholder="Responder publicamente no roteiro..."
                maxLength={900}
                disabled={respondendoId === pergunta.id}
              />

              <div className="perguntaActions">
                <span>{String(respostas[pergunta.id] || '').length}/900</span>

                <button
                  type="button"
                  onClick={() => responder(pergunta)}
                  disabled={respondendoId === pergunta.id}
                >
                  {respondendoId === pergunta.id ? 'Publicando...' : 'Responder'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <style jsx>{`
        .perguntasCard {
          border: 1px solid rgba(32, 60, 46, 0.08);
          border-radius: 30px;
          background: rgba(255, 253, 247, 0.88);
          box-shadow: 0 20px 56px rgba(32, 60, 46, 0.09);
          padding: 20px;
          display: grid;
          gap: 14px;
        }

        .perguntasHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .perguntasHeader span {
          display: block;
          color: #991b1b;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin-bottom: 6px;
        }

        .perguntasHeader h2 {
          margin: 0;
          color: #172018;
          font-size: clamp(24px, 4vw, 36px);
          line-height: 0.95;
          font-weight: 950;
          letter-spacing: -0.06em;
        }

        .perguntasHeader p {
          margin: 8px 0 0;
          color: rgba(23, 32, 24, 0.58);
          font-size: 13px;
          line-height: 1.45;
          font-weight: 750;
        }

        .perguntasHeader > strong {
          min-width: 46px;
          height: 46px;
          border-radius: 18px;
          background: #203c2e;
          color: #fffdf7;
          display: grid;
          place-items: center;
          font-size: 20px;
          font-weight: 950;
        }

        .perguntasAviso {
          border-radius: 18px;
          background: rgba(153, 27, 27, 0.08);
          border: 1px solid rgba(153, 27, 27, 0.14);
          color: #7f1d1d;
          padding: 11px 12px;
          font-size: 12px;
          line-height: 1.35;
          font-weight: 850;
        }

        .perguntasEmpty {
          border-radius: 24px;
          background: rgba(32, 60, 46, 0.045);
          padding: 18px;
          color: rgba(23, 32, 24, 0.6);
          font-size: 13px;
          line-height: 1.45;
          font-weight: 750;
        }

        .perguntasEmpty strong {
          display: block;
          color: #203c2e;
          font-size: 14px;
          font-weight: 950;
          margin-bottom: 5px;
        }

        .perguntasLista {
          display: grid;
          gap: 12px;
        }

        .perguntaItem {
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(32, 60, 46, 0.08);
          padding: 14px;
          display: grid;
          gap: 10px;
        }

        .perguntaTop {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .perguntaTop strong {
          display: block;
          color: #203c2e;
          font-size: 14px;
          line-height: 1.25;
          font-weight: 950;
        }

        .perguntaTop span {
          display: block;
          color: rgba(23, 32, 24, 0.48);
          font-size: 11px;
          font-weight: 850;
          margin-top: 3px;
        }

        .perguntaTop button {
          border: 0;
          border-radius: 999px;
          background: rgba(32, 60, 46, 0.08);
          color: #203c2e;
          padding: 9px 11px;
          font-size: 11px;
          font-weight: 950;
          cursor: pointer;
          white-space: nowrap;
        }

        .perguntaTexto {
          margin: 0;
          color: rgba(23, 32, 24, 0.74);
          font-size: 14px;
          line-height: 1.5;
          font-weight: 760;
        }

        .perguntaItem textarea {
          width: 100%;
          min-height: 86px;
          resize: vertical;
          border: 1px solid rgba(32, 60, 46, 0.12);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.78);
          color: #172018;
          padding: 13px;
          font: inherit;
          font-size: 13px;
          line-height: 1.5;
          font-weight: 750;
          outline: none;
        }

        .perguntaActions {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }

        .perguntaActions span {
          color: rgba(23, 32, 24, 0.48);
          font-size: 11px;
          font-weight: 850;
        }

        .perguntaActions button {
          border: 0;
          border-radius: 999px;
          background: #203c2e;
          color: #fffdf7;
          padding: 11px 14px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
        }

        .perguntaActions button:disabled {
          opacity: 0.58;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .perguntasCard {
            border-radius: 24px;
            padding: 16px;
          }

          .perguntasHeader,
          .perguntaTop,
          .perguntaActions {
            align-items: stretch;
            flex-direction: column;
          }

          .perguntaTop button,
          .perguntaActions button {
            width: 100%;
          }
        }
      `}</style>
    </section>
  )
}
