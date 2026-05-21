'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function AdminComprovantes() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [reservas, setReservas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) { router.push('/login'); return }
    const parsedUser = JSON.parse(userData)
    if (parsedUser.tipo !== 'admin') { router.push('/login'); return }
    setUser(parsedUser)
    carregarComprovantes()
  }, [])

  const carregarComprovantes = async () => {
    const { data } = await supabase
      .from('reservas')
      .select(`
        *,
        cliente:cliente_id(id, nome, email),
        roteiro:roteiro_id(id, titulo)
      `)
      .eq('comprovante_status', 'enviado')
      .order('comprovante_enviado_em', { ascending: false })

    setReservas(data || [])
    setCarregando(false)
  }

  const aprovarComprovante = async (reservaId: string) => {
    await supabase
      .from('reservas')
      .update({
        comprovante_status: 'aprovado',
        pagamento_status: 'pago',
        status: 'confirmada'
      })
      .eq('id', reservaId)
    
    carregarComprovantes()
  }

  const reprovarComprovante = async (reservaId: string) => {
    await supabase
      .from('reservas')
      .update({
        comprovante_status: 'reprovado'
      })
      .eq('id', reservaId)
    
    carregarComprovantes()
  }

  if (!user) return <div>Carregando...</div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '16px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>📎 Comprovantes Pendentes</h1>
          <button onClick={() => router.push('/admin/dashboard')} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '40px', cursor: 'pointer' }}>← Dashboard</button>
        </div>

        {carregando ? (
          <p>Carregando...</p>
        ) : reservas.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <p>Nenhum comprovante pendente</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reservas.map((reserva) => (
              <div key={reserva.id} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, marginBottom: '4px' }}>{reserva.roteiro?.titulo}</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Cliente: {reserva.cliente?.nome || reserva.cliente?.email}</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Valor: R$ {reserva.valor_total?.toFixed(2)}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>Enviado em: {new Date(reserva.comprovante_enviado_em).toLocaleString('pt-BR')}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <a href={reserva.comprovante_url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#3b82f6', color: 'white', padding: '8px 16px', borderRadius: '40px', textDecoration: 'none', fontSize: '13px' }}>Ver comprovante</a>
                    <button onClick={() => aprovarComprovante(reserva.id)} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '40px', cursor: 'pointer' }}>Aprovar</button>
                    <button onClick={() => reprovarComprovante(reserva.id)} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '40px', cursor: 'pointer' }}>Reprovar</button>
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