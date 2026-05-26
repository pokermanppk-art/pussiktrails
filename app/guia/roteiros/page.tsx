'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Recorrencia = 'unica' | 'semanal' | 'mensal' | 'anual'

type UsuarioLocal = {
  id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  guia_id?: string | null
  nome?: string | null
  email?: string | null
  tipo?: string | null
}

type ReservaRow = {
  quantidade_pessoas?: number | null
  quantidade?: number | null
  status?: string | null
  data_trilha?: string | null
  data_reserva?: string | null
}

type Roteiro = {
  id: string
  titulo: string
  descricao?: string | null
  preco?: number | null
  valor?: number | null
  duracao_horas?: number | null
  duracao?: string | null
  km?: number | null
  distancia_km?: number | null
  dificuldade?: string | null
  localizacao?: string | null
  local?: string | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  status?: string | null
  ativo?: boolean | null
  limite_pessoas?: number | null
  recorrencia?: Recorrencia | string | null
  renovar_automaticamente?: boolean | null
  proxima_data?: string | null
  embarque_data_hora?: string | null
  retorno_data_hora?: string | null
  created_at?: string | null
  updated_at?: string | null
  id_guia?: string | null
  guia_id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  vagas_ocupadas?: number
  vagas_restantes?: number | null
  data_disponivel?: string | null
}

type StatusFiltro = 'todos' | 'ativos' | 'pendentes' | 'inativos'

const CAMPOS_GUIA = ['id_guia', 'guia_id', 'user_id', 'usuario_id'] as const

function normalizar(valor?: string | null): string {
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
      usuario?.guia_id ||
      ''
  ).trim()
}

function primeiroNome(nome?: string | null): string {
  const limpo = String(nome || '').trim()
  if (!limpo) return 'guia'
  return limpo.split(' ')[0] || 'guia'
}

