'use client'

import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import AvatarCropModal from '@/components/AvatarCropModal'

type UsuarioLocal = {
  id: string
  nome?: string | null
  email?: string | null
  tipo?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
}

type Roteiro = {
  id: string
  titulo?: string | null
  nome?: string | null
  km?: number | null
  distancia_km?: number | null
  preco?: number | null
  valor?: number | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  local?: string | null
  localizacao?: string | null
  id_guia?: string | null
  guia_id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  status?: string | null
}

type Reserva = {
  id: string
  roteiro_id?: string | null
  cliente_id?: string | null
  status?: string | null
  pagamento_status?: string | null
  valor_total?: number | null
  created_at?: string | null
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
  [key: string]: any
}


type SuporteChamado = {
  id: string
  usuario_id?: string | null
  tipo_usuario?: string | null
  tipo_chamado?: 'bug' | 'suporte' | 'sugestao' | string | null
  assunto?: string | null
  descricao?: string | null
  prioridade?: string | null
  status?: string | null
  resposta_admin?: string | null
  respondido_em?: string | null
  created_at?: string | null
  updated_at?: string | null
  pagina_origem?: string | null
  finalizado_pelo_usuario?: boolean | null
  finalizado_por_id?: string | null
  finalizado_por_tipo?: string | null
  finalizado_em?: string | null
  avaliacao_resposta_nota?: number | null
  avaliacao_resposta_comentario?: string | null
  avaliacao_resposta_em?: string | null
  [key: string]: any
}

type Stats = {
  totalRoteiros: number
  totalReservas: number
  reservasConfirmadas: number
  totalClientes: number
  totalKm: number
  avaliacaoMedia: number
  totalAvaliacoes: number
}

type MedalhaGuiaVisual = {
  nome: string
  subtitulo?: string
  svg: string
  desbloqueado: boolean
  destaque?: boolean
  categoria: 'progressao' | 'cadastur' | 'beta' | 'atuacao'
}

const statsInicial: Stats = {
  totalRoteiros: 0,
  totalReservas: 0,
  reservasConfirmadas: 0,
  totalClientes: 0,
  totalKm: 0,
  avaliacaoMedia: 0,
  totalAvaliacoes: 0
}

const PIX_TIPOS = [
  { value: '', label: 'Selecione o tipo da chave' },
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'aleatoria', label: 'Chave aleatória' }
]

const MEDALHA_PROGRESSAO_BASE = '/medalhas/progressao'
const MEDALHA_BETA_BASE = '/medalhas/iniciais_jornada'
const MEDALHA_CADASTUR_BASE = '/medalhas/cadastur'

const METAS_KM_GUIA = [
  {
    km: 0,
    nome: 'Mochila de Partida',
    icone: '🎒',
    svg: `${MEDALHA_PROGRESSAO_BASE}/01_mochila_de_partida.svg`
  },
  {
    km: 32,
    nome: 'Barraca Base',
    icone: '⛺',
    svg: `${MEDALHA_PROGRESSAO_BASE}/02_barraca_base.svg`
  },
  {
    km: 96,
    nome: 'Fogueira da Jornada',
    icone: '🔥',
    svg: `${MEDALHA_PROGRESSAO_BASE}/03_fogueira_da_jornada.svg`
  },
  {
    km: 192,
    nome: 'Lanterna da Serra',
    icone: '🏮',
    svg: `${MEDALHA_PROGRESSAO_BASE}/04_lanterna_da_serra.svg`
  },
  {
    km: 384,
    nome: 'Rumo Certo',
    icone: '🪧',
    svg: `${MEDALHA_PROGRESSAO_BASE}/05_rumo_certo.svg`
  },
  {
    km: 768,
    nome: 'Prussik',
    icone: '🧗',
    svg: `${MEDALHA_PROGRESSAO_BASE}/06_prussik.svg`
  },
  {
    km: 1152,
    nome: 'Cachoeira Viva',
    icone: '💧',
    svg: `${MEDALHA_PROGRESSAO_BASE}/07_cachoeira_viva.svg`
  },
  {
    km: 1920,
    nome: 'Amanhecer no Cume',
    icone: '🌄',
    svg: `${MEDALHA_PROGRESSAO_BASE}/08_amanhecer_no_cume.svg`
  },
  {
    km: 3840,
    nome: 'Mirante do Explorador',
    icone: '🔭',
    svg: `${MEDALHA_PROGRESSAO_BASE}/09_mirante_do_explorador.svg`
  },
  {
    km: 7680,
    nome: 'Mapa Lendário',
    icone: '🗺️',
    svg: `${MEDALHA_PROGRESSAO_BASE}/10_mapa_lendario.svg`
  }
]

const CADASTUR_TIERS = [
  {
    anos: 1,
    nome: 'CADASTUR Bronze',
    subtitulo: '1 ano com CADASTUR ativo',
    svg: `${MEDALHA_CADASTUR_BASE}/cadastur_bronze.svg`
  },
  {
    anos: 2,
    nome: 'CADASTUR Prata',
    subtitulo: '2 anos com CADASTUR ativo',
    svg: `${MEDALHA_CADASTUR_BASE}/cadastur_prata.svg`
  },
  {
    anos: 3,
    nome: 'CADASTUR Ouro',
    subtitulo: '3 anos com CADASTUR ativo',
    svg: `${MEDALHA_CADASTUR_BASE}/cadastur_ouro.svg`
  },
  {
    anos: 5,
    nome: 'CADASTUR Platina',
    subtitulo: '5 anos com CADASTUR ativo',
    svg: `${MEDALHA_CADASTUR_BASE}/cadastur_platina.svg`
  },
  {
    anos: 10,
    nome: 'CADASTUR Onyx',
    subtitulo: '10 anos com CADASTUR ativo',
    svg: `${MEDALHA_CADASTUR_BASE}/cadastur_onyx.svg`
  }
]

