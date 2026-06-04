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

  if (carregando) {
    return (
      <main className="page loadingPage">
        <style>{styles}</style>
        <section className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <p>Carregando detalhes do pagamento...</p>
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

          <button type="button" className="ghostTopButton" onClick={() => router.push('/cliente/minhas-reservas')}>
            Minhas reservas
          </button>
        </div>
      </header>

      <section className="shell">
        <section className="hero">
          <div>
            <p className="eyebrow">Pagamento seguro</p>
            <h1>Confira sua reserva antes de pagar.</h1>
            <p className="heroText">
              Revise os dados da experiência, quantidade de pessoas e valor total. Depois gere o PIX para concluir a reserva.
            </p>
          </div>

          <div className="statusBox">
            <span>Status da reserva</span>
            <strong className={statusClasse(reserva?.pagamento_status || reserva?.status_pagamento || reserva?.status)}>
              {statusLabel(reserva?.pagamento_status || reserva?.status_pagamento || reserva?.status)}
            </strong>
            <small>{reserva?.created_at ? `Criada em ${formatarDataHora(reserva.created_at)}` : 'Reserva em andamento'}</small>
          </div>
        </section>

        {mensagem && <div className="alert">❌ {mensagem}</div>}

        <section className="layoutGrid">
          <div className="mainColumn">
            <article className="routeCard">
              <div className="routeImage">
                {fotoRoteiro(roteiro) ? <img src={fotoRoteiro(roteiro)} alt={tituloRoteiro(roteiro)} /> : <span>🏞️</span>}
              </div>

              <div className="routeBody">
                <div className="routeHeader">
                  <div>
                    <span>Roteiro reservado</span>
                    <h2>{tituloRoteiro(roteiro)}</h2>
                    <p>{roteiro?.descricao || reserva?.descricao || 'Experiência outdoor PrussikTrails.'}</p>
                  </div>
                </div>

                <div className="infoGrid">
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

                {guiaIdDoRoteiro(roteiro) && (
                  <button type="button" className="outlineButton" onClick={() => router.push(`/guia/publico/${guiaIdDoRoteiro(roteiro)}`)}>
                    Ver perfil do guia
                  </button>
                )}
              </div>
            </article>

            <article className="detailsCard">
              <div className="sectionHeader">
                <span>Resumo financeiro</span>
                <h2>Detalhes antes do pagamento</h2>
              </div>

              <div className="summaryRows">
                <div>
                  <span>Preço por pessoa</span>
                  <strong>{formatarMoeda(precoPessoa)}</strong>
                </div>
                <div>
                  <span>Quantidade de pessoas</span>
                  <strong>{quantidade}</strong>
                </div>
                <div>
                  <span>Total da reserva</span>
                  <strong>{formatarMoeda(valorTotal)}</strong>
                </div>
                <div>
                  <span>Forma de pagamento</span>
                  <strong>PIX PagHiper</strong>
                </div>
              </div>

              <p className="safeNote">
                O pagamento será processado via PIX. Após a confirmação, sua reserva poderá ser liberada conforme o fluxo do PrussikTrails.
              </p>
            </article>
          </div>

          <aside className="paymentCard">
            <div className="paymentHeader">
              <span>Pagamento PIX</span>
              <h2>{temPix ? 'PIX gerado' : 'Gerar PIX'}</h2>
              <p>{temPix ? 'Escaneie o QR Code ou copie o código.' : 'Clique para gerar o QR Code somente após conferir os dados.'}</p>
            </div>

            {temPix ? (
              <div className="pixArea">
                {pixImage ? (
                  <img className="qrImage" src={pixImage} alt="QR Code PIX" />
                ) : (
                  <div className="qrFallback">QR Code indisponível</div>
                )}

                <label className="pixCodeBox">
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
              <>
                <div className="totalBox">
                  <span>Total a pagar</span>
                  <strong>{formatarMoeda(valorTotal)}</strong>
                </div>

                <button type="button" className="primaryButton" onClick={gerarPix} disabled={gerandoPix || valorTotal <= 0}>
                  {gerandoPix ? 'Gerando PIX...' : 'Gerar PIX agora'}
                </button>

                <button type="button" className="secondaryButton" onClick={() => router.push(`/roteiros/${roteiro?.id || reserva?.roteiro_id || ''}`)}>
                  Voltar ao roteiro
                </button>
              </>
            )}
          </aside>
        </section>
      </section>
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

  button, input, textarea { font: inherit; }

  .page {
    min-height: 100vh;
    min-height: 100dvh;
    color: #172018;
    background:
      radial-gradient(circle at 10% 0%, rgba(132,204,22,0.16), transparent 28%),
      radial-gradient(circle at 90% 10%, rgba(251,146,60,0.14), transparent 28%),
      linear-gradient(180deg,#fffdf7 0%,#f3f5ea 48%,#eef2e5 100%);
  }

  .loadingPage {
    display: grid;
    place-items: center;
    padding: 20px;
  }

  .loadingCard {
    width: min(430px, 100%);
    border-radius: 30px;
    background: rgba(255,255,255,0.88);
    border: 1px solid rgba(15,23,42,0.08);
    box-shadow: 0 22px 60px rgba(15,23,42,0.12);
    padding: 28px;
    text-align: center;
    color: #203c2e;
    font-weight: 900;
  }

  .loadingCard img {
    width: 160px;
    height: auto;
    object-fit: contain;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 60;
    background: rgba(255,253,247,0.90);
    border-bottom: 1px solid rgba(15,23,42,0.06);
    backdrop-filter: blur(18px);
    padding: 8px 14px;
  }

  .topbarInner {
    max-width: 1180px;
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
    width: clamp(142px, 34vw, 238px);
    max-height: 58px;
    object-fit: contain;
    display: block;
  }

  .ghostTopButton {
    grid-column: 3;
    justify-self: end;
    border: 1px solid rgba(32,60,46,0.10);
    background: rgba(255,255,255,0.82);
    color: #203c2e;
    border-radius: 999px;
    padding: 10px 13px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
  }

  .shell {
    max-width: 1180px;
    margin: 0 auto;
    padding: 22px 16px 54px;
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 310px;
    gap: 18px;
    align-items: stretch;
    margin-bottom: 16px;
  }

  .hero > div:first-child,
  .statusBox {
    border-radius: 36px;
    box-shadow: 0 24px 60px rgba(23,32,24,0.14);
  }

  .hero > div:first-child {
    padding: 30px;
    color: #fff;
    background:
      linear-gradient(135deg, rgba(23,32,24,0.82), rgba(23,32,24,0.46)),
      radial-gradient(circle at top right, rgba(190,242,100,0.30), transparent 34%),
      linear-gradient(135deg, #1f331f 0%, #647a49 46%, #d7c6a1 100%);
  }

  .eyebrow {
    display: inline-flex;
    width: fit-content;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.24);
    background: rgba(255,255,255,0.12);
    color: #f7fee7;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin: 0 0 12px;
  }

  .hero h1 {
    margin: 0;
    font-size: clamp(42px, 6vw, 72px);
    line-height: 0.92;
    font-weight: 950;
    letter-spacing: -0.085em;
  }

  .heroText {
    max-width: 760px;
    margin: 14px 0 0;
    color: rgba(255,255,255,0.82);
    line-height: 1.6;
    font-size: 14px;
    font-weight: 650;
  }

  .statusBox {
    background: rgba(255,255,255,0.90);
    border: 1px solid rgba(15,23,42,0.06);
    padding: 24px;
    display: grid;
    align-content: center;
    gap: 8px;
  }

  .statusBox span,
  .sectionHeader span,
  .paymentHeader span,
  .routeBody > .routeHeader span {
    color: #991b1b;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .statusBox strong {
    width: fit-content;
    border-radius: 999px;
    padding: 9px 12px;
    font-size: 13px;
    font-weight: 950;
  }

  .statusBox strong.pending { background: #fef3c7; color: #92400e; }
  .statusBox strong.paid { background: #dcfce7; color: #166534; }
  .statusBox strong.danger { background: #fee2e2; color: #991b1b; }

  .statusBox small {
    color: #64748b;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.4;
  }

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

  .layoutGrid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 370px;
    gap: 16px;
    align-items: start;
  }

  .mainColumn {
    display: grid;
    gap: 16px;
  }

  .routeCard,
  .detailsCard,
  .paymentCard {
    background: rgba(255,255,255,0.90);
    border: 1px solid rgba(15,23,42,0.06);
    box-shadow: 0 12px 34px rgba(15,23,42,0.06);
    border-radius: 30px;
    overflow: hidden;
  }

  .routeCard {
    display: grid;
    grid-template-columns: 330px minmax(0, 1fr);
  }

  .routeImage {
    min-height: 270px;
    background: #eef2e5;
    display: grid;
    place-items: center;
    overflow: hidden;
    color: #64748b;
    font-size: 44px;
  }

  .routeImage img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .routeBody {
    padding: 22px;
    display: grid;
    gap: 18px;
    align-content: start;
  }

  .routeBody h2,
  .sectionHeader h2,
  .paymentHeader h2 {
    margin: 5px 0 0;
    color: #172018;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.055em;
  }

  .routeBody h2 { font-size: 31px; }
  .sectionHeader h2, .paymentHeader h2 { font-size: 26px; }

  .routeBody p,
  .paymentHeader p,
  .safeNote {
    margin: 8px 0 0;
    color: #64748b;
    font-size: 13px;
    line-height: 1.55;
    font-weight: 750;
  }

  .infoGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .infoGrid div {
    border-radius: 20px;
    padding: 13px;
    background: #fffdf7;
    border: 1px solid rgba(15,23,42,0.06);
  }

  .infoGrid small {
    display: block;
    color: #64748b;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    margin-bottom: 5px;
  }

  .infoGrid strong {
    color: #172018;
    font-size: 13px;
    line-height: 1.3;
    font-weight: 900;
  }

  .outlineButton,
  .secondaryButton,
  .primaryButton {
    border: 0;
    border-radius: 999px;
    padding: 12px 15px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
    transition: 0.18s ease;
  }

  .outlineButton {
    width: fit-content;
    background: #eef2e5;
    color: #203c2e;
  }

  .detailsCard,
  .paymentCard {
    padding: 22px;
  }

  .summaryRows {
    display: grid;
    gap: 10px;
    margin-top: 16px;
  }

  .summaryRows div,
  .totalBox {
    border-radius: 20px;
    padding: 14px;
    background: #fffdf7;
    border: 1px solid rgba(15,23,42,0.06);
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
  }

  .summaryRows span,
  .totalBox span,
  .pixCodeBox span {
    color: #64748b;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .summaryRows strong,
  .totalBox strong {
    color: #203c2e;
    font-size: 17px;
    font-weight: 950;
    text-align: right;
  }

  .paymentCard {
    position: sticky;
    top: 86px;
    display: grid;
    gap: 15px;
  }

  .paymentHeader {
    display: grid;
    gap: 3px;
  }

  .totalBox {
    display: grid;
    justify-items: start;
  }

  .totalBox strong {
    font-size: 30px;
    letter-spacing: -0.06em;
  }

  .primaryButton {
    width: 100%;
    background: #203c2e;
    color: #fffdf7;
    box-shadow: 0 14px 28px rgba(32,60,46,0.16);
  }

  .primaryButton:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    box-shadow: none;
  }

  .secondaryButton {
    width: 100%;
    background: #eef2e5;
    color: #203c2e;
  }

  .primaryButton:hover:not(:disabled),
  .secondaryButton:hover,
  .outlineButton:hover,
  .ghostTopButton:hover {
    transform: translateY(-1px);
  }

  .pixArea {
    display: grid;
    gap: 13px;
  }

  .qrImage,
  .qrFallback {
    width: min(260px, 100%);
    aspect-ratio: 1 / 1;
    margin: 0 auto;
    border-radius: 22px;
    background: #ffffff;
    border: 1px solid rgba(15,23,42,0.08);
    padding: 10px;
    object-fit: contain;
    box-shadow: 0 14px 34px rgba(15,23,42,0.08);
  }

  .qrFallback {
    display: grid;
    place-items: center;
    color: #64748b;
    font-size: 12px;
    font-weight: 850;
    text-align: center;
  }

  .pixCodeBox {
    display: grid;
    gap: 7px;
  }

  .pixCodeBox textarea {
    width: 100%;
    min-height: 112px;
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

  @media (max-width: 980px) {
    .hero,
    .layoutGrid,
    .routeCard {
      grid-template-columns: 1fr;
    }

    .paymentCard {
      position: static;
    }

    .routeImage {
      min-height: 250px;
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
      width: clamp(130px, 50vw, 205px);
      max-height: 50px;
    }

    .ghostTopButton {
      grid-column: 2;
      padding: 9px 11px;
      font-size: 11px;
    }

    .shell {
      padding: 12px 9px 40px;
    }

    .hero > div:first-child,
    .statusBox,
    .routeCard,
    .detailsCard,
    .paymentCard {
      border-radius: 24px;
    }

    .hero > div:first-child,
    .statusBox,
    .detailsCard,
    .paymentCard,
    .routeBody {
      padding: 18px;
    }

    .hero h1 {
      font-size: 40px;
    }

    .infoGrid {
      grid-template-columns: 1fr;
    }

    .summaryRows div {
      display: grid;
      justify-content: initial;
    }

    .summaryRows strong {
      text-align: left;
    }
  }
`
