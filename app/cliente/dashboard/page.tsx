'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type UsuarioLocal = {
  id: string
  nome?: string | null
  email?: string | null
  tipo?: string | null
}

type Stats = {
  totalKm: number
  totalTrilhas: number
  reservasPendentes: number
  reservasConfirmadas: number
  reservasRealizadas: number
  totalMedalhas: number
  ultimaAtividade: string
}

type Reserva = {
  id: string
  cliente_id?: string | null
  roteiro_id?: string | null
  quantidade_pessoas?: number | null
  valor_total?: number | null
  status?: string | null
  pagamento_status?: string | null
  data_trilha?: string | null
  data_roteiro?: string | null
  created_at?: string | null
  roteiro?: Roteiro | null
  roteiro_titulo?: string
  roteiro_foto?: string
}

type Roteiro = {
  id: string
  titulo?: string | null
  nome?: string | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  preco?: number | null
  valor?: number | null
  duracao_horas?: number | null
  duracao?: string | null
  km?: number | null
  distancia_km?: number | null
  dificuldade?: string | null
  localizacao?: string | null
  local?: string | null
  status?: string | null
  created_at?: string | null
}

type Atividade = {
  id: string
  descricao: string
  detalhe?: string
  destino?: string
  cor: 'verde' | 'vermelho' | 'azul' | 'amarelo' | 'cinza'
  tipo: 'all' | 'com'
  created_at?: string | null
}

const statsInicial: Stats = {
  totalKm: 0,
  totalTrilhas: 0,
  reservasPendentes: 0,
  reservasConfirmadas: 0,
  reservasRealizadas: 0,
  totalMedalhas: 0,
  ultimaAtividade: 'Nenhuma atividade'
}

