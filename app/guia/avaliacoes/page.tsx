'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function MinhasAvaliacoes() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [avaliacoes, setAvaliacoes] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }
    const parsed = JSON.parse(userData)
    if (parsed.tipo !== 'guia') {
      router.push('/login')
      return
    }
    setUser(parsed)
    carregarAvaliacoes(parsed.id)
  }, [])

  const carregarAvaliacoes = async (guiaId: string) => {
    const { data, error } = await supabase
      .from('avaliacoes')
      .select(`
        *,
        cliente:cliente_id (id, nome, avatar_url)
      `)
      .eq('guia_id', guiaId)
      .in('status_moderacao', ['aprovada', 'pendente', 'aguardando_admin'])
      .order('created_at', { ascending: false })

    if (!error && data) {
      setAvaliacoes(data)
    }
    setCarregando(false)
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aprovada': return 'Aprovada'
      case 'pendente': return 'Aguardando sua resposta'
      case 'aguardando_admin': return 'Em moderação'
      default: return status
    }
  }

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Carregando...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '32px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>⭐ Minhas Avaliações</h1>
          <button
            onClick={() => router.push('/guia/dashboard')}
            style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
          >
            ← Dashboard
          </button>
        </div>

        {avaliacoes.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
            <p>Você ainda não recebeu nenhuma avaliação.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {avaliacoes.map((a) => (
              <div key={a.id} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                {/* Cabeçalho com avatar clicável */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div
                    onClick={() => router.push(`/cliente/publico/${a.cliente.id}`)}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: '#16a34a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {a.cliente?.avatar_url ? (
                      <img src={a.cliente.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>
                        {a.cliente?.nome?.charAt(0).toUpperCase() || 'C'}
                      </span>
                    )}
                  </div>
                  <div>
                    <p
                      onClick={() => router.push(`/cliente/publico/${a.cliente.id}`)}
                      style={{ fontWeight: 'bold', margin: 0, cursor: 'pointer', color: '#16a34a', textDecoration: 'underline' }}
                    >
                      {a.cliente?.nome || 'Cliente'}
                    </p>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                      {new Date(a.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                {/* Nota e comentário */}
                <p><strong>Nota:</strong> {'🏔️'.repeat(a.nota)}</p>
                <p><strong>Comentário:</strong> {a.comentario}</p>

                {/* Resposta do guia (se existir) */}
                {a.resposta_guia && (
                  <div style={{ backgroundColor: '#f9fafb', padding: '8px', borderRadius: '8px', marginTop: '8px' }}>
                    <p><strong>Sua resposta:</strong> {a.resposta_guia}</p>
                  </div>
                )}

                {/* Status e botão (apenas se pendente) */}
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    backgroundColor: a.status_moderacao === 'aprovada' ? '#dcfce7' : '#fef3c7',
                    color: a.status_moderacao === 'aprovada' ? '#16a34a' : '#d97706'
                  }}>
                    {getStatusText(a.status_moderacao)}
                  </span>
                  {a.status_moderacao === 'pendente' && !a.resposta_guia && (
                    <button
                      onClick={() => router.push(`/guia/contra-resposta/${a.id}`)}
                      style={{ backgroundColor: '#16a34a', color: 'white', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                    >
                      Responder
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}