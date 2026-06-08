'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type AnyRecord = Record<string, any>

type UsuarioLocal = {
  id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  cliente_id?: string | null
  nome?: string | null
  name?: string | null
  email?: string | null
  tipo?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
}

type GrupoCliente = AnyRecord

type AbaGrupos = 'ativos' | 'todos' | 'historico'

const statsInicial = {
  totalGrupos: 0,
  gruposAtivos: 0,
  mensagens: 0,
  notificacoesNaoLidas: 0,
  participantes: 0,
  historico: 0
}

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

function extrairUsuarioId(usuario: UsuarioLocal | null) {
  return texto(usuario?.id || usuario?.user_id || usuario?.usuario_id || usuario?.cliente_id)
}

function primeiroNome(usuario?: UsuarioLocal | null) {
  const nome = texto(usuario?.nome || usuario?.name || usuario?.email)
  return nome.split(' ')[0] || 'aventureiro'
}

function avatarUsuario(usuario?: UsuarioLocal | null) {
  return texto(usuario?.avatar_url || usuario?.foto_url || usuario?.imagem_url)
}

function inicialUsuario(usuario?: UsuarioLocal | null) {
  return primeiroNome(usuario).slice(0, 1).toUpperCase()
}

function isPagoGrupo(grupo: GrupoCliente) {
  if (grupo?.reserva_pago === true) return true

  const pagamento = normalizar(
    grupo?.reserva_pagamento_status ||
      grupo?.reserva?.pagamento_status ||
      grupo?.reserva?.status_pagamento ||
      grupo?.reserva?.payment_status
  )
  const status = normalizar(grupo?.reserva_status || grupo?.reserva?.status)

  return (
    pagamento === 'pago' ||
    pagamento === 'paid' ||
    pagamento === 'confirmado' ||
    pagamento === 'confirmada' ||
    pagamento === 'aprovado' ||
    pagamento === 'approved' ||
    status === 'pago' ||
    status === 'paga' ||
    status === 'confirmado' ||
    status === 'confirmada' ||
    status === 'realizada' ||
    status === 'realizado'
  )
}

function dataJaPassou(valor: unknown) {
  if (!valor) return false

  const data = new Date(String(valor))
  if (Number.isNaN(data.getTime())) return false

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const base = new Date(data)
  base.setHours(0, 0, 0, 0)

  return base.getTime() < hoje.getTime()
}

function grupoHistorico(grupo: GrupoCliente) {
  const status = normalizar(grupo?.status)
  return Boolean(grupo?.historico) || status === 'encerrado' || status === 'arquivado' || dataJaPassou(grupo?.roteiro_data)
}

