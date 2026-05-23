'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

export default function RecuperarSenha() {
  const router = useRouter()
  const [identificador, setIdentificador] = useState('') // CPF ou e‑mail
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

  const extrairNumeros = (valor: string) => valor.replace(/\D/g, '')

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    setMensagem('')
    setErro('')

    // Se o identificador parecer um CPF (apenas números ou formatado)
    const isCPF = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(identificador) || /^\d{11}$/.test(identificador)
    const valorBusca = isCPF ? extrairNumeros(identificador) : identificador

    try {
      let user
      if (isCPF) {
        const { data } = await supabase
          .from('users')
          .select('id, email, nome')
          .eq('cpf', valorBusca)
          .maybeSingle()
        user = data
      } else {
        const { data } = await supabase
          .from('users')
          .select('id, email, nome')
          .eq('email', valorBusca)
          .maybeSingle()
        user = data
      }

      if (!user) {
        setErro('Nenhum usuário encontrado com esse CPF ou e‑mail.')
        setEnviando(false)
        return
      }

      // 🔁 Aqui você pode integrar com um serviço real de e‑mail (ex: Resend, Nodemailer)
      // Por enquanto, apenas simulamos o envio.
      console.log('Enviar link de recuperação para:', user.email)

      // Simulação de sucesso
      setMensagem(`✅ Um link de recuperação foi enviado para ${user.email}. Verifique sua caixa de entrada.`)
      setTimeout(() => router.push('/login'), 4000)
    } catch (err: any) {
      setErro('Erro ao processar solicitação. Tente novamente.')
      console.error(err)
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
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>Esqueci minha senha</h1>
            <p style={{ color: '#6b7280', marginTop: '8px', fontSize: '14px' }}>
              Digite seu CPF ou e‑mail para receber as instruções
            </p>
          </div>

          <form onSubmit={handleEnviar}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                CPF ou E‑mail
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 000.000.000-00 ou seu@email.com"
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
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
            Você receberá um e‑mail com instruções para redefinir sua senha.
          </p>
        </div>
      </div>
    </div>
  )
}