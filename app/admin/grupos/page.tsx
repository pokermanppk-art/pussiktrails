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
  tipo?: string | null
}

type Roteiro = {
  id: string
  titulo?: string | null
  nome?: string | null
  local?: string | null
  localizacao?: string | null
  id_guia?: string | null
  guia_id?: string | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  imagem?: string | null
  status?: string | null
  created_at?: string | null
}

type GrupoRoteiro = {
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
  [key: string]: any
}

type GrupoMembro = {
  id: string
  grupo_id?: string | null
  grupo_roteiro_id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  cliente_id?: string | null
  guia_id?: string | null
  papel?: string | null
  tipo?: string | null
  status?: string | null
  created_at?: string | null
  [key: string]: any
}

type GrupoMensagem = {
  id: string
  grupo_id?: string | null
  grupo_roteiro_id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  mensagem?: string | null
  texto?: string | null
  conteudo?: string | null
  created_at?: string | null
  [key: string]: any
}

type GrupoCompleto = GrupoRoteiro & {
  roteiro?: Roteiro | null
  guia?: UsuarioBanco | null
  membros?: GrupoMembro[]
  mensagens?: GrupoMensagem[]
  roteiro_titulo?: string
  guia_nome?: string
  total_membros?: number
  total_mensagens?: number
  ultima_mensagem_em?: string | null
}

type FiltroStatus = 'todos' | 'ativos' | 'pausados' | 'vazios' | 'com_membros'

