'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Atividade = {
  id: string
  descricao: string
  tipo: string
  created_at: string
  usuario_nome: string
  usuario_avatar?: string
  usuario_id: string
  roteiro_id?: string
}

export default function ClienteDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userNome, setUserNome] = useState<string>('Carregando...')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [roteirosPopulares, setRoteirosPopulares] = useState<any[]>([])
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [carregandoAtividades, setCarregandoAtividades] = useState(true)
  const [filtroAtividades, setFiltroAtividades] = useState<'all' | 'com'>('all')
  const [totalRoteiros, setTotalRoteiros] = useState(0)

  // Estatísticas do cliente
  const [stats, setStats] = useState({
    proximasAventuras: 0,
    conquistas: 0,
    avaliacaoMedia: 0
  })

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

    buscarDadosUsuario(parsedUser.id)
    carregarRoteirosPopulares()
    carregarTotalRoteiros()
    carregarEstatisticas(parsedUser.id)
    carregarAtividades(parsedUser.id)
  }, [router])

  const buscarDadosUsuario = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('nome, avatar_url')
        .eq('id', userId)
        .single()

      if (error) {
        const emailName = user?.email?.split('@')[0] || 'Aventureiro'
        setUserNome(emailName)
        return
      }

      if (data) {
        if (data.nome && data.nome.trim() !== '') {
          setUserNome(data.nome)
        } else {
          const emailName = user?.email?.split('@')[0] || 'Aventureiro'
          setUserNome(emailName)
        }
        if (data.avatar_url) setAvatarUrl(data.avatar_url)
      }
    } catch (err) {
      const emailName = user?.email?.split('@')[0] || 'Aventureiro'
      setUserNome(emailName)
    }
  }

  const carregarEstatisticas = async (userId: string) => {
    try {
      const { count: proximas } = await supabase
        .from('reservas')
        .select('*', { count: 'exact', head: true })
        .eq('cliente_id', userId)
        .eq('status', 'confirmada')
        .gte('data_trilha', new Date().toISOString().split('T')[0])

      const { count: conquistas } = await supabase
        .from('usuarios_medalhas')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', userId)

      const { data: avaliacoes } = await supabase
        .from('avaliacoes')
        .select('nota')
        .eq('cliente_id', userId)

      const media = avaliacoes?.length
        ? avaliacoes.reduce((a, b) => a + b.nota, 0) / avaliacoes.length
        : 0

      setStats({
        proximasAventuras: proximas || 0,
        conquistas: conquistas || 0,
        avaliacaoMedia: media
      })
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err)
    }
  }

  const carregarAtividades = async (userId: string) => {
    setCarregandoAtividades(true)
    try {
      const acoesPermitidas = [
        'curtiu_foto',
        'curtiu_perfil',
        'criou_roteiro',
        'compartilhou_fotos'
      ]

      let query = supabase
        .from('logs_atividades')
        .select('*')
        .in('acao', acoesPermitidas)
        .order('created_at', { ascending: false })
        .limit(20)

      const { data, error } = await query

      if (error) throw error

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(log => log.usuario_id).filter(Boolean))]
        let userMap: Record<string, { nome: string; avatar_url?: string }> = {}
        if (userIds.length > 0) {
          const { data: usuarios } = await supabase
            .from('users')
            .select('id, nome, avatar_url')
            .in('id', userIds)
          userMap = (usuarios || []).reduce((acc, u) => {
            acc[u.id] = { nome: u.nome, avatar_url: u.avatar_url }
            return acc
          }, {} as Record<string, { nome: string; avatar_url?: string }>)
        }

        const atividadesFormatadas: Atividade[] = data.map(log => {
          let roteiroId = undefined
          if (log.acao === 'criou_roteiro' && log.alvo_id) {
            roteiroId = log.alvo_id
          }
          return {
            id: log.id,
            descricao: log.detalhes || `${log.primeiro_nome} realizou ${log.acao}`,
            tipo: log.acao,
            created_at: log.created_at,
            usuario_id: log.usuario_id,
            usuario_nome: log.usuario_id ? (userMap[log.usuario_id]?.nome || log.primeiro_nome || 'Usuário') : (log.primeiro_nome || 'Usuário'),
            usuario_avatar: log.usuario_id ? userMap[log.usuario_id]?.avatar_url : undefined,
            roteiro_id: roteiroId
          }
        })
        setAtividades(atividadesFormatadas)
      } else {
        setAtividades([])
      }
    } catch (err) {
      console.error('Erro ao carregar atividades:', err)
      setAtividades([])
    } finally {
      setCarregandoAtividades(false)
    }
  }

  const carregarRoteirosPopulares = async () => {
    const { data, error } = await supabase
      .from('roteiros')
      .select('*')
      .eq('status', 'ativo')
      .order('created_at', { ascending: false })
      .limit(3)

    if (!error && data) {
      setRoteirosPopulares(data)
    }
  }

  const carregarTotalRoteiros = async () => {
    const { count } = await supabase
      .from('roteiros')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ativo')
    setTotalRoteiros(count || 0)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  const handleVerRoteiro = (roteiroId: string) => {
    router.push(`/cliente/roteiros/${roteiroId}`)
  }

  const handleAtividadeClick = (atividade: Atividade) => {
    if (atividade.tipo === 'criou_roteiro' && atividade.roteiro_id) {
      router.push(`/cliente/roteiros/${atividade.roteiro_id}`)
    }
  }

  const getIconePorAcao = (acao: string) => {
    if (acao === 'curtiu_foto') return '❤️'
    if (acao === 'curtiu_perfil') return '👍'
    if (acao === 'criou_roteiro') return '📝'
    if (acao === 'compartilhou_fotos') return '📸'
    return '📢'
  }

  const isAtividadeClicavel = (atividade: Atividade) => {
    return atividade.tipo === 'criou_roteiro' && !!atividade.roteiro_id
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
      {/* CABEÇALHO PRINCIPAL */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>🏔️ PrussikTrails</h1>
            <span style={{ fontSize: '12px', backgroundColor: '#d1fae5', color: '#065f46', padding: '4px 12px', borderRadius: '20px' }}>Aventureiro</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={() => router.push('/cliente/perfil')} style={{ backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Perfil</button>
            <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Sair</button>
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        
        {/* SAUDAÇÃO */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827' }}>Bem-vindo, {userNome}! 🥾</h2>
          <p style={{ color: '#6b7280', marginTop: '8px', fontSize: '14px' }}>Prepare-se para sua próxima trilha inesquecível</p>
        </div>

        {/* CARDS DE ESTATÍSTICAS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div 
            onClick={() => router.push('/cliente/minhas-reservas')}
            style={{ cursor: 'pointer', backgroundColor: 'white', borderRadius: '20px', padding: '24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'all 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏔️</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#16a34a' }}>{stats.proximasAventuras}</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Próximas Aventuras</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>Clique para ver →</div>
          </div>

          <div 
            onClick={() => router.push('/cliente/perfil')}
            style={{ cursor: 'pointer', backgroundColor: 'white', borderRadius: '20px', padding: '24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'all 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#16a34a' }}>{stats.conquistas}</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Conquistas</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>Clique para ver →</div>
          </div>

          <div 
            onClick={() => router.push('/cliente/avaliacoes')}
            style={{ cursor: 'pointer', backgroundColor: 'white', borderRadius: '20px', padding: '24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'all 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>⭐</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: stats.avaliacaoMedia > 0 ? '#f59e0b' : '#9ca3af' }}>{stats.avaliacaoMedia.toFixed(1)}</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Avaliação</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>Clique para ver →</div>
          </div>
        </div>

        {/* SEÇÃO: ROTEIROS MAIS PROCURADOS */}
        {roteirosPopulares.length > 0 && (
          <>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>🔥 Roteiros Mais Procurados</h3>
              <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>Os destinos que estão em alta</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px', marginBottom: '48px' }}>
              {roteirosPopulares.map((roteiro) => (
                <div key={roteiro.id} onClick={() => handleVerRoteiro(roteiro.id)} style={{ backgroundColor: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer', position: 'relative' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)' }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <div style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: '#dc2626', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', zIndex: 1 }}>🔥 Em alta</div>
                  {roteiro.foto_capa ? <img src={roteiro.foto_capa} alt={roteiro.titulo} style={{ width: '100%', height: '180px', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x300/e5e7eb/6b7280?text=Trilha' }} /> : <div style={{ width: '100%', height: '180px', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>🏔️</div>}
                  <div style={{ padding: '20px', textAlign: 'center' }}><h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827', margin: 0 }}>{roteiro.titulo}</h3><div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280', display: 'flex', justifyContent: 'center', gap: '16px' }}><span>📍 {roteiro.localizacao}</span><span>🥾 {roteiro.km} KM</span></div></div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* LINHA DO TEMPO - ATIVIDADES DA COMUNIDADE */}
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', marginBottom: '40px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>📡</span>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#111827' }}>Atividades da Comunidade</h3>
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>O que outros aventureiros estão fazendo</p>
              </div>
            </div>
            
            {/* SELETOR ALL / COM */}
            <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f3f4f6', borderRadius: '40px', padding: '4px' }}>
              <button
                onClick={() => setFiltroAtividades('all')}
                style={{
                  padding: '6px 20px',
                  borderRadius: '40px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  backgroundColor: filtroAtividades === 'all' ? '#16a34a' : 'transparent',
                  color: filtroAtividades === 'all' ? 'white' : '#374151',
                  transition: 'all 0.2s'
                }}
              >
                ALL
              </button>
              <button
                onClick={() => setFiltroAtividades('com')}
                style={{
                  padding: '6px 20px',
                  borderRadius: '40px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  backgroundColor: filtroAtividades === 'com' ? '#16a34a' : 'transparent',
                  color: filtroAtividades === 'com' ? 'white' : '#374151',
                  transition: 'all 0.2s'
                }}
              >
                COM
              </button>
            </div>
          </div>

          {filtroAtividades === 'com' && (
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '12px', textAlign: 'center', fontSize: '13px', color: '#d97706' }}>
              🔜 Em breve: atividades apenas de quem você segue!
            </div>
          )}

          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {carregandoAtividades ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }}></div>
                Carregando atividades...
              </div>
            ) : atividades.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9fafb', borderRadius: '16px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
                <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>Nenhuma atividade recente</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>As atividades da comunidade aparecerão aqui.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {atividades.map((atividade) => {
                  const isClicavel = isAtividadeClicavel(atividade)
                  return (
                    <div 
                      key={atividade.id} 
                      onClick={() => handleAtividadeClick(atividade)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        padding: '12px', 
                        backgroundColor: '#f9fafb', 
                        borderRadius: '16px', 
                        transition: 'all 0.2s',
                        cursor: isClicavel ? 'pointer' : 'default'
                      }} 
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                        if (isClicavel) e.currentTarget.style.transform = 'translateX(4px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9fafb'
                        e.currentTarget.style.transform = 'translateX(0)'
                      }}
                    >
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: 'white', overflow: 'hidden' }}>
                        {atividade.usuario_avatar ? (
                          <img src={atividade.usuario_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span>{atividade.usuario_nome?.charAt(0).toUpperCase() || 'U'}</span>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', color: '#4b5563' }}>
                          <strong style={{ color: '#111827' }}>{atividade.usuario_nome}</strong>{' '}
                          {atividade.descricao.replace(atividade.usuario_nome, '').trim()}
                          {isClicavel && (
                            <span style={{ fontSize: '11px', color: '#16a34a', marginLeft: '8px' }}>🔗 Clique para ver</span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                          {new Date(atividade.created_at).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      <div style={{ fontSize: '20px' }}>
                        {getIconePorAcao(atividade.tipo)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* BOTÃO EXPLORAR TODOS OS ROTEIROS */}
        <div style={{ textAlign: 'center', marginTop: '20px', marginBottom: '40px' }}>
          <button 
            onClick={() => router.push('/cliente/roteiros')}
            style={{ 
              backgroundColor: '#16a34a', 
              color: 'white', 
              padding: '12px 32px', 
              borderRadius: '40px', 
              border: 'none', 
              fontSize: '14px', 
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#15803d'
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#16a34a'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            Ver todos os roteiros →
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}