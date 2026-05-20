'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type MedalhaUsuario = {
  id: string
  usuario_id: string
  medalha_id: string
  tier_atual: string
  progresso_atual: number
  medalha: {
    id: string
    nome: string
    icone: string
    descricao: string
    categoria: string
    metas_niveis: {
      bronze: number
      prata: number
      ouro: number
      platina: number
      onyx: number
    }
  }
}

export default function MedalhasGrid({ usuarioId }: { usuarioId: string }) {
  const [medalhas, setMedalhas] = useState<MedalhaUsuario[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!usuarioId) return
    carregarMedalhas()
  }, [usuarioId])

  const carregarMedalhas = async () => {
    setCarregando(true)
    try {
      const { data, error } = await supabase
        .from('usuarios_medalhas')
        .select(`
          id,
          usuario_id,
          medalha_id,
          tier_atual,
          progresso_atual,
          medalha:medalha_id (
            id,
            nome,
            icone,
            descricao,
            categoria,
            metas_niveis
          )
        `)
        .eq('usuario_id', usuarioId)

      if (error) {
        console.error('Erro ao buscar medalhas:', error)
        setMedalhas([])
      } else {
        // Ajustar o formato dos dados (medalha pode vir como array)
        const medalhasFormatadas = (data || []).map((item: any) => {
          let medalhaObj = null
          if (item.medalha) {
            if (Array.isArray(item.medalha) && item.medalha.length > 0) {
              medalhaObj = item.medalha[0]
            } else if (!Array.isArray(item.medalha)) {
              medalhaObj = item.medalha
            }
          }
          return {
            ...item,
            medalha: medalhaObj
          }
        })
        setMedalhas(medalhasFormatadas)
      }
    } catch (err) {
      console.error('Erro ao buscar progresso:', err)
      setMedalhas([])
    } finally {
      setCarregando(false)
    }
  }

  const getProximoNivel = (tierAtual: string) => {
    const niveis = ['bronze', 'prata', 'ouro', 'platina', 'onyx']
    const index = niveis.indexOf(tierAtual?.toLowerCase() || 'bronze')
    if (index === -1 || index === niveis.length - 1) return null
    return niveis[index + 1]
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

  if (carregando) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
        Carregando medalhas...
      </div>
    )
  }

  if (medalhas.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', backgroundColor: '#f9fafb', borderRadius: '16px' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎖️</div>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>Nenhuma medalha conquistada ainda</div>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Complete trilhas para ganhar medalhas!</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
      {medalhas.map((medalha) => {
        const proximo = getProximoNivel(medalha.tier_atual)
        const cor = getCorPorTier(medalha.tier_atual)
        const icone = medalha.medalha?.icone || getIconePorTier(medalha.tier_atual)
        const metaAtual = medalha.medalha?.metas_niveis?.[medalha.tier_atual?.toLowerCase() as keyof typeof medalha.medalha.metas_niveis] || 0
        const progressoPercentual = metaAtual > 0 ? (medalha.progresso_atual / metaAtual) * 100 : 0

        return (
          <div
            key={medalha.id}
            style={{
              backgroundColor: '#f9fafb',
              borderRadius: '16px',
              padding: '16px',
              textAlign: 'center',
              border: `2px solid ${cor}30`,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>{icone}</div>
            <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#111827' }}>{medalha.medalha?.nome || 'Medalha'}</div>
            <div style={{ fontSize: '11px', color: cor, fontWeight: '600', marginTop: '4px' }}>
              {medalha.tier_atual?.toUpperCase() || 'BRONZE'}
            </div>
            {proximo && (
              <>
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '4px' }}>
                    Progresso para {proximo}
                  </div>
                  <div style={{ backgroundColor: '#e5e7eb', borderRadius: '10px', height: '4px', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: cor, width: `${Math.min(progressoPercentual, 100)}%`, height: '100%' }} />
                  </div>
                </div>
                <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '6px' }}>
                  {medalha.progresso_atual} / {metaAtual}
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}