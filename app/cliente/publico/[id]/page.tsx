'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { registrarAtividade } from '@/lib/logAtividade'

const niveisCurtidas = [
  { limite: 0, cor: '#9ca3af', icone: '🎖️', nome: 'Iniciante' },
  { limite: 5, cor: '#cd7f32', icone: '🥉', nome: 'Bronze' },
  { limite: 25, cor: '#c0c0c0', icone: '🥈', nome: 'Prata' },
  { limite: 100, cor: '#ffd700', icone: '🥇', nome: 'Ouro' },
  { limite: 250, cor: '#e5e4e2', icone: '💎', nome: 'Platina' },
  { limite: 500, cor: '#111111', icone: '🖤', nome: 'Black' }
]

const MEDALHAS_ESPECIAIS = [
  { nome: 'Trilhas Concluídas', icone: '🥾', meta: 1 },
  { nome: 'KM Percorridos', icone: '👣', meta: 10 },
  { nome: 'Fotógrafo', icone: '📸', meta: 3 },
  { nome: 'Avaliações', icone: '⭐', meta: 1 },
  { nome: 'Reservas', icone: '💳', meta: 1 }
]

const CONQUISTAS_KM = [
  { nome: 'Primeira Trilha', icone: '🥾', km: 0 },
  { nome: 'Explorador', icone: '🌱', km: 32 },
  { nome: 'Caminhante', icone: '🚶', km: 96 },
  { nome: 'Aventureiro', icone: '🏔️', km: 384 },
  { nome: 'Mestre', icone: '👑', km: 1152 },
  { nome: 'Lenda', icone: '🌟', km: 1920 },
  { nome: 'Lenda Absoluta', icone: '🔥', km: 3840 }
]

