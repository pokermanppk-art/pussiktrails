'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'

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
  const [mensagem, setMensagem] = useState('')
  const [usandoFallback, setUsandoFallback] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [comprovanteStatus, setComprovanteStatus] = useState('nao_enviado')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    const carregarPagamento = async () => {
      try {
        // 1. Buscar reserva
        const { data: reserva, error: reservaError } = await supabase
          .from('reservas')
          .select('*, roteiro:roteiro_id(titulo, preco), comprovante_status, cliente_id')
          .eq('id', reservaId)
          .single()

        if (reservaError || !reserva) {
          setMensagem('Reserva não encontrada')
          setCarregando(false)
          return
        }

        setValor(reserva.valor_total)
        setRoteiroTitulo(reserva.roteiro?.titulo || 'Reserva')
        setComprovanteStatus(reserva.comprovante_status || 'nao_enviado')

        if (reserva.comprovante_status === 'aprovado' || reserva.pagamento_status === 'pago') {
          router.push('/cliente/minhas-reservas')
          return
        }

        if (reserva.comprovante_status === 'enviado') {
          setCarregando(false)
          return
        }

        // 2. Buscar cliente
        const { data: cliente, error: clienteError } = await supabase
          .from('users')
          .select('nome, email, cpf')
          .eq('id', reserva.cliente_id)
          .single()

        if (clienteError || !cliente) {
          setMensagem('Dados do cliente não encontrados')
          setCarregando(false)
          return
        }

        // 3. Tentar criar cliente no Asaas
        let asaasCustomerId = null
        let asaasSuccess = false

        try {
          const customerRes = await fetch('/api/asaas/cliente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cliente.email,
              nome: cliente.nome,
              cpfCnpj: cliente.cpf?.replace(/\D/g, ''),
            }),
          })
          const customerData = await customerRes.json()
          if (customerRes.ok && customerData.customerId) {
            asaasCustomerId = customerData.customerId
          }
        } catch (err) {
          console.warn('Erro ao criar cliente Asaas:', err)
        }

        // 4. Tentar gerar PIX via Asaas
        let pixResponse = null
        if (asaasCustomerId) {
          try {
            const pixRes = await fetch('/api/asaas/pix/criar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customerId: asaasCustomerId,
                valor: reserva.valor_total,
                descricao: `Reserva - ${reserva.roteiro?.titulo}`,
                reservaId: reserva.id,
              }),
            })
            pixResponse = await pixRes.json()
            if (pixResponse.success) asaasSuccess = true
          } catch (err) {
            console.warn('Erro ao gerar PIX Asaas:', err)
          }
        }

        // 5. Fallback manual
        if (!asaasSuccess) {
          setUsandoFallback(true)
          const fallbackRes = await fetch('/api/pix/criar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reservaId: reserva.id,
              valor: reserva.valor_total,
              nome: cliente.nome || 'Cliente',
            }),
          })
          pixResponse = await fallbackRes.json()
        }

        if (pixResponse?.success) {
          setQrCode(pixResponse.qrCode)
          setCodigoPix(pixResponse.codigoPix)
          if (pixResponse.expiresDate) {
            const expira = new Date(pixResponse.expiresDate)
            setExpiraEm(expira.toLocaleDateString('pt-BR') + ' ' + expira.toLocaleTimeString('pt-BR'))
          }
        } else {
          setMensagem(pixResponse?.error || 'Erro ao gerar PIX')
        }
      } catch (err) {
        console.error(err)
        setMensagem('Erro inesperado')
      } finally {
        setCarregando(false)
      }
    }

    if (reservaId) carregarPagamento()
  }, [reservaId, router])

  const copiarCodigo = () => {
    navigator.clipboard.writeText(codigoPix)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 3000)
  }

  const handleUpload = async () => {
    if (!arquivo) {
      setMensagem('Selecione um comprovante')
      return
    }
    setEnviando(true)
    setMensagem('')

    try {
      const fileExt = arquivo.name.split('.').pop()
      const fileName = `${reservaId}_${uuidv4()}.${fileExt}`
      const filePath = `comprovantes/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('comprovantes')
        .upload(filePath, arquivo)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('comprovantes')
        .getPublicUrl(filePath)

      await supabase
        .from('reservas')
        .update({
          comprovante_url: publicUrl,
          comprovante_status: 'enviado',
          comprovante_enviado_em: new Date().toISOString(),
        })
        .eq('id', reservaId)

      setMensagem('✅ Comprovante enviado! Aguarde análise.')
      setComprovanteStatus('enviado')
      setArquivo(null)
    } catch (err: any) {
      setMensagem('❌ Erro ao enviar comprovante: ' + err.message)
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '3px solid #e5e7eb', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280' }}>Carregando...</p>
        </div>
      </div>
    )
  }

  if (comprovanteStatus === 'enviado') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Comprovante enviado!</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>Seu comprovante está em análise. Você receberá uma notificação em breve.</p>
          <button onClick={() => router.push('/cliente/minhas-reservas')} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '12px 24px', cursor: 'pointer' }}>Ver reservas</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* CABEÇALHO */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}>← Voltar</button>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Pagamento PIX</h1>
          <div style={{ width: '40px' }}></div>
        </div>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
        {/* CARD DE VALOR */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '24px', marginBottom: '20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Valor a pagar</p>
          <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#111827' }}>R$ {valor.toFixed(2)}</p>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>{roteiroTitulo}</p>
        </div>

        {/* ALERTA DE FALLBACK */}
        {usandoFallback && (
          <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '16px', padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
              <p style={{ fontWeight: 'bold', fontSize: '14px', color: '#92400e', marginBottom: '4px' }}>Modo alternativo ativado</p>
              <p style={{ fontSize: '12px', color: '#92400e' }}>O QR Code é válido, mas a confirmação do pagamento será manual após o envio do comprovante.</p>
            </div>
          </div>
        )}

        {/* QR CODE */}
        {qrCode && (
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '24px', marginBottom: '20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <img src={qrCode} alt="QR Code PIX" style={{ width: '200px', height: '200px', margin: '0 auto', display: 'block' }} />
            {expiraEm && <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '12px' }}>⏰ Válido até: {expiraEm}</p>}
          </div>
        )}

        {/* CÓDIGO PIX */}
        {codigoPix && (
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>Código PIX para copiar</p>
            <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '12px', marginBottom: '12px', wordBreak: 'break-all' }}>
              <code style={{ fontSize: '11px', fontFamily: 'monospace' }}>{codigoPix}</code>
            </div>
            <button onClick={copiarCodigo} style={{ width: '100%', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
              {copiado ? '✅ Copiado!' : '📋 Copiar código PIX'}
            </button>
          </div>
        )}

        {/* ENVIO DE COMPROVANTE */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>📎 Envio do comprovante</h3>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>Após realizar o pagamento, anexe o comprovante (print, foto ou PDF) para confirmar sua reserva.</p>
          
          <div style={{ border: '2px dashed #e5e7eb', borderRadius: '16px', padding: '20px', textAlign: 'center', marginBottom: '16px' }}>
            <input type="file" id="comprovante" accept="image/*,application/pdf" onChange={(e) => setArquivo(e.target.files?.[0] || null)} style={{ display: 'none' }} />
            <label htmlFor="comprovante" style={{ cursor: 'pointer', color: '#16a34a', fontWeight: '500' }}>📁 Selecionar comprovante</label>
            {arquivo && <p style={{ fontSize: '12px', color: '#16a34a', marginTop: '8px' }}>✓ {arquivo.name}</p>}
          </div>

          <button onClick={handleUpload} disabled={enviando || !arquivo} style={{ width: '100%', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '12px', cursor: enviando || !arquivo ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: enviando || !arquivo ? 0.6 : 1 }}>
            {enviando ? 'Enviando...' : '📤 Enviar comprovante'}
          </button>
        </div>

        {/* MENSAGEM */}
        {mensagem && (
          <div style={{ padding: '12px', borderRadius: '12px', textAlign: 'center', fontSize: '13px', backgroundColor: mensagem.includes('✅') ? '#dcfce7' : '#fee2e2', color: mensagem.includes('✅') ? '#16a34a' : '#dc2626' }}>
            {mensagem}
          </div>
        )}

        {/* RODAPÉ */}
        <p style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', marginTop: '24px' }}>🔒 Ambiente seguro • Pagamento processado via PIX</p>
      </div>
    </div>
  )
}