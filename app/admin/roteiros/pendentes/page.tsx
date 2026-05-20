'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Roteiro = {
  id: string
  titulo: string
  descricao: string
  preco: number
  duracao_horas: number
  dificuldade: string
  localizacao: string
  km: number
  foto_capa?: string
  status: string
  created_at: string
  guia?: {
    nome: string
    email: string
  }
}

export default function AdminRoteirosPendentes() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalAprovacao, setModalAprovacao] = useState<{ isOpen: boolean; roteiro: Roteiro | null; acao: 'aprovar' | 'reprovar' | null }>({
    isOpen: false,
    roteiro: null,
    acao: null
  })
  const [motivoReprovacao, setMotivoReprovacao] = useState('')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }
    const parsedUser = JSON.parse(userData)
    if (parsedUser.tipo !== 'admin') {
      router.push('/login')
      return
    }
    setUser(parsedUser)
    carregarRoteiros()
  }, [])

  const carregarRoteiros = async () => {
    setCarregando(true)
    try {
      const { data, error } = await supabase
        .from('roteiros')
        .select(`
          *,
          guia:users (nome, email)
        `)
        .eq('status', 'aguardando')
        .order('created_at', { ascending: false })

      if (error) throw error

      const roteirosFormatados = (data || []).map((item: any) => ({
        ...item,
        guia: Array.isArray(item.guia) ? item.guia[0] : item.guia
      }))

      setRoteiros(roteirosFormatados)
    } catch (err) {
      console.error('Erro ao carregar roteiros pendentes:', err)
    } finally {
      setCarregando(false)
    }
  }

  const aprovarRoteiro = async (roteiroId: string) => {
    const { error } = await supabase
      .from('roteiros')
      .update({ status: 'ativo' })
      .eq('id', roteiroId)

    if (!error) {
      carregarRoteiros()
      alert('✅ Roteiro aprovado com sucesso!')
    } else {
      alert('❌ Erro ao aprovar roteiro')
    }
    setModalAprovacao({ isOpen: false, roteiro: null, acao: null })
  }

  const reprovarRoteiro = async (roteiroId: string, motivo: string) => {
    const { error } = await supabase
      .from('roteiros')
      .update({ status: 'rejeitado', motivo_reprovacao: motivo })
      .eq('id', roteiroId)

    if (!error) {
      carregarRoteiros()
      alert(`❌ Roteiro reprovado.\nMotivo: ${motivo}`)
    } else {
      alert('❌ Erro ao reprovar roteiro')
    }
    setModalAprovacao({ isOpen: false, roteiro: null, acao: null })
    setMotivoReprovacao('')
  }

  const getDificuldadeCor = (dificuldade: string) => {
    switch (dificuldade?.toLowerCase()) {
      case 'fácil': return { bg: '#dcfce7', text: '#16a34a', label: '🟢 Fácil' }
      case 'médio': return { bg: '#fef3c7', text: '#f59e0b', label: '🟡 Médio' }
      case 'difícil': return { bg: '#fee2e2', text: '#dc2626', label: '🔴 Difícil' }
      default: return { bg: '#f3f4f6', text: '#6b7280', label: '⚪ Não definido' }
    }
  }

  const roteirosFiltrados = roteiros.filter(
    (roteiro) =>
      roteiro.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
      roteiro.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
      roteiro.localizacao?.toLowerCase().includes(busca.toLowerCase()) ||
      roteiro.guia?.nome?.toLowerCase().includes(busca.toLowerCase())
  )

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏔️</div>
          <div style={{ color: '#6b7280' }}>Carregando...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* MODAL DE CONFIRMAÇÃO */}
      {modalAprovacao.isOpen && modalAprovacao.roteiro && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setModalAprovacao({ isOpen: false, roteiro: null, acao: null })}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 35px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#111827' }}>
              {modalAprovacao.acao === 'aprovar' ? '✅ Aprovar Roteiro' : '❌ Reprovar Roteiro'}
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
              {modalAprovacao.acao === 'aprovar'
                ? `Confirmar aprovação do roteiro "${modalAprovacao.roteiro.titulo}"?`
                : `Tem certeza que deseja reprovar o roteiro "${modalAprovacao.roteiro.titulo}"?`}
            </p>

            {modalAprovacao.acao === 'reprovar' && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                  Motivo da reprovação <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  value={motivoReprovacao}
                  onChange={(e) => setMotivoReprovacao(e.target.value)}
                  rows={3}
                  placeholder="Descreva o motivo da reprovação..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px',
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#dc2626'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModalAprovacao({ isOpen: false, roteiro: null, acao: null })}
                style={{
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '40px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (modalAprovacao.acao === 'aprovar') {
                    aprovarRoteiro(modalAprovacao.roteiro!.id)
                  } else {
                    if (!motivoReprovacao.trim()) {
                      alert('Por favor, informe o motivo da reprovação.')
                      return
                    }
                    reprovarRoteiro(modalAprovacao.roteiro!.id, motivoReprovacao)
                  }
                }}
                style={{
                  backgroundColor: modalAprovacao.acao === 'aprovar' ? '#16a34a' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '40px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                {modalAprovacao.acao === 'aprovar' ? '✅ Confirmar Aprovação' : '❌ Confirmar Reprovação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div
        style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#d97706', fontWeight: 'bold' }}>
              🟡 Roteiros Pendentes
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
              Aguardando aprovação
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => router.push('/admin/roteiros')}
              style={{
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '999px',
                padding: '10px 20px',
                cursor: 'pointer',
                color: '#374151',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              ← Voltar
            </button>

            <button
              onClick={() => {
                localStorage.removeItem('user')
                router.push('/login')
              }}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '999px',
                padding: '10px 20px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '32px 24px'
        }}
      >
        {/* BARRA DE BUSCA */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '16px 20px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <input
                type="text"
                placeholder="🔍 Buscar por título, descrição, localização ou guia..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '40px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#d97706'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            {busca && (
              <button
                onClick={() => setBusca('')}
                style={{
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '40px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#6b7280'
                }}
              >
                Limpar busca
              </button>
            )}
          </div>
        </div>

        {/* LISTA DE ROTEIROS PENDENTES */}
        {carregando ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center', color: '#6b7280' }}>
            Carregando roteiros pendentes...
          </div>
        ) : roteirosFiltrados.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>Nenhum roteiro pendente</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              {busca ? 'Nenhum roteiro encontrado com esta busca.' : 'Todos os roteiros foram aprovados ou reprovados.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
            {roteirosFiltrados.map((roteiro) => {
              const dificuldadeInfo = getDificuldadeCor(roteiro.dificuldade)
              return (
                <div
                  key={roteiro.id}
                  style={{
                    backgroundColor: '#fffbeb',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    border: '1px solid #fde68a',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {roteiro.foto_capa && (
                    <div style={{ height: '140px', overflow: 'hidden' }}>
                      <img src={roteiro.foto_capa} alt={roteiro.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  {!roteiro.foto_capa && (
                    <div style={{ height: '100px', backgroundColor: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '40px' }}>🏔️</span>
                    </div>
                  )}
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#111827' }}>{roteiro.titulo}</h3>
                      <span style={{ backgroundColor: dificuldadeInfo.bg, color: dificuldadeInfo.text, padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '600' }}>
                        {dificuldadeInfo.label}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', lineHeight: 1.4 }}>
                      {roteiro.descricao?.length > 80 ? `${roteiro.descricao.substring(0, 80)}...` : roteiro.descricao}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '11px', color: '#6b7280', marginBottom: '12px' }}>
                      <span>📍 {roteiro.localizacao}</span>
                      <span>🥾 {roteiro.km} KM</span>
                      <span>💰 R$ {roteiro.preco}</span>
                      <span>⏱️ {roteiro.duracao_horas}h</span>
                    </div>
                    <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: 'white', borderRadius: '10px' }}>
                      <div style={{ fontSize: '10px', color: '#9ca3af' }}>👤 Guia responsável</div>
                      <div style={{ fontSize: '12px', fontWeight: '500' }}>{roteiro.guia?.nome || 'Não informado'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setModalAprovacao({ isOpen: true, roteiro, acao: 'aprovar' })}
                        style={{ flex: 1, backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '30px', padding: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                      >
                        ✅ Aprovar
                      </button>
                      <button
                        onClick={() => setModalAprovacao({ isOpen: true, roteiro, acao: 'reprovar' })}
                        style={{ flex: 1, backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '30px', padding: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                      >
                        ❌ Reprovar
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}