'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type UsuarioLocal = {
  id: string
  nome?: string | null
  email?: string | null
  tipo?: string | null
}

type Roteiro = {
  id: string
  titulo?: string | null
  nome?: string | null
  descricao?: string | null
  preco?: number | null
  valor?: number | null
  status?: string | null
  ativo?: boolean | null
  id_guia?: string | null
  guia_id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  local?: string | null
  localizacao?: string | null
  local_encontro?: string | null
  ponto_encontro?: string | null
  data_roteiro?: string | null
  data_saida?: string | null
  data?: string | null
  hora_roteiro?: string | null
  hora_saida?: string | null
  hora?: string | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  imagem?: string | null
  created_at?: string | null
  updated_at?: string | null
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
  cliente_nome?: string
  roteiro_titulo?: string
  roteiro?: Roteiro | null
}

type Cliente = {
  id: string
  nome?: string | null
  email?: string | null
}

type GrupoRoteiro = {
  id: string
  roteiro_id?: string | null
  guia_id?: string | null
  titulo?: string | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
  roteiro?: Roteiro | null
  membros_count?: number
  clientes_count?: number
  notificacoes_nao_lidas?: number
  mensagens_count?: number
}

type GrupoMembro = {
  id: string
  grupo_id: string
  user_id: string
  papel?: string | null
  status?: string | null
}

type GrupoMensagem = {
  id: string
  grupo_id: string
  mensagem?: string | null
  status?: string | null
  created_at?: string | null
}

type GrupoNotificacao = {
  id: string
  grupo_id: string
  user_id_destino: string
  lida?: boolean | null
  tipo?: string | null
  created_at?: string | null
}

type AvaliacaoResumo = {
  total: number
  mediaNota: number
  percentualRecomendacao: number
  orientacoesClarasPercentual: number
  segurancaAltaPercentual: number
  experienciaSuperouPercentual: number
}

type FinanceiroResumoGuia = {
  receita_bruta: number
  taxa_percentual: number
  taxa_plataforma: number
  taxa_paghiper: number
  valor_liquido_guia: number
  valor_pago: number
  saldo_pendente: number
  reservas_confirmadas: number
  roteiros_total: number
  repasses_total: number
  ultimo_pagamento_em?: string | null
}

type Stats = {
  roteirosTotal: number
  roteirosAtivos: number
  roteirosPendentes: number
  reservasTotal: number
  reservasConfirmadas: number
  reservasPendentes: number
  pessoasReservadas: number
  receitaBruta: number
  taxaPlataforma: number
  taxaPercentual: number
  valorLiquidoGuia: number
  valorPagoGuia: number
  saldoLiquidoGuia: number
  gruposTotal: number
  gruposAtivos: number
  clientesNosGrupos: number
  notificacoesGrupos: number
  repassesRegistrados: number
}

type NotificacaoGuia = {
  id: string
  titulo: string
  texto: string
  emoji: string
  destino?: string
  created_at?: string | null
}

type RoteiroStatus = 'ativo' | 'pendente' | 'reprovado' | 'pausado'

const statsInicial: Stats = {
  roteirosTotal: 0,
  roteirosAtivos: 0,
  roteirosPendentes: 0,
  reservasTotal: 0,
  reservasConfirmadas: 0,
  reservasPendentes: 0,
  pessoasReservadas: 0,
  receitaBruta: 0,
  taxaPlataforma: 0,
  taxaPercentual: 5,
  valorLiquidoGuia: 0,
  valorPagoGuia: 0,
  saldoLiquidoGuia: 0,
  gruposTotal: 0,
  gruposAtivos: 0,
  clientesNosGrupos: 0,
  notificacoesGrupos: 0,
  repassesRegistrados: 0
}

const avaliacaoResumoInicial: AvaliacaoResumo = {
  total: 0,
  mediaNota: 0,
  percentualRecomendacao: 0,
  orientacoesClarasPercentual: 0,
  segurancaAltaPercentual: 0,
  experienciaSuperouPercentual: 0
}

