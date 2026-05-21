'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Mountain, Footprints, Camera, Star, CalendarDays, Trophy, TrendingUp, Award, Sparkles, Lock } from 'lucide-react'

export default function PremiumDemo() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [animando, setAnimando] = useState(false)

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
      alert('🚀 Em breve! Assine o Premium para acessar todos os recursos.\n\nBenefícios:\n• Estatísticas avançadas\n• Layout exclusivo\n• Ícones personalizados\n• Filtros por período\n• E muito mais!')
    }, 1000)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
      <style jsx global>{`
        @keyframes glow {
          0% { box-shadow: 0 0 5px rgba(139, 92, 246, 0.5); }
          100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.8); }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-5px); }
        }
        .premium-card:hover {
          animation: float 0.3s ease forwards;
        }
      `}</style>

      {/* HEADER */}
      <div style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Sparkles size={24} color="#fbbf24" />
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fbbf24', margin: 0 }}>PussikTrails PREMIUM</h1>
          </div>
          <button onClick={() => router.back()} style={{ backgroundColor: '#334155', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '40px', cursor: 'pointer', fontSize: '12px' }}>← Voltar</button>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 16px' }}>
        
        {/* BANNER PREMIUM */}
        <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', borderRadius: '24px', padding: '32px 24px', marginBottom: '32px', textAlign: 'center', color: 'white' }}>
          <Sparkles size={48} style={{ marginBottom: '16px', display: 'inline-block' }} />
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Experiência Premium</h2>
          <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '24px' }}>Estatísticas avançadas, layout exclusivo e muito mais</p>
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
            {animando ? '🚀 Processando...' : '⭐ Testar Premium Agora'}
          </button>
        </div>

        {/* CARDS DE ESTATÍSTICAS (estilo Ingress) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
          <div className="premium-card" style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '20px', textAlign: 'center', transition: 'all 0.2s' }}>
            <TrendingUp size={32} color="#10b981" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>1.250</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>KM percorridos</div>
          </div>
          <div className="premium-card" style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '20px', textAlign: 'center', transition: 'all 0.2s' }}>
            <Trophy size={32} color="#fbbf24" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fbbf24' }}>47</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Medalhas</div>
          </div>
        </div>

        {/* SELETOR DE PERÍODO (estilo Ingress) */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '16px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', gap: '8px' }}>
            {['ALL TIME', 'MONTH', 'WEEK', 'TODAY'].map((periodo) => (
              <button key={periodo} style={{ backgroundColor: '#334155', color: '#cbd5e1', border: 'none', padding: '8px 16px', borderRadius: '40px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                {periodo}
              </button>
            ))}
          </div>
        </div>

        {/* MEDALHAS PREMIUM (com ícones SVG) */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Award size={24} color="#fbbf24" />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: 0 }}>Medalhas Premium</h3>
            <Lock size={16} color="#94a3b8" style={{ marginLeft: 'auto' }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
            {[
              { nome: 'Trilhas', icone: Mountain, valor: 47, meta: 100, cor: '#10b981' },
              { nome: 'KM', icone: Footprints, valor: 1250, meta: 5000, cor: '#3b82f6' },
              { nome: 'Fotos', icone: Camera, valor: 89, meta: 200, cor: '#ec4899' },
              { nome: 'Avaliações', icone: Star, valor: 34, meta: 100, cor: '#fbbf24' },
              { nome: 'Reservas', icone: CalendarDays, valor: 12, meta: 50, cor: '#8b5cf6' },
            ].map((medalha, idx) => {
              const Icon = medalha.icone
              const progresso = (medalha.valor / medalha.meta) * 100
              return (
                <div key={idx} style={{ textAlign: 'center', width: '80px' }}>
                  <div style={{ backgroundColor: '#334155', borderRadius: '50%', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                    <Icon size={32} color={medalha.cor} />
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'white' }}>{medalha.nome}</div>
                  <div style={{ fontSize: '9px', color: '#94a3b8' }}>{medalha.valor}/{medalha.meta}</div>
                  <div style={{ backgroundColor: '#334155', borderRadius: '10px', height: '3px', marginTop: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${progresso}%`, backgroundColor: medalha.cor, height: '100%' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* BENEFÍCIOS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '20px' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>📊</div>
            <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Estatísticas Avançadas</h4>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>Gráficos, comparações e análises detalhadas da sua jornada</p>
          </div>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '20px' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>🎨</div>
            <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Layout Exclusivo</h4>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>Design premium com ícones SVG e animações suaves</p>
          </div>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '20px' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>📅</div>
            <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Filtros por Período</h4>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>Veja seu progresso na semana, mês ou todos os tempos</p>
          </div>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '20px' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>🏆</div>
            <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Badges Exclusivas</h4>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>Desbloqueie medalhas especiais apenas para assinantes</p>
          </div>
        </div>

        {/* CTA FINAL */}
        <div style={{ textAlign: 'center', marginTop: '48px', padding: '32px', backgroundColor: '#1e293b', borderRadius: '24px' }}>
          <p style={{ color: '#94a3b8', marginBottom: '16px', fontSize: '14px' }}>
            Esta é uma demonstração do que está por vir
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
              cursor: 'pointer'
            }}
          >
            🔥 Assine o Premium em breve
          </button>
        </div>
      </div>
    </div>
  )
}