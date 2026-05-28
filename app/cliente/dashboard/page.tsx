'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type UsuarioLocal = {
  id: string
  nome?: string | null
  email?: string | null
  tipo?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
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
  hot_score?: number
  hot_reservas?: number
  hot_confirmadas?: number
}

type Notificacao = {
  id: string
  titulo: string
  texto: string
  destino?: string
  emoji: string
  tipo: 'all' | 'com'
  created_at?: string | null
}

type Medalha = {
  id?: string
  codigo?: string | null
  nome?: string | null
  descricao?: string | null
  categoria?: string | null
  nivel?: string | null
  icone?: string | null
  cor?: string | null
  especial?: boolean | null
  ordem?: number | null
}

type MedalhaUsuario = {
  id: string
  usuario_id?: string | null
  medalha_id?: string | null
  status?: string | null
  progresso_atual?: number | null
  progresso_total?: number | null
  conquistada_em?: string | null
  medalhas?: Medalha | Medalha[] | null
}


type TierJornada = {
  key: string
  titulo: string
  nome: string
  km: number
  svg: string
  cor: string
}

const METAS_JORNADA: TierJornada[] = [
  {
    key: 'mochila_partida',
    nome: 'Partida',
    titulo: 'Mochila de Partida',
    km: 0,
    svg: '/medalhas/progressao/01_mochila_de_partida.svg',
    cor: '#8b5e34'
  },
  {
    key: 'barraca_base',
    nome: 'Base',
    titulo: 'Barraca Base',
    km: 32,
    svg: '/medalhas/progressao/02_barraca_base.svg',
    cor: '#64748b'
  },
  {
    key: 'fogueira_jornada',
    nome: 'Fogueira',
    titulo: 'Fogueira da Jornada',
    km: 96,
    svg: '/medalhas/progressao/03_fogueira_da_jornada.svg',
    cor: '#b45309'
  },
  {
    key: 'lanterna_serra',
    nome: 'Lanterna',
    titulo: 'Lanterna da Serra',
    km: 192,
    svg: '/medalhas/progressao/04_lanterna_da_serra.svg',
    cor: '#365314'
  },
  {
    key: 'placa_trilha',
    nome: 'Rumo',
    titulo: 'Rumo Certo',
    km: 384,
    svg: '/medalhas/progressao/05_rumo_certo.svg',
    cor: '#3f6212'
  },
  {
    key: 'corda_prussik',
    nome: 'Prussik',
    titulo: 'Corda Prussik',
    km: 768,
    svg: '/medalhas/progressao/06_prussik.svg',
    cor: '#334155'
  },
  {
    key: 'cachoeira_viva',
    nome: 'Cachoeira',
    titulo: 'Cachoeira Viva',
    km: 1152,
    svg: '/medalhas/progressao/07_cachoeira_viva.svg',
    cor: '#0f766e'
  },
  {
    key: 'amanhecer_cume',
    nome: 'Cume',
    titulo: 'Amanhecer no Cume',
    km: 1920,
    svg: '/medalhas/progressao/08_amanhecer_no_cume.svg',
    cor: '#ca8a04'
  },
  {
    key: 'mirante_explorador',
    nome: 'Mirante',
    titulo: 'Mirante do Explorador',
    km: 3840,
    svg: '/medalhas/progressao/09_mirante_do_explorador.svg',
    cor: '#111827'
  },
  {
    key: 'mapa_lendario',
    nome: 'Lenda',
    titulo: 'Mapa Lendário',
    km: 7680,
    svg: '/medalhas/progressao/10_mapa_lendario.svg',
    cor: '#0f172a'
  }
]

const BETA_MEDALHAS_SVG: Record<string, string> = {
  inicio_jornada_beta: '/medalhas/iniciais_jornada/01_botinha_beta_oficial.svg',
  primeiros_passos: '/medalhas/iniciais_jornada/01_botinha_beta_oficial.svg',
  botinha_beta_oficial: '/medalhas/iniciais_jornada/01_botinha_beta_oficial.svg',
  aventureiro_pioneiro_beta: '/medalhas/iniciais_jornada/02_aventureiro_pioneiro_beta.svg',
  voz_da_trilha_beta: '/medalhas/iniciais_jornada/03_voz_da_trilha_beta.svg',
  guia_pioneiro_beta: '/medalhas/iniciais_jornada/04_guia_pioneiro_beta.svg',
  construtor_da_jornada_beta: '/medalhas/iniciais_jornada/05_construtor_da_jornada_beta.svg',
  construtor_da_trilha_beta: '/medalhas/iniciais_jornada/05_construtor_da_jornada_beta.svg'
}

function normalizarChaveMedalha(valor?: string | null) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function obterSvgMedalhaBeta(medalha?: Medalha | null) {
  const codigo = normalizarChaveMedalha(medalha?.codigo)
  const nome = normalizarChaveMedalha(medalha?.nome)

  if (BETA_MEDALHAS_SVG[codigo]) return BETA_MEDALHAS_SVG[codigo]
  if (BETA_MEDALHAS_SVG[nome]) return BETA_MEDALHAS_SVG[nome]

  if (nome.includes('inicio') && nome.includes('beta')) return BETA_MEDALHAS_SVG.inicio_jornada_beta
  if (nome.includes('botinha') && nome.includes('beta')) return BETA_MEDALHAS_SVG.botinha_beta_oficial
  if (nome.includes('aventureiro') && nome.includes('pioneiro') && nome.includes('beta')) return BETA_MEDALHAS_SVG.aventureiro_pioneiro_beta
  if (nome.includes('voz') && nome.includes('trilha') && nome.includes('beta')) return BETA_MEDALHAS_SVG.voz_da_trilha_beta
  if (nome.includes('guia') && nome.includes('pioneiro') && nome.includes('beta')) return BETA_MEDALHAS_SVG.guia_pioneiro_beta
  if (nome.includes('construtor') && nome.includes('beta')) return BETA_MEDALHAS_SVG.construtor_da_jornada_beta

  return ''
}

function obterFallbackSvgMedalhaBeta(svg: string) {
  if (!svg.startsWith('/medalhas/iniciais_jornada/')) return ''
  return svg.replace('/medalhas/iniciais_jornada/', '/medalhas/prussik_svg_pack/iniciais_jornada/')
}

type IconeNome =
  | 'reservas'
  | 'explorar'
  | 'perfil'
  | 'pagamentos'
  | 'roteiro'
  | 'medalha'
  | 'curtida'
  | 'reserva'
  | 'comunidade'
  | 'check'

