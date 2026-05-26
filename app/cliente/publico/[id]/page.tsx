'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type ClientePublico = {
  id: string
  nome?: string | null
  avatar_url?: string | null
  fotos_aventuras?: string[] | null
  bio?: string | null
  created_at?: string | null
  tipo?: string | null
  avaliacao_media_cliente?: number | null
}

type ReservaRealizada = {
  id?: string
  roteiro?: {
    km?: number | null
  } | null
}

type CurtidaFoto = {
  foto_url: string | null
}

type ProgressoMedalha = {
  progresso_atual?: number | null
  medalha?: {
    nome?: string | null
  } | null
}

type MedalhaEspecial = {
  nome: string
  icone: string
  meta: number
  progresso: number
  desbloqueado: boolean
  svg?: string
}

type MedalhaProgressao = {
  nivel: number
  nome: string
  tituloCurto: string
  km: number
  fotosLiberadas: number
  svg: string
}

const niveisCurtidas = [
  { limite: 0, cor: '#9ca3af', icone: '🎖️', nome: 'Iniciante' },
  { limite: 5, cor: '#b7791f', icone: '🥉', nome: 'Bronze' },
  { limite: 25, cor: '#64748b', icone: '🥈', nome: 'Prata' },
  { limite: 100, cor: '#ca8a04', icone: '🥇', nome: 'Ouro' },
  { limite: 250, cor: '#475569', icone: '💎', nome: 'Platina' },
  { limite: 500, cor: '#111827', icone: '🖤', nome: 'Black' },
]

const MEDALHAS_ESPECIAIS_BASE = [
  {
    nome: 'Início da Jornada Beta',
    icone: '🥾',
    meta: 1,
    svg: '/medalhas/iniciais_jornada/01_botinha_beta_oficial.svg',
  },
  {
    nome: 'Aventureiro Pioneiro Beta',
    icone: '🏔️',
    meta: 1,
    svg: '/medalhas/iniciais_jornada/02_aventureiro_pioneiro_beta.svg',
  },
  {
    nome: 'Voz da Trilha Beta',
    icone: '🎙️',
    meta: 1,
    svg: '/medalhas/iniciais_jornada/03_voz_da_trilha_beta.svg',
  },
  {
    nome: 'Guia Pioneiro Beta',
    icone: '🧭',
    meta: 1,
    svg: '/medalhas/iniciais_jornada/04_guia_pioneiro_beta.svg',
  },
  {
    nome: 'Construtor da Jornada Beta',
    icone: '🛠️',
    meta: 1,
    svg: '/medalhas/iniciais_jornada/05_construtor_da_jornada_beta.svg',
  },
]

const MEDALHAS_PROGRESSAO: MedalhaProgressao[] = [
  {
    nivel: 0,
    nome: 'Mochila de Partida',
    tituloCurto: 'Partida',
    km: 0,
    fotosLiberadas: 0,
    svg: '/medalhas/progressao/01_mochila_de_partida.svg',
  },
  {
    nivel: 1,
    nome: 'Barraca Base',
    tituloCurto: 'Base',
    km: 32,
    fotosLiberadas: 5,
    svg: '/medalhas/progressao/02_barraca_base.svg',
  },
  {
    nivel: 2,
    nome: 'Fogueira da Jornada',
    tituloCurto: 'Fogueira',
    km: 96,
    fotosLiberadas: 15,
    svg: '/medalhas/progressao/03_fogueira_da_jornada.svg',
  },
  {
    nivel: 3,
    nome: 'Lanterna da Serra',
    tituloCurto: 'Lanterna',
    km: 192,
    fotosLiberadas: 30,
    svg: '/medalhas/progressao/04_lanterna_da_serra.svg',
  },
  {
    nivel: 4,
    nome: 'Rumo Certo',
    tituloCurto: 'Rumo',
    km: 384,
    fotosLiberadas: 60,
    svg: '/medalhas/progressao/05_rumo_certo.svg',
  },
  {
    nivel: 5,
    nome: 'Prussik',
    tituloCurto: 'Prussik',
    km: 768,
    fotosLiberadas: 120,
    svg: '/medalhas/progressao/06_prussik.svg',
  },
  {
    nivel: 6,
    nome: 'Cachoeira Viva',
    tituloCurto: 'Cachoeira',
    km: 1152,
    fotosLiberadas: 200,
    svg: '/medalhas/progressao/07_cachoeira_viva.svg',
  },
  {
    nivel: 7,
    nome: 'Amanhecer no Cume',
    tituloCurto: 'Cume',
    km: 1920,
    fotosLiberadas: 400,
    svg: '/medalhas/progressao/08_amanhecer_no_cume.svg',
  },
  {
    nivel: 8,
    nome: 'Mirante do Explorador',
    tituloCurto: 'Mirante',
    km: 3840,
    fotosLiberadas: 1000,
    svg: '/medalhas/progressao/09_mirante_do_explorador.svg',
  },
  {
    nivel: 9,
    nome: 'Mapa Lendário',
    tituloCurto: 'Lenda',
    km: 7680,
    fotosLiberadas: 2000,
    svg: '/medalhas/progressao/10_mapa_lendario.svg',
  },
]

