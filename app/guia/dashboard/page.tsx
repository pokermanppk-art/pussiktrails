'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type UsuarioLocal = {
  id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  guia_id?: string | null
  nome?: string | null
  email?: string | null
  tipo?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
}

type Roteiro = {
  id: string
  id_guia?: string | null
  guia_id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  titulo?: string | null
  nome?: string | null
  descricao?: string | null
  local?: string | null
  localizacao?: string | null
  dificuldade?: string | null
  status?: string | null
  ativo?: boolean | null
  preco?: number | string | null
  valor?: number | string | null
  vagas?: number | string | null
  vagas_total?: number | string | null
  limite_participantes?: number | string | null
  duracao?: string | null
  duracao_horas?: number | string | null
  km?: number | string | null
  distancia_km?: number | string | null
  data?: string | null
  data_trilha?: string | null
  data_roteiro?: string | null
  data_inicio?: string | null
  embarque_data_hora?: string | null
  foto_url?: string | null
  foto_capa?: string | null
  imagem_url?: string | null
  created_at?: string | null
  updated_at?: string | null
  [key: string]: unknown
}

type Reserva = {
  id: string
  cliente_id?: string | null
  roteiro_id?: string | null
  status?: string | null
  pagamento_status?: string | null
  quantidade_pessoas?: number | string | null
  valor_total?: number | string | null
  created_at?: string | null
  data_trilha?: string | null
  data_roteiro?: string | null
  cliente_nome?: string | null
  roteiro_titulo?: string | null
  roteiro?: Roteiro | null
  [key: string]: unknown
}

type Cliente = {
  id: string
  nome?: string | null
  email?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
}

type Avaliacao = {
  id: string
  cliente_id?: string | null
  guia_id?: string | null
  id_guia?: string | null
  roteiro_id?: string | null
  nota?: number | string | null
  nota_geral?: number | string | null
  comentario?: string | null
  observacao?: string | null
  created_at?: string | null
  cliente_nome?: string | null
  cliente_avatar?: string | null
  [key: string]: unknown
}

type Notificacao = {
  id: string
  titulo: string
  texto: string
  emoji: string
  tipo: 'geral' | 'com'
  destino?: string
  created_at?: string | null
  lida?: boolean
}

type Stats = {
  roteirosAtivos: number
  roteirosPendentes: number
  reservasConfirmadas: number
  reservasPendentes: number
  clientes: number
  receitaConfirmada: number
  receitaPendente: number
  mediaAvaliacoes: number
}

const statsInicial: Stats = {
  roteirosAtivos: 0,
  roteirosPendentes: 0,
  reservasConfirmadas: 0,
  reservasPendentes: 0,
  clientes: 0,
  receitaConfirmada: 0,
  receitaPendente: 0,
  mediaAvaliacoes: 0,
}

function extrairUsuarioId(usuario: UsuarioLocal | null): string {
  return String(
    usuario?.id ||
      usuario?.user_id ||
      usuario?.usuario_id ||
      usuario?.guia_id ||
      ''
  ).trim()
}

function textoSeguro(valor: unknown): string {
  if (typeof valor === 'string') return valor
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor)
  return ''
}

function numeroSeguro(valor: unknown, fallback = 0): number {
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : fallback
}

function normalizar(valor?: unknown): string {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function primeiroNome(nome?: string | null): string {
  const texto = String(nome || 'guia').trim()
  return texto ? texto.split(' ')[0] || 'guia' : 'guia'
}

function formatarMoeda(valor: unknown): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numeroSeguro(valor))
}

function formatarData(valor?: string | null): string {
  if (!valor) return 'Sem data'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return valor
  return data.toLocaleDateString('pt-BR')
}

function tempoRelativo(valor?: string | null): string {
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

function tituloRoteiro(roteiro?: Roteiro | null): string {
  return roteiro?.titulo || roteiro?.nome || 'Roteiro'
}

function fotoRoteiro(roteiro?: Roteiro | null): string {
  return roteiro?.foto_capa || roteiro?.foto_url || roteiro?.imagem_url || ''
}

function localRoteiro(roteiro?: Roteiro | null): string {
  return roteiro?.localizacao || roteiro?.local || 'Local a confirmar'
}

function precoRoteiro(roteiro?: Roteiro | null): number {
  return numeroSeguro(roteiro?.preco ?? roteiro?.valor ?? 0)
}

function dataRoteiro(roteiro?: Roteiro | null): string | null {
  return (
    roteiro?.data_trilha ||
    roteiro?.data_roteiro ||
    roteiro?.data_inicio ||
    roteiro?.embarque_data_hora ||
    roteiro?.data ||
    roteiro?.created_at ||
    null
  )
}

function guiaDoRoteiro(roteiro: Roteiro): string {
  return String(
    roteiro.id_guia || roteiro.guia_id || roteiro.user_id || roteiro.usuario_id || ''
  ).trim()
}

function roteiroAtivo(roteiro: Roteiro): boolean {
  if (roteiro.ativo === false) return false
  const status = normalizar(roteiro.status)
  return !['excluido', 'excluida', 'cancelado', 'cancelada', 'recusado', 'recusada'].includes(status)
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
    status === 'realizada'
  )
}

