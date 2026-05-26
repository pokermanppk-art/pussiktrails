'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type GuiaCadastur = {
  id: string
  nome?: string | null
  name?: string | null
  full_name?: string | null
  email?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  cadastur?: string | null
  cadastur_numero?: string | null
  cadastur_numero_exibicao?: string | null
  cadastur_status?: string | null
  cadastur_status_exibicao?: string | null
  cadastur_verificado?: boolean | null
  guia_verificado_cadastur?: boolean | null
  cadastur_verificado_em?: string | null
  cadastur_validade?: string | null
  cadastur_data_validade?: string | null
  cadastur_validade_ate?: string | null
  cadastur_validade_exibicao?: string | null
  cadastur_observacao_admin?: string | null
  cadastur_ativo_desde?: string | null
  nome_exibicao?: string | null
  updated_at?: string | null
}

type Resumo = {
  total: number
  sem_cadastur: number
  informado: number
  verificado: number
  ativo: number
}

function formatarData(valor?: string | null) {
  if (!valor) return '—'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return '—'
  return data.toLocaleDateString('pt-BR')
}

function statusLabel(status?: string | null) {
  if (status === 'ativo') return 'Ativo'
  if (status === 'verificado') return 'Verificado'
  if (status === 'informado') return 'Informado'
  if (status === 'sem_cadastur') return 'Sem CADASTUR'
  return '—'
}

function avatarGuia(guia: GuiaCadastur) {
  return guia.avatar_url || guia.foto_url || guia.imagem_url || ''
}

