'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function PagamentoPage() {
  const params = useParams()
  const router = useRouter()
  const reservaId = params.id as string

  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [qrCodeGerado, setQrCodeGerado] = useState(false)

  // Simular criação do pagamento (sem API)
  useEffect(() => {
    const simularPagamento = async () => {
      setCarregando(true)
      setMensagem('')
      
      // Simular delay de processamento
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setQrCodeGerado(true)
      setMensagem('✅ QR Code gerado! Escaneie com seu banco para pagar via PIX.')
      setCarregando(false)
    }

    if (reservaId) {
      simularPagamento()
    }
  }, [reservaId])

  const confirmarPagamento = () => {
    setMensagem('✅ Pagamento confirmado! Redirecionando...')
    setTimeout(() => {
      router.push('/pagamento/sucesso')
    }, 2000)
  }

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📱</div>
          <p style={{ color: '#6b7280' }}>Gerando QR Code...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '32px 24px' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏔️</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#111827' }}>Pagamento via PIX</h1>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            Reserva #{reservaId?.slice(0, 8)}
          </p>

          {mensagem && (
            <div style={{
              backgroundColor: mensagem.includes('confirmado') ? '#dcfce7' : '#f0fdf4',
              color: mensagem.includes('confirmado') ? '#16a34a' : '#4b5563',
              padding: '12px',
              borderRadius: '12px',
              fontSize: '13px',
              marginBottom: '16px'
            }}>
              {mensagem}
            </div>
          )}

          {qrCodeGerado && (
            <>
              {/* QR Code Placeholder */}
              <div style={{
                width: '200px',
                height: '200px',
                margin: '0 auto 24px',
                backgroundColor: '#1a1a1a',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '48px'
                }}>📱</div>
                <div style={{
                  position: 'absolute',
                  bottom: '10px',
                  fontSize: '10px',
                  color: '#9ca3af'
                }}>QR Code PIX</div>
              </div>

              <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>
                Escaneie o QR Code com o app do seu banco
              </p>

              <div style={{
                backgroundColor: '#f9fafb',
                padding: '12px',
                borderRadius: '12px',
                marginBottom: '16px',
                fontSize: '11px',
                color: '#6b7280',
                wordBreak: 'break-all'
              }}>
                <strong>Resumo do pagamento:</strong><br />
                💰 Valor: R$ 100,00<br />
                📅 Vencimento: Amanhã<br />
                🏔️ Beneficiário: PussikTrails
              </div>
            </>
          )}

          <div style={{ marginTop: '24px' }}>
            <button
              onClick={confirmarPagamento}
              disabled={!qrCodeGerado}
              style={{
                backgroundColor: qrCodeGerado ? '#16a34a' : '#9ca3af',
                color: 'white',
                padding: '14px 24px',
                borderRadius: '40px',
                border: 'none',
                cursor: qrCodeGerado ? 'pointer' : 'not-allowed',
                fontWeight: '600',
                fontSize: '16px',
                width: '100%',
                transition: 'background-color 0.2s'
              }}
            >
              ✅ Já paguei, verificar
            </button>
          </div>

          <p style={{ marginTop: '24px', fontSize: '11px', color: '#9ca3af' }}>
            ⚠️ <strong>Modo de demonstração</strong><br />
            Esta é uma simulação do fluxo de pagamento PIX.<br />
            A integração com Asaas será ativada em breve.
          </p>

          <button
            onClick={() => router.push('/cliente/minhas-reservas')}
            style={{
              marginTop: '16px',
              backgroundColor: 'transparent',
              color: '#6b7280',
              padding: '8px 16px',
              borderRadius: '40px',
              border: '1px solid #e5e7eb',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            ← Voltar para minhas reservas
          </button>
        </div>
      </div>
    </div>
  )
}