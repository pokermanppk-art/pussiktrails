'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import UploadAvatarModal from '@/components/UploadAvatarModal'
import SettingsButton from '@/components/SettingsButton'

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

  const [medalhas, setMedalhas] = useState<any[]>([])
  const [carregandoMedalhas, setCarregandoMedalhas] = useState(true)

  const [stats, setStats] = useState({
    totalRoteiros: 0,
    totalReservas: 0,
    totalClientes: 0,
    totalKm: 0,
    avaliacaoMedia: 0,
    totalAvaliacoes: 0,
    medalhaNivel: 'bronze'
  })

  const metasKmGuia = [
    { km: 32, nome: '🥉 Bronze' }, { km: 96, nome: '🥈 Prata' },
    { km: 192, nome: '🥇 Ouro' }, { km: 384, nome: '💎 Platina' },
    { km: 768, nome: '⚡ Elite' }, { km: 1152, nome: '👑 Master' },
    { km: 1920, nome: '🌟 Lenda' }, { km: 3840, nome: '🔥 Lenda Absoluta' }
  ]

  const getNivelPorKm = (km: number) => {
    for (let i = metasKmGuia.length - 1; i >= 0; i--) {
      if (km >= metasKmGuia[i].km) return metasKmGuia[i].nome
    }
    return '🥉 Bronze'
  }

  const getIconePorKm = (km: number) => {
    if (km >= 3840) return '🔥'
    if (km >= 1920) return '🌟'
    if (km >= 1152) return '👑'
    if (km >= 768) return '⚡'
    if (km >= 384) return '💎'
    if (km >= 192) return '🥇'
    if (km >= 96) return '🥈'
    if (km >= 32) return '🥉'
    return '🥉'
  }

  const calcularProximoMarcoKm = (km: number) => {
    for (const meta of metasKmGuia) if (km < meta.km) return meta.km
    return metasKmGuia[metasKmGuia.length - 1].km
  }

  const calcularProgressoKm = (km: number) => {
    const proximo = calcularProximoMarcoKm(km)
    const anterior = metasKmGuia.find(m => m.km < proximo)?.km || 0
    if (proximo === anterior) return 100
    return Math.min(((km - anterior) / (proximo - anterior)) * 100, 100)
  }

  const conquistasKm = [
    { nome: 'Primeira Trilha', icone: '🥾', km: 0, desbloqueado: stats.totalKm >= 0 },
    { nome: 'Explorador', icone: '🌱', km: 32, desbloqueado: stats.totalKm >= 32 },
    { nome: 'Caminhante', icone: '🚶', km: 96, desbloqueado: stats.totalKm >= 96 },
    { nome: 'Aventureiro', icone: '🏔️', km: 384, desbloqueado: stats.totalKm >= 384 },
    { nome: 'Mestre', icone: '👑', km: 1152, desbloqueado: stats.totalKm >= 1152 },
    { nome: 'Lenda', icone: '🌟', km: 1920, desbloqueado: stats.totalKm >= 1920 },
    { nome: 'Lenda Absoluta', icone: '🔥', km: 3840, desbloqueado: stats.totalKm >= 3840 },
  ]

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) { router.push('/login'); return }
    const parsedUser = JSON.parse(userData)
    if (parsedUser.tipo !== 'guia') { router.push('/login'); return }
    setUsuarioLogado(parsedUser)
    setUser(parsedUser)
    carregarDados(parsedUser.id)
  }, [])

  const carregarDados = async (guiaId: string) => {
    setCarregando(true)
    try {
      const { data: guiaData } = await supabase.from('users').select('*').eq('id', guiaId).single()
      if (guiaData) {
        setGuia(guiaData)
        setBio(guiaData.bio || '')
        if (guiaData.avatar_url) setAvatarPreview(guiaData.avatar_url)
      }

      const { data: roteiros } = await supabase.from('roteiros').select('id, km').eq('id_guia', guiaId)
      const totalRoteiros = roteiros?.length || 0
      const totalKm = roteiros?.reduce((acc, r) => acc + (r.km || 0), 0) || 0
      const roteirosIds = roteiros?.map(r => r.id) || []

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

      const { data: avaliacoesData } = await supabase
        .from('avaliacoes')
        .select(`id, nota, comentario, created_at, cliente_id, cliente:cliente_id (nome, avatar_url)`)
        .eq('guia_id', guiaId)
        .order('created_at', { ascending: false })

      const avaliacoesFormatadas = (avaliacoesData || []).map((a: any) => ({
        id: a.id, nota: a.nota, comentario: a.comentario,
        created_at: a.created_at, cliente_id: a.cliente_id,
        cliente_nome: a.cliente?.nome || 'Cliente',
        cliente_avatar: a.cliente?.avatar_url
      }))
      setAvaliacoes(avaliacoesFormatadas)

      if (avaliacoesFormatadas.length > 0 && usuarioLogado) {
        const avaliacaoIds = avaliacoesFormatadas.map(a => a.id)
        const { data: curtidasData } = await supabase
          .from('curtidas_avaliacoes')
          .select('avaliacao_id')
          .in('avaliacao_id', avaliacaoIds)
        const map: Record<string, number> = {}
        curtidasData?.forEach((c: any) => { map[c.avaliacao_id] = (map[c.avaliacao_id] || 0) + 1 })
        setCurtidas(map)

        const { data: minhasCurtidas } = await supabase
          .from('curtidas_avaliacoes')
          .select('avaliacao_id')
          .eq('usuario_id', usuarioLogado.id)
          .in('avaliacao_id', avaliacaoIds)
        const curtidasMap: Record<string, boolean> = {}
        minhasCurtidas?.forEach((c: any) => { curtidasMap[c.avaliacao_id] = true })
        setUsuarioCurtiu(curtidasMap)
      }

      const media = avaliacoesFormatadas.length
        ? avaliacoesFormatadas.reduce((acc, a) => acc + a.nota, 0) / avaliacoesFormatadas.length
        : 0

      let medalha = 'bronze'
      if (totalRoteiros >= 10) medalha = 'black'
      else if (totalRoteiros >= 7) medalha = 'platina'
      else if (totalRoteiros >= 4) medalha = 'ouro'
      else if (totalRoteiros >= 2) medalha = 'prata'

      setStats({
        totalRoteiros, totalReservas, totalClientes: clientesUnicos.size,
        totalKm, avaliacaoMedia: media, totalAvaliacoes: avaliacoesFormatadas.length, medalhaNivel: medalha
      })

      await carregarMedalhas(guiaId)
    } catch (err) { console.error(err) } finally { setCarregando(false) }
  }

  const carregarMedalhas = async (guiaId: string) => {
    setCarregandoMedalhas(true)
    try {
      const listaPadrao = [
        { nome: 'KM Guiados', icone: '👣', meta: 32, progresso: stats.totalKm || 0 },
        { nome: 'Guias Avaliados', icone: '⭐', meta: 5, progresso: stats.totalAvaliacoes || 0 },
        { nome: 'Trilhas Guiadas', icone: '🥾', meta: 1, progresso: stats.totalRoteiros || 0 },
        { nome: 'Clientes Atendidos', icone: '👥', meta: 5, progresso: stats.totalClientes || 0 }
      ]
      setMedalhas(listaPadrao)
    } catch (err) { console.error(err) } finally { setCarregandoMedalhas(false) }
  }

  const curtirAvaliacao = async (avaliacaoId: string, clienteId: string) => {
    if (!usuarioLogado) { router.push('/login'); return }
    if (usuarioCurtiu[avaliacaoId]) {
      await supabase.from('curtidas_avaliacoes').delete().eq('avaliacao_id', avaliacaoId).eq('usuario_id', usuarioLogado.id)
      setUsuarioCurtiu(prev => ({ ...prev, [avaliacaoId]: false }))
      setCurtidas(prev => ({ ...prev, [avaliacaoId]: Math.max((prev[avaliacaoId] || 0) - 1, 0) }))
    } else {
      await supabase.from('curtidas_avaliacoes').insert({ avaliacao_id: avaliacaoId, dono_id: clienteId, usuario_id: usuarioLogado.id })
      setUsuarioCurtiu(prev => ({ ...prev, [avaliacaoId]: true }))
      setCurtidas(prev => ({ ...prev, [avaliacaoId]: (prev[avaliacaoId] || 0) + 1 }))
    }
  }

  const salvarBio = async () => {
    if (!user?.id) { setMensagem('❌ Usuário não identificado'); return }
    setMensagem(''); setEditandoBio(false)
    try {
      const response = await fetch('/api/guia/bio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, bio })
      })
      const result = await response.json()
      if (result.success) {
        setMensagem('✅ Biografia atualizada!')
        setUser((prev: any) => ({ ...prev, bio }))
        setGuia((prev: any) => ({ ...prev, bio }))
      } else {
        setMensagem(`❌ ${result.error}`)
      }
    } catch (error) {
      setMensagem('❌ Erro ao conectar com o servidor')
    }
    setTimeout(() => setMensagem(''), 3000)
  }

  const cancelarEdicaoBio = () => {
    setEditandoBio(false)
    if (guia) setBio(guia.bio || '')
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

  const getNotaEstrelas = (nota: number) => '★'.repeat(nota) + '☆'.repeat(5 - nota)

  const proximoMarcoKm = calcularProximoMarcoKm(stats.totalKm)
  const progressoKm = calcularProgressoKm(stats.totalKm)

  if (!user || !guia) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando...</div>
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <UploadAvatarModal isOpen={modalAberto} onClose={() => setModalAberto(false)} userId={user.id} onAvatarUpdated={setAvatarPreview} />

      {/* HEADER RESPONSIVO COM SETTINGS */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>PussikTrails</h1>
            <span style={{ fontSize: '10px', backgroundColor: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '20px' }}>Guia</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SettingsButton userId={user.id} userEmail={user.email} />
            <button onClick={() => router.push('/guia/dashboard')} style={{ backgroundColor: '#f3f4f6', border: 'none', padding: '6px 12px', borderRadius: '40px', fontSize: '12px', cursor: 'pointer' }}>← Dashboard</button>
            <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '40px', fontSize: '12px', cursor: 'pointer' }}>Sair</button>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        
        {/* CARD PERFIL */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <button onClick={() => setModalAberto(true)} style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: 'none', cursor: 'pointer', marginBottom: '12px' }}>
              {avatarPreview ? <img src={avatarPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '36px', color: 'white' }}>{guia.nome?.charAt(0).toUpperCase() || 'G'}</span>}
            </button>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{guia.nome || guia.email || 'Guia'}</h2>
            <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '4px' }}>📅 Guia desde {new Date().getFullYear()}</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '12px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>{stats.totalKm}</div><div style={{ fontSize: '9px', color: '#6b7280' }}>KM</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>{stats.totalRoteiros}</div><div style={{ fontSize: '9px', color: '#6b7280' }}>Roteiros</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>{stats.totalClientes}</div><div style={{ fontSize: '9px', color: '#6b7280' }}>Clientes</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.avaliacaoMedia.toFixed(1)}</div><div style={{ fontSize: '9px', color: '#6b7280' }}>⭐</div></div>
            </div>
          </div>
          
          {editandoBio ? (
            <div style={{ marginTop: '16px' }}>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Sua biografia profissional..." style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '13px', resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button onClick={salvarBio} style={{ backgroundColor: '#16a34a', color: 'white', padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Salvar</button>
                <button onClick={cancelarEdicaoBio} style={{ backgroundColor: '#e5e7eb', padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div onClick={() => setEditandoBio(true)} style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '12px', cursor: 'pointer', maxHeight: '80px', overflowY: 'auto' }}>
              {bio ? <p style={{ margin: 0, fontSize: '12px', color: '#4b5563' }}>{bio}</p> : <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>✏️ Clique para adicionar uma biografia...</p>}
            </div>
          )}
          {mensagem && <div style={{ marginTop: '12px', padding: '8px', borderRadius: '8px', textAlign: 'center', fontSize: '12px', backgroundColor: mensagem.includes('✅') ? '#dcfce7' : '#fee2e2', color: mensagem.includes('✅') ? '#16a34a' : '#dc2626' }}>{mensagem}</div>}
        </div>

        {/* BARRA PROGRESSO KM */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '32px' }}>{getIconePorKm(stats.totalKm)}</span>
            <div><div style={{ fontWeight: 'bold', fontSize: '14px' }}>{getNivelPorKm(stats.totalKm)}</div><div style={{ fontSize: '10px', color: '#6b7280' }}>{stats.totalKm} km guiados</div></div>
          </div>
          <p style={{ marginBottom: '8px', fontSize: '11px', color: '#4b5563' }}>🎯 Próximo marco: <strong>{proximoMarcoKm} km</strong> (faltam {Math.max(0, proximoMarcoKm - stats.totalKm)} km)</p>
          <div style={{ backgroundColor: '#e5e7eb', borderRadius: '20px', height: '6px', overflow: 'hidden' }}>
            <div style={{ width: `${progressoKm}%`, backgroundColor: '#3b82f6', height: '100%', borderRadius: '20px' }} />
          </div>
        </div>

        {/* CONQUISTAS POR KM */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>🏅 Conquistas por KM</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {conquistasKm.map((c, i) => (
              <div key={i} style={{ flex: '0 0 auto', width: '65px', backgroundColor: c.desbloqueado ? '#dcfce7' : '#f9fafb', borderRadius: '12px', padding: '8px 4px', textAlign: 'center', border: c.desbloqueado ? '1px solid #bbf7d0' : '1px solid #e5e7eb', opacity: c.desbloqueado ? 1 : 0.6 }}>
                <div style={{ fontSize: '24px' }}>{c.icone}</div>
                <div style={{ fontSize: '8px', fontWeight: 'bold' }}>{c.nome.split(' ')[0]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* EVOLUÇÃO DO GUIA */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>🏅 Evolução</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${getMedalhaCor(stats.medalhaNivel)}` }}>
              <span style={{ fontSize: '24px' }}>{getMedalhaIcone(stats.medalhaNivel)}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: getMedalhaCor(stats.medalhaNivel) }}>{getMedalhaNome(stats.medalhaNivel)}</div>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>🎯 {getProximoNivel(stats.medalhaNivel)}</div>
              <div style={{ marginTop: '6px' }}>
                <div style={{ backgroundColor: '#e5e7eb', borderRadius: '10px', height: '4px' }}>
                  <div style={{ backgroundColor: getMedalhaCor(stats.medalhaNivel), width: `${Math.min(100, (stats.totalRoteiros / 2) * 100)}%`, height: '4px', borderRadius: '10px' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MEDALHAS ESPECIAIS */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>🎖️ Medalhas</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {medalhas.map((m, idx) => {
              const desbloqueado = m.progresso >= m.meta
              return (
                <div key={idx} style={{ flex: '0 0 auto', width: '70px', backgroundColor: desbloqueado ? '#dcfce7' : '#f9fafb', borderRadius: '12px', padding: '8px 4px', textAlign: 'center', border: desbloqueado ? '1px solid #bbf7d0' : '1px solid #e5e7eb', opacity: desbloqueado ? 1 : 0.6 }}>
                  <div style={{ fontSize: '24px', position: 'relative', display: 'inline-block' }}>
                    {m.icone}
                    {!desbloqueado && <span style={{ position: 'absolute', top: '-5px', right: '-8px', fontSize: '10px' }}>🔒</span>}
                  </div>
                  <div style={{ fontSize: '8px', fontWeight: 'bold' }}>{m.nome.split(' ')[0]}</div>
                  <div style={{ fontSize: '7px', color: '#9ca3af' }}>{m.progresso}/{m.meta}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* AVALIAÇÕES */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>💬 Avaliações ({stats.totalAvaliacoes})</h3>
          {avaliacoes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#f9fafb', borderRadius: '16px' }}>
              <span style={{ fontSize: '32px' }}>💬</span>
              <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>Nenhuma avaliação ainda</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {avaliacoes.slice(0, 5).map((a) => (
                <div key={a.id} style={{ backgroundColor: '#f9fafb', borderRadius: '16px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: 'bold' }}>
                        {a.cliente_nome?.charAt(0).toUpperCase() || 'C'}
                      </div>
                      <div><div style={{ fontWeight: 'bold', fontSize: '12px' }}>{a.cliente_nome}</div><div style={{ fontSize: '10px', color: '#f59e0b' }}>{getNotaEstrelas(a.nota)}</div></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ fontSize: '9px', color: '#9ca3af' }}>{new Date(a.created_at).toLocaleDateString('pt-BR')}</div>
                      <button onClick={() => curtirAvaliacao(a.id, guia.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>{usuarioCurtiu[a.id] ? '❤️' : '🤍'}</button>
                      <span style={{ fontSize: '10px', color: '#6b7280' }}>{curtidas[a.id] || 0}</span>
                    </div>
                  </div>
                  {a.comentario && <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#4b5563' }}>“{a.comentario}”</p>}
                </div>
              ))}
              {stats.totalAvaliacoes > 5 && (
                <button onClick={() => router.push('/guia/avaliacoes')} style={{ textAlign: 'center', color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', padding: '8px' }}>Ver todas →</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}