'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type AnyRecord = Record<string, any>
type Recorrencia = 'unica' | 'semanal' | 'mensal' | 'anual'

type Roteiro = {
  id: string
  titulo?: string
  nome?: string
  descricao?: string
  preco?: number
  valor?: number
  duracao_horas?: number
  duracao?: string
  km?: number
  distancia_km?: number
  dificuldade?: string
  nivel?: string
  localizacao?: string
  local?: string
  cidade?: string
  endereco_formatado?: string
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  image_url?: string | null
  capa_url?: string | null
  status?: string
  situacao?: string
  publicacao?: string
  ativo?: boolean | null
  aprovado?: boolean | null
  limite_pessoas?: number | null
  recorrencia?: Recorrencia | string | null
  proxima_data?: string | null
  data_roteiro?: string | null
  data_trilha?: string | null
  data_saida?: string | null
  data_evento?: string | null
  data_inicio?: string | null
  embarque_data_hora?: string | null
  embarque_data?: string | null
  vagas_ocupadas?: number
  vagas_restantes?: number | null
  data_disponivel?: string | null
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

function numero(valor: unknown) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

function tituloRoteiro(roteiro: Roteiro) {
  return texto(roteiro.titulo || roteiro.nome) || 'Roteiro PrussikTrails'
}

function fotoRoteiro(roteiro: Roteiro) {
  return texto(roteiro.foto_capa || roteiro.foto_url || roteiro.imagem_url || roteiro.image_url || roteiro.capa_url)
}

function localRoteiro(roteiro: Roteiro) {
  return texto(roteiro.endereco_formatado || roteiro.localizacao || roteiro.local || roteiro.cidade) || 'Local a confirmar'
}

function precoRoteiro(roteiro: Roteiro) {
  return numero(roteiro.preco ?? roteiro.valor)
}

function kmRoteiro(roteiro: Roteiro) {
  return numero(roteiro.km ?? roteiro.distancia_km)
}

function duracaoRoteiro(roteiro: Roteiro) {
  return texto(roteiro.duracao || (roteiro.duracao_horas ? `${roteiro.duracao_horas} h` : '')) || 'A definir'
}

function roteiroPublicado(roteiro: Roteiro) {
  if (roteiro.ativo === false) return false
  if (roteiro.aprovado === true) return true

  const status = normalizar(roteiro.status || roteiro.situacao || roteiro.publicacao)
  if (!status) return true

  return ['ativo', 'aprovado', 'aprovada', 'publicado', 'publicada', 'confirmado', 'confirmada'].includes(status)
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
    roteiro.data_disponivel ||
    roteiro.proxima_data ||
    roteiro.data_roteiro ||
    roteiro.data_trilha ||
    roteiro.data_saida ||
    roteiro.data_evento ||
    roteiro.data_inicio ||
    roteiro.embarque_data_hora ||
    roteiro.embarque_data ||
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
  if (recorrencia === 'semanal') while (proxima < hoje) proxima.setDate(proxima.getDate() + 7)
  if (recorrencia === 'mensal') while (proxima < hoje) proxima.setMonth(proxima.getMonth() + 1)
  if (recorrencia === 'anual') while (proxima < hoje) proxima.setFullYear(proxima.getFullYear() + 1)

  return formatDateInput(proxima)
}

export default function ClienteRoteirosPage() {
  const router = useRouter()

  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mensagem, setMensagem] = useState('')
  const [busca, setBusca] = useState('')
  const [dificuldade, setDificuldade] = useState('todas')

  useEffect(() => {
    carregarRoteiros()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function carregarOcupacao(roteiroId: string, dataDisponivel: string | null) {
    const { data, error } = await supabase
      .from('reservas')
      .select('quantidade_pessoas, quantidade, status, data_trilha, data_roteiro, data_reserva')
      .eq('roteiro_id', roteiroId)

    if (error) {
      console.warn('Erro ao carregar ocupação:', error)
      return 0
    }

    const reservasValidas = (data || []).filter((reserva: AnyRecord) => {
      const status = normalizar(reserva.status)
      if (status === 'cancelada' || status === 'cancelado') return false
      if (!dataDisponivel) return true

      const dataReserva = reserva.data_trilha || reserva.data_roteiro || reserva.data_reserva || null
      if (!dataReserva) return true

      return String(dataReserva).slice(0, 10) === dataDisponivel
    })

    return reservasValidas.reduce((total: number, reserva: AnyRecord) => {
      return total + Number(reserva.quantidade_pessoas || reserva.quantidade || 1)
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
        .map((roteiro) => ({
          ...roteiro,
          data_disponivel: calcularProximaDataValida(roteiro),
        }))

      const comOcupacao = await Promise.all(
        roteirosBase.map(async (roteiro) => {
          const ocupadas = await carregarOcupacao(roteiro.id, roteiro.data_disponivel || null)
          const limite = roteiro.limite_pessoas === null || roteiro.limite_pessoas === undefined ? null : Number(roteiro.limite_pessoas)
          const restantes = limite === null ? null : Math.max(limite - ocupadas, 0)

          return { ...roteiro, vagas_ocupadas: ocupadas, vagas_restantes: restantes }
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

    return roteiros.filter((roteiro) => {
      const textoBusca = normalizar(`${tituloRoteiro(roteiro)} ${localRoteiro(roteiro)} ${roteiro.descricao || ''}`)
      const bateBusca = !termo || textoBusca.includes(termo)
      const nivel = normalizar(roteiro.dificuldade || roteiro.nivel)
      const filtro = normalizar(dificuldade)
      const bateDificuldade = filtro === 'todas' || nivel === filtro || nivel.includes(filtro)
      return bateBusca && bateDificuldade
    })
  }, [roteiros, busca, dificuldade])

  function formatarMoeda(valor?: number) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function formatarData(data?: string | null) {
    if (!data) return 'Data a definir'
    const date = new Date(`${String(data).slice(0, 10)}T12:00:00`)
    if (Number.isNaN(date.getTime())) return 'Data a definir'
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
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
    return `${restantes} vaga(s)`
  }

  function irPeloLogo() {
    try {
      const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null
      const usuario = userData ? JSON.parse(userData) as { tipo?: string | null } : null

      if (usuario?.tipo === 'cliente') return router.push('/cliente/dashboard')
      if (usuario?.tipo === 'guia') return router.push('/guia/dashboard')
      if (usuario?.tipo === 'admin') return router.push('/admin/dashboard')

      return router.push('/login')
    } catch {
      return router.push('/login')
    }
  }

  if (carregando) {
    return (
      <main className="loading">
        <style>{styles}</style>
        <div className="spinner" />
        <p>Carregando roteiros...</p>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{styles}</style>

      <header className="header">
        <div className="headerInner">
          <button type="button" className="brandLogoOnly" onClick={irPeloLogo} aria-label="Voltar para o painel">
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          </button>
        </div>
      </header>

      <section className="container">
        <section className="hero">
          <div>
            <div className="eyebrow">Roteiros disponíveis</div>
            <h1>Escolha sua próxima experiência.</h1>
            <p>Roteiros publicados por guias e agências, com vagas, data e informações essenciais em um só lugar.</p>
          </div>
        </section>

        {mensagem && <div className="alert">{mensagem}</div>}

        <div className="filtersCard">
          <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por título, local ou descrição" />
          <select value={dificuldade} onChange={(event) => setDificuldade(event.target.value)}>
            <option value="todas">Todas as dificuldades</option>
            <option value="facil">Fácil</option>
            <option value="medio">Médio</option>
            <option value="moderada">Moderada</option>
            <option value="dificil">Difícil</option>
            <option value="extrema">Extrema</option>
          </select>
        </div>

        {roteirosFiltrados.length === 0 ? (
          <div className="empty"><div>🧭</div>Nenhum roteiro disponível no momento.</div>
        ) : (
          <div className="grid">
            {roteirosFiltrados.map((roteiro) => {
              const vagasTexto = labelVagas(roteiro)
              const esgotado = vagasTexto === 'Esgotado'
              const foto = fotoRoteiro(roteiro)

              return (
                <article key={roteiro.id} className="roteiroCard" onClick={() => router.push(`/roteiros/${roteiro.id}`)}>
                  <div className="cover">
                    {foto ? <img src={foto} alt={tituloRoteiro(roteiro)} /> : <span>🏔️</span>}
                  </div>

                  <div className="cardBody">
                    <h3>{tituloRoteiro(roteiro)}</h3>
                    <p>{localRoteiro(roteiro)}</p>

                    <div className="badges">
                      <span className="badge green">📅 {formatarData(roteiro.data_disponivel)}</span>
                      <span className="badge">🔁 {labelRecorrencia(roteiro.recorrencia)}</span>
                      <span className={`badge ${esgotado ? 'red' : 'green'}`}>👥 {vagasTexto}</span>
                    </div>

                    <div className="meta">
                      <span>🥾 {kmRoteiro(roteiro)} km</span>
                      <span>⏱️ {duracaoRoteiro(roteiro)}</span>
                      <span>📌 {roteiro.dificuldade || roteiro.nivel || 'Nível livre'}</span>
                      <span>👤 {roteiro.limite_pessoas ? `Máx. ${roteiro.limite_pessoas}` : 'Sem limite'}</span>
                    </div>

                    <div className="priceRow">
                      <strong>{formatarMoeda(precoRoteiro(roteiro))}</strong>
                      <button type="button" onClick={(event) => { event.stopPropagation(); router.push(`/roteiros/${roteiro.id}`) }}>Ver detalhes</button>
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
  * { box-sizing: border-box; }
  body { margin: 0; background: #f6f7f1; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  button, input, select { font: inherit; }
  .page, .loading { min-height: 100vh; min-height: 100dvh; background: radial-gradient(circle at 10% 0%, rgba(132,204,22,.16), transparent 28%), radial-gradient(circle at 90% 10%, rgba(251,146,60,.14), transparent 28%), linear-gradient(180deg,#fffdf7 0%,#f3f5ea 48%,#eef2e5 100%); color: #172018; }
  .loading { display: grid; place-items: center; align-content: center; gap: 12px; color: #203c2e; font-weight: 900; }
  .spinner { width: 44px; height: 44px; border-radius: 999px; border: 4px solid rgba(32,60,46,.12); border-top-color: #dc2626; animation: spin .9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .header { position: sticky; top: 0; z-index: 30; background: rgba(255,253,247,.92); border-bottom: 1px solid rgba(15,23,42,.06); backdrop-filter: blur(18px); padding: 8px 12px; }
  .headerInner { max-width: 1180px; margin: 0 auto; display: flex; align-items: center; justify-content: center; }
  .brandLogoOnly { border: 0; background: transparent; padding: 0; display: inline-flex; align-items: center; justify-content: center; min-width: 0; max-width: min(280px,64vw); cursor: pointer; }
  .brandLogoOnly img { width: clamp(150px,36vw,250px); height: auto; max-height: 58px; object-fit: contain; display: block; }
  .container { max-width: 1180px; margin: 0 auto; padding: 22px 16px 48px; }
  .hero { border-radius: 34px; padding: 26px; margin-bottom: 16px; background: linear-gradient(135deg, rgba(32,60,46,.96), rgba(32,60,46,.72)), radial-gradient(circle at top right, rgba(190,242,100,.25), transparent 35%); color: #fffdf7; box-shadow: 0 22px 58px rgba(32,60,46,.16); }
  .eyebrow { color: #d9f99d; font-size: 11px; font-weight: 950; letter-spacing: .17em; text-transform: uppercase; margin-bottom: 12px; }
  .hero h1 { margin: 0; font-size: clamp(38px,5vw,68px); line-height: .92; letter-spacing: -.075em; font-weight: 950; }
  .hero p { max-width: 760px; margin: 14px 0 0; color: rgba(255,253,247,.78); line-height: 1.55; font-size: 14px; font-weight: 750; }
  .alert { margin-bottom: 16px; padding: 13px 14px; border-radius: 16px; background: #fee2e2; color: #991b1b; font-size: 13px; font-weight: 850; }
  .filtersCard { background: rgba(255,255,255,.84); border: 1px solid rgba(32,60,46,.08); border-radius: 24px; padding: 16px; box-shadow: 0 12px 34px rgba(32,60,46,.06); margin-bottom: 18px; display: grid; grid-template-columns: 1fr 220px; gap: 12px; }
  .filtersCard input, .filtersCard select { border: 1px solid rgba(32,60,46,.12); background: #fff; border-radius: 16px; padding: 12px 13px; font-size: 14px; outline: none; font-weight: 750; }
  .grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 18px; }
  .roteiroCard { background: rgba(255,255,255,.88); border: 1px solid rgba(32,60,46,.08); border-radius: 26px; overflow: hidden; box-shadow: 0 14px 34px rgba(32,60,46,.07); cursor: pointer; transition: transform .15s ease, box-shadow .15s ease; }
  .roteiroCard:hover { transform: translateY(-2px); box-shadow: 0 18px 42px rgba(32,60,46,.12); }
  .cover { aspect-ratio: 4 / 3; background: linear-gradient(135deg,#203c2e,#647a49); display: grid; place-items: center; font-size: 48px; color: white; overflow: hidden; }
  .cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cardBody { padding: 18px; }
  .cardBody h3 { margin: 0; font-size: 18px; color: #172018; line-height: 1.1; letter-spacing: -.04em; font-weight: 950; }
  .cardBody p { margin: 8px 0 0; color: #64748b; font-size: 13px; line-height: 1.45; font-weight: 750; }
  .badges { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0 14px; }
  .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 6px 9px; font-size: 11px; font-weight: 900; background: #fef3c7; color: #92400e; }
  .badge.green { background: #dcfce7; color: #166534; }
  .badge.red { background: #fee2e2; color: #991b1b; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; color: #64748b; font-size: 12px; margin-bottom: 14px; font-weight: 750; }
  .priceRow { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 12px; }
  .priceRow strong { color: #203c2e; font-size: 18px; font-weight: 950; letter-spacing: -.035em; }
  .priceRow button { border: 0; border-radius: 999px; padding: 10px 14px; background: #dc2626; color: #fff; font-weight: 950; cursor: pointer; }
  .empty { background: rgba(255,255,255,.84); border: 1px dashed rgba(32,60,46,.18); border-radius: 26px; padding: 40px 20px; text-align: center; color: #64748b; font-weight: 750; }
  .empty div { font-size: 46px; margin-bottom: 10px; }
  @media (max-width: 940px) { .grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
  @media (max-width: 640px) { .header { padding: 7px 10px; } .brandLogoOnly img { width: clamp(142px,52vw,218px); max-height: 50px; } .container { padding: 16px 12px 36px; } .hero { border-radius: 26px; padding: 22px; } .filtersCard, .grid { grid-template-columns: 1fr; } .roteiroCard { border-radius: 24px; } }
`
