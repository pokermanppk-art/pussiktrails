'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function PerfilPublicoGuia() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [guia, setGuia] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [totalKm, setTotalKm] = useState(0)
  const [totalRoteiros, setTotalRoteiros] = useState(0)
  const [totalClientes, setTotalClientes] = useState(0)
  const [avaliacaoMedia, setAvaliacaoMedia] = useState(0)
  const [totalAvaliacoes, setTotalAvaliacoes] = useState(0)
  const [bio, setBio] = useState('')
  const [avaliacoes, setAvaliacoes] = useState<any[]>([])

  const [medalhas, setMedalhas] = useState<any[]>([])
  const [carregandoMedalhas, setCarregandoMedalhas] = useState(true)

  const metasKmGuia = [
    { km: 32, nome: '🥉 Bronze' }, { km: 96, nome: '🥈 Prata' },
    { km: 192, nome: '🥇 Ouro' }, { km: 384, nome: '💎 Platina' },
    { km: 768, nome: '⚡ Elite' }, { km: 1152, nome: '👑 Master' },
    { km: 1920, nome: '🌟 Lenda' }, { km: 3840, nome: '🔥 Lenda Absoluta' }
  ]

  const getNivelKm = (km: number) => {
    for (let i = metasKmGuia.length - 1; i >= 0; i--) {
      if (km >= metasKmGuia[i].km) return metasKmGuia[i].nome
    }
    return '🥉 Bronze'
  }

  const getIconeKm = (km: number) => {
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

  const calcularProximoMarco = (km: number) => {
    for (const meta of metasKmGuia) if (km < meta.km) return meta.km
    return metasKmGuia[metasKmGuia.length - 1].km
  }

  const getProgresso = (km: number) => {
    const proximo = calcularProximoMarco(km)
    const anterior = metasKmGuia.find(m => m.km < proximo)?.km || 0
    if (proximo === anterior) return 100
    return Math.min(((km - anterior) / (proximo - anterior)) * 100, 100)
  }

  const conquistasKm = [
    { nome: 'Primeira Trilha', icone: '🥾', km: 0 },
    { nome: 'Explorador', icone: '🌱', km: 32 },
    { nome: 'Caminhante', icone: '🚶', km: 96 },
    { nome: 'Aventureiro', icone: '🏔️', km: 384 },
    { nome: 'Mestre', icone: '👑', km: 1152 },
    { nome: 'Lenda', icone: '🌟', km: 1920 },
    { nome: 'Lenda Absoluta', icone: '🔥', km: 3840 },
  ]

  const getNotaEstrelas = (nota: number) => '★'.repeat(nota) + '☆'.repeat(5 - nota)

  useEffect(() => {
    const carregar = async () => {
      const { data: guiaData } = await supabase.from('users').select('*').eq('id', id).single()
      if (!guiaData) { setCarregando(false); return }
      setGuia(guiaData)
      setBio(guiaData.bio || '')

      const { data: roteiros } = await supabase.from('roteiros').select('id, km').eq('id_guia', id)
      const totalK = roteiros?.reduce((acc, r) => acc + (r.km || 0), 0) || 0
      setTotalKm(totalK)
      setTotalRoteiros(roteiros?.length || 0)

      const roteirosIds = roteiros?.map(r => r.id) || []
      if (roteirosIds.length > 0) {
        const { data: reservas } = await supabase.from('reservas').select('cliente_id').in('roteiro_id', roteirosIds)
        setTotalClientes(new Set(reservas?.map(r => r.cliente_id)).size)
      }

      const { data: avaliacoesData } = await supabase
        .from('avaliacoes')
        .select('id, nota, comentario, resposta_guia, created_at')
        .eq('guia_id', id)
        .eq('status_moderacao', 'aprovada')
        .order('created_at', { ascending: false })
      if (avaliacoesData) {
        setAvaliacoes(avaliacoesData)
        setTotalAvaliacoes(avaliacoesData.length)
        const media = avaliacoesData.length ? avaliacoesData.reduce((a, b) => a + b.nota, 0) / avaliacoesData.length : 0
        setAvaliacaoMedia(media)
      }

      await carregarMedalhas(guiaData.id)
      setCarregando(false)
    }
    if (id) carregar()
  }, [id])

  const carregarMedalhas = async (guiaId: string) => {
    setCarregandoMedalhas(true)
    try {
      const { data: progresso } = await supabase
        .from('usuarios_medalhas')
        .select('progresso_atual, medalha:medalha_id(nome)')
        .eq('usuario_id', guiaId)

      const mapa = new Map()
      progresso?.forEach((item: any) => {
        if (item.medalha?.nome) mapa.set(item.medalha.nome, item.progresso_atual || 0)
      })

      const listaMedalhas = [
        { nome: 'KM Guiados', icone: '👣', meta: 32, valor: totalKm },
        { nome: 'Guias Avaliados', icone: '⭐', meta: 5, valor: totalAvaliacoes },
        { nome: 'Trilhas Guiadas', icone: '🥾', meta: 1, valor: totalRoteiros },
        { nome: 'Clientes Atendidos', icone: '👥', meta: 5, valor: totalClientes }
      ].map(m => ({
        ...m,
        progresso: mapa.get(m.nome) || m.valor,
        desbloqueado: (mapa.get(m.nome) || m.valor) >= m.meta
      }))

      setMedalhas(listaMedalhas)
    } catch (err) { console.error(err) } finally { setCarregandoMedalhas(false) }
  }

  if (carregando) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando...</div>
  if (!guia) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Guia não encontrado</div>

  const nivelInfo = getNivelKm(totalKm)
  const proximoMarco = calcularProximoMarco(totalKm)
  const progresso = getProgresso(totalKm)

  // CSS responsivo via media query
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768

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
            display: flex;
            flex-direction: row !important;
            align-items: flex-start !important;
            gap: 32px !important;
            text-align: left !important;
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
            flex-direction: row !important;
            flex-wrap: wrap !important;
            gap: 16px !important;
          }
          .medalha-card {
            width: 120px !important;
            padding: 16px !important;
          }
          .conquista-card {
            width: 100px !important;
            padding: 12px !important;
          }
          .avaliacao-card {
            padding: 20px !important;
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
        
        {/* CARD PERFIL */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
          <div className="perfil-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
            <div className="perfil-avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {guia.avatar_url ? <img src={guia.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '36px', color: 'white' }}>{guia.nome?.charAt(0).toUpperCase() || 'G'}</span>}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{guia.nome || guia.email || 'Guia'}</h2>
              <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '4px' }}>📅 Guia desde {new Date(guia.created_at).getFullYear()}</p>
              
              <div className="perfil-stats" style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '12px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>{totalKm}</div><div style={{ fontSize: '9px', color: '#6b7280' }}>KM</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>{totalRoteiros}</div><div style={{ fontSize: '9px', color: '#6b7280' }}>Roteiros</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>{totalClientes}</div><div style={{ fontSize: '9px', color: '#6b7280' }}>Clientes</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>{avaliacaoMedia.toFixed(1)}</div><div style={{ fontSize: '9px', color: '#6b7280' }}>⭐</div></div>
              </div>
            </div>
          </div>
          {bio && <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '12px', maxHeight: '100px', overflowY: 'auto' }}><p style={{ margin: 0, fontSize: '12px', color: '#4b5563' }}>{bio}</p></div>}
        </div>

        {/* BARRA PROGRESSO KM */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '32px' }}>{getIconeKm(totalKm)}</span>
            <div><div style={{ fontWeight: 'bold', fontSize: '14px' }}>{nivelInfo}</div><div style={{ fontSize: '10px', color: '#6b7280' }}>{totalKm} km guiados</div></div>
          </div>
          <p style={{ marginBottom: '8px', fontSize: '11px', color: '#4b5563' }}>🎯 Próximo marco: <strong>{proximoMarco} km</strong> (faltam {Math.max(0, proximoMarco - totalKm)} km)</p>
          <div style={{ backgroundColor: '#e5e7eb', borderRadius: '20px', height: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${progresso}%`, backgroundColor: '#3b82f6', height: '100%', borderRadius: '20px' }} />
          </div>
        </div>

        {/* CONQUISTAS POR KM */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>🏅 Conquistas por KM</h3>
          <div className="medalhas-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {conquistasKm.map((c, i) => {
              const desbloqueado = totalKm >= c.km
              return (
                <div key={i} className="conquista-card" style={{ flex: '0 0 auto', width: '65px', backgroundColor: desbloqueado ? '#dcfce7' : '#f9fafb', borderRadius: '12px', padding: '8px 4px', textAlign: 'center', border: desbloqueado ? '1px solid #bbf7d0' : '1px solid #e5e7eb', opacity: desbloqueado ? 1 : 0.6 }}>
                  <div style={{ fontSize: '24px' }}>{c.icone}</div>
                  <div style={{ fontSize: '8px', fontWeight: 'bold' }}>{c.nome}</div>
                  <div style={{ fontSize: '7px', color: '#9ca3af' }}>{desbloqueado ? '✅' : `${c.km}km`}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* MEDALHAS ESPECIAIS */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>🎖️ Medalhas Especiais</h3>
          {carregandoMedalhas ? (
            <div style={{ textAlign: 'center', padding: '16px' }}>Carregando...</div>
          ) : (
            <div className="medalhas-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {medalhas.map((m, idx) => (
                <div key={idx} className="medalha-card" style={{ flex: '0 0 auto', width: '75px', backgroundColor: m.desbloqueado ? '#dcfce7' : '#f9fafb', borderRadius: '12px', padding: '10px 4px', textAlign: 'center', border: m.desbloqueado ? '1px solid #bbf7d0' : '1px solid #e5e7eb', opacity: m.desbloqueado ? 1 : 0.6 }}>
                  <div style={{ fontSize: '28px', position: 'relative', display: 'inline-block' }}>
                    {m.icone}
                    {!m.desbloqueado && <span style={{ position: 'absolute', top: '-5px', right: '-8px', fontSize: '10px' }}>🔒</span>}
                  </div>
                  <div style={{ fontSize: '8px', fontWeight: 'bold' }}>{m.nome}</div>
                  <div style={{ fontSize: '7px', color: m.desbloqueado ? '#16a34a' : '#9ca3af' }}>{m.desbloqueado ? `✅ ${m.valor}/${m.meta}` : `${m.valor}/${m.meta}`}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AVALIAÇÕES */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>💬 Avaliações ({totalAvaliacoes})</h3>
          {avaliacoes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#f9fafb', borderRadius: '16px' }}>
              <span style={{ fontSize: '32px' }}>💬</span>
              <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>Nenhuma avaliação ainda</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {avaliacoes.slice(0, 5).map((a) => (
                <div key={a.id} className="avaliacao-card" style={{ backgroundColor: '#f9fafb', borderRadius: '16px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#f59e0b' }}>{getNotaEstrelas(a.nota)}</div>
                    <div style={{ fontSize: '9px', color: '#9ca3af' }}>{new Date(a.created_at).toLocaleDateString('pt-BR')}</div>
                  </div>
                  {a.comentario && <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#4b5563' }}>“{a.comentario}”</p>}
                  {a.resposta_guia && <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #e5e7eb' }}><p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', color: '#16a34a' }}>Resposta:</p><p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#4b5563' }}>{a.resposta_guia}</p></div>}
                </div>
              ))}
              {totalAvaliacoes > 5 && <button onClick={() => router.push(`/guia/avaliacoes`)} style={{ textAlign: 'center', color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', padding: '8px' }}>Ver todas →</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}