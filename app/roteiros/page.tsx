'use client'

import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type AnyRecord = Record<string, any>

type UsuarioLocal = {
  id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  cliente_id?: string | null
  guia_id?: string | null
  nome?: string | null
  name?: string | null
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
  descricao?: string | null
  preco?: number | string | null
  valor?: number | string | null
  valor_total?: number | string | null
  status?: string | null
  ativo?: boolean | null
  excluido_admin?: boolean | null
  id_guia?: string | null
  guia_id?: string | null
  id_user?: string | null
  user_id?: string | null
  usuario_id?: string | null
  criador_id?: string | null
  created_by?: string | null
  local?: string | null
  localizacao?: string | null
  local_encontro?: string | null
  ponto_encontro?: string | null
  cidade?: string | null
  estado?: string | null
  data_roteiro?: string | null
  data_saida?: string | null
  data?: string | null
  data_trilha?: string | null
  proxima_data?: string | null
  embarque_data?: string | null
  embarque_data_hora?: string | null
  hora_roteiro?: string | null
  hora_saida?: string | null
  hora?: string | null
  dificuldade?: string | null
  duracao_horas?: number | string | null
  duracao?: number | string | null
  km?: number | string | null
  distancia_km?: number | string | null
  limite_pessoas?: number | string | null
  capacidade?: number | string | null
  max_pessoas?: number | string | null
  recorrencia?: string | null
  frequencia?: string | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  imagem?: string | null
  created_at?: string | null
  updated_at?: string | null
  guia_nome?: string | null
  nome_guia?: string | null
  guia_name?: string | null
  guia_email?: string | null
  nome_agencia?: string | null
  agencia_nome?: string | null
  empresa_nome?: string | null
  nome_empresa?: string | null
  nome_fantasia?: string | null
  razao_social?: string | null
  hot_score?: number
  hot_reservas?: number
  hot_confirmadas?: number
}

type ReservaCriada = {
  id: string
}

const USER_SELECT_BASE = [
  'id',
  'nome',
  'name',
  'email',
  'tipo',
  'avatar_url',
  'foto_url',
  'imagem_url',
  'nome_agencia',
  'agencia_nome',
  'empresa',
  'empresa_nome',
  'nome_empresa',
  'nome_fantasia',
  'razao_social'
]

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

function extrairUsuarioId(usuario?: UsuarioLocal | null) {
  return texto(
    usuario?.id ||
      usuario?.user_id ||
      usuario?.usuario_id ||
      usuario?.cliente_id ||
      usuario?.guia_id
  )
}

function erroColunaInexistente(error: AnyRecord) {
  const mensagem = String(
    error?.message ||
      error?.details ||
      error?.hint ||
      ''
  ).toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    mensagem.includes('column') ||
    mensagem.includes('schema cache') ||
    mensagem.includes('does not exist') ||
    mensagem.includes('could not find')
  )
}

function extrairColunaInexistente(error: AnyRecord) {
  const textoErro = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')

  const matchUsers = textoErro.match(/users\.([a-zA-Z0-9_]+)/)
  if (matchUsers?.[1]) return matchUsers[1]

  const matchColumn = textoErro.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i)
  if (matchColumn?.[1]) return matchColumn[1]

  const matchAspas = textoErro.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  return ''
}

function nomeUsuario(usuario?: UsuarioLocal | null) {
  return texto(usuario?.nome || usuario?.name || usuario?.email) || 'Perfil'
}

function primeiroNome(valor?: string | null) {
  const nome = texto(valor)
  if (!nome) return 'Perfil'
  return nome.split(' ')[0] || 'Perfil'
}

function avatarUsuario(usuario?: UsuarioLocal | null) {
  return texto(usuario?.avatar_url || usuario?.foto_url || usuario?.imagem_url)
}

function inicialUsuario(usuario?: UsuarioLocal | null) {
  return nomeUsuario(usuario).slice(0, 1).toUpperCase() || 'P'
}

function rotaPainelUsuario(usuario?: UsuarioLocal | null) {
  const tipo = normalizar(usuario?.tipo)
  if (tipo === 'admin') return '/admin/dashboard'
  if (tipo === 'guia') return '/guia/dashboard'
  if (tipo === 'cliente') return '/cliente/dashboard'
  return '/login'
}

function rotaPerfilUsuario(usuario?: UsuarioLocal | null) {
  const tipo = normalizar(usuario?.tipo)
  if (tipo === 'admin') return '/admin/dashboard'
  if (tipo === 'guia') return '/guia/perfil'
  if (tipo === 'cliente') return '/cliente/perfil'
  return '/login'
}

function tituloRoteiro(roteiro: Roteiro) {
  return texto(roteiro.titulo || roteiro.nome) || 'Roteiro sem título'
}

function precoRoteiro(roteiro: Roteiro) {
  return Number(roteiro.preco ?? roteiro.valor ?? roteiro.valor_total ?? 0) || 0
}

function guiaIdRoteiro(roteiro: Roteiro) {
  return texto(
    roteiro.id_guia ||
      roteiro.guia_id ||
      roteiro.id_user ||
      roteiro.user_id ||
      roteiro.usuario_id ||
      roteiro.criador_id ||
      roteiro.created_by
  )
}

