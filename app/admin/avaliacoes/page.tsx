'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Avaliacao = {
  id: string
  nota: number
  comentario: string
  resposta_guia?: string
  status_moderacao: string
  created_at: string
  cliente_id: string
  guia_id: string
  reserva_id: string
  cliente_nome?: string
  cliente_email?: string
  guia_nome?: string
  guia_email?: string
}

export default function AdminAvaliacoes() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroNota, setFiltroNota] = useState<number | 'todas'>('todas')
  const [filtroStatus, setFiltroStatus] = useState<string>('todas')
  const [modalAprovacao, setModalAprovacao] = useState<{ isOpen: boolean; avaliacao: Avaliacao | null; acao: 'aprovar' | 'rejeitar' | null }>({
    isOpen: false,
    avaliacao: null,
    acao: null
  })
  const [motivoRejeicao, setMotivoRejeicao] = useState('')

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
    carregarAvaliacoes()
  }, [])

  const carregarAvaliacoes = async () => {
    setCarregando(true)
    try {
      // Buscar avaliações pendentes E aguardando_admin (com resposta do guia)
      const { data: avaliacoesData, error: avaliacoesError } = await supabase
        .from('avaliacoes')
        .select('*')
        .in('status_moderacao', ['pendente', 'aguardando_admin'])
        .order('created_at', { ascending: false })

      if (avaliacoesError) throw avaliacoesError

      // Buscar dados dos clientes e guias separadamente
      const avaliacoesCompletas = await Promise.all(
        (avaliacoesData || []).map(async (avaliacao) => {
          const { data: cliente } = await supabase
            .from('users')
            .select('nome, email')
            .eq('id', avaliacao.cliente_id)
            .single()

          const { data: guia } = await supabase
            .from('users')
            .select('nome, email')
            .eq('id', avaliacao.guia_id)
            .single()

          return {
            ...avaliacao,
            cliente_nome: cliente?.nome || 'Cliente',
            cliente_email: cliente?.email || '',
            guia_nome: guia?.nome || 'Guia',
            guia_email: guia?.email || ''
          }
        })
      )

      setAvaliacoes(avaliacoesCompletas)
    } catch (err) {
      console.error('Erro ao carregar avaliações:', err)
    } finally {
      setCarregando(false)
    }
  }

  const aprovarAvaliacao = async (avaliacaoId: string) => {
    const { error } = await supabase
      .from('avaliacoes')
      .update({ status_moderacao: 'aprovado' })
      .eq('id', avaliacaoId)

    if (!error) {
      carregarAvaliacoes()
      alert('✅ Avaliação aprovada com sucesso!')
    } else {
      alert('❌ Erro ao aprovar avaliação')
    }
    setModalAprovacao({ isOpen: false, avaliacao: null, acao: null })
  }

  const rejeitarAvaliacao = async (avaliacaoId: string, motivo: string) => {
    const { error } = await supabase
      .from('avaliacoes')
      .update({ status_moderacao: 'rejeitado' })
      .eq('id', avaliacaoId)

    if (!error) {
      carregarAvaliacoes()
      alert(`❌ Avaliação rejeitada.\nMotivo: ${motivo}`)
    } else {
      alert('❌ Erro ao rejeitar avaliação')
    }
    setModalAprovacao({ isOpen: false, avaliacao: null, acao: null })
    setMotivoRejeicao('')
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente':
        return { label: 'Aguardando resposta do guia', bg: '#fef3c7', color: '#d97706' }
      case 'aguardando_admin':
        return { label: 'Guia respondeu - Aguardando moderação', bg: '#dbeafe', color: '#3b82f6' }
      case 'aprovado':
        return { label: 'Aprovado', bg: '#dcfce7', color: '#16a34a' }
      case 'rejeitado':
        return { label: 'Rejeitado', bg: '#fee2e2', color: '#dc2626' }
      default:
        return { label: status, bg: '#f3f4f6', color: '#6b7280' }
    }
  }

  const avaliacoesFiltradas = avaliacoes.filter((avaliacao) => {
    const matchBusca = 
      avaliacao.comentario?.toLowerCase().includes(busca.toLowerCase()) ||
      avaliacao.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) ||
      avaliacao.guia_nome?.toLowerCase().includes(busca.toLowerCase())
    
    const matchNota = filtroNota === 'todas' || avaliacao.nota === filtroNota
    const matchStatus = filtroStatus === 'todas' || avaliacao.status_moderacao === filtroStatus
    
    return matchBusca && matchNota && matchStatus
  })

  const getNotaEstrelas = (nota: number) => {
    const estrelasCheias = '★'.repeat(nota)
    const estrelasVazias = '☆'.repeat(5 - nota)
    return estrelasCheias + estrelasVazias
  }

  const getNotaCor = (nota: number) => {
    if (nota >= 4) return '#16a34a'
    if (nota >= 3) return '#f59e0b'
    return '#dc2626'
  }

  const estatisticas = {
    total: avaliacoes.length,
    pendentes: avaliacoes.filter(a => a.status_moderacao === 'pendente').length,
    aguardandoAdmin: avaliacoes.filter(a => a.status_moderacao === 'aguardando_admin').length,
    nota5: avaliacoes.filter(a => a.nota === 5).length,
    nota4: avaliacoes.filter(a => a.nota === 4).length,
    nota3: avaliacoes.filter(a => a.nota === 3).length,
    nota2: avaliacoes.filter(a => a.nota === 2).length,
    nota1: avaliacoes.filter(a => a.nota === 1).length,
    notaMedia: avaliacoes.length > 0 
      ? (avaliacoes.reduce((acc, a) => acc + a.nota, 0) / avaliacoes.length).toFixed(1)
      : '0.0'
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
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
      {modalAprovacao.isOpen && modalAprovacao.avaliacao && (
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
          onClick={() => setModalAprovacao({ isOpen: false, avaliacao: null, acao: null })}
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
              {modalAprovacao.acao === 'aprovar' ? '✅ Aprovar Avaliação' : '❌ Rejeitar Avaliação'}
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
              {modalAprovacao.acao === 'aprovar'
                ? `Confirmar aprovação da avaliação de ${modalAprovacao.avaliacao.cliente_nome}?`
                : `Tem certeza que deseja rejeitar esta avaliação?`}
            </p>

            {modalAprovacao.acao === 'rejeitar' && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                  Motivo da rejeição <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  value={motivoRejeicao}
                  onChange={(e) => setMotivoRejeicao(e.target.value)}
                  rows={3}
                  placeholder="Descreva o motivo da rejeição..."
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
                onClick={() => setModalAprovacao({ isOpen: false, avaliacao: null, acao: null })}
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
                    aprovarAvaliacao(modalAprovacao.avaliacao!.id)
                  } else {
                    if (!motivoRejeicao.trim()) {
                      alert('Por favor, informe o motivo da rejeição.')
                      return
                    }
                    rejeitarAvaliacao(modalAprovacao.avaliacao!.id, motivoRejeicao)
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
                {modalAprovacao.acao === 'aprovar' ? '✅ Confirmar Aprovação' : '❌ Confirmar Rejeição'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CABEÇALHO SECUNDÁRIO - VERMELHO */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#dc2626', fontWeight: 'bold' }}>⭐ Moderação de Avaliações</h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>Gerencie as avaliações dos clientes</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={() => router.push('/admin/dashboard')} style={{ backgroundColor: '#f3f4f6', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', color: '#374151', fontWeight: '600', fontSize: '13px' }}>← Voltar</button>
            <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Sair</button>
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
          <div style={{ backgroundColor: '#eff6ff', borderRadius: '20px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📊</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>{estatisticas.total}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Total</div>
          </div>
          <div style={{ backgroundColor: '#fef3c7', borderRadius: '20px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#d97706' }}>{estatisticas.pendentes}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Aguardando resposta</div>
          </div>
          <div style={{ backgroundColor: '#dbeafe', borderRadius: '20px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>✏️</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>{estatisticas.aguardandoAdmin}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Guia respondeu</div>
          </div>
          <div style={{ backgroundColor: '#f0fdf4', borderRadius: '20px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>⭐</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a' }}>{estatisticas.notaMedia}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Média Geral</div>
          </div>
        </div>

        {/* FILTROS E BUSCA */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <div style={{ flex: 2, minWidth: '200px' }}>
            <input type="text" placeholder="🔍 Buscar por cliente, guia ou comentário..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ width: '100%', padding: '10px 16px', borderRadius: '40px', border: '1px solid #e5e7eb', fontSize: '14px', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#dc2626'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} />
          </div>
          <div style={{ minWidth: '150px' }}>
            <select value={filtroNota} onChange={(e) => setFiltroNota(e.target.value === 'todas' ? 'todas' : parseInt(e.target.value))} style={{ width: '100%', padding: '10px 16px', borderRadius: '40px', border: '1px solid #e5e7eb', fontSize: '14px', backgroundColor: 'white', cursor: 'pointer' }}>
              <option value="todas">Todas as notas</option>
              <option value="5">5 estrelas ★★★★★</option>
              <option value="4">4 estrelas ★★★★☆</option>
              <option value="3">3 estrelas ★★★☆☆</option>
              <option value="2">2 estrelas ★★☆☆☆</option>
              <option value="1">1 estrela ★☆☆☆☆</option>
            </select>
          </div>
          <div style={{ minWidth: '150px' }}>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={{ width: '100%', padding: '10px 16px', borderRadius: '40px', border: '1px solid #e5e7eb', fontSize: '14px', backgroundColor: 'white', cursor: 'pointer' }}>
              <option value="todas">Todos os status</option>
              <option value="pendente">Aguardando resposta do guia</option>
              <option value="aguardando_admin">Guia respondeu (aguarda admin)</option>
            </select>
          </div>
          {(busca || filtroNota !== 'todas' || filtroStatus !== 'todas') && (
            <button onClick={() => { setBusca(''); setFiltroNota('todas'); setFiltroStatus('todas') }} style={{ backgroundColor: '#f3f4f6', border: 'none', borderRadius: '40px', padding: '10px 20px', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Limpar filtros</button>
          )}
        </div>

        {/* LISTA DE AVALIAÇÕES */}
        {carregando ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center', color: '#6b7280' }}>Carregando avaliações...</div>
        ) : avaliacoesFiltradas.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>Nenhuma avaliação pendente</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Todas as avaliações foram moderadas.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {avaliacoesFiltradas.map((avaliacao) => {
              const notaCor = getNotaCor(avaliacao.nota)
              const statusInfo = getStatusLabel(avaliacao.status_moderacao)
              const temRespostaGuia = avaliacao.resposta_guia && avaliacao.resposta_guia.trim() !== ''
              
              return (
                <div key={avaliacao.id} style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'all 0.2s ease', borderLeft: `4px solid ${notaCor}` }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)' }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ flex: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        <div><div style={{ fontWeight: 'bold', fontSize: '14px', color: '#111827' }}>{avaliacao.cliente_nome}</div><div style={{ fontSize: '11px', color: '#9ca3af' }}>{avaliacao.cliente_email}</div></div>
                        <div style={{ color: '#d1d5db' }}>→</div>
                        <div><div style={{ fontWeight: 'bold', fontSize: '14px', color: '#111827' }}>{avaliacao.guia_nome}</div><div style={{ fontSize: '11px', color: '#9ca3af' }}>{avaliacao.guia_email}</div></div>
                        <div><span style={{ backgroundColor: statusInfo.bg, color: statusInfo.color, padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>{statusInfo.label}</span></div>
                      </div>

                      <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '24px', letterSpacing: '2px', color: notaCor }}>{getNotaEstrelas(avaliacao.nota)}</div></div>

                      {avaliacao.comentario && (
                        <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '12px', marginBottom: '12px' }}>
                          <p style={{ margin: 0, fontSize: '14px', color: '#4b5563', lineHeight: 1.5 }}>“{avaliacao.comentario}”</p>
                        </div>
                      )}

                      {temRespostaGuia && (
                        <div style={{ backgroundColor: '#dbeafe', padding: '12px', borderRadius: '12px', marginBottom: '8px', borderLeft: '4px solid #3b82f6' }}>
                          <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 'bold', color: '#1e40af' }}>📝 Resposta do guia:</p>
                          <p style={{ margin: 0, fontSize: '13px', color: '#1e3a8a', lineHeight: 1.5 }}>“{avaliacao.resposta_guia}”</p>
                        </div>
                      )}

                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>📅 {new Date(avaliacao.created_at).toLocaleDateString('pt-BR')} às {new Date(avaliacao.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button onClick={() => setModalAprovacao({ isOpen: true, avaliacao, acao: 'aprovar' })} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '10px 20px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>✅ Aprovar</button>
                      <button onClick={() => setModalAprovacao({ isOpen: true, avaliacao, acao: 'rejeitar' })} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '40px', padding: '10px 20px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>❌ Rejeitar</button>
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