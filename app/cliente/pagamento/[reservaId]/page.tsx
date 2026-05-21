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
  const [roteiroTitulo, setRoteiroTitulo] = useState('')
  const [expiraEm, setExpiraEm] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    const carregarPagamento = async () => {
      console.log('🔍 Buscando reserva ID:', reservaId)

      // 1. Buscar a reserva
      const { data: reserva, error: reservaError } = await supabase
        .from('reservas')
        .select('*')
        .eq('id', reservaId)
        .single()

      if (reservaError || !reserva) {
        console.error('❌ Erro ao buscar reserva:', reservaError)
        setMensagem('Reserva não encontrada')
        setCarregando(false)
        return
      }

      console.log('✅ Reserva encontrada:', reserva)

      setValor(reserva.valor_total)

      // 2. Buscar o roteiro (se tiver roteiro_id)
      if (reserva.roteiro_id) {
        const { data: roteiro, error: roteiroError } = await supabase
          .from('roteiros')
          .select('titulo')
          .eq('id', reserva.roteiro_id)
          .single()

        if (!roteiroError && roteiro) {
          setRoteiroTitulo(roteiro.titulo)
        }
      }

      // 3. Buscar dados do cliente (email, nome) para a API do PIX
      let clienteEmail = ''
      let clienteNome = ''
      if (reserva.cliente_id) {
        const { data: cliente, error: clienteError } = await supabase
          .from('users')
          .select('email, nome')
          .eq('id', reserva.cliente_id)
          .single()

        if (!clienteError && cliente) {
          clienteEmail = cliente.email
          clienteNome = cliente.nome
        }
      }

      // Se já estiver paga, redireciona
      if (reserva.pagamento_status === 'pago' || reserva.status === 'confirmada') {
        router.push('/cliente/minhas-reservas')
        return
      }

      // 4. Chamar API para gerar PIX (use a versão simulada por enquanto)
      const response = await fetch('/api/pix/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservaId: reserva.id,
          valor: reserva.valor_total,
          email: clienteEmail || 'cliente@exemplo.com',
          nome: clienteNome || 'Cliente',
          descricao: `Reserva - ${roteiroTitulo || 'PussikTrails'}`
        })
      })

      const data = await response.json()
      console.log('🟢 Resposta da API /api/pix/criar:', data)

      if (data.success) {
        setQrCode(data.qrCode)
        setCodigoPix(data.codigoPix)
        if (data.expiresDate) {
          const expira = new Date(data.expiresDate)
          setExpiraEm(expira.toLocaleDateString('pt-BR') + ' ' + expira.toLocaleTimeString('pt-BR'))
        }
      } else {
        setMensagem(data.error || 'Erro ao gerar PIX')
      }

      setCarregando(false)
    }

    if (reservaId) carregarPagamento()
  }, [reservaId, router])

  const copiarCodigo = () => {
    navigator.clipboard.writeText(codigoPix)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 3000)
  }

  const verificarPagamento = async () => {
    setVerificando(true)
    setMensagem('Verificando pagamento...')

    const { data: reserva } = await supabase
      .from('reservas')
      .select('pagamento_status, status')
      .eq('id', reservaId)
      .single()

    if (reserva?.pagamento_status === 'pago' || reserva?.status === 'confirmada') {
      setMensagem('✅ Pagamento confirmado! Redirecionando...')
      setTimeout(() => router.push('/cliente/minhas-reservas'), 2000)
    } else {
      setMensagem('⏳ Pagamento ainda não confirmado. Aguarde alguns minutos e tente novamente.')
    }

    setVerificando(false)
  }

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏔️</div>
          <div style={{ color: '#6b7280' }}>Gerando PIX...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '16px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Pagar com PIX</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
            Escaneie o QR Code ou copie o código
          </p>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a', marginBottom: '8px' }}>
            R$ {valor.toFixed(2)}
          </div>
          <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '16px' }}>
            {roteiroTitulo}
          </p>
          {expiraEm && <p style={{ fontSize: '11px', color: '#dc2626' }}>⏰ Expira em: {expiraEm}</p>}
        </div>

        {qrCode && (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', marginBottom: '16px', textAlign: 'center' }}>
            <img src={qrCode} alt="QR Code PIX" style={{ width: '250px', height: '250px', margin: '0 auto', display: 'block' }} />
          </div>
        )}

        {codigoPix && (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Código PIX para copiar:</p>
            <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '12px', fontSize: '10px', wordBreak: 'break-all', fontFamily: 'monospace', marginBottom: '12px', maxHeight: '100px', overflow: 'auto' }}>
              {codigoPix}
            </div>
            <button onClick={copiarCodigo} style={{ width: '100%', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
              {copiado ? '✅ Copiado!' : '📋 Copiar código PIX'}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <button onClick={() => router.back()} style={{ flex: 1, backgroundColor: '#f3f4f6', border: 'none', borderRadius: '40px', padding: '12px', cursor: 'pointer', color: '#374151' }}>← Voltar</button>
          <button onClick={verificarPagamento} disabled={verificando} style={{ flex: 1, backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '40px', padding: '12px', cursor: 'pointer', fontWeight: 'bold', opacity: verificando ? 0.7 : 1 }}>
            {verificando ? 'Verificando...' : '✅ Já paguei'}
          </button>
        </div>

        {mensagem && (
          <div style={{ padding: '12px', borderRadius: '12px', textAlign: 'center', fontSize: '13px', backgroundColor: mensagem.includes('✅') ? '#dcfce7' : '#fef3c7', color: mensagem.includes('✅') ? '#16a34a' : '#d97706' }}>
            {mensagem}
          </div>
        )}

        <div style={{ backgroundColor: '#f9fafb', borderRadius: '16px', padding: '16px', marginTop: '16px' }}>
          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>📌 Como pagar:</p>
          <ol style={{ fontSize: '11px', color: '#6b7280', paddingLeft: '20px', margin: 0 }}>
            <li>Abra o app do seu banco</li>
            <li>Escolha "Pagar com PIX"</li>
            <li>Escaneie o QR Code ou cole o código</li>
            <li>Confirme o pagamento no app do banco</li>
            <li>Clique em "✅ Já paguei" para verificar</li>
          </ol>
        </div>
      </div>
    </div>
  )
}