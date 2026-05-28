'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type UsuarioLocal = {
  id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  guia_id?: string | null
  nome?: string | null
  name?: string | null
  email?: string | null
  tipo?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
}

type AvaliacaoItem = {
  id?: string | null
  reserva_id?: string | null
  roteiro_id?: string | null
  roteiro_nome?: string | null
  roteiro_titulo?: string | null
  cliente_nome?: string | null
  cliente_email?: string | null
  nota_geral?: number | string | null
  nota?: number | string | null
  rating?: number | string | null
  estrelas?: number | string | null
  comentario?: string | null
  observacao?: string | null
  depoimento?: string | null
  orientacoes?: string | null
  seguranca?: string | null
  experiencia?: string | null
  respostas?: Record<string, any> | null
  created_at?: string | null
  updated_at?: string | null
  [key: string]: any
}

type EstatisticasAvaliacoes = {
  sucesso?: boolean
  guiaId?: string
  totalAvaliacoes?: number
  total?: number
  mediaGeral?: number
  media?: number
  notaMedia?: number
  respondidas?: number
  comComentario?: number
  distribuicaoNotas?: Record<string, number>
  respostas?: {
    orientacoes?: Record<string, number>
    seguranca?: Record<string, number>
    experiencia?: Record<string, number>
  }
  estatisticas?: {
    totalAvaliacoes?: number
    mediaGeral?: number
    notaMedia?: number
    respondidas?: number
    comComentario?: number
  }
  avaliacoes?: AvaliacaoItem[]
  erro?: string
  aviso?: string
}

function texto(valor: unknown, fallback = '') {
  const textoSeguro = String(valor || '').trim()
  return textoSeguro || fallback
}

