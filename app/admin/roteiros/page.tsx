'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type RoteiroPendente = {
  id: string
  titulo: string
  localizacao: string
  km: number
  preco: number
  guia_nome: string
  guia_id: string
  created_at: string
}

type RoteiroEmAlta = {
  id: string
  titulo: string
  localizacao: string
  km: number
  preco: number
  total_reservas: number
  guia_nome: string
}

export default function AdminRoteiros() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [totalPendentes, setTotalPendentes] = useState(0)
  const [totalAtivos, setTotalAtivos] = useState(0)
  const [totalModificacoes, setTotalModificacoes] = useState(0)
  const [roteirosPendentes, setRoteirosPendentes] = useState<RoteiroPendente[]>([])
  const [roteirosEmAlta, setRoteirosEmAlta] = useState<RoteiroEmAlta[]>([])
  const [carregando, setCarregando] = useState(true)

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
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setCarregando(true)
    try {
      // Contar roteiros pendentes
      const { count: pendentesCount } = await supabase
        .from('roteiros')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'aguardando')
      setTotalPendentes(pendentesCount || 0)

      // Buscar roteiros pendentes (últimos 3)
      const { data: pendentesData } = await supabase
        .from('roteiros')
        .select('id, titulo, localizacao, km, preco, guia_id, created_at')
        .eq('status', 'aguardando')
        .order('created_at', { ascending: false })
        .limit(3)

      if (pendentesData && pendentesData.length > 0) {
        const guiaIds = [...new Set(pendentesData.map(r => r.guia_id).filter(Boolean))]
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

        const pendentesFormatados: RoteiroPendente[] = pendentesData.map(roteiro => ({
          id: roteiro.id,
          titulo: roteiro.titulo,
          localizacao: roteiro.localizacao || '-',
          km: roteiro.km || 0,
          preco: roteiro.preco || 0,
          guia_nome: roteiro.guia_id ? (guiaMap[roteiro.guia_id] || 'Guia') : 'Guia',
          guia_id: roteiro.guia_id,
          created_at: roteiro.created_at
        }))
        setRoteirosPendentes(pendentesFormatados)
      }

      // Contar roteiros ativos
      const { count: ativosCount } = await supabase
        .from('roteiros')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo')
      setTotalAtivos(ativosCount || 0)

      // Contar solicitações de modificação
      const { count: modificacoesCount } = await supabase
        .from('roteiros')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente_modificacao')
      setTotalModificacoes(modificacoesCount || 0)

      // Roteiros em Alta (mais reservados - TOP 5)
      const { data: reservasData } = await supabase
        .from('reservas')
        .select('roteiro_id')
        .eq('status', 'realizada')

      if (reservasData && reservasData.length > 0) {
        const contagem: Record<string, number> = {}
        reservasData.forEach((reserva: { roteiro_id: string }) => {
          contagem[reserva.roteiro_id] = (contagem[reserva.roteiro_id] || 0) + 1
        })

        const roteirosCount = Object.entries(contagem)
          .map(([roteiro_id, total]) => ({ roteiro_id, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5)

        if (roteirosCount.length > 0) {
          const roteirosIds = roteirosCount.map(item => item.roteiro_id)
          const { data: roteirosInfo } = await supabase
            .from('roteiros')
            .select('id, titulo, localizacao, km, preco, guia_id')
            .in('id', roteirosIds)

          const guiaIds = [...new Set(roteirosInfo?.map(r => r.guia_id).filter(Boolean) || [])]
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

          const emAlta: RoteiroEmAlta[] = roteirosCount.map(item => {
            const info = roteirosInfo?.find((r: any) => r.id === item.roteiro_id)
            return {
              id: item.roteiro_id,
              titulo: info?.titulo || 'Roteiro',
              localizacao: info?.localizacao || '-',
              km: info?.km || 0,
              preco: info?.preco || 0,
              total_reservas: item.total,
              guia_nome: info?.guia_id ? (guiaMap[info.guia_id] || 'Guia') : 'Guia'
            }
          })

          setRoteirosEmAlta(emAlta)
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setCarregando(false)
    }
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
      {/* HEADER MODERNO */}
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
              📋 Gerenciar Roteiros
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
              Visão geral, roteiros em alta e solicitações de guias
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => router.push('/admin/dashboard')}
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
              ← Voltar ao Dashboard
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
        {/* CARDS DE ESTATÍSTICAS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px'
          }}
        >
          <div
            onClick={() => router.push('/admin/roteiros/pendentes')}
            style={{
              backgroundColor: 'white',
              borderRadius: '24px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '24px' }}>🟡</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: '800', color: '#d97706', lineHeight: 1 }}>
                  {totalPendentes}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>Roteiros Pendentes</div>
              </div>
              <div style={{ fontSize: '20px', color: '#d97706' }}>→</div>
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#9ca3af' }}>
              Aguardando aprovação
            </div>
          </div>

          <div
            onClick={() => router.push('/admin/roteiros/ativos')}
            style={{
              backgroundColor: 'white',
              borderRadius: '24px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '24px' }}>🟢</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: '800', color: '#16a34a', lineHeight: 1 }}>
                  {totalAtivos}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>Roteiros Ativos</div>
              </div>
              <div style={{ fontSize: '20px', color: '#16a34a' }}>→</div>
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#9ca3af' }}>
              Publicados no marketplace
            </div>
          </div>

          <div
            onClick={() => router.push('/admin/roteiros/modificacoes')}
            style={{
              backgroundColor: 'white',
              borderRadius: '24px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '24px' }}>✏️</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: '800', color: totalModificacoes > 0 ? '#dc2626' : '#3b82f6', lineHeight: 1 }}>
                  {totalModificacoes}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>Solicitações de Modificação</div>
              </div>
              <div style={{ fontSize: '20px', color: '#3b82f6' }}>→</div>
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: totalModificacoes > 0 ? '#dc2626' : '#9ca3af' }}>
              {totalModificacoes > 0 ? `${totalModificacoes} aguardando análise` : 'Nenhuma solicitação pendente'}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <div>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '24px' }}>📊</span>
              </div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#6b7280', lineHeight: 1 }}>
                {totalPendentes + totalAtivos + totalModificacoes}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>Total de Roteiros</div>
            </div>
          </div>
        </div>

        {/* SEÇÃO: ROTEIROS PENDENTES (NOVO CARD ACIMA) */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '28px',
            padding: '28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '20px' }}>⏳</span>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>Roteiros Pendentes</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                Aguardando aprovação do administrador
              </p>
            </div>
            {totalPendentes > 3 && (
              <button
                onClick={() => router.push('/admin/roteiros/pendentes')}
                style={{ marginLeft: 'auto', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '20px', padding: '6px 16px', fontSize: '12px', cursor: 'pointer', color: '#6b7280' }}
              >
                Ver todos ({totalPendentes}) →
              </button>
            )}
          </div>

          {carregando ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>Carregando...</div>
          ) : roteirosPendentes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', backgroundColor: '#f9fafb', borderRadius: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
              <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>Nenhum roteiro pendente</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Todos os roteiros foram aprovados ou estão em análise.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {roteirosPendentes.map((roteiro) => (
                <div
                  key={roteiro.id}
                  onClick={() => router.push(`/admin/roteiros/${roteiro.id}`)}
                  style={{
                    backgroundColor: '#fefce8',
                    borderRadius: '16px',
                    padding: '16px',
                    border: '1px solid #fef08a',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '24px' }}>📝</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#111827' }}>{roteiro.titulo}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{roteiro.localizacao}</div>
                    </div>
                    <div style={{ minWidth: '80px' }}>
                      <span style={{ backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '12px', fontSize: '12px' }}>🥾 {roteiro.km} KM</span>
                    </div>
                    <div style={{ minWidth: '80px' }}>
                      <span style={{ fontWeight: 'bold', color: '#16a34a' }}>R$ {roteiro.preco}</span>
                    </div>
                    <div style={{ minWidth: '120px', fontSize: '12px', color: '#6b7280' }}>
                      👤 {roteiro.guia_nome}
                    </div>
                    <div>
                      <span style={{ backgroundColor: '#fef3c7', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', color: '#d97706' }}>
                        ⏳ Aguardando
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SEÇÃO: ROTEIROS EM ALTA */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '28px',
            padding: '28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '20px' }}>🔥</span>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>Roteiros em Alta</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                Os mais reservados da plataforma
              </p>
            </div>
          </div>

          {carregando ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>Carregando...</div>
          ) : roteirosEmAlta.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#f9fafb', borderRadius: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔥</div>
              <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>Nenhum roteiro em alta ainda</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Os roteiros mais reservados aparecerão aqui.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {roteirosEmAlta.map((roteiro, index: number) => {
                const medalha = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📌'
                return (
                  <div
                    key={roteiro.id}
                    onClick={() => router.push(`/admin/roteiros/${roteiro.id}`)}
                    style={{
                      backgroundColor: index < 3 ? '#fefce8' : '#f9fafb',
                      borderRadius: '16px',
                      padding: '16px',
                      border: index < 3 ? '1px solid #fef08a' : '1px solid #e5e7eb',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '24px' }}>{medalha}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#111827' }}>{roteiro.titulo}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{roteiro.localizacao}</div>
                      </div>
                      <div style={{ minWidth: '80px' }}>
                        <span style={{ backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '12px', fontSize: '12px' }}>🥾 {roteiro.km} KM</span>
                      </div>
                      <div style={{ minWidth: '80px' }}>
                        <span style={{ fontWeight: 'bold', color: '#16a34a' }}>R$ {roteiro.preco}</span>
                      </div>
                      <div style={{ minWidth: '80px' }}>
                        <span style={{ backgroundColor: '#dcfce7', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', color: '#16a34a' }}>
                          🔥 {roteiro.total_reservas} reservas
                        </span>
                      </div>
                      <div style={{ minWidth: '120px', fontSize: '12px', color: '#6b7280' }}>
                        👤 {roteiro.guia_nome}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}