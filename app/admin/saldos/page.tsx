
'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type AdminUser = {
  id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  nome?: string | null
  name?: string | null
  email?: string | null
  tipo?: string | null
}

type ClienteSaldo = {
  id?: string
  cliente_id: string
  cliente_nome?: string
  cliente_email?: string
  cliente_avatar?: string
  saldo_disponivel: number | string
  saldo_reservado?: number | string
  saldo_utilizado?: number | string
  saldo_expirado?: number | string
  moeda?: string
  updated_at?: string
  created_at?: string
}

type MovimentacaoSaldo = {
  id: string
  cliente_id: string
  reserva_id?: string | null
  roteiro_id?: string | null
  guia_id?: string | null
  tipo: string
  origem?: string | null
  valor: number | string
  moeda?: string | null
  status?: string | null
  descricao?: string | null
  motivo?: string | null
  observacao_admin?: string | null
  created_at?: string
}

type ClienteSaldoDetalhado = {
  saldo?: ClienteSaldo
  movimentacoes?: MovimentacaoSaldo[]
}

type ReembolsoCliente = {
  id: string
  cliente_id: string
  cliente_nome?: string
  cliente_email?: string
  cliente_avatar?: string
  valor_solicitado: number | string
  valor_pago?: number | string | null
  status?: string | null
  pix_tipo?: string | null
  chave_pix?: string | null
  titular_nome?: string | null
  titular_documento?: string | null
  motivo?: string | null
  observacao_admin?: string | null
  referencia_pagamento?: string | null
  comprovante_url?: string | null
  comprovante_nome?: string | null
  created_at?: string | null
  updated_at?: string | null
  pago_em?: string | null
}

type ModalPagamentoReembolso = {
  reembolso: ReembolsoCliente
  referencia: string
  observacao: string
  arquivo: File | null
}

type AjusteForm = {
  operacao: 'credito' | 'debito'
  valor: string
  motivo: string
  descricao: string
}

const EMPTY_AJUSTE: AjusteForm = {
  operacao: 'credito',
  valor: '',
  motivo: '',
  descricao: '',
}

const filtrosReembolso = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_analise', label: 'Em análise' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'pago', label: 'Pago' },
  { value: 'recusado', label: 'Recusado' },
  { value: 'todos', label: 'Todos' },
] as const

type FiltroReembolso = (typeof filtrosReembolso)[number]['value']

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function extrairUsuarioId(usuario: AdminUser | null): string {
  return texto(usuario?.id || usuario?.user_id || usuario?.usuario_id)
}

function numero(valor: unknown) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0

  const limpo = texto(valor)
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  const n = Number(limpo)
  return Number.isFinite(n) ? n : 0
}

