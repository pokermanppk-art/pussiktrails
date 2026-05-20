'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import UploadAvatarModal from '@/components/UploadAvatarModal'

type Avaliacao = {
  id: string
  nota: number
  comentario: string
  cliente_id: string
  cliente_nome: string
  cliente_avatar?: string
  created_at: string
}

export default function PerfilGuia() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [guia, setGuia] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [bio, setBio] = useState('')
  const [editandoBio, setEditandoBio] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [mensagem, setMensagem] = useState('')
  const [curtidas, setCurtidas] = useState<Record<string, number>>({})
  const [usuarioCurtiu, setUsuarioCurtiu] = useState<Record<string, boolean>>({})
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null)

  // Estatísticas do guia
  const [stats, setStats] = useState({
    totalRoteiros: 0,
    totalReservas: 0,
    totalClientes: 0,
    avaliacaoMedia: 0,
    totalAvaliacoes: 0,
    medalhaNivel: 'bronze'
  })

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
    setUsuarioLogado(parsedUser)
    setUser(parsedUser)
    carregarDados(parsedUser.id)
  }, [])

  const carregarDados = async (guiaId: string) => {
    setCarregando(true)
    try {
      // Dados do guia
      const { data: guiaData } = await supabase
        .from('users')
        .select('*')
        .eq('id', guiaId)
        .single()

      if (guiaData) {
        setGuia(guiaData)
        setBio(guiaData.bio || '')
        if (guiaData.avatar_url) setAvatarPreview(guiaData.avatar_url)
      }

      // Roteiros do guia
      const { data: roteiros } = await supabase
        .from('roteiros')
        .select('id')
        .eq('id_guia', guiaId)

      const totalRoteiros = roteiros?.length || 0
      const roteirosIds = roteiros?.map(r => r.id) || []

      // Reservas dos roteiros
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
        .eq('guia_id', guiaId)
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

        if (usuarioLogado) {
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

      const media = avaliacoesFormatadas.length
        ? avaliacoesFormatadas.reduce((acc, a) => acc + a.nota, 0) / avaliacoesFormatadas.length
        : 0

      // Medalha baseada em roteiros aprovados
      let medalha = 'bronze'
      if (totalRoteiros >= 10) medalha = 'black'
      else if (totalRoteiros >= 7) medalha = 'platina'
      else if (totalRoteiros >= 4) medalha = 'ouro'
      else if (totalRoteiros >= 2) medalha = 'prata'

      setStats({
        totalRoteiros,
        totalReservas,
        totalClientes: clientesUnicos.size,
        avaliacaoMedia: media,
        totalAvaliacoes: avaliacoesFormatadas.length,
        medalhaNivel: medalha
      })
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setCarregando(false)
    }
  }

  const carregarBio = async (userId: string) => {
    try {
      const response = await fetch(`/api/guia/bio?userId=${userId}`)
      const result = await response.json()
      
      if (result.success) {
        setBio(result.bio || '')
      } else {
        console.error('Erro ao carregar bio:', result.error)
        setBio('')
      }
    } catch (error) {
      console.error('Erro ao carregar bio:', error)
      setBio('')
    }
  }

  const curtirAvaliacao = async (avaliacaoId: string, clienteId: string) => {
    if (!usuarioLogado) {
      router.push('/login')
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
          dono_id: clienteId,
          usuario_id: usuarioLogado.id
        })

      if (!error) {
        setUsuarioCurtiu(prev => ({ ...prev, [avaliacaoId]: true }))
        setCurtidas(prev => ({ ...prev, [avaliacaoId]: (prev[avaliacaoId] || 0) + 1 }))
      }
    }
  }

  // ✅ SALVAR BIO VIA API (corrigido)
  const salvarBio = async () => {
    if (!user?.id) {
      setMensagem('❌ Usuário não identificado')
      return
    }

    setMensagem('')
    setEditandoBio(false)

    try {
      const response = await fetch('/api/guia/bio', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          bio: bio
        })
      })

      const result = await response.json()

      if (result.success) {
        setMensagem('✅ Biografia atualizada!')
        setUser((prev: any) => ({ ...prev, bio: bio }))
        setGuia((prev: any) => ({ ...prev, bio: bio }))
      } else {
        setMensagem(`❌ ${result.error}`)
        await carregarBio(user.id)
      }
    } catch (error) {
      console.error('Erro ao salvar bio:', error)
      setMensagem('❌ Erro ao conectar com o servidor')
      await carregarBio(user.id)
    }

    setTimeout(() => setMensagem(''), 3000)
  }

  const cancelarEdicaoBio = () => {
    setEditandoBio(false)
    carregarBio(user.id)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
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

  const getProximoNivel = (nivel: string) => {
    switch (nivel) {
      case 'bronze': return 'Prata (2 roteiros)'
      case 'prata': return 'Ouro (4 roteiros)'
      case 'ouro': return 'Platina (7 roteiros)'
      case 'platina': return 'Black (10 roteiros)'
      case 'black': return '🏆 Máximo alcançado!'
      default: return 'Prata (2 roteiros)'
    }
  }

  const getNotaEstrelas = (nota: number) => {
    const estrelasCheias = '★'.repeat(nota)
    const estrelasVazias = '☆'.repeat(5 - nota)
    return estrelasCheias + estrelasVazias
  }

  if (!user || !guia) {
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
      <UploadAvatarModal
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        userId={user.id}
        onAvatarUpdated={setAvatarPreview}
      />

      {/* HEADER */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a', margin: 0 }}>🏔️ PussikTrails</h1>
            <span style={{ fontSize: '12px', backgroundColor: '#d1fae5', color: '#065f46', padding: '4px 12px', borderRadius: '20px' }}>Navegador</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={() => router.push('/guia/dashboard')} style={{ backgroundColor: '#f3f4f6', border: 'none', padding: '8px 20px', borderRadius: '40px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#374151' }}>← Dashboard</button>
            <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '40px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Sair</button>
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* CARD PRINCIPAL DO PERFIL */}
        <div style={{ backgroundColor: 'white', borderRadius: '28px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Avatar */}
            <button onClick={() => setModalAberto(true)} style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '3px solid #16a34a', cursor: 'pointer', flexShrink: 0 }}>
              {avatarPreview ? <img src={avatarPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '48px', color: 'white' }}>{guia.nome?.charAt(0).toUpperCase() || 'G'}</span>}
            </button>

            {/* Informações */}
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#111827' }}>{guia.nome || 'Navegador'}</h2>
              <p style={{ color: '#6b7280', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>📧 {guia.email}</span>
                <span style={{ width: '4px', height: '4px', backgroundColor: '#d1d5db', borderRadius: '50%' }}></span>
                <span>📅 Membro desde {new Date(guia.created_at).getFullYear()}</span>
              </p>

              {/* Estatísticas rápidas */}
              <div style={{ display: 'flex', gap: '24px', marginTop: '20px', flexWrap: 'wrap' }}>
                <div><span style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{stats.totalRoteiros}</span> <span style={{ color: '#6b7280' }}>Roteiros</span></div>
                <div><span style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{stats.totalReservas}</span> <span style={{ color: '#6b7280' }}>Reservas</span></div>
                <div><span style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{stats.totalClientes}</span> <span style={{ color: '#6b7280' }}>Clientes</span></div>
                <div><span style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.avaliacaoMedia.toFixed(1)}</span> <span style={{ color: '#6b7280' }}>⭐ Avaliação</span></div>
              </div>

              {/* Bio editável - CORRIGIDA COM API */}
              <div style={{ marginTop: '20px' }}>
                {editandoBio ? (
                  <div>
                    <textarea 
                      value={bio} 
                      onChange={(e) => setBio(e.target.value)} 
                      rows={3} 
                      placeholder="Escreva sua biografia profissional..." 
                      style={{ width: '100%', padding: '12px', borderRadius: '16px', border: '1px solid #e5e7eb', fontSize: '14px', resize: 'vertical' }} 
                    />
                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                      <button onClick={salvarBio} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 24px', cursor: 'pointer' }}>Salvar</button>
                      <button onClick={cancelarEdicaoBio} style={{ backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '40px', padding: '8px 24px', cursor: 'pointer' }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => setEditandoBio(true)} style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '16px', cursor: 'pointer', border: '1px solid #e5e7eb' }}>
                    {bio ? <p style={{ margin: 0, lineHeight: 1.5, color: '#4b5563' }}>{bio}</p> : <p style={{ margin: 0, color: '#9ca3af' }}>✏️ Clique para adicionar uma biografia profissional...</p>}
                  </div>
                )}
              </div>
              {mensagem && <div style={{ marginTop: '12px', padding: '10px', borderRadius: '12px', backgroundColor: mensagem.includes('✅') ? '#dcfce7' : '#fee2e2', color: mensagem.includes('✅') ? '#16a34a' : '#dc2626', fontSize: '13px', textAlign: 'center' }}>{mensagem}</div>}
            </div>
          </div>
        </div>

        {/* 🏅 EVOLUÇÃO DO GUIA */}
        <div style={{ backgroundColor: 'white', borderRadius: '28px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <span style={{ fontSize: '28px' }}>🏅</span>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#111827' }}>Evolução do Guia</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `3px solid ${getMedalhaCor(stats.medalhaNivel)}` }}>
              <span style={{ fontSize: '40px' }}>{getMedalhaIcone(stats.medalhaNivel)}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: getMedalhaCor(stats.medalhaNivel) }}>{getMedalhaNome(stats.medalhaNivel)}</div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>🎯 {getProximoNivel(stats.medalhaNivel)}</div>
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                  <span>Progresso para próximo nível</span>
                  <span>{Math.min(100, (stats.totalRoteiros / 2) * 100)}%</span>
                </div>
                <div style={{ backgroundColor: '#e5e7eb', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: getMedalhaCor(stats.medalhaNivel), width: `${Math.min(100, (stats.totalRoteiros / 2) * 100)}%`, height: '100%', borderRadius: '10px' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 🏅 CONQUISTAS DO GUIA */}
        <div style={{ backgroundColor: 'white', borderRadius: '28px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <span style={{ fontSize: '28px' }}>🏅</span>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#111827' }}>Conquistas do Guia</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Metas alcançadas</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ backgroundColor: stats.totalRoteiros >= 1 ? '#dcfce7' : '#f9fafb', borderRadius: '16px', padding: '16px', textAlign: 'center', border: stats.totalRoteiros >= 1 ? '1px solid #bbf7d0' : '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗺️</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#111827' }}>Primeiro Roteiro</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{stats.totalRoteiros >= 1 ? '✅ Desbloqueado' : 'Crie seu primeiro roteiro'}</div>
            </div>
            <div style={{ backgroundColor: stats.totalReservas >= 1 ? '#dcfce7' : '#f9fafb', borderRadius: '16px', padding: '16px', textAlign: 'center', border: stats.totalReservas >= 1 ? '1px solid #bbf7d0' : '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#111827' }}>Primeira Reserva</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{stats.totalReservas >= 1 ? '✅ Desbloqueado' : 'Aguardando primeira reserva'}</div>
            </div>
            <div style={{ backgroundColor: stats.totalAvaliacoes >= 5 ? '#dcfce7' : '#f9fafb', borderRadius: '16px', padding: '16px', textAlign: 'center', border: stats.totalAvaliacoes >= 5 ? '1px solid #bbf7d0' : '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⭐</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#111827' }}>5 Avaliações</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{stats.totalAvaliacoes >= 5 ? '✅ Desbloqueado' : `${stats.totalAvaliacoes}/5 avaliações`}</div>
            </div>
            <div style={{ backgroundColor: stats.totalClientes >= 10 ? '#dcfce7' : '#f9fafb', borderRadius: '16px', padding: '16px', textAlign: 'center', border: stats.totalClientes >= 10 ? '1px solid #bbf7d0' : '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#111827' }}>10 Clientes</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{stats.totalClientes >= 10 ? '✅ Desbloqueado' : `${stats.totalClientes}/10 clientes`}</div>
            </div>
          </div>
        </div>

        {/* 💬 AVALIAÇÕES DOS CLIENTES */}
        <div style={{ backgroundColor: 'white', borderRadius: '28px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <span style={{ fontSize: '28px' }}>💬</span>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#111827' }}>Avaliações dos Clientes</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>O que estão falando sobre você</p>
            </div>
          </div>

          {stats.totalAvaliacoes === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', backgroundColor: '#f9fafb', borderRadius: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
              <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>Nenhuma avaliação ainda</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>As avaliações dos clientes aparecerão aqui.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {avaliacoes.slice(0, 5).map((avaliacao) => (
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
                      <button
                        onClick={() => curtirAvaliacao(avaliacao.id, guia.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                      >
                        {usuarioCurtiu[avaliacao.id] ? '❤️' : '🤍'}
                      </button>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>{curtidas[avaliacao.id] || 0}</span>
                    </div>
                  </div>
                  {avaliacao.comentario && <p style={{ margin: 0, fontSize: '14px', color: '#4b5563', lineHeight: 1.5 }}>“{avaliacao.comentario}”</p>}
                </div>
              ))}
              {stats.totalAvaliacoes > 5 && (
                <button onClick={() => router.push('/guia/avaliacoes')} style={{ textAlign: 'center', color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', padding: '12px' }}>
                  Ver todas as {stats.totalAvaliacoes} avaliações →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}