'use client'

interface MedalhaGuiaProps {
  nivel: string
  size?: 'small' | 'large'
}

const niveis = {
  bronze: { nome: 'Bronze', cor: '#cd7f32', icone: '🥉', bg: '#f5e6d3' },
  prata: { nome: 'Prata', cor: '#c0c0c0', icone: '🥈', bg: '#f0f0f0' },
  ouro: { nome: 'Ouro', cor: '#ffd700', icone: '🥇', bg: '#fff8e0' },
  platina: { nome: 'Platina', cor: '#e5e4e2', icone: '💎', bg: '#f0f0fc' },
  black: { nome: 'Black', cor: '#111111', icone: '🖤', bg: '#e0e0e0' }
}

export default function MedalhaGuia({ nivel, size = 'small' }: MedalhaGuiaProps) {
  const nivelInfo = niveis[nivel as keyof typeof niveis] || niveis.bronze
  const tamanho = size === 'large' ? '64px' : '32px'
  const fontSize = size === 'large' ? '32px' : '20px'

  return (
    <div style={{
      width: tamanho,
      height: tamanho,
      borderRadius: '50%',
      backgroundColor: nivelInfo.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `2px solid ${nivelInfo.cor}`,
      fontSize: fontSize,
      position: 'relative'
    }}>
      <span>{nivelInfo.icone}</span>
    </div>
  )
}