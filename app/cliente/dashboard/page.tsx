'use client'

import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
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
  km?: number | null
  distancia_km?: number | null
  dificuldade?: string | null
  localizacao?: string | null
  local?: string | null
  cidade?: string | null
  destino?: string | null
  status?: string | null
  situacao?: string | null
  publicacao?: string | null
  ativo?: boolean | null
  aprovado?: boolean | null
  created_at?: string | null
}

type Reserva = {
  id: string
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
  texto: 'Quando novos guias, roteiros e conquistas aparecerem, você verá tudo aqui.',
  emoji: '🌿',
  tipo: 'all',
  destino: '/roteiros',
  created_at: null,
}

const notificacaoVaziaCom: Notificacao = {
  id: 'empty-com',
  titulo: 'Siga guias e aventureiros para movimentar a COM',
  texto: 'Roteiros de guias seguidos, curtidas e interações relacionadas a você aparecerão aqui.',
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
  return km.toLocaleString('pt-BR', { maximumFractionDigits: km % 1 === 0 ? 0 : 1 })
}

function formatarMoeda(valor: unknown) {
  return numeroSeguro(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatarDataHora(valor?: string | null) {
  const raw = texto(valor)
  if (!raw) return ''

  const data = new Date(raw)
  if (Number.isNaN(data.getTime())) return raw.slice(0, 10)

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
  return texto(roteiro?.localizacao || roteiro?.local || roteiro?.cidade || roteiro?.destino) || 'Experiência outdoor'
}

function precoRoteiro(roteiro?: Roteiro | null) {
  return numeroSeguro(roteiro?.preco ?? roteiro?.valor)
}

function nomeUsuario(user?: UsuarioLocal | null) {
  return texto(user?.nome || user?.email) || 'Aventureiro'
}

function avatarUsuario(user?: UsuarioLocal | null) {
  return texto(user?.avatar_url || user?.foto_url || user?.imagem_url)
}

function metadataNotificacao(item: AnyRecord) {
  return item?.metadata || item?.detalhes || item?.extra || {}
}

function tipoEventoNotificacao(item: AnyRecord) {
  const metadata = metadataNotificacao(item)
  return normalizar(item?.tipo_evento || item?.evento || item?.acao || item?.tipo || item?.categoria || metadata?.tipo || metadata?.evento)
}

function idRoteiroNotificacao(item: AnyRecord) {
  const metadata = metadataNotificacao(item)
  return texto(
    item?.roteiro_id ||
      item?.id_roteiro ||
      item?.roteiroId ||
      metadata?.roteiro_id ||
      metadata?.id_roteiro ||
      metadata?.roteiroId
  )
}

function notificacaoEhRoteiro(item: AnyRecord) {
  const tipo = tipoEventoNotificacao(item)
  const titulo = normalizar(item?.titulo || item?.descricao || item?.mensagem || item?.texto)
  return Boolean(idRoteiroNotificacao(item)) || tipo.includes('roteiro') || titulo.includes('roteiro') || titulo.includes('publicou')
}

function nomePessoaNotificacao(item: AnyRecord) {
  const metadata = metadataNotificacao(item)
  return texto(
    item?.nome_usuario ||
      item?.usuario_nome ||
      item?.nome ||
      item?.actor_nome ||
      item?.ator_nome ||
      item?.guia_nome ||
      metadata?.nome_usuario ||
      metadata?.usuario_nome ||
      metadata?.nome ||
      metadata?.actor_nome ||
      metadata?.ator_nome ||
      metadata?.guia_nome
  )
}

function destinoPorPerfil(usuarioId: string, tipoUsuario?: string | null) {
  const tipo = normalizar(tipoUsuario)
  if (!usuarioId) return '/cliente/dashboard'
  if (tipo.includes('guia')) return `/guia/publico/${usuarioId}`
  return `/cliente/publico/${usuarioId}`
}

function destinoNotificacao(item: AnyRecord, fallback = '/cliente/dashboard') {
  const metadata = metadataNotificacao(item)
  const roteiroId = idRoteiroNotificacao(item)

  if (notificacaoEhRoteiro(item) && roteiroId) {
    return `/roteiros/${roteiroId}`
  }

  const direto = texto(item?.destino_url || item?.destino || item?.rota || item?.url || metadata?.destino_url || metadata?.destino || metadata?.rota || metadata?.url)
  if (direto) return direto

  if (roteiroId) return `/roteiros/${roteiroId}`

  const actorId = texto(item?.actor_id || item?.ator_id || item?.usuario_origem_id || metadata?.actor_id || metadata?.ator_id)
  const usuarioId = texto(item?.usuario_id || metadata?.usuario_id || metadata?.user_id)

  if (actorId) return destinoPorPerfil(actorId, item?.actor_tipo || item?.tipo_actor || metadata?.tipo_usuario || metadata?.actor_tipo)
  if (usuarioId) return destinoPorPerfil(usuarioId, item?.tipo_usuario || metadata?.tipo_usuario)

  return fallback
}

function normalizarNotificacaoAll(item: AnyRecord, index: number): Notificacao {
  const tipo = tipoEventoNotificacao(item)
  const nome = nomePessoaNotificacao(item)
  const metadata = metadataNotificacao(item)
  const roteiro = texto(item?.roteiro_titulo || item?.nome_roteiro || metadata?.roteiro_titulo || metadata?.nome_roteiro)
  const isRoteiro = notificacaoEhRoteiro(item)

  return {
    id: texto(item?.id) || `all-${index}-${Date.now()}`,
    titulo: texto(item?.titulo) || (isRoteiro ? (roteiro ? `Novo roteiro: ${roteiro}` : 'Novo roteiro publicado') : nome || 'Movimento na comunidade'),
    texto: texto(item?.texto || item?.mensagem || item?.descricao) || (isRoteiro ? 'Toque para abrir o roteiro publicado.' : 'Toque para abrir os detalhes.'),
    destino: destinoNotificacao(item, '/roteiros'),
    emoji: isRoteiro ? '🧭' : tipo.includes('guia') ? '🥾' : tipo.includes('medalha') ? '🏅' : '🌿',
    tipo: 'all',
    tipoEvento: tipo,
    created_at: texto(item?.created_at || item?.criado_em || item?.data) || null,
  }
}

function normalizarNotificacaoCom(item: AnyRecord, index: number): Notificacao {
  const tipo = tipoEventoNotificacao(item)
  const nome = nomePessoaNotificacao(item)
  const isRoteiro = notificacaoEhRoteiro(item)

  return {
    id: texto(item?.id) || `com-${index}-${Date.now()}`,
    titulo: texto(item?.titulo) || (isRoteiro ? (nome ? `${nome} publicou um roteiro` : 'Guia que você segue publicou um roteiro') : nome ? `${nome} interagiu com você` : 'Interação na COM'),
    texto: texto(item?.texto || item?.mensagem || item?.descricao) || (isRoteiro ? 'Toque para abrir o roteiro.' : 'Toque para abrir os detalhes.'),
    destino: destinoNotificacao(item, '/roteiros'),
    emoji: isRoteiro ? '🧭' : tipo.includes('seguir') ? '👣' : tipo.includes('curtida') ? '❤️' : '💬',
    tipo: 'com',
    tipoEvento: tipo,
    created_at: texto(item?.created_at || item?.criado_em || item?.data) || null,
  }
}

function compararDataDesc(a: Notificacao, b: Notificacao) {
  const dataA = a.created_at ? new Date(a.created_at).getTime() : 0
  const dataB = b.created_at ? new Date(b.created_at).getTime() : 0
  return dataB - dataA
}

function mesclarNotificacoes(listas: Notificacao[][]) {
  const mapa = new Map<string, Notificacao>()

  listas.flat().forEach((item) => {
    const chave = `${item.destino || ''}|${normalizar(item.titulo)}|${item.created_at || ''}`
    if (!mapa.has(chave)) mapa.set(chave, item)
  })

  return Array.from(mapa.values()).sort(compararDataDesc).slice(0, 12)
}

function roteiroPublicado(roteiro: AnyRecord) {
  if (roteiro.ativo === false) return false
  if (roteiro.aprovado === true) return true

  const status = normalizar(roteiro.status || roteiro.situacao || roteiro.publicacao || roteiro.estado)
  if (!status) return true

  return ['ativo', 'aprovado', 'aprovada', 'publicado', 'publicada', 'confirmado', 'confirmada'].includes(status)
}

export default function ClienteDashboardPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [stats, setStats] = useState<Stats>(statsInicial)
  const [roteirosQuentes, setRoteirosQuentes] = useState<Roteiro[]>([])
  const [activeHotTrail, setActiveHotTrail] = useState(0)
  const [proximasReservas, setProximasReservas] = useState<Reserva[]>([])
  const [notificacoesAll, setNotificacoesAll] = useState<Notificacao[]>([])
  const [notificacoesCom, setNotificacoesCom] = useState<Notificacao[]>([])
  const [abaNotificacoes, setAbaNotificacoes] = useState<'all' | 'com'>('all')
  const [atualizando, setAtualizando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('')

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

  useEffect(() => {
    if (roteirosQuentes.length <= 1) return
    const timer = window.setInterval(() => {
      setActiveHotTrail((prev) => (prev + 1) % roteirosQuentes.length)
    }, 4300)
    return () => window.clearInterval(timer)
  }, [roteirosQuentes.length])

  const notificacoesVisiveis = useMemo(() => {
    const lista = abaNotificacoes === 'all' ? notificacoesAll : notificacoesCom
    if (lista.length === 0) return [abaNotificacoes === 'all' ? notificacaoVaziaAll : notificacaoVaziaCom]
    return lista
  }, [abaNotificacoes, notificacoesAll, notificacoesCom])

  const roteiroAtivo = useMemo(() => {
    return roteirosQuentes[activeHotTrail] || roteirosQuentes[0] || null
  }, [roteirosQuentes, activeHotTrail])

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

  async function carregarRoteirosPublicosFallback(): Promise<Roteiro[]> {
    const { data, error } = await supabase
      .from('roteiros')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(18)

    if (error) {
      console.warn('Não foi possível carregar roteiros públicos:', error)
      return []
    }

    return ((data || []) as AnyRecord[])
      .filter(roteiroPublicado)
      .slice(0, 6) as Roteiro[]
  }

  async function carregarNotificacoesCom(usuarioId: string): Promise<Notificacao[]> {
    if (!usuarioId) return []

    try {
      const response = await fetch(`/api/notificacoes/com?usuarioId=${encodeURIComponent(usuarioId)}`, {
        method: 'GET',
        cache: 'no-store',
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || data?.sucesso === false) return []

      const lista: AnyRecord[] = Array.isArray(data?.notificacoes) ? data.notificacoes : []
      return lista.map((item, index) => normalizarNotificacaoCom(item, index)).sort(compararDataDesc).slice(0, 12)
    } catch (error) {
      console.warn('Erro ao carregar notificações COM:', error)
      return []
    }
  }

  async function carregarResumo(clienteId: string, silencioso = false) {
    if (!clienteId) return

    if (!silencioso) {
      setAtualizando(true)
      setMensagem('')
    }

    try {
      const response = await fetch(`/api/cliente/dashboard/resumo?clienteId=${encodeURIComponent(clienteId)}`, {
        method: 'GET',
        cache: 'no-store',
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || data?.sucesso === false) throw new Error(data?.erro || 'Erro ao carregar resumo da dashboard.')

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

      const roteirosDashboard = Array.isArray(data?.roteirosQuentes) ? data.roteirosQuentes : []
      const roteirosFallback = roteirosDashboard.length > 0 ? [] : await carregarRoteirosPublicosFallback()
      setRoteirosQuentes((roteirosDashboard.length > 0 ? roteirosDashboard : roteirosFallback) as Roteiro[])
      setActiveHotTrail(0)

      setStats({ ...statsInicial, ...(data?.stats || {}) })
      setProximasReservas(Array.isArray(data?.proximasReservas) ? data.proximasReservas : [])
      setUltimaAtualizacao(data?.ultimaAtualizacao || new Date().toLocaleTimeString('pt-BR'))

      const notificacoesBase: AnyRecord[] = Array.isArray(data?.notificacoes) ? data.notificacoes : []
      const notificacoesGerais = notificacoesBase
        .filter((item) => normalizar(item?.tipo) !== 'com' || notificacaoEhRoteiro(item))
        .map((item, index) => normalizarNotificacaoAll(item, index))
        .sort(compararDataDesc)
        .slice(0, 12)

      const listaCom = await carregarNotificacoesCom(data?.usuario?.id || clienteId)
      setNotificacoesCom(listaCom)

      const roteirosDaComNoAll = listaCom
        .filter((item) => normalizar(item.tipoEvento).includes('roteiro') || normalizar(item.titulo).includes('roteiro') || texto(item.destino).startsWith('/roteiros/'))
        .map((item) => ({ ...item, tipo: 'all' as const, texto: 'Toque para abrir o roteiro publicado.', emoji: '🧭' }))

      setNotificacoesAll(mesclarNotificacoes([roteirosDaComNoAll, notificacoesGerais]))
    } catch (error) {
      console.error('Erro ao carregar resumo da dashboard:', error)
      if (!silencioso) setMensagem(error instanceof Error ? error.message : 'Não foi possível atualizar os dados agora.')
    } finally {
      if (!silencioso) setAtualizando(false)
    }
  }

  function definirAbaNotificacoes(aba: 'all' | 'com') {
    setAbaNotificacoes(aba)
    try { localStorage.setItem('cliente_dashboard_notificacoes_aba', aba) } catch {}
  }

  function abrirDestino(destino?: string) {
    router.push(texto(destino) || '/cliente/dashboard')
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
          <button type="button" className="brandLogo" onClick={() => router.push('/cliente/dashboard')} aria-label="Dashboard do cliente">
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          </button>

          <button type="button" className="avatarMini" onClick={() => router.push('/cliente/perfil')} aria-label="Abrir perfil">
            {avatar ? <img src={avatar} alt={nome} /> : <span>{nome.charAt(0).toUpperCase()}</span>}
          </button>
        </div>
      </header>

      <section className="shell">
        <section className="hero">
          <div className="heroText">
            <div className="eyebrow">Dashboard do aventureiro</div>
            <h1>Olá, {nome.split(' ')[0] || 'aventureiro'}.</h1>
            <p>Acompanhe reservas, conquistas, roteiros publicados e movimentos da comunidade outdoor.</p>
          </div>

          <aside
            className="homeHotCard"
            role="button"
            tabIndex={0}
            onClick={() => router.push('/roteiros')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                router.push('/roteiros')
              }
            }}
            aria-label="Abrir página de roteiros"
          >
            {!roteiroAtivo ? (
              <div className="emptyHot">Assim que novos roteiros forem aprovados, eles aparecerão aqui.</div>
            ) : (
              <div
                className="homeHotVisual"
                style={{
                  '--hot-image': fotoRoteiro(roteiroAtivo)
                    ? `url("${fotoRoteiro(roteiroAtivo)}")`
                    : 'radial-gradient(circle at 80% 10%, rgba(190,242,100,0.24), transparent 34%), linear-gradient(135deg, #203c2e 0%, #5f7547 48%, #d7c6a1 100%)',
                } as CSSProperties}
              >
                <div className="hotTop">
                  <div className="hotBadge">Roteiro em destaque</div>
                  <div className="hotCounter">{String(activeHotTrail + 1).padStart(2, '0')} / {String(roteirosQuentes.length || 1).padStart(2, '0')}</div>
                </div>

                <div className="hotContent">
                  <h2>{tituloRoteiro(roteiroAtivo)}</h2>
                  <div className="hotMeta">
                    <div><strong>Local:</strong> {localRoteiro(roteiroAtivo)}</div>
                    <div><strong>Nível:</strong> {roteiroAtivo.dificuldade || 'Nível informado pelo guia'}</div>
                    <div><strong>Valor:</strong> {precoRoteiro(roteiroAtivo) > 0 ? formatarMoeda(precoRoteiro(roteiroAtivo)) : 'Consulte no app'}</div>
                  </div>

                  <div className="hotClickHint">Clique no card para ver todos os roteiros disponíveis.</div>
                </div>
              </div>
            )}
          </aside>
        </section>

        {mensagem && <div className="notice">{mensagem}</div>}

        <section className="statsGrid">
          <article><span>Km registrados</span><strong>{formatarKm(stats.totalKm)}</strong></article>
          <article><span>Trilhas</span><strong>{stats.totalTrilhas}</strong></article>
          <article><span>Confirmadas</span><strong>{stats.reservasConfirmadas}</strong></article>
          <article><span>Pendentes</span><strong>{stats.reservasPendentes}</strong></article>
          <article><span>Medalhas</span><strong>{stats.totalMedalhas}</strong></article>
          <article><span>Atualização</span><strong>{ultimaAtualizacao || 'Agora'}</strong></article>
        </section>

        <section className="mainGrid">
          <section className="panel notificationsPanel">
            <div className="panelHeader">
              <div>
                <h2>Notificações</h2>
                <p>ALL mostra a comunidade. COM mostra interações relacionadas a você e aos guias que você segue.</p>
              </div>
              <button type="button" className="smallButton" onClick={() => carregarResumo(user.id)} disabled={atualizando}>{atualizando ? 'Atualizando...' : 'Atualizar'}</button>
            </div>

            <div className="tabs">
              <button type="button" className={abaNotificacoes === 'all' ? 'active' : ''} onClick={() => definirAbaNotificacoes('all')}>ALL <span>{notificacoesAll.length}</span></button>
              <button type="button" className={abaNotificacoes === 'com' ? 'active' : ''} onClick={() => definirAbaNotificacoes('com')}>COM <span>{notificacoesCom.length}</span></button>
            </div>

            <div className="notificationsList">
              {notificacoesVisiveis.map((notificacao) => (
                <button type="button" key={notificacao.id} className={`notificationItem ${notificacao.id.startsWith('empty') ? 'emptyNotification' : ''}`} onClick={() => abrirDestino(notificacao.destino)}>
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

          <aside className="panel reservasPanel">
            <div className="panelHeader compact">
              <div>
                <h2>Minhas reservas</h2>
                <p>Acompanhe suas próximas experiências.</p>
              </div>
              <button type="button" className="smallButton" onClick={() => router.push('/cliente/minhas-reservas')}>Abrir</button>
            </div>

            {proximasReservas.length === 0 ? (
              <div className="emptyBox">Você ainda não tem reservas futuras.</div>
            ) : (
              <div className="reservationList">
                {proximasReservas.slice(0, 4).map((reserva) => (
                  <button type="button" key={reserva.id} onClick={() => router.push('/cliente/minhas-reservas')}>
                    {reserva.roteiro_foto || fotoRoteiro(reserva.roteiro) ? <img src={reserva.roteiro_foto || fotoRoteiro(reserva.roteiro)} alt={reserva.roteiro_titulo || tituloRoteiro(reserva.roteiro)} /> : <span>🎟️</span>}
                    <span><strong>{reserva.roteiro_titulo || tituloRoteiro(reserva.roteiro)}</strong><small>{formatarDataHora(reserva.data_trilha || reserva.data_roteiro || reserva.created_at)}</small></span>
                  </button>
                ))}
              </div>
            )}
          </aside>
        </section>
      </section>
    </main>
  )
}

const styles = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #f6f7f1; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  button { font: inherit; }
  .page, .loadingPage { min-height: 100vh; min-height: 100dvh; color: #172018; background: radial-gradient(circle at 10% 0%, rgba(132,204,22,0.16), transparent 28%), radial-gradient(circle at 90% 10%, rgba(251,146,60,0.14), transparent 28%), linear-gradient(180deg,#fffdf7 0%,#f3f5ea 48%,#eef2e5 100%); }
  .loadingPage { display: grid; place-items: center; padding: 20px; }
  .loadingCard { border-radius: 28px; background: rgba(255,255,255,0.88); border: 1px solid rgba(15,23,42,0.08); padding: 28px; box-shadow: 0 22px 60px rgba(15,23,42,0.12); color: #203c2e; font-weight: 950; }
  .topbar { position: sticky; top: 0; z-index: 60; background: rgba(255,253,247,0.90); border-bottom: 1px solid rgba(15,23,42,0.06); backdrop-filter: blur(18px); padding: 8px 14px; }
  .topbarInner { max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; }
  .brandLogo { grid-column: 2; justify-self: center; border: 0; background: transparent; padding: 0; cursor: pointer; display: flex; justify-content: center; }
  .brandLogo img { width: clamp(142px, 34vw, 238px); max-height: 58px; object-fit: contain; display: block; }
  .avatarMini { grid-column: 3; justify-self: end; width: 42px; height: 42px; border-radius: 999px; border: 1px solid rgba(15,23,42,0.08); background: rgba(255,255,255,0.88); box-shadow: 0 10px 22px rgba(15,23,42,0.06); cursor: pointer; padding: 0; overflow: hidden; }
  .avatarMini img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .avatarMini span { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #203c2e; color: #fffdf7; font-weight: 950; }
  .shell { max-width: 1180px; margin: 0 auto; padding: 22px 16px 54px; }
  .hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(310px, 420px); gap: 18px; align-items: stretch; margin-bottom: 16px; }
  .heroText { border-radius: 36px; padding: 30px; color: #fff; background: linear-gradient(135deg, rgba(23,32,24,0.82), rgba(23,32,24,0.46)), radial-gradient(circle at top right, rgba(190,242,100,0.30), transparent 34%), linear-gradient(135deg, #1f331f 0%, #647a49 46%, #d7c6a1 100%); box-shadow: 0 24px 60px rgba(23,32,24,0.18); }
  .eyebrow { display: inline-flex; width: fit-content; border-radius: 999px; border: 1px solid rgba(255,255,255,0.24); background: rgba(255,255,255,0.12); color: #f7fee7; padding: 8px 12px; font-size: 11px; font-weight: 950; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 12px; }
  .heroText h1 { margin: 0; font-size: clamp(44px, 6vw, 76px); line-height: 0.92; font-weight: 950; letter-spacing: -0.085em; }
  .heroText p { max-width: 760px; margin: 14px 0 0; color: rgba(255,255,255,0.82); line-height: 1.6; font-size: 14px; font-weight: 650; }
  .homeHotCard { border-radius: 34px; overflow: hidden; min-height: 360px; background: linear-gradient(135deg, #172018 0%, #253f2c 52%, #6f7f4f 100%); box-shadow: 0 24px 60px rgba(23,32,24,0.18); color: #fff; cursor: pointer; outline: none; transition: transform .18s ease, box-shadow .18s ease; }
  .homeHotCard:hover, .homeHotCard:focus-visible { transform: translateY(-2px); box-shadow: 0 30px 72px rgba(23,32,24,0.23); }
  .homeHotVisual { min-height: 360px; height: 100%; padding: 22px; display: flex; flex-direction: column; justify-content: space-between; background: linear-gradient(135deg, rgba(23,32,24,0.74), rgba(23,32,24,0.38)), var(--hot-image); background-size: cover; background-position: center; }
  .emptyHot { height: 100%; min-height: 320px; display: grid; place-items: center; padding: 20px; text-align: center; color: rgba(255,255,255,0.78); font-weight: 850; }
  .hotTop { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .hotBadge { width: fit-content; border-radius: 999px; padding: 8px 11px; background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.20); color: #f7fee7; font-size: 11px; font-weight: 950; letter-spacing: 0.10em; text-transform: uppercase; backdrop-filter: blur(12px); }
  .hotCounter { color: rgba(255,255,255,0.72); font-size: 12px; font-weight: 900; }
  .hotContent { display: grid; gap: 12px; }
  .hotContent h2 { margin: 0; color: #fff; font-size: 31px; line-height: 0.96; font-weight: 950; letter-spacing: -0.065em; }
  .hotMeta { display: grid; gap: 7px; color: rgba(255,255,255,0.82); font-size: 13px; line-height: 1.42; font-weight: 800; }
  .hotMeta strong { color: #fff; }
  .hotClickHint { width: fit-content; border-radius: 999px; padding: 10px 13px; background: rgba(190,242,100,0.92); color: #172018; font-size: 12px; line-height: 1.2; font-weight: 950; box-shadow: 0 14px 30px rgba(15,23,42,0.16); }
  .notice { border-radius: 18px; padding: 13px 15px; margin-bottom: 16px; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; font-size: 13px; font-weight: 850; }
  .statsGrid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; margin-bottom: 16px; }
  .statsGrid article, .panel { background: rgba(255,255,255,0.90); border: 1px solid rgba(15,23,42,0.06); box-shadow: 0 12px 34px rgba(15,23,42,0.06); }
  .statsGrid article { border-radius: 24px; padding: 16px; }
  .statsGrid span { display: block; color: #64748b; font-size: 10px; font-weight: 950; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 7px; }
  .statsGrid strong { color: #172018; font-size: 20px; line-height: 1; font-weight: 950; letter-spacing: -0.05em; }
  .mainGrid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start; }
  .panel { border-radius: 30px; padding: 18px; overflow: hidden; }
  .panelHeader { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 15px; flex-wrap: wrap; }
  .panelHeader h2 { margin: 0; color: #172018; font-size: 23px; line-height: 1; font-weight: 950; letter-spacing: -0.055em; }
  .panelHeader p { margin: 6px 0 0; color: #64748b; font-size: 12px; line-height: 1.45; font-weight: 750; max-width: 560px; }
  .smallButton { border: 0; border-radius: 999px; padding: 10px 13px; background: #eef2e5; color: #203c2e; cursor: pointer; font-size: 12px; font-weight: 950; }
  .tabs { display: flex; gap: 8px; padding: 5px; background: #eef2e5; border-radius: 999px; width: fit-content; margin-bottom: 14px; }
  .tabs button { border: 0; border-radius: 999px; padding: 9px 12px; background: transparent; color: #64748b; cursor: pointer; font-size: 12px; font-weight: 950; }
  .tabs button.active { background: #172018; color: #fffdf7; }
  .tabs span { min-width: 20px; height: 20px; border-radius: 999px; background: rgba(255,255,255,0.22); margin-left: 5px; padding: 1px 6px; }
  .notificationsList, .reservationList { display: grid; gap: 8px; }
  .notificationItem { width: 100%; border: 1px solid rgba(15,23,42,0.06); background: #fffdf7; border-radius: 20px; padding: 12px; display: grid; grid-template-columns: 42px minmax(0, 1fr); gap: 10px; align-items: start; cursor: pointer; text-align: left; }
  .notificationEmoji { width: 42px; height: 42px; border-radius: 16px; background: #eef2e5; display: flex; align-items: center; justify-content: center; font-size: 21px; }
  .notificationContent { display: grid; min-width: 0; }
  .notificationContent strong { color: #172018; font-size: 14px; font-weight: 950; line-height: 1.25; }
  .notificationContent small { color: #64748b; font-size: 12px; line-height: 1.45; font-weight: 700; margin-top: 3px; }
  .notificationContent em { color: #94a3b8; font-size: 10px; font-style: normal; font-weight: 850; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.06em; }
  .emptyBox { border: 1px dashed rgba(15,23,42,0.16); background: #fffdf7; border-radius: 20px; padding: 16px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.45; font-weight: 750; }
  .reservationList button { border: 1px solid rgba(15,23,42,0.06); background: #fffdf7; border-radius: 18px; padding: 8px; display: grid; grid-template-columns: 46px minmax(0, 1fr); gap: 10px; align-items: center; text-align: left; cursor: pointer; }
  .reservationList img, .reservationList > button > span:first-child { width: 46px; height: 46px; border-radius: 14px; object-fit: cover; background: #eef2e5; display: flex; align-items: center; justify-content: center; }
  .reservationList strong { display: block; color: #172018; font-size: 12px; line-height: 1.25; font-weight: 950; }
  .reservationList small { display: block; margin-top: 3px; color: #64748b; font-size: 11px; font-weight: 750; line-height: 1.35; }
  @media (max-width: 1040px) { .hero, .mainGrid { grid-template-columns: 1fr; } .statsGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  @media (max-width: 720px) { .topbar { padding: 7px 10px; } .topbarInner { grid-template-columns: 1fr auto; } .brandLogo { grid-column: 1; justify-self: start; } .brandLogo img { width: clamp(130px, 50vw, 205px); max-height: 50px; } .avatarMini { grid-column: 2; width: 36px; height: 36px; box-shadow: none; } .shell { padding: 12px 9px 40px; } .heroText, .homeHotCard, .panel { border-radius: 24px; } .heroText { padding: 20px; } .heroText h1 { font-size: 42px; } .homeHotVisual { min-height: 320px; } .statsGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .tabs { width: 100%; display: grid; grid-template-columns: 1fr 1fr; border-radius: 18px; } .tabs button { width: 100%; } }
`
