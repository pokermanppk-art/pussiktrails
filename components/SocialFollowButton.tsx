'use client'

import { useEffect, useState } from 'react'

type UsuarioLocal = {
  id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  guia_id?: string | null
  cliente_id?: string | null
  tipo?: string | null
}

type SocialFollowButtonProps = {
  perfilId: string
  origem?: string
  className?: string
}

function extrairUsuarioId(usuario: UsuarioLocal | null): string {
  return String(
    usuario?.id ||
      usuario?.user_id ||
      usuario?.usuario_id ||
      usuario?.guia_id ||
      usuario?.cliente_id ||
      ''
  ).trim()
}

export default function SocialFollowButton({
  perfilId,
  origem = 'perfil_publico',
  className = '',
}: SocialFollowButtonProps) {
  const [usuarioId, setUsuarioId] = useState('')
  const [seguindo, setSeguindo] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    iniciar()
  }, [perfilId])

  async function iniciar() {
    try {
      setErro('')
      setCarregando(true)

      const salvo = localStorage.getItem('user')
      const usuario = salvo ? (JSON.parse(salvo) as UsuarioLocal) : null
      const idLogado = extrairUsuarioId(usuario)

      setUsuarioId(idLogado)

      if (!idLogado || !perfilId || idLogado === perfilId) {
        setCarregando(false)
        return
      }

      const resposta = await fetch(
        `/api/social/status?seguidorId=${encodeURIComponent(idLogado)}&seguidoId=${encodeURIComponent(perfilId)}`
      )

      const json = await resposta.json().catch(() => null)

      if (resposta.ok && json?.sucesso) {
        setSeguindo(Boolean(json.seguindo))
      }
    } catch (error) {
      console.warn('Erro ao verificar status de seguir:', error)
    } finally {
      setCarregando(false)
    }
  }

  async function alternarSeguir() {
    if (!usuarioId) {
      setErro('Faça login para seguir este perfil.')
      return
    }

    if (!perfilId || usuarioId === perfilId) return

    try {
      setErro('')
      setSalvando(true)

      const resposta = await fetch('/api/social/seguir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seguidorId: usuarioId,
          seguidoId: perfilId,
          origem,
        }),
      })

      const json = await resposta.json().catch(() => null)

      if (!resposta.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível atualizar agora.')
      }

      setSeguindo(Boolean(json.seguindo))
    } catch (error: unknown) {
      setErro(error instanceof Error ? error.message : 'Erro ao seguir perfil.')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <button type="button" className={`followButton loading ${className}`} disabled>
        ...
      </button>
    )
  }

  if (!usuarioId || usuarioId === perfilId) {
    return null
  }

  return (
    <div className="followWrap">
      <button
        type="button"
        className={`followButton ${seguindo ? 'following' : ''} ${className}`}
        onClick={alternarSeguir}
        disabled={salvando}
      >
        {salvando ? 'Aguarde...' : seguindo ? 'Seguindo' : 'Seguir'}
      </button>

      {erro && <div className="followError">{erro}</div>}

      <style jsx>{`
        .followWrap {
          display: inline-flex;
          flex-direction: column;
          align-items: stretch;
          gap: 6px;
        }

        .followButton {
          min-height: 42px;
          border: 0;
          border-radius: 999px;
          padding: 0 18px;
          background: #203c2e;
          color: #fffdf7;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 14px 28px rgba(32, 60, 46, 0.16);
          transition: 0.18s ease;
          white-space: nowrap;
        }

        .followButton:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 34px rgba(32, 60, 46, 0.22);
        }

        .followButton.following {
          background: rgba(255, 253, 247, 0.86);
          color: #203c2e;
          border: 1px solid rgba(32, 60, 46, 0.18);
          box-shadow: none;
        }

        .followButton.loading,
        .followButton:disabled {
          opacity: 0.62;
          cursor: not-allowed;
          transform: none;
        }

        .followError {
          max-width: 220px;
          color: #991b1b;
          font-size: 11px;
          font-weight: 800;
          line-height: 1.3;
        }

        @media (max-width: 640px) {
          .followButton {
            min-height: 38px;
            padding: 0 15px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  )
}