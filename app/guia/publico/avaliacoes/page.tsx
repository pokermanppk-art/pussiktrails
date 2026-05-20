'use client'

import { useParams, useRouter } from 'next/navigation'

export default function AvaliacoesGuia() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '32px' }}>
      <button onClick={() => router.back()} style={{ marginBottom: '16px', backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>← Voltar</button>
      <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
        <h2>Avaliações do Guia</h2>
        <p>Em breve, você poderá ver todas as avaliações feitas por clientes (moderadas pelo administrador).</p>
      </div>
    </div>
  )
}