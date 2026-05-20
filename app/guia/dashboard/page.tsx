'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function GuiaDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userNome, setUserNome] = useState<string>('Carregando...')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [roteiros, setRoteiros] = useState<any[]>([])
  const [notificacoesPendentes, setNotificacoesPendentes] = useState(0)
  const [stats, setStats] = useState({
    totalRoteiros: 0,
    totalReservas: 0,
    avaliacaoMedia: 0,
    medalhaNivel: 'bronze'
  })

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
    carregarDados(parsedUser.id)
    carregarNotificacoes(parsedUser.id)
  }, [router])

  const carregarDados = async (guiaId: string) => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('nome, avatar_url, avaliacao_media_guia')
        .eq('id', guiaId)
        .single()

      if (userData) {
        if (userData.nome) setUserNome(userData.nome)
        if (userData.avatar_url) setAvatarUrl(userData.avatar_url)
      }

      const { data: roteirosData } = await supabase
        .from('roteiros')
        .select('id, titulo, km, preco, dificuldade, localizacao, status, created_at')
        .eq('id_guia', guiaId)
        .order('created_at', { ascending: false })

      setRoteiros(roteirosData || [])
      const totalRoteiros = roteirosData?.length || 0

      const roteirosIds = (roteirosData || []).map(r => r.id)
      let totalReservas = 0
      if (roteirosIds.length > 0) {
        const { count } = await supabase
          .from('reservas')
          .select('*', { count: 'exact', head: true })
          .in('roteiro_id', roteirosIds)
        totalReservas = count || 0
      }

      const { data: avaliacoes } = await supabase
        .from('avaliacoes')
        .select('nota')
        .eq('guia_id', guiaId)

      const media = avaliacoes?.length
        ? avaliacoes.reduce((a, b) => a + b.nota, 0) / avaliacoes.length
        : 0

      const roteirosAtivos = (roteirosData || []).filter(r => r.status === 'ativo' || r.status === 'aprovado').length
      let medalha = 'bronze'
      if (roteirosAtivos >= 10) medalha = 'black'
      else if (roteirosAtivos >= 7) medalha = 'platina'
      else if (roteirosAtivos >= 4) medalha = 'ouro'
      else if (roteirosAtivos >= 2) medalha = 'prata'

      setStats({
        totalRoteiros,
        totalReservas,
        avaliacaoMedia: media,
        medalhaNivel: medalha
      })
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    }
  }

  const carregarNotificacoes = async (guiaId: string) => {
    const { count, error } = await supabase
      .from('avaliacoes')
      .select('id', { count: 'exact', head: true })
      .eq('guia_id', guiaId)
      .eq('status_moderacao', 'pendente')
      .lte('nota', 2)

    if (!error && count !== null) {
      setNotificacoesPendentes(count)
    } else {
      setNotificacoesPendentes(0)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  const getMedalhaCor = (nivel: string) => {
    switch (nivel) {
      case 'bronze': return '#cd7f32'
      case 'prata': return '#c0c0c0'
      case 'ouro': return '#ffd700'
      case 'platina': return '#e5e4e2'
      case 'black': return '#111111'
      default: return '#cd7f32'
    }
  }

  const getMedalhaNome = (nivel: string) => {
    switch (nivel) {
      case 'bronze': return 'Bronze'
      case 'prata': return 'Prata'
      case 'ouro': return 'Ouro'
      case 'platina': return 'Platina'
      case 'black': return 'Black'
      default: return 'Bronze'
    }
  }

  const getProximoNivel = (nivel: string) => {
    switch (nivel) {
      case 'bronze': return 'Prata (2 roteiros aprovados)'
      case 'prata': return 'Ouro (4 roteiros aprovados)'
      case 'ouro': return 'Platina (7 roteiros aprovados)'
      case 'platina': return 'Black (10 roteiros aprovados)'
      case 'black': return '🏆 Máximo alcançado!'
      default: return 'Prata (2 roteiros aprovados)'
    }
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
      {/* CABEÇALHO PRINCIPAL - PRETO COM SININHO */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>🏔️ PrussikTrails</h1>
            <span style={{ fontSize: '12px', backgroundColor: '#d1fae5', color: '#065f46', padding: '4px 12px', borderRadius: '20px' }}>Navegador</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* SININHO DE NOTIFICAÇÕES */}
            <div 
              onClick={() => router.push('/guia/avaliacoes-pendentes')}
              style={{ position: 'relative', cursor: 'pointer', padding: '4px' }}
            >
              <span style={{ fontSize: '22px' }}>🔔</span>
              {notificacoesPendentes > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {notificacoesPendentes > 9 ? '9+' : notificacoesPendentes}
                </span>
              )}
            </div>
            <button onClick={() => router.push('/guia/perfil')} style={{ backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Perfil</button>
            <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Sair</button>
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', margin: 0 }}>🧭 Dashboard do Guia</h2>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '6px' }}>Gerencie seus roteiros, reservas e acompanhe seu desempenho</p>
        </div>

        {/* CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div onClick={() => router.push('/guia/roteiros')} style={{ cursor: 'pointer', backgroundColor: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🗺️</div>
              <div><h3 style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Meus Roteiros</h3><p style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a', margin: 0, lineHeight: 1.2 }}>{stats.totalRoteiros}</p></div>
            </div>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Clique para ver →</p>
          </div>

          <div onClick={() => router.push('/guia/reservas')} style={{ cursor: 'pointer', backgroundColor: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📅</div>
              <div><h3 style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Reservas</h3><p style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6', margin: 0, lineHeight: 1.2 }}>{stats.totalReservas}</p></div>
            </div>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Clique para ver detalhes →</p>
          </div>

          <div onClick={() => router.push('/guia/avaliacoes')} style={{ cursor: 'pointer', backgroundColor: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#fefce8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>⭐</div>
              <div><h3 style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Avaliação</h3><p style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b', margin: 0, lineHeight: 1.2 }}>{stats.avaliacaoMedia.toFixed(1)}</p></div>
            </div>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Clique para ver detalhes →</p>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🏅</div>
              <div><h3 style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Nível</h3><p style={{ fontSize: '22px', fontWeight: 'bold', color: getMedalhaCor(stats.medalhaNivel), margin: 0, lineHeight: 1.2 }}>{getMedalhaNome(stats.medalhaNivel)}</p></div>
            </div>
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>🎯 {getProximoNivel(stats.medalhaNivel)}</p>
          </div>
        </div>

        {/* TABELA DE ROTEIROS */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Título</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Local</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>KM</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Preço</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Status</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {roteiros.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
                      Nenhum roteiro criado ainda.
                    </td>
                  </tr>
                ) : (
                  roteiros.map((roteiro) => {
                    const isAprovado = roteiro.status === 'ativo' || roteiro.status === 'aprovado'
                    const isAguardando = roteiro.status === 'aguardando'
                    let statusLabel = 'Rascunho'
                    let statusBg = '#f3f4f6'
                    let statusColor = '#6b7280'
                    if (isAprovado) {
                      statusLabel = 'Aprovado'
                      statusBg = '#dcfce7'
                      statusColor = '#16a34a'
                    }
                    if (isAguardando) {
                      statusLabel = 'Aguardando'
                      statusBg = '#fef3c7'
                      statusColor = '#d97706'
                    }
                    return (
                      <tr key={roteiro.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>{roteiro.titulo}</td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280' }}>{roteiro.localizacao}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>{roteiro.km} km</td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>R$ {roteiro.preco}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: statusBg, color: statusColor }}>
                            {statusLabel}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          {!isAprovado ? (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button onClick={() => router.push(`/guia/roteiros/editar/${roteiro.id}`)} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '30px', padding: '6px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>✏️ Editar</button>
                              <button
                                onClick={async () => {
                                  if (confirm(`Excluir "${roteiro.titulo}"?`)) {
                                    await supabase.from('roteiros').delete().eq('id', roteiro.id)
                                    carregarDados(user.id)
                                  }
                                }}
                                style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '30px', padding: '6px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                              >
                                🗑️ Excluir
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '500' }}>✅ Publicado</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}