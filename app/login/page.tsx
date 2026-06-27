'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type UsuarioLocal = {
  id: string
  nome?: string | null
  email?: string | null
  tipo?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null

  // Campos opcionais que podem vir do /api/login.
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

const LOGO_LOGIN_SRC = '/logo-login-montanha-prussik.jpg?v=20260528'

const DATA_IMPLEMENTACAO_ACEITE = '2026-06-26T00:00:00-03:00'
const CONTEXTO_ACEITE_RETROATIVO = 'login_retroativo_2026_06_26'

export default function LoginPage() {
  const router = useRouter()

  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [mensagemAceite, setMensagemAceite] = useState('')
  const [checandoSessao, setChecandoSessao] = useState(true)

  const [loginPendente, setLoginPendente] = useState<LoginPendente | null>(null)
  const [modalAceiteAberto, setModalAceiteAberto] = useState(false)
  const [maioridadeConfirmada, setMaioridadeConfirmada] = useState(false)
  const [termosConfirmados, setTermosConfirmados] = useState(false)
  const [registrandoAceite, setRegistrandoAceite] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem('user')

    if (!userData) {
      setChecandoSessao(false)
      return
    }

    try {
      const user = JSON.parse(userData) as UsuarioLocal
      const tipo = String(user?.tipo || '').toLowerCase()

      if (user?.id && tipo === 'cliente') {
        router.replace('/cliente/dashboard')
        return
      }

      if (user?.id && tipo === 'guia') {
        router.replace('/guia/dashboard')
        return
      }

      if (user?.id && tipo === 'admin') {
        router.replace('/admin/dashboard')
        return
      }

      localStorage.removeItem('user')
      setChecandoSessao(false)
    } catch {
      localStorage.removeItem('user')
      setChecandoSessao(false)
    }
  }, [router])

  const redirectAfterLogin = useMemo(() => {
    if (typeof window === 'undefined') return ''

    const salvo = localStorage.getItem('redirectAfterLogin') || ''

    if (
      salvo.startsWith('/') &&
      !salvo.startsWith('/api') &&
      !salvo.startsWith('/admin') &&
      !salvo.startsWith('//')
    ) {
      return salvo
    }

    return ''
  }, [])

  function texto(valor: unknown) {
    return String(valor || '').trim()
  }

  function limparCpf(valor: unknown) {
    return texto(valor).replace(/\D/g, '')
  }

  function formatarCPF(valor: unknown) {
    const numeros = limparCpf(valor).slice(0, 11)

    if (numeros.length <= 3) return numeros
    if (numeros.length <= 6) {
      return `${numeros.slice(0, 3)}.${numeros.slice(3)}`
    }
    if (numeros.length <= 9) {
      return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`
    }

    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9, 11)}`
  }

  function pareceEntradaCPF(valor: string) {
    const v = texto(valor)

    if (!v) return false
    if (v.includes('@')) return false

    const temLetra = /[a-zA-Z]/.test(v)
    if (temLetra) return false

    const numeros = limparCpf(v)
    return numeros.length > 0 && numeros.length <= 11
  }

  function handleLoginChange(valor: string) {
    if (pareceEntradaCPF(valor)) {
      setLogin(formatarCPF(valor))
      return
    }

    setLogin(valor)
  }

  function normalizarLogin(valor: string) {
    return texto(valor).toLowerCase()
  }

  function rotaPorTipo(tipo?: string | null) {
    const t = String(tipo || '').toLowerCase()

    if (redirectAfterLogin && t === 'cliente') return redirectAfterLogin

    if (
      redirectAfterLogin &&
      t === 'guia' &&
      redirectAfterLogin.startsWith('/roteiros')
    ) {
      return redirectAfterLogin
    }

    if (t === 'admin') return '/admin/dashboard'
    if (t === 'guia') return '/guia/dashboard'

    return '/cliente/dashboard'
  }

  function tipoNormalizado(tipo?: string | null) {
    return texto(tipo).toLowerCase()
  }

  function dataCadastroUsuario(user: UsuarioLocal) {
    return (
      texto(user.created_at) ||
      texto(user.criado_em) ||
      texto(user.cadastrado_em) ||
      texto(user.data_cadastro)
    )
  }

  function usuarioSujeitoAoAceiteRetroativo(user: UsuarioLocal) {
    const tipo = tipoNormalizado(user.tipo)

    // Admin não precisa receber o bloqueio jurídico público.
    if (tipo === 'admin') return false

    // A regra é para clientes e guias.
    // Se o tipo vier vazio ou diferente, por segurança aplicamos a todos que não são admin.
    const dataCadastro = dataCadastroUsuario(user)

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

      const jaRegistrouAceiteRetroativo = lista.some(
        (aceite) => texto(aceite.contexto) === CONTEXTO_ACEITE_RETROATIVO
      )

      if (jaRegistrouAceiteRetroativo) {
        localStorage.setItem(chaveAceiteLocal(userId), 'sim')
        return true
      }

      const codigosAceitos = new Set(lista.map(codigoDoAceite).filter(Boolean))
      const obrigatorios = documentosObrigatoriosPorUsuario(user.tipo)

      const temTodos = obrigatorios.every((codigo) => codigosAceitos.has(codigo))

      if (temTodos) {
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

  async function entrar(event: FormEvent) {
    event.preventDefault()

    if (carregando) return

    setMensagem('')
    setMensagemAceite('')

    const loginFinal = normalizarLogin(login)
    const cpfLimpo = limparCpf(loginFinal)
    const senhaFinal = texto(senha)

    if (!loginFinal) {
      setMensagem('Informe seu e-mail ou CPF.')
      return
    }

    if (!senhaFinal) {
      setMensagem('Informe sua senha.')
      return
    }

    setCarregando(true)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          login: loginFinal,
          email: loginFinal,
          cpf: cpfLimpo.length === 11 ? cpfLimpo : loginFinal,
          cpf_formatado: cpfLimpo.length === 11 ? formatarCPF(cpfLimpo) : '',
          senha: senhaFinal,
          redirectAfterLogin,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.sucesso || !data?.user?.id) {
        setMensagem(data?.erro || data?.error || 'Erro ao acessar sua conta.')
        setCarregando(false)
        return
      }

      const user: UsuarioLocal = data.user
      const destino = data.redirectTo || rotaPorTipo(user.tipo)

      if (usuarioSujeitoAoAceiteRetroativo(user)) {
        const jaAceitou = await usuarioJaTemAceitesNecessarios(user)

        if (!jaAceitou) {
          setLoginPendente({ user, destino })
          setMaioridadeConfirmada(false)
          setTermosConfirmados(false)
          setMensagem('')
          setMensagemAceite('')
          setModalAceiteAberto(true)
          setCarregando(false)
          return
        }
      }

      concluirLogin(user, destino)
    } catch (error) {
      console.error('Erro no login:', error)
      setMensagem('Erro ao fazer login. Tente novamente.')
      setCarregando(false)
    }
  }

  async function confirmarAceiteRetroativo() {
    if (!loginPendente || registrandoAceite) return

    if (!maioridadeConfirmada || !termosConfirmados) {
      setMensagemAceite('Para continuar, confirme a maioridade e o aceite dos documentos legais.')
      return
    }

    const user = loginPendente.user
    const destino = loginPendente.destino
    const userId = texto(user.id)
    const tipos = documentosObrigatoriosPorUsuario(user.tipo)

    if (!userId) {
      setMensagemAceite('Não foi possível identificar o usuário para registrar o aceite.')
      return
    }

    setRegistrandoAceite(true)
    setMensagemAceite('')

    try {
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
            contexto: CONTEXTO_ACEITE_RETROATIVO,
            origem: 'login',
            observacao:
              'Aceite retroativo apresentado no primeiro login após implementação dos documentos legais.',
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
      setLoginPendente(null)
      concluirLogin(user, destino)
    } catch (error: any) {
      console.error('Erro ao registrar aceite retroativo:', error)
      setMensagemAceite(error?.message || 'Não foi possível registrar o aceite. Tente novamente.')
    } finally {
      setRegistrandoAceite(false)
    }
  }

  const documentosLoginPendente = useMemo(() => {
    return documentosObrigatoriosPorUsuario(loginPendente?.user.tipo)
  }, [loginPendente?.user.tipo])

  if (checandoSessao) {
    return (
      <main className="page loadingPage">
        <style>{`
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            background: #fffdf7;
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
              radial-gradient(circle at top left, rgba(132, 204, 22, 0.10), transparent 30%),
              linear-gradient(180deg, #fffdf7 0%, #eef2e5 100%);
            color: #203c2e;
          }

          .loadingPage {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .loadingBox {
            text-align: center;
            color: #203c2e;
            font-size: 14px;
            font-weight: 850;
          }

          .loadingMark {
            width: 42px;
            height: 42px;
            border-radius: 999px;
            margin: 0 auto 14px;
            border: 3px solid rgba(32, 60, 46, 0.12);
            border-top-color: #203c2e;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>

        <div className="loadingBox">
          <div className="loadingMark" aria-hidden="true" />
          Abrindo sua área...
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #fffdf7;
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
            radial-gradient(circle at 8% 0%, rgba(132, 204, 22, 0.15), transparent 30%),
            radial-gradient(circle at 92% 8%, rgba(251, 146, 60, 0.10), transparent 28%),
            linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
          color: #111827;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px 14px;
        }

        .container {
          width: 100%;
          max-width: 492px;
          margin: 0 auto;
        }

        .card {
          background: rgba(255, 255, 255, 0.94);
          border-radius: 34px;
          padding: 30px 30px 34px;
          box-shadow:
            0 24px 58px rgba(32, 60, 46, 0.12),
            0 8px 22px rgba(15, 23, 42, 0.06);
          border: 1px solid rgba(15, 23, 42, 0.055);
          backdrop-filter: blur(14px);
          overflow: hidden;
        }

        .brand {
          display: flex;
          justify-content: center;
          margin: 0 auto 16px;
          width: 100%;
          overflow: visible;
        }

        .brandLogoCrop {
          width: 220px;
          height: 116px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          flex: 0 0 auto;
        }

        .brandLogoCrop img {
          width: 220px;
          height: 220px;
          object-fit: contain;
          display: block;
          transform: scale(1.58);
          transform-origin: center;
        }

        .heroPhrase {
          margin: 0 auto 28px;
          max-width: 330px;
          text-align: center;
          color: #172018;
          font-size: 30px;
          line-height: 1.03;
          font-weight: 950;
          letter-spacing: -0.065em;
        }

        .heroPhrase span {
          color: #203c2e;
        }

        .form {
          display: grid;
          gap: 17px;
        }

        .formGroup {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        label {
          font-size: 13px;
          font-weight: 900;
          color: #334155;
          letter-spacing: -0.01em;
        }

        input {
          width: 100%;
          border: 1px solid #dbe4f2;
          border-radius: 18px;
          padding: 15px 17px;
          font-size: 16px;
          color: #111827;
          background: #eef5ff;
          outline: none;
          transition: 0.2s ease;
        }

        input:focus {
          background: #ffffff;
          border-color: #203c2e;
          box-shadow: 0 0 0 4px rgba(32, 60, 46, 0.11);
        }

        input::placeholder {
          color: #94a3b8;
        }

        input:disabled {
          opacity: 0.72;
          cursor: not-allowed;
        }

        .message {
          padding: 13px 15px;
          border-radius: 18px;
          font-size: 13px;
          line-height: 1.45;
          text-align: center;
          font-weight: 800;
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .submitButton {
          width: 100%;
          border: none;
          border-radius: 999px;
          padding: 17px;
          background: #203c2e;
          color: #ffffff;
          font-size: 17px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
          margin-top: 6px;
          box-shadow: 0 14px 26px rgba(32, 60, 46, 0.18);
        }

        .submitButton:hover:not(:disabled) {
          background: #294735;
          transform: translateY(-1px);
          box-shadow: 0 18px 32px rgba(32, 60, 46, 0.24);
        }

        .submitButton:disabled {
          opacity: 0.72;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .linkRow {
          display: flex;
          justify-content: center;
          margin-top: 18px;
        }

        .textButton {
          border: none;
          background: transparent;
          color: #203c2e;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          text-decoration: none;
          padding: 4px 6px;
        }

        .textButton:hover {
          text-decoration: underline;
        }

        .textButton:disabled {
          opacity: 0.58;
          cursor: not-allowed;
        }

        .divider {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 14px;
          margin: 25px 0;
          color: #9ca3af;
          font-size: 14px;
          font-weight: 850;
        }

        .divider::before,
        .divider::after {
          content: "";
          height: 1px;
          background: #e5e7eb;
        }

        .secondaryButton {
          width: 100%;
          border: 1.5px solid #203c2e;
          border-radius: 999px;
          padding: 15px;
          background: #ffffff;
          color: #203c2e;
          font-size: 16px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .secondaryButton:hover:not(:disabled) {
          background: #f0fdf4;
          transform: translateY(-1px);
        }

        .secondaryButton:disabled {
          opacity: 0.58;
          cursor: not-allowed;
        }

        .hint {
          margin: 20px 0 0;
          text-align: center;
          color: #7b8372;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
        }

        .legalOverlay {
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

        .legalModal {
          width: min(720px, 100%);
          max-height: min(90vh, 820px);
          overflow: hidden;
          border-radius: 28px;
          background: #fffdf7;
          color: #203c2e;
          border: 1px solid rgba(212, 179, 90, 0.26);
          box-shadow: 0 28px 88px rgba(15, 23, 42, 0.34);
        }

        .legalModalHeader {
          padding: 28px 32px 22px;
          background: linear-gradient(135deg, #203c2e 0%, #294735 100%);
          color: #fffdf7;
        }

        .legalModalHeader p {
          margin: 0 0 10px;
          color: rgba(255, 253, 247, 0.72);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.72rem;
          font-weight: 900;
        }

        .legalModalHeader h2 {
          margin: 0;
          max-width: 620px;
          font-size: clamp(1.8rem, 4vw, 3rem);
          line-height: 1;
          letter-spacing: -0.05em;
          font-family: Georgia, 'Times New Roman', serif;
        }

        .legalModalHeader span {
          display: block;
          margin-top: 14px;
          color: rgba(255, 253, 247, 0.82);
          font-size: 0.92rem;
          line-height: 1.55;
        }

        .legalModalBody {
          padding: 24px 28px 10px;
          max-height: 52vh;
          overflow: auto;
        }

        .legalModalBody p {
          margin: 0 0 16px;
          color: #39483e;
          line-height: 1.65;
          font-size: 0.95rem;
        }

        .legalDocLinks {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .legalDocLinks a {
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

        .legalDocLinks a:hover {
          border-color: rgba(212, 179, 90, 0.58);
          background: rgba(212, 179, 90, 0.14);
        }

        .legalCheck {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin: 0 0 14px;
          color: #294735;
          font-size: 0.92rem;
          line-height: 1.5;
          font-weight: 750;
        }

        .legalCheck input {
          width: 18px;
          height: 18px;
          margin-top: 2px;
          accent-color: #203c2e;
          flex: 0 0 auto;
        }

        .legalError {
          margin: 12px 0 0;
          border-radius: 14px;
          padding: 10px 12px;
          background: #fef2f2;
          color: #dc2626;
          font-size: 0.86rem;
          line-height: 1.45;
          font-weight: 800;
        }

        .legalModalFooter {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 18px 28px 24px;
          border-top: 1px solid rgba(32, 60, 46, 0.08);
          background: rgba(255, 253, 247, 0.96);
        }

        .legalModalFooter button {
          border: 0;
          border-radius: 999px;
          padding: 12px 18px;
          background: #203c2e;
          color: #fffdf7;
          cursor: pointer;
          font-weight: 900;
        }

        .legalModalFooter button.secondary {
          background: #f3f5ea;
          color: #203c2e;
          border: 1px solid rgba(32, 60, 46, 0.12);
        }

        .legalModalFooter button:disabled {
          opacity: 0.48;
          cursor: not-allowed;
        }

        @media (max-width: 520px) {
          .page {
            align-items: flex-start;
            padding: 18px 12px 26px;
          }

          .container {
            max-width: 100%;
          }

          .card {
            border-radius: 30px;
            padding: 26px 20px 30px;
          }

          .brand {
            margin-bottom: 14px;
          }

          .brandLogoCrop {
            width: 198px;
            height: 106px;
          }

          .brandLogoCrop img {
            width: 198px;
            height: 198px;
            transform: scale(1.54);
          }

          .heroPhrase {
            font-size: 27px;
            max-width: 300px;
            margin-bottom: 26px;
          }

          .form {
            gap: 16px;
          }

          input {
            font-size: 15px;
            padding: 14px 15px;
          }

          .submitButton {
            padding: 15px;
            font-size: 16px;
          }

          .secondaryButton {
            padding: 14px;
            font-size: 15px;
          }
        }

        @media (max-width: 720px) {
          .legalOverlay {
            padding: 0;
            align-items: stretch;
          }

          .legalModal {
            height: 100vh;
            max-height: 100vh;
            border-radius: 0;
          }

          .legalModalHeader {
            padding: 26px 22px 20px;
          }

          .legalModalBody {
            padding: 20px 18px 10px;
            max-height: calc(100vh - 295px);
          }

          .legalModalFooter {
            padding: 14px 18px 18px;
            flex-direction: column-reverse;
          }

          .legalModalFooter button {
            width: 100%;
          }
        }

        @media (max-width: 380px) {
          .card {
            padding: 24px 18px 28px;
          }

          .brandLogoCrop {
            width: 184px;
            height: 98px;
          }

          .brandLogoCrop img {
            width: 184px;
            height: 184px;
            transform: scale(1.50);
          }

          .heroPhrase {
            font-size: 25px;
          }
        }
      `}</style>

      <div className="container">
        <section className="card">
          <div className="brand">
            <div className="brandLogoCrop">
              <img
                src={LOGO_LOGIN_SRC}
                alt="PrussikTrails"
                loading="eager"
                decoding="async"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            </div>
          </div>

          <p className="heroPhrase">
            Sua próxima
            <br />
            aventura começa
            <br />
            <span>aqui.</span>
          </p>

          <form className="form" onSubmit={entrar}>
            <div className="formGroup">
              <label>E-mail ou CPF *</label>
              <input
                value={login}
                onChange={(event) => handleLoginChange(event.target.value)}
                placeholder="seuemail@email.com ou CPF"
                type="text"
                autoComplete="username"
                inputMode="text"
                disabled={carregando}
              />
            </div>

            <div className="formGroup">
              <label>Senha *</label>
              <input
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                placeholder="Digite sua senha"
                type="password"
                autoComplete="current-password"
                disabled={carregando}
              />
            </div>

            {mensagem && (
              <div className="message">
                {mensagem}
              </div>
            )}

            <button
              type="submit"
              className="submitButton"
              disabled={carregando}
            >
              {carregando ? 'Entrando...' : 'Acessar minha conta'}
            </button>
          </form>

          <div className="linkRow">
            <button
              type="button"
              className="textButton"
              onClick={() => router.push('/recuperar-senha')}
              disabled={carregando}
            >
              Esqueci minha senha
            </button>
          </div>

          <div className="divider">ou</div>

          <button
            type="button"
            className="secondaryButton"
            onClick={() => router.push('/cadastro')}
            disabled={carregando}
          >
            Criar nova conta
          </button>

          <p className="hint">
            Use o mesmo e-mail ou CPF cadastrado no app.
          </p>
        </section>
      </div>

      {modalAceiteAberto && loginPendente ? (
        <div className="legalOverlay" role="dialog" aria-modal="true" aria-label="Confirmação de documentos legais">
          <div className="legalModal">
            <header className="legalModalHeader">
              <p>PrussikTrails · atualização legal</p>
              <h2>Confirmação necessária para continuar</h2>
              <span>
                Esta confirmação será solicitada uma única vez para usuários cadastrados antes da implementação dos documentos legais.
              </span>
            </header>

            <section className="legalModalBody">
              <p>
                Para seguir usando a PrussikTrails, confirme a ciência e o aceite dos documentos
                legais aplicáveis à sua conta.
              </p>

              <div className="legalDocLinks">
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

              <label className="legalCheck">
                <input
                  type="checkbox"
                  checked={maioridadeConfirmada}
                  onChange={(event) => setMaioridadeConfirmada(event.target.checked)}
                />
                <span>
                  Declaro que tenho 18 anos ou mais e que minha conta não será utilizada por menor de idade.
                </span>
              </label>

              <label className="legalCheck">
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
                <div className="legalError">
                  {mensagemAceite}
                </div>
              ) : null}
            </section>

            <footer className="legalModalFooter">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setModalAceiteAberto(false)
                  setLoginPendente(null)
                  setMensagem('Para acessar a plataforma, é necessário confirmar os documentos legais.')
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
        </div>
      ) : null}
    </main>
  )
}
