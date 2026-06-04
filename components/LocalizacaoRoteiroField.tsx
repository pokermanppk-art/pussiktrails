'use client'

import { useState } from 'react'

export type LocalizacaoRoteiroValue = {
  endereco_local: string
  ponto_referencia: string
  endereco_formatado?: string
  cidade?: string
  uf?: string
  pais?: string
  latitude?: number | null
  longitude?: number | null
  geocoding_provider?: string
  geocoding_place_id?: string
  geocoding_confianca?: string
}

type Props = {
  value: LocalizacaoRoteiroValue
  onChange: (value: LocalizacaoRoteiroValue) => void
}

function texto(valor: unknown) {
  return String(valor || '').trim()
}

export default function LocalizacaoRoteiroField({ value, onChange }: Props) {
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  const temCoordenadas =
    Number.isFinite(Number(value.latitude)) &&
    Number.isFinite(Number(value.longitude))

  async function localizarEndereco() {
    setErro('')
    setMensagem('')

    const endereco = texto(value.endereco_local)
    const pontoReferencia = texto(value.ponto_referencia)

    if (!endereco) {
      setErro('Informe o local principal do roteiro.')
      return
    }

    try {
      setBuscando(true)

      const response = await fetch('/api/geocoding/buscar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endereco,
          pontoReferencia,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.erro || 'Não foi possível localizar este endereço.')
      }

      const resultado = data.resultado

      onChange({
        ...value,
        endereco_local: endereco,
        ponto_referencia: pontoReferencia,
        endereco_formatado: resultado.endereco_formatado || '',
        cidade: resultado.cidade || '',
        uf: resultado.uf || '',
        pais: resultado.pais || 'Brasil',
        latitude: Number(resultado.latitude),
        longitude: Number(resultado.longitude),
        geocoding_provider: resultado.provider || 'google',
        geocoding_place_id: resultado.place_id || '',
        geocoding_confianca: resultado.confianca || 'media',
      })

      setMensagem('Local encontrado. Confira se é o ponto correto antes de salvar o roteiro.')
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao localizar endereço.')
    } finally {
      setBuscando(false)
    }
  }

  function limparCoordenadasAoEditar(campo: keyof LocalizacaoRoteiroValue, valor: string) {
    onChange({
      ...value,
      [campo]: valor,
      endereco_formatado: '',
      cidade: '',
      uf: '',
      latitude: null,
      longitude: null,
      geocoding_provider: '',
      geocoding_place_id: '',
      geocoding_confianca: '',
    })
  }

  return (
    <section className="geoBox">
      <style jsx>{`
        .geoBox {
          border-radius: 26px;
          padding: 18px;
          background: rgba(255, 253, 247, 0.78);
          border: 1px solid rgba(32, 60, 46, 0.1);
          box-shadow: 0 16px 38px rgba(32, 60, 46, 0.07);
        }

        .geoHeader {
          margin-bottom: 14px;
        }

        .geoEyebrow {
          color: #dc2626;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.13em;
        }

        .geoTitle {
          margin: 6px 0 0;
          color: #203c2e;
          font-size: 22px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.045em;
        }

        .geoText {
          margin: 7px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.45;
          font-weight: 700;
        }

        .fieldGrid {
          display: grid;
          gap: 12px;
        }

        .field {
          display: grid;
          gap: 7px;
        }

        .field label {
          color: #203c2e;
          font-size: 12px;
          font-weight: 950;
        }

        .field input {
          width: 100%;
          border: 1px solid rgba(32, 60, 46, 0.12);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.86);
          color: #172018;
          padding: 13px 14px;
          font: inherit;
          font-size: 14px;
          font-weight: 750;
          outline: none;
        }

        .field input:focus {
          border-color: rgba(32, 60, 46, 0.35);
          box-shadow: 0 0 0 4px rgba(32, 60, 46, 0.08);
        }

        .actionRow {
          margin-top: 14px;
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .geoBtn {
          border: 0;
          border-radius: 999px;
          background: #203c2e;
          color: #fffdf7;
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.18s ease;
        }

        .geoBtn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(32, 60, 46, 0.18);
        }

        .geoBtn:disabled {
          opacity: 0.58;
          cursor: not-allowed;
        }

        .geoHint {
          color: #64748b;
          font-size: 12px;
          font-weight: 750;
          line-height: 1.4;
        }

        .resultCard {
          margin-top: 14px;
          border-radius: 20px;
          padding: 14px;
          background: rgba(236, 253, 245, 0.82);
          border: 1px solid rgba(22, 163, 74, 0.18);
          color: #14532d;
        }

        .resultCard strong {
          display: block;
          font-size: 13px;
          font-weight: 950;
          margin-bottom: 5px;
        }

        .resultCard span {
          display: block;
          color: #166534;
          font-size: 13px;
          line-height: 1.45;
          font-weight: 760;
        }

        .coords {
          margin-top: 8px;
          color: #64748b !important;
          font-size: 11px !important;
          font-weight: 850 !important;
        }

        .erro {
          margin-top: 12px;
          border-radius: 16px;
          padding: 11px 12px;
          background: rgba(153, 27, 27, 0.08);
          border: 1px solid rgba(153, 27, 27, 0.16);
          color: #7f1d1d;
          font-size: 12px;
          font-weight: 850;
        }

        .ok {
          margin-top: 12px;
          border-radius: 16px;
          padding: 11px 12px;
          background: rgba(22, 163, 74, 0.08);
          border: 1px solid rgba(22, 163, 74, 0.16);
          color: #166534;
          font-size: 12px;
          font-weight: 850;
        }

        @media (max-width: 680px) {
          .geoBox {
            border-radius: 22px;
            padding: 15px;
          }

          .geoBtn {
            width: 100%;
          }
        }
      `}</style>

      <div className="geoHeader">
        <div className="geoEyebrow">Localização do roteiro</div>
        <h2 className="geoTitle">Onde começa a experiência?</h2>
        <p className="geoText">
          Informe o local de forma simples. O PrussikTrails localiza o endereço e salva as coordenadas para clima, mapa e segurança.
        </p>
      </div>

      <div className="fieldGrid">
        <label className="field">
          <span>Local principal do roteiro</span>
          <input
            value={value.endereco_local}
            onChange={(event) =>
              limparCoordenadasAoEditar('endereco_local', event.target.value)
            }
            placeholder="Ex.: Pedra do Lagarto, Serra do Itapety, Mogi das Cruzes/SP"
          />
        </label>

        <label className="field">
          <span>Ponto de encontro ou referência</span>
          <input
            value={value.ponto_referencia}
            onChange={(event) =>
              limparCoordenadasAoEditar('ponto_referencia', event.target.value)
            }
            placeholder="Ex.: estacionamento, portaria, restaurante próximo, entrada da trilha"
          />
        </label>
      </div>

      <div className="actionRow">
        <button
          type="button"
          className="geoBtn"
          onClick={localizarEndereco}
          disabled={buscando}
        >
          {buscando ? 'Localizando...' : 'Localizar endereço'}
        </button>

        <div className="geoHint">
          O guia não precisa digitar latitude e longitude.
        </div>
      </div>

      {temCoordenadas && (
        <div className="resultCard">
          <strong>Local encontrado</strong>
          <span>{value.endereco_formatado || value.endereco_local}</span>
          {(value.cidade || value.uf) && (
            <span>
              {value.cidade}
              {value.uf ? `/${value.uf}` : ''}
            </span>
          )}
          <span className="coords">
            Coordenadas salvas · {Number(value.latitude).toFixed(5)}, {Number(value.longitude).toFixed(5)}
            {value.geocoding_confianca ? ` · precisão ${value.geocoding_confianca}` : ''}
          </span>
        </div>
      )}

      {mensagem && <div className="ok">{mensagem}</div>}
      {erro && <div className="erro">{erro}</div>}
    </section>
  )
}