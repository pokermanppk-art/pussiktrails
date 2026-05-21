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
  const [comprovanteStatus, setComprovanteStatus] = useState('nao_enviado')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    const carregar = async () => {
      try {
        // Buscar reserva
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

        // Buscar cliente
        const { data: cliente } = await supabase
          .from('users')
          .select('nome, email, cpf')
          .eq('id', reserva.cliente_id)
          .single()

        // Criar cliente no Asaas
        const customerRes = await fetch('/api/asaas/cliente', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cliente?.email,
            nome: cliente?.nome || 'Cliente',
            cpfCnpj: cliente?.cpf,
          }),
        })
        const customerData = await customerRes.json()
        if (!customerRes.ok) throw new Error(customerData.error)

        // Gerar PIX
        const pixRes = await fetch('/api/asaas/pix/criar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: customerData.customerId,
            valor: reserva.valor_total,
            descricao: `Reserva - ${reserva.roteiro?.titulo}`,
            reservaId: reserva.id,
          }),
        })
        const pixData = await pixRes.json()
        if (!pixRes.ok) throw new Error(pixData.error)

        setQrCode(pixData.qrCode)
        setCodigoPix(pixData.codigoPix)
        if (pixData.expiresDate) {
          const expira = new Date(pixData.expiresDate)
          setExpiraEm(expira.toLocaleDateString('pt-BR') + ' ' + expira.toLocaleTimeString('pt-BR'))
        }
      } catch (err: any) {
        console.error(err)
        setMensagem(err.message || 'Erro ao gerar PIX')
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

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p>Carregando...</p>
        </div>
      </div>
    )
  }

  if (comprovanteStatus === 'enviado') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Comprovante enviado!</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>Seu comprovante está em análise.</p>
          <button onClick={() => router.push('/cliente/minhas-reservas')} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '12px 24px', cursor: 'pointer' }}>Ver reservas</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* CABEÇALHO */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}>← Voltar</button>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Pagamento PIX</h1>
          <div style={{ width: '50px' }}></div>
        </div>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        {/* CARD DE VALOR */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Valor a pagar</p>
          <p style={{ fontSize: '32px', fontWeight: 'bold' }}>R$ {valor.toFixed(2)}</p>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>{roteiroTitulo}</p>
          {expiraEm && <p style={{ fontSize: '12px', color: '#dc2626' }}>⏰ Expira em: {expiraEm}</p>}
        </div>

        {/* QR CODE */}
        {qrCode && (
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
            <img src={qrCode} alt="QR Code PIX" style={{ width: '200px', height: '200px', margin: '0 auto', display: 'block' }} />
            <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px' }}>Escaneie o QR Code com o app do seu banco</p>
          </div>
        )}

        {/* CÓDIGO PIX */}
        {codigoPix && (
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', marginBottom: '20px' }}>
            <p style={{ fontSize: '14px', fontWeight: 'bold' }}>📋 Código PIX para copiar</p>
            <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '12px', marginBottom: '12px', wordBreak: 'break-all' }}>
              <code style={{ fontSize: '11px', fontFamily: 'monospace' }}>{codigoPix}</code>
            </div>
            <button onClick={copiarCodigo} style={{ width: '100%', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
              {copiado ? '✅ Copiado!' : '📋 Copiar código PIX'}
            </button>
          </div>
        )}

        {/* ENVIO DE COMPROVANTE */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>📎 Envio do comprovante</h3>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>Após pagar, anexe o comprovante.</p>
          <input type="file" accept="image/*,application/pdf" onChange={(e) => setArquivo(e.target.files?.[0] || null)} style={{ marginBottom: '12px', display: 'block' }} />
          <button onClick={handleUpload} disabled={enviando || !arquivo} style={{ width: '100%', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '12px', cursor: 'pointer', opacity: enviando || !arquivo ? 0.6 : 1 }}>
            {enviando ? 'Enviando...' : '📤 Enviar comprovante'}
          </button>
        </div>

        {mensagem && (
          <div style={{ padding: '12px', borderRadius: '12px', textAlign: 'center', marginTop: '20px', backgroundColor: mensagem.includes('✅') ? '#dcfce7' : '#fee2e2', color: mensagem.includes('✅') ? '#16a34a' : '#dc2626' }}>
            {mensagem}
          </div>
        )}
      </div>
    </div>
  )
}