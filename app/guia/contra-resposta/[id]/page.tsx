'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function ContraResposta() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [avaliacao, setAvaliacao] = useState<any>(null)
  const [resposta, setResposta] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      const { data, error } = await supabase
        .from('avaliacoes')
        .select('*, cliente:cliente_id(id, nome, avatar_url)')
        .eq('id', id)
        .single()

      if (error) {
        setErro('Avaliação não encontrada')
        setCarregando(false)
        return
      }
      setAvaliacao(data)
      setCarregando(false)
    }
    carregar()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resposta.trim()) {
      setErro('A resposta é obrigatória')
      return
    }

    setEnviando(true)
    setErro('')

    const { error } = await supabase
  .from('avaliacoes')
  .update({
    resposta_guia: resposta,
    status_moderacao: 'aguardando_admin'
  })
  .eq('id', id);

    if (error) {
      console.error(error)
      setErro('Erro ao enviar resposta. Tente novamente.')
      setEnviando(false)
      return
    }

    router.push('/guia/avaliacoes-pendentes')
  }

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Carregando...</p>
      </div>
    )
  }

  if (!avaliacao) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>{erro || 'Avaliação não encontrada'}</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '32px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Responder avaliação</h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            {avaliacao.cliente?.avatar_url ? (
              <img src={avaliacao.cliente.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: 'white', fontSize: '20px' }}>{avaliacao.cliente?.nome?.charAt(0).toUpperCase() || 'C'}</span>
            )}
          </div>
          <div>
            <p style={{ fontWeight: 'bold', margin: 0 }}>{avaliacao.cliente?.nome}</p>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{new Date(avaliacao.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Comentário do cliente:</p>
          <p>{avaliacao.comentario}</p>
          <p style={{ marginTop: '8px' }}>Nota: {'🏔️'.repeat(avaliacao.nota)}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Sua resposta *</label>
          <textarea
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            rows={5}
            placeholder="Escreva sua resposta para o cliente..."
            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '14px', resize: 'vertical' }}
            required
          />

          {erro && <p style={{ color: '#dc2626', marginTop: '8px' }}>{erro}</p>}

          <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
            <button
              type="submit"
              disabled={enviando}
              style={{ backgroundColor: '#16a34a', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
            >
              {enviando ? 'Enviando...' : 'Enviar resposta'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/guia/avaliacoes-pendentes')}
              style={{ backgroundColor: '#e5e7eb', color: '#374151', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}