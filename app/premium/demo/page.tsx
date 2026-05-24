'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

// Componentes de ícone SVG internos (sem dependências externas)
const IconMountain = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
  </svg>
)

const IconFootprints = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/>
    <path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/>
  </svg>
)

const IconCamera = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
    <circle cx="12" cy="13" r="3"/>
  </svg>
)

const IconStar = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)

const IconCalendar = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

const IconTrophy = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
  </svg>
)

const IconTrendingUp = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="23 6 13.5 15.5 8 10 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
)

const IconAward = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="8" r="6"/>
    <path d="M5.5 18L8 14M18.5 18L16 14"/>
    <path d="M12 22v-8"/>
    <path d="M8 22h8"/>
  </svg>
)

const IconLock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const IconSparkles = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 3L14 8L19 10L14 12L12 17L10 12L5 10L10 8L12 3Z"/>
    <path d="M19 4L20 7L23 8L20 9L19 12L18 9L15 8L18 7L19 4Z"/>
  </svg>
)

const IconHeart = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
)

const IconMapPin = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)

const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

export default function PremiumDemo() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [animando, setAnimando] = useState(false)
  const [periodo, setPeriodo] = useState('ALL_TIME')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleTestarPremium = () => {
    setAnimando(true)
    setTimeout(() => {
      setAnimando(false)
      alert('🚀 Em breve! Assine o Premium para acessar todos os recursos.\n\nBenefícios:\n• Estatísticas avançadas\n• Layout exclusivo\n• Ícones personalizados\n• Filtros por período\n• Medalhas especiais\n• E muito mais!')
    }, 1000)
  }

  const periodos = [
    { id: 'ALL_TIME', label: 'ALL TIME' },
    { id: 'MONTH', label: 'MÊS' },
    { id: 'WEEK', label: 'SEMANA' },
    { id: 'TODAY', label: 'HOJE' }
  ]

  const medalhas = [
    { nome: 'Trilhas', icone: <IconMountain />, valor: 47, meta: 100, cor: '#10b981' },
    { nome: 'KM', icone: <IconFootprints />, valor: 1250, meta: 5000, cor: '#3b82f6' },
    { nome: 'Fotos', icone: <IconCamera />, valor: 89, meta: 200, cor: '#ec4899' },
    { nome: 'Avaliações', icone: <IconStar />, valor: 34, meta: 100, cor: '#fbbf24' },
    { nome: 'Reservas', icone: <IconCalendar />, valor: 12, meta: 50, cor: '#8b5cf6' },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
      <style jsx global>{`
        @keyframes glow {
          0% { box-shadow: 0 0 5px rgba(139, 92, 246, 0.3); }
          100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.6); }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-5px); }
        }
        .premium-card {
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .premium-card:hover {
          animation: float 0.3s ease forwards;
          filter: brightness(1.05);
        }
        .glow-effect {
          animation: glow 1.5s ease-in-out infinite alternate;
        }
      `}</style>

      {/* HEADER */}
      <div style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="glow-effect" style={{ color: '#fbbf24' }}>
              <IconSparkles />
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fbbf24', margin: 0 }}>PussikTrails</h1>
              <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8' }}>Experiência Premium</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#334155', padding: '4px 12px', borderRadius: '40px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'white' }}>
                  {user.nome?.charAt(0) || 'U'}
                </div>
                <span style={{ fontSize: '12px', color: '#cbd5e1' }}>{user.nome || user.email}</span>
              </div>
            )}
            <button onClick={() => router.push('/cliente/dashboard')} style={{ backgroundColor: '#334155', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '40px', cursor: 'pointer', fontSize: '12px' }}>← Dashboard</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 16px' }}>
        
        {/* BANNER PREMIUM */}
        <div className="premium-card" style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', borderRadius: '28px', padding: '32px 24px', marginBottom: '32px', textAlign: 'center', color: 'white' }}>
          <div style={{ display: 'inline-block', marginBottom: '16px', color: '#fbbf24' }}>
            <IconTrophy />
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: 'bold', marginBottom: '8px' }}>Plano Premium</h2>
          <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '24px', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
            Desbloqueie uma experiência completa com estatísticas avançadas, medalhas exclusivas e design personalizado
          </p>
          <button
            onClick={handleTestarPremium}
            disabled={animando}
            style={{
              backgroundColor: 'white',
              color: '#8b5cf6',
              border: 'none',
              padding: '12px 32px',
              borderRadius: '40px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              opacity: animando ? 0.7 : 1
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {animando ? '🚀 Processando...' : '⭐ Tornar-se Premium'}
          </button>
          <p style={{ fontSize: '11px', marginTop: '16px', opacity: 0.7 }}>A partir de R$ 9,90/mês • Cancele quando quiser</p>
        </div>

        {/* CARDS DE ESTATÍSTICAS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
          <div className="premium-card" style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '20px', textAlign: 'center' }}>
            <div style={{ color: '#10b981', marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
              <IconTrendingUp />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>1.250</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>KM percorridos</div>
          </div>
          <div className="premium-card" style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '20px', textAlign: 'center' }}>
            <div style={{ color: '#fbbf24', marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
              <IconTrophy />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fbbf24' }}>47</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Medalhas conquistadas</div>
          </div>
        </div>

        {/* SELETOR DE PERÍODO */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '12px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', gap: '8px', flexWrap: 'wrap' }}>
            {periodos.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                style={{
                  backgroundColor: periodo === p.id ? '#8b5cf6' : '#334155',
                  color: periodo === p.id ? 'white' : '#cbd5e1',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '40px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* MEDALHAS PREMIUM */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '24px', padding: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
            <div style={{ color: '#fbbf24' }}><IconAward /></div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: 0 }}>Medalhas Especiais</h3>
            <div style={{ marginLeft: 'auto', color: '#94a3b8' }}><IconLock /></div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'space-around' }}>
            {medalhas.map((medalha, idx) => {
              const progresso = Math.min(100, (medalha.valor / medalha.meta) * 100)
              const nivelCor = progresso >= 100 ? '#fbbf24' : progresso >= 50 ? '#94a3b8' : '#cd7f32'
              
              return (
                <div key={idx} className="premium-card" style={{ textAlign: 'center', width: '90px' }}>
                  <div style={{ 
                    backgroundColor: progresso >= 100 ? '#fbbf2420' : '#334155', 
                    borderRadius: '50%', 
                    width: '64px', 
                    height: '64px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginBottom: '8px',
                    border: progresso >= 100 ? '2px solid #fbbf24' : 'none',
                    color: medalha.cor
                  }}>
                    {medalha.icone}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'white' }}>{medalha.nome}</div>
                  <div style={{ fontSize: '9px', color: '#94a3b8' }}>{medalha.valor}/{medalha.meta}</div>
                  <div style={{ backgroundColor: '#334155', borderRadius: '10px', height: '3px', marginTop: '8px', overflow: 'hidden' }}>
                    <div style={{ width: `${progresso}%`, backgroundColor: medalha.cor, height: '100%', borderRadius: '10px' }} />
                  </div>
                  <div style={{ fontSize: '8px', color: nivelCor, marginTop: '4px' }}>
                    {progresso >= 100 ? '🏆 OURO' : progresso >= 50 ? '🥈 PRATA' : '🥉 BRONZE'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* PRÓXIMAS AVENTURAS */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '24px', padding: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <div style={{ color: '#fbbf24' }}><IconCalendar /></div>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', margin: 0 }}>Próximas Aventuras</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#0f172a', padding: '12px', borderRadius: '16px' }}>
              <div style={{ color: '#10b981' }}><IconMapPin /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'white' }}>Trilha da Pedra do Lagarto</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>25 de Maio, 2026 • 8km</div>
              </div>
              <div style={{ color: '#94a3b8' }}><IconChevronRight /></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#0f172a', padding: '12px', borderRadius: '16px' }}>
              <div style={{ color: '#10b981' }}><IconMapPin /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'white' }}>Cachoeira do Salto</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>15 de Junho, 2026 • 5km</div>
              </div>
              <div style={{ color: '#94a3b8' }}><IconChevronRight /></div>
            </div>
          </div>
        </div>

        {/* BENEFÍCIOS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div className="premium-card" style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '20px' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>📊</div>
            <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Estatísticas Avançadas</h4>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>Gráficos e análises detalhadas da sua evolução</p>
          </div>
          <div className="premium-card" style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '20px' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>🎨</div>
            <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Design Exclusivo</h4>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>Layout premium com ícones e animações</p>
          </div>
          <div className="premium-card" style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '20px' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>🏆</div>
            <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Badges Exclusivas</h4>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>Medalhas especiais para assinantes</p>
          </div>
          <div className="premium-card" style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '20px' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>🔔</div>
            <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Alertas Prioritários</h4>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>Receba notificações sobre novas trilhas</p>
          </div>
        </div>

        {/* CTA FINAL */}
        <div className="premium-card" style={{ textAlign: 'center', padding: '32px', backgroundColor: '#1e293b', borderRadius: '28px' }}>
          <div style={{ display: 'inline-block', marginBottom: '16px', color: '#ec4899' }}>
            <IconHeart />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Faça parte do Clube Premium</h3>
          <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '14px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
            Seja um apoiador e tenha acesso a recursos exclusivos enquanto ajuda a plataforma a crescer
          </p>
          <button
            onClick={handleTestarPremium}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              color: 'white',
              border: 'none',
              padding: '14px 32px',
              borderRadius: '40px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            🔥 Quero ser Premium
          </button>
        </div>
      </div>
    </div>
  )
}