'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function ClienteReservar() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const roteiroId = params.id as string
  const quantidadePessoas = Number(searchParams.get('pessoas')) || 1

  const [roteiro, setRoteiro] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [processando, setProcessando] = useState(false)

  useEffect(() => {
    const carregarRoteiro = async () => {
      const { data, error } = await supabase
        .from('roteiros')
        .select('id, titulo, preco, embarque_data, retorno_data')
        .eq('id', roteiroId)
        .single()

      if (error || !data) {
        setErro('Roteiro não encontrado')
        setCarregando(false)
        return
      }
      setRoteiro(data)
      setCarregando(false)
    }
    if (roteiroId) carregarRoteiro()
  }, [roteiroId])

  const handleConfirmarReserva = async () => {
    setProcessando(true)
    setErro('')

    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }
    const user = JSON.parse(userData)

    const valorTotal = roteiro.preco * quantidadePessoas

    const { error } = await supabase
      .from('reservas')
      .insert({
        cliente_id: user.id,
        roteiro_id: roteiroId,
        quantidade_pessoas: quantidadePessoas,
        valor_total: valorTotal,
        data_trilha: roteiro.embarque_data || new Date().toISOString(),
        status: 'pendente',
        pagamento_status: 'aguardando'
      })

    if (error) {
      setErro('Erro ao criar reserva: ' + error.message)
      setProcessando(false)
      return
    }

    // Redireciona para minhas reservas
    router.push('/cliente/minhas-reservas')
  }

  if (carregando) {
    return <div style={{ padding: '32px', textAlign: 'center' }}>Carregando dados da reserva...</div>
  }

  if (erro) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <p style={{ color: '#dc2626' }}>{erro}</p>
        <button onClick={() => router.back()} style={{ marginTop: '16px', backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Voltar</button>
      </div>
    )
  }

  const total = roteiro.preco * quantidadePessoas

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '32px 24px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Confirmar Reserva</h1>
        <p><strong>Roteiro:</strong> {roteiro.titulo}</p>
        <p><strong>Quantidade de pessoas:</strong> {quantidadePessoas}</p>
        <p><strong>Valor total:</strong> R$ {total.toFixed(2)}</p>
        <p><strong>Data da trilha:</strong> {roteiro.embarque_data ? new Date(roteiro.embarque_data).toLocaleDateString() : 'A combinar com o guia'}</p>

        <div style={{ marginTop: '24px', display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => router.back()}
            style={{ backgroundColor: '#e5e7eb', color: '#374151', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmarReserva}
            disabled={processando}
            style={{ backgroundColor: '#16a34a', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', opacity: processando ? 0.7 : 1 }}
          >
            {processando ? 'Confirmando...' : 'Confirmar Reserva'}
          </button>
        </div>
        {erro && <p style={{ marginTop: '16px', color: '#dc2626', fontSize: '14px' }}>{erro}</p>}
      </div>
    </div>
  )
}