'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type AnyRecord = Record<string, any>

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

type Roteiro = {
  id: string
  titulo?: string | null
  nome?: string | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  image_url?: string | null
  capa_url?: string | null
  preco?: number | null
  valor?: number | null
  duracao_horas?: number | null
  duracao?: string | null
  km?: number | null
  distancia_km?: number | null
  dificuldade?: string | null
  localizacao?: string | null
  local?: string | null
  cidade?: string | null
  destino?: string | null
  status?: string | null
  ativo?: boolean | null
  created_at?: string | null
  hot_score?: number
  hot_reservas?: number
  hot_confirmadas?: number
}

type Reserva = {
  id: string
  cliente_id?: string | null
  roteiro_id?: string | null
  quantidade_pessoas?: number | null
  valor_total?: number | null
  status?: string | null
  pagamento_status?: string | null
  status_pagamento?: string | null
  pagamento_confirmado_em?: string | null
  data_trilha?: string | null
  data_roteiro?: string | null
  created_at?: string | null
  roteiro?: Roteiro | null
  roteiro_titulo?: string
  roteiro_foto?: string
}

type Notificacao = {
  id: string
  titulo: string
  texto: string
  destino?: string
  emoji: string
  tipo: 'all' | 'com'
  tipoEvento?: string
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

type ProximaMedalha = {
  nome?: string | null
  descricao?: string | null
  progresso_atual?: number | null
  progresso_total?: number | null
  icone?: string | null
  svg?: string | null
}

type SuporteTipo = 'bug' | 'suporte' | 'sugestao'
type PrioridadeSuporte = 'baixa' | 'normal' | 'alta' | 'urgente'

const statsInicial: Stats = {
  totalKm: 0,
  totalTrilhas: 0,
  reservasPendentes: 0,
  reservasConfirmadas: 0,
  reservasRealizadas: 0,
  totalMedalhas: 0,
  ultimaAtividade: 'Ainda sem atividade registrada',
}

const notificacaoVaziaAll: Notificacao = {
  id: 'empty-all',
  titulo: 'A comunidade está começando a se mover',
  texto: 'Quando novos aventureiros, guias, roteiros e medalhas aparecerem, você verá tudo aqui.',
  emoji: '🌿',
  tipo: 'all',
  destino: '/roteiros',
  created_at: null,
}

const notificacaoVaziaCom: Notificacao = {
  id: 'empty-com',
  titulo: 'Siga guias e aventureiros para movimentar a COM',
  texto: 'Novos seguidores, curtidas e roteiros publicados por guias que você segue aparecerão aqui.',
  emoji: '👣',
  tipo: 'com',
  destino: '/roteiros',
  created_at: null,
}

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function numeroSeguro(valor: unknown, fallback = 0) {
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : fallback
}

function formatarKm(valor: unknown) {
  const km = numeroSeguro(valor)
  if (km >= 1000) return km.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  return km.toLocaleString('pt-BR', { maximumFractionDigits: km % 1 === 0 ? 0 : 1 })
}

function formatarMoeda(valor: unknown) {
  return numeroSeguro(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatarData(valor?: string | null) {
  const raw = texto(valor)
  if (!raw) return 'Data a definir'

  const data = raw.length <= 10 ? new Date(`${raw.slice(0, 10)}T12:00:00`) : new Date(raw)
  if (Number.isNaN(data.getTime())) return 'Data a definir'

  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatarDataHora(valor?: string | null) {
  const raw = texto(valor)
  if (!raw) return ''

  const data = new Date(raw)
  if (Number.isNaN(data.getTime())) return formatarData(raw)

  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function tituloRoteiro(roteiro?: Roteiro | null) {
  return texto(roteiro?.titulo || roteiro?.nome) || 'Roteiro PrussikTrails'
}

function fotoRoteiro(roteiro?: Roteiro | null) {
  return texto(roteiro?.foto_capa || roteiro?.foto_url || roteiro?.imagem_url || roteiro?.image_url || roteiro?.capa_url)
}

function localRoteiro(roteiro?: Roteiro | null) {
  return texto(roteiro?.localizacao || roteiro?.local || roteiro?.cidade || roteiro?.destino) || 'Local a confirmar'
}

function precoRoteiro(roteiro?: Roteiro | null) {
  return numeroSeguro(roteiro?.preco ?? roteiro?.valor)
}

function dataReserva(reserva: Reserva) {
  return reserva.data_trilha || reserva.data_roteiro || reserva.created_at || null
}

function tituloReserva(reserva: Reserva) {
  return texto(reserva.roteiro_titulo || reserva.roteiro?.titulo || reserva.roteiro?.nome) || 'Roteiro reservado'
}

function fotoReserva(reserva: Reserva) {
  return texto(reserva.roteiro_foto || fotoRoteiro(reserva.roteiro))
}

function normalizarMedalha(item: MedalhaUsuario): Medalha | null {
  const medalhas = item.medalhas
  if (Array.isArray(medalhas)) return medalhas[0] || null
  return medalhas || null
}

function avatarUsuario(user?: UsuarioLocal | null) {
  return texto(user?.avatar_url || user?.foto_url || user?.imagem_url)
}

function nomeUsuario(user?: UsuarioLocal | null) {
  return texto(user?.nome || user?.email) || 'Aventureiro'
}

function tipoEventoNotificacao(item: AnyRecord) {
  return normalizar(item?.tipo_evento || item?.evento || item?.acao || item?.tipo || item?.categoria || item?.metadata?.tipo)
}

function destinoPorPerfil(usuarioId: string, tipoUsuario?: string | null) {
  const tipo = normalizar(tipoUsuario)
  if (!usuarioId) return '/cliente/dashboard'
  if (tipo.includes('guia')) return `/guia/publico/${usuarioId}`
  return `/cliente/publico/${usuarioId}`
}

function destinoNotificacao(item: AnyRecord, fallback = '/cliente/dashboard') {
  const metadata = item?.metadata || item?.detalhes || {}
  const direto = texto(item?.destino_url || item?.destino || item?.rota || item?.url || metadata?.destino_url || metadata?.destino || metadata?.rota || metadata?.url)
  if (direto) return direto

  const roteiroId = texto(item?.roteiro_id || metadata?.roteiro_id || metadata?.roteiroId)
  if (roteiroId) return `/roteiros/${roteiroId}`

  const actorId = texto(item?.actor_id || item?.ator_id || item?.usuario_origem_id || metadata?.actor_id || metadata?.ator_id)
  if (actorId) return destinoPorPerfil(actorId, item?.actor_tipo || item?.tipo_actor || metadata?.tipo_usuario || metadata?.actor_tipo)

  const usuarioId = texto(item?.usuario_id || metadata?.usuario_id || metadata?.user_id)
  if (usuarioId) return destinoPorPerfil(usuarioId, item?.tipo_usuario || metadata?.tipo_usuario)

  return fallback
}

function emojiAll(item: AnyRecord) {
  const tipo = tipoEventoNotificacao(item)
  const titulo = normalizar(item?.titulo || item?.descricao || item?.mensagem)

  if (tipo.includes('medalha') || titulo.includes('medalha')) return '🏅'
  if (tipo.includes('roteiro') || titulo.includes('roteiro')) return '🧭'
  if (tipo.includes('guia') && (tipo.includes('cadastro') || tipo.includes('novo') || titulo.includes('novo guia'))) return '🥾'
  if (tipo.includes('usuario') || tipo.includes('cadastro') || titulo.includes('chegou') || titulo.includes('novo aventureiro')) return '🌿'
  if (tipo.includes('reserva')) return '🎟️'
  if (tipo.includes('avaliacao')) return '⭐'
  if (tipo.includes('grupo')) return '💬'

  return texto(item?.emoji) || '🌿'
}

function emojiCom(item: AnyRecord) {
  const tipo = tipoEventoNotificacao(item)
  const titulo = normalizar(item?.titulo || item?.descricao || item?.mensagem)

  if (tipo.includes('roteiro') || titulo.includes('publicou') || titulo.includes('novo roteiro')) return '🧭'
  if (tipo.includes('seguir') || titulo.includes('seguiu') || titulo.includes('comecou a seguir')) return '👣'
  if (tipo.includes('curtida') || tipo.includes('like') || titulo.includes('curtiu')) return '❤️'
  if (tipo.includes('comentario') || titulo.includes('comentou')) return '💬'
  if (tipo.includes('grupo')) return '🏕️'
  if (tipo.includes('foto')) return '📷'

  return texto(item?.emoji) || '❤️'
}

function tituloAll(item: AnyRecord) {
  const titulo = texto(item?.titulo)
  if (titulo) return titulo

  const tipo = tipoEventoNotificacao(item)
  const metadata = item?.metadata || item?.detalhes || {}
  const nome = texto(item?.nome_usuario || metadata?.nome_usuario || metadata?.usuario_nome || item?.usuario_nome)
  const medalha = texto(item?.nome_medalha || metadata?.nome_medalha || metadata?.medalha_nome)

  if (tipo.includes('medalha')) return medalha ? `${nome || 'Aventureiro'} conquistou ${medalha}` : 'Nova medalha conquistada'
  if (tipo.includes('roteiro')) return 'Novo roteiro publicado'
  if (tipo.includes('cadastro')) return 'Novo aventureiro na comunidade'

  return texto(item?.descricao || item?.mensagem) || 'Movimento na comunidade'
}

function textoAll(item: AnyRecord) {
  const mensagem = texto(item?.texto || item?.mensagem)
  if (mensagem) return mensagem

  const descricao = texto(item?.descricao)
  if (descricao) return descricao

  const tipo = tipoEventoNotificacao(item)
  const metadata = item?.metadata || item?.detalhes || {}

  if (tipo.includes('medalha')) {
    const medalha = texto(item?.nome_medalha || metadata?.nome_medalha || metadata?.medalha_nome)
    return medalha ? `Uma nova conquista apareceu na comunidade: ${medalha}.` : 'Uma nova conquista apareceu na comunidade.'
  }

  if (tipo.includes('roteiro')) return 'Um novo roteiro foi publicado no PrussikTrails.'
  if (tipo.includes('cadastro')) return 'Uma nova pessoa entrou na comunidade outdoor.'

  return 'A comunidade PrussikTrails teve uma nova movimentação.'
}

function tituloCom(item: AnyRecord) {
  const titulo = texto(item?.titulo)
  if (titulo) return titulo

  const tipo = tipoEventoNotificacao(item)
  if (tipo.includes('roteiro')) return 'Guia que você segue publicou um roteiro'
  if (tipo.includes('seguir')) return 'Novo seguidor na COM'
  if (tipo.includes('curtida')) return 'Nova curtida na COM'

  return 'Interação na COM'
}

function textoCom(item: AnyRecord) {
  const mensagem = texto(item?.mensagem || item?.texto || item?.descricao)
  if (mensagem) return mensagem

  const tipo = tipoEventoNotificacao(item)
  if (tipo.includes('roteiro')) return 'Um guia que você segue publicou uma nova experiência. Toque para ver o roteiro.'
  if (tipo.includes('seguir')) return 'Alguém começou a seguir você. Abra o perfil para seguir de volta.'
  if (tipo.includes('curtida')) return 'Alguém curtiu seu perfil ou uma foto sua.'

  return 'Alguém interagiu com você na comunidade.'
}

function normalizarNotificacaoAll(item: AnyRecord, index: number): Notificacao {
  const tipoEvento = tipoEventoNotificacao(item)

  return {
    id: texto(item?.id) || `all-${index}-${Date.now()}`,
    titulo: tituloAll(item),
    texto: textoAll(item),
    destino: destinoNotificacao(item, '/cliente/dashboard'),
    emoji: emojiAll(item),
    tipo: 'all',
    tipoEvento,
    created_at: texto(item?.created_at || item?.criado_em || item?.data) || null,
  }
}

function normalizarNotificacaoCom(item: AnyRecord, index: number): Notificacao {
  const tipoEvento = tipoEventoNotificacao(item)

  return {
    id: texto(item?.id) || `com-${index}-${Date.now()}`,
    titulo: tituloCom(item),
    texto: textoCom(item),
    destino: destinoNotificacao(item, '/cliente/dashboard'),
    emoji: emojiCom(item),
    tipo: 'com',
    tipoEvento,
    created_at: texto(item?.created_at || item?.criado_em || item?.data) || null,
  }
}

function compararDataDesc(a: Notificacao, b: Notificacao) {
  const dataA = a.created_at ? new Date(a.created_at).getTime() : 0
  const dataB = b.created_at ? new Date(b.created_at).getTime() : 0
  return dataB - dataA
}

export default function ClienteDashboardPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)
  const reconciliandoRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [stats, setStats] = useState<Stats>(statsInicial)
  const [roteirosQuentes, setRoteirosQuentes] = useState<Roteiro[]>([])
  const [proximasReservas, setProximasReservas] = useState<Reserva[]>([])
  const [notificacoesAll, setNotificacoesAll] = useState<Notificacao[]>([])
  const [notificacoesCom, setNotificacoesCom] = useState<Notificacao[]>([])
  const [abaNotificacoes, setAbaNotificacoes] = useState<'all' | 'com'>('all')
  const [medalhasConquistadas, setMedalhasConquistadas] = useState<MedalhaUsuario[]>([])
  const [proximaMedalha, setProximaMedalha] = useState<ProximaMedalha | null>(null)
  const [atualizando, setAtualizando] = useState(false)
  const [reconciliando, setReconciliando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('')
  const [menuAberto, setMenuAberto] = useState(false)

  const [modalSenhaAberto, setModalSenhaAberto] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [alterandoSenha, setAlterandoSenha] = useState(false)

  const [modalSuporteAberto, setModalSuporteAberto] = useState(false)
  const [tipoSuporte, setTipoSuporte] = useState<SuporteTipo>('suporte')
  const [prioridadeSuporte, setPrioridadeSuporte] = useState<PrioridadeSuporte>('normal')
  const [assuntoSuporte, setAssuntoSuporte] = useState('Mensagem ao suporte')
  const [descricaoSuporte, setDescricaoSuporte] = useState('')
  const [enviandoSuporte, setEnviandoSuporte] = useState(false)
  const [erroSuporte, setErroSuporte] = useState('')

  useEffect(() => {
    if (iniciouRef.current) return
    iniciouRef.current = true
    iniciar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    router.prefetch('/cliente/perfil')
    router.prefetch('/cliente/minhas-reservas')
    router.prefetch('/roteiros')
  }, [router])

  const notificacoesVisiveis = useMemo(() => {
    const lista = abaNotificacoes === 'all' ? notificacoesAll : notificacoesCom
    if (lista.length === 0) return [abaNotificacoes === 'all' ? notificacaoVaziaAll : notificacaoVaziaCom]
    return lista
  }, [abaNotificacoes, notificacoesAll, notificacoesCom])

  const primeiroRoteiroQuente = roteirosQuentes[0] || null
  const avatar = avatarUsuario(user)
  const nome = nomeUsuario(user)

  async function iniciar() {
    try {
      const salvo = localStorage.getItem('user')
      const parsedUser = salvo ? (JSON.parse(salvo) as UsuarioLocal) : null

      if (!parsedUser?.id || normalizar(parsedUser.tipo) !== 'cliente') {
        router.replace('/login')
        return
      }

      setUser(parsedUser)
      await carregarResumo(parsedUser.id)
    } catch (error) {
      console.error('Erro ao iniciar dashboard do cliente:', error)
      setMensagem('Não foi possível carregar sua dashboard agora.')
    }
  }

  async function carregarResumo(clienteId: string, silencioso = false) {
    if (!clienteId) return

    if (!silencioso) {
      setAtualizando(true)
      setMensagem('')
    }

    try {
      const response = await fetch(
        `/api/cliente/dashboard/resumo?clienteId=${encodeURIComponent(clienteId)}`,
        {
          method: 'GET',
          cache: 'no-store',
        }
      )

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.erro || data?.message || 'Erro ao carregar resumo da dashboard.')
      }

      const usuarioId = texto(data?.usuario?.id || clienteId)

      if (data?.usuario?.id) {
        const usuarioAtualizado: UsuarioLocal = {
          id: data.usuario.id,
          nome: data.usuario.nome || '',
          email: data.usuario.email || '',
          tipo: data.usuario.tipo || 'cliente',
          avatar_url: data.usuario.avatar_url || null,
          foto_url: data.usuario.foto_url || null,
          imagem_url: data.usuario.imagem_url || null,
        }

        setUser(usuarioAtualizado)
        localStorage.setItem('user', JSON.stringify(usuarioAtualizado))
      }

      setStats({ ...statsInicial, ...(data?.stats || {}) })
      setRoteirosQuentes(Array.isArray(data?.roteirosQuentes) ? data.roteirosQuentes : [])
      setProximasReservas(Array.isArray(data?.proximasReservas) ? data.proximasReservas : [])
      setMedalhasConquistadas(Array.isArray(data?.medalhasConquistadas) ? data.medalhasConquistadas : [])
      setProximaMedalha(data?.proximaMedalha || null)
      setUltimaAtualizacao(data?.ultimaAtualizacao || new Date().toLocaleTimeString('pt-BR'))

      const notificacoesBase: AnyRecord[] = Array.isArray(data?.notificacoes) ? data.notificacoes : []

      const notificacoesGerais = notificacoesBase
        .filter((item) => normalizar(item?.tipo) !== 'com')
        .map((item, index) => normalizarNotificacaoAll(item, index))
        .sort(compararDataDesc)
        .slice(0, 12)

      setNotificacoesAll(notificacoesGerais)

      carregarNotificacoesCom(usuarioId).then((listaCom) => {
        setNotificacoesCom(listaCom.sort(compararDataDesc).slice(0, 12))
      })
    } catch (error) {
      console.error('Erro ao carregar resumo da dashboard:', error)

      if (!silencioso) {
        setMensagem(
          error instanceof Error
            ? error.message
            : 'Não foi possível atualizar os dados agora.'
        )
      }
    } finally {
      if (!silencioso) {
        setAtualizando(false)
      }
    }
  }

  async function carregarNotificacoesCom(usuarioId: string): Promise<Notificacao[]> {
    if (!usuarioId) return []

    try {
      const response = await fetch(
        `/api/notificacoes/com?usuarioId=${encodeURIComponent(usuarioId)}`,
        {
          method: 'GET',
          cache: 'no-store',
        }
      )

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        console.warn('Não foi possível carregar notificações COM:', data)
        return []
      }

      const lista: AnyRecord[] = Array.isArray(data?.notificacoes) ? data.notificacoes : []
      return lista.map((item, index) => normalizarNotificacaoCom(item, index))
    } catch (error) {
      console.warn('Erro ao carregar notificações COM do cliente:', error)
      return []
    }
  }

  async function reconciliarPagamentosPendentesInterno(clienteId: string, silencioso = false) {
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
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clienteId }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.erro || data?.message || 'Não foi possível reconciliar pagamentos.')
      }

      if (!silencioso) {
        setMensagem(data?.mensagem || 'Pagamentos verificados.')
      }

      await carregarResumo(clienteId, true)
      return true
    } catch (error) {
      console.warn('Erro ao reconciliar pagamentos:', error)
      if (!silencioso) {
        setMensagem(error instanceof Error ? error.message : 'Erro ao verificar pagamentos.')
      }
      return false
    } finally {
      reconciliandoRef.current = false
      if (!silencioso) setReconciliando(false)
    }
  }

  function abrirDestino(destino?: string) {
    const url = texto(destino) || '/cliente/dashboard'
    router.push(url)
  }

  function abrirSuporte(tipo: SuporteTipo) {
    setMenuAberto(false)
    setTipoSuporte(tipo)
    setPrioridadeSuporte(tipo === 'bug' ? 'alta' : 'normal')
    setAssuntoSuporte(
      tipo === 'bug'
        ? 'Erro no app'
        : tipo === 'sugestao'
          ? 'Sugestão para o PrussikTrails'
          : 'Mensagem ao suporte'
    )
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
          assunto: assuntoSuporte.trim(),
          descricao: descricaoSuporte.trim(),
          prioridade: prioridadeSuporte,
          paginaOrigem: typeof window !== 'undefined' ? window.location.pathname : '/cliente/dashboard',
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
      setMensagem('Solicitação enviada com sucesso.')
    } catch (error) {
      setErroSuporte(error instanceof Error ? error.message : 'Erro ao enviar solicitação.')
    } finally {
      setEnviandoSuporte(false)
    }
  }

  function abrirAlterarSenha() {
    setMenuAberto(false)
    setSenhaAtual('')
    setNovaSenha('')
    setConfirmarSenha('')
    setModalSenhaAberto(true)
  }

  async function alterarSenha(event: FormEvent) {
    event.preventDefault()

    if (!user?.id) return

    if (!senhaAtual.trim()) {
      setMensagem('Informe a senha atual.')
      return
    }

    if (!novaSenha || novaSenha.length < 6) {
      setMensagem('A nova senha precisa ter pelo menos 6 caracteres.')
      return
    }

    if (novaSenha !== confirmarSenha) {
      setMensagem('A confirmação da senha não confere.')
      return
    }

    try {
      setAlterandoSenha(true)
      setMensagem('')

      const response = await fetch('/api/alterar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email || '',
          senhaAtual,
          novaSenha,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.erro || data?.message || data?.error || 'Não foi possível alterar a senha.')
      }

      setModalSenhaAberto(false)
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarSenha('')
      setMensagem('Senha alterada com sucesso.')
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : 'Erro ao alterar senha.')
    } finally {
      setAlterandoSenha(false)
    }
  }

  async function sair() {
    setMenuAberto(false)

    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.warn('Aviso ao encerrar sessão Supabase:', error)
    }

    localStorage.removeItem('user')
    localStorage.removeItem('usuario')
    localStorage.removeItem('token')
    localStorage.removeItem('session')

    router.replace('/login')
  }

  if (!user) {
    return (
      <main className="loadingPage">
        <style>{styles}</style>
        <div className="loadingCard">Carregando sua dashboard...</div>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{styles}</style>

      <header className="topbar">
        <div className="topbarInner">
          <button
            type="button"
            className="brandText"
            onClick={() => router.push('/cliente/dashboard')}
            aria-label="Dashboard do cliente"
          >
            <strong>PrussikTrails</strong>
            <span>Seu app de aventuras</span>
          </button>

          <div className="topActions">
            <button
              type="button"
              className="avatarMini"
              onClick={() => router.push('/cliente/perfil')}
              aria-label="Abrir perfil"
            >
              {avatar ? <img src={avatar} alt={nome} /> : <span>{nome.charAt(0).toUpperCase()}</span>}
            </button>

            <div className="settingsWrap">
              <button
                type="button"
                className="gearButton"
                onClick={() => setMenuAberto((aberto) => !aberto)}
                aria-label="Abrir configurações"
              >
                ⚙
              </button>

              {menuAberto && (
                <div className="settingsMenu">
                  <button type="button" onClick={() => router.push('/cliente/perfil')}>
                    🎒 Meu Passaporte
                  </button>
                  <button type="button" onClick={() => router.push('/cliente/minhas-reservas')}>
                    🎟️ Minhas reservas
                  </button>
                  <button type="button" onClick={() => abrirSuporte('suporte')}>
                    🛟 Ajuda e suporte
                  </button>
                  <button type="button" onClick={() => abrirSuporte('bug')}>
                    🐞 Reportar bug
                  </button>
                  <button type="button" onClick={abrirAlterarSenha}>
                    🔐 Alterar senha
                  </button>
                  <button type="button" className="dangerItem" onClick={sair}>
                    🚪 Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="shell">
        <section className="hero">
          <div className="heroText">
            <div className="eyebrow">Dashboard do aventureiro</div>
            <h1>Olá, {nome.split(' ')[0] || 'aventureiro'}.</h1>
            <p>
              Acompanhe suas reservas, conquistas, notificações da comunidade e os roteiros que estão movimentando o PrussikTrails.
            </p>

            <div className="heroActions">
              <button type="button" className="btn primary" onClick={() => router.push('/roteiros')}>
                Explorar roteiros
              </button>
              <button type="button" className="btn light" onClick={() => router.push('/cliente/minhas-reservas')}>
                Minhas reservas
              </button>
              <button
                type="button"
                className="btn soft"
                onClick={() => user?.id && reconciliarPagamentosPendentesInterno(user.id)}
                disabled={reconciliando}
              >
                {reconciliando ? 'Verificando...' : 'Verificar pagamentos'}
              </button>
            </div>
          </div>

          <aside className="heroCard">
            <span>Próxima experiência</span>
            <strong>{proximasReservas.length > 0 ? tituloReserva(proximasReservas[0]) : 'Escolha uma trilha'}</strong>
            <p>
              {proximasReservas.length > 0
                ? `Reserva para ${formatarData(dataReserva(proximasReservas[0]))}.`
                : 'Encontre um roteiro e comece sua jornada outdoor.'}
            </p>
            <button
              type="button"
              onClick={() => router.push(proximasReservas.length > 0 ? '/cliente/minhas-reservas' : '/roteiros')}
            >
              {proximasReservas.length > 0 ? 'Ver reservas' : 'Explorar agora'}
            </button>
          </aside>
        </section>

        {mensagem && <div className="notice">{mensagem}</div>}

        <section className="statsGrid">
          <article className="statCard">
            <span>Km registrados</span>
            <strong>{formatarKm(stats.totalKm)}</strong>
          </article>
          <article className="statCard">
            <span>Trilhas</span>
            <strong>{stats.totalTrilhas}</strong>
          </article>
          <article className="statCard">
            <span>Reservas confirmadas</span>
            <strong>{stats.reservasConfirmadas}</strong>
          </article>
          <article className="statCard">
            <span>Reservas pendentes</span>
            <strong>{stats.reservasPendentes}</strong>
          </article>
          <article className="statCard">
            <span>Medalhas</span>
            <strong>{stats.totalMedalhas || medalhasConquistadas.length}</strong>
          </article>
          <article className="statCard">
            <span>Atualização</span>
            <strong>{ultimaAtualizacao || 'Agora'}</strong>
          </article>
        </section>

        <section className="mainGrid">
          <div className="leftColumn">
            <section className="panel notificationsPanel">
              <div className="panelHeader">
                <div>
                  <h2>Notificações</h2>
                  <p>ALL mostra a comunidade. COM mostra interações relacionadas a você e aos guias que você segue.</p>
                </div>

                <button type="button" className="smallButton" onClick={() => carregarResumo(user.id)} disabled={atualizando}>
                  {atualizando ? 'Atualizando...' : 'Atualizar'}
                </button>
              </div>

              <div className="tabs">
                <button
                  type="button"
                  className={abaNotificacoes === 'all' ? 'active' : ''}
                  onClick={() => setAbaNotificacoes('all')}
                >
                  ALL <span>{notificacoesAll.length}</span>
                </button>
                <button
                  type="button"
                  className={abaNotificacoes === 'com' ? 'active' : ''}
                  onClick={() => setAbaNotificacoes('com')}
                >
                  COM <span>{notificacoesCom.length}</span>
                </button>
              </div>

              <div className="notificationsList">
                {notificacoesVisiveis.map((notificacao) => (
                  <button
                    type="button"
                    key={notificacao.id}
                    className={`notificationItem ${notificacao.id.startsWith('empty') ? 'emptyNotification' : ''}`}
                    onClick={() => abrirDestino(notificacao.destino)}
                  >
                    <span className="notificationEmoji">{notificacao.emoji}</span>
                    <span className="notificationContent">
                      <strong>{notificacao.titulo}</strong>
                      <small>{notificacao.texto}</small>
                      {notificacao.created_at && <em>{formatarDataHora(notificacao.created_at)}</em>}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panelHeader">
                <div>
                  <h2>Roteiros em destaque</h2>
                  <p>Experiências recentes e com movimento dentro da plataforma.</p>
                </div>
                <button type="button" className="smallButton" onClick={() => router.push('/roteiros')}>
                  Ver todos
                </button>
              </div>

              {roteirosQuentes.length === 0 ? (
                <div className="emptyBox">Assim que novos roteiros forem aprovados, eles aparecerão aqui.</div>
              ) : (
                <div className="routesGrid">
                  {roteirosQuentes.slice(0, 4).map((roteiro) => {
                    const foto = fotoRoteiro(roteiro)

                    return (
                      <article className="routeCard" key={roteiro.id}>
                        <button type="button" className="routeImage" onClick={() => router.push(`/roteiros/${roteiro.id}`)}>
                          {foto ? <img src={foto} alt={tituloRoteiro(roteiro)} loading="lazy" /> : <span>🏞️</span>}
                        </button>
                        <div className="routeBody">
                          <h3>{tituloRoteiro(roteiro)}</h3>
                          <p>{localRoteiro(roteiro)}</p>
                          <div className="routeMeta">
                            <span>{roteiro.dificuldade || 'Nível a confirmar'}</span>
                            <strong>{formatarMoeda(precoRoteiro(roteiro))}</strong>
                          </div>
                          <button type="button" onClick={() => router.push(`/roteiros/${roteiro.id}`)}>
                            Ver roteiro
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="rightColumn">
            <section className="panel hotPanel">
              <div className="panelHeader compact">
                <div>
                  <h2>Roteiro quente</h2>
                  <p>Um convite para sair do feed e entrar na trilha.</p>
                </div>
              </div>

              {primeiroRoteiroQuente ? (
                <article className="hotRoute">
                  <div className="hotImage">
                    {fotoRoteiro(primeiroRoteiroQuente) ? (
                      <img src={fotoRoteiro(primeiroRoteiroQuente)} alt={tituloRoteiro(primeiroRoteiroQuente)} loading="lazy" />
                    ) : (
                      <span>🧭</span>
                    )}
                  </div>
                  <strong>{tituloRoteiro(primeiroRoteiroQuente)}</strong>
                  <p>{localRoteiro(primeiroRoteiroQuente)}</p>
                  <button type="button" onClick={() => router.push(`/roteiros/${primeiroRoteiroQuente.id}`)}>
                    Abrir roteiro
                  </button>
                </article>
              ) : (
                <div className="emptyBox small">Nenhum roteiro quente no momento.</div>
              )}
            </section>

            <section className="panel compactPanel">
              <div className="panelHeader compact">
                <div>
                  <h2>Próximas reservas</h2>
                  <p>O que vem pela frente.</p>
                </div>
              </div>

              {proximasReservas.length === 0 ? (
                <div className="emptyBox small">Você ainda não tem reservas futuras.</div>
              ) : (
                <div className="reservationList">
                  {proximasReservas.slice(0, 4).map((reserva) => (
                    <button type="button" key={reserva.id} onClick={() => router.push('/cliente/minhas-reservas')}>
                      {fotoReserva(reserva) ? <img src={fotoReserva(reserva)} alt={tituloReserva(reserva)} loading="lazy" /> : <span>🎟️</span>}
                      <span>
                        <strong>{tituloReserva(reserva)}</strong>
                        <small>{formatarData(dataReserva(reserva))}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="panel compactPanel">
              <div className="panelHeader compact">
                <div>
                  <h2>Passaporte</h2>
                  <p>Medalhas e evolução.</p>
                </div>
                <button type="button" className="smallButton" onClick={() => router.push('/cliente/perfil')}>
                  Abrir
                </button>
              </div>

              <div className="medalList">
                {medalhasConquistadas.slice(0, 4).map((item) => {
                  const medalha = normalizarMedalha(item)

                  return (
                    <div className="medalMini" key={item.id}>
                      <span>{medalha?.icone || '🏅'}</span>
                      <strong>{medalha?.nome || 'Medalha conquistada'}</strong>
                    </div>
                  )
                })}

                {medalhasConquistadas.length === 0 && (
                  <div className="emptyBox small">Suas medalhas aparecerão aqui.</div>
                )}
              </div>

              {proximaMedalha && (
                <div className="nextMedalBox">
                  <span>{proximaMedalha.icone || '🏅'}</span>
                  <div>
                    <strong>{proximaMedalha.nome || 'Próxima medalha'}</strong>
                    <small>{proximaMedalha.descricao || 'Continue sua jornada para desbloquear a próxima conquista.'}</small>
                  </div>
                </div>
              )}
            </section>
          </aside>
        </section>
      </section>

      {modalSuporteAberto && (
        <div className="modalOverlay" onClick={() => !enviandoSuporte && setModalSuporteAberto(false)}>
          <section className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <span>Ajuda e suporte</span>
                <h2>{tipoSuporte === 'bug' ? 'Reportar bug' : tipoSuporte === 'sugestao' ? 'Sugerir melhoria' : 'Mensagem ao suporte'}</h2>
              </div>
              <button type="button" onClick={() => setModalSuporteAberto(false)} disabled={enviandoSuporte}>
                ×
              </button>
            </div>

            <label className="field">
              <span>Tipo</span>
              <select value={tipoSuporte} onChange={(event) => setTipoSuporte(event.target.value as SuporteTipo)}>
                <option value="bug">Bug / erro no app</option>
                <option value="suporte">Mensagem ao suporte</option>
                <option value="sugestao">Sugestão de melhoria</option>
              </select>
            </label>

            <label className="field">
              <span>Assunto</span>
              <input value={assuntoSuporte} onChange={(event) => setAssuntoSuporte(event.target.value)} />
            </label>

            <label className="field">
              <span>Descrição</span>
              <textarea
                value={descricaoSuporte}
                onChange={(event) => setDescricaoSuporte(event.target.value)}
                placeholder="Descreva o que aconteceu, em qual tela e o que você esperava."
              />
            </label>

            <label className="field">
              <span>Prioridade</span>
              <select value={prioridadeSuporte} onChange={(event) => setPrioridadeSuporte(event.target.value as PrioridadeSuporte)}>
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </label>

            {erroSuporte && <div className="modalError">{erroSuporte}</div>}

            <div className="modalActions">
              <button type="button" className="btn light" onClick={() => setModalSuporteAberto(false)} disabled={enviandoSuporte}>
                Cancelar
              </button>
              <button type="button" className="btn primary" onClick={enviarSuporte} disabled={enviandoSuporte}>
                {enviandoSuporte ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </section>
        </div>
      )}

      {modalSenhaAberto && (
        <div className="modalOverlay" onClick={() => !alterandoSenha && setModalSenhaAberto(false)}>
          <form className="modal" onSubmit={alterarSenha} onClick={(event) => event.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <span>Configurações</span>
                <h2>Alterar senha</h2>
              </div>
              <button type="button" onClick={() => setModalSenhaAberto(false)} disabled={alterandoSenha}>
                ×
              </button>
            </div>

            <label className="field">
              <span>Senha atual</span>
              <input type="password" value={senhaAtual} onChange={(event) => setSenhaAtual(event.target.value)} />
            </label>

            <label className="field">
              <span>Nova senha</span>
              <input type="password" value={novaSenha} onChange={(event) => setNovaSenha(event.target.value)} />
            </label>

            <label className="field">
              <span>Confirmar nova senha</span>
              <input type="password" value={confirmarSenha} onChange={(event) => setConfirmarSenha(event.target.value)} />
            </label>

            <div className="modalActions">
              <button type="button" className="btn light" onClick={() => setModalSenhaAberto(false)} disabled={alterandoSenha}>
                Cancelar
              </button>
              <button type="submit" className="btn primary" disabled={alterandoSenha}>
                {alterandoSenha ? 'Salvando...' : 'Salvar senha'}
              </button>
            </div>
          </form>
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

  button,
  input,
  textarea,
  select {
    font: inherit;
  }

  .page,
  .loadingPage {
    min-height: 100vh;
    min-height: 100dvh;
    color: #172018;
    background:
      radial-gradient(circle at 10% 0%, rgba(132,204,22,0.16), transparent 28%),
      radial-gradient(circle at 90% 10%, rgba(251,146,60,0.14), transparent 28%),
      linear-gradient(180deg,#fffdf7 0%,#f3f5ea 48%,#eef2e5 100%);
  }

  .loadingPage {
    display: grid;
    place-items: center;
    padding: 20px;
  }

  .loadingCard {
    border-radius: 28px;
    background: rgba(255,255,255,0.88);
    border: 1px solid rgba(15,23,42,0.08);
    padding: 28px;
    box-shadow: 0 22px 60px rgba(15,23,42,0.12);
    color: #203c2e;
    font-weight: 950;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 60;
    background: rgba(255,253,247,0.90);
    border-bottom: 1px solid rgba(15,23,42,0.06);
    backdrop-filter: blur(18px);
    padding: 8px 14px;
  }

  .topbarInner {
    max-width: 1180px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
  }

  .brandText {
    grid-column: 2;
    justify-self: center;
    border: 0;
    background: transparent;
    display: grid;
    justify-items: center;
    gap: 3px;
    cursor: pointer;
    padding: 4px 6px;
    max-width: 100%;
    min-width: 0;
  }

  .brandText strong {
    color: #203c2e;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: clamp(28px, 4vw, 44px);
    line-height: 0.92;
    letter-spacing: -0.06em;
    font-weight: 800;
    white-space: nowrap;
  }

  .brandText span {
    color: #7b8372;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .topActions {
    grid-column: 3;
    justify-self: end;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .avatarMini,
  .gearButton {
    width: 42px;
    height: 42px;
    border-radius: 999px;
    border: 1px solid rgba(15,23,42,0.08);
    background: rgba(255,255,255,0.88);
    box-shadow: 0 10px 22px rgba(15,23,42,0.06);
    cursor: pointer;
    padding: 0;
    overflow: hidden;
  }

  .avatarMini img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .avatarMini span {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #203c2e;
    color: #fffdf7;
    font-weight: 950;
  }

  .gearButton {
    color: #203c2e;
    font-size: 19px;
  }

  .settingsWrap {
    position: relative;
  }

  .settingsMenu {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    z-index: 100;
    width: 246px;
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
    color: #172018;
    padding: 12px 13px;
    border-radius: 16px;
    text-align: left;
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

  .shell {
    max-width: 1180px;
    margin: 0 auto;
    padding: 22px 16px 54px;
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 18px;
    align-items: stretch;
    margin-bottom: 16px;
  }

  .heroText,
  .heroCard {
    border-radius: 36px;
    box-shadow: 0 24px 60px rgba(23,32,24,0.18);
  }

  .heroText {
    padding: 28px;
    color: #fff;
    background:
      linear-gradient(135deg, rgba(23,32,24,0.80), rgba(23,32,24,0.42)),
      radial-gradient(circle at top right, rgba(190,242,100,0.30), transparent 34%),
      linear-gradient(135deg, #1f331f 0%, #647a49 46%, #d7c6a1 100%);
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

  .heroText h1 {
    margin: 0;
    font-size: clamp(44px, 6vw, 76px);
    line-height: 0.92;
    font-weight: 950;
    letter-spacing: -0.085em;
  }

  .heroText p {
    max-width: 760px;
    margin: 14px 0 0;
    color: rgba(255,255,255,0.82);
    line-height: 1.6;
    font-size: 14px;
    font-weight: 650;
  }

  .heroActions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 20px;
  }

  .btn,
  .smallButton,
  .heroCard button,
  .routeBody button,
  .hotRoute button {
    border: 0;
    border-radius: 999px;
    padding: 11px 14px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 950;
    transition: 0.18s ease;
  }

  .btn:hover:not(:disabled),
  .smallButton:hover:not(:disabled),
  .heroCard button:hover,
  .routeBody button:hover,
  .hotRoute button:hover {
    transform: translateY(-1px);
  }

  .btn:disabled,
  .smallButton:disabled {
    opacity: 0.62;
    cursor: not-allowed;
  }

  .btn.primary,
  .heroCard button,
  .routeBody button,
  .hotRoute button {
    background: #172018;
    color: #fffdf7;
  }

  .btn.light,
  .smallButton {
    background: #eef2e5;
    color: #334155;
  }

  .btn.soft {
    background: rgba(255,255,255,0.16);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.20);
  }

  .heroCard {
    padding: 22px;
    background: rgba(255,255,255,0.88);
    border: 1px solid rgba(15,23,42,0.06);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .heroCard span {
    color: #991b1b;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .heroCard strong {
    display: block;
    margin-top: 10px;
    color: #172018;
    font-size: 28px;
    line-height: 0.96;
    letter-spacing: -0.055em;
    font-weight: 950;
  }

  .heroCard p {
    color: #64748b;
    font-size: 13px;
    line-height: 1.5;
    font-weight: 750;
  }

  .notice {
    border-radius: 18px;
    padding: 13px 15px;
    margin-bottom: 16px;
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
    font-size: 13px;
    font-weight: 850;
  }

  .statsGrid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 16px;
  }

  .statCard,
  .panel {
    background: rgba(255,255,255,0.90);
    border: 1px solid rgba(15,23,42,0.06);
    box-shadow: 0 12px 34px rgba(15,23,42,0.06);
  }

  .statCard {
    border-radius: 24px;
    padding: 16px;
  }

  .statCard span {
    display: block;
    color: #64748b;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 7px;
  }

  .statCard strong {
    color: #172018;
    font-size: 20px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.05em;
  }

  .mainGrid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 16px;
    align-items: start;
  }

  .leftColumn,
  .rightColumn {
    display: grid;
    gap: 16px;
  }

  .panel {
    border-radius: 30px;
    padding: 18px;
    overflow: hidden;
  }

  .panelHeader {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 15px;
    flex-wrap: wrap;
  }

  .panelHeader.compact {
    margin-bottom: 12px;
  }

  .panelHeader h2 {
    margin: 0;
    color: #172018;
    font-size: 23px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.055em;
  }

  .panelHeader p {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.45;
    font-weight: 750;
    max-width: 560px;
  }

  .tabs {
    display: flex;
    gap: 8px;
    padding: 5px;
    background: #eef2e5;
    border-radius: 999px;
    width: fit-content;
    margin-bottom: 14px;
  }

  .tabs button {
    border: 0;
    border-radius: 999px;
    padding: 9px 12px;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    font-size: 12px;
    font-weight: 950;
  }

  .tabs button.active {
    background: #172018;
    color: #fffdf7;
  }

  .tabs span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    border-radius: 999px;
    background: rgba(255,255,255,0.22);
    margin-left: 5px;
    padding: 0 5px;
  }

  .notificationsList {
    display: grid;
    gap: 8px;
  }

  .notificationItem {
    width: 100%;
    border: 1px solid rgba(15,23,42,0.06);
    background: #fffdf7;
    border-radius: 20px;
    padding: 12px;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 10px;
    align-items: start;
    cursor: pointer;
    text-align: left;
  }

  .notificationItem:hover {
    border-color: rgba(32,60,46,0.18);
    box-shadow: 0 10px 22px rgba(15,23,42,0.06);
  }

  .emptyNotification {
    border-style: dashed;
  }

  .notificationEmoji {
    width: 42px;
    height: 42px;
    border-radius: 16px;
    background: #eef2e5;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 21px;
  }

  .notificationContent {
    display: grid;
    min-width: 0;
  }

  .notificationContent strong {
    color: #172018;
    font-size: 14px;
    font-weight: 950;
    line-height: 1.25;
  }

  .notificationContent small {
    color: #64748b;
    font-size: 12px;
    line-height: 1.45;
    font-weight: 700;
    margin-top: 3px;
  }

  .notificationContent em {
    color: #94a3b8;
    font-size: 10px;
    font-style: normal;
    font-weight: 850;
    margin-top: 5px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .routesGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .routeCard {
    border: 1px solid rgba(15,23,42,0.06);
    background: #fffdf7;
    border-radius: 24px;
    overflow: hidden;
  }

  .routeImage {
    border: 0;
    width: 100%;
    aspect-ratio: 4 / 3;
    background: #eef2e5;
    display: grid;
    place-items: center;
    padding: 0;
    cursor: pointer;
    overflow: hidden;
    color: #64748b;
    font-size: 36px;
  }

  .routeImage img,
  .hotImage img,
  .reservationList img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .routeBody {
    padding: 14px;
  }

  .routeBody h3,
  .hotRoute strong {
    margin: 0;
    color: #172018;
    font-size: 18px;
    line-height: 1.1;
    font-weight: 950;
    letter-spacing: -0.045em;
  }

  .routeBody p,
  .hotRoute p {
    margin: 7px 0 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.45;
    font-weight: 750;
  }

  .routeMeta {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
    margin: 11px 0;
  }

  .routeMeta span {
    border-radius: 999px;
    background: #eef2e5;
    color: #475569;
    padding: 6px 8px;
    font-size: 10px;
    font-weight: 900;
  }

  .routeMeta strong {
    color: #203c2e;
    font-size: 13px;
    font-weight: 950;
  }

  .emptyBox {
    border: 1px dashed rgba(15,23,42,0.16);
    background: #fffdf7;
    border-radius: 20px;
    padding: 22px;
    text-align: center;
    color: #64748b;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 750;
  }

  .emptyBox.small {
    padding: 16px;
    font-size: 12px;
  }

  .hotRoute {
    display: grid;
    gap: 10px;
  }

  .hotImage {
    width: 100%;
    aspect-ratio: 4 / 5;
    border-radius: 22px;
    background: #eef2e5;
    overflow: hidden;
    display: grid;
    place-items: center;
    color: #64748b;
    font-size: 40px;
  }

  .reservationList {
    display: grid;
    gap: 8px;
  }

  .reservationList button {
    border: 1px solid rgba(15,23,42,0.06);
    background: #fffdf7;
    border-radius: 18px;
    padding: 8px;
    display: grid;
    grid-template-columns: 46px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
    text-align: left;
    cursor: pointer;
  }

  .reservationList img,
  .reservationList > button > span:first-child {
    width: 46px;
    height: 46px;
    border-radius: 14px;
    object-fit: cover;
    background: #eef2e5;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .reservationList strong,
  .medalMini strong,
  .nextMedalBox strong {
    display: block;
    color: #172018;
    font-size: 12px;
    line-height: 1.25;
    font-weight: 950;
  }

  .reservationList small,
  .nextMedalBox small {
    display: block;
    margin-top: 3px;
    color: #64748b;
    font-size: 11px;
    font-weight: 750;
    line-height: 1.35;
  }

  .medalList {
    display: grid;
    gap: 8px;
  }

  .medalMini,
  .nextMedalBox {
    border: 1px solid rgba(15,23,42,0.06);
    background: #fffdf7;
    border-radius: 18px;
    padding: 10px;
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr);
    gap: 9px;
    align-items: center;
  }

  .medalMini span,
  .nextMedalBox > span {
    width: 38px;
    height: 38px;
    border-radius: 14px;
    background: #eef2e5;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nextMedalBox {
    margin-top: 10px;
    background: #f0fdf4;
    border-color: #bbf7d0;
  }

  .modalOverlay {
    position: fixed;
    inset: 0;
    z-index: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background: rgba(8,13,7,0.50);
    backdrop-filter: blur(10px);
  }

  .modal {
    width: min(520px, 100%);
    max-height: calc(100dvh - 36px);
    overflow: auto;
    border-radius: 30px;
    background: #fffdf7;
    border: 1px solid rgba(15,23,42,0.08);
    box-shadow: 0 34px 90px rgba(15,23,42,0.24);
    padding: 20px;
  }

  .modalHeader {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }

  .modalHeader span,
  .field span {
    display: block;
    color: #64748b;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .modalHeader h2 {
    margin: 0;
    color: #172018;
    font-size: 26px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.055em;
  }

  .modalHeader button {
    width: 38px;
    height: 38px;
    border-radius: 999px;
    border: 1px solid rgba(15,23,42,0.08);
    background: #f8fafc;
    color: #172018;
    font-size: 24px;
    cursor: pointer;
  }

  .field {
    display: grid;
    gap: 6px;
    margin-bottom: 12px;
  }

  .field input,
  .field select,
  .field textarea {
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

  .field textarea {
    min-height: 116px;
    resize: vertical;
    line-height: 1.45;
  }

  .modalError {
    border-radius: 16px;
    background: rgba(220,38,38,0.08);
    border: 1px solid rgba(220,38,38,0.16);
    color: #991b1b;
    padding: 10px 12px;
    font-size: 13px;
    font-weight: 850;
    margin-bottom: 12px;
  }

  .modalActions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 14px;
  }

  @media (max-width: 1040px) {
    .hero,
    .mainGrid {
      grid-template-columns: 1fr;
    }

    .statsGrid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .rightColumn {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .hotPanel {
      grid-column: 1 / -1;
    }

    .hotRoute {
      grid-template-columns: 180px minmax(0, 1fr);
      align-items: center;
    }

    .hotImage {
      aspect-ratio: 4 / 3;
    }
  }

  @media (max-width: 720px) {
    .topbar {
      padding: 7px 10px;
    }

    .topbarInner {
      grid-template-columns: 1fr auto;
    }

    .brandText {
      grid-column: 1;
      justify-self: start;
      justify-items: start;
    }

    .brandText strong {
      font-size: 29px;
    }

    .brandText span {
      font-size: 8px;
      letter-spacing: 0.12em;
    }

    .topActions {
      grid-column: 2;
    }

    .avatarMini {
      width: 36px;
      height: 36px;
    }

    .gearButton {
      width: 36px;
      height: 36px;
      font-size: 17px;
      box-shadow: none;
    }

    .settingsMenu {
      position: fixed;
      top: 58px;
      right: 10px;
      width: min(246px, calc(100vw - 20px));
    }

    .shell {
      padding: 12px 9px 40px;
    }

    .heroText,
    .heroCard,
    .panel {
      border-radius: 24px;
    }

    .heroText {
      padding: 20px;
    }

    .heroText h1 {
      font-size: 42px;
    }

    .heroText p {
      font-size: 13px;
    }

    .heroActions,
    .modalActions {
      display: grid;
      grid-template-columns: 1fr;
    }

    .btn,
    .smallButton,
    .heroCard button,
    .routeBody button,
    .hotRoute button {
      width: 100%;
    }

    .statsGrid,
    .routesGrid,
    .rightColumn,
    .hotRoute {
      grid-template-columns: 1fr;
    }

    .panel {
      padding: 14px;
    }

    .tabs {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-radius: 18px;
    }

    .tabs button {
      width: 100%;
    }

    .modalOverlay {
      align-items: flex-end;
      padding: 10px;
    }

    .modal {
      border-radius: 26px;
      max-height: calc(100dvh - 22px);
    }
  }
`
