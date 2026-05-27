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
  guia_beta?: boolean | null
  guia_pioneiro_beta?: boolean | null
  medalha_guia_pioneiro_beta?: boolean | null
  beneficio_taxa_beta_ativo?: boolean | null
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
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  imagem?: string | null
  preco?: number | null
  valor?: number | null
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
  pago_em?: string | null
  order_id?: string | null
  transaction_id?: string | null
  paghiper_transaction_id?: string | null
  pix_codigo?: string | null
  comprovante_url?: string | null
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
  admin_id?: string | null
  criado_por?: string | null
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
  repasse_id?: string | null
  created_at?: string | null
  updated_at?: string | null
  respondido_em?: string | null
  [key: string]: any
}

type Cliente = {
  id: string
  nome?: string | null
  email?: string | null
}

type Aba = 'geral' | 'clientes' | 'admin' | 'saques'

type MovimentoHistorico = {
  id: string
  tipo: 'cliente' | 'admin' | 'saque'
  titulo: string
  subtitulo: string
  valor: number
  status: string
  data: string | null
  comprovante: string
  destino: string
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

const PIX_TIPOS = [
  { value: '', label: 'Selecione' },
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'aleatoria', label: 'Chave aleatória' },
]

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

function numeroSeguro(valor: unknown, fallback = 0) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : fallback
}

function primeiroNome(valor?: string | null) {
  const nome = String(valor || 'Guia').trim()
  return nome.split(' ')[0] || 'Guia'
}

function formatarMoeda(valor: any) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0))
}

