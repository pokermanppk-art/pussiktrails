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

type GrupoRoteiro = {
  id: string
  roteiro_id?: string | null
  guia_id?: string | null
  titulo?: string | null
  descricao?: string | null
  aviso_fixado?: string | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type Roteiro = {
  id: string
  titulo?: string | null
  nome?: string | null
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
  status?: string | null
  preco?: number | null
  valor?: number | null
}

type GrupoMembro = {
  id: string
  grupo_id: string
  user_id: string
  papel?: string | null
  status?: string | null
  entrou_em?: string | null
}

type GrupoMensagem = {
  id: string
  grupo_id: string
  user_id?: string | null
  mensagem: string
  tipo?: string | null
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

type Reserva = {
  id: string
  roteiro_id?: string | null
  status?: string | null
  pagamento_status?: string | null
  quantidade_pessoas?: number | null
  valor_total?: number | null
  created_at?: string | null
}

type GrupoCompleto = GrupoRoteiro & {
  roteiro?: Roteiro | null
  membros_count: number
  clientes_count: number
  mensagens_count: number
  notificacoes_nao_lidas: number
  reservas_confirmadas: number
  pessoas_confirmadas: number
  valor_confirmado: number
  ultima_mensagem?: GrupoMensagem | null
}

type Stats = {
  totalGrupos: number
  gruposAtivos: number
  clientesConfirmados: number
  reservasConfirmadas: number
  notificacoesNaoLidas: number
}

const statsInicial: Stats = {
  totalGrupos: 0,
  gruposAtivos: 0,
  clientesConfirmados: 0,
  reservasConfirmadas: 0,
  notificacoesNaoLidas: 0
}

export default function GuiaGruposPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [grupos, setGrupos] = useState<GrupoCompleto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativo' | 'encerrado' | 'arquivado'>('todos')
  const [stats, setStats] = useState<Stats>(statsInicial)
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

      if (parsedUser.tipo !== 'guia') {
        router.replace('/login')
        return
      }

      setUser(parsedUser)
      await carregarGrupos(parsedUser.id)
    } catch (error) {
      console.error('Erro ao iniciar grupos do guia:', error)
      setErro('Não foi possível carregar seus grupos agora.')
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

  const nomeUsuario = (usuario?: UsuarioLocal | null) => {
    return usuario?.nome || usuario?.name || usuario?.email || 'Guia'
  }

  const primeiroNome = (valor?: string | null) => {
    const nome = String(valor || 'Guia').trim()
    return nome.split(' ')[0] || 'Guia'
  }

  const tituloRoteiro = (item?: Roteiro | null) => {
    return item?.titulo || item?.nome || 'Roteiro'
  }

  const imagemRoteiro = (item?: Roteiro | null) => {
    return item?.foto_capa || item?.foto_url || item?.imagem_url || item?.imagem || ''
  }

  const localRoteiro = (item?: Roteiro | null) => {
    return (
      item?.local ||
      item?.localizacao ||
      item?.local_encontro ||
      item?.ponto_encontro ||
      'Local a confirmar'
    )
  }

  const dataRoteiro = (item?: Roteiro | null) => {
    return item?.data_roteiro || item?.data_saida || item?.data || null
  }

  const horaRoteiro = (item?: Roteiro | null) => {
    return item?.hora_roteiro || item?.hora_saida || item?.hora || ''
  }

  const formatarData = (valor?: string | null) => {
    if (!valor) return '-'

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return valor

    return data.toLocaleDateString('pt-BR')
  }

  const formatarHora = (valor?: string | null) => {
    if (!valor) return ''

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return ''

    return data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatarMoeda = (valor: any) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(valor || 0))
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

  const carregarGrupos = async (guiaId: string) => {
    setErro('')
    setMensagem('')

    const { data: gruposData, error: gruposError } = await supabase
      .from('grupos_roteiros')
      .select('*')
      .eq('guia_id', guiaId)
      .order('created_at', { ascending: false })

    if (gruposError) {
      console.error('Erro ao buscar grupos do guia:', gruposError)
      setErro('Não foi possível buscar os grupos dos seus roteiros.')
      setGrupos([])
      setStats(statsInicial)
      return
    }

    const gruposBase = (gruposData || []) as GrupoRoteiro[]

    if (gruposBase.length === 0) {
      setGrupos([])
      setStats(statsInicial)
      setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
      return
    }

    const grupoIds = gruposBase.map((grupo) => grupo.id)
    const roteiroIds = Array.from(
      new Set(
        gruposBase
          .map((grupo) => grupo.roteiro_id)
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

    let membros: GrupoMembro[] = []

    const { data: membrosData, error: membrosError } = await supabase
      .from('grupo_membros')
      .select('*')
      .in('grupo_id', grupoIds)
      .eq('status', 'ativo')

    if (!membrosError) {
      membros = (membrosData || []) as GrupoMembro[]
    }

    let mensagens: GrupoMensagem[] = []

    const { data: mensagensData, error: mensagensError } = await supabase
      .from('grupo_mensagens')
      .select('*')
      .in('grupo_id', grupoIds)
      .eq('status', 'ativa')
      .order('created_at', { ascending: false })
      .limit(200)

    if (!mensagensError) {
      mensagens = (mensagensData || []) as GrupoMensagem[]
    }

    let notificacoes: GrupoNotificacao[] = []

    const { data: notificacoesData, error: notificacoesError } = await supabase
      .from('grupo_notificacoes')
      .select('*')
      .in('grupo_id', grupoIds)
      .eq('user_id_destino', guiaId)
      .eq('lida', false)

    if (!notificacoesError) {
      notificacoes = (notificacoesData || []) as GrupoNotificacao[]
    }

    let reservas: Reserva[] = []

    if (roteiroIds.length > 0) {
      const { data: reservasData, error: reservasError } = await supabase
        .from('reservas')
        .select('*')
        .in('roteiro_id', roteiroIds)

      if (!reservasError) {
        reservas = (reservasData || []) as Reserva[]
      }
    }

    const gruposCompletos: GrupoCompleto[] = gruposBase.map((grupo) => {
      const roteiro =
        roteiros.find((item) => item.id === grupo.roteiro_id) ||
        null

      const membrosGrupo = membros.filter((membro) => membro.grupo_id === grupo.id)
      const clientesGrupo = membrosGrupo.filter((membro) => membro.papel === 'cliente')
      const mensagensGrupo = mensagens.filter((mensagem) => mensagem.grupo_id === grupo.id)
      const notificacoesGrupo = notificacoes.filter((notificacao) => notificacao.grupo_id === grupo.id)

      const reservasGrupo = reservas.filter(
        (reserva) => reserva.roteiro_id && reserva.roteiro_id === grupo.roteiro_id
      )

      const reservasConfirmadas = reservasGrupo.filter(pagamentoConfirmado)

      const pessoasConfirmadas = reservasConfirmadas.reduce(
        (total, reserva) => total + Number(reserva.quantidade_pessoas || 0),
        0
      )

      const valorConfirmado = reservasConfirmadas.reduce(
        (total, reserva) => total + Number(reserva.valor_total || 0),
        0
      )

      const ultimaMensagem = mensagensGrupo.sort((a, b) => {
        const dataA = new Date(a.created_at || '').getTime()
        const dataB = new Date(b.created_at || '').getTime()

        return (Number.isNaN(dataB) ? 0 : dataB) - (Number.isNaN(dataA) ? 0 : dataA)
      })[0] || null

      return {
        ...grupo,
        roteiro,
        membros_count: membrosGrupo.length,
        clientes_count: clientesGrupo.length,
        mensagens_count: mensagensGrupo.length,
        notificacoes_nao_lidas: notificacoesGrupo.length,
        reservas_confirmadas: reservasConfirmadas.length,
        pessoas_confirmadas: pessoasConfirmadas,
        valor_confirmado: valorConfirmado,
        ultima_mensagem: ultimaMensagem
      }
    })

    const totalClientes = gruposCompletos.reduce(
      (total, grupo) => total + grupo.clientes_count,
      0
    )

    const totalReservasConfirmadas = gruposCompletos.reduce(
      (total, grupo) => total + grupo.reservas_confirmadas,
      0
    )

    const totalNotificacoes = gruposCompletos.reduce(
      (total, grupo) => total + grupo.notificacoes_nao_lidas,
      0
    )

    setGrupos(gruposCompletos)
    setStats({
      totalGrupos: gruposCompletos.length,
      gruposAtivos: gruposCompletos.filter((grupo) => normalizar(grupo.status) === 'ativo').length,
      clientesConfirmados: totalClientes,
      reservasConfirmadas: totalReservasConfirmadas,
      notificacoesNaoLidas: totalNotificacoes
    })
    setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
  }

  const atualizar = async () => {
    if (!user?.id) return

    setAtualizando(true)

    try {
      await carregarGrupos(user.id)
      setMensagem('Grupos atualizados.')
    } finally {
      setAtualizando(false)
    }
  }

  const abrirGrupo = (grupo: GrupoCompleto) => {
    router.push(`/guia/grupos/${grupo.id}`)
  }

  const badgeStatus = (status?: string | null) => {
    const valor = normalizar(status)

    if (valor === 'ativo') {
      return <span className="badge badge-green">Ativo</span>
    }

    if (valor === 'encerrado') {
      return <span className="badge badge-yellow">Encerrado</span>
    }

    if (valor === 'arquivado') {
      return <span className="badge badge-neutral">Arquivado</span>
    }

    return <span className="badge badge-neutral">Grupo</span>
  }

  const gruposFiltrados = useMemo(() => {
    const termo = normalizar(busca)

    return grupos.filter((grupo) => {
      const texto = normalizar(
        [
          grupo.titulo,
          grupo.descricao,
          tituloRoteiro(grupo.roteiro),
          localRoteiro(grupo.roteiro),
          grupo.ultima_mensagem?.mensagem
        ].join(' ')
      )

      const passaBusca = termo ? texto.includes(termo) : true

      const passaStatus =
        filtroStatus === 'todos'
          ? true
          : normalizar(grupo.status) === filtroStatus

      return passaBusca && passaStatus
    })
  }, [grupos, busca, filtroStatus])

  if (carregando) {
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
          <div>Carregando grupos dos roteiros...</div>
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

        .iconBtn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.10);
        }

        .iconBtn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .iconBtn.primary {
          background: #172018;
          color: #ffffff;
          border-color: #172018;
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
          min-height: 320px;
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
          grid-template-columns: minmax(0, 1fr) 290px;
          gap: 24px;
          align-items: end;
          min-height: 250px;
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
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .statCard {
          background: rgba(255,255,255,0.86);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 28px;
          padding: 16px;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
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
          display: grid;
          grid-template-columns: minmax(0, 1fr) 190px;
          gap: 10px;
          margin-bottom: 16px;
        }

        .input,
        .select {
          width: 100%;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: #fffdf7;
          border-radius: 999px;
          padding: 13px 15px;
          font-size: 13px;
          color: #172018;
          outline: none;
          font-weight: 800;
        }

        .input:focus,
        .select:focus {
          border-color: #84cc16;
          box-shadow: 0 0 0 4px rgba(132, 204, 22, 0.12);
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .groupCard {
          background: rgba(255,255,255,0.90);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 32px;
          overflow: hidden;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.07);
          transition: 0.2s ease;
          cursor: pointer;
        }

        .groupCard:hover {
          transform: translateY(-3px);
          box-shadow: 0 22px 46px rgba(15, 23, 42, 0.12);
        }

        .imageBox {
          height: 205px;
          background:
            radial-gradient(circle at top right, rgba(251, 146, 60, 0.20), transparent 38%),
            linear-gradient(135deg, #dbe7c8, #aebf8d);
          position: relative;
          overflow: hidden;
        }

        .imageBox img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .imageOverlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.44), transparent 55%);
        }

        .topPill {
          position: absolute;
          top: 14px;
          left: 14px;
          z-index: 2;
        }

        .notificationPill {
          position: absolute;
          right: 14px;
          top: 14px;
          z-index: 2;
          background: #dc2626;
          color: #ffffff;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 11px;
          font-weight: 950;
        }

        .datePill {
          position: absolute;
          right: 14px;
          bottom: 14px;
          background: rgba(255,255,255,0.92);
          color: #172018;
          border-radius: 18px;
          padding: 9px 11px;
          font-size: 12px;
          font-weight: 950;
          z-index: 2;
          text-align: center;
          min-width: 72px;
        }

        .cardBody {
          padding: 17px;
        }

        .cardTitle {
          color: #172018;
          font-size: 20px;
          line-height: 1.12;
          font-weight: 950;
          letter-spacing: -0.045em;
          margin: 0;
        }

        .meta {
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 760;
          margin-top: 8px;
        }

        .groupStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin-top: 14px;
        }

        .miniStat {
          background: #fffdf7;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 18px;
          padding: 10px;
          text-align: center;
        }

        .miniValue {
          color: #172018;
          font-size: 18px;
          font-weight: 950;
          letter-spacing: -0.05em;
        }

        .miniLabel {
          color: #64748b;
          font-size: 10px;
          font-weight: 850;
          margin-top: 2px;
        }

        .lastMessage {
          margin-top: 14px;
          background: #f6f7f1;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 20px;
          padding: 12px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 700;
        }

        .cardFooter {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 15px;
          flex-wrap: wrap;
        }

        .valueText {
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

        .badge-neutral {
          background: #f1f5f9;
          color: #475569;
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
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .grid {
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

          .statsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .toolbar {
            grid-template-columns: 1fr;
          }

          .groupStats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 480px) {
          .heroTitle {
            font-size: 40px;
          }

          .brand img {
            height: 38px;
          }

          .statsGrid {
            grid-template-columns: 1fr;
          }

          .imageBox {
            height: 190px;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <div
            className="brand"
            onClick={() => router.push('/guia/dashboard')}
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />

            <div>
              <div className="brandTitle">PrussikTrails</div>
              <div className="brandSub">Grupos dos roteiros</div>
            </div>
          </div>

          <div className="headerActions">
            <button
              type="button"
              className="iconBtn hideMobile"
              onClick={() => router.push('/guia/dashboard')}
            >
              Dashboard
            </button>

            <button
              type="button"
              className="iconBtn hideMobile"
              onClick={atualizar}
              disabled={atualizando}
            >
              {atualizando ? '…' : 'Atualizar'}
            </button>

            <button
              type="button"
              className="iconBtn primary"
              onClick={() => router.push('/guia/roteiros/novo')}
            >
              Novo roteiro
            </button>

            <button
              type="button"
              className="iconBtn"
              onClick={() => router.push('/guia/perfil')}
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
              <div className="eyebrow">Comunidade dos roteiros</div>

              <h1 className="heroTitle">
                {primeiroNome(nomeUsuario(user))}, seus grupos são onde a <span>experiência começa.</span>
              </h1>

              <p className="heroText">
                Acompanhe os grupos internos dos seus roteiros, veja participantes confirmados,
                mensagens recentes, notificações e reservas vinculadas a cada experiência.
                {ultimaAtualizacao && (
                  <>
                    <br />
                    Atualizado às {ultimaAtualizacao}.
                  </>
                )}
              </p>
            </div>

            <aside className="heroCard">
              <div className="heroCardLabel">Grupos ativos</div>
              <div className="heroCardValue">{stats.gruposAtivos}</div>
              <div className="heroCardText">
                Clientes só entram nos grupos após pagamento confirmado.
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
          <article className="statCard">
            <div className="statValue">{stats.totalGrupos}</div>
            <div className="statLabel">grupos criados</div>
          </article>

          <article className="statCard">
            <div className="statValue">{stats.gruposAtivos}</div>
            <div className="statLabel">grupos ativos</div>
          </article>

          <article className="statCard">
            <div className="statValue">{stats.clientesConfirmados}</div>
            <div className="statLabel">clientes nos grupos</div>
          </article>

          <article className="statCard">
            <div className="statValue">{stats.reservasConfirmadas}</div>
            <div className="statLabel">reservas confirmadas</div>
          </article>

          <article className="statCard">
            <div className="statValue">{stats.notificacoesNaoLidas}</div>
            <div className="statLabel">avisos não lidos</div>
          </article>
        </section>

        <section className="toolbar">
          <input
            className="input"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por roteiro, grupo, local ou mensagem..."
          />

          <select
            className="select"
            value={filtroStatus}
            onChange={(event) => setFiltroStatus(event.target.value as any)}
          >
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativos</option>
            <option value="encerrado">Encerrados</option>
            <option value="arquivado">Arquivados</option>
          </select>
        </section>

        {gruposFiltrados.length === 0 ? (
          <div className="empty">
            Nenhum grupo encontrado. Ao criar um roteiro, o grupo interno será criado automaticamente.
          </div>
        ) : (
          <section className="grid">
            {gruposFiltrados.map((grupo) => {
              const foto = imagemRoteiro(grupo.roteiro)

              return (
                <article
                  className="groupCard"
                  key={grupo.id}
                  onClick={() => abrirGrupo(grupo)}
                >
                  <div className="imageBox">
                    {foto && (
                      <img src={foto} alt={tituloRoteiro(grupo.roteiro)} />
                    )}

                    <div className="imageOverlay" />

                    <div className="topPill">
                      {badgeStatus(grupo.status)}
                    </div>

                    {grupo.notificacoes_nao_lidas > 0 && (
                      <div className="notificationPill">
                        {grupo.notificacoes_nao_lidas} novo(s)
                      </div>
                    )}

                    <div className="datePill">
                      {formatarData(dataRoteiro(grupo.roteiro))}
                      {horaRoteiro(grupo.roteiro) && (
                        <div style={{ fontSize: 10, marginTop: 2 }}>
                          {horaRoteiro(grupo.roteiro)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="cardBody">
                    <h2 className="cardTitle">
                      {tituloRoteiro(grupo.roteiro)}
                    </h2>

                    <div className="meta">
                      {grupo.titulo || 'Grupo do roteiro'}
                      <br />
                      {localRoteiro(grupo.roteiro)}
                    </div>

                    <div className="groupStats">
                      <div className="miniStat">
                        <div className="miniValue">{grupo.clientes_count}</div>
                        <div className="miniLabel">clientes</div>
                      </div>

                      <div className="miniStat">
                        <div className="miniValue">{grupo.mensagens_count}</div>
                        <div className="miniLabel">msgs</div>
                      </div>

                      <div className="miniStat">
                        <div className="miniValue">{grupo.reservas_confirmadas}</div>
                        <div className="miniLabel">reservas</div>
                      </div>

                      <div className="miniStat">
                        <div className="miniValue">{grupo.pessoas_confirmadas}</div>
                        <div className="miniLabel">pessoas</div>
                      </div>
                    </div>

                    <div className="lastMessage">
                      {grupo.ultima_mensagem
                        ? (
                          <>
                            <strong>Última mensagem:</strong>{' '}
                            {grupo.ultima_mensagem.mensagem.slice(0, 110)}
                            {grupo.ultima_mensagem.mensagem.length > 110 ? '...' : ''}
                            <br />
                            <span>{tempoRelativo(grupo.ultima_mensagem.created_at)}</span>
                          </>
                        )
                        : 'Nenhuma mensagem enviada ainda.'}
                    </div>

                    <div className="cardFooter">
                      <span className="valueText">
                        {formatarMoeda(grupo.valor_confirmado)}
                      </span>

                      <button
                        type="button"
                        className="iconBtn primary"
                        onClick={(event) => {
                          event.stopPropagation()
                          abrirGrupo(grupo)
                        }}
                      >
                        Administrar
                      </button>
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