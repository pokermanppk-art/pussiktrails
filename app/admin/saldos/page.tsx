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

function extrairUsuarioId(usuario: AdminUser | null): string {
  return String(usuario?.id || usuario?.user_id || usuario?.usuario_id || '').trim()
}

function formatarMoeda(valor: unknown) {
  const numero = Number(valor || 0)

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(numero) ? numero : 0)
}

function formatarData(valor?: string | null) {
  if (!valor) return '—'

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) return '—'

  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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

function normalizarStatus(status?: string | null) {
  const mapa: Record<string, string> = {
    efetivado: 'Efetivado',
    reservado: 'Reservado',
    cancelado: 'Cancelado',
    estornado: 'Estornado',
    expirado: 'Expirado',
  }

  return mapa[String(status || '')] || String(status || '—')
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
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [form, setForm] = useState<AjusteForm>(EMPTY_AJUSTE)

  const [reembolsos, setReembolsos] = useState<ReembolsoCliente[]>([])
  const [filtroReembolso, setFiltroReembolso] = useState<'pendente' | 'em_analise' | 'aprovado' | 'pago' | 'recusado' | 'todos'>('pendente')
  const [carregandoReembolsos, setCarregandoReembolsos] = useState(false)
  const [processandoReembolsoId, setProcessandoReembolsoId] = useState('')
  const [modalPagamentoReembolso, setModalPagamentoReembolso] = useState<ModalPagamentoReembolso | null>(null)

  useEffect(() => {
    iniciar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      carregarClientes()
    }, 350)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, somenteComSaldo])

  useEffect(() => {
    if (!admin) return
    carregarReembolsos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroReembolso, admin])

  const estatisticas = useMemo(() => {
    const totalClientes = clientes.length
    const totalDisponivel = clientes.reduce(
      (acc, item) => acc + Number(item.saldo_disponivel || 0),
      0
    )
    const maiorSaldo = clientes.reduce(
      (acc, item) => Math.max(acc, Number(item.saldo_disponivel || 0)),
      0
    )

    const reembolsosPendentes = reembolsos.filter((item) => {
      const status = String(item.status || '').toLowerCase()
      return status === 'pendente' || status === 'em_analise' || status === 'aprovado'
    }).length

    const valorReembolsosPendentes = reembolsos
      .filter((item) => {
        const status = String(item.status || '').toLowerCase()
        return status === 'pendente' || status === 'em_analise' || status === 'aprovado'
      })
      .reduce((acc, item) => acc + Number(item.valor_solicitado || 0), 0)

    return {
      totalClientes,
      totalDisponivel,
      maiorSaldo,
      reembolsosPendentes,
      valorReembolsosPendentes,
    }
  }, [clientes, reembolsos])

  async function iniciar() {
    try {
      setErro('')
      setCarregando(true)

      const salvo = localStorage.getItem('user')
      const usuario = salvo ? (JSON.parse(salvo) as AdminUser) : null
      const tipo = String(usuario?.tipo || '').toLowerCase()

      if (!usuario || tipo !== 'admin') {
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

      const resposta = await fetch(`/api/admin/saldos/clientes?${params.toString()}`, {
        cache: 'no-store',
      })

      const json = await resposta.json().catch(() => null)

      if (!resposta.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível carregar os saldos.')
      }

      const lista = (json.clientes || []) as ClienteSaldo[]
      setClientes(lista)

      if (selecionado) {
        const atualizado = lista.find(
          (item) => String(item.cliente_id) === String(selecionado.cliente_id)
        )
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

      const resposta = await fetch(`/api/admin/saldos/reembolsos?${params.toString()}`, {
        cache: 'no-store',
      })

      const json = await resposta.json().catch(() => null)

      if (!resposta.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível carregar solicitações de reembolso.')
      }

      setReembolsos((json.reembolsos || []) as ReembolsoCliente[])
    } catch (error) {
      console.error('Erro ao carregar reembolsos:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao carregar reembolsos.')
    } finally {
      setCarregandoReembolsos(false)
    }
  }

  async function atualizarTudo() {
    await Promise.all([carregarClientes(), carregarReembolsos()])
  }

  async function processarReembolso(
    reembolso: ReembolsoCliente,
    acao: 'aprovar' | 'recusar'
  ) {
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
        body: JSON.stringify({
          reembolsoId: reembolso.id,
          adminId: extrairUsuarioId(admin),
          acao,
          observacaoAdmin: observacao,
        }),
      })

      const json = await resposta.json().catch(() => null)

      if (!resposta.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível processar o reembolso.')
      }

      setMensagem(acao === 'aprovar' ? 'Reembolso aprovado.' : 'Reembolso recusado.')
      await atualizarTudo()
      if (selecionado) await abrirCliente(selecionado)
    } catch (error) {
      console.error('Erro ao processar reembolso:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao processar reembolso.')
    } finally {
      setProcessandoReembolsoId('')
    }
  }

  function abrirPagamentoReembolso(reembolso: ReembolsoCliente) {
    setModalPagamentoReembolso({
      reembolso,
      referencia: reembolso.referencia_pagamento || '',
      observacao: 'Pagamento do reembolso registrado pelo Admin.',
      arquivo: null,
    })
  }

  async function enviarComprovanteReembolso(reembolsoId: string, arquivo: File | null) {
    if (!arquivo) return null

    const formData = new FormData()
    formData.append('file', arquivo)
    formData.append('reembolsoId', reembolsoId)

    const resposta = await fetch('/api/admin/saldos/reembolsos/comprovante', {
      method: 'POST',
      body: formData,
    })

    const json = await resposta.json().catch(() => null)

    if (!resposta.ok || !json?.sucesso) {
      throw new Error(json?.erro || 'Não foi possível anexar o comprovante.')
    }

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

      let comprovante: any = null

      if (arquivo) {
        comprovante = await enviarComprovanteReembolso(reembolso.id, arquivo)
      }

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

      if (!resposta.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível registrar o pagamento.')
      }

      setMensagem('Pagamento do reembolso registrado e saldo debitado com sucesso.')
      setModalPagamentoReembolso(null)
      await atualizarTudo()
      if (selecionado) await abrirCliente(selecionado)
    } catch (error) {
      console.error('Erro ao registrar pagamento do reembolso:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao registrar pagamento.')
    } finally {
      setProcessandoReembolsoId('')
    }
  }


  async function abrirCliente(cliente: ClienteSaldo) {
    try {
      setSelecionado(cliente)
      setDetalhes(null)
      setMensagem('')
      setErro('')
      setForm(EMPTY_AJUSTE)
      setCarregandoDetalhes(true)

      const params = new URLSearchParams()
      params.set('clienteId', cliente.cliente_id)

      const resposta = await fetch(`/api/cliente/saldo?${params.toString()}`, {
        cache: 'no-store',
      })

      const json = await resposta.json().catch(() => null)

      if (!resposta.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível carregar o extrato.')
      }

      setDetalhes({
        saldo: json.saldo,
        movimentacoes: json.movimentacoes || [],
      })
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

    const valor = Number(String(form.valor).replace(',', '.'))

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
        body: JSON.stringify({
          clienteId: selecionado.cliente_id,
          valor,
          operacao: form.operacao,
          motivo: form.motivo,
          descricao: form.descricao,
          adminId: extrairUsuarioId(admin),
        }),
      })

      const json = await resposta.json().catch(() => null)

      if (!resposta.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível salvar o ajuste.')
      }

      setMensagem(
        form.operacao === 'credito'
          ? 'Crédito lançado com sucesso.'
          : 'Débito lançado com sucesso.'
      )
      setForm(EMPTY_AJUSTE)
      await carregarClientes()
      await abrirCliente(selecionado)
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
        <div className="loadingCard">Carregando saldos...</div>
  
      {modalPagamentoReembolso && (
        <div className="modalOverlay">
          <section className="modalCard">
            <div className="modalHeader">
              <div>
                <span>Reembolso do cliente</span>
                <h3>Registrar pagamento</h3>
                <p>
                  {modalPagamentoReembolso.reembolso.cliente_nome || 'Cliente'} · valor solicitado: {formatarMoeda(modalPagamentoReembolso.reembolso.valor_solicitado)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalPagamentoReembolso(null)}
                disabled={processandoReembolsoId === modalPagamentoReembolso.reembolso.id}
              >
                ×
              </button>
            </div>

            <div className="pixBox">
              <strong>PIX informado pelo cliente</strong>
              <span>Tipo: {modalPagamentoReembolso.reembolso.pix_tipo || '—'}</span>
              <span>Chave: {modalPagamentoReembolso.reembolso.chave_pix || '—'}</span>
              <span>Titular: {modalPagamentoReembolso.reembolso.titular_nome || '—'}</span>
              <small>Confira se a chave PIX está no nome do cliente antes de registrar o pagamento.</small>
            </div>

            <label className="modalField">
              Referência do pagamento
              <input
                value={modalPagamentoReembolso.referencia}
                onChange={(event) =>
                  setModalPagamentoReembolso((prev) =>
                    prev ? { ...prev, referencia: event.target.value } : prev
                  )
                }
                placeholder="Link, ID da transação, comprovante ou observação curta"
              />
            </label>

            <label className="modalField">
              Anexar comprovante
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setModalPagamentoReembolso((prev) =>
                    prev ? { ...prev, arquivo: event.target.files?.[0] || null } : prev
                  )
                }
              />
              <small>PDF, print ou imagem do comprovante. Máximo recomendado: 10 MB.</small>
            </label>

            <label className="modalField">
              Observação administrativa
              <textarea
                value={modalPagamentoReembolso.observacao}
                onChange={(event) =>
                  setModalPagamentoReembolso((prev) =>
                    prev ? { ...prev, observacao: event.target.value } : prev
                  )
                }
                rows={4}
              />
            </label>

            <div className="modalActions">
              <button
                type="button"
                className="secondary"
                onClick={() => setModalPagamentoReembolso(null)}
                disabled={processandoReembolsoId === modalPagamentoReembolso.reembolso.id}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary"
                onClick={confirmarPagamentoReembolso}
                disabled={processandoReembolsoId === modalPagamentoReembolso.reembolso.id}
              >
                {processandoReembolsoId === modalPagamentoReembolso.reembolso.id ? 'Registrando...' : 'Confirmar pagamento'}
              </button>
            </div>
          </section>
        </div>
      )}

      <style jsx>{styles}</style>
      </main>
    )
  }

  return (
    <main className="pageShell">
      <header className="topBar">
        <div className="brandBlock">
          <div className="brandMark">PT</div>
          <div>
            <h1>Admin · Saldos</h1>
            <p>Carteira Prussik dos clientes</p>
          </div>
        </div>

        <div className="topActions">
          <button type="button" onClick={() => router.push('/admin/dashboard')}>
            Dashboard
          </button>
          <button type="button" onClick={atualizarTudo}>
            Atualizar
          </button>
        </div>
      </header>

      <section className="heroCard">
        <div>
          <span className="eyebrow">Gestão financeira</span>
          <h2>Saldo de Jornada dos clientes</h2>
          <p>
            Controle créditos gerados por cancelamentos, ajustes administrativos e
            valores que poderão ser usados em novas experiências.
          </p>
        </div>

        <div className="heroStats">
          <article>
            <strong>{estatisticas.totalClientes}</strong>
            <span>clientes listados</span>
          </article>
          <article>
            <strong>{formatarMoeda(estatisticas.totalDisponivel)}</strong>
            <span>saldo disponível</span>
          </article>
          <article>
            <strong>{formatarMoeda(estatisticas.maiorSaldo)}</strong>
            <span>maior saldo</span>
          </article>
          <article>
            <strong>{estatisticas.reembolsosPendentes}</strong>
            <span>reembolso(s) em análise</span>
          </article>
        </div>
      </section>

      {erro && <div className="alert errorAlert">{erro}</div>}
      {mensagem && <div className="alert successAlert">{mensagem}</div>}

      <section className="filtersCard">
        <div className="searchBox">
          <label>Buscar cliente</label>
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Nome, e-mail ou ID do cliente"
          />
        </div>

        <div className="toggleBox">
          <button
            type="button"
            className={somenteComSaldo ? 'active' : ''}
            onClick={() => setSomenteComSaldo(true)}
          >
            Com saldo
          </button>
          <button
            type="button"
            className={!somenteComSaldo ? 'active' : ''}
            onClick={() => setSomenteComSaldo(false)}
          >
            Todos
          </button>
        </div>
      </section>


      <section className="reembolsoCard">
        <div className="sectionHead">
          <div>
            <h3>Solicitações de reembolso</h3>
            <p>Pedidos de clientes para reembolso do Saldo de Jornada. Registre pagamento apenas após conferir PIX e saldo disponível.</p>
          </div>

          <div className="toggleBox compactToggle">
            {(['pendente', 'em_analise', 'aprovado', 'pago', 'recusado', 'todos'] as const).map((status) => (
              <button
                key={status}
                type="button"
                className={filtroReembolso === status ? 'active' : ''}
                onClick={() => setFiltroReembolso(status)}
              >
                {status === 'em_analise' ? 'Em análise' : status === 'todos' ? 'Todos' : status}
              </button>
            ))}
          </div>
        </div>

        {carregandoReembolsos ? (
          <div className="emptyState small">Carregando solicitações...</div>
        ) : reembolsos.length === 0 ? (
          <div className="emptyState small">Nenhuma solicitação de reembolso neste filtro.</div>
        ) : (
          <div className="reembolsoList">
            {reembolsos.slice(0, 8).map((reembolso) => {
              const status = String(reembolso.status || 'pendente').toLowerCase()
              const processando = processandoReembolsoId === reembolso.id

              return (
                <article key={reembolso.id} className="reembolsoItem">
                  <div className="avatar">
                    {reembolso.cliente_avatar ? (
                      <img src={reembolso.cliente_avatar} alt="Cliente" />
                    ) : (
                      <span>{(reembolso.cliente_nome || reembolso.cliente_email || 'C').slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>

                  <div className="reembolsoInfo">
                    <strong>{reembolso.cliente_nome || 'Cliente'}</strong>
                    <span>{reembolso.cliente_email || reembolso.cliente_id}</span>
                    <small>
                      PIX {reembolso.pix_tipo || '—'}: {reembolso.chave_pix || 'não informado'} · titular {reembolso.titular_nome || '—'}
                    </small>
                    {reembolso.motivo && <small>Motivo: {reembolso.motivo}</small>}
                  </div>

                  <div className="reembolsoValor">
                    <strong>{formatarMoeda(reembolso.valor_solicitado)}</strong>
                    <span>{status}</span>
                  </div>

                  <div className="reembolsoActions">
                    {(status === 'pendente' || status === 'em_analise') && (
                      <>
                        <button
                          type="button"
                          onClick={() => processarReembolso(reembolso, 'aprovar')}
                          disabled={processando}
                        >
                          Aprovar
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => processarReembolso(reembolso, 'recusar')}
                          disabled={processando}
                        >
                          Recusar
                        </button>
                      </>
                    )}

                    {(status === 'aprovado' || status === 'pendente' || status === 'em_analise') && (
                      <button
                        type="button"
                        className="pay"
                        onClick={() => abrirPagamentoReembolso(reembolso)}
                        disabled={processando}
                      >
                        Registrar pagamento
                      </button>
                    )}

                    {reembolso.comprovante_url && (
                      <a href={reembolso.comprovante_url} target="_blank" rel="noreferrer">
                        Ver comprovante
                      </a>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="contentGrid">
        <div className="listCard">
          <div className="sectionHead">
            <div>
              <h3>Clientes</h3>
              <p>Selecione um cliente para ver o extrato e lançar ajustes.</p>
            </div>
          </div>

          {clientes.length === 0 ? (
            <div className="emptyState">
              Nenhum saldo encontrado para os filtros atuais.
            </div>
          ) : (
            <div className="clienteList">
              {clientes.map((cliente) => {
                const ativo = selecionado?.cliente_id === cliente.cliente_id

                return (
                  <button
                    key={cliente.cliente_id}
                    type="button"
                    className={`clienteRow ${ativo ? 'active' : ''}`}
                    onClick={() => abrirCliente(cliente)}
                  >
                    <div className="avatar">
                      {cliente.cliente_avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cliente.cliente_avatar} alt="Cliente" />
                      ) : (
                        <span>
                          {(cliente.cliente_nome || cliente.cliente_email || 'C')
                            .slice(0, 1)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="clienteInfo">
                      <strong>{cliente.cliente_nome || 'Cliente'}</strong>
                      <span>{cliente.cliente_email || cliente.cliente_id}</span>
                    </div>

                    <div className="clienteSaldo">
                      <strong>{formatarMoeda(cliente.saldo_disponivel)}</strong>
                      <span>disponível</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <aside className={`detailCard ${selecionado ? 'open' : ''}`}>
          {!selecionado ? (
            <div className="emptyDetail">
              <span>💳</span>
              <h3>Selecione um cliente</h3>
              <p>O extrato e os ajustes de saldo aparecerão aqui.</p>
            </div>
          ) : (
            <>
              <div className="detailHeader">
                <div>
                  <p>Cliente selecionado</p>
                  <h3>{selecionado.cliente_nome || 'Cliente'}</h3>
                  <span>{selecionado.cliente_email || selecionado.cliente_id}</span>
                </div>
                <button type="button" onClick={fecharPainel} aria-label="Fechar">
                  ×
                </button>
              </div>

              <div className="saldoBigCard">
                <span>Saldo disponível</span>
                <strong>
                  {formatarMoeda(
                    detalhes?.saldo?.saldo_disponivel ?? selecionado.saldo_disponivel
                  )}
                </strong>
                <small>
                  Última atualização:{' '}
                  {formatarDataHora(detalhes?.saldo?.updated_at || selecionado.updated_at)}
                </small>
              </div>

              <div className="ajusteCard">
                <div className="sectionMiniHead">
                  <h4>Ajuste administrativo</h4>
                  <p>Lance crédito ou débito manual no saldo do cliente.</p>
                </div>

                <div className="operationSwitch">
                  <button
                    type="button"
                    className={form.operacao === 'credito' ? 'active' : ''}
                    onClick={() => setForm((prev) => ({ ...prev, operacao: 'credito' }))}
                  >
                    Crédito
                  </button>
                  <button
                    type="button"
                    className={form.operacao === 'debito' ? 'active debit' : ''}
                    onClick={() => setForm((prev) => ({ ...prev, operacao: 'debito' }))}
                  >
                    Débito
                  </button>
                </div>

                <label>
                  Valor
                  <input
                    value={form.valor}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, valor: event.target.value }))
                    }
                    placeholder="Ex.: 120,00"
                    inputMode="decimal"
                  />
                </label>

                <label>
                  Motivo obrigatório
                  <input
                    value={form.motivo}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, motivo: event.target.value }))
                    }
                    placeholder="Ex.: ajuste administrativo, caso especial..."
                  />
                </label>

                <label>
                  Descrição interna
                  <textarea
                    value={form.descricao}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, descricao: event.target.value }))
                    }
                    placeholder="Observação para auditoria interna"
                    rows={3}
                  />
                </label>

                <button
                  type="button"
                  className={`saveButton ${form.operacao === 'debito' ? 'debit' : ''}`}
                  onClick={salvarAjuste}
                  disabled={salvando}
                >
                  {salvando
                    ? 'Salvando...'
                    : form.operacao === 'credito'
                      ? 'Lançar crédito'
                      : 'Lançar débito'}
                </button>
              </div>

              <div className="extratoCard">
                <div className="sectionMiniHead">
                  <h4>Extrato</h4>
                  <p>Últimas movimentações da carteira do cliente.</p>
                </div>

                {carregandoDetalhes ? (
                  <div className="emptyState small">Carregando extrato...</div>
                ) : (detalhes?.movimentacoes || []).length === 0 ? (
                  <div className="emptyState small">Nenhuma movimentação encontrada.</div>
                ) : (
                  <div className="extratoList">
                    {(detalhes?.movimentacoes || []).map((mov) => {
                      const valor = Number(mov.valor || 0)
                      const positivo = valor >= 0

                      return (
                        <article key={mov.id} className="extratoItem">
                          <div>
                            <strong>{normalizarTipo(mov.tipo)}</strong>
                            <span>{mov.descricao || mov.motivo || 'Sem descrição'}</span>
                            <small>
                              {formatarDataHora(mov.created_at)} ·{' '}
                              {normalizarStatus(mov.status)}
                            </small>
                          </div>
                          <strong className={positivo ? 'positive' : 'negative'}>
                            {positivo ? '+' : ''}
                            {formatarMoeda(valor)}
                          </strong>
                        </article>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </section>


      {modalPagamentoReembolso && (
        <div className="modalOverlay">
          <section className="modalCard">
            <div className="modalHeader">
              <div>
                <span>Reembolso do cliente</span>
                <h3>Registrar pagamento</h3>
                <p>
                  {modalPagamentoReembolso.reembolso.cliente_nome || 'Cliente'} · valor solicitado: {formatarMoeda(modalPagamentoReembolso.reembolso.valor_solicitado)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalPagamentoReembolso(null)}
                disabled={processandoReembolsoId === modalPagamentoReembolso.reembolso.id}
              >
                ×
              </button>
            </div>

            <div className="pixBox">
              <strong>PIX informado pelo cliente</strong>
              <span>Tipo: {modalPagamentoReembolso.reembolso.pix_tipo || '—'}</span>
              <span>Chave: {modalPagamentoReembolso.reembolso.chave_pix || '—'}</span>
              <span>Titular: {modalPagamentoReembolso.reembolso.titular_nome || '—'}</span>
              <small>Confira se a chave PIX está no nome do cliente antes de registrar o pagamento.</small>
            </div>

            <label className="modalField">
              Referência do pagamento
              <input
                value={modalPagamentoReembolso.referencia}
                onChange={(event) =>
                  setModalPagamentoReembolso((prev) =>
                    prev ? { ...prev, referencia: event.target.value } : prev
                  )
                }
                placeholder="Link, ID da transação, comprovante ou observação curta"
              />
            </label>

            <label className="modalField">
              Anexar comprovante
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setModalPagamentoReembolso((prev) =>
                    prev ? { ...prev, arquivo: event.target.files?.[0] || null } : prev
                  )
                }
              />
              <small>PDF, print ou imagem do comprovante. Máximo recomendado: 10 MB.</small>
            </label>

            <label className="modalField">
              Observação administrativa
              <textarea
                value={modalPagamentoReembolso.observacao}
                onChange={(event) =>
                  setModalPagamentoReembolso((prev) =>
                    prev ? { ...prev, observacao: event.target.value } : prev
                  )
                }
                rows={4}
              />
            </label>

            <div className="modalActions">
              <button
                type="button"
                className="secondary"
                onClick={() => setModalPagamentoReembolso(null)}
                disabled={processandoReembolsoId === modalPagamentoReembolso.reembolso.id}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary"
                onClick={confirmarPagamentoReembolso}
                disabled={processandoReembolsoId === modalPagamentoReembolso.reembolso.id}
              >
                {processandoReembolsoId === modalPagamentoReembolso.reembolso.id ? 'Registrando...' : 'Confirmar pagamento'}
              </button>
            </div>
          </section>
        </div>
      )}

      <style jsx>{styles}</style>
    </main>
  )
}

const styles = `
  .pageShell {
    min-height: 100vh;
    padding: 26px;
    color: #18231b;
    background:
      radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.13), transparent 30%),
      radial-gradient(circle at 90% 12%, rgba(251, 146, 60, 0.11), transparent 32%),
      linear-gradient(180deg, #fffdf7 0%, #f3f5ea 50%, #eef2e5 100%);
    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .loadingShell {
    display: grid;
    place-items: center;
  }

  .loadingCard {
    border-radius: 26px;
    background: rgba(255, 253, 247, 0.88);
    border: 1px solid rgba(62, 74, 45, 0.12);
    box-shadow: 0 24px 70px rgba(39, 50, 31, 0.10);
    padding: 28px 32px;
    color: #27321f;
    font-weight: 900;
  }

  .topBar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 0 auto 22px;
    max-width: 1420px;
  }

  .brandBlock {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .brandMark {
    width: 44px;
    height: 44px;
    border-radius: 16px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    background: #203c2e;
    color: #fffdf7;
    font-weight: 950;
    letter-spacing: -0.08em;
    box-shadow: 0 14px 32px rgba(32, 60, 46, 0.18);
  }

  .brandBlock h1 {
    margin: 0;
    color: #203c2e;
    font-size: clamp(25px, 3.4vw, 42px);
    font-weight: 950;
    line-height: 0.95;
    letter-spacing: -0.06em;
  }

  .brandBlock p {
    margin: 6px 0 0;
    color: #7b8372;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.13em;
  }

  .topActions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .topActions button,
  .filtersCard button,
  .detailHeader button {
    border: 1px solid rgba(62, 74, 45, 0.14);
    border-radius: 999px;
    background: rgba(255, 253, 247, 0.82);
    color: #27321f;
    cursor: pointer;
    font-size: 13px;
    font-weight: 950;
    padding: 11px 15px;
    transition: 0.18s ease;
  }

  .topActions button:hover,
  .filtersCard button:hover,
  .detailHeader button:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 28px rgba(39, 50, 31, 0.10);
  }

  .heroCard,
  .filtersCard,
  .listCard,
  .detailCard {
    border-radius: 32px;
    background: rgba(255, 253, 247, 0.90);
    border: 1px solid rgba(62, 74, 45, 0.10);
    box-shadow: 0 24px 70px rgba(39, 50, 31, 0.08);
  }

  .heroCard {
    max-width: 1420px;
    margin: 0 auto 18px;
    padding: 26px;
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(340px, 0.8fr);
    gap: 22px;
    align-items: center;
  }

  .eyebrow {
    display: inline-flex;
    color: #991b1b;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .heroCard h2 {
    margin: 0;
    color: #203c2e;
    font-size: clamp(32px, 5vw, 64px);
    line-height: 0.94;
    font-weight: 950;
    letter-spacing: -0.065em;
  }

  .heroCard p {
    margin: 14px 0 0;
    color: rgba(32, 60, 46, 0.70);
    font-size: 15px;
    font-weight: 750;
    line-height: 1.55;
    max-width: 780px;
  }

  .heroStats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .heroStats article {
    border-radius: 24px;
    padding: 16px;
    background: linear-gradient(180deg, rgba(255,255,255,0.80), rgba(243,245,234,0.78));
    border: 1px solid rgba(62, 74, 45, 0.10);
  }

  .heroStats strong {
    display: block;
    color: #203c2e;
    font-size: 20px;
    line-height: 1.1;
    font-weight: 950;
    word-break: break-word;
  }

  .heroStats span {
    display: block;
    margin-top: 6px;
    color: #64705f;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .alert {
    max-width: 1420px;
    margin: 0 auto 14px;
    border-radius: 18px;
    padding: 13px 16px;
    font-size: 13px;
    font-weight: 850;
  }

  .errorAlert {
    background: rgba(153, 27, 27, 0.08);
    color: #7f1d1d;
    border: 1px solid rgba(153, 27, 27, 0.18);
  }

  .successAlert {
    background: rgba(32, 60, 46, 0.08);
    color: #203c2e;
    border: 1px solid rgba(32, 60, 46, 0.18);
  }

  .filtersCard {
    max-width: 1420px;
    margin: 0 auto 18px;
    padding: 16px;
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 14px;
  }

  .searchBox {
    flex: 1;
    min-width: 0;
  }

  label,
  .searchBox label {
    display: grid;
    gap: 7px;
    color: #27321f;
    font-size: 12px;
    font-weight: 950;
  }

  input,
  textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid rgba(62, 74, 45, 0.12);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.76);
    color: #172018;
    font: inherit;
    font-size: 14px;
    font-weight: 750;
    outline: none;
    padding: 13px 14px;
  }

  textarea {
    resize: vertical;
    min-height: 84px;
  }

  input:focus,
  textarea:focus {
    border-color: rgba(32, 60, 46, 0.38);
    box-shadow: 0 0 0 4px rgba(32, 60, 46, 0.07);
  }

  .toggleBox,
  .operationSwitch {
    display: inline-flex;
    border-radius: 999px;
    background: rgba(232, 226, 213, 0.50);
    border: 1px solid rgba(62, 74, 45, 0.10);
    padding: 4px;
    gap: 4px;
  }

  .toggleBox button,
  .operationSwitch button {
    box-shadow: none;
    border: 0;
    background: transparent;
    padding: 10px 14px;
  }

  .toggleBox button.active,
  .operationSwitch button.active {
    background: #203c2e;
    color: #fffdf7;
  }

  .operationSwitch button.active.debit {
    background: #991b1b;
  }

  .contentGrid {
    max-width: 1420px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 470px;
    gap: 18px;
    align-items: start;
  }

  .listCard,
  .detailCard {
    padding: 20px;
    min-width: 0;
  }

  .detailCard {
    position: sticky;
    top: 18px;
  }

  .sectionHead,
  .detailHeader,
  .sectionMiniHead {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
    margin-bottom: 16px;
  }

  .sectionHead h3,
  .detailHeader h3,
  .sectionMiniHead h4 {
    margin: 0;
    color: #172018;
    font-size: 24px;
    font-weight: 950;
    letter-spacing: -0.045em;
  }

  .sectionHead p,
  .detailHeader p,
  .detailHeader span,
  .sectionMiniHead p {
    margin: 4px 0 0;
    color: #687565;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.4;
  }

  .detailHeader button {
    width: 38px;
    height: 38px;
    padding: 0;
    font-size: 24px;
    line-height: 1;
  }

  .clienteList {
    display: grid;
    gap: 10px;
  }

  .clienteRow {
    width: 100%;
    border: 1px solid rgba(62, 74, 45, 0.10);
    border-radius: 24px;
    background: rgba(255,255,255,0.62);
    display: grid;
    grid-template-columns: 54px minmax(0, 1fr) auto;
    align-items: center;
    gap: 13px;
    padding: 12px;
    text-align: left;
    cursor: pointer;
    transition: 0.18s ease;
  }

  .clienteRow:hover,
  .clienteRow.active {
    transform: translateY(-1px);
    border-color: rgba(32, 60, 46, 0.24);
    box-shadow: 0 16px 34px rgba(39, 50, 31, 0.09);
    background: rgba(255,255,255,0.82);
  }

  .avatar {
    width: 54px;
    height: 54px;
    border-radius: 18px;
    background: #203c2e;
    display: grid;
    place-items: center;
    overflow: hidden;
    color: #fffdf7;
    font-size: 20px;
    font-weight: 950;
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .clienteInfo {
    min-width: 0;
  }

  .clienteInfo strong,
  .clienteSaldo strong {
    display: block;
    color: #172018;
    font-size: 14px;
    font-weight: 950;
    overflow-wrap: anywhere;
  }

  .clienteInfo span,
  .clienteSaldo span {
    display: block;
    margin-top: 3px;
    color: #64705f;
    font-size: 11px;
    font-weight: 800;
    overflow-wrap: anywhere;
  }

  .clienteSaldo {
    text-align: right;
  }

  .clienteSaldo strong {
    color: #203c2e;
  }

  .saldoBigCard,
  .ajusteCard,
  .extratoCard {
    border-radius: 26px;
    background: rgba(255,255,255,0.64);
    border: 1px solid rgba(62, 74, 45, 0.10);
    padding: 16px;
    margin-bottom: 14px;
  }

  .saldoBigCard span,
  .saldoBigCard small {
    display: block;
    color: #64705f;
    font-size: 12px;
    font-weight: 850;
  }

  .saldoBigCard strong {
    display: block;
    color: #203c2e;
    font-size: 34px;
    font-weight: 950;
    letter-spacing: -0.055em;
    margin: 8px 0;
  }

  .ajusteCard {
    display: grid;
    gap: 12px;
  }

  .operationSwitch {
    width: fit-content;
  }

  .saveButton {
    border: 0;
    border-radius: 999px;
    background: #203c2e;
    color: #fffdf7;
    padding: 14px 18px;
    font-size: 14px;
    font-weight: 950;
    cursor: pointer;
    box-shadow: 0 16px 32px rgba(32, 60, 46, 0.18);
  }

  .saveButton.debit {
    background: #991b1b;
  }

  .saveButton:disabled {
    opacity: 0.62;
    cursor: not-allowed;
  }

  .extratoList {
    display: grid;
    gap: 9px;
  }

  .extratoItem {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: start;
    border-radius: 18px;
    background: rgba(243,245,234,0.62);
    border: 1px solid rgba(62, 74, 45, 0.08);
    padding: 12px;
  }

  .extratoItem strong {
    display: block;
    color: #172018;
    font-size: 12px;
    font-weight: 950;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  .extratoItem span,
  .extratoItem small {
    display: block;
    margin-top: 4px;
    color: #64705f;
    font-size: 11px;
    font-weight: 780;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  .extratoItem .positive {
    color: #166534;
    white-space: nowrap;
  }

  .extratoItem .negative {
    color: #991b1b;
    white-space: nowrap;
  }

  .emptyState,
  .emptyDetail {
    border-radius: 24px;
    background: rgba(255,255,255,0.52);
    border: 1px dashed rgba(62, 74, 45, 0.18);
    color: #64705f;
    padding: 24px;
    text-align: center;
    font-size: 13px;
    font-weight: 850;
  }

  .emptyState.small {
    padding: 16px;
  }

  .emptyDetail {
    min-height: 360px;
    display: grid;
    place-items: center;
    align-content: center;
  }

  .emptyDetail span {
    font-size: 40px;
  }

  .emptyDetail h3 {
    margin: 10px 0 0;
    color: #203c2e;
    font-size: 24px;
    font-weight: 950;
    letter-spacing: -0.04em;
  }

  .emptyDetail p {
    margin: 6px 0 0;
    max-width: 260px;
    color: #64705f;
    line-height: 1.45;
  }

  @media (max-width: 1080px) {
    .heroCard,
    .contentGrid {
      grid-template-columns: 1fr;
    }

    .reembolsoItem {
      grid-template-columns: 46px minmax(0, 1fr);
    }

    .reembolsoValor,
    .reembolsoActions {
      grid-column: 2;
      text-align: left;
      justify-content: flex-start;
    }

    .detailCard {
      position: static;
    }
  }

  @media (max-width: 720px) {
    .pageShell {
      padding: 14px;
    }

    .topBar,
    .filtersCard {
      align-items: stretch;
      flex-direction: column;
    }

    .topActions {
      justify-content: stretch;
    }

    .topActions button {
      flex: 1;
    }

    .brandMark {
      width: 38px;
      height: 38px;
      border-radius: 14px;
    }

    .brandBlock h1 {
      font-size: 26px;
    }

    .brandBlock p {
      font-size: 9px;
      letter-spacing: 0.10em;
    }

    .heroCard {
      padding: 18px;
      border-radius: 26px;
    }

    .heroCard h2 {
      font-size: 36px;
    }

    .heroStats {
      grid-template-columns: 1fr;
    }

    .clienteRow {
      grid-template-columns: 46px minmax(0, 1fr);
    }

    .avatar {
      width: 46px;
      height: 46px;
      border-radius: 16px;
    }

    .clienteSaldo {
      grid-column: 2;
      text-align: left;
      margin-top: -6px;
    }

    .listCard,
    .detailCard {
      padding: 15px;
      border-radius: 26px;
    }

    .saldoBigCard strong {
      font-size: 30px;
    }
  }
`
