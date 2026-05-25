'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type UsuarioLocal = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
  tipo?: string | null
}

type Reserva = {
  id: string
  cliente_id?: string | null
  roteiro_id?: string | null
  quantidade_pessoas?: number | null
  valor_total?: number | null
  status?: string | null
  pagamento_status?: string | null
  order_id?: string | null
  transaction_id?: string | null
  created_at?: string | null
  updated_at?: string | null
  roteiro?: Roteiro | null
  guia_nome?: string
  roteiro_titulo?: string
  valor_calculado?: number
}

type Roteiro = {
  id: string
  titulo?: string | null
  nome?: string | null
  descricao?: string | null
  preco?: number | null
  valor?: number | null
  id_guia?: string | null
  guia_id?: string | null
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
}

type UsuarioBanco = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
}

export default function ClienteMinhasReservasPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [abrindoGrupoId, setAbrindoGrupoId] = useState('')
  const [verificandoId, setVerificandoId] = useState('')
  const [cancelandoId, setCancelandoId] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState<'todas' | 'pendentes' | 'pagas' | 'canceladas'>('todas')
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

      if (parsedUser.tipo !== 'cliente') {
        router.replace('/login')
        return
      }

      setUser(parsedUser)

      await reconciliarCliente(parsedUser.id, true)
      await carregarReservas(parsedUser.id)
    } catch (error) {
      console.error('Erro ao iniciar minhas reservas:', error)
      setErro('Não foi possível carregar suas reservas agora.')
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
    const nome = String(valor || 'Aventureiro').trim()
    return nome.split(' ')[0] || 'Aventureiro'
  }

  const nomeUsuario = (usuario?: UsuarioLocal | null) => {
    return usuario?.nome || usuario?.name || usuario?.email || 'Aventureiro'
  }

  const tituloRoteiro = (roteiro?: Roteiro | null) => {
    return roteiro?.titulo || roteiro?.nome || 'Roteiro'
  }

  const imagemRoteiro = (roteiro?: Roteiro | null) => {
    return (
      roteiro?.foto_capa ||
      roteiro?.foto_url ||
      roteiro?.imagem_url ||
      roteiro?.imagem ||
      ''
    )
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

  const dataRoteiro = (roteiro?: Roteiro | null) => {
    return roteiro?.data_roteiro || roteiro?.data_saida || roteiro?.data || null
  }

  const horaRoteiro = (roteiro?: Roteiro | null) => {
    return roteiro?.hora_roteiro || roteiro?.hora_saida || roteiro?.hora || ''
  }

  const precoRoteiro = (roteiro?: Roteiro | null) => {
    return Number(roteiro?.preco || roteiro?.valor || 0)
  }

  const guiaIdRoteiro = (roteiro?: Roteiro | null) => {
    return roteiro?.id_guia || roteiro?.guia_id || ''
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

  const pagamentoConfirmado = (reserva?: Reserva | null) => {
    const pagamento = normalizar(reserva?.pagamento_status)
    const status = normalizar(reserva?.status)

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

  const reservaCancelada = (reserva?: Reserva | null) => {
    const status = normalizar(reserva?.status)

    return status === 'cancelada' || status === 'cancelado' || status === 'cancelled'
  }

  const reconciliarCliente = async (clienteId: string, silencioso = false) => {
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

      if (!response.ok || data?.sucesso === false) {
        if (!silencioso) {
          setErro(data?.erro || data?.message || 'Não foi possível verificar seus pagamentos.')
        }

        return null
      }

      if (!silencioso) {
        const atualizadas = Number(data?.atualizadas || 0)
        const gruposLiberados = Number(data?.gruposLiberados || 0)

        if (atualizadas > 0 || gruposLiberados > 0) {
          setMensagem(
            `Pagamentos verificados. ${atualizadas} reserva(s) atualizada(s) e ${gruposLiberados} grupo(s) liberado(s).`
          )
        } else {
          setMensagem('Pagamentos verificados. Nenhuma nova confirmação encontrada agora.')
        }
      }

      return data
    } catch (error) {
      console.warn('Erro ao reconciliar cliente:', error)

      if (!silencioso) {
        setErro('Não foi possível verificar seus pagamentos agora.')
      }

      return null
    }
  }

  const carregarReservas = async (clienteId: string) => {
    setErro('')

    const { data: reservasData, error: reservasError } = await supabase
      .from('reservas')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })

    if (reservasError) {
      console.error('Erro ao buscar reservas:', reservasError)
      setErro('Não foi possível buscar suas reservas.')
      setReservas([])
      return
    }

    const reservasBase = (reservasData || []) as Reserva[]

    if (reservasBase.length === 0) {
      setReservas([])
      setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
      return
    }

    const roteiroIds = Array.from(
      new Set(
        reservasBase
          .map((reserva) => reserva.roteiro_id)
          .filter(Boolean) as string[]
      )
    )

    let roteiros: Roteiro[] = []

    if (roteiroIds.length > 0) {
      const { data: roteirosData, error: roteirosError } = await supabase
        .from('roteiros')
        .select('*')
        .in('id', roteiroIds)

      if (!roteirosError) {
        roteiros = (roteirosData || []) as Roteiro[]
      }
    }

    const guiaIds = Array.from(
      new Set(
        roteiros
          .map((roteiro) => guiaIdRoteiro(roteiro))
          .filter(Boolean) as string[]
      )
    )

    let guias: UsuarioBanco[] = []

    if (guiaIds.length > 0) {
      const { data: guiasData, error: guiasError } = await supabase
        .from('users')
        .select('id, nome, name, email')
        .in('id', guiaIds)

      if (!guiasError) {
        guias = (guiasData || []) as UsuarioBanco[]
      }
    }

    const reservasCompletas = reservasBase.map((reserva) => {
      const roteiro =
        roteiros.find((item) => item.id === reserva.roteiro_id) ||
        null

      const guiaId = guiaIdRoteiro(roteiro)
      const guia = guias.find((item) => item.id === guiaId)

      const quantidade = Number(reserva.quantidade_pessoas || 1)
      const valorCalculado =
        Number(reserva.valor_total || 0) ||
        precoRoteiro(roteiro) * quantidade ||
        0

      return {
        ...reserva,
        roteiro,
        roteiro_titulo: tituloRoteiro(roteiro),
        guia_nome:
          guia?.nome ||
          guia?.name ||
          guia?.email ||
          'Guia',
        valor_calculado: valorCalculado
      }
    })

    setReservas(reservasCompletas)
    setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
  }

  const atualizarTudo = async () => {
    if (!user?.id) return

    setAtualizando(true)
    setErro('')
    setMensagem('')

    try {
      await reconciliarCliente(user.id, false)
      await carregarReservas(user.id)
    } finally {
      setAtualizando(false)
    }
  }

  const verificarReserva = async (reserva: Reserva) => {
    if (!reserva?.id || !user?.id) return

    setVerificandoId(reserva.id)
    setErro('')
    setMensagem('')

    try {
      const response = await fetch('/api/paghiper/reconciliar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reservaId: reserva.id
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        setErro(data?.erro || data?.message || 'Pagamento ainda não confirmado.')
        return
      }

      await carregarReservas(user.id)

      const gruposLiberados = Number(data?.gruposLiberados || 0)
      const atualizadas = Number(data?.atualizadas || 0)
      const jaConfirmadas = Number(data?.jaConfirmadas || 0)

      if (gruposLiberados > 0 || atualizadas > 0 || jaConfirmadas > 0) {
        setMensagem('Reserva verificada. Se o pagamento estiver confirmado, o grupo já foi liberado.')
      } else {
        setMensagem('Ainda não encontramos confirmação para esta reserva.')
      }
    } catch (error) {
      console.error('Erro ao verificar reserva:', error)
      setErro('Não foi possível verificar esta reserva agora.')
    } finally {
      setVerificandoId('')
    }
  }

  const entrarNoGrupo = async (reserva: Reserva) => {
    if (!reserva?.id) return

    if (!pagamentoConfirmado(reserva)) {
      setErro('O grupo é liberado apenas após confirmação do pagamento.')
      return
    }

    setAbrindoGrupoId(reserva.id)
    setErro('')
    setMensagem('Abrindo grupo da sua aventura...')

    try {
      const response = await fetch('/api/grupos/garantir-acesso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reservaId: reserva.id
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.sucesso) {
        const diagnostico = await fetch('/api/grupos/diagnostico-reserva', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reservaId: reserva.id,
            corrigir: true
          })
        })

        const diagnosticoData = await diagnostico.json().catch(() => null)

        if (diagnostico.ok && diagnosticoData?.grupo?.id) {
          router.push(`/cliente/grupos/${diagnosticoData.grupo.id}`)
          return
        }

        setErro(
          data?.erro ||
            diagnosticoData?.erro ||
            'Não foi possível abrir o grupo agora. Tente atualizar suas reservas.'
        )
        return
      }

      const redirectUrl =
        data?.redirectUrl ||
        (data?.grupo?.id ? `/cliente/grupos/${data.grupo.id}` : '')

      if (redirectUrl) {
        router.push(redirectUrl)
        return
      }

      setErro('Grupo liberado, mas não foi possível localizar o endereço.')
    } catch (error) {
      console.error('Erro ao abrir grupo:', error)
      setErro('Não foi possível abrir o grupo agora.')
    } finally {
      setAbrindoGrupoId('')
    }
  }

  const cancelarReserva = async (reserva: Reserva) => {
    if (!reserva?.id || !user?.id) return

    if (pagamentoConfirmado(reserva)) {
      setErro('Reservas pagas/confirmadas não podem ser canceladas por aqui.')
      return
    }

    const confirmar = window.confirm('Deseja cancelar esta reserva?')

    if (!confirmar) return

    setCancelandoId(reserva.id)
    setErro('')
    setMensagem('')

    try {
      const { error } = await supabase
        .from('reservas')
        .update({
          status: 'cancelada',
          updated_at: new Date().toISOString()
        })
        .eq('id', reserva.id)
        .eq('cliente_id', user.id)

      if (error) {
        console.error('Erro ao cancelar reserva:', error)
        setErro('Não foi possível cancelar a reserva.')
        return
      }

      setMensagem('Reserva cancelada.')
      await carregarReservas(user.id)
    } catch (error) {
      console.error('Erro inesperado ao cancelar reserva:', error)
      setErro('Erro ao cancelar reserva.')
    } finally {
      setCancelandoId('')
    }
  }

  const badgeStatus = (reserva: Reserva) => {
    if (reservaCancelada(reserva)) {
      return <span className="badge badge-red">Cancelada</span>
    }

    if (pagamentoConfirmado(reserva)) {
      return <span className="badge badge-green">Confirmada</span>
    }

    return <span className="badge badge-yellow">Aguardando</span>
  }

  const badgePagamento = (reserva: Reserva) => {
    if (pagamentoConfirmado(reserva)) {
      return <span className="badge badge-green">Pago</span>
    }

    if (reservaCancelada(reserva)) {
      return <span className="badge badge-neutral">Cancelado</span>
    }

    return <span className="badge badge-yellow">Pendente</span>
  }

  const reservasFiltradas = useMemo(() => {
    return reservas.filter((reserva) => {
      if (filtro === 'todas') return true
      if (filtro === 'pagas') return pagamentoConfirmado(reserva)
      if (filtro === 'canceladas') return reservaCancelada(reserva)
      if (filtro === 'pendentes') {
        return !pagamentoConfirmado(reserva) && !reservaCancelada(reserva)
      }

      return true
    })
  }, [reservas, filtro])

  const stats = useMemo(() => {
    const pagas = reservas.filter(pagamentoConfirmado)
    const pendentes = reservas.filter(
      (reserva) => !pagamentoConfirmado(reserva) && !reservaCancelada(reserva)
    )
    const canceladas = reservas.filter(reservaCancelada)

    return {
      total: reservas.length,
      pagas: pagas.length,
      pendentes: pendentes.length,
      canceladas: canceladas.length
    }
  }, [reservas])

  if (carregando || !user) {
    return (
      <main className="loading">
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

          .loadingCard img {
            height: 68px;
            width: auto;
            margin-bottom: 12px;
          }
        `}</style>

        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>Carregando suas reservas...</div>
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

        .headerActions {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .iconBtn {
          height: 38px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(255,255,255,0.78);
          border-radius: 999px;
          padding: 0 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          font-weight: 900;
          transition: 0.2s ease;
          color: #172018;
          white-space: nowrap;
        }

        .iconBtn.primary {
          background: #172018;
          color: #ffffff;
          border-color: #172018;
        }

        .iconBtn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
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
          min-height: 310px;
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
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: 24px;
          align-items: end;
          min-height: 245px;
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

        .heroCardText {
          margin-top: 8px;
          color: rgba(255,255,255,0.78);
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
        }

        .alert {
          border-radius: 18px;
          padding: 13px 15px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.45;
        }

        .alert.success {
          background: #ecfdf5;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .alert.error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .statCard {
          background: rgba(255,255,255,0.86);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 28px;
          padding: 16px;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
          cursor: pointer;
        }

        .statValue {
          color: #172018;
          font-size: 30px;
          font-weight: 950;
          letter-spacing: -0.07em;
        }

        .statLabel {
          color: #64748b;
          font-size: 12px;
          font-weight: 850;
          margin-top: 3px;
          line-height: 1.35;
        }

        .toolbar {
          background: rgba(255,255,255,0.88);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 30px;
          padding: 14px;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tab {
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: #fffdf7;
          color: #475569;
          border-radius: 999px;
          padding: 10px 13px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
        }

        .tab.active {
          background: #172018;
          color: #ffffff;
          border-color: #172018;
        }

        .grid {
          display: grid;
          gap: 16px;
        }

        .card {
          background: rgba(255,255,255,0.90);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 32px;
          overflow: hidden;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.07);
          display: grid;
          grid-template-columns: 230px minmax(0, 1fr);
        }

        .imageBox {
          min-height: 230px;
          background:
            radial-gradient(circle at top right, rgba(251, 146, 60, 0.20), transparent 38%),
            linear-gradient(135deg, #dbe7c8, #aebf8d);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-weight: 950;
        }

        .imageBox img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .cardBody {
          padding: 18px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 14px;
        }

        .cardTitle {
          color: #172018;
          font-size: 24px;
          line-height: 1.08;
          font-weight: 950;
          letter-spacing: -0.055em;
          margin: 0;
        }

        .meta {
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
          font-weight: 750;
          margin-top: 8px;
        }

        .infoGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .infoItem {
          background: #fffdf7;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 18px;
          padding: 10px;
        }

        .infoLabel {
          color: #64748b;
          font-size: 10px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .infoValue {
          color: #172018;
          font-size: 12px;
          font-weight: 900;
          margin-top: 4px;
          line-height: 1.35;
        }

        .cardFooter {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .badges {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 7px 10px;
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

        .actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .btn {
          border: none;
          border-radius: 999px;
          padding: 12px 14px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.10);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn.primary {
          background: #16a34a;
          color: #ffffff;
        }

        .btn.dark {
          background: #172018;
          color: #ffffff;
        }

        .btn.light {
          background: #eef2e5;
          color: #475569;
        }

        .btn.danger {
          background: #fee2e2;
          color: #991b1b;
        }

        .empty {
          padding: 34px;
          text-align: center;
          color: #64748b;
          font-size: 14px;
          background: rgba(255,255,255,0.86);
          border-radius: 28px;
          border: 1px dashed #cbd5e1;
          font-weight: 700;
        }

        @media (max-width: 1040px) {
          .heroContent {
            grid-template-columns: 1fr;
          }

          .statsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .card {
            grid-template-columns: 1fr;
          }

          .imageBox {
            min-height: 220px;
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

          .headerActions .hideMobile {
            display: none;
          }

          .container {
            padding: 16px 12px 42px;
          }

          .hero {
            border-radius: 28px;
            padding: 22px;
            min-height: auto;
          }

          .heroContent {
            min-height: auto;
          }

          .statsGrid,
          .infoGrid {
            grid-template-columns: 1fr 1fr;
          }

          .toolbar {
            align-items: stretch;
          }

          .toolbar .iconBtn {
            width: 100%;
          }

          .actions {
            display: grid;
            width: 100%;
          }

          .btn {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .heroTitle {
            font-size: 40px;
          }

          .brand img {
            height: 38px;
          }

          .statsGrid,
          .infoGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <div
            className="brand"
            onClick={() => router.push('/cliente/dashboard')}
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />

            <div>
              <div className="brandTitle">PrussikTrails</div>
              <div className="brandSub">Minhas reservas</div>
            </div>
          </div>

          <div className="headerActions">
            <button
              type="button"
              className="iconBtn hideMobile"
              onClick={() => router.push('/cliente/dashboard')}
            >
              Dashboard
            </button>

            <button
              type="button"
              className="iconBtn hideMobile"
              onClick={() => router.push('/roteiros')}
            >
              Roteiros
            </button>

            <button
              type="button"
              className="iconBtn"
              onClick={atualizarTudo}
              disabled={atualizando}
            >
              {atualizando ? '…' : '↻'}
            </button>

            <button
              type="button"
              className="iconBtn primary"
              onClick={() => router.push('/cliente/perfil')}
            >
              Perfil
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroContent">
            <div>
              <div className="eyebrow">Suas aventuras</div>

              <h1 className="heroTitle">
                Oi, {primeiroNome(nomeUsuario(user))}.
                <br />
                Suas reservas ficam <span>organizadas aqui.</span>
              </h1>

              <p className="heroText">
                Acompanhe pagamento, confirmação e acesso ao grupo interno do roteiro.
                Quando o pagamento for confirmado, o botão Entrar no grupo aparecerá na reserva.
                {ultimaAtualizacao && (
                  <>
                    <br />
                    Atualizado às {ultimaAtualizacao}.
                  </>
                )}
              </p>
            </div>

            <aside className="heroCard">
              <div className="heroCardLabel">Reservas confirmadas</div>
              <div className="heroCardValue">{stats.pagas}</div>
              <div className="heroCardText">
                Reservas pagas liberam acesso automático ao grupo da aventura.
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

        <section className="statsGrid">
          <article className="statCard" onClick={() => setFiltro('todas')}>
            <div className="statValue">{stats.total}</div>
            <div className="statLabel">reservas totais</div>
          </article>

          <article className="statCard" onClick={() => setFiltro('pagas')}>
            <div className="statValue">{stats.pagas}</div>
            <div className="statLabel">pagas/confirmadas</div>
          </article>

          <article className="statCard" onClick={() => setFiltro('pendentes')}>
            <div className="statValue">{stats.pendentes}</div>
            <div className="statLabel">aguardando pagamento</div>
          </article>

          <article className="statCard" onClick={() => setFiltro('canceladas')}>
            <div className="statValue">{stats.canceladas}</div>
            <div className="statLabel">canceladas</div>
          </article>
        </section>

        <section className="toolbar">
          <div className="tabs">
            <button
              type="button"
              className={`tab ${filtro === 'todas' ? 'active' : ''}`}
              onClick={() => setFiltro('todas')}
            >
              Todas
            </button>

            <button
              type="button"
              className={`tab ${filtro === 'pagas' ? 'active' : ''}`}
              onClick={() => setFiltro('pagas')}
            >
              Pagas
            </button>

            <button
              type="button"
              className={`tab ${filtro === 'pendentes' ? 'active' : ''}`}
              onClick={() => setFiltro('pendentes')}
            >
              Pendentes
            </button>

            <button
              type="button"
              className={`tab ${filtro === 'canceladas' ? 'active' : ''}`}
              onClick={() => setFiltro('canceladas')}
            >
              Canceladas
            </button>
          </div>

          <button
            type="button"
            className="iconBtn primary"
            onClick={atualizarTudo}
            disabled={atualizando}
          >
            {atualizando ? 'Verificando...' : 'Verificar pagamentos'}
          </button>
        </section>

        {reservasFiltradas.length === 0 ? (
          <div className="empty">
            Nenhuma reserva encontrada neste filtro.
          </div>
        ) : (
          <section className="grid">
            {reservasFiltradas.map((reserva) => {
              const roteiro = reserva.roteiro
              const foto = imagemRoteiro(roteiro)
              const paga = pagamentoConfirmado(reserva)
              const cancelada = reservaCancelada(reserva)

              return (
                <article className="card" key={reserva.id}>
                  <div className="imageBox">
                    {foto ? (
                      <img src={foto} alt={tituloRoteiro(roteiro)} />
                    ) : (
                      'Roteiro'
                    )}
                  </div>

                  <div className="cardBody">
                    <div>
                      <h2 className="cardTitle">
                        {reserva.roteiro_titulo || tituloRoteiro(roteiro)}
                      </h2>

                      <div className="meta">
                        Guia: {reserva.guia_nome || 'Guia'}
                        <br />
                        {localRoteiro(roteiro)}
                      </div>
                    </div>

                    <div className="infoGrid">
                      <div className="infoItem">
                        <div className="infoLabel">Data</div>
                        <div className="infoValue">{formatarData(dataRoteiro(roteiro))}</div>
                      </div>

                      <div className="infoItem">
                        <div className="infoLabel">Hora</div>
                        <div className="infoValue">{horaRoteiro(roteiro) || '-'}</div>
                      </div>

                      <div className="infoItem">
                        <div className="infoLabel">Pessoas</div>
                        <div className="infoValue">{reserva.quantidade_pessoas || 1}</div>
                      </div>

                      <div className="infoItem">
                        <div className="infoLabel">Valor</div>
                        <div className="infoValue">
                          {formatarMoeda(reserva.valor_calculado || reserva.valor_total || 0)}
                        </div>
                      </div>
                    </div>

                    <div className="cardFooter">
                      <div className="badges">
                        {badgeStatus(reserva)}
                        {badgePagamento(reserva)}
                      </div>

                      <div className="actions">
                        {paga ? (
                          <button
                            type="button"
                            className="btn primary"
                            onClick={() => entrarNoGrupo(reserva)}
                            disabled={abrindoGrupoId === reserva.id}
                          >
                            {abrindoGrupoId === reserva.id ? 'Abrindo...' : 'Entrar no grupo'}
                          </button>
                        ) : !cancelada ? (
                          <>
                            <button
                              type="button"
                              className="btn dark"
                              onClick={() => router.push(`/cliente/pagamento/${reserva.id}`)}
                            >
                              Pagar
                            </button>

                            <button
                              type="button"
                              className="btn light"
                              onClick={() => verificarReserva(reserva)}
                              disabled={verificandoId === reserva.id}
                            >
                              {verificandoId === reserva.id ? 'Verificando...' : 'Já paguei'}
                            </button>
                          </>
                        ) : null}

                        {!paga && !cancelada && (
                          <button
                            type="button"
                            className="btn danger"
                            onClick={() => cancelarReserva(reserva)}
                            disabled={cancelandoId === reserva.id}
                          >
                            {cancelandoId === reserva.id ? 'Cancelando...' : 'Cancelar'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}