function normalizar(valor: any) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function classeVisualMedalha(valor?: string | null) {
  return normalizar(valor)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function numero(valor: any) {
  const n = Number(valor || 0)
  return Number.isFinite(n) ? n : 0
}

function dataValidaFutura(valor?: string | null) {
  if (!valor) return false
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return false

  const fimDoDia = new Date(data)
  fimDoDia.setHours(23, 59, 59, 999)

  return fimDoDia.getTime() >= Date.now()
}

function anosDesde(valor?: string | null) {
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

export default function PerfilGuiaPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [guia, setGuia] = useState<any>(null)

  const [bio, setBio] = useState('')
  const [nomePerfil, setNomePerfil] = useState('')
  const [editandoBio, setEditandoBio] = useState(false)

  const [pixTipo, setPixTipo] = useState('')
  const [pixChave, setPixChave] = useState('')
  const [cadastur, setCadastur] = useState('')

  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarCropSrc, setAvatarCropSrc] = useState('')
  const [enviandoAvatar, setEnviandoAvatar] = useState(false)

  const [stats, setStats] = useState<Stats>(statsInicial)
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])

  const [carregando, setCarregando] = useState(true)
  const [salvandoBio, setSalvandoBio] = useState(false)
  const [salvandoDados, setSalvandoDados] = useState(false)
  const [modalDadosGuiaAberto, setModalDadosGuiaAberto] = useState(false)
  const [medalhaSelecionada, setMedalhaSelecionada] = useState<MedalhaGuiaVisual | null>(null)

  const [menuAberto, setMenuAberto] = useState(false)
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [alterandoSenha, setAlterandoSenha] = useState(false)

  const [modalSuporteAberto, setModalSuporteAberto] = useState(false)
  const [tipoSuporte, setTipoSuporte] = useState<'bug' | 'suporte' | 'sugestao'>('suporte')
  const [assuntoSuporte, setAssuntoSuporte] = useState('')
  const [descricaoSuporte, setDescricaoSuporte] = useState('')
  const [prioridadeSuporte, setPrioridadeSuporte] = useState<'baixa' | 'normal' | 'alta' | 'urgente'>('normal')
  const [enviandoSuporte, setEnviandoSuporte] = useState(false)
  const [erroSuporte, setErroSuporte] = useState('')
  const [chamadosSuporte, setChamadosSuporte] = useState<SuporteChamado[]>([])
  const [carregandoChamadosSuporte, setCarregandoChamadosSuporte] = useState(false)
  const [avaliandoChamadoId, setAvaliandoChamadoId] = useState('')
  const [notaAvaliacaoSuporte, setNotaAvaliacaoSuporte] = useState(5)
  const [comentarioAvaliacaoSuporte, setComentarioAvaliacaoSuporte] = useState('')
  const [finalizandoChamadoId, setFinalizandoChamadoId] = useState('')
  const [erroFinalizarSuporte, setErroFinalizarSuporte] = useState('')

  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    iniciar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const formatarMoeda = (valor: any) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(valor || 0))
  }

  const formatarData = (valor?: string | null) => {
    if (!valor) return ''

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return ''

    return data.toLocaleDateString('pt-BR')
  }

  const nomeGuia = () => {
    return guia?.nome || user?.nome || user?.email || 'Guia PrussikTrails'
  }

  const avatarGuia = () => {
    return (
      avatarPreview ||
      guia?.avatar_url ||
      guia?.foto_url ||
      guia?.imagem_url ||
      ''
    )
  }

  const fotoRoteiro = (roteiro: Roteiro) => {
    return roteiro.foto_capa || roteiro.foto_url || roteiro.imagem_url || ''
  }

  const valorRoteiro = (roteiro: Roteiro) => {
    return Number(roteiro.preco || roteiro.valor || 0)
  }

  const kmRoteiro = (roteiro: Roteiro) => {
    return Number(roteiro.km || roteiro.distancia_km || 0)
  }

  const getNivelPorKm = (km: number) => {
    for (let i = METAS_KM_GUIA.length - 1; i >= 0; i--) {
      if (km >= METAS_KM_GUIA[i].km) return METAS_KM_GUIA[i]
    }

    return METAS_KM_GUIA[0]
  }

  const calcularProximoMarcoKm = (km: number) => {
    for (const meta of METAS_KM_GUIA) {
      if (km < meta.km) return meta.km
    }

    return METAS_KM_GUIA[METAS_KM_GUIA.length - 1].km
  }

  const calcularMarcoAnteriorKm = (km: number) => {
    let anterior = 0

    for (const meta of METAS_KM_GUIA) {
      if (km >= meta.km) anterior = meta.km
    }

    return anterior
  }

  const calcularProgressoKm = (km: number) => {
    const proximo = calcularProximoMarcoKm(km)
    const anterior = calcularMarcoAnteriorKm(km)

    if (proximo <= anterior) return 100

    return Math.max(0, Math.min(((km - anterior) / (proximo - anterior)) * 100, 100))
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

  const extrairColunaAusente = (error: any) => {
    const texto = [error?.message, error?.details, error?.hint]
      .filter(Boolean)
      .join(' ')

    const matchAspas = texto.match(/'([^']+)'/)
    if (matchAspas?.[1]) return matchAspas[1]

    const matchColumn = texto.match(/column\s+([a-zA-Z0-9_]+)/i)
    if (matchColumn?.[1]) return matchColumn[1]

    return ''
  }

  const atualizarUsuarioComFallback = async (
    userId: string,
    payloadOriginal: Record<string, any>
  ) => {
    let payloadAtual = { ...payloadOriginal }

    for (let tentativa = 0; tentativa < 18; tentativa++) {
      const { data, error } = await supabase
        .from('users')
        .update(payloadAtual)
        .eq('id', userId)
        .select('*')
        .maybeSingle()

      if (!error) return data

      if (!erroDeColunaAusente(error)) throw error

      const coluna = extrairColunaAusente(error)

      if (!coluna || !(coluna in payloadAtual)) throw error

      delete payloadAtual[coluna]
    }

    throw new Error('Não foi possível atualizar o perfil após ajustar colunas.')
  }

  const buscarRoteirosDoGuia = async (guiaId: string) => {
    const campos = ['id_guia', 'guia_id', 'user_id', 'usuario_id']
    const mapa = new Map<string, Roteiro>()

    for (const campo of campos) {
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .eq(campo, guiaId)

      if (!error && data) {
        ;(data as Roteiro[]).forEach((roteiro) => {
          if (roteiro?.id) mapa.set(roteiro.id, roteiro)
        })
      }
    }

    return Array.from(mapa.values())
  }

  const buscarAvaliacoesDoGuia = async (guiaId: string) => {
    const campos = ['guia_id', 'id_guia']
    let lista: Avaliacao[] = []

    for (const campo of campos) {
      const { data, error } = await supabase
        .from('avaliacoes')
        .select('*')
        .eq(campo, guiaId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        lista = data as Avaliacao[]
        break
      }
    }

    const clienteIds = Array.from(
      new Set(
        lista
          .map((avaliacao) => avaliacao.cliente_id)
          .filter(Boolean) as string[]
      )
    )

    if (clienteIds.length === 0) return lista

    const { data: clientes } = await supabase
      .from('users')
      .select('id, nome, email, avatar_url, foto_url, imagem_url')
      .in('id', clienteIds)

    return lista.map((avaliacao) => {
      const cliente = (clientes || []).find((item: any) => item.id === avaliacao.cliente_id)

      return {
        ...avaliacao,
        cliente_nome: cliente?.nome || cliente?.email || 'Cliente',
        cliente_avatar: cliente?.avatar_url || cliente?.foto_url || cliente?.imagem_url || ''
      }
    })
  }

  const carregarDados = async (guiaId: string) => {
    try {
      const { data: guiaData, error: guiaError } = await supabase
        .from('users')
        .select('*')
        .eq('id', guiaId)
        .maybeSingle()

      if (guiaError) {
        console.warn('Erro ao buscar guia:', guiaError)
      }

      if (guiaData) {
        setGuia(guiaData)
        setNomePerfil(guiaData.nome || '')
        setBio(guiaData.bio_guia || guiaData.bio || '')
        setPixTipo(guiaData.pix_tipo || '')
        setPixChave(guiaData.pix_chave || '')
        setCadastur(guiaData.cadastur || guiaData.cadastur_numero || '')
        setAvatarPreview(guiaData.avatar_url || guiaData.foto_url || guiaData.imagem_url || '')
      }

      const roteirosDoGuia = await buscarRoteirosDoGuia(guiaId)
      setRoteiros(roteirosDoGuia)

      const roteiroIds = roteirosDoGuia.map((roteiro) => roteiro.id).filter(Boolean)

      let reservas: Reserva[] = []

      if (roteiroIds.length > 0) {
        const { data: reservasData, error: reservasError } = await supabase
          .from('reservas')
          .select('*')
          .in('roteiro_id', roteiroIds)

        if (reservasError) {
          console.warn('Erro ao buscar reservas do guia:', reservasError)
        } else {
          reservas = (reservasData || []) as Reserva[]
        }
      }

      const avaliacoesDoGuia = await buscarAvaliacoesDoGuia(guiaId)
      setAvaliacoes(avaliacoesDoGuia)

      const totalKm = roteirosDoGuia.reduce(
        (total, roteiro) => total + kmRoteiro(roteiro),
        0
      )

      const reservasConfirmadas = reservas.filter(pagamentoConfirmado)

      const clientesUnicos = new Set(
        reservas
          .map((reserva) => reserva.cliente_id)
          .filter(Boolean)
      )

      const avaliacaoMedia =
        avaliacoesDoGuia.length > 0
          ? avaliacoesDoGuia.reduce((total, avaliacao) => total + Number(avaliacao.nota || 0), 0) / avaliacoesDoGuia.length
          : 0

      setStats({
        totalRoteiros: roteirosDoGuia.length,
        totalReservas: reservas.length,
        reservasConfirmadas: reservasConfirmadas.length,
        totalClientes: clientesUnicos.size,
        totalKm,
        avaliacaoMedia,
        totalAvaliacoes: avaliacoesDoGuia.length
      })
    } catch (error) {
      console.error('Erro ao carregar dados do perfil:', error)
      setErro('Não foi possível carregar todos os dados do perfil.')
    }
  }

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
      await carregarDados(parsedUser.id)
    } catch (error) {
      console.error('Erro ao iniciar perfil do guia:', error)
      setErro('Não foi possível carregar seu perfil agora.')
    } finally {
      setCarregando(false)
    }
  }

  const salvarBio = async () => {
    if (!user?.id) return

    const nomeLimpo = String(nomePerfil || '').trim()
    const bioLimpa = String(bio || '').trim()

    if (!nomeLimpo) {
      setErro('Informe o nome público do guia.')
      return
    }

    setSalvandoBio(true)
    setErro('')
    setMensagem('')

    try {
      let usuarioPerfilAtualizado: Record<string, any> = {}

      try {
        const perfilResponse = await fetch('/api/usuario/perfil', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: user.id,
            usuarioId: user.id,
            usuario_id: user.id,
            guiaId: user.id,
            tipoUsuario: 'guia',
            tipo: 'guia',
            nome: nomeLimpo
          })
        })

        const perfilData = await perfilResponse.json().catch(() => null)

        if (!perfilResponse.ok || perfilData?.sucesso === false || perfilData?.success === false) {
          throw new Error(
            perfilData?.erro ||
              perfilData?.error ||
              perfilData?.message ||
              `Erro HTTP ${perfilResponse.status} ao salvar nome público.`
          )
        }

        usuarioPerfilAtualizado = perfilData?.usuario || perfilData?.user || perfilData?.data || {}
      } catch (perfilError) {
        console.warn('Fallback ao salvar nome do guia pelo Supabase:', perfilError)

        const usuarioNomeAtualizado = await atualizarUsuarioComFallback(user.id, {
          nome: nomeLimpo,
          updated_at: new Date().toISOString()
        })

        usuarioPerfilAtualizado = usuarioNomeAtualizado || {}
      }

      const bioResponse = await fetch('/api/usuario/bio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          usuarioId: user.id,
          usuario_id: user.id,
          guiaId: user.id,
          tipoUsuario: 'guia',
          tipo: 'guia',
          bio: bioLimpa
        })
      })

      const bioData = await bioResponse.json().catch(() => null)

      if (!bioResponse.ok || bioData?.sucesso === false || bioData?.success === false) {
        throw new Error(
          bioData?.erro ||
            bioData?.error ||
            bioData?.message ||
            `Erro HTTP ${bioResponse.status} ao salvar biografia.`
        )
      }

      const bioSalva = String(bioData?.bio ?? bioData?.usuario?.bio_guia ?? bioData?.usuario?.bio ?? bioLimpa)
      const usuarioBioAtualizado = bioData?.usuario || bioData?.user || bioData?.data || {}

      const usuarioAtualizado = {
        ...usuarioPerfilAtualizado,
        ...usuarioBioAtualizado,
        nome: nomeLimpo,
        bio_guia: bioSalva,
        bio: bioSalva
      }

      setGuia((prev: any) => ({
        ...prev,
        ...usuarioAtualizado
      }))

      const localUserAtualizado: UsuarioLocal = {
        ...(user || {}),
        ...usuarioAtualizado,
        id: user.id,
        tipo: 'guia',
        nome: nomeLimpo,
        bio: bioSalva
      }

      localStorage.setItem('user', JSON.stringify(localUserAtualizado))
      setUser(localUserAtualizado)
      setNomePerfil(nomeLimpo)
      setBio(bioSalva)
      setEditandoBio(false)
      setMensagem('Nome e biografia atualizados com sucesso.')

      await carregarDados(user.id)
    } catch (error: any) {
      console.error('Erro ao salvar nome/bio:', error)
      setErro(error?.message || 'Não foi possível salvar nome e biografia.')
    } finally {
      setSalvandoBio(false)
      setTimeout(() => setMensagem(''), 2800)
    }
  }

  const salvarDadosPrivados = async () => {
    if (!user?.id) return

    setSalvandoDados(true)
    setErro('')
    setMensagem('')

    try {
      const cadasturLimpo = cadastur.trim()

      const response = await fetch('/api/guia/perfil/salvar-dados', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          guiaId: user.id,
          pixTipo,
          pix_tipo: pixTipo,
          pixChave,
          pix_chave: pixChave,
          cadastur: cadasturLimpo,
          cadasturNumero: cadasturLimpo,
          cadastur_numero: cadasturLimpo
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        throw new Error(
          data?.erro ||
            data?.message ||
            `Erro HTTP ${response.status} ao salvar dados do guia.`
        )
      }

      const atualizado = data?.usuario || {}

      setGuia((prev: any) => ({
        ...prev,
        ...atualizado,
        pix_tipo: atualizado.pix_tipo ?? pixTipo,
        pix_chave: atualizado.pix_chave ?? pixChave,
        cadastur: atualizado.cadastur ?? cadasturLimpo,
        cadastur_numero: atualizado.cadastur_numero ?? cadasturLimpo
      }))

      setPixTipo(atualizado.pix_tipo ?? pixTipo)
      setPixChave(atualizado.pix_chave ?? pixChave)
      setCadastur(atualizado.cadastur || atualizado.cadastur_numero || cadasturLimpo)

      const localUserAtualizado: UsuarioLocal = {
        ...(user || {}),
        ...(atualizado || {}),
        id: user.id,
        tipo: 'guia'
      }

      localStorage.setItem('user', JSON.stringify(localUserAtualizado))
      setUser(localUserAtualizado)

      setMensagem(
        cadasturLimpo
          ? 'Dados do guia atualizados. O CADASTUR informado ficará aguardando conferência do Admin.'
          : 'Dados do guia atualizados com sucesso.'
      )

      await carregarDados(user.id)
    } catch (error: any) {
      console.error('Erro ao salvar dados privados:', error)
      setErro(error?.message || 'Não foi possível salvar os dados do guia.')
    } finally {
      setSalvandoDados(false)
      setTimeout(() => setMensagem(''), 3200)
    }
  }

  const uploadAvatar = async (file: File) => {
    const guiaId = String(
      user?.id ||
        (user as any)?.user_id ||
        (user as any)?.usuario_id ||
        (user as any)?.guia_id ||
        guia?.id ||
        guia?.user_id ||
        guia?.usuario_id ||
        guia?.guia_id ||
        ''
    ).trim()

    if (!guiaId) {
      setErro('Não foi possível identificar o guia para salvar a foto.')
      return
    }

    setEnviandoAvatar(true)
    setErro('')
    setMensagem('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', guiaId)
      formData.append('usuarioId', guiaId)
      formData.append('usuario_id', guiaId)
      formData.append('guiaId', guiaId)
      formData.append('guia_id', guiaId)
      formData.append('tipoUsuario', 'guia')
      formData.append('tipo', 'guia')
      formData.append('pasta', 'guias')

      const response = await fetch('/api/usuario/avatar', {
        method: 'POST',
        body: formData,
      })

      const rawText = await response.text()

      let data: any = null

      try {
        data = rawText ? JSON.parse(rawText) : null
      } catch {
        throw new Error(
          `A rota /api/usuario/avatar não retornou JSON válido. Status: ${response.status}. Resposta: ${rawText.slice(0, 180)}`
        )
      }

      if (!response.ok || data?.sucesso === false || data?.success === false) {
        throw new Error(
          data?.erro ||
            data?.error ||
            data?.message ||
            `Erro HTTP ${response.status} ao salvar foto.`
        )
      }

      const usuarioResposta = data?.usuario || data?.user || data?.data || data?.perfil || {}

      const publicUrl = String(
        data?.avatarUrl ||
          data?.avatar_url ||
          data?.foto_url ||
          data?.imagem_url ||
          data?.publicUrl ||
          data?.public_url ||
          data?.url ||
          data?.signedUrl ||
          data?.signed_url ||
          data?.pathUrl ||
          data?.path_url ||
          usuarioResposta?.avatar_url ||
          usuarioResposta?.foto_url ||
          usuarioResposta?.imagem_url ||
          ''
      ).trim()

      if (!publicUrl) {
        console.error('Resposta sem URL pública em /api/usuario/avatar:', data)
        throw new Error('A rota salvou ou respondeu, mas não informou a URL pública da foto.')
      }

      const usuarioAtualizado: UsuarioLocal = {
        ...(user || {}),
        ...(usuarioResposta || {}),
        id: guiaId,
        tipo: 'guia',
        avatar_url: publicUrl,
        foto_url: publicUrl,
        imagem_url: publicUrl,
      }

      localStorage.setItem('user', JSON.stringify(usuarioAtualizado))

      setUser(usuarioAtualizado)
      setAvatarPreview(publicUrl)

      setGuia((prev: any) => ({
        ...prev,
        ...(usuarioResposta || {}),
        id: guiaId,
        avatar_url: publicUrl,
        foto_url: publicUrl,
        imagem_url: publicUrl,
      }))

      setMensagem('Foto de perfil atualizada com sucesso.')
    } catch (error: any) {
      console.error('Erro ao enviar avatar do guia:', error)
      setErro(error?.message || 'Não foi possível atualizar a foto do guia.')
    } finally {
      setEnviandoAvatar(false)
      setTimeout(() => setMensagem(''), 2800)
    }
  }

  const limparCropAvatar = () => {
    if (avatarCropSrc) {
      URL.revokeObjectURL(avatarCropSrc)
    }

    setAvatarCropSrc('')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const confirmarCropAvatar = async (file: File) => {
    await uploadAvatar(file)
    limparCropAvatar()
  }

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErro('Selecione um arquivo de imagem válido.')
      event.target.value = ''
      return
    }

    if (avatarCropSrc) {
      URL.revokeObjectURL(avatarCropSrc)
    }

    setErro('')
    setMensagem('')
    setAvatarCropSrc(URL.createObjectURL(file))
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

  const abrirDadosGuiaPrivados = () => {
    setMenuAberto(false)
    setErro('')
    setMensagem('')
    setModalDadosGuiaAberto(true)
  }

  const abrirEdicaoBio = () => {
    setMenuAberto(false)
    setNomePerfil(nomeGuia())
    setBio(guia?.bio_guia || guia?.bio || bio || '')
    setEditandoBio(true)
  }

  const rotuloTipoChamado = (tipo?: string | null) => {
    const normalizado = normalizar(tipo)

    if (normalizado === 'bug') return 'Bug'
    if (normalizado === 'sugestao') return 'Sugestão'

    return 'Suporte'
  }

  const rotuloStatusChamado = (status?: string | null) => {
    const normalizado = normalizar(status)

    if (normalizado === 'respondido') return 'Respondido'
    if (normalizado === 'em_analise') return 'Em análise'
    if (normalizado === 'resolvido') return 'Concluído'
    if (normalizado === 'arquivado') return 'Arquivado'

    return 'Novo'
  }

  const classeStatusChamado = (status?: string | null) => {
    const normalizado = normalizar(status)

    if (normalizado === 'respondido' || normalizado === 'resolvido') return 'respondido'
    if (normalizado === 'em_analise') return 'analise'
    if (normalizado === 'arquivado') return 'arquivado'

    return 'novo'
  }

  const notaChamado = (chamado: SuporteChamado) => {
    return Number(chamado.avaliacao_resposta_nota || chamado.nota_resposta || chamado.nota || 0)
  }

  const chamadoFinalizado = (chamado: SuporteChamado) => {
    const status = normalizar(chamado.status)

    return (
      status === 'resolvido' ||
      Boolean(chamado.finalizado_pelo_usuario) ||
      Boolean(chamado.finalizado_em) ||
      notaChamado(chamado) > 0
    )
  }

  const podeFinalizarChamado = (chamado: SuporteChamado) => {
    const status = normalizar(chamado.status)

    return (
      Boolean(chamado.resposta_admin) &&
      status !== 'arquivado' &&
      notaChamado(chamado) <= 0
    )
  }

  const abrirAvaliacaoChamado = (chamado: SuporteChamado) => {
    setAvaliandoChamadoId(chamado.id)
    setNotaAvaliacaoSuporte(5)
    setComentarioAvaliacaoSuporte('')
    setErroFinalizarSuporte('')
  }

  const cancelarAvaliacaoChamado = () => {
    setAvaliandoChamadoId('')
    setNotaAvaliacaoSuporte(5)
    setComentarioAvaliacaoSuporte('')
    setErroFinalizarSuporte('')
  }

  const carregarChamadosSuporte = async (guiaId?: string | null) => {
    const id = String(guiaId || user?.id || '').trim()

    if (!id) return

    setCarregandoChamadosSuporte(true)

    try {
      const params = new URLSearchParams({
        usuarioId: id,
        tipoUsuario: 'guia',
        limite: '80',
      })

      const response = await fetch(`/api/suporte/chamados?${params.toString()}`)
      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.erro || data?.message || 'Não foi possível carregar seus chamados.')
      }

      setChamadosSuporte(Array.isArray(data?.chamados) ? data.chamados : [])
    } catch (error) {
      console.error('Erro ao carregar chamados de suporte do guia:', error)
    } finally {
      setCarregandoChamadosSuporte(false)
    }
  }

  const abrirSuporte = async () => {
    setMenuAberto(false)
    setTipoSuporte('suporte')
    setPrioridadeSuporte('normal')
    setAssuntoSuporte('Mensagem ao suporte')
    setDescricaoSuporte('')
    setErroSuporte('')
    cancelarAvaliacaoChamado()
    setModalSuporteAberto(true)
    await carregarChamadosSuporte(user?.id)
  }

  const enviarSuporte = async (event: FormEvent) => {
    event.preventDefault()

    if (!user?.id) {
      router.replace('/login')
      return
    }

    if (!assuntoSuporte.trim()) {
      setErroSuporte('Informe o assunto da solicitação.')
      return
    }

    if (!descricaoSuporte.trim() || descricaoSuporte.trim().length < 8) {
      setErroSuporte('Descreva melhor o que aconteceu.')
      return
    }

    setEnviandoSuporte(true)
    setErroSuporte('')

    try {
      const response = await fetch('/api/suporte/chamados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuarioId: user.id,
          tipoUsuario: 'guia',
          tipoChamado: tipoSuporte,
          assunto: assuntoSuporte,
          descricao: descricaoSuporte,
          prioridade: prioridadeSuporte,
          paginaOrigem: typeof window !== 'undefined' ? window.location.pathname : '/guia/perfil',
          metadata: {
            email: user.email || '',
            nome: user.nome || '',
          },
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        setErroSuporte(data?.erro || data?.message || 'Não foi possível enviar a solicitação.')
        return
      }

      setMensagem('Solicitação enviada com sucesso.')
      setAssuntoSuporte('')
      setDescricaoSuporte('')
      setTipoSuporte('suporte')
      setPrioridadeSuporte('normal')
      await carregarChamadosSuporte(user.id)
    } catch (error) {
      console.error('Erro ao enviar suporte:', error)
      setErroSuporte('Erro ao enviar solicitação.')
    } finally {
      setEnviandoSuporte(false)
    }
  }

  const finalizarChamadoSuporte = async (chamado: SuporteChamado) => {
    if (!user?.id) {
      router.replace('/login')
      return
    }

    const nota = Number(notaAvaliacaoSuporte || 0)

    if (!Number.isFinite(nota) || nota < 1 || nota > 5) {
      setErroFinalizarSuporte('Selecione uma nota de 1 a 5 para avaliar a resposta.')
      return
    }

    setFinalizandoChamadoId(chamado.id)
    setErroFinalizarSuporte('')

    try {
      const response = await fetch('/api/suporte/chamados', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'finalizar',
          chamadoId: chamado.id,
          usuarioId: user.id,
          tipoUsuario: 'guia',
          nota,
          comentario: comentarioAvaliacaoSuporte,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        setErroFinalizarSuporte(data?.erro || data?.message || 'Não foi possível concluir o chamado.')
        return
      }

      setMensagem('Chamado concluído e resposta avaliada com sucesso.')
      cancelarAvaliacaoChamado()
      await carregarChamadosSuporte(user.id)
    } catch (error) {
      console.error('Erro ao finalizar chamado de suporte:', error)
      setErroFinalizarSuporte('Erro ao concluir e avaliar o chamado.')
    } finally {
      setFinalizandoChamadoId('')
    }
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

  const nivelAtual = getNivelPorKm(stats.totalKm)
  const proximoMarco = calcularProximoMarcoKm(stats.totalKm)
  const progressoKm = calcularProgressoKm(stats.totalKm)

  const cadasturNumero = String(
    cadastur ||
      guia?.cadastur ||
      guia?.cadastur_numero ||
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

  const cadasturResumo = (() => {
    if (!cadasturInformado) {
      return {
        titulo: 'CADASTUR não informado',
        descricao: 'Informe seu número CADASTUR para iniciar a conferência administrativa.',
        classe: 'pendente'
      }
    }

    if (cadasturAtivo) {
      return {
        titulo: 'CADASTUR ativo',
        descricao: `Verificado pelo Admin e válido${cadasturValidade ? ` até ${formatarData(cadasturValidade)}` : ''}.`,
        classe: 'ativo'
      }
    }

    if (cadasturVerificado) {
      return {
        titulo: 'Guia verificado',
        descricao: 'CADASTUR conferido pelo Admin. Falta registrar ou renovar a data de validade.',
        classe: 'verificado'
      }
    }

    return {
      titulo: 'CADASTUR informado',
      descricao: 'Número preenchido e aguardando conferência do Admin.',
      classe: 'informado'
    }
  })()

  const medalhasCadastur: MedalhaGuiaVisual[] = [
    {
      nome: 'CADASTUR informado',
      subtitulo: cadasturInformado ? 'Número preenchido' : 'Informe seu número',
      svg: `${MEDALHA_CADASTUR_BASE}/01_cadastur_preenchido.svg`,
      desbloqueado: cadasturInformado,
      destaque: cadasturInformado && !cadasturVerificado,
      categoria: 'cadastur'
    },
    {
      nome: 'Guia verificado',
      subtitulo: cadasturVerificado ? 'Confirmado pelo Admin' : 'Aguardando verificação',
      svg: `${MEDALHA_CADASTUR_BASE}/02_guia_verificado.svg`,
      desbloqueado: cadasturVerificado,
      destaque: cadasturVerificado && !cadasturAtivo,
      categoria: 'cadastur'
    },
    {
      nome: 'CADASTUR ativo',
      subtitulo: cadasturAtivo
        ? `Válido${cadasturValidade ? ` até ${formatarData(cadasturValidade)}` : ''}`
        : 'Validade pendente ou vencida',
      svg: `${MEDALHA_CADASTUR_BASE}/03_cadastur_ativo.svg`,
      desbloqueado: cadasturAtivo,
      destaque: cadasturAtivo,
      categoria: 'cadastur'
    },
    ...CADASTUR_TIERS.map((tier) => ({
      nome: tier.nome,
      subtitulo: anosCadasturAtivo >= tier.anos ? tier.subtitulo : 'Bloqueada por tempo ativo',
      svg: tier.svg,
      desbloqueado: anosCadasturAtivo >= tier.anos,
      destaque: cadasturAtivo && anosCadasturAtivo >= tier.anos,
      categoria: 'cadastur' as const
    }))
  ]

  const guiaBetaAtivo = Boolean(
    guia?.medalha_guia_pioneiro_beta ||
      guia?.guia_pioneiro_beta ||
      guia?.guia_beta ||
      guia?.beneficio_taxa_beta_ativo ||
      Number(guia?.taxa_plataforma_percentual || 0) === 5
  )

  const medalhasUnificadas: MedalhaGuiaVisual[] = [
    ...METAS_KM_GUIA.map((meta) => ({
      nome: meta.nome,
      subtitulo: stats.totalKm >= meta.km ? 'Conquistada' : 'Bloqueada',
      svg: meta.svg,
      desbloqueado: stats.totalKm >= meta.km,
      destaque: nivelAtual.nome === meta.nome,
      categoria: 'progressao' as const
    })),
    ...medalhasCadastur,
    {
      nome: 'Guia Pioneiro Beta',
      subtitulo: guiaBetaAtivo ? 'Medalha exclusiva do período Beta' : 'Exclusiva para guias do Beta',
      svg: `${MEDALHA_BETA_BASE}/04_guia_pioneiro_beta.svg`,
      desbloqueado: guiaBetaAtivo,
      destaque: guiaBetaAtivo,
      categoria: 'beta'
    },
    {
      nome: 'Roteiro Publicado',
      subtitulo: stats.totalRoteiros >= 1 ? 'Conquistada' : 'Bloqueada',
      svg: `${MEDALHA_PROGRESSAO_BASE}/05_rumo_certo.svg`,
      desbloqueado: stats.totalRoteiros >= 1,
      categoria: 'atuacao'
    },
    {
      nome: 'Avaliação Recebida',
      subtitulo: stats.totalAvaliacoes >= 1 ? 'Conquistada' : 'Bloqueada',
      svg: `${MEDALHA_PROGRESSAO_BASE}/09_mirante_do_explorador.svg`,
      desbloqueado: stats.totalAvaliacoes >= 1,
      categoria: 'atuacao'
    },
    {
      nome: 'Clientes na Trilha',
      subtitulo: stats.totalClientes >= 1 ? 'Conquistada' : 'Bloqueada',
      svg: `${MEDALHA_PROGRESSAO_BASE}/01_mochila_de_partida.svg`,
      desbloqueado: stats.totalClientes >= 1,
      categoria: 'atuacao'
    }
  ]


  const abrirPerfilPublicoGuia = () => {
    const guiaIdPublico = String(user?.id || guia?.id || '').trim()

    if (!guiaIdPublico) return

    router.push(`/guia/publico/${guiaIdPublico}`)
  }

  const handleStatusCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    abrirPerfilPublicoGuia()
  }

  const abrirAvaliacoesGuia = () => {
    router.push('/guia/avaliacoes')
  }

  const handleAvaliacoesCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    abrirAvaliacoesGuia()
  }

  if (carregando) {
    return (
      <main className="loading">
        <style>{`
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #f6f7f1;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          .loading {
            min-height: 100vh;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            background:
              radial-gradient(circle at 10% 0%, rgba(132,204,22,0.16), transparent 28%),
              radial-gradient(circle at 90% 10%, rgba(251,146,60,0.14), transparent 28%),
              linear-gradient(180deg,#fffdf7 0%,#f3f5ea 48%,#eef2e5 100%);
            color: #172018;
          }
          .loadingCard {
            background: rgba(255,255,255,0.92);
            border: 1px solid rgba(15,23,42,0.06);
            border-radius: 30px;
            padding: 28px;
            text-align: center;
            box-shadow: 0 20px 50px rgba(15,23,42,0.08);
          }
          .loadingCard img {
            height: 64px;
            width: auto;
            margin-bottom: 12px;
          }
        `}</style>

        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>Carregando perfil do guia...</div>
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
            radial-gradient(circle at 10% 0%, rgba(132,204,22,0.16), transparent 28%),
            radial-gradient(circle at 90% 10%, rgba(251,146,60,0.14), transparent 28%),
            linear-gradient(180deg,#fffdf7 0%,#f3f5ea 48%,#eef2e5 100%);
          color: #172018;
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
          grid-template-columns: 42px minmax(0, 1fr) 42px;
          align-items: center;
          gap: 10px;
        }

        .headerGhost {
          width: 42px;
          height: 42px;
          pointer-events: none;
        }

        .brand {
          min-width: 0;
          max-width: min(540px, calc(100vw - 120px));
          justify-self: center;
          border: none;
          background: transparent;
          padding: 0;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          text-align: center;
        }

        .brand img {
          width: clamp(154px, 36vw, 260px);
          max-width: 100%;
          max-height: 60px;
          height: auto;
          display: block;
          object-fit: contain;
        }

        .brand span {
          display: block;
          color: #7b8372;
          font-size: clamp(8px, 1.05vw, 12px);
          font-weight: 850;
          margin-top: -2px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          white-space: nowrap;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .headerActions {
          position: relative;
          justify-self: end;
          display: flex;
          align-items: center;
          gap: 8px;
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
          width: 274px;
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
          align-items: flex-start;
          gap: 10px;
        }

        .menuButton:hover {
          background: #f8fafc;
        }

        .menuButton.danger {
          color: #991b1b;
        }

        .menuIcon {
          width: 20px;
          flex: 0 0 20px;
          display: inline-flex;
          justify-content: center;
          line-height: 1.25;
        }

        .menuText {
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .menuText strong {
          display: block;
          color: inherit;
          font-size: 13px;
          line-height: 1.2;
          font-weight: 950;
        }

        .menuText small {
          display: block;
          color: #64748b;
          font-size: 11px;
          line-height: 1.35;
          font-weight: 750;
        }

        .container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 22px 16px 54px;
        }

        .hero {
          position: relative;
          overflow: hidden;
          border-radius: 38px;
          padding: 28px;
          background:
            linear-gradient(135deg, rgba(23,32,24,0.78), rgba(23,32,24,0.34)),
            radial-gradient(circle at top right, rgba(190,242,100,0.30), transparent 34%),
            linear-gradient(135deg, #1f331f 0%, #647a49 46%, #d7c6a1 100%);
          color: #ffffff;
          box-shadow: 0 24px 60px rgba(23,32,24,0.18);
          margin-bottom: 16px;
        }

        .heroGrid {
          display: grid;
          grid-template-columns: 220px minmax(0,1fr) 280px;
          gap: 20px;
          align-items: end;
        }

        .avatarCard {
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 32px;
          padding: 14px;
          backdrop-filter: blur(14px);
          cursor: pointer;
          transition: 0.2s ease;
        }

        .avatarCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 38px rgba(0,0,0,0.18);
        }

        .avatarBox {
          height: 190px;
          border-radius: 26px;
          background: rgba(255,255,255,0.10);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.16);
        }

        .avatarBox img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .avatarFallback {
          width: 86px;
          height: 86px;
          border-radius: 999px;
          background: #bef264;
          color: #172018;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 34px;
          font-weight: 950;
        }

        .avatarHint {
          margin-top: 10px;
          color: rgba(255,255,255,0.82);
          font-size: 11px;
          font-weight: 850;
          text-align: center;
        }

        .fileInput {
          display: none;
        }

        .eyebrow {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.24);
          background: rgba(255,255,255,0.12);
          color: #f7fee7;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .heroTitle {
          margin: 0;
          font-size: clamp(38px, 5.2vw, 68px);
          line-height: 0.92;
          font-weight: 950;
          letter-spacing: -0.085em;
        }

        .heroText {
          max-width: 620px;
          color: rgba(255,255,255,0.82);
          line-height: 1.6;
          margin: 14px 0 0;
          font-size: 14px;
          font-weight: 650;
        }

        .cadasturBadge {
          margin-top: 14px;
          display: inline-flex;
          border-radius: 999px;
          padding: 8px 12px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.18);
          color: #ffffff;
          font-size: 12px;
          font-weight: 950;
        }

        .progressHeroCard {
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 30px;
          padding: 18px;
          backdrop-filter: blur(14px);
        }

        .progressIcon {
          width: 62px;
          height: 62px;
          border-radius: 24px;
          background: rgba(190,242,100,0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
        }

        .progressTitle {
          margin-top: 12px;
          font-size: 26px;
          font-weight: 950;
          letter-spacing: -0.05em;
        }

        .progressSmall {
          color: rgba(255,255,255,0.76);
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
          margin-top: 6px;
        }

        .barOuter {
          margin-top: 12px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.18);
          overflow: hidden;
        }

        .barInner {
          height: 100%;
          border-radius: 999px;
          background: #bef264;
          width: ${progressoKm}%;
        }

        .alert {
          border-radius: 18px;
          padding: 13px 15px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 850;
          line-height: 1.45;
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

        .grid {
          display: grid;
          grid-template-columns: minmax(0,1fr) 360px;
          gap: 16px;
          align-items: start;
        }

        .stack {
          display: grid;
          gap: 16px;
        }

        .card {
          background: rgba(255,255,255,0.90);
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 30px;
          box-shadow: 0 12px 34px rgba(15,23,42,0.06);
          overflow: hidden;
        }


        .statusProfileCard,
        .clickableCard {
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }

        .statusProfileCard:hover,
        .statusProfileCard:focus-visible,
        .clickableCard:hover,
        .clickableCard:focus-visible {
          transform: translateY(-2px);
          border-color: rgba(32,60,46,0.16);
          box-shadow: 0 18px 42px rgba(15,23,42,0.10);
          outline: none;
        }

        .heroBioText {
          white-space: pre-wrap;
        }

        .statusOpenHint {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #eef2e5;
          color: #203c2e;
          padding: 8px 11px;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .cardHeader {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(15,23,42,0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .cardTitle {
          margin: 0;
          color: #172018;
          font-size: 18px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .cardSub {
          margin-top: 3px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
        }

        .cardBody {
          padding: 18px;
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

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(15,23,42,0.10);
        }

        .btn:disabled {
          opacity: 0.62;
          cursor: not-allowed;
        }

        .btn.dark {
          background: #172018;
          color: #ffffff;
        }

        .btn.green {
          background: #16a34a;
          color: #ffffff;
        }

        .btn.light {
          background: #eef2e5;
          color: #475569;
        }

        .textarea,
        .input,
        .select {
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

        .textarea {
          min-height: 130px;
          resize: vertical;
          line-height: 1.55;
        }

        .textarea:focus,
        .input:focus,
        .select:focus {
          border-color: #84cc16;
          box-shadow: 0 0 0 4px rgba(132,204,22,0.12);
        }

        .bioText {
          color: #475569;
          font-size: 14px;
          line-height: 1.7;
          font-weight: 650;
          white-space: pre-wrap;
        }

        .formGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .field {
          display: grid;
          gap: 7px;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .editNameField {
          margin-bottom: 12px;
        }

        .editBioField {
          margin-bottom: 0;
        }

        .suporteTextarea {
          min-height: 116px;
          resize: vertical;
          line-height: 1.45;
        }

        .label {
          color: #475569;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .helper {
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 700;
        }

        .errorBox {
          border-radius: 16px;
          padding: 12px 13px;
          background: rgba(153, 27, 27, 0.08);
          color: #991b1b;
          border: 1px solid rgba(153, 27, 27, 0.14);
          font-size: 13px;
          font-weight: 850;
          line-height: 1.45;
        }

        .cadasturStatusCard {
          display: grid;
          grid-template-columns: 94px minmax(0,1fr);
          gap: 14px;
          align-items: center;
          background:
            radial-gradient(circle at top right, rgba(37,99,235,0.10), transparent 38%),
            #fffdf7;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 24px;
          padding: 14px;
          margin-top: 14px;
        }

        .cadasturStatusIcon {
          width: 94px;
          height: 94px;
          object-fit: contain;
          filter: drop-shadow(0 14px 18px rgba(17,24,39,0.14));
        }

        .cadasturStatusTitle {
          color: #172018;
          font-size: 17px;
          font-weight: 950;
          letter-spacing: -0.035em;
        }

        .cadasturStatusText {
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
          margin-top: 5px;
        }

        .cadasturStatusTag {
          display: inline-flex;
          margin-top: 9px;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 10px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          background: #fef3c7;
          color: #92400e;
        }

        .cadasturStatusTag.ativo {
          background: #dcfce7;
          color: #166534;
        }

        .cadasturStatusTag.verificado {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .cadasturStatusTag.informado {
          background: #fef3c7;
          color: #92400e;
        }

        .benefitCard {
          background:
            radial-gradient(circle at top right, rgba(190,242,100,0.24), transparent 38%),
            #172018;
          color: #ffffff;
          border-radius: 30px;
          padding: 20px;
          box-shadow: 0 18px 42px rgba(23,32,24,0.16);
        }

        .benefitPill {
          display: inline-flex;
          border-radius: 999px;
          background: rgba(190,242,100,0.16);
          border: 1px solid rgba(190,242,100,0.22);
          color: #d9f99d;
          padding: 7px 10px;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }

        .benefitTitle {
          margin-top: 12px;
          font-size: 24px;
          font-weight: 950;
          line-height: 1.02;
          letter-spacing: -0.055em;
        }

        .benefitText {
          margin-top: 10px;
          color: rgba(255,255,255,0.78);
          font-size: 13px;
          line-height: 1.55;
          font-weight: 700;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 10px;
        }

        .statBox {
          background: #fffdf7;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 22px;
          padding: 14px;
        }

        .statIcon {
          font-size: 22px;
          margin-bottom: 8px;
        }

        .statValue {
          color: #172018;
          font-size: 22px;
          font-weight: 950;
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .statLabel {
          margin-top: 5px;
          color: #64748b;
          font-size: 11px;
          font-weight: 850;
          line-height: 1.35;
        }

        .unifiedMedalGrid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0,1fr));
          gap: 12px;
          align-items: start;
        }

        .unifiedMedal {
          aspect-ratio: 1 / 1;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 24px;
          background:
            radial-gradient(circle at 50% 0%, rgba(251,146,60,0.10), transparent 52%),
            rgba(255,253,247,0.86);
          display: grid;
          place-items: center;
          padding: 12px;
          cursor: pointer;
          color: inherit;
          font: inherit;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          overflow: hidden;
        }

        .unifiedMedal:hover {
          transform: translateY(-2px);
          border-color: rgba(153,27,27,0.18);
          box-shadow: 0 14px 28px rgba(42,55,36,0.10);
        }

        .unifiedMedal.current {
          border-color: rgba(153,27,27,0.22);
          box-shadow: 0 16px 34px rgba(153,27,27,0.10);
          background:
            radial-gradient(circle at 50% 0%, rgba(251,146,60,0.16), transparent 54%),
            #fffdf7;
        }

        .unifiedMedal.cadastur {
          border-color: rgba(37,99,235,0.16);
          background:
            radial-gradient(circle at 50% 0%, rgba(219,234,254,0.52), transparent 54%),
            #fffdf7;
        }

        .unifiedMedal.locked {
          background:
            repeating-linear-gradient(
              135deg,
              rgba(23,32,24,0.025) 0,
              rgba(23,32,24,0.025) 6px,
              transparent 6px,
              transparent 12px
            ),
            rgba(255,253,247,0.72);
        }

        .unifiedMedalFrame {
          width: min(96px, 86%);
          height: min(96px, 86%);
          display: grid;
          place-items: center;
          background: transparent;
          overflow: visible;
        }

        .unifiedMedalArt {
          width: auto;
          height: auto;
          max-width: 86%;
          max-height: 86%;
          object-fit: contain;
          display: block;
          mix-blend-mode: multiply;
          filter: drop-shadow(0 8px 12px rgba(23,32,24,0.10));
        }

        .unifiedMedal.beta .unifiedMedalArt {
          max-width: 82%;
          max-height: 82%;
          transform: translateY(-10%);
          transform-origin: center center;
        }

        .unifiedMedal.cadastur .unifiedMedalArt {
          max-width: 72%;
          max-height: 84%;
          transform: translateY(-6%);
          transform-origin: center center;
        }

        .unifiedMedal.medalKey-cadastur-informado .unifiedMedalArt,
        .unifiedMedal.medalKey-cadastur-preenchido .unifiedMedalArt {
          max-width: 72%;
          max-height: 84%;
          transform: translateY(-6%);
        }

        .unifiedMedal.medalKey-guia-verificado .unifiedMedalArt,
        .unifiedMedal.medalKey-guia-verificado-cadastur .unifiedMedalArt {
          max-width: 72%;
          max-height: 84%;
          transform: translateY(-6%);
        }

        .unifiedMedal.medalKey-cadastur-ativo .unifiedMedalArt {
          max-width: 68%;
          max-height: 80%;
          transform: translateY(-6%);
        }

        .unifiedMedal.medalKey-cadastur-bronze .unifiedMedalArt,
        .unifiedMedal.medalKey-cadastur-prata .unifiedMedalArt,
        .unifiedMedal.medalKey-cadastur-ouro .unifiedMedalArt,
        .unifiedMedal.medalKey-cadastur-platina .unifiedMedalArt,
        .unifiedMedal.medalKey-cadastur-onyx .unifiedMedalArt {
          max-width: 56%;
          max-height: 70%;
          transform: translateY(-14%);
        }

        .unifiedMedal.progressao .unifiedMedalArt,
        .unifiedMedal.atuacao .unifiedMedalArt {
          max-width: 84%;
          max-height: 84%;
        }

        .unifiedMedal.locked .unifiedMedalArt {
          filter: grayscale(1) brightness(1.12) opacity(0.76) drop-shadow(0 8px 12px rgba(23,32,24,0.10));
        }

        .medalDetailArt {
          width: 132px;
          height: 132px;
          margin: 2px auto 12px;
          display: grid;
          place-items: center;
          background: transparent;
          overflow: visible;
        }

        .medalDetailArt img {
          width: auto;
          height: auto;
          max-width: 86%;
          max-height: 86%;
          object-fit: contain;
          display: block;
          filter: drop-shadow(0 12px 18px rgba(23,32,24,0.14));
        }

        .medalDetailArt.beta img {
          max-width: 82%;
          max-height: 82%;
          transform: translateY(-10%);
          transform-origin: center center;
        }

        .medalDetailArt.cadastur img {
          max-width: 72%;
          max-height: 84%;
          transform: translateY(-6%);
          transform-origin: center center;
        }

        .medalDetailArt.medalKey-cadastur-informado img,
        .medalDetailArt.medalKey-cadastur-preenchido img,
        .medalDetailArt.medalKey-guia-verificado img,
        .medalDetailArt.medalKey-guia-verificado-cadastur img {
          max-width: 72%;
          max-height: 84%;
          transform: translateY(-6%);
        }

        .medalDetailArt.medalKey-cadastur-ativo img {
          max-width: 68%;
          max-height: 80%;
          transform: translateY(-6%);
        }

        .medalDetailArt.medalKey-cadastur-bronze img,
        .medalDetailArt.medalKey-cadastur-prata img,
        .medalDetailArt.medalKey-cadastur-ouro img,
        .medalDetailArt.medalKey-cadastur-platina img,
        .medalDetailArt.medalKey-cadastur-onyx img {
          max-width: 56%;
          max-height: 70%;
          transform: translateY(-14%);
        }

        .medalStatusPill {
          display: inline-flex;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          background: #eef2e5;
          color: #475569;
          margin-bottom: 10px;
        }

        .medalStatusPill.unlocked {
          background: #dcfce7;
          color: #166534;
        }

        .medalStatusPill.locked {
          background: rgba(100,116,139,0.10);
          color: #64748b;
        }

        .privacyNote {
          border-radius: 18px;
          background: rgba(32,60,46,0.06);
          border: 1px solid rgba(32,60,46,0.10);
          color: #203c2e;
          padding: 12px 13px;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 800;
          margin: 0 0 14px;
        }

        .reviewList {
          display: grid;
          gap: 10px;
        }

        .review {
          background: #fffdf7;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 22px;
          padding: 14px;
          transition: 0.2s ease;
        }

        .review.clickable {
          cursor: pointer;
        }

        .review.clickable:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 30px rgba(15,23,42,0.08);
          border-color: rgba(22,163,74,0.20);
        }

        .reviewTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }

        .reviewClient {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }

        .reviewAvatar {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          background: #eef2e5;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex: 0 0 auto;
          font-size: 12px;
          font-weight: 950;
        }

        .reviewAvatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .reviewName {
          color: #172018;
          font-size: 13px;
          font-weight: 950;
        }

        .stars {
          color: #f59e0b;
          font-size: 12px;
          font-weight: 950;
        }

        .reviewText {
          margin-top: 8px;
          color: #475569;
          font-size: 13px;
          line-height: 1.5;
          font-weight: 650;
        }

        .reviewDate {
          margin-top: 8px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 800;
        }

        .routeGrid {
          display: grid;
          gap: 10px;
        }

        .routeCard {
          display: grid;
          grid-template-columns: 86px minmax(0,1fr);
          gap: 12px;
          background: #fffdf7;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 22px;
          padding: 10px;
          cursor: pointer;
        }

        .routePhoto {
          height: 76px;
          border-radius: 18px;
          background: #eef2e5;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-size: 24px;
        }

        .routePhoto img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .routeTitle {
          color: #172018;
          font-size: 13px;
          font-weight: 950;
          line-height: 1.25;
        }

        .routeMeta {
          margin-top: 5px;
          color: #64748b;
          font-size: 11px;
          font-weight: 750;
          line-height: 1.35;
        }

        .routePrice {
          margin-top: 8px;
          color: #16a34a;
          font-size: 13px;
          font-weight: 950;
        }

        .empty {
          background: #fffdf7;
          border: 1px dashed rgba(15,23,42,0.14);
          border-radius: 22px;
          padding: 22px;
          color: #64748b;
          text-align: center;
          font-size: 13px;
          line-height: 1.5;
          font-weight: 750;
        }

        .actionRow {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          margin-top: 12px;
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
          max-width: 460px;
          background: #ffffff;
          border-radius: 28px;
          box-shadow: 0 28px 90px rgba(15,23,42,0.28);
          overflow: hidden;
        }

        .modal.supportModal {
          max-width: 780px;
          max-height: 92vh;
          overflow-y: auto;
        }

        .supportGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
          gap: 14px;
          align-items: start;
        }

        .supportHistory {
          background: #fffdf7;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 22px;
          padding: 14px;
          display: grid;
          gap: 10px;
          max-height: 470px;
          overflow-y: auto;
        }

        .supportHistoryTitle {
          color: #172018;
          font-size: 14px;
          font-weight: 950;
          letter-spacing: -0.03em;
        }

        .supportHistorySub {
          color: #64748b;
          font-size: 11px;
          line-height: 1.4;
          font-weight: 750;
          margin-top: 2px;
        }

        .supportTicket {
          border: 1px solid rgba(15,23,42,0.08);
          background: #ffffff;
          border-radius: 18px;
          padding: 12px;
        }

        .supportTicketTop {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .supportTicketTitle {
          color: #172018;
          font-size: 12px;
          font-weight: 950;
          line-height: 1.25;
        }

        .supportTicketMeta {
          color: #64748b;
          font-size: 10px;
          font-weight: 850;
          line-height: 1.35;
          margin-top: 3px;
        }

        .supportStatus {
          display: inline-flex;
          border-radius: 999px;
          padding: 5px 7px;
          font-size: 9px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }

        .supportStatus.novo {
          background: #fef3c7;
          color: #92400e;
        }

        .supportStatus.analise {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .supportStatus.respondido {
          background: #dcfce7;
          color: #166534;
        }

        .supportStatus.arquivado {
          background: #f1f5f9;
          color: #475569;
        }

        .supportTicketText {
          color: #475569;
          font-size: 11px;
          line-height: 1.45;
          font-weight: 700;
          white-space: pre-wrap;
          margin-top: 8px;
        }

        .adminAnswer {
          margin-top: 10px;
          border-radius: 16px;
          background: #ecfdf5;
          border: 1px solid #bbf7d0;
          padding: 10px;
        }

        .adminAnswerLabel {
          color: #166534;
          font-size: 10px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .adminAnswerText {
          color: #14532d;
          font-size: 12px;
          line-height: 1.48;
          font-weight: 750;
          margin-top: 5px;
          white-space: pre-wrap;
        }

        .supportRatingBox {
          margin-top: 10px;
          border-radius: 16px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          padding: 10px;
          display: grid;
          gap: 8px;
        }

        .supportRatingTitle {
          color: #9a3412;
          font-size: 10px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .supportRatingText {
          color: #7c2d12;
          font-size: 11px;
          line-height: 1.42;
          font-weight: 750;
        }

        .supportRatingRow {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .ratingBtn {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid rgba(154,52,18,0.22);
          background: #ffffff;
          color: #9a3412;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
        }

        .ratingBtn.active {
          background: #9a3412;
          color: #ffffff;
          border-color: #9a3412;
        }

        .supportRatingInput {
          width: 100%;
          min-height: 62px;
          border: 1px solid rgba(154,52,18,0.16);
          border-radius: 14px;
          background: #ffffff;
          color: #7c2d12;
          padding: 10px;
          font-size: 12px;
          font-weight: 750;
          resize: vertical;
          outline: none;
        }

        .supportResolvedBox {
          margin-top: 10px;
          border-radius: 16px;
          background: #f8fafc;
          border: 1px solid rgba(15,23,42,0.08);
          padding: 10px;
          color: #475569;
          font-size: 11px;
          line-height: 1.42;
          font-weight: 750;
        }

        .supportResolvedBox strong {
          color: #172018;
        }

        .supportMiniActions {
          display: flex;
          justify-content: flex-end;
          margin-top: 10px;
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

        .modalActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        @media (max-width: 1060px) {
          .heroGrid,
          .grid {
            grid-template-columns: 1fr;
          }

          .heroGrid {
            align-items: start;
          }

          .avatarCard {
            max-width: 240px;
          }
        }

        @media (max-width: 760px) {
          .heroText {
            font-size: 13px;
            line-height: 1.45;
            display: -webkit-box;
            -webkit-line-clamp: 4;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .progressHeroCard {
            display: none;
          }

          .supportGrid {
            grid-template-columns: 1fr;
          }

          .supportHistory {
            max-height: 320px;
          }

          .header {
            padding: 7px 10px;
          }

          .headerInner {
            grid-template-columns: 36px minmax(0, 1fr) 36px;
            gap: 8px;
          }

          .headerGhost,
          .gearBtn {
            width: 36px;
            height: 36px;
            box-shadow: none;
          }

          .brand {
            max-width: calc(100vw - 92px);
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

          .container {
            padding: 16px 12px 42px;
          }

          .hero,
          .card {
            border-radius: 28px;
          }

          .hero {
            padding: 20px;
          }

          .avatarBox {
            height: 170px;
          }

          .formGrid,
          .statsGrid {
            grid-template-columns: 1fr 1fr;
          }

          .unifiedMedalGrid {
            grid-template-columns: repeat(4, minmax(0,1fr));
            gap: 9px;
          }

          .cadasturStatusCard {
            grid-template-columns: 74px minmax(0,1fr);
          }

          .cadasturStatusIcon {
            width: 74px;
            height: 74px;
          }
        }

        @media (max-width: 480px) {
          .hero {
            padding: 16px;
          }

          .heroGrid {
            gap: 14px;
          }

          .avatarCard {
            max-width: 150px;
            justify-self: center;
          }

          .avatarBox {
            height: 132px;
            border-radius: 24px;
          }

          .cadasturBadge {
            font-size: 11px;
            padding: 7px 10px;
          }

          .heroTitle {
            font-size: 38px;
          }

          .unifiedMedal {
            border-radius: 18px;
            padding: 8px;
          }

          .unifiedMedalFrame {
            width: 82%;
            height: 82%;
          }

          .formGrid,
          .statsGrid {
            grid-template-columns: 1fr;
          }

          .unifiedMedalGrid {
            grid-template-columns: repeat(4, minmax(0,1fr));
          }

          .routeCard {
            grid-template-columns: 1fr;
          }

          .routePhoto {
            height: 150px;
          }

          .actionRow,
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
          <div className="headerGhost" aria-hidden="true" />

          <button
            type="button"
            className="brand"
            onClick={() => router.push('/guia/dashboard')}
            aria-label="Voltar para a dashboard do guia"
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />
            <span>Passaporte do guia</span>
          </button>

          <div className="headerActions">
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
                  onClick={abrirEdicaoBio}
                >
                  <span className="menuIcon">✏️</span>
                  <span className="menuText">
                    <strong>Editar bio pública</strong>
                    <small>Apresentação que aparece no perfil do guia.</small>
                  </span>
                </button>

                <button
                  type="button"
                  className="menuButton"
                  onClick={abrirDadosGuiaPrivados}
                >
                  <span className="menuIcon">🔒</span>
                  <span className="menuText">
                    <strong>Dados privados</strong>
                    <small>PIX, CADASTUR e atualizações ficam protegidos.</small>
                  </span>
                </button>

                <button
                  type="button"
                  className="menuButton"
                  onClick={abrirSuporte}
                >
                  <span className="menuIcon">🛟</span>
                  <span className="menuText">
                    <strong>Ajuda e suporte</strong>
                    <small>Enviar dúvida, sugestão ou reportar bug.</small>
                  </span>
                </button>

                <button
                  type="button"
                  className="menuButton"
                  onClick={abrirAlterarSenha}
                >
                  <span className="menuIcon">🔐</span>
                  <span className="menuText">
                    <strong>Alterar senha</strong>
                    <small>Atualizar o acesso da conta.</small>
                  </span>
                </button>

                <button
                  type="button"
                  className="menuButton danger"
                  onClick={sair}
                >
                  <span className="menuIcon">🚪</span>
                  <span className="menuText">
                    <strong>Sair</strong>
                    <small>Encerrar sessão neste dispositivo.</small>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroGrid">
            <div
              className="avatarCard"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="avatarBox">
                {avatarGuia() ? (
                  <img src={avatarGuia()} alt={nomeGuia()} />
                ) : (
                  <div className="avatarFallback">
                    {nomeGuia().slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>

              {enviandoAvatar && (
                <div className="avatarHint">Enviando foto...</div>
              )}

              <input
                ref={fileInputRef}
                className="fileInput"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
              />
            </div>

            <div>
              <div className="eyebrow">Perfil privado do guia</div>

              <h1 className="heroTitle">
                {nomeGuia()}
              </h1>

              <p className="heroText heroBioText">
                {bio || 'Sua bio ainda não foi preenchida. Use a engrenagem para editar seu nome público e escrever uma apresentação simples, humana e confiável para os aventureiros conhecerem melhor você.'}
              </p>

              <div className="cadasturBadge">
                {cadasturResumo.titulo}
              </div>
            </div>

            <aside className="progressHeroCard">
              <div className="progressIcon">{nivelAtual.icone}</div>
              <div className="progressTitle">{nivelAtual.nome}</div>
              <div className="progressSmall">
                {stats.totalKm.toFixed(1)} km guiados · próximo marco em {proximoMarco} km.
              </div>

              <div className="barOuter">
                <div className="barInner" />
              </div>
            </aside>
          </div>
        </section>

        {mensagem && <div className="alert success">{mensagem}</div>}
        {erro && <div className="alert error">{erro}</div>}

        <section className="grid">
          <div className="stack">
            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Medalhas do guia</h2>
                  <div className="cardSub">
                    Progressão, atuação na plataforma, conquistas Beta e credenciais CADASTUR em uma única coleção.
                  </div>
                </div>
              </div>

              <div className="cardBody">
                <div className="unifiedMedalGrid">
                  {medalhasUnificadas.map((medalha) => (
                    <button
                      type="button"
                      key={`${medalha.categoria}-${medalha.nome}`}
                      className={`unifiedMedal ${medalha.categoria} medalKey-${classeVisualMedalha(medalha.nome)} ${medalha.desbloqueado ? '' : 'locked'} ${medalha.destaque ? 'current' : ''}`}
                      title={medalha.nome}
                      onClick={() => setMedalhaSelecionada(medalha)}
                      aria-label={medalha.desbloqueado ? `Ver conquista ${medalha.nome}` : 'Ver medalha bloqueada'}
                    >
                      <span className="unifiedMedalFrame">
                        <img
                          className="unifiedMedalArt"
                          src={medalha.svg}
                          alt={medalha.desbloqueado ? medalha.nome : 'Medalha bloqueada'}
                        />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <aside className="stack">
            <section
              className="card statusProfileCard"
              role="button"
              tabIndex={0}
              onClick={abrirPerfilPublicoGuia}
              onKeyDown={handleStatusCardKeyDown}
              aria-label="Abrir meu perfil público de guia"
            >
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Status profissional</h2>
                </div>
              </div>

              <div className="cardBody">
                <div className="statsGrid">
                  <div className="statBox">
                    <div className="statIcon">📋</div>
                    <div className="statValue">{cadasturInformado ? 'Sim' : 'Não'}</div>
                    <div className="statLabel">Número informado</div>
                  </div>
                  <div className="statBox">
                    <div className="statIcon">✅</div>
                    <div className="statValue">{cadasturVerificado ? 'Sim' : 'Não'}</div>
                    <div className="statLabel">Verificado</div>
                  </div>
                  <div className="statBox">
                    <div className="statIcon">🧭</div>
                    <div className="statValue">{cadasturAtivo ? `${anosCadasturAtivo}a` : '—'}</div>
                    <div className="statLabel">Tempo ativo</div>
                  </div>
                </div>
              </div>
            </section>

            <section
              className="card reviewsCard clickableCard"
              role="button"
              tabIndex={0}
              onClick={abrirAvaliacoesGuia}
              onKeyDown={handleAvaliacoesCardKeyDown}
              aria-label="Abrir painel de avaliações do guia"
            >
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Avaliações</h2>
                  <div className="cardSub">
                    Toque no card para abrir o painel completo. Toque em uma avaliação para ver o perfil público do cliente.
                  </div>
                </div>
              </div>

              <div className="cardBody">
                {avaliacoes.length === 0 ? (
                  <div className="empty">
                    Você ainda não recebeu avaliações. Elas aparecerão aqui depois das experiências confirmadas.
                  </div>
                ) : (
                  <div className="reviewList">
                    {avaliacoes.slice(0, 6).map((avaliacao) => (
                      <div
                        className={`review ${avaliacao.cliente_id ? 'clickable' : ''}`}
                        key={avaliacao.id}
                        role={avaliacao.cliente_id ? 'button' : undefined}
                        tabIndex={avaliacao.cliente_id ? 0 : undefined}
                        onClick={(event) => {
                          event.stopPropagation()
                          if (avaliacao.cliente_id) {
                            router.push(`/cliente/publico/${avaliacao.cliente_id}`)
                          }
                        }}
                        onKeyDown={(event) => {
                          event.stopPropagation()
                          if (avaliacao.cliente_id && (event.key === 'Enter' || event.key === ' ')) {
                            event.preventDefault()
                            router.push(`/cliente/publico/${avaliacao.cliente_id}`)
                          }
                        }}
                      >
                        <div className="reviewTop">
                          <div className="reviewClient">
                            <div className="reviewAvatar">
                              {avaliacao.cliente_avatar ? (
                                <img src={avaliacao.cliente_avatar} alt={avaliacao.cliente_nome || 'Cliente'} />
                              ) : (
                                <span>{(avaliacao.cliente_nome || 'C').slice(0, 1).toUpperCase()}</span>
                              )}
                            </div>

                            <div className="reviewName">
                              {avaliacao.cliente_nome || 'Cliente'}
                            </div>
                          </div>

                          <div className="stars">
                            ⭐ {Number(avaliacao.nota || 0).toFixed(1)}
                          </div>
                        </div>

                        <div className="reviewText">
                          {avaliacao.comentario || avaliacao.observacao || avaliacao.descricao || 'Avaliação sem comentário escrito.'}
                        </div>

                        <div className="reviewDate">
                          {formatarData(avaliacao.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </aside>
        </section>
      </div>

      {avatarCropSrc && (
        <AvatarCropModal
          open={Boolean(avatarCropSrc)}
          imageSrc={avatarCropSrc}
          title="Foto do guia"
          onCancel={limparCropAvatar}
          onConfirm={confirmarCropAvatar}
        />
      )}

      {editandoBio && (
        <div className="modalOverlay" onClick={() => !salvandoBio && setEditandoBio(false)}>
          <section className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modalHeader">
              <h2 className="modalTitle">Editar perfil público</h2>
              <div className="modalSub">
                Nome e bio aparecem no card principal do seu perfil de guia.
              </div>
            </div>

            <div className="modalBody">
              <div className="field">
                <label className="label">Nome público</label>
                <input
                  className="input"
                  value={nomePerfil}
                  onChange={(event) => setNomePerfil(event.target.value)}
                  placeholder="Nome que aparece para os aventureiros"
                />
              </div>

              <div className="field">
                <label className="label">Bio pública</label>
                <textarea
                  className="textarea"
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Conte quem você é, sua experiência, seu estilo de condução e o que os aventureiros podem esperar das suas trilhas."
                />
              </div>

              <div className="modalActions">
                <button
                  type="button"
                  className="btn green"
                  onClick={salvarBio}
                  disabled={salvandoBio}
                >
                  {salvandoBio ? 'Salvando...' : 'Salvar perfil'}
                </button>

                <button
                  type="button"
                  className="btn light"
                  disabled={salvandoBio}
                  onClick={() => {
                    setNomePerfil(nomeGuia())
                    setBio(guia?.bio_guia || guia?.bio || '')
                    setEditandoBio(false)
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {modalDadosGuiaAberto && (
        <div className="modalOverlay" onClick={() => !salvandoDados && setModalDadosGuiaAberto(false)}>
          <section className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modalHeader">
              <h2 className="modalTitle">Dados privados do guia</h2>
              <div className="modalSub">
                Chave PIX, CADASTUR e atualizações profissionais ficam protegidos nesta área de configurações.
              </div>
            </div>

            <div className="modalBody">
              <p className="privacyNote">
                Estes dados não ficam expostos no corpo do perfil. O CADASTUR poderá aparecer publicamente apenas como credencial informada/verificada, conforme regra do app.
              </p>

              <div className="formGrid">
                <div className="field">
                  <label className="label">Tipo da chave PIX</label>
                  <select
                    className="select"
                    value={pixTipo}
                    onChange={(event) => setPixTipo(event.target.value)}
                  >
                    {PIX_TIPOS.map((tipo) => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="label">Chave PIX para recebimentos</label>
                  <input
                    className="input"
                    value={pixChave}
                    onChange={(event) => setPixChave(event.target.value)}
                    placeholder="Informe sua chave PIX"
                  />
                </div>

                <div className="field full">
                  <label className="label">CADASTUR</label>
                  <input
                    className="input"
                    value={cadastur}
                    onChange={(event) => setCadastur(event.target.value)}
                    placeholder="Informe seu número CADASTUR"
                  />
                  <div className="helper">
                    Ao salvar, o CADASTUR ficará como informado e aguardará conferência administrativa.
                  </div>
                </div>
              </div>

              <div className="cadasturStatusCard">
                <img
                  className="cadasturStatusIcon"
                  src={
                    cadasturAtivo
                      ? `${MEDALHA_CADASTUR_BASE}/03_cadastur_ativo.svg`
                      : cadasturVerificado
                        ? `${MEDALHA_CADASTUR_BASE}/02_guia_verificado.svg`
                        : `${MEDALHA_CADASTUR_BASE}/01_cadastur_preenchido.svg`
                  }
                  alt={cadasturResumo.titulo}
                />

                <div>
                  <div className="cadasturStatusTitle">{cadasturResumo.titulo}</div>
                  <div className="cadasturStatusText">{cadasturResumo.descricao}</div>
                  <span className={`cadasturStatusTag ${cadasturResumo.classe}`}>
                    {cadasturResumo.classe}
                  </span>
                </div>
              </div>

              <div className="modalActions">
                <button
                  type="button"
                  className="btn green"
                  onClick={async () => {
                    await salvarDadosPrivados()
                    setModalDadosGuiaAberto(false)
                  }}
                  disabled={salvandoDados}
                >
                  {salvandoDados ? 'Salvando...' : 'Salvar dados'}
                </button>

                <button
                  type="button"
                  className="btn light"
                  disabled={salvandoDados}
                  onClick={() => setModalDadosGuiaAberto(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {medalhaSelecionada && (
        <div className="modalOverlay" onClick={() => setMedalhaSelecionada(null)}>
          <section className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modalHeader">
              <h2 className="modalTitle">{medalhaSelecionada.desbloqueado ? medalhaSelecionada.nome : 'Conquista bloqueada'}</h2>
              <div className="modalSub">
                {medalhaSelecionada.desbloqueado
                  ? medalhaSelecionada.subtitulo || 'Conquista desbloqueada no perfil do guia.'
                  : 'Continue sua jornada como guia para revelar os detalhes desta conquista.'}
              </div>
            </div>

            <div className="modalBody">
              <div className={`medalDetailArt ${medalhaSelecionada.categoria || ''} medalKey-${classeVisualMedalha(medalhaSelecionada.nome)}`}>
                <img
                  src={medalhaSelecionada.svg}
                  alt={medalhaSelecionada.desbloqueado ? medalhaSelecionada.nome : 'Medalha bloqueada'}
                />
              </div>

              <div className={`medalStatusPill ${medalhaSelecionada.desbloqueado ? 'unlocked' : 'locked'}`}>
                {medalhaSelecionada.desbloqueado ? 'Conquistada' : 'Bloqueada'}
              </div>

              <p className="helper">
                Categoria: {medalhaSelecionada.categoria}. {medalhaSelecionada.desbloqueado
                  ? 'Esta conquista já faz parte do Passaporte do Guia.'
                  : 'A arte permanece visível como parte da coleção, mas os detalhes completos serão revelados ao desbloquear.'}
              </p>

              <div className="modalActions">
                <button type="button" className="btn dark" onClick={() => setMedalhaSelecionada(null)}>
                  Fechar
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {modalSuporteAberto && (
        <div className="modalOverlay">
          <form className="modal supportModal" onSubmit={enviarSuporte}>
            <div className="modalHeader">
              <h2 className="modalTitle">Ajuda e suporte</h2>
              <div className="modalSub">
                Envie bug, pedido de suporte ou sugestão em um único canal. Depois da resposta do Admin, conclua o chamado e avalie a solução de 1 a 5.
              </div>
            </div>

            <div className="modalBody">
              <div className="supportGrid">
                <div>
                  <div className="field">
                    <label className="label">Tipo da solicitação</label>
                    <select
                      className="input"
                      value={tipoSuporte}
                      onChange={(event) => {
                        const novoTipo = event.target.value as 'bug' | 'suporte' | 'sugestao'
                        setTipoSuporte(novoTipo)
                        setPrioridadeSuporte(novoTipo === 'bug' ? 'alta' : 'normal')

                        if (novoTipo === 'bug') setAssuntoSuporte('Erro no painel do guia')
                        if (novoTipo === 'suporte') setAssuntoSuporte('Mensagem ao suporte')
                        if (novoTipo === 'sugestao') setAssuntoSuporte('Sugestão para o PrussikTrails')
                      }}
                    >
                      <option value="bug">Bug / erro no app</option>
                      <option value="suporte">Mensagem ao suporte</option>
                      <option value="sugestao">Sugestão de melhoria</option>
                    </select>
                  </div>

                  <div className="field">
                    <label className="label">Assunto</label>
                    <input
                      className="input"
                      type="text"
                      value={assuntoSuporte}
                      onChange={(event) => setAssuntoSuporte(event.target.value)}
                      placeholder="Ex.: erro ao abrir grupos"
                    />
                  </div>

                  <div className="field">
                    <label className="label">Descrição</label>
                    <textarea
                      className="input suporteTextarea"
                      value={descricaoSuporte}
                      onChange={(event) => setDescricaoSuporte(event.target.value)}
                      placeholder="Descreva a situação com detalhes."
                    />
                  </div>

                  <div className="field">
                    <label className="label">Prioridade</label>
                    <select
                      className="input"
                      value={prioridadeSuporte}
                      onChange={(event) => setPrioridadeSuporte(event.target.value as 'baixa' | 'normal' | 'alta' | 'urgente')}
                    >
                      <option value="baixa">Baixa</option>
                      <option value="normal">Normal</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </div>

                  {erroSuporte && <div className="errorBox">{erroSuporte}</div>}

                  <div className="modalActions">
                    <button type="submit" className="btn dark" disabled={enviandoSuporte}>
                      {enviandoSuporte ? 'Enviando...' : 'Enviar solicitação'}
                    </button>

                    <button
                      type="button"
                      className="btn light"
                      disabled={enviandoSuporte}
                      onClick={() => setModalSuporteAberto(false)}
                    >
                      Fechar
                    </button>
                  </div>
                </div>

                <aside className="supportHistory">
                  <div>
                    <div className="supportHistoryTitle">Meus chamados</div>
                    <div className="supportHistorySub">
                      Acompanhe status, respostas do Admin e finalize o chamado quando a solução estiver concluída.
                    </div>
                  </div>

                  <div className="supportMiniActions">
                    <button
                      type="button"
                      className="btn light"
                      onClick={() => carregarChamadosSuporte(user?.id)}
                      disabled={carregandoChamadosSuporte}
                    >
                      {carregandoChamadosSuporte ? 'Atualizando...' : 'Atualizar'}
                    </button>
                  </div>

                  {carregandoChamadosSuporte ? (
                    <div className="empty">Carregando seus chamados...</div>
                  ) : chamadosSuporte.length === 0 ? (
                    <div className="empty">
                      Nenhuma solicitação registrada ainda. Quando o Admin responder, a resposta aparecerá nesta área.
                    </div>
                  ) : (
                    chamadosSuporte.map((chamado) => (
                      <article className="supportTicket" key={chamado.id}>
                        <div className="supportTicketTop">
                          <div>
                            <div className="supportTicketTitle">
                              {chamado.assunto || 'Solicitação sem assunto'}
                            </div>
                            <div className="supportTicketMeta">
                              {rotuloTipoChamado(chamado.tipo_chamado)} · {formatarData(chamado.created_at)}
                            </div>
                          </div>

                          <span className={`supportStatus ${classeStatusChamado(chamado.status)}`}>
                            {rotuloStatusChamado(chamado.status)}
                          </span>
                        </div>

                        <div className="supportTicketText">
                          {chamado.descricao || 'Sem descrição.'}
                        </div>

                        {chamado.resposta_admin ? (
                          <>
                            <div className="adminAnswer">
                              <div className="adminAnswerLabel">
                                Resposta do Admin
                                {chamado.respondido_em ? ` · ${formatarData(chamado.respondido_em)}` : ''}
                              </div>
                              <div className="adminAnswerText">
                                {chamado.resposta_admin}
                              </div>
                            </div>

                            {notaChamado(chamado) > 0 || chamadoFinalizado(chamado) ? (
                              <div className="supportResolvedBox">
                                <strong>Chamado concluído pelo guia.</strong>
                                {notaChamado(chamado) > 0 ? ` Nota da resposta: ${notaChamado(chamado)}/5.` : ''}
                                {chamado.avaliacao_resposta_em ? ` Avaliado em ${formatarData(chamado.avaliacao_resposta_em)}.` : chamado.finalizado_em ? ` Finalizado em ${formatarData(chamado.finalizado_em)}.` : ''}
                                {chamado.avaliacao_resposta_comentario ? (
                                  <>
                                    <br />
                                    {chamado.avaliacao_resposta_comentario}
                                  </>
                                ) : null}
                              </div>
                            ) : podeFinalizarChamado(chamado) ? (
                              <div className="supportRatingBox">
                                <div className="supportRatingTitle">Concluir e avaliar resposta</div>
                                <div className="supportRatingText">
                                  Quando a solução estiver concluída, finalize o chamado e dê uma nota de 1 a 5 para a resposta recebida.
                                </div>

                                {avaliandoChamadoId === chamado.id ? (
                                  <>
                                    <div className="supportRatingRow" aria-label="Nota da resposta">
                                      {[1, 2, 3, 4, 5].map((nota) => (
                                        <button
                                          key={nota}
                                          type="button"
                                          className={`ratingBtn ${notaAvaliacaoSuporte === nota ? 'active' : ''}`}
                                          onClick={() => setNotaAvaliacaoSuporte(nota)}
                                        >
                                          {nota}
                                        </button>
                                      ))}
                                    </div>

                                    <textarea
                                      className="supportRatingInput"
                                      value={comentarioAvaliacaoSuporte}
                                      onChange={(event) => setComentarioAvaliacaoSuporte(event.target.value)}
                                      placeholder="Comentário opcional sobre a resposta do suporte."
                                    />

                                    {erroFinalizarSuporte && <div className="errorBox">{erroFinalizarSuporte}</div>}

                                    <div className="modalActions">
                                      <button
                                        type="button"
                                        className="btn dark"
                                        disabled={finalizandoChamadoId === chamado.id}
                                        onClick={() => finalizarChamadoSuporte(chamado)}
                                      >
                                        {finalizandoChamadoId === chamado.id ? 'Finalizando...' : 'Finalizar chamado'}
                                      </button>

                                      <button
                                        type="button"
                                        className="btn light"
                                        disabled={finalizandoChamadoId === chamado.id}
                                        onClick={cancelarAvaliacaoChamado}
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn light"
                                    onClick={() => abrirAvaliacaoChamado(chamado)}
                                  >
                                    Concluir e avaliar
                                  </button>
                                )}
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <div className="supportTicketMeta">
                            Ainda sem resposta do Admin.
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </aside>
              </div>
            </div>
          </form>
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
                <button
                  type="submit"
                  className="btn dark"
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