function nomeGuiaDireto(roteiro: Roteiro) {
  return texto(
    roteiro.nome_agencia ||
      roteiro.agencia_nome ||
      roteiro.empresa_nome ||
      roteiro.nome_empresa ||
      roteiro.nome_fantasia ||
      roteiro.razao_social ||
      roteiro.guia_nome ||
      roteiro.nome_guia ||
      roteiro.guia_name ||
      roteiro.guia_email
  )
}

function nomePublicoUsuario(usuario: AnyRecord) {
  return texto(
    usuario.nome_agencia ||
      usuario.agencia_nome ||
      usuario.empresa_nome ||
      usuario.nome_empresa ||
      usuario.nome_fantasia ||
      usuario.razao_social ||
      usuario.empresa ||
      usuario.nome ||
      usuario.name ||
      usuario.email
  )
}

function localRoteiro(roteiro: Roteiro) {
  const local = texto(
    roteiro.local ||
      roteiro.localizacao ||
      roteiro.local_encontro ||
      roteiro.ponto_encontro
  )

  if (local) return local

  const cidadeEstado = [roteiro.cidade, roteiro.estado]
    .map((parte) => texto(parte))
    .filter(Boolean)
    .join(' / ')

  return cidadeEstado || 'Local a confirmar'
}

function dataRoteiro(roteiro: Roteiro) {
  return (
    roteiro.proxima_data ||
    roteiro.embarque_data_hora ||
    roteiro.embarque_data ||
    roteiro.data_trilha ||
    roteiro.data_roteiro ||
    roteiro.data_saida ||
    roteiro.data ||
    null
  )
}

function horaRoteiro(roteiro: Roteiro) {
  return texto(roteiro.hora_roteiro || roteiro.hora_saida || roteiro.hora)
}

function imagemRoteiro(roteiro: Roteiro) {
  return texto(
    roteiro.foto_capa ||
      roteiro.foto_url ||
      roteiro.imagem_url ||
      roteiro.imagem
  )
}

function kmRoteiro(roteiro: Roteiro) {
  return Number(roteiro.km || roteiro.distancia_km || 0) || 0
}

function limitePessoas(roteiro: Roteiro) {
  const limite = roteiro.limite_pessoas ?? roteiro.capacidade ?? roteiro.max_pessoas ?? null
  if (limite === null || limite === undefined || limite === '') return 12
  const numero = Number(limite)
  if (!Number.isFinite(numero) || numero <= 0) return 12
  return Math.min(numero, 20)
}

function recorrenciaRoteiro(roteiro: Roteiro) {
  return texto(roteiro.recorrencia || roteiro.frequencia) || 'Experiência única'
}

function formatarMoeda(valor: unknown) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

function formatarData(valor?: string | null) {
  if (!valor) return 'Data a combinar'
  const textoData = String(valor)
  const normalizada = textoData.length <= 10 ? `${textoData.slice(0, 10)}T12:00:00` : textoData
  const data = new Date(normalizada)
  if (Number.isNaN(data.getTime())) return 'Data a combinar'

  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short'
  })
}

function statusPublicavel(roteiro: Roteiro) {
  const status = normalizar(roteiro.status)

  if (roteiro.excluido_admin === true) return false
  if (roteiro.ativo === false) return false

  return ![
    'excluido_admin',
    'excluido',
    'reprovado',
    'cancelado',
    'cancelada',
    'pausado',
    'pausada',
    'rascunho',
    'arquivado',
    'arquivada'
  ].includes(status)
}

function pagamentoConfirmado(reserva: AnyRecord) {
  const pagamento = normalizar(
    reserva.pagamento_status ||
      reserva.status_pagamento ||
      reserva.payment_status
  )
  const status = normalizar(reserva.status)

  return (
    pagamento === 'pago' ||
    pagamento === 'paga' ||
    pagamento === 'confirmado' ||
    pagamento === 'confirmada' ||
    pagamento === 'aprovado' ||
    pagamento === 'aprovada' ||
    pagamento === 'paid' ||
    pagamento === 'approved' ||
    Boolean(reserva.pagamento_confirmado_em) ||
    status === 'confirmada' ||
    status === 'realizada'
  )
}

function reservaCancelada(reserva: AnyRecord) {
  return normalizar(reserva.status) === 'cancelada'
}

