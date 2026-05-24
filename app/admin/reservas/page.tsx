'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type ReservaAdmin = {
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
  paghiper_comprovante?: any
  roteiro_titulo?: string
  cliente_nome?: string
  cliente_email?: string
  guia_nome?: string
  guia_email?: string
}

export default function AdminReservasPage() {
  const router = useRouter()
  const carregouRef = useRef(false)

  const [user, setUser] = useState<any>(null)
  const [reservas, setReservas] = useState<ReservaAdmin[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mensagem, setMensagem] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroPagamento, setFiltroPagamento] = useState('todos')
  const [filtroComprovante, setFiltroComprovante] = useState('todos')
  const [busca, setBusca] = useState('')
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
        router.push('/admin/login')
        return
      }

      const parsedUser = JSON.parse(userData)

      if (parsedUser.tipo !== 'admin' && parsedUser.tipo !== 'moderador') {
        router.push('/admin/login')
        return
      }

      setUser(parsedUser)
      await carregarReservas()
    } catch (error) {
      console.error('Erro ao iniciar admin reservas:', error)
      setMensagem('Erro ao validar usuário administrador.')
      setCarregando(false)
    }
  }

  const carregarReservas = async () => {
    setCarregando(true)
    setMensagem('')

    try {
      const { data: reservasData, error: reservasError } = await supabase
        .from('reservas')
        .select('*')
        .order('created_at', { ascending: false })

      if (reservasError) {
        throw reservasError
      }

      const reservasBase = reservasData || []

      const roteiroIds = [
        ...new Set(
          reservasBase
            .map((reserva) => reserva.roteiro_id || reserva.id_roteiro)
            .filter(Boolean)
            .map(String)
        )
      ]

      let roteirosMap: Record<string, any> = {}

      if (roteiroIds.length > 0) {
        const { data: roteirosData, error: roteirosError } = await supabase
          .from('roteiros')
          .select('*')
          .in('id', roteiroIds)

        if (roteirosError) {
          console.warn('Erro ao buscar roteiros:', roteirosError)
        }

        if (roteirosData) {
          roteirosMap = roteirosData.reduce((acc, roteiro) => {
            acc[String(roteiro.id)] = roteiro
            return acc
          }, {} as Record<string, any>)
        }
      }

      const clienteIds = [
        ...new Set(
          reservasBase
            .map((reserva) => reserva.cliente_id || reserva.id_cliente)
            .filter(Boolean)
            .map(String)
        )
      ]

      const guiaIds = [
        ...new Set(
          reservasBase
            .map((reserva) => {
              const roteiroId = reserva.roteiro_id || reserva.id_roteiro
              const roteiro = roteiroId ? roteirosMap[String(roteiroId)] : null

              return (
                reserva.guia_id ||
                reserva.id_guia ||
                roteiro?.guia_id ||
                roteiro?.id_guia
              )
            })
            .filter(Boolean)
            .map(String)
        )
      ]

      const userIds = [...new Set([...clienteIds, ...guiaIds])]

      let usersMap: Record<string, any> = {}

      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, nome, email, tipo')
          .in('id', userIds)

        if (usersError) {
          console.warn('Erro ao buscar usuários:', usersError)
        }

        if (usersData) {
          usersMap = usersData.reduce((acc, item) => {
            acc[String(item.id)] = item
            return acc
          }, {} as Record<string, any>)
        }
      }

      const completas: ReservaAdmin[] = reservasBase.map((reserva) => {
        const roteiroId = reserva.roteiro_id || reserva.id_roteiro
        const roteiro = roteiroId ? roteirosMap[String(roteiroId)] : null

        const clienteId = reserva.cliente_id || reserva.id_cliente

        const guiaId =
          reserva.guia_id ||
          reserva.id_guia ||
          roteiro?.guia_id ||
          roteiro?.id_guia

        const cliente = clienteId ? usersMap[String(clienteId)] : null
        const guia = guiaId ? usersMap[String(guiaId)] : null

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
          guia_nome:
            guia?.nome ||
            reserva.guia_nome ||
            reserva.nome_guia ||
            'Guia',
          guia_email:
            guia?.email ||
            reserva.guia_email ||
            '',
          quantidade_pessoas: quantidade,
          valor_total: Number(valorBase || 0)
        }
      })

      setReservas(completas)
    } catch (error: any) {
      console.error('Erro ao carregar reservas admin:', error)
      setMensagem(error?.message || 'Erro ao carregar reservas.')
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

      const bateComprovante =
        filtroComprovante === 'todos' ||
        reserva.comprovante_status === filtroComprovante ||
        reserva.comprovante_origem === filtroComprovante

      const bateBusca =
        !termo ||
        reserva.id?.toLowerCase().includes(termo) ||
        reserva.roteiro_titulo?.toLowerCase().includes(termo) ||
        reserva.cliente_nome?.toLowerCase().includes(termo) ||
        reserva.cliente_email?.toLowerCase().includes(termo) ||
        reserva.guia_nome?.toLowerCase().includes(termo) ||
        reserva.guia_email?.toLowerCase().includes(termo) ||
        reserva.paghiper_order_id?.toLowerCase().includes(termo) ||
        reserva.paghiper_transaction_id?.toLowerCase().includes(termo)

      return bateStatus && batePagamento && bateComprovante && bateBusca
    })
  }, [
    reservas,
    filtroStatus,
    filtroPagamento,
    filtroComprovante,
    busca
  ])

  const atualizarReserva = async (
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
      await carregarReservas()
    } catch (error: any) {
      console.error('Erro ao atualizar reserva:', error)
      setMensagem(error?.message || 'Erro ao atualizar reserva.')
    } finally {
      setProcessandoId(null)
    }
  }

  const aprovarComprovante = async (reserva: ReservaAdmin) => {
    await atualizarReserva(
      reserva.id,
      {
        comprovante_status: 'aprovado',
        pagamento_status: 'pago',
        pagamento_confirmado_em:
          reserva.pagamento_confirmado_em || new Date().toISOString(),
        status: reserva.status === 'cancelada' ? reserva.status : 'confirmada'
      },
      '✅ Comprovante aprovado e reserva marcada como paga.'
    )
  }

  const reprovarComprovante = async (reserva: ReservaAdmin) => {
    await atualizarReserva(
      reserva.id,
      {
        comprovante_status: 'reprovado',
        pagamento_status: 'pendente'
      },
      'Comprovante reprovado. Reserva voltou para pagamento pendente.'
    )
  }

  const marcarComoPago = async (reserva: ReservaAdmin) => {
    await atualizarReserva(
      reserva.id,
      {
        pagamento_status: 'pago',
        pagamento_confirmado_em:
          reserva.pagamento_confirmado_em || new Date().toISOString(),
        status: reserva.status === 'cancelada' ? reserva.status : 'confirmada'
      },
      '✅ Reserva marcada como paga.'
    )
  }

  const cancelarReserva = async (reserva: ReservaAdmin) => {
    if (!confirm('Tem certeza que deseja cancelar esta reserva?')) return

    await atualizarReserva(
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
      setMensagem('Esta reserva ainda não possui chat vinculado.')
      return
    }

    router.push(`/chat/${chatId}`)
  }

  const formatarData = (reserva: ReservaAdmin) => {
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

  const getBadge = (tipo: string, valor?: string | null) => {
    if (tipo === 'pagamento') {
      if (valor === 'pago') {
        return { text: '✅ Pago', bg: '#dcfce7', color: '#166534' }
      }

      if (valor === 'aguardando_aprovacao') {
        return { text: '⏳ Em análise', bg: '#dbeafe', color: '#1d4ed8' }
      }

      if (valor === 'cancelado') {
        return { text: 'Cancelado', bg: '#fee2e2', color: '#991b1b' }
      }

      return { text: 'Pendente', bg: '#fef3c7', color: '#92400e' }
    }

    if (tipo === 'comprovante') {
      if (valor === 'paghiper_confirmado') {
        return { text: 'PagHiper', bg: '#dcfce7', color: '#166534' }
      }

      if (valor === 'paghiper') {
        return { text: 'PagHiper', bg: '#dcfce7', color: '#166534' }
      }

      if (valor === 'aprovado') {
        return { text: '✅ Aprovado', bg: '#dcfce7', color: '#166534' }
      }

      if (valor === 'reprovado') {
        return { text: '❌ Reprovado', bg: '#fee2e2', color: '#991b1b' }
      }

      if (valor === 'enviado') {
        return { text: '📎 Enviado', bg: '#dbeafe', color: '#1d4ed8' }
      }

      return { text: 'Não enviado', bg: '#f3f4f6', color: '#6b7280' }
    }

    if (valor === 'confirmada') {
      return { text: 'Confirmada', bg: '#dcfce7', color: '#166534' }
    }

    if (valor === 'cancelada') {
      return { text: 'Cancelada', bg: '#fee2e2', color: '#991b1b' }
    }

    if (valor === 'realizada') {
      return { text: 'Realizada', bg: '#e0e7ff', color: '#4338ca' }
    }

    return { text: 'Pendente', bg: '#fef3c7', color: '#92400e' }
  }

  const getComprovanteValor = (reserva: ReservaAdmin) => {
    return (
      reserva.comprovante_origem ||
      reserva.comprovante_status ||
      null
    )
  }

  const sair = () => {
    localStorage.removeItem('user')
    router.push('/admin/login')
  }

  if (carregando) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f3f4f6',
          color: '#6b7280'
        }}
      >
        Carregando reservas...
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        .admin-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: #f3f4f6;
        }

        .admin-header {
          background: #111827;
          color: #ffffff;
          padding: 14px 18px;
          position: sticky;
          top: 0;
          z-index: 40;
        }

        .admin-header-inner {
          max-width: 1480px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .admin-main {
          max-width: 1480px;
          margin: 0 auto;
          padding: 20px 16px 46px;
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
          min-width: 1380px;
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

        .btn-purple {
          background: #4f46e5;
          color: #ffffff;
        }

        .btn-red {
          background: #dc2626;
          color: #ffffff;
        }

        .btn-yellow {
          background: #f59e0b;
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

        @media (max-width: 920px) {
          .filters {
            grid-template-columns: 1fr 1fr;
          }

          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .filters {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .admin-header-inner {
            align-items: flex-start;
          }
        }
      `}</style>

      <div className="admin-page">
        <header className="admin-header">
          <div className="admin-header-inner">
            <div>
              <h1 style={{ margin: 0, fontSize: 21 }}>
                Admin PrussikTrails
              </h1>

              <p style={{ margin: '3px 0 0', color: '#d1d5db', fontSize: 12 }}>
                Reservas, pagamentos, comprovantes e chats
              </p>
            </div>

            <div className="actions">
              <button
                className="btn btn-light"
                onClick={() => router.push('/admin/dashboard')}
              >
                Dashboard
              </button>

              <button
                className="btn btn-green"
                onClick={carregarReservas}
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

        <main className="admin-main">
          <h2 style={{ margin: '0 0 12px', color: '#111827' }}>
            📋 Todas as reservas
          </h2>

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
              placeholder="Buscar por reserva, roteiro, cliente, guia, order ID ou transação"
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

          <div className="table-card">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Reserva</th>
                    <th>Roteiro</th>
                    <th>Cliente</th>
                    <th>Guia</th>
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
                    const pagamentoBadge = getBadge(
                      'pagamento',
                      reserva.pagamento_status
                    )

                    const comprovanteBadge = getBadge(
                      'comprovante',
                      getComprovanteValor(reserva)
                    )

                    const statusBadge = getBadge(
                      'status',
                      reserva.status
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
                        </td>

                        <td>
                          <strong>{reserva.guia_nome}</strong>
                          <br />
                          <span style={{ color: '#6b7280' }}>
                            {reserva.guia_email || 'Sem e-mail'}
                          </span>
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

                            {reserva.comprovante_url &&
                              reserva.comprovante_origem !== 'paghiper' &&
                              reserva.comprovante_status !== 'aprovado' && (
                                <button
                                  className="btn btn-green"
                                  disabled={processandoId === reserva.id}
                                  onClick={() => aprovarComprovante(reserva)}
                                >
                                  Aprovar
                                </button>
                              )}

                            {reserva.comprovante_url &&
                              reserva.comprovante_origem !== 'paghiper' &&
                              reserva.comprovante_status !== 'reprovado' && (
                                <button
                                  className="btn btn-yellow"
                                  disabled={processandoId === reserva.id}
                                  onClick={() => reprovarComprovante(reserva)}
                                >
                                  Reprovar
                                </button>
                              )}

                            {reserva.pagamento_status !== 'pago' && (
                              <button
                                className="btn btn-green"
                                disabled={processandoId === reserva.id}
                                onClick={() => marcarComoPago(reserva)}
                              >
                                Marcar pago
                              </button>
                            )}

                            {reserva.status !== 'cancelada' && (
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

                  {reservasFiltradas.length === 0 && (
                    <tr>
                      <td
                        colSpan={13}
                        style={{
                          textAlign: 'center',
                          padding: 30,
                          color: '#6b7280'
                        }}
                      >
                        Nenhuma reserva encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}