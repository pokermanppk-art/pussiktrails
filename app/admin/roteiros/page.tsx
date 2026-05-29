'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type AnyRecord = Record<string, any>

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
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
}

type Roteiro = {
  id: string
  titulo?: string | null
  nome?: string | null
  descricao?: string | null
  roteiro_detalhado?: string | null
  detalhes?: string | null
  status?: string | null
  ativo?: boolean | null
  preco?: number | null
  valor?: number | null
  id_guia?: string | null
  guia_id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  criado_por?: string | null
  created_by?: string | null
  owner_id?: string | null
  local?: string | null
  localizacao?: string | null
  cidade?: string | null
  destino?: string | null
  embarque_local?: string | null
  local_encontro?: string | null
  ponto_encontro?: string | null
  dificuldade?: string | null
  nivel?: string | null
  intensidade?: string | null
  duracao_horas?: number | null
  duracao?: string | null
  km?: number | null
  distancia_km?: number | null
  limite_pessoas?: number | null
  capacidade?: number | null
  max_pessoas?: number | null
  recorrencia?: string | null
  proxima_data?: string | null
  data_trilha?: string | null
  data_roteiro?: string | null
  embarque_data?: string | null
  embarque_data_hora?: string | null
  hora_trilha?: string | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  image_url?: string | null
  capa_url?: string | null
  imagem?: string | null
  created_at?: string | null
  updated_at?: string | null
  excluido_admin?: boolean | null
  excluido_em?: string | null
  removido_em?: string | null
  removido_pelo_admin?: boolean | null
  removido_pelo_guia?: boolean | null
  excluido_por?: string | null
  motivo_exclusao?: string | null
  exclusao_tipo?: string | null
  [key: string]: any
}

type Reserva = {
  id: string
  roteiro_id?: string | null
  id_roteiro?: string | null
  cliente_id?: string | null
  valor_total?: number | null
  quantidade_pessoas?: number | null
  status?: string | null
  pagamento_status?: string | null
  created_at?: string | null
}

type GrupoRoteiro = {
  id: string
  roteiro_id?: string | null
  guia_id?: string | null
  titulo?: string | null
  nome?: string | null
  status?: string | null
  ativo?: boolean | null
  created_at?: string | null
}

type Avaliacao = {
  id: string
  roteiro_id?: string | null
  nota?: number | null
  status?: string | null
  created_at?: string | null
}

type RoteiroCompleto = Roteiro & {
  guia?: UsuarioBanco | null
  reservas?: Reserva[]
  grupo?: GrupoRoteiro | null
  avaliacoes?: Avaliacao[]
  guia_nome?: string
  total_reservas?: number
  reservas_confirmadas?: number
  receita_confirmada?: number
  media_avaliacao?: number
  total_avaliacoes?: number
}

type SolicitacaoAtualizacao = {
  id: string
  roteiro_id?: string | null
  guia_id?: string | null
  status?: string | null
  tipo_solicitacao?: string | null
  titulo_atual?: string | null
  titulo_solicitado?: string | null
  descricao_atual?: string | null
  descricao_solicitada?: string | null
  data_atual?: string | null
  data_solicitada?: string | null
  hora_atual?: string | null
  hora_solicitada?: string | null
  local_atual?: string | null
  local_solicitado?: string | null
  preco_atual?: number | null
  preco_solicitado?: number | null
  observacao_guia?: string | null
  observacao_admin?: string | null
  dados_atuais?: AnyRecord | null
  dados_solicitados?: AnyRecord | null
  guia_nome?: string | null
  guia_avatar?: string | null
  roteiro_titulo?: string | null
  roteiro_foto?: string | null
  roteiro_status?: string | null
  roteiro_ativo?: boolean | null
  created_at?: string | null
  updated_at?: string | null
  [key: string]: any
}

type SolicitacaoForm = {
  titulo: string
  descricao: string
  data: string
  hora: string
  local: string
  preco: string
  observacaoAdmin: string
}

type FiltroStatus =
  | 'todos'
  | 'ativos'
  | 'pendentes'
  | 'pausados'
  | 'reprovados'
  | 'com_reservas'
  | 'sem_grupo'
  | 'ocultados'

type Stats = {
  total: number
  ativos: number
  pendentes: number
  pausados: number
  reprovados: number
  ocultados: number
  novosMes: number
  comReservas: number
  semGrupo: number
  receitaConfirmada: number
  reservasConfirmadas: number
  mediaAvaliacoes: number
}

const statsInicial: Stats = {
  total: 0,
  ativos: 0,
  pendentes: 0,
  pausados: 0,
  reprovados: 0,
  ocultados: 0,
  novosMes: 0,
  comReservas: 0,
  semGrupo: 0,
  receitaConfirmada: 0,
  reservasConfirmadas: 0,
  mediaAvaliacoes: 0
}

const statusLabels: Record<FiltroStatus, string> = {
  todos: 'Todos',
  ativos: 'Ativos',
  pendentes: 'Em análise',
  pausados: 'Pausados',
  reprovados: 'Reprovados',
  com_reservas: 'Com reservas',
  sem_grupo: 'Sem grupo',
  ocultados: 'Ocultados'
}

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function normalizarTexto(valor?: string | null) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function formatarMoeda(valor: unknown) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(valor || 0))
}

function formatarNota(valor: unknown) {
  return Number(valor || 0).toFixed(2).replace('.', ',')
}

function formatarData(valor?: string | null) {
  const raw = texto(valor)
  if (!raw) return '-'

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) return `${match[3]}/${match[2]}/${match[1]}`

  return raw
}

function formatarHora(valor?: string | null) {
  const raw = texto(valor)
  if (!raw) return '-'

  const matchIso = raw.match(/T(\d{2}):(\d{2})/)
  if (matchIso) return `${matchIso[1]}:${matchIso[2]}`

  const matchHora = raw.match(/^(\d{2}):(\d{2})/)
  if (matchHora) return `${matchHora[1]}:${matchHora[2]}`

  return raw
}

function formatarDataHoraOperacional(data?: string | null, hora?: string | null) {
  const dataFormatada = formatarData(data)
  const horaFormatada = formatarHora(hora)

  if (dataFormatada !== '-' && horaFormatada !== '-') return `${dataFormatada} às ${horaFormatada}`
  if (dataFormatada !== '-') return dataFormatada
  if (horaFormatada !== '-') return horaFormatada

  return '-'
}

function extrairDataInput(valor?: string | null) {
  const raw = texto(valor)
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] || ''
}

function extrairHoraInput(valor?: string | null) {
  const raw = texto(valor)
  const matchIso = raw.match(/T(\d{2}:\d{2})/)
  if (matchIso?.[1]) return matchIso[1]

  const matchHora = raw.match(/^(\d{2}:\d{2})/)
  return matchHora?.[1] || ''
}

function normalizarPrecoInput(valor: unknown) {
  const raw = texto(valor)
  if (!raw) return ''

  const numero = Number(raw.replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(numero) || numero <= 0) return ''

  return String(numero).replace('.', ',')
}

function numeroInput(valor: string) {
  const numero = Number(texto(valor).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(numero) ? numero : null
}

function erroDeColunaAusente(error: any) {
  const mensagem = String(error?.message || error?.details || error?.hint || '').toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    mensagem.includes('could not find') ||
    mensagem.includes('schema cache') ||
    mensagem.includes('column') ||
    mensagem.includes('does not exist')
  )
}

function extrairColunaAusente(error: any) {
  const textoErro = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ')

  const matchRoteiros = textoErro.match(/roteiros\.([a-zA-Z0-9_]+)/)
  if (matchRoteiros?.[1]) return matchRoteiros[1]

  const matchColumn = textoErro.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i)
  if (matchColumn?.[1]) return matchColumn[1]

  const matchAspas = textoErro.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  return ''
}

function erroDeConstraintStatus(error: any) {
  const mensagem = String(error?.message || error?.details || error?.hint || '').toLowerCase()

  return (
    error?.code === '23514' &&
    (mensagem.includes('status') ||
      mensagem.includes('roteiros_status') ||
      mensagem.includes('check constraint') ||
      mensagem.includes('violates check'))
  )
}

