'use client'

import { CSSProperties, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type AnyRecord = Record<string, any>

type UsuarioLocal = {
  id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  cliente_id?: string | null
  guia_id?: string | null
  nome?: string | null
  email?: string | null
  tipo?: string | null
  name?: string | null
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
  duracao_horas?: number | string | null
  duracao?: number | string | null
  km?: number | string | null
  distancia_km?: number | string | null
  dificuldade?: string | null
  localizacao?: string | null
  local?: string | null
  cidade?: string | null
  estado?: string | null
  foto_capa?: string | null
  imagem_url?: string | null
  imagem?: string | null
  foto_url?: string | null
  galeria_fotos?: string[] | string | null
  fotos?: string[] | string | null
  embarque_local?: string | null
  local_encontro?: string | null
  ponto_encontro?: string | null
  embarque_data?: string | null
  embarque_data_hora?: string | null
  data_trilha?: string | null
  data_roteiro?: string | null
  proxima_data?: string | null
  retorno_local?: string | null
  retorno_data?: string | null
  retorno_data_hora?: string | null
  roteiro_detalhado?: string | null
  detalhes?: string | null
  inclui?: string | null
  nao_inclui?: string | null
  orientacoes?: string | null
  status?: string | null
  ativo?: boolean | null
  id_guia?: string | null
  guia_id?: string | null
  user_id?: string | null
  limite_pessoas?: number | string | null
  capacidade?: number | string | null
  max_pessoas?: number | string | null
  recorrencia?: string | null
  created_at?: string | null
  guia_nome?: string | null
  nome_guia?: string | null
  guia_name?: string | null
  guia_email?: string | null
  guia_avatar_url?: string | null
  guia_foto_url?: string | null
  id_user?: string | null
  usuario_id?: string | null
  criador_id?: string | null
  created_by?: string | null
  nome_agencia?: string | null
  agencia_nome?: string | null
  empresa_nome?: string | null
  nome_empresa?: string | null
  nome_fantasia?: string | null
  razao_social?: string | null
}

type Guia = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  bio?: string | null
  instagram?: string | null
  cadastur?: string | null
  cadastro_turismo?: string | null
  nome_agencia?: string | null
  agencia_nome?: string | null
  empresa_nome?: string | null
  nome_empresa?: string | null
  nome_fantasia?: string | null
  razao_social?: string | null
}

type ReservaCriada = {
  id: string
}

type PerguntaPublica = {
  id: string
  roteiro_id: string
  cliente_id?: string | null
  cliente_nome?: string | null
  pergunta: string
  resposta?: string | null
  respondido_por?: string | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
  respondido_em?: string | null
}

function normalizar(valor: unknown) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function extrairUsuarioId(usuario: UsuarioLocal | null): string {
  return texto(
    usuario?.id ||
      usuario?.user_id ||
      usuario?.usuario_id ||
      usuario?.cliente_id ||
      usuario?.guia_id
  )
}

function textoSeguro(valor: unknown, fallback = '') {
  const valorTexto = texto(valor)
  return valorTexto || fallback
}

