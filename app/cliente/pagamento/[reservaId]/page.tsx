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
  const [enviando, setEnviando] = useState(false)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [comprovanteStatus, setComprovanteStatus] = useState('nao_enviado') // nao_enviado, enviado, aprovado

  useEffect(() => {
    const carregarPagamento = async () => {
      // Buscar reserva
      const { data: reserva, error } = await supabase
        .from('reservas')
        .select('*, roteiro:roteiro_id(titulo, preco), comprovante_status')
        .eq('id', reservaId)
        .single()

      if (error || !reserva) {
        setMensagem('Reserva não encontrada')
        setCarregando(false)
        return
      }

      setValor(reserva.valor_total)
      setRoteiroTitulo(reserva.roteiro?.titulo || 'Reserva')
      setComprovanteStatus(reserva.comprovante_status || 'nao_enviado')

      // Se já enviou comprovante e está pendente ou aprovado, redireciona ou mostra mensagem
      if (reserva.comprovante_status === 'aprovado') {
        router.push('/cliente/minhas-reservas')
        return
      }
      if (reserva.comprovante_status === 'enviado') {
        setCarregando(false)
        return
      }

      // Buscar cliente para nome (usado no PIX)
      const { data: cliente } = await supabase
        .from('users')
        .select('nome')
        .eq('id', reserva.cliente_id)
        .single()

      // Gerar PIX manual
      const response = await fetch('/api/pix/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservaId: reserva.id,
          valor: reserva.valor_total,
          nome: cliente?.nome || 'Cliente',
        }),
      })

      const data = await response.json()
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
    alert('✅ Código PIX copiado!')
  }

  const handleUpload = async () => {
    if (!arquivo) {
      setMensagem('Selecione um comprovante antes de enviar')
      return
    }
    setEnviando(true)
    setMensagem('')

    try {
      // Upload do arquivo para o Supabase Storage
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

      // Atualizar reserva com o comprovante
      const { error: updateError } = await supabase
        .from('reservas')
        .update({
          comprovante_url: publicUrl,
          comprovante_status: 'enviado',
          comprovante_enviado_em: new Date().toISOString(),
        })
        .eq('id', reservaId)

      if (updateError) throw updateError

      setMensagem('✅ Comprovante enviado! Aguarde a análise do administrador.')
      setComprovanteStatus('enviado')
      setArquivo(null)
    } catch (err: any) {
      console.error(err)
      setMensagem('❌ Erro ao enviar comprovante: ' + err.message)
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Carregando...
      </div>
    )
  }

  if (comprovanteStatus === 'enviado') {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
        <h2>✅ Comprovante enviado com sucesso!</h2>
        <p>Seu comprovante está em análise. Você receberá uma notificação em breve.</p>
        <button onClick={() => router.push('/cliente/minhas-reservas')}>Voltar para reservas</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h2>Pagamento via PIX</h2>
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
          <label>Código PIX (copie e cole no app do banco):</label>
          <textarea readOnly value={codigoPix} rows={3} style={{ width: '100%', marginTop: 8 }} />
          <button onClick={copiarCodigo} style={{ marginTop: 8 }}>📋 Copiar código</button>
        </div>
      )}

      <hr style={{ margin: '20px 0' }} />

      <h3>📎 Envio do comprovante</h3>
      <p>Após realizar o pagamento, anexe o comprovante (print, foto ou PDF).</p>
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={(e) => setArquivo(e.target.files?.[0] || null)}
        disabled={enviando}
      />
      <button
        onClick={handleUpload}
        disabled={enviando || !arquivo}
        style={{ marginTop: 10, display: 'block' }}
      >
        {enviando ? 'Enviando...' : '📤 Enviar comprovante'}
      </button>

      {mensagem && (
        <p style={{ marginTop: 16, color: mensagem.includes('✅') ? 'green' : 'red' }}>
          {mensagem}
        </p>
      )}
    </div>
  )
}