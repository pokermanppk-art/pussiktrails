'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Recorrencia = 'unica' | 'semanal' | 'mensal' | 'anual'

type Roteiro = {
  id: string
  titulo: string
  descricao?: string
  preco?: number
  duracao_horas?: number
  km?: number
  dificuldade?: string
  localizacao?: string
  local?: string
  cidade?: string
  foto_capa?: string | null
  status?: string
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

  const hojeInicio = () => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    return hoje
  }

  const formatDateInput = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const extrairDataBase = (roteiro: Roteiro) => {
    const data = roteiro.proxima_data || roteiro.embarque_data_hora || roteiro.retorno_data_hora || null
    if (!data) return null
    return String(data).slice(0, 10)
  }

  const calcularProximaDataValida = (roteiro: Roteiro) => {
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

  const carregarOcupacao = async (roteiroId: string, dataDisponivel: string | null) => {
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

  const roteiroPublicado = (roteiro: Roteiro) => {
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

  const carregarRoteiros = async () => {
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
        .filter((roteiro) => Boolean(roteiro.data_disponivel))

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
    const termo = busca.trim().toLowerCase()

    return roteiros.filter((roteiro) => {
      const bateBusca =
        !termo ||
        roteiro.titulo?.toLowerCase().includes(termo) ||
        roteiro.localizacao?.toLowerCase().includes(termo) ||
        roteiro.local?.toLowerCase().includes(termo) ||
        roteiro.cidade?.toLowerCase().includes(termo) ||
        roteiro.descricao?.toLowerCase().includes(termo)

      const dificuldadeRoteiro = normalizar(roteiro.dificuldade)
      const dificuldadeFiltro = normalizar(dificuldade)

      const bateDificuldade = dificuldade === 'todas' || dificuldadeRoteiro === dificuldadeFiltro
      return bateBusca && bateDificuldade
    })
  }, [roteiros, busca, dificuldade])

  const formatarMoeda = (valor?: number) => {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  const formatarData = (data?: string | null) => {
    if (!data) return 'Data a definir'
    const date = new Date(`${String(data).slice(0, 10)}T12:00:00`)
    if (Number.isNaN(date.getTime())) return 'Data a definir'
    return date.toLocaleDateString('pt-BR')
  }

  const labelRecorrencia = (recorrencia?: string | null) => {
    if (recorrencia === 'semanal') return 'Semanal'
    if (recorrencia === 'mensal') return 'Mensal'
    if (recorrencia === 'anual') return 'Anual'
    return 'Única vez'
  }

  const labelVagas = (roteiro: Roteiro) => {
    if (roteiro.limite_pessoas === null || roteiro.limite_pessoas === undefined) return 'Sem limite'
    const restantes = Number(roteiro.vagas_restantes || 0)
    if (restantes <= 0) return 'Esgotado'
    return `${restantes} vaga(s)`
  }

  const irPeloLogo = () => {
    try {
      const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null

      if (!userData) {
        router.push('/login')
        return
      }

      const usuario = JSON.parse(userData) as { tipo?: string | null }

      if (usuario.tipo === 'cliente') return router.push('/cliente/dashboard')
      if (usuario.tipo === 'guia') return router.push('/guia/dashboard')
      if (usuario.tipo === 'admin') return router.push('/admin/dashboard')

      router.push('/login')
    } catch {
      router.push('/login')
    }
  }

  if (carregando) {
    return (
      <div className="roteiros-loading">
        <style jsx global>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .roteiros-loading { min-height: 100dvh; display: flex; align-items: center; justify-content: center; background: #f3f4f6; }
          .spinner { width: 42px; height: 42px; border-radius: 999px; border: 3px solid #e5e7eb; border-top-color: #dc2626; animation: spin 1s linear infinite; margin: 0 auto 12px; }
        `}</style>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <div className="spinner" />
          Carregando roteiros...
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        .roteiros-page { min-height: 100vh; min-height: 100dvh; background: #f3f4f6; }
        .roteiros-header { position: sticky; top: 0; z-index: 30; background: rgba(255, 253, 247, 0.92); border-bottom: 1px solid rgba(15, 23, 42, 0.06); backdrop-filter: blur(18px); padding: 8px 12px; }
        .roteiros-header-inner { max-width: 1180px; margin: 0 auto; display: flex; align-items: center; justify-content: center; }
        .brandLogoOnly { border: 0; background: transparent; padding: 0; display: inline-flex; align-items: center; justify-content: center; min-width: 0; max-width: min(280px, 64vw); cursor: pointer; }
        .brandLogoOnly img { width: clamp(150px, 36vw, 250px); height: auto; max-height: 58px; object-fit: contain; display: block; }
        .roteiros-main { max-width: 1180px; margin: 0 auto; padding: 22px 16px 48px; }
        .filters-card { background: #ffffff; border-radius: 22px; padding: 18px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); margin-bottom: 18px; display: grid; grid-template-columns: 1fr 220px; gap: 12px; }
        .filters-card input, .filters-card select { border: 1px solid #d1d5db; border-radius: 14px; padding: 12px 13px; font-size: 14px; outline: none; }
        .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
        .roteiro-card { background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .roteiro-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.10); }
        .cover { height: 180px; background: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 48px; color: white; }
        .cover img { width: 100%; height: 100%; object-fit: cover; }
        .card-body { padding: 18px; }
        .badges { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0 14px; }
        .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 5px 9px; font-size: 11px; font-weight: 800; background: #fef3c7; color: #92400e; }
        .badge.green { background: #dcfce7; color: #166534; }
        .badge.red { background: #fee2e2; color: #991b1b; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; color: #6b7280; font-size: 12px; margin-bottom: 14px; }
        .price-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 12px; }
        .btn { border: none; border-radius: 999px; padding: 10px 14px; font-weight: 800; cursor: pointer; }
        .btn-red { background: #dc2626; color: #ffffff; }
        .empty { background: white; border-radius: 24px; padding: 40px 20px; text-align: center; color: #6b7280; }
        .alert { margin-bottom: 16px; padding: 13px 14px; border-radius: 14px; background: #fee2e2; color: #991b1b; font-size: 13px; }
        @media (max-width: 940px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 640px) { .roteiros-header { padding: 7px 10px; } .brandLogoOnly { max-width: 72vw; } .brandLogoOnly img { width: clamp(142px, 52vw, 218px); max-height: 50px; } .filters-card { grid-template-columns: 1fr; } .grid { grid-template-columns: 1fr; } .roteiros-main { padding: 16px 12px 36px; } }
      `}</style>

      <div className="roteiros-page">
        <header className="roteiros-header">
          <div className="roteiros-header-inner">
            <button type="button" className="brandLogoOnly" onClick={irPeloLogo} aria-label="Voltar para sua área no PrussikTrails">
              <img src="/logo-prussik-display.png" alt="PrussikTrails" />
            </button>
          </div>
        </header>

        <main className="roteiros-main">
          <div style={{ marginBottom: '18px' }}>
            <h2 style={{ margin: 0, color: '#111827', fontSize: '25px' }}>🏔️ Explore roteiros</h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '6px' }}>Escolha uma aventura com vagas disponíveis.</p>
          </div>

          {mensagem && <div className="alert">{mensagem}</div>}

          <div className="filters-card">
            <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por título, local ou descrição" />
            <select value={dificuldade} onChange={(event) => setDificuldade(event.target.value)}>
              <option value="todas">Todas as dificuldades</option>
              <option value="facil">Fácil</option>
              <option value="moderada">Moderada</option>
              <option value="dificil">Difícil</option>
              <option value="extrema">Extrema</option>
            </select>
          </div>

          {roteirosFiltrados.length === 0 ? (
            <div className="empty">
              <div style={{ fontSize: '46px', marginBottom: '10px' }}>🧭</div>
              Nenhum roteiro disponível no momento.
            </div>
          ) : (
            <div className="grid">
              {roteirosFiltrados.map((roteiro) => {
                const vagasTexto = labelVagas(roteiro)
                const esgotado = vagasTexto === 'Esgotado'

                return (
                  <article key={roteiro.id} className="roteiro-card" onClick={() => router.push(`/roteiros/${roteiro.id}`)}>
                    <div className="cover">
                      {roteiro.foto_capa ? (
                        <img
                          src={roteiro.foto_capa}
                          alt={roteiro.titulo}
                          onError={(event) => {
                            ;(event.currentTarget as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <span>🏔️</span>
                      )}
                    </div>

                    <div className="card-body">
                      <h3 style={{ margin: 0, fontSize: '17px', color: '#111827' }}>{roteiro.titulo}</h3>
                      <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: '13px', lineHeight: 1.45 }}>{roteiro.localizacao || roteiro.local || roteiro.cidade || 'Local a definir'}</p>

                      <div className="badges">
                        <span className="badge green">📅 {formatarData(roteiro.data_disponivel)}</span>
                        <span className="badge">🔁 {labelRecorrencia(roteiro.recorrencia)}</span>
                        <span className={`badge ${esgotado ? 'red' : 'green'}`}>👥 {vagasTexto}</span>
                      </div>

                      <div className="meta">
                        <span>🥾 {roteiro.km || 0} km</span>
                        <span>⏱️ {roteiro.duracao_horas || 0} h</span>
                        <span>📌 {roteiro.dificuldade || 'Nível livre'}</span>
                        <span>👤 {roteiro.limite_pessoas ? `Máx. ${roteiro.limite_pessoas}` : 'Sem limite'}</span>
                      </div>

                      <div className="price-row">
                        <strong style={{ color: '#16a34a', fontSize: '18px' }}>{formatarMoeda(roteiro.preco)}</strong>
                        <button
                          className="btn btn-red"
                          onClick={(event) => {
                            event.stopPropagation()
                            router.push(`/roteiros/${roteiro.id}`)
                          }}
                        >
                          Ver detalhes
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </>
  )
}
