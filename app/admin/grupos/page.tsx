'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type AnyRecord = Record<string, any>

type UsuarioLocal = {
  id?: string | null
  nome?: string | null
  name?: string | null
  email?: string | null
  tipo?: string | null
}

type GrupoCompleto = AnyRecord & {
  id: string
  roteiro_id?: string | null
  guia_id?: string | null
  titulo?: string | null
  nome?: string | null
  descricao?: string | null
  status?: string | null
  ativo?: boolean | null
  created_at?: string | null
  updated_at?: string | null
  roteiro?: AnyRecord | null
  guia?: AnyRecord | null
  membros?: AnyRecord[]
  mensagens?: AnyRecord[]
  roteiro_titulo?: string
  roteiro_local?: string
  roteiro_data?: string | null
  roteiro_hora?: string | null
  roteiro_foto?: string
  guia_nome?: string
  total_membros?: number
  total_clientes?: number
  total_mensagens?: number
  ultima_mensagem?: AnyRecord | null
  ultima_mensagem_em?: string | null
  ativo_calculado?: boolean
  historico?: boolean
}

type FiltroStatus = 'atuais' | 'historico' | 'todos' | 'com_membros' | 'vazios'

type Stats = {
  total: number
  ativos: number
  pausados: number
  historico: number
  gruposMes: number
  membrosTotal: number
  mensagensTotal: number
  gruposVazios: number
  gruposComMembros: number
}

const statsInicial: Stats = {
  total: 0,
  ativos: 0,
  pausados: 0,
  historico: 0,
  gruposMes: 0,
  membrosTotal: 0,
  mensagensTotal: 0,
  gruposVazios: 0,
  gruposComMembros: 0,
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
  return texto(usuario?.id)
}

function nomeUsuario(usuario?: UsuarioLocal | AnyRecord | null) {
  return texto(usuario?.nome || usuario?.name || usuario?.email) || 'Admin'
}

function primeiroNome(usuario?: UsuarioLocal | null) {
  return nomeUsuario(usuario).split(' ')[0] || 'Admin'
}

function tituloGrupo(grupo?: GrupoCompleto | null) {
  return texto(grupo?.titulo || grupo?.nome || grupo?.roteiro_titulo) || 'Grupo do roteiro'
}

function tituloRoteiro(grupo?: GrupoCompleto | null) {
  return texto(grupo?.roteiro_titulo || grupo?.roteiro?.titulo || grupo?.roteiro?.nome) || 'Roteiro PrussikTrails'
}

function localRoteiro(grupo?: GrupoCompleto | null) {
  return texto(grupo?.roteiro_local || grupo?.roteiro?.local || grupo?.roteiro?.localizacao || grupo?.roteiro?.cidade) || 'Local a confirmar'
}

function fotoRoteiro(grupo?: GrupoCompleto | null) {
  return texto(grupo?.roteiro_foto || grupo?.roteiro?.foto_capa || grupo?.roteiro?.foto_url || grupo?.roteiro?.imagem_url || grupo?.roteiro?.imagem)
}

function dataRoteiro(grupo?: GrupoCompleto | null) {
  return grupo?.roteiro_data || grupo?.roteiro?.data_roteiro || grupo?.roteiro?.data_saida || grupo?.roteiro?.data || null
}

function horaRoteiro(grupo?: GrupoCompleto | null) {
  return grupo?.roteiro_hora || grupo?.roteiro?.hora_roteiro || grupo?.roteiro?.hora_saida || grupo?.roteiro?.hora || null
}