function formatarMoeda(valor?: number | null): string {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function hojeInicio() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return hoje
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function extrairDataBase(roteiro: Roteiro) {
  const data =
    roteiro.proxima_data ||
    roteiro.embarque_data_hora ||
    roteiro.retorno_data_hora ||
    null

  if (!data) return null

  return String(data).slice(0, 10)
}

function calcularProximaDataValida(roteiro: Roteiro) {
  const recorrencia = (roteiro.recorrencia || 'unica') as Recorrencia
  const dataBase = extrairDataBase(roteiro)

  if (!dataBase) return null

  const hoje = hojeInicio()
  const data = new Date(`${dataBase}T00:00:00`)

  if (Number.isNaN(data.getTime())) return null

  if (data >= hoje) return formatDateInput(data)

  if (recorrencia === 'unica') return null

  const proxima = new Date(data)

  if (recorrencia === 'semanal') {
    while (proxima < hoje) proxima.setDate(proxima.getDate() + 7)
  }

  if (recorrencia === 'mensal') {
    while (proxima < hoje) proxima.setMonth(proxima.getMonth() + 1)
  }

  if (recorrencia === 'anual') {
    while (proxima < hoje) proxima.setFullYear(proxima.getFullYear() + 1)
  }

  return formatDateInput(proxima)
}

function formatarData(data?: string | null) {
  if (!data) return 'Data a definir'

  const date = new Date(`${String(data).slice(0, 10)}T12:00:00`)

  if (Number.isNaN(date.getTime())) return 'Data a definir'

  return date.toLocaleDateString('pt-BR')
}

function labelRecorrencia(recorrencia?: string | null) {
  if (recorrencia === 'semanal') return 'Semanal'
  if (recorrencia === 'mensal') return 'Mensal'
  if (recorrencia === 'anual') return 'Anual'
  return 'Única vez'
}

function fotoRoteiro(roteiro: Roteiro) {
  return roteiro.foto_capa || roteiro.foto_url || roteiro.imagem_url || ''
}

function precoRoteiro(roteiro: Roteiro) {
  return Number(roteiro.preco ?? roteiro.valor ?? 0)
}

function kmRoteiro(roteiro: Roteiro) {
  return Number(roteiro.km ?? roteiro.distancia_km ?? 0)
}

function roteiroExcluidoOuCancelado(roteiro: Roteiro) {
  const status = normalizar(roteiro.status)

  return (
    status === 'excluido' ||
    status === 'excluida' ||
    status === 'cancelado' ||
    status === 'cancelada' ||
    status === 'recusado' ||
    status === 'recusada' ||
    status === 'deletado' ||
    status === 'deletada' ||
    status === 'removido' ||
    status === 'removida'
  )
}

function statusVisual(roteiro: Roteiro) {
  const status = normalizar(roteiro.status)

  if (roteiro.ativo === false || roteiroExcluidoOuCancelado(roteiro)) {
    return { label: 'Inativo', classe: 'muted' }
  }

  if (status === 'pendente' || status === 'analise' || status === 'em_analise') {
    return { label: 'Em análise', classe: 'yellow' }
  }

  if (status === 'rascunho') return { label: 'Rascunho', classe: 'gray' }

  return { label: 'Ativo', classe: 'green' }
}

function labelVagas(roteiro: Roteiro) {
  if (roteiro.limite_pessoas === null || roteiro.limite_pessoas === undefined) {
    return 'Sem limite'
  }

  const restantes = Number(roteiro.vagas_restantes || 0)

  if (restantes <= 0) return 'Esgotado'

  return `${restantes} vaga(s)`
}

export default function GuiaRoteirosPage() {
  const router = useRouter()

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [guiaId, setGuiaId] = useState('')
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [dificuldade, setDificuldade] = useState('todas')
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('ativos')

  useEffect(() => {
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

      const idLimpo = extrairUsuarioId(parsedUser)

      if (!idLimpo) {
        console.error('guiaId inválido no localStorage:', parsedUser)
        setErro('Não foi possível identificar o guia logado. Faça login novamente.')
        localStorage.removeItem('user')
        router.replace('/login')
        return
      }

      const usuarioNormalizado = { ...parsedUser, id: idLimpo }

      setUser(usuarioNormalizado)
      setGuiaId(idLimpo)

      await carregarRoteiros(idLimpo)
    } catch (error: unknown) {
      console.error('Erro ao iniciar /guia/roteiros:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao carregar seus roteiros.')
      setRoteiros([])
    } finally {
      setCarregando(false)
    }
  }

  async function carregarOcupacao(roteiroId: string, dataDisponivel: string | null) {
    const { data, error } = await supabase
      .from('reservas')
      .select('quantidade_pessoas, quantidade, status, data_trilha, data_reserva')
      .eq('roteiro_id', roteiroId)

    if (error) {
      console.warn('Erro ao carregar ocupação:', error)
      return 0
    }

    const reservasValidas = ((data || []) as ReservaRow[]).filter((reserva: ReservaRow) => {
      if (normalizar(reserva.status) === 'cancelada') return false

      if (!dataDisponivel) return true

      const dataReserva = reserva.data_trilha || reserva.data_reserva || null

      if (!dataReserva) return true

      return String(dataReserva).slice(0, 10) === dataDisponivel
    })

    return reservasValidas.reduce((total: number, reserva: ReservaRow) => {
      return total + Number(reserva.quantidade_pessoas || reserva.quantidade || 1)
    }, 0)
  }

  async function buscarRoteirosDoGuia(idGuia: string) {
    for (const campo of CAMPOS_GUIA) {
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .eq(campo, idGuia)
        .order('created_at', { ascending: false })

      if (!error) {
        return (data || []) as Roteiro[]
      }

      const textoErro = String(error.message || error.details || error.hint || '').toLowerCase()
      const erroDeColuna =
        error.code === '42703' ||
        error.code === 'PGRST204' ||
        textoErro.includes('could not find') ||
        textoErro.includes('schema cache') ||
        textoErro.includes('column')

      if (!erroDeColuna) throw error
    }

    return []
  }

  async function carregarRoteiros(idGuia = guiaId) {
    if (!idGuia) return

    setErro('')

    try {
      const roteirosBase = await buscarRoteirosDoGuia(idGuia)

      const normalizados = roteirosBase.map((roteiro: Roteiro) => {
        const dataDisponivel = calcularProximaDataValida(roteiro)

        return {
          ...roteiro,
          data_disponivel: dataDisponivel,
        }
      })

      const comOcupacao = await Promise.all(
        normalizados.map(async (roteiro: Roteiro) => {
          const ocupadas = await carregarOcupacao(roteiro.id, roteiro.data_disponivel || null)

          const limite =
            roteiro.limite_pessoas === null || roteiro.limite_pessoas === undefined
              ? null
              : Number(roteiro.limite_pessoas)

          const restantes = limite === null ? null : Math.max(limite - ocupadas, 0)

          return {
            ...roteiro,
            vagas_ocupadas: ocupadas,
            vagas_restantes: restantes,
          }
        })
      )

      setRoteiros(comOcupacao)
    } catch (error: unknown) {
      console.error('Erro ao carregar roteiros do guia:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao carregar seus roteiros.')
      setRoteiros([])
    }
  }

  async function atualizar() {
    if (!guiaId) return

    setAtualizando(true)
    setMensagem('')
    setErro('')

    try {
      await carregarRoteiros(guiaId)
      setMensagem('Roteiros atualizados.')
    } finally {
      setAtualizando(false)
    }
  }

  async function handleExcluir(roteiro: Roteiro) {
    if (!guiaId) {
      setErro('Não foi possível identificar o guia logado. Faça login novamente.')
      return
    }

    const confirmar = window.confirm(
      `Deseja remover o roteiro "${roteiro.titulo}"? Ele deixará de aparecer para clientes, mas o histórico será preservado.`
    )

    if (!confirmar) return

    setExcluindoId(roteiro.id)
    setErro('')
    setMensagem('')

    try {
      const resposta = await fetch('/api/guia/roteiros/excluir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roteiroId: roteiro.id,
          guiaId,
        }),
      })

      const json = (await resposta.json().catch(() => null)) as {
        sucesso?: boolean
        erro?: string
      } | null

      if (!resposta.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível remover o roteiro.')
      }

      setMensagem('Roteiro removido com sucesso.')
      setRoteiros((prev: Roteiro[]) => prev.filter((item: Roteiro) => item.id !== roteiro.id))
    } catch (error: unknown) {
      console.error('Erro ao excluir roteiro:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao excluir roteiro.')
    } finally {
      setExcluindoId(null)
    }
  }

  const roteirosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return roteiros.filter((roteiro: Roteiro) => {
      const textoBusca = [
        roteiro.titulo,
        roteiro.localizacao,
        roteiro.local,
        roteiro.descricao,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const bateBusca = !termo || textoBusca.includes(termo)

      const bateDificuldade = dificuldade === 'todas' || normalizar(roteiro.dificuldade) === dificuldade

      const status = statusVisual(roteiro)
      const statusNormalizado = normalizar(roteiro.status)

      const bateStatus =
        statusFiltro === 'todos' ||
        (statusFiltro === 'ativos' && status.classe === 'green') ||
        (statusFiltro === 'pendentes' && (status.classe === 'yellow' || statusNormalizado === 'rascunho')) ||
        (statusFiltro === 'inativos' && (status.classe === 'muted' || roteiro.ativo === false))

      return bateBusca && bateDificuldade && bateStatus
    })
  }, [roteiros, busca, dificuldade, statusFiltro])

  const resumo = useMemo(() => {
    const ativos = roteiros.filter((roteiro: Roteiro) => statusVisual(roteiro).classe === 'green').length
    const pendentes = roteiros.filter((roteiro: Roteiro) => statusVisual(roteiro).classe === 'yellow').length
    const ocupadas = roteiros.reduce((total: number, roteiro: Roteiro) => total + Number(roteiro.vagas_ocupadas || 0), 0)
    const receitaPotencial = roteiros
      .filter((roteiro: Roteiro) => !roteiroExcluidoOuCancelado(roteiro))
      .reduce((total: number, roteiro: Roteiro) => total + precoRoteiro(roteiro) * Number(roteiro.vagas_ocupadas || 0), 0)

    return {
      total: roteiros.length,
      ativos,
      pendentes,
      ocupadas,
      receitaPotencial,
    }
  }, [roteiros])

  if (carregando) {
    return (
      <main className="loadingPage">
        <style jsx>{estilos}</style>
        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <span>Carregando seus roteiros...</span>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <style jsx>{estilos}</style>

      <header className="topbar">
        <div className="topbarInner">
          <button
            type="button"
            className="brandHeader"
            onClick={() => router.push('/guia/dashboard')}
            aria-label="Voltar para dashboard do guia"
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" className="brandLogo" />

            <div className="brandTextBlock">
              <div className="brandName">PrussikTrails</div>
              <div className="brandSubtitle">Meus roteiros</div>
            </div>
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
          <div>
            <div className="eyebrow">Área do guia</div>
            <h1>Meus roteiros</h1>
            <p>
              Olá, {primeiroNome(user?.nome)}. Acompanhe vagas, datas, status e remova roteiros sem perder histórico de reservas.
            </p>
          </div>

          <div className="heroActions">
            <button
              type="button"
              className="primaryAction"
              onClick={() => router.push('/guia/roteiros/novo')}
            >
              + Novo roteiro
            </button>

            <button
              type="button"
              className="secondaryAction"
              onClick={atualizar}
              disabled={atualizando}
            >
              {atualizando ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </section>

        {(mensagem || erro) && (
          <div className={erro ? 'alert error' : 'alert success'}>
            {erro || mensagem}
          </div>
        )}

        <section className="summaryGrid">
          <article className="summaryCard">
            <span>Total</span>
            <strong>{resumo.total}</strong>
          </article>

          <article className="summaryCard">
            <span>Ativos</span>
            <strong>{resumo.ativos}</strong>
          </article>

          <article className="summaryCard">
            <span>Em análise</span>
            <strong>{resumo.pendentes}</strong>
          </article>

          <article className="summaryCard">
            <span>Participantes</span>
            <strong>{resumo.ocupadas}</strong>
          </article>
        </section>

        <section className="filtersCard">
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por título, local ou descrição"
          />

          <select value={dificuldade} onChange={(event) => setDificuldade(event.target.value)}>
            <option value="todas">Todas as dificuldades</option>
            <option value="facil">Fácil</option>
            <option value="moderada">Moderada</option>
            <option value="dificil">Difícil</option>
            <option value="extrema">Extrema</option>
          </select>

          <select value={statusFiltro} onChange={(event) => setStatusFiltro(event.target.value as StatusFiltro)}>
            <option value="ativos">Ativos</option>
            <option value="pendentes">Em análise/rascunho</option>
            <option value="inativos">Inativos</option>
            <option value="todos">Todos</option>
          </select>
        </section>

        {roteirosFiltrados.length === 0 ? (
          <section className="empty">
            <div>🧭</div>
            <h2>Nenhum roteiro encontrado</h2>
            <p>Crie uma nova experiência ou ajuste os filtros para visualizar outros roteiros.</p>
            <button type="button" className="primaryAction" onClick={() => router.push('/guia/roteiros/novo')}>
              Criar roteiro
            </button>
          </section>
        ) : (
          <section className="grid">
            {roteirosFiltrados.map((roteiro: Roteiro) => {
              const foto = fotoRoteiro(roteiro)
              const status = statusVisual(roteiro)
              const vagasTexto = labelVagas(roteiro)
              const esgotado = vagasTexto === 'Esgotado'
              const excluindo = excluindoId === roteiro.id

              return (
                <article className="roteiroCard" key={roteiro.id}>
                  <button
                    type="button"
                    className="cover"
                    onClick={() => router.push(`/roteiros/${roteiro.id}`)}
                    aria-label={`Ver ${roteiro.titulo}`}
                  >
                    {foto ? (
                      <img
                        src={foto}
                        alt={roteiro.titulo}
                        onError={(event) => {
                          ;(event.currentTarget as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <span>🧭</span>
                    )}
                  </button>

                  <div className="cardBody">
                    <div className="cardTopLine">
                      <span className={`statusBadge ${status.classe}`}>{status.label}</span>
                      <span className={`statusBadge ${esgotado ? 'red' : 'green'}`}>👥 {vagasTexto}</span>
                    </div>

                    <h2>{roteiro.titulo}</h2>
                    <p>{roteiro.localizacao || roteiro.local || 'Local a definir'}</p>

                    <div className="badges">
                      <span>📅 {formatarData(roteiro.data_disponivel || extrairDataBase(roteiro))}</span>
                      <span>🔁 {labelRecorrencia(roteiro.recorrencia)}</span>
                      <span>🥾 {kmRoteiro(roteiro)} km</span>
                      <span>⏱️ {roteiro.duracao_horas || roteiro.duracao || 0} h</span>
                      <span>📌 {roteiro.dificuldade || 'Nível livre'}</span>
                    </div>

                    <div className="metricsRow">
                      <div>
                        <span>Preço</span>
                        <strong>{formatarMoeda(precoRoteiro(roteiro))}</strong>
                      </div>

                      <div>
                        <span>Ocupadas</span>
                        <strong>{roteiro.vagas_ocupadas || 0}</strong>
                      </div>
                    </div>

                    <div className="cardActions">
                      <button
                        type="button"
                        className="secondaryAction small"
                        onClick={() => router.push(`/roteiros/${roteiro.id}`)}
                      >
                        Ver público
                      </button>

                      <button
                        type="button"
                        className="dangerAction"
                        onClick={() => handleExcluir(roteiro)}
                        disabled={excluindo}
                      >
                        {excluindo ? 'Removendo...' : 'Excluir'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </section>
    </main>
  )
}

const estilos = `
  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: #f6f7f1;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .page,
  .loadingPage {
    min-height: 100vh;
    min-height: 100dvh;
    background:
      radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.16), transparent 28%),
      radial-gradient(circle at 90% 10%, rgba(251, 146, 60, 0.14), transparent 28%),
      linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
    color: #172018;
  }

  .loadingPage {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .loadingCard {
    width: min(360px, 100%);
    border-radius: 28px;
    background: rgba(255, 253, 247, 0.86);
    border: 1px solid rgba(62, 74, 45, 0.10);
    box-shadow: 0 22px 60px rgba(25, 35, 18, 0.12);
    padding: 24px;
    display: grid;
    justify-items: center;
    gap: 10px;
    color: #55624b;
    font-size: 14px;
    font-weight: 850;
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
    border-bottom: 1px solid rgba(62, 74, 45, 0.10);
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

  .brandHeader {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 10px;
    min-width: 0;
    border: 0;
    background: transparent;
    padding: 0;
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
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
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
    font-size: clamp(10px, 1.4vw, 14px);
    font-weight: 850;
    color: #7b8372;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .profileButton {
    width: 38px;
    height: 38px;
    flex: 0 0 auto;
    border: 1px solid rgba(62, 74, 45, 0.12);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.72);
    color: #203c2e;
    cursor: pointer;
    box-shadow: 0 10px 26px rgba(25, 35, 18, 0.08);
    font-size: 17px;
  }

  .container {
    max-width: 1180px;
    margin: 0 auto;
    padding: 22px 16px 52px;
  }

  .hero {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 18px;
    border-radius: 34px;
    padding: 24px;
    margin-bottom: 16px;
    color: #fffdf7;
    background:
      linear-gradient(135deg, rgba(23, 32, 24, 0.82), rgba(23, 32, 24, 0.44)),
      radial-gradient(circle at top right, rgba(132, 204, 22, 0.26), transparent 34%),
      linear-gradient(135deg, #203322 0%, #647a49 46%, #d7c6a1 100%);
    box-shadow: 0 24px 60px rgba(23, 32, 24, 0.16);
  }

  .eyebrow {
    width: fit-content;
    border-radius: 999px;
    padding: 7px 11px;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: #ecfccb;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .hero h1 {
    margin: 0;
    font-size: clamp(34px, 5vw, 58px);
    line-height: 0.94;
    font-weight: 950;
    letter-spacing: -0.075em;
  }

  .hero p {
    max-width: 620px;
    margin: 12px 0 0;
    color: rgba(255, 255, 255, 0.78);
    font-size: 14px;
    line-height: 1.58;
    font-weight: 650;
  }

  .heroActions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .primaryAction,
  .secondaryAction,
  .dangerAction {
    border: 0;
    border-radius: 999px;
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  }

  .primaryAction {
    background: #991b1b;
    color: #fffdf7;
    box-shadow: 0 14px 30px rgba(153, 27, 27, 0.22);
  }

  .secondaryAction {
    background: rgba(255, 255, 255, 0.82);
    color: #24351f;
    border: 1px solid rgba(62, 74, 45, 0.12);
  }

  .dangerAction {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid rgba(153, 27, 27, 0.12);
  }

  .small {
    padding: 10px 13px;
    font-size: 12px;
  }

  .primaryAction:hover,
  .secondaryAction:hover,
  .dangerAction:hover,
  .profileButton:hover {
    transform: translateY(-1px);
  }

  .primaryAction:disabled,
  .secondaryAction:disabled,
  .dangerAction:disabled {
    opacity: 0.62;
    cursor: not-allowed;
    transform: none;
  }

  .alert {
    margin-bottom: 16px;
    border-radius: 18px;
    padding: 13px 15px;
    font-size: 13px;
    font-weight: 850;
  }

  .alert.error {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }

  .alert.success {
    background: #ecfdf5;
    color: #166534;
    border: 1px solid #bbf7d0;
  }

  .summaryGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  .summaryCard {
    border-radius: 24px;
    padding: 16px;
    background: rgba(255, 253, 247, 0.88);
    border: 1px solid rgba(62, 74, 45, 0.10);
    box-shadow: 0 12px 34px rgba(25, 35, 18, 0.06);
  }

  .summaryCard span {
    display: block;
    color: #66705d;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .summaryCard strong {
    display: block;
    margin-top: 6px;
    color: #172018;
    font-size: 25px;
    font-weight: 950;
    letter-spacing: -0.06em;
  }

  .filtersCard {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 180px 180px;
    gap: 10px;
    margin-bottom: 16px;
    border-radius: 26px;
    padding: 14px;
    background: rgba(255, 253, 247, 0.88);
    border: 1px solid rgba(62, 74, 45, 0.10);
    box-shadow: 0 12px 34px rgba(25, 35, 18, 0.06);
  }

  .filtersCard input,
  .filtersCard select {
    width: 100%;
    border: 1px solid rgba(62, 74, 45, 0.14);
    border-radius: 16px;
    padding: 12px 13px;
    background: rgba(255, 255, 255, 0.72);
    color: #172018;
    font-size: 13px;
    font-weight: 750;
    outline: none;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .roteiroCard {
    overflow: hidden;
    border-radius: 30px;
    background: rgba(255, 253, 247, 0.92);
    border: 1px solid rgba(62, 74, 45, 0.10);
    box-shadow: 0 12px 34px rgba(25, 35, 18, 0.08);
  }

  .cover {
    width: 100%;
    height: 192px;
    border: 0;
    padding: 0;
    overflow: hidden;
    background:
      radial-gradient(circle at top right, rgba(132, 204, 22, 0.25), transparent 32%),
      linear-gradient(135deg, #203322, #647a49);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fffdf7;
    font-size: 42px;
    cursor: pointer;
  }

  .cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.28s ease;
  }

  .roteiroCard:hover .cover img {
    transform: scale(1.04);
  }

  .cardBody {
    padding: 16px;
  }

  .cardTopLine {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }

  .statusBadge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 950;
  }

  .statusBadge.green { background: #dcfce7; color: #166534; }
  .statusBadge.yellow { background: #fef3c7; color: #92400e; }
  .statusBadge.red { background: #fee2e2; color: #991b1b; }
  .statusBadge.gray { background: #f1f5f9; color: #475569; }
  .statusBadge.muted { background: #e7e5e4; color: #57534e; }

  .cardBody h2 {
    margin: 0;
    color: #172018;
    font-size: 17px;
    line-height: 1.18;
    font-weight: 950;
    letter-spacing: -0.04em;
  }

  .cardBody p {
    margin: 7px 0 0;
    color: #66705d;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 700;
  }

  .badges {
    display: flex;
    gap: 7px;
    flex-wrap: wrap;
    margin: 13px 0;
  }

  .badges span {
    display: inline-flex;
    border-radius: 999px;
    padding: 6px 9px;
    background: #f4f1e7;
    color: #59614f;
    font-size: 11px;
    font-weight: 850;
  }

  .metricsRow {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin: 12px 0 14px;
  }

  .metricsRow div {
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.66);
    border: 1px solid rgba(62, 74, 45, 0.08);
    padding: 10px;
  }

  .metricsRow span {
    display: block;
    color: #7b8372;
    font-size: 10px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .metricsRow strong {
    display: block;
    margin-top: 4px;
    color: #16a34a;
    font-size: 15px;
    font-weight: 950;
  }

  .cardActions {
    display: flex;
    gap: 8px;
    justify-content: space-between;
  }

  .cardActions button {
    flex: 1;
  }

  .empty {
    text-align: center;
    border-radius: 30px;
    background: rgba(255, 253, 247, 0.92);
    border: 1px solid rgba(62, 74, 45, 0.10);
    box-shadow: 0 12px 34px rgba(25, 35, 18, 0.08);
    padding: 42px 18px;
  }

  .empty div {
    font-size: 46px;
    margin-bottom: 8px;
  }

  .empty h2 {
    margin: 0;
    color: #172018;
    font-size: 21px;
    font-weight: 950;
    letter-spacing: -0.04em;
  }

  .empty p {
    margin: 8px auto 18px;
    max-width: 420px;
    color: #66705d;
    font-size: 14px;
    line-height: 1.5;
    font-weight: 700;
  }

  @media (max-width: 980px) {
    .grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .summaryGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .filtersCard {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .topbar {
      padding: 9px 12px;
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
      font-size: 9px;
      letter-spacing: 0.11em;
      margin-top: 4px;
    }

    .profileButton {
      width: 34px;
      height: 34px;
      font-size: 15px;
    }

    .container {
      padding: 16px 12px 38px;
    }

    .hero {
      display: grid;
      padding: 20px;
      border-radius: 28px;
    }

    .hero h1 {
      font-size: 37px;
    }

    .hero p {
      font-size: 13px;
    }

    .heroActions {
      justify-content: stretch;
    }

    .heroActions button {
      flex: 1;
    }

    .summaryGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .summaryCard {
      padding: 13px;
      border-radius: 20px;
    }

    .summaryCard strong {
      font-size: 21px;
    }

    .grid {
      grid-template-columns: 1fr;
    }

    .cover {
      height: 176px;
    }
  }
`
