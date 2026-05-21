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

  useEffect(() => {
    const carregarDados = async () => {
      try {
        // 1. Buscar dados do guia
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

        // 2. Buscar roteiros do guia
        const { data: roteiros } = await supabase
          .from('roteiros')
          .select('id, km')
          .eq('id_guia', id)
          .eq('status', 'ativo')

        const qtdeRoteiros = roteiros?.length || 0
        const kmTotal = roteiros?.reduce((acc, r) => acc + (r.km || 0), 0) || 0
        setTotalKm(kmTotal)
        setTotalRoteiros(qtdeRoteiros)

        // 3. Buscar clientes únicos (via reservas)
        const roteirosIds = roteiros?.map(r => r.id) || []
        let clientesUnicos = 0
        if (roteirosIds.length > 0) {
          const { data: reservas } = await supabase
            .from('reservas')
            .select('cliente_id')
            .in('roteiro_id', roteirosIds)
          
          const clientesSet = new Set(reservas?.map(r => r.cliente_id))
          clientesUnicos = clientesSet.size
          setTotalClientes(clientesUnicos)
        }

        // 4. Buscar avaliações (apenas aprovadas)
        const { data: avaliacoesData } = await supabase
          .from('avaliacoes')
          .select('id, nota, comentario, resposta_guia, created_at, cliente_id')
          .eq('guia_id', id)
          .eq('status_moderacao', 'aprovada')
          .order('created_at', { ascending: false })

        if (avaliacoesData) {
          setAvaliacoes(avaliacoesData)
          setTotalAvaliacoes(avaliacoesData.length)
          
          const somaNotas = avaliacoesData.reduce((acc, a) => acc + a.nota, 0)
          setAvaliacaoMedia(avaliacoesData.length > 0 ? somaNotas / avaliacoesData.length : 0)
        }

      } catch (err) {
        console.error('Erro:', err)
      } finally {
        setCarregando(false)
      }
    }

    if (id) carregarDados()
  }, [id])

  // Funções para calcular nível do KM
  const getNivelKm = (km: number) => {
    if (km >= 3840) return { nome: 'Lenda Absoluta', icone: '🔥', cor: '#8b5cf6' }
    if (km >= 1920) return { nome: 'Lenda', icone: '🌟', cor: '#f59e0b' }
    if (km >= 1152) return { nome: 'Master', icone: '👑', cor: '#ef4444' }
    if (km >= 768) return { nome: 'Elite', icone: '⚡', cor: '#8b5cf6' }
    if (km >= 384) return { nome: 'Platina', icone: '💎', cor: '#06b6d4' }
    if (km >= 192) return { nome: 'Ouro', icone: '🥇', cor: '#fbbf24' }
    if (km >= 96) return { nome: 'Prata', icone: '🥈', cor: '#9ca3af' }
    if (km >= 32) return { nome: 'Bronze', icone: '🥉', cor: '#cd7f32' }
    return { nome: 'Bronze', icone: '🥉', cor: '#cd7f32' }
  }

  const getProximoMarco = (km: number) => {
    if (km < 32) return 32
    if (km < 96) return 96
    if (km < 192) return 192
    if (km < 384) return 384
    if (km < 768) return 768
    if (km < 1152) return 1152
    if (km < 1920) return 1920
    if (km < 3840) return 3840
    return 3840
  }

  const getProgressoPercentual = (km: number) => {
    const proximo = getProximoMarco(km)
    const anterior = proximo === 32 ? 0 : [0, 32, 96, 192, 384, 768, 1152, 1920, 3840][[32, 96, 192, 384, 768, 1152, 1920, 3840].indexOf(proximo) - 1] || 0
    if (proximo === anterior) return 100
    return Math.min(((km - anterior) / (proximo - anterior)) * 100, 100)
  }

  const getNotaEstrelas = (nota: number) => {
    return '★'.repeat(nota) + '☆'.repeat(5 - nota)
  }

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>🏔️</div>
          <div style={{ color: '#6b7280' }}>Carregando perfil...</div>
        </div>
      </div>
    )
  }

  if (!guia) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '40px' }}>⚠️</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Guia não encontrado</div>
        <button onClick={() => router.back()} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '8px 24px', borderRadius: '40px', cursor: 'pointer' }}>← Voltar</button>
      </div>
    )
  }

  const nivelInfo = getNivelKm(totalKm)
  const proximoMarco = getProximoMarco(totalKm)
  const progressoPercentual = getProgressoPercentual(totalKm)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* CABEÇALHO */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>🏔️ PussikTrails</h1>
          <button onClick={() => router.back()} style={{ backgroundColor: '#f3f4f6', border: 'none', padding: '8px 20px', borderRadius: '40px', cursor: 'pointer', fontSize: '14px' }}>← Voltar</button>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 20px' }}>
        
        {/* CARD DO PERFIL */}
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {guia.avatar_url ? (
                <img src={guia.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '48px', color: 'white' }}>{guia.nome?.charAt(0).toUpperCase() || 'G'}</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{guia.nome || guia.email || 'Guia'}</h2>
              <p style={{ color: '#6b7280', marginTop: '4px' }}>📷 {guia.instagram || 'Instagram não informado'} | 📅 Membro desde {new Date(guia.created_at).getFullYear()}</p>
              {bio && (
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#4b5563' }}>{bio}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🏅 BARRA DE PROGRESSO KM */}
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <div style={{ fontSize: '56px' }}>{nivelInfo.icone}</div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: nivelInfo.cor }}>{nivelInfo.nome}</div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>{totalKm} km guiados como líder de trilhas</div>
            </div>
          </div>
          
          <p style={{ marginBottom: '12px', fontSize: '14px', color: '#4b5563' }}>
            🎯 Próximo marco: <strong>{proximoMarco} km</strong> (faltam {Math.max(0, proximoMarco - totalKm)} km)
          </p>
          
          <div style={{ backgroundColor: '#e5e7eb', borderRadius: '20px', height: '12px', overflow: 'hidden' }}>
            <div style={{ width: `${progressoPercentual}%`, backgroundColor: '#3b82f6', height: '100%', borderRadius: '20px', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* 🏅 CONQUISTAS POR KM */}
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>🏅 Conquistas por KM</h3>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Metas alcançadas por {guia.nome || 'Guia'}</p>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            {[
              { nome: 'Primeira Trilha', icone: '🥾', km: 0 },
              { nome: 'Explorador', icone: '🌱', km: 32 },
              { nome: 'Caminhante', icone: '🚶', km: 96 },
              { nome: 'Aventureiro', icone: '🏔️', km: 384 },
              { nome: 'Mestre', icone: '👑', km: 1152 },
              { nome: 'Lenda', icone: '🌟', km: 1920 },
              { nome: 'Lenda Absoluta', icone: '🔥', km: 3840 },
            ].map((c, idx) => {
              const desbloqueado = totalKm >= c.km
              return (
                <div key={idx} style={{ 
                  flex: '0 0 auto', 
                  width: '100px', 
                  backgroundColor: desbloqueado ? '#dcfce7' : '#f3f4f6', 
                  borderRadius: '16px', 
                  padding: '12px 8px', 
                  textAlign: 'center',
                  border: desbloqueado ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
                  opacity: desbloqueado ? 1 : 0.6
                }}>
                  <div style={{ fontSize: '32px' }}>{c.icone}</div>
                  <div style={{ fontWeight: 'bold', fontSize: '11px', marginTop: '6px' }}>{c.nome}</div>
                  <div style={{ fontSize: '10px', color: desbloqueado ? '#16a34a' : '#9ca3af', marginTop: '4px' }}>
                    {desbloqueado ? '✅ Desbloqueado' : `🔒 ${c.km} km`}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 🎖️ MEDALHAS ESPECIAIS */}
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>🎖️ Medalhas Especiais</h3>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
            {[
              { nome: 'KM Guiados', icone: '👣', valor: totalKm, meta: 32 },
              { nome: 'Guias Avaliados', icone: '⭐', valor: totalAvaliacoes, meta: 5 },
              { nome: 'Trilhas Guiadas', icone: '🥾', valor: totalRoteiros, meta: 1 },
              { nome: 'Clientes Atendidos', icone: '👥', valor: totalClientes, meta: 5 },
            ].map((m, idx) => {
              const desbloqueado = m.valor >= m.meta
              return (
                <div key={idx} style={{ 
                  flex: '0 0 auto', 
                  width: '130px', 
                  backgroundColor: desbloqueado ? '#dcfce7' : '#f3f4f6', 
                  borderRadius: '16px', 
                  padding: '16px 12px', 
                  textAlign: 'center',
                  border: desbloqueado ? '1px solid #bbf7d0' : '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '40px', position: 'relative', display: 'inline-block' }}>
                    {m.icone}
                    {!desbloqueado && <span style={{ position: 'absolute', top: '-5px', right: '-10px', fontSize: '16px' }}>🔒</span>}
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '12px', marginTop: '8px' }}>{m.nome}</div>
                  <div style={{ fontSize: '10px', color: desbloqueado ? '#16a34a' : '#9ca3af', marginTop: '4px' }}>
                    {desbloqueado ? `✅ ${m.valor}/${m.meta}` : `🔒 ${m.valor}/${m.meta}`}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 📊 ESTATÍSTICAS RÁPIDAS */}
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>📊 Estatísticas</h3>
          <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '16px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#16a34a' }}>{totalRoteiros}</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Roteiros</div>
            </div>
            <div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#16a34a' }}>{totalClientes}</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Clientes</div>
            </div>
            <div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>{avaliacaoMedia.toFixed(1)}</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>⭐ Avaliação</div>
            </div>
            <div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#16a34a' }}>{totalAvaliacoes}</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Avaliações</div>
            </div>
          </div>
        </div>

        {/* 💬 AVALIAÇÕES DOS CLIENTES */}
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>💬 Avaliações dos Clientes</h3>
          
          {avaliacoes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', backgroundColor: '#f9fafb', borderRadius: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>💬</div>
              <div style={{ fontWeight: 'bold', color: '#374151' }}>Nenhuma avaliação ainda</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>As avaliações aparecerão aqui quando disponíveis.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {avaliacoes.slice(0, 10).map((av) => (
                <div key={av.id} style={{ backgroundColor: '#f9fafb', borderRadius: '20px', padding: '20px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                        C
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Cliente</div>
                        <div style={{ fontSize: '12px', color: '#f59e0b' }}>{getNotaEstrelas(av.nota)}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>{new Date(av.created_at).toLocaleDateString('pt-BR')}</div>
                  </div>
                  {av.comentario && (
                    <p style={{ marginTop: '12px', fontSize: '14px', color: '#4b5563', lineHeight: 1.5 }}>“{av.comentario}”</p>
                  )}
                  {av.resposta_guia && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                      <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a', margin: 0 }}>Resposta do guia:</p>
                      <p style={{ fontSize: '13px', color: '#4b5563', marginTop: '4px' }}>{av.resposta_guia}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}