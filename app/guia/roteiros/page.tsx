'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type UsuarioLocal = {
  id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  guia_id?: string | null
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
  roteiro_detalhado?: string | null
  detalhes?: string | null
  preco?: number | string | null
  valor?: number | string | null
  duracao_horas?: number | string | null
  km?: number | string | null
  distancia_km?: number | string | null
  dificuldade?: string | null
  localizacao?: string | null
  local?: string | null
  local_encontro?: string | null
  ponto_encontro?: string | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  imagem?: string | null
  status?: string | null
  ativo?: boolean | null
  limite_pessoas?: number | string | null
  vagas?: number | string | null
  recorrencia?: string | null
  renovar_automaticamente?: boolean | null
  proxima_data?: string | null
  embarque_data_hora?: string | null
  retorno_data_hora?: string | null
  embarque_data?: string | null
  data_disponivel?: string | null
  data_trilha?: string | null
  created_at?: string | null
  updated_at?: string | null
  cancelado_em?: string | null
  cancelamento_motivo?: string | null
  cancelamento_motivo_codigo?: string | null
  realizado_em?: string | null
  finalizado_em?: string | null
  id_guia?: string | null
  guia_id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  criador_id?: string | null
  created_by?: string | null
  reservas_total?: number
  reservas_pagas?: number
  reservas_pendentes?: number
  reservas_realizadas?: number
}

type ReservaResumo = {
  id: string
  roteiro_id?: string | null
  id_roteiro?: string | null
  status?: string | null
  pagamento_status?: string | null
  quantidade_pessoas?: number | string | null
  valor_total?: number | string | null
}

const MOTIVOS_CANCELAMENTO = [
  {
    codigo: 'clima_inseguro',
    titulo: 'Condição climática insegura',
    descricao:
      'Chuva intensa, tempestade, vento, visibilidade ou outra condição climática que comprometa a segurança.',
  },
  {
    codigo: 'risco_operacional',
    titulo: 'Risco operacional / segurança',
    descricao:
      'Alteração no terreno, bloqueio, risco de acesso, resgate ou segurança da atividade.',
  },
  {
    codigo: 'saude_guia',
    titulo: 'Problema de saúde do guia',
    descricao:
      'Impossibilidade temporária do guia conduzir a experiência com segurança.',
  },
  {
    codigo: 'minimo_participantes',
    titulo: 'Número mínimo não atingido',
    descricao: 'A experiência não atingiu o mínimo operacional previsto.',
  },
  {
    codigo: 'roteiro_indisponivel',
    titulo: 'Roteiro indisponível',
    descricao: 'O roteiro deixou de estar disponível na data prevista.',
  },
  {
    codigo: 'outro',
    titulo: 'Outro motivo justificado',
    descricao: 'Use quando houver outro motivo relevante. Descreva com clareza.',
  },
]

function normalizar(valor: unknown) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function extrairUsuarioId(usuario: UsuarioLocal | null) {
  return String(
    usuario?.id ||
      usuario?.user_id ||
      usuario?.usuario_id ||
      usuario?.guia_id ||
      ''
  ).trim()
}

function guiaIdRoteiro(roteiro: Roteiro) {
  return String(
    roteiro.id_guia ||
      roteiro.guia_id ||
      roteiro.user_id ||
      roteiro.usuario_id ||
      roteiro.criador_id ||
      roteiro.created_by ||
      ''
  ).trim()
}

function tituloRoteiro(roteiro: Roteiro) {
  return String(roteiro.titulo || roteiro.nome || 'Roteiro sem título')
}

function descricaoRoteiro(roteiro: Roteiro) {
  return String(
    roteiro.descricao ||
      roteiro.roteiro_detalhado ||
      roteiro.detalhes ||
      ''
  )
}

function localRoteiro(roteiro: Roteiro) {
  return String(
    roteiro.localizacao ||
      roteiro.local ||
      roteiro.local_encontro ||
      roteiro.ponto_encontro ||
      'Local a confirmar'
  )
}

function fotoRoteiro(roteiro: Roteiro) {
  return String(
    roteiro.foto_capa ||
      roteiro.foto_url ||
      roteiro.imagem_url ||
      roteiro.imagem ||
      ''
  ).trim()
}

function numero(valor: unknown) {
  const n = Number(valor || 0)
  return Number.isFinite(n) ? n : 0
}

function valorRoteiro(roteiro: Roteiro) {
  return numero(roteiro.preco) || numero(roteiro.valor)
}

function kmRoteiro(roteiro: Roteiro) {
  return numero(roteiro.km) || numero(roteiro.distancia_km)
}

function duracaoRoteiro(roteiro: Roteiro) {
  return numero(roteiro.duracao_horas)
}

function limiteRoteiro(roteiro: Roteiro) {
  return numero(roteiro.limite_pessoas) || numero(roteiro.vagas)
}

function statusRoteiro(roteiro: Roteiro) {
  const status = normalizar(roteiro.status)

  if (
    status === 'excluido' ||
    status === 'excluida' ||
    status === 'removido' ||
    status === 'removida' ||
    status === 'arquivado' ||
    status === 'arquivada'
  ) return 'removido'

  if (status === 'cancelado' || status === 'cancelada') return 'cancelado'
  if (status === 'pausado' || status === 'pausada') return 'pausado'
  if (status === 'rascunho') return 'rascunho'
  if (status === 'reprovado' || status === 'reprovada') return 'reprovado'

  if (
    status === 'encerrado' ||
    status === 'finalizado' ||
    status === 'finalizada' ||
    status === 'realizado' ||
    status === 'realizada'
  ) {
    return 'encerrado'
  }

  if (roteiro.ativo === false) return 'pausado'

  return 'ativo'
}

function statusReservaCancelada(reserva: ReservaResumo) {
  const status = normalizar(reserva.status)
  return status === 'cancelada' || status === 'cancelado'
}

function pagamentoReservaConfirmado(reserva: ReservaResumo) {
  const pagamento = normalizar(reserva.pagamento_status)
  const status = normalizar(reserva.status)

  return (
    pagamento === 'pago' ||
    pagamento === 'confirmado' ||
    pagamento === 'aprovado' ||
    pagamento === 'paid' ||
    pagamento === 'approved' ||
    status === 'confirmada' ||
    status === 'confirmado' ||
    status === 'realizada' ||
    status === 'realizado'
  )
}