type Stats = {
  total: number
  ativos: number
  pausados: number
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
  gruposMes: 0,
  membrosTotal: 0,
  mensagensTotal: 0,
  gruposVazios: 0,
  gruposComMembros: 0
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
  const [menuAberto, setMenuAberto] = useState(false)

  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos')

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
      await carregarGrupos()
    } catch (error) {
      console.error('Erro ao iniciar grupos admin:', error)
      setErro('Não foi possível carregar os grupos agora.')
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

  const tituloRoteiro = (roteiro?: Roteiro | null) => {
    return roteiro?.titulo || roteiro?.nome || 'Roteiro'
  }

  const tituloGrupo = (grupo?: GrupoCompleto | null) => {
    return grupo?.titulo || grupo?.nome || grupo?.roteiro_titulo || 'Grupo do roteiro'
  }

  const localRoteiro = (roteiro?: Roteiro | null) => {
    return roteiro?.local || roteiro?.localizacao || 'Local a confirmar'
  }

  const imagemRoteiro = (roteiro?: Roteiro | null) => {
    return roteiro?.foto_capa || roteiro?.foto_url || roteiro?.imagem_url || roteiro?.imagem || ''
  }

  const idGrupoDoMembro = (membro: GrupoMembro) => {
    return membro.grupo_id || membro.grupo_roteiro_id || ''
  }

  const idUsuarioDoMembro = (membro: GrupoMembro) => {
    return membro.user_id || membro.usuario_id || membro.cliente_id || membro.guia_id || ''
  }

  const idGrupoDaMensagem = (mensagemItem: GrupoMensagem) => {
    return mensagemItem.grupo_id || mensagemItem.grupo_roteiro_id || ''
  }

  const textoMensagem = (mensagemItem?: GrupoMensagem | null) => {
    return mensagemItem?.mensagem || mensagemItem?.texto || mensagemItem?.conteudo || ''
  }

  const formatarData = (valor?: string | null) => {
    if (!valor) return '-'

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return valor

    return data.toLocaleDateString('pt-BR')
  }

  const formatarDataHora = (valor?: string | null) => {
    if (!valor) return '-'

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return valor

    return data.toLocaleString('pt-BR')
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

  const grupoAtivo = (grupo: GrupoRoteiro) => {
    const status = normalizar(grupo.status)

    if (grupo.ativo === true) return true
    if (grupo.ativo === false) return false

    return !status || status === 'ativo' || status === 'active'
  }

  const grupoPausado = (grupo: GrupoRoteiro) => {
    const status = normalizar(grupo.status)

    return (
      grupo.ativo === false ||
      status === 'pausado' ||
      status === 'inativo' ||
      status === 'encerrado' ||
      status === 'arquivado'
    )
  }

  const extrairColunaAusente = (error: any) => {
    const texto = [error?.message, error?.details, error?.hint]
      .filter(Boolean)
      .join(' ')

    const matchAspas = texto.match(/'([^']+)'/)

    if (matchAspas?.[1]) return matchAspas[1]

    const matchColumn = texto.match(/column\s+([a-zA-Z0-9_]+)/i)

    if (matchColumn?.[1]) return matchColumn[1]

    return ''
  }

  const erroDeColunaAusente = (error: any) => {
    const texto = String(
      error?.message ||
        error?.details ||
        error?.hint ||
        ''
    ).toLowerCase()

    return (
      error?.code === '42703' ||
      error?.code === 'PGRST204' ||
      texto.includes('could not find') ||
      texto.includes('schema cache') ||
      texto.includes('column')
    )
  }

  const carregarGrupos = async () => {
    setErro('')

    const { data: gruposData, error: gruposError } = await supabase
      .from('grupos_roteiros')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (gruposError) {
      console.error('Erro ao carregar grupos:', gruposError)
      setErro('Não foi possível carregar os grupos.')
      return
    }

    const gruposBase = (gruposData || []) as GrupoRoteiro[]

    const roteiroIds = Array.from(
      new Set(
        gruposBase
          .map((grupo) => grupo.roteiro_id)
          .filter(Boolean) as string[]
      )
    )

    const guiaIdsDiretos = Array.from(
      new Set(
        gruposBase
          .map((grupo) => grupo.guia_id)
          .filter(Boolean) as string[]
      )
    )

    let roteiros: Roteiro[] = []
    let membros: GrupoMembro[] = []
    let mensagensLista: GrupoMensagem[] = []
    let guias: UsuarioBanco[] = []

    if (roteiroIds.length > 0) {
      const { data: roteirosData, error: roteirosError } = await supabase
        .from('roteiros')
        .select('*')
        .in('id', roteiroIds)

      if (roteirosError) {
        console.warn('Erro ao buscar roteiros dos grupos:', roteirosError)
      }

      roteiros = (roteirosData || []) as Roteiro[]
    }

    const grupoIds = gruposBase.map((grupo) => grupo.id)

    if (grupoIds.length > 0) {
      const membrosResult = await supabase
        .from('grupo_membros')
        .select('*')
        .in('grupo_id', grupoIds)

      if (membrosResult.error) {
        const fallbackMembros = await supabase
          .from('grupo_membros')
          .select('*')
          .in('grupo_roteiro_id', grupoIds)

        if (fallbackMembros.error) {
          console.warn('Erro ao buscar membros dos grupos:', membrosResult.error, fallbackMembros.error)
        } else {
          membros = (fallbackMembros.data || []) as GrupoMembro[]
        }
      } else {
        membros = (membrosResult.data || []) as GrupoMembro[]
      }

      const mensagensResult = await supabase
        .from('grupo_mensagens')
        .select('*')
        .in('grupo_id', grupoIds)
        .order('created_at', { ascending: false })
        .limit(2000)

      if (mensagensResult.error) {
        const fallbackMensagens = await supabase
          .from('grupo_mensagens')
          .select('*')
          .in('grupo_roteiro_id', grupoIds)
          .order('created_at', { ascending: false })
          .limit(2000)

        if (fallbackMensagens.error) {
          console.warn('Erro ao buscar mensagens dos grupos:', mensagensResult.error, fallbackMensagens.error)
        } else {
          mensagensLista = (fallbackMensagens.data || []) as GrupoMensagem[]
        }
      } else {
        mensagensLista = (mensagensResult.data || []) as GrupoMensagem[]
      }
    }

    const guiaIdsDosRoteiros = roteiros
      .map((roteiro) => roteiro.id_guia || roteiro.guia_id)
      .filter(Boolean) as string[]

    const guiaIdsDosMembros = membros
      .filter((membro) => normalizar(membro.papel || membro.tipo) === 'guia' || membro.guia_id)
      .map(idUsuarioDoMembro)
      .filter(Boolean)

    const guiaIds = Array.from(
      new Set([...guiaIdsDiretos, ...guiaIdsDosRoteiros, ...guiaIdsDosMembros])
    )

    if (guiaIds.length > 0) {
      const { data: guiasData, error: guiasError } = await supabase
        .from('users')
        .select('id, nome, name, email, tipo')
        .in('id', guiaIds)

      if (guiasError) {
        console.warn('Erro ao buscar guias dos grupos:', guiasError)
      }

      guias = (guiasData || []) as UsuarioBanco[]
    }

    const gruposCompletos: GrupoCompleto[] = gruposBase.map((grupo) => {
      const roteiro =
        roteiros.find((item) => item.id === grupo.roteiro_id) ||
        null

      const guiaId =
        grupo.guia_id ||
        roteiro?.id_guia ||
        roteiro?.guia_id ||
        ''

      const guia =
        guias.find((item) => item.id === guiaId) ||
        null

      const membrosDoGrupo = membros.filter((membro) => idGrupoDoMembro(membro) === grupo.id)

      const mensagensDoGrupo = mensagensLista.filter(
        (mensagemItem) => idGrupoDaMensagem(mensagemItem) === grupo.id
      )

      const ultimaMensagem = mensagensDoGrupo
        .slice()
        .sort((a, b) => {
          const dataA = new Date(a.created_at || 0).getTime()
          const dataB = new Date(b.created_at || 0).getTime()
          return dataB - dataA
        })[0]

      return {
        ...grupo,
        roteiro,
        guia,
        membros: membrosDoGrupo,
        mensagens: mensagensDoGrupo,
        roteiro_titulo: tituloRoteiro(roteiro),
        guia_nome: nomeUsuario(guia),
        total_membros: membrosDoGrupo.length,
        total_mensagens: mensagensDoGrupo.length,
        ultima_mensagem_em: ultimaMensagem?.created_at || null
      }
    })

    const ativos = gruposCompletos.filter(grupoAtivo)
    const pausados = gruposCompletos.filter(grupoPausado)
    const gruposVazios = gruposCompletos.filter((grupo) => Number(grupo.total_membros || 0) <= 1)
    const gruposComMembros = gruposCompletos.filter((grupo) => Number(grupo.total_membros || 0) > 1)

    setGrupos(gruposCompletos)

    setStats({
      total: gruposCompletos.length,
      ativos: ativos.length,
      pausados: pausados.length,
      gruposMes: gruposCompletos.filter((grupo) => dentroDoMesAtual(grupo.created_at)).length,
      membrosTotal: membros.length,
      mensagensTotal: mensagensLista.length,
      gruposVazios: gruposVazios.length,
      gruposComMembros: gruposComMembros.length
    })

    setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
  }

  const atualizar = async () => {
    setAtualizando(true)
    setMensagem('')
    setErro('')

    try {
      await carregarGrupos()
      setMensagem('Grupos atualizados.')
    } catch (error) {
      console.error('Erro ao atualizar grupos:', error)
      setErro('Não foi possível atualizar os grupos agora.')
    } finally {
      setAtualizando(false)
    }
  }

  const atualizarGrupoComFallback = async (
    grupoId: string,
    payloadOriginal: Record<string, any>
  ) => {
    let payloadAtual = { ...payloadOriginal }

    for (let tentativa = 0; tentativa < 12; tentativa++) {
      const { error } = await supabase
        .from('grupos_roteiros')
        .update(payloadAtual)
        .eq('id', grupoId)

      if (!error) return true

      if (!erroDeColunaAusente(error)) {
        throw error
      }

      const coluna = extrairColunaAusente(error)

      if (!coluna || !(coluna in payloadAtual)) {
        throw error
      }

      delete payloadAtual[coluna]
    }

    throw new Error('Não foi possível atualizar o grupo.')
  }

  const alternarStatusGrupo = async (grupo: GrupoCompleto) => {
    if (!grupo?.id) return

    const ativoAgora = grupoAtivo(grupo)
    const novoStatus = ativoAgora ? 'pausado' : 'ativo'

    setAlterandoStatusId(grupo.id)
    setMensagem('')
    setErro('')

    try {
      await atualizarGrupoComFallback(grupo.id, {
        status: novoStatus,
        ativo: !ativoAgora,
        updated_at: new Date().toISOString()
      })

      setMensagem(ativoAgora ? 'Grupo pausado com sucesso.' : 'Grupo ativado com sucesso.')
      await carregarGrupos()
    } catch (error: any) {
      console.error('Erro ao alternar status do grupo:', error)
      setErro(error?.message || 'Não foi possível alterar o status do grupo.')
    } finally {
      setAlterandoStatusId('')
    }
  }

  const copiarTexto = async (texto: string, label = 'Informação') => {
    try {
      await navigator.clipboard?.writeText(texto)
      setMensagem(`${label} copiado.`)
    } catch (error) {
      console.warn('Erro ao copiar:', error)
      setMensagem(`${label}: ${texto}`)
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

  const gruposFiltrados = useMemo(() => {
    const termo = normalizar(busca)

    return grupos.filter((grupo) => {
      const ativo = grupoAtivo(grupo)
      const totalMembros = Number(grupo.total_membros || 0)

      const passaStatus =
        filtroStatus === 'todos' ||
        (filtroStatus === 'ativos' && ativo) ||
        (filtroStatus === 'pausados' && !ativo) ||
        (filtroStatus === 'vazios' && totalMembros <= 1) ||
        (filtroStatus === 'com_membros' && totalMembros > 1)

      if (!passaStatus) return false

      if (!termo) return true

      const texto = normalizar(
        [
          grupo.id,
          grupo.roteiro_id,
          grupo.guia_id,
          grupo.titulo,
          grupo.nome,
          grupo.descricao,
          grupo.status,
          grupo.roteiro_titulo,
          grupo.guia_nome,
          localRoteiro(grupo.roteiro)
        ].join(' ')
      )

      return texto.includes(termo)
    })
  }, [grupos, busca, filtroStatus])

  const badgeStatus = (grupo: GrupoCompleto) => {
    if (grupoAtivo(grupo)) {
      return <span className="badge green">Ativo</span>
    }

    return <span className="badge yellow">Pausado</span>
  }

  const badgeMembros = (grupo: GrupoCompleto) => {
    const total = Number(grupo.total_membros || 0)

    if (total > 1) {
      return <span className="badge blue">{total} membros</span>
    }

    return <span className="badge neutral">Sem clientes</span>
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
          <div>Carregando grupos...</div>
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

        .groupList {
          display: grid;
          gap: 10px;
        }

        .groupCard {
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 22px;
          padding: 12px;
          display: grid;
          grid-template-columns: 74px minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          transition: 0.2s ease;
        }

        .groupCard:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
        }

        .thumb {
          width: 74px;
          height: 74px;
          border-radius: 20px;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-size: 12px;
          font-weight: 950;
          overflow: hidden;
        }

        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .groupTitle {
          color: #0f172a;
          font-size: 15px;
          font-weight: 950;
          line-height: 1.3;
        }

        .groupMeta {
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
          margin-top: 4px;
        }

        .groupFooter {
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

        .badge.yellow {
          background: #fef3c7;
          color: #92400e;
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

        .actionBtn:hover:not(:disabled) {
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

        .actionBtn.yellow {
          background: #fef3c7;
          color: #92400e;
          border-color: #fde68a;
        }

        .actionBtn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
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
          max-width: 520px;
          background: #ffffff;
          border-radius: 28px;
          box-shadow: 0 28px 90px rgba(15, 23, 42, 0.30);
          overflow: hidden;
          max-height: 90vh;
          overflow-y: auto;
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

        .btn.green {
          background: #dcfce7;
          color: #166534;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .detailGrid {
          display: grid;
          gap: 9px;
        }

        .detailRow {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          background: #f8fafc;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 16px;
          padding: 11px 12px;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
        }

        .detailRow strong {
          color: #0f172a;
          text-align: right;
        }

        .messageBox {
          background: #f8fafc;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 18px;
          padding: 12px;
          color: #475569;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
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

          .groupCard {
            grid-template-columns: 64px minmax(0, 1fr);
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

          .groupCard {
            grid-template-columns: 1fr;
          }

          .thumb {
            width: 100%;
            height: 150px;
          }

          .modalActions {
            display: grid;
          }

          .btn {
            width: 100%;
          }

          .detailRow {
            display: grid;
          }

          .detailRow strong {
            text-align: left;
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
              <div className="brandSub">Grupos internos</div>
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
              <div className="eyebrow">Comunidade por roteiro</div>

              <h1 className="heroTitle">
                Grupos internos com acesso pós-<span>pagamento.</span>
              </h1>

              <p className="heroText">
                Acompanhe os grupos criados automaticamente por roteiro, guias administradores, membros e movimentação das conversas.
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
              onClick={() => setFiltroStatus('ativos')}
            >
              <div className="heroLabel">Grupos ativos</div>
              <div className="heroValue">{stats.ativos}</div>
              <div className="heroSmall">
                {stats.total} grupo(s) criados · {stats.membrosTotal} vínculo(s) de membros · {stats.mensagensTotal} mensagem(ns).
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
            onClick={() => setFiltroStatus('todos')}
          >
            <div className="statIcon">💬</div>
            <div className="statValue">{stats.total}</div>
            <div className="statLabel">grupos criados por roteiro</div>
          </article>

          <article
            className="statCard"
            onClick={() => setFiltroStatus('ativos')}
          >
            <div className="statIcon">✅</div>
            <div className="statValue">{stats.ativos}</div>
            <div className="statLabel">grupos ativos</div>
          </article>

          <article
            className="statCard"
            onClick={() => setFiltroStatus('com_membros')}
          >
            <div className="statIcon">👥</div>
            <div className="statValue">{stats.gruposComMembros}</div>
            <div className="statLabel">grupos com clientes/membros</div>
          </article>

          <article
            className="statCard"
            onClick={() => setFiltroStatus('vazios')}
          >
            <div className="statIcon">🕊️</div>
            <div className="statValue">{stats.gruposVazios}</div>
            <div className="statLabel">grupos ainda sem clientes</div>
          </article>

          <article
            className="statCard"
            onClick={() => setFiltroStatus('todos')}
          >
            <div className="statIcon">✉️</div>
            <div className="statValue">{stats.mensagensTotal}</div>
            <div className="statLabel">mensagens registradas</div>
          </article>

          <article
            className="statCard"
            onClick={() => setFiltroStatus('todos')}
          >
            <div className="statIcon">📈</div>
            <div className="statValue">{stats.gruposMes}</div>
            <div className="statLabel">grupos criados neste mês</div>
          </article>
        </section>

        <section className="toolbar">
          <input
            className="input"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por roteiro, guia, grupo, local, status ou ID..."
          />

          <div className="filters">
            <button
              type="button"
              className={`filterBtn ${filtroStatus === 'todos' ? 'active' : ''}`}
              onClick={() => setFiltroStatus('todos')}
            >
              Todos
            </button>

            <button
              type="button"
              className={`filterBtn ${filtroStatus === 'ativos' ? 'active' : ''}`}
              onClick={() => setFiltroStatus('ativos')}
            >
              Ativos
            </button>

            <button
              type="button"
              className={`filterBtn ${filtroStatus === 'pausados' ? 'active' : ''}`}
              onClick={() => setFiltroStatus('pausados')}
            >
              Pausados
            </button>

            <button
              type="button"
              className={`filterBtn ${filtroStatus === 'com_membros' ? 'active' : ''}`}
              onClick={() => setFiltroStatus('com_membros')}
            >
              Com membros
            </button>

            <button
              type="button"
              className={`filterBtn ${filtroStatus === 'vazios' ? 'active' : ''}`}
              onClick={() => setFiltroStatus('vazios')}
            >
              Vazios
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2 className="panelTitle">Lista de grupos</h2>
              <div className="panelSub">
                {gruposFiltrados.length} grupo(s) encontrado(s) no filtro atual.
              </div>
            </div>

            <button
              type="button"
              className="textLink"
              onClick={atualizar}
              disabled={atualizando}
            >
              {atualizando ? 'Atualizando...' : 'Atualizar grupos'}
            </button>
          </div>

          <div className="panelBody">
            {gruposFiltrados.length === 0 ? (
              <div className="empty">
                Nenhum grupo encontrado com os filtros atuais.
              </div>
            ) : (
              <div className="groupList">
                {gruposFiltrados.map((grupo) => {
                  const imagem = imagemRoteiro(grupo.roteiro)

                  return (
                    <article className="groupCard" key={grupo.id}>
                      <div className="thumb">
                        {imagem ? (
                          <img src={imagem} alt={tituloRoteiro(grupo.roteiro)} />
                        ) : (
                          'GP'
                        )}
                      </div>

                      <div>
                        <div className="groupTitle">
                          {tituloGrupo(grupo)}
                        </div>

                        <div className="groupMeta">
                          Roteiro: {grupo.roteiro_titulo || 'Roteiro'} · Guia: {grupo.guia_nome || 'Guia'}
                          <br />
                          {localRoteiro(grupo.roteiro)} · criado em {formatarData(grupo.created_at)}
                          <br />
                          ID: {grupo.id.slice(0, 8)}
                        </div>

                        <div className="groupFooter">
                          {badgeStatus(grupo)}
                          {badgeMembros(grupo)}

                          <span className="badge neutral">
                            {grupo.total_mensagens || 0} mensagens
                          </span>

                          {grupo.ultima_mensagem_em && (
                            <span className="badge neutral">
                              último movimento {formatarData(grupo.ultima_mensagem_em)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="actions">
                        <button
                          type="button"
                          className="actionBtn primary"
                          onClick={() => setGrupoSelecionado(grupo)}
                        >
                          Detalhes
                        </button>

                        <button
                          type="button"
                          className={grupoAtivo(grupo) ? 'actionBtn yellow' : 'actionBtn green'}
                          onClick={() => alternarStatusGrupo(grupo)}
                          disabled={alterandoStatusId === grupo.id}
                        >
                          {alterandoStatusId === grupo.id
                            ? 'Atualizando...'
                            : grupoAtivo(grupo)
                              ? 'Pausar'
                              : 'Ativar'}
                        </button>

                        <button
                          type="button"
                          className="actionBtn"
                          onClick={() => copiarTexto(grupo.id, 'ID do grupo')}
                        >
                          Copiar ID
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {grupoSelecionado && (
        <div className="modalOverlay">
          <div className="modal">
            <div className="modalHeader">
              <h2 className="modalTitle">{tituloGrupo(grupoSelecionado)}</h2>
              <div className="modalSub">
                Detalhes administrativos do grupo interno.
              </div>
            </div>

            <div className="modalBody">
              <div className="detailGrid">
                <div className="detailRow">
                  <span>ID do grupo</span>
                  <strong>{grupoSelecionado.id}</strong>
                </div>

                <div className="detailRow">
                  <span>Roteiro</span>
                  <strong>{grupoSelecionado.roteiro_titulo || '-'}</strong>
                </div>

                <div className="detailRow">
                  <span>Guia administrador</span>
                  <strong>{grupoSelecionado.guia_nome || '-'}</strong>
                </div>

                <div className="detailRow">
                  <span>Status</span>
                  <strong>{grupoAtivo(grupoSelecionado) ? 'Ativo' : 'Pausado'}</strong>
                </div>

                <div className="detailRow">
                  <span>Membros</span>
                  <strong>{grupoSelecionado.total_membros || 0}</strong>
                </div>

                <div className="detailRow">
                  <span>Mensagens</span>
                  <strong>{grupoSelecionado.total_mensagens || 0}</strong>
                </div>

                <div className="detailRow">
                  <span>Criado em</span>
                  <strong>{formatarDataHora(grupoSelecionado.created_at)}</strong>
                </div>

                <div className="detailRow">
                  <span>Última mensagem</span>
                  <strong>{formatarDataHora(grupoSelecionado.ultima_mensagem_em)}</strong>
                </div>
              </div>

              <div className="messageBox">
                <strong>Últimas mensagens carregadas:</strong>
                <br />
                {grupoSelecionado.mensagens && grupoSelecionado.mensagens.length > 0 ? (
                  grupoSelecionado.mensagens.slice(0, 3).map((msg) => (
                    <div key={msg.id} style={{ marginTop: 8 }}>
                      {textoMensagem(msg) || 'Mensagem sem texto'} · {formatarDataHora(msg.created_at)}
                    </div>
                  ))
                ) : (
                  <span style={{ display: 'block', marginTop: 8 }}>
                    Nenhuma mensagem encontrada para este grupo.
                  </span>
                )}
              </div>

              <div className="modalActions">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => copiarTexto(grupoSelecionado.id, 'ID do grupo')}
                >
                  Copiar ID
                </button>

                <button
                  type="button"
                  className="btn green"
                  onClick={() => {
                    setGrupoSelecionado(null)
                    router.push('/admin/roteiros')
                  }}
                >
                  Ver roteiros
                </button>

                <button
                  type="button"
                  className="btn light"
                  onClick={() => setGrupoSelecionado(null)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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