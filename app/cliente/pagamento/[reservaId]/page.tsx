'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type UsuarioLocal = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
  cpf?: string | null
  telefone?: string | null
  celular?: string | null
  tipo?: string | null
}

type Reserva = {
  id: string
  cliente_id?: string | null
  roteiro_id?: string | null
  quantidade_pessoas?: number | null
  valor_total?: number | null
  status?: string | null
  pagamento_status?: string | null
  order_id?: string | null
  transaction_id?: string | null
  pix_code?: string | null
  pix_qr_code?: string | null
  saldo_utilizado?: number | null
  pago_em?: string | null
  forma_pagamento?: string | null
  created_at?: string | null
}

type Roteiro = {
  id: string
  titulo?: string | null
  nome?: string | null
  preco?: number | null
  valor?: number | null
  local?: string | null
  localizacao?: string | null
  data_roteiro?: string | null
  data_saida?: string | null
  data?: string | null
  hora_roteiro?: string | null
  hora_saida?: string | null
  hora?: string | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
}

type PixData = {
  order_id?: string
  transaction_id?: string
  digitable_line?: string
  pix_code?: string
  qr_code?: string
  qrcode?: string
  qr_code_base64?: string
  pix_qr_code?: string
  url_slip?: string
  url?: string
  [key: string]: any
}

type SaldoCliente = {
  cliente_id?: string | null
  saldo_disponivel?: number | null
  saldo_reservado?: number | null
  saldo_utilizado?: number | null
  saldo_expirado?: number | null
  moeda?: string | null
}

type MovimentacaoSaldo = {
  id: string
  tipo?: string | null
  valor?: number | null
  descricao?: string | null
  motivo?: string | null
  created_at?: string | null
}

