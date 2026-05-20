'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Avaliacao = {
  id: string
  nota: number
  comentario: string
  cliente_id: string
  cliente_nome: string
  cliente_avatar?: string
  created_at: string
}

type Roteiro = {
  id: string
  titulo: string
  descricao: string
  preco: number
  duracao_horas: number
  km: number
  dificuldade: string
  localizacao: string
  foto_capa?: string
  status: string
}

export default function PerfilPublicoGuia() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [guia, setGuia] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null)
  const [curtidas, setCurtidas] = useState<Record<string, number>>({})
  const [usuarioCurtiu, setUsuarioCurtiu] = useState<Record<string, boolean>>({})

  // Estatísticas
  const [stats, setStats] = useState({
    totalRoteiros: 0,
    totalReservas: 0,
    totalClientes: 0,
    avaliacaoMedia: 0,
    totalAvaliacoes: 0,
    medalhaNivel: 'bronze'
  })

  // Carrega usuário logado
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUsuarioLogado(JSON.parse(userData))
    }
  }, [])

  useEffect(() => {
    if (!id) return
    carregarDados()
  }, [id])

  const carregarDados = async () => {
    setCarregando(true)
    try {
      // Dados do guia
      const { data: guiaData, error: guiaError } = await supabase
        .from('users')
        .select('id, nome, email, avatar_url, bio, cadastur, cnpj, instagram, created_at, tipo, status')
        .eq('id', id)
        .eq('tipo', 'guia')
        .single()

      if (guiaError || !guiaData) {
        setCarregando(false)
        return
      }

      setGuia(guiaData)

      // Roteiros do guia (apenas aprovados)
      const { data: roteirosData } = await supabase
        .from('roteiros')
        .select('*')
        .eq('id_guia', id)
        .eq('status', 'aprovado')
        .order('created_at', { ascending: false })

      const roteirosList = roteirosData || []
      setRoteiros(roteirosList)

      // Estatísticas
      const roteirosIds = roteirosList.map(r => r.id)
      let totalReservas = 0
      let clientesUnicos = new Set()

      if (roteirosIds.length > 0) {
        const { data: reservas } = await supabase
          .from('reservas')
          .select('cliente_id')
          .in('roteiro_id', roteirosIds)
        
        totalReservas = reservas?.length || 0
        reservas?.forEach(r => clientesUnicos.add(r.cliente_id))
      }

      // Avaliações do guia
      const { data: avaliacoesData } = await supabase
        .from('avaliacoes')
        .select(`
          id,
          nota,
          comentario,
          created_at,
          cliente_id,
          cliente:cliente_id (nome, avatar_url)
        `)
        .eq('guia_id', id)
        .order('created_at', { ascending: false })

      const avaliacoesFormatadas = (avaliacoesData || []).map((a: any) => ({
        id: a.id,
        nota: a.nota,
        comentario: a.comentario,
        created_at: a.created_at,
        cliente_id: a.cliente_id,
        cliente_nome: a.cliente?.nome || 'Cliente',
        cliente_avatar: a.cliente?.avatar_url
      }))
      setAvaliacoes(avaliacoesFormatadas)

      const media = avaliacoesFormatadas.length
        ? avaliacoesFormatadas.reduce((acc, a) => acc + a.nota, 0) / avaliacoesFormatadas.length
        : 0

      // Medalha baseada em roteiros
      let medalha = 'bronze'
      if (roteirosList.length >= 10) medalha = 'black'
      else if (roteirosList.length >= 7) medalha = 'platina'
      else if (roteirosList.length >= 4) medalha = 'ouro'
      else if (roteirosList.length >= 2) medalha = 'prata'

      setStats({
        totalRoteiros: roteirosList.length,
        totalReservas,
        totalClientes: clientesUnicos.size,
        avaliacaoMedia: media,
        totalAvaliacoes: avaliacoesFormatadas.length,
        medalhaNivel: medalha
      })

      // Carregar curtidas das avaliações
      if (avaliacoesFormatadas.length > 0) {
        const avaliacaoIds = avaliacoesFormatadas.map(a => a.id)
        const { data: curtidasData } = await supabase
          .from('curtidas_avaliacoes')
          .select('avaliacao_id')
          .in('avaliacao_id', avaliacaoIds)
        
        const map: Record<string, number> = {}
        curtidasData?.forEach((c: any) => {
          map[c.avaliacao_id] = (map[c.avaliacao_id] || 0) + 1
        })
        setCurtidas(map)

        if (usuarioLogado && usuarioLogado.id !== id) {
          const { data: minhasCurtidas } = await supabase
            .from('curtidas_avaliacoes')
            .select('avaliacao_id')
            .eq('usuario_id', usuarioLogado.id)
            .in('avaliacao_id', avaliacaoIds)
          
          const curtidasMap: Record<string, boolean> = {}
          minhasCurtidas?.forEach((c: any) => {
            curtidasMap[c.avaliacao_id] = true
          })
          setUsuarioCurtiu(curtidasMap)
        }
      }

    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setCarregando(false)
    }
  }

  const curtirAvaliacao = async (avaliacaoId: string) => {
    if (!usuarioLogado) {
      router.push('/login')
      return
    }

    if (usuarioLogado.id === guia?.id) {
      return
    }

    if (usuarioCurtiu[avaliacaoId]) {
      const { error } = await supabase
        .from('curtidas_avaliacoes')
        .delete()
        .eq('avaliacao_id', avaliacaoId)
        .eq('usuario_id', usuarioLogado.id)

      if (!error) {
        setUsuarioCurtiu(prev => ({ ...prev, [avaliacaoId]: false }))
        setCurtidas(prev => ({ ...prev, [avaliacaoId]: Math.max((prev[avaliacaoId] || 0) - 1, 0) }))
      }
    } else {
      const { error } = await supabase
        .from('curtidas_avaliacoes')
        .insert({
          avaliacao_id: avaliacaoId,
          dono_id: guia?.id,
          usuario_id: usuarioLogado.id
        })

      if (!error) {
        setUsuarioCurtiu(prev => ({ ...prev, [avaliacaoId]: true }))
        setCurtidas(prev => ({ ...prev, [avaliacaoId]: (prev[avaliacaoId] || 0) + 1 }))
      }
    }
  }

  const handleVerRoteiro = (roteiroId: string) => {
    router.push(`/cliente/roteiros/${roteiroId}`)
  }

  const getDificuldadeCor = (dificuldade: string) => {
    switch (dificuldade?.toLowerCase()) {
      case 'fácil': return { bg: '#dcfce7', text: '#16a34a', label: '🟢 Fácil' }
      case 'médio': return { bg: '#fef3c7', text: '#f59e0b', label: '🟡 Médio' }
      case 'difícil': return { bg: '#fee2e2', text: '#dc2626', label: '🔴 Difícil' }
      default: return { bg: '#f3f4f6', text: '#6b7280', label: '⚪ Não definido' }
    }
  }

  const getMedalhaCor = (nivel: string) => {
    switch (nivel) {
      case 'bronze': return '#cd7f32'
      case 'prata': return '#c0c0c0'
      case 'ouro': return '#ffd700'
      case 'platina': return '#e5e4e2'
      case 'black': return '#111111'
      default: return '#cd7f32'
    }
  }

  const getMedalhaIcone = (nivel: string) => {
    switch (nivel) {
      case 'bronze': return '🥉'
      case 'prata': return '🥈'
      case 'ouro': return '🥇'
      case 'platina': return '💎'
      case 'black': return '🖤'
      default: return '🥉'
    }
  }

  const getMedalhaNome = (nivel: string) => {
    switch (nivel) {
      case 'bronze': return 'Bronze'
      case 'prata': return 'Prata'
      case 'ouro': return 'Ouro'
      case 'platina': return 'Platina'
      case 'black': return 'Black'
      default: return 'Bronze'
    }
  }

  const getNotaEstrelas = (nota: number) => {
    const estrelasCheias = '★'.repeat(nota)
    const estrelasVazias = '☆'.repeat(5 - nota)
    return estrelasCheias + estrelasVazias
  }

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏔️</div>
          <div style={{ color: '#6b7280' }}>Carregando perfil do guia...</div>
        </div>
      </div>
    )
  }

  if (!guia) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏔️</div>
          <div style={{ color: '#6b7280' }}>Guia não encontrado</div>
          <button onClick={() => router.back()} style={{ marginTop: '16px', backgroundColor: '#16a34a', color: 'white', padding: '8px 24px', borderRadius: '40px', border: 'none', cursor: 'pointer' }}>Voltar</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* CABEÇALHO */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a', margin: 0 }}>🏔️ PrussikTrails</h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>Perfil do Guia</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={() => router.back()} style={{ backgroundColor: '#f3f4f6', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', color: '#374151', fontWeight: '600', fontSize: '13px' }}>← Voltar</button>
            {usuarioLogado?.tipo === 'cliente' && (
              <button onClick={() => router.push('/cliente/dashboard')} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Meu Dashboard</button>
            )}
            {usuarioLogado?.tipo === 'guia' && usuarioLogado?.id === guia.id && (
              <button onClick={() => router.push('/guia/perfil')} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Editar Perfil</button>
            )}
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* CARD PRINCIPAL DO PERFIL */}
        <div style={{ backgroundColor: 'white', borderRadius: '28px', padding: '28px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Avatar */}
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {guia.avatar_url ? (
                <img src={guia.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '48px', color: 'white' }}>{guia.nome?.charAt(0).toUpperCase() || 'G'}</span>
              )}
            </div>

            {/* Informações */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#111827' }}>{guia.nome || 'Guia'}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#f3f4f6', padding: '4px 12px', borderRadius: '20px' }}>
                  <span style={{ fontSize: '16px' }}>{getMedalhaIcone(stats.medalhaNivel)}</span>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: getMedalhaCor(stats.medalhaNivel) }}>{getMedalhaNome(stats.medalhaNivel)}</span>
                </div>
              </div>
              
              <p style={{ color: '#6b7280', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>📅 Guia desde {new Date(guia.created_at).getFullYear()}</span>
                {guia.cadastur && <><span style={{ width: '4px', height: '4px', backgroundColor: '#d1d5db', borderRadius: '50%' }}></span><span>✅ Cadastur {guia.cadastur}</span></>}
              </p>

              {/* Estatísticas rápidas */}
              <div style={{ display: 'flex', gap: '24px', marginTop: '20px', flexWrap: 'wrap' }}>
                <div><span style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{stats.totalRoteiros}</span> <span style={{ color: '#6b7280' }}>Roteiros</span></div>
                <div><span style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{stats.totalReservas}</span> <span style={{ color: '#6b7280' }}>Reservas</span></div>
                <div><span style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{stats.totalClientes}</span> <span style={{ color: '#6b7280' }}>Clientes</span></div>
                <div><span style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.avaliacaoMedia.toFixed(1)}</span> <span style={{ color: '#6b7280' }}>({stats.totalAvaliacoes}) avaliações</span></div>
              </div>

              {/* BIO */}
              {guia.bio && (
                <div style={{ marginTop: '20px', backgroundColor: '#f9fafb', padding: '16px', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                  <p style={{ margin: 0, lineHeight: 1.6, color: '#4b5563', fontSize: '14px' }}>{guia.bio}</p>
                </div>
              )}

              {/* Redes e documentos */}
              <div style={{ marginTop: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {guia.instagram && (
                  <a href={`https://instagram.com/${guia.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f3f4f6', padding: '6px 12px', borderRadius: '20px', textDecoration: 'none', color: '#374151', fontSize: '13px' }}>
                    <span>📷</span> {guia.instagram}
                  </a>
                )}
                {guia.cnpj && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f3f4f6', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', color: '#374151' }}>
                    <span>🏢</span> CNPJ: {guia.cnpj}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 🗺️ ROTEIROS DO GUIA */}
        {roteiros.length > 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '28px', padding: '28px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <span style={{ fontSize: '28px' }}>🗺️</span>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#111827' }}>Roteiros Disponíveis</h3>
                <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{stats.totalRoteiros} roteiros criados por {guia.nome}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {roteiros.map((roteiro) => {
                const dificuldadeInfo = getDificuldadeCor(roteiro.dificuldade)
                return (
                  <div
                    key={roteiro.id}
                    onClick={() => handleVerRoteiro(roteiro.id)}
                    style={{
                      backgroundColor: '#f9fafb',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      border: '1px solid #e5e7eb'
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
                    {roteiro.foto_capa ? (
                      <img src={roteiro.foto_capa} alt={roteiro.titulo} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '140px', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '48px' }}>🏔️</span>
                      </div>
                    )}
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#111827' }}>{roteiro.titulo}</h4>
                        <span style={{ backgroundColor: dificuldadeInfo.bg, color: dificuldadeInfo.text, padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '600' }}>
                          {dificuldadeInfo.label}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', lineHeight: 1.4 }}>
                        {roteiro.descricao?.length > 80 ? `${roteiro.descricao.substring(0, 80)}...` : roteiro.descricao}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: '#6b7280' }}>📍 {roteiro.localizacao}</span>
                          <span style={{ fontSize: '11px', color: '#6b7280' }}>🥾 {roteiro.km} km</span>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#16a34a' }}>R$ {roteiro.preco}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 🏅 CONQUISTAS DO GUIA - ACIMA DAS AVALIAÇÕES */}
        <div style={{ backgroundColor: 'white', borderRadius: '28px', padding: '28px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <span style={{ fontSize: '28px' }}>🏅</span>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#111827' }}>Conquistas</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Metas alcançadas por {guia.nome}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ backgroundColor: stats.totalRoteiros >= 1 ? '#dcfce7' : '#f9fafb', borderRadius: '16px', padding: '16px', textAlign: 'center', border: stats.totalRoteiros >= 1 ? '1px solid #bbf7d0' : '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗺️</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#111827' }}>Primeiro Roteiro</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{stats.totalRoteiros >= 1 ? '✅ Desbloqueado' : '🔒 Não desbloqueado'}</div>
            </div>
            <div style={{ backgroundColor: stats.totalReservas >= 1 ? '#dcfce7' : '#f9fafb', borderRadius: '16px', padding: '16px', textAlign: 'center', border: stats.totalReservas >= 1 ? '1px solid #bbf7d0' : '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#111827' }}>Primeira Reserva</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{stats.totalReservas >= 1 ? '✅ Desbloqueado' : '🔒 Aguardando'}</div>
            </div>
            <div style={{ backgroundColor: stats.totalAvaliacoes >= 5 ? '#dcfce7' : '#f9fafb', borderRadius: '16px', padding: '16px', textAlign: 'center', border: stats.totalAvaliacoes >= 5 ? '1px solid #bbf7d0' : '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⭐</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#111827' }}>5 Avaliações</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{stats.totalAvaliacoes >= 5 ? '✅ Desbloqueado' : `🔒 ${stats.totalAvaliacoes}/5`}</div>
            </div>
            <div style={{ backgroundColor: stats.totalClientes >= 10 ? '#dcfce7' : '#f9fafb', borderRadius: '16px', padding: '16px', textAlign: 'center', border: stats.totalClientes >= 10 ? '1px solid #bbf7d0' : '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#111827' }}>10 Clientes</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{stats.totalClientes >= 10 ? '✅ Desbloqueado' : `🔒 ${stats.totalClientes}/10`}</div>
            </div>
          </div>
        </div>

        {/* 💬 AVALIAÇÕES DOS CLIENTES - ABAIXO DAS CONQUISTAS */}
        <div style={{ backgroundColor: 'white', borderRadius: '28px', padding: '28px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <span style={{ fontSize: '28px' }}>💬</span>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#111827' }}>Avaliações dos Clientes</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>O que estão falando sobre {guia.nome}</p>
            </div>
          </div>

          {stats.totalAvaliacoes === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', backgroundColor: '#f9fafb', borderRadius: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
              <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>Nenhuma avaliação ainda</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Os primeiros clientes vão avaliar em breve!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {avaliacoes.map((avaliacao) => (
                <div key={avaliacao.id} style={{ backgroundColor: '#f9fafb', borderRadius: '20px', padding: '20px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <div 
                      onClick={() => router.push(`/cliente/publico/${avaliacao.cliente_id}`)} 
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                    >
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                        {avaliacao.cliente_nome?.charAt(0).toUpperCase() || 'C'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#111827' }}>{avaliacao.cliente_nome}</div>
                        <div style={{ fontSize: '12px', color: '#f59e0b' }}>{getNotaEstrelas(avaliacao.nota)}</div>
                      </div>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>{new Date(avaliacao.created_at).toLocaleDateString('pt-BR')}</div>
                      {usuarioLogado && usuarioLogado.id !== guia.id && (
                        <button
                          onClick={() => curtirAvaliacao(avaliacao.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                        >
                          {usuarioCurtiu[avaliacao.id] ? '❤️' : '🤍'}
                        </button>
                      )}
                      {!usuarioLogado && (
                        <span style={{ fontSize: '18px', opacity: 0.5 }}>🤍</span>
                      )}
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>{curtidas[avaliacao.id] || 0}</span>
                    </div>
                  </div>
                  {avaliacao.comentario && <p style={{ margin: 0, fontSize: '14px', color: '#4b5563', lineHeight: 1.5 }}>“{avaliacao.comentario}”</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}