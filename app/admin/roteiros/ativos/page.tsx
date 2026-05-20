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
  guia_id?: string
  guia_nome?: string
}

export default function AdminRoteirosAtivos() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalAcao, setModalAcao] = useState<{ isOpen: boolean; roteiro: Roteiro | null; acao: 'excluir' | 'modificar' | null }>({
    isOpen: false,
    roteiro: null,
    acao: null
  })
  const [motivo, setMotivo] = useState('')

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
        .select('*')
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Buscar nomes dos guias
      const guiaIds = [...new Set(data?.map(r => r.id_guia).filter(Boolean) || [])]
      let guiaMap: Record<string, string> = {}
      if (guiaIds.length > 0) {
        const { data: guias } = await supabase
          .from('users')
          .select('id, nome')
          .in('id', guiaIds)
        guiaMap = (guias || []).reduce((acc, guia) => {
          acc[guia.id] = guia.nome
          return acc
        }, {} as Record<string, string>)
      }

      const roteirosFormatados = (data || []).map((item: any) => ({
        ...item,
        guia_id: item.id_guia,
        guia_nome: item.id_guia ? (guiaMap[item.id_guia] || 'Guia') : 'Guia'
      }))

      setRoteiros(roteirosFormatados)
    } catch (err) {
      console.error('Erro ao carregar roteiros ativos:', err)
    } finally {
      setCarregando(false)
    }
  }

  const excluirRoteiro = async (roteiroId: string) => {
    const { error } = await supabase
      .from('roteiros')
      .delete()
      .eq('id', roteiroId)

    if (!error) {
      carregarRoteiros()
      alert('✅ Roteiro excluído com sucesso!')
    } else {
      alert('❌ Erro ao excluir roteiro')
    }
    setModalAcao({ isOpen: false, roteiro: null, acao: null })
    setMotivo('')
  }

  const enviarSolicitacaoModificacao = async (roteiroId: string, motivoTexto: string) => {
    if (!motivoTexto.trim()) {
      alert('Por favor, informe o motivo da solicitação de modificação.')
      return
    }

    // Atualizar roteiro para status "pendente_modificacao"
    const { error } = await supabase
      .from('roteiros')
      .update({ 
        status: 'pendente_modificacao',
        motivo_modificacao: motivoTexto
      })
      .eq('id', roteiroId)

    if (!error) {
      carregarRoteiros()
      alert('✅ Solicitação de modificação enviada ao guia!')
    } else {
      alert('❌ Erro ao enviar solicitação')
    }
    setModalAcao({ isOpen: false, roteiro: null, acao: null })
    setMotivo('')
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
    roteiro.guia_nome?.toLowerCase().includes(busca.toLowerCase())
  )

  const estatisticas = {
    total: roteiros.length,
    kmTotal: roteiros.reduce((acc, r) => acc + (r.km || 0), 0),
    valorTotal: roteiros.reduce((acc, r) => acc + (r.preco || 0), 0)
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
              {modalAcao.acao === 'excluir' ? '🗑️ Excluir Roteiro' : '✏️ Solicitar Modificação'}
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
              {modalAcao.acao === 'excluir'
                ? `Tem certeza que deseja excluir o roteiro "${modalAcao.roteiro.titulo}"? Esta ação não pode ser desfeita.`
                : `Solicitar modificação do roteiro "${modalAcao.roteiro.titulo}" para o guia.`}
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                {modalAcao.acao === 'excluir' ? 'Confirmar exclusão?' : 'Motivo da modificação *'}
              </label>
              {modalAcao.acao === 'modificar' ? (
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                  placeholder="Descreva o que precisa ser modificado no roteiro..."
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
                  onFocus={(e) => e.target.style.borderColor = '#16a34a'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              ) : (
                <p style={{ fontSize: '14px', color: '#dc2626' }}>⚠️ Esta ação é irreversível.</p>
              )}
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
                  if (modalAcao.acao === 'excluir') {
                    excluirRoteiro(modalAcao.roteiro!.id)
                  } else {
                    enviarSolicitacaoModificacao(modalAcao.roteiro!.id, motivo)
                  }
                }}
                style={{
                  backgroundColor: modalAcao.acao === 'excluir' ? '#dc2626' : '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '40px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                {modalAcao.acao === 'excluir' ? '🗑️ Confirmar Exclusão' : '✏️ Enviar Solicitação'}
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
            <h1 style={{ margin: 0, fontSize: '24px', color: '#16a34a', fontWeight: 'bold' }}>
              🟢 Roteiros Ativos
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
              Gerenciar roteiros publicados no marketplace
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '16px'
          }}
        >
          <div style={{ backgroundColor: '#f0fdf4', borderRadius: '20px', padding: '16px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🟢</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a' }}>{estatisticas.total}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Ativos</div>
          </div>
          <div style={{ backgroundColor: '#f3f4f6', borderRadius: '20px', padding: '16px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🥾</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#6b7280' }}>{estatisticas.kmTotal}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>KM Totais</div>
          </div>
          <div style={{ backgroundColor: '#fef3c7', borderRadius: '20px', padding: '16px', textAlign: 'center', border: '1px solid #fde68a' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>💰</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>R$ {estatisticas.valorTotal.toFixed(2)}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Valor Total</div>
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
                onFocus={(e) => e.target.style.borderColor = '#16a34a'}
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

        {/* LISTA DE ROTEIROS ATIVOS */}
        {carregando ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center', color: '#6b7280' }}>
            Carregando roteiros ativos...
          </div>
        ) : roteirosFiltrados.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
            <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>Nenhum roteiro ativo</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              {busca ? 'Nenhum roteiro encontrado com esta busca.' : 'Os roteiros aprovados aparecerão aqui.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '24px' }}>
            {roteirosFiltrados.map((roteiro) => {
              const dificuldadeInfo = getDificuldadeCor(roteiro.dificuldade)
              return (
                <div
                  key={roteiro.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px)'
                    e.currentTarget.style.boxShadow = '0 20px 30px rgba(0,0,0,0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'
                  }}
                >
                  {/* Capa */}
                  {roteiro.foto_capa ? (
                    <div style={{ height: '160px', overflow: 'hidden' }}>
                      <img src={roteiro.foto_capa} alt={roteiro.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ height: '120px', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '48px' }}>🏔️</span>
                    </div>
                  )}

                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#111827' }}>{roteiro.titulo}</h3>
                      <span style={{ backgroundColor: dificuldadeInfo.bg, color: dificuldadeInfo.text, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                        {dificuldadeInfo.label}
                      </span>
                    </div>

                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px', lineHeight: 1.5 }}>
                      {roteiro.descricao?.length > 100 ? `${roteiro.descricao.substring(0, 100)}...` : roteiro.descricao}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f3f4f6', padding: '4px 10px', borderRadius: '20px' }}>
                        <span>📍</span>
                        <span style={{ fontSize: '12px', color: '#4b5563' }}>{roteiro.localizacao}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f3f4f6', padding: '4px 10px', borderRadius: '20px' }}>
                        <span>🥾</span>
                        <span style={{ fontSize: '12px', color: '#4b5563' }}>{roteiro.km} KM</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f3f4f6', padding: '4px 10px', borderRadius: '20px' }}>
                        <span>💰</span>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a' }}>R$ {roteiro.preco}</span>
                      </div>
                    </div>

                    <div style={{ marginBottom: '16px', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>👤 Guia responsável</div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>{roteiro.guia_nome}</div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => setModalAcao({ isOpen: true, roteiro, acao: 'modificar' })}
                        style={{ flex: 1, backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '30px', padding: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                      >
                        ✏️ Solicitar Modificação
                      </button>
                      <button
                        onClick={() => setModalAcao({ isOpen: true, roteiro, acao: 'excluir' })}
                        style={{ flex: 1, backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '30px', padding: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                      >
                        🗑️ Excluir
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