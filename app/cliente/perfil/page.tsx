'use client'

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import AvatarCropModal from '@/components/AvatarCropModal'
import { v4 as uuidv4 } from 'uuid'

type UsuarioLocal = {
  id: string
  nome?: string | null
  email?: string | null
  tipo?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
}

type ReservaEstatistica = {
  id?: string
  status?: string | null
  pagamento_status?: string | null
  roteiro?: {
    km?: number | null
    distancia_km?: number | null
  } | null
}

type FotoComDimensao = {
  url: string
  width: number
  height: number
  index: number
  proporcao: number
}

type MedalhaBanco = {
  id: string
  status?: string | null
  progresso_atual?: number | null
  progresso_total?: number | null
  conquistada_em?: string | null
  medalhas?: {
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
  } | null
}

type TierJornada = {
  key: string
  nome: string
  titulo: string
  km: number
  fotos: number
  icone: string
  svg: string
  cor: string
  descricao: string
}

const METAS_JORNADA: TierJornada[] = [
  {
    key: 'mochila_partida',
    nome: 'Partida',
    titulo: 'Mochila de Partida',
    km: 0,
    fotos: 0,
    icone: '🎒',
    svg: '/medalhas/progressao/01_mochila_de_partida.svg',
    cor: '#8b5e34',
    descricao: 'O início simbólico do seu Passaporte PrussikTrails.'
  },
  {
    key: 'barraca_base',
    nome: 'Base',
    titulo: 'Barraca Base',
    km: 32,
    fotos: 5,
    icone: '⛺',
    svg: '/medalhas/progressao/02_barraca_base.svg',
    cor: '#64748b',
    descricao: 'Você começou a firmar presença nas trilhas.'
  },
  {
    key: 'fogueira_jornada',
    nome: 'Fogueira',
    titulo: 'Fogueira da Jornada',
    km: 96,
    fotos: 15,
    icone: '🔥',
    svg: '/medalhas/progressao/03_fogueira_da_jornada.svg',
    cor: '#b45309',
    descricao: 'Sua história outdoor já começou a ganhar memória.'
  },
  {
    key: 'lanterna_serra',
    nome: 'Lanterna',
    titulo: 'Lanterna da Serra',
    km: 192,
    fotos: 30,
    icone: '🏮',
    svg: '/medalhas/progressao/04_lanterna_da_serra.svg',
    cor: '#365314',
    descricao: 'Você segue avançando com constância e direção.'
  },
  {
    key: 'placa_trilha',
    nome: 'Rumo',
    titulo: 'Rumo Certo',
    km: 384,
    fotos: 60,
    icone: '🪧',
    svg: '/medalhas/progressao/05_rumo_certo.svg',
    cor: '#3f6212',
    descricao: 'Sua jornada já tem caminho, escolhas e identidade.'
  },
  {
    key: 'corda_prussik',
    nome: 'Prussik',
    titulo: 'Corda Prussik',
    km: 768,
    fotos: 120,
    icone: '🪢',
    svg: '/medalhas/progressao/06_prussik.svg',
    cor: '#334155',
    descricao: 'Um marco avançado de técnica, presença e aventura.'
  },
  {
    key: 'cachoeira_viva',
    nome: 'Cachoeira',
    titulo: 'Cachoeira Viva',
    km: 1152,
    fotos: 200,
    icone: '💧',
    svg: '/medalhas/progressao/07_cachoeira_viva.svg',
    cor: '#0f766e',
    descricao: 'Sua jornada atravessa paisagens, memórias e experiências.'
  },
  {
    key: 'amanhecer_cume',
    nome: 'Cume',
    titulo: 'Amanhecer no Cume',
    km: 1920,
    fotos: 400,
    icone: '🌄',
    svg: '/medalhas/progressao/08_amanhecer_no_cume.svg',
    cor: '#ca8a04',
    descricao: 'Uma conquista rara de continuidade e evolução.'
  },
  {
    key: 'mirante_explorador',
    nome: 'Mirante',
    titulo: 'Mirante do Explorador',
    km: 3840,
    fotos: 1000,
    icone: '🔭',
    svg: '/medalhas/progressao/09_mirante_do_explorador.svg',
    cor: '#111827',
    descricao: 'Um olhar amplo sobre tudo o que você já viveu nas trilhas.'
  },
  {
    key: 'mapa_lendario',
    nome: 'Lenda',
    titulo: 'Mapa Lendário',
    km: 7680,
    fotos: 2000,
    icone: '🗺️',
    svg: '/medalhas/progressao/10_mapa_lendario.svg',
    cor: '#0f172a',
    descricao: 'O nível lendário da jornada Prussik: cada trilha virou história.'
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

function obterSvgMedalhaBeta(medalha?: MedalhaBanco['medalhas'] | null) {
  const codigo = normalizarChaveMedalha(medalha?.codigo)
  const nome = normalizarChaveMedalha(medalha?.nome)

  if (BETA_MEDALHAS_SVG[codigo]) return BETA_MEDALHAS_SVG[codigo]
  if (BETA_MEDALHAS_SVG[nome]) return BETA_MEDALHAS_SVG[nome]

  if (nome.includes('inicio') && nome.includes('beta')) {
    return BETA_MEDALHAS_SVG.inicio_jornada_beta
  }

  if (nome.includes('botinha') && nome.includes('beta')) {
    return BETA_MEDALHAS_SVG.botinha_beta_oficial
  }

  if (nome.includes('aventureiro') && nome.includes('pioneiro') && nome.includes('beta')) {
    return BETA_MEDALHAS_SVG.aventureiro_pioneiro_beta
  }

  if (nome.includes('voz') && nome.includes('trilha') && nome.includes('beta')) {
    return BETA_MEDALHAS_SVG.voz_da_trilha_beta
  }

  if (nome.includes('guia') && nome.includes('pioneiro') && nome.includes('beta')) {
    return BETA_MEDALHAS_SVG.guia_pioneiro_beta
  }

  if (nome.includes('construtor') && nome.includes('beta')) {
    return BETA_MEDALHAS_SVG.construtor_da_jornada_beta
  }

  return ''
}

function obterFallbackSvgMedalhaBeta(svg: string) {
  if (!svg.startsWith('/medalhas/iniciais_jornada/')) return ''
  return svg.replace('/medalhas/iniciais_jornada/', '/medalhas/prussik_svg_pack/iniciais_jornada/')
}

const ALTURA_TARGET = 200
const LIMITE_INICIAL_FOTOS_LAYOUT = 24

function agendarTarefaLeve(callback: () => void) {
  if (typeof window === 'undefined') return

  const win = window as Window & {
    requestIdleCallback?: (
      callback: () => void,
      options?: { timeout?: number }
    ) => number
  }

  if (typeof win.requestIdleCallback === 'function') {
    win.requestIdleCallback(callback, { timeout: 900 })
    return
  }

  window.setTimeout(callback, 80)
}


function normalizar(valor?: string | null) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function numeroSeguro(valor: unknown, fallback = 0) {
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : fallback
}

function formatarKm(km: number) {
  if (km >= 1000) return km.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  return km.toFixed(km % 1 === 0 ? 0 : 1)
}

function obterNivelAtual(km: number) {
  let atual = METAS_JORNADA[0]

  for (const meta of METAS_JORNADA) {
    if (km >= meta.km) atual = meta
  }

  return atual
}

function obterProximoNivel(km: number) {
  for (const meta of METAS_JORNADA) {
    if (km < meta.km) return meta
  }

  return METAS_JORNADA[METAS_JORNADA.length - 1]
}

function obterMarcoAnterior(km: number) {
  let anterior = METAS_JORNADA[0]

  for (const meta of METAS_JORNADA) {
    if (km >= meta.km) anterior = meta
  }

  return anterior
}

function calcularProgressoTier(km: number) {
  const anterior = obterMarcoAnterior(km)
  const proximo = obterProximoNivel(km)

  if (proximo.km <= anterior.km) return 100

  const progresso = ((km - anterior.km) / (proximo.km - anterior.km)) * 100
  return Math.max(0, Math.min(100, progresso))
}

function calcularFotosLiberadas(km: number) {
  let fotos = 0

  for (const meta of METAS_JORNADA) {
    if (km >= meta.km) fotos = meta.fotos
  }

  return fotos
}

function erroDeColunaAusente(error: unknown) {
  const err = error as { code?: string; message?: string; details?: string; hint?: string }
  const texto = String(err?.message || err?.details || err?.hint || '').toLowerCase()

  return (
    err?.code === '42703' ||
    err?.code === 'PGRST204' ||
    texto.includes('could not find') ||
    texto.includes('schema cache') ||
    texto.includes('column')
  )
}

function extrairColunaAusente(error: unknown) {
  const err = error as { message?: string; details?: string; hint?: string }
  const texto = [err?.message, err?.details, err?.hint].filter(Boolean).join(' ')

  const matchAspas = texto.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  const matchColumn = texto.match(/column\s+([a-zA-Z0-9_]+)/i)
  if (matchColumn?.[1]) return matchColumn[1]

  return ''
}

export default function PerfilCliente() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const fotosInputRef = useRef<HTMLInputElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [totalKm, setTotalKm] = useState(0)
  const [totalTrilhas, setTotalTrilhas] = useState(0)
  const [fotos, setFotos] = useState<string[]>([])
  const [bio, setBio] = useState('')
  const [nome, setNome] = useState('')
  const [editandoNome, setEditandoNome] = useState(false)
  const [editandoBio, setEditandoBio] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [cropAberto, setCropAberto] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState('')
  const [enviandoAvatar, setEnviandoAvatar] = useState(false)

  const [lightboxAberto, setLightboxAberto] = useState(false)
  const [fotoAtual, setFotoAtual] = useState(0)
  const [menuConfiguracoesAberto, setMenuConfiguracoesAberto] = useState(false)
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [erroSenha, setErroSenha] = useState('')
  const [modalSuporteAberto, setModalSuporteAberto] = useState(false)
  const [tipoSuporte, setTipoSuporte] = useState<'bug' | 'suporte' | 'sugestao'>('suporte')
  const [assuntoSuporte, setAssuntoSuporte] = useState('')
  const [descricaoSuporte, setDescricaoSuporte] = useState('')
  const [prioridadeSuporte, setPrioridadeSuporte] = useState<'baixa' | 'normal' | 'alta' | 'urgente'>('normal')
  const [enviandoSuporte, setEnviandoSuporte] = useState(false)
  const [erroSuporte, setErroSuporte] = useState('')

  const [linhas, setLinhas] = useState<FotoComDimensao[][]>([])
  const [carregandoFotos, setCarregandoFotos] = useState(true)

  const [medalhasBanco, setMedalhasBanco] = useState<MedalhaBanco[]>([])
  const [carregandoMedalhas, setCarregandoMedalhas] = useState(true)

  const nivelAtual = useMemo(() => obterNivelAtual(totalKm), [totalKm])
  const proximoNivel = useMemo(() => obterProximoNivel(totalKm), [totalKm])
  const progressoParaProximoMarco = useMemo(() => calcularProgressoTier(totalKm), [totalKm])
  const fotosLiberadas = useMemo(() => calcularFotosLiberadas(totalKm), [totalKm])
  const faltamKm = Math.max(0, proximoNivel.km - totalKm)
  const medalhasKmConquistadas = METAS_JORNADA.filter((meta) => totalKm >= meta.km).length

  useEffect(() => {
    router.prefetch('/cliente/dashboard')
    router.prefetch('/cliente/minhas-reservas')
    router.prefetch('/roteiros')
  }, [router])

  useEffect(() => {
    const userData = localStorage.getItem('user')

    if (!userData) {
      router.push('/login')
      return
    }

    const parsedUser = JSON.parse(userData) as UsuarioLocal

    if (parsedUser.tipo !== 'cliente') {
      router.push('/')
      return
    }

    setUser(parsedUser)
    setNome(parsedUser.nome || '')
    setAvatarPreview(parsedUser.avatar_url || parsedUser.foto_url || parsedUser.imagem_url || null)

    void carregarDados(parsedUser.id)
  }, [router])

  async function carregarDados(userId: string) {
    setCarregandoFotos(true)
    setCarregandoMedalhas(true)

    await Promise.allSettled([
      carregarPerfilBasico(userId),
      carregarEstatisticas(userId)
    ])

    agendarTarefaLeve(() => {
      void carregarMedalhas(userId)
    })

    agendarTarefaLeve(() => {
      void carregarFotos(userId)
    })
  }

  async function carregarPerfilBasico(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('nome, bio, avatar_url, foto_url, imagem_url')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.warn('Não foi possível carregar dados básicos do cliente:', error)
      return
    }

    if (!data) return

    const avatar =
      data.avatar_url ||
      data.foto_url ||
      data.imagem_url ||
      ''

    if (data.nome) setNome(data.nome)
    if (data.bio) setBio(data.bio)
    if (avatar) setAvatarPreview(avatar)

    atualizarLocalStorage({
      nome: data.nome || undefined,
      avatar_url: avatar || undefined,
      foto_url: avatar || undefined,
      imagem_url: avatar || undefined,
    })
  }

  async function atualizarUsuarioComFallback(
    userId: string,
    payloadOriginal: Record<string, unknown>
  ) {
    let payloadAtual = { ...payloadOriginal }

    for (let tentativa = 0; tentativa < 12; tentativa++) {
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

  async function carregarNome(userId: string) {
    const { data } = await supabase.from('users').select('nome').eq('id', userId).single()

    if (data?.nome) {
      setNome(data.nome)
      atualizarLocalStorage({ nome: data.nome })
    }
  }

  async function salvarNome() {
    if (!user?.id) return

    if (!nome.trim()) {
      setMensagem('❌ Nome não pode ficar vazio')
      return
    }

    setErro('')

    try {
      await atualizarUsuarioComFallback(user.id, {
        nome: nome.trim(),
        updated_at: new Date().toISOString()
      })

      atualizarLocalStorage({ nome: nome.trim() })
      setMensagem('✅ Nome atualizado!')
      setEditandoNome(false)
    } catch (error) {
      console.error(error)
      setMensagem('❌ Erro ao salvar nome')
    } finally {
      setTimeout(() => setMensagem(''), 3000)
    }
  }

  async function carregarMedalhas(userId: string) {
    setCarregandoMedalhas(true)

    try {
      const { data, error } = await supabase
        .from('usuarios_medalhas')
        .select(`
          id,
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
        console.warn('Erro ao carregar medalhas:', error)
        setMedalhasBanco([])
        return
      }

      const lista = ((data || []) as unknown as MedalhaBanco[]).filter(
        (item) => normalizar(item.status) === 'conquistada'
      )

      setMedalhasBanco(lista)
    } catch (error) {
      console.warn('Erro inesperado ao carregar medalhas:', error)
      setMedalhasBanco([])
    } finally {
      setCarregandoMedalhas(false)
    }
  }

  async function carregarFotos(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('fotos_aventuras')
      .eq('id', userId)
      .maybeSingle()

    if (data?.fotos_aventuras) {
      const lista = Array.isArray(data.fotos_aventuras) ? data.fotos_aventuras : []
      setFotos(lista)

      const listaInicial = lista.slice(0, LIMITE_INICIAL_FOTOS_LAYOUT)
      await carregarLayoutJustificado(listaInicial)
    } else {
      setFotos([])
      setLinhas([])
      setCarregandoFotos(false)
    }
  }

  async function carregarLayoutJustificado(urls: string[]) {
    if (urls.length === 0) {
      setLinhas([])
      setCarregandoFotos(false)
      return
    }

    setCarregandoFotos(true)

    const imagensComDimensoes = await Promise.all(
      urls.map(async (url, idx) => {
        return new Promise<FotoComDimensao>((resolve) => {
          const img = new Image()
          img.onload = () => {
            const width = img.width || 1200
            const height = img.height || 800
            resolve({ url, width, height, index: idx, proporcao: width / height })
          }
          img.onerror = () => {
            resolve({ url, width: 1200, height: 800, index: idx, proporcao: 1.5 })
          }
          img.src = url
        })
      })
    )

    setLinhas(calcularLayoutJustificado(imagensComDimensoes, ALTURA_TARGET))
    setCarregandoFotos(false)
  }

  function calcularLayoutJustificado(imagens: FotoComDimensao[], alturaAlvo: number) {
    const linhasCalc: FotoComDimensao[][] = []
    let linhaAtual: FotoComDimensao[] = []
    let somaProporcoes = 0

    for (const img of imagens) {
      linhaAtual.push(img)
      somaProporcoes += img.proporcao

      const larguraEstimada = somaProporcoes * alturaAlvo

      if (linhaAtual.length >= 2 && larguraEstimada > 400 && larguraEstimada < 1200) {
        linhasCalc.push([...linhaAtual])
        linhaAtual = []
        somaProporcoes = 0
      }
    }

    if (linhaAtual.length > 0) linhasCalc.push(linhaAtual)

    return linhasCalc
  }

  async function carregarAvatar(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('avatar_url, foto_url, imagem_url')
      .eq('id', userId)
      .single()

    const avatar = data?.avatar_url || data?.foto_url || data?.imagem_url || ''

    if (avatar) {
      setAvatarPreview(avatar)
      atualizarLocalStorage({ avatar_url: avatar, foto_url: avatar, imagem_url: avatar })
    }
  }

  async function carregarEstatisticas(userId: string) {
    const { data: reservas } = await supabase
      .from('reservas')
      .select('*, roteiro:roteiro_id(km, distancia_km)')
      .eq('cliente_id', userId)
      .eq('status', 'realizada')

    const lista = ((reservas || []) as unknown as ReservaEstatistica[])

    const km = lista.reduce((total, reserva) => {
      return total + numeroSeguro(reserva.roteiro?.km ?? reserva.roteiro?.distancia_km)
    }, 0)

    setTotalKm(km)
    setTotalTrilhas(lista.length)
  }

  async function carregarBio(userId: string) {
    const { data } = await supabase.from('users').select('bio').eq('id', userId).single()
    if (data?.bio) setBio(data.bio)
  }

  async function salvarBio() {
    if (!user?.id) return

    setErro('')

    try {
      await atualizarUsuarioComFallback(user.id, {
        bio,
        updated_at: new Date().toISOString()
      })

      setMensagem('✅ Biografia atualizada!')
      setEditandoBio(false)
    } catch (error) {
      console.error(error)
      setMensagem('❌ Erro ao salvar biografia')
    } finally {
      setTimeout(() => setMensagem(''), 3000)
    }
  }

  function atualizarLocalStorage(payload: Partial<UsuarioLocal>) {
    const userData = localStorage.getItem('user')

    if (!userData) return

    const usuario = JSON.parse(userData) as UsuarioLocal
    const atualizado = { ...usuario, ...payload }
    localStorage.setItem('user', JSON.stringify(atualizado))
    setUser(atualizado)
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMensagem('❌ Escolha um arquivo de imagem.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setCropImageSrc(String(reader.result || ''))
      setCropAberto(true)
    }
    reader.readAsDataURL(file)
  }

  async function uploadAvatar(file: File) {
    if (!user?.id) return

    setEnviandoAvatar(true)
    setErro('')
    setMensagem('')

    try {
      const caminho = `clientes/${user.id}/avatar/avatar-${Date.now()}.webp`

      const { error: uploadError } = await supabase.storage
        .from('fotos-aventuras')
        .upload(caminho, file, {
          upsert: true,
          contentType: file.type || 'image/webp'
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('fotos-aventuras').getPublicUrl(caminho)
      const publicUrl = data?.publicUrl || ''

      if (!publicUrl) throw new Error('Não foi possível gerar a URL pública da foto.')

      await atualizarUsuarioComFallback(user.id, {
        avatar_url: publicUrl,
        foto_url: publicUrl,
        imagem_url: publicUrl,
        updated_at: new Date().toISOString()
      })

      setAvatarPreview(publicUrl)
      atualizarLocalStorage({ avatar_url: publicUrl, foto_url: publicUrl, imagem_url: publicUrl })
      setCropAberto(false)
      setCropImageSrc('')
      setMensagem('✅ Foto de perfil atualizada!')
    } catch (error) {
      console.error('Erro ao enviar avatar:', error)
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar a foto.'
      setErro(message)
      setMensagem('❌ Não foi possível atualizar a foto.')
    } finally {
      setEnviandoAvatar(false)
      setTimeout(() => setMensagem(''), 3000)
    }
  }

  async function handleUploadFotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''

    if (!user?.id || files.length === 0) return

    if (fotos.length + files.length > fotosLiberadas) {
      setMensagem(`⚠️ Limite de ${fotosLiberadas} fotos.`)
      setTimeout(() => setMensagem(''), 4000)
      return
    }

    setUploading(true)

    const novasUrls: string[] = []

    for (const file of files) {
      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `${uuidv4()}.${fileExt}`
      const filePath = `clientes/${user.id}/${fileName}`

      const { error } = await supabase.storage.from('fotos-aventuras').upload(filePath, file)

      if (error) {
        console.error(error)
        continue
      }

      const { data } = supabase.storage.from('fotos-aventuras').getPublicUrl(filePath)
      if (data?.publicUrl) novasUrls.push(data.publicUrl)
    }

    const novasFotos = [...fotos, ...novasUrls]
    await atualizarUsuarioComFallback(user.id, { fotos_aventuras: novasFotos })
    setFotos(novasFotos)
    await carregarLayoutJustificado(novasFotos.slice(0, LIMITE_INICIAL_FOTOS_LAYOUT))
    setMensagem(`✅ ${novasUrls.length} foto(s) adicionada(s)!`)
    setUploading(false)
    setTimeout(() => setMensagem(''), 3000)
  }

  async function removerFoto(index: number) {
    if (!user?.id) return
    if (!confirm('Remover esta foto?')) return

    const novasFotos = fotos.filter((_, i) => i !== index)
    await atualizarUsuarioComFallback(user.id, { fotos_aventuras: novasFotos })
    setFotos(novasFotos)
    await carregarLayoutJustificado(novasFotos.slice(0, LIMITE_INICIAL_FOTOS_LAYOUT))
    setMensagem('✅ Foto removida!')
    setTimeout(() => setMensagem(''), 3000)
  }

  function abrirLightbox(index: number) {
    setFotoAtual(index)
    setLightboxAberto(true)
  }

  function proximaFoto() {
    setFotoAtual((prev) => (prev + 1) % fotos.length)
  }

  function fotoAnterior() {
    setFotoAtual((prev) => (prev - 1 + fotos.length) % fotos.length)
  }

  function handleLogout() {
    localStorage.removeItem('user')
    router.push('/login')
  }

  function abrirModalSenha() {
    setMenuConfiguracoesAberto(false)
    setErroSenha('')
    setSenhaAtual('')
    setNovaSenha('')
    setConfirmarNovaSenha('')
    setModalSenhaAberto(true)
  }

  function abrirModalSuporte(tipo: 'bug' | 'suporte' | 'sugestao') {
    setMenuConfiguracoesAberto(false)
    setTipoSuporte(tipo)
    setPrioridadeSuporte(tipo === 'bug' ? 'alta' : 'normal')
    setAssuntoSuporte(tipo === 'bug' ? 'Erro no app' : tipo === 'sugestao' ? 'Sugestão para o PrussikTrails' : 'Mensagem ao suporte')
    setDescricaoSuporte('')
    setErroSuporte('')
    setModalSuporteAberto(true)
  }

  async function enviarSuporte() {
    if (!user?.id) return

    if (!assuntoSuporte.trim()) {
      setErroSuporte('Informe o assunto da solicitação.')
      return
    }

    if (!descricaoSuporte.trim() || descricaoSuporte.trim().length < 8) {
      setErroSuporte('Descreva melhor o que aconteceu.')
      return
    }

    try {
      setEnviandoSuporte(true)
      setErroSuporte('')

      const response = await fetch('/api/suporte/chamados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuarioId: user.id,
          tipoUsuario: 'cliente',
          tipoChamado: tipoSuporte,
          assunto: assuntoSuporte,
          descricao: descricaoSuporte,
          prioridade: prioridadeSuporte,
          paginaOrigem: typeof window !== 'undefined' ? window.location.pathname : '/cliente/perfil',
          metadata: {
            email: user.email || '',
            nome: user.nome || '',
          },
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.erro || data?.message || 'Não foi possível enviar a solicitação.')
      }

      setModalSuporteAberto(false)
      setAssuntoSuporte('')
      setDescricaoSuporte('')
      setMensagem('✅ Solicitação enviada com sucesso!')
      setTimeout(() => setMensagem(''), 3000)
    } catch (error: unknown) {
      setErroSuporte(error instanceof Error ? error.message : 'Erro ao enviar solicitação.')
    } finally {
      setEnviandoSuporte(false)
    }
  }

  async function alterarSenha() {
    if (!user?.id) return

    if (!novaSenha || novaSenha.length < 6) {
      setErroSenha('A nova senha precisa ter no mínimo 6 caracteres.')
      return
    }

    if (novaSenha !== confirmarNovaSenha) {
      setErroSenha('A confirmação da nova senha não confere.')
      return
    }

    try {
      setSalvandoSenha(true)
      setErroSenha('')

      const response = await fetch('/api/alterar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email || '',
          senhaAtual,
          novaSenha
        })
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'Não foi possível alterar a senha.')
      }

      setModalSenhaAberto(false)
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarNovaSenha('')
      setMensagem('✅ Senha alterada com sucesso!')
      setTimeout(() => setMensagem(''), 3000)
    } catch (error: unknown) {
      const mensagemErro = error instanceof Error ? error.message : 'Erro ao alterar senha.'
      setErroSenha(mensagemErro)
    } finally {
      setSalvandoSenha(false)
    }
  }

  if (!user) {
    return (
      <div className="loadingSimple">
        <style>{styles}</style>
        Carregando...
      </div>
    )
  }

  return (
    <main className="page">
      <style>{styles}</style>

      <AvatarCropModal
        open={cropAberto}
        imageSrc={cropImageSrc}
        title="Foto do Passaporte"
        onCancel={() => {
          if (enviandoAvatar) return
          setCropAberto(false)
          setCropImageSrc('')
        }}
        onConfirm={uploadAvatar}
      />

      <header className="topbar">
        <div className="topbarInner">
          <div className="topbarSpacer" aria-hidden="true" />

          <button
            className="brand brandLogoOnly"
            type="button"
            onClick={() => router.push('/cliente/dashboard')}
            aria-label="Voltar para a dashboard do cliente"
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />
            <span>Passaporte outdoor</span>
          </button>

          <div className="topActions">
            <div className="settingsWrap">
              <button
                className="gearButton"
                type="button"
                aria-label="Abrir configurações"
                onClick={() => setMenuConfiguracoesAberto((aberto) => !aberto)}
              >
                ⚙
              </button>

              {menuConfiguracoesAberto && (
                <div className="settingsMenu">
                  <button type="button" onClick={() => abrirModalSuporte('suporte')}>
                    🛟 Ajuda e suporte
                  </button>

                  <button type="button" onClick={abrirModalSenha}>
                    🔐 Alterar senha
                  </button>

                  <button type="button" className="dangerItem" onClick={handleLogout}>
                    🚪 Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="shell">
        <section className="passportHero">
          <div className="avatarColumn">
            <button
              type="button"
              className="avatarButton"
              onClick={() => fileInputRef.current?.click()}
              disabled={enviandoAvatar}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt={nome || user.email || 'Cliente'} />
              ) : (
                <span>{(nome || user.email || 'A').charAt(0).toUpperCase()}</span>
              )}
            </button>
            <input
              ref={fileInputRef}
              className="hiddenInput"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="heroTextBlock">
            <div className="kicker">Passaporte PrussikTrails</div>

            {editandoNome ? (
              <div className="nameEditRow">
                <input value={nome} onChange={(event) => setNome(event.target.value)} autoFocus />
                <button type="button" onClick={salvarNome}>Salvar</button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setEditandoNome(false)
                    carregarNome(user.id)
                  }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="nameRow">
                <h1>{nome || user.email}</h1>
                <button type="button" onClick={() => setEditandoNome(true)}>✏️</button>
              </div>
            )}

            <p>
              Seu perfil de jornada outdoor: quilômetros, trilhas, fotos e medalhas reunidos em um só lugar.
            </p>

            <div className="heroStats">
              <div>
                <strong>{formatarKm(totalKm)}</strong>
                <span>km</span>
              </div>
              <div>
                <strong>{totalTrilhas}</strong>
                <span>trilhas</span>
              </div>
              <div>
                <strong>{medalhasKmConquistadas + medalhasBanco.length}</strong>
                <span>medalhas</span>
              </div>
            </div>
          </div>

          <aside className="rankCard">
            <div className="rankMedal rankSvgMedal" style={{ borderColor: nivelAtual.cor }}>
              <img src={nivelAtual.svg} alt={nivelAtual.titulo} loading="eager" decoding="async" />
            </div>
            <strong>{nivelAtual.titulo}</strong>
            <p>{nivelAtual.descricao}</p>
            <div className="progressMeta">
              <span>{formatarKm(totalKm)} km</span>
              <span>Próximo marco</span>
            </div>
            <div className="progressTrack">
              <div style={{ width: `${progressoParaProximoMarco}%` }} />
            </div>
            <small>
              {faltamKm > 0 ? 'Continue sua jornada para revelar a próxima medalha.' : 'Você alcançou o maior marco da jornada.'}
            </small>
          </aside>
        </section>

        {mensagem && (
          <div className={mensagem.includes('✅') ? 'notice success' : 'notice warning'}>
            {mensagem}
          </div>
        )}
        {erro && <div className="notice error">{erro}</div>}

        <section className="grid">
          <div className="leftStack">
            <section className="card bioCard">
              <div className="cardHeader">
                <div>
                  <h2>Sobre minha jornada</h2>
                  <span>Um espaço curto para contar seu estilo de aventura.</span>
                </div>
                {!editandoBio && (
                  <button type="button" onClick={() => setEditandoBio(true)}>Editar</button>
                )}
              </div>

              <div className="cardBody">
                {editandoBio ? (
                  <>
                    <textarea
                      value={bio}
                      onChange={(event) => setBio(event.target.value)}
                      rows={4}
                      placeholder="Conte algo sobre você, seu ritmo, o que gosta de viver nas trilhas..."
                    />
                    <div className="actionRow">
                      <button type="button" className="primary" onClick={salvarBio}>Salvar bio</button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => {
                          setEditandoBio(false)
                          carregarBio(user.id)
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="bioText">
                    {bio || 'Clique em editar para adicionar uma biografia simples ao seu Passaporte PrussikTrails.'}
                  </p>
                )}
              </div>
            </section>

            <section className="card">
              <div className="cardHeader compactHeader">
                <div>
                  <h2>Medalhas</h2>
                </div>
              </div>

              <div className="cardBody">
                <div className="unifiedMedalGrid">
                  {METAS_JORNADA.map((meta) => {
                    const desbloqueado = totalKm >= meta.km
                    return (
                      <article key={meta.key} className={desbloqueado ? 'tierCard unlocked' : 'tierCard'}>
                        <div className="hexMedal svgMedalWrap" style={{ borderColor: meta.cor }}>
                          <img
                            src={meta.svg}
                            alt={meta.titulo}
                            className={desbloqueado ? 'medalSvg' : 'medalSvg lockedSvg'}
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <strong>{meta.titulo}</strong>
                        <small>{desbloqueado ? 'Conquistada' : 'Bloqueada'}</small>
                      </article>
                    )
                  })}

                  {medalhasBanco.slice(0, 12).map((item) => {
                    const medalha = item.medalhas
                    const svgBeta = obterSvgMedalhaBeta(medalha)
                    const fallbackSvgBeta = obterFallbackSvgMedalhaBeta(svgBeta)

                    return (
                      <article
                        key={item.id}
                        className={svgBeta ? 'tierCard unlocked specialUnified betaUnified' : 'tierCard unlocked specialUnified'}
                      >
                        {svgBeta ? (
                          <div className="hexMedal svgMedalWrap betaSvgMedalWrap" style={{ borderColor: medalha?.cor || '#991b1b' }}>
                            <img
                              src={svgBeta}
                              alt={medalha?.nome || 'Medalha Beta'}
                              className="medalSvg betaMedalSvg"
                              loading="lazy"
                              decoding="async"
                              data-fallback={fallbackSvgBeta}
                              onError={(event) => {
                                const fallback = event.currentTarget.dataset.fallback
                                if (fallback) {
                                  event.currentTarget.src = fallback
                                  event.currentTarget.dataset.fallback = ''
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div className="hexMedal" style={{ borderColor: medalha?.cor || '#991b1b' }}>
                            <span>{medalha?.icone || '🏅'}</span>
                          </div>
                        )}
                        <strong>{medalha?.nome || 'Medalha'}</strong>
                        <small>{medalha?.categoria || 'Especial'}</small>
                      </article>
                    )
                  })}
                </div>
              </div>
            </section>

            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2>Fotos das aventuras</h2>
                  <span>{fotos.length}/{fotosLiberadas} fotos liberadas no seu nível atual.</span>
                </div>
                <button type="button" onClick={() => fotosInputRef.current?.click()} disabled={uploading || fotosLiberadas <= 0}>
                  {uploading ? 'Enviando...' : 'Enviar fotos'}
                </button>
                <input
                  ref={fotosInputRef}
                  className="hiddenInput"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUploadFotos}
                  disabled={uploading}
                />
              </div>

              <div className="cardBody">
                <div className="photoMilestones">
                  {METAS_JORNADA.filter((meta) => meta.fotos > 0).slice(0, 8).map((meta) => (
                    <span key={meta.key} className={totalKm >= meta.km ? 'active' : ''}>
                      {meta.km}km · {meta.fotos} fotos
                    </span>
                  ))}
                </div>

                {carregandoFotos ? (
                  <div className="emptyBox">Carregando fotos...</div>
                ) : fotos.length === 0 ? (
                  <div className="emptyBox">Envie registros das suas aventuras para montar sua galeria.</div>
                ) : (
                  <>
                    {fotos.length > LIMITE_INICIAL_FOTOS_LAYOUT && (
                      <div className="galleryHint">
                        Exibindo as primeiras {LIMITE_INICIAL_FOTOS_LAYOUT} fotos para manter o perfil mais leve. As demais seguem salvas no seu Passaporte.
                      </div>
                    )}

                    <div ref={containerRef} className="justifiedGrid">
                      {linhas.map((linha, linhaIndex) => {
                        const somaProporcoes = linha.reduce((acc, img) => acc + img.proporcao, 0)
                        return (
                          <div className="photoRow" key={linhaIndex}>
                            {linha.map((img) => {
                              const largura = (img.proporcao / somaProporcoes) * 100
                              return (
                                <div
                                  key={`${img.url}-${img.index}`}
                                  className="photoCell"
                                  onClick={() => abrirLightbox(img.index)}
                                  style={{ width: `${largura}%` }}
                                >
                                  <img src={img.url} alt={`Foto ${img.index + 1}`} loading="lazy" decoding="async" />
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      removerFoto(img.index)
                                    }}
                                  >
                                    ×
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>

          <aside className="rightStack">
            <section className="card compactCard">
              <div className="cardBody">
                <div className="summaryLine">
                  <span>Nível atual</span>
                  <strong>{nivelAtual.nome}</strong>
                </div>
                <div className="summaryLine">
                  <span>Próxima conquista</span>
                  <strong>{proximoNivel.nome}</strong>
                </div>
                <div className="summaryLine">
                  <span>Fotos liberadas</span>
                  <strong>{fotosLiberadas}</strong>
                </div>
                <div className="summaryLine">
                  <span>Fotos usadas</span>
                  <strong>{fotos.length}</strong>
                </div>
              </div>
            </section>

            <section className="card compactCard">
              <div className="cardHeader compact">
                <div>
                  <h2>Próxima conquista</h2>
                  <span>O próximo degrau da sua jornada.</span>
                </div>
              </div>
              <div className="cardBody">
                <div className="nextMedal">
                  <div className="hexMedal nextSvgMedal" style={{ borderColor: proximoNivel.cor }}>
                    <img src={proximoNivel.svg} alt={proximoNivel.titulo} className="medalSvg" loading="lazy" decoding="async" />
                  </div>
                  <strong>{proximoNivel.titulo}</strong>
                  <p>{proximoNivel.descricao}</p>
                  <div className="progressTrack soft">
                    <div style={{ width: `${progressoParaProximoMarco}%` }} />
                  </div>
                </div>
              </div>
            </section>

            <section className="card compactCard">
              <div className="cardHeader compact">
                <div>
                  <h2>Leitura rápida</h2>
                  <span>Seu momento no Passaporte.</span>
                </div>
              </div>
              <div className="cardBody">
                <p className="plainText">
                  Você está no nível <strong>{nivelAtual.titulo}</strong>, com {formatarKm(totalKm)} km registrados e {totalTrilhas} trilha(s) realizadas.
                </p>
              </div>
            </section>
          </aside>
        </section>
      </div>

      {modalSenhaAberto && (
        <div className="passwordOverlay" onClick={() => !salvandoSenha && setModalSenhaAberto(false)}>
          <section className="passwordSheet" onClick={(event) => event.stopPropagation()}>
            <div className="passwordHeader">
              <div>
                <span>Configurações</span>
                <h2>Alterar senha</h2>
              </div>
              <button type="button" onClick={() => setModalSenhaAberto(false)} disabled={salvandoSenha}>
                ×
              </button>
            </div>

            <label>
              Senha atual
              <input
                type="password"
                value={senhaAtual}
                onChange={(event) => setSenhaAtual(event.target.value)}
                placeholder="Digite sua senha atual"
                autoComplete="current-password"
              />
            </label>

            <label>
              Nova senha
              <input
                type="password"
                value={novaSenha}
                onChange={(event) => setNovaSenha(event.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
            </label>

            <label>
              Confirmar nova senha
              <input
                type="password"
                value={confirmarNovaSenha}
                onChange={(event) => setConfirmarNovaSenha(event.target.value)}
                placeholder="Digite a nova senha novamente"
                autoComplete="new-password"
              />
            </label>

            {erroSenha && <p className="passwordError">{erroSenha}</p>}

            <div className="passwordActions">
              <button type="button" className="secondary" onClick={() => setModalSenhaAberto(false)} disabled={salvandoSenha}>
                Cancelar
              </button>
              <button type="button" className="primary" onClick={alterarSenha} disabled={salvandoSenha}>
                {salvandoSenha ? 'Salvando...' : 'Alterar senha'}
              </button>
            </div>
          </section>
        </div>
      )}

      {modalSuporteAberto && (
        <div className="passwordOverlay" onClick={() => !enviandoSuporte && setModalSuporteAberto(false)}>
          <section className="passwordSheet supportSheet" onClick={(event) => event.stopPropagation()}>
            <div className="passwordHeader">
              <div>
                <span>Ajuda e suporte</span>
                <h2>{tipoSuporte === 'bug' ? 'Reportar bug' : tipoSuporte === 'sugestao' ? 'Sugerir melhoria' : 'Mensagem ao suporte'}</h2>
              </div>
              <button type="button" onClick={() => setModalSuporteAberto(false)} disabled={enviandoSuporte}>
                ×
              </button>
            </div>

            <p className="supportIntro">
              Conte para nós o que aconteceu. Sua mensagem ajuda a melhorar a experiência do PrussikTrails durante a fase Beta.
            </p>

            <label>
              Tipo
              <select value={tipoSuporte} onChange={(event) => setTipoSuporte(event.target.value as 'bug' | 'suporte' | 'sugestao')}>
                <option value="bug">Bug / erro no app</option>
                <option value="suporte">Mensagem ao suporte</option>
                <option value="sugestao">Sugestão de melhoria</option>
              </select>
            </label>

            <label>
              Assunto
              <input
                type="text"
                value={assuntoSuporte}
                onChange={(event) => setAssuntoSuporte(event.target.value)}
                placeholder="Ex.: erro ao carregar medalhas"
              />
            </label>

            <label>
              Descrição
              <textarea
                value={descricaoSuporte}
                onChange={(event) => setDescricaoSuporte(event.target.value)}
                placeholder="Descreva o que aconteceu, em qual tela, e o que você esperava que acontecesse."
              />
            </label>

            <label>
              Prioridade
              <select value={prioridadeSuporte} onChange={(event) => setPrioridadeSuporte(event.target.value as 'baixa' | 'normal' | 'alta' | 'urgente')}>
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </label>

            {erroSuporte && <p className="passwordError">{erroSuporte}</p>}

            <div className="passwordActions">
              <button type="button" className="secondary" onClick={() => setModalSuporteAberto(false)} disabled={enviandoSuporte}>
                Cancelar
              </button>
              <button type="button" className="primary" onClick={enviarSuporte} disabled={enviandoSuporte}>
                {enviandoSuporte ? 'Enviando...' : 'Enviar solicitação'}
              </button>
            </div>
          </section>
        </div>
      )}

      {lightboxAberto && fotos.length > 0 && (
        <div className="lightbox" onClick={() => setLightboxAberto(false)}>
          <button className="lightboxClose" type="button" onClick={() => setLightboxAberto(false)}>✕</button>

          {fotos.length > 1 && (
            <button
              type="button"
              className="lightboxNav left"
              onClick={(event) => {
                event.stopPropagation()
                fotoAnterior()
              }}
            >
              ‹
            </button>
          )}

          <img src={fotos[fotoAtual]} alt="Foto" onClick={(event) => event.stopPropagation()} />

          {fotos.length > 1 && (
            <>
              <button
                type="button"
                className="lightboxNav right"
                onClick={(event) => {
                  event.stopPropagation()
                  proximaFoto()
                }}
              >
                ›
              </button>
              <div className="lightboxCount">{fotoAtual + 1} / {fotos.length}</div>
            </>
          )}
        </div>
      )}
    </main>
  )
}

const styles = `
  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: #f6f7f1;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .loadingSimple {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f6f7f1;
    color: #172018;
    font-weight: 800;
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

  .topbar {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(255,253,247,0.92);
    border-bottom: 1px solid rgba(15,23,42,0.06);
    backdrop-filter: blur(18px);
    padding: 9px 14px;
  }

  .topbarInner {
    max-width: 1180px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) 42px;
    align-items: center;
    gap: 10px;
  }

  .topbarSpacer {
    width: 42px;
    height: 42px;
    pointer-events: none;
  }

  .brand {
    grid-column: 2;
    justify-self: center;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-width: 0;
    max-width: min(520px, calc(100vw - 120px));
    border: 0;
    background: transparent;
    padding: 0;
    text-align: center;
    cursor: pointer;
    color: #172018;
  }

  .brand img {
    width: clamp(140px, 34vw, 250px);
    height: auto;
    max-height: 58px;
    object-fit: contain;
    display: block;
  }

  .brand span {
    display: block;
    color: #7b8375;
    font-size: clamp(8px, 1.05vw, 12px);
    font-weight: 850;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .topActions {
    grid-column: 3;
    justify-self: end;
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
    justify-content: flex-end;
  }

  .settingsWrap {
    position: relative;
    display: flex;
    justify-content: flex-end;
  }

  .gearButton {
    width: 42px;
    height: 42px;
    border-radius: 999px;
    border: 1px solid rgba(15,23,42,0.08);
    background: rgba(255,255,255,0.86);
    color: #1f3f2d;
    box-shadow: 0 10px 22px rgba(15,23,42,0.08);
    cursor: pointer;
    font-size: 20px;
    line-height: 1;
  }

  .settingsMenu {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    z-index: 80;
    width: 220px;
    border-radius: 22px;
    border: 1px solid rgba(15,23,42,0.08);
    background: rgba(255,253,247,0.98);
    box-shadow: 0 24px 60px rgba(15,23,42,0.16);
    padding: 8px;
    backdrop-filter: blur(18px);
  }

  .settingsMenu button {
    width: 100%;
    border: 0;
    background: transparent;
    border-radius: 16px;
    padding: 12px 13px;
    text-align: left;
    color: #172018;
    cursor: pointer;
    font-size: 13px;
    font-weight: 900;
  }

  .settingsMenu button:hover {
    background: #eef2e5;
  }

  .settingsMenu .dangerItem {
    color: #b91c1c;
  }

  .settingsDivider {
    height: 1px;
    margin: 6px 8px;
    background: rgba(15,23,42,0.08);
  }

  .supportSheet textarea,
  .supportSheet select {
    width: 100%;
    border: 1px solid rgba(15,23,42,0.12);
    border-radius: 16px;
    padding: 12px 13px;
    font: inherit;
    color: #172018;
    background: rgba(255,255,255,0.9);
    outline: none;
  }

  .supportSheet textarea {
    min-height: 116px;
    resize: vertical;
    line-height: 1.45;
  }

  .supportIntro {
    margin: -4px 0 14px;
    color: rgba(23,32,24,0.66);
    font-size: 13px;
    font-weight: 750;
    line-height: 1.45;
  }

  .pillButton {
    border: 0;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .pillButton.muted { background: #f3f4f6; color: #172018; }
  .pillButton.danger { background: #dc2626; color: #fff; }


  .shell {
    max-width: 1180px;
    margin: 0 auto;
    padding: 22px 16px 54px;
  }

  .passportHero {
    display: grid;
    grid-template-columns: 190px minmax(0, 1fr) 310px;
    gap: 20px;
    align-items: center;
    border-radius: 36px;
    padding: 24px;
    background:
      linear-gradient(135deg, rgba(23,32,24,0.78), rgba(23,32,24,0.34)),
      radial-gradient(circle at top right, rgba(190,242,100,0.30), transparent 34%),
      linear-gradient(135deg, #1f331f 0%, #647a49 46%, #d7c6a1 100%);
    color: #fff;
    box-shadow: 0 24px 60px rgba(23,32,24,0.18);
    margin-bottom: 16px;
  }

  .avatarColumn {
    display: grid;
    justify-items: center;
    gap: 10px;
  }

  .avatarButton {
    width: 150px;
    height: 150px;
    border-radius: 999px;
    border: 4px solid rgba(255,255,255,0.78);
    background: #16a34a;
    overflow: hidden;
    cursor: pointer;
    padding: 0;
    box-shadow: 0 18px 38px rgba(0,0,0,0.22);
  }

  .avatarButton img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .avatarButton span {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: white;
    font-size: 58px;
    font-weight: 950;
  }

  .avatarHintButton {
    border: 1px solid rgba(255,255,255,0.26);
    background: rgba(255,255,255,0.12);
    color: #fff;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .hiddenInput { display: none; }

  .kicker {
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

  .nameRow {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .nameRow h1 {
    margin: 0;
    font-size: clamp(38px, 5vw, 66px);
    line-height: 0.92;
    font-weight: 950;
    letter-spacing: -0.08em;
  }

  .nameRow button {
    border: 1px solid rgba(255,255,255,0.26);
    background: rgba(255,255,255,0.12);
    color: #fff;
    border-radius: 999px;
    width: 36px;
    height: 36px;
    cursor: pointer;
  }

  .nameEditRow {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  .nameEditRow input {
    min-width: min(100%, 320px);
    border: 1px solid rgba(255,255,255,0.34);
    background: rgba(255,255,255,0.14);
    color: #fff;
    border-radius: 16px;
    padding: 12px;
    font-size: 22px;
    font-weight: 900;
    outline: none;
  }

  .nameEditRow button,
  .actionRow button,
  .cardHeader button {
    border: 0;
    border-radius: 999px;
    padding: 10px 13px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
  }

  .nameEditRow button { background: #bef264; color: #172018; }
  .nameEditRow button.ghost { background: rgba(255,255,255,0.16); color: #fff; }

  .heroTextBlock p {
    max-width: 620px;
    color: rgba(255,255,255,0.82);
    line-height: 1.62;
    margin: 14px 0 0;
    font-size: 14px;
    font-weight: 650;
  }

  .heroStats {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 18px;
  }

  .heroStats div {
    min-width: 92px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.12);
    border-radius: 20px;
    padding: 12px;
  }

  .heroStats strong {
    display: block;
    font-size: 22px;
    line-height: 1;
    font-weight: 950;
  }

  .heroStats span {
    display: block;
    margin-top: 4px;
    color: rgba(255,255,255,0.72);
    font-size: 11px;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .rankCard {
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.14);
    border-radius: 30px;
    padding: 18px;
    backdrop-filter: blur(14px);
    text-align: center;
    display: grid;
    justify-items: center;
  }

  .rankMedal,
  .hexMedal {
    display: flex;
    align-items: center;
    justify-content: center;
    clip-path: polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%);
    border: 3px solid #92400e;
    background:
      radial-gradient(circle at 30% 18%, rgba(255,255,255,0.74), transparent 28%),
      linear-gradient(145deg, #fffdf7, rgba(120,113,108,0.20));
    color: #172018;
    box-shadow: inset 0 0 0 2px rgba(29,38,24,0.08), 0 8px 18px rgba(25,35,18,0.12);
  }

  /* SVGs premium já vêm com moldura própria.
     Este wrapper remove a moldura artificial do layout para não cortar nem criar bordas. */
  .hexMedal.svgMedalWrap,
  .hexMedal.betaSvgMedalWrap,
  .hexMedal.nextSvgMedal {
    clip-path: none;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    overflow: visible;
  }

  .rankMedal {
    width: 76px;
    height: 76px;
    margin-bottom: 12px;
  }

  .rankMedal span { font-size: 34px; }

  .rankSvgMedal {
    width: 112px;
    height: 112px;
    clip-path: none;
    border: 0;
    background: transparent;
    box-shadow: none;
    margin-left: auto;
    margin-right: auto;
  }

  .rankSvgMedal img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    filter: drop-shadow(0 10px 16px rgba(0,0,0,0.22));
  }

  .rankCard strong {
    display: block;
    color: #fff;
    font-size: 22px;
    line-height: 1.05;
    font-weight: 950;
    letter-spacing: -0.04em;
  }

  .rankCard p {
    margin: 8px 0 0;
    color: rgba(255,255,255,0.76);
    font-size: 12px;
    line-height: 1.45;
    font-weight: 700;
  }

  .progressMeta {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-top: 13px;
    color: rgba(255,255,255,0.78);
    font-size: 11px;
    font-weight: 900;
  }

  .progressTrack {
    height: 10px;
    border-radius: 999px;
    background: rgba(255,255,255,0.18);
    overflow: hidden;
    margin-top: 8px;
  }

  .progressTrack div {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #365314, #84cc16, #f97316);
  }

  .progressTrack.soft { background: rgba(15,23,42,0.08); }

  .rankCard small {
    display: block;
    margin-top: 9px;
    color: rgba(255,255,255,0.74);
    font-size: 11px;
    line-height: 1.4;
    font-weight: 800;
  }

  .notice {
    border-radius: 18px;
    padding: 12px 14px;
    margin-bottom: 16px;
    font-size: 13px;
    font-weight: 850;
  }

  .notice.success { background: #dcfce7; color: #166534; }
  .notice.warning { background: #fef3c7; color: #92400e; }
  .notice.error { background: #fee2e2; color: #991b1b; }

  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 16px;
    align-items: start;
  }

  .leftStack,
  .rightStack {
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

  .cardHeader {
    padding: 18px 20px;
    border-bottom: 1px solid rgba(15,23,42,0.06);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .cardHeader.compact { padding-bottom: 14px; }

  .cardHeader.compactHeader {
    padding-bottom: 14px;
  }

  .cardHeader h2 {
    margin: 0;
    color: #172018;
    font-size: 18px;
    font-weight: 950;
    letter-spacing: -0.04em;
  }

  .cardHeader span {
    display: block;
    margin-top: 3px;
    color: #64748b;
    font-size: 12px;
    font-weight: 750;
    line-height: 1.45;
  }

  .cardHeader button,
  .actionRow .primary {
    background: #16a34a;
    color: #fff;
  }

  .cardBody { padding: 18px; }

  textarea {
    width: 100%;
    min-height: 118px;
    resize: vertical;
    border: 1px solid rgba(15,23,42,0.08);
    background: #fffdf7;
    border-radius: 18px;
    padding: 13px 14px;
    font-size: 14px;
    color: #172018;
    outline: none;
    font-weight: 650;
    line-height: 1.55;
  }

  .actionRow {
    display: flex;
    gap: 9px;
    flex-wrap: wrap;
    margin-top: 12px;
  }

  .actionRow .secondary {
    background: #eef2e5;
    color: #475569;
  }

  .bioText {
    margin: 0;
    color: #475569;
    font-size: 14px;
    line-height: 1.7;
    font-weight: 650;
  }

  .unifiedMedalGrid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 10px;
  }

  .tierCard {
    background: #fffdf7;
    border: 1px solid rgba(15,23,42,0.06);
    border-radius: 22px;
    padding: 12px 8px;
    text-align: center;
    opacity: 1;
    display: grid;
    justify-items: center;
    align-content: start;
  }

  .tierCard:not(.unlocked) {
    background: rgba(255,253,247,0.64);
  }

  .tierCard.unlocked {
    opacity: 1;
    filter: none;
  }

  .tierCard.specialUnified {
    background:
      radial-gradient(circle at top right, rgba(251,146,60,0.10), transparent 34%),
      #fffdf7;
  }

  .tierCard.betaUnified {
    border-color: rgba(153,27,27,0.10);
    background:
      radial-gradient(circle at 50% 0%, rgba(245,158,11,0.10), transparent 34%),
      radial-gradient(circle at 100% 0%, rgba(153,27,27,0.055), transparent 34%),
      rgba(255,253,247,0.92);
  }


  .tierCard.betaUnified .tierCard,
  .tierCard.betaUnified {
    overflow: visible;
  }

  .tierCard.betaUnified strong {
    margin-top: -2px;
  }

  .hexMedal {
    width: 74px;
    height: 74px;
    margin: 0 auto 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .hexMedal span {
    font-size: 23px;
    filter: drop-shadow(0 2px 3px rgba(0,0,0,0.16));
  }

  .svgMedalWrap {
    width: 104px;
    height: 104px;
    margin-bottom: 6px;
  }

  .betaSvgMedalWrap {
    width: 112px;
    height: 112px;
    margin-top: -4px;
    margin-bottom: 2px;
  }

  .nextSvgMedal {
    width: 126px;
    height: 126px;
  }

  .medalSvg {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    transform: translateZ(0);
    filter: drop-shadow(0 10px 18px rgba(15,23,42,0.16));
  }

  .betaMedalSvg {
    width: 116%;
    height: 116%;
    max-width: none;
    transform: translateY(-4px);
    filter: drop-shadow(0 12px 22px rgba(80,36,12,0.20));
  }

  .lockedSvg {
    opacity: 0.22;
    filter: grayscale(1) saturate(0.12) contrast(0.82) brightness(1.08);
  }

  .tierCard strong {
    display: block;
    color: #172018;
    font-size: 12px;
    font-weight: 950;
    line-height: 1.18;
    text-align: center;
    max-width: 100%;
  }

  .tierCard small {
    display: block;
    margin-top: 4px;
    color: #64748b;
    font-size: 10px;
    font-weight: 850;
  }

  .photoMilestones {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  }

  .photoMilestones span {
    border-radius: 999px;
    background: #e5e7eb;
    color: #6b7280;
    padding: 5px 8px;
    font-size: 10px;
    font-weight: 850;
  }

  .photoMilestones span.active {
    background: #dcfce7;
    color: #166534;
  }

  .emptyBox {
    border: 1px dashed rgba(15,23,42,0.16);
    background: #fffdf7;
    border-radius: 20px;
    padding: 28px;
    text-align: center;
    color: #64748b;
    font-size: 13px;
    line-height: 1.5;
    font-weight: 750;
  }

  .galleryHint {
    border-radius: 18px;
    background: rgba(22,163,74,0.08);
    border: 1px solid rgba(22,163,74,0.14);
    color: #166534;
    padding: 10px 12px;
    margin-bottom: 12px;
    font-size: 12px;
    line-height: 1.45;
    font-weight: 850;
  }

  .justifiedGrid { width: 100%; }

  .photoRow {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    width: 100%;
  }

  .photoCell {
    position: relative;
    cursor: pointer;
    overflow: hidden;
    border-radius: 14px;
    background: #f1f5f9;
  }

  .photoCell img {
    width: 100%;
    height: 200px;
    object-fit: cover;
    display: block;
  }

  .photoCell button {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 28px;
    height: 28px;
    border-radius: 999px;
    border: 0;
    background: #dc2626;
    color: white;
    cursor: pointer;
    font-size: 16px;
    font-weight: 950;
  }

  .summaryLine {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid rgba(15,23,42,0.06);
    padding: 11px 0;
    color: #64748b;
    font-size: 13px;
    font-weight: 800;
  }

  .summaryLine:last-child { border-bottom: 0; }

  .summaryLine strong {
    color: #172018;
    font-weight: 950;
  }

  .nextMedal {
    text-align: center;
  }

  .nextMedal strong {
    display: block;
    color: #172018;
    font-size: 15px;
    font-weight: 950;
    margin-top: 8px;
  }

  .nextMedal p,
  .plainText {
    color: #64748b;
    font-size: 13px;
    line-height: 1.55;
    font-weight: 700;
  }


  .passwordOverlay {
    position: fixed;
    inset: 0;
    z-index: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background: rgba(8, 13, 7, 0.50);
    backdrop-filter: blur(10px);
  }

  .passwordSheet {
    width: min(480px, 100%);
    border-radius: 30px;
    background: #fffdf7;
    border: 1px solid rgba(15,23,42,0.08);
    box-shadow: 0 34px 90px rgba(15,23,42,0.24);
    padding: 20px;
  }

  .passwordHeader {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  .passwordHeader span {
    display: block;
    color: #64748b;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 5px;
  }

  .passwordHeader h2 {
    margin: 0;
    color: #172018;
    font-size: 26px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.055em;
  }

  .passwordHeader button {
    width: 38px;
    height: 38px;
    border-radius: 999px;
    border: 1px solid rgba(15,23,42,0.08);
    background: #f8fafc;
    color: #172018;
    font-size: 24px;
    cursor: pointer;
  }

  .passwordSheet label {
    display: grid;
    gap: 7px;
    color: #172018;
    font-size: 13px;
    font-weight: 900;
    margin-bottom: 12px;
  }

  .passwordSheet input {
    width: 100%;
    border: 1px solid rgba(15,23,42,0.10);
    background: #fff;
    border-radius: 18px;
    padding: 13px 14px;
    color: #172018;
    outline: none;
    font-size: 14px;
    font-weight: 700;
  }

  .passwordError {
    margin: 8px 0 0;
    border-radius: 16px;
    background: rgba(220,38,38,0.08);
    border: 1px solid rgba(220,38,38,0.16);
    color: #991b1b;
    padding: 10px 12px;
    font-size: 13px;
    font-weight: 850;
  }

  .passwordActions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 16px;
  }

  .passwordActions button {
    border: 0;
    border-radius: 999px;
    padding: 12px 15px;
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
  }

  .passwordActions .primary {
    background: #16a34a;
    color: #fff;
  }

  .passwordActions .secondary {
    background: #eef2e5;
    color: #334155;
  }

  .lightbox {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0,0,0,0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .lightbox img {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    cursor: default;
  }

  .lightboxClose,
  .lightboxNav {
    position: absolute;
    border: 0;
    background: rgba(0,0,0,0.5);
    color: white;
    cursor: pointer;
  }

  .lightboxClose {
    top: 20px;
    right: 20px;
    background: transparent;
    font-size: 32px;
  }

  .lightboxNav {
    top: 50%;
    transform: translateY(-50%);
    border-radius: 999px;
    font-size: 40px;
    padding: 10px 15px;
  }

  .lightboxNav.left { left: 20px; }
  .lightboxNav.right { right: 20px; }

  .lightboxCount {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.6);
    color: white;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 14px;
  }

  @media (max-width: 1040px) {
    .passportHero,
    .grid {
      grid-template-columns: 1fr;
    }

    .avatarColumn {
      justify-items: start;
    }

    .tierGrid,
    .specialGrid,
    .unifiedMedalGrid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .topbar {
      padding: 7px 10px;
    }

    .topbarInner {
      grid-template-columns: 36px minmax(0, 1fr) 36px;
      gap: 8px;
      align-items: center;
    }

    .topbarSpacer {
      width: 36px;
      height: 36px;
    }

    .brand {
      gap: 4px;
      min-width: 0;
      max-width: calc(100vw - 92px);
      overflow: hidden;
    }

    .brand img {
      width: clamp(134px, 46vw, 210px);
      height: auto;
      max-height: 50px;
      object-fit: contain;
    }

    .brand span {
      font-size: 7.5px;
      letter-spacing: 0.12em;
      max-width: calc(100vw - 112px);
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .gearButton {
      width: 36px;
      height: 36px;
      font-size: 18px;
      box-shadow: none;
    }

    .settingsMenu {
      position: fixed;
      top: 58px;
      right: 10px;
      width: min(230px, calc(100vw - 20px));
      border-radius: 20px;
    }

    .shell {
      padding: 10px 9px 36px;
    }

    .passportHero,
    .card {
      border-radius: 24px;
    }

    .passportHero {
      grid-template-columns: 66px minmax(0, 1fr);
      gap: 11px;
      align-items: center;
      padding: 12px;
      margin-bottom: 10px;
      box-shadow: 0 14px 34px rgba(23,32,24,0.14);
    }

    .avatarColumn {
      justify-items: center;
      gap: 0;
    }

    .avatarButton {
      width: 64px;
      height: 64px;
      border-width: 3px;
    }

    .avatarButton span {
      font-size: 28px;
    }

    .heroTextBlock .kicker {
      display: none;
    }

    .nameRow {
      gap: 6px;
      flex-wrap: nowrap;
      min-width: 0;
    }

    .nameRow h1 {
      font-size: clamp(24px, 8vw, 34px);
      letter-spacing: -0.065em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .nameRow button {
      width: 30px;
      height: 30px;
      font-size: 12px;
      flex: 0 0 auto;
    }

    .nameEditRow input {
      min-width: 0;
      width: 100%;
      font-size: 16px;
      padding: 10px 12px;
    }

    .heroTextBlock p {
      margin-top: 6px;
      font-size: 11.5px;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .heroStats {
      display: none;
    }

    .rankCard,
    .rightStack {
      display: none;
    }

    .grid {
      gap: 10px;
    }

    .bioCard {
      display: none;
    }

    .cardHeader {
      padding: 15px 16px 12px;
    }

    .cardHeader h2 {
      font-size: 24px;
      letter-spacing: -0.055em;
    }

    .cardHeader span {
      font-size: 11px;
    }

    .cardBody {
      padding: 12px;
    }

    .tierGrid,
    .specialGrid,
    .unifiedMedalGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .tierCard {
      min-height: 176px;
      padding: 10px 7px 12px;
      border-radius: 22px;
      justify-content: start;
    }

    .svgMedalWrap {
      width: 104px;
      height: 104px;
      margin-bottom: 5px;
    }

    .betaSvgMedalWrap {
      width: 108px;
      height: 108px;
      margin-top: -2px;
      margin-bottom: 4px;
    }

    .nextSvgMedal,
    .rankSvgMedal {
      width: 92px;
      height: 92px;
    }

    .tierCard strong {
      font-size: 13px;
      line-height: 1.12;
      max-width: 126px;
    }

    .tierCard small {
      font-size: 10px;
      margin-top: 5px;
    }

    .photoMilestones {
      display: none;
    }

    .photoRow {
      display: grid;
      grid-template-columns: 1fr;
    }

    .photoCell {
      width: 100% !important;
    }

    .photoCell img {
      height: 220px;
    }

    .passwordOverlay {
      align-items: flex-end;
      padding: 10px;
    }

    .passwordSheet {
      border-radius: 26px;
      padding: 18px;
      max-height: calc(100dvh - 22px);
      overflow: auto;
    }

    .passwordActions {
      flex-direction: column-reverse;
    }

    .passwordActions button {
      width: 100%;
    }
  }

  }
`
