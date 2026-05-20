'use client'

import { useEffect, useState } from 'react'
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

export default function AdminReservasConfirmadas() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')

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
        .eq('status', 'confirmada')
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
      console.error('Erro ao carregar reservas confirmadas:', err)
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
      setReservas((prev) => prev.filter((r) => r.id !== reservaId))
      alert(`Reserva marcada como ${novoStatus === 'realizada' ? 'realizada' : 'cancelada'} com sucesso!`)
    } else {
      alert('Erro ao atualizar reserva')
    }
  }

  const reservasFiltradas = reservas.filter(
    (reserva) =>
      reserva.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) ||
      reserva.cliente_email?.toLowerCase().includes(busca.toLowerCase()) ||
      reserva.roteiro_titulo?.toLowerCase().includes(busca.toLowerCase())
  )

  const estatisticas = {
    total: reservas.length,
    valorTotal: reservas.reduce((acc, r) => acc + (r.valor_total || 0), 0)
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
              🟢 Reservas Confirmadas
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
              Reservas aprovadas aguardando realização
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => router.push('/admin/reservas')}
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
        {/* STATS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}
        >
          <div style={{ backgroundColor: '#f0fdf4', borderRadius: '20px', padding: '16px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🟢</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a' }}>{estatisticas.total}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Confirmadas</div>
          </div>
          <div style={{ backgroundColor: '#eff6ff', borderRadius: '20px', padding: '16px', textAlign: 'center', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>💰</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>R$ {estatisticas.valorTotal.toFixed(2)}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Valor Total</div>
          </div>
        </div>

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
                placeholder="🔍 Buscar por cliente ou roteiro..."
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

        {/* LISTA DE RESERVAS CONFIRMADAS */}
        {carregando ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center', color: '#6b7280' }}>
            Carregando reservas confirmadas...
          </div>
        ) : reservasFiltradas.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
            <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>Nenhuma reserva confirmada</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              {busca ? 'Nenhuma reserva encontrada com esta busca.' : 'As reservas confirmadas aparecerão aqui.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reservasFiltradas.map((reserva) => (
              <div
                key={reserva.id}
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '20px',
                  padding: '20px',
                  transition: 'all 0.2s ease',
                  borderLeft: `6px solid #16a34a`
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
                      <div style={{ backgroundColor: '#16a34a', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                        CONFIRMADA
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}