export default function PerfilPublicoCliente() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [cliente, setCliente] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [totalKm, setTotalKm] = useState(0)
  const [totalTrilhas, setTotalTrilhas] = useState(0)
  const [avaliacaoMedia, setAvaliacaoMedia] = useState(0)
  const [fotos, setFotos] = useState<string[]>([])
  const [bio, setBio] = useState('')
  const [curtidasFotos, setCurtidasFotos] = useState<Record<string, number>>({})
  const [usuarioCurtiuFoto, setUsuarioCurtiuFoto] = useState<Record<string, boolean>>({})
  const [curtidasPerfil, setCurtidasPerfil] = useState(0)
  const [usuarioCurtiuPerfil, setUsuarioCurtiuPerfil] = useState(false)
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null)
  const [medalhasEspeciais, setMedalhasEspeciais] = useState<any[]>([])

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) setUsuarioLogado(JSON.parse(userData))
  }, [])

  useEffect(() => {
    if (!id) return
    const carregarDados = async () => {
      const { data: clienteData } = await supabase
        .from('users')
        .select('id, nome, avatar_url, fotos_aventuras, bio, created_at, tipo, avaliacao_media_cliente')
        .eq('id', id)
        .single()

      if (!clienteData || clienteData.tipo !== 'cliente') {
        setCarregando(false)
        return
      }

      setCliente(clienteData)
      setFotos(clienteData.fotos_aventuras || [])
      setBio(clienteData.bio || '')
      setAvaliacaoMedia(clienteData.avaliacao_media_cliente || 0)

      const { data: reservas } = await supabase
        .from('reservas')
        .select('*, roteiro:roteiro_id(km)')
        .eq('cliente_id', id)
        .eq('status', 'realizada')

      let kmTotal = 0
      reservas?.forEach(r => { kmTotal += r.roteiro?.km || 0 })
      setTotalKm(kmTotal)
      setTotalTrilhas(reservas?.length || 0)

      if (clienteData.fotos_aventuras?.length) {
        const { data: curtidas } = await supabase
          .from('curtidas_fotos')
          .select('foto_url')
          .eq('dono_id', id)
        const map: Record<string, number> = {}
        curtidas?.forEach((c: any) => { map[c.foto_url] = (map[c.foto_url] || 0) + 1 })
        setCurtidasFotos(map)

        if (usuarioLogado) {
          const { data: minhas } = await supabase
            .from('curtidas_fotos')
            .select('foto_url')
            .eq('usuario_id', usuarioLogado.id)
          const curtidasMap: Record<string, boolean> = {}
          minhas?.forEach((c: any) => { curtidasMap[c.foto_url] = true })
          setUsuarioCurtiuFoto(curtidasMap)
        }
      }

      const { count } = await supabase
        .from('curtidas_perfil')
        .select('*', { count: 'exact', head: true })
        .eq('dono_id', id)
      setCurtidasPerfil(count || 0)

      if (usuarioLogado && usuarioLogado.id !== id) {
        const { data: jaCurtiu } = await supabase
          .from('curtidas_perfil')
          .select('id')
          .eq('dono_id', id)
          .eq('curtidor_id', usuarioLogado.id)
          .maybeSingle()
        setUsuarioCurtiuPerfil(!!jaCurtiu)
      }

      const { data: progresso } = await supabase
        .from('usuarios_medalhas')
        .select('progresso_atual, medalha:medalha_id(nome)')
        .eq('usuario_id', id)

      const mapa = new Map()
      progresso?.forEach((item: any) => {
        if (item.medalha?.nome) mapa.set(item.medalha.nome, item.progresso_atual || 0)
      })

      const medalhasAtualizadas = MEDALHAS_ESPECIAIS.map(m => ({
        ...m,
        progresso: mapa.get(m.nome) || 0,
        desbloqueado: (mapa.get(m.nome) || 0) >= m.meta
      }))
      setMedalhasEspeciais(medalhasAtualizadas)

      setCarregando(false)
    }
    carregarDados()
  }, [id, usuarioLogado])

  const curtirFoto = async (fotoUrl: string) => {
    if (!usuarioLogado) { router.push('/login'); return }
    const isCurtindo = !usuarioCurtiuFoto[fotoUrl]
    if (isCurtindo) {
      await supabase.from('curtidas_fotos').insert({ foto_url: fotoUrl, dono_id: cliente.id, usuario_id: usuarioLogado.id })
      setUsuarioCurtiuFoto(prev => ({ ...prev, [fotoUrl]: true }))
      setCurtidasFotos(prev => ({ ...prev, [fotoUrl]: (prev[fotoUrl] || 0) + 1 }))
    } else {
      await supabase.from('curtidas_fotos').delete().eq('foto_url', fotoUrl).eq('usuario_id', usuarioLogado.id)
      setUsuarioCurtiuFoto(prev => ({ ...prev, [fotoUrl]: false }))
      setCurtidasFotos(prev => ({ ...prev, [fotoUrl]: Math.max((prev[fotoUrl] || 0) - 1, 0) }))
    }
  }

  const curtirPerfil = async () => {
    if (!usuarioLogado || usuarioLogado.id === cliente.id) return
    const isCurtindo = !usuarioCurtiuPerfil
    if (isCurtindo) {
      await supabase.from('curtidas_perfil').insert({ dono_id: cliente.id, curtidor_id: usuarioLogado.id })
      setCurtidasPerfil(prev => prev + 1)
      setUsuarioCurtiuPerfil(true)
    } else {
      await supabase.from('curtidas_perfil').delete().eq('dono_id', cliente.id).eq('curtidor_id', usuarioLogado.id)
      setCurtidasPerfil(prev => prev - 1)
      setUsuarioCurtiuPerfil(false)
    }
  }

  const getMedalhaInfo = (curtidas: number) => {
    let nivel = niveisCurtidas[0]
    for (let i = niveisCurtidas.length - 1; i >= 0; i--) {
      if (curtidas >= niveisCurtidas[i].limite) {
        nivel = niveisCurtidas[i]
        break
      }
    }
    return nivel
  }

  const medalhaInfo = getMedalhaInfo(curtidasPerfil)

  if (carregando) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando...</div>
  }

  if (!cliente) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Perfil não encontrado</div>
  }

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
        }
      `}</style>

      {/* HEADER */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>🏔️ PussikTrails</h1>
          <button onClick={() => router.back()} style={{ backgroundColor: '#f3f4f6', border: 'none', padding: '6px 16px', borderRadius: '40px', cursor: 'pointer', fontSize: '13px' }}>← Voltar</button>
        </div>
      </div>

      <div className="perfil-container" style={{ padding: '16px' }}>
        
        {/* CARD DO PERFIL */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
          <div className="perfil-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
            <div className="perfil-avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {cliente.avatar_url ? <img src={cliente.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '36px', color: 'white' }}>{cliente.nome?.charAt(0).toUpperCase() || 'A'}</span>}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>{cliente.nome || 'Aventureiro'}</h2>
              <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>🏔️ Aventureiro | 📅 Desde {new Date(cliente.created_at).getFullYear()}</p>
              
              <div className="perfil-stats" style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px', flexWrap: 'wrap' }}>
                <div><div style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>{totalKm}</div><div style={{ fontSize: '10px', color: '#6b7280' }}>KM</div></div>
                <div><div style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>{totalTrilhas}</div><div style={{ fontSize: '10px', color: '#6b7280' }}>Trilhas</div></div>
                <div><div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>{avaliacaoMedia > 0 ? avaliacaoMedia.toFixed(1) : '0.0'}</div><div style={{ fontSize: '10px', color: '#6b7280' }}>⭐</div></div>
              </div>
            </div>
          </div>
          
          {bio && (
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '12px', maxHeight: '100px', overflowY: 'auto' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#4b5563', lineHeight: 1.4 }}>{bio}</p>
            </div>
          )}
        </div>

        {/* CARD DE CONQUISTAS */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>🏆 Conquistas</h3>
            <button onClick={curtirPerfil} disabled={!usuarioLogado || usuarioLogado.id === cliente.id} style={{ background: '#f3f4f6', border: 'none', cursor: usuarioLogado && usuarioLogado.id !== cliente.id ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '40px' }}>
              <span style={{ fontSize: '20px' }}>{medalhaInfo.icone}</span>
              <span style={{ fontWeight: 'bold', fontSize: '14px', color: medalhaInfo.cor }}>{curtidasPerfil}</span>
            </button>
          </div>

          {/* Medalhas Especiais */}
          <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280', marginBottom: '10px' }}>🎖️ Medalhas</h4>
          <div className="medalhas-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
            {medalhasEspeciais.map((m, idx) => {
              const desbloqueado = m.desbloqueado
              return (
                <div key={idx} className="medalha-card" style={{ flex: '0 0 auto', width: '70px', backgroundColor: desbloqueado ? '#dcfce7' : '#f9fafb', borderRadius: '12px', padding: '8px 4px', textAlign: 'center', border: desbloqueado ? '1px solid #bbf7d0' : '1px solid #e5e7eb', opacity: desbloqueado ? 1 : 0.6 }}>
                  <div style={{ fontSize: '24px', position: 'relative', display: 'inline-block' }}>
                    {m.icone}
                    {!desbloqueado && <span style={{ position: 'absolute', top: '-5px', right: '-8px', fontSize: '10px' }}>🔒</span>}
                  </div>
                  <div style={{ fontSize: '8px', fontWeight: 'bold', marginTop: '4px' }}>{m.nome.split(' ')[0]}</div>
                  <div style={{ fontSize: '7px', color: desbloqueado ? '#16a34a' : '#9ca3af', marginTop: '2px' }}>{m.desbloqueado ? '✅' : `${m.progresso}/${m.meta}`}</div>
                </div>
              )
            })}
          </div>

          {/* Conquistas por KM */}
          <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280', marginBottom: '10px' }}>🏅 Por KM</h4>
          <div className="medalhas-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {CONQUISTAS_KM.map((c, idx) => {
              const desbloqueado = totalKm >= c.km
              return (
                <div key={idx} className="conquista-card" style={{ flex: '0 0 auto', width: '70px', backgroundColor: desbloqueado ? '#dcfce7' : '#f9fafb', borderRadius: '12px', padding: '8px 4px', textAlign: 'center', border: desbloqueado ? '1px solid #bbf7d0' : '1px solid #e5e7eb', opacity: desbloqueado ? 1 : 0.6 }}>
                  <div style={{ fontSize: '24px', position: 'relative', display: 'inline-block' }}>
                    {c.icone}
                    {!desbloqueado && <span style={{ position: 'absolute', top: '-5px', right: '-8px', fontSize: '10px' }}>🔒</span>}
                  </div>
                  <div style={{ fontSize: '8px', fontWeight: 'bold', marginTop: '4px' }}>{c.nome.split(' ')[0]}</div>
                  <div style={{ fontSize: '7px', color: desbloqueado ? '#16a34a' : '#9ca3af', marginTop: '2px' }}>{desbloqueado ? '✅' : `${c.km}km`}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* FOTOS */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>📸 Fotos</h3>
          {fotos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#f9fafb', borderRadius: '16px' }}>
              <span style={{ fontSize: '32px' }}>🏞️</span>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>Nenhuma foto ainda</p>
            </div>
          ) : (
            <div className="fotos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {fotos.slice(0, 12).map((url, idx) => (
                <div key={idx} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
                  <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: '6px', left: '6px', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '20px', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button onClick={() => curtirFoto(url)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: 'white' }}>{usuarioCurtiuFoto[url] ? '❤️' : '🤍'}</button>
                    <span style={{ fontSize: '9px', color: 'white' }}>{curtidasFotos[url] || 0}</span>
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