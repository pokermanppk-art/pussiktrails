'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function GuiaRoteirosAguardando() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [roteiros, setRoteiros] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }
    const parsedUser = JSON.parse(userData)
    if (parsedUser.tipo !== 'guia') {
      router.push('/login')
      return
    }
    setUser(parsedUser)
    carregarRoteiros(parsedUser.id)
  }, [])

  const carregarRoteiros = async (guiaId: string) => {
    try {
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .eq('id_guia', guiaId)
        .eq('status', 'aguardando')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRoteiros(data || [])
    } catch (err) {
      console.error('Erro ao carregar roteiros:', err)
    } finally {
      setCarregando(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>🏔️ PrussikTrails</h1>
          <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }}>Sair</button>
        </div>
      </div>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>⏳ Roteiros Aguardando Aprovação</h2>
        {carregando ? (
          <p>Carregando...</p>
        ) : roteiros.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '16px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <p>Nenhum roteiro aguardando aprovação.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {roteiros.map((roteiro) => (
              <div key={roteiro.id} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>{roteiro.titulo}</h3>
                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>{roteiro.localizacao}</p>
                <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: '#fef3c7', color: '#d97706' }}>⏳ Aguardando</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}