function normalizarNome(valor?: string | null) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function getNivelPorKm(totalKm: number) {
  let atual = MEDALHAS_PROGRESSAO[0]

  for (const medalha of MEDALHAS_PROGRESSAO) {
    if (totalKm >= medalha.km) {
      atual = medalha
    }
  }

  return atual
}

function getProximaMedalha(totalKm: number) {
  return MEDALHAS_PROGRESSAO.find((medalha) => totalKm < medalha.km) || null
}

export default function PerfilPublicoCliente() {
  const params = useParams()
  const router = useRouter()

  const idParam = params?.id
  const id = Array.isArray(idParam) ? idParam[0] : idParam

  const [cliente, setCliente] = useState<ClientePublico | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erroTela, setErroTela] = useState('')
  const [totalKm, setTotalKm] = useState(0)
  const [totalTrilhas, setTotalTrilhas] = useState(0)
  const [avaliacaoMedia, setAvaliacaoMedia] = useState(0)
  const [fotos, setFotos] = useState<string[]>([])
  const [bio, setBio] = useState('')
  const [curtidasFotos, setCurtidasFotos] = useState<Record<string, number>>({})
  const [usuarioCurtiuFoto, setUsuarioCurtiuFoto] = useState<Record<string, boolean>>({})
  const [curtidasPerfil, setCurtidasPerfil] = useState(0)
  const [usuarioCurtiuPerfil, setUsuarioCurtiuPerfil] = useState(false)
  const [usuarioLogado, setUsuarioLogado] = useState<{ id: string; tipo?: string; nome?: string } | null>(null)
  const [medalhasEspeciais, setMedalhasEspeciais] = useState<MedalhaEspecial[]>([])
  const [seguindoPerfil, setSeguindoPerfil] = useState(false)
  const [seguidoresTotal, setSeguidoresTotal] = useState(0)
  const [seguindoSalvando, setSeguindoSalvando] = useState(false)
  const [seguindoErro, setSeguindoErro] = useState('')

  useEffect(() => {
    try {
      const userData = localStorage.getItem('user')
      if (userData) {
        setUsuarioLogado(JSON.parse(userData))
      }
    } catch {
      setUsuarioLogado(null)
    }
  }, [])

  useEffect(() => {
    if (!id) return

    const carregarDados = async () => {
      setCarregando(true)
      setErroTela('')

      try {
        const { data: clienteData, error: clienteError } = await supabase
          .from('users')
          .select('id, nome, avatar_url, fotos_aventuras, bio, created_at, tipo, avaliacao_media_cliente')
          .eq('id', id)
          .single()

        if (clienteError || !clienteData || clienteData.tipo !== 'cliente') {
          setCliente(null)
          setCarregando(false)
          return
        }

        const clientePublico = clienteData as ClientePublico

        setCliente(clientePublico)
        setFotos(Array.isArray(clientePublico.fotos_aventuras) ? clientePublico.fotos_aventuras : [])
        setBio(clientePublico.bio || '')
        setAvaliacaoMedia(Number(clientePublico.avaliacao_media_cliente || 0))

        const { data: reservas } = await supabase
          .from('reservas')
          .select('id, roteiro:roteiro_id(km)')
          .eq('cliente_id', id)
          .eq('status', 'realizada')

        const reservasRealizadas = (reservas || []) as ReservaRealizada[]
        const kmTotal = reservasRealizadas.reduce((acc, reserva) => {
          return acc + Number(reserva.roteiro?.km || 0)
        }, 0)

        setTotalKm(kmTotal)
        setTotalTrilhas(reservasRealizadas.length)

        const fotosPublicas = Array.isArray(clientePublico.fotos_aventuras) ? clientePublico.fotos_aventuras : []

        if (fotosPublicas.length) {
          const { data: curtidas } = await supabase
            .from('curtidas_fotos')
            .select('foto_url')
            .eq('dono_id', id)

          const mapaCurtidas: Record<string, number> = {}
          ;((curtidas || []) as CurtidaFoto[]).forEach((curtida) => {
            const fotoUrl = curtida.foto_url
            if (!fotoUrl) return
            mapaCurtidas[fotoUrl] = (mapaCurtidas[fotoUrl] || 0) + 1
          })

          setCurtidasFotos(mapaCurtidas)

          if (usuarioLogado?.id) {
            const { data: minhasCurtidas } = await supabase
              .from('curtidas_fotos')
              .select('foto_url')
              .eq('usuario_id', usuarioLogado.id)

            const curtidasMap: Record<string, boolean> = {}
            ;((minhasCurtidas || []) as CurtidaFoto[]).forEach((curtida) => {
              if (curtida.foto_url) {
                curtidasMap[curtida.foto_url] = true
              }
            })

            setUsuarioCurtiuFoto(curtidasMap)
          }
        } else {
          setCurtidasFotos({})
          setUsuarioCurtiuFoto({})
        }

        const { count } = await supabase
          .from('curtidas_perfil')
          .select('*', { count: 'exact', head: true })
          .eq('dono_id', id)

        setCurtidasPerfil(count || 0)

        if (usuarioLogado?.id && usuarioLogado.id !== id) {
          const { data: jaCurtiu } = await supabase
            .from('curtidas_perfil')
            .select('id')
            .eq('dono_id', id)
            .eq('curtidor_id', usuarioLogado.id)
            .maybeSingle()

          setUsuarioCurtiuPerfil(Boolean(jaCurtiu))
        } else {
          setUsuarioCurtiuPerfil(false)
        }

        const { count: seguidoresCount } = await supabase
          .from('seguidores')
          .select('id', { count: 'exact', head: true })
          .eq('seguido_id', id)
          .eq('status', 'ativo')

        setSeguidoresTotal(seguidoresCount || 0)

        if (usuarioLogado?.id && usuarioLogado.id !== id) {
          const { data: segueRegistro } = await supabase
            .from('seguidores')
            .select('id, status')
            .eq('seguidor_id', usuarioLogado.id)
            .eq('seguido_id', id)
            .maybeSingle()

          setSeguindoPerfil(segueRegistro?.status === 'ativo')
        } else {
          setSeguindoPerfil(false)
        }

        const { data: progresso } = await supabase
          .from('usuarios_medalhas')
          .select('progresso_atual, medalha:medalha_id(nome)')
          .eq('usuario_id', id)

        const mapaProgresso = new Map<string, number>()

        ;((progresso || []) as ProgressoMedalha[]).forEach((item) => {
          const nome = item.medalha?.nome
          if (!nome) return
          mapaProgresso.set(normalizarNome(nome), Number(item.progresso_atual || 0))
        })

        const medalhasAtualizadas: MedalhaEspecial[] = MEDALHAS_ESPECIAIS_BASE.map((medalha) => {
          const chave = normalizarNome(medalha.nome)
          const progressoAtual = mapaProgresso.get(chave) || 0

          return {
            ...medalha,
            progresso: progressoAtual,
            desbloqueado: progressoAtual >= medalha.meta,
          }
        })

        setMedalhasEspeciais(medalhasAtualizadas)
      } catch {
        setErroTela('Não foi possível carregar este passaporte agora.')
      } finally {
        setCarregando(false)
      }
    }

    carregarDados()
  }, [id, usuarioLogado?.id])

  const alternarSeguir = async () => {
    if (!usuarioLogado?.id) {
      router.push('/login')
      return
    }

    if (!cliente?.id || usuarioLogado.id === cliente.id) return

    try {
      setSeguindoErro('')
      setSeguindoSalvando(true)

      const resposta = await fetch('/api/social/seguir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seguidorId: usuarioLogado.id,
          seguidoId: cliente.id,
          origem: 'perfil_publico_cliente'
        })
      })

      const json = await resposta.json().catch(() => null)

      if (!resposta.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível atualizar agora.')
      }

      const novoStatus = Boolean(json.seguindo)
      setSeguindoPerfil(novoStatus)
      setSeguidoresTotal((prev) => Math.max(prev + (novoStatus ? 1 : -1), 0))
    } catch (error: unknown) {
      setSeguindoErro(error instanceof Error ? error.message : 'Erro ao seguir este perfil.')
    } finally {
      setSeguindoSalvando(false)
    }
  }

  const curtirFoto = async (fotoUrl: string) => {
    if (!usuarioLogado?.id) {
      router.push('/login')
      return
    }

    if (!cliente?.id) return

    const isCurtindo = !usuarioCurtiuFoto[fotoUrl]

    if (isCurtindo) {
      await supabase
        .from('curtidas_fotos')
        .insert({ foto_url: fotoUrl, dono_id: cliente.id, usuario_id: usuarioLogado.id })

      setUsuarioCurtiuFoto((prev) => ({ ...prev, [fotoUrl]: true }))
      setCurtidasFotos((prev) => ({ ...prev, [fotoUrl]: (prev[fotoUrl] || 0) + 1 }))
      return
    }

    await supabase
      .from('curtidas_fotos')
      .delete()
      .eq('foto_url', fotoUrl)
      .eq('usuario_id', usuarioLogado.id)

    setUsuarioCurtiuFoto((prev) => ({ ...prev, [fotoUrl]: false }))
    setCurtidasFotos((prev) => ({ ...prev, [fotoUrl]: Math.max((prev[fotoUrl] || 0) - 1, 0) }))
  }

  const curtirPerfil = async () => {
    if (!usuarioLogado?.id || !cliente?.id || usuarioLogado.id === cliente.id) return

    const isCurtindo = !usuarioCurtiuPerfil

    if (isCurtindo) {
      await supabase.from('curtidas_perfil').insert({ dono_id: cliente.id, curtidor_id: usuarioLogado.id })
      setCurtidasPerfil((prev) => prev + 1)
      setUsuarioCurtiuPerfil(true)
      return
    }

    await supabase
      .from('curtidas_perfil')
      .delete()
      .eq('dono_id', cliente.id)
      .eq('curtidor_id', usuarioLogado.id)

    setCurtidasPerfil((prev) => Math.max(prev - 1, 0))
    setUsuarioCurtiuPerfil(false)
  }

  const medalhaInfo = useMemo(() => {
    let nivel = niveisCurtidas[0]

    for (let i = niveisCurtidas.length - 1; i >= 0; i--) {
      if (curtidasPerfil >= niveisCurtidas[i].limite) {
        nivel = niveisCurtidas[i]
        break
      }
    }

    return nivel
  }, [curtidasPerfil])

  const nivelAtual = useMemo(() => getNivelPorKm(totalKm), [totalKm])
  const proximaMedalha = useMemo(() => getProximaMedalha(totalKm), [totalKm])

  const progressoAteProxima = useMemo(() => {
    if (!proximaMedalha) return 100

    const nivelAnterior = MEDALHAS_PROGRESSAO[Math.max(proximaMedalha.nivel - 1, 0)]
    const base = nivelAnterior?.km || 0
    const alvo = proximaMedalha.km
    const intervalo = Math.max(alvo - base, 1)
    const atual = Math.max(totalKm - base, 0)

    return Math.min(Math.round((atual / intervalo) * 100), 100)
  }, [proximaMedalha, totalKm])

  if (carregando) {
    return (
      <main className="pageShell loadingShell">
        <div className="loaderCard">
          <div className="loaderMark" />
          <p>Carregando passaporte...</p>
        </div>

        <style jsx>{`
          .pageShell {
            min-height: 100vh;
            display: grid;
            place-items: center;
            background:
              radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.16), transparent 28%),
              radial-gradient(circle at 90% 10%, rgba(251, 146, 60, 0.14), transparent 28%),
              linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
          }

          .loaderCard {
            border-radius: 28px;
            padding: 26px;
            background: rgba(255, 253, 247, 0.86);
            border: 1px solid rgba(62, 74, 45, 0.12);
            box-shadow: 0 24px 70px rgba(25, 45, 25, 0.12);
            text-align: center;
            color: #253323;
            font-weight: 900;
          }

          .loaderMark {
            width: 34px;
            height: 34px;
            margin: 0 auto 12px;
            border-radius: 999px;
            border: 4px solid rgba(31, 61, 45, 0.14);
            border-top-color: #991b1b;
            animation: spin 0.9s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    )
  }

  if (!cliente || erroTela) {
    return (
      <main className="notFoundShell">
        <div className="notFoundCard">
          <p>{erroTela || 'Perfil não encontrado.'}</p>
          <button type="button" onClick={() => router.push('/roteiros')}>
            Explorar roteiros
          </button>
        </div>

        <style jsx>{`
          .notFoundShell {
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 22px;
            background:
              radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.16), transparent 28%),
              radial-gradient(circle at 90% 10%, rgba(251, 146, 60, 0.14), transparent 28%),
              linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
          }

          .notFoundCard {
            width: min(460px, 100%);
            border-radius: 30px;
            padding: 28px;
            text-align: center;
            background: rgba(255, 253, 247, 0.9);
            border: 1px solid rgba(62, 74, 45, 0.12);
            box-shadow: 0 24px 70px rgba(25, 45, 25, 0.12);
          }

          .notFoundCard p {
            margin: 0 0 16px;
            color: #253323;
            font-weight: 900;
          }

          .notFoundCard button {
            border: 0;
            border-radius: 999px;
            padding: 12px 18px;
            background: #1f3d2d;
            color: #fffdf7;
            font-weight: 950;
            cursor: pointer;
          }

          .followArea {
            margin-top: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
          }

          .followButton {
            min-height: 42px;
            border: 0;
            border-radius: 999px;
            padding: 0 18px;
            background: #203c2e;
            color: #fffdf7;
            font-size: 13px;
            font-weight: 950;
            cursor: pointer;
            box-shadow: 0 14px 28px rgba(32, 60, 46, 0.18);
            transition: 0.18s ease;
          }

          .followButton:hover {
            transform: translateY(-1px);
            box-shadow: 0 18px 34px rgba(32, 60, 46, 0.22);
          }

          .followButton.following {
            background: rgba(255, 253, 247, 0.88);
            color: #203c2e;
            border: 1px solid rgba(32, 60, 46, 0.20);
            box-shadow: none;
          }

          .followButton:disabled {
            opacity: 0.62;
            cursor: not-allowed;
            transform: none;
          }

          .followError {
            max-width: 280px;
            color: #991b1b;
            font-size: 12px;
            font-weight: 800;
            line-height: 1.35;
          }

        `}</style>
      </main>
    )
  }

  const avatarLetra = cliente.nome?.charAt(0)?.toUpperCase() || 'A'
  const anoEntrada = cliente.created_at ? new Date(cliente.created_at).getFullYear() : new Date().getFullYear()
  const podeCurtirPerfil = Boolean(usuarioLogado?.id && usuarioLogado.id !== cliente.id)
  const nomeCliente = cliente.nome || 'Aventureiro'

  return (
    <main className="publicProfilePage">
      <header className="appHeader">
        <div className="headerInner">
          <button type="button" className="brandLockup" onClick={() => router.push('/roteiros')}>
            <img src="/logo-prussik-display.png" alt="" className="brandLogo" />
            <span className="brandCopy">
              <strong>PrussikTrails</strong>
              <small>Passaporte público</small>
            </span>
          </button>

          <button type="button" className="backButton" onClick={() => router.back()}>
            Voltar
          </button>
        </div>
      </header>

      <section className="profileWrap">
        <section className="heroCard">
          <div className="avatarBlock">
            <div className="avatarFrame">
              {cliente.avatar_url ? (
                <img src={cliente.avatar_url} alt={nomeCliente} />
              ) : (
                <span>{avatarLetra}</span>
              )}
            </div>

            <button
              type="button"
              className={`likeButton ${usuarioCurtiuPerfil ? 'liked' : ''}`}
              onClick={curtirPerfil}
              disabled={!podeCurtirPerfil}
              title={podeCurtirPerfil ? 'Curtir passaporte' : 'Entre para curtir'}
            >
              <span>{usuarioCurtiuPerfil ? '❤️' : '🤍'}</span>
              <strong>{curtidasPerfil}</strong>
              <small>{medalhaInfo.nome}</small>
            </button>
          </div>

          <div className="profileMain">
            <div className="eyebrow">Passaporte PrussikTrails</div>
            <h1>{nomeCliente}</h1>
            <p className="subtitle">
              A jornada pública de um aventureiro: trilhas, memória, conquistas e presença real no outdoor.
            </p>

            <div className="metaLine">
              <span>Desde {anoEntrada}</span>
              <span>{nivelAtual.nome}</span>
              <span>{avaliacaoMedia > 0 ? `${avaliacaoMedia.toFixed(1)} ★` : 'Sem avaliações ainda'}</span>
              <span>{seguidoresTotal} {seguidoresTotal === 1 ? 'seguidor' : 'seguidores'}</span>
            </div>

            {usuarioLogado?.id !== cliente.id && (
              <div className="followArea">
                <button
                  type="button"
                  className={`followButton ${seguindoPerfil ? 'following' : ''}`}
                  onClick={alternarSeguir}
                  disabled={seguindoSalvando}
                >
                  {seguindoSalvando ? 'Aguarde...' : seguindoPerfil ? 'Seguindo' : 'Seguir'}
                </button>
                {seguindoErro && <span className="followError">{seguindoErro}</span>}
              </div>
            )}

            {bio && <p className="bioText">{bio}</p>}
          </div>

          <aside className="heroMedal">
            <img src={nivelAtual.svg} alt={nivelAtual.nome} />
            <strong>{nivelAtual.nome}</strong>
            <span>{nivelAtual.tituloCurto}</span>
          </aside>
        </section>

        <section className="quickStats">
          <article>
            <strong>{totalKm}</strong>
            <span>KM registrados</span>
          </article>

          <article>
            <strong>{totalTrilhas}</strong>
            <span>Trilhas realizadas</span>
          </article>

          <article>
            <strong>{fotos.length}</strong>
            <span>Fotos públicas</span>
          </article>

          <article>
            <strong>{curtidasPerfil}</strong>
            <span>Curtidas no passaporte</span>
          </article>
        </section>

        <section className="contentGrid">
          <div className="leftColumn">
            <section className="sectionCard">
              <div className="sectionTitle">
                <div>
                  <span>Coleção visual</span>
                  <h2>Medalhas</h2>
                </div>
              </div>

              <div className="medalGrid">
                {MEDALHAS_PROGRESSAO.map((medalha) => {
                  const desbloqueada = totalKm >= medalha.km

                  return (
                    <article key={medalha.nivel} className={`medalCard ${desbloqueada ? 'unlocked' : 'locked'}`}>
                      <div className="medalArt">
                        <img src={medalha.svg} alt={medalha.nome} />
                      </div>
                      <strong>{medalha.nome}</strong>
                      <span>{desbloqueada ? 'Conquistada' : 'Bloqueada'}</span>
                    </article>
                  )
                })}

                {medalhasEspeciais.map((medalha) => {
                  const desbloqueada = medalha.desbloqueado

                  return (
                    <article
                      key={medalha.nome}
                      className={`medalCard betaMedal ${desbloqueada ? 'unlocked' : 'locked'}`}
                    >
                      <div className="medalArt">
                        {medalha.svg ? <img src={medalha.svg} alt={medalha.nome} /> : <span>{medalha.icone}</span>}
                      </div>
                      <strong>{medalha.nome}</strong>
                      <span>{desbloqueada ? 'beta' : 'Bloqueada'}</span>
                    </article>
                  )
                })}
              </div>
            </section>

            <section className="sectionCard">
              <div className="sectionTitle">
                <div>
                  <span>Memórias públicas</span>
                  <h2>Fotos</h2>
                </div>
              </div>

              {fotos.length === 0 ? (
                <div className="emptyPhotos">
                  <span>🏞️</span>
                  <strong>Nenhuma foto pública ainda</strong>
                  <p>Quando o aventureiro compartilhar registros, eles aparecerão aqui.</p>
                </div>
              ) : (
                <div className="photoGrid">
                  {fotos.slice(0, 12).map((url, idx) => (
                    <figure key={`${url}-${idx}`} className="photoCard">
                      <img src={url} alt={`Foto de aventura ${idx + 1}`} />
                      <figcaption>
                        <button type="button" onClick={() => curtirFoto(url)}>
                          {usuarioCurtiuFoto[url] ? '❤️' : '🤍'}
                        </button>
                        <span>{curtidasFotos[url] || 0}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="rightColumn">
            <section className="sideCard">
              <span>Momento atual</span>
              <img src={nivelAtual.svg} alt={nivelAtual.nome} />
              <h3>{nivelAtual.nome}</h3>
              <p>
                Este é o marco visual atual do passaporte público de {nomeCliente}.
              </p>
            </section>

            {proximaMedalha && (
              <section className="sideCard nextCard">
                <span>Próxima conquista</span>
                <img src={proximaMedalha.svg} alt={proximaMedalha.nome} />
                <h3>{proximaMedalha.nome}</h3>
                <div className="progressBar">
                  <i style={{ width: `${progressoAteProxima}%` }} />
                </div>
              </section>
            )}

            <section className="sideCard textCard">
              <span>Leitura rápida</span>
              <p>
                {nomeCliente} está no nível <strong>{nivelAtual.nome}</strong>, com{' '}
                <strong>{totalKm} km</strong> registrados e <strong>{totalTrilhas}</strong> trilha(s) realizadas.
              </p>
            </section>
          </aside>
        </section>
      </section>

      <style jsx>{`
        .publicProfilePage {
          min-height: 100vh;
          background:
            radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.16), transparent 28%),
            radial-gradient(circle at 90% 10%, rgba(251, 146, 60, 0.14), transparent 28%),
            linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
          color: #18251b;
        }

        .appHeader {
          position: sticky;
          top: 0;
          z-index: 50;
          padding: 10px 16px;
          background: rgba(255, 253, 247, 0.84);
          border-bottom: 1px solid rgba(62, 74, 45, 0.09);
          backdrop-filter: blur(18px);
        }

        .headerInner {
          max-width: 1180px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .brandLockup {
          min-width: 0;
          border: 0;
          background: transparent;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 0;
          cursor: pointer;
          text-align: left;
        }

        .brandLogo {
          width: 42px;
          height: 42px;
          object-fit: contain;
          flex: 0 0 auto;
          display: block;
        }

        .brandCopy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          line-height: 1;
        }

        .brandCopy strong {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(31px, 4.5vw, 54px);
          font-weight: 800;
          color: #1f3d2d;
          line-height: 0.88;
          letter-spacing: -0.06em;
          white-space: nowrap;
        }

        .brandCopy small {
          margin-top: 7px;
          color: #7c8574;
          font-size: clamp(10px, 1.4vw, 16px);
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .backButton {
          border: 1px solid rgba(31, 61, 45, 0.12);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.74);
          color: #1f3d2d;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 950;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(31, 61, 45, 0.08);
        }

        .profileWrap {
          max-width: 1180px;
          margin: 0 auto;
          padding: 28px 16px 46px;
        }

        .heroCard {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) 180px;
          gap: 22px;
          align-items: center;
          border-radius: 34px;
          background:
            radial-gradient(circle at 0% 0%, rgba(132, 204, 22, 0.15), transparent 35%),
            rgba(255, 253, 247, 0.88);
          border: 1px solid rgba(62, 74, 45, 0.12);
          box-shadow: 0 26px 90px rgba(42, 55, 36, 0.12);
          padding: 24px;
          overflow: hidden;
        }

        .avatarBlock {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .avatarFrame {
          width: 124px;
          height: 124px;
          border-radius: 999px;
          overflow: hidden;
          display: grid;
          place-items: center;
          background:
            linear-gradient(#fffdf7, #fffdf7) padding-box,
            linear-gradient(135deg, #b8914c, #991b1b, #28452e) border-box;
          border: 4px solid transparent;
          box-shadow: 0 18px 40px rgba(33, 47, 28, 0.16);
        }

        .avatarFrame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatarFrame span {
          color: #1f3d2d;
          font-size: 48px;
          font-weight: 950;
          font-family: Georgia, 'Times New Roman', serif;
        }

        .likeButton {
          border: 1px solid rgba(31, 61, 45, 0.1);
          border-radius: 999px;
          background: #fffdf7;
          color: #1f3d2d;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 950;
        }

        .likeButton:disabled {
          cursor: default;
          opacity: 0.74;
        }

        .likeButton.liked {
          border-color: rgba(153, 27, 27, 0.22);
          background: rgba(153, 27, 27, 0.06);
        }

        .likeButton small {
          color: #64748b;
          font-size: 10px;
          font-weight: 900;
        }

        .profileMain {
          min-width: 0;
        }

        .eyebrow,
        .sectionTitle span,
        .sideCard > span {
          display: block;
          color: #991b1b;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .profileMain h1 {
          margin: 8px 0 0;
          color: #172018;
          font-size: clamp(38px, 6vw, 72px);
          line-height: 0.9;
          letter-spacing: -0.07em;
          font-weight: 950;
        }

        .subtitle {
          max-width: 680px;
          margin: 14px 0 0;
          color: rgba(23, 32, 24, 0.68);
          font-size: 15px;
          line-height: 1.55;
          font-weight: 750;
        }

        .metaLine {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
        }

        .metaLine span {
          border-radius: 999px;
          padding: 8px 11px;
          background: rgba(255, 255, 255, 0.62);
          border: 1px solid rgba(62, 74, 45, 0.1);
          color: #334155;
          font-size: 12px;
          font-weight: 900;
        }


        .followArea {
          margin-top: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .followButton {
          min-height: 42px;
          border: 0;
          border-radius: 999px;
          padding: 0 18px;
          background: #203c2e;
          color: #fffdf7;
          font-size: 13px;
          font-weight: 950;
          cursor: pointer;
          box-shadow: 0 14px 28px rgba(32, 60, 46, 0.18);
          transition: 0.18s ease;
        }

        .followButton:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 34px rgba(32, 60, 46, 0.22);
        }

        .followButton.following {
          background: rgba(255, 253, 247, 0.88);
          color: #203c2e;
          border: 1px solid rgba(32, 60, 46, 0.20);
          box-shadow: none;
        }

        .followButton:disabled {
          opacity: 0.62;
          cursor: not-allowed;
          transform: none;
        }

        .followError {
          max-width: 280px;
          color: #991b1b;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.35;
        }

        .bioText {
          margin: 18px 0 0;
          padding: 14px 16px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.68);
          border: 1px solid rgba(62, 74, 45, 0.08);
          color: rgba(23, 32, 24, 0.72);
          font-size: 14px;
          line-height: 1.55;
          font-weight: 700;
        }

        .heroMedal {
          justify-self: end;
          width: 170px;
          border-radius: 28px;
          padding: 14px;
          text-align: center;
          background: rgba(255, 255, 255, 0.62);
          border: 1px solid rgba(62, 74, 45, 0.1);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .heroMedal img {
          width: 120px;
          height: 120px;
          object-fit: contain;
          display: block;
          margin: 0 auto 8px;
        }

        .heroMedal strong {
          display: block;
          color: #172018;
          font-size: 13px;
          line-height: 1.1;
          font-weight: 950;
        }

        .heroMedal span {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
        }

        .quickStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin: 16px 0;
        }

        .quickStats article,
        .sectionCard,
        .sideCard {
          background: rgba(255, 253, 247, 0.88);
          border: 1px solid rgba(62, 74, 45, 0.1);
          box-shadow: 0 18px 55px rgba(42, 55, 36, 0.1);
        }

        .quickStats article {
          border-radius: 26px;
          padding: 18px;
        }

        .quickStats strong {
          display: block;
          color: #172018;
          font-size: 26px;
          line-height: 1;
          font-weight: 950;
        }

        .quickStats span {
          display: block;
          margin-top: 7px;
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
        }

        .contentGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 16px;
          align-items: start;
        }

        .leftColumn,
        .rightColumn {
          display: grid;
          gap: 16px;
        }

        .sectionCard,
        .sideCard {
          border-radius: 32px;
          padding: 22px;
        }

        .sectionTitle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(62, 74, 45, 0.08);
        }

        .sectionTitle h2 {
          margin: 4px 0 0;
          color: #172018;
          font-size: 24px;
          letter-spacing: -0.04em;
          line-height: 1;
          font-weight: 950;
        }

        .medalGrid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
        }

        .medalCard {
          min-height: 180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          gap: 7px;
          border-radius: 24px;
          padding: 12px 10px;
          text-align: center;
          background: rgba(255, 255, 255, 0.66);
          border: 1px solid rgba(62, 74, 45, 0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
        }

        .medalCard.unlocked {
          border-color: rgba(153, 27, 27, 0.14);
          background:
            radial-gradient(circle at 50% 0%, rgba(251, 146, 60, 0.13), transparent 52%),
            rgba(255, 253, 247, 0.86);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .medalCard.locked {
          opacity: 0.46;
        }

        .medalCard.locked .medalArt img {
          filter: grayscale(1) brightness(1.12) opacity(0.82);
        }

        .medalCard:hover {
          transform: translateY(-2px);
        }

        .medalArt {
          width: 104px;
          height: 104px;
          display: grid;
          place-items: center;
        }

        .betaMedal .medalArt {
          width: 112px;
          height: 112px;
        }

        .medalArt img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          display: block;
        }

        .medalArt span {
          font-size: 42px;
        }

        .medalCard strong {
          color: #172018;
          font-size: 12px;
          line-height: 1.16;
          font-weight: 950;
        }

        .medalCard span {
          color: #64748b;
          font-size: 10px;
          line-height: 1.1;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .photoGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .photoCard {
          position: relative;
          margin: 0;
          aspect-ratio: 1 / 1;
          border-radius: 22px;
          overflow: hidden;
          background: #e5e7eb;
          border: 1px solid rgba(62, 74, 45, 0.1);
        }

        .photoCard img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .photoCard figcaption {
          position: absolute;
          left: 8px;
          bottom: 8px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 999px;
          padding: 4px 8px;
          background: rgba(15, 23, 42, 0.62);
          color: #fff;
          backdrop-filter: blur(8px);
        }

        .photoCard button {
          border: 0;
          padding: 0;
          background: transparent;
          color: #fff;
          cursor: pointer;
        }

        .photoCard span {
          font-size: 11px;
          font-weight: 900;
        }

        .emptyPhotos {
          display: grid;
          place-items: center;
          gap: 6px;
          padding: 34px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.56);
          border: 1px dashed rgba(62, 74, 45, 0.18);
          text-align: center;
        }

        .emptyPhotos span {
          font-size: 36px;
        }

        .emptyPhotos strong {
          color: #172018;
          font-size: 16px;
          font-weight: 950;
        }

        .emptyPhotos p {
          max-width: 360px;
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.45;
          font-weight: 750;
        }

        .sideCard {
          text-align: center;
        }

        .sideCard img {
          width: 132px;
          height: 132px;
          object-fit: contain;
          display: block;
          margin: 14px auto 6px;
        }

        .sideCard h3 {
          margin: 0;
          color: #172018;
          font-size: 20px;
          line-height: 1;
          letter-spacing: -0.035em;
          font-weight: 950;
        }

        .sideCard p {
          margin: 10px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.45;
          font-weight: 750;
        }

        .progressBar {
          width: 100%;
          height: 10px;
          margin-top: 14px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(15, 23, 42, 0.08);
        }

        .progressBar i {
          display: block;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #991b1b, #b8914c, #446b35);
        }

        .textCard {
          text-align: left;
        }

        .textCard p {
          font-size: 14px;
        }

        @media (max-width: 980px) {
          .heroCard {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .heroMedal {
            display: none;
          }

          .contentGrid {
            grid-template-columns: 1fr;
          }

          .rightColumn {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .sideCard img {
            width: 94px;
            height: 94px;
          }

          .medalGrid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .appHeader {
            padding: 8px 12px;
          }

          .headerInner {
            gap: 8px;
          }

          .brandLogo {
            width: 34px;
            height: 34px;
          }

          .brandCopy strong {
            font-size: 30px;
            line-height: 0.88;
            letter-spacing: -0.055em;
          }

          .brandCopy small {
            margin-top: 5px;
            font-size: 9px;
            letter-spacing: 0.12em;
          }

          .backButton {
            padding: 9px 12px;
            font-size: 12px;
          }

          .profileWrap {
            padding: 14px 12px 32px;
          }

          .heroCard {
            grid-template-columns: 1fr;
            gap: 14px;
            padding: 18px;
            border-radius: 28px;
            text-align: center;
          }

          .avatarBlock {
            flex-direction: row;
            justify-content: center;
          }

          .avatarFrame {
            width: 74px;
            height: 74px;
            border-width: 3px;
          }

          .avatarFrame span {
            font-size: 32px;
          }

          .likeButton {
            padding: 7px 10px;
          }

          .likeButton small {
            display: none;
          }

          .profileMain h1 {
            font-size: 40px;
          }

          .followArea {
            justify-content: center;
            margin-top: 12px;
            gap: 7px;
          }

          .followButton {
            min-height: 38px;
            padding: 0 15px;
            font-size: 12px;
          }

          .subtitle {
            margin-top: 10px;
            font-size: 13px;
          }

          .bioText {
            font-size: 13px;
            text-align: left;
            max-height: 120px;
            overflow: auto;
          }

          .metaLine {
            justify-content: center;
          }

          .quickStats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .quickStats article {
            border-radius: 22px;
            padding: 14px;
          }

          .quickStats strong {
            font-size: 22px;
          }

          .quickStats span {
            font-size: 11px;
          }

          .sectionCard,
          .sideCard {
            border-radius: 28px;
            padding: 18px;
          }

          .medalGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .medalCard {
            min-height: 178px;
            border-radius: 22px;
            padding: 10px;
          }

          .medalArt {
            width: 106px;
            height: 106px;
          }

          .betaMedal .medalArt {
            width: 112px;
            height: 112px;
          }

          .rightColumn {
            display: none;
          }

          .photoGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }
        }

        @media (max-width: 420px) {
          .brandLockup {
            gap: 8px;
          }

          .brandLogo {
            width: 30px;
            height: 30px;
          }

          .brandCopy strong {
            font-size: 26px;
          }

          .brandCopy small {
            font-size: 8px;
            letter-spacing: 0.09em;
          }

          .backButton {
            padding: 8px 10px;
            font-size: 11px;
          }

          .profileMain h1 {
            font-size: 36px;
          }

          .quickStats {
            grid-template-columns: 1fr 1fr;
          }

          .medalGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </main>
  )
}
