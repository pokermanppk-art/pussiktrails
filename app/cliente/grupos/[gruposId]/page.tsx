'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

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

function iniciais(nome?: string | null) {
  const partes = texto(nome || 'Participante').split(' ').filter(Boolean)
  const primeira = partes[0]?.[0] || 'P'
  const segunda = partes.length > 1 ? partes[partes.length - 1]?.[0] : ''
  return `${primeira}${segunda}`.toUpperCase()
}

export default function ClienteGrupoPage() {
  const router = useRouter()
  const params = useParams()
  const iniciouRef = useRef(false)
  const fimMensagensRef = useRef<HTMLDivElement | null>(null)

  const grupoId = texto(params?.grupoId || params?.id || '')

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [grupo, setGrupo] = useState<AnyRecord | null>(null)
  const [roteiro, setRoteiro] = useState<AnyRecord | null>(null)
  const [membros, setMembros] = useState<AnyRecord[]>([])
  const [mensagens, setMensagens] = useState<AnyRecord[]>([])
  const [stats, setStats] = useState<AnyRecord>({})

  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [mensagemTexto, setMensagemTexto] = useState('')
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
      carregarGrupo(extrairUsuarioId(user), false)
    }, 7000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, grupo?.id, acessoLiberado])

  useEffect(() => {
    rolarParaFim()
  }, [mensagens.length])

  async function iniciar() {
    try {
      setCarregando(true)
      setErro('')
      setAviso('')

      const salvo = localStorage.getItem('user')
      const usuario = salvo ? (JSON.parse(salvo) as UsuarioLocal) : null
      const usuarioId = extrairUsuarioId(usuario)

      if (!usuario || !usuarioId || normalizar(usuario.tipo) !== 'cliente') {
        router.replace('/login')
        return
      }

      if (!grupoId) {
        setErro('Grupo não identificado.')
        return
      }

      const usuarioNormalizado = { ...usuario, id: usuarioId }
      setUser(usuarioNormalizado)
      await carregarGrupo(usuarioId, true)
    } catch (error) {
      console.error('Erro ao iniciar grupo do cliente:', error)
      setErro('Não foi possível carregar o grupo agora.')
    } finally {
      setCarregando(false)
    }
  }

  async function carregarGrupo(clienteId: string, mostrarErro: boolean) {
    const response = await fetch('/api/grupos/detalhe-cliente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ grupoId, clienteId })
    })

    const data = await response.json().catch(() => null)

    if (!response.ok || !data?.sucesso) {
      if (mostrarErro) {
        setErro(data?.erro || data?.message || 'Não foi possível carregar o grupo.')
        setGrupo(data?.grupo || null)
        setAcessoLiberado(false)
      }
      return
    }

    setErro('')
    setGrupo(data.grupo || null)
    setRoteiro(data.roteiro || null)
    setMembros(Array.isArray(data.membros) ? data.membros : [])
    setMensagens(Array.isArray(data.mensagens) ? data.mensagens : [])
    setStats(data.stats || {})
    setUltimaAtualizacao(data.ultimaAtualizacao || new Date().toLocaleTimeString('pt-BR'))
    setAcessoLiberado(true)
  }

  async function enviarMensagem(event: FormEvent) {
    event.preventDefault()

    const clienteId = extrairUsuarioId(user)
    const conteudo = mensagemTexto.trim()

    if (!clienteId || !grupoId || !conteudo || enviando) return

    try {
      setEnviando(true)
      setErro('')
      setAviso('')

      const response = await fetch('/api/grupos/detalhe-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          action: 'enviar_mensagem',
          grupoId,
          clienteId,
          mensagem: conteudo
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.sucesso) {
        throw new Error(data?.erro || data?.message || 'Não foi possível enviar a mensagem.')
      }

      setMensagemTexto('')
      setGrupo(data.grupo || null)
      setRoteiro(data.roteiro || null)
      setMembros(Array.isArray(data.membros) ? data.membros : [])
      setMensagens(Array.isArray(data.mensagens) ? data.mensagens : [])
      setStats(data.stats || {})
      setUltimaAtualizacao(data.ultimaAtualizacao || new Date().toLocaleTimeString('pt-BR'))
      setAcessoLiberado(true)
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao enviar mensagem.')
    } finally {
      setEnviando(false)
    }
  }

  function rolarParaFim() {
    setTimeout(() => {
      fimMensagensRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, 80)
  }

  function mensagemEhMinha(mensagem: AnyRecord) {
    return !!user?.id && texto(mensagem.user_id || mensagem.usuario_id || mensagem.membro_id) === texto(user.id)
  }

  function mensagemEhSistema(mensagem: AnyRecord) {
    return normalizar(mensagem.tipo) === 'sistema'
  }

  function mensagemEhAvisoGuia(mensagem: AnyRecord) {
    return normalizar(mensagem.tipo) === 'aviso_guia'
  }

  if (carregando) {
    return (
      <main className="loadingScreen">
        <style jsx>{loadingStyles}</style>
        <div className="spinner" />
        <p>Abrindo grupo da aventura...</p>
      </main>
    )
  }

  const titulo = texto(roteiro?.titulo_visual || roteiro?.titulo || roteiro?.nome) || 'Grupo da aventura'
  const foto = texto(roteiro?.foto_visual || roteiro?.foto_capa || roteiro?.foto_url || roteiro?.imagem_url || roteiro?.imagem)
  const local = texto(roteiro?.local_visual || roteiro?.local || roteiro?.localizacao || roteiro?.cidade || roteiro?.local_encontro) || 'Local a confirmar'
  const data = roteiro?.data_visual || roteiro?.data_roteiro || roteiro?.data_saida || roteiro?.data
  const hora = roteiro?.hora_visual || roteiro?.hora_roteiro || roteiro?.hora_saida || roteiro?.hora

  return (
    <main className="page">
      <style jsx>{styles}</style>

      <header className="topbar">
        <div className="topbarInner">
          <div className="topbarSpacer" aria-hidden="true" />

          <button
            type="button"
            className="brand brandLogoOnly"
            onClick={() => router.push('/cliente/dashboard')}
            aria-label="Voltar para a dashboard do cliente"
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />
            <span>Grupo do roteiro</span>
          </button>

          <div className="topActions">
            <button type="button" className="profileButton" onClick={() => router.push('/cliente/perfil')}>
              {primeiroNome(user).slice(0, 1).toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroContent">
            <div>
              <div className="eyebrow">Grupo da aventura</div>
              <h1>
                {titulo}
                <br />
                <span>Agora começa a preparação.</span>
              </h1>
              <p>
                Este é o grupo interno do seu roteiro. Aqui o guia poderá enviar orientações, avisos e informações importantes para a experiência.
              </p>
            </div>

            <aside className="heroCard">
              <div className="heroCardLabel">Participantes</div>
              <div className="heroCardValue">{stats?.membros || membros.length}</div>
              <div className="heroCardText">
                {ultimaAtualizacao ? `Atualizado às ${ultimaAtualizacao}.` : 'Grupo interno do roteiro.'}
              </div>
            </aside>
          </div>
        </section>

        {erro && <div className="error">{erro}</div>}
        {aviso && <div className="message">{aviso}</div>}

        {!acessoLiberado ? (
          <section className="blocked">
            <div className="blockedIcon">🔒</div>
            <h2>Acesso ainda não liberado</h2>
            <p>O grupo do roteiro é liberado automaticamente depois que o pagamento da reserva é confirmado pelo sistema.</p>

            <div className="blockedActions">
              <button type="button" className="btn primary" onClick={() => router.push('/cliente/minhas-reservas')}>Voltar para reservas</button>
              <button type="button" className="btn light" onClick={() => router.push('/cliente/grupos')}>Meus grupos</button>
            </div>
          </section>
        ) : (
          <section className="mainGrid">
            <div className="chatPanel">
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">{grupo?.titulo || 'Grupo do roteiro'}</h2>
                  <div className="panelSub">Mensagens e orientações do grupo.</div>
                </div>
              </div>

              <div className="chatBody">
                {grupo?.aviso_fixado && (
                  <div className="messageWrap system">
                    <div className="bubble notice"><strong>Aviso do guia:</strong> {grupo.aviso_fixado}</div>
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
                  placeholder="Escreva uma mensagem para o grupo..."
                  maxLength={1000}
                />
                <button type="submit" className="sendBtn" disabled={enviando || !mensagemTexto.trim()}>
                  {enviando ? 'Enviando...' : 'Enviar'}
                </button>
              </form>
            </div>

            <aside className="sidePanel">
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">Informações</h2>
                  <div className="panelSub">Resumo do roteiro e participantes.</div>
                </div>
              </div>

              <div className="sideBody">
                <div className="roteiroImage">
                  {foto ? <img src={foto} alt={titulo} /> : 'Roteiro'}
                </div>

                <div className="infoCard"><div className="infoLabel">Local</div><div className="infoValue">{local}</div></div>
                <div className="infoCard"><div className="infoLabel">Data e hora</div><div className="infoValue">{formatarData(data)}{formatarHora(hora) ? ` · ${formatarHora(hora)}` : ''}</div></div>

                <div className="infoCard">
                  <div className="infoLabel">Participantes</div>
                  <div className="memberList">
                    {membros.map((membro) => (
                      <div className="member" key={membro.id}>
                        <div className="avatar">{iniciais(membro.usuario_nome)}</div>
                        <div style={{ minWidth: 0 }}>
                          <div className="memberName">{membro.usuario_nome || 'Participante'}</div>
                          <div className="memberRole">{membro.papel_visual || (normalizar(membro.papel) === 'guia_admin' ? 'Guia administrador' : 'Cliente confirmado')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="button" className="btn light" onClick={() => router.push('/cliente/grupos')}>Voltar para grupos</button>
              </div>
            </aside>
          </section>
        )}
      </div>
    </main>
  )
}

const loadingStyles = `
  .loadingScreen { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; background: radial-gradient(circle at 10% 0%, rgba(132,204,22,.16), transparent 28%), linear-gradient(180deg,#fffdf7,#eef2e5); color: #203c2e; font-family: Inter, system-ui, sans-serif; font-weight: 900; }
  .spinner { width: 44px; height: 44px; border-radius: 999px; border: 4px solid rgba(32,60,46,.12); border-top-color: #dc2626; animation: spin .9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`

const styles = `
  .page { min-height: 100vh; color: #172018; background: radial-gradient(circle at 10% 0%, rgba(132,204,22,.16), transparent 28%), radial-gradient(circle at 90% 10%, rgba(251,146,60,.14), transparent 28%), linear-gradient(180deg,#fffdf7 0%,#f3f5ea 48%,#eef2e5 100%); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  button { font: inherit; }
  .topbar { position: sticky; top: 0; z-index: 50; background: rgba(255,253,247,.92); border-bottom: 1px solid rgba(15,23,42,.06); backdrop-filter: blur(18px); padding: 9px 14px; }
  .topbarInner { max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: 42px minmax(0,1fr) 42px; align-items: center; gap: 10px; }
  .topbarSpacer { width: 42px; height: 42px; }
  .brand { grid-column: 2; justify-self: center; display: inline-flex; flex-direction: column; align-items: center; gap: 5px; border: 0; background: transparent; padding: 0; cursor: pointer; color: #172018; }
  .brand img { width: clamp(140px,34vw,250px); max-height: 58px; object-fit: contain; display: block; filter: drop-shadow(0 8px 18px rgba(32,60,46,.08)); }
  .brand span { color: #7b8375; font-size: clamp(8px,1.05vw,12px); font-weight: 850; letter-spacing: .18em; text-transform: uppercase; white-space: nowrap; }
  .topActions { grid-column: 3; justify-self: end; }
  .profileButton { width: 42px; height: 42px; border-radius: 999px; border: 1px solid rgba(15,23,42,.08); background: rgba(255,255,255,.86); color: #203c2e; box-shadow: 0 10px 22px rgba(15,23,42,.08); cursor: pointer; font-weight: 950; }
  .container { max-width: 1180px; margin: 0 auto; padding: 22px 16px 48px; }
  .hero { border-radius: 34px; padding: 28px; background: linear-gradient(135deg, rgba(32,60,46,.96), rgba(64,85,44,.92)), radial-gradient(circle at 90% 10%, rgba(212,179,90,.24), transparent 38%); color: #fffdf7; box-shadow: 0 28px 70px rgba(32,60,46,.18); overflow: hidden; margin-bottom: 16px; }
  .heroContent { display: grid; grid-template-columns: minmax(0,1fr) 260px; gap: 22px; align-items: end; }
  .eyebrow { color: #d4b35a; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: .16em; margin-bottom: 12px; }
  .hero h1 { margin: 0; font-size: clamp(38px,5vw,64px); line-height: .94; letter-spacing: -.08em; font-weight: 950; }
  .hero h1 span { color: #d4b35a; }
  .hero p { max-width: 650px; color: rgba(255,255,255,.82); line-height: 1.62; margin: 16px 0 0; font-size: 14px; }
  .heroCard { background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.18); border-radius: 28px; padding: 18px; backdrop-filter: blur(16px); }
  .heroCardLabel { color: rgba(255,255,255,.76); font-size: 11px; font-weight: 950; letter-spacing: .10em; text-transform: uppercase; }
  .heroCardValue { margin-top: 9px; color: #fff; font-size: 34px; line-height: 1.05; font-weight: 950; letter-spacing: -.06em; }
  .heroCardText { margin-top: 8px; color: rgba(255,255,255,.78); font-size: 12px; line-height: 1.45; font-weight: 750; }
  .message, .error { border-radius: 18px; padding: 13px 15px; margin-bottom: 16px; font-size: 13px; font-weight: 800; line-height: 1.45; }
  .message { background: #ecfdf5; color: #166534; border: 1px solid #bbf7d0; }
  .error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
  .blocked { background: rgba(255,255,255,.88); border: 1px solid rgba(15,23,42,.06); border-radius: 32px; padding: 30px; text-align: center; box-shadow: 0 12px 34px rgba(15,23,42,.06); }
  .blockedIcon { width: 64px; height: 64px; border-radius: 24px; background: #fef3c7; color: #92400e; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; font-size: 28px; }
  .blocked h2 { margin: 0; color: #172018; font-size: 26px; font-weight: 950; letter-spacing: -.05em; }
  .blocked p { color: #64748b; font-size: 14px; line-height: 1.6; font-weight: 700; max-width: 560px; margin: 10px auto 18px; }
  .blockedActions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .mainGrid { display: grid; grid-template-columns: minmax(0,1fr) 330px; gap: 16px; align-items: start; }
  .chatPanel, .sidePanel { background: rgba(255,255,255,.88); border: 1px solid rgba(15,23,42,.06); border-radius: 32px; box-shadow: 0 12px 34px rgba(15,23,42,.06); overflow: hidden; }
  .panelHeader { padding: 16px 18px; border-bottom: 1px solid rgba(15,23,42,.06); display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .panelTitle { margin: 0; font-size: 18px; font-weight: 950; color: #172018; letter-spacing: -.04em; }
  .panelSub { color: #64748b; font-size: 12px; font-weight: 700; margin-top: 3px; }
  .chatBody { height: 560px; overflow-y: auto; padding: 18px; background: radial-gradient(circle at top left, rgba(132,204,22,.08), transparent 26%), #fffdf7; }
  .messageWrap { display: flex; margin-bottom: 12px; }
  .messageWrap.mine { justify-content: flex-end; }
  .messageWrap.other { justify-content: flex-start; }
  .messageWrap.system { justify-content: center; }
  .bubble { max-width: min(74%,620px); border-radius: 22px; padding: 11px 13px; font-size: 13px; line-height: 1.45; font-weight: 700; box-shadow: 0 8px 20px rgba(15,23,42,.06); }
  .bubble.mine { background: #16a34a; color: #fff; border-bottom-right-radius: 8px; }
  .bubble.other { background: #fff; color: #172018; border: 1px solid rgba(15,23,42,.06); border-bottom-left-radius: 8px; }
  .bubble.system { background: #eef2e5; color: #64748b; border-radius: 999px; max-width: 88%; text-align: center; font-size: 12px; box-shadow: none; }
  .bubble.notice { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .messageName { font-size: 11px; font-weight: 950; opacity: .78; margin-bottom: 4px; }
  .messageTime { font-size: 10px; opacity: .72; margin-top: 5px; text-align: right; }
  .composer { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 10px; padding: 14px; border-top: 1px solid rgba(15,23,42,.06); background: rgba(255,255,255,.90); }
  .composerInput { width: 100%; border: 1px solid rgba(15,23,42,.08); background: #fffdf7; border-radius: 999px; padding: 13px 15px; color: #172018; outline: none; font-size: 14px; font-weight: 750; }
  .composerInput:focus { border-color: #84cc16; box-shadow: 0 0 0 4px rgba(132,204,22,.12); }
  .sendBtn, .btn { border: none; border-radius: 999px; padding: 12px 16px; font-size: 13px; font-weight: 950; cursor: pointer; transition: .2s ease; }
  .sendBtn, .btn.primary { background: #172018; color: #fff; }
  .btn.light { background: #eef2e5; color: #475569; }
  .sendBtn:disabled { opacity: .6; cursor: not-allowed; }
  .sideBody { padding: 16px; display: grid; gap: 14px; }
  .roteiroImage { width: 100%; height: 170px; border-radius: 24px; background: radial-gradient(circle at top right, rgba(251,146,60,.20), transparent 38%), linear-gradient(135deg,#dbe7c8,#aebf8d); overflow: hidden; display: flex; align-items: center; justify-content: center; color: #64748b; font-weight: 950; }
  .roteiroImage img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .infoCard { background: #fffdf7; border: 1px solid rgba(15,23,42,.06); border-radius: 24px; padding: 14px; }
  .infoLabel { color: #64748b; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: .08em; }
  .infoValue { color: #172018; font-size: 14px; font-weight: 850; margin-top: 5px; line-height: 1.45; }
  .memberList { margin-top: 10px; display: grid; gap: 9px; }
  .member { display: grid; grid-template-columns: 38px minmax(0,1fr); gap: 10px; align-items: center; background: #fffdf7; border: 1px solid rgba(15,23,42,.06); border-radius: 18px; padding: 9px; }
  .avatar { width: 38px; height: 38px; border-radius: 15px; background: #f0fdf4; color: #166534; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 950; }
  .memberName { color: #172018; font-size: 13px; font-weight: 950; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .memberRole { color: #64748b; font-size: 11px; font-weight: 800; margin-top: 2px; }
  @media (max-width: 1040px) { .mainGrid, .heroContent { grid-template-columns: 1fr; } .chatBody { height: 520px; } }
  @media (max-width: 720px) { .container { padding: 16px 12px 42px; } .topbarInner { grid-template-columns: 36px minmax(0,1fr) 36px; } .topbarSpacer, .profileButton { width: 36px; height: 36px; } .brand img { width: clamp(134px,46vw,210px); max-height: 50px; } .brand span { font-size: 7.5px; letter-spacing: .12em; } .hero, .chatPanel, .sidePanel { border-radius: 28px; } .hero { padding: 22px; } .hero h1 { font-size: 38px; } .chatBody { height: 480px; padding: 14px; } .bubble { max-width: 88%; } .composer { grid-template-columns: 1fr; } .sendBtn { width: 100%; } }
`
