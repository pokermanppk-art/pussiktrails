'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type UsuarioLocal = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
  tipo?: string | null
}

type GrupoRoteiro = {
  id: string
  roteiro_id?: string | null
  guia_id?: string | null
  titulo?: string | null
  descricao?: string | null
  aviso_fixado?: string | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type Roteiro = {
  id: string
  titulo?: string | null
  nome?: string | null
  descricao?: string | null
  local?: string | null
  localizacao?: string | null
  local_encontro?: string | null
  ponto_encontro?: string | null
  data_roteiro?: string | null
  data_saida?: string | null
  data?: string | null
  hora_roteiro?: string | null
  hora_saida?: string | null
  hora?: string | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  imagem?: string | null
  preco?: number | null
  valor?: number | null
  status?: string | null
  [key: string]: any
}

type Reserva = {
  id: string
  cliente_id?: string | null
  roteiro_id?: string | null
  quantidade_pessoas?: number | null
  valor_total?: number | null
  status?: string | null
  pagamento_status?: string | null
  created_at?: string | null
  cliente_nome?: string
  cliente_email?: string
  [key: string]: any
}

type MembroGrupo = {
  id: string
  grupo_id: string
  user_id?: string | null
  usuario_id?: string | null
  membro_id?: string | null
  reserva_id?: string | null
  papel?: string | null
  status?: string | null
  entrou_em?: string | null
  usuario_nome?: string
  usuario_email?: string
  [key: string]: any
}

type MensagemGrupo = {
  id: string
  grupo_id: string
  user_id?: string | null
  mensagem: string
  tipo?: 'texto' | 'sistema' | 'aviso_guia' | string
  status?: string | null
  created_at?: string | null
  usuario_nome?: string
  [key: string]: any
}

type StatsGrupo = {
  clientesConfirmados: number
  reservasConfirmadas: number
  pessoasConfirmadas: number
  valorConfirmado: number
}

const statsInicial: StatsGrupo = {
  clientesConfirmados: 0,
  reservasConfirmadas: 0,
  pessoasConfirmadas: 0,
  valorConfirmado: 0
}

export default function GuiaGrupoDetalhePage() {
  const router = useRouter()
  const params = useParams()
  const iniciouRef = useRef(false)
  const fimMensagensRef = useRef<HTMLDivElement | null>(null)

  const parametroGrupo = String(
    (params as any)?.grupoId ||
      (params as any)?.id ||
      Object.values((params as any) || {})[0] ||
      ''
  )

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [grupo, setGrupo] = useState<GrupoRoteiro | null>(null)
  const [roteiro, setRoteiro] = useState<Roteiro | null>(null)
  const [membros, setMembros] = useState<MembroGrupo[]>([])
  const [mensagens, setMensagens] = useState<MensagemGrupo[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [stats, setStats] = useState<StatsGrupo>(statsInicial)

  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [salvandoAviso, setSalvandoAviso] = useState(false)
  const [atualizando, setAtualizando] = useState(false)

  const [mensagemTexto, setMensagemTexto] = useState('')
  const [avisoTexto, setAvisoTexto] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [acessoLiberado, setAcessoLiberado] = useState(false)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('')

  useEffect(() => {
    if (iniciouRef.current) return
    iniciouRef.current = true
    iniciar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!user?.id || !grupo?.id || !acessoLiberado) return

    const interval = setInterval(() => {
      carregarGrupoCompleto(user.id, false)
    }, 8000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, grupo?.id, acessoLiberado])

  useEffect(() => {
    rolarParaFim()
  }, [mensagens.length])

  function normalizar(valor?: string | null) {
    return String(valor || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }

  function nomeUsuario(usuario?: UsuarioLocal | null) {
    return usuario?.nome || usuario?.name || usuario?.email || 'Guia'
  }

  function tituloRoteiro(item?: Roteiro | null) {
    return item?.titulo || item?.nome || 'Roteiro'
  }

  function imagemRoteiro(item?: Roteiro | null) {
    return item?.foto_capa || item?.foto_url || item?.imagem_url || item?.imagem || ''
  }

  function localRoteiro(item?: Roteiro | null) {
    return (
      item?.local ||
      item?.localizacao ||
      item?.local_encontro ||
      item?.ponto_encontro ||
      'Local a confirmar'
    )
  }

  function dataRoteiro(item?: Roteiro | null) {
    return item?.data_roteiro || item?.data_saida || item?.data || null
  }

  function horaRoteiro(item?: Roteiro | null) {
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

    if (!Number.isNaN(data.getTime())) {
      return data.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    return String(valor).slice(0, 5)
  }

  function formatarMoeda(valor: any) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(valor || 0))
  }

  function iniciais(nome?: string | null) {
    const partes = String(nome || 'Participante')
      .trim()
      .split(' ')
      .filter(Boolean)

    const primeira = partes[0]?.[0] || 'P'
    const segunda = partes.length > 1 ? partes[partes.length - 1]?.[0] : ''

    return `${primeira}${segunda}`.toUpperCase()
  }

  function papelGuiaAdmin(papel?: string | null) {
    const valor = normalizar(papel)
    return valor === 'guia_admin' || valor === 'admin' || valor === 'guia' || valor === 'administrador'
  }

  function mensagemEhMinha(mensagem: MensagemGrupo) {
    return !!user?.id && mensagem.user_id === user.id
  }

  function mensagemEhSistema(mensagem: MensagemGrupo) {
    return mensagem.tipo === 'sistema'
  }

  function mensagemEhAvisoGuia(mensagem: MensagemGrupo) {
    return mensagem.tipo === 'aviso_guia'
  }

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

      if (!parametroGrupo) {
        setErro('Grupo não identificado.')
        setAcessoLiberado(false)
        return
      }

      setUser(parsedUser)
      await carregarGrupoCompleto(parsedUser.id, true)
    } catch (error) {
      console.error('Erro ao iniciar grupo do guia:', error)
      setErro('Não foi possível carregar o grupo agora.')
      setAcessoLiberado(false)
    } finally {
      setCarregando(false)
    }
  }

  async function chamarApiGrupo(payload: Record<string, any>) {
    const response = await fetch('/api/grupos/detalhe-guia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        grupoId: grupo?.id || parametroGrupo,
        guiaId: user?.id,
        ...payload
      })
    })

    const data = await response.json().catch(() => null)

    if (!response.ok || !data?.sucesso) {
      throw new Error(data?.erro || data?.message || 'Não foi possível carregar o grupo.')
    }

    return data
  }

  async function carregarGrupoCompleto(guiaId: string, mostrarErro = true) {
    try {
      const response = await fetch('/api/grupos/detalhe-guia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          acao: 'detalhe',
          grupoId: grupo?.id || parametroGrupo,
          guiaId
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.sucesso) {
        throw new Error(data?.erro || data?.message || 'Não foi possível carregar o grupo.')
      }

      setGrupo(data.grupo || null)
      setRoteiro(data.roteiro || null)
      setMembros(Array.isArray(data.membros) ? data.membros : [])
      setMensagens(Array.isArray(data.mensagens) ? data.mensagens : [])
      setReservas(Array.isArray(data.reservas) ? data.reservas : [])
      setStats({ ...statsInicial, ...(data.stats || {}) })
      setAvisoTexto(data.grupo?.aviso_fixado || '')
      setUltimaAtualizacao(data.ultimaAtualizacao || new Date().toLocaleTimeString('pt-BR'))
      setErro('')
      setAcessoLiberado(true)
    } catch (error: any) {
      console.error('Erro ao carregar grupo via API:', error)
      if (mostrarErro) setErro(error?.message || 'Não foi possível carregar o grupo.')
      setAcessoLiberado(false)
    }
  }

  function rolarParaFim() {
    setTimeout(() => {
      fimMensagensRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      })
    }, 80)
  }

  async function enviarMensagem(event: FormEvent) {
    event.preventDefault()

    if (!user?.id || !acessoLiberado) return

    const texto = mensagemTexto.trim()
    if (!texto) return

    setEnviando(true)
    setErro('')
    setAviso('')

    try {
      const data = await chamarApiGrupo({
        acao: 'enviar_mensagem',
        mensagem: texto
      })

      setMensagemTexto('')
      setGrupo(data.grupo || grupo)
      setRoteiro(data.roteiro || roteiro)
      setMembros(Array.isArray(data.membros) ? data.membros : membros)
      setMensagens(Array.isArray(data.mensagens) ? data.mensagens : mensagens)
      setReservas(Array.isArray(data.reservas) ? data.reservas : reservas)
      setStats({ ...statsInicial, ...(data.stats || {}) })
      setUltimaAtualizacao(data.ultimaAtualizacao || new Date().toLocaleTimeString('pt-BR'))
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error)
      setErro(error?.message || 'Não foi possível enviar a mensagem.')
    } finally {
      setEnviando(false)
    }
  }

  async function salvarAvisoFixado() {
    if (!user?.id || !acessoLiberado) return

    setSalvandoAviso(true)
    setErro('')
    setAviso('')

    try {
      const data = await chamarApiGrupo({
        acao: 'salvar_aviso',
        aviso: avisoTexto.trim()
      })

      setGrupo(data.grupo || grupo)
      setMensagens(Array.isArray(data.mensagens) ? data.mensagens : mensagens)
      setAviso(data.mensagem || 'Aviso do grupo atualizado.')
    } catch (error: any) {
      console.error('Erro ao salvar aviso:', error)
      setErro(error?.message || 'Não foi possível salvar o aviso.')
    } finally {
      setSalvandoAviso(false)
    }
  }

  async function atualizarTudo() {
    if (!user?.id) return

    setAtualizando(true)
    setErro('')
    setAviso('')

    try {
      await carregarGrupoCompleto(user.id, true)
      setAviso('Grupo atualizado.')
    } finally {
      setAtualizando(false)
    }
  }

  async function encerrarGrupo() {
    if (!user?.id || !grupo?.id) return

    const confirmar = window.confirm(
      'Deseja encerrar este grupo? Os participantes ainda poderão ver o histórico, mas o grupo ficará marcado como encerrado.'
    )

    if (!confirmar) return

    try {
      const data = await chamarApiGrupo({
        acao: 'encerrar'
      })

      setGrupo(data.grupo || grupo)
      setMensagens(Array.isArray(data.mensagens) ? data.mensagens : mensagens)
      setAviso(data.mensagem || 'Grupo encerrado.')
    } catch (error: any) {
      console.error('Erro ao encerrar grupo:', error)
      setErro(error?.message || 'Não foi possível encerrar o grupo.')
    }
  }

  const foto = imagemRoteiro(roteiro)

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
          <button
            className="brand brandLogoOnly"
            type="button"
            onClick={() => router.push('/guia/dashboard')}
            aria-label="Voltar para dashboard do guia"
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          </button>

          <div className="headerActions">
            <button type="button" className="iconBtn" onClick={() => router.push('/guia/grupos')}>
              Grupos
            </button>
            <button type="button" className="iconBtn hideMobile" onClick={atualizarTudo} disabled={atualizando}>
              {atualizando ? '…' : 'Atualizar'}
            </button>
            <button type="button" className="iconBtn primary" onClick={() => router.push('/guia/perfil')}>
              Perfil
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroContent">
            <div>
              <div className="eyebrow">Administração do grupo</div>
              <h1 className="heroTitle">
                {tituloRoteiro(roteiro)}
                <br />
                <span>Conduza sua comunidade.</span>
              </h1>
              <p className="heroText">
                Envie orientações, acompanhe participantes confirmados, fixe avisos e mantenha o grupo organizado antes da experiência.
              </p>
            </div>

            <aside className="heroCard">
              <div className="heroCardLabel">Status do grupo</div>
              <div className="heroCardValue">{grupo?.status || 'ativo'}</div>
              <div className="heroCardText">
                {ultimaAtualizacao ? `Atualizado às ${ultimaAtualizacao}.` : 'Grupo interno do roteiro.'}
              </div>
            </aside>
          </div>
        </section>

        {erro && <div className="alert error">{erro}</div>}
        {aviso && <div className="alert info">{aviso}</div>}

        {!acessoLiberado ? (
          <section className="blocked">
            <h2>Sem permissão para administrar este grupo</h2>
            <p>
              O acesso administrativo é liberado para o guia vinculado ao roteiro. Use a tela de grupos para sincronizar novamente, se necessário.
            </p>
            <button type="button" className="btn primary" onClick={() => router.push('/guia/grupos')}>
              Voltar para grupos
            </button>
          </section>
        ) : (
          <section className="mainGrid">
            <div>
              <div className="chatPanel">
                <div className="panelHeader">
                  <div>
                    <h2 className="panelTitle">{grupo?.titulo || 'Grupo do roteiro'}</h2>
                    <div className="panelSub">Mensagens do grupo e comunicação com participantes.</div>
                  </div>
                </div>

                <div className="chatBody">
                  {grupo?.aviso_fixado && (
                    <div className="messageWrap system">
                      <div className="bubble notice">
                        <strong>Aviso fixado:</strong> {grupo.aviso_fixado}
                      </div>
                    </div>
                  )}

                  {mensagens.length === 0 ? (
                    <div className="messageWrap system">
                      <div className="bubble system">O grupo foi criado. As mensagens aparecerão aqui.</div>
                    </div>
                  ) : (
                    mensagens.map((mensagem) => {
                      if (mensagemEhSistema(mensagem)) {
                        return (
                          <div className="messageWrap system" key={mensagem.id}>
                            <div className="bubble system">{mensagem.mensagem}</div>
                          </div>
                        )
                      }

                      const minha = mensagemEhMinha(mensagem)
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
                    className="composerInput"
                    value={mensagemTexto}
                    onChange={(event) => setMensagemTexto(event.target.value)}
                    placeholder="Escreva uma mensagem para os participantes..."
                    maxLength={1000}
                  />
                  <button type="submit" className="sendBtn" disabled={enviando || !mensagemTexto.trim()}>
                    {enviando ? 'Enviando...' : 'Enviar'}
                  </button>
                </form>
              </div>

              <section className="adminPanel">
                <div className="panelHeader">
                  <div>
                    <h2 className="panelTitle">Aviso fixado</h2>
                    <div className="panelSub">Use para orientar todo o grupo com uma informação importante.</div>
                  </div>
                </div>

                <div className="adminBox">
                  <textarea
                    className="textarea"
                    value={avisoTexto}
                    onChange={(event) => setAvisoTexto(event.target.value)}
                    placeholder="Ex.: Encontro às 6h30 no estacionamento principal. Levar água, lanterna e agasalho."
                    maxLength={800}
                  />
                  <button type="button" className="btn green" onClick={salvarAvisoFixado} disabled={salvandoAviso}>
                    {salvandoAviso ? 'Salvando...' : 'Salvar aviso fixado'}
                  </button>
                </div>
              </section>
            </div>

            <aside className="sidePanel">
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Controle do grupo</h2>
                  <div className="panelSub">Participantes, reservas e dados do roteiro.</div>
                </div>
              </div>

              <div className="sideBody">
                <div className="roteiroImage">{foto ? <img src={foto} alt={tituloRoteiro(roteiro)} /> : 'Roteiro'}</div>

                <div className="statsGrid">
                  <div className="miniStat"><div className="miniValue">{stats.clientesConfirmados}</div><div className="miniLabel">clientes no grupo</div></div>
                  <div className="miniStat"><div className="miniValue">{stats.reservasConfirmadas}</div><div className="miniLabel">reservas pagas</div></div>
                  <div className="miniStat"><div className="miniValue">{stats.pessoasConfirmadas}</div><div className="miniLabel">participantes</div></div>
                  <div className="miniStat"><div className="miniValue">{formatarMoeda(stats.valorConfirmado)}</div><div className="miniLabel">confirmado</div></div>
                </div>

                <div className="infoCard"><div className="infoLabel">Local</div><div className="infoValue">{localRoteiro(roteiro)}</div></div>
                <div className="infoCard"><div className="infoLabel">Data e hora</div><div className="infoValue">{formatarData(dataRoteiro(roteiro))}{horaRoteiro(roteiro) ? ` · ${horaRoteiro(roteiro)}` : ''}</div></div>

                <div className="infoCard">
                  <div className="infoLabel">Participantes no grupo</div>
                  <div className="memberList">
                    {membros.length === 0 ? (
                      <div className="memberRole">Nenhum participante ativo ainda.</div>
                    ) : (
                      membros.map((membro) => (
                        <div className="member" key={membro.id}>
                          <div className="avatar">{iniciais(membro.usuario_nome)}</div>
                          <div style={{ minWidth: 0 }}>
                            <div className="memberName">{membro.usuario_nome || 'Participante'}</div>
                            <div className="memberRole">{papelGuiaAdmin(membro.papel) ? 'Guia administrador' : 'Cliente confirmado'}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="infoCard">
                  <div className="infoLabel">Reservas confirmadas</div>
                  <div className="reservationList">
                    {reservas.length === 0 ? (
                      <div className="memberRole">Nenhuma reserva vinculada ainda.</div>
                    ) : (
                      reservas.slice(0, 8).map((reserva) => (
                        <div className="reservation" key={reserva.id}>
                          <div className="avatar">{iniciais(reserva.cliente_nome)}</div>
                          <div style={{ minWidth: 0 }}>
                            <div className="reservationName">{reserva.cliente_nome || 'Cliente'}</div>
                            <div className="reservationMeta">{reserva.quantidade_pessoas || 1} pessoa(s) · {formatarMoeda(reserva.valor_total || 0)}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button type="button" className="btn light" onClick={() => router.push('/guia/grupos')}>Voltar para grupos</button>
                {normalizar(grupo?.status) === 'ativo' && <button type="button" className="btn danger" onClick={encerrarGrupo}>Encerrar grupo</button>}
              </div>
            </aside>
          </section>
        )}
      </div>
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
      radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.16), transparent 28%),
      radial-gradient(circle at 90% 10%, rgba(251, 146, 60, 0.14), transparent 28%),
      linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
    color: #172018;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loadingCard {
    background: #ffffff;
    border: 1px solid rgba(15, 23, 42, 0.06);
    border-radius: 30px;
    padding: 28px;
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
    text-align: center;
    font-weight: 850;
  }

  .loadingCard img {
    height: 68px;
    width: auto;
    margin-bottom: 12px;
  }

  .header {
    position: sticky;
    top: 0;
    z-index: 40;
    background: rgba(255, 253, 247, 0.92);
    border-bottom: 1px solid rgba(15, 23, 42, 0.06);
    backdrop-filter: blur(18px);
    padding: 9px 14px;
  }

  .headerInner {
    max-width: 1180px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
  }

  .brandLogoOnly {
    grid-column: 2;
    border: 0;
    background: transparent;
    padding: 0;
    cursor: pointer;
    display: flex;
    justify-content: center;
  }

  .brandLogoOnly img {
    width: clamp(150px, 26vw, 230px);
    max-height: 54px;
    object-fit: contain;
    display: block;
  }

  .headerActions {
    grid-column: 3;
    display: flex;
    gap: 7px;
    align-items: center;
    justify-content: flex-end;
  }

  .iconBtn,
  .btn,
  .sendBtn {
    min-height: 38px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    background: rgba(255,255,255,0.78);
    border-radius: 999px;
    padding: 0 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 12px;
    font-weight: 950;
    color: #172018;
    white-space: nowrap;
  }

  .iconBtn.primary,
  .btn.primary,
  .sendBtn {
    background: #172018;
    color: #ffffff;
    border-color: #172018;
  }

  .btn.green { background: #16a34a; color: #ffffff; border-color: #16a34a; }
  .btn.light { background: #eef2e5; color: #475569; }
  .btn.danger { background: #fee2e2; color: #991b1b; border-color: #fecaca; }

  .iconBtn:disabled,
  .btn:disabled,
  .sendBtn:disabled {
    opacity: 0.6;
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
    padding: 28px;
    min-height: 285px;
    background:
      linear-gradient(135deg, rgba(23, 32, 24, 0.76), rgba(23, 32, 24, 0.34)),
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
    gap: 22px;
    align-items: end;
    min-height: 225px;
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
    font-size: clamp(38px, 5.4vw, 64px);
    line-height: 0.94;
    font-weight: 950;
    letter-spacing: -0.08em;
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
    font-weight: 650;
  }

  .heroCard {
    background: rgba(255, 255, 255, 0.14);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 30px;
    padding: 18px;
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
    font-size: 30px;
    line-height: 1.05;
    font-weight: 950;
    letter-spacing: -0.06em;
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
    font-weight: 850;
    line-height: 1.45;
  }

  .alert.info { background: #ecfdf5; color: #166534; border: 1px solid #bbf7d0; }
  .alert.error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

  .blocked {
    background: rgba(255,255,255,0.88);
    border: 1px solid rgba(15, 23, 42, 0.06);
    border-radius: 32px;
    padding: 28px;
    text-align: center;
    box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
  }

  .blocked h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 950;
    letter-spacing: -0.045em;
  }

  .blocked p {
    margin: 8px auto 16px;
    max-width: 560px;
    color: #64748b;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 750;
  }

  .mainGrid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 350px;
    gap: 16px;
    align-items: start;
  }

  .chatPanel,
  .sidePanel,
  .adminPanel {
    background: rgba(255,255,255,0.88);
    border: 1px solid rgba(15, 23, 42, 0.06);
    border-radius: 32px;
    box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
    overflow: hidden;
  }

  .adminPanel { margin-top: 16px; }

  .panelHeader {
    padding: 16px 18px;
    border-bottom: 1px solid rgba(15, 23, 42, 0.06);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .panelTitle {
    margin: 0;
    font-size: 18px;
    font-weight: 950;
    color: #172018;
    letter-spacing: -0.04em;
  }

  .panelSub {
    color: #64748b;
    font-size: 12px;
    font-weight: 700;
    margin-top: 3px;
  }

  .chatBody {
    height: 560px;
    overflow-y: auto;
    padding: 18px;
    background:
      radial-gradient(circle at top left, rgba(132, 204, 22, 0.08), transparent 26%),
      #fffdf7;
  }

  .messageWrap { display: flex; margin-bottom: 12px; }
  .messageWrap.mine { justify-content: flex-end; }
  .messageWrap.other { justify-content: flex-start; }
  .messageWrap.system { justify-content: center; }

  .bubble {
    max-width: min(74%, 620px);
    border-radius: 22px;
    padding: 11px 13px;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 700;
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
  }

  .bubble.mine { background: #172018; color: #ffffff; border-bottom-right-radius: 8px; }
  .bubble.other { background: #ffffff; color: #172018; border: 1px solid rgba(15, 23, 42, 0.06); border-bottom-left-radius: 8px; }
  .bubble.system { background: #eef2e5; color: #64748b; border-radius: 999px; max-width: 88%; text-align: center; font-size: 12px; box-shadow: none; }
  .bubble.notice { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }

  .messageName { font-size: 11px; font-weight: 950; opacity: 0.78; margin-bottom: 4px; }
  .messageTime { font-size: 10px; opacity: 0.72; margin-top: 5px; text-align: right; }

  .composer {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    padding: 14px;
    border-top: 1px solid rgba(15, 23, 42, 0.06);
    background: rgba(255,255,255,0.90);
  }

  .composerInput,
  .textarea {
    width: 100%;
    border: 1px solid rgba(15, 23, 42, 0.08);
    background: #fffdf7;
    border-radius: 999px;
    padding: 13px 15px;
    color: #172018;
    outline: none;
    font-size: 14px;
    font-weight: 750;
  }

  .textarea {
    min-height: 105px;
    resize: vertical;
    border-radius: 22px;
    line-height: 1.45;
  }

  .sideBody,
  .adminBox {
    padding: 16px;
    display: grid;
    gap: 14px;
  }

  .roteiroImage {
    width: 100%;
    height: 170px;
    border-radius: 24px;
    background:
      radial-gradient(circle at top right, rgba(251, 146, 60, 0.20), transparent 38%),
      linear-gradient(135deg, #dbe7c8, #aebf8d);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    font-weight: 950;
  }

  .roteiroImage img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .infoCard {
    background: #fffdf7;
    border: 1px solid rgba(15, 23, 42, 0.06);
    border-radius: 24px;
    padding: 14px;
  }

  .infoLabel {
    color: #64748b;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .infoValue {
    color: #172018;
    font-size: 14px;
    font-weight: 850;
    margin-top: 5px;
    line-height: 1.45;
  }

  .statsGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }

  .miniStat {
    background: #fffdf7;
    border: 1px solid rgba(15, 23, 42, 0.06);
    border-radius: 20px;
    padding: 12px;
  }

  .miniValue { color: #172018; font-size: 22px; font-weight: 950; letter-spacing: -0.06em; }
  .miniLabel { color: #64748b; font-size: 11px; font-weight: 850; margin-top: 3px; }

  .memberList,
  .reservationList { display: grid; gap: 9px; margin-top: 10px; }

  .member,
  .reservation {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
    background: #fffdf7;
    border: 1px solid rgba(15, 23, 42, 0.06);
    border-radius: 18px;
    padding: 9px;
  }

  .avatar {
    width: 38px;
    height: 38px;
    border-radius: 15px;
    background: #f0fdf4;
    color: #166534;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 950;
  }

  .memberName,
  .reservationName {
    color: #172018;
    font-size: 13px;
    font-weight: 950;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .memberRole,
  .reservationMeta {
    color: #64748b;
    font-size: 11px;
    font-weight: 800;
    margin-top: 2px;
    line-height: 1.35;
  }

  @media (max-width: 1040px) {
    .mainGrid,
    .heroContent { grid-template-columns: 1fr; }
    .chatBody { height: 520px; }
  }

  @media (max-width: 720px) {
    .header { padding: 8px 10px; }
    .headerInner { grid-template-columns: 1fr auto 1fr; }
    .brandLogoOnly img { width: clamp(130px, 44vw, 196px); max-height: 48px; }
    .headerActions { gap: 5px; }
    .headerActions .hideMobile { display: none; }
    .iconBtn { min-height: 36px; padding: 0 11px; font-size: 11px; }
    .container { padding: 16px 12px 42px; }
    .hero, .chatPanel, .sidePanel, .adminPanel { border-radius: 28px; }
    .hero { padding: 22px; min-height: auto; }
    .heroContent { min-height: auto; }
    .heroTitle { font-size: 38px; }
    .chatBody { height: 480px; padding: 14px; }
    .bubble { max-width: 88%; }
    .composer { grid-template-columns: 1fr; }
    .sendBtn { width: 100%; }
  }
`
