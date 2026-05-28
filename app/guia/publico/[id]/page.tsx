'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Guia = {
  id: string
  nome?: string | null
  email?: string | null
  tipo?: string | null
  bio?: string | null
  bio_guia?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  cadastur?: string | null
  cadastur_numero?: string | null
  cadastur_status?: string | null
  cadastur_informado_em?: string | null
  cadastur_verificado?: boolean | null
  guia_verificado_cadastur?: boolean | null
  cadastur_validade?: string | null
  cadastur_data_validade?: string | null
  cadastur_validade_ate?: string | null
  cadastur_vencimento?: string | null
  cadastur_ativo_desde?: string | null
  cadastur_verificado_em?: string | null
  cadastur_data_verificacao?: string | null
  created_at?: string | null
  nivel_guia?: number | null
  xp_guia?: number | null
  guia_beta?: boolean | null
  guia_pioneiro_beta?: boolean | null
  medalha_guia_pioneiro_beta?: boolean | null
  beneficio_taxa_beta_ativo?: boolean | null
  taxa_plataforma_percentual?: number | null
}

type Roteiro = {
  id: string
  titulo?: string | null
  nome?: string | null
  descricao?: string | null
  km?: number | null
  distancia_km?: number | null
  preco?: number | null
  valor?: number | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  local?: string | null
  localizacao?: string | null
  dificuldade?: string | null
  status?: string | null
  id_guia?: string | null
  guia_id?: string | null
  user_id?: string | null
  usuario_id?: string | null
}

type Reserva = {
  id: string
  roteiro_id?: string | null
  cliente_id?: string | null
  status?: string | null
  pagamento_status?: string | null
}

type Avaliacao = {
  id: string
  nota?: number | null
  comentario?: string | null
  observacao?: string | null
  descricao?: string | null
  cliente_id?: string | null
  cliente_nome?: string | null
  cliente_avatar?: string | null
  created_at?: string | null
  status_moderacao?: string | null
  [key: string]: unknown
}

type Stats = {
  totalKm: number
  totalRoteiros: number
  totalReservas: number
  reservasConfirmadas: number
  totalClientes: number
  avaliacaoMedia: number
  totalAvaliacoes: number
}

type MedalhaGuia = {
  codigo: string
  nome: string
  descricao: string
  svg: string
  fallbackSvg?: string
  desbloqueada: boolean
  destaque?: boolean
  categoria?: 'progressao' | 'cadastur' | 'beta' | 'atuacao'
}

type ReportReason = 'seguranca' | 'conduta' | 'informacao' | 'pagamento' | 'outro'

const statsInicial: Stats = {
  totalKm: 0,
  totalRoteiros: 0,
  totalReservas: 0,
  reservasConfirmadas: 0,
  totalClientes: 0,
  avaliacaoMedia: 0,
  totalAvaliacoes: 0
}

const PROGRESSAO_BASE = '/medalhas/progressao'
const BETA_BASE = '/medalhas/iniciais_jornada'
const BETA_FALLBACK_BASE = '/medalhas/prussik_svg_pack/iniciais_jornada'
const CADASTUR_BASE = '/medalhas/cadastur'

const CADASTUR_TIERS = [
  {
    anos: 1,
    codigo: 'cadastur_bronze',
    nome: 'CADASTUR Bronze',
    descricao: 'Reconhecimento por 1 ano com CADASTUR ativo.',
    svg: `${CADASTUR_BASE}/cadastur_bronze.svg`
  },
  {
    anos: 2,
    codigo: 'cadastur_prata',
    nome: 'CADASTUR Prata',
    descricao: 'Reconhecimento por 2 anos com CADASTUR ativo.',
    svg: `${CADASTUR_BASE}/cadastur_prata.svg`
  },
  {
    anos: 3,
    codigo: 'cadastur_ouro',
    nome: 'CADASTUR Ouro',
    descricao: 'Reconhecimento por 3 anos com CADASTUR ativo.',
    svg: `${CADASTUR_BASE}/cadastur_ouro.svg`
  },
  {
    anos: 5,
    codigo: 'cadastur_platina',
    nome: 'CADASTUR Platina',
    descricao: 'Reconhecimento por 5 anos com CADASTUR ativo.',
    svg: `${CADASTUR_BASE}/cadastur_platina.svg`
  },
  {
    anos: 10,
    codigo: 'cadastur_onyx',
    nome: 'CADASTUR Onyx',
    descricao: 'Reconhecimento por 10 anos com CADASTUR ativo.',
    svg: `${CADASTUR_BASE}/cadastur_onyx.svg`
  }
]

const marcosKmGuia = [
  { km: 0, nome: 'Início' },
  { km: 32, nome: 'Bronze' },
  { km: 96, nome: 'Prata' },
  { km: 192, nome: 'Ouro' },
  { km: 384, nome: 'Platina' },
  { km: 768, nome: 'Onyx' },
  { km: 1152, nome: 'Mestre' },
  { km: 1920, nome: 'Lenda' },
  { km: 3840, nome: 'Especial' },
  { km: 7680, nome: 'Mapa Lendário' }
]

function normalizar(valor: unknown): string {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}


function extrairUsuarioLocalId(usuario: any): string {
  return String(
    usuario?.id ||
      usuario?.user_id ||
      usuario?.usuario_id ||
      usuario?.guia_id ||
      usuario?.cliente_id ||
      ''
  ).trim()
}

function formatarMoeda(valor: unknown): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(valor || 0))
}

function formatarData(valor?: string | null): string {
  if (!valor) return ''
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return ''
  return data.toLocaleDateString('pt-BR')
}

function dataValidaFutura(valor?: string | null): boolean {
  if (!valor) return false

  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return false

  const fimDoDia = new Date(data)
  fimDoDia.setHours(23, 59, 59, 999)

  return fimDoDia.getTime() >= Date.now()
}

function anosDesde(valor?: string | null): number {
  if (!valor) return 0

  const inicio = new Date(valor)
  if (Number.isNaN(inicio.getTime())) return 0

  const agora = new Date()
  let anos = agora.getFullYear() - inicio.getFullYear()

  const aindaNaoFezAniversario =
    agora.getMonth() < inicio.getMonth() ||
    (agora.getMonth() === inicio.getMonth() && agora.getDate() < inicio.getDate())

  if (aindaNaoFezAniversario) anos -= 1

  return Math.max(0, anos)
}

