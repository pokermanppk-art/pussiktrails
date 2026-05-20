'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Atividade = {
  id: string
  descricao: string
  destino: string
  cor: 'verde' | 'vermelho' | 'azul' | 'amarelo' | 'cinza'
  created_at: string
}

export default function AdminDashboard() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [carregandoAtividades, setCarregandoAtividades] = useState(true)
  const [notificacoesPendentes, setNotificacoesPendentes] = useState(0)

  const [stats, setStats] = useState({
    reservasPendentes: 0,
    guiasPendentes: 0,
    roteirosPendentes: 0,
    avaliacoesPendentes: 0
  })

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }
    const parsedUser = JSON.parse(userData)
    if (parsedUser.tipo !== 'admin') {
      router.push('/login')
      return
    }
    setUser(parsedUser)
    carregarEstatisticas()
    carregarAtividades()
    carregarNotificacoes()

    const interval = setInterval(() => {
      carregarEstatisticas()
      carregarAtividades()
      carregarNotificacoes()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const carregarNotificacoes = async () => {
    // Contar avaliações que aguardam moderação do admin (guia já respondeu)
    const { count, error } = await supabase
      .from('avaliacoes')
      .select('id', { count: 'exact', head: true })
      .eq('status_moderacao', 'aguardando_admin')

    if (!error && count !== null) {
      setNotificacoesPendentes(count)
    } else {
      setNotificacoesPendentes(0)
    }
  }

  const carregarEstatisticas = async () => {
    const { count: reservasPendentes } = await supabase
      .from('reservas')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pendente')

    const { count: guiasPendentes } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'guia')
      .eq('status', 'pendente')

    const { count: roteirosPendentes } = await supabase
      .from('roteiros')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'aguardando')

    const { count: avaliacoesPendentes } = await supabase
      .from('avaliacoes')
      .select('*', { count: 'exact', head: true })
      .eq('status_moderacao', 'pendente')

    setStats({
      reservasPendentes: reservasPendentes || 0,
      guiasPendentes: guiasPendentes || 0,
      roteirosPendentes: roteirosPendentes || 0,
      avaliacoesPendentes: avaliacoesPendentes || 0
    })
  }

  const carregarAtividades = async () => {
    setCarregandoAtividades(true)
    try {
      const { data, error } = await supabase
        .from('logs_atividades')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) {
        console.error('Erro ao carregar atividades:', error)
        setAtividades([])
      } else if (data && data.length > 0) {
        const atividadesFormatadas: Atividade[] = data.map((log) => ({
          id: log.id,
          descricao: log.detalhes || `${log.primeiro_nome} (${log.tipo_usuario === 'cliente' ? 'Aventureiro' : 'Navegador'}) realizou ${log.acao}`,
          destino: getDestinoPorAcao(log.acao, log.alvo_id),
          cor: getCorPorAcao(log.acao),
          created_at: log.created_at
        }))
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

  const getDestinoPorAcao = (acao: string, alvoId?: string): string => {
    switch (acao) {
      case 'criou_roteiro':
      case 'aprovou_roteiro':
      case 'reprovou_roteiro':
        return '/admin/roteiros'
      case 'reservou':
      case 'confirmou_reserva':
      case 'cancelou_reserva':
        return '/admin/reservas'
      case 'login':
        return '/admin/dashboard'
      case 'curtiu_foto':
      case 'curtiu_perfil':
        return '/admin/dashboard'
      default:
        return '/admin/dashboard'
    }
  }

  const getCorPorAcao = (
    acao: string
  ): 'verde' | 'vermelho' | 'azul' | 'amarelo' | 'cinza' => {
    if (acao === 'login') return 'azul'
    if (acao === 'criou_roteiro') return 'amarelo'
    if (acao === 'aprovou_roteiro') return 'verde'
    if (acao === 'reprovou_roteiro') return 'vermelho'
    if (acao === 'curtiu_foto' || acao === 'curtiu_perfil') return 'verde'
    if (acao === 'descurtiu_foto' || acao === 'descurtiu_perfil') return 'cinza'
    if (acao === 'reservou') return 'azul'
    if (acao === 'confirmou_reserva') return 'verde'
    if (acao === 'cancelou_reserva') return 'vermelho'
    return 'amarelo'
  }

  const getCorStyle = (cor: string) => {
    switch (cor) {
      case 'verde':
        return { bg: '#dcfce7', border: '#16a34a', text: '#166534' }
      case 'vermelho':
        return { bg: '#fee2e2', border: '#dc2626', text: '#991b1b' }
      case 'azul':
        return { bg: '#dbeafe', border: '#3b82f6', text: '#1e3a8a' }
      case 'cinza':
        return { bg: '#f3f4f6', border: '#9ca3af', text: '#4b5563' }
      default:
        return { bg: '#fef3c7', border: '#d97706', text: '#92400e' }
    }
  }

  const handleAtividadeClick = (destino: string) => {
    router.push(destino)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* HEADER COM SININHO */}
      <div
        style={{
          backgroundColor: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #e5e7eb',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '18px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          {/* LOGO */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            <div
              style={{
                width: '58px',
                height: '58px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg,#16a34a,#22c55e)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                color: 'white',
                boxShadow: '0 12px 25px rgba(34,197,94,0.25)'
              }}
            >
              🏔️
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#111827' }}>PrussikTrails Admin</h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>Painel inteligente de gerenciamento</p>
            </div>
          </div>

          {/* USER E NOTIFICAÇÕES */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            {/* SININHO DE NOTIFICAÇÕES */}
            <div 
              onClick={() => router.push('/admin/avaliacoes')}
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

            <div
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '999px',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '700'
                }}
              >
                {user?.nome?.charAt(0) || 'A'}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>{user.nome || 'Administrador'}</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Admin Online</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '999px',
                padding: '12px 20px',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '13px',
                boxShadow: '0 10px 20px rgba(220,38,38,0.18)'
              }}
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '28px 24px' }}>
        {/* HERO */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '28px',
            padding: '28px',
            marginBottom: '24px',
            border: '1px solid #e5e7eb',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: '-60px',
              top: '-60px',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              backgroundColor: '#f3f4f6'
            }}
          />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '12px', fontWeight: '600', letterSpacing: '1px', color: '#16a34a', marginBottom: '8px' }}>DASHBOARD ADMINISTRATIVO</div>
            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#111827', lineHeight: 1.2 }}>Controle total da plataforma</h2>
            <p style={{ marginTop: '10px', maxWidth: '520px', fontSize: '14px', color: '#6b7280', lineHeight: 1.5 }}>Gerencie reservas, roteiros, avaliações e aprovações em um painel moderno e otimizado.</p>
          </div>
        </div>

        {/* CARDS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}
        >
          {[
            { emoji: '🟡', titulo: 'Reservas Pendentes', valor: stats.reservasPendentes, cor: '#f59e0b', rota: '/admin/reservas/pendentes' },
            { emoji: '👥', titulo: 'Guias Pendentes', valor: stats.guiasPendentes, cor: '#16a34a', rota: '/admin/guias' },
            { emoji: '🗺️', titulo: 'Roteiros Pendentes', valor: stats.roteirosPendentes, cor: '#9333ea', rota: '/admin/roteiros' },
            { emoji: '⭐', titulo: 'Avaliações Pendentes', valor: stats.avaliacoesPendentes, cor: stats.avaliacoesPendentes > 0 ? '#dc2626' : '#16a34a', rota: '/admin/avaliacoes' }
          ].map((item) => (
            <div
              key={item.titulo}
              onClick={() => router.push(item.rota)}
              style={{
                backgroundColor: 'white',
                borderRadius: '28px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)'
                e.currentTarget.style.boxShadow = '0 18px 40px rgba(0,0,0,0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ width: '58px', height: '58px', borderRadius: '18px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '20px' }}>{item.emoji}</div>
              <div style={{ fontSize: '38px', fontWeight: '800', color: item.cor, lineHeight: 1, marginBottom: '10px' }}>{item.valor}</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>{item.titulo}</div>
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#9ca3af' }}>Abrir dashboard →</div>
            </div>
          ))}
        </div>

        {/* FEED DE ATIVIDADES */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '30px',
            padding: '28px',
            border: '1px solid #e5e7eb'
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#111827' }}>📡 Atividades Recentes</h3>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#6b7280' }}>Últimas movimentações da plataforma</p>
          </div>

          {carregandoAtividades ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Carregando atividades...</div>
          ) : atividades.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Nenhuma atividade recente.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {atividades.map((atividade) => {
                const estilo = getCorStyle(atividade.cor)
                return (
                  <div
                    key={atividade.id}
                    onClick={() => handleAtividadeClick(atividade.destino)}
                    style={{
                      backgroundColor: estilo.bg,
                      borderLeft: `4px solid ${estilo.border}`,
                      borderRadius: '18px',
                      padding: '16px 18px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(4px)'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ fontSize: '14px', color: estilo.text, fontWeight: '500' }}>{atividade.descricao}</div>
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#6b7280' }}>{new Date(atividade.created_at).toLocaleString('pt-BR')}</div>
                    <div style={{ marginTop: '4px', fontSize: '10px', color: estilo.border }}>🔗 Clique para ver mais →</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}