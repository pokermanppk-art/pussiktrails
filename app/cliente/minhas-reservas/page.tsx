'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type UsuarioLocal = {
  id: string
  nome?: string
  email?: string
  tipo?: string
}

type ReservaRaw = {
  id: string
  cliente_id?: string | null
  roteiro_id?: string | null
  quantidade_pessoas?: number | null
  valor_total?: number | null
  status?: string | null
  pagamento_status?: string | null
  chat_id?: string | null
  created_at?: string | null
  paghiper_order_id?: string | null
  paghiper_transaction_id?: string | null
  order_id?: string | null
  transaction_id?: string | null
}

type Roteiro = {
  id: string
  titulo?: string | null
  preco?: number | null
  id_guia?: string | null
  local?: string | null
  localizacao?: string | null
  data_roteiro?: string | null
  hora_roteiro?: string | null
  local_encontro?: string | null
}

type Guia = {
  id: string
  nome?: string | null
  email?: string | null
}

type ReservaCompleta = ReservaRaw & {
  roteiro?: Roteiro | null
  guia_nome?: string
  roteiro_titulo?: string
  valor_final: number
}

export default function MinhasReservasPage() {
  const router = useRouter()
  const carregouRef = useRef(false)
  const reconciliacaoEmCursoRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [reservas, setReservas] = useState<ReservaCompleta[]>([])
  const [carregando, setCarregando] = useState(true)
  const [reconciliando, setReconciliando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [ultimaVerificacao, setUltimaVerificacao] = useState('')

  useEffect(() => {
    if (carregouRef.current) return

    carregouRef.current = true
    iniciarPagina()
  }, [])

  useEffect(() => {
    if (!user?.id) return

    const interval = setInterval(() => {
      reconciliarReservasPendentes(true)
    }, 15000)

    return () => clearInterval(interval)
  }, [user?.id, reservas])

  const iniciarPagina = async () => {
    setCarregando(true)
    setMensagem('')

    try {
      const userData = localStorage.getItem('user')

      if (!userData) {
        router.push('/login')
        return
      }

      const parsedUser: UsuarioLocal = JSON.parse(userData)

      if (parsedUser.tipo !== 'cliente') {
        router.push('/login')
        return
      }

      setUser(parsedUser)

      const reservasCarregadas = await carregarReservas(parsedUser.id)

      await reconciliarListaDeReservas(reservasCarregadas, true)

      await carregarReservas(parsedUser.id)
    } catch (error) {
      console.error('Erro ao iniciar minhas reservas:', error)
      setMensagem('Erro ao carregar suas reservas.')
    } finally {
      setCarregando(false)
    }
  }

  const carregarReservas = async (clienteId: string) => {
    const { data: reservasData, error: reservasError } = await supabase
      .from('reservas')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })

    if (reservasError) {
      console.error('Erro ao buscar reservas:', reservasError)
      setMensagem('Erro ao buscar reservas.')
      setReservas([])
      return []
    }

    const reservasBase = (reservasData || []) as ReservaRaw[]

    if (reservasBase.length === 0) {
      setReservas([])
      return []
    }

    const roteiroIds = Array.from(
      new Set(
        reservasBase
          .map((reserva) => reserva.roteiro_id)
          .filter(Boolean) as string[]
      )
    )

    let roteiros: Roteiro[] = []

    if (roteiroIds.length > 0) {
      const { data: roteirosData, error: roteirosError } = await supabase
        .from('roteiros')
        .select(
          'id, titulo, preco, id_guia, local, localizacao, data_roteiro, hora_roteiro, local_encontro'
        )
        .in('id', roteiroIds)

      if (roteirosError) {
        console.warn('Erro ao buscar roteiros:', roteirosError)
      } else {
        roteiros = (roteirosData || []) as Roteiro[]
      }
    }

    const guiaIds = Array.from(
      new Set(
        roteiros
          .map((roteiro) => roteiro.id_guia)
          .filter(Boolean) as string[]
      )
    )

    let guias: Guia[] = []

    if (guiaIds.length > 0) {
      const { data: guiasData, error: guiasError } = await supabase
        .from('users')
        .select('id, nome, email')
        .in('id', guiaIds)

      if (guiasError) {
        console.warn('Erro ao buscar guias:', guiasError)
      } else {
        guias = (guiasData || []) as Guia[]
      }
    }

    const reservasCompletas: ReservaCompleta[] = reservasBase.map((reserva) => {
      const roteiro =
        roteiros.find((item) => item.id === reserva.roteiro_id) || null

      const guia =
        guias.find((item) => item.id === roteiro?.id_guia) || null

      const quantidade = Number(reserva.quantidade_pessoas || 1)
      const valorReserva = Number(reserva.valor_total || 0)
      const valorRoteiro = Number(roteiro?.preco || 0)

      const valorFinal =
        valorReserva > 0
          ? valorReserva
          : valorRoteiro > 0
            ? valorRoteiro * quantidade
            : 0

      return {
        ...reserva,
        roteiro,
        guia_nome: guia?.nome || 'Guia',
        roteiro_titulo: roteiro?.titulo || 'Roteiro não encontrado',
        valor_final: valorFinal
      }
    })

    setReservas(reservasCompletas)

    return reservasCompletas
  }

  const parseJsonSeguro = async (response: Response) => {
    const texto = await response.text()

    try {
      return texto ? JSON.parse(texto) : null
    } catch {
      return {
        sucesso: false,
        erro: `Resposta inválida da rota. Status HTTP ${response.status}.`
      }
    }
  }

  const normalizarStatus = (status?: string | null) => {
    return String(status || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }

  const pagamentoConfirmado = (reserva: ReservaCompleta | ReservaRaw) => {
    const pagamento = normalizarStatus(reserva.pagamento_status)
    const status = normalizarStatus(reserva.status)

    return (
      pagamento === 'pago' ||
      pagamento === 'confirmado' ||
      status === 'confirmada'
    )
  }

  const reservaCancelada = (reserva: ReservaCompleta | ReservaRaw) => {
    return normalizarStatus(reserva.status) === 'cancelada'
  }

  const reservaPendentePagamento = (reserva: ReservaCompleta | ReservaRaw) => {
    return !pagamentoConfirmado(reserva) && !reservaCancelada(reserva)
  }

  const reconciliarUmaReserva = async (
    reserva: ReservaCompleta | ReservaRaw,
    silencioso = false
  ) => {
    if (!reserva?.id) {
      return {
        sucesso: false,
        erro: 'Reserva sem ID.'
      }
    }

    try {
      const response = await fetch('/api/paghiper/reconciliar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reservaId: reserva.id,
          orderId:
            reserva.paghiper_order_id ||
            reserva.order_id ||
            undefined,
          transactionId:
            reserva.paghiper_transaction_id ||
            reserva.transaction_id ||
            undefined
        })
      })

      const data = await parseJsonSeguro(response)

      if (!response.ok || !data?.sucesso) {
        if (!silencioso) {
          console.warn('Falha ao reconciliar reserva:', reserva.id, data)
        }

        return {
          sucesso: false,
          reservaId: reserva.id,
          erro:
            data?.erro ||
            data?.message ||
            'Não foi possível reconciliar esta reserva.'
        }
      }

      return {
        sucesso: true,
        reservaId: reserva.id,
        data
      }
    } catch (error: any) {
      console.warn('Erro ao chamar reconciliação da reserva:', reserva.id, error)

      return {
        sucesso: false,
        reservaId: reserva.id,
        erro: error?.message || 'Erro ao consultar PagHiper.'
      }
    }
  }

  const reconciliarListaDeReservas = async (
    lista: ReservaCompleta[] | ReservaRaw[],
    silencioso = false
  ) => {
    if (reconciliacaoEmCursoRef.current) return false

    const pendentes = lista.filter((reserva) =>
      reservaPendentePagamento(reserva)
    )

    if (pendentes.length === 0) {
      return false
    }

    reconciliacaoEmCursoRef.current = true

    if (!silencioso) {
      setReconciliando(true)
      setMensagem('Consultando pagamentos na PagHiper...')
    }

    try {
      let algumaAtualizada = false

      for (const reserva of pendentes) {
        const resultado = await reconciliarUmaReserva(reserva, silencioso)

        const resultados = resultado?.data?.resultados

        if (Array.isArray(resultados)) {
          const atualizou = resultados.some(
            (item: any) => item.atualizado || item.jaEstavaConfirmada
          )

          if (atualizou) {
            algumaAtualizada = true
          }
        }
      }

      setUltimaVerificacao(new Date().toLocaleTimeString('pt-BR'))

      if (!silencioso) {
        setMensagem(
          algumaAtualizada
            ? 'Pagamento confirmado e reservas atualizadas.'
            : 'Consulta realizada. A PagHiper ainda não confirmou novos pagamentos.'
        )
      }

      return algumaAtualizada
    } finally {
      reconciliacaoEmCursoRef.current = false

      if (!silencioso) {
        setReconciliando(false)
      }
    }
  }

  const reconciliarReservasPendentes = async (silencioso = false) => {
    if (!user?.id) return

    const atualizou = await reconciliarListaDeReservas(reservas, silencioso)

    if (atualizou) {
      await carregarReservas(user.id)
    }
  }

  const recarregar = async () => {
    if (!user?.id) return

    setCarregando(true)
    setMensagem('')

    try {
      const reservasAtualizadas = await carregarReservas(user.id)
      await reconciliarListaDeReservas(reservasAtualizadas, false)
      await carregarReservas(user.id)
    } finally {
      setCarregando(false)
    }
  }

  const cancelarReserva = async (reservaId: string) => {
    const confirmar = window.confirm(
      'Tem certeza que deseja cancelar esta reserva? Esta ação deve ser usada apenas quando realmente necessário.'
    )

    if (!confirmar) return

    setMensagem('')

    try {
      const { error } = await supabase
        .from('reservas')
        .update({
          status: 'cancelada'
        })
        .eq('id', reservaId)

      if (error) {
        console.error('Erro ao cancelar reserva:', error)
        setMensagem('Erro ao cancelar reserva.')
        return
      }

      if (user?.id) {
        await carregarReservas(user.id)
      }

      setMensagem('Reserva cancelada.')
    } catch (error) {
      console.error('Erro ao cancelar reserva:', error)
      setMensagem('Erro ao cancelar reserva.')
    }
  }

  const abrirPagamento = (reservaId: string) => {
    router.push(`/cliente/pagamento/${reservaId}`)
  }

  const sair = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  const formatarData = (data?: string | null) => {
    if (!data) return '-'

    const date = new Date(data)

    if (Number.isNaN(date.getTime())) {
      return data
    }

    return date.toLocaleDateString('pt-BR')
  }

  const badgePagamento = (reserva: ReservaCompleta) => {
    if (pagamentoConfirmado(reserva)) {
      return <span className="badge badge-green">Pago</span>
    }

    return <span className="badge badge-yellow">Pendente</span>
  }

  const badgeStatus = (reserva: ReservaCompleta) => {
    if (reservaCancelada(reserva)) {
      return <span className="badge badge-red">Cancelada</span>
    }

    if (pagamentoConfirmado(reserva)) {
      return <span className="badge badge-green">Confirmada</span>
    }

    return <span className="badge badge-yellow">Aguardando pagamento</span>
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

          .loadingPage {
            min-height: 100vh;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f3f4f6;
            color: #374151;
          }

          .loadingCard {
            background: #ffffff;
            border-radius: 24px;
            padding: 26px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
            text-align: center;
          }

          .logoImg {
            height: 52px;
            width: auto;
            object-fit: contain;
            margin-bottom: 12px;
          }
        `}</style>

        <div className="loadingCard">
          <img
            src="/logo-prussik-display.png"
            alt="PrussikTrails"
            className="logoImg"
          />
          <p>Carregando suas reservas...</p>
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
            radial-gradient(circle at top left, rgba(22, 163, 74, 0.08), transparent 32%),
            linear-gradient(180deg, #f9fafb 0%, #eef2f7 100%);
          color: #111827;
        }

        .header {
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          padding: 14px 18px;
          position: sticky;
          top: 0;
          z-index: 30;
        }

        .headerInner {
          max-width: 1240px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .brand img {
          height: 44px;
          width: auto;
          object-fit: contain;
          display: block;
        }

        .brandText {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .brandTitle {
          color: #dc2626;
          font-weight: 900;
          font-size: 20px;
          line-height: 1;
        }

        .brandSubtitle {
          color: #6b7280;
          font-size: 12px;
        }

        .actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .btn {
          border: none;
          border-radius: 999px;
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
          white-space: nowrap;
        }

        .btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .btn-light {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-dark {
          background: #111827;
          color: #ffffff;
        }

        .btn-green {
          background: #16a34a;
          color: #ffffff;
        }

        .btn-red {
          background: #dc2626;
          color: #ffffff;
        }

        .btn-soft-red {
          background: #fee2e2;
          color: #991b1b;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.08);
        }

        .container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 22px 16px 46px;
        }

        .pageTitle {
          margin-bottom: 18px;
        }

        .pageTitle h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 900;
          color: #111827;
        }

        .pageTitle p {
          margin: 6px 0 0;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.5;
        }

        .message {
          margin-bottom: 16px;
          padding: 13px 14px;
          border-radius: 16px;
          font-size: 13px;
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        }

        .empty {
          background: #ffffff;
          border-radius: 26px;
          border: 1px solid #eef2f7;
          padding: 32px;
          text-align: center;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }

        .empty h2 {
          margin: 0 0 8px;
          color: #111827;
          font-size: 22px;
        }

        .empty p {
          margin: 0 0 18px;
          color: #6b7280;
        }

        .tableCard {
          background: #ffffff;
          border-radius: 26px;
          border: 1px solid #eef2f7;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          overflow: hidden;
        }

        .desktopTable {
          width: 100%;
          border-collapse: collapse;
        }

        .desktopTable th {
          text-align: left;
          padding: 14px 12px;
          color: #6b7280;
          font-size: 12px;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .desktopTable td {
          padding: 14px 12px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 13px;
          color: #374151;
          vertical-align: middle;
        }

        .desktopTable tr:last-child td {
          border-bottom: none;
        }

        .roteiroNome {
          color: #111827;
          font-weight: 900;
        }

        .valor {
          color: #16a34a;
          font-weight: 900;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .badge-green {
          background: #dcfce7;
          color: #166534;
        }

        .badge-yellow {
          background: #fef3c7;
          color: #92400e;
        }

        .badge-red {
          background: #fee2e2;
          color: #991b1b;
        }

        .rowActions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        .mobileList {
          display: none;
        }

        .mobileCard {
          background: #ffffff;
          border-radius: 22px;
          border: 1px solid #eef2f7;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          padding: 16px;
          margin-bottom: 12px;
        }

        .mobileTop {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .mobileTitle {
          color: #111827;
          font-weight: 900;
          font-size: 15px;
        }

        .mobileMeta {
          display: grid;
          gap: 6px;
          color: #6b7280;
          font-size: 13px;
          margin-bottom: 12px;
        }

        .mobileMeta strong {
          color: #374151;
        }

        @media (max-width: 860px) {
          .desktopWrap {
            display: none;
          }

          .mobileList {
            display: block;
          }

          .headerInner {
            align-items: flex-start;
          }

          .actions {
            width: 100%;
          }

          .actions .btn {
            flex: 1;
          }

          .pageTitle h1 {
            font-size: 24px;
          }
        }

        @media (max-width: 520px) {
          .container {
            padding: 16px 12px 38px;
          }

          .header {
            padding: 12px;
          }

          .brand img {
            height: 38px;
          }

          .brandTitle {
            font-size: 18px;
          }

          .rowActions {
            justify-content: stretch;
          }

          .rowActions .btn {
            flex: 1;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <div className="brand">
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />
            <div className="brandText">
              <div className="brandTitle">PrussikTrails</div>
              <div className="brandSubtitle">Minhas Reservas</div>
            </div>
          </div>

          <div className="actions">
            <button
              type="button"
              className="btn btn-light"
              onClick={() => router.push('/cliente/dashboard')}
            >
              Dashboard
            </button>

            <button
              type="button"
              className="btn btn-dark"
              onClick={() => router.push('/cliente/perfil')}
            >
              Perfil
            </button>

            <button
              type="button"
              className="btn btn-green"
              onClick={recarregar}
              disabled={reconciliando}
            >
              {reconciliando ? 'Verificando...' : 'Recarregar'}
            </button>

            <button
              type="button"
              className="btn btn-red"
              onClick={sair}
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="pageTitle">
          <h1>Minhas Reservas</h1>
          <p>
            Acompanhe suas aventuras. O sistema verifica automaticamente pagamentos pendentes na PagHiper.
            {ultimaVerificacao && (
              <>
                {' '}
                Última verificação: {ultimaVerificacao}.
              </>
            )}
          </p>
        </section>

        {mensagem && (
          <div className="message">
            {mensagem}
          </div>
        )}

        {reservas.length === 0 ? (
          <section className="empty">
            <h2>Nenhuma reserva encontrada</h2>
            <p>Você ainda não possui reservas cadastradas.</p>

            <button
              type="button"
              className="btn btn-green"
              onClick={() => router.push('/roteiros')}
            >
              Explorar roteiros
            </button>
          </section>
        ) : (
          <>
            <section className="tableCard desktopWrap">
              <table className="desktopTable">
                <thead>
                  <tr>
                    <th>Roteiro</th>
                    <th>Guia</th>
                    <th>Data</th>
                    <th>Pessoas</th>
                    <th>Valor</th>
                    <th>Pagamento</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {reservas.map((reserva) => {
                    const podePagar =
                      !pagamentoConfirmado(reserva) &&
                      !reservaCancelada(reserva)

                    const podeCancelar =
                      !reservaCancelada(reserva) &&
                      !pagamentoConfirmado(reserva)

                    return (
                      <tr key={reserva.id}>
                        <td>
                          <div className="roteiroNome">
                            {reserva.roteiro_titulo}
                          </div>
                        </td>

                        <td>{reserva.guia_nome}</td>

                        <td>{formatarData(reserva.created_at)}</td>

                        <td>{reserva.quantidade_pessoas || 1}</td>

                        <td>
                          <span className="valor">
                            R$ {reserva.valor_final.toFixed(2)}
                          </span>
                        </td>

                        <td>{badgePagamento(reserva)}</td>

                        <td>{badgeStatus(reserva)}</td>

                        <td>
                          <div className="rowActions">
                            {podePagar && (
                              <button
                                type="button"
                                className="btn btn-green"
                                onClick={() => abrirPagamento(reserva.id)}
                              >
                                Pagar
                              </button>
                            )}

                            {podeCancelar && (
                              <button
                                type="button"
                                className="btn btn-soft-red"
                                onClick={() => cancelarReserva(reserva.id)}
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </section>

            <section className="mobileList">
              {reservas.map((reserva) => {
                const podePagar =
                  !pagamentoConfirmado(reserva) &&
                  !reservaCancelada(reserva)

                const podeCancelar =
                  !reservaCancelada(reserva) &&
                  !pagamentoConfirmado(reserva)

                return (
                  <article className="mobileCard" key={reserva.id}>
                    <div className="mobileTop">
                      <div className="mobileTitle">
                        {reserva.roteiro_titulo}
                      </div>

                      {badgeStatus(reserva)}
                    </div>

                    <div className="mobileMeta">
                      <div>
                        <strong>Guia:</strong> {reserva.guia_nome}
                      </div>

                      <div>
                        <strong>Data:</strong> {formatarData(reserva.created_at)}
                      </div>

                      <div>
                        <strong>Pessoas:</strong> {reserva.quantidade_pessoas || 1}
                      </div>

                      <div>
                        <strong>Valor:</strong>{' '}
                        <span className="valor">
                          R$ {reserva.valor_final.toFixed(2)}
                        </span>
                      </div>

                      <div>
                        <strong>Pagamento:</strong> {badgePagamento(reserva)}
                      </div>
                    </div>

                    <div className="rowActions">
                      {podePagar && (
                        <button
                          type="button"
                          className="btn btn-green"
                          onClick={() => abrirPagamento(reserva.id)}
                        >
                          Pagar
                        </button>
                      )}

                      {podeCancelar && (
                        <button
                          type="button"
                          className="btn btn-soft-red"
                          onClick={() => cancelarReserva(reserva.id)}
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </section>
          </>
        )}
      </div>
    </main>
  )
}