function moedaParaNumero(valor: string) {
  const limpo = String(valor || '')
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  const n = Number(limpo)
  return Number.isFinite(n) ? n : 0
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

export default function GuiaFinanceiroPage() {
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
  const [mensagem, setMensagem] = useState('')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('')

  const [busca, setBusca] = useState('')
  const [aba, setAba] = useState<Aba>('geral')

  const [modalSaqueAberto, setModalSaqueAberto] = useState(false)
  const [valorSaque, setValorSaque] = useState('')
  const [pixTipoSaque, setPixTipoSaque] = useState('')
  const [pixChaveSaque, setPixChaveSaque] = useState('')
  const [titularSaque, setTitularSaque] = useState('')
  const [observacaoSaque, setObservacaoSaque] = useState('')
  const [confirmouPixProprio, setConfirmouPixProprio] = useState(false)
  const [solicitandoSaque, setSolicitandoSaque] = useState(false)
  const [erroSaque, setErroSaque] = useState('')

  useEffect(() => {
    if (iniciouRef.current) return
    iniciouRef.current = true
    iniciar()
  }, [])

  async function iniciar() {
    setCarregando(true)
    setErro('')
    setMensagem('')

    try {
      const userData = localStorage.getItem('user')

      if (!userData) {
        router.replace('/login')
        return
      }

      const parsed = JSON.parse(userData) as UsuarioLocal

      if (parsed.tipo !== 'guia') {
        router.replace('/login')
        return
      }

      const guiaId = extrairUsuarioId(parsed)

      if (!guiaId) {
        localStorage.removeItem('user')
        router.replace('/login')
        return
      }

      const usuarioNormalizado = { ...parsed, id: guiaId }
      setUser(usuarioNormalizado)
      await carregarFinanceiro(guiaId)
    } catch (error) {
      console.error('Erro ao iniciar financeiro do guia:', error)
      setErro('Não foi possível carregar seu financeiro agora.')
    } finally {
      setCarregando(false)
    }
  }

  function nomeGuia() {
    return guia?.nome || user?.nome || user?.email || 'Guia'
  }

  function avatarGuia() {
    return (
      guia?.avatar_url ||
      guia?.foto_url ||
      guia?.imagem_url ||
      user?.avatar_url ||
      user?.foto_url ||
      user?.imagem_url ||
      ''
    )
  }

  function dataReserva(reserva: ReservaFinanceira) {
    return (
      reserva.data_pagamento ||
      reserva.pago_em ||
      reserva.updated_at ||
      reserva.created_at ||
      null
    )
  }

  function dataRepasse(repasse: RepasseFinanceiro) {
    return repasse.data_pagamento || repasse.created_at || repasse.updated_at || null
  }

  function valorReserva(reserva: ReservaFinanceira) {
    return Number(reserva.valor_total || 0)
  }

  function valorRepasse(repasse: RepasseFinanceiro) {
    return Number(
      repasse.valor_pago ??
        repasse.valor_repassado ??
        repasse.valor ??
        repasse.valor_total ??
        0
    )
  }

  function tituloRoteiro(reserva: ReservaFinanceira) {
    return (
      reserva.roteiro_titulo ||
      reserva.roteiro?.titulo ||
      reserva.roteiro?.nome ||
      'Roteiro'
    )
  }

  function localRoteiro(reserva: ReservaFinanceira) {
    return (
      reserva.roteiro?.local ||
      reserva.roteiro?.localizacao ||
      reserva.roteiro?.local_encontro ||
      reserva.roteiro?.ponto_encontro ||
      ''
    )
  }

  function comprovanteReserva(reserva: ReservaFinanceira) {
    return (
      reserva.comprovante_url ||
      reserva.url_comprovante ||
      reserva.comprovante ||
      reserva.recibo_url ||
      reserva.arquivo_url ||
      reserva.comprovante_pagamento_url ||
      ''
    )
  }

  function comprovanteRepasse(repasse: RepasseFinanceiro) {
    return (
      repasse.comprovante_url ||
      repasse.url_comprovante ||
      repasse.comprovante ||
      repasse.recibo_url ||
      repasse.arquivo_url ||
      repasse.comprovante_pagamento_url ||
      ''
    )
  }

  function statusPagamentoLabel(valor?: string | null) {
    const status = normalizar(valor)

    if (
      status === 'pago' ||
      status === 'confirmado' ||
      status === 'aprovado' ||
      status === 'paid' ||
      status === 'approved'
    ) {
      return 'Pago'
    }

    if (status === 'cancelado' || status === 'cancelada') return 'Cancelado'
    if (status === 'estornado' || status === 'estornada') return 'Estornado'

    return valor || 'Pendente'
  }

  async function carregarFinanceiro(guiaId: string) {
    setErro('')
    setMensagem('')

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

    setAtualizando(true)
    setErro('')
    setMensagem('')

    try {
      await carregarFinanceiro(user.id)
      setMensagem('Financeiro atualizado.')
      setTimeout(() => setMensagem(''), 2600)
    } catch (error: any) {
      console.error('Erro ao atualizar financeiro:', error)
      setErro(error?.message || 'Não foi possível atualizar o financeiro.')
    } finally {
      setAtualizando(false)
    }
  }

  function abrirSolicitarSaque() {
    const disponivel = Math.max(0, Number(resumo.saldo_pendente || 0))

    setErroSaque('')
    setValorSaque(disponivel.toFixed(2).replace('.', ','))
    setPixTipoSaque(guia?.pix_tipo || '')
    setPixChaveSaque(guia?.pix_chave || '')
    setTitularSaque(nomeGuia())
    setObservacaoSaque('')
    setConfirmouPixProprio(false)
    setModalSaqueAberto(true)
  }

  async function enviarSolicitacaoSaque() {
    if (!user?.id) return

    const valor = moedaParaNumero(valorSaque)
    const disponivel = Math.max(0, Number(resumo.saldo_pendente || 0))

    if (valor <= 0) {
      setErroSaque('Informe um valor válido para saque.')
      return
    }

    if (valor > disponivel) {
      setErroSaque('O valor solicitado não pode ser maior que o saldo líquido disponível.')
      return
    }

    if (!pixTipoSaque || !pixChaveSaque.trim()) {
      setErroSaque('Informe o tipo e a chave PIX para recebimento.')
      return
    }

    if (!titularSaque.trim()) {
      setErroSaque('Informe o nome do titular da chave PIX.')
      return
    }

    if (!confirmouPixProprio) {
      setErroSaque('Confirme que a chave PIX está no seu nome antes de solicitar o saque.')
      return
    }

    setSolicitandoSaque(true)
    setErroSaque('')

    try {
      const response = await fetch('/api/guia/financeiro/solicitar-saque', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guiaId: user.id,
          valorSolicitado: valor,
          valorDisponivel: disponivel,
          pixTipo: pixTipoSaque,
          pixChave: pixChaveSaque.trim(),
          titularNome: titularSaque.trim(),
          observacaoGuia: observacaoSaque.trim(),
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.erro || data?.error || data?.message || 'Não foi possível solicitar o saque.')
      }

      setMensagem('Solicitação de saque enviada ao Admin.')
      setModalSaqueAberto(false)
      await carregarFinanceiro(user.id)
      setTimeout(() => setMensagem(''), 3200)
    } catch (error: any) {
      console.error('Erro ao solicitar saque:', error)
      setErroSaque(error?.message || 'Erro ao solicitar saque.')
    } finally {
      setSolicitandoSaque(false)
    }
  }

  const sair = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.warn('Aviso ao encerrar sessão:', error)
    }

    localStorage.removeItem('user')
    localStorage.removeItem('usuario')
    localStorage.removeItem('token')
    localStorage.removeItem('session')

    router.replace('/login')
  }

  const reservasFiltradas = useMemo(() => {
    const termo = normalizar(busca)

    const lista = termo
      ? reservas.filter((reserva) => {
          const texto = normalizar(
            [
              reserva.id,
              reserva.cliente_nome,
              reserva.cliente_email,
              reserva.order_id,
              reserva.transaction_id,
              reserva.paghiper_transaction_id,
              reserva.status,
              reserva.pagamento_status,
              tituloRoteiro(reserva),
              localRoteiro(reserva),
            ].join(' ')
          )

          return texto.includes(termo)
        })
      : reservas

    return lista.slice(0, 8)
  }, [reservas, busca])

  const repassesFiltrados = useMemo(() => {
    const termo = normalizar(busca)

    const lista = termo
      ? repasses.filter((repasse) => {
          const texto = normalizar(
            [
              repasse.id,
              repasse.status,
              repasse.tipo,
              repasse.observacao,
              repasse.descricao,
              repasse.admin_id,
              repasse.criado_por,
            ].join(' ')
          )

          return texto.includes(termo)
        })
      : repasses

    return lista.slice(0, 8)
  }, [repasses, busca])

  const saquesFiltrados = useMemo(() => {
    const termo = normalizar(busca)

    const lista = termo
      ? saques.filter((saque) => {
          const texto = normalizar(
            [
              saque.id,
              saque.status,
              saque.pix_tipo,
              saque.pix_chave,
              saque.titular_nome,
              saque.observacao_guia,
              saque.observacao_admin,
            ].join(' ')
          )

          return texto.includes(termo)
        })
      : saques

    return lista.slice(0, 8)
  }, [saques, busca])

  const historicoGeral = useMemo<MovimentoHistorico[]>(() => {
    const pagamentosCliente = reservas.map((reserva) => ({
      id: `reserva-${reserva.id}`,
      tipo: 'cliente' as const,
      titulo: `Pagamento de cliente · ${tituloRoteiro(reserva)}`,
      subtitulo: `${reserva.cliente_nome || 'Cliente'} · ${reserva.quantidade_pessoas || 1} pessoa(s)`,
      valor: valorReserva(reserva),
      status: statusPagamentoLabel(reserva.pagamento_status || reserva.status),
      data: dataReserva(reserva),
      comprovante: comprovanteReserva(reserva),
      destino: reserva.id,
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
      destino: repasse.id,
    }))

    const saquesGuia = saques.map((saque) => ({
      id: `saque-${saque.id}`,
      tipo: 'saque' as const,
      titulo: 'Solicitação de saque enviada ao Admin',
      subtitulo: `${saque.pix_tipo || 'PIX'} · ${saque.titular_nome || 'Titular não informado'}`,
      valor: Number(saque.valor_solicitado || 0),
      status: statusSaqueLabel(saque.status),
      data: saque.created_at || null,
      comprovante: saque.comprovante_url || '',
      destino: saque.id,
    }))

    return [...pagamentosCliente, ...repassesAdmin, ...saquesGuia].sort((a, b) => {
      const dataA = a.data ? new Date(a.data).getTime() : 0
      const dataB = b.data ? new Date(b.data).getTime() : 0
      return dataB - dataA
    })
  }, [reservas, repasses, saques])

  const historicoVisivel = useMemo(() => historicoGeral.slice(0, 6), [historicoGeral])

  const saldoDisponivel = Math.max(0, Number(resumo.saldo_pendente || 0))

  const saqueEmAnalise = useMemo(() => {
    return saques.some((saque) => {
      const status = normalizar(saque.status)
      return ['novo', 'pendente', 'solicitado', 'em_analise'].includes(status)
    })
  }, [saques])

  const podeSolicitarSaque = saldoDisponivel > 0.009 && !saqueEmAnalise

  if (carregando) {
    return (
      <main className="loading">
        <style>{estilos}</style>
        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>Carregando financeiro do guia...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{estilos}</style>

      <header className="topbar">
        <div className="topbarInner">
          <button
            type="button"
            className="brandHeader"
            onClick={() => router.push('/guia/dashboard')}
            aria-label="PrussikTrails"
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" className="brandLogo" />
            <span className="brandTextBlock">
              <span className="brandName">PrussikTrails</span>
              <span className="brandSubtitle">Financeiro do guia</span>
            </span>
          </button>

          <button
            type="button"
            className="profileButton"
            onClick={() => router.push('/guia/perfil')}
            aria-label="Abrir perfil do guia"
            title="Perfil"
          >
            {avatarGuia() ? <img src={avatarGuia()} alt={nomeGuia()} /> : <span>{nomeGuia().slice(0, 1).toUpperCase()}</span>}
          </button>
        </div>
      </header>

      <section className="container">
        <section className="hero">
          <div className="heroTextBlock">
            <span className="eyebrow">Financeiro do guia</span>
            <h1>
              {primeiroNome(nomeGuia())}, seu saldo e repasses em um só lugar.
            </h1>
            <p>
              Acompanhe pagamentos dos clientes, taxa da plataforma, repasses do Admin e solicitações de saque.
              {ultimaAtualizacao ? ` Atualizado às ${ultimaAtualizacao}.` : ''}
            </p>
          </div>

          <div className="heroCard">
            <span>Disponível líquido</span>
            <strong>{formatarMoeda(saldoDisponivel)}</strong>
            <small>
              {resumo.reservas_confirmadas} pagamento(s) confirmado(s) · {resumo.repasses_total} repasse(s) registrado(s).
            </small>
            <button
              type="button"
              className="heroSaqueBtn"
              onClick={abrirSolicitarSaque}
              disabled={!podeSolicitarSaque}
            >
              {saqueEmAnalise ? 'Saque em análise' : saldoDisponivel > 0 ? 'Solicitar saque' : 'Sem saldo para saque'}
            </button>
          </div>
        </section>

        {(mensagem || erro) && (
          <div className={erro ? 'notice error' : 'notice'}>{erro || mensagem}</div>
        )}

        <section className="quickGrid">
          <article className="quickCard">
            <span className="quickIcon">R$</span>
            <strong>{formatarMoeda(resumo.receita_bruta)}</strong>
            <small>Bruto pago pelos clientes.</small>
          </article>

          <article className="quickCard">
            <span className="quickIcon">%</span>
            <strong>{formatarMoeda(resumo.taxa_plataforma)}</strong>
            <small>Taxa PrussikTrails {resumo.taxa_percentual}%.</small>
          </article>

          <article className="quickCard">
            <span className="quickIcon">✓</span>
            <strong>{formatarMoeda(resumo.valor_pago)}</strong>
            <small>Já repassado pelo Admin.</small>
          </article>

          <button className="quickCard clickable" type="button" onClick={abrirSolicitarSaque} disabled={!podeSolicitarSaque}>
            <span className="quickIcon">PIX</span>
            <strong>{formatarMoeda(saldoDisponivel)}</strong>
            <small>{saqueEmAnalise ? 'Existe uma solicitação em análise.' : 'Saldo líquido disponível para solicitação.'}</small>
          </button>
        </section>

        <section className="toolbar">
          <input
            className="searchInput"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por cliente, roteiro, status, comprovante, PIX ou ID..."
          />

          <div className="tabs">
            <button type="button" className={aba === 'geral' ? 'active' : ''} onClick={() => setAba('geral')}>Geral</button>
            <button type="button" className={aba === 'clientes' ? 'active' : ''} onClick={() => setAba('clientes')}>Clientes</button>
            <button type="button" className={aba === 'admin' ? 'active' : ''} onClick={() => setAba('admin')}>Repasses</button>
            <button type="button" className={aba === 'saques' ? 'active' : ''} onClick={() => setAba('saques')}>Saques</button>
          </div>
        </section>

        <section className="mainGrid">
          <div className="leftColumn">
            {aba === 'geral' && (
              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <h2>Histórico geral</h2>
                    <p>Últimos 6 movimentos financeiros, para manter a tela mais limpa.</p>
                  </div>
                  <button type="button" onClick={atualizar} disabled={atualizando}>{atualizando ? 'Atualizando...' : 'Atualizar'}</button>
                </div>

                <div className="list">
                  {historicoVisivel.length === 0 ? (
                    <div className="empty">Nenhum movimento financeiro encontrado.</div>
                  ) : (
                    historicoVisivel.map((item) => (
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
                            <a className="proofLink" href={item.comprovante} target="_blank" rel="noreferrer">Ver comprovante</a>
                          ) : (
                            <span className="mutedProof">Sem comprovante</span>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            )}

            {aba === 'clientes' && (
              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <h2>Pagamentos dos clientes</h2>
                    <p>Últimos 8 pagamentos encontrados no filtro atual.</p>
                  </div>
                </div>

                <div className="list">
                  {reservasFiltradas.length === 0 ? (
                    <div className="empty">Nenhum pagamento de cliente encontrado.</div>
                  ) : (
                    reservasFiltradas.map((reserva) => {
                      const comprovante = comprovanteReserva(reserva)

                      return (
                        <article className="item" key={reserva.id}>
                          <div className="itemTop">
                            <div>
                              <div className="itemTitle">{reserva.cliente_nome || 'Cliente'}</div>
                              <div className="itemText">
                                {tituloRoteiro(reserva)} · {reserva.quantidade_pessoas || 1} pessoa(s) · {formatarData(dataReserva(reserva))}
                              </div>
                            </div>
                            <div className="itemValue">{formatarMoeda(valorReserva(reserva))}</div>
                          </div>

                          <div className="itemFooter">
                            <span className={`badge ${badgeClasse(reserva.pagamento_status || reserva.status)}`}>
                              {statusPagamentoLabel(reserva.pagamento_status || reserva.status)}
                            </span>
                            {comprovante ? (
                              <a className="proofLink" href={comprovante} target="_blank" rel="noreferrer">Ver comprovante</a>
                            ) : (
                              <span className="mutedProof">Comprovante não anexado</span>
                            )}
                          </div>
                        </article>
                      )
                    })
                  )}
                </div>
              </section>
            )}

            {aba === 'admin' && (
              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <h2>Repasses do Admin</h2>
                    <p>Últimos 8 repasses registrados pela administração.</p>
                  </div>
                </div>

                <div className="list">
                  {repassesFiltrados.length === 0 ? (
                    <div className="empty">Nenhum repasse registrado ainda.</div>
                  ) : (
                    repassesFiltrados.map((repasse) => {
                      const comprovante = comprovanteRepasse(repasse)

                      return (
                        <article className="item" key={repasse.id}>
                          <div className="itemTop">
                            <div>
                              <div className="itemTitle">{repasse.descricao || 'Repasse do Admin'}</div>
                              <div className="itemText">{repasse.observacao || 'Pagamento administrativo'} · {formatarData(dataRepasse(repasse))}</div>
                            </div>
                            <div className="itemValue">{formatarMoeda(valorRepasse(repasse))}</div>
                          </div>

                          <div className="itemFooter">
                            <span className={`badge ${badgeClasse(repasse.status)}`}>{statusPagamentoLabel(repasse.status)}</span>
                            {comprovante ? (
                              <a className="proofLink" href={comprovante} target="_blank" rel="noreferrer">Ver comprovante</a>
                            ) : (
                              <span className="mutedProof">Sem comprovante anexado</span>
                            )}
                          </div>
                        </article>
                      )
                    })
                  )}
                </div>
              </section>
            )}

            {aba === 'saques' && (
              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <h2>Solicitações de saque</h2>
                    <p>Pedidos enviados ao Admin com base no saldo líquido disponível.</p>
                  </div>
                  <button type="button" onClick={abrirSolicitarSaque} disabled={!podeSolicitarSaque}>Solicitar saque</button>
                </div>

                <div className="list">
                  {saquesFiltrados.length === 0 ? (
                    <div className="empty">Nenhuma solicitação de saque registrada.</div>
                  ) : (
                    saquesFiltrados.map((saque) => (
                      <article className="item" key={saque.id}>
                        <div className="itemTop">
                          <div>
                            <div className="itemTitle">Saque solicitado ao Admin</div>
                            <div className="itemText">
                              {saque.pix_tipo || 'PIX'} · {saque.titular_nome || 'Titular não informado'} · {formatarData(saque.created_at)}
                            </div>
                          </div>
                          <div className="itemValue">{formatarMoeda(saque.valor_solicitado || 0)}</div>
                        </div>

                        <div className="itemFooter">
                          <span className={`badge ${badgeClasse(saque.status)}`}>{statusSaqueLabel(saque.status)}</span>
                          {saque.observacao_admin ? (
                            <span className="mutedProof">Admin: {saque.observacao_admin}</span>
                          ) : (
                            <span className="mutedProof">Aguardando análise do Admin</span>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            )}
          </div>

          <aside className="rightColumn">
            <section className="financeBox">
              <div className="financeLabel">Resumo financeiro</div>
              <div className="financeValue">{formatarMoeda(saldoDisponivel)}</div>
              <div className="financeText">
                Saldo líquido disponível após descontar a taxa da plataforma e repasses já registrados pelo Admin.
              </div>

              <div className="financeRows">
                <div className="financeRow"><span>Bruto dos clientes</span><strong>{formatarMoeda(resumo.receita_bruta)}</strong></div>
                <div className="financeRow"><span>Taxa Prussik {resumo.taxa_percentual}%</span><strong>{formatarMoeda(resumo.taxa_plataforma)}</strong></div>
                <div className="financeRow"><span>Líquido do guia</span><strong>{formatarMoeda(resumo.valor_liquido_guia)}</strong></div>
                <div className="financeRow"><span>Já repassado</span><strong>{formatarMoeda(resumo.valor_pago)}</strong></div>
                <div className="financeRow"><span>Disponível</span><strong>{formatarMoeda(saldoDisponivel)}</strong></div>
              </div>

              <button type="button" className="withdrawBtn" onClick={abrirSolicitarSaque} disabled={!podeSolicitarSaque}>
                {saqueEmAnalise ? 'Saque em análise' : 'Solicitar saque'}
              </button>
            </section>

            <section className="infoBox">
              <h3>Dados para recebimento</h3>
              <p>
                PIX cadastrado: {guia?.pix_chave ? `${guia.pix_tipo || 'Chave'} · ${guia.pix_chave}` : 'não informado'}
                <br />
                CADASTUR: {guia?.cadastur || guia?.cadastur_numero || 'não informado'}
                <br />
                Último repasse: {formatarDataCurta(resumo.ultimo_pagamento_em)}
              </p>
            </section>

            <section className="infoBox beta">
              <h3>Taxa Beta</h3>
              <p>
                Durante a fase Beta, a taxa PrussikTrails é de <strong>5%</strong>. Após o Beta, a taxa padrão passa para <strong>7%</strong>. Guias ativos nesta fase poderão manter o benefício por tempo determinado.
              </p>
            </section>
          </aside>
        </section>
      </section>

      {modalSaqueAberto && (
        <div className="modalOverlay" onClick={() => !solicitandoSaque && setModalSaqueAberto(false)}>
          <section className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <span>Solicitação ao Admin</span>
                <h2>Solicitar saque</h2>
              </div>
              <button type="button" onClick={() => setModalSaqueAberto(false)} disabled={solicitandoSaque}>×</button>
            </div>

            <div className="modalBody">
              <div className="saldoMiniCard">
                <span>Disponível líquido</span>
                <strong>{formatarMoeda(saldoDisponivel)}</strong>
                <small>O valor solicitado não pode ultrapassar o saldo disponível no momento do pedido.</small>
              </div>

              <label>
                Valor do saque
                <input value={valorSaque} onChange={(event) => setValorSaque(event.target.value)} placeholder="0,00" />
              </label>

              <label>
                Tipo da chave PIX
                <select value={pixTipoSaque} onChange={(event) => setPixTipoSaque(event.target.value)}>
                  {PIX_TIPOS.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                  ))}
                </select>
              </label>

              <label>
                Chave PIX
                <input value={pixChaveSaque} onChange={(event) => setPixChaveSaque(event.target.value)} placeholder="Informe a chave PIX" />
              </label>

              <label>
                Nome do titular
                <input value={titularSaque} onChange={(event) => setTitularSaque(event.target.value)} placeholder="Nome do titular da chave PIX" />
              </label>

              <label>
                Observação para o Admin, opcional
                <textarea value={observacaoSaque} onChange={(event) => setObservacaoSaque(event.target.value)} placeholder="Ex.: solicito saque integral do saldo disponível." />
              </label>

              <label className="checkLine">
                <input type="checkbox" checked={confirmouPixProprio} onChange={(event) => setConfirmouPixProprio(event.target.checked)} />
                <span>Confirmo que a chave PIX informada está no meu nome e será usada para recebimento do repasse.</span>
              </label>

              {erroSaque && <div className="modalError">{erroSaque}</div>}

              <div className="modalActions">
                <button type="button" className="secondary" onClick={() => setModalSaqueAberto(false)} disabled={solicitandoSaque}>Cancelar</button>
                <button type="button" className="primary" onClick={enviarSolicitacaoSaque} disabled={solicitandoSaque}>{solicitandoSaque ? 'Enviando...' : 'Enviar ao Admin'}</button>
              </div>
            </div>
          </section>
        </div>
      )}
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
    border: 1px solid rgba(15,23,42,0.06);
    border-radius: 30px;
    padding: 28px;
    text-align: center;
    box-shadow: 0 20px 50px rgba(15,23,42,0.08);
    font-weight: 850;
  }

  .loadingCard img {
    height: 64px;
    width: auto;
    margin-bottom: 12px;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(255,253,247,0.92);
    border-bottom: 1px solid rgba(15,23,42,0.06);
    backdrop-filter: blur(18px);
    padding: 9px 14px;
  }

  .topbarInner {
    max-width: 1180px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .brandHeader {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    border: 0;
    background: transparent;
    padding: 0;
    text-align: left;
    cursor: pointer;
    color: #172018;
  }

  .brandLogo {
    width: 42px;
    height: 42px;
    object-fit: contain;
    flex: 0 0 42px;
  }

  .brandTextBlock {
    min-width: 0;
    display: grid;
  }

  .brandName {
    color: #1f3f2d;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: clamp(28px, 3.6vw, 48px);
    font-weight: 800;
    line-height: 0.88;
    letter-spacing: -0.06em;
    white-space: nowrap;
  }

  .brandSubtitle {
    color: #7b8375;
    font-size: clamp(9px, 1.15vw, 13px);
    font-weight: 850;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin-top: 5px;
    white-space: nowrap;
  }

  .profileButton {
    width: 42px;
    height: 42px;
    border: 1px solid rgba(15,23,42,0.08);
    background: rgba(255,255,255,0.86);
    color: #1f3f2d;
    border-radius: 999px;
    box-shadow: 0 10px 22px rgba(15,23,42,0.08);
    cursor: pointer;
    overflow: hidden;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .profileButton img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .profileButton span {
    font-size: 15px;
    font-weight: 950;
  }

  .container {
    max-width: 1180px;
    margin: 0 auto;
    padding: 18px 14px 54px;
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 18px;
    align-items: stretch;
    border-radius: 34px;
    padding: 24px;
    background:
      linear-gradient(135deg, rgba(23,32,24,0.78), rgba(23,32,24,0.34)),
      radial-gradient(circle at top right, rgba(190,242,100,0.30), transparent 34%),
      linear-gradient(135deg, #1f331f 0%, #647a49 46%, #d7c6a1 100%);
    color: #fff;
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
    font-size: clamp(34px, 4.9vw, 62px);
    line-height: 0.94;
    font-weight: 950;
    letter-spacing: -0.08em;
  }

  .hero p {
    max-width: 650px;
    color: rgba(255,255,255,0.82);
    line-height: 1.55;
    margin: 14px 0 0;
    font-size: 14px;
    font-weight: 650;
  }

  .heroCard {
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.14);
    border-radius: 28px;
    padding: 18px;
    display: grid;
    align-content: center;
    backdrop-filter: blur(14px);
  }

  .heroCard span,
  .financeLabel {
    color: rgba(255,255,255,0.70);
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.10em;
  }

  .heroCard strong,
  .financeValue {
    color: #bef264;
    font-size: 34px;
    font-weight: 950;
    letter-spacing: -0.07em;
    margin-top: 8px;
  }

  .heroCard small {
    color: rgba(255,255,255,0.74);
    font-size: 12px;
    line-height: 1.45;
    font-weight: 750;
    margin-top: 8px;
  }

  .heroSaqueBtn,
  .withdrawBtn {
    width: 100%;
    border: 0;
    background: #bef264;
    color: #172018;
    border-radius: 999px;
    padding: 12px 14px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
    margin-top: 14px;
  }

  .heroSaqueBtn:disabled,
  .withdrawBtn:disabled,
  .quickCard:disabled {
    opacity: 0.58;
    cursor: not-allowed;
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

  .quickGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 14px;
  }

  .quickCard {
    min-height: 126px;
    background: rgba(255,255,255,0.92);
    border: 1px solid rgba(15,23,42,0.06);
    border-radius: 24px;
    box-shadow: 0 10px 30px rgba(15,23,42,0.055);
    padding: 14px;
    text-align: left;
    display: grid;
    align-content: start;
    gap: 7px;
    color: #172018;
  }

  button.quickCard {
    cursor: pointer;
  }

  .quickIcon {
    width: 38px;
    height: 38px;
    border-radius: 16px;
    background: #eef2e5;
    color: #1f3f2d;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 950;
  }

  .quickCard strong {
    color: #172018;
    font-size: 21px;
    line-height: 1;
    letter-spacing: -0.045em;
    font-weight: 950;
  }

  .quickCard small {
    color: #64748b;
    line-height: 1.35;
    font-size: 12px;
    font-weight: 780;
  }

  .toolbar {
    background: rgba(255,255,255,0.92);
    border: 1px solid rgba(15,23,42,0.06);
    border-radius: 26px;
    padding: 12px;
    box-shadow: 0 12px 34px rgba(15,23,42,0.06);
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    margin-bottom: 14px;
  }

  .searchInput {
    width: 100%;
    border: 1px solid rgba(15,23,42,0.08);
    background: #fffdf7;
    border-radius: 999px;
    padding: 13px 15px;
    font-size: 14px;
    color: #172018;
    outline: none;
    font-weight: 750;
  }

  .tabs {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .tabs button {
    border: 0;
    border-radius: 999px;
    padding: 10px 12px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
    background: #eef2e5;
    color: #475569;
  }

  .tabs button.active {
    background: #172018;
    color: #fff;
  }

  .mainGrid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 14px;
    align-items: start;
  }

  .panel,
  .infoBox {
    background: rgba(255,255,255,0.92);
    border: 1px solid rgba(15,23,42,0.06);
    border-radius: 28px;
    box-shadow: 0 12px 34px rgba(15,23,42,0.06);
    overflow: hidden;
  }

  .panelHeader {
    padding: 16px 18px;
    border-bottom: 1px solid rgba(15,23,42,0.06);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .panelHeader h2,
  .infoBox h3 {
    margin: 0;
    color: #172018;
    font-size: 18px;
    font-weight: 950;
    letter-spacing: -0.04em;
  }

  .panelHeader p,
  .infoBox p {
    margin: 4px 0 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.45;
    font-weight: 750;
  }

  .panelHeader button {
    border: 0;
    border-radius: 999px;
    background: #16a34a;
    color: #fff;
    padding: 10px 13px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
  }

  .panelHeader button:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }

  .list {
    display: grid;
    gap: 10px;
    padding: 14px;
  }

  .item,
  .empty {
    background: #fffdf7;
    border: 1px solid rgba(15,23,42,0.06);
    border-radius: 22px;
    padding: 14px;
  }

  .empty {
    border-style: dashed;
    text-align: center;
    color: #64748b;
    font-weight: 760;
    font-size: 13px;
  }

  .itemTop {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
  }

  .itemTitle {
    color: #172018;
    font-size: 14px;
    font-weight: 950;
    line-height: 1.3;
  }

  .itemText {
    margin-top: 5px;
    color: #64748b;
    font-size: 12px;
    line-height: 1.5;
    font-weight: 750;
  }

  .itemValue {
    color: #16a34a;
    font-size: 16px;
    font-weight: 950;
    white-space: nowrap;
  }

  .itemFooter {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
    margin-top: 12px;
  }

  .badge {
    display: inline-flex;
    width: fit-content;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 950;
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
    cursor: pointer;
  }

  .mutedProof {
    color: #94a3b8;
    font-size: 11px;
    font-weight: 800;
  }

  .rightColumn {
    display: grid;
    gap: 14px;
  }

  .financeBox {
    background:
      radial-gradient(circle at top right, rgba(190,242,100,0.24), transparent 38%),
      #172018;
    color: #ffffff;
    border-radius: 28px;
    padding: 20px;
  }

  .financeRows {
    display: grid;
    gap: 8px;
    margin-top: 15px;
  }

  .financeRow {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    color: rgba(255,255,255,0.82);
    font-size: 12px;
    font-weight: 800;
  }

  .financeRow strong {
    color: #bef264;
  }

  .financeText {
    margin-top: 8px;
    color: rgba(255,255,255,0.72);
    font-size: 13px;
    line-height: 1.55;
    font-weight: 700;
  }

  .infoBox {
    padding: 16px;
  }

  .infoBox.beta {
    background:
      radial-gradient(circle at top right, rgba(190,242,100,0.16), transparent 38%),
      #fffdf7;
  }

  .modalOverlay {
    position: fixed;
    inset: 0;
    z-index: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background: rgba(8, 13, 7, 0.50);
    backdrop-filter: blur(10px);
  }

  .modal {
    width: min(520px, 100%);
    border-radius: 30px;
    background: #fffdf7;
    border: 1px solid rgba(15,23,42,0.08);
    box-shadow: 0 34px 90px rgba(15,23,42,0.24);
    overflow: hidden;
    max-height: calc(100dvh - 28px);
    overflow-y: auto;
  }

  .modalHeader {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 20px;
    border-bottom: 1px solid rgba(15,23,42,0.06);
  }

  .modalHeader span {
    display: block;
    color: #64748b;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 5px;
  }

  .modalHeader h2 {
    margin: 0;
    color: #172018;
    font-size: 26px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.055em;
  }

  .modalHeader button {
    width: 38px;
    height: 38px;
    border-radius: 999px;
    border: 1px solid rgba(15,23,42,0.08);
    background: #f8fafc;
    color: #172018;
    font-size: 24px;
    cursor: pointer;
  }

  .modalBody {
    padding: 20px;
    display: grid;
    gap: 12px;
  }

  .saldoMiniCard {
    border-radius: 20px;
    background: #172018;
    color: #fff;
    padding: 14px;
    display: grid;
    gap: 5px;
  }

  .saldoMiniCard span {
    color: rgba(255,255,255,0.68);
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.10em;
    text-transform: uppercase;
  }

  .saldoMiniCard strong {
    color: #bef264;
    font-size: 28px;
    font-weight: 950;
    letter-spacing: -0.05em;
  }

  .saldoMiniCard small {
    color: rgba(255,255,255,0.72);
    line-height: 1.35;
    font-size: 12px;
    font-weight: 750;
  }

  .modal label {
    display: grid;
    gap: 7px;
    color: #172018;
    font-size: 13px;
    font-weight: 900;
  }

  .modal input,
  .modal select,
  .modal textarea {
    width: 100%;
    border: 1px solid rgba(15,23,42,0.10);
    background: #fff;
    border-radius: 18px;
    padding: 13px 14px;
    color: #172018;
    outline: none;
    font-size: 14px;
    font-weight: 700;
    font-family: inherit;
  }

  .modal textarea {
    min-height: 92px;
    resize: vertical;
    line-height: 1.45;
  }

  .checkLine {
    display: grid !important;
    grid-template-columns: 20px minmax(0, 1fr);
    gap: 10px !important;
    align-items: start;
    color: #475569 !important;
    line-height: 1.4;
    font-size: 12px !important;
  }

  .checkLine input {
    width: 18px;
    height: 18px;
    padding: 0;
    margin-top: 1px;
  }

  .modalError {
    border-radius: 16px;
    background: rgba(220,38,38,0.08);
    border: 1px solid rgba(220,38,38,0.16);
    color: #991b1b;
    padding: 10px 12px;
    font-size: 13px;
    font-weight: 850;
  }

  .modalActions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 6px;
  }

  .modalActions button {
    border: 0;
    border-radius: 999px;
    padding: 12px 15px;
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
  }

  .modalActions .primary {
    background: #16a34a;
    color: #fff;
  }

  .modalActions .secondary {
    background: #eef2e5;
    color: #334155;
  }

  @media (max-width: 1040px) {
    .hero,
    .mainGrid {
      grid-template-columns: 1fr;
    }

    .quickGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .topbar {
      padding: 7px 10px;
    }

    .brandLogo {
      width: 32px;
      height: 32px;
      flex-basis: 32px;
    }

    .brandName {
      font-size: clamp(25px, 8vw, 33px);
      max-width: calc(100vw - 96px);
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .brandSubtitle {
      font-size: 8px;
      letter-spacing: 0.12em;
      max-width: calc(100vw - 96px);
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .profileButton {
      width: 36px;
      height: 36px;
      box-shadow: none;
    }

    .container {
      padding: 10px 9px 36px;
    }

    .hero {
      border-radius: 24px;
      padding: 16px;
      gap: 12px;
    }

    .hero h1 {
      font-size: clamp(30px, 8vw, 40px);
      letter-spacing: -0.07em;
    }

    .hero p {
      font-size: 12px;
      line-height: 1.45;
    }

    .heroCard {
      border-radius: 22px;
      padding: 15px;
    }

    .quickGrid {
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .quickCard {
      min-height: 116px;
      border-radius: 20px;
      padding: 12px;
    }

    .quickCard strong {
      font-size: 18px;
    }

    .toolbar {
      grid-template-columns: 1fr;
      border-radius: 22px;
    }

    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      width: 100%;
    }

    .tabs button {
      width: 100%;
    }

    .panel,
    .financeBox,
    .infoBox {
      border-radius: 24px;
    }

    .itemTop {
      display: grid;
    }

    .itemValue {
      white-space: normal;
    }

    .rightColumn {
      gap: 10px;
    }

    .modalOverlay {
      align-items: flex-end;
      padding: 10px;
    }

    .modal {
      border-radius: 26px;
    }

    .modalActions {
      flex-direction: column-reverse;
    }

    .modalActions button {
      width: 100%;
    }
  }

  @media (max-width: 420px) {
    .quickGrid {
      grid-template-columns: 1fr;
    }
  }
`