function formatarMoeda(valor: unknown) {
  return numero(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatarDataHora(valor?: string | null) {
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

function normalizarTipo(tipo?: string | null) {
  const mapa: Record<string, string> = {
    credito_cancelamento_guia: 'Crédito por cancelamento do guia',
    credito_cancelamento_cliente: 'Crédito por cancelamento do cliente',
    credito_arrependimento: 'Crédito por arrependimento legal',
    ajuste_admin_credito: 'Crédito administrativo',
    ajuste_admin_debito: 'Débito administrativo',
    uso_saldo_reserva: 'Uso em nova reserva',
    estorno_saldo: 'Estorno de saldo',
    expiracao_saldo: 'Expiração de saldo',
  }
  return mapa[String(tipo || '')] || String(tipo || 'Movimentação')
}

function normalizarStatusMov(status?: string | null) {
  const mapa: Record<string, string> = {
    efetivado: 'Efetivado',
    reservado: 'Reservado',
    cancelado: 'Cancelado',
    estornado: 'Estornado',
    expirado: 'Expirado',
  }
  return mapa[String(status || '')] || String(status || '—')
}

function labelStatusReembolso(status?: string | null) {
  const valor = normalizar(status || 'pendente')
  if (valor === 'em_analise') return 'Em análise'
  if (valor === 'aprovado') return 'Aprovado'
  if (valor === 'pago') return 'Pago'
  if (valor === 'recusado') return 'Recusado'
  return 'Pendente'
}

function iniciais(nome?: string | null, email?: string | null) {
  const base = texto(nome || email || 'Cliente')
  const partes = base.split(' ').filter(Boolean)
  const primeira = partes[0]?.[0] || 'C'
  const segunda = partes.length > 1 ? partes[partes.length - 1]?.[0] : ''
  return `${primeira}${segunda}`.toUpperCase()
}

export default function AdminSaldosPage() {
  const router = useRouter()

  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [clientes, setClientes] = useState<ClienteSaldo[]>([])
  const [selecionado, setSelecionado] = useState<ClienteSaldo | null>(null)
  const [detalhes, setDetalhes] = useState<ClienteSaldoDetalhado | null>(null)
  const [busca, setBusca] = useState('')
  const [somenteComSaldo, setSomenteComSaldo] = useState(true)
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [form, setForm] = useState<AjusteForm>(EMPTY_AJUSTE)

  const [reembolsos, setReembolsos] = useState<ReembolsoCliente[]>([])
  const [filtroReembolso, setFiltroReembolso] = useState<FiltroReembolso>('pendente')
  const [carregandoReembolsos, setCarregandoReembolsos] = useState(false)
  const [processandoReembolsoId, setProcessandoReembolsoId] = useState('')
  const [modalPagamentoReembolso, setModalPagamentoReembolso] = useState<ModalPagamentoReembolso | null>(null)

  useEffect(() => {
    iniciar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!admin) return
    const timer = window.setTimeout(() => {
      carregarClientes()
    }, 350)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, somenteComSaldo, admin?.id, admin?.user_id, admin?.usuario_id])

  useEffect(() => {
    if (!admin) return
    carregarReembolsos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroReembolso, admin?.id, admin?.user_id, admin?.usuario_id])

  const estatisticas = useMemo(() => {
    const totalClientes = clientes.length
    const totalDisponivel = clientes.reduce((acc, item) => acc + numero(item.saldo_disponivel), 0)
    const maiorSaldo = clientes.reduce((acc, item) => Math.max(acc, numero(item.saldo_disponivel)), 0)
    const pendentes = reembolsos.filter((item) => {
      const status = normalizar(item.status || 'pendente')
      return status === 'pendente' || status === 'em_analise' || status === 'aprovado'
    })

    return {
      totalClientes,
      totalDisponivel,
      maiorSaldo,
      reembolsosPendentes: pendentes.length,
      valorReembolsosPendentes: pendentes.reduce((acc, item) => acc + numero(item.valor_solicitado), 0),
    }
  }, [clientes, reembolsos])

  async function iniciar() {
    try {
      setErro('')
      setCarregando(true)
      const salvo = localStorage.getItem('user')
      const usuario = salvo ? (JSON.parse(salvo) as AdminUser) : null
      if (!usuario || normalizar(usuario.tipo) !== 'admin') {
        router.replace('/login')
        return
      }
      setAdmin(usuario)
      await Promise.all([carregarClientes(), carregarReembolsos()])
    } catch (error) {
      console.error('Erro ao iniciar página de saldos:', error)
      setErro('Não foi possível carregar a área de saldos.')
    } finally {
      setCarregando(false)
    }
  }

  async function carregarClientes() {
    try {
      setErro('')
      const params = new URLSearchParams()
      params.set('somenteComSaldo', String(somenteComSaldo))
      if (busca.trim()) params.set('busca', busca.trim())
      const resposta = await fetch(`/api/admin/saldos/clientes?${params.toString()}`, { cache: 'no-store' })
      const json = await resposta.json().catch(() => null)
      if (!resposta.ok || !json?.sucesso) throw new Error(json?.erro || 'Não foi possível carregar os saldos.')
      const lista = (json.clientes || []) as ClienteSaldo[]
      setClientes(lista)
      if (selecionado) {
        const atualizado = lista.find((item) => String(item.cliente_id) === String(selecionado.cliente_id))
        if (atualizado) setSelecionado(atualizado)
      }
    } catch (error) {
      console.error('Erro ao carregar saldos:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao carregar saldos.')
    }
  }

  async function carregarReembolsos() {
    try {
      setCarregandoReembolsos(true)
      setErro('')
      const params = new URLSearchParams()
      params.set('status', filtroReembolso)
      params.set('limite', '120')
      const resposta = await fetch(`/api/admin/saldos/reembolsos?${params.toString()}`, { cache: 'no-store' })
      const json = await resposta.json().catch(() => null)
      if (!resposta.ok || !json?.sucesso) throw new Error(json?.erro || 'Não foi possível carregar solicitações de reembolso.')
      setReembolsos((json.reembolsos || []) as ReembolsoCliente[])
    } catch (error) {
      console.error('Erro ao carregar reembolsos:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao carregar reembolsos.')
    } finally {
      setCarregandoReembolsos(false)
    }
  }

  async function atualizarTudo() {
    try {
      setAtualizando(true)
      setMensagem('')
      setErro('')
      await Promise.all([carregarClientes(), carregarReembolsos()])
      if (selecionado) await abrirCliente(selecionado, true)
      setMensagem('Saldos e solicitações atualizados.')
    } finally {
      setAtualizando(false)
    }
  }

  async function processarReembolso(reembolso: ReembolsoCliente, acao: 'aprovar' | 'recusar') {
    const observacao =
      acao === 'recusar'
        ? window.prompt('Informe o motivo da recusa para registro administrativo:', 'Reembolso recusado após análise administrativa.') || ''
        : 'Reembolso aprovado para pagamento pelo Admin.'
    if (acao === 'recusar' && !observacao.trim()) return

    try {
      setProcessandoReembolsoId(reembolso.id)
      setErro('')
      setMensagem('')
      const resposta = await fetch('/api/admin/saldos/reembolsos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reembolsoId: reembolso.id, adminId: extrairUsuarioId(admin), acao, observacaoAdmin: observacao }),
      })
      const json = await resposta.json().catch(() => null)
      if (!resposta.ok || !json?.sucesso) throw new Error(json?.erro || 'Não foi possível processar o reembolso.')
      setMensagem(acao === 'aprovar' ? 'Reembolso aprovado.' : 'Reembolso recusado.')
      await atualizarTudo()
    } catch (error) {
      console.error('Erro ao processar reembolso:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao processar reembolso.')
    } finally {
      setProcessandoReembolsoId('')
    }
  }

  function abrirPagamentoReembolso(reembolso: ReembolsoCliente) {
    setErro('')
    setMensagem('')
    setModalPagamentoReembolso({ reembolso, referencia: reembolso.referencia_pagamento || '', observacao: 'Pagamento do reembolso registrado pelo Admin.', arquivo: null })
  }

  async function enviarComprovanteReembolso(reembolsoId: string, arquivo: File | null) {
    if (!arquivo) return null
    const formData = new FormData()
    formData.append('file', arquivo)
    formData.append('reembolsoId', reembolsoId)
    const resposta = await fetch('/api/admin/saldos/reembolsos/comprovante', { method: 'POST', body: formData })
    const json = await resposta.json().catch(() => null)
    if (!resposta.ok || !json?.sucesso) throw new Error(json?.erro || 'Não foi possível anexar o comprovante.')
    return json
  }

  async function confirmarPagamentoReembolso() {
    if (!modalPagamentoReembolso) return
    const { reembolso, referencia, observacao, arquivo } = modalPagamentoReembolso
    if (!referencia.trim() && !arquivo) {
      setErro('Informe uma referência de pagamento ou anexe um comprovante.')
      return
    }
    try {
      setProcessandoReembolsoId(reembolso.id)
      setErro('')
      setMensagem('')
      const comprovante = arquivo ? await enviarComprovanteReembolso(reembolso.id, arquivo) : null
      const resposta = await fetch('/api/admin/saldos/reembolsos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reembolsoId: reembolso.id,
          adminId: extrairUsuarioId(admin),
          acao: 'registrar_pagamento',
          referenciaPagamento: referencia,
          observacaoAdmin: observacao,
          comprovanteUrl: comprovante?.url || comprovante?.publicUrl || null,
          comprovanteNome: comprovante?.filename || comprovante?.nome || arquivo?.name || null,
        }),
      })
      const json = await resposta.json().catch(() => null)
      if (!resposta.ok || !json?.sucesso) throw new Error(json?.erro || 'Não foi possível registrar o pagamento.')
      setMensagem('Pagamento do reembolso registrado e saldo debitado com sucesso.')
      setModalPagamentoReembolso(null)
      await atualizarTudo()
    } catch (error) {
      console.error('Erro ao registrar pagamento do reembolso:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao registrar pagamento.')
    } finally {
      setProcessandoReembolsoId('')
    }
  }

  async function abrirCliente(cliente: ClienteSaldo, silencioso = false) {
    try {
      setSelecionado(cliente)
      setDetalhes(null)
      if (!silencioso) {
        setMensagem('')
        setErro('')
      }
      setForm(EMPTY_AJUSTE)
      setCarregandoDetalhes(true)
      const params = new URLSearchParams()
      params.set('clienteId', cliente.cliente_id)
      const resposta = await fetch(`/api/cliente/saldo?${params.toString()}`, { cache: 'no-store' })
      const json = await resposta.json().catch(() => null)
      if (!resposta.ok || !json?.sucesso) throw new Error(json?.erro || 'Não foi possível carregar o extrato.')
      setDetalhes({ saldo: json.saldo, movimentacoes: json.movimentacoes || [] })
    } catch (error) {
      console.error('Erro ao abrir cliente:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao carregar cliente.')
    } finally {
      setCarregandoDetalhes(false)
    }
  }

  function fecharPainel() {
    setSelecionado(null)
    setDetalhes(null)
    setForm(EMPTY_AJUSTE)
    setMensagem('')
  }

  async function salvarAjuste() {
    if (!selecionado) return
    const valor = numero(form.valor)
    if (!Number.isFinite(valor) || valor <= 0) {
      setErro('Informe um valor maior que zero.')
      return
    }
    if (!form.motivo.trim()) {
      setErro('Informe o motivo do ajuste.')
      return
    }
    try {
      setErro('')
      setMensagem('')
      setSalvando(true)
      const resposta = await fetch('/api/admin/saldos/creditar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId: selecionado.cliente_id, valor, operacao: form.operacao, motivo: form.motivo, descricao: form.descricao, adminId: extrairUsuarioId(admin) }),
      })
      const json = await resposta.json().catch(() => null)
      if (!resposta.ok || !json?.sucesso) throw new Error(json?.erro || 'Não foi possível salvar o ajuste.')
      setMensagem(form.operacao === 'credito' ? 'Crédito lançado com sucesso.' : 'Débito lançado com sucesso.')
      setForm(EMPTY_AJUSTE)
      await carregarClientes()
      await abrirCliente(selecionado, true)
    } catch (error) {
      console.error('Erro ao salvar ajuste:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao salvar ajuste.')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <main className="pageShell loadingShell">
        <style>{styles}</style>
        <div className="loadingCard"><img src="/logo-prussik-display.png" alt="PrussikTrails" /><strong>Carregando saldos...</strong><span>Organizando a carteira dos clientes.</span></div>
      </main>
    )
  }

  return (
    <main className="pageShell">
      <style>{styles}</style>

      <header className="topBar">
        <button type="button" className="brandBlock" onClick={() => router.push('/admin/dashboard')} aria-label="Voltar para dashboard admin">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div><h1>PrussikTrails Admin</h1><p>Saldos e reembolsos dos clientes</p></div>
        </button>
        <div className="topActions">
          <button type="button" onClick={() => router.push('/admin/dashboard')}>Dashboard</button>
          <button type="button" onClick={atualizarTudo} disabled={atualizando}>{atualizando ? 'Atualizando...' : 'Atualizar'}</button>
        </div>
      </header>

      <section className="heroCard">
        <div className="heroTextBlock">
          <span className="eyebrow">Gestão financeira</span>
          <h2>Saldo de Jornada dos clientes</h2>
          <p>Controle créditos gerados por cancelamentos, ajustes administrativos, solicitações de reembolso e valores que poderão ser usados em novas experiências.</p>
        </div>
        <div className="heroStats">
          <article><strong>{estatisticas.totalClientes}</strong><span>clientes listados</span></article>
          <article><strong>{formatarMoeda(estatisticas.totalDisponivel)}</strong><span>saldo disponível</span></article>
          <article><strong>{formatarMoeda(estatisticas.maiorSaldo)}</strong><span>maior saldo</span></article>
          <article><strong>{estatisticas.reembolsosPendentes}</strong><span>reembolso(s) em análise</span></article>
        </div>
      </section>

      {erro && <div className="alert errorAlert">{erro}</div>}
      {mensagem && <div className="alert successAlert">{mensagem}</div>}

      <section className="filtersCard">
        <label className="searchBox"><span>Buscar cliente</span><input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Nome, e-mail ou ID do cliente" /></label>
        <div className="toggleBox">
          <button type="button" className={somenteComSaldo ? 'active' : ''} onClick={() => setSomenteComSaldo(true)}>Com saldo</button>
          <button type="button" className={!somenteComSaldo ? 'active' : ''} onClick={() => setSomenteComSaldo(false)}>Todos</button>
        </div>
      </section>

      <section className="reembolsoCard">
        <div className="sectionHead reembolsoHead">
          <div><span className="sectionKicker">Saídas de saldo</span><h3>Solicitações de reembolso</h3><p>Pedidos de clientes para reembolso do Saldo de Jornada. Registre pagamento apenas após conferir PIX e saldo disponível.</p></div>
          <div className="toggleBox compactToggle" aria-label="Filtrar reembolsos por status">
            {filtrosReembolso.map((item) => (<button key={item.value} type="button" className={filtroReembolso === item.value ? 'active' : ''} onClick={() => setFiltroReembolso(item.value)}>{item.label}</button>))}
          </div>
        </div>
        {carregandoReembolsos ? <div className="emptyState small">Carregando solicitações...</div> : reembolsos.length === 0 ? <div className="emptyState small">Nenhuma solicitação de reembolso neste filtro.</div> : (
          <div className="reembolsoList">
            {reembolsos.slice(0, 10).map((reembolso) => {
              const status = normalizar(reembolso.status || 'pendente')
              const processando = processandoReembolsoId === reembolso.id
              return (
                <article key={reembolso.id} className="reembolsoItem">
                  <div className="avatar">{reembolso.cliente_avatar ? <img src={reembolso.cliente_avatar} alt="Cliente" /> : <span>{iniciais(reembolso.cliente_nome, reembolso.cliente_email)}</span>}</div>
                  <div className="reembolsoInfo"><strong>{reembolso.cliente_nome || 'Cliente'}</strong><span>{reembolso.cliente_email || reembolso.cliente_id}</span><small>PIX {reembolso.pix_tipo || '—'} · {reembolso.chave_pix || 'chave não informada'}</small><small>Titular: {reembolso.titular_nome || '—'}</small>{reembolso.motivo && <small>Motivo: {reembolso.motivo}</small>}</div>
                  <div className="reembolsoMeta"><strong>{formatarMoeda(reembolso.valor_solicitado)}</strong><span className={`statusPill status-${status}`}>{labelStatusReembolso(reembolso.status)}</span><small>{formatarDataHora(reembolso.created_at || reembolso.updated_at)}</small></div>
                  <div className="reembolsoActions">
                    {(status === 'pendente' || status === 'em_analise') && <><button type="button" className="approve" onClick={() => processarReembolso(reembolso, 'aprovar')} disabled={processando}>Aprovar</button><button type="button" className="danger" onClick={() => processarReembolso(reembolso, 'recusar')} disabled={processando}>Recusar</button></>}
                    {(status === 'aprovado' || status === 'pendente' || status === 'em_analise') && <button type="button" className="pay" onClick={() => abrirPagamentoReembolso(reembolso)} disabled={processando}>Registrar pagamento</button>}
                    {reembolso.comprovante_url && <a href={reembolso.comprovante_url} target="_blank" rel="noreferrer">Ver comprovante</a>}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="contentGrid">
        <div className="listCard">
          <div className="sectionHead"><div><span className="sectionKicker">Carteira dos clientes</span><h3>Clientes</h3><p>Selecione um cliente para ver o extrato e lançar ajustes administrativos.</p></div></div>
          {clientes.length === 0 ? <div className="emptyState">Nenhum saldo encontrado para os filtros atuais.</div> : (
            <div className="clienteList">
              {clientes.map((cliente) => {
                const ativo = selecionado?.cliente_id === cliente.cliente_id
                return (
                  <button key={cliente.cliente_id} type="button" className={`clienteRow ${ativo ? 'active' : ''}`} onClick={() => abrirCliente(cliente)}>
                    <div className="avatar">{cliente.cliente_avatar ? <img src={cliente.cliente_avatar} alt="Cliente" /> : <span>{iniciais(cliente.cliente_nome, cliente.cliente_email)}</span>}</div>
                    <div className="clienteInfo"><strong>{cliente.cliente_nome || 'Cliente'}</strong><span>{cliente.cliente_email || cliente.cliente_id}</span></div>
                    <div className="clienteSaldo"><strong>{formatarMoeda(cliente.saldo_disponivel)}</strong><span>disponível</span></div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <aside className={`detailCard ${selecionado ? 'open' : ''}`}>
          {!selecionado ? <div className="emptyDetail"><span>💳</span><h3>Selecione um cliente</h3><p>O extrato, o saldo e os ajustes administrativos aparecerão aqui.</p></div> : (
            <>
              <div className="detailHeader"><div><p>Cliente selecionado</p><h3>{selecionado.cliente_nome || 'Cliente'}</h3><span>{selecionado.cliente_email || selecionado.cliente_id}</span></div><button type="button" onClick={fecharPainel} aria-label="Fechar">×</button></div>
              <div className="saldoBigCard"><span>Saldo disponível</span><strong>{formatarMoeda(detalhes?.saldo?.saldo_disponivel ?? selecionado.saldo_disponivel)}</strong><small>Última atualização: {formatarDataHora(detalhes?.saldo?.updated_at || selecionado.updated_at)}</small></div>
              <div className="ajusteCard">
                <div className="sectionMiniHead"><h4>Ajuste administrativo</h4><p>Lance crédito ou débito manual no saldo do cliente.</p></div>
                <div className="operationSwitch"><button type="button" className={form.operacao === 'credito' ? 'active' : ''} onClick={() => setForm((prev) => ({ ...prev, operacao: 'credito' }))}>Crédito</button><button type="button" className={form.operacao === 'debito' ? 'active debit' : ''} onClick={() => setForm((prev) => ({ ...prev, operacao: 'debito' }))}>Débito</button></div>
                <label>Valor<input value={form.valor} onChange={(event) => setForm((prev) => ({ ...prev, valor: event.target.value }))} placeholder="Ex.: 120,00" inputMode="decimal" /></label>
                <label>Motivo obrigatório<input value={form.motivo} onChange={(event) => setForm((prev) => ({ ...prev, motivo: event.target.value }))} placeholder="Ex.: ajuste administrativo, caso especial..." /></label>
                <label>Descrição interna<textarea value={form.descricao} onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))} placeholder="Observação para auditoria interna" rows={3} /></label>
                <button type="button" className={`saveButton ${form.operacao === 'debito' ? 'debit' : ''}`} onClick={salvarAjuste} disabled={salvando}>{salvando ? 'Salvando...' : form.operacao === 'credito' ? 'Lançar crédito' : 'Lançar débito'}</button>
              </div>
              <div className="extratoCard">
                <div className="sectionMiniHead"><h4>Extrato</h4><p>Últimas movimentações da carteira do cliente.</p></div>
                {carregandoDetalhes ? <div className="emptyState small">Carregando extrato...</div> : (detalhes?.movimentacoes || []).length === 0 ? <div className="emptyState small">Nenhuma movimentação encontrada.</div> : (
                  <div className="extratoList">
                    {(detalhes?.movimentacoes || []).map((mov) => {
                      const valor = numero(mov.valor)
                      const positivo = valor >= 0
                      return <article key={mov.id} className="extratoItem"><div><strong>{normalizarTipo(mov.tipo)}</strong><span>{mov.descricao || mov.motivo || 'Sem descrição'}</span><small>{formatarDataHora(mov.created_at)} · {normalizarStatusMov(mov.status)}</small></div><strong className={positivo ? 'positive' : 'negative'}>{positivo ? '+' : ''}{formatarMoeda(valor)}</strong></article>
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </section>

      {modalPagamentoReembolso && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <section className="modalCard">
            <div className="modalHeader"><div><span>Reembolso do cliente</span><h3>Registrar pagamento</h3><p>{modalPagamentoReembolso.reembolso.cliente_nome || 'Cliente'} · valor solicitado: {formatarMoeda(modalPagamentoReembolso.reembolso.valor_solicitado)}</p></div><button type="button" onClick={() => setModalPagamentoReembolso(null)} disabled={processandoReembolsoId === modalPagamentoReembolso.reembolso.id} aria-label="Fechar modal">×</button></div>
            <div className="pixBox"><strong>PIX informado pelo cliente</strong><span>Tipo: {modalPagamentoReembolso.reembolso.pix_tipo || '—'}</span><span>Chave: {modalPagamentoReembolso.reembolso.chave_pix || '—'}</span><span>Titular: {modalPagamentoReembolso.reembolso.titular_nome || '—'}</span><small>Confira se a chave PIX está no nome do cliente antes de registrar o pagamento.</small></div>
            <label className="modalField">Referência do pagamento<input value={modalPagamentoReembolso.referencia} onChange={(event) => setModalPagamentoReembolso((prev) => prev ? { ...prev, referencia: event.target.value } : prev)} placeholder="Link, ID da transação, comprovante ou observação curta" /></label>
            <label className="modalField">Anexar comprovante<input type="file" accept="image/*,.pdf" onChange={(event: ChangeEvent<HTMLInputElement>) => setModalPagamentoReembolso((prev) => prev ? { ...prev, arquivo: event.target.files?.[0] || null } : prev)} /><small>PDF, print ou imagem do comprovante. Máximo recomendado: 10 MB.</small></label>
            <label className="modalField">Observação administrativa<textarea value={modalPagamentoReembolso.observacao} onChange={(event) => setModalPagamentoReembolso((prev) => prev ? { ...prev, observacao: event.target.value } : prev)} rows={4} /></label>
            <div className="modalActions"><button type="button" className="secondary" onClick={() => setModalPagamentoReembolso(null)} disabled={processandoReembolsoId === modalPagamentoReembolso.reembolso.id}>Cancelar</button><button type="button" className="primary" onClick={confirmarPagamentoReembolso} disabled={processandoReembolsoId === modalPagamentoReembolso.reembolso.id}>{processandoReembolsoId === modalPagamentoReembolso.reembolso.id ? 'Registrando...' : 'Confirmar pagamento'}</button></div>
          </section>
        </div>
      )}
    </main>
  )
}

const styles = `
  *{box-sizing:border-box}body{margin:0;background:#f6f7f1;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}button,input,textarea{font:inherit}.pageShell{min-height:100vh;color:#0f172a;background:radial-gradient(circle at 0% 0%,rgba(34,197,94,.10),transparent 30%),radial-gradient(circle at 100% 0%,rgba(59,130,246,.10),transparent 30%),linear-gradient(180deg,#f8fafc 0%,#eef2f7 100%);padding:22px 18px 56px}.loadingShell{display:flex;align-items:center;justify-content:center}.loadingCard{width:min(360px,100%);border-radius:32px;background:rgba(255,255,255,.86);border:1px solid rgba(15,23,42,.08);box-shadow:0 26px 70px rgba(15,23,42,.12);padding:26px;display:grid;justify-items:center;gap:8px;color:#0f172a}.loadingCard img{height:52px;width:auto}.loadingCard strong{font-size:18px;font-weight:950}.loadingCard span{color:#64748b;font-size:13px;font-weight:750}.topBar,.heroCard,.filtersCard,.reembolsoCard,.contentGrid,.alert{max-width:1180px;margin-left:auto;margin-right:auto}.topBar{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:24px}.brandBlock{border:0;background:transparent;padding:0;display:flex;align-items:center;gap:12px;text-align:left;color:inherit;cursor:pointer;min-width:0}.brandBlock img{height:42px;width:auto;display:block;filter:drop-shadow(0 8px 18px rgba(15,23,42,.08));flex:0 0 auto}.brandBlock h1{margin:0;color:#0f172a;font-size:clamp(28px,4vw,42px);line-height:.95;font-weight:950;letter-spacing:-.075em}.brandBlock p{margin:6px 0 0;color:#64748b;font-size:11px;font-weight:950;letter-spacing:.14em;text-transform:uppercase}.topActions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}.topActions button,.toggleBox button,.reembolsoActions button,.reembolsoActions a,.modalActions button{border:1px solid rgba(15,23,42,.10);background:rgba(255,255,255,.78);color:#0f172a;border-radius:999px;padding:11px 15px;font-size:12px;font-weight:950;cursor:pointer;text-decoration:none;transition:.18s ease;white-space:nowrap}.topActions button:hover,.toggleBox button:hover,.reembolsoActions button:hover,.reembolsoActions a:hover,.modalActions button:hover{transform:translateY(-1px);box-shadow:0 14px 28px rgba(15,23,42,.10)}button:disabled{opacity:.58;cursor:not-allowed;transform:none!important;box-shadow:none!important}.heroCard{border-radius:38px;background:radial-gradient(circle at 100% 0%,rgba(212,179,90,.14),transparent 34%),rgba(255,255,255,.78);border:1px solid rgba(15,23,42,.08);box-shadow:0 26px 70px rgba(15,23,42,.10);padding:28px;display:grid;grid-template-columns:minmax(0,1fr) 480px;gap:26px;align-items:center}.eyebrow,.sectionKicker{display:block;color:#b91c1c;font-size:11px;font-weight:950;letter-spacing:.18em;text-transform:uppercase;margin-bottom:12px}.heroCard h2{margin:0;color:#0f172a;font-size:clamp(40px,5.8vw,64px);line-height:.90;font-weight:950;letter-spacing:-.085em}.heroCard p{margin:18px 0 0;color:#4b6353;font-size:15px;line-height:1.55;font-weight:760;max-width:680px}.heroStats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.heroStats article{min-height:82px;border-radius:22px;background:rgba(255,253,247,.78);border:1px solid rgba(15,23,42,.08);padding:15px;display:flex;flex-direction:column;justify-content:center}.heroStats strong{color:#0f172a;font-size:22px;line-height:1;font-weight:950;letter-spacing:-.05em}.heroStats span{margin-top:8px;color:#64748b;font-size:10px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.alert{margin-top:14px;border-radius:20px;padding:13px 16px;font-size:13px;font-weight:850}.errorAlert{background:rgba(153,27,27,.08);border:1px solid rgba(153,27,27,.18);color:#7f1d1d}.successAlert{background:rgba(22,163,74,.09);border:1px solid rgba(22,163,74,.18);color:#166534}.filtersCard{margin-top:18px;border-radius:30px;background:rgba(255,255,255,.82);border:1px solid rgba(15,23,42,.08);box-shadow:0 18px 46px rgba(15,23,42,.08);padding:14px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:end}.searchBox,.modalField,.ajusteCard label{display:grid;gap:7px;color:#0f172a;font-size:12px;font-weight:950}.searchBox input,.modalField input,.modalField textarea,.ajusteCard input,.ajusteCard textarea{width:100%;border:1px solid rgba(15,23,42,.10);background:rgba(255,253,247,.86);color:#0f172a;border-radius:20px;padding:13px 14px;outline:none;font-size:13px;font-weight:760}.searchBox input{border-radius:999px}.searchBox input:focus,.modalField input:focus,.modalField textarea:focus,.ajusteCard input:focus,.ajusteCard textarea:focus{border-color:#84cc16;box-shadow:0 0 0 4px rgba(34,197,94,.14)}.toggleBox{display:inline-flex;align-items:center;gap:5px;border-radius:999px;background:rgba(238,242,229,.95);padding:5px;width:fit-content}.toggleBox button{border:0;background:transparent;box-shadow:none;padding:10px 14px}.toggleBox button.active{background:#0f172a;color:#ffffff;box-shadow:0 12px 24px rgba(15,23,42,.12)}.reembolsoCard,.listCard,.detailCard{background:rgba(255,255,255,.82);border:1px solid rgba(15,23,42,.08);box-shadow:0 18px 46px rgba(15,23,42,.08);border-radius:32px;overflow:hidden}.reembolsoCard{margin-top:18px}.sectionHead{padding:20px;border-bottom:1px solid rgba(15,23,42,.07);display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.sectionHead h3{margin:0;color:#0f172a;font-size:25px;line-height:.95;font-weight:950;letter-spacing:-.055em}.sectionHead p{margin:8px 0 0;color:#64748b;font-size:12px;line-height:1.5;font-weight:760}.compactToggle{max-width:100%;overflow-x:auto;justify-content:flex-start}.compactToggle button{padding:9px 13px;text-transform:none}.reembolsoList{display:grid;gap:10px;padding:16px}.reembolsoItem{display:grid;grid-template-columns:48px minmax(0,1.2fr) minmax(150px,.45fr) minmax(220px,.55fr);align-items:center;gap:14px;border-radius:24px;background:rgba(255,253,247,.86);border:1px solid rgba(15,23,42,.07);padding:12px}.avatar{width:48px;height:48px;border-radius:18px;background:#0f172a;color:#ffffff;display:flex;align-items:center;justify-content:center;font-weight:950;font-size:14px;overflow:hidden;flex:0 0 auto}.avatar img{width:100%;height:100%;object-fit:cover;display:block}.reembolsoInfo,.clienteInfo{min-width:0;display:grid;gap:3px}.reembolsoInfo strong,.clienteInfo strong{color:#0f172a;font-size:14px;font-weight:950;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.reembolsoInfo span,.clienteInfo span,.reembolsoInfo small,.reembolsoMeta small,.clienteSaldo span{color:#64748b;font-size:11px;line-height:1.35;font-weight:760;overflow:hidden;text-overflow:ellipsis}.reembolsoMeta{min-width:0;display:grid;gap:6px;justify-items:start}.reembolsoMeta strong{color:#0f172a;font-size:18px;font-weight:950;letter-spacing:-.04em}.statusPill{border-radius:999px;padding:6px 9px;font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.05em;background:#eef2f7;color:#475569}.status-pendente,.status-em_analise,.status-aprovado{background:#fef3c7;color:#92400e}.status-pago{background:#dcfce7;color:#166534}.status-recusado{background:#fee2e2;color:#991b1b}.reembolsoActions{display:flex;flex-wrap:wrap;gap:7px;justify-content:flex-end}.reembolsoActions button,.reembolsoActions a{padding:8px 10px;font-size:11px}.reembolsoActions .approve{background:#ecfdf5;color:#166534;border-color:rgba(22,163,74,.18)}.reembolsoActions .danger{background:#fee2e2;color:#991b1b;border-color:rgba(153,27,27,.16)}.reembolsoActions .pay,.modalActions .primary{background:#0f172a;color:#ffffff;border-color:#0f172a}.contentGrid{margin-top:18px;display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:16px;align-items:start}.clienteList{display:grid;gap:10px;padding:16px}.clienteRow{width:100%;border:1px solid rgba(15,23,42,.07);background:rgba(255,253,247,.86);border-radius:24px;padding:12px;display:grid;grid-template-columns:48px minmax(0,1fr) auto;align-items:center;gap:12px;cursor:pointer;text-align:left;transition:.18s ease}.clienteRow:hover,.clienteRow.active{transform:translateY(-1px);border-color:rgba(15,23,42,.18);box-shadow:0 14px 30px rgba(15,23,42,.08)}.clienteRow.active{background:#f0fdf4}.clienteSaldo{text-align:right;display:grid;gap:3px}.clienteSaldo strong{color:#0f172a;font-size:15px;font-weight:950;white-space:nowrap}.detailCard{position:sticky;top:18px;max-height:calc(100dvh - 36px);overflow:auto}.emptyDetail,.emptyState{min-height:180px;padding:28px;display:grid;justify-items:center;align-content:center;text-align:center;gap:8px;color:#64748b;font-size:13px;line-height:1.45;font-weight:760}.emptyState.small{min-height:96px;margin:16px;border-radius:22px;background:rgba(255,253,247,.72);border:1px dashed rgba(15,23,42,.18)}.emptyDetail span{font-size:38px}.emptyDetail h3{margin:0;color:#0f172a;font-size:25px;font-weight:950;letter-spacing:-.05em}.emptyDetail p{margin:0;max-width:270px}.detailHeader{padding:20px;border-bottom:1px solid rgba(15,23,42,.07);display:flex;justify-content:space-between;gap:12px}.detailHeader p{margin:0 0 6px;color:#b91c1c;font-size:10px;font-weight:950;letter-spacing:.14em;text-transform:uppercase}.detailHeader h3{margin:0;color:#0f172a;font-size:25px;line-height:1;font-weight:950;letter-spacing:-.055em}.detailHeader span{display:block;margin-top:6px;color:#64748b;font-size:12px;font-weight:750;overflow-wrap:anywhere}.detailHeader button{width:38px;height:38px;border-radius:999px;border:1px solid rgba(15,23,42,.10);background:rgba(255,255,255,.8);color:#0f172a;font-size:22px;cursor:pointer}.saldoBigCard,.ajusteCard,.extratoCard{margin:16px;border-radius:26px;background:rgba(255,253,247,.82);border:1px solid rgba(15,23,42,.08);padding:16px}.saldoBigCard{background:radial-gradient(circle at 100% 0%,rgba(34,197,94,.16),transparent 36%),#0f172a;color:#ffffff}.saldoBigCard span{color:rgba(255,253,247,.70);font-size:11px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.saldoBigCard strong{display:block;margin-top:10px;color:#ffffff;font-size:36px;line-height:1;font-weight:950;letter-spacing:-.06em}.saldoBigCard small{display:block;margin-top:10px;color:rgba(255,253,247,.70);font-size:11px;font-weight:750}.sectionMiniHead h4{margin:0;color:#0f172a;font-size:18px;font-weight:950;letter-spacing:-.04em}.sectionMiniHead p{margin:5px 0 0;color:#64748b;font-size:12px;line-height:1.4;font-weight:750}.operationSwitch{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0}.operationSwitch button,.saveButton{border:1px solid rgba(15,23,42,.10);border-radius:999px;background:rgba(255,255,255,.82);color:#0f172a;padding:11px 13px;font-size:12px;font-weight:950;cursor:pointer}.operationSwitch button.active,.saveButton{background:#166534;color:#ffffff;border-color:#166534}.operationSwitch button.active.debit,.saveButton.debit{background:#991b1b;border-color:#991b1b}.ajusteCard{display:grid;gap:12px}.ajusteCard textarea,.modalField textarea{resize:vertical;min-height:88px}.extratoList{display:grid;gap:10px;margin-top:14px}.extratoItem{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;border-radius:20px;border:1px solid rgba(15,23,42,.07);background:rgba(255,255,255,.72);padding:12px}.extratoItem div{min-width:0;display:grid;gap:3px}.extratoItem strong:first-child{color:#0f172a;font-size:13px;font-weight:950}.extratoItem span,.extratoItem small{color:#64748b;font-size:11px;line-height:1.35;font-weight:760}.extratoItem>strong{white-space:nowrap;font-size:13px;font-weight:950}.positive{color:#166534}.negative{color:#991b1b}.modalOverlay{position:fixed;inset:0;z-index:90;background:rgba(8,13,7,.54);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:18px}.modalCard{width:min(620px,100%);max-height:calc(100dvh - 28px);overflow:auto;border-radius:34px;background:radial-gradient(circle at 10% 0%,rgba(34,197,94,.16),transparent 32%),linear-gradient(180deg,#ffffff 0%,#f8fafc 100%);border:1px solid rgba(255,255,255,.72);box-shadow:0 34px 100px rgba(0,0,0,.28);padding:20px}.modalHeader{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.modalHeader span{color:#b91c1c;font-size:10px;font-weight:950;letter-spacing:.14em;text-transform:uppercase}.modalHeader h3{margin:8px 0 0;color:#0f172a;font-size:32px;line-height:.95;font-weight:950;letter-spacing:-.06em}.modalHeader p{margin:10px 0 0;color:#64748b;font-size:13px;line-height:1.45;font-weight:760}.modalHeader>button{width:40px;height:40px;border-radius:999px;border:1px solid rgba(15,23,42,.10);background:rgba(255,255,255,.72);color:#0f172a;font-size:24px;cursor:pointer;flex:0 0 auto}.pixBox{margin-top:16px;border-radius:24px;background:#0f172a;color:#ffffff;padding:16px;display:grid;gap:5px}.pixBox strong{font-size:14px;font-weight:950}.pixBox span,.pixBox small{color:rgba(255,253,247,.76);font-size:12px;line-height:1.45;font-weight:760;overflow-wrap:anywhere}.modalField{margin-top:14px}.modalActions{margin-top:18px;display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}.modalActions .secondary{background:rgba(255,255,255,.80);color:#0f172a}@media(max-width:1080px){.heroCard,.contentGrid{grid-template-columns:1fr}.detailCard{position:static;max-height:none}.reembolsoItem{grid-template-columns:48px minmax(0,1fr)}.reembolsoMeta,.reembolsoActions{grid-column:2;justify-content:flex-start}}@media(max-width:720px){.pageShell{padding:14px 12px 44px}.topBar{position:sticky;top:0;z-index:50;background:rgba(255,253,247,.88);backdrop-filter:blur(18px);margin:-14px -12px 16px;padding:10px 12px;border-bottom:1px solid rgba(15,23,42,.07)}.brandBlock h1{font-size:25px}.brandBlock p{display:none}.topActions button:first-child{display:none}.heroCard,.filtersCard,.reembolsoCard,.listCard,.detailCard{border-radius:28px}.heroCard{padding:22px}.heroCard h2{font-size:42px}.heroStats,.filtersCard{grid-template-columns:1fr}.toggleBox,.compactToggle{width:100%;overflow-x:auto}.toggleBox button{flex:1 0 auto}.sectionHead,.reembolsoHead{flex-direction:column;align-items:stretch}.clienteRow{grid-template-columns:44px minmax(0,1fr)}.clienteSaldo{grid-column:2;text-align:left}.reembolsoItem{grid-template-columns:44px minmax(0,1fr);gap:11px}.avatar{width:44px;height:44px;border-radius:16px}.reembolsoMeta,.reembolsoActions{grid-column:1/-1;justify-content:flex-start}.reembolsoActions button,.reembolsoActions a{flex:1 1 130px;text-align:center}.modalOverlay{align-items:flex-end;padding:10px}.modalCard{border-radius:28px;max-height:calc(100dvh - 20px)}.modalActions{flex-direction:column-reverse}.modalActions button{width:100%}}
`
