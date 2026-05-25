'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type AdminUser = {
  id: string
  nome?: string | null
  email?: string | null
  tipo?: string | null
}

type Guia = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
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
  dificuldade?: string | null
  duracao_horas?: number | null
  duracao?: string | null
  limite_pessoas?: number | null
  capacidade?: number | null
  max_pessoas?: number | null
  recorrencia?: string | null
  frequencia?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  imagem?: string | null
  created_at?: string | null
  updated_at?: string | null
  guia_nome?: string
}

type Stats = {
  total: number
  ativos: number
  pendentes: number
  reprovados: number
  pausados: number
}

export default function AdminRoteirosPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)

  const [user, setUser] = useState<AdminUser | null>(null)
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativo' | 'pendente' | 'reprovado' | 'pausado'>('todos')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('')

  useEffect(() => {
    if (iniciouRef.current) return
    iniciouRef.current = true
    iniciarPagina()
  }, [])

  const iniciarPagina = async () => {
    setCarregando(true)
    setMensagem('')

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
      await carregarRoteiros()
    } catch (error) {
      console.error('Erro ao iniciar admin roteiros:', error)
      setMensagem('Erro ao carregar página de roteiros.')
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
    const numero = Number(valor || 0)

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numero)
  }

  const formatarData = (valor?: string | null) => {
    if (!valor) return '-'

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) {
      return valor
    }

    return data.toLocaleDateString('pt-BR')
  }

  const tituloRoteiro = (roteiro: Roteiro) => {
    return roteiro.titulo || roteiro.nome || 'Roteiro sem título'
  }

  const precoRoteiro = (roteiro: Roteiro) => {
    return Number(roteiro.preco || roteiro.valor || 0)
  }

  const guiaIdRoteiro = (roteiro: Roteiro) => {
    return roteiro.id_guia || roteiro.guia_id || ''
  }

  const localRoteiro = (roteiro: Roteiro) => {
    return roteiro.local || roteiro.localizacao || roteiro.local_encontro || roteiro.ponto_encontro || '-'
  }

  const dataRoteiro = (roteiro: Roteiro) => {
    return roteiro.data_roteiro || roteiro.data_saida || roteiro.data || roteiro.created_at || null
  }

  const horaRoteiro = (roteiro: Roteiro) => {
    return roteiro.hora_roteiro || roteiro.hora_saida || roteiro.hora || ''
  }

  const limitePessoas = (roteiro: Roteiro) => {
    const limite =
      roteiro.limite_pessoas ??
      roteiro.capacidade ??
      roteiro.max_pessoas ??
      null

    if (limite === null || limite === undefined) return 'Sem limite'

    const numero = Number(limite)

    if (!Number.isFinite(numero) || numero <= 0) return 'Sem limite'

    return `${numero} pessoa(s)`
  }

  const recorrenciaRoteiro = (roteiro: Roteiro) => {
    return roteiro.recorrencia || roteiro.frequencia || 'Única vez'
  }

  const imagemRoteiro = (roteiro: Roteiro) => {
    return roteiro.foto_url || roteiro.imagem_url || roteiro.imagem || ''
  }

  const statusNormalizado = (roteiro: Roteiro) => {
    const status = normalizar(roteiro.status)

    if (status) return status

    if (roteiro.ativo === true) return 'ativo'
    if (roteiro.ativo === false) return 'pausado'

    return 'pendente'
  }

  const carregarRoteiros = async () => {
    setMensagem('')

    try {
      let roteirosData: Roteiro[] = []

      const tentativaOrdenada = await supabase
        .from('roteiros')
        .select('*')
        .order('created_at', { ascending: false })

      if (tentativaOrdenada.error) {
        console.warn('Erro ao buscar roteiros ordenados:', tentativaOrdenada.error)

        const tentativaSimples = await supabase
          .from('roteiros')
          .select('*')

        if (tentativaSimples.error) {
          console.error('Erro ao buscar roteiros:', tentativaSimples.error)
          setMensagem('Erro ao buscar roteiros no Supabase.')
          setRoteiros([])
          return
        }

        roteirosData = (tentativaSimples.data || []) as Roteiro[]
      } else {
        roteirosData = (tentativaOrdenada.data || []) as Roteiro[]
      }

      if (roteirosData.length === 0) {
        setRoteiros([])
        setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
        return
      }

      const guiaIds = Array.from(
        new Set(
          roteirosData
            .map((roteiro) => guiaIdRoteiro(roteiro))
            .filter(Boolean)
        )
      )

      let guias: Guia[] = []

      if (guiaIds.length > 0) {
        const { data: guiasData, error: guiasError } = await supabase
          .from('users')
          .select('*')
          .in('id', guiaIds)

        if (guiasError) {
          console.warn('Erro ao buscar guias dos roteiros:', guiasError)
        } else {
          guias = (guiasData || []) as Guia[]
        }
      }

      const roteirosComGuia = roteirosData.map((roteiro) => {
        const guia = guias.find((item) => item.id === guiaIdRoteiro(roteiro))

        return {
          ...roteiro,
          guia_nome:
            guia?.nome ||
            guia?.name ||
            guia?.email ||
            'Guia não identificado'
        }
      })

      setRoteiros(roteirosComGuia)
      setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
    } catch (error) {
      console.error('Erro inesperado ao carregar roteiros:', error)
      setMensagem('Erro inesperado ao carregar roteiros.')
      setRoteiros([])
    }
  }

  const extrairColunaAusente = (error: any) => {
    const texto = [
      error?.message,
      error?.details,
      error?.hint
    ]
      .filter(Boolean)
      .join(' ')

    const matchAspas = texto.match(/'([^']+)'/)

    if (matchAspas?.[1]) {
      return matchAspas[1]
    }

    const matchColumn = texto.match(/column\s+([a-zA-Z0-9_]+)/i)

    if (matchColumn?.[1]) {
      return matchColumn[1]
    }

    return ''
  }

  const erroDeColunaAusente = (error: any) => {
    const texto = String(
      error?.message ||
        error?.details ||
        error?.hint ||
        ''
    ).toLowerCase()

    return (
      error?.code === '42703' ||
      error?.code === 'PGRST204' ||
      texto.includes('could not find') ||
      texto.includes('schema cache') ||
      texto.includes('column')
    )
  }

  const atualizarRoteiroComFallback = async (
    roteiroId: string,
    payloadOriginal: Record<string, any>
  ) => {
    let payloadAtual = { ...payloadOriginal }

    for (let tentativa = 0; tentativa < 10; tentativa++) {
      const { error } = await supabase
        .from('roteiros')
        .update(payloadAtual)
        .eq('id', roteiroId)

      if (!error) return

      if (!erroDeColunaAusente(error)) {
        throw error
      }

      const coluna = extrairColunaAusente(error)

      if (!coluna || !(coluna in payloadAtual)) {
        throw error
      }

      delete payloadAtual[coluna]
    }
  }

  const atualizarStatus = async (
    roteiroId: string,
    novoStatus: 'ativo' | 'pendente' | 'reprovado' | 'pausado'
  ) => {
    const textos = {
      ativo: 'publicar/aprovar este roteiro?',
      pendente: 'colocar este roteiro como pendente?',
      reprovado: 'reprovar este roteiro?',
      pausado: 'pausar este roteiro?'
    }

    const confirmar = window.confirm(`Tem certeza que deseja ${textos[novoStatus]}`)

    if (!confirmar) return

    setMensagem('')

    try {
      await atualizarRoteiroComFallback(roteiroId, {
        status: novoStatus,
        ativo: novoStatus === 'ativo',
        updated_at: new Date().toISOString()
      })

      setMensagem('Status do roteiro atualizado.')
      await carregarRoteiros()
    } catch (error) {
      console.error('Erro ao atualizar status do roteiro:', error)
      setMensagem('Erro ao atualizar status do roteiro.')
    }
  }

  const recarregar = async () => {
    setAtualizando(true)
    setMensagem('')

    try {
      await carregarRoteiros()
      setMensagem('Roteiros atualizados.')
    } finally {
      setAtualizando(false)
    }
  }

  const sair = () => {
    localStorage.removeItem('user')
    router.replace('/login')
  }

  const stats: Stats = useMemo(() => {
    const total = roteiros.length
    const ativos = roteiros.filter((r) => statusNormalizado(r) === 'ativo').length
    const reprovados = roteiros.filter((r) => statusNormalizado(r) === 'reprovado').length
    const pausados = roteiros.filter((r) => statusNormalizado(r) === 'pausado').length
    const pendentes = roteiros.filter((r) => {
      const s = statusNormalizado(r)
      return s === 'pendente' || s === 'aguardando' || s === 'em_analise'
    }).length

    return {
      total,
      ativos,
      pendentes,
      reprovados,
      pausados
    }
  }, [roteiros])

  const roteirosFiltrados = useMemo(() => {
    const termo = normalizar(busca)

    return roteiros.filter((roteiro) => {
      const status = statusNormalizado(roteiro)

      const passaStatus =
        filtroStatus === 'todos'
          ? true
          : filtroStatus === 'pendente'
            ? status === 'pendente' || status === 'aguardando' || status === 'em_analise'
            : status === filtroStatus

      const textoBusca = normalizar(
        [
          tituloRoteiro(roteiro),
          roteiro.descricao,
          roteiro.guia_nome,
          localRoteiro(roteiro),
          roteiro.dificuldade,
          recorrenciaRoteiro(roteiro)
        ].join(' ')
      )

      const passaBusca = termo ? textoBusca.includes(termo) : true

      return passaStatus && passaBusca
    })
  }, [roteiros, busca, filtroStatus])

  const badgeStatus = (roteiro: Roteiro) => {
    const status = statusNormalizado(roteiro)

    if (status === 'ativo') {
      return <span className="badge badge-green">Ativo</span>
    }

    if (status === 'reprovado') {
      return <span className="badge badge-red">Reprovado</span>
    }

    if (status === 'pausado') {
      return <span className="badge badge-neutral">Pausado</span>
    }

    return <span className="badge badge-yellow">Pendente</span>
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
            border-radius: 28px;
            border: 1px solid #eef2f7;
            padding: 28px;
            text-align: center;
            box-shadow: 0 12px 32px rgba(15, 23, 42, 0.10);
          }

          .loadingCard img {
            height: 64px;
            width: auto;
            margin-bottom: 12px;
          }
        `}</style>

        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>Carregando roteiros...</div>
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

        .btn-yellow {
          background: #fef3c7;
          color: #92400e;
        }

        .container {
          max-width: 1440px;
          margin: 0 auto;
          padding: 24px 18px 52px;
        }

        .hero {
          background:
            linear-gradient(135deg, rgba(17, 24, 39, 0.96), rgba(15, 23, 42, 0.92)),
            radial-gradient(circle at top right, rgba(22, 163, 74, 0.22), transparent 32%);
          color: #ffffff;
          border-radius: 34px;
          padding: 28px;
          margin-bottom: 18px;
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.24);
          position: relative;
          overflow: hidden;
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
          max-width: 780px;
          font-size: clamp(34px, 5vw, 54px);
          line-height: 0.98;
          font-weight: 950;
          letter-spacing: -0.07em;
        }

        .heroTitle span {
          color: #22c55e;
        }

        .heroText {
          max-width: 780px;
          color: #cbd5e1;
          line-height: 1.65;
          margin: 14px 0 0;
          font-size: 14px;
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
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .statCard {
          background: #ffffff;
          border: 1px solid #eef2f7;
          border-radius: 26px;
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
        }

        .statValue {
          margin-top: 12px;
          font-size: 34px;
          font-weight: 950;
          color: #111827;
          letter-spacing: -0.07em;
        }

        .statGreen .statValue {
          color: #16a34a;
        }

        .statYellow .statValue {
          color: #d97706;
        }

        .statRed .statValue {
          color: #dc2626;
        }

        .filters {
          background: #ffffff;
          border: 1px solid #eef2f7;
          border-radius: 28px;
          padding: 16px;
          box-shadow: 0 1px 6px rgba(15, 23, 42, 0.06);
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          margin-bottom: 18px;
        }

        .searchInput {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 999px;
          padding: 13px 16px;
          font-size: 14px;
          outline: none;
          color: #111827;
        }

        .searchInput:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.10);
        }

        .filterButtons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filterButton {
          border: 1px solid #e5e7eb;
          background: #f8fafc;
          color: #475569;
          border-radius: 999px;
          padding: 10px 13px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .filterButton.active {
          background: #111827;
          color: #ffffff;
          border-color: #111827;
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

        .tableWrap {
          overflow-x: auto;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1120px;
        }

        .table th {
          text-align: left;
          color: #64748b;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 12px 12px;
          background: #f8fafc;
          border-bottom: 1px solid #e5e7eb;
        }

        .table td {
          padding: 14px 12px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
          font-size: 13px;
          vertical-align: middle;
        }

        .table tr:last-child td {
          border-bottom: none;
        }

        .roteiroCell {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 260px;
        }

        .thumb {
          width: 62px;
          height: 62px;
          border-radius: 18px;
          background: #f1f5f9;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          font-weight: 950;
          flex: none;
        }

        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .strong {
          color: #111827;
          font-weight: 950;
          line-height: 1.35;
        }

        .muted {
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          margin-top: 3px;
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

        .rowActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
          min-width: 230px;
        }

        .cardsMobile {
          display: none;
          padding: 14px;
        }

        .mobileCard {
          border: 1px solid #eef2f7;
          background: #f8fafc;
          border-radius: 24px;
          padding: 14px;
          margin-bottom: 12px;
        }

        .mobileTop {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .mobileInfo {
          flex: 1;
          min-width: 0;
        }

        .mobileGrid {
          display: grid;
          gap: 6px;
          margin: 12px 0;
          color: #475569;
          font-size: 13px;
        }

        .empty {
          padding: 34px;
          text-align: center;
          color: #64748b;
          font-size: 14px;
        }

        @media (max-width: 1080px) {
          .statsGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .filters {
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

          .headerActions .btn {
            flex: 1;
          }

          .container {
            padding: 16px 12px 40px;
          }

          .hero {
            border-radius: 26px;
            padding: 22px;
          }

          .statsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .tableWrap {
            display: none;
          }

          .cardsMobile {
            display: block;
          }

          .brandLogo {
            height: 42px;
          }
        }

        @media (max-width: 460px) {
          .statsGrid {
            grid-template-columns: 1fr;
          }

          .heroTitle {
            font-size: 34px;
          }

          .filterButtons {
            display: grid;
            grid-template-columns: 1fr 1fr;
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
              <div className="brandSub">Controle de roteiros</div>
            </div>
          </div>

          <div className="headerActions">
            <button
              type="button"
              className="btn btn-light"
              onClick={() => router.push('/admin/dashboard')}
            >
              Dashboard
            </button>

            <button
              type="button"
              className="btn btn-dark"
              onClick={recarregar}
              disabled={atualizando}
            >
              {atualizando ? 'Atualizando...' : 'Atualizar'}
            </button>

            <button
              type="button"
              className="btn btn-green"
              onClick={() => router.push('/roteiros')}
            >
              Ver público
            </button>

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
          <div className="heroContent">
            <div className="eyebrow">Curadoria operacional</div>

            <h2 className="heroTitle">
              Controle total dos <span>roteiros.</span>
            </h2>

            <p className="heroText">
              Visualize todos os roteiros cadastrados pelos guias, aprove publicações,
              pause experiências, acompanhe preço, data, limite de pessoas, recorrência
              e status de publicação.
              {ultimaAtualizacao && (
                <>
                  <br />
                  Última atualização: {ultimaAtualizacao}.
                </>
              )}
            </p>
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
            onClick={() => setFiltroStatus('todos')}
          >
            <div className="statLabel">Total</div>
            <div className="statValue">{stats.total}</div>
          </article>

          <article
            className="statCard statGreen"
            onClick={() => setFiltroStatus('ativo')}
          >
            <div className="statLabel">Ativos</div>
            <div className="statValue">{stats.ativos}</div>
          </article>

          <article
            className="statCard statYellow"
            onClick={() => setFiltroStatus('pendente')}
          >
            <div className="statLabel">Pendentes</div>
            <div className="statValue">{stats.pendentes}</div>
          </article>

          <article
            className="statCard"
            onClick={() => setFiltroStatus('pausado')}
          >
            <div className="statLabel">Pausados</div>
            <div className="statValue">{stats.pausados}</div>
          </article>

          <article
            className="statCard statRed"
            onClick={() => setFiltroStatus('reprovado')}
          >
            <div className="statLabel">Reprovados</div>
            <div className="statValue">{stats.reprovados}</div>
          </article>
        </section>

        <section className="filters">
          <input
            className="searchInput"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por título, guia, local, dificuldade ou recorrência..."
          />

          <div className="filterButtons">
            {[
              ['todos', 'Todos'],
              ['ativo', 'Ativos'],
              ['pendente', 'Pendentes'],
              ['pausado', 'Pausados'],
              ['reprovado', 'Reprovados']
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`filterButton ${filtroStatus === value ? 'active' : ''}`}
                onClick={() => setFiltroStatus(value as any)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <h3 className="panelTitle">Roteiros cadastrados</h3>
              <div className="panelSub">
                Exibindo {roteirosFiltrados.length} de {roteiros.length} roteiro(s).
              </div>
            </div>
          </div>

          {roteirosFiltrados.length === 0 ? (
            <div className="empty">
              Nenhum roteiro encontrado. Se existem roteiros no Supabase e não aparecem aqui,
              confira se a tabela `roteiros` permite leitura para o usuário admin ou se o cadastro está salvando com outro status.
            </div>
          ) : (
            <>
              <div className="tableWrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Roteiro</th>
                      <th>Guia</th>
                      <th>Local</th>
                      <th>Data/Hora</th>
                      <th>Preço</th>
                      <th>Limite</th>
                      <th>Recorrência</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {roteirosFiltrados.map((roteiro) => {
                      const imagem = imagemRoteiro(roteiro)

                      return (
                        <tr key={roteiro.id}>
                          <td>
                            <div className="roteiroCell">
                              <div className="thumb">
                                {imagem ? (
                                  <img src={imagem} alt={tituloRoteiro(roteiro)} />
                                ) : (
                                  'RT'
                                )}
                              </div>

                              <div>
                                <div className="strong">
                                  {tituloRoteiro(roteiro)}
                                </div>

                                <div className="muted">
                                  {roteiro.dificuldade || 'Dificuldade não informada'}
                                  {roteiro.duracao_horas
                                    ? ` · ${roteiro.duracao_horas}h`
                                    : roteiro.duracao
                                      ? ` · ${roteiro.duracao}`
                                      : ''}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>{roteiro.guia_nome || 'Guia não identificado'}</td>

                          <td>{localRoteiro(roteiro)}</td>

                          <td>
                            {formatarData(dataRoteiro(roteiro))}
                            {horaRoteiro(roteiro) && (
                              <div className="muted">{horaRoteiro(roteiro)}</div>
                            )}
                          </td>

                          <td>
                            <span className="strong">
                              {formatarMoeda(precoRoteiro(roteiro))}
                            </span>
                          </td>

                          <td>{limitePessoas(roteiro)}</td>

                          <td>{recorrenciaRoteiro(roteiro)}</td>

                          <td>{badgeStatus(roteiro)}</td>

                          <td>
                            <div className="rowActions">
                              <button
                                type="button"
                                className="btn btn-green"
                                onClick={() => atualizarStatus(roteiro.id, 'ativo')}
                              >
                                Aprovar
                              </button>

                              <button
                                type="button"
                                className="btn btn-yellow"
                                onClick={() => atualizarStatus(roteiro.id, 'pausado')}
                              >
                                Pausar
                              </button>

                              <button
                                type="button"
                                className="btn btn-soft-red"
                                onClick={() => atualizarStatus(roteiro.id, 'reprovado')}
                              >
                                Reprovar
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="cardsMobile">
                {roteirosFiltrados.map((roteiro) => {
                  const imagem = imagemRoteiro(roteiro)

                  return (
                    <article className="mobileCard" key={roteiro.id}>
                      <div className="mobileTop">
                        <div className="thumb">
                          {imagem ? (
                            <img src={imagem} alt={tituloRoteiro(roteiro)} />
                          ) : (
                            'RT'
                          )}
                        </div>

                        <div className="mobileInfo">
                          <div className="strong">{tituloRoteiro(roteiro)}</div>
                          <div className="muted">
                            Guia: {roteiro.guia_nome || 'Guia não identificado'}
                          </div>
                          <div style={{ marginTop: 8 }}>
                            {badgeStatus(roteiro)}
                          </div>
                        </div>
                      </div>

                      <div className="mobileGrid">
                        <div><strong>Local:</strong> {localRoteiro(roteiro)}</div>
                        <div><strong>Data:</strong> {formatarData(dataRoteiro(roteiro))} {horaRoteiro(roteiro)}</div>
                        <div><strong>Preço:</strong> {formatarMoeda(precoRoteiro(roteiro))}</div>
                        <div><strong>Limite:</strong> {limitePessoas(roteiro)}</div>
                        <div><strong>Recorrência:</strong> {recorrenciaRoteiro(roteiro)}</div>
                      </div>

                      <div className="rowActions">
                        <button
                          type="button"
                          className="btn btn-green"
                          onClick={() => atualizarStatus(roteiro.id, 'ativo')}
                        >
                          Aprovar
                        </button>

                        <button
                          type="button"
                          className="btn btn-yellow"
                          onClick={() => atualizarStatus(roteiro.id, 'pausado')}
                        >
                          Pausar
                        </button>

                        <button
                          type="button"
                          className="btn btn-soft-red"
                          onClick={() => atualizarStatus(roteiro.id, 'reprovado')}
                        >
                          Reprovar
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}