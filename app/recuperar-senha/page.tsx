'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RecuperarSenha() {
  const router = useRouter()
  const [identificador, setIdentificador] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  const formatarCPF = (valor: string) => {
    let numeros = valor.replace(/\D/g, '')
    if (numeros.length > 11) numeros = numeros.slice(0, 11)
    if (numeros.length <= 3) return numeros
    if (numeros.length <= 6) return `${numeros.slice(0, 3)}.${numeros.slice(3)}`
    if (numeros.length <= 9) return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`
    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9, 11)}`
  }

  const handleIdentificadorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor = e.target.value
    // Se parecer com CPF (11 dígitos), formata
    if (valor.replace(/\D/g, '').length <= 11 && /^\d+$/.test(valor.replace(/\D/g, ''))) {
      valor = formatarCPF(valor)
    }
    setIdentificador(valor)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    setMensagem('')
    setErro('')

    try {
      const response = await fetch('/api/recuperar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificador })
      })

      const data = await response.json()

      if (response.ok) {
        setMensagem(data.message || 'E-mail enviado! Verifique sua caixa de entrada.')
        setTimeout(() => router.push('/login'), 5000)
      } else {
        setErro(data.error || 'Erro ao processar solicitação')
      }
    } catch (err) {
      setErro('Erro ao conectar com o servidor')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '24px',
          padding: '40px',
          maxWidth: '450px',
          width: '100%',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>Recuperar senha</h1>
            <p style={{ color: '#6b7280', marginTop: '8px', fontSize: '14px' }}>
              Digite seu CPF ou e-mail cadastrado
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                CPF ou E-mail
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 000.000.000-00 ou seu@email.com"
                value={identificador}
                onChange={handleIdentificadorChange}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#16a34a'
                  e.target.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            {erro && (
              <div style={{
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                padding: '12px',
                borderRadius: '12px',
                fontSize: '13px',
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                {erro}
              </div>
            )}

            {mensagem && (
              <div style={{
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                padding: '12px',
                borderRadius: '12px',
                fontSize: '13px',
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                {mensagem}
              </div>
            )}

            <button
              type="submit"
              disabled={enviando}
              style={{
                width: '100%',
                backgroundColor: '#16a34a',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '40px',
                border: 'none',
                cursor: enviando ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                opacity: enviando ? 0.6 : 1,
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!enviando) e.currentTarget.style.backgroundColor = '#15803d'
              }}
              onMouseLeave={(e) => {
                if (!enviando) e.currentTarget.style.backgroundColor = '#16a34a'
              }}
            >
              {enviando ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Link href="/login" style={{ fontSize: '13px', color: '#16a34a', textDecoration: 'none' }}>
              ← Voltar para o login
            </Link>
          </div>

          <p style={{
            textAlign: 'center',
            fontSize: '11px',
            color: '#9ca3af',
            marginTop: '32px',
            marginBottom: 0
          }}>
            Você receberá um e‑mail com um link para redefinir sua senha. O link é válido por 1 hora.
          </p>
        </div>
      </div>
    </div>
  )
}