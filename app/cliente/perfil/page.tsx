'use client'

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import AvatarCropModal from '@/components/AvatarCropModal'
import SettingsButton from '@/components/SettingsButton'
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
    svg: '/medalhas/prussik_svg_icones_colecao_02/01_backpack_montanha.svg',
    cor: '#8b5e34',
    descricao: 'O início simbólico do seu Passaporte Prussik.'
  },
  {
    key: 'barraca_base',
    nome: 'Base',
    titulo: 'Barraca Base',
    km: 32,
    fotos: 5,
    icone: '⛺',
    svg: '/medalhas/prussik_svg_icones_colecao_02/02_tenda_montanha.svg',
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
    svg: '/medalhas/prussik_svg_icones_colecao_02/03_fogueira_noturna.svg',
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
    svg: '/medalhas/prussik_svg_icones_colecao_02/04_lanterna_trilha.svg',
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
    svg: '/medalhas/prussik_svg_icones_colecao_02/05_placa_de_trilha.svg',
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
    svg: '/medalhas/prussik_svg_icones_colecao_02/06_escalada_carabiner.svg',
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
    svg: '/medalhas/prussik_svg_icones_colecao_02/07_queda_dagua.svg',
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
    svg: '/medalhas/prussik_svg_icones_colecao_02/08_amanhecer_cume.svg',
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
    svg: '/medalhas/prussik_svg_icones_colecao_02/09_binoculos_explorador.svg',
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
    svg: '/medalhas/prussik_svg_icones_colecao_02/10_mapa_exploracao.svg',
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
    carregarDados(parsedUser.id)
  }, [router])

  async function carregarDados(userId: string) {
    await Promise.all([
      carregarFotos(userId),
      carregarAvatar(userId),
      carregarEstatisticas(userId),
      carregarBio(userId),
      carregarMedalhas(userId),
      carregarNome(userId)
    ])
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
      .single()

    if (data?.fotos_aventuras) {
      const lista = Array.isArray(data.fotos_aventuras) ? data.fotos_aventuras : []
      setFotos(lista)
      await carregarLayoutJustificado(lista)
    } else {
      setFotos([])
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
    await carregarLayoutJustificado(novasFotos)
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
    await carregarLayoutJustificado(novasFotos)
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
        title="Ajustar foto do passaporte"
        onCancel={() => {
          if (enviandoAvatar) return
          setCropAberto(false)
          setCropImageSrc('')
        }}
        onConfirm={uploadAvatar}
      />

      <header className="topbar">
        <div className="topbarInner">
          <button className="brand" type="button" onClick={() => router.push('/cliente/dashboard')}>
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />
            <div>
              <strong>PrussikTrails</strong>
              <span>Passaporte Prussik</span>
            </div>
          </button>

          <div className="topActions">
            <SettingsButton userId={user.id} userEmail={user.email || ''} />
            <button className="pillButton muted" type="button" onClick={() => router.push('/cliente/dashboard')}>
              Dashboard
            </button>
            <button className="pillButton danger" type="button" onClick={handleLogout}>
              Sair
            </button>
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
            <button
              type="button"
              className="avatarHintButton"
              onClick={() => fileInputRef.current?.click()}
              disabled={enviandoAvatar}
            >
              {enviandoAvatar ? 'Salvando foto...' : 'Ajustar foto'}
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
            <div className="kicker">Passaporte Prussik</div>

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
              <img src={nivelAtual.svg} alt={nivelAtual.titulo} />
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
                    {bio || 'Clique em editar para adicionar uma biografia simples ao seu Passaporte Prussik.'}
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
                          />
                        </div>
                        <strong>{meta.nome}</strong>
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
                                <img src={img.url} alt={`Foto ${img.index + 1}`} />
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
                    <img src={proximoNivel.svg} alt={proximoNivel.titulo} className="medalSvg" />
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
    background: rgba(255,253,247,0.88);
    border-bottom: 1px solid rgba(15,23,42,0.06);
    backdrop-filter: blur(18px);
    padding: 10px 16px;
  }

  .topbarInner {
    max-width: 1180px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    border: 0;
    background: transparent;
    padding: 0;
    text-align: left;
    cursor: pointer;
    color: #172018;
  }

  .brand img {
    width: auto;
    height: 46px;
    object-fit: contain;
  }

  .brand strong {
    display: block;
    color: #dc2626;
    font-size: 19px;
    font-weight: 950;
    line-height: 1;
    letter-spacing: -0.05em;
  }

  .brand span {
    display: block;
    margin-top: 3px;
    color: #64748b;
    font-size: 11px;
    font-weight: 800;
  }

  .topActions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
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
    line-height: 1.2;
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
      padding: 9px 12px;
    }

    .brand img { height: 40px; }
    .brand strong { font-size: 17px; }
    .brand span { font-size: 10px; }

    .topActions {
      gap: 6px;
    }

    .topActions .pillButton {
      display: none;
    }

    .shell {
      padding: 16px 12px 42px;
    }

    .passportHero,
    .card {
      border-radius: 28px;
    }

    .passportHero {
      padding: 20px;
    }

    .avatarButton {
      width: 128px;
      height: 128px;
    }

    .nameRow h1 {
      font-size: 38px;
    }

    .heroStats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .tierGrid,
    .specialGrid,
    .unifiedMedalGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .svgMedalWrap {
      width: 76px;
      height: 76px;
    }

    .nextSvgMedal,
    .rankSvgMedal {
      width: 96px;
      height: 96px;
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
  }
`
