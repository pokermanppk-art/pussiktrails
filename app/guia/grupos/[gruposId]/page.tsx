'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type AnyRecord = Record<string, any>

type UsuarioLocal = {
  id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  guia_id?: string | null
  nome?: string | null
  name?: string | null
  email?: string | null
  tipo?: string | null
}

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function extrairUsuarioId(usuario: UsuarioLocal | null) {
  return texto(usuario?.id || usuario?.user_id || usuario?.usuario_id || usuario?.guia_id)
}

function primeiroNome(valor?: string | null) {
  const nome = texto(valor || 'Guia')
  return nome.split(' ')[0] || 'Guia'
}

function nomeUsuario(usuario?: UsuarioLocal | null) {
  return usuario?.nome || usuario?.name || usuario?.email || 'Guia'
}

function tituloRoteiro(item?: AnyRecord | null) {
  return item?.titulo || item?.nome || 'Roteiro'
}

function localRoteiro(item?: AnyRecord | null) {
  return item?.local || item?.localizacao || item?.local_encontro || item?.ponto_encontro || 'Local a confirmar'
}

function imagemRoteiro(item?: AnyRecord | null) {
  return item?.foto_capa || item?.foto_url || item?.imagem_url || item?.imagem || ''
}

function dataRoteiro(item?: AnyRecord | null) {
  return item?.data_roteiro || item?.data_saida || item?.data_trilha || item?.data || null
}

function horaRoteiro(item?: AnyRecord | null) {
  return item?.hora_roteiro || item?.hora_saida || item?.hora || ''
}

function formatarData(valor?: string | null) {
  if (!valor) return '-'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return valor
  return data.toLocaleDateString('pt-BR')
}

function formatarHora(valor?: string | null) {
  if (!valor) return ''
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return ''
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatarMoeda(valor: unknown) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0))
}

function iniciais(nome?: string | null) {
  const partes = texto(nome || 'Participante').split(' ').filter(Boolean)
  return `${partes[0]?.[0] || 'P'}${partes.length > 1 ? partes[partes.length - 1]?.[0] || '' : ''}`.toUpperCase()
}

function papelCliente(papel?: string | null) {
  const valor = normalizar(papel)
  return valor === 'cliente' || valor === 'participante' || valor === 'membro'
}

function papelGuiaAdmin(papel?: string | null) {
  const valor = normalizar(papel)
  return valor === 'guia_admin' || valor === 'guia' || valor === 'admin'
}

function mensagemEhSistema(mensagem: AnyRecord) {
  return normalizar(mensagem.tipo) === 'sistema'
}

function mensagemEhAvisoGuia(mensagem: AnyRecord) {
  return normalizar(mensagem.tipo) === 'aviso_guia'
}