function quebrarTexto(valor?: string | null) {
  if (!valor) return []

  return String(valor)
    .split(/\n|;|\|/g)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseGaleria(valor: unknown) {
  if (!valor) return []

  if (Array.isArray(valor)) {
    return valor.map((item) => texto(item)).filter(Boolean)
  }

  if (typeof valor === 'string') {
    const textoValor = valor.trim()
    if (!textoValor) return []

    try {
      const parsed = JSON.parse(textoValor)
      if (Array.isArray(parsed)) return parsed.map((item) => texto(item)).filter(Boolean)
    } catch {
      // fallback abaixo
    }

    return textoValor.split(/,|\n|\|/g).map((item) => item.trim()).filter(Boolean)
  }

  return []
}

export default function DetalhesRoteiroPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id || '').trim()

  const [roteiro, setRoteiro] = useState<Roteiro | null>(null)
  const [guia, setGuia] = useState<Guia | null>(null)
  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioLocal | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [reservando, setReservando] = useState(false)
  const [modalReservaAberto, setModalReservaAberto] = useState(false)
  const [quantidadePessoas, setQuantidadePessoas] = useState(1)
  const [mensagem, setMensagem] = useState('')
  const [fotoSelecionada, setFotoSelecionada] = useState(0)
  const [vagasOcupadas, setVagasOcupadas] = useState(0)
  const [perguntas, setPerguntas] = useState<PerguntaPublica[]>([])
  const [novaPergunta, setNovaPergunta] = useState('')
  const [respostasGuia, setRespostasGuia] = useState<Record<string, string>>({})
  const [enviandoPergunta, setEnviandoPergunta] = useState(false)
  const [respondendoPerguntaId, setRespondendoPerguntaId] = useState('')
  const [perguntasAviso, setPerguntasAviso] = useState('')

  useEffect(() => {
    const salvo = localStorage.getItem('user')
    const usuario = salvo ? (JSON.parse(salvo) as UsuarioLocal) : null
    setUsuarioLogado(usuario)

    if (usuario) sincronizarUsuarioCabecalho(usuario)

    carregarRoteiro()
    carregarPerguntas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function sincronizarUsuarioCabecalho(usuarioAtual: UsuarioLocal) {
    const usuarioId = extrairUsuarioId(usuarioAtual)
    if (!usuarioId) return

    try {
      const { data } = await supabase
        .from('users')
        .select('id, nome, name, email, tipo, avatar_url, foto_url, imagem_url')
        .eq('id', usuarioId)
        .maybeSingle()

      if (!data) return

      const atualizado: UsuarioLocal = {
        ...usuarioAtual,
        id: data.id || usuarioAtual.id,
        nome: data.nome || usuarioAtual.nome || null,
        name: data.name || usuarioAtual.name || null,
        email: data.email || usuarioAtual.email || null,
        tipo: data.tipo || usuarioAtual.tipo || null,
        avatar_url: data.avatar_url || usuarioAtual.avatar_url || null,
        foto_url: data.foto_url || usuarioAtual.foto_url || null,
        imagem_url: data.imagem_url || usuarioAtual.imagem_url || null
      }

      setUsuarioLogado(atualizado)
      localStorage.setItem('user', JSON.stringify(atualizado))
    } catch (error) {
      console.warn('Não foi possível sincronizar avatar do usuário no cabeçalho:', error)
    }
  }

  function nomeUsuario(usuario?: UsuarioLocal | null) {
    return usuario?.nome || usuario?.name || usuario?.email || 'Usuário'
  }

  function primeiroNome(valor?: string | null) {
    const nome = String(valor || 'Usuário').trim()
    return nome.split(' ')[0] || 'Usuário'
  }

  function avatarUsuario(usuario?: UsuarioLocal | null) {
    return usuario?.avatar_url || usuario?.foto_url || usuario?.imagem_url || ''
  }

  function inicialUsuario(usuario?: UsuarioLocal | null) {
    return primeiroNome(nomeUsuario(usuario)).slice(0, 1).toUpperCase()
  }

  function rotaPerfilUsuario(usuario?: UsuarioLocal | null) {
    const tipo = normalizar(usuario?.tipo)
    if (tipo === 'guia') return '/guia/perfil'
    if (tipo === 'admin') return '/admin/dashboard'
    return '/cliente/perfil'
  }

  function rotaPrincipalUsuario() {
    const tipo = normalizar(usuarioLogado?.tipo)
    if (tipo === 'cliente') return '/cliente/dashboard'
    if (tipo === 'guia') return '/guia/dashboard'
    if (tipo === 'admin') return '/admin/dashboard'
    return '/roteiros'
  }

  function tituloRoteiro(item?: Roteiro | null) {
    return textoSeguro(item?.titulo || item?.nome, 'Roteiro PrussikTrails')
  }

  function guiaIdRoteiro(item?: Roteiro | null) {
    return texto(
      item?.id_guia ||
        item?.guia_id ||
        item?.id_user ||
        item?.usuario_id ||
        item?.criador_id ||
        item?.created_by ||
        item?.user_id
    )
  }

  function nomePublicoGuia(item?: Guia | null) {
    return textoSeguro(
      item?.nome_agencia ||
        item?.agencia_nome ||
        item?.empresa_nome ||
        item?.nome_empresa ||
        item?.nome_fantasia ||
        item?.razao_social ||
        item?.nome ||
        item?.name ||
        item?.email,
      'Guia/Agência PrussikTrails'
    )
  }

  function guiaFallbackDoRoteiro(item?: Roteiro | null): Guia | null {
    const guiaId = guiaIdRoteiro(item)
    if (!item || !guiaId) return null

    return {
      id: guiaId,
      nome:
        item.nome_agencia ||
        item.agencia_nome ||
        item.empresa_nome ||
        item.nome_empresa ||
        item.nome_fantasia ||
        item.razao_social ||
        item.guia_nome ||
        item.nome_guia ||
        item.guia_name ||
        item.guia_email ||
        'Guia/Agência PrussikTrails',
      email: item.guia_email || null,
      avatar_url: item.guia_avatar_url || item.guia_foto_url || null
    }
  }

  function avatarGuia(item?: Guia | null) {
    return texto(item?.avatar_url || item?.foto_url || item?.imagem_url)
  }

  function localRoteiro(item?: Roteiro | null) {
    const local = textoSeguro(item?.localizacao || item?.local)
    if (local) return local

    const cidadeEstado = [item?.cidade, item?.estado]
      .map((parte) => texto(parte))
      .filter(Boolean)
      .join(' / ')

    return cidadeEstado || 'Local a definir'
  }

  function precoRoteiro(item?: Roteiro | null) {
    return Number(item?.preco ?? item?.valor ?? 0) || 0
  }

  function kmRoteiro(item?: Roteiro | null) {
    return Number(item?.km ?? item?.distancia_km ?? 0) || 0
  }

  function duracaoRoteiro(item?: Roteiro | null) {
    return Number(item?.duracao_horas ?? item?.duracao ?? 0) || 0
  }

  function limitePessoas(item?: Roteiro | null) {
    const valor = item?.limite_pessoas ?? item?.capacidade ?? item?.max_pessoas ?? null
    if (valor === null || valor === undefined || valor === '') return null
    const numero = Number(valor)
    if (!Number.isFinite(numero) || numero <= 0) return null
    return numero
  }

  function dataPrincipal(item?: Roteiro | null) {
    return (
      item?.proxima_data ||
      item?.embarque_data_hora ||
      item?.embarque_data ||
      item?.data_trilha ||
      item?.data_roteiro ||
      ''
    )
  }

  function fotoCapa(item?: Roteiro | null) {
    return texto(item?.foto_capa || item?.imagem_url || item?.imagem || item?.foto_url)
  }

  const fotosRoteiro = useMemo(() => {
    if (!roteiro) return []
    const capa = fotoCapa(roteiro)
    const galeria = [...parseGaleria(roteiro.galeria_fotos), ...parseGaleria(roteiro.fotos)]
    return Array.from(new Set([capa, ...galeria].filter(Boolean)))
  }, [roteiro])

  const vagasRestantes = useMemo(() => {
    const limite = limitePessoas(roteiro)
    if (limite === null) return null
    return Math.max(limite - vagasOcupadas, 0)
  }, [roteiro, vagasOcupadas])

  const esgotado = vagasRestantes !== null && vagasRestantes <= 0

  const valorTotal = useMemo(() => {
    const quantidade = Math.max(1, Number(quantidadePessoas || 1))
    return precoRoteiro(roteiro) * quantidade
  }, [roteiro, quantidadePessoas])

  const idUsuarioLogado = extrairUsuarioId(usuarioLogado)

  const ehGuiaDono = Boolean(
    roteiro &&
      idUsuarioLogado &&
      idUsuarioLogado === guiaIdRoteiro(roteiro) &&
      normalizar(usuarioLogado?.tipo) === 'guia'
  )

  function abrirPerfilGuia() {
    const guiaId = guia?.id || guiaIdRoteiro(roteiro)
    if (!guiaId) return
    router.push(`/guia/publico/${guiaId}`)
  }

  async function carregarOcupacao(roteiroId: string, roteiroData: Roteiro) {
    const { data, error } = await supabase
      .from('reservas')
      .select('quantidade_pessoas, quantidade, status, data_trilha, data_reserva')
      .eq('roteiro_id', roteiroId)

    if (error) {
      console.warn('Não foi possível carregar ocupação do roteiro:', error)
      setVagasOcupadas(0)
      return
    }

    const dataReferencia = String(dataPrincipal(roteiroData) || '').slice(0, 10)

    const ocupadas = ((data || []) as AnyRecord[])
      .filter((reserva) => {
        if (normalizar(reserva.status) === 'cancelada') return false
        if (!dataReferencia) return true
        const dataReserva = String(reserva.data_trilha || reserva.data_reserva || '').slice(0, 10)
        if (!dataReserva) return true
        return dataReserva === dataReferencia
      })
      .reduce((total, reserva) => total + Number(reserva.quantidade_pessoas || reserva.quantidade || 1), 0)

    setVagasOcupadas(ocupadas)
  }

  async function carregarRoteiro() {
    if (!id) {
      setMensagem('Roteiro não encontrado.')
      setCarregando(false)
      return
    }

    setCarregando(true)
    setMensagem('')

    try {
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        setMensagem('Roteiro não encontrado.')
        setRoteiro(null)
        return
      }

      const roteiroData = data as Roteiro

      if (roteiroData.ativo === false) setMensagem('Este roteiro não está disponível no momento.')

      const status = normalizar(roteiroData.status)
      if (['cancelado', 'cancelada', 'reprovado', 'pausado', 'excluido', 'rascunho'].includes(status)) {
        setMensagem('Este roteiro não está disponível no momento.')
      }

      setRoteiro(roteiroData)
      setFotoSelecionada(0)

      const guiaFallback = guiaFallbackDoRoteiro(roteiroData)
      setGuia(guiaFallback)

      await carregarOcupacao(roteiroData.id, roteiroData)

      const guiaId = guiaIdRoteiro(roteiroData)

      if (guiaId) {
        const { data: guiaData, error: guiaError } = await supabase
          .from('users')
          .select('*')
          .eq('id', guiaId)
          .maybeSingle()

        if (!guiaError && guiaData) setGuia(guiaData as Guia)
      }
    } catch (error) {
      console.error('Erro ao carregar roteiro:', error)
      setMensagem('Erro ao carregar roteiro.')
    } finally {
      setCarregando(false)
    }
  }

  async function carregarPerguntas() {
    if (!id) return

    try {
      setPerguntasAviso('')

      const response = await fetch(`/api/roteiros/perguntas?roteiroId=${encodeURIComponent(id)}`, {
        headers: {
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        }
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        setPerguntas([])
        setPerguntasAviso(data?.erro || 'A caixa de perguntas ainda precisa ser ativada no banco de dados.')
        return
      }

      setPerguntas(Array.isArray(data?.perguntas) ? data.perguntas : [])
    } catch (error) {
      console.warn('Erro ao carregar perguntas públicas:', error)
      setPerguntas([])
    }
  }

  async function enviarPerguntaPublica() {
    if (!roteiro) return

    const textoPergunta = novaPergunta.trim()

    if (!textoPergunta) {
      setPerguntasAviso('Escreva sua pergunta antes de enviar.')
      return
    }

    if (!idUsuarioLogado) {
      localStorage.setItem('redirectAfterLogin', `/roteiros/${id}`)
      router.push('/login')
      return
    }

    if (ehGuiaDono) {
      setPerguntasAviso('Como guia responsável, você pode responder as perguntas recebidas.')
      return
    }

    try {
      setPerguntasAviso('')
      setEnviandoPergunta(true)

      const response = await fetch('/api/roteiros/perguntas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roteiroId: roteiro.id,
          clienteId: idUsuarioLogado,
          pergunta: textoPergunta,
          paginaOrigem: `/roteiros/${id}`
        })
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || data?.sucesso === false) throw new Error(data?.erro || 'Não foi possível publicar a pergunta agora.')

      setNovaPergunta('')
      setPerguntasAviso('Pergunta enviada. O guia verá esta pendência e poderá responder aqui no roteiro.')
      await carregarPerguntas()
    } catch (error) {
      console.error('Erro ao enviar pergunta pública:', error)
      setPerguntasAviso(error instanceof Error ? error.message : 'Não foi possível publicar a pergunta agora.')
    } finally {
      setEnviandoPergunta(false)
    }
  }

  async function responderPerguntaPublica(perguntaId: string) {
    if (!ehGuiaDono) return

    const resposta = String(respostasGuia[perguntaId] || '').trim()

    if (!resposta) {
      setPerguntasAviso('Escreva uma resposta antes de publicar.')
      return
    }

    try {
      setPerguntasAviso('')
      setRespondendoPerguntaId(perguntaId)

      const response = await fetch('/api/roteiros/perguntas/responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perguntaId, roteiroId: id, guiaId: idUsuarioLogado, resposta })
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || data?.sucesso === false) throw new Error(data?.erro || 'Não foi possível publicar a resposta agora.')

      setRespostasGuia((prev) => ({ ...prev, [perguntaId]: '' }))
      await carregarPerguntas()
    } catch (error) {
      console.error('Erro ao responder pergunta pública:', error)
      setPerguntasAviso(error instanceof Error ? error.message : 'Não foi possível publicar a resposta agora.')
    } finally {
      setRespondendoPerguntaId('')
    }
  }

  function formatarMoeda(valor: unknown) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function formatarData(valor?: string | null) {
    if (!valor) return 'Data a combinar'
    const textoData = String(valor)
    const normalizada = textoData.length <= 10 ? `${textoData.slice(0, 10)}T12:00:00` : textoData
    const data = new Date(normalizada)
    if (Number.isNaN(data.getTime())) return 'Data a combinar'

    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  function formatarHora(valor?: string | null) {
    if (!valor) return ''
    const data = new Date(String(valor))
    if (Number.isNaN(data.getTime())) return ''
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  function labelDificuldade(valor?: string | null) {
    const textoValor = texto(valor)
    if (!textoValor) return 'Nível livre'
    return textoValor.charAt(0).toUpperCase() + textoValor.slice(1)
  }

  function abrirModalReserva() {
    if (!roteiro) return

    if (!idUsuarioLogado) {
      localStorage.setItem('redirectAfterLogin', `/roteiros/${id}`)
      router.push('/login')
      return
    }

    if (normalizar(usuarioLogado?.tipo) !== 'cliente') {
      setMensagem('Entre como cliente para reservar este roteiro.')
      return
    }

    if (esgotado) {
      setMensagem('Este roteiro está esgotado para a data disponível.')
      return
    }

    setMensagem('')
    setModalReservaAberto(true)
  }

  async function handleReservar() {
    if (!roteiro) return

    if (!idUsuarioLogado) {
      localStorage.setItem('redirectAfterLogin', `/roteiros/${id}`)
      router.push('/login')
      return
    }

    if (normalizar(usuarioLogado?.tipo) !== 'cliente') {
      setMensagem('Entre como cliente para reservar este roteiro.')
      return
    }

    if (esgotado) {
      setMensagem('Este roteiro está esgotado para a data disponível.')
      return
    }

    setReservando(true)
    setMensagem('')

    try {
      const quantidade = Math.max(1, Number(quantidadePessoas || 1))
      const valorUnitario = precoRoteiro(roteiro)
      const valorReserva = valorUnitario * quantidade

      const response = await fetch('/api/reservas/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: idUsuarioLogado,
          roteiroId: roteiro.id,
          dataTrilha: String(dataPrincipal(roteiro) || '').slice(0, 10) || null,
          quantidadePessoas: quantidade,
          valorUnitario,
          valorTotal: valorReserva,
          origem: 'roteiro_detalhe'
        })
      })

      const respostaTexto = await response.text()
      let data: AnyRecord | null = null

      try {
        data = respostaTexto ? JSON.parse(respostaTexto) : null
      } catch {
        data = { sucesso: false, erro: respostaTexto || 'Resposta não JSON da API.', raw: respostaTexto }
      }

      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.erro || data?.message || 'Não foi possível criar a reserva agora.')
      }

      const reserva = (data?.reserva || data) as ReservaCriada | null

      if (!reserva?.id) {
        router.push('/cliente/minhas-reservas')
        return
      }

      setModalReservaAberto(false)
      router.push(`/cliente/pagamento/${reserva.id}`)
    } catch (error: any) {
      console.error('Erro ao reservar roteiro:', error)
      setMensagem(error?.message || 'Não foi possível criar a reserva agora. Confira os dados e tente novamente.')
    } finally {
      setReservando(false)
    }
  }

  function HeaderRoteiro({ subtitle }: { subtitle: string }) {
    return (
      <header className="topbar">
        <div className="topbarInner">
          <div className="headerGhost" aria-hidden="true" />

          <button
            type="button"
            className="brandCenter"
            onClick={() => router.push(roteiro ? rotaPrincipalUsuario() : '/roteiros')}
            aria-label="Voltar para o início"
            title="PrussikTrails"
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" className="brandLogo" />
            <span className="brandSubtitle">{subtitle}</span>
          </button>

          {usuarioLogado ? (
            <button
              type="button"
              className="profileButton"
              onClick={() => router.push(rotaPerfilUsuario(usuarioLogado))}
              aria-label={`Abrir ${primeiroNome(nomeUsuario(usuarioLogado))}`}
              title="Perfil"
            >
              {avatarUsuario(usuarioLogado) ? (
                <img src={avatarUsuario(usuarioLogado)} alt={nomeUsuario(usuarioLogado)} />
              ) : (
                <span className="profileInitial">{inicialUsuario(usuarioLogado)}</span>
              )}
            </button>
          ) : (
            <button type="button" className="loginButton" onClick={() => router.push('/login')} aria-label="Entrar" title="Entrar">
              Entrar
            </button>
          )}
        </div>
      </header>
    )
  }

  if (carregando) {
    return (
      <main className="page">
        <HeaderRoteiro subtitle="Carregando roteiro outdoor" />
        <section className="loadingCard"><div className="spinner" /><p>Carregando roteiro...</p></section>
        <style jsx>{styles}</style>
      </main>
    )
  }

  if (!roteiro) {
    return (
      <main className="page">
        <HeaderRoteiro subtitle="Roteiro não encontrado" />
        <section className="emptyCard">
          <span>🧭</span>
          <h1>Roteiro não encontrado</h1>
          <p>{mensagem || 'Não conseguimos localizar este roteiro.'}</p>
          <button type="button" onClick={() => router.push('/roteiros')}>Ver outros roteiros</button>
        </section>
        <style jsx>{styles}</style>
      </main>
    )
  }

  const fotoAtual = fotosRoteiro[fotoSelecionada] || fotoCapa(roteiro)
  const dataTexto = formatarData(dataPrincipal(roteiro))
  const horaTexto = formatarHora(dataPrincipal(roteiro))
  const detalhes = quebrarTexto(roteiro.roteiro_detalhado || roteiro.detalhes)
  const inclui = quebrarTexto(roteiro.inclui)
  const naoInclui = quebrarTexto(roteiro.nao_inclui)
  const orientacoes = quebrarTexto(roteiro.orientacoes)
  const guiaAtual = guia || guiaFallbackDoRoteiro(roteiro)

  return (
    <main className="page">
      <HeaderRoteiro subtitle="Detalhes do passaporte outdoor" />

      <section className="hero">
        <div className="heroMedia">
          {fotoAtual ? (
            <img src={fotoAtual} alt={tituloRoteiro(roteiro)} />
          ) : (
            <div className="fallbackHero"><img src="/logo-prussik-display.png" alt="" /><span>A jornada começa quando o conforto termina</span></div>
          )}

          <div className="heroBadges">
            <span>{labelDificuldade(roteiro.dificuldade)}</span>
            <span>{kmRoteiro(roteiro)} km</span>
          </div>
        </div>

        <div className="heroContent">
          <p className="eyebrow">Experiência PrussikTrails</p>
          <h1>{tituloRoteiro(roteiro)}</h1>
          <p className="description">{roteiro.descricao || 'Uma experiência outdoor conduzida por guia, com reserva segura e acompanhamento dentro do app.'}</p>

          {guiaAtual && (
            <button type="button" className="guideHeroCard" onClick={abrirPerfilGuia}>
              <div className="guideMiniAvatar">
                {avatarGuia(guiaAtual) ? <img src={avatarGuia(guiaAtual)} alt={nomePublicoGuia(guiaAtual)} /> : <span>{nomePublicoGuia(guiaAtual).charAt(0).toUpperCase()}</span>}
              </div>

              <div>
                <small>Experiência conduzida por</small>
                <strong>{nomePublicoGuia(guiaAtual)}</strong>
                {(guiaAtual.cadastur || guiaAtual.cadastro_turismo) && <em>CADASTUR {guiaAtual.cadastur || guiaAtual.cadastro_turismo}</em>}
              </div>

              <span className="guideHeroArrow">Ver perfil →</span>
            </button>
          )}

          <div className="heroFacts">
            <div><span>Data</span><strong>{dataTexto}</strong>{horaTexto && <small>{horaTexto}</small>}</div>
            <div><span>Local</span><strong>{localRoteiro(roteiro)}</strong></div>
            <div><span>Duração</span><strong>{duracaoRoteiro(roteiro) || 'A combinar'} h</strong></div>
          </div>

          {mensagem && <div className="alert">{mensagem}</div>}

          <div className="mobileBooking">
            <strong>{formatarMoeda(precoRoteiro(roteiro))}</strong>
            <button type="button" onClick={abrirModalReserva} disabled={reservando || esgotado}>{esgotado ? 'Esgotado' : reservando ? 'Reservando...' : 'Reservar'}</button>
          </div>
        </div>
      </section>

      {fotosRoteiro.length > 1 && (
        <section className="galleryStrip">
          {fotosRoteiro.map((foto, index) => (
            <button type="button" key={`${foto}-${index}`} className={fotoSelecionada === index ? 'active' : ''} onClick={() => setFotoSelecionada(index)} aria-label={`Ver foto ${index + 1}`}>
              <img src={foto} alt="" />
            </button>
          ))}
        </section>
      )}

      <section className="contentGrid">
        <div className="mainColumn">
          <section className="card">
            <div className="sectionTitle"><span>01</span><div><h2>Sobre a experiência</h2><p>O essencial para entender o roteiro antes da reserva.</p></div></div>
            <div className="infoGrid">
              <div><span>Embarque</span><strong>{roteiro.embarque_local || roteiro.local_encontro || roteiro.ponto_encontro || 'A combinar'}</strong></div>
              <div><span>Retorno</span><strong>{roteiro.retorno_local || 'A combinar'}</strong></div>
              <div><span>Vagas</span><strong>{vagasRestantes === null ? 'Sem limite informado' : vagasRestantes > 0 ? `${vagasRestantes} disponível(is)` : 'Esgotado'}</strong></div>
              <div><span>Recorrência</span><strong>{roteiro.recorrencia || 'Experiência única'}</strong></div>
            </div>
          </section>

          {detalhes.length > 0 && (
            <section className="card"><div className="sectionTitle"><span>02</span><div><h2>Roteiro detalhado</h2><p>Como a aventura deve acontecer.</p></div></div><div className="textList">{detalhes.map((item) => <p key={item}>{item}</p>)}</div></section>
          )}

          {(inclui.length > 0 || naoInclui.length > 0) && (
            <section className="splitCards">
              {inclui.length > 0 && <div className="card"><div className="sectionTitle compact"><span>✓</span><div><h2>Inclui</h2><p>Itens informados pelo guia.</p></div></div><ul className="bulletList">{inclui.map((item) => <li key={item}>{item}</li>)}</ul></div>}
              {naoInclui.length > 0 && <div className="card"><div className="sectionTitle compact"><span>!</span><div><h2>Não inclui</h2><p>Planeje-se antes de sair.</p></div></div><ul className="bulletList">{naoInclui.map((item) => <li key={item}>{item}</li>)}</ul></div>}
            </section>
          )}

          {orientacoes.length > 0 && (
            <section className="card"><div className="sectionTitle"><span>03</span><div><h2>Orientações importantes</h2><p>Leia antes de reservar.</p></div></div><ul className="bulletList">{orientacoes.map((item) => <li key={item}>{item}</li>)}</ul></section>
          )}

          <section className="card questionsCard">
            <div className="sectionTitle"><span>?</span><div><h2>Perguntas públicas</h2><p>Clientes perguntam no roteiro e o guia responde de forma transparente.</p></div></div>

            {!ehGuiaDono && (
              <div className="questionBox">
                <textarea value={novaPergunta} onChange={(event) => setNovaPergunta(event.target.value)} placeholder={idUsuarioLogado ? 'Pergunte sobre ponto de encontro, preparo físico, equipamentos ou qualquer detalhe do roteiro.' : 'Faça login para enviar uma pergunta pública ao guia.'} maxLength={700} disabled={!idUsuarioLogado || enviandoPergunta} />
                <div className="questionActions"><span>{novaPergunta.length}/700</span><button type="button" onClick={idUsuarioLogado ? enviarPerguntaPublica : () => router.push('/login')} disabled={enviandoPergunta}>{idUsuarioLogado ? enviandoPergunta ? 'Publicando...' : 'Enviar pergunta' : 'Entrar para perguntar'}</button></div>
              </div>
            )}

            {perguntasAviso && <div className="questionNotice">{perguntasAviso}</div>}

            <div className="questionsList">
              {perguntas.length === 0 ? (
                <div className="emptyQuestions"><strong>Ainda não há perguntas públicas.</strong><p>Seja o primeiro a perguntar algo útil para outros aventureiros.</p></div>
              ) : (
                perguntas.map((pergunta) => (
                  <article key={pergunta.id} className="questionItem">
                    <div className="questionHeader"><div><strong>{pergunta.cliente_nome || 'Aventureiro PrussikTrails'}</strong><span>perguntou</span></div>{pergunta.created_at && <time>{formatarData(pergunta.created_at)}</time>}</div>
                    <p className="questionText">{pergunta.pergunta}</p>
                    {pergunta.resposta ? (
                      <div className="answerBox"><span>Resposta do guia</span><p>{pergunta.resposta}</p></div>
                    ) : ehGuiaDono ? (
                      <div className="answerEditor"><textarea value={respostasGuia[pergunta.id] || ''} onChange={(event) => setRespostasGuia((prev) => ({ ...prev, [pergunta.id]: event.target.value }))} placeholder="Responder publicamente esta pergunta..." maxLength={900} disabled={respondendoPerguntaId === pergunta.id} /><button type="button" onClick={() => responderPerguntaPublica(pergunta.id)} disabled={respondendoPerguntaId === pergunta.id}>{respondendoPerguntaId === pergunta.id ? 'Publicando...' : 'Responder como guia'}</button></div>
                    ) : (
                      <div className="pendingAnswer">Aguardando resposta do guia.</div>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="sideColumn">
          <section className="bookingCard">
            <p className="bookingLabel">Valor por pessoa</p>
            <strong className="bookingPrice">{formatarMoeda(precoRoteiro(roteiro))}</strong>
            <label>Pessoas<select value={quantidadePessoas} onChange={(event) => setQuantidadePessoas(Number(event.target.value))} disabled={esgotado}>{Array.from({ length: Math.max(1, Math.min(12, vagasRestantes || 12)) }).map((_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
            <div className="bookingTotal"><span>Total</span><strong>{formatarMoeda(valorTotal)}</strong></div>
            <button type="button" className="reserveBtn" onClick={abrirModalReserva} disabled={reservando || esgotado}>{esgotado ? 'Roteiro esgotado' : reservando ? 'Criando reserva...' : 'Reservar agora'}</button>
            <p className="bookingNote">O pagamento será feito na próxima etapa com confirmação automática quando disponível.</p>
          </section>

          {guiaAtual && (
            <section className="guideCard guideCardClickable" role="button" tabIndex={0} onClick={abrirPerfilGuia} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); abrirPerfilGuia() } }}>
              <div className="guideTop"><div className="guideAvatar">{avatarGuia(guiaAtual) ? <img src={avatarGuia(guiaAtual)} alt={nomePublicoGuia(guiaAtual)} /> : <span>{nomePublicoGuia(guiaAtual).charAt(0).toUpperCase()}</span>}</div><div><span>Guia responsável</span><strong>{nomePublicoGuia(guiaAtual)}</strong>{(guiaAtual.cadastur || guiaAtual.cadastro_turismo) && <small>CADASTUR {guiaAtual.cadastur || guiaAtual.cadastro_turismo}</small>}</div></div>
              {guiaAtual.bio && <p>{guiaAtual.bio}</p>}
              <div className="guideBtn fakeGuideBtn">Ver perfil do guia</div>
            </section>
          )}
        </aside>
      </section>

      {modalReservaAberto && roteiro && (
        <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="Revisar reserva">
          <div className="modalCard">
            <div className="modalHead"><div><span>Reserva PrussikTrails</span><h2>Revise sua jornada</h2><p>Confira os dados antes de gerar o QR Code PIX da sua reserva.</p></div><button type="button" className="modalClose" onClick={() => setModalReservaAberto(false)} disabled={reservando} aria-label="Fechar">×</button></div>
            <div className="modalBody">
              <div className="modalRoute"><div className="modalThumb">{fotoAtual ? <img src={fotoAtual} alt={tituloRoteiro(roteiro)} /> : <span>RT</span>}</div><div><strong>{tituloRoteiro(roteiro)}</strong><small>{localRoteiro(roteiro)}</small><small>{dataTexto}{horaTexto ? ` · ${horaTexto}` : ''}</small></div></div>
              <div className="modalInfoGrid"><div><span>Valor por pessoa</span><strong>{formatarMoeda(precoRoteiro(roteiro))}</strong></div><div><span>Pessoas</span><strong>{quantidadePessoas}</strong></div><div><span>Total da reserva</span><strong>{formatarMoeda(valorTotal)}</strong></div></div>
              <label className="modalQuantity"><span>Quantidade de pessoas</span><select value={quantidadePessoas} onChange={(event) => setQuantidadePessoas(Number(event.target.value))} disabled={reservando || esgotado}>{Array.from({ length: Math.max(1, Math.min(12, vagasRestantes || 12)) }).map((_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
              <p className="modalNote">Ao confirmar, criaremos a reserva e abriremos a tela de pagamento para gerar o QR Code PIX.</p>
              <div className="modalActions"><button type="button" className="modalCancel" onClick={() => setModalReservaAberto(false)} disabled={reservando}>Voltar</button><button type="button" className="modalConfirm" onClick={handleReservar} disabled={reservando || esgotado}>{reservando ? 'Criando reserva...' : 'Confirmar e gerar QR Code PIX'}</button></div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{styles}</style>
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
    background: rgba(255, 253, 247, 0.88);
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

  .hero {
    max-width: 1180px;
    margin: 18px auto 0;
    padding: 0 18px;
    display: grid;
    grid-template-columns: minmax(0, 1.07fr) minmax(340px, 0.93fr);
    gap: 22px;
    align-items: stretch;
  }

  .heroMedia {
    position: relative;
    min-height: 520px;
    border-radius: 36px;
    overflow: hidden;
    background: #d9dfcf;
    box-shadow: 0 28px 80px rgba(32, 60, 46, 0.16);
  }

  .heroMedia > img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .fallbackHero {
    height: 100%;
    min-height: 520px;
    display: grid;
    place-items: center;
    text-align: center;
    padding: 28px;
    background:
      radial-gradient(circle at 50% 20%, rgba(153, 27, 27, 0.13), transparent 30%),
      linear-gradient(135deg, #dfe7d2, #f7f0dd);
  }

  .fallbackHero img {
    width: 96px;
    height: 96px;
    object-fit: contain;
  }

  .fallbackHero span {
    display: block;
    max-width: 320px;
    color: #203c2e;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 30px;
    font-weight: 700;
    letter-spacing: -0.05em;
    line-height: 1;
  }

  .heroBadges {
    position: absolute;
    left: 18px;
    right: 18px;
    bottom: 18px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .heroBadges span {
    border-radius: 999px;
    padding: 9px 12px;
    background: rgba(255, 253, 247, 0.86);
    color: #203c2e;
    font-size: 12px;
    font-weight: 950;
    backdrop-filter: blur(12px);
  }

  .heroContent,
  .card,
  .bookingCard,
  .guideCard,
  .loadingCard,
  .emptyCard {
    border: 1px solid rgba(32, 60, 46, 0.08);
    border-radius: 30px;
    background: rgba(255, 253, 247, 0.82);
    box-shadow: 0 20px 56px rgba(32, 60, 46, 0.09);
    padding: 22px;
    min-width: 0;
    overflow: hidden;
    overflow-wrap: anywhere;
  }

  .heroContent {
    border-radius: 36px;
    padding: clamp(24px, 4vw, 44px);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .eyebrow {
    margin: 0 0 12px;
    color: #991b1b;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.18em;
  }

  .heroContent h1 {
    margin: 0;
    color: #172018;
    font-size: clamp(42px, 6vw, 76px);
    line-height: 0.92;
    letter-spacing: -0.075em;
    font-weight: 950;
  }

  .description {
    margin: 18px 0 0;
    color: rgba(23, 32, 24, 0.68);
    font-size: 16px;
    line-height: 1.65;
    font-weight: 650;
    overflow-wrap: anywhere;
  }

  .guideHeroCard {
    width: 100%;
    margin-top: 18px;
    border: 1px solid rgba(32, 60, 46, 0.1);
    border-radius: 24px;
    background: rgba(32, 60, 46, 0.055);
    padding: 12px;
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .guideMiniAvatar,
  .guideAvatar {
    overflow: hidden;
    background: #203c2e;
    color: #fffdf7;
    display: grid;
    place-items: center;
    font-weight: 950;
    flex: 0 0 auto;
  }

  .guideMiniAvatar {
    width: 48px;
    height: 48px;
    border-radius: 18px;
    font-size: 20px;
  }

  .guideMiniAvatar img,
  .guideAvatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .guideHeroCard small,
  .heroFacts span,
  .infoGrid span,
  .bookingLabel,
  .guideTop span {
    display: block;
    color: rgba(23, 32, 24, 0.52);
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 6px;
  }

  .guideHeroCard strong,
  .heroFacts strong,
  .infoGrid strong {
    display: block;
    color: #203c2e;
    font-size: 15px;
    line-height: 1.35;
    font-weight: 900;
  }

  .guideHeroCard em {
    display: block;
    margin-top: 3px;
    color: #7b8372;
    font-size: 11px;
    font-style: normal;
    font-weight: 850;
  }

  .guideHeroArrow {
    color: #991b1b;
    font-size: 12px;
    font-weight: 950;
    white-space: nowrap;
  }

  .heroFacts {
    margin-top: 24px;
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .heroFacts div,
  .infoGrid div {
    border-radius: 22px;
    background: rgba(32, 60, 46, 0.05);
    padding: 14px 16px;
  }

  .heroFacts small {
    display: block;
    margin-top: 4px;
    color: #7b8372;
    font-size: 12px;
    font-weight: 850;
  }

  .alert,
  .questionNotice {
    margin-top: 18px;
    border-radius: 18px;
    background: rgba(153, 27, 27, 0.08);
    border: 1px solid rgba(153, 27, 27, 0.16);
    color: #7f1d1d;
    padding: 12px 14px;
    font-size: 13px;
    font-weight: 850;
  }

  .mobileBooking { display: none; }

  .galleryStrip {
    max-width: 1180px;
    margin: 16px auto 0;
    padding: 0 18px;
    display: flex;
    gap: 10px;
    overflow-x: auto;
  }

  .galleryStrip button {
    width: 92px;
    height: 72px;
    flex: 0 0 auto;
    border: 3px solid transparent;
    border-radius: 18px;
    overflow: hidden;
    padding: 0;
    background: transparent;
    cursor: pointer;
  }

  .galleryStrip button.active { border-color: #991b1b; }
  .galleryStrip img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .contentGrid {
    max-width: 1180px;
    margin: 22px auto 0;
    padding: 0 18px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 22px;
    align-items: start;
  }

  .mainColumn { display: grid; gap: 18px; }
  .sideColumn { position: sticky; top: 92px; display: grid; gap: 18px; }

  .loadingCard,
  .emptyCard { max-width: 520px; margin: 80px auto; text-align: center; }
  .emptyCard span { font-size: 54px; }
  .emptyCard h1 { margin: 10px 0 0; font-size: 34px; letter-spacing: -0.05em; }
  .emptyCard p { color: #64748b; font-weight: 700; }
  .emptyCard button { border: 0; border-radius: 999px; padding: 12px 16px; background: #991b1b; color: #fffdf7; font-weight: 950; cursor: pointer; }

  .spinner { width: 34px; height: 34px; border: 4px solid rgba(32, 60, 46, 0.12); border-top-color: #991b1b; border-radius: 999px; margin: 0 auto 12px; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .sectionTitle { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 18px; }
  .sectionTitle.compact { margin-bottom: 14px; }
  .sectionTitle > span { width: 38px; height: 38px; border-radius: 14px; background: rgba(153, 27, 27, 0.1); color: #991b1b; display: grid; place-items: center; font-size: 13px; font-weight: 950; flex: 0 0 auto; }
  .sectionTitle h2 { margin: 0; font-size: 24px; line-height: 1; letter-spacing: -0.045em; color: #172018; }
  .sectionTitle p { margin: 6px 0 0; color: rgba(23, 32, 24, 0.58); font-size: 13px; font-weight: 750; }

  .infoGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .textList { display: grid; gap: 10px; }
  .textList p { margin: 0; border-radius: 18px; background: rgba(32, 60, 46, 0.045); color: rgba(23, 32, 24, 0.72); padding: 13px 14px; line-height: 1.55; font-size: 14px; font-weight: 700; }
  .splitCards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
  .bulletList { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
  .bulletList li { position: relative; padding-left: 22px; color: rgba(23, 32, 24, 0.72); font-size: 14px; line-height: 1.45; font-weight: 750; }
  .bulletList li::before { content: ''; position: absolute; left: 0; top: 7px; width: 8px; height: 8px; border-radius: 999px; background: #991b1b; }

  .questionsCard { display: grid; gap: 16px; }
  .questionBox { border-radius: 24px; background: rgba(32, 60, 46, 0.045); padding: 12px; display: grid; gap: 10px; }
  .questionBox textarea, .answerEditor textarea { width: 100%; min-height: 104px; resize: vertical; border: 1px solid rgba(32, 60, 46, 0.12); border-radius: 20px; background: rgba(255, 255, 255, 0.78); color: #172018; padding: 14px; font: inherit; font-size: 14px; line-height: 1.5; font-weight: 750; outline: none; }
  .questionActions { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .questionActions span { color: rgba(23, 32, 24, 0.5); font-size: 12px; font-weight: 850; }
  .questionActions button, .answerEditor button { border: 0; border-radius: 999px; background: #203c2e; color: #fffdf7; padding: 11px 14px; font-size: 12px; font-weight: 950; cursor: pointer; }
  .questionActions button:disabled, .answerEditor button:disabled { opacity: 0.58; cursor: not-allowed; }
  .questionsList { display: grid; gap: 12px; }
  .emptyQuestions { border-radius: 22px; background: rgba(32, 60, 46, 0.045); padding: 16px; }
  .emptyQuestions strong { display: block; color: #203c2e; font-size: 14px; font-weight: 950; }
  .emptyQuestions p { margin: 6px 0 0; color: rgba(23, 32, 24, 0.58); font-size: 13px; line-height: 1.4; font-weight: 750; }
  .questionItem { border-radius: 24px; background: rgba(255, 255, 255, 0.66); border: 1px solid rgba(32, 60, 46, 0.08); padding: 15px; display: grid; gap: 10px; }
  .questionHeader { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .questionHeader strong { display: block; color: #203c2e; font-size: 13px; font-weight: 950; }
  .questionHeader span, .questionHeader time { color: rgba(23, 32, 24, 0.48); font-size: 11px; font-weight: 850; }
  .questionText { margin: 0; color: rgba(23, 32, 24, 0.74); font-size: 14px; line-height: 1.55; font-weight: 760; }
  .answerBox { border-left: 4px solid #203c2e; border-radius: 18px; background: rgba(32, 60, 46, 0.06); padding: 12px; }
  .answerBox span { display: block; color: #203c2e; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 7px; }
  .answerBox p { margin: 0; color: rgba(23, 32, 24, 0.72); font-size: 13px; line-height: 1.5; font-weight: 750; }
  .answerEditor { display: grid; gap: 10px; }
  .answerEditor textarea { min-height: 92px; }
  .answerEditor button { justify-self: end; }
  .pendingAnswer { border-radius: 999px; background: rgba(123, 131, 114, 0.1); color: #64705b; padding: 9px 12px; font-size: 12px; font-weight: 850; width: fit-content; }

  .bookingCard { display: grid; gap: 14px; }
  .bookingPrice { color: #203c2e; font-size: 34px; line-height: 1; letter-spacing: -0.06em; }
  .bookingCard label { display: grid; gap: 7px; color: rgba(23, 32, 24, 0.58); font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; }
  .bookingCard select { width: 100%; border: 1px solid rgba(32, 60, 46, 0.12); border-radius: 18px; background: rgba(255, 255, 255, 0.72); color: #172018; padding: 12px 13px; font-size: 14px; font-weight: 850; outline: none; }
  .bookingTotal { border-radius: 20px; background: rgba(153, 27, 27, 0.08); padding: 14px; display: flex; justify-content: space-between; gap: 12px; align-items: center; }
  .bookingTotal span { color: #7f1d1d; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; }
  .bookingTotal strong { color: #7f1d1d; font-size: 20px; letter-spacing: -0.04em; }
  .reserveBtn, .guideBtn { width: 100%; border: 0; border-radius: 999px; background: #991b1b; color: #fffdf7; padding: 14px 16px; font-size: 14px; font-weight: 950; cursor: pointer; box-shadow: 0 18px 36px rgba(153, 27, 27, 0.18); }
  .reserveBtn:disabled { opacity: 0.58; cursor: not-allowed; box-shadow: none; }
  .bookingNote { margin: 0; color: rgba(23, 32, 24, 0.52); font-size: 12px; line-height: 1.45; font-weight: 750; }

  .guideTop { display: flex; gap: 12px; align-items: center; }
  .guideAvatar { width: 58px; height: 58px; border-radius: 22px; font-size: 22px; }
  .guideTop strong { display: block; color: #172018; font-size: 16px; font-weight: 950; }
  .guideTop small { display: block; margin-top: 4px; color: #7b8372; font-size: 11px; font-weight: 850; }
  .guideCard p { margin: 14px 0; color: rgba(23, 32, 24, 0.64); font-size: 13px; line-height: 1.5; font-weight: 700; }
  .guideCardClickable { cursor: pointer; transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; }
  .guideCardClickable:hover, .guideCardClickable:focus { transform: translateY(-2px); border-color: rgba(32, 60, 46, 0.18); box-shadow: 0 24px 64px rgba(32, 60, 46, 0.13); outline: none; }
  .guideBtn { background: #203c2e; box-shadow: 0 18px 36px rgba(32, 60, 46, 0.14); }

  .modalOverlay { position: fixed; inset: 0; z-index: 1000; background: rgba(23, 32, 24, 0.58); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; padding: 18px; }
  .modalCard { width: min(560px, 100%); max-height: calc(100vh - 36px); overflow: auto; border-radius: 34px; background: #fffdf7; border: 1px solid rgba(255,255,255,0.28); box-shadow: 0 30px 90px rgba(15, 23, 42, 0.34); }
  .modalHead { display: flex; justify-content: space-between; gap: 16px; padding: 24px; color: #ffffff; background: radial-gradient(circle at top right, rgba(190, 242, 100, 0.30), transparent 36%), linear-gradient(135deg, #172018, #203c2e); }
  .modalHead span { display: inline-flex; color: #bef264; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 8px; }
  .modalHead h2 { margin: 0; font-size: 31px; line-height: 0.95; font-weight: 950; letter-spacing: -0.07em; }
  .modalHead p { margin: 9px 0 0; color: rgba(255,255,255,0.78); font-size: 13px; line-height: 1.45; font-weight: 750; }
  .modalClose { width: 38px; height: 38px; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.10); color: #ffffff; border-radius: 999px; font-size: 24px; font-weight: 850; line-height: 1; cursor: pointer; flex: 0 0 auto; }
  .modalBody { padding: 20px; }
  .modalRoute { display: grid; grid-template-columns: 86px minmax(0, 1fr); gap: 13px; align-items: center; padding: 12px; border-radius: 24px; background: #f6f7f1; border: 1px solid rgba(15, 23, 42, 0.06); margin-bottom: 13px; }
  .modalThumb { width: 86px; height: 86px; border-radius: 22px; overflow: hidden; background: #e8eadf; display: flex; align-items: center; justify-content: center; color: #64748b; font-weight: 950; }
  .modalThumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .modalRoute strong { display: block; color: #172018; font-size: 16px; line-height: 1.25; font-weight: 950; }
  .modalRoute small { display: block; color: #64748b; font-size: 12px; line-height: 1.35; font-weight: 750; margin-top: 4px; }
  .modalInfoGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; margin-bottom: 13px; }
  .modalInfoGrid div { background: #fffdf7; border: 1px solid rgba(15, 23, 42, 0.06); border-radius: 19px; padding: 12px; }
  .modalInfoGrid span { display: block; color: #7b8372; font-size: 10px; font-weight: 950; text-transform: uppercase; letter-spacing: 0.06em; }
  .modalInfoGrid strong { display: block; margin-top: 5px; color: #172018; font-size: 15px; font-weight: 950; }
  .modalQuantity { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: #f6f7f1; border: 1px solid rgba(15, 23, 42, 0.06); border-radius: 22px; padding: 13px 14px; color: #172018; font-size: 13px; font-weight: 950; margin-bottom: 13px; }
  .modalQuantity select { border: 1px solid rgba(15,23,42,0.10); background: #ffffff; color: #172018; border-radius: 999px; padding: 10px 13px; font-weight: 950; outline: none; }
  .modalNote { margin: 0 0 15px; color: #64748b; font-size: 12px; line-height: 1.45; font-weight: 750; }
  .modalActions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
  .modalCancel, .modalConfirm { border: none; border-radius: 999px; padding: 13px 16px; font-size: 12px; font-weight: 950; cursor: pointer; }
  .modalCancel { background: #e5e7eb; color: #374151; }
  .modalConfirm { background: #172018; color: #ffffff; }
  .modalCancel:disabled, .modalConfirm:disabled { opacity: 0.62; cursor: not-allowed; }

  @media (min-width: 941px) {
    .page { padding-top: 84px; }
    .topbar { position: fixed; top: 0; left: 0; right: 0; z-index: 80; height: 84px; padding: 8px 26px; display: flex; align-items: center; background: rgba(255, 253, 247, 0.94); border-bottom: 1px solid rgba(15, 23, 42, 0.06); backdrop-filter: blur(18px); box-shadow: 0 10px 28px rgba(15, 23, 42, 0.045); }
    .topbarInner { width: 100%; max-width: 1180px; height: 68px; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 18px; }
    .headerGhost { display: none; }
    .brandCenter { grid-column: 1; justify-self: start; width: fit-content; max-width: 100%; min-width: 0; display: flex; flex-direction: row; align-items: center; justify-content: flex-start; gap: 14px; padding: 0; text-align: left; }
    .brandLogo { width: 128px; max-width: 128px; height: 58px; object-fit: contain; display: block; flex: 0 0 auto; }
    .brandSubtitle { margin-top: 0; max-width: 460px; color: #6b7280; font-size: 10px; line-height: 1.1; font-weight: 900; letter-spacing: 0.11em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .profileButton, .loginButton { grid-column: 2; justify-self: end; width: 44px; height: 44px; flex: 0 0 auto; }
    .hero { margin-top: 18px; }
    .sideColumn { top: 104px; }
  }

  @media (max-width: 940px) {
    .hero, .contentGrid { grid-template-columns: 1fr; }
    .heroMedia { min-height: 380px; }
    .sideColumn { position: static; }
    .bookingCard { display: none; }
    .mobileBooking { margin-top: 18px; display: flex; justify-content: space-between; align-items: center; gap: 12px; border-radius: 22px; background: rgba(153, 27, 27, 0.08); padding: 12px; }
    .mobileBooking strong { color: #7f1d1d; font-size: 20px; letter-spacing: -0.04em; }
    .mobileBooking button { border: 0; border-radius: 999px; background: #991b1b; color: #fffdf7; padding: 12px 15px; font-size: 13px; font-weight: 950; cursor: pointer; white-space: nowrap; }
    .mobileBooking button:disabled { opacity: 0.58; cursor: not-allowed; }
  }

  @media (max-width: 640px) {
    .modalOverlay { padding: 10px; align-items: flex-end; }
    .modalCard { border-radius: 28px 28px 22px 22px; max-height: calc(100vh - 20px); }
    .modalHead { padding: 20px; }
    .modalHead h2 { font-size: 27px; }
    .modalRoute { grid-template-columns: 72px minmax(0, 1fr); }
    .modalThumb { width: 72px; height: 72px; border-radius: 18px; }
    .modalInfoGrid { grid-template-columns: 1fr; }
    .modalQuantity { align-items: stretch; flex-direction: column; }
    .modalQuantity select, .modalCancel, .modalConfirm { width: 100%; }
    .topbar { padding: 7px 10px; }
    .topbarInner { grid-template-columns: 38px minmax(0, 1fr) 38px; }
    .headerGhost, .profileButton, .loginButton { width: 36px; height: 36px; box-shadow: none; }
    .brandLogo { width: clamp(154px, 58vw, 218px); }
    .brandSubtitle { font-size: 8.5px; letter-spacing: 0.06em; margin-top: -2px; }
    .hero { margin-top: 8px; padding: 0 12px; gap: 12px; }
    .heroMedia { min-height: 270px; border-radius: 26px; }
    .fallbackHero { min-height: 270px; }
    .heroContent { border-radius: 26px; padding: 20px; }
    .heroContent h1 { font-size: 40px; }
    .description { font-size: 14px; line-height: 1.5; }
    .guideHeroCard { grid-template-columns: 42px minmax(0, 1fr); border-radius: 20px; padding: 10px; }
    .guideMiniAvatar { width: 42px; height: 42px; border-radius: 16px; }
    .guideHeroArrow { grid-column: 2; font-size: 11px; }
    .heroFacts { gap: 8px; margin-top: 16px; }
    .heroFacts div { border-radius: 18px; padding: 12px; }
    .galleryStrip { padding: 0 12px; margin-top: 12px; }
    .galleryStrip button { width: 76px; height: 62px; border-radius: 15px; }
    .contentGrid { padding: 0 12px; margin-top: 12px; gap: 12px; }
    .card, .guideCard { border-radius: 24px; padding: 18px; }
    .sectionTitle h2 { font-size: 21px; }
    .infoGrid, .splitCards { grid-template-columns: 1fr; }
    .mobileBooking { align-items: stretch; flex-direction: column; }
    .mobileBooking button { width: 100%; }
    .questionActions { align-items: stretch; flex-direction: column; }
    .questionActions button, .answerEditor button { width: 100%; justify-self: stretch; }
    .questionHeader { flex-direction: column; gap: 4px; }
  }
`
