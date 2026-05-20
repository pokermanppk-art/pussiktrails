'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function GuiaAvaliarCliente() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [reserva, setReserva] = useState<any>(null)
  const [cliente, setCliente] = useState<any>(null)
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }

    const carregarDados = async () => {
      const { data: reservaData } = await supabase
        .from('reservas')
        .select('*, cliente:cliente_id(*)')
        .eq('id', id)
        .single()

      if (reservaData) {
        setReserva(reservaData)
        setCliente(reservaData.cliente)
      }
    }

    carregarDados()
  }, [id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nota === 0) {
      setMensagem('Selecione uma nota de 1 a 5 montanhas')
      return
    }

    setEnviando(true)
    setMensagem('')

    const { error } = await supabase
      .from('reservas')
      .update({
        avaliacao_guia_nota: nota,
        avaliacao_guia_comentario: comentario
      })
      .eq('id', id)

    if (error) {
      setMensagem('Erro ao salvar avaliação')
    } else {
      setMensagem('✅ Avaliação enviada!')
      setTimeout(() => router.push('/guia/dashboard'), 2000)
    }
    setEnviando(false)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <button onClick={() => router.back()} className="text-green-600 mb-6 text-sm">← Voltar</button>
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏔️</div>
          <h1 className="text-2xl font-bold text-gray-800">Avaliar Cliente</h1>
          <p className="text-gray-500 text-sm">{cliente?.nome || 'Cliente'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center">
            <label className="block text-sm font-medium text-gray-700 mb-3">Como foi a experiência com o cliente?</label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setNota(star)} className="text-3xl transition-transform hover:scale-110"
                  style={{ filter: nota >= star ? 'none' : 'grayscale(1)', opacity: nota >= star ? 1 : 0.5 }}>🏔️</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comentário (opcional)</label>
            <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3}
              placeholder="Como foi o comportamento do cliente?" className="w-full border border-gray-200 rounded-lg p-3 text-sm" />
          </div>

          {mensagem && <div className="text-center text-sm text-green-600">{mensagem}</div>}

          <button type="submit" disabled={enviando} className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg">
            {enviando ? 'Enviando...' : 'Enviar avaliação'}
          </button>
        </form>
      </div>
    </div>
  )
}