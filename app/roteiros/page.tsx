'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Recorrencia = 'unica' | 'semanal' | 'mensal' | 'anual'

type UsuarioLocal = {
  id?: string | null
  nome?: string | null
  email?: string | null
  tipo?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
}

type Roteiro = {
  id: string
  titulo: string
  descricao?: string | null
  preco?: number | null
  duracao_horas?: number | null
  km?: number | null
  dificuldade?: string | null
  localizacao?: string | null
  local?: string | null
  cidade?: string | null
  destino?: string | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  image_url?: string | null
  capa_url?: string | null
  status?: string | null
  ativo?: boolean | null
  limite_pessoas?: number | null
  recorrencia?: Recorrencia | string | null
  renovar_automaticamente?: boolean | null
  proxima_data?: string | null
  embarque_data_hora?: string | null
  retorno_data_hora?: string | null
  vagas_ocupadas?: number
  vagas_restantes?: number | null
  data_disponivel?: string | null
  created_at?: string | null
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

function primeiroTexto(...valores: unknown[]) {
  for (const valor of valores) {
    const item = texto(valor)
    if (item) return item
  }
  return ''
}

function fotoRoteiro(roteiro: Roteiro) {
  return primeiroTexto(
    roteiro.foto_capa,
    roteiro.foto_url,
    roteiro.imagem_url,
    roteiro.image_url,
    roteiro.capa_url
  )
}

function localRoteiro(roteiro: Roteiro) {
  return primeiroTexto(
    roteiro.localizacao,
    roteiro.local,
    roteiro.cidade,
    roteiro.destino
  ) || 'Local a definir'
}

function avatarUsuario(user?: UsuarioLocal | null) {
  return primeiroTexto(user?.avatar_url, user?.foto_url, user?.imagem_url)
}

function nomeUsuario(user?: UsuarioLocal | null) {
  return primeiroTexto(user?.nome, user?.email) || 'Visitante'
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
  const data = roteiro.proxima_data || roteiro.embarque_data_hora || roteiro.retorno_data_hora || null
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

function roteiroPublicado(roteiro: Roteiro) {
  if (roteiro.ativo === false) return false

  const status = normalizar(roteiro.status)
  if (!status) return true

  return ![
    'cancelado',
    'cancelada',
    'inativo',
    'inativa',
    'rascunho',
    'arquivado',
    'arquivada',
    'pausado',
    'pausada',
    'reprovado',
    'reprovada',
  ].includes(status)
}

function formatarMoeda(valor?: number | null) {
  const numero = numeroSeguro(valor)
  if (numero <= 0) return 'Consulte'

  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatarData(data?: string | null) {
  if (!data) return 'Data a definir'

  const date = new Date(`${String(data).slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return 'Data a definir'

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

function labelRecorrencia(recorrencia?: string | null) {
  if (recorrencia === 'semanal') return 'Semanal'
  if (recorrencia === 'mensal') return 'Mensal'
  if (recorrencia === 'anual') return 'Anual'
  return 'Única vez'
}

function labelVagas(roteiro: Roteiro) {
  if (roteiro.limite_pessoas === null || roteiro.limite_pessoas === undefined) return 'Sem limite'

  const restantes = Number(roteiro.vagas_restantes || 0)
  if (restantes <= 0) return 'Esgotado'

  return `${restantes} vaga${restantes === 1 ? '' : 's'}`
}

function labelDificuldade(dificuldade?: string | null) {
  const nivel = normalizar(dificuldade)

  if (nivel === 'facil') return 'Fácil'
  if (nivel === 'moderada' || nivel === 'medio' || nivel === 'media') return 'Moderada'
  if (nivel === 'dificil') return 'Difícil'
  if (nivel === 'extrema') return 'Extrema'

  return texto(dificuldade) || 'Nível livre'
}

export default function ClienteRoteirosPage() {
  const router = useRouter()

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mensagem, setMensagem] = useState('')
  const [busca, setBusca] = useState('')
  const [dificuldade, setDificuldade] = useState('todas')

  useEffect(() => {
    try {
      const salvo = localStorage.getItem('user') || localStorage.getItem('usuario')
      const usuario = salvo ? (JSON.parse(salvo) as UsuarioLocal) : null
      setUser(usuario?.id ? usuario : null)
    } catch {
      setUser(null)
    }

    carregarRoteiros()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function carregarOcupacao(roteiroId: string, dataDisponivel: string | null) {
    const { data, error } = await supabase
      .from('reservas')
      .select('quantidade_pessoas, status, data_trilha, data_reserva')
      .eq('roteiro_id', roteiroId)

    if (error) {
      console.warn('Erro ao carregar ocupação:', error)
      return 0
    }

    const reservasValidas = (data || []).filter((reserva: any) => {
      if (reserva.status === 'cancelada') return false
      if (!dataDisponivel) return true

      const dataReserva = reserva.data_trilha || reserva.data_reserva || null
      if (!dataReserva) return true

      return String(dataReserva).slice(0, 10) === dataDisponivel
    })

    return reservasValidas.reduce((total: number, reserva: any) => {
      return total + Number(reserva.quantidade_pessoas || 1)
    }, 0)
  }

  async function carregarRoteiros() {
    setCarregando(true)
    setMensagem('')

    try {
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const roteirosBase = ((data || []) as Roteiro[])
        .filter(roteiroPublicado)
        .map((roteiro) => {
          const dataDisponivel = calcularProximaDataValida(roteiro)
          return { ...roteiro, data_disponivel: dataDisponivel }
        })

      const comOcupacao = await Promise.all(
        roteirosBase.map(async (roteiro) => {
          const ocupadas = await carregarOcupacao(roteiro.id, roteiro.data_disponivel || null)
          const limite = roteiro.limite_pessoas === null || roteiro.limite_pessoas === undefined ? null : Number(roteiro.limite_pessoas)
          const restantes = limite === null ? null : Math.max(limite - ocupadas, 0)

          return {
            ...roteiro,
            vagas_ocupadas: ocupadas,
            vagas_restantes: restantes,
          }
        })
      )

      setRoteiros(comOcupacao)
    } catch (error: any) {
      console.error('Erro ao carregar roteiros:', error)
      setMensagem(error?.message || 'Erro ao carregar roteiros disponíveis.')
      setRoteiros([])
    } finally {
      setCarregando(false)
    }
  }

  const roteirosFiltrados = useMemo(() => {
    const termo = normalizar(busca)
    const dificuldadeFiltro = normalizar(dificuldade)

    return roteiros.filter((roteiro) => {
      const conteudoBusca = normalizar([
        roteiro.titulo,
        roteiro.localizacao,
        roteiro.local,
        roteiro.cidade,
        roteiro.destino,
        roteiro.descricao,
      ].filter(Boolean).join(' '))

      const bateBusca = !termo || conteudoBusca.includes(termo)
      const bateDificuldade = dificuldade === 'todas' || normalizar(roteiro.dificuldade) === dificuldadeFiltro

      return bateBusca && bateDificuldade
    })
  }, [roteiros, busca, dificuldade])

  const destaque = roteirosFiltrados[0] || roteiros[0] || null
  const avatar = avatarUsuario(user)
  const nome = nomeUsuario(user)

  function irPeloLogo() {
    const tipo = normalizar(user?.tipo)

    if (tipo === 'cliente') return router.push('/cliente/dashboard')
    if (tipo === 'guia') return router.push('/guia/dashboard')
    if (tipo === 'admin') return router.push('/admin/dashboard')

    router.push('/login')
  }

  function abrirAreaUsuario() {
    const tipo = normalizar(user?.tipo)

    if (tipo === 'cliente') return router.push('/cliente/dashboard')
    if (tipo === 'guia') return router.push('/guia/dashboard')
    if (tipo === 'admin') return router.push('/admin/dashboard')

    router.push('/login')
  }

  if (carregando) {
    return (
      <main className="loadingPage">
        <style>{styles}</style>
        <div className="loadingCard">
          <div className="spinner" />
          <strong>Carregando roteiros...</strong>
          <span>Buscando experiências disponíveis no PrussikTrails.</span>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{styles}</style>

      <header className="topbar">
        <div className="topbarInner">
          <button type="button" className="brandLogo" onClick={irPeloLogo} aria-label="Voltar para sua área no PrussikTrails">
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          </button>

          <button type="button" className="profileButton" onClick={abrirAreaUsuario} aria-label="Abrir minha área">
            {avatar ? <img src={avatar} alt={nome} /> : <span>{user?.id ? nome.charAt(0).toUpperCase() : '↗'}</span>}
          </button>
        </div>
      </header>

      <section className="shell">
        <section className="hero">
          <div className="heroText">
            <div className="eyebrow">Roteiros PrussikTrails</div>
            <h1>Escolha sua próxima jornada.</h1>
            <p>
              Experiências outdoor conduzidas por guias, com informações claras de data, nível, vagas e reserva pelo app.
            </p>
          </div>

          <aside className="heroHighlight" onClick={() => destaque && router.push(`/roteiros/${destaque.id}`)}>
            {destaque ? (
              <div className="highlightVisual">
                {fotoRoteiro(destaque) ? <img src={fotoRoteiro(destaque)} alt={destaque.titulo} /> : <span>🏔️</span>}
                <div className="highlightOverlay" />
                <div className="highlightTop">
                  <span>Em destaque</span>
                  <small>{formatarData(destaque.data_disponivel)}</small>
                </div>
                <div className="highlightBody">
                  <h2>{destaque.titulo}</h2>
                  <p>{localRoteiro(destaque)}</p>
                </div>
              </div>
            ) : (
              <div className="highlightEmpty">Novos roteiros aparecerão aqui em breve.</div>
            )}
          </aside>
        </section>

        {mensagem && <div className="alert">{mensagem}</div>}

        <section className="filtersPanel">
          <div className="filtersTop">
            <div>
              <span>Explorar</span>
              <h2>{roteirosFiltrados.length} roteiro{roteirosFiltrados.length === 1 ? '' : 's'} disponível{roteirosFiltrados.length === 1 ? '' : 'is'}</h2>
            </div>
            <button type="button" onClick={carregarRoteiros}>Atualizar</button>
          </div>

          <div className="filtersGrid">
            <label className="searchField">
              <span>Buscar roteiro</span>
              <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Título, cidade, trilha ou local" />
            </label>

            <label className="selectField">
              <span>Dificuldade</span>
              <select value={dificuldade} onChange={(event) => setDificuldade(event.target.value)}>
                <option value="todas">Todas</option>
                <option value="facil">Fácil</option>
                <option value="moderada">Moderada</option>
                <option value="dificil">Difícil</option>
                <option value="extrema">Extrema</option>
              </select>
            </label>
          </div>
        </section>

        {roteirosFiltrados.length === 0 ? (
          <section className="emptyState">
            <div>🧭</div>
            <h2>Nenhum roteiro encontrado.</h2>
            <p>Tente limpar os filtros ou buscar por outra cidade, trilha ou nível de dificuldade.</p>
            <button type="button" onClick={() => { setBusca(''); setDificuldade('todas') }}>Limpar filtros</button>
          </section>
        ) : (
          <section className="routesGrid">
            {roteirosFiltrados.map((roteiro) => {
              const foto = fotoRoteiro(roteiro)
              const vagasTexto = labelVagas(roteiro)
              const esgotado = vagasTexto === 'Esgotado'
              const preco = formatarMoeda(roteiro.preco)

              return (
                <article key={roteiro.id} className="routeCard" onClick={() => router.push(`/roteiros/${roteiro.id}`)}>
                  <div className="routeImage">
                    {foto ? (
                      <img
                        src={foto}
                        alt={roteiro.titulo}
                        loading="lazy"
                        onError={(event) => {
                          ;(event.currentTarget as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <span>🏔️</span>
                    )}

                    <div className="imageGradient" />
                    <div className="routeImageTop">
                      <span>{labelDificuldade(roteiro.dificuldade)}</span>
                      <strong>{formatarData(roteiro.data_disponivel)}</strong>
                    </div>
                  </div>

                  <div className="routeBody">
                    <div className="routeMain">
                      <h3>{roteiro.titulo}</h3>
                      <p>{localRoteiro(roteiro)}</p>
                    </div>

                    <div className="routeChips">
                      <span>🥾 {numeroSeguro(roteiro.km).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km</span>
                      <span>⏱️ {numeroSeguro(roteiro.duracao_horas)} h</span>
                      <span className={esgotado ? 'danger' : 'success'}>👥 {vagasTexto}</span>
                    </div>

                    <div className="routeFooter">
                      <div>
                        <small>Valor por pessoa</small>
                        <strong>{preco}</strong>
                      </div>
                      <button type="button" onClick={(event) => { event.stopPropagation(); router.push(`/roteiros/${roteiro.id}`) }}>
                        Ver detalhes
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

const styles = `
  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: #f6f7f1;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  button,
  input,
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
      radial-gradient(circle at 90% 8%, rgba(251,146,60,0.13), transparent 28%),
      linear-gradient(180deg,#fffdf7 0%,#f3f5ea 45%,#edf2e5 100%);
  }

  .loadingPage {
    display: grid;
    place-items: center;
    padding: 20px;
  }

  .loadingCard {
    display: grid;
    justify-items: center;
    gap: 8px;
    border-radius: 30px;
    background: rgba(255,255,255,0.88);
    border: 1px solid rgba(15,23,42,0.08);
    padding: 28px;
    box-shadow: 0 24px 60px rgba(15,23,42,0.12);
    color: #203c2e;
    text-align: center;
  }

  .loadingCard strong {
    font-size: 16px;
    font-weight: 950;
  }

  .loadingCard span {
    color: #64748b;
    font-size: 13px;
    font-weight: 750;
  }

  .spinner {
    width: 42px;
    height: 42px;
    border-radius: 999px;
    border: 3px solid #e5e7eb;
    border-top-color: #dc2626;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
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

  .brandLogo {
    grid-column: 2;
    justify-self: center;
    border: 0;
    background: transparent;
    padding: 0;
    cursor: pointer;
    display: flex;
    justify-content: center;
  }

  .brandLogo img {
    width: clamp(142px, 34vw, 238px);
    max-height: 58px;
    object-fit: contain;
    display: block;
  }

  .profileButton {
    grid-column: 3;
    justify-self: end;
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

  .profileButton img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .profileButton span {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #203c2e;
    color: #fffdf7;
    font-size: 15px;
    font-weight: 950;
  }

  .shell {
    max-width: 1180px;
    margin: 0 auto;
    padding: 22px 16px 54px;
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(300px, 390px);
    gap: 18px;
    align-items: stretch;
    margin-bottom: 16px;
  }

  .heroText,
  .heroHighlight,
  .filtersPanel,
  .routeCard,
  .emptyState {
    box-shadow: 0 24px 60px rgba(23,32,24,0.12);
  }

  .heroText {
    border-radius: 36px;
    padding: 30px;
    color: #fff;
    background:
      linear-gradient(135deg, rgba(23,32,24,0.82), rgba(23,32,24,0.44)),
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
    margin-bottom: 13px;
  }

  .heroText h1 {
    margin: 0;
    max-width: 790px;
    font-size: clamp(42px, 6vw, 76px);
    line-height: 0.92;
    font-weight: 950;
    letter-spacing: -0.085em;
  }

  .heroText p {
    max-width: 720px;
    margin: 15px 0 0;
    color: rgba(255,255,255,0.82);
    line-height: 1.6;
    font-size: 14px;
    font-weight: 650;
  }

  .heroHighlight {
    border: 1px solid rgba(15,23,42,0.06);
    border-radius: 36px;
    overflow: hidden;
    background: #172018;
    min-height: 280px;
    cursor: pointer;
  }

  .highlightVisual {
    position: relative;
    height: 100%;
    min-height: 280px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 20px;
    color: #fff;
    overflow: hidden;
  }

  .highlightVisual > img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .highlightVisual > span {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, #203c2e, #6f7f4f);
    font-size: 56px;
  }

  .highlightOverlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(23,32,24,0.44), rgba(23,32,24,0.16) 40%, rgba(23,32,24,0.76));
  }

  .highlightTop,
  .highlightBody {
    position: relative;
    z-index: 2;
  }

  .highlightTop {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .highlightTop span,
  .highlightTop small {
    border-radius: 999px;
    padding: 8px 11px;
    background: rgba(255,255,255,0.14);
    border: 1px solid rgba(255,255,255,0.18);
    color: #fff;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    backdrop-filter: blur(12px);
  }

  .highlightBody h2 {
    margin: 0;
    font-size: 30px;
    line-height: 0.98;
    letter-spacing: -0.06em;
    font-weight: 950;
  }

  .highlightBody p {
    margin: 8px 0 0;
    color: rgba(255,255,255,0.82);
    font-size: 13px;
    font-weight: 800;
  }

  .highlightEmpty {
    height: 100%;
    min-height: 280px;
    display: grid;
    place-items: center;
    padding: 20px;
    color: rgba(255,255,255,0.74);
    text-align: center;
    font-weight: 850;
  }

  .alert {
    border-radius: 18px;
    padding: 13px 15px;
    margin-bottom: 16px;
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
    font-size: 13px;
    font-weight: 850;
  }

  .filtersPanel,
  .emptyState {
    background: rgba(255,255,255,0.90);
    border: 1px solid rgba(15,23,42,0.06);
    border-radius: 30px;
  }

  .filtersPanel {
    padding: 18px;
    margin-bottom: 18px;
  }

  .filtersTop {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }

  .filtersTop span,
  .searchField span,
  .selectField span {
    display: block;
    color: #991b1b;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 5px;
  }

  .filtersTop h2 {
    margin: 0;
    color: #172018;
    font-size: 24px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.055em;
  }

  .filtersTop button,
  .routeFooter button,
  .emptyState button {
    border: 0;
    border-radius: 999px;
    padding: 11px 14px;
    background: #172018;
    color: #fffdf7;
    cursor: pointer;
    font-size: 12px;
    font-weight: 950;
    transition: 0.18s ease;
    white-space: nowrap;
  }

  .filtersTop button:hover,
  .routeFooter button:hover,
  .emptyState button:hover {
    transform: translateY(-1px);
  }

  .filtersGrid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 210px;
    gap: 12px;
  }

  .searchField,
  .selectField {
    display: grid;
    gap: 5px;
  }

  .searchField input,
  .selectField select {
    width: 100%;
    border: 1px solid rgba(15,23,42,0.10);
    background: #fffdf7;
    border-radius: 18px;
    padding: 13px 14px;
    color: #172018;
    outline: none;
    font-size: 14px;
    font-weight: 800;
  }

  .searchField input:focus,
  .selectField select:focus {
    border-color: rgba(32,60,46,0.32);
    box-shadow: 0 0 0 4px rgba(32,60,46,0.08);
  }

  .routesGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .routeCard {
    border: 1px solid rgba(15,23,42,0.06);
    background: rgba(255,255,255,0.92);
    border-radius: 30px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }

  .routeCard:hover {
    transform: translateY(-3px);
    box-shadow: 0 26px 58px rgba(23,32,24,0.16);
  }

  .routeImage {
    position: relative;
    aspect-ratio: 4 / 3;
    background: #eef2e5;
    display: grid;
    place-items: center;
    color: #64748b;
    font-size: 40px;
    overflow: hidden;
  }

  .routeImage img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .imageGradient {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(15,23,42,0.30), transparent 48%, rgba(15,23,42,0.10));
    pointer-events: none;
  }

  .routeImageTop {
    position: absolute;
    top: 13px;
    left: 13px;
    right: 13px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .routeImageTop span,
  .routeImageTop strong {
    border-radius: 999px;
    padding: 7px 10px;
    background: rgba(255,253,247,0.20);
    border: 1px solid rgba(255,255,255,0.22);
    color: #fff;
    font-size: 11px;
    font-weight: 950;
    text-shadow: 0 2px 10px rgba(0,0,0,0.35);
    backdrop-filter: blur(10px);
  }

  .routeBody {
    padding: 16px;
  }

  .routeMain h3 {
    margin: 0;
    color: #172018;
    font-size: 19px;
    line-height: 1.08;
    font-weight: 950;
    letter-spacing: -0.055em;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .routeMain p {
    margin: 7px 0 0;
    min-height: 34px;
    color: #64748b;
    font-size: 12px;
    line-height: 1.38;
    font-weight: 760;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .routeChips {
    display: flex;
    gap: 7px;
    flex-wrap: wrap;
    margin: 13px 0;
  }

  .routeChips span {
    border-radius: 999px;
    background: #eef2e5;
    color: #475569;
    padding: 7px 9px;
    font-size: 10px;
    font-weight: 950;
  }

  .routeChips span.success {
    background: #dcfce7;
    color: #166534;
  }

  .routeChips span.danger {
    background: #fee2e2;
    color: #991b1b;
  }

  .routeFooter {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-top: 12px;
    border-top: 1px solid rgba(15,23,42,0.06);
  }

  .routeFooter small {
    display: block;
    color: #94a3b8;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 3px;
  }

  .routeFooter strong {
    color: #203c2e;
    font-size: 17px;
    font-weight: 950;
    letter-spacing: -0.035em;
  }

  .emptyState {
    display: grid;
    justify-items: center;
    gap: 8px;
    padding: 42px 20px;
    text-align: center;
  }

  .emptyState div {
    font-size: 46px;
  }

  .emptyState h2 {
    margin: 0;
    color: #172018;
    font-size: 24px;
    font-weight: 950;
    letter-spacing: -0.055em;
  }

  .emptyState p {
    max-width: 420px;
    margin: 0 0 8px;
    color: #64748b;
    font-size: 13px;
    line-height: 1.5;
    font-weight: 760;
  }

  @media (max-width: 1040px) {
    .hero,
    .routesGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .heroText {
      grid-column: 1 / -1;
    }

    .heroHighlight {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 720px) {
    .topbar {
      padding: 7px 10px;
    }

    .topbarInner {
      grid-template-columns: 1fr auto;
    }

    .brandLogo {
      grid-column: 1;
      justify-self: start;
    }

    .brandLogo img {
      width: clamp(130px, 50vw, 205px);
      max-height: 50px;
    }

    .profileButton {
      grid-column: 2;
      width: 36px;
      height: 36px;
      box-shadow: none;
    }

    .shell {
      padding: 12px 9px 40px;
    }

    .hero,
    .routesGrid,
    .filtersGrid {
      grid-template-columns: 1fr;
    }

    .heroText,
    .heroHighlight,
    .filtersPanel,
    .routeCard,
    .emptyState {
      border-radius: 24px;
    }

    .heroText {
      padding: 20px;
    }

    .heroText h1 {
      font-size: 42px;
    }

    .highlightVisual {
      min-height: 250px;
      padding: 16px;
    }

    .filtersPanel,
    .routeBody {
      padding: 14px;
    }

    .filtersTop {
      display: grid;
    }

    .filtersTop button,
    .routeFooter button {
      width: 100%;
    }

    .routeFooter {
      align-items: stretch;
      display: grid;
    }
  }
`
