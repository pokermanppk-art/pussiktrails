'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type UsuarioLocal = {
  id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  guia_id?: string | null
  nome?: string | null
  email?: string | null
  tipo?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
}

type GuiaInfo = {
  id: string
  nome?: string | null
  email?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  pix_tipo?: string | null
  pix_chave?: string | null
  cadastur?: string | null
  cadastur_numero?: string | null
  taxa_plataforma_percentual?: number | null
}

type ResumoFinanceiro = {
  receita_bruta: number
  taxa_percentual: number
  taxa_plataforma: number
  taxa_paghiper: number
  valor_liquido_guia: number
  valor_pago: number
  saldo_pendente: number
  excesso_repasse?: number
  reservas_confirmadas: number
  reservas_total?: number
  roteiros_total: number
  repasses_total: number
  ultimo_pagamento_em?: string | null
}

type Roteiro = {
  id?: string | null
  titulo?: string | null
  nome?: string | null
  local?: string | null
  localizacao?: string | null
  local_encontro?: string | null
  ponto_encontro?: string | null
  [key: string]: any
}

type ReservaFinanceira = {
  id: string
  cliente_id?: string | null
  roteiro_id?: string | null
  quantidade_pessoas?: number | null
  valor_total?: number | null
  status?: string | null
  pagamento_status?: string | null
  created_at?: string | null
  updated_at?: string | null
  data_pagamento?: string | null
  paid_at?: string | null
  order_id?: string | null
  transaction_id?: string | null
  paghiper_order_id?: string | null
  paghiper_transaction_id?: string | null
  url_comprovante?: string | null
  comprovante?: string | null
  recibo_url?: string | null
  arquivo_url?: string | null
  roteiro_titulo?: string | null
  cliente_nome?: string | null
  cliente_email?: string | null
  roteiro?: Roteiro | null
  [key: string]: any
}

type RepasseFinanceiro = {
  id: string
  guia_id?: string | null
  id_guia?: string | null
  valor?: number | null
  valor_pago?: number | null
  valor_repassado?: number | null
  valor_total?: number | null
  status?: string | null
  tipo?: string | null
  observacao?: string | null
  descricao?: string | null
  data_pagamento?: string | null
  created_at?: string | null
  updated_at?: string | null
  comprovante_url?: string | null
  url_comprovante?: string | null
  comprovante?: string | null
  recibo_url?: string | null
  arquivo_url?: string | null
  [key: string]: any
}

type SolicitacaoSaque = {
  id: string
  guia_id?: string | null
  valor_solicitado?: number | null
  valor_disponivel_no_momento?: number | null
  pix_tipo?: string | null
  pix_chave?: string | null
  titular_nome?: string | null
  status?: string | null
  observacao_guia?: string | null
  observacao_admin?: string | null
  comprovante_url?: string | null
  created_at?: string | null
  updated_at?: string | null
  pago_em?: string | null
  [key: string]: any
}

type Cliente = {
  id: string
  nome?: string | null
  email?: string | null
}

type MovimentoHistorico = {
  id: string
  tipo: 'cliente' | 'admin' | 'saque'
  titulo: string
  subtitulo: string
  valor: number
  status: string
  data: string | null
  comprovante: string
}

const resumoInicial: ResumoFinanceiro = {
  receita_bruta: 0,
  taxa_percentual: 5,
  taxa_plataforma: 0,
  taxa_paghiper: 0,
  valor_liquido_guia: 0,
  valor_pago: 0,
  saldo_pendente: 0,
  excesso_repasse: 0,
  reservas_confirmadas: 0,
  reservas_total: 0,
  roteiros_total: 0,
  repasses_total: 0,
  ultimo_pagamento_em: null,
}

function extrairUsuarioId(usuario: UsuarioLocal | null): string {
  return String(
    usuario?.id ||
      usuario?.user_id ||
      usuario?.usuario_id ||
      usuario?.guia_id ||
      ''
  ).trim()
}

function normalizar(valor: any) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function formatarMoeda(valor: any) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0))
}

function formatarData(valor?: string | null) {
  if (!valor) return '-'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return '-'
  return data.toLocaleString('pt-BR')
}

