'use client'

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react'
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
  km?: number | null
  distancia_km?: number | null
  preco?: number | null
  valor?: number | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  local?: string | null
  localizacao?: string | null
  id_guia?: string | null
  guia_id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  status?: string | null
}

type Reserva = {
  id: string
  roteiro_id?: string | null
  cliente_id?: string | null
  status?: string | null
  pagamento_status?: string | null
  valor_total?: number | null
  created_at?: string | null
}

type Avaliacao = {
  id: string
  nota?: number | null
  comentario?: string | null
  observacao?: string | null
  descricao?: string | null
  cliente_id?: string | null
  cliente_nome?: string | null
  cliente_avatar?: string | null
  created_at?: string | null
  [key: string]: any
}

type Stats = {
  totalRoteiros: number
  totalReservas: number
  reservasConfirmadas: number
  totalClientes: number
  totalKm: number
  avaliacaoMedia: number
  totalAvaliacoes: number
}

const statsInicial: Stats = {
  totalRoteiros: 0,
  totalReservas: 0,
  reservasConfirmadas: 0,
  totalClientes: 0,
  totalKm: 0,
  avaliacaoMedia: 0,
  totalAvaliacoes: 0
}

const PIX_TIPOS = [
  { value: '', label: 'Selecione o tipo da chave' },
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'aleatoria', label: 'Chave aleatória' }
]

const METAS_KM_GUIA = [
  { km: 32, nome: 'Bronze', icone: '🥉' },
  { km: 96, nome: 'Prata', icone: '🥈' },
  { km: 192, nome: 'Ouro', icone: '🥇' },
  { km: 384, nome: 'Platina', icone: '💎' },
  { km: 768, nome: 'Elite', icone: '⚡' },
  { km: 1152, nome: 'Master', icone: '👑' },
  { km: 1920, nome: 'Lenda', icone: '🌟' },
  { km: 3840, nome: 'Lenda Absoluta', icone: '🔥' }
]

