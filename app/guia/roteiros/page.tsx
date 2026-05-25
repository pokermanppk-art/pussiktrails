'use client'

import { FormEvent, MouseEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type UsuarioLocal = {
  id: string
  nome?: string | null
  email?: string | null
  tipo?: string | null
}

type Roteiro = {
  id: string
  titulo?: string | null
  nome?: string | null
  descricao?: string | null
  preco?: number | null
  valor?: number | null
  duracao_horas?: number | null
  duracao?: string | null
  dificuldade?: string | null
  localizacao?: string | null
  local?: string | null
  local_encontro?: string | null
  ponto_encontro?: string | null
  km?: number | null
  distancia_km?: number | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  imagem?: string | null
  status?: string | null
  ativo?: boolean | null
  created_at?: string | null
  id_guia?: string | null
  guia_id?: string | null
  user_id?: string | null
  usuario_id?: string | null
}

type FiltroStatus = 'todos' | 'aprovado' | 'aguardando' | 'rascunho' | 'rejeitado'

export default function GuiaRoteirosPage() {
  const router = useRouter()

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])

  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)

  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos')

  const [menuAberto, setMenuAberto] = useState(false)
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [alterandoSenha, setAlterandoSenha] = useState(false)

  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
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

      if (parsedUser.tipo !== 'guia') {
        router.replace('/login')
        return
      }

      setUser(parsedUser)
      await carregarRoteiros(parsedUser.id)
    } catch (error) {
      console.error('Erro ao iniciar página de roteiros do guia:', error)
      setErro('Não foi possível carregar seus roteiros agora.')
    } finally {
      setCarregando(false)
    }
  }

  const normalizar = (valor: any) => {
    return String(valor || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }

  const formatarMoeda = (valor: any) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(valor || 0))
  }

  const formatarData = (valor?: string | null) => {
    if (!valor) return '-'

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return '-'

    return data.toLocaleDateString('pt-BR')
  }

  const nomeGuia = () => {
    return user?.nome || user?.email || 'Guia'
  }

  const tituloRoteiro = (roteiro: Roteiro) => {
    return roteiro.titulo || roteiro.nome || 'Roteiro sem título'
  }

  const localRoteiro = (roteiro: Roteiro) => {
    return (
      roteiro.localizacao ||
      roteiro.local ||
      roteiro.local_encontro ||
      roteiro.ponto_encontro ||
      'Local a confirmar'
    )
  }

  const fotoRoteiro = (roteiro: Roteiro) => {
    return roteiro.foto_capa || roteiro.foto_url || roteiro.imagem_url || roteiro.imagem || ''
  }

  const valorRoteiro = (roteiro: Roteiro) => {
    return Number(roteiro.preco || roteiro.valor || 0)
  }

  const kmRoteiro = (roteiro: Roteiro) => {
    return Number(roteiro.km || roteiro.distancia_km || 0)
  }

  const duracaoRoteiro = (roteiro: Roteiro) => {
    if (roteiro.duracao_horas) return `${roteiro.duracao_horas}h`
    if (roteiro.duracao) return roteiro.duracao
    return '-'
  }

  const statusNormalizado = (roteiro: Roteiro) => {
    const status = normalizar(roteiro.status)

    if (
      status === 'ativo' ||
      status === 'aprovado' ||
      status === 'aprovada' ||
      status === 'publicado' ||
      status === 'publicada'
    ) {
      return 'aprovado'
    }

    if (
      status === 'aguardando' ||
      status === 'pendente' ||
      status === 'em_analise' ||
      status === 'em análise'
    ) {
      return 'aguardando'
    }

    if (
      status === 'rejeitado' ||
      status === 'rejeitada' ||
      status === 'recusado' ||
      status === 'recusada'
    ) {
      return 'rejeitado'
    }

    return 'rascunho'
  }

  const getStatusInfo = (roteiro: Roteiro) => {
    const status = statusNormalizado(roteiro)

    if (status === 'aprovado') {
      return {
        label: 'Aprovado',
        classe: 'success',
        icon: '✅'
      }
    }

    if (status === 'aguardando') {
      return {
        label: 'Aguardando',
        classe: 'warning',
        icon: '⏳'
      }
    }

    if (status === 'rejeitado') {
      return {
        label: 'Rejeitado',
        classe: 'danger',
        icon: '❌'
      }
    }

    return {
      label: 'Rascunho',
      classe: 'muted',
      icon: '📝'
    }
  }

  const podeEditar = (roteiro: Roteiro) => {
    const status = statusNormalizado(roteiro)

    return (
      status === 'aguardando' ||
      status === 'rascunho' ||
      status === 'rejeitado'
    )
  }

  const podeExcluir = (roteiro: Roteiro) => {
    const status = statusNormalizado(roteiro)

    return (
      status === 'aguardando' ||
      status === 'rascunho' ||
      status === 'rejeitado'
    )
  }

  const carregarRoteiros = async (guiaId: string) => {
    if (!guiaId) return

    const camposGuia = ['id_guia', 'guia_id', 'user_id', 'usuario_id']
    const mapa = new Map<string, Roteiro>()

    for (const campo of camposGuia) {
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .eq(campo, guiaId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        ;(data as Roteiro[]).forEach((roteiro) => {
          if (roteiro?.id) mapa.set(roteiro.id, roteiro)
        })
      }
    }

    setRoteiros(Array.from(mapa.values()))
  }

  const atualizar = async () => {
    if (!user?.id) return

    setAtualizando(true)
    setErro('')
    setMensagem('')

    try {
      await carregarRoteiros(user.id)
      setMensagem('Roteiros atualizados.')
      setTimeout(() => setMensagem(''), 2400)
    } catch (error) {
      console.error('Erro ao atualizar roteiros:', error)
      setErro('Não foi possível atualizar os roteiros.')
    } finally {
      setAtualizando(false)
    }
  }

  const handleExcluir = async (
    id: string,
    titulo: string,
    event: MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation()

    const confirmar = window.confirm(
      `Tem certeza que deseja excluir o roteiro "${titulo}"? Esta ação não pode ser desfeita.`
    )

    if (!confirmar) return

    setErro('')
    setMensagem('')

    const { error } = await supabase
      .from('roteiros')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao excluir roteiro:', error)
      setErro('Não foi possível excluir o roteiro.')
      return
    }

    setMensagem('Roteiro excluído com sucesso.')
    await carregarRoteiros(user?.id || '')
    setTimeout(() => setMensagem(''), 2400)
  }

  const handleEditarClick = (
    roteiroId: string,
    event?: MouseEvent<HTMLButtonElement>
  ) => {
    event?.stopPropagation()
    router.push(`/guia/roteiros/editar/${roteiroId}`)
  }

  const handleCardClick = (roteiro: Roteiro) => {
    if (podeEditar(roteiro)) {
      router.push(`/guia/roteiros/editar/${roteiro.id}`)
      return
    }

    router.push(`/roteiros/${roteiro.id}`)
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
        headers: { 'Content-Type': 'application/json' },
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
      console.warn('Aviso ao encerrar sessão:', error)
    }

    localStorage.removeItem('user')
    localStorage.removeItem('usuario')
    localStorage.removeItem('token')
    localStorage.removeItem('session')

    router.replace('/login')
  }

  const roteirosFiltrados = useMemo(() => {
    const termo = normalizar(busca)

    return roteiros.filter((roteiro) => {
      const status = statusNormalizado(roteiro)

      const matchStatus =
        filtroStatus === 'todos' ||
        status === filtroStatus

      if (!matchStatus) return false

      if (!termo) return true

      const texto = normalizar(
        [
          tituloRoteiro(roteiro),
          roteiro.descricao,
          localRoteiro(roteiro),
          roteiro.dificuldade,
          roteiro.status
        ].join(' ')
      )

      return texto.includes(termo)
    })
  }, [roteiros, busca, filtroStatus])

  const estatisticas = useMemo(() => {
    const aprovados = roteiros.filter((r) => statusNormalizado(r) === 'aprovado')
    const pendentes = roteiros.filter((r) => statusNormalizado(r) === 'aguardando')
    const rascunhos = roteiros.filter((r) => statusNormalizado(r) === 'rascunho')
    const rejeitados = roteiros.filter((r) => statusNormalizado(r) === 'rejeitado')

    return {
      total: roteiros.length,
      aprovados: aprovados.length,
      pendentes: pendentes.length,
      rascunhos: rascunhos.length,
      rejeitados: rejeitados.length,
      kmTotal: roteiros.reduce((acc, r) => acc + kmRoteiro(r), 0),
      valorMedio:
        roteiros.length > 0
          ? roteiros.reduce((acc, r) => acc + valorRoteiro(r), 0) / roteiros.length
          : 0
    }
  }, [roteiros])

  if (carregando || !user) {
    return (
      <main className="loading">
        <style>{`
          * { box-sizing: border-box; }

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

          .loading {
            min-height: 100vh;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            background:
              radial-gradient(circle at 10% 0%, rgba(132,204,22,0.16), transparent 28%),
              radial-gradient(circle at 90% 10%, rgba(251,146,60,0.14), transparent 28%),
              linear-gradient(180deg,#fffdf7 0%,#f3f5ea 48%,#eef2e5 100%);
            color: #172018;
          }

          .loadingCard {
            background: rgba(255,255,255,0.92);
            border: 1px solid rgba(15,23,42,0.06);
            border-radius: 30px;
            padding: 28px;
            text-align: center;
            box-shadow: 0 20px 50px rgba(15,23,42,0.08);
          }

          .loadingCard img {
            height: 64px;
            width: auto;
            margin-bottom: 12px;
          }
        `}</style>

        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>Carregando seus roteiros...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{`
        * { box-sizing: border-box; }

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
            radial-gradient(circle at 10% 0%, rgba(132,204,22,0.16), transparent 28%),
            radial-gradient(circle at 90% 10%, rgba(251,146,60,0.14), transparent 28%),
            linear-gradient(180deg,#fffdf7 0%,#f3f5ea 48%,#eef2e5 100%);
          color: #172018;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255,253,247,0.88);
          border-bottom: 1px solid rgba(15,23,42,0.06);
          backdrop-filter: blur(18px);
          padding: 10px 16px;
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
          height: 42px;
          width: auto;
          display: block;
          object-fit: contain;
        }

        .brandTitle {
          color: #dc2626;
          font-size: 17px;
          font-weight: 950;
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .brandSub {
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          margin-top: 3px;
        }

        .settingsWrap {
          position: relative;
        }

        .gearBtn {
          width: 42px;
          height: 42px;
          border: 1px solid rgba(15,23,42,0.08);
          background: rgba(255,255,255,0.84);
          color: #172018;
          border-radius: 999px;
          cursor: pointer;
          font-size: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px rgba(15,23,42,0.05);
        }

        .settingsMenu {
          position: absolute;
          top: 50px;
          right: 0;
          width: 230px;
          background: #ffffff;
          border: 1px solid rgba(15,23,42,0.10);
          border-radius: 22px;
          box-shadow: 0 22px 60px rgba(15,23,42,0.16);
          padding: 8px;
          z-index: 80;
        }

        .menuButton {
          width: 100%;
          border: none;
          background: transparent;
          color: #172018;
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
          padding: 22px 16px 54px;
        }

        .hero {
          position: relative;
          overflow: hidden;
          border-radius: 38px;
          padding: 28px;
          background:
            linear-gradient(135deg, rgba(23,32,24,0.78), rgba(23,32,24,0.34)),
            radial-gradient(circle at top right, rgba(190,242,100,0.30), transparent 34%),
            linear-gradient(135deg, #1f331f 0%, #647a49 46%, #d7c6a1 100%);
          color: #ffffff;
          box-shadow: 0 24px 60px rgba(23,32,24,0.18);
          margin-bottom: 16px;
        }

        .heroGrid {
          display: grid;
          grid-template-columns: minmax(0,1fr) 320px;
          gap: 22px;
          align-items: end;
        }

        .eyebrow {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.24);
          background: rgba(255,255,255,0.12);
          color: #f7fee7;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .heroTitle {
          margin: 0;
          font-size: clamp(42px, 6vw, 72px);
          line-height: 0.92;
          font-weight: 950;
          letter-spacing: -0.085em;
        }

        .heroTitle span {
          color: #bef264;
        }

        .heroText {
          max-width: 680px;
          color: rgba(255,255,255,0.82);
          line-height: 1.6;
          margin: 14px 0 0;
          font-size: 14px;
          font-weight: 650;
        }

        .heroCard {
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 30px;
          padding: 18px;
          backdrop-filter: blur(14px);
        }

        .heroCardLabel {
          color: rgba(255,255,255,0.70);
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }

        .heroCardValue {
          margin-top: 8px;
          font-size: 32px;
          font-weight: 950;
          letter-spacing: -0.06em;
        }

        .heroCardText {
          margin-top: 6px;
          color: rgba(255,255,255,0.76);
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
        }

        .heroActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
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

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(15,23,42,0.10);
        }

        .btn:disabled {
          opacity: 0.62;
          cursor: not-allowed;
        }

        .btn.dark {
          background: #172018;
          color: #ffffff;
        }

        .btn.green {
          background: #16a34a;
          color: #ffffff;
        }

        .btn.light {
          background: rgba(255,255,255,0.88);
          color: #172018;
        }

        .btn.soft {
          background: #eef2e5;
          color: #475569;
        }

        .alert {
          border-radius: 18px;
          padding: 13px 15px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 850;
          line-height: 1.45;
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
          grid-template-columns: repeat(7, minmax(0,1fr));
          gap: 10px;
          margin-bottom: 16px;
        }

        .statCard {
          background: rgba(255,255,255,0.90);
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 24px;
          padding: 14px;
          box-shadow: 0 10px 30px rgba(15,23,42,0.055);
          cursor: pointer;
          transition: 0.2s ease;
        }

        .statCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 34px rgba(15,23,42,0.10);
        }

        .statCard.active {
          border-color: rgba(22,163,74,0.38);
          box-shadow: 0 0 0 4px rgba(22,163,74,0.08);
        }

        .statIcon {
          font-size: 22px;
          margin-bottom: 7px;
        }

        .statValue {
          color: #172018;
          font-size: 23px;
          font-weight: 950;
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .statLabel {
          margin-top: 5px;
          color: #64748b;
          font-size: 11px;
          font-weight: 850;
          line-height: 1.35;
        }

        .toolbar {
          background: rgba(255,255,255,0.90);
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 28px;
          padding: 14px;
          box-shadow: 0 12px 34px rgba(15,23,42,0.06);
          display: grid;
          grid-template-columns: minmax(0,1fr) auto;
          gap: 10px;
          align-items: center;
          margin-bottom: 16px;
        }

        .input {
          width: 100%;
          border: 1px solid rgba(15,23,42,0.08);
          background: #fffdf7;
          border-radius: 999px;
          padding: 13px 15px;
          font-size: 14px;
          color: #172018;
          outline: none;
          font-weight: 750;
        }

        .input:focus {
          border-color: #84cc16;
          box-shadow: 0 0 0 4px rgba(132,204,22,0.12);
        }

        .toolbarActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .filterBanner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          background: rgba(255,255,255,0.90);
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 22px;
          padding: 12px 15px;
          margin-bottom: 16px;
          color: #64748b;
          font-size: 13px;
          font-weight: 800;
        }

        .routesGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 16px;
        }

        .routeCard {
          background: rgba(255,255,255,0.92);
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 12px 34px rgba(15,23,42,0.06);
          transition: 0.2s ease;
          cursor: pointer;
        }

        .routeCard:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 44px rgba(15,23,42,0.10);
        }

        .cover {
          height: 155px;
          overflow: hidden;
          background:
            radial-gradient(circle at top right, rgba(190,242,100,0.22), transparent 34%),
            linear-gradient(135deg, #1f331f, #647a49);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.86);
          font-size: 42px;
        }

        .cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .routeBody {
          padding: 15px;
        }

        .routeTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 8px;
        }

        .routeTitle {
          margin: 0;
          color: #172018;
          font-size: 16px;
          line-height: 1.25;
          font-weight: 950;
          letter-spacing: -0.035em;
        }

        .statusBadge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 10px;
          font-weight: 950;
          white-space: nowrap;
        }

        .statusBadge.success {
          background: #dcfce7;
          color: #166534;
        }

        .statusBadge.warning {
          background: #fef3c7;
          color: #92400e;
        }

        .statusBadge.danger {
          background: #fee2e2;
          color: #991b1b;
        }

        .statusBadge.muted {
          background: #f1f5f9;
          color: #64748b;
        }

        .description {
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
          font-weight: 700;
          min-height: 36px;
          margin: 0 0 12px;
        }

        .metaGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 13px;
        }

        .meta {
          background: #fffdf7;
          border: 1px solid rgba(15,23,42,0.05);
          border-radius: 16px;
          padding: 9px;
          color: #475569;
          font-size: 11px;
          font-weight: 850;
          line-height: 1.25;
        }

        .routeActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .smallBtn {
          flex: 1;
          min-width: 110px;
          border: none;
          border-radius: 999px;
          padding: 9px 11px;
          font-size: 11px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .smallBtn:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .smallBtn.blue {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .smallBtn.red {
          background: #fee2e2;
          color: #991b1b;
        }

        .smallBtn.green {
          background: #dcfce7;
          color: #166534;
        }

        .smallBtn.dark {
          background: #172018;
          color: #ffffff;
        }

        .empty {
          background: rgba(255,255,255,0.90);
          border: 1px dashed rgba(15,23,42,0.14);
          border-radius: 30px;
          padding: 54px 22px;
          text-align: center;
          color: #64748b;
          box-shadow: 0 12px 34px rgba(15,23,42,0.055);
        }

        .emptyIcon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .emptyTitle {
          color: #172018;
          font-size: 20px;
          font-weight: 950;
          letter-spacing: -0.04em;
          margin-bottom: 7px;
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(15,23,42,0.52);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }

        .modal {
          width: 100%;
          max-width: 460px;
          background: #ffffff;
          border-radius: 28px;
          box-shadow: 0 28px 90px rgba(15,23,42,0.28);
          overflow: hidden;
        }

        .modalHeader {
          padding: 20px;
          border-bottom: 1px solid rgba(15,23,42,0.08);
        }

        .modalTitle {
          margin: 0;
          color: #172018;
          font-size: 20px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .modalSub {
          margin-top: 5px;
          color: #64748b;
          font-size: 12px;
          font-weight: 750;
          line-height: 1.45;
        }

        .modalBody {
          padding: 20px;
          display: grid;
          gap: 12px;
        }

        .field {
          display: grid;
          gap: 7px;
        }

        .label {
          color: #475569;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .modalActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        @media (max-width: 1120px) {
          .heroGrid {
            grid-template-columns: 1fr;
          }

          .statsGrid {
            grid-template-columns: repeat(4, minmax(0,1fr));
          }

          .toolbar {
            grid-template-columns: 1fr;
          }

          .toolbarActions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 760px) {
          .header {
            padding: 9px 12px;
          }

          .brandTitle,
          .brandSub {
            display: none;
          }

          .container {
            padding: 16px 12px 42px;
          }

          .hero {
            border-radius: 28px;
            padding: 20px;
          }

          .heroTitle {
            font-size: 40px;
          }

          .statsGrid {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }

          .routesGrid {
            grid-template-columns: 1fr;
          }

          .filterBanner {
            align-items: flex-start;
            flex-direction: column;
          }

          .metaGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .statsGrid {
            grid-template-columns: 1fr;
          }

          .heroActions,
          .toolbarActions,
          .routeActions,
          .modalActions {
            display: grid;
          }

          .btn,
          .smallBtn {
            width: 100%;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <div className="brand" onClick={() => router.push('/guia/dashboard')}>
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />

            <div>
              <div className="brandTitle">PrussikTrails</div>
              <div className="brandSub">Meus roteiros</div>
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
                  onClick={() => {
                    setMenuAberto(false)
                    router.push('/guia/dashboard')
                  }}
                >
                  🏠 Dashboard
                </button>

                <button
                  type="button"
                  className="menuButton"
                  onClick={() => {
                    setMenuAberto(false)
                    router.push('/guia/perfil')
                  }}
                >
                  👤 Perfil
                </button>

                <button
                  type="button"
                  className="menuButton"
                  onClick={() => {
                    setMenuAberto(false)
                    router.push('/guia/financeiro')
                  }}
                >
                  💰 Financeiro
                </button>

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
          <div className="heroGrid">
            <div>
              <div className="eyebrow">Painel do guia</div>

              <h1 className="heroTitle">
                Meus <span>roteiros</span>
              </h1>

              <p className="heroText">
                Gerencie suas experiências, acompanhe o status de aprovação e mantenha seus roteiros organizados para os aventureiros.
              </p>

              <div className="heroActions">
                <button
                  type="button"
                  className="btn light"
                  onClick={() => router.push('/guia/dashboard')}
                >
                  Voltar ao dashboard
                </button>

                <button
                  type="button"
                  className="btn green"
                  onClick={() => router.push('/guia/roteiros/novo')}
                >
                  Criar novo roteiro
                </button>

                <button
                  type="button"
                  className="btn light"
                  onClick={atualizar}
                  disabled={atualizando}
                >
                  {atualizando ? 'Atualizando...' : 'Atualizar'}
                </button>
              </div>
            </div>

            <aside className="heroCard">
              <div className="heroCardLabel">Guia responsável</div>
              <div className="heroCardValue">{nomeGuia()}</div>
              <div className="heroCardText">
                {estatisticas.total} roteiro(s) cadastrados · {estatisticas.kmTotal.toFixed(1)} km em experiências.
              </div>
            </aside>
          </div>
        </section>

        {mensagem && <div className="alert success">{mensagem}</div>}
        {erro && <div className="alert error">{erro}</div>}

        <section className="statsGrid">
          <article
            className={`statCard ${filtroStatus === 'todos' ? 'active' : ''}`}
            onClick={() => setFiltroStatus('todos')}
          >
            <div className="statIcon">📊</div>
            <div className="statValue">{estatisticas.total}</div>
            <div className="statLabel">Total de roteiros</div>
          </article>

          <article
            className={`statCard ${filtroStatus === 'aprovado' ? 'active' : ''}`}
            onClick={() => setFiltroStatus('aprovado')}
          >
            <div className="statIcon">✅</div>
            <div className="statValue">{estatisticas.aprovados}</div>
            <div className="statLabel">Aprovados</div>
          </article>

          <article
            className={`statCard ${filtroStatus === 'aguardando' ? 'active' : ''}`}
            onClick={() => setFiltroStatus('aguardando')}
          >
            <div className="statIcon">⏳</div>
            <div className="statValue">{estatisticas.pendentes}</div>
            <div className="statLabel">Aguardando análise</div>
          </article>

          <article
            className={`statCard ${filtroStatus === 'rascunho' ? 'active' : ''}`}
            onClick={() => setFiltroStatus('rascunho')}
          >
            <div className="statIcon">📝</div>
            <div className="statValue">{estatisticas.rascunhos}</div>
            <div className="statLabel">Rascunhos</div>
          </article>

          <article
            className={`statCard ${filtroStatus === 'rejeitado' ? 'active' : ''}`}
            onClick={() => setFiltroStatus('rejeitado')}
          >
            <div className="statIcon">❌</div>
            <div className="statValue">{estatisticas.rejeitados}</div>
            <div className="statLabel">Rejeitados</div>
          </article>

          <article className="statCard" onClick={() => setFiltroStatus('todos')}>
            <div className="statIcon">👣</div>
            <div className="statValue">{estatisticas.kmTotal.toFixed(1)}</div>
            <div className="statLabel">KM cadastrados</div>
          </article>

          <article className="statCard" onClick={() => setFiltroStatus('todos')}>
            <div className="statIcon">💰</div>
            <div className="statValue">{formatarMoeda(estatisticas.valorMedio)}</div>
            <div className="statLabel">Valor médio</div>
          </article>
        </section>

        {filtroStatus !== 'todos' && (
          <div className="filterBanner">
            <span>
              Filtrando por:{' '}
              <strong>
                {filtroStatus === 'aprovado'
                  ? 'Aprovados'
                  : filtroStatus === 'aguardando'
                    ? 'Aguardando análise'
                    : filtroStatus === 'rascunho'
                      ? 'Rascunhos'
                      : 'Rejeitados'}
              </strong>
            </span>

            <button
              type="button"
              className="btn soft"
              onClick={() => setFiltroStatus('todos')}
            >
              Limpar filtro
            </button>
          </div>
        )}

        <section className="toolbar">
          <input
            className="input"
            type="text"
            placeholder="Buscar por título, descrição, dificuldade ou localização..."
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />

          <div className="toolbarActions">
            {busca && (
              <button
                type="button"
                className="btn soft"
                onClick={() => setBusca('')}
              >
                Limpar busca
              </button>
            )}

            <button
              type="button"
              className="btn dark"
              onClick={() => router.push('/guia/roteiros/novo')}
            >
              Novo roteiro
            </button>
          </div>
        </section>

        {roteirosFiltrados.length === 0 ? (
          <section className="empty">
            <div className="emptyIcon">🥾</div>
            <div className="emptyTitle">Nenhum roteiro encontrado</div>
            <div>
              {busca || filtroStatus !== 'todos'
                ? 'Nenhum roteiro corresponde aos filtros atuais.'
                : 'Comece criando sua primeira experiência para a comunidade PrussikTrails.'}
            </div>

            <div className="heroActions" style={{ justifyContent: 'center' }}>
              <button
                type="button"
                className="btn green"
                onClick={() => router.push('/guia/roteiros/novo')}
              >
                Criar roteiro
              </button>
            </div>
          </section>
        ) : (
          <section className="routesGrid">
            {roteirosFiltrados.map((roteiro) => {
              const statusInfo = getStatusInfo(roteiro)
              const editar = podeEditar(roteiro)
              const excluir = podeExcluir(roteiro)

              return (
                <article
                  className="routeCard"
                  key={roteiro.id}
                  onClick={() => handleCardClick(roteiro)}
                >
                  <div className="cover">
                    {fotoRoteiro(roteiro) ? (
                      <img src={fotoRoteiro(roteiro)} alt={tituloRoteiro(roteiro)} />
                    ) : (
                      <span>🥾</span>
                    )}
                  </div>

                  <div className="routeBody">
                    <div className="routeTop">
                      <h3 className="routeTitle">{tituloRoteiro(roteiro)}</h3>

                      <span className={`statusBadge ${statusInfo.classe}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </div>

                    <p className="description">
                      {roteiro.descricao
                        ? roteiro.descricao.length > 105
                          ? `${roteiro.descricao.slice(0, 105)}...`
                          : roteiro.descricao
                        : 'Sem descrição cadastrada.'}
                    </p>

                    <div className="metaGrid">
                      <div className="meta">📍 {localRoteiro(roteiro)}</div>
                      <div className="meta">👣 {kmRoteiro(roteiro).toFixed(1)} km</div>
                      <div className="meta">💰 {formatarMoeda(valorRoteiro(roteiro))}</div>
                      <div className="meta">⏱️ {duracaoRoteiro(roteiro)}</div>
                    </div>

                    <div className="routeActions">
                      {editar && (
                        <button
                          type="button"
                          className="smallBtn blue"
                          onClick={(event) => handleEditarClick(roteiro.id, event)}
                        >
                          Editar
                        </button>
                      )}

                      {statusNormalizado(roteiro) === 'aprovado' && (
                        <button
                          type="button"
                          className="smallBtn green"
                          onClick={(event) => {
                            event.stopPropagation()
                            router.push(`/roteiros/${roteiro.id}`)
                          }}
                        >
                          Ver público
                        </button>
                      )}

                      {statusNormalizado(roteiro) === 'aprovado' && (
                        <button
                          type="button"
                          className="smallBtn dark"
                          onClick={(event) => {
                            event.stopPropagation()
                            router.push('/guia/grupos')
                          }}
                        >
                          Grupo
                        </button>
                      )}

                      {excluir && (
                        <button
                          type="button"
                          className="smallBtn red"
                          onClick={(event) => handleExcluir(roteiro.id, tituloRoteiro(roteiro), event)}
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>

      {modalSenhaAberto && (
        <div className="modalOverlay">
          <form className="modal" onSubmit={alterarSenha}>
            <div className="modalHeader">
              <h2 className="modalTitle">Alterar senha</h2>
              <div className="modalSub">
                Atualize sua senha de acesso ao painel do guia.
              </div>
            </div>

            <div className="modalBody">
              <div className="field">
                <label className="label">Senha atual</label>
                <input
                  className="input"
                  type="password"
                  value={senhaAtual}
                  onChange={(event) => setSenhaAtual(event.target.value)}
                  placeholder="Digite sua senha atual"
                />
              </div>

              <div className="field">
                <label className="label">Nova senha</label>
                <input
                  className="input"
                  type="password"
                  value={novaSenha}
                  onChange={(event) => setNovaSenha(event.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                />
              </div>

              <div className="field">
                <label className="label">Confirmar nova senha</label>
                <input
                  className="input"
                  type="password"
                  value={confirmarSenha}
                  onChange={(event) => setConfirmarSenha(event.target.value)}
                  placeholder="Repita a nova senha"
                />
              </div>

              <div className="modalActions">
                <button
                  type="submit"
                  className="btn dark"
                  disabled={alterandoSenha}
                >
                  {alterandoSenha ? 'Alterando...' : 'Salvar nova senha'}
                </button>

                <button
                  type="button"
                  className="btn soft"
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