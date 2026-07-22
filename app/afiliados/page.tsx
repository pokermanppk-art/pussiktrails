'use client'

import { useRouter } from 'next/navigation'

const LOGO_SRC = '/logo-login-montanha-prussik.jpg?v=20260528'

export default function AffiliatePortalPage() {
  const router = useRouter()

  return (
    <main className="affiliateLanding">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #f8fafc; }
        .affiliateLanding {
          min-height: 100vh;
          min-height: 100dvh;
          padding: 28px 18px;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 8% 0%, rgba(34, 197, 94, .16), transparent 30%),
            radial-gradient(circle at 92% 8%, rgba(134, 239, 172, .13), transparent 28%),
            linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
          color: #0f172a;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .shell {
          width: min(1120px, 100%);
          display: grid;
          grid-template-columns: 1.12fr .88fr;
          border-radius: 36px;
          overflow: hidden;
          background: rgba(255,255,255,.94);
          border: 1px solid rgba(15,23,42,.08);
          box-shadow: 0 28px 80px rgba(15,23,42,.15);
        }
        .hero {
          min-height: 650px;
          padding: 54px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background:
            linear-gradient(145deg, rgba(15,23,42,.98), rgba(30,41,59,.96)),
            radial-gradient(circle at 20% 0%, rgba(34,197,94,.35), transparent 34%);
          color: white;
        }
        .brand { display: flex; align-items: center; gap: 14px; }
        .logoBox {
          width: 150px; height: 78px; overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          border-radius: 18px; background: rgba(255,255,255,.92);
        }
        .logoBox img { width: 150px; height: 150px; object-fit: contain; transform: scale(1.45); }
        .brandText small { display: block; color: #86efac; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
        .brandText strong { display: block; margin-top: 4px; font-size: 18px; }
        h1 { margin: 28px 0 18px; max-width: 650px; font-size: clamp(42px, 6vw, 72px); line-height: .96; letter-spacing: -.065em; }
        .hero p { margin: 0; max-width: 630px; color: #cbd5e1; font-size: 18px; line-height: 1.65; }
        .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 34px; }
        .feature { padding: 18px; border-radius: 20px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.06); }
        .feature strong { display: block; margin-bottom: 7px; color: #86efac; }
        .feature span { color: #cbd5e1; font-size: 13px; line-height: 1.45; }
        .panel { padding: 54px 44px; display: flex; flex-direction: column; justify-content: center; }
        .eyebrow { margin: 0 0 10px; color: #16a34a; text-transform: uppercase; letter-spacing: .12em; font-size: 12px; font-weight: 950; }
        .panel h2 { margin: 0; font-size: 36px; line-height: 1.03; letter-spacing: -.05em; }
        .panelText { margin: 16px 0 28px; color: #64748b; line-height: 1.65; }
        .actions { display: grid; gap: 13px; }
        button { border: 0; border-radius: 999px; padding: 16px 18px; font-size: 16px; font-weight: 950; cursor: pointer; transition: .2s ease; }
        .primary { background: #22c55e; color: #052e16; box-shadow: 0 14px 30px rgba(34,197,94,.22); }
        .primary:hover { transform: translateY(-1px); background: #16a34a; color: white; }
        .secondary { background: white; color: #0f172a; border: 1.5px solid #cbd5e1; }
        .secondary:hover { border-color: #22c55e; background: #f0fdf4; }
        .note { margin: 24px 0 0; padding: 16px; border-radius: 18px; background: #f8fafc; color: #64748b; font-size: 13px; line-height: 1.55; border: 1px solid #e2e8f0; }
        @media (max-width: 900px) {
          .shell { grid-template-columns: 1fr; }
          .hero { min-height: auto; padding: 34px 26px; }
          .features { grid-template-columns: 1fr; }
          .panel { padding: 38px 24px 42px; }
        }
      `}</style>

      <section className="shell">
        <div className="hero">
          <div>
            <div className="brand">
              <div className="logoBox">
                <img src={LOGO_SRC} alt="PrussikTrails" />
              </div>
              <div className="brandText">
                <small>Área exclusiva</small>
                <strong>Portal de Afiliados</strong>
              </div>
            </div>

            <h1>Conecte bons guias a novas aventuras.</h1>
            <p>
              Pré-cadastre guias, gere convites individuais e acompanhe cada etapa
              da indicação com rastreabilidade e segurança.
            </p>
          </div>

          <div className="features">
            <div className="feature">
              <strong>Indicação comprovável</strong>
              <span>Nome, telefone, e-mail e Cadastur opcional antes do cadastro do guia.</span>
            </div>
            <div className="feature">
              <strong>Convite individual</strong>
              <span>Link exclusivo com validade e vínculo automático ao cadastro.</span>
            </div>
            <div className="feature">
              <strong>Comissões futuras</strong>
              <span>Estrutura preparada para receitas sobre vendas elegíveis.</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <p className="eyebrow">PrussikTrails</p>
          <h2>Acesse sua área de crescimento.</h2>
          <p className="panelText">
            O cadastro de afiliado é separado da conta principal e passa por análise
            administrativa antes da liberação das indicações.
          </p>

          <div className="actions">
            <button className="primary" onClick={() => router.push('/afiliados/login')}>
              Entrar no Portal
            </button>
            <button className="secondary" onClick={() => router.push('/afiliados/cadastro')}>
              Solicitar cadastro de afiliado
            </button>
          </div>

          <p className="note">
            Você pode continuar sendo cliente ou guia normalmente. O Portal de
            Afiliados é uma área adicional e exclusiva.
          </p>
        </div>
      </section>
    </main>
  )
}
