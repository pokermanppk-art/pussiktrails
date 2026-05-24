'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type PerfilCliente = {
  id: string
  nome?: string
  email?: string
  telefone?: string
  tipo?: string
  created_at?: string
}

type ReservaResumo = {
  id: string
  status?: string
  pagamento_status?: string
  valor_total?: number
  created_at?: string
}

export default function ClientePerfilPage() {
  const router = useRouter()
  const carregouRef = useRef(false)

  const [user, setUser] = useState<any>(null)
  const [perfil, setPerfil] = useState<PerfilCliente | null>(null)
  const [reservas, setReservas] = useState<ReservaResumo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mensagem, setMensagem] = useState('')

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

      if (parsedUser.tipo !== 'cliente') {
        router.push('/')
        return
      }

      setUser(parsedUser)
      await carregarPerfil(parsedUser)
    } catch (error) {
      console.error('Erro ao iniciar perfil:', error)
      setMensagem('Erro ao carregar perfil do cliente.')
      setCarregando(false)
    }
  }

  const carregarPerfil = async (usuario: any) => {
    setCarregando(true)
    setMensagem('')

    try {
      const clienteId = usuario?.id

      if (!clienteId) {
        throw new Error('Cliente não identificado.')
      }

      const { data: perfilData, error: perfilError } = await supabase
        .from('users')
        .select('*')
        .eq('id', clienteId)
        .maybeSingle()

      if (perfilError) {
        console.warn('Erro ao buscar perfil:', perfilError)
      }

      const { data: reservasData, error: reservasError } = await supabase
        .from('reservas')
        .select('id, status, pagamento_status, valor_total, created_at')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })

      if (reservasError) {
        console.warn('Erro ao buscar reservas do perfil:', reservasError)
      }

      setPerfil(perfilData || usuario)
      setReservas(reservasData || [])
    } catch (error: any) {
      console.error('Erro ao carregar perfil:', error)
      setMensagem(error?.message || 'Erro ao carregar dados do perfil.')
    } finally {
      setCarregando(false)
    }
  }

  const sair = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  const totalReservas = reservas.length

  const reservasPagas = reservas.filter(
    (reserva) => reserva.pagamento_status === 'pago'
  ).length

  const reservasRealizadas = reservas.filter(
    (reserva) => reserva.status === 'realizada'
  ).length

  const reservasConfirmadas = reservas.filter(
    (reserva) =>
      reserva.status === 'confirmada' ||
      reserva.pagamento_status === 'pago'
  ).length

  const xpAtual =
    totalReservas * 420 +
    reservasPagas * 680 +
    reservasRealizadas * 1200

  const xpProximoNivel = 6000
  const progresso = Math.min(100, Math.round((xpAtual / xpProximoNivel) * 100))

  const nivel = Math.max(1, Math.floor(xpAtual / 1000) + 1)

  const nomeCliente =
    perfil?.nome ||
    user?.nome ||
    'Aventureiro Prussik'

  const emailCliente =
    perfil?.email ||
    user?.email ||
    'cliente@prussiktrails.com'

  const membroDesde = perfil?.created_at
    ? new Date(perfil.created_at).toLocaleDateString('pt-BR')
    : 'Perfil ativo'

  if (carregando) {
    return (
      <main
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          color: '#00ff66'
        }}
      >
        Carregando perfil premium...
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
          background: #000000;
          color: #f4fff7;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        button {
          font-family: inherit;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 18% 8%, rgba(0, 255, 102, 0.15), transparent 30%),
            radial-gradient(circle at 86% 2%, rgba(255, 255, 255, 0.07), transparent 26%),
            linear-gradient(180deg, #000000 0%, #050705 48%, #000000 100%);
          position: relative;
          overflow-x: hidden;
        }

        .page::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(255,255,255,0.026) 1px, transparent 1px),
            linear-gradient(0deg, rgba(255,255,255,0.018) 1px, transparent 1px);
          background-size: 42px 42px;
          opacity: 0.42;
          mask-image: linear-gradient(180deg, black, transparent 85%);
          z-index: 0;
        }

        .shell {
          position: relative;
          z-index: 1;
          max-width: 1280px;
          margin: 0 auto;
          padding: 22px;
        }

        .topbar {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.68);
          backdrop-filter: blur(18px);
          border-radius: 30px;
          padding: 16px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          margin-bottom: 18px;
          box-shadow: 0 26px 80px rgba(0,0,0,0.35);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .brand-mark {
          width: 50px;
          height: 50px;
          border: 1px solid rgba(0,255,102,0.22);
          background:
            radial-gradient(circle at 30% 20%, rgba(0,255,102,0.24), transparent 42%),
            linear-gradient(135deg, #101310, #000000);
          color: #00ff66;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand h1 {
          margin: 0;
          color: #ffffff;
          font-size: 20px;
          font-weight: 300;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .brand p {
          margin: 5px 0 0;
          color: #8d978f;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn {
          border: 1px solid rgba(74,74,74,0.95);
          background: rgba(255,255,255,0.025);
          color: #f4fff7;
          padding: 11px 16px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          cursor: pointer;
          transition: 0.25s ease;
        }

        .btn:hover {
          border-color: rgba(0,255,102,0.72);
          color: #00ff66;
          box-shadow: 0 0 22px rgba(0,255,102,0.14);
        }

        .btn.primary {
          border-color: rgba(0,255,102,0.6);
          background: rgba(0,255,102,0.08);
          color: #00ff66;
        }

        .hero {
          min-height: 520px;
          border-radius: 36px;
          border: 1px solid rgba(255,255,255,0.09);
          overflow: hidden;
          position: relative;
          margin-bottom: 18px;
          background:
            linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.88)),
            radial-gradient(circle at 52% 10%, rgba(255,255,255,0.10), transparent 22%),
            radial-gradient(circle at 27% 42%, rgba(0,255,102,0.14), transparent 25%),
            linear-gradient(135deg, #101010, #000000 48%, #050805);
          box-shadow:
            0 35px 120px rgba(0,0,0,0.58),
            inset 0 0 80px rgba(255,255,255,0.025);
        }

        .hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(0deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 34px 34px;
          opacity: 0.34;
          mask-image: linear-gradient(180deg, black, transparent);
        }

        .hero-inner {
          position: relative;
          z-index: 2;
          min-height: 520px;
          padding: 32px;
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          gap: 28px;
          align-items: center;
        }

        .avatar-frame {
          width: 180px;
          height: 180px;
          border-radius: 50%;
          padding: 4px;
          background: conic-gradient(from 180deg, #00ff66, #4a4a4a, #ffffff, #00ff66);
          box-shadow: 0 0 38px rgba(0,255,102,0.22);
          position: relative;
          margin: 0 auto;
        }

        .avatar-core {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 22%, rgba(0,255,102,0.24), transparent 34%),
            linear-gradient(180deg, #151515, #000000);
          border: 4px solid #000000;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #00ff66;
        }

        .activity {
          position: absolute;
          right: 14px;
          bottom: 18px;
          width: 22px;
          height: 22px;
          border-radius: 999px;
          border: 4px solid #000000;
          background: #00ff66;
          box-shadow: 0 0 18px rgba(0,255,102,0.9);
        }

        .system-chip {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 9px 13px;
          border: 1px solid rgba(0,255,102,0.24);
          background: rgba(0,255,102,0.06);
          color: #00ff66;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .system-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #00ff66;
          box-shadow: 0 0 18px rgba(0,255,102,0.9);
        }

        .title {
          margin: 0;
          font-weight: 200;
          font-size: clamp(38px, 6vw, 72px);
          line-height: 0.95;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #ffffff;
        }

        .title span {
          color: #00ff66;
          text-shadow: 0 0 32px rgba(0,255,102,0.26);
        }

        .subtitle {
          margin: 16px 0 0;
          max-width: 720px;
          color: #a0aaa2;
          font-size: 14px;
          line-height: 1.75;
          letter-spacing: 0.03em;
        }

        .user-meta {
          margin-top: 18px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .meta-chip {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.46);
          padding: 9px 12px;
          color: #8f9a91;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .meta-chip strong {
          color: #00ff66;
          font-weight: 500;
        }

        .status-grid {
          display: grid;
          grid-template-columns: 1.2fr repeat(3, 1fr);
          gap: 1px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.08);
          margin-bottom: 18px;
        }

        .status-cell {
          background: rgba(0,0,0,0.78);
          padding: 18px;
        }

        .cell-label {
          color: #7e8a82;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .cell-value {
          color: #ffffff;
          font-size: 28px;
          font-weight: 200;
          letter-spacing: 0.08em;
        }

        .cell-note {
          color: #00ff66;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-top: 6px;
        }

        .xp-meta {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: #9ca5a0;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 11px;
          margin-bottom: 9px;
        }

        .xp-bar {
          height: 10px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.08);
          overflow: hidden;
        }

        .xp-fill {
          height: 100%;
          background: linear-gradient(90deg, #4a4a4a, #00ff66);
          box-shadow: 0 0 24px rgba(0,255,102,0.32);
        }

        .panel-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 18px;
        }

        .panel {
          border: 1px solid rgba(255,255,255,0.08);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02)),
            rgba(0,0,0,0.72);
          backdrop-filter: blur(18px);
          box-shadow: 0 26px 80px rgba(0,0,0,0.34);
        }

        .panel-head {
          padding: 20px 20px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .panel-title {
          margin: 0;
          color: #ffffff;
          font-size: 16px;
          font-weight: 300;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .panel-code {
          color: #00ff66;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
        }

        .passport-card {
          padding: 20px;
        }

        .passport-inner {
          border: 1px solid rgba(0,255,102,0.18);
          padding: 22px;
          background:
            radial-gradient(circle at 90% 10%, rgba(0,255,102,0.12), transparent 30%),
            rgba(0,0,0,0.58);
        }

        .passport-title {
          color: #00ff66;
          font-size: 12px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          margin-bottom: 22px;
        }

        .passport-name {
          color: #ffffff;
          font-size: 38px;
          font-weight: 200;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .passport-text {
          color: #9aa39d;
          line-height: 1.75;
          font-size: 13px;
        }

        .achievement-grid {
          padding: 20px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .achievement {
          min-height: 148px;
          padding: 17px;
          border: 1px solid rgba(255,255,255,0.08);
          background:
            radial-gradient(circle at 80% 20%, rgba(0,255,102,0.11), transparent 28%),
            rgba(0,0,0,0.55);
          position: relative;
          overflow: hidden;
        }

        .hex-icon {
          width: 56px;
          height: 56px;
          color: #00ff66;
          border: 1px solid rgba(0,255,102,0.22);
          background: rgba(0,255,102,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          clip-path: polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0 50%);
          margin-bottom: 16px;
        }

        .achievement-title {
          color: #ffffff;
          font-size: 14px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .achievement-desc {
          margin-top: 8px;
          color: #919b95;
          font-size: 12px;
          line-height: 1.6;
        }

        .terminal {
          margin-top: 18px;
          border: 1px solid rgba(255,255,255,0.08);
          background:
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(0deg, rgba(255,255,255,0.026) 1px, transparent 1px),
            #000000;
          background-size: 36px 36px;
          padding: 22px;
          display: flex;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }

        .terminal-link {
          color: #a0aaa2;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .terminal-link span {
          color: #00ff66;
          margin-right: 8px;
        }

        @media (max-width: 900px) {
          .topbar {
            flex-direction: column;
            align-items: flex-start;
          }

          .hero-inner {
            grid-template-columns: 1fr;
            text-align: left;
          }

          .avatar-frame {
            margin: 0;
          }

          .status-grid,
          .panel-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .shell {
            padding: 12px;
          }

          .hero-inner {
            padding: 22px;
          }

          .actions {
            width: 100%;
          }

          .btn {
            flex: 1;
          }

          .achievement-grid {
            grid-template-columns: 1fr;
          }

          .title {
            font-size: 38px;
          }

          .passport-name {
            font-size: 28px;
          }
        }
      `}</style>

      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">
              <PrussikIcon />
            </div>

            <div>
              <h1>PrussikTrails Passport</h1>
              <p>Perfil do aventureiro • Cliente</p>
            </div>
          </div>

          <div className="actions">
            <button className="btn" onClick={() => router.push('/cliente/dashboard')}>
              Dashboard
            </button>

            <button className="btn" onClick={() => router.push('/cliente/minhas-reservas')}>
              Reservas
            </button>

            <button className="btn primary" onClick={() => router.push('/cliente/roteiros')}>
              Explorar
            </button>

            <button className="btn" onClick={sair}>
              Sair
            </button>
          </div>
        </header>

        {mensagem && (
          <div
            style={{
              border: '1px solid rgba(0,255,102,0.28)',
              color: '#00ff66',
              padding: 14,
              marginBottom: 18,
              background: 'rgba(0,255,102,0.06)'
            }}
          >
            {mensagem}
          </div>
        )}

        <section className="hero">
          <div className="hero-inner">
            <div>
              <div className="avatar-frame">
                <div className="avatar-core">
                  <AgentIcon />
                </div>
                <span className="activity" />
              </div>
            </div>

            <div>
              <div className="system-chip">
                <span className="system-dot" />
                Perfil ativo • Wild Passport
              </div>

              <h2 className="title">
                {nomeCliente.split(' ')[0]} <span>Explorer</span>
              </h2>

              <p className="subtitle">
                Identidade digital do aventureiro dentro do PrussikTrails.
                Aqui o cliente acompanha sua evolução, reservas, conquistas,
                histórico e futuramente poderá ativar a camada premium.
              </p>

              <div className="user-meta">
                <div className="meta-chip">
                  Email: <strong>{emailCliente}</strong>
                </div>

                <div className="meta-chip">
                  Membro desde: <strong>{membroDesde}</strong>
                </div>

                <div className="meta-chip">
                  Classe: <strong>Trail Commander</strong>
                </div>

                <div className="meta-chip">
                  Nível: <strong>LVL {nivel}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="status-grid">
          <div className="status-cell">
            <div className="cell-label">Progressão</div>

            <div className="xp-meta">
              <span>{xpAtual} XP</span>
              <span>{xpProximoNivel} XP</span>
            </div>

            <div className="xp-bar">
              <div
                className="xp-fill"
                style={{ width: `${progresso}%` }}
              />
            </div>

            <div className="cell-note">
              {progresso}% até o próximo nível
            </div>
          </div>

          <div className="status-cell">
            <div className="cell-label">Reservas</div>
            <div className="cell-value">{totalReservas}</div>
            <div className="cell-note">aventuras criadas</div>
          </div>

          <div className="status-cell">
            <div className="cell-label">Confirmadas</div>
            <div className="cell-value">{reservasConfirmadas}</div>
            <div className="cell-note">pagas ou ativas</div>
          </div>

          <div className="status-cell">
            <div className="cell-label">Realizadas</div>
            <div className="cell-value">{reservasRealizadas}</div>
            <div className="cell-note">histórico outdoor</div>
          </div>
        </section>

        <section className="panel-grid">
          <div className="panel passport-card">
            <div className="passport-inner">
              <div className="passport-title">Wild Passport</div>

              <div className="passport-name">{nomeCliente}</div>

              <p className="passport-text">
                Este perfil funciona como um passaporte outdoor. A cada reserva,
                pagamento confirmado, trilha realizada e interação futura, o cliente
                acumula reputação, XP, badges e histórico dentro da comunidade
                PrussikTrails.
              </p>

              <div className="actions" style={{ marginTop: 24 }}>
                <button
                  className="btn primary"
                  onClick={() => router.push('/cliente/minhas-reservas')}
                >
                  Ver minhas reservas
                </button>

                <button
                  className="btn"
                  onClick={() => router.push('/cliente/roteiros')}
                >
                  Nova aventura
                </button>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3 className="panel-title">Field Badges</h3>
              <span className="panel-code">ACHV_04</span>
            </div>

            <div className="achievement-grid">
              <Achievement
                title="Primeira Reserva"
                description="Criou sua primeira experiência dentro da plataforma."
                icon={<TicketIcon />}
              />

              <Achievement
                title="Pagamento Confirmado"
                description="Teve uma reserva confirmada com pagamento aprovado."
                icon={<ShieldIcon />}
              />

              <Achievement
                title="Explorador"
                description="Começou sua jornada de trilhas e experiências outdoor."
                icon={<MountainIcon />}
              />

              <Achievement
                title="Black Access"
                description="Camada premium futura para ranking, comunidade e benefícios."
                icon={<CrownIcon />}
              />
            </div>
          </div>
        </section>

        <footer className="terminal">
          <div className="terminal-link">
            <span>01.</span> Perfil do Aventureiro
          </div>

          <div className="terminal-link">
            <span>02.</span> Reservas
          </div>

          <div className="terminal-link">
            <span>03.</span> Conquistas
          </div>

          <div className="terminal-link">
            <span>04.</span> Premium Futuro
          </div>
        </footer>
      </div>
    </main>
  )
}

function Achievement({
  title,
  description,
  icon
}: {
  title: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <article className="achievement">
      <div className="hex-icon">{icon}</div>
      <div className="achievement-title">{title}</div>
      <div className="achievement-desc">{description}</div>
    </article>
  )
}

function PrussikIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 16L10.5 8L13.5 13L16 9L20 18H4L7 16Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function AgentIcon() {
  return (
    <svg width="74" height="74" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 21C5 17.4 8.2 15 12 15C15.8 15 19 17.4 19 21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function TicketIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M4 8V6H20V8C18.9 8 18 8.9 18 10C18 11.1 18.9 12 20 12V18H4V12C5.1 12 6 11.1 6 10C6 8.9 5.1 8 4 8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M12 3L19 6V11C19 15.5 16.1 19.6 12 21C7.9 19.6 5 15.5 5 11V6L12 3Z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function MountainIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M3 19L9 8L13 14L16 10L21 19H3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

function CrownIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M4 18L6 8L12 13L18 8L20 18H4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}