export default function GuiaGrupoDetalhePage() {
  const router = useRouter()
  const params = useParams()
  const iniciouRef = useRef(false)
  const fimMensagensRef = useRef<HTMLDivElement | null>(null)

  const grupoId = texto(params?.grupoId || params?.id || Object.values(params || {})[0])

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [grupo, setGrupo] = useState<AnyRecord | null>(null)
  const [roteiro, setRoteiro] = useState<AnyRecord | null>(null)
  const [membros, setMembros] = useState<AnyRecord[]>([])
  const [mensagens, setMensagens] = useState<AnyRecord[]>([])
  const [reservas, setReservas] = useState<AnyRecord[]>([])
  const [stats, setStats] = useState<AnyRecord>({})

  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [salvandoAviso, setSalvandoAviso] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [reiniciando, setReiniciando] = useState(false)

  const [mensagemTexto, setMensagemTexto] = useState('')
  const [avisoTexto, setAvisoTexto] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('')

  useEffect(() => {
    if (iniciouRef.current) return
    iniciouRef.current = true
    iniciar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!user || !grupo?.id || normalizar(grupo.status) !== 'ativo') return

    const interval = setInterval(() => carregarGrupo('detalhar', false), 9000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, grupo?.id, grupo?.status])

  useEffect(() => {
    setTimeout(() => fimMensagensRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 70)
  }, [mensagens.length])

  async function iniciar() {
    setCarregando(true)
    setErro('')
    setAviso('')

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

      if (!grupoId) {
        setErro('Grupo não identificado.')
        return
      }

      const usuarioId = extrairUsuarioId(parsedUser)
      if (!usuarioId) {
        router.replace('/login')
        return
      }

      const usuarioNormalizado = { ...parsedUser, id: usuarioId }
      setUser(usuarioNormalizado)
      await carregarGrupo('detalhar', true, usuarioNormalizado)
    } catch (error) {
      console.error('Erro ao iniciar grupo:', error)
      setErro('Não foi possível carregar o grupo agora.')
    } finally {
      setCarregando(false)
    }
  }

  async function chamarApi(payload: AnyRecord) {
    const guiaId = extrairUsuarioId(user)

    const response = await fetch('/api/grupos/detalhe-guia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        guiaId,
        grupoId,
        ...payload,
      }),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok || data?.sucesso === false) {
      throw new Error(data?.erro || data?.message || data?.detalhe || 'Não foi possível administrar este grupo.')
    }

    return data
  }

  async function carregarGrupo(acao = 'detalhar', mostrarLoading = false, usuarioForcado?: UsuarioLocal | null) {
    if (mostrarLoading) setAtualizando(true)
    setErro('')

    try {
      const guiaId = extrairUsuarioId(usuarioForcado || user)

      const response = await fetch('/api/grupos/detalhe-guia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ guiaId, grupoId, acao }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.erro || data?.message || data?.detalhe || 'Não foi possível localizar o grupo.')
      }

      setGrupo(data.grupo || null)
      setRoteiro(data.roteiro || null)
      setMembros(Array.isArray(data.membros) ? data.membros : [])
      setMensagens(Array.isArray(data.mensagens) ? data.mensagens : [])
      setReservas(Array.isArray(data.reservas) ? data.reservas : [])
      setStats(data.stats || {})
      setAvisoTexto(data.grupo?.aviso_fixado || '')
      setUltimaAtualizacao(data.ultimaAtualizacao || new Date().toLocaleTimeString('pt-BR'))
    } catch (error: any) {
      console.error('Erro ao carregar grupo:', error)
      setErro(error?.message || 'Não foi possível localizar o grupo.')
    } finally {
      if (mostrarLoading) setAtualizando(false)
    }
  }

  async function enviarMensagem(event: FormEvent) {
    event.preventDefault()
    if (!mensagemTexto.trim()) return

    setEnviando(true)
    setErro('')
    setAviso('')

    try {
      await chamarApi({ acao: 'enviar_mensagem', mensagem: mensagemTexto })
      setMensagemTexto('')
      await carregarGrupo()
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível enviar a mensagem.')
    } finally {
      setEnviando(false)
    }
  }

  async function salvarAvisoFixado() {
    setSalvandoAviso(true)
    setErro('')
    setAviso('')

    try {
      await chamarApi({ acao: 'salvar_aviso', aviso: avisoTexto })
      await carregarGrupo()
      setAviso('Aviso do grupo atualizado.')
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível salvar o aviso.')
    } finally {
      setSalvandoAviso(false)
    }
  }

  async function finalizarGrupo() {
    const confirmar = window.confirm(
      'Finalizar este grupo? O chat ficará encerrado, o histórico será preservado para o Admin e os clientes antigos não entrarão automaticamente no próximo ciclo.'
    )

    if (!confirmar) return

    setFinalizando(true)
    setErro('')
    setAviso('')

    try {
      await chamarApi({ acao: 'finalizar_grupo', motivo: 'Finalizado pelo guia após o roteiro.' })
      await carregarGrupo()
      setAviso('Grupo finalizado. O histórico permanece preservado para o Admin.')
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível finalizar o grupo.')
    } finally {
      setFinalizando(false)
    }
  }

  async function iniciarNovoCiclo() {
    const confirmar = window.confirm(
      'Iniciar um novo ciclo para este roteiro? O chat atual será arquivado para o Admin, os clientes antigos serão removidos do grupo ativo e o chat começará limpo para a nova data.'
    )

    if (!confirmar) return

    setReiniciando(true)
    setErro('')
    setAviso('')

    try {
      await chamarApi({ acao: 'iniciar_novo_ciclo' })
      await carregarGrupo()
      setAviso('Novo ciclo iniciado. O chat foi zerado para a próxima data.')
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível iniciar novo ciclo.')
    } finally {
      setReiniciando(false)
    }
  }

  const grupoAtivo = normalizar(grupo?.status) === 'ativo'
  const grupoEncerrado = normalizar(grupo?.status) === 'encerrado'
  const foto = imagemRoteiro(roteiro)
  const clientesConfirmados = membros.filter((membro) => papelCliente(membro.papel))
  const reservasConfirmadas = reservas.filter((reserva) => {
    const pagamento = normalizar(reserva.pagamento_status || reserva.status_pagamento || reserva.payment_status)
    const status = normalizar(reserva.status)
    return ['pago', 'confirmado', 'confirmada', 'aprovado', 'approved', 'paid', 'realizada'].includes(pagamento) || ['pago', 'paga', 'confirmada', 'realizada'].includes(status)
  })

  if (carregando) {
    return (
      <main className="loading">
        <style>{estilos}</style>
        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>Abrindo administração do grupo...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{estilos}</style>

      <header className="header">
        <div className="headerInner">
          <button className="brandLogo" type="button" onClick={() => router.push('/guia/dashboard')} aria-label="Dashboard do guia">
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          </button>

          <div className="headerActions">
            <button type="button" className="iconBtn" onClick={() => router.push('/guia/grupos')}>Grupos</button>
            <button type="button" className="iconBtn hideMobile" onClick={() => carregarGrupo('detalhar', true)} disabled={atualizando}>{atualizando ? '...' : 'Atualizar'}</button>
            <button type="button" className="iconBtn primary" onClick={() => router.push('/guia/perfil')}>Perfil</button>
          </div>
        </div>
      </header>

      <section className="container">
        <section className="hero">
          <div className="heroContent">
            <div>
              <span className="eyebrow">Administração do grupo</span>
              <h1>{tituloRoteiro(roteiro)}<br /><span>Conduza sua comunidade.</span></h1>
              <p>
                Envie orientações, acompanhe participantes confirmados, fixe avisos e finalize o grupo após a experiência.
                {ultimaAtualizacao ? ` Atualizado às ${ultimaAtualizacao}.` : ''}
              </p>
            </div>

            <aside className="heroCard">
              <span>Status do grupo</span>
              <strong>{grupo?.status || 'ativo'}</strong>
              <small>{grupoAtivo ? 'Chat ativo para participantes confirmados.' : 'Grupo encerrado. Histórico preservado.'}</small>
            </aside>
          </div>
        </section>

        {erro && <div className="notice error">{erro}</div>}
        {aviso && <div className="notice success">{aviso}</div>}

        {!grupo?.id ? (
          <section className="blocked">
            <h2>Grupo não encontrado</h2>
            <p>Não foi possível localizar ou validar este grupo.</p>
            <button type="button" className="btn primary" onClick={() => router.push('/guia/grupos')}>Voltar para grupos</button>
          </section>
        ) : (
          <section className="mainGrid">
            <div className="leftCol">
              {grupoEncerrado && (
                <section className="cycleBox">
                  <div>
                    <strong>Grupo finalizado</strong>
                    <p>O histórico está preservado para o Admin. Para uma nova data deste roteiro, inicie um novo ciclo e o chat começará limpo.</p>
                  </div>
                  <button type="button" onClick={iniciarNovoCiclo} disabled={reiniciando}>
                    {reiniciando ? 'Iniciando...' : 'Iniciar novo ciclo'}
                  </button>
                </section>
              )}

              <section className="chatPanel">
                <div className="panelHeader">
                  <div>
                    <h2>{grupo?.titulo || 'Grupo do roteiro'}</h2>
                    <p>{grupoAtivo ? 'Mensagens ativas do ciclo atual.' : 'Grupo encerrado. Chat bloqueado.'}</p>
                  </div>
                </div>

                <div className="chatBody">
                  {grupo?.aviso_fixado && (
                    <div className="messageWrap system"><div className="bubble notice"><strong>Aviso fixado:</strong> {grupo.aviso_fixado}</div></div>
                  )}

                  {mensagens.length === 0 ? (
                    <div className="messageWrap system"><div className="bubble system">Nenhuma mensagem ativa neste ciclo.</div></div>
                  ) : (
                    mensagens.map((mensagem) => {
                      if (mensagemEhSistema(mensagem)) {
                        return <div className="messageWrap system" key={mensagem.id}><div className="bubble system">{mensagem.mensagem}</div></div>
                      }

                      const minha = texto(mensagem.user_id) === extrairUsuarioId(user)
                      const avisoGuia = mensagemEhAvisoGuia(mensagem)

                      return (
                        <div className={`messageWrap ${minha ? 'mine' : 'other'}`} key={mensagem.id}>
                          <div className={`bubble ${minha ? 'mine' : 'other'} ${avisoGuia ? 'notice' : ''}`}>
                            {!minha && <div className="messageName">{mensagem.usuario_nome || 'Participante'}</div>}
                            <div>{mensagem.mensagem}</div>
                            <div className="messageTime">{formatarHora(mensagem.created_at)}</div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={fimMensagensRef} />
                </div>

                <form className="composer" onSubmit={enviarMensagem}>
                  <input
                    value={mensagemTexto}
                    onChange={(event) => setMensagemTexto(event.target.value)}
                    placeholder={grupoAtivo ? 'Escreva uma mensagem para os participantes...' : 'Grupo encerrado. Inicie novo ciclo para enviar mensagens.'}
                    disabled={!grupoAtivo || enviando}
                    maxLength={1000}
                  />
                  <button type="submit" disabled={!grupoAtivo || enviando || !mensagemTexto.trim()}>{enviando ? 'Enviando...' : 'Enviar'}</button>
                </form>
              </section>

              <section className="adminPanel">
                <div className="panelHeader">
                  <div>
                    <h2>Aviso fixado</h2>
                    <p>Orientação importante para o ciclo atual.</p>
                  </div>
                </div>
                <div className="adminBody">
                  <textarea
                    value={avisoTexto}
                    onChange={(event) => setAvisoTexto(event.target.value)}
                    placeholder="Ex.: Encontro às 6h30. Levar água, lanterna e agasalho."
                    disabled={!grupoAtivo || salvandoAviso}
                    maxLength={800}
                  />
                  <button type="button" className="btn green" onClick={salvarAvisoFixado} disabled={!grupoAtivo || salvandoAviso}>
                    {salvandoAviso ? 'Salvando...' : 'Salvar aviso fixado'}
                  </button>
                </div>
              </section>
            </div>

            <aside className="rightCol">
              <section className="sidePanel">
                <div className="panelHeader">
                  <div>
                    <h2>Controle do grupo</h2>
                    <p>Participantes, reservas e dados do roteiro.</p>
                  </div>
                </div>
                <div className="sideBody">
                  <div className="routeImage">{foto ? <img src={foto} alt={tituloRoteiro(roteiro)} /> : 'Roteiro'}</div>

                  <div className="statsGrid">
                    <div className="miniStat"><strong>{clientesConfirmados.length}</strong><span>clientes no grupo</span></div>
                    <div className="miniStat"><strong>{reservasConfirmadas.length}</strong><span>reservas pagas</span></div>
                    <div className="miniStat"><strong>{Number(stats.pessoasConfirmadas || 0)}</strong><span>participantes</span></div>
                    <div className="miniStat"><strong>{formatarMoeda(stats.valorConfirmado || 0)}</strong><span>confirmado</span></div>
                  </div>

                  <div className="infoCard"><span>Local</span><strong>{localRoteiro(roteiro)}</strong></div>
                  <div className="infoCard"><span>Data e hora</span><strong>{formatarData(dataRoteiro(roteiro))}{horaRoteiro(roteiro) ? ` · ${horaRoteiro(roteiro)}` : ''}</strong></div>

                  <div className="infoCard">
                    <span>Participantes no grupo</span>
                    <div className="memberList">
                      {membros.length === 0 ? <small>Nenhum participante ativo.</small> : membros.map((membro) => (
                        <div className="member" key={membro.id}>
                          <div className="avatar">{iniciais(membro.usuario_nome)}</div>
                          <div>
                            <strong>{membro.usuario_nome || 'Participante'}</strong>
                            <small>{papelGuiaAdmin(membro.papel) ? 'Guia administrador' : 'Cliente confirmado'}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="infoCard">
                    <span>Reservas confirmadas</span>
                    <div className="memberList">
                      {reservasConfirmadas.length === 0 ? <small>Nenhuma reserva confirmada ainda.</small> : reservasConfirmadas.slice(0, 8).map((reserva) => (
                        <div className="member" key={reserva.id}>
                          <div className="avatar">{iniciais(reserva.cliente_nome)}</div>
                          <div>
                            <strong>{reserva.cliente_nome || 'Cliente'}</strong>
                            <small>{reserva.quantidade_pessoas || 1} pessoa(s) · {formatarMoeda(reserva.valor_total || 0)}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button type="button" className="btn light" onClick={() => router.push('/guia/grupos')}>Voltar para grupos</button>

                  {grupoAtivo ? (
                    <button type="button" className="btn danger" onClick={finalizarGrupo} disabled={finalizando}>
                      {finalizando ? 'Finalizando...' : 'Finalizar grupo'}
                    </button>
                  ) : (
                    <button type="button" className="btn primary" onClick={iniciarNovoCiclo} disabled={reiniciando}>
                      {reiniciando ? 'Iniciando...' : 'Iniciar novo ciclo'}
                    </button>
                  )}
                </div>
              </section>
            </aside>
          </section>
        )}
      </section>
    </main>
  )
}

const estilos = `
  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: #f6f7f1;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .page,
  .loading {
    min-height: 100vh;
    min-height: 100dvh;
    background:
      radial-gradient(circle at 10% 0%, rgba(132,204,22,0.16), transparent 28%),
      radial-gradient(circle at 90% 10%, rgba(251,146,60,0.14), transparent 28%),
      linear-gradient(180deg,#fffdf7 0%,#f3f5ea 48%,#eef2e5 100%);
    color: #172018;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
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

  .loadingCard img { height: 64px; width: auto; margin-bottom: 12px; }

  .header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(255,253,247,0.94);
    border-bottom: 1px solid rgba(32,60,46,0.08);
    backdrop-filter: blur(18px);
    padding: 8px 14px;
  }

  .headerInner {
    max-width: 1180px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    min-height: 50px;
  }

  .brandLogo {
    border: 0;
    background: transparent;
    padding: 0;
    cursor: pointer;
  }

  .brandLogo img {
    width: clamp(135px, 22vw, 220px);
    max-height: 50px;
    object-fit: contain;
    display: block;
  }

  .headerActions {
    position: absolute;
    right: 0;
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .iconBtn,
  .btn {
    border: 1px solid rgba(15,23,42,0.08);
    background: rgba(255,255,255,0.78);
    color: #172018;
    border-radius: 999px;
    padding: 11px 14px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
    transition: 0.18s ease;
  }

  .iconBtn:hover:not(:disabled),
  .btn:hover:not(:disabled) { transform: translateY(-1px); }
  .iconBtn:disabled, .btn:disabled { opacity: 0.58; cursor: not-allowed; }
  .primary { background: #172018; color: #fffdf7; border-color: #172018; }
  .green { background: #16a34a; color: #fff; border-color: #16a34a; }
  .danger { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
  .light { background: #eef2e5; color: #475569; }

  .container { max-width: 1180px; margin: 0 auto; padding: 22px 16px 54px; }

  .hero {
    overflow: hidden;
    border-radius: 38px;
    padding: 28px;
    background:
      linear-gradient(135deg, rgba(23,32,24,0.76), rgba(23,32,24,0.34)),
      radial-gradient(circle at top right, rgba(190,242,100,0.30), transparent 34%),
      linear-gradient(135deg, #1f331f 0%, #647a49 46%, #d7c6a1 100%);
    color: #fff;
    box-shadow: 0 24px 60px rgba(23,32,24,0.18);
    margin-bottom: 16px;
  }

  .heroContent {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 22px;
    align-items: end;
    min-height: 225px;
  }

  .eyebrow {
    display: inline-flex;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.26);
    background: rgba(255,255,255,0.12);
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 14px;
  }

  .hero h1 {
    margin: 0;
    max-width: 760px;
    font-size: clamp(38px, 5.4vw, 64px);
    line-height: 0.94;
    font-weight: 950;
    letter-spacing: -0.08em;
  }

  .hero h1 span { color: #bef264; }
  .hero p { max-width: 680px; color: rgba(255,255,255,0.82); line-height: 1.62; margin: 16px 0 0; font-size: 14px; font-weight: 650; }

  .heroCard {
    background: rgba(255,255,255,0.14);
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 30px;
    padding: 18px;
    backdrop-filter: blur(16px);
    display: grid;
  }

  .heroCard span { color: rgba(255,255,255,0.76); font-size: 11px; font-weight: 950; letter-spacing: 0.10em; text-transform: uppercase; }
  .heroCard strong { margin-top: 9px; color: #fff; font-size: 30px; line-height: 1.05; font-weight: 950; letter-spacing: -0.06em; }
  .heroCard small { margin-top: 8px; color: rgba(255,255,255,0.78); font-size: 12px; line-height: 1.45; font-weight: 750; }

  .notice { border-radius: 18px; padding: 13px 15px; margin-bottom: 16px; font-size: 13px; font-weight: 850; line-height: 1.45; }
  .notice.success { background: #ecfdf5; color: #166534; border: 1px solid #bbf7d0; }
  .notice.error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

  .blocked,
  .cycleBox,
  .chatPanel,
  .adminPanel,
  .sidePanel {
    background: rgba(255,255,255,0.90);
    border: 1px solid rgba(15,23,42,0.06);
    border-radius: 32px;
    box-shadow: 0 12px 34px rgba(15,23,42,0.06);
    overflow: hidden;
  }

  .blocked { padding: 26px; text-align: center; }

  .mainGrid { display: grid; grid-template-columns: minmax(0,1fr) 350px; gap: 16px; align-items: start; }
  .leftCol { display: grid; gap: 16px; }

  .cycleBox {
    padding: 18px;
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: center;
    background: rgba(255,253,247,0.94);
  }

  .cycleBox strong { display: block; color: #172018; font-size: 17px; font-weight: 950; letter-spacing: -0.04em; }
  .cycleBox p { margin: 5px 0 0; color: #64748b; font-size: 12px; line-height: 1.45; font-weight: 750; }

  .panelHeader { padding: 16px 18px; border-bottom: 1px solid rgba(15,23,42,0.06); }
  .panelHeader h2 { margin: 0; font-size: 18px; font-weight: 950; color: #172018; letter-spacing: -0.04em; }
  .panelHeader p { margin: 3px 0 0; color: #64748b; font-size: 12px; font-weight: 700; }

  .chatBody { height: 560px; overflow-y: auto; padding: 18px; background: radial-gradient(circle at top left, rgba(132,204,22,0.08), transparent 26%), #fffdf7; }
  .messageWrap { display: flex; margin-bottom: 12px; }
  .messageWrap.mine { justify-content: flex-end; }
  .messageWrap.other { justify-content: flex-start; }
  .messageWrap.system { justify-content: center; }

  .bubble { max-width: min(74%, 620px); border-radius: 22px; padding: 11px 13px; font-size: 13px; line-height: 1.45; font-weight: 700; box-shadow: 0 8px 20px rgba(15,23,42,0.06); }
  .bubble.mine { background: #172018; color: #fff; border-bottom-right-radius: 8px; }
  .bubble.other { background: #fff; color: #172018; border: 1px solid rgba(15,23,42,0.06); border-bottom-left-radius: 8px; }
  .bubble.system { background: #eef2e5; color: #64748b; border-radius: 999px; max-width: 88%; text-align: center; font-size: 12px; box-shadow: none; }
  .bubble.notice { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .messageName { font-size: 11px; font-weight: 950; opacity: 0.78; margin-bottom: 4px; }
  .messageTime { font-size: 10px; opacity: 0.72; margin-top: 5px; text-align: right; }

  .composer { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 10px; padding: 14px; border-top: 1px solid rgba(15,23,42,0.06); background: rgba(255,255,255,0.90); }
  .composer input,
  .adminBody textarea { width: 100%; border: 1px solid rgba(15,23,42,0.08); background: #fffdf7; border-radius: 999px; padding: 13px 15px; color: #172018; outline: none; font-size: 14px; font-weight: 750; }
  .composer button { border: 0; border-radius: 999px; padding: 12px 16px; background: #172018; color: #fff; font-size: 13px; font-weight: 950; cursor: pointer; }
  .composer button:disabled, .composer input:disabled { opacity: 0.58; cursor: not-allowed; }

  .adminBody { padding: 16px; display: grid; gap: 12px; }
  .adminBody textarea { border-radius: 22px; min-height: 105px; resize: vertical; line-height: 1.45; }

  .sideBody { padding: 16px; display: grid; gap: 14px; }
  .routeImage { width: 100%; height: 170px; border-radius: 24px; background: linear-gradient(135deg, #dbe7c8, #aebf8d); overflow: hidden; display: flex; align-items: center; justify-content: center; color: #64748b; font-weight: 950; }
  .routeImage img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .statsGrid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 9px; }
  .miniStat { background: #fffdf7; border: 1px solid rgba(15,23,42,0.06); border-radius: 20px; padding: 12px; }
  .miniStat strong { display: block; color: #172018; font-size: 22px; font-weight: 950; letter-spacing: -0.06em; }
  .miniStat span { display: block; color: #64748b; font-size: 11px; font-weight: 850; margin-top: 3px; }

  .infoCard { background: #fffdf7; border: 1px solid rgba(15,23,42,0.06); border-radius: 24px; padding: 14px; }
  .infoCard > span { color: #64748b; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: 0.08em; }
  .infoCard > strong { display: block; margin-top: 5px; color: #172018; font-size: 14px; font-weight: 850; line-height: 1.45; }
  .infoCard small { color: #64748b; font-size: 12px; font-weight: 750; }

  .memberList { display: grid; gap: 9px; margin-top: 10px; }
  .member { display: grid; grid-template-columns: 38px minmax(0,1fr); gap: 10px; align-items: center; background: #fffdf7; border: 1px solid rgba(15,23,42,0.06); border-radius: 18px; padding: 9px; }
  .avatar { width: 38px; height: 38px; border-radius: 15px; background: #f0fdf4; color: #166534; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 950; }
  .member strong { display: block; color: #172018; font-size: 13px; font-weight: 950; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .member small { display: block; color: #64748b; font-size: 11px; font-weight: 800; margin-top: 2px; line-height: 1.35; }

  @media (max-width: 1040px) {
    .mainGrid, .heroContent { grid-template-columns: 1fr; }
    .chatBody { height: 520px; }
  }

  @media (max-width: 720px) {
    .header { padding: 8px 10px; }
    .headerInner { justify-content: flex-start; }
    .brandLogo img { width: 148px; max-height: 42px; }
    .headerActions { right: 0; gap: 6px; }
    .hideMobile { display: none; }
    .container { padding: 14px 12px 42px; }
    .hero, .chatPanel, .adminPanel, .sidePanel, .cycleBox { border-radius: 28px; }
    .hero { padding: 22px; }
    .heroContent { min-height: auto; }
    .hero h1 { font-size: 38px; }
    .cycleBox { align-items: stretch; flex-direction: column; }
    .cycleBox button { width: 100%; }
    .chatBody { height: 480px; padding: 14px; }
    .bubble { max-width: 88%; }
    .composer { grid-template-columns: 1fr; }
    .composer button { width: 100%; }
  }
`
