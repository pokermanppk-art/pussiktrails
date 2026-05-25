'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

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
}

type MembroGrupo = {
  id: string
  grupo_id: string
  user_id: string
  reserva_id?: string | null
  papel?: string | null
  status?: string | null
  entrou_em?: string | null
  usuario_nome?: string
  usuario_email?: string
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
}

type UsuarioBanco = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
}

export default function ClienteGrupoPage() {
  const router = useRouter()
  const params = useParams()
  const iniciouRef = useRef(false)
  const fimMensagensRef = useRef<HTMLDivElement | null>(null)

  const grupoId = String(params?.grupoId || '')

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [grupo, setGrupo] = useState<GrupoRoteiro | null>(null)
  const [roteiro, setRoteiro] = useState<Roteiro | null>(null)
  const [membros, setMembros] = useState<MembroGrupo[]>([])
  const [mensagens, setMensagens] = useState<MensagemGrupo[]>([])

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
  }, [])

  useEffect(() => {
    if (!user?.id || !grupo?.id || !acessoLiberado) return

    const interval = setInterval(() => {
      carregarMensagens(grupo.id, false)
    }, 6000)

    return () => clearInterval(interval)
  }, [user?.id, grupo?.id, acessoLiberado])

  useEffect(() => {
    rolarParaFim()
  }, [mensagens.length])

  const iniciar = async () => {
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

      if (parsedUser.tipo !== 'cliente') {
        router.replace('/login')
        return
      }

      if (!grupoId) {
        setErro('Grupo não identificado.')
        return
      }

      setUser(parsedUser)
      await carregarGrupoCompleto(parsedUser.id)
    } catch (error) {
      console.error('Erro ao iniciar grupo do cliente:', error)
      setErro('Não foi possível carregar o grupo agora.')
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

  const nomeUsuario = (usuario?: UsuarioLocal | null) => {
    return usuario?.nome || usuario?.name || usuario?.email || 'Cliente'
  }

  const nomeBanco = (usuario?: UsuarioBanco | null) => {
    return usuario?.nome || usuario?.name || usuario?.email || 'Participante'
  }

  const iniciais = (nome?: string | null) => {
    const partes = String(nome || 'Participante')
      .trim()
      .split(' ')
      .filter(Boolean)

    const primeira = partes[0]?.[0] || 'P'
    const segunda = partes.length > 1 ? partes[partes.length - 1]?.[0] : ''

    return `${primeira}${segunda}`.toUpperCase()
  }

  const tituloRoteiro = (item?: Roteiro | null) => {
    return item?.titulo || item?.nome || 'Roteiro'
  }

  const imagemRoteiro = (item?: Roteiro | null) => {
    return item?.foto_capa || item?.foto_url || item?.imagem_url || item?.imagem || ''
  }

  const localRoteiro = (item?: Roteiro | null) => {
    return (
      item?.local ||
      item?.localizacao ||
      item?.local_encontro ||
      item?.ponto_encontro ||
      'Local a confirmar'
    )
  }

  const dataRoteiro = (item?: Roteiro | null) => {
    return item?.data_roteiro || item?.data_saida || item?.data || null
  }

  const horaRoteiro = (item?: Roteiro | null) => {
    return item?.hora_roteiro || item?.hora_saida || item?.hora || ''
  }

  const formatarData = (valor?: string | null) => {
    if (!valor) return '-'

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return valor

    return data.toLocaleDateString('pt-BR')
  }

  const formatarHora = (valor?: string | null) => {
    if (!valor) return ''

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return ''

    return data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const carregarGrupoCompleto = async (userId: string) => {
    const { data: grupoData, error: grupoError } = await supabase
      .from('grupos_roteiros')
      .select('*')
      .eq('id', grupoId)
      .maybeSingle()

    if (grupoError) {
      console.error('Erro ao buscar grupo:', grupoError)
      setErro('Não foi possível localizar o grupo.')
      return
    }

    if (!grupoData?.id) {
      setErro('Grupo não encontrado.')
      return
    }

    const grupoAtual = grupoData as GrupoRoteiro
    setGrupo(grupoAtual)

    if (normalizar(grupoAtual.status) !== 'ativo') {
      setErro('Este grupo não está ativo no momento.')
      return
    }

    const { data: membroData, error: membroError } = await supabase
      .from('grupo_membros')
      .select('*')
      .eq('grupo_id', grupoAtual.id)
      .eq('user_id', userId)
      .eq('status', 'ativo')
      .maybeSingle()

    if (membroError) {
      console.error('Erro ao validar membro:', membroError)
      setErro('Não foi possível validar seu acesso ao grupo.')
      return
    }

    if (!membroData?.id) {
      setErro('Seu acesso a este grupo ainda não está liberado. Ele é ativado após a confirmação do pagamento da reserva.')
      setAcessoLiberado(false)
      return
    }

    setAcessoLiberado(true)

    if (grupoAtual.roteiro_id) {
      const { data: roteiroData, error: roteiroError } = await supabase
        .from('roteiros')
        .select('*')
        .eq('id', grupoAtual.roteiro_id)
        .maybeSingle()

      if (!roteiroError && roteiroData) {
        setRoteiro(roteiroData as Roteiro)
      }
    }

    await carregarMembros(grupoAtual.id)
    await carregarMensagens(grupoAtual.id, true)
    setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
  }

  const carregarMembros = async (idGrupo: string) => {
    const { data, error } = await supabase
      .from('grupo_membros')
      .select('*')
      .eq('grupo_id', idGrupo)
      .eq('status', 'ativo')
      .order('entrou_em', { ascending: true })

    if (error) {
      console.warn('Erro ao buscar membros:', error)
      setMembros([])
      return
    }

    const membrosBase = (data || []) as MembroGrupo[]

    const userIds = Array.from(
      new Set(
        membrosBase
          .map((membro) => membro.user_id)
          .filter(Boolean)
      )
    )

    let usuarios: UsuarioBanco[] = []

    if (userIds.length > 0) {
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('users')
        .select('id, nome, name, email')
        .in('id', userIds)

      if (!usuariosError) {
        usuarios = (usuariosData || []) as UsuarioBanco[]
      }
    }

    const membrosComUsuario = membrosBase.map((membro) => {
      const usuario = usuarios.find((item) => item.id === membro.user_id)

      return {
        ...membro,
        usuario_nome: nomeBanco(usuario),
        usuario_email: usuario?.email || ''
      }
    })

    setMembros(membrosComUsuario)
  }

  const carregarMensagens = async (idGrupo: string, mostrarAviso = false) => {
    const { data, error } = await supabase
      .from('grupo_mensagens')
      .select('*')
      .eq('grupo_id', idGrupo)
      .eq('status', 'ativa')
      .order('created_at', { ascending: true })
      .limit(200)

    if (error) {
      console.warn('Erro ao buscar mensagens:', error)

      if (mostrarAviso) {
        setAviso('Não foi possível carregar as mensagens agora.')
      }

      return
    }

    const mensagensBase = (data || []) as MensagemGrupo[]

    const userIds = Array.from(
      new Set(
        mensagensBase
          .map((mensagem) => mensagem.user_id)
          .filter(Boolean) as string[]
      )
    )

    let usuarios: UsuarioBanco[] = []

    if (userIds.length > 0) {
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('users')
        .select('id, nome, name, email')
        .in('id', userIds)

      if (!usuariosError) {
        usuarios = (usuariosData || []) as UsuarioBanco[]
      }
    }

    const mensagensComUsuario = mensagensBase.map((mensagem) => {
      const usuario = usuarios.find((item) => item.id === mensagem.user_id)

      return {
        ...mensagem,
        usuario_nome: mensagem.user_id ? nomeBanco(usuario) : 'Sistema'
      }
    })

    setMensagens(mensagensComUsuario)
    setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
  }

  const rolarParaFim = () => {
    setTimeout(() => {
      fimMensagensRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      })
    }, 80)
  }

  const enviarMensagem = async (event: FormEvent) => {
    event.preventDefault()

    if (!user?.id || !grupo?.id || !acessoLiberado) return

    const texto = mensagemTexto.trim()

    if (!texto) return

    setEnviando(true)
    setErro('')
    setAviso('')

    try {
      const { error } = await supabase
        .from('grupo_mensagens')
        .insert({
          grupo_id: grupo.id,
          user_id: user.id,
          mensagem: texto,
          tipo: 'texto',
          status: 'ativa',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Erro ao enviar mensagem:', error)
        setErro('Não foi possível enviar a mensagem.')
        return
      }

      setMensagemTexto('')
      await carregarMensagens(grupo.id, false)
    } catch (error) {
      console.error('Erro inesperado ao enviar mensagem:', error)
      setErro('Erro ao enviar mensagem.')
    } finally {
      setEnviando(false)
    }
  }

  const mensagemEhMinha = (mensagem: MensagemGrupo) => {
    return !!user?.id && mensagem.user_id === user.id
  }

  const mensagemEhSistema = (mensagem: MensagemGrupo) => {
    return mensagem.tipo === 'sistema'
  }

  const mensagemEhAvisoGuia = (mensagem: MensagemGrupo) => {
    return mensagem.tipo === 'aviso_guia'
  }

  if (carregando) {
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
              radial-gradient(circle at top left, rgba(132, 204, 22, 0.18), transparent 30%),
              linear-gradient(180deg, #fffdf7 0%, #eef2e5 100%);
            color: #374151;
          }

          .loadingCard {
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.06);
            border-radius: 30px;
            padding: 28px;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
            text-align: center;
          }

          .loadingCard img {
            height: 68px;
            width: auto;
            margin-bottom: 12px;
          }
        `}</style>

        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>Abrindo grupo da aventura...</div>
        </div>
      </main>
    )
  }

  const foto = imagemRoteiro(roteiro)

  return (
    <main className="page">
      <style>{`
        * {
          box-sizing: border-box;
        }

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
            radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.16), transparent 28%),
            radial-gradient(circle at 90% 10%, rgba(251, 146, 60, 0.14), transparent 28%),
            linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
          color: #172018;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(255, 253, 247, 0.86);
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(18px);
          padding: 10px 16px;
        }

        .headerInner {
          max-width: 1180px;
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
          object-fit: contain;
          display: block;
        }

        .brandTitle {
          font-size: 18px;
          font-weight: 950;
          color: #dc2626;
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .brandSub {
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          margin-top: 3px;
        }

        .headerActions {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .iconBtn {
          height: 38px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(255,255,255,0.78);
          border-radius: 999px;
          padding: 0 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          font-weight: 900;
          transition: 0.2s ease;
          color: #172018;
          white-space: nowrap;
        }

        .iconBtn.primary {
          background: #172018;
          color: #ffffff;
          border-color: #172018;
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
          min-height: 280px;
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
          grid-template-columns: minmax(0, 1fr) 260px;
          gap: 22px;
          align-items: end;
          min-height: 220px;
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
          font-size: 28px;
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
          font-weight: 800;
          line-height: 1.45;
        }

        .alert.info {
          background: #ecfdf5;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .alert.error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .blocked {
          background: rgba(255,255,255,0.88);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 32px;
          padding: 26px;
          text-align: center;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
        }

        .blockedIcon {
          width: 64px;
          height: 64px;
          border-radius: 24px;
          background: #fef3c7;
          color: #92400e;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px;
          font-size: 28px;
        }

        .blocked h2 {
          margin: 0;
          color: #172018;
          font-size: 26px;
          font-weight: 950;
          letter-spacing: -0.05em;
        }

        .blocked p {
          color: #64748b;
          font-size: 14px;
          line-height: 1.6;
          font-weight: 700;
          max-width: 560px;
          margin: 10px auto 18px;
        }

        .mainGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 330px;
          gap: 16px;
          align-items: start;
        }

        .chatPanel,
        .sidePanel {
          background: rgba(255,255,255,0.88);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 32px;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
          overflow: hidden;
        }

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

        .messageWrap {
          display: flex;
          margin-bottom: 12px;
        }

        .messageWrap.mine {
          justify-content: flex-end;
        }

        .messageWrap.other {
          justify-content: flex-start;
        }

        .messageWrap.system {
          justify-content: center;
        }

        .bubble {
          max-width: min(74%, 620px);
          border-radius: 22px;
          padding: 11px 13px;
          font-size: 13px;
          line-height: 1.45;
          font-weight: 700;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
        }

        .bubble.mine {
          background: #16a34a;
          color: #ffffff;
          border-bottom-right-radius: 8px;
        }

        .bubble.other {
          background: #ffffff;
          color: #172018;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-bottom-left-radius: 8px;
        }

        .bubble.system {
          background: #eef2e5;
          color: #64748b;
          border-radius: 999px;
          max-width: 88%;
          text-align: center;
          font-size: 12px;
          box-shadow: none;
        }

        .bubble.notice {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        }

        .messageName {
          font-size: 11px;
          font-weight: 950;
          opacity: 0.78;
          margin-bottom: 4px;
        }

        .messageTime {
          font-size: 10px;
          opacity: 0.72;
          margin-top: 5px;
          text-align: right;
        }

        .composer {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          padding: 14px;
          border-top: 1px solid rgba(15, 23, 42, 0.06);
          background: rgba(255,255,255,0.90);
        }

        .composerInput {
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

        .composerInput:focus {
          border-color: #84cc16;
          box-shadow: 0 0 0 4px rgba(132, 204, 22, 0.12);
        }

        .sendBtn,
        .btn {
          border: none;
          border-radius: 999px;
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .sendBtn {
          background: #172018;
          color: #ffffff;
        }

        .sendBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn.primary {
          background: #172018;
          color: #ffffff;
        }

        .btn.light {
          background: #eef2e5;
          color: #475569;
        }

        .sideBody {
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

        .roteiroImage img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

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

        .memberList {
          display: grid;
          gap: 9px;
        }

        .member {
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

        .memberName {
          color: #172018;
          font-size: 13px;
          font-weight: 950;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .memberRole {
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          margin-top: 2px;
        }

        @media (max-width: 1040px) {
          .mainGrid,
          .heroContent {
            grid-template-columns: 1fr;
          }

          .chatBody {
            height: 520px;
          }
        }

        @media (max-width: 720px) {
          .header {
            padding: 9px 12px;
          }

          .brandTitle,
          .brandSub {
            display: none;
          }

          .headerActions .hideMobile {
            display: none;
          }

          .container {
            padding: 16px 12px 42px;
          }

          .hero,
          .chatPanel,
          .sidePanel {
            border-radius: 28px;
          }

          .hero {
            padding: 22px;
            min-height: auto;
          }

          .heroContent {
            min-height: auto;
          }

          .chatBody {
            height: 480px;
            padding: 14px;
          }

          .bubble {
            max-width: 88%;
          }

          .composer {
            grid-template-columns: 1fr;
          }

          .sendBtn {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .heroTitle {
            font-size: 38px;
          }

          .brand img {
            height: 38px;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <div
            className="brand"
            onClick={() => router.push('/cliente/dashboard')}
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />

            <div>
              <div className="brandTitle">PrussikTrails</div>
              <div className="brandSub">Grupo do roteiro</div>
            </div>
          </div>

          <div className="headerActions">
            <button
              type="button"
              className="iconBtn hideMobile"
              onClick={() => router.push('/cliente/minhas-reservas')}
            >
              Reservas
            </button>

            <button
              type="button"
              className="iconBtn primary"
              onClick={() => router.push('/cliente/perfil')}
            >
              Perfil
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroContent">
            <div>
              <div className="eyebrow">Grupo da aventura</div>

              <h1 className="heroTitle">
                {tituloRoteiro(roteiro)}
                <br />
                <span>Agora começa a preparação.</span>
              </h1>

              <p className="heroText">
                Este é o grupo interno do seu roteiro. Aqui o guia poderá enviar orientações,
                avisos e informações importantes para a experiência.
              </p>
            </div>

            <aside className="heroCard">
              <div className="heroCardLabel">Participantes</div>
              <div className="heroCardValue">{membros.length}</div>
              <div className="heroCardText">
                {ultimaAtualizacao
                  ? `Atualizado às ${ultimaAtualizacao}.`
                  : 'Grupo interno do roteiro.'}
              </div>
            </aside>
          </div>
        </section>

        {erro && (
          <div className="alert error">{erro}</div>
        )}

        {aviso && (
          <div className="alert info">{aviso}</div>
        )}

        {!acessoLiberado ? (
          <section className="blocked">
            <div className="blockedIcon">🔒</div>
            <h2>Acesso ainda não liberado</h2>
            <p>
              O grupo do roteiro é liberado automaticamente depois que o pagamento da reserva
              é confirmado pelo sistema.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn primary"
                onClick={() => router.push('/cliente/minhas-reservas')}
              >
                Voltar para reservas
              </button>

              <button
                type="button"
                className="btn light"
                onClick={() => router.push('/roteiros')}
              >
                Explorar roteiros
              </button>
            </div>
          </section>
        ) : (
          <section className="mainGrid">
            <div className="chatPanel">
              <div className="panelHeader">
                <div>
                  <h2 className="panelTitle">
                    {grupo?.titulo || 'Grupo do roteiro'}
                  </h2>
                  <div className="panelSub">
                    Mensagens e orientações do grupo.
                  </div>
                </div>
              </div>

              <div className="chatBody">
                {grupo?.aviso_fixado && (
                  <div className="messageWrap system">
                    <div className="bubble notice">
                      <strong>Aviso do guia:</strong> {grupo.aviso_fixado}
                    </div>
                  </div>
                )}

                {mensagens.length === 0 ? (
                  <div className="messageWrap system">
                    <div className="bubble system">
                      O grupo foi criado. As mensagens aparecerão aqui.
                    </div>
                  </div>
                ) : (
                  mensagens.map((mensagem) => {
                    if (mensagemEhSistema(mensagem)) {
                      return (
                        <div className="messageWrap system" key={mensagem.id}>
                          <div className="bubble system">
                            {mensagem.mensagem}
                          </div>
                        </div>
                      )
                    }

                    const minha = mensagemEhMinha(mensagem)
                    const avisoGuia = mensagemEhAvisoGuia(mensagem)

                    return (
                      <div
                        className={`messageWrap ${minha ? 'mine' : 'other'}`}
                        key={mensagem.id}
                      >
                        <div
                          className={`bubble ${minha ? 'mine' : 'other'} ${avisoGuia ? 'notice' : ''}`}
                        >
                          {!minha && (
                            <div className="messageName">
                              {mensagem.usuario_nome || 'Participante'}
                            </div>
                          )}

                          <div>{mensagem.mensagem}</div>

                          <div className="messageTime">
                            {formatarHora(mensagem.created_at)}
                          </div>
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

                <button
                  type="submit"
                  className="sendBtn"
                  disabled={enviando || !mensagemTexto.trim()}
                >
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
                  {foto ? (
                    <img src={foto} alt={tituloRoteiro(roteiro)} />
                  ) : (
                    'Roteiro'
                  )}
                </div>

                <div className="infoCard">
                  <div className="infoLabel">Local</div>
                  <div className="infoValue">{localRoteiro(roteiro)}</div>
                </div>

                <div className="infoCard">
                  <div className="infoLabel">Data e hora</div>
                  <div className="infoValue">
                    {formatarData(dataRoteiro(roteiro))}
                    {horaRoteiro(roteiro) ? ` · ${horaRoteiro(roteiro)}` : ''}
                  </div>
                </div>

                <div className="infoCard">
                  <div className="infoLabel">Participantes</div>

                  <div className="memberList" style={{ marginTop: 10 }}>
                    {membros.map((membro) => (
                      <div className="member" key={membro.id}>
                        <div className="avatar">
                          {iniciais(membro.usuario_nome)}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div className="memberName">
                            {membro.usuario_nome || 'Participante'}
                          </div>

                          <div className="memberRole">
                            {membro.papel === 'guia_admin'
                              ? 'Guia administrador'
                              : 'Cliente confirmado'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn light"
                  onClick={() => router.push('/cliente/minhas-reservas')}
                >
                  Voltar para reservas
                </button>
              </div>
            </aside>
          </section>
        )}
      </div>
    </main>
  )
}