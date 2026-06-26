'use client'

import { CSSProperties, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import LegalFooter from '../components/LegalFooter'

type AnyRecord = Record<string, any>

type HotTrail = {
  id: string
  title: string
  location: string
  difficulty: string
  price: string
  tag: string
  guide: string
  image?: string | null
}

const fallbackHotTrails: HotTrail[] = [
  {
    id: 'fallback-1',
    title: 'Trilhas para respirar melhor',
    location: 'Natureza, pausa e movimento',
    difficulty: 'Leve a moderada',
    price: 'Experiências selecionadas',
    tag: 'Bem-estar',
    guide: 'Guias preparados',
    image: null
  },
  {
    id: 'fallback-2',
    title: 'Cachoeiras e caminhos de fim de semana',
    location: 'Roteiros próximos e acessíveis',
    difficulty: 'Para começar com segurança',
    price: 'Reserve pelo app',
    tag: 'Mais procurados',
    guide: 'Condução organizada',
    image: null
  },
  {
    id: 'fallback-3',
    title: 'Experiências outdoor com guia',
    location: 'Do planejamento ao encontro',
    difficulty: 'Informação clara antes da trilha',
    price: 'Vagas e reservas no app',
    tag: 'Outdoor',
    guide: 'Gestão para guias',
    image: null
  }
]

const USER_SELECT_BASE = [
  'id',
  'nome',
  'email',
  'tipo',
  'nome_agencia',
  'agencia_nome',
  'empresa',
  'empresa_nome',
  'nome_empresa',
  'nome_fantasia',
  'razao_social'
]

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function normalizarPreco(valor: unknown) {
  const numero = Number(valor)

  if (!Number.isFinite(numero) || numero <= 0) {
    return 'Consulte no app'
  }

  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

function erroColunaInexistente(error: any) {
  const mensagem = String(
    error?.message ||
      error?.details ||
      error?.hint ||
      ''
  ).toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    mensagem.includes('column') ||
    mensagem.includes('schema cache') ||
    mensagem.includes('does not exist') ||
    mensagem.includes('could not find')
  )
}

function extrairColunaInexistente(error: any) {
  const textoErro = [
    error?.message,
    error?.details,
    error?.hint
  ]
    .filter(Boolean)
    .join(' ')

  const matchUsers = textoErro.match(/users\.([a-zA-Z0-9_]+)/)

  if (matchUsers?.[1]) return matchUsers[1]

  const matchColumn = textoErro.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i)

  if (matchColumn?.[1]) return matchColumn[1]

  const matchAspas = textoErro.match(/'([^']+)'/)

  if (matchAspas?.[1]) return matchAspas[1]

  return ''
}

function pegarGuiaIdDoRoteiro(roteiro: AnyRecord) {
  return texto(
    roteiro.id_guia ||
      roteiro.guia_id ||
      roteiro.user_id ||
      roteiro.usuario_id ||
      roteiro.criado_por ||
      roteiro.created_by ||
      roteiro.owner_id
  )
}

function pegarNomeGuiaDiretoDoRoteiro(roteiro: AnyRecord) {
  return texto(
    roteiro.nome_guia ||
      roteiro.guia_nome ||
      roteiro.nome_do_guia ||
      roteiro.guia ||
      roteiro.organizador ||
      roteiro.nome_agencia ||
      roteiro.agencia_nome ||
      roteiro.empresa_nome ||
      roteiro.nome_empresa ||
      roteiro.nome_fantasia ||
      roteiro.razao_social ||
      roteiro.agencia
  )
}

function pegarNomePublicoUsuario(user: AnyRecord) {
  return texto(
    user.nome_agencia ||
      user.agencia_nome ||
      user.empresa_nome ||
      user.nome_empresa ||
      user.nome_fantasia ||
      user.razao_social ||
      user.empresa ||
      user.nome ||
      user.email
  )
}

