'use client'

import { useEffect, useMemo, useState } from 'react'
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
  roteiro_detalhado?: string | null
  detalhes?: string | null
  preco?: number | string | null
  valor?: number | string | null
  preco_total?: number | string | null
  preco_por_pessoa?: number | string | null
  duracao_horas?: number | string | null
  duracao?: number | string | null
  km?: number | string | null
  distancia_km?: number | string | null
  dificuldade?: string | null
  nivel?: string | null
  intensidade?: string | null
  categoria?: string | null
  tipo?: string | null
  modalidade?: string | null
  localizacao?: string | null
  local?: string | null
  cidade?: string | null
  estado?: string | null
  destino?: string | null
  foto_capa?: string | null
  imagem_url?: string | null
  image_url?: string | null
  imagem?: string | null
  foto_url?: string | null
  capa_url?: string | null
  embarque_local?: string | null
  local_encontro?: string | null
  ponto_encontro?: string | null
  embarque_data?: string | null
  embarque_data_hora?: string | null
  data_trilha?: string | null
  data_roteiro?: string | null
  proxima_data?: string | null
  hora_trilha?: string | null
  retorno_local?: string | null
  retorno_data?: string | null
  retorno_data_hora?: string | null
  status?: string | null
  situacao?: string | null
  publicacao?: string | null
  estado_publicacao?: string | null
  ativo?: boolean | null
  removido_em?: string | null
  excluido_em?: string | null
  removido_pelo_guia?: boolean | null
  removido_pelo_admin?: boolean | null
  id_guia?: string | null
  guia_id?: string | null
  user_id?: string | null
  id_user?: string | null
  usuario_id?: string | null
  criador_id?: string | null
  created_by?: string | null
  criado_por?: string | null
  owner_id?: string | null
  limite_pessoas?: number | string | null
  capacidade?: number | string | null
  max_pessoas?: number | string | null
  recorrencia?: string | null
  created_at?: string | null
  updated_at?: string | null
  guia_nome?: string | null
  nome_guia?: string | null
  guia_name?: string | null
  guia_email?: string | null
  guia_avatar_url?: string | null
  guia_foto_url?: string | null
  nome_agencia?: string | null
  agencia_nome?: string | null
  empresa_nome?: string | null
  nome_empresa?: string | null
  nome_fantasia?: string | null
  razao_social?: string | null
  agencia?: string | null
}

type GuiaResumo = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  nome_agencia?: string | null
  agencia_nome?: string | null
  empresa_nome?: string | null
  nome_empresa?: string | null
  nome_fantasia?: string | null
  razao_social?: string | null
  cadastur?: string | null
  cadastur_numero?: string | null
}

const STATUS_OCULTOS = new Set([
  'rascunho',
  'pendente',
  'pendente_aprovacao',
  'aguardando_aprovacao',
  'em_analise',
  'analise',
  'reprovado',
  'reprovada',
  'cancelado',
  'cancelada',
  'pausado',
  'pausada',
  'inativo',
  'inativa',
  'excluido',
  'excluida',
  'removido',
  'removida',
  'arquivado',
  'arquivada'
])

const STATUS_PUBLICOS = new Set([
  'ativo',
  'ativa',
  'aprovado',
  'aprovada',
  'publicado',
  'publicada',
  'disponivel',
  'disponível',
  'confirmado',
  'confirmada'
])

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

function numero(valor: unknown) {
  const n = Number(valor || 0)
  return Number.isFinite(n) ? n : 0
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

function tituloRoteiro(roteiro: Roteiro) {
  return texto(roteiro.titulo || roteiro.nome) || 'Roteiro PrussikTrails'
}

function descricaoCurta(roteiro: Roteiro) {
  const base =
    texto(roteiro.descricao) ||
    texto(roteiro.roteiro_detalhado) ||
    texto(roteiro.detalhes) ||
    'Experiência outdoor conduzida por guia, com reserva organizada pelo PrussikTrails.'

  return base
    .replace(/\r\n/g, '\n')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 150)
}

function guiaIdRoteiro(roteiro: Roteiro) {
  return texto(
    roteiro.id_guia ||
      roteiro.guia_id ||
      roteiro.id_user ||
      roteiro.usuario_id ||
      roteiro.criador_id ||
      roteiro.created_by ||
      roteiro.criado_por ||
      roteiro.owner_id ||
      roteiro.user_id
  )
}

function fotoRoteiro(roteiro: Roteiro) {
  return texto(
    roteiro.foto_capa ||
      roteiro.imagem_url ||
      roteiro.image_url ||
      roteiro.imagem ||
      roteiro.foto_url ||
      roteiro.capa_url
  )
}