function IconeDashboard({ name }: { name: IconeNome }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  if (name === 'reservas') {
    return (
      <svg {...common}>
        <path d="M6.7 8.2h10.6l1 10.3a2 2 0 0 1-2 2.2H7.7a2 2 0 0 1-2-2.2l1-10.3Z" />
        <path d="M9 8.2V6.6a3 3 0 0 1 6 0v1.6" />
        <path d="M9.6 12.4h4.8" />
        <path d="M9.6 15.8h3.1" />
      </svg>
    )
  }

  if (name === 'explorar') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="m15.4 8.6-2.2 5.1-5.1 2.2 2.2-5.1 5.1-2.2Z" />
        <path d="M12 2.8v1.7M12 19.5v1.7M2.8 12h1.7M19.5 12h1.7" />
      </svg>
    )
  }

  if (name === 'perfil') {
    return (
      <svg {...common}>
        <path d="M12 12.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Z" />
        <path d="M4.8 20.2a7.4 7.4 0 0 1 14.4 0" />
        <path d="M17.5 5.4l1.2 1.2 2-2" />
      </svg>
    )
  }

  if (name === 'pagamentos') {
    return (
      <svg {...common}>
        <rect x="3.4" y="5.3" width="17.2" height="13.4" rx="3" />
        <path d="M3.8 9.1h16.4" />
        <path d="M7.1 14.9h4.1" />
        <path d="m15.3 14.6 1.2 1.2 2.3-2.6" />
      </svg>
    )
  }

  if (name === 'roteiro') {
    return (
      <svg {...common}>
        <path d="M4.4 18.7 8.8 5.3l4.2 13.4 2.7-8.3 3.9 8.3" />
        <path d="M7.1 14.6h4.8" />
        <path d="M14.2 14.6h2.9" />
      </svg>
    )
  }

  if (name === 'medalha') {
    return (
      <svg {...common}>
        <path d="M8.2 3.5 12 8.1l3.8-4.6" />
        <path d="M8.2 3.5h7.6" />
        <circle cx="12" cy="14.2" r="5.2" />
        <path d="m12 11.7.8 1.6 1.8.3-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.3.8-1.6Z" />
      </svg>
    )
  }

  if (name === 'curtida') {
    return (
      <svg {...common}>
        <path d="M20.2 8.7c0 5-8.2 9.6-8.2 9.6S3.8 13.7 3.8 8.7a4.4 4.4 0 0 1 7.9-2.6 4.4 4.4 0 0 1 8.5 2.6Z" />
      </svg>
    )
  }

  if (name === 'reserva') {
    return (
      <svg {...common}>
        <path d="M7.2 3.8v3.1M16.8 3.8v3.1" />
        <rect x="4.2" y="5.4" width="15.6" height="15" rx="3" />
        <path d="M4.6 9.2h14.8" />
        <path d="m8.2 14.4 2.1 2.1 5-5" />
      </svg>
    )
  }

  if (name === 'check') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.7" />
        <path d="m8.5 12.4 2.2 2.2 4.9-5.2" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M12 4.4v15.2" />
      <path d="M4.4 12h15.2" />
      <path d="M6.6 6.6 17.4 17.4" />
      <path d="M17.4 6.6 6.6 17.4" />
      <circle cx="12" cy="12" r="8.5" />
    </svg>
  )
}


