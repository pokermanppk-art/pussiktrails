'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

export default function CadastroPage() {
  const router = useRouter()
  const [tipo, setTipo] = useState('cliente')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [celular, setCelular] = useState('')
  const [cpf, setCpf] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [instagram, setInstagram] = useState('')
  const [cadastur, setCadastur] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const formatarCPF = (valor: string) => {
    let numeros = valor.replace(/\D/g, '')
    if (numeros.length > 11) numeros = numeros.slice(0, 11)
    if (numeros.length <= 3) return numeros
    if (numeros.length <= 6) return `${numeros.slice(0, 3)}.${numeros.slice(3)}`
    if (numeros.length <= 9) return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`
    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9, 11)}`
  }

  const formatarCelular = (valor: string) => {
    let numeros = valor.replace(/\D/g, '')
    if (numeros.length > 11) numeros = numeros.slice(0, 11)
    if (numeros.length <= 2) return numeros
    if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setSucesso('')
    setCarregando(true)

    if (senha !== confirmarSenha) {
      setErro('As senhas não conferem')
      setCarregando(false)
      return
    }

    if (!dataNascimento) {
      setErro('Data de nascimento é obrigatória')
      setCarregando(false)
      return
    }

    const cpfLimpo = cpf.replace(/\D/g, '')
    const celularLimpo = celular.replace(/\D/g, '')
    const instagramLimpo = instagram.replace('@', '').trim()
    const cnpjLimpo = cnpj.replace(/\D/g, '')

    const dadosBase = {
      nome,
      email,
      celular: celularLimpo,
      cpf: cpfLimpo,
      data_nascimento: dataNascimento,
      senha,
      tipo,
      status: tipo === 'cliente' ? 'ativo' : 'pendente',
      created_at: new Date().toISOString(),
    }

    const dadosGuia = tipo === 'guia' ? {
      instagram: instagramLimpo,
      cadastur,
      cnpj: cnpjLimpo,
    } : {}

    const dadosCompletos = { ...dadosBase, ...dadosGuia }

    try {
      const { error } = await supabase
        .from('users')
        .insert([dadosCompletos])

      if (error) {
        if (error.message.includes('duplicate key')) {
          setErro('CPF, e-mail ou celular já cadastrado')
        } else {
          setErro(error.message)
        }
        setCarregando(false)
        return
      }

      setSucesso('Cadastro realizado com sucesso! Redirecionando...')
      setTimeout(() => router.push('/login'), 2000)

    } catch (err: any) {
      setErro(err.message || 'Erro ao cadastrar')
      setCarregando(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', maxWidth: '450px', width: '100%', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏔️</div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>PussikTrails</h1>
          <p style={{ color: '#6b7280', marginTop: '8px', fontSize: '14px' }}>Crie sua conta</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <button type="button" onClick={() => setTipo('cliente')} style={{ flex: 1, padding: '10px', borderRadius: '40px', border: 'none', cursor: 'pointer', fontWeight: '600', backgroundColor: tipo === 'cliente' ? '#16a34a' : '#f3f4f6', color: tipo === 'cliente' ? 'white' : '#374151' }}>Aventureiro</button>
            <button type="button" onClick={() => setTipo('guia')} style={{ flex: 1, padding: '10px', borderRadius: '40px', border: 'none', cursor: 'pointer', fontWeight: '600', backgroundColor: tipo === 'guia' ? '#16a34a' : '#f3f4f6', color: tipo === 'guia' ? 'white' : '#374151' }}>Guia</button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Nome completo *</label>
            <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#16a34a'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>E-mail *</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#16a34a'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Celular *</label>
            <input type="tel" required placeholder="(11) 99999-9999" value={celular} onChange={(e) => setCelular(formatarCelular(e.target.value))} maxLength={15} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#16a34a'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>CPF *</label>
            <input type="text" required placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(formatarCPF(e.target.value))} maxLength={14} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#16a34a'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Data de nascimento *</label>
            <input type="date" required value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#16a34a'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Senha *</label>
            <input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#16a34a'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Confirmar senha *</label>
            <input type="password" required value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#16a34a'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          {tipo === 'guia' && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Instagram *</label>
                <input type="text" required placeholder="@usuario" value={instagram} onChange={(e) => setInstagram(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#16a34a'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Cadastur *</label>
                <input type="text" required value={cadastur} onChange={(e) => setCadastur(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#16a34a'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>CNPJ *</label>
                <input type="text" required placeholder="00.000.000/0000-00" value={cnpj} onChange={(e) => setCnpj(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#16a34a'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} />
              </div>
            </>
          )}

          {erro && <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '12px', fontSize: '13px', textAlign: 'center', marginBottom: '16px' }}>{erro}</div>}
          {sucesso && <div style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '12px', borderRadius: '12px', fontSize: '13px', textAlign: 'center', marginBottom: '16px' }}>{sucesso}</div>}

          <button type="submit" disabled={carregando} style={{ width: '100%', backgroundColor: '#16a34a', color: 'white', padding: '14px', borderRadius: '40px', border: 'none', cursor: carregando ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: '600', opacity: carregando ? 0.6 : 1 }} onMouseEnter={(e) => { if (!carregando) e.currentTarget.style.backgroundColor = '#15803d' }} onMouseLeave={(e) => { if (!carregando) e.currentTarget.style.backgroundColor = '#16a34a' }}>{carregando ? 'Cadastrando...' : 'Cadastrar'}</button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '24px 0' }}><div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} /><span style={{ fontSize: '12px', color: '#9ca3af' }}>ou</span><div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} /></div>

        <Link href="/login" style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', backgroundColor: 'transparent', color: '#16a34a', padding: '14px', borderRadius: '40px', border: '1px solid #16a34a', cursor: 'pointer', fontSize: '16px', fontWeight: '600', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#16a34a'; e.currentTarget.style.color = 'white' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#16a34a' }}>Já tenho conta</button>
        </Link>
      </div>
    </div>
  )
}