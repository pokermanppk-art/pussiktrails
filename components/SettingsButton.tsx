'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { X, Key, UserCog } from 'lucide-react'

interface SettingsButtonProps {
  userId: string
  userEmail?: string
}

export default function SettingsButton({ userId, userEmail }: SettingsButtonProps) {
  const [modalAberto, setModalAberto] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    setMensagem('')
    setCarregando(true)

    if (novaSenha !== confirmarSenha) {
      setMensagem('As novas senhas não conferem')
      setCarregando(false)
      return
    }

    if (novaSenha.length < 6) {
      setMensagem('A nova senha deve ter pelo menos 6 caracteres')
      setCarregando(false)
      return
    }

    // Verificar a senha atual
    const { data: user, error } = await supabase
      .from('users')
      .select('senha')
      .eq('id', userId)
      .single()

    if (error || !user) {
      setMensagem('Erro ao verificar usuário')
      setCarregando(false)
      return
    }

    if (user.senha !== senhaAtual) {
      setMensagem('Senha atual incorreta')
      setCarregando(false)
      return
    }

    // Atualizar a senha
    const { error: updateError } = await supabase
      .from('users')
      .update({ senha: novaSenha })
      .eq('id', userId)

    if (updateError) {
      setMensagem('Erro ao atualizar senha')
    } else {
      setMensagem('✅ Senha alterada com sucesso!')
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarSenha('')
      setTimeout(() => {
        setModalAberto(false)
        setMensagem('')
      }, 2000)
    }
    setCarregando(false)
  }

  return (
    <>
      {/* Ícone de engrenagem */}
      <button
        onClick={() => setModalAberto(true)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '20px',
          padding: '8px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        title="Configurações"
      >
        ⚙️
      </button>

      {/* Modal de configurações */}
      {modalAberto && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setModalAberto(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do modal */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <UserCog size={24} />
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Configurações</h2>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo */}
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} /> Alterar senha
              </h3>

              <form onSubmit={handleAlterarSenha}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Senha atual *</label>
                  <input
                    type="password"
                    required
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    placeholder="Digite sua senha atual"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#16a34a'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Nova senha *</label>
                  <input
                    type="password"
                    required
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#16a34a'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Confirmar nova senha *</label>
                  <input
                    type="password"
                    required
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="Digite a nova senha novamente"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#16a34a'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>

                {mensagem && (
                  <div style={{
                    marginBottom: '16px',
                    padding: '10px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    textAlign: 'center',
                    backgroundColor: mensagem.includes('✅') ? '#dcfce7' : '#fee2e2',
                    color: mensagem.includes('✅') ? '#16a34a' : '#dc2626'
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
                    padding: '12px',
                    borderRadius: '40px',
                    border: 'none',
                    cursor: carregando ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    opacity: carregando ? 0.6 : 1,
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => { if (!carregando) e.currentTarget.style.backgroundColor = '#15803d' }}
                  onMouseLeave={(e) => { if (!carregando) e.currentTarget.style.backgroundColor = '#16a34a' }}
                >
                  {carregando ? 'Alterando...' : 'Alterar senha'}
                </button>
              </form>

              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
                  Futuramente: notificações, preferências de privacidade e muito mais.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}