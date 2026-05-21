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
  const [nome, setNome] = useState('')
  const [editandoNome, setEditandoNome] = useState(false)
  const [editandoBio, setEditandoBio] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)

  const [medalhas, setMedalhas] = useState<any[]>([])
  const [carregandoMedalhas, setCarregandoMedalhas] = useState(true)

  const metasFotos = [
    { km: 32, fotos: 5 }, { km: 96, fotos: 15 }, { km: 192, fotos: 30 },
    { km: 384, fotos: 60 }, { km: 768, fotos: 120 }, { km: 1152, fotos: 200 },
    { km: 1920, fotos: 400 }, { km: 3840, fotos: 1000 },
  ]

  const calcularFotosLiberadas = (km: number) => {
    let fotos = 0
    for (const meta of metasFotos) if (km >= meta.km) fotos = meta.fotos
    return fotos
  }

  const calcularProximoMarco = (km: number) => {
    for (const meta of metasFotos) if (km < meta.km) return meta.km
    return metasFotos[metasFotos.length - 1].km
  }

  const fotosLiberadas = calcularFotosLiberadas(totalKm)
  const proximoMarco = calcularProximoMarco(totalKm)
  const progressoParaProximoMarco = totalKm >= proximoMarco ? 100 : (totalKm / proximoMarco) * 100

  const conquistasKm = [
    { nome: 'Primeira Trilha', icone: '🥾', km: 0, desbloqueado: totalKm >= 0 },
    { nome: 'Explorador', icone: '🌱', km: 32, desbloqueado: totalKm >= 32 },
    { nome: 'Caminhante', icone: '🚶', km: 96, desbloqueado: totalKm >= 96 },
    { nome: 'Aventureiro', icone: '🏔️', km: 384, desbloqueado: totalKm >= 384 },
    { nome: 'Mestre', icone: '👑', km: 1152, desbloqueado: totalKm >= 1152 },
    { nome: 'Lenda', icone: '🌟', km: 1920, desbloqueado: totalKm >= 1920 },
    { nome: 'Lenda Absoluta', icone: '🔥', km: 3840, desbloqueado: totalKm >= 3840 },
  ]

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) { router.push('/login'); return }
    const parsedUser = JSON.parse(userData)
    if (parsedUser.tipo !== 'cliente') { router.push('/'); return }
    setUser(parsedUser)
    setNome(parsedUser.nome || '')
    carregarDatos(parsedUser.id)
  }, [])

  const carregarDatos = async (userId: string) => {
    await Promise.all([
      carregarFotos(userId), carregarAvatar(userId), carregarEstatisticas(userId),
      carregarBio(userId), carregarMedalhas(userId), carregarNome(userId)
    ])
  }

  const carregarNome = async (userId: string) => {
    const { data } = await supabase.from('users').select('nome').eq('id', userId).single()
    if (data?.nome) {
      setNome(data.nome)
      const userData = localStorage.getItem('user')
      if (userData) {
        const user = JSON.parse(userData)
        user.nome = data.nome
        localStorage.setItem('user', JSON.stringify(user))
      }
    }
  }

  const salvarNome = async () => {
    if (!nome.trim()) { setMensagem('❌ Nome não pode ficar vazio'); return }
    const { error } = await supabase.from('users').update({ nome }).eq('id', user.id)
    if (error) setMensagem('❌ Erro ao salvar nome')
    else {
      setMensagem('✅ Nome atualizado!')
      const userData = localStorage.getItem('user')
      if (userData) {
        const user = JSON.parse(userData)
        user.nome = nome
        localStorage.setItem('user', JSON.stringify(user))
      }
    }
    setEditandoNome(false)
    setTimeout(() => setMensagem(''), 3000)
  }

  const carregarMedalhas = async (userId: string) => {
    setCarregandoMedalhas(true)
    try {
      const listaPadrao = [
        { nome: 'Trilhas', icone: '🥾', meta: 2, progresso: 0 },
        { nome: 'KM', icone: '👣', meta: 32, progresso: 0 },
        { nome: 'Fotos', icone: '📸', meta: 3, progresso: 0 },
        { nome: 'Avaliações', icone: '⭐', meta: 5, progresso: 0 },
        { nome: 'Reservas', icone: '💳', meta: 2, progresso: 0 }
      ]
      const { data: progresso } = await supabase
        .from('usuarios_medalhas')
        .select('progresso_atual, medalha:medalha_id(nome)')
        .eq('usuario_id', userId)
      if (progresso && progresso.length > 0) {
        const mapa = new Map()
        progresso.forEach((item: any) => { if (item.medalha?.nome) mapa.set(item.medalha.nome, item.progresso_atual || 0) })
        setMedalhas(listaPadrao.map(m => ({ ...m, progresso: mapa.get(m.nome) || 0 })))
      } else setMedalhas(listaPadrao)
    } catch (err) { console.error(err) } finally { setCarregandoMedalhas(false) }
  }

  const carregarFotos = async (userId: string) => {
    const { data } = await supabase.from('users').select('fotos_aventuras').eq('id', userId).single()
    if (data?.fotos_aventuras) setFotos(data.fotos_aventuras)
  }
  const carregarAvatar = async (userId: string) => {
    const { data } = await supabase.from('users').select('avatar_url').eq('id', userId).single()
    if (data?.avatar_url) setAvatarPreview(data.avatar_url)
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
    const { data } = await supabase.from('users').select('bio').eq('id', userId).single()
    if (data?.bio) setBio(data.bio)
  }
  const salvarBio = async () => {
    const { error } = await supabase.from('users').update({ bio }).eq('id', user.id)
    setMensagem(error ? '❌ Erro ao salvar biografia' : '✅ Biografia atualizada!')
    setEditandoBio(false)
    setTimeout(() => setMensagem(''), 3000)
  }

  const handleUploadFotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    if (fotos.length + files.length > fotosLiberadas) {
      setMensagem(`⚠️ Limite de ${fotosLiberadas} fotos.`)
      setTimeout(() => setMensagem(''), 4000)
      return
    }
    setUploading(true)
    const novasUrls: string[] = []
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${uuidv4()}.${fileExt}`
      const filePath = `clientes/${user.id}/${fileName}`
      const { error } = await supabase.storage.from('fotos-aventuras').upload(filePath, file)
      if (error) { console.error(error); continue }
      const { data: { publicUrl } } = supabase.storage.from('fotos-aventuras').getPublicUrl(filePath)
      novasUrls.push(publicUrl)
    }
    const novasFotos = [...fotos, ...novasUrls]
    await supabase.from('users').update({ fotos_aventuras: novasFotos }).eq('id', user.id)
    setFotos(novasFotos)
    setMensagem(`✅ ${novasUrls.length} foto(s) adicionada(s)!`)
    setUploading(false)
    setTimeout(() => setMensagem(''), 3000)
  }

  const removerFoto = async (index: number) => {
    if (!confirm('Remover esta foto?')) return
    const novasFotos = fotos.filter((_, i) => i !== index)
    await supabase.from('users').update({ fotos_aventuras: novasFotos }).eq('id', user.id)
    setFotos(novasFotos)
    setMensagem('✅ Foto removida!')
    setTimeout(() => setMensagem(''), 3000)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (!user) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando...</div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <style jsx global>{`
        @media (min-width: 768px) {
          .perfil-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 32px 24px;
          }
          .perfil-card {
            display: flex !important;
            flex-direction: row !important;
            align-items: flex-start !important;
            text-align: left !important;
            gap: 32px !important;
          }
          .perfil-avatar {
            width: 120px !important;
            height: 120px !important;
          }
          .perfil-avatar span {
            font-size: 48px !important;
          }
          .perfil-stats {
            justify-content: flex-start !important;
            gap: 48px !important;
          }
          .perfil-stats div {
            text-align: left !important;
          }
          .medalhas-grid {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 16px !important;
            justify-content: flex-start !important;
          }
          .medalha-card {
            width: 100px !important;
            padding: 12px !important;
          }
          .conquista-card {
            width: 90px !important;
            padding: 12px !important;
          }
          .fotos-grid {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 16px !important;
          }
          .foto-meta {
            flex-wrap: wrap !important;
            gap: 12px !important;
          }
        }
      `}</style>

      <UploadAvatarModal isOpen={modalAberto} onClose={() => setModalAberto(false)} userId={user.id} onAvatarUpdated={setAvatarPreview} />

      {/* HEADER */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>🏔️ PussikTrails</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => router.push('/cliente/dashboard')} style={{ backgroundColor: '#f3f4f6', border: 'none', padding: '6px 12px', borderRadius: '40px', fontSize: '12px', cursor: 'pointer' }}>Dashboard</button>
            <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '40px', fontSize: '12px', cursor: 'pointer' }}>Sair</button>
          </div>
        </div>
      </div>

      <div className="perfil-container" style={{ padding: '16px' }}>
        
        {/* CARD PERFIL */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
          <div className="perfil-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
            <button onClick={() => setModalAberto(true)} className="perfil-avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: 'none', cursor: 'pointer' }}>
              {avatarPreview ? <img src={avatarPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '36px', color: 'white' }}>{(nome || user.email)?.charAt(0).toUpperCase() || 'A'}</span>}
            </button>
            <div style={{ flex: 1 }}>
              {editandoNome ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }} autoFocus />
                  <button onClick={salvarNome} style={{ backgroundColor: '#16a34a', color: 'white', padding: '4px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Salvar</button>
                  <button onClick={() => { setEditandoNome(false); carregarNome(user.id); }} style={{ backgroundColor: '#e5e7eb', padding: '4px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>X</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{nome || user.email}</h2>
                  <button onClick={() => setEditandoNome(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>✏️</button>
                </div>
              )}
              <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '4px' }}>📅 Aventureiro desde {new Date().getFullYear()}</p>
              
              <div className="perfil-stats" style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '12px', flexWrap: 'wrap' }}>
                <div><div style={{ fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>{totalKm}</div><div style={{ fontSize: '9px', color: '#6b7280' }}>KM</div></div>
                <div><div style={{ fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>{totalTrilhas}</div><div style={{ fontSize: '9px', color: '#6b7280' }}>Trilhas</div></div>
                <div><div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>{conquistasKm.filter(m => m.desbloqueado).length}</div><div style={{ fontSize: '9px', color: '#6b7280' }}>Medalhas</div></div>
              </div>
            </div>
          </div>
          
          {editandoBio ? (
            <div style={{ marginTop: '16px' }}>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Escreva algo sobre você..." style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '13px', resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button onClick={salvarBio} style={{ backgroundColor: '#16a34a', color: 'white', padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Salvar</button>
                <button onClick={() => { setEditandoBio(false); carregarBio(user.id); }} style={{ backgroundColor: '#e5e7eb', padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div onClick={() => setEditandoBio(true)} style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '12px', cursor: 'pointer', maxHeight: '80px', overflowY: 'auto' }}>
              {bio ? <p style={{ margin: 0, fontSize: '12px', color: '#4b5563' }}>{bio}</p> : <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>✏️ Clique para adicionar uma biografia...</p>}
            </div>
          )}
          {mensagem && <div style={{ marginTop: '12px', padding: '8px', borderRadius: '8px', textAlign: 'center', fontSize: '12px', backgroundColor: mensagem.includes('✅') ? '#dcfce7' : '#fee2e2', color: mensagem.includes('✅') ? '#16a34a' : '#dc2626' }}>{mensagem}</div>}
        </div>

        {/* BARRA DE PROGRESSO */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ marginBottom: '8px', fontSize: '12px', color: '#4b5563' }}>🎯 Próximo marco: <strong>{proximoMarco} km</strong> (faltam {Math.max(0, proximoMarco - totalKm)} km)</p>
          <div style={{ backgroundColor: '#e5e7eb', borderRadius: '20px', height: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${progressoParaProximoMarco}%`, backgroundColor: '#3b82f6', height: '100%', borderRadius: '20px' }} />
          </div>
        </div>

        {/* CONQUISTAS POR KM */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>🏅 Conquistas por KM</h3>
          <div className="medalhas-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {conquistasKm.map((c, i) => (
              <div key={i} className="conquista-card" style={{ flex: '0 0 auto', width: '65px', backgroundColor: c.desbloqueado ? '#dcfce7' : '#f9fafb', borderRadius: '12px', padding: '8px 4px', textAlign: 'center', border: c.desbloqueado ? '1px solid #bbf7d0' : '1px solid #e5e7eb', opacity: c.desbloqueado ? 1 : 0.6 }}>
                <div style={{ fontSize: '24px' }}>{c.icone}</div>
                <div style={{ fontSize: '8px', fontWeight: 'bold' }}>{c.nome.split(' ')[0]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* MEDALHAS ESPECIAIS */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>🎖️ Medalhas</h3>
          <div className="medalhas-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {medalhas.map((m, idx) => {
              const desbloqueado = m.progresso >= m.meta
              return (
                <div key={idx} className="medalha-card" style={{ flex: '0 0 auto', width: '65px', backgroundColor: desbloqueado ? '#dcfce7' : '#f9fafb', borderRadius: '12px', padding: '8px 4px', textAlign: 'center', border: desbloqueado ? '1px solid #bbf7d0' : '1px solid #e5e7eb', opacity: desbloqueado ? 1 : 0.6 }}>
                  <div style={{ fontSize: '24px', position: 'relative', display: 'inline-block' }}>
                    {m.icone}
                    {!desbloqueado && <span style={{ position: 'absolute', top: '-5px', right: '-8px', fontSize: '10px' }}>🔒</span>}
                  </div>
                  <div style={{ fontSize: '8px', fontWeight: 'bold' }}>{m.nome}</div>
                  <div style={{ fontSize: '7px', color: '#9ca3af' }}>{m.progresso}/{m.meta}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* FOTOS */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>📸 Fotos</h3>
            <p style={{ fontSize: '11px', color: '#6b7280' }}>{fotos.length}/{fotosLiberadas}</p>
          </div>
          
          <label style={{ display: 'block', textAlign: 'center', backgroundColor: '#16a34a', color: 'white', padding: '10px', borderRadius: '40px', cursor: 'pointer', marginBottom: '16px', fontSize: '13px' }}>
            {uploading ? 'Enviando...' : '📤 Enviar fotos'}
            <input type="file" accept="image/*" multiple onChange={handleUploadFotos} disabled={uploading} style={{ display: 'none' }} />
          </label>

          <div className="foto-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginBottom: '12px' }}>
            {metasFotos.slice(0, 6).map((meta, i) => (
              <span key={i} style={{ backgroundColor: totalKm >= meta.km ? '#3b82f6' : '#e5e7eb', color: totalKm >= meta.km ? 'white' : '#6b7280', padding: '2px 8px', borderRadius: '20px', fontSize: '9px' }}>{meta.km}km</span>
            ))}
          </div>

          {fotos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#f9fafb', borderRadius: '16px' }}>
              <span style={{ fontSize: '32px' }}>🏞️</span>
              <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>Envie suas aventuras!</p>
            </div>
          ) : (
            <div className="fotos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {fotos.slice(0, 12).map((url, idx) => (
                <div key={idx} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
                  <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => removerFoto(idx)} style={{ position: 'absolute', top: '4px', right: '4px', backgroundColor: '#dc2626', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', fontSize: '12px' }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}