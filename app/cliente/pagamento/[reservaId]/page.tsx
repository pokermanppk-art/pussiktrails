'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'

type AnyObject = Record<string, any>

export default function PagamentoPIX() {
  const params = useParams()
  const reservaId = params.reservaId as string

  const carregouRef = useRef(false)

  const [carregando, setCarregando] = useState(true)
  const [qrCode, setQrCode] = useState('')
  const [codigoPix, setCodigoPix] = useState('')
  const [valor, setValor] = useState(0)
  const [roteiroTitulo, setRoteiroTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (!reservaId) return

    if (carregouRef.current) return
    carregouRef.current = true

    carregarPagamento()
  }, [reservaId])

  const buscarReserva = async () => {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', reservaId)
      .maybeSingle()

    if (error) {
      console.log('Erro detalhado ao buscar reserva:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })

      throw new Error(
        error.message || 'Erro ao buscar reserva no Supabase.'
      )
    }

    if (!data) {
      throw new Error('Reserva não encontrada.')
    }

    return data
  }

  const buscarRoteiro = async (roteiroId: string | null | undefined) => {
    if (!roteiroId) return null

    const { data, error } = await supabase
      .from('roteiros')
      .select('id, titulo, preco')
      .eq('id', roteiroId)
      .maybeSingle()

    if (error) {
      console.log('Erro ao buscar roteiro:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })

      return null
    }

    return data
  }

  const buscarValorRealDaReserva = (
    reserva: AnyObject,
    roteiro: AnyObject | null
  ) => {
    const quantidadePessoas = Number(
      reserva.quantidade_pessoas ||
      reserva.quantidade ||
      reserva.qtd_pessoas ||
      1
    )

    const precoRoteiro = Number(roteiro?.preco || 0)

    const valorEncontrado = Number(
      reserva.valor_total ??
      reserva.valor ??
      reserva.preco_total ??
      reserva.total ??
      reserva.valor_reserva ??
      reserva.valor_final ??
      (precoRoteiro * quantidadePessoas)
    )

    return valorEncontrado
  }

  const buscarTituloRoteiro = (
    reserva: AnyObject,
    roteiro: AnyObject | null
  ) => {
    return (
      roteiro?.titulo ||
      reserva.roteiro_titulo ||
      reserva.titulo_roteiro ||
      reserva.titulo ||
      'Reserva PrussikTrails'
    )
  }

  const buscarNomeCliente = (reserva: AnyObject) => {
    return (
      reserva.nome_cliente ||
      reserva.cliente_nome ||
      reserva.nome ||
      reserva.responsavel_nome ||
      'Cliente PrussikTrails'
    )
  }

  const buscarEmailCliente = (reserva: AnyObject) => {
    return (
      reserva.email_cliente ||
      reserva.cliente_email ||
      reserva.email ||
      reserva.responsavel_email ||
      'cliente@prussiktrails.com.br'
    )
  }

  const isPossivelPixCopiaCola = (value: string) => {
    const texto = value.trim()

    if (!texto) return false

    return (
      texto.startsWith('000201') ||
      texto.includes('BR.GOV.BCB.PIX') ||
      texto.includes('pix') ||
      texto.includes('PIX')
    )
  }

  const isPossivelImagemBase64 = (value: string) => {
    const texto = value.trim()

    if (!texto) return false

    return (
      texto.startsWith('data:image') ||
      texto.startsWith('iVBOR') ||
      texto.startsWith('/9j/') ||
      texto.length > 500
    )
  }

  const procurarCampoRecursivo = (
    obj: any,
    tipo: 'qr' | 'pix'
  ): string => {
    if (!obj) return ''

    if (typeof obj === 'string') {
      if (tipo === 'pix' && isPossivelPixCopiaCola(obj)) {
        return obj
      }

      if (tipo === 'qr' && isPossivelImagemBase64(obj)) {
        return obj
      }

      return ''
    }

    if (typeof obj !== 'object') return ''

    const prioridadePix = [
      'qr_code_text',
      'pix_code',
      'pix_copia_cola',
      'codigo_pix',
      'emv',
      'copy_paste',
      'copia_cola',
      'pix',
      'qrcode_text',
      'qrCodeText'
    ]

    const prioridadeQr = [
      'qr_code_base64',
      'qrcode_base64',
      'pix_qr_code_base64',
      'pix_qrcode_base64',
      'pix_qr_code',
      'pix_qrcode',
      'qrcode_image',
      'qr_code',
      'qrcode',
      'qrCode',
      'qrCodeBase64'
    ]

    const prioridades = tipo === 'pix' ? prioridadePix : prioridadeQr

    for (const chave of prioridades) {
      const valor = obj[chave]

      if (typeof valor === 'string') {
        if (tipo === 'pix' && isPossivelPixCopiaCola(valor)) {
          return valor
        }

        if (tipo === 'qr' && isPossivelImagemBase64(valor)) {
          return valor
        }
      }
    }

    for (const key of Object.keys(obj)) {
      const encontrado = procurarCampoRecursivo(obj[key], tipo)

      if (encontrado) return encontrado
    }

    return ''
  }

  const montarImagemQrCode = (qrRecebido: string, pixRecebido: string) => {
    if (qrRecebido) {
      let qrCodeFormatado = String(qrRecebido)

      if (
        !qrCodeFormatado.startsWith('data:image') &&
        !qrCodeFormatado.startsWith('http')
      ) {
        qrCodeFormatado = `data:image/png;base64,${qrCodeFormatado}`
      }

      return qrCodeFormatado
    }

    if (pixRecebido) {
      return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
        pixRecebido
      )}`
    }

    return ''
  }

  const carregarPagamento = async () => {
    try {
      setCarregando(true)
      setMensagem('')
      setQrCode('')
      setCodigoPix('')

      const reserva = await buscarReserva()

      console.log('Reserva encontrada:', reserva)

      const roteiro = await buscarRoteiro(reserva.roteiro_id)

      console.log('Roteiro encontrado:', roteiro)

      const valorRealReserva = buscarValorRealDaReserva(reserva, roteiro)

      if (!valorRealReserva || valorRealReserva <= 0) {
        throw new Error(
          'Valor da reserva inválido. Não foi possível gerar o PIX.'
        )
      }

      const titulo = buscarTituloRoteiro(reserva, roteiro)
      const nomeCliente = buscarNomeCliente(reserva)
      const emailCliente = buscarEmailCliente(reserva)

      setValor(valorRealReserva)
      setRoteiroTitulo(titulo)

      console.log('Dados enviados para criação do PIX:', {
        reservaId: reserva.id,
        valor: valorRealReserva,
        nome: nomeCliente,
        email: emailCliente
      })

      const response = await fetch('/api/paghiper/create-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reservaId: reserva.id,
          valor: valorRealReserva,
          nome: nomeCliente,
          email: emailCliente
        })
      })

      const data = await response.json()

      console.log('Resposta PagHiper no front:')
      console.log(JSON.stringify(data, null, 2))

      if (!response.ok) {
        throw new Error(
          data?.message ||
          data?.error ||
          data?.details?.message ||
          'Erro ao gerar PIX.'
        )
      }

      const qrCodeRecebido = procurarCampoRecursivo(data, 'qr')
      const codigoPixRecebido = procurarCampoRecursivo(data, 'pix')

      console.log('QR Code encontrado:', qrCodeRecebido ? 'SIM' : 'NÃO')
      console.log('Código PIX encontrado:', codigoPixRecebido ? 'SIM' : 'NÃO')

      const imagemQr = montarImagemQrCode(
        qrCodeRecebido,
        codigoPixRecebido
      )

      if (imagemQr) {
        setQrCode(imagemQr)
      }

      if (codigoPixRecebido) {
        setCodigoPix(String(codigoPixRecebido))
      }

      if (!imagemQr && !codigoPixRecebido) {
        setMensagem(
          'Cobrança criada, mas o QR Code PIX não foi localizado na resposta da API. Copie a resposta do console "Resposta PagHiper no front" e me envie.'
        )
      }

    } catch (err: any) {
      console.log('Erro ao carregar pagamento:', err)

      setMensagem(
        err?.message || 'Erro ao gerar pagamento PIX.'
      )

    } finally {
      setCarregando(false)
    }
  }

  const copiarCodigo = async () => {
    try {
      if (!codigoPix) {
        setMensagem('Código PIX não disponível.')
        return
      }

      await navigator.clipboard.writeText(codigoPix)

      setCopiado(true)

      setTimeout(() => {
        setCopiado(false)
      }, 3000)

    } catch (err) {
      console.log('Erro ao copiar PIX:', err)
      setMensagem('Erro ao copiar código PIX.')
    }
  }

  const handleUpload = async () => {
    if (!arquivo) {
      setMensagem('Selecione um comprovante.')
      return
    }

    setEnviando(true)
    setMensagem('')

    try {
      const fileExt = arquivo.name.split('.').pop()

      const fileName =
        `${reservaId}_${uuidv4()}.${fileExt}`

      const filePath =
        `comprovantes/${fileName}`

      const { error: uploadError } =
        await supabase.storage
          .from('comprovantes')
          .upload(filePath, arquivo)

      if (uploadError) {
        throw uploadError
      }

      const {
        data: { publicUrl }
      } = supabase.storage
        .from('comprovantes')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('reservas')
        .update({
          comprovante_url: publicUrl,
          comprovante_status: 'enviado',
          pagamento_status: 'aguardando_aprovacao'
        })
        .eq('id', reservaId)

      if (updateError) {
        throw updateError
      }

      setMensagem('✅ Comprovante enviado com sucesso!')

    } catch (err) {
      console.log('Erro ao enviar comprovante:', err)

      setMensagem('❌ Erro ao enviar comprovante.')

    } finally {
      setEnviando(false)
    }
  }

  if (carregando) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f3f4f6'
        }}
      >
        <style jsx global>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #16a34a',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }}
          />

          <p style={{ color: '#6b7280' }}>
            Gerando PIX...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f3f4f6',
        padding: '20px'
      }}
    >
      <div
        style={{
          maxWidth: '500px',
          margin: '0 auto'
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}
        >
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '10px',
              color: '#111827'
            }}
          >
            💳 Pagamento PIX
          </h1>

          <p
            style={{
              color: '#6b7280',
              marginBottom: '24px'
            }}
          >
            {roteiroTitulo || 'Reserva PrussikTrails'}
          </p>

          <div
            style={{
              textAlign: 'center',
              marginBottom: '24px'
            }}
          >
            <div
              style={{
                fontSize: '36px',
                fontWeight: 'bold',
                color: '#16a34a'
              }}
            >
              R$ {valor.toFixed(2)}
            </div>
          </div>

          {qrCode && (
            <div
              style={{
                textAlign: 'center',
                marginBottom: '24px'
              }}
            >
              <img
                src={qrCode}
                alt="QR Code PIX"
                style={{
                  width: '250px',
                  height: '250px',
                  borderRadius: '20px',
                  border: '1px solid #e5e7eb'
                }}
              />
            </div>
          )}

          {codigoPix && (
            <>
              <div
                style={{
                  backgroundColor: '#f9fafb',
                  borderRadius: '16px',
                  padding: '14px',
                  marginBottom: '16px',
                  wordBreak: 'break-all',
                  fontSize: '12px',
                  color: '#374151'
                }}
              >
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
                  padding: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginBottom: '24px'
                }}
              >
                {copiado
                  ? '✅ PIX Copiado'
                  : '📋 Copiar Código PIX'}
              </button>
            </>
          )}

          {!qrCode && !codigoPix && !mensagem && (
            <div
              style={{
                padding: '14px',
                borderRadius: '16px',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                textAlign: 'center',
                marginBottom: '20px'
              }}
            >
              Não foi possível carregar o QR Code PIX neste momento.
            </div>
          )}

          <div
            style={{
              borderTop: '1px solid #e5e7eb',
              paddingTop: '20px'
            }}
          >
            <h3
              style={{
                marginBottom: '10px',
                color: '#111827'
              }}
            >
              📎 Enviar comprovante
            </h3>

            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) =>
                setArquivo(
                  e.target.files?.[0] || null
                )
              }
              style={{
                marginBottom: '16px'
              }}
            />

            <button
              onClick={handleUpload}
              disabled={enviando}
              style={{
                width: '100%',
                backgroundColor: enviando ? '#6b7280' : '#111827',
                color: 'white',
                border: 'none',
                borderRadius: '40px',
                padding: '14px',
                fontWeight: 'bold',
                cursor: enviando ? 'not-allowed' : 'pointer'
              }}
            >
              {enviando
                ? 'Enviando...'
                : '📤 Enviar comprovante'}
            </button>
          </div>

          {mensagem && (
            <div
              style={{
                marginTop: '20px',
                padding: '14px',
                borderRadius: '16px',
                backgroundColor:
                  mensagem.includes('✅')
                    ? '#dcfce7'
                    : '#fee2e2',
                color:
                  mensagem.includes('✅')
                    ? '#166534'
                    : '#991b1b',
                textAlign: 'center',
                fontSize: '13px'
              }}
            >
              {mensagem}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}