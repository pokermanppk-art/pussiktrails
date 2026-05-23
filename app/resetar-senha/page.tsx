'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import bcrypt from 'bcryptjs'

export default function ResetarSenha() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [tokenValido, setTokenValido] = useState(false)
  const [verificando, setVerificando] = useState(true)

  // Verificar se o token é válido
  useEffect(() => {
    const verificarToken = async () => {
      if (!token) {
        setErro('Token não fornecido')
        setVerificando(false)
        return
      }

      const { data, error } = await supabase
        .from('password_resets')
        .select('usuario_id, expira_em, usado')
        .eq('token', token)
        .single()

      if (error || !data) {
        setErro('Token inválido ou expirado')
        setVerificando(false)
        return
      }

      if (data.usado) {
        setErro('Este token já foi utilizado. Solicite uma nova recuperação.')
        setVerificando(false)
        return
      }

      const agora = new Date()
      const expira = new Date(data.expira_em)
      if (agora > expira) {
        setErro('Token expirado. Solicite uma nova recuperação.')
        setVerificando(false)
        return
      }

      setTokenValido(true)
      setVerificando(false)
    }

    verificarToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (novaSenha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem')
      return
    }

    setCarregando(true)
    setErro('')
    setMensagem('')

    try {
      // Buscar o reset para obter o usuario_id
      const { data: resetData, error: resetError } = await supabase
        .from('password_resets')
        .select('usuario_id')
        .eq('token', token)
        .single()

      if (resetError) {
        throw new Error('Token inválido')
      }

      // 🔐 Gerar hash da nova senha
      const salt = await bcrypt.genSalt(10)
      const senhaHash = await bcrypt.hash(novaSenha, salt)

      // Atualizar a senha do usuário (agora usando senha_hash)
      const { error: updateError } = await supabase
        .from('users')
        .update({ senha_hash: senhaHash })
        .eq('id', resetData.usuario_id)

      if (updateError) {
        throw new Error('Erro ao atualizar senha')
      }

      // Marcar token como usado
      await supabase
        .from('password_resets')
        .update({ usado: true })
        .eq('token', token)

      setMensagem('✅ Senha alterada com sucesso! Redirecionando para o login...')
      setTimeout(() => router.push('/login'), 3000)
    } catch (err: any) {
      setErro(err.message || 'Erro ao redefinir senha')
    } finally {
      setCarregando(false)
    }
  }

  if (verificando) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
          <div style={{ color: '#6b7280' }}>Verificando token...</div>
        </div>
      </div>
    )
  }

  if (!tokenValido) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '24px',
          padding: '40px',
          maxWidth: '450px',
          width: '100%',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', marginBottom: '8px' }}>Token inválido</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>{erro}</p>
          <Link href="/recuperar-senha" style={{ backgroundColor: '#16a34a', color: 'white', padding: '10px 24px', borderRadius: '40px', textDecoration: 'none', display: 'inline-block' }}>
            Solicitar nova recuperação
          </Link>
        </div>
      </div>
    )
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
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔑</div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>Redefinir senha</h1>
            <p style={{ color: '#6b7280', marginTop: '8px', fontSize: '14px' }}>
              Digite sua nova senha
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Nova senha
              </label>
              <input
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Confirmar nova senha
              </label>
              <input
                type="password"
                required
                placeholder="Digite a senha novamente"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                style={inputStyle}
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
              disabled={carregando}
              style={{
                width: '100%',
                backgroundColor: '#16a34a',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '40px',
                border: 'none',
                cursor: carregando ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                opacity: carregando ? 0.6 : 1
              }}
            >
              {carregando ? 'Redefinindo...' : 'Redefinir senha'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Link href="/login" style={{ fontSize: '13px', color: '#16a34a', textDecoration: 'none' }}>
              ← Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  fontSize: '14px',
  outline: 'none',
  transition: 'all 0.2s',
  fontFamily: 'inherit'
}