'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import SettingsButton from '@/components/SettingsButton'

type AdminUser = {
  id: string
  nome?: string | null
  email?: string | null
  tipo?: string | null
}

type Stats = {
  totalUsuarios: number
  totalClientes: number
  totalGuias: number
  totalAdmins: number
  guiasPendentes: number
  totalRoteiros: number
  roteirosAtivos: number
  roteirosPendentes: number
  totalReservas: number
  reservasPendentes: number
  reservasConfirmadas: number
  reservasCanceladas: number
  pagamentosPendentes: number
  pagamentosPagos: number
  receitaTotal: number
  receitaMes: number
  chatsAbertos: number
  avaliacoesPendentes: number
}

type Reserva = {
  id: string
  cliente_id?: string | null
  roteiro_id?: string | null
  quantidade_pessoas?: number | null
  valor_total?: number | null
  status?: string | null
  pagamento_status?: string | null
  paghiper_order_id?: string | null
  paghiper_transaction_id?: string | null
  chat_id?: string | null
  created_at?: string | null
  cliente_nome?: string
  roteiro_titulo?: string
}

type Guia = {
  id: string
  nome?: string | null
  email?: string | null
  telefone?: string | null
  instagram?: string | null
  cadastur?: string | null
  cnpj?: string | null
  status?: string | null
  created_at?: string | null
}

type Roteiro = {
  id: string
  titulo?: string | null
  preco?: number | null
  status?: string | null
  id_guia?: string | null
  created_at?: string | null
  guia_nome?: string
}

type Atividade = {
  id: string
  descricao: string
  detalhe?: string
  tipo: 'pagamento' | 'reserva' | 'guia' | 'roteiro' | 'sistema' | 'usuario'
  created_at?: string | null
}

