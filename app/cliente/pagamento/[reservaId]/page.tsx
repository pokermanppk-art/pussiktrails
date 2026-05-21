'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function PagamentoPIX() {
  const params = useParams()
  const router = useRouter()
  const reservaId = params.reservaId as string

  const [carregando, setCarregando] = useState(true)
  const [qrCode, setQrCode] = useState('')
  const [codigoPix, setCodigoPix] = useState('')
  const [valor, setValor] = useState(0)
  const [copiado, setCopiado] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    const carregarPagamento = async () => {
      // Buscar dados da reserva
      const { data: reserva, error } = await supabase
        .from('reservas')
        .select('*, roteiro:roteiro_id(titulo, preco)')
        .eq('id', reservaId)
        .single()

      if (error || !reserva) {
        setMensagem('Reserva não encontrada')
        setCarregando(false)
        return
      }

      setValor(reserva.valor_total || reserva.roteiro?.preco || 0)

      // Buscar dados do cliente
      const { data: cliente } = await supabase
        .from('users')
        .select('email, nome')
        .eq('id', reserva.cliente_id)
        .single()

      // Criar cobrança PIX
      const response = await fetch('/api/pix/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservaId: reserva.id,
          valor: reserva.valor_total,
          email: cliente?.email,
          nome: cliente?.nome,
          descricao: `Reserva - ${reserva.roteiro?.titulo}`
        })
      })

      const data = await response.json()

      if (data.success) {
        setQrCode(data.qrCode)
        setCodigoPix(data.codigoPix)
      } else {
        setMensagem(data.error || 'Erro ao gerar PIX')
      }

      setCarregando(false)
    }

    if (reservaId) carregarPagamento()
  }, [reservaId])

  const copiarCodigo = () => {
    navigator.clipboard.writeText(codigoPix)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 3000)
  }

  const verificarPagamento = async () => {
    setVerificando(true)
    setMensagem('Verificando pagamento...')
    
    // Aqui você pode chamar uma API para verificar o status
    // Por enquanto, vamos apenas redirecionar
    
    setTimeout(() => {
      router.push('/cliente/minhas-reservas')
    }, 2000)
  }

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏔️</div>
          <div style={{ color: '#6b7280' }}>Gerando QR Code PIX...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '16px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        
        {/* CARD PRINCIPAL */}
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Pagamento via PIX</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
            Escaneie o QR Code ou copie o código para pagar
          </p>
          
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a', marginBottom: '24px' }}>
            R$ {valor.toFixed(2)}
          </div>
        </div>

        {/* QR CODE */}
        {qrCode && (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', marginBottom: '16px', textAlign: 'center' }}>
            <img 
              src={qrCode} 
              alt="QR Code PIX" 
              style={{ width: '200px', height: '200px', margin: '0 auto', display: 'block' }}
            />
          </div>
        )}

        {/* CÓDIGO PIX */}
        {codigoPix && (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Ou copie o código PIX:</p>
            <div style={{ 
              backgroundColor: '#f9fafb', 
              padding: '12px', 
              borderRadius: '12px', 
              fontSize: '12px', 
              wordBreak: 'break-all',
              fontFamily: 'monospace',
              marginBottom: '12px'
            }}>
              {codigoPix}
            </div>
            <button
              onClick={copiarCodigo}
              style={{
                width: '100%',
                backgroundColor: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '40px',
                padding: '12px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {copiado ? '✅ Copiado!' : '📋 Copiar código PIX'}
            </button>
          </div>
        )}

        {/* BOTÕES */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <button
            onClick={() => router.back()}
            style={{
              flex: 1,
              backgroundColor: '#f3f4f6',
              border: 'none',
              borderRadius: '40px',
              padding: '12px',
              cursor: 'pointer',
              color: '#374151'
            }}
          >
            ← Voltar
          </button>
          <button
            onClick={verificarPagamento}
            disabled={verificando}
            style={{
              flex: 2,
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '40px',
              padding: '12px',
              cursor: 'pointer',
              fontWeight: 'bold',
              opacity: verificando ? 0.7 : 1
            }}
          >
            {verificando ? 'Verificando...' : '✅ Já paguei, confirmar reserva'}
          </button>
        </div>

        {/* MENSAGEM */}
        {mensagem && (
          <div style={{ 
            padding: '12px', 
            borderRadius: '12px', 
            textAlign: 'center', 
            fontSize: '13px',
            backgroundColor: mensagem.includes('Erro') ? '#fee2e2' : '#dcfce7',
            color: mensagem.includes('Erro') ? '#dc2626' : '#16a34a'
          }}>
            {mensagem}
          </div>
        )}

        {/* INSTRUÇÕES */}
        <div style={{ backgroundColor: '#f9fafb', borderRadius: '16px', padding: '16px', marginTop: '16px' }}>
          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>📌 Como pagar:</p>
          <ol style={{ fontSize: '12px', color: '#6b7280', paddingLeft: '20px', margin: 0 }}>
            <li>Abra o app do seu banco</li>
            <li>Escolha a opção "Pagar com PIX"</li>
            <li>Escaneie o QR Code ou cole o código</li>
            <li>Confirme o pagamento</li>
            <li>Clique em "Já paguei" para confirmar sua reserva</li>
          </ol>
        </div>
      </div>
    </div>
  )
}