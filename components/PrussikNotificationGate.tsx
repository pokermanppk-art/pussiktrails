'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

type UsuarioLocal = {
  id?: string | null
  tipo?: string | null
  nome?: string | null
  email?: string | null
}

type NotificacaoStatus = {
  id: string
  tipo: 'legal' | 'versao' | 'movimento' | 'reserva' | 'grupo' | 'sistema' | string
  titulo: string
  descricao: string
  prioridade?: 'baixa' | 'normal' | 'alta' | 'critica' | string
  acao?: string
  href?: string
  count?: number
  metadata?: Record<string, unknown>
}

type StatusResponse = {
  sucesso?: boolean
  total?: number
  badge?: number
  notificacoes?: NotificacaoStatus[]
  erro?: string
}

const APP_VERSION = '2026.06.26.legal-notifications-v1'

const VERSION_STORAGE_KEY = 'prussik_app_version'
const UPDATE_ACK_KEY = `prussik_update_ack_${APP_VERSION}`

const CONTEXTO_ACEITE_RETROATIVO = 'login_retroativo_2026_06_26'

const ROTAS_SEM_MODAL_AUTOMATICO = [
  '/login',
  '/cadastro',
  '/recuperar-senha',
  '/termos',
  '/politica-de-privacidade',
  '/politica-de-cookies',
  '/fornecedores',
  '/termo-do-guia',
  '/termo-de-riscos',
]

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function tipoNormalizado(tipo?: string | null) {
  return texto(tipo).toLowerCase()
}

function rotaSemModalAutomatico(pathname: string) {
  return ROTAS_SEM_MODAL_AUTOMATICO.some((rota) => pathname === rota || pathname.startsWith(`${rota}/`))
}

function lerUsuarioLocal(): UsuarioLocal | null {
  if (typeof window === 'undefined') return null

  const raw = localStorage.getItem('user')

  if (!raw) return null

  try {
    const user = JSON.parse(raw) as UsuarioLocal

    if (!texto(user?.id)) return null

    return user
  } catch {
    return null
  }
}

function chaveAceiteLocal(userId: string) {
  return `prussik_aceite_retroativo_${CONTEXTO_ACEITE_RETROATIVO}_${userId}`
}

function documentosObrigatoriosPorUsuario(tipo?: string | null) {
  const t = tipoNormalizado(tipo)

  const documentos = ['termos_uso', 'politica_privacidade', 'politica_cookies']

  if (t === 'guia') {
    documentos.push('termo_guia')
  }

  return documentos
}

async function atualizarBadgeApp(total: number) {
  try {
    const valor = Math.max(0, Number(total || 0))

    localStorage.setItem('prussik_notification_count', String(valor))

    if (valor > 0) {
      if ('setAppBadge' in navigator && typeof navigator.setAppBadge === 'function') {
        await navigator.setAppBadge(valor)
      }

      return
    }

    if ('clearAppBadge' in navigator && typeof navigator.clearAppBadge === 'function') {
      await navigator.clearAppBadge()
    }
  } catch (error) {
    console.warn('Não foi possível atualizar o badge do app:', error)
  }
}

function criarNotificacaoVersao(): NotificacaoStatus {
  return {
    id: 'versao-pwa',
    tipo: 'versao',
    titulo: 'Atualização recomendada',
    descricao:
      'Seu app instalado pode estar em uma versão antiga. Recomendamos remover o ícone antigo e instalar novamente.',
    prioridade: 'alta',
    acao: 'Ver instruções',
    count: 1,
  }
}

