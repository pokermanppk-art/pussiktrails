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
  roteirosTotal: number
  roteirosAtivos: number
  roteirosPendentes: number
  reservasTotal: number
  reservasConfirmadas: number
  reservasPendentes: number
  receitaBruta: number
  taxaPlataforma: number
  repasseGuias: number
  gruposTotal: number
  gruposAtivos: number
}

const statsInicial: Stats = {
  usuariosTotal: 0,
  clientesTotal: 0,
  guiasTotal: 0,
  adminsTotal: 0,
  roteirosTotal: 0,
  roteirosAtivos: 0,
  roteirosPendentes: 0,
  reservasTotal: 0,
  reservasConfirmadas: 0,
  reservasPendentes: 0,
  receitaBruta: 0,
  taxaPlataforma: 0,
  repasseGuias: 0,
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
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
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

  const carregarTudo = async () => {
    setErro('')

    const avaliacoesResumo = await carregarAvaliacoes()

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
        .limit(500),
      supabase
        .from('roteiros')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('reservas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('grupos_roteiros')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)
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
    const reservasPendentes = reservasData.filter((reserva) => !pagamentoConfirmado(reserva))

    const receitaBruta = reservasConfirmadas.reduce(
      (total, reserva) => total + Number(reserva.valor_total || 0),
      0
    )

    const taxaPlataforma = receitaBruta * 0.05
    const repasseGuias = receitaBruta - taxaPlataforma

    const statsCalculados: Stats = {
      usuariosTotal: usuariosData.length,
      clientesTotal: usuariosData.filter((item) => normalizar(item.tipo) === 'cliente').length,
      guiasTotal: usuariosData.filter((item) => normalizar(item.tipo) === 'guia').length,
      adminsTotal: usuariosData.filter((item) => normalizar(item.tipo) === 'admin').length,
      roteirosTotal: roteirosData.length,
      roteirosAtivos: roteirosData.filter((item) => statusRoteiro(item) === 'ativo').length,
      roteirosPendentes: roteirosData.filter((item) => {
        const status = statusRoteiro(item)
        return status === 'pendente' || status === 'aguardando' || status === 'em_analise'
      }).length,
      reservasTotal: reservasData.length,
      reservasConfirmadas: reservasConfirmadas.length,
      reservasPendentes: reservasPendentes.length,
      receitaBruta,
      taxaPlataforma,
      repasseGuias,
      gruposTotal: gruposData.length,
      gruposAtivos: gruposData.filter((item) => normalizar(item.status) === 'ativo').length
    }

    setStats(statsCalculados)
    setAvaliacoes(avaliacoesResumo)
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

  const roteirosRecentes = useMemo(() => {
    return roteiros.slice(0, 6)
  }, [roteiros])

  const reservasRecentes = useMemo(() => {
    return reservas.slice(0, 6)
  }, [reservas])

  const usuariosRecentes = useMemo(() => {
    return usuarios.slice(0, 5)
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

    return <span className="badge yellow">Pendente</span>
  }

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
          z-index: 40;
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

        .headerActions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .iconBtn {
          min-height: 38px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: rgba(255, 255, 255, 0.78);
          color: #0f172a;
          border-radius: 999px;
          padding: 9px 13px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          transition: 0.2s ease;
          white-space: nowrap;
        }

        .iconBtn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.10);
        }

        .iconBtn.primary {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        .iconBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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
          grid-template-columns: minmax(0, 1fr) 330px;
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

        .heroCard {
          border-radius: 28px;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.16);
          padding: 20px;
          backdrop-filter: blur(14px);
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
          font-size: 36px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.07em;
        }

        .heroSmall {
          color: rgba(255,255,255,0.70);
          font-size: 12px;
          font-weight: 750;
          line-height: 1.45;
          margin-top: 8px;
        }

        .heroStars {
          color: #86efac;
          font-size: 18px;
          letter-spacing: 1px;
          margin-top: 8px;
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

        .mainGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(340px, 0.9fr);
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
          padding: 18px 20px;
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
          font-size: 19px;
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

        .itemCard {
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 22px;
          padding: 13px;
          display: grid;
          grid-template-columns: 72px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .itemCard:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
        }

        .thumb {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-size: 12px;
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
          color: #0f172a;
          font-size: 14px;
          font-weight: 950;
          line-height: 1.32;
        }

        .itemMeta {
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
          margin-top: 4px;
        }

        .itemFooter {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 9px;
        }

        .price {
          color: #16a34a;
          font-size: 13px;
          font-weight: 950;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 11px;
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

        .reviewBox,
        .financeBox {
          background:
            radial-gradient(circle at top right, rgba(34,197,94,0.24), transparent 34%),
            linear-gradient(135deg, #0f172a, #1e293b);
          color: #ffffff;
          border-radius: 28px;
          padding: 22px;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.20);
        }

        .reviewBox {
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
          padding: 24px;
          text-align: center;
          color: #64748b;
          background: #ffffff;
          border: 1px dashed #cbd5e1;
          border-radius: 22px;
          font-size: 13px;
          font-weight: 750;
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

          .headerActions {
            gap: 6px;
          }

          .headerActions .iconBtn {
            padding: 8px 10px;
            font-size: 11px;
          }

          .container {
            padding: 16px 12px 42px;
          }

          .hero,
          .panel,
          .reviewBox,
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
        }

        @media (max-width: 480px) {
          .heroTitle {
            font-size: 38px;
          }

          .statsGrid {
            grid-template-columns: 1fr;
          }

          .itemCard {
            grid-template-columns: 1fr;
          }

          .thumb {
            width: 100%;
            height: 150px;
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

          <div className="headerActions">
            <button
              type="button"
              className="iconBtn"
              onClick={() => router.push('/admin/roteiros')}
            >
              Roteiros
            </button>

            <button
              type="button"
              className="iconBtn"
              onClick={() => router.push('/admin/avaliacoes')}
            >
              Avaliações
            </button>

            <button
              type="button"
              className="iconBtn"
              onClick={() => router.push('/admin/financeiro')}
            >
              Financeiro
            </button>

            <button
              type="button"
              className="iconBtn primary"
              onClick={atualizar}
              disabled={atualizando}
            >
              {atualizando ? 'Atualizando...' : 'Atualizar'}
            </button>
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
                Acompanhe usuários, roteiros, reservas, grupos, financeiro e avaliações da plataforma.
                {ultimaAtualizacao && (
                  <>
                    <br />
                    Atualizado às {ultimaAtualizacao}.
                  </>
                )}
              </p>
            </div>

            <aside className="heroCard">
              <div className="heroLabel">Receita confirmada</div>
              <div className="heroValue">{formatarMoeda(stats.receitaBruta)}</div>
              <div className="heroSmall">
                Taxa estimada da plataforma: {formatarMoeda(stats.taxaPlataforma)}.
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
          <article
            className="statCard"
            onClick={() => router.push('/admin/usuarios')}
          >
            <div className="statIcon">👥</div>
            <div className="statValue">{stats.usuariosTotal}</div>
            <div className="statLabel">
              usuários · {stats.clientesTotal} clientes · {stats.guiasTotal} guias
            </div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/admin/roteiros')}
          >
            <div className="statIcon">🧭</div>
            <div className="statValue">{stats.roteirosTotal}</div>
            <div className="statLabel">
              roteiros · {stats.roteirosAtivos} ativos · {stats.roteirosPendentes} em análise
            </div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/admin/reservas')}
          >
            <div className="statIcon">🎒</div>
            <div className="statValue">{stats.reservasTotal}</div>
            <div className="statLabel">
              reservas · {stats.reservasConfirmadas} confirmadas
            </div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/admin/grupos')}
          >
            <div className="statIcon">💬</div>
            <div className="statValue">{stats.gruposTotal}</div>
            <div className="statLabel">
              grupos internos · {stats.gruposAtivos} ativos
            </div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/admin/avaliacoes')}
          >
            <div className="statIcon">⭐</div>
            <div className="statValue">{formatarNota(avaliacoes.mediaNota)}</div>
            <div className="statLabel">
              avaliações · {avaliacoes.total} registro(s) · {avaliacoes.notasBaixas} atenção
            </div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/admin/financeiro')}
          >
            <div className="statIcon">💰</div>
            <div className="statValue">{formatarMoeda(stats.taxaPlataforma)}</div>
            <div className="statLabel">
              taxa 5% estimada · repasse {formatarMoeda(stats.repasseGuias)}
            </div>
          </article>
        </section>

        <section className="mainGrid">
          <div>
            <section className="panel">
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Roteiros recentes</h2>
                  <div className="panelSub">
                    Últimos roteiros cadastrados na plataforma.
                  </div>
                </div>

                <button
                  type="button"
                  className="textLink"
                  onClick={() => router.push('/admin/roteiros')}
                >
                  Ver roteiros
                </button>
              </div>

              <div className="panelBody">
                {roteirosRecentes.length === 0 ? (
                  <div className="empty">
                    Nenhum roteiro cadastrado ainda.
                  </div>
                ) : (
                  <div className="list">
                    {roteirosRecentes.map((roteiro) => {
                      const imagem = imagemRoteiro(roteiro)

                      return (
                        <article
                          className="itemCard"
                          key={roteiro.id}
                          onClick={() => router.push('/admin/roteiros')}
                        >
                          <div className="thumb">
                            {imagem ? (
                              <img src={imagem} alt={tituloRoteiro(roteiro)} />
                            ) : (
                              'RT'
                            )}
                          </div>

                          <div>
                            <div className="itemTitle">
                              {tituloRoteiro(roteiro)}
                            </div>

                            <div className="itemMeta">
                              {localRoteiro(roteiro)}
                              <br />
                              Criado em {formatarData(roteiro.created_at)}
                            </div>

                            <div className="itemFooter">
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

            <section className="panel" style={{ marginTop: 18 }}>
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Reservas recentes</h2>
                  <div className="panelSub">
                    Últimas movimentações de reservas.
                  </div>
                </div>

                <button
                  type="button"
                  className="textLink"
                  onClick={() => router.push('/admin/reservas')}
                >
                  Ver reservas
                </button>
              </div>

              <div className="panelBody">
                {reservasRecentes.length === 0 ? (
                  <div className="empty">
                    Nenhuma reserva encontrada ainda.
                  </div>
                ) : (
                  <div className="list">
                    {reservasRecentes.map((reserva) => (
                      <article
                        className="itemCard"
                        key={reserva.id}
                        onClick={() => router.push('/admin/reservas')}
                      >
                        <div className="thumb">RS</div>

                        <div>
                          <div className="itemTitle">
                            Reserva {reserva.id.slice(0, 8)}
                          </div>

                          <div className="itemMeta">
                            Pessoas: {reserva.quantidade_pessoas || 1}
                            <br />
                            Criada em {formatarData(reserva.created_at)}
                          </div>

                          <div className="itemFooter">
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
          </div>

          <div className="sideGrid">
            <section className="reviewBox">
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
                onClick={() => router.push('/admin/avaliacoes')}
              >
                Abrir painel de avaliações
              </button>
            </section>

            <section className="financeBox">
              <div className="boxLabel">Financeiro estimado</div>
              <div className="boxValue">{formatarMoeda(stats.taxaPlataforma)}</div>

              <div className="boxText">
                Taxa estimada da plataforma sobre reservas confirmadas. Cálculo com base em 5% por reserva paga.
              </div>

              <div className="boxRows">
                <div className="boxRow">
                  <span>Receita bruta confirmada</span>
                  <strong>{formatarMoeda(stats.receitaBruta)}</strong>
                </div>

                <div className="boxRow">
                  <span>Repasse estimado aos guias</span>
                  <strong>{formatarMoeda(stats.repasseGuias)}</strong>
                </div>

                <div className="boxRow">
                  <span>Taxa plataforma</span>
                  <strong>{formatarMoeda(stats.taxaPlataforma)}</strong>
                </div>
              </div>

              <button
                type="button"
                className="boxButton"
                onClick={() => router.push('/admin/financeiro')}
              >
                Abrir financeiro
              </button>
            </section>

            <section className="panel">
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Ações rápidas</h2>
                  <div className="panelSub">
                    Atalhos de controle operacional.
                  </div>
                </div>
              </div>

              <div className="panelBody">
                <div className="quickGrid">
                  <button
                    type="button"
                    className="quickBtn"
                    onClick={() => router.push('/admin/roteiros')}
                  >
                    <div className="quickIcon">🧭</div>
                    <div className="quickTitle">Roteiros</div>
                    <div className="quickText">Aprovar, revisar e acompanhar.</div>
                  </button>

                  <button
                    type="button"
                    className="quickBtn"
                    onClick={() => router.push('/admin/avaliacoes')}
                  >
                    <div className="quickIcon">⭐</div>
                    <div className="quickTitle">Avaliações</div>
                    <div className="quickText">Reputação, qualidade e moderação.</div>
                  </button>

                  <button
                    type="button"
                    className="quickBtn"
                    onClick={() => router.push('/admin/financeiro')}
                  >
                    <div className="quickIcon">💰</div>
                    <div className="quickTitle">Financeiro</div>
                    <div className="quickText">Taxa, repasses e saldos.</div>
                  </button>

                  <button
                    type="button"
                    className="quickBtn"
                    onClick={() => router.push('/admin/usuarios')}
                  >
                    <div className="quickIcon">👥</div>
                    <div className="quickTitle">Usuários</div>
                    <div className="quickText">Clientes, guias e admins.</div>
                  </button>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Usuários recentes</h2>
                  <div className="panelSub">
                    Últimos cadastros encontrados.
                  </div>
                </div>
              </div>

              <div className="panelBody">
                {usuariosRecentes.length === 0 ? (
                  <div className="empty">
                    Nenhum usuário encontrado.
                  </div>
                ) : (
                  <div className="list">
                    {usuariosRecentes.map((usuario) => (
                      <article
                        className="itemCard"
                        key={usuario.id}
                        onClick={() => router.push('/admin/usuarios')}
                      >
                        <div className="thumb">US</div>

                        <div>
                          <div className="itemTitle">
                            {nomeUsuario(usuario)}
                          </div>

                          <div className="itemMeta">
                            {usuario.email || 'E-mail não informado'}
                            <br />
                            Criado em {formatarData(usuario.created_at)}
                          </div>

                          <div className="itemFooter">
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
    </main>
  )
}