const statsInicial: Stats = {
  totalKm: 0,
  totalTrilhas: 0,
  reservasPendentes: 0,
  reservasConfirmadas: 0,
  reservasRealizadas: 0,
  totalMedalhas: 0,
  ultimaAtividade: 'Sem histórico'
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
  const [roteirosQuentes, setRoteirosQuentes] = useState<Roteiro[]>([])
  const [proximasReservas, setProximasReservas] = useState<Reserva[]>([])
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [abaNotificacao, setAbaNotificacao] = useState<'all' | 'com'>(() => {
    if (typeof window === 'undefined') return 'all'

    const salva = window.localStorage.getItem('cliente_dashboard_notificacoes_aba')
    return salva === 'com' ? 'com' : 'all'
  })
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('')
  const [medalhasConquistadas, setMedalhasConquistadas] = useState<MedalhaUsuario[]>([])
  const [proximaMedalha, setProximaMedalha] = useState<MedalhaUsuario | null>(null)

  useEffect(() => {
    if (iniciouRef.current) return

    iniciouRef.current = true
    iniciarDashboard()
  }, [])

  useEffect(() => {
    if (!user?.id) return

    const interval = setInterval(() => {
      reconciliarPagamentosPendentes(true)
    }, 24000)

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

      let usuarioAtualizado = parsedUser

      try {
        const { data: perfilCliente } = await supabase
          .from('users')
          .select('nome, avatar_url, foto_url, imagem_url')
          .eq('id', parsedUser.id)
          .maybeSingle()

        if (perfilCliente) {
          usuarioAtualizado = {
            ...parsedUser,
            nome: perfilCliente.nome || parsedUser.nome,
            avatar_url: perfilCliente.avatar_url || parsedUser.avatar_url || null,
            foto_url: perfilCliente.foto_url || parsedUser.foto_url || null,
            imagem_url: perfilCliente.imagem_url || parsedUser.imagem_url || null,
          }

          localStorage.setItem('user', JSON.stringify(usuarioAtualizado))
        }
      } catch (error) {
        console.warn('Não foi possível sincronizar avatar do cliente:', error)
      }

      setUser(usuarioAtualizado)

      await carregarDados(usuarioAtualizado.id)
      await reconciliarPagamentosPendentesInterno(usuarioAtualizado.id, true)
      await carregarDados(usuarioAtualizado.id)
    } catch (error) {
      console.error('Erro ao iniciar dashboard do cliente:', error)
      setMensagem('Não foi possível carregar sua área agora.')
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

  const primeiroNome = (nome?: string | null) => {
    const texto = String(nome || 'aventureiro').trim()

    if (!texto) return 'aventureiro'

    return texto.split(' ')[0]
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

  const medalhaRelacionada = (item: MedalhaUsuario): Medalha | null => {
    if (Array.isArray(item.medalhas)) {
      return item.medalhas[0] || null
    }

    return item.medalhas || null
  }

  const progressoPercentual = (item: MedalhaUsuario) => {
    const atual = Number(item.progresso_atual || 0)
    const total = Number(item.progresso_total || 1)

    if (!total || total <= 0) return 0

    return Math.min(100, Math.max(0, Math.round((atual / total) * 100)))
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

  const buscarRoteirosAtivos = async () => {
    const { data, error } = await supabase
      .from('roteiros')
      .select('*')
      .eq('status', 'ativo')
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      console.warn('Erro ao buscar roteiros ativos:', error)
      return []
    }

    return (data || []) as Roteiro[]
  }

  const carregarRoteirosQuentes = async () => {
    try {
      const roteirosAtivos = await buscarRoteirosAtivos()

      if (roteirosAtivos.length === 0) {
        setRoteirosQuentes([])
        return
      }

      const roteiroIds = roteirosAtivos.map((roteiro: Roteiro) => roteiro.id)

      const { data: reservasData, error: reservasError } = await supabase
        .from('reservas')
        .select('id, roteiro_id, status, pagamento_status, created_at')
        .in('roteiro_id', roteiroIds)
        .order('created_at', { ascending: false })

      if (reservasError) {
        console.warn('Erro ao buscar reservas para roteiros quentes:', reservasError)

        setRoteirosQuentes(
          roteirosAtivos.slice(0, 5).map((roteiro: Roteiro) => ({
            ...roteiro,
            hot_score: 0,
            hot_reservas: 0,
            hot_confirmadas: 0
          }))
        )

        return
      }

      const reservas = (reservasData || []) as Reserva[]
      const agora = Date.now()
      const trintaDias = 1000 * 60 * 60 * 24 * 30

      const mapa = new Map<
        string,
        {
          score: number
          total: number
          confirmadas: number
        }
      >()

      reservas.forEach((reserva: Reserva) => {
        if (!reserva.roteiro_id) return
        if (reservaCancelada(reserva)) return

        const atual = mapa.get(reserva.roteiro_id) || {
          score: 0,
          total: 0,
          confirmadas: 0
        }

        atual.total += 1

        if (pagamentoConfirmado(reserva)) {
          atual.score += 8
          atual.confirmadas += 1
        } else {
          atual.score += 3
        }

        const data = new Date(reserva.created_at || '').getTime()

        if (!Number.isNaN(data)) {
          const idade = agora - data

          if (idade <= trintaDias) atual.score += 4
          if (idade <= trintaDias / 2) atual.score += 2
        }

        mapa.set(reserva.roteiro_id, atual)
      })

      const ordenados = roteirosAtivos
        .map((roteiro: Roteiro) => {
          const info = mapa.get(roteiro.id) || {
            score: 0,
            total: 0,
            confirmadas: 0
          }

          return {
            ...roteiro,
            hot_score: info.score,
            hot_reservas: info.total,
            hot_confirmadas: info.confirmadas
          }
        })
        .sort((a: Roteiro, b: Roteiro) => {
          if (Number(b.hot_score || 0) !== Number(a.hot_score || 0)) {
            return Number(b.hot_score || 0) - Number(a.hot_score || 0)
          }

          const dataA = new Date(a.created_at || '').getTime()
          const dataB = new Date(b.created_at || '').getTime()

          return (Number.isNaN(dataB) ? 0 : dataB) - (Number.isNaN(dataA) ? 0 : dataA)
        })
        .slice(0, 5)

      setRoteirosQuentes(ordenados)
    } catch (error) {
      console.warn('Erro inesperado ao carregar roteiros quentes:', error)
      setRoteirosQuentes([])
    }
  }

  const carregarMedalhas = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios_medalhas')
        .select(`
          id,
          usuario_id,
          medalha_id,
          status,
          progresso_atual,
          progresso_total,
          conquistada_em,
          medalhas (
            id,
            codigo,
            nome,
            descricao,
            categoria,
            nivel,
            icone,
            cor,
            especial,
            ordem
          )
        `)
        .eq('usuario_id', userId)
        .limit(80)

      if (error) {
        console.warn('Erro ao buscar medalhas do cliente:', error)
        setMedalhasConquistadas([])
        setProximaMedalha(null)
        return 0
      }

      const lista = (data || []) as MedalhaUsuario[]

      const conquistadas = lista
        .filter((item: MedalhaUsuario) => normalizar(item.status) === 'conquistada')
        .sort((a: MedalhaUsuario, b: MedalhaUsuario) => {
          const medalhaA = medalhaRelacionada(a)
          const medalhaB = medalhaRelacionada(b)

          return Number(medalhaA?.ordem || 0) - Number(medalhaB?.ordem || 0)
        })

      const proxima =
        lista
          .filter((item: MedalhaUsuario) => normalizar(item.status) !== 'conquistada')
          .sort((a: MedalhaUsuario, b: MedalhaUsuario) => progressoPercentual(b) - progressoPercentual(a))[0] || null

      setMedalhasConquistadas(conquistadas)
      setProximaMedalha(proxima)

      return conquistadas.length
    } catch (error) {
      console.warn('Erro inesperado ao carregar medalhas:', error)
      setMedalhasConquistadas([])
      setProximaMedalha(null)
      return 0
    }
  }

  const carregarDados = async (userId: string) => {
    try {
      const reservasBase = await buscarReservasCliente(userId)

      const roteiroIds = Array.from(
        new Set(
          reservasBase
            .map((reserva: Reserva) => reserva.roteiro_id)
            .filter(Boolean) as string[]
        )
      )

      const roteirosReservados = await buscarRoteirosPorIds(roteiroIds)

      const reservasComRoteiro = reservasBase.map((reserva: Reserva) => {
        const roteiro =
          roteirosReservados.find((item: Roteiro) => item.id === reserva.roteiro_id) ||
          null

        return {
          ...reserva,
          roteiro,
          roteiro_titulo: tituloRoteiro(roteiro),
          roteiro_foto: fotoRoteiro(roteiro)
        }
      })

      const reservasRealizadas = reservasComRoteiro.filter(
        (reserva: Reserva) => normalizar(reserva.status) === 'realizada'
      )

      const kmTotal = reservasRealizadas.reduce(
        (soma: number, reserva: Reserva) => soma + kmRoteiro(reserva.roteiro),
        0
      )

      const pendentes = reservasComRoteiro.filter((reserva: Reserva) => {
        const status = normalizar(reserva.status)
        return status === 'pendente' || status === 'aguardando'
      }).length

      const confirmadas = reservasComRoteiro.filter((reserva: Reserva) => {
        const status = normalizar(reserva.status)
        return status === 'confirmada'
      }).length

      const realizadas = reservasRealizadas.length

      const totalMedalhas = await carregarMedalhas(userId)

      const ultimaReserva = reservasComRoteiro[0]

      const proximas = reservasComRoteiro
        .filter((reserva: Reserva) => {
          if (reservaCancelada(reserva)) return false

          const status = normalizar(reserva.status)

          return (
            status === 'confirmada' ||
            status === 'pendente' ||
            status === 'aguardando'
          )
        })
        .slice(0, 3)

      setProximasReservas(proximas)

      await carregarRoteirosQuentes()

      setStats({
        totalKm: kmTotal,
        totalTrilhas: realizadas,
        reservasPendentes: pendentes,
        reservasConfirmadas: confirmadas,
        reservasRealizadas: realizadas,
        totalMedalhas,
        ultimaAtividade: ultimaReserva?.created_at
          ? tempoRelativo(ultimaReserva.created_at)
          : 'Sem histórico'
      })

      await carregarNotificacoes(userId, reservasComRoteiro)

      setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
      setMensagem('Não foi possível atualizar os dados agora.')
    }
  }

  const notificacaoEhAdmin = (log: any) => {
    const texto = normalizar(
      [
        log.tipo_usuario,
        log.tipo,
        log.acao,
        log.descricao,
        log.detalhes,
        log.origem,
        log.destino,
        log.rota
      ].join(' ')
    )

    return (
      texto.includes('admin') ||
      texto.includes('administrador') ||
      texto.includes('/admin') ||
      texto.includes('painel administrativo')
    )
  }

  const montarNotificacao = (log: any, userId: string): Notificacao | null => {
    if (notificacaoEhAdmin(log)) return null

    const acao = normalizar(log.acao || log.tipo || log.descricao)
    const isDoUsuario =
      log.usuario_id === userId ||
      log.user_id === userId ||
      log.cliente_id === userId ||
      log.email === user?.email

    const nome =
      log.primeiro_nome ||
      log.nome ||
      log.nome_usuario ||
      log.guia_nome ||
      'Alguém'

    const metadata = typeof log.metadata === 'object' && log.metadata ? log.metadata : {}
    const destinoLog =
      typeof log.destino === 'string' && log.destino.startsWith('/')
        ? log.destino
        : typeof metadata.destino === 'string' && metadata.destino.startsWith('/')
          ? metadata.destino
          : ''

    const roteiroId =
      log.roteiro_id ||
      log.id_roteiro ||
      metadata.roteiro_id ||
      metadata.roteiroId ||
      metadata.id_roteiro ||
      ''

    const perfilUsuarioId =
      log.perfil_usuario_id ||
      log.usuario_alvo_id ||
      log.cliente_id ||
      metadata.perfil_usuario_id ||
      metadata.usuario_alvo_id ||
      metadata.cliente_id ||
      metadata.userId ||
      ''

    const fotoId =
      log.foto_id ||
      metadata.foto_id ||
      metadata.fotoId ||
      ''

    if (acao.includes('roteiro') || acao.includes('criou')) {
      return {
        id: String(log.id),
        titulo: 'Novo roteiro no ar',
        texto: `${nome} criou uma nova experiência outdoor.`,
        emoji: '🧭',
        tipo: isDoUsuario ? 'all' : 'com',
        destino: roteiroId ? `/roteiros/${roteiroId}` : destinoLog || '/roteiros',
        created_at: log.created_at
      }
    }

    if (acao.includes('curtiu') || acao.includes('like')) {
      return {
        id: String(log.id),
        titulo: 'Foto curtida',
        texto: `${nome} curtiu uma foto da comunidade.`,
        emoji: '❤️',
        tipo: isDoUsuario ? 'all' : 'com',
        destino: perfilUsuarioId ? `/cliente/publico/${perfilUsuarioId}${fotoId ? `?foto=${fotoId}` : ''}` : destinoLog || '/cliente/perfil',
        created_at: log.created_at
      }
    }

    if (acao.includes('medalha') || acao.includes('badge') || acao.includes('conquista')) {
      return {
        id: String(log.id),
        titulo: 'Conquista desbloqueada',
        texto: `${nome} ganhou uma nova medalha.`,
        emoji: '🏅',
        tipo: isDoUsuario ? 'all' : 'com',
        destino: '/cliente/perfil',
        created_at: log.created_at
      }
    }

    if (acao.includes('avaliou') || acao.includes('avalia')) {
      return {
        id: String(log.id),
        titulo: 'Nova avaliação',
        texto: `${nome} avaliou uma experiência.`,
        emoji: '⭐',
        tipo: isDoUsuario ? 'all' : 'com',
        destino: '/roteiros',
        created_at: log.created_at
      }
    }

    if (acao.includes('reservou') || acao.includes('reserva')) {
      return {
        id: String(log.id),
        titulo: 'Reserva feita',
        texto: `${nome} reservou uma aventura.`,
        emoji: '🎒',
        tipo: isDoUsuario ? 'all' : 'com',
        destino: roteiroId ? `/roteiros/${roteiroId}` : destinoLog || '/cliente/minhas-reservas',
        created_at: log.created_at
      }
    }

    return {
      id: String(log.id),
      titulo: 'Movimento na comunidade',
      texto:
        log.detalhes ||
        log.descricao ||
        `${nome} interagiu no PrussikTrails.`,
      emoji: '🌿',
      tipo: isDoUsuario ? 'all' : 'com',
      destino: destinoLog || '/cliente/dashboard',
      created_at: log.created_at
    }
  }

  const carregarNotificacoes = async (
    userId: string,
    reservasFallback: Reserva[]
  ) => {
    try {
      const { data, error } = await supabase
        .from('logs_atividades')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(40)

      if (!error && data && data.length > 0) {
        const lista = data
          .map((log: any) => montarNotificacao(log, userId))
          .filter(Boolean) as Notificacao[]

        if (lista.length > 0) {
          setNotificacoes(lista.slice(0, 16))
          return
        }
      }
    } catch {
      // fallback abaixo
    }

    const fallback: Notificacao[] = []

    reservasFallback.slice(0, 6).forEach((reserva: Reserva) => {
      fallback.push({
        id: `reserva-${reserva.id}`,
        titulo: pagamentoConfirmado(reserva)
          ? 'Sua aventura foi confirmada'
          : 'Reserva aguardando confirmação',
        texto: `${reserva.roteiro_titulo || 'Roteiro'} · ${formatarMoeda(reserva.valor_total || 0)}`,
        emoji: pagamentoConfirmado(reserva) ? '✅' : '🎒',
        tipo: 'all',
        destino: '/cliente/minhas-reservas',
        created_at: reserva.created_at
      })
    })

    if (fallback.length < 4) {
      fallback.push(
        {
          id: 'com-roteiro-1',
          titulo: 'Novo roteiro chegando',
          texto: 'Um guia publicou uma nova experiência para a comunidade.',
          emoji: '🧭',
          tipo: 'com',
          destino: '/roteiros',
          created_at: new Date().toISOString()
        },
        {
          id: 'com-medalha-1',
          titulo: 'Conquista desbloqueada',
          texto: 'Alguém ganhou uma medalha depois da última aventura.',
          emoji: '🏅',
          tipo: 'com',
          destino: '/cliente/dashboard',
          created_at: new Date().toISOString()
        },
        {
          id: 'com-like-1',
          titulo: 'Foto curtida',
          texto: 'A comunidade está interagindo com registros das trilhas.',
          emoji: '❤️',
          tipo: 'com',
          destino: '/cliente/dashboard',
          created_at: new Date().toISOString()
        }
      )
    }

    setNotificacoes(fallback.slice(0, 12))
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
      setMensagem('Verificando seus pagamentos...')
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
              'Não foi possível verificar os pagamentos agora.'
          )
        }

        return false
      }

      const atualizadas = Number(data?.atualizadas || 0)
      const jaConfirmadas = Number(data?.jaConfirmadas || 0)

      if (!silencioso) {
        if (atualizadas > 0) {
          setMensagem('Pagamento confirmado. Sua reserva foi atualizada.')
        } else if (jaConfirmadas > 0) {
          setMensagem('Suas reservas já estavam confirmadas.')
        } else {
          setMensagem('Tudo certo. Nenhuma nova confirmação por enquanto.')
        }
      }

      return atualizadas > 0 || jaConfirmadas > 0
    } catch (error) {
      console.warn('Erro ao reconciliar pagamentos do cliente:', error)

      if (!silencioso) {
        setMensagem('Não foi possível verificar os pagamentos agora.')
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
      setMensagem('Pronto, sua área foi atualizada.')
    } finally {
      setAtualizando(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.replace('/login')
  }

  const alterarAbaNotificacao = (aba: 'all' | 'com') => {
    setAbaNotificacao(aba)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cliente_dashboard_notificacoes_aba', aba)
    }
  }

  const avatarCliente = () => {
    return user?.avatar_url || user?.foto_url || user?.imagem_url || ''
  }

  const inicialCliente = () => {
    return primeiroNome(user?.nome || user?.email).slice(0, 1).toUpperCase()
  }

  const iconeNotificacao = (notificacao: Notificacao): IconeNome => {
    const texto = normalizar(`${notificacao.titulo} ${notificacao.texto} ${notificacao.emoji}`)

    if (texto.includes('curt') || texto.includes('❤️')) return 'curtida'
    if (texto.includes('medalha') || texto.includes('conquista')) return 'medalha'
    if (texto.includes('reserva') || texto.includes('confirmada') || texto.includes('aventura')) return 'reserva'
    if (texto.includes('roteiro') || texto.includes('guia')) return 'roteiro'

    return 'comunidade'
  }

  const notificacoesFiltradas = useMemo(() => {
    if (abaNotificacao === 'all') return notificacoes

    return notificacoes.filter((notificacao: Notificacao) => notificacao.tipo === 'com')
  }, [notificacoes, abaNotificacao])

  const badgeStatusReserva = (reserva: Reserva) => {
    if (reservaCancelada(reserva)) {
      return <span className="badge badge-red">Cancelada</span>
    }

    if (pagamentoConfirmado(reserva)) {
      return <span className="badge badge-green">Confirmada</span>
    }

    return <span className="badge badge-yellow">Aguardando</span>
  }

  const dificuldadeClass = (dificuldade?: string | null) => {
    const d = normalizar(dificuldade)

    if (d.includes('facil')) return 'badge-green'
    if (d.includes('medio')) return 'badge-yellow'
    if (d.includes('dificil') || d.includes('extremo')) return 'badge-red'

    return 'badge-neutral'
  }

  const hotLabel = (roteiro: Roteiro) => {
    const total = Number(roteiro.hot_reservas || 0)
    const confirmadas = Number(roteiro.hot_confirmadas || 0)

    if (total === 0) return 'Novidade'
    if (confirmadas > 0) return `${confirmadas} confirmação(ões)`

    return `${total} reserva(s)`
  }

  const proximaReserva = proximasReservas[0] || null


  const medalhasPainel = useMemo(() => {
    const progressoAtual = METAS_JORNADA.filter((meta) => stats.totalKm >= meta.km)
    const indiceAtual = Math.max(0, progressoAtual.length - 1)
    const janelaJornada = METAS_JORNADA.slice(indiceAtual, indiceAtual + 4)

    const especiais = medalhasConquistadas
      .map((item: MedalhaUsuario) => {
        const medalha = medalhaRelacionada(item)
        const svg = obterSvgMedalhaBeta(medalha)

        if (!svg) return null

        return {
          key: `banco-${item.id}`,
          nome: medalha?.nome || 'Medalha Beta',
          svg,
          fallback: obterFallbackSvgMedalhaBeta(svg),
          cor: medalha?.cor || '#991b1b',
          desbloqueada: true,
          especial: true
        }
      })
      .filter(Boolean) as Array<{
        key: string
        nome: string
        svg: string
        fallback: string
        cor: string
        desbloqueada: boolean
        especial: boolean
      }>

    const jornada = janelaJornada.map((meta) => ({
      key: `jornada-${meta.key}`,
      nome: meta.titulo,
      svg: meta.svg,
      fallback: '',
      cor: meta.cor,
      desbloqueada: stats.totalKm >= meta.km,
      especial: false
    }))

    const unicas = new Map<string, {
      key: string
      nome: string
      svg: string
      fallback: string
      cor: string
      desbloqueada: boolean
      especial: boolean
    }>()

    ;[...especiais, ...jornada].forEach((medalha) => {
      const chave = normalizarChaveMedalha(medalha.nome)
      if (!unicas.has(chave)) unicas.set(chave, medalha)
    })

    return Array.from(unicas.values()).slice(0, 4)
  }, [stats.totalKm, medalhasConquistadas])

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
          <div>Preparando sua próxima aventura...</div>
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

        .topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255,253,247,0.94);
          border-bottom: 1px solid rgba(15,23,42,0.06);
          backdrop-filter: blur(18px);
          padding: 9px 14px;
        }

        .topbarInner {
          max-width: 1180px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr) 44px;
          align-items: center;
          gap: 8px;
        }

        .headerSpacer {
          width: 42px;
          height: 42px;
        }

        .brandDashboard {
          min-width: 0;
          border: 0;
          background: transparent;
          padding: 4px 6px 3px;
          text-align: center;
          cursor: pointer;
          color: #172018;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          justify-self: center;
          max-width: 100%;
        }

        .brandDashboard strong {
          display: block;
          color: #1f3f2d;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(31px, 7.4vw, 56px);
          font-weight: 800;
          line-height: 0.88;
          letter-spacing: -0.06em;
          white-space: nowrap;
          max-width: min(72vw, 560px);
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .brandDashboard span {
          display: block;
          margin-top: 6px;
          color: #7b8375;
          font-size: clamp(8px, 1.35vw, 13px);
          font-weight: 850;
          letter-spacing: clamp(0.08em, 0.8vw, 0.22em);
          text-transform: uppercase;
          white-space: nowrap;
          max-width: min(72vw, 560px);
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .topActions {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-end;
          justify-self: end;
          min-width: 0;
        }

        .profileAvatarBtn {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          border: 1px solid rgba(15,23,42,0.08);
          background: rgba(255,255,255,0.86);
          color: #1f3f2d;
          box-shadow: 0 10px 22px rgba(15,23,42,0.08);
          cursor: pointer;
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: 0.2s ease;
        }

        .profileAvatarBtn:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.13);
        }

        .profileAvatarBtn img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .profileAvatarBtn span {
          font-size: 15px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 22px 16px 48px;
        }

        .hero {
          position: relative;
          overflow: hidden;
          min-height: 300px;
          border-radius: 36px;
          padding: 28px;
          background:
            linear-gradient(135deg, rgba(23, 32, 24, 0.72), rgba(23, 32, 24, 0.34)),
            radial-gradient(circle at top right, rgba(132, 204, 22, 0.28), transparent 34%),
            linear-gradient(135deg, #203322 0%, #647a49 46%, #d7c6a1 100%);
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
          grid-template-columns: minmax(0, 1fr) 260px;
          gap: 22px;
          align-items: end;
          min-height: 238px;
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
          max-width: 680px;
          font-size: clamp(38px, 6vw, 66px);
          line-height: 0.94;
          font-weight: 950;
          letter-spacing: -0.08em;
        }

        .heroTitle span {
          color: #bef264;
        }

        .heroText {
          max-width: 620px;
          color: rgba(255,255,255,0.82);
          line-height: 1.62;
          margin: 15px 0 0;
          font-size: 14px;
        }

        .nextCard {
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 28px;
          padding: 18px;
          backdrop-filter: blur(16px);
        }

        .nextLabel {
          color: rgba(255,255,255,0.76);
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }

        .nextTitle {
          margin-top: 8px;
          color: #ffffff;
          font-size: 22px;
          font-weight: 950;
          line-height: 1.1;
          letter-spacing: -0.05em;
        }

        .nextMeta {
          margin-top: 8px;
          color: rgba(255,255,255,0.78);
          font-size: 12px;
          line-height: 1.45;
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

        .utilityGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
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
          position: relative;
          overflow: hidden;
        }

        .utilityCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.10);
        }

        .utilityIcon {
          width: 46px;
          height: 46px;
          border-radius: 19px;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(circle at 30% 20%, rgba(255,255,255,0.94), transparent 38%),
            linear-gradient(135deg, rgba(132, 204, 22, 0.18), rgba(31, 63, 45, 0.08));
          color: #1f3f2d;
          margin-bottom: 12px;
          box-shadow: inset 0 0 0 1px rgba(31, 63, 45, 0.07), 0 10px 20px rgba(23, 32, 24, 0.07);
        }

        .utilityIcon svg,
        .notificationIcon svg {
          display: block;
        }

        .utilityTitle {
          color: #172018;
          font-size: 15px;
          font-weight: 950;
          line-height: 1.2;
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
          grid-template-columns: minmax(0, 1.1fr) minmax(340px, 0.9fr);
          gap: 16px;
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

        .trailCard,
        .reservationCard {
          border: 1px solid rgba(15, 23, 42, 0.06);
          background: #fffdf7;
          border-radius: 26px;
          padding: 13px;
          display: grid;
          grid-template-columns: 84px minmax(0, 1fr);
          gap: 14px;
          align-items: center;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .trailCard:hover,
        .reservationCard:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
        }

        .hotCard {
          background:
            radial-gradient(circle at top right, rgba(251, 146, 60, 0.14), transparent 34%),
            #fffdf7;
          border-color: #fed7aa;
        }

        .thumb {
          width: 84px;
          height: 84px;
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

        .hotPill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ffedd5;
          color: #9a3412;
          border: 1px solid #fed7aa;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 950;
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
          gap: 16px;
        }


        .momentPanel {
          cursor: pointer;
          transition: 0.22s ease;
        }

        .momentPanel:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 44px rgba(15,23,42,0.10);
          border-color: rgba(22,163,74,0.16);
        }

        .momentPanel:focus-visible {
          outline: 3px solid rgba(132,204,22,0.34);
          outline-offset: 3px;
        }

        .tabs {
          display: flex;
          gap: 6px;
          background: #eef2e5;
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
          transition: 0.2s ease;
        }

        .tab.active {
          background: #172018;
          color: #ffffff;
          box-shadow: 0 8px 18px rgba(23, 32, 24, 0.16);
        }

        .notificationPanel {
          margin: 0 0 16px;
        }

        .notificationPanel .panelHeader {
          padding: 14px 18px;
        }

        .notificationPanel .panelBody {
          padding: 12px 14px 14px;
        }

        .notificationList {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .notification {
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr);
          gap: 10px;
          align-items: flex-start;
          padding: 10px;
          border-radius: 20px;
          background: #fffdf7;
          border: 1px solid rgba(15, 23, 42, 0.055);
          cursor: default;
          transition: 0.2s ease;
          min-height: 84px;
        }

        .notification.clickable {
          cursor: pointer;
        }

        .notification.clickable:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
          border-color: rgba(22, 163, 74, 0.18);
        }

        .notification.static:hover {
          transform: none;
          box-shadow: none;
        }

        .notificationIcon {
          width: 40px;
          height: 40px;
          border-radius: 16px;
          background:
            radial-gradient(circle at 30% 20%, rgba(255,255,255,0.94), transparent 38%),
            linear-gradient(135deg, rgba(132, 204, 22, 0.16), rgba(31, 63, 45, 0.08));
          color: #1f3f2d;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notificationTitle {
          color: #172018;
          font-size: 13px;
          font-weight: 950;
          line-height: 1.28;
        }

        .notificationText {
          color: #64748b;
          font-size: 11.5px;
          line-height: 1.35;
          margin-top: 3px;
          font-weight: 700;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .notificationTime {
          color: #94a3b8;
          font-size: 10.5px;
          margin-top: 5px;
          font-weight: 850;
        }

        .miniStats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .miniStat {
          background: #fffdf7;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 22px;
          padding: 13px;
          text-align: center;
        }

        .miniValue {
          color: #172018;
          font-size: 22px;
          font-weight: 950;
          letter-spacing: -0.06em;
        }

        .miniLabel {
          color: #64748b;
          font-size: 11px;
          font-weight: 850;
          margin-top: 3px;
        }



        .medalBox {
          margin-top: 14px;
          background:
            radial-gradient(circle at top right, rgba(251, 146, 60, 0.10), transparent 34%),
            #fffdf7;
          border: 1px solid rgba(146, 64, 14, 0.10);
          border-radius: 24px;
          padding: 14px;
        }

        .medalBoxHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 12px;
        }

        .medalBoxHead strong {
          display: block;
          color: #172018;
          font-size: 14px;
          font-weight: 950;
          letter-spacing: -0.03em;
        }

        .medalBoxHead button {
          border: 0;
          background: transparent;
          color: #16a34a;
          font-size: 11px;
          font-weight: 950;
          cursor: pointer;
          padding: 0;
        }

        .medalKicker {
          color: #92400e;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 3px;
        }

        .medalRail {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }


        .dashboardMedalRail {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 12px;
          align-items: center;
        }

        .dashboardMedalSvg {
          width: 52px;
          height: 52px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          flex: 0 0 auto;
          transition: 0.2s ease;
        }

        .dashboardMedalSvg img {
          width: 58px;
          height: 58px;
          object-fit: contain;
          display: block;
          filter: drop-shadow(0 10px 16px rgba(15,23,42,0.16));
        }

        .dashboardMedalSvg.locked img {
          opacity: 0.26;
          filter: grayscale(1) saturate(0.12) contrast(0.82) brightness(1.08);
        }

        .dashboardMedalSvg.special img {
          width: 64px;
          height: 64px;
          filter: drop-shadow(0 12px 20px rgba(80,36,12,0.20));
        }

        .medalHex {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          clip-path: polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%);
          border: 2px solid #92400e;
          background:
            radial-gradient(circle at 30% 18%, rgba(255,255,255,0.76), transparent 28%),
            linear-gradient(145deg, rgba(255,253,247,0.96), rgba(120,113,108,0.18));
          box-shadow:
            inset 0 0 0 2px rgba(29,38,24,0.08),
            0 8px 18px rgba(25,35,18,0.12);
          flex: 0 0 auto;
        }

        .medalHex span {
          font-size: 19px;
          filter: drop-shadow(0 2px 3px rgba(0,0,0,0.18));
        }

        .medalHex.locked {
          opacity: 0.38;
          filter: grayscale(0.7);
          border-color: rgba(87, 83, 78, 0.34) !important;
        }

        .nextMedalBox {
          margin-top: 12px;
          padding: 10px;
          border-radius: 18px;
          background: rgba(23, 32, 24, 0.04);
          border: 1px solid rgba(15, 23, 42, 0.05);
        }

        .nextMedalBox span {
          display: block;
          color: #92400e;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .nextMedalBox strong {
          display: block;
          margin-top: 4px;
          color: #172018;
          font-size: 12px;
          font-weight: 950;
        }

        .miniProgress {
          height: 7px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.08);
          overflow: hidden;
          margin-top: 8px;
        }

        .miniProgress div {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #365314, #84cc16, #f97316);
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

        @media (max-width: 1040px) {
          .utilityGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .mainGrid,
          .heroContent {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .topbar {
            padding: 7px 10px;
          }

          .topbarInner {
            grid-template-columns: 38px minmax(0, 1fr) 38px;
            gap: 6px;
            align-items: center;
          }

          .headerSpacer {
            width: 36px;
            height: 36px;
          }

          .brandDashboard {
            padding: 3px 4px 2px;
          }

          .brandDashboard strong {
            font-size: clamp(28px, 8.2vw, 36px);
            max-width: calc(100vw - 104px);
          }

          .brandDashboard span {
            font-size: 8px;
            letter-spacing: 0.11em;
            margin-top: 5px;
            max-width: calc(100vw - 104px);
          }

          .profileAvatarBtn {
            width: 36px;
            height: 36px;
            box-shadow: none;
          }

          .container {
            padding: 16px 12px 40px;
          }

          .hero,
          .panel {
            border-radius: 26px;
          }

          .hero {
            padding: 22px;
            min-height: auto;
          }

          .utilityGrid {
            grid-template-columns: 1fr 1fr;
          }

          .notificationList {
            grid-template-columns: 1fr;
          }

          .trailCard,
          .reservationCard {
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
            font-size: 38px;
          }

          .miniStats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header className="topbar">
        <div className="topbarInner">
          <div className="headerSpacer" aria-hidden="true" />

          <button
            type="button"
            className="brandDashboard"
            onClick={() => router.push('/cliente/dashboard')}
            aria-label="Voltar para a dashboard do cliente"
          >
            <strong>PrussikTrails</strong>
            <span>Seu app de aventuras</span>
          </button>

          <div className="topActions">
            <button
              type="button"
              className="profileAvatarBtn"
              onClick={() => router.push('/cliente/perfil')}
              title="Perfil"
              aria-label="Abrir perfil e configurações"
            >
              {avatarCliente() ? (
                <img src={avatarCliente()} alt={user.nome || user.email || 'Perfil'} />
              ) : (
                <span>{inicialCliente()}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroContent">
            <div>
              <div className="eyebrow">Bom te ver por aqui</div>

              <h1 className="heroTitle">
                Oi, {primeiroNome(user.nome)}.
                <br />
                Bora respirar <span>lá fora?</span>
              </h1>

              <p className="heroText">
                Veja o que está acontecendo, acompanhe suas reservas e descubra as
                trilhas mais comentadas da comunidade.
                {ultimaAtualizacao && (
                  <>
                    <br />
                    Atualizado às {ultimaAtualizacao}.
                  </>
                )}
              </p>
            </div>

            <aside className="nextCard">
              <div className="nextLabel">Próxima boa ideia</div>

              <div className="nextTitle">
                {proximaReserva
                  ? proximaReserva.roteiro_titulo || 'Sua próxima aventura'
                  : 'Escolher uma trilha'}
              </div>

              <div className="nextMeta">
                {proximaReserva
                  ? `${formatarData(dataReserva(proximaReserva))} ${formatarHora(dataReserva(proximaReserva))}`
                  : 'Explore roteiros, salve uma experiência e comece pelo simples.'}
              </div>
            </aside>
          </div>
        </section>

        {mensagem && (
          <div className="message">
            {mensagem}
          </div>
        )}

        <section className="utilityGrid">
          <article
            className="utilityCard"
            onClick={() => router.push('/cliente/minhas-reservas')}
          >
            <div className="utilityIcon"><IconeDashboard name="reservas" /></div>
            <div className="utilityTitle">Minhas reservas</div>
            <div className="utilityText">
              {stats.reservasConfirmadas} confirmada(s), {stats.reservasPendentes} aguardando.
            </div>
          </article>

          <article
            className="utilityCard"
            onClick={() => router.push('/roteiros')}
          >
            <div className="utilityIcon"><IconeDashboard name="explorar" /></div>
            <div className="utilityTitle">Explorar roteiros</div>
            <div className="utilityText">
              Encontre uma nova experiência para o próximo final de semana.
            </div>
          </article>

          <article
            className="utilityCard"
            onClick={() => router.push('/cliente/perfil')}
          >
            <div className="utilityIcon"><IconeDashboard name="perfil" /></div>
            <div className="utilityTitle">Meu perfil</div>
            <div className="utilityText">
              {stats.totalMedalhas} medalha(s), {stats.totalKm.toFixed(0)} km no histórico.
            </div>
          </article>

          <article
            className="utilityCard"
            onClick={() => reconciliarPagamentosPendentes(false)}
          >
            <div className="utilityIcon"><IconeDashboard name="pagamentos" /></div>
            <div className="utilityTitle">Pagamentos</div>
            <div className="utilityText">
              {reconciliando
                ? 'Verificando agora...'
                : 'Conferir confirmação das reservas pendentes.'}
            </div>
          </article>
        </section>

        <section className="panel notificationPanel">
          <div className="panelHeader">
            <div>
              <h2 className="panelTitle">Notificações</h2>
              <div className="panelSub">
                {abaNotificacao === 'com'
                  ? 'Movimentos da comunidade com atalhos úteis.'
                  : 'Resumo geral. Sem cliques por enquanto.'}
              </div>
            </div>

            <div className="tabs">
              <button
                type="button"
                className={`tab ${abaNotificacao === 'all' ? 'active' : ''}`}
                onClick={() => alterarAbaNotificacao('all')}
              >
                ALL
              </button>

              <button
                type="button"
                className={`tab ${abaNotificacao === 'com' ? 'active' : ''}`}
                onClick={() => alterarAbaNotificacao('com')}
              >
                COM
              </button>
            </div>
          </div>

          <div className="panelBody">
            {notificacoesFiltradas.length === 0 ? (
              <div className="empty">
                Nenhuma notificação por enquanto.
              </div>
            ) : (
              <div className="notificationList">
                {notificacoesFiltradas.slice(0, 4).map((notificacao: Notificacao) => {
                  const clicavel = abaNotificacao === 'com' && Boolean(notificacao.destino)

                  return (
                    <article
                      className={`notification ${clicavel ? 'clickable' : 'static'}`}
                      key={notificacao.id}
                      role={clicavel ? 'button' : undefined}
                      tabIndex={clicavel ? 0 : undefined}
                      onClick={() => {
                        if (clicavel && notificacao.destino) {
                          router.push(notificacao.destino)
                        }
                      }}
                      onKeyDown={(event) => {
                        if (clicavel && notificacao.destino && (event.key === 'Enter' || event.key === ' ')) {
                          event.preventDefault()
                          router.push(notificacao.destino)
                        }
                      }}
                    >
                      <div className="notificationIcon">
                        <IconeDashboard name={iconeNotificacao(notificacao)} />
                      </div>

                      <div>
                        <div className="notificationTitle">
                          {notificacao.titulo}
                        </div>

                        <div className="notificationText">
                          {notificacao.texto}
                        </div>

                        <div className="notificationTime">
                          {tempoRelativo(notificacao.created_at)}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <section className="mainGrid">
          <div>
            <section className="panel">
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Roteiros quentes</h2>
                  <div className="panelSub">
                    O que está movimentando a comunidade.
                  </div>
                </div>

                <button
                  type="button"
                  className="textLink"
                  onClick={() => router.push('/roteiros')}
                >
                  Ver todos
                </button>
              </div>

              <div className="panelBody">
                {roteirosQuentes.length === 0 ? (
                  <div className="empty">
                    Nenhum roteiro ativo encontrado por enquanto.
                  </div>
                ) : (
                  <div className="list">
                    {roteirosQuentes.map((roteiro: Roteiro) => {
                      const foto = fotoRoteiro(roteiro)

                      return (
                        <article
                          className="trailCard hotCard"
                          key={roteiro.id}
                          onClick={() => router.push(`/roteiros/${roteiro.id}`)}
                        >
                          <div className="thumb">
                            {foto ? (
                              <img src={foto} alt={tituloRoteiro(roteiro)} />
                            ) : (
                              'HOT'
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

                              <span className="hotPill">
                                🔥 {hotLabel(roteiro)}
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

            <section className="panel" style={{ marginTop: 16 }}>
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Reservas em andamento</h2>
                  <div className="panelSub">
                    O que precisa da sua atenção agora.
                  </div>
                </div>

                <button
                  type="button"
                  className="textLink"
                  onClick={() => router.push('/cliente/minhas-reservas')}
                >
                  Ver reservas
                </button>
              </div>

              <div className="panelBody">
                {proximasReservas.length === 0 ? (
                  <div className="empty">
                    Nada pendente por aqui. Que tal escolher uma trilha?
                  </div>
                ) : (
                  <div className="list">
                    {proximasReservas.map((reserva: Reserva) => (
                      <article
                        className="reservationCard"
                        key={reserva.id}
                        onClick={() => router.push('/cliente/minhas-reservas')}
                      >
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
                            {formatarData(dataReserva(reserva))}
                            {formatarHora(dataReserva(reserva)) && ` · ${formatarHora(dataReserva(reserva))}`}
                            <br />
                            {reserva.quantidade_pessoas || 1} pessoa(s)
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
          </div>

          <div className="sideGrid">

            <section
              className="panel momentPanel"
              role="button"
              tabIndex={0}
              onClick={() => router.push('/cliente/perfil')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  router.push('/cliente/perfil')
                }
              }}
            >
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Seu momento</h2>
                  <div className="panelSub">
                    Um resumo simples, sem complicar.
                  </div>
                </div>
              </div>

              <div className="panelBody">
                <div className="miniStats">
                  <div className="miniStat">
                    <div className="miniValue">{stats.totalKm.toFixed(0)}</div>
                    <div className="miniLabel">km</div>
                  </div>

                  <div className="miniStat">
                    <div className="miniValue">{stats.totalTrilhas}</div>
                    <div className="miniLabel">trilhas</div>
                  </div>

                  <div className="miniStat">
                    <div className="miniValue">{stats.totalMedalhas}</div>
                    <div className="miniLabel">medalhas</div>
                  </div>
                </div>

                <div className="medalBox">
                  <div className="medalBoxHead">
                    <div>
                      <div className="medalKicker">Coleção</div>
                      <strong>Medalhas da jornada</strong>
                    </div>
                  </div>

                  <div className="dashboardMedalRail">
                    {medalhasPainel.map((medalha) => (
                      <div
                        key={medalha.key}
                        className={`dashboardMedalSvg ${medalha.desbloqueada ? '' : 'locked'} ${medalha.especial ? 'special' : ''}`}
                        title={medalha.nome}
                      >
                        <img
                          src={medalha.svg}
                          alt={medalha.nome}
                          data-fallback={medalha.fallback}
                          onError={(event) => {
                            const fallback = event.currentTarget.dataset.fallback
                            if (fallback) {
                              event.currentTarget.src = fallback
                              event.currentTarget.dataset.fallback = ''
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {proximaMedalha && (
                    <div className="nextMedalBox">
                      <span>Próxima conquista</span>
                      <strong>{medalhaRelacionada(proximaMedalha)?.nome || 'Nova medalha'}</strong>
                      <div className="miniProgress">
                        <div style={{ width: `${progressoPercentual(proximaMedalha)}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}