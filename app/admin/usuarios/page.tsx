'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type UsuarioLocal = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
  tipo?: string | null
}

type UsuarioBanco = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
  telefone?: string | null
  celular?: string | null
  cpf?: string | null
  tipo?: string | null
  status?: string | null
  ativo?: boolean | null
  created_at?: string | null
  updated_at?: string | null
  [key: string]: any
}

type FiltroTipo = 'todos' | 'cliente' | 'guia' | 'admin'

type Stats = {
  total: number
  clientes: number
  guias: number
  admins: number
  novosMes: number
  ativos: number
}

const statsInicial: Stats = {
  total: 0,
  clientes: 0,
  guias: 0,
  admins: 0,
  novosMes: 0,
  ativos: 0
}

export default function AdminUsuariosPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [usuarios, setUsuarios] = useState<UsuarioBanco[]>([])
  const [stats, setStats] = useState<Stats>(statsInicial)

  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)

  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos')

  const [modalSenhaAberto, setModalSenhaAberto] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [alterandoSenha, setAlterandoSenha] = useState(false)

  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('')

  useEffect(() => {
    if (iniciouRef.current) return
    iniciouRef.current = true
    iniciar()
  }, [])

  const iniciar = async () => {
    setCarregando(true)
    setErro('')
    setMensagem('')

    try {
      const userData = localStorage.getItem('user')

      if (!userData) {
        router.replace('/login')
        return
      }

      const parsedUser = JSON.parse(userData) as UsuarioLocal

      if (parsedUser.tipo !== 'admin') {
        router.replace('/login')
        return
      }

      setUser(parsedUser)
      await carregarUsuarios()
    } catch (error) {
      console.error('Erro ao iniciar usuários admin:', error)
      setErro('Não foi possível carregar os usuários agora.')
    } finally {
      setCarregando(false)
    }
  }

  const normalizar = (valor?: string | null) => {
    return String(valor || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }

  const nomeUsuario = (usuario?: UsuarioLocal | UsuarioBanco | null) => {
    return usuario?.nome || usuario?.name || usuario?.email || 'Usuário'
  }

  const telefoneUsuario = (usuario?: UsuarioBanco | null) => {
    return usuario?.telefone || usuario?.celular || '-'
  }

  const formatarData = (valor?: string | null) => {
    if (!valor) return '-'

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return valor

    return data.toLocaleDateString('pt-BR')
  }

  const dentroDoMesAtual = (valor?: string | null) => {
    if (!valor) return false

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return false

    const agora = new Date()

    return (
      data.getFullYear() === agora.getFullYear() &&
      data.getMonth() === agora.getMonth()
    )
  }

  const usuarioAtivo = (usuario: UsuarioBanco) => {
    const status = normalizar(usuario.status)

    if (usuario.ativo === true) return true
    if (usuario.ativo === false) return false

    return !status || status === 'ativo' || status === 'active'
  }

  const carregarUsuarios = async () => {
    setErro('')

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1200)

    if (error) {
      console.error('Erro ao carregar usuários:', error)
      setErro('Não foi possível carregar os usuários.')
      return
    }

    const lista = (data || []) as UsuarioBanco[]

    setUsuarios(lista)

    setStats({
      total: lista.length,
      clientes: lista.filter((item) => normalizar(item.tipo) === 'cliente').length,
      guias: lista.filter((item) => normalizar(item.tipo) === 'guia').length,
      admins: lista.filter((item) => normalizar(item.tipo) === 'admin').length,
      novosMes: lista.filter((item) => dentroDoMesAtual(item.created_at)).length,
      ativos: lista.filter(usuarioAtivo).length
    })

    setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
  }

  const atualizar = async () => {
    setAtualizando(true)
    setMensagem('')
    setErro('')

    try {
      await carregarUsuarios()
      setMensagem('Usuários atualizados.')
    } catch (error) {
      console.error('Erro ao atualizar usuários:', error)
      setErro('Não foi possível atualizar os usuários agora.')
    } finally {
      setAtualizando(false)
    }
  }

  const abrirAlterarSenha = () => {
    setMenuAberto(false)
    setErro('')
    setMensagem('')
    setSenhaAtual('')
    setNovaSenha('')
    setConfirmarSenha('')
    setModalSenhaAberto(true)
  }

  const alterarSenha = async (event: FormEvent) => {
    event.preventDefault()

    if (!user?.id) {
      router.replace('/login')
      return
    }

    setErro('')
    setMensagem('')

    if (!senhaAtual) {
      setErro('Informe a senha atual.')
      return
    }

    if (!novaSenha || novaSenha.length < 6) {
      setErro('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não conferem.')
      return
    }

    setAlterandoSenha(true)

    try {
      const response = await fetch('/api/alterar-senha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          usuarioId: user.id,
          usuario_id: user.id,
          senhaAtual,
          senha_atual: senhaAtual,
          novaSenha,
          nova_senha: novaSenha
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        setErro(data?.erro || data?.message || 'Não foi possível alterar a senha.')
        return
      }

      setMensagem('Senha alterada com sucesso.')
      setModalSenhaAberto(false)
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarSenha('')
    } catch (error) {
      console.error('Erro ao alterar senha:', error)
      setErro('Erro ao alterar senha.')
    } finally {
      setAlterandoSenha(false)
    }
  }

  const sair = async () => {
    setMenuAberto(false)

    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.warn('Aviso ao encerrar sessão Supabase:', error)
    }

    localStorage.removeItem('user')
    localStorage.removeItem('usuario')
    localStorage.removeItem('token')
    localStorage.removeItem('session')

    router.replace('/login')
  }

  const usuariosFiltrados = useMemo(() => {
    const termo = normalizar(busca)

    return usuarios.filter((usuario) => {
      const tipo = normalizar(usuario.tipo)

      const passaTipo =
        filtroTipo === 'todos' ||
        tipo === filtroTipo

      if (!passaTipo) return false

      if (!termo) return true

      const texto = normalizar(
        [
          usuario.id,
          usuario.nome,
          usuario.name,
          usuario.email,
          usuario.telefone,
          usuario.celular,
          usuario.cpf,
          usuario.tipo,
          usuario.status
        ].join(' ')
      )

      return texto.includes(termo)
    })
  }, [usuarios, busca, filtroTipo])

  const badgeTipo = (usuario: UsuarioBanco) => {
    const tipo = normalizar(usuario.tipo)

    if (tipo === 'admin') return <span className="badge dark">Admin</span>
    if (tipo === 'guia') return <span className="badge green">Guia</span>
    if (tipo === 'cliente') return <span className="badge blue">Cliente</span>

    return <span className="badge neutral">Usuário</span>
  }

  const badgeStatus = (usuario: UsuarioBanco) => {
    if (usuarioAtivo(usuario)) {
      return <span className="badge green">Ativo</span>
    }

    return <span className="badge red">Inativo</span>
  }

  const acaoPrincipalUsuario = (usuario: UsuarioBanco) => {
    const tipo = normalizar(usuario.tipo)

    if (tipo === 'guia') {
      router.push('/admin/roteiros')
      return
    }

    if (tipo === 'cliente') {
      router.push('/admin/reservas')
      return
    }

    router.push('/admin/dashboard')
  }

  if (carregando || !user) {
    return (
      <main className="loading">
        <style>{`
          * { box-sizing: border-box; }

          body {
            margin: 0;
            font-family:
              Inter,
              ui-sans-serif,
              system-ui,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
            background: #0f172a;
          }

          .loading {
            min-height: 100vh;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #e5e7eb;
            background:
              radial-gradient(circle at top left, rgba(34,197,94,0.16), transparent 30%),
              linear-gradient(135deg, #020617, #0f172a);
          }

          .loadingCard {
            background: rgba(15, 23, 42, 0.92);
            border: 1px solid rgba(148, 163, 184, 0.18);
            border-radius: 26px;
            padding: 28px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.35);
          }

          .loadingCard img {
            height: 58px;
            width: auto;
            margin-bottom: 12px;
          }
        `}</style>

        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>Carregando usuários...</div>
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
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          background: #f8fafc;
        }

        .page {
          min-height: 100vh;
          min-height: 100dvh;
          background:
            radial-gradient(circle at 0% 0%, rgba(34, 197, 94, 0.10), transparent 30%),
            radial-gradient(circle at 100% 0%, rgba(59, 130, 246, 0.10), transparent 30%),
            linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
          color: #0f172a;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(248, 250, 252, 0.88);
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(18px);
          padding: 12px 18px;
        }

        .headerInner {
          max-width: 1240px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          min-width: 0;
        }

        .brand img {
          height: 40px;
          width: auto;
          display: block;
        }

        .brandTitle {
          font-size: 17px;
          font-weight: 950;
          color: #0f172a;
          letter-spacing: -0.045em;
          line-height: 1;
        }

        .brandSub {
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          margin-top: 3px;
        }

        .settingsWrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }

        .gearBtn {
          width: 42px;
          height: 42px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: rgba(255, 255, 255, 0.86);
          color: #0f172a;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .gearBtn:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.10);
        }

        .settingsMenu {
          position: absolute;
          top: 50px;
          right: 0;
          width: 220px;
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 22px;
          box-shadow: 0 22px 60px rgba(15, 23, 42, 0.16);
          padding: 8px;
          z-index: 80;
        }

        .menuButton {
          width: 100%;
          border: none;
          background: transparent;
          color: #0f172a;
          padding: 12px 13px;
          border-radius: 16px;
          text-align: left;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .menuButton:hover {
          background: #f8fafc;
        }

        .menuButton.danger {
          color: #991b1b;
        }

        .container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 24px 18px 52px;
        }

        .hero {
          background:
            radial-gradient(circle at top right, rgba(34, 197, 94, 0.18), transparent 30%),
            linear-gradient(135deg, #0f172a, #1e293b);
          color: #ffffff;
          border-radius: 34px;
          padding: 28px;
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
          margin-bottom: 18px;
          overflow: hidden;
          position: relative;
        }

        .hero::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: linear-gradient(to bottom, black, transparent);
          pointer-events: none;
        }

        .heroInner {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 22px;
          align-items: end;
        }

        .eyebrow {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          padding: 8px 12px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.08);
          color: #bbf7d0;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .heroTitle {
          margin: 0;
          font-size: clamp(38px, 5.5vw, 66px);
          line-height: 0.94;
          font-weight: 950;
          letter-spacing: -0.08em;
        }

        .heroTitle span {
          color: #86efac;
        }

        .heroText {
          max-width: 720px;
          color: rgba(255,255,255,0.76);
          font-size: 14px;
          line-height: 1.6;
          font-weight: 650;
          margin: 16px 0 0;
        }

        .heroCard {
          border-radius: 28px;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.16);
          padding: 20px;
          backdrop-filter: blur(14px);
          cursor: pointer;
          transition: 0.2s ease;
        }

        .heroCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.20);
        }

        .heroLabel {
          color: rgba(255,255,255,0.66);
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.10em;
        }

        .heroValue {
          margin-top: 8px;
          color: #ffffff;
          font-size: 38px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.07em;
        }

        .heroSmall {
          color: rgba(255,255,255,0.72);
          font-size: 12px;
          font-weight: 750;
          line-height: 1.45;
          margin-top: 8px;
        }

        .alert {
          border-radius: 18px;
          padding: 13px 15px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 800;
        }

        .alert.success {
          background: #ecfdf5;
          border: 1px solid #bbf7d0;
          color: #166534;
        }

        .alert.error {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .statCard {
          background: rgba(255,255,255,0.88);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 24px;
          padding: 15px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
          cursor: pointer;
          transition: 0.2s ease;
        }

        .statCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.10);
        }

        .statIcon {
          width: 38px;
          height: 38px;
          border-radius: 16px;
          background: #ecfdf5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          margin-bottom: 11px;
        }

        .statValue {
          font-size: 27px;
          font-weight: 950;
          line-height: 1;
          letter-spacing: -0.06em;
          color: #0f172a;
        }

        .statLabel {
          color: #64748b;
          font-size: 12px;
          font-weight: 850;
          line-height: 1.35;
          margin-top: 7px;
        }

        .toolbar {
          background: rgba(255,255,255,0.92);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 26px;
          padding: 14px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          margin-bottom: 18px;
        }

        .input {
          width: 100%;
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: #ffffff;
          color: #0f172a;
          border-radius: 999px;
          padding: 12px 14px;
          font-size: 13px;
          font-weight: 800;
          outline: none;
        }

        .input:focus {
          border-color: #22c55e;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.10);
        }

        .filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filterBtn {
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: #ffffff;
          color: #475569;
          border-radius: 999px;
          padding: 10px 13px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          white-space: nowrap;
        }

        .filterBtn.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        .panel {
          background: rgba(255,255,255,0.92);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 28px;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.07);
          overflow: hidden;
        }

        .panelHeader {
          padding: 16px 18px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .panelTitle {
          margin: 0;
          color: #0f172a;
          font-size: 18px;
          line-height: 1.15;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .panelSub {
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
          margin-top: 4px;
        }

        .panelBody {
          padding: 14px;
        }

        .textLink {
          border: none;
          background: transparent;
          color: #16a34a;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          padding: 0;
        }

        .userList {
          display: grid;
          gap: 10px;
        }

        .userCard {
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 22px;
          padding: 12px;
          display: grid;
          grid-template-columns: 58px minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          transition: 0.2s ease;
        }

        .userCard:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
        }

        .avatar {
          width: 58px;
          height: 58px;
          border-radius: 20px;
          background:
            radial-gradient(circle at top right, rgba(34, 197, 94, 0.18), transparent 40%),
            #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #475569;
          font-size: 13px;
          font-weight: 950;
          text-transform: uppercase;
        }

        .userTitle {
          color: #0f172a;
          font-size: 15px;
          font-weight: 950;
          line-height: 1.3;
        }

        .userMeta {
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
          margin-top: 4px;
        }

        .userFooter {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          margin-top: 8px;
          align-items: center;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 10px;
          font-weight: 950;
        }

        .badge.green {
          background: #dcfce7;
          color: #166534;
        }

        .badge.blue {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .badge.dark {
          background: #0f172a;
          color: #ffffff;
        }

        .badge.red {
          background: #fee2e2;
          color: #991b1b;
        }

        .badge.neutral {
          background: #f1f5f9;
          color: #475569;
        }

        .actions {
          display: grid;
          gap: 8px;
          min-width: 150px;
        }

        .actionBtn {
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: #ffffff;
          color: #0f172a;
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 11px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
          white-space: nowrap;
        }

        .actionBtn:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
        }

        .actionBtn.primary {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        .actionBtn.green {
          background: #dcfce7;
          color: #166534;
          border-color: #bbf7d0;
        }

        .empty {
          padding: 24px;
          text-align: center;
          color: #64748b;
          background: #ffffff;
          border: 1px dashed #cbd5e1;
          border-radius: 22px;
          font-size: 13px;
          font-weight: 750;
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.54);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          z-index: 100;
        }

        .modal {
          width: 100%;
          max-width: 430px;
          background: #ffffff;
          border-radius: 28px;
          box-shadow: 0 28px 90px rgba(15, 23, 42, 0.30);
          overflow: hidden;
        }

        .modalHeader {
          padding: 20px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        }

        .modalTitle {
          margin: 0;
          color: #0f172a;
          font-size: 20px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .modalSub {
          color: #64748b;
          font-size: 12px;
          font-weight: 750;
          line-height: 1.45;
          margin-top: 5px;
        }

        .modalBody {
          padding: 20px;
          display: grid;
          gap: 12px;
        }

        .field {
          display: grid;
          gap: 6px;
        }

        .label {
          color: #475569;
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .modalInput {
          width: 100%;
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: #ffffff;
          color: #0f172a;
          border-radius: 16px;
          padding: 13px 14px;
          font-size: 14px;
          font-weight: 800;
          outline: none;
        }

        .modalInput:focus {
          border-color: #22c55e;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.10);
        }

        .modalActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .btn {
          border: none;
          border-radius: 999px;
          padding: 12px 15px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .btn.primary {
          background: #0f172a;
          color: #ffffff;
        }

        .btn.light {
          background: #f1f5f9;
          color: #475569;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 1180px) {
          .statsGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .toolbar {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 1040px) {
          .heroInner {
            grid-template-columns: 1fr;
          }

          .userCard {
            grid-template-columns: 58px minmax(0, 1fr);
          }

          .actions {
            grid-column: 1 / -1;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .header {
            padding: 10px 12px;
          }

          .brandTitle,
          .brandSub {
            display: none;
          }

          .container {
            padding: 16px 12px 42px;
          }

          .hero,
          .panel {
            border-radius: 24px;
          }

          .hero {
            padding: 22px;
          }

          .statsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .filters {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .filterBtn {
            width: 100%;
          }

          .actions {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .heroTitle {
            font-size: 38px;
          }

          .statsGrid {
            grid-template-columns: 1fr;
          }

          .userCard {
            grid-template-columns: 1fr;
          }

          .avatar {
            width: 100%;
            height: 120px;
          }

          .modalActions {
            display: grid;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <div
            className="brand"
            onClick={() => router.push('/admin/dashboard')}
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />

            <div>
              <div className="brandTitle">PrussikTrails Admin</div>
              <div className="brandSub">Usuários da plataforma</div>
            </div>
          </div>

          <div className="settingsWrap">
            <button
              type="button"
              className="gearBtn"
              onClick={() => setMenuAberto((aberto) => !aberto)}
              aria-label="Configurações"
            >
              ⚙️
            </button>

            {menuAberto && (
              <div className="settingsMenu">
                <button
                  type="button"
                  className="menuButton"
                  onClick={abrirAlterarSenha}
                >
                  🔐 Alterar senha
                </button>

                <button
                  type="button"
                  className="menuButton danger"
                  onClick={sair}
                >
                  🚪 Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroInner">
            <div>
              <div className="eyebrow">Base da plataforma</div>

              <h1 className="heroTitle">
                Usuários, guias e clientes com <span>visão administrativa.</span>
              </h1>

              <p className="heroText">
                Acompanhe crescimento da base, perfis cadastrados, guias ativos, clientes e administradores.
                {ultimaAtualizacao && (
                  <>
                    <br />
                    Atualizado às {ultimaAtualizacao}.
                  </>
                )}
              </p>
            </div>

            <aside
              className="heroCard"
              onClick={() => setFiltroTipo('todos')}
            >
              <div className="heroLabel">Usuários cadastrados</div>
              <div className="heroValue">{stats.total}</div>
              <div className="heroSmall">
                {stats.clientes} clientes · {stats.guias} guias · {stats.admins} admin(s) · {stats.novosMes} novo(s) no mês.
              </div>
            </aside>
          </div>
        </section>

        {mensagem && (
          <div className="alert success">{mensagem}</div>
        )}

        {erro && (
          <div className="alert error">{erro}</div>
        )}

        <section className="statsGrid">
          <article
            className="statCard"
            onClick={() => setFiltroTipo('todos')}
          >
            <div className="statIcon">👥</div>
            <div className="statValue">{stats.total}</div>
            <div className="statLabel">usuários cadastrados</div>
          </article>

          <article
            className="statCard"
            onClick={() => setFiltroTipo('cliente')}
          >
            <div className="statIcon">🎒</div>
            <div className="statValue">{stats.clientes}</div>
            <div className="statLabel">clientes aventureiros</div>
          </article>

          <article
            className="statCard"
            onClick={() => setFiltroTipo('guia')}
          >
            <div className="statIcon">🧭</div>
            <div className="statValue">{stats.guias}</div>
            <div className="statLabel">guias cadastrados</div>
          </article>

          <article
            className="statCard"
            onClick={() => setFiltroTipo('admin')}
          >
            <div className="statIcon">⚙️</div>
            <div className="statValue">{stats.admins}</div>
            <div className="statLabel">administradores</div>
          </article>

          <article
            className="statCard"
            onClick={() => setFiltroTipo('todos')}
          >
            <div className="statIcon">📈</div>
            <div className="statValue">{stats.novosMes}</div>
            <div className="statLabel">novos usuários no mês</div>
          </article>

          <article
            className="statCard"
            onClick={() => setFiltroTipo('todos')}
          >
            <div className="statIcon">✅</div>
            <div className="statValue">{stats.ativos}</div>
            <div className="statLabel">usuários ativos estimados</div>
          </article>
        </section>

        <section className="toolbar">
          <input
            className="input"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome, e-mail, telefone, CPF, tipo ou ID..."
          />

          <div className="filters">
            <button
              type="button"
              className={`filterBtn ${filtroTipo === 'todos' ? 'active' : ''}`}
              onClick={() => setFiltroTipo('todos')}
            >
              Todos
            </button>

            <button
              type="button"
              className={`filterBtn ${filtroTipo === 'cliente' ? 'active' : ''}`}
              onClick={() => setFiltroTipo('cliente')}
            >
              Clientes
            </button>

            <button
              type="button"
              className={`filterBtn ${filtroTipo === 'guia' ? 'active' : ''}`}
              onClick={() => setFiltroTipo('guia')}
            >
              Guias
            </button>

            <button
              type="button"
              className={`filterBtn ${filtroTipo === 'admin' ? 'active' : ''}`}
              onClick={() => setFiltroTipo('admin')}
            >
              Admins
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2 className="panelTitle">Lista de usuários</h2>
              <div className="panelSub">
                {usuariosFiltrados.length} usuário(s) encontrado(s) no filtro atual.
              </div>
            </div>

            <button
              type="button"
              className="textLink"
              onClick={atualizar}
              disabled={atualizando}
            >
              {atualizando ? 'Atualizando...' : 'Atualizar usuários'}
            </button>
          </div>

          <div className="panelBody">
            {usuariosFiltrados.length === 0 ? (
              <div className="empty">
                Nenhum usuário encontrado com os filtros atuais.
              </div>
            ) : (
              <div className="userList">
                {usuariosFiltrados.map((usuario) => (
                  <article className="userCard" key={usuario.id}>
                    <div className="avatar">
                      {(nomeUsuario(usuario).slice(0, 2) || 'US').toUpperCase()}
                    </div>

                    <div>
                      <div className="userTitle">
                        {nomeUsuario(usuario)}
                      </div>

                      <div className="userMeta">
                        {usuario.email || 'E-mail não informado'}
                        <br />
                        Telefone: {telefoneUsuario(usuario)} · Cadastro: {formatarData(usuario.created_at)}
                        <br />
                        ID: {usuario.id.slice(0, 8)}
                      </div>

                      <div className="userFooter">
                        {badgeTipo(usuario)}
                        {badgeStatus(usuario)}

                        {usuario.cpf && (
                          <span className="badge neutral">
                            CPF {String(usuario.cpf).slice(-4)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="actions">
                      <button
                        type="button"
                        className="actionBtn primary"
                        onClick={() => acaoPrincipalUsuario(usuario)}
                      >
                        Ver operação
                      </button>

                      {normalizar(usuario.tipo) === 'guia' && (
                        <button
                          type="button"
                          className="actionBtn green"
                          onClick={() => router.push('/admin/roteiros')}
                        >
                          Roteiros
                        </button>
                      )}

                      {normalizar(usuario.tipo) === 'cliente' && (
                        <button
                          type="button"
                          className="actionBtn green"
                          onClick={() => router.push('/admin/reservas')}
                        >
                          Reservas
                        </button>
                      )}

                      <button
                        type="button"
                        className="actionBtn"
                        onClick={() => navigator.clipboard?.writeText(usuario.id)}
                      >
                        Copiar ID
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {modalSenhaAberto && (
        <div className="modalOverlay">
          <form className="modal" onSubmit={alterarSenha}>
            <div className="modalHeader">
              <h2 className="modalTitle">Alterar senha</h2>
              <div className="modalSub">
                Atualize sua senha de acesso administrativo.
              </div>
            </div>

            <div className="modalBody">
              <div className="field">
                <label className="label">Senha atual</label>
                <input
                  className="modalInput"
                  type="password"
                  value={senhaAtual}
                  onChange={(event) => setSenhaAtual(event.target.value)}
                  placeholder="Digite sua senha atual"
                />
              </div>

              <div className="field">
                <label className="label">Nova senha</label>
                <input
                  className="modalInput"
                  type="password"
                  value={novaSenha}
                  onChange={(event) => setNovaSenha(event.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                />
              </div>

              <div className="field">
                <label className="label">Confirmar nova senha</label>
                <input
                  className="modalInput"
                  type="password"
                  value={confirmarSenha}
                  onChange={(event) => setConfirmarSenha(event.target.value)}
                  placeholder="Repita a nova senha"
                />
              </div>

              <div className="modalActions">
                <button
                  type="submit"
                  className="btn primary"
                  disabled={alterandoSenha}
                >
                  {alterandoSenha ? 'Alterando...' : 'Salvar nova senha'}
                </button>

                <button
                  type="button"
                  className="btn light"
                  disabled={alterandoSenha}
                  onClick={() => setModalSenhaAberto(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}