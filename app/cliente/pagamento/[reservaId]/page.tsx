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
  const [copiado, setCopiado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [comprovanteStatus, setComprovanteStatus] = useState('nao_enviado')
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null)

  useEffect(() => {
    const carregarPagamento = async () => {
      const { data: reserva } = await supabase
        .from('reservas')
        .select('*, roteiro:roteiro_id(titulo, preco), comprovante_status')
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

      // Se já enviou comprovante, não precisa gerar QR Code novamente
      if (reserva.comprovante_status === 'enviado' || reserva.comprovante_status === 'aprovado') {
        setCarregando(false)
        return
      }

      // Buscar dados do cliente
      const { data: cliente } = await supabase
        .from('users')
        .select('email, nome')
        .eq('id', reserva.cliente_id)
        .single()

      // Criar cobrança PIX (simulada)
      const response = await fetch('/api/pix/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservaId: reserva.id,
          valor: reserva.valor_total,
          email: cliente?.email,
          nome: cliente?.nome
        })
      })

      const data = await response.json()
      setQrCode(data.qrCode)
      setCodigoPix(data.codigoPix)
      setCarregando(false)
    }

    if (reservaId) carregarPagamento()
  }, [reservaId])

  const copiarCodigo = () => {
    navigator.clipboard.writeText(codigoPix)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 3000)
  }

  const enviarComprovante = async () => {
    if (!arquivoSelecionado) {
      setMensagem('❌ Selecione um arquivo de comprovante')
      return
    }

    setEnviando(true)
    setMensagem('')

    try {
      // Upload do comprovante para o Supabase Storage
      const fileExt = arquivoSelecionado.name.split('.').pop()
      const fileName = `${reservaId}_${Date.now()}.${fileExt}`
      const filePath = `comprovantes/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('comprovantes')
        .upload(filePath, arquivoSelecionado)

      if (uploadError) {
        setMensagem('❌ Erro ao enviar comprovante')
        setEnviando(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('comprovantes')
        .getPublicUrl(filePath)

      // Atualizar reserva com o comprovante
      const { error: updateError } = await supabase
        .from('reservas')
        .update({
          comprovante_url: publicUrl,
          comprovante_status: 'enviado',
          comprovante_enviado_em: new Date().toISOString()
        })
        .eq('id', reservaId)

      if (updateError) {
        setMensagem('❌ Erro ao salvar comprovante')
        setEnviando(false)
        return
      }

      setComprovanteStatus('enviado')
      setMensagem('✅ Comprovante enviado! Aguardando análise do administrador.')
      
      // Limpar arquivo selecionado
      setArquivoSelecionado(null)

    } catch (err) {
      setMensagem('❌ Erro ao enviar comprovante')
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏔️</div>
          <div style={{ color: '#6b7280' }}>Carregando...</div>
        </div>
      </div>
    )
  }

  // Se comprovante já foi aprovado
  if (comprovanteStatus === 'aprovado') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Pagamento Confirmado!</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>Sua reserva foi confirmada. Aguarde o contato do guia.</p>
            <button onClick={() => router.push('/cliente/minhas-reservas')} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '12px 24px', cursor: 'pointer' }}>Ver minhas reservas →</button>
          </div>
        </div>
      </div>
    )
  }

  // Se comprovante já foi enviado (aguardando análise)
  if (comprovanteStatus === 'enviado') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>⏳</div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Comprovante Enviado!</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>Seu comprovante está sendo analisado. Você receberá uma notificação em breve.</p>
            <button onClick={() => router.push('/cliente/minhas-reservas')} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '12px 24px', cursor: 'pointer' }}>Ver minhas reservas →</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '16px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Pagamento via PIX</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
            Escaneie o QR Code ou copie o código para pagar
          </p>
          
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a', marginBottom: '24px' }}>
            R$ {valor.toFixed(2)}
          </div>
          
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '24px' }}>
            📍 {roteiroTitulo}
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
              fontSize: '10px', 
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

        {/* UPLOAD DO COMPROVANTE */}
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>📎 Após o pagamento, envie o comprovante</h3>
          
          <div style={{ 
            border: '2px dashed #e5e7eb', 
            borderRadius: '16px', 
            padding: '20px', 
            textAlign: 'center',
            marginBottom: '16px'
          }}>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setArquivoSelecionado(e.target.files?.[0] || null)}
              style={{ display: 'none' }}
              id="comprovante-input"
            />
            <label 
              htmlFor="comprovante-input" 
              style={{
                display: 'inline-block',
                cursor: 'pointer',
                backgroundColor: '#f3f4f6',
                padding: '12px 24px',
                borderRadius: '40px',
                fontSize: '14px'
              }}
            >
              📁 Selecionar comprovante
            </label>
            {arquivoSelecionado && (
              <p style={{ fontSize: '12px', color: '#16a34a', marginTop: '12px' }}>
                ✅ {arquivoSelecionado.name}
              </p>
            )}
          </div>

          <button
            onClick={enviarComprovante}
            disabled={enviando || !arquivoSelecionado}
            style={{
              width: '100%',
              backgroundColor: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '40px',
              padding: '12px',
              cursor: enviando || !arquivoSelecionado ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              opacity: enviando || !arquivoSelecionado ? 0.6 : 1
            }}
          >
            {enviando ? 'Enviando...' : '📤 Enviar comprovante'}
          </button>
        </div>

        {mensagem && (
          <div style={{ 
            padding: '12px', 
            borderRadius: '12px', 
            textAlign: 'center', 
            fontSize: '13px',
            backgroundColor: mensagem.includes('✅') ? '#dcfce7' : '#fee2e2',
            color: mensagem.includes('✅') ? '#16a34a' : '#dc2626'
          }}>
            {mensagem}
          </div>
        )}

        {/* INSTRUÇÕES */}
        <div style={{ backgroundColor: '#f9fafb', borderRadius: '16px', padding: '16px', marginTop: '16px' }}>
          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>📌 Como pagar:</p>
          <ol style={{ fontSize: '11px', color: '#6b7280', paddingLeft: '20px', margin: 0 }}>
            <li>Abra o app do seu banco</li>
            <li>Escolha a opção "Pagar com PIX"</li>
            <li>Escaneie o QR Code ou cole o código</li>
            <li>Confirme o pagamento</li>
            <li>Clique em "Selecionar comprovante" e envie o comprovante</li>
          </ol>
        </div>
      </div>
    </div>
  )
}