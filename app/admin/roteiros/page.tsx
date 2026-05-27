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
  descricao?: string | null
  status?: string | null
  ativo?: boolean | null
  preco?: number | null
  valor?: number | null
  id_guia?: string | null
  guia_id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  local?: string | null
  localizacao?: string | null
  local_encontro?: string | null
  ponto_encontro?: string | null
  dificuldade?: string | null
  duracao_horas?: number | null
  duracao?: string | null
  km?: number | null
  distancia_km?: number | null
  limite_pessoas?: number | null
  capacidade?: number | null
  max_pessoas?: number | null
  recorrencia?: string | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  imagem?: string | null
  created_at?: string | null
  updated_at?: string | null
  excluido_admin?: boolean | null
  excluido_em?: string | null
  excluido_por?: string | null
  motivo_exclusao?: string | null
  exclusao_tipo?: string | null
  [key: string]: any
}

type Reserva = {
  id: string
  roteiro_id?: string | null
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

type FiltroStatus = 'todos' | 'ativos' | 'pendentes' | 'pausados' | 'reprovados' | 'com_reservas' | 'sem_grupo' | 'ocultados'

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

export default function AdminRoteirosPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [roteiros, setRoteiros] = useState<RoteiroCompleto[]>([])
  const [roteiroSelecionado, setRoteiroSelecionado] = useState<RoteiroCompleto | null>(null)
  const [stats, setStats] = useState<Stats>(statsInicial)

  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
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
      await carregarRoteiros()
    } catch (error) {
      console.error('Erro ao iniciar roteiros admin:', error)
      setErro('Não foi possível carregar os roteiros agora.')
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

  const guiaIdDoRoteiro = (roteiro?: Roteiro | null) => {
    return roteiro?.id_guia || roteiro?.guia_id || roteiro?.user_id || roteiro?.usuario_id || ''
  }

  const localRoteiro = (roteiro?: Roteiro | null) => {
    return (
      roteiro?.local ||
      roteiro?.localizacao ||
      roteiro?.local_encontro ||
      roteiro?.ponto_encontro ||
      'Local a confirmar'
    )
  }

  const imagemRoteiro = (roteiro?: Roteiro | null) => {
    return roteiro?.foto_capa || roteiro?.foto_url || roteiro?.imagem_url || roteiro?.imagem || ''
  }

  const precoRoteiro = (roteiro?: Roteiro | null) => {
    return Number(roteiro?.preco || roteiro?.valor || 0)
  }

  const distanciaRoteiro = (roteiro?: Roteiro | null) => {
    return Number(roteiro?.distancia_km || roteiro?.km || 0)
  }

  const limitePessoasRoteiro = (roteiro?: Roteiro | null) => {
    return Number(roteiro?.limite_pessoas || roteiro?.capacidade || roteiro?.max_pessoas || 0)
  }

  const duracaoRoteiro = (roteiro?: Roteiro | null) => {
    if (roteiro?.duracao_horas) return `${roteiro.duracao_horas}h`
    if (roteiro?.duracao) return roteiro.duracao

    return '-'
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

  const formatarMoeda = (valor: any) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(valor || 0))
  }

  const formatarNota = (valor: any) => {
    return Number(valor || 0).toFixed(2).replace('.', ',')
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

  const statusRoteiro = (roteiro: Roteiro) => {
    const status = normalizar(roteiro.status)

    if (
      roteiro?.excluido_admin === true ||
      status === 'excluido_admin' ||
      status === 'ocultado_admin' ||
      status === 'removido_admin'
    ) {
      return 'excluido_admin'
    }

    if (status) return status
    if (roteiro.ativo === true) return 'ativo'
    if (roteiro.ativo === false) return 'pausado'

    return 'pendente'
  }

  const roteiroAtivo = (roteiro: Roteiro) => {
    const status = statusRoteiro(roteiro)

    if (status === 'excluido_admin') return false

    return (
      roteiro.ativo === true ||
      status === 'ativo' ||
      status === 'aprovado' ||
      status === 'publicado'
    )
  }

  const roteiroPendente = (roteiro: Roteiro) => {
    const status = statusRoteiro(roteiro)

    return (
      status === 'pendente' ||
      status === 'aguardando' ||
      status === 'em_analise' ||
      status === 'analise'
    )
  }

  const roteiroPausado = (roteiro: Roteiro) => {
    const status = statusRoteiro(roteiro)

    return (
      roteiro.ativo === false &&
      !roteiroPendente(roteiro) &&
      !roteiroReprovado(roteiro)
    ) || status === 'pausado' || status === 'inativo'
  }

  const roteiroReprovado = (roteiro: Roteiro) => {
    const status = statusRoteiro(roteiro)

    return status === 'reprovado' || status === 'recusado' || status === 'negado'
  }

  const roteiroOcultado = (roteiro: Roteiro) => {
    return statusRoteiro(roteiro) === 'excluido_admin'
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

  const erroDeConstraintStatus = (error: any) => {
    const texto = String(
      error?.message ||
        error?.details ||
        error?.hint ||
        ''
    ).toLowerCase()

    return (
      error?.code === '23514' &&
      (
        texto.includes('status') ||
        texto.includes('roteiros_status') ||
        texto.includes('check constraint')
      )
    )
  }

  const carregarRoteiros = async () => {
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

    const roteirosBase = (roteirosData || []) as Roteiro[]

    const roteiroIds = roteirosBase.map((roteiro) => roteiro.id)

    const guiaIds = Array.from(
      new Set(
        roteirosBase
          .map(guiaIdDoRoteiro)
          .filter(Boolean)
      )
    )

    let guias: UsuarioBanco[] = []
    let reservas: Reserva[] = []
    let grupos: GrupoRoteiro[] = []
    let avaliacoes: Avaliacao[] = []

    if (guiaIds.length > 0) {
      const { data: guiasData, error: guiasError } = await supabase
        .from('users')
        .select('id, nome, name, email, tipo')
        .in('id', guiaIds)

      if (guiasError) {
        console.warn('Erro ao buscar guias dos roteiros:', guiasError)
      }

      guias = (guiasData || []) as UsuarioBanco[]
    }

    if (roteiroIds.length > 0) {
      const { data: reservasData, error: reservasError } = await supabase
        .from('reservas')
        .select('*')
        .in('roteiro_id', roteiroIds)
        .limit(2500)

      if (reservasError) {
        console.warn('Erro ao buscar reservas dos roteiros:', reservasError)
      }

      reservas = (reservasData || []) as Reserva[]

      const { data: gruposData, error: gruposError } = await supabase
        .from('grupos_roteiros')
        .select('*')
        .in('roteiro_id', roteiroIds)
        .limit(1500)

      if (gruposError) {
        console.warn('Erro ao buscar grupos dos roteiros:', gruposError)
      }

      grupos = (gruposData || []) as GrupoRoteiro[]

      const { data: avaliacoesData, error: avaliacoesError } = await supabase
        .from('avaliacoes')
        .select('id, roteiro_id, nota, status, created_at')
        .in('roteiro_id', roteiroIds)
        .limit(2500)

      if (avaliacoesError) {
        console.warn('Erro ao buscar avaliações dos roteiros:', avaliacoesError)
      }

      avaliacoes = (avaliacoesData || []) as Avaliacao[]
    }

    const roteirosCompletos: RoteiroCompleto[] = roteirosBase.map((roteiro) => {
      const guiaId = guiaIdDoRoteiro(roteiro)

      const guia =
        guias.find((item) => item.id === guiaId) ||
        null

      const reservasDoRoteiro = reservas.filter((reserva) => reserva.roteiro_id === roteiro.id)
      const reservasConfirmadas = reservasDoRoteiro.filter(pagamentoConfirmado)

      const receitaConfirmada = reservasConfirmadas.reduce(
        (total, reserva) => total + Number(reserva.valor_total || 0),
        0
      )

      const grupo =
        grupos.find((item) => item.roteiro_id === roteiro.id) ||
        null

      const avaliacoesDoRoteiro = avaliacoes.filter((avaliacao) => {
        const status = normalizar(avaliacao.status)
        return avaliacao.roteiro_id === roteiro.id && (!status || status === 'publicada')
      })

      const somaNotas = avaliacoesDoRoteiro.reduce(
        (total, avaliacao) => total + Number(avaliacao.nota || 0),
        0
      )

      const mediaAvaliacao =
        avaliacoesDoRoteiro.length > 0
          ? somaNotas / avaliacoesDoRoteiro.length
          : 0

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

    const receitaConfirmada = roteirosCompletos.reduce(
      (total, roteiro) => total + Number(roteiro.receita_confirmada || 0),
      0
    )

    const totalAvaliacoes = roteirosCompletos.reduce(
      (total, roteiro) => total + Number(roteiro.total_avaliacoes || 0),
      0
    )

    const somaMediasPonderadas = roteirosCompletos.reduce(
      (total, roteiro) => {
        return total + Number(roteiro.media_avaliacao || 0) * Number(roteiro.total_avaliacoes || 0)
      },
      0
    )

    setRoteiros(roteirosCompletos)

    const roteirosVisiveis = roteirosCompletos.filter((roteiro) => !roteiroOcultado(roteiro))

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

  const atualizar = async () => {
    setAtualizando(true)
    setMensagem('')
    setErro('')

    try {
      await carregarRoteiros()
      setMensagem('Roteiros atualizados.')
    } catch (error) {
      console.error('Erro ao atualizar roteiros:', error)
      setErro('Não foi possível atualizar os roteiros agora.')
    } finally {
      setAtualizando(false)
    }
  }

  const atualizarRoteiroComFallback = async (
    roteiroId: string,
    payloadOriginal: Record<string, any>
  ) => {
    let payloadAtual = { ...payloadOriginal }

    for (let tentativa = 0; tentativa < 12; tentativa++) {
      const { error } = await supabase
        .from('roteiros')
        .update(payloadAtual)
        .eq('id', roteiroId)

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

    throw new Error('Não foi possível atualizar o roteiro.')
  }

  const alterarStatusComTentativas = async (
    roteiroId: string,
    statusPossiveis: string[],
    ativo: boolean
  ) => {
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

        if (!erroDeConstraintStatus(error)) {
          throw error
        }

        console.warn(`Status "${status}" recusado pelo banco. Tentando próximo...`, error)
      }
    }

    throw ultimoErro || new Error('Status não aceito pelo banco.')
  }

  const ativarRoteiro = async (roteiro: RoteiroCompleto) => {
    if (!roteiro?.id) return

    setAlterandoStatusId(roteiro.id)
    setMensagem('')
    setErro('')

    try {
      const statusUsado = await alterarStatusComTentativas(
        roteiro.id,
        ['ativo', 'aprovado', 'publicado'],
        true
      )

      setMensagem(`Roteiro ativado com sucesso. Status usado: ${statusUsado}.`)
      await carregarRoteiros()
    } catch (error: any) {
      console.error('Erro ao ativar roteiro:', error)
      setErro(error?.message || 'Não foi possível ativar o roteiro.')
    } finally {
      setAlterandoStatusId('')
    }
  }

  const pausarRoteiro = async (roteiro: RoteiroCompleto) => {
    if (!roteiro?.id) return

    setAlterandoStatusId(roteiro.id)
    setMensagem('')
    setErro('')

    try {
      const statusUsado = await alterarStatusComTentativas(
        roteiro.id,
        ['pausado', 'inativo', 'pendente'],
        false
      )

      setMensagem(`Roteiro pausado com sucesso. Status usado: ${statusUsado}.`)
      await carregarRoteiros()
    } catch (error: any) {
      console.error('Erro ao pausar roteiro:', error)
      setErro(error?.message || 'Não foi possível pausar o roteiro.')
    } finally {
      setAlterandoStatusId('')
    }
  }

  const reprovarRoteiro = async (roteiro: RoteiroCompleto) => {
    if (!roteiro?.id) return

    const confirmar = window.confirm(
      'Deseja marcar este roteiro como reprovado/recusado?'
    )

    if (!confirmar) return

    setAlterandoStatusId(roteiro.id)
    setMensagem('')
    setErro('')

    try {
      const statusUsado = await alterarStatusComTentativas(
        roteiro.id,
        ['reprovado', 'recusado', 'pendente'],
        false
      )

      setMensagem(`Roteiro atualizado com sucesso. Status usado: ${statusUsado}.`)
      await carregarRoteiros()
    } catch (error: any) {
      console.error('Erro ao reprovar roteiro:', error)
      setErro(error?.message || 'Não foi possível reprovar o roteiro.')
    } finally {
      setAlterandoStatusId('')
    }
  }

  const garantirGrupo = async (roteiro: RoteiroCompleto) => {
    if (!roteiro?.id) return

    setCriandoGrupoId(roteiro.id)
    setMensagem('')
    setErro('')

    try {
      const response = await fetch('/api/grupos/garantir-grupo-roteiro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roteiroId: roteiro.id
        })
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

  const excluirRoteiroAdmin = async (roteiro: RoteiroCompleto) => {
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
        `Regra de segurança:\n` +
        `• Roteiro sem reservas pode ser apagado definitivamente.\n` +
        `• Roteiro com reservas, grupo, pagamento ou suspeita de fraude será apenas ocultado/desativado para preservar histórico e auditoria.\n\n` +
        `Reservas vinculadas: ${roteiro.total_reservas || 0}\n` +
        `Receita confirmada: ${formatarMoeda(roteiro.receita_confirmada || 0)}\n` +
        `Grupo interno: ${temGrupo ? 'sim' : 'não'}`
    )

    if (!confirmar) return

    const motivo = window.prompt(
      `Informe o motivo administrativo da remoção:\n\n` +
        `Exemplos:\n` +
        `- Roteiro criado na fase de testes\n` +
        `- Roteiro duplicado\n` +
        `- Suspeita de fraude\n` +
        `- Guia não autorizado\n` +
        `- Conteúdo irregular`
    )

    if (!motivo || !motivo.trim()) {
      setErro('Exclusão cancelada. O motivo é obrigatório.')
      return
    }

    const podeSugerirExclusaoDefinitiva = !temReservas && !temReceita && !temGrupo

    const modo = window.prompt(
      podeSugerirExclusaoDefinitiva
        ? `Digite APAGAR para excluir definitivamente ou OCULTAR para apenas desativar.\n\nNa dúvida, use OCULTAR.`
        : `Este roteiro possui vínculos. Por segurança, digite OCULTAR para desativar e preservar histórico.`
    )

    if (!modo) return

    const modoNormalizado = modo.trim().toUpperCase()

    if (modoNormalizado !== 'APAGAR' && modoNormalizado !== 'OCULTAR') {
      setErro('Opção inválida. Digite apenas APAGAR ou OCULTAR.')
      return
    }

    const definitivo = modoNormalizado === 'APAGAR' && podeSugerirExclusaoDefinitiva

    if (modoNormalizado === 'APAGAR' && !podeSugerirExclusaoDefinitiva) {
      setMensagem('Por segurança, o roteiro será ocultado/desativado, pois possui vínculos administrativos.')
    }

    const segundaConfirmacao = window.confirm(
      definitivo
        ? `Confirma a EXCLUSÃO DEFINITIVA do roteiro "${titulo}"?\n\nEssa opção deve ser usada apenas para roteiros de teste sem vínculos.`
        : `Confirma a OCULTAÇÃO/DESATIVAÇÃO administrativa do roteiro "${titulo}"?\n\nO roteiro sairá da listagem principal, mas o histórico será preservado.`
    )

    if (!segundaConfirmacao) return

    setExcluindoRoteiroId(roteiro.id)
    setErro('')
    setMensagem('')

    try {
      const response = await fetch('/api/admin/roteiros/excluir', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roteiroId: roteiro.id,
          adminId: user?.id || null,
          motivo: motivo.trim(),
          definitivo
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || data?.erro || 'Não foi possível remover o roteiro.')
      }

      setRoteiroSelecionado((selecionado) =>
        selecionado?.id === roteiro.id ? null : selecionado
      )

      await carregarRoteiros()

      setMensagem(data?.message || 'Roteiro removido da listagem principal.')
    } catch (error: any) {
      console.error('Erro ao excluir/ocultar roteiro:', error)
      setErro(error?.message || 'Erro ao excluir/ocultar roteiro.')
    } finally {
      setExcluindoRoteiroId('')
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

  const roteirosFiltrados = useMemo(() => {
    const termo = normalizar(busca)

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

      const texto = normalizar(
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

      return texto.includes(termo)
    })
  }, [roteiros, busca, filtroStatus])

  const badgeStatus = (roteiro: RoteiroCompleto) => {
    if (roteiroOcultado(roteiro)) return <span className="badge red">Ocultado Admin</span>
    if (roteiroAtivo(roteiro)) return <span className="badge green">Ativo</span>
    if (roteiroPendente(roteiro)) return <span className="badge yellow">Em análise</span>
    if (roteiroReprovado(roteiro)) return <span className="badge red">Reprovado</span>

    return <span className="badge neutral">Pausado</span>
  }

  const badgeGrupo = (roteiro: RoteiroCompleto) => {
    if (roteiro.grupo?.id) return <span className="badge blue">Grupo criado</span>

    return <span className="badge neutral">Sem grupo</span>
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
          <div>Carregando roteiros...</div>
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
          grid-template-columns: minmax(0, 1fr) 350px;
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

        .roteiroList {
          display: grid;
          gap: 10px;
        }

        .roteiroCard {
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 22px;
          padding: 12px;
          display: grid;
          grid-template-columns: 82px minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          transition: 0.2s ease;
        }

        .roteiroCard:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
        }

        .thumb {
          width: 82px;
          height: 82px;
          border-radius: 22px;
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

        .roteiroTitle {
          color: #0f172a;
          font-size: 15px;
          font-weight: 950;
          line-height: 1.3;
        }

        .roteiroMeta {
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
          margin-top: 4px;
        }

        .roteiroFooter {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          margin-top: 8px;
          align-items: center;
        }

        .price {
          color: #16a34a;
          font-size: 13px;
          font-weight: 950;
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
          min-width: 160px;
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

        .actionBtn.red {
          background: #fee2e2;
          color: #991b1b;
          border-color: #fecaca;
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
          max-width: 560px;
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

        .btn.danger {
          background: #fee2e2;
          color: #991b1b;
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

        .descriptionBox {
          background: #f8fafc;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 18px;
          padding: 12px;
          color: #475569;
          font-size: 12px;
          line-height: 1.55;
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

          .roteiroCard {
            grid-template-columns: 74px minmax(0, 1fr);
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

          .roteiroCard {
            grid-template-columns: 1fr;
          }

          .thumb {
            width: 100%;
            height: 160px;
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
              <div className="brandSub">Roteiros da plataforma</div>
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
              <div className="eyebrow">Controle de experiências</div>

              <h1 className="heroTitle">
                Roteiros, guias, grupos e reservas em <span>uma central.</span>
              </h1>

              <p className="heroText">
                Aprove, pause, acompanhe reservas, garanta grupos internos e remova da vitrine roteiros de teste, duplicados ou suspeitos.
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
              onClick={() => router.push('/admin/financeiro')}
            >
              <div className="heroLabel">Receita confirmada</div>
              <div className="heroValue">{formatarMoeda(stats.receitaConfirmada)}</div>
              <div className="heroSmall">
                {stats.reservasConfirmadas} reserva(s) confirmada(s) vinculadas aos roteiros.
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
            <div className="statIcon">🧭</div>
            <div className="statValue">{stats.total}</div>
            <div className="statLabel">roteiros cadastrados</div>
          </article>

          <article
            className="statCard"
            onClick={() => setFiltroStatus('ativos')}
          >
            <div className="statIcon">✅</div>
            <div className="statValue">{stats.ativos}</div>
            <div className="statLabel">roteiros ativos/publicados</div>
          </article>

          <article
            className="statCard"
            onClick={() => setFiltroStatus('pendentes')}
          >
            <div className="statIcon">⏳</div>
            <div className="statValue">{stats.pendentes}</div>
            <div className="statLabel">em análise/pendentes</div>
          </article>

          <article
            className="statCard"
            onClick={() => setFiltroStatus('com_reservas')}
          >
            <div className="statIcon">🎒</div>
            <div className="statValue">{stats.comReservas}</div>
            <div className="statLabel">roteiros com reservas</div>
          </article>

          <article
            className="statCard"
            onClick={() => setFiltroStatus('sem_grupo')}
          >
            <div className="statIcon">💬</div>
            <div className="statValue">{stats.semGrupo}</div>
            <div className="statLabel">roteiros ainda sem grupo</div>
          </article>

          <article
            className="statCard"
            onClick={() => router.push('/admin/avaliacoes')}
          >
            <div className="statIcon">⭐</div>
            <div className="statValue">{formatarNota(stats.mediaAvaliacoes)}</div>
            <div className="statLabel">média de avaliações dos roteiros</div>
          </article>
        </section>

        <section className="toolbar">
          <input
            className="input"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por roteiro, guia, local, status, dificuldade ou ID..."
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
              className={`filterBtn ${filtroStatus === 'pendentes' ? 'active' : ''}`}
              onClick={() => setFiltroStatus('pendentes')}
            >
              Pendentes
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
              className={`filterBtn ${filtroStatus === 'reprovados' ? 'active' : ''}`}
              onClick={() => setFiltroStatus('reprovados')}
            >
              Reprovados
            </button>

            <button
              type="button"
              className={`filterBtn ${filtroStatus === 'sem_grupo' ? 'active' : ''}`}
              onClick={() => setFiltroStatus('sem_grupo')}
            >
              Sem grupo
            </button>

            <button
              type="button"
              className={`filterBtn ${filtroStatus === 'ocultados' ? 'active' : ''}`}
              onClick={() => setFiltroStatus('ocultados')}
            >
              Ocultados ({stats.ocultados})
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2 className="panelTitle">Lista de roteiros</h2>
              <div className="panelSub">
                {roteirosFiltrados.length} roteiro(s) encontrado(s) no filtro atual.
              </div>
            </div>

            <button
              type="button"
              className="textLink"
              onClick={atualizar}
              disabled={atualizando}
            >
              {atualizando ? 'Atualizando...' : 'Atualizar roteiros'}
            </button>
          </div>

          <div className="panelBody">
            {roteirosFiltrados.length === 0 ? (
              <div className="empty">
                Nenhum roteiro encontrado com os filtros atuais.
              </div>
            ) : (
              <div className="roteiroList">
                {roteirosFiltrados.map((roteiro) => {
                  const imagem = imagemRoteiro(roteiro)
                  const emAlteracao = alterandoStatusId === roteiro.id
                  const criandoGrupo = criandoGrupoId === roteiro.id
                  const excluindo = excluindoRoteiroId === roteiro.id
                  const ocultado = roteiroOcultado(roteiro)

                  return (
                    <article className="roteiroCard" key={roteiro.id}>
                      <div className="thumb">
                        {imagem ? (
                          <img src={imagem} alt={tituloRoteiro(roteiro)} />
                        ) : (
                          'RT'
                        )}
                      </div>

                      <div>
                        <div className="roteiroTitle">
                          {tituloRoteiro(roteiro)}
                        </div>

                        <div className="roteiroMeta">
                          Guia: {roteiro.guia_nome || 'Guia não informado'} · {localRoteiro(roteiro)}
                          <br />
                          Criado em {formatarData(roteiro.created_at)} · ID: {roteiro.id.slice(0, 8)}
                          {ocultado && (
                            <>
                              <br />
                              Ocultado em {formatarData(roteiro.excluido_em)} · Motivo: {roteiro.motivo_exclusao || 'não informado'}
                            </>
                          )}
                          <br />
                          Reservas: {roteiro.total_reservas || 0} · Confirmadas: {roteiro.reservas_confirmadas || 0} · Receita: {formatarMoeda(roteiro.receita_confirmada || 0)}
                        </div>

                        <div className="roteiroFooter">
                          <span className="price">
                            {formatarMoeda(precoRoteiro(roteiro))}
                          </span>

                          {badgeStatus(roteiro)}
                          {badgeGrupo(roteiro)}

                          {roteiro.dificuldade && (
                            <span className="badge neutral">
                              {roteiro.dificuldade}
                            </span>
                          )}

                          {Number(roteiro.total_avaliacoes || 0) > 0 && (
                            <span className="badge blue">
                              ⭐ {formatarNota(roteiro.media_avaliacao)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="actions">
                        <button
                          type="button"
                          className="actionBtn primary"
                          onClick={() => setRoteiroSelecionado(roteiro)}
                        >
                          Detalhes
                        </button>

                        {!ocultado && !roteiroAtivo(roteiro) && (
                          <button
                            type="button"
                            className="actionBtn green"
                            onClick={() => ativarRoteiro(roteiro)}
                            disabled={emAlteracao}
                          >
                            {emAlteracao ? 'Atualizando...' : 'Ativar'}
                          </button>
                        )}

                        {!ocultado && roteiroAtivo(roteiro) && (
                          <button
                            type="button"
                            className="actionBtn yellow"
                            onClick={() => pausarRoteiro(roteiro)}
                            disabled={emAlteracao}
                          >
                            {emAlteracao ? 'Atualizando...' : 'Pausar'}
                          </button>
                        )}

                        {!ocultado && !roteiroReprovado(roteiro) && (
                          <button
                            type="button"
                            className="actionBtn red"
                            onClick={() => reprovarRoteiro(roteiro)}
                            disabled={emAlteracao}
                          >
                            Reprovar
                          </button>
                        )}

                        {!ocultado && !roteiro.grupo?.id && (
                          <button
                            type="button"
                            className="actionBtn"
                            onClick={() => garantirGrupo(roteiro)}
                            disabled={criandoGrupo}
                          >
                            {criandoGrupo ? 'Criando...' : 'Criar grupo'}
                          </button>
                        )}

                        {!ocultado && (
                          <button
                            type="button"
                            className="actionBtn red"
                            onClick={() => excluirRoteiroAdmin(roteiro)}
                            disabled={excluindo}
                          >
                            {excluindo ? 'Removendo...' : 'Excluir'}
                          </button>
                        )}

                        <button
                          type="button"
                          className="actionBtn"
                          onClick={() => copiarTexto(roteiro.id, 'ID do roteiro')}
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

      {roteiroSelecionado && (
        <div className="modalOverlay">
          <div className="modal">
            <div className="modalHeader">
              <h2 className="modalTitle">{tituloRoteiro(roteiroSelecionado)}</h2>
              <div className="modalSub">
                Detalhes administrativos do roteiro.
              </div>
            </div>

            <div className="modalBody">
              <div className="detailGrid">
                <div className="detailRow">
                  <span>ID do roteiro</span>
                  <strong>{roteiroSelecionado.id}</strong>
                </div>

                <div className="detailRow">
                  <span>Guia</span>
                  <strong>{roteiroSelecionado.guia_nome || '-'}</strong>
                </div>

                <div className="detailRow">
                  <span>Status</span>
                  <strong>{statusRoteiro(roteiroSelecionado)}</strong>
                </div>

                {roteiroOcultado(roteiroSelecionado) && (
                  <>
                    <div className="detailRow">
                      <span>Ocultado em</span>
                      <strong>{formatarDataHora(roteiroSelecionado.excluido_em)}</strong>
                    </div>

                    <div className="detailRow">
                      <span>Motivo da remoção</span>
                      <strong>{roteiroSelecionado.motivo_exclusao || '-'}</strong>
                    </div>
                  </>
                )}

                <div className="detailRow">
                  <span>Local</span>
                  <strong>{localRoteiro(roteiroSelecionado)}</strong>
                </div>

                <div className="detailRow">
                  <span>Valor</span>
                  <strong>{formatarMoeda(precoRoteiro(roteiroSelecionado))}</strong>
                </div>

                <div className="detailRow">
                  <span>Duração</span>
                  <strong>{duracaoRoteiro(roteiroSelecionado)}</strong>
                </div>

                <div className="detailRow">
                  <span>Distância</span>
                  <strong>{distanciaRoteiro(roteiroSelecionado) || '-'} km</strong>
                </div>

                <div className="detailRow">
                  <span>Limite de pessoas</span>
                  <strong>{limitePessoasRoteiro(roteiroSelecionado) || '-'}</strong>
                </div>

                <div className="detailRow">
                  <span>Reservas</span>
                  <strong>{roteiroSelecionado.total_reservas || 0}</strong>
                </div>

                <div className="detailRow">
                  <span>Receita confirmada</span>
                  <strong>{formatarMoeda(roteiroSelecionado.receita_confirmada || 0)}</strong>
                </div>

                <div className="detailRow">
                  <span>Grupo interno</span>
                  <strong>{roteiroSelecionado.grupo?.id ? 'Criado' : 'Não criado'}</strong>
                </div>

                <div className="detailRow">
                  <span>Criado em</span>
                  <strong>{formatarDataHora(roteiroSelecionado.created_at)}</strong>
                </div>
              </div>

              <div className="descriptionBox">
                <strong>Descrição:</strong>
                <br />
                {roteiroSelecionado.descricao || 'Sem descrição cadastrada.'}
              </div>

              <div className="modalActions">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => copiarTexto(roteiroSelecionado.id, 'ID do roteiro')}
                >
                  Copiar ID
                </button>

                <button
                  type="button"
                  className="btn green"
                  onClick={() => {
                    setRoteiroSelecionado(null)
                    router.push('/admin/reservas')
                  }}
                >
                  Ver reservas
                </button>

                <button
                  type="button"
                  className="btn green"
                  onClick={() => {
                    setRoteiroSelecionado(null)
                    router.push('/admin/grupos')
                  }}
                >
                  Ver grupos
                </button>

                {!roteiroOcultado(roteiroSelecionado) && (
                  <button
                    type="button"
                    className="btn danger"
                    disabled={excluindoRoteiroId === roteiroSelecionado.id}
                    onClick={() => excluirRoteiroAdmin(roteiroSelecionado)}
                  >
                    {excluindoRoteiroId === roteiroSelecionado.id ? 'Removendo...' : 'Excluir roteiro'}
                  </button>
                )}

                <button
                  type="button"
                  className="btn light"
                  onClick={() => setRoteiroSelecionado(null)}
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