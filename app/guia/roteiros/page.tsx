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

export default function GuiaRoteiros() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')

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

  // Carregar roteiros separadamente, após user estar definido
  useEffect(() => {
    if (user?.id) {
      carregarRoteiros()
    }
  }, [user])

  const carregarRoteiros = async () => {
    if (!user?.id) {
      console.log('Aguardando user ID...')
      return
    }
    
    setCarregando(true)
    try {
      console.log('Buscando roteiros para guia:', user.id)
      
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .eq('id_guia', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro detalhado:', error)
        throw error
      }
      
      console.log('Roteiros encontrados:', data?.length || 0)
      setRoteiros(data || [])
    } catch (err) {
      console.error('Erro ao carregar roteiros:', err)
    } finally {
      setCarregando(false)
    }
  }

  const handleExcluir = async (id: string, titulo: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Tem certeza que deseja excluir o roteiro "${titulo}"? Esta ação não pode ser desfeita.`)) return
    const { error } = await supabase.from('roteiros').delete().eq('id', id)
    if (!error) {
      carregarRoteiros()
      alert('✅ Roteiro excluído com sucesso!')
    } else {
      alert('❌ Erro ao excluir roteiro')
    }
  }

  const handleEditarClick = (roteiroId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/guia/roteiros/editar/${roteiroId}`)
  }

  const handleCardClick = (roteiro: Roteiro) => {
    if (roteiro.status === 'aguardando') {
      router.push(`/guia/roteiros/editar/${roteiro.id}`)
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'ativo':
      case 'aprovado':
        return { label: 'Aprovado', bg: '#dcfce7', color: '#16a34a', icon: '✅' }
      case 'aguardando':
        return { label: 'Aguardando', bg: '#fef3c7', color: '#d97706', icon: '⏳' }
      case 'rejeitado':
        return { label: 'Rejeitado', bg: '#fee2e2', color: '#dc2626', icon: '❌' }
      default:
        return { label: 'Rascunho', bg: '#f3f4f6', color: '#6b7280', icon: '📝' }
    }
  }

  const podeEditar = (status: string) => {
    return status === 'aguardando' || status === 'rascunho' || (!status)
  }

  const podeExcluir = (status: string) => {
    return status === 'aguardando' || status === 'rascunho' || (!status)
  }

  const roteirosFiltrados = roteiros.filter((roteiro) => {
    const matchBusca = roteiro.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
      roteiro.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
      roteiro.localizacao?.toLowerCase().includes(busca.toLowerCase())
    
    const matchStatus = filtroStatus === 'todos' || roteiro.status === filtroStatus || 
      (filtroStatus === 'aprovado' && (roteiro.status === 'ativo' || roteiro.status === 'aprovado'))
    
    return matchBusca && matchStatus
  })

  const estatisticas = {
    total: roteiros.length,
    aprovados: roteiros.filter(r => r.status === 'ativo' || r.status === 'aprovado').length,
    pendentes: roteiros.filter(r => r.status === 'aguardando').length,
    rascunhos: roteiros.filter(r => !r.status || r.status === 'rascunho').length,
    rejeitados: roteiros.filter(r => r.status === 'rejeitado').length,
    kmTotal: roteiros.reduce((acc, r) => acc + (r.km || 0), 0),
    valorTotal: roteiros.reduce((acc, r) => acc + (r.preco || 0), 0)
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
              🗺️ Meus Roteiros
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
              Gerencie todos os seus roteiros
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => router.push('/guia/dashboard')}
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
        {/* STATS CLICÁVEIS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '16px'
          }}
        >
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>📊</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a' }}>{estatisticas.total}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Total</div>
          </div>

          <div 
            onClick={() => router.push('/guia/roteiros/ativos')}
            style={{ cursor: 'pointer', backgroundColor: '#dcfce7', borderRadius: '20px', padding: '16px', textAlign: 'center', transition: 'all 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>✅</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a' }}>{estatisticas.aprovados}</div>
            <div style={{ fontSize: '12px', color: '#166534' }}>Aprovados</div>
            <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '6px' }}>Clique para ver →</div>
          </div>

          <div 
            onClick={() => setFiltroStatus('aguardando')}
            style={{ cursor: 'pointer', backgroundColor: '#fef3c7', borderRadius: '20px', padding: '16px', textAlign: 'center', transition: 'all 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>⏳</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#d97706' }}>{estatisticas.pendentes}</div>
            <div style={{ fontSize: '12px', color: '#92400e' }}>Aguardando</div>
          </div>

          <div 
            onClick={() => setFiltroStatus('rascunho')}
            style={{ cursor: 'pointer', backgroundColor: '#f3f4f6', borderRadius: '20px', padding: '16px', textAlign: 'center', transition: 'all 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>📝</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#6b7280' }}>{estatisticas.rascunhos}</div>
            <div style={{ fontSize: '12px', color: '#4b5563' }}>Rascunhos</div>
          </div>

          <div 
            onClick={() => setFiltroStatus('rejeitado')}
            style={{ cursor: 'pointer', backgroundColor: '#fee2e2', borderRadius: '20px', padding: '16px', textAlign: 'center', transition: 'all 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>❌</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626' }}>{estatisticas.rejeitados}</div>
            <div style={{ fontSize: '12px', color: '#991b1b' }}>Rejeitados</div>
          </div>
        </div>

        {/* FILTRO ATIVO INDICADOR */}
        {filtroStatus !== 'todos' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', borderRadius: '16px', padding: '12px 20px' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              🔍 Filtrando por: <strong>{filtroStatus === 'aprovado' ? 'Aprovados' : filtroStatus === 'aguardando' ? 'Aguardando' : filtroStatus === 'rascunho' ? 'Rascunhos' : 'Rejeitados'}</strong>
            </span>
            <button onClick={() => setFiltroStatus('todos')} style={{ backgroundColor: '#f3f4f6', border: 'none', borderRadius: '40px', padding: '6px 16px', cursor: 'pointer', fontSize: '12px' }}>Limpar filtro</button>
          </div>
        )}

        {/* BARRA DE BUSCA */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
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
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#16a34a'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            {busca && (
              <button
                onClick={() => setBusca('')}
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
                Limpar busca
              </button>
            )}
          </div>
        </div>

        {/* LISTA DE ROTEIROS */}
        {carregando ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center', color: '#6b7280' }}>
            Carregando roteiros...
          </div>
        ) : roteirosFiltrados.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗺️</div>
            <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>Nenhum roteiro encontrado</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              {busca ? 'Nenhum roteiro encontrado com esta busca.' : 'Clique em "Criar Roteiro" para começar.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
            {roteirosFiltrados.map((roteiro) => {
              const statusInfo = getStatusInfo(roteiro.status)
              const podeEditarItem = podeEditar(roteiro.status)
              const podeExcluirItem = podeExcluir(roteiro.status)
              const isAguardando = roteiro.status === 'aguardando'

              return (
                <div
                  key={roteiro.id}
                  onClick={() => handleCardClick(roteiro)}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    transition: 'all 0.2s ease',
                    border: `1px solid ${statusInfo.bg}`,
                    cursor: isAguardando ? 'pointer' : 'default'
                  }}
                  onMouseEnter={(e) => {
                    if (isAguardando) {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'
                  }}
                >
                  {/* Capa */}
                  {roteiro.foto_capa && (
                    <div style={{ height: '140px', overflow: 'hidden' }}>
                      <img src={roteiro.foto_capa} alt={roteiro.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  {!roteiro.foto_capa && (
                    <div style={{ height: '100px', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '40px' }}>🏔️</span>
                    </div>
                  )}

                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#111827' }}>{roteiro.titulo}</h3>
                      <span style={{ backgroundColor: statusInfo.bg, color: statusInfo.color, padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '600' }}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </div>

                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', lineHeight: 1.4 }}>
                      {roteiro.descricao?.length > 80 ? `${roteiro.descricao.substring(0, 80)}...` : roteiro.descricao}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '11px', color: '#6b7280', marginBottom: '16px' }}>
                      <span>📍 {roteiro.localizacao}</span>
                      <span>🥾 {roteiro.km} KM</span>
                      <span>💰 R$ {roteiro.preco}</span>
                      <span>⏱️ {roteiro.duracao_horas}h</span>
                      <span>🎯 {roteiro.dificuldade}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {podeEditarItem && (
                        <button
                          onClick={(e) => handleEditarClick(roteiro.id, e)}
                          style={{ flex: 1, backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '30px', padding: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                        >
                          ✏️ Editar
                        </button>
                      )}
                      {podeExcluirItem && (
                        <button
                          onClick={(e) => handleExcluir(roteiro.id, roteiro.titulo, e)}
                          style={{ flex: 1, backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '30px', padding: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                        >
                          🗑️ Excluir
                        </button>
                      )}
                      {!podeEditarItem && !podeExcluirItem && (
                        <div style={{ flex: 1, textAlign: 'center', padding: '8px', backgroundColor: statusInfo.bg, borderRadius: '30px', fontSize: '12px', color: statusInfo.color, fontWeight: '500' }}>
                          {statusInfo.icon} {statusInfo.label}
                        </div>
                      )}
                    </div>

                    {isAguardando && (
                      <div style={{ marginTop: '12px', fontSize: '11px', color: '#9ca3af', textAlign: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '8px' }}>
                        👆 Clique no card para editar
                      </div>
                    )}
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