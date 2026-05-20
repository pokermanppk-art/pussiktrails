'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    window.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      
      {/* NAVBAR */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: isMobile ? '12px 16px' : '16px 20px',
        backgroundColor: scrolled ? 'white' : 'transparent',
        boxShadow: scrolled ? '0 1px 0 rgba(0,0,0,0.05)' : 'none',
        transition: 'all 0.3s ease',
        zIndex: 1000,
        backdropFilter: scrolled ? 'blur(0px)' : 'blur(10px)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <span style={{ fontSize: isMobile ? '24px' : '28px' }}>🏔️</span>
            <span style={{ fontWeight: '600', fontSize: isMobile ? '16px' : '18px', color: '#111827' }}>Prussik Trails</span>
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '80px 16px 40px' : '100px 20px 60px',
        background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)'
      }}>
        <div style={{
          maxWidth: '1100px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? '32px' : '40px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: isMobile ? '16px' : '24px' }}>
              <span style={{
                display: 'inline-block',
                fontSize: isMobile ? '10px' : '12px',
                fontWeight: '500',
                color: '#16a34a',
                backgroundColor: '#f0fdf4',
                padding: '4px 12px',
                borderRadius: '20px'
              }}>
                A PLATAFORMA DE TRILHAS
              </span>
            </div>
            <h1 style={{
              fontSize: isMobile ? '36px' : 'clamp(36px, 8vw, 56px)',
              fontWeight: '700',
              color: '#111827',
              marginBottom: isMobile ? '12px' : '20px',
              lineHeight: 1.2
            }}>
              Sua próxima
              <br />
              aventura começa
              <br />
              <span style={{ color: '#16a34a' }}>aqui.</span>
            </h1>
            <p style={{
              fontSize: isMobile ? '15px' : 'clamp(16px, 4vw, 18px)',
              color: '#6b7280',
              marginBottom: isMobile ? '24px' : '32px',
              lineHeight: 1.5,
              maxWidth: '600px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              Conecte-se com guias locais, explore trilhas incríveis
              e transforme cada passo em uma experiência única.
            </p>
            
            {/* BOTÕES COM LINK */}
            <div style={{ display: 'flex', gap: isMobile ? '12px' : '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                href="/cadastro"
                style={{
                  padding: isMobile ? '12px 24px' : '14px 28px',
                  borderRadius: '48px',
                  border: 'none',
                  backgroundColor: '#16a34a',
                  fontSize: isMobile ? '14px' : '15px',
                  fontWeight: '600',
                  color: 'white',
                  transition: 'all 0.2s',
                  textDecoration: 'none',
                  display: 'inline-block'
                }}
              >
                Começar agora →
              </Link>

              <Link
                href="/roteiros"
                style={{
                  padding: isMobile ? '12px 24px' : '14px 28px',
                  borderRadius: '48px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: 'transparent',
                  fontSize: isMobile ? '14px' : '15px',
                  fontWeight: '500',
                  color: '#374151',
                  transition: 'all 0.2s',
                  textDecoration: 'none',
                  display: 'inline-block'
                }}
              >
                Explorar roteiros
              </Link>
            </div>
          </div>

          {/* CARD DE ESTATÍSTICAS */}
          <div style={{
            backgroundColor: '#f3f4f6',
            borderRadius: isMobile ? '24px' : '32px',
            padding: isMobile ? '24px 16px' : '32px 20px',
            textAlign: 'center',
            border: '1px solid #e5e7eb',
            maxWidth: '500px',
            margin: '0 auto',
            width: '100%'
          }}>
            <div style={{ fontSize: isMobile ? '48px' : '60px', marginBottom: isMobile ? '12px' : '16px' }}>🏔️</div>
            <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '600', color: '#111827', marginBottom: isMobile ? '4px' : '8px' }}>
              +500 trilhas
            </div>
            <div style={{ fontSize: isMobile ? '12px' : '14px', color: '#6b7280', marginBottom: isMobile ? '16px' : '24px' }}>
              em todo o Brasil
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: isMobile ? '16px' : '24px',
              borderTop: '1px solid #e5e7eb',
              paddingTop: isMobile ? '16px' : '20px',
              flexWrap: 'wrap'
            }}>
              <div>
                <div style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: '700', color: '#16a34a' }}>150+</div>
                <div style={{ fontSize: isMobile ? '10px' : '11px', color: '#6b7280' }}>Guias</div>
              </div>
              <div>
                <div style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: '700', color: '#16a34a' }}>2k+</div>
                <div style={{ fontSize: isMobile ? '10px' : '11px', color: '#6b7280' }}>Aventureiros</div>
              </div>
              <div>
                <div style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: '700', color: '#16a34a' }}>5★</div>
                <div style={{ fontSize: isMobile ? '10px' : '11px', color: '#6b7280' }}>Avaliações</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: isMobile ? '48px 16px' : '60px 20px', backgroundColor: '#ffffff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontSize: isMobile ? '24px' : 'clamp(24px, 6vw, 32px)',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '8px'
          }}>
            Por que escolher o Prussik?
          </h2>
          <p style={{ fontSize: isMobile ? '12px' : '14px', color: '#6b7280', marginBottom: isMobile ? '28px' : '40px' }}>
            Tudo que você precisa para uma experiência completa
          </p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: isMobile ? '16px' : '20px'
          }}>
            {[
              { icon: '🗺️', title: 'Roteiros Curados', desc: 'Trilhas selecionadas pelos melhores guias locais' },
              { icon: '🏅', title: 'Gamificação', desc: 'Desbloqueie medalhas e conquiste novos níveis' },
              { icon: '📸', title: 'Memórias', desc: 'Compartilhe fotos e inspire outros aventureiros' },
              { icon: '🔒', title: 'Segurança', desc: 'Pagamentos seguros e guias certificados' }
            ].map((feature, idx) => (
              <div key={idx} style={{
                padding: isMobile ? '20px 16px' : '24px 20px',
                backgroundColor: '#f9fafb',
                borderRadius: '20px',
                border: '1px solid #f3f4f6',
                transition: 'transform 0.2s'
              }}>
                <div style={{ fontSize: isMobile ? '36px' : '40px', marginBottom: isMobile ? '10px' : '12px' }}>{feature.icon}</div>
                <h3 style={{ fontSize: isMobile ? '15px' : '16px', fontWeight: '600', color: '#111827', marginBottom: '6px' }}>{feature.title}</h3>
                <p style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid #e5e7eb',
        padding: isMobile ? '24px 16px' : '30px 20px',
        backgroundColor: '#fafafa',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: isMobile ? '16px' : '0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🏔️</span>
            <span style={{ fontWeight: '500', fontSize: '12px', color: '#6b7280' }}>© 2026 Prussik Trails</span>
          </div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href="#" style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'none' }}>Termos</a>
            <a href="#" style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'none' }}>Privacidade</a>
            <a href="#" style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'none' }}>Ajuda</a>
          </div>
        </div>
      </footer>
    </div>
  )
}