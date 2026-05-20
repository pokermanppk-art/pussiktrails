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
}

export default function GuiaRoteirosAtivos() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }
    const parsedUser = JSON.parse(userData)
    if (parsedUser.tipo !== 'guia') {
      router.push('/login')
      return
    }
    setUser(parsedUser)
  }, [])

  useEffect(() => {
    if (user) {
      carregarRoteiros()
    }
  }, [user])

  const carregarRoteiros = async () => {
    setCarregando(true)
    setErro(null)
    try {
      console.log('Buscando roteiros para guia:', user?.id)
      console.log('Status buscados: ativo')

      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .eq('id_guia', user?.id)
        .eq('status', 'ativo')  // ← APENAS 'ativo'
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro detalhado:', error)
        setErro(error.message)
        throw error
      }

      console.log('Roteiros encontrados:', data?.length || 0)
      console.log('Dados:', data)

      setRoteiros(data || [])
    } catch (err) {
      console.error('Erro ao carregar roteiros ativos:', err)
      setErro('Erro ao carregar roteiros. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  const getStatusInfo = (status: string) => {
    return { label: 'Aprovado', bg: '#dcfce7', color: '#16a34a', icon: '✅' }
  }

  const roteirosFiltrados = roteiros.filter((roteiro) =>
    roteiro.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
    roteiro.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
    roteiro.localizacao?.toLowerCase().includes(busca.toLowerCase())
  )

  const estatisticas = {
    total: roteiros.length,
    kmTotal: roteiros.reduce((acc, r) => acc + (r.km || 0), 0),
    valorTotal: roteiros.reduce((acc, r) => acc + (r.preco || 0), 0),
    duracaoMedia: roteiros.length > 0 
      ? (roteiros.reduce((acc, r) => acc + (r.duracao_horas || 0), 0) / roteiros.length).toFixed(1)
      : '0'
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
      {/* HEADER */}
      <div
        style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#16a34a', fontWeight: 'bold' }}>
              🟢 Roteiros Aprovados
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
              Seus roteiros publicados no marketplace
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => router.push('/guia/roteiros')}
              style={{
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '999px',
                padding: '10px 20px',
                cursor: 'pointer',
                color: '#374151',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              ← Voltar
            </button>

            <button
              onClick={() => router.push('/guia/roteiros/novo')}
              style={{
                backgroundColor: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '999px',
                padding: '10px 20px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
            >
              + Criar Roteiro
            </button>

            <button
              onClick={() => {
                localStorage.removeItem('user')
                router.push('/login')
              }}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '999px',
                padding: '10px 20px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px'
        }}
      >
        {/* STATS PREMIUM */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px'
          }}
        >
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
              <span style={{ fontSize: '24px' }}>🟢</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#16a34a' }}>{estatisticas.total}</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Roteiros Ativos</div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
              <span style={{ fontSize: '24px' }}>🥾</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#16a34a' }}>{estatisticas.kmTotal}</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>KM Totais</div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: '#fefce8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
              <span style={{ fontSize: '24px' }}>💰</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>R$ {estatisticas.valorTotal.toFixed(2)}</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Valor Total</div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
              <span style={{ fontSize: '24px' }}>⏱️</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>{estatisticas.duracaoMedia}</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Horas (média)</div>
          </div>
        </div>

        {/* BARRA DE BUSCA */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '24px',
            padding: '16px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ flex: 1, minWidth: '250px' }}>
            <input
              type="text"
              placeholder="🔍 Buscar por título, descrição ou localização..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 18px',
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
          {busca && (
            <button
              onClick={() => setBusca('')}
              style={{
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '40px',
                padding: '10px 24px',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#6b7280',
                fontWeight: '500'
              }}
            >
              Limpar busca
            </button>
          )}
        </div>

        {/* MENSAGEM DE ERRO */}
        {erro && (
          <div style={{ backgroundColor: '#fee2e2', borderRadius: '16px', padding: '16px', textAlign: 'center', color: '#dc2626', fontSize: '14px' }}>
            ⚠️ {erro}
          </div>
        )}

        {/* LISTA DE ROTEIROS ATIVOS */}
        {carregando ? (
          <div style={{ backgroundColor: 'white', borderRadius: '28px', padding: '80px', textAlign: 'center' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }}></div>
            <div style={{ color: '#6b7280' }}>Carregando roteiros ativos...</div>
          </div>
        ) : roteirosFiltrados.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '28px', padding: '64px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏔️</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>Nenhum roteiro aprovado ainda</div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
              {busca ? 'Nenhum roteiro encontrado com esta busca.' : 'Seus roteiros aprovados aparecerão aqui.'}
            </div>
            {!busca && (
              <button
                onClick={() => router.push('/guia/roteiros/novo')}
                style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '12px 28px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
              >
                + Criar novo roteiro
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '24px' }}>
            {roteirosFiltrados.map((roteiro) => {
              const statusInfo = getStatusInfo(roteiro.status)
              return (
                <div
                  key={roteiro.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '24px',
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
                  onClick={() => router.push(`/roteiros/${roteiro.id}`)}
                >
                  {/* Capa */}
                  {roteiro.foto_capa ? (
                    <div style={{ height: '180px', overflow: 'hidden', position: 'relative' }}>
                      <img src={roteiro.foto_capa} alt={roteiro.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }} />
                      <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                        <span style={{ backgroundColor: statusInfo.bg, color: statusInfo.color, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: '140px', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <span style={{ fontSize: '56px' }}>🏔️</span>
                      <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                        <span style={{ backgroundColor: statusInfo.bg, color: statusInfo.color, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Conteúdo */}
                  <div style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#111827' }}>{roteiro.titulo}</h3>
                    <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.5, marginBottom: '16px' }}>
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>🎯 Dificuldade:</span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        padding: '2px 10px',
                        borderRadius: '20px',
                        backgroundColor: roteiro.dificuldade === 'fácil' ? '#dcfce7' : roteiro.dificuldade === 'médio' ? '#fef3c7' : '#fee2e2',
                        color: roteiro.dificuldade === 'fácil' ? '#16a34a' : roteiro.dificuldade === 'médio' ? '#d97706' : '#dc2626'
                      }}>
                        {roteiro.dificuldade || 'Não definido'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Animação de loading */}
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}