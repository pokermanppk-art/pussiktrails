'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Roteiro = {
  id: string
  titulo: string
  descricao: string
  preco: number
  duracao_horas: number
  dificuldade: string
  localizacao: string
  km: number
  foto_capa?: string
  status: string
  created_at: string
  guia_nome?: string
  guia_id?: string
}

export default function ClienteRoteiros() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroDificuldade, setFiltroDificuldade] = useState('todas')
  const [filtroKm, setFiltroKm] = useState('todos')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }
    const parsedUser = JSON.parse(userData)
    if (parsedUser.tipo !== 'cliente') {
      router.push('/login')
      return
    }
    setUser(parsedUser)
    carregarRoteiros()
  }, [])

  const carregarRoteiros = async () => {
    setCarregando(true)
    try {
      // Buscar APENAS roteiros com status 'ativo'
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Buscar nomes dos guias
      const guiaIds = [...new Set(data?.map(r => r.id_guia).filter(Boolean) || [])]
      let guiaMap: Record<string, string> = {}
      if (guiaIds.length > 0) {
        const { data: guias } = await supabase
          .from('users')
          .select('id, nome')
          .in('id', guiaIds)
        guiaMap = (guias || []).reduce((acc, guia) => {
          acc[guia.id] = guia.nome
          return acc
        }, {} as Record<string, string>)
      }

      const roteirosCompletos = (data || []).map((roteiro: any) => ({
        ...roteiro,
        guia_nome: roteiro.id_guia ? (guiaMap[roteiro.id_guia] || 'Guia') : 'Guia',
        guia_id: roteiro.id_guia
      }))

      setRoteiros(roteirosCompletos)
    } catch (err) {
      console.error('Erro ao carregar roteiros:', err)
    } finally {
      setCarregando(false)
    }
  }

  const getDificuldadeCor = (dificuldade: string) => {
    switch (dificuldade?.toLowerCase()) {
      case 'fácil': return { bg: '#dcfce7', text: '#16a34a', label: '🟢 Fácil' }
      case 'médio': return { bg: '#fef3c7', text: '#f59e0b', label: '🟡 Médio' }
      case 'difícil': return { bg: '#fee2e2', text: '#dc2626', label: '🔴 Difícil' }
      default: return { bg: '#f3f4f6', text: '#6b7280', label: '⚪ Não definido' }
    }
  }

  const roteirosFiltrados = roteiros.filter((roteiro) => {
    const matchBusca = roteiro.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
      roteiro.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
      roteiro.localizacao?.toLowerCase().includes(busca.toLowerCase())
    
    const matchDificuldade = filtroDificuldade === 'todas' || roteiro.dificuldade?.toLowerCase() === filtroDificuldade.toLowerCase()
    
    let matchKm = true
    if (filtroKm === 'ate10') matchKm = (roteiro.km || 0) <= 10
    else if (filtroKm === '10a30') matchKm = (roteiro.km || 0) >= 10 && (roteiro.km || 0) <= 30
    else if (filtroKm === '30mais') matchKm = (roteiro.km || 0) > 30
    
    return matchBusca && matchDificuldade && matchKm
  })

  const handleVerRoteiro = (roteiroId: string) => {
    router.push(`/cliente/roteiros/${roteiroId}`)
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
      {/* CABEÇALHO SECUNDÁRIO - VERMELHO */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#dc2626', fontWeight: 'bold' }}>🗺️ Explorar Roteiros</h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>Descubra as melhores aventuras</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={() => router.push('/cliente/dashboard')} style={{ backgroundColor: '#f3f4f6', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', color: '#374151', fontWeight: '600', fontSize: '13px' }}>← Voltar</button>
            <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Sair</button>
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        
        {/* FILTROS */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', marginBottom: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            <div style={{ flex: 2, minWidth: '200px' }}>
              <input
                type="text"
                placeholder="🔍 Buscar por título, descrição ou localização..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '40px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#16a34a'
                  e.target.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
            <div style={{ minWidth: '140px' }}>
              <select
                value={filtroDificuldade}
                onChange={(e) => setFiltroDificuldade(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '40px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="todas">Todas as dificuldades</option>
                <option value="fácil">Fácil</option>
                <option value="médio">Médio</option>
                <option value="difícil">Difícil</option>
              </select>
            </div>
            <div style={{ minWidth: '140px' }}>
              <select
                value={filtroKm}
                onChange={(e) => setFiltroKm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '40px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="todos">Todos os KM</option>
                <option value="ate10">Até 10 KM</option>
                <option value="10a30">10 a 30 KM</option>
                <option value="30mais">Acima de 30 KM</option>
              </select>
            </div>
            {(busca || filtroDificuldade !== 'todas' || filtroKm !== 'todos') && (
              <button
                onClick={() => { setBusca(''); setFiltroDificuldade('todas'); setFiltroKm('todos') }}
                style={{
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '40px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#6b7280'
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* LISTA DE ROTEIROS ATIVOS */}
        {carregando ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center', color: '#6b7280' }}>
            Carregando roteiros...
          </div>
        ) : roteirosFiltrados.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗺️</div>
            <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>Nenhum roteiro encontrado</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              {busca || filtroDificuldade !== 'todas' || filtroKm !== 'todos' 
                ? 'Tente ajustar os filtros para encontrar mais opções.' 
                : 'Nenhum roteiro ativo disponível no momento.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {roteirosFiltrados.map((roteiro) => {
              const dificuldadeInfo = getDificuldadeCor(roteiro.dificuldade)
              return (
                <div
                  key={roteiro.id}
                  onClick={() => handleVerRoteiro(roteiro.id)}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px)'
                    e.currentTarget.style.boxShadow = '0 20px 30px rgba(0,0,0,0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'
                  }}
                >
                  {/* Capa */}
                  {roteiro.foto_capa ? (
                    <div style={{ height: '160px', overflow: 'hidden' }}>
                      <img src={roteiro.foto_capa} alt={roteiro.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ height: '120px', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '48px' }}>🏔️</span>
                    </div>
                  )}

                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#111827' }}>{roteiro.titulo}</h3>
                      <span style={{ backgroundColor: dificuldadeInfo.bg, color: dificuldadeInfo.text, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                        {dificuldadeInfo.label}
                      </span>
                    </div>

                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px', lineHeight: 1.5 }}>
                      {roteiro.descricao?.length > 100 ? `${roteiro.descricao.substring(0, 100)}...` : roteiro.descricao}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f3f4f6', padding: '4px 10px', borderRadius: '20px' }}>
                        <span>📍</span>
                        <span style={{ fontSize: '12px', color: '#4b5563' }}>{roteiro.localizacao}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f3f4f6', padding: '4px 10px', borderRadius: '20px' }}>
                        <span>🥾</span>
                        <span style={{ fontSize: '12px', color: '#4b5563' }}>{roteiro.km} KM</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f3f4f6', padding: '4px 10px', borderRadius: '20px' }}>
                        <span>💰</span>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a' }}>R$ {roteiro.preco}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f3f4f6', padding: '4px 10px', borderRadius: '20px' }}>
                        <span>⏱️</span>
                        <span style={{ fontSize: '12px', color: '#4b5563' }}>{roteiro.duracao_horas}h</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'white' }}>
                        {roteiro.guia_nome?.charAt(0).toUpperCase() || 'G'}
                      </div>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>👤 {roteiro.guia_nome}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}