function formatarData(valor: unknown) {
  if (!valor) return 'Data a confirmar'

  const data = new Date(String(valor))
  if (Number.isNaN(data.getTime())) return 'Data a confirmar'

  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function formatarHora(valor: unknown) {
  if (!valor) return ''

  const raw = String(valor)
  if (/^\d{2}:\d{2}/.test(raw)) return raw.slice(0, 5)

  const data = new Date(raw)
  if (Number.isNaN(data.getTime())) return ''

  return data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function tempoRelativo(valor?: string | null) {
  if (!valor) return ''

  const data = new Date(valor).getTime()
  if (Number.isNaN(data)) return ''

  const diff = Date.now() - data
  const minutos = Math.floor(diff / 60000)
  const horas = Math.floor(minutos / 60)
  const dias = Math.floor(horas / 24)

  if (minutos < 1) return 'agora'
  if (minutos < 60) return `${minutos}min atrás`
  if (horas < 24) return `${horas}h atrás`
  if (dias === 1) return 'ontem'
  if (dias < 7) return `${dias} dias atrás`

  return formatarData(valor)
}

function imagemGrupo(grupo: GrupoCliente) {
  return texto(
    grupo?.roteiro_foto ||
      grupo?.roteiro?.foto_capa ||
      grupo?.roteiro?.foto_url ||
      grupo?.roteiro?.imagem_url ||
      grupo?.roteiro?.imagem ||
      grupo?.roteiro?.image_url
  )
}

function tituloGrupo(grupo: GrupoCliente) {
  return texto(grupo?.roteiro_titulo || grupo?.roteiro?.titulo || grupo?.roteiro?.nome || grupo?.titulo) || 'Grupo da experiência'
}

function localGrupo(grupo: GrupoCliente) {
  return texto(
    grupo?.roteiro_local ||
      grupo?.roteiro?.local ||
      grupo?.roteiro?.localizacao ||
      grupo?.roteiro?.cidade ||
      grupo?.roteiro?.local_encontro ||
      grupo?.roteiro?.ponto_encontro
  ) || 'Local a confirmar'
}

export default function ClienteGruposPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [grupos, setGrupos] = useState<GrupoCliente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [busca, setBusca] = useState('')
  const [aba, setAba] = useState<AbaGrupos>('ativos')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('')
  const [stats, setStats] = useState(statsInicial)

  useEffect(() => {
    if (iniciouRef.current) return

    iniciouRef.current = true
    iniciar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function iniciar() {
    try {
      setCarregando(true)
      setErro('')
      setMensagem('')

      const salvo = localStorage.getItem('user')
      const usuario = salvo ? (JSON.parse(salvo) as UsuarioLocal) : null
      const usuarioId = extrairUsuarioId(usuario)

      if (!usuario || !usuarioId || normalizar(usuario.tipo) !== 'cliente') {
        router.replace('/login')
        return
      }

      const usuarioNormalizado: UsuarioLocal = { ...usuario, id: usuarioId }
      setUser(usuarioNormalizado)

      await carregarGrupos(usuarioId)

      const grupoIdDireto =
        typeof window !== 'undefined'
          ? texto(new URLSearchParams(window.location.search).get('grupoId'))
          : ''

      if (grupoIdDireto) {
        router.replace(`/cliente/grupos/${grupoIdDireto}`)
      }
    } catch (error) {
      console.error('Erro ao iniciar grupos do cliente:', error)
      setErro(error instanceof Error ? error.message : 'Não foi possível carregar seus grupos agora.')
    } finally {
      setCarregando(false)
    }
  }

  async function carregarGrupos(clienteId: string) {
    const response = await fetch('/api/grupos/listar-cliente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ clienteId })
    })

    const data = await response.json().catch(() => null)

    if (!response.ok || !data?.sucesso) {
      throw new Error(data?.erro || data?.message || 'Não foi possível buscar seus grupos.')
    }

    const gruposPagos = Array.isArray(data.grupos)
      ? (data.grupos as GrupoCliente[]).filter(isPagoGrupo)
      : []

    setGrupos(gruposPagos)

    const ativos = gruposPagos.filter((grupo) => !grupoHistorico(grupo)).length
    const historico = gruposPagos.filter(grupoHistorico).length

    setStats({
      totalGrupos: gruposPagos.length,
      gruposAtivos: Number(data?.stats?.gruposAtivos ?? ativos),
      mensagens: Number(data?.stats?.mensagens || 0),
      notificacoesNaoLidas: Number(data?.stats?.notificacoesNaoLidas || 0),
      participantes: Number(data?.stats?.participantes || 0),
      historico: Number(data?.stats?.historico ?? historico)
    })

    setUltimaAtualizacao(data?.ultimaAtualizacao || new Date().toLocaleTimeString('pt-BR'))
  }

  async function atualizar() {
    const clienteId = extrairUsuarioId(user)
    if (!clienteId) return

    try {
      setAtualizando(true)
      setErro('')
      setMensagem('')
      await carregarGrupos(clienteId)
      setMensagem('Grupos atualizados.')
    } catch (error) {
      console.error('Erro ao atualizar grupos:', error)
      setErro(error instanceof Error ? error.message : 'Não foi possível atualizar seus grupos agora.')
    } finally {
      setAtualizando(false)
    }
  }

  function abrirGrupo(grupo: GrupoCliente) {
    if (!grupo?.id || !isPagoGrupo(grupo)) return
    router.push(`/cliente/grupos/${grupo.id}`)
  }

  const gruposPagos = useMemo(() => {
    return grupos.filter(isPagoGrupo)
  }, [grupos])

  const gruposAtivos = useMemo(() => {
    return gruposPagos.filter((grupo) => !grupoHistorico(grupo))
  }, [gruposPagos])

  const gruposHistorico = useMemo(() => {
    return gruposPagos.filter(grupoHistorico)
  }, [gruposPagos])

  const gruposFiltrados = useMemo(() => {
    const termo = normalizar(busca)
    const base = aba === 'ativos' ? gruposAtivos : aba === 'historico' ? gruposHistorico : gruposPagos

    if (!termo) return base

    return base.filter((grupo) => {
      const alvo = normalizar([
        grupo.titulo,
        grupo.roteiro_titulo,
        grupo.roteiro_local,
        grupo.roteiro?.titulo,
        grupo.roteiro?.nome,
        grupo.roteiro?.local,
        grupo.ultima_mensagem?.mensagem
      ].join(' '))

      return alvo.includes(termo)
    })
  }, [aba, busca, gruposAtivos, gruposHistorico, gruposPagos])

  if (carregando) {
    return (
      <main className="loadingScreen">
        <style>{loadingStyles}</style>
        <img src="/logo-prussik-display.png" alt="PrussikTrails" />
        <div className="spinner" />
        <p>Carregando seus grupos...</p>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{styles}</style>

      <header className="topbar">
        <div className="topbarInner">
          <button
            type="button"
            className="backButton"
            onClick={() => router.push('/cliente/minhas-reservas')}
            aria-label="Voltar para minhas reservas"
          >
            ‹
          </button>

          <button
            type="button"
            className="brand"
            onClick={() => router.push('/cliente/dashboard')}
            aria-label="Voltar para a dashboard do cliente"
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />
            <span>Grupos das experiências</span>
          </button>

          <button
            type="button"
            className="profileButton"
            onClick={() => router.push('/cliente/perfil')}
            title="Perfil"
            aria-label="Abrir perfil"
          >
            {avatarUsuario(user) ? (
              <img src={avatarUsuario(user)} alt={user?.nome || user?.name || user?.email || 'Perfil'} />
            ) : (
              <span>{inicialUsuario(user)}</span>
            )}
          </button>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroTextBlock">
            <div className="eyebrow">Comunidade da aventura</div>
            <h1>
              {primeiroNome(user)}, seus grupos ficam <span>por aqui.</span>
            </h1>
            <p>
              Aqui aparecem somente grupos de roteiros com pagamento confirmado. Acesse avisos do guia,
              combine detalhes da experiência e acompanhe a preparação da sua jornada.
            </p>
          </div>

          <aside className="heroCard">
            <div className="heroCardLabel">Grupos liberados</div>
            <div className="heroCardValue">{gruposPagos.length}</div>
            <div className="heroCardText">
              {ultimaAtualizacao ? `Atualizado às ${ultimaAtualizacao}.` : 'Acesso liberado após pagamento.'}
            </div>
          </aside>
        </section>

        {mensagem && <div className="message">{mensagem}</div>}
        {erro && <div className="error">{erro}</div>}

        <section className="summaryCard" aria-label="Resumo dos grupos do cliente">
          <button
            type="button"
            className={aba === 'ativos' ? 'summaryItem active' : 'summaryItem'}
            onClick={() => setAba('ativos')}
          >
            <strong>{gruposAtivos.length}</strong>
            <span>Ativos agora</span>
          </button>

          <button
            type="button"
            className={aba === 'todos' ? 'summaryItem active' : 'summaryItem'}
            onClick={() => setAba('todos')}
          >
            <strong>{stats.totalGrupos}</strong>
            <span>Pagos/liberados</span>
          </button>

          <button
            type="button"
            className={aba === 'historico' ? 'summaryItem active' : 'summaryItem'}
            onClick={() => setAba('historico')}
          >
            <strong>{gruposHistorico.length}</strong>
            <span>Histórico</span>
          </button>

          <div className="summaryItem passive">
            <strong>{stats.notificacoesNaoLidas}</strong>
            <span>Avisos novos</span>
          </div>
        </section>

        <section className="toolbar">
          <div className="searchWrap">
            <span>⌕</span>
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por roteiro, cidade, local ou mensagem..."
            />
          </div>

          <button type="button" onClick={atualizar} disabled={atualizando}>
            {atualizando ? 'Atualizando...' : 'Atualizar'}
          </button>
        </section>

        {gruposFiltrados.length === 0 ? (
          <section className="empty">
            <div className="emptyIcon">💬</div>
            <h2>
              {gruposPagos.length === 0 ? 'Nenhum grupo liberado ainda' : 'Nenhum grupo neste filtro'}
            </h2>
            <p>
              {gruposPagos.length === 0
                ? 'Os grupos aparecem aqui depois que o pagamento da reserva é confirmado pelo sistema.'
                : 'Tente mudar o filtro ou buscar por outro roteiro.'}
            </p>
            <button type="button" onClick={() => router.push('/cliente/minhas-reservas')}>
              Ver minhas reservas
            </button>
          </section>
        ) : (
          <section className="grid">
            {gruposFiltrados.map((grupo) => {
              const foto = imagemGrupo(grupo)
              const data = grupo.roteiro_data || grupo.roteiro?.data_roteiro || grupo.roteiro?.data_saida || grupo.roteiro?.data
              const hora = grupo.roteiro_hora || grupo.roteiro?.hora_roteiro || grupo.roteiro?.hora_saida || grupo.roteiro?.hora
              const historico = grupoHistorico(grupo)
              const notificacoes = Number(grupo.notificacoes_nao_lidas || 0)

              return (
                <article className="groupCard" key={grupo.id} onClick={() => abrirGrupo(grupo)}>
                  <div className="imageBox">
                    {foto ? <img src={foto} alt={tituloGrupo(grupo)} /> : <div className="imageFallback">Prussik</div>}
                    <div className="imageOverlay" />

                    <div className={historico ? 'statusPill muted' : 'statusPill'}>
                      {historico ? 'Histórico' : 'Liberado'}
                    </div>

                    {notificacoes > 0 && <div className="alertPill">{notificacoes} novo(s)</div>}

                    <div className="datePill">
                      {formatarData(data)}
                      {formatarHora(hora) && <small>{formatarHora(hora)}</small>}
                    </div>
                  </div>

                  <div className="cardBody">
                    <div className="paidLine">Reserva paga · grupo oficial</div>
                    <h2>{tituloGrupo(grupo)}</h2>
                    <p>{localGrupo(grupo)}</p>

                    <div className="miniGrid">
                      <div>
                        <strong>{grupo.membros_count || 0}</strong>
                        <span>participantes</span>
                      </div>
                      <div>
                        <strong>{grupo.mensagens_count || 0}</strong>
                        <span>mensagens</span>
                      </div>
                    </div>

                    <div className="lastMessage">
                      {grupo.ultima_mensagem?.mensagem ? (
                        <>
                          <strong>Última mensagem:</strong>{' '}
                          {String(grupo.ultima_mensagem.mensagem).slice(0, 120)}
                          {String(grupo.ultima_mensagem.mensagem).length > 120 ? '...' : ''}
                          <br />
                          <span>{tempoRelativo(grupo.ultima_mensagem.created_at)}</span>
                        </>
                      ) : (
                        'Nenhuma mensagem enviada ainda.'
                      )}
                    </div>

                    <div className="openHint">Abrir grupo ›</div>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}

const loadingStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  .loadingScreen {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    background:
      radial-gradient(circle at 10% 0%, rgba(132,204,22,.16), transparent 28%),
      radial-gradient(circle at 90% 10%, rgba(251,146,60,.14), transparent 28%),
      linear-gradient(180deg,#fffdf7,#eef2e5);
    color: #203c2e;
    font-family: Inter, system-ui, sans-serif;
    font-weight: 900;
  }
  .loadingScreen img {
    width: 150px;
    height: auto;
    object-fit: contain;
    filter: drop-shadow(0 8px 18px rgba(32,60,46,.10));
  }
  .spinner {
    width: 44px;
    height: 44px;
    border-radius: 999px;
    border: 4px solid rgba(32,60,46,.12);
    border-top-color: #dc2626;
    animation: spin .9s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`

const styles = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #fffdf7; }
  button, input { font: inherit; }
  .page {
    min-height: 100vh;
    min-height: 100dvh;
    color: #172018;
    background:
      radial-gradient(circle at 10% 0%, rgba(132,204,22,.16), transparent 28%),
      radial-gradient(circle at 90% 10%, rgba(251,146,60,.14), transparent 28%),
      linear-gradient(180deg,#fffdf7 0%,#f3f5ea 48%,#eef2e5 100%);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  .topbar {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(255,253,247,.92);
    border-bottom: 1px solid rgba(15,23,42,.06);
    backdrop-filter: blur(18px);
    padding: 9px 14px;
  }
  .topbarInner {
    max-width: 1180px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 42px minmax(0,1fr) 42px;
    align-items: center;
    gap: 10px;
  }
  .backButton,
  .profileButton {
    width: 42px;
    height: 42px;
    border-radius: 999px;
    border: 1px solid rgba(15,23,42,.08);
    background: rgba(255,255,255,.86);
    color: #203c2e;
    box-shadow: 0 10px 22px rgba(15,23,42,.08);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    font-weight: 850;
    line-height: 1;
    padding: 0;
    overflow: hidden;
  }
  .profileButton { font-size: 14px; font-weight: 950; }
  .profileButton img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .brand {
    justify-self: center;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-width: 0;
    max-width: min(520px, calc(100vw - 120px));
    border: 0;
    background: transparent;
    padding: 0;
    text-align: center;
    cursor: pointer;
    color: #172018;
  }
  .brand img {
    width: clamp(136px, 31vw, 230px);
    height: auto;
    max-height: 56px;
    object-fit: contain;
    display: block;
    filter: drop-shadow(0 8px 18px rgba(32,60,46,.08));
  }
  .brand span {
    display: block;
    color: #7b8375;
    font-size: clamp(8px,1.05vw,12px);
    font-weight: 850;
    letter-spacing: .18em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .container { max-width: 1180px; margin: 0 auto; padding: 22px 16px 56px; }
  .hero {
    border-radius: 34px;
    padding: 28px;
    background:
      linear-gradient(135deg, rgba(32,60,46,.97), rgba(64,85,44,.92)),
      radial-gradient(circle at 90% 10%, rgba(212,179,90,.24), transparent 38%);
    color: #fffdf7;
    box-shadow: 0 28px 70px rgba(32,60,46,.18);
    overflow: hidden;
    display: grid;
    grid-template-columns: minmax(0,1fr) minmax(220px, 290px);
    gap: 20px;
    align-items: end;
    position: relative;
  }
  .hero::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px);
    background-size: 44px 44px;
    mask-image: linear-gradient(to bottom, rgba(0,0,0,.8), transparent);
    pointer-events: none;
  }
  .heroTextBlock,
  .heroCard { position: relative; z-index: 2; }
  .eyebrow { color: #d4b35a; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: .16em; margin-bottom: 12px; }
  .hero h1 { margin: 0; max-width: 780px; font-size: clamp(38px,5vw,68px); line-height: .9; letter-spacing: -.065em; font-weight: 950; }
  .hero h1 span { color: #d4b35a; }
  .hero p { max-width: 710px; margin: 18px 0 0; color: rgba(255,253,247,.78); font-size: 15px; line-height: 1.65; font-weight: 650; }
  .heroCard { border-radius: 28px; padding: 20px; background: rgba(255,253,247,.12); border: 1px solid rgba(255,253,247,.18); backdrop-filter: blur(16px); }
  .heroCardLabel { color: rgba(255,253,247,.68); font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .12em; }
  .heroCardValue { margin-top: 10px; font-size: 42px; line-height: 1; font-weight: 950; letter-spacing: -.055em; color: #fffdf7; }
  .heroCardText { margin-top: 8px; color: rgba(255,253,247,.72); font-size: 12px; line-height: 1.45; font-weight: 700; }
  .message,
  .error { margin-top: 16px; border-radius: 22px; padding: 14px 16px; font-size: 13px; font-weight: 850; }
  .message { background: rgba(22,163,74,.09); border: 1px solid rgba(22,163,74,.18); color: #166534; }
  .error { background: rgba(153,27,27,.08); border: 1px solid rgba(153,27,27,.18); color: #7f1d1d; }
  .summaryCard {
    margin-top: 16px;
    border-radius: 28px;
    padding: 14px;
    background: rgba(255,255,255,.78);
    border: 1px solid rgba(32,60,46,.08);
    box-shadow: 0 18px 42px rgba(32,60,46,.08);
    display: grid;
    grid-template-columns: repeat(4,minmax(0,1fr));
    gap: 10px;
  }
  .summaryItem {
    border: 1px solid rgba(32,60,46,.08);
    border-radius: 20px;
    background: rgba(255,253,247,.78);
    padding: 13px;
    text-align: left;
    cursor: pointer;
    color: #172018;
  }
  .summaryItem.passive { cursor: default; }
  .summaryItem.active { background: #203c2e; color: #fffdf7; border-color: #203c2e; box-shadow: 0 14px 28px rgba(32,60,46,.16); }
  .summaryItem strong { display: block; font-size: 24px; line-height: 1; font-weight: 950; letter-spacing: -.04em; }
  .summaryItem span { display: block; margin-top: 5px; color: #64748b; font-size: 11px; line-height: 1.25; font-weight: 900; }
  .summaryItem.active span { color: rgba(255,253,247,.76); }
  .toolbar {
    margin-top: 16px;
    border-radius: 28px;
    padding: 14px;
    background: rgba(255,255,255,.78);
    border: 1px solid rgba(32,60,46,.08);
    display: grid;
    grid-template-columns: minmax(0,1fr) auto;
    gap: 10px;
    box-shadow: 0 14px 34px rgba(32,60,46,.06);
  }
  .searchWrap { position: relative; display: flex; align-items: center; }
  .searchWrap span { position: absolute; left: 15px; color: #7b8375; font-weight: 950; }
  .searchWrap input { width: 100%; border: 1px solid rgba(32,60,46,.10); border-radius: 999px; padding: 13px 15px 13px 38px; background: #fffdf7; color: #172018; outline: none; font-weight: 800; }
  .searchWrap input:focus { border-color: rgba(32,60,46,.26); box-shadow: 0 0 0 4px rgba(32,60,46,.08); }
  .toolbar button,
  .empty button {
    border: 0;
    border-radius: 999px;
    padding: 12px 16px;
    background: #203c2e;
    color: #fffdf7;
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
    box-shadow: 0 14px 26px rgba(32,60,46,.15);
  }
  .toolbar button:disabled { opacity: .6; cursor: wait; box-shadow: none; }
  .grid { margin-top: 16px; display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 16px; }
  .groupCard {
    border-radius: 30px;
    overflow: hidden;
    background: rgba(255,255,255,.86);
    border: 1px solid rgba(32,60,46,.08);
    box-shadow: 0 18px 44px rgba(32,60,46,.08);
    cursor: pointer;
    transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
  }
  .groupCard:hover { transform: translateY(-3px); border-color: rgba(32,60,46,.18); box-shadow: 0 24px 56px rgba(32,60,46,.12); }
  .imageBox { position: relative; height: 218px; overflow: hidden; background: linear-gradient(135deg,#dbe7c8,#aebf8d); display: flex; align-items: center; justify-content: center; color: #64748b; font-weight: 950; }
  .imageBox img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .imageFallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #203c2e; background: radial-gradient(circle at 100% 0%, rgba(132,204,22,.16), transparent 38%), #eef2e5; font-size: 22px; letter-spacing: -.04em; }
  .imageOverlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,.46), transparent 58%); }
  .statusPill,
  .alertPill,
  .datePill { position: absolute; z-index: 2; border-radius: 999px; padding: 7px 10px; font-size: 11px; font-weight: 950; }
  .statusPill { top: 14px; left: 14px; background: rgba(236,253,245,.96); color: #166534; }
  .statusPill.muted { background: rgba(241,245,249,.96); color: #475569; }
  .alertPill { top: 14px; right: 14px; background: #dc2626; color: #fff; }
  .datePill { right: 14px; bottom: 14px; background: rgba(255,255,255,.94); color: #172018; display: grid; text-align: center; border-radius: 18px; box-shadow: 0 10px 24px rgba(15,23,42,.16); }
  .datePill small { margin-top: 2px; color: #64748b; font-size: 10px; }
  .cardBody { padding: 17px; }
  .paidLine { width: fit-content; border-radius: 999px; background: rgba(22,163,74,.09); color: #166534; padding: 7px 10px; font-size: 10px; font-weight: 950; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 10px; }
  .cardBody h2 { margin: 0; color: #172018; font-size: 22px; line-height: 1.08; font-weight: 950; letter-spacing: -.045em; overflow-wrap: anywhere; }
  .cardBody p { margin: 8px 0 0; color: #64748b; font-size: 13px; line-height: 1.4; font-weight: 780; overflow-wrap: anywhere; }
  .miniGrid { margin-top: 14px; display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; }
  .miniGrid div { border-radius: 18px; padding: 12px; background: #fffdf7; border: 1px solid rgba(32,60,46,.07); }
  .miniGrid strong { display: block; color: #203c2e; font-size: 22px; line-height: 1; font-weight: 950; }
  .miniGrid span { display: block; margin-top: 4px; color: #64748b; font-size: 11px; font-weight: 850; }
  .lastMessage { margin-top: 14px; border-radius: 20px; padding: 12px; background: #f6f7f1; border: 1px solid rgba(32,60,46,.07); color: #64748b; font-size: 12px; line-height: 1.45; font-weight: 720; }
  .lastMessage strong { color: #203c2e; }
  .lastMessage span { color: #94a3b8; font-weight: 850; }
  .openHint { margin-top: 14px; color: #203c2e; font-size: 13px; font-weight: 950; }
  .empty { margin-top: 16px; border-radius: 30px; padding: 34px; text-align: center; background: rgba(255,255,255,.78); border: 1px dashed rgba(32,60,46,.18); box-shadow: 0 18px 44px rgba(32,60,46,.06); }
  .emptyIcon { width: 62px; height: 62px; border-radius: 24px; background: #eef2e5; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; font-size: 27px; }
  .empty h2 { margin: 0; color: #203c2e; font-size: 26px; font-weight: 950; letter-spacing: -.05em; }
  .empty p { color: #64748b; font-size: 14px; font-weight: 760; line-height: 1.55; max-width: 520px; margin: 10px auto 18px; }
  @media (max-width: 940px) {
    .hero,
    .grid { grid-template-columns: 1fr; }
    .summaryCard { grid-template-columns: repeat(2,minmax(0,1fr)); }
  }
  @media (max-width: 680px) {
    .container { padding: 14px 12px 40px; }
    .topbar { padding: 7px 10px; }
    .topbarInner { grid-template-columns: 36px minmax(0,1fr) 36px; gap: 8px; }
    .backButton,
    .profileButton { width: 36px; height: 36px; box-shadow: none; }
    .backButton { font-size: 24px; }
    .brand { gap: 4px; max-width: calc(100vw - 92px); overflow: hidden; }
    .brand img { width: clamp(126px,45vw,198px); max-height: 48px; }
    .brand span { font-size: 7.5px; letter-spacing: .12em; max-width: calc(100vw - 112px); overflow: hidden; text-overflow: ellipsis; }
    .hero { border-radius: 28px; padding: 22px; gap: 18px; }
    .hero h1 { font-size: 39px; }
    .hero p { font-size: 13.5px; line-height: 1.55; }
    .heroCard { border-radius: 24px; padding: 16px; }
    .heroCardValue { font-size: 34px; }
    .summaryCard { border-radius: 24px; padding: 12px; gap: 8px; }
    .summaryItem { border-radius: 18px; padding: 12px; }
    .summaryItem strong { font-size: 22px; }
    .summaryItem span { font-size: 10px; }
    .toolbar { grid-template-columns: 1fr; border-radius: 24px; }
    .toolbar button { width: 100%; }
    .imageBox { height: 198px; }
    .cardBody { padding: 15px; }
    .cardBody h2 { font-size: 20px; }
  }
  @media (max-width: 390px) {
    .hero h1 { font-size: 35px; }
    .summaryCard { grid-template-columns: 1fr 1fr; }
    .miniGrid { grid-template-columns: 1fr; }
  }
`
