'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type UsuarioLocal = {
  id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  guia_id?: string | null
  uid?: string | null
  sub?: string | null
  auth_user_id?: string | null
  supabase_user_id?: string | null
  nome?: string | null
  name?: string | null
  email?: string | null
  tipo?: string | null
  tipo_usuario?: string | null
  role?: string | null
  perfil?: string | null
  user?: any
  usuario?: any
  profile?: any
  data?: any
  session?: any
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
  cliente_avatar?: string | null
  nota: number
  orientacoes?: string | null
  orientacoes_label?: string | null
  seguranca?: string | null
  seguranca_label?: string | null
  experiencia?: string | null
  experiencia_label?: string | null
  comentario?: string | null
  observacao?: string | null
  descricao?: string | null
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
  experienciaSuperouPercentual: 0,
}

const dadosIniciais: EstatisticasResponse = {
  sucesso: true,
  resumo: resumoInicial,
  distribuicao: {
    notas: [],
    orientacoes: [],
    seguranca: [],
    experiencia: [],
  },
  comentariosRecentes: [],
  avaliacoes: [],
  porRoteiro: [],
}

function extrairGuiaId(usuario: any) {
  return String(
    usuario?.id ||
      usuario?.user_id ||
      usuario?.usuario_id ||
      usuario?.guia_id ||
      usuario?.uid ||
      usuario?.sub ||
      usuario?.auth_user_id ||
      usuario?.supabase_user_id ||
      ''
  ).trim()
}

function extrairEmail(usuario: any) {
  return String(
    usuario?.email ||
      usuario?.user?.email ||
      usuario?.usuario?.email ||
      usuario?.profile?.email ||
      usuario?.data?.user?.email ||
      usuario?.session?.user?.email ||
      ''
  ).trim()
}

function extrairTipoUsuario(usuario: any) {
  return normalizar(
    usuario?.tipo ||
      usuario?.tipo_usuario ||
      usuario?.role ||
      usuario?.perfil ||
      usuario?.user?.tipo ||
      usuario?.usuario?.tipo ||
      usuario?.profile?.tipo ||
      ''
  )
}

function montarCandidatosUsuario(parsed: any) {
  return [
    parsed,
    parsed?.user,
    parsed?.usuario,
    parsed?.profile,
    parsed?.data?.user,
    parsed?.session?.user,
    parsed?.auth?.user,
  ].filter(Boolean)
}

async function resolverGuiaLocalStorage() {
  const chaves = ['user', 'usuario', 'prussik_user', 'auth_user', 'session']
  const candidatos: any[] = []

  for (const chave of chaves) {
    const raw = localStorage.getItem(chave)
    if (!raw) continue

    try {
      const parsed = JSON.parse(raw)
      candidatos.push(...montarCandidatosUsuario(parsed))
    } catch {
      // ignora valores antigos que não sejam JSON
    }
  }

  const guiaSalvo =
    candidatos.find((item) => extrairTipoUsuario(item) === 'guia') ||
    candidatos.find((item) => extrairGuiaId(item) || extrairEmail(item)) ||
    null

  if (!guiaSalvo) return null

  let idGuia = extrairGuiaId(guiaSalvo)
  const emailGuia = extrairEmail(guiaSalvo)

  if (!idGuia && emailGuia) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', emailGuia)
      .eq('tipo', 'guia')
      .maybeSingle()

    if (!error && data?.id) {
      idGuia = String(data.id)
      return {
        ...guiaSalvo,
        ...data,
        id: idGuia,
        tipo: 'guia',
      } as UsuarioLocal
    }
  }

  if (!idGuia) return null

  return {
    ...guiaSalvo,
    id: idGuia,
    tipo: 'guia',
  } as UsuarioLocal
}

function numero(valor: unknown) {
  const n = Number(valor || 0)
  return Number.isFinite(n) ? n : 0
}

function primeiroNome(valor?: string | null) {
  const nome = String(valor || 'Guia').trim()
  return nome.split(' ')[0] || 'Guia'
}

function nomeUsuario(usuario?: UsuarioLocal | null) {
  return usuario?.nome || usuario?.name || usuario?.email || 'Guia'
}

function formatarData(valor?: string | null) {
  if (!valor) return '-'

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) return String(valor)

  return data.toLocaleDateString('pt-BR')
}

function formatarPercentual(valor: unknown) {
  return `${numero(valor).toFixed(1).replace('.', ',')}%`
}

