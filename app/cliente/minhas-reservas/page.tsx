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
  }, [router])

  const carregarReservas = async (clienteId: string) => {
    const { data, error } = await supabase
      .from('reservas')
      .select(`
        *,
        roteiro:roteiro_id (id, titulo, foto_capa, localizacao, id_guia),
        guia:roteiro_id (id_guia)
      `)
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const reservasCompleto = await Promise.all(
        data.map(async (reserva) => {
          const guiaId = reserva.roteiro?.id_guia
          let guiaNome = 'Guia'
          if (guiaId) {
            const { data: guiaData } = await supabase
              .from('users')
              .select('nome')
              .eq('id', guiaId)
              .single()
            if (guiaData) guiaNome = guiaData.nome
          }

          const { data: avaliacaoExistente } = await supabase
            .from('avaliacoes')
            .select('id')
            .eq('reserva_id', reserva.id)
            .maybeSingle()

          return {
            ...reserva,
            guia_nome: guiaNome,
            jaAvaliado: !!avaliacaoExistente
          }
        })
      )
      setReservas(reservasCompleto)
    }
    setCarregando(false)
  }

  const getStatusBadge = (status: string, clienteConfirmou: boolean, guiaConfirmou: boolean, jaAvaliado: boolean) => {
    if (jaAvaliado) {
      return { text: '✅ Concluída', bg: '#dcfce7', color: '#16a34a' }
    }
    
    if (status === 'realizada') return { text: '✓ Realizada', bg: '#e0e7ff', color: '#4f46e5' }
    if (status === 'confirmada') {
      if (clienteConfirmou && guiaConfirmou) return { text: '⏳ Aguardando sua avaliação', bg: '#fef3c7', color: '#d97706' }
      if (clienteConfirmou) return { text: '⏳ Aguardando confirmação do guia', bg: '#fef3c7', color: '#d97706' }
      if (guiaConfirmou) return { text: '⏳ Aguardando sua confirmação', bg: '#fef3c7', color: '#d97706' }
      return { text: '✓ Confirmada', bg: '#dcfce7', color: '#16a34a' }
    }
    if (status === 'pendente') return { text: '⏳ Pendente', bg: '#fef3c7', color: '#d97706' }
    if (status === 'cancelada') return { text: '✗ Cancelada', bg: '#fee2e2', color: '#dc2626' }
    return { text: status, bg: '#f3f4f6', color: '#6b7280' }
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
          <div style={{ color: '#6b7280' }}>Carregando suas reservas...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* CABEÇALHO */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>🏔️ PrussikTrails</h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>Minhas Reservas</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={() => router.push('/cliente/dashboard')} style={{ backgroundColor: '#f3f4f6', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', color: '#374151', fontWeight: '600', fontSize: '13px' }}>← Voltar</button>
            <button onClick={() => router.push('/cliente/perfil')} style={{ backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Perfil</button>
            <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Sair</button>
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', margin: 0 }}>📋 Minhas Reservas</h2>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '6px' }}>Acompanhe suas aventuras</p>
        </div>

        {reservas.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>Você ainda não fez nenhuma reserva</div>
            <div style={{ color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>Explore nossos roteiros e comece sua aventura!</div>
            <button onClick={() => router.push('/cliente/roteiros')} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '12px 28px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>Explorar roteiros →</button>
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Roteiro</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Guia</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Data</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Pessoas</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Valor</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Status</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {reservas.map((reserva) => {
                    const statusBadge = getStatusBadge(reserva.status, reserva.cliente_confirmou, reserva.guia_confirmou, reserva.jaAvaliado)
                    return (
                      <tr key={reserva.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>{reserva.roteiro?.titulo || '-'}</td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280' }}>{reserva.guia_nome}</td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280' }}>
                          {reserva.data_trilha ? new Date(reserva.data_trilha).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>{reserva.quantidade_pessoas}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>R$ {reserva.valor_total}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: '600',
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.color
                          }}>
                            {statusBadge.text}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          {reserva.status === 'confirmada' && !reserva.jaAvaliado && (
                            <button
                              onClick={() => router.push(`/cliente/avaliar/${reserva.id}`)}
                              style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '30px', padding: '6px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                            >
                              ⭐ Avaliar
                            </button>
                          )}
                          {reserva.jaAvaliado && (
                            <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '500' }}>✓ Avaliado</span>
                          )}
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