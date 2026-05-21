'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  // Testar conexão com Supabase ao carregar a página
  useEffect(() => {
    const testarConexao = async () => {
      try {
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true })
        if (error) {
          console.error('❌ Erro de conexão com Supabase:', error)
          setErro('Erro de conexão com o servidor')
        } else {
          console.log('✅ Conexão com Supabase OK')
        }
      } catch (err) {
        console.error('❌ Erro ao testar conexão:', err)
      }
    }
    testarConexao()
  }, [])

  // Função para formatar CPF visualmente
  const formatarCPF = (valor: string) => {
    let numeros = valor.replace(/\D/g, '')
    if (numeros.length > 11) numeros = numeros.slice(0, 11)
    
    if (numeros.length <= 3) return numeros
    if (numeros.length <= 6) return `${numeros.slice(0, 3)}.${numeros.slice(3)}`
    if (numeros.length <= 9) return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`
    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9, 11)}`
  }

  // Função untuk extrair apenas os números do CPF
  const extrairNumerosCPF = (cpfFormatado: string) => {
    return cpfFormatado.replace(/\D/g, '')
  }

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarCPF(e.target.value)
    setCpf(valorFormatado)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const cpfLimpo = extrairNumerosCPF(cpf)

    console.log('🔵 Tentando login com CPF:', cpfLimpo)

    try {
      // Verificar se o cliente Supabase está configurado
      if (!supabase) {
        console.error('❌ Supabase não configurado')
        setErro('Erro de configuração do sistema')
        setCarregando(false)
        return
      }

      // Consulta simples primeiro para testar
      const { data: users, error: countError } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })

      console.log('📊 Total de usuários no banco:', countError ? 'Erro' : users)

      if (countError) {
        console.error('❌ Erro ao contar usuários:', countError)
        setErro('Erro ao conectar com o banco de dados')
        setCarregando(false)
        return
      }

      // Buscar usuário pelo CPF
      const { data: user, error } = await supabase
        .from('users')
        .select('id, nome, email, tipo, status, senha, cpf')
        .eq('cpf', cpfLimpo)
        .maybeSingle()

      console.log('🔍 Resultado da busca:', user ? 'Usuário encontrado' : 'Usuário não encontrado')

      if (error) {
        console.error('❌ Erro na consulta:', error)
        setErro(`Erro: ${error.message || 'Erro ao buscar usuário'}`)
        setCarregando(false)
        return
      }

      if (!user) {
        console.log('❌ Usuário não encontrado para CPF:', cpfLimpo)
        setErro('CPF não encontrado')
        setCarregando(false)
        return
      }

      console.log('✅ Usuário encontrado:', user.nome, user.tipo)

      if (user.senha !== senha) {
        setErro('Senha incorreta')
        setCarregando(false)
        return
      }

      if (user.status !== 'ativo') {
        setErro('Usuário inativo')
        setCarregando(false)
        return
      }

      localStorage.setItem('user', JSON.stringify({
        id: user.id,
        nome: user.nome,
        email: user.email,
        tipo: user.tipo,
      }))

      if (user.tipo === 'cliente') {
        router.push('/cliente/dashboard')
      } else if (user.tipo === 'guia') {
        router.push('/guia/dashboard')
      } else {
        router.push('/admin/dashboard')
      }

    } catch (err: any) {
      console.error('❌ Erro no login:', err)
      setErro(`Erro: ${err.message || 'Erro ao fazer login'}`)
    } finally {
      setCarregando(false)
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
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏔️</div>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>PussikTrails</h1>
            <p style={{ color: '#6b7280', marginTop: '8px', fontSize: '14px' }}>Acesse sua conta para continuar</p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                CPF
              </label>
              <input
                type="text"
                required
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleCpfChange}
                maxLength={14}
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

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Senha
              </label>
              <input
                type="password"
                required
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
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
                opacity: carregando ? 0.6 : 1,
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!carregando) e.currentTarget.style.backgroundColor = '#15803d'
              }}
              onMouseLeave={(e) => {
                if (!carregando) e.currentTarget.style.backgroundColor = '#16a34a'
              }}
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            margin: '24px 0',
            color: '#d1d5db'
          }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>ou</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
          </div>

          <Link href="/cadastro" style={{ textDecoration: 'none' }}>
            <button
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                color: '#16a34a',
                padding: '12px 24px',
                borderRadius: '40px',
                border: '1px solid #16a34a',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#16a34a'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#16a34a'
              }}
            >
              Criar nova conta
            </button>
          </Link>

          <p style={{ 
            textAlign: 'center', 
            fontSize: '11px', 
            color: '#9ca3af', 
            marginTop: '24px',
            marginBottom: 0
          }}>
            Ao continuar, você concorda com nossos Termos de Uso
          </p>
        </div>
      </div>
    </div>
  )
}