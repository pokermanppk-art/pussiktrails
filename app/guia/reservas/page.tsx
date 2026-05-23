'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type ReservaGuia = {
  id: string
  cliente_id?: string
  id_cliente?: string
  guia_id?: string
  id_guia?: string
  roteiro_id?: string
  id_roteiro?: string
  chat_id?: string | null
  data_trilha?: string
  data_reserva?: string
  created_at?: string
  quantidade_pessoas?: number
  quantidade?: number
  valor_total?: number
  valor?: number
  status?: string
  pagamento_status?: string
  comprovante_url?: string | null
  comprovante_status?: string | null
  comprovante_origem?: string | null
  pagamento_confirmado_em?: string | null
  paghiper_status?: string | null
  paghiper_order_id?: string | null
  paghiper_transaction_id?: string | null
  roteiro_titulo?: string
  cliente_nome?: string
  cliente_email?: string
  cliente_telefone?: string
}

export default function GuiaReservasPage() {
  const router = useRouter()
  const carregouRef = useRef(false)

  const [user, setUser] = useState<any>(null)
  const [reservas, setReservas] = useState<ReservaGuia[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mensagem, setMensagem] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroPagamento, setFiltroPagamento] = useState('todos')
  const [filtroComprovante, setFiltroComprovante] = useState('todos')
  const [processandoId, setProcessandoId] = useState<string | null>(null)

  useEffect(() => {
    if (carregouRef.current) return

    carregouRef.current = true
    iniciar()
  }, [])

  const iniciar = async () => {
    try {
      const userData = localStorage.getItem('user')

      if (!userData) {
        router.push('/login')
        return
      }

      const parsedUser = JSON.parse(userData)

      if (parsedUser.tipo !== 'guia') {
        router.push('/login')
        return
      }

      setUser(parsedUser)
      await carregarReservas(parsedUser)
    } catch (error) {
      console.error('Erro ao iniciar página de reservas do guia:', error)
      setMensagem('Erro ao validar usuário guia.')
      setCarregando(false)
    }
  }

  const buscarRoteirosDoGuia = async (guiaId: string) => {
    const tentativaIdGuia = await supabase
      .from('roteiros')
      .select('*')
      .eq('id_guia', guiaId)

    if (!tentativaIdGuia.error) {
      return tentativaIdGuia.data || []
    }

    console.warn('Falha ao buscar roteiros por id_guia:', tentativaIdGuia.error)

    const tentativaGuiaId = await supabase
      .from('roteiros')
      .select('*')
      .eq('guia_id', guiaId)

    if (!tentativaGuiaId.error) {
      return tentativaGuiaId.data || []
    }

    console.warn('Falha ao buscar roteiros por guia_id:', tentativaGuiaId.error)

    return []
  }

  const buscarReservasPorColuna = async (
    coluna: string,
    valor: string
  ) => {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq(coluna, valor)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn(`Falha ao buscar reservas por ${coluna}:`, error)
      return []
    }

    return data || []
  }

  const buscarReservasPorRoteiros = async (
    coluna: string,
    roteiroIds: string[]
  ) => {
    if (roteiroIds.length === 0) return []

    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .in(coluna, roteiroIds)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn(`Falha ao buscar reservas por ${coluna}:`, error)
      return []
    }

    return data || []
  }

  const carregarReservas = async (usuarioParam?: any) => {
    setCarregando(true)
    setMensagem('')

    const usuario = usuarioParam || user
    const guiaId = usuario?.id

    if (!guiaId) {
      setMensagem('Não foi possível identificar o guia logado.')
      setReservas([])
      setCarregando(false)
      return
    }

    try {
      const roteirosDoGuia = await buscarRoteirosDoGuia(guiaId)

      const roteirosMap = roteirosDoGuia.reduce((acc, roteiro) => {
        acc[String(roteiro.id)] = roteiro
        return acc
      }, {} as Record<string, any>)

      const roteiroIds = roteirosDoGuia
        .map((roteiro) => String(roteiro.id))
        .filter(Boolean)

      const [
        reservasPorGuiaId,
        reservasPorIdGuia,
        reservasPorRoteiroId,
        reservasPorIdRoteiro
      ] = await Promise.all([
        buscarReservasPorColuna('guia_id', guiaId),
        buscarReservasPorColuna('id_guia', guiaId),
        buscarReservasPorRoteiros('roteiro_id', roteiroIds),
        buscarReservasPorRoteiros('id_roteiro', roteiroIds)
      ])

      const reservasUnicasMap: Record<string, any> = {}

      ;[
        ...reservasPorGuiaId,
        ...reservasPorIdGuia,
        ...reservasPorRoteiroId,
        ...reservasPorIdRoteiro
      ].forEach((reserva) => {
        reservasUnicasMap[String(reserva.id)] = reserva
      })

      const reservasBase = Object.values(reservasUnicasMap)

      const clienteIds = [
        ...new Set(
          reservasBase
            .map((reserva: any) => reserva.cliente_id || reserva.id_cliente)
            .filter(Boolean)
            .map(String)
        )
      ]

      let clientesMap: Record<string, any> = {}

      if (clienteIds.length > 0) {
        const { data: clientesData, error: clientesError } = await supabase
          .from('users')
          .select('id, nome, email, telefone')
          .in('id', clienteIds)

        if (clientesError) {
          console.warn('Erro ao buscar clientes:', clientesError)
        }

        if (clientesData) {
          clientesMap = clientesData.reduce((acc, cliente) => {
            acc[String(cliente.id)] = cliente
            return acc
          }, {} as Record<string, any>)
        }
      }

      const reservasCompletas: ReservaGuia[] = reservasBase.map((reserva: any) => {
        const roteiroId =
          reserva.roteiro_id ||
          reserva.id_roteiro

        const roteiro = roteiroId
          ? roteirosMap[String(roteiroId)]
          : null

        const clienteId =
          reserva.cliente_id ||
          reserva.id_cliente

        const cliente = clienteId
          ? clientesMap[String(clienteId)]
          : null

        const quantidade = Number(
          reserva.quantidade_pessoas ||
          reserva.quantidade ||
          1
        )

        const valorBase =
          reserva.valor_total ??
          reserva.valor ??
          (Number(roteiro?.preco || 0) * quantidade)

        return {
          ...reserva,
          roteiro_titulo:
            roteiro?.titulo ||
            roteiro?.nome ||
            reserva.roteiro_titulo ||
            reserva.titulo_roteiro ||
            'Roteiro não encontrado',
          cliente_nome:
            cliente?.nome ||
            reserva.cliente_nome ||
            reserva.nome_cliente ||
            'Cliente',
          cliente_email:
            cliente?.email ||
            reserva.cliente_email ||
            reserva.email_cliente ||
            '',
          cliente_telefone:
            cliente?.telefone ||
            reserva.cliente_telefone ||
            reserva.telefone_cliente ||
            '',
          quantidade_pessoas: quantidade,
          valor_total: Number(valorBase || 0)
        }
      })

      reservasCompletas.sort((a, b) => {
        const dataA = new Date(
          a.created_at ||
          a.data_trilha ||
          a.data_reserva ||
          ''
        ).getTime()

        const dataB = new Date(
          b.created_at ||
          b.data_trilha ||
          b.data_reserva ||
          ''
        ).getTime()

        return dataB - dataA
      })

      setReservas(reservasCompletas)
    } catch (error: any) {
      console.error('Erro ao carregar reservas do guia:', error)

      setMensagem(
        error?.message ||
        'Erro ao carregar reservas do guia.'
      )

      setReservas([])
    } finally {
      setCarregando(false)
    }
  }

  const reservasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return reservas.filter((reserva) => {
      const bateStatus =
        filtroStatus === 'todos' ||
        reserva.status === filtroStatus

      const batePagamento =
        filtroPagamento === 'todos' ||
        reserva.pagamento_status === filtroPagamento

      const origemComprovante =
        reserva.comprovante_origem ||
        reserva.comprovante_status ||
        ''

      const bateComprovante =
        filtroComprovante === 'todos' ||
        origemComprovante === filtroComprovante

      const bateBusca =
        !termo ||
        reserva.id?.toLowerCase().includes(termo) ||
        reserva.roteiro_titulo?.toLowerCase().includes(termo) ||
        reserva.cliente_nome?.toLowerCase().includes(termo) ||
        reserva.cliente_email?.toLowerCase().includes(termo) ||
        reserva.cliente_telefone?.toLowerCase().includes(termo) ||
        reserva.paghiper_order_id?.toLowerCase().includes(termo) ||
        reserva.paghiper_transaction_id?.toLowerCase().includes(termo)

      return bateStatus && batePagamento && bateComprovante && bateBusca
    })
  }, [
    reservas,
    busca,
    filtroStatus,
    filtroPagamento,
    filtroComprovante
  ])

  const atualizarStatusReserva = async (
    reservaId: string,
    payload: Record<string, any>,
    mensagemSucesso: string
  ) => {
    setProcessandoId(reservaId)
    setMensagem('')

    try {
      const { error } = await supabase
        .from('reservas')
        .update(payload)
        .eq('id', reservaId)

      if (error) {
        throw error
      }

      setMensagem(mensagemSucesso)

      if (user) {
        await carregarReservas(user)
      }
    } catch (error: any) {
      console.error('Erro ao atualizar reserva:', error)

      setMensagem(
        error?.message ||
        'Erro ao atualizar reserva.'
      )
    } finally {
      setProcessandoId(null)
    }
  }

  const confirmarReserva = async (reserva: ReservaGuia) => {
    await atualizarStatusReserva(
      reserva.id,
      {
        status: 'confirmada'
      },
      '✅ Reserva confirmada pelo guia.'
    )
  }

  const marcarComoRealizada = async (reserva: ReservaGuia) => {
    await atualizarStatusReserva(
      reserva.id,
      {
        status: 'realizada'
      },
      '✅ Reserva marcada como realizada.'
    )
  }

  const cancelarReserva = async (reserva: ReservaGuia) => {
    if (!confirm('Tem certeza que deseja cancelar esta reserva?')) return

    await atualizarStatusReserva(
      reserva.id,
      {
        status: 'cancelada'
      },
      'Reserva cancelada.'
    )
  }

  const abrirComprovante = (url?: string | null) => {
    if (!url) {
      setMensagem('Esta reserva ainda não possui comprovante disponível.')
      return
    }

    window.open(url, '_blank')
  }

  const abrirChat = (chatId?: string | null) => {
    if (!chatId) {
      setMensagem('Esta reserva ainda não possui chat liberado.')
      return
    }

    router.push(`/chat/${chatId}`)
  }

  const formatarData = (reserva: ReservaGuia) => {
    const valor =
      reserva.data_trilha ||
      reserva.data_reserva ||
      reserva.created_at

    if (!valor) return 'A definir'

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return 'A definir'

    return data.toLocaleDateString('pt-BR')
  }

  const formatarDataHora = (valor?: string | null) => {
    if (!valor) return 'Não confirmado'

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return 'Não confirmado'

    return data.toLocaleString('pt-BR')
  }

  const formatarMoeda = (valor?: number) => {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  const getPagamentoBadge = (pagamentoStatus?: string) => {
    if (pagamentoStatus === 'pago') {
      return {
        text: '✅ Pago',
        bg: '#dcfce7',
        color: '#166534'
      }
    }

    if (pagamentoStatus === 'aguardando_aprovacao') {
      return {
        text: '⏳ Em análise',
        bg: '#dbeafe',
        color: '#1d4ed8'
      }
    }

    if (pagamentoStatus === 'cancelado') {
      return {
        text: 'Cancelado',
        bg: '#fee2e2',
        color: '#991b1b'
      }
    }

    return {
      text: 'Pendente',
      bg: '#fef3c7',
      color: '#92400e'
    }
  }

  const getComprovanteBadge = (
    comprovanteStatus?: string | null,
    comprovanteOrigem?: string | null,
    comprovanteUrl?: string | null
  ) => {
    if (
      comprovanteOrigem === 'paghiper' ||
      comprovanteStatus === 'paghiper_confirmado'
    ) {
      return {
        text: 'PagHiper',
        bg: '#dcfce7',
        color: '#166534'
      }
    }

    if (comprovanteStatus === 'aprovado') {
      return {
        text: '✅ Aprovado',
        bg: '#dcfce7',
        color: '#166534'
      }
    }

    if (comprovanteStatus === 'reprovado') {
      return {
        text: '❌ Reprovado',
        bg: '#fee2e2',
        color: '#991b1b'
      }
    }

    if (comprovanteStatus === 'enviado' || comprovanteUrl) {
      return {
        text: '📎 Enviado',
        bg: '#dbeafe',
        color: '#1d4ed8'
      }
    }

    return {
      text: 'Não enviado',
      bg: '#f3f4f6',
      color: '#6b7280'
    }
  }

  const getStatusBadge = (
    status?: string,
    pagamentoStatus?: string
  ) => {
    if (status === 'confirmada' || pagamentoStatus === 'pago') {
      return {
        text: 'Confirmada',
        bg: '#dcfce7',
        color: '#166534'
      }
    }

    if (status === 'cancelada') {
      return {
        text: 'Cancelada',
        bg: '#fee2e2',
        color: '#991b1b'
      }
    }

    if (status === 'realizada') {
      return {
        text: 'Realizada',
        bg: '#e0e7ff',
        color: '#4338ca'
      }
    }

    return {
      text: 'Pendente',
      bg: '#fef3c7',
      color: '#92400e'
    }
  }

  const sair = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (carregando) {
    return (
      <div className="guia-loading">
        <style jsx global>{`
          .guia-loading {
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f3f4f6;
            color: #6b7280;
          }
        `}</style>

        Carregando reservas...
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        .guia-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: #f3f4f6;
        }

        .guia-header {
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          padding: 14px 18px;
          position: sticky;
          top: 0;
          z-index: 40;
        }

        .guia-header-inner {
          max-width: 1380px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .guia-main {
          max-width: 1380px;
          margin: 0 auto;
          padding: 20px 16px 46px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .stat-card {
          background: #ffffff;
          border-radius: 18px;
          padding: 14px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }

        .stat-label {
          font-size: 11px;
          color: #6b7280;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 22px;
          color: #111827;
          font-weight: 900;
        }

        .filters {
          background: #ffffff;
          border-radius: 22px;
          padding: 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          margin-bottom: 16px;
          display: grid;
          grid-template-columns: 1fr 180px 200px 200px;
          gap: 12px;
        }

        .filters input,
        .filters select {
          border: 1px solid #d1d5db;
          border-radius: 14px;
          padding: 11px 12px;
          font-size: 13px;
        }

        .table-card {
          background: #ffffff;
          border-radius: 24px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          overflow: hidden;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1260px;
        }

        th {
          background: #f9fafb;
          color: #6b7280;
          font-size: 11px;
          text-align: left;
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          white-space: nowrap;
        }

        td {
          padding: 12px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 12px;
          color: #374151;
          vertical-align: top;
        }

        .mobile-list {
          display: none;
        }

        .mobile-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          margin-bottom: 12px;
        }

        .badge {
          display: inline-block;
          border-radius: 999px;
          padding: 4px 9px;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .btn {
          border: none;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .btn-dark {
          background: #111827;
          color: #ffffff;
        }

        .btn-light {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-green {
          background: #16a34a;
          color: #ffffff;
        }

        .btn-blue {
          background: #2563eb;
          color: #ffffff;
        }

        .btn-red {
          background: #dc2626;
          color: #ffffff;
        }

        .btn-purple {
          background: #4f46e5;
          color: #ffffff;
        }

        .actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .alert {
          margin-bottom: 16px;
          padding: 13px 14px;
          border-radius: 14px;
          font-size: 13px;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .empty {
          background: #ffffff;
          border-radius: 24px;
          padding: 44px 20px;
          text-align: center;
          color: #6b7280;
        }

        @media (max-width: 920px) {
          .filters {
            grid-template-columns: 1fr 1fr;
          }

          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .filters {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .table-wrapper {
            display: none;
          }

          .mobile-list {
            display: block;
          }

          .guia-header-inner {
            align-items: flex-start;
          }

          .guia-main {
            padding: 16px 12px 38px;
          }

          .actions .btn {
            flex: 1;
            padding: 9px 11px;
          }
        }
      `}</style>

      <div className="guia-page">
        <header className="guia-header">
          <div className="guia-header-inner">
            <div>
              <h1 style={{ margin: 0, color: '#dc2626', fontSize: 21 }}>
                PrussikTrails
              </h1>

              <p style={{ margin: '3px 0 0', color: '#6b7280', fontSize: 12 }}>
                Reservas recebidas pelo guia
              </p>
            </div>

            <div className="actions">
              <button
                className="btn btn-light"
                onClick={() => router.push('/guia/dashboard')}
              >
                Dashboard
              </button>

              <button
                className="btn btn-green"
                onClick={() => carregarReservas(user)}
              >
                Recarregar
              </button>

              <button
                className="btn btn-red"
                onClick={sair}
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        <main className="guia-main">
          <h2 style={{ margin: '0 0 12px', color: '#111827' }}>
            📋 Minhas reservas
          </h2>

          <p style={{ margin: '0 0 18px', color: '#6b7280', fontSize: 14 }}>
            Acompanhe reservas dos seus roteiros, pagamentos, comprovantes e chats liberados após confirmação.
          </p>

          {mensagem && <div className="alert">{mensagem}</div>}

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total de reservas</div>
              <div className="stat-value">{reservas.length}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Pagas</div>
              <div className="stat-value">
                {reservas.filter((reserva) => reserva.pagamento_status === 'pago').length}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Comprovantes</div>
              <div className="stat-value">
                {reservas.filter((reserva) => reserva.comprovante_url).length}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Chats abertos</div>
              <div className="stat-value">
                {reservas.filter((reserva) => reserva.chat_id).length}
              </div>
            </div>
          </div>

          <div className="filters">
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por reserva, roteiro, cliente, e-mail, telefone ou transação"
            />

            <select
              value={filtroStatus}
              onChange={(event) => setFiltroStatus(event.target.value)}
            >
              <option value="todos">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="confirmada">Confirmada</option>
              <option value="cancelada">Cancelada</option>
              <option value="realizada">Realizada</option>
            </select>

            <select
              value={filtroPagamento}
              onChange={(event) => setFiltroPagamento(event.target.value)}
            >
              <option value="todos">Todos pagamentos</option>
              <option value="pendente">Pendente</option>
              <option value="aguardando_aprovacao">Em análise</option>
              <option value="pago">Pago</option>
              <option value="cancelado">Cancelado</option>
            </select>

            <select
              value={filtroComprovante}
              onChange={(event) => setFiltroComprovante(event.target.value)}
            >
              <option value="todos">Todos comprovantes</option>
              <option value="paghiper">PagHiper</option>
              <option value="paghiper_confirmado">PagHiper confirmado</option>
              <option value="enviado">Manual enviado</option>
              <option value="aprovado">Manual aprovado</option>
              <option value="reprovado">Manual reprovado</option>
            </select>
          </div>

          {reservasFiltradas.length === 0 ? (
            <div className="empty">
              <div style={{ fontSize: 48, marginBottom: 10 }}>
                📭
              </div>

              Nenhuma reserva encontrada para seus roteiros.
            </div>
          ) : (
            <div className="table-card">
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Reserva</th>
                      <th>Roteiro</th>
                      <th>Cliente</th>
                      <th>Data</th>
                      <th>Pessoas</th>
                      <th>Valor</th>
                      <th>Pagamento</th>
                      <th>Comprovante</th>
                      <th>PagHiper</th>
                      <th>Chat</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {reservasFiltradas.map((reserva) => {
                      const pagamentoBadge = getPagamentoBadge(
                        reserva.pagamento_status
                      )

                      const comprovanteBadge = getComprovanteBadge(
                        reserva.comprovante_status,
                        reserva.comprovante_origem,
                        reserva.comprovante_url
                      )

                      const statusBadge = getStatusBadge(
                        reserva.status,
                        reserva.pagamento_status
                      )

                      return (
                        <tr key={reserva.id}>
                          <td>
                            <strong>{reserva.id}</strong>
                            <br />
                            <span style={{ color: '#6b7280' }}>
                              Criada em: {formatarData(reserva)}
                            </span>
                          </td>

                          <td>
                            <strong>{reserva.roteiro_titulo}</strong>
                          </td>

                          <td>
                            <strong>{reserva.cliente_nome}</strong>
                            <br />
                            <span style={{ color: '#6b7280' }}>
                              {reserva.cliente_email || 'Sem e-mail'}
                            </span>

                            {reserva.cliente_telefone && (
                              <>
                                <br />
                                <span style={{ color: '#6b7280' }}>
                                  {reserva.cliente_telefone}
                                </span>
                              </>
                            )}
                          </td>

                          <td>{formatarData(reserva)}</td>

                          <td>{reserva.quantidade_pessoas || 1}</td>

                          <td>
                            <strong style={{ color: '#16a34a' }}>
                              {formatarMoeda(reserva.valor_total)}
                            </strong>
                          </td>

                          <td>
                            <span
                              className="badge"
                              style={{
                                backgroundColor: pagamentoBadge.bg,
                                color: pagamentoBadge.color
                              }}
                            >
                              {pagamentoBadge.text}
                            </span>
                            <br />
                            <span style={{ color: '#6b7280', fontSize: 11 }}>
                              {formatarDataHora(reserva.pagamento_confirmado_em)}
                            </span>
                          </td>

                          <td>
                            <span
                              className="badge"
                              style={{
                                backgroundColor: comprovanteBadge.bg,
                                color: comprovanteBadge.color
                              }}
                            >
                              {comprovanteBadge.text}
                            </span>
                            <br />
                            <span style={{ color: '#6b7280', fontSize: 11 }}>
                              Origem: {reserva.comprovante_origem || '—'}
                            </span>
                          </td>

                          <td>
                            <span style={{ color: '#6b7280', fontSize: 11 }}>
                              Order:
                            </span>
                            <br />
                            <strong style={{ fontSize: 11 }}>
                              {reserva.paghiper_order_id || '—'}
                            </strong>
                            <br />
                            <span style={{ color: '#6b7280', fontSize: 11 }}>
                              Transação:
                            </span>
                            <br />
                            <strong style={{ fontSize: 11 }}>
                              {reserva.paghiper_transaction_id || '—'}
                            </strong>
                          </td>

                          <td>
                            {reserva.chat_id ? (
                              <>
                                <span
                                  className="badge"
                                  style={{
                                    backgroundColor: '#dbeafe',
                                    color: '#1d4ed8'
                                  }}
                                >
                                  Ativo
                                </span>
                                <br />
                                <span style={{ color: '#6b7280', fontSize: 11 }}>
                                  {reserva.chat_id}
                                </span>
                              </>
                            ) : (
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: '#f3f4f6',
                                  color: '#6b7280'
                                }}
                              >
                                Sem chat
                              </span>
                            )}
                          </td>

                          <td>
                            <span
                              className="badge"
                              style={{
                                backgroundColor: statusBadge.bg,
                                color: statusBadge.color
                              }}
                            >
                              {statusBadge.text}
                            </span>
                          </td>

                          <td>
                            <div className="actions">
                              {reserva.comprovante_url && (
                                <button
                                  className="btn btn-blue"
                                  onClick={() => abrirComprovante(reserva.comprovante_url)}
                                >
                                  Ver comprovante
                                </button>
                              )}

                              {reserva.chat_id && (
                                <button
                                  className="btn btn-purple"
                                  onClick={() => abrirChat(reserva.chat_id)}
                                >
                                  Abrir chat
                                </button>
                              )}

                              {reserva.status === 'pendente' && (
                                <button
                                  className="btn btn-green"
                                  disabled={processandoId === reserva.id}
                                  onClick={() => confirmarReserva(reserva)}
                                >
                                  Confirmar
                                </button>
                              )}

                              {reserva.status === 'confirmada' && (
                                <button
                                  className="btn btn-purple"
                                  disabled={processandoId === reserva.id}
                                  onClick={() => marcarComoRealizada(reserva)}
                                >
                                  Realizada
                                </button>
                              )}

                              {reserva.status !== 'cancelada' && reserva.status !== 'realizada' && (
                                <button
                                  className="btn btn-red"
                                  disabled={processandoId === reserva.id}
                                  onClick={() => cancelarReserva(reserva)}
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
              </div>

              <div className="mobile-list">
                {reservasFiltradas.map((reserva) => {
                  const pagamentoBadge = getPagamentoBadge(reserva.pagamento_status)

                  const comprovanteBadge = getComprovanteBadge(
                    reserva.comprovante_status,
                    reserva.comprovante_origem,
                    reserva.comprovante_url
                  )

                  const statusBadge = getStatusBadge(
                    reserva.status,
                    reserva.pagamento_status
                  )

                  return (
                    <div key={reserva.id} className="mobile-card">
                      <div style={{ marginBottom: 10 }}>
                        <strong style={{ color: '#111827', fontSize: 15 }}>
                          {reserva.roteiro_titulo}
                        </strong>

                        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 12 }}>
                          Cliente: {reserva.cliente_nome}
                        </p>

                        {reserva.cliente_email && (
                          <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: 12 }}>
                            {reserva.cliente_email}
                          </p>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 8,
                          fontSize: 12,
                          color: '#6b7280',
                          marginBottom: 12
                        }}
                      >
                        <div>📅 {formatarData(reserva)}</div>
                        <div>👥 {reserva.quantidade_pessoas || 1}</div>
                        <div>💰 {formatarMoeda(reserva.valor_total)}</div>
                        <div>💬 {reserva.chat_id ? 'Chat ativo' : 'Sem chat'}</div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          flexWrap: 'wrap',
                          marginBottom: 12
                        }}
                      >
                        <span
                          className="badge"
                          style={{
                            backgroundColor: pagamentoBadge.bg,
                            color: pagamentoBadge.color
                          }}
                        >
                          {pagamentoBadge.text}
                        </span>

                        <span
                          className="badge"
                          style={{
                            backgroundColor: comprovanteBadge.bg,
                            color: comprovanteBadge.color
                          }}
                        >
                          {comprovanteBadge.text}
                        </span>

                        <span
                          className="badge"
                          style={{
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.color
                          }}
                        >
                          {statusBadge.text}
                        </span>
                      </div>

                      <div className="actions">
                        {reserva.comprovante_url && (
                          <button
                            className="btn btn-blue"
                            onClick={() =>
                              abrirComprovante(reserva.comprovante_url)
                            }
                          >
                            Ver comprovante
                          </button>
                        )}

                        {reserva.chat_id && (
                          <button
                            className="btn btn-purple"
                            onClick={() => abrirChat(reserva.chat_id)}
                          >
                            Abrir chat
                          </button>
                        )}

                        {reserva.status === 'pendente' && (
                          <button
                            className="btn btn-green"
                            disabled={processandoId === reserva.id}
                            onClick={() => confirmarReserva(reserva)}
                          >
                            Confirmar
                          </button>
                        )}

                        {reserva.status === 'confirmada' && (
                          <button
                            className="btn btn-purple"
                            disabled={processandoId === reserva.id}
                            onClick={() => marcarComoRealizada(reserva)}
                          >
                            Realizada
                          </button>
                        )}

                        {reserva.status !== 'cancelada' && reserva.status !== 'realizada' && (
                          <button
                            className="btn btn-red"
                            disabled={processandoId === reserva.id}
                            onClick={() => cancelarReserva(reserva)}
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}