async function buscarGuiasPorIds(ids: string[]) {
  const idsValidos = Array.from(
    new Set(
      ids
        .map((id) => texto(id))
        .filter(Boolean)
    )
  )

  if (idsValidos.length === 0) return new Map<string, string>()

  let campos = [...USER_SELECT_BASE]

  for (let tentativa = 0; tentativa < 14; tentativa++) {
    const { data, error } = await supabase
      .from('users')
      .select(campos.join(', '))
      .in('id', idsValidos)

    if (!error) {
      const usuarios: AnyRecord[] = Array.isArray(data)
        ? (data as AnyRecord[])
        : []

      const mapa = new Map<string, string>()

      usuarios.forEach((usuario: AnyRecord) => {
        const id = texto(usuario.id)
        const nome = pegarNomePublicoUsuario(usuario)

        if (id && nome) {
          mapa.set(id, nome)
        }
      })

      return mapa
    }

    if (!erroColunaInexistente(error)) {
      console.warn('[home] Não foi possível buscar nomes dos guias:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })

      return new Map<string, string>()
    }

    const coluna = extrairColunaInexistente(error)

    if (!coluna) {
      console.warn('[home] Erro de coluna sem identificação ao buscar guias:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })

      return new Map<string, string>()
    }

    campos = campos.filter((campo) => campo !== coluna)

    if (campos.length <= 2) {
      return new Map<string, string>()
    }
  }

  return new Map<string, string>()
}

function normalizarRoteiro(
  roteiro: AnyRecord,
  index: number,
  mapaGuias: Map<string, string>
): HotTrail {
  const preco =
    roteiro.valor_total ??
    roteiro.valor ??
    roteiro.preco ??
    roteiro.preco_total ??
    roteiro.preco_por_pessoa ??
    null

  const guiaId = pegarGuiaIdDoRoteiro(roteiro)
  const guiaDireto = pegarNomeGuiaDiretoDoRoteiro(roteiro)
  const guiaDoUsuario = guiaId ? texto(mapaGuias.get(guiaId)) : ''

  return {
    id: texto(roteiro.id || roteiro.uuid || `roteiro-${index}`),
    title:
      texto(
        roteiro.titulo ||
          roteiro.nome ||
          roteiro.nome_roteiro ||
          roteiro.nomeRoteiro
      ) || 'Roteiro PrussikTrails',
    location:
      texto(
        roteiro.local ||
          roteiro.cidade ||
          roteiro.destino ||
          roteiro.localizacao ||
          roteiro.ponto_encontro
      ) || 'Experiência outdoor',
    difficulty:
      texto(roteiro.dificuldade || roteiro.nivel || roteiro.intensidade) ||
      'Nível informado pelo guia',
    price: normalizarPreco(preco),
    tag:
      texto(roteiro.categoria || roteiro.tipo || roteiro.modalidade) ||
      'Roteiro quente',
    guide:
      guiaDireto ||
      guiaDoUsuario ||
      'Guia/Agência PrussikTrails',
    image:
      texto(
        roteiro.foto_capa ||
          roteiro.foto_url ||
          roteiro.imagem_url ||
          roteiro.image_url ||
          roteiro.capa_url
      ) || null
  }
}

export default function HomePage() {
  const router = useRouter()

  const [hotTrails, setHotTrails] = useState<HotTrail[]>(fallbackHotTrails)
  const [activeHotTrail, setActiveHotTrail] = useState(0)

  useEffect(() => {
    let ativo = true

    async function carregarRoteirosQuentes() {
      try {
        const { data, error } = await supabase
          .from('roteiros')
          .select('*')
          .limit(12)

        if (error) {
          console.warn('[home] Não foi possível carregar roteiros:', error)
          return
        }

        const registros: AnyRecord[] = Array.isArray(data)
          ? (data as AnyRecord[])
          : []

        const filtradosBase = registros
          .filter((roteiro: AnyRecord) => {
            if (roteiro.ativo === false) return false

            const status = normalizar(
              roteiro.status ||
                roteiro.situacao ||
                roteiro.estado ||
                roteiro.publicacao
            )

            if (!status) return true

            return ![
              'cancelado',
              'cancelada',
              'inativo',
              'inativa',
              'rascunho',
              'arquivado',
              'arquivada',
              'pausado',
              'pausada'
            ].includes(status)
          })
          .slice(0, 6)

        const guiaIds = filtradosBase
          .map((roteiro: AnyRecord) => pegarGuiaIdDoRoteiro(roteiro))
          .filter(Boolean)

        const mapaGuias = await buscarGuiasPorIds(guiaIds)

        const filtrados = filtradosBase
          .map((roteiro: AnyRecord, index: number) =>
            normalizarRoteiro(roteiro, index, mapaGuias)
          )
          .filter((roteiro: HotTrail) => roteiro.title)

        if (ativo && filtrados.length > 0) {
          setHotTrails(filtrados)
          setActiveHotTrail(0)
        }
      } catch (error) {
        console.warn('[home] Erro inesperado ao carregar roteiros:', error)
      }
    }

    carregarRoteirosQuentes()

    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    if (hotTrails.length <= 1) return

    const intervalo = window.setInterval(() => {
      setActiveHotTrail((prev) => {
        return (prev + 1) % hotTrails.length
      })
    }, 4300)

    return () => window.clearInterval(intervalo)
  }, [hotTrails.length])

  const roteiroAtivo = useMemo(() => {
    return hotTrails[activeHotTrail] || hotTrails[0] || fallbackHotTrails[0]
  }, [hotTrails, activeHotTrail])

  function irParaRoteiros() {
    router.push('/roteiros')
  }

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
            radial-gradient(circle at 12% 5%, rgba(132, 204, 22, 0.20), transparent 28%),
            radial-gradient(circle at 88% 8%, rgba(251, 146, 60, 0.16), transparent 28%),
            radial-gradient(circle at 50% 100%, rgba(220, 38, 38, 0.10), transparent 34%),
            linear-gradient(180deg, #fffdf7 0%, #f3f5ea 45%, #e9eee0 100%);
          color: #172018;
          overflow-x: hidden;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(255, 253, 247, 0.88);
          backdrop-filter: blur(18px);
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          padding: 10px 16px;
        }

        .headerInner {
          max-width: 1180px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
        }

        .brand {
          border: 0;
          background: transparent;
          padding: 0;
          display: inline-flex;
          align-items: center;
          gap: clamp(12px, 2.2vw, 18px);
          min-width: 0;
          width: fit-content;
          max-width: 100%;
          cursor: pointer;
          color: inherit;
          text-align: left;
        }

        .brandLogoWrap {
          width: clamp(72px, 10vw, 96px);
          height: clamp(72px, 10vw, 96px);
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          flex: 0 0 auto;
          overflow: visible;
        }

        .brandLogoWrap img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          transform: scale(1.22);
          transform-origin: center;
        }

        .brandText {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
        }

        .brandName {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(34px, 5.8vw, 56px);
          font-weight: 800;
          color: #1f3f2d;
          line-height: 1.04;
          letter-spacing: -0.045em;
          white-space: nowrap;
          overflow: visible;
          text-overflow: unset;
          padding-right: 6px;
          max-width: calc(100vw - 190px);
        }

        .headerActions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          min-width: 0;
        }

        .navButton {
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: #172018;
          color: #ffffff;
          border-radius: 999px;
          padding: 10px 15px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
          white-space: nowrap;
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.10);
        }

        .navButton:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.14);
        }

        .container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 26px 18px 54px;
        }

        .hero {
          min-height: calc(100vh - 145px);
          display: grid;
          grid-template-columns: minmax(0, 1.02fr) minmax(350px, 0.98fr);
          gap: 22px;
          align-items: stretch;
        }

        .heroMain {
          position: relative;
          overflow: hidden;
          border-radius: 42px;
          padding: 34px;
          background:
            linear-gradient(135deg, rgba(23, 32, 24, 0.84), rgba(23, 32, 24, 0.42)),
            radial-gradient(circle at top right, rgba(190, 242, 100, 0.28), transparent 34%),
            linear-gradient(135deg, #1f331f 0%, #5f7547 48%, #d7c6a1 100%);
          color: #ffffff;
          box-shadow: 0 28px 70px rgba(23, 32, 24, 0.22);
          min-height: 620px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .heroMain::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: linear-gradient(to bottom, black, transparent);
          pointer-events: none;
        }

        .heroContent {
          position: relative;
          z-index: 2;
        }

        .eyebrow {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: rgba(255, 255, 255, 0.13);
          color: #f7fee7;
          padding: 9px 13px;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          margin-bottom: 18px;
        }

        .heroTitle {
          margin: 0;
          max-width: 760px;
          font-size: clamp(46px, 7vw, 86px);
          line-height: 0.90;
          font-weight: 950;
          letter-spacing: -0.085em;
        }

        .heroTitle span {
          color: #bef264;
          text-shadow: 0 0 28px rgba(190, 242, 100, 0.32);
        }

        .heroText {
          max-width: 640px;
          color: rgba(255, 255, 255, 0.82);
          line-height: 1.65;
          margin: 20px 0 0;
          font-size: 15px;
        }

        .heroActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 26px;
        }

        .cta {
          border: none;
          border-radius: 999px;
          padding: 15px 20px;
          font-size: 13px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 34px rgba(15, 23, 42, 0.20);
        }

        .cta.primary {
          background: #bef264;
          color: #172018;
        }

        .cta.secondary {
          background: rgba(255, 255, 255, 0.13);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.24);
        }

        .heroFooter {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 34px;
        }

        .miniMetric {
          background: rgba(255, 255, 255, 0.13);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 24px;
          padding: 14px;
          backdrop-filter: blur(14px);
        }

        .metricValue {
          font-size: 26px;
          font-weight: 950;
          letter-spacing: -0.06em;
          color: #ffffff;
        }

        .metricLabel {
          margin-top: 3px;
          color: rgba(255, 255, 255, 0.70);
          font-size: 11px;
          font-weight: 850;
          line-height: 1.35;
        }

        .side {
          display: grid;
          gap: 16px;
        }

        .card {
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 34px;
          padding: 22px;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.07);
          overflow: hidden;
        }

        .hotCard {
          padding: 0;
          min-height: 334px;
          position: relative;
          background:
            radial-gradient(circle at 15% 0%, rgba(190, 242, 100, 0.26), transparent 36%),
            linear-gradient(135deg, #172018 0%, #253f2c 52%, #6f7f4f 100%);
          color: #ffffff;
        }

        .hotVisual {
          min-height: 334px;
          padding: 22px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background:
            linear-gradient(135deg, rgba(23, 32, 24, 0.70), rgba(23, 32, 24, 0.40)),
            var(--hot-image);
          background-size: cover;
          background-position: center;
        }

        .hotTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .hotBadge {
          width: fit-content;
          border-radius: 999px;
          padding: 8px 11px;
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.20);
          color: #f7fee7;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          backdrop-filter: blur(12px);
        }

        .hotCounter {
          color: rgba(255, 255, 255, 0.72);
          font-size: 12px;
          font-weight: 900;
        }

        .hotContent {
          display: grid;
          gap: 12px;
        }

        .hotTitle {
          margin: 0;
          color: #ffffff;
          font-size: 31px;
          line-height: 0.96;
          font-weight: 950;
          letter-spacing: -0.065em;
        }

        .hotMeta {
          display: grid;
          gap: 7px;
          color: rgba(255, 255, 255, 0.80);
          font-size: 13px;
          line-height: 1.42;
          font-weight: 800;
        }

        .hotMeta strong {
          color: #ffffff;
          font-weight: 950;
        }

        .hotActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 4px;
        }

        .hotButton {
          border: none;
          border-radius: 999px;
          padding: 12px 15px;
          background: #bef264;
          color: #172018;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .hotButton.secondary {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.22);
        }

        .hotButton:hover {
          transform: translateY(-1px);
        }

        .hotDots {
          display: flex;
          gap: 7px;
          margin-top: 12px;
        }

        .hotDot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          border: 0;
          background: rgba(255, 255, 255, 0.35);
          cursor: pointer;
          transition: 0.2s ease;
          padding: 0;
        }

        .hotDot.active {
          width: 24px;
          background: #bef264;
        }

        .cardLabel {
          color: #84cc16;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .cardTitle {
          margin: 0;
          color: #172018;
          font-size: 26px;
          line-height: 1.02;
          font-weight: 950;
          letter-spacing: -0.06em;
        }

        .cardText {
          margin: 10px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
          font-weight: 700;
        }

        .appGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .appMiniCard {
          border-radius: 26px;
          padding: 18px;
          background: rgba(255, 253, 247, 0.88);
          border: 1px solid rgba(15, 23, 42, 0.06);
        }

        .appMiniKicker {
          color: #84cc16;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 9px;
        }

        .appMiniTitle {
          margin: 0;
          color: #172018;
          font-size: 18px;
          line-height: 1.05;
          font-weight: 950;
          letter-spacing: -0.055em;
        }

        .appMiniText {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
          font-weight: 750;
        }

        .bottomGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
        }

        .feature {
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 30px;
          padding: 20px;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
        }

        .featureIcon {
          width: 46px;
          height: 46px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0fdf4;
          color: #203c2e;
          font-size: 18px;
          font-weight: 950;
          margin-bottom: 14px;
        }

        .featureTitle {
          color: #172018;
          font-size: 16px;
          font-weight: 950;
          line-height: 1.2;
        }

        .featureText {
          margin-top: 6px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.55;
          font-weight: 700;
        }

        @media (max-width: 980px) {
          .hero {
            grid-template-columns: 1fr;
          }

          .heroMain {
            min-height: auto;
          }

          .bottomGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .header {
            padding: 8px 10px;
          }

          .headerInner {
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 8px;
          }

          .brand {
            gap: 8px;
          }

          .brandLogoWrap {
            width: 58px;
            height: 58px;
          }

          .brandLogoWrap img {
            transform: scale(1.18);
          }

          .brandName {
            font-size: clamp(28px, 7.2vw, 36px);
            line-height: 1.04;
            letter-spacing: -0.04em;
            max-width: calc(100vw - 132px);
            padding-right: 5px;
          }

          .navButton {
            padding: 9px 12px;
            font-size: 11px;
          }

          .container {
            padding: 16px 12px 42px;
          }

          .heroMain,
          .card,
          .feature {
            border-radius: 28px;
          }

          .heroMain {
            padding: 24px;
          }

          .heroTitle {
            font-size: 48px;
          }

          .heroFooter {
            grid-template-columns: 1fr;
          }

          .appGrid {
            grid-template-columns: 1fr;
          }

          .hotVisual {
            min-height: 320px;
          }
        }

        @media (max-width: 390px) {
          .brandLogoWrap {
            width: 52px;
            height: 52px;
          }

          .brandLogoWrap img {
            transform: scale(1.18);
          }

          .brandName {
            font-size: clamp(25px, 6.9vw, 31px);
            letter-spacing: -0.035em;
            max-width: calc(100vw - 124px);
            padding-right: 4px;
          }

          .navButton {
            padding: 8px 10px;
            font-size: 10.5px;
          }

          .heroTitle {
            font-size: 42px;
          }

          .heroActions {
            display: grid;
          }

          .cta {
            width: 100%;
          }

          .hotTitle {
            font-size: 27px;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <button
            type="button"
            className="brand"
            onClick={() => router.push('/')}
            aria-label="PrussikTrails - página inicial"
          >
            <span className="brandLogoWrap">
              <img
                src="/logo-prussik-display.png"
                alt=""
                aria-hidden="true"
              />
            </span>

            <span className="brandText">
              <span className="brandName">PrussikTrails</span>
            </span>
          </button>

          <div className="headerActions">
            <button
              type="button"
              className="navButton"
              onClick={() => router.push('/login')}
            >
              Login
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroMain">
            <div className="heroContent">
              <div className="eyebrow">Sua próxima história começa fora da tela</div>

              <h1 className="heroTitle">
                A jornada começa quando o <span>conforto termina.</span>
              </h1>

              <p className="heroText">
                O PrussikTrails é o app para transformar vontade de sair da rotina
                em experiência real: o aventureiro encontra roteiros com mais
                tranquilidade, e o guia organiza reservas, grupos e gestão em um só lugar.
              </p>

              <div className="heroActions">
                <button
                  type="button"
                  className="cta primary"
                  onClick={() => router.push('/cadastro')}
                >
                  Começar minha jornada
                </button>

                <button
                  type="button"
                  className="cta secondary"
                  onClick={irParaRoteiros}
                >
                  Ver roteiros disponíveis
                </button>
              </div>
            </div>

            <div className="heroFooter">
              <div className="miniMetric">
                <div className="metricValue">01</div>
                <div className="metricLabel">Escolha uma experiência</div>
              </div>

              <div className="miniMetric">
                <div className="metricValue">02</div>
                <div className="metricLabel">Reserve com segurança</div>
              </div>

              <div className="miniMetric">
                <div className="metricValue">03</div>
                <div className="metricLabel">Viva a trilha com guia</div>
              </div>
            </div>
          </div>

          <aside className="side">
            <section className="card hotCard">
              <div
                className="hotVisual"
                style={
                  {
                    '--hot-image': roteiroAtivo.image
                      ? `url("${roteiroAtivo.image}")`
                      : 'radial-gradient(circle at 80% 10%, rgba(190,242,100,0.24), transparent 34%), linear-gradient(135deg, #203c2e 0%, #5f7547 48%, #d7c6a1 100%)'
                  } as CSSProperties
                }
              >
                <div>
                  <div className="hotTop">
                    <div className="hotBadge">{roteiroAtivo.tag}</div>

                    <div className="hotCounter">
                      {String(activeHotTrail + 1).padStart(2, '0')} /{' '}
                      {String(hotTrails.length).padStart(2, '0')}
                    </div>
                  </div>
                </div>

                <div className="hotContent">
                  <h2 className="hotTitle">{roteiroAtivo.title}</h2>

                  <div className="hotMeta">
                    <div>
                      <strong>Local:</strong> {roteiroAtivo.location}
                    </div>

                    <div>
                      <strong>Nível:</strong> {roteiroAtivo.difficulty}
                    </div>

                    <div>
                      <strong>Guia:</strong> {roteiroAtivo.guide}
                    </div>

                    <div>
                      <strong>Valor:</strong> {roteiroAtivo.price}
                    </div>
                  </div>

                  <div className="hotActions">
                    <button
                      type="button"
                      className="hotButton"
                      onClick={irParaRoteiros}
                    >
                      Ver roteiro
                    </button>

                    <button
                      type="button"
                      className="hotButton secondary"
                      onClick={() => {
                        setActiveHotTrail((prev) => {
                          return (prev + 1) % hotTrails.length
                        })
                      }}
                    >
                      Próximo
                    </button>
                  </div>

                  <div className="hotDots" aria-label="Roteiros em destaque">
                    {hotTrails.map((roteiro, index) => (
                      <button
                        key={roteiro.id}
                        type="button"
                        className={`hotDot ${
                          index === activeHotTrail ? 'active' : ''
                        }`}
                        aria-label={`Ver destaque ${index + 1}`}
                        onClick={() => setActiveHotTrail(index)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="cardLabel">App para aventureiros e guias</div>

              <h2 className="cardTitle">
                Tranquilidade para quem vai. Funcionalidade para quem conduz.
              </h2>

              <p className="cardText">
                A proposta é deixar a experiência mais simples: o cliente entende,
                reserva e acompanha; o guia organiza, comunica e gerencia melhor.
              </p>

              <div className="appGrid">
                <div className="appMiniCard">
                  <div className="appMiniKicker">Aventureiro</div>
                  <h3 className="appMiniTitle">Escolha com calma</h3>
                  <p className="appMiniText">
                    Veja roteiros, informações essenciais e reservas em uma área própria.
                  </p>
                </div>

                <div className="appMiniCard">
                  <div className="appMiniKicker">Guia</div>
                  <h3 className="appMiniTitle">Gerencie melhor</h3>
                  <p className="appMiniText">
                    Cadastre experiências, acompanhe reservas e mantenha sua operação organizada.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </section>

        <section className="bottomGrid">
          <article className="feature">
            <div className="featureIcon">01</div>
            <div className="featureTitle">Roteiros com alma outdoor</div>
            <div className="featureText">
              Experiências criadas para quem busca ar livre, natureza e presença.
            </div>
          </article>

          <article className="feature">
            <div className="featureIcon">02</div>
            <div className="featureTitle">Guias como protagonistas</div>
            <div className="featureText">
              O guia cadastra, organiza e conduz experiências com mais autonomia.
            </div>
          </article>

          <article className="feature">
            <div className="featureIcon">03</div>
            <div className="featureTitle">Comunidade em movimento</div>
            <div className="featureText">
              Acompanhe reservas, trilhas quentes, conquistas e novas jornadas.
            </div>
          </article>
        </section>
      </div>

      <LegalFooter />
    </main>
  )
}