function numero(valor: unknown) {
  const n = Number(valor || 0)
  return Number.isFinite(n) ? n : 0
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function extrairUsuarioId(usuario: UsuarioLocal | null) {
  return texto(
    usuario?.id ||
      usuario?.user_id ||
      usuario?.usuario_id ||
      usuario?.guia_id ||
      ''
  )
}

function nomeUsuario(usuario: UsuarioLocal | null) {
  return texto(usuario?.nome || usuario?.name || usuario?.email, 'Guia')
}

function primeiroNome(usuario: UsuarioLocal | null) {
  return nomeUsuario(usuario).split(' ')[0] || 'Guia'
}

function avatarUsuario(usuario: UsuarioLocal | null) {
  return texto(usuario?.avatar_url || usuario?.foto_url || usuario?.imagem_url)
}

function inicialUsuario(usuario: UsuarioLocal | null) {
  return primeiroNome(usuario).slice(0, 1).toUpperCase()
}

function formatarData(valor?: string | null) {
  if (!valor) return ''

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) return ''

  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function notaAvaliacao(item: AvaliacaoItem) {
  return numero(
    item.nota_geral ??
      item.nota ??
      item.rating ??
      item.estrelas ??
      0
  )
}

function comentarioAvaliacao(item: AvaliacaoItem) {
  return texto(item.comentario || item.observacao || item.depoimento)
}

function tituloRoteiro(item: AvaliacaoItem) {
  return texto(
    item.roteiro_titulo ||
      item.roteiro_nome ||
      item.roteiro?.titulo ||
      item.roteiro?.nome ||
      'Roteiro avaliado'
  )
}

function respostaBonita(valor: unknown) {
  const key = normalizar(valor)

  const mapa: Record<string, string> = {
    claras_completas: 'Orientações claras',
    suficientes_melhorar: 'Suficientes, podem melhorar',
    faltaram_informacoes: 'Faltaram informações',
    muita_seguranca: 'Passou muita segurança',
    seguranca_suficiente: 'Segurança suficiente',
    mais_atencao: 'Pede mais atenção',
    superou_expectativas: 'Superou expectativas',
    atendeu_esperado: 'Atendeu o esperado',
    abaixo_esperado: 'Abaixo do esperado',
    nao_informado: 'Não informado',
  }

  return mapa[key] || texto(valor, 'Não informado')
}

function contarTotal(obj?: Record<string, number>) {
  return Object.values(obj || {}).reduce((acc, valor) => acc + numero(valor), 0)
}

function percentual(valor: number, total: number) {
  if (!total) return 0
  return Math.max(0, Math.min(100, Math.round((valor / total) * 100)))
}

export default function GuiaAvaliacoesPage() {
  const router = useRouter()

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [erro, setErro] = useState('')
  const [dados, setDados] = useState<EstatisticasAvaliacoes | null>(null)

  const guiaId = extrairUsuarioId(user)

  const totalAvaliacoes = numero(
    dados?.totalAvaliacoes ??
      dados?.estatisticas?.totalAvaliacoes ??
      dados?.total ??
      0
  )

  const mediaGeral = numero(
    dados?.mediaGeral ??
      dados?.estatisticas?.mediaGeral ??
      dados?.estatisticas?.notaMedia ??
      dados?.notaMedia ??
      dados?.media ??
      0
  )

  const comComentario = numero(
    dados?.comComentario ??
      dados?.estatisticas?.comComentario ??
      dados?.respondidas ??
      dados?.estatisticas?.respondidas ??
      0
  )

  const avaliacoes = useMemo(() => {
    return Array.isArray(dados?.avaliacoes) ? dados?.avaliacoes || [] : []
  }, [dados?.avaliacoes])

  const distribuicaoNotas = dados?.distribuicaoNotas || {}
  const respostas = dados?.respostas || {}

  useEffect(() => {
    iniciar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function iniciar() {
    setCarregando(true)
    setErro('')

    try {
      const salvo = localStorage.getItem('user')

      if (!salvo) {
        router.replace('/login')
        return
      }

      const parsed = JSON.parse(salvo) as UsuarioLocal

      if (normalizar(parsed.tipo) !== 'guia') {
        router.replace('/login')
        return
      }

      const usuarioSincronizado = await sincronizarUsuario(parsed)
      setUser(usuarioSincronizado)

      await carregarAvaliacoes(extrairUsuarioId(usuarioSincronizado))
    } catch (error) {
      console.error('Erro ao iniciar página de avaliações do guia:', error)
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar as avaliações agora.'
      )
    } finally {
      setCarregando(false)
    }
  }

  async function sincronizarUsuario(usuarioAtual: UsuarioLocal) {
    const id = extrairUsuarioId(usuarioAtual)

    if (!id) return usuarioAtual

    try {
      const response = await fetch(`/api/usuario/perfil?id=${encodeURIComponent(id)}`, {
        cache: 'no-store',
      })

      if (!response.ok) return usuarioAtual

      const data = await response.json().catch(() => null)

      const usuarioServidor = data?.usuario || data?.user || data

      if (!usuarioServidor?.id) return usuarioAtual

      const atualizado: UsuarioLocal = {
        ...usuarioAtual,
        id: usuarioServidor.id || usuarioAtual.id,
        nome: usuarioServidor.nome || usuarioServidor.name || usuarioAtual.nome || null,
        name: usuarioServidor.name || usuarioAtual.name || null,
        email: usuarioServidor.email || usuarioAtual.email || null,
        tipo: usuarioServidor.tipo || usuarioAtual.tipo || null,
        avatar_url: usuarioServidor.avatar_url || usuarioServidor.foto_url || usuarioAtual.avatar_url || null,
        foto_url: usuarioServidor.foto_url || usuarioServidor.avatar_url || usuarioAtual.foto_url || null,
        imagem_url: usuarioServidor.imagem_url || usuarioServidor.avatar_url || usuarioAtual.imagem_url || null,
      }

      localStorage.setItem('user', JSON.stringify(atualizado))
      return atualizado
    } catch {
      return usuarioAtual
    }
  }

  async function carregarAvaliacoes(idGuia: string) {
    if (!idGuia) {
      setDados({
        sucesso: true,
        guiaId: '',
        totalAvaliacoes: 0,
        mediaGeral: 0,
        comComentario: 0,
        distribuicaoNotas: {},
        respostas: {},
        avaliacoes: [],
      })
      return
    }

    setAtualizando(true)
    setErro('')

    try {
      const response = await fetch('/api/avaliacoes/estatisticas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          guiaId: idGuia,
          guia_id: idGuia,
          id_guia: idGuia,
        }),
      })

      const textoResposta = await response.text()
      let data: EstatisticasAvaliacoes | null = null

      try {
        data = textoResposta ? JSON.parse(textoResposta) : null
      } catch {
        data = {
          sucesso: false,
          erro: textoResposta || 'Resposta inválida da API de avaliações.',
        }
      }

      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.erro || 'Erro ao carregar avaliações.')
      }

      setDados(data)
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error)
      setErro(
        error instanceof Error
          ? error.message
          : 'Erro ao carregar avaliações.'
      )
      setDados({
        sucesso: true,
        guiaId: idGuia,
        totalAvaliacoes: 0,
        mediaGeral: 0,
        comComentario: 0,
        distribuicaoNotas: {},
        respostas: {},
        avaliacoes: [],
      })
    } finally {
      setAtualizando(false)
    }
  }

  function renderDistribuicaoNotas() {
    const entradas = [5, 4, 3, 2, 1]
    const total = entradas.reduce(
      (acc, nota) => acc + numero(distribuicaoNotas[String(nota)]),
      0
    )

    return (
      <div className="ratingBars">
        {entradas.map((nota) => {
          const valor = numero(distribuicaoNotas[String(nota)])
          const pct = percentual(valor, total)

          return (
            <div className="ratingBar" key={nota}>
              <span>{nota}★</span>
              <div>
                <i style={{ width: `${pct}%` }} />
              </div>
              <strong>{valor}</strong>
            </div>
          )
        })}
      </div>
    )
  }

  function renderResumoRespostas(titulo: string, dadosResposta?: Record<string, number>) {
    const entradas = Object.entries(dadosResposta || {})
      .filter(([, valor]) => numero(valor) > 0)
      .sort((a, b) => numero(b[1]) - numero(a[1]))

    const total = contarTotal(dadosResposta)

    return (
      <article className="insightCard">
        <h3>{titulo}</h3>

        {entradas.length === 0 ? (
          <p className="muted">Ainda sem respostas suficientes.</p>
        ) : (
          <div className="insightList">
            {entradas.slice(0, 4).map(([chave, valor]) => {
              const pct = percentual(numero(valor), total)

              return (
                <div key={chave} className="insightLine">
                  <div>
                    <span>{respostaBonita(chave)}</span>
                    <strong>{pct}%</strong>
                  </div>
                  <i>
                    <b style={{ width: `${pct}%` }} />
                  </i>
                </div>
              )
            })}
          </div>
        )}
      </article>
    )
  }

  if (carregando) {
    return (
      <main className="page">
        <style>{styles}</style>

        <header className="topbar">
          <div className="topbarInner">
            <div className="headerGhost" aria-hidden="true" />

            <button
              type="button"
              className="brandCenter"
              onClick={() => router.push('/guia/dashboard')}
              aria-label="Voltar para a dashboard do guia"
            >
              <img src="/logo-prussik-display.png" alt="PrussikTrails" className="brandLogo" />
              <span className="brandSubtitle">Avaliações do guia</span>
            </button>

            <div className="headerGhost" aria-hidden="true" />
          </div>
        </header>

        <section className="loadingCard">
          <div className="spinner" />
          <p>Carregando avaliações...</p>
        </section>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{styles}</style>

      <header className="topbar">
        <div className="topbarInner">
          <div className="headerGhost" aria-hidden="true" />

          <button
            type="button"
            className="brandCenter"
            onClick={() => router.push('/guia/dashboard')}
            aria-label="Voltar para a dashboard do guia"
            title="PrussikTrails"
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" className="brandLogo" />
            <span className="brandSubtitle">Avaliações da sua jornada como guia</span>
          </button>

          <button
            type="button"
            className="profileButton"
            onClick={() => router.push('/guia/perfil')}
            aria-label="Abrir perfil do guia"
            title="Perfil"
          >
            {avatarUsuario(user) ? (
              <img src={avatarUsuario(user)} alt={nomeUsuario(user)} />
            ) : (
              <span>{inicialUsuario(user)}</span>
            )}
          </button>
        </div>
      </header>

      <section className="hero">
        <div>
          <span className="eyebrow">Central de reputação</span>
          <h1>
            Avaliações que ajudam sua experiência a evoluir.
          </h1>
          <p>
            Acompanhe a percepção dos aventureiros sobre orientação, segurança e experiência.
            Use esses sinais para aprimorar seus roteiros e sua comunicação.
          </p>
        </div>

        <aside className="heroCard">
          <span>Nota média</span>
          <strong>{mediaGeral ? mediaGeral.toFixed(1) : '0.0'}</strong>
          <p>{totalAvaliacoes} avaliação(ões) registrada(s)</p>
        </aside>
      </section>

      <section className="shell">
        {erro && (
          <div className="alert">
            {erro}
          </div>
        )}

        <section className="statsGrid">
          <article className="statCard">
            <span>Total</span>
            <strong>{totalAvaliacoes}</strong>
            <small>Avaliações recebidas</small>
          </article>

          <article className="statCard">
            <span>Média geral</span>
            <strong>{mediaGeral ? mediaGeral.toFixed(1) : '0.0'}</strong>
            <small>Nota consolidada</small>
          </article>

          <article className="statCard">
            <span>Com comentários</span>
            <strong>{comComentario}</strong>
            <small>Relatos úteis para evolução</small>
          </article>

          <article className="statCard actionStat">
            <span>Atualização</span>
            <button
              type="button"
              onClick={() => carregarAvaliacoes(guiaId)}
              disabled={atualizando}
            >
              {atualizando ? 'Atualizando...' : 'Atualizar'}
            </button>
          </article>
        </section>

        <section className="contentGrid">
          <div className="leftStack">
            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2>Distribuição das notas</h2>
                  <p>Visão rápida da concentração das avaliações.</p>
                </div>
              </div>

              <div className="cardBody">
                {renderDistribuicaoNotas()}
              </div>
            </section>

            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2>Avaliações recentes</h2>
                  <p>Comentários e notas dos aventureiros.</p>
                </div>
              </div>

              <div className="cardBody">
                {avaliacoes.length === 0 ? (
                  <div className="emptyState">
                    <strong>Ainda não há avaliações.</strong>
                    <p>
                      As avaliações aparecerão aqui quando clientes concluírem jornadas
                      e registrarem suas impressões.
                    </p>
                  </div>
                ) : (
                  <div className="reviewsList">
                    {avaliacoes.slice(0, 12).map((item, index) => {
                      const nota = notaAvaliacao(item)
                      const comentario = comentarioAvaliacao(item)

                      return (
                        <article key={item.id || index} className="reviewItem">
                          <div className="reviewTop">
                            <div>
                              <strong>{tituloRoteiro(item)}</strong>
                              <span>
                                {texto(item.cliente_nome || item.cliente_email, 'Aventureiro PrussikTrails')}
                                {item.created_at ? ` · ${formatarData(item.created_at)}` : ''}
                              </span>
                            </div>

                            <div className="stars">
                              {nota ? `${nota.toFixed(1)} ★` : '—'}
                            </div>
                          </div>

                          {comentario ? (
                            <p>{comentario}</p>
                          ) : (
                            <p className="muted">Avaliação sem comentário textual.</p>
                          )}
                        </article>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="rightStack">
            {renderResumoRespostas('Orientações', respostas.orientacoes)}
            {renderResumoRespostas('Segurança', respostas.seguranca)}
            {renderResumoRespostas('Experiência', respostas.experiencia)}
          </aside>
        </section>
      </section>
    </main>
  )
}

const styles = `
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
    padding-bottom: 54px;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(255, 253, 247, 0.91);
    border-bottom: 1px solid rgba(15, 23, 42, 0.06);
    backdrop-filter: blur(18px);
    padding: 8px 14px;
  }

  .topbarInner {
    max-width: 1180px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) 42px;
    align-items: center;
    gap: 10px;
  }

  .headerGhost {
    width: 42px;
    height: 42px;
  }

  .brandCenter {
    min-width: 0;
    border: none;
    background: transparent;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    justify-self: center;
    cursor: pointer;
    padding: 0;
    text-align: center;
    max-width: min(520px, calc(100vw - 120px));
  }

  .brandLogo {
    width: clamp(150px, 34vw, 250px);
    height: auto;
    max-height: 58px;
    object-fit: contain;
    display: block;
  }

  .brandSubtitle {
    display: block;
    color: #7b8375;
    font-size: clamp(8px, 1.05vw, 12px);
    font-weight: 850;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    white-space: nowrap;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: -2px;
  }

  .profileButton {
    width: 42px;
    height: 42px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    background: rgba(255,255,255,0.78);
    color: #172018;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    overflow: hidden;
    padding: 0;
    box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
    font-size: 14px;
    font-weight: 950;
    justify-self: end;
  }

  .profileButton img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .profileButton span {
    width: 100%;
    height: 100%;
    border-radius: 999px;
    background: #172018;
    color: #ffffff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .loadingCard {
    width: min(440px, calc(100% - 28px));
    margin: 80px auto;
    border-radius: 30px;
    background: rgba(255, 253, 247, 0.88);
    border: 1px solid rgba(15, 23, 42, 0.06);
    box-shadow: 0 20px 56px rgba(32, 60, 46, 0.09);
    padding: 28px;
    text-align: center;
    color: #64748b;
    font-weight: 850;
  }

  .spinner {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    border: 4px solid rgba(32, 60, 46, 0.14);
    border-top-color: #991b1b;
    margin: 0 auto 12px;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .hero {
    max-width: 1180px;
    margin: 18px auto 0;
    padding: 30px;
    border-radius: 38px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 24px;
    align-items: end;
    background:
      linear-gradient(135deg, rgba(23, 32, 24, 0.78), rgba(23, 32, 24, 0.36)),
      radial-gradient(circle at top right, rgba(190, 242, 100, 0.30), transparent 34%),
      linear-gradient(135deg, #1f331f 0%, #647a49 46%, #d7c6a1 100%);
    color: #ffffff;
    box-shadow: 0 24px 60px rgba(23, 32, 24, 0.18);
  }

  .eyebrow {
    display: inline-flex;
    margin: 0 0 14px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.24);
    background: rgba(255, 255, 255, 0.12);
    color: #f7fee7;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .hero h1 {
    margin: 0;
    max-width: 760px;
    font-size: clamp(42px, 6vw, 74px);
    line-height: 0.92;
    font-weight: 950;
    letter-spacing: -0.085em;
  }

  .hero p {
    max-width: 660px;
    color: rgba(255, 255, 255, 0.80);
    line-height: 1.62;
    margin: 16px 0 0;
    font-size: 14px;
    font-weight: 700;
  }

  .heroCard {
    background: rgba(255, 255, 255, 0.14);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 30px;
    padding: 20px;
    backdrop-filter: blur(16px);
  }

  .heroCard span {
    color: rgba(255,255,255,0.76);
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.10em;
    text-transform: uppercase;
  }

  .heroCard strong {
    display: block;
    margin-top: 8px;
    color: #bef264;
    font-size: 50px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.08em;
  }

  .heroCard p {
    margin: 8px 0 0;
    color: rgba(255,255,255,0.76);
    font-size: 12px;
    line-height: 1.45;
  }

  .shell {
    max-width: 1180px;
    margin: 16px auto 0;
    padding: 0 0 40px;
  }

  .alert {
    border-radius: 18px;
    background: rgba(153, 27, 27, 0.08);
    border: 1px solid rgba(153, 27, 27, 0.16);
    color: #7f1d1d;
    padding: 12px 14px;
    font-size: 13px;
    font-weight: 850;
    margin-bottom: 16px;
  }

  .statsGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 16px;
  }

  .statCard,
  .card,
  .insightCard {
    background: rgba(255, 253, 247, 0.88);
    border: 1px solid rgba(15, 23, 42, 0.06);
    border-radius: 30px;
    box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
  }

  .statCard {
    padding: 20px;
    min-height: 130px;
  }

  .statCard span {
    display: block;
    color: #7b8372;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.10em;
  }

  .statCard strong {
    display: block;
    margin-top: 8px;
    color: #203c2e;
    font-size: 36px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.07em;
  }

  .statCard small {
    display: block;
    margin-top: 8px;
    color: #64748b;
    font-size: 12px;
    line-height: 1.35;
    font-weight: 750;
  }

  .actionStat button {
    margin-top: 18px;
    border: none;
    border-radius: 999px;
    background: #172018;
    color: #ffffff;
    padding: 12px 16px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
    width: 100%;
  }

  .actionStat button:disabled {
    opacity: 0.62;
    cursor: not-allowed;
  }

  .contentGrid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 16px;
    align-items: start;
  }

  .leftStack,
  .rightStack {
    display: grid;
    gap: 16px;
  }

  .card {
    overflow: hidden;
  }

  .cardHeader {
    padding: 18px 20px;
    border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  }

  .cardHeader h2,
  .insightCard h3 {
    margin: 0;
    color: #172018;
    font-size: 20px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.045em;
  }

  .cardHeader p {
    margin: 5px 0 0;
    color: #64748b;
    font-size: 12px;
    font-weight: 750;
  }

  .cardBody {
    padding: 18px;
  }

  .ratingBars {
    display: grid;
    gap: 10px;
  }

  .ratingBar {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr) 34px;
    gap: 10px;
    align-items: center;
  }

  .ratingBar span,
  .ratingBar strong {
    color: #203c2e;
    font-size: 12px;
    font-weight: 950;
  }

  .ratingBar strong {
    text-align: right;
  }

  .ratingBar div {
    height: 12px;
    border-radius: 999px;
    background: rgba(32, 60, 46, 0.08);
    overflow: hidden;
  }

  .ratingBar i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #365314, #84cc16, #d4b35a);
  }

  .reviewsList {
    display: grid;
    gap: 12px;
  }

  .reviewItem {
    border-radius: 24px;
    background: rgba(32, 60, 46, 0.045);
    border: 1px solid rgba(15, 23, 42, 0.05);
    padding: 14px;
  }

  .reviewTop {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
  }

  .reviewTop strong {
    display: block;
    color: #172018;
    font-size: 14px;
    line-height: 1.25;
    font-weight: 950;
  }

  .reviewTop span {
    display: block;
    margin-top: 4px;
    color: #64748b;
    font-size: 11px;
    line-height: 1.35;
    font-weight: 750;
  }

  .stars {
    flex: 0 0 auto;
    border-radius: 999px;
    background: rgba(212, 179, 90, 0.18);
    color: #854d0e;
    padding: 7px 10px;
    font-size: 12px;
    font-weight: 950;
  }

  .reviewItem p {
    margin: 10px 0 0;
    color: rgba(23, 32, 24, 0.72);
    font-size: 13px;
    line-height: 1.55;
    font-weight: 720;
  }

  .muted {
    color: #64748b !important;
  }

  .emptyState {
    border-radius: 24px;
    background: rgba(32, 60, 46, 0.045);
    border: 1px dashed rgba(15, 23, 42, 0.12);
    padding: 24px;
    text-align: center;
  }

  .emptyState strong {
    color: #203c2e;
    font-size: 15px;
    font-weight: 950;
  }

  .emptyState p {
    margin: 8px 0 0;
    color: #64748b;
    font-size: 13px;
    line-height: 1.5;
    font-weight: 750;
  }

  .insightCard {
    padding: 18px;
  }

  .insightCard h3 {
    font-size: 18px;
    margin-bottom: 14px;
  }

  .insightList {
    display: grid;
    gap: 13px;
  }

  .insightLine div {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: center;
    margin-bottom: 7px;
  }

  .insightLine span {
    color: #475569;
    font-size: 12px;
    font-weight: 850;
  }

  .insightLine strong {
    color: #203c2e;
    font-size: 12px;
    font-weight: 950;
  }

  .insightLine i {
    display: block;
    height: 10px;
    border-radius: 999px;
    background: rgba(32, 60, 46, 0.08);
    overflow: hidden;
  }

  .insightLine b {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #203c2e, #84cc16);
  }

  @media (max-width: 1180px) {
    .hero,
    .shell {
      margin-left: 14px;
      margin-right: 14px;
    }
  }

  @media (max-width: 940px) {
    .hero,
    .contentGrid {
      grid-template-columns: 1fr;
    }

    .statsGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .rightStack {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .topbar {
      padding: 7px 10px;
    }

    .topbarInner {
      grid-template-columns: 36px minmax(0, 1fr) 36px;
      gap: 8px;
    }

    .headerGhost,
    .profileButton {
      width: 36px;
      height: 36px;
      box-shadow: none;
    }

    .brandCenter {
      max-width: calc(100vw - 92px);
    }

    .brandLogo {
      width: clamp(134px, 46vw, 210px);
      max-height: 50px;
    }

    .brandSubtitle {
      font-size: 7.5px;
      letter-spacing: 0.10em;
      max-width: calc(100vw - 112px);
    }

    .hero {
      margin-top: 10px;
      border-radius: 26px;
      padding: 22px;
    }

    .hero h1 {
      font-size: 40px;
      letter-spacing: -0.075em;
    }

    .hero p {
      font-size: 13px;
      line-height: 1.52;
    }

    .heroCard {
      border-radius: 24px;
      padding: 16px;
    }

    .statsGrid,
    .rightStack {
      grid-template-columns: 1fr;
    }

    .statCard,
    .card,
    .insightCard {
      border-radius: 24px;
    }

    .contentGrid {
      gap: 12px;
    }

    .reviewTop {
      flex-direction: column;
    }

    .stars {
      width: fit-content;
    }
  }
`