function reservaPendente(reserva: Reserva): boolean {
  const pagamento = normalizar(reserva.pagamento_status)
  const status = normalizar(reserva.status)

  return (
    status === 'pendente' ||
    status === 'aguardando' ||
    pagamento === 'pendente' ||
    pagamento === 'aguardando' ||
    pagamento === ''
  )
}

function notaAvaliacao(avaliacao: Avaliacao): number {
  return numeroSeguro(avaliacao.nota_geral ?? avaliacao.nota ?? 0)
}

function avatarCliente(cliente?: Cliente | null): string {
  return cliente?.avatar_url || cliente?.foto_url || cliente?.imagem_url || ''
}

function extrairMensagemErro(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return fallback
}

export default function GuiaDashboardPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [guiaId, setGuiaId] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [stats, setStats] = useState<Stats>(statsInicial)
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [notificacoesGerais, setNotificacoesGerais] = useState<Notificacao[]>([])
  const [notificacoesCom, setNotificacoesCom] = useState<Notificacao[]>([])
  const [abaNotificacao, setAbaNotificacao] = useState<'geral' | 'com'>('geral')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('')
  const [encerrandoGrupos, setEncerrandoGrupos] = useState(false)

  useEffect(() => {
    if (iniciouRef.current) return
    iniciouRef.current = true
    iniciar()
  }, [])

  async function iniciar() {
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

      const id = extrairUsuarioId(parsedUser)

      if (!id) {
        console.error('guiaId inválido no localStorage:', parsedUser)
        localStorage.removeItem('user')
        router.replace('/login')
        return
      }

      const usuarioNormalizado: UsuarioLocal = {
        ...parsedUser,
        id,
      }

      setUser(usuarioNormalizado)
      setGuiaId(id)
      await carregarDados(id)
    } catch (error) {
      console.error('Erro ao iniciar dashboard do guia:', error)
      setErro('Não foi possível carregar sua dashboard agora.')
    } finally {
      setCarregando(false)
    }
  }

  async function carregarDados(id: string) {
    const idLimpo = String(id || '').trim()

    if (!idLimpo) {
      setErro('Não foi possível identificar o guia logado. Faça login novamente.')
      return
    }

    const [roteirosDoGuia, avaliacoesDoGuia] = await Promise.all([
      carregarRoteiros(idLimpo),
      carregarAvaliacoes(idLimpo),
    ])

    const reservasDoGuia = await carregarReservas(roteirosDoGuia)

    setRoteiros(roteirosDoGuia)
    setReservas(reservasDoGuia)
    setAvaliacoes(avaliacoesDoGuia)
    setStats(calcularStats(roteirosDoGuia, reservasDoGuia, avaliacoesDoGuia))

    await Promise.all([
      carregarNotificacoesGerais(idLimpo, roteirosDoGuia, reservasDoGuia),
      carregarNotificacoesCom(idLimpo),
    ])

    setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
  }

  async function carregarRoteiros(id: string): Promise<Roteiro[]> {
    try {
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error

      return ((data || []) as Roteiro[])
        .filter((roteiro: Roteiro) => guiaDoRoteiro(roteiro) === id)
        .filter((roteiro: Roteiro) => roteiroAtivo(roteiro))
    } catch (error) {
      console.warn('Erro ao carregar roteiros do guia:', error)
      return []
    }
  }

  async function carregarReservas(roteirosDoGuia: Roteiro[]): Promise<Reserva[]> {
    const roteiroIds = roteirosDoGuia.map((roteiro: Roteiro) => roteiro.id).filter(Boolean)

    if (roteiroIds.length === 0) return []

    try {
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .in('roteiro_id', roteiroIds)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error

      const reservasBase = (data || []) as Reserva[]
      const clienteIds = Array.from(
        new Set(
          reservasBase
            .map((reserva: Reserva) => reserva.cliente_id)
            .filter((id): id is string => Boolean(id))
        )
      )

      let clientes: Cliente[] = []

      if (clienteIds.length > 0) {
        const { data: clientesData, error: clientesError } = await supabase
          .from('users')
          .select('id, nome, email, avatar_url, foto_url, imagem_url')
          .in('id', clienteIds)

        if (!clientesError && clientesData) {
          clientes = clientesData as Cliente[]
        }
      }

      return reservasBase.map((reserva: Reserva) => {
        const roteiro = roteirosDoGuia.find((item: Roteiro) => item.id === reserva.roteiro_id) || null
        const cliente = clientes.find((item: Cliente) => item.id === reserva.cliente_id) || null

        return {
          ...reserva,
          roteiro,
          roteiro_titulo: tituloRoteiro(roteiro),
          cliente_nome: cliente?.nome || cliente?.email || 'Cliente',
        }
      })
    } catch (error) {
      console.warn('Erro ao carregar reservas do guia:', error)
      return []
    }
  }

  async function carregarAvaliacoes(id: string): Promise<Avaliacao[]> {
    const idLimpo = String(id || '').trim()

    if (!idLimpo || idLimpo === 'undefined' || idLimpo === 'null') {
      console.warn('carregarAvaliacoes ignorada: guiaId inválido.', id)
      return []
    }

    const campos = ['guia_id', 'id_guia']
    let lista: Avaliacao[] = []

    for (const campo of campos) {
      const { data, error } = await supabase
        .from('avaliacoes')
        .select('*')
        .eq(campo, idLimpo)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && data) {
        lista = data as Avaliacao[]
        break
      }
    }

    const clienteIds = Array.from(
      new Set(
        lista
          .map((avaliacao: Avaliacao) => avaliacao.cliente_id)
          .filter((clienteId): clienteId is string => Boolean(clienteId))
      )
    )

    if (clienteIds.length === 0) return lista

    const { data: clientes } = await supabase
      .from('users')
      .select('id, nome, email, avatar_url, foto_url, imagem_url')
      .in('id', clienteIds)

    const clientesLista = (clientes || []) as Cliente[]

    return lista.map((avaliacao: Avaliacao) => {
      const cliente = clientesLista.find((item: Cliente) => item.id === avaliacao.cliente_id) || null

      return {
        ...avaliacao,
        cliente_nome: cliente?.nome || cliente?.email || 'Cliente',
        cliente_avatar: avatarCliente(cliente),
      }
    })
  }

  function calcularStats(
    roteirosDoGuia: Roteiro[],
    reservasDoGuia: Reserva[],
    avaliacoesDoGuia: Avaliacao[]
  ): Stats {
    const roteirosAtivos = roteirosDoGuia.filter((roteiro: Roteiro) => {
      const status = normalizar(roteiro.status)
      return status === 'ativo' || status === 'aprovado' || status === 'publicado' || status === ''
    }).length

    const roteirosPendentes = roteirosDoGuia.filter((roteiro: Roteiro) => {
      const status = normalizar(roteiro.status)
      return status === 'pendente' || status === 'analise' || status === 'em_analise'
    }).length

    const reservasConfirmadas = reservasDoGuia.filter((reserva: Reserva) => pagamentoConfirmado(reserva)).length
    const reservasPendentes = reservasDoGuia.filter((reserva: Reserva) => reservaPendente(reserva) && !pagamentoConfirmado(reserva)).length

    const clientes = new Set(
      reservasDoGuia
        .map((reserva: Reserva) => reserva.cliente_id)
        .filter(Boolean)
    ).size

    const receitaConfirmada = reservasDoGuia
      .filter((reserva: Reserva) => pagamentoConfirmado(reserva))
      .reduce((soma: number, reserva: Reserva) => soma + numeroSeguro(reserva.valor_total), 0)

    const receitaPendente = reservasDoGuia
      .filter((reserva: Reserva) => !pagamentoConfirmado(reserva))
      .reduce((soma: number, reserva: Reserva) => soma + numeroSeguro(reserva.valor_total), 0)

    const notas = avaliacoesDoGuia
      .map((avaliacao: Avaliacao) => notaAvaliacao(avaliacao))
      .filter((nota: number) => nota > 0)

    const mediaAvaliacoes = notas.length
      ? notas.reduce((soma: number, nota: number) => soma + nota, 0) / notas.length
      : 0

    return {
      roteirosAtivos,
      roteirosPendentes,
      reservasConfirmadas,
      reservasPendentes,
      clientes,
      receitaConfirmada,
      receitaPendente,
      mediaAvaliacoes,
    }
  }

  async function carregarNotificacoesCom(id: string) {
    try {
      const resposta = await fetch(`/api/notificacoes/com?usuarioId=${encodeURIComponent(id)}`, {
        cache: 'no-store',
      })

      const json = (await resposta.json().catch(() => null)) as {
        sucesso?: boolean
        notificacoes?: Array<Record<string, unknown>>
      } | null

      if (!resposta.ok || !json?.sucesso) {
        setNotificacoesCom([])
        return
      }

      const lista = (json.notificacoes || []).map((item: Record<string, unknown>) => ({
        id: textoSeguro(item.id) || `com-${Math.random().toString(36).slice(2)}`,
        titulo: textoSeguro(item.titulo) || 'Movimento na COM',
        texto: textoSeguro(item.mensagem) || 'Uma pessoa que você segue movimentou a comunidade.',
        emoji: emojiPorTipo(textoSeguro(item.tipo)),
        tipo: 'com' as const,
        destino: textoSeguro(item.destino_url) || '/guia/dashboard',
        created_at: textoSeguro(item.created_at) || null,
        lida: Boolean(item.lida),
      }))

      setNotificacoesCom(lista)
    } catch (error) {
      console.warn('Erro ao carregar COM do guia:', error)
      setNotificacoesCom([])
    }
  }

  function emojiPorTipo(tipo: string): string {
    const normalizado = normalizar(tipo)
    if (normalizado.includes('roteiro')) return '🧭'
    if (normalizado.includes('foto')) return '📷'
    if (normalizado.includes('curtida')) return '❤️'
    if (normalizado.includes('avaliacao')) return '⭐'
    if (normalizado.includes('grupo')) return '💬'
    return '🌿'
  }

  async function carregarNotificacoesGerais(
    id: string,
    roteirosDoGuia: Roteiro[],
    reservasDoGuia: Reserva[]
  ) {
    try {
      const { data, error } = await supabase
        .from('logs_atividades')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(40)

      if (!error && data && data.length > 0) {
        const lista = ((data || []) as Array<Record<string, unknown>>)
          .filter((log: Record<string, unknown>) => !logEhAdmin(log))
          .slice(0, 12)
          .map((log: Record<string, unknown>) => montarNotificacaoGeral(log, id))

        setNotificacoesGerais(lista)
        return
      }
    } catch {
      // fallback abaixo
    }

    const fallback: Notificacao[] = []

    reservasDoGuia.slice(0, 4).forEach((reserva: Reserva) => {
      fallback.push({
        id: `reserva-${reserva.id}`,
        titulo: pagamentoConfirmado(reserva) ? 'Reserva confirmada' : 'Reserva aguardando pagamento',
        texto: `${reserva.cliente_nome || 'Cliente'} · ${reserva.roteiro_titulo || 'Roteiro'}`,
        emoji: pagamentoConfirmado(reserva) ? '✅' : '🎒',
        tipo: 'geral',
        destino: '/guia/roteiros',
        created_at: reserva.created_at,
      })
    })

    roteirosDoGuia.slice(0, 3).forEach((roteiro: Roteiro) => {
      fallback.push({
        id: `roteiro-${roteiro.id}`,
        titulo: 'Roteiro no ar',
        texto: tituloRoteiro(roteiro),
        emoji: '🧭',
        tipo: 'geral',
        destino: '/guia/roteiros',
        created_at: roteiro.created_at,
      })
    })

    setNotificacoesGerais(fallback.slice(0, 10))
  }

  function logEhAdmin(log: Record<string, unknown>): boolean {
    const texto = normalizar(
      [
        log.tipo_usuario,
        log.tipo,
        log.acao,
        log.descricao,
        log.detalhes,
        log.origem,
        log.destino,
        log.rota,
      ].map((item: unknown) => textoSeguro(item)).join(' ')
    )

    return (
      texto.includes('admin') ||
      texto.includes('administrador') ||
      texto.includes('/admin') ||
      texto.includes('painel administrativo')
    )
  }

  function montarNotificacaoGeral(log: Record<string, unknown>, id: string): Notificacao {
    const acao = normalizar(textoSeguro(log.acao) || textoSeguro(log.tipo) || textoSeguro(log.descricao))
    const nome = textoSeguro(log.nome) || textoSeguro(log.nome_usuario) || textoSeguro(log.guia_nome) || 'Alguém'
    const isDoGuia = textoSeguro(log.usuario_id) === id || textoSeguro(log.user_id) === id || textoSeguro(log.guia_id) === id

    if (acao.includes('roteiro')) {
      return {
        id: textoSeguro(log.id) || `log-${Math.random().toString(36).slice(2)}`,
        titulo: isDoGuia ? 'Seu roteiro movimentou' : 'Novo roteiro publicado',
        texto: isDoGuia ? 'Um roteiro seu teve atualização ou movimento.' : `${nome} publicou ou atualizou um roteiro.`,
        emoji: '🧭',
        tipo: 'geral',
        destino: '/guia/roteiros',
        created_at: textoSeguro(log.created_at) || null,
      }
    }

    if (acao.includes('foto')) {
      return {
        id: textoSeguro(log.id) || `log-${Math.random().toString(36).slice(2)}`,
        titulo: 'Foto na comunidade',
        texto: `${nome} publicou uma foto de aventura.`,
        emoji: '📷',
        tipo: 'geral',
        destino: '/guia/dashboard',
        created_at: textoSeguro(log.created_at) || null,
      }
    }

    if (acao.includes('curtiu') || acao.includes('like')) {
      return {
        id: textoSeguro(log.id) || `log-${Math.random().toString(36).slice(2)}`,
        titulo: 'Foto curtida',
        texto: `${nome} curtiu uma foto da comunidade.`,
        emoji: '❤️',
        tipo: 'geral',
        destino: '/guia/dashboard',
        created_at: textoSeguro(log.created_at) || null,
      }
    }

    return {
      id: textoSeguro(log.id) || `log-${Math.random().toString(36).slice(2)}`,
      titulo: 'Movimento na comunidade',
      texto: textoSeguro(log.detalhes) || textoSeguro(log.descricao) || `${nome} movimentou a PrussikTrails.`,
      emoji: '🌿',
      tipo: 'geral',
      destino: '/guia/dashboard',
      created_at: textoSeguro(log.created_at) || null,
    }
  }

  async function atualizar() {
    if (!guiaId) return

    setAtualizando(true)
    setErro('')
    setMensagem('')

    try {
      await carregarDados(guiaId)
      setMensagem('Dashboard atualizada.')
    } catch (error) {
      setErro(extrairMensagemErro(error, 'Não foi possível atualizar agora.'))
    } finally {
      setAtualizando(false)
    }
  }

  async function encerrarGruposFinalizados() {
    setEncerrandoGrupos(true)
    setErro('')
    setMensagem('')

    try {
      const resposta = await fetch('/api/grupos/encerrar-finalizados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diasApos: 0 }),
      })

      const json = (await resposta.json().catch(() => null)) as {
        sucesso?: boolean
        encerrados?: number
        erro?: string
      } | null

      if (!resposta.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível verificar os grupos.')
      }

      const encerrados = Number(json.encerrados || 0)
      setMensagem(
        encerrados > 0
          ? `${encerrados} grupo(s) finalizado(s) foram encerrados.`
          : 'Nenhum grupo precisava ser encerrado agora.'
      )
    } catch (error) {
      setErro(extrairMensagemErro(error, 'Não foi possível encerrar grupos agora.'))
    } finally {
      setEncerrandoGrupos(false)
    }
  }

  function sair() {
    localStorage.removeItem('user')
    router.replace('/login')
  }

  const notificacoesAtivas = useMemo(() => {
    return abaNotificacao === 'com' ? notificacoesCom : notificacoesGerais
  }, [abaNotificacao, notificacoesCom, notificacoesGerais])

  const roteirosRecentes = useMemo(() => {
    return roteiros.slice(0, 4)
  }, [roteiros])

  const reservasRecentes = useMemo(() => {
    return reservas.slice(0, 4)
  }, [reservas])

  const avaliacoesRecentes = useMemo(() => {
    return avaliacoes.slice(0, 3)
  }, [avaliacoes])

  if (carregando || !user) {
    return (
      <main className="loadingPage">
        <style>{estilos}</style>
        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <span>Preparando a área do guia...</span>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{estilos}</style>

      <header className="topbar">
        <div className="topbarInner">
          <button
            type="button"
            className="brandHeader"
            onClick={() => router.push('/guia/dashboard')}
            aria-label="PrussikTrails"
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" className="brandLogo" />
            <span className="brandTextBlock">
              <span className="brandName">PrussikTrails</span>
              <span className="brandSubtitle">Dashboard do guia</span>
            </span>
          </button>

          <button
            type="button"
            className="profileButton"
            onClick={() => router.push('/guia/perfil')}
            aria-label="Abrir perfil do guia"
            title="Perfil"
          >
            👤
          </button>
        </div>
      </header>

      <section className="container">
        <section className="hero">
          <div className="heroTextBlock">
            <span className="eyebrow">Área do guia</span>
            <h1>
              Olá, {primeiroNome(user.nome)}.
              <br />
              Suas trilhas, clientes e grupos em um só lugar.
            </h1>
            <p>
              Acompanhe reservas, pagamentos, avaliações e movimentos da comunidade.
              {ultimaAtualizacao ? ` Atualizado às ${ultimaAtualizacao}.` : ''}
            </p>
          </div>

          <div className="heroCard">
            <span>Receita confirmada</span>
            <strong>{formatarMoeda(stats.receitaConfirmada)}</strong>
            <small>{stats.reservasConfirmadas} reserva(s) confirmada(s)</small>
          </div>
        </section>

        {(mensagem || erro) && (
          <div className={erro ? 'notice error' : 'notice'}>{erro || mensagem}</div>
        )}

        <section className="quickGrid">
          <button className="quickCard" type="button" onClick={() => router.push('/guia/roteiros')}>
            <span className="quickIcon">🧭</span>
            <strong>Meus roteiros</strong>
            <small>{stats.roteirosAtivos} ativo(s), {stats.roteirosPendentes} em análise.</small>
          </button>

          <button className="quickCard" type="button" onClick={() => router.push('/guia/roteiros/novo')}>
            <span className="quickIcon">＋</span>
            <strong>Novo roteiro</strong>
            <small>Criar uma nova experiência para clientes.</small>
          </button>

          <button className="quickCard" type="button" onClick={() => router.push('/guia/financeiro')}>
            <span className="quickIcon">💰</span>
            <strong>Financeiro</strong>
            <small>{formatarMoeda(stats.receitaPendente)} pendente.</small>
          </button>

          <button className="quickCard" type="button" onClick={() => router.push('/guia/grupos')}>
            <span className="quickIcon">💬</span>
            <strong>Grupos</strong>
            <small>Administrar grupos dos roteiros.</small>
          </button>
        </section>

        <section className="statsGrid">
          <article>
            <span>Clientes</span>
            <strong>{stats.clientes}</strong>
          </article>
          <article>
            <span>Reservas pendentes</span>
            <strong>{stats.reservasPendentes}</strong>
          </article>
          <article>
            <span>Avaliação média</span>
            <strong>{stats.mediaAvaliacoes > 0 ? stats.mediaAvaliacoes.toFixed(1) : '-'}</strong>
          </article>
          <article>
            <span>COM</span>
            <strong>{notificacoesCom.length}</strong>
          </article>
        </section>

        <section className="mainGrid">
          <div className="leftColumn">
            <section className="panel">
              <div className="panelHeader">
                <div>
                  <h2>Roteiros recentes</h2>
                  <p>Os últimos roteiros cadastrados ou movimentados.</p>
                </div>
                <button type="button" onClick={() => router.push('/guia/roteiros')}>Ver todos</button>
              </div>

              <div className="list">
                {roteirosRecentes.length === 0 ? (
                  <div className="empty">Você ainda não tem roteiros ativos.</div>
                ) : (
                  roteirosRecentes.map((roteiro: Roteiro) => {
                    const foto = fotoRoteiro(roteiro)
                    const status = normalizar(roteiro.status) || 'ativo'

                    return (
                      <button
                        type="button"
                        key={roteiro.id}
                        className="routeItem"
                        onClick={() => router.push('/guia/roteiros')}
                      >
                        <span className="thumb">
                          {foto ? <img src={foto} alt={tituloRoteiro(roteiro)} /> : 'RT'}
                        </span>
                        <span className="itemContent">
                          <strong>{tituloRoteiro(roteiro)}</strong>
                          <small>
                            {localRoteiro(roteiro)} · {formatarData(dataRoteiro(roteiro))}
                          </small>
                          <span className="itemFooter">
                            <em>{formatarMoeda(precoRoteiro(roteiro))}</em>
                            <b>{status}</b>
                          </span>
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </section>

            <section className="panel panelSpacing">
              <div className="panelHeader">
                <div>
                  <h2>Reservas recentes</h2>
                  <p>Clientes, pagamentos e próximos compromissos.</p>
                </div>
                <button type="button" onClick={() => router.push('/guia/financeiro')}>Financeiro</button>
              </div>

              <div className="list">
                {reservasRecentes.length === 0 ? (
                  <div className="empty">Nenhuma reserva recente por enquanto.</div>
                ) : (
                  reservasRecentes.map((reserva: Reserva) => (
                    <article className="reservationItem" key={reserva.id}>
                      <span className="avatarMini">{(reserva.cliente_nome || 'C').slice(0, 1).toUpperCase()}</span>
                      <span className="itemContent">
                        <strong>{reserva.cliente_nome || 'Cliente'}</strong>
                        <small>{reserva.roteiro_titulo || 'Roteiro'} · {formatarData(reserva.created_at)}</small>
                        <span className="itemFooter">
                          <em>{formatarMoeda(reserva.valor_total)}</em>
                          <b className={pagamentoConfirmado(reserva) ? 'ok' : 'warn'}>
                            {pagamentoConfirmado(reserva) ? 'Confirmada' : 'Pendente'}
                          </b>
                        </span>
                      </span>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>

          <aside className="rightColumn">
            <section className="panel">
              <div className="panelHeader compact">
                <div>
                  <h2>Notificações</h2>
                  <p>Geral e COM.</p>
                </div>
                <div className="tabs">
                  <button
                    type="button"
                    className={abaNotificacao === 'geral' ? 'active' : ''}
                    onClick={() => setAbaNotificacao('geral')}
                  >
                    Geral
                  </button>
                  <button
                    type="button"
                    className={abaNotificacao === 'com' ? 'active' : ''}
                    onClick={() => setAbaNotificacao('com')}
                  >
                    COM
                  </button>
                </div>
              </div>

              <div className="notificationList">
                {notificacoesAtivas.length === 0 ? (
                  <div className="empty">Nenhuma notificação por enquanto.</div>
                ) : (
                  notificacoesAtivas.map((notificacao: Notificacao) => (
                    <button
                      type="button"
                      key={notificacao.id}
                      className="notificationItem"
                      onClick={() => notificacao.destino && router.push(notificacao.destino)}
                    >
                      <span>{notificacao.emoji}</span>
                      <span>
                        <strong>{notificacao.titulo}</strong>
                        <small>{notificacao.texto}</small>
                        <em>{tempoRelativo(notificacao.created_at)}</em>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="panel panelSpacing">
              <div className="panelHeader compact">
                <div>
                  <h2>Avaliações</h2>
                  <p>Últimos retornos dos clientes.</p>
                </div>
              </div>

              <div className="reviewList">
                {avaliacoesRecentes.length === 0 ? (
                  <div className="empty">Nenhuma avaliação por enquanto.</div>
                ) : (
                  avaliacoesRecentes.map((avaliacao: Avaliacao) => (
                    <button
                      type="button"
                      key={avaliacao.id}
                      className="reviewItem"
                      onClick={() => {
                        if (avaliacao.cliente_id) router.push(`/cliente/publico/${avaliacao.cliente_id}`)
                      }}
                    >
                      <span className="reviewAvatar">
                        {avaliacao.cliente_avatar ? (
                          <img src={avaliacao.cliente_avatar} alt={avaliacao.cliente_nome || 'Cliente'} />
                        ) : (
                          (avaliacao.cliente_nome || 'C').slice(0, 1).toUpperCase()
                        )}
                      </span>
                      <span>
                        <strong>{avaliacao.cliente_nome || 'Cliente'}</strong>
                        <small>{'★'.repeat(Math.max(1, Math.round(notaAvaliacao(avaliacao))))}</small>
                        <em>{avaliacao.comentario || avaliacao.observacao || 'Cliente avaliou sua experiência.'}</em>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="panel panelSpacing actionsPanel">
              <button type="button" onClick={atualizar} disabled={atualizando}>
                {atualizando ? 'Atualizando...' : 'Atualizar dados'}
              </button>
              <button type="button" onClick={encerrarGruposFinalizados} disabled={encerrandoGrupos}>
                {encerrandoGrupos ? 'Verificando...' : 'Encerrar grupos finalizados'}
              </button>
              <button type="button" className="ghost" onClick={sair}>
                Sair
              </button>
            </section>
          </aside>
        </section>
      </section>
    </main>
  )
}

const estilos = `
  * { box-sizing: border-box; }

  body {
    margin: 0;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #f6f7f1;
  }

  .page {
    min-height: 100vh;
    min-height: 100dvh;
    color: #172018;
    background:
      radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.16), transparent 28%),
      radial-gradient(circle at 90% 10%, rgba(251, 146, 60, 0.14), transparent 28%),
      linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
  }

  .loadingPage {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(180deg, #fffdf7 0%, #eef2e5 100%);
    color: #475569;
  }

  .loadingCard {
    display: grid;
    justify-items: center;
    gap: 12px;
    padding: 28px;
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.88);
    border: 1px solid rgba(15, 23, 42, 0.06);
    box-shadow: 0 20px 50px rgba(23, 32, 24, 0.12);
    font-size: 14px;
    font-weight: 900;
  }

  .loadingCard img {
    width: 58px;
    height: 58px;
    object-fit: contain;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(255, 253, 247, 0.86);
    border-bottom: 1px solid rgba(15, 23, 42, 0.06);
    backdrop-filter: blur(18px);
    padding: 10px 16px;
  }

  .topbarInner {
    width: min(1180px, 100%);
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .brandHeader {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: 10px;
    border: 0;
    background: transparent;
    padding: 0;
    min-width: 0;
    cursor: pointer;
    text-align: left;
  }

  .brandLogo {
    width: 38px;
    height: 38px;
    object-fit: contain;
    flex: 0 0 auto;
  }

  .brandTextBlock {
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1;
  }

  .brandName {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: clamp(26px, 3.8vw, 44px);
    font-weight: 700;
    color: #203c2e;
    line-height: 0.92;
    letter-spacing: -0.055em;
    white-space: nowrap;
  }

  .brandSubtitle {
    margin-top: 5px;
    color: #7b8372;
    font-size: clamp(10px, 1.4vw, 14px);
    font-weight: 850;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .profileButton {
    width: 40px;
    height: 40px;
    border-radius: 999px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    background: rgba(255, 255, 255, 0.78);
    color: #172018;
    cursor: pointer;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  }

  .container {
    width: min(1180px, 100%);
    margin: 0 auto;
    padding: 20px 16px 52px;
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 18px;
    align-items: stretch;
    border-radius: 34px;
    overflow: hidden;
    padding: 26px;
    color: #fff;
    background:
      linear-gradient(135deg, rgba(23, 32, 24, 0.76), rgba(23, 32, 24, 0.35)),
      radial-gradient(circle at top right, rgba(132, 204, 22, 0.28), transparent 34%),
      linear-gradient(135deg, #203322 0%, #647a49 46%, #d7c6a1 100%);
    box-shadow: 0 24px 60px rgba(23, 32, 24, 0.16);
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

  .hero h1 {
    margin: 0;
    max-width: 720px;
    font-size: clamp(36px, 5vw, 62px);
    line-height: 0.96;
    font-weight: 950;
    letter-spacing: -0.07em;
  }

  .hero p {
    max-width: 660px;
    color: rgba(255, 255, 255, 0.80);
    line-height: 1.55;
    margin: 14px 0 0;
    font-size: 14px;
  }

  .heroCard {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    border-radius: 26px;
    padding: 18px;
    background: rgba(255, 255, 255, 0.14);
    border: 1px solid rgba(255, 255, 255, 0.20);
    backdrop-filter: blur(16px);
  }

  .heroCard span {
    color: rgba(255, 255, 255, 0.74);
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.10em;
    text-transform: uppercase;
  }

  .heroCard strong {
    display: block;
    margin-top: 8px;
    font-size: 30px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.06em;
  }

  .heroCard small {
    margin-top: 8px;
    color: rgba(255, 255, 255, 0.76);
    font-weight: 750;
  }

  .notice {
    margin-top: 14px;
    border-radius: 18px;
    padding: 13px 15px;
    background: #ecfdf5;
    color: #166534;
    border: 1px solid #bbf7d0;
    font-size: 13px;
    font-weight: 850;
  }

  .notice.error {
    background: #fef2f2;
    color: #991b1b;
    border-color: #fecaca;
  }

  .quickGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-top: 16px;
  }

  .quickCard,
  .statsGrid article,
  .panel {
    border: 1px solid rgba(15, 23, 42, 0.06);
    background: rgba(255, 255, 255, 0.88);
    box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
  }

  .quickCard {
    min-height: 132px;
    border-radius: 26px;
    padding: 16px;
    text-align: left;
    cursor: pointer;
    transition: 0.2s ease;
  }

  .quickCard:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.10);
  }

  .quickIcon {
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 18px;
    background: #f0fdf4;
    font-size: 19px;
    margin-bottom: 12px;
  }

  .quickCard strong {
    display: block;
    color: #172018;
    font-size: 15px;
    line-height: 1.2;
    font-weight: 950;
  }

  .quickCard small {
    display: block;
    margin-top: 5px;
    color: #64748b;
    font-size: 12px;
    line-height: 1.45;
    font-weight: 750;
  }

  .statsGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-top: 16px;
  }

  .statsGrid article {
    border-radius: 22px;
    padding: 15px;
  }

  .statsGrid span {
    display: block;
    color: #64748b;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .statsGrid strong {
    display: block;
    margin-top: 8px;
    color: #172018;
    font-size: 26px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.06em;
  }

  .mainGrid {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(340px, 0.9fr);
    gap: 16px;
    margin-top: 16px;
  }

  .panel {
    border-radius: 30px;
    overflow: hidden;
  }

  .panelSpacing {
    margin-top: 16px;
  }

  .panelHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 18px 20px;
    border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  }

  .panelHeader.compact {
    align-items: flex-start;
  }

  .panelHeader h2 {
    margin: 0;
    color: #172018;
    font-size: 18px;
    line-height: 1.1;
    font-weight: 950;
    letter-spacing: -0.04em;
  }

  .panelHeader p {
    margin: 4px 0 0;
    color: #64748b;
    font-size: 12px;
    font-weight: 750;
  }

  .panelHeader button,
  .actionsPanel button {
    border: 0;
    border-radius: 999px;
    background: #172018;
    color: #fff;
    padding: 10px 14px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
  }

  .panelHeader button:hover,
  .actionsPanel button:hover {
    filter: brightness(1.06);
  }

  .panelHeader button:disabled,
  .actionsPanel button:disabled {
    opacity: 0.62;
    cursor: not-allowed;
  }

  .list,
  .notificationList,
  .reviewList {
    display: grid;
    gap: 11px;
    padding: 16px;
  }

  .routeItem,
  .reservationItem,
  .notificationItem,
  .reviewItem {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr);
    gap: 13px;
    align-items: center;
    width: 100%;
    border: 1px solid rgba(15, 23, 42, 0.06);
    border-radius: 24px;
    background: #fffdf7;
    padding: 12px;
    text-align: left;
    color: inherit;
  }

  .routeItem,
  .notificationItem,
  .reviewItem {
    cursor: pointer;
    transition: 0.2s ease;
  }

  .routeItem:hover,
  .notificationItem:hover,
  .reviewItem:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
  }

  .thumb {
    width: 76px;
    height: 76px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 22px;
    background: #e8eadf;
    color: #64748b;
    font-weight: 950;
    overflow: hidden;
  }

  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .avatarMini,
  .reviewAvatar {
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: #f0fdf4;
    color: #166534;
    font-weight: 950;
    overflow: hidden;
    justify-self: center;
  }

  .reviewAvatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .itemContent {
    display: block;
    min-width: 0;
  }

  .itemContent strong,
  .notificationItem strong,
  .reviewItem strong {
    display: block;
    color: #172018;
    font-size: 14px;
    font-weight: 950;
    line-height: 1.3;
  }

  .itemContent small,
  .notificationItem small,
  .reviewItem small {
    display: block;
    margin-top: 4px;
    color: #64748b;
    font-size: 12px;
    line-height: 1.4;
    font-weight: 750;
  }

  .itemFooter {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 9px;
  }

  .itemFooter em {
    color: #16a34a;
    font-style: normal;
    font-size: 13px;
    font-weight: 950;
  }

  .itemFooter b {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    padding: 6px 9px;
    background: #eef2e5;
    color: #475569;
    font-size: 10px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .itemFooter b.ok {
    background: #dcfce7;
    color: #166534;
  }

  .itemFooter b.warn {
    background: #fef3c7;
    color: #92400e;
  }

  .tabs {
    display: flex;
    gap: 4px;
    padding: 4px;
    border-radius: 999px;
    background: #eef2e5;
  }

  .tabs button {
    border: 0;
    border-radius: 999px;
    padding: 8px 11px;
    background: transparent;
    color: #64748b;
    font-size: 11px;
    font-weight: 950;
    cursor: pointer;
  }

  .tabs button.active {
    background: #172018;
    color: #fff;
  }

  .notificationItem {
    grid-template-columns: 42px minmax(0, 1fr);
  }

  .notificationItem > span:first-child {
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 17px;
    background: #f0fdf4;
    font-size: 19px;
  }

  .notificationItem em,
  .reviewItem em {
    display: block;
    margin-top: 5px;
    color: #94a3b8;
    font-size: 11px;
    font-style: normal;
    font-weight: 800;
    line-height: 1.35;
  }

  .reviewItem {
    grid-template-columns: 52px minmax(0, 1fr);
  }

  .actionsPanel {
    display: grid;
    gap: 10px;
    padding: 16px;
  }

  .actionsPanel button {
    width: 100%;
    min-height: 42px;
  }

  .actionsPanel button.ghost {
    background: rgba(255, 255, 255, 0.72);
    color: #991b1b;
    border: 1px solid rgba(153, 27, 27, 0.16);
  }

  .empty {
    padding: 22px;
    border-radius: 20px;
    border: 1px dashed #cbd5e1;
    background: #fffdf7;
    color: #64748b;
    text-align: center;
    font-size: 13px;
    font-weight: 750;
  }

  @media (max-width: 1040px) {
    .quickGrid,
    .statsGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .mainGrid,
    .hero {
      grid-template-columns: 1fr;
    }

    .heroCard {
      min-height: 130px;
    }
  }

  @media (max-width: 640px) {
    .topbar {
      padding: 8px 12px;
    }

    .brandLogo {
      width: 30px;
      height: 30px;
    }

    .brandName {
      font-size: 25px;
      line-height: 0.9;
    }

    .brandSubtitle {
      margin-top: 4px;
      font-size: 9px;
      letter-spacing: 0.11em;
    }

    .profileButton {
      width: 36px;
      height: 36px;
    }

    .container {
      padding: 14px 12px 40px;
    }

    .hero {
      border-radius: 26px;
      padding: 20px;
    }

    .hero h1 {
      font-size: 34px;
      letter-spacing: -0.065em;
    }

    .hero p {
      font-size: 13px;
    }

    .quickGrid,
    .statsGrid {
      grid-template-columns: 1fr;
    }

    .quickCard {
      min-height: auto;
    }

    .panel {
      border-radius: 24px;
    }

    .panelHeader {
      padding: 16px;
    }

    .routeItem,
    .reservationItem {
      grid-template-columns: 64px minmax(0, 1fr);
    }

    .thumb {
      width: 64px;
      height: 64px;
      border-radius: 20px;
    }

    .itemFooter {
      align-items: flex-start;
      flex-direction: column;
      gap: 6px;
    }

    .panelHeader.compact {
      flex-direction: column;
    }
  }
`
