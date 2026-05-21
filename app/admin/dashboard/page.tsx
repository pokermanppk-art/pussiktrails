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
  const [stats, setStats] = useState({
    reservasPendentes: 0,
    guiasPendentes: 0,
    roteirosPendentes: 0,
    avaliacoesPendentes: 0,
    totalUsuarios: 0,
    totalGuias: 0,
    totalClientes: 0,
    totalReservas: 0,
    receitaTotal: 0,
    receitaMes: 0
  })
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [guiasPendentesLista, setGuiasPendentesLista] = useState<any[]>([])
  const [roteirosPendentesLista, setRoteirosPendentesLista] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

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
    carregarGuiasPendentes()
    carregarRoteirosPendentes()

    const interval = setInterval(() => {
      carregarAtividades()
      carregarEstatisticas()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const carregarEstatisticas = async () => {
    // Reservas pendentes (pagamento confirmado aguardando guia)
    const { count: reservasPendentes } = await supabase
      .from('reservas')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pendente')
      .eq('pagamento_status', 'pago')

    // Guias pendentes (aguardando aprovação)
    const { count: guiasPendentes } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'guia')
      .eq('status', 'pendente')

    // Roteiros pendentes (aguardando aprovação)
    const { count: roteirosPendentes } = await supabase
      .from('roteiros')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'aguardando')

    // Avaliações pendentes (aguardando moderação)
    const { count: avaliacoesPendentes } = await supabase
      .from('avaliacoes')
      .select('*', { count: 'exact', head: true })
      .eq('status_moderacao', 'aguardando_admin')

    // Total de usuários
    const { count: totalUsuarios } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    // Total de guias
    const { count: totalGuias } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'guia')
      .neq('status', 'pendente')

    // Total de clientes
    const { count: totalClientes } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'cliente')

    // Total de reservas realizadas
    const { count: totalReservas } = await supabase
      .from('reservas')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'realizada')

    // Receita total (soma de todas reservas pagas)
    const { data: receitaData } = await supabase
      .from('reservas')
      .select('valor_total')
      .eq('status', 'realizada')
    
    const receitaTotal = receitaData?.reduce((sum, r) => sum + (r.valor_total || 0), 0) || 0

    // Receita do mês
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)
    
    const { data: receitaMesData } = await supabase
      .from('reservas')
      .select('valor_total')
      .eq('status', 'realizada')
      .gte('created_at', inicioMes.toISOString())
    
    const receitaMes = receitaMesData?.reduce((sum, r) => sum + (r.valor_total || 0), 0) || 0

    setStats({
      reservasPendentes: reservasPendentes || 0,
      guiasPendentes: guiasPendentes || 0,
      roteirosPendentes: roteirosPendentes || 0,
      avaliacoesPendentes: avaliacoesPendentes || 0,
      totalUsuarios: totalUsuarios || 0,
      totalGuias: totalGuias || 0,
      totalClientes: totalClientes || 0,
      totalReservas: totalReservas || 0,
      receitaTotal,
      receitaMes
    })
  }

  const carregarGuiasPendentes = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, nome, email, created_at, instagram, cadastur, cnpj')
      .eq('tipo', 'guia')
      .eq('status', 'pendente')
      .order('created_at', { ascending: false })
      .limit(5)
    
    setGuiasPendentesLista(data || [])
  }

  const carregarRoteirosPendentes = async () => {
    const { data } = await supabase
      .from('roteiros')
      .select('id, titulo, preco, created_at, guia:users(nome)')
      .eq('status', 'aguardando')
      .order('created_at', { ascending: false })
      .limit(5)
    
    setRoteirosPendentesLista(data || [])
  }

  const carregarAtividades = async () => {
    const { data, error } = await supabase
      .from('logs_atividades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error && data) {
      const atividadesFormatadas: Atividade[] = data.map((log) => ({
        id: log.id,
        descricao: log.detalhes || `${log.primeiro_nome} (${log.tipo_usuario === 'cliente' ? 'Aventureiro' : 'Navegador'}) realizou ${log.acao}`,
        destino: '/admin/dashboard',
        cor: getCorPorAcao(log.acao),
        created_at: log.created_at
      }))
      setAtividades(atividadesFormatadas)
    }
  }

  const getCorPorAcao = (acao: string): 'verde' | 'vermelho' | 'azul' | 'amarelo' | 'cinza' => {
    if (acao === 'login') return 'azul'
    if (acao === 'curtiu_foto' || acao === 'curtiu_perfil') return 'verde'
    if (acao === 'descurtiu_foto' || acao === 'descurtiu_perfil') return 'cinza'
    if (acao === 'avaliou') return 'amarelo'
    if (acao === 'reservou') return 'azul'
    return 'amarelo'
  }

  const getCorStyle = (cor: string) => {
    switch (cor) {
      case 'verde': return { bg: '#dcfce7', border: '#16a34a', text: '#166534' }
      case 'vermelho': return { bg: '#fee2e2', border: '#dc2626', text: '#991b1b' }
      case 'azul': return { bg: '#dbeafe', border: '#3b82f6', text: '#1e3a8a' }
      case 'cinza': return { bg: '#f3f4f6', border: '#9ca3af', text: '#4b5563' }
      default: return { bg: '#fef3c7', border: '#d97706', text: '#92400e' }
    }
  }

  const aprovarGuia = async (guiaId: string) => {
    await supabase.from('users').update({ status: 'ativo' }).eq('id', guiaId)
    carregarGuiasPendentes()
    carregarEstatisticas()
  }

  const reprovarGuia = async (guiaId: string) => {
    await supabase.from('users').update({ status: 'reprovado' }).eq('id', guiaId)
    carregarGuiasPendentes()
    carregarEstatisticas()
  }

  const aprovarRoteiro = async (roteiroId: string) => {
    await supabase.from('roteiros').update({ status: 'ativo' }).eq('id', roteiroId)
    carregarRoteirosPendentes()
    carregarEstatisticas()
  }

  const reprovarRoteiro = async (roteiroId: string) => {
    await supabase.from('roteiros').update({ status: 'reprovado' }).eq('id', roteiroId)
    carregarRoteirosPendentes()
    carregarEstatisticas()
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Carregando...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <style jsx global>{`
        @media (min-width: 768px) {
          .admin-container { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
          .stats-grid { grid-template-columns: repeat(4, 1fr) !important; }
          .pendentes-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* CABEÇALHO */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '12px 16px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>🏔️ PussikTrails - Admin</h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ color: '#4b5563', fontSize: '12px' }}>Olá, {user.email}</span>
            <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '40px', cursor: 'pointer', fontSize: '12px' }}>Sair</button>
          </div>
        </div>
      </div>

      <div className="admin-container" style={{ padding: '16px' }}>
        
        {/* CARDS DE ESTATÍSTICAS */}
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div onClick={() => router.push('/admin/reservas')} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>📋</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626' }}>{stats.reservasPendentes}</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>Reservas Pendentes</div>
          </div>
          <div onClick={() => router.push('/admin/guias')} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>👥</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: stats.guiasPendentes > 0 ? '#dc2626' : '#16a34a' }}>{stats.guiasPendentes}</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>Guias Pendentes</div>
          </div>
          <div onClick={() => router.push('/admin/roteiros')} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>📜</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.roteirosPendentes}</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>Roteiros Pendentes</div>
          </div>
          <div onClick={() => router.push('/admin/avaliacoes')} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🔔</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#8b5cf6' }}>{stats.avaliacoesPendentes}</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>Avaliações Pendentes</div>
          </div>
        </div>

        {/* CARDS DE RECEITA */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>💰 Receita Total</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a' }}>R$ {stats.receitaTotal.toLocaleString('pt-BR')}</div>
          </div>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>📈 Receita do Mês</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>R$ {stats.receitaMes.toLocaleString('pt-BR')}</div>
          </div>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>👤 Usuários Totais</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>{stats.totalUsuarios}</div>
          </div>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>🏅 Reservas Realizadas</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#8b5cf6' }}>{stats.totalReservas}</div>
          </div>
        </div>

        {/* GUIAS PENDENTES */}
        {guiasPendentesLista.length > 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>⏳ Guias Aguardando Aprovação</h3>
            <div className="pendentes-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {guiasPendentesLista.map((guia) => (
                <div key={guia.id} style={{ backgroundColor: '#f9fafb', borderRadius: '16px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{guia.nome || guia.email}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>📅 {new Date(guia.created_at).toLocaleDateString('pt-BR')}</div>
                    {guia.instagram && <div style={{ fontSize: '10px', color: '#9ca3af' }}>📷 {guia.instagram}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => aprovarGuia(guia.id)} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '40px', cursor: 'pointer', fontSize: '12px' }}>Aprovar</button>
                    <button onClick={() => reprovarGuia(guia.id)} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '40px', cursor: 'pointer', fontSize: '12px' }}>Reprovar</button>
                  </div>
                </div>
              ))}
            </div>
            {stats.guiasPendentes > 5 && (
              <button onClick={() => router.push('/admin/guias')} style={{ marginTop: '12px', color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', width: '100%', textAlign: 'center' }}>Ver todos →</button>
            )}
          </div>
        )}

        {/* ROTEIROS PENDENTES */}
        {roteirosPendentesLista.length > 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>📝 Roteiros Aguardando Aprovação</h3>
            <div className="pendentes-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {roteirosPendentesLista.map((roteiro) => (
                <div key={roteiro.id} style={{ backgroundColor: '#f9fafb', borderRadius: '16px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{roteiro.titulo}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Guia: {roteiro.guia?.nome || 'N/A'}</div>
                    <div style={{ fontSize: '11px', color: '#16a34a' }}>R$ {roteiro.preco}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => aprovarRoteiro(roteiro.id)} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '40px', cursor: 'pointer', fontSize: '12px' }}>Aprovar</button>
                    <button onClick={() => reprovarRoteiro(roteiro.id)} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '40px', cursor: 'pointer', fontSize: '12px' }}>Reprovar</button>
                  </div>
                </div>
              ))}
            </div>
            {stats.roteirosPendentes > 5 && (
              <button onClick={() => router.push('/admin/roteiros')} style={{ marginTop: '12px', color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', width: '100%', textAlign: 'center' }}>Ver todos →</button>
            )}
          </div>
        )}

        {/* FEED DE ATIVIDADES */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '20px' }}>📡</span>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Atividades Recentes</h3>
          </div>
          {atividades.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: '32px' }}>Nenhuma atividade recente.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
              {atividades.map((atividade) => {
                const estilo = getCorStyle(atividade.cor)
                return (
                  <div key={atividade.id} style={{ backgroundColor: estilo.bg, borderLeft: `4px solid ${estilo.border}`, borderRadius: '8px', padding: '12px', cursor: 'pointer' }} onClick={() => router.push(atividade.destino)}>
                    <p style={{ margin: 0, color: estilo.text, fontSize: '12px' }}>{atividade.descricao}</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#6b7280' }}>{new Date(atividade.created_at).toLocaleString('pt-BR')}</p>
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