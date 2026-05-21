'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function ListaRoteiros() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [roteiros, setRoteiros] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [dificuldade, setDificuldade] = useState('')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }
    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    carregarRoteiros()
  }, [])

  const carregarRoteiros = async () => {
    setCarregando(true)
    try {
      let query = supabase
        .from('roteiros')
        .select('*, guia:users(id, nome, avatar_url)')
        .eq('status', 'ativo')

      if (filtro) {
        query = query.ilike('titulo', `%${filtro}%`)
      }
      if (dificuldade) {
        query = query.eq('dificuldade', dificuldade)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setRoteiros(data || [])
    } catch (err) {
      console.error('Erro ao carregar roteiros:', err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarRoteiros()
  }, [filtro, dificuldade])

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

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏔️</div>
          <div style={{ color: '#6b7280' }}>Carregando roteiros...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <style jsx global>{`
        @media (min-width: 768px) {
          .roteiros-container { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
          .filtros-container { flex-direction: row !important; justify-content: space-between !important; align-items: center !important; }
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

        {/* FILTROS */}
        <div className="filtros-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <input
            type="text"
            placeholder="🔍 Buscar roteiro..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            style={{ flex: 1, padding: '10px 16px', borderRadius: '40px', border: '1px solid #e5e7eb', fontSize: '14px', outline: 'none' }}
          />
          <select
            value={dificuldade}
            onChange={(e) => setDificuldade(e.target.value)}
            style={{ padding: '10px 16px', borderRadius: '40px', border: '1px solid #e5e7eb', fontSize: '14px', backgroundColor: 'white', cursor: 'pointer' }}
          >
            <option value="">Todas as dificuldades</option>
            <option value="fácil">🥾 Fácil</option>
            <option value="médio">⛰️ Médio</option>
            <option value="difícil">🏔️ Difícil</option>
            <option value="extremo">⚠️ Extremo</option>
          </select>
        </div>

        {/* GRID DE ROTEIROS */}
        {roteiros.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'white', borderRadius: '20px' }}>
            <span style={{ fontSize: '48px' }}>🗺️</span>
            <p style={{ marginTop: '12px', color: '#6b7280' }}>Nenhum roteiro encontrado</p>
          </div>
        ) : (
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
                <div style={{ height: '160px', backgroundColor: '#e5e7eb', overflow: 'hidden', position: 'relative' }}>
                  {roteiro.foto_capa ? (
                    <img src={roteiro.foto_capa} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>🏔️</div>
                  )}
                  <div style={{ position: 'absolute', bottom: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', color: 'white' }}>
                    {getDificuldadeIcone(roteiro.dificuldade)} {roteiro.dificuldade}
                  </div>
                </div>
                <div style={{ padding: '16px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>{roteiro.titulo}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>📍 {roteiro.localizacao}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'white' }}>
                        {roteiro.guia?.nome?.charAt(0).toUpperCase() || 'G'}
                      </div>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>{roteiro.guia?.nome || 'Guia'}</span>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#16a34a' }}>
                      R$ {roteiro.preco}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}