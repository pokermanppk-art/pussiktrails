'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Chamado = {
  id: string
  usuario_id?: string | null
  tipo_usuario?: string | null
  tipo_chamado?: string | null
  assunto?: string | null
  descricao?: string | null
  pagina_origem?: string | null
  navegador?: string | null
  dispositivo?: string | null
  user_agent?: string | null
  prioridade?: string | null
  status?: string | null
  resposta_admin?: string | null
  respondido_em?: string | null
  created_at?: string | null
  updated_at?: string | null
  usuario_nome?: string | null
  usuario_email?: string | null
  usuario_avatar?: string | null
}

type Resumo = {
  total: number
  porStatus: Record<string, number>
  porTipo: Record<string, number>
  porPrioridade: Record<string, number>
}

function labelTipo(tipo?: string | null) {
  if (tipo === 'bug') return 'Bug'
  if (tipo === 'sugestao') return 'Sugestão'
  return 'Suporte'
}

function labelStatus(status?: string | null) {
  if (status === 'novo') return 'Novo'
  if (status === 'em_analise') return 'Em análise'
  if (status === 'respondido') return 'Respondido'
  if (status === 'resolvido') return 'Resolvido'
  if (status === 'arquivado') return 'Arquivado'
  return 'Novo'
}

function labelPrioridade(prioridade?: string | null) {
  if (prioridade === 'baixa') return 'Baixa'
  if (prioridade === 'alta') return 'Alta'
  if (prioridade === 'urgente') return 'Urgente'
  return 'Normal'
}

