'use client'

import { RegisterForm } from '@/components/RegisterForm'

export default function CadastroPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f3f4f6', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
    }}>
      <div style={{ 
        maxWidth: '560px', 
        margin: '0 auto', 
        padding: '40px 24px', 
        width: '100%', 
        display: 'flex', 
        justifyContent: 'center' 
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '28px', 
          padding: '40px 32px', 
          width: '100%',
          boxShadow: '0 20px 40px -12px rgba(0,0,0,0.15)',
        }}>
          
          {/* TÍTULO SIMPLES */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ 
              fontSize: '26px', 
              fontWeight: 'bold', 
              color: '#dc2626', 
              margin: 0,
              letterSpacing: '-0.5px'
            }}>
              Criar conta
            </h1>
            <p style={{ color: '#6b7280', marginTop: '6px', fontSize: '13px' }}>
              e começar a sua jornada
            </p>
          </div>

          {/* FORMULÁRIO */}
          <RegisterForm />
        </div>
      </div>
    </div>
  )
}