export default function GuiaDashboardPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [grupos, setGrupos] = useState<GrupoRoteiro[]>([])
  const [stats, setStats] = useState<Stats>(statsInicial)
  const [avaliacaoResumo, setAvaliacaoResumo] = useState<AvaliacaoResumo>(avaliacaoResumoInicial)
  const [notificacoes, setNotificacoes] = useState<NotificacaoGuia[]>([])

  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('')

  const [menuAberto, setMenuAberto] = useState(false)
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false)
  const [modalAvisosAberto, setModalAvisosAberto] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [alterandoSenha, setAlterandoSenha] = useState(false)

  useEffect(() => {
    if (iniciouRef.current) return
    iniciouRef.current = true
    iniciar()
  }, [])

  const iniciar = async () => {
    setCarregando(true)
    setMensagem('')
    setErro('')

    try {
      const userData = localStorage.getItem('user')

      if (!userData) {
        router.replace('/login')
        return
      }

      const parsedUser = JSON.parse(userData) as UsuarioLocal

      if (parsedUser.tipo !== 'guia') {
        router.replace('/login')
        return
      }

      setUser(parsedUser)
      await carregarTudo(parsedUser.id)
    } catch (error) {
      console.error('Erro ao iniciar dashboard do guia:', error)
      setErro('Não foi possível carregar seu painel agora.')
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

  const primeiroNome = (valor?: string | null) => {
    const nome = String(valor || 'Guia').trim()
    return nome.split(' ')[0] || 'Guia'
  }

  const nomeUsuario = (usuario?: UsuarioLocal | null) => {
    return usuario?.nome || usuario?.email || 'Guia'
  }

  const tituloRoteiro = (roteiro?: Roteiro | null) => {
    return roteiro?.titulo || roteiro?.nome || 'Roteiro'
  }

  const precoRoteiro = (roteiro?: Roteiro | null) => {
    return Number(roteiro?.preco || roteiro?.valor || 0)
  }

  const imagemRoteiro = (roteiro?: Roteiro | null) => {
    return roteiro?.foto_capa || roteiro?.foto_url || roteiro?.imagem_url || roteiro?.imagem || ''
  }

  const localRoteiro = (roteiro?: Roteiro | null) => {
    return (
      roteiro?.local ||
      roteiro?.localizacao ||
      roteiro?.local_encontro ||
      roteiro?.ponto_encontro ||
      'Local a confirmar'
    )
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

  const percentualSeguro = (valor: any) => {
    return Math.max(0, Math.min(Number(valor || 0), 100))
  }

  const estrelas = (nota: number) => {
    const inteira = Math.round(Number(nota || 0))

    return '★★★★★'
      .split('')
      .map((_, index) => (index < inteira ? '★' : '☆'))
      .join('')
  }

  const tempoRelativo = (valor?: string | null) => {
    if (!valor) return ''

    const data = new Date(valor).getTime()

    if (Number.isNaN(data)) return ''

    const diff = Date.now() - data
    const minutos = Math.floor(diff / 60000)
    const horas = Math.floor(minutos / 60)
    const dias = Math.floor(horas / 24)

    if (minutos < 1) return 'agora'
    if (minutos < 60) return `${minutos}min atrás`
    if (horas < 24) return `${horas}h atrás`
    if (dias === 1) return 'ontem'
    if (dias < 7) return `${dias} dias atrás`

    return formatarData(valor)
  }

  const statusRoteiro = (roteiro: Roteiro): RoteiroStatus => {
    const status = normalizar(roteiro.status)

    if (
      status === 'ativo' ||
      status === 'aprovado' ||
      status === 'aprovada' ||
      status === 'publicado' ||
      status === 'publicada'
    ) {
      return 'ativo'
    }

    if (
      status === 'pendente' ||
      status === 'aguardando' ||
      status === 'em_analise' ||
      status === 'em análise'
    ) {
      return 'pendente'
    }

    if (
      status === 'reprovado' ||
      status === 'reprovada' ||
      status === 'rejeitado' ||
      status === 'rejeitada'
    ) {
      return 'reprovado'
    }

    if (status === 'pausado' || status === 'pausada') {
      return 'pausado'
    }

    if (roteiro.ativo === true) return 'ativo'
    if (roteiro.ativo === false) return 'pausado'

    return 'pendente'
  }

  const statusReserva = (reserva: Reserva) => {
    return normalizar(reserva.status)
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

  const carregarFinanceiroDoGuia = async (guiaId: string) => {
    try {
      const response = await fetch(
        `/api/guia/financeiro/resumo?guiaId=${encodeURIComponent(guiaId)}&_ts=${Date.now()}`,
        {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-store',
            Pragma: 'no-cache'
          }
        }
      )

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        console.warn('Aviso ao carregar financeiro do guia:', data)
        return null as FinanceiroResumoGuia | null
      }

      return (data?.resumo || null) as FinanceiroResumoGuia | null
    } catch (error) {
      console.warn('Erro ao carregar financeiro do guia:', error)
      return null as FinanceiroResumoGuia | null
    }
  }

  const buscarRoteirosDoGuia = async (guiaId: string) => {
    const campos = ['id_guia', 'guia_id', 'user_id', 'usuario_id']
    const mapa = new Map<string, Roteiro>()

    for (const campo of campos) {
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .eq(campo, guiaId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        ;(data as Roteiro[]).forEach((roteiro) => {
          if (roteiro?.id) mapa.set(roteiro.id, roteiro)
        })
      }
    }

    return Array.from(mapa.values())
  }

  const carregarAvaliacoesDoGuia = async (guiaId: string) => {
    try {
      const response = await fetch('/api/avaliacoes/estatisticas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        body: JSON.stringify({
          guiaId,
          status: 'publicada',
          limite: 500,
          limiteComentarios: 8
        }),
        cache: 'no-store'
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        console.warn('Aviso ao buscar estatísticas de avaliações:', data)
        setAvaliacaoResumo(avaliacaoResumoInicial)
        return avaliacaoResumoInicial
      }

      const resumo: AvaliacaoResumo = {
        total: Number(data?.resumo?.total || 0),
        mediaNota: Number(data?.resumo?.mediaNota || 0),
        percentualRecomendacao: Number(data?.resumo?.percentualRecomendacao || 0),
        orientacoesClarasPercentual: Number(data?.resumo?.orientacoesClarasPercentual || 0),
        segurancaAltaPercentual: Number(data?.resumo?.segurancaAltaPercentual || 0),
        experienciaSuperouPercentual: Number(data?.resumo?.experienciaSuperouPercentual || 0)
      }

      setAvaliacaoResumo(resumo)
      return resumo
    } catch (error) {
      console.warn('Erro ao carregar avaliações do guia:', error)
      setAvaliacaoResumo(avaliacaoResumoInicial)
      return avaliacaoResumoInicial
    }
  }

  const carregarGruposDoGuia = async (guiaId: string, roteirosLista: Roteiro[]) => {
    const { data: gruposData, error: gruposError } = await supabase
      .from('grupos_roteiros')
      .select('*')
      .eq('guia_id', guiaId)
      .order('created_at', { ascending: false })

    if (gruposError) {
      console.warn('Erro ao buscar grupos do guia:', gruposError)
      return []
    }

    const gruposBase = (gruposData || []) as GrupoRoteiro[]

    if (gruposBase.length === 0) return []

    const grupoIds = gruposBase.map((grupo) => grupo.id)

    const { data: membrosData } = await supabase
      .from('grupo_membros')
      .select('*')
      .in('grupo_id', grupoIds)
      .eq('status', 'ativo')

    const { data: mensagensData } = await supabase
      .from('grupo_mensagens')
      .select('*')
      .in('grupo_id', grupoIds)
      .eq('status', 'ativa')
      .order('created_at', { ascending: false })
      .limit(120)

    const { data: notificacoesData } = await supabase
      .from('grupo_notificacoes')
      .select('*')
      .in('grupo_id', grupoIds)
      .eq('user_id_destino', guiaId)
      .eq('lida', false)

    const membros = (membrosData || []) as GrupoMembro[]
    const mensagens = (mensagensData || []) as GrupoMensagem[]
    const notificacoes = (notificacoesData || []) as GrupoNotificacao[]

    return gruposBase.map((grupo) => {
      const membrosGrupo = membros.filter((membro) => membro.grupo_id === grupo.id)
      const clientesGrupo = membrosGrupo.filter((membro) => membro.papel === 'cliente')
      const mensagensGrupo = mensagens.filter((mensagem) => mensagem.grupo_id === grupo.id)
      const notificacoesGrupo = notificacoes.filter((notificacao) => notificacao.grupo_id === grupo.id)

      const roteiro = roteirosLista.find((item) => item.id === grupo.roteiro_id) || null

      return {
        ...grupo,
        roteiro,
        membros_count: membrosGrupo.length,
        clientes_count: clientesGrupo.length,
        mensagens_count: mensagensGrupo.length,
        notificacoes_nao_lidas: notificacoesGrupo.length
      }
    })
  }

  const carregarTudo = async (guiaId: string) => {
    try {
      const resumoAvaliacoes = await carregarAvaliacoesDoGuia(guiaId)
      const resumoFinanceiro = await carregarFinanceiroDoGuia(guiaId)

      const roteirosData = await buscarRoteirosDoGuia(guiaId)
      setRoteiros(roteirosData)

      const gruposData = await carregarGruposDoGuia(guiaId, roteirosData)
      setGrupos(gruposData)

      const roteiroIds = roteirosData.map((roteiro) => roteiro.id)

      let reservasBase: Reserva[] = []

      if (roteiroIds.length > 0) {
        const { data: reservasData, error: reservasError } = await supabase
          .from('reservas')
          .select('*')
          .in('roteiro_id', roteiroIds)
          .order('created_at', { ascending: false })

        if (reservasError) {
          console.warn('Erro ao buscar reservas do guia:', reservasError)
        } else {
          reservasBase = (reservasData || []) as Reserva[]
        }
      }

      const clienteIds = Array.from(
        new Set(
          reservasBase
            .map((reserva) => reserva.cliente_id)
            .filter(Boolean) as string[]
        )
      )

      let clientes: Cliente[] = []

      if (clienteIds.length > 0) {
        const { data: clientesData, error: clientesError } = await supabase
          .from('users')
          .select('id, nome, email')
          .in('id', clienteIds)

        if (!clientesError && clientesData) {
          clientes = clientesData as Cliente[]
        }
      }

      const reservasCompletas = reservasBase.map((reserva) => {
        const roteiro = roteirosData.find((item) => item.id === reserva.roteiro_id) || null
        const cliente = clientes.find((item) => item.id === reserva.cliente_id) || null

        return {
          ...reserva,
          roteiro,
          roteiro_titulo: tituloRoteiro(roteiro),
          cliente_nome: cliente?.nome || cliente?.email || 'Cliente'
        }
      })

      setReservas(reservasCompletas)

      const statsCalculados = calcularStats(
        roteirosData,
        reservasCompletas,
        gruposData,
        resumoFinanceiro
      )

      setStats(statsCalculados)

      montarNotificacoes(
        roteirosData,
        reservasCompletas,
        gruposData,
        statsCalculados,
        resumoAvaliacoes
      )

      setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
    } catch (error) {
      console.error('Erro ao carregar dados do guia:', error)
      setErro('Não foi possível atualizar seu painel agora.')
    }
  }

  const calcularStats = (
    roteirosLista: Roteiro[],
    reservasLista: Reserva[],
    gruposLista: GrupoRoteiro[],
    financeiroResumo?: FinanceiroResumoGuia | null
  ): Stats => {
    const roteirosAtivos = roteirosLista.filter(
      (roteiro) => statusRoteiro(roteiro) === 'ativo'
    ).length

    const roteirosPendentes = roteirosLista.filter(
      (roteiro) => statusRoteiro(roteiro) === 'pendente'
    ).length

    const reservasConfirmadas = reservasLista.filter(pagamentoConfirmado)

    const reservasPendentes = reservasLista.filter((reserva) => {
      const status = statusReserva(reserva)
      const pagamento = normalizar(reserva.pagamento_status)

      return (
        status === 'pendente' ||
        status === 'aguardando' ||
        pagamento === 'pendente' ||
        pagamento === 'aguardando'
      )
    })

    const pessoasReservadas = reservasLista.reduce(
      (total, reserva) => total + Number(reserva.quantidade_pessoas || 0),
      0
    )

    const receitaBrutaLocal = reservasConfirmadas.reduce(
      (total, reserva) => total + Number(reserva.valor_total || 0),
      0
    )

    const taxaPercentual = Number(financeiroResumo?.taxa_percentual ?? 5)
    const receitaBruta = Number(financeiroResumo?.receita_bruta ?? receitaBrutaLocal)
    const taxaPlataforma = Number(
      financeiroResumo?.taxa_plataforma ?? receitaBruta * (taxaPercentual / 100)
    )
    const valorLiquidoGuia = Number(
      financeiroResumo?.valor_liquido_guia ?? Math.max(0, receitaBruta - taxaPlataforma)
    )
    const valorPagoGuia = Number(financeiroResumo?.valor_pago ?? 0)
    const saldoLiquidoGuia = Number(
      financeiroResumo?.saldo_pendente ?? Math.max(0, valorLiquidoGuia - valorPagoGuia)
    )

    const gruposAtivos = gruposLista.filter(
      (grupo) => normalizar(grupo.status) === 'ativo'
    ).length

    const clientesNosGrupos = gruposLista.reduce(
      (total, grupo) => total + Number(grupo.clientes_count || 0),
      0
    )

    const notificacoesGrupos = gruposLista.reduce(
      (total, grupo) => total + Number(grupo.notificacoes_nao_lidas || 0),
      0
    )

    return {
      roteirosTotal: roteirosLista.length,
      roteirosAtivos,
      roteirosPendentes,
      reservasTotal: reservasLista.length,
      reservasConfirmadas: Number(financeiroResumo?.reservas_confirmadas ?? reservasConfirmadas.length),
      reservasPendentes: reservasPendentes.length,
      pessoasReservadas,
      receitaBruta,
      taxaPlataforma,
      taxaPercentual,
      valorLiquidoGuia,
      valorPagoGuia,
      saldoLiquidoGuia,
      gruposTotal: gruposLista.length,
      gruposAtivos,
      clientesNosGrupos,
      notificacoesGrupos,
      repassesRegistrados: Number(financeiroResumo?.repasses_total ?? 0)
    }
  }

  const montarNotificacoes = (
    roteirosLista: Roteiro[],
    reservasLista: Reserva[],
    gruposLista: GrupoRoteiro[],
    statsAtuais: Stats,
    resumoAvaliacoes: AvaliacaoResumo
  ) => {
    const lista: NotificacaoGuia[] = []

    const gruposComAvisos = gruposLista.filter(
      (grupo) => Number(grupo.notificacoes_nao_lidas || 0) > 0
    )

    gruposComAvisos.slice(0, 4).forEach((grupo) => {
      lista.push({
        id: `grupo-${grupo.id}`,
        titulo: 'Grupo com nova atividade',
        texto: `${grupo.titulo || tituloRoteiro(grupo.roteiro)} tem ${grupo.notificacoes_nao_lidas} aviso(s) novo(s).`,
        emoji: '💬',
        destino: `/guia/grupos/${grupo.id}`,
        created_at: grupo.updated_at || grupo.created_at || new Date().toISOString()
      })
    })

    if (resumoAvaliacoes.total > 0) {
      lista.push({
        id: 'avaliacoes-guia',
        titulo: 'Avaliações atualizadas',
        texto: `Média ${formatarNota(resumoAvaliacoes.mediaNota)} · ${formatarPercentual(resumoAvaliacoes.segurancaAltaPercentual)} sentiram muita segurança.`,
        emoji: '⭐',
        destino: '/guia/avaliacoes',
        created_at: new Date().toISOString()
      })
    }

    const roteirosPendentes = roteirosLista.filter(
      (roteiro) => statusRoteiro(roteiro) === 'pendente'
    )

    if (roteirosPendentes.length > 0) {
      lista.push({
        id: 'roteiros-pendentes',
        titulo: 'Roteiro aguardando análise',
        texto: `${roteirosPendentes.length} roteiro(s) ainda precisam de aprovação para aparecer ao público.`,
        emoji: '⏳',
        destino: '/guia/roteiros',
        created_at: roteirosPendentes[0]?.created_at || new Date().toISOString()
      })
    }

    reservasLista.slice(0, 4).forEach((reserva) => {
      lista.push({
        id: `reserva-${reserva.id}`,
        titulo: pagamentoConfirmado(reserva)
          ? 'Reserva confirmada'
          : 'Nova reserva aguardando pagamento',
        texto: `${reserva.cliente_nome || 'Cliente'} em ${reserva.roteiro_titulo || 'roteiro'} · ${formatarMoeda(reserva.valor_total || 0)}`,
        emoji: pagamentoConfirmado(reserva) ? '✅' : '🎒',
        destino: pagamentoConfirmado(reserva) ? '/guia/grupos' : '/guia/reservas',
        created_at: reserva.created_at
      })
    })

    if (statsAtuais.saldoLiquidoGuia > 0) {
      lista.push({
        id: 'saldo-guia',
        titulo: 'Saldo pendente atualizado',
        texto: `${formatarMoeda(statsAtuais.saldoLiquidoGuia)} pendente após ${statsAtuais.repassesRegistrados} repasse(s) registrado(s) pelo ADMIN.`,
        emoji: '💰',
        destino: '/guia/financeiro',
        created_at: new Date().toISOString()
      })
    }

    if (lista.length === 0) {
      lista.push({
        id: 'estrutura',
        titulo: 'Tudo em ordem',
        texto: 'Nenhum aviso importante por enquanto.',
        emoji: '🌿',
        destino: '/guia/roteiros',
        created_at: new Date().toISOString()
      })
    }

    setNotificacoes(lista.slice(0, 9))
  }

  const atualizarDashboard = async () => {
    if (!user?.id) return

    setAtualizando(true)
    setMensagem('')
    setErro('')

    try {
      await carregarTudo(user.id)
      setMensagem('Painel atualizado.')
      setTimeout(() => setMensagem(''), 2600)
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
        headers: { 'Content-Type': 'application/json' },
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
      console.warn('Aviso ao encerrar sessão:', error)
    }

    localStorage.removeItem('user')
    localStorage.removeItem('usuario')
    localStorage.removeItem('token')
    localStorage.removeItem('session')

    router.replace('/login')
  }

  const badgeGrupo = (status?: string | null) => {
    const atual = normalizar(status)
    if (atual === 'ativo' || !atual) return <span className="badge badge-green">Ativo</span>
    return <span className="badge badge-neutral">{status || 'Grupo'}</span>
  }

  const gruposRecentes = useMemo(() => grupos.slice(0, 6), [grupos])

  if (carregando || !user) {
    return (
      <main className="loading">
        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; background: #f6f7f1; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
          .loading {
            min-height: 100vh;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            background:
              radial-gradient(circle at top left, rgba(132, 204, 22, 0.18), transparent 30%),
              linear-gradient(180deg, #fffdf7 0%, #eef2e5 100%);
            color: #374151;
          }
          .loadingCard {
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.06);
            border-radius: 30px;
            padding: 28px;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
            text-align: center;
          }
          .loadingCard img { height: 68px; width: auto; margin-bottom: 12px; }
        `}</style>

        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>Preparando seu painel de guia...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{`
        * { box-sizing: border-box; }

        body {
          margin: 0;
          background: #f6f7f1;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .page {
          min-height: 100vh;
          min-height: 100dvh;
          background:
            radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.16), transparent 28%),
            radial-gradient(circle at 90% 10%, rgba(251, 146, 60, 0.14), transparent 28%),
            linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
          color: #172018;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(255, 253, 247, 0.86);
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(18px);
          padding: 10px 16px;
        }

        .headerInner {
          max-width: 1180px;
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
          height: 42px;
          width: auto;
          object-fit: contain;
          display: block;
        }

        .brandTitle {
          font-size: 18px;
          font-weight: 950;
          color: #dc2626;
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .brandSub {
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          margin-top: 3px;
        }

        .settingsWrap {
          position: relative;
        }

        .gearBtn {
          width: 42px;
          height: 42px;
          border: 1px solid rgba(15,23,42,0.08);
          background: rgba(255,255,255,0.84);
          color: #172018;
          border-radius: 999px;
          cursor: pointer;
          font-size: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px rgba(15,23,42,0.05);
        }

        .settingsMenu {
          position: absolute;
          top: 50px;
          right: 0;
          width: 230px;
          background: #ffffff;
          border: 1px solid rgba(15,23,42,0.10);
          border-radius: 22px;
          box-shadow: 0 22px 60px rgba(15,23,42,0.16);
          padding: 8px;
          z-index: 80;
        }

        .menuButton {
          width: 100%;
          border: none;
          background: transparent;
          color: #172018;
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
          max-width: 1180px;
          margin: 0 auto;
          padding: 22px 16px 48px;
        }

        .hero {
          position: relative;
          overflow: hidden;
          border-radius: 38px;
          padding: 30px;
          min-height: 335px;
          background:
            linear-gradient(135deg, rgba(23, 32, 24, 0.76), rgba(23, 32, 24, 0.34)),
            radial-gradient(circle at top right, rgba(190, 242, 100, 0.30), transparent 34%),
            linear-gradient(135deg, #1f331f 0%, #647a49 46%, #d7c6a1 100%);
          color: #ffffff;
          box-shadow: 0 24px 60px rgba(23, 32, 24, 0.18);
          margin-bottom: 16px;
        }

        .hero::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 46px 46px;
          mask-image: linear-gradient(to bottom, black, transparent);
          pointer-events: none;
        }

        .heroContent {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 24px;
          align-items: end;
          min-height: 270px;
        }

        .eyebrow {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.26);
          background: rgba(255, 255, 255, 0.12);
          color: #f7fee7;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .heroTitle {
          margin: 0;
          max-width: 760px;
          font-size: clamp(42px, 6vw, 72px);
          line-height: 0.92;
          font-weight: 950;
          letter-spacing: -0.085em;
        }

        .heroTitle span {
          color: #bef264;
          text-shadow: 0 0 28px rgba(190, 242, 100, 0.32);
        }

        .heroText {
          max-width: 650px;
          color: rgba(255,255,255,0.82);
          line-height: 1.62;
          margin: 16px 0 0;
          font-size: 14px;
        }

        .heroCard {
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 30px;
          padding: 20px;
          backdrop-filter: blur(16px);
        }

        .heroCardLabel {
          color: rgba(255,255,255,0.76);
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }

        .heroCardValue {
          margin-top: 9px;
          color: #ffffff;
          font-size: 34px;
          line-height: 1.05;
          font-weight: 950;
          letter-spacing: -0.07em;
        }

        .heroStars {
          color: #bef264;
          font-size: 18px;
          letter-spacing: 1px;
          margin-top: 8px;
        }

        .heroCardText {
          margin-top: 8px;
          color: rgba(255,255,255,0.78);
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
        }

        .reputationBars {
          display: grid;
          gap: 10px;
          margin-top: 16px;
        }

        .repRowTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,0.84);
          font-size: 11px;
          font-weight: 900;
          margin-bottom: 5px;
        }

        .repTrack {
          height: 8px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255,255,255,0.18);
        }

        .repFill {
          height: 100%;
          border-radius: 999px;
          background: #bef264;
        }

        .heroActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 16px;
        }

        .heroMiniBtn {
          border: 1px solid rgba(255,255,255,0.20);
          background: rgba(255,255,255,0.14);
          color: #ffffff;
          border-radius: 999px;
          padding: 10px 13px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
        }

        .heroMiniBtn.primary {
          background: #bef264;
          color: #172018;
          border-color: #bef264;
        }

        .message {
          background: #ecfdf5;
          color: #166534;
          border: 1px solid #bbf7d0;
          border-radius: 18px;
          padding: 13px 15px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 800;
        }

        .error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
          border-radius: 18px;
          padding: 13px 15px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 800;
        }

        .utilityGrid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .utilityCard {
          background: rgba(255,255,255,0.86);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 28px;
          padding: 16px;
          min-height: 132px;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
          cursor: pointer;
          transition: 0.2s ease;
        }

        .utilityCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.10);
        }

        .utilityIcon {
          width: 42px;
          height: 42px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0fdf4;
          font-size: 19px;
          margin-bottom: 12px;
        }

        .utilityTitle {
          color: #172018;
          font-size: 15px;
          font-weight: 950;
          line-height: 1.2;
        }

        .utilityValue {
          color: #172018;
          font-size: 24px;
          font-weight: 950;
          letter-spacing: -0.07em;
          margin-top: 7px;
        }

        .utilityText {
          margin-top: 5px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 700;
        }

        .mainGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 16px;
          align-items: start;
        }

        .panel {
          background: rgba(255,255,255,0.88);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 32px;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
          overflow: hidden;
        }

        .panelHeader {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .panelTitle {
          margin: 0;
          font-size: 19px;
          font-weight: 950;
          color: #172018;
          letter-spacing: -0.04em;
        }

        .panelSub {
          margin-top: 3px;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
        }

        .panelBody {
          padding: 16px;
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

        .list {
          display: grid;
          gap: 12px;
        }

        .grupoCard {
          border: 1px solid rgba(15, 23, 42, 0.06);
          background: #fffdf7;
          border-radius: 26px;
          padding: 13px;
          display: grid;
          grid-template-columns: 82px minmax(0, 1fr);
          gap: 14px;
          align-items: center;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .grupoCard:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
        }

        .thumb {
          width: 82px;
          height: 82px;
          border-radius: 24px;
          background: #e8eadf;
          border: 1px solid rgba(15, 23, 42, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-weight: 950;
          overflow: hidden;
          flex: none;
        }

        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .itemTitle {
          color: #172018;
          font-size: 15px;
          font-weight: 950;
          line-height: 1.3;
        }

        .itemMeta {
          color: #64748b;
          font-size: 12px;
          margin-top: 5px;
          line-height: 1.45;
          font-weight: 700;
        }

        .itemFooter {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
          flex-wrap: wrap;
        }

        .price {
          color: #16a34a;
          font-weight: 950;
          font-size: 14px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
        }

        .badge-green {
          background: #dcfce7;
          color: #166534;
        }

        .badge-neutral {
          background: #f1f5f9;
          color: #475569;
        }

        .financeBox {
          background:
            radial-gradient(circle at top right, rgba(190, 242, 100, 0.24), transparent 38%),
            #172018;
          color: #ffffff;
          border-radius: 30px;
          padding: 22px;
        }

        .financeLabel {
          color: rgba(255,255,255,0.70);
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.10em;
        }

        .financeValue {
          color: #bef264;
          font-size: 34px;
          font-weight: 950;
          letter-spacing: -0.07em;
          margin-top: 8px;
        }

        .financeText {
          margin-top: 8px;
          color: rgba(255,255,255,0.72);
          font-size: 13px;
          line-height: 1.55;
          font-weight: 700;
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

        .financeButton {
          width: 100%;
          border: none;
          background: #bef264;
          color: #172018;
          border-radius: 999px;
          padding: 12px 14px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          margin-top: 16px;
        }

        .empty {
          padding: 24px;
          text-align: center;
          color: #64748b;
          font-size: 13px;
          background: #fffdf7;
          border-radius: 22px;
          border: 1px dashed #cbd5e1;
          font-weight: 700;
        }

        .notificationList {
          display: grid;
          gap: 11px;
        }

        .notification {
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr);
          gap: 12px;
          align-items: flex-start;
          padding: 12px;
          border-radius: 22px;
          background: #fffdf7;
          border: 1px solid rgba(15, 23, 42, 0.06);
          cursor: pointer;
          transition: 0.2s ease;
        }

        .notification:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
        }

        .notificationIcon {
          width: 44px;
          height: 44px;
          border-radius: 18px;
          background: #f0fdf4;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .notificationTitle {
          color: #172018;
          font-size: 13px;
          font-weight: 950;
          line-height: 1.35;
        }

        .notificationText {
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          margin-top: 3px;
          font-weight: 700;
        }

        .notificationTime {
          color: #94a3b8;
          font-size: 11px;
          margin-top: 5px;
          font-weight: 800;
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(15,23,42,0.52);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }

        .modal {
          width: 100%;
          max-width: 540px;
          background: #ffffff;
          border-radius: 28px;
          box-shadow: 0 28px 90px rgba(15,23,42,0.28);
          overflow: hidden;
          max-height: 88vh;
          overflow-y: auto;
        }

        .modalHeader {
          padding: 20px;
          border-bottom: 1px solid rgba(15,23,42,0.08);
        }

        .modalTitle {
          margin: 0;
          color: #172018;
          font-size: 20px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .modalSub {
          margin-top: 5px;
          color: #64748b;
          font-size: 12px;
          font-weight: 750;
          line-height: 1.45;
        }

        .modalBody {
          padding: 20px;
          display: grid;
          gap: 12px;
        }

        .field {
          display: grid;
          gap: 7px;
        }

        .label {
          color: #475569;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .input {
          width: 100%;
          border: 1px solid rgba(15,23,42,0.08);
          background: #fffdf7;
          border-radius: 18px;
          padding: 13px 14px;
          font-size: 14px;
          color: #172018;
          outline: none;
          font-weight: 750;
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
          padding: 11px 14px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .btn.dark {
          background: #172018;
          color: #ffffff;
        }

        .btn.light {
          background: #eef2e5;
          color: #475569;
        }

        .btn:disabled {
          opacity: 0.62;
          cursor: not-allowed;
        }

        @media (max-width: 1180px) {
          .utilityGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 1040px) {
          .mainGrid,
          .heroContent {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .header {
            padding: 9px 12px;
          }

          .brandTitle,
          .brandSub {
            display: none;
          }

          .container {
            padding: 16px 12px 42px;
          }

          .hero,
          .panel {
            border-radius: 28px;
          }

          .hero {
            padding: 22px;
            min-height: auto;
          }

          .heroContent {
            min-height: auto;
          }

          .utilityGrid {
            grid-template-columns: 1fr 1fr;
          }

          .grupoCard {
            grid-template-columns: 74px minmax(0, 1fr);
          }

          .thumb {
            width: 74px;
            height: 74px;
          }
        }

        @media (max-width: 480px) {
          .utilityGrid {
            grid-template-columns: 1fr;
          }

          .heroTitle {
            font-size: 40px;
          }

          .brand img {
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
          <div className="brand" onClick={() => router.push('/guia/dashboard')}>
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />

            <div>
              <div className="brandTitle">PrussikTrails</div>
              <div className="brandSub">Painel do guia</div>
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
                  onClick={() => {
                    setMenuAberto(false)
                    router.push('/guia/perfil')
                  }}
                >
                  👤 Perfil
                </button>

                <button
                  type="button"
                  className="menuButton"
                  onClick={() => {
                    setMenuAberto(false)
                    router.push('/guia/financeiro')
                  }}
                >
                  💰 Financeiro
                </button>

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
          <div className="heroContent">
            <div>
              <div className="eyebrow">Centro do guia</div>

              <h1 className="heroTitle">
                Oi, {primeiroNome(nomeUsuario(user))}.
                <br />
                Sua operação agora também mede <span>confiança.</span>
              </h1>

              <p className="heroText">
                Acompanhe roteiros, reservas, grupos internos, saldo atualizado e reputação dos clientes em uma visão mais limpa.
                {ultimaAtualizacao && (
                  <>
                    <br />
                    Atualizado às {ultimaAtualizacao}.
                  </>
                )}
              </p>

              <div className="heroActions">
                <button
                  type="button"
                  className="heroMiniBtn primary"
                  onClick={() => router.push('/guia/roteiros/novo')}
                >
                  Criar roteiro
                </button>

                <button
                  type="button"
                  className="heroMiniBtn"
                  onClick={() => router.push('/guia/financeiro')}
                >
                  Ver financeiro
                </button>

                <button
                  type="button"
                  className="heroMiniBtn"
                  onClick={atualizarDashboard}
                  disabled={atualizando}
                >
                  {atualizando ? 'Atualizando...' : 'Atualizar painel'}
                </button>
              </div>
            </div>

            <aside className="heroCard">
              <div className="heroCardLabel">Reputação</div>

              <div className="heroCardValue">
                {formatarNota(avaliacaoResumo.mediaNota)}
              </div>

              <div className="heroStars">
                {estrelas(avaliacaoResumo.mediaNota)}
              </div>

              <div className="heroCardText">
                {avaliacaoResumo.total} avaliação(ões) recebida(s).
              </div>

              <div className="reputationBars">
                {[
                  {
                    label: 'Segurança percebida',
                    value: avaliacaoResumo.segurancaAltaPercentual
                  },
                  {
                    label: 'Recomendação',
                    value: avaliacaoResumo.percentualRecomendacao
                  },
                  {
                    label: 'Orientações claras',
                    value: avaliacaoResumo.orientacoesClarasPercentual
                  },
                  {
                    label: 'Experiência superou',
                    value: avaliacaoResumo.experienciaSuperouPercentual
                  }
                ].map((item) => (
                  <div key={item.label}>
                    <div className="repRowTop">
                      <span>{item.label}</span>
                      <strong>{formatarPercentual(item.value)}</strong>
                    </div>
                    <div className="repTrack">
                      <div
                        className="repFill"
                        style={{ width: `${percentualSeguro(item.value)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        {mensagem && <div className="message">{mensagem}</div>}
        {erro && <div className="error">{erro}</div>}

        <section className="utilityGrid">
          <article className="utilityCard" onClick={() => router.push('/guia/roteiros')}>
            <div className="utilityIcon">🧭</div>
            <div className="utilityTitle">Roteiros</div>
            <div className="utilityValue">{stats.roteirosTotal}</div>
            <div className="utilityText">
              {stats.roteirosAtivos} ativo(s), {stats.roteirosPendentes} em análise.
            </div>
          </article>

          <article className="utilityCard" onClick={() => router.push('/guia/grupos')}>
            <div className="utilityIcon">💬</div>
            <div className="utilityTitle">Grupos</div>
            <div className="utilityValue">{stats.gruposTotal}</div>
            <div className="utilityText">
              {stats.gruposAtivos} ativo(s), {stats.clientesNosGrupos} cliente(s).
            </div>
          </article>

          <article className="utilityCard" onClick={() => router.push('/guia/reservas')}>
            <div className="utilityIcon">🎒</div>
            <div className="utilityTitle">Reservas</div>
            <div className="utilityValue">{stats.reservasTotal}</div>
            <div className="utilityText">
              {stats.reservasConfirmadas} confirmada(s), {stats.reservasPendentes} aguardando.
            </div>
          </article>

          <article className="utilityCard" onClick={() => router.push('/guia/avaliacoes')}>
            <div className="utilityIcon">⭐</div>
            <div className="utilityTitle">Avaliações</div>
            <div className="utilityValue">{formatarNota(avaliacaoResumo.mediaNota)}</div>
            <div className="utilityText">
              Ver painel completo de avaliações.
            </div>
          </article>

          <article className="utilityCard" onClick={() => setModalAvisosAberto(true)}>
            <div className="utilityIcon">🔔</div>
            <div className="utilityTitle">Avisos</div>
            <div className="utilityValue">{notificacoes.length}</div>
            <div className="utilityText">
              Pendências, reservas, grupos e alertas em um só lugar.
            </div>
          </article>

          <article className="utilityCard" onClick={() => router.push('/guia/financeiro')}>
            <div className="utilityIcon">💰</div>
            <div className="utilityTitle">Saldo pendente</div>
            <div className="utilityValue">{formatarMoeda(stats.saldoLiquidoGuia)}</div>
            <div className="utilityText">
              {stats.repassesRegistrados} repasse(s) já registrado(s) pelo ADMIN.
            </div>
          </article>
        </section>

        <section className="mainGrid">
          <section className="panel">
            <div className="panelHeader">
              <div>
                <h2 className="panelTitle">Grupos dos roteiros</h2>
                <div className="panelSub">
                  Acompanhe os grupos criados automaticamente para suas experiências.
                </div>
              </div>

              <button type="button" className="textLink" onClick={() => router.push('/guia/grupos')}>
                Ver grupos
              </button>
            </div>

            <div className="panelBody">
              {gruposRecentes.length === 0 ? (
                <div className="empty">
                  Nenhum grupo criado ainda. Ao cadastrar um roteiro, o grupo interno será preparado automaticamente.
                </div>
              ) : (
                <div className="list">
                  {gruposRecentes.map((grupo) => {
                    const imagem = imagemRoteiro(grupo.roteiro)

                    return (
                      <article
                        className="grupoCard"
                        key={grupo.id}
                        onClick={() => router.push(`/guia/grupos/${grupo.id}`)}
                      >
                        <div className="thumb">
                          {imagem ? (
                            <img src={imagem} alt={tituloRoteiro(grupo.roteiro)} />
                          ) : (
                            'GP'
                          )}
                        </div>

                        <div>
                          <div className="itemTitle">
                            {grupo.titulo || tituloRoteiro(grupo.roteiro)}
                          </div>

                          <div className="itemMeta">
                            {localRoteiro(grupo.roteiro)}
                            <br />
                            {grupo.clientes_count || 0} cliente(s) · {grupo.mensagens_count || 0} mensagem(ns)
                          </div>

                          <div className="itemFooter">
                            <span className="price">{grupo.notificacoes_nao_lidas || 0} aviso(s)</span>
                            {badgeGrupo(grupo.status)}
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="financeBox">
            <div className="financeLabel">Financeiro do guia</div>

            <div className="financeValue">{formatarMoeda(stats.saldoLiquidoGuia)}</div>

            <div className="financeText">
              Saldo pendente atualizado após os repasses registrados pelo ADMIN.
            </div>

            <div className="financeRows">
              <div className="financeRow">
                <span>Valor bruto confirmado</span>
                <strong>{formatarMoeda(stats.receitaBruta)}</strong>
              </div>

              <div className="financeRow">
                <span>Taxa PrussikTrails {stats.taxaPercentual}%</span>
                <strong>{formatarMoeda(stats.taxaPlataforma)}</strong>
              </div>

              <div className="financeRow">
                <span>Líquido antes dos repasses</span>
                <strong>{formatarMoeda(stats.valorLiquidoGuia)}</strong>
              </div>

              <div className="financeRow">
                <span>Já repassado pelo ADMIN</span>
                <strong>{formatarMoeda(stats.valorPagoGuia)}</strong>
              </div>

              <div className="financeRow">
                <span>Repasses registrados</span>
                <strong>{stats.repassesRegistrados}</strong>
              </div>

              <div className="financeRow">
                <span>Saldo pendente</span>
                <strong>{formatarMoeda(stats.saldoLiquidoGuia)}</strong>
              </div>
            </div>

            <button type="button" className="financeButton" onClick={() => router.push('/guia/financeiro')}>
              Acompanhar financeiro
            </button>
          </section>
        </section>
      </div>

      {modalAvisosAberto && (
        <div className="modalOverlay">
          <div className="modal">
            <div className="modalHeader">
              <h2 className="modalTitle">Avisos do guia</h2>
              <div className="modalSub">
                Pendências, reservas, grupos e informações importantes para sua operação.
              </div>
            </div>

            <div className="modalBody">
              {notificacoes.length === 0 ? (
                <div className="empty">Nenhum aviso por enquanto.</div>
              ) : (
                <div className="notificationList">
                  {notificacoes.map((notificacao) => (
                    <article
                      className="notification"
                      key={notificacao.id}
                      onClick={() => {
                        setModalAvisosAberto(false)
                        if (notificacao.destino) router.push(notificacao.destino)
                      }}
                    >
                      <div className="notificationIcon">{notificacao.emoji}</div>

                      <div>
                        <div className="notificationTitle">{notificacao.titulo}</div>
                        <div className="notificationText">{notificacao.texto}</div>
                        <div className="notificationTime">{tempoRelativo(notificacao.created_at)}</div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <div className="modalActions">
                <button type="button" className="btn dark" onClick={() => setModalAvisosAberto(false)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalSenhaAberto && (
        <div className="modalOverlay">
          <form className="modal" onSubmit={alterarSenha}>
            <div className="modalHeader">
              <h2 className="modalTitle">Alterar senha</h2>
              <div className="modalSub">
                Atualize sua senha de acesso ao painel do guia.
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
                <button type="submit" className="btn dark" disabled={alterandoSenha}>
                  {alterandoSenha ? 'Alterando...' : 'Salvar nova senha'}
                </button>

                <button type="button" className="btn light" disabled={alterandoSenha} onClick={() => setModalSenhaAberto(false)}>
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