'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Reserva = {
  id: string
  cliente_id?: string
  roteiro_id?: string
  valor_total?: number | null
  status?: string | null
  pagamento_status?: string | null
  paghiper_order_id?: string | null
  paghiper_transaction_id?: string | null
  pix_qr_code?: string | null
  pix_copia_cola?: string | null
  qr_code_base64?: string | null
  codigo_pix?: string | null
  created_at?: string | null
}

type Roteiro = {
  id: string
  titulo?: string | null
  preco?: number | null
}

type Cliente = {
  id: string
  nome?: string | null
  email?: string | null
  telefone?: string | null
  cpf?: string | null
}

export default function PagamentoPIXPage() {
  const params = useParams()
  const router = useRouter()

  const reservaId = String(params?.reservaId || '')

  const carregouRef = useRef(false)
  const redirecionouRef = useRef(false)

  const [carregando, setCarregando] = useState(true)
  const [gerandoPix, setGerandoPix] = useState(false)
  const [verificandoPagamento, setVerificandoPagamento] = useState(false)

  const [qrCode, setQrCode] = useState('')
  const [codigoPix, setCodigoPix] = useState('')

  const [valor, setValor] = useState(0)
  const [roteiroTitulo, setRoteiroTitulo] = useState('Reserva PrussikTrails')
  const [pagamentoStatus, setPagamentoStatus] = useState('pendente')
  const [reservaStatus, setReservaStatus] = useState('pendente')

  const [mensagem, setMensagem] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (!reservaId) return

    if (carregouRef.current) return
    carregouRef.current = true

    carregarPagamento()
  }, [reservaId])

  useEffect(() => {
    if (!reservaId) return

    const interval = setInterval(() => {
      consultarStatusReserva(false)
    }, 5000)

    return () => clearInterval(interval)
  }, [reservaId])

  const parseJsonSeguro = async (response: Response) => {
    const texto = await response.text()

    try {
      return JSON.parse(texto)
    } catch {
      throw new Error(
        `A rota retornou uma resposta inválida. Status ${response.status}. Verifique se a API existe e não está retornando HTML/404.`
      )
    }
  }

  const procurarCampoRecursivo = (obj: any, nomes: string[]): string => {
    if (!obj || typeof obj !== 'object') return ''

    for (const nome of nomes) {
      const valor = obj[nome]

      if (typeof valor === 'string' && valor.trim()) {
        return valor
      }

      if (typeof valor === 'number') {
        return String(valor)
      }
    }

    for (const key of Object.keys(obj)) {
      const encontrado = procurarCampoRecursivo(obj[key], nomes)

      if (encontrado) return encontrado
    }

    return ''
  }

  const formatarQrCode = (valorQr: string) => {
    if (!valorQr) return ''

    if (valorQr.startsWith('data:image')) {
      return valorQr
    }

    return `data:image/png;base64,${valorQr}`
  }

  const buscarReserva = async () => {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', reservaId)
      .maybeSingle()

    if (error) {
      console.error('Erro ao buscar reserva:', error)
      throw new Error('Erro ao buscar reserva.')
    }

    if (!data) {
      throw new Error('Reserva não encontrada.')
    }

    return data as Reserva
  }

  const buscarRoteiro = async (roteiroId?: string | null) => {
    if (!roteiroId) return null

    const { data, error } = await supabase
      .from('roteiros')
      .select('id, titulo, preco')
      .eq('id', roteiroId)
      .maybeSingle()

    if (error) {
      console.warn('Erro ao buscar roteiro:', error)
      return null
    }

    return data as Roteiro | null
  }

  const buscarCliente = async (clienteId?: string | null) => {
    if (!clienteId) return null

    const { data, error } = await supabase
      .from('users')
      .select('id, nome, email, telefone, cpf')
      .eq('id', clienteId)
      .maybeSingle()

    if (error) {
      console.warn('Erro ao buscar cliente:', error)
      return null
    }

    return data as Cliente | null
  }

  const consultarStatusReserva = async (mostrarLoading = true) => {
    if (!reservaId || redirecionouRef.current) return

    if (mostrarLoading) {
      setVerificandoPagamento(true)
    }

    try {
      const { data, error } = await supabase
        .from('reservas')
        .select('id, status, pagamento_status, chat_id')
        .eq('id', reservaId)
        .maybeSingle()

      if (error) {
        console.warn('Erro ao consultar status da reserva:', error)
        return
      }

      if (!data) return

      const novoPagamentoStatus = String(data.pagamento_status || 'pendente')
      const novoReservaStatus = String(data.status || 'pendente')

      setPagamentoStatus(novoPagamentoStatus)
      setReservaStatus(novoReservaStatus)

      const pagamentoConfirmado =
        novoPagamentoStatus === 'pago' ||
        novoPagamentoStatus === 'confirmado' ||
        novoReservaStatus === 'confirmada'

      if (pagamentoConfirmado && !redirecionouRef.current) {
        redirecionouRef.current = true

        setMensagem(
          '✅ Pagamento confirmado! Estamos redirecionando você para suas reservas.'
        )

        setTimeout(() => {
          router.replace('/cliente/minhas-reservas?pagamento=confirmado')
        }, 1800)
      }
    } catch (error) {
      console.warn('Erro ao verificar pagamento:', error)
    } finally {
      setVerificandoPagamento(false)
    }
  }

  const carregarPagamento = async () => {
    setCarregando(true)
    setMensagem('')

    try {
      const reserva = await buscarReserva()

      const statusPagamentoInicial = String(
        reserva.pagamento_status || 'pendente'
      )

      setPagamentoStatus(statusPagamentoInicial)
      setReservaStatus(String(reserva.status || 'pendente'))

      const pagamentoJaConfirmado =
        statusPagamentoInicial === 'pago' ||
        statusPagamentoInicial === 'confirmado' ||
        reserva.status === 'confirmada'

      if (pagamentoJaConfirmado) {
        setMensagem(
          '✅ Esta reserva já está com pagamento confirmado. Redirecionando...'
        )

        redirecionouRef.current = true

        setTimeout(() => {
          router.replace('/cliente/minhas-reservas?pagamento=confirmado')
        }, 1200)

        return
      }

      const roteiro = await buscarRoteiro(reserva.roteiro_id)
      const cliente = await buscarCliente(reserva.cliente_id)

      const tituloRoteiro =
        roteiro?.titulo ||
        'Reserva PrussikTrails'

      const valorReserva =
        Number(reserva.valor_total || 0) ||
        Number(roteiro?.preco || 0) ||
        0

      setRoteiroTitulo(tituloRoteiro)
      setValor(valorReserva)

      const qrSalvo =
        reserva.qr_code_base64 ||
        reserva.pix_qr_code ||
        ''

      const codigoSalvo =
        reserva.pix_copia_cola ||
        reserva.codigo_pix ||
        ''

      if (qrSalvo) {
        setQrCode(formatarQrCode(qrSalvo))
      }

      if (codigoSalvo) {
        setCodigoPix(codigoSalvo)
      }

      if (qrSalvo || codigoSalvo) {
        return
      }

      await gerarPix({
        reserva,
        roteiro,
        cliente,
        valorReserva,
        tituloRoteiro
      })
    } catch (error: any) {
      console.error('Erro ao carregar pagamento:', error)

      setMensagem(
        error?.message || 'Erro ao carregar pagamento PIX.'
      )
    } finally {
      setCarregando(false)
    }
  }

  const gerarPix = async ({
    reserva,
    roteiro,
    cliente,
    valorReserva,
    tituloRoteiro
  }: {
    reserva: Reserva
    roteiro: Roteiro | null
    cliente: Cliente | null
    valorReserva: number
    tituloRoteiro: string
  }) => {
    setGerandoPix(true)

    try {
      if (!valorReserva || valorReserva <= 0) {
        throw new Error('Valor da reserva inválido para gerar PIX.')
      }

      const response = await fetch('/api/paghiper/create-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reservaId: reserva.id,
          reserva_id: reserva.id,
          order_id: reserva.paghiper_order_id || `RESERVA-${reserva.id}`,
          valor: valorReserva,
          descricao: `Reserva PrussikTrails - ${tituloRoteiro}`,
          roteiro: {
            id: roteiro?.id || reserva.roteiro_id || null,
            titulo: tituloRoteiro
          },
          cliente: {
            id: cliente?.id || reserva.cliente_id || null,
            nome: cliente?.nome || 'Cliente PrussikTrails',
            email: cliente?.email || 'cliente@prussiktrails.com',
            telefone: cliente?.telefone || '',
            cpf: cliente?.cpf || ''
          }
        })
      })

      const data = await parseJsonSeguro(response)

      console.log('Resposta PagHiper create-pix:', data)

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            data?.details ||
            'Erro ao gerar PIX PagHiper.'
        )
      }

      const qrCodeBase64 = procurarCampoRecursivo(data, [
        'qr_code_base64',
        'qrCodeBase64',
        'pix_qr_code_base64',
        'qrcode_base64',
        'qrcode_image',
        'pix_qrcode',
        'qr_code'
      ])

      const codigoPixRecebido = procurarCampoRecursivo(data, [
        'qr_code_text',
        'qrCodeText',
        'pix_copia_cola',
        'codigo_pix',
        'copy_paste',
        'emv',
        'pix_code',
        'qrcode'
      ])

      if (qrCodeBase64) {
        setQrCode(formatarQrCode(qrCodeBase64))
      }

      if (codigoPixRecebido) {
        setCodigoPix(codigoPixRecebido)
      }

      if (!qrCodeBase64 && !codigoPixRecebido) {
        setMensagem(
          'Cobrança criada, mas o QR Code PIX não foi retornado pela API. Aguarde alguns segundos ou verifique a reserva no painel.'
        )
      }
    } catch (error: any) {
      console.error('Erro ao gerar PIX:', error)

      setMensagem(
        error?.message || 'Erro ao gerar pagamento PIX.'
      )
    } finally {
      setGerandoPix(false)
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
      setMensagem('✅ Código PIX copiado.')

      setTimeout(() => {
        setCopiado(false)
      }, 3000)
    } catch {
      setMensagem('Erro ao copiar código PIX.')
    }
  }

  if (carregando) {
    return (
      <main className="loadingPage">
        <style>{`
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            background: #f3f4f6;
            font-family:
              Inter,
              ui-sans-serif,
              system-ui,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .loadingPage {
            min-height: 100vh;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f3f4f6;
            color: #374151;
            padding: 20px;
          }

          .spinner {
            width: 52px;
            height: 52px;
            border-radius: 999px;
            border: 4px solid #e5e7eb;
            border-top-color: #16a34a;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }

          .loadingCard {
            text-align: center;
            background: #ffffff;
            border-radius: 24px;
            padding: 28px;
            box-shadow: 0 1px 8px rgba(0,0,0,0.08);
          }
        `}</style>

        <div className="loadingCard">
          <div className="spinner" />
          <p>Carregando pagamento PIX...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f3f4f6;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .page {
          min-height: 100vh;
          min-height: 100dvh;
          background:
            radial-gradient(circle at top left, rgba(22, 163, 74, 0.10), transparent 30%),
            linear-gradient(180deg, #f9fafb 0%, #eef2f7 100%);
          padding: 18px;
          color: #111827;
        }

        .container {
          max-width: 520px;
          margin: 0 auto;
        }

        .topActions {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 14px;
        }

        .smallButton {
          border: none;
          border-radius: 999px;
          padding: 9px 14px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          background: #ffffff;
          color: #374151;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }

        .card {
          background: #ffffff;
          border-radius: 28px;
          padding: 24px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          border: 1px solid #eef2f7;
        }

        .title {
          font-size: 24px;
          font-weight: 900;
          margin: 0 0 8px;
          color: #111827;
        }

        .subtitle {
          color: #6b7280;
          font-size: 14px;
          line-height: 1.5;
          margin: 0 0 22px;
        }

        .valueBox {
          text-align: center;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 22px;
          padding: 18px;
          margin-bottom: 20px;
        }

        .valueLabel {
          font-size: 11px;
          font-weight: 900;
          color: #166534;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 6px;
        }

        .value {
          font-size: 36px;
          font-weight: 900;
          color: #16a34a;
        }

        .qrBox {
          text-align: center;
          margin-bottom: 20px;
        }

        .qrBox img {
          width: 250px;
          max-width: 100%;
          height: 250px;
          object-fit: contain;
          border-radius: 22px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          padding: 10px;
        }

        .pixCode {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 14px;
          margin-bottom: 14px;
          word-break: break-all;
          font-size: 12px;
          line-height: 1.5;
          color: #374151;
        }

        .mainButton {
          width: 100%;
          border: none;
          border-radius: 999px;
          padding: 14px;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          background: #16a34a;
          color: #ffffff;
          margin-bottom: 14px;
        }

        .secondaryButton {
          width: 100%;
          border: none;
          border-radius: 999px;
          padding: 13px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          background: #111827;
          color: #ffffff;
          margin-bottom: 14px;
        }

        .statusBox {
          border-top: 1px solid #e5e7eb;
          padding-top: 18px;
          margin-top: 18px;
        }

        .statusGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 14px;
        }

        .statusItem {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 12px;
        }

        .statusLabel {
          font-size: 10px;
          font-weight: 900;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 4px;
        }

        .statusValue {
          font-size: 13px;
          font-weight: 900;
          color: #111827;
        }

        .infoBox {
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
          border-radius: 18px;
          padding: 14px;
          font-size: 13px;
          line-height: 1.5;
          margin-top: 14px;
        }

        .warningBox {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
          border-radius: 18px;
          padding: 14px;
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 16px;
          text-align: center;
        }

        .message {
          margin-top: 16px;
          padding: 14px;
          border-radius: 18px;
          font-size: 13px;
          line-height: 1.5;
          text-align: center;
        }

        .message.success {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .message.error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .pending {
          color: #92400e;
        }

        .paid {
          color: #166534;
        }

        @media (max-width: 520px) {
          .page {
            padding: 12px;
          }

          .card {
            border-radius: 24px;
            padding: 18px;
          }

          .title {
            font-size: 22px;
          }

          .value {
            font-size: 32px;
          }

          .statusGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="container">
        <div className="topActions">
          <button
            type="button"
            className="smallButton"
            onClick={() => router.replace('/cliente/minhas-reservas')}
          >
            ← Minhas reservas
          </button>

          <button
            type="button"
            className="smallButton"
            onClick={() => consultarStatusReserva(true)}
          >
            Atualizar status
          </button>
        </div>

        <section className="card">
          <h1 className="title">Pagamento PIX</h1>

          <p className="subtitle">
            {roteiroTitulo}
          </p>

          <div className="valueBox">
            <div className="valueLabel">Valor da reserva</div>
            <div className="value">
              R$ {valor.toFixed(2)}
            </div>
          </div>

          {gerandoPix && (
            <div className="warningBox">
              Gerando cobrança PIX. Aguarde alguns segundos...
            </div>
          )}

          {qrCode && (
            <div className="qrBox">
              <img src={qrCode} alt="QR Code PIX" />
            </div>
          )}

          {codigoPix && (
            <>
              <div className="pixCode">
                {codigoPix}
              </div>

              <button
                type="button"
                className="mainButton"
                onClick={copiarCodigo}
              >
                {copiado ? '✅ Código PIX copiado' : '📋 Copiar código PIX'}
              </button>
            </>
          )}

          {!qrCode && !codigoPix && !gerandoPix && (
            <div className="warningBox">
              Não foi possível carregar o QR Code PIX neste momento.
            </div>
          )}

          <button
            type="button"
            className="secondaryButton"
            onClick={() => consultarStatusReserva(true)}
            disabled={verificandoPagamento}
          >
            {verificandoPagamento
              ? 'Verificando pagamento...'
              : 'Já paguei, verificar agora'}
          </button>

          <div className="statusBox">
            <div className="statusGrid">
              <div className="statusItem">
                <div className="statusLabel">Pagamento</div>
                <div
                  className={`statusValue ${
                    pagamentoStatus === 'pago' ? 'paid' : 'pending'
                  }`}
                >
                  {pagamentoStatus}
                </div>
              </div>

              <div className="statusItem">
                <div className="statusLabel">Reserva</div>
                <div
                  className={`statusValue ${
                    reservaStatus === 'confirmada' ? 'paid' : 'pending'
                  }`}
                >
                  {reservaStatus}
                </div>
              </div>
            </div>

            <div className="infoBox">
              Assim que a PagHiper confirmar o pagamento, esta tela será fechada
              automaticamente e você voltará para suas reservas. Isso evita
              pagamento duplicado.
            </div>
          </div>

          {mensagem && (
            <div
              className={`message ${
                mensagem.includes('✅') ? 'success' : 'error'
              }`}
            >
              {mensagem}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}