function formatarDataCurta(valor?: string | null) {
  if (!valor) return '-'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return '-'
  return data.toLocaleDateString('pt-BR')
}

function primeiroNome(valor?: string | null) {
  const nome = String(valor || 'Guia').trim()
  return nome.split(' ')[0] || 'Guia'
}

function badgeClasse(status?: string | null) {
  const atual = normalizar(status)

  if (
    atual === 'pago' ||
    atual === 'confirmado' ||
    atual === 'aprovado' ||
    atual === 'paid' ||
    atual === 'approved' ||
    atual === 'concluido' ||
    atual === 'concluído'
  ) {
    return 'success'
  }

  if (
    atual === 'cancelado' ||
    atual === 'cancelada' ||
    atual === 'estornado' ||
    atual === 'estornada' ||
    atual === 'recusado'
  ) {
    return 'danger'
  }

  return 'warning'
}

function statusSaqueLabel(status?: string | null) {
  const atual = normalizar(status)
  if (atual === 'novo' || atual === 'pendente' || atual === 'solicitado') return 'Solicitado'
  if (atual === 'em_analise') return 'Em análise'
  if (atual === 'aprovado') return 'Aprovado'
  if (atual === 'pago' || atual === 'concluido' || atual === 'concluído') return 'Pago'
  if (atual === 'recusado') return 'Recusado'
  if (atual === 'cancelado') return 'Cancelado'
  return status || 'Solicitado'
}

function statusPagamentoLabel(valor?: string | null) {
  const status = normalizar(valor)
  if (['pago', 'paid', 'confirmado', 'confirmada', 'aprovado', 'approved'].includes(status)) return 'Pago'
  if (['cancelado', 'cancelada', 'estornado', 'estornada'].includes(status)) return 'Cancelado'
  if (['pendente', 'aguardando', 'waiting'].includes(status)) return 'Pendente'
  return valor || 'Registrado'
}

function dataReserva(reserva: ReservaFinanceira) {
  return reserva.data_pagamento || reserva.paid_at || reserva.updated_at || reserva.created_at || null
}

function dataRepasse(repasse: RepasseFinanceiro) {
  return repasse.data_pagamento || repasse.updated_at || repasse.created_at || null
}

function valorReserva(reserva: ReservaFinanceira) {
  return Number(reserva.valor_total || 0)
}

function valorRepasse(repasse: RepasseFinanceiro) {
  return Number(repasse.valor_pago || repasse.valor_repassado || repasse.valor || repasse.valor_total || 0)
}

function tituloRoteiro(reserva: ReservaFinanceira) {
  return reserva.roteiro_titulo || reserva.roteiro?.titulo || reserva.roteiro?.nome || 'Roteiro'
}

function localRoteiro(reserva: ReservaFinanceira) {
  return reserva.roteiro?.local || reserva.roteiro?.localizacao || reserva.roteiro?.local_encontro || reserva.roteiro?.ponto_encontro || 'Local não informado'
}

function comprovanteReserva(reserva: ReservaFinanceira) {
  return reserva.url_comprovante || reserva.comprovante || reserva.recibo_url || reserva.arquivo_url || ''
}

function comprovanteRepasse(repasse: RepasseFinanceiro) {
  return repasse.comprovante_url || repasse.url_comprovante || repasse.comprovante || repasse.recibo_url || repasse.arquivo_url || ''
}

export default function GuiaFinanceiroHistoricoPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [guia, setGuia] = useState<GuiaInfo | null>(null)
  const [resumo, setResumo] = useState<ResumoFinanceiro>(resumoInicial)
  const [reservas, setReservas] = useState<ReservaFinanceira[]>([])
  const [repasses, setRepasses] = useState<RepasseFinanceiro[]>([])
  const [saques, setSaques] = useState<SolicitacaoSaque[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'cliente' | 'admin' | 'saque'>('todos')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('')

  useEffect(() => {
    if (iniciouRef.current) return
    iniciouRef.current = true
    iniciar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function iniciar() {
    try {
      setCarregando(true)
      setErro('')

      const salvo = localStorage.getItem('user')
      const parsedUser = salvo ? (JSON.parse(salvo) as UsuarioLocal) : null

      if (!parsedUser || normalizar(parsedUser.tipo) !== 'guia') {
        router.replace('/login')
        return
      }

      const id = extrairUsuarioId(parsedUser)

      if (!id) {
        localStorage.removeItem('user')
        router.replace('/login')
        return
      }

      const usuario = { ...parsedUser, id }
      setUser(usuario)

      await carregarFinanceiro(id)
    } catch (error: any) {
      console.error('Erro ao iniciar histórico financeiro:', error)
      setErro(error?.message || 'Não foi possível carregar o histórico financeiro.')
    } finally {
      setCarregando(false)
    }
  }

  function nomeGuia() {
    return guia?.nome || user?.nome || guia?.email || user?.email || 'Guia'
  }

  function avatarGuia() {
    return guia?.avatar_url || guia?.foto_url || guia?.imagem_url || user?.avatar_url || user?.foto_url || user?.imagem_url || ''
  }

  async function carregarFinanceiro(guiaId: string) {
    setErro('')

    const response = await fetch(
      `/api/guia/financeiro/resumo?guiaId=${encodeURIComponent(guiaId)}&_ts=${Date.now()}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store',
          Pragma: 'no-cache',
        },
      }
    )

    const data = await response.json().catch(() => null)

    if (!response.ok || data?.sucesso === false) {
      throw new Error(data?.erro || 'Não foi possível carregar o financeiro.')
    }

    const reservasBase = Array.isArray(data?.reservas)
      ? (data.reservas as ReservaFinanceira[])
      : []

    const repassesBase = Array.isArray(data?.repasses)
      ? (data.repasses as RepasseFinanceiro[])
      : []

    const reservasComClientes = await enriquecerClientes(reservasBase)
    const saquesDoGuia = await carregarSaques(guiaId)

    setGuia(data?.guia || null)
    setResumo({
      ...resumoInicial,
      ...(data?.resumo || {}),
    })
    setReservas(reservasComClientes)
    setRepasses(repassesBase)
    setSaques(saquesDoGuia)
    setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
  }

  async function carregarSaques(guiaId: string) {
    try {
      const response = await fetch(
        `/api/guia/financeiro/solicitar-saque?guiaId=${encodeURIComponent(guiaId)}&_ts=${Date.now()}`,
        {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-store',
            Pragma: 'no-cache',
          },
        }
      )

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        console.warn('Não foi possível carregar solicitações de saque:', data)
        return []
      }

      return Array.isArray(data?.saques) ? (data.saques as SolicitacaoSaque[]) : []
    } catch (error) {
      console.warn('Erro ao carregar solicitações de saque:', error)
      return []
    }
  }

  async function enriquecerClientes(reservasBase: ReservaFinanceira[]) {
    const clienteIds = Array.from(
      new Set(
        reservasBase
          .map((reserva) => reserva.cliente_id)
          .filter(Boolean) as string[]
      )
    )

    if (clienteIds.length === 0) return reservasBase

    const { data, error } = await supabase
      .from('users')
      .select('id, nome, email')
      .in('id', clienteIds)

    if (error || !data) {
      console.warn('Não foi possível buscar nomes dos clientes:', error)
      return reservasBase
    }

    const clientes = data as Cliente[]

    return reservasBase.map((reserva) => {
      const cliente = clientes.find((item) => item.id === reserva.cliente_id)

      return {
        ...reserva,
        cliente_nome: reserva.cliente_nome || cliente?.nome || cliente?.email || 'Cliente',
        cliente_email: reserva.cliente_email || cliente?.email || '',
      }
    })
  }

  async function atualizar() {
    if (!user?.id) return

    try {
      setAtualizando(true)
      await carregarFinanceiro(user.id)
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível atualizar o histórico financeiro.')
    } finally {
      setAtualizando(false)
    }
  }

  const historicoGeral = useMemo<MovimentoHistorico[]>(() => {
    const pagamentosCliente = reservas.map((reserva) => ({
      id: `reserva-${reserva.id}`,
      tipo: 'cliente' as const,
      titulo: `Pagamento de cliente · ${tituloRoteiro(reserva)}`,
      subtitulo: `${reserva.cliente_nome || 'Cliente'} · ${reserva.quantidade_pessoas || 1} pessoa(s) · ${localRoteiro(reserva)}`,
      valor: valorReserva(reserva),
      status: statusPagamentoLabel(reserva.pagamento_status || reserva.status),
      data: dataReserva(reserva),
      comprovante: comprovanteReserva(reserva),
    }))

    const repassesAdmin = repasses.map((repasse) => ({
      id: `repasse-${repasse.id}`,
      tipo: 'admin' as const,
      titulo: repasse.descricao || 'Repasse do ADMIN para o guia',
      subtitulo: repasse.observacao || 'Pagamento registrado pelo administrativo',
      valor: valorRepasse(repasse),
      status: statusPagamentoLabel(repasse.status),
      data: dataRepasse(repasse),
      comprovante: comprovanteRepasse(repasse),
    }))

    const saquesGuia = saques.map((saque) => ({
      id: `saque-${saque.id}`,
      tipo: 'saque' as const,
      titulo: 'Solicitação de saque enviada ao Admin',
      subtitulo: `${saque.pix_tipo || 'PIX'} · ${saque.titular_nome || 'Titular não informado'}`,
      valor: Number(saque.valor_solicitado || 0),
      status: statusSaqueLabel(saque.status),
      data: saque.pago_em || saque.updated_at || saque.created_at || null,
      comprovante: saque.comprovante_url || '',
    }))

    return [...pagamentosCliente, ...repassesAdmin, ...saquesGuia].sort((a, b) => {
      const dataA = a.data ? new Date(a.data).getTime() : 0
      const dataB = b.data ? new Date(b.data).getTime() : 0
      return dataB - dataA
    })
  }, [reservas, repasses, saques])

  const saldoDisponivel = Math.max(0, Number(resumo.saldo_pendente || 0))
  const taxaPercentualAtual = Number.isFinite(Number(resumo.taxa_percentual))
    ? Number(resumo.taxa_percentual)
    : 5
  const taxaDecimalAtual = Math.max(0, Math.min(99, taxaPercentualAtual)) / 100
  const brutoPendente = saldoDisponivel > 0 && taxaDecimalAtual < 1
    ? saldoDisponivel / (1 - taxaDecimalAtual)
    : 0
  const taxaPendente = Math.max(0, brutoPendente - saldoDisponivel)

  const historicoFiltrado = useMemo(() => {
    const termo = normalizar(busca)

    return historicoGeral.filter((item) => {
      const passaFiltro = filtro === 'todos' ? true : item.tipo === filtro
      if (!passaFiltro) return false
      if (!termo) return true

      return normalizar([item.titulo, item.subtitulo, item.status, item.valor].join(' ')).includes(termo)
    })
  }, [historicoGeral, busca, filtro])

  if (carregando) {
    return (
      <main className="loading">
        <style>{estilos}</style>
        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>Carregando histórico financeiro...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{estilos}</style>

      <header className="topbar">
        <div className="topbarInner">
          <button type="button" className="brandHeader" onClick={() => router.push('/guia/financeiro')}>
            <img src="/logo-prussik-display.png" alt="PrussikTrails" className="brandLogo" />
            <span className="brandTextBlock">
              <span className="brandName">PrussikTrails</span>
              <span className="brandSubtitle">Histórico financeiro</span>
            </span>
          </button>

          <button type="button" className="profileButton" onClick={() => router.push('/guia/perfil')} aria-label="Abrir perfil do guia">
            {avatarGuia() ? <img src={avatarGuia()} alt={nomeGuia()} /> : <span>{nomeGuia().slice(0, 1).toUpperCase()}</span>}
          </button>
        </div>
      </header>

      <section className="container">
        <section className="hero">
          <div>
            <span className="eyebrow">Histórico geral</span>
            <h1>{primeiroNome(nomeGuia())}, aqui ficam os ganhos totais pelo app.</h1>
            <p>
              Esta página separa o histórico acumulado do saldo atual disponível para saque.
              {ultimaAtualizacao ? ` Atualizado às ${ultimaAtualizacao}.` : ''}
            </p>
          </div>

          <div className="heroCard">
            <span>Disponível atual</span>
            <strong>{formatarMoeda(saldoDisponivel)}</strong>
            <small>O card principal do financeiro deve zerar após pagamento do saque pelo Admin.</small>
          </div>
        </section>

        {erro && <div className="notice error">{erro}</div>}

        <section className="cardsGrid">
          <article className="metricCard">
            <span>Total bruto gerado pelo app</span>
            <strong>{formatarMoeda(resumo.receita_bruta)}</strong>
            <small>Valor bruto histórico pago pelos clientes.</small>
          </article>

          <article className="metricCard">
            <span>Taxas Prussik acumuladas</span>
            <strong>{formatarMoeda(resumo.taxa_plataforma)}</strong>
            <small>Taxa da plataforma acumulada sobre o histórico.</small>
          </article>

          <article className="metricCard">
            <span>Total líquido histórico</span>
            <strong>{formatarMoeda(resumo.valor_liquido_guia)}</strong>
            <small>Total líquido gerado ao guia pelo app.</small>
          </article>

          <article className="metricCard">
            <span>Já repassado ao guia</span>
            <strong>{formatarMoeda(resumo.valor_pago)}</strong>
            <small>Valores pagos/baixados pelo Admin.</small>
          </article>

          <article className="metricCard current">
            <span>Bruto pendente atual</span>
            <strong>{formatarMoeda(brutoPendente)}</strong>
            <small>Bruto referente apenas ao saldo ainda sacável.</small>
          </article>

          <article className="metricCard current">
            <span>Taxa pendente atual</span>
            <strong>{formatarMoeda(taxaPendente)}</strong>
            <small>Taxa sobre o valor ainda pendente.</small>
          </article>
        </section>

        <section className="toolbar">
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por cliente, roteiro, status ou valor..."
          />

          <div className="tabs">
            <button type="button" className={filtro === 'todos' ? 'active' : ''} onClick={() => setFiltro('todos')}>Todos</button>
            <button type="button" className={filtro === 'cliente' ? 'active' : ''} onClick={() => setFiltro('cliente')}>Clientes</button>
            <button type="button" className={filtro === 'admin' ? 'active' : ''} onClick={() => setFiltro('admin')}>Repasses</button>
            <button type="button" className={filtro === 'saque' ? 'active' : ''} onClick={() => setFiltro('saque')}>Saques</button>
          </div>

          <button type="button" className="refreshBtn" onClick={atualizar} disabled={atualizando}>
            {atualizando ? 'Atualizando...' : 'Atualizar'}
          </button>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>Movimentos financeiros</h2>
              <p>{historicoFiltrado.length} registro(s) encontrado(s).</p>
            </div>

            <button type="button" onClick={() => router.push('/guia/financeiro')}>Voltar ao resumo</button>
          </div>

          <div className="list">
            {historicoFiltrado.length === 0 ? (
              <div className="empty">Nenhum movimento financeiro encontrado.</div>
            ) : (
              historicoFiltrado.map((item) => (
                <article className="item" key={item.id}>
                  <div className="itemTop">
                    <div>
                      <div className="itemTitle">{item.titulo}</div>
                      <div className="itemText">{item.subtitulo} · {formatarData(item.data)}</div>
                    </div>
                    <div className="itemValue">{formatarMoeda(item.valor)}</div>
                  </div>

                  <div className="itemFooter">
                    <span className={`badge ${badgeClasse(item.status)}`}>{item.status}</span>
                    {item.comprovante ? (
                      <a href={item.comprovante} target="_blank" rel="noreferrer" className="proofLink">
                        Ver comprovante
                      </a>
                    ) : (
                      <span className="mutedProof">Sem comprovante anexado</span>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  )
}

const estilos = `
  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: #f6f7f1;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .loading,
  .page {
    min-height: 100vh;
    min-height: 100dvh;
    background:
      radial-gradient(circle at 10% 0%, rgba(132,204,22,0.16), transparent 28%),
      radial-gradient(circle at 90% 10%, rgba(251,146,60,0.14), transparent 28%),
      linear-gradient(180deg,#fffdf7 0%,#f3f5ea 48%,#eef2e5 100%);
    color: #172018;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loadingCard {
    background: rgba(255,255,255,0.92);
    border: 1px solid rgba(15,23,42,0.08);
    border-radius: 28px;
    padding: 24px;
    box-shadow: 0 20px 60px rgba(15,23,42,0.12);
    color: #203c2e;
    font-weight: 950;
    display: grid;
    justify-items: center;
    gap: 10px;
  }

  .loadingCard img {
    width: 120px;
    height: auto;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 30;
    background: rgba(255,253,247,0.88);
    border-bottom: 1px solid rgba(15,23,42,0.06);
    backdrop-filter: blur(18px);
    padding: 8px 14px;
  }

  .topbarInner {
    max-width: 1180px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .brandHeader {
    border: 0;
    background: transparent;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    min-width: 0;
    text-align: left;
  }

  .brandLogo {
    width: 70px;
    height: 44px;
    object-fit: contain;
  }

  .brandTextBlock {
    display: grid;
    gap: 1px;
    min-width: 0;
  }

  .brandName {
    color: #203c2e;
    font-size: clamp(20px, 3vw, 31px);
    line-height: 0.96;
    font-weight: 950;
    letter-spacing: -0.07em;
  }

  .brandSubtitle {
    color: #7b8372;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .profileButton {
    width: 42px;
    height: 42px;
    border: 1px solid rgba(15,23,42,0.08);
    background: #ffffff;
    border-radius: 999px;
    overflow: hidden;
    padding: 0;
    cursor: pointer;
  }

  .profileButton img,
  .profileButton span {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    object-fit: cover;
    color: #203c2e;
    font-weight: 950;
  }

  .container {
    max-width: 1180px;
    margin: 0 auto;
    padding: 20px 16px 54px;
  }

  .hero {
    border-radius: 34px;
    padding: 24px;
    background:
      linear-gradient(135deg, rgba(23,32,24,0.80), rgba(23,32,24,0.46)),
      radial-gradient(circle at top right, rgba(190,242,100,0.30), transparent 34%),
      linear-gradient(135deg, #1f331f 0%, #647a49 46%, #d7c6a1 100%);
    color: #ffffff;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 290px;
    gap: 16px;
    align-items: end;
    box-shadow: 0 24px 60px rgba(23,32,24,0.18);
    margin-bottom: 14px;
  }

  .eyebrow {
    display: inline-flex;
    width: fit-content;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.24);
    background: rgba(255,255,255,0.12);
    color: #f7fee7;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .hero h1 {
    margin: 0;
    max-width: 780px;
    font-size: clamp(38px, 5.8vw, 72px);
    line-height: 0.92;
    font-weight: 950;
    letter-spacing: -0.085em;
  }

  .hero p {
    max-width: 720px;
    color: rgba(255,255,255,0.82);
    line-height: 1.62;
    margin: 14px 0 0;
    font-size: 14px;
    font-weight: 650;
  }

  .heroCard {
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.14);
    border-radius: 28px;
    padding: 18px;
    backdrop-filter: blur(14px);
  }

  .heroCard span,
  .metricCard span {
    color: rgba(255,255,255,0.70);
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.10em;
  }

  .heroCard strong {
    display: block;
    color: #bef264;
    font-size: 34px;
    font-weight: 950;
    letter-spacing: -0.07em;
    margin-top: 8px;
  }

  .heroCard small {
    display: block;
    color: rgba(255,255,255,0.74);
    font-size: 12px;
    line-height: 1.45;
    font-weight: 750;
    margin-top: 8px;
  }

  .notice {
    border-radius: 18px;
    padding: 12px 14px;
    margin-bottom: 14px;
    background: #dcfce7;
    color: #166534;
    font-size: 13px;
    font-weight: 850;
  }

  .notice.error {
    background: #fee2e2;
    color: #991b1b;
  }

  .cardsGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 14px;
  }

  .metricCard,
  .toolbar,
  .panel {
    background: rgba(255,255,255,0.92);
    border: 1px solid rgba(15,23,42,0.06);
    box-shadow: 0 12px 34px rgba(15,23,42,0.06);
  }

  .metricCard {
    border-radius: 24px;
    padding: 16px;
  }

  .metricCard span {
    display: block;
    color: #64748b;
    margin-bottom: 8px;
  }

  .metricCard strong {
    display: block;
    color: #172018;
    font-size: 24px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.055em;
  }

  .metricCard small {
    display: block;
    color: #64748b;
    margin-top: 8px;
    font-size: 12px;
    line-height: 1.4;
    font-weight: 750;
  }

  .metricCard.current {
    background:
      radial-gradient(circle at top right, rgba(190,242,100,0.16), transparent 38%),
      rgba(255,255,255,0.94);
  }

  .toolbar {
    border-radius: 26px;
    padding: 12px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 10px;
    align-items: center;
    margin-bottom: 14px;
  }

  .toolbar input {
    width: 100%;
    border: 1px solid rgba(15,23,42,0.08);
    background: #fffdf7;
    border-radius: 18px;
    padding: 12px 13px;
    outline: none;
    font-size: 13px;
    font-weight: 750;
  }

  .tabs {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .tabs button,
  .refreshBtn,
  .panelHeader button {
    border: 0;
    border-radius: 999px;
    background: #eef2e5;
    color: #334155;
    padding: 10px 12px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
    white-space: nowrap;
  }

  .tabs button.active,
  .refreshBtn {
    background: #172018;
    color: #ffffff;
  }

  .refreshBtn:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }

  .panel {
    border-radius: 30px;
    padding: 18px;
  }

  .panelHeader {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
    margin-bottom: 14px;
  }

  .panelHeader h2 {
    margin: 0;
    color: #172018;
    font-size: 24px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.055em;
  }

  .panelHeader p {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 13px;
    font-weight: 750;
  }

  .list {
    display: grid;
    gap: 10px;
  }

  .item {
    background: #fffdf7;
    border: 1px solid rgba(15,23,42,0.06);
    border-radius: 22px;
    padding: 14px;
  }

  .itemTop {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }

  .itemTitle {
    color: #172018;
    font-size: 14px;
    font-weight: 950;
    line-height: 1.2;
  }

  .itemText {
    color: #64748b;
    font-size: 12px;
    line-height: 1.45;
    font-weight: 750;
    margin-top: 5px;
  }

  .itemValue {
    color: #203c2e;
    font-size: 16px;
    font-weight: 950;
    white-space: nowrap;
  }

  .itemFooter {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 12px;
  }

  .badge {
    display: inline-flex;
    border-radius: 999px;
    padding: 7px 9px;
    font-size: 10px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .badge.success { background: #dcfce7; color: #166534; }
  .badge.warning { background: #fef3c7; color: #92400e; }
  .badge.danger { background: #fee2e2; color: #991b1b; }

  .proofLink {
    border: none;
    background: #172018;
    color: #ffffff;
    border-radius: 999px;
    padding: 8px 11px;
    font-size: 11px;
    font-weight: 950;
    text-decoration: none;
  }

  .mutedProof {
    color: #94a3b8;
    font-size: 11px;
    font-weight: 800;
  }

  .empty {
    border-radius: 22px;
    border: 1px dashed rgba(15,23,42,0.14);
    background: #fffdf7;
    color: #64748b;
    padding: 24px;
    text-align: center;
    font-size: 13px;
    font-weight: 800;
  }

  @media (max-width: 900px) {
    .hero,
    .cardsGrid,
    .toolbar {
      grid-template-columns: 1fr;
    }

    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .tabs button,
    .refreshBtn {
      width: 100%;
    }
  }

  @media (max-width: 640px) {
    .topbar {
      padding: 7px 10px;
    }

    .brandLogo {
      width: 58px;
      height: 36px;
    }

    .brandName {
      font-size: 22px;
    }

    .brandSubtitle {
      font-size: 8.5px;
    }

    .container {
      padding: 12px 10px 38px;
    }

    .hero {
      border-radius: 26px;
      padding: 18px;
    }

    .hero h1 {
      font-size: 39px;
    }

    .metricCard,
    .panel,
    .toolbar {
      border-radius: 22px;
    }

    .panelHeader,
    .itemTop,
    .itemFooter {
      display: grid;
    }

    .itemValue {
      white-space: normal;
    }
  }
`