export default function AdminCadasturPage() {
  const router = useRouter()

  const [guias, setGuias] = useState<GuiaCadastur[]>([])
  const [resumo, setResumo] = useState<Resumo>({
    total: 0,
    sem_cadastur: 0,
    informado: 0,
    verificado: 0,
    ativo: 0,
  })

  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('todos')
  const [carregando, setCarregando] = useState(true)
  const [salvandoId, setSalvandoId] = useState('')
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  const [guiaSelecionado, setGuiaSelecionado] = useState<GuiaCadastur | null>(null)
  const [validade, setValidade] = useState('')
  const [observacao, setObservacao] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => {
      void carregar()
    }, 250)

    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, status])

  async function carregar() {
    try {
      setCarregando(true)
      setErro('')

      const params = new URLSearchParams()
      params.set('busca', busca)
      params.set('status', status)

      const resposta = await fetch(`/api/admin/cadastur?${params.toString()}`)
      const json = await resposta.json().catch(() => null)

      if (!resposta.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível carregar guias.')
      }

      setGuias((json.guias || []) as GuiaCadastur[])
      setResumo(
        json.resumo || {
          total: 0,
          sem_cadastur: 0,
          informado: 0,
          verificado: 0,
          ativo: 0,
        }
      )
    } catch (error) {
      console.error('Erro ao carregar CADASTUR:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao carregar CADASTUR.')
    } finally {
      setCarregando(false)
    }
  }

  function abrirModal(guia: GuiaCadastur) {
    const validadeAtual =
      guia.cadastur_validade_exibicao ||
      guia.cadastur_validade ||
      guia.cadastur_data_validade ||
      guia.cadastur_validade_ate ||
      ''

    setGuiaSelecionado(guia)
    setValidade(validadeAtual ? String(validadeAtual).slice(0, 10) : '')
    setObservacao(guia.cadastur_observacao_admin || '')
    setErro('')
    setMensagem('')
  }

  function fecharModal() {
    if (salvandoId) return
    setGuiaSelecionado(null)
  }

  async function atualizarCadastur(guia: GuiaCadastur, acao: string, validadeManual?: string) {
    try {
      setSalvandoId(guia.id)
      setErro('')
      setMensagem('')

      const adminRaw = typeof window !== 'undefined' ? localStorage.getItem('user') : null
      const admin = adminRaw ? JSON.parse(adminRaw) : null

      const resposta = await fetch('/api/admin/cadastur', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guiaId: guia.id,
          adminId: admin?.id || admin?.user_id || '',
          acao,
          cadasturNumero: guia.cadastur_numero_exibicao || guia.cadastur_numero || guia.cadastur,
          cadasturValidade: validadeManual || validade,
          observacaoAdmin: observacao,
        }),
      })

      const json = await resposta.json().catch(() => null)

      if (!resposta.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível atualizar CADASTUR.')
      }

      setMensagem('CADASTUR atualizado com sucesso.')
      setGuiaSelecionado(null)
      await carregar()
    } catch (error) {
      console.error('Erro ao atualizar CADASTUR:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao atualizar CADASTUR.')
    } finally {
      setSalvandoId('')
      window.setTimeout(() => setMensagem(''), 2600)
    }
  }

  const cards = useMemo(() => {
    return [
      { label: 'Guias', value: resumo.total || 0 },
      { label: 'Informados', value: resumo.informado || 0 },
      { label: 'Verificados', value: resumo.verificado || 0 },
      { label: 'Ativos', value: resumo.ativo || 0 },
    ]
  }, [resumo])

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
          font-size: 34px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.05em;
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
          font-weight: 850;
          cursor: pointer;
          transition: 0.15s ease;
          white-space: nowrap;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.16);
        }

        .btn:disabled {
          opacity: 0.56;
          cursor: not-allowed;
        }

        .btn.light {
          background: #fff;
          color: #111827;
          border: 1px solid #e5e7eb;
        }

        .btn.green {
          background: #166534;
        }

        .btn.blue {
          background: #1d4ed8;
        }

        .btn.warn {
          background: #92400e;
        }

        .btn.danger {
          background: #991b1b;
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
        .modal {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
        }

        .summaryCard {
          padding: 16px;
        }

        .summaryValue {
          font-size: 26px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .summaryLabel {
          margin-top: 4px;
          color: #6b7280;
          font-size: 12px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .filters {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 210px 120px;
          gap: 10px;
          padding: 14px;
          margin-bottom: 16px;
        }

        .input,
        .select,
        .textarea {
          width: 100%;
          min-width: 0;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 11px 12px;
          color: #111827;
          background: #fff;
          font-weight: 750;
          outline: none;
        }

        .textarea {
          min-height: 96px;
          resize: vertical;
          line-height: 1.45;
        }

        .alert {
          margin-bottom: 14px;
          border-radius: 14px;
          padding: 12px;
          font-weight: 850;
          font-size: 13px;
        }

        .alert.ok {
          background: #ecfdf5;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .alert.err {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
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
          vertical-align: middle;
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

        .guiaCell {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 240px;
        }

        .avatar {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          background: #e5e7eb;
          color: #374151;
          display: grid;
          place-items: center;
          font-weight: 950;
          overflow: hidden;
          flex: 0 0 auto;
        }

        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .name {
          font-weight: 950;
          color: #111827;
          margin-bottom: 2px;
        }

        .muted {
          color: #6b7280;
          font-size: 12px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .pill {
          display: inline-flex;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
          background: #f3f4f6;
          color: #374151;
        }

        .pill.ativo {
          background: #dcfce7;
          color: #166534;
        }

        .pill.verificado {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .pill.informado {
          background: #fef3c7;
          color: #92400e;
        }

        .pill.sem_cadastur {
          background: #fee2e2;
          color: #991b1b;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          justify-content: flex-end;
        }

        .empty {
          padding: 42px 18px;
          text-align: center;
          color: #6b7280;
          font-weight: 850;
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 80;
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(8px);
          display: grid;
          place-items: center;
          padding: 16px;
        }

        .modal {
          width: min(620px, 100%);
          max-height: 90dvh;
          overflow: auto;
        }

        .modalHeader {
          padding: 18px;
          border-bottom: 1px solid #eef0f4;
        }

        .modalTitle {
          margin: 0;
          font-size: 22px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .modalSub {
          margin-top: 6px;
          color: #6b7280;
          font-size: 13px;
          line-height: 1.45;
          font-weight: 700;
        }

        .modalBody {
          padding: 18px;
          display: grid;
          gap: 12px;
        }

        .field {
          display: grid;
          gap: 7px;
        }

        .label {
          color: #374151;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .modalActions {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        @media (max-width: 980px) {
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
            min-width: 980px;
          }
        }

        @media (max-width: 640px) {
          .page {
            padding: 16px 12px;
          }

          .top {
            flex-direction: column;
          }

          .title {
            font-size: 27px;
          }

          .summary,
          .filters {
            grid-template-columns: 1fr;
          }

          .btn {
            width: 100%;
          }

          .actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .modalActions {
            display: grid;
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <main className="page">
        <section className="top">
          <div>
            <h1 className="title">CADASTUR dos guias</h1>
            <p className="subtitle">
              Confira números informados, marque guias como verificados e registre validade para liberar as medalhas CADASTUR no perfil público e privado do guia.
            </p>
          </div>

          <button
            type="button"
            className="btn"
            onClick={() => router.push('/admin/dashboard')}
          >
            Voltar ao Admin
          </button>
        </section>

        <section className="summary">
          {cards.map((card) => (
            <div className="summaryCard" key={card.label}>
              <div className="summaryValue">{card.value}</div>
              <div className="summaryLabel">{card.label}</div>
            </div>
          ))}
        </section>

        {mensagem && <div className="alert ok">{mensagem}</div>}
        {erro && <div className="alert err">{erro}</div>}

        <section className="filters">
          <input
            className="input"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar guia, e-mail, número CADASTUR ou ID..."
          />

          <select
            className="select"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="informado">Informado</option>
            <option value="verificado">Verificado</option>
            <option value="ativo">Ativo</option>
            <option value="sem_cadastur">Sem CADASTUR</option>
          </select>

          <button type="button" className="btn" onClick={() => void carregar()}>
            Atualizar
          </button>
        </section>

        <section className="tableWrap">
          {carregando ? (
            <div className="empty">Carregando guias...</div>
          ) : guias.length === 0 ? (
            <div className="empty">Nenhum guia encontrado.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Guia</th>
                  <th>CADASTUR</th>
                  <th>Status</th>
                  <th>Validade</th>
                  <th>Observação</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {guias.map((guia) => {
                  const avatar = avatarGuia(guia)
                  const statusAtual = guia.cadastur_status_exibicao || 'sem_cadastur'

                  return (
                    <tr key={guia.id}>
                      <td>
                        <div className="guiaCell">
                          <div className="avatar">
                            {avatar ? (
                              <img src={avatar} alt={guia.nome_exibicao || 'Guia'} />
                            ) : (
                              <span>{String(guia.nome_exibicao || 'G').slice(0, 1).toUpperCase()}</span>
                            )}
                          </div>

                          <div>
                            <div className="name">{guia.nome_exibicao || 'Guia'}</div>
                            <div className="muted">{guia.email || guia.id}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="name">
                          {guia.cadastur_numero_exibicao || 'Não informado'}
                        </div>
                        <div className="muted">{guia.id}</div>
                      </td>

                      <td>
                        <span className={`pill ${statusAtual}`}>
                          {statusLabel(statusAtual)}
                        </span>
                      </td>

                      <td>
                        <div className="name">
                          {formatarData(guia.cadastur_validade_exibicao)}
                        </div>
                        <div className="muted">
                          Verificado em {formatarData(guia.cadastur_verificado_em)}
                        </div>
                      </td>

                      <td>
                        <div className="muted">
                          {guia.cadastur_observacao_admin || '—'}
                        </div>
                      </td>

                      <td>
                        <div className="actions">
                          <button
                            type="button"
                            className="btn light"
                            onClick={() => router.push(`/guia/publico/${guia.id}`)}
                          >
                            Ver perfil
                          </button>

                          <button
                            type="button"
                            className="btn blue"
                            onClick={() => abrirModal(guia)}
                            disabled={!guia.cadastur_numero_exibicao && !guia.cadastur_numero && !guia.cadastur}
                          >
                            Conferir
                          </button>

                          <button
                            type="button"
                            className="btn warn"
                            onClick={() => atualizarCadastur(guia, 'pendente')}
                            disabled={salvandoId === guia.id || !guia.cadastur_numero_exibicao}
                          >
                            Pendente
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>

        {guiaSelecionado && (
          <div className="modalOverlay">
            <section className="modal">
              <div className="modalHeader">
                <h2 className="modalTitle">Conferir CADASTUR</h2>
                <div className="modalSub">
                  Guia: <strong>{guiaSelecionado.nome_exibicao || guiaSelecionado.email}</strong>
                  <br />
                  Número: <strong>{guiaSelecionado.cadastur_numero_exibicao || guiaSelecionado.cadastur_numero || guiaSelecionado.cadastur}</strong>
                </div>
              </div>

              <div className="modalBody">
                <div className="field">
                  <label className="label">Validade do CADASTUR</label>
                  <input
                    className="input"
                    type="date"
                    value={validade}
                    onChange={(event) => setValidade(event.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="label">Observação administrativa</label>
                  <textarea
                    className="textarea"
                    value={observacao}
                    onChange={(event) => setObservacao(event.target.value)}
                    placeholder="Ex.: Conferido no portal oficial em data..."
                  />
                </div>

                <div className="modalActions">
                  <button
                    type="button"
                    className="btn light"
                    onClick={fecharModal}
                    disabled={Boolean(salvandoId)}
                  >
                    Voltar
                  </button>

                  <button
                    type="button"
                    className="btn blue"
                    disabled={Boolean(salvandoId)}
                    onClick={() => atualizarCadastur(guiaSelecionado, 'verificar')}
                  >
                    Verificar sem validade
                  </button>

                  <button
                    type="button"
                    className="btn green"
                    disabled={Boolean(salvandoId) || !validade}
                    onClick={() => atualizarCadastur(guiaSelecionado, 'validade')}
                  >
                    Verificar e ativar
                  </button>

                  <button
                    type="button"
                    className="btn danger"
                    disabled={Boolean(salvandoId)}
                    onClick={() => atualizarCadastur(guiaSelecionado, 'limpar')}
                  >
                    Limpar CADASTUR
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </>
  )
}
