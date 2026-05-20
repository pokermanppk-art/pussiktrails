'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export function RegisterForm() {
  const router = useRouter()
  const [tipo, setTipo] = useState<'cliente' | 'guia'>('cliente')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [celular, setCelular] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [instagram, setInstagram] = useState('')
  const [cadastur, setCadastur] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const formatarCpf = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length <= 11) {
      return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14)
    }
    return valor
  }

  const formatarCelular = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length <= 11) {
      return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15)
    }
    return valor
  }

  const formatarCnpj = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length <= 14) {
      return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').slice(0, 18)
    }
    return valor
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    
    console.log('🔍 [REGISTER] Iniciando cadastro...')
    console.log('🔍 [REGISTER] Tipo:', tipo)
    console.log('🔍 [REGISTER] Nome:', nome)
    console.log('🔍 [REGISTER] Email:', email)
    
    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem')
      console.error('❌ [REGISTER] Senhas não coincidem')
      return
    }

    if (senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres')
      console.error('❌ [REGISTER] Senha muito curta')
      return
    }

    setLoading(true)

    const userData: any = {
      nome,
      email,
      cpf: cpf.replace(/\D/g, ''),
      celular: celular.replace(/\D/g, ''),
      data_nascimento: dataNascimento,
      senha,
      tipo,
      status: tipo === 'guia' ? 'pendente' : 'ativo'
    }

    if (tipo === 'guia') {
      userData.instagram = instagram
      userData.cadastur = cadastur
      userData.cnpj = cnpj.replace(/\D/g, '')
    }

    console.log('🔍 [REGISTER] Enviando para Supabase:', { ...userData, senha: '***' })

    try {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()

      if (error) {
        console.error('❌ [REGISTER] Erro do Supabase:', error)
        if (error.code === '23505') {
          setErro('CPF ou e-mail já cadastrado')
        } else {
          setErro(error.message)
        }
        setLoading(false)
        return
      }

      console.log('✅ [REGISTER] Cadastro realizado com sucesso:', data)

      localStorage.setItem('user', JSON.stringify({
        id: data[0].id,
        nome: data[0].nome,
        email: data[0].email,
        tipo: data[0].tipo
      }))

      if (tipo === 'guia') {
        router.push('/guia/dashboard')
      } else {
        router.push('/cliente/dashboard')
      }
    } catch (err: any) {
      console.error('❌ [REGISTER] Erro inesperado:', err)
      setErro(err.message || 'Erro ao cadastrar')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* SELETOR AVENTUREIRO / NAVEGADOR */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        backgroundColor: '#f3f4f6', 
        padding: '6px', 
        borderRadius: '48px',
        marginBottom: '8px'
      }}>
        <button
          type="button"
          onClick={() => setTipo('cliente')}
          style={{
            flex: 1,
            padding: '12px 20px',
            borderRadius: '40px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s',
            backgroundColor: tipo === 'cliente' ? '#16a34a' : 'transparent',
            color: tipo === 'cliente' ? 'white' : '#6b7280',
          }}
        >
          Aventureiro
        </button>
        <button
          type="button"
          onClick={() => setTipo('guia')}
          style={{
            flex: 1,
            padding: '12px 20px',
            borderRadius: '40px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s',
            backgroundColor: tipo === 'guia' ? '#16a34a' : 'transparent',
            color: tipo === 'guia' ? 'white' : '#6b7280',
          }}
        >
          Navegador
        </button>
      </div>

      {/* NOME */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
          Nome completo
        </label>
        <input
          type="text"
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: João Silva"
          style={{
            width: '100%',
            padding: '14px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: '14px',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s',
            backgroundColor: '#fafafa'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#16a34a'
            e.target.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.1)'
            e.target.style.backgroundColor = 'white'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e5e7eb'
            e.target.style.boxShadow = 'none'
            e.target.style.backgroundColor = '#fafafa'
          }}
        />
      </div>

      {/* EMAIL */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
          E-mail
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          style={{
            width: '100%',
            padding: '14px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: '14px',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s',
            backgroundColor: '#fafafa'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#16a34a'
            e.target.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.1)'
            e.target.style.backgroundColor = 'white'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e5e7eb'
            e.target.style.boxShadow = 'none'
            e.target.style.backgroundColor = '#fafafa'
          }}
        />
      </div>

      {/* CPF */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
          CPF
        </label>
        <input
          type="text"
          required
          value={cpf}
          onChange={(e) => setCpf(formatarCpf(e.target.value))}
          placeholder="000.000.000-00"
          maxLength={14}
          style={{
            width: '100%',
            padding: '14px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: '14px',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s',
            backgroundColor: '#fafafa'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#16a34a'
            e.target.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.1)'
            e.target.style.backgroundColor = 'white'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e5e7eb'
            e.target.style.boxShadow = 'none'
            e.target.style.backgroundColor = '#fafafa'
          }}
        />
      </div>

      {/* CELULAR */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
          Celular
        </label>
        <input
          type="tel"
          required
          value={celular}
          onChange={(e) => setCelular(formatarCelular(e.target.value))}
          placeholder="(11) 99999-9999"
          maxLength={15}
          style={{
            width: '100%',
            padding: '14px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: '14px',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s',
            backgroundColor: '#fafafa'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#16a34a'
            e.target.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.1)'
            e.target.style.backgroundColor = 'white'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e5e7eb'
            e.target.style.boxShadow = 'none'
            e.target.style.backgroundColor = '#fafafa'
          }}
        />
      </div>

      {/* DATA DE NASCIMENTO */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
          Data de nascimento
        </label>
        <input
          type="date"
          required
          value={dataNascimento}
          onChange={(e) => setDataNascimento(e.target.value)}
          style={{
            width: '100%',
            padding: '14px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: '14px',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s',
            backgroundColor: '#fafafa',
            color: '#374151'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#16a34a'
            e.target.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.1)'
            e.target.style.backgroundColor = 'white'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e5e7eb'
            e.target.style.boxShadow = 'none'
            e.target.style.backgroundColor = '#fafafa'
          }}
        />
      </div>

      {/* SENHA */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
          Senha
        </label>
        <input
          type="password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="••••••"
          style={{
            width: '100%',
            padding: '14px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: '14px',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s',
            backgroundColor: '#fafafa'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#16a34a'
            e.target.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.1)'
            e.target.style.backgroundColor = 'white'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e5e7eb'
            e.target.style.boxShadow = 'none'
            e.target.style.backgroundColor = '#fafafa'
          }}
        />
      </div>

      {/* CONFIRMAR SENHA */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
          Confirmar senha
        </label>
        <input
          type="password"
          required
          value={confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
          placeholder="••••••"
          style={{
            width: '100%',
            padding: '14px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: '14px',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s',
            backgroundColor: '#fafafa'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#16a34a'
            e.target.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.1)'
            e.target.style.backgroundColor = 'white'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e5e7eb'
            e.target.style.boxShadow = 'none'
            e.target.style.backgroundColor = '#fafafa'
          }}
        />
      </div>

      {/* CAMPOS PARA NAVEGADOR (GUIA) */}
      {tipo === 'guia' && (
        <div style={{ 
          backgroundColor: '#f0fdf4', 
          borderRadius: '20px', 
          padding: '20px',
          marginTop: '4px'
        }}>
          <p style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            color: '#16a34a', 
            marginBottom: '16px'
          }}>
            Informações profissionais
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="Instagram (@usuario)"
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '14px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'white'
              }}
              onFocus={(e) => e.target.style.borderColor = '#16a34a'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
            <input
              type="text"
              value={cadastur}
              onChange={(e) => setCadastur(e.target.value)}
              placeholder="Cadastur (número de registro)"
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '14px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'white'
              }}
              onFocus={(e) => e.target.style.borderColor = '#16a34a'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
            <input
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(formatarCnpj(e.target.value))}
              placeholder="CNPJ"
              maxLength={18}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '14px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'white'
              }}
              onFocus={(e) => e.target.style.borderColor = '#16a34a'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>
        </div>
      )}

      {erro && (
        <div style={{ 
          backgroundColor: '#fee2e2', 
          color: '#dc2626', 
          padding: '14px', 
          borderRadius: '14px', 
          fontSize: '13px',
          textAlign: 'center'
        }}>
          {erro}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          backgroundColor: '#dc2626',
          color: 'white',
          padding: '16px',
          borderRadius: '40px',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '15px',
          fontWeight: '600',
          marginTop: '8px',
          transition: 'all 0.2s',
          opacity: loading ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (!loading) e.currentTarget.style.backgroundColor = '#b91c1c'
        }}
        onMouseLeave={(e) => {
          if (!loading) e.currentTarget.style.backgroundColor = '#dc2626'
        }}
      >
        {loading ? 'Cadastrando...' : 'Cadastrar'}
      </button>

      {/* LINK PARA LOGIN */}
      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <a 
          href="/login" 
          style={{ 
            color: '#6b7280', 
            textDecoration: 'none',
            fontSize: '13px',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#16a34a'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
        >
          Já tem uma conta? Faça login
        </a>
      </div>
    </form>
  )
}