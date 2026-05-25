'use client'

import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

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
            radial-gradient(circle at 12% 5%, rgba(132, 204, 22, 0.20), transparent 28%),
            radial-gradient(circle at 88% 8%, rgba(251, 146, 60, 0.16), transparent 28%),
            radial-gradient(circle at 50% 100%, rgba(220, 38, 38, 0.10), transparent 34%),
            linear-gradient(180deg, #fffdf7 0%, #f3f5ea 45%, #e9eee0 100%);
          color: #172018;
          overflow-x: hidden;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(255, 253, 247, 0.86);
          backdrop-filter: blur(18px);
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          padding: 12px 18px;
        }

        .headerInner {
          max-width: 1180px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .brand img {
          height: 46px;
          width: auto;
          object-fit: contain;
          display: block;
        }

        .brandText {
          min-width: 0;
        }

        .brandName {
          font-size: 20px;
          font-weight: 950;
          color: #dc2626;
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .brandSub {
          margin-top: 3px;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
        }

        .headerActions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .navButton {
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(255, 255, 255, 0.78);
          color: #172018;
          border-radius: 999px;
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
          white-space: nowrap;
        }

        .navButton:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.10);
        }

        .navButton.primary {
          background: #172018;
          color: #ffffff;
          border-color: #172018;
        }

        .container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 26px 18px 54px;
        }

        .hero {
          min-height: calc(100vh - 145px);
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(340px, 0.92fr);
          gap: 22px;
          align-items: stretch;
        }

        .heroMain {
          position: relative;
          overflow: hidden;
          border-radius: 42px;
          padding: 34px;
          background:
            linear-gradient(135deg, rgba(23, 32, 24, 0.82), rgba(23, 32, 24, 0.40)),
            radial-gradient(circle at top right, rgba(190, 242, 100, 0.28), transparent 34%),
            linear-gradient(135deg, #1f331f 0%, #5f7547 48%, #d7c6a1 100%);
          color: #ffffff;
          box-shadow: 0 28px 70px rgba(23, 32, 24, 0.22);
          min-height: 620px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .heroMain::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: linear-gradient(to bottom, black, transparent);
          pointer-events: none;
        }

        .heroContent {
          position: relative;
          z-index: 2;
        }

        .eyebrow {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: rgba(255, 255, 255, 0.13);
          color: #f7fee7;
          padding: 9px 13px;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          margin-bottom: 18px;
        }

        .heroTitle {
          margin: 0;
          max-width: 760px;
          font-size: clamp(46px, 7vw, 86px);
          line-height: 0.90;
          font-weight: 950;
          letter-spacing: -0.085em;
        }

        .heroTitle span {
          color: #bef264;
          text-shadow: 0 0 28px rgba(190, 242, 100, 0.32);
        }

        .heroText {
          max-width: 640px;
          color: rgba(255, 255, 255, 0.82);
          line-height: 1.65;
          margin: 20px 0 0;
          font-size: 15px;
        }

        .heroActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 26px;
        }

        .cta {
          border: none;
          border-radius: 999px;
          padding: 15px 20px;
          font-size: 13px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 34px rgba(15, 23, 42, 0.20);
        }

        .cta.primary {
          background: #bef264;
          color: #172018;
        }

        .cta.secondary {
          background: rgba(255, 255, 255, 0.13);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.24);
        }

        .heroFooter {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 34px;
        }

        .miniMetric {
          background: rgba(255, 255, 255, 0.13);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 24px;
          padding: 14px;
          backdrop-filter: blur(14px);
        }

        .metricValue {
          font-size: 26px;
          font-weight: 950;
          letter-spacing: -0.06em;
          color: #ffffff;
        }

        .metricLabel {
          margin-top: 3px;
          color: rgba(255, 255, 255, 0.70);
          font-size: 11px;
          font-weight: 850;
          line-height: 1.35;
        }

        .side {
          display: grid;
          gap: 16px;
        }

        .card {
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 34px;
          padding: 22px;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.07);
          overflow: hidden;
        }

        .card.dark {
          background:
            radial-gradient(circle at top right, rgba(132, 204, 22, 0.18), transparent 36%),
            #172018;
          color: #ffffff;
        }

        .cardLabel {
          color: #84cc16;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .card.dark .cardLabel {
          color: #bef264;
        }

        .cardTitle {
          margin: 0;
          color: #172018;
          font-size: 26px;
          line-height: 1.02;
          font-weight: 950;
          letter-spacing: -0.06em;
        }

        .card.dark .cardTitle {
          color: #ffffff;
        }

        .cardText {
          margin: 10px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
          font-weight: 700;
        }

        .card.dark .cardText {
          color: rgba(255, 255, 255, 0.74);
        }

        .journeyList {
          display: grid;
          gap: 10px;
          margin-top: 16px;
        }

        .journeyItem {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          padding: 12px;
          border-radius: 22px;
          background: #fffdf7;
          border: 1px solid rgba(15, 23, 42, 0.06);
        }

        .journeyIcon {
          width: 42px;
          height: 42px;
          border-radius: 17px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0fdf4;
          font-size: 20px;
        }

        .journeyTitle {
          color: #172018;
          font-size: 13px;
          font-weight: 950;
        }

        .journeyText {
          margin-top: 2px;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.4;
        }

        .quote {
          font-size: 30px;
          line-height: 0.98;
          font-weight: 950;
          letter-spacing: -0.065em;
          color: #ffffff;
          margin: 0;
        }

        .quote span {
          color: #bef264;
        }

        .quoteSub {
          color: rgba(255, 255, 255, 0.70);
          font-size: 13px;
          line-height: 1.6;
          font-weight: 700;
          margin-top: 12px;
        }

        .bottomGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
        }

        .feature {
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 30px;
          padding: 20px;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
        }

        .featureIcon {
          width: 46px;
          height: 46px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0fdf4;
          font-size: 21px;
          margin-bottom: 14px;
        }

        .featureTitle {
          color: #172018;
          font-size: 16px;
          font-weight: 950;
          line-height: 1.2;
        }

        .featureText {
          margin-top: 6px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.55;
          font-weight: 700;
        }

        @media (max-width: 980px) {
          .hero {
            grid-template-columns: 1fr;
          }

          .heroMain {
            min-height: auto;
          }

          .bottomGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .header {
            padding: 10px 12px;
          }

          .brandSub {
            display: none;
          }

          .headerActions .desktopOnly {
            display: none;
          }

          .container {
            padding: 16px 12px 42px;
          }

          .heroMain,
          .card,
          .feature {
            border-radius: 28px;
          }

          .heroMain {
            padding: 24px;
          }

          .heroTitle {
            font-size: 48px;
          }

          .heroFooter {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 460px) {
          .brand img {
            height: 38px;
          }

          .brandName {
            font-size: 18px;
          }

          .navButton {
            padding: 9px 12px;
          }

          .heroTitle {
            font-size: 42px;
          }

          .heroActions {
            display: grid;
          }

          .cta {
            width: 100%;
          }

          .quote {
            font-size: 26px;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <div className="brand">
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />

            <div className="brandText">
              <div className="brandName">PrussikTrails</div>
              <div className="brandSub">Aventuras, trilhas e guias reais</div>
            </div>
          </div>

          <div className="headerActions">
            <button
              type="button"
              className="navButton desktopOnly"
              onClick={() => router.push('/roteiros')}
            >
              Explorar
            </button>

            <button
              type="button"
              className="navButton"
              onClick={() => router.push('/login')}
            >
              Entrar
            </button>

            <button
              type="button"
              className="navButton primary"
              onClick={() => router.push('/cadastro')}
            >
              Criar conta
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroMain">
            <div className="heroContent">
              <div className="eyebrow">Sua próxima história começa fora da tela</div>

              <h1 className="heroTitle">
                A jornada começa quando o <span>conforto termina.</span>
              </h1>

              <p className="heroText">
                Encontre trilhas, experiências outdoor e guias preparados para transformar
                um fim de semana comum em uma história que você vai querer contar.
              </p>

              <div className="heroActions">
                <button
                  type="button"
                  className="cta primary"
                  onClick={() => router.push('/cadastro')}
                >
                  Começar minha jornada
                </button>

                <button
                  type="button"
                  className="cta secondary"
                  onClick={() => router.push('/roteiros')}
                >
                  Ver roteiros disponíveis
                </button>
              </div>
            </div>

            <div className="heroFooter">
              <div className="miniMetric">
                <div className="metricValue">01</div>
                <div className="metricLabel">Escolha uma experiência</div>
              </div>

              <div className="miniMetric">
                <div className="metricValue">02</div>
                <div className="metricLabel">Reserve com segurança</div>
              </div>

              <div className="miniMetric">
                <div className="metricValue">03</div>
                <div className="metricLabel">Viva a trilha com guia</div>
              </div>
            </div>
          </div>

          <aside className="side">
            <section className="card dark">
              <div className="cardLabel">Frase da jornada</div>

              <p className="quote">
                Saia do mapa.
                <br />
                Volte com <span>história.</span>
              </p>

              <p className="quoteSub">
                O PrussikTrails conecta pessoas, guias e caminhos para quem quer
                viver mais do que apenas chegar.
              </p>
            </section>

            <section className="card">
              <div className="cardLabel">Como funciona</div>

              <h2 className="cardTitle">
                Simples para o aventureiro. Organizado para o guia.
              </h2>

              <p className="cardText">
                Você encontra o roteiro, reserva, acompanha o pagamento e acessa suas
                informações em uma área própria.
              </p>

              <div className="journeyList">
                <div className="journeyItem">
                  <div className="journeyIcon">🧭</div>
                  <div>
                    <div className="journeyTitle">Descubra</div>
                    <div className="journeyText">Roteiros ativos e experiências outdoor.</div>
                  </div>
                </div>

                <div className="journeyItem">
                  <div className="journeyIcon">🎒</div>
                  <div>
                    <div className="journeyTitle">Reserve</div>
                    <div className="journeyText">Garanta sua vaga de forma direta.</div>
                  </div>
                </div>

                <div className="journeyItem">
                  <div className="journeyIcon">🏅</div>
                  <div>
                    <div className="journeyTitle">Evolua</div>
                    <div className="journeyText">Acompanhe conquistas e histórico.</div>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </section>

        <section className="bottomGrid">
          <article className="feature">
            <div className="featureIcon">🌄</div>
            <div className="featureTitle">Roteiros com alma outdoor</div>
            <div className="featureText">
              Experiências criadas para quem busca ar livre, natureza e presença.
            </div>
          </article>

          <article className="feature">
            <div className="featureIcon">🧗</div>
            <div className="featureTitle">Guias como protagonistas</div>
            <div className="featureText">
              O guia cadastra, organiza e conduz experiências com mais autonomia.
            </div>
          </article>

          <article className="feature">
            <div className="featureIcon">🔥</div>
            <div className="featureTitle">Comunidade em movimento</div>
            <div className="featureText">
              Acompanhe reservas, trilhas quentes, conquistas e novas jornadas.
            </div>
          </article>
        </section>
      </div>
    </main>
  )
}