export default function ClientePagamentoPage() {
  const router = useRouter()
  const params = useParams()
  const iniciouRef = useRef(false)
  const verificandoRef = useRef(false)

  const reservaId = String(params?.reservaId || '')

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [reserva, setReserva] = useState<Reserva | null>(null)
  const [roteiro, setRoteiro] = useState<Roteiro | null>(null)
  const [pix, setPix] = useState<PixData | null>(null)
  const [saldoCliente, setSaldoCliente] = useState<SaldoCliente | null>(null)
  const [movimentacoesSaldo, setMovimentacoesSaldo] = useState<MovimentacaoSaldo[]>([])

  const [carregando, setCarregando] = useState(true)
  const [gerandoPix, setGerandoPix] = useState(false)
  const [aplicandoSaldo, setAplicandoSaldo] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [pagamentoConfirmado, setPagamentoConfirmado] = useState(false)
  const [redirecionandoGrupo, setRedirecionandoGrupo] = useState(false)

  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [ultimaVerificacao, setUltimaVerificacao] = useState('')

  useEffect(() => {
    if (iniciouRef.current) return

    iniciouRef.current = true
    iniciar()
  }, [])

  useEffect(() => {
    if (!reserva?.id || pagamentoConfirmado) return

    const interval = setInterval(() => {
      verificarPagamento(true)
    }, 9000)

    return () => clearInterval(interval)
  }, [reserva?.id, pagamentoConfirmado])

  const iniciar = async () => {
    setCarregando(true)
    setErro('')
    setMensagem('')

    try {
      const userData = localStorage.getItem('user')

      if (!userData) {
        router.replace('/login')
        return
      }

      const parsedUser = JSON.parse(userData) as UsuarioLocal

      if (parsedUser.tipo !== 'cliente') {
        router.replace('/login')
        return
      }

      setUser(parsedUser)

      const saldoAtual = await carregarSaldoCliente(parsedUser.id)
      const reservaAtual = await carregarReserva(parsedUser.id)

      if (reservaAtual) {
        const jaPago = pagamentoEstaConfirmado(reservaAtual)

        if (jaPago) {
          setPagamentoConfirmado(true)
          await direcionarParaGrupo(reservaAtual.id)
          return
        }

        const valorPendente = valorAPagarReserva(reservaAtual)

        if (valorPendente <= 0) {
          setPagamentoConfirmado(true)
          await direcionarParaGrupo(reservaAtual.id)
          return
        }

        const temSaldoParaEscolher =
          Number(saldoAtual?.saldo_disponivel || 0) > 0 &&
          Number(reservaAtual.saldo_utilizado || 0) <= 0

        if (temSaldoParaEscolher) {
          setMensagem('Você possui Saldo de Jornada disponível. Aplique antes de gerar o PIX, se desejar.')
          return
        }

        await gerarPixSeNecessario(reservaAtual, parsedUser)
        await verificarPagamento(true)
      }
    } catch (error) {
      console.error('Erro ao iniciar pagamento:', error)
      setErro('Não foi possível carregar o pagamento agora.')
    } finally {
      setCarregando(false)
    }
  }

  const normalizar = (valor?: string | null) => {
    return String(valor || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }

  const somenteNumeros = (valor?: string | null) => {
    return String(valor || '').replace(/\D/g, '')
  }

  const nomeUsuario = (usuario?: UsuarioLocal | null) => {
    return usuario?.nome || usuario?.name || 'Cliente'
  }

  const tituloRoteiro = (item?: Roteiro | null) => {
    return item?.titulo || item?.nome || 'Roteiro'
  }

  const imagemRoteiro = (item?: Roteiro | null) => {
    return item?.foto_capa || item?.foto_url || item?.imagem_url || ''
  }

  const localRoteiro = (item?: Roteiro | null) => {
    return item?.local || item?.localizacao || 'Local a confirmar'
  }

  const dataRoteiro = (item?: Roteiro | null) => {
    return item?.data_roteiro || item?.data_saida || item?.data || null
  }

  const horaRoteiro = (item?: Roteiro | null) => {
    return item?.hora_roteiro || item?.hora_saida || item?.hora || ''
  }

  const formatarMoeda = (valor: any) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(valor || 0))
  }

  const numero = (valor: any) => {
    const n = Number(valor || 0)
    return Number.isFinite(n) ? n : 0
  }

  const valorTotalReserva = (item?: Reserva | null) => {
    const quantidade = Math.max(1, numero(item?.quantidade_pessoas) || 1)

    return Number((
      numero(item?.valor_total) ||
      numero(roteiro?.preco) * quantidade ||
      numero(roteiro?.valor) * quantidade ||
      0
    ).toFixed(2))
  }

  const saldoUtilizadoReserva = (item?: Reserva | null) => {
    return Number((numero(item?.saldo_utilizado)).toFixed(2))
  }

  const valorAPagarReserva = (item?: Reserva | null) => {
    return Math.max(0, Number((valorTotalReserva(item) - saldoUtilizadoReserva(item)).toFixed(2)))
  }

  const saldoDisponivel = () => {
    return Number((numero(saldoCliente?.saldo_disponivel)).toFixed(2))
  }

  const podeAplicarSaldo = () => {
    return Boolean(
      reserva?.id &&
      user?.id &&
      saldoDisponivel() > 0 &&
      saldoUtilizadoReserva(reserva) <= 0 &&
      !pagamentoEstaConfirmado(reserva)
    )
  }

  const formatarData = (valor?: string | null) => {
    if (!valor) return '-'

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return valor

    return data.toLocaleDateString('pt-BR')
  }

  const pagamentoEstaConfirmado = (item?: Reserva | null) => {
    const pagamento = normalizar(item?.pagamento_status)
    const status = normalizar(item?.status)

    return (
      pagamento === 'pago' ||
      pagamento === 'confirmado' ||
      pagamento === 'aprovado' ||
      pagamento === 'paid' ||
      pagamento === 'approved' ||
      status === 'confirmada' ||
      status === 'realizada' ||
      status === 'pago' ||
      status === 'paga'
    )
  }

  const carregarSaldoCliente = async (clienteId: string) => {
    if (!clienteId) return null

    try {
      const response = await fetch(`/api/cliente/saldo?clienteId=${encodeURIComponent(clienteId)}`)
      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.sucesso) {
        console.warn('Não foi possível carregar Saldo de Jornada:', data)
        return null
      }

      setSaldoCliente(data.saldo || null)
      setMovimentacoesSaldo(Array.isArray(data.movimentacoes) ? data.movimentacoes : [])

      return data.saldo as SaldoCliente
    } catch (error) {
      console.warn('Erro ao carregar Saldo de Jornada:', error)
      return null
    }
  }

  const carregarReserva = async (clienteId: string) => {
    if (!reservaId) {
      setErro('Reserva não identificada.')
      return null
    }

    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', reservaId)
      .maybeSingle()

    if (error) {
      console.error('Erro ao buscar reserva:', error)
      setErro('Não foi possível localizar a reserva.')
      return null
    }

    if (!data?.id) {
      setErro('Reserva não encontrada.')
      return null
    }

    if (data.cliente_id && data.cliente_id !== clienteId) {
      setErro('Esta reserva não pertence ao cliente logado.')
      return null
    }

    const reservaData = data as Reserva
    setReserva(reservaData)

    if (reservaData.roteiro_id) {
      const { data: roteiroData, error: roteiroError } = await supabase
        .from('roteiros')
        .select('*')
        .eq('id', reservaData.roteiro_id)
        .maybeSingle()

      if (!roteiroError && roteiroData) {
        setRoteiro(roteiroData as Roteiro)
      }
    }

    if (
      reservaData.pix_code ||
      reservaData.pix_qr_code ||
      reservaData.transaction_id ||
      reservaData.order_id
    ) {
      setPix({
        order_id: reservaData.order_id || '',
        transaction_id: reservaData.transaction_id || '',
        pix_code: reservaData.pix_code || '',
        pix_qr_code: reservaData.pix_qr_code || '',
        qr_code: reservaData.pix_qr_code || ''
      })
    }

    return reservaData
  }

  const extrairPixDaResposta = (data: any): PixData => {
    const raiz = data || {}
    const response = raiz.response || raiz.data || raiz.pix || raiz.invoice || raiz.result || raiz

    return {
      order_id:
        raiz.order_id ||
        response.order_id ||
        response.orderId ||
        response.order ||
        '',
      transaction_id:
        raiz.transaction_id ||
        response.transaction_id ||
        response.transactionId ||
        response.transaction ||
        '',
      digitable_line:
        raiz.digitable_line ||
        response.digitable_line ||
        response.pix_code ||
        response.emv ||
        '',
      pix_code:
        raiz.pix_code ||
        response.pix_code ||
        response.digitable_line ||
        response.emv ||
        response.qr_code_text ||
        '',
      qr_code:
        raiz.qr_code ||
        raiz.qrcode ||
        response.qr_code ||
        response.qrcode ||
        response.qr_code_base64 ||
        response.pix_qr_code ||
        '',
      qrcode:
        raiz.qrcode ||
        response.qrcode ||
        '',
      qr_code_base64:
        raiz.qr_code_base64 ||
        response.qr_code_base64 ||
        '',
      pix_qr_code:
        raiz.pix_qr_code ||
        response.pix_qr_code ||
        response.qr_code_base64 ||
        response.qr_code ||
        '',
      url_slip:
        raiz.url_slip ||
        response.url_slip ||
        response.url ||
        '',
      raw: raiz
    }
  }

  const atualizarReservaComPix = async (
    reservaAtual: Reserva,
    pixData: PixData
  ) => {
    const payloads: Record<string, any>[] = [
      {
        order_id: pixData.order_id || `RESERVA-${reservaAtual.id}`,
        transaction_id: pixData.transaction_id || null,
        pix_code: pixData.pix_code || pixData.digitable_line || null,
        pix_qr_code:
          pixData.pix_qr_code ||
          pixData.qr_code_base64 ||
          pixData.qr_code ||
          pixData.qrcode ||
          null,
        updated_at: new Date().toISOString()
      },
      {
        order_id: pixData.order_id || `RESERVA-${reservaAtual.id}`,
        transaction_id: pixData.transaction_id || null,
        updated_at: new Date().toISOString()
      },
      {
        updated_at: new Date().toISOString()
      }
    ]

    for (const payload of payloads) {
      const { error } = await supabase
        .from('reservas')
        .update(payload)
        .eq('id', reservaAtual.id)

      if (!error) return

      console.warn('Não foi possível atualizar alguns dados PIX na reserva:', error)
    }
  }

  const gerarPixSeNecessario = async (
    reservaAtual: Reserva,
    usuarioAtual: UsuarioLocal,
    ignorarPixExistente = false
  ) => {
    if (pagamentoEstaConfirmado(reservaAtual)) return

    if (!ignorarPixExistente && (pix?.pix_code || pix?.qr_code || pix?.pix_qr_code)) return

    setGerandoPix(true)

    try {
      const valor = valorAPagarReserva(reservaAtual)

      if (valor <= 0) {
        setPagamentoConfirmado(true)
        setMensagem('Reserva confirmada integralmente com Saldo de Jornada.')
        await direcionarParaGrupo(reservaAtual.id)
        return
      }

      const response = await fetch('/api/paghiper/create-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reservaId: reservaAtual.id,
          reserva_id: reservaAtual.id,
          order_id: `RESERVA-${reservaAtual.id}-${Date.now()}`,
          valor,
          nome: nomeUsuario(usuarioAtual),
          email: usuarioAtual.email || '',
          cpf: somenteNumeros(usuarioAtual.cpf),
          telefone: somenteNumeros(usuarioAtual.telefone || usuarioAtual.celular),
          descricao: `Reserva PrussikTrails - ${tituloRoteiro(roteiro)}`
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        console.warn('Erro ao gerar PIX:', data)
        setErro(data?.erro || data?.message || 'Não foi possível gerar o PIX.')
        return
      }

      const pixData = extrairPixDaResposta(data)

      setPix(pixData)
      await atualizarReservaComPix(reservaAtual, pixData)

      setMensagem('PIX gerado. Após o pagamento, o sistema verificará automaticamente.')
    } catch (error) {
      console.error('Erro ao gerar PIX:', error)
      setErro('Erro ao gerar PIX.')
    } finally {
      setGerandoPix(false)
    }
  }

  const aplicarSaldoNaReserva = async () => {
    if (!reserva?.id || !user?.id) return

    setAplicandoSaldo(true)
    setErro('')
    setMensagem('')

    try {
      const response = await fetch('/api/reservas/aplicar-saldo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reservaId: reserva.id,
          clienteId: user.id
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.sucesso) {
        throw new Error(data?.erro || 'Não foi possível aplicar o saldo agora.')
      }

      const reservaAtualizada = data.reserva || await recarregarReserva()

      setReserva(reservaAtualizada as Reserva)
      setPix(null)

      if (data.saldo) {
        setSaldoCliente(data.saldo)
      } else {
        await carregarSaldoCliente(user.id)
      }

      if (data.pagoIntegralComSaldo || valorAPagarReserva(reservaAtualizada) <= 0) {
        setPagamentoConfirmado(true)
        setMensagem('Reserva confirmada integralmente com Saldo de Jornada. Preparando o grupo da sua aventura...')
        await direcionarParaGrupo(reserva.id)
        return
      }

      setMensagem(`Saldo aplicado: ${formatarMoeda(data.saldoAplicado)}. Gere o PIX apenas do valor restante.`)
      await gerarPixSeNecessario(reservaAtualizada as Reserva, user, true)
    } catch (error) {
      console.error('Erro ao aplicar saldo:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao aplicar saldo.')
    } finally {
      setAplicandoSaldo(false)
    }
  }

  const gerarPixSemSaldo = async () => {
    if (!reserva || !user) return

    setMensagem('Gerando PIX sem usar Saldo de Jornada.')
    await gerarPixSeNecessario(reserva, user, true)
  }

  const verificarPagamento = async (silencioso = false) => {
    if (!reserva?.id && !reservaId) return
    if (verificandoRef.current) return

    verificandoRef.current = true

    if (!silencioso) {
      setVerificando(true)
      setMensagem('Verificando pagamento...')
      setErro('')
    }

    try {
      const response = await fetch('/api/paghiper/reconciliar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reservaId: reserva?.id || reservaId
        })
      })

      const data = await response.json().catch(() => null)

      setUltimaVerificacao(new Date().toLocaleTimeString('pt-BR'))

      if (!response.ok || data?.sucesso === false) {
        if (!silencioso) {
          setErro(data?.erro || data?.message || 'Pagamento ainda não confirmado.')
        }

        return
      }

      const reservaAtualizada = await recarregarReserva()

      if (pagamentoEstaConfirmado(reservaAtualizada)) {
        setPagamentoConfirmado(true)
        setMensagem('Pagamento confirmado. Preparando o grupo da sua aventura...')
        await direcionarParaGrupo(reservaAtualizada?.id || reserva?.id || reservaId)
        return
      }

      const atualizadas = Number(data?.atualizadas || 0)
      const jaConfirmadas = Number(data?.jaConfirmadas || 0)

      if (atualizadas > 0 || jaConfirmadas > 0) {
        const novaReserva = await recarregarReserva()

        if (pagamentoEstaConfirmado(novaReserva)) {
          setPagamentoConfirmado(true)
          setMensagem('Pagamento confirmado. Preparando o grupo da sua aventura...')
          await direcionarParaGrupo(novaReserva?.id || reserva?.id || reservaId)
          return
        }
      }

      if (!silencioso) {
        setMensagem('Ainda não encontramos a confirmação. Tente novamente em alguns instantes.')
      }
    } catch (error) {
      console.error('Erro ao verificar pagamento:', error)

      if (!silencioso) {
        setErro('Não foi possível verificar o pagamento agora.')
      }
    } finally {
      verificandoRef.current = false

      if (!silencioso) {
        setVerificando(false)
      }
    }
  }

  const recarregarReserva = async () => {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', reserva?.id || reservaId)
      .maybeSingle()

    if (!error && data) {
      setReserva(data as Reserva)
      return data as Reserva
    }

    return reserva
  }

  const direcionarParaGrupo = async (idReserva: string) => {
    if (!idReserva) return

    setRedirecionandoGrupo(true)

    try {
      const response = await fetch('/api/grupos/garantir-acesso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reservaId: idReserva
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.sucesso) {
        console.warn('Não foi possível garantir acesso ao grupo:', data)
        setMensagem(
          'Pagamento confirmado. O grupo será liberado em instantes nas suas reservas.'
        )

        setTimeout(() => {
          router.push('/cliente/minhas-reservas')
        }, 1400)

        return
      }

      const redirectUrl =
        data?.redirectUrl ||
        (data?.grupo?.id ? `/cliente/grupos/${data.grupo.id}` : '')

      if (redirectUrl) {
        router.push(redirectUrl)
        return
      }

      router.push('/cliente/minhas-reservas')
    } catch (error) {
      console.error('Erro ao direcionar para grupo:', error)

      setMensagem(
        'Pagamento confirmado. Não foi possível abrir o grupo agora, mas ele ficará disponível nas suas reservas.'
      )

      setTimeout(() => {
        router.push('/cliente/minhas-reservas')
      }, 1400)
    } finally {
      setRedirecionandoGrupo(false)
    }
  }

  const copiarPix = async () => {
    const codigo =
      pix?.pix_code ||
      pix?.digitable_line ||
      pix?.qr_code ||
      pix?.qrcode ||
      ''

    if (!codigo) {
      setErro('Código PIX não disponível para copiar.')
      return
    }

    try {
      await navigator.clipboard.writeText(codigo)
      setMensagem('Código PIX copiado.')
    } catch {
      setErro('Não foi possível copiar automaticamente. Selecione e copie manualmente.')
    }
  }

  const qrCodeImagem = () => {
    const base =
      pix?.pix_qr_code ||
      pix?.qr_code_base64 ||
      pix?.qr_code ||
      pix?.qrcode ||
      ''

    if (!base) return ''

    if (String(base).startsWith('data:image')) return base

    if (String(base).length > 200 && !String(base).startsWith('http')) {
      return `data:image/png;base64,${base}`
    }

    return String(base)
  }

  const codigoPix = () => {
    return pix?.pix_code || pix?.digitable_line || ''
  }

  if (carregando) {
    return (
      <main className="loading">
        <style>{`
          * { box-sizing: border-box; }

          body {
            margin: 0;
            background: #f6f7f1;
            font-family:
              Inter,
              ui-sans-serif,
              system-ui,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
          }

          .loading {
            min-height: 100vh;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            background:
              radial-gradient(circle at top left, rgba(132, 204, 22, 0.18), transparent 30%),
              linear-gradient(180deg, #fffdf7 0%, #eef2e5 100%);
            color: #374151;
          }

          .loadingCard {
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.06);
            border-radius: 30px;
            padding: 28px;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
            text-align: center;
          }

          .loadingCard img {
            height: 68px;
            width: auto;
            margin-bottom: 12px;
          }
        `}</style>

        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>Preparando pagamento...</div>
        </div>
      </main>
    )
  }

  const foto = imagemRoteiro(roteiro)
  const imagemQr = qrCodeImagem()
  const codigo = codigoPix()

  return (
    <main className="page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f6f7f1;
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
            radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.16), transparent 28%),
            radial-gradient(circle at 90% 10%, rgba(251, 146, 60, 0.14), transparent 28%),
            linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
          color: #172018;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(255, 253, 247, 0.86);
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(18px);
          padding: 10px 16px;
        }

        .headerInner {
          max-width: 1180px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          min-width: 0;
        }

        .brand img {
          height: 34px;
          width: auto;
          object-fit: contain;
          display: block;
          flex: 0 0 auto;
        }

        .brandTitle {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(25px, 3.4vw, 38px);
          font-weight: 700;
          color: #203c2e;
          line-height: 0.9;
          letter-spacing: -0.055em;
        }

        .brandSub {
          color: #7b8372;
          font-size: 9px;
          font-weight: 850;
          margin-top: 5px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .headerActions {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .iconBtn {
          height: 38px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(255,255,255,0.78);
          border-radius: 999px;
          padding: 0 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          font-weight: 900;
          transition: 0.2s ease;
          color: #172018;
          white-space: nowrap;
        }

        .iconBtn.primary {
          background: #172018;
          color: #ffffff;
          border-color: #172018;
        }

        .container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 22px 16px 48px;
        }

        .hero {
          position: relative;
          overflow: hidden;
          border-radius: 38px;
          padding: 30px;
          min-height: 300px;
          background:
            linear-gradient(135deg, rgba(23, 32, 24, 0.76), rgba(23, 32, 24, 0.34)),
            radial-gradient(circle at top right, rgba(190, 242, 100, 0.30), transparent 34%),
            linear-gradient(135deg, #1f331f 0%, #647a49 46%, #d7c6a1 100%);
          color: #ffffff;
          box-shadow: 0 24px 60px rgba(23, 32, 24, 0.18);
          margin-bottom: 16px;
        }

        .hero::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 46px 46px;
          mask-image: linear-gradient(to bottom, black, transparent);
          pointer-events: none;
        }

        .heroContent {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: 24px;
          align-items: end;
          min-height: 240px;
        }

        .eyebrow {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.26);
          background: rgba(255, 255, 255, 0.12);
          color: #f7fee7;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .heroTitle {
          margin: 0;
          max-width: 760px;
          font-size: clamp(40px, 6vw, 70px);
          line-height: 0.92;
          font-weight: 950;
          letter-spacing: -0.085em;
        }

        .heroTitle span {
          color: #bef264;
          text-shadow: 0 0 28px rgba(190, 242, 100, 0.32);
        }

        .heroText {
          max-width: 650px;
          color: rgba(255,255,255,0.82);
          line-height: 1.62;
          margin: 16px 0 0;
          font-size: 14px;
        }

        .heroCard {
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 30px;
          padding: 20px;
          backdrop-filter: blur(16px);
        }

        .heroCardLabel {
          color: rgba(255,255,255,0.76);
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }

        .heroCardValue {
          margin-top: 9px;
          color: #ffffff;
          font-size: 30px;
          line-height: 1.05;
          font-weight: 950;
          letter-spacing: -0.07em;
        }

        .heroCardText {
          margin-top: 8px;
          color: rgba(255,255,255,0.78);
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
        }

        .alert {
          border-radius: 18px;
          padding: 13px 15px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.45;
        }

        .alert.success {
          background: #ecfdf5;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .alert.error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .mainGrid {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(360px, 1.05fr);
          gap: 16px;
          align-items: start;
        }

        .panel {
          background: rgba(255,255,255,0.88);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 32px;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
          overflow: hidden;
        }

        .panelHeader {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
        }

        .panelTitle {
          margin: 0;
          font-size: 19px;
          font-weight: 950;
          color: #172018;
          letter-spacing: -0.04em;
        }

        .panelSub {
          margin-top: 3px;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.45;
        }

        .panelBody {
          padding: 18px;
        }

        .roteiroCard {
          display: grid;
          gap: 14px;
        }

        .imageBox {
          width: 100%;
          min-height: 230px;
          background:
            radial-gradient(circle at top right, rgba(251, 146, 60, 0.20), transparent 38%),
            linear-gradient(135deg, #dbe7c8, #aebf8d);
          border-radius: 26px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-weight: 950;
        }

        .imageBox img {
          width: 100%;
          height: 100%;
          min-height: 230px;
          object-fit: cover;
          display: block;
        }

        .infoRows {
          display: grid;
          gap: 10px;
        }

        .infoRow {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          background: #fffdf7;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 20px;
          padding: 12px 14px;
          color: #475569;
          font-size: 13px;
          font-weight: 800;
        }

        .infoRow strong {
          color: #172018;
          text-align: right;
        }

        .paymentBox {
          background:
            radial-gradient(circle at top right, rgba(190, 242, 100, 0.20), transparent 38%),
            #172018;
          color: #ffffff;
          border-radius: 30px;
          padding: 22px;
          margin-bottom: 16px;
        }

        .paymentLabel {
          color: rgba(255,255,255,0.70);
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.10em;
        }

        .paymentValue {
          color: #bef264;
          font-size: 38px;
          font-weight: 950;
          letter-spacing: -0.08em;
          margin-top: 8px;
        }

        .paymentText {
          margin-top: 8px;
          color: rgba(255,255,255,0.74);
          font-size: 13px;
          line-height: 1.55;
          font-weight: 700;
        }

        .saldoBox {
          background: rgba(255, 253, 247, 0.92);
          border: 1px solid rgba(32, 60, 46, 0.10);
          border-radius: 28px;
          padding: 18px;
          margin-bottom: 16px;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
        }

        .saldoTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 12px;
        }

        .saldoLabel {
          color: #7b8372;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }

        .saldoValue {
          margin-top: 6px;
          color: #203c2e;
          font-size: 28px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.07em;
        }

        .saldoBadge {
          border-radius: 999px;
          background: rgba(132, 204, 22, 0.14);
          color: #365314;
          padding: 8px 10px;
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
        }

        .saldoText {
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
          font-weight: 700;
          margin: 0 0 12px;
        }

        .saldoResumo {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin: 12px 0;
        }

        .saldoMini {
          border-radius: 18px;
          background: #f6f7f1;
          border: 1px solid rgba(15, 23, 42, 0.05);
          padding: 10px;
          min-width: 0;
        }

        .saldoMini span {
          display: block;
          color: #7b8372;
          font-size: 10px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .saldoMini strong {
          display: block;
          margin-top: 4px;
          color: #172018;
          font-size: 13px;
          font-weight: 950;
          overflow-wrap: anywhere;
        }

        .saldoMovs {
          margin-top: 12px;
          border-top: 1px solid rgba(15, 23, 42, 0.06);
          padding-top: 10px;
          display: grid;
          gap: 7px;
        }

        .saldoMov {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: #64748b;
          font-size: 11px;
          font-weight: 750;
        }

        .saldoMov strong {
          color: #203c2e;
          white-space: nowrap;
        }

        .qrBox {
          background: #fffdf7;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 26px;
          padding: 16px;
          text-align: center;
        }

        .qrImage {
          width: 230px;
          max-width: 100%;
          height: auto;
          border-radius: 18px;
          background: #ffffff;
          padding: 8px;
          margin: 0 auto;
          display: block;
        }

        .pixCode {
          margin-top: 14px;
          background: #f6f7f1;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 18px;
          padding: 12px;
          color: #475569;
          font-size: 12px;
          line-height: 1.45;
          word-break: break-all;
          max-height: 120px;
          overflow: auto;
          text-align: left;
        }

        .actions {
          display: grid;
          gap: 10px;
          margin-top: 16px;
        }

        .btn {
          border: none;
          border-radius: 999px;
          padding: 14px 18px;
          font-size: 13px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
          width: 100%;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.10);
        }

        .btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .btn.primary {
          background: #16a34a;
          color: #ffffff;
        }

        .btn.dark {
          background: #172018;
          color: #ffffff;
        }

        .btn.light {
          background: #eef2e5;
          color: #475569;
        }

        .btn.gold {
          background: linear-gradient(135deg, #d4b35a, #8b5e34);
          color: #fffdf7;
        }

        .btn.outline {
          background: transparent;
          border: 1px solid rgba(32, 60, 46, 0.20);
          color: #203c2e;
        }

        .statusPill {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          padding: 8px 11px;
          font-size: 11px;
          font-weight: 950;
          margin-top: 14px;
        }

        .statusPill.pending {
          background: #fef3c7;
          color: #92400e;
        }

        .statusPill.success {
          background: #dcfce7;
          color: #166534;
        }

        @media (max-width: 1040px) {
          .mainGrid,
          .heroContent {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .header {
            padding: 9px 12px;
          }

          .brandTitle,
          .brandSub {
            display: none;
          }

          .headerActions .hideMobile {
            display: none;
          }

          .container {
            padding: 16px 12px 42px;
          }

          .hero,
          .panel {
            border-radius: 28px;
          }

          .hero {
            padding: 22px;
            min-height: auto;
          }

          .heroContent {
            min-height: auto;
          }
        }

        @media (max-width: 480px) {
          .heroTitle {
            font-size: 40px;
          }

          .brand img {
            height: 38px;
          }

          .paymentValue {
            font-size: 32px;
          }

          .saldoResumo {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <div
            className="brand"
            onClick={() => router.push('/cliente/dashboard')}
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />

            <div>
              <div className="brandTitle">PrussikTrails</div>
              <div className="brandSub">Pagamento da reserva</div>
            </div>
          </div>

          <div className="headerActions">
            <button
              type="button"
              className="iconBtn hideMobile"
              onClick={() => router.push('/cliente/minhas-reservas')}
            >
              Reservas
            </button>

            <button
              type="button"
              className="iconBtn primary"
              onClick={() => router.push('/cliente/perfil')}
            >
              Perfil
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroContent">
            <div>
              <div className="eyebrow">
                {pagamentoConfirmado ? 'Pagamento confirmado' : 'Pagamento PIX'}
              </div>

              <h1 className="heroTitle">
                {pagamentoConfirmado
                  ? (
                    <>
                      Tudo certo.
                      <br />
                      Agora você entra no <span>grupo da aventura.</span>
                    </>
                  )
                  : (
                    <>
                      Falta pouco para sua <span>próxima jornada.</span>
                    </>
                  )}
              </h1>

              <p className="heroText">
                Pague pelo PIX e aguarde a confirmação automática. Assim que o sistema
                confirmar o pagamento, você será direcionado para o grupo interno do roteiro.
              </p>
            </div>

            <aside className="heroCard">
              <div className="heroCardLabel">Reserva</div>
              <div className="heroCardValue">
                {reserva?.id ? reserva.id.slice(0, 8).toUpperCase() : '-'}
              </div>
              <div className="heroCardText">
                {ultimaVerificacao
                  ? `Última verificação às ${ultimaVerificacao}.`
                  : 'Verificação automática ativada.'}
              </div>
            </aside>
          </div>
        </section>

        {mensagem && (
          <div className="alert success">{mensagem}</div>
        )}

        {erro && (
          <div className="alert error">{erro}</div>
        )}

        <section className="mainGrid">
          <section className="panel">
            <div className="panelHeader">
              <h2 className="panelTitle">Resumo da reserva</h2>
              <div className="panelSub">
                Confira os dados principais antes de pagar.
              </div>
            </div>

            <div className="panelBody">
              <div className="roteiroCard">
                <div className="imageBox">
                  {foto ? (
                    <img src={foto} alt={tituloRoteiro(roteiro)} />
                  ) : (
                    'Roteiro'
                  )}
                </div>

                <div>
                  <h3
                    style={{
                      margin: 0,
                      color: '#172018',
                      fontSize: 24,
                      lineHeight: 1.05,
                      fontWeight: 950,
                      letterSpacing: '-0.06em'
                    }}
                  >
                    {tituloRoteiro(roteiro)}
                  </h3>

                  <div
                    style={{
                      marginTop: 8,
                      color: '#64748b',
                      fontSize: 13,
                      fontWeight: 750,
                      lineHeight: 1.5
                    }}
                  >
                    {localRoteiro(roteiro)}
                  </div>
                </div>

                <div className="infoRows">
                  <div className="infoRow">
                    <span>Data</span>
                    <strong>{formatarData(dataRoteiro(roteiro))}</strong>
                  </div>

                  <div className="infoRow">
                    <span>Hora</span>
                    <strong>{horaRoteiro(roteiro) || '-'}</strong>
                  </div>

                  <div className="infoRow">
                    <span>Pessoas</span>
                    <strong>{reserva?.quantidade_pessoas || 1}</strong>
                  </div>

                  <div className="infoRow">
                    <span>Status</span>
                    <strong>{reserva?.status || 'pendente'}</strong>
                  </div>

                  <div className="infoRow">
                    <span>Pagamento</span>
                    <strong>{reserva?.pagamento_status || 'pendente'}</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside>
            <section className="paymentBox">
              <div className="paymentLabel">Valor a pagar agora</div>

              <div className="paymentValue">
                {formatarMoeda(valorAPagarReserva(reserva))}
              </div>

              <div className="paymentText">
                Valor total da reserva: {formatarMoeda(valorTotalReserva(reserva))}.
                {saldoUtilizadoReserva(reserva) > 0
                  ? ` Saldo aplicado: ${formatarMoeda(saldoUtilizadoReserva(reserva))}.`
                  : ' Você pode usar Saldo de Jornada antes de gerar o PIX, se tiver saldo disponível.'}
              </div>

              <div
                className={`statusPill ${pagamentoConfirmado ? 'success' : 'pending'}`}
              >
                {pagamentoConfirmado
                  ? 'Pagamento confirmado'
                  : valorAPagarReserva(reserva) <= 0
                    ? 'Coberto por saldo'
                    : 'Aguardando pagamento'}
              </div>
            </section>

            <section className="saldoBox">
              <div className="saldoTop">
                <div>
                  <div className="saldoLabel">Saldo de Jornada</div>
                  <div className="saldoValue">{formatarMoeda(saldoDisponivel())}</div>
                </div>

                <div className="saldoBadge">Carteira Prussik</div>
              </div>

              <p className="saldoText">
                Use créditos de cancelamentos ou ajustes administrativos para abater
                o valor desta nova aventura.
              </p>

              <div className="saldoResumo">
                <div className="saldoMini">
                  <span>Total</span>
                  <strong>{formatarMoeda(valorTotalReserva(reserva))}</strong>
                </div>

                <div className="saldoMini">
                  <span>Saldo usado</span>
                  <strong>{formatarMoeda(saldoUtilizadoReserva(reserva))}</strong>
                </div>

                <div className="saldoMini">
                  <span>Restante</span>
                  <strong>{formatarMoeda(valorAPagarReserva(reserva))}</strong>
                </div>
              </div>

              {movimentacoesSaldo.length > 0 && (
                <div className="saldoMovs">
                  {movimentacoesSaldo.slice(0, 3).map((mov) => (
                    <div key={mov.id} className="saldoMov">
                      <span>{mov.descricao || mov.motivo || mov.tipo || 'Movimentação'}</span>
                      <strong>{formatarMoeda(mov.valor || 0)}</strong>
                    </div>
                  ))}
                </div>
              )}

              <div className="actions">
                <button
                  type="button"
                  className="btn gold"
                  onClick={aplicarSaldoNaReserva}
                  disabled={!podeAplicarSaldo() || aplicandoSaldo || pagamentoConfirmado}
                >
                  {aplicandoSaldo
                    ? 'Aplicando saldo...'
                    : saldoUtilizadoReserva(reserva) > 0
                      ? 'Saldo já aplicado'
                      : 'Usar saldo nesta jornada'}
                </button>

                {podeAplicarSaldo() && !pix && (
                  <button
                    type="button"
                    className="btn outline"
                    onClick={gerarPixSemSaldo}
                    disabled={gerandoPix}
                  >
                    Gerar PIX sem usar saldo
                  </button>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panelHeader">
                <h2 className="panelTitle">PIX</h2>
                <div className="panelSub">
                  Copie o código ou use o QR Code. O PIX será gerado apenas do valor restante.
                </div>
              </div>

              <div className="panelBody">
                {pagamentoConfirmado ? (
                  <div className="qrBox">
                    <div
                      style={{
                        fontSize: 46,
                        marginBottom: 10
                      }}
                    >
                      ✅
                    </div>

                    <strong>Pagamento confirmado</strong>

                    <p
                      style={{
                        color: '#64748b',
                        fontSize: 13,
                        lineHeight: 1.5,
                        fontWeight: 700
                      }}
                    >
                      Estamos preparando seu acesso ao grupo do roteiro.
                    </p>
                  </div>
                ) : gerandoPix ? (
                  <div className="qrBox">
                    Gerando PIX...
                  </div>
                ) : (
                  <>
                    <div className="qrBox">
                      {imagemQr ? (
                        <img
                          className="qrImage"
                          src={imagemQr}
                          alt="QR Code PIX"
                        />
                      ) : (
                        <div
                          style={{
                            color: '#64748b',
                            fontSize: 13,
                            fontWeight: 700,
                            lineHeight: 1.5
                          }}
                        >
                          {podeAplicarSaldo() ? 'Aplique seu Saldo de Jornada ou gere o PIX sem saldo.' : 'QR Code ainda não disponível. Use o botão para verificar ou gerar novamente.'}
                        </div>
                      )}

                      {codigo && (
                        <div className="pixCode">
                          {codigo}
                        </div>
                      )}
                    </div>

                    <div className="actions">
                      <button
                        type="button"
                        className="btn dark"
                        onClick={copiarPix}
                        disabled={!codigo}
                      >
                        Copiar código PIX
                      </button>

                      <button
                        type="button"
                        className="btn primary"
                        onClick={() => verificarPagamento(false)}
                        disabled={verificando || redirecionandoGrupo}
                      >
                        {verificando
                          ? 'Verificando...'
                          : redirecionandoGrupo
                            ? 'Abrindo grupo...'
                            : 'Já paguei'}
                      </button>

                      <button
                        type="button"
                        className="btn light"
                        onClick={() => router.push('/cliente/minhas-reservas')}
                      >
                        Voltar para reservas
                      </button>
                    </div>
                  </>
                )}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  )
}