function formatarData(valor?: string | null) {
  if (!valor) return 'Data a confirmar'

  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return 'Data a confirmar'

  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatarDataHora(valor?: string | null) {
  if (!valor) return '-'

  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return '-'

  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatarHora(valor?: string | null) {
  if (!valor) return ''
  const raw = String(valor)
  if (/^\d{2}:\d{2}/.test(raw)) return raw.slice(0, 5)

  const data = new Date(raw)
  if (Number.isNaN(data.getTime())) return ''

  return data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function textoMensagem(mensagem?: AnyRecord | null) {
  return texto(mensagem?.mensagem || mensagem?.texto || mensagem?.conteudo) || 'Mensagem sem conteúdo.'
}

function grupoAtivo(grupo?: GrupoCompleto | null) {
  if (!grupo) return false
  if (typeof grupo.ativo_calculado === 'boolean') return grupo.ativo_calculado

  const status = normalizar(grupo.status)
  if (grupo.ativo === true) return true
  if (grupo.ativo === false) return false

  return !status || status === 'ativo' || status === 'active'
}

function grupoHistorico(grupo?: GrupoCompleto | null) {
  return Boolean(grupo?.historico)
}

function badgeStatus(grupo: GrupoCompleto) {
  if (grupoHistorico(grupo)) return 'Histórico'
  if (grupoAtivo(grupo)) return 'Ativo agora'
  return 'Pausado'
}

export default function AdminGruposPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [grupos, setGrupos] = useState<GrupoCompleto[]>([])
  const [grupoSelecionado, setGrupoSelecionado] = useState<GrupoCompleto | null>(null)
  const [stats, setStats] = useState<Stats>(statsInicial)
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [alterandoStatusId, setAlterandoStatusId] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('atuais')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
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
      const salvo = localStorage.getItem('user')
      const usuario = salvo ? (JSON.parse(salvo) as UsuarioLocal) : null

      if (!usuario || normalizar(usuario.tipo) !== 'admin' || !extrairUsuarioId(usuario)) {
        router.replace('/login')
        return
      }

      setUser(usuario)
      await carregarGrupos(usuario)
    } catch (error) {
      console.error('Erro ao iniciar grupos admin:', error)
      setErro('Não foi possível carregar os grupos agora.')
    } finally {
      setCarregando(false)
    }
  }

  async function carregarGrupos(usuarioAtual = user) {
    const adminId = extrairUsuarioId(usuarioAtual)

    if (!adminId) {
      router.replace('/login')
      return
    }

    setErro('')

    const params = new URLSearchParams()
    params.set('adminId', adminId)
    params.set('limite', '1000')

    const response = await fetch(`/api/admin/grupos?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store',
    })

    const data = await response.json().catch(() => null)

    if (!response.ok || data?.sucesso === false) {
      throw new Error(data?.erro || 'Não foi possível carregar os grupos.')
    }

    const lista = Array.isArray(data?.grupos) ? (data.grupos as GrupoCompleto[]) : []
    setGrupos(lista)
    setStats({ ...statsInicial, ...(data?.stats || {}) })
    setUltimaAtualizacao(data?.ultimaAtualizacao || new Date().toLocaleTimeString('pt-BR'))

    setGrupoSelecionado((atual) => {
      if (atual?.id) {
        const atualizado = lista.find((grupo) => grupo.id === atual.id)
        if (atualizado) return atualizado
      }

      return lista.find((grupo) => grupoAtivo(grupo) && !grupoHistorico(grupo)) || lista[0] || null
    })
  }

  async function atualizar() {
    setAtualizando(true)
    setMensagem('')
    setErro('')

    try {
      await carregarGrupos()
      setMensagem('Grupos atualizados.')
    } catch (error) {
      console.error('Erro ao atualizar grupos:', error)
      setErro(error instanceof Error ? error.message : 'Não foi possível atualizar os grupos agora.')
    } finally {
      setAtualizando(false)
    }
  }

  async function alterarGrupo(grupo: GrupoCompleto, acao: 'encerrar' | 'reabrir') {
    const adminId = extrairUsuarioId(user)

    if (!adminId || !grupo?.id) return

    const confirmar = window.confirm(
      acao === 'encerrar'
        ? 'Finalizar este grupo? O histórico de mensagens ficará preservado para o Admin.'
        : 'Reabrir este grupo? O chat voltará a permitir mensagens para o ciclo atual.'
    )

    if (!confirmar) return

    setAlterandoStatusId(grupo.id)
    setMensagem('')
    setErro('')

    try {
      const response = await fetch('/api/admin/grupos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId,
          grupoId: grupo.id,
          acao,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.erro || 'Não foi possível alterar o grupo.')
      }

      setMensagem(acao === 'encerrar' ? 'Grupo finalizado e histórico preservado.' : 'Grupo reaberto.')
      await carregarGrupos()
    } catch (error) {
      console.error('Erro ao alterar grupo:', error)
      setErro(error instanceof Error ? error.message : 'Não foi possível alterar o grupo.')
    } finally {
      setAlterandoStatusId('')
    }
  }

  async function copiarTexto(valor: string, label = 'Informação') {
    try {
      await navigator.clipboard?.writeText(valor)
      setMensagem(`${label} copiado.`)
    } catch {
      setMensagem(`${label}: ${valor}`)
    }
  }

  function sair() {
    localStorage.removeItem('user')
    localStorage.removeItem('usuario')
    localStorage.removeItem('token')
    localStorage.removeItem('session')
    router.replace('/login')
  }

  const gruposFiltrados = useMemo(() => {
    const termo = normalizar(busca)

    return grupos.filter((grupo) => {
      const atual = grupoAtivo(grupo) && !grupoHistorico(grupo)
      const historico = grupoHistorico(grupo)
      const totalClientes = Number(grupo.total_clientes || 0)

      const passaAba =
        filtroStatus === 'todos' ||
        (filtroStatus === 'atuais' && atual) ||
        (filtroStatus === 'historico' && historico) ||
        (filtroStatus === 'com_membros' && totalClientes > 0) ||
        (filtroStatus === 'vazios' && totalClientes <= 0)

      if (!passaAba) return false
      if (!termo) return true

      const buscaTexto = normalizar(
        [
          grupo.id,
          grupo.roteiro_id,
          tituloGrupo(grupo),
          tituloRoteiro(grupo),
          localRoteiro(grupo),
          grupo.guia_nome,
          grupo.status,
        ].join(' ')
      )

      return buscaTexto.includes(termo)
    })
  }, [grupos, busca, filtroStatus])

  const mensagensSelecionadas = useMemo(() => {
    return Array.isArray(grupoSelecionado?.mensagens) ? grupoSelecionado.mensagens : []
  }, [grupoSelecionado])

  if (carregando || !user) {
    return (
      <main className="loadingPage">
        <style>{styles}</style>
        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <strong>Carregando grupos...</strong>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{styles}</style>

      <header className="topbar">
        <div className="topbarInner">
          <button type="button" className="backButton" onClick={() => router.push('/admin/dashboard')} aria-label="Voltar para dashboard">
            ←
          </button>

          <button type="button" className="brand" onClick={() => router.push('/admin/dashboard')}>
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />
            <span className="brandText">
              <strong>PrussikTrails Admin</strong>
              <small>Grupos e histórico dos roteiros</small>
            </span>
          </button>

          <div className="topActions">
            <button type="button" className="pillButton hideMobile" onClick={() => router.push('/admin/dashboard')}>
              Dashboard
            </button>
            <button type="button" className="pillButton" onClick={atualizar} disabled={atualizando}>
              {atualizando ? '...' : 'Atualizar'}
            </button>
            <button type="button" className="profileButton" onClick={sair} title="Sair">
              {primeiroNome(user).charAt(0).toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      <section className="shell">
        <section className="hero">
          <div className="heroTextBlock">
            <div className="eyebrow">Área administrativa</div>
            <h1>
              Grupos internos e <span>histórico de mensagens.</span>
            </h1>
            <p>
              Acompanhe os grupos atuais dos roteiros, finalize ciclos após a experiência e preserve o arquivo administrativo das conversas encerradas.
              {ultimaAtualizacao && (
                <>
                  <br />
                  Atualizado às {ultimaAtualizacao}.
                </>
              )}
            </p>
          </div>

          <aside className="heroCard" onClick={() => setFiltroStatus('atuais')}>
            <span>Grupos ativos agora</span>
            <strong>{stats.ativos}</strong>
            <small>{stats.historico} no histórico · {stats.mensagensTotal} mensagens arquivadas/ativas.</small>
          </aside>
        </section>

        {mensagem && <div className="alert success">{mensagem}</div>}
        {erro && <div className="alert error">{erro}</div>}

        <section className="statsGrid">
          <button type="button" className="statCard" onClick={() => setFiltroStatus('todos')}>
            <span>💬</span>
            <strong>{stats.total}</strong>
            <small>grupos criados</small>
          </button>
          <button type="button" className="statCard" onClick={() => setFiltroStatus('atuais')}>
            <span>✅</span>
            <strong>{stats.ativos}</strong>
            <small>ativos agora</small>
          </button>
          <button type="button" className="statCard" onClick={() => setFiltroStatus('historico')}>
            <span>🗂️</span>
            <strong>{stats.historico}</strong>
            <small>histórico/admin</small>
          </button>
          <button type="button" className="statCard" onClick={() => setFiltroStatus('com_membros')}>
            <span>👥</span>
            <strong>{stats.gruposComMembros}</strong>
            <small>com clientes</small>
          </button>
          <button type="button" className="statCard" onClick={() => setFiltroStatus('vazios')}>
            <span>🕊️</span>
            <strong>{stats.gruposVazios}</strong>
            <small>sem clientes</small>
          </button>
          <button type="button" className="statCard" onClick={() => setFiltroStatus('todos')}>
            <span>✉️</span>
            <strong>{stats.mensagensTotal}</strong>
            <small>mensagens</small>
          </button>
        </section>

        <section className="toolbar">
          <input
            className="searchInput"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por roteiro, guia, grupo, local ou ID..."
          />

          <div className="tabs">
            {(
              [
                ['atuais', 'Atuais'],
                ['historico', 'Histórico'],
                ['todos', 'Todos'],
                ['com_membros', 'Com clientes'],
                ['vazios', 'Vazios'],
              ] as [FiltroStatus, string][]
            ).map(([valor, label]) => (
              <button
                type="button"
                key={valor}
                className={filtroStatus === valor ? 'tab active' : 'tab'}
                onClick={() => setFiltroStatus(valor)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="contentGrid">
          <section className="groupsPanel">
            <div className="panelHeader">
              <div>
                <h2>Grupos</h2>
                <p>Somente acompanhamento administrativo. O cliente só acessa quando houver reserva paga.</p>
              </div>
              <strong>{gruposFiltrados.length}</strong>
            </div>

            <div className="groupsList">
              {gruposFiltrados.length === 0 ? (
                <div className="emptyBox">Nenhum grupo neste filtro.</div>
              ) : (
                gruposFiltrados.map((grupo) => {
                  const foto = fotoRoteiro(grupo)
                  const selecionado = grupoSelecionado?.id === grupo.id

                  return (
                    <button
                      type="button"
                      key={grupo.id}
                      className={selecionado ? 'groupCard selected' : 'groupCard'}
                      onClick={() => setGrupoSelecionado(grupo)}
                    >
                      <span className="groupThumb">
                        {foto ? <img src={foto} alt={tituloRoteiro(grupo)} /> : <em>PT</em>}
                      </span>

                      <span className="groupInfo">
                        <span className="groupTopLine">
                          <strong>{tituloRoteiro(grupo)}</strong>
                          <small className={grupoHistorico(grupo) ? 'statusChip history' : grupoAtivo(grupo) ? 'statusChip active' : 'statusChip pause'}>
                            {badgeStatus(grupo)}
                          </small>
                        </span>
                        <small>{localRoteiro(grupo)}</small>
                        <small>
                          Guia: {grupo.guia_nome || 'Guia'} · {Number(grupo.total_clientes || 0)} cliente(s) · {Number(grupo.total_mensagens || 0)} mensagem(ns)
                        </small>
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </section>

          <aside className="detailPanel">
            {!grupoSelecionado ? (
              <div className="emptyDetail">
                <span>🗂️</span>
                <h2>Selecione um grupo</h2>
                <p>Ao selecionar, você verá o roteiro, participantes e arquivo de mensagens.</p>
              </div>
            ) : (
              <>
                <div className="detailHero">
                  {fotoRoteiro(grupoSelecionado) ? (
                    <img src={fotoRoteiro(grupoSelecionado)} alt={tituloRoteiro(grupoSelecionado)} />
                  ) : (
                    <div className="detailHeroFallback">PrussikTrails</div>
                  )}
                  <div className="detailOverlay" />
                  <div className="detailHeroText">
                    <span>{grupoHistorico(grupoSelecionado) ? 'Histórico administrativo' : 'Grupo atual'}</span>
                    <h2>{tituloRoteiro(grupoSelecionado)}</h2>
                    <p>{localRoteiro(grupoSelecionado)}</p>
                  </div>
                </div>

                <div className="detailBody">
                  <div className="detailActions">
                    <button type="button" className="actionButton" onClick={() => copiarTexto(grupoSelecionado.id, 'ID do grupo')}>
                      Copiar ID
                    </button>

                    {grupoHistorico(grupoSelecionado) || !grupoAtivo(grupoSelecionado) ? (
                      <button
                        type="button"
                        className="actionButton primary"
                        onClick={() => alterarGrupo(grupoSelecionado, 'reabrir')}
                        disabled={alterandoStatusId === grupoSelecionado.id}
                      >
                        {alterandoStatusId === grupoSelecionado.id ? '...' : 'Reabrir grupo'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="actionButton danger"
                        onClick={() => alterarGrupo(grupoSelecionado, 'encerrar')}
                        disabled={alterandoStatusId === grupoSelecionado.id}
                      >
                        {alterandoStatusId === grupoSelecionado.id ? '...' : 'Finalizar grupo'}
                      </button>
                    )}
                  </div>

                  <div className="detailStats">
                    <div>
                      <strong>{Number(grupoSelecionado.total_clientes || 0)}</strong>
                      <span>clientes</span>
                    </div>
                    <div>
                      <strong>{Number(grupoSelecionado.total_membros || 0)}</strong>
                      <span>membros</span>
                    </div>
                    <div>
                      <strong>{Number(grupoSelecionado.total_mensagens || 0)}</strong>
                      <span>mensagens</span>
                    </div>
                    <div>
                      <strong>{formatarData(dataRoteiro(grupoSelecionado))}</strong>
                      <span>{formatarHora(horaRoteiro(grupoSelecionado)) || 'horário'}</span>
                    </div>
                  </div>

                  <div className="infoGrid">
                    <div className="infoBox">
                      <span>Guia</span>
                      <strong>{grupoSelecionado.guia_nome || 'Guia não localizado'}</strong>
                    </div>
                    <div className="infoBox">
                      <span>Status</span>
                      <strong>{badgeStatus(grupoSelecionado)}</strong>
                    </div>
                    <div className="infoBox wide">
                      <span>Grupo</span>
                      <strong>{tituloGrupo(grupoSelecionado)}</strong>
                      <small>{grupoSelecionado.descricao || 'Grupo interno vinculado ao roteiro.'}</small>
                    </div>
                  </div>

                  <div className="sectionTitle">
                    <h3>{grupoHistorico(grupoSelecionado) ? 'Arquivo de mensagens' : 'Mensagens atuais'}</h3>
                    <span>{mensagensSelecionadas.length} exibida(s)</span>
                  </div>

                  <div className="messagesBox">
                    {mensagensSelecionadas.length === 0 ? (
                      <div className="emptyMessages">Nenhuma mensagem registrada neste grupo.</div>
                    ) : (
                      mensagensSelecionadas.map((item, index) => {
                        const sistema = !texto(item.user_id || item.usuario_id || item.cliente_id || item.guia_id || item.membro_id)
                        return (
                          <article className={sistema ? 'messageItem system' : 'messageItem'} key={item.id || `${grupoSelecionado.id}-${index}`}>
                            <div className="messageAvatar">{sistema ? 'S' : texto(item.usuario_nome || 'P').charAt(0).toUpperCase()}</div>
                            <div>
                              <div className="messageHead">
                                <strong>{sistema ? 'Sistema' : item.usuario_nome || 'Participante'}</strong>
                                <small>{formatarDataHora(item.created_at)}</small>
                              </div>
                              <p>{textoMensagem(item)}</p>
                            </div>
                          </article>
                        )
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </aside>
        </section>
      </section>
    </main>
  )
}

const styles = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #f8fafc; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  button, input { font: inherit; }
  .page, .loadingPage { min-height: 100vh; min-height: 100dvh; color: #0f172a; background: radial-gradient(circle at 0% 0%, rgba(34,197,94,0.10), transparent 30%), radial-gradient(circle at 100% 0%, rgba(59,130,246,0.10), transparent 30%), linear-gradient(180deg,#f8fafc 0%,#eef2f7 100%); }
  .loadingPage { display: grid; place-items: center; padding: 20px; }
  .loadingCard { border-radius: 30px; background: rgba(255,255,255,0.88); border: 1px solid rgba(15,23,42,0.08); padding: 30px; box-shadow: 0 28px 80px rgba(15,23,42,0.16); color: #0f172a; text-align: center; display: grid; gap: 12px; }
  .loadingCard img { width: 170px; max-width: 52vw; height: auto; }
  .topbar { position: sticky; top: 0; z-index: 60; background: rgba(255,255,255,0.92); border-bottom: 1px solid rgba(15,23,42,0.07); backdrop-filter: blur(18px); padding: 10px 16px; }
  .topbarInner { max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: 46px minmax(0,1fr) auto; align-items: center; gap: 12px; }
  .backButton { width: 42px; height: 42px; border-radius: 999px; border: 1px solid rgba(15,23,42,0.10); background: rgba(255,255,255,0.76); color: #0f172a; font-size: 22px; cursor: pointer; }
  .brand { min-width: 0; justify-self: start; display: inline-flex; align-items: center; gap: 10px; border: 0; background: transparent; color: #0f172a; padding: 0; cursor: pointer; text-align: left; }
  .brand img { height: 40px; width: auto; display: block; filter: drop-shadow(0 8px 18px rgba(15,23,42,0.08)); }
  .brandText { min-width: 0; display: grid; gap: 3px; }
  .brandText strong { font-size: clamp(22px, 2.8vw, 34px); line-height: .92; letter-spacing: -0.065em; font-weight: 950; color: #0f172a; }
  .brandText small { color: #64748b; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .topActions { display: flex; justify-content: flex-end; align-items: center; gap: 8px; }
  .pillButton, .profileButton { border: 1px solid rgba(15,23,42,0.10); background: rgba(255,255,255,0.82); color: #0f172a; border-radius: 999px; height: 42px; padding: 0 16px; font-size: 12px; font-weight: 950; cursor: pointer; box-shadow: 0 10px 24px rgba(15,23,42,0.06); }
  .profileButton { width: 42px; padding: 0; background: #0f172a; color: #ffffff; }
  .pillButton:disabled { opacity: .55; cursor: wait; }
  .shell { max-width: 1280px; margin: 0 auto; padding: 24px 16px 60px; }
  .hero { border-radius: 36px; padding: 30px; min-height: 300px; display: grid; grid-template-columns: minmax(0,1fr) 320px; gap: 20px; align-items: end; background: radial-gradient(circle at top right, rgba(34,197,94,0.18), transparent 30%), linear-gradient(135deg, #0f172a, #1e293b); color: #ffffff; box-shadow: 0 24px 70px rgba(15,23,42,0.22); }
  .eyebrow { color: #86efac; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: .16em; margin-bottom: 12px; }
  .hero h1 { margin: 0; max-width: 850px; font-size: clamp(42px, 6vw, 76px); line-height: .88; letter-spacing: -.075em; font-weight: 950; }
  .hero h1 span { color: #86efac; }
  .hero p { margin: 18px 0 0; max-width: 760px; color: rgba(255,255,255,.78); font-size: 14px; line-height: 1.65; font-weight: 700; }
  .heroCard { border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.12); border-radius: 28px; padding: 20px; color: #ffffff; cursor: pointer; display: grid; gap: 8px; }
  .heroCard span { color: rgba(255,255,255,.70); font-size: 11px; font-weight: 950; letter-spacing: .12em; text-transform: uppercase; }
  .heroCard strong { font-size: 46px; line-height: 1; letter-spacing: -.065em; }
  .heroCard small { color: rgba(255,255,255,.72); font-size: 12px; line-height: 1.45; font-weight: 760; }
  .alert { margin-top: 16px; border-radius: 20px; padding: 13px 15px; font-size: 13px; font-weight: 850; }
  .alert.success { background: rgba(22,163,74,.10); border: 1px solid rgba(22,163,74,.18); color: #166534; }
  .alert.error { background: rgba(153,27,27,.08); border: 1px solid rgba(153,27,27,.18); color: #7f1d1d; }
  .statsGrid { margin-top: 18px; display: grid; grid-template-columns: repeat(6,minmax(0,1fr)); gap: 12px; }
  .statCard { border: 1px solid rgba(15,23,42,.08); background: rgba(255,255,255,.76); border-radius: 24px; padding: 15px; text-align: left; cursor: pointer; box-shadow: 0 18px 42px rgba(15,23,42,.07); color: #0f172a; transition: .18s ease; }
  .statCard:hover { transform: translateY(-2px); box-shadow: 0 24px 52px rgba(15,23,42,.11); }
  .statCard span { width: 38px; height: 38px; border-radius: 15px; background: rgba(15,23,42,.08); display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
  .statCard strong { display: block; font-size: 28px; line-height: 1; font-weight: 950; letter-spacing: -.055em; }
  .statCard small { display: block; margin-top: 6px; color: #64748b; font-size: 11px; line-height: 1.3; font-weight: 850; }
  .toolbar { margin-top: 18px; border-radius: 28px; padding: 14px; background: rgba(255,255,255,.78); border: 1px solid rgba(15,23,42,.08); box-shadow: 0 18px 42px rgba(15,23,42,.07); display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 12px; align-items: center; }
  .searchInput { width: 100%; border: 1px solid rgba(15,23,42,.10); background: rgba(255,255,255,.82); border-radius: 999px; padding: 13px 15px; color: #0f172a; outline: none; font-size: 13px; font-weight: 800; }
  .searchInput:focus { border-color: rgba(15,23,42,.32); box-shadow: 0 0 0 4px rgba(15,23,42,.08); }
  .tabs { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
  .tab { border: 1px solid rgba(15,23,42,.10); border-radius: 999px; background: rgba(255,255,255,.82); color: #0f172a; padding: 10px 13px; font-size: 12px; font-weight: 950; cursor: pointer; }
  .tab.active { background: #0f172a; color: #ffffff; border-color: #0f172a; }
  .contentGrid { margin-top: 18px; display: grid; grid-template-columns: minmax(360px, .95fr) minmax(0, 1.25fr); gap: 16px; align-items: start; }
  .groupsPanel, .detailPanel { border: 1px solid rgba(15,23,42,.08); border-radius: 30px; background: rgba(255,255,255,.78); box-shadow: 0 22px 52px rgba(15,23,42,.08); overflow: hidden; }
  .groupsPanel { max-height: calc(100dvh - 120px); position: sticky; top: 82px; display: flex; flex-direction: column; }
  .panelHeader { padding: 18px; border-bottom: 1px solid rgba(15,23,42,.07); display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
  .panelHeader h2 { margin: 0; color: #0f172a; font-size: 24px; line-height: 1; font-weight: 950; letter-spacing: -.05em; }
  .panelHeader p { margin: 6px 0 0; color: #64748b; font-size: 12px; line-height: 1.4; font-weight: 760; }
  .panelHeader > strong { color: #0f172a; font-size: 24px; font-weight: 950; }
  .groupsList { padding: 14px; overflow: auto; display: grid; gap: 10px; }
  .groupCard { width: 100%; border: 1px solid rgba(15,23,42,.08); background: rgba(255,255,255,.78); color: #0f172a; border-radius: 22px; padding: 10px; display: grid; grid-template-columns: 74px minmax(0,1fr); gap: 12px; text-align: left; cursor: pointer; transition: .18s ease; }
  .groupCard:hover, .groupCard.selected { border-color: rgba(15,23,42,.28); transform: translateY(-1px); box-shadow: 0 16px 34px rgba(15,23,42,.10); }
  .groupCard.selected { background: #ffffff; }
  .groupThumb { width: 74px; height: 74px; border-radius: 18px; background: linear-gradient(135deg,#0f172a,#1e293b); overflow: hidden; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 950; }
  .groupThumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .groupInfo { min-width: 0; display: grid; gap: 5px; }
  .groupTopLine { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
  .groupTopLine strong { min-width: 0; color: #0f172a; font-size: 15px; line-height: 1.12; font-weight: 950; letter-spacing: -.035em; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .groupInfo small { color: #64748b; font-size: 11px; line-height: 1.35; font-weight: 780; overflow-wrap: anywhere; }
  .statusChip { flex: 0 0 auto; border-radius: 999px; padding: 5px 8px; font-size: 9px !important; font-weight: 950 !important; line-height: 1; }
  .statusChip.active { background: rgba(22,163,74,.11); color: #166534; }
  .statusChip.history { background: rgba(37,99,235,.10); color: #1d4ed8; }
  .statusChip.pause { background: rgba(217,119,6,.12); color: #92400e; }
  .emptyBox, .emptyDetail, .emptyMessages { border-radius: 22px; background: rgba(255,255,255,.72); border: 1px dashed rgba(15,23,42,.20); color: #64748b; padding: 26px; text-align: center; font-size: 13px; font-weight: 780; }
  .emptyDetail { min-height: 520px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .emptyDetail span { font-size: 40px; }
  .emptyDetail h2 { color: #0f172a; margin: 10px 0 0; font-size: 28px; letter-spacing: -.045em; }
  .emptyDetail p { max-width: 360px; line-height: 1.5; }
  .detailHero { height: 260px; position: relative; background: linear-gradient(135deg,#0f172a,#1e293b); overflow: hidden; }
  .detailHero img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .detailHeroFallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,.72); font-weight: 950; letter-spacing: .16em; text-transform: uppercase; }
  .detailOverlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(8,13,7,.72), rgba(8,13,7,.06)); }
  .detailHeroText { position: absolute; left: 22px; right: 22px; bottom: 20px; color: #ffffff; }
  .detailHeroText span { display: inline-flex; border-radius: 999px; border: 1px solid rgba(255,255,255,.24); background: rgba(255,255,255,.12); padding: 7px 10px; font-size: 10px; font-weight: 950; letter-spacing: .12em; text-transform: uppercase; }
  .detailHeroText h2 { margin: 12px 0 0; font-size: clamp(28px, 4vw, 46px); line-height: .94; letter-spacing: -.06em; font-weight: 950; }
  .detailHeroText p { margin: 8px 0 0; color: rgba(255,255,255,.78); font-size: 13px; font-weight: 780; }
  .detailBody { padding: 16px; display: grid; gap: 14px; }
  .detailActions { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
  .actionButton { border: 1px solid rgba(15,23,42,.12); background: rgba(255,255,255,.82); color: #0f172a; border-radius: 999px; padding: 11px 14px; font-size: 12px; font-weight: 950; cursor: pointer; }
  .actionButton.primary { background: #0f172a; color: #ffffff; border-color: #0f172a; }
  .actionButton.danger { background: rgba(153,27,27,.08); color: #7f1d1d; border-color: rgba(153,27,27,.16); }
  .actionButton:disabled { opacity: .58; cursor: wait; }
  .detailStats { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 10px; }
  .detailStats div, .infoBox { border: 1px solid rgba(15,23,42,.07); background: rgba(255,255,255,.74); border-radius: 20px; padding: 13px; }
  .detailStats strong { display: block; color: #0f172a; font-size: 20px; line-height: 1.05; font-weight: 950; letter-spacing: -.04em; overflow-wrap: anywhere; }
  .detailStats span, .infoBox span { display: block; margin-top: 4px; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; font-weight: 950; }
  .infoGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .infoBox.wide { grid-column: 1 / -1; }
  .infoBox strong { display: block; color: #0f172a; font-size: 14px; line-height: 1.35; font-weight: 950; margin-top: 6px; overflow-wrap: anywhere; }
  .infoBox small { display: block; color: #64748b; font-size: 12px; line-height: 1.45; font-weight: 760; margin-top: 5px; }
  .sectionTitle { display: flex; justify-content: space-between; align-items: end; gap: 10px; }
  .sectionTitle h3 { margin: 0; color: #0f172a; font-size: 20px; line-height: 1; letter-spacing: -.04em; font-weight: 950; }
  .sectionTitle span { color: #64748b; font-size: 11px; font-weight: 850; }
  .messagesBox { max-height: 460px; overflow: auto; display: grid; gap: 10px; border-radius: 22px; background: rgba(255,255,255,.54); border: 1px solid rgba(15,23,42,.07); padding: 12px; }
  .messageItem { display: grid; grid-template-columns: 40px minmax(0,1fr); gap: 10px; align-items: start; border: 1px solid rgba(15,23,42,.07); background: rgba(255,255,255,.78); border-radius: 18px; padding: 10px; }
  .messageItem.system { background: rgba(236,253,245,.78); }
  .messageAvatar { width: 40px; height: 40px; border-radius: 15px; background: #0f172a; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 950; }
  .messageHead { display: flex; justify-content: space-between; gap: 10px; }
  .messageHead strong { color: #0f172a; font-size: 12px; font-weight: 950; }
  .messageHead small { color: #94a3b8; font-size: 10px; font-weight: 800; white-space: nowrap; }
  .messageItem p { margin: 5px 0 0; color: #334155; font-size: 12px; line-height: 1.45; font-weight: 760; overflow-wrap: anywhere; }
  @media (max-width: 1080px) { .hero { grid-template-columns: 1fr; min-height: auto; } .statsGrid { grid-template-columns: repeat(3,minmax(0,1fr)); } .contentGrid { grid-template-columns: 1fr; } .groupsPanel { position: static; max-height: none; } }
  @media (max-width: 720px) { .topbar { padding: 8px 10px; } .topbarInner { grid-template-columns: 38px minmax(0,1fr) auto; gap: 8px; } .backButton, .profileButton { width: 38px; height: 38px; } .brand { justify-self: center; text-align: center; } .brandText strong { font-size: 20px; } .brandText small { font-size: 8px; max-width: 170px; } .hideMobile { display: none; } .pillButton { height: 38px; padding: 0 12px; font-size: 11px; } .shell { padding: 14px 10px 44px; } .hero { border-radius: 28px; padding: 22px; } .hero h1 { font-size: 42px; } .statsGrid { grid-template-columns: repeat(2,minmax(0,1fr)); } .toolbar { grid-template-columns: 1fr; } .tabs { justify-content: flex-start; overflow-x: auto; flex-wrap: nowrap; padding-bottom: 2px; } .tab { flex: 0 0 auto; } .groupCard { grid-template-columns: 64px minmax(0,1fr); } .groupThumb { width: 64px; height: 64px; } .detailHero { height: 220px; } .detailStats, .infoGrid { grid-template-columns: repeat(2,minmax(0,1fr)); } .detailActions .actionButton { flex: 1 1 100%; } .messageHead { flex-direction: column; gap: 2px; } }
  @media (max-width: 440px) { .statsGrid { grid-template-columns: 1fr; } .detailStats, .infoGrid { grid-template-columns: 1fr; } .hero h1 { font-size: 38px; } }
`
