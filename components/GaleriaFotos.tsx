'use client'

import { useState, useEffect, useRef } from 'react'

interface GaleriaFotosProps {
  fotos: string[]
  onRemoverFoto?: (index: number) => void
  isProprioPerfil?: boolean
  onFotoClick?: (index: number) => void
}

export default function GaleriaFotos({ fotos, onRemoverFoto, isProprioPerfil = false, onFotoClick }: GaleriaFotosProps) {
  const [linhas, setLinhas] = useState<any[][]>([])
  const [carregando, setCarregando] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  // Altura alvo para cada linha (em pixels)
  const ALTURA_TARGET = 200

  useEffect(() => {
    if (fotos.length === 0) {
      setLinhas([])
      setCarregando(false)
      return
    }

    const carregarDimensoes = async () => {
      // Carregar dimensões reais das imagens
      const imagensComDimensoes = await Promise.all(
        fotos.map(async (url, idx) => {
          return new Promise<{ url: string; width: number; height: number; index: number }>((resolve) => {
            const img = new Image()
            img.onload = () => {
              resolve({
                url,
                width: img.width,
                height: img.height,
                index: idx,
              })
            }
            img.onerror = () => {
              resolve({
                url,
                width: 1200,
                height: 800,
                index: idx,
              })
            }
            img.src = url
          })
        })
      )

      // Calcular layout justificado
      const linhasCalculadas = calcularLayoutJustificado(imagensComDimensoes, ALTURA_TARGET)
      setLinhas(linhasCalculadas)
      setCarregando(false)
    }

    carregarDimensoes()
  }, [fotos])

  // Função que calcula o layout justificado (estilo Flickr)
  const calcularLayoutJustificado = (imagens: any[], alturaAlvo: number) => {
    const linhas: any[][] = []
    let linhaAtual: any[] = []
    let somaProporcoes = 0

    for (const img of imagens) {
      const proporcao = img.width / img.height
      linhaAtual.push({ ...img, proporcao })
      somaProporcoes += proporcao

      // Largura total estimada da linha
      const larguraEstimada = somaProporcoes * alturaAlvo

      // Se a linha estiver boa (entre min e max), fecha a linha
      if (linhaAtual.length >= 2 && larguraEstimada > 400 && larguraEstimada < 1200) {
        linhas.push([...linhaAtual])
        linhaAtual = []
        somaProporcoes = 0
      }
    }

    // Adiciona última linha se houver
    if (linhaAtual.length > 0) {
      linhas.push(linhaAtual)
    }

    return linhas
  }

  if (carregando) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', backgroundColor: '#f9fafb', borderRadius: '16px' }}>
        <span style={{ fontSize: '32px' }}>⏳</span>
        <p style={{ marginTop: '8px', color: '#6b7280' }}>Carregando fotos...</p>
      </div>
    )
  }

  if (fotos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', backgroundColor: '#f9fafb', borderRadius: '16px' }}>
        <span style={{ fontSize: '48px' }}>🏞️</span>
        <p style={{ marginTop: '12px', color: '#6b7280' }}>Nenhuma foto ainda</p>
        {isProprioPerfil && (
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
            Envie suas primeiras aventuras!
          </p>
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {linhas.map((linha, linhaIndex) => {
        // Calcular altura real da linha
        const somaProporcoes = linha.reduce((acc, img) => acc + img.proporcao, 0)
        const alturaReal = ALTURA_TARGET
        const containerWidth = containerRef.current?.clientWidth || 800
        
        return (
          <div
            key={linhaIndex}
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '8px',
              width: '100%',
            }}
          >
            {linha.map((img, imgIndex) => {
              const largura = (img.proporcao / somaProporcoes) * 100
              return (
                <div
                  key={imgIndex}
                  onClick={() => onFotoClick?.(img.index)}
                  style={{
                    position: 'relative',
                    width: `${largura}%`,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    borderRadius: '12px',
                    backgroundColor: '#f1f5f9',
                  }}
                >
                  <img
                    src={img.url}
                    alt={`Foto ${img.index + 1}`}
                    style={{
                      width: '100%',
                      height: `${alturaReal}px`,
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  
                  {/* Botão de remover (só no perfil do próprio cliente) */}
                  {isProprioPerfil && onRemoverFoto && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoverFoto(img.index)
                      }}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '16px',
                        zIndex: 10,
                        fontWeight: 'bold'
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}