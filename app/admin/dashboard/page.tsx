'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type UsuarioLocal = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
  tipo?: string | null
}

type UsuarioBanco = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
  tipo?: string | null
  created_at?: string | null
}

type Roteiro = {
  id: string
  titulo?: string | null
  nome?: string | null
  status?: string | null
  ativo?: boolean | null
  preco?: number | null
  valor?: number | null
  id_guia?: string | null
  guia_id?: string | null
  local?: string | null
  localizacao?: string | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  imagem?: string | null
  created_at?: string | null
}

type Reserva = {
  id: string
  cliente_id?: string | null
  roteiro_id?: string | null
  quantidade_pessoas?: number | null
  valor_total?: number | null
  status?: string | null
  pagamento_status?: string | null
  created_at?: string | null
}

type GrupoRoteiro = {
  id: string
  roteiro_id?: string | null
  guia_id?: string | null
  titulo?: string | null
  status?: string | null
  created_at?: string | null
}

type AvaliacaoResumo = {
  total: number
  mediaNota: number
  percentualRecomendacao: number
  orientacoesClarasPercentual: number
  segurancaAltaPercentual: number
  experienciaSuperouPercentual: number
  notasBaixas: number
}

type Stats = {
  usuariosTotal: number
  clientesTotal: number
  guiasTotal: number
  adminsTotal: number
  usuariosNovosMes: number

  roteirosTotal: number
  roteirosAtivos: number
  roteirosPendentes: number
  roteirosMes: number

  reservasTotal: number
  reservasConfirmadas: number
  reservasPendentes: number
  reservasCanceladas: number
  reservasMes: number

  receitaBrutaTotal: number
  taxaPlataformaTotal: number
  taxaPagHiperTotal: number
  repasseGuiasTotal: number
  resultadoPlataformaTotal: number

  receitaBrutaMes: number
  taxaPlataformaMes: number
  taxaPagHiperMes: number
  repasseGuiasMes: number
  resultadoPlataformaMes: number

  gruposTotal: number
  gruposAtivos: number
}

const statsInicial: Stats = {
  usuariosTotal: 0,
  clientesTotal: 0,
  guiasTotal: 0,
  adminsTotal: 0,
  usuariosNovosMes: 0,

  roteirosTotal: 0,
  roteirosAtivos: 0,
  roteirosPendentes: 0,
  roteirosMes: 0,

  reservasTotal: 0,
  reservasConfirmadas: 0,
  reservasPendentes: 0,
  reservasCanceladas: 0,
  reservasMes: 0,

  receitaBrutaTotal: 0,
  taxaPlataformaTotal: 0,
  taxaPagHiperTotal: 0,
  repasseGuiasTotal: 0,
  resultadoPlataformaTotal: 0,

  receitaBrutaMes: 0,
  taxaPlataformaMes: 0,
  taxaPagHiperMes: 0,
  repasseGuiasMes: 0,
  resultadoPlataformaMes: 0,

  gruposTotal: 0,
  gruposAtivos: 0
}

const avaliacaoInicial: AvaliacaoResumo = {
  total: 0,
  mediaNota: 0,
  percentualRecomendacao: 0,
  orientacoesClarasPercentual: 0,
  segurancaAltaPercentual: 0,
  experienciaSuperouPercentual: 0,
  notasBaixas: 0
}

type CadasturResumo = {
  total: number
  sem_cadastur: number
  informado: number
  verificado: number
  ativo: number
}

const cadasturInicial: CadasturResumo = {
  total: 0,
  sem_cadastur: 0,
  informado: 0,
  verificado: 0,
  ativo: 0
}

type SuporteResumo = {
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
}

const suporteInicial: SuporteResumo = {
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
  mediaAvaliacao: 0
}

type CancelamentosResumo = {
  total: number
  totalOriginal: number
  totalCreditado: number
  totalRetidoPlataforma: number
  porTipo: Record<string, number>
  porStatus: Record<string, number>
}

const cancelamentosInicial: CancelamentosResumo = {
  total: 0,
  totalOriginal: 0,
  totalCreditado: 0,
  totalRetidoPlataforma: 0,
  porTipo: {},
  porStatus: {}
}

type SaldosResumo = {
  clientesComSaldo: number
  saldoTotal: number
  creditosTotal: number
  debitosTotal: number
}