export default function PerfilGuiaPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [guia, setGuia] = useState<any>(null)

  const [bio, setBio] = useState('')
  const [editandoBio, setEditandoBio] = useState(false)

  const [pixTipo, setPixTipo] = useState('')
  const [pixChave, setPixChave] = useState('')
  const [cadastur, setCadastur] = useState('')

  const [avatarPreview, setAvatarPreview] = useState('')
  const [enviandoAvatar, setEnviandoAvatar] = useState(false)

  const [stats, setStats] = useState<Stats>(statsInicial)
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])

  const [carregando, setCarregando] = useState(true)
  const [salvandoBio, setSalvandoBio] = useState(false)
  const [salvandoDados, setSalvandoDados] = useState(false)

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
      await carregarDados(parsedUser.id)
    } catch (error) {
      console.error('Erro ao iniciar perfil do guia:', error)
      setErro('Não foi possível carregar seu perfil agora.')
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

  const pagamentoConfirmado = (reserva: Reserva) => {
    const pagamento = normalizar(reserva.pagamento_status)
    const status = normalizar(reserva.status)

    return (
      pagamento === 'pago' ||
      pagamento === 'confirmado' ||
      pagamento === 'aprovado' ||
      pagamento === 'paid' ||
      pagamento === 'approved' ||
      status === 'confirmada' ||
      status === 'realizada' ||
      status === 'pago' ||
      status === 'paga'
    )
  }

  const formatarMoeda = (valor: any) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(valor || 0))
  }

  const formatarData = (valor?: string | null) => {
    if (!valor) return ''

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return ''

    return data.toLocaleDateString('pt-BR')
  }

  const nomeGuia = () => {
    return guia?.nome || user?.nome || user?.email || 'Guia PrussikTrails'
  }

  const avatarGuia = () => {
    return (
      avatarPreview ||
      guia?.avatar_url ||
      guia?.foto_url ||
      guia?.imagem_url ||
      ''
    )
  }

  const fotoRoteiro = (roteiro: Roteiro) => {
    return roteiro.foto_capa || roteiro.foto_url || roteiro.imagem_url || ''
  }

  const valorRoteiro = (roteiro: Roteiro) => {
    return Number(roteiro.preco || roteiro.valor || 0)
  }

  const kmRoteiro = (roteiro: Roteiro) => {
    return Number(roteiro.km || roteiro.distancia_km || 0)
  }

  const getNivelPorKm = (km: number) => {
    for (let i = METAS_KM_GUIA.length - 1; i >= 0; i--) {
      if (km >= METAS_KM_GUIA[i].km) return METAS_KM_GUIA[i]
    }

    return METAS_KM_GUIA[0]
  }

  const calcularProximoMarcoKm = (km: number) => {
    for (const meta of METAS_KM_GUIA) {
      if (km < meta.km) return meta.km
    }

    return METAS_KM_GUIA[METAS_KM_GUIA.length - 1].km
  }

  const calcularMarcoAnteriorKm = (km: number) => {
    let anterior = 0

    for (const meta of METAS_KM_GUIA) {
      if (km >= meta.km) anterior = meta.km
    }

    return anterior
  }

  const calcularProgressoKm = (km: number) => {
    const proximo = calcularProximoMarcoKm(km)
    const anterior = calcularMarcoAnteriorKm(km)

    if (proximo <= anterior) return 100

    return Math.max(0, Math.min(((km - anterior) / (proximo - anterior)) * 100, 100))
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

  const atualizarUsuarioComFallback = async (
    userId: string,
    payloadOriginal: Record<string, any>
  ) => {
    let payloadAtual = { ...payloadOriginal }

    for (let tentativa = 0; tentativa < 12; tentativa++) {
      const { data, error } = await supabase
        .from('users')
        .update(payloadAtual)
        .eq('id', userId)
        .select('*')
        .maybeSingle()

      if (!error) return data

      if (!erroDeColunaAusente(error)) throw error

      const coluna = extrairColunaAusente(error)

      if (!coluna || !(coluna in payloadAtual)) throw error

      delete payloadAtual[coluna]
    }

    throw new Error('Não foi possível atualizar o perfil após ajustar colunas.')
  }

  const buscarRoteirosDoGuia = async (guiaId: string) => {
    const campos = ['id_guia', 'guia_id', 'user_id', 'usuario_id']
    const mapa = new Map<string, Roteiro>()

    for (const campo of campos) {
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .eq(campo, guiaId)

      if (!error && data) {
        ;(data as Roteiro[]).forEach((roteiro) => {
          if (roteiro?.id) mapa.set(roteiro.id, roteiro)
        })
      }
    }

    return Array.from(mapa.values())
  }

  const buscarAvaliacoesDoGuia = async (guiaId: string) => {
    const campos = ['guia_id', 'id_guia']
    let lista: Avaliacao[] = []

    for (const campo of campos) {
      const { data, error } = await supabase
        .from('avaliacoes')
        .select('*')
        .eq(campo, guiaId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        lista = data as Avaliacao[]
        break
      }
    }

    const clienteIds = Array.from(
      new Set(
        lista
          .map((avaliacao) => avaliacao.cliente_id)
          .filter(Boolean) as string[]
      )
    )

    if (clienteIds.length === 0) return lista

    const { data: clientes } = await supabase
      .from('users')
      .select('id, nome, email, avatar_url')
      .in('id', clienteIds)

    return lista.map((avaliacao) => {
      const cliente = (clientes || []).find((item: any) => item.id === avaliacao.cliente_id)

      return {
        ...avaliacao,
        cliente_nome: cliente?.nome || cliente?.email || 'Cliente',
        cliente_avatar: cliente?.avatar_url || ''
      }
    })
  }

  const carregarDados = async (guiaId: string) => {
    try {
      const { data: guiaData, error: guiaError } = await supabase
        .from('users')
        .select('*')
        .eq('id', guiaId)
        .maybeSingle()

      if (guiaError) {
        console.warn('Erro ao buscar guia:', guiaError)
      }

      if (guiaData) {
        setGuia(guiaData)
        setBio(guiaData.bio_guia || guiaData.bio || '')
        setPixTipo(guiaData.pix_tipo || '')
        setPixChave(guiaData.pix_chave || '')
        setCadastur(guiaData.cadastur || '')
        setAvatarPreview(guiaData.avatar_url || guiaData.foto_url || guiaData.imagem_url || '')
      }

      const roteirosDoGuia = await buscarRoteirosDoGuia(guiaId)
      setRoteiros(roteirosDoGuia)

      const roteiroIds = roteirosDoGuia.map((roteiro) => roteiro.id).filter(Boolean)

      let reservas: Reserva[] = []

      if (roteiroIds.length > 0) {
        const { data: reservasData, error: reservasError } = await supabase
          .from('reservas')
          .select('*')
          .in('roteiro_id', roteiroIds)

        if (reservasError) {
          console.warn('Erro ao buscar reservas do guia:', reservasError)
        } else {
          reservas = (reservasData || []) as Reserva[]
        }
      }

      const avaliacoesDoGuia = await buscarAvaliacoesDoGuia(guiaId)
      setAvaliacoes(avaliacoesDoGuia)

      const totalKm = roteirosDoGuia.reduce(
        (total, roteiro) => total + kmRoteiro(roteiro),
        0
      )

      const reservasConfirmadas = reservas.filter(pagamentoConfirmado)

      const clientesUnicos = new Set(
        reservas
          .map((reserva) => reserva.cliente_id)
          .filter(Boolean)
      )

      const avaliacaoMedia =
        avaliacoesDoGuia.length > 0
          ? avaliacoesDoGuia.reduce((total, avaliacao) => total + Number(avaliacao.nota || 0), 0) / avaliacoesDoGuia.length
          : 0

      setStats({
        totalRoteiros: roteirosDoGuia.length,
        totalReservas: reservas.length,
        reservasConfirmadas: reservasConfirmadas.length,
        totalClientes: clientesUnicos.size,
        totalKm,
        avaliacaoMedia,
        totalAvaliacoes: avaliacoesDoGuia.length
      })
    } catch (error) {
      console.error('Erro ao carregar dados do perfil:', error)
      setErro('Não foi possível carregar todos os dados do perfil.')
    }
  }

  const salvarBio = async () => {
    if (!user?.id) return

    setSalvandoBio(true)
    setErro('')
    setMensagem('')

    try {
      const atualizado = await atualizarUsuarioComFallback(user.id, {
        bio_guia: bio,
        bio,
        updated_at: new Date().toISOString()
      })

      setGuia((prev: any) => ({
        ...prev,
        ...(atualizado || {}),
        bio_guia: bio,
        bio
      }))

      setEditandoBio(false)
      setMensagem('Biografia atualizada com sucesso.')
    } catch (error: any) {
      console.error('Erro ao salvar bio:', error)
      setErro(error?.message || 'Não foi possível salvar a biografia.')
    } finally {
      setSalvandoBio(false)
      setTimeout(() => setMensagem(''), 2800)
    }
  }

  const salvarDadosPrivados = async () => {
    if (!user?.id) return

    setSalvandoDados(true)
    setErro('')
    setMensagem('')

    try {
      const atualizado = await atualizarUsuarioComFallback(user.id, {
        pix_tipo: pixTipo || null,
        pix_chave: pixChave || null,
        cadastur: cadastur || null,
        updated_at: new Date().toISOString()
      })

      setGuia((prev: any) => ({
        ...prev,
        ...(atualizado || {}),
        pix_tipo: pixTipo,
        pix_chave: pixChave,
        cadastur
      }))

      setMensagem('Dados do guia atualizados com sucesso.')
    } catch (error: any) {
      console.error('Erro ao salvar dados privados:', error)
      setErro(error?.message || 'Não foi possível salvar os dados do guia.')
    } finally {
      setSalvandoDados(false)
      setTimeout(() => setMensagem(''), 2800)
    }
  }

  const uploadAvatar = async (file: File) => {
    if (!user?.id) return

    setEnviandoAvatar(true)
    setErro('')
    setMensagem('')

    try {
      const extensao = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const caminho = `guias/${user.id}/avatar-${Date.now()}.${extensao}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(caminho, file, {
          upsert: true,
          contentType: file.type || 'image/jpeg'
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(caminho)

      const publicUrl = data?.publicUrl || ''

      if (!publicUrl) {
        throw new Error('Não foi possível gerar a URL pública da foto.')
      }

      await atualizarUsuarioComFallback(user.id, {
        avatar_url: publicUrl,
        foto_url: publicUrl,
        imagem_url: publicUrl,
        updated_at: new Date().toISOString()
      })

      setAvatarPreview(publicUrl)
      setGuia((prev: any) => ({
        ...prev,
        avatar_url: publicUrl,
        foto_url: publicUrl,
        imagem_url: publicUrl
      }))

      setMensagem('Foto de perfil atualizada com sucesso.')
    } catch (error: any) {
      console.error('Erro ao enviar avatar:', error)
      setErro(
        error?.message?.includes('Bucket not found')
          ? 'O bucket avatars ainda não existe no Supabase Storage.'
          : error?.message || 'Não foi possível atualizar a foto.'
      )
    } finally {
      setEnviandoAvatar(false)
      setTimeout(() => setMensagem(''), 2800)
    }
  }

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    await uploadAvatar(file)

    event.target.value = ''
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

  const nivelAtual = getNivelPorKm(stats.totalKm)
  const proximoMarco = calcularProximoMarcoKm(stats.totalKm)
  const progressoKm = calcularProgressoKm(stats.totalKm)

  const conquistasKm = [
    { nome: 'Primeira trilha', icone: '🥾', km: 0, desbloqueado: stats.totalKm >= 0 },
    { nome: 'Explorador', icone: '🌱', km: 32, desbloqueado: stats.totalKm >= 32 },
    { nome: 'Caminhante', icone: '🚶', km: 96, desbloqueado: stats.totalKm >= 96 },
    { nome: 'Aventureiro', icone: '🧭', km: 384, desbloqueado: stats.totalKm >= 384 },
    { nome: 'Mestre', icone: '👑', km: 1152, desbloqueado: stats.totalKm >= 1152 },
    { nome: 'Lenda', icone: '🌟', km: 1920, desbloqueado: stats.totalKm >= 1920 },
    { nome: 'Lenda Absoluta', icone: '🔥', km: 3840, desbloqueado: stats.totalKm >= 3840 }
  ]

  const medalhas = [
    {
      nome: 'KM Guiados',
      icone: '👣',
      progresso: stats.totalKm,
      meta: 32,
      desbloqueado: stats.totalKm >= 32
    },
    {
      nome: 'Guias Avaliados',
      icone: '⭐',
      progresso: stats.totalAvaliacoes,
      meta: 5,
      desbloqueado: stats.totalAvaliacoes >= 5
    },
    {
      nome: 'Trilhas Guiadas',
      icone: '🥾',
      progresso: stats.totalRoteiros,
      meta: 1,
      desbloqueado: stats.totalRoteiros >= 1
    },
    {
      nome: 'Clientes Atendidos',
      icone: '👥',
      progresso: stats.totalClientes,
      meta: 5,
      desbloqueado: stats.totalClientes >= 5
    },
    {
      nome: 'Guia Pioneiro Beta',
      icone: '🏕️',
      progresso: guia?.medalha_guia_pioneiro_beta || guia?.guia_pioneiro_beta ? 1 : 0,
      meta: 1,
      desbloqueado: Boolean(guia?.medalha_guia_pioneiro_beta || guia?.guia_pioneiro_beta)
    }
  ]

  const principaisRoteiros = roteiros.slice(0, 3)

  if (carregando) {
    return (
      <main className="loading">
        <style>{`
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #f6f7f1;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
          <div>Carregando perfil do guia...</div>
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
          display: block;
          object-fit: contain;
        }

        .brandText {
          min-width: 0;
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

        .headerActions {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
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
          max-width: 1180px;
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
          grid-template-columns: 220px minmax(0,1fr) 280px;
          gap: 20px;
          align-items: end;
        }

        .avatarCard {
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 32px;
          padding: 14px;
          backdrop-filter: blur(14px);
          cursor: pointer;
          transition: 0.2s ease;
        }

        .avatarCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 38px rgba(0,0,0,0.18);
        }

        .avatarBox {
          height: 190px;
          border-radius: 26px;
          background: rgba(255,255,255,0.10);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.16);
        }

        .avatarBox img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .avatarFallback {
          width: 86px;
          height: 86px;
          border-radius: 999px;
          background: #bef264;
          color: #172018;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 34px;
          font-weight: 950;
        }

        .avatarHint {
          margin-top: 10px;
          color: rgba(255,255,255,0.82);
          font-size: 11px;
          font-weight: 850;
          text-align: center;
        }

        .fileInput {
          display: none;
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
          font-size: clamp(38px, 5.2vw, 68px);
          line-height: 0.92;
          font-weight: 950;
          letter-spacing: -0.085em;
        }

        .heroText {
          max-width: 620px;
          color: rgba(255,255,255,0.82);
          line-height: 1.6;
          margin: 14px 0 0;
          font-size: 14px;
          font-weight: 650;
        }

        .cadasturBadge {
          margin-top: 14px;
          display: inline-flex;
          border-radius: 999px;
          padding: 8px 12px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.18);
          color: #ffffff;
          font-size: 12px;
          font-weight: 950;
        }

        .progressHeroCard {
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 30px;
          padding: 18px;
          backdrop-filter: blur(14px);
        }

        .progressIcon {
          width: 62px;
          height: 62px;
          border-radius: 24px;
          background: rgba(190,242,100,0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
        }

        .progressTitle {
          margin-top: 12px;
          font-size: 26px;
          font-weight: 950;
          letter-spacing: -0.05em;
        }

        .progressSmall {
          color: rgba(255,255,255,0.76);
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
          margin-top: 6px;
        }

        .barOuter {
          margin-top: 12px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.18);
          overflow: hidden;
        }

        .barInner {
          height: 100%;
          border-radius: 999px;
          background: #bef264;
          width: ${progressoKm}%;
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

        .grid {
          display: grid;
          grid-template-columns: minmax(0,1fr) 360px;
          gap: 16px;
          align-items: start;
        }

        .stack {
          display: grid;
          gap: 16px;
        }

        .card {
          background: rgba(255,255,255,0.90);
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 30px;
          box-shadow: 0 12px 34px rgba(15,23,42,0.06);
          overflow: hidden;
        }

        .cardHeader {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(15,23,42,0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .cardTitle {
          margin: 0;
          color: #172018;
          font-size: 18px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .cardSub {
          margin-top: 3px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
        }

        .cardBody {
          padding: 18px;
        }

        .btn {
          border: none;
          border-radius: 999px;
          padding: 11px 14px;
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
          background: #eef2e5;
          color: #475569;
        }

        .textarea,
        .input,
        .select {
          width: 100%;
          border: 1px solid rgba(15,23,42,0.08);
          background: #fffdf7;
          border-radius: 18px;
          padding: 13px 14px;
          font-size: 14px;
          color: #172018;
          outline: none;
          font-weight: 750;
        }

        .textarea {
          min-height: 130px;
          resize: vertical;
          line-height: 1.55;
        }

        .textarea:focus,
        .input:focus,
        .select:focus {
          border-color: #84cc16;
          box-shadow: 0 0 0 4px rgba(132,204,22,0.12);
        }

        .bioText {
          color: #475569;
          font-size: 14px;
          line-height: 1.7;
          font-weight: 650;
          white-space: pre-wrap;
        }

        .formGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .field {
          display: grid;
          gap: 7px;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .label {
          color: #475569;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .helper {
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 700;
        }

        .benefitCard {
          background:
            radial-gradient(circle at top right, rgba(190,242,100,0.24), transparent 38%),
            #172018;
          color: #ffffff;
          border-radius: 30px;
          padding: 20px;
          box-shadow: 0 18px 42px rgba(23,32,24,0.16);
        }

        .benefitPill {
          display: inline-flex;
          border-radius: 999px;
          background: rgba(190,242,100,0.16);
          border: 1px solid rgba(190,242,100,0.22);
          color: #d9f99d;
          padding: 7px 10px;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }

        .benefitTitle {
          margin-top: 12px;
          font-size: 24px;
          font-weight: 950;
          line-height: 1.02;
          letter-spacing: -0.055em;
        }

        .benefitText {
          margin-top: 10px;
          color: rgba(255,255,255,0.78);
          font-size: 13px;
          line-height: 1.55;
          font-weight: 700;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 10px;
        }

        .statBox {
          background: #fffdf7;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 22px;
          padding: 14px;
        }

        .statIcon {
          font-size: 22px;
          margin-bottom: 8px;
        }

        .statValue {
          color: #172018;
          font-size: 22px;
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

        .achievementGrid,
        .medalGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 10px;
        }

        .achievement,
        .medal {
          background: #fffdf7;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 22px;
          padding: 14px;
          text-align: center;
          transition: 0.2s ease;
        }

        .achievement.locked,
        .medal.locked {
          opacity: 0.42;
          filter: grayscale(0.8);
        }

        .achievementIcon,
        .medalIcon {
          font-size: 28px;
          margin-bottom: 8px;
        }

        .achievementName,
        .medalName {
          color: #172018;
          font-size: 12px;
          font-weight: 950;
          line-height: 1.25;
        }

        .achievementMeta,
        .medalMeta {
          margin-top: 4px;
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
        }

        .timeline {
          display: grid;
          gap: 8px;
        }

        .timelineItem {
          display: grid;
          grid-template-columns: 64px minmax(0,1fr) auto;
          gap: 10px;
          align-items: center;
          background: #fffdf7;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 18px;
          padding: 10px;
        }

        .timelineKm {
          color: #172018;
          font-size: 13px;
          font-weight: 950;
        }

        .timelineName {
          color: #475569;
          font-size: 12px;
          font-weight: 850;
        }

        .timelineStatus {
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 10px;
          font-weight: 950;
          background: #eef2e5;
          color: #64748b;
        }

        .timelineStatus.ok {
          background: #dcfce7;
          color: #166534;
        }

        .reviewList {
          display: grid;
          gap: 10px;
        }

        .review {
          background: #fffdf7;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 22px;
          padding: 14px;
        }

        .reviewTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }

        .reviewName {
          color: #172018;
          font-size: 13px;
          font-weight: 950;
        }

        .stars {
          color: #f59e0b;
          font-size: 12px;
          font-weight: 950;
        }

        .reviewText {
          margin-top: 8px;
          color: #475569;
          font-size: 13px;
          line-height: 1.5;
          font-weight: 650;
        }

        .reviewDate {
          margin-top: 8px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 800;
        }

        .routeGrid {
          display: grid;
          gap: 10px;
        }

        .routeCard {
          display: grid;
          grid-template-columns: 86px minmax(0,1fr);
          gap: 12px;
          background: #fffdf7;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 22px;
          padding: 10px;
          cursor: pointer;
        }

        .routePhoto {
          height: 76px;
          border-radius: 18px;
          background: #eef2e5;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-size: 24px;
        }

        .routePhoto img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .routeTitle {
          color: #172018;
          font-size: 13px;
          font-weight: 950;
          line-height: 1.25;
        }

        .routeMeta {
          margin-top: 5px;
          color: #64748b;
          font-size: 11px;
          font-weight: 750;
          line-height: 1.35;
        }

        .routePrice {
          margin-top: 8px;
          color: #16a34a;
          font-size: 13px;
          font-weight: 950;
        }

        .empty {
          background: #fffdf7;
          border: 1px dashed rgba(15,23,42,0.14);
          border-radius: 22px;
          padding: 22px;
          color: #64748b;
          text-align: center;
          font-size: 13px;
          line-height: 1.5;
          font-weight: 750;
        }

        .actionRow {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          margin-top: 12px;
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

        .modalActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        @media (max-width: 1060px) {
          .heroGrid,
          .grid {
            grid-template-columns: 1fr;
          }

          .heroGrid {
            align-items: start;
          }

          .avatarCard {
            max-width: 240px;
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

          .hero,
          .card {
            border-radius: 28px;
          }

          .hero {
            padding: 20px;
          }

          .avatarBox {
            height: 170px;
          }

          .formGrid,
          .statsGrid,
          .achievementGrid,
          .medalGrid {
            grid-template-columns: 1fr 1fr;
          }

          .timelineItem {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .heroTitle {
            font-size: 38px;
          }

          .formGrid,
          .statsGrid,
          .achievementGrid,
          .medalGrid {
            grid-template-columns: 1fr;
          }

          .routeCard {
            grid-template-columns: 1fr;
          }

          .routePhoto {
            height: 150px;
          }

          .actionRow,
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
          <div className="brand" onClick={() => router.push('/guia/dashboard')}>
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />

            <div className="brandText">
              <div className="brandTitle">PrussikTrails</div>
              <div className="brandSub">Perfil do guia</div>
            </div>
          </div>

          <div className="headerActions">
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
            <div
              className="avatarCard"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="avatarBox">
                {avatarGuia() ? (
                  <img src={avatarGuia()} alt={nomeGuia()} />
                ) : (
                  <div className="avatarFallback">
                    {nomeGuia().slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="avatarHint">
                {enviandoAvatar ? 'Enviando foto...' : 'Clique para alterar sua foto'}
              </div>

              <input
                ref={fileInputRef}
                className="fileInput"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
              />
            </div>

            <div>
              <div className="eyebrow">Perfil privado do guia</div>

              <h1 className="heroTitle">
                {nomeGuia()}
              </h1>

              <p className="heroText">
                Organize sua presença como guia, acompanhe sua evolução, mantenha seus dados profissionais atualizados e fortaleça sua reputação dentro da comunidade PrussikTrails.
              </p>

              {cadastur ? (
                <div className="cadasturBadge">
                  CADASTUR: {cadastur}
                </div>
              ) : (
                <div className="cadasturBadge">
                  CADASTUR ainda não informado
                </div>
              )}
            </div>

            <aside className="progressHeroCard">
              <div className="progressIcon">{nivelAtual.icone}</div>
              <div className="progressTitle">{nivelAtual.nome}</div>
              <div className="progressSmall">
                {stats.totalKm.toFixed(1)} km guiados · próximo marco em {proximoMarco} km.
              </div>

              <div className="barOuter">
                <div className="barInner" />
              </div>
            </aside>
          </div>
        </section>

        {mensagem && <div className="alert success">{mensagem}</div>}
        {erro && <div className="alert error">{erro}</div>}

        <section className="grid">
          <div className="stack">
            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Bio do guia</h2>
                  <div className="cardSub">
                    Essa apresentação ajuda o cliente a entender seu estilo, sua experiência e sua forma de conduzir trilhas.
                  </div>
                </div>

                {!editandoBio && (
                  <button
                    type="button"
                    className="btn light"
                    onClick={() => setEditandoBio(true)}
                  >
                    Editar bio
                  </button>
                )}
              </div>

              <div className="cardBody">
                {editandoBio ? (
                  <>
                    <textarea
                      className="textarea"
                      value={bio}
                      onChange={(event) => setBio(event.target.value)}
                      placeholder="Conte quem você é, sua experiência, seu estilo de condução e o que os aventureiros podem esperar das suas trilhas."
                    />

                    <div className="actionRow">
                      <button
                        type="button"
                        className="btn green"
                        onClick={salvarBio}
                        disabled={salvandoBio}
                      >
                        {salvandoBio ? 'Salvando...' : 'Salvar bio'}
                      </button>

                      <button
                        type="button"
                        className="btn light"
                        disabled={salvandoBio}
                        onClick={() => {
                          setBio(guia?.bio_guia || guia?.bio || '')
                          setEditandoBio(false)
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="bioText">
                    {bio || 'Sua bio ainda não foi preenchida. Escreva uma apresentação simples, humana e confiável para os aventureiros conhecerem melhor você.'}
                  </div>
                )}
              </div>
            </section>

            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Recebimentos e credencial</h2>
                  <div className="cardSub">
                    A chave PIX fica privada para repasses. O CADASTUR poderá aparecer no seu perfil público quando preenchido.
                  </div>
                </div>
              </div>

              <div className="cardBody">
                <div className="formGrid">
                  <div className="field">
                    <label className="label">Tipo da chave PIX</label>
                    <select
                      className="select"
                      value={pixTipo}
                      onChange={(event) => setPixTipo(event.target.value)}
                    >
                      {PIX_TIPOS.map((tipo) => (
                        <option key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label className="label">Chave PIX para recebimentos</label>
                    <input
                      className="input"
                      value={pixChave}
                      onChange={(event) => setPixChave(event.target.value)}
                      placeholder="Informe sua chave PIX"
                    />
                  </div>

                  <div className="field full">
                    <label className="label">CADASTUR</label>
                    <input
                      className="input"
                      value={cadastur}
                      onChange={(event) => setCadastur(event.target.value)}
                      placeholder="Informe seu número CADASTUR, se possuir"
                    />
                    <div className="helper">
                      O CADASTUR será exibido no perfil público do guia quando estiver preenchido. A chave PIX não aparece publicamente.
                    </div>
                  </div>
                </div>

                <div className="actionRow">
                  <button
                    type="button"
                    className="btn green"
                    onClick={salvarDadosPrivados}
                    disabled={salvandoDados}
                  >
                    {salvandoDados ? 'Salvando...' : 'Salvar dados'}
                  </button>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Resumo de evolução</h2>
                  <div className="cardSub">
                    Indicadores principais da sua jornada como guia dentro da plataforma.
                  </div>
                </div>
              </div>

              <div className="cardBody">
                <div className="statsGrid">
                  <div className="statBox">
                    <div className="statIcon">🥾</div>
                    <div className="statValue">{stats.totalRoteiros}</div>
                    <div className="statLabel">roteiros cadastrados</div>
                  </div>

                  <div className="statBox">
                    <div className="statIcon">📅</div>
                    <div className="statValue">{stats.totalReservas}</div>
                    <div className="statLabel">reservas recebidas</div>
                  </div>

                  <div className="statBox">
                    <div className="statIcon">✅</div>
                    <div className="statValue">{stats.reservasConfirmadas}</div>
                    <div className="statLabel">reservas confirmadas</div>
                  </div>

                  <div className="statBox">
                    <div className="statIcon">👥</div>
                    <div className="statValue">{stats.totalClientes}</div>
                    <div className="statLabel">clientes atendidos</div>
                  </div>

                  <div className="statBox">
                    <div className="statIcon">👣</div>
                    <div className="statValue">{stats.totalKm.toFixed(1)}</div>
                    <div className="statLabel">km guiados</div>
                  </div>

                  <div className="statBox">
                    <div className="statIcon">⭐</div>
                    <div className="statValue">{stats.avaliacaoMedia.toFixed(1)}</div>
                    <div className="statLabel">média de avaliação</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Conquistas por km</h2>
                  <div className="cardSub">
                    As conquistas acompanham sua evolução real em quilômetros guiados.
                  </div>
                </div>
              </div>

              <div className="cardBody">
                <div className="achievementGrid">
                  {conquistasKm.map((item) => (
                    <div
                      key={item.nome}
                      className={`achievement ${item.desbloqueado ? '' : 'locked'}`}
                    >
                      <div className="achievementIcon">{item.icone}</div>
                      <div className="achievementName">{item.nome}</div>
                      <div className="achievementMeta">
                        {item.km === 0 ? 'Início da jornada' : `${item.km} km`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Evolução da jornada</h2>
                  <div className="cardSub">
                    Marcos de progressão do guia dentro da comunidade PrussikTrails.
                  </div>
                </div>
              </div>

              <div className="cardBody">
                <div className="timeline">
                  {METAS_KM_GUIA.map((meta) => {
                    const conquistado = stats.totalKm >= meta.km

                    return (
                      <div className="timelineItem" key={meta.nome}>
                        <div className="timelineKm">{meta.km} km</div>
                        <div className="timelineName">
                          {meta.icone} {meta.nome}
                        </div>
                        <div className={`timelineStatus ${conquistado ? 'ok' : ''}`}>
                          {conquistado ? 'Conquistado' : 'Em progresso'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          </div>

          <aside className="stack">
            <section className="benefitCard">
              <div className="benefitPill">
                Benefício de fundador
              </div>

              <div className="benefitTitle">
                Guia Pioneiro Beta
              </div>

              <div className="benefitText">
                Durante a fase Beta, a taxa PrussikTrails será de 5% sobre cada reserva confirmada. Após o Beta, a taxa padrão passará para 7%.
              </div>

              <div className="benefitText">
                Guias ativos nesta fase inicial poderão manter o benefício de 5% por tempo determinado e receber a medalha Guia Pioneiro Beta no perfil.
              </div>

              <div className="benefitText">
                Taxa atual cadastrada: <strong>{Number(guia?.taxa_plataforma_percentual || 5).toFixed(2)}%</strong>
              </div>
            </section>

            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Medalhas</h2>
                  <div className="cardSub">
                    Reconhecimentos da sua atuação como guia.
                  </div>
                </div>
              </div>

              <div className="cardBody">
                <div className="medalGrid">
                  {medalhas.map((medalha) => (
                    <div
                      key={medalha.nome}
                      className={`medal ${medalha.desbloqueado ? '' : 'locked'}`}
                    >
                      <div className="medalIcon">{medalha.icone}</div>
                      <div className="medalName">{medalha.nome}</div>
                      <div className="medalMeta">
                        {medalha.desbloqueado
                          ? 'Liberada'
                          : `${medalha.progresso}/${medalha.meta}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Principais roteiros</h2>
                  <div className="cardSub">
                    Prévia dos roteiros que também aparecerão no seu perfil público.
                  </div>
                </div>
              </div>

              <div className="cardBody">
                {principaisRoteiros.length === 0 ? (
                  <div className="empty">
                    Nenhum roteiro cadastrado ainda.
                  </div>
                ) : (
                  <div className="routeGrid">
                    {principaisRoteiros.map((roteiro) => (
                      <div
                        className="routeCard"
                        key={roteiro.id}
                        onClick={() => router.push(`/roteiros/${roteiro.id}`)}
                      >
                        <div className="routePhoto">
                          {fotoRoteiro(roteiro) ? (
                            <img src={fotoRoteiro(roteiro)} alt={roteiro.titulo || roteiro.nome || 'Roteiro'} />
                          ) : (
                            <span>🥾</span>
                          )}
                        </div>

                        <div>
                          <div className="routeTitle">
                            {roteiro.titulo || roteiro.nome || 'Roteiro'}
                          </div>

                          <div className="routeMeta">
                            {roteiro.local || roteiro.localizacao || 'Local a confirmar'}
                            <br />
                            {kmRoteiro(roteiro).toFixed(1)} km
                          </div>

                          <div className="routePrice">
                            {formatarMoeda(valorRoteiro(roteiro))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="actionRow">
                  <button
                    type="button"
                    className="btn dark"
                    onClick={() => router.push('/guia/roteiros')}
                  >
                    Meus roteiros
                  </button>

                  <button
                    type="button"
                    className="btn light"
                    onClick={() => router.push('/guia/roteiros/novo')}
                  >
                    Novo roteiro
                  </button>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="cardHeader">
                <div>
                  <h2 className="cardTitle">Avaliações</h2>
                  <div className="cardSub">
                    Comentários e notas recebidas dos aventureiros.
                  </div>
                </div>

                <button
                  type="button"
                  className="btn light"
                  onClick={() => router.push('/guia/avaliacoes')}
                >
                  Ver painel
                </button>
              </div>

              <div className="cardBody">
                {avaliacoes.length === 0 ? (
                  <div className="empty">
                    Você ainda não recebeu avaliações. Elas aparecerão aqui depois das experiências confirmadas.
                  </div>
                ) : (
                  <div className="reviewList">
                    {avaliacoes.slice(0, 5).map((avaliacao) => (
                      <div className="review" key={avaliacao.id}>
                        <div className="reviewTop">
                          <div className="reviewName">
                            {avaliacao.cliente_nome || 'Cliente'}
                          </div>

                          <div className="stars">
                            ⭐ {Number(avaliacao.nota || 0).toFixed(1)}
                          </div>
                        </div>

                        <div className="reviewText">
                          {avaliacao.comentario || avaliacao.observacao || avaliacao.descricao || 'Avaliação sem comentário escrito.'}
                        </div>

                        <div className="reviewDate">
                          {formatarData(avaliacao.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </aside>
        </section>
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