function reservaRealizada(reserva: ReservaResumo) {
  const status = normalizar(reserva.status)

  return (
    status === 'realizada' ||
    status === 'realizado' ||
    status === 'concluida' ||
    status === 'concluido' ||
    status === 'finalizada' ||
    status === 'finalizado' ||
    status === 'executada' ||
    status === 'executado'
  )
}

function dataOperacionalRoteiro(roteiro: Roteiro) {
  return (
    roteiro.proxima_data ||
    roteiro.embarque_data_hora ||
    roteiro.embarque_data ||
    roteiro.data_disponivel ||
    roteiro.data_trilha ||
    null
  )
}

function roteiroDataPassou(roteiro: Roteiro) {
  const valor = dataOperacionalRoteiro(roteiro)
  if (!valor) return false

  const raw = String(valor).trim()
  const data = raw.length <= 10 ? new Date(`${raw.slice(0, 10)}T23:59:59`) : new Date(raw)

  if (Number.isNaN(data.getTime())) return false

  return data.getTime() < Date.now()
}

function roteiroJaRealizadoOperacionalmente(roteiro: Roteiro) {
  const status = statusRoteiro(roteiro)

  return (
    status === 'encerrado' ||
    Boolean(roteiro.realizado_em) ||
    Boolean(roteiro.finalizado_em) ||
    (Number(roteiro.reservas_pagas || 0) > 0 &&
      Number(roteiro.reservas_realizadas || 0) >= Number(roteiro.reservas_pagas || 0))
  )
}

function podeFinalizarRoteiro(roteiro: Roteiro) {
  const status = statusRoteiro(roteiro)

  if (status === 'cancelado' || status === 'removido' || status === 'rascunho') return false
  if (roteiroJaRealizadoOperacionalmente(roteiro)) return false
  if (!roteiroDataPassou(roteiro)) return false

  // Deve aparecer também quando o roteiro já foi pausado manualmente antes.
  // Havendo reservas pagas, elas serão marcadas como realizadas; se não houver,
  // o roteiro/grupo ainda podem ser encerrados operacionalmente.
  return true
}

function dataPrincipal(roteiro: Roteiro) {
  return (
    roteiro.proxima_data ||
    roteiro.embarque_data_hora ||
    roteiro.embarque_data ||
    roteiro.data_disponivel ||
    roteiro.data_trilha ||
    roteiro.created_at ||
    null
  )
}

function formatarData(valor?: string | null) {
  if (!valor) return 'Data a definir'

  const texto = String(valor)
  const data =
    texto.length <= 10
      ? new Date(`${texto.slice(0, 10)}T12:00:00`)
      : new Date(texto)

  if (Number.isNaN(data.getTime())) return 'Data a definir'

  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}


function valorParaInputData(valor?: string | null) {
  if (!valor) return ''

  const texto = String(valor).trim()
  const matchData = texto.match(/^(\d{4}-\d{2}-\d{2})/)
  if (matchData?.[1]) return matchData[1]

  const data = new Date(texto)
  if (Number.isNaN(data.getTime())) return ''

  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')

  return `${ano}-${mes}-${dia}`
}

