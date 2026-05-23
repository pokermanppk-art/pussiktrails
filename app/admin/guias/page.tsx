'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import SettingsButton from '@/components/SettingsButton'

type Guia = {
  id: string
  nome: string
  email: string
  cpf: string
  tipo: string
  status: string
  avatar_url?: string
  bio?: string
  especialidades?: string[]
  avaliacao_media_guia?: number
  total_avaliacoes_guia?: number
  created_at: string
  suspenso_ate?: string
  motivo_suspensao?: string
}

type ModalSuspensaoProps = {
  isOpen: boolean
  onClose: () => void
  guia: Guia | null
  onConfirm: (guiaId: string, periodo: string, motivo: string, suspensoAte: Date | null) => void
}

function ModalSuspensao({ isOpen, onClose, guia, onConfirm }: ModalSuspensaoProps) {
  const [periodo, setPeriodo] = useState('5')
  const [motivo, setMotivo] = useState('')
  const [customData, setCustomData] = useState('')

  if (!isOpen || !guia) return null

  const handleConfirm = () => {
    let suspensoAte: Date | null = null
    let periodoTexto = ''

    if (periodo === 'custom') {
      suspensoAte = new Date(customData)
      periodoTexto = `até ${new Date(customData).toLocaleDateString('pt-BR')}`
    } else if (periodo === 'indeterminado') {
      suspensoAte = null
      periodoTexto = 'indeterminado'
    } else {
      const dias = parseInt(periodo)
      suspensoAte = new Date()
      suspensoAte.setDate(suspensoAte.getDate() + dias)
      periodoTexto = `${dias} dias`
    }

    onConfirm(guia.id, periodoTexto, motivo, suspensoAte)
    onClose()
  }

  const periodos = [
    { valor: '5', label: '5 dias' },
    { valor: '10', label: '10 dias' },
    { valor: '15', label: '15 dias' },
    { valor: 'indeterminado', label: 'Indeterminado' },
    { valor: 'custom', label: 'Personalizado' }
  ]

  return (
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
      onClick={onClose}
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
          ⚠️ Suspender Guia
        </h2>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
          Suspender <strong>{guia.nome}</strong>
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
            Período de suspensão
          </label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {periodos.map((p) => (
              <button
                key={p.valor}
                onClick={() => setPeriodo(p.valor)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '40px',
                  border: periodo === p.valor ? '2px solid #dc2626' : '1px solid #e5e7eb',
                  backgroundColor: periodo === p.valor ? '#fef2f2' : 'white',
                  color: periodo === p.valor ? '#dc2626' : '#374151',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {periodo === 'custom' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
              Data de reativação
            </label>
            <input
              type="date"
              value={customData}
              onChange={(e) => setCustomData(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                fontSize: '14px',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#dc2626'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
            Motivo da suspensão <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Descreva o motivo da suspensão..."
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

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
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
            onClick={handleConfirm}
            disabled={!motivo.trim()}
            style={{
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '40px',
              padding: '10px 20px',
              cursor: motivo.trim() ? 'pointer' : 'default',
              fontSize: '13px',
              fontWeight: '600',
              opacity: motivo.trim() ? 1 : 0.5
            }}
          >
            Confirmar Suspensão
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminGuias() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [guias, setGuias] = useState<Guia[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalSuspensao, setModalSuspensao] = useState<{ isOpen: boolean; guia: Guia | null }>({
    isOpen: false,
    guia: null
  })

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
    carregarGuias()
  }, [])

  const carregarGuias = async () => {
    setCarregando(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tipo', 'guia')
        .order('created_at', { ascending: false })

      if (error) throw error
      setGuias(data || [])
    } catch (err) {
      console.error('Erro ao carregar guias:', err)
    } finally {
      setCarregando(false)
    }
  }

  const atualizarStatus = async (guiaId: string, novoStatus: string) => {
    const { error } = await supabase
      .from('users')
      .update({ status: novoStatus })
      .eq('id', guiaId)

    if (!error) {
      setGuias((prev) =>
        prev.map((g) =>
          g.id === guiaId ? { ...g, status: novoStatus } : g
        )
      )
    } else {
      alert('Erro ao atualizar status do guia')
    }
  }

  const suspenderGuia = async (guiaId: string, periodoTexto: string, motivo: string, suspensoAte: Date | null) => {
    const updateData: any = {
      status: 'suspenso',
      motivo_suspensao: motivo
    }

    if (suspensoAte) {
      updateData.suspenso_ate = suspensoAte.toISOString()
    } else {
      updateData.suspenso_ate = null
    }

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', guiaId)

    if (!error) {
      setGuias((prev) =>
        prev.map((g) =>
          g.id === guiaId
            ? { ...g, status: 'suspenso', motivo_suspensao: motivo, suspenso_ate: suspensoAte?.toISOString() }
            : g
        )
      )
      alert(`Guia suspenso${periodoTexto !== 'indeterminado' ? ` por ${periodoTexto}` : ''}.\nMotivo: ${motivo}`)
    } else {
      alert('Erro ao suspender guia')
    }
  }

  const reativarGuia = async (guiaId: string) => {
    const { error } = await supabase
      .from('users')
      .update({ status: 'ativo', suspenso_ate: null, motivo_suspensao: null })
      .eq('id', guiaId)

    if (!error) {
      setGuias((prev) =>
        prev.map((g) =>
          g.id === guiaId ? { ...g, status: 'ativo', suspenso_ate: undefined, motivo_suspensao: undefined } : g
        )
      )
      alert('Guia reativado com sucesso!')
    } else {
      alert('Erro ao reativar guia')
    }
  }

  const guiasFiltrados = guias.filter(
    (guia) =>
      guia.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      guia.email?.toLowerCase().includes(busca.toLowerCase()) ||
      guia.cpf?.includes(busca)
  )

  const guiasPendentes = guiasFiltrados.filter((g) => g.status === 'pendente')
  const guiasAtivos = guiasFiltrados.filter((g) => g.status === 'ativo')
  const guiasSuspensos = guiasFiltrados.filter((g) => g.status === 'suspenso')

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
      <ModalSuspensao
        isOpen={modalSuspensao.isOpen}
        onClose={() => setModalSuspensao({ isOpen: false, guia: null })}
        guia={modalSuspensao.guia}
        onConfirm={suspenderGuia}
      />

      {/* HEADER */}
      <div
        style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '12px 16px',
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
            <h1 style={{ margin: 0, fontSize: '22px', color: '#dc2626', fontWeight: 'bold' }}>
              👥 Gerenciar Guias
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>
              Aprove, suspenda ou ative navegadores
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <SettingsButton userId={user.id} userEmail={user.email} />
            <button
              onClick={() => router.push('/admin/dashboard')}
              style={{
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '999px',
                padding: '8px 20px',
                cursor: 'pointer',
                color: '#374151',
                fontWeight: '600',
                fontSize: '13px',
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
              ← Dashboard
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
                padding: '8px 20px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
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
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
      >
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
                placeholder="🔍 Buscar por nome, e-mail ou CPF..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
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
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#6b7280'
                }}
              >
                Limpar busca
              </button>
            )}
          </div>
        </div>

        {/* STATS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '16px'
          }}
        >
          {[
            {
              label: 'Pendentes',
              total: guiasPendentes.length,
              cor: '#f59e0b',
              bg: '#fffbeb',
              emoji: '🟡'
            },
            {
              label: 'Ativos',
              total: guiasAtivos.length,
              cor: '#16a34a',
              bg: '#f0fdf4',
              emoji: '🟢'
            },
            {
              label: 'Suspensos',
              total: guiasSuspensos.length,
              cor: '#dc2626',
              bg: '#fef2f2',
              emoji: '🔴'
            }
          ].map((item) => (
            <div
              key={item.label}
              style={{
                backgroundColor: item.bg,
                borderRadius: '20px',
                padding: '16px',
                border: `1px solid ${item.cor}20`,
                transition: 'all 0.2s ease'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}
              >
                <div>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.emoji}</div>
                  <div
                    style={{
                      fontSize: '28px',
                      fontWeight: '800',
                      color: item.cor,
                      lineHeight: 1
                    }}
                  >
                    {item.total}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    {item.label}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* PENDENTES */}
        {guiasPendentes.length > 0 && (
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '24px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '22px' }}>🟡</div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>Guias Pendentes</div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>{guiasPendentes.length} guia(s) aguardando aprovação</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {guiasPendentes.map((guia) => (
                <div
                  key={guia.id}
                  style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '16px',
                    padding: '14px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        <div
                          onClick={() => router.push(`/guia/publico/${guia.id}`)}
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            backgroundColor: '#f59e0b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            color: 'white',
                            overflow: 'hidden',
                            cursor: 'pointer'
                          }}
                        >
                          {guia.avatar_url ? <img src={guia.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{guia.nome?.charAt(0).toUpperCase() || 'G'}</span>}
                        </div>
                        <div>
                          <div
                            onClick={() => router.push(`/guia/publico/${guia.id}`)}
                            style={{ fontWeight: 'bold', fontSize: '15px', color: '#111827', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#f59e0b' }}
                          >
                            {guia.nome}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>{guia.email}</div>
                          <div style={{ fontSize: '10px', color: '#9ca3af' }}>CPF: {guia.cpf}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => router.push(`/guia/publico/${guia.id}`)}
                        style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '40px', padding: '6px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
                      >
                        👤 Perfil
                      </button>
                      <button
                        onClick={() => atualizarStatus(guia.id, 'ativo')}
                        style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '6px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
                      >
                        ✅ Aprovar
                      </button>
                      <button
                        onClick={() => setModalSuspensao({ isOpen: true, guia })}
                        style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '40px', padding: '6px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
                      >
                        ⚠️ Suspender
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ATIVOS */}
        {guiasAtivos.length > 0 && (
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '24px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '22px' }}>🟢</div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>Guias Ativos</div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>{guiasAtivos.length} guia(s) ativo(s)</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {guiasAtivos.map((guia) => (
                <div
                  key={guia.id}
                  style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '16px',
                    padding: '14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        <div
                          onClick={() => router.push(`/guia/publico/${guia.id}`)}
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            backgroundColor: '#16a34a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            color: 'white',
                            overflow: 'hidden',
                            cursor: 'pointer'
                          }}
                        >
                          {guia.avatar_url ? <img src={guia.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{guia.nome?.charAt(0).toUpperCase() || 'G'}</span>}
                        </div>
                        <div>
                          <div
                            onClick={() => router.push(`/guia/publico/${guia.id}`)}
                            style={{ fontWeight: 'bold', fontSize: '15px', color: '#111827', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#16a34a' }}
                          >
                            {guia.nome}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>{guia.email}</div>
                          <div style={{ fontSize: '10px', color: '#9ca3af' }}>CPF: {guia.cpf}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => router.push(`/guia/publico/${guia.id}`)}
                        style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '40px', padding: '6px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
                      >
                        👤 Perfil
                      </button>
                      <button
                        onClick={() => setModalSuspensao({ isOpen: true, guia })}
                        style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '40px', padding: '6px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
                      >
                        ⚠️ Suspender
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUSPENSOS */}
        {guiasSuspensos.length > 0 && (
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '24px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '22px' }}>🔴</div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>Guias Suspensos</div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>{guiasSuspensos.length} guia(s) suspenso(s)</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {guiasSuspensos.map((guia) => (
                <div
                  key={guia.id}
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '16px',
                    padding: '14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        <div
                          onClick={() => router.push(`/guia/publico/${guia.id}`)}
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            backgroundColor: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            color: 'white',
                            overflow: 'hidden',
                            cursor: 'pointer'
                          }}
                        >
                          <span>{guia.nome?.charAt(0).toUpperCase() || 'G'}</span>
                        </div>
                        <div>
                          <div
                            onClick={() => router.push(`/guia/publico/${guia.id}`)}
                            style={{ fontWeight: 'bold', fontSize: '15px', color: '#111827', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#dc2626' }}
                          >
                            {guia.nome}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>{guia.email}</div>
                          <div style={{ fontSize: '10px', color: '#9ca3af' }}>CPF: {guia.cpf}</div>
                          {guia.suspenso_ate && (
                            <div style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px' }}>
                              ⏰ Suspenso até {new Date(guia.suspenso_ate).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                          {guia.motivo_suspensao && (
                            <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                              Motivo: {guia.motivo_suspensao}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => router.push(`/guia/publico/${guia.id}`)}
                        style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '40px', padding: '6px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
                      >
                        👤 Perfil
                      </button>
                      <button
                        onClick={() => reativarGuia(guia.id)}
                        style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '6px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
                      >
                        🔄 Reativar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {carregando && (
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '48px', textAlign: 'center', color: '#6b7280' }}>
            Carregando guias...
          </div>
        )}

        {!carregando && guiasFiltrados.length === 0 && busca && (
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>Nenhum guia encontrado</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Tente buscar por outro nome, e-mail ou CPF.</div>
          </div>
        )}

        {!carregando && guiasFiltrados.length === 0 && !busca && (
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>Nenhum guia cadastrado</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Os guias aparecerão aqui quando se cadastrarem.</div>
          </div>
        )}
      </div>
    </div>
  )
}