export default function RoteirosPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [reservandoId, setReservandoId] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroDificuldade, setFiltroDificuldade] = useState('todos')
  const [ordenacao, setOrdenacao] = useState<
    'quentes' | 'recentes' | 'menor_preco' | 'maior_preco'
  >('quentes')
  const [roteiroSelecionado, setRoteiroSelecionado] = useState<Roteiro | null>(null)
  const [quantidadePessoas, setQuantidadePessoas] = useState(1)

  useEffect(() => {
    if (iniciouRef.current) return
    iniciouRef.current = true
    iniciar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function iniciar() {
    setCarregando(true)

    try {
      const userData = localStorage.getItem('user')

      if (userData) {
        try {
          setUser(JSON.parse(userData))
        } catch {
          localStorage.removeItem('user')
        }
      }

      await carregarRoteiros()
    } catch (error) {
      console.error('Erro ao iniciar página de roteiros:', error)
      setMensagem('Não foi possível carregar os roteiros agora.')
    } finally {
      setCarregando(false)
    }
  }

  async function buscarGuiasPorIds(ids: string[]) {
    const idsValidos = Array.from(new Set(ids.map((item) => texto(item)).filter(Boolean)))

    if (idsValidos.length === 0) return new Map<string, string>()

    let campos = [...USER_SELECT_BASE]

    for (let tentativa = 0; tentativa < 14; tentativa++) {
      const { data, error } = await supabase
        .from('users')
        .select(campos.join(', '))
        .in('id', idsValidos)

      if (!error) {
        const mapa = new Map<string, string>()
        const usuarios: AnyRecord[] = Array.isArray(data) ? (data as AnyRecord[]) : []

        usuarios.forEach((usuario) => {
          const id = texto(usuario.id)
          const nome = nomePublicoUsuario(usuario)

          if (id && nome) mapa.set(id, nome)
        })

        return mapa
      }

      if (!erroColunaInexistente(error as AnyRecord)) {
        console.warn('[roteiros] Não foi possível buscar guias:', error)
        return new Map<string, string>()
      }

      const coluna = extrairColunaInexistente(error as AnyRecord)

      if (!coluna) return new Map<string, string>()

      campos = campos.filter((campo) => campo !== coluna)

      if (campos.length <= 2) return new Map<string, string>()
    }

    return new Map<string, string>()
  }

  async function carregarRoteiros() {
    setMensagem('')

    try {
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar roteiros:', error)
        setRoteiros([])
        setMensagem('Erro ao buscar roteiros.')
        return
      }

      const roteirosBase = ((data || []) as Roteiro[]).filter(statusPublicavel)

      if (roteirosBase.length === 0) {
        setRoteiros([])
        return
      }

      const guiaIds = roteirosBase
        .map((roteiro) => guiaIdRoteiro(roteiro))
        .filter(Boolean)

      const mapaGuias = await buscarGuiasPorIds(guiaIds)

      const roteiroIds = roteirosBase.map((roteiro) => roteiro.id)
      let reservas: AnyRecord[] = []

      if (roteiroIds.length > 0) {
        const { data: reservasData, error: reservasError } = await supabase
          .from('reservas')
          .select('id, roteiro_id, status, pagamento_status, status_pagamento, pagamento_confirmado_em, created_at')
          .in('roteiro_id', roteiroIds)

        if (!reservasError) {
          reservas = (reservasData || []) as AnyRecord[]
        }
      }

      const agora = Date.now()
      const trintaDias = 1000 * 60 * 60 * 24 * 30
      const mapaHot = new Map<string, { score: number; total: number; confirmadas: number }>()

      reservas.forEach((reserva) => {
        const roteiroId = texto(reserva.roteiro_id)
        if (!roteiroId) return
        if (reservaCancelada(reserva)) return

        const atual = mapaHot.get(roteiroId) || { score: 0, total: 0, confirmadas: 0 }
        atual.total += 1

        if (pagamentoConfirmado(reserva)) {
          atual.score += 8
          atual.confirmadas += 1
        } else {
          atual.score += 3
        }

        const dataReserva = new Date(reserva.created_at || '').getTime()

        if (!Number.isNaN(dataReserva)) {
          const idade = agora - dataReserva
          if (idade <= trintaDias) atual.score += 4
          if (idade <= trintaDias / 2) atual.score += 2
        }

        mapaHot.set(roteiroId, atual)
      })

      const lista = roteirosBase.map((roteiro) => {
        const guiaId = guiaIdRoteiro(roteiro)
        const hot = mapaHot.get(roteiro.id) || { score: 0, total: 0, confirmadas: 0 }
        const nomeGuia = nomeGuiaDireto(roteiro) || texto(mapaGuias.get(guiaId)) || 'Guia/Agência PrussikTrails'

        return {
          ...roteiro,
          guia_nome: nomeGuia,
          hot_score: hot.score,
          hot_reservas: hot.total,
          hot_confirmadas: hot.confirmadas
        }
      })

      setRoteiros(lista)
    } catch (error) {
      console.error('Erro inesperado ao carregar roteiros:', error)
      setRoteiros([])
      setMensagem('Erro inesperado ao carregar roteiros.')
    }
  }

  function abrirDetalhesRoteiro(roteiro: Roteiro) {
    if (!roteiro?.id) return
    router.push(`/roteiros/${roteiro.id}`)
  }

  function abrirReserva(roteiro: Roteiro) {
    if (!roteiro?.id) return

    const userId = extrairUsuarioId(user)

    if (!userId) {
      localStorage.setItem('redirectAfterLogin', `/roteiros/${roteiro.id}`)
      router.push('/login')
      return
    }

    if (normalizar(user?.tipo) !== 'cliente') {
      setMensagem('Entre como cliente para reservar um roteiro.')
      return
    }

    setQuantidadePessoas(1)
    setRoteiroSelecionado(roteiro)
  }

  async function confirmarReserva() {
    if (!roteiroSelecionado) return

    const userId = extrairUsuarioId(user)

    if (!userId) {
      localStorage.setItem('redirectAfterLogin', `/roteiros/${roteiroSelecionado.id}`)
      router.push('/login')
      return
    }

    setReservandoId(roteiroSelecionado.id)
    setMensagem('')

    try {
      const quantidade = Math.max(1, Number(quantidadePessoas || 1))
      const valorUnitario = precoRoteiro(roteiroSelecionado)
      const valorTotal = valorUnitario * quantidade

      const response = await fetch('/api/reservas/criar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clienteId: userId,
          roteiroId: roteiroSelecionado.id,
          dataTrilha: String(dataRoteiro(roteiroSelecionado) || '').slice(0, 10) || null,
          quantidadePessoas: quantidade,
          valorUnitario,
          valorTotal,
          origem: 'roteiros'
        })
      })

      const respostaTexto = await response.text()
      let data: AnyRecord | null = null

      try {
        data = respostaTexto ? JSON.parse(respostaTexto) : null
      } catch {
        data = {
          sucesso: false,
          erro: respostaTexto || 'Resposta não JSON da API.',
          raw: respostaTexto
        }
      }

      if (!response.ok || data?.sucesso === false) {
        console.error('Erro ao criar reserva pela API:', {
          status: response.status,
          resposta: data
        })

        setMensagem(
          data?.erro ||
            data?.message ||
            'Não foi possível criar a reserva agora. Confira os dados e tente novamente.'
        )
        return
      }

      const reserva = (data?.reserva || data) as ReservaCriada | null

      if (!reserva?.id) {
        setMensagem('Reserva criada, mas não foi possível localizar o pagamento.')
        router.push('/cliente/minhas-reservas')
        return
      }

      setRoteiroSelecionado(null)
      router.push(`/cliente/pagamento/${reserva.id}`)
    } catch (error) {
      console.error('Erro inesperado ao reservar:', error)
      setMensagem('Erro inesperado ao reservar roteiro.')
    } finally {
      setReservandoId('')
    }
  }

  const dificuldadesDisponiveis = useMemo(() => {
    const set = new Set<string>()

    roteiros.forEach((roteiro) => {
      const dificuldade = texto(roteiro.dificuldade)
      if (dificuldade) set.add(dificuldade)
    })

    return Array.from(set)
  }, [roteiros])

  const roteirosFiltrados = useMemo(() => {
    const termo = normalizar(busca)

    const filtrados = roteiros.filter((roteiro) => {
      const conteudo = normalizar(
        [
          tituloRoteiro(roteiro),
          roteiro.descricao,
          roteiro.guia_nome,
          localRoteiro(roteiro),
          roteiro.dificuldade,
          recorrenciaRoteiro(roteiro)
        ].join(' ')
      )

      const passaBusca = termo ? conteudo.includes(termo) : true
      const passaDificuldade =
        filtroDificuldade === 'todos'
          ? true
          : normalizar(roteiro.dificuldade) === normalizar(filtroDificuldade)

      return passaBusca && passaDificuldade
    })

    return filtrados.sort((a, b) => {
      if (ordenacao === 'menor_preco') return precoRoteiro(a) - precoRoteiro(b)
      if (ordenacao === 'maior_preco') return precoRoteiro(b) - precoRoteiro(a)

      if (ordenacao === 'recentes') {
        const dataA = new Date(a.created_at || '').getTime()
        const dataB = new Date(b.created_at || '').getTime()
        return (Number.isNaN(dataB) ? 0 : dataB) - (Number.isNaN(dataA) ? 0 : dataA)
      }

      if (Number(b.hot_score || 0) !== Number(a.hot_score || 0)) {
        return Number(b.hot_score || 0) - Number(a.hot_score || 0)
      }

      const dataA = new Date(a.created_at || '').getTime()
      const dataB = new Date(b.created_at || '').getTime()
      return (Number.isNaN(dataB) ? 0 : dataB) - (Number.isNaN(dataA) ? 0 : dataA)
    })
  }, [roteiros, busca, filtroDificuldade, ordenacao])

  function hotLabel(roteiro: Roteiro) {
    const total = Number(roteiro.hot_reservas || 0)
    const confirmadas = Number(roteiro.hot_confirmadas || 0)

    if (total === 0) return 'Novidade'
    if (confirmadas > 0) return `${confirmadas} confirmação(ões)`
    return `${total} reserva(s)`
  }

  function dificuldadeClass(dificuldade?: string | null) {
    const valor = normalizar(dificuldade)
    if (valor.includes('facil')) return 'easy'
    if (valor.includes('moder')) return 'medium'
    if (valor.includes('dific') || valor.includes('avanc')) return 'hard'
    return 'neutral'
  }

  function menorPrecoDisponivel() {
    const precos = roteiros
      .map((roteiro) => precoRoteiro(roteiro))
      .filter((preco) => preco > 0)

    if (precos.length === 0) return 'R$ 0,00'
    return formatarMoeda(Math.min(...precos))
  }

  const rotaInicioHeader = user ? rotaPainelUsuario(user) : '/'

  return (
    <main className="page">
      <style jsx>{styles}</style>

      <header className="topbar">
        <div className="topbarInner">
          <div className="headerGhost" aria-hidden="true" />

          <button
            type="button"
            className="brandCenter"
            onClick={() => router.push(rotaInicioHeader)}
            aria-label={user ? 'Voltar para sua área inicial' : 'Ir para início'}
            title="PrussikTrails"
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" className="brandLogo" />
            <span className="brandSubtitle">Roteiros e experiências outdoor</span>
          </button>

          {user ? (
            <button
              type="button"
              className="profileButton"
              onClick={() => router.push(rotaPerfilUsuario(user))}
              aria-label={`Abrir ${primeiroNome(nomeUsuario(user))}`}
              title="Perfil"
            >
              {avatarUsuario(user) ? (
                <img src={avatarUsuario(user)} alt={nomeUsuario(user)} />
              ) : (
                <span className="profileInitial">{inicialUsuario(user)}</span>
              )}
            </button>
          ) : (
            <button
              type="button"
              className="loginButton"
              onClick={() => router.push('/login')}
              aria-label="Entrar"
              title="Entrar"
            >
              Entrar
            </button>
          )}
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroContent">
            <div>
              <div className="eyebrow">Escolha seu próximo caminho</div>

              <h1 className="heroTitle">
                Nem toda rota aparece no mapa.
                <br />
                Algumas começam <span>por coragem.</span>
              </h1>

              <p className="heroText">
                Encontre experiências outdoor, trilhas guiadas e jornadas para sair da rotina
                com mais tranquilidade, presença e bons guias pelo caminho.
              </p>
            </div>

            <aside className="heroCard">
              <div className="heroCardLabel">Roteiros disponíveis</div>
              <div className="heroCardValue">{roteiros.length}</div>
              <div className="heroCardText">Use os filtros para encontrar uma experiência com o seu ritmo.</div>
            </aside>
          </div>
        </section>

        {mensagem && <div className="message">{mensagem}</div>}

        <section className="toolbar">
          <input
            className="input"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por trilha, local, guia ou experiência..."
          />

          <select
            className="select"
            value={filtroDificuldade}
            onChange={(event) => setFiltroDificuldade(event.target.value)}
          >
            <option value="todos">Todas as dificuldades</option>
            {dificuldadesDisponiveis.map((dificuldade) => (
              <option value={dificuldade} key={dificuldade}>{dificuldade}</option>
            ))}
          </select>

          <select
            className="select"
            value={ordenacao}
            onChange={(event) => setOrdenacao(event.target.value as typeof ordenacao)}
          >
            <option value="quentes">Mais quentes</option>
            <option value="recentes">Mais recentes</option>
            <option value="menor_preco">Menor preço</option>
            <option value="maior_preco">Maior preço</option>
          </select>
        </section>

        <section className="statsRow">
          <article className="statCard">
            <div className="statValue">{roteirosFiltrados.length}</div>
            <div className="statLabel">roteiro(s) encontrados</div>
          </article>

          <article className="statCard">
            <div className="statValue">{roteiros.filter((r) => Number(r.hot_reservas || 0) > 0).length}</div>
            <div className="statLabel">com movimento da comunidade</div>
          </article>

          <article className="statCard">
            <div className="statValue">{menorPrecoDisponivel()}</div>
            <div className="statLabel">menor valor disponível</div>
          </article>
        </section>

        {carregando ? (
          <section className="loadingCard">
            <div className="spinner" />
            <p>Carregando roteiros...</p>
          </section>
        ) : roteirosFiltrados.length === 0 ? (
          <section className="emptyCard">
            <span>🧭</span>
            <h2>Nenhum roteiro encontrado</h2>
            <p>Tente ajustar os filtros ou volte em breve para novas experiências.</p>
          </section>
        ) : (
          <section className="cardsGrid">
            {roteirosFiltrados.map((roteiro) => {
              const imagem = imagemRoteiro(roteiro)
              const preco = precoRoteiro(roteiro)
              const km = kmRoteiro(roteiro)
              const data = dataRoteiro(roteiro)

              return (
                <article className="trailCard" key={roteiro.id}>
                  <button
                    type="button"
                    className="trailImage"
                    style={
                      {
                        '--trail-image': imagem
                          ? `url("${imagem}")`
                          : 'radial-gradient(circle at 20% 10%, rgba(190,242,100,0.22), transparent 32%), linear-gradient(135deg, #203c2e 0%, #7b8372 56%, #d4b35a 100%)'
                      } as CSSProperties & Record<string, string>
                    }
                    onClick={() => abrirDetalhesRoteiro(roteiro)}
                    aria-label={`Abrir ${tituloRoteiro(roteiro)}`}
                  >
                    <span className="hotBadge">{hotLabel(roteiro)}</span>
                    <span className={`difficulty ${dificuldadeClass(roteiro.dificuldade)}`}>
                      {roteiro.dificuldade || 'Nível livre'}
                    </span>
                  </button>

                  <div className="trailBody">
                    <button
                      type="button"
                      className="trailTitleButton"
                      onClick={() => abrirDetalhesRoteiro(roteiro)}
                    >
                      <h2>{tituloRoteiro(roteiro)}</h2>
                    </button>

                    <p className="trailDescription">
                      {roteiro.descricao || 'Experiência outdoor cadastrada por guia PrussikTrails.'}
                    </p>

                    <div className="trailMeta">
                      <span>{localRoteiro(roteiro)}</span>
                      <span>{formatarData(data)}</span>
                      <span>{km > 0 ? `${km} km` : recorrenciaRoteiro(roteiro)}</span>
                    </div>

                    <div className="guideLine">
                      <span>Guia/Agência</span>
                      <strong>{roteiro.guia_nome || 'Guia/Agência PrussikTrails'}</strong>
                    </div>

                    <div className="cardFooter">
                      <div>
                        <span className="priceLabel">A partir de</span>
                        <strong className="priceValue">{preco > 0 ? formatarMoeda(preco) : 'Consulte'}</strong>
                      </div>

                      <div className="cardActions">
                        <button
                          type="button"
                          className="detailsBtn"
                          onClick={() => abrirDetalhesRoteiro(roteiro)}
                        >
                          Detalhes
                        </button>

                        <button
                          type="button"
                          className="reserveBtn"
                          onClick={() => abrirReserva(roteiro)}
                          disabled={reservandoId === roteiro.id}
                        >
                          {reservandoId === roteiro.id ? 'Reservando...' : 'Reservar'}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>

      {roteiroSelecionado && (
        <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="Confirmar reserva">
          <section className="modal">
            <div className="modalHeader">
              <div>
                <span>Reserva PrussikTrails</span>
                <h2>{tituloRoteiro(roteiroSelecionado)}</h2>
                <p>{localRoteiro(roteiroSelecionado)}</p>
              </div>

              <button
                type="button"
                className="modalClose"
                onClick={() => setRoteiroSelecionado(null)}
                disabled={Boolean(reservandoId)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="modalBody">
              <div className="quantityRow">
                <label>Quantidade de pessoas</label>
                <select
                  value={quantidadePessoas}
                  onChange={(event) => setQuantidadePessoas(Number(event.target.value))}
                  disabled={Boolean(reservandoId)}
                >
                  {Array.from({ length: limitePessoas(roteiroSelecionado) }).map((_, index) => (
                    <option key={index + 1} value={index + 1}>{index + 1}</option>
                  ))}
                </select>
              </div>

              <div className="modalTotal">
                <span>Total estimado</span>
                <strong>{formatarMoeda(precoRoteiro(roteiroSelecionado) * quantidadePessoas)}</strong>
              </div>

              <p className="modalNote">
                Ao confirmar, a reserva será criada e você será direcionado para o pagamento PIX.
              </p>

              <div className="modalActions">
                <button
                  type="button"
                  className="cancelBtn"
                  onClick={() => setRoteiroSelecionado(null)}
                  disabled={Boolean(reservandoId)}
                >
                  Voltar
                </button>

                <button
                  type="button"
                  className="confirmBtn"
                  onClick={confirmarReserva}
                  disabled={Boolean(reservandoId)}
                >
                  {reservandoId ? 'Criando reserva...' : 'Confirmar reserva'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

const styles = `
  .page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 8% 0%, rgba(132, 204, 22, 0.16), transparent 28%),
      radial-gradient(circle at 90% 8%, rgba(251, 146, 60, 0.13), transparent 28%),
      linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
    color: #172018;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    padding-bottom: 72px;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 40;
    background: rgba(255, 253, 247, 0.9);
    border-bottom: 1px solid rgba(15, 23, 42, 0.06);
    backdrop-filter: blur(18px);
    padding: 8px 14px;
  }

  .topbarInner {
    width: 100%;
    max-width: 1180px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 46px minmax(0, 1fr) 46px;
    align-items: center;
    gap: 8px;
  }

  .headerGhost {
    width: 42px;
    height: 42px;
  }

  .brandCenter {
    min-width: 0;
    border: none;
    background: transparent;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    text-align: center;
  }

  .brandLogo {
    width: clamp(178px, 54vw, 270px);
    max-width: 100%;
    height: auto;
    object-fit: contain;
    display: block;
  }

  .brandSubtitle {
    color: #6b7280;
    font-size: clamp(9px, 2.6vw, 11px);
    line-height: 1;
    font-weight: 850;
    letter-spacing: 0.08em;
    margin-top: -3px;
    text-transform: uppercase;
    white-space: nowrap;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .profileButton,
  .loginButton {
    width: 42px;
    height: 42px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    background: rgba(255,255,255,0.78);
    color: #172018;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    overflow: hidden;
    padding: 0;
    box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
    transition: 0.2s ease;
    font-size: 11px;
    font-weight: 950;
  }

  .profileButton:hover,
  .loginButton:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 30px rgba(15, 23, 42, 0.12);
  }

  .profileButton img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .profileInitial {
    width: 100%;
    height: 100%;
    border-radius: 999px;
    background: #172018;
    color: #ffffff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 950;
  }

  .container {
    width: min(1180px, calc(100% - 32px));
    margin: 0 auto;
    padding: 22px 0 0;
  }

  .hero {
    border-radius: 36px;
    background:
      radial-gradient(circle at top right, rgba(190, 242, 100, 0.22), transparent 32%),
      linear-gradient(135deg, #172018, #203c2e 52%, #6f7f4f);
    color: #ffffff;
    padding: clamp(24px, 4vw, 42px);
    box-shadow: 0 28px 80px rgba(32, 60, 46, 0.16);
  }

  .heroContent {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 260px;
    gap: 24px;
    align-items: end;
  }

  .eyebrow,
  .heroCardLabel {
    color: #bef264;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    margin-bottom: 12px;
  }

  .heroTitle {
    margin: 0;
    font-size: clamp(42px, 6vw, 78px);
    line-height: 0.92;
    letter-spacing: -0.085em;
    font-weight: 950;
  }

  .heroTitle span {
    color: #bef264;
  }

  .heroText {
    margin: 18px 0 0;
    max-width: 680px;
    color: rgba(255, 255, 255, 0.78);
    font-size: 15px;
    line-height: 1.62;
    font-weight: 650;
  }

  .heroCard {
    border-radius: 28px;
    background: rgba(255,255,255,0.13);
    border: 1px solid rgba(255,255,255,0.16);
    padding: 22px;
    backdrop-filter: blur(12px);
  }

  .heroCardValue {
    color: #ffffff;
    font-size: 52px;
    line-height: 0.95;
    font-weight: 950;
    letter-spacing: -0.08em;
  }

  .heroCardText {
    margin-top: 10px;
    color: rgba(255,255,255,0.72);
    font-size: 12px;
    line-height: 1.45;
    font-weight: 750;
  }

  .message {
    margin-top: 16px;
    border-radius: 20px;
    background: rgba(153, 27, 27, 0.08);
    border: 1px solid rgba(153, 27, 27, 0.16);
    color: #7f1d1d;
    padding: 13px 14px;
    font-size: 13px;
    font-weight: 850;
  }

  .toolbar {
    margin-top: 18px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 220px 200px;
    gap: 10px;
    border-radius: 28px;
    background: rgba(255, 253, 247, 0.84);
    border: 1px solid rgba(32, 60, 46, 0.08);
    box-shadow: 0 18px 46px rgba(32, 60, 46, 0.08);
    padding: 12px;
  }

  .input,
  .select {
    width: 100%;
    border: 1px solid rgba(32, 60, 46, 0.11);
    background: rgba(255,255,255,0.76);
    border-radius: 18px;
    color: #172018;
    padding: 13px 14px;
    font-size: 13px;
    font-weight: 800;
    outline: none;
  }

  .statsRow {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .statCard,
  .loadingCard,
  .emptyCard {
    border: 1px solid rgba(32, 60, 46, 0.08);
    border-radius: 26px;
    background: rgba(255, 253, 247, 0.78);
    box-shadow: 0 14px 40px rgba(32, 60, 46, 0.07);
    padding: 18px;
  }

  .statValue {
    color: #203c2e;
    font-size: 28px;
    font-weight: 950;
    letter-spacing: -0.06em;
  }

  .statLabel {
    color: #7b8372;
    font-size: 11px;
    line-height: 1.35;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .loadingCard,
  .emptyCard {
    margin-top: 18px;
    text-align: center;
    color: #64748b;
    font-weight: 800;
  }

  .emptyCard span {
    font-size: 44px;
  }

  .emptyCard h2 {
    margin: 8px 0 4px;
    color: #172018;
    font-size: 28px;
    letter-spacing: -0.055em;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border-radius: 999px;
    border: 4px solid rgba(32, 60, 46, 0.14);
    border-top-color: #991b1b;
    margin: 0 auto 12px;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .cardsGrid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .trailCard {
    min-width: 0;
    overflow: hidden;
    border-radius: 32px;
    background: rgba(255, 253, 247, 0.84);
    border: 1px solid rgba(32, 60, 46, 0.08);
    box-shadow: 0 20px 56px rgba(32, 60, 46, 0.09);
  }

  .trailImage {
    position: relative;
    width: 100%;
    min-height: 214px;
    border: 0;
    padding: 0;
    cursor: pointer;
    display: block;
    background:
      linear-gradient(135deg, rgba(23, 32, 24, 0.12), rgba(23, 32, 24, 0.42)),
      var(--trail-image);
    background-size: cover;
    background-position: center;
  }

  .hotBadge,
  .difficulty {
    position: absolute;
    top: 14px;
    border-radius: 999px;
    padding: 8px 10px;
    color: #ffffff;
    font-size: 10px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    backdrop-filter: blur(12px);
  }

  .hotBadge {
    left: 14px;
    background: rgba(153, 27, 27, 0.82);
  }

  .difficulty {
    right: 14px;
    background: rgba(23, 32, 24, 0.72);
  }

  .difficulty.easy { background: rgba(32, 60, 46, 0.86); }
  .difficulty.medium { background: rgba(139, 94, 52, 0.88); }
  .difficulty.hard { background: rgba(153, 27, 27, 0.88); }

  .trailBody {
    padding: 18px;
  }

  .trailTitleButton {
    border: 0;
    background: transparent;
    padding: 0;
    color: inherit;
    cursor: pointer;
    text-align: left;
  }

  .trailTitleButton h2 {
    margin: 0;
    color: #172018;
    font-size: 24px;
    line-height: 1;
    letter-spacing: -0.065em;
    font-weight: 950;
  }

  .trailDescription {
    min-height: 62px;
    margin: 10px 0 0;
    color: rgba(23, 32, 24, 0.64);
    font-size: 13px;
    line-height: 1.48;
    font-weight: 700;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .trailMeta {
    margin-top: 12px;
    display: grid;
    gap: 6px;
  }

  .trailMeta span {
    color: #64748b;
    font-size: 12px;
    line-height: 1.35;
    font-weight: 800;
  }

  .guideLine {
    margin-top: 13px;
    border-radius: 18px;
    background: rgba(32, 60, 46, 0.055);
    padding: 11px 12px;
  }

  .guideLine span,
  .priceLabel {
    display: block;
    color: #7b8372;
    font-size: 10px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.10em;
    margin-bottom: 4px;
  }

  .guideLine strong {
    display: block;
    color: #203c2e;
    font-size: 13px;
    line-height: 1.25;
    font-weight: 950;
    overflow-wrap: anywhere;
  }

  .cardFooter {
    margin-top: 15px;
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 12px;
  }

  .priceValue {
    display: block;
    color: #991b1b;
    font-size: 22px;
    line-height: 1;
    letter-spacing: -0.05em;
    font-weight: 950;
  }

  .cardActions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .detailsBtn,
  .reserveBtn,
  .cancelBtn,
  .confirmBtn {
    border: 0;
    border-radius: 999px;
    padding: 11px 13px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
    transition: 0.2s ease;
  }

  .detailsBtn {
    background: #f0fdf4;
    color: #203c2e;
  }

  .reserveBtn,
  .confirmBtn {
    background: #991b1b;
    color: #fffdf7;
  }

  .cancelBtn {
    background: #e5e7eb;
    color: #374151;
  }

  .reserveBtn:disabled,
  .cancelBtn:disabled,
  .confirmBtn:disabled {
    opacity: 0.62;
    cursor: not-allowed;
  }

  .modalOverlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(23, 32, 24, 0.58);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
  }

  .modal {
    width: min(520px, 100%);
    border-radius: 34px;
    background: #fffdf7;
    box-shadow: 0 30px 90px rgba(15, 23, 42, 0.34);
    overflow: hidden;
  }

  .modalHeader {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 24px;
    background:
      radial-gradient(circle at top right, rgba(190, 242, 100, 0.30), transparent 36%),
      linear-gradient(135deg, #172018, #203c2e);
    color: #ffffff;
  }

  .modalHeader span {
    display: block;
    color: #bef264;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 8px;
  }

  .modalHeader h2 {
    margin: 0;
    font-size: 28px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.06em;
  }

  .modalHeader p {
    margin: 8px 0 0;
    color: rgba(255,255,255,0.74);
    font-size: 13px;
    font-weight: 750;
  }

  .modalClose {
    width: 38px;
    height: 38px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.10);
    color: #ffffff;
    border-radius: 999px;
    font-size: 24px;
    font-weight: 850;
    line-height: 1;
    cursor: pointer;
    flex: 0 0 auto;
  }

  .modalBody {
    padding: 20px;
    display: grid;
    gap: 14px;
  }

  .quantityRow,
  .modalTotal {
    border-radius: 22px;
    background: #f6f7f1;
    border: 1px solid rgba(15, 23, 42, 0.06);
    padding: 14px;
  }

  .quantityRow {
    display: grid;
    gap: 8px;
  }

  .quantityRow label,
  .modalTotal span {
    color: #7b8372;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.09em;
  }

  .quantityRow select {
    border: 1px solid rgba(15,23,42,0.10);
    background: #ffffff;
    color: #172018;
    border-radius: 999px;
    padding: 11px 13px;
    font-weight: 950;
    outline: none;
  }

  .modalTotal {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .modalTotal strong {
    color: #991b1b;
    font-size: 24px;
    letter-spacing: -0.05em;
    font-weight: 950;
  }

  .modalNote {
    margin: 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.45;
    font-weight: 750;
  }

  .modalActions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }

  @media (min-width: 941px) {
    .page {
      padding-top: 84px;
    }

    .topbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 80;
      height: 84px;
      padding: 8px 26px;
      display: flex;
      align-items: center;
      background: rgba(255, 253, 247, 0.94);
      border-bottom: 1px solid rgba(15, 23, 42, 0.06);
      backdrop-filter: blur(18px);
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.045);
    }

    .topbarInner {
      width: 100%;
      max-width: 1180px;
      height: 68px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 18px;
    }

    .headerGhost {
      display: none;
    }

    .brandCenter {
      grid-column: 1;
      justify-self: start;
      width: fit-content;
      max-width: 100%;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: flex-start;
      gap: 14px;
      padding: 0;
      text-align: left;
    }

    .brandLogo {
      width: 128px;
      max-width: 128px;
      height: 58px;
      object-fit: contain;
      display: block;
      flex: 0 0 auto;
    }

    .brandSubtitle {
      margin-top: 0;
      max-width: 460px;
      color: #6b7280;
      font-size: 10px;
      line-height: 1.1;
      font-weight: 900;
      letter-spacing: 0.11em;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .profileButton,
    .loginButton {
      grid-column: 2;
      justify-self: end;
      width: 44px;
      height: 44px;
      flex: 0 0 auto;
    }
  }

  @media (max-width: 1040px) {
    .cardsGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 820px) {
    .heroContent,
    .toolbar,
    .statsRow,
    .cardsGrid {
      grid-template-columns: 1fr;
    }

    .cardFooter {
      align-items: stretch;
      flex-direction: column;
    }

    .cardActions {
      justify-content: stretch;
    }

    .detailsBtn,
    .reserveBtn {
      flex: 1;
    }
  }

  @media (max-width: 640px) {
    .topbar {
      padding: 7px 10px;
    }

    .topbarInner {
      grid-template-columns: 38px minmax(0, 1fr) 38px;
    }

    .headerGhost,
    .profileButton,
    .loginButton {
      width: 36px;
      height: 36px;
      box-shadow: none;
    }

    .brandLogo {
      width: clamp(154px, 58vw, 218px);
    }

    .brandSubtitle {
      font-size: 8.5px;
      letter-spacing: 0.06em;
      margin-top: -2px;
    }

    .container {
      width: min(100% - 20px, 1180px);
      padding-top: 12px;
    }

    .hero {
      border-radius: 26px;
      padding: 22px;
    }

    .heroTitle {
      font-size: clamp(38px, 12.5vw, 52px);
      letter-spacing: -0.095em;
    }

    .trailCard,
    .statCard,
    .loadingCard,
    .emptyCard {
      border-radius: 24px;
    }

    .trailImage {
      min-height: 190px;
    }

    .modalOverlay {
      align-items: flex-end;
      padding: 10px;
    }

    .modal {
      border-radius: 26px;
    }

    .modalActions {
      flex-direction: column-reverse;
    }

    .modalActions button {
      width: 100%;
    }
  }

  @media (max-width: 380px) {
    .brandLogo {
      width: clamp(150px, 55vw, 198px);
    }

    .brandSubtitle {
      display: none;
    }
  }
`
