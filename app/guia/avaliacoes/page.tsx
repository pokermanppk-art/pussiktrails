'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type UsuarioLocal = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
  tipo?: string | null
}

type ResumoAvaliacoes = {
  total: number
  mediaNota: number
  notasAltas: number
  notasBaixas: number
  percentualNotasAltas: number
  percentualNotasBaixas: number
  recomendacoes: number
  percentualRecomendacao: number
  comentarios: number
  percentualComComentario: number
  orientacoesClarasPercentual: number
  segurancaAltaPercentual: number
  experienciaSuperouPercentual: number
}

type DistribuicaoItem = {
  chave?: string
  label?: string
  nota?: number
  quantidade: number
  percentual: number
}

type DistribuicaoAvaliacoes = {
  notas: DistribuicaoItem[]
  orientacoes: DistribuicaoItem[]
  seguranca: DistribuicaoItem[]
  experiencia: DistribuicaoItem[]
}

type AvaliacaoEnriquecida = {
  id: string
  reserva_id?: string | null
  roteiro_id?: string | null
  roteiro_titulo?: string | null
  roteiro_local?: string | null
  roteiro_imagem?: string | null
  guia_id?: string | null
  guia_nome?: string | null
  cliente_id?: string | null
  cliente_nome?: string | null
  nota: number
  orientacoes?: string | null
  orientacoes_label?: string | null
  seguranca?: string | null
  seguranca_label?: string | null
  experiencia?: string | null
  experiencia_label?: string | null
  comentario?: string | null
  recomenda?: boolean | null
  status?: string | null
  created_at?: string | null
}

type RoteiroResumo = {
  roteiro_id: string
  roteiro_titulo: string
  roteiro_local?: string | null
  roteiro_imagem?: string | null
  total: number
  mediaNota: number
  percentualRecomendacao: number
  orientacoesClarasPercentual: number
  segurancaAltaPercentual: number
  experienciaSuperouPercentual: number
}

type EstatisticasResponse = {
  sucesso: boolean
  erro?: string
  resumo: ResumoAvaliacoes
  distribuicao: DistribuicaoAvaliacoes
  comentariosRecentes: AvaliacaoEnriquecida[]
  avaliacoes: AvaliacaoEnriquecida[]
  porRoteiro: RoteiroResumo[]
}

const resumoInicial: ResumoAvaliacoes = {
  total: 0,
  mediaNota: 0,
  notasAltas: 0,
  notasBaixas: 0,
  percentualNotasAltas: 0,
  percentualNotasBaixas: 0,
  recomendacoes: 0,
  percentualRecomendacao: 0,
  comentarios: 0,
  percentualComComentario: 0,
  orientacoesClarasPercentual: 0,
  segurancaAltaPercentual: 0,
  experienciaSuperouPercentual: 0
}

const dadosIniciais: EstatisticasResponse = {
  sucesso: true,
  resumo: resumoInicial,
  distribuicao: {
    notas: [],
    orientacoes: [],
    seguranca: [],
    experiencia: []
  },
  comentariosRecentes: [],
  avaliacoes: [],
  porRoteiro: []
}