function dataBR(valor?: string | null) {
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

export default function AdminSuportePage() {
  const router = useRouter()

  const [chamados, setChamados] = useState<Chamado[]>([])
  const [resumo, setResumo] = useState<Resumo>({
    total: 0,
    porStatus: {},
    porTipo: {},
    porPrioridade: {},
  })
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('todos')
  const [tipo, setTipo] = useState('todos')
  const [prioridade, setPrioridade] = useState('todas')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [selecionado, setSelecionado] = useState<Chamado | null>(null)
  const [resposta, setResposta] = useState('')
  const [novoStatus, setNovoStatus] = useState('em_analise')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void carregar()
    }, 250)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, status, tipo, prioridade])

  async function carregar() {
    try {
      setCarregando(true)
      setErro('')

      const params = new URLSearchParams()
      params.set('busca', busca)
      params.set('status', status)
      params.set('tipo', tipo)
      params.set('prioridade', prioridade)

      const response = await fetch(`/api/suporte/chamados?${params.toString()}`)
      const json = await response.json().catch(() => null)

      if (!response.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível carregar chamados.')
      }

      setChamados(json.chamados || [])
      setResumo(json.resumo || { total: 0, porStatus: {}, porTipo: {}, porPrioridade: {} })
    } catch (error) {
      console.error('Erro ao carregar suporte:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao carregar suporte.')
    } finally {
      setCarregando(false)
    }
  }

  function abrirChamado(chamado: Chamado) {
    setSelecionado(chamado)
    setResposta(chamado.resposta_admin || '')
    setNovoStatus(chamado.status || 'em_analise')
    setMensagem('')
    setErro('')
  }

  async function atualizarChamado() {
    if (!selecionado?.id) return

    try {
      setSalvando(true)
      setErro('')
      setMensagem('')

      const response = await fetch('/api/suporte/chamados', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chamadoId: selecionado.id,
          status: novoStatus,
          respostaAdmin: resposta,
        }),
      })

      const json = await response.json().catch(() => null)

      if (!response.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível atualizar chamado.')
      }

      setMensagem('Chamado atualizado com sucesso.')
      setSelecionado(null)
      await carregar()
    } catch (error) {
      console.error('Erro ao atualizar chamado:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao atualizar chamado.')
    } finally {
      setSalvando(false)
    }
  }

  const cards = useMemo(
    () => [
      { label: 'Total', valor: resumo.total || 0 },
      { label: 'Novos', valor: resumo.porStatus?.novo || 0 },
      { label: 'Bugs', valor: resumo.porTipo?.bug || 0 },
      { label: 'Urgentes', valor: resumo.porPrioridade?.urgente || 0 },
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

        .btn.light {
          background: #fff;
          color: #111827;
          border: 1px solid #d1d5db;
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
          font-weight: 900;
          letter-spacing: -0.035em;
        }

        .summaryLabel {
          margin-top: 4px;
          color: #6b7280;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .filters {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 170px 170px 170px 120px;
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
          font-weight: 700;
          outline: none;
        }

        .textarea {
          min-height: 120px;
          resize: vertical;
          line-height: 1.5;
        }

        .alert {
          margin-bottom: 14px;
          border-radius: 14px;
          padding: 12px;
          font-weight: 800;
        }

        .alert.err {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .alert.ok {
          background: #ecfdf5;
          color: #166534;
          border: 1px solid #bbf7d0;
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
          border-radius: 999px;
          padding: 6px 9px;
          background: #f3f4f6;
          color: #374151;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .pill.bug {
          background: #fee2e2;
          color: #991b1b;
        }

        .pill.suporte {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .pill.sugestao {
          background: #ecfdf5;
          color: #166534;
        }

        .pill.urgente,
        .pill.alta {
          background: #fef3c7;
          color: #92400e;
        }

        .empty {
          padding: 40px 18px;
          text-align: center;
          color: #6b7280;
          font-weight: 800;
        }

        .rowButton {
          border: 0;
          border-radius: 10px;
          padding: 8px 10px;
          background: #111827;
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: grid;
          place-items: center;
          padding: 18px;
          background: rgba(15, 23, 42, 0.56);
          backdrop-filter: blur(8px);
        }

        .modal {
          width: min(760px, 100%);
          max-height: min(820px, 92dvh);
          overflow: auto;
          padding: 18px;
        }

        .modalTitle {
          margin: 0;
          font-size: 24px;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .modalSub {
          margin: 6px 0 16px;
          color: #6b7280;
          font-size: 13px;
          line-height: 1.45;
        }

        .box {
          border-radius: 16px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          padding: 12px;
          color: #374151;
          font-size: 13px;
          line-height: 1.5;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          margin-bottom: 12px;
        }

        .field {
          margin-top: 12px;
        }

        .label {
          display: block;
          margin-bottom: 6px;
          color: #374151;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .modalActions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 16px;
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
            min-width: 1080px;
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
          .filters {
            grid-template-columns: 1fr;
          }

          .btn {
            width: 100%;
          }

          .modalOverlay {
            align-items: end;
            padding: 10px;
          }
        }
      `}</style>

      <main className="page">
        <section className="top">
          <div>
            <h1 className="title">Suporte e bugs</h1>
            <p className="subtitle">
              Central administrativa para acompanhar mensagens de suporte, bugs reportados e sugestões enviadas por clientes e guias.
            </p>
          </div>

          <button className="btn" type="button" onClick={() => router.push('/admin/dashboard')}>
            Voltar ao Admin
          </button>
        </section>

        <section className="summary">
          {cards.map((card) => (
            <div className="summaryCard" key={card.label}>
              <div className="summaryValue">{card.valor}</div>
              <div className="summaryLabel">{card.label}</div>
            </div>
          ))}
        </section>

        {erro && <div className="alert err">{erro}</div>}
        {mensagem && <div className="alert ok">{mensagem}</div>}

        <section className="filters">
          <input
            className="input"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por usuário, assunto, descrição ou página..."
          />

          <select className="select" value={tipo} onChange={(event) => setTipo(event.target.value)}>
            <option value="todos">Todos tipos</option>
            <option value="bug">Bug</option>
            <option value="suporte">Suporte</option>
            <option value="sugestao">Sugestão</option>
          </select>

          <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="todos">Todos status</option>
            <option value="novo">Novo</option>
            <option value="em_analise">Em análise</option>
            <option value="respondido">Respondido</option>
            <option value="resolvido">Resolvido</option>
            <option value="arquivado">Arquivado</option>
          </select>

          <select className="select" value={prioridade} onChange={(event) => setPrioridade(event.target.value)}>
            <option value="todas">Todas prioridades</option>
            <option value="baixa">Baixa</option>
            <option value="normal">Normal</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>

          <button className="btn" type="button" onClick={() => void carregar()}>
            Atualizar
          </button>
        </section>

        <section className="tableWrap">
          {carregando ? (
            <div className="empty">Carregando chamados...</div>
          ) : chamados.length === 0 ? (
            <div className="empty">Nenhum chamado encontrado.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Usuário</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Prioridade</th>
                  <th>Assunto</th>
                  <th>Página</th>
                  <th>Ação</th>
                </tr>
              </thead>

              <tbody>
                {chamados.map((chamado) => (
                  <tr key={chamado.id}>
                    <td>
                      <strong>{dataBR(chamado.created_at)}</strong>
                      <div className="muted">{chamado.id}</div>
                    </td>
                    <td>
                      <strong>{chamado.usuario_nome || 'Usuário'}</strong>
                      <div className="muted">{chamado.usuario_email || chamado.usuario_id || '—'}</div>
                      <div className="muted">{chamado.tipo_usuario || 'cliente'}</div>
                    </td>
                    <td>
                      <span className={`pill ${chamado.tipo_chamado || 'suporte'}`}>
                        {labelTipo(chamado.tipo_chamado)}
                      </span>
                    </td>
                    <td>
                      <span className="pill">{labelStatus(chamado.status)}</span>
                    </td>
                    <td>
                      <span className={`pill ${chamado.prioridade || 'normal'}`}>
                        {labelPrioridade(chamado.prioridade)}
                      </span>
                    </td>
                    <td>
                      <strong>{chamado.assunto || 'Sem assunto'}</strong>
                      <div className="muted">{chamado.descricao || '—'}</div>
                    </td>
                    <td>
                      <div className="muted">{chamado.pagina_origem || '—'}</div>
                    </td>
                    <td>
                      <button className="rowButton" type="button" onClick={() => abrirChamado(chamado)}>
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {selecionado && (
          <div className="modalOverlay">
            <section className="modal">
              <h2 className="modalTitle">Chamado de suporte</h2>
              <div className="modalSub">
                {selecionado.usuario_nome || 'Usuário'} · {labelTipo(selecionado.tipo_chamado)} · {dataBR(selecionado.created_at)}
              </div>

              <div className="box">
                <strong>{selecionado.assunto}</strong>
                {'\n\n'}
                {selecionado.descricao}
                {'\n\n'}
                Página: {selecionado.pagina_origem || '—'}
              </div>

              <div className="field">
                <label className="label">Status</label>
                <select className="select" value={novoStatus} onChange={(event) => setNovoStatus(event.target.value)}>
                  <option value="novo">Novo</option>
                  <option value="em_analise">Em análise</option>
                  <option value="respondido">Respondido</option>
                  <option value="resolvido">Resolvido</option>
                  <option value="arquivado">Arquivado</option>
                </select>
              </div>

              <div className="field">
                <label className="label">Resposta administrativa</label>
                <textarea
                  className="textarea"
                  value={resposta}
                  onChange={(event) => setResposta(event.target.value)}
                  placeholder="Escreva uma resposta ou observação interna sobre o chamado."
                />
              </div>

              <div className="modalActions">
                <button className="btn light" type="button" onClick={() => setSelecionado(null)} disabled={salvando}>
                  Fechar
                </button>
                <button className="btn" type="button" onClick={atualizarChamado} disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </>
  )
}
