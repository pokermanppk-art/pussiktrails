'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function ClienteDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [stats, setStats] = useState({
    totalKm: 0,
    totalTrilhas: 0,
    reservasPendentes: 0,
    reservasConfirmadas: 0,
    reservasRealizadas: 0,
    totalMedalhas: 0,
    ultimaAtividade: ''
  })
  const [roteirosRecomendados, setRoteirosRecomendados] = useState<any[]>([])
  const [proximasReservas, setProximasReservas] = useState<any[]>([])

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }
    const parsedUser = JSON.parse(userData)
    if (parsedUser.tipo !== 'cliente') {
      router.push('/')
      return
    }
    setUser(parsedUser)
    carregarDados(parsedUser.id)
  }, [])

  const carregarDados = async (userId: string) => {
    try {
      // 1. Estatísticas de KM e trilhas
      const { data: reservasRealizadas } = await supabase
        .from('reservas')
        .select('*, roteiro:roteiro_id(km)')
        .eq('cliente_id', userId)
        .eq('status', 'realizada')

      let kmTotal = 0
      reservasRealizadas?.forEach(r => { kmTotal += r.roteiro?.km || 0 })

      // 2. Contagem de reservas por status
      const { count: pendentes } = await supabase
        .from('reservas')
        .select('*', { count: 'exact', head: true })
        .eq('cliente_id', userId)
        .eq('status', 'pendente')

      const { count: confirmadas } = await supabase
        .from('reservas')
        .select('*', { count: 'exact', head: true })
        .eq('cliente_id', userId)
        .eq('status', 'confirmada')

      const { count: realizadas } = await supabase
        .from('reservas')
        .select('*', { count: 'exact', head: true })
        .eq('cliente_id', userId)
        .eq('status', 'realizada')

      // 3. Total de medalhas
      const { count: totalMedalhas } = await supabase
        .from('usuarios_medalhas')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', userId)

      // 4. Última atividade (última reserva realizada)
      const { data: ultimaReserva } = await supabase
        .from('reservas')
        .select('created_at')
        .eq('cliente_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // 5. Próximas reservas (confirmadas e pendentes com data futura)
      const { data: proximas } = await supabase
        .from('reservas')
        .select('*, roteiro:roteiro_id(titulo, foto_capa)')
        .eq('cliente_id', userId)
        .in('status', ['confirmada', 'pendente'])
        .gte('data_trilha', new Date().toISOString().split('T')[0])
        .order('data_trilha', { ascending: true })
        .limit(5)

      setProximasReservas(proximas || [])

      // 6. Roteiros recomendados (baseados em dificuldade e localização - simplificado)
      const { data: recomendados } = await supabase
        .from('roteiros')
        .select('id, titulo, foto_capa, preco, duracao_horas, km, dificuldade, localizacao')
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })
        .limit(6)

      setRoteirosRecomendados(recomendados || [])

      setStats({
        totalKm: kmTotal,
        totalTrilhas: reservasRealizadas?.length || 0,
        reservasPendentes: pendentes || 0,
        reservasConfirmadas: confirmadas || 0,
        reservasRealizadas: realizadas || 0,
        totalMedalhas: totalMedalhas || 0,
        ultimaAtividade: ultimaReserva?.created_at 
          ? new Date(ultimaReserva.created_at).toLocaleDateString('pt-BR')
          : 'Nenhuma atividade'
      })

    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setCarregando(false)
    }
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

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏔️</div>
          <div style={{ color: '#6b7280' }}>Carregando dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <style jsx global>{`
        @media (min-width: 768px) {
          .dashboard-container { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
          .stats-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 20px !important; }
          .reservas-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 20px !important; }
          .roteiros-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 20px !important; }
        }
      `}</style>

      {/* HEADER */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>🏔️ PussikTrails</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => router.push('/cliente/perfil')} style={{ backgroundColor: '#f3f4f6', border: 'none', padding: '6px 12px', borderRadius: '40px', fontSize: '12px', cursor: 'pointer' }}>Perfil</button>
            <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '40px', fontSize: '12px', cursor: 'pointer' }}>Sair</button>
          </div>
        </div>
      </div>

      <div className="dashboard-container" style={{ padding: '16px' }}>
        
        {/* WELCOME CARD */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#111827' }}>Olá, {user?.nome || user?.email?.split('@')[0]}! 👋</h2>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Bem-vindo ao seu dashboard de aventuras</p>
            </div>
            <div style={{ backgroundColor: '#f3f4f6', borderRadius: '16px', padding: '8px 16px', textAlign: 'center' }}>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>{stats.totalKm}</span>
              <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>km totais</span>
            </div>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🥾</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{stats.totalTrilhas}</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>Trilhas realizadas</div>
          </div>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🏅</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{stats.totalMedalhas}</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>Medalhas conquistadas</div>
          </div>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.reservasPendentes + stats.reservasConfirmadas}</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>Próximas aventuras</div>
          </div>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>⭐</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{stats.reservasRealizadas}</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>Aventuras completas</div>
          </div>
        </div>

        {/* PRÓXIMAS RESERVAS */}
        {proximasReservas.length > 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '20px' }}>📅</span>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#111827' }}>Próximas Aventuras</h3>
            </div>
            <div className="reservas-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {proximasReservas.map((reserva) => (
                <div key={reserva.id} style={{ backgroundColor: '#f9fafb', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
                      {reserva.roteiro?.foto_capa ? (
                        <img src={reserva.roteiro.foto_capa} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏔️</div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{reserva.roteiro?.titulo || 'Roteiro'}</div>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>
                        📅 {new Date(reserva.data_trilha).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <span style={{ backgroundColor: reserva.status === 'confirmada' ? '#dcfce7' : '#fef3c7', color: reserva.status === 'confirmada' ? '#16a34a' : '#d97706', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold' }}>
                    {reserva.status === 'confirmada' ? '✅ Confirmada' : '⏳ Pendente'}
                  </span>
                </div>
              ))}
            </div>
            <button onClick={() => router.push('/cliente/minhas-reservas')} style={{ marginTop: '16px', textAlign: 'center', color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', width: '100%', padding: '8px' }}>
              Ver todas as reservas →
            </button>
          </div>
        )}

        {/* ROTEIROS RECOMENDADOS */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '20px' }}>🔥</span>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#111827' }}>Recomendados para Você</h3>
          </div>
          <div className="roteiros-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {roteirosRecomendados.map((roteiro) => (
              <div 
                key={roteiro.id} 
                onClick={() => router.push(`/roteiros/${roteiro.id}`)}
                style={{ 
                  backgroundColor: '#f9fafb', 
                  borderRadius: '16px', 
                  overflow: 'hidden', 
                  cursor: 'pointer',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ height: '100px', backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
                  {roteiro.foto_capa ? (
                    <img src={roteiro.foto_capa} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🏔️</div>
                  )}
                </div>
                <div style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>{roteiro.titulo}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                    <div style={{ fontSize: '10px', color: '#6b7280' }}>📍 {roteiro.localizacao}</div>
                    <div style={{ fontSize: '10px', color: getDificuldadeCor(roteiro.dificuldade) }}>
                      {getDificuldadeIcone(roteiro.dificuldade)} {roteiro.dificuldade}
                    </div>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 'bold', color: '#16a34a' }}>
                    R$ {roteiro.preco}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {roteirosRecomendados.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px', backgroundColor: '#f9fafb', borderRadius: '16px' }}>
              <span style={{ fontSize: '32px' }}>🗺️</span>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>Em breve, novos roteiros por aqui!</p>
            </div>
          )}
          <button onClick={() => router.push('/cliente/roteiros')} style={{ marginTop: '16px', textAlign: 'center', color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', width: '100%', padding: '8px' }}>
            Explorar todos os roteiros →
          </button>
        </div>
      </div>
    </div>
  )
}