export default function GuiaAvaliacoesPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [dados, setDados] = useState<EstatisticasResponse>(dadosIniciais)
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [filtroComentarios, setFiltroComentarios] = useState<'todos' | 'comentarios' | 'baixas'>('todos')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('')

  useEffect(() => {
    if (iniciouRef.current) return

    iniciouRef.current = true
    iniciar()
  }, [])

  const iniciar = async () => {
    setCarregando(true)
    setErro('')
    setMensagem('')

    try {
      const userData = localStorage.getItem('user')

      if (!userData) {
        router.replace('/login')
        return
      }

      const parsedUser = JSON.parse(userData) as UsuarioLocal

      if (parsedUser.tipo !== 'guia') {
        router.replace('/login')
        return
      }

      setUser(parsedUser)
      await carregarAvaliacoes(parsedUser.id, true)
    } catch (error) {
      console.error('Erro ao iniciar avaliações do guia:', error)
      setErro('Não foi possível carregar suas avaliações agora.')
    } finally {
      setCarregando(false)
    }
  }

  const nomeUsuario = (usuario?: UsuarioLocal | null) => {
    return usuario?.nome || usuario?.name || usuario?.email || 'Guia'
  }

  const primeiroNome = (valor?: string | null) => {
    const nome = String(valor || 'Guia').trim()
    return nome.split(' ')[0] || 'Guia'
  }

  const formatarData = (valor?: string | null) => {
    if (!valor) return '-'

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return valor

    return data.toLocaleDateString('pt-BR')
  }

  const formatarPercentual = (valor: any) => {
    return `${Number(valor || 0).toFixed(1).replace('.', ',')}%`
  }

  const formatarNota = (valor: any) => {
    return Number(valor || 0).toFixed(2).replace('.', ',')
  }

  const estrelas = (nota: number) => {
    const inteira = Math.round(Number(nota || 0))

    return '★★★★★'
      .split('')
      .map((estrela, index) => (index < inteira ? '★' : '☆'))
      .join('')
  }

  const textoMedia = (nota: number) => {
    if (nota >= 4.7) return 'excelência percebida'
    if (nota >= 4.3) return 'muito bem avaliado'
    if (nota >= 3.8) return 'boa avaliação geral'
    if (nota > 0) return 'pontos a melhorar'
    return 'sem avaliações ainda'
  }

  const carregarAvaliacoes = async (guiaId: string, silencioso = false) => {
    if (!guiaId) return

    if (!silencioso) {
      setAtualizando(true)
      setMensagem('')
      setErro('')
    }

    try {
      const response = await fetch('/api/avaliacoes/estatisticas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          guiaId,
          status: 'publicada',
          limite: 500,
          limiteComentarios: 20
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.erro || 'Não foi possível buscar as avaliações.')
      }

      setDados({
        sucesso: true,
        resumo: data?.resumo || resumoInicial,
        distribuicao: data?.distribuicao || dadosIniciais.distribuicao,
        comentariosRecentes: data?.comentariosRecentes || [],
        avaliacoes: data?.avaliacoes || [],
        porRoteiro: data?.porRoteiro || []
      })

      setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))

      if (!silencioso) {
        setMensagem('Avaliações atualizadas.')
      }
    } catch (error: any) {
      console.error('Erro ao carregar avaliações:', error)
      setErro(error?.message || 'Erro ao buscar avaliações.')
    } finally {
      setAtualizando(false)
    }
  }

  const atualizar = async () => {
    if (!user?.id) return
    await carregarAvaliacoes(user.id, false)
  }

  const comentariosFiltrados = useMemo(() => {
    const lista = dados.avaliacoes || []

    if (filtroComentarios === 'comentarios') {
      return lista.filter((avaliacao) => String(avaliacao.comentario || '').trim())
    }

    if (filtroComentarios === 'baixas') {
      return lista.filter((avaliacao) => Number(avaliacao.nota || 0) <= 3)
    }

    return lista
  }, [dados.avaliacoes, filtroComentarios])

  const topRoteiros = useMemo(() => {
    return (dados.porRoteiro || []).slice(0, 5)
  }, [dados.porRoteiro])

  const renderBarra = (item: DistribuicaoItem, index: number) => {
    const label = item.label || (item.nota ? `${item.nota} estrela(s)` : item.chave || 'Item')

    return (
      <div className="barItem" key={`${label}-${index}`}>
        <div className="barTop">
          <span>{label}</span>
          <strong>{item.quantidade} · {formatarPercentual(item.percentual)}</strong>
        </div>

        <div className="barTrack">
          <div
            className="barFill"
            style={{ width: `${Math.max(0, Math.min(100, Number(item.percentual || 0)))}%` }}
          />
        </div>
      </div>
    )
  }

  const renderEmpty = (texto: string) => {
    return (
      <div className="empty">
        {texto}
      </div>
    )
  }

  if (carregando || !user) {
    return (
      <main className="loading">
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

          .loading {
            min-height: 100vh;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            background:
              radial-gradient(circle at top left, rgba(132, 204, 22, 0.18), transparent 30%),
              linear-gradient(180deg, #fffdf7 0%, #eef2e5 100%);
            color: #374151;
          }

          .loadingCard {
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.06);
            border-radius: 30px;
            padding: 28px;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
            text-align: center;
          }

          .loadingCard img {
            height: 68px;
            width: auto;
            margin-bottom: 12px;
          }
        `}</style>

        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>Carregando avaliações...</div>
        </div>
      </main>
    )
  }

  const resumo = dados.resumo || resumoInicial

  return (
    <main className="page">
      <style>{`
        * {
          box-sizing: border-box;
        }

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
            radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.16), transparent 28%),
            radial-gradient(circle at 90% 10%, rgba(251, 146, 60, 0.14), transparent 28%),
            linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
          color: #172018;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(255, 253, 247, 0.86);
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
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
          font-size: 18px;
          font-weight: 950;
          color: #dc2626;
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .brandSub {
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          margin-top: 3px;
        }

        .headerActions {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .iconBtn {
          height: 38px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(255,255,255,0.78);
          border-radius: 999px;
          padding: 0 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          font-weight: 900;
          transition: 0.2s ease;
          color: #172018;
          white-space: nowrap;
        }

        .iconBtn.primary {
          background: #172018;
          color: #ffffff;
          border-color: #172018;
        }

        .iconBtn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 22px 16px 48px;
        }

        .hero {
          position: relative;
          overflow: hidden;
          border-radius: 38px;
          padding: 30px;
          min-height: 330px;
          background:
            linear-gradient(135deg, rgba(23, 32, 24, 0.78), rgba(23, 32, 24, 0.36)),
            radial-gradient(circle at top right, rgba(190, 242, 100, 0.30), transparent 34%),
            linear-gradient(135deg, #1f331f 0%, #647a49 46%, #d7c6a1 100%);
          color: #ffffff;
          box-shadow: 0 24px 60px rgba(23, 32, 24, 0.18);
          margin-bottom: 16px;
        }

        .hero::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 46px 46px;
          mask-image: linear-gradient(to bottom, black, transparent);
          pointer-events: none;
        }

        .heroContent {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
          gap: 24px;
          align-items: end;
          min-height: 265px;
        }

        .eyebrow {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.26);
          background: rgba(255, 255, 255, 0.12);
          color: #f7fee7;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .heroTitle {
          margin: 0;
          max-width: 760px;
          font-size: clamp(42px, 6vw, 72px);
          line-height: 0.92;
          font-weight: 950;
          letter-spacing: -0.085em;
        }

        .heroTitle span {
          color: #bef264;
          text-shadow: 0 0 28px rgba(190, 242, 100, 0.32);
        }

        .heroText {
          max-width: 650px;
          color: rgba(255,255,255,0.82);
          line-height: 1.62;
          margin: 16px 0 0;
          font-size: 14px;
        }

        .heroCard {
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 30px;
          padding: 20px;
          backdrop-filter: blur(16px);
        }

        .heroCardLabel {
          color: rgba(255,255,255,0.76);
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }

        .heroCardValue {
          margin-top: 9px;
          color: #ffffff;
          font-size: 44px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.08em;
        }

        .heroStars {
          color: #bef264;
          font-size: 20px;
          letter-spacing: 2px;
          margin-top: 8px;
        }

        .heroCardText {
          margin-top: 8px;
          color: rgba(255,255,255,0.78);
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
        }

        .alert {
          border-radius: 18px;
          padding: 13px 15px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.45;
        }

        .alert.success {
          background: #ecfdf5;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .alert.error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .statCard {
          background: rgba(255,255,255,0.88);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 28px;
          padding: 16px;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
        }

        .statValue {
          color: #172018;
          font-size: 30px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.07em;
        }

        .statLabel {
          color: #64748b;
          font-size: 12px;
          font-weight: 850;
          line-height: 1.35;
          margin-top: 7px;
        }

        .mainGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(340px, 0.95fr);
          gap: 16px;
          align-items: start;
        }

        .panel {
          background: rgba(255,255,255,0.90);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 32px;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.07);
          overflow: hidden;
        }

        .panelHeader {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .panelTitle {
          margin: 0;
          color: #172018;
          font-size: 20px;
          line-height: 1.15;
          font-weight: 950;
          letter-spacing: -0.045em;
        }

        .panelSub {
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.45;
          margin-top: 4px;
        }

        .panelBody {
          padding: 18px;
        }

        .bars {
          display: grid;
          gap: 14px;
        }

        .barItem {
          background: #fffdf7;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 20px;
          padding: 12px;
        }

        .barTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: #475569;
          font-size: 12px;
          font-weight: 850;
          margin-bottom: 8px;
        }

        .barTop strong {
          color: #172018;
          white-space: nowrap;
        }

        .barTrack {
          height: 10px;
          border-radius: 999px;
          background: #e8eadf;
          overflow: hidden;
        }

        .barFill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #16a34a, #84cc16);
        }

        .tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tab {
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: #fffdf7;
          color: #475569;
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
        }

        .tab.active {
          background: #172018;
          color: #ffffff;
          border-color: #172018;
        }

        .reviewsList {
          display: grid;
          gap: 12px;
        }

        .reviewCard {
          background: #fffdf7;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 24px;
          padding: 14px;
        }

        .reviewTop {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .reviewTitle {
          color: #172018;
          font-size: 15px;
          font-weight: 950;
          line-height: 1.3;
        }

        .reviewMeta {
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
          margin-top: 4px;
        }

        .reviewStars {
          color: #16a34a;
          font-size: 14px;
          white-space: nowrap;
          letter-spacing: 1px;
        }

        .reviewComment {
          color: #475569;
          font-size: 13px;
          line-height: 1.55;
          font-weight: 700;
          background: #f6f7f1;
          border-radius: 18px;
          padding: 12px;
          margin-top: 12px;
        }

        .pillGrid {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 6px 9px;
          background: #eef2e5;
          color: #475569;
          font-size: 11px;
          font-weight: 900;
        }

        .routeList {
          display: grid;
          gap: 12px;
        }

        .routeCard {
          display: grid;
          grid-template-columns: 74px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          background: #fffdf7;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 24px;
          padding: 12px;
        }

        .routeThumb {
          width: 74px;
          height: 74px;
          border-radius: 22px;
          background:
            radial-gradient(circle at top right, rgba(251, 146, 60, 0.20), transparent 38%),
            linear-gradient(135deg, #dbe7c8, #aebf8d);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-size: 12px;
          font-weight: 950;
          overflow: hidden;
        }

        .routeThumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .routeTitle {
          color: #172018;
          font-size: 14px;
          font-weight: 950;
          line-height: 1.28;
        }

        .routeMeta {
          color: #64748b;
          font-size: 11px;
          font-weight: 750;
          line-height: 1.4;
          margin-top: 4px;
        }

        .routeStats {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .smallBadge {
          border-radius: 999px;
          padding: 5px 8px;
          background: #f0fdf4;
          color: #166534;
          font-size: 10px;
          font-weight: 950;
        }

        .empty {
          padding: 26px;
          text-align: center;
          color: #64748b;
          font-size: 13px;
          background: #fffdf7;
          border-radius: 24px;
          border: 1px dashed #cbd5e1;
          font-weight: 700;
        }

        @media (max-width: 1120px) {
          .statsGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 1040px) {
          .heroContent,
          .mainGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .header {
            padding: 9px 12px;
          }

          .brandTitle,
          .brandSub {
            display: none;
          }

          .headerActions .hideMobile {
            display: none;
          }

          .container {
            padding: 16px 12px 42px;
          }

          .hero,
          .panel {
            border-radius: 28px;
          }

          .hero {
            padding: 22px;
            min-height: auto;
          }

          .heroContent {
            min-height: auto;
          }

          .statsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .reviewTop {
            display: grid;
          }
        }

        @media (max-width: 480px) {
          .heroTitle {
            font-size: 40px;
          }

          .brand img {
            height: 38px;
          }

          .statsGrid {
            grid-template-columns: 1fr;
          }

          .routeCard {
            grid-template-columns: 1fr;
          }

          .routeThumb {
            width: 100%;
            height: 150px;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <div
            className="brand"
            onClick={() => router.push('/guia/dashboard')}
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />

            <div>
              <div className="brandTitle">PrussikTrails</div>
              <div className="brandSub">Avaliações do guia</div>
            </div>
          </div>

          <div className="headerActions">
            <button
              type="button"
              className="iconBtn hideMobile"
              onClick={() => router.push('/guia/dashboard')}
            >
              Dashboard
            </button>

            <button
              type="button"
              className="iconBtn hideMobile"
              onClick={() => router.push('/guia/roteiros')}
            >
              Roteiros
            </button>

            <button
              type="button"
              className="iconBtn"
              onClick={atualizar}
              disabled={atualizando}
            >
              {atualizando ? '…' : '↻'}
            </button>

            <button
              type="button"
              className="iconBtn primary"
              onClick={() => router.push('/guia/perfil')}
            >
              Perfil
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroContent">
            <div>
              <div className="eyebrow">Reputação do guia</div>

              <h1 className="heroTitle">
                {primeiroNome(nomeUsuario(user))}, suas avaliações mostram a <span>confiança construída.</span>
              </h1>

              <p className="heroText">
                Acompanhe nota média, segurança percebida, clareza das orientações, experiência geral e comentários dos clientes.
                {ultimaAtualizacao && (
                  <>
                    <br />
                    Atualizado às {ultimaAtualizacao}.
                  </>
                )}
              </p>
            </div>

            <aside className="heroCard">
              <div className="heroCardLabel">Nota média</div>
              <div className="heroCardValue">{formatarNota(resumo.mediaNota)}</div>
              <div className="heroStars">{estrelas(resumo.mediaNota)}</div>
              <div className="heroCardText">
                {textoMedia(resumo.mediaNota)} · {resumo.total} avaliação(ões)
              </div>
            </aside>
          </div>
        </section>

        {mensagem && (
          <div className="alert success">{mensagem}</div>
        )}

        {erro && (
          <div className="alert error">{erro}</div>
        )}

        <section className="statsGrid">
          <article className="statCard">
            <div className="statValue">{resumo.total}</div>
            <div className="statLabel">avaliações recebidas</div>
          </article>

          <article className="statCard">
            <div className="statValue">{formatarPercentual(resumo.percentualRecomendacao)}</div>
            <div className="statLabel">recomendariam você</div>
          </article>

          <article className="statCard">
            <div className="statValue">{formatarPercentual(resumo.segurancaAltaPercentual)}</div>
            <div className="statLabel">sentiram muita segurança</div>
          </article>

          <article className="statCard">
            <div className="statValue">{formatarPercentual(resumo.orientacoesClarasPercentual)}</div>
            <div className="statLabel">viram orientações claras</div>
          </article>

          <article className="statCard">
            <div className="statValue">{formatarPercentual(resumo.experienciaSuperouPercentual)}</div>
            <div className="statLabel">experiência superou expectativas</div>
          </article>
        </section>

        <section className="mainGrid">
          <div>
            <section className="panel">
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Distribuição das notas</h2>
                  <div className="panelSub">
                    Entenda como os clientes estão classificando sua condução.
                  </div>
                </div>
              </div>

              <div className="panelBody">
                {dados.distribuicao.notas.length === 0
                  ? renderEmpty('Ainda não há notas para exibir.')
                  : (
                    <div className="bars">
                      {dados.distribuicao.notas.map(renderBarra)}
                    </div>
                  )}
              </div>
            </section>

            <section className="panel" style={{ marginTop: 16 }}>
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Comentários e avaliações</h2>
                  <div className="panelSub">
                    Veja o que os clientes registraram após as experiências.
                  </div>
                </div>

                <div className="tabs">
                  <button
                    type="button"
                    className={`tab ${filtroComentarios === 'todos' ? 'active' : ''}`}
                    onClick={() => setFiltroComentarios('todos')}
                  >
                    Todas
                  </button>

                  <button
                    type="button"
                    className={`tab ${filtroComentarios === 'comentarios' ? 'active' : ''}`}
                    onClick={() => setFiltroComentarios('comentarios')}
                  >
                    Com comentário
                  </button>

                  <button
                    type="button"
                    className={`tab ${filtroComentarios === 'baixas' ? 'active' : ''}`}
                    onClick={() => setFiltroComentarios('baixas')}
                  >
                    Atenção
                  </button>
                </div>
              </div>

              <div className="panelBody">
                {comentariosFiltrados.length === 0
                  ? renderEmpty('Nenhuma avaliação encontrada neste filtro.')
                  : (
                    <div className="reviewsList">
                      {comentariosFiltrados.slice(0, 18).map((avaliacao) => (
                        <article className="reviewCard" key={avaliacao.id}>
                          <div className="reviewTop">
                            <div>
                              <div className="reviewTitle">
                                {avaliacao.roteiro_titulo || 'Roteiro'}
                              </div>

                              <div className="reviewMeta">
                                Cliente: {avaliacao.cliente_nome || 'Cliente'} · {formatarData(avaliacao.created_at)}
                              </div>
                            </div>

                            <div className="reviewStars">
                              {estrelas(avaliacao.nota)} {formatarNota(avaliacao.nota)}
                            </div>
                          </div>

                          {avaliacao.comentario && (
                            <div className="reviewComment">
                              “{avaliacao.comentario}”
                            </div>
                          )}

                          <div className="pillGrid">
                            {avaliacao.orientacoes_label && (
                              <span className="pill">{avaliacao.orientacoes_label}</span>
                            )}

                            {avaliacao.seguranca_label && (
                              <span className="pill">{avaliacao.seguranca_label}</span>
                            )}

                            {avaliacao.experiencia_label && (
                              <span className="pill">{avaliacao.experiencia_label}</span>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
              </div>
            </section>
          </div>

          <div>
            <section className="panel">
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Indicadores de condução</h2>
                  <div className="panelSub">
                    Segurança, orientação e experiência geral.
                  </div>
                </div>
              </div>

              <div className="panelBody">
                <div className="bars">
                  <div>
                    <h3 className="panelTitle" style={{ fontSize: 15, marginBottom: 10 }}>
                      Orientações
                    </h3>
                    {dados.distribuicao.orientacoes.length === 0
                      ? renderEmpty('Sem dados de orientação.')
                      : dados.distribuicao.orientacoes.map(renderBarra)}
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <h3 className="panelTitle" style={{ fontSize: 15, marginBottom: 10 }}>
                      Segurança
                    </h3>
                    {dados.distribuicao.seguranca.length === 0
                      ? renderEmpty('Sem dados de segurança.')
                      : dados.distribuicao.seguranca.map(renderBarra)}
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <h3 className="panelTitle" style={{ fontSize: 15, marginBottom: 10 }}>
                      Experiência geral
                    </h3>
                    {dados.distribuicao.experiencia.length === 0
                      ? renderEmpty('Sem dados de experiência.')
                      : dados.distribuicao.experiencia.map(renderBarra)}
                  </div>
                </div>
              </div>
            </section>

            <section className="panel" style={{ marginTop: 16 }}>
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Roteiros mais avaliados</h2>
                  <div className="panelSub">
                    Média e percepção por experiência.
                  </div>
                </div>
              </div>

              <div className="panelBody">
                {topRoteiros.length === 0
                  ? renderEmpty('Ainda não há roteiros avaliados.')
                  : (
                    <div className="routeList">
                      {topRoteiros.map((roteiro) => (
                        <article className="routeCard" key={roteiro.roteiro_id}>
                          <div className="routeThumb">
                            {roteiro.roteiro_imagem ? (
                              <img
                                src={roteiro.roteiro_imagem}
                                alt={roteiro.roteiro_titulo}
                              />
                            ) : (
                              'RT'
                            )}
                          </div>

                          <div>
                            <div className="routeTitle">
                              {roteiro.roteiro_titulo}
                            </div>

                            <div className="routeMeta">
                              {roteiro.roteiro_local || 'Local a confirmar'}
                              <br />
                              {roteiro.total} avaliação(ões) · média {formatarNota(roteiro.mediaNota)}
                            </div>

                            <div className="routeStats">
                              <span className="smallBadge">
                                {formatarPercentual(roteiro.segurancaAltaPercentual)} segurança
                              </span>

                              <span className="smallBadge">
                                {formatarPercentual(roteiro.percentualRecomendacao)} recomendação
                              </span>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}