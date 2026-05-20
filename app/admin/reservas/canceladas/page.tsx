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

export default function AdminReservasCanceladas() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [periodo, setPeriodo] = useState('todos')

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
        .eq('status', 'cancelada')
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
      console.error('Erro ao carregar reservas canceladas:', err)
    } finally {
      setCarregando(false)
    }
  }

  const reservasFiltradas = reservas.filter((reserva) => {
    // Filtro de busca
    const matchBusca =
      reserva.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) ||
      reserva.cliente_email?.toLowerCase().includes(busca.toLowerCase()) ||
      reserva.roteiro_titulo?.toLowerCase().includes(busca.toLowerCase())

    // Filtro de período
    let matchPeriodo = true
    if (periodo !== 'todos') {
      const dataReserva = new Date(reserva.created_at)
      const hoje = new Date()
      const dias = parseInt(periodo)
      const dataLimite = new Date()
      dataLimite.setDate(hoje.getDate() - dias)
      matchPeriodo = dataReserva >= dataLimite
    }

    return matchBusca && matchPeriodo
  })

  const estatisticas = {
    total: reservas.length,
    valorTotal: reservas.reduce((acc, r) => acc + (r.valor_total || 0), 0),
    totalPessoas: reservas.reduce((acc, r) => acc + r.quantidade_pessoas, 0),
    totalKm: reservas.reduce((acc, r) => acc + (r.roteiro_km || 0), 0)
  }

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR')
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
            <h1 style={{ margin: 0, fontSize: '24px', color: '#dc2626', fontWeight: 'bold' }}>
              🔴 Reservas Canceladas
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
              Histórico de cancelamentos
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px'
          }}
        >
          <div style={{ backgroundColor: '#fef2f2', borderRadius: '20px', padding: '16px', textAlign: 'center', border: '1px solid #fecaca' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔴</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626' }}>{estatisticas.total}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Canceladas</div>
          </div>
          <div style={{ backgroundColor: '#fef2f2', borderRadius: '20px', padding: '16px', textAlign: 'center', border: '1px solid #fecaca' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>💰</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626' }}>R$ {estatisticas.valorTotal.toFixed(2)}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Valor Cancelado</div>
          </div>
          <div style={{ backgroundColor: '#fef2f2', borderRadius: '20px', padding: '16px', textAlign: 'center', border: '1px solid #fecaca' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>👥</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626' }}>{estatisticas.totalPessoas}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Pessoas Afetadas</div>
          </div>
          <div style={{ backgroundColor: '#fef2f2', borderRadius: '20px', padding: '16px', textAlign: 'center', border: '1px solid #fecaca' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🥾</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626' }}>{estatisticas.totalKm}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>KM Cancelados</div>
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
              onFocus={(e) => e.target.style.borderColor = '#dc2626'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          <div style={{ minWidth: '150px' }}>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
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
              <option value="todos">Todos os períodos</option>
              <option value="7">Últimos 7 dias</option>
              <option value="15">Últimos 15 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>
          </div>
          {(busca || periodo !== 'todos') && (
            <button
              onClick={() => { setBusca(''); setPeriodo('todos') }}
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

        {/* LISTA DE RESERVAS CANCELADAS */}
        {carregando ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center', color: '#6b7280' }}>
            Carregando histórico de cancelamentos...
          </div>
        ) : reservasFiltradas.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>Nenhum cancelamento registrado</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              {busca || periodo !== 'todos' ? 'Nenhum cancelamento encontrado com estes filtros.' : 'Os cancelamentos aparecerão aqui quando ocorrerem.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reservasFiltradas.map((reserva) => (
              <div
                key={reserva.id}
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '20px',
                  padding: '20px',
                  transition: 'all 0.2s ease',
                  borderLeft: `6px solid #dc2626`
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
                      <div style={{ backgroundColor: '#dc2626', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                        CANCELADA
                      </div>
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>🏔️ {reserva.roteiro_titulo}</span>
                      {reserva.roteiro_km ? <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>• {reserva.roteiro_km} KM</span> : null}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                      <span>📅 {formatarData(reserva.data_trilha)}</span>
                      <span>👥 {reserva.quantidade_pessoas} pessoa(s)</span>
                      {reserva.valor_total && <span>💰 R$ {reserva.valor_total}</span>}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '11px', color: '#9ca3af' }}>
                      <span>📆 Criado: {formatarData(reserva.created_at)}</span>
                      {reserva.pagamento_status && <span>💳 Pagamento: {reserva.pagamento_status}</span>}
                    </div>
                  </div>

                  {/* LADO DIREITO - BADGE */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ backgroundColor: '#fee2e2', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', color: '#991b1b' }}>
                      ❌ Cancelada
                    </div>
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