function formatarNota(valor: unknown) {
  return numero(valor).toFixed(2).replace('.', ',')
}

function estrelas(nota: number) {
  const inteira = Math.round(numero(nota))

  return '★★★★★'
    .split('')
    .map((_, index) => (index < inteira ? '★' : '☆'))
    .join('')
}

function textoMedia(nota: number) {
  if (nota >= 4.7) return 'excelência percebida'
  if (nota >= 4.3) return 'muito bem avaliado'
  if (nota >= 3.8) return 'boa avaliação geral'
  if (nota > 0) return 'pontos a melhorar'
  return 'sem avaliações ainda'
}

function comentarioDaAvaliacao(avaliacao: AvaliacaoEnriquecida) {
  return (
    avaliacao.comentario ||
    avaliacao.observacao ||
    avaliacao.descricao ||
    ''
  )
}

function labelFiltro(filtro: 'todos' | 'comentarios' | 'baixas') {
  if (filtro === 'comentarios') return 'Com comentário'
  if (filtro === 'baixas') return 'Notas de atenção'
  return 'Todas'
}

export default function GuiaAvaliacoesPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [guiaId, setGuiaId] = useState('')
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function iniciar() {
    setCarregando(true)
    setErro('')
    setMensagem('')

    try {
      const usuarioSeguro = await resolverGuiaLocalStorage()

      if (!usuarioSeguro) {
        setErro('Não foi possível identificar o guia logado. Faça login novamente.')
        localStorage.removeItem('user')
        localStorage.removeItem('usuario')
        router.replace('/login')
        return
      }

      const idGuia = extrairGuiaId(usuarioSeguro)

      if (!idGuia) {
        setErro('Não foi possível identificar o guia logado. Faça login novamente.')
        localStorage.removeItem('user')
        localStorage.removeItem('usuario')
        router.replace('/login')
        return
      }

      localStorage.setItem(
        'user',
        JSON.stringify({
          ...usuarioSeguro,
          id: idGuia,
          tipo: 'guia',
        })
      )

      setUser({
        ...usuarioSeguro,
        id: idGuia,
        tipo: 'guia',
      })
      setGuiaId(idGuia)

      await carregarAvaliacoes(idGuia, true)
    } catch (error) {
      console.error('Erro ao iniciar avaliações do guia:', error)
      setErro('Não foi possível carregar suas avaliações agora.')
    } finally {
      setCarregando(false)
    }
  }

  async function carregarAvaliacoes(idGuiaRecebido?: string, silencioso = false) {
    const idGuia = String(idGuiaRecebido || guiaId || '').trim()

    if (!idGuia) {
      setErro('Guia não identificado para carregar avaliações. Faça login novamente.')
      return
    }

    if (!silencioso) {
      setAtualizando(true)
      setMensagem('')
      setErro('')
    }

    try {
      const response = await fetch('/api/avaliacoes/estatisticas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guiaId: idGuia,
          guia_id: idGuia,
          id_guia: idGuia,
          status: 'publicada',
          limite: 500,
          limiteComentarios: 20,
        }),
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
        porRoteiro: data?.porRoteiro || [],
      })

      setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))

      if (!silencioso) {
        setMensagem('Avaliações atualizadas.')
        window.setTimeout(() => setMensagem(''), 2400)
      }
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error)
      setErro(
        error instanceof Error
          ? error.message
          : 'Erro ao carregar avaliações.'
      )
    } finally {
      setAtualizando(false)
    }
  }

  const avaliacoesFiltradas = useMemo(() => {
    const lista = dados.avaliacoes || []

    if (filtroComentarios === 'comentarios') {
      return lista.filter((avaliacao) => comentarioDaAvaliacao(avaliacao).trim())
    }

    if (filtroComentarios === 'baixas') {
      return lista.filter((avaliacao) => numero(avaliacao.nota) > 0 && numero(avaliacao.nota) < 4)
    }

    return lista
  }, [dados.avaliacoes, filtroComentarios])

  const comentariosRecentes = useMemo(() => {
    const base = dados.comentariosRecentes?.length
      ? dados.comentariosRecentes
      : dados.avaliacoes.filter((avaliacao) => comentarioDaAvaliacao(avaliacao).trim())

    return base.slice(0, 8)
  }, [dados.comentariosRecentes, dados.avaliacoes])

  const nome = nomeUsuario(user)
  const resumo = dados.resumo || resumoInicial

  if (carregando) {
    return (
      <main className="loadingPage">
        <style>{`
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #f6f7f1;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          .loadingPage {
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
            font-weight: 850;
          }
          .loadingCard img {
            height: 64px;
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
          justify-content: flex-start;
          gap: 12px;
          cursor: pointer;
          min-width: 0;
        }

        .brand img {
          width: 42px;
          height: 42px;
          display: block;
          object-fit: contain;
          flex: 0 0 auto;
        }

        .brandText {
          min-width: 0;
          line-height: 1;
        }

        .brandTitle {
          color: #1f3d2d;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(30px, 4.2vw, 52px);
          font-weight: 800;
          line-height: 0.9;
          letter-spacing: -0.06em;
          white-space: nowrap;
        }

        .brandSub {
          color: #7b8372;
          font-size: clamp(10px, 1.4vw, 14px);
          font-weight: 850;
          margin-top: 6px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .headerActions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 22px 16px 54px;
        }

        .btn {
          border: none;
          border-radius: 999px;
          padding: 11px 14px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
          white-space: nowrap;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(15,23,42,0.10);
        }

        .btn:disabled {
          opacity: 0.62;
          cursor: not-allowed;
        }

        .btn.dark {
          background: #172018;
          color: #ffffff;
        }

        .btn.light {
          background: rgba(255,255,255,0.84);
          color: #172018;
          border: 1px solid rgba(15,23,42,0.08);
        }

        .hero {
          border-radius: 38px;
          padding: 28px;
          background:
            linear-gradient(135deg, rgba(23,32,24,0.78), rgba(23,32,24,0.34)),
            radial-gradient(circle at top right, rgba(190,242,100,0.30), transparent 34%),
            linear-gradient(135deg, #1f331f 0%, #647a49 46%, #d7c6a1 100%);
          color: #ffffff;
          box-shadow: 0 24px 60px rgba(23,32,24,0.18);
          margin-bottom: 16px;
          overflow: hidden;
        }

        .heroGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.8fr);
          gap: 18px;
          align-items: end;
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
          font-size: clamp(36px, 5vw, 66px);
          line-height: 0.92;
          font-weight: 950;
          letter-spacing: -0.085em;
        }

        .heroText {
          max-width: 720px;
          color: rgba(255,255,255,0.82);
          line-height: 1.6;
          margin: 14px 0 0;
          font-size: 14px;
          font-weight: 650;
        }

        .heroScore {
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 30px;
          padding: 18px;
          backdrop-filter: blur(14px);
        }

        .scoreValue {
          font-size: 54px;
          line-height: 0.9;
          font-weight: 950;
          letter-spacing: -0.07em;
        }

        .scoreStars {
          color: #facc15;
          margin-top: 8px;
          font-size: 18px;
          letter-spacing: 0.04em;
        }

        .scoreLabel {
          margin-top: 8px;
          color: rgba(255,255,255,0.80);
          font-size: 12px;
          line-height: 1.4;
          font-weight: 750;
        }

        .alert {
          border-radius: 18px;
          padding: 13px 15px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 850;
          line-height: 1.45;
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

        .summaryGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .summaryCard,
        .card {
          background: rgba(255,255,255,0.90);
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 30px;
          box-shadow: 0 12px 34px rgba(15,23,42,0.06);
          overflow: hidden;
        }

        .summaryCard {
          padding: 16px;
        }

        .summaryIcon {
          font-size: 22px;
          margin-bottom: 10px;
        }

        .summaryValue {
          color: #172018;
          font-size: 26px;
          font-weight: 950;
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .summaryLabel {
          margin-top: 6px;
          color: #64748b;
          font-size: 11px;
          font-weight: 850;
          line-height: 1.35;
        }

        .grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 370px;
          gap: 16px;
          align-items: start;
        }

        .stack {
          display: grid;
          gap: 16px;
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

        .filterRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filterBtn {
          border: 1px solid rgba(15,23,42,0.08);
          border-radius: 999px;
          background: #fffdf7;
          color: #475569;
          padding: 8px 11px;
          font-size: 11px;
          font-weight: 950;
          cursor: pointer;
        }

        .filterBtn.active {
          background: #172018;
          color: #ffffff;
          border-color: #172018;
        }

        .reviewList,
        .routeList,
        .distributionList {
          display: grid;
          gap: 10px;
        }

        .review {
          background: #fffdf7;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 22px;
          padding: 14px;
          transition: 0.2s ease;
        }

        .review.clickable {
          cursor: pointer;
        }

        .review.clickable:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 30px rgba(15,23,42,0.08);
          border-color: rgba(22,163,74,0.20);
        }

        .reviewTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }

        .reviewClient {
          color: #172018;
          font-size: 13px;
          font-weight: 950;
        }

        .reviewRoute {
          margin-top: 2px;
          color: #64748b;
          font-size: 11px;
          font-weight: 750;
        }

        .reviewStars {
          color: #f59e0b;
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
        }

        .reviewText {
          margin-top: 9px;
          color: #475569;
          font-size: 13px;
          line-height: 1.52;
          font-weight: 650;
          white-space: pre-wrap;
        }

        .reviewMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 10px;
        }

        .pill {
          border-radius: 999px;
          padding: 6px 8px;
          background: #eef2e5;
          color: #475569;
          font-size: 10px;
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

        .pill.red {
          background: #fee2e2;
          color: #991b1b;
        }

        .routeItem {
          background: #fffdf7;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 22px;
          padding: 14px;
        }

        .routeTitle {
          color: #172018;
          font-size: 13px;
          font-weight: 950;
          line-height: 1.3;
        }

        .routeMeta {
          margin-top: 6px;
          color: #64748b;
          font-size: 11px;
          line-height: 1.4;
          font-weight: 750;
        }

        .metricBar {
          margin-top: 10px;
          height: 8px;
          border-radius: 999px;
          background: #eef2e5;
          overflow: hidden;
        }

        .metricFill {
          height: 100%;
          border-radius: 999px;
          background: #84cc16;
        }

        .distributionItem {
          display: grid;
          grid-template-columns: minmax(90px, 1fr) 1.4fr 56px;
          gap: 10px;
          align-items: center;
          background: #fffdf7;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 18px;
          padding: 10px;
        }

        .distributionName {
          color: #172018;
          font-size: 12px;
          font-weight: 950;
          line-height: 1.25;
        }

        .distributionNumber {
          color: #64748b;
          font-size: 11px;
          font-weight: 850;
          text-align: right;
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

        @media (max-width: 980px) {
          .heroGrid,
          .grid {
            grid-template-columns: 1fr;
          }

          .summaryGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .header {
            padding: 9px 12px;
          }

          .brand img {
            width: 34px;
            height: 34px;
          }

          .brandTitle {
            display: block;
            font-size: 30px;
            line-height: 0.88;
          }

          .brandSub {
            display: block;
            font-size: 9px;
            letter-spacing: 0.12em;
            margin-top: 4px;
          }

          .headerActions .btn.light {
            display: none;
          }

          .container {
            padding: 16px 12px 42px;
          }

          .hero,
          .card,
          .summaryCard {
            border-radius: 28px;
          }

          .hero {
            padding: 20px;
          }

          .summaryGrid {
            grid-template-columns: 1fr 1fr;
          }

          .distributionItem {
            grid-template-columns: 1fr;
          }

          .distributionNumber {
            text-align: left;
          }
        }

        @media (max-width: 420px) {
          .summaryGrid {
            grid-template-columns: 1fr;
          }

          .heroTitle {
            font-size: 38px;
          }

          .btn {
            width: 100%;
          }

          .headerActions {
            justify-content: flex-end;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <div className="brand" onClick={() => router.push('/guia/dashboard')}>
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />

            <div className="brandText">
              <div className="brandTitle">PrussikTrails</div>
              <div className="brandSub">Avaliações do guia</div>
            </div>
          </div>

          <div className="headerActions">
            <button
              type="button"
              className="btn light"
              onClick={() => router.push('/guia/perfil')}
            >
              Perfil
            </button>

            <button
              type="button"
              className="btn dark"
              disabled={atualizando}
              onClick={() => carregarAvaliacoes(guiaId)}
            >
              {atualizando ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroGrid">
            <div>
              <div className="eyebrow">Painel de reputação</div>
              <h1 className="heroTitle">
                Avaliações de {primeiroNome(nome)}
              </h1>
              <p className="heroText">
                Acompanhe como os aventureiros percebem suas orientações, segurança, experiência e condução. Use este painel para melhorar comunicação, preparo e confiança nas próximas jornadas.
              </p>
            </div>

            <aside className="heroScore">
              <div className="scoreValue">{formatarNota(resumo.mediaNota)}</div>
              <div className="scoreStars">{estrelas(resumo.mediaNota)}</div>
              <div className="scoreLabel">
                {textoMedia(resumo.mediaNota)} · {resumo.total} avaliação(ões)
                {ultimaAtualizacao ? ` · atualizado às ${ultimaAtualizacao}` : ''}
              </div>
            </aside>
          </div>
        </section>

        {mensagem && <div className="alert success">{mensagem}</div>}
        {erro && <div className="alert error">{erro}</div>}

        <section className="summaryGrid">
          <div className="summaryCard">
            <div className="summaryIcon">⭐</div>
            <div className="summaryValue">{formatarNota(resumo.mediaNota)}</div>
            <div className="summaryLabel">média geral</div>
          </div>

          <div className="summaryCard">
            <div className="summaryIcon">👍</div>
            <div className="summaryValue">{formatarPercentual(resumo.percentualRecomendacao)}</div>
            <div className="summaryLabel">recomendariam a experiência</div>
          </div>

          <div className="summaryCard">
            <div className="summaryIcon">🧭</div>
            <div className="summaryValue">{formatarPercentual(resumo.orientacoesClarasPercentual)}</div>
            <div className="summaryLabel">orientações claras</div>
          </div>

          <div className="summaryCard">
            <div className="summaryIcon">🛡️</div>
            <div className="summaryValue">{formatarPercentual(resumo.segurancaAltaPercentual)}</div>
            <div className="summaryLabel">sentiram segurança alta</div>
          </div>
        </section>

        <section className="grid">
          <div className="stack">
            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Avaliações recebidas</h2>
                  <div className="cardSub">
                    Filtro atual: {labelFiltro(filtroComentarios)} · {avaliacoesFiltradas.length} registro(s).
                  </div>
                </div>

                <div className="filterRow">
                  {(['todos', 'comentarios', 'baixas'] as const).map((filtro) => (
                    <button
                      key={filtro}
                      type="button"
                      className={`filterBtn ${filtroComentarios === filtro ? 'active' : ''}`}
                      onClick={() => setFiltroComentarios(filtro)}
                    >
                      {labelFiltro(filtro)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="cardBody">
                {avaliacoesFiltradas.length === 0 ? (
                  <div className="empty">
                    Ainda não há avaliações nesse filtro.
                  </div>
                ) : (
                  <div className="reviewList">
                    {avaliacoesFiltradas.slice(0, 20).map((avaliacao) => {
                      const comentario = comentarioDaAvaliacao(avaliacao)
                      const baixa = numero(avaliacao.nota) > 0 && numero(avaliacao.nota) < 4

                      return (
                        <article
                          key={avaliacao.id}
                          className={`review ${avaliacao.cliente_id ? 'clickable' : ''}`}
                          role={avaliacao.cliente_id ? 'button' : undefined}
                          tabIndex={avaliacao.cliente_id ? 0 : undefined}
                          onClick={() => {
                            if (avaliacao.cliente_id) {
                              router.push(`/cliente/publico/${avaliacao.cliente_id}`)
                            }
                          }}
                          onKeyDown={(event) => {
                            if (avaliacao.cliente_id && (event.key === 'Enter' || event.key === ' ')) {
                              event.preventDefault()
                              router.push(`/cliente/publico/${avaliacao.cliente_id}`)
                            }
                          }}
                        >
                          <div className="reviewTop">
                            <div>
                              <div className="reviewClient">{avaliacao.cliente_nome || 'Cliente PrussikTrails'}</div>
                              <div className="reviewRoute">
                                {avaliacao.roteiro_titulo || 'Roteiro'} · {formatarData(avaliacao.created_at)}
                              </div>
                            </div>

                            <div className="reviewStars">
                              {estrelas(avaliacao.nota)} {formatarNota(avaliacao.nota)}
                            </div>
                          </div>

                          {comentario ? (
                            <div className="reviewText">{comentario}</div>
                          ) : (
                            <div className="reviewText">Avaliação sem comentário escrito.</div>
                          )}

                          <div className="reviewMeta">
                            {avaliacao.orientacoes_label && (
                              <span className="pill">{avaliacao.orientacoes_label}</span>
                            )}
                            {avaliacao.seguranca_label && (
                              <span className="pill green">{avaliacao.seguranca_label}</span>
                            )}
                            {avaliacao.experiencia_label && (
                              <span className="pill yellow">{avaliacao.experiencia_label}</span>
                            )}
                            {avaliacao.recomenda === true && (
                              <span className="pill green">Recomenda</span>
                            )}
                            {baixa && (
                              <span className="pill red">Ponto de atenção</span>
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>

            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Comentários recentes</h2>
                  <div className="cardSub">
                    Principais retornos textuais dos aventureiros.
                  </div>
                </div>
              </div>

              <div className="cardBody">
                {comentariosRecentes.length === 0 ? (
                  <div className="empty">
                    Ainda não há comentários escritos.
                  </div>
                ) : (
                  <div className="reviewList">
                    {comentariosRecentes.map((avaliacao) => (
                      <article className="review" key={`comentario-${avaliacao.id}`}>
                        <div className="reviewTop">
                          <div>
                            <div className="reviewClient">{avaliacao.cliente_nome || 'Cliente PrussikTrails'}</div>
                            <div className="reviewRoute">
                              {avaliacao.roteiro_titulo || 'Roteiro'} · {formatarData(avaliacao.created_at)}
                            </div>
                          </div>

                          <div className="reviewStars">
                            {estrelas(avaliacao.nota)} {formatarNota(avaliacao.nota)}
                          </div>
                        </div>

                        <div className="reviewText">
                          {comentarioDaAvaliacao(avaliacao) || 'Sem comentário escrito.'}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="stack">
            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Distribuição das notas</h2>
                  <div className="cardSub">
                    Leitura rápida do volume por nota.
                  </div>
                </div>
              </div>

              <div className="cardBody">
                {dados.distribuicao.notas.length === 0 ? (
                  <div className="empty">Sem distribuição de notas ainda.</div>
                ) : (
                  <div className="distributionList">
                    {dados.distribuicao.notas.map((item) => (
                      <div className="distributionItem" key={`nota-${item.nota || item.chave}`}>
                        <div className="distributionName">
                          Nota {item.nota || item.chave}
                        </div>

                        <div className="metricBar">
                          <div
                            className="metricFill"
                            style={{ width: `${Math.max(0, Math.min(100, numero(item.percentual)))}%` }}
                          />
                        </div>

                        <div className="distributionNumber">
                          {item.quantidade} · {formatarPercentual(item.percentual)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Por roteiro</h2>
                  <div className="cardSub">
                    Avaliação consolidada por experiência.
                  </div>
                </div>
              </div>

              <div className="cardBody">
                {dados.porRoteiro.length === 0 ? (
                  <div className="empty">Ainda não há dados por roteiro.</div>
                ) : (
                  <div className="routeList">
                    {dados.porRoteiro.slice(0, 8).map((roteiro) => (
                      <article className="routeItem" key={roteiro.roteiro_id}>
                        <div className="routeTitle">{roteiro.roteiro_titulo || 'Roteiro'}</div>
                        <div className="routeMeta">
                          {roteiro.total} avaliação(ões) · média {formatarNota(roteiro.mediaNota)} · recomendação {formatarPercentual(roteiro.percentualRecomendacao)}
                        </div>
                        <div className="metricBar">
                          <div
                            className="metricFill"
                            style={{ width: `${Math.max(0, Math.min(100, numero(roteiro.percentualRecomendacao)))}%` }}
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Indicadores de experiência</h2>
                  <div className="cardSub">
                    Pontos-chave do formulário padrão.
                  </div>
                </div>
              </div>

              <div className="cardBody">
                <div className="distributionList">
                  <div className="distributionItem">
                    <div className="distributionName">Orientações claras</div>
                    <div className="metricBar">
                      <div
                        className="metricFill"
                        style={{ width: `${Math.max(0, Math.min(100, numero(resumo.orientacoesClarasPercentual)))}%` }}
                      />
                    </div>
                    <div className="distributionNumber">{formatarPercentual(resumo.orientacoesClarasPercentual)}</div>
                  </div>

                  <div className="distributionItem">
                    <div className="distributionName">Segurança alta</div>
                    <div className="metricBar">
                      <div
                        className="metricFill"
                        style={{ width: `${Math.max(0, Math.min(100, numero(resumo.segurancaAltaPercentual)))}%` }}
                      />
                    </div>
                    <div className="distributionNumber">{formatarPercentual(resumo.segurancaAltaPercentual)}</div>
                  </div>

                  <div className="distributionItem">
                    <div className="distributionName">Superou expectativa</div>
                    <div className="metricBar">
                      <div
                        className="metricFill"
                        style={{ width: `${Math.max(0, Math.min(100, numero(resumo.experienciaSuperouPercentual)))}%` }}
                      />
                    </div>
                    <div className="distributionNumber">{formatarPercentual(resumo.experienciaSuperouPercentual)}</div>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  )
}
