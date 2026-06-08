'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type AnyRecord = Record<string, any>

type UsuarioLocal = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
  tipo?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
}

type PixInfo = {
  order_id?: string
  transaction_id?: string
  pix_code?: string
  qr_code_base64?: string
  qr_code_image?: string
  status?: string
}

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function numeroSeguro(valor: unknown, fallback = 0) {
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : fallback
}

function formatarMoeda(valor: unknown) {
  return numeroSeguro(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatarData(valor?: unknown) {
  const raw = texto(valor)
  if (!raw) return 'Data a confirmar'

  const data = raw.length <= 10 ? new Date(`${raw.slice(0, 10)}T12:00:00`) : new Date(raw)
  if (Number.isNaN(data.getTime())) return 'Data a confirmar'

  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatarDataHora(valor?: unknown) {
  const raw = texto(valor)
  if (!raw) return ''

  const data = new Date(raw)
  if (Number.isNaN(data.getTime())) return formatarData(raw)

  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function primeiroTexto(...valores: unknown[]) {
  for (const valor of valores) {
    const item = texto(valor)
    if (item) return item
  }

  return ''
}

function primeiroNumero(...valores: unknown[]) {
  for (const valor of valores) {
    const numero = numeroSeguro(valor, NaN)
    if (Number.isFinite(numero) && numero > 0) return numero
  }

  return 0
}

function tituloRoteiro(roteiro?: AnyRecord | null) {
  return primeiroTexto(roteiro?.titulo, roteiro?.nome, roteiro?.nome_roteiro) || 'Roteiro PrussikTrails'
}

function fotoRoteiro(roteiro?: AnyRecord | null) {
  return primeiroTexto(
    roteiro?.foto_capa,
    roteiro?.foto_url,
    roteiro?.imagem_url,
    roteiro?.image_url,
    roteiro?.capa_url
  )
}

function localRoteiro(roteiro?: AnyRecord | null) {
  return primeiroTexto(
    roteiro?.local,
    roteiro?.localizacao,
    roteiro?.cidade,
    roteiro?.destino,
    roteiro?.endereco_formatado,
    roteiro?.endereco_local,
    roteiro?.ponto_encontro
  ) || 'Local a confirmar'
}

function dataRoteiro(roteiro?: AnyRecord | null, reserva?: AnyRecord | null) {
  return primeiroTexto(
    reserva?.data_trilha,
    reserva?.data_reserva,
    roteiro?.data_disponivel,
    roteiro?.proxima_data,
    roteiro?.data_trilha,
    roteiro?.embarque_data_hora,
    roteiro?.embarque_data,
    roteiro?.data_saida,
    roteiro?.data_inicio,
    roteiro?.data_evento
  )
}

function nomeGuia(guia?: AnyRecord | null, roteiro?: AnyRecord | null) {
  return primeiroTexto(
    guia?.nome_agencia,
    guia?.agencia_nome,
    guia?.empresa_nome,
    guia?.nome_empresa,
    guia?.nome_fantasia,
    guia?.razao_social,
    guia?.empresa,
    guia?.nome,
    guia?.name,
    guia?.email,
    roteiro?.guia_nome,
    roteiro?.nome_guia
  ) || 'Guia PrussikTrails'
}

function guiaIdDoRoteiro(roteiro?: AnyRecord | null) {
  return primeiroTexto(
    roteiro?.id_guia,
    roteiro?.guia_id,
    roteiro?.user_id,
    roteiro?.usuario_id,
    roteiro?.criado_por,
    roteiro?.created_by,
    roteiro?.owner_id
  )
}

function statusLabel(valor?: unknown) {
  const status = normalizar(valor)

  if (!status) return 'Pendente'
  if (status.includes('pago') || status.includes('confirmado')) return 'Pago'
  if (status.includes('cancel')) return 'Cancelado'
  if (status.includes('aguardando')) return 'Aguardando pagamento'
  if (status.includes('pendente')) return 'Pendente'

  return texto(valor)
}

function statusClasse(valor?: unknown) {
  const status = normalizar(valor)

  if (status.includes('pago') || status.includes('confirmado')) return 'paid'
  if (status.includes('cancel')) return 'danger'
  return 'pending'
}

function extrairPixDaReserva(reserva?: AnyRecord | null): PixInfo {
  if (!reserva) return {}

  return {
    order_id: primeiroTexto(reserva.paghiper_order_id, reserva.order_id),
    transaction_id: primeiroTexto(reserva.paghiper_transaction_id, reserva.transaction_id),
    pix_code: primeiroTexto(reserva.paghiper_pix_code, reserva.pix_code, reserva.qr_code_text, reserva.pix_copia_cola),
    qr_code_base64: primeiroTexto(
      reserva.paghiper_qrcode_base64,
      reserva.pix_qrcode,
      reserva.pix_qrcode_base64,
      reserva.qr_code_base64,
      reserva.qrcode_base64
    ),
    qr_code_image: primeiroTexto(reserva.qr_code_image, reserva.qrcode_image, reserva.paghiper_qrcode_image),
    status: primeiroTexto(reserva.paghiper_status, reserva.pagamento_status, reserva.status_pagamento),
  }
}

function normalizarPixResposta(data: AnyRecord): PixInfo {
  const reserva = data?.reserva || {}

  return {
    order_id: primeiroTexto(data?.order_id, reserva?.paghiper_order_id, reserva?.order_id),
    transaction_id: primeiroTexto(data?.transaction_id, reserva?.paghiper_transaction_id, reserva?.transaction_id),
    pix_code: primeiroTexto(
      data?.pix_code,
      data?.qr_code_text,
      data?.pix_copia_cola,
      reserva?.paghiper_pix_code,
      reserva?.pix_code,
      reserva?.qr_code_text
    ),
    qr_code_base64: primeiroTexto(
      data?.qr_code_base64,
      data?.pix_qrcode,
      data?.pix_qrcode_base64,
      data?.qrcode_base64,
      reserva?.paghiper_qrcode_base64,
      reserva?.pix_qrcode,
      reserva?.qr_code_base64
    ),
    qr_code_image: primeiroTexto(data?.qr_code_image, data?.qrcode_image, reserva?.qrcode_image),
    status: primeiroTexto(data?.status, reserva?.paghiper_status, reserva?.pagamento_status),
  }
}

function qrImageSrc(pix: PixInfo) {
  const imagem = primeiroTexto(pix.qr_code_image)
  if (imagem.startsWith('http') || imagem.startsWith('data:image')) return imagem

  const base64 = primeiroTexto(pix.qr_code_base64)
  if (!base64) return ''
  if (base64.startsWith('data:image')) return base64

  return `data:image/png;base64,${base64}`
}

function calcularValorTotal(reserva?: AnyRecord | null, roteiro?: AnyRecord | null) {
  const valorReserva = primeiroNumero(reserva?.valor_total, reserva?.valor, reserva?.preco_total)
  if (valorReserva > 0) return valorReserva

  const quantidade = Math.max(1, Math.floor(numeroSeguro(reserva?.quantidade_pessoas ?? reserva?.quantidade, 1)))
  const preco = primeiroNumero(roteiro?.preco, roteiro?.valor, roteiro?.preco_total, roteiro?.preco_por_pessoa)

  return preco * quantidade
}

export default function ClientePagamentoReservaPage() {
  const params = useParams()
  const router = useRouter()
  const iniciouRef = useRef(false)

  const reservaId = texto(params?.reservaId)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [reserva, setReserva] = useState<AnyRecord | null>(null)
  const [roteiro, setRoteiro] = useState<AnyRecord | null>(null)
  const [guia, setGuia] = useState<AnyRecord | null>(null)
  const [pix, setPix] = useState<PixInfo>({})
  const [carregando, setCarregando] = useState(true)
  const [gerandoPix, setGerandoPix] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [politicaCancelamentoAberta, setPoliticaCancelamentoAberta] = useState(false)

  useEffect(() => {
    if (iniciouRef.current) return
    iniciouRef.current = true
    iniciar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservaId])

  const quantidade = useMemo(() => {
    return Math.max(1, Math.floor(numeroSeguro(reserva?.quantidade_pessoas ?? reserva?.quantidade, 1)))
  }, [reserva])

  const valorTotal = useMemo(() => calcularValorTotal(reserva, roteiro), [reserva, roteiro])
  const precoPessoa = useMemo(() => (quantidade > 0 ? valorTotal / quantidade : valorTotal), [valorTotal, quantidade])
  const pixImage = useMemo(() => qrImageSrc(pix), [pix])
  const temPix = Boolean(pix.pix_code || pixImage)
  const statusPagamento = reserva?.pagamento_status || reserva?.status_pagamento || reserva?.status

  async function iniciar() {
    setCarregando(true)
    setMensagem('')

    try {
      const salvo = localStorage.getItem('user')
      const usuario = salvo ? (JSON.parse(salvo) as UsuarioLocal) : null

      if (!usuario?.id || normalizar(usuario.tipo) !== 'cliente') {
        router.replace('/login')
        return
      }

      if (!reservaId) {
        setMensagem('Reserva não identificada.')
        return
      }

      setUser(usuario)
      await carregarReserva(usuario.id)
    } catch (error) {
      console.error('Erro ao iniciar pagamento:', error)
      setMensagem(error instanceof Error ? error.message : 'Não foi possível carregar o pagamento.')
    } finally {
      setCarregando(false)
    }
  }

  async function carregarReserva(clienteIdAtual: string) {
    const { data: reservaData, error: reservaError } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', reservaId)
      .maybeSingle()

    if (reservaError) throw reservaError

    if (!reservaData) {
      setMensagem('Reserva não encontrada.')
      return
    }

    const clienteDaReserva = primeiroTexto(
      reservaData.cliente_id,
      reservaData.id_cliente,
      reservaData.usuario_id,
      reservaData.user_id,
      reservaData.comprador_id
    )

    if (clienteDaReserva && clienteDaReserva !== clienteIdAtual) {
      setMensagem('Esta reserva não pertence ao cliente logado.')
      return
    }

    setReserva(reservaData)
    setPix(extrairPixDaReserva(reservaData))

    const roteiroId = primeiroTexto(reservaData.roteiro_id, reservaData.id_roteiro)

    if (roteiroId) {
      const { data: roteiroData, error: roteiroError } = await supabase
        .from('roteiros')
        .select('*')
        .eq('id', roteiroId)
        .maybeSingle()

      if (!roteiroError && roteiroData) {
        setRoteiro(roteiroData)

        const guiaId = guiaIdDoRoteiro(roteiroData)

        if (guiaId) {
          const { data: guiaData } = await supabase
            .from('users')
            .select('*')
            .eq('id', guiaId)
            .maybeSingle()

          if (guiaData) setGuia(guiaData)
        }
      }
    }
  }

  async function gerarPix() {
    if (!reserva?.id) return

    try {
      setGerandoPix(true)
      setMensagem('')
      setCopiado(false)

      const response = await fetch('/api/paghiper/create-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservaId: reserva.id,
          reserva_id: reserva.id,
          valor: valorTotal,
          descricao: tituloRoteiro(roteiro),
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.success === false || data?.error === true) {
        throw new Error(data?.message || data?.erro || data?.error || 'Não foi possível gerar o PIX.')
      }

      const pixNovo = normalizarPixResposta(data || {})
      setPix(pixNovo)

      if (data?.reserva) {
        setReserva(data.reserva)
      } else {
        await carregarReserva(user?.id || '')
      }
    } catch (error) {
      console.error('Erro ao gerar PIX:', error)
      setMensagem(error instanceof Error ? error.message : 'Não foi possível gerar o PIX agora.')
    } finally {
      setGerandoPix(false)
    }
  }

  async function copiarPix() {
    const codigo = texto(pix.pix_code)
    if (!codigo) return

    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 1800)
    } catch {
      setMensagem('Não foi possível copiar automaticamente. Selecione e copie o código PIX.')
    }
  }

  function voltarDashboard() {
    router.push('/cliente/dashboard')
  }

  function voltarRoteiro() {
    const roteiroId = primeiroTexto(roteiro?.id, reserva?.roteiro_id, reserva?.id_roteiro)
    if (roteiroId) {
      router.push(`/roteiros/${roteiroId}`)
      return
    }

    router.push('/roteiros')
  }

  if (carregando) {
    return (
      <main className="page loadingPage">
        <style>{styles}</style>
        <section className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <p>Carregando pagamento...</p>
        </section>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{styles}</style>

      <header className="topbar">
        <div className="topbarInner">
          <button type="button" className="brandLogo" onClick={voltarDashboard} aria-label="Voltar para dashboard">
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          </button>

          <button type="button" className="topLink" onClick={() => router.push('/cliente/minhas-reservas')}>
            Minhas reservas
          </button>
        </div>
      </header>

      <section className="shell">
        <section className="titleArea">
          <div>
            <span className="kicker">Pagamento</span>
            <h1>{temPix ? 'PIX gerado.' : 'Revise antes de pagar.'}</h1>
            <p>
              {temPix
                ? 'Use o QR Code ou o PIX copia e cola para concluir sua reserva.'
                : 'Confira os dados da experiência. O PIX só será gerado depois da sua confirmação.'}
            </p>
          </div>

          <div className="statusPillBox">
            <span>Status</span>
            <strong className={statusClasse(statusPagamento)}>{statusLabel(statusPagamento)}</strong>
          </div>
        </section>

        {mensagem && <div className="alert">{mensagem}</div>}

        <section className="checkoutGrid">
          <div className="leftColumn">
            <article className="experienceCard">
              <div className="cover">
                {fotoRoteiro(roteiro) ? <img src={fotoRoteiro(roteiro)} alt={tituloRoteiro(roteiro)} /> : <span>🏞️</span>}
              </div>

              <div className="experienceBody">
                <span className="microLabel">Experiência escolhida</span>
                <h2>{tituloRoteiro(roteiro)}</h2>
                <p>{roteiro?.descricao || reserva?.descricao || 'Experiência outdoor PrussikTrails.'}</p>

                <div className="detailsGrid">
                  <div>
                    <small>Local</small>
                    <strong>{localRoteiro(roteiro)}</strong>
                  </div>
                  <div>
                    <small>Data</small>
                    <strong>{formatarData(dataRoteiro(roteiro, reserva))}</strong>
                  </div>
                  <div>
                    <small>Nível</small>
                    <strong>{primeiroTexto(roteiro?.dificuldade, roteiro?.nivel, roteiro?.intensidade) || 'Informado pelo guia'}</strong>
                  </div>
                  <div>
                    <small>Guia</small>
                    <strong>{nomeGuia(guia, roteiro)}</strong>
                  </div>
                </div>

                <div className="subActions">
                  {guiaIdDoRoteiro(roteiro) && (
                    <button type="button" onClick={() => router.push(`/guia/publico/${guiaIdDoRoteiro(roteiro)}`)}>
                      Ver guia
                    </button>
                  )}
                  <button type="button" onClick={voltarRoteiro}>
                    Voltar ao roteiro
                  </button>
                </div>
              </div>
            </article>

            <article className="cleanCard">
              <span className="microLabel">Detalhes da compra</span>
              <div className="rowList">
                <div>
                  <span>Preço por pessoa</span>
                  <strong>{formatarMoeda(precoPessoa)}</strong>
                </div>
                <div>
                  <span>Pessoas</span>
                  <strong>{quantidade}</strong>
                </div>
                <div>
                  <span>Forma de pagamento</span>
                  <strong>PIX</strong>
                </div>
                <div>
                  <span>Reserva</span>
                  <strong>{reserva?.created_at ? formatarDataHora(reserva.created_at) : 'Em andamento'}</strong>
                </div>
              </div>
            </article>

            <button
              type="button"
              className="cancelPolicyCard"
              onClick={() => setPoliticaCancelamentoAberta(true)}
              aria-label="Abrir política de cancelamento, reembolso e Saldo de Jornada"
            >
              <span className="policyIcon">↩</span>
              <span className="policyContent">
                <span className="microLabel">Cancelamento e reembolso</span>
                <strong>Confira a política antes de gerar o PIX</strong>
                <small>Inclui arrependimento em até 7 dias, reembolso proporcional, Saldo de Jornada e análise excepcional.</small>
              </span>
              <span className="policyArrow">›</span>
            </button>
          </div>

          <aside className="paymentPanel">
            <div className="paymentTop">
              <span className="microLabel">Resumo</span>
              <div className="totalLine">
                <span>Total</span>
                <strong>{formatarMoeda(valorTotal)}</strong>
              </div>
            </div>

            {temPix ? (
              <div className="pixArea">
                {pixImage ? (
                  <img className="qrImage" src={pixImage} alt="QR Code PIX" />
                ) : (
                  <div className="qrFallback">QR Code indisponível</div>
                )}

                <label className="pixBox">
                  <span>PIX copia e cola</span>
                  <textarea value={pix.pix_code || ''} readOnly />
                </label>

                <button type="button" className="primaryButton" onClick={copiarPix} disabled={!pix.pix_code}>
                  {copiado ? 'PIX copiado!' : 'Copiar PIX'}
                </button>

                <button type="button" className="secondaryButton" onClick={() => router.push('/cliente/minhas-reservas')}>
                  Ver minhas reservas
                </button>
              </div>
            ) : (
              <div className="confirmArea">
                <div className="securityNote">
                  <strong>Confira antes de gerar</strong>
                  <span>O QR Code será emitido pela PagHiper após sua confirmação.</span>
                </div>

                <button type="button" className="primaryButton" onClick={gerarPix} disabled={gerandoPix || valorTotal <= 0}>
                  {gerandoPix ? 'Gerando PIX...' : 'Gerar PIX'}
                </button>

                <button type="button" className="secondaryButton" onClick={voltarRoteiro}>
                  Revisar roteiro
                </button>
              </div>
            )}
          </aside>
        </section>
      </section>

      {politicaCancelamentoAberta && (
        <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="Política de cancelamento e reembolso">
          <section className="policyModal">
            <div className="modalHeader">
              <div>
                <span className="microLabel">Política do cliente</span>
                <h2>Cancelamento, reembolso e Saldo de Jornada</h2>
                <p>Estas regras são apresentadas antes do pagamento para garantir clareza ao cliente e organização operacional da experiência.</p>
              </div>

              <button
                type="button"
                className="closeModal"
                onClick={() => setPoliticaCancelamentoAberta(false)}
                aria-label="Fechar política de cancelamento"
              >
                ×
              </button>
            </div>

            <div className="policyIntro">
              <strong>Resumo objetivo</strong>
              <span>O valor a restituir pode variar conforme o prazo do cancelamento, os custos já assumidos, a organização do guia e a possibilidade de ocupar novamente a vaga.</span>
            </div>

            <div className="policyTable">
              <div className="policyRow highlight">
                <strong>Até 7 dias da compra, desde que antes da data do roteiro</strong>
                <span>Reembolso integral ou Saldo de Jornada integral.</span>
              </div>

              <div className="policyRow">
                <strong>Mais de 7 dias antes da data do roteiro</strong>
                <span>Reembolso de 90% ou Saldo de Jornada de 100%.</span>
              </div>

              <div className="policyRow">
                <strong>Entre 7 e 3 dias antes do roteiro</strong>
                <span>Reembolso de 70% ou Saldo de Jornada de 85%.</span>
              </div>

              <div className="policyRow">
                <strong>Entre 72h e 24h antes do roteiro</strong>
                <span>Reembolso de 50% ou Saldo de Jornada de 70%.</span>
              </div>

              <div className="policyRow warning">
                <strong>Menos de 24h antes ou não comparecimento</strong>
                <span>Sem reembolso automático; análise excepcional por saúde, força maior ou decisão do guia/plataforma.</span>
              </div>
            </div>

            <div className="policyText">
              <h3>Condições importantes</h3>
              <p>O direito de arrependimento será respeitado quando aplicável à contratação online, desde que exercido antes da realização ou início da experiência.</p>
              <p>Cancelamentos feitos pelo guia, pela plataforma, por segurança, clima severo, inviabilidade operacional ou força maior poderão gerar remarcação, reembolso ou Saldo de Jornada, conforme o caso.</p>
              <p>O acesso ao grupo interno do roteiro é liberado após confirmação do pagamento. Em caso de cancelamento, o acesso poderá ser encerrado ou limitado, preservando registros administrativos necessários.</p>
            </div>

            <button
              type="button"
              className="primaryButton"
              onClick={() => setPoliticaCancelamentoAberta(false)}
            >
              Entendi a política
            </button>
          </section>
        </div>
      )}
    </main>
  )
}

const styles = `
  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: #f6f7f1;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  button, textarea { font: inherit; }

  .page {
    min-height: 100vh;
    min-height: 100dvh;
    color: #172018;
    background:
      radial-gradient(circle at 8% 0%, rgba(132,204,22,0.10), transparent 30%),
      radial-gradient(circle at 92% 8%, rgba(251,146,60,0.10), transparent 30%),
      linear-gradient(180deg,#fffdf7 0%,#f4f5ec 48%,#eef2e5 100%);
  }

  .loadingPage {
    display: grid;
    place-items: center;
    padding: 20px;
  }

  .loadingCard {
    width: min(360px, 100%);
    border-radius: 28px;
    background: rgba(255,255,255,0.88);
    border: 1px solid rgba(15,23,42,0.08);
    box-shadow: 0 22px 60px rgba(15,23,42,0.10);
    padding: 26px;
    text-align: center;
    color: #203c2e;
    font-weight: 900;
  }

  .loadingCard img {
    width: 142px;
    height: auto;
    object-fit: contain;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 60;
    background: rgba(255,253,247,0.88);
    border-bottom: 1px solid rgba(15,23,42,0.06);
    backdrop-filter: blur(18px);
    padding: 8px 14px;
  }

  .topbarInner {
    max-width: 1080px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
  }

  .brandLogo {
    grid-column: 2;
    justify-self: center;
    border: 0;
    background: transparent;
    padding: 0;
    cursor: pointer;
    display: flex;
    justify-content: center;
  }

  .brandLogo img {
    width: clamp(136px, 30vw, 210px);
    max-height: 52px;
    object-fit: contain;
    display: block;
  }

  .topLink {
    grid-column: 3;
    justify-self: end;
    border: 1px solid rgba(32,60,46,0.10);
    background: rgba(255,255,255,0.74);
    color: #203c2e;
    border-radius: 999px;
    padding: 9px 12px;
    font-size: 11px;
    font-weight: 950;
    cursor: pointer;
  }

  .shell {
    max-width: 1080px;
    margin: 0 auto;
    padding: 22px 16px 54px;
  }

  .titleArea {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 16px;
    align-items: end;
    margin-bottom: 16px;
  }

  .kicker,
  .microLabel {
    display: block;
    color: #991b1b;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .titleArea h1 {
    margin: 8px 0 0;
    color: #172018;
    font-size: clamp(36px, 5vw, 58px);
    line-height: 0.95;
    font-weight: 950;
    letter-spacing: -0.075em;
  }

  .titleArea p {
    max-width: 640px;
    margin: 10px 0 0;
    color: #64748b;
    font-size: 14px;
    line-height: 1.55;
    font-weight: 750;
  }

  .statusPillBox {
    min-width: 210px;
    border-radius: 24px;
    background: rgba(255,255,255,0.78);
    border: 1px solid rgba(15,23,42,0.06);
    box-shadow: 0 14px 34px rgba(15,23,42,0.05);
    padding: 14px;
    display: grid;
    gap: 8px;
  }

  .statusPillBox span {
    color: #64748b;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  .statusPillBox strong {
    width: fit-content;
    border-radius: 999px;
    padding: 8px 11px;
    font-size: 12px;
    font-weight: 950;
  }

  .statusPillBox strong.pending { background: #fef3c7; color: #92400e; }
  .statusPillBox strong.paid { background: #dcfce7; color: #166534; }
  .statusPillBox strong.danger { background: #fee2e2; color: #991b1b; }

  .alert {
    border-radius: 18px;
    padding: 13px 15px;
    margin-bottom: 16px;
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
    font-size: 13px;
    font-weight: 850;
  }

  .checkoutGrid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 350px;
    gap: 16px;
    align-items: start;
  }

  .leftColumn {
    display: grid;
    gap: 16px;
  }

  .experienceCard,
  .cleanCard,
  .paymentPanel {
    background: rgba(255,255,255,0.86);
    border: 1px solid rgba(15,23,42,0.06);
    box-shadow: 0 14px 34px rgba(15,23,42,0.055);
    border-radius: 28px;
    overflow: hidden;
  }

  .experienceCard {
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
  }

  .cover {
    min-height: 250px;
    background: #eef2e5;
    display: grid;
    place-items: center;
    overflow: hidden;
    color: #64748b;
    font-size: 42px;
  }

  .cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .experienceBody,
  .cleanCard,
  .paymentPanel {
    padding: 20px;
  }

  .experienceBody h2 {
    margin: 6px 0 0;
    color: #172018;
    font-size: 30px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.06em;
  }

  .experienceBody p {
    margin: 9px 0 0;
    color: #64748b;
    font-size: 13px;
    line-height: 1.55;
    font-weight: 750;
  }

  .detailsGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
    margin-top: 16px;
  }

  .detailsGrid div,
  .rowList div,
  .totalLine,
  .securityNote {
    border-radius: 18px;
    background: #fffdf7;
    border: 1px solid rgba(15,23,42,0.055);
    padding: 12px;
  }

  .detailsGrid small,
  .rowList span,
  .totalLine span,
  .pixBox span,
  .securityNote span {
    display: block;
    color: #64748b;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    margin-bottom: 5px;
  }

  .detailsGrid strong,
  .rowList strong {
    color: #172018;
    font-size: 13px;
    line-height: 1.3;
    font-weight: 900;
  }

  .subActions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 16px;
  }

  .subActions button,
  .secondaryButton,
  .primaryButton {
    border: 0;
    border-radius: 999px;
    padding: 11px 14px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
    transition: 0.18s ease;
  }

  .subActions button,
  .secondaryButton {
    background: #eef2e5;
    color: #203c2e;
  }

  .rowList {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
    margin-top: 14px;
  }

  .paymentPanel {
    position: sticky;
    top: 84px;
    display: grid;
    gap: 15px;
  }

  .paymentTop {
    display: grid;
    gap: 12px;
  }

  .totalLine {
    display: grid;
    gap: 2px;
  }

  .totalLine strong {
    color: #203c2e;
    font-size: 34px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.07em;
  }

  .confirmArea,
  .pixArea {
    display: grid;
    gap: 12px;
  }

  .securityNote strong {
    display: block;
    color: #172018;
    font-size: 13px;
    font-weight: 950;
    margin-bottom: 4px;
  }

  .securityNote span {
    margin: 0;
    text-transform: none;
    letter-spacing: 0;
    line-height: 1.45;
    font-size: 12px;
    font-weight: 750;
  }

  .primaryButton {
    width: 100%;
    background: #203c2e;
    color: #fffdf7;
    box-shadow: 0 14px 28px rgba(32,60,46,0.14);
  }

  .primaryButton:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    box-shadow: none;
  }

  .secondaryButton {
    width: 100%;
  }

  .primaryButton:hover:not(:disabled),
  .secondaryButton:hover,
  .subActions button:hover,
  .topLink:hover {
    transform: translateY(-1px);
  }

  .qrImage,
  .qrFallback {
    width: min(236px, 100%);
    aspect-ratio: 1 / 1;
    margin: 0 auto;
    border-radius: 20px;
    background: #ffffff;
    border: 1px solid rgba(15,23,42,0.08);
    padding: 10px;
    object-fit: contain;
    box-shadow: 0 12px 30px rgba(15,23,42,0.08);
  }

  .qrFallback {
    display: grid;
    place-items: center;
    color: #64748b;
    font-size: 12px;
    font-weight: 850;
    text-align: center;
  }

  .pixBox {
    display: grid;
    gap: 7px;
  }

  .pixBox textarea {
    width: 100%;
    min-height: 100px;
    resize: vertical;
    border: 1px solid rgba(15,23,42,0.10);
    background: #fffdf7;
    color: #172018;
    border-radius: 18px;
    padding: 12px;
    font-size: 11px;
    line-height: 1.45;
    font-weight: 700;
    outline: none;
  }

  .cancelPolicyCard {
    width: 100%;
    display: grid;
    grid-template-columns: 46px minmax(0, 1fr) 22px;
    gap: 12px;
    align-items: center;
    text-align: left;
    border: 1px solid rgba(212,179,90,0.24);
    border-radius: 28px;
    background:
      radial-gradient(circle at 100% 0%, rgba(212,179,90,0.18), transparent 36%),
      rgba(255,253,247,0.88);
    box-shadow: 0 14px 34px rgba(15,23,42,0.055);
    padding: 16px;
    cursor: pointer;
    color: #172018;
    transition: 0.18s ease;
  }

  .cancelPolicyCard:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 44px rgba(15,23,42,0.09);
    border-color: rgba(212,179,90,0.38);
  }

  .policyIcon {
    width: 46px;
    height: 46px;
    border-radius: 18px;
    background: #203c2e;
    color: #fffdf7;
    display: grid;
    place-items: center;
    font-size: 22px;
    font-weight: 950;
  }

  .policyContent {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .policyContent strong {
    color: #172018;
    font-size: 15px;
    line-height: 1.15;
    font-weight: 950;
    letter-spacing: -0.03em;
  }

  .policyContent small {
    color: #64748b;
    font-size: 12px;
    line-height: 1.35;
    font-weight: 780;
  }

  .policyArrow {
    color: #203c2e;
    font-size: 28px;
    line-height: 1;
    font-weight: 850;
  }

  .modalOverlay {
    position: fixed;
    inset: 0;
    z-index: 120;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background: rgba(8, 13, 7, 0.54);
    backdrop-filter: blur(12px);
  }

  .policyModal {
    width: min(760px, 100%);
    max-height: calc(100dvh - 28px);
    overflow: auto;
    border-radius: 32px;
    background:
      radial-gradient(circle at 10% 0%, rgba(132,204,22,0.13), transparent 30%),
      linear-gradient(180deg, #fffdf7 0%, #f3f5ea 100%);
    border: 1px solid rgba(255,255,255,0.70);
    box-shadow: 0 34px 90px rgba(0,0,0,0.28);
    padding: 22px;
  }

  .modalHeader {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: flex-start;
  }

  .modalHeader h2 {
    margin: 8px 0 0;
    color: #172018;
    font-size: clamp(28px, 4vw, 42px);
    line-height: 0.95;
    font-weight: 950;
    letter-spacing: -0.065em;
  }

  .modalHeader p {
    max-width: 620px;
    margin: 10px 0 0;
    color: #64748b;
    font-size: 13px;
    line-height: 1.5;
    font-weight: 760;
  }

  .closeModal {
    flex: 0 0 auto;
    width: 40px;
    height: 40px;
    border: 1px solid rgba(15,23,42,0.08);
    border-radius: 999px;
    background: rgba(255,255,255,0.78);
    color: #172018;
    font-size: 24px;
    line-height: 1;
    font-weight: 700;
    cursor: pointer;
  }

  .policyIntro {
    margin-top: 16px;
    border-radius: 22px;
    background: rgba(32,60,46,0.08);
    border: 1px solid rgba(32,60,46,0.10);
    padding: 14px;
    display: grid;
    gap: 5px;
  }

  .policyIntro strong,
  .policyText h3 {
    color: #203c2e;
    font-size: 14px;
    font-weight: 950;
    margin: 0;
  }

  .policyIntro span {
    color: #4b5563;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 760;
  }

  .policyTable {
    margin-top: 14px;
    display: grid;
    gap: 9px;
  }

  .policyRow {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(220px, 0.72fr);
    gap: 12px;
    align-items: center;
    border-radius: 20px;
    background: rgba(255,255,255,0.76);
    border: 1px solid rgba(15,23,42,0.06);
    padding: 13px;
  }

  .policyRow.highlight {
    border-color: rgba(22,163,74,0.18);
    background: rgba(236,253,245,0.82);
  }

  .policyRow.warning {
    border-color: rgba(217,119,6,0.18);
    background: rgba(254,243,199,0.72);
  }

  .policyRow strong {
    color: #172018;
    font-size: 13px;
    line-height: 1.32;
    font-weight: 950;
  }

  .policyRow span {
    color: #4b5563;
    font-size: 12.5px;
    line-height: 1.38;
    font-weight: 800;
  }

  .policyText {
    margin-top: 15px;
    border-radius: 22px;
    background: rgba(255,253,247,0.70);
    border: 1px solid rgba(15,23,42,0.055);
    padding: 15px;
  }

  .policyText p {
    margin: 8px 0 0;
    color: #64748b;
    font-size: 12.5px;
    line-height: 1.55;
    font-weight: 740;
  }

  .policyModal .primaryButton {
    margin-top: 14px;
  }

  @media (max-width: 980px) {
    .titleArea,
    .checkoutGrid,
    .experienceCard {
      grid-template-columns: 1fr;
    }

    .paymentPanel {
      position: static;
    }

    .cover {
      min-height: 230px;
      aspect-ratio: 4 / 3;
    }
  }

  @media (max-width: 720px) {
    .topbar {
      padding: 7px 10px;
    }

    .topbarInner {
      grid-template-columns: 1fr auto;
    }

    .brandLogo {
      grid-column: 1;
      justify-self: start;
    }

    .brandLogo img {
      width: clamp(128px, 48vw, 198px);
      max-height: 48px;
    }

    .topLink {
      grid-column: 2;
      padding: 8px 10px;
      font-size: 10.5px;
    }

    .shell {
      padding: 14px 10px 38px;
    }

    .titleArea h1 {
      font-size: 38px;
    }

    .experienceCard,
    .cleanCard,
    .paymentPanel,
    .statusPillBox {
      border-radius: 22px;
    }

    .experienceBody,
    .cleanCard,
    .paymentPanel {
      padding: 16px;
    }

    .detailsGrid,
    .rowList,
    .policyRow {
      grid-template-columns: 1fr;
    }

    .policyModal {
      border-radius: 26px;
      padding: 18px;
    }

    .modalOverlay {
      align-items: flex-end;
      padding: 10px;
    }

    .subActions {
      display: grid;
    }

    .subActions button {
      width: 100%;
    }
  }
`
