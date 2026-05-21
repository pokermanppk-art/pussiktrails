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
  const [provider, setProvider] = useState('')
  const [valor, setValor] = useState(0)
  const [roteiroTitulo, setRoteiroTitulo] = useState('')
  const [expiraEm, setExpiraEm] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [comprovanteStatus, setComprovanteStatus] = useState('nao_enviado')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    const carregar = async () => {
      try {
        // Buscar reserva e dados do cliente
        const { data: reserva } = await supabase
          .from('reservas')
          .select('*, roteiro:roteiro_id(titulo, preco), comprovante_status, pagamento_status, cliente_id')
          .eq('id', reservaId)
          .single()

        if (!reserva) {
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

        // Dados do cliente
        const { data: cliente } = await supabase
          .from('users')
          .select('nome, email, cpf')
          .eq('id', reserva.cliente_id)
          .single()

        // Chamar API centralizada
        const response = await fetch('/api/pix/criar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reservaId: reserva.id,
            valor: reserva.valor_total,
            email: cliente?.email,
            nome: cliente?.nome || 'Cliente',
            cpfCnpj: cliente?.cpf,
            descricao: `Reserva - ${reserva.roteiro?.titulo}`
          })
        })

        const data = await response.json()
        if (data.success) {
          setQrCode(data.qrCode)
          setCodigoPix(data.codigoPix)
          setProvider(data.provider)
          if (data.expiresDate) {
            const expira = new Date(data.expiresDate)
            setExpiraEm(expira.toLocaleDateString('pt-BR') + ' ' + expira.toLocaleTimeString('pt-BR'))
          }
        } else {
          setMensagem(data.error || 'Erro ao gerar PIX')
        }
      } catch (err) {
        setMensagem('Erro ao carregar')
      } finally {
        setCarregando(false)
      }
    }

    if (reservaId) carregar()
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
    } catch (err) {
      setMensagem('❌ Erro ao enviar comprovante')
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) return <div style={{ textAlign: 'center', padding: 50 }}>Carregando...</div>
  if (comprovanteStatus === 'enviado') {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <h2>✅ Comprovante enviado!</h2>
        <button onClick={() => router.push('/cliente/minhas-reservas')}>Voltar</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <button onClick={() => router.back()}>← Voltar</button>
      <h2>Pagamento PIX</h2>
      {provider && <p><strong>Processado via:</strong> {provider}</p>}
      <p><strong>Valor:</strong> R$ {valor.toFixed(2)}</p>
      <p><strong>Roteiro:</strong> {roteiroTitulo}</p>
      {expiraEm && <p>⏰ Expira em: {expiraEm}</p>}

      {qrCode && (
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <img src={qrCode} alt="QR Code PIX" style={{ width: 250, height: 250 }} />
        </div>
      )}

      {codigoPix && (
        <div>
          <textarea readOnly value={codigoPix} rows={3} style={{ width: '100%' }} />
          <button onClick={copiarCodigo}>{copiado ? 'Copiado!' : 'Copiar código'}</button>
        </div>
      )}

      <hr />
      <h3>📎 Envio do comprovante</h3>
      <input type="file" accept="image/*,application/pdf" onChange={(e) => setArquivo(e.target.files?.[0] || null)} />
      <button onClick={handleUpload} disabled={enviando || !arquivo}>{enviando ? 'Enviando...' : 'Enviar comprovante'}</button>
      {mensagem && <p>{mensagem}</p>}
    </div>
  )
}