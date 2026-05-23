'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function PagamentoPage() {
  const params = useParams()
  const router = useRouter()
  const reservaId = params.id as string

  const [qrCode, setQrCode] = useState<string>('')
  const [qrCodeBase64, setQrCodeBase64] = useState<string>('')
  const [paymentId, setPaymentId] = useState<string>('')
  const [invoiceUrl, setInvoiceUrl] = useState<string>('')
  const [carregando, setCarregando] = useState(true)
  const [mensagem, setMensagem] = useState('')
  const [verificando, setVerificando] = useState(false)

  useEffect(() => {
    const criarPagamento = async () => {
      try {
        // Buscar dados da reserva
        const { data: reserva, error } = await supabase
          .from('reservas')
          .select('*, roteiro:roteiro_id(titulo)')
          .eq('id', reservaId)
          .single()

        if (error || !reserva) {
          setMensagem('Reserva não encontrada')
          setCarregando(false)
          return
        }

        // Buscar dados do cliente logado
        const userData = localStorage.getItem('user')
        if (!userData) {
          router.push('/login')
          return
        }
        const user = JSON.parse(userData)

        // Buscar CPF do cliente no banco
        const { data: userDataComplete } = await supabase
          .from('users')
          .select('cpf, celular')
          .eq('id', user.id)
          .single()

        // Criar pagamento no Asaas
        const response = await fetch('/api/asaas/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reservaId,
            valor: reserva.valor_total,
            descricao: `Reserva: ${reserva.roteiro?.titulo}`,
            clienteNome: user.nome,
            clienteEmail: user.email,
            clienteCpf: userDataComplete?.cpf,
            clienteCelular: userDataComplete?.celular,
          }),
        })

        const data = await response.json()

        if (data.success) {
          setQrCode(data.qrCode)
          setQrCodeBase64(data.qrCodeBase64)
          setPaymentId(data.paymentId)
          setInvoiceUrl(data.invoiceUrl)
          setMensagem('QR Code gerado! Escaneie com seu banco para pagar via PIX.')
        } else {
          setMensagem(data.error || 'Erro ao gerar pagamento')
        }
      } catch (err: any) {
        console.error('Erro:', err)
        setMensagem('Erro ao processar pagamento')
      } finally {
        setCarregando(false)
      }
    }

    criarPagamento()
  }, [reservaId, router])

  const verificarPagamento = async () => {
    setVerificando(true)
    
    try {
      const response = await fetch('/api/asaas/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      })

      const data = await response.json()

      if (data.status === 'RECEIVED' || data.status === 'CONFIRMED') {
        setMensagem('✅ Pagamento confirmado! Redirecionando...')
        setTimeout(() => router.push('/pagamento/sucesso'), 2000)
      } else if (data.status === 'PENDING') {
        setMensagem('⏳ Pagamento ainda não confirmado. Aguarde alguns segundos e tente novamente.')
      } else {
        setMensagem('❌ Pagamento não identificado. Se já pagou, aguarde alguns minutos.')
      }
    } catch (err) {
      setMensagem('Erro ao verificar pagamento. Tente novamente.')
    } finally {
      setVerificando(false)
    }
  }

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Gerando QR Code...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '32px 24px' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📱</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Pagamento via PIX</h1>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>{mensagem}</p>

          {qrCodeBase64 && (
            <>
              <img
                src={`data:image/png;base64,${qrCodeBase64}`}
                alt="QR Code PIX"
                style={{ width: '200px', height: '200px', margin: '0 auto 24px' }}
              />
              
              {invoiceUrl && (
                <p style={{ marginBottom: '16px' }}>
                  <a href={invoiceUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#16a34a' }}>
                    🔗 Abrir fatura no Asaas
                  </a>
                </p>
              )}

              <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>
                Ou copie o código PIX abaixo:
              </p>
              <textarea
                readOnly
                value={qrCode}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  backgroundColor: '#f9fafb',
                  resize: 'none',
                }}
              />
              <button
                onClick={() => navigator.clipboard.writeText(qrCode)}
                style={{
                  marginTop: '8px',
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  padding: '8px 16px',
                  borderRadius: '40px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                📋 Copiar código
              </button>
            </>
          )}

          <div style={{ marginTop: '24px' }}>
            <button
              onClick={verificarPagamento}
              disabled={verificando}
              style={{
                backgroundColor: '#16a34a',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '40px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                opacity: verificando ? 0.6 : 1,
              }}
            >
              {verificando ? 'Verificando...' : '✅ Já paguei, verificar'}
            </button>
          </div>

          <p style={{ marginTop: '16px', fontSize: '11px', color: '#9ca3af' }}>
            O pagamento será confirmado automaticamente em até 1 minuto.
          </p>
        </div>
      </div>
    </div>
  )
}