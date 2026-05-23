'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'

type AnyObject = Record<string, any>

export default function PagamentoPIX() {
  const params = useParams()
  const router = useRouter()
  const reservaId = params.reservaId as string

  const carregouRef = useRef(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const [carregando, setCarregando] = useState(true)
  const [qrCode, setQrCode] = useState('')
  const [codigoPix, setCodigoPix] = useState('')
  const [valor, setValor] = useState(0)
  const [roteiroTitulo, setRoteiroTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [pagamentoConfirmado, setPagamentoConfirmado] = useState(false)

  useEffect(() => {
    if (!reservaId) return

    if (carregouRef.current) return

    carregouRef.current = true
    carregarPagamento()
    iniciarPollingPagamento()

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [reservaId])

  const iniciarPollingPagamento = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }

    pollingRef.current = setInterval(() => {
      verificarStatusPagamento()
    }, 5000)
  }

  const finalizarTelaPagamento = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }

    setPagamentoConfirmado(true)
    setMensagem('✅ Pagamento confirmado! Redirecionando para suas reservas...')

    setTimeout(() => {
      router.push('/cliente/minhas-reservas')
    }, 2500)
  }

  const buscarReserva = async () => {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', reservaId)
      .maybeSingle()

    if (error) {
      throw error
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
      .select('*')
      .eq('id', roteiroId)
      .maybeSingle()

    if (error) {
      console.warn('Erro ao buscar roteiro:', error)
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
      roteiro?.nome ||
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
      'pix_code',
      'pix_copia_cola',
      'codigo_pix',
      'qr_code_text',
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
      return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        pixRecebido
      )}`
    }

    return ''
  }

  const preencherPixNaTela = (
    reserva: AnyObject,
    respostaApi?: AnyObject
  ) => {
    const pixSalvo =
      reserva.paghiper_pix_code ||
      respostaApi?.pix_code ||
      procurarCampoRecursivo(respostaApi, 'pix')

    const qrSalvo =
      reserva.paghiper_qrcode_base64 ||
      respostaApi?.qr_code_base64 ||
      procurarCampoRecursivo(respostaApi, 'qr')

    const imagemQr = montarImagemQrCode(qrSalvo || '', pixSalvo || '')

    if (imagemQr) {
      setQrCode(imagemQr)
    }

    if (pixSalvo) {
      setCodigoPix(String(pixSalvo))
    }

    if (!imagemQr && !pixSalvo) {
      setMensagem(
        'PIX criado, mas o QR Code não foi localizado na resposta.'
      )
    }
  }

  const verificarStatusPagamento = async () => {
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select('id, pagamento_status')
        .eq('id', reservaId)
        .maybeSingle()

      if (error || !data) return

      if (data.pagamento_status === 'pago') {
        finalizarTelaPagamento()
      }
    } catch (error) {
      console.warn('Erro ao verificar status de pagamento:', error)
    }
  }

  const carregarPagamento = async () => {
    try {
      setCarregando(true)
      setMensagem('')
      setQrCode('')
      setCodigoPix('')

      const reserva = await buscarReserva()

      if (reserva.pagamento_status === 'pago') {
        finalizarTelaPagamento()
        return
      }

      const roteiroId =
        reserva.roteiro_id ||
        reserva.id_roteiro ||
        null

      const roteiro = await buscarRoteiro(roteiroId)

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

      if (reserva.paghiper_pix_code || reserva.paghiper_qrcode_base64) {
        preencherPixNaTela(reserva)
        setCarregando(false)
        return
      }

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

      if (!response.ok) {
        throw new Error(
          data?.message ||
          data?.error ||
          data?.details?.message ||
          'Erro ao gerar PIX.'
        )
      }

      if (data?.alreadyPaid) {
        finalizarTelaPagamento()
        return
      }

      preencherPixNaTela(reserva, data)

    } catch (err: any) {
      console.error('Erro ao carregar pagamento:', err)

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
      <div className="pagamento-loading">
        <style jsx global>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .pagamento-loading {
            min-height: 100vh;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f3f4f6;
            padding: 20px;
          }

          .spinner-pix {
            width: 50px;
            height: 50px;
            border-radius: 999px;
            border: 4px solid #e5e7eb;
            border-top: 4px solid #16a34a;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }
        `}</style>

        <div style={{ textAlign: 'center' }}>
          <div className="spinner-pix" />

          <p style={{ color: '#6b7280' }}>
            Gerando PIX...
          </p>
        </div>
      </div>
    )
  }

  if (pagamentoConfirmado) {
    return (
      <div className="pagamento-confirmado">
        <style jsx global>{`
          .pagamento-confirmado {
            min-height: 100vh;
            min-height: 100dvh;
            background: #f3f4f6;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }

          .confirmado-card {
            width: 100%;
            max-width: 460px;
            background: white;
            border-radius: 24px;
            padding: 28px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          }
        `}</style>

        <div className="confirmado-card">
          <div style={{ fontSize: 54, marginBottom: 12 }}>
            ✅
          </div>

          <h1 style={{ color: '#16a34a', margin: '0 0 8px' }}>
            Pagamento confirmado
          </h1>

          <p style={{ color: '#6b7280', margin: 0 }}>
            Estamos atualizando sua reserva e redirecionando você.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        .pagamento-page {
          min-height: 100vh;
          min-height: 100dvh;
          background-color: #f3f4f6;
          padding: 20px;
        }

        .pagamento-container {
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
        }

        .pagamento-card {
          background-color: #ffffff;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        .pagamento-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 10px;
          color: #111827;
          line-height: 1.2;
        }

        .pagamento-subtitle {
          color: #6b7280;
          margin-bottom: 24px;
          font-size: 15px;
          line-height: 1.4;
        }

        .pagamento-valor-box {
          text-align: center;
          margin-bottom: 24px;
        }

        .pagamento-valor {
          font-size: 36px;
          font-weight: 800;
          color: #16a34a;
          line-height: 1.1;
        }

        .qr-wrapper {
          text-align: center;
          margin-bottom: 24px;
        }

        .qr-image {
          width: min(260px, 78vw);
          height: min(260px, 78vw);
          max-width: 100%;
          border-radius: 20px;
          border: 1px solid #e5e7eb;
          object-fit: contain;
          background: #ffffff;
        }

        .codigo-pix-box {
          background-color: #f9fafb;
          border-radius: 16px;
          padding: 14px;
          margin-bottom: 16px;
          word-break: break-all;
          overflow-wrap: anywhere;
          font-size: 12px;
          color: #374151;
          max-height: 160px;
          overflow-y: auto;
          line-height: 1.45;
        }

        .botao-verde {
          width: 100%;
          background-color: #16a34a;
          color: #ffffff;
          border: none;
          border-radius: 40px;
          padding: 15px 18px;
          font-weight: 700;
          cursor: pointer;
          margin-bottom: 24px;
          font-size: 15px;
          min-height: 50px;
        }

        .upload-section {
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
        }

        .upload-title {
          margin-bottom: 10px;
          color: #111827;
          font-size: 17px;
          font-weight: 700;
        }

        .upload-input {
          width: 100%;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .botao-preto {
          width: 100%;
          background-color: #111827;
          color: #ffffff;
          border: none;
          border-radius: 40px;
          padding: 15px 18px;
          font-weight: 700;
          cursor: pointer;
          font-size: 15px;
          min-height: 50px;
        }

        .botao-preto:disabled {
          background-color: #6b7280;
          cursor: not-allowed;
        }

        .mensagem-box {
          margin-top: 20px;
          padding: 14px;
          border-radius: 16px;
          text-align: center;
          font-size: 13px;
          line-height: 1.4;
        }

        .mensagem-sucesso {
          background-color: #dcfce7;
          color: #166534;
        }

        .mensagem-erro {
          background-color: #fee2e2;
          color: #991b1b;
        }

        .alerta-pix {
          padding: 14px;
          border-radius: 16px;
          background-color: #fef3c7;
          color: #92400e;
          text-align: center;
          margin-bottom: 20px;
          font-size: 13px;
          line-height: 1.4;
        }

        .status-info {
          background: #eff6ff;
          color: #1d4ed8;
          padding: 12px 14px;
          border-radius: 16px;
          font-size: 13px;
          text-align: center;
          margin-bottom: 18px;
        }

        @media (max-width: 480px) {
          .pagamento-page {
            padding: 12px;
          }

          .pagamento-card {
            border-radius: 20px;
            padding: 18px;
          }

          .pagamento-title {
            font-size: 22px;
          }

          .pagamento-subtitle {
            font-size: 14px;
            margin-bottom: 20px;
          }

          .pagamento-valor {
            font-size: 32px;
          }

          .qr-image {
            width: min(245px, 82vw);
            height: min(245px, 82vw);
            border-radius: 16px;
          }

          .codigo-pix-box {
            font-size: 11px;
            max-height: 130px;
          }

          .botao-verde,
          .botao-preto {
            font-size: 14px;
            padding: 14px 16px;
            min-height: 52px;
          }
        }
      `}</style>

      <div className="pagamento-page">
        <div className="pagamento-container">
          <div className="pagamento-card">
            <h1 className="pagamento-title">
              💳 Pagamento PIX
            </h1>

            <p className="pagamento-subtitle">
              {roteiroTitulo || 'Reserva PrussikTrails'}
            </p>

            <div className="status-info">
              Assim que o PIX for confirmado pela PagHiper, esta tela será encerrada automaticamente.
            </div>

            <div className="pagamento-valor-box">
              <div className="pagamento-valor">
                R$ {valor.toFixed(2)}
              </div>
            </div>

            {qrCode && (
              <div className="qr-wrapper">
                <img
                  src={qrCode}
                  alt="QR Code PIX"
                  className="qr-image"
                />
              </div>
            )}

            {codigoPix && (
              <>
                <div className="codigo-pix-box">
                  {codigoPix}
                </div>

                <button
                  onClick={copiarCodigo}
                  className="botao-verde"
                >
                  {copiado
                    ? '✅ PIX copiado'
                    : '📋 Copiar código PIX'}
                </button>
              </>
            )}

            {!qrCode && !codigoPix && !mensagem && (
              <div className="alerta-pix">
                Não foi possível carregar o QR Code PIX neste momento.
              </div>
            )}

            <div className="upload-section">
              <h3 className="upload-title">
                📎 Enviar comprovante
              </h3>

              <input
                type="file"
                accept="image/*,.pdf"
                className="upload-input"
                onChange={(event) =>
                  setArquivo(
                    event.target.files?.[0] || null
                  )
                }
              />

              <button
                onClick={handleUpload}
                disabled={enviando}
                className="botao-preto"
              >
                {enviando
                  ? 'Enviando...'
                  : '📤 Enviar comprovante'}
              </button>
            </div>

            {mensagem && (
              <div
                className={`mensagem-box ${
                  mensagem.includes('✅')
                    ? 'mensagem-sucesso'
                    : 'mensagem-erro'
                }`}
              >
                {mensagem}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}