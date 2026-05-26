'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type UsuarioLocal = {
  id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  cliente_id?: string | null
  guia_id?: string | null
  nome?: string | null
  email?: string | null
  tipo?: string | null
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

function extrairUsuarioId(usuario: UsuarioLocal | null): string {
  return String(
    usuario?.id ||
      usuario?.user_id ||
      usuario?.usuario_id ||
      usuario?.cliente_id ||
      usuario?.guia_id ||
      ''
  ).trim()
}

function textoSeguro(valor: unknown, fallback = '') {
  const texto = String(valor || '').trim()
  return texto || fallback
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
    return valor
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  }

  if (typeof valor === 'string') {
    const texto = valor.trim()

    if (!texto) return []

    try {
      const parsed = JSON.parse(texto)

      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || '').trim())
          .filter(Boolean)
      }
    } catch {
      // mantém fallback abaixo
    }

    return texto
      .split(/,|\n|\|/g)
      .map((item) => item.trim())
      .filter(Boolean)
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
    carregarRoteiro()
    carregarPerguntas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const tituloRoteiro = (item?: Roteiro | null) => {
    return textoSeguro(item?.titulo || item?.nome, 'Roteiro PrussikTrails')
  }

  const guiaIdRoteiro = (item?: Roteiro | null) => {
    return String(
      item?.id_guia ||
        item?.guia_id ||
        item?.id_user ||
        item?.usuario_id ||
        item?.criador_id ||
        item?.created_by ||
        item?.user_id ||
        ''
    ).trim()
  }

  const guiaFallbackDoRoteiro = (item?: Roteiro | null): Guia | null => {
    const guiaId = guiaIdRoteiro(item)

    if (!item || !guiaId) return null

    return {
      id: guiaId,
      nome:
        item.guia_nome ||
        item.nome_guia ||
        item.guia_name ||
        item.guia_email ||
        'Guia PrussikTrails',
      email: item.guia_email || null,
      avatar_url: item.guia_avatar_url || item.guia_foto_url || null
    }
  }

  const nomeGuia = (item?: Guia | null) => {
    return textoSeguro(item?.nome || item?.name || item?.email, 'Guia PrussikTrails')
  }

  const avatarGuia = (item?: Guia | null) => {
    return String(item?.avatar_url || item?.foto_url || item?.imagem_url || '').trim()
  }

  const localRoteiro = (item?: Roteiro | null) => {
    const local = textoSeguro(item?.localizacao || item?.local)

    if (local) return local

    const cidadeEstado = [item?.cidade, item?.estado]
      .map((parte) => String(parte || '').trim())
      .filter(Boolean)
      .join(' / ')

    return cidadeEstado || 'Local a definir'
  }

  const precoRoteiro = (item?: Roteiro | null) => {
    return Number(item?.preco ?? item?.valor ?? 0) || 0
  }

  const kmRoteiro = (item?: Roteiro | null) => {
    return Number(item?.km ?? item?.distancia_km ?? 0) || 0
  }

  const duracaoRoteiro = (item?: Roteiro | null) => {
    return Number(item?.duracao_horas ?? item?.duracao ?? 0) || 0
  }

  const limitePessoas = (item?: Roteiro | null) => {
    const valor =
      item?.limite_pessoas ??
      item?.capacidade ??
      item?.max_pessoas ??
      null

    if (valor === null || valor === undefined || valor === '') return null

    const numero = Number(valor)

    if (!Number.isFinite(numero) || numero <= 0) return null

    return numero
  }

  const dataPrincipal = (item?: Roteiro | null) => {
    return (
      item?.proxima_data ||
      item?.embarque_data_hora ||
      item?.embarque_data ||
      item?.data_trilha ||
      item?.data_roteiro ||
      ''
    )
  }

  const dataRetorno = (item?: Roteiro | null) => {
    return item?.retorno_data_hora || item?.retorno_data || ''
  }

  const fotoCapa = (item?: Roteiro | null) => {
    return String(
      item?.foto_capa ||
        item?.imagem_url ||
        item?.imagem ||
        item?.foto_url ||
        ''
    ).trim()
  }

  const fotosRoteiro = useMemo(() => {
    if (!roteiro) return []

    const capa = fotoCapa(roteiro)
    const galeria = [
      ...parseGaleria(roteiro.galeria_fotos),
      ...parseGaleria(roteiro.fotos)
    ]

    const unicas = Array.from(new Set([capa, ...galeria].filter(Boolean)))

    return unicas
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

    const ocupadas = (data || [])
      .filter((reserva) => {
        if (normalizar(reserva.status) === 'cancelada') return false

        if (!dataReferencia) return true

        const dataReserva = String(
          reserva.data_trilha || reserva.data_reserva || ''
        ).slice(0, 10)

        if (!dataReserva) return true

        return dataReserva === dataReferencia
      })
      .reduce((total, reserva) => {
        return total + Number(reserva.quantidade_pessoas || reserva.quantidade || 1)
      }, 0)

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

      if (roteiroData.ativo === false) {
        setMensagem('Este roteiro não está disponível no momento.')
      }

      const status = normalizar(roteiroData.status)

      if (
        status === 'cancelado' ||
        status === 'cancelada' ||
        status === 'reprovado' ||
        status === 'pausado' ||
        status === 'excluido'
      ) {
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

        if (!guiaError && guiaData) {
          setGuia(guiaData as Guia)
        }
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

      const { data, error } = await supabase
        .from('roteiro_perguntas')
        .select('*')
        .eq('roteiro_id', id)
        .neq('status', 'removida')
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Perguntas públicas ainda não disponíveis:', error)
        setPerguntas([])
        setPerguntasAviso('A caixa de perguntas ainda precisa ser ativada no banco de dados.')
        return
      }

      setPerguntas((data || []) as PerguntaPublica[])
    } catch (error) {
      console.warn('Erro ao carregar perguntas públicas:', error)
      setPerguntas([])
    }
  }

  async function enviarPerguntaPublica() {
    if (!roteiro) return

    const texto = novaPergunta.trim()

    if (!texto) {
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

      const nome = textoSeguro(
        usuarioLogado?.nome || usuarioLogado?.email,
        'Aventureiro PrussikTrails'
      )

      const { error } = await supabase.from('roteiro_perguntas').insert({
        roteiro_id: roteiro.id,
        cliente_id: idUsuarioLogado,
        cliente_nome: nome,
        pergunta: texto,
        status: 'publicada',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      if (error) throw error

      setNovaPergunta('')
      setPerguntasAviso('Pergunta publicada. O guia poderá responder aqui no roteiro.')
      await carregarPerguntas()
    } catch (error) {
      console.error('Erro ao enviar pergunta pública:', error)
      setPerguntasAviso('Não foi possível publicar a pergunta agora.')
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

      const { error } = await supabase
        .from('roteiro_perguntas')
        .update({
          resposta,
          respondido_por: idUsuarioLogado,
          respondido_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'respondida'
        })
        .eq('id', perguntaId)
        .eq('roteiro_id', id)

      if (error) throw error

      setRespostasGuia((prev) => ({ ...prev, [perguntaId]: '' }))
      await carregarPerguntas()
    } catch (error) {
      console.error('Erro ao responder pergunta pública:', error)
      setPerguntasAviso('Não foi possível publicar a resposta agora.')
    } finally {
      setRespondendoPerguntaId('')
    }
  }

  const formatarMoeda = (valor: unknown) => {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  const formatarData = (valor?: string | null) => {
    if (!valor) return 'Data a combinar'

    const texto = String(valor)
    const normalizada = texto.length <= 10 ? `${texto.slice(0, 10)}T12:00:00` : texto
    const data = new Date(normalizada)

    if (Number.isNaN(data.getTime())) return 'Data a combinar'

    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatarHora = (valor?: string | null) => {
    if (!valor) return ''

    const data = new Date(String(valor))

    if (Number.isNaN(data.getTime())) return ''

    return data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const labelDificuldade = (valor?: string | null) => {
    const texto = String(valor || '').trim()
    if (!texto) return 'Nível livre'

    return texto.charAt(0).toUpperCase() + texto.slice(1)
  }

  async function handleReservar() {
    if (!roteiro) return

    const idLogado = extrairUsuarioId(usuarioLogado)

    if (!idLogado) {
      localStorage.setItem('redirectAfterLogin', `/roteiros/${id}`)
      router.push('/login')
      return
    }

    if (usuarioLogado?.tipo !== 'cliente') {
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

      const payload = {
        cliente_id: idLogado,
        roteiro_id: roteiro.id,
        data_trilha: String(dataPrincipal(roteiro) || '').slice(0, 10) || null,
        quantidade_pessoas: quantidade,
        valor_total: precoRoteiro(roteiro) * quantidade,
        status: 'pendente',
        pagamento_status: 'pendente',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('reservas')
        .insert(payload)
        .select('id')
        .maybeSingle()

      if (error) throw error

      const reserva = data as ReservaCriada | null

      if (!reserva?.id) {
        router.push('/cliente/minhas-reservas')
        return
      }

      router.push(`/cliente/pagamento/${reserva.id}`)
    } catch (error) {
      console.error('Erro ao reservar roteiro:', error)
      setMensagem('Não foi possível criar a reserva agora.')
    } finally {
      setReservando(false)
    }
  }

  if (carregando) {
    return (
      <main className="page">
        <header className="topbar">
          <div className="brand">
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />
            <div>
              <strong>PrussikTrails</strong>
              <span>Detalhes do roteiro</span>
            </div>
          </div>
        </header>

        <section className="loadingCard">
          <div className="spinner" />
          <p>Carregando roteiro...</p>
        </section>

        <style jsx>{styles}</style>
      </main>
    )
  }

  if (!roteiro) {
    return (
      <main className="page">
        <header className="topbar">
          <button type="button" className="backButton" onClick={() => router.push('/roteiros')}>
            ← Voltar
          </button>
        </header>

        <section className="emptyCard">
          <span>🧭</span>
          <h1>Roteiro não encontrado</h1>
          <p>{mensagem || 'Não conseguimos localizar este roteiro.'}</p>
          <button type="button" onClick={() => router.push('/roteiros')}>
            Ver outros roteiros
          </button>
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
      <header className="topbar">
        <button
          type="button"
          className="brand"
          onClick={() => router.push('/roteiros')}
          aria-label="Voltar para roteiros"
        >
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>
            <strong>PrussikTrails</strong>
            <span>Detalhes do roteiro</span>
          </div>
        </button>

        <button type="button" className="ghostBtn" onClick={() => router.push('/roteiros')}>
          ← Roteiros
        </button>
      </header>

      <section className="hero">
        <div className="heroMedia">
          {fotoAtual ? (
            <img src={fotoAtual} alt={tituloRoteiro(roteiro)} />
          ) : (
            <div className="fallbackHero">
              <img src="/logo-prussik-display.png" alt="" />
              <span>A jornada começa quando o conforto termina</span>
            </div>
          )}

          <div className="heroBadges">
            <span>{labelDificuldade(roteiro.dificuldade)}</span>
            <span>{kmRoteiro(roteiro)} km</span>
          </div>
        </div>

        <div className="heroContent">
          <p className="eyebrow">Experiência PrussikTrails</p>
          <h1>{tituloRoteiro(roteiro)}</h1>

          <p className="description">
            {roteiro.descricao ||
              'Uma experiência outdoor conduzida por guia, com reserva segura e acompanhamento dentro do app.'}
          </p>

          {guiaAtual && (
            <button type="button" className="guideHeroCard" onClick={abrirPerfilGuia}>
              <div className="guideMiniAvatar">
                {avatarGuia(guiaAtual) ? (
                  <img src={avatarGuia(guiaAtual)} alt={nomeGuia(guiaAtual)} />
                ) : (
                  <span>{nomeGuia(guiaAtual).charAt(0).toUpperCase()}</span>
                )}
              </div>

              <div>
                <small>Experiência conduzida por</small>
                <strong>{nomeGuia(guiaAtual)}</strong>
                {(guiaAtual.cadastur || guiaAtual.cadastro_turismo) && (
                  <em>CADASTUR {guiaAtual.cadastur || guiaAtual.cadastro_turismo}</em>
                )}
              </div>

              <span className="guideHeroArrow">Ver perfil →</span>
            </button>
          )}

          <div className="heroFacts">
            <div>
              <span>Data</span>
              <strong>{dataTexto}</strong>
              {horaTexto && <small>{horaTexto}</small>}
            </div>

            <div>
              <span>Local</span>
              <strong>{localRoteiro(roteiro)}</strong>
            </div>

            <div>
              <span>Duração</span>
              <strong>{duracaoRoteiro(roteiro) || 'A combinar'} h</strong>
            </div>
          </div>

          {mensagem && <div className="alert">{mensagem}</div>}

          <div className="mobileBooking">
            <strong>{formatarMoeda(precoRoteiro(roteiro))}</strong>
            <button
              type="button"
              onClick={handleReservar}
              disabled={reservando || esgotado}
            >
              {esgotado ? 'Esgotado' : reservando ? 'Reservando...' : 'Reservar'}
            </button>
          </div>
        </div>
      </section>

      {fotosRoteiro.length > 1 && (
        <section className="galleryStrip">
          {fotosRoteiro.map((foto, index) => (
            <button
              type="button"
              key={`${foto}-${index}`}
              className={fotoSelecionada === index ? 'active' : ''}
              onClick={() => setFotoSelecionada(index)}
              aria-label={`Ver foto ${index + 1}`}
            >
              <img src={foto} alt="" />
            </button>
          ))}
        </section>
      )}

      <section className="contentGrid">
        <div className="mainColumn">
          <section className="card">
            <div className="sectionTitle">
              <span>01</span>
              <div>
                <h2>Sobre a experiência</h2>
                <p>O essencial para entender o roteiro antes da reserva.</p>
              </div>
            </div>

            <div className="infoGrid">
              <div>
                <span>Embarque</span>
                <strong>{roteiro.embarque_local || roteiro.local_encontro || roteiro.ponto_encontro || 'A combinar'}</strong>
              </div>

              <div>
                <span>Retorno</span>
                <strong>{roteiro.retorno_local || 'A combinar'}</strong>
              </div>

              <div>
                <span>Vagas</span>
                <strong>
                  {vagasRestantes === null
                    ? 'Sem limite informado'
                    : vagasRestantes > 0
                      ? `${vagasRestantes} disponível(is)`
                      : 'Esgotado'}
                </strong>
              </div>

              <div>
                <span>Recorrência</span>
                <strong>{roteiro.recorrencia || 'Experiência única'}</strong>
              </div>
            </div>
          </section>

          {detalhes.length > 0 && (
            <section className="card">
              <div className="sectionTitle">
                <span>02</span>
                <div>
                  <h2>Roteiro detalhado</h2>
                  <p>Como a aventura deve acontecer.</p>
                </div>
              </div>

              <div className="textList">
                {detalhes.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </section>
          )}

          {(inclui.length > 0 || naoInclui.length > 0) && (
            <section className="splitCards">
              {inclui.length > 0 && (
                <div className="card">
                  <div className="sectionTitle compact">
                    <span>✓</span>
                    <div>
                      <h2>Inclui</h2>
                      <p>Itens informados pelo guia.</p>
                    </div>
                  </div>

                  <ul className="bulletList">
                    {inclui.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {naoInclui.length > 0 && (
                <div className="card">
                  <div className="sectionTitle compact">
                    <span>!</span>
                    <div>
                      <h2>Não inclui</h2>
                      <p>Planeje-se antes de sair.</p>
                    </div>
                  </div>

                  <ul className="bulletList">
                    {naoInclui.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {orientacoes.length > 0 && (
            <section className="card">
              <div className="sectionTitle">
                <span>03</span>
                <div>
                  <h2>Orientações importantes</h2>
                  <p>Leia antes de reservar.</p>
                </div>
              </div>

              <ul className="bulletList">
                {orientacoes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="card questionsCard">
            <div className="sectionTitle">
              <span>?</span>
              <div>
                <h2>Perguntas públicas</h2>
                <p>Clientes perguntam no roteiro e o guia responde de forma transparente.</p>
              </div>
            </div>

            {!ehGuiaDono && (
              <div className="questionBox">
                <textarea
                  value={novaPergunta}
                  onChange={(event) => setNovaPergunta(event.target.value)}
                  placeholder={idUsuarioLogado ? 'Pergunte sobre ponto de encontro, preparo físico, equipamentos ou qualquer detalhe do roteiro.' : 'Faça login para enviar uma pergunta pública ao guia.'}
                  maxLength={700}
                  disabled={!idUsuarioLogado || enviandoPergunta}
                />

                <div className="questionActions">
                  <span>{novaPergunta.length}/700</span>
                  <button
                    type="button"
                    onClick={idUsuarioLogado ? enviarPerguntaPublica : () => router.push('/login')}
                    disabled={enviandoPergunta}
                  >
                    {idUsuarioLogado
                      ? enviandoPergunta
                        ? 'Publicando...'
                        : 'Enviar pergunta'
                      : 'Entrar para perguntar'}
                  </button>
                </div>
              </div>
            )}

            {perguntasAviso && <div className="questionNotice">{perguntasAviso}</div>}

            <div className="questionsList">
              {perguntas.length === 0 ? (
                <div className="emptyQuestions">
                  <strong>Ainda não há perguntas públicas.</strong>
                  <p>Seja o primeiro a perguntar algo útil para outros aventureiros.</p>
                </div>
              ) : (
                perguntas.map((pergunta) => (
                  <article key={pergunta.id} className="questionItem">
                    <div className="questionHeader">
                      <div>
                        <strong>{pergunta.cliente_nome || 'Aventureiro PrussikTrails'}</strong>
                        <span>perguntou</span>
                      </div>

                      {pergunta.created_at && (
                        <time>{formatarData(pergunta.created_at)}</time>
                      )}
                    </div>

                    <p className="questionText">{pergunta.pergunta}</p>

                    {pergunta.resposta ? (
                      <div className="answerBox">
                        <span>Resposta do guia</span>
                        <p>{pergunta.resposta}</p>
                      </div>
                    ) : ehGuiaDono ? (
                      <div className="answerEditor">
                        <textarea
                          value={respostasGuia[pergunta.id] || ''}
                          onChange={(event) =>
                            setRespostasGuia((prev) => ({
                              ...prev,
                              [pergunta.id]: event.target.value
                            }))
                          }
                          placeholder="Responder publicamente esta pergunta..."
                          maxLength={900}
                          disabled={respondendoPerguntaId === pergunta.id}
                        />

                        <button
                          type="button"
                          onClick={() => responderPerguntaPublica(pergunta.id)}
                          disabled={respondendoPerguntaId === pergunta.id}
                        >
                          {respondendoPerguntaId === pergunta.id ? 'Publicando...' : 'Responder como guia'}
                        </button>
                      </div>
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

            <label>
              Pessoas
              <select
                value={quantidadePessoas}
                onChange={(event) => setQuantidadePessoas(Number(event.target.value))}
                disabled={esgotado}
              >
                {Array.from({ length: Math.max(1, Math.min(12, vagasRestantes || 12)) }).map((_, index) => (
                  <option key={index + 1} value={index + 1}>
                    {index + 1}
                  </option>
                ))}
              </select>
            </label>

            <div className="bookingTotal">
              <span>Total</span>
              <strong>{formatarMoeda(valorTotal)}</strong>
            </div>

            <button
              type="button"
              className="reserveBtn"
              onClick={handleReservar}
              disabled={reservando || esgotado}
            >
              {esgotado ? 'Roteiro esgotado' : reservando ? 'Criando reserva...' : 'Reservar agora'}
            </button>

            <p className="bookingNote">
              O pagamento será feito na próxima etapa com confirmação automática quando disponível.
            </p>
          </section>

          {guiaAtual && (
            <section
              className="guideCard guideCardClickable"
              role="button"
              tabIndex={0}
              onClick={abrirPerfilGuia}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  abrirPerfilGuia()
                }
              }}
            >
              <div className="guideTop">
                <div className="guideAvatar">
                  {avatarGuia(guiaAtual) ? (
                    <img src={avatarGuia(guiaAtual)} alt={nomeGuia(guiaAtual)} />
                  ) : (
                    <span>{nomeGuia(guiaAtual).charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <div>
                  <span>Guia responsável</span>
                  <strong>{nomeGuia(guiaAtual)}</strong>
                  {(guiaAtual.cadastur || guiaAtual.cadastro_turismo) && (
                    <small>CADASTUR {guiaAtual.cadastur || guiaAtual.cadastro_turismo}</small>
                  )}
                </div>
              </div>

              {guiaAtual.bio && <p>{guiaAtual.bio}</p>}

              <div className="guideBtn fakeGuideBtn">Ver perfil do guia</div>
            </section>
          )}
        </aside>
      </section>

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
    max-width: 1180px;
    margin: 0 auto;
    padding: 14px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    backdrop-filter: blur(18px);
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    border: 0;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .brand img {
    width: 38px;
    height: 38px;
    object-fit: contain;
    flex: 0 0 auto;
  }

  .brand div {
    min-width: 0;
    display: flex;
    flex-direction: column;
    line-height: 1;
  }

  .brand strong {
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(26px, 3.8vw, 44px);
    font-weight: 700;
    color: #203c2e;
    line-height: 0.92;
    letter-spacing: -0.055em;
    white-space: nowrap;
  }

  .brand span {
    margin-top: 5px;
    font-size: clamp(10px, 1.4vw, 14px);
    font-weight: 850;
    color: #7b8372;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .ghostBtn,
  .backButton {
    border: 1px solid rgba(32, 60, 46, 0.14);
    background: rgba(255, 253, 247, 0.74);
    color: #203c2e;
    border-radius: 999px;
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 900;
    cursor: pointer;
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

  .heroContent {
    border: 1px solid rgba(32, 60, 46, 0.08);
    border-radius: 36px;
    background: rgba(255, 253, 247, 0.78);
    box-shadow: 0 24px 70px rgba(32, 60, 46, 0.1);
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

  .guideHeroCard:hover {
    border-color: rgba(32, 60, 46, 0.22);
    background: rgba(32, 60, 46, 0.08);
  }

  .guideMiniAvatar {
    width: 48px;
    height: 48px;
    border-radius: 18px;
    overflow: hidden;
    background: #203c2e;
    color: #fffdf7;
    display: grid;
    place-items: center;
    font-size: 20px;
    font-weight: 950;
  }

  .guideMiniAvatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .guideHeroCard small {
    display: block;
    color: rgba(23, 32, 24, 0.52);
    font-size: 10px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 4px;
  }

  .guideHeroCard strong {
    display: block;
    color: #203c2e;
    font-size: 15px;
    line-height: 1.2;
    font-weight: 950;
    overflow-wrap: anywhere;
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

  .heroFacts div {
    border-radius: 22px;
    background: rgba(32, 60, 46, 0.05);
    padding: 14px 16px;
  }

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

  .heroFacts strong,
  .infoGrid strong {
    display: block;
    color: #203c2e;
    font-size: 15px;
    line-height: 1.35;
    font-weight: 900;
  }

  .heroFacts small {
    display: block;
    margin-top: 4px;
    color: #7b8372;
    font-size: 12px;
    font-weight: 850;
  }

  .alert {
    margin-top: 18px;
    border-radius: 18px;
    background: rgba(153, 27, 27, 0.08);
    border: 1px solid rgba(153, 27, 27, 0.16);
    color: #7f1d1d;
    padding: 12px 14px;
    font-size: 13px;
    font-weight: 850;
  }

  .mobileBooking {
    display: none;
  }

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

  .galleryStrip button.active {
    border-color: #991b1b;
  }

  .galleryStrip img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .contentGrid {
    max-width: 1180px;
    margin: 22px auto 0;
    padding: 0 18px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 22px;
    align-items: start;
  }

  .mainColumn {
    display: grid;
    gap: 18px;
  }

  .sideColumn {
    position: sticky;
    top: 92px;
    display: grid;
    gap: 18px;
  }

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

  .heroContent,
  .heroFacts div,
  .infoGrid div,
  .textList p,
  .bulletList li,
  .guideTop div,
  .bookingTotal,
  .questionItem,
  .answerBox {
    min-width: 0;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .loadingCard,
  .emptyCard {
    max-width: 520px;
    margin: 80px auto;
    text-align: center;
  }

  .emptyCard span {
    font-size: 54px;
  }

  .emptyCard h1 {
    margin: 10px 0 0;
    font-size: 34px;
    letter-spacing: -0.05em;
  }

  .emptyCard p {
    color: #64748b;
    font-weight: 700;
  }

  .emptyCard button {
    border: 0;
    border-radius: 999px;
    padding: 12px 16px;
    background: #991b1b;
    color: #fffdf7;
    font-weight: 950;
    cursor: pointer;
  }

  .spinner {
    width: 34px;
    height: 34px;
    border: 4px solid rgba(32, 60, 46, 0.12);
    border-top-color: #991b1b;
    border-radius: 999px;
    margin: 0 auto 12px;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .sectionTitle {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    margin-bottom: 18px;
  }

  .sectionTitle.compact {
    margin-bottom: 14px;
  }

  .sectionTitle > span {
    width: 38px;
    height: 38px;
    border-radius: 14px;
    background: rgba(153, 27, 27, 0.1);
    color: #991b1b;
    display: grid;
    place-items: center;
    font-size: 13px;
    font-weight: 950;
    flex: 0 0 auto;
  }

  .sectionTitle h2 {
    margin: 0;
    font-size: 24px;
    line-height: 1;
    letter-spacing: -0.045em;
    color: #172018;
  }

  .sectionTitle p {
    margin: 6px 0 0;
    color: rgba(23, 32, 24, 0.58);
    font-size: 13px;
    font-weight: 750;
  }

  .infoGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .infoGrid div {
    border-radius: 20px;
    background: rgba(32, 60, 46, 0.045);
    padding: 14px;
  }

  .textList {
    display: grid;
    gap: 10px;
  }

  .textList p {
    margin: 0;
    border-radius: 18px;
    background: rgba(32, 60, 46, 0.045);
    color: rgba(23, 32, 24, 0.72);
    padding: 13px 14px;
    line-height: 1.55;
    font-size: 14px;
    font-weight: 700;
  }

  .splitCards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }

  .bulletList {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 10px;
  }

  .bulletList li {
    position: relative;
    padding-left: 22px;
    color: rgba(23, 32, 24, 0.72);
    font-size: 14px;
    line-height: 1.45;
    font-weight: 750;
  }

  .bulletList li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 7px;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #991b1b;
  }

  .questionsCard {
    display: grid;
    gap: 16px;
  }

  .questionBox {
    border-radius: 24px;
    background: rgba(32, 60, 46, 0.045);
    padding: 12px;
    display: grid;
    gap: 10px;
  }

  .questionBox textarea,
  .answerEditor textarea {
    width: 100%;
    min-height: 104px;
    resize: vertical;
    border: 1px solid rgba(32, 60, 46, 0.12);
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.78);
    color: #172018;
    padding: 14px;
    font: inherit;
    font-size: 14px;
    line-height: 1.5;
    font-weight: 750;
    outline: none;
  }

  .questionBox textarea:focus,
  .answerEditor textarea:focus {
    border-color: rgba(153, 27, 27, 0.34);
    box-shadow: 0 0 0 4px rgba(153, 27, 27, 0.08);
  }

  .questionActions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }

  .questionActions span {
    color: rgba(23, 32, 24, 0.5);
    font-size: 12px;
    font-weight: 850;
  }

  .questionActions button,
  .answerEditor button {
    border: 0;
    border-radius: 999px;
    background: #203c2e;
    color: #fffdf7;
    padding: 11px 14px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
  }

  .questionActions button:disabled,
  .answerEditor button:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }

  .questionNotice {
    border-radius: 18px;
    background: rgba(153, 27, 27, 0.08);
    border: 1px solid rgba(153, 27, 27, 0.14);
    color: #7f1d1d;
    padding: 11px 12px;
    font-size: 12px;
    line-height: 1.35;
    font-weight: 850;
  }

  .questionsList {
    display: grid;
    gap: 12px;
  }

  .emptyQuestions {
    border-radius: 22px;
    background: rgba(32, 60, 46, 0.045);
    padding: 16px;
  }

  .emptyQuestions strong {
    display: block;
    color: #203c2e;
    font-size: 14px;
    font-weight: 950;
  }

  .emptyQuestions p {
    margin: 6px 0 0;
    color: rgba(23, 32, 24, 0.58);
    font-size: 13px;
    line-height: 1.4;
    font-weight: 750;
  }

  .questionItem {
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.66);
    border: 1px solid rgba(32, 60, 46, 0.08);
    padding: 15px;
    display: grid;
    gap: 10px;
  }

  .questionHeader {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .questionHeader strong {
    display: block;
    color: #203c2e;
    font-size: 13px;
    font-weight: 950;
  }

  .questionHeader span,
  .questionHeader time {
    color: rgba(23, 32, 24, 0.48);
    font-size: 11px;
    font-weight: 850;
  }

  .questionText {
    margin: 0;
    color: rgba(23, 32, 24, 0.74);
    font-size: 14px;
    line-height: 1.55;
    font-weight: 760;
  }

  .answerBox {
    border-left: 4px solid #203c2e;
    border-radius: 18px;
    background: rgba(32, 60, 46, 0.06);
    padding: 12px;
  }

  .answerBox span {
    display: block;
    color: #203c2e;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 7px;
  }

  .answerBox p {
    margin: 0;
    color: rgba(23, 32, 24, 0.72);
    font-size: 13px;
    line-height: 1.5;
    font-weight: 750;
  }

  .answerEditor {
    display: grid;
    gap: 10px;
  }

  .answerEditor textarea {
    min-height: 92px;
  }

  .answerEditor button {
    justify-self: end;
  }

  .pendingAnswer {
    border-radius: 999px;
    background: rgba(123, 131, 114, 0.1);
    color: #64705b;
    padding: 9px 12px;
    font-size: 12px;
    font-weight: 850;
    width: fit-content;
  }

  .bookingCard {
    display: grid;
    gap: 14px;
  }

  .bookingPrice {
    color: #203c2e;
    font-size: 34px;
    line-height: 1;
    letter-spacing: -0.06em;
  }

  .bookingCard label {
    display: grid;
    gap: 7px;
    color: rgba(23, 32, 24, 0.58);
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .bookingCard select {
    width: 100%;
    border: 1px solid rgba(32, 60, 46, 0.12);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.72);
    color: #172018;
    padding: 12px 13px;
    font-size: 14px;
    font-weight: 850;
    outline: none;
  }

  .bookingTotal {
    border-radius: 20px;
    background: rgba(153, 27, 27, 0.08);
    padding: 14px;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
  }

  .bookingTotal span {
    color: #7f1d1d;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .bookingTotal strong {
    color: #7f1d1d;
    font-size: 20px;
    letter-spacing: -0.04em;
  }

  .reserveBtn,
  .guideBtn {
    width: 100%;
    border: 0;
    border-radius: 999px;
    background: #991b1b;
    color: #fffdf7;
    padding: 14px 16px;
    font-size: 14px;
    font-weight: 950;
    cursor: pointer;
    box-shadow: 0 18px 36px rgba(153, 27, 27, 0.18);
  }

  .reserveBtn:disabled {
    opacity: 0.58;
    cursor: not-allowed;
    box-shadow: none;
  }

  .bookingNote {
    margin: 0;
    color: rgba(23, 32, 24, 0.52);
    font-size: 12px;
    line-height: 1.45;
    font-weight: 750;
  }

  .guideTop {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .guideAvatar {
    width: 58px;
    height: 58px;
    border-radius: 22px;
    overflow: hidden;
    background: #203c2e;
    color: #fffdf7;
    display: grid;
    place-items: center;
    font-size: 22px;
    font-weight: 950;
    flex: 0 0 auto;
  }

  .guideAvatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .guideTop strong {
    display: block;
    color: #172018;
    font-size: 16px;
    font-weight: 950;
  }

  .guideTop small {
    display: block;
    margin-top: 4px;
    color: #7b8372;
    font-size: 11px;
    font-weight: 850;
  }

  .guideCard p {
    margin: 14px 0;
    color: rgba(23, 32, 24, 0.64);
    font-size: 13px;
    line-height: 1.5;
    font-weight: 700;
  }

  .guideCardClickable {
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }

  .guideCardClickable:hover,
  .guideCardClickable:focus {
    transform: translateY(-2px);
    border-color: rgba(32, 60, 46, 0.18);
    box-shadow: 0 24px 64px rgba(32, 60, 46, 0.13);
    outline: none;
  }

  .guideBtn {
    background: #203c2e;
    box-shadow: 0 18px 36px rgba(32, 60, 46, 0.14);
  }

  @media (max-width: 940px) {
    .hero,
    .contentGrid {
      grid-template-columns: 1fr;
    }

    .heroMedia {
      min-height: 380px;
    }

    .sideColumn {
      position: static;
    }

    .bookingCard {
      display: none;
    }

    .mobileBooking {
      margin-top: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      border-radius: 22px;
      background: rgba(153, 27, 27, 0.08);
      padding: 12px;
    }

    .mobileBooking strong {
      color: #7f1d1d;
      font-size: 20px;
      letter-spacing: -0.04em;
    }

    .mobileBooking button {
      border: 0;
      border-radius: 999px;
      background: #991b1b;
      color: #fffdf7;
      padding: 12px 15px;
      font-size: 13px;
      font-weight: 950;
      cursor: pointer;
      white-space: nowrap;
    }

    .mobileBooking button:disabled {
      opacity: 0.58;
      cursor: not-allowed;
    }
  }

  @media (max-width: 640px) {
    .topbar {
      padding: 10px 12px;
    }

    .brand img {
      width: 30px;
      height: 30px;
    }

    .brand strong {
      font-size: 25px;
      line-height: 0.9;
    }

    .brand span {
      font-size: 9px;
      letter-spacing: 0.11em;
      margin-top: 4px;
    }

    .ghostBtn {
      padding: 9px 11px;
      font-size: 12px;
    }

    .hero {
      margin-top: 8px;
      padding: 0 12px;
      gap: 12px;
    }

    .heroMedia {
      min-height: 270px;
      border-radius: 26px;
    }

    .fallbackHero {
      min-height: 270px;
    }

    .heroContent {
      border-radius: 26px;
      padding: 20px;
    }

    .heroContent h1 {
      font-size: 40px;
    }

    .description {
      font-size: 14px;
      line-height: 1.5;
    }

    .guideHeroCard {
      grid-template-columns: 42px minmax(0, 1fr);
      border-radius: 20px;
      padding: 10px;
    }

    .guideMiniAvatar {
      width: 42px;
      height: 42px;
      border-radius: 16px;
    }

    .guideHeroArrow {
      grid-column: 2;
      font-size: 11px;
    }

    .heroFacts {
      gap: 8px;
      margin-top: 16px;
    }

    .heroFacts div {
      border-radius: 18px;
      padding: 12px;
    }

    .galleryStrip {
      padding: 0 12px;
      margin-top: 12px;
    }

    .galleryStrip button {
      width: 76px;
      height: 62px;
      border-radius: 15px;
    }

    .contentGrid {
      padding: 0 12px;
      margin-top: 12px;
      gap: 12px;
    }

    .card,
    .guideCard {
      border-radius: 24px;
      padding: 18px;
    }

    .sectionTitle h2 {
      font-size: 21px;
    }

    .infoGrid,
    .splitCards {
      grid-template-columns: 1fr;
    }

    .mobileBooking {
      align-items: stretch;
      flex-direction: column;
    }

    .mobileBooking button {
      width: 100%;
    }

    .questionActions {
      align-items: stretch;
      flex-direction: column;
    }

    .questionActions button,
    .answerEditor button {
      width: 100%;
      justify-self: stretch;
    }

    .questionHeader {
      flex-direction: column;
      gap: 4px;
    }
  }
`
