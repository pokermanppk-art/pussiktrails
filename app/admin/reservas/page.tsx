'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Reserva = {
  id: string
  cliente_id: string
  cliente_nome?: string
  cliente_email?: string
  roteiro_id: string
  roteiro_titulo?: string
  roteiro_km?: number
  data_trilha: string
  quantidade_pessoas: number
  valor_total?: number
  status: string
  pagamento_status?: string
  created_at: string
}

export default function AdminReservas() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todas')

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
    carregarReservas()
  }, [])

  const carregarReservas = async () => {
    setCarregando(true)
    try {
      const { data: reservasData, error } = await supabase
        .from('reservas')
        .select(`
          id,
          cliente_id,
          roteiro_id,
          data_trilha,
          quantidade_pessoas,
          valor_total,
          status,
          pagamento_status,
          created_at
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const reservasCompletas = await Promise.all(
        (reservasData || []).map(async (reserva) => {
          const { data: cliente } = await supabase
            .from('users')
            .select('nome, email')
            .eq('id', reserva.cliente_id)
            .single()

          const { data: roteiro } = await supabase
            .from('roteiros')
            .select('titulo, km')
            .eq('id', reserva.roteiro_id)
            .single()

          return {
            ...reserva,
            cliente_nome: cliente?.nome || 'Cliente',
            cliente_email: cliente?.email || '',
            roteiro_titulo: roteiro?.titulo || 'Roteiro',
            roteiro_km: roteiro?.km || 0
          }
        })
      )

      setReservas(reservasCompletas)
    } catch (err) {
      console.error('Erro ao carregar reservas:', err)
    } finally {
      setCarregando(false)
    }
  }

  const atualizarStatus = async (reservaId: string, novoStatus: string) => {
    const { error } = await supabase
      .from('reservas')
      .update({ status: novoStatus })
      .eq('id', reservaId)

    if (!error) {
      setReservas((prev) =>
        prev.map((r) =>
          r.id === reservaId ? { ...r, status: novoStatus } : r
        )
      )
    } else {
      alert('Erro ao atualizar reserva')
    }
  }

  const reservasPendentes = useMemo(
    () => reservas.filter((r) => r.status === 'pendente'),
    [reservas]
  )

  const reservasConfirmadas = useMemo(
    () => reservas.filter((r) => r.status === 'confirmada'),
    [reservas]
  )

  const reservasRealizadas = useMemo(
    () => reservas.filter((r) => r.status === 'realizada'),
    [reservas]
  )

  const reservasCanceladas = useMemo(
    () => reservas.filter((r) => r.status === 'cancelada'),
    [reservas]
  )

  const reservasFiltradas = useMemo(() => {
    let lista = reservas
    if (filtroStatus !== 'todas') {
      lista = lista.filter((r) => r.status === filtroStatus)
    }
    if (busca) {
      lista = lista.filter(
        (r) =>
          r.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) ||
          r.cliente_email?.toLowerCase().includes(busca.toLowerCase()) ||
          r.roteiro_titulo?.toLowerCase().includes(busca.toLowerCase())
      )
    }
    return lista
  }, [reservas, busca, filtroStatus])

  const getStatusCor = (status: string) => {
    switch (status) {
      case 'pendente':
        return { bg: '#fffbeb', border: '#fde68a', badge: '#f59e0b', text: '#d97706', label: 'PENDENTE' }
      case 'confirmada':
        return { bg: '#f0fdf4', border: '#bbf7d0', badge: '#16a34a', text: '#166534', label: 'CONFIRMADA' }
      case 'realizada':
        return { bg: '#eff6ff', border: '#bfdbfe', badge: '#3b82f6', text: '#1e40af', label: 'REALIZADA' }
      case 'cancelada':
        return { bg: '#fef2f2', border: '#fecaca', badge: '#dc2626', text: '#991b1b', label: 'CANCELADA' }
      default:
        return { bg: '#f3f4f6', border: '#e5e7eb', badge: '#6b7280', text: '#374151', label: status.toUpperCase() }
    }
  }

  const estatisticas = {
    total: reservas.length,
    pendentes: reservasPendentes.length,
    confirmadas: reservasConfirmadas.length,
    realizadas: reservasRealizadas.length,
    canceladas: reservasCanceladas.length,
    valorTotal: reservas.reduce((acc, r) => acc + (r.valor_total || 0), 0)
  }

  // Funções de navegação para cada status
  const navegarParaStatus = (status: string) => {
    if (status === 'pendente') {
      router.push('/admin/reservas/pendentes')
    } else if (status === 'confirmada') {
      router.push('/admin/reservas/confirmadas')
    } else if (status === 'realizada') {
      router.push('/admin/reservas/realizadas')
    } else if (status === 'cancelada') {
      router.push('/admin/reservas/canceladas')
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
              📋 Reservas
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
              Painel inteligente de gerenciamento
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => router.push('/admin/dashboard')}
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
              ← Voltar ao Dashboard
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px'
          }}
        >
          {/* Card Pendentes */}
          <div
            onClick={() => navegarParaStatus('pendente')}
            style={{
              backgroundColor: '#fffbeb',
              borderRadius: '24px',
              padding: '20px',
              border: '1px solid #fde68a',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>🟡</div>
                <div style={{ fontSize: '30px', fontWeight: '800', color: '#f59e0b', lineHeight: 1 }}>
                  {estatisticas.pendentes}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px' }}>Pendentes</div>
              </div>
              <div style={{ fontSize: '18px', color: '#f59e0b' }}>→</div>
            </div>
          </div>

          {/* Card Confirmadas */}
          <div
            onClick={() => navegarParaStatus('confirmada')}
            style={{
              backgroundColor: '#f0fdf4',
              borderRadius: '24px',
              padding: '20px',
              border: '1px solid #bbf7d0',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>🟢</div>
                <div style={{ fontSize: '30px', fontWeight: '800', color: '#16a34a', lineHeight: 1 }}>
                  {estatisticas.confirmadas}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px' }}>Confirmadas</div>
              </div>
              <div style={{ fontSize: '18px', color: '#16a34a' }}>→</div>
            </div>
          </div>

          {/* Card Realizadas */}
          <div
            onClick={() => navegarParaStatus('realizada')}
            style={{
              backgroundColor: '#eff6ff',
              borderRadius: '24px',
              padding: '20px',
              border: '1px solid #bfdbfe',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>🔵</div>
                <div style={{ fontSize: '30px', fontWeight: '800', color: '#3b82f6', lineHeight: 1 }}>
                  {estatisticas.realizadas}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px' }}>Realizadas</div>
              </div>
              <div style={{ fontSize: '18px', color: '#3b82f6' }}>→</div>
            </div>
          </div>

          {/* Card Canceladas */}
          <div
            onClick={() => navegarParaStatus('cancelada')}
            style={{
              backgroundColor: '#fef2f2',
              borderRadius: '24px',
              padding: '20px',
              border: '1px solid #fecaca',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>🔴</div>
                <div style={{ fontSize: '30px', fontWeight: '800', color: '#dc2626', lineHeight: 1 }}>
                  {estatisticas.canceladas}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px' }}>Canceladas</div>
              </div>
              <div style={{ fontSize: '18px', color: '#dc2626' }}>→</div>
            </div>
          </div>

          {/* Card Total (opcional - vai para página principal de reservas) */}
          <div
            onClick={() => router.push('/admin/reservas')}
            style={{
              backgroundColor: '#f3f4f6',
              borderRadius: '24px',
              padding: '20px',
              border: '1px solid #e5e7eb',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>📊</div>
                <div style={{ fontSize: '30px', fontWeight: '800', color: '#6b7280', lineHeight: 1 }}>
                  {estatisticas.total}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px' }}>Total Reservas</div>
              </div>
              <div style={{ fontSize: '18px', color: '#6b7280' }}>→</div>
            </div>
          </div>

          {/* Card Valor Total (apenas visual, não clicável) */}
          <div
            style={{
              backgroundColor: '#f0fdf4',
              borderRadius: '24px',
              padding: '20px',
              border: '1px solid #bbf7d0'
            }}
          >
            <div>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>💰</div>
              <div style={{ fontSize: '30px', fontWeight: '800', color: '#16a34a', lineHeight: 1 }}>
                R$ {estatisticas.valorTotal.toFixed(2)}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px' }}>Valor Total</div>
            </div>
          </div>
        </div>

        {/* FILTROS E BUSCA */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            alignItems: 'center'
          }}
        >
          <div style={{ flex: 2, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="🔍 Buscar por cliente ou roteiro..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '40px',
                border: '1px solid #e5e7eb',
                fontSize: '14px',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#16a34a'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          <div style={{ minWidth: '150px' }}>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '40px',
                border: '1px solid #e5e7eb',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="todas">Todas</option>
              <option value="pendente">Pendentes</option>
              <option value="confirmada">Confirmadas</option>
              <option value="realizada">Realizadas</option>
              <option value="cancelada">Canceladas</option>
            </select>
          </div>
          {(busca || filtroStatus !== 'todas') && (
            <button
              onClick={() => { setBusca(''); setFiltroStatus('todas') }}
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

        {/* LISTA DE RESERVAS */}
        {carregando ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center', color: '#6b7280' }}>
            Carregando reservas...
          </div>
        ) : reservasFiltradas.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
            <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>Nenhuma reserva encontrada</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              {busca || filtroStatus !== 'todas' ? 'Nenhuma reserva encontrada com estes filtros.' : 'As reservas aparecerão aqui quando forem criadas.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reservasFiltradas.map((reserva) => {
              const statusInfo = getStatusCor(reserva.status)
              const isPendente = reserva.status === 'pendente'
              const isConfirmada = reserva.status === 'confirmada'
              
              return (
                <div
                  key={reserva.id}
                  style={{
                    backgroundColor: statusInfo.bg,
                    border: `1px solid ${statusInfo.border}`,
                    borderRadius: '20px',
                    padding: '20px',
                    transition: 'all 0.2s ease',
                    borderLeft: `6px solid ${statusInfo.badge}`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    {/* LADO ESQUERDO */}
                    <div style={{ flex: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#111827' }}>{reserva.cliente_nome}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>{reserva.cliente_email}</div>
                        </div>
                        <div style={{ backgroundColor: statusInfo.badge, color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                          {statusInfo.label}
                        </div>
                      </div>

                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>🏔️ {reserva.roteiro_titulo}</span>
                        {reserva.roteiro_km ? <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>• {reserva.roteiro_km} KM</span> : null}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: '#6b7280' }}>
                        <span>📅 {new Date(reserva.data_trilha).toLocaleDateString('pt-BR')}</span>
                        <span>👥 {reserva.quantidade_pessoas} pessoa(s)</span>
                        {reserva.valor_total && <span>💰 R$ {reserva.valor_total}</span>}
                        <span>📆 Criado: {new Date(reserva.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>

                      {reserva.pagamento_status && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#4b5563' }}>
                          💳 Pagamento: {reserva.pagamento_status}
                        </div>
                      )}
                    </div>

                    {/* LADO DIREITO - AÇÕES */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {isPendente && (
                        <>
                          <button
                            onClick={() => atualizarStatus(reserva.id, 'confirmada')}
                            style={{
                              backgroundColor: '#16a34a',
                              color: 'white',
                              border: 'none',
                              borderRadius: '40px',
                              padding: '10px 20px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '600',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                          >
                            ✅ Confirmar
                          </button>
                          <button
                            onClick={() => atualizarStatus(reserva.id, 'cancelada')}
                            style={{
                              backgroundColor: '#dc2626',
                              color: 'white',
                              border: 'none',
                              borderRadius: '40px',
                              padding: '10px 20px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '600',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                          >
                            ❌ Cancelar
                          </button>
                        </>
                      )}
                      {isConfirmada && (
                        <button
                          onClick={() => atualizarStatus(reserva.id, 'realizada')}
                          style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '40px',
                            padding: '10px 20px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                        >
                          🏁 Marcar Realizada
                        </button>
                      )}
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