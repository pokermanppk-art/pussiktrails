'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import UploadAvatarModal from '@/components/UploadAvatarModal'
import { v4 as uuidv4 } from 'uuid'

export default function PerfilCliente() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [totalKm, setTotalKm] = useState(0)
  const [totalTrilhas, setTotalTrilhas] = useState(0)
  const [fotos, setFotos] = useState<string[]>([])
  const [bio, setBio] = useState('')
  const [editandoBio, setEditandoBio] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [mensagem, setMensagem] = useState('')
  
  // Dados das medalhas
  const [medalhas, setMedalhas] = useState<any[]>([])
  const [carregandoMedalhas, setCarregandoMedalhas] = useState(true)
  
  // Avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)

  const metasFotos = [
    { km: 10, fotos: 3 },
    { km: 50, fotos: 5 },
    { km: 75, fotos: 10 },
    { km: 100, fotos: 15 },
    { km: 250, fotos: 25 },
    { km: 500, fotos: 50 },
    { km: 1000, fotos: 100 },
    { km: 5000, fotos: 500 },
    { km: 10000, fotos: 1000 },
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

  const conquistasKm = [
    { nome: 'Primeira Trilha', icone: '🥾', kmNecessario: 0, desbloqueado: totalKm >= 0 },
    { nome: 'Explorador Iniciante', icone: '🌱', kmNecessario: 10, desbloqueado: totalKm >= 10 },
    { nome: 'Caminhante', icone: '🚶', kmNecessario: 30, desbloqueado: totalKm >= 30 },
    { nome: 'Aventureiro', icone: '🏔️', kmNecessario: 50, desbloqueado: totalKm >= 50 },
    { nome: 'Mestre das Trilhas', icone: '👑', kmNecessario: 100, desbloqueado: totalKm >= 100 },
    { nome: 'Lenda Viva', icone: '🌟', kmNecessario: 500, desbloqueado: totalKm >= 500 },
  ]

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }
    const parsedUser = JSON.parse(userData)
    if (parsedUser.tipo !== 'cliente') {
      router.push('/')
      return
    }
    setUser(parsedUser)
    carregarDados(parsedUser.id)
  }, [])

  const carregarDados = async (userId: string) => {
    await Promise.all([
      carregarFotos(userId),
      carregarAvatar(userId),
      carregarEstatisticas(userId),
      carregarBio(userId),
      carregarMedalhas(userId)
    ])
  }

  const carregarMedalhas = async (userId: string) => {
    setCarregandoMedalhas(true)
    try {
      const listaPadrao = [
        { nome: 'Trilhas Concluídas', icone: '🥾', meta: 1, progresso: 0 },
        { nome: 'KM Percorridos', icone: '👣', meta: 10, progresso: 0 },
        { nome: 'Fotógrafo da Natureza', icone: '📸', meta: 3, progresso: 0 },
        { nome: 'Avaliações', icone: '⭐', meta: 1, progresso: 0 },
        { nome: 'Reservas Realizadas', icone: '💳', meta: 1, progresso: 0 }
      ]

      const { data: progresso } = await supabase
        .from('usuarios_medalhas')
        .select('progresso_atual, medalha:medalha_id(nome)')
        .eq('usuario_id', userId)

      if (progresso && progresso.length > 0) {
        const mapa = new Map()
        progresso.forEach((item: any) => {
          if (item.medalha?.nome) {
            mapa.set(item.medalha.nome, item.progresso_atual || 0)
          }
        })
        
        const listaAtualizada = listaPadrao.map(m => ({
          ...m,
          progresso: mapa.get(m.nome) || 0
        }))
        setMedalhas(listaAtualizada)
      } else {
        setMedalhas(listaPadrao)
      }
    } catch (err) {
      console.error('Erro ao carregar medalhas:', err)
      setMedalhas([
        { nome: 'Trilhas Concluídas', icone: '🥾', meta: 1, progresso: 0 },
        { nome: 'KM Percorridos', icone: '👣', meta: 10, progresso: 0 },
        { nome: 'Fotógrafo da Natureza', icone: '📸', meta: 3, progresso: 0 },
        { nome: 'Avaliações', icone: '⭐', meta: 1, progresso: 0 },
        { nome: 'Reservas Realizadas', icone: '💳', meta: 1, progresso: 0 }
      ])
    } finally {
      setCarregandoMedalhas(false)
    }
  }

  const carregarFotos = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('fotos_aventuras')
      .eq('id', userId)
      .single()
    if (!error && data?.fotos_aventuras) setFotos(data.fotos_aventuras)
  }

  const carregarAvatar = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', userId)
      .single()
    if (!error && data?.avatar_url) setAvatarPreview(data.avatar_url)
  }

  const carregarEstatisticas = async (userId: string) => {
    const { data: reservas } = await supabase
      .from('reservas')
      .select('*, roteiro:roteiro_id(km)')
      .eq('cliente_id', userId)
      .eq('status', 'realizada')
    let km = 0
    reservas?.forEach(r => { km += r.roteiro?.km || 0 })
    setTotalKm(km)
    setTotalTrilhas(reservas?.length || 0)
  }

  const carregarBio = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('bio')
      .eq('id', userId)
      .single()
    if (!error && data?.bio) setBio(data.bio)
  }

  const salvarBio = async () => {
    const { error } = await supabase
      .from('users')
      .update({ bio })
      .eq('id', user.id)
    if (error) {
      setMensagem('❌ Erro ao salvar biografia')
    } else {
      setMensagem('✅ Biografia atualizada!')
    }
    setEditandoBio(false)
    setTimeout(() => setMensagem(''), 3000)
  }

  const handleUploadFotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    if (fotos.length + files.length > fotosLiberadas) {
      setMensagem(`⚠️ Limite de ${fotosLiberadas} fotos. Remova algumas antes.`)
      setTimeout(() => setMensagem(''), 4000)
      return
    }

    setUploading(true)
    setMensagem('')

    const novasUrls: string[] = []
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${uuidv4()}.${fileExt}`
      const filePath = `clientes/${user.id}/${fileName}`

      const { error } = await supabase.storage
        .from('fotos-aventuras')
        .upload(filePath, file)

      if (error) {
        console.error(error)
        setMensagem(`❌ Erro ao enviar: ${error.message}`)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('fotos-aventuras')
        .getPublicUrl(filePath)
      novasUrls.push(publicUrl)
    }

    const novasFotos = [...fotos, ...novasUrls]
    const { error } = await supabase
      .from('users')
      .update({ fotos_aventuras: novasFotos })
      .eq('id', user.id)

    if (error) {
      setMensagem(`❌ Erro ao salvar: ${error.message}`)
    } else {
      setFotos(novasFotos)
      setMensagem(`✅ ${novasUrls.length} foto(s) adicionada(s)!`)
    }
    setUploading(false)
    setTimeout(() => setMensagem(''), 3000)
  }

  const removerFoto = async (index: number) => {
    if (!confirm('Remover esta foto permanentemente?')) return
    const novasFotos = fotos.filter((_, i) => i !== index)
    const { error } = await supabase
      .from('users')
      .update({ fotos_aventuras: novasFotos })
      .eq('id', user.id)
    if (error) {
      setMensagem(`❌ Erro ao remover: ${error.message}`)
    } else {
      setFotos(novasFotos)
      setMensagem('✅ Foto removida!')
    }
    setTimeout(() => setMensagem(''), 3000)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Carregando...</p>
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

      {/* CABEÇALHO */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>🏔️ PussikTrails</h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#4b5563' }}>{user.email}</span>
            <button onClick={() => router.push('/cliente/dashboard')} style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Dashboard</button>
            <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Sair</button>
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        
        {/* CARD PRINCIPAL */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', marginBottom: '32px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <button onClick={() => setModalAberto(true)} style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            {avatarPreview ? <img src={avatarPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '48px', color: 'white' }}>{user.email?.charAt(0).toUpperCase() || 'A'}</span>}
          </button>
          
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{user.email}</h2>
            <p style={{ color: '#6b7280', marginTop: '4px' }}>Aventureiro desde {new Date().getFullYear()}</p>
            
            <div style={{ display: 'flex', gap: '32px', marginTop: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div><span style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{totalKm}</span> <span style={{ color: '#6b7280' }}>KM percorridos</span></div>
              <div><span style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{totalTrilhas}</span> <span style={{ color: '#6b7280' }}>Trilhas</span></div>
              <div><span style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{conquistasKm.filter(m => m.desbloqueado).length}</span> <span style={{ color: '#6b7280' }}>Medalhas</span></div>
            </div>

            <div style={{ marginTop: '16px' }}>
              {editandoBio ? (
                <div>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Escreva algo sobre você..." style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button onClick={salvarBio} style={{ backgroundColor: '#16a34a', color: 'white', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>Salvar</button>
                    <button onClick={() => { setEditandoBio(false); carregarBio(user.id); }} style={{ backgroundColor: '#e5e7eb', color: '#374151', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => setEditandoBio(true)} style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', cursor: 'pointer' }}>
                  {bio ? <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{bio}</p> : <p style={{ margin: 0, color: '#9ca3af' }}>Clique para adicionar uma biografia...</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BARRA DE PROGRESSO */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', marginBottom: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ marginBottom: '12px', fontSize: '14px', color: '#4b5563' }}>🎯 Próximo marco: <strong>{proximoMarco} km</strong> (faltam {Math.max(0, proximoMarco - totalKm)} km)</p>
          <div style={{ backgroundColor: '#e5e7eb', borderRadius: '20px', height: '12px', overflow: 'hidden' }}>
            <div style={{ width: `${progressoParaProximoMarco}%`, backgroundColor: '#3b82f6', height: '100%', borderRadius: '20px' }} />
          </div>
        </div>

        {/* CONQUISTAS POR KM */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', marginBottom: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>🏅 Conquistas por KM</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
            {conquistasKm.map((m, i) => (
              <div key={i} style={{ flex: '0 0 auto', width: '100px', backgroundColor: m.desbloqueado ? '#f0fdf4' : '#f3f4f6', borderRadius: '12px', padding: '12px', textAlign: 'center', border: m.desbloqueado ? '1px solid #16a34a' : '1px solid #e5e7eb', opacity: m.desbloqueado ? 1 : 0.5 }}>
                <div style={{ fontSize: '32px' }}>{m.icone}</div>
                <p style={{ fontWeight: 'bold', fontSize: '10px', marginTop: '8px', marginBottom: 0 }}>{m.nome}</p>
              </div>
            ))}
          </div>
        </div>

        {/* MEDALHAS ESPECIAIS - HORIZONTAL COM SCROLL NO MOBILE */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', marginBottom: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center' }}>🎖️ Medalhas Especiais</h3>
          
          {carregandoMedalhas ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>Carregando medalhas...</div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', minWidth: 'min-content' }}>
                {medalhas.map((medalha) => {
                  const desbloqueado = medalha.progresso >= medalha.meta
                  return (
                    <div key={medalha.nome} style={{
                      flex: '0 0 auto',
                      width: '110px',
                      backgroundColor: desbloqueado ? '#e8f5e9' : '#f5f5f5',
                      borderRadius: '12px',
                      padding: '12px 8px',
                      textAlign: 'center',
                      border: `1px solid ${desbloqueado ? '#4caf50' : '#e0e0e0'}`
                    }}>
                      <div style={{ fontSize: '40px', position: 'relative', display: 'inline-block' }}>
                        {medalha.icone}
                        {!desbloqueado && <span style={{ position: 'absolute', top: '-5px', right: '-10px', fontSize: '16px' }}>🔒</span>}
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '11px', marginTop: '8px' }}>{medalha.nome}</div>
                      <div style={{ fontSize: '9px', color: desbloqueado ? '#4caf50' : '#999', marginTop: '4px' }}>
                        {desbloqueado ? `✅ ${medalha.progresso}/${medalha.meta}` : `🔒 ${medalha.progresso}/${medalha.meta}`}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* FOTOS DAS AVENTURAS */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>📸 Fotos das Aventuras</h3>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>{fotos.length} / {fotosLiberadas} fotos</p>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <label style={{ backgroundColor: '#16a34a', color: 'white', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'inline-block', opacity: uploading ? 0.5 : 1 }}>
              {uploading ? 'Enviando...' : '📤 Enviar fotos'}
              <input type="file" accept="image/*" multiple onChange={handleUploadFotos} disabled={uploading} style={{ display: 'none' }} />
            </label>
            <p style={{ fontSize: '12px', marginTop: '8px', color: '#6b7280' }}>Até {fotosLiberadas} fotos (JPG, PNG, GIF)</p>
          </div>

          {mensagem && (
            <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', textAlign: 'center', backgroundColor: mensagem.includes('✅') ? '#dcfce7' : '#fee2e2', color: mensagem.includes('✅') ? '#16a34a' : '#dc2626' }}>
              {mensagem}
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
            {metasFotos.map((meta, i) => (
              <div key={i} style={{ backgroundColor: totalKm >= meta.km ? '#3b82f6' : '#e5e7eb', color: totalKm >= meta.km ? 'white' : '#6b7280', padding: '4px 12px', borderRadius: '20px', fontSize: '12px' }}>
                {meta.km}km → {meta.fotos} fotos
              </div>
            ))}
          </div>

          {fotos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
              <p style={{ color: '#9ca3af' }}>📸 Nenhuma foto ainda</p>
              <p style={{ fontSize: '12px', color: '#9ca3af' }}>Envie suas aventuras!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
              {fotos.map((foto, idx) => (
                <div key={idx} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                  <img src={foto} alt={`Aventura ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => removerFoto(idx)} style={{ position: 'absolute', top: '4px', right: '4px', backgroundColor: '#dc2626', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}