export default function PrussikNotificationGate() {
  const pathname = usePathname()

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [notificacoesApi, setNotificacoesApi] = useState<NotificacaoStatus[]>([])
  const [versaoPendente, setVersaoPendente] = useState(false)
  const [drawerAberto, setDrawerAberto] = useState(false)
  const [modalAceiteAberto, setModalAceiteAberto] = useState(false)
  const [modalVersaoAberto, setModalVersaoAberto] = useState(false)
  const [maioridadeConfirmada, setMaioridadeConfirmada] = useState(false)
  const [termosConfirmados, setTermosConfirmados] = useState(false)
  const [registrandoAceite, setRegistrandoAceite] = useState(false)
  const [mensagemAceite, setMensagemAceite] = useState('')
  const [erroStatus, setErroStatus] = useState('')
  const [carregandoStatus, setCarregandoStatus] = useState(false)

  const notificacaoLegal = useMemo(() => {
    return notificacoesApi.find((notificacao) => notificacao.tipo === 'legal') || null
  }, [notificacoesApi])

  const aceitePendente = Boolean(notificacaoLegal)

  const notificacoes = useMemo<NotificacaoStatus[]>(() => {
    const lista = [...notificacoesApi]

    if (versaoPendente && !lista.some((notificacao) => notificacao.id === 'versao-pwa')) {
      lista.push(criarNotificacaoVersao())
    }

    return lista
  }, [notificacoesApi, versaoPendente])

  const totalNotificacoes = useMemo(() => {
    return notificacoes.reduce((soma, item) => soma + Math.max(1, Number(item.count || 1)), 0)
  }, [notificacoes])

  const verificarVersaoPwa = useCallback((userAtual: UsuarioLocal | null) => {
    if (!userAtual?.id) {
      if (!localStorage.getItem(VERSION_STORAGE_KEY)) {
        localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION)
      }

      return false
    }

    const tipo = tipoNormalizado(userAtual.tipo)

    if (tipo === 'admin') {
      localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION)
      return false
    }

    const versaoSalva = localStorage.getItem(VERSION_STORAGE_KEY)
    const jaReconheceuAtualizacao = localStorage.getItem(UPDATE_ACK_KEY) === 'sim'

    if (jaReconheceuAtualizacao) return false

    if (!versaoSalva) return true

    return versaoSalva !== APP_VERSION
  }, [])

  const carregarStatus = useCallback(async () => {
    const userAtual = lerUsuarioLocal()

    setUser(userAtual)

    const temVersaoPendente = verificarVersaoPwa(userAtual)
    setVersaoPendente(temVersaoPendente)

    if (!userAtual?.id) {
      setNotificacoesApi([])
      setErroStatus('')
      await atualizarBadgeApp(temVersaoPendente ? 1 : 0)
      return
    }

    setCarregandoStatus(true)

    try {
      const params = new URLSearchParams({
        userId: texto(userAtual.id),
        tipoUsuario: texto(userAtual.tipo),
      })

      const resposta = await fetch(`/api/notificacoes/status?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      })

      const json = (await resposta.json().catch(() => ({}))) as StatusResponse

      if (!resposta.ok || json?.sucesso === false) {
        throw new Error(json?.erro || 'Não foi possível carregar notificações.')
      }

      const lista = Array.isArray(json?.notificacoes) ? json.notificacoes : []

      setNotificacoesApi(lista)
      setErroStatus('')

      const totalApi = Number(json?.badge ?? json?.total ?? lista.length)
      const totalFinal = Math.max(0, totalApi) + Number(temVersaoPendente)

      await atualizarBadgeApp(totalFinal)

      const caminho = pathname || '/'

      if (!rotaSemModalAutomatico(caminho)) {
        const temLegal = lista.some((notificacao) => notificacao.tipo === 'legal')

        if (temLegal) {
          setModalAceiteAberto(true)
          return
        }

        if (temVersaoPendente) {
          setModalVersaoAberto(true)
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar /api/notificacoes/status:', error)
      setErroStatus(error?.message || 'Não foi possível carregar notificações.')
      setNotificacoesApi([])

      await atualizarBadgeApp(Number(temVersaoPendente))
    } finally {
      setCarregandoStatus(false)
    }
  }, [pathname, verificarVersaoPwa])

  useEffect(() => {
    carregarStatus()
  }, [carregarStatus])

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        carregarStatus()
      }
    }

    window.addEventListener('focus', carregarStatus)
    document.addEventListener('visibilitychange', onVisibilityChange)

    const interval = window.setInterval(() => {
      carregarStatus()
    }, 60_000)

    return () => {
      window.removeEventListener('focus', carregarStatus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.clearInterval(interval)
    }
  }, [carregarStatus])

  const documentosLoginPendente = documentosObrigatoriosPorUsuario(user?.tipo)

  async function confirmarAceiteLegal() {
    const userId = texto(user?.id)

    if (!userId || registrandoAceite) return

    if (!maioridadeConfirmada || !termosConfirmados) {
      setMensagemAceite('Para continuar, confirme a maioridade e o aceite dos documentos legais.')
      return
    }

    setRegistrandoAceite(true)
    setMensagemAceite('')

    try {
      const tipos = documentosObrigatoriosPorUsuario(user?.tipo)

      for (const documentoCodigo of tipos) {
        const resposta = await fetch('/api/legal/aceite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
          body: JSON.stringify({
            userId,
            documentoCodigo,
            tipoUsuario: user?.tipo || null,
            contexto: CONTEXTO_ACEITE_RETROATIVO,
            origem: 'notification_gate',
            observacao:
              'Aceite apresentado para usuário já logado após implementação dos documentos legais.',
          }),
        })

        const json = await resposta.json().catch(() => ({}))

        if (!resposta.ok) {
          throw new Error(
            json?.erro ||
              json?.error ||
              json?.message ||
              `Não foi possível registrar o aceite do documento ${documentoCodigo}.`
          )
        }
      }

      localStorage.setItem(chaveAceiteLocal(userId), 'sim')
      setModalAceiteAberto(false)
      setMaioridadeConfirmada(false)
      setTermosConfirmados(false)
      await carregarStatus()
    } catch (error: any) {
      console.error('Erro ao registrar aceite legal:', error)
      setMensagemAceite(error?.message || 'Não foi possível registrar o aceite. Tente novamente.')
    } finally {
      setRegistrandoAceite(false)
    }
  }

  async function reconhecerAtualizacao() {
    localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION)
    localStorage.setItem(UPDATE_ACK_KEY, 'sim')

    setVersaoPendente(false)
    setModalVersaoAberto(false)

    const totalApi = notificacoesApi.reduce((soma, item) => soma + Math.max(1, Number(item.count || 1)), 0)

    await atualizarBadgeApp(totalApi)
  }

  function abrirNotificacao(notificacao: NotificacaoStatus) {
    if (notificacao.tipo === 'legal') {
      setDrawerAberto(false)
      setModalAceiteAberto(true)
      return
    }

    if (notificacao.tipo === 'versao') {
      setDrawerAberto(false)
      setModalVersaoAberto(true)
      return
    }

    if (notificacao.href) {
      window.location.href = notificacao.href
    }
  }

  if (totalNotificacoes <= 0 && !modalAceiteAberto && !modalVersaoAberto) {
    return null
  }

  return (
    <>
      {totalNotificacoes > 0 ? (
        <div className="prussikNotifyRoot">
          <button
            type="button"
            className="prussikNotifyButton"
            onClick={() => setDrawerAberto((aberto) => !aberto)}
            aria-label={`Você tem ${totalNotificacoes} notificação${totalNotificacoes === 1 ? '' : 'ões'}`}
          >
            <span aria-hidden="true">🔔</span>
            <strong>{totalNotificacoes}</strong>
          </button>

          {drawerAberto ? (
            <section className="prussikNotifyDrawer">
              <header>
                <div>
                  <h3>Notificações</h3>
                  {carregandoStatus ? <small>Atualizando...</small> : null}
                </div>

                <button type="button" onClick={() => setDrawerAberto(false)} aria-label="Fechar">
                  ×
                </button>
              </header>

              {erroStatus ? (
                <div className="prussikNotifyError">
                  {erroStatus}
                </div>
              ) : null}

              <div className="prussikNotifyList">
                {notificacoes.map((notificacao) => (
                  <article key={notificacao.id}>
                    <strong>{notificacao.titulo}</strong>
                    <p>{notificacao.descricao}</p>

                    <button type="button" onClick={() => abrirNotificacao(notificacao)}>
                      {notificacao.acao || 'Ver'}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {modalAceiteAberto ? (
        <div className="prussikModalOverlay" role="dialog" aria-modal="true" aria-label="Confirmação de documentos legais">
          <div className="prussikModal">
            <header>
              <p>PrussikTrails · documentos legais</p>
              <h2>Confirmação necessária</h2>
              <span>
                Para continuar, confirme a ciência e o aceite dos documentos legais aplicáveis à sua conta.
              </span>
            </header>

            <section className="prussikModalBody">
              <p>
                Esta confirmação será registrada com data, hora, versão dos documentos, origem,
                IP e user agent.
              </p>

              <div className="prussikDocLinks">
                <Link href="/termos" target="_blank" rel="noopener noreferrer">
                  Termos de Uso
                </Link>

                <Link href="/politica-de-privacidade" target="_blank" rel="noopener noreferrer">
                  Política de Privacidade
                </Link>

                <Link href="/politica-de-cookies" target="_blank" rel="noopener noreferrer">
                  Política de Cookies
                </Link>

                {documentosLoginPendente.includes('termo_guia') ? (
                  <Link href="/termo-do-guia" target="_blank" rel="noopener noreferrer">
                    Termo do Guia
                  </Link>
                ) : null}
              </div>

              <label className="prussikCheck">
                <input
                  type="checkbox"
                  checked={maioridadeConfirmada}
                  onChange={(event) => setMaioridadeConfirmada(event.target.checked)}
                />
                <span>
                  Declaro que tenho 18 anos ou mais e que minha conta não será utilizada por menor de idade.
                </span>
              </label>

              <label className="prussikCheck">
                <input
                  type="checkbox"
                  checked={termosConfirmados}
                  onChange={(event) => setTermosConfirmados(event.target.checked)}
                />
                <span>
                  Li, compreendi e aceito os documentos legais aplicáveis à minha conta na PrussikTrails.
                </span>
              </label>

              {mensagemAceite ? (
                <div className="prussikError">
                  {mensagemAceite}
                </div>
              ) : null}
            </section>

            <footer>
              <button
                type="button"
                className="secondary"
                onClick={() => setModalAceiteAberto(false)}
                disabled={registrandoAceite}
              >
                Depois
              </button>

              <button
                type="button"
                onClick={confirmarAceiteLegal}
                disabled={!maioridadeConfirmada || !termosConfirmados || registrandoAceite}
              >
                {registrandoAceite ? 'Registrando...' : 'Aceitar e continuar'}
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {modalVersaoAberto ? (
        <div className="prussikModalOverlay" role="dialog" aria-modal="true" aria-label="Atualização do app">
          <div className="prussikModal">
            <header>
              <p>PrussikTrails · atualização do app</p>
              <h2>Atualização recomendada</h2>
              <span>
                Seu app instalado pode estar usando uma versão antiga. Para evitar telas antigas ou falhas,
                recomendamos reinstalar o atalho do app.
              </span>
            </header>

            <section className="prussikModalBody">
              <p>
                Faça assim:
              </p>

              <ol className="prussikSteps">
                <li>Remova o ícone antigo da PrussikTrails da tela inicial.</li>
                <li>Abra www.prussiktrails.com.br no navegador.</li>
                <li>Toque em compartilhar/opções e escolha “Adicionar à tela inicial”.</li>
                <li>Entre novamente no app atualizado.</li>
              </ol>

              <p>
                Se estiver no computador, basta atualizar a página e entrar novamente.
              </p>
            </section>

            <footer>
              <button
                type="button"
                className="secondary"
                onClick={() => setModalVersaoAberto(false)}
              >
                Lembrar depois
              </button>

              <button type="button" onClick={reconhecerAtualizacao}>
                Entendi
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      <style>{`
        .prussikNotifyRoot {
          position: fixed;
          right: 18px;
          bottom: 18px;
          z-index: 9990;
        }

        .prussikNotifyButton {
          width: 52px;
          height: 52px;
          border-radius: 999px;
          border: 1px solid rgba(255, 253, 247, 0.22);
          background: #203c2e;
          color: #fffdf7;
          display: grid;
          place-items: center;
          cursor: pointer;
          box-shadow: 0 18px 46px rgba(15, 23, 42, 0.24);
          position: relative;
          font-size: 20px;
        }

        .prussikNotifyButton strong {
          position: absolute;
          top: -7px;
          right: -7px;
          min-width: 23px;
          height: 23px;
          padding: 0 6px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: #dc2626;
          color: #fff;
          border: 2px solid #fffdf7;
          font-size: 12px;
          font-weight: 950;
          line-height: 1;
        }

        .prussikNotifyDrawer {
          position: absolute;
          right: 0;
          bottom: 64px;
          width: min(360px, calc(100vw - 32px));
          border-radius: 24px;
          background: #fffdf7;
          border: 1px solid rgba(32, 60, 46, 0.12);
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
          overflow: hidden;
          color: #203c2e;
        }

        .prussikNotifyDrawer header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 18px;
          background: #203c2e;
          color: #fffdf7;
        }

        .prussikNotifyDrawer h3 {
          margin: 0;
          font-size: 16px;
        }

        .prussikNotifyDrawer small {
          display: block;
          margin-top: 3px;
          color: rgba(255, 253, 247, 0.72);
          font-size: 11px;
          font-weight: 700;
        }

        .prussikNotifyDrawer header button {
          border: 0;
          background: transparent;
          color: #fffdf7;
          font-size: 24px;
          cursor: pointer;
        }

        .prussikNotifyError {
          margin: 12px 14px 0;
          border-radius: 14px;
          padding: 10px 12px;
          background: #fef2f2;
          color: #dc2626;
          font-size: 12px;
          font-weight: 800;
        }

        .prussikNotifyList {
          display: grid;
          gap: 10px;
          padding: 14px;
        }

        .prussikNotifyList article {
          border-radius: 18px;
          background: #f3f5ea;
          border: 1px solid rgba(32, 60, 46, 0.1);
          padding: 13px;
        }

        .prussikNotifyList strong {
          display: block;
          margin-bottom: 5px;
          font-size: 13px;
        }

        .prussikNotifyList p {
          margin: 0 0 10px;
          color: #647263;
          font-size: 12px;
          line-height: 1.45;
        }

        .prussikNotifyList article button {
          border: 0;
          border-radius: 999px;
          padding: 9px 12px;
          background: #203c2e;
          color: #fffdf7;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .prussikModalOverlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(15, 23, 42, 0.72);
          backdrop-filter: blur(10px);
        }

        .prussikModal {
          width: min(720px, 100%);
          max-height: min(90vh, 820px);
          overflow: hidden;
          border-radius: 28px;
          background: #fffdf7;
          color: #203c2e;
          border: 1px solid rgba(212, 179, 90, 0.26);
          box-shadow: 0 28px 88px rgba(15, 23, 42, 0.34);
        }

        .prussikModal header {
          padding: 28px 32px 22px;
          background: linear-gradient(135deg, #203c2e 0%, #294735 100%);
          color: #fffdf7;
        }

        .prussikModal header p {
          margin: 0 0 10px;
          color: rgba(255, 253, 247, 0.72);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.72rem;
          font-weight: 900;
        }

        .prussikModal header h2 {
          margin: 0;
          max-width: 620px;
          font-size: clamp(1.8rem, 4vw, 3rem);
          line-height: 1;
          letter-spacing: -0.05em;
          font-family: Georgia, 'Times New Roman', serif;
        }

        .prussikModal header span {
          display: block;
          margin-top: 14px;
          color: rgba(255, 253, 247, 0.82);
          font-size: 0.92rem;
          line-height: 1.55;
        }

        .prussikModalBody {
          padding: 24px 28px 10px;
          max-height: 52vh;
          overflow: auto;
        }

        .prussikModalBody p {
          margin: 0 0 16px;
          color: #39483e;
          line-height: 1.65;
          font-size: 0.95rem;
        }

        .prussikDocLinks {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .prussikDocLinks a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 8px 12px;
          background: #f3f5ea;
          border: 1px solid rgba(32, 60, 46, 0.12);
          color: #203c2e;
          text-decoration: none;
          font-size: 0.82rem;
          font-weight: 900;
        }

        .prussikCheck {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin: 0 0 14px;
          color: #294735;
          font-size: 0.92rem;
          line-height: 1.5;
          font-weight: 750;
        }

        .prussikCheck input {
          width: 18px;
          height: 18px;
          margin-top: 2px;
          accent-color: #203c2e;
          flex: 0 0 auto;
        }

        .prussikError {
          margin: 12px 0 0;
          border-radius: 14px;
          padding: 10px 12px;
          background: #fef2f2;
          color: #dc2626;
          font-size: 0.86rem;
          line-height: 1.45;
          font-weight: 800;
        }

        .prussikSteps {
          margin: 0 0 16px;
          padding-left: 20px;
          color: #39483e;
          line-height: 1.65;
          font-size: 0.95rem;
        }

        .prussikSteps li {
          margin-bottom: 8px;
        }

        .prussikModal footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 18px 28px 24px;
          border-top: 1px solid rgba(32, 60, 46, 0.08);
          background: rgba(255, 253, 247, 0.96);
        }

        .prussikModal footer button {
          border: 0;
          border-radius: 999px;
          padding: 12px 18px;
          background: #203c2e;
          color: #fffdf7;
          cursor: pointer;
          font-weight: 900;
        }

        .prussikModal footer button.secondary {
          background: #f3f5ea;
          color: #203c2e;
          border: 1px solid rgba(32, 60, 46, 0.12);
        }

        .prussikModal footer button:disabled {
          opacity: 0.48;
          cursor: not-allowed;
        }

        @media (max-width: 720px) {
          .prussikNotifyRoot {
            right: 14px;
            bottom: 14px;
          }

          .prussikModalOverlay {
            padding: 0;
            align-items: stretch;
          }

          .prussikModal {
            height: 100vh;
            max-height: 100vh;
            border-radius: 0;
          }

          .prussikModal header {
            padding: 26px 22px 20px;
          }

          .prussikModalBody {
            padding: 20px 18px 10px;
            max-height: calc(100vh - 295px);
          }

          .prussikModal footer {
            padding: 14px 18px 18px;
            flex-direction: column-reverse;
          }

          .prussikModal footer button {
            width: 100%;
          }
        }
      `}</style>
    </>
  )
}
