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
  respondido_por_id?: string | null
  respondido_em?: string | null
  finalizado_pelo_usuario?: boolean | null
  finalizado_por_id?: string | null
  finalizado_por_tipo?: string | null
  finalizado_em?: string | null
  avaliacao_resposta_nota?: number | null
  avaliacao_resposta_comentario?: string | null
  avaliacao_resposta_em?: string | null
  created_at?: string | null
  updated_at?: string | null
  usuario_nome?: string | null
  usuario_email?: string | null
  usuario_avatar?: string | null
}

type Resumo = {
  total: number
  novos: number
  emAnalise: number
  respondidos: number
  resolvidos: number
  arquivados: number
  urgentes: number
  bugs: number
  aguardandoAvaliacao: number
  avaliados: number
  mediaAvaliacao: number
  porStatus: Record<string, number>
  porTipo: Record<string, number>
  porPrioridade: Record<string, number>
}

const resumoInicial: Resumo = {
  total: 0,
  novos: 0,
  emAnalise: 0,
  respondidos: 0,
  resolvidos: 0,
  arquivados: 0,
  urgentes: 0,
  bugs: 0,
  aguardandoAvaliacao: 0,
  avaliados: 0,
  mediaAvaliacao: 0,
  porStatus: {},
  porTipo: {},
  porPrioridade: {},
}

function normalizar(valor?: string | null) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function labelTipo(tipo?: string | null) {
  if (normalizar(tipo) === 'bug') return 'Bug'
  if (normalizar(tipo) === 'sugestao') return 'Sugestão'
  return 'Suporte'
}

function labelStatus(status?: string | null) {
  const statusNormalizado = normalizar(status)

  if (statusNormalizado === 'novo') return 'Novo'
  if (statusNormalizado === 'em_analise') return 'Em análise'
  if (statusNormalizado === 'respondido') return 'Respondido ao usuário'
  if (statusNormalizado === 'resolvido') return 'Resolvido'
  if (statusNormalizado === 'arquivado') return 'Arquivado'

  return 'Novo'
}

