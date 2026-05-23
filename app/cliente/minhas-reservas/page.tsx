'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function MinhasReservas() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [reservas, setReservas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

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
    carregarReservas(parsedUser.id)
  }, [])

  const carregarReservas = async (clienteId: string) => {
    setCarregando(true)
    try {
      // Buscar reservas
      const { data: reservasData, error: reservasError } = await supabase
        .from('reservas')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })

      if (reservasError) throw reservasError

      if (!reservasData || reservasData.length === 0) {
        setReservas([])
        setCarregando(false)
        return
      }

      // Buscar roteiros relacionados
      const roteiroIds = [...new Set(reservasData.map(r => r.roteiro_id).filter(Boolean))]
      let roteirosMap: Record<string, any> = {}
      
      if (roteiroIds.length > 0) {
        const { data: roteirosData } = await supabase
          .from('roteiros')
          .select('id, titulo, preco, id_guia')
          .in('id', roteiroIds)
        
        if (roteirosData) {
          roteirosMap = roteirosData.reduce((acc, roteiro) => {
            acc[roteiro.id] = roteiro
            return acc
          }, {} as Record<string, any>)
        }
      }

      // Buscar nomes dos guias
      const guiaIds = [...new Set(Object.values(roteirosMap).map((r: any) => r?.id_guia).filter(Boolean))]
      let guiasMap: Record<string, string> = {}
      
      if (guiaIds.length > 0) {
        const { data: guiasData } = await supabase
          .from('users')
          .select('id, nome')
          .in('id', guiaIds)
        
        if (guiasData) {
          guiasMap = guiasData.reduce((acc, guia) => {
            acc[guia.id] = guia.nome
            return acc
          }, {} as Record<string, string>)
        }
      }

      // Montar reservas completas
      const reservasCompletas = reservasData.map((reserva) => {
        const roteiro = roteirosMap[reserva.roteiro_id]
        const guiaNome = roteiro?.id_guia ? (guiasMap[roteiro.id_guia] || 'Guia') : 'Guia'
        
        return {
          ...reserva,
          roteiro: roteiro || null,
          guia_nome: guiaNome,
          roteiro_titulo: roteiro?.titulo || 'Roteiro não encontrado',
          valor_total: reserva.valor_total || (roteiro?.preco * reserva.quantidade_pessoas) || 0
        }
      })

      setReservas(reservasCompletas)
    } catch (err) {
      console.error('Erro ao carregar reservas:', err)
      setReservas([])
    } finally {
      setCarregando(false)
    }
  }

  const cancelarReserva = async (reservaId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta reserva?')) return
    
    const { error } = await supabase
      .from('reservas')
      .update({ status: 'cancelada' })
      .eq('id', reservaId)
    
    if (!error && user) {
      carregarReservas(user.id)
    }
  }

  const getStatusBadge = (status: string, pagamentoStatus: string) => {
    if (status === 'realizada') return { text: '✓ Realizada', bg: '#e0e7ff', color: '#4f46e5' }
    if (status === 'confirmada') return { text: '✓ Confirmada', bg: '#dcfce7', color: '#16a34a' }
    if (status === 'cancelada') return { text: '✗ Cancelada', bg: '#fee2e2', color: '#dc2626' }
    if (pagamentoStatus === 'pago') return { text: '⏳ Aguardando confirmação', bg: '#fef3c7', color: '#d97706' }
    return { text: '⏳ Aguardando pagamento', bg: '#fef3c7', color: '#d97706' }
  }

  const getPagamentoBadge = (pagamentoStatus: string) => {
    return pagamentoStatus === 'pago'
      ? { text: '✅ Pago', bg: '#dcfce7', color: '#16a34a' }
      : { text: '⏳ Pendente', bg: '#fef3c7', color: '#d97706' }
  }

  const handlePagar = (reservaId: string) => {
    router.push(`/cliente/pagamento/${reservaId}`)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#6b7280' }}>Carregando suas reservas...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* CABEÇALHO */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>PussikTrails</h1>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#6b7280' }}>Minhas Reservas</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => router.push('/cliente/dashboard')} style={{ backgroundColor: '#f3f4f6', border: 'none', borderRadius: '40px', padding: '6px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>← Voltar</button>
            <button onClick={() => router.push('/cliente/perfil')} style={{ backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '40px', padding: '6px 16px', cursor: 'pointer', fontSize: '12px' }}>Perfil</button>
            <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '40px', padding: '6px 16px', cursor: 'pointer', fontSize: '12px' }}>Sair</button>
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#111827', margin: 0 }}>📋 Minhas Reservas</h2>
          <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>Acompanhe suas aventuras</p>
        </div>

        {reservas.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '48px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
            <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>Você ainda não fez nenhuma reserva</div>
            <div style={{ color: '#6b7280', marginBottom: '20px', fontSize: '13px' }}>Explore nossos roteiros e comece sua aventura!</div>
            <button onClick={() => router.push('/cliente/roteiros')} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '10px 24px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Explorar roteiros →</button>
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#6b7280' }}>Roteiro</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#6b7280' }}>Guia</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#6b7280' }}>Data</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '12px', color: '#6b7280' }}>Pessoas</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '12px', color: '#6b7280' }}>Valor</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '12px', color: '#6b7280' }}>Pagamento</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#6b7280' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '12px', color: '#6b7280' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {reservas.map((reserva) => {
                    const statusBadge = getStatusBadge(reserva.status, reserva.pagamento_status)
                    const pagamentoBadge = getPagamentoBadge(reserva.pagamento_status)
                    const precisaPagar = reserva.status === 'pendente' && reserva.pagamento_status !== 'pago'
                    const podeCancelar = reserva.status === 'pendente' || reserva.status === 'confirmada'
                    
                    return (
                      <tr key={reserva.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px', fontSize: '13px', fontWeight: '500', color: '#111827' }}>{reserva.roteiro_titulo}</td>
                        <td style={{ padding: '12px', fontSize: '12px', color: '#6b7280' }}>{reserva.guia_nome}</td>
                        <td style={{ padding: '12px', fontSize: '12px', color: '#6b7280' }}>
                          {reserva.data_trilha ? new Date(reserva.data_trilha).toLocaleDateString('pt-BR') : 'A definir'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>{reserva.quantidade_pessoas || 1}</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#16a34a' }}>
                          R$ {(reserva.valor_total || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            backgroundColor: pagamentoBadge.bg,
                            color: pagamentoBadge.color
                          }}>
                            {pagamentoBadge.text}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.color
                          }}>
                            {statusBadge.text}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {precisaPagar && (
                              <button
                                onClick={() => handlePagar(reserva.id)}
                                style={{
                                  backgroundColor: '#16a34a',
                                  color: 'white',
                                  padding: '5px 12px',
                                  borderRadius: '20px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '10px',
                                  fontWeight: 'bold'
                                }}
                              >
                                💳 Pagar
                              </button>
                            )}
                            {podeCancelar && (
                              <button
                                onClick={() => cancelarReserva(reserva.id)}
                                style={{
                                  backgroundColor: '#dc2626',
                                  color: 'white',
                                  padding: '5px 12px',
                                  borderRadius: '20px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '10px'
                                }}
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}