function pagamentoConfirmado(reserva: Reserva): boolean {
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

function roteiroAtivo(roteiro: Roteiro): boolean {
  const status = normalizar(roteiro.status)

  if (!status) return true

  return (
    status === 'ativo' ||
    status === 'aprovado' ||
    status === 'aprovada' ||
    status === 'publicado' ||
    status === 'publicada'
  )
}

function fotoRoteiro(roteiro: Roteiro): string {
  return roteiro.foto_capa || roteiro.foto_url || roteiro.imagem_url || ''
}

function tituloRoteiro(roteiro: Roteiro): string {
  return roteiro.titulo || roteiro.nome || 'Roteiro'
}

function localRoteiro(roteiro: Roteiro): string {
  return roteiro.local || roteiro.localizacao || 'Local a confirmar'
}

function kmRoteiro(roteiro: Roteiro): number {
  return Number(roteiro.km || roteiro.distancia_km || 0)
}

function valorRoteiro(roteiro: Roteiro): number {
  return Number(roteiro.preco || roteiro.valor || 0)
}

function primeiroNome(nome?: string | null): string {
  const limpo = String(nome || '').trim()
  if (!limpo) return 'Guia'
  return limpo.split(' ')[0] || limpo
}

function estrelas(nota?: number | null): string {
  const valor = Math.max(0, Math.min(5, Math.round(Number(nota || 0))))
  return '★'.repeat(valor) + '☆'.repeat(5 - valor)
}

function calcularProgressoKm(km: number): number {
  let anterior = 0
  let proximo = marcosKmGuia[marcosKmGuia.length - 1].km

  for (const marco of marcosKmGuia) {
    if (km >= marco.km) anterior = marco.km
    if (km < marco.km) {
      proximo = marco.km
      break
    }
  }

  if (proximo <= anterior) return 100
  return Math.max(0, Math.min(100, Math.round(((km - anterior) / (proximo - anterior)) * 100)))
}

function nivelPorKm(km: number): string {
  let atual = marcosKmGuia[0].nome
  for (const marco of marcosKmGuia) {
    if (km >= marco.km) atual = marco.nome
  }
  return atual
}

function MedalhaImagem({ src, fallback, alt }: { src: string; fallback?: string; alt: string }) {
  const [fallbackUsado, setFallbackUsado] = useState(false)
  const [erro, setErro] = useState(false)

  if (erro) return <span className="medalFallback">🏅</span>

  return (
    <img
      src={fallbackUsado && fallback ? fallback : src}
      alt={alt}
      className="medalSvg"
      onError={() => {
        if (fallback && !fallbackUsado) {
          setFallbackUsado(true)
          return
        }
        setErro(true)
      }}
    />
  )
}

export default function PerfilPublicoGuiaPage() {
  const params = useParams()
  const router = useRouter()
  const guiaId = String(params?.id || '')

  const [guia, setGuia] = useState<Guia | null>(null)
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [stats, setStats] = useState<Stats>(statsInicial)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [reportAberto, setReportAberto] = useState(false)
  const [reportMotivo, setReportMotivo] = useState<ReportReason>('seguranca')
  const [reportTexto, setReportTexto] = useState('')
  const [reportEnviado, setReportEnviado] = useState(false)
  const [usuarioLogadoId, setUsuarioLogadoId] = useState('')
  const [seguindoPerfil, setSeguindoPerfil] = useState(false)
  const [seguidoresTotal, setSeguidoresTotal] = useState(0)
  const [seguindoSalvando, setSeguindoSalvando] = useState(false)
  const [seguindoErro, setSeguindoErro] = useState('')

  useEffect(() => {
    if (!guiaId) return
    carregarPerfil()
    carregarStatusSocial()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guiaId])

  const fotoGuia = () => guia?.avatar_url || guia?.foto_url || guia?.imagem_url || ''
  const nomeGuia = () => guia?.nome || guia?.email || 'Guia PrussikTrails'
  const bioGuia = () => guia?.bio_guia || guia?.bio || ''

  const guiaPioneiroBeta = () => {
    return Boolean(
      guia?.medalha_guia_pioneiro_beta ||
        guia?.guia_pioneiro_beta ||
        guia?.guia_beta ||
        guia?.beneficio_taxa_beta_ativo ||
        Number(guia?.taxa_plataforma_percentual || 0) === 5
    )
  }


  const carregarStatusSocial = async () => {
    try {
      setSeguindoErro('')

      const salvo = localStorage.getItem('user')
      const usuario = salvo ? JSON.parse(salvo) : null
      const idLogado = extrairUsuarioLocalId(usuario)
      setUsuarioLogadoId(idLogado)

      const { count } = await supabase
        .from('seguidores')
        .select('id', { count: 'exact', head: true })
        .eq('seguido_id', guiaId)
        .eq('status', 'ativo')

      setSeguidoresTotal(count || 0)

      if (!idLogado || idLogado === guiaId) {
        setSeguindoPerfil(false)
        return
      }

      const { data } = await supabase
        .from('seguidores')
        .select('id, status')
        .eq('seguidor_id', idLogado)
        .eq('seguido_id', guiaId)
        .maybeSingle()

      setSeguindoPerfil(data?.status === 'ativo')
    } catch (error) {
      console.warn('Não foi possível carregar status social do guia:', error)
    }
  }

  const alternarSeguir = async () => {
    if (!usuarioLogadoId) {
      router.push('/login')
      return
    }

    if (!guiaId || usuarioLogadoId === guiaId) return

    try {
      setSeguindoErro('')
      setSeguindoSalvando(true)

      const resposta = await fetch('/api/social/seguir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seguidorId: usuarioLogadoId,
          seguidoId: guiaId,
          origem: 'perfil_publico_guia'
        })
      })

      const json = await resposta.json().catch(() => null)

      if (!resposta.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível atualizar agora.')
      }

      const novoStatus = Boolean(json.seguindo)
      setSeguindoPerfil(novoStatus)
      setSeguidoresTotal((prev) => Math.max(prev + (novoStatus ? 1 : -1), 0))
    } catch (error: unknown) {
      setSeguindoErro(error instanceof Error ? error.message : 'Erro ao seguir este guia.')
    } finally {
      setSeguindoSalvando(false)
    }
  }

  const buscarRoteirosDoGuia = async (id: string) => {
    const campos = ['id_guia', 'guia_id', 'user_id', 'usuario_id']
    const mapa = new Map<string, Roteiro>()

    for (const campo of campos) {
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .eq(campo, id)
        .limit(100)

      if (!error && data) {
        ;(data as Roteiro[]).forEach((roteiro: Roteiro) => {
          if (roteiro?.id) mapa.set(roteiro.id, roteiro)
        })
      }
    }

    return Array.from(mapa.values()).filter(roteiroAtivo)
  }

  const buscarAvaliacoesDoGuia = async (id: string) => {
    const campos = ['guia_id', 'id_guia']
    let lista: Avaliacao[] = []

    for (const campo of campos) {
      const { data, error } = await supabase
        .from('avaliacoes')
        .select('*')
        .eq(campo, id)
        .order('created_at', { ascending: false })
        .limit(30)

      if (!error && data) {
        lista = data as Avaliacao[]
        break
      }
    }

    lista = lista.filter((avaliacao: Avaliacao) => {
      const status = normalizar(avaliacao.status_moderacao)
      if (!status) return true
      return status === 'aprovada' || status === 'aprovado'
    })

    const clienteIds = Array.from(
      new Set(
        lista
          .map((avaliacao: Avaliacao) => avaliacao.cliente_id)
          .filter(Boolean) as string[]
      )
    )

    if (clienteIds.length === 0) return lista

    const { data: clientes } = await supabase
      .from('users')
      .select('id, nome, email, avatar_url, foto_url, imagem_url')
      .in('id', clienteIds)

    return lista.map((avaliacao: Avaliacao) => {
      const cliente = (clientes || []).find((item: any) => item.id === avaliacao.cliente_id)

      return {
        ...avaliacao,
        cliente_nome: cliente?.nome || cliente?.email || 'Cliente PrussikTrails',
        cliente_avatar: cliente?.avatar_url || cliente?.foto_url || cliente?.imagem_url || ''
      }
    })
  }

  const carregarPerfil = async () => {
    setCarregando(true)
    setErro('')

    try {
      const { data: guiaData, error: guiaError } = await supabase
        .from('users')
        .select('*')
        .eq('id', guiaId)
        .maybeSingle()

      if (guiaError) {
        console.error('Erro ao carregar guia:', guiaError)
        setErro('Não foi possível carregar este perfil.')
        return
      }

      if (!guiaData) {
        setErro('Guia não encontrado.')
        return
      }

      setGuia(guiaData as Guia)

      const roteirosDoGuia = await buscarRoteirosDoGuia(guiaId)
      setRoteiros(roteirosDoGuia)

      const roteiroIds = roteirosDoGuia.map((roteiro: Roteiro) => roteiro.id).filter(Boolean)
      let reservas: Reserva[] = []

      if (roteiroIds.length > 0) {
        const { data: reservasData, error: reservasError } = await supabase
          .from('reservas')
          .select('*')
          .in('roteiro_id', roteiroIds)

        if (!reservasError && reservasData) reservas = reservasData as Reserva[]
      }

      const avaliacoesDoGuia = await buscarAvaliacoesDoGuia(guiaId)
      setAvaliacoes(avaliacoesDoGuia)

      const totalKm = roteirosDoGuia.reduce(
        (total: number, roteiro: Roteiro) => total + kmRoteiro(roteiro),
        0
      )
      const reservasConfirmadas = reservas.filter((reserva: Reserva) => pagamentoConfirmado(reserva))
      const clientesUnicos = new Set(reservas.map((reserva: Reserva) => reserva.cliente_id).filter(Boolean))
      const avaliacaoMedia =
        avaliacoesDoGuia.length > 0
          ? avaliacoesDoGuia.reduce((total: number, avaliacao: Avaliacao) => total + Number(avaliacao.nota || 0), 0) /
            avaliacoesDoGuia.length
          : 0

      setStats({
        totalKm,
        totalRoteiros: roteirosDoGuia.length,
        totalReservas: reservas.length,
        reservasConfirmadas: reservasConfirmadas.length,
        totalClientes: clientesUnicos.size,
        avaliacaoMedia,
        totalAvaliacoes: avaliacoesDoGuia.length
      })
    } catch (error) {
      console.error('Erro inesperado ao carregar perfil público:', error)
      setErro('Erro inesperado ao carregar este perfil.')
    } finally {
      setCarregando(false)
    }
  }

  const progressoKm = useMemo(() => calcularProgressoKm(stats.totalKm), [stats.totalKm])
  const nivelAtual = useMemo(() => nivelPorKm(stats.totalKm), [stats.totalKm])
  const principaisRoteiros = useMemo(() => roteiros.slice(0, 3), [roteiros])

  const cadasturNumero = String(
    guia?.cadastur_numero ||
      guia?.cadastur ||
      ''
  ).trim()

  const cadasturStatus = normalizar(guia?.cadastur_status)

  const cadasturInformado = Boolean(cadasturNumero)

  const cadasturVerificado = Boolean(
    guia?.cadastur_verificado ||
      guia?.guia_verificado_cadastur ||
      cadasturStatus === 'verificado' ||
      cadasturStatus === 'ativo'
  )

  const cadasturValidade = String(
    guia?.cadastur_validade ||
      guia?.cadastur_data_validade ||
      guia?.cadastur_validade_ate ||
      guia?.cadastur_vencimento ||
      ''
  ).trim()

  const cadasturAtivo = Boolean(cadasturVerificado && dataValidaFutura(cadasturValidade))

  const cadasturAtivoDesde = String(
    guia?.cadastur_ativo_desde ||
      guia?.cadastur_verificado_em ||
      guia?.cadastur_data_verificacao ||
      guia?.cadastur_informado_em ||
      guia?.created_at ||
      ''
  ).trim()

  const anosCadasturAtivo = cadasturAtivo ? anosDesde(cadasturAtivoDesde) : 0

  const cadasturLabelPublico = (() => {
    if (cadasturAtivo) {
      return cadasturValidade
        ? `CADASTUR ativo até ${formatarData(cadasturValidade)}`
        : 'CADASTUR ativo'
    }

    if (cadasturVerificado) return 'Guia verificado CADASTUR'
    if (cadasturInformado) return 'CADASTUR informado'
    return 'CADASTUR não informado'
  })()

  const medalhasCadastur: MedalhaGuia[] = useMemo(
    () => [
      {
        codigo: 'cadastur_preenchido',
        nome: 'CADASTUR informado',
        descricao: 'Número CADASTUR informado pelo guia e aguardando conferência administrativa.',
        svg: `${CADASTUR_BASE}/01_cadastur_preenchido.svg`,
        desbloqueada: cadasturInformado,
        destaque: cadasturInformado && !cadasturVerificado,
        categoria: 'cadastur'
      },
      {
        codigo: 'guia_verificado_cadastur',
        nome: 'Guia verificado',
        descricao: 'CADASTUR conferido e validado pelo Admin PrussikTrails.',
        svg: `${CADASTUR_BASE}/02_guia_verificado.svg`,
        desbloqueada: cadasturVerificado,
        destaque: cadasturVerificado && !cadasturAtivo,
        categoria: 'cadastur'
      },
      {
        codigo: 'cadastur_ativo',
        nome: 'CADASTUR ativo',
        descricao: cadasturValidade
          ? `CADASTUR com validade registrada até ${formatarData(cadasturValidade)}.`
          : 'CADASTUR com validade vigente registrada pelo Admin.',
        svg: `${CADASTUR_BASE}/03_cadastur_ativo.svg`,
        desbloqueada: cadasturAtivo,
        destaque: cadasturAtivo,
        categoria: 'cadastur'
      },
      ...CADASTUR_TIERS.map((tier) => ({
        codigo: tier.codigo,
        nome: tier.nome,
        descricao: tier.descricao,
        svg: tier.svg,
        desbloqueada: cadasturAtivo && anosCadasturAtivo >= tier.anos,
        destaque: cadasturAtivo && anosCadasturAtivo >= tier.anos,
        categoria: 'cadastur' as const
      }))
    ],
    [cadasturInformado, cadasturVerificado, cadasturAtivo, cadasturValidade, anosCadasturAtivo]
  )

  const medalhas: MedalhaGuia[] = useMemo(
    () => [
      {
        codigo: 'guia_pioneiro_beta',
        nome: 'Guia Pioneiro Beta',
        descricao: 'Reconhecimento para guias que participaram da fase inicial da PrussikTrails.',
        svg: `${BETA_BASE}/04_guia_pioneiro_beta.svg`,
        fallbackSvg: `${BETA_FALLBACK_BASE}/04_guia_pioneiro_beta.svg`,
        desbloqueada: guiaPioneiroBeta(),
        destaque: true,
        categoria: 'beta'
      },
      {
        codigo: 'guia_em_jornada',
        nome: 'Guia em Jornada',
        descricao: 'Perfil público ativo na comunidade.',
        svg: `${PROGRESSAO_BASE}/01_mochila_de_partida.svg`,
        desbloqueada: true,
        categoria: 'progressao'
      },
      ...medalhasCadastur,
      {
        codigo: 'condutor_de_base',
        nome: 'Condutor de Base',
        descricao: 'Primeiros roteiros estruturados no app.',
        svg: `${PROGRESSAO_BASE}/02_barraca_base.svg`,
        desbloqueada: stats.totalRoteiros >= 1,
        categoria: 'atuacao'
      },
      {
        codigo: 'comunidade_aquecida',
        nome: 'Comunidade Aquecida',
        descricao: 'Reservas e experiências começam a formar histórico.',
        svg: `${PROGRESSAO_BASE}/03_fogueira_da_jornada.svg`,
        desbloqueada: stats.reservasConfirmadas >= 1,
        categoria: 'atuacao'
      },
      {
        codigo: 'lanterna_da_serra',
        nome: 'Lanterna da Serra',
        descricao: 'Presença ativa em orientação e condução.',
        svg: `${PROGRESSAO_BASE}/04_lanterna_da_serra.svg`,
        desbloqueada: stats.totalKm >= 96,
        categoria: 'progressao'
      },
      {
        codigo: 'rumo_certo',
        nome: 'Rumo Certo',
        descricao: 'Roteiros com leitura clara de jornada e segurança.',
        svg: `${PROGRESSAO_BASE}/05_rumo_certo.svg`,
        desbloqueada: stats.totalKm >= 192,
        categoria: 'progressao'
      },
      {
        codigo: 'prussik',
        nome: 'Técnica Prussik',
        descricao: 'Símbolo de preparo, cuidado e progressão.',
        svg: `${PROGRESSAO_BASE}/06_prussik.svg`,
        desbloqueada: stats.totalKm >= 384,
        categoria: 'progressao'
      },
      {
        codigo: 'cachoeira_viva',
        nome: 'Cachoeira Viva',
        descricao: 'Experiências que criam memória e retorno.',
        svg: `${PROGRESSAO_BASE}/07_cachoeira_viva.svg`,
        desbloqueada: stats.totalClientes >= 5,
        categoria: 'atuacao'
      },
      {
        codigo: 'amanhecer_no_cume',
        nome: 'Amanhecer no Cume',
        descricao: 'Boa reputação registrada pela comunidade.',
        svg: `${PROGRESSAO_BASE}/08_amanhecer_no_cume.svg`,
        desbloqueada: stats.avaliacaoMedia >= 4.5 && stats.totalAvaliacoes >= 3,
        categoria: 'atuacao'
      },
      {
        codigo: 'mapa_lendario',
        nome: 'Mapa Lendário',
        descricao: 'Histórico consolidado de condução e presença outdoor.',
        svg: `${PROGRESSAO_BASE}/10_mapa_lendario.svg`,
        desbloqueada: stats.totalKm >= 768,
        categoria: 'progressao'
      }
    ],
    [guia, stats, medalhasCadastur]
  )

  function enviarReporte() {
    setReportEnviado(true)
  }

  if (carregando) {
    return (
      <main className="loading">
        <style>{estilos}</style>
        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>Carregando perfil público...</div>
        </div>
      </main>
    )
  }

  if (erro || !guia) {
    return (
      <main className="emptyPage">
        <style>{estilos}</style>
        <div className="emptyCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <h1>Perfil não encontrado</h1>
          <p>{erro || 'Não foi possível localizar este guia.'}</p>
          <button type="button" onClick={() => router.push('/roteiros')}>
            Ver roteiros
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{estilos}</style>

      <header className="header">
        <div className="headerInner">
          <button
            type="button"
            className="headerBtn ghost leftAction"
            onClick={() => router.push('/roteiros')}
          >
            Roteiros
          </button>

          <button
            className="brand"
            type="button"
            onClick={() => router.push('/roteiros')}
            aria-label="Voltar para roteiros"
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />
            <span>Perfil público do guia</span>
          </button>

          <button
            type="button"
            className="headerBtn rightAction"
            onClick={() => setReportAberto(true)}
          >
            Reportar
          </button>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroBg" />
          <div className="heroContent">
            <div className="avatarBox">
              {fotoGuia() ? <img src={fotoGuia()} alt={nomeGuia()} /> : <span>{primeiroNome(nomeGuia()).slice(0, 1)}</span>}
              {guiaPioneiroBeta() && <div className="betaSeal">Beta</div>}
            </div>

            <div className="heroTextBlock">
              <div className="eyebrow">Perfil público do guia</div>
              <h1>{nomeGuia()}</h1>
              <p>
                {bioGuia() ||
                  'Guia PrussikTrails em construção de jornada, experiências outdoor e comunidade de aventura.'}
              </p>

              <div className="heroBadges">
                {cadasturInformado && <span>{cadasturLabelPublico}</span>}
                <span>{stats.avaliacaoMedia > 0 ? `${stats.avaliacaoMedia.toFixed(1)} ★` : 'Sem avaliações ainda'}</span>
                <span>{nivelAtual}</span>
                <span>{seguidoresTotal} {seguidoresTotal === 1 ? 'seguidor' : 'seguidores'}</span>
              </div>

              {usuarioLogadoId !== guia.id && (
                <div className="followArea">
                  <button
                    type="button"
                    className={`followButton ${seguindoPerfil ? 'following' : ''}`}
                    onClick={alternarSeguir}
                    disabled={seguindoSalvando}
                  >
                    {seguindoSalvando ? 'Aguarde...' : seguindoPerfil ? 'Seguindo' : 'Seguir'}
                  </button>
                  {seguindoErro && <span className="followError">{seguindoErro}</span>}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="quickStats">
          <article>
            <strong>{stats.totalRoteiros}</strong>
            <span>roteiros</span>
          </article>
          <article>
            <strong>{stats.totalKm.toFixed(0)}</strong>
            <span>km publicados</span>
          </article>
          <article>
            <strong>{stats.totalClientes}</strong>
            <span>clientes</span>
          </article>
          <article>
            <strong>{stats.totalAvaliacoes}</strong>
            <span>avaliações</span>
          </article>
        </section>

        <section className="mainGrid">
          <div className="leftColumn">
            <section className="panel medalsPanel">
              <div className="panelHeader">
                <div>
                  <h2>Medalhas do guia</h2>
                  <p>Conquistas, presença Beta e reputação outdoor em uma única coleção.</p>
                </div>
              </div>

              <div className="medalGrid">
                {medalhas.map((medalha: MedalhaGuia) => (
                  <article
                    key={medalha.codigo}
                    className={`medalCard ${medalha.categoria || ''} ${medalha.desbloqueada ? 'unlocked' : 'locked'} ${medalha.destaque ? 'featured' : ''}`}
                  >
                    <div className="medalImageWrap">
                      <MedalhaImagem src={medalha.svg} fallback={medalha.fallbackSvg} alt={medalha.nome} />
                    </div>
                    <div className="medalName">{medalha.nome}</div>
                    <div className="medalDesc">
                      {medalha.desbloqueada ? medalha.descricao : 'Conquista ainda não desbloqueada.'}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {principaisRoteiros.length > 0 && (
              <section className="panel routesPanel">
                <div className="panelHeader">
                  <div>
                    <h2>Experiências disponíveis</h2>
                    <p>Alguns roteiros publicados por este guia.</p>
                  </div>
                </div>

                <div className="routeGrid">
                  {principaisRoteiros.map((roteiro: Roteiro) => {
                    const foto = fotoRoteiro(roteiro)

                    return (
                      <article className="routeCard" key={roteiro.id} onClick={() => router.push(`/roteiros/${roteiro.id}`)}>
                        <div className="routeImage">
                          {foto ? <img src={foto} alt={tituloRoteiro(roteiro)} /> : <span>RT</span>}
                        </div>
                        <div>
                          <strong>{tituloRoteiro(roteiro)}</strong>
                          <p>{localRoteiro(roteiro)}</p>
                          <div className="routeMeta">
                            <span>{kmRoteiro(roteiro).toFixed(1)} km</span>
                            <span>{formatarMoeda(valorRoteiro(roteiro))}</span>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            )}
          </div>

          <aside className="rightColumn">
            <section className="panel trustPanel">
              <h2>Credenciais</h2>
              <div className="trustList">
                <div>
                  <span>CADASTUR</span>
                  <strong>{cadasturInformado ? cadasturNumero : 'Não informado'}</strong>
                </div>
                <div>
                  <span>Status CADASTUR</span>
                  <strong>{cadasturLabelPublico}</strong>
                </div>
                <div>
                  <span>Fase Beta</span>
                  <strong>{guiaPioneiroBeta() ? 'Guia pioneiro' : 'Guia cadastrado'}</strong>
                </div>
                <div>
                  <span>Comunidade</span>
                  <strong>{stats.totalClientes} cliente(s) atendido(s)</strong>
                </div>
              </div>
              <div className="progressBox">
                <div className="progressHeader">
                  <span>Progressão pública</span>
                  <strong>{progressoKm}%</strong>
                </div>
                <div className="progressTrack">
                  <div style={{ width: `${progressoKm}%` }} />
                </div>
              </div>
            </section>

            <section className="panel reviewsPanel">
              <div className="panelHeader compact">
                <div>
                  <h2>Avaliações</h2>
                  <p>Toque em uma avaliação para ver o perfil público do cliente.</p>
                </div>
              </div>

              {avaliacoes.length === 0 ? (
                <div className="emptyState">Este guia ainda não recebeu avaliações públicas.</div>
              ) : (
                <div className="reviewList">
                  {avaliacoes.slice(0, 8).map((avaliacao: Avaliacao) => (
                    <article
                      key={avaliacao.id}
                      className={`reviewCard ${avaliacao.cliente_id ? 'clickable' : ''}`}
                      onClick={() => {
                        if (avaliacao.cliente_id) router.push(`/cliente/publico/${avaliacao.cliente_id}`)
                      }}
                    >
                      <div className="reviewTop">
                        <div className="reviewAvatar">
                          {avaliacao.cliente_avatar ? (
                            <img src={avaliacao.cliente_avatar} alt={avaliacao.cliente_nome || 'Cliente'} />
                          ) : (
                            <span>{String(avaliacao.cliente_nome || 'C').slice(0, 1)}</span>
                          )}
                        </div>
                        <div>
                          <strong>{avaliacao.cliente_nome || 'Cliente PrussikTrails'}</strong>
                          <span>{formatarData(avaliacao.created_at)}</span>
                        </div>
                      </div>
                      <div className="stars">{estrelas(avaliacao.nota)}</div>
                      <p>{avaliacao.comentario || avaliacao.observacao || avaliacao.descricao || 'Avaliação registrada.'}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </section>
      </div>

      {reportAberto && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="reportModal">
            <div className="reportHeader">
              <div>
                <span>Segurança da comunidade</span>
                <h2>Reportar guia</h2>
                <p>Use este canal para sinalizar uma situação que precise de análise pela equipe.</p>
              </div>
              <button type="button" onClick={() => setReportAberto(false)} aria-label="Fechar">
                ×
              </button>
            </div>

            {reportEnviado ? (
              <div className="reportSuccess">
                <strong>Obrigado pelo cuidado.</strong>
                <p>Seu relato foi registrado nesta sessão para análise. Na próxima etapa, conectaremos este fluxo a uma tabela própria de denúncias.</p>
                <button type="button" onClick={() => setReportAberto(false)}>Fechar</button>
              </div>
            ) : (
              <>
                <label className="field">
                  <span>Motivo</span>
                  <select value={reportMotivo} onChange={(event) => setReportMotivo(event.target.value as ReportReason)}>
                    <option value="seguranca">Segurança</option>
                    <option value="conduta">Conduta</option>
                    <option value="informacao">Informação incorreta</option>
                    <option value="pagamento">Pagamento/serviço</option>
                    <option value="outro">Outro</option>
                  </select>
                </label>
                <label className="field">
                  <span>Observação</span>
                  <textarea
                    value={reportTexto}
                    onChange={(event) => setReportTexto(event.target.value)}
                    placeholder="Descreva brevemente o ocorrido."
                    rows={5}
                  />
                </label>
                <div className="modalActions">
                  <button type="button" className="secondary" onClick={() => setReportAberto(false)}>Cancelar</button>
                  <button type="button" className="primary" onClick={enviarReporte}>Enviar relato</button>
                </div>
              </>
            )}
          </div>
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

  .page,
  .loading,
  .emptyPage {
    min-height: 100vh;
    min-height: 100dvh;
    background:
      radial-gradient(circle at 10% 0%, rgba(132,204,22,0.16), transparent 28%),
      radial-gradient(circle at 90% 10%, rgba(251,146,60,0.14), transparent 28%),
      linear-gradient(180deg,#fffdf7 0%,#f3f5ea 48%,#eef2e5 100%);
    color: #172018;
  }

  .loading,
  .emptyPage {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .loadingCard,
  .emptyCard {
    width: min(430px, 100%);
    background: rgba(255,255,255,0.92);
    border: 1px solid rgba(15,23,42,0.06);
    border-radius: 30px;
    padding: 28px;
    text-align: center;
    box-shadow: 0 20px 50px rgba(15,23,42,0.08);
  }

  .loadingCard img,
  .emptyCard img {
    height: 64px;
    width: auto;
    margin-bottom: 12px;
  }

  .emptyCard h1 {
    margin: 0;
    font-size: 24px;
    letter-spacing: -0.05em;
  }

  .emptyCard p {
    color: #64748b;
    font-size: 14px;
    line-height: 1.5;
    margin: 10px 0 18px;
    font-weight: 700;
  }

  .emptyCard button {
    border: 0;
    border-radius: 999px;
    background: #172018;
    color: #fff;
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
  }

  .header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(255,253,247,0.90);
    border-bottom: 1px solid rgba(15,23,42,0.06);
    backdrop-filter: blur(18px);
    padding: 8px 14px;
  }

  .headerInner {
    max-width: 1180px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 92px minmax(0, 1fr) 92px;
    align-items: center;
    gap: 10px;
  }

  .brand {
    min-width: 0;
    max-width: min(540px, calc(100vw - 210px));
    justify-self: center;
    border: 0;
    background: transparent;
    padding: 0;
    cursor: pointer;
    text-align: center;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .brand img {
    width: clamp(154px, 36vw, 260px);
    max-width: 100%;
    max-height: 60px;
    height: auto;
    object-fit: contain;
    display: block;
  }

  .brand span {
    display: block;
    color: #7b8372;
    font-size: clamp(8px, 1.05vw, 12px);
    font-weight: 850;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    white-space: nowrap;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: -2px;
  }

  .headerBtn {
    border: 1px solid rgba(15,23,42,0.08);
    background: #172018;
    color: #fffdf7;
    border-radius: 999px;
    padding: 10px 13px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 950;
    white-space: nowrap;
  }

  .headerBtn.ghost {
    background: rgba(255,255,255,0.84);
    color: #172018;
  }

  .leftAction {
    justify-self: start;
  }

  .rightAction {
    justify-self: end;
  }

  .container {
    max-width: 1180px;
    margin: 0 auto;
    padding: 22px 16px 56px;
  }

  .hero {
    position: relative;
    overflow: hidden;
    border-radius: 36px;
    background:
      radial-gradient(circle at 14% 10%, rgba(190,242,100,0.26), transparent 28%),
      linear-gradient(135deg, #1d2e20 0%, #526e3f 54%, #d9c49a 100%);
    min-height: 318px;
    box-shadow: 0 24px 60px rgba(23,32,24,0.18);
  }

  .heroBg {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
    background-size: 46px 46px;
    opacity: 0.8;
    mask-image: linear-gradient(to bottom, black, transparent 82%);
  }

  .heroContent {
    position: relative;
    z-index: 2;
    min-height: 318px;
    padding: 30px;
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    align-items: end;
    gap: 24px;
    color: #fffdf7;
  }

  .avatarBox {
    position: relative;
    width: 160px;
    height: 160px;
    border-radius: 42px;
    overflow: visible;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.22);
    box-shadow: 0 18px 40px rgba(0,0,0,0.16);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(12px);
  }

  .avatarBox img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: inherit;
  }

  .avatarBox > span {
    font-size: 58px;
    font-family: Georgia, 'Times New Roman', serif;
    font-weight: 900;
    color: #f7fee7;
  }

  .betaSeal {
    position: absolute;
    right: -8px;
    bottom: -8px;
    background: #991b1b;
    border: 3px solid #fffdf7;
    color: #fff;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .eyebrow {
    display: inline-flex;
    width: fit-content;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.24);
    background: rgba(255,255,255,0.12);
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 14px;
  }

  .heroTextBlock h1 {
    margin: 0;
    max-width: 760px;
    font-size: clamp(38px, 6vw, 76px);
    line-height: 0.9;
    font-weight: 950;
    letter-spacing: -0.085em;
  }

  .heroTextBlock p {
    max-width: 720px;
    margin: 16px 0 0;
    color: rgba(255,255,255,0.84);
    font-size: 15px;
    line-height: 1.6;
    font-weight: 650;
  }

  .heroBadges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 16px;
  }

  .heroBadges span {
    border-radius: 999px;
    background: rgba(255,255,255,0.14);
    border: 1px solid rgba(255,255,255,0.18);
    padding: 8px 11px;
    font-size: 12px;
    font-weight: 900;
  }

  .quickStats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin: 16px 0;
  }

  .quickStats article,
  .panel {
    background: rgba(255,255,255,0.88);
    border: 1px solid rgba(15,23,42,0.06);
    border-radius: 30px;
    box-shadow: 0 12px 34px rgba(15,23,42,0.06);
  }

  .quickStats article {
    padding: 16px;
    text-align: center;
  }

  .quickStats strong {
    display: block;
    color: #172018;
    font-size: 28px;
    font-weight: 950;
    letter-spacing: -0.06em;
  }

  .quickStats span {
    display: block;
    margin-top: 4px;
    color: #64748b;
    font-size: 12px;
    font-weight: 850;
  }

  .mainGrid {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(340px, 0.9fr);
    gap: 16px;
    align-items: start;
  }

  .leftColumn,
  .rightColumn {
    display: grid;
    gap: 16px;
  }

  .panel {
    overflow: hidden;
  }

  .panelHeader {
    padding: 20px 22px;
    border-bottom: 1px solid rgba(15,23,42,0.06);
  }

  .panelHeader.compact {
    padding-bottom: 12px;
  }

  .panel h2,
  .panelHeader h2 {
    margin: 0;
    color: #172018;
    font-size: 22px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.055em;
  }

  .panelHeader p {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 750;
  }

  .medalGrid {
    padding: 16px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .medalCard {
    min-height: 232px;
    border-radius: 26px;
    border: 1px solid rgba(15,23,42,0.06);
    background:
      radial-gradient(circle at top right, rgba(251,146,60,0.08), transparent 30%),
      #fffdf7;
    padding: 12px;
    text-align: center;
    transition: 0.2s ease;
  }

  .medalCard.featured {
    border-color: rgba(153,27,27,0.22);
    background:
      radial-gradient(circle at top right, rgba(153,27,27,0.12), transparent 32%),
      #fffdf7;
  }

  .medalCard.cadastur {
    border-color: rgba(37,99,235,0.16);
    background:
      radial-gradient(circle at top right, rgba(219,234,254,0.80), transparent 34%),
      #fffdf7;
  }

    .medalCard.locked {
    opacity: 0.48;
    filter: grayscale(0.74);
  }

  .medalImageWrap {
    width: 118px;
    height: 118px;
    margin: 0 auto 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .medalSvg {
    width: 118px;
    height: 118px;
    object-fit: contain;
    display: block;
  }

  .medalFallback {
    font-size: 48px;
  }

  .medalName {
    color: #172018;
    font-size: 13px;
    font-weight: 950;
    line-height: 1.22;
    letter-spacing: -0.02em;
  }

  .medalDesc {
    margin-top: 5px;
    color: #64748b;
    font-size: 11px;
    line-height: 1.35;
    font-weight: 700;
  }

  .routesPanel,
  .trustPanel,
  .reviewsPanel {
    padding-bottom: 16px;
  }

  .routeGrid {
    padding: 16px;
    display: grid;
    gap: 12px;
  }

  .routeCard {
    display: grid;
    grid-template-columns: 94px minmax(0, 1fr);
    gap: 13px;
    align-items: center;
    border-radius: 24px;
    background: #fffdf7;
    border: 1px solid rgba(15,23,42,0.06);
    padding: 12px;
    cursor: pointer;
    transition: 0.2s ease;
  }

  .routeCard:hover,
  .reviewCard.clickable:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 30px rgba(15,23,42,0.08);
  }

  .routeImage {
    width: 94px;
    height: 84px;
    border-radius: 22px;
    background: #e8eadf;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    color: #64748b;
    font-weight: 950;
  }

  .routeImage img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .routeCard strong {
    display: block;
    color: #172018;
    font-size: 14px;
    font-weight: 950;
    line-height: 1.25;
  }

  .routeCard p {
    margin: 5px 0 0;
    color: #64748b;
    font-size: 12px;
    font-weight: 750;
  }

  .routeMeta {
    margin-top: 8px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .routeMeta span {
    border-radius: 999px;
    background: #f0fdf4;
    color: #166534;
    padding: 6px 9px;
    font-size: 11px;
    font-weight: 950;
  }

  .trustPanel {
    padding: 20px;
  }

  .trustPanel h2 {
    margin-bottom: 14px;
  }

  .trustList {
    display: grid;
    gap: 10px;
  }

  .trustList div {
    border-radius: 20px;
    background: #fffdf7;
    border: 1px solid rgba(15,23,42,0.06);
    padding: 12px;
  }

  .trustList span,
  .progressHeader span {
    display: block;
    color: #64748b;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .trustList strong,
  .progressHeader strong {
    display: block;
    margin-top: 4px;
    color: #172018;
    font-size: 14px;
    font-weight: 950;
  }

  .progressBox {
    margin-top: 14px;
    border-radius: 20px;
    background: #fffdf7;
    border: 1px solid rgba(15,23,42,0.06);
    padding: 12px;
  }

  .progressHeader {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
  }

  .progressTrack {
    margin-top: 10px;
    height: 9px;
    border-radius: 999px;
    background: rgba(15,23,42,0.08);
    overflow: hidden;
  }

  .progressTrack div {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #365314, #84cc16, #f97316);
  }

  .reviewList {
    padding: 16px;
    display: grid;
    gap: 12px;
  }

  .reviewCard {
    border-radius: 24px;
    background: #fffdf7;
    border: 1px solid rgba(15,23,42,0.06);
    padding: 13px;
    transition: 0.2s ease;
  }

  .reviewCard.clickable {
    cursor: pointer;
  }

  .reviewTop {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
  }

  .reviewAvatar {
    width: 44px;
    height: 44px;
    border-radius: 16px;
    overflow: hidden;
    background: #e8eadf;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #172018;
    font-weight: 950;
  }

  .reviewAvatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .reviewTop strong {
    display: block;
    color: #172018;
    font-size: 13px;
    font-weight: 950;
  }

  .reviewTop span {
    display: block;
    margin-top: 3px;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 800;
  }

  .stars {
    margin-top: 9px;
    color: #d97706;
    letter-spacing: 0.06em;
    font-size: 13px;
  }

  .reviewCard p {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.45;
    font-weight: 700;
  }

  .emptyState {
    margin: 16px;
    padding: 22px;
    text-align: center;
    color: #64748b;
    font-size: 13px;
    font-weight: 750;
    border-radius: 22px;
    background: #fffdf7;
    border: 1px dashed #cbd5e1;
  }

  .modalOverlay {
    position: fixed;
    inset: 0;
    z-index: 110;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background: rgba(8,13,7,0.58);
    backdrop-filter: blur(10px);
  }

  .reportModal {
    width: min(560px, 100%);
    border-radius: 30px;
    border: 1px solid rgba(255,255,255,0.56);
    background:
      radial-gradient(circle at 10% 0%, rgba(132,204,22,0.16), transparent 30%),
      linear-gradient(180deg, #fffdf7 0%, #f3f5ea 100%);
    box-shadow: 0 32px 90px rgba(0,0,0,0.34);
    padding: 20px;
  }

  .reportHeader {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 16px;
  }

  .reportHeader span {
    color: #991b1b;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .reportHeader h2 {
    margin: 5px 0 0;
    color: #172018;
    font-size: 28px;
    font-weight: 950;
    letter-spacing: -0.06em;
  }

  .reportHeader p {
    margin: 8px 0 0;
    color: #64748b;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 700;
  }

  .reportHeader button {
    width: 38px;
    height: 38px;
    border-radius: 999px;
    border: 1px solid rgba(15,23,42,0.08);
    background: rgba(255,255,255,0.78);
    color: #172018;
    font-size: 26px;
    line-height: 1;
    cursor: pointer;
  }

  .field {
    display: block;
    margin-top: 12px;
  }

  .field span {
    display: block;
    color: #25311f;
    font-size: 13px;
    font-weight: 900;
    margin-bottom: 7px;
  }

  .field select,
  .field textarea {
    width: 100%;
    border: 1px solid rgba(62,74,45,0.14);
    border-radius: 18px;
    background: rgba(255,255,255,0.78);
    color: #172018;
    padding: 13px 14px;
    font-size: 14px;
    outline: 0;
  }

  .field textarea {
    resize: vertical;
    min-height: 120px;
  }

  .modalActions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 16px;
  }

  .modalActions button,
  .reportSuccess button {
    border-radius: 999px;
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
  }

  .primary,
  .reportSuccess button {
    border: 0;
    background: #991b1b;
    color: #fffdf7;
  }

  .secondary {
    background: rgba(255,255,255,0.75);
    color: #27321f;
    border: 1px solid rgba(62,74,45,0.12);
  }

  .reportSuccess {
    border-radius: 22px;
    background: #fffdf7;
    border: 1px solid rgba(15,23,42,0.06);
    padding: 16px;
  }

  .reportSuccess strong {
    color: #172018;
    font-size: 18px;
    font-weight: 950;
  }

  .reportSuccess p {
    color: #64748b;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 700;
  }


  .followArea {
    margin-top: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .followButton {
    min-height: 42px;
    border: 0;
    border-radius: 999px;
    padding: 0 18px;
    background: #203c2e;
    color: #fffdf7;
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
    box-shadow: 0 14px 28px rgba(32, 60, 46, 0.18);
    transition: 0.18s ease;
  }

  .followButton:hover {
    transform: translateY(-1px);
    box-shadow: 0 18px 34px rgba(32, 60, 46, 0.22);
  }

  .followButton.following {
    background: rgba(255, 253, 247, 0.88);
    color: #203c2e;
    border: 1px solid rgba(32, 60, 46, 0.20);
    box-shadow: none;
  }

  .followButton:disabled {
    opacity: 0.62;
    cursor: not-allowed;
    transform: none;
  }

  .followError {
    max-width: 280px;
    color: #991b1b;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.35;
  }

  @media (max-width: 980px) {
    .mainGrid {
      grid-template-columns: 1fr;
    }

    .medalGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .header {
      padding: 7px 10px;
    }

    .headerInner {
      grid-template-columns: 40px minmax(0, 1fr) 40px;
      gap: 8px;
    }

    .brand {
      max-width: calc(100vw - 96px);
    }

    .brand img {
      width: clamp(136px, 48vw, 214px);
      max-height: 50px;
    }

    .brand span {
      font-size: 7.5px;
      letter-spacing: 0.10em;
      max-width: calc(100vw - 112px);
    }

    .headerBtn {
      width: 36px;
      height: 36px;
      border-radius: 999px;
      padding: 0;
      font-size: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .headerBtn.ghost::before {
      content: '‹';
      font-size: 23px;
      line-height: 1;
      font-weight: 950;
    }

    .rightAction::before {
      content: '!';
      font-size: 14px;
      line-height: 1;
      font-weight: 950;
    }

    .container {
      padding: 14px 12px 42px;
    }

    .hero {
      border-radius: 28px;
      min-height: auto;
    }

    .heroContent {
      min-height: auto;
      padding: 18px;
      grid-template-columns: 88px minmax(0, 1fr);
      align-items: center;
      gap: 14px;
    }

    .avatarBox {
      width: 84px;
      height: 84px;
      border-radius: 24px;
    }

    .avatarBox > span {
      font-size: 34px;
    }

    .betaSeal {
      right: -4px;
      bottom: -5px;
      padding: 5px 8px;
      font-size: 9px;
      border-width: 2px;
    }

    .eyebrow {
      display: none;
    }

    .heroTextBlock h1 {
      font-size: clamp(26px, 8vw, 36px);
      letter-spacing: -0.075em;
      line-height: 0.95;
    }

    .heroTextBlock p {
      font-size: 12px;
      line-height: 1.42;
      margin-top: 8px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .heroBadges {
      margin-top: 10px;
      gap: 6px;
    }

    .heroBadges span {
      padding: 6px 8px;
      font-size: 10px;
    }

    .followArea {
      margin-top: 12px;
      gap: 7px;
    }

    .followButton {
      min-height: 38px;
      padding: 0 15px;
      font-size: 12px;
    }

    .quickStats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .quickStats article {
      padding: 12px;
      border-radius: 22px;
    }

    .quickStats strong {
      font-size: 23px;
    }

    .panel {
      border-radius: 26px;
    }

    .panelHeader {
      padding: 16px;
    }

    .panel h2,
    .panelHeader h2 {
      font-size: 20px;
    }

    .panelHeader p {
      font-size: 12px;
    }

    .medalGrid {
      padding: 12px;
      gap: 10px;
    }

    .medalCard {
      min-height: 196px;
      border-radius: 22px;
      padding: 9px;
    }

    .medalImageWrap,
    .medalSvg {
      width: 108px;
      height: 108px;
    }

    .medalDesc {
      display: none;
    }

    .routeCard {
      grid-template-columns: 76px minmax(0, 1fr);
      border-radius: 22px;
    }

    .routeImage {
      width: 76px;
      height: 72px;
      border-radius: 18px;
    }

    .modalOverlay {
      align-items: flex-end;
      padding: 10px;
    }

    .reportModal {
      border-radius: 26px;
      max-height: 88vh;
      overflow: auto;
    }

    .modalActions {
      flex-direction: column-reverse;
    }

    .modalActions button {
      width: 100%;
    }
  }

`
