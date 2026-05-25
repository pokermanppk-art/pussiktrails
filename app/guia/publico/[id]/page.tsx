'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Guia = {
  id: string
  nome?: string | null
  email?: string | null
  tipo?: string | null
  bio?: string | null
  bio_guia?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  cadastur?: string | null
  nivel_guia?: number | null
  xp_guia?: number | null
  guia_beta?: boolean | null
  guia_pioneiro_beta?: boolean | null
  medalha_guia_pioneiro_beta?: boolean | null
  beneficio_taxa_beta_ativo?: boolean | null
  taxa_plataforma_percentual?: number | null
}

type Roteiro = {
  id: string
  titulo?: string | null
  nome?: string | null
  descricao?: string | null
  km?: number | null
  distancia_km?: number | null
  preco?: number | null
  valor?: number | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  local?: string | null
  localizacao?: string | null
  dificuldade?: string | null
  status?: string | null
  id_guia?: string | null
  guia_id?: string | null
  user_id?: string | null
  usuario_id?: string | null
}

type Reserva = {
  id: string
  roteiro_id?: string | null
  cliente_id?: string | null
  status?: string | null
  pagamento_status?: string | null
}

type Avaliacao = {
  id: string
  nota?: number | null
  comentario?: string | null
  observacao?: string | null
  descricao?: string | null
  cliente_id?: string | null
  cliente_nome?: string | null
  cliente_avatar?: string | null
  created_at?: string | null
  status_moderacao?: string | null
  [key: string]: any
}

type Stats = {
  totalKm: number
  totalRoteiros: number
  totalReservas: number
  reservasConfirmadas: number
  totalClientes: number
  avaliacaoMedia: number
  totalAvaliacoes: number
}

const statsInicial: Stats = {
  totalKm: 0,
  totalRoteiros: 0,
  totalReservas: 0,
  reservasConfirmadas: 0,
  totalClientes: 0,
  avaliacaoMedia: 0,
  totalAvaliacoes: 0
}

const METAS_KM_GUIA = [
  { km: 32, nome: 'Bronze', icone: '🥉' },
  { km: 96, nome: 'Prata', icone: '🥈' },
  { km: 192, nome: 'Ouro', icone: '🥇' },
  { km: 384, nome: 'Platina', icone: '💎' },
  { km: 768, nome: 'Elite', icone: '⚡' },
  { km: 1152, nome: 'Master', icone: '👑' },
  { km: 1920, nome: 'Lenda', icone: '🌟' },
  { km: 3840, nome: 'Lenda Absoluta', icone: '🔥' }
]

