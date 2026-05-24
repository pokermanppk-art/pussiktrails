export const dynamic = 'force-static'

type Badge = {
  id: number
  title: string
  subtitle: string
  tone: 'gold' | 'cyan' | 'purple' | 'green' | 'orange'
  icon: React.ReactNode
}

type Mission = {
  id: number
  title: string
  xp: string
  status: 'Concluída' | 'Em andamento' | 'Bloqueada'
}

const badges: Badge[] = [
  {
    id: 1,
    title: 'Pico Master',
    subtitle: '5 cumes concluídos',
    tone: 'gold',
    icon: <MountainIcon />
  },
  {
    id: 2,
    title: 'Explorador',
    subtitle: '12 trilhas únicas',
    tone: 'cyan',
    icon: <CompassIcon />
  },
  {
    id: 3,
    title: 'Elite Night Trek',
    subtitle: '3 trilhas noturnas',
    tone: 'purple',
    icon: <MoonIcon />
  },
  {
    id: 4,
    title: 'Trail Survivor',
    subtitle: '48h de atividade',
    tone: 'green',
    icon: <ShieldIcon />
  },
  {
    id: 5,
    title: 'Team Leader',
    subtitle: '8 grupos liderados',
    tone: 'orange',
    icon: <FlagIcon />
  },
  {
    id: 6,
    title: 'Eco Guardian',
    subtitle: 'Impacto consciente',
    tone: 'cyan',
    icon: <LeafIcon />
  }
]

const missions: Mission[] = [
  {
    id: 1,
    title: 'Completar 3 trilhas premium no mês',
    xp: '+1.500 XP',
    status: 'Em andamento'
  },
  {
    id: 2,
    title: 'Enviar 5 avaliações de experiências',
    xp: '+700 XP',
    status: 'Concluída'
  },
  {
    id: 3,
    title: 'Subir para o ranking Top 10',
    xp: '+2.000 XP',
    status: 'Bloqueada'
  }
]

