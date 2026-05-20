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
  km: number
  dificuldade: string
  localizacao: string
  foto_capa?: string
  guia_nome?: string
  guia_id?: string
}

export default function RoteirosPublicosPage() {
  const router = useRouter()
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroDificuldade, setFiltroDificuldade] = useState('todas')
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUsuarioLogado(JSON.parse(userData))
    }
    carregarRoteiros()
  }, [])

  const carregarRoteiros = async () => {
    setCarregando(true)
    try {
      const { data, error } = await supabase
        .from('roteiros')
        .select('*, guia:users(nome)')
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })

      if (error) throw error

      const roteirosFormatados = (data || []).map((roteiro: any) => ({
        ...roteiro,
        guia_nome: roteiro.guia?.nome || 'Guia',
        guia_id: roteiro.id_guia
      }))

      setRoteiros(roteirosFormatados)
    } catch (err) {
      console.error('Erro ao carregar roteiros:', err)
    } finally {
      setCarregando(false)
    }
  }

  const handleVerDetalhes = (roteiroId: string) => {
    router.push(`/roteiros/${roteiroId}`)
  }

  const handleReservar = (roteiroId: string) => {
    if (!usuarioLogado) {
      // Salvar roteiro que queria reservar para redirecionar depois
      localStorage.setItem('redirectAfterLogin', `/roteiros/${roteiroId}`)
      router.push('/login')
      return
    }
    router.push(`/cliente/roteiros/${roteiroId}`)
  }

  const getDificuldadeInfo = (dificuldade: string) => {
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
    
    const matchDificuldade = filtroDificuldade === 'todas' || 
      roteiro.dificuldade?.toLowerCase() === filtroDificuldade.toLowerCase()
    
    return matchBusca && matchDificuldade
  })

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      
      {/* CABEÇALHO */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => router.push('/')}>
            <span style={{ fontSize: '24px' }}>🏔️</span>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>Prussik Trails</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {usuarioLogado ? (
              <>
                <button onClick={() => router.push('/cliente/dashboard')} style={{ backgroundColor: '#f3f4f6', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }}>Dashboard</button>
                <button onClick={() => router.push('/cliente/perfil')} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }}>Perfil</button>
              </>
            ) : (
              <>
                <button onClick={() => router.push('/login')} style={{ backgroundColor: '#f3f4f6', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }}>Entrar</button>
                <button onClick={() => router.push('/cadastro')} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }}>Cadastrar</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        
        {/* TÍTULO */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', margin: 0 }}>🗺️ Explorar Roteiros</h1>
          <p style={{ color: '#6b7280', marginTop: '8px', fontSize: '14px' }}>
            Descubra as melhores trilhas e aventure-se com os melhores guias
          </p>
        </div>

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
            {(busca || filtroDificuldade !== 'todas') && (
              <button
                onClick={() => { setBusca(''); setFiltroDificuldade('todas') }}
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

        {/* LISTA DE ROTEIROS */}
        {carregando ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            Carregando roteiros...
          </div>
        ) : roteirosFiltrados.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗺️</div>
            <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>Nenhum roteiro encontrado</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Tente ajustar os filtros ou volte mais tarde</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {roteirosFiltrados.map((roteiro) => {
              const dificuldadeInfo = getDificuldadeInfo(roteiro.dificuldade)
              return (
                <div
                  key={roteiro.id}
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
                  {roteiro.foto_capa ? (
                    <img src={roteiro.foto_capa} alt={roteiro.titulo} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ height: '120px', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '48px' }}>🏔️</span>
                    </div>
                  )}

                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#111827' }}>{roteiro.titulo}</h3>
                      <span style={{ backgroundColor: dificuldadeInfo.bg, color: dificuldadeInfo.text, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                        {dificuldadeInfo.label}
                      </span>
                    </div>

                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px', lineHeight: 1.5 }}>
                      {roteiro.descricao?.length > 100 ? `${roteiro.descricao.substring(0, 100)}...` : roteiro.descricao}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f3f4f6', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', color: '#4b5563' }}>
                        📍 {roteiro.localizacao}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f3f4f6', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', color: '#4b5563' }}>
                        🥾 {roteiro.km} km
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f3f4f6', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', color: '#16a34a', fontWeight: 'bold' }}>
                        R$ {roteiro.preco}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleVerDetalhes(roteiro.id)
                        }}
                        style={{
                          flex: 1,
                          backgroundColor: '#f3f4f6',
                          border: 'none',
                          borderRadius: '40px',
                          padding: '10px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                          color: '#374151'
                        }}
                      >
                        Ver detalhes
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleReservar(roteiro.id)
                        }}
                        style={{
                          flex: 1,
                          backgroundColor: '#dc2626',
                          border: 'none',
                          borderRadius: '40px',
                          padding: '10px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: 'white',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                      >
                        {usuarioLogado ? 'Reservar' : '🔒 Login para reservar'}
                      </button>
                    </div>

                    {!usuarioLogado && (
                      <div style={{ marginTop: '12px', fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
                        Faça login para fazer sua reserva
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}