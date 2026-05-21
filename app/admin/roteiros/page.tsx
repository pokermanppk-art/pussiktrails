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
      const { count: pendentesCount } = await supabase
        .from('roteiros')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'aguardando')
      setTotalPendentes(pendentesCount || 0)

      const { data: pendentesData } = await supabase
        .from('roteiros')
        .select('id, titulo, localizacao, km, preco, guia_id, created_at')
        .eq('status', 'aguardando')
        .order('created_at', { ascending: false })
        .limit(5)

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

      const { count: ativosCount } = await supabase
        .from('roteiros')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo')
      setTotalAtivos(ativosCount || 0)

      const { count: modificacoesCount } = await supabase
        .from('roteiros')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente_modificacao')
      setTotalModificacoes(modificacoesCount || 0)

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
      <style jsx global>{`
        @media (min-width: 768px) {
          .stats-grid { grid-template-columns: repeat(4, 1fr) !important; }
          .pendente-card { flex-direction: row !important; flex-wrap: wrap !important; }
        }
      `}</style>

      {/* HEADER */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', color: '#dc2626', fontWeight: 'bold' }}>📋 Gerenciar Roteiros</h1>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#6b7280' }}>Visão geral, roteiros em alta e solicitações</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => router.push('/admin/dashboard')} style={{ backgroundColor: '#f3f4f6', border: 'none', borderRadius: '40px', padding: '6px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>← Dashboard</button>
            <button onClick={() => { localStorage.removeItem('user'); router.push('/login') }} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '40px', padding: '6px 16px', cursor: 'pointer', fontSize: '12px' }}>Sair</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px' }}>
        
        {/* CARDS DE ESTATÍSTICAS */}
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div onClick={() => router.push('/admin/roteiros/pendentes')} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🟡</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706' }}>{totalPendentes}</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>Roteiros Pendentes</div>
          </div>
          <div onClick={() => router.push('/admin/roteiros/ativos')} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🟢</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{totalAtivos}</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>Roteiros Ativos</div>
          </div>
          <div onClick={() => router.push('/admin/roteiros/modificacoes')} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>✏️</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: totalModificacoes > 0 ? '#dc2626' : '#3b82f6' }}>{totalModificacoes}</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>Modificações</div>
          </div>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>📊</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6b7280' }}>{totalPendentes + totalAtivos + totalModificacoes}</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>Total de Roteiros</div>
          </div>
        </div>

        {/* ROTEIROS PENDENTES */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '24px' }}>⏳</span>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Roteiros Pendentes</h2>
            {totalPendentes > 0 && <span style={{ backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold', color: '#d97706' }}>{totalPendentes}</span>}
          </div>

          {carregando ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>Carregando...</div>
          ) : roteirosPendentes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', backgroundColor: '#f9fafb', borderRadius: '16px' }}>
              <div style={{ fontSize: '32px' }}>✅</div>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>Nenhum roteiro pendente</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {roteirosPendentes.map((roteiro) => (
                <div key={roteiro.id} onClick={() => router.push(`/admin/roteiros/${roteiro.id}`)} style={{ backgroundColor: '#fefce8', borderRadius: '16px', padding: '12px', cursor: 'pointer', border: '1px solid #fef08a', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', flex: 1 }}>{roteiro.titulo}</div>
                    <div><span style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a' }}>R$ {roteiro.preco}</span></div>
                    <div><span style={{ fontSize: '11px', color: '#6b7280' }}>👤 {roteiro.guia_nome}</span></div>
                    <span style={{ backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold', color: '#d97706' }}>⏳ Pendente</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {totalPendentes > 5 && <button onClick={() => router.push('/admin/roteiros/pendentes')} style={{ marginTop: '12px', color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', width: '100%', textAlign: 'center' }}>Ver todos →</button>}
        </div>

        {/* ROTEIROS EM ALTA */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '24px' }}>🔥</span>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Roteiros em Alta</h2>
          </div>

          {carregando ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>Carregando...</div>
          ) : roteirosEmAlta.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', backgroundColor: '#f9fafb', borderRadius: '16px' }}>
              <div style={{ fontSize: '32px' }}>🔥</div>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>Nenhum roteiro em alta ainda</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {roteirosEmAlta.map((roteiro, idx) => (
                <div key={roteiro.id} onClick={() => router.push(`/admin/roteiros/${roteiro.id}`)} style={{ backgroundColor: idx < 3 ? '#fefce8' : '#f9fafb', borderRadius: '16px', padding: '12px', cursor: 'pointer', border: idx < 3 ? '1px solid #fef08a' : '1px solid #e5e7eb', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '📌'}</span>
                      <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{roteiro.titulo}</span>
                    </div>
                    <div><span style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a' }}>R$ {roteiro.preco}</span></div>
                    <div><span style={{ backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold', color: '#16a34a' }}>🔥 {roteiro.total_reservas}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}