export default function PremiumDemoPage() {
  return (
    <main className="premium-page">
      <style jsx>{`
        :global(body) {
          margin: 0;
          background:
            radial-gradient(circle at top left, rgba(0, 255, 224, 0.08), transparent 28%),
            radial-gradient(circle at top right, rgba(17, 81, 255, 0.08), transparent 30%),
            linear-gradient(180deg, #04070d 0%, #07111b 100%);
          color: #e6f7ff;
          font-family: Inter, Arial, sans-serif;
        }

        .premium-page {
          min-height: 100vh;
          padding: 24px;
          background:
            radial-gradient(circle at top left, rgba(0, 255, 224, 0.08), transparent 28%),
            radial-gradient(circle at top right, rgba(17, 81, 255, 0.08), transparent 30%),
            linear-gradient(180deg, #04070d 0%, #07111b 100%);
        }

        .container {
          max-width: 1440px;
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 20px;
          border: 1px solid rgba(71, 245, 255, 0.18);
          border-radius: 20px;
          background: rgba(6, 18, 28, 0.72);
          backdrop-filter: blur(10px);
          box-shadow: 0 0 0 1px rgba(0,255,224,0.05), 0 20px 60px rgba(0,0,0,0.25);
          margin-bottom: 20px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .brand-mark {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(0,255,224,0.18), rgba(0,112,255,0.18));
          border: 1px solid rgba(71, 245, 255, 0.22);
          box-shadow: inset 0 0 20px rgba(0,255,224,0.08);
        }

        .brand-title {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
          color: #7df9ff;
          letter-spacing: 0.02em;
        }

        .brand-subtitle {
          margin: 4px 0 0;
          color: #8ea8b8;
          font-size: 12px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .top-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .action-btn {
          border: 1px solid rgba(71, 245, 255, 0.2);
          background: rgba(9, 22, 34, 0.78);
          color: #dffcff;
          padding: 10px 16px;
          border-radius: 14px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .action-btn:hover {
          transform: translateY(-1px);
          border-color: rgba(71, 245, 255, 0.45);
          box-shadow: 0 0 20px rgba(0,255,224,0.1);
        }

        .action-btn.primary {
          background: linear-gradient(90deg, #00d9ff, #1a8fff);
          color: #031019;
          border-color: transparent;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .panel {
          border: 1px solid rgba(71, 245, 255, 0.16);
          border-radius: 24px;
          background: rgba(7, 18, 29, 0.78);
          backdrop-filter: blur(10px);
          box-shadow: inset 0 0 30px rgba(0,255,224,0.03), 0 20px 60px rgba(0,0,0,0.22);
          overflow: hidden;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 18px 20px 0;
        }

        .panel-title {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          color: #ecfeff;
        }

        .panel-tag {
          padding: 7px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          color: #06131b;
          background: linear-gradient(90deg, #7df9ff, #4ed9ff);
        }

        .profile-card {
          padding: 20px;
        }

        .profile-top {
          display: grid;
          grid-template-columns: 130px 1fr;
          gap: 18px;
          align-items: center;
          margin-bottom: 20px;
        }

        .avatar-shell {
          width: 130px;
          height: 130px;
          position: relative;
          border-radius: 28px;
          background: linear-gradient(135deg, rgba(0,255,224,0.18), rgba(0,105,255,0.12));
          border: 1px solid rgba(125, 249, 255, 0.28);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 0 0 6px rgba(0,255,224,0.04),
            inset 0 0 22px rgba(0,255,224,0.06);
        }

        .avatar-inner {
          width: 102px;
          height: 102px;
          border-radius: 24px;
          overflow: hidden;
          background: linear-gradient(180deg, #0f2435, #07111a);
          border: 1px solid rgba(125, 249, 255, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #7df9ff;
          opacity: 0.95;
        }

        .profile-name {
          margin: 0;
          font-size: 40px;
          line-height: 1;
          font-weight: 900;
          color: #7df9ff;
        }

        .profile-level {
          margin-top: 8px;
          font-size: 20px;
          font-weight: 800;
          color: #ffe17a;
        }

        .profile-bio {
          margin: 12px 0 0;
          max-width: 720px;
          color: #9ab1bf;
          font-size: 14px;
          line-height: 1.6;
        }

        .xp-wrap {
          margin-top: 18px;
        }

        .xp-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
          font-size: 13px;
          color: #9ce9ff;
          font-weight: 700;
        }

        .xp-bar {
          height: 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          overflow: hidden;
          border: 1px solid rgba(125,249,255,0.12);
        }

        .xp-fill {
          width: 82%;
          height: 100%;
          background: linear-gradient(90deg, #ffe17a, #00f0ff);
          box-shadow: 0 0 24px rgba(0,240,255,0.25);
        }

        .mini-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-top: 18px;
        }

        .mini-stat {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(125,249,255,0.12);
          border-radius: 18px;
          padding: 16px;
        }

        .mini-label {
          font-size: 11px;
          color: #7f9bae;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 8px;
        }

        .mini-value {
          font-size: 22px;
          font-weight: 900;
          color: #ecfeff;
        }

        .sidebar-card {
          padding: 20px;
        }

        .rank-box {
          display: grid;
          grid-template-columns: 68px 1fr;
          gap: 16px;
          align-items: center;
          padding: 18px;
          border-radius: 20px;
          border: 1px solid rgba(125,249,255,0.14);
          background: linear-gradient(180deg, rgba(5,18,28,0.95), rgba(7,26,34,0.86));
          margin-bottom: 14px;
        }

        .rank-number {
          width: 68px;
          height: 68px;
          border-radius: 18px;
          background: linear-gradient(135deg, #0ce3ff, #005df5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: 900;
          color: #041018;
        }

        .rank-title {
          font-size: 14px;
          font-weight: 800;
          color: #dffcff;
          margin-bottom: 4px;
        }

        .rank-subtitle {
          color: #86a3b4;
          font-size: 12px;
          line-height: 1.5;
        }

        .status-list {
          display: grid;
          gap: 12px;
          margin-top: 12px;
        }

        .status-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 16px;
          border: 1px solid rgba(125,249,255,0.12);
          background: rgba(255,255,255,0.03);
        }

        .status-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,255,224,0.09);
          color: #7df9ff;
        }

        .status-title {
          font-size: 13px;
          font-weight: 700;
          color: #e7fcff;
        }

        .status-note {
          font-size: 11px;
          color: #7f9bae;
        }

        .status-pill {
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(0,255,224,0.12);
          color: #7df9ff;
          font-size: 11px;
          font-weight: 800;
        }

        .section-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .badges-panel,
        .missions-panel,
        .gallery-panel,
        .premium-panel {
          padding-bottom: 20px;
        }

        .badges-grid {
          padding: 20px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .badge-card {
          position: relative;
          min-height: 148px;
          border-radius: 22px;
          padding: 16px;
          border: 1px solid rgba(125,249,255,0.12);
          background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015));
          overflow: hidden;
        }

        .badge-card::after {
          content: '';
          position: absolute;
          inset: auto -20px -30px auto;
          width: 90px;
          height: 90px;
          border-radius: 999px;
          opacity: 0.18;
          filter: blur(8px);
        }

        .badge-gold::after { background: #ffd34d; }
        .badge-cyan::after { background: #00f0ff; }
        .badge-purple::after { background: #9d7cff; }
        .badge-green::after { background: #3cffb3; }
        .badge-orange::after { background: #ff994d; }

        .badge-icon {
          width: 58px;
          height: 58px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }

        .badge-gold .badge-icon {
          background: rgba(255, 211, 77, 0.14);
          color: #ffd34d;
        }

        .badge-cyan .badge-icon {
          background: rgba(0, 240, 255, 0.14);
          color: #00f0ff;
        }

        .badge-purple .badge-icon {
          background: rgba(157, 124, 255, 0.16);
          color: #b8a0ff;
        }

        .badge-green .badge-icon {
          background: rgba(60, 255, 179, 0.14);
          color: #67ffc0;
        }

        .badge-orange .badge-icon {
          background: rgba(255, 153, 77, 0.14);
          color: #ffb075;
        }

        .badge-title {
          font-size: 14px;
          font-weight: 800;
          color: #f1fcff;
          margin-bottom: 6px;
        }

        .badge-subtitle {
          font-size: 12px;
          color: #84a2b1;
          line-height: 1.45;
        }

        .mission-list {
          padding: 20px;
          display: grid;
          gap: 14px;
        }

        .mission-card {
          border-radius: 20px;
          padding: 16px;
          border: 1px solid rgba(125,249,255,0.12);
          background: rgba(255,255,255,0.03);
        }

        .mission-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          margin-bottom: 10px;
        }

        .mission-title {
          font-size: 14px;
          font-weight: 800;
          color: #edfeff;
        }

        .mission-xp {
          font-size: 12px;
          font-weight: 800;
          color: #ffe17a;
        }

        .mission-status {
          display: inline-flex;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .mission-status.done {
          background: rgba(63, 255, 182, 0.12);
          color: #6dffc4;
        }

        .mission-status.progress {
          background: rgba(0, 240, 255, 0.12);
          color: #7df9ff;
        }

        .mission-status.locked {
          background: rgba(255,255,255,0.08);
          color: #a6bfcb;
        }

        .mission-bar {
          margin-top: 12px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.05);
          overflow: hidden;
        }

        .mission-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #00f0ff, #2aa8ff);
        }

        .gallery-wrap {
          padding: 20px;
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .gallery-item {
          aspect-ratio: 1 / 1;
          border-radius: 18px;
          border: 1px solid rgba(125,249,255,0.12);
          background:
            linear-gradient(135deg, rgba(0,255,224,0.12), rgba(0,84,255,0.14)),
            linear-gradient(180deg, #0a1623, #07111a);
          display: flex;
          align-items: flex-end;
          justify-content: flex-start;
          padding: 10px;
          color: #eaffff;
          font-size: 12px;
          font-weight: 700;
          box-shadow: inset 0 -30px 40px rgba(0,0,0,0.2);
        }

        .premium-inner {
          padding: 20px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .premium-card {
          border-radius: 20px;
          border: 1px solid rgba(125,249,255,0.12);
          background: rgba(255,255,255,0.03);
          padding: 18px;
        }

        .premium-card-title {
          font-size: 15px;
          font-weight: 800;
          color: #f2fdff;
          margin-bottom: 8px;
        }

        .premium-card-text {
          font-size: 13px;
          color: #91aaba;
          line-height: 1.6;
          margin-bottom: 14px;
        }

        .premium-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 14px;
          background: linear-gradient(90deg, #00f0ff, #2e95ff);
          color: #06131b;
          font-size: 12px;
          font-weight: 900;
          border: none;
          cursor: pointer;
        }

        .footer-note {
          margin-top: 14px;
          color: #6e8897;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        @media (max-width: 1180px) {
          .hero-grid,
          .section-grid,
          .premium-inner {
            grid-template-columns: 1fr;
          }

          .badges-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .gallery-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .premium-page {
            padding: 14px;
          }

          .topbar {
            padding: 14px;
          }

          .profile-top {
            grid-template-columns: 1fr;
          }

          .profile-name {
            font-size: 30px;
          }

          .mini-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .badges-grid {
            grid-template-columns: 1fr;
          }

          .gallery-grid {
            grid-template-columns: 1fr 1fr;
          }

          .top-actions {
            width: 100%;
          }

          .action-btn {
            flex: 1;
          }
        }
      `}</style>

      <div className="container">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">
              <TrailLogoIcon />
            </div>

            <div>
              <h1 className="brand-title">PrussikTrails Premium</h1>
              <p className="brand-subtitle">
                Perfil do Aventureiro • Demo Experience
              </p>
            </div>
          </div>

          <div className="top-actions">
            <button className="action-btn">Store</button>
            <button className="action-btn">Intel</button>
            <button className="action-btn">Missões</button>
            <button className="action-btn primary">Upgrade Premium</button>
          </div>
        </header>

        <section className="hero-grid">
          <div className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Agent Profile</h2>
              <span className="panel-tag">ONLINE</span>
            </div>

            <div className="profile-card">
              <div className="profile-top">
                <div className="avatar-shell">
                  <div className="avatar-inner">
                    <div className="avatar-placeholder">
                      <ProfileIcon />
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="profile-name">Sr. Brito</h2>
                  <div className="profile-level">LVL 10 • Trail Commander</div>

                  <p className="profile-bio">
                    Explorador premium da comunidade PrussikTrails. Perfil focado em
                    trilhas, montanhismo, experiências outdoor e progressão por
                    conquistas, ranking e missões especiais.
                  </p>

                  <div className="xp-wrap">
                    <div className="xp-top">
                      <span>4.958.322 AP</span>
                      <span>Próximo nível: 6.000.000 AP</span>
                    </div>

                    <div className="xp-bar">
                      <div className="xp-fill" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mini-stats">
                <div className="mini-stat">
                  <div className="mini-label">Trilhas concluídas</div>
                  <div className="mini-value">127</div>
                </div>

                <div className="mini-stat">
                  <div className="mini-label">Picos visitados</div>
                  <div className="mini-value">34</div>
                </div>

                <div className="mini-stat">
                  <div className="mini-label">Horas outdoor</div>
                  <div className="mini-value">412h</div>
                </div>

                <div className="mini-stat">
                  <div className="mini-label">Ranking atual</div>
                  <div className="mini-value">#08</div>
                </div>
              </div>
            </div>
          </div>

          <aside className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Agent Intel</h2>
              <span className="panel-tag">PREMIUM</span>
            </div>

            <div className="sidebar-card">
              <div className="rank-box">
                <div className="rank-number">08</div>
                <div>
                  <div className="rank-title">Top Ranking Mensal</div>
                  <div className="rank-subtitle">
                    Você está entre os aventureiros com maior engajamento e evolução
                    do mês.
                  </div>
                </div>
              </div>

              <div className="status-list">
                <div className="status-item">
                  <div className="status-left">
                    <div className="status-icon">
                      <SignalIcon />
                    </div>
                    <div>
                      <div className="status-title">Status de evolução</div>
                      <div className="status-note">Progresso ativo</div>
                    </div>
                  </div>

                  <span className="status-pill">82%</span>
                </div>

                <div className="status-item">
                  <div className="status-left">
                    <div className="status-icon">
                      <CrownIcon />
                    </div>
                    <div>
                      <div className="status-title">Conta premium</div>
                      <div className="status-note">Benefícios liberados</div>
                    </div>
                  </div>

                  <span className="status-pill">Elite</span>
                </div>

                <div className="status-item">
                  <div className="status-left">
                    <div className="status-icon">
                      <ChatMiniIcon />
                    </div>
                    <div>
                      <div className="status-title">Comunidade</div>
                      <div className="status-note">Interação elevada</div>
                    </div>
                  </div>

                  <span className="status-pill">Ativo</span>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="section-grid">
          <div className="panel badges-panel">
            <div className="panel-header">
              <h2 className="panel-title">Conquistas & Badges</h2>
              <span className="panel-tag">SVG SYSTEM</span>
            </div>

            <div className="badges-grid">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`badge-card badge-${badge.tone}`}
                >
                  <div className="badge-icon">{badge.icon}</div>
                  <div className="badge-title">{badge.title}</div>
                  <div className="badge-subtitle">{badge.subtitle}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel missions-panel">
            <div className="panel-header">
              <h2 className="panel-title">Missões & Progressão</h2>
              <span className="panel-tag">LIVE OBJECTIVES</span>
            </div>

            <div className="mission-list">
              {missions.map((mission, index) => (
                <div key={mission.id} className="mission-card">
                  <div className="mission-top">
                    <div className="mission-title">{mission.title}</div>
                    <div className="mission-xp">{mission.xp}</div>
                  </div>

                  <span
                    className={`mission-status ${
                      mission.status === 'Concluída'
                        ? 'done'
                        : mission.status === 'Em andamento'
                        ? 'progress'
                        : 'locked'
                    }`}
                  >
                    {mission.status}
                  </span>

                  <div className="mission-bar">
                    <div
                      className="mission-fill"
                      style={{
                        width:
                          index === 0
                            ? '68%'
                            : index === 1
                            ? '100%'
                            : '18%'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-grid">
          <div className="panel gallery-panel">
            <div className="panel-header">
              <h2 className="panel-title">Recent Adventures</h2>
              <span className="panel-tag">TRAIL FEED</span>
            </div>

            <div className="gallery-wrap">
              <div className="gallery-grid">
                <div className="gallery-item">Pedra Grande</div>
                <div className="gallery-item">Pico do Lopo</div>
                <div className="gallery-item">Travessia Serra</div>
                <div className="gallery-item">Sunrise Trail</div>
              </div>
            </div>
          </div>

          <div className="panel premium-panel">
            <div className="panel-header">
              <h2 className="panel-title">Monetização Premium</h2>
              <span className="panel-tag">FUTURE REVENUE</span>
            </div>

            <div className="premium-inner">
              <div className="premium-card">
                <div className="premium-card-title">Perfil público avançado</div>
                <div className="premium-card-text">
                  Destaque no ranking, bio customizada, mural de aventuras,
                  conquistas exclusivas e identidade visual premium.
                </div>
                <button className="premium-cta">
                  <UpgradeIcon />
                  Ativar Perfil Elite
                </button>
              </div>

              <div className="premium-card">
                <div className="premium-card-title">Clube de benefícios</div>
                <div className="premium-card-text">
                  Descontos em roteiros, prioridade em vagas, eventos especiais,
                  desafios gamificados e trilhas exclusivas para membros.
                </div>
                <button className="premium-cta">
                  <RocketIcon />
                  Entrar no Clube
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="footer-note">
          Demo conceitual • Perfil do Aventureiro Premium • PrussikTrails
        </div>
      </div>
    </main>
  )
}

/* ===========================
   SVG ICONS
=========================== */

function TrailLogoIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2L20 7V17L12 22L4 17V7L12 2Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8.5 14.5L11 9L13.2 13L15.5 8.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg width="62" height="62" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M4 21C4 17.6863 7.58172 15 12 15C16.4183 15 20 17.6863 20 21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MountainIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 19L9 8L13 14L16 10L21 19H3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CompassIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M14.5 9.5L13 13L9.5 14.5L11 11L14.5 9.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path
        d="M19 14.5A7.5 7.5 0 0 1 9.5 5C6.9 6.1 5 8.7 5 11.8C5 15.8 8.2 19 12.2 19C15.3 19 17.9 17.1 19 14.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3L19 6V11C19 15.5 16.1 19.6 12 21C7.9 19.6 5 15.5 5 11V6L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function FlagIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 21V4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6 5H17L15 9L17 13H6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LeafIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path
        d="M19 5C12.5 5 7 8.8 7 15C7 17.8 9.2 20 12 20C18.2 20 22 14.5 22 8V5H19Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 16C10.2 13.8 13.4 12.2 18 11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SignalIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 18H6V20H4V18Z" fill="currentColor" />
      <path d="M8 14H10V20H8V14Z" fill="currentColor" />
      <path d="M12 10H14V20H12V10Z" fill="currentColor" />
      <path d="M16 6H18V20H16V6Z" fill="currentColor" />
    </svg>
  )
}

function CrownIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 18L6 8L12 13L18 8L20 18H4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChatMiniIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 15C20 16.1 19.1 17 18 17H8L4 20V6C4 4.9 4.9 4 6 4H18C19.1 4 20 4.9 20 6V15Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function UpgradeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 4L12 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M7 9L12 4L17 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function RocketIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M14 4C17.5 4.5 19.5 6.5 20 10C17 10.5 14.5 13 14 16C10.5 15.5 8.5 13.5 8 10C11 9.5 13.5 7 14 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M7 17L4 20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}