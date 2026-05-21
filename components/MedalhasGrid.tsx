'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

const MEDALHAS = [
  { nome: 'Trilhas Concluídas', icone: '🥾', meta: 1 },
  { nome: 'KM Percorridos', icone: '👣', meta: 10 },
  { nome: 'Fotógrafo', icone: '📸', meta: 3 },
  { nome: 'Avaliações', icone: '⭐', meta: 1 },
  { nome: 'Reservas', icone: '💳', meta: 1 }
]

export default function MedalhasGrid({ usuarioId }: { usuarioId: string }) {
  const [dados, setDados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!usuarioId) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        // Buscar progresso do usuário
        const { data: progresso } = await supabase
          .from('usuarios_medalhas')
          .select('progresso_atual, medalha:medalha_id(nome)')
          .eq('usuario_id', usuarioId)

        // Criar mapa de progresso
        const mapa = new Map()
        progresso?.forEach((item: any) => {
          if (item.medalha?.nome) {
            mapa.set(item.medalha.nome, item.progresso_atual || 0)
          }
        })

        // Montar lista
        const lista = MEDALHAS.map(m => ({
          ...m,
          progresso: mapa.get(m.nome) || 0,
          desbloqueado: (mapa.get(m.nome) || 0) >= m.meta
        }))

        setDados(lista)
      } catch (err) {
        console.error(err)
        setDados(MEDALHAS.map(m => ({ ...m, progresso: 0, desbloqueado: false })))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [usuarioId])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '20px' }}>⏳ Carregando...</div>
  }

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: '12px'
    }}>
      {dados.map((medalha) => (
        <div
          key={medalha.nome}
          style={{
            backgroundColor: medalha.desbloqueado ? '#e8f5e9' : '#f5f5f5',
            borderRadius: '12px',
            padding: '12px',
            width: '100px',
            textAlign: 'center',
            border: `1px solid ${medalha.desbloqueado ? '#4caf50' : '#ddd'}`
          }}
        >
          <div style={{ fontSize: '40px', position: 'relative' }}>
            {medalha.icone}
            {!medalha.desbloqueado && (
              <span style={{ position: 'absolute', top: '-5px', right: '-10px', fontSize: '16px' }}>🔒</span>
            )}
          </div>
          <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '5px' }}>
            {medalha.nome}
          </div>
          <div style={{ fontSize: '9px', color: medalha.desbloqueado ? '#4caf50' : '#999', marginTop: '5px' }}>
            {medalha.desbloqueado ? '✅ DESBLOQ' : `🔒 Meta: ${medalha.meta}`}
          </div>
        </div>
      ))}
    </div>
  )
}