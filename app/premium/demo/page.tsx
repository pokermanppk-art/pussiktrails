export default function PremiumDemoPage() {
  const stats = [
    { label: 'Nível', value: '28' },
    { label: 'XP', value: '84%' },
    { label: 'Trilhas', value: '37' },
    { label: 'Ranking', value: '#12' }
  ]

  const achievements = [
    { title: 'Altitude', text: '5 trilhas acima de 1.500m', icon: '▲' },
    { title: 'Explorador', text: '10 destinos concluídos', icon: '◆' },
    { title: 'Resistência', text: '100km acumulados', icon: '⬢' },
    { title: 'Elite', text: 'Badge premium ativo', icon: '✦' }
  ]

  const trilhasRecentes = [
    {
      nome: 'Pico da Neblina Urbana',
      local: 'Serra Experimental',
      status: 'Concluída',
      xp: '+420 XP'
    },
    {
      nome: 'Travessia Aurora',
      local: 'Vale das Pedras',
      status: 'Em progresso',
      xp: '+180 XP'
    },
    {
      nome: 'Circuito Prussik Pro',
      local: 'Montanha Técnica',
      status: 'Desafio aberto',
      xp: '+650 XP'
    }
  ]

  const ranking = [
    { posicao: '01', nome: 'Lobo Norte', pontos: '18.900' },
    { posicao: '02', nome: 'Maya Rock', pontos: '16.440' },
    { posicao: '03', nome: 'Sr. Brito', pontos: '15.870' }
  ]

  return (
    <main className="page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #020617;
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
            radial-gradient(circle at top left, rgba(0, 255, 102, 0.16), transparent 26%),
            radial-gradient(circle at bottom right, rgba(220, 38, 38, 0.18), transparent 28%),
            linear-gradient(135deg, #000000 0%, #020617 48%, #0f172a 100%);
          color: #ffffff;
          overflow-x: hidden;
        }

        .shell {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          min-height: 100vh;
        }

        .sidebar {
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.48);
          backdrop-filter: blur(18px);
          padding: 22px 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 22px;
          position: sticky;
          top: 0;
          height: 100vh;
        }

        .sideLogo {
          width: 58px;
          height: 58px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .sideLogo img {
          width: 46px;
          height: auto;
          display: block;
          object-fit: contain;
        }

        .nav {
          display: grid;
          gap: 12px;
          width: 100%;
        }

        .navItem {
          height: 54px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.07);
          font-weight: 900;
          text-decoration: none;
        }

        .navItem.active {
          color: #00ff66;
          border-color: rgba(0, 255, 102, 0.44);
          box-shadow: 0 0 28px rgba(0, 255, 102, 0.18);
        }

        .content {
          padding: 24px;
        }

        .hero {
          min-height: 360px;
          border-radius: 36px;
          padding: 28px;
          background:
            linear-gradient(90deg, rgba(0,0,0,0.78), rgba(0,0,0,0.38)),
            url('/premium/demo-bg.jpg');
          background-size: cover;
          background-position: center;
          border: 1px solid rgba(255, 255, 255, 0.10);
          box-shadow: 0 24px 80px rgba(0,0,0,0.38);
          position: relative;
          overflow: hidden;
        }

        .hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: linear-gradient(to bottom, black, transparent);
          pointer-events: none;
        }

        .heroInner {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
          gap: 24px;
          align-items: end;
          min-height: 300px;
        }

        .brandRow {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
        }

        .brandRow img {
          height: 54px;
          width: auto;
          object-fit: contain;
        }

        .brandText {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.24em;
          color: #cbd5e1;
          font-weight: 800;
        }

        .heroTag {
          display: inline-flex;
          border: 1px solid rgba(0, 255, 102, 0.36);
          color: #00ff66;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          margin-bottom: 14px;
          background: rgba(0, 255, 102, 0.08);
        }

        .heroTitle {
          margin: 0;
          font-size: clamp(42px, 7vw, 84px);
          line-height: 0.92;
          letter-spacing: -0.08em;
          font-weight: 950;
          max-width: 760px;
        }

        .heroTitle span {
          color: #00ff66;
          text-shadow: 0 0 28px rgba(0, 255, 102, 0.42);
        }

        .heroText {
          margin: 18px 0 0;
          color: #cbd5e1;
          line-height: 1.65;
          max-width: 620px;
          font-size: 15px;
        }

        .profileCard {
          background: rgba(15, 23, 42, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 30px;
          padding: 20px;
          backdrop-filter: blur(18px);
        }

        .avatarWrap {
          width: 112px;
          height: 112px;
          margin: 0 auto 14px;
          border-radius: 34px;
          padding: 3px;
          background: linear-gradient(135deg, #00ff66, #dc2626);
          box-shadow: 0 0 34px rgba(0, 255, 102, 0.28);
        }

        .avatar {
          width: 100%;
          height: 100%;
          border-radius: 31px;
          background: #020617;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 42px;
          font-weight: 950;
          color: #ffffff;
        }

        .profileName {
          text-align: center;
          font-size: 22px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .profileId {
          text-align: center;
          color: #94a3b8;
          font-size: 12px;
          margin-top: 4px;
        }

        .status {
          margin: 14px auto 0;
          width: fit-content;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #00ff66;
          background: rgba(0, 255, 102, 0.08);
          border: 1px solid rgba(0, 255, 102, 0.24);
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 900;
        }

        .pulse {
          width: 8px;
          height: 8px;
          background: #00ff66;
          border-radius: 999px;
          box-shadow: 0 0 14px rgba(0, 255, 102, 0.85);
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin: 20px 0;
        }

        .statCard {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.10);
          border-radius: 26px;
          padding: 18px;
          min-height: 112px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .statLabel {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }

        .statValue {
          font-size: 34px;
          font-weight: 950;
          letter-spacing: -0.07em;
          color: #ffffff;
        }

        .mainGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
          gap: 20px;
        }

        .panel {
          background: rgba(15, 23, 42, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.10);
          border-radius: 30px;
          padding: 22px;
          backdrop-filter: blur(18px);
          box-shadow: 0 18px 50px rgba(0,0,0,0.22);
        }

        .panelHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .panelTitle {
          margin: 0;
          font-size: 20px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .panelBadge {
          color: #00ff66;
          border: 1px solid rgba(0, 255, 102, 0.28);
          background: rgba(0, 255, 102, 0.08);
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .achievements {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .hexCard {
          min-height: 170px;
          clip-path: polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0% 50%);
          background:
            linear-gradient(145deg, rgba(0, 255, 102, 0.16), rgba(255,255,255,0.05));
          border: 1px solid rgba(0, 255, 102, 0.30);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 26px;
          position: relative;
        }

        .hexIcon {
          color: #00ff66;
          font-size: 30px;
          font-weight: 950;
          margin-bottom: 8px;
        }

        .hexTitle {
          font-size: 14px;
          font-weight: 950;
        }

        .hexText {
          margin-top: 6px;
          color: #cbd5e1;
          font-size: 11px;
          line-height: 1.35;
        }

        .trailList,
        .rankingList {
          display: grid;
          gap: 12px;
        }

        .trailItem,
        .rankingItem {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 14px;
          align-items: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 22px;
          padding: 15px;
        }

        .trailName,
        .rankName {
          font-weight: 950;
          color: #ffffff;
        }

        .trailMeta,
        .rankMeta {
          color: #94a3b8;
          font-size: 12px;
          margin-top: 4px;
        }

        .xp,
        .rankPoints {
          color: #00ff66;
          font-weight: 950;
          white-space: nowrap;
        }

        .premiumBox {
          margin-top: 20px;
          background:
            linear-gradient(135deg, rgba(0, 255, 102, 0.18), rgba(220, 38, 38, 0.14));
          border: 1px solid rgba(0, 255, 102, 0.24);
          border-radius: 30px;
          padding: 24px;
        }

        .premiumTitle {
          font-size: 24px;
          font-weight: 950;
          letter-spacing: -0.05em;
          margin-bottom: 8px;
        }

        .premiumText {
          color: #cbd5e1;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 18px;
        }

        .cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(0, 255, 102, 0.50);
          background: rgba(0, 255, 102, 0.10);
          color: #00ff66;
          border-radius: 999px;
          padding: 13px 18px;
          font-size: 13px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          text-decoration: none;
        }

        @media (max-width: 980px) {
          .shell {
            grid-template-columns: 1fr;
          }

          .sidebar {
            height: auto;
            position: relative;
            flex-direction: row;
            justify-content: space-between;
            padding: 14px;
          }

          .nav {
            display: flex;
            width: auto;
          }

          .navItem {
            width: 48px;
            height: 48px;
          }

          .content {
            padding: 14px;
          }

          .heroInner,
          .mainGrid {
            grid-template-columns: 1fr;
          }

          .statsGrid,
          .achievements {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 560px) {
          .navItem:nth-child(n+4) {
            display: none;
          }

          .hero {
            border-radius: 28px;
            padding: 20px;
          }

          .heroTitle {
            font-size: 44px;
          }

          .statsGrid,
          .achievements {
            grid-template-columns: 1fr;
          }

          .hexCard {
            clip-path: none;
            border-radius: 24px;
            min-height: auto;
          }

          .panel {
            border-radius: 26px;
            padding: 18px;
          }
        }
      `}</style>

      <div className="shell">
        <aside className="sidebar">
          <div className="sideLogo">
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          </div>

          <nav className="nav" aria-label="Menu premium">
            <a className="navItem active" href="#perfil">P</a>
            <a className="navItem" href="#achievements">A</a>
            <a className="navItem" href="#trilhas">T</a>
            <a className="navItem" href="#ranking">R</a>
            <a className="navItem" href="#premium">+</a>
          </nav>
        </aside>

        <section className="content">
          <section className="hero" id="perfil">
            <div className="heroInner">
              <div>
                <div className="brandRow">
                  <img src="/logo-prussik-display.png" alt="PrussikTrails" />
                  <div className="brandText">Outdoor Gaming Profile</div>
                </div>

                <div className="heroTag">Perfil Premium Demo</div>

                <h1 className="heroTitle">
                  O amanhã pertence aos <span>selvagens.</span>
                </h1>

                <p className="heroText">
                  Uma proposta de perfil premium para o aventureiro PrussikTrails:
                  progressão, conquistas, ranking, comunidade e assinatura em uma
                  experiência visual mais imersiva.
                </p>
              </div>

              <div className="profileCard">
                <div className="avatarWrap">
                  <div className="avatar">SB</div>
                </div>

                <div className="profileName">Sr. Brito</div>
                <div className="profileId">@prussik.pro #0037</div>

                <div className="status">
                  <span className="pulse" />
                  Explorando agora
                </div>
              </div>
            </div>
          </section>

          <section className="statsGrid">
            {stats.map((stat) => (
              <article className="statCard" key={stat.label}>
                <div className="statLabel">{stat.label}</div>
                <div className="statValue">{stat.value}</div>
              </article>
            ))}
          </section>

          <section className="mainGrid">
            <div>
              <section className="panel" id="achievements">
                <div className="panelHeader">
                  <h2 className="panelTitle">Achievements</h2>
                  <span className="panelBadge">Hex Badges</span>
                </div>

                <div className="achievements">
                  {achievements.map((item) => (
                    <article className="hexCard" key={item.title}>
                      <div>
                        <div className="hexIcon">{item.icon}</div>
                        <div className="hexTitle">{item.title}</div>
                        <div className="hexText">{item.text}</div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="premiumBox" id="premium">
                <div className="premiumTitle">Prussik Premium</div>

                <div className="premiumText">
                  Área futura para assinatura: badges exclusivos, ranking avançado,
                  comunidade fechada, histórico expandido, rotas salvas e experiências
                  premium com guias selecionados.
                </div>

                <a className="cta" href="/login">
                  Iniciar expedição
                </a>
              </section>
            </div>

            <div>
              <section className="panel" id="trilhas">
                <div className="panelHeader">
                  <h2 className="panelTitle">Trilhas recentes</h2>
                  <span className="panelBadge">XP ativo</span>
                </div>

                <div className="trailList">
                  {trilhasRecentes.map((trilha) => (
                    <article className="trailItem" key={trilha.nome}>
                      <div>
                        <div className="trailName">{trilha.nome}</div>
                        <div className="trailMeta">
                          {trilha.local} · {trilha.status}
                        </div>
                      </div>

                      <div className="xp">{trilha.xp}</div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel" id="ranking" style={{ marginTop: 20 }}>
                <div className="panelHeader">
                  <h2 className="panelTitle">Ranking</h2>
                  <span className="panelBadge">Temporada 01</span>
                </div>

                <div className="rankingList">
                  {ranking.map((item) => (
                    <article className="rankingItem" key={item.posicao}>
                      <div>
                        <div className="rankName">
                          {item.posicao}. {item.nome}
                        </div>
                        <div className="rankMeta">Pontuação outdoor</div>
                      </div>

                      <div className="rankPoints">{item.pontos}</div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}