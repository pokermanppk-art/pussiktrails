'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function ListaRoteiros() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [roteiros, setRoteiros] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  
  // Filtros
  const [busca, setBusca] = useState('')
  const [localizacao, setLocalizacao] = useState('')
  const [raioKm, setRaioKm] = useState(50)
  const [kmMin, setKmMin] = useState(0)
  const [kmMax, setKmMax] = useState(100)
  const [dificuldade, setDificuldade] = useState('')
  const [precoMin, setPrecoMin] = useState(0)
  const [precoMax, setPrecoMax] = useState(1000)
  
  // Estado do usuário para geolocalização
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [usandoLocalizacao, setUsandoLocalizacao] = useState(false)

  const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  const obterLocalizacao = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada pelo seu navegador')
      return
    }
    setUsandoLocalizacao(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLat(position.coords.latitude)
        setUserLng(position.coords.longitude)
        setUsandoLocalizacao(false)
        alert('📍 Localização obtida! Use o filtro de raio para buscar roteiros próximos.')
      },
      (error) => {
        console.error('Erro ao obter localização:', error)
        alert('Não foi possível obter sua localização. Verifique as permissões do navegador.')
        setUsandoLocalizacao(false)
      }
    )
  }

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }
    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    carregarRoteiros()
  }, [busca, localizacao, raioKm, kmMin, kmMax, dificuldade, precoMin, precoMax, userLat, userLng])

  const carregarRoteiros = async () => {
    setCarregando(true)
    try {
      let query = supabase
        .from('roteiros')
        .select('*, guia:users(id, nome, avatar_url)')
        .eq('status', 'ativo')

      if (busca) query = query.ilike('titulo', `%${busca}%`)
      if (localizacao) query = query.ilike('localizacao', `%${localizacao}%`)
      if (kmMin > 0) query = query.gte('km', kmMin)
      if (kmMax < 100) query = query.lte('km', kmMax)
      if (precoMin > 0) query = query.gte('preco', precoMin)
      if (precoMax < 1000) query = query.lte('preco', precoMax)
      if (dificuldade) query = query.eq('dificuldade', dificuldade)

      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error

      let roteirosFiltrados = data || []

      if (userLat && userLng && raioKm < 500) {
        roteirosFiltrados = roteirosFiltrados.filter((roteiro: any) => {
          if (!roteiro.latitude || !roteiro.longitude) return true
          const distancia = calcularDistancia(userLat, userLng, roteiro.latitude, roteiro.longitude)
          return distancia <= raioKm
        })
      }

      setRoteiros(roteirosFiltrados)
    } catch (err) {
      console.error('Erro ao carregar roteiros:', err)
    } finally {
      setCarregando(false)
    }
  }

  const limparFiltros = () => {
    setBusca('')
    setLocalizacao('')
    setRaioKm(50)
    setKmMin(0)
    setKmMax(100)
    setDificuldade('')
    setPrecoMin(0)
    setPrecoMax(1000)
    setUserLat(null)
    setUserLng(null)
  }

  const getDificuldadeCor = (dificuldade: string) => {
    switch (dificuldade?.toLowerCase()) {
      case 'fácil': return '#10b981'
      case 'médio': return '#f59e0b'
      case 'difícil': return '#ef4444'
      case 'extremo': return '#8b5cf6'
      default: return '#6b7280'
    }
  }

  const getDificuldadeIcone = (dificuldade: string) => {
    switch (dificuldade?.toLowerCase()) {
      case 'fácil': return '🥾'
      case 'médio': return '⛰️'
      case 'difícil': return '🏔️'
      case 'extremo': return '⚠️'
      default: return '🥾'
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏔️</div>
          <div style={{ color: '#6b7280' }}>Carregando...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <style jsx global>{`
        @media (min-width: 768px) {
          .roteiros-container { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
          .filtros-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .filtros-avancados { flex-direction: row !important; flex-wrap: wrap !important; gap: 20px !important; }
          .roteiros-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 24px !important; }
        }
      `}</style>

      {/* HEADER */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>🏔️ PussikTrails</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => router.push('/cliente/dashboard')} style={{ backgroundColor: '#f3f4f6', border: 'none', padding: '6px 12px', borderRadius: '40px', fontSize: '12px', cursor: 'pointer' }}>Dashboard</button>
            <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '40px', fontSize: '12px', cursor: 'pointer' }}>Sair</button>
          </div>
        </div>
      </div>

      <div className="roteiros-container" style={{ padding: '16px' }}>
        
        {/* TÍTULO */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0, color: '#111827' }}>🌄 Explorar Roteiros</h2>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Descubra novas aventuras e trilhas incríveis</p>
        </div>

        {/* CARD DE FILTROS FIXO */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          
          {/* LINHA 1 - Busca por nome */}
          <input
            type="text"
            placeholder="🔍 Buscar roteiro por nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ width: '100%', padding: '10px 16px', borderRadius: '40px', border: '1px solid #e5e7eb', fontSize: '14px', outline: 'none', marginBottom: '16px' }}
          />

          {/* LINHA 2 - Localização + Raio (lado a lado) */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="📍 Cidade ou Estado (ex: São Paulo, RJ)..."
              value={localizacao}
              onChange={(e) => setLocalizacao(e.target.value)}
              style={{ flex: 2, minWidth: '180px', padding: '10px 16px', borderRadius: '40px', border: '1px solid #e5e7eb', fontSize: '14px', outline: 'none' }}
            />
            
            <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={obterLocalizacao}
                disabled={usandoLocalizacao}
                style={{
                  backgroundColor: userLat ? '#16a34a' : '#f3f4f6',
                  color: userLat ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '40px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap'
                }}
              >
                📍 {userLat ? 'Ativa' : (usandoLocalizacao ? '...' : 'Usar localização')}
              </button>
              
              {userLat && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Raio:</span>
                  <input
                    type="range"
                    min="5"
                    max="200"
                    value={raioKm}
                    onChange={(e) => setRaioKm(Number(e.target.value))}
                    style={{ width: '120px' }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a' }}>{raioKm} km</span>
                </div>
              )}
            </div>
          </div>

          {/* LINHA 3 - Filtros avançados (KM, Preço, Dificuldade) */}
          <div className="filtros-avancados" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#6b7280', minWidth: '35px' }}>🥾 KM:</span>
              <input
                type="number"
                placeholder="Mín"
                value={kmMin}
                onChange={(e) => setKmMin(Number(e.target.value))}
                style={{ width: '70px', padding: '8px 12px', borderRadius: '40px', border: '1px solid #e5e7eb', fontSize: '13px', textAlign: 'center' }}
              />
              <span>a</span>
              <input
                type="number"
                placeholder="Máx"
                value={kmMax}
                onChange={(e) => setKmMax(Number(e.target.value))}
                style={{ width: '70px', padding: '8px 12px', borderRadius: '40px', border: '1px solid #e5e7eb', fontSize: '13px', textAlign: 'center' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#6b7280', minWidth: '35px' }}>💰 R$:</span>
              <input
                type="number"
                placeholder="Mín"
                value={precoMin}
                onChange={(e) => setPrecoMin(Number(e.target.value))}
                style={{ width: '80px', padding: '8px 12px', borderRadius: '40px', border: '1px solid #e5e7eb', fontSize: '13px', textAlign: 'center' }}
              />
              <span>a</span>
              <input
                type="number"
                placeholder="Máx"
                value={precoMax}
                onChange={(e) => setPrecoMax(Number(e.target.value))}
                style={{ width: '80px', padding: '8px 12px', borderRadius: '40px', border: '1px solid #e5e7eb', fontSize: '13px', textAlign: 'center' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#6b7280', minWidth: '35px' }}>🏔️ Dificuldade:</span>
              <select
                value={dificuldade}
                onChange={(e) => setDificuldade(e.target.value)}
                style={{ padding: '8px 16px', borderRadius: '40px', border: '1px solid #e5e7eb', fontSize: '13px', backgroundColor: 'white', cursor: 'pointer' }}
              >
                <option value="">Todas</option>
                <option value="fácil">🥾 Fácil</option>
                <option value="médio">⛰️ Médio</option>
                <option value="difícil">🏔️ Difícil</option>
                <option value="extremo">⚠️ Extremo</option>
              </select>
            </div>
          </div>

          {/* LINHA 4 - BOTÕES */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              onClick={limparFiltros}
              style={{ backgroundColor: '#f3f4f6', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}
            >
              🧹 Limpar filtros
            </button>
            <button
              onClick={() => carregarRoteiros()}
              style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 24px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
            >
              🔍 Buscar
            </button>
          </div>
        </div>

        {/* RESULTADOS */}
        {carregando ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#dc2626', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#6b7280' }}>Carregando roteiros...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : roteiros.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'white', borderRadius: '20px' }}>
            <span style={{ fontSize: '48px' }}>🗺️</span>
            <p style={{ marginTop: '12px', color: '#6b7280' }}>Nenhum roteiro encontrado com os filtros selecionados.</p>
            <button onClick={limparFiltros} style={{ marginTop: '16px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 24px', cursor: 'pointer', fontSize: '13px' }}>Limpar filtros</button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>📍 {roteiros.length} roteiro(s) encontrado(s)</p>
            <div className="roteiros-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {roteiros.map((roteiro) => (
                <div
                  key={roteiro.id}
                  onClick={() => router.push(`/roteiros/${roteiro.id}`)}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{ height: '140px', backgroundColor: '#e5e7eb', overflow: 'hidden', position: 'relative' }}>
                    {roteiro.foto_capa ? (
                      <img src={roteiro.foto_capa} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🏔️</div>
                    )}
                    <div style={{ position: 'absolute', bottom: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', color: 'white' }}>
                      {getDificuldadeIcone(roteiro.dificuldade)} {roteiro.dificuldade}
                    </div>
                  </div>
                  <div style={{ padding: '14px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '4px' }}>{roteiro.titulo}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>📍 {roteiro.localizacao}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'white' }}>
                          {roteiro.guia?.nome?.charAt(0).toUpperCase() || 'G'}
                        </div>
                        <span style={{ fontSize: '10px', color: '#6b7280' }}>{roteiro.guia?.nome || 'Guia'}</span>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#16a34a' }}>R$ {roteiro.preco}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}