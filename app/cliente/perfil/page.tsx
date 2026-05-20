'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import UploadAvatarModal from '@/components/UploadAvatarModal'
import { v4 as uuidv4 } from 'uuid'

type MedalhaEspecial = {
  id: number
  nome: string
  icone: string
  descricao: string
  categoria: string
  meta: number
  progresso: number
  tier_atual: string
  desbloqueado: boolean
  progresso_percentual: number
}

export default function PerfilCliente() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [totalKm, setTotalKm] = useState(0)
  const [totalTrilhas, setTotalTrilhas] = useState(0)
  const [avaliacaoMedia, setAvaliacaoMedia] = useState(0)

  const [fotos, setFotos] = useState<string[]>([])
  const [bio, setBio] = useState('')
  const [editandoBio, setEditandoBio] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [mensagem, setMensagem] = useState('')

  // Curtidas
  const [curtidas, setCurtidas] = useState<Record<string, number>>({})
  const [usuarioCurtiu, setUsuarioCurtiu] = useState<Record<string, boolean>>({})

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)

  // Medalhas Especiais
  const [medalhasEspeciais, setMedalhasEspeciais] = useState<MedalhaEspecial[]>([])

  // Metas de fotos
  const metasFotos = [
    { km: 10, fotos: 3 },
    { km: 50, fotos: 5 },
    { km: 75, fotos: 10 },
    { km: 100, fotos: 15 },
    { km: 250, fotos: 25 },
    { km: 500, fotos: 50 },
    { km: 1000, fotos: 100 },
  ]

  const calcularFotosLiberadas = (km: number) => {
    let fotos = 0
    for (const meta of metasFotos) {
      if (km >= meta.km) fotos = meta.fotos
    }
    return fotos
  }

  const calcularProximoMarco = (km: number) => {
    for (const meta of metasFotos) {
      if (km < meta.km) return meta.km
    }
    return metasFotos[metasFotos.length - 1].km
  }

  const fotosLiberadas = calcularFotosLiberadas(totalKm)
  const proximoMarco = calcularProximoMarco(totalKm)
  const progressoParaProximoMarco = totalKm >= proximoMarco ? 100 : (totalKm / proximoMarco) * 100
  const kmFaltando = Math.max(0, proximoMarco - totalKm)

  const medalhas = [
    { nome: 'Primeira Trilha', icone: '🥾', kmNecessario: 0, desbloqueado: totalKm >= 0 },
    { nome: 'Explorador', icone: '🌿', kmNecessario: 10, desbloqueado: totalKm >= 10 },
    { nome: 'Caminhante', icone: '🚶', kmNecessario: 30, desbloqueado: totalKm >= 30 },
    { nome: 'Aventureiro', icone: '🏔️', kmNecessario: 50, desbloqueado: totalKm >= 50 },
    { nome: 'Mestre', icone: '👑', kmNecessario: 100, desbloqueado: totalKm >= 100 },
    { nome: 'Lenda', icone: '🔥', kmNecessario: 500, desbloqueado: totalKm >= 500 },
  ]

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }
    const parsedUser = JSON.parse(userData)
    if (parsedUser.tipo !== 'cliente') {
      router.push('/login')
      return
    }
    setUser(parsedUser)
    carregarPerfil(parsedUser.id)
  }, [])

  useEffect(() => {
    if (user && fotos.length >= 0) {
      carregarCurtidas(user.id)
    }
  }, [user, fotos])

  const carregarPerfil = async (userId: string) => {
    setLoading(true)
    try {
      await carregarUsuario(userId)
      
      const { data: fotosData, error: fotosError } = await supabase
        .from('users')
        .select('fotos_aventuras')
        .eq('id', userId)
        .single()
      
      if (!fotosError && fotosData?.fotos_aventuras) {
        console.log('📸 Fotos carregadas:', fotosData.fotos_aventuras.length)
        setFotos(fotosData.fotos_aventuras)
      } else {
        setFotos([])
      }
      
      await Promise.all([
        carregarAvatar(userId),
        carregarEstatisticas(userId),
        carregarBio(userId),
      ])
      await carregarMedalhasEspeciais(userId)
    } catch (err) {
      console.error('Erro ao carregar perfil:', err)
    } finally {
      setLoading(false)
    }
  }

  const carregarUsuario = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) {
      setUser((prev: any) => ({ ...prev, ...data }))
    }
  }

  const carregarAvatar = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', userId)
      .single()
    if (!error && data?.avatar_url) {
      setAvatarPreview(data.avatar_url)
    }
  }

  const carregarBio = async (userId: string) => {
    try {
      const response = await fetch(`/api/usuario/bio?userId=${userId}`)
      const result = await response.json()
      
      if (result.success) {
        setBio(result.bio || '')
      } else {
        setBio('')
      }
    } catch (error) {
      console.error('Erro ao carregar bio:', error)
      setBio('')
    }
  }

  const carregarEstatisticas = async (userId: string) => {
    const { data: reservas } = await supabase
      .from('reservas')
      .select('*, roteiro:roteiro_id(km)')
      .eq('cliente_id', userId)
      .eq('status', 'realizada')
    let km = 0
    reservas?.forEach((r: any) => {
      km += r.roteiro?.km || 0
    })
    setTotalKm(km)
    setTotalTrilhas(reservas?.length || 0)
    const { data: userData } = await supabase
      .from('users')
      .select('avaliacao_media_cliente')
      .eq('id', userId)
      .single()
    if (userData) {
      setAvaliacaoMedia(userData.avaliacao_media_cliente || 0)
    }
  }

  const carregarCurtidas = async (userId: string) => {
    const { data: curtidasData } = await supabase
      .from('curtidas_fotos')
      .select('foto_url')
      .eq('dono_id', userId)
    const map: Record<string, number> = {}
    curtidasData?.forEach((c: any) => { map[c.foto_url] = (map[c.foto_url] || 0) + 1 })
    setCurtidas(map)
    if (fotos.length > 0) {
      const { data: minhasCurtidas } = await supabase
        .from('curtidas_fotos')
        .select('foto_url')
        .eq('usuario_id', userId)
        .in('foto_url', fotos)
      const curtidasMap: Record<string, boolean> = {}
      minhasCurtidas?.forEach((c: any) => { curtidasMap[c.foto_url] = true })
      setUsuarioCurtiu(curtidasMap)
    }
  }

  // ✅ FUNÇÃO CORRIGIDA - Medalhas Especiais
  const carregarMedalhasEspeciais = async (userId: string) => {
    try {
      console.log('🔄 Buscando medalhas para:', userId)
      
      const { data: medalhasUsuario, error: errorUsuario } = await supabase
        .from('usuarios_medalhas')
        .select('*')
        .eq('usuario_id', userId)

      console.log('📊 Medalhas do usuário:', medalhasUsuario)

      if (errorUsuario) {
        console.error('❌ Erro:', errorUsuario)
        setMedalhasEspeciais([])
        return
      }

      if (!medalhasUsuario || medalhasUsuario.length === 0) {
        console.log('⚠️ Nenhuma medalha encontrada')
        setMedalhasEspeciais([])
        return
      }

      const medalhaIds = medalhasUsuario.map(um => um.medalha_id)
      
      const { data: medalhasDetalhes, error: errorDetalhes } = await supabase
        .from('medalhas')
        .select('*')
        .in('id', medalhaIds)

      console.log('📊 Detalhes:', medalhasDetalhes)

      if (errorDetalhes) {
        console.error('❌ Erro nos detalhes:', errorDetalhes)
        setMedalhasEspeciais([])
        return
      }

      const medalhasFormatadas = medalhasUsuario
        .map(um => {
          const detalhe = medalhasDetalhes?.find(m => m.id === um.medalha_id)
          if (!detalhe) return null
          
          const metaMax = detalhe.meta_onyx || detalhe.meta_platina || detalhe.meta_ouro || 100
          
          return {
            id: detalhe.id,
            nome: detalhe.nome,
            icone: detalhe.icone || getIconePorCategoria(detalhe.categoria),
            descricao: detalhe.descricao,
            categoria: detalhe.categoria,
            meta: metaMax,
            progresso: um.progresso_atual,
            tier_atual: um.tier_atual,
            desbloqueado: um.tier_atual !== 'bronze',
            progresso_percentual: Math.min(100, (um.progresso_atual / metaMax) * 100)
          }
        })
        .filter(Boolean)

      console.log('✅ Medalhas formatadas:', medalhasFormatadas.length)
      setMedalhasEspeciais(medalhasFormatadas as any)
      
    } catch (err) {
      console.error('❌ Erro fatal:', err)
      setMedalhasEspeciais([])
    }
  }

  const getIconePorCategoria = (categoria: string) => {
    switch (categoria) {
      case 'Exploração': return '🏔️'
      case 'Fotografia': return '📷'
      case 'Persistência': return '🔥'
      case 'Comunidade': return '👥'
      case 'Sustentabilidade': return '🌱'
      default: return '🎖️'
    }
  }

  const getCorPorTier = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'bronze': return '#cd7f32'
      case 'prata': return '#c0c0c0'
      case 'ouro': return '#ffd700'
      case 'platina': return '#e5e4e2'
      case 'onyx': return '#111111'
      default: return '#9ca3af'
    }
  }

  const getIconePorTier = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'bronze': return '🥉'
      case 'prata': return '🥈'
      case 'ouro': return '🥇'
      case 'platina': return '💎'
      case 'onyx': return '🖤'
      default: return '🎖️'
    }
  }

  const salvarBio = async () => {
    if (!user?.id) {
      setMensagem('❌ Usuário não identificado')
      return
    }

    setMensagem('')
    setEditandoBio(false)

    try {
      const response = await fetch('/api/usuario/bio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, bio })
      })

      const result = await response.json()

      if (result.success) {
        setMensagem('✅ Biografia atualizada!')
        setUser((prev: any) => ({ ...prev, bio }))
      } else {
        setMensagem(`❌ ${result.error}`)
        await carregarBio(user.id)
      }
    } catch (error) {
      setMensagem('❌ Erro ao conectar com o servidor')
      await carregarBio(user.id)
    }

    setTimeout(() => setMensagem(''), 3000)
  }

  const cancelarEdicaoBio = () => {
    setEditandoBio(false)
  }

  const curtirFoto = async (fotoUrl: string) => {
    if (!user) return
    if (usuarioCurtiu[fotoUrl]) {
      const { error } = await supabase
        .from('curtidas_fotos')
        .delete()
        .eq('foto_url', fotoUrl)
        .eq('usuario_id', user.id)
      if (!error) {
        setUsuarioCurtiu((prev) => ({ ...prev, [fotoUrl]: false }))
        setCurtidas((prev) => ({ ...prev, [fotoUrl]: Math.max((prev[fotoUrl] || 0) - 1, 0) }))
      }
    } else {
      const { error } = await supabase
        .from('curtidas_fotos')
        .insert({ foto_url: fotoUrl, dono_id: user.id, usuario_id: user.id })
      if (!error) {
        setUsuarioCurtiu((prev) => ({ ...prev, [fotoUrl]: true }))
        setCurtidas((prev) => ({ ...prev, [fotoUrl]: (prev[fotoUrl] || 0) + 1 }))
      }
    }
  }

  const handleUploadFotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    
    if (fotos.length + files.length > fotosLiberadas) {
      setMensagem(`⚠️ Limite de ${fotosLiberadas} fotos liberadas.`)
      setTimeout(() => setMensagem(''), 4000)
      return
    }
    
    setUploading(true)
    setMensagem('📤 Enviando fotos...')
    
    const novasUrls: string[] = []
    let erros = 0
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setMensagem(`❌ ${file.name} não é uma imagem`)
        erros++
        continue
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setMensagem(`❌ ${file.name} excede 5MB`)
        erros++
        continue
      }
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${uuidv4()}.${fileExt}`
      const filePath = `clientes/${user.id}/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('fotos-aventuras')
        .upload(filePath, file)
        
      if (uploadError) {
        setMensagem(`❌ Erro: ${uploadError.message}`)
        erros++
        continue
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('fotos-aventuras')
        .getPublicUrl(filePath)
        
      novasUrls.push(publicUrl)
    }
    
    if (novasUrls.length > 0) {
      const novasFotos = [...fotos, ...novasUrls]
      
      try {
        const response = await fetch('/api/usuario/fotos', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, fotos: novasFotos })
        })
        
        const result = await response.json()
        
        if (result.success) {
          setFotos(novasFotos)
          setMensagem(`✅ ${novasUrls.length} foto(s) enviada(s)!`)
          await carregarMedalhasEspeciais(user.id)
        } else {
          setMensagem(`❌ ${result.error}`)
        }
      } catch (error) {
        setMensagem('❌ Erro ao salvar')
      }
    }
    
    if (erros > 0 && novasUrls.length === 0) {
      setMensagem(`⚠️ Nenhuma foto foi enviada.`)
    }
    
    setUploading(false)
    setTimeout(() => setMensagem(''), 4000)
    event.target.value = ''
  }

  const removerFoto = async (index: number) => {
    if (!confirm('Remover esta foto?')) return
    
    const novasFotos = fotos.filter((_, i) => i !== index)
    
    try {
      const response = await fetch('/api/usuario/fotos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, fotos: novasFotos })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setFotos(novasFotos)
        setMensagem('✅ Foto removida')
        await carregarMedalhasEspeciais(user.id)
      } else {
        setMensagem(`❌ ${result.error}`)
      }
    } catch (error) {
      setMensagem('❌ Erro ao remover')
    }
    
    setTimeout(() => setMensagem(''), 3000)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (loading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏔️</div>
          <div style={{ color: '#6b7280' }}>Carregando perfil...</div>
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

      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>🏔️ PrussikTrails</h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>Perfil do Aventureiro</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={() => router.push('/cliente/dashboard')} style={{ backgroundColor: '#f3f4f6', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', color: '#374151', fontWeight: '600', fontSize: '13px' }}>← Voltar</button>
            <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Sair</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 20px' }}>
        {/* CARD PERFIL */}
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '28px', marginBottom: '32px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <button onClick={() => setModalAberto(true)} style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#16a34a', overflow: 'hidden', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            {avatarPreview ? <img src={avatarPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '42px', fontWeight: 'bold' }}>{(user.nome || user.email)?.charAt(0).toUpperCase()}</div>}
          </button>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#111827' }}>{user.nome || 'Aventureiro'}</h2>
            <p style={{ color: '#6b7280', marginTop: '6px' }}>Explorando novas aventuras 🚀</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '24px' }}>
              <div style={{ backgroundColor: '#f9fafb', borderRadius: '18px', padding: '18px' }}><div style={{ fontSize: '14px', color: '#6b7280' }}>KM Percorridos</div><div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '6px', color: '#111827' }}>{totalKm}</div></div>
              <div style={{ backgroundColor: '#f9fafb', borderRadius: '18px', padding: '18px' }}><div style={{ fontSize: '14px', color: '#6b7280' }}>Trilhas</div><div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '6px', color: '#111827' }}>{totalTrilhas}</div></div>
              <div style={{ backgroundColor: '#f9fafb', borderRadius: '18px', padding: '18px' }}><div style={{ fontSize: '14px', color: '#6b7280' }}>Avaliação</div><div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '6px', color: '#111827' }}>{avaliacaoMedia > 0 ? avaliacaoMedia.toFixed(1) : 'Novo'}</div></div>
              <div style={{ backgroundColor: '#f9fafb', borderRadius: '18px', padding: '18px' }}><div style={{ fontSize: '14px', color: '#6b7280' }}>Medalhas</div><div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '6px', color: '#111827' }}>{medalhas.filter((m) => m.desbloqueado).length}</div></div>
            </div>
            
            {/* BIO */}
            <div style={{ marginTop: '24px' }}>
              {editandoBio ? (
                <div>
                  <textarea 
                    value={bio} 
                    onChange={(e) => setBio(e.target.value)} 
                    rows={4} 
                    placeholder="Conte um pouco sobre você..." 
                    style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '14px', resize: 'none', fontSize: '14px' }} 
                  />
                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <button onClick={salvarBio} style={{ backgroundColor: '#16a34a', color: 'white', padding: '10px 20px', borderRadius: '40px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Salvar</button>
                    <button onClick={cancelarEdicaoBio} style={{ backgroundColor: '#f3f4f6', color: '#374151', padding: '10px 20px', borderRadius: '40px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => setEditandoBio(true)} style={{ backgroundColor: '#f9fafb', borderRadius: '18px', padding: '18px', border: '1px solid #e5e7eb', cursor: 'pointer' }}>
                  {bio ? <p style={{ margin: 0, color: '#374151' }}>{bio}</p> : <p style={{ margin: 0, color: '#9ca3af' }}>✏️ Clique para adicionar uma biografia...</p>}
                </div>
              )}
            </div>
            {mensagem && <div style={{ marginTop: '12px', padding: '10px', borderRadius: '12px', backgroundColor: mensagem.includes('✅') ? '#dcfce7' : '#fee2e2', color: mensagem.includes('✅') ? '#16a34a' : '#dc2626', textAlign: 'center' }}>{mensagem}</div>}
          </div>
        </div>

        {/* MEDALHAS POR KM */}
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', marginBottom: '32px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '22px', color: '#111827' }}>🏆 Conquistas por KM</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
            {medalhas.map((medalha, idx) => (
              <div key={idx} style={{ backgroundColor: medalha.desbloqueado ? '#f0fdf4' : '#f9fafb', borderRadius: '18px', padding: '18px', textAlign: 'center', border: medalha.desbloqueado ? '1px solid #bbf7d0' : '1px solid #e5e7eb', opacity: medalha.desbloqueado ? 1 : 0.5 }}>
                <div style={{ fontSize: '36px' }}>{medalha.icone}</div>
                <div style={{ marginTop: '10px', fontWeight: 'bold', fontSize: '14px' }}>{medalha.nome}</div>
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>{medalha.kmNecessario} KM</div>
              </div>
            ))}
          </div>
        </div>

        {/* MEDALHAS ESPECIAIS */}
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', marginBottom: '32px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '22px', color: '#111827' }}>🎖️ Medalhas Especiais</h3>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#6b7280' }}>Conquistas avançadas</p>
          </div>

          {medalhasEspeciais.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#f9fafb', borderRadius: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎖️</div>
              <div style={{ fontWeight: 'bold', color: '#374151' }}>Nenhuma medalha especial ainda</div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px' }}>Complete mais aventuras para desbloquear!</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {medalhasEspeciais.map((medalha) => {
                const cor = getCorPorTier(medalha.tier_atual)
                const iconeTier = getIconePorTier(medalha.tier_atual)
                return (
                  <div key={medalha.id} style={{ backgroundColor: medalha.desbloqueado ? '#f0fdf4' : '#f9fafb', borderRadius: '20px', padding: '20px', border: medalha.desbloqueado ? '1px solid #bbf7d0' : '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ fontSize: '40px' }}>{medalha.icone}</div>
                      <div><div style={{ fontWeight: 'bold', fontSize: '16px', color: '#111827' }}>{medalha.nome}</div><div style={{ fontSize: '11px', color: '#6b7280' }}>{medalha.categoria}</div></div>
                      <div style={{ marginLeft: 'auto', fontSize: '20px' }}>{iconeTier}</div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}><span>Progresso</span><span style={{ fontWeight: 'bold', color: cor }}>{medalha.progresso} / {medalha.meta}</span></div>
                      <div style={{ backgroundColor: '#e5e7eb', borderRadius: '10px', height: '6px', overflow: 'hidden' }}><div style={{ backgroundColor: cor, width: `${medalha.progresso_percentual}%`, height: '100%', borderRadius: '10px' }} /></div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>{medalha.descricao}</div>
                    {!medalha.desbloqueado && <div style={{ backgroundColor: '#fef3c7', borderRadius: '12px', padding: '8px', fontSize: '11px', color: '#d97706', textAlign: 'center' }}>🔒 Faltam {medalha.meta - medalha.progresso} para desbloquear</div>}
                    {medalha.desbloqueado && <div style={{ backgroundColor: '#dcfce7', borderRadius: '12px', padding: '8px', fontSize: '11px', color: '#16a34a', textAlign: 'center' }}>✅ Desbloqueada! Nível {medalha.tier_atual.toUpperCase()}</div>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* FOTOS */}
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '18px' }}>
            <div><h3 style={{ margin: 0, fontSize: '22px', color: '#111827' }}>📸 Fotos das Aventuras</h3><div style={{ marginTop: '6px', fontSize: '13px', color: '#6b7280' }}>{fotos.length} / {fotosLiberadas} fotos</div></div>
            <button onClick={() => document.getElementById('upload-fotos-input')?.click()} disabled={uploading} style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.5 : 1 }}>
              {uploading ? 'Enviando...' : '📤 Enviar fotos'}
            </button>
            <input id="upload-fotos-input" type="file" multiple accept="image/*" onChange={handleUploadFotos} disabled={uploading} style={{ display: 'none' }} />
          </div>
          <div style={{ marginBottom: '22px' }}>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ width: `${progressoParaProximoMarco}%`, height: '100%', backgroundColor: '#3b82f6', borderRadius: '999px' }} />
            </div>
            <p style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>Faltam {kmFaltando} KM para liberar mais fotos</p>
          </div>

          {fotos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#f9fafb', borderRadius: '18px' }}>
              <div style={{ fontSize: '48px' }}>📷</div>
              <p style={{ color: '#6b7280' }}>Nenhuma foto enviada ainda</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
              {fotos.map((foto, idx) => (
                <div key={idx} style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', aspectRatio: '1/1', backgroundColor: '#f3f4f6' }}>
                  <img src={foto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0,0,0,0.55)', borderRadius: '20px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => curtirFoto(foto)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', fontSize: '16px' }}>
                      {usuarioCurtiu[foto] ? '❤️' : '🤍'}
                    </button>
                    <span style={{ fontSize: '12px', color: 'white' }}>{curtidas[foto] || 0}</span>
                  </div>
                  <button onClick={() => removerFoto(idx)} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', cursor: 'pointer', backgroundColor: 'rgba(0,0,0,0.55)', color: 'white' }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}