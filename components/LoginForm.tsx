'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type TipoUsuario = 'cliente' | 'guia' | 'admin' | string

type UsuarioLocal = {
  id: string
  nome?: string | null
  email?: string | null
  tipo?: TipoUsuario | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null

  // Campos opcionais: o /api/login pode devolver qualquer um deles.
  // Se ainda não devolver, o modal será exibido por segurança para cliente/guia sem aceite registrado.
  created_at?: string | null
  criado_em?: string | null
  cadastrado_em?: string | null
  data_cadastro?: string | null
}

type AceiteLegal = {
  id?: string
  codigo_documento?: string | null
  documento_codigo?: string | null
  documento?: string | null
  tipo_documento?: string | null
  contexto?: string | null
  created_at?: string | null
  aceito_em?: string | null
}

type LoginPendente = {
  user: UsuarioLocal
  destino: string
}

const DATA_IMPLEMENTACAO_ACEITE = '2026-06-26T00:00:00-03:00'
const CONTEXTO_ACEITE_RETROATIVO = 'login_retroativo_2026_06_26'

export default function LoginForm() {
  const router = useRouter()

  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const [loginPendente, setLoginPendente] = useState<LoginPendente | null>(null)
  const [modalAceiteAberto, setModalAceiteAberto] = useState(false)
  const [maioridadeConfirmada, setMaioridadeConfirmada] = useState(false)
  const [termosConfirmados, setTermosConfirmados] = useState(false)
  const [registrandoAceite, setRegistrandoAceite] = useState(false)

  useEffect(() => {
    router.prefetch('/cliente/dashboard')
    router.prefetch('/guia/dashboard')
    router.prefetch('/roteiros')
  }, [router])

  function texto(valor: unknown) {
    return String(valor || '').trim()
  }

  function limparCpf(valor: string) {
    return valor.replace(/\D/g, '')
  }

  function formatarCPF(valor: string) {
    let numeros = limparCpf(valor)

    if (numeros.length > 11) numeros = numeros.slice(0, 11)
    if (numeros.length <= 3) return numeros
    if (numeros.length <= 6) return `${numeros.slice(0, 3)}.${numeros.slice(3)}`
    if (numeros.length <= 9) return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`

    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9, 11)}`
  }

  function handleLoginChange(valor: string) {
    const apenasNumeros = limparCpf(valor)

    if (apenasNumeros.length > 0 && apenasNumeros.length <= 11 && !valor.includes('@')) {
      setLogin(formatarCPF(valor))
      return
    }

    setLogin(valor)
  }

  function rotaPorTipo(tipo?: string | null, redirectAfterLogin?: string) {
    const t = String(tipo || '').toLowerCase()

    if (
      redirectAfterLogin &&
      redirectAfterLogin.startsWith('/') &&
      !redirectAfterLogin.startsWith('/api') &&
      !redirectAfterLogin.startsWith('/admin') &&
      !redirectAfterLogin.startsWith('//')
    ) {
      if (t === 'cliente') return redirectAfterLogin
      if (t === 'guia' && redirectAfterLogin.startsWith('/roteiros')) return redirectAfterLogin
    }

    if (t === 'admin') return '/admin/dashboard'
    if (t === 'guia') return '/guia/dashboard'

    return '/cliente/dashboard'
  }

  function tipoNormalizado(tipo?: string | null) {
    return texto(tipo).toLowerCase()
  }

  function usuarioSujeitoAoAceiteRetroativo(user: UsuarioLocal) {
    const tipo = tipoNormalizado(user.tipo)

    // Admin não precisa ser bloqueado pelo aceite retroativo público.
    if (tipo === 'admin') return false

    // Aplica para guias e clientes.
    if (tipo !== 'guia' && tipo !== 'cliente') return false

    const dataCadastro =
      texto(user.created_at) ||
      texto(user.criado_em) ||
      texto(user.cadastrado_em) ||
      texto(user.data_cadastro)

    // Se o /api/login ainda não envia data de cadastro, por segurança jurídica
    // exibimos apenas para quem não tem aceite registrado.
    if (!dataCadastro) return true

    const cadastro = new Date(dataCadastro)
    const corte = new Date(DATA_IMPLEMENTACAO_ACEITE)

    if (Number.isNaN(cadastro.getTime())) return true

    return cadastro.getTime() < corte.getTime()
  }

  function documentosObrigatoriosPorUsuario(tipo?: string | null) {
    const t = tipoNormalizado(tipo)

    const documentos = ['termos_uso', 'politica_privacidade', 'politica_cookies']

    if (t === 'guia') {
      documentos.push('termo_guia')
    }

    return documentos
  }

  function chaveAceiteLocal(userId: string) {
    return `prussik_aceite_retroativo_${CONTEXTO_ACEITE_RETROATIVO}_${userId}`
  }

  function codigoDoAceite(aceite: AceiteLegal) {
    return (
      texto(aceite.codigo_documento) ||
      texto(aceite.documento_codigo) ||
      texto(aceite.documento) ||
      texto(aceite.tipo_documento)
    )
  }

  async function usuarioJaTemAceitesNecessarios(user: UsuarioLocal) {
    const userId = texto(user.id)

    if (!userId) return false

    if (localStorage.getItem(chaveAceiteLocal(userId)) === 'sim') {
      return true
    }

    try {
      const resposta = await fetch(`/api/legal/meus-aceites?userId=${encodeURIComponent(userId)}`, {
        method: 'GET',
        cache: 'no-store',
      })

      const json = await resposta.json().catch(() => ({}))

      if (!resposta.ok) {
        return false
      }

      const lista: AceiteLegal[] =
        Array.isArray(json?.aceites)
          ? json.aceites
          : Array.isArray(json?.data)
            ? json.data
            : Array.isArray(json)
              ? json
              : []

      const contextoRetroativoJaRegistrado = lista.some(
        (aceite) => texto(aceite.contexto) === CONTEXTO_ACEITE_RETROATIVO
      )

      if (contextoRetroativoJaRegistrado) {
        localStorage.setItem(chaveAceiteLocal(userId), 'sim')
        return true
      }

      const codigosAceitos = new Set(lista.map(codigoDoAceite).filter(Boolean))
      const obrigatorios = documentosObrigatoriosPorUsuario(user.tipo)

      const temTodosOsDocumentosObrigatorios = obrigatorios.every((codigo) =>
        codigosAceitos.has(codigo)
      )

      if (temTodosOsDocumentosObrigatorios) {
        localStorage.setItem(chaveAceiteLocal(userId), 'sim')
        return true
      }

      return false
    } catch (error) {
      console.warn('Não foi possível verificar aceites legais:', error)
      return false
    }
  }

  function concluirLogin(user: UsuarioLocal, destino: string) {
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.removeItem('redirectAfterLogin')
    router.replace(destino)
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault()

    if (carregando) return

    setErro('')

    const loginFinal = texto(login)
    const senhaFinal = texto(senha)

    if (!loginFinal) {
      setErro('Informe seu CPF ou e-mail.')
      return
    }

    if (!senhaFinal) {
      setErro('Informe sua senha.')
      return
    }

    setCarregando(true)

    try {
      const redirectAfterLogin = localStorage.getItem('redirectAfterLogin') || ''

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          login: loginFinal,
          cpf: loginFinal,
          email: loginFinal,
          senha: senhaFinal,
          redirectAfterLogin,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.sucesso || !data?.user?.id) {
        setErro(data?.erro || data?.error || 'Usuário ou senha inválidos.')
        return
      }

      const user: UsuarioLocal = data.user
      const destino = data.redirectTo || rotaPorTipo(user.tipo, redirectAfterLogin)

      if (usuarioSujeitoAoAceiteRetroativo(user)) {
        const jaAceitou = await usuarioJaTemAceitesNecessarios(user)

        if (!jaAceitou) {
          setLoginPendente({ user, destino })
          setMaioridadeConfirmada(false)
          setTermosConfirmados(false)
          setModalAceiteAberto(true)
          return
        }
      }

      concluirLogin(user, destino)
    } catch (error) {
      console.error('Erro no login:', error)
      setErro('Erro ao conectar com o servidor.')
    } finally {
      setCarregando(false)
    }
  }

  async function confirmarAceiteRetroativo() {
    if (!loginPendente || registrandoAceite) return

    if (!maioridadeConfirmada || !termosConfirmados) {
      setErro('Para continuar, confirme a maioridade e o aceite dos documentos legais.')
      return
    }

    const user = loginPendente.user
    const destino = loginPendente.destino
    const userId = texto(user.id)
    const tipos = documentosObrigatoriosPorUsuario(user.tipo)

    if (!userId) {
      setErro('Não foi possível identificar o usuário para registrar o aceite.')
      return
    }

    setRegistrandoAceite(true)
    setErro('')

    try {
      const resposta = await fetch('/api/legal/aceite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          userId,
          tipos,
          contexto: CONTEXTO_ACEITE_RETROATIVO,
          origem: 'login',
          observacao:
            'Aceite retroativo apresentado no primeiro login após implementação dos documentos legais.',
        }),
      })

      const json = await resposta.json().catch(() => ({}))

      if (!resposta.ok) {
        throw new Error(json?.erro || json?.error || json?.message || 'Não foi possível registrar o aceite.')
      }

      localStorage.setItem(chaveAceiteLocal(userId), 'sim')
      setModalAceiteAberto(false)
      setLoginPendente(null)
      concluirLogin(user, destino)
    } catch (error: any) {
      console.error('Erro ao registrar aceite retroativo:', error)
      setErro(error?.message || 'Não foi possível registrar o aceite. Tente novamente.')
    } finally {
      setRegistrandoAceite(false)
    }
  }

  const documentosDoLoginPendente = useMemo(() => {
    return documentosObrigatoriosPorUsuario(loginPendente?.user.tipo)
  }, [loginPendente?.user.tipo])

  return (
    <>
      <form className="mt-8 space-y-6" onSubmit={handleLogin}>
        <div className="rounded-md shadow-sm -space-y-px">
          <div>
            <input
              type="text"
              required
              autoComplete="username"
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
              placeholder="CPF ou e-mail"
              value={login}
              onChange={(event) => handleLoginChange(event.target.value)}
            />
          </div>

          <div>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
              placeholder="Senha"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
            />
          </div>
        </div>

        {erro && !modalAceiteAberto && (
          <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={carregando}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>

        <div className="text-center">
          <a href="/recuperar-senha" className="text-sm text-green-600 hover:text-green-500">
            Esqueceu sua senha?
          </a>
        </div>
      </form>

      {modalAceiteAberto && loginPendente ? (
        <div className="legal-login-overlay" role="dialog" aria-modal="true" aria-label="Confirmação de documentos legais">
          <div className="legal-login-modal">
            <header>
              <p>PrussikTrails · atualização legal</p>
              <h2>Confirmação necessária para continuar</h2>
              <span>
                Esta confirmação será solicitada uma única vez para usuários cadastrados antes da implementação dos novos documentos legais.
              </span>
            </header>

            <section className="legal-login-body">
              <p>
                Para seguir usando a PrussikTrails, confirme a ciência e o aceite dos documentos
                legais aplicáveis à sua conta.
              </p>

              <div className="legal-login-docs">
                <Link href="/termos" target="_blank" rel="noopener noreferrer">
                  Termos de Uso
                </Link>

                <Link href="/politica-de-privacidade" target="_blank" rel="noopener noreferrer">
                  Política de Privacidade
                </Link>

                <Link href="/politica-de-cookies" target="_blank" rel="noopener noreferrer">
                  Política de Cookies
                </Link>

                {documentosDoLoginPendente.includes('termo_guia') ? (
                  <Link href="/termo-do-guia" target="_blank" rel="noopener noreferrer">
                    Termo do Guia
                  </Link>
                ) : null}
              </div>

              <label className="legal-login-check">
                <input
                  type="checkbox"
                  checked={maioridadeConfirmada}
                  onChange={(event) => setMaioridadeConfirmada(event.target.checked)}
                />
                <span>
                  Declaro que tenho 18 anos ou mais e que a minha conta não será utilizada por menor de idade.
                </span>
              </label>

              <label className="legal-login-check">
                <input
                  type="checkbox"
                  checked={termosConfirmados}
                  onChange={(event) => setTermosConfirmados(event.target.checked)}
                />
                <span>
                  Li, compreendi e aceito os documentos legais aplicáveis à minha conta na
                  PrussikTrails.
                </span>
              </label>

              {erro ? (
                <div className="legal-login-error">
                  {erro}
                </div>
              ) : null}
            </section>

            <footer>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setModalAceiteAberto(false)
                  setLoginPendente(null)
                  setErro('Para acessar a plataforma, é necessário confirmar os documentos legais.')
                }}
                disabled={registrandoAceite}
              >
                Agora não
              </button>

              <button
                type="button"
                onClick={confirmarAceiteRetroativo}
                disabled={!maioridadeConfirmada || !termosConfirmados || registrandoAceite}
              >
                {registrandoAceite ? 'Registrando...' : 'Aceitar e continuar'}
              </button>
            </footer>
          </div>

          <style>{`
            .legal-login-overlay {
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

            .legal-login-modal {
              width: min(720px, 100%);
              max-height: min(90vh, 820px);
              overflow: hidden;
              border-radius: 28px;
              background: #fffdf7;
              color: #203c2e;
              border: 1px solid rgba(212, 179, 90, 0.26);
              box-shadow: 0 28px 88px rgba(15, 23, 42, 0.34);
            }

            .legal-login-modal header {
              padding: 28px 32px 22px;
              background: linear-gradient(135deg, #203c2e 0%, #294735 100%);
              color: #fffdf7;
            }

            .legal-login-modal header p {
              margin: 0 0 10px;
              color: rgba(255, 253, 247, 0.72);
              text-transform: uppercase;
              letter-spacing: 0.12em;
              font-size: 0.72rem;
              font-weight: 900;
            }

            .legal-login-modal header h2 {
              margin: 0;
              max-width: 620px;
              font-size: clamp(1.8rem, 4vw, 3rem);
              line-height: 1;
              letter-spacing: -0.05em;
              font-family: Georgia, 'Times New Roman', serif;
            }

            .legal-login-modal header span {
              display: block;
              margin-top: 14px;
              color: rgba(255, 253, 247, 0.82);
              font-size: 0.92rem;
              line-height: 1.55;
            }

            .legal-login-body {
              padding: 24px 28px 10px;
              max-height: 52vh;
              overflow: auto;
            }

            .legal-login-body p {
              margin: 0 0 16px;
              color: #39483e;
              line-height: 1.65;
              font-size: 0.95rem;
            }

            .legal-login-docs {
              display: flex;
              gap: 10px;
              flex-wrap: wrap;
              margin-bottom: 18px;
            }

            .legal-login-docs a {
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

            .legal-login-docs a:hover {
              border-color: rgba(212, 179, 90, 0.58);
              background: rgba(212, 179, 90, 0.14);
            }

            .legal-login-check {
              display: flex;
              gap: 10px;
              align-items: flex-start;
              margin: 0 0 14px;
              color: #294735;
              font-size: 0.92rem;
              line-height: 1.5;
            }

            .legal-login-check input {
              width: 18px;
              height: 18px;
              margin-top: 2px;
              accent-color: #203c2e;
              flex: 0 0 auto;
            }

            .legal-login-error {
              margin: 12px 0 0;
              border-radius: 14px;
              padding: 10px 12px;
              background: #fef2f2;
              color: #dc2626;
              font-size: 0.86rem;
              line-height: 1.45;
              font-weight: 700;
            }

            .legal-login-modal footer {
              display: flex;
              justify-content: flex-end;
              gap: 12px;
              padding: 18px 28px 24px;
              border-top: 1px solid rgba(32, 60, 46, 0.08);
              background: rgba(255, 253, 247, 0.96);
            }

            .legal-login-modal footer button {
              border: 0;
              border-radius: 999px;
              padding: 12px 18px;
              background: #203c2e;
              color: #fffdf7;
              cursor: pointer;
              font-weight: 900;
            }

            .legal-login-modal footer button.secondary {
              background: #f3f5ea;
              color: #203c2e;
              border: 1px solid rgba(32, 60, 46, 0.12);
            }

            .legal-login-modal footer button:disabled {
              opacity: 0.48;
              cursor: not-allowed;
            }

            @media (max-width: 720px) {
              .legal-login-overlay {
                padding: 0;
                align-items: stretch;
              }

              .legal-login-modal {
                height: 100vh;
                max-height: 100vh;
                border-radius: 0;
              }

              .legal-login-modal header {
                padding: 26px 22px 20px;
              }

              .legal-login-body {
                padding: 20px 18px 10px;
                max-height: calc(100vh - 295px);
              }

              .legal-login-modal footer {
                padding: 14px 18px 18px;
                flex-direction: column-reverse;
              }

              .legal-login-modal footer button {
                width: 100%;
              }
            }
          `}</style>
        </div>
      ) : null}
    </>
  )
}