const statsInicial: Stats = {
  totalUsuarios: 0,
  totalClientes: 0,
  totalGuias: 0,
  totalAdmins: 0,
  guiasPendentes: 0,
  totalRoteiros: 0,
  roteirosAtivos: 0,
  roteirosPendentes: 0,
  totalReservas: 0,
  reservasPendentes: 0,
  reservasConfirmadas: 0,
  reservasCanceladas: 0,
  pagamentosPendentes: 0,
  pagamentosPagos: 0,
  receitaTotal: 0,
  receitaMes: 0,
  chatsAbertos: 0,
  avaliacoesPendentes: 0
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)
  const reconciliandoRef = useRef(false)

  const [user, setUser] = useState<AdminUser | null>(null)
  const [stats, setStats] = useState<Stats>(statsInicial)
  const [reservasRecentes, setReservasRecentes] = useState<Reserva[]>([])
  const [guiasPendentes, setGuiasPendentes] = useState<Guia[]>([])
  const [roteirosPendentes, setRoteirosPendentes] = useState<Roteiro[]>([])
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [reconciliando, setReconciliando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('')

  useEffect(() => {
    if (iniciouRef.current) return

    iniciouRef.current = true
    iniciarDashboard()
  }, [])

  useEffect(() => {
    if (!user?.id) return

    const interval = setInterval(() => {
      carregarTudo(true)
    }, 45000)

    return () => clearInterval(interval)
  }, [user?.id])

  const iniciarDashboard = async () => {
    setCarregando(true)

    try {
      const userData = localStorage.getItem('user')

      if (!userData) {
        router.replace('/login')
        return
      }

      const parsedUser = JSON.parse(userData) as AdminUser

      if (parsedUser.tipo !== 'admin') {
        router.replace('/login')
        return
      }

      setUser(parsedUser)
      await carregarTudo(true)
    } catch (error) {
      console.error('Erro ao iniciar dashboard admin:', error)
      setMensagem('Erro ao carregar dashboard administrativo.')
    } finally {
      setCarregando(false)
    }
  }

  const normalizarStatus = (valor?: string | null) => {
    return String(valor || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }

  const pagamentoConfirmado = (reserva: Reserva) => {
    const pagamento = normalizarStatus(reserva.pagamento_status)
    const status = normalizarStatus(reserva.status)

    return (
      pagamento === 'pago' ||
      pagamento === 'confirmado' ||
      status === 'confirmada' ||
      status === 'realizada'
    )
  }

  const reservaCancelada = (reserva: Reserva) => {
    return normalizarStatus(reserva.status) === 'cancelada'
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(valor || 0))
  }

  const formatarData = (valor?: string | null) => {
    if (!valor) return '-'

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) {
      return valor
    }

    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatarHora = (valor?: string | null) => {
    if (!valor) return '-'

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) {
      return ''
    }

    return data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const obterCount = async (query: any, label: string) => {
    try {
      const { count, error } = await query

      if (error) {
        console.warn(`Erro ao contar ${label}:`, error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.warn(`Erro inesperado ao contar ${label}:`, error)
      return 0
    }
  }

  const buscarTabela = async <T,>(
    tabela: string,
    select = '*',
    limite = 10,
    order = 'created_at'
  ): Promise<T[]> => {
    try {
      const { data, error } = await supabase
        .from(tabela)
        .select(select)
        .order(order, { ascending: false })
        .limit(limite)

      if (error) {
        console.warn(`Erro ao buscar ${tabela}:`, error)
        return []
      }

      return (data || []) as T[]
    } catch (error) {
      console.warn(`Erro inesperado ao buscar ${tabela}:`, error)
      return []
    }
  }

  const carregarTudo = async (silencioso = false) => {
    if (!silencioso) {
      setAtualizando(true)
      setMensagem('')
    }

    try {
      await Promise.all([
        carregarEstatisticas(),
        carregarReservasRecentes(),
        carregarGuiasPendentes(),
        carregarRoteirosPendentes(),
        carregarAtividades()
      ])

      setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))

      if (!silencioso) {
        setMensagem('Dashboard atualizado.')
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)

      if (!silencioso) {
        setMensagem('Erro ao atualizar dashboard.')
      }
    } finally {
      if (!silencioso) {
        setAtualizando(false)
      }
    }
  }

  const carregarEstatisticas = async () => {
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)

    const [
      totalUsuarios,
      totalClientes,
      totalGuias,
      totalAdmins,
      guiasPendentesCount,
      totalRoteiros,
      roteirosAtivos,
      roteirosPendentesCount,
      totalReservas,
      reservasPendentes,
      reservasConfirmadas,
      reservasCanceladas,
      pagamentosPendentes,
      pagamentosPagos,
      chatsAbertos,
      avaliacoesPendentes
    ] = await Promise.all([
      obterCount(
        supabase.from('users').select('*', { count: 'exact', head: true }),
        'usuários'
      ),
      obterCount(
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('tipo', 'cliente'),
        'clientes'
      ),
      obterCount(
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('tipo', 'guia'),
        'guias'
      ),
      obterCount(
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('tipo', 'admin'),
        'admins'
      ),
      obterCount(
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('tipo', 'guia')
          .eq('status', 'pendente'),
        'guias pendentes'
      ),
      obterCount(
        supabase.from('roteiros').select('*', { count: 'exact', head: true }),
        'roteiros'
      ),
      obterCount(
        supabase.from('roteiros').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
        'roteiros ativos'
      ),
      obterCount(
        supabase
          .from('roteiros')
          .select('*', { count: 'exact', head: true })
          .in('status', ['aguardando', 'pendente', 'em_analise']),
        'roteiros pendentes'
      ),
      obterCount(
        supabase.from('reservas').select('*', { count: 'exact', head: true }),
        'reservas'
      ),
      obterCount(
        supabase
          .from('reservas')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pendente', 'aguardando']),
        'reservas pendentes'
      ),
      obterCount(
        supabase
          .from('reservas')
          .select('*', { count: 'exact', head: true })
          .in('status', ['confirmada', 'realizada']),
        'reservas confirmadas'
      ),
      obterCount(
        supabase
          .from('reservas')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'cancelada'),
        'reservas canceladas'
      ),
      obterCount(
        supabase
          .from('reservas')
          .select('*', { count: 'exact', head: true })
          .in('pagamento_status', ['pendente', 'aguardando']),
        'pagamentos pendentes'
      ),
      obterCount(
        supabase
          .from('reservas')
          .select('*', { count: 'exact', head: true })
          .eq('pagamento_status', 'pago'),
        'pagamentos pagos'
      ),
      obterCount(
        supabase
          .from('chats')
          .select('*', { count: 'exact', head: true })
          .in('status', ['aberto', 'ativo']),
        'chats abertos'
      ),
      obterCount(
        supabase
          .from('avaliacoes')
          .select('*', { count: 'exact', head: true })
          .in('status_moderacao', ['aguardando_admin', 'pendente']),
        'avaliações pendentes'
      )
    ])

    let receitaTotal = 0
    let receitaMes = 0

    try {
      const { data: reservasPagas, error } = await supabase
        .from('reservas')
        .select('valor_total, created_at, status, pagamento_status')
        .or('pagamento_status.eq.pago,status.eq.confirmada,status.eq.realizada')

      if (!error && reservasPagas) {
        receitaTotal = reservasPagas.reduce(
          (soma: number, reserva: any) => soma + Number(reserva.valor_total || 0),
          0
        )

        receitaMes = reservasPagas
          .filter((reserva: any) => {
            const data = new Date(reserva.created_at || '')
            return !Number.isNaN(data.getTime()) && data >= inicioMes
          })
          .reduce(
            (soma: number, reserva: any) => soma + Number(reserva.valor_total || 0),
            0
          )
      }
    } catch (error) {
      console.warn('Erro ao calcular receita:', error)
    }

    setStats({
      totalUsuarios,
      totalClientes,
      totalGuias,
      totalAdmins,
      guiasPendentes: guiasPendentesCount,
      totalRoteiros,
      roteirosAtivos,
      roteirosPendentes: roteirosPendentesCount,
      totalReservas,
      reservasPendentes,
      reservasConfirmadas,
      reservasCanceladas,
      pagamentosPendentes,
      pagamentosPagos,
      receitaTotal,
      receitaMes,
      chatsAbertos,
      avaliacoesPendentes
    })
  }

  const carregarReservasRecentes = async () => {
    const reservas = await buscarTabela<Reserva>('reservas', '*', 10)

    if (reservas.length === 0) {
      setReservasRecentes([])
      return
    }

    const clienteIds = Array.from(
      new Set(reservas.map((item) => item.cliente_id).filter(Boolean) as string[])
    )

    const roteiroIds = Array.from(
      new Set(reservas.map((item) => item.roteiro_id).filter(Boolean) as string[])
    )

    let clientes: any[] = []
    let roteiros: any[] = []

    if (clienteIds.length > 0) {
      const { data } = await supabase
        .from('users')
        .select('id, nome, name, email')
        .in('id', clienteIds)

      clientes = data || []
    }

    if (roteiroIds.length > 0) {
      const { data } = await supabase
        .from('roteiros')
        .select('id, titulo, preco, id_guia')
        .in('id', roteiroIds)

      roteiros = data || []
    }

    const lista = reservas.map((reserva) => {
      const cliente = clientes.find((item) => item.id === reserva.cliente_id)
      const roteiro = roteiros.find((item) => item.id === reserva.roteiro_id)

      return {
        ...reserva,
        cliente_nome:
          cliente?.nome ||
          cliente?.name ||
          cliente?.email ||
          'Cliente',
        roteiro_titulo:
          roteiro?.titulo ||
          'Roteiro'
      }
    })

    setReservasRecentes(lista)
  }

  const carregarGuiasPendentes = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, nome, email, telefone, instagram, cadastur, cnpj, status, created_at')
        .eq('tipo', 'guia')
        .eq('status', 'pendente')
        .order('created_at', { ascending: false })
        .limit(8)

      if (error) {
        console.warn('Erro ao buscar guias pendentes:', error)
        setGuiasPendentes([])
        return
      }

      setGuiasPendentes((data || []) as Guia[])
    } catch (error) {
      console.warn('Erro inesperado ao buscar guias pendentes:', error)
      setGuiasPendentes([])
    }
  }

  const carregarRoteirosPendentes = async () => {
    try {
      const { data, error } = await supabase
        .from('roteiros')
        .select('id, titulo, preco, status, id_guia, created_at')
        .in('status', ['aguardando', 'pendente', 'em_analise'])
        .order('created_at', { ascending: false })
        .limit(8)

      if (error) {
        console.warn('Erro ao buscar roteiros pendentes:', error)
        setRoteirosPendentes([])
        return
      }

      const roteirosBase = (data || []) as Roteiro[]

      const guiaIds = Array.from(
        new Set(roteirosBase.map((item) => item.id_guia).filter(Boolean) as string[])
      )

      let guias: any[] = []

      if (guiaIds.length > 0) {
        const { data: guiasData } = await supabase
          .from('users')
          .select('id, nome, name, email')
          .in('id', guiaIds)

        guias = guiasData || []
      }

      const lista = roteirosBase.map((roteiro) => {
        const guia = guias.find((item) => item.id === roteiro.id_guia)

        return {
          ...roteiro,
          guia_nome:
            guia?.nome ||
            guia?.name ||
            guia?.email ||
            'Guia'
        }
      })

      setRoteirosPendentes(lista)
    } catch (error) {
      console.warn('Erro inesperado ao buscar roteiros pendentes:', error)
      setRoteirosPendentes([])
    }
  }

  const carregarAtividades = async () => {
    try {
      const { data, error } = await supabase
        .from('logs_atividades')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(12)

      if (!error && data) {
        const lista: Atividade[] = data.map((log: any) => ({
          id: log.id,
          descricao:
            log.detalhes ||
            `${log.primeiro_nome || 'Usuário'} realizou ${log.acao || 'uma ação'}`,
          detalhe: log.tipo_usuario || log.acao || '',
          tipo: tipoAtividadePorAcao(log.acao),
          created_at: log.created_at
        }))

        setAtividades(lista)
        return
      }
    } catch {
      // Sem problema. Abaixo montamos fallback.
    }

    const fallback: Atividade[] = [
      ...reservasRecentes.slice(0, 4).map((reserva) => ({
        id: `reserva-${reserva.id}`,
        descricao: `Reserva criada para ${reserva.roteiro_titulo || 'roteiro'}`,
        detalhe: reserva.cliente_nome || '',
        tipo: 'reserva' as const,
        created_at: reserva.created_at
      })),
      ...guiasPendentes.slice(0, 3).map((guia) => ({
        id: `guia-${guia.id}`,
        descricao: `Guia aguardando aprovação: ${guia.nome || guia.email || 'Guia'}`,
        detalhe: guia.email || '',
        tipo: 'guia' as const,
        created_at: guia.created_at
      })),
      ...roteirosPendentes.slice(0, 3).map((roteiro) => ({
        id: `roteiro-${roteiro.id}`,
        descricao: `Roteiro aguardando análise: ${roteiro.titulo || 'Roteiro'}`,
        detalhe: roteiro.guia_nome || '',
        tipo: 'roteiro' as const,
        created_at: roteiro.created_at
      }))
    ]

    setAtividades(fallback)
  }

  const tipoAtividadePorAcao = (acao?: string | null): Atividade['tipo'] => {
    const a = normalizarStatus(acao)

    if (a.includes('pag')) return 'pagamento'
    if (a.includes('reserv')) return 'reserva'
    if (a.includes('guia')) return 'guia'
    if (a.includes('roteiro')) return 'roteiro'
    if (a.includes('login') || a.includes('usuario')) return 'usuario'

    return 'sistema'
  }

  const atualizarStatusGuia = async (guiaId: string, status: 'ativo' | 'reprovado') => {
    const confirmar = window.confirm(
      status === 'ativo'
        ? 'Aprovar este guia?'
        : 'Reprovar este guia?'
    )

    if (!confirmar) return

    setMensagem('')

    const { error } = await supabase
      .from('users')
      .update({
        status,
        ativo: status === 'ativo',
        updated_at: new Date().toISOString()
      })
      .eq('id', guiaId)

    if (error) {
      console.error('Erro ao atualizar guia:', error)
      setMensagem('Erro ao atualizar guia.')
      return
    }

    setMensagem(status === 'ativo' ? 'Guia aprovado.' : 'Guia reprovado.')
    await carregarTudo(true)
  }

  const atualizarStatusRoteiro = async (
    roteiroId: string,
    status: 'ativo' | 'reprovado'
  ) => {
    const confirmar = window.confirm(
      status === 'ativo'
        ? 'Aprovar este roteiro?'
        : 'Reprovar este roteiro?'
    )

    if (!confirmar) return

    setMensagem('')

    const { error } = await supabase
      .from('roteiros')
      .update({
        status,
        ativo: status === 'ativo',
        updated_at: new Date().toISOString()
      })
      .eq('id', roteiroId)

    if (error) {
      console.error('Erro ao atualizar roteiro:', error)
      setMensagem('Erro ao atualizar roteiro.')
      return
    }

    setMensagem(status === 'ativo' ? 'Roteiro aprovado.' : 'Roteiro reprovado.')
    await carregarTudo(true)
  }

  const reconciliarPagamentos = async () => {
    if (reconciliandoRef.current) return

    const pendentes = reservasRecentes.filter(
      (reserva) => !pagamentoConfirmado(reserva) && !reservaCancelada(reserva)
    )

    if (pendentes.length === 0) {
      setMensagem('Não há reservas recentes pendentes para reconciliar.')
      return
    }

    reconciliandoRef.current = true
    setReconciliando(true)
    setMensagem('Consultando PagHiper nas reservas pendentes recentes...')

    try {
      let atualizadas = 0

      for (const reserva of pendentes.slice(0, 10)) {
        const response = await fetch('/api/paghiper/reconciliar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reservaId: reserva.id,
            orderId: reserva.paghiper_order_id || reserva.id,
            transactionId: reserva.paghiper_transaction_id || undefined
          })
        })

        const data = await response.json().catch(() => null)

        if (
          response.ok &&
          data?.sucesso &&
          Array.isArray(data.resultados) &&
          data.resultados.some((item: any) => item.atualizado || item.jaEstavaConfirmada)
        ) {
          atualizadas += 1
        }
      }

      setMensagem(
        atualizadas > 0
          ? `${atualizadas} reserva(s) atualizada(s) pela PagHiper.`
          : 'Consulta finalizada. Nenhuma nova confirmação retornou agora.'
      )

      await carregarTudo(true)
    } catch (error) {
      console.error('Erro ao reconciliar pagamentos:', error)
      setMensagem('Erro ao reconciliar pagamentos PagHiper.')
    } finally {
      reconciliandoRef.current = false
      setReconciliando(false)
    }
  }

  const sair = () => {
    localStorage.removeItem('user')
    router.replace('/login')
  }

  const alertaCritico = useMemo(() => {
    return (
      stats.guiasPendentes +
      stats.roteirosPendentes +
      stats.pagamentosPendentes +
      stats.avaliacoesPendentes
    )
  }, [stats])

  const statusBadge = (status?: string | null, tipo: 'reserva' | 'pagamento' = 'reserva') => {
    const s = normalizarStatus(status)

    let classe = 'badge badge-neutral'
    let texto = status || 'pendente'

    if (tipo === 'pagamento') {
      if (s === 'pago' || s === 'confirmado') {
        classe = 'badge badge-green'
        texto = 'Pago'
      } else {
        classe = 'badge badge-yellow'
        texto = 'Pendente'
      }

      return <span className={classe}>{texto}</span>
    }

    if (s === 'confirmada' || s === 'realizada' || s === 'ativo') {
      classe = 'badge badge-green'
    } else if (s === 'cancelada' || s === 'reprovado') {
      classe = 'badge badge-red'
    } else if (s === 'pendente' || s === 'aguardando' || s === 'em_analise') {
      classe = 'badge badge-yellow'
    }

    return <span className={classe}>{texto}</span>
  }

  if (carregando || !user) {
    return (
      <main className="loading">
        <style>{`
          * { box-sizing: border-box; }

          body {
            margin: 0;
            background: #f3f4f6;
            font-family:
              Inter,
              ui-sans-serif,
              system-ui,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
          }

          .loading {
            min-height: 100vh;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            background:
              radial-gradient(circle at top left, rgba(22, 163, 74, 0.10), transparent 30%),
              linear-gradient(180deg, #ffffff 0%, #eef2f7 100%);
            color: #374151;
          }

          .loadingCard {
            background: #ffffff;
            border: 1px solid #eef2f7;
            border-radius: 28px;
            padding: 28px;
            box-shadow: 0 12px 32px rgba(15, 23, 42, 0.10);
            text-align: center;
          }

          .loadingCard img {
            height: 64px;
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
          background: #eef2f7;
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
            radial-gradient(circle at top left, rgba(22, 163, 74, 0.10), transparent 28%),
            radial-gradient(circle at bottom right, rgba(220, 38, 38, 0.08), transparent 30%),
            linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
          color: #111827;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(255,255,255,0.92);
          border-bottom: 1px solid #e5e7eb;
          backdrop-filter: blur(18px);
          padding: 14px 18px;
        }

        .headerInner {
          max-width: 1440px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brandLogo {
          height: 48px;
          width: auto;
          object-fit: contain;
          display: block;
        }

        .brandTitle {
          margin: 0;
          color: #dc2626;
          font-size: 22px;
          font-weight: 950;
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .brandSub {
          margin-top: 4px;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
        }

        .headerActions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .userPill {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          color: #475569;
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 800;
        }

        .btn {
          border: none;
          border-radius: 999px;
          padding: 10px 14px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 900;
          transition: 0.2s ease;
          white-space: nowrap;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.10);
        }

        .btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .btn-dark {
          background: #111827;
          color: #ffffff;
        }

        .btn-green {
          background: #16a34a;
          color: #ffffff;
        }

        .btn-red {
          background: #dc2626;
          color: #ffffff;
        }

        .btn-light {
          background: #f1f5f9;
          color: #334155;
        }

        .btn-soft-red {
          background: #fee2e2;
          color: #991b1b;
        }

        .btn-outline {
          background: #ffffff;
          border: 1px solid #d1d5db;
          color: #334155;
        }

        .container {
          max-width: 1440px;
          margin: 0 auto;
          padding: 24px 18px 52px;
        }

        .hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 380px;
          gap: 18px;
          margin-bottom: 18px;
        }

        .heroCard {
          background:
            linear-gradient(135deg, rgba(17, 24, 39, 0.96), rgba(15, 23, 42, 0.92)),
            radial-gradient(circle at top right, rgba(22, 163, 74, 0.22), transparent 32%);
          color: #ffffff;
          border-radius: 34px;
          padding: 28px;
          overflow: hidden;
          position: relative;
          min-height: 230px;
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.24);
        }

        .heroCard::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: linear-gradient(to bottom, black, transparent);
          pointer-events: none;
        }

        .heroContent {
          position: relative;
          z-index: 2;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 1px solid rgba(22, 163, 74, 0.42);
          background: rgba(22, 163, 74, 0.12);
          color: #86efac;
          padding: 7px 11px;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .heroTitle {
          margin: 0;
          max-width: 760px;
          font-size: clamp(34px, 5vw, 54px);
          line-height: 0.98;
          font-weight: 950;
          letter-spacing: -0.07em;
        }

        .heroTitle span {
          color: #22c55e;
        }

        .heroText {
          max-width: 660px;
          color: #cbd5e1;
          line-height: 1.65;
          margin: 14px 0 0;
          font-size: 14px;
        }

        .healthCard {
          background: #ffffff;
          border: 1px solid #eef2f7;
          border-radius: 34px;
          padding: 22px;
          box-shadow: 0 1px 6px rgba(15, 23, 42, 0.06);
        }

        .healthTitle {
          font-size: 16px;
          font-weight: 950;
          color: #111827;
          margin-bottom: 12px;
        }

        .healthNumber {
          font-size: 54px;
          font-weight: 950;
          color: ${alertaCritico > 0 ? '#dc2626' : '#16a34a'};
          letter-spacing: -0.08em;
          line-height: 1;
        }

        .healthText {
          margin-top: 8px;
          color: #64748b;
          line-height: 1.5;
          font-size: 13px;
        }

        .healthActions {
          display: grid;
          gap: 8px;
          margin-top: 18px;
        }

        .message {
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
          border-radius: 18px;
          padding: 13px 15px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 700;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .statCard {
          background: #ffffff;
          border: 1px solid #eef2f7;
          border-radius: 26px;
          padding: 16px;
          min-height: 118px;
          box-shadow: 0 1px 6px rgba(15, 23, 42, 0.06);
          cursor: pointer;
          transition: 0.2s ease;
        }

        .statCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.10);
        }

        .statLabel {
          color: #64748b;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          line-height: 1.35;
        }

        .statValue {
          margin-top: 12px;
          font-size: 30px;
          font-weight: 950;
          color: #111827;
          letter-spacing: -0.07em;
        }

        .statHint {
          color: #94a3b8;
          font-size: 11px;
          margin-top: 4px;
          font-weight: 700;
        }

        .statGreen .statValue {
          color: #16a34a;
        }

        .statRed .statValue {
          color: #dc2626;
        }

        .statYellow .statValue {
          color: #d97706;
        }

        .quickGrid {
          display: grid;
          grid-template-columns: repeat(8, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 18px;
        }

        .quickButton {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 22px;
          padding: 14px 10px;
          min-height: 82px;
          cursor: pointer;
          transition: 0.2s ease;
          text-align: center;
          color: #111827;
        }

        .quickButton:hover {
          transform: translateY(-2px);
          border-color: #16a34a;
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.10);
        }

        .quickIcon {
          width: 28px;
          height: 28px;
          border-radius: 12px;
          background: #f0fdf4;
          color: #16a34a;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 950;
          margin-bottom: 8px;
        }

        .quickLabel {
          font-size: 11px;
          font-weight: 950;
          line-height: 1.25;
        }

        .mainGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(360px, 0.8fr);
          gap: 18px;
        }

        .panel {
          background: #ffffff;
          border: 1px solid #eef2f7;
          border-radius: 30px;
          box-shadow: 0 1px 6px rgba(15, 23, 42, 0.06);
          overflow: hidden;
        }

        .panelHeader {
          padding: 18px 20px;
          border-bottom: 1px solid #eef2f7;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .panelTitle {
          margin: 0;
          font-size: 18px;
          font-weight: 950;
          color: #111827;
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

        .tableWrap {
          overflow-x: auto;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          min-width: 760px;
        }

        .table th {
          text-align: left;
          color: #64748b;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 11px 10px;
          background: #f8fafc;
          border-bottom: 1px solid #e5e7eb;
        }

        .table td {
          padding: 12px 10px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
          font-size: 13px;
          vertical-align: middle;
        }

        .table tr:last-child td {
          border-bottom: none;
        }

        .strong {
          color: #111827;
          font-weight: 950;
        }

        .muted {
          color: #64748b;
          font-size: 12px;
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

        .badge-yellow {
          background: #fef3c7;
          color: #92400e;
        }

        .badge-red {
          background: #fee2e2;
          color: #991b1b;
        }

        .badge-neutral {
          background: #f1f5f9;
          color: #475569;
        }

        .list {
          display: grid;
          gap: 10px;
        }

        .listItem {
          border: 1px solid #eef2f7;
          background: #f8fafc;
          border-radius: 22px;
          padding: 14px;
        }

        .listTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
        }

        .listTitle {
          color: #111827;
          font-size: 14px;
          font-weight: 950;
          line-height: 1.35;
        }

        .listMeta {
          color: #64748b;
          font-size: 12px;
          margin-top: 4px;
          line-height: 1.45;
        }

        .listActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .sideGrid {
          display: grid;
          gap: 18px;
        }

        .activityItem {
          display: grid;
          grid-template-columns: 12px minmax(0, 1fr);
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .activityItem:last-child {
          border-bottom: none;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          margin-top: 5px;
          background: #94a3b8;
        }

        .dot.pagamento {
          background: #16a34a;
        }

        .dot.reserva {
          background: #2563eb;
        }

        .dot.guia {
          background: #dc2626;
        }

        .dot.roteiro {
          background: #d97706;
        }

        .dot.usuario {
          background: #7c3aed;
        }

        .activityText {
          color: #111827;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.4;
        }

        .activityMeta {
          color: #64748b;
          font-size: 12px;
          margin-top: 3px;
        }

        .empty {
          padding: 22px;
          text-align: center;
          color: #64748b;
          font-size: 13px;
          background: #f8fafc;
          border-radius: 22px;
          border: 1px dashed #cbd5e1;
        }

        @media (max-width: 1180px) {
          .statsGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .quickGrid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .hero,
          .mainGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .header {
            padding: 12px;
          }

          .headerInner {
            align-items: flex-start;
          }

          .headerActions {
            width: 100%;
          }

          .headerActions .btn,
          .headerActions .userPill {
            flex: 1;
            text-align: center;
          }

          .container {
            padding: 16px 12px 40px;
          }

          .heroCard,
          .healthCard,
          .panel {
            border-radius: 24px;
          }

          .heroCard {
            padding: 22px;
          }

          .statsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .quickGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .brandLogo {
            height: 42px;
          }

          .brandTitle {
            font-size: 20px;
          }
        }

        @media (max-width: 460px) {
          .statsGrid {
            grid-template-columns: 1fr;
          }

          .quickGrid {
            grid-template-columns: 1fr;
          }

          .heroTitle {
            font-size: 34px;
          }

          .healthNumber {
            font-size: 44px;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <div className="brand">
            <img
              src="/logo-prussik-display.png"
              alt="PrussikTrails"
              className="brandLogo"
            />

            <div>
              <h1 className="brandTitle">PrussikTrails Admin</h1>
              <div className="brandSub">
                Painel central de operação e controle
              </div>
            </div>
          </div>

          <div className="headerActions">
            <span className="userPill">
              {user.nome || user.email || 'Administrador'}
            </span>

            <button
              type="button"
              className="btn btn-light"
              onClick={() => carregarTudo(false)}
              disabled={atualizando}
            >
              {atualizando ? 'Atualizando...' : 'Atualizar'}
            </button>

            <button
              type="button"
              className="btn btn-green"
              onClick={reconciliarPagamentos}
              disabled={reconciliando}
            >
              {reconciliando ? 'Sincronizando...' : 'Sincronizar PH'}
            </button>

            <SettingsButton userId={user.id} userEmail={user.email || ''} />

            <button
              type="button"
              className="btn btn-red"
              onClick={sair}
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroCard">
            <div className="heroContent">
              <div className="eyebrow">Centro de comando</div>

              <h2 className="heroTitle">
                Controle total da operação <span>PrussikTrails.</span>
              </h2>

              <p className="heroText">
                Acompanhe pagamentos, reservas, guias, roteiros, usuários, chats,
                avaliações e pendências críticas em um único painel administrativo.
              </p>
            </div>
          </div>

          <aside className="healthCard">
            <div className="healthTitle">Pendências críticas</div>
            <div className="healthNumber">{alertaCritico}</div>

            <div className="healthText">
              Soma de guias, roteiros, pagamentos e avaliações que exigem atenção
              administrativa.
              {ultimaAtualizacao && (
                <>
                  <br />
                  Última atualização: {ultimaAtualizacao}.
                </>
              )}
            </div>

            <div className="healthActions">
              <button
                type="button"
                className="btn btn-dark"
                onClick={() => router.push('/admin/reservas')}
              >
                Ver reservas
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => router.push('/admin/roteiros')}
              >
                Ver roteiros
              </button>
            </div>
          </aside>
        </section>

        {mensagem && (
          <div className="message">
            {mensagem}
          </div>
        )}

        <section className="statsGrid">
          <article
            className="statCard statRed"
            onClick={() => router.push('/admin/reservas')}
          >
            <div className="statLabel">Pagamentos pendentes</div>
            <div className="statValue">{stats.pagamentosPendentes}</div>
            <div className="statHint">PagHiper / reservas</div>
          </article>

          <article
            className="statCard statGreen"
            onClick={() => router.push('/admin/reservas')}
          >
            <div className="statLabel">Pagamentos pagos</div>
            <div className="statValue">{stats.pagamentosPagos}</div>
            <div className="statHint">Confirmados</div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/admin/reservas')}
          >
            <div className="statLabel">Reservas totais</div>
            <div className="statValue">{stats.totalReservas}</div>
            <div className="statHint">{stats.reservasConfirmadas} confirmadas</div>
          </article>

          <article
            className="statCard statYellow"
            onClick={() => router.push('/admin/guias')}
          >
            <div className="statLabel">Guias pendentes</div>
            <div className="statValue">{stats.guiasPendentes}</div>
            <div className="statHint">{stats.totalGuias} guias totais</div>
          </article>

          <article
            className="statCard statYellow"
            onClick={() => router.push('/admin/roteiros')}
          >
            <div className="statLabel">Roteiros pendentes</div>
            <div className="statValue">{stats.roteirosPendentes}</div>
            <div className="statHint">{stats.roteirosAtivos} ativos</div>
          </article>

          <article
            className="statCard statGreen"
            onClick={() => router.push('/admin/financeiro')}
          >
            <div className="statLabel">Receita do mês</div>
            <div className="statValue">{formatarMoeda(stats.receitaMes)}</div>
            <div className="statHint">Total: {formatarMoeda(stats.receitaTotal)}</div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/admin/usuarios')}
          >
            <div className="statLabel">Usuários</div>
            <div className="statValue">{stats.totalUsuarios}</div>
            <div className="statHint">{stats.totalClientes} clientes</div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/admin/chats')}
          >
            <div className="statLabel">Chats abertos</div>
            <div className="statValue">{stats.chatsAbertos}</div>
            <div className="statHint">Cliente / guia</div>
          </article>

          <article
            className="statCard statYellow"
            onClick={() => router.push('/admin/avaliacoes')}
          >
            <div className="statLabel">Avaliações pendentes</div>
            <div className="statValue">{stats.avaliacoesPendentes}</div>
            <div className="statHint">Moderação</div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/admin/roteiros')}
          >
            <div className="statLabel">Roteiros totais</div>
            <div className="statValue">{stats.totalRoteiros}</div>
            <div className="statHint">Catálogo</div>
          </article>

          <article
            className="statCard statRed"
            onClick={() => router.push('/admin/reservas')}
          >
            <div className="statLabel">Canceladas</div>
            <div className="statValue">{stats.reservasCanceladas}</div>
            <div className="statHint">Reservas</div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/admin/dashboard')}
          >
            <div className="statLabel">Admins</div>
            <div className="statValue">{stats.totalAdmins}</div>
            <div className="statHint">Acesso interno</div>
          </article>
        </section>

        <section className="quickGrid">
          {[
            ['Reservas', '/admin/reservas', 'RS'],
            ['Guias', '/admin/guias', 'G'],
            ['Roteiros', '/admin/roteiros', 'RT'],
            ['Usuários', '/admin/usuarios', 'U'],
            ['Clientes', '/admin/clientes', 'C'],
            ['Pagamentos', '/admin/financeiro', 'PH'],
            ['Chats', '/admin/chats', 'CH'],
            ['Premium demo', '/premium/demo', 'P']
          ].map(([label, href, icon]) => (
            <button
              key={href}
              type="button"
              className="quickButton"
              onClick={() => router.push(href)}
            >
              <span className="quickIcon">{icon}</span>
              <div className="quickLabel">{label}</div>
            </button>
          ))}
        </section>

        <section className="mainGrid">
          <div className="panel">
            <div className="panelHeader">
              <div>
                <h3 className="panelTitle">Reservas recentes</h3>
                <div className="panelSub">
                  Pagamentos, status, valores e acesso rápido ao controle total.
                </div>
              </div>

              <button
                type="button"
                className="btn btn-dark"
                onClick={() => router.push('/admin/reservas')}
              >
                Abrir reservas
              </button>
            </div>

            <div className="panelBody">
              {reservasRecentes.length === 0 ? (
                <div className="empty">Nenhuma reserva recente encontrada.</div>
              ) : (
                <div className="tableWrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Reserva</th>
                        <th>Cliente</th>
                        <th>Roteiro</th>
                        <th>Valor</th>
                        <th>Pagamento</th>
                        <th>Status</th>
                        <th>Data</th>
                      </tr>
                    </thead>

                    <tbody>
                      {reservasRecentes.map((reserva) => (
                        <tr key={reserva.id}>
                          <td>
                            <div className="strong">
                              {String(reserva.id).slice(0, 8)}
                            </div>
                            <div className="muted">
                              {reserva.quantidade_pessoas || 1} pessoa(s)
                            </div>
                          </td>

                          <td>{reserva.cliente_nome || 'Cliente'}</td>

                          <td>{reserva.roteiro_titulo || 'Roteiro'}</td>

                          <td>
                            <span className="strong">
                              {formatarMoeda(Number(reserva.valor_total || 0))}
                            </span>
                          </td>

                          <td>{statusBadge(reserva.pagamento_status, 'pagamento')}</td>

                          <td>{statusBadge(reserva.status, 'reserva')}</td>

                          <td>
                            {formatarData(reserva.created_at)}
                            <div className="muted">{formatarHora(reserva.created_at)}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="sideGrid">
            <section className="panel">
              <div className="panelHeader">
                <div>
                  <h3 className="panelTitle">Guias pendentes</h3>
                  <div className="panelSub">Aprovação operacional</div>
                </div>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => router.push('/admin/guias')}
                >
                  Ver todos
                </button>
              </div>

              <div className="panelBody">
                {guiasPendentes.length === 0 ? (
                  <div className="empty">Nenhum guia pendente.</div>
                ) : (
                  <div className="list">
                    {guiasPendentes.map((guia) => (
                      <article className="listItem" key={guia.id}>
                        <div className="listTop">
                          <div>
                            <div className="listTitle">
                              {guia.nome || guia.email || 'Guia'}
                            </div>
                            <div className="listMeta">
                              {guia.email}
                              {guia.cadastur ? ` · CADASTUR: ${guia.cadastur}` : ''}
                            </div>
                          </div>

                          {statusBadge(guia.status || 'pendente')}
                        </div>

                        <div className="listActions">
                          <button
                            type="button"
                            className="btn btn-green"
                            onClick={() => atualizarStatusGuia(guia.id, 'ativo')}
                          >
                            Aprovar
                          </button>

                          <button
                            type="button"
                            className="btn btn-soft-red"
                            onClick={() => atualizarStatusGuia(guia.id, 'reprovado')}
                          >
                            Reprovar
                          </button>
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
                  <h3 className="panelTitle">Roteiros pendentes</h3>
                  <div className="panelSub">Curadoria e publicação</div>
                </div>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => router.push('/admin/roteiros')}
                >
                  Ver todos
                </button>
              </div>

              <div className="panelBody">
                {roteirosPendentes.length === 0 ? (
                  <div className="empty">Nenhum roteiro pendente.</div>
                ) : (
                  <div className="list">
                    {roteirosPendentes.map((roteiro) => (
                      <article className="listItem" key={roteiro.id}>
                        <div className="listTop">
                          <div>
                            <div className="listTitle">
                              {roteiro.titulo || 'Roteiro'}
                            </div>
                            <div className="listMeta">
                              Guia: {roteiro.guia_nome || 'Guia'} ·{' '}
                              {formatarMoeda(Number(roteiro.preco || 0))}
                            </div>
                          </div>

                          {statusBadge(roteiro.status || 'pendente')}
                        </div>

                        <div className="listActions">
                          <button
                            type="button"
                            className="btn btn-green"
                            onClick={() => atualizarStatusRoteiro(roteiro.id, 'ativo')}
                          >
                            Aprovar
                          </button>

                          <button
                            type="button"
                            className="btn btn-soft-red"
                            onClick={() => atualizarStatusRoteiro(roteiro.id, 'reprovado')}
                          >
                            Reprovar
                          </button>
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
                  <h3 className="panelTitle">Atividades recentes</h3>
                  <div className="panelSub">Eventos operacionais</div>
                </div>
              </div>

              <div className="panelBody">
                {atividades.length === 0 ? (
                  <div className="empty">Nenhuma atividade recente.</div>
                ) : (
                  <div>
                    {atividades.map((atividade) => (
                      <div className="activityItem" key={atividade.id}>
                        <span className={`dot ${atividade.tipo}`} />

                        <div>
                          <div className="activityText">{atividade.descricao}</div>
                          <div className="activityMeta">
                            {atividade.detalhe ? `${atividade.detalhe} · ` : ''}
                            {formatarData(atividade.created_at)} {formatarHora(atividade.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}