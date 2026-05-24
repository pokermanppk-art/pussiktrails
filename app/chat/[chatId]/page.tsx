'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type MensagemChat = {
  id: string
  chat_id: string
  remetente_id?: string | null
  remetente_tipo?: string | null
  tipo?: string | null
  mensagem: string
  metadata?: any
  created_at?: string
  remetente_nome?: string
  remetente_email?: string | null
}

type ChatData = {
  id: string
  reserva_id?: string
  cliente_id?: string
  guia_id?: string
  moderador_id?: string | null
  status?: string
  escopo_moderacao?: string
  origem?: string
  created_at?: string
  updated_at?: string
  reserva?: {
    id: string
    roteiro_id?: string | null
    roteiro_titulo?: string
    status?: string
    pagamento_status?: string
    data_trilha?: string | null
    valor_total?: number
    quantidade_pessoas?: number
    comprovante_url?: string | null
    comprovante_status?: string | null
    comprovante_origem?: string | null
  }
}

type Participantes = {
  cliente?: any
  guia?: any
  moderador?: any
}

export default function ChatUniversalPage() {
  const params = useParams()
  const router = useRouter()
  const chatId = params.chatId as string

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const carregouRef = useRef(false)

  const [user, setUser] = useState<any>(null)
  const [chat, setChat] = useState<ChatData | null>(null)
  const [participantes, setParticipantes] =
    useState<Participantes>({})
  const [mensagens, setMensagens] = useState<MensagemChat[]>([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [mensagemErro, setMensagemErro] = useState('')

  useEffect(() => {
    if (!chatId) return
    if (carregouRef.current) return

    carregouRef.current = true
    iniciarChat()

    return () => {
      pararPolling()
    }
  }, [chatId])

  useEffect(() => {
    rolarParaFim()
  }, [mensagens.length])

  const iniciarPolling = (usuario: any) => {
    pararPolling()

    pollingRef.current = setInterval(() => {
      carregarChat(usuario, false)
    }, 5000)
  }

  const pararPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  const iniciarChat = async () => {
    try {
      const userData = localStorage.getItem('user')

      if (!userData) {
        router.push('/login')
        return
      }

      const parsedUser = JSON.parse(userData)

      if (!parsedUser?.id || !parsedUser?.tipo) {
        router.push('/login')
        return
      }

      setUser(parsedUser)

      await carregarChat(parsedUser, true)
      iniciarPolling(parsedUser)
    } catch (error) {
      console.error('Erro ao iniciar chat:', error)
      setMensagemErro('Erro ao iniciar o chat.')
      setCarregando(false)
    }
  }

  const carregarChat = async (
    usuarioParam?: any,
    mostrarLoading = false
  ) => {
    const usuario = usuarioParam || user

    if (!usuario?.id || !usuario?.tipo) return

    if (mostrarLoading) {
      setCarregando(true)
    }

    try {
      const response = await fetch(
        `/api/chat/${encodeURIComponent(chatId)}?userId=${encodeURIComponent(
          usuario.id
        )}&tipo=${encodeURIComponent(usuario.tipo)}`,
        {
          method: 'GET',
          cache: 'no-store'
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.message ||
          'Erro ao carregar chat.'
        )
      }

      setChat(data.chat || null)
      setParticipantes(data.participantes || {})
      setMensagens(data.mensagens || [])
      setMensagemErro('')
    } catch (error: any) {
      console.error('Erro ao carregar chat:', error)
      setMensagemErro(
        error?.message ||
        'Não foi possível carregar este chat.'
      )
    } finally {
      if (mostrarLoading) {
        setCarregando(false)
      }
    }
  }

  const enviarMensagem = async () => {
    const texto = novaMensagem.trim()

    if (!texto) return

    if (!user?.id || !user?.tipo) {
      setMensagemErro('Usuário não identificado.')
      return
    }

    setEnviando(true)
    setMensagemErro('')

    try {
      const response = await fetch(
        `/api/chat/${encodeURIComponent(chatId)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: user.id,
            tipo: user.tipo,
            mensagem: texto
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.message ||
          'Erro ao enviar mensagem.'
        )
      }

      setNovaMensagem('')
      await carregarChat(user, false)
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error)
      setMensagemErro(
        error?.message ||
        'Erro ao enviar mensagem.'
      )
    } finally {
      setEnviando(false)
    }
  }

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      enviarMensagem()
    }
  }

  const rolarParaFim = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth'
      })
    }, 80)
  }

  const voltar = () => {
    pararPolling()

    const tipo = String(user?.tipo || '').toLowerCase()

    if (tipo === 'cliente') {
      router.push('/cliente/minhas-reservas')
      return
    }

    if (tipo === 'guia') {
      router.push('/guia/reservas')
      return
    }

    if (tipo === 'admin' || tipo === 'moderador') {
      router.push('/admin/reservas')
      return
    }

    router.push('/')
  }

  const formatarDataHora = (valor?: string) => {
    if (!valor) return ''

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return ''

    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatarData = (valor?: string | null) => {
    if (!valor) return 'A definir'

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return 'A definir'

    return data.toLocaleDateString('pt-BR')
  }

  const formatarMoeda = (valor?: number) => {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  const nomeUsuarioAtual = () => {
    return user?.nome || user?.email || 'Você'
  }

  const getNomeParticipante = (tipo: string) => {
    if (tipo === 'cliente') {
      return (
        participantes.cliente?.nome ||
        participantes.cliente?.email ||
        'Cliente'
      )
    }

    if (tipo === 'guia') {
      return (
        participantes.guia?.nome ||
        participantes.guia?.email ||
        'Guia'
      )
    }

    if (tipo === 'moderador') {
      return (
        participantes.moderador?.nome ||
        participantes.moderador?.email ||
        'Moderador'
      )
    }

    return 'Sistema'
  }

  const mensagemEhMinha = (mensagem: MensagemChat) => {
    if (!mensagem.remetente_id || !user?.id) return false

    return String(mensagem.remetente_id) === String(user.id)
  }

  const getLabelRemetente = (mensagem: MensagemChat) => {
    if (mensagem.remetente_tipo === 'sistema') {
      return 'Sistema'
    }

    if (mensagemEhMinha(mensagem)) {
      return nomeUsuarioAtual()
    }

    return (
      mensagem.remetente_nome ||
      getNomeParticipante(mensagem.remetente_tipo || '')
    )
  }

  if (carregando) {
    return (
      <div className="chat-loading">
        <style jsx global>{`
          .chat-loading {
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f3f4f6;
            color: #6b7280;
          }
        `}</style>

        Carregando chat...
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        .chat-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: #f3f4f6;
          display: flex;
          flex-direction: column;
        }

        .chat-header {
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 16px;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .chat-header-inner {
          max-width: 980px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .chat-main {
          width: 100%;
          max-width: 980px;
          margin: 0 auto;
          padding: 16px;
          display: grid;
          grid-template-columns: 280px minmax(0, 1fr);
          gap: 14px;
          flex: 1;
        }

        .chat-card {
          background: #ffffff;
          border-radius: 22px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          overflow: hidden;
        }

        .resumo-card {
          padding: 18px;
          align-self: start;
        }

        .resumo-title {
          font-size: 16px;
          font-weight: 800;
          color: #111827;
          margin: 0 0 10px;
        }

        .resumo-line {
          font-size: 13px;
          color: #6b7280;
          line-height: 1.45;
          margin: 8px 0;
        }

        .resumo-line strong {
          color: #374151;
        }

        .badge {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          margin: 4px 4px 0 0;
        }

        .badge-green {
          background: #dcfce7;
          color: #166534;
        }

        .badge-blue {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .badge-yellow {
          background: #fef3c7;
          color: #92400e;
        }

        .messages-card {
          display: flex;
          flex-direction: column;
          min-height: calc(100dvh - 120px);
          max-height: calc(100dvh - 120px);
        }

        .messages-header {
          padding: 16px 18px;
          border-bottom: 1px solid #e5e7eb;
        }

        .messages-list {
          flex: 1;
          padding: 18px;
          overflow-y: auto;
          background: #f9fafb;
        }

        .message-row {
          display: flex;
          margin-bottom: 12px;
        }

        .message-row.mine {
          justify-content: flex-end;
        }

        .message-row.system {
          justify-content: center;
        }

        .message-bubble {
          max-width: 78%;
          border-radius: 18px;
          padding: 10px 12px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          color: #374151;
          font-size: 13px;
          line-height: 1.45;
          white-space: pre-line;
        }

        .message-row.mine .message-bubble {
          background: #dc2626;
          border-color: #dc2626;
          color: #ffffff;
        }

        .message-row.system .message-bubble {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #1d4ed8;
          max-width: 92%;
          text-align: center;
        }

        .message-meta {
          font-size: 10px;
          opacity: 0.78;
          margin-bottom: 4px;
          font-weight: 800;
        }

        .message-time {
          font-size: 10px;
          opacity: 0.7;
          margin-top: 5px;
          text-align: right;
        }

        .chat-input-area {
          border-top: 1px solid #e5e7eb;
          padding: 12px;
          background: #ffffff;
        }

        .chat-input-wrapper {
          display: flex;
          gap: 10px;
          align-items: flex-end;
        }

        .chat-textarea {
          flex: 1;
          min-height: 44px;
          max-height: 130px;
          border: 1px solid #d1d5db;
          border-radius: 16px;
          padding: 11px 12px;
          resize: vertical;
          font-size: 13px;
          outline: none;
        }

        .chat-textarea:focus {
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.10);
        }

        .btn {
          border: none;
          border-radius: 999px;
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .btn-red {
          background: #dc2626;
          color: #ffffff;
        }

        .btn-light {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-blue {
          background: #2563eb;
          color: #ffffff;
        }

        .btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .alert {
          background: #fee2e2;
          color: #991b1b;
          border-radius: 14px;
          padding: 12px 14px;
          font-size: 13px;
          margin-bottom: 12px;
        }

        .empty-messages {
          text-align: center;
          color: #6b7280;
          font-size: 13px;
          padding: 38px 10px;
        }

        @media (max-width: 820px) {
          .chat-main {
            grid-template-columns: 1fr;
            padding: 12px;
          }

          .messages-card {
            min-height: calc(100dvh - 290px);
            max-height: calc(100dvh - 220px);
          }

          .message-bubble {
            max-width: 88%;
          }

          .chat-input-wrapper {
            flex-direction: column;
          }

          .chat-textarea {
            width: 100%;
            box-sizing: border-box;
          }

          .chat-input-wrapper .btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="chat-page">
        <header className="chat-header">
          <div className="chat-header-inner">
            <div>
              <h1 style={{ margin: 0, color: '#dc2626', fontSize: 20 }}>
                PrussikTrails
              </h1>

              <p style={{ margin: '3px 0 0', color: '#6b7280', fontSize: 12 }}>
                Chat da reserva
              </p>
            </div>

            <button
              className="btn btn-light"
              onClick={voltar}
            >
              ← Voltar
            </button>
          </div>
        </header>

        <main className="chat-main">
          <aside className="chat-card resumo-card">
            <h2 className="resumo-title">
              Resumo da reserva
            </h2>

            <p className="resumo-line">
              <strong>Roteiro:</strong>
              <br />
              {chat?.reserva?.roteiro_titulo || 'Roteiro'}
            </p>

            <p className="resumo-line">
              <strong>Data:</strong>
              <br />
              {formatarData(chat?.reserva?.data_trilha)}
            </p>

            <p className="resumo-line">
              <strong>Valor:</strong>
              <br />
              {formatarMoeda(chat?.reserva?.valor_total)}
            </p>

            <p className="resumo-line">
              <strong>Pessoas:</strong>
              <br />
              {chat?.reserva?.quantidade_pessoas || 1}
            </p>

            <div style={{ marginTop: 12 }}>
              <span className="badge badge-green">
                {chat?.reserva?.pagamento_status === 'pago'
                  ? 'Pagamento pago'
                  : 'Pagamento pendente'}
              </span>

              <span className="badge badge-blue">
                {chat?.status || 'ativo'}
              </span>

              <span className="badge badge-yellow">
                Moderação futura
              </span>
            </div>

            <div style={{ marginTop: 18 }}>
              <p className="resumo-line">
                <strong>Cliente:</strong>
                <br />
                {participantes.cliente?.nome ||
                  participantes.cliente?.email ||
                  'Cliente'}
              </p>

              <p className="resumo-line">
                <strong>Guia:</strong>
                <br />
                {participantes.guia?.nome ||
                  participantes.guia?.email ||
                  'Guia'}
              </p>

              {participantes.moderador && (
                <p className="resumo-line">
                  <strong>Moderador:</strong>
                  <br />
                  {participantes.moderador?.nome ||
                    participantes.moderador?.email}
                </p>
              )}
            </div>

            {chat?.reserva?.comprovante_url && (
              <button
                className="btn btn-blue"
                style={{ width: '100%', marginTop: 12 }}
                onClick={() =>
                  window.open(chat.reserva?.comprovante_url || '', '_blank')
                }
              >
                Ver comprovante
              </button>
            )}
          </aside>

          <section className="chat-card messages-card">
            <div className="messages-header">
              <h2 style={{ margin: 0, fontSize: 18, color: '#111827' }}>
                Conversa
              </h2>

              <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 12 }}>
                Canal liberado após confirmação de pagamento. Futuramente poderá ser moderado.
              </p>
            </div>

            <div className="messages-list">
              {mensagemErro && (
                <div className="alert">
                  {mensagemErro}
                </div>
              )}

              {mensagens.length === 0 ? (
                <div className="empty-messages">
                  Nenhuma mensagem ainda. Envie a primeira mensagem.
                </div>
              ) : (
                mensagens.map((mensagem) => {
                  const minha = mensagemEhMinha(mensagem)
                  const sistema = mensagem.remetente_tipo === 'sistema'

                  return (
                    <div
                      key={mensagem.id}
                      className={`message-row ${minha ? 'mine' : ''} ${sistema ? 'system' : ''}`}
                    >
                      <div className="message-bubble">
                        <div className="message-meta">
                          {getLabelRemetente(mensagem)}
                        </div>

                        <div>
                          {mensagem.mensagem}
                        </div>

                        <div className="message-time">
                          {formatarDataHora(mensagem.created_at)}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              <div className="chat-input-wrapper">
                <textarea
                  className="chat-textarea"
                  value={novaMensagem}
                  onChange={(event) => setNovaMensagem(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua mensagem..."
                  disabled={enviando || chat?.status !== 'ativo'}
                />

                <button
                  className="btn btn-red"
                  onClick={enviarMensagem}
                  disabled={
                    enviando ||
                    !novaMensagem.trim() ||
                    chat?.status !== 'ativo'
                  }
                >
                  {enviando ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  )
}