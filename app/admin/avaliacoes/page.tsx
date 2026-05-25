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

type GuiaResumo = {
  guia_id: string
  guia_nome: string
  total: number
  mediaNota: number
  percentualRecomendacao: number
  orientacoesClarasPercentual: number
  segurancaAltaPercentual: number
  experienciaSuperouPercentual: number
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
  porGuia: GuiaResumo[]
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
  porGuia: [],
  porRoteiro: []
}

export default function AdminAvaliacoesPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [dados, setDados] = useState<EstatisticasResponse>(dadosIniciais)
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [moderandoId, setModerandoId] = useState('')
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<'publicada' | 'pendente_moderacao' | 'todos'>('publicada')
  const [busca, setBusca] = useState('')
  const [visao, setVisao] = useState<'avaliacoes' | 'guias' | 'roteiros'>('avaliacoes')
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

      if (parsedUser.tipo !== 'admin') {
        router.replace('/login')
        return
      }

      setUser(parsedUser)
      await carregarAvaliacoes(statusFiltro, true)
    } catch (error) {
      console.error('Erro ao iniciar avaliações admin:', error)
      setErro('Não foi possível carregar as avaliações agora.')
    } finally {
      setCarregando(false)
    }
  }

  const normalizar = (valor?: string | null) => {
    return String(valor || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }

  const formatarData = (valor?: string | null) => {
    if (!valor) return '-'

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return valor

    return data.toLocaleDateString('pt-BR')
  }

  const formatarNota = (valor: any) => {
    return Number(valor || 0).toFixed(2).replace('.', ',')
  }

  const formatarPercentual = (valor: any) => {
    return `${Number(valor || 0).toFixed(1).replace('.', ',')}%`
  }

  const estrelas = (nota: number) => {
    const inteira = Math.round(Number(nota || 0))

    return '★★★★★'
      .split('')
      .map((_, index) => (index < inteira ? '★' : '☆'))
      .join('')
  }

  const labelStatus = (status?: string | null) => {
    const valor = normalizar(status)

    if (valor === 'publicada') return 'Publicada'
    if (valor === 'pendente_moderacao') return 'Pendente de moderação'
    if (valor === 'oculta') return 'Oculta'
    if (valor === 'removida') return 'Removida'

    return status || 'Sem status'
  }

  const classeStatus = (status?: string | null) => {
    const valor = normalizar(status)

    if (valor === 'publicada') return 'green'
    if (valor === 'pendente_moderacao') return 'yellow'
    if (valor === 'oculta') return 'neutral'
    if (valor === 'removida') return 'red'

    return 'neutral'
  }

  const carregarAvaliacoes = async (
    statusAtual: 'publicada' | 'pendente_moderacao' | 'todos',
    silencioso = false
  ) => {
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
          todos: true,
          status: statusAtual,
          limite: 1000,
          limiteComentarios: 50
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
        porGuia: data?.porGuia || [],
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
    await carregarAvaliacoes(statusFiltro, false)
  }

  const alterarStatus = async (status: 'publicada' | 'pendente_moderacao' | 'todos') => {
    setStatusFiltro(status)
    await carregarAvaliacoes(status, false)
  }

  const moderarAvaliacao = async (
    avaliacao: AvaliacaoEnriquecida,
    novoStatus: 'publicada' | 'pendente_moderacao' | 'oculta' | 'removida'
  ) => {
    if (!user?.id) {
      router.replace('/login')
      return
    }

    if (!avaliacao?.id) return

    let motivo = ''

    if (novoStatus === 'removida') {
      const confirmar = window.confirm(
        'Deseja realmente remover esta avaliação? Ela deixará de aparecer nas listagens públicas.'
      )

      if (!confirmar) return
    }

    if (novoStatus !== 'publicada') {
      motivo =
        window.prompt(
          novoStatus === 'pendente_moderacao'
            ? 'Motivo para enviar esta avaliação para moderação:'
            : novoStatus === 'oculta'
              ? 'Motivo para ocultar esta avaliação:'
              : 'Motivo para remover esta avaliação:'
        ) || ''
    }

    setModerandoId(avaliacao.id)
    setErro('')
    setMensagem('')

    try {
      const response = await fetch('/api/avaliacoes/moderar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          adminId: user.id,
          avaliacaoId: avaliacao.id,
          status: novoStatus,
          motivo
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.erro || 'Não foi possível moderar esta avaliação.')
      }

      setMensagem(`Avaliação atualizada para: ${labelStatus(novoStatus)}.`)

      await carregarAvaliacoes(statusFiltro, true)
    } catch (error: any) {
      console.error('Erro ao moderar avaliação:', error)
      setErro(error?.message || 'Erro ao moderar avaliação.')
    } finally {
      setModerandoId('')
    }
  }

  const avaliacoesFiltradas = useMemo(() => {
    const termo = normalizar(busca)

    if (!termo) return dados.avaliacoes || []

    return (dados.avaliacoes || []).filter((avaliacao) => {
      const texto = normalizar(
        [
          avaliacao.roteiro_titulo,
          avaliacao.roteiro_local,
          avaliacao.guia_nome,
          avaliacao.cliente_nome,
          avaliacao.comentario,
          avaliacao.orientacoes_label,
          avaliacao.seguranca_label,
          avaliacao.experiencia_label,
          avaliacao.status
        ].join(' ')
      )

      return texto.includes(termo)
    })
  }, [dados.avaliacoes, busca])

  const guiasFiltrados = useMemo(() => {
    const termo = normalizar(busca)

    if (!termo) return dados.porGuia || []

    return (dados.porGuia || []).filter((guia) => {
      return normalizar(guia.guia_nome).includes(termo)
    })
  }, [dados.porGuia, busca])

  const roteirosFiltrados = useMemo(() => {
    const termo = normalizar(busca)

    if (!termo) return dados.porRoteiro || []

    return (dados.porRoteiro || []).filter((roteiro) => {
      return normalizar(
        [roteiro.roteiro_titulo, roteiro.roteiro_local].join(' ')
      ).includes(termo)
    })
  }, [dados.porRoteiro, busca])

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
            style={{
              width: `${Math.max(0, Math.min(100, Number(item.percentual || 0)))}%`
            }}
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

  const resumo = dados.resumo || resumoInicial

  if (carregando || !user) {
    return (
      <main className="loading">
        <style>{`
          * { box-sizing: border-box; }

          body {
            margin: 0;
            font-family:
              Inter,
              ui-sans-serif,
              system-ui,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
            background: #0f172a;
          }

          .loading {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #e5e7eb;
            background:
              radial-gradient(circle at top left, rgba(34, 197, 94, 0.16), transparent 30%),
              linear-gradient(135deg, #020617, #0f172a);
          }

          .loadingCard {
            background: rgba(15, 23, 42, 0.92);
            border: 1px solid rgba(148, 163, 184, 0.18);
            border-radius: 26px;
            padding: 28px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.35);
          }

          .loadingCard img {
            height: 58px;
            width: auto;
            margin-bottom: 12px;
          }
        `}</style>

        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>Carregando avaliações da plataforma...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          background: #f8fafc;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 0% 0%, rgba(34, 197, 94, 0.10), transparent 30%),
            radial-gradient(circle at 100% 0%, rgba(59, 130, 246, 0.10), transparent 30%),
            linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
          color: #0f172a;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(248, 250, 252, 0.88);
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(18px);
          padding: 12px 18px;
        }

        .headerInner {
          max-width: 1240px;
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
          height: 40px;
          width: auto;
          display: block;
        }

        .brandTitle {
          font-size: 17px;
          font-weight: 950;
          color: #0f172a;
          letter-spacing: -0.045em;
          line-height: 1;
        }

        .brandSub {
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          margin-top: 3px;
        }

        .headerActions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .iconBtn {
          min-height: 38px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: rgba(255, 255, 255, 0.78);
          color: #0f172a;
          border-radius: 999px;
          padding: 9px 13px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          transition: 0.2s ease;
          white-space: nowrap;
        }

        .iconBtn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.10);
        }

        .iconBtn.primary {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        .iconBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 24px 18px 52px;
        }

        .hero {
          background:
            radial-gradient(circle at top right, rgba(34, 197, 94, 0.18), transparent 30%),
            linear-gradient(135deg, #0f172a, #1e293b);
          color: #ffffff;
          border-radius: 34px;
          padding: 28px;
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
          margin-bottom: 18px;
          overflow: hidden;
          position: relative;
        }

        .hero::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: linear-gradient(to bottom, black, transparent);
          pointer-events: none;
        }

        .heroInner {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
          gap: 22px;
          align-items: end;
        }

        .eyebrow {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          padding: 8px 12px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.08);
          color: #bbf7d0;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .heroTitle {
          margin: 0;
          font-size: clamp(38px, 5.5vw, 68px);
          line-height: 0.94;
          font-weight: 950;
          letter-spacing: -0.08em;
        }

        .heroTitle span {
          color: #86efac;
        }

        .heroText {
          max-width: 720px;
          color: rgba(255,255,255,0.76);
          font-size: 14px;
          line-height: 1.6;
          font-weight: 650;
          margin: 16px 0 0;
        }

        .heroCard {
          border-radius: 28px;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.16);
          padding: 20px;
          backdrop-filter: blur(14px);
        }

        .heroLabel {
          color: rgba(255,255,255,0.66);
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.10em;
        }

        .heroValue {
          margin-top: 8px;
          color: #ffffff;
          font-size: 42px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.07em;
        }

        .heroStars {
          color: #86efac;
          font-size: 18px;
          letter-spacing: 1px;
          margin-top: 8px;
        }

        .heroSmall {
          color: rgba(255,255,255,0.70);
          font-size: 12px;
          font-weight: 750;
          line-height: 1.45;
          margin-top: 8px;
        }

        .alert {
          border-radius: 18px;
          padding: 13px 15px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 800;
        }

        .alert.success {
          background: #ecfdf5;
          border: 1px solid #bbf7d0;
          color: #166534;
        }

        .alert.error {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .statCard {
          background: rgba(255,255,255,0.88);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 24px;
          padding: 15px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
        }

        .statValue {
          font-size: 28px;
          font-weight: 950;
          line-height: 1;
          letter-spacing: -0.06em;
          color: #0f172a;
        }

        .statLabel {
          color: #64748b;
          font-size: 12px;
          font-weight: 850;
          line-height: 1.35;
          margin-top: 7px;
        }

        .toolbar {
          background: rgba(255,255,255,0.90);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 26px;
          padding: 14px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          gap: 10px;
          align-items: center;
          margin-bottom: 18px;
        }

        .input,
        .select {
          width: 100%;
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: #ffffff;
          color: #0f172a;
          border-radius: 999px;
          padding: 12px 14px;
          font-size: 13px;
          font-weight: 800;
          outline: none;
        }

        .input:focus,
        .select:focus {
          border-color: #22c55e;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.10);
        }

        .tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tab {
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: #ffffff;
          color: #475569;
          border-radius: 999px;
          padding: 10px 13px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
        }

        .tab.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        .mainGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(340px, 0.85fr);
          gap: 18px;
          align-items: start;
        }

        .panel {
          background: rgba(255,255,255,0.92);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 28px;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.07);
          overflow: hidden;
        }

        .panelHeader {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .panelTitle {
          margin: 0;
          color: #0f172a;
          font-size: 19px;
          line-height: 1.15;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .panelSub {
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
          margin-top: 4px;
        }

        .panelBody {
          padding: 16px;
        }

        .bars {
          display: grid;
          gap: 12px;
        }

        .barItem {
          background: #f8fafc;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 18px;
          padding: 12px;
        }

        .barTop {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          color: #475569;
          font-size: 12px;
          font-weight: 850;
          margin-bottom: 8px;
        }

        .barTop strong {
          color: #0f172a;
          white-space: nowrap;
        }

        .barTrack {
          height: 10px;
          border-radius: 999px;
          background: #e2e8f0;
          overflow: hidden;
        }

        .barFill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #16a34a, #22c55e);
        }

        .reviewList,
        .rankList {
          display: grid;
          gap: 12px;
        }

        .reviewCard,
        .rankCard {
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 22px;
          padding: 14px;
        }

        .reviewTop,
        .rankTop {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .reviewTitle,
        .rankTitle {
          color: #0f172a;
          font-size: 14px;
          font-weight: 950;
          line-height: 1.32;
        }

        .reviewMeta,
        .rankMeta {
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
          margin-top: 4px;
        }

        .stars {
          color: #16a34a;
          white-space: nowrap;
          font-size: 14px;
          letter-spacing: 1px;
          font-weight: 900;
        }

        .comment {
          background: #f8fafc;
          border-radius: 16px;
          padding: 11px 12px;
          color: #475569;
          font-size: 12px;
          line-height: 1.55;
          font-weight: 700;
          margin-top: 11px;
        }

        .pillGrid {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          margin-top: 11px;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 6px 9px;
          background: #f1f5f9;
          color: #475569;
          font-size: 11px;
          font-weight: 900;
        }

        .pill.green {
          background: #dcfce7;
          color: #166534;
        }

        .pill.yellow {
          background: #fef3c7;
          color: #92400e;
        }

        .pill.neutral {
          background: #f1f5f9;
          color: #475569;
        }

        .pill.red {
          background: #fee2e2;
          color: #991b1b;
        }

        .moderationActions {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(15, 23, 42, 0.06);
        }

        .modBtn {
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: #ffffff;
          color: #0f172a;
          border-radius: 999px;
          padding: 8px 10px;
          font-size: 11px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .modBtn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.10);
        }

        .modBtn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .modBtn.publish {
          background: #dcfce7;
          color: #166534;
          border-color: #bbf7d0;
        }

        .modBtn.pending {
          background: #fef3c7;
          color: #92400e;
          border-color: #fde68a;
        }

        .modBtn.hide {
          background: #f1f5f9;
          color: #475569;
          border-color: #e2e8f0;
        }

        .modBtn.remove {
          background: #fee2e2;
          color: #991b1b;
          border-color: #fecaca;
        }

        .rankCard {
          display: grid;
          grid-template-columns: 64px minmax(0, 1fr);
          align-items: center;
          gap: 12px;
        }

        .rankThumb {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-size: 12px;
          font-weight: 950;
          overflow: hidden;
        }

        .rankThumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .rankBadges {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .smallBadge {
          background: #ecfdf5;
          color: #166534;
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 10px;
          font-weight: 950;
        }

        .empty {
          padding: 26px;
          text-align: center;
          color: #64748b;
          background: #ffffff;
          border: 1px dashed #cbd5e1;
          border-radius: 22px;
          font-size: 13px;
          font-weight: 750;
        }

        @media (max-width: 1180px) {
          .statsGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .toolbar {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 1040px) {
          .heroInner,
          .mainGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .header {
            padding: 10px 12px;
          }

          .brandTitle,
          .brandSub {
            display: none;
          }

          .container {
            padding: 16px 12px 42px;
          }

          .hero,
          .panel {
            border-radius: 24px;
          }

          .hero {
            padding: 22px;
          }

          .statsGrid {
            grid-template-columns: 1fr 1fr;
          }

          .reviewTop,
          .rankTop {
            display: grid;
          }

          .headerActions {
            gap: 6px;
          }

          .headerActions .iconBtn {
            padding: 8px 10px;
            font-size: 11px;
          }
        }

        @media (max-width: 480px) {
          .heroTitle {
            font-size: 38px;
          }

          .statsGrid {
            grid-template-columns: 1fr;
          }

          .rankCard {
            grid-template-columns: 1fr;
          }

          .rankThumb {
            width: 100%;
            height: 150px;
          }

          .moderationActions {
            display: grid;
          }

          .modBtn {
            width: 100%;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <div
            className="brand"
            onClick={() => router.push('/admin/dashboard')}
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />

            <div>
              <div className="brandTitle">PrussikTrails Admin</div>
              <div className="brandSub">Avaliações da plataforma</div>
            </div>
          </div>

          <div className="headerActions">
            <button
              type="button"
              className="iconBtn"
              onClick={() => router.push('/admin/dashboard')}
            >
              Dashboard
            </button>

            <button
              type="button"
              className="iconBtn"
              onClick={() => router.push('/admin/roteiros')}
            >
              Roteiros
            </button>

            <button
              type="button"
              className="iconBtn"
              onClick={() => router.push('/admin/financeiro')}
            >
              Financeiro
            </button>

            <button
              type="button"
              className="iconBtn primary"
              onClick={atualizar}
              disabled={atualizando || !!moderandoId}
            >
              {atualizando ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroInner">
            <div>
              <div className="eyebrow">Controle de qualidade</div>

              <h1 className="heroTitle">
                Avaliações mostram onde a plataforma entrega <span>confiança.</span>
              </h1>

              <p className="heroText">
                Acompanhe reputação dos guias, qualidade das experiências, percepção de segurança,
                clareza das orientações e comentários dos clientes.
                {ultimaAtualizacao && (
                  <>
                    <br />
                    Atualizado às {ultimaAtualizacao}.
                  </>
                )}
              </p>
            </div>

            <aside className="heroCard">
              <div className="heroLabel">Média geral</div>
              <div className="heroValue">{formatarNota(resumo.mediaNota)}</div>
              <div className="heroStars">{estrelas(resumo.mediaNota)}</div>
              <div className="heroSmall">
                {resumo.total} avaliação(ões) registradas.
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
            <div className="statLabel">avaliações totais</div>
          </article>

          <article className="statCard">
            <div className="statValue">{formatarPercentual(resumo.percentualRecomendacao)}</div>
            <div className="statLabel">clientes recomendariam</div>
          </article>

          <article className="statCard">
            <div className="statValue">{formatarPercentual(resumo.segurancaAltaPercentual)}</div>
            <div className="statLabel">percepção alta de segurança</div>
          </article>

          <article className="statCard">
            <div className="statValue">{formatarPercentual(resumo.orientacoesClarasPercentual)}</div>
            <div className="statLabel">orientações claras</div>
          </article>

          <article className="statCard">
            <div className="statValue">{formatarPercentual(resumo.experienciaSuperouPercentual)}</div>
            <div className="statLabel">superou expectativas</div>
          </article>

          <article className="statCard">
            <div className="statValue">{resumo.notasBaixas}</div>
            <div className="statLabel">avaliações de atenção</div>
          </article>
        </section>

        <section className="toolbar">
          <input
            className="input"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por guia, cliente, roteiro, local, comentário ou status..."
          />

          <select
            className="select"
            value={statusFiltro}
            onChange={(event) => alterarStatus(event.target.value as any)}
          >
            <option value="publicada">Publicadas</option>
            <option value="pendente_moderacao">Pendentes de moderação</option>
            <option value="todos">Publicadas + pendentes</option>
          </select>

          <div className="tabs">
            <button
              type="button"
              className={`tab ${visao === 'avaliacoes' ? 'active' : ''}`}
              onClick={() => setVisao('avaliacoes')}
            >
              Avaliações
            </button>

            <button
              type="button"
              className={`tab ${visao === 'guias' ? 'active' : ''}`}
              onClick={() => setVisao('guias')}
            >
              Guias
            </button>

            <button
              type="button"
              className={`tab ${visao === 'roteiros' ? 'active' : ''}`}
              onClick={() => setVisao('roteiros')}
            >
              Roteiros
            </button>
          </div>
        </section>

        <section className="mainGrid">
          <div>
            {visao === 'avaliacoes' && (
              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <h2 className="panelTitle">Avaliações recentes</h2>
                    <div className="panelSub">
                      Comentários, notas, respostas objetivas e ações de moderação.
                    </div>
                  </div>
                </div>

                <div className="panelBody">
                  {avaliacoesFiltradas.length === 0
                    ? renderEmpty('Nenhuma avaliação encontrada.')
                    : (
                      <div className="reviewList">
                        {avaliacoesFiltradas.slice(0, 80).map((avaliacao) => {
                          const statusAtual = normalizar(avaliacao.status)
                          const bloqueado = moderandoId === avaliacao.id

                          return (
                            <article className="reviewCard" key={avaliacao.id}>
                              <div className="reviewTop">
                                <div>
                                  <div className="reviewTitle">
                                    {avaliacao.roteiro_titulo || 'Roteiro'}
                                  </div>

                                  <div className="reviewMeta">
                                    Guia: {avaliacao.guia_nome || 'Guia'} · Cliente: {avaliacao.cliente_nome || 'Cliente'}
                                    <br />
                                    {avaliacao.roteiro_local || 'Local a confirmar'} · {formatarData(avaliacao.created_at)}
                                  </div>
                                </div>

                                <div className="stars">
                                  {estrelas(avaliacao.nota)} {formatarNota(avaliacao.nota)}
                                </div>
                              </div>

                              {avaliacao.comentario && (
                                <div className="comment">
                                  “{avaliacao.comentario}”
                                </div>
                              )}

                              <div className="pillGrid">
                                <span className={`pill ${classeStatus(avaliacao.status)}`}>
                                  {labelStatus(avaliacao.status)}
                                </span>

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

                              <div className="moderationActions">
                                {statusAtual !== 'publicada' && (
                                  <button
                                    type="button"
                                    className="modBtn publish"
                                    onClick={() => moderarAvaliacao(avaliacao, 'publicada')}
                                    disabled={bloqueado || !!moderandoId}
                                  >
                                    Publicar
                                  </button>
                                )}

                                {statusAtual !== 'pendente_moderacao' && (
                                  <button
                                    type="button"
                                    className="modBtn pending"
                                    onClick={() => moderarAvaliacao(avaliacao, 'pendente_moderacao')}
                                    disabled={bloqueado || !!moderandoId}
                                  >
                                    Enviar para moderação
                                  </button>
                                )}

                                {statusAtual !== 'oculta' && (
                                  <button
                                    type="button"
                                    className="modBtn hide"
                                    onClick={() => moderarAvaliacao(avaliacao, 'oculta')}
                                    disabled={bloqueado || !!moderandoId}
                                  >
                                    Ocultar
                                  </button>
                                )}

                                {statusAtual !== 'removida' && (
                                  <button
                                    type="button"
                                    className="modBtn remove"
                                    onClick={() => moderarAvaliacao(avaliacao, 'removida')}
                                    disabled={bloqueado || !!moderandoId}
                                  >
                                    Remover
                                  </button>
                                )}
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    )}
                </div>
              </section>
            )}

            {visao === 'guias' && (
              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <h2 className="panelTitle">Ranking de guias</h2>
                    <div className="panelSub">
                      Média, recomendação e percepção de segurança por guia.
                    </div>
                  </div>
                </div>

                <div className="panelBody">
                  {guiasFiltrados.length === 0
                    ? renderEmpty('Nenhum guia com avaliação encontrada.')
                    : (
                      <div className="rankList">
                        {guiasFiltrados.map((guia) => (
                          <article className="rankCard" key={guia.guia_id}>
                            <div className="rankThumb">GUIA</div>

                            <div>
                              <div className="rankTop">
                                <div>
                                  <div className="rankTitle">{guia.guia_nome}</div>
                                  <div className="rankMeta">
                                    {guia.total} avaliação(ões) · média {formatarNota(guia.mediaNota)}
                                  </div>
                                </div>

                                <div className="stars">
                                  {estrelas(guia.mediaNota)}
                                </div>
                              </div>

                              <div className="rankBadges">
                                <span className="smallBadge">
                                  {formatarPercentual(guia.segurancaAltaPercentual)} segurança
                                </span>

                                <span className="smallBadge">
                                  {formatarPercentual(guia.percentualRecomendacao)} recomendação
                                </span>

                                <span className="smallBadge">
                                  {formatarPercentual(guia.orientacoesClarasPercentual)} orientação
                                </span>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                </div>
              </section>
            )}

            {visao === 'roteiros' && (
              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <h2 className="panelTitle">Roteiros avaliados</h2>
                    <div className="panelSub">
                      Qualidade percebida por experiência.
                    </div>
                  </div>
                </div>

                <div className="panelBody">
                  {roteirosFiltrados.length === 0
                    ? renderEmpty('Nenhum roteiro avaliado encontrado.')
                    : (
                      <div className="rankList">
                        {roteirosFiltrados.map((roteiro) => (
                          <article className="rankCard" key={roteiro.roteiro_id}>
                            <div className="rankThumb">
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
                              <div className="rankTop">
                                <div>
                                  <div className="rankTitle">{roteiro.roteiro_titulo}</div>
                                  <div className="rankMeta">
                                    {roteiro.roteiro_local || 'Local a confirmar'}
                                    <br />
                                    {roteiro.total} avaliação(ões) · média {formatarNota(roteiro.mediaNota)}
                                  </div>
                                </div>

                                <div className="stars">
                                  {estrelas(roteiro.mediaNota)}
                                </div>
                              </div>

                              <div className="rankBadges">
                                <span className="smallBadge">
                                  {formatarPercentual(roteiro.segurancaAltaPercentual)} segurança
                                </span>

                                <span className="smallBadge">
                                  {formatarPercentual(roteiro.percentualRecomendacao)} recomendação
                                </span>

                                <span className="smallBadge">
                                  {formatarPercentual(roteiro.experienciaSuperouPercentual)} superou
                                </span>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                </div>
              </section>
            )}
          </div>

          <aside>
            <section className="panel">
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Distribuição de notas</h2>
                  <div className="panelSub">
                    Concentração das avaliações por estrelas.
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

            <section className="panel" style={{ marginTop: 18 }}>
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Segurança</h2>
                  <div className="panelSub">
                    Percepção dos clientes sobre condução segura.
                  </div>
                </div>
              </div>

              <div className="panelBody">
                {dados.distribuicao.seguranca.length === 0
                  ? renderEmpty('Sem dados de segurança.')
                  : (
                    <div className="bars">
                      {dados.distribuicao.seguranca.map(renderBarra)}
                    </div>
                  )}
              </div>
            </section>

            <section className="panel" style={{ marginTop: 18 }}>
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Orientações</h2>
                  <div className="panelSub">
                    Clareza das informações antes e durante o roteiro.
                  </div>
                </div>
              </div>

              <div className="panelBody">
                {dados.distribuicao.orientacoes.length === 0
                  ? renderEmpty('Sem dados de orientação.')
                  : (
                    <div className="bars">
                      {dados.distribuicao.orientacoes.map(renderBarra)}
                    </div>
                  )}
              </div>
            </section>

            <section className="panel" style={{ marginTop: 18 }}>
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Experiência geral</h2>
                  <div className="panelSub">
                    Satisfação percebida com a experiência.
                  </div>
                </div>
              </div>

              <div className="panelBody">
                {dados.distribuicao.experiencia.length === 0
                  ? renderEmpty('Sem dados de experiência.')
                  : (
                    <div className="bars">
                      {dados.distribuicao.experiencia.map(renderBarra)}
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