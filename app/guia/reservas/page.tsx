'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import ResponsiveTable from '@/components/ResponsiveTable'

export default function GuiaReservas() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userNome, setUserNome] = useState<string>('Carregando...')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [reservas, setReservas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }
    const parsedUser = JSON.parse(userData)
    if (parsedUser.tipo !== 'guia') {
      router.push('/login')
      return
    }
    setUser(parsedUser)
    setUserNome(parsedUser.nome || 'Guia')
    setAvatarUrl(parsedUser.avatar_url)
    carregarDados(parsedUser.id)
  }, [router])

  const carregarDados = async (guiaId: string) => {
    setCarregando(true)
    setErro(null)
    
    try {
      const { data: roteiros, error: roteirosError } = await supabase
        .from('roteiros')
        .select('id, titulo')
        .eq('id_guia', guiaId)

      if (roteirosError) throw roteirosError

      if (!roteiros || roteiros.length === 0) {
        setReservas([])
        setCarregando(false)
        return
      }

      const roteiroIds = roteiros.map(r => r.id)

      const { data: reservasData, error: reservasError } = await supabase
        .from('reservas')
        .select('*')
        .in('roteiro_id', roteiroIds)
        .order('created_at', { ascending: false })

      if (reservasError) throw reservasError

      if (!reservasData || reservasData.length === 0) {
        setReservas([])
        setCarregando(false)
        return
      }

      const clienteIds = [...new Set(reservasData.map(r => r.cliente_id).filter(Boolean))]
      let clientesMap: Record<string, any> = {}
      if (clienteIds.length > 0) {
        const { data: clientesData } = await supabase
          .from('users')
          .select('id, nome, celular')
          .in('id', clienteIds)
        
        if (clientesData) {
          clientesMap = clientesData.reduce((acc, cliente) => {
            acc[cliente.id] = cliente
            return acc
          }, {} as Record<string, any>)
        }
      }

      const { data: roteirosDetalhes } = await supabase
        .from('roteiros')
        .select('id, titulo, foto_capa')
        .in('id', roteiroIds)

      let roteirosMap: Record<string, any> = {}
      if (roteirosDetalhes) {
        roteirosMap = roteirosDetalhes.reduce((acc, roteiro) => {
          acc[roteiro.id] = roteiro
          return acc
        }, {} as Record<string, any>)
      }

      const reservasCompletas = reservasData.map(reserva => ({
        ...reserva,
        cliente: clientesMap[reserva.cliente_id] || null,
        roteiro: roteirosMap[reserva.roteiro_id] || null
      }))

      setReservas(reservasCompletas)
      
    } catch (err: any) {
      console.error('Erro:', err)
      setErro(err?.message || 'Erro desconhecido')
    } finally {
      setCarregando(false)
    }
  }

  const avaliarCliente = async (reservaId: string) => {
    router.push(`/guia/avaliar-cliente/${reservaId}`)
  }

  const confirmarRealizacao = async (reservaId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('reservas')
        .update({ guia_confirmou: true })
        .eq('id', reservaId)

      if (updateError) throw updateError

      const { data: reserva } = await supabase
        .from('reservas')
        .select('cliente_confirmou')
        .eq('id', reservaId)
        .single()

      if (reserva?.cliente_confirmou) {
        await supabase
          .from('reservas')
          .update({ status: 'realizada' })
          .eq('id', reservaId)
      }

      if (user) await carregarDados(user.id)
    } catch (err: any) {
      setErro(`Erro ao confirmar realização: ${err.message}`)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  // Configuração das colunas para a tabela responsiva
  const columns = [
    { 
      key: 'cliente', 
      header: 'Cliente', 
      mobileLabel: '👤 Cliente',
      render: (value: any, item: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{item.cliente?.nome || 'Cliente'}</div>
        </div>
      )
    },
    { 
      key: 'telefone', 
      header: 'Contato', 
      mobileLabel: '📞 Contato',
      hideOnMobile: true,
      render: (value: any, item: any) => {
        const podeMostrar = item.status === 'confirmada' || item.status === 'realizada'
        return podeMostrar ? (
          <span>{item.cliente?.celular || '-'}</span>
        ) : (
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>🔒 Aguarde confirmação</span>
        )
      }
    },
    { 
      key: 'roteiro', 
      header: 'Roteiro', 
      mobileLabel: '🏔️ Roteiro',
      render: (value: any, item: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{item.roteiro?.titulo || '-'}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>ID: {item.roteiro_id?.slice(-6) || '-'}</div>
        </div>
      )
    },
    { 
      key: 'pessoas', 
      header: 'Pessoas', 
      mobileLabel: '👥 Qtd',
      align: 'center' as const,
      render: (value: any, item: any) => item.quantidade_pessoas
    },
    { 
      key: 'valor', 
      header: 'Valor', 
      mobileLabel: '💰 Valor',
      align: 'center' as const,
      render: (value: any, item: any) => (
        <span style={{ fontWeight: 600, color: '#16a34a' }}>
          R$ {Number(item.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    { 
      key: 'data', 
      header: 'Data', 
      mobileLabel: '📅 Data',
      render: (value: any, item: any) => item.data_trilha ? new Date(item.data_trilha).toLocaleDateString('pt-BR') : '-'
    },
    { 
      key: 'status', 
      header: 'Status', 
      mobileLabel: '📌 Status',
      align: 'center' as const,
      render: (value: any, item: any) => {
        let text = ''
        let bg = '#f3f4f6'
        let color = '#6b7280'
        
        if (item.status === 'realizada') {
          text = '✓ Realizada'
          bg = '#e0e7ff'
          color = '#4f46e5'
        } else if (item.status === 'confirmada') {
          text = '✓ Confirmada'
          bg = '#dcfce7'
          color = '#16a34a'
        } else if (item.status === 'pendente') {
          text = '⏳ Pendente'
          bg = '#fef3c7'
          color = '#d97706'
        } else if (item.status === 'cancelada') {
          text = '✗ Cancelada'
          bg = '#fee2e2'
          color = '#dc2626'
        }
        
        return (
          <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', backgroundColor: bg, color: color }}>
            {text}
          </span>
        )
      }
    },
    { 
      key: 'acoes', 
      header: 'Ações', 
      mobileLabel: '⚡ Ações',
      align: 'center' as const,
      render: (value: any, item: any) => {
        const precisaAvaliar = item.status === 'confirmada' && !item.avaliacao_guia_nota
        const precisaConfirmarRealizacao = item.status === 'confirmada' && !item.guia_confirmou && item.avaliacao_guia_nota
        
        return (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {precisaAvaliar && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  avaliarCliente(item.id)
                }}
                style={{ backgroundColor: '#8b5cf6', color: 'white', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
              >
                ⭐ Avaliar
              </button>
            )}
            {precisaConfirmarRealizacao && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  confirmarRealizacao(item.id)
                }}
                style={{ backgroundColor: '#3b82f6', color: 'white', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
              >
                ✅ Confirmar
              </button>
            )}
            {item.status === 'realizada' && (
              <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 500 }}>✓ Concluída</span>
            )}
          </div>
        )
      }
    }
  ]

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <p>Carregando...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* CABEÇALHO SECUNDÁRIO */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>🏔️ PrussikTrails</h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>Gestão de Reservas</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={() => router.push('/guia/dashboard')} style={{ backgroundColor: '#f3f4f6', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', color: '#374151', fontWeight: '600', fontSize: '13px' }}>
              ← Voltar
            </button>
            <button onClick={() => router.push('/guia/perfil')} style={{ backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
              Perfil
            </button>
            <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>📋 Reservas dos Meus Roteiros</h2>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>Acompanhe as reservas feitas pelos clientes</p>
        </div>

        {erro && (
          <div style={{ marginBottom: '20px', padding: '12px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#dc2626', textAlign: 'center' }}>
            ⚠️ {erro}
          </div>
        )}

        <ResponsiveTable
          columns={columns}
          data={reservas}
          keyExtractor={(item: any) => item.id}
          emptyMessage="Nenhuma reserva encontrada para seus roteiros."
          loading={carregando}
        />

        {!carregando && reservas.length === 0 && !erro && (
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button 
              onClick={() => router.push('/guia/roteiros')}
              style={{ backgroundColor: '#16a34a', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
            >
              Ver meus roteiros
            </button>
          </div>
        )}
      </div>
    </div>
  )
}