function localRoteiro(roteiro: Roteiro) {
  const local =
    texto(roteiro.localizacao) ||
    texto(roteiro.local) ||
    texto(roteiro.destino) ||
    texto(roteiro.embarque_local) ||
    texto(roteiro.local_encontro) ||
    texto(roteiro.ponto_encontro)

  if (local) return local

  const cidadeEstado = [roteiro.cidade, roteiro.estado]
    .map((parte) => texto(parte))
    .filter(Boolean)
    .join(' / ')

  return cidadeEstado || 'Local a definir'
}

function precoRoteiro(roteiro: Roteiro) {
  return numero(
    roteiro.preco ||
      roteiro.valor ||
      roteiro.preco_por_pessoa ||
      roteiro.preco_total ||
      0
  )
}

function kmRoteiro(roteiro: Roteiro) {
  return numero(roteiro.km ?? roteiro.distancia_km)
}

function duracaoRoteiro(roteiro: Roteiro) {
  const duracao = roteiro.duracao_horas ?? roteiro.duracao ?? ''
  const n = Number(duracao)

  if (Number.isFinite(n) && n > 0) {
    return `${n}h`
  }

  return texto(duracao) || 'A combinar'
}

function dataPrincipal(roteiro: Roteiro) {
  return (
    texto(roteiro.embarque_data) ||
    texto(roteiro.proxima_data) ||
    texto(roteiro.embarque_data_hora) ||
    texto(roteiro.data_trilha) ||
    texto(roteiro.data_roteiro) ||
    ''
  )
}

function horaPrincipal(roteiro: Roteiro) {
  const horaInformada = texto(roteiro.hora_trilha)

  if (horaInformada) {
    return horaInformada.length >= 5 ? horaInformada.slice(0, 5) : horaInformada
  }

  const dataHora =
    texto(roteiro.proxima_data) ||
    texto(roteiro.embarque_data_hora) ||
    texto(roteiro.data_trilha) ||
    texto(roteiro.data_roteiro)

  if (!dataHora || !dataHora.includes('T')) return ''

  const match = dataHora.match(/T(\d{2}:\d{2})/)
  if (match?.[1]) return match[1]

  return ''
}