export default function PerfilPublicoGuiaPage() {
  const params = useParams()
  const router = useRouter()

  const guiaId = String(params?.id || '')

  const [guia, setGuia] = useState<Guia | null>(null)
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [stats, setStats] = useState<Stats>(statsInicial)

  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!guiaId) return
    carregarPerfil()
  }, [guiaId])

  const normalizar = (valor: any) => {
    return String(valor || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }

  const formatarMoeda = (valor: any) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(valor || 0))
  }

  const formatarData = (valor?: string | null) => {
    if (!valor) return ''

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return ''

    return data.toLocaleDateString('pt-BR')
  }

  const pagamentoConfirmado = (reserva: Reserva) => {
    const pagamento = normalizar(reserva.pagamento_status)
    const status = normalizar(reserva.status)

    return (
      pagamento === 'pago' ||
      pagamento === 'confirmado' ||
      pagamento === 'aprovado' ||
      pagamento === 'paid' ||
      pagamento === 'approved' ||
      status === 'confirmada' ||
      status === 'realizada' ||
      status === 'pago' ||
      status === 'paga'
    )
  }

  const roteiroAtivo = (roteiro: Roteiro) => {
    const status = normalizar(roteiro.status)

    if (!status) return true

    return (
      status === 'ativo' ||
      status === 'aprovado' ||
      status === 'aprovada' ||
      status === 'publicado' ||
      status === 'publicada'
    )
  }

  const fotoGuia = () => {
    return guia?.avatar_url || guia?.foto_url || guia?.imagem_url || ''
  }

  const nomeGuia = () => {
    return guia?.nome || guia?.email || 'Guia PrussikTrails'
  }

  const bioGuia = () => {
    return guia?.bio_guia || guia?.bio || ''
  }

  const fotoRoteiro = (roteiro: Roteiro) => {
    return roteiro.foto_capa || roteiro.foto_url || roteiro.imagem_url || ''
  }

  const tituloRoteiro = (roteiro: Roteiro) => {
    return roteiro.titulo || roteiro.nome || 'Roteiro'
  }

  const localRoteiro = (roteiro: Roteiro) => {
    return roteiro.local || roteiro.localizacao || 'Local a confirmar'
  }

  const kmRoteiro = (roteiro: Roteiro) => {
    return Number(roteiro.km || roteiro.distancia_km || 0)
  }

  const valorRoteiro = (roteiro: Roteiro) => {
    return Number(roteiro.preco || roteiro.valor || 0)
  }

  const guiaPioneiroBeta = () => {
    return Boolean(
      guia?.medalha_guia_pioneiro_beta ||
        guia?.guia_pioneiro_beta ||
        guia?.guia_beta ||
        guia?.beneficio_taxa_beta_ativo ||
        guia?.tipo === 'guia'
    )
  }

  const getNivelPorKm = (km: number) => {
    for (let i = METAS_KM_GUIA.length - 1; i >= 0; i--) {
      if (km >= METAS_KM_GUIA[i].km) return METAS_KM_GUIA[i]
    }

    return METAS_KM_GUIA[0]
  }

  const calcularProximoMarcoKm = (km: number) => {
    for (const meta of METAS_KM_GUIA) {
      if (km < meta.km) return meta.km
    }

    return METAS_KM_GUIA[METAS_KM_GUIA.length - 1].km
  }

  const calcularMarcoAnteriorKm = (km: number) => {
    let anterior = 0

    for (const meta of METAS_KM_GUIA) {
      if (km >= meta.km) anterior = meta.km
    }

    return anterior
  }

  const calcularProgressoKm = (km: number) => {
    const proximo = calcularProximoMarcoKm(km)
    const anterior = calcularMarcoAnteriorKm(km)

    if (proximo <= anterior) return 100

    return Math.max(0, Math.min(((km - anterior) / (proximo - anterior)) * 100, 100))
  }

  const buscarRoteirosDoGuia = async (id: string) => {
    const campos = ['id_guia', 'guia_id', 'user_id', 'usuario_id']
    const mapa = new Map<string, Roteiro>()

    for (const campo of campos) {
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .eq(campo, id)
        .limit(100)

      if (!error && data) {
        ;(data as Roteiro[]).forEach((roteiro) => {
          if (roteiro?.id) mapa.set(roteiro.id, roteiro)
        })
      }
    }

    return Array.from(mapa.values()).filter(roteiroAtivo)
  }

  const buscarAvaliacoesDoGuia = async (id: string) => {
    const campos = ['guia_id', 'id_guia']
    let lista: Avaliacao[] = []

    for (const campo of campos) {
      const { data, error } = await supabase
        .from('avaliacoes')
        .select('*')
        .eq(campo, id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!error && data) {
        lista = data as Avaliacao[]
        break
      }
    }

    lista = lista.filter((avaliacao) => {
      const status = normalizar(avaliacao.status_moderacao)
      if (!status) return true
      return status === 'aprovada' || status === 'aprovado'
    })

    const clienteIds = Array.from(
      new Set(
        lista
          .map((avaliacao) => avaliacao.cliente_id)
          .filter(Boolean) as string[]
      )
    )

    if (clienteIds.length === 0) return lista

    const { data: clientes } = await supabase
      .from('users')
      .select('id, nome, email, avatar_url')
      .in('id', clienteIds)

    return lista.map((avaliacao) => {
      const cliente = (clientes || []).find((item: any) => item.id === avaliacao.cliente_id)

      return {
        ...avaliacao,
        cliente_nome: cliente?.nome || cliente?.email || 'Cliente',
        cliente_avatar: cliente?.avatar_url || ''
      }
    })
  }

  const carregarPerfil = async () => {
    setCarregando(true)
    setErro('')

    try {
      const { data: guiaData, error: guiaError } = await supabase
        .from('users')
        .select('*')
        .eq('id', guiaId)
        .maybeSingle()

      if (guiaError) {
        console.error('Erro ao carregar guia:', guiaError)
        setErro('Não foi possível carregar este perfil.')
        return
      }

      if (!guiaData) {
        setErro('Guia não encontrado.')
        return
      }

      setGuia(guiaData as Guia)

      const roteirosDoGuia = await buscarRoteirosDoGuia(guiaId)
      setRoteiros(roteirosDoGuia)

      const roteiroIds = roteirosDoGuia.map((roteiro) => roteiro.id).filter(Boolean)

      let reservas: Reserva[] = []

      if (roteiroIds.length > 0) {
        const { data: reservasData, error: reservasError } = await supabase
          .from('reservas')
          .select('*')
          .in('roteiro_id', roteiroIds)

        if (!reservasError && reservasData) {
          reservas = reservasData as Reserva[]
        }
      }

      const avaliacoesDoGuia = await buscarAvaliacoesDoGuia(guiaId)
      setAvaliacoes(avaliacoesDoGuia)

      const totalKm = roteirosDoGuia.reduce(
        (total, roteiro) => total + kmRoteiro(roteiro),
        0
      )

      const reservasConfirmadas = reservas.filter(pagamentoConfirmado)

      const clientesUnicos = new Set(
        reservas
          .map((reserva) => reserva.cliente_id)
          .filter(Boolean)
      )

      const avaliacaoMedia =
        avaliacoesDoGuia.length > 0
          ? avaliacoesDoGuia.reduce((total, avaliacao) => total + Number(avaliacao.nota || 0), 0) / avaliacoesDoGuia.length
          : 0

      setStats({
        totalKm,
        totalRoteiros: roteirosDoGuia.length,
        totalReservas: reservas.length,
        reservasConfirmadas: reservasConfirmadas.length,
        totalClientes: clientesUnicos.size,
        avaliacaoMedia,
        totalAvaliacoes: avaliacoesDoGuia.length
      })
    } catch (error) {
      console.error('Erro inesperado ao carregar perfil público:', error)
      setErro('Erro inesperado ao carregar este perfil.')
    } finally {
      setCarregando(false)
    }
  }

  const nivelAtual = useMemo(() => {
    return getNivelPorKm(stats.totalKm)
  }, [stats.totalKm])

  const proximoMarco = useMemo(() => {
    return calcularProximoMarcoKm(stats.totalKm)
  }, [stats.totalKm])

  const progressoKm = useMemo(() => {
    return calcularProgressoKm(stats.totalKm)
  }, [stats.totalKm])

  const conquistasKm = [
    { nome: 'Primeira trilha', icone: '🥾', km: 0, desbloqueado: stats.totalKm >= 0 },
    { nome: 'Explorador', icone: '🌱', km: 32, desbloqueado: stats.totalKm >= 32 },
    { nome: 'Caminhante', icone: '🚶', km: 96, desbloqueado: stats.totalKm >= 96 },
    { nome: 'Aventureiro', icone: '🧭', km: 384, desbloqueado: stats.totalKm >= 384 },
    { nome: 'Mestre', icone: '👑', km: 1152, desbloqueado: stats.totalKm >= 1152 },
    { nome: 'Lenda', icone: '🌟', km: 1920, desbloqueado: stats.totalKm >= 1920 },
    { nome: 'Lenda Absoluta', icone: '🔥', km: 3840, desbloqueado: stats.totalKm >= 3840 }
  ]

  const medalhas = [
    {
      nome: 'Guia Pioneiro Beta',
      icone: '🏕️',
      descricao: 'Reconhecimento para guias que participam da construção inicial da comunidade PrussikTrails.',
      desbloqueado: guiaPioneiroBeta(),
      especial: true
    },
    {
      nome: 'KM Guiados',
      icone: '👣',
      descricao: `${stats.totalKm.toFixed(1)} km guiados`,
      desbloqueado: stats.totalKm >= 32
    },
    {
      nome: 'Guias Avaliados',
      icone: '⭐',
      descricao: `${stats.totalAvaliacoes} avaliação(ões) recebida(s)`,
      desbloqueado: stats.totalAvaliacoes >= 1
    },
    {
      nome: 'Trilhas Guiadas',
      icone: '🥾',
      descricao: `${stats.totalRoteiros} roteiro(s) publicado(s)`,
      desbloqueado: stats.totalRoteiros >= 1
    },
    {
      nome: 'Clientes Atendidos',
      icone: '👥',
      descricao: `${stats.totalClientes} cliente(s) atendido(s)`,
      desbloqueado: stats.totalClientes >= 1
    }
  ]

  const principaisRoteiros = roteiros.slice(0, 3)

  if (carregando) {
    return (
      <main className="loading">
        <style>{`
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #f6f7f1;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          .loading {
            min-height: 100vh;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            background:
              radial-gradient(circle at 10% 0%, rgba(132,204,22,0.16), transparent 28%),
              radial-gradient(circle at 90% 10%, rgba(251,146,60,0.14), transparent 28%),
              linear-gradient(180deg,#fffdf7 0%,#f3f5ea 48%,#eef2e5 100%);
            color: #172018;
          }
          .loadingCard {
            background: rgba(255,255,255,0.92);
            border: 1px solid rgba(15,23,42,0.06);
            border-radius: 30px;
            padding: 28px;
            text-align: center;
            box-shadow: 0 20px 50px rgba(15,23,42,0.08);
          }
          .loadingCard img {
            height: 64px;
            width: auto;
            margin-bottom: 12px;
          }
        `}</style>

        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>Carregando perfil público...</div>
        </div>
      </main>
    )
  }

  if (erro || !guia) {
    return (
      <main className="emptyPage">
        <style>{`
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #f6f7f1;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          .emptyPage {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background:
              radial-gradient(circle at 10% 0%, rgba(132,204,22,0.16), transparent 28%),
              linear-gradient(180deg,#fffdf7 0%,#eef2e5 100%);
            padding: 20px;
          }
          .emptyCard {
            max-width: 420px;
            width: 100%;
            background: #ffffff;
            border-radius: 30px;
            padding: 28px;
            text-align: center;
            box-shadow: 0 20px 50px rgba(15,23,42,0.08);
          }
          .emptyCard img {
            height: 64px;
            margin-bottom: 14px;
          }
          .emptyTitle {
            font-size: 24px;
            font-weight: 950;
            color: #172018;
            letter-spacing: -0.05em;
            margin: 0;
          }
          .emptyText {
            color: #64748b;
            font-size: 14px;
            line-height: 1.55;
            margin: 10px 0 18px;
            font-weight: 700;
          }
          .btn {
            border: none;
            background: #172018;
            color: #ffffff;
            border-radius: 999px;
            padding: 12px 16px;
            font-size: 13px;
            font-weight: 950;
            cursor: pointer;
          }
        `}</style>

        <div className="emptyCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <h1 className="emptyTitle">Perfil não encontrado</h1>
          <p className="emptyText">{erro || 'Não foi possível localizar este guia.'}</p>
          <button type="button" className="btn" onClick={() => router.push('/roteiros')}>
            Ver roteiros
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{`
        * { box-sizing: border-box; }

        body {
          margin: 0;
          background: #f6f7f1;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .page {
          min-height: 100vh;
          min-height: 100dvh;
          background:
            radial-gradient(circle at 10% 0%, rgba(132,204,22,0.16), transparent 28%),
            radial-gradient(circle at 90% 10%, rgba(251,146,60,0.14), transparent 28%),
            linear-gradient(180deg,#fffdf7 0%,#f3f5ea 48%,#eef2e5 100%);
          color: #172018;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255,253,247,0.88);
          border-bottom: 1px solid rgba(15,23,42,0.06);
          backdrop-filter: blur(18px);
          padding: 10px 16px;
        }

        .headerInner {
          max-width: 1180px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          min-width: 0;
        }

        .brand img {
          height: 42px;
          width: auto;
          object-fit: contain;
          display: block;
        }

        .brandTitle {
          color: #dc2626;
          font-size: 17px;
          font-weight: 950;
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .brandSub {
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          margin-top: 3px;
        }

        .headerActions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .headerBtn {
          border: 1px solid rgba(15,23,42,0.08);
          background: rgba(255,255,255,0.84);
          color: #172018;
          border-radius: 999px;
          padding: 10px 13px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .headerBtn.dark {
          background: #172018;
          color: #ffffff;
          border-color: #172018;
        }

        .container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 22px 16px 54px;
        }

        .hero {
          position: relative;
          overflow: hidden;
          border-radius: 38px;
          padding: 28px;
          background:
            linear-gradient(135deg, rgba(23,32,24,0.78), rgba(23,32,24,0.34)),
            radial-gradient(circle at top right, rgba(190,242,100,0.30), transparent 34%),
            linear-gradient(135deg, #1f331f 0%, #647a49 46%, #d7c6a1 100%);
          color: #ffffff;
          box-shadow: 0 24px 60px rgba(23,32,24,0.18);
          margin-bottom: 16px;
        }

        .heroGrid {
          display: grid;
          grid-template-columns: 180px minmax(0,1fr) 280px;
          gap: 22px;
          align-items: end;
        }

        .avatar {
          width: 180px;
          height: 180px;
          border-radius: 38px;
          overflow: hidden;
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 18px 38px rgba(0,0,0,0.16);
        }

        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .avatarFallback {
          width: 94px;
          height: 94px;
          border-radius: 999px;
          background: #bef264;
          color: #172018;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 38px;
          font-weight: 950;
        }

        .eyebrow {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.24);
          background: rgba(255,255,255,0.12);
          color: #f7fee7;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .heroTitle {
          margin: 0;
          font-size: clamp(40px, 5.4vw, 70px);
          line-height: 0.92;
          font-weight: 950;
          letter-spacing: -0.085em;
        }

        .heroText {
          max-width: 620px;
          color: rgba(255,255,255,0.82);
          line-height: 1.6;
          margin: 14px 0 0;
          font-size: 14px;
          font-weight: 650;
        }

        .badgesRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          padding: 8px 12px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.18);
          color: #ffffff;
          font-size: 12px;
          font-weight: 950;
        }

        .badge.special {
          background: rgba(190,242,100,0.18);
          border-color: rgba(190,242,100,0.32);
          color: #ecfccb;
        }

        .progressHeroCard {
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 30px;
          padding: 18px;
          backdrop-filter: blur(14px);
        }

        .progressIcon {
          width: 62px;
          height: 62px;
          border-radius: 24px;
          background: rgba(190,242,100,0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
        }

        .progressTitle {
          margin-top: 12px;
          font-size: 26px;
          font-weight: 950;
          letter-spacing: -0.05em;
        }

        .progressSmall {
          color: rgba(255,255,255,0.76);
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
          margin-top: 6px;
        }

        .barOuter {
          margin-top: 12px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.18);
          overflow: hidden;
        }

        .barInner {
          height: 100%;
          border-radius: 999px;
          background: #bef264;
          width: ${progressoKm}%;
        }

        .grid {
          display: grid;
          grid-template-columns: minmax(0,1fr) 360px;
          gap: 16px;
          align-items: start;
        }

        .stack {
          display: grid;
          gap: 16px;
        }

        .card {
          background: rgba(255,255,255,0.90);
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 30px;
          box-shadow: 0 12px 34px rgba(15,23,42,0.06);
          overflow: hidden;
        }

        .cardHeader {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(15,23,42,0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .cardTitle {
          margin: 0;
          color: #172018;
          font-size: 18px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .cardSub {
          margin-top: 3px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
        }

        .cardBody {
          padding: 18px;
        }

        .bioText {
          color: #475569;
          font-size: 14px;
          line-height: 1.75;
          font-weight: 650;
          white-space: pre-wrap;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 10px;
        }

        .statBox {
          background: #fffdf7;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 22px;
          padding: 14px;
        }

        .statIcon {
          font-size: 22px;
          margin-bottom: 8px;
        }

        .statValue {
          color: #172018;
          font-size: 22px;
          font-weight: 950;
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .statLabel {
          margin-top: 5px;
          color: #64748b;
          font-size: 11px;
          font-weight: 850;
          line-height: 1.35;
        }

        .achievementGrid,
        .medalGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 10px;
        }

        .achievement,
        .medal {
          background: #fffdf7;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 22px;
          padding: 14px;
          text-align: center;
          transition: 0.2s ease;
        }

        .achievement.locked,
        .medal.locked {
          opacity: 0.42;
          filter: grayscale(0.8);
        }

        .medal.specialMedal {
          background:
            radial-gradient(circle at top right, rgba(190,242,100,0.35), transparent 46%),
            #172018;
          color: #ffffff;
          border-color: rgba(190,242,100,0.28);
          box-shadow: 0 18px 42px rgba(23,32,24,0.16);
        }

        .achievementIcon,
        .medalIcon {
          font-size: 28px;
          margin-bottom: 8px;
        }

        .achievementName,
        .medalName {
          color: #172018;
          font-size: 12px;
          font-weight: 950;
          line-height: 1.25;
        }

        .specialMedal .medalName {
          color: #ffffff;
        }

        .achievementMeta,
        .medalMeta {
          margin-top: 4px;
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
          line-height: 1.35;
        }

        .specialMedal .medalMeta {
          color: rgba(255,255,255,0.72);
        }

        .timeline {
          display: grid;
          gap: 8px;
        }

        .timelineItem {
          display: grid;
          grid-template-columns: 64px minmax(0,1fr) auto;
          gap: 10px;
          align-items: center;
          background: #fffdf7;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 18px;
          padding: 10px;
        }

        .timelineKm {
          color: #172018;
          font-size: 13px;
          font-weight: 950;
        }

        .timelineName {
          color: #475569;
          font-size: 12px;
          font-weight: 850;
        }

        .timelineStatus {
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 10px;
          font-weight: 950;
          background: #eef2e5;
          color: #64748b;
        }

        .timelineStatus.ok {
          background: #dcfce7;
          color: #166534;
        }

        .routeGrid {
          display: grid;
          gap: 10px;
        }

        .routeCard {
          display: grid;
          grid-template-columns: 92px minmax(0,1fr);
          gap: 12px;
          background: #fffdf7;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 22px;
          padding: 10px;
          cursor: pointer;
        }

        .routePhoto {
          height: 84px;
          border-radius: 18px;
          background: #eef2e5;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-size: 24px;
        }

        .routePhoto img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .routeTitle {
          color: #172018;
          font-size: 13px;
          font-weight: 950;
          line-height: 1.25;
        }

        .routeMeta {
          margin-top: 5px;
          color: #64748b;
          font-size: 11px;
          font-weight: 750;
          line-height: 1.35;
        }

        .routePrice {
          margin-top: 8px;
          color: #16a34a;
          font-size: 13px;
          font-weight: 950;
        }

        .reviewList {
          display: grid;
          gap: 10px;
        }

        .review {
          background: #fffdf7;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 22px;
          padding: 14px;
        }

        .reviewTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }

        .reviewName {
          color: #172018;
          font-size: 13px;
          font-weight: 950;
        }

        .stars {
          color: #f59e0b;
          font-size: 12px;
          font-weight: 950;
        }

        .reviewText {
          margin-top: 8px;
          color: #475569;
          font-size: 13px;
          line-height: 1.5;
          font-weight: 650;
        }

        .reviewDate {
          margin-top: 8px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 800;
        }

        .empty {
          background: #fffdf7;
          border: 1px dashed rgba(15,23,42,0.14);
          border-radius: 22px;
          padding: 22px;
          color: #64748b;
          text-align: center;
          font-size: 13px;
          line-height: 1.5;
          font-weight: 750;
        }

        .btn {
          border: none;
          border-radius: 999px;
          padding: 11px 14px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(15,23,42,0.10);
        }

        .btn.dark {
          background: #172018;
          color: #ffffff;
        }

        .btn.light {
          background: #eef2e5;
          color: #475569;
        }

        .actionRow {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        @media (max-width: 1060px) {
          .heroGrid,
          .grid {
            grid-template-columns: 1fr;
          }

          .heroGrid {
            align-items: start;
          }

          .avatar {
            width: 170px;
            height: 170px;
          }
        }

        @media (max-width: 760px) {
          .header {
            padding: 9px 12px;
          }

          .brandTitle,
          .brandSub,
          .hideMobile {
            display: none;
          }

          .container {
            padding: 16px 12px 42px;
          }

          .hero,
          .card {
            border-radius: 28px;
          }

          .hero {
            padding: 20px;
          }

          .statsGrid,
          .achievementGrid,
          .medalGrid {
            grid-template-columns: 1fr 1fr;
          }

          .timelineItem {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .heroTitle {
            font-size: 38px;
          }

          .statsGrid,
          .achievementGrid,
          .medalGrid {
            grid-template-columns: 1fr;
          }

          .routeCard {
            grid-template-columns: 1fr;
          }

          .routePhoto {
            height: 150px;
          }

          .actionRow {
            display: grid;
          }

          .btn,
          .headerBtn {
            width: 100%;
          }

          .headerActions {
            gap: 6px;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <div className="brand" onClick={() => router.push('/')}>
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />

            <div>
              <div className="brandTitle">PrussikTrails</div>
              <div className="brandSub">Perfil público do guia</div>
            </div>
          </div>

          <div className="headerActions">
            <button
              type="button"
              className="headerBtn hideMobile"
              onClick={() => router.push('/roteiros')}
            >
              Ver roteiros
            </button>

            <button
              type="button"
              className="headerBtn dark"
              onClick={() => router.back()}
            >
              Voltar
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroGrid">
            <div className="avatar">
              {fotoGuia() ? (
                <img src={fotoGuia()} alt={nomeGuia()} />
              ) : (
                <div className="avatarFallback">
                  {nomeGuia().slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <div className="eyebrow">Guia PrussikTrails</div>

              <h1 className="heroTitle">{nomeGuia()}</h1>

              <p className="heroText">
                Perfil público do guia, com informações de experiência, evolução, conquistas e principais roteiros disponíveis na comunidade.
              </p>

              <div className="badgesRow">
                {guia.cadastur ? (
                  <span className="badge">🪪 CADASTUR: {guia.cadastur}</span>
                ) : (
                  <span className="badge">🪪 CADASTUR não informado</span>
                )}

                {guiaPioneiroBeta() && (
                  <span className="badge special">🏕️ Guia Pioneiro Beta</span>
                )}

                {stats.totalAvaliacoes > 0 && (
                  <span className="badge">⭐ {stats.avaliacaoMedia.toFixed(1)} de média</span>
                )}
              </div>
            </div>

            <aside className="progressHeroCard">
              <div className="progressIcon">{nivelAtual.icone}</div>
              <div className="progressTitle">{nivelAtual.nome}</div>

              <div className="progressSmall">
                {stats.totalKm.toFixed(1)} km guiados · próximo marco em {proximoMarco} km.
              </div>

              <div className="barOuter">
                <div className="barInner" />
              </div>
            </aside>
          </div>
        </section>

        <section className="grid">
          <div className="stack">
            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Bio</h2>
                  <div className="cardSub">
                    Um pouco sobre o guia, sua condução e sua presença nas trilhas.
                  </div>
                </div>
              </div>

              <div className="cardBody">
                <div className="bioText">
                  {bioGuia() || 'Este guia ainda não adicionou uma bio pública.'}
                </div>
              </div>
            </section>

            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Progressão</h2>
                  <div className="cardSub">
                    Evolução do guia dentro da jornada PrussikTrails.
                  </div>
                </div>
              </div>

              <div className="cardBody">
                <div className="statsGrid">
                  <div className="statBox">
                    <div className="statIcon">🥾</div>
                    <div className="statValue">{stats.totalRoteiros}</div>
                    <div className="statLabel">roteiros publicados</div>
                  </div>

                  <div className="statBox">
                    <div className="statIcon">✅</div>
                    <div className="statValue">{stats.reservasConfirmadas}</div>
                    <div className="statLabel">reservas confirmadas</div>
                  </div>

                  <div className="statBox">
                    <div className="statIcon">👥</div>
                    <div className="statValue">{stats.totalClientes}</div>
                    <div className="statLabel">clientes atendidos</div>
                  </div>

                  <div className="statBox">
                    <div className="statIcon">👣</div>
                    <div className="statValue">{stats.totalKm.toFixed(1)}</div>
                    <div className="statLabel">km guiados</div>
                  </div>

                  <div className="statBox">
                    <div className="statIcon">⭐</div>
                    <div className="statValue">{stats.avaliacaoMedia.toFixed(1)}</div>
                    <div className="statLabel">média de avaliação</div>
                  </div>

                  <div className="statBox">
                    <div className="statIcon">🏅</div>
                    <div className="statValue">{nivelAtual.nome}</div>
                    <div className="statLabel">nível atual</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Conquistas por km</h2>
                  <div className="cardSub">
                    Marcos desbloqueados conforme os quilômetros guiados.
                  </div>
                </div>
              </div>

              <div className="cardBody">
                <div className="achievementGrid">
                  {conquistasKm.map((item) => (
                    <div
                      key={item.nome}
                      className={`achievement ${item.desbloqueado ? '' : 'locked'}`}
                    >
                      <div className="achievementIcon">{item.icone}</div>
                      <div className="achievementName">{item.nome}</div>
                      <div className="achievementMeta">
                        {item.km === 0 ? 'Início da jornada' : `${item.km} km`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Evolução</h2>
                  <div className="cardSub">
                    Trilha de progressão pública do guia.
                  </div>
                </div>
              </div>

              <div className="cardBody">
                <div className="timeline">
                  {METAS_KM_GUIA.map((meta) => {
                    const conquistado = stats.totalKm >= meta.km

                    return (
                      <div className="timelineItem" key={meta.nome}>
                        <div className="timelineKm">{meta.km} km</div>
                        <div className="timelineName">
                          {meta.icone} {meta.nome}
                        </div>
                        <div className={`timelineStatus ${conquistado ? 'ok' : ''}`}>
                          {conquistado ? 'Conquistado' : 'Em progresso'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          </div>

          <aside className="stack">
            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Medalhas</h2>
                  <div className="cardSub">
                    Reconhecimentos públicos do guia.
                  </div>
                </div>
              </div>

              <div className="cardBody">
                <div className="medalGrid">
                  {medalhas.map((medalha) => (
                    <div
                      key={medalha.nome}
                      className={[
                        'medal',
                        medalha.especial ? 'specialMedal' : '',
                        medalha.desbloqueado ? '' : 'locked'
                      ].join(' ')}
                    >
                      <div className="medalIcon">{medalha.icone}</div>
                      <div className="medalName">{medalha.nome}</div>
                      <div className="medalMeta">
                        {medalha.desbloqueado ? medalha.descricao : 'Ainda não desbloqueada'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Principais roteiros</h2>
                  <div className="cardSub">
                    Até 3 roteiros em destaque deste guia.
                  </div>
                </div>
              </div>

              <div className="cardBody">
                {principaisRoteiros.length === 0 ? (
                  <div className="empty">
                    Este guia ainda não possui roteiros públicos ativos.
                  </div>
                ) : (
                  <div className="routeGrid">
                    {principaisRoteiros.map((roteiro) => (
                      <div
                        className="routeCard"
                        key={roteiro.id}
                        onClick={() => router.push(`/roteiros/${roteiro.id}`)}
                      >
                        <div className="routePhoto">
                          {fotoRoteiro(roteiro) ? (
                            <img src={fotoRoteiro(roteiro)} alt={tituloRoteiro(roteiro)} />
                          ) : (
                            <span>🥾</span>
                          )}
                        </div>

                        <div>
                          <div className="routeTitle">{tituloRoteiro(roteiro)}</div>

                          <div className="routeMeta">
                            {localRoteiro(roteiro)}
                            <br />
                            {kmRoteiro(roteiro).toFixed(1)} km
                            {roteiro.dificuldade ? ` · ${roteiro.dificuldade}` : ''}
                          </div>

                          <div className="routePrice">
                            {formatarMoeda(valorRoteiro(roteiro))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="actionRow">
                  <button
                    type="button"
                    className="btn dark"
                    onClick={() => router.push('/roteiros')}
                  >
                    Ver todos os roteiros
                  </button>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Avaliações</h2>
                  <div className="cardSub">
                    Comentários recentes dos aventureiros.
                  </div>
                </div>
              </div>

              <div className="cardBody">
                {avaliacoes.length === 0 ? (
                  <div className="empty">
                    Este guia ainda não possui avaliações públicas.
                  </div>
                ) : (
                  <div className="reviewList">
                    {avaliacoes.slice(0, 4).map((avaliacao) => (
                      <div className="review" key={avaliacao.id}>
                        <div className="reviewTop">
                          <div className="reviewName">
                            {avaliacao.cliente_nome || 'Cliente'}
                          </div>

                          <div className="stars">
                            ⭐ {Number(avaliacao.nota || 0).toFixed(1)}
                          </div>
                        </div>

                        <div className="reviewText">
                          {avaliacao.comentario || avaliacao.observacao || avaliacao.descricao || 'Avaliação sem comentário escrito.'}
                        </div>

                        <div className="reviewDate">
                          {formatarData(avaliacao.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  )
}