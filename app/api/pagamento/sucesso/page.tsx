'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function PagamentoSucesso() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/cliente/minhas-reservas')
    }, 5000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '48px', textAlign: 'center', maxWidth: '500px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a', marginBottom: '8px' }}>
          Pagamento Confirmado!
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          Seu pagamento foi processado com sucesso. O guia será notificado para confirmar sua reserva.
        </p>
        <button
          onClick={() => router.push('/cliente/minhas-reservas')}
          style={{
            backgroundColor: '#16a34a',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '40px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Ver minhas reservas
        </button>
      </div>
    </div>
  )
}