function formatarData(valor?: string | null) {
  if (!valor) return 'Data a combinar'

  const textoData = String(valor)

  if (/^\d{4}-\d{2}-\d{2}$/.test(textoData)) {
    const [ano, mes, dia] = textoData.split('-').map(Number)
    const dataLocal = new Date(ano, mes - 1, dia, 12, 0, 0)

    return dataLocal.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const data = new Date(textoData)
  if (Number.isNaN(data.getTime())) return 'Data a combinar'

  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function formatarMoeda(valor: unknown) {
  return numero(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

function labelDificuldade(valor?: string | null) {
  const dificuldade = texto(valor)

  if (!dificuldade) return 'Nível livre'

  return dificuldade.charAt(0).toUpperCase() + dificuldade.slice(1)
}

function nomePublicoGuia(guia?: GuiaResumo | null, roteiro?: Roteiro | null) {
  const nomeGuiaBanco =
    texto(guia?.nome_agencia) ||
    texto(guia?.agencia_nome) ||
    texto(guia?.empresa_nome) ||
    texto(guia?.nome_empresa) ||
    texto(guia?.nome_fantasia) ||
    texto(guia?.razao_social) ||
    texto(guia?.nome) ||
    texto(guia?.name) ||
    texto(guia?.email)

  if (nomeGuiaBanco) return nomeGuiaBanco

  const nomeGuiaRoteiro =
    texto(roteiro?.nome_agencia) ||
    texto(roteiro?.agencia_nome) ||
    texto(roteiro?.empresa_nome) ||
    texto(roteiro?.nome_empresa) ||
    texto(roteiro?.nome_fantasia) ||
    texto(roteiro?.razao_social) ||
    texto(roteiro?.agencia) ||
    texto(roteiro?.guia_nome) ||
    texto(roteiro?.nome_guia) ||
    texto(roteiro?.guia_name) ||
    texto(roteiro?.guia_email)

  return nomeGuiaRoteiro || 'Guia/Agência PrussikTrails'
}

function avatarGuia(guia?: GuiaResumo | null, roteiro?: Roteiro | null) {
  return texto(
    guia?.avatar_url ||
      guia?.foto_url ||
      guia?.imagem_url ||
      roteiro?.guia_avatar_url ||
      roteiro?.guia_foto_url
  )
}

function roteiroEstaDisponivel(roteiro: Roteiro) {
  if (!roteiro?.id) return false
  if (roteiro.removido_em || roteiro.excluido_em) return false
  if (roteiro.removido_pelo_admin || roteiro.removido_pelo_guia) return false

  const status = normalizar(roteiro.status)
  const situacao = normalizar(roteiro.situacao)
  const publicacao = normalizar(roteiro.publicacao || roteiro.estado_publicacao)

  if (STATUS_OCULTOS.has(status) || STATUS_OCULTOS.has(situacao) || STATUS_OCULTOS.has(publicacao)) {
    return false
  }

  if (roteiro.ativo === true) return true
  if (STATUS_PUBLICOS.has(status) || STATUS_PUBLICOS.has(situacao) || STATUS_PUBLICOS.has(publicacao)) return true

  return false
}

function ordenarPorData(a: Roteiro, b: Roteiro) {
  const dataA = dataPrincipal(a)
  const dataB = dataPrincipal(b)

  const timeA = dataA ? new Date(dataA.length <= 10 ? `${dataA}T12:00:00` : dataA).getTime() : Number.POSITIVE_INFINITY
  const timeB = dataB ? new Date(dataB.length <= 10 ? `${dataB}T12:00:00` : dataB).getTime() : Number.POSITIVE_INFINITY

  const aValido = Number.isFinite(timeA) ? timeA : Number.POSITIVE_INFINITY
  const bValido = Number.isFinite(timeB) ? timeB : Number.POSITIVE_INFINITY

  return aValido - bValido
}

export default function RoteirosPage() {
  const router = useRouter()

  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioLocal | null>(null)
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [guias, setGuias] = useState<Record<string, GuiaResumo>>({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroNivel, setFiltroNivel] = useState('todos')
  const [filtroOrdenacao, setFiltroOrdenacao] = useState<'recentes' | 'data' | 'preco' | 'km'>('recentes')
  const [copiadoId, setCopiadoId] = useState('')

  useEffect(() => {
    const salvo = localStorage.getItem('user')
    const usuario = salvo ? (JSON.parse(salvo) as UsuarioLocal) : null
    setUsuarioLogado(usuario)

    if (usuario) sincronizarUsuarioCabecalho(usuario)

    carregarRoteiros()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  async function carregarRoteiros() {
    setCarregando(true)
    setErro('')

    try {
      let roteirosData: Roteiro[] = []

      const consultaPrincipal = await supabase
        .from('roteiros')
        .select('*')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false })

      if (consultaPrincipal.error) {
        console.warn('Erro ao ordenar roteiros por data. Tentando consulta simples:', consultaPrincipal.error)

        const consultaFallback = await supabase
          .from('roteiros')
          .select('*')

        if (consultaFallback.error) throw consultaFallback.error

        roteirosData = (consultaFallback.data || []) as Roteiro[]
      } else {
        roteirosData = (consultaPrincipal.data || []) as Roteiro[]
      }

      const disponiveis = roteirosData.filter(roteiroEstaDisponivel)

      setRoteiros(disponiveis)

      const guiaIds = Array.from(
        new Set(
          disponiveis
            .map((roteiro) => guiaIdRoteiro(roteiro))
            .filter(Boolean)
        )
      )

      if (guiaIds.length > 0) {
        const { data: guiasData, error: guiasError } = await supabase
          .from('users')
          .select('id, nome, name, email, avatar_url, foto_url, imagem_url, nome_agencia, agencia_nome, empresa_nome, nome_empresa, nome_fantasia, razao_social, cadastur, cadastur_numero')
          .in('id', guiaIds)

        if (!guiasError && Array.isArray(guiasData)) {
          const mapa: Record<string, GuiaResumo> = {}

          ;(guiasData as GuiaResumo[]).forEach((guia) => {
            if (guia?.id) mapa[guia.id] = guia
          })

          setGuias(mapa)
        } else if (guiasError) {
          console.warn('Não foi possível carregar nomes dos guias:', guiasError)
        }
      } else {
        setGuias({})
      }
    } catch (error: any) {
      console.error('Erro ao carregar roteiros:', error)
      setErro(error?.message || 'Não foi possível carregar os roteiros agora.')
      setRoteiros([])
    } finally {
      setCarregando(false)
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
    return '/'
  }

  function abrirRoteiro(id: string) {
    router.push(`/roteiros/${id}`)
  }

  function abrirPerfilGuia(roteiro: Roteiro) {
    const guiaId = guiaIdRoteiro(roteiro)
    if (!guiaId) return
    router.push(`/guia/publico/${guiaId}`)
  }

  async function copiarLink(roteiro: Roteiro) {
    const link =
      typeof window !== 'undefined'
        ? `${window.location.origin}/roteiros/${roteiro.id}`
        : `https://prussiktrails.com.br/roteiros/${roteiro.id}`

    try {
      await navigator.clipboard.writeText(link)
      setCopiadoId(roteiro.id)
      window.setTimeout(() => setCopiadoId(''), 2200)
    } catch {
      window.prompt('Copie o link do roteiro:', link)
    }
  }

  function enviarWhatsApp(roteiro: Roteiro) {
    const link =
      typeof window !== 'undefined'
        ? `${window.location.origin}/roteiros/${roteiro.id}`
        : `https://prussiktrails.com.br/roteiros/${roteiro.id}`

    const mensagem = `Olha esse roteiro no PrussikTrails: ${tituloRoteiro(roteiro)}
${link}`

    window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, '_blank', 'noopener,noreferrer')
  }

  const niveisDisponiveis = useMemo(() => {
    const niveis = roteiros
      .map((roteiro) => labelDificuldade(roteiro.dificuldade || roteiro.nivel || roteiro.intensidade))
      .filter(Boolean)

    return Array.from(new Set(niveis)).sort((a, b) => a.localeCompare(b))
  }, [roteiros])

  const roteirosFiltrados = useMemo(() => {
    const buscaNormalizada = normalizar(busca)

    let lista = roteiros.filter((roteiro) => {
      const guia = guias[guiaIdRoteiro(roteiro)]

      const textoBusca = normalizar(
        [
          tituloRoteiro(roteiro),
          descricaoCurta(roteiro),
          localRoteiro(roteiro),
          labelDificuldade(roteiro.dificuldade || roteiro.nivel || roteiro.intensidade),
          nomePublicoGuia(guia, roteiro),
          roteiro.categoria,
          roteiro.tipo,
          roteiro.modalidade
        ].join(' ')
      )

      const passaBusca = !buscaNormalizada || textoBusca.includes(buscaNormalizada)
      const nivelAtual = labelDificuldade(roteiro.dificuldade || roteiro.nivel || roteiro.intensidade)
      const passaNivel = filtroNivel === 'todos' || nivelAtual === filtroNivel

      return passaBusca && passaNivel
    })

    if (filtroOrdenacao === 'data') {
      lista = [...lista].sort(ordenarPorData)
    } else if (filtroOrdenacao === 'preco') {
      lista = [...lista].sort((a, b) => precoRoteiro(a) - precoRoteiro(b))
    } else if (filtroOrdenacao === 'km') {
      lista = [...lista].sort((a, b) => kmRoteiro(a) - kmRoteiro(b))
    } else {
      lista = [...lista].sort((a, b) => {
        const updatedA = new Date(String(a.updated_at || a.created_at || '')).getTime()
        const updatedB = new Date(String(b.updated_at || b.created_at || '')).getTime()

        const aValido = Number.isFinite(updatedA) ? updatedA : 0
        const bValido = Number.isFinite(updatedB) ? updatedB : 0

        return bValido - aValido
      })
    }

    return lista
  }, [busca, filtroNivel, filtroOrdenacao, guias, roteiros])

  const destaque = roteirosFiltrados[0] || roteiros[0] || null

  return (
    <main className="page">
      <style jsx>{styles}</style>

      <header className="topbar">
        <div className="topbarInner">
          <button
            type="button"
            className="brand"
            onClick={() => router.push(rotaPrincipalUsuario())}
            aria-label="Voltar ao início"
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />
            <span>Roteiros públicos</span>
          </button>

          <nav className="navActions" aria-label="Ações principais">
            <button
              type="button"
              className="navLink desktopOnly"
              onClick={() => router.push('/')}
            >
              Início
            </button>

            {usuarioLogado ? (
              <button
                type="button"
                className="profileButton"
                onClick={() => router.push(rotaPerfilUsuario(usuarioLogado))}
                aria-label={`Abrir perfil de ${primeiroNome(nomeUsuario(usuarioLogado))}`}
              >
                {avatarUsuario(usuarioLogado) ? (
                  <img src={avatarUsuario(usuarioLogado)} alt={nomeUsuario(usuarioLogado)} />
                ) : (
                  <span>{inicialUsuario(usuarioLogado)}</span>
                )}
              </button>
            ) : (
              <button
                type="button"
                className="loginButton"
                onClick={() => router.push('/login')}
              >
                Entrar
              </button>
            )}
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="heroText">
          <p className="eyebrow">Explore com guias cadastrados</p>
          <h1>Roteiros outdoor para sua próxima jornada.</h1>
          <p>
            Encontre experiências publicadas por guias e agências, veja detalhes,
            tire dúvidas e reserve pelo PrussikTrails quando o roteiro estiver disponível.
          </p>

          <div className="heroStats">
            <div>
              <strong>{roteiros.length}</strong>
              <span>roteiro(s) disponível(is)</span>
            </div>
            <div>
              <strong>{niveisDisponiveis.length || '—'}</strong>
              <span>níveis de experiência</span>
            </div>
            <div>
              <strong>PIX</strong>
              <span>pagamento organizado pelo app</span>
            </div>
          </div>
        </div>

        <div className="heroCard">
          {destaque ? (
            <>
              <div className="heroCardPhoto">
                {fotoRoteiro(destaque) ? (
                  <img src={fotoRoteiro(destaque)} alt={tituloRoteiro(destaque)} />
                ) : (
                  <div className="photoFallback">
                    <img src="/logo-prussik-display.png" alt="" />
                  </div>
                )}
              </div>

              <div className="heroCardBody">
                <span className="hotTag">Roteiro em destaque</span>
                <h2>{tituloRoteiro(destaque)}</h2>
                <p>{localRoteiro(destaque)}</p>

                <button type="button" onClick={() => abrirRoteiro(destaque.id)}>
                  Ver roteiro
                </button>
              </div>
            </>
          ) : (
            <div className="heroEmpty">
              <span>🧭</span>
              <strong>Nenhum roteiro disponível agora</strong>
              <p>Assim que os guias publicarem novas experiências, elas aparecerão aqui.</p>
            </div>
          )}
        </div>
      </section>

      <section className="filters">
        <div className="searchBox">
          <span>Buscar</span>
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Nome, local, guia, dificuldade..."
          />
        </div>

        <label>
          <span>Nível</span>
          <select value={filtroNivel} onChange={(event) => setFiltroNivel(event.target.value)}>
            <option value="todos">Todos</option>
            {niveisDisponiveis.map((nivel) => (
              <option key={nivel} value={nivel}>
                {nivel}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Ordenar</span>
          <select
            value={filtroOrdenacao}
            onChange={(event) => setFiltroOrdenacao(event.target.value as 'recentes' | 'data' | 'preco' | 'km')}
          >
            <option value="recentes">Mais recentes</option>
            <option value="data">Próxima data</option>
            <option value="preco">Menor preço</option>
            <option value="km">Menor distância</option>
          </select>
        </label>

        <button type="button" className="refreshBtn" onClick={carregarRoteiros}>
          Atualizar
        </button>
      </section>

      {erro && <div className="alert error">{erro}</div>}

      <section className="listSection">
        <div className="sectionHead">
          <div>
            <h2>Roteiros disponíveis</h2>
            <p>
              {carregando
                ? 'Carregando experiências...'
                : `${roteirosFiltrados.length} roteiro(s) encontrado(s).`}
            </p>
          </div>
        </div>

        {carregando ? (
          <div className="loadingGrid">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="skeletonCard" key={index} />
            ))}
          </div>
        ) : roteirosFiltrados.length === 0 ? (
          <div className="emptyCard">
            <span>🧭</span>
            <h3>Nenhum roteiro encontrado</h3>
            <p>
              Verifique se há roteiros com status ativo/publicado ou ajuste os filtros de busca.
            </p>

            <button
              type="button"
              onClick={() => {
                setBusca('')
                setFiltroNivel('todos')
                setFiltroOrdenacao('recentes')
                carregarRoteiros()
              }}
            >
              Limpar filtros e atualizar
            </button>
          </div>
        ) : (
          <div className="routeGrid">
            {roteirosFiltrados.map((roteiro) => {
              const guia = guias[guiaIdRoteiro(roteiro)]
              const nomeGuia = nomePublicoGuia(guia, roteiro)
              const foto = fotoRoteiro(roteiro)
              const data = formatarData(dataPrincipal(roteiro))
              const hora = horaPrincipal(roteiro)
              const nivel = labelDificuldade(roteiro.dificuldade || roteiro.nivel || roteiro.intensidade)
              const km = kmRoteiro(roteiro)

              return (
                <article className="routeCard" key={roteiro.id}>
                  <button
                    type="button"
                    className="routePhoto"
                    onClick={() => abrirRoteiro(roteiro.id)}
                    aria-label={`Abrir ${tituloRoteiro(roteiro)}`}
                  >
                    {foto ? (
                      <img src={foto} alt={tituloRoteiro(roteiro)} />
                    ) : (
                      <div className="photoFallback">
                        <img src="/logo-prussik-display.png" alt="" />
                      </div>
                    )}

                    <span className="levelBadge">{nivel}</span>
                  </button>

                  <div className="routeBody">
                    <div className="routeTop">
                      <div>
                        <h3>{tituloRoteiro(roteiro)}</h3>
                        <p>{descricaoCurta(roteiro)}</p>
                      </div>
                    </div>

                    <div className="routeFacts">
                      <span>📍 {localRoteiro(roteiro)}</span>
                      <span>📅 {data}{hora ? ` · ${hora}` : ''}</span>
                      <span>🥾 {km > 0 ? `${km} km` : 'Distância a combinar'} · {duracaoRoteiro(roteiro)}</span>
                    </div>

                    <button
                      type="button"
                      className="guideLine"
                      onClick={() => abrirPerfilGuia(roteiro)}
                      disabled={!guiaIdRoteiro(roteiro)}
                    >
                      <span className="guideAvatar">
                        {avatarGuia(guia, roteiro) ? (
                          <img src={avatarGuia(guia, roteiro)} alt={nomeGuia} />
                        ) : (
                          nomeGuia.slice(0, 1).toUpperCase()
                        )}
                      </span>

                      <span>
                        <small>Guia/Agência</small>
                        <strong>{nomeGuia}</strong>
                      </span>
                    </button>

                    <div className="routeFooter">
                      <div className="price">
                        <span>Valor</span>
                        <strong>{precoRoteiro(roteiro) > 0 ? formatarMoeda(precoRoteiro(roteiro)) : 'Consultar'}</strong>
                      </div>

                      <div className="cardActions">
                        <button
                          type="button"
                          className="secondaryBtn"
                          onClick={() => copiarLink(roteiro)}
                        >
                          {copiadoId === roteiro.id ? 'Copiado' : 'Copiar link'}
                        </button>

                        <button
                          type="button"
                          className="secondaryBtn whatsapp"
                          onClick={() => enviarWhatsApp(roteiro)}
                        >
                          WhatsApp
                        </button>

                        <button
                          type="button"
                          className="primaryBtn"
                          onClick={() => abrirRoteiro(roteiro.id)}
                        >
                          Ver roteiro
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
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
    font-family:
      Inter,
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
    padding-bottom: 70px;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 60;
    background: rgba(255, 253, 247, 0.92);
    border-bottom: 1px solid rgba(15, 23, 42, 0.06);
    backdrop-filter: blur(18px);
    padding: 8px 16px;
  }

  .topbarInner {
    width: 100%;
    max-width: 1180px;
    margin: 0 auto;
    min-height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .brand {
    border: none;
    background: transparent;
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    padding: 0;
    min-width: 0;
  }

  .brand img {
    width: 122px;
    height: 48px;
    object-fit: contain;
    display: block;
  }

  .brand span {
    color: #6b7280;
    font-size: 10px;
    line-height: 1.1;
    font-weight: 900;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .navActions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 0 0 auto;
  }

  .navLink,
  .loginButton {
    border: 1px solid rgba(32, 60, 46, 0.13);
    background: rgba(255,255,255,0.76);
    color: #203c2e;
    border-radius: 999px;
    min-height: 40px;
    padding: 0 15px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
  }

  .profileButton {
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
    font-size: 14px;
    font-weight: 950;
  }

  .profileButton img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .hero {
    max-width: 1180px;
    margin: 24px auto 0;
    padding: 0 18px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 420px;
    gap: 22px;
    align-items: stretch;
  }

  .heroText,
  .heroCard,
  .filters,
  .alert,
  .sectionHead,
  .emptyCard,
  .routeCard,
  .skeletonCard {
    border: 1px solid rgba(32, 60, 46, 0.08);
    background: rgba(255, 253, 247, 0.84);
    box-shadow: 0 20px 56px rgba(32, 60, 46, 0.09);
  }

  .heroText {
    border-radius: 36px;
    padding: clamp(28px, 5vw, 54px);
  }

  .eyebrow {
    margin: 0 0 13px;
    color: #991b1b;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .heroText h1 {
    max-width: 780px;
    margin: 0;
    color: #172018;
    font-size: clamp(42px, 7vw, 86px);
    line-height: 0.9;
    letter-spacing: -0.078em;
    font-weight: 950;
  }

  .heroText p {
    max-width: 680px;
    margin: 20px 0 0;
    color: rgba(23, 32, 24, 0.68);
    font-size: 16px;
    line-height: 1.65;
    font-weight: 700;
  }

  .heroStats {
    margin-top: 28px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .heroStats div {
    border-radius: 22px;
    background: rgba(32, 60, 46, 0.055);
    padding: 15px;
  }

  .heroStats strong {
    display: block;
    color: #203c2e;
    font-size: 28px;
    line-height: 1;
    letter-spacing: -0.055em;
    font-weight: 950;
  }

  .heroStats span {
    display: block;
    margin-top: 7px;
    color: rgba(23, 32, 24, 0.58);
    font-size: 12px;
    line-height: 1.35;
    font-weight: 850;
  }

  .heroCard {
    border-radius: 36px;
    overflow: hidden;
    min-height: 440px;
    display: flex;
    flex-direction: column;
  }

  .heroCardPhoto {
    position: relative;
    flex: 1;
    min-height: 255px;
    background: #dfe7d2;
  }

  .heroCardPhoto img,
  .routePhoto img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .photoFallback {
    width: 100%;
    height: 100%;
    min-height: inherit;
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at 50% 20%, rgba(153,27,27,0.11), transparent 32%),
      linear-gradient(135deg, #dfe7d2, #f7f0dd);
  }

  .photoFallback img {
    width: 92px;
    height: 92px;
    object-fit: contain;
  }

  .heroCardBody {
    padding: 18px;
  }

  .hotTag {
    display: inline-flex;
    width: fit-content;
    border-radius: 999px;
    background: rgba(153, 27, 27, 0.10);
    color: #991b1b;
    padding: 7px 10px;
    font-size: 10px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.10em;
  }

  .heroCardBody h2 {
    margin: 13px 0 0;
    color: #172018;
    font-size: 26px;
    line-height: 1;
    letter-spacing: -0.055em;
    font-weight: 950;
  }

  .heroCardBody p {
    margin: 9px 0 0;
    color: rgba(23, 32, 24, 0.62);
    font-size: 13px;
    font-weight: 800;
  }

  .heroCardBody button,
  .emptyCard button,
  .refreshBtn,
  .primaryBtn,
  .secondaryBtn {
    border: none;
    border-radius: 999px;
    cursor: pointer;
    font-weight: 950;
    transition: 0.18s ease;
  }

  .heroCardBody button {
    margin-top: 16px;
    background: #203c2e;
    color: #fffdf7;
    padding: 12px 16px;
    font-size: 13px;
  }

  .heroEmpty {
    min-height: 440px;
    padding: 26px;
    display: grid;
    place-items: center;
    align-content: center;
    text-align: center;
    color: #203c2e;
  }

  .heroEmpty span {
    font-size: 44px;
  }

  .heroEmpty strong {
    display: block;
    margin-top: 12px;
    font-size: 22px;
    font-weight: 950;
    letter-spacing: -0.04em;
  }

  .heroEmpty p {
    max-width: 280px;
    color: rgba(23, 32, 24, 0.58);
    font-size: 13px;
    line-height: 1.45;
    font-weight: 760;
  }

  .filters,
  .listSection {
    max-width: 1180px;
    margin: 20px auto 0;
    padding: 0 18px;
  }

  .filters {
    border-radius: 28px;
    padding: 14px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 180px 180px auto;
    gap: 10px;
    align-items: end;
  }

  .filters label,
  .searchBox {
    display: grid;
    gap: 6px;
  }

  .filters span,
  .searchBox span {
    color: rgba(23, 32, 24, 0.58);
    font-size: 10px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.10em;
  }

  .filters input,
  .filters select {
    width: 100%;
    border: 1px solid rgba(32, 60, 46, 0.12);
    background: rgba(255,255,255,0.78);
    color: #172018;
    border-radius: 17px;
    padding: 12px 13px;
    font-size: 14px;
    font-weight: 820;
    outline: none;
  }

  .filters input:focus,
  .filters select:focus {
    border-color: rgba(132, 204, 22, 0.70);
    box-shadow: 0 0 0 4px rgba(132,204,22,0.12);
  }

  .refreshBtn {
    min-height: 43px;
    background: #eef2e5;
    color: #203c2e;
    padding: 0 14px;
    font-size: 12px;
  }

  .alert {
    max-width: 1180px;
    margin: 18px auto 0;
    border-radius: 20px;
    padding: 14px 18px;
    color: #7f1d1d;
    font-size: 13px;
    font-weight: 850;
  }

  .sectionHead {
    border-radius: 28px;
    padding: 20px;
    margin-bottom: 16px;
  }

  .sectionHead h2 {
    margin: 0;
    color: #172018;
    font-size: 28px;
    line-height: 1;
    letter-spacing: -0.05em;
    font-weight: 950;
  }

  .sectionHead p {
    margin: 8px 0 0;
    color: rgba(23, 32, 24, 0.58);
    font-size: 13px;
    line-height: 1.45;
    font-weight: 760;
  }

  .routeGrid,
  .loadingGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .routeCard {
    border-radius: 30px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .routePhoto {
    position: relative;
    width: 100%;
    height: 230px;
    border: 0;
    padding: 0;
    background: #dfe7d2;
    cursor: pointer;
    overflow: hidden;
  }

  .levelBadge {
    position: absolute;
    left: 14px;
    top: 14px;
    border-radius: 999px;
    background: rgba(255,253,247,0.90);
    color: #203c2e;
    padding: 8px 11px;
    font-size: 11px;
    font-weight: 950;
    backdrop-filter: blur(10px);
  }

  .routeBody {
    padding: 16px;
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .routeTop h3 {
    margin: 0;
    color: #172018;
    font-size: 23px;
    line-height: 1.02;
    letter-spacing: -0.055em;
    font-weight: 950;
  }

  .routeTop p {
    min-height: 58px;
    margin: 9px 0 0;
    color: rgba(23, 32, 24, 0.64);
    font-size: 13px;
    line-height: 1.48;
    font-weight: 720;
  }

  .routeFacts {
    margin-top: 14px;
    display: grid;
    gap: 7px;
  }

  .routeFacts span {
    color: rgba(23, 32, 24, 0.68);
    font-size: 12px;
    line-height: 1.35;
    font-weight: 830;
  }

  .guideLine {
    margin-top: 14px;
    border: 1px solid rgba(32, 60, 46, 0.08);
    background: rgba(32, 60, 46, 0.045);
    color: inherit;
    border-radius: 20px;
    padding: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    cursor: pointer;
  }

  .guideLine:disabled {
    cursor: default;
  }

  .guideAvatar {
    width: 42px;
    height: 42px;
    border-radius: 16px;
    background: #203c2e;
    color: #fffdf7;
    display: grid;
    place-items: center;
    font-size: 15px;
    font-weight: 950;
    overflow: hidden;
    flex: 0 0 auto;
  }

  .guideAvatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .guideLine small {
    display: block;
    color: rgba(23, 32, 24, 0.48);
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .guideLine strong {
    display: block;
    margin-top: 3px;
    color: #203c2e;
    font-size: 13px;
    line-height: 1.25;
    font-weight: 950;
  }

  .routeFooter {
    margin-top: auto;
    padding-top: 16px;
    display: grid;
    gap: 12px;
  }

  .price span {
    display: block;
    color: rgba(23, 32, 24, 0.48);
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.10em;
    text-transform: uppercase;
  }

  .price strong {
    display: block;
    margin-top: 3px;
    color: #991b1b;
    font-size: 24px;
    line-height: 1;
    letter-spacing: -0.05em;
    font-weight: 950;
  }

  .cardActions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .primaryBtn,
  .secondaryBtn {
    min-height: 40px;
    padding: 0 12px;
    font-size: 11px;
  }

  .primaryBtn {
    grid-column: 1 / -1;
    background: #203c2e;
    color: #fffdf7;
  }

  .secondaryBtn {
    background: #eef2e5;
    color: #203c2e;
  }

  .secondaryBtn.whatsapp {
    background: #dcfce7;
    color: #166534;
  }

  .emptyCard {
    border-radius: 30px;
    padding: 34px 22px;
    text-align: center;
  }

  .emptyCard span {
    font-size: 48px;
  }

  .emptyCard h3 {
    margin: 10px 0 0;
    color: #172018;
    font-size: 28px;
    line-height: 1;
    letter-spacing: -0.05em;
  }

  .emptyCard p {
    max-width: 520px;
    margin: 10px auto 0;
    color: rgba(23, 32, 24, 0.62);
    font-size: 14px;
    line-height: 1.5;
    font-weight: 760;
  }

  .emptyCard button {
    margin-top: 18px;
    background: #203c2e;
    color: #fffdf7;
    padding: 12px 16px;
    font-size: 13px;
  }

  .skeletonCard {
    height: 430px;
    border-radius: 30px;
    background:
      linear-gradient(90deg, rgba(255,255,255,0.45), rgba(255,255,255,0.85), rgba(255,255,255,0.45)),
      rgba(255, 253, 247, 0.84);
    background-size: 220% 100%;
    animation: shine 1.2s linear infinite;
  }

  @keyframes shine {
    to {
      background-position: -220% 0;
    }
  }

  @media (min-width: 941px) {
    .page {
      padding-top: 74px;
    }

    .topbar {
      position: fixed;
      left: 0;
      right: 0;
      height: 74px;
      display: flex;
      align-items: center;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.045);
    }
  }

  @media (max-width: 1040px) {
    .hero {
      grid-template-columns: 1fr;
    }

    .heroCard {
      min-height: 360px;
    }

    .routeGrid,
    .loadingGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .filters {
      grid-template-columns: 1fr 1fr;
    }

    .refreshBtn {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 700px) {
    .topbar {
      padding: 7px 10px;
    }

    .topbarInner {
      min-height: 52px;
      gap: 8px;
    }

    .brand {
      gap: 8px;
    }

    .brand img {
      width: 112px;
      height: 42px;
    }

    .brand span {
      display: none;
    }

    .desktopOnly {
      display: none;
    }

    .profileButton,
    .loginButton {
      width: 38px;
      height: 38px;
      min-height: 38px;
      padding: 0;
      font-size: 10px;
      box-shadow: none;
    }

    .loginButton {
      width: auto;
      padding: 0 13px;
    }

    .hero {
      margin-top: 12px;
      padding: 0 12px;
      gap: 12px;
    }

    .heroText,
    .heroCard,
    .filters,
    .sectionHead,
    .emptyCard,
    .routeCard {
      border-radius: 24px;
    }

    .heroText {
      padding: 22px;
    }

    .heroText h1 {
      font-size: 40px;
    }

    .heroText p {
      font-size: 14px;
      line-height: 1.5;
    }

    .heroStats {
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .heroCard {
      min-height: 0;
    }

    .heroCardPhoto {
      min-height: 220px;
    }

    .filters,
    .listSection {
      padding: 0 12px;
      margin-top: 12px;
    }

    .filters {
      padding: 12px;
      grid-template-columns: 1fr;
    }

    .routeGrid,
    .loadingGrid {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .routePhoto {
      height: 220px;
    }

    .routeTop p {
      min-height: 0;
    }

    .cardActions {
      grid-template-columns: 1fr;
    }

    .primaryBtn {
      grid-column: auto;
    }
  }
`