const saldosInicial: SaldosResumo = {
  clientesComSaldo: 0,
  saldoTotal: 0,
  creditosTotal: 0,
  debitosTotal: 0
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [usuarios, setUsuarios] = useState<UsuarioBanco[]>([])
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [grupos, setGrupos] = useState<GrupoRoteiro[]>([])
  const [stats, setStats] = useState<Stats>(statsInicial)
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoResumo>(avaliacaoInicial)
  const [cadasturResumo, setCadasturResumo] = useState<CadasturResumo>(cadasturInicial)
  const [suporteResumo, setSuporteResumo] = useState<SuporteResumo>(suporteInicial)
  const [cancelamentosResumo, setCancelamentosResumo] = useState<CancelamentosResumo>(cancelamentosInicial)
  const [saldosResumo, setSaldosResumo] = useState<SaldosResumo>(saldosInicial)

  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)

  const [modalSenhaAberto, setModalSenhaAberto] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [alterandoSenha, setAlterandoSenha] = useState(false)

  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('')

  useEffect(() => {
    if (iniciouRef.current) return

    iniciouRef.current = true
    iniciar()
  }, [])

  const iniciar = async () => {
    setCarregando(true)
    setErro('')
    setMensagem('')

    try {
      const userData = localStorage.getItem('user')

      if (!userData) {
        router.replace('/login')
        return
      }

      const parsedUser = JSON.parse(userData) as UsuarioLocal

      if (parsedUser.tipo !== 'admin') {
        router.replace('/login')
        return
      }

      setUser(parsedUser)
      await carregarTudo()
    } catch (error) {
      console.error('Erro ao iniciar dashboard admin:', error)
      setErro('Não foi possível carregar o painel administrativo agora.')
    } finally {
      setCarregando(false)
    }
  }

  const normalizar = (valor?: string | null) => {
    return String(valor || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }

  const nomeUsuario = (usuario?: UsuarioLocal | UsuarioBanco | null) => {
    return usuario?.nome || usuario?.name || usuario?.email || 'Usuário'
  }

  const primeiroNome = (valor?: string | null) => {
    const nome = String(valor || 'Admin').trim()
    return nome.split(' ')[0] || 'Admin'
  }

  const tituloRoteiro = (roteiro?: Roteiro | null) => {
    return roteiro?.titulo || roteiro?.nome || 'Roteiro'
  }

  const imagemRoteiro = (roteiro?: Roteiro | null) => {
    return roteiro?.foto_capa || roteiro?.foto_url || roteiro?.imagem_url || roteiro?.imagem || ''
  }

  const localRoteiro = (roteiro?: Roteiro | null) => {
    return roteiro?.local || roteiro?.localizacao || 'Local a confirmar'
  }

  const formatarData = (valor?: string | null) => {
    if (!valor) return '-'

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return valor

    return data.toLocaleDateString('pt-BR')
  }

  const formatarMoeda = (valor: any) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(valor || 0))
  }

  const formatarNota = (valor: any) => {
    return Number(valor || 0).toFixed(2).replace('.', ',')
  }

  const formatarPercentual = (valor: any) => {
    return `${Number(valor || 0).toFixed(1).replace('.', ',')}%`
  }

  const estrelas = (nota: number) => {
    const inteira = Math.round(Number(nota || 0))

    return '★★★★★'
      .split('')
      .map((_, index) => (index < inteira ? '★' : '☆'))
      .join('')
  }

  const dentroDoMesAtual = (valor?: string | null) => {
    if (!valor) return false

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return false

    const agora = new Date()

    return (
      data.getFullYear() === agora.getFullYear() &&
      data.getMonth() === agora.getMonth()
    )
  }

  const pagamentoConfirmado = (reserva: Reserva) => {
    const pagamento = normalizar(reserva.pagamento_status)
    const status = normalizar(reserva.status)

    return (
      pagamento === 'pago' ||
      pagamento === 'confirmado' ||
      pagamento === 'aprovado' ||
      pagamento === 'paid' ||
      pagamento === 'approved' ||
      status === 'confirmada' ||
      status === 'realizada' ||
      status === 'pago' ||
      status === 'paga'
    )
  }

  const reservaCancelada = (reserva: Reserva) => {
    const status = normalizar(reserva.status)

    return status === 'cancelada' || status === 'cancelado' || status === 'cancelled'
  }

  const statusRoteiro = (roteiro: Roteiro) => {
    const status = normalizar(roteiro.status)

    if (status) return status
    if (roteiro.ativo === true) return 'ativo'
    if (roteiro.ativo === false) return 'pausado'

    return 'pendente'
  }

  const carregarAvaliacoes = async () => {
    try {
      const response = await fetch('/api/avaliacoes/estatisticas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          todos: true,
          status: 'publicada',
          limite: 1000,
          limiteComentarios: 8
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        console.warn('Aviso ao carregar avaliações:', data)
        setAvaliacoes(avaliacaoInicial)
        return avaliacaoInicial
      }

      const resumo: AvaliacaoResumo = {
        total: Number(data?.resumo?.total || 0),
        mediaNota: Number(data?.resumo?.mediaNota || 0),
        percentualRecomendacao: Number(data?.resumo?.percentualRecomendacao || 0),
        orientacoesClarasPercentual: Number(data?.resumo?.orientacoesClarasPercentual || 0),
        segurancaAltaPercentual: Number(data?.resumo?.segurancaAltaPercentual || 0),
        experienciaSuperouPercentual: Number(data?.resumo?.experienciaSuperouPercentual || 0),
        notasBaixas: Number(data?.resumo?.notasBaixas || 0)
      }

      setAvaliacoes(resumo)
      return resumo
    } catch (error) {
      console.warn('Erro ao buscar avaliações:', error)
      setAvaliacoes(avaliacaoInicial)
      return avaliacaoInicial
    }
  }

  const carregarCadastur = async () => {
    try {
      const response = await fetch('/api/admin/cadastur?status=todos&limite=500')
      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        console.warn('Aviso ao carregar CADASTUR:', data)
        setCadasturResumo(cadasturInicial)
        return cadasturInicial
      }

      const resumo: CadasturResumo = {
        total: Number(data?.resumo?.total || 0),
        sem_cadastur: Number(data?.resumo?.sem_cadastur || 0),
        informado: Number(data?.resumo?.informado || 0),
        verificado: Number(data?.resumo?.verificado || 0),
        ativo: Number(data?.resumo?.ativo || 0)
      }

      setCadasturResumo(resumo)
      return resumo
    } catch (error) {
      console.warn('Erro ao carregar CADASTUR:', error)
      setCadasturResumo(cadasturInicial)
      return cadasturInicial
    }
  }

  const carregarSuporte = async () => {
    try {
      const response = await fetch('/api/suporte/chamados?status=todos&limite=300')
      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false || data?.success === false) {
        console.warn('Aviso ao carregar suporte:', data)
        setSuporteResumo(suporteInicial)
        return suporteInicial
      }

      const chamados = (data?.chamados || data?.suporte_chamados || data?.items || []) as any[]
      const resumoApi = data?.resumo || {}

      const countStatus = (status: string) =>
        chamados.filter((item) => normalizar(item.status) === status).length

      const notas = chamados
        .map((item) => Number(item.avaliacao_resposta_nota || item.avaliacao_nota || 0))
        .filter((nota) => Number.isFinite(nota) && nota >= 1 && nota <= 5)

      const mediaAvaliacaoCalculada =
        notas.length > 0
          ? notas.reduce((total, nota) => total + nota, 0) / notas.length
          : 0

      const respondidos = Number(
        resumoApi.respondidos ||
          resumoApi.respondido ||
          resumoApi.porStatus?.respondido ||
          countStatus('respondido') ||
          0
      )

      const avaliados = Number(
        resumoApi.avaliados ||
          resumoApi.totalAvaliacoesResposta ||
          resumoApi.total_avaliacoes_resposta ||
          notas.length ||
          0
      )

      const aguardandoAvaliacao = Number(
        resumoApi.aguardandoAvaliacao ||
          resumoApi.aguardando_avaliacao ||
          chamados.filter((item) => {
            const status = normalizar(item.status)
            const nota = Number(item.avaliacao_resposta_nota || item.avaliacao_nota || 0)
            return status === 'respondido' && Boolean(item.resposta_admin) && !(nota >= 1 && nota <= 5)
          }).length ||
          0
      )

      const resumo: SuporteResumo = {
        total: Number(resumoApi.total || chamados.length || 0),
        novos: Number(
          resumoApi.novos ||
            resumoApi.novo ||
            resumoApi.porStatus?.novo ||
            countStatus('novo') ||
            0
        ),
        emAnalise: Number(
          resumoApi.em_analise ||
            resumoApi.emAnalise ||
            resumoApi.porStatus?.em_analise ||
            countStatus('em_analise') ||
            0
        ),
        respondidos,
        resolvidos: Number(
          resumoApi.resolvidos ||
            resumoApi.resolvido ||
            resumoApi.porStatus?.resolvido ||
            countStatus('resolvido') ||
            0
        ),
        arquivados: Number(
          resumoApi.arquivados ||
            resumoApi.arquivado ||
            resumoApi.porStatus?.arquivado ||
            countStatus('arquivado') ||
            0
        ),
        urgentes: Number(
          resumoApi.urgentes ||
            resumoApi.porPrioridade?.urgente ||
            chamados.filter((item) => normalizar(item.prioridade) === 'urgente').length ||
            0
        ),
        bugs: Number(
          resumoApi.bugs ||
            resumoApi.porTipo?.bug ||
            chamados.filter((item) => normalizar(item.tipo_chamado || item.tipo) === 'bug').length ||
            0
        ),
        aguardandoAvaliacao,
        avaliados,
        mediaAvaliacao: Number(
          resumoApi.mediaAvaliacao ||
            resumoApi.media_avaliacao ||
            resumoApi.mediaNotaResposta ||
            resumoApi.media_nota_resposta ||
            mediaAvaliacaoCalculada ||
            0
        )
      }

      setSuporteResumo(resumo)
      return resumo
    } catch (error) {
      console.warn('Erro ao carregar suporte:', error)
      setSuporteResumo(suporteInicial)
      return suporteInicial
    }
  }

  const carregarCancelamentos = async () => {
    try {
      const response = await fetch('/api/admin/cancelamentos?status=todos&tipo=todos&limite=200')
      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        console.warn('Aviso ao carregar cancelamentos:', data)
        setCancelamentosResumo(cancelamentosInicial)
        return cancelamentosInicial
      }

      const resumo: CancelamentosResumo = {
        total: Number(data?.resumo?.total || 0),
        totalOriginal: Number(data?.resumo?.totalOriginal || data?.resumo?.total_original || 0),
        totalCreditado: Number(data?.resumo?.totalCreditado || data?.resumo?.total_creditado || 0),
        totalRetidoPlataforma: Number(data?.resumo?.totalRetidoPlataforma || data?.resumo?.total_retido_plataforma || 0),
        porTipo: data?.resumo?.porTipo || {},
        porStatus: data?.resumo?.porStatus || {}
      }

      setCancelamentosResumo(resumo)
      return resumo
    } catch (error) {
      console.warn('Erro ao carregar cancelamentos:', error)
      setCancelamentosResumo(cancelamentosInicial)
      return cancelamentosInicial
    }
  }

  const carregarSaldos = async () => {
    try {
      const response = await fetch('/api/admin/saldos/clientes?limite=200')
      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false || data?.success === false) {
        console.warn('Aviso ao carregar saldos:', data)
        setSaldosResumo(saldosInicial)
        return saldosInicial
      }

      const lista = (data?.clientes || data?.saldos || data?.items || []) as any[]
      const resumoApi = data?.resumo || {}

      const saldoTotalCalculado = lista.reduce(
        (total, item) => total + Number(item.saldo_atual || item.saldo || item.valor_saldo || 0),
        0
      )

      const resumo: SaldosResumo = {
        clientesComSaldo: Number(
          resumoApi.clientesComSaldo ||
            resumoApi.clientes_com_saldo ||
            lista.filter((item) => Number(item.saldo_atual || item.saldo || item.valor_saldo || 0) > 0).length ||
            0
        ),
        saldoTotal: Number(resumoApi.saldoTotal || resumoApi.saldo_total || saldoTotalCalculado || 0),
        creditosTotal: Number(resumoApi.creditosTotal || resumoApi.creditos_total || 0),
        debitosTotal: Number(resumoApi.debitosTotal || resumoApi.debitos_total || 0)
      }

      setSaldosResumo(resumo)
      return resumo
    } catch (error) {
      console.warn('Erro ao carregar saldos:', error)
      setSaldosResumo(saldosInicial)
      return saldosInicial
    }
  }

  const carregarTudo = async () => {
    setErro('')

    const avaliacoesResumo = await carregarAvaliacoes()
    const cadasturResumoAtual = await carregarCadastur()
    const suporteResumoAtual = await carregarSuporte()
    const cancelamentosResumoAtual = await carregarCancelamentos()
    const saldosResumoAtual = await carregarSaldos()

    const [
      usuariosResult,
      roteirosResult,
      reservasResult,
      gruposResult
    ] = await Promise.all([
      supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(800),
      supabase
        .from('roteiros')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(800),
      supabase
        .from('reservas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(800),
      supabase
        .from('grupos_roteiros')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(800)
    ])

    if (usuariosResult.error) {
      console.warn('Erro ao carregar usuários:', usuariosResult.error)
    }

    if (roteirosResult.error) {
      console.warn('Erro ao carregar roteiros:', roteirosResult.error)
    }

    if (reservasResult.error) {
      console.warn('Erro ao carregar reservas:', reservasResult.error)
    }

    if (gruposResult.error) {
      console.warn('Erro ao carregar grupos:', gruposResult.error)
    }

    const usuariosData = (usuariosResult.data || []) as UsuarioBanco[]
    const roteirosData = (roteirosResult.data || []) as Roteiro[]
    const reservasData = (reservasResult.data || []) as Reserva[]
    const gruposData = (gruposResult.data || []) as GrupoRoteiro[]

    setUsuarios(usuariosData)
    setRoteiros(roteirosData)
    setReservas(reservasData)
    setGrupos(gruposData)

    const reservasConfirmadas = reservasData.filter(pagamentoConfirmado)
    const reservasPendentes = reservasData.filter(
      (reserva) => !pagamentoConfirmado(reserva) && !reservaCancelada(reserva)
    )
    const reservasCanceladas = reservasData.filter(reservaCancelada)

    const reservasConfirmadasMes = reservasConfirmadas.filter((reserva) =>
      dentroDoMesAtual(reserva.created_at)
    )

    const receitaBrutaTotal = reservasConfirmadas.reduce(
      (total, reserva) => total + Number(reserva.valor_total || 0),
      0
    )

    const receitaBrutaMes = reservasConfirmadasMes.reduce(
      (total, reserva) => total + Number(reserva.valor_total || 0),
      0
    )

    const taxaPlataformaTotal = receitaBrutaTotal * 0.05
    const taxaPlataformaMes = receitaBrutaMes * 0.05

    const taxaPagHiperTotal = 0
    const taxaPagHiperMes = 0

    const repasseGuiasTotal = receitaBrutaTotal - taxaPlataformaTotal - taxaPagHiperTotal
    const repasseGuiasMes = receitaBrutaMes - taxaPlataformaMes - taxaPagHiperMes

    const resultadoPlataformaTotal = receitaBrutaTotal - repasseGuiasTotal - taxaPagHiperTotal
    const resultadoPlataformaMes = receitaBrutaMes - repasseGuiasMes - taxaPagHiperMes

    const statsCalculados: Stats = {
      usuariosTotal: usuariosData.length,
      clientesTotal: usuariosData.filter((item) => normalizar(item.tipo) === 'cliente').length,
      guiasTotal: usuariosData.filter((item) => normalizar(item.tipo) === 'guia').length,
      adminsTotal: usuariosData.filter((item) => normalizar(item.tipo) === 'admin').length,
      usuariosNovosMes: usuariosData.filter((item) => dentroDoMesAtual(item.created_at)).length,

      roteirosTotal: roteirosData.length,
      roteirosAtivos: roteirosData.filter((item) => statusRoteiro(item) === 'ativo').length,
      roteirosPendentes: roteirosData.filter((item) => {
        const status = statusRoteiro(item)
        return status === 'pendente' || status === 'aguardando' || status === 'em_analise'
      }).length,
      roteirosMes: roteirosData.filter((item) => dentroDoMesAtual(item.created_at)).length,

      reservasTotal: reservasData.length,
      reservasConfirmadas: reservasConfirmadas.length,
      reservasPendentes: reservasPendentes.length,
      reservasCanceladas: reservasCanceladas.length,
      reservasMes: reservasData.filter((item) => dentroDoMesAtual(item.created_at)).length,

      receitaBrutaTotal,
      taxaPlataformaTotal,
      taxaPagHiperTotal,
      repasseGuiasTotal,
      resultadoPlataformaTotal,

      receitaBrutaMes,
      taxaPlataformaMes,
      taxaPagHiperMes,
      repasseGuiasMes,
      resultadoPlataformaMes,

      gruposTotal: gruposData.length,
      gruposAtivos: gruposData.filter((item) => normalizar(item.status) === 'ativo').length
    }

    setStats(statsCalculados)
    setAvaliacoes(avaliacoesResumo)
    setCadasturResumo(cadasturResumoAtual)
    setSuporteResumo(suporteResumoAtual)
    setCancelamentosResumo(cancelamentosResumoAtual)
    setSaldosResumo(saldosResumoAtual)
    setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
  }

  const atualizar = async () => {
    setAtualizando(true)
    setMensagem('')
    setErro('')

    try {
      await carregarTudo()
      setMensagem('Dashboard atualizado.')
    } catch (error) {
      console.error('Erro ao atualizar dashboard:', error)
      setErro('Não foi possível atualizar o dashboard agora.')
    } finally {
      setAtualizando(false)
    }
  }

  const abrirAlterarSenha = () => {
    setMenuAberto(false)
    setErro('')
    setMensagem('')
    setSenhaAtual('')
    setNovaSenha('')
    setConfirmarSenha('')
    setModalSenhaAberto(true)
  }

  const alterarSenha = async (event: FormEvent) => {
    event.preventDefault()

    if (!user?.id) {
      router.replace('/login')
      return
    }

    setErro('')
    setMensagem('')

    if (!senhaAtual) {
      setErro('Informe a senha atual.')
      return
    }

    if (!novaSenha || novaSenha.length < 6) {
      setErro('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não conferem.')
      return
    }

    setAlterandoSenha(true)

    try {
      const response = await fetch('/api/alterar-senha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          usuarioId: user.id,
          usuario_id: user.id,
          senhaAtual,
          senha_atual: senhaAtual,
          novaSenha,
          nova_senha: novaSenha
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        setErro(data?.erro || data?.message || 'Não foi possível alterar a senha.')
        return
      }

      setMensagem('Senha alterada com sucesso.')
      setModalSenhaAberto(false)
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarSenha('')
    } catch (error) {
      console.error('Erro ao alterar senha:', error)
      setErro('Erro ao alterar senha.')
    } finally {
      setAlterandoSenha(false)
    }
  }

  const sair = async () => {
    setMenuAberto(false)

    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.warn('Aviso ao encerrar sessão Supabase:', error)
    }

    localStorage.removeItem('user')
    localStorage.removeItem('usuario')
    localStorage.removeItem('token')
    localStorage.removeItem('session')

    router.replace('/login')
  }

  const roteirosRecentes = useMemo(() => {
    return roteiros.slice(0, 2)
  }, [roteiros])

  const reservasRecentes = useMemo(() => {
    return reservas.slice(0, 2)
  }, [reservas])

  const usuariosRecentes = useMemo(() => {
    return usuarios.slice(0, 2)
  }, [usuarios])

  const badgeRoteiro = (roteiro: Roteiro) => {
    const status = statusRoteiro(roteiro)

    if (status === 'ativo') return <span className="badge green">Ativo</span>
    if (status === 'reprovado') return <span className="badge red">Reprovado</span>
    if (status === 'pausado') return <span className="badge neutral">Pausado</span>

    return <span className="badge yellow">Em análise</span>
  }

  const badgeReserva = (reserva: Reserva) => {
    if (pagamentoConfirmado(reserva)) return <span className="badge green">Confirmada</span>
    if (reservaCancelada(reserva)) return <span className="badge red">Cancelada</span>

    return <span className="badge yellow">Pendente</span>
  }

  const pendenciasOperacionais = useMemo(() => {
    return [
      {
        titulo: 'CADASTUR aguardando conferência',
        valor: cadasturResumo.informado,
        texto: 'Guias que preencheram o número e precisam de validação administrativa.',
        rota: '/admin/cadastur',
        icone: '🪪',
        destaque: cadasturResumo.informado > 0,
      },
      {
        titulo: 'Suporte e comunicação',
        valor: suporteResumo.novos + suporteResumo.emAnalise,
        texto: `${suporteResumo.bugs} bug(s), ${suporteResumo.urgentes} urgente(s) e ${suporteResumo.aguardandoAvaliacao} aguardando avaliação do usuário.`,
        rota: '/admin/suporte',
        icone: '🛟',
        destaque: suporteResumo.novos > 0 || suporteResumo.urgentes > 0 || suporteResumo.emAnalise > 0,
      },
      {
        titulo: 'Reservas pendentes',
        valor: stats.reservasPendentes,
        texto: 'Reservas que ainda precisam de pagamento, confirmação ou revisão.',
        rota: '/admin/reservas',
        icone: '🎒',
        destaque: stats.reservasPendentes > 0,
      },
      {
        titulo: 'Roteiros em análise',
        valor: stats.roteirosPendentes,
        texto: 'Experiências recentes aguardando revisão operacional.',
        rota: '/admin/roteiros',
        icone: '🧭',
        destaque: stats.roteirosPendentes > 0,
      },
      {
        titulo: 'Clientes com Saldo de Jornada',
        valor: saldosResumo.clientesComSaldo,
        texto: `${formatarMoeda(saldosResumo.saldoTotal)} em saldo disponível para uso na plataforma.`,
        rota: '/admin/saldos',
        icone: '💳',
        destaque: saldosResumo.clientesComSaldo > 0,
      },
      {
        titulo: 'Cancelamentos registrados',
        valor: cancelamentosResumo.total,
        texto: `${formatarMoeda(cancelamentosResumo.totalCreditado)} creditado aos clientes.`,
        rota: '/admin/cancelamentos',
        icone: '↩️',
        destaque: cancelamentosResumo.total > 0,
      },
    ]
  }, [
    cadasturResumo,
    suporteResumo,
    stats.reservasPendentes,
    stats.roteirosPendentes,
    saldosResumo,
    cancelamentosResumo,
  ])

  if (carregando || !user) {
    return (
      <main className="loading">
        <style>{`
          * { box-sizing: border-box; }

          body {
            margin: 0;
            font-family:
              Inter,
              ui-sans-serif,
              system-ui,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
            background: #0f172a;
          }

          .loading {
            min-height: 100vh;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #e5e7eb;
            background:
              radial-gradient(circle at top left, rgba(34,197,94,0.16), transparent 30%),
              linear-gradient(135deg, #020617, #0f172a);
          }

          .loadingCard {
            background: rgba(15, 23, 42, 0.92);
            border: 1px solid rgba(148, 163, 184, 0.18);
            border-radius: 26px;
            padding: 28px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.35);
          }

          .loadingCard img {
            height: 58px;
            width: auto;
            margin-bottom: 12px;
          }
        `}</style>

        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>Carregando painel administrativo...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          background: #f8fafc;
        }

        .page {
          min-height: 100vh;
          min-height: 100dvh;
          background:
            radial-gradient(circle at 0% 0%, rgba(34, 197, 94, 0.10), transparent 30%),
            radial-gradient(circle at 100% 0%, rgba(59, 130, 246, 0.10), transparent 30%),
            linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
          color: #0f172a;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(248, 250, 252, 0.88);
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(18px);
          padding: 12px 18px;
        }

        .headerInner {
          max-width: 1240px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          min-width: 0;
        }

        .brand img {
          height: 40px;
          width: auto;
          display: block;
        }

        .brandTitle {
          font-size: 17px;
          font-weight: 950;
          color: #0f172a;
          letter-spacing: -0.045em;
          line-height: 1;
        }

        .brandSub {
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          margin-top: 3px;
        }

        .settingsWrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }

        .gearBtn {
          width: 42px;
          height: 42px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: rgba(255, 255, 255, 0.86);
          color: #0f172a;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .gearBtn:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.10);
        }

        .settingsMenu {
          position: absolute;
          top: 50px;
          right: 0;
          width: 220px;
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 22px;
          box-shadow: 0 22px 60px rgba(15, 23, 42, 0.16);
          padding: 8px;
          z-index: 80;
        }

        .menuButton {
          width: 100%;
          border: none;
          background: transparent;
          color: #0f172a;
          padding: 12px 13px;
          border-radius: 16px;
          text-align: left;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .menuButton:hover {
          background: #f8fafc;
        }

        .menuButton.danger {
          color: #991b1b;
        }

        .container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 24px 18px 52px;
        }

        .hero {
          background:
            radial-gradient(circle at top right, rgba(34, 197, 94, 0.18), transparent 30%),
            linear-gradient(135deg, #0f172a, #1e293b);
          color: #ffffff;
          border-radius: 34px;
          padding: 28px;
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
          margin-bottom: 18px;
          overflow: hidden;
          position: relative;
        }

        .hero::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: linear-gradient(to bottom, black, transparent);
          pointer-events: none;
        }

        .heroInner {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 22px;
          align-items: end;
        }

        .eyebrow {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          padding: 8px 12px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.08);
          color: #bbf7d0;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .heroTitle {
          margin: 0;
          font-size: clamp(38px, 5.5vw, 68px);
          line-height: 0.94;
          font-weight: 950;
          letter-spacing: -0.08em;
        }

        .heroTitle span {
          color: #86efac;
        }

        .heroText {
          max-width: 720px;
          color: rgba(255,255,255,0.76);
          font-size: 14px;
          line-height: 1.6;
          font-weight: 650;
          margin: 16px 0 0;
        }

        .revenueHeroCard {
          border-radius: 28px;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.16);
          padding: 20px;
          backdrop-filter: blur(14px);
          cursor: pointer;
          transition: 0.2s ease;
        }

        .revenueHeroCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.20);
        }

        .heroLabel {
          color: rgba(255,255,255,0.66);
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.10em;
        }

        .heroValue {
          margin-top: 8px;
          color: #ffffff;
          font-size: 38px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.07em;
        }

        .heroSmall {
          color: rgba(255,255,255,0.72);
          font-size: 12px;
          font-weight: 750;
          line-height: 1.45;
          margin-top: 8px;
        }

        .heroRows {
          display: grid;
          gap: 7px;
          margin-top: 14px;
        }

        .heroRow {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: rgba(255,255,255,0.82);
          font-size: 12px;
          font-weight: 800;
        }

        .heroRow strong {
          color: #86efac;
        }

        .alert {
          border-radius: 18px;
          padding: 13px 15px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 800;
        }

        .alert.success {
          background: #ecfdf5;
          border: 1px solid #bbf7d0;
          color: #166534;
        }

        .alert.error {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .statCard {
          background: rgba(255,255,255,0.88);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 24px;
          padding: 15px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
          cursor: pointer;
          transition: 0.2s ease;
          min-height: 150px;
        }

        .statCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.10);
        }

        .statIcon {
          width: 38px;
          height: 38px;
          border-radius: 16px;
          background: #ecfdf5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          margin-bottom: 11px;
        }

        .statValue {
          font-size: 27px;
          font-weight: 950;
          line-height: 1;
          letter-spacing: -0.06em;
          color: #0f172a;
        }

        .statLabel {
          color: #64748b;
          font-size: 12px;
          font-weight: 850;
          line-height: 1.35;
          margin-top: 7px;
        }

        .statHint {
          color: #16a34a;
          font-size: 11px;
          font-weight: 950;
          margin-top: 9px;
        }

        .mainGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(360px, 0.92fr);
          gap: 18px;
          align-items: start;
        }

        .panel {
          background: rgba(255,255,255,0.92);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 28px;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.07);
          overflow: hidden;
        }

        .panelHeader {
          padding: 16px 18px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .panelTitle {
          margin: 0;
          color: #0f172a;
          font-size: 18px;
          line-height: 1.15;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .panelSub {
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
          margin-top: 4px;
        }

        .panelBody {
          padding: 14px;
        }

        .textLink {
          border: none;
          background: transparent;
          color: #16a34a;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          padding: 0;
        }

        .compactList {
          display: grid;
          gap: 8px;
        }

        .compactItem {
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 18px;
          padding: 10px 11px;
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .compactItem:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
        }

        .compactIcon {
          width: 42px;
          height: 42px;
          border-radius: 15px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-size: 12px;
          font-weight: 950;
          overflow: hidden;
        }

        .compactIcon img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .compactTitle {
          color: #0f172a;
          font-size: 13px;
          font-weight: 950;
          line-height: 1.25;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .compactMeta {
          color: #64748b;
          font-size: 11px;
          line-height: 1.35;
          font-weight: 750;
          margin-top: 3px;
        }

        .compactFooter {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-top: 5px;
          flex-wrap: wrap;
        }

        .price {
          color: #16a34a;
          font-size: 12px;
          font-weight: 950;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 4px 7px;
          font-size: 10px;
          font-weight: 950;
        }

        .badge.green {
          background: #dcfce7;
          color: #166534;
        }

        .badge.yellow {
          background: #fef3c7;
          color: #92400e;
        }

        .badge.red {
          background: #fee2e2;
          color: #991b1b;
        }

        .badge.neutral {
          background: #f1f5f9;
          color: #475569;
        }

        .sideGrid {
          display: grid;
          gap: 18px;
        }

        .insightBox,
        .financeBox {
          background:
            radial-gradient(circle at top right, rgba(34,197,94,0.24), transparent 34%),
            linear-gradient(135deg, #0f172a, #1e293b);
          color: #ffffff;
          border-radius: 28px;
          padding: 22px;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.20);
          cursor: pointer;
          transition: 0.2s ease;
        }

        .insightBox:hover,
        .financeBox:hover {
          transform: translateY(-2px);
          box-shadow: 0 22px 52px rgba(15, 23, 42, 0.24);
        }

        .insightBox {
          background:
            radial-gradient(circle at top right, rgba(251,146,60,0.18), transparent 34%),
            radial-gradient(circle at bottom left, rgba(34,197,94,0.16), transparent 30%),
            linear-gradient(135deg, #0f172a, #1e293b);
        }

        .boxLabel {
          color: rgba(255,255,255,0.68);
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.10em;
        }

        .boxValue {
          margin-top: 8px;
          color: #86efac;
          font-size: 34px;
          font-weight: 950;
          letter-spacing: -0.07em;
          line-height: 1;
        }

        .heroStars {
          color: #86efac;
          font-size: 18px;
          letter-spacing: 1px;
          margin-top: 8px;
        }

        .boxText {
          color: rgba(255,255,255,0.72);
          font-size: 13px;
          line-height: 1.55;
          font-weight: 700;
          margin-top: 9px;
        }

        .boxRows {
          display: grid;
          gap: 8px;
          margin-top: 15px;
        }

        .boxRow {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          color: rgba(255,255,255,0.82);
          font-size: 12px;
          font-weight: 800;
        }

        .boxButton {
          width: 100%;
          border: none;
          background: #86efac;
          color: #0f172a;
          border-radius: 999px;
          padding: 12px 14px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          margin-top: 16px;
        }

        .quickGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .quickBtn {
          min-height: 76px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: #ffffff;
          border-radius: 20px;
          padding: 12px;
          text-align: left;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .quickBtn:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
        }

        .quickIcon {
          font-size: 18px;
          margin-bottom: 7px;
        }

        .quickTitle {
          color: #0f172a;
          font-size: 13px;
          font-weight: 950;
        }

        .quickText {
          color: #64748b;
          font-size: 11px;
          font-weight: 750;
          line-height: 1.35;
          margin-top: 3px;
        }

        .empty {
          padding: 20px;
          text-align: center;
          color: #64748b;
          background: #ffffff;
          border: 1px dashed #cbd5e1;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 750;
        }

        .commandPanel {
          background: rgba(255,255,255,0.94);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 28px;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.07);
          overflow: hidden;
          margin-bottom: 18px;
        }

        .commandHeader {
          padding: 16px 18px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .commandTitle {
          margin: 0;
          color: #0f172a;
          font-size: 19px;
          font-weight: 950;
          letter-spacing: -0.045em;
        }

        .commandSub {
          margin-top: 4px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
        }

        .commandGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          padding: 14px;
        }

        .commandItem {
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: #ffffff;
          border-radius: 22px;
          padding: 13px;
          display: grid;
          grid-template-columns: 42px minmax(0,1fr);
          gap: 10px;
          cursor: pointer;
          transition: 0.2s ease;
          text-align: left;
        }

        .commandItem:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
        }

        .commandItem.active {
          border-color: rgba(234, 88, 12, 0.18);
          background: linear-gradient(135deg, #fff7ed, #ffffff);
        }

        .commandIcon {
          width: 42px;
          height: 42px;
          border-radius: 16px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        .commandValue {
          color: #0f172a;
          font-size: 24px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.06em;
        }

        .commandName {
          color: #0f172a;
          font-size: 12px;
          line-height: 1.25;
          font-weight: 950;
          margin-top: 4px;
        }

        .commandText {
          color: #64748b;
          font-size: 11px;
          line-height: 1.35;
          font-weight: 750;
          margin-top: 4px;
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.54);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          z-index: 100;
        }

        .modal {
          width: 100%;
          max-width: 430px;
          background: #ffffff;
          border-radius: 28px;
          box-shadow: 0 28px 90px rgba(15, 23, 42, 0.30);
          overflow: hidden;
        }

        .modalHeader {
          padding: 20px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        }

        .modalTitle {
          margin: 0;
          color: #0f172a;
          font-size: 20px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .modalSub {
          color: #64748b;
          font-size: 12px;
          font-weight: 750;
          line-height: 1.45;
          margin-top: 5px;
        }

        .modalBody {
          padding: 20px;
          display: grid;
          gap: 12px;
        }

        .field {
          display: grid;
          gap: 6px;
        }

        .label {
          color: #475569;
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .input {
          width: 100%;
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: #ffffff;
          color: #0f172a;
          border-radius: 16px;
          padding: 13px 14px;
          font-size: 14px;
          font-weight: 800;
          outline: none;
        }

        .input:focus {
          border-color: #22c55e;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.10);
        }

        .modalActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .btn {
          border: none;
          border-radius: 999px;
          padding: 12px 15px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .btn.primary {
          background: #0f172a;
          color: #ffffff;
        }

        .btn.light {
          background: #f1f5f9;
          color: #475569;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 1180px) {
          .statsGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 1040px) {
          .heroInner,
          .mainGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .header {
            padding: 10px 12px;
          }

          .brandTitle,
          .brandSub {
            display: none;
          }

          .container {
            padding: 16px 12px 42px;
          }

          .hero,
          .panel,
          .insightBox,
          .financeBox {
            border-radius: 24px;
          }

          .hero {
            padding: 22px;
          }

          .statsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .quickGrid {
            grid-template-columns: 1fr;
          }

          .commandGrid {
            grid-template-columns: 1fr 1fr;
          }

          .settingsMenu {
            right: 0;
          }
        }

        @media (max-width: 480px) {
          .heroTitle {
            font-size: 38px;
          }

          .statsGrid {
            grid-template-columns: 1fr;
          }

          .commandGrid {
            grid-template-columns: 1fr;
          }

          .compactItem {
            grid-template-columns: 38px minmax(0, 1fr);
          }

          .compactIcon {
            width: 38px;
            height: 38px;
          }

          .modalActions {
            display: grid;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <div
            className="brand"
            onClick={() => router.push('/admin/dashboard')}
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />

            <div>
              <div className="brandTitle">PrussikTrails Admin</div>
              <div className="brandSub">Painel administrativo</div>
            </div>
          </div>

          <div className="settingsWrap">
            <button
              type="button"
              className="gearBtn"
              onClick={() => setMenuAberto((aberto) => !aberto)}
              aria-label="Configurações"
            >
              ⚙️
            </button>

            {menuAberto && (
              <div className="settingsMenu">
                <button
                  type="button"
                  className="menuButton"
                  onClick={abrirAlterarSenha}
                >
                  🔐 Alterar senha
                </button>

                <button
                  type="button"
                  className="menuButton danger"
                  onClick={sair}
                >
                  🚪 Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroInner">
            <div>
              <div className="eyebrow">Administração geral</div>

              <h1 className="heroTitle">
                Olá, {primeiroNome(nomeUsuario(user))}.
                <br />
                Controle a operação com <span>visão total.</span>
              </h1>

              <p className="heroText">
                Receita, repasses, roteiros, reservas, usuários, grupos, avaliações, suporte, saldos e CADASTUR em uma central administrativa objetiva.
                {ultimaAtualizacao && (
                  <>
                    <br />
                    Atualizado às {ultimaAtualizacao}.
                  </>
                )}
              </p>
            </div>

            <aside
              className="revenueHeroCard"
              onClick={() => router.push('/admin/financeiro')}
            >
              <div className="heroLabel">Resultado estimado do mês</div>
              <div className="heroValue">{formatarMoeda(stats.resultadoPlataformaMes)}</div>
              <div className="heroSmall">
                Receita do mês com abatimento estimado dos repasses aos guias e taxa da plataforma.
              </div>

              <div className="heroRows">
                <div className="heroRow">
                  <span>Receita bruta</span>
                  <strong>{formatarMoeda(stats.receitaBrutaMes)}</strong>
                </div>

                <div className="heroRow">
                  <span>Repasse guias</span>
                  <strong>{formatarMoeda(stats.repasseGuiasMes)}</strong>
                </div>

                <div className="heroRow">
                  <span>Taxa Prussik 5%</span>
                  <strong>{formatarMoeda(stats.taxaPlataformaMes)}</strong>
                </div>

                <div className="heroRow">
                  <span>Taxas PH</span>
                  <strong>{formatarMoeda(stats.taxaPagHiperMes)}</strong>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {mensagem && (
          <div className="alert success">{mensagem}</div>
        )}

        {erro && (
          <div className="alert error">{erro}</div>
        )}

        <section className="commandPanel">
          <div className="commandHeader">
            <div>
              <h2 className="commandTitle">Pendências do dia</h2>
              <div className="commandSub">
                Ações que merecem atenção do Admin antes de novas melhorias ou deploy.
              </div>
            </div>

            <button
              type="button"
              className="textLink"
              onClick={atualizar}
              disabled={atualizando}
            >
              {atualizando ? 'Atualizando...' : 'Recarregar pendências'}
            </button>
          </div>

          <div className="commandGrid">
            {pendenciasOperacionais.map((item) => (
              <button
                type="button"
                key={item.titulo}
                className={`commandItem ${item.destaque ? 'active' : ''}`}
                onClick={() => router.push(item.rota)}
              >
                <div className="commandIcon">{item.icone}</div>
                <div>
                  <div className="commandValue">{item.valor}</div>
                  <div className="commandName">{item.titulo}</div>
                  <div className="commandText">{item.texto}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="statsGrid">
          <article
            className="statCard"
            onClick={() => router.push('/admin/financeiro')}
          >
            <div className="statIcon">💰</div>
            <div className="statValue">{formatarMoeda(stats.receitaBrutaMes)}</div>
            <div className="statLabel">
              receita bruta do mês · resultado {formatarMoeda(stats.resultadoPlataformaMes)}
            </div>
            <div className="statHint">Abrir financeiro</div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/admin/usuarios')}
          >
            <div className="statIcon">👥</div>
            <div className="statValue">{stats.usuariosTotal}</div>
            <div className="statLabel">
              usuários · {stats.clientesTotal} clientes · {stats.guiasTotal} guias · {stats.usuariosNovosMes} novos no mês
            </div>
            <div className="statHint">Gerenciar usuários</div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/admin/cadastur')}
          >
            <div className="statIcon">🪪</div>
            <div className="statValue">{cadasturResumo.ativo}</div>
            <div className="statLabel">
              CADASTUR · {cadasturResumo.informado} informado(s) · {cadasturResumo.verificado} verificado(s) · {cadasturResumo.sem_cadastur} sem cadastro
            </div>
            <div className="statHint">Conferir CADASTUR</div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/admin/roteiros')}
          >
            <div className="statIcon">🧭</div>
            <div className="statValue">{stats.roteirosTotal}</div>
            <div className="statLabel">
              roteiros · {stats.roteirosAtivos} ativos · {stats.roteirosPendentes} em análise · {stats.roteirosMes} novos no mês
            </div>
            <div className="statHint">Revisar roteiros</div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/admin/reservas')}
          >
            <div className="statIcon">🎒</div>
            <div className="statValue">{stats.reservasTotal}</div>
            <div className="statLabel">
              reservas · {stats.reservasConfirmadas} confirmadas · {stats.reservasPendentes} pendentes · {stats.reservasCanceladas} canceladas
            </div>
            <div className="statHint">Acompanhar reservas</div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/admin/avaliacoes')}
          >
            <div className="statIcon">⭐</div>
            <div className="statValue">{formatarNota(avaliacoes.mediaNota)}</div>
            <div className="statLabel">
              avaliações · {avaliacoes.total} registro(s) · {avaliacoes.notasBaixas} atenção · {formatarPercentual(avaliacoes.segurancaAltaPercentual)} segurança
            </div>
            <div className="statHint">Moderar avaliações</div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/admin/grupos')}
          >
            <div className="statIcon">💬</div>
            <div className="statValue">{stats.gruposTotal}</div>
            <div className="statLabel">
              grupos internos · {stats.gruposAtivos} ativos · acesso pós-pagamento confirmado
            </div>
            <div className="statHint">Administrar grupos</div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/admin/suporte')}
          >
            <div className="statIcon">🛟</div>
            <div className="statValue">{suporteResumo.novos}</div>
            <div className="statLabel">
              suporte e comunicação · {suporteResumo.total} chamado(s) · {suporteResumo.aguardandoAvaliacao} aguardando avaliação · média {formatarNota(suporteResumo.mediaAvaliacao)}/5
            </div>
            <div className="statHint">Abrir central de suporte</div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/admin/saldos')}
          >
            <div className="statIcon">💳</div>
            <div className="statValue">{saldosResumo.clientesComSaldo}</div>
            <div className="statLabel">
              Saldo de Jornada · {formatarMoeda(saldosResumo.saldoTotal)} disponível para clientes
            </div>
            <div className="statHint">Gerenciar saldos</div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/admin/cancelamentos')}
          >
            <div className="statIcon">↩️</div>
            <div className="statValue">{cancelamentosResumo.total}</div>
            <div className="statLabel">
              cancelamentos · {formatarMoeda(cancelamentosResumo.totalCreditado)} creditado · {formatarMoeda(cancelamentosResumo.totalRetidoPlataforma)} retido
            </div>
            <div className="statHint">Auditar créditos</div>
          </article>
        </section>

        <section className="mainGrid">
          <div>
            <section className="panel">
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Central operacional</h2>
                  <div className="panelSub">
                    Atalhos administrativos com função real e monitoramento rápido.
                  </div>
                </div>

                <button
                  type="button"
                  className="textLink"
                  onClick={atualizar}
                  disabled={atualizando}
                >
                  {atualizando ? 'Atualizando...' : 'Atualizar painel'}
                </button>
              </div>

              <div className="panelBody">
                <div className="quickGrid">
                  <button
                    type="button"
                    className="quickBtn"
                    onClick={() => router.push('/admin/financeiro')}
                  >
                    <div className="quickIcon">💰</div>
                    <div className="quickTitle">Financeiro</div>
                    <div className="quickText">Receitas, taxa 5%, repasses e futuro controle PH.</div>
                  </button>

                  <button
                    type="button"
                    className="quickBtn"
                    onClick={() => router.push('/admin/roteiros')}
                  >
                    <div className="quickIcon">🧭</div>
                    <div className="quickTitle">Roteiros</div>
                    <div className="quickText">Aprovar, revisar, ativar e acompanhar experiências.</div>
                  </button>

                  <button
                    type="button"
                    className="quickBtn"
                    onClick={() => router.push('/admin/reservas')}
                  >
                    <div className="quickIcon">🎒</div>
                    <div className="quickTitle">Reservas</div>
                    <div className="quickText">Pagamentos, confirmações e movimentação de clientes.</div>
                  </button>

                  <button
                    type="button"
                    className="quickBtn"
                    onClick={() => router.push('/admin/saldos')}
                  >
                    <div className="quickIcon">💳</div>
                    <div className="quickTitle">Saldos</div>
                    <div className="quickText">Saldo de Jornada, créditos, débitos e extrato.</div>
                  </button>

                  <button
                    type="button"
                    className="quickBtn"
                    onClick={() => router.push('/admin/cancelamentos')}
                  >
                    <div className="quickIcon">↩️</div>
                    <div className="quickTitle">Cancelamentos</div>
                    <div className="quickText">Motivos, créditos gerados e retenções da plataforma.</div>
                  </button>

                  <button
                    type="button"
                    className="quickBtn"
                    onClick={() => router.push('/admin/avaliacoes')}
                  >
                    <div className="quickIcon">⭐</div>
                    <div className="quickTitle">Avaliações</div>
                    <div className="quickText">Reputação, qualidade, segurança e moderação.</div>
                  </button>

                  <button
                    type="button"
                    className="quickBtn"
                    onClick={() => router.push('/admin/usuarios')}
                  >
                    <div className="quickIcon">👥</div>
                    <div className="quickTitle">Usuários</div>
                    <div className="quickText">Clientes, guias, admins e crescimento da base.</div>
                  </button>

                  <button
                    type="button"
                    className="quickBtn"
                    onClick={() => router.push('/admin/grupos')}
                  >
                    <div className="quickIcon">💬</div>
                    <div className="quickTitle">Grupos</div>
                    <div className="quickText">Comunidades internas por roteiro e acesso pós-pagamento.</div>
                  </button>

                  <button
                    type="button"
                    className="quickBtn"
                    onClick={() => router.push('/admin/cadastur')}
                  >
                    <div className="quickIcon">🪪</div>
                    <div className="quickTitle">CADASTUR</div>
                    <div className="quickText">Conferir guias, validar credenciais e liberar medalhas de verificação.</div>
                  </button>

                  <button
                    type="button"
                    className="quickBtn"
                    onClick={() => router.push('/admin/suporte')}
                  >
                    <div className="quickIcon">🛟</div>
                    <div className="quickTitle">Suporte e comunicação</div>
                    <div className="quickText">Responder chamados, acompanhar finalizações e nota da resposta.</div>
                  </button>
                </div>
              </div>
            </section>

            <section className="panel" style={{ marginTop: 18 }}>
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Roteiros recentes</h2>
                  <div className="panelSub">
                    Lista reduzida com os 2 últimos cadastros.
                  </div>
                </div>

                <button
                  type="button"
                  className="textLink"
                  onClick={() => router.push('/admin/roteiros')}
                >
                  Ver todos
                </button>
              </div>

              <div className="panelBody">
                {roteirosRecentes.length === 0 ? (
                  <div className="empty">
                    Nenhum roteiro cadastrado ainda.
                  </div>
                ) : (
                  <div className="compactList">
                    {roteirosRecentes.map((roteiro) => {
                      const imagem = imagemRoteiro(roteiro)

                      return (
                        <article
                          className="compactItem"
                          key={roteiro.id}
                          onClick={() => router.push('/admin/roteiros')}
                        >
                          <div className="compactIcon">
                            {imagem ? (
                              <img src={imagem} alt={tituloRoteiro(roteiro)} />
                            ) : (
                              'RT'
                            )}
                          </div>

                          <div>
                            <div className="compactTitle">
                              {tituloRoteiro(roteiro)}
                            </div>

                            <div className="compactMeta">
                              {localRoteiro(roteiro)} · {formatarData(roteiro.created_at)}
                            </div>

                            <div className="compactFooter">
                              <span className="price">
                                {formatarMoeda(roteiro.preco || roteiro.valor || 0)}
                              </span>

                              {badgeRoteiro(roteiro)}
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="sideGrid">
            <section
              className="financeBox"
              onClick={() => router.push('/admin/financeiro')}
            >
              <div className="boxLabel">Receita do mês</div>
              <div className="boxValue">{formatarMoeda(stats.receitaBrutaMes)}</div>

              <div className="boxText">
                Visão financeira mensal com cálculo de taxa da plataforma e repasse estimado aos guias.
              </div>

              <div className="boxRows">
                <div className="boxRow">
                  <span>Taxa Prussik 5%</span>
                  <strong>{formatarMoeda(stats.taxaPlataformaMes)}</strong>
                </div>

                <div className="boxRow">
                  <span>Repasse guias 95%</span>
                  <strong>{formatarMoeda(stats.repasseGuiasMes)}</strong>
                </div>

                <div className="boxRow">
                  <span>Taxas PH</span>
                  <strong>{formatarMoeda(stats.taxaPagHiperMes)}</strong>
                </div>

                <div className="boxRow">
                  <span>Resultado plataforma</span>
                  <strong>{formatarMoeda(stats.resultadoPlataformaMes)}</strong>
                </div>
              </div>

              <button
                type="button"
                className="boxButton"
                onClick={(event) => {
                  event.stopPropagation()
                  router.push('/admin/financeiro')
                }}
              >
                Abrir financeiro
              </button>
            </section>

            <section
              className="insightBox"
              onClick={() => router.push('/admin/avaliacoes')}
            >
              <div className="boxLabel">Qualidade da plataforma</div>
              <div className="boxValue">{formatarNota(avaliacoes.mediaNota)}</div>
              <div className="heroStars">{estrelas(avaliacoes.mediaNota)}</div>

              <div className="boxText">
                Média geral das avaliações publicadas pelos clientes.
              </div>

              <div className="boxRows">
                <div className="boxRow">
                  <span>Total de avaliações</span>
                  <strong>{avaliacoes.total}</strong>
                </div>

                <div className="boxRow">
                  <span>Sentiram muita segurança</span>
                  <strong>{formatarPercentual(avaliacoes.segurancaAltaPercentual)}</strong>
                </div>

                <div className="boxRow">
                  <span>Recomendariam</span>
                  <strong>{formatarPercentual(avaliacoes.percentualRecomendacao)}</strong>
                </div>

                <div className="boxRow">
                  <span>Avaliações de atenção</span>
                  <strong>{avaliacoes.notasBaixas}</strong>
                </div>
              </div>

              <button
                type="button"
                className="boxButton"
                onClick={(event) => {
                  event.stopPropagation()
                  router.push('/admin/avaliacoes')
                }}
              >
                Abrir avaliações
              </button>
            </section>

            <section className="panel">
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Reservas recentes</h2>
                  <div className="panelSub">
                    Lista reduzida com as 2 últimas reservas.
                  </div>
                </div>

                <button
                  type="button"
                  className="textLink"
                  onClick={() => router.push('/admin/reservas')}
                >
                  Ver todas
                </button>
              </div>

              <div className="panelBody">
                {reservasRecentes.length === 0 ? (
                  <div className="empty">
                    Nenhuma reserva encontrada ainda.
                  </div>
                ) : (
                  <div className="compactList">
                    {reservasRecentes.map((reserva) => (
                      <article
                        className="compactItem"
                        key={reserva.id}
                        onClick={() => router.push('/admin/reservas')}
                      >
                        <div className="compactIcon">RS</div>

                        <div>
                          <div className="compactTitle">
                            Reserva {reserva.id.slice(0, 8)}
                          </div>

                          <div className="compactMeta">
                            {reserva.quantidade_pessoas || 1} pessoa(s) · {formatarData(reserva.created_at)}
                          </div>

                          <div className="compactFooter">
                            <span className="price">
                              {formatarMoeda(reserva.valor_total || 0)}
                            </span>

                            {badgeReserva(reserva)}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Usuários recentes</h2>
                  <div className="panelSub">
                    Lista reduzida com os 2 últimos cadastros.
                  </div>
                </div>

                <button
                  type="button"
                  className="textLink"
                  onClick={() => router.push('/admin/usuarios')}
                >
                  Ver todos
                </button>
              </div>

              <div className="panelBody">
                {usuariosRecentes.length === 0 ? (
                  <div className="empty">
                    Nenhum usuário encontrado.
                  </div>
                ) : (
                  <div className="compactList">
                    {usuariosRecentes.map((usuario) => (
                      <article
                        className="compactItem"
                        key={usuario.id}
                        onClick={() => router.push('/admin/usuarios')}
                      >
                        <div className="compactIcon">US</div>

                        <div>
                          <div className="compactTitle">
                            {nomeUsuario(usuario)}
                          </div>

                          <div className="compactMeta">
                            {usuario.email || 'E-mail não informado'} · {formatarData(usuario.created_at)}
                          </div>

                          <div className="compactFooter">
                            <span className="price">
                              {usuario.tipo || 'usuário'}
                            </span>

                            <span className="badge neutral">
                              {usuario.id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>

      {modalSenhaAberto && (
        <div className="modalOverlay">
          <form className="modal" onSubmit={alterarSenha}>
            <div className="modalHeader">
              <h2 className="modalTitle">Alterar senha</h2>
              <div className="modalSub">
                Atualize sua senha de acesso administrativo.
              </div>
            </div>

            <div className="modalBody">
              <div className="field">
                <label className="label">Senha atual</label>
                <input
                  className="input"
                  type="password"
                  value={senhaAtual}
                  onChange={(event) => setSenhaAtual(event.target.value)}
                  placeholder="Digite sua senha atual"
                />
              </div>

              <div className="field">
                <label className="label">Nova senha</label>
                <input
                  className="input"
                  type="password"
                  value={novaSenha}
                  onChange={(event) => setNovaSenha(event.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                />
              </div>

              <div className="field">
                <label className="label">Confirmar nova senha</label>
                <input
                  className="input"
                  type="password"
                  value={confirmarSenha}
                  onChange={(event) => setConfirmarSenha(event.target.value)}
                  placeholder="Repita a nova senha"
                />
              </div>

              <div className="modalActions">
                <button
                  type="submit"
                  className="btn primary"
                  disabled={alterandoSenha}
                >
                  {alterandoSenha ? 'Alterando...' : 'Salvar nova senha'}
                </button>

                <button
                  type="button"
                  className="btn light"
                  disabled={alterandoSenha}
                  onClick={() => setModalSenhaAberto(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}