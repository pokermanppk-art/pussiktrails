'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Avaliacao = {
  id: string
  nota: number
  comentario: string
  resposta_guia?: string
  cliente_id: string
  cliente_nome: string
  cliente_avatar?: string
  created_at: string
}

export default function PerfilPublicoGuia() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [guia, setGuia] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [curtidas, setCurtidas] = useState<Record<string, number>>({})
  const [usuarioCurtiu, setUsuarioCurtiu] = useState<Record<string, boolean>>({})
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null)
  const [bio, setBio] = useState('')

  // Estatísticas do guia
  const [stats, setStats] = useState({
    totalRoteiros: 0,
    totalReservas: 0,
    totalClientes: 0,
    totalKm: 0,
    avaliacaoMedia: 0,
    totalAvaliacoes: 0,
    medalhaNivel: 'bronze'
  })

  // ==================== METAS DE KM PARA O GUIA (10 ANOS) ====================
  const metasKmGuia = [
    { km: 32, nome: '🥉 Bronze', icone: '🥉' },
    { km: 96, nome: '🥈 Prata', icone: '🥈' },
    { km: 192, nome: '🥇 Ouro', icone: '🥇' },
    { km: 384, nome: '💎 Platina', icone: '💎' },
    { km: 768, nome: '⚡ Elite', icone: '⚡' },
    { km: 1152, nome: '👑 Master', icone: '👑' },
    { km: 1920, nome: '🌟 Lenda', icone: '🌟' },
    { km: 3840, nome: '🔥 Lenda Absoluta', icone: '🔥' },
  ]

  const getNivelPorKm = (km: number) => {
    for (let i = metasKmGuia.length - 1; i >= 0; i--) {
      if (km >= metasKmGuia[i].km) return metasKmGuia[i]
    }
    return metasKmGuia[0]
  }

  const getIconePorKm = (km: number) => {
    const nivel = getNivelPorKm(km)
    return nivel.icone
  }

  const getNomeNivelPorKm = (km: number) => {
    const nivel = getNivelPorKm(km)
    return nivel.nome
  }

  const calcularProximoMarcoKm = (km: number) => {
    for (const meta of metasKmGuia) {
      if (km < meta.km) return meta.km
    }
    return metasKmGuia[metasKmGuia.length - 1].km
  }

  const calcularProgressoKm = (km: number) => {
    const proximo = calcularProximoMarcoKm(km)
    const anterior = metasKmGuia.find(m => m.km < proximo)?.km || 0
    if (proximo === anterior) return 100
    return Math.min(((km - anterior) / (proximo - anterior)) * 100, 100)
  }

  // ==================== CONQUISTAS POR KM (TODAS AS 7) ====================
  const conquistasKm = [
    { nome: 'Primeira Trilha', icone: '🥾', kmNecessario: 0 },
    { nome: 'Explorador Iniciante', icone: '🌱', kmNecessario: 32 },
    { nome: 'Caminhante', icone: '🚶', kmNecessario: 96 },
    { nome: 'Aventureiro', icone: '🏔️', kmNecessario: 384 },
    { nome: 'Mestre das Trilhas', icone: '👑', kmNecessario: 1152 },
    { nome: 'Lenda Viva', icone: '🌟', kmNecessario: 1920 },
    { nome: 'Lenda Absoluta', icone: '🔥', kmNecessario: 3840 },
  ]

  // ==================== MEDALHAS ESPECIAIS DO GUIA ====================
  const medalhasEspeciais = [
    { nome: 'KM Guiados', icone: '👣', meta: 32 },
    { nome: 'Guias Avaliados', icone: '⭐', meta: 5 },
    { nome: 'Trilhas Guiadas', icone: '🥾', meta: 1 },
    { nome: 'Clientes Atendidos', icone: '👥', meta: 5 },
  ]

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUsuarioLogado(JSON.parse(userData))
    }
    if (id) {
      carregarDados()
    }
  }, [id, usuarioLogado])

  const carregarDados = async () => {
    setCarregando(true)
    try {
      // Dados do guia
      const { data: guiaData } = await supabase
        .from('users')
        .select('id, nome, email, avatar_url, bio, created_at, instagram')
        .eq('id', id)
        .single()

      if (!guiaData) {
        setCarregando(false)
        return
      }

      setGuia(guiaData)
      setBio(guiaData.bio || '')

      // Roteiros do guia (com KM)
      const { data: roteiros } = await supabase
        .from('roteiros')
        .select('id, km')
        .eq('id_guia', id)
        .eq('status', 'ativo')

      const totalRoteiros = roteiros?.length || 0
      const totalKm = roteiros?.reduce((acc, r) => acc + (r.km || 0), 0) || 0
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

      // Avaliações do guia (apenas aprovadas)
      const { data: avaliacoesData } = await supabase
        .from('avaliacoes')
        .select(`
          id,
          nota,
          comentario,
          resposta_guia,
          created_at,
          cliente_id,
          cliente:cliente_id (nome, avatar_url)
        `)
        .eq('guia_id', id)
        .eq('status_moderacao', 'aprovada')
        .order('created_at', { ascending: false })

      const avaliacoesFormatadas = (avaliacoesData || []).map((a: any) => ({
        id: a.id,
        nota: a.nota,
        comentario: a.comentario,
        resposta_guia: a.resposta_guia,
        created_at: a.created_at,
        cliente_id: a.cliente_id,
        cliente_nome: a.cliente?.nome || 'Cliente',
        cliente_avatar: a.cliente?.avatar_url
      }))
      setAvaliacoes(avaliacoesFormatadas)

      // Carregar curtidas das avaliações
      if (avaliacoesFormatadas.length > 0 && usuarioLogado) {
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

      const media = avaliacoesFormatadas.length
        ? avaliacoesFormatadas.reduce((acc, a) => acc + a.nota, 0) / avaliacoesFormatadas.length
        : 0

      // Medalha baseada em roteiros
      let medalha = 'bronze'
      if (totalRoteiros >= 10) medalha = 'black'
      else if (totalRoteiros >= 7) medalha = 'platina'
      else if (totalRoteiros >= 4) medalha = 'ouro'
      else if (totalRoteiros >= 2) medalha = 'prata'

      setStats({
        totalRoteiros,
        totalReservas,
        totalClientes: clientesUnicos.size,
        totalKm,
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

  const curtirAvaliacao = async (avaliacaoId: string, guiaId: string) => {
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
          dono_id: guiaId,
          usuario_id: usuarioLogado.id
        })

      if (!error) {
        setUsuarioCurtiu(prev => ({ ...prev, [avaliacaoId]: true }))
        setCurtidas(prev => ({ ...prev, [avaliacaoId]: (prev[avaliacaoId] || 0) + 1 }))
      }
    }
  }

  const getNotaEstrelas = (nota: number) => {
    const estrelasCheias = '★'.repeat(nota)
    const estrelasVazias = '☆'.repeat(5 - nota)
    return estrelasCheias + estrelasVazias
  }

  const proximoMarcoKm = calcularProximoMarcoKm(stats.totalKm)
  const progressoKm = calcularProgressoKm(stats.totalKm)
  const nivelAtual = getNivelPorKm(stats.totalKm)

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
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Guia não encontrado</div>
          <div style={{ color: '#6b7280' }}>O perfil que você procura não está disponível.</div>
          <button onClick={() => router.back()} style={{ marginTop: '20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '10px 24px', cursor: 'pointer' }}>← Voltar</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* CABEÇALHO */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a', margin: 0 }}>🏔️ PussikTrails</h1>
          <button onClick={() => router.back()} style={{ backgroundColor: '#f3f4f6', border: 'none', padding: '8px 20px', borderRadius: '40px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#374151' }}>← Voltar</button>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* CARD PRINCIPAL DO PERFIL */}
        <div style={{ backgroundColor: 'white', borderRadius: '28px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
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
              <h2 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#111827' }}>{guia.nome || guia.email || 'Guia'}</h2>
              <p style={{ color: '#6b7280', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>📷 Instagram: {guia.instagram || 'Não informado'}</span>
                <span style={{ width: '4px', height: '4px', backgroundColor: '#d1d5db', borderRadius: '50%' }}></span>
                <span>📅 Membro desde {new Date(guia.created_at).getFullYear()}</span>
              </p>

              {/* Estatísticas rápidas */}
              <div style={{ display: 'flex', gap: '24px', marginTop: '20px', flexWrap: 'wrap' }}>
                <div><span style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{stats.totalKm}</span> <span style={{ color: '#6b7280' }}>KM guiados</span></div>
                <div><span style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{stats.totalRoteiros}</span> <span style={{ color: '#6b7280' }}>Roteiros</span></div>
                <div><span style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{stats.totalClientes}</span> <span style={{ color: '#6b7280' }}>Clientes</span></div>
                <div><span style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.avaliacaoMedia.toFixed(1)}</span> <span style={{ color: '#6b7280' }}>⭐ Avaliação</span></div>
              </div>

              {/* Biografia */}
              {bio && (
                <div style={{ marginTop: '20px', backgroundColor: '#f9fafb', padding: '16px', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                  <p style={{ margin: 0, lineHeight: 1.5, color: '#4b5563' }}>{bio}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🏅 BARRA DE PROGRESSO KM DO GUIA */}
        <div style={{ backgroundColor: 'white', borderRadius: '28px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <div style={{ fontSize: '64px' }}>{getIconePorKm(stats.totalKm)}</div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '24px' }}>{getNomeNivelPorKm(stats.totalKm)}</div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>{stats.totalKm} km guiados como líder de trilhas</div>
            </div>
          </div>
          <p style={{ marginBottom: '12px', fontSize: '14px', color: '#4b5563' }}>
            🎯 Próximo marco: <strong>{proximoMarcoKm} km</strong> (faltam {Math.max(0, proximoMarcoKm - stats.totalKm)} km)
          </p>
          <div style={{ backgroundColor: '#e5e7eb', borderRadius: '20px', height: '12px', overflow: 'hidden' }}>
            <div style={{ width: `${progressoKm}%`, backgroundColor: '#3b82f6', height: '100%', borderRadius: '20px' }} />
          </div>
        </div>

        {/* 🏅 CONQUISTAS POR KM - TODAS AS 7 */}
        <div style={{ backgroundColor: 'white', borderRadius: '28px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <span style={{ fontSize: '28px' }}>🏅</span>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#111827' }}>Conquistas por KM</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Metas alcançadas por {guia.nome || 'Guia'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
            {conquistasKm.map((m, i) => {
              const desbloqueado = stats.totalKm >= m.kmNecessario
              return (
                <div key={i} style={{ 
                  flex: '0 0 auto', 
                  width: '110px', 
                  backgroundColor: desbloqueado ? '#dcfce7' : '#f9fafb', 
                  borderRadius: '16px', 
                  padding: '16px 12px', 
                  textAlign: 'center', 
                  border: desbloqueado ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
                  opacity: desbloqueado ? 1 : 0.6
                }}>
                  <div style={{ fontSize: '36px' }}>{m.icone}</div>
                  <p style={{ fontWeight: 'bold', fontSize: '11px', marginTop: '8px', marginBottom: 0 }}>{m.nome}</p>
                  <div style={{ fontSize: '10px', color: desbloqueado ? '#16a34a' : '#9ca3af', marginTop: '6px' }}>
                    {desbloqueado ? '✅ Desbloqueado' : `🔒 ${m.kmNecessario} km`}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 🎖️ MEDALHAS ESPECIAIS DO GUIA */}
        <div style={{ backgroundColor: 'white', borderRadius: '28px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <span style={{ fontSize: '28px' }}>🎖️</span>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#111827' }}>Medalhas Especiais</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Conquistas especiais por categoria</p>
            </div>
          </div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', minWidth: 'min-content' }}>
              {medalhasEspeciais.map((medalha) => {
                let progresso = 0
                if (medalha.nome === 'KM Guiados') progresso = stats.totalKm
                else if (medalha.nome === 'Guias Avaliados') progresso = stats.totalAvaliacoes
                else if (medalha.nome === 'Trilhas Guiadas') progresso = stats.totalRoteiros
                else if (medalha.nome === 'Clientes Atendidos') progresso = stats.totalClientes
                
                const desbloqueado = progresso >= medalha.meta
                return (
                  <div key={medalha.nome} style={{
                    flex: '0 0 auto',
                    width: '130px',
                    backgroundColor: desbloqueado ? '#dcfce7' : '#f9fafb',
                    borderRadius: '16px',
                    padding: '16px 12px',
                    textAlign: 'center',
                    border: desbloqueado ? '1px solid #bbf7d0' : '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontSize: '40px', position: 'relative', display: 'inline-block' }}>
                      {medalha.icone}
                      {!desbloqueado && <span style={{ position: 'absolute', top: '-5px', right: '-10px', fontSize: '16px' }}>🔒</span>}
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', marginTop: '8px' }}>{medalha.nome}</div>
                    <div style={{ fontSize: '10px', color: desbloqueado ? '#16a34a' : '#9ca3af', marginTop: '6px' }}>
                      {desbloqueado 
                        ? `✅ ${progresso}/${medalha.meta}` 
                        : `🔒 ${progresso}/${medalha.meta}`}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 🏅 EVOLUÇÃO DO GUIA (MEDALHA POR ROTEIROS) */}
        <div style={{ backgroundColor: 'white', borderRadius: '28px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <span style={{ fontSize: '28px' }}>🏅</span>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#111827' }}>Evolução do Guia</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Progresso baseado em roteiros criados</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `3px solid ${stats.medalhaNivel === 'bronze' ? '#cd7f32' : stats.medalhaNivel === 'prata' ? '#c0c0c0' : stats.medalhaNivel === 'ouro' ? '#ffd700' : stats.medalhaNivel === 'platina' ? '#e5e4e2' : '#111111'}` }}>
              <span style={{ fontSize: '40px' }}>
                {stats.medalhaNivel === 'bronze' ? '🥉' : stats.medalhaNivel === 'prata' ? '🥈' : stats.medalhaNivel === 'ouro' ? '🥇' : stats.medalhaNivel === 'platina' ? '💎' : '🖤'}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: stats.medalhaNivel === 'bronze' ? '#cd7f32' : stats.medalhaNivel === 'prata' ? '#c0c0c0' : stats.medalhaNivel === 'ouro' ? '#ffd700' : stats.medalhaNivel === 'platina' ? '#e5e4e2' : '#111111' }}>
                {stats.medalhaNivel === 'bronze' ? 'Bronze' : stats.medalhaNivel === 'prata' ? 'Prata' : stats.medalhaNivel === 'ouro' ? 'Ouro' : stats.medalhaNivel === 'platina' ? 'Platina' : 'Black'}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                🎯 {stats.totalRoteiros} roteiro(s) criado(s)
              </div>
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                  <span>Progresso para próximo nível</span>
                  <span>{Math.min(100, (stats.totalRoteiros / 2) * 100)}%</span>
                </div>
                <div style={{ backgroundColor: '#e5e7eb', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                  <div style={{ 
                    backgroundColor: stats.medalhaNivel === 'bronze' ? '#cd7f32' : stats.medalhaNivel === 'prata' ? '#c0c0c0' : stats.medalhaNivel === 'ouro' ? '#ffd700' : stats.medalhaNivel === 'platina' ? '#e5e4e2' : '#111111', 
                    width: `${Math.min(100, (stats.totalRoteiros / 2) * 100)}%`, 
                    height: '100%', 
                    borderRadius: '10px' 
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 💬 AVALIAÇÕES DOS CLIENTES */}
        <div style={{ backgroundColor: 'white', borderRadius: '28px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <span style={{ fontSize: '28px' }}>💬</span>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#111827' }}>Avaliações dos Clientes</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>O que estão falando sobre {guia.nome || 'este guia'}</p>
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
              {avaliacoes.slice(0, 10).map((avaliacao) => (
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
                      {usuarioLogado && (
                        <>
                          <button
                            onClick={() => curtirAvaliacao(avaliacao.id, guia.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                          >
                            {usuarioCurtiu[avaliacao.id] ? '❤️' : '🤍'}
                          </button>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>{curtidas[avaliacao.id] || 0}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {avaliacao.comentario && (
                    <p style={{ margin: '12px 0 0 0', fontSize: '14px', color: '#4b5563', lineHeight: 1.5 }}>
                      “{avaliacao.comentario}”
                    </p>
                  )}
                  {avaliacao.resposta_guia && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                      <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a', margin: 0 }}>Resposta do guia:</p>
                      <p style={{ fontSize: '13px', color: '#4b5563', marginTop: '4px' }}>{avaliacao.resposta_guia}</p>
                    </div>
                  )}
                </div>
              ))}
              {stats.totalAvaliacoes > 10 && (
                <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
                  + outras {stats.totalAvaliacoes - 10} avaliações
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}