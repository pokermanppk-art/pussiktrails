'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type RoteiroModificacao = {
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
  motivo_modificacao?: string
  created_at: string
  guia_id?: string
  guia_nome?: string
  guia_email?: string
}

export default function AdminRoteirosModificacoes() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [roteiros, setRoteiros] = useState<RoteiroModificacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalAcao, setModalAcao] = useState<{ isOpen: boolean; roteiro: RoteiroModificacao | null; acao: 'aprovar' | 'rejeitar' | null }>({
    isOpen: false,
    roteiro: null,
    acao: null
  })
  const [resposta, setResposta] = useState('')

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
  }, [router])

  const carregarRoteiros = async () => {
    setCarregando(true)
    try {
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .eq('status', 'pendente_modificacao')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Buscar nomes dos guias
      const guiaIds = [...new Set(data?.map((r: any) => r.id_guia).filter(Boolean) || [])]
      let guiaMap: Record<string, { nome: string; email: string }> = {}
      if (guiaIds.length > 0) {
        const { data: guias } = await supabase
          .from('users')
          .select('id, nome, email')
          .in('id', guiaIds)
        guiaMap = (guias || []).reduce((acc: any, guia: any) => {
          acc[guia.id] = { nome: guia.nome, email: guia.email }
          return acc
        }, {})
      }

      const roteirosFormatados = (data || []).map((item: any) => ({
        ...item,
        guia_id: item.id_guia,
        guia_nome: item.id_guia ? (guiaMap[item.id_guia]?.nome || 'Guia') : 'Guia',
        guia_email: item.id_guia ? (guiaMap[item.id_guia]?.email || '') : ''
      }))

      setRoteiros(roteirosFormatados)
    } catch (err) {
      console.error('Erro ao carregar solicitações:', err)
    } finally {
      setCarregando(false)
    }
  }

  const aprovarModificacao = async (roteiroId: string, respostaTexto: string) => {
    const { error } = await supabase
      .from('roteiros')
      .update({ 
        status: 'ativo',
        motivo_modificacao: null
      })
      .eq('id', roteiroId)

    if (!error) {
      carregarRoteiros()
      alert('✅ Modificação aprovada! Roteiro continua ativo.')
    } else {
      alert('❌ Erro ao aprovar modificação')
    }
    setModalAcao({ isOpen: false, roteiro: null, acao: null })
    setResposta('')
  }

  const rejeitarModificacao = async (roteiroId: string, respostaTexto: string) => {
    const { error } = await supabase
      .from('roteiros')
      .update({ 
        status: 'ativo',
        motivo_modificacao: null
      })
      .eq('id', roteiroId)

    if (!error) {
      carregarRoteiros()
      alert('❌ Modificação rejeitada. Roteiro mantido como estava.')
    } else {
      alert('❌ Erro ao rejeitar modificação')
    }
    setModalAcao({ isOpen: false, roteiro: null, acao: null })
    setResposta('')
  }

  const getDificuldadeCor = (dificuldade: string) => {
    switch (dificuldade?.toLowerCase()) {
      case 'fácil': return { bg: '#dcfce7', text: '#16a34a', label: '🟢 Fácil' }
      case 'médio': return { bg: '#fef3c7', text: '#f59e0b', label: '🟡 Médio' }
      case 'difícil': return { bg: '#fee2e2', text: '#dc2626', label: '🔴 Difícil' }
      default: return { bg: '#f3f4f6', text: '#6b7280', label: '⚪ Não definido' }
    }
  }

  const roteirosFiltrados = roteiros.filter((roteiro) =>
    roteiro.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
    roteiro.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
    roteiro.localizacao?.toLowerCase().includes(busca.toLowerCase()) ||
    roteiro.guia_nome?.toLowerCase().includes(busca.toLowerCase()) ||
    roteiro.motivo_modificacao?.toLowerCase().includes(busca.toLowerCase())
  )

  const estatisticas = {
    total: roteiros.length,
    comMotivo: roteiros.filter(r => r.motivo_modificacao).length
  }

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
      {modalAcao.isOpen && modalAcao.roteiro && (
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
          onClick={() => setModalAcao({ isOpen: false, roteiro: null, acao: null })}
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
              {modalAcao.acao === 'aprovar' ? '✅ Aprovar Modificação' : '❌ Rejeitar Modificação'}
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
              {modalAcao.acao === 'aprovar'
                ? `Confirmar aprovação da solicitação para o roteiro "${modalAcao.roteiro.titulo}"?`
                : `Tem certeza que deseja rejeitar a solicitação para o roteiro "${modalAcao.roteiro.titulo}"?`}
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                Motivo solicitado pelo guia:
              </label>
              <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '12px', fontSize: '14px', color: '#4b5563', marginBottom: '16px' }}>
                "{modalAcao.roteiro.motivo_modificacao || 'Nenhum motivo informado'}"
              </div>

              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                {modalAcao.acao === 'aprovar' ? 'Resposta (opcional)' : 'Motivo da rejeição *'}
              </label>
              <textarea
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                rows={3}
                placeholder={modalAcao.acao === 'aprovar' ? 'Opcional: adicione uma observação para o guia...' : 'Descreva o motivo da rejeição...'}
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
                onFocus={(e) => e.target.style.borderColor = modalAcao.acao === 'aprovar' ? '#16a34a' : '#dc2626'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModalAcao({ isOpen: false, roteiro: null, acao: null })}
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
                  if (modalAcao.acao === 'aprovar') {
                    aprovarModificacao(modalAcao.roteiro!.id, resposta)
                  } else {
                    if (!resposta.trim()) {
                      alert('Por favor, informe o motivo da rejeição.')
                      return
                    }
                    rejeitarModificacao(modalAcao.roteiro!.id, resposta)
                  }
                }}
                style={{
                  backgroundColor: modalAcao.acao === 'aprovar' ? '#16a34a' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '40px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                {modalAcao.acao === 'aprovar' ? '✅ Confirmar Aprovação' : '❌ Confirmar Rejeição'}
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
            <h1 style={{ margin: 0, fontSize: '24px', color: '#3b82f6', fontWeight: 'bold' }}>
              ✏️ Solicitações de Modificação
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
              Aprove ou rejeite solicitações de alteração de roteiros enviadas pelos guias
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
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px'
        }}
      >
        {/* STATS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}
        >
          <div style={{ backgroundColor: '#dbeafe', borderRadius: '20px', padding: '16px', textAlign: 'center', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>✏️</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>{estatisticas.total}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Total de Solicitações</div>
          </div>
          <div style={{ backgroundColor: '#fef3c7', borderRadius: '20px', padding: '16px', textAlign: 'center', border: '1px solid #fde68a' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📝</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#d97706' }}>{estatisticas.comMotivo}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Com motivo detalhado</div>
          </div>
        </div>

        {/* BARRA DE BUSCA */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <input
                type="text"
                placeholder="🔍 Buscar por título, localização, guia ou motivo..."
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
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
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

        {/* LISTA DE SOLICITAÇÕES */}
        {carregando ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center', color: '#6b7280' }}>
            Carregando solicitações...
          </div>
        ) : roteirosFiltrados.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>Nenhuma solicitação pendente</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              {busca ? 'Nenhuma solicitação encontrada com esta busca.' : 'As solicitações de modificação dos guias aparecerão aqui.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {roteirosFiltrados.map((roteiro) => {
              const dificuldadeInfo = getDificuldadeCor(roteiro.dificuldade)
              return (
                <div
                  key={roteiro.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    padding: '20px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                    <div style={{ flex: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#111827' }}>{roteiro.titulo}</h3>
                        <span style={{ backgroundColor: dificuldadeInfo.bg, color: dificuldadeInfo.text, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                          {dificuldadeInfo.label}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px', fontSize: '13px', color: '#6b7280' }}>
                        <span>📍 {roteiro.localizacao}</span>
                        <span>🥾 {roteiro.km} KM</span>
                        <span>💰 R$ {roteiro.preco}</span>
                        <span>⏱️ {roteiro.duracao_horas}h</span>
                      </div>

                      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '12px', borderLeft: `4px solid #d97706` }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#d97706', marginBottom: '6px' }}>📝 Motivo da solicitação:</div>
                        <div style={{ fontSize: '14px', color: '#4b5563' }}>{roteiro.motivo_modificacao || 'Nenhum motivo informado'}</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#6b7280' }}>
                        <span>👤 Guia: {roteiro.guia_nome}</span>
                        <span>📧 {roteiro.guia_email}</span>
                        <span>📅 Solicitado em: {new Date(roteiro.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <button
                        onClick={() => setModalAcao({ isOpen: true, roteiro, acao: 'aprovar' })}
                        style={{
                          backgroundColor: '#16a34a',
                          color: 'white',
                          border: 'none',
                          borderRadius: '40px',
                          padding: '10px 24px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}
                      >
                        ✅ Aprovar
                      </button>
                      <button
                        onClick={() => setModalAcao({ isOpen: true, roteiro, acao: 'rejeitar' })}
                        style={{
                          backgroundColor: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '40px',
                          padding: '10px 24px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}
                      >
                        ❌ Rejeitar
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