export default function ClienteDashboardPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)
  const reconciliandoRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [reconciliando, setReconciliando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [stats, setStats] = useState<Stats>(statsInicial)
  const [roteirosRecomendados, setRoteirosRecomendados] = useState<Roteiro[]>([])
  const [proximasReservas, setProximasReservas] = useState<Reserva[]>([])
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [abaAtividade, setAbaAtividade] = useState<'all' | 'com'>('all')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('')

  useEffect(() => {
    if (iniciouRef.current) return

    iniciouRef.current = true
    iniciarDashboard()
  }, [])

  useEffect(() => {
    if (!user?.id) return

    const interval = setInterval(() => {
      reconciliarPagamentosPendentes(true)
    }, 20000)

    return () => clearInterval(interval)
  }, [user?.id])

  const iniciarDashboard = async () => {
    setCarregando(true)
    setMensagem('')

    try {
      const userData = localStorage.getItem('user')

      if (!userData) {
        router.replace('/login')
        return
      }

      const parsedUser = JSON.parse(userData) as UsuarioLocal

      if (parsedUser.tipo !== 'cliente') {
        router.replace('/login')
        return
      }

      setUser(parsedUser)

      await carregarDados(parsedUser.id)
      await reconciliarPagamentosPendentesInterno(parsedUser.id, true)
      await carregarDados(parsedUser.id)
    } catch (error) {
      console.error('Erro ao iniciar dashboard do cliente:', error)
      setMensagem('Erro ao carregar seu dashboard.')
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

  const formatarMoeda = (valor: any) => {
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

    return data.toLocaleDateString('pt-BR')
  }

  const formatarHora = (valor?: string | null) => {
    if (!valor) return ''

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) {
      return ''
    }

    return data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const tituloRoteiro = (roteiro?: Roteiro | null) => {
    return roteiro?.titulo || roteiro?.nome || 'Roteiro'
  }

  const fotoRoteiro = (roteiro?: Roteiro | null) => {
    return roteiro?.foto_capa || roteiro?.foto_url || roteiro?.imagem_url || ''
  }

  const precoRoteiro = (roteiro?: Roteiro | null) => {
    return Number(roteiro?.preco || roteiro?.valor || 0)
  }

  const kmRoteiro = (roteiro?: Roteiro | null) => {
    return Number(roteiro?.km || roteiro?.distancia_km || 0)
  }

  const dataReserva = (reserva: Reserva) => {
    return reserva.data_trilha || reserva.data_roteiro || reserva.created_at || null
  }

  const pagamentoConfirmado = (reserva: Reserva) => {
    const pagamento = normalizar(reserva.pagamento_status)
    const status = normalizar(reserva.status)

    return (
      pagamento === 'pago' ||
      pagamento === 'confirmado' ||
      status === 'confirmada' ||
      status === 'realizada'
    )
  }

  const reservaCancelada = (reserva: Reserva) => {
    return normalizar(reserva.status) === 'cancelada'
  }

  const buscarReservasCliente = async (clienteId: string) => {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Erro ao buscar reservas do cliente:', error)
      return []
    }

    return (data || []) as Reserva[]
  }

  const buscarRoteirosPorIds = async (ids: string[]) => {
    if (ids.length === 0) return []

    const { data, error } = await supabase
      .from('roteiros')
      .select('*')
      .in('id', ids)

    if (error) {
      console.warn('Erro ao buscar roteiros por IDs:', error)
      return []
    }

    return (data || []) as Roteiro[]
  }

  const carregarDados = async (userId: string) => {
    try {
      const reservasBase = await buscarReservasCliente(userId)

      const roteiroIds = Array.from(
        new Set(
          reservasBase
            .map((reserva) => reserva.roteiro_id)
            .filter(Boolean) as string[]
        )
      )

      const roteirosReservados = await buscarRoteirosPorIds(roteiroIds)

      const reservasComRoteiro = reservasBase.map((reserva) => {
        const roteiro =
          roteirosReservados.find((item) => item.id === reserva.roteiro_id) ||
          null

        return {
          ...reserva,
          roteiro,
          roteiro_titulo: tituloRoteiro(roteiro),
          roteiro_foto: fotoRoteiro(roteiro)
        }
      })

      const reservasRealizadas = reservasComRoteiro.filter(
        (reserva) => normalizar(reserva.status) === 'realizada'
      )

      const kmTotal = reservasRealizadas.reduce(
        (soma, reserva) => soma + kmRoteiro(reserva.roteiro),
        0
      )

      const pendentes = reservasComRoteiro.filter((reserva) => {
        const status = normalizar(reserva.status)
        return status === 'pendente' || status === 'aguardando'
      }).length

      const confirmadas = reservasComRoteiro.filter((reserva) => {
        const status = normalizar(reserva.status)
        return status === 'confirmada'
      }).length

      const realizadas = reservasRealizadas.length

      let totalMedalhas = 0

      try {
        const { count } = await supabase
          .from('usuarios_medalhas')
          .select('*', { count: 'exact', head: true })
          .eq('usuario_id', userId)

        totalMedalhas = count || 0
      } catch {
        totalMedalhas = 0
      }

      const ultimaReserva = reservasComRoteiro[0]

      const proximas = reservasComRoteiro
        .filter((reserva) => {
          if (reservaCancelada(reserva)) return false

          const status = normalizar(reserva.status)
          return status === 'confirmada' || status === 'pendente' || status === 'aguardando'
        })
        .slice(0, 5)

      setProximasReservas(proximas)

      const { data: recomendados, error: recomendadosError } = await supabase
        .from('roteiros')
        .select('*')
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })
        .limit(6)

      if (recomendadosError) {
        console.warn('Erro ao buscar roteiros recomendados:', recomendadosError)
        setRoteirosRecomendados([])
      } else {
        setRoteirosRecomendados((recomendados || []) as Roteiro[])
      }

      setStats({
        totalKm: kmTotal,
        totalTrilhas: realizadas,
        reservasPendentes: pendentes,
        reservasConfirmadas: confirmadas,
        reservasRealizadas: realizadas,
        totalMedalhas,
        ultimaAtividade: ultimaReserva?.created_at
          ? formatarData(ultimaReserva.created_at)
          : 'Nenhuma atividade'
      })

      await carregarAtividades(userId, reservasComRoteiro)

      setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
      setMensagem('Erro ao carregar dados do dashboard.')
    }
  }

  const carregarAtividades = async (
    userId: string,
    reservasFallback: Reserva[]
  ) => {
    try {
      const { data, error } = await supabase
        .from('logs_atividades')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30)

      if (!error && data && data.length > 0) {
        const lista: Atividade[] = data.map((log: any) => {
          const isDoUsuario =
            log.usuario_id === userId ||
            log.user_id === userId ||
            log.cliente_id === userId ||
            log.email === user?.email

          const descricao =
            log.detalhes ||
            log.descricao ||
            `${log.primeiro_nome || 'Usuário'} realizou ${log.acao || 'uma atividade'}`

          return {
            id: String(log.id),
            descricao,
            detalhe:
              log.tipo_usuario ||
              log.acao ||
              (isDoUsuario ? 'Sua atividade' : 'Comunidade'),
            destino: log.destino || '/cliente/dashboard',
            cor: getCorPorAcao(log.acao),
            tipo: isDoUsuario ? 'all' : 'com',
            created_at: log.created_at
          }
        })

        setAtividades(lista)
        return
      }
    } catch {
      // Se a tabela logs_atividades não existir ou não estiver liberada, usa fallback.
    }

    const fallback: Atividade[] = reservasFallback.slice(0, 12).map((reserva) => ({
      id: `reserva-${reserva.id}`,
      descricao: `Reserva em ${reserva.roteiro_titulo || 'roteiro'}`,
      detalhe: `${reserva.status || 'pendente'} · ${formatarMoeda(reserva.valor_total || 0)}`,
      destino: '/cliente/minhas-reservas',
      cor: pagamentoConfirmado(reserva) ? 'verde' : 'azul',
      tipo: 'all',
      created_at: reserva.created_at
    }))

    setAtividades(fallback)
  }

  const getCorPorAcao = (
    acao?: string | null
  ): 'verde' | 'vermelho' | 'azul' | 'amarelo' | 'cinza' => {
    const a = normalizar(acao)

    if (a.includes('login')) return 'azul'
    if (a.includes('curtiu')) return 'verde'
    if (a.includes('descurtiu')) return 'cinza'
    if (a.includes('avaliou')) return 'amarelo'
    if (a.includes('reservou') || a.includes('reserva')) return 'azul'
    if (a.includes('pag')) return 'verde'
    if (a.includes('cancel')) return 'vermelho'

    return 'amarelo'
  }

  const getCorStyle = (cor: string) => {
    switch (cor) {
      case 'verde':
        return { bg: '#dcfce7', border: '#16a34a', text: '#166534' }
      case 'vermelho':
        return { bg: '#fee2e2', border: '#dc2626', text: '#991b1b' }
      case 'azul':
        return { bg: '#dbeafe', border: '#3b82f6', text: '#1e3a8a' }
      case 'cinza':
        return { bg: '#f3f4f6', border: '#9ca3af', text: '#4b5563' }
      default:
        return { bg: '#fef3c7', border: '#d97706', text: '#92400e' }
    }
  }

  const reconciliarPagamentosPendentesInterno = async (
    clienteId: string,
    silencioso = false
  ) => {
    if (!clienteId) return false
    if (reconciliandoRef.current) return false

    reconciliandoRef.current = true

    if (!silencioso) {
      setReconciliando(true)
      setMensagem('Verificando pagamentos na PagHiper...')
    }

    try {
      const response = await fetch('/api/paghiper/reconciliar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clienteId
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.sucesso) {
        if (!silencioso && response.status !== 404) {
          setMensagem(
            data?.erro ||
              data?.message ||
              'Não foi possível verificar a PagHiper agora.'
          )
        }

        return false
      }

      const atualizadas = Number(data?.atualizadas || 0)
      const jaConfirmadas = Number(data?.jaConfirmadas || 0)

      if (!silencioso) {
        if (atualizadas > 0) {
          setMensagem('Pagamento confirmado e reservas atualizadas.')
        } else if (jaConfirmadas > 0) {
          setMensagem('Suas reservas já estavam confirmadas.')
        } else {
          setMensagem('Verificação concluída. Nenhuma nova confirmação agora.')
        }
      }

      return atualizadas > 0 || jaConfirmadas > 0
    } catch (error) {
      console.warn('Erro ao reconciliar pagamentos do cliente:', error)

      if (!silencioso) {
        setMensagem('Erro ao verificar pagamentos.')
      }

      return false
    } finally {
      reconciliandoRef.current = false

      if (!silencioso) {
        setReconciliando(false)
      }
    }
  }

  const reconciliarPagamentosPendentes = async (silencioso = false) => {
    if (!user?.id) return

    const atualizou = await reconciliarPagamentosPendentesInterno(
      user.id,
      silencioso
    )

    if (atualizou) {
      await carregarDados(user.id)
    }
  }

  const atualizarDashboard = async () => {
    if (!user?.id) return

    setAtualizando(true)
    setMensagem('')

    try {
      await reconciliarPagamentosPendentesInterno(user.id, true)
      await carregarDados(user.id)
      setMensagem('Dashboard atualizado.')
    } finally {
      setAtualizando(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.replace('/login')
  }

  const atividadesFiltradas = useMemo(() => {
    if (abaAtividade === 'all') return atividades

    return atividades.filter((atividade) => atividade.tipo === 'com')
  }, [atividades, abaAtividade])

  const badgeStatusReserva = (reserva: Reserva) => {
    if (reservaCancelada(reserva)) {
      return <span className="badge badge-red">Cancelada</span>
    }

    if (pagamentoConfirmado(reserva)) {
      return <span className="badge badge-green">Confirmada</span>
    }

    return <span className="badge badge-yellow">Pendente</span>
  }

  const dificuldadeClass = (dificuldade?: string | null) => {
    const d = normalizar(dificuldade)

    if (d.includes('facil')) return 'badge-green'
    if (d.includes('medio')) return 'badge-yellow'
    if (d.includes('dificil') || d.includes('extremo')) return 'badge-red'

    return 'badge-neutral'
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
            height: 68px;
            width: auto;
            margin-bottom: 12px;
          }
        `}</style>

        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>Carregando dashboard...</div>
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

        .page {
          min-height: 100vh;
          min-height: 100dvh;
          background:
            radial-gradient(circle at top left, rgba(22, 163, 74, 0.10), transparent 30%),
            radial-gradient(circle at bottom right, rgba(220, 38, 38, 0.08), transparent 32%),
            linear-gradient(180deg, #ffffff 0%, #eef2f7 100%);
          color: #111827;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(255, 255, 255, 0.94);
          border-bottom: 1px solid #e5e7eb;
          backdrop-filter: blur(18px);
          padding: 12px 16px;
        }

        .headerInner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .brand img {
          height: 46px;
          width: auto;
          object-fit: contain;
          display: block;
        }

        .brandText {
          display: grid;
          gap: 2px;
        }

        .brandTitle {
          font-size: 20px;
          font-weight: 950;
          color: #dc2626;
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .brandSub {
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
        }

        .headerActions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
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

        .btn-green {
          background: #16a34a;
          color: #ffffff;
        }

        .btn-dark {
          background: #111827;
          color: #ffffff;
        }

        .btn-light {
          background: #f1f5f9;
          color: #334155;
        }

        .btn-red {
          background: #dc2626;
          color: #ffffff;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 22px 16px 48px;
        }

        .hero {
          background:
            linear-gradient(135deg, rgba(17, 24, 39, 0.96), rgba(15, 23, 42, 0.92)),
            radial-gradient(circle at top right, rgba(22, 163, 74, 0.24), transparent 34%);
          color: #ffffff;
          border-radius: 34px;
          padding: 28px;
          margin-bottom: 18px;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.22);
          overflow: hidden;
          position: relative;
        }

        .hero::after {
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
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 20px;
          align-items: end;
        }

        .eyebrow {
          display: inline-flex;
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

        .levelCard {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 28px;
          padding: 18px;
          min-width: 240px;
          backdrop-filter: blur(14px);
        }

        .levelLabel {
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.10em;
        }

        .levelValue {
          margin-top: 8px;
          font-size: 36px;
          font-weight: 950;
          letter-spacing: -0.07em;
          color: #ffffff;
        }

        .progress {
          height: 9px;
          border-radius: 999px;
          background: rgba(255,255,255,0.15);
          overflow: hidden;
          margin-top: 12px;
        }

        .progressFill {
          height: 100%;
          width: 68%;
          background: #22c55e;
          border-radius: 999px;
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
          border-radius: 24px;
          padding: 16px;
          min-height: 112px;
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

        .mainGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(340px, 0.85fr);
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
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
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

        .list {
          display: grid;
          gap: 12px;
        }

        .reservationCard,
        .trailCard {
          border: 1px solid #eef2f7;
          background: #f8fafc;
          border-radius: 24px;
          padding: 14px;
          display: grid;
          grid-template-columns: 82px minmax(0, 1fr);
          gap: 14px;
          align-items: center;
        }

        .thumb {
          width: 82px;
          height: 82px;
          border-radius: 22px;
          background: #e2e8f0;
          border: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-weight: 950;
          overflow: hidden;
        }

        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .itemTitle {
          color: #111827;
          font-size: 15px;
          font-weight: 950;
          line-height: 1.3;
        }

        .itemMeta {
          color: #64748b;
          font-size: 12px;
          margin-top: 5px;
          line-height: 1.45;
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

        .sideGrid {
          display: grid;
          gap: 18px;
        }

        .tabs {
          display: flex;
          gap: 8px;
          background: #f1f5f9;
          border-radius: 999px;
          padding: 4px;
        }

        .tab {
          border: none;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 950;
          cursor: pointer;
          color: #64748b;
          background: transparent;
        }

        .tab.active {
          background: #111827;
          color: #ffffff;
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
          padding: 24px;
          text-align: center;
          color: #64748b;
          font-size: 13px;
          background: #f8fafc;
          border-radius: 22px;
          border: 1px dashed #cbd5e1;
        }

        @media (max-width: 1080px) {
          .statsGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .mainGrid,
          .heroContent {
            grid-template-columns: 1fr;
          }

          .levelCard {
            min-width: 0;
          }
        }

        @media (max-width: 720px) {
          .headerActions {
            width: 100%;
          }

          .headerActions .btn {
            flex: 1;
          }

          .container {
            padding: 16px 12px 40px;
          }

          .hero,
          .panel {
            border-radius: 24px;
          }

          .hero {
            padding: 22px;
          }

          .statsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .reservationCard,
          .trailCard {
            grid-template-columns: 72px minmax(0, 1fr);
          }

          .thumb {
            width: 72px;
            height: 72px;
          }
        }

        @media (max-width: 460px) {
          .statsGrid {
            grid-template-columns: 1fr;
          }

          .heroTitle {
            font-size: 34px;
          }

          .brand img {
            height: 40px;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <div className="brand">
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />

            <div className="brandText">
              <div className="brandTitle">PrussikTrails</div>
              <div className="brandSub">Dashboard do Aventureiro</div>
            </div>
          </div>

          <div className="headerActions">
            <button
              type="button"
              className="btn btn-light"
              onClick={atualizarDashboard}
              disabled={atualizando}
            >
              {atualizando ? 'Atualizando...' : 'Atualizar'}
            </button>

            <button
              type="button"
              className="btn btn-green"
              onClick={() => router.push('/roteiros')}
            >
              Explorar
            </button>

            <button
              type="button"
              className="btn btn-dark"
              onClick={() => router.push('/cliente/minhas-reservas')}
            >
              Reservas
            </button>

            <button
              type="button"
              className="btn btn-light"
              onClick={() => router.push('/cliente/perfil')}
            >
              Perfil
            </button>

            <button
              type="button"
              className="btn btn-red"
              onClick={handleLogout}
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroContent">
            <div>
              <div className="eyebrow">Área do aventureiro</div>

              <h1 className="heroTitle">
                Olá, {user.nome || 'aventureiro'}.
                <br />
                Sua próxima <span>trilha</span> começa aqui.
              </h1>

              <p className="heroText">
                Acompanhe suas reservas, atividades, conquistas, recomendações e
                tudo que está acontecendo na comunidade PrussikTrails.
                {ultimaAtualizacao && (
                  <>
                    <br />
                    Última atualização: {ultimaAtualizacao}.
                  </>
                )}
              </p>
            </div>

            <aside className="levelCard">
              <div className="levelLabel">Progresso outdoor</div>
              <div className="levelValue">{stats.totalKm.toFixed(0)} km</div>
              <div className="progress">
                <div className="progressFill" />
              </div>
              <div style={{ marginTop: 10, color: '#cbd5e1', fontSize: 12 }}>
                {stats.totalTrilhas} trilha(s) realizadas · {stats.totalMedalhas} medalha(s)
              </div>
            </aside>
          </div>
        </section>

        {mensagem && (
          <div className="message">
            {mensagem}
          </div>
        )}

        <section className="statsGrid">
          <article
            className="statCard"
            onClick={() => router.push('/cliente/minhas-reservas')}
          >
            <div className="statLabel">KM percorridos</div>
            <div className="statValue">{stats.totalKm.toFixed(0)}</div>
            <div className="statHint">Histórico realizado</div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/cliente/minhas-reservas')}
          >
            <div className="statLabel">Trilhas realizadas</div>
            <div className="statValue">{stats.totalTrilhas}</div>
            <div className="statHint">Experiências concluídas</div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/cliente/minhas-reservas')}
          >
            <div className="statLabel">Reservas pendentes</div>
            <div className="statValue">{stats.reservasPendentes}</div>
            <div className="statHint">Aguardando pagamento/status</div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/cliente/minhas-reservas')}
          >
            <div className="statLabel">Confirmadas</div>
            <div className="statValue">{stats.reservasConfirmadas}</div>
            <div className="statHint">Prontas para aventura</div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/cliente/perfil')}
          >
            <div className="statLabel">Medalhas</div>
            <div className="statValue">{stats.totalMedalhas}</div>
            <div className="statHint">Conquistas do perfil</div>
          </article>

          <article className="statCard">
            <div className="statLabel">Última atividade</div>
            <div className="statValue" style={{ fontSize: 20, letterSpacing: '-0.04em' }}>
              {stats.ultimaAtividade}
            </div>
            <div className="statHint">Movimento recente</div>
          </article>
        </section>

        <section className="mainGrid">
          <div>
            <section className="panel">
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Próximas reservas</h2>
                  <div className="panelSub">
                    Acompanhe o que está pendente ou confirmado.
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-dark"
                  onClick={() => router.push('/cliente/minhas-reservas')}
                >
                  Ver todas
                </button>
              </div>

              <div className="panelBody">
                {proximasReservas.length === 0 ? (
                  <div className="empty">
                    Você ainda não possui reservas próximas. Explore os roteiros disponíveis.
                  </div>
                ) : (
                  <div className="list">
                    {proximasReservas.map((reserva) => (
                      <article className="reservationCard" key={reserva.id}>
                        <div className="thumb">
                          {reserva.roteiro_foto ? (
                            <img
                              src={reserva.roteiro_foto}
                              alt={reserva.roteiro_titulo || 'Roteiro'}
                            />
                          ) : (
                            'RT'
                          )}
                        </div>

                        <div>
                          <div className="itemTitle">
                            {reserva.roteiro_titulo || 'Roteiro'}
                          </div>

                          <div className="itemMeta">
                            Data: {formatarData(dataReserva(reserva))}
                            {formatarHora(dataReserva(reserva)) && ` · ${formatarHora(dataReserva(reserva))}`}
                            <br />
                            Pessoas: {reserva.quantidade_pessoas || 1}
                          </div>

                          <div className="itemFooter">
                            <span className="price">
                              {formatarMoeda(reserva.valor_total || 0)}
                            </span>

                            {badgeStatusReserva(reserva)}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="panel" style={{ marginTop: 18 }}>
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Roteiros recomendados</h2>
                  <div className="panelSub">
                    Sugestões ativas para sua próxima aventura.
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-green"
                  onClick={() => router.push('/roteiros')}
                >
                  Explorar
                </button>
              </div>

              <div className="panelBody">
                {roteirosRecomendados.length === 0 ? (
                  <div className="empty">
                    Nenhum roteiro ativo encontrado no momento.
                  </div>
                ) : (
                  <div className="list">
                    {roteirosRecomendados.map((roteiro) => {
                      const foto = fotoRoteiro(roteiro)

                      return (
                        <article className="trailCard" key={roteiro.id}>
                          <div className="thumb">
                            {foto ? (
                              <img src={foto} alt={tituloRoteiro(roteiro)} />
                            ) : (
                              'RT'
                            )}
                          </div>

                          <div>
                            <div className="itemTitle">{tituloRoteiro(roteiro)}</div>

                            <div className="itemMeta">
                              {roteiro.localizacao || roteiro.local || 'Local a confirmar'}
                              {roteiro.km || roteiro.distancia_km
                                ? ` · ${kmRoteiro(roteiro)} km`
                                : ''}
                              {roteiro.duracao_horas
                                ? ` · ${roteiro.duracao_horas}h`
                                : roteiro.duracao
                                  ? ` · ${roteiro.duracao}`
                                  : ''}
                            </div>

                            <div className="itemFooter">
                              <span className="price">
                                {formatarMoeda(precoRoteiro(roteiro))}
                              </span>

                              <span className={`badge ${dificuldadeClass(roteiro.dificuldade)}`}>
                                {roteiro.dificuldade || 'Nível livre'}
                              </span>
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
            <section className="panel">
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Atividades</h2>
                  <div className="panelSub">ALL / COM</div>
                </div>

                <div className="tabs">
                  <button
                    type="button"
                    className={`tab ${abaAtividade === 'all' ? 'active' : ''}`}
                    onClick={() => setAbaAtividade('all')}
                  >
                    ALL
                  </button>

                  <button
                    type="button"
                    className={`tab ${abaAtividade === 'com' ? 'active' : ''}`}
                    onClick={() => setAbaAtividade('com')}
                  >
                    COM
                  </button>
                </div>
              </div>

              <div className="panelBody">
                {atividadesFiltradas.length === 0 ? (
                  <div className="empty">
                    Nenhuma atividade encontrada nesta aba.
                  </div>
                ) : (
                  <div>
                    {atividadesFiltradas.map((atividade) => {
                      const cor = getCorStyle(atividade.cor)

                      return (
                        <div
                          className="activityItem"
                          key={atividade.id}
                          onClick={() => {
                            if (atividade.destino) {
                              router.push(atividade.destino)
                            }
                          }}
                          style={{ cursor: atividade.destino ? 'pointer' : 'default' }}
                        >
                          <span
                            className="dot"
                            style={{
                              background: cor.border,
                              boxShadow: `0 0 0 4px ${cor.bg}`
                            }}
                          />

                          <div>
                            <div className="activityText">
                              {atividade.descricao}
                            </div>

                            <div className="activityMeta">
                              {atividade.detalhe ? `${atividade.detalhe} · ` : ''}
                              {formatarData(atividade.created_at)} {formatarHora(atividade.created_at)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Ações rápidas</h2>
                  <div className="panelSub">Atalhos principais</div>
                </div>
              </div>

              <div className="panelBody">
                <div className="list">
                  <button
                    type="button"
                    className="btn btn-green"
                    onClick={() => router.push('/roteiros')}
                  >
                    Explorar roteiros disponíveis
                  </button>

                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={() => router.push('/cliente/minhas-reservas')}
                  >
                    Ver minhas reservas
                  </button>

                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => router.push('/cliente/perfil')}
                  >
                    Atualizar meu perfil
                  </button>

                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => router.push('/premium/demo')}
                  >
                    Ver perfil premium demo
                  </button>

                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => reconciliarPagamentosPendentes(false)}
                    disabled={reconciliando}
                  >
                    {reconciliando ? 'Verificando PagHiper...' : 'Verificar pagamentos'}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}