'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import MedalhasGrid from '@/components/MedalhasGrid'
import { registrarAtividade } from '@/lib/logAtividade'

// Níveis de medalha para curtidas do perfil
const niveisCurtidas = [
  { limite: 0, cor: '#9ca3af', icone: '🎖️', nome: 'Iniciante' },
  { limite: 5, cor: '#cd7f32', icone: '🥉', nome: 'Bronze' },
  { limite: 25, cor: '#c0c0c0', icone: '🥈', nome: 'Prata' },
  { limite: 100, cor: '#ffd700', icone: '🥇', nome: 'Ouro' },
  { limite: 250, cor: '#e5e4e2', icone: '💎', nome: 'Platina' },
  { limite: 500, cor: '#111111', icone: '🖤', nome: 'Black' }
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

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUsuarioLogado(JSON.parse(userData))
    }
  }, [])

  useEffect(() => {
    if (!id) return

    const carregarDados = async () => {
      // Dados do cliente
      const { data: clienteData, error } = await supabase
        .from('users')
        .select('id, nome, avatar_url, fotos_aventuras, bio, created_at, tipo, avaliacao_media_cliente')
        .eq('id', id)
        .single()

      if (error || !clienteData || clienteData.tipo !== 'cliente') {
        setCarregando(false)
        return
      }

      setCliente(clienteData)
      setFotos(clienteData.fotos_aventuras || [])
      setBio(clienteData.bio || '')
      setAvaliacaoMedia(clienteData.avaliacao_media_cliente || 0)

      // Estatísticas de km e trilhas
      const { data: reservas } = await supabase
        .from('reservas')
        .select('*, roteiro:roteiro_id(km)')
        .eq('cliente_id', id)
        .eq('status', 'realizada')

      let kmTotal = 0
      reservas?.forEach(r => { kmTotal += r.roteiro?.km || 0 })
      setTotalKm(kmTotal)
      setTotalTrilhas(reservas?.length || 0)

      // Curtidas nas fotos
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
        } else {
          setUsuarioCurtiuFoto({})
        }
      }

      // Curtidas no perfil
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
      } else {
        setUsuarioCurtiuPerfil(false)
      }

      setCarregando(false)
    }

    carregarDados()
  }, [id, usuarioLogado])

  const curtirFoto = async (fotoUrl: string) => {
    if (!usuarioLogado) {
      router.push('/login')
      return
    }

    const isCurtindo = !usuarioCurtiuFoto[fotoUrl]

    if (isCurtindo) {
      const { error } = await supabase
        .from('curtidas_fotos')
        .insert({ foto_url: fotoUrl, dono_id: cliente.id, usuario_id: usuarioLogado.id })

      if (!error) {
        setUsuarioCurtiuFoto(prev => ({ ...prev, [fotoUrl]: true }))
        setCurtidasFotos(prev => ({ ...prev, [fotoUrl]: (prev[fotoUrl] || 0) + 1 }))

        const primeiroNome = usuarioLogado.nome?.split(' ')[0] || usuarioLogado.email?.split('@')[0] || 'Usuário'
        const tipoUsuario = usuarioLogado.tipo === 'cliente' ? 'cliente' : 'guia'
        await registrarAtividade(usuarioLogado.id, tipoUsuario, primeiroNome, 'curtiu_foto', `${primeiroNome} curtiu a foto de ${cliente.nome}`, cliente.id)
      }
    } else {
      const { error } = await supabase
        .from('curtidas_fotos')
        .delete()
        .eq('foto_url', fotoUrl)
        .eq('usuario_id', usuarioLogado.id)

      if (!error) {
        setUsuarioCurtiuFoto(prev => ({ ...prev, [fotoUrl]: false }))
        setCurtidasFotos(prev => ({ ...prev, [fotoUrl]: Math.max((prev[fotoUrl] || 0) - 1, 0) }))

        const primeiroNome = usuarioLogado.nome?.split(' ')[0] || usuarioLogado.email?.split('@')[0] || 'Usuário'
        const tipoUsuario = usuarioLogado.tipo === 'cliente' ? 'cliente' : 'guia'
        await registrarAtividade(usuarioLogado.id, tipoUsuario, primeiroNome, 'descurtiu_foto', `${primeiroNome} descurtiu a foto de ${cliente.nome}`, cliente.id)
      }
    }
  }

  const curtirPerfil = async () => {
    if (!usuarioLogado || usuarioLogado.id === cliente.id) return

    const isCurtindo = !usuarioCurtiuPerfil

    if (isCurtindo) {
      const { error } = await supabase
        .from('curtidas_perfil')
        .insert({ dono_id: cliente.id, curtidor_id: usuarioLogado.id })

      if (!error) {
        setCurtidasPerfil(prev => prev + 1)
        setUsuarioCurtiuPerfil(true)

        const primeiroNome = usuarioLogado.nome?.split(' ')[0] || usuarioLogado.email?.split('@')[0] || 'Usuário'
        const tipoUsuario = usuarioLogado.tipo === 'cliente' ? 'cliente' : 'guia'
        await registrarAtividade(usuarioLogado.id, tipoUsuario, primeiroNome, 'curtiu_perfil', `${primeiroNome} curtiu o perfil de ${cliente.nome}`, cliente.id)
      }
    } else {
      const { error } = await supabase
        .from('curtidas_perfil')
        .delete()
        .eq('dono_id', cliente.id)
        .eq('curtidor_id', usuarioLogado.id)

      if (!error) {
        setCurtidasPerfil(prev => prev - 1)
        setUsuarioCurtiuPerfil(false)

        const primeiroNome = usuarioLogado.nome?.split(' ')[0] || usuarioLogado.email?.split('@')[0] || 'Usuário'
        const tipoUsuario = usuarioLogado.tipo === 'cliente' ? 'cliente' : 'guia'
        await registrarAtividade(usuarioLogado.id, tipoUsuario, primeiroNome, 'descurtiu_perfil', `${primeiroNome} descurtiu o perfil de ${cliente.nome}`, cliente.id)
      }
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
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏔️</div>
          <div style={{ color: '#6b7280' }}>Carregando perfil...</div>
        </div>
      </div>
    )
  }

  if (!cliente) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '6px' }}>Aventureiro não encontrado</div>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>Verifique o link ou tente novamente mais tarde.</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* HEADER */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a', margin: 0 }}>🏔️ PussikTrails</h1>
          </div>
          <button onClick={() => router.back()} style={{ backgroundColor: '#f3f4f6', border: 'none', padding: '8px 20px', borderRadius: '40px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#374151' }}>← Voltar</button>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* CARD PRINCIPAL */}
        <div style={{ backgroundColor: 'white', borderRadius: '28px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Avatar */}
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {cliente.avatar_url ? (
                <img src={cliente.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '48px', color: 'white' }}>{cliente.nome?.charAt(0).toUpperCase() || 'A'}</span>
              )}
            </div>

            {/* Informações */}
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#111827' }}>{cliente.nome || 'Aventureiro'}</h2>
              <p style={{ color: '#6b7280', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>🏔️ Aventureiro</span>
                <span style={{ width: '4px', height: '4px', backgroundColor: '#d1d5db', borderRadius: '50%' }}></span>
                <span>📅 Desde {new Date(cliente.created_at).getFullYear()}</span>
              </p>

              {/* Estatísticas */}
              <div style={{ display: 'flex', gap: '32px', marginTop: '20px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{totalKm}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>KM percorridos</div>
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{totalTrilhas}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Trilhas</div>
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: avaliacaoMedia > 0 ? '#f59e0b' : '#9ca3af' }}>
                    {avaliacaoMedia > 0 ? `⭐ ${avaliacaoMedia.toFixed(1)}` : '⭐ 0.0'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Avaliação</div>
                </div>
              </div>

              {/* Bio */}
              {bio && (
                <div style={{ marginTop: '20px', backgroundColor: '#f9fafb', padding: '16px', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#4b5563', lineHeight: 1.5 }}>{bio}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CARD DE CONQUISTAS */}
        <div style={{ backgroundColor: 'white', borderRadius: '28px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '28px' }}>🏆</span>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#111827' }}>Conquistas</h3>
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Medalhas e reconhecimentos</p>
              </div>
            </div>
            <button
              onClick={curtirPerfil}
              disabled={!usuarioLogado || usuarioLogado.id === cliente.id}
              style={{
                background: 'none',
                border: 'none',
                cursor: usuarioLogado && usuarioLogado.id !== cliente.id ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '40px',
                backgroundColor: '#f3f4f6',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (usuarioLogado && usuarioLogado.id !== cliente.id) {
                  e.currentTarget.style.backgroundColor = '#e5e7eb'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6'
              }}
            >
              <span style={{ fontSize: '24px' }}>{medalhaInfo.icone}</span>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '16px', color: medalhaInfo.cor }}>{curtidasPerfil}</div>
                <div style={{ fontSize: '10px', color: '#6b7280' }}>{medalhaInfo.nome}</div>
              </div>
            </button>
          </div>
          <MedalhasGrid usuarioId={cliente.id} />
        </div>

        {/* CARD DE FOTOS */}
        <div style={{ backgroundColor: 'white', borderRadius: '28px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <span style={{ fontSize: '28px' }}>📸</span>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#111827' }}>Fotos das Aventuras</h3>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{fotos.length} foto(s) compartilhada(s)</p>
            </div>
          </div>

          {fotos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', backgroundColor: '#f9fafb', borderRadius: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏞️</div>
              <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>Nenhuma foto compartilhada</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Este aventureiro ainda não postou fotos.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {fotos.map((url, idx) => (
                <div key={idx} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#f1f5f9', border: '1px solid #e5e7eb' }}>
                  <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: '12px', left: '12px', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '40px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => curtirFoto(url)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'white', padding: 0 }}
                    >
                      {usuarioCurtiuFoto[url] ? '❤️' : '🤍'}
                    </button>
                    <span style={{ fontSize: '12px', color: 'white', fontWeight: 'bold' }}>{curtidasFotos[url] || 0}</span>
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