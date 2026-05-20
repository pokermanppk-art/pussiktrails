'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type AvaliacaoPendente = {
  id: string
  nota: number
  comentario: string
  resposta_guia?: string
  status_moderacao: string
  created_at: string
  cliente_id: string
  cliente_nome: string
  cliente_avatar?: string
}

export default function GuiaAvaliacoesPendentes() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoPendente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState<string>('todas')

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
    carregarAvaliacoes(parsedUser.id)
  }, [])

  const carregarAvaliacoes = async (guiaId: string) => {
    setCarregando(true)
    try {
      // Buscar avaliações com nota ≤ 2 e status 'pendente' (aguardando resposta do guia)
      const { data, error } = await supabase
        .from('avaliacoes')
        .select(`
          id,
          nota,
          comentario,
          resposta_guia,
          status_moderacao,
          created_at,
          cliente_id
        `)
        .eq('guia_id', guiaId)
        .in('status_moderacao', ['pendente', 'aguardando_admin', 'aprovada'])
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data && data.length > 0) {
        const avaliacoesCompletas = await Promise.all(
          data.map(async (avaliacao) => {
            const { data: cliente } = await supabase
              .from('users')
              .select('nome, avatar_url')
              .eq('id', avaliacao.cliente_id)
              .single()
            return {
              id: avaliacao.id,
              nota: avaliacao.nota,
              comentario: avaliacao.comentario,
              resposta_guia: avaliacao.resposta_guia,
              status_moderacao: avaliacao.status_moderacao,
              created_at: avaliacao.created_at,
              cliente_id: avaliacao.cliente_id,
              cliente_nome: cliente?.nome || 'Cliente',
              cliente_avatar: cliente?.avatar_url
            }
          })
        )
        setAvaliacoes(avaliacoesCompletas)
      }
    } catch (err) {
      console.error('Erro ao carregar avaliações:', err)
    } finally {
      setCarregando(false)
    }
  }

  const getStatusInfo = (status: string, hasResposta: boolean) => {
    switch (status) {
      case 'pendente':
        if (!hasResposta) {
          return { label: 'Aguardando sua resposta', bg: '#fef3c7', color: '#d97706', icon: '⏳' }
        }
        return { label: 'Aguardando moderação', bg: '#dbeafe', color: '#3b82f6', icon: '✏️' }
      case 'aguardando_admin':
        return { label: 'Em moderação', bg: '#dbeafe', color: '#3b82f6', icon: '✏️' }
      case 'aprovada':
        return { label: 'Aprovada', bg: '#dcfce7', color: '#16a34a', icon: '✅' }
      default:
        return { label: status, bg: '#f3f4f6', color: '#6b7280', icon: '📝' }
    }
  }

  const getNotaEstrelas = (nota: number) => {
    return '🏔️'.repeat(nota) + '⛰️'.repeat(5 - nota)
  }

  const getNotaCor = (nota: number) => {
    if (nota >= 4) return '#16a34a'
    if (nota >= 3) return '#f59e0b'
    return '#dc2626'
  }

  const handleResponder = (avaliacaoId: string) => {
    router.push(`/guia/contra-resposta/${avaliacaoId}`)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  const avaliacoesFiltradas = avaliacoes.filter((a) => {
    if (filtro === 'pendente') return a.status_moderacao === 'pendente' && !a.resposta_guia
    if (filtro === 'respondidas') return a.status_moderacao === 'aguardando_admin' || (a.status_moderacao === 'pendente' && a.resposta_guia)
    if (filtro === 'aprovadas') return a.status_moderacao === 'aprovada'
    return true
  })

  const estatisticas = {
    total: avaliacoes.length,
    pendentes: avaliacoes.filter(a => a.status_moderacao === 'pendente' && !a.resposta_guia).length,
    respondidas: avaliacoes.filter(a => a.status_moderacao === 'aguardando_admin' || (a.status_moderacao === 'pendente' && a.resposta_guia)).length,
    aprovadas: avaliacoes.filter(a => a.status_moderacao === 'aprovada').length
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
            <h1 style={{ margin: 0, fontSize: '24px', color: '#dc2626', fontWeight: 'bold' }}>⭐ Minhas Avaliações</h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>Gerencie as avaliações dos clientes</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={() => router.push('/guia/dashboard')} style={{ backgroundColor: '#f3f4f6', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', color: '#374151', fontWeight: '600', fontSize: '13px' }}>← Voltar</button>
            <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Sair</button>
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div style={{ backgroundColor: '#fef3c7', borderRadius: '20px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#d97706' }}>{estatisticas.pendentes}</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Aguardando resposta</div>
          </div>
          <div style={{ backgroundColor: '#dbeafe', borderRadius: '20px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>✏️</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>{estatisticas.respondidas}</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Em moderação</div>
          </div>
          <div style={{ backgroundColor: '#dcfce7', borderRadius: '20px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>✅</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#16a34a' }}>{estatisticas.aprovadas}</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Aprovadas</div>
          </div>
          <div style={{ backgroundColor: '#f3f4f6', borderRadius: '20px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📊</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#6b7280' }}>{estatisticas.total}</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Total</div>
          </div>
        </div>

        {/* FILTROS */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button onClick={() => setFiltro('todas')} style={{ backgroundColor: filtro === 'todas' ? '#16a34a' : '#f3f4f6', color: filtro === 'todas' ? 'white' : '#374151', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Todas</button>
          <button onClick={() => setFiltro('pendente')} style={{ backgroundColor: filtro === 'pendente' ? '#d97706' : '#f3f4f6', color: filtro === 'pendente' ? 'white' : '#374151', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Aguardando resposta</button>
          <button onClick={() => setFiltro('respondidas')} style={{ backgroundColor: filtro === 'respondidas' ? '#3b82f6' : '#f3f4f6', color: filtro === 'respondidas' ? 'white' : '#374151', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Em moderação</button>
          <button onClick={() => setFiltro('aprovadas')} style={{ backgroundColor: filtro === 'aprovadas' ? '#16a34a' : '#f3f4f6', color: filtro === 'aprovadas' ? 'white' : '#374151', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Aprovadas</button>
        </div>

        {/* LISTA DE AVALIAÇÕES */}
        {carregando ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center', color: '#6b7280' }}>Carregando avaliações...</div>
        ) : avaliacoesFiltradas.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
            <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>Nenhuma avaliação encontrada</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>As avaliações aparecerão aqui quando os clientes avaliarem seus serviços.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {avaliacoesFiltradas.map((avaliacao) => {
              const notaCor = getNotaCor(avaliacao.nota)
              const statusInfo = getStatusInfo(avaliacao.status_moderacao, !!avaliacao.resposta_guia)
              const precisaResponder = avaliacao.status_moderacao === 'pendente' && !avaliacao.resposta_guia
              
              return (
                <div key={avaliacao.id} style={{ backgroundColor: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'all 0.2s ease', borderLeft: `4px solid ${notaCor}` }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div 
                      onClick={() => router.push(`/cliente/publico/${avaliacao.cliente_id}`)}
                      style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}
                    >
                      {avaliacao.cliente_avatar ? (
                        <img src={avaliacao.cliente_avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>{avaliacao.cliente_nome?.charAt(0).toUpperCase() || 'C'}</span>
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#111827', cursor: 'pointer' }} onClick={() => router.push(`/cliente/publico/${avaliacao.cliente_id}`)}>{avaliacao.cliente_nome}</span>
                        <span style={{ backgroundColor: statusInfo.bg, color: statusInfo.color, padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>{statusInfo.icon} {statusInfo.label}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>📅 {new Date(avaliacao.created_at).toLocaleDateString('pt-BR')}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '20px', letterSpacing: '2px', color: notaCor }}>{getNotaEstrelas(avaliacao.nota)}</div>
                  </div>

                  {avaliacao.comentario && (
                    <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                      <p style={{ margin: 0, fontSize: '14px', color: '#4b5563', lineHeight: 1.5 }}>“{avaliacao.comentario}”</p>
                    </div>
                  )}

                  {avaliacao.resposta_guia && (
                    <div style={{ backgroundColor: '#dbeafe', padding: '12px', borderRadius: '12px', marginBottom: '16px', borderLeft: '4px solid #3b82f6' }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 'bold', color: '#1e40af' }}>📝 Sua resposta:</p>
                      <p style={{ margin: 0, fontSize: '13px', color: '#1e3a8a', lineHeight: 1.5 }}>“{avaliacao.resposta_guia}”</p>
                    </div>
                  )}

                  {precisaResponder && (
                    <button
                      onClick={() => handleResponder(avaliacao.id)}
                      style={{ width: '100%', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '40px', padding: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'background-color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                    >
                      ✏️ Responder Avaliação
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}