function labelPrioridade(prioridade?: string | null) {
  const prioridadeNormalizada = normalizar(prioridade)

  if (prioridadeNormalizada === 'baixa') return 'Baixa'
  if (prioridadeNormalizada === 'alta') return 'Alta'
  if (prioridadeNormalizada === 'urgente') return 'Urgente'

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

function notaChamado(chamado?: Chamado | null) {
  const nota = Number(chamado?.avaliacao_resposta_nota || 0)

  if (!Number.isFinite(nota) || nota < 1 || nota > 5) return 0

  return nota
}

function aguardandoUsuario(chamado: Chamado) {
  return (
    normalizar(chamado.status) === 'respondido' &&
    Boolean(chamado.resposta_admin) &&
    notaChamado(chamado) === 0
  )
}

function classStatus(status?: string | null) {
  const statusNormalizado = normalizar(status)

  if (statusNormalizado === 'novo') return 'novo'
  if (statusNormalizado === 'em_analise') return 'analise'
  if (statusNormalizado === 'respondido') return 'respondido'
  if (statusNormalizado === 'resolvido') return 'resolvido'
  if (statusNormalizado === 'arquivado') return 'arquivado'

  return 'novo'
}

function resumoDaResposta(chamado: Chamado) {
  if (notaChamado(chamado) > 0) {
    return `Avaliado pelo usuário com nota ${notaChamado(chamado)}/5`
  }

  if (aguardandoUsuario(chamado)) {
    return 'Resposta enviada. Aguardando o usuário concluir e avaliar.'
  }

  if (normalizar(chamado.status) === 'em_analise') {
    return 'Em análise pelo Admin.'
  }

  if (normalizar(chamado.status) === 'novo') {
    return 'Ainda precisa de primeira resposta.'
  }

  return labelStatus(chamado.status)
}

export default function AdminSuportePage() {
  const router = useRouter()

  const [chamados, setChamados] = useState<Chamado[]>([])
  const [resumo, setResumo] = useState<Resumo>(resumoInicial)

  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('todos')
  const [tipo, setTipo] = useState('todos')
  const [tipoUsuario, setTipoUsuario] = useState('todos')
  const [prioridade, setPrioridade] = useState('todas')

  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  const [selecionado, setSelecionado] = useState<Chamado | null>(null)
  const [resposta, setResposta] = useState('')
  const [novoStatus, setNovoStatus] = useState('em_analise')
  const [novaPrioridade, setNovaPrioridade] = useState('normal')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void carregar()
    }, 250)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, status, tipo, tipoUsuario, prioridade])

  async function carregar() {
    try {
      setCarregando(true)
      setErro('')

      const params = new URLSearchParams()
      params.set('busca', busca)
      params.set('status', status)
      params.set('tipo', tipo)
      params.set('tipoUsuario', tipoUsuario)
      params.set('prioridade', prioridade)
      params.set('limite', '400')

      const response = await fetch(`/api/suporte/chamados?${params.toString()}`)
      const json = await response.json().catch(() => null)

      if (!response.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível carregar chamados.')
      }

      setChamados(json.chamados || [])

      setResumo({
        ...resumoInicial,
        ...(json.resumo || {}),
        porStatus: json.resumo?.porStatus || {},
        porTipo: json.resumo?.porTipo || {},
        porPrioridade: json.resumo?.porPrioridade || {},
      })
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
    setNovaPrioridade(chamado.prioridade || 'normal')
    setMensagem('')
    setErro('')
  }

  async function atualizarChamado(statusForcado?: string) {
    if (!selecionado?.id) return

    try {
      setSalvando(true)
      setErro('')
      setMensagem('')

      const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null
      const admin = userData ? JSON.parse(userData) : null

      const response = await fetch('/api/suporte/chamados', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chamadoId: selecionado.id,
          status: statusForcado || novoStatus,
          prioridade: novaPrioridade,
          respostaAdmin: resposta,
          adminId: admin?.id || null,
        }),
      })

      const json = await response.json().catch(() => null)

      if (!response.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível atualizar chamado.')
      }

      setMensagem(
        resposta.trim()
          ? 'Resposta salva e enviada para o perfil do usuário.'
          : 'Chamado atualizado com sucesso.'
      )
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
      {
        label: 'Novos',
        valor: resumo.novos || 0,
        texto: 'precisam da primeira resposta',
        classe: 'orange',
      },
      {
        label: 'Em análise',
        valor: resumo.emAnalise || 0,
        texto: 'em tratamento administrativo',
        classe: 'blue',
      },
      {
        label: 'Aguardando usuário',
        valor: resumo.aguardandoAvaliacao || 0,
        texto: 'resposta enviada, falta concluir/avaliar',
        classe: 'green',
      },
      {
        label: 'Resolvidos',
        valor: resumo.resolvidos || 0,
        texto: `${resumo.avaliados || 0} com avaliação registrada`,
        classe: 'dark',
      },
      {
        label: 'Nota média',
        valor: resumo.mediaAvaliacao > 0 ? `${Number(resumo.mediaAvaliacao).toFixed(1)}/5` : '—',
        texto: 'avaliação da resposta do Admin',
        classe: 'gold',
      },
    ],
    [resumo]
  )

  return (
    <>
      <style jsx>{`
        .page {
          min-height: 100dvh;
          background:
            radial-gradient(circle at 0% 0%, rgba(34, 197, 94, 0.10), transparent 30%),
            radial-gradient(circle at 100% 0%, rgba(59, 130, 246, 0.10), transparent 30%),
            linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
          color: #0f172a;
          padding: 24px;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .top {
          max-width: 1240px;
          margin: 0 auto 18px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .kicker {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          padding: 8px 12px;
          background: #ecfdf5;
          color: #166534;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .title {
          margin: 0;
          font-size: clamp(34px, 4.8vw, 58px);
          line-height: 0.92;
          font-weight: 950;
          letter-spacing: -0.07em;
        }

        .subtitle {
          margin: 12px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.55;
          max-width: 820px;
          font-weight: 700;
        }

        .btn {
          border: 0;
          border-radius: 999px;
          padding: 12px 15px;
          background: #0f172a;
          color: #fff;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.16s ease;
          white-space: nowrap;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.16);
        }

        .btn.light {
          background: #fff;
          color: #0f172a;
          border: 1px solid rgba(15, 23, 42, 0.10);
        }

        .btn.green {
          background: #16a34a;
          color: #ffffff;
        }

        .btn:disabled {
          opacity: 0.58;
          cursor: not-allowed;
        }

        .content {
          max-width: 1240px;
          margin: 0 auto;
        }

        .summary {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .summaryCard,
        .filters,
        .tableWrap,
        .modal {
          background: rgba(255,255,255,0.94);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 24px;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
        }

        .summaryCard {
          padding: 16px;
          min-height: 128px;
          position: relative;
          overflow: hidden;
        }

        .summaryCard::after {
          content: "";
          position: absolute;
          width: 82px;
          height: 82px;
          right: -28px;
          top: -28px;
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.12);
        }

        .summaryCard.orange::after { background: rgba(249, 115, 22, 0.16); }
        .summaryCard.blue::after { background: rgba(37, 99, 235, 0.14); }
        .summaryCard.green::after { background: rgba(22, 163, 74, 0.14); }
        .summaryCard.dark::after { background: rgba(15, 23, 42, 0.12); }
        .summaryCard.gold::after { background: rgba(212, 179, 90, 0.18); }

        .summaryValue {
          font-size: 31px;
          font-weight: 950;
          letter-spacing: -0.055em;
          line-height: 1;
        }

        .summaryLabel {
          margin-top: 8px;
          color: #0f172a;
          font-size: 12px;
          font-weight: 950;
        }

        .summaryText {
          margin-top: 5px;
          color: #64748b;
          font-size: 11px;
          line-height: 1.35;
          font-weight: 750;
        }

        .filters {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 150px 150px 150px 150px 112px;
          gap: 10px;
          padding: 14px;
          margin-bottom: 16px;
        }

        .input,
        .select,
        .textarea {
          width: 100%;
          min-width: 0;
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 16px;
          padding: 12px 13px;
          color: #0f172a;
          background: #ffffff;
          font-size: 13px;
          font-weight: 800;
          outline: none;
        }

        .input:focus,
        .select:focus,
        .textarea:focus {
          border-color: #22c55e;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.10);
        }

        .textarea {
          min-height: 132px;
          resize: vertical;
          line-height: 1.5;
        }

        .alert {
          margin-bottom: 14px;
          border-radius: 18px;
          padding: 12px 14px;
          font-weight: 850;
          font-size: 13px;
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
          color: #475569;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 950;
        }

        td strong {
          display: block;
          color: #0f172a;
          font-weight: 950;
          margin-bottom: 3px;
        }

        .muted {
          color: #64748b;
          font-size: 12px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .userCell {
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
        }

        .avatar {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          background: #eef2e5;
          overflow: hidden;
          display: grid;
          place-items: center;
          color: #64748b;
          font-size: 12px;
          font-weight: 950;
        }

        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 6px 9px;
          background: #f1f5f9;
          color: #334155;
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
        }

        .pill.bug,
        .pill.novo {
          background: #fee2e2;
          color: #991b1b;
        }

        .pill.suporte,
        .pill.analise {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .pill.sugestao,
        .pill.respondido,
        .pill.resolvido {
          background: #ecfdf5;
          color: #166534;
        }

        .pill.urgente,
        .pill.alta {
          background: #fef3c7;
          color: #92400e;
        }

        .pill.arquivado {
          background: #f1f5f9;
          color: #475569;
        }

        .communicationHint {
          color: #64748b;
          font-size: 11px;
          font-weight: 750;
          line-height: 1.35;
          margin-top: 6px;
          max-width: 260px;
        }

        .empty {
          padding: 40px 18px;
          text-align: center;
          color: #64748b;
          font-weight: 800;
        }

        .rowButton {
          border: 0;
          border-radius: 999px;
          padding: 9px 12px;
          background: #0f172a;
          color: #fff;
          font-size: 12px;
          font-weight: 950;
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
          width: min(820px, 100%);
          max-height: min(860px, 92dvh);
          overflow: auto;
          padding: 20px;
        }

        .modalTitle {
          margin: 0;
          font-size: 25px;
          line-height: 1.02;
          font-weight: 950;
          letter-spacing: -0.05em;
        }

        .modalSub {
          margin: 6px 0 16px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.45;
          font-weight: 750;
        }

        .box {
          border-radius: 18px;
          background: #f8fafc;
          border: 1px solid rgba(15, 23, 42, 0.08);
          padding: 13px;
          color: #334155;
          font-size: 13px;
          line-height: 1.52;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          margin-bottom: 12px;
        }

        .box.answer {
          background: #ecfdf5;
          border-color: #bbf7d0;
          color: #166534;
        }

        .box.rating {
          background: #fff7ed;
          border-color: #fed7aa;
          color: #92400e;
        }

        .formGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .field {
          margin-top: 12px;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .label {
          display: block;
          margin-bottom: 6px;
          color: #475569;
          font-size: 12px;
          font-weight: 950;
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

        @media (max-width: 1180px) {
          .summary {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .filters {
            grid-template-columns: 1fr 1fr 1fr;
          }

          .filters input {
            grid-column: 1 / -1;
          }

          .tableWrap {
            overflow-x: auto;
          }

          table {
            min-width: 1120px;
          }
        }

        @media (max-width: 720px) {
          .page {
            padding: 16px 12px;
          }

          .top {
            flex-direction: column;
          }

          .summary,
          .filters,
          .formGrid {
            grid-template-columns: 1fr;
          }

          .btn {
            width: 100%;
          }

          .modalOverlay {
            align-items: end;
            padding: 10px;
          }

          .modal {
            border-radius: 26px;
            max-height: calc(100dvh - 20px);
          }

          .modalActions {
            display: grid;
          }
        }
      `}</style>

      <main className="page">
        <section className="top">
          <div>
            <div className="kicker">Suporte e comunicação</div>
            <h1 className="title">Central de atendimento Beta</h1>
            <p className="subtitle">
              Acompanhe bugs, mensagens de suporte e sugestões. A resposta do Admin aparece no perfil do cliente ou guia; depois, o usuário conclui o chamado e avalia a resposta com nota de 1 a 5.
            </p>
          </div>

          <button className="btn light" type="button" onClick={() => router.push('/admin/dashboard')}>
            Voltar ao Admin
          </button>
        </section>

        <div className="content">
          <section className="summary">
            {cards.map((card) => (
              <div className={`summaryCard ${card.classe}`} key={card.label}>
                <div className="summaryValue">{card.valor}</div>
                <div className="summaryLabel">{card.label}</div>
                <div className="summaryText">{card.texto}</div>
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
              placeholder="Buscar por usuário, assunto, descrição, resposta ou página..."
            />

            <select className="select" value={tipoUsuario} onChange={(event) => setTipoUsuario(event.target.value)}>
              <option value="todos">Clientes e guias</option>
              <option value="cliente">Clientes</option>
              <option value="guia">Guias</option>
            </select>

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
                    <th>Comunicação</th>
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
                        <div className="userCell">
                          <div className="avatar">
                            {chamado.usuario_avatar ? (
                              <img src={chamado.usuario_avatar} alt={chamado.usuario_nome || 'Usuário'} />
                            ) : (
                              <span>{(chamado.usuario_nome || chamado.usuario_email || 'U').slice(0, 1).toUpperCase()}</span>
                            )}
                          </div>

                          <div>
                            <strong>{chamado.usuario_nome || 'Usuário'}</strong>
                            <div className="muted">{chamado.usuario_email || chamado.usuario_id || '—'}</div>
                            <div className="muted">{chamado.tipo_usuario || 'cliente'}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`pill ${chamado.tipo_chamado || 'suporte'}`}>
                          {labelTipo(chamado.tipo_chamado)}
                        </span>
                      </td>

                      <td>
                        <span className={`pill ${classStatus(chamado.status)}`}>
                          {labelStatus(chamado.status)}
                        </span>
                        <div className="communicationHint">
                          {resumoDaResposta(chamado)}
                        </div>
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
        </div>

        {selecionado && (
          <div className="modalOverlay">
            <section className="modal">
              <h2 className="modalTitle">{selecionado.assunto || 'Chamado de suporte'}</h2>
              <div className="modalSub">
                {selecionado.usuario_nome || 'Usuário'} · {labelTipo(selecionado.tipo_chamado)} · {dataBR(selecionado.created_at)}
              </div>

              <div className="box">
                <strong>Solicitação do usuário</strong>
                {'\n\n'}
                {selecionado.descricao || 'Sem descrição.'}
                {'\n\n'}
                Página: {selecionado.pagina_origem || '—'}
                {'\n'}
                ID: {selecionado.id}
              </div>

              {selecionado.resposta_admin && (
                <div className="box answer">
                  <strong>Resposta enviada ao usuário</strong>
                  {'\n\n'}
                  {selecionado.resposta_admin}
                  {'\n\n'}
                  Respondido em: {dataBR(selecionado.respondido_em)}
                </div>
              )}

              {notaChamado(selecionado) > 0 && (
                <div className="box rating">
                  <strong>Avaliação da resposta</strong>
                  {'\n\n'}
                  Nota: {notaChamado(selecionado)}/5
                  {selecionado.avaliacao_resposta_comentario ? (
                    <>
                      {'\n\n'}
                      Comentário: {selecionado.avaliacao_resposta_comentario}
                    </>
                  ) : null}
                  {'\n\n'}
                  Avaliado em: {dataBR(selecionado.avaliacao_resposta_em)}
                </div>
              )}

              <div className="formGrid">
                <div className="field">
                  <label className="label">Status</label>
                  <select className="select" value={novoStatus} onChange={(event) => setNovoStatus(event.target.value)}>
                    <option value="novo">Novo</option>
                    <option value="em_analise">Em análise</option>
                    <option value="respondido">Respondido ao usuário</option>
                    <option value="resolvido">Resolvido</option>
                    <option value="arquivado">Arquivado</option>
                  </select>
                </div>

                <div className="field">
                  <label className="label">Prioridade</label>
                  <select className="select" value={novaPrioridade} onChange={(event) => setNovaPrioridade(event.target.value)}>
                    <option value="baixa">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>

                <div className="field full">
                  <label className="label">Resposta administrativa</label>
                  <textarea
                    className="textarea"
                    value={resposta}
                    onChange={(event) => setResposta(event.target.value)}
                    placeholder="Escreva a resposta que aparecerá no perfil do cliente ou guia. Após a resposta, o usuário poderá concluir o chamado e avaliar de 1 a 5."
                  />
                </div>
              </div>

              <div className="modalActions">
                <button className="btn light" type="button" onClick={() => setSelecionado(null)} disabled={salvando}>
                  Fechar
                </button>

                <button
                  className="btn green"
                  type="button"
                  onClick={() => {
                    setNovoStatus('respondido')
                    void atualizarChamado('respondido')
                  }}
                  disabled={salvando || !resposta.trim()}
                  title={!resposta.trim() ? 'Escreva uma resposta antes de enviar ao usuário.' : undefined}
                >
                  {salvando ? 'Salvando...' : 'Responder ao usuário'}
                </button>

                <button className="btn" type="button" onClick={() => { void atualizarChamado() }} disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </>
  )
}