export default function AdminRoteirosPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [roteiros, setRoteiros] = useState<RoteiroCompleto[]>([])
  const [roteiroSelecionado, setRoteiroSelecionado] = useState<RoteiroCompleto | null>(null)
  const [stats, setStats] = useState<Stats>(statsInicial)

  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoAtualizacao[]>([])
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState<SolicitacaoAtualizacao | null>(null)
  const [solicitacaoForm, setSolicitacaoForm] = useState<SolicitacaoForm>({
    titulo: '',
    descricao: '',
    data: '',
    hora: '',
    local: '',
    preco: '',
    observacaoAdmin: ''
  })

  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [carregandoSolicitacoes, setCarregandoSolicitacoes] = useState(false)
  const [processandoSolicitacaoId, setProcessandoSolicitacaoId] = useState('')
  const [alterandoStatusId, setAlterandoStatusId] = useState('')
  const [criandoGrupoId, setCriandoGrupoId] = useState('')
  const [excluindoRoteiroId, setExcluindoRoteiroId] = useState('')
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function iniciar() {
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

      if (normalizarTexto(parsedUser.tipo) !== 'admin') {
        router.replace('/login')
        return
      }

      setUser(parsedUser)

      await Promise.all([carregarRoteiros(), carregarSolicitacoes()])
    } catch (error) {
      console.error('Erro ao iniciar roteiros admin:', error)
      setErro('Não foi possível carregar os roteiros agora.')
    } finally {
      setCarregando(false)
    }
  }

  function nomeUsuario(usuario?: UsuarioLocal | UsuarioBanco | null) {
    return usuario?.nome || usuario?.name || usuario?.email || 'Usuário'
  }

  function tituloRoteiro(roteiro?: Roteiro | null) {
    return roteiro?.titulo || roteiro?.nome || 'Roteiro'
  }

  function descricaoRoteiro(roteiro?: Roteiro | null) {
    return roteiro?.descricao || roteiro?.roteiro_detalhado || roteiro?.detalhes || ''
  }

  function guiaIdDoRoteiro(roteiro?: Roteiro | null) {
    return (
      roteiro?.id_guia ||
      roteiro?.guia_id ||
      roteiro?.user_id ||
      roteiro?.usuario_id ||
      roteiro?.criado_por ||
      roteiro?.created_by ||
      roteiro?.owner_id ||
      ''
    )
  }

  function localRoteiro(roteiro?: Roteiro | null) {
    return (
      roteiro?.local ||
      roteiro?.localizacao ||
      roteiro?.cidade ||
      roteiro?.destino ||
      roteiro?.embarque_local ||
      roteiro?.local_encontro ||
      roteiro?.ponto_encontro ||
      'Local a confirmar'
    )
  }

  function dataRoteiro(roteiro?: Roteiro | null) {
    return (
      roteiro?.embarque_data ||
      roteiro?.data_roteiro ||
      roteiro?.data_trilha ||
      roteiro?.proxima_data ||
      roteiro?.embarque_data_hora ||
      ''
    )
  }

  function horaRoteiro(roteiro?: Roteiro | null) {
    return roteiro?.hora_trilha || extrairHoraInput(roteiro?.embarque_data_hora || roteiro?.proxima_data || '')
  }

  function imagemRoteiro(roteiro?: Roteiro | null) {
    return roteiro?.foto_capa || roteiro?.foto_url || roteiro?.imagem_url || roteiro?.image_url || roteiro?.capa_url || roteiro?.imagem || ''
  }

  function precoRoteiro(roteiro?: Roteiro | null) {
    return Number(roteiro?.preco || roteiro?.valor || 0)
  }

  function distanciaRoteiro(roteiro?: Roteiro | null) {
    return Number(roteiro?.distancia_km || roteiro?.km || 0)
  }

  function limitePessoasRoteiro(roteiro?: Roteiro | null) {
    return Number(roteiro?.limite_pessoas || roteiro?.capacidade || roteiro?.max_pessoas || 0)
  }

  function duracaoRoteiro(roteiro?: Roteiro | null) {
    if (roteiro?.duracao_horas) return `${roteiro.duracao_horas}h`
    if (roteiro?.duracao) return roteiro.duracao
    return '-'
  }

  function dentroDoMesAtual(valor?: string | null) {
    if (!valor) return false

    const data = new Date(valor)
    if (Number.isNaN(data.getTime())) return false

    const agora = new Date()

    return data.getFullYear() === agora.getFullYear() && data.getMonth() === agora.getMonth()
  }

  function pagamentoConfirmado(reserva: Reserva) {
    const pagamento = normalizarTexto(reserva.pagamento_status)
    const status = normalizarTexto(reserva.status)

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

  function statusRoteiro(roteiro: Roteiro) {
    const status = normalizarTexto(roteiro.status)

    if (
      roteiro?.excluido_admin === true ||
      roteiro?.removido_pelo_admin === true ||
      status === 'excluido_admin' ||
      status === 'ocultado_admin' ||
      status === 'removido_admin' ||
      status === 'excluido' ||
      Boolean(roteiro.excluido_em) ||
      Boolean(roteiro.removido_em)
    ) {
      return 'excluido_admin'
    }

    if (status) return status
    if (roteiro.ativo === true) return 'ativo'
    if (roteiro.ativo === false) return 'pausado'

    return 'pendente'
  }

  function roteiroAtivo(roteiro: Roteiro) {
    const status = statusRoteiro(roteiro)
    if (status === 'excluido_admin') return false

    return roteiro.ativo === true || status === 'ativo' || status === 'aprovado' || status === 'publicado'
  }

  function roteiroPendente(roteiro: Roteiro) {
    const status = statusRoteiro(roteiro)

    return (
      status === 'pendente' ||
      status === 'aguardando' ||
      status === 'em_analise' ||
      status === 'analise' ||
      status === 'pendente_aprovacao' ||
      status === 'aguardando_aprovacao'
    )
  }

  function roteiroReprovado(roteiro: Roteiro) {
    const status = statusRoteiro(roteiro)
    return status === 'reprovado' || status === 'recusado' || status === 'negado'
  }

  function roteiroPausado(roteiro: Roteiro) {
    const status = statusRoteiro(roteiro)

    return (
      (roteiro.ativo === false && !roteiroPendente(roteiro) && !roteiroReprovado(roteiro)) ||
      status === 'pausado' ||
      status === 'inativo'
    )
  }

  function roteiroOcultado(roteiro: Roteiro) {
    return statusRoteiro(roteiro) === 'excluido_admin'
  }

  async function carregarRoteiros() {
    setErro('')

    const { data: roteirosData, error: roteirosError } = await supabase
      .from('roteiros')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1200)

    if (roteirosError) {
      console.error('Erro ao carregar roteiros:', roteirosError)
      setErro('Não foi possível carregar os roteiros.')
      return
    }

    const roteirosBase = ((roteirosData || []) as Roteiro[]).filter((roteiro) => Boolean(roteiro.id))
    const roteiroIds = roteirosBase.map((roteiro) => roteiro.id)

    const guiaIds = Array.from(new Set(roteirosBase.map(guiaIdDoRoteiro).filter(Boolean)))

    let guias: UsuarioBanco[] = []
    let reservas: Reserva[] = []
    let grupos: GrupoRoteiro[] = []
    let avaliacoes: Avaliacao[] = []

    if (guiaIds.length > 0) {
      const { data: guiasData, error: guiasError } = await supabase
        .from('users')
        .select('id, nome, name, email, tipo, avatar_url, foto_url, imagem_url')
        .in('id', guiaIds)

      if (guiasError) console.warn('Erro ao buscar guias dos roteiros:', guiasError)
      guias = (guiasData || []) as UsuarioBanco[]
    }

    if (roteiroIds.length > 0) {
      const { data: reservasData, error: reservasError } = await supabase
        .from('reservas')
        .select('*')
        .in('roteiro_id', roteiroIds)
        .limit(2500)

      if (reservasError) console.warn('Erro ao buscar reservas dos roteiros:', reservasError)
      reservas = (reservasData || []) as Reserva[]

      const { data: gruposData, error: gruposError } = await supabase
        .from('grupos_roteiros')
        .select('*')
        .in('roteiro_id', roteiroIds)
        .limit(1500)

      if (gruposError) console.warn('Erro ao buscar grupos dos roteiros:', gruposError)
      grupos = (gruposData || []) as GrupoRoteiro[]

      const { data: avaliacoesData, error: avaliacoesError } = await supabase
        .from('avaliacoes')
        .select('id, roteiro_id, nota, status, created_at')
        .in('roteiro_id', roteiroIds)
        .limit(2500)

      if (avaliacoesError) console.warn('Erro ao buscar avaliações dos roteiros:', avaliacoesError)
      avaliacoes = (avaliacoesData || []) as Avaliacao[]
    }

    const roteirosCompletos: RoteiroCompleto[] = roteirosBase.map((roteiro) => {
      const guiaId = guiaIdDoRoteiro(roteiro)
      const guia = guias.find((item) => item.id === guiaId) || null

      const reservasDoRoteiro = reservas.filter((reserva) => {
        const reservaRoteiroId = texto(reserva.roteiro_id || reserva.id_roteiro)
        return reservaRoteiroId === roteiro.id
      })

      const reservasConfirmadas = reservasDoRoteiro.filter(pagamentoConfirmado)

      const receitaConfirmada = reservasConfirmadas.reduce(
        (total, reserva) => total + Number(reserva.valor_total || 0),
        0
      )

      const grupo = grupos.find((item) => item.roteiro_id === roteiro.id) || null

      const avaliacoesDoRoteiro = avaliacoes.filter((avaliacao) => {
        const status = normalizarTexto(avaliacao.status)
        return avaliacao.roteiro_id === roteiro.id && (!status || status === 'publicada')
      })

      const somaNotas = avaliacoesDoRoteiro.reduce(
        (total, avaliacao) => total + Number(avaliacao.nota || 0),
        0
      )

      const mediaAvaliacao = avaliacoesDoRoteiro.length > 0 ? somaNotas / avaliacoesDoRoteiro.length : 0

      return {
        ...roteiro,
        guia,
        reservas: reservasDoRoteiro,
        grupo,
        avaliacoes: avaliacoesDoRoteiro,
        guia_nome: nomeUsuario(guia),
        total_reservas: reservasDoRoteiro.length,
        reservas_confirmadas: reservasConfirmadas.length,
        receita_confirmada: receitaConfirmada,
        media_avaliacao: mediaAvaliacao,
        total_avaliacoes: avaliacoesDoRoteiro.length
      }
    })

    const roteirosVisiveis = roteirosCompletos.filter((roteiro) => !roteiroOcultado(roteiro))
    const receitaConfirmada = roteirosVisiveis.reduce(
      (total, roteiro) => total + Number(roteiro.receita_confirmada || 0),
      0
    )

    const totalAvaliacoes = roteirosVisiveis.reduce(
      (total, roteiro) => total + Number(roteiro.total_avaliacoes || 0),
      0
    )

    const somaMediasPonderadas = roteirosVisiveis.reduce((total, roteiro) => {
      return total + Number(roteiro.media_avaliacao || 0) * Number(roteiro.total_avaliacoes || 0)
    }, 0)

    setRoteiros(roteirosCompletos)

    setStats({
      total: roteirosVisiveis.length,
      ativos: roteirosVisiveis.filter(roteiroAtivo).length,
      pendentes: roteirosVisiveis.filter(roteiroPendente).length,
      pausados: roteirosVisiveis.filter(roteiroPausado).length,
      reprovados: roteirosVisiveis.filter(roteiroReprovado).length,
      ocultados: roteirosCompletos.filter(roteiroOcultado).length,
      novosMes: roteirosVisiveis.filter((roteiro) => dentroDoMesAtual(roteiro.created_at)).length,
      comReservas: roteirosVisiveis.filter((roteiro) => Number(roteiro.total_reservas || 0) > 0).length,
      semGrupo: roteirosVisiveis.filter((roteiro) => !roteiro.grupo?.id).length,
      receitaConfirmada,
      reservasConfirmadas: reservas.filter(pagamentoConfirmado).length,
      mediaAvaliacoes: totalAvaliacoes > 0 ? somaMediasPonderadas / totalAvaliacoes : 0
    })

    setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
  }

  async function carregarSolicitacoes() {
    setCarregandoSolicitacoes(true)

    try {
      const response = await fetch('/api/admin/roteiros/solicitacoes-atualizacao?status=pendente&limite=80', {
        headers: {
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        }
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.erro || data?.message || 'Não foi possível carregar solicitações.')
      }

      setSolicitacoes(Array.isArray(data?.solicitacoes) ? data.solicitacoes : [])
    } catch (error) {
      console.error('Erro ao carregar solicitações de atualização:', error)
      setSolicitacoes([])
    } finally {
      setCarregandoSolicitacoes(false)
    }
  }

  async function atualizarTudo() {
    setAtualizando(true)
    setMensagem('')
    setErro('')

    try {
      await Promise.all([carregarRoteiros(), carregarSolicitacoes()])
      setMensagem('Roteiros e solicitações atualizados.')
    } catch (error) {
      console.error('Erro ao atualizar roteiros:', error)
      setErro('Não foi possível atualizar os roteiros agora.')
    } finally {
      setAtualizando(false)
    }
  }

  async function atualizarRoteiroComFallback(roteiroId: string, payloadOriginal: AnyRecord) {
    let payloadAtual: AnyRecord = { ...payloadOriginal }

    for (let tentativa = 0; tentativa < 16; tentativa++) {
      const { error } = await supabase.from('roteiros').update(payloadAtual).eq('id', roteiroId)

      if (!error) return true

      if (!erroDeColunaAusente(error)) throw error

      const coluna = extrairColunaAusente(error)

      if (!coluna || !(coluna in payloadAtual)) throw error

      delete payloadAtual[coluna]
    }

    throw new Error('Não foi possível atualizar o roteiro.')
  }

  async function alterarStatusComTentativas(roteiroId: string, statusPossiveis: string[], ativo: boolean) {
    let ultimoErro: any = null

    for (const status of statusPossiveis) {
      try {
        await atualizarRoteiroComFallback(roteiroId, {
          status,
          ativo,
          updated_at: new Date().toISOString()
        })

        return status
      } catch (error: any) {
        ultimoErro = error

        if (!erroDeConstraintStatus(error)) throw error

        console.warn(`Status "${status}" recusado pelo banco. Tentando próximo...`, error)
      }
    }

    throw ultimoErro || new Error('Status não aceito pelo banco.')
  }

  async function ativarRoteiro(roteiro: RoteiroCompleto) {
    if (!roteiro?.id) return

    setAlterandoStatusId(roteiro.id)
    setMensagem('')
    setErro('')

    try {
      const statusUsado = await alterarStatusComTentativas(roteiro.id, ['ativo', 'aprovado', 'publicado'], true)
      setMensagem(`Roteiro ativado com sucesso. Status usado: ${statusUsado}.`)
      await carregarRoteiros()
    } catch (error: any) {
      console.error('Erro ao ativar roteiro:', error)
      setErro(error?.message || 'Não foi possível ativar o roteiro.')
    } finally {
      setAlterandoStatusId('')
    }
  }

  async function pausarRoteiro(roteiro: RoteiroCompleto) {
    if (!roteiro?.id) return

    setAlterandoStatusId(roteiro.id)
    setMensagem('')
    setErro('')

    try {
      const statusUsado = await alterarStatusComTentativas(roteiro.id, ['pausado', 'inativo', 'pendente'], false)
      setMensagem(`Roteiro pausado com sucesso. Status usado: ${statusUsado}.`)
      await carregarRoteiros()
    } catch (error: any) {
      console.error('Erro ao pausar roteiro:', error)
      setErro(error?.message || 'Não foi possível pausar o roteiro.')
    } finally {
      setAlterandoStatusId('')
    }
  }

  async function reprovarRoteiro(roteiro: RoteiroCompleto) {
    if (!roteiro?.id) return

    const confirmar = window.confirm('Deseja marcar este roteiro como reprovado/recusado?')
    if (!confirmar) return

    setAlterandoStatusId(roteiro.id)
    setMensagem('')
    setErro('')

    try {
      const statusUsado = await alterarStatusComTentativas(roteiro.id, ['reprovado', 'recusado', 'pendente'], false)
      setMensagem(`Roteiro atualizado com sucesso. Status usado: ${statusUsado}.`)
      await carregarRoteiros()
    } catch (error: any) {
      console.error('Erro ao reprovar roteiro:', error)
      setErro(error?.message || 'Não foi possível reprovar o roteiro.')
    } finally {
      setAlterandoStatusId('')
    }
  }

  async function garantirGrupo(roteiro: RoteiroCompleto) {
    if (!roteiro?.id) return

    setCriandoGrupoId(roteiro.id)
    setMensagem('')
    setErro('')

    try {
      const response = await fetch('/api/grupos/garantir-grupo-roteiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roteiroId: roteiro.id })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        setErro(data?.erro || data?.message || 'Não foi possível garantir o grupo do roteiro.')
        return
      }

      setMensagem('Grupo do roteiro garantido com sucesso.')
      await carregarRoteiros()
    } catch (error) {
      console.error('Erro ao garantir grupo:', error)
      setErro('Erro ao garantir grupo do roteiro.')
    } finally {
      setCriandoGrupoId('')
    }
  }

  async function excluirRoteiroAdmin(roteiro: RoteiroCompleto) {
    if (!roteiro?.id) {
      setErro('Não foi possível identificar o roteiro.')
      return
    }

    const titulo = tituloRoteiro(roteiro)
    const temReservas = Number(roteiro.total_reservas || 0) > 0
    const temReceita = Number(roteiro.receita_confirmada || 0) > 0
    const temGrupo = Boolean(roteiro.grupo?.id)

    const confirmar = window.confirm(
      `Deseja remover o roteiro "${titulo}" da listagem principal?\n\n` +
        `Roteiro sem reservas pode ser apagado definitivamente. Roteiro com vínculos será ocultado para preservar histórico.\n\n` +
        `Reservas vinculadas: ${roteiro.total_reservas || 0}\n` +
        `Receita confirmada: ${formatarMoeda(roteiro.receita_confirmada || 0)}\n` +
        `Grupo interno: ${temGrupo ? 'sim' : 'não'}`
    )

    if (!confirmar) return

    const motivo = window.prompt('Informe o motivo administrativo da remoção:')

    if (!motivo || !motivo.trim()) {
      setErro('Exclusão cancelada. O motivo é obrigatório.')
      return
    }

    const podeSugerirExclusaoDefinitiva = !temReservas && !temReceita && !temGrupo

    const modo = window.prompt(
      podeSugerirExclusaoDefinitiva
        ? 'Digite APAGAR para excluir definitivamente ou OCULTAR para apenas desativar. Na dúvida, use OCULTAR.'
        : 'Este roteiro possui vínculos. Por segurança, digite OCULTAR para desativar e preservar histórico.'
    )

    if (!modo) return

    const modoNormalizado = modo.trim().toUpperCase()

    if (modoNormalizado !== 'APAGAR' && modoNormalizado !== 'OCULTAR') {
      setErro('Opção inválida. Digite apenas APAGAR ou OCULTAR.')
      return
    }

    const definitivo = modoNormalizado === 'APAGAR' && podeSugerirExclusaoDefinitiva

    const segundaConfirmacao = window.confirm(
      definitivo
        ? `Confirma a EXCLUSÃO DEFINITIVA do roteiro "${titulo}"?`
        : `Confirma a OCULTAÇÃO/DESATIVAÇÃO administrativa do roteiro "${titulo}"?`
    )

    if (!segundaConfirmacao) return

    setExcluindoRoteiroId(roteiro.id)
    setErro('')
    setMensagem('')

    try {
      const response = await fetch('/api/admin/roteiros/excluir', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roteiroId: roteiro.id,
          adminId: user?.id || null,
          motivo: motivo.trim(),
          definitivo
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.ok === false || data?.sucesso === false) {
        throw new Error(data?.error || data?.erro || 'Não foi possível remover o roteiro.')
      }

      setRoteiroSelecionado((selecionado) => (selecionado?.id === roteiro.id ? null : selecionado))
      await carregarRoteiros()
      setMensagem(data?.message || data?.mensagem || 'Roteiro removido da listagem principal.')
    } catch (error: any) {
      console.error('Erro ao excluir/ocultar roteiro:', error)
      setErro(error?.message || 'Erro ao excluir/ocultar roteiro.')
    } finally {
      setExcluindoRoteiroId('')
    }
  }

  function abrirSolicitacao(solicitacao: SolicitacaoAtualizacao) {
    const dados = solicitacao.dados_solicitados || {}

    const dataSolicitada = texto(dados.data || solicitacao.data_solicitada)
    const horaSolicitada = texto(dados.hora || solicitacao.hora_solicitada)

    setSolicitacaoSelecionada(solicitacao)
    setSolicitacaoForm({
      titulo: texto(dados.titulo || solicitacao.titulo_solicitado),
      descricao: texto(dados.descricao || solicitacao.descricao_solicitada),
      data: extrairDataInput(dataSolicitada),
      hora: extrairHoraInput(horaSolicitada),
      local: texto(dados.local || solicitacao.local_solicitado),
      preco: normalizarPrecoInput(dados.preco ?? solicitacao.preco_solicitado),
      observacaoAdmin: texto(solicitacao.observacao_admin)
    })
  }

  function fecharSolicitacao() {
    if (processandoSolicitacaoId) return

    setSolicitacaoSelecionada(null)
    setSolicitacaoForm({
      titulo: '',
      descricao: '',
      data: '',
      hora: '',
      local: '',
      preco: '',
      observacaoAdmin: ''
    })
  }

  async function aprovarSolicitacao() {
    if (!solicitacaoSelecionada?.id) return
    if (!user?.id) return

    setProcessandoSolicitacaoId(solicitacaoSelecionada.id)
    setErro('')
    setMensagem('')

    try {
      const precoNumerico = numeroInput(solicitacaoForm.preco)

      const response = await fetch('/api/admin/roteiros/solicitacoes-atualizacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solicitacaoId: solicitacaoSelecionada.id,
          adminId: user.id,
          acao: 'aprovar',
          titulo: solicitacaoForm.titulo,
          descricao: solicitacaoForm.descricao,
          data: solicitacaoForm.data,
          hora: solicitacaoForm.hora,
          local: solicitacaoForm.local,
          preco: precoNumerico,
          observacaoAdmin: solicitacaoForm.observacaoAdmin
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.erro || data?.message || 'Não foi possível aprovar a solicitação.')
      }

      setMensagem(data?.mensagem || 'Solicitação aprovada e roteiro atualizado.')
      fecharSolicitacao()
      await Promise.all([carregarRoteiros(), carregarSolicitacoes()])
    } catch (error: any) {
      console.error('Erro ao aprovar solicitação:', error)
      setErro(error?.message || 'Erro ao aprovar solicitação.')
    } finally {
      setProcessandoSolicitacaoId('')
    }
  }

  async function rejeitarSolicitacao() {
    if (!solicitacaoSelecionada?.id) return
    if (!user?.id) return

    const confirmar = window.confirm('Deseja rejeitar esta solicitação de atualização?')
    if (!confirmar) return

    setProcessandoSolicitacaoId(solicitacaoSelecionada.id)
    setErro('')
    setMensagem('')

    try {
      const response = await fetch('/api/admin/roteiros/solicitacoes-atualizacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solicitacaoId: solicitacaoSelecionada.id,
          adminId: user.id,
          acao: 'rejeitar',
          observacaoAdmin: solicitacaoForm.observacaoAdmin
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.erro || data?.message || 'Não foi possível rejeitar a solicitação.')
      }

      setMensagem(data?.mensagem || 'Solicitação rejeitada.')
      fecharSolicitacao()
      await carregarSolicitacoes()
    } catch (error: any) {
      console.error('Erro ao rejeitar solicitação:', error)
      setErro(error?.message || 'Erro ao rejeitar solicitação.')
    } finally {
      setProcessandoSolicitacaoId('')
    }
  }

  async function copiarTexto(conteudo: string, label = 'Informação') {
    try {
      await navigator.clipboard?.writeText(conteudo)
      setMensagem(`${label} copiado.`)
    } catch (error) {
      console.warn('Erro ao copiar:', error)
      setMensagem(`${label}: ${conteudo}`)
    }
  }

  function abrirAlterarSenha() {
    setMenuAberto(false)
    setErro('')
    setMensagem('')
    setSenhaAtual('')
    setNovaSenha('')
    setConfirmarSenha('')
    setModalSenhaAberto(true)
  }

  async function alterarSenha(event: FormEvent) {
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

  async function sair() {
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

  const roteirosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca)

    return roteiros.filter((roteiro) => {
      const ocultado = roteiroOcultado(roteiro)

      const passaStatus =
        (filtroStatus === 'todos' && !ocultado) ||
        (filtroStatus === 'ativos' && !ocultado && roteiroAtivo(roteiro)) ||
        (filtroStatus === 'pendentes' && !ocultado && roteiroPendente(roteiro)) ||
        (filtroStatus === 'pausados' && !ocultado && roteiroPausado(roteiro)) ||
        (filtroStatus === 'reprovados' && !ocultado && roteiroReprovado(roteiro)) ||
        (filtroStatus === 'com_reservas' && !ocultado && Number(roteiro.total_reservas || 0) > 0) ||
        (filtroStatus === 'sem_grupo' && !ocultado && !roteiro.grupo?.id) ||
        (filtroStatus === 'ocultados' && ocultado)

      if (!passaStatus) return false
      if (!termo) return true

      const conteudo = normalizarTexto(
        [
          roteiro.id,
          roteiro.titulo,
          roteiro.nome,
          roteiro.descricao,
          roteiro.status,
          roteiro.dificuldade,
          roteiro.recorrencia,
          roteiro.guia_nome,
          localRoteiro(roteiro)
        ].join(' ')
      )

      return conteudo.includes(termo)
    })
  }, [roteiros, busca, filtroStatus])

  function badgeStatus(roteiro: RoteiroCompleto) {
    if (roteiroOcultado(roteiro)) return <span className="badge red">Ocultado Admin</span>
    if (roteiroAtivo(roteiro)) return <span className="badge green">Ativo</span>
    if (roteiroPendente(roteiro)) return <span className="badge yellow">Em análise</span>
    if (roteiroReprovado(roteiro)) return <span className="badge red">Reprovado</span>

    return <span className="badge neutral">Pausado</span>
  }

  function badgeGrupo(roteiro: RoteiroCompleto) {
    if (roteiro.grupo?.id) return <span className="badge blue">Grupo criado</span>
    return <span className="badge neutral">Sem grupo</span>
  }

  function solicitacaoLabel(solicitacao: SolicitacaoAtualizacao) {
    return solicitacao.roteiro_titulo || solicitacao.titulo_atual || 'Roteiro'
  }

  if (carregando || !user) {
    return (
      <main className="loading">
        <style>{styles}</style>
        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>Carregando central de roteiros...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{styles}</style>

      <header className="header">
        <div className="headerInner">
          <button
            type="button"
            className="brand"
            onClick={() => router.push('/admin/dashboard')}
            aria-label="Voltar para dashboard Admin"
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />
            <span>Admin · Roteiros</span>
          </button>

          <div className="headerActions">
            <button type="button" className="topBtn light" onClick={atualizarTudo} disabled={atualizando}>
              {atualizando ? 'Atualizando...' : 'Atualizar'}
            </button>

            <button type="button" className="gearBtn" onClick={() => setMenuAberto((aberto) => !aberto)}>
              ⚙️
            </button>

            {menuAberto && (
              <div className="settingsMenu">
                <button type="button" className="menuButton" onClick={() => router.push('/admin/dashboard')}>
                  🏠 Dashboard
                </button>
                <button type="button" className="menuButton" onClick={abrirAlterarSenha}>
                  🔐 Alterar senha
                </button>
                <button type="button" className="menuButton danger" onClick={sair}>
                  🚪 Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div>
            <div className="eyebrow">Central de comando</div>
            <h1>Roteiros e solicitações</h1>
            <p>
              Aprove, pause, oculte, acompanhe grupos e analise as solicitações de atualização enviadas pelos guias.
            </p>
          </div>

          <div className="heroAside">
            <strong>{solicitacoes.length}</strong>
            <span>solicitações pendentes</span>
            <small>{ultimaAtualizacao ? `Atualizado às ${ultimaAtualizacao}` : 'Aguardando atualização'}</small>
          </div>
        </section>

        {mensagem && <div className="alert success">{mensagem}</div>}
        {erro && <div className="alert error">{erro}</div>}

        <section className="statsGrid">
          <article className="statCard">
            <span>Total</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="statCard">
            <span>Ativos</span>
            <strong>{stats.ativos}</strong>
          </article>
          <article className="statCard">
            <span>Em análise</span>
            <strong>{stats.pendentes}</strong>
          </article>
          <article className="statCard">
            <span>Com reservas</span>
            <strong>{stats.comReservas}</strong>
          </article>
          <article className="statCard">
            <span>Receita confirmada</span>
            <strong>{formatarMoeda(stats.receitaConfirmada)}</strong>
          </article>
          <article className="statCard">
            <span>Avaliação média</span>
            <strong>{formatarNota(stats.mediaAvaliacoes)}</strong>
          </article>
        </section>

        <section className="panel requestPanel">
          <div className="panelHeader">
            <div>
              <h2>Solicitações de atualização</h2>
              <p>Pedidos dos guias para alterar data, hora, local, preço, título ou descrição dos roteiros.</p>
            </div>

            <button type="button" className="smallBtn light" onClick={carregarSolicitacoes} disabled={carregandoSolicitacoes}>
              {carregandoSolicitacoes ? 'Carregando...' : 'Atualizar solicitações'}
            </button>
          </div>

          {solicitacoes.length === 0 ? (
            <div className="emptyBox">Nenhuma solicitação pendente no momento.</div>
          ) : (
            <div className="requestGrid">
              {solicitacoes.map((solicitacao) => {
                const dados = solicitacao.dados_solicitados || {}
                const dataSolicitada = texto(dados.data || solicitacao.data_solicitada)
                const horaSolicitada = texto(dados.hora || solicitacao.hora_solicitada)
                const localSolicitado = texto(dados.local || solicitacao.local_solicitado)

                return (
                  <article className="requestCard" key={solicitacao.id}>
                    <div className="requestTop">
                      <div>
                        <span className="miniLabel">Roteiro</span>
                        <strong>{solicitacaoLabel(solicitacao)}</strong>
                      </div>
                      <span className="badge yellow">Pendente</span>
                    </div>

                    <div className="requestMeta">
                      <div>
                        <span>Guia</span>
                        <strong>{solicitacao.guia_nome || 'Guia'}</strong>
                      </div>
                      <div>
                        <span>Data/hora solicitada</span>
                        <strong>{formatarDataHoraOperacional(dataSolicitada, horaSolicitada)}</strong>
                      </div>
                      <div>
                        <span>Local</span>
                        <strong>{localSolicitado || '-'}</strong>
                      </div>
                    </div>

                    {solicitacao.observacao_guia && (
                      <div className="adminRequestNote compact">
                        <strong>Mensagem do guia</strong>
                        <p>{solicitacao.observacao_guia}</p>
                      </div>
                    )}

                    <div className="cardActions">
                      <button type="button" className="smallBtn dark" onClick={() => abrirSolicitacao(solicitacao)}>
                        Revisar
                      </button>
                      <button
                        type="button"
                        className="smallBtn light"
                        onClick={() => router.push(`/roteiros/${solicitacao.roteiro_id}`)}
                      >
                        Ver roteiro
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>Todos os roteiros</h2>
              <p>Gerencie visibilidade, status, grupos e histórico operacional.</p>
            </div>

            <button type="button" className="smallBtn dark" onClick={() => router.push('/admin/dashboard')}>
              Voltar ao Admin
            </button>
          </div>

          <div className="filters">
            <input
              className="searchInput"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por título, guia, local ou status..."
            />

            <div className="filterPills">
              {(Object.keys(statusLabels) as FiltroStatus[]).map((status) => (
                <button
                  type="button"
                  key={status}
                  className={`filterPill ${filtroStatus === status ? 'active' : ''}`}
                  onClick={() => setFiltroStatus(status)}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          </div>

          {roteirosFiltrados.length === 0 ? (
            <div className="emptyBox">Nenhum roteiro encontrado com os filtros atuais.</div>
          ) : (
            <div className="routesGrid">
              {roteirosFiltrados.map((roteiro) => {
                const imagem = imagemRoteiro(roteiro)
                const status = statusRoteiro(roteiro)

                return (
                  <article className="routeCard" key={roteiro.id}>
                    <div className="routeImage">
                      {imagem ? <img src={imagem} alt={tituloRoteiro(roteiro)} /> : <span>🏞️</span>}
                    </div>

                    <div className="routeBody">
                      <div className="routeTopLine">
                        <div className="badgesWrap">
                          {badgeStatus(roteiro)}
                          {badgeGrupo(roteiro)}
                        </div>
                        <button type="button" className="linkBtn" onClick={() => copiarTexto(roteiro.id, 'ID do roteiro')}>
                          copiar ID
                        </button>
                      </div>

                      <h3>{tituloRoteiro(roteiro)}</h3>
                      <p>{descricaoRoteiro(roteiro) || 'Sem descrição cadastrada.'}</p>

                      <div className="routeInfo">
                        <div>
                          <span>Guia</span>
                          <strong>{roteiro.guia_nome || 'Guia'}</strong>
                        </div>
                        <div>
                          <span>Local</span>
                          <strong>{localRoteiro(roteiro)}</strong>
                        </div>
                        <div>
                          <span>Data/hora</span>
                          <strong>{formatarDataHoraOperacional(dataRoteiro(roteiro), horaRoteiro(roteiro))}</strong>
                        </div>
                        <div>
                          <span>Preço</span>
                          <strong>{formatarMoeda(precoRoteiro(roteiro))}</strong>
                        </div>
                        <div>
                          <span>Distância</span>
                          <strong>{distanciaRoteiro(roteiro) || '-'} km</strong>
                        </div>
                        <div>
                          <span>Duração</span>
                          <strong>{duracaoRoteiro(roteiro)}</strong>
                        </div>
                        <div>
                          <span>Limite</span>
                          <strong>{limitePessoasRoteiro(roteiro) || '-'}</strong>
                        </div>
                        <div>
                          <span>Reservas</span>
                          <strong>{roteiro.total_reservas || 0}</strong>
                        </div>
                      </div>

                      <div className="cardActions">
                        <button type="button" className="smallBtn light" onClick={() => router.push(`/roteiros/${roteiro.id}`)}>
                          Ver
                        </button>
                        <button type="button" className="smallBtn light" onClick={() => setRoteiroSelecionado(roteiro)}>
                          Detalhes
                        </button>

                        {roteiroAtivo(roteiro) ? (
                          <button
                            type="button"
                            className="smallBtn warn"
                            onClick={() => pausarRoteiro(roteiro)}
                            disabled={alterandoStatusId === roteiro.id}
                          >
                            {alterandoStatusId === roteiro.id ? 'Alterando...' : 'Pausar'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="smallBtn green"
                            onClick={() => ativarRoteiro(roteiro)}
                            disabled={alterandoStatusId === roteiro.id || roteiroOcultado(roteiro)}
                          >
                            {alterandoStatusId === roteiro.id ? 'Ativando...' : 'Ativar'}
                          </button>
                        )}

                        <button
                          type="button"
                          className="smallBtn dangerSoft"
                          onClick={() => reprovarRoteiro(roteiro)}
                          disabled={alterandoStatusId === roteiro.id || roteiroOcultado(roteiro)}
                        >
                          Reprovar
                        </button>

                        {!roteiro.grupo?.id && !roteiroOcultado(roteiro) && (
                          <button
                            type="button"
                            className="smallBtn blue"
                            onClick={() => garantirGrupo(roteiro)}
                            disabled={criandoGrupoId === roteiro.id}
                          >
                            {criandoGrupoId === roteiro.id ? 'Criando...' : 'Garantir grupo'}
                          </button>
                        )}

                        <button
                          type="button"
                          className="smallBtn danger"
                          onClick={() => excluirRoteiroAdmin(roteiro)}
                          disabled={excluindoRoteiroId === roteiro.id}
                        >
                          {excluindoRoteiroId === roteiro.id ? 'Removendo...' : 'Remover'}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {solicitacaoSelecionada && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <section className="modal bigModal">
            <div className="modalHeader">
              <div>
                <h2>Revisar solicitação</h2>
                <p>Confira o pedido do guia. Você pode ajustar os dados antes de aprovar e aplicar no roteiro.</p>
              </div>
              <button type="button" className="modalClose" onClick={fecharSolicitacao} disabled={Boolean(processandoSolicitacaoId)}>
                ×
              </button>
            </div>

            <div className="modalBody">
              <div className="compareGrid">
                <div className="compareBox">
                  <span>Como está hoje</span>
                  <strong>{solicitacaoSelecionada.titulo_atual || 'Roteiro'}</strong>
                  <p>{solicitacaoSelecionada.descricao_atual || 'Sem descrição atual registrada.'}</p>
                  <small>
                    {formatarDataHoraOperacional(
                      solicitacaoSelecionada.data_atual || solicitacaoSelecionada.dados_atuais?.data,
                      solicitacaoSelecionada.hora_atual || solicitacaoSelecionada.dados_atuais?.hora
                    )}
                    {' · '}
                    {solicitacaoSelecionada.local_atual || solicitacaoSelecionada.dados_atuais?.local || 'Local não informado'}
                  </small>
                </div>

                <div className="compareBox requested">
                  <span>Pedido do guia</span>
                  <strong>{solicitacaoSelecionada.titulo_solicitado || solicitacaoSelecionada.dados_solicitados?.titulo || 'Sem alteração de título'}</strong>
                  <p>{solicitacaoSelecionada.descricao_solicitada || solicitacaoSelecionada.dados_solicitados?.descricao || 'Sem alteração de descrição.'}</p>
                  <small>
                    {formatarDataHoraOperacional(
                      solicitacaoSelecionada.data_solicitada || solicitacaoSelecionada.dados_solicitados?.data,
                      solicitacaoSelecionada.hora_solicitada || solicitacaoSelecionada.dados_solicitados?.hora
                    )}
                    {' · '}
                    {solicitacaoSelecionada.local_solicitado || solicitacaoSelecionada.dados_solicitados?.local || 'Local não informado'}
                  </small>
                </div>
              </div>

              {solicitacaoSelecionada.observacao_guia && (
                <div className="adminRequestNote">
                  <strong>Mensagem do guia</strong>
                  <p>{solicitacaoSelecionada.observacao_guia}</p>
                </div>
              )}

              <div className="formGrid">
                <label className="field">
                  <span>Título aprovado</span>
                  <input
                    value={solicitacaoForm.titulo}
                    onChange={(event) => setSolicitacaoForm((prev) => ({ ...prev, titulo: event.target.value }))}
                    placeholder="Título do roteiro"
                  />
                </label>

                <label className="field">
                  <span>Preço aprovado</span>
                  <input
                    value={solicitacaoForm.preco}
                    onChange={(event) => setSolicitacaoForm((prev) => ({ ...prev, preco: event.target.value }))}
                    inputMode="decimal"
                    placeholder="0,00"
                  />
                </label>

                <label className="field">
                  <span>Data aprovada</span>
                  <input
                    type="date"
                    value={solicitacaoForm.data}
                    onChange={(event) => setSolicitacaoForm((prev) => ({ ...prev, data: event.target.value }))}
                  />
                </label>

                <label className="field">
                  <span>Hora aprovada</span>
                  <input
                    type="time"
                    value={solicitacaoForm.hora}
                    onChange={(event) => setSolicitacaoForm((prev) => ({ ...prev, hora: event.target.value }))}
                  />
                </label>

                <label className="field full">
                  <span>Local aprovado</span>
                  <input
                    value={solicitacaoForm.local}
                    onChange={(event) => setSolicitacaoForm((prev) => ({ ...prev, local: event.target.value }))}
                    placeholder="Local, ponto de encontro ou embarque"
                  />
                </label>

                <label className="field full">
                  <span>Descrição aprovada</span>
                  <textarea
                    value={solicitacaoForm.descricao}
                    onChange={(event) => setSolicitacaoForm((prev) => ({ ...prev, descricao: event.target.value }))}
                    placeholder="Descrição detalhada do roteiro"
                  />
                </label>

                <label className="field full">
                  <span>Observação do Admin</span>
                  <textarea
                    value={solicitacaoForm.observacaoAdmin}
                    onChange={(event) => setSolicitacaoForm((prev) => ({ ...prev, observacaoAdmin: event.target.value }))}
                    placeholder="Opcional. Explique aprovação, ajuste ou rejeição."
                  />
                </label>
              </div>

              <div className="modalNotice">
                Data e hora são enviadas como texto operacional para evitar alteração automática por fuso horário. A API deve aplicar o timestamp completo com fuso -03:00 quando necessário.
              </div>

              <div className="modalActions">
                <button
                  type="button"
                  className="smallBtn green"
                  onClick={aprovarSolicitacao}
                  disabled={processandoSolicitacaoId === solicitacaoSelecionada.id}
                >
                  {processandoSolicitacaoId === solicitacaoSelecionada.id ? 'Aplicando...' : 'Aprovar e aplicar'}
                </button>

                <button
                  type="button"
                  className="smallBtn dangerSoft"
                  onClick={rejeitarSolicitacao}
                  disabled={processandoSolicitacaoId === solicitacaoSelecionada.id}
                >
                  Rejeitar
                </button>

                <button
                  type="button"
                  className="smallBtn light"
                  onClick={fecharSolicitacao}
                  disabled={processandoSolicitacaoId === solicitacaoSelecionada.id}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {roteiroSelecionado && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <section className="modal bigModal">
            <div className="modalHeader">
              <div>
                <h2>{tituloRoteiro(roteiroSelecionado)}</h2>
                <p>Detalhes administrativos do roteiro.</p>
              </div>
              <button type="button" className="modalClose" onClick={() => setRoteiroSelecionado(null)}>
                ×
              </button>
            </div>

            <div className="modalBody">
              <div className="detailGrid">
                <div>
                  <span>ID</span>
                  <strong>{roteiroSelecionado.id}</strong>
                </div>
                <div>
                  <span>Guia</span>
                  <strong>{roteiroSelecionado.guia_nome || 'Guia'}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{statusRoteiro(roteiroSelecionado)}</strong>
                </div>
                <div>
                  <span>Ativo</span>
                  <strong>{roteiroSelecionado.ativo ? 'Sim' : 'Não'}</strong>
                </div>
                <div>
                  <span>Reservas</span>
                  <strong>{roteiroSelecionado.total_reservas || 0}</strong>
                </div>
                <div>
                  <span>Receita</span>
                  <strong>{formatarMoeda(roteiroSelecionado.receita_confirmada || 0)}</strong>
                </div>
              </div>

              <div className="adminRequestNote neutralNote">
                <strong>Descrição</strong>
                <p>{descricaoRoteiro(roteiroSelecionado) || 'Sem descrição.'}</p>
              </div>

              <div className="modalActions">
                <button type="button" className="smallBtn light" onClick={() => router.push(`/roteiros/${roteiroSelecionado.id}`)}>
                  Ver público
                </button>
                <button type="button" className="smallBtn dark" onClick={() => copiarTexto(roteiroSelecionado.id, 'ID do roteiro')}>
                  Copiar ID
                </button>
                <button type="button" className="smallBtn light" onClick={() => setRoteiroSelecionado(null)}>
                  Fechar
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {modalSenhaAberto && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <form className="modal" onSubmit={alterarSenha}>
            <div className="modalHeader">
              <div>
                <h2>Alterar senha</h2>
                <p>Atualize sua senha administrativa.</p>
              </div>
              <button type="button" className="modalClose" onClick={() => setModalSenhaAberto(false)}>
                ×
              </button>
            </div>

            <div className="modalBody">
              <label className="field full">
                <span>Senha atual</span>
                <input
                  type="password"
                  value={senhaAtual}
                  onChange={(event) => setSenhaAtual(event.target.value)}
                  placeholder="Digite sua senha atual"
                />
              </label>

              <label className="field full">
                <span>Nova senha</span>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(event) => setNovaSenha(event.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                />
              </label>

              <label className="field full">
                <span>Confirmar nova senha</span>
                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={(event) => setConfirmarSenha(event.target.value)}
                  placeholder="Repita a nova senha"
                />
              </label>

              <div className="modalActions">
                <button type="submit" className="smallBtn dark" disabled={alterandoSenha}>
                  {alterandoSenha ? 'Alterando...' : 'Salvar senha'}
                </button>
                <button type="button" className="smallBtn light" onClick={() => setModalSenhaAberto(false)} disabled={alterandoSenha}>
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

const styles = `
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    background: #f6f7f1;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .page,
  .loading {
    min-height: 100vh;
    min-height: 100dvh;
    color: #172018;
    background:
      radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.16), transparent 28%),
      radial-gradient(circle at 90% 10%, rgba(251, 146, 60, 0.14), transparent 28%),
      linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loadingCard {
    width: min(360px, calc(100vw - 32px));
    border-radius: 30px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(15, 23, 42, 0.08);
    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
    padding: 28px;
    text-align: center;
    font-weight: 900;
    color: #203c2e;
  }

  .loadingCard img {
    height: 64px;
    width: auto;
    margin-bottom: 12px;
  }

  .header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(255, 253, 247, 0.90);
    border-bottom: 1px solid rgba(15, 23, 42, 0.06);
    backdrop-filter: blur(18px);
    padding: 8px 14px;
  }

  .headerInner {
    max-width: 1180px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
  }

  .brand {
    border: 0;
    background: transparent;
    padding: 0;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    width: fit-content;
    max-width: 100%;
    min-width: 0;
    cursor: pointer;
    text-align: left;
  }

  .brand img {
    width: 104px;
    height: 56px;
    object-fit: contain;
    display: block;
    flex: 0 0 auto;
  }

  .brand span {
    color: #203c2e;
    font-size: clamp(19px, 2.5vw, 30px);
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.06em;
    white-space: nowrap;
  }

  .headerActions {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }

  .gearBtn,
  .topBtn,
  .smallBtn,
  .linkBtn,
  .filterPill,
  .modalClose,
  .menuButton {
    font-family: inherit;
  }

  .gearBtn {
    width: 42px;
    height: 42px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    background: rgba(255, 255, 255, 0.84);
    color: #172018;
    border-radius: 999px;
    cursor: pointer;
    font-size: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
  }

  .settingsMenu {
    position: absolute;
    top: 52px;
    right: 0;
    width: 232px;
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
      linear-gradient(135deg, rgba(23, 32, 24, 0.80), rgba(23, 32, 24, 0.42)),
      radial-gradient(circle at top right, rgba(190, 242, 100, 0.30), transparent 34%),
      linear-gradient(135deg, #1f331f 0%, #647a49 46%, #d7c6a1 100%);
    color: #ffffff;
    box-shadow: 0 24px 60px rgba(23, 32, 24, 0.18);
    margin-bottom: 16px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 220px;
    gap: 20px;
    align-items: end;
  }

  .eyebrow {
    display: inline-flex;
    width: fit-content;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.24);
    background: rgba(255, 255, 255, 0.12);
    color: #f7fee7;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .hero h1 {
    margin: 0;
    font-size: clamp(40px, 5.6vw, 72px);
    line-height: 0.92;
    font-weight: 950;
    letter-spacing: -0.085em;
  }

  .hero p {
    max-width: 690px;
    color: rgba(255, 255, 255, 0.82);
    line-height: 1.6;
    margin: 14px 0 0;
    font-size: 14px;
    font-weight: 650;
  }

  .heroAside {
    background: rgba(255, 255, 255, 0.14);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 28px;
    padding: 18px;
    backdrop-filter: blur(14px);
  }

  .heroAside strong {
    display: block;
    color: #bef264;
    font-size: 42px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.06em;
  }

  .heroAside span,
  .heroAside small {
    display: block;
    color: rgba(255, 255, 255, 0.78);
    font-size: 12px;
    line-height: 1.35;
    font-weight: 800;
    margin-top: 6px;
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
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 16px;
  }

  .statCard,
  .panel,
  .requestCard,
  .routeCard,
  .modal,
  .compareBox,
  .detailGrid > div {
    background: rgba(255, 255, 255, 0.90);
    border: 1px solid rgba(15, 23, 42, 0.06);
    box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
  }

  .statCard {
    border-radius: 24px;
    padding: 16px;
  }

  .statCard span,
  .routeInfo span,
  .detailGrid span,
  .requestMeta span,
  .compareBox span,
  .miniLabel,
  .field span {
    display: block;
    color: #64748b;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .statCard strong {
    color: #172018;
    font-size: 20px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.05em;
  }

  .panel {
    border-radius: 30px;
    padding: 18px;
    margin-bottom: 16px;
    overflow: hidden;
  }

  .requestPanel {
    background:
      radial-gradient(circle at top right, rgba(190, 242, 100, 0.12), transparent 34%),
      rgba(255, 255, 255, 0.92);
  }

  .panelHeader {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .panelHeader h2 {
    margin: 0;
    color: #172018;
    font-size: 24px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.055em;
  }

  .panelHeader p {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 750;
  }

  .filters {
    display: grid;
    gap: 12px;
    margin-bottom: 16px;
  }

  .searchInput,
  .field input,
  .field textarea {
    width: 100%;
    border: 1px solid rgba(15, 23, 42, 0.08);
    background: #fffdf7;
    border-radius: 18px;
    padding: 13px 14px;
    font-size: 14px;
    color: #172018;
    outline: none;
    font-weight: 750;
  }

  .field textarea {
    min-height: 110px;
    resize: vertical;
    line-height: 1.55;
  }

  .searchInput:focus,
  .field input:focus,
  .field textarea:focus {
    border-color: #84cc16;
    box-shadow: 0 0 0 4px rgba(132, 204, 22, 0.12);
  }

  .filterPills {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .filterPill {
    border: 1px solid rgba(15, 23, 42, 0.08);
    background: #fffdf7;
    color: #475569;
    border-radius: 999px;
    padding: 9px 12px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
  }

  .filterPill.active {
    background: #172018;
    color: #ffffff;
  }

  .requestGrid,
  .routesGrid {
    display: grid;
    gap: 12px;
  }

  .requestGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .requestCard,
  .routeCard {
    border-radius: 26px;
    overflow: hidden;
  }

  .requestCard {
    padding: 16px;
  }

  .requestTop,
  .routeTopLine,
  .reviewTop {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
  }

  .requestTop strong,
  .compareBox strong {
    display: block;
    color: #172018;
    font-size: 16px;
    line-height: 1.15;
    font-weight: 950;
    letter-spacing: -0.035em;
  }

  .requestMeta {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-top: 12px;
  }

  .requestMeta div,
  .routeInfo div,
  .detailGrid > div {
    border-radius: 18px;
    background: rgba(32, 60, 46, 0.045);
    padding: 11px;
    min-width: 0;
  }

  .requestMeta strong,
  .routeInfo strong,
  .detailGrid strong {
    display: block;
    color: #203c2e;
    font-size: 12px;
    line-height: 1.35;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .routeCard {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    align-items: stretch;
  }

  .routeImage {
    min-height: 232px;
    background: #eef2e5;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    font-size: 42px;
    overflow: hidden;
  }

  .routeImage img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .routeBody {
    padding: 16px;
    min-width: 0;
  }

  .badgesWrap,
  .cardActions,
  .modalActions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }

  .routeBody h3 {
    margin: 12px 0 0;
    color: #172018;
    font-size: 23px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.055em;
  }

  .routeBody p {
    margin: 9px 0 0;
    color: #64748b;
    font-size: 13px;
    line-height: 1.55;
    font-weight: 700;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .routeInfo,
  .detailGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    margin-top: 14px;
  }

  .cardActions {
    margin-top: 14px;
  }

  .badge {
    display: inline-flex;
    border-radius: 999px;
    padding: 7px 9px;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .badge.green {
    background: #dcfce7;
    color: #166534;
  }

  .badge.yellow {
    background: #fef3c7;
    color: #92400e;
  }

  .badge.red {
    background: #fee2e2;
    color: #991b1b;
  }

  .badge.blue {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .badge.neutral {
    background: #f1f5f9;
    color: #475569;
  }

  .smallBtn,
  .topBtn,
  .linkBtn {
    border: none;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
    transition: 0.18s ease;
    white-space: nowrap;
  }

  .smallBtn,
  .topBtn {
    padding: 10px 13px;
  }

  .smallBtn:hover:not(:disabled),
  .topBtn:hover:not(:disabled),
  .linkBtn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 22px rgba(15, 23, 42, 0.10);
  }

  .smallBtn:disabled,
  .topBtn:disabled,
  .linkBtn:disabled {
    opacity: 0.62;
    cursor: not-allowed;
  }

  .smallBtn.dark,
  .topBtn.dark {
    background: #172018;
    color: #ffffff;
  }

  .smallBtn.light,
  .topBtn.light {
    background: #eef2e5;
    color: #475569;
  }

  .smallBtn.green {
    background: #16a34a;
    color: #ffffff;
  }

  .smallBtn.warn {
    background: #f59e0b;
    color: #ffffff;
  }

  .smallBtn.blue {
    background: #2563eb;
    color: #ffffff;
  }

  .smallBtn.danger {
    background: #991b1b;
    color: #ffffff;
  }

  .smallBtn.dangerSoft {
    background: #fee2e2;
    color: #991b1b;
  }

  .linkBtn {
    background: transparent;
    color: #64748b;
    padding: 5px 0;
    text-decoration: underline;
  }

  .emptyBox {
    border: 1px dashed rgba(15, 23, 42, 0.16);
    border-radius: 22px;
    padding: 22px;
    color: #64748b;
    text-align: center;
    font-size: 13px;
    line-height: 1.5;
    font-weight: 750;
    background: #fffdf7;
  }

  .adminRequestNote {
    border-radius: 18px;
    background: #fff7ed;
    border: 1px solid #fed7aa;
    padding: 14px;
    margin-top: 12px;
  }

  .adminRequestNote.compact {
    padding: 12px;
  }

  .adminRequestNote.neutralNote {
    background: #f8fafc;
    border-color: rgba(15, 23, 42, 0.08);
  }

  .adminRequestNote strong {
    display: block;
    color: #9a3412;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
  }

  .adminRequestNote.neutralNote strong {
    color: #475569;
  }

  .adminRequestNote p {
    margin: 0;
    color: #7c2d12;
    font-size: 13px;
    line-height: 1.55;
    font-weight: 750;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .adminRequestNote.neutralNote p {
    color: #475569;
  }

  .modalOverlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(15, 23, 42, 0.52);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    backdrop-filter: blur(8px);
  }

  .modal {
    width: 100%;
    max-width: 460px;
    max-height: calc(100vh - 36px);
    overflow: auto;
    border-radius: 28px;
  }

  .bigModal {
    max-width: 880px;
  }

  .modalHeader {
    padding: 20px;
    border-bottom: 1px solid rgba(15, 23, 42, 0.08);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  .modalHeader h2 {
    margin: 0;
    color: #172018;
    font-size: 24px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.055em;
  }

  .modalHeader p {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 750;
  }

  .modalClose {
    width: 38px;
    height: 38px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    background: #f8fafc;
    color: #172018;
    border-radius: 999px;
    font-size: 24px;
    line-height: 1;
    font-weight: 800;
    cursor: pointer;
  }

  .modalBody {
    padding: 20px;
    display: grid;
    gap: 14px;
  }

  .compareGrid,
  .formGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .compareBox {
    border-radius: 22px;
    padding: 14px;
    min-width: 0;
  }

  .compareBox.requested {
    background: #f0fdf4;
    border-color: #bbf7d0;
  }

  .compareBox p {
    color: #64748b;
    font-size: 13px;
    line-height: 1.5;
    font-weight: 700;
    margin: 8px 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .compareBox small {
    color: #203c2e;
    font-size: 12px;
    font-weight: 900;
  }

  .field {
    display: grid;
    gap: 7px;
  }

  .field.full {
    grid-column: 1 / -1;
  }

  .modalNotice {
    border-radius: 18px;
    padding: 12px 13px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #1d4ed8;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.45;
  }

  .modalActions {
    justify-content: flex-end;
  }

  @media (max-width: 1100px) {
    .statsGrid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .routeCard {
      grid-template-columns: 200px minmax(0, 1fr);
    }

    .routeInfo {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 820px) {
    .headerInner {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .brand img {
      width: 82px;
      height: 46px;
    }

    .brand span {
      font-size: 18px;
    }

    .topBtn {
      display: none;
    }

    .container {
      padding: 16px 12px 42px;
    }

    .hero {
      grid-template-columns: 1fr;
      border-radius: 28px;
      padding: 22px;
    }

    .hero h1 {
      font-size: 42px;
    }

    .statsGrid,
    .requestGrid,
    .compareGrid,
    .formGrid,
    .detailGrid,
    .requestMeta {
      grid-template-columns: 1fr;
    }

    .panel {
      border-radius: 24px;
      padding: 14px;
    }

    .routeCard {
      grid-template-columns: 1fr;
    }

    .routeImage {
      min-height: 190px;
    }

    .routeBody h3 {
      font-size: 21px;
    }
  }

  @media (max-width: 480px) {
    .brand span {
      display: none;
    }

    .statsGrid,
    .routeInfo {
      grid-template-columns: 1fr;
    }

    .cardActions,
    .modalActions {
      display: grid;
      grid-template-columns: 1fr;
      width: 100%;
    }

    .smallBtn,
    .topBtn {
      width: 100%;
    }

    .modalOverlay {
      padding: 10px;
      align-items: flex-end;
    }

    .modal {
      border-radius: 26px 26px 18px 18px;
      max-height: calc(100vh - 20px);
    }
  }
`
