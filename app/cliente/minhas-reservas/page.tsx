'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type ReservaCompleta = {
  id: string
  cliente_id?: string
  id_cliente?: string
  roteiro_id?: string
  id_roteiro?: string
  id_guia?: string
  guia_id?: string
  data_trilha?: string
  data_reserva?: string
  created_at?: string
  quantidade_pessoas?: number
  quantidade?: number
  valor_total?: number
  valor?: number
  status?: string
  pagamento_status?: string
  cliente_confirmou?: boolean
  guia_confirmou?: boolean
  roteiro?: any
  guia_nome?: string
  roteiro_titulo?: string
}

export default function MinhasReservas() {
  const router = useRouter()
  const carregouRef = useRef(false)

  const [user, setUser] = useState<any>(null)
  const [reservas, setReservas] = useState<ReservaCompleta[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    if (carregouRef.current) return

    carregouRef.current = true
    iniciarPagina()
  }, [])

  const iniciarPagina = async () => {
    try {
      const userData = localStorage.getItem('user')

      if (!userData) {
        router.push('/login')
        return
      }

      const parsedUser = JSON.parse(userData)

      if (parsedUser.tipo !== 'cliente') {
        router.push('/')
        return
      }

      setUser(parsedUser)
      await carregarReservas(parsedUser)

    } catch (error) {
      console.error('Erro ao iniciar minhas reservas:', error)
      setMensagem('Erro ao carregar usuário. Faça login novamente.')
      setCarregando(false)
    }
  }

  const getClienteId = (usuario: any) => {
    return (
      usuario?.id ||
      usuario?.user_id ||
      usuario?.uid ||
      usuario?.auth_id ||
      ''
    )
  }

  const buscarReservasPorColuna = async (
    coluna: string,
    clienteId: string
  ) => {
    return await supabase
      .from('reservas')
      .select('*')
      .eq(coluna, clienteId)
      .order('created_at', { ascending: false })
  }

  const carregarReservas = async (usuarioParam?: any) => {
    setCarregando(true)
    setMensagem('')

    const usuario = usuarioParam || user
    const clienteId = getClienteId(usuario)

    if (!clienteId) {
      setMensagem('Não foi possível identificar o cliente logado.')
      setReservas([])
      setCarregando(false)
      return
    }

    try {
      let reservasData: any[] = []
      let reservasError: any = null

      const tentativaClienteId = await buscarReservasPorColuna(
        'cliente_id',
        clienteId
      )

      if (!tentativaClienteId.error) {
        reservasData = tentativaClienteId.data || []
      } else {
        const tentativaIdCliente = await buscarReservasPorColuna(
          'id_cliente',
          clienteId
        )

        if (!tentativaIdCliente.error) {
          reservasData = tentativaIdCliente.data || []
        } else {
          reservasError = tentativaClienteId.error
        }
      }

      if (reservasError) {
        throw reservasError
      }

      if (!reservasData || reservasData.length === 0) {
        setReservas([])
        setCarregando(false)
        return
      }

      const roteiroIds = [
        ...new Set(
          reservasData
            .map((reserva) => reserva.roteiro_id || reserva.id_roteiro)
            .filter(Boolean)
            .map((id) => String(id))
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

      const guiaIds = [
        ...new Set(
          reservasData
            .map((reserva) => {
              const roteiroId =
                reserva.roteiro_id ||
                reserva.id_roteiro

              const roteiro = roteiroId
                ? roteirosMap[String(roteiroId)]
                : null

              return (
                reserva.id_guia ||
                reserva.guia_id ||
                roteiro?.id_guia ||
                roteiro?.guia_id ||
                roteiro?.guia
              )
            })
            .filter(Boolean)
            .map((id) => String(id))
        )
      ]

      let guiasMap: Record<string, string> = {}

      if (guiaIds.length > 0) {
        const { data: guiasData, error: guiasError } = await supabase
          .from('users')
          .select('id, nome, email')
          .in('id', guiaIds)

        if (guiasError) {
          console.warn('Erro ao buscar guias:', guiasError)
        }

        if (guiasData) {
          guiasMap = guiasData.reduce((acc, guia) => {
            acc[String(guia.id)] =
              guia.nome ||
              guia.email ||
              'Guia'
            return acc
          }, {} as Record<string, string>)
        }
      }

      const reservasCompletas: ReservaCompleta[] = reservasData.map(
        (reserva) => {
          const roteiroId =
            reserva.roteiro_id ||
            reserva.id_roteiro

          const roteiro = roteiroId
            ? roteirosMap[String(roteiroId)]
            : null

          const guiaId =
            reserva.id_guia ||
            reserva.guia_id ||
            roteiro?.id_guia ||
            roteiro?.guia_id ||
            roteiro?.guia

          const quantidadePessoas = Number(
            reserva.quantidade_pessoas ||
            reserva.quantidade ||
            1
          )

          const precoRoteiro = Number(
            roteiro?.preco || 0
          )

          const valorBase =
            reserva.valor_total ??
            reserva.valor ??
            (precoRoteiro * quantidadePessoas)

          const valorTotal = Number(valorBase || 0)

          const tituloRoteiro =
            roteiro?.titulo ||
            roteiro?.nome ||
            reserva.roteiro_titulo ||
            reserva.titulo_roteiro ||
            reserva.titulo ||
            'Roteiro não encontrado'

          return {
            ...reserva,
            roteiro: roteiro || null,
            guia_nome: guiaId
              ? guiasMap[String(guiaId)] || 'Guia'
              : 'Guia',
            roteiro_titulo: tituloRoteiro,
            quantidade_pessoas: quantidadePessoas,
            valor_total: valorTotal
          }
        }
      )

      setReservas(reservasCompletas)

    } catch (err: any) {
      console.error('Erro ao carregar reservas:', err)

      setMensagem(
        err?.message ||
        'Erro ao carregar reservas. Tente novamente.'
      )

      setReservas([])

    } finally {
      setCarregando(false)
    }
  }

  const cancelarReserva = async (reservaId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta reserva?')) return

    const { error } = await supabase
      .from('reservas')
      .update({ status: 'cancelada' })
      .eq('id', reservaId)

    if (error) {
      console.error('Erro ao cancelar reserva:', error)
      setMensagem('Erro ao cancelar reserva.')
      return
    }

    if (user) {
      await carregarReservas(user)
    }
  }

  const getStatusBadge = (
    status?: string,
    pagamentoStatus?: string
  ) => {
    if (status === 'realizada') {
      return {
        text: '✓ Realizada',
        bg: '#e0e7ff',
        color: '#4f46e5'
      }
    }

    if (status === 'confirmada') {
      return {
        text: '✓ Confirmada',
        bg: '#dcfce7',
        color: '#16a34a'
      }
    }

    if (status === 'cancelada') {
      return {
        text: '✗ Cancelada',
        bg: '#fee2e2',
        color: '#dc2626'
      }
    }

    if (pagamentoStatus === 'pago') {
      return {
        text: '⏳ Aguardando confirmação',
        bg: '#fef3c7',
        color: '#d97706'
      }
    }

    return {
      text: '⏳ Aguardando pagamento',
      bg: '#fef3c7',
      color: '#d97706'
    }
  }

  const getPagamentoBadge = (pagamentoStatus?: string) => {
    if (pagamentoStatus === 'pago') {
      return {
        text: '✅ Pago',
        bg: '#dcfce7',
        color: '#16a34a'
      }
    }

    if (pagamentoStatus === 'aguardando_aprovacao') {
      return {
        text: '⏳ Em análise',
        bg: '#dbeafe',
        color: '#1d4ed8'
      }
    }

    return {
      text: '⏳ Pendente',
      bg: '#fef3c7',
      color: '#d97706'
    }
  }

  const formatarData = (reserva: ReservaCompleta) => {
    const valor =
      reserva.data_trilha ||
      reserva.data_reserva ||
      reserva.created_at

    if (!valor) return 'A definir'

    const data = new Date(valor)

    if (isNaN(data.getTime())) return 'A definir'

    return data.toLocaleDateString('pt-BR')
  }

  const handlePagar = (reservaId: string) => {
    router.push(`/cliente/pagamento/${reservaId}`)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (carregando) {
    return (
      <div className="reservas-loading">
        <style jsx global>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .reservas-loading {
            min-height: 100vh;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f3f4f6;
            padding: 20px;
          }

          .spinner {
            width: 42px;
            height: 42px;
            border: 3px solid #e5e7eb;
            border-top-color: #16a34a;
            border-radius: 999px;
            animation: spin 1s linear infinite;
            margin: 0 auto 12px;
          }
        `}</style>

        <div style={{ textAlign: 'center' }}>
          <div className="spinner" />

          <p style={{ color: '#6b7280' }}>
            Carregando suas reservas...
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        .reservas-page {
          min-height: 100vh;
          min-height: 100dvh;
          background-color: #f3f4f6;
        }

        .reservas-header {
          background-color: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 16px;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .reservas-header-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .reservas-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .reservas-main {
          max-width: 1280px;
          margin: 0 auto;
          padding: 16px;
        }

        .empty-card,
        .table-card {
          background-color: #ffffff;
          border-radius: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        .empty-card {
          padding: 48px 20px;
          text-align: center;
        }

        .table-card {
          overflow: hidden;
        }

        .reservas-table-wrapper {
          overflow-x: auto;
        }

        .reservas-table {
          width: 100%;
          border-collapse: collapse;
        }

        .reservas-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 12px;
          color: #6b7280;
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          white-space: nowrap;
        }

        .reservas-table td {
          padding: 12px;
          font-size: 12px;
          color: #6b7280;
          border-bottom: 1px solid #f3f4f6;
          vertical-align: middle;
        }

        .mobile-list {
          display: none;
        }

        .reserva-mobile-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          margin-bottom: 12px;
        }

        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .btn {
          border: none;
          border-radius: 40px;
          padding: 7px 14px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }

        .btn-green {
          background-color: #16a34a;
          color: #ffffff;
        }

        .btn-red {
          background-color: #dc2626;
          color: #ffffff;
        }

        .btn-dark {
          background-color: #111827;
          color: #ffffff;
        }

        .btn-light {
          background-color: #f3f4f6;
          color: #374151;
        }

        .mensagem {
          background: #fee2e2;
          color: #991b1b;
          padding: 12px 14px;
          border-radius: 14px;
          margin-bottom: 16px;
          font-size: 13px;
        }

        @media (max-width: 760px) {
          .reservas-table-wrapper {
            display: none;
          }

          .mobile-list {
            display: block;
          }

          .reservas-main {
            padding: 14px 12px;
          }

          .reservas-header-inner {
            align-items: flex-start;
          }

          .reservas-actions {
            width: 100%;
          }

          .btn {
            flex: 1;
            text-align: center;
            padding: 9px 12px;
          }
        }
      `}</style>

      <div className="reservas-page">
        <div className="reservas-header">
          <div className="reservas-header-inner">
            <div>
              <h1
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#dc2626',
                  margin: 0
                }}
              >
                PussikTrails
              </h1>

              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '11px',
                  color: '#6b7280'
                }}
              >
                Minhas Reservas
              </p>
            </div>

            <div className="reservas-actions">
              <button
                onClick={() => router.push('/cliente/dashboard')}
                className="btn btn-light"
              >
                ← Voltar
              </button>

              <button
                onClick={() => router.push('/cliente/perfil')}
                className="btn btn-dark"
              >
                Perfil
              </button>

              <button
                onClick={() => carregarReservas(user)}
                className="btn btn-green"
              >
                Recarregar
              </button>

              <button
                onClick={handleLogout}
                className="btn btn-red"
              >
                Sair
              </button>
            </div>
          </div>
        </div>

        <div className="reservas-main">
          <div style={{ marginBottom: '20px' }}>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#111827',
                margin: 0
              }}
            >
              📋 Minhas Reservas
            </h2>

            <p
              style={{
                color: '#6b7280',
                fontSize: '13px',
                marginTop: '4px'
              }}
            >
              Acompanhe suas aventuras
            </p>
          </div>

          {mensagem && (
            <div className="mensagem">
              {mensagem}
            </div>
          )}

          {reservas.length === 0 ? (
            <div className="empty-card">
              <div
                style={{
                  fontSize: '48px',
                  marginBottom: '12px'
                }}
              >
                📭
              </div>

              <div
                style={{
                  fontWeight: 'bold',
                  color: '#374151',
                  marginBottom: '6px'
                }}
              >
                Você ainda não fez nenhuma reserva
              </div>

              <div
                style={{
                  color: '#6b7280',
                  marginBottom: '20px',
                  fontSize: '13px'
                }}
              >
                Explore os roteiros disponíveis e reserve sua próxima aventura.
              </div>

              <button
                onClick={() => router.push('/cliente/roteiros')}
                className="btn btn-green"
              >
                Explorar roteiros →
              </button>
            </div>
          ) : (
            <div className="table-card">
              <div className="reservas-table-wrapper">
                <table className="reservas-table">
                  <thead>
                    <tr>
                      <th>Roteiro</th>
                      <th>Guia</th>
                      <th>Data</th>
                      <th style={{ textAlign: 'center' }}>Pessoas</th>
                      <th style={{ textAlign: 'center' }}>Valor</th>
                      <th style={{ textAlign: 'center' }}>Pagamento</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {reservas.map((reserva) => {
                      const statusBadge = getStatusBadge(
                        reserva.status,
                        reserva.pagamento_status
                      )

                      const pagamentoBadge = getPagamentoBadge(
                        reserva.pagamento_status
                      )

                      const precisaPagar =
                        reserva.status === 'pendente' &&
                        reserva.pagamento_status !== 'pago'

                      const podeCancelar =
                        reserva.status === 'pendente' ||
                        reserva.status === 'confirmada'

                      return (
                        <tr key={reserva.id}>
                          <td
                            style={{
                              fontWeight: 600,
                              color: '#111827'
                            }}
                          >
                            {reserva.roteiro_titulo}
                          </td>

                          <td>{reserva.guia_nome}</td>

                          <td>{formatarData(reserva)}</td>

                          <td style={{ textAlign: 'center' }}>
                            {reserva.quantidade_pessoas || 1}
                          </td>

                          <td
                            style={{
                              textAlign: 'center',
                              fontWeight: 700,
                              color: '#16a34a'
                            }}
                          >
                            R$ {(Number(reserva.valor_total) || 0).toFixed(2)}
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            <span
                              className="badge"
                              style={{
                                backgroundColor: pagamentoBadge.bg,
                                color: pagamentoBadge.color
                              }}
                            >
                              {pagamentoBadge.text}
                            </span>
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

                          <td style={{ textAlign: 'center' }}>
                            <div
                              style={{
                                display: 'flex',
                                gap: '6px',
                                justifyContent: 'center',
                                flexWrap: 'wrap'
                              }}
                            >
                              {precisaPagar && (
                                <button
                                  onClick={() => handlePagar(reserva.id)}
                                  className="btn btn-green"
                                >
                                  💳 Pagar
                                </button>
                              )}

                              {podeCancelar && (
                                <button
                                  onClick={() => cancelarReserva(reserva.id)}
                                  className="btn btn-red"
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
                {reservas.map((reserva) => {
                  const statusBadge = getStatusBadge(
                    reserva.status,
                    reserva.pagamento_status
                  )

                  const pagamentoBadge = getPagamentoBadge(
                    reserva.pagamento_status
                  )

                  const precisaPagar =
                    reserva.status === 'pendente' &&
                    reserva.pagamento_status !== 'pago'

                  const podeCancelar =
                    reserva.status === 'pendente' ||
                    reserva.status === 'confirmada'

                  return (
                    <div
                      key={reserva.id}
                      className="reserva-mobile-card"
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '12px',
                          marginBottom: '10px'
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              color: '#111827',
                              fontSize: '15px'
                            }}
                          >
                            {reserva.roteiro_titulo}
                          </div>

                          <div
                            style={{
                              color: '#6b7280',
                              fontSize: '12px',
                              marginTop: '3px'
                            }}
                          >
                            Guia: {reserva.guia_nome}
                          </div>
                        </div>

                        <div
                          style={{
                            fontWeight: 800,
                            color: '#16a34a',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          R$ {(Number(reserva.valor_total) || 0).toFixed(2)}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          fontSize: '12px',
                          color: '#6b7280',
                          marginBottom: '12px'
                        }}
                      >
                        <div>📅 {formatarData(reserva)}</div>
                        <div>👥 {reserva.quantidade_pessoas || 1} pessoa(s)</div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap',
                          marginBottom: '12px'
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
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.color
                          }}
                        >
                          {statusBadge.text}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          gap: '8px'
                        }}
                      >
                        {precisaPagar && (
                          <button
                            onClick={() => handlePagar(reserva.id)}
                            className="btn btn-green"
                            style={{ flex: 1 }}
                          >
                            💳 Pagar
                          </button>
                        )}

                        {podeCancelar && (
                          <button
                            onClick={() => cancelarReserva(reserva.id)}
                            className="btn btn-red"
                            style={{ flex: 1 }}
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
        </div>
      </div>
    </>
  )
}