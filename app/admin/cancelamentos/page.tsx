'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Cancelamento = {
  id: string
  reserva_id?: string | null
  cliente_id?: string | null
  roteiro_id?: string | null
  guia_id?: string | null
  cancelado_por_tipo?: string | null
  cancelado_por_id?: string | null
  motivo_codigo?: string | null
  motivo_descricao?: string | null
  valor_original?: number | string | null
  valor_creditado?: number | string | null
  valor_retido_plataforma?: number | string | null
  valor_retido_guia?: number | string | null
  percentual_credito?: number | string | null
  percentual_retencao_plataforma?: number | string | null
  status?: string | null
  saldo_movimentacao_id?: string | null
  observacao_admin?: string | null
  observacao_guia?: string | null
  observacao_cliente?: string | null
  created_at?: string | null
  updated_at?: string | null

  cliente_nome?: string | null
  cliente_email?: string | null
  guia_nome?: string | null
  guia_email?: string | null
  roteiro_titulo?: string | null
}

type ResumoCancelamentos = {
  total: number
  totalOriginal: number
  totalCreditado: number
  totalRetidoPlataforma: number
  porTipo: Record<string, number>
  porStatus: Record<string, number>
}

function numero(valor: unknown): number {
  const n = Number(valor || 0)
  return Number.isFinite(n) ? n : 0
}

function moeda(valor: unknown): string {
  return numero(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function dataBR(valor?: string | null): string {
  if (!valor) return '—'

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) return '—'

  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function labelTipo(tipo?: string | null): string {
  if (tipo === 'guia') return 'Guia'
  if (tipo === 'cliente') return 'Cliente'
  if (tipo === 'admin') return 'Admin'
  if (tipo === 'sistema') return 'Sistema'

  return '—'
}

function labelStatus(status?: string | null): string {
  if (status === 'processado') return 'Processado'
  if (status === 'pendente') return 'Pendente'
  if (status === 'em_analise') return 'Em análise'
  if (status === 'estornado') return 'Estornado'
  if (status === 'cancelado') return 'Cancelado'

  return status || '—'
}

export default function AdminCancelamentosPage() {
  const router = useRouter()

  const [cancelamentos, setCancelamentos] = useState<Cancelamento[]>([])
  const [resumo, setResumo] = useState<ResumoCancelamentos>({
    total: 0,
    totalOriginal: 0,
    totalCreditado: 0,
    totalRetidoPlataforma: 0,
    porTipo: {},
    porStatus: {},
  })

  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('todos')
  const [status, setStatus] = useState('todos')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void carregar()
    }, 250)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, tipo, status])

  async function carregar() {
    try {
      setCarregando(true)
      setErro('')

      const params = new URLSearchParams()
      params.set('busca', busca)
      params.set('tipo', tipo)
      params.set('status', status)

      const resposta = await fetch(`/api/admin/cancelamentos?${params.toString()}`)
      const json = await resposta.json().catch(() => null)

      if (!resposta.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível carregar cancelamentos.')
      }

      setCancelamentos((json.cancelamentos || []) as Cancelamento[])

      setResumo({
        total: Number(json.resumo?.total || 0),
        totalOriginal: Number(json.resumo?.totalOriginal || 0),
        totalCreditado: Number(json.resumo?.totalCreditado || 0),
        totalRetidoPlataforma: Number(json.resumo?.totalRetidoPlataforma || 0),
        porTipo: json.resumo?.porTipo || {},
        porStatus: json.resumo?.porStatus || {},
      })
    } catch (error) {
      console.error('Erro ao carregar cancelamentos:', error)
      setErro(
        error instanceof Error
          ? error.message
          : 'Erro ao carregar cancelamentos.'
      )
    } finally {
      setCarregando(false)
    }
  }

  const cardsResumo = useMemo(
    () => [
      {
        label: 'Cancelamentos',
        value: String(resumo.total || 0),
      },
      {
        label: 'Valor original',
        value: moeda(resumo.totalOriginal),
      },
      {
        label: 'Creditado aos clientes',
        value: moeda(resumo.totalCreditado),
      },
      {
        label: 'Retido plataforma',
        value: moeda(resumo.totalRetidoPlataforma),
      },
    ],
    [resumo]
  )

  return (
    <>
      <style jsx>{`
        .page {
          min-height: 100dvh;
          background: #f6f7fb;
          color: #111827;
          padding: 26px;
        }

        .top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 20px;
        }

        .title {
          margin: 0;
          font-size: 32px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .subtitle {
          margin: 8px 0 0;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.5;
          max-width: 820px;
        }

        .btn {
          border: 0;
          border-radius: 12px;
          padding: 11px 14px;
          background: #111827;
          color: #fff;
          font-weight: 800;
          cursor: pointer;
          transition: 0.15s ease;
          white-space: nowrap;
        }

        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.16);
        }

        .summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .summaryCard,
        .filters,
        .tableWrap,
        .miniPanel {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
        }

        .summaryCard {
          padding: 16px;
          min-width: 0;
        }

        .summaryValue {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: -0.035em;
          overflow-wrap: anywhere;
        }

        .summaryLabel {
          margin-top: 4px;
          color: #6b7280;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .miniPanels {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .miniPanel {
          padding: 14px;
        }

        .miniPanelTitle {
          margin: 0 0 10px;
          font-size: 13px;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 900;
        }

        .miniList {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .miniTag {
          border-radius: 999px;
          padding: 7px 10px;
          background: #f3f4f6;
          color: #374151;
          font-size: 12px;
          font-weight: 800;
        }

        .filters {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 180px 180px 120px;
          gap: 10px;
          padding: 14px;
          margin-bottom: 16px;
        }

        .input,
        .select {
          width: 100%;
          min-width: 0;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 11px 12px;
          color: #111827;
          background: #fff;
          font-weight: 700;
          outline: none;
        }

        .alert {
          margin-bottom: 14px;
          border-radius: 14px;
          padding: 12px;
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
          font-weight: 800;
        }

        .tableWrap {
          overflow: hidden;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th,
        td {
          padding: 13px 14px;
          border-bottom: 1px solid #eef0f4;
          text-align: left;
          vertical-align: top;
          font-size: 13px;
        }

        th {
          background: #f9fafb;
          color: #4b5563;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 900;
        }

        td strong {
          display: block;
          color: #111827;
          font-weight: 900;
          margin-bottom: 3px;
        }

        .muted {
          color: #6b7280;
          font-size: 12px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 6px 9px;
          background: #eef2ff;
          color: #3730a3;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .pill.guia {
          background: #ecfdf5;
          color: #166534;
        }

        .pill.cliente {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .pill.admin {
          background: #fef3c7;
          color: #92400e;
        }

        .pill.sistema {
          background: #f3f4f6;
          color: #374151;
        }

        .statusPill {
          display: inline-flex;
          border-radius: 999px;
          padding: 6px 9px;
          background: #f3f4f6;
          color: #374151;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .statusPill.processado {
          background: #ecfdf5;
          color: #166534;
        }

        .statusPill.pendente,
        .statusPill.em_analise {
          background: #fef3c7;
          color: #92400e;
        }

        .statusPill.estornado,
        .statusPill.cancelado {
          background: #fee2e2;
          color: #991b1b;
        }

        .empty {
          padding: 40px 18px;
          text-align: center;
          color: #6b7280;
          font-weight: 800;
        }

        @media (max-width: 1100px) {
          .summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .filters {
            grid-template-columns: 1fr 1fr;
          }

          .filters input {
            grid-column: 1 / -1;
          }

          .tableWrap {
            overflow-x: auto;
          }

          table {
            min-width: 1100px;
          }
        }

        @media (max-width: 720px) {
          .page {
            padding: 16px 12px;
          }

          .top {
            flex-direction: column;
          }

          .title {
            font-size: 26px;
          }

          .summary,
          .miniPanels {
            grid-template-columns: 1fr;
          }

          .filters {
            grid-template-columns: 1fr;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>

      <main className="page">
        <section className="top">
          <div>
            <h1 className="title">Cancelamentos e saldos</h1>
            <p className="subtitle">
              Auditoria administrativa dos cancelamentos, créditos gerados em
              Saldo de Jornada, valores retidos e motivos registrados por
              cliente, guia, admin ou sistema.
            </p>
          </div>

          <button
            className="btn"
            type="button"
            onClick={() => router.push('/admin/dashboard')}
          >
            Voltar ao Admin
          </button>
        </section>

        <section className="summary">
          {cardsResumo.map((card) => (
            <div className="summaryCard" key={card.label}>
              <div className="summaryValue">{card.value}</div>
              <div className="summaryLabel">{card.label}</div>
            </div>
          ))}
        </section>

        <section className="miniPanels">
          <div className="miniPanel">
            <h2 className="miniPanelTitle">Por tipo</h2>
            <div className="miniList">
              <span className="miniTag">Guia: {resumo.porTipo?.guia || 0}</span>
              <span className="miniTag">
                Cliente: {resumo.porTipo?.cliente || 0}
              </span>
              <span className="miniTag">Admin: {resumo.porTipo?.admin || 0}</span>
              <span className="miniTag">
                Sistema: {resumo.porTipo?.sistema || 0}
              </span>
            </div>
          </div>

          <div className="miniPanel">
            <h2 className="miniPanelTitle">Por status</h2>
            <div className="miniList">
              <span className="miniTag">
                Processado: {resumo.porStatus?.processado || 0}
              </span>
              <span className="miniTag">
                Pendente: {resumo.porStatus?.pendente || 0}
              </span>
              <span className="miniTag">
                Em análise: {resumo.porStatus?.em_analise || 0}
              </span>
              <span className="miniTag">
                Estornado: {resumo.porStatus?.estornado || 0}
              </span>
            </div>
          </div>
        </section>

        {erro && <div className="alert">{erro}</div>}

        <section className="filters">
          <input
            className="input"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar cliente, guia, roteiro, motivo ou ID..."
          />

          <select
            className="select"
            value={tipo}
            onChange={(event) => setTipo(event.target.value)}
          >
            <option value="todos">Todos os tipos</option>
            <option value="guia">Cancelado pelo guia</option>
            <option value="cliente">Cancelado pelo cliente</option>
            <option value="admin">Cancelado pelo admin</option>
            <option value="sistema">Cancelado pelo sistema</option>
          </select>

          <select
            className="select"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="todos">Todos status</option>
            <option value="processado">Processado</option>
            <option value="pendente">Pendente</option>
            <option value="em_analise">Em análise</option>
            <option value="estornado">Estornado</option>
            <option value="cancelado">Cancelado</option>
          </select>

          <button className="btn" type="button" onClick={() => void carregar()}>
            Atualizar
          </button>
        </section>

        <section className="tableWrap">
          {carregando ? (
            <div className="empty">Carregando cancelamentos...</div>
          ) : cancelamentos.length === 0 ? (
            <div className="empty">Nenhum cancelamento encontrado.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Roteiro</th>
                  <th>Cliente</th>
                  <th>Guia</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Motivo</th>
                  <th>Valor</th>
                  <th>Crédito</th>
                  <th>Retenção</th>
                </tr>
              </thead>

              <tbody>
                {cancelamentos.map((item: Cancelamento) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{dataBR(item.created_at)}</strong>
                      <div className="muted">
                        Reserva: {item.reserva_id || '—'}
                      </div>
                    </td>

                    <td>
                      <strong>{item.roteiro_titulo || 'Roteiro'}</strong>
                      <div className="muted">{item.roteiro_id || '—'}</div>
                    </td>

                    <td>
                      <strong>{item.cliente_nome || 'Cliente'}</strong>
                      <div className="muted">
                        {item.cliente_email || item.cliente_id || '—'}
                      </div>
                    </td>

                    <td>
                      <strong>{item.guia_nome || 'Guia'}</strong>
                      <div className="muted">
                        {item.guia_email || item.guia_id || '—'}
                      </div>
                    </td>

                    <td>
                      <span className={`pill ${item.cancelado_por_tipo || ''}`}>
                        {labelTipo(item.cancelado_por_tipo)}
                      </span>
                    </td>

                    <td>
                      <span className={`statusPill ${item.status || ''}`}>
                        {labelStatus(item.status)}
                      </span>
                    </td>

                    <td>
                      <strong>{item.motivo_codigo || '—'}</strong>
                      <div className="muted">
                        {item.motivo_descricao || 'Sem descrição.'}
                      </div>

                      {item.observacao_guia ||
                      item.observacao_cliente ||
                      item.observacao_admin ? (
                        <div className="muted">
                          Obs.:{' '}
                          {item.observacao_guia ||
                            item.observacao_cliente ||
                            item.observacao_admin}
                        </div>
                      ) : null}
                    </td>

                    <td>
                      <strong>{moeda(item.valor_original)}</strong>
                    </td>

                    <td>
                      <strong>{moeda(item.valor_creditado)}</strong>
                      <div className="muted">
                        {numero(item.percentual_credito)}%
                      </div>
                    </td>

                    <td>
                      <strong>{moeda(item.valor_retido_plataforma)}</strong>
                      <div className="muted">
                        {numero(item.percentual_retencao_plataforma)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </>
  )
}