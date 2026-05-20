'use client'

import { useRouter } from 'next/navigation'

interface HeaderProps {
  onLogout?: () => void
  showLogout?: boolean
  showPerfil?: boolean
  perfilLink?: string
  userNome?: string
  avatarUrl?: string | null
}

export default function Header({ 
  onLogout, 
  showLogout = false, 
  showPerfil = false, 
  perfilLink = '/perfil',
  userNome = '',
  avatarUrl = null
}: HeaderProps) {
  const router = useRouter()

  return (
    <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* LOGO - TEXTO EM PRETO */}
        <div 
          onClick={() => router.push('/')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
        >
          <span style={{ fontSize: '28px' }}>🏔️</span>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>PussikTrails</span>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {userNome && (
            <span style={{ color: '#4b5563', fontWeight: '500' }}>Olá, {userNome}!</span>
          )}

          {showPerfil && (
            <div
              onClick={() => router.push(perfilLink)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                cursor: 'pointer'
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>
                  {userNome?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </div>
          )}

          {showLogout && onLogout && (
            <button
              onClick={onLogout}
              style={{ backgroundColor: '#dc2626', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
            >
              Sair
            </button>
          )}
        </div>
      </div>
    </div>
  )
}