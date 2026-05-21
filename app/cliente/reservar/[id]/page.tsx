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

        // 5. Se Asaas falhou, usa fallback manual
        if (!asaasSuccess) {
          console.log('🔄 Usando fallback manual para gerar PIX')
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
        console.error('Erro ao carregar pagamento:', err)
        setMensagem('Erro inesperado')
      } finally {
        setCarregando(false)
      }
    }

    if (reservaId) carregarPagamento()
  }, [reservaId, router])

  const copiarCodigo = () => {
    navigator.clipboard.writeText(codigoPix)
    alert('✅ Código PIX copiado!')
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

  if (carregando) return <div style={{ textAlign: 'center', padding: '50px' }}>Carregando...</div>
  if (comprovanteStatus === 'enviado') {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: 20, textAlign: 'center' }}>
        <h2>✅ Comprovante enviado!</h2>
        <p>Em análise. Você receberá notificação.</p>
        <button onClick={() => router.push('/cliente/minhas-reservas')}>Voltar</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h2>Pagamento via PIX</h2>
      {usandoFallback && (
        <p style={{ color: '#d97706', background: '#fef3c7', padding: 8, borderRadius: 8 }}>
          ⚠️ Modo alternativo ativado. O QR Code é válido, mas a confirmação é manual.
        </p>
      )}
      <p><strong>Valor:</strong> R$ {valor.toFixed(2)}</p>
      <p><strong>Roteiro:</strong> {roteiroTitulo}</p>
      {expiraEm && <p>⏰ Válido até: {expiraEm}</p>}

      {qrCode && (
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <img src={qrCode} alt="QR Code PIX" style={{ width: 250, height: 250 }} />
        </div>
      )}

      {codigoPix && (
        <div>
          <label>Código PIX (copie e cole no app do banco):</label>
          <textarea readOnly value={codigoPix} rows={3} style={{ width: '100%', marginTop: 8, fontFamily: 'monospace', fontSize: 12 }} />
          <button onClick={copiarCodigo} style={{ marginTop: 8 }}>📋 Copiar código</button>
        </div>
      )}

      <hr style={{ margin: '20px 0' }} />
      <h3>📎 Envio do comprovante</h3>
      <p>Após pagar, anexe o comprovante (print, foto ou PDF).</p>
      <input type="file" accept="image/*,application/pdf" onChange={(e) => setArquivo(e.target.files?.[0] || null)} disabled={enviando} />
      <button onClick={handleUpload} disabled={enviando || !arquivo} style={{ marginTop: 10 }}>
        {enviando ? 'Enviando...' : '📤 Enviar comprovante'}
      </button>
      {mensagem && <p style={{ marginTop: 16, color: mensagem.includes('✅') ? 'green' : 'red' }}>{mensagem}</p>}
    </div>
  )
}