function valorParaInputHora(valor?: string | null) {
  if (!valor) return ''

  const texto = String(valor).trim()
  const matchHora = texto.match(/T(\d{2}:\d{2})/) || texto.match(/\s(\d{2}:\d{2})/)
  if (matchHora?.[1]) return matchHora[1]

  const data = new Date(texto)
  if (Number.isNaN(data.getTime())) return ''

  return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`
}

function numeroParaCampo(valor: unknown) {
  const n = numero(valor)
  if (!n) return ''
  return String(n).replace('.', ',')
}

function numeroCampoParaApi(valor: string) {
  const texto = String(valor || '').replace(/\./g, '').replace(',', '.').trim()
  const n = Number(texto)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function formatarMoeda(valor: unknown) {
  return numero(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function labelRecorrencia(valor?: string | null) {
  const rec = normalizar(valor)

  if (rec === 'semanal') return 'Semanal'
  if (rec === 'mensal') return 'Mensal'
  if (rec === 'anual') return 'Anual'

  return 'Única'
}

function labelStatus(status: string) {
  if (status === 'ativo') return 'Ativo'
  if (status === 'removido') return 'Removido'
  if (status === 'pausado') return 'Pausado'
  if (status === 'cancelado') return 'Cancelado'
  if (status === 'encerrado') return 'Encerrado'
  if (status === 'rascunho') return 'Rascunho'
  if (status === 'reprovado') return 'Reprovado'

  return 'Ativo'
}

export default function GuiaRoteirosPage() {
  const router = useRouter()

  const [usuario, setUsuario] = useState<UsuarioLocal | null>(null)
  const [guiaId, setGuiaId] = useState('')
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroDificuldade, setFiltroDificuldade] = useState('todas')
  const [cancelando, setCancelando] = useState(false)
  const [removendoId, setRemovendoId] = useState('')
  const [finalizandoId, setFinalizandoId] = useState('')
  const [roteiroCancelamento, setRoteiroCancelamento] = useState<Roteiro | null>(null)
  const [motivoCodigo, setMotivoCodigo] = useState(MOTIVOS_CANCELAMENTO[0].codigo)
  const [motivoDescricao, setMotivoDescricao] = useState(
    MOTIVOS_CANCELAMENTO[0].descricao
  )
  const [observacaoGuia, setObservacaoGuia] = useState('')

const [roteiroAtualizacao, setRoteiroAtualizacao] = useState<Roteiro | null>(null)
const [atualizacaoTitulo, setAtualizacaoTitulo] = useState('')
const [atualizacaoDescricao, setAtualizacaoDescricao] = useState('')
const [atualizacaoData, setAtualizacaoData] = useState('')
const [atualizacaoHora, setAtualizacaoHora] = useState('')
const [atualizacaoLocal, setAtualizacaoLocal] = useState('')
const [atualizacaoPreco, setAtualizacaoPreco] = useState('')
const [atualizacaoObservacao, setAtualizacaoObservacao] = useState('')
const [enviandoAtualizacao, setEnviandoAtualizacao] = useState(false)

  useEffect(() => {
    iniciar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function iniciar() {
    try {
      setCarregando(true)
      setErro('')
      setMensagem('')

      const salvo = localStorage.getItem('user')
      const parsedUser = salvo ? (JSON.parse(salvo) as UsuarioLocal) : null

      if (!parsedUser || normalizar(parsedUser.tipo) !== 'guia') {
        router.replace('/login')
        return
      }

      const id = extrairUsuarioId(parsedUser)

      if (!id) {
        localStorage.removeItem('user')
        router.replace('/login')
        return
      }

      setUsuario({ ...parsedUser, id })
      setGuiaId(id)

      await carregarRoteiros(id)
    } catch (error) {
      console.error('Erro ao iniciar página de roteiros do guia:', error)
      setErro('Não foi possível carregar seus roteiros.')
    } finally {
      setCarregando(false)
    }
  }

  async function buscarReservasPorRoteiros(roteiroIds: string[]) {
    if (roteiroIds.length === 0) return []

    const tentativas = ['roteiro_id', 'id_roteiro']
    const acumuladas: ReservaResumo[] = []

    for (const coluna of tentativas) {
      const { data, error } = await supabase
        .from('reservas')
        .select(
          'id, roteiro_id, id_roteiro, status, pagamento_status, quantidade_pessoas, valor_total'
        )
        .in(coluna, roteiroIds)

      if (error) {
        const textoErro = String(error.message || error.details || '').toLowerCase()

        if (textoErro.includes('column') || error.code === '42703') continue

        console.warn('Erro ao buscar reservas dos roteiros:', error)
        continue
      }

      if (data?.length) {
        acumuladas.push(...(data as ReservaResumo[]))
      }
    }

    const mapa = new Map<string, ReservaResumo>()

    acumuladas.forEach((reserva) => {
      if (reserva.id) mapa.set(reserva.id, reserva)
    })

    return Array.from(mapa.values())
  }

  async function carregarRoteiros(idGuia: string) {
    setErro('')
    setMensagem('')

    const { data, error } = await supabase
      .from('roteiros')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao carregar roteiros:', error)
      setErro('Erro ao carregar seus roteiros.')
      setRoteiros([])
      return
    }

    const base = ((data || []) as Roteiro[]).filter((roteiro) => {
      const dono = guiaIdRoteiro(roteiro)
      const status = statusRoteiro(roteiro)
      const removido =
        status === 'removido' ||
        Boolean((roteiro as any).removido_em) ||
        Boolean((roteiro as any).excluido_em) ||
        Boolean((roteiro as any).removido_pelo_guia) ||
        Boolean((roteiro as any).removido_pelo_admin)

      if (removido) return false

      return dono ? dono === idGuia : false
    })

    const ids = base.map((roteiro) => roteiro.id).filter(Boolean)
    const reservas = await buscarReservasPorRoteiros(ids)

    const lista = base.map((roteiro) => {
      const reservasRoteiro = reservas.filter((reserva) => {
        const roteiroReserva = String(reserva.roteiro_id || reserva.id_roteiro || '')
        return roteiroReserva === roteiro.id && !statusReservaCancelada(reserva)
      })

      const pagas = reservasRoteiro.filter(pagamentoReservaConfirmado)
      const realizadas = reservasRoteiro.filter(reservaRealizada)
      const pendentes = reservasRoteiro.filter(
        (reserva) => !pagamentoReservaConfirmado(reserva)
      )

      return {
        ...roteiro,
        reservas_total: reservasRoteiro.length,
        reservas_pagas: pagas.length,
        reservas_pendentes: pendentes.length,
        reservas_realizadas: realizadas.length,
      }
    })

    setRoteiros(lista)
  }

  const dificuldadesDisponiveis = useMemo(() => {
    const set = new Set<string>()

    roteiros.forEach((roteiro) => {
      const dificuldade = String(roteiro.dificuldade || '').trim()
      if (dificuldade) set.add(dificuldade)
    })

    return Array.from(set)
  }, [roteiros])

  const roteirosFiltrados = useMemo(() => {
    const termo = normalizar(busca)

    return roteiros.filter((roteiro) => {
      const status = statusRoteiro(roteiro)
      const texto = normalizar(
        [
          tituloRoteiro(roteiro),
          localRoteiro(roteiro),
          roteiro.descricao,
          roteiro.dificuldade,
          labelRecorrencia(roteiro.recorrencia),
          status,
        ].join(' ')
      )

      const passaBusca = termo ? texto.includes(termo) : true
      const passaStatus = filtroStatus === 'todos' ? true : status === filtroStatus
      const passaDificuldade =
        filtroDificuldade === 'todas'
          ? true
          : String(roteiro.dificuldade || '') === filtroDificuldade

      return passaBusca && passaStatus && passaDificuldade
    })
  }, [roteiros, busca, filtroStatus, filtroDificuldade])

  const resumo = useMemo(() => {
    const ativos = roteiros.filter((roteiro) => statusRoteiro(roteiro) === 'ativo').length
    const cancelados = roteiros.filter(
      (roteiro) => statusRoteiro(roteiro) === 'cancelado'
    ).length
    const reservas = roteiros.reduce(
      (acc, roteiro) => acc + Number(roteiro.reservas_total || 0),
      0
    )
    const reservasPagas = roteiros.reduce(
      (acc, roteiro) => acc + Number(roteiro.reservas_pagas || 0),
      0
    )

    return {
      total: roteiros.length,
      ativos,
      cancelados,
      reservas,
      reservasPagas,
    }
  }, [roteiros])


function abrirModalAtualizacao(roteiro: Roteiro) {
  const dataBase = dataPrincipal(roteiro)

  setRoteiroAtualizacao(roteiro)
  setAtualizacaoTitulo(tituloRoteiro(roteiro))
  setAtualizacaoDescricao(descricaoRoteiro(roteiro))
  setAtualizacaoData(valorParaInputData(dataBase))
  setAtualizacaoHora(valorParaInputHora(dataBase))
  setAtualizacaoLocal(localRoteiro(roteiro) === 'Local a confirmar' ? '' : localRoteiro(roteiro))
  setAtualizacaoPreco(numeroParaCampo(valorRoteiro(roteiro)))
  setAtualizacaoObservacao('')
  setErro('')
  setMensagem('')
}

function fecharModalAtualizacao() {
  if (enviandoAtualizacao) return

  setRoteiroAtualizacao(null)
  setAtualizacaoTitulo('')
  setAtualizacaoDescricao('')
  setAtualizacaoData('')
  setAtualizacaoHora('')
  setAtualizacaoLocal('')
  setAtualizacaoPreco('')
  setAtualizacaoObservacao('')
}

async function confirmarSolicitacaoAtualizacao() {
  if (!roteiroAtualizacao?.id || !guiaId) return

  if (!atualizacaoData.trim() && !atualizacaoTitulo.trim() && !atualizacaoDescricao.trim() && !atualizacaoLocal.trim() && !atualizacaoPreco.trim()) {
    setErro('Informe ao menos uma alteração para enviar ao Admin.')
    return
  }

  try {
    setEnviandoAtualizacao(true)
    setErro('')
    setMensagem('')

    const resposta = await fetch('/api/guia/roteiros/solicitar-atualizacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roteiroId: roteiroAtualizacao.id,
        guiaId,
        titulo: atualizacaoTitulo.trim(),
        descricao: atualizacaoDescricao.trim(),
        data: atualizacaoData.trim(),
        hora: atualizacaoHora.trim(),
        local: atualizacaoLocal.trim(),
        preco: numeroCampoParaApi(atualizacaoPreco),
        observacao: atualizacaoObservacao.trim(),
      }),
    })

    const json = await resposta.json().catch(() => null)

    if (!resposta.ok || !json?.sucesso) {
      throw new Error(json?.erro || json?.message || 'Não foi possível enviar a solicitação de atualização.')
    }

    setMensagem('Solicitação enviada para análise do Admin. O roteiro público só será alterado após aprovação.')
    fecharModalAtualizacao()
  } catch (error) {
    console.error('Erro ao solicitar atualização:', error)
    setErro(error instanceof Error ? error.message : 'Erro ao solicitar atualização.')
  } finally {
    setEnviandoAtualizacao(false)
  }
}

  function abrirModalCancelamento(roteiro: Roteiro) {
    setRoteiroCancelamento(roteiro)
    setMotivoCodigo(MOTIVOS_CANCELAMENTO[0].codigo)
    setMotivoDescricao(MOTIVOS_CANCELAMENTO[0].descricao)
    setObservacaoGuia('')
    setErro('')
    setMensagem('')
  }

  function fecharModalCancelamento() {
    if (cancelando) return
    setRoteiroCancelamento(null)
    setObservacaoGuia('')
  }

  function atualizarMotivo(codigo: string) {
    const motivo = MOTIVOS_CANCELAMENTO.find((item) => item.codigo === codigo)
    setMotivoCodigo(codigo)
    setMotivoDescricao(motivo?.descricao || '')
  }

  async function confirmarCancelamentoRoteiro() {
    if (!roteiroCancelamento?.id || !guiaId) return

    const motivoFinal = motivoDescricao.trim()
    const observacaoFinal = observacaoGuia.trim()

    if (!motivoFinal) {
      setErro('Informe o motivo do cancelamento.')
      return
    }

    if (motivoCodigo === 'outro' && observacaoFinal.length < 12) {
      setErro('Para “Outro motivo”, descreva melhor o motivo do cancelamento.')
      return
    }

    try {
      setCancelando(true)
      setErro('')
      setMensagem('')

      const resposta = await fetch('/api/guia/roteiros/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roteiroId: roteiroCancelamento.id,
          guiaId,
          motivoCodigo,
          motivoDescricao: motivoFinal,
          observacao: observacaoFinal,
        }),
      })

      const json = await resposta.json().catch(() => null)

      if (!resposta.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível cancelar o roteiro.')
      }

      setMensagem(
        `Roteiro cancelado. ${Number(json.reservasCanceladas || 0)} reserva(s) cancelada(s) e ${formatarMoeda(json.totalCreditado || 0)} creditados em Saldo de Jornada.`
      )

      setRoteiroCancelamento(null)
      await carregarRoteiros(guiaId)
    } catch (error) {
      console.error('Erro ao cancelar roteiro:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao cancelar roteiro.')
    } finally {
      setCancelando(false)
    }
  }

  async function handleFinalizarRoteiro(roteiro: Roteiro) {
    if (!guiaId || !roteiro.id) return

    if (!podeFinalizarRoteiro(roteiro)) {
      setErro('Este roteiro só pode ser finalizado depois da data da experiência, desde que ainda não esteja encerrado/removido.')
      return
    }

    const confirma = window.confirm(
      `Marcar o roteiro "${tituloRoteiro(roteiro)}" como realizado?\n\n` +
        'As reservas pagas serão marcadas como realizadas, o roteiro ficará pausado até nova atualização de data e o grupo interno será encerrado como histórico.'
    )

    if (!confirma) return

    try {
      setFinalizandoId(roteiro.id)
      setErro('')
      setMensagem('')

      const resposta = await fetch('/api/roteiros/finalizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roteiroId: roteiro.id,
          guiaId,
        }),
      })

      const json = await resposta.json().catch(() => null)

      if (!resposta.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível finalizar o roteiro.')
      }

      setMensagem(
        json?.mensagem ||
          'Roteiro finalizado. Reservas confirmadas foram marcadas como realizadas e o grupo foi encerrado.'
      )
      await carregarRoteiros(guiaId)
    } catch (error) {
      console.error('Erro ao finalizar roteiro:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao finalizar roteiro.')
    } finally {
      setFinalizandoId('')
    }
  }

  async function handleRemoverRoteiro(roteiro: Roteiro) {
    if (!guiaId || !roteiro.id) return

    const confirma = window.confirm(
      'Deseja remover este roteiro da sua lista? O histórico será preservado.'
    )

    if (!confirma) return

    try {
      setRemovendoId(roteiro.id)
      setErro('')
      setMensagem('')

      const resposta = await fetch('/api/guia/roteiros/excluir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roteiroId: roteiro.id,
          guiaId,
        }),
      })

      const json = await resposta.json().catch(() => null)

      if (!resposta.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível remover o roteiro.')
      }

      setMensagem('Roteiro removido com sucesso.')
      setRoteiros((prev) => prev.filter((item) => item.id !== roteiro.id))
    } catch (error) {
      console.error('Erro ao remover roteiro:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao remover roteiro.')
    } finally {
      setRemovendoId('')
    }
  }

  if (carregando) {
    return (
      <div className="page loadingPage">
        <style jsx>{`
          .loadingPage {
            min-height: 100dvh;
            display: grid;
            place-items: center;
            background:
              radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.16), transparent 28%),
              radial-gradient(circle at 90% 10%, rgba(251, 146, 60, 0.14), transparent 28%),
              linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
            color: #203c2e;
            font-weight: 900;
          }
        `}</style>

        Carregando seus roteiros...
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        body {
          background: #fffdf7;
        }
      `}</style>

      <style jsx>{`
        .page {
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
          z-index: 30;
          backdrop-filter: blur(18px);
          background: rgba(255, 253, 247, 0.82);
          border-bottom: 1px solid rgba(62, 74, 45, 0.10);
        }

        .headerInner {
          max-width: 1180px;
          margin: 0 auto;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .brandLogo {
          width: 34px;
          height: 34px;
          object-fit: contain;
          flex: 0 0 auto;
        }

        .brandName {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(24px, 3vw, 36px);
          font-weight: 700;
          color: #203c2e;
          line-height: 0.92;
          letter-spacing: -0.055em;
        }

        .brandSub {
          margin-top: 4px;
          color: #7b8372;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .headerActions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .main {
          max-width: 1180px;
          margin: 0 auto;
          padding: 22px 16px 56px;
        }

        .hero {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.8fr);
          gap: 18px;
          align-items: stretch;
          margin-bottom: 18px;
        }

        .heroCard,
        .summaryCard,
        .filters,
        .card,
        .modal {
          border: 1px solid rgba(62, 74, 45, 0.10);
          background: rgba(255, 255, 255, 0.72);
          box-shadow: 0 18px 40px rgba(32, 60, 46, 0.08);
          border-radius: 30px;
        }

        .heroCard {
          padding: 24px;
          overflow: hidden;
          position: relative;
        }

        .heroKicker {
          margin: 0 0 9px;
          color: #991b1b;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }

        .heroTitle {
          margin: 0;
          color: #172018;
          font-size: clamp(31px, 6vw, 58px);
          line-height: 0.94;
          font-weight: 950;
          letter-spacing: -0.07em;
          max-width: 760px;
        }

        .heroText {
          max-width: 720px;
          margin: 14px 0 0;
          color: rgba(23, 32, 24, 0.66);
          font-size: 15px;
          line-height: 1.55;
          font-weight: 650;
        }

        .summaryCard {
          padding: 18px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .summaryItem {
          border-radius: 22px;
          background: rgba(255, 253, 247, 0.72);
          padding: 14px;
          min-width: 0;
        }

        .summaryValue {
          color: #203c2e;
          font-size: 24px;
          font-weight: 950;
          letter-spacing: -0.05em;
        }

        .summaryLabel {
          margin-top: 3px;
          color: #6f7868;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .filters {
          padding: 16px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 180px 180px;
          gap: 10px;
          margin-bottom: 18px;
        }

        .input,
        .select,
        .textarea {
          width: 100%;
          border: 1px solid rgba(62, 74, 45, 0.14);
          border-radius: 18px;
          background: rgba(255, 253, 247, 0.78);
          color: #172018;
          padding: 12px 13px;
          font-size: 13px;
          font-weight: 750;
          outline: none;
          min-width: 0;
        }

        .textarea {
          min-height: 98px;
          resize: vertical;
          line-height: 1.45;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          align-items: start;
        }

        .card {
          overflow: hidden;
          min-width: 0;
          display: flex;
          flex-direction: column;
          height: 100%;
          position: relative;
          isolation: isolate;
        }

        /*
          Ajuste principal:
          a imagem fica confinada dentro da área .photo e nunca passa por cima
          dos botões no PWA/mobile. A área do conteúdo fica em camada própria.
        */
        .photo {
          width: 100%;
          height: 184px;
          min-height: 184px;
          flex: 0 0 184px;
          background:
            radial-gradient(circle at 30% 20%, rgba(250, 204, 21, 0.22), transparent 32%),
            linear-gradient(135deg, #294735, #172018);
          display: grid;
          place-items: center;
          color: #fffdf7;
          font-size: 46px;
          position: relative;
          overflow: hidden;
          z-index: 1;
        }

        .photo img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          max-width: 100%;
          object-fit: cover;
          display: block;
          z-index: 1;
        }

        .photo > span:not(.statusPill) {
          position: relative;
          z-index: 2;
        }

        .statusPill {
          position: absolute;
          left: 12px;
          top: 12px;
          z-index: 3;
          border-radius: 999px;
          padding: 7px 10px;
          background: rgba(255, 253, 247, 0.88);
          color: #203c2e;
          font-size: 11px;
          font-weight: 950;
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.12);
        }

        .statusPill.cancelado {
          color: #991b1b;
        }

        .statusPill.pausado,
        .statusPill.rascunho {
          color: #92400e;
        }

        .body {
          padding: 16px;
          min-width: 0;
          position: relative;
          z-index: 2;
          background: rgba(255, 255, 255, 0.78);
          display: flex;
          flex-direction: column;
          flex: 1 1 auto;
        }

        .title {
          margin: 0;
          color: #172018;
          font-size: 18px;
          line-height: 1.1;
          font-weight: 950;
          letter-spacing: -0.04em;
          overflow-wrap: anywhere;
        }

        .meta {
          margin: 8px 0 0;
          color: rgba(23, 32, 24, 0.62);
          font-size: 13px;
          font-weight: 700;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin: 13px 0;
        }

        .chip {
          border-radius: 999px;
          padding: 6px 9px;
          background: rgba(32, 60, 46, 0.08);
          color: #203c2e;
          font-size: 11px;
          font-weight: 900;
          max-width: 100%;
          overflow-wrap: anywhere;
        }

        .chip.red {
          background: rgba(153, 27, 27, 0.09);
          color: #991b1b;
        }

        .chip.gold {
          background: rgba(212, 179, 90, 0.18);
          color: #7c4a03;
        }

        .statsLine {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 12px;
        }

        .miniStat {
          border-radius: 18px;
          background: rgba(255, 253, 247, 0.70);
          padding: 10px;
          min-width: 0;
        }

        .miniValue {
          color: #203c2e;
          font-size: 15px;
          font-weight: 950;
        }

        .miniLabel {
          color: #7b8372;
          font-size: 10px;
          font-weight: 850;
          margin-top: 2px;
        }

        .actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: auto;
          padding-top: 14px;
          position: relative;
          z-index: 4;
          clear: both;
        }

        .actions .btn {
          width: 100%;
        }

        .btn {
          border: 0;
          border-radius: 999px;
          padding: 11px 14px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.16s ease;
          white-space: nowrap;
          min-height: 40px;
          position: relative;
          z-index: 5;
        }

        .btn:hover {
          transform: translateY(-1px);
        }

        .btnDark {
          background: #203c2e;
          color: #fffdf7;
          box-shadow: 0 12px 26px rgba(32, 60, 46, 0.18);
        }

        .btnLight {
          background: rgba(255, 253, 247, 0.82);
          color: #203c2e;
          border: 1px solid rgba(62, 74, 45, 0.12);
        }

        .btnDanger {
          background: #991b1b;
          color: #fffdf7;
          box-shadow: 0 12px 26px rgba(153, 27, 27, 0.18);
        }

        .btnWarn {
          background: #92400e;
          color: #fffdf7;
          box-shadow: 0 12px 26px rgba(146, 64, 14, 0.16);
        }

        .btn:disabled {
          opacity: 0.58;
          cursor: not-allowed;
          transform: none;
        }

        .alert {
          margin-bottom: 14px;
          border-radius: 20px;
          padding: 13px 14px;
          font-size: 13px;
          font-weight: 850;
          line-height: 1.45;
        }

        .alert.ok {
          background: rgba(22, 101, 52, 0.09);
          color: #166534;
          border: 1px solid rgba(22, 101, 52, 0.16);
        }

        .alert.err {
          background: rgba(153, 27, 27, 0.09);
          color: #991b1b;
          border: 1px solid rgba(153, 27, 27, 0.16);
        }

        .empty {
          border-radius: 30px;
          border: 1px solid rgba(62, 74, 45, 0.10);
          background: rgba(255, 255, 255, 0.72);
          padding: 44px 18px;
          text-align: center;
          color: #6f7868;
          font-weight: 850;
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: grid;
          place-items: center;
          padding: 18px;
          background: rgba(8, 13, 7, 0.56);
          backdrop-filter: blur(10px);
        }

        .modal {
          width: min(680px, 100%);
          max-height: min(760px, 92dvh);
          overflow: auto;
          padding: 20px;
          background:
            radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.12), transparent 28%),
            linear-gradient(180deg, #fffdf7 0%, #f3f5ea 100%);
        }

        .modalTitle {
          margin: 0;
          color: #172018;
          font-size: 28px;
          font-weight: 950;
          letter-spacing: -0.055em;
        }

        .modalSub {
          margin-top: 7px;
          color: rgba(23, 32, 24, 0.66);
          font-size: 13px;
          font-weight: 750;
          line-height: 1.45;
        }

        .field {
          margin-top: 14px;
        }

        .label {
          display: block;
          margin-bottom: 7px;
          color: #203c2e;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .modalNotice {
          margin-top: 14px;
          border-radius: 20px;
          padding: 13px;
          background: rgba(212, 179, 90, 0.16);
          border: 1px solid rgba(212, 179, 90, 0.25);
          color: #6b3d05;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.45;
        }


.modalGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.fieldFull {
  grid-column: 1 / -1;
}

.textareaTall {
  min-height: 112px;
  resize: vertical;
}

.modalCompare {
  margin-top: 14px;
  border-radius: 18px;
  background: rgba(32, 60, 46, 0.06);
  border: 1px solid rgba(32, 60, 46, 0.10);
  padding: 12px;
  color: rgba(23, 32, 24, 0.68);
  font-size: 12px;
  line-height: 1.45;
  font-weight: 750;
}

.modalCompare strong {
  color: #203c2e;
}

        .modalActions {
          display: flex;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 18px;
        }

        @media (max-width: 1020px) {
          .hero {
            grid-template-columns: 1fr;
          }

          .grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .filters {
            grid-template-columns: 1fr 1fr;
          }

          .filters .input {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 640px) {
          .headerInner {
            padding: 10px 12px;
            align-items: center;
          }

          .brandLogo {
            width: 30px;
            height: 30px;
          }

          .brandName {
            font-size: 25px;
          }

          .brandSub {
            font-size: 9px;
            letter-spacing: 0.10em;
          }

          .headerActions .btnLight {
            display: none;
          }

          .main {
            padding: 16px 12px 44px;
          }

          .heroCard {
            padding: 18px;
            border-radius: 26px;
          }

          .heroTitle {
            font-size: 34px;
          }

          .summaryCard {
            grid-template-columns: repeat(2, 1fr);
            border-radius: 26px;
          }

          .filters {
            grid-template-columns: 1fr;
            border-radius: 24px;
          }

          .grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .card {
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border-radius: 26px;
          }

          .photo {
            height: 158px;
            min-height: 158px;
            flex-basis: 158px;
          }

          .body {
            padding: 14px;
            background: rgba(255, 255, 255, 0.86);
          }

          .statsLine {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            width: 100%;
          }

.modalGrid {
  grid-template-columns: 1fr;
}


          .actions .btn {
            width: 100%;
            min-width: 0;
          }

          .modalOverlay {
            align-items: end;
            padding: 10px;
          }

          .modal {
            border-radius: 26px;
            max-height: 90dvh;
          }

  
.modalGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.fieldFull {
  grid-column: 1 / -1;
}

.textareaTall {
  min-height: 112px;
  resize: vertical;
}

.modalCompare {
  margin-top: 14px;
  border-radius: 18px;
  background: rgba(32, 60, 46, 0.06);
  border: 1px solid rgba(32, 60, 46, 0.10);
  padding: 12px;
  color: rgba(23, 32, 24, 0.68);
  font-size: 12px;
  line-height: 1.45;
  font-weight: 750;
}

.modalCompare strong {
  color: #203c2e;
}

        .modalActions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .modalActions .btn {
            width: 100%;
          }
        }

        @media (max-width: 380px) {
          .actions {
            grid-template-columns: 1fr;
          }

          .photo {
            height: 148px;
            min-height: 148px;
            flex-basis: 148px;
          }
        }
      `}</style>

      <div className="page">
        <header className="header">
          <div className="headerInner">
            <div className="brand">
              <img
                className="brandLogo"
                src="/logo-prussik-display.png"
                alt="PrussikTrails"
                onError={(event) => {
                  ;(event.currentTarget as HTMLImageElement).style.display = 'none'
                }}
              />

              <div>
                <div className="brandName">PrussikTrails</div>
                <div className="brandSub">Painel do guia</div>
              </div>
            </div>

            <div className="headerActions">
              <button
                type="button"
                className="btn btnLight"
                onClick={() => router.push('/guia/dashboard')}
              >
                Dashboard
              </button>

              <button
                type="button"
                className="btn btnDark"
                onClick={() => router.push('/guia/roteiros/novo')}
              >
                Novo roteiro
              </button>
            </div>
          </div>
        </header>

        <main className="main">
          <section className="hero">
            <div className="heroCard">
              <p className="heroKicker">Gestão de experiências</p>
              <h1 className="heroTitle">Meus roteiros</h1>
              <p className="heroText">
                Administre suas jornadas, acompanhe reservas e cancele roteiros com
                motivo obrigatório quando houver risco, indisponibilidade ou necessidade
                operacional. Quando o guia cancela, os clientes recebem crédito em Saldo
                de Jornada.
              </p>
            </div>

            <div className="summaryCard">
              <div className="summaryItem">
                <div className="summaryValue">{resumo.total}</div>
                <div className="summaryLabel">total</div>
              </div>

              <div className="summaryItem">
                <div className="summaryValue">{resumo.ativos}</div>
                <div className="summaryLabel">ativos</div>
              </div>

              <div className="summaryItem">
                <div className="summaryValue">{resumo.reservasPagas}</div>
                <div className="summaryLabel">pagas</div>
              </div>

              <div className="summaryItem">
                <div className="summaryValue">{resumo.cancelados}</div>
                <div className="summaryLabel">cancelados</div>
              </div>
            </div>
          </section>

          {mensagem && <div className="alert ok">{mensagem}</div>}
          {erro && <div className="alert err">{erro}</div>}

          <section className="filters">
            <input
              className="input"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por título, local, status ou dificuldade..."
            />

            <select
              className="select"
              value={filtroStatus}
              onChange={(event) => setFiltroStatus(event.target.value)}
            >
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativos</option>
              <option value="pausado">Pausados</option>
              <option value="cancelado">Cancelados</option>
              <option value="encerrado">Encerrados</option>
              <option value="rascunho">Rascunhos</option>
            </select>

            <select
              className="select"
              value={filtroDificuldade}
              onChange={(event) => setFiltroDificuldade(event.target.value)}
            >
              <option value="todas">Todas dificuldades</option>
              {dificuldadesDisponiveis.map((dificuldade) => (
                <option key={dificuldade} value={dificuldade}>
                  {dificuldade}
                </option>
              ))}
            </select>
          </section>

          {roteirosFiltrados.length === 0 ? (
            <section className="empty">
              <div style={{ fontSize: 44, marginBottom: 10 }}>🧭</div>
              Nenhum roteiro encontrado com esses filtros.

              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="btn btnDark"
                  onClick={() => router.push('/guia/roteiros/novo')}
                >
                  Criar primeiro roteiro
                </button>
              </div>
            </section>
          ) : (
            <section className="grid">
              {roteirosFiltrados.map((roteiro) => {
                const status = statusRoteiro(roteiro)
                const foto = fotoRoteiro(roteiro)
                const totalReservas = Number(roteiro.reservas_total || 0)
                const reservasPagas = Number(roteiro.reservas_pagas || 0)
                const podeFinalizar = podeFinalizarRoteiro(roteiro)
                const podeCancelar =
                  status === 'ativo' || status === 'pausado' || status === 'rascunho'
                const podeRemover =
                  status === 'cancelado' ||
                  status === 'encerrado' ||
                  status === 'rascunho' ||
                  totalReservas === 0

                return (
                  <article className="card" key={roteiro.id}>
                    <div className="photo">
                      {foto ? (
                        <img
                          src={foto}
                          alt={tituloRoteiro(roteiro)}
                          onError={(event) => {
                            ;(event.currentTarget as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <span>🥾</span>
                      )}

                      <span className={`statusPill ${status}`}>
                        {labelStatus(status)}
                      </span>
                    </div>

                    <div className="body">
                      <h2 className="title">{tituloRoteiro(roteiro)}</h2>

                      <div className="meta">
                        {localRoteiro(roteiro)}
                        <br />
                        {formatarData(dataPrincipal(roteiro))}
                      </div>

                      <div className="chips">
                        <span className="chip">{formatarMoeda(valorRoteiro(roteiro))}</span>

                        <span className="chip">{labelRecorrencia(roteiro.recorrencia)}</span>

                        {roteiro.renovar_automaticamente ? (
                          <span className="chip gold">renovação automática</span>
                        ) : null}

                        {status === 'cancelado' && roteiro.cancelamento_motivo_codigo ? (
                          <span className="chip red">
                            {roteiro.cancelamento_motivo_codigo}
                          </span>
                        ) : null}
                      </div>

                      <div className="statsLine">
                        <div className="miniStat">
                          <div className="miniValue">{kmRoteiro(roteiro) || '-'}</div>
                          <div className="miniLabel">km</div>
                        </div>

                        <div className="miniStat">
                          <div className="miniValue">{duracaoRoteiro(roteiro) || '-'}</div>
                          <div className="miniLabel">horas</div>
                        </div>

                        <div className="miniStat">
                          <div className="miniValue">{limiteRoteiro(roteiro) || '-'}</div>
                          <div className="miniLabel">vagas</div>
                        </div>
                      </div>

                      <div className="statsLine">
                        <div className="miniStat">
                          <div className="miniValue">{totalReservas}</div>
                          <div className="miniLabel">reservas</div>
                        </div>

                        <div className="miniStat">
                          <div className="miniValue">{reservasPagas}</div>
                          <div className="miniLabel">pagas</div>
                        </div>

                        <div className="miniStat">
                          <div className="miniValue">{Number(roteiro.reservas_realizadas || 0)}</div>
                          <div className="miniLabel">realizadas</div>
                        </div>

                        <div className="miniStat">
                          <div className="miniValue">
                            {Number(roteiro.reservas_pendentes || 0)}
                          </div>
                          <div className="miniLabel">pendentes</div>
                        </div>
                      </div>

                      <div className="actions">
                        <button
                          type="button"
                          className="btn btnLight"
                          onClick={() => router.push(`/roteiros/${roteiro.id}`)}
                        >
                          Ver
                        </button>

                        <button
                          type="button"
                          className="btn btnDark"
                          onClick={() => router.push(`/guia/roteiros/editar/${roteiro.id}`)}
                          disabled={status === 'cancelado'}
                        >
                          Editar
                        </button>

                        {status !== 'cancelado' && status !== 'encerrado' && status !== 'removido' ? (
                          <button
                            type="button"
                            className="btn btnLight"
                            onClick={() => abrirModalAtualizacao(roteiro)}
                          >
                            Solicitar att
                          </button>
                        ) : null}

                        {podeFinalizar ? (
                          <button
                            type="button"
                            className="btn btnGreen"
                            onClick={() => handleFinalizarRoteiro(roteiro)}
                            disabled={finalizandoId === roteiro.id}
                          >
                            {finalizandoId === roteiro.id ? 'Finalizando...' : 'Finalizar roteiro'}
                          </button>
                        ) : null}

                        {podeCancelar ? (
                          <button
                            type="button"
                            className="btn btnWarn"
                            onClick={() => abrirModalCancelamento(roteiro)}
                          >
                            Cancelar
                          </button>
                        ) : null}

                        {podeRemover ? (
                          <button
                            type="button"
                            className="btn btnDanger"
                            onClick={() => handleRemoverRoteiro(roteiro)}
                            disabled={removendoId === roteiro.id}
                          >
                            {removendoId === roteiro.id ? 'Removendo...' : 'Remover'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>
          )}
        </main>

        {roteiroCancelamento && (
          <div className="modalOverlay" role="dialog" aria-modal="true">
            <section className="modal">
              <h2 className="modalTitle">Cancelar roteiro</h2>

              <p className="modalSub">
                Você está cancelando <strong>{tituloRoteiro(roteiroCancelamento)}</strong>.
                O motivo ficará registrado e as reservas vinculadas receberão crédito em
                Saldo de Jornada quando aplicável.
              </p>

              <div className="modalNotice">
                Cancelamento pelo guia gera crédito integral ao cliente e preserva o
                histórico financeiro, reservas e extrato.
              </div>

              <div className="field">
                <label className="label">Motivo do cancelamento</label>
                <select
                  className="select"
                  value={motivoCodigo}
                  onChange={(event) => atualizarMotivo(event.target.value)}
                >
                  {MOTIVOS_CANCELAMENTO.map((motivo) => (
                    <option value={motivo.codigo} key={motivo.codigo}>
                      {motivo.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="label">Descrição para registro</label>
                <textarea
                  className="textarea"
                  value={motivoDescricao}
                  onChange={(event) => setMotivoDescricao(event.target.value)}
                  placeholder="Descreva o motivo do cancelamento..."
                />
              </div>

              <div className="field">
                <label className="label">Observação complementar do guia</label>
                <textarea
                  className="textarea"
                  value={observacaoGuia}
                  onChange={(event) => setObservacaoGuia(event.target.value)}
                  placeholder="Opcional. Use para explicar detalhes operacionais, clima, segurança ou orientação aos clientes."
                />
              </div>

              <div className="modalActions">
                <button
                  type="button"
                  className="btn btnLight"
                  onClick={fecharModalCancelamento}
                  disabled={cancelando}
                >
                  Voltar
                </button>

                <button
                  type="button"
                  className="btn btnDanger"
                  onClick={confirmarCancelamentoRoteiro}
                  disabled={cancelando}
                >
                  {cancelando ? 'Cancelando...' : 'Confirmar cancelamento'}
                </button>
              </div>
            </section>
          </div>
        )}

        {roteiroAtualizacao && (
  <div className="modalOverlay" role="dialog" aria-modal="true">
    <section className="modal">
      <h2 className="modalTitle">Solicitar atualização</h2>

      <p className="modalSub">
        Informe a mudança necessária em <strong>{tituloRoteiro(roteiroAtualizacao)}</strong>.
        O Admin poderá revisar, ajustar e aplicar a nova data, horário, local, preço ou descrição.
      </p>

      <div className="modalNotice">
        O roteiro público não muda imediatamente. A alteração entra como solicitação pendente e só será aplicada depois da aprovação administrativa.
      </div>

      <div className="modalCompare">
        <strong>Dados atuais:</strong>
        <br />
        Data: {formatarData(dataPrincipal(roteiroAtualizacao))} · Local: {localRoteiro(roteiroAtualizacao)} · Valor: {formatarMoeda(valorRoteiro(roteiroAtualizacao))}
      </div>

      <div className="modalGrid">
        <div className="field fieldFull">
          <label className="label">Título sugerido</label>
          <input
            className="input"
            value={atualizacaoTitulo}
            onChange={(event) => setAtualizacaoTitulo(event.target.value)}
            placeholder="Título do roteiro"
          />
        </div>

        <div className="field">
          <label className="label">Nova data</label>
          <input
            className="input"
            type="date"
            value={atualizacaoData}
            onChange={(event) => setAtualizacaoData(event.target.value)}
          />
        </div>

        <div className="field">
          <label className="label">Novo horário</label>
          <input
            className="input"
            type="time"
            value={atualizacaoHora}
            onChange={(event) => setAtualizacaoHora(event.target.value)}
          />
        </div>

        <div className="field fieldFull">
          <label className="label">Local de encontro / embarque</label>
          <input
            className="input"
            value={atualizacaoLocal}
            onChange={(event) => setAtualizacaoLocal(event.target.value)}
            placeholder="Informe o novo local, se necessário"
          />
        </div>

        <div className="field">
          <label className="label">Preço sugerido</label>
          <input
            className="input"
            value={atualizacaoPreco}
            onChange={(event) => setAtualizacaoPreco(event.target.value)}
            inputMode="decimal"
            placeholder="Ex.: 120,00"
          />
        </div>

        <div className="field fieldFull">
          <label className="label">Descrição sugerida</label>
          <textarea
            className="textarea textareaTall"
            value={atualizacaoDescricao}
            onChange={(event) => setAtualizacaoDescricao(event.target.value)}
            placeholder="Atualize o descritivo do roteiro, se necessário"
          />
        </div>

        <div className="field fieldFull">
          <label className="label">Observação para o Admin</label>
          <textarea
            className="textarea textareaTall"
            value={atualizacaoObservacao}
            onChange={(event) => setAtualizacaoObservacao(event.target.value)}
            placeholder="Explique o motivo da atualização: clima, logística, ajuste de horário, mudança no ponto de encontro etc."
          />
        </div>
      </div>

      <div className="modalActions">
        <button
          type="button"
          className="btn btnLight"
          onClick={fecharModalAtualizacao}
          disabled={enviandoAtualizacao}
        >
          Voltar
        </button>

        <button
          type="button"
          className="btn btnDark"
          onClick={confirmarSolicitacaoAtualizacao}
          disabled={enviandoAtualizacao}
        >
          {enviandoAtualizacao ? 'Enviando...' : 'Enviar para aprovação'}
        </button>
      </div>
    </section>
  </div>
)}
      </div>
    </>
  )
}
