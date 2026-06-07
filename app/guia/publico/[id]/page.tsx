'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Guia = {
  id: string
  nome?: string | null
  email?: string | null
  tipo?: string | null
  bio?: string | null
  bio_guia?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  cadastur?: string | null
  cadastur_numero?: string | null
  cadastur_status?: string | null
  cadastur_informado_em?: string | null
  cadastur_verificado?: boolean | null
  guia_verificado_cadastur?: boolean | null
  cadastur_validade?: string | null
  cadastur_data_validade?: string | null
  cadastur_validade_ate?: string | null
  cadastur_vencimento?: string | null
  cadastur_ativo_desde?: string | null
  cadastur_verificado_em?: string | null
  cadastur_data_verificacao?: string | null
  created_at?: string | null
  nivel_guia?: number | null
  xp_guia?: number | null
  guia_beta?: boolean | null
  guia_pioneiro_beta?: boolean | null
  medalha_guia_pioneiro_beta?: boolean | null
  beneficio_taxa_beta_ativo?: boolean | null
  taxa_plataforma_percentual?: number | null
}

type Roteiro = {
  id: string
  titulo?: string | null
  nome?: string | null
  descricao?: string | null
  km?: number | null
  distancia_km?: number | null
  preco?: number | null
  valor?: number | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  local?: string | null
  localizacao?: string | null
  dificuldade?: string | null
  status?: string | null
  id_guia?: string | null
  guia_id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  created_at?: string | null
  data?: string | null
  data_roteiro?: string | null
  data_inicio?: string | null
  data_saida?: string | null
  data_evento?: string | null
  data_hora?: string | null
  inicio_em?: string | null
  embarque_data_hora?: string | null
  saida_data_hora?: string | null
  data_realizacao?: string | null
  [key: string]: unknown
}

type Reserva = {
  id: string
  roteiro_id?: string | null
  id_roteiro?: string | null
  roteiroId?: string | null
  cliente_id?: string | null
  id_cliente?: string | null
  clienteId?: string | null
  usuario_cliente_id?: string | null
  status?: string | null
  pagamento_status?: string | null
  status_pagamento?: string | null
  payment_status?: string | null
  pix_status?: string | null
  status_pix?: string | null
  paghiper_status?: string | null
  transaction_status?: string | null
  status_transacao?: string | null
  guia_id?: string | null
  id_guia?: string | null
  user_id?: string | null
  usuario_id?: string | null
  data?: string | null
  data_roteiro?: string | null
  data_evento?: string | null
  data_realizacao?: string | null
  data_hora?: string | null
  realizado_em?: string | null
  executado_em?: string | null
  [key: string]: unknown
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
  status_moderacao?: string | null
  [key: string]: unknown
}

type Stats = {
  totalKm: number
  totalRoteiros: number
  totalReservas: number
  reservasConfirmadas: number
  totalClientes: number
  avaliacaoMedia: number
  totalAvaliacoes: number
}

type MedalhaGuia = {
  codigo: string
  nome: string
  descricao: string
  svg: string
  fallbackSvg?: string
  desbloqueada: boolean
  destaque?: boolean
  categoria?: 'progressao' | 'cadastur' | 'beta' | 'atuacao'
}

type ReportReason = 'seguranca' | 'conduta' | 'informacao' | 'pagamento' | 'outro'

const statsInicial: Stats = {
  totalKm: 0,
  totalRoteiros: 0,
  totalReservas: 0,
  reservasConfirmadas: 0,
  totalClientes: 0,
  avaliacaoMedia: 0,
  totalAvaliacoes: 0
}

const PROGRESSAO_BASE = '/medalhas/progressao'
const BETA_BASE = '/medalhas/iniciais_jornada'
const BETA_FALLBACK_BASE = '/medalhas/prussik_svg_pack/iniciais_jornada'
const CADASTUR_BASE = '/medalhas/cadastur'

const CADASTUR_TIERS = [
  {
    anos: 1,
    codigo: 'cadastur_bronze',
    nome: 'CADASTUR Bronze',
    descricao: 'Reconhecimento por 1 ano com CADASTUR ativo.',
    svg: `${CADASTUR_BASE}/cadastur_bronze.svg`
  },
  {
    anos: 2,
    codigo: 'cadastur_prata',
    nome: 'CADASTUR Prata',
    descricao: 'Reconhecimento por 2 anos com CADASTUR ativo.',
    svg: `${CADASTUR_BASE}/cadastur_prata.svg`
  },
  {
    anos: 3,
    codigo: 'cadastur_ouro',
    nome: 'CADASTUR Ouro',
    descricao: 'Reconhecimento por 3 anos com CADASTUR ativo.',
    svg: `${CADASTUR_BASE}/cadastur_ouro.svg`
  },
  {
    anos: 5,
    codigo: 'cadastur_platina',
    nome: 'CADASTUR Platina',
    descricao: 'Reconhecimento por 5 anos com CADASTUR ativo.',
    svg: `${CADASTUR_BASE}/cadastur_platina.svg`
  },
  {
    anos: 10,
    codigo: 'cadastur_onyx',
    nome: 'CADASTUR Onyx',
    descricao: 'Reconhecimento por 10 anos com CADASTUR ativo.',
    svg: `${CADASTUR_BASE}/cadastur_onyx.svg`
  }
]

const marcosKmGuia = [
  { km: 0, nome: 'Início' },
  { km: 32, nome: 'Bronze' },
  { km: 96, nome: 'Prata' },
  { km: 192, nome: 'Ouro' },
  { km: 384, nome: 'Platina' },
  { km: 768, nome: 'Onyx' },
  { km: 1152, nome: 'Mestre' },
  { km: 1920, nome: 'Lenda' },
  { km: 3840, nome: 'Especial' },
  { km: 7680, nome: 'Mapa Lendário' }
]

function normalizar(valor: unknown): string {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}


function extrairUsuarioLocalId(usuario: any): string {
  return String(
    usuario?.id ||
      usuario?.user_id ||
      usuario?.usuario_id ||
      usuario?.guia_id ||
      usuario?.cliente_id ||
      ''
  ).trim()
}

function formatarMoeda(valor: unknown): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(valor || 0))
}

function formatarData(valor?: string | null): string {
  if (!valor) return ''
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return ''
  return data.toLocaleDateString('pt-BR')
}

function dataValidaFutura(valor?: string | null): boolean {
  if (!valor) return false

  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return false

  const fimDoDia = new Date(data)
  fimDoDia.setHours(23, 59, 59, 999)

  return fimDoDia.getTime() >= Date.now()
}

function anosDesde(valor?: string | null): number {
  if (!valor) return 0

  const inicio = new Date(valor)
  if (Number.isNaN(inicio.getTime())) return 0

  const agora = new Date()
  let anos = agora.getFullYear() - inicio.getFullYear()

  const aindaNaoFezAniversario =
    agora.getMonth() < inicio.getMonth() ||
    (agora.getMonth() === inicio.getMonth() && agora.getDate() < inicio.getDate())

  if (aindaNaoFezAniversario) anos -= 1

  return Math.max(0, anos)
}

function valorNormalizadoRegistro(registro: Record<string, unknown>, campos: string[]): string {
  for (const campo of campos) {
    const valor = registro[campo]
    if (valor === null || valor === undefined) continue

    const normalizado = normalizar(String(valor))
    if (normalizado) return normalizado
  }

  return ''
}

function pagamentoConfirmado(reserva: Reserva): boolean {
  const registro = reserva as Record<string, unknown>

  const pagamento = valorNormalizadoRegistro(registro, [
    'pagamento_status',
    'status_pagamento',
    'payment_status',
    'pix_status',
    'status_pix',
    'paghiper_status',
    'transaction_status',
    'status_transacao',
    'status_paghiper'
  ])

  const status = normalizar(reserva.status)

  const statusConfirmados = [
    'pago',
    'paga',
    'pagamento_confirmado',
    'confirmado',
    'confirmada',
    'aprovado',
    'aprovada',
    'approved',
    'paid',
    'completed',
    'complete',
    'succeeded',
    'success',
    'sucesso',
    'liquidado',
    'liquidada',
    'settled',
    'realizado',
    'realizada',
    'executado',
    'executada',
    'concluido',
    'concluida',
    'concluído',
    'concluída'
  ]

  return statusConfirmados.includes(pagamento) || statusConfirmados.includes(status)
}

function reservaRoteiroId(reserva: Reserva): string {
  const registro = reserva as Record<string, unknown>
  return String(
    reserva.roteiro_id ||
      reserva.id_roteiro ||
      reserva.roteiroId ||
      registro.roteiro ||
      ''
  ).trim()
}

function reservaClienteId(reserva: Reserva): string {
  const registro = reserva as Record<string, unknown>
  return String(
    reserva.cliente_id ||
      reserva.id_cliente ||
      reserva.clienteId ||
      reserva.usuario_cliente_id ||
      registro.cliente ||
      ''
  ).trim()
}

function roteiroAtivo(roteiro: Roteiro): boolean {
  const status = normalizar(roteiro.status)

  if (!status) return true

  return (
    status === 'ativo' ||
    status === 'aprovado' ||
    status === 'aprovada' ||
    status === 'publicado' ||
    status === 'publicada'
  )
}

function roteiroStatusExecutado(roteiro: Roteiro): boolean {
  const status = normalizar(roteiro.status)

  return (
    status === 'realizado' ||
    status === 'realizada' ||
    status === 'executado' ||
    status === 'executada' ||
    status === 'concluido' ||
    status === 'concluida' ||
    status === 'concluído' ||
    status === 'concluída' ||
    status === 'finalizado' ||
    status === 'finalizada' ||
    status === 'encerrado' ||
    status === 'encerrada'
  )
}

function roteiroVisivelNoPerfil(roteiro: Roteiro): boolean {
  const status = normalizar(roteiro.status)

  if (!status) return true

  const ocultos = [
    'rascunho',
    'cancelado',
    'cancelada',
    'excluido',
    'excluida',
    'excluído',
    'excluída',
    'rejeitado',
    'rejeitada',
    'arquivado',
    'arquivada',
    'inativo',
    'inativa'
  ]

  if (ocultos.includes(status)) return false

  return roteiroAtivo(roteiro) || roteiroStatusExecutado(roteiro)
}

function fotoRoteiro(roteiro: Roteiro): string {
  return roteiro.foto_capa || roteiro.foto_url || roteiro.imagem_url || ''
}

function tituloRoteiro(roteiro: Roteiro): string {
  return roteiro.titulo || roteiro.nome || 'Roteiro'
}

function localRoteiro(roteiro: Roteiro): string {
  return roteiro.local || roteiro.localizacao || 'Local a confirmar'
}

function kmRoteiro(roteiro: Roteiro): number {
  return Number(roteiro.km || roteiro.distancia_km || 0)
}

function valorRoteiro(roteiro: Roteiro): number {
  return Number(roteiro.preco || roteiro.valor || 0)
}

function classeVisualMedalha(valor?: string | null): string {
  return normalizar(valor)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function dataSegura(valor: unknown): Date | null {
  if (!valor) return null

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) return valor

  const texto = String(valor).trim()
  if (!texto) return null

  const matchDataBR = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/)
  if (matchDataBR) {
    const [, dia, mes, ano, hora = '12', minuto = '00'] = matchDataBR
    const dataBR = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto))
    if (!Number.isNaN(dataBR.getTime())) return dataBR
  }

  const data = new Date(texto)
  if (Number.isNaN(data.getTime())) return null

  const ano = data.getFullYear()
  if (ano < 2020 || ano > 2100) return null

  return data
}

function dataExecucaoRegistro(registro: Record<string, unknown>): Date | null {
  const camposPreferidos = [
    'embarque_data_hora',
    'saida_data_hora',
    'data_hora',
    'data_roteiro',
    'data_trilha',
    'data_inicio',
    'data_saida',
    'data_evento',
    'data_realizacao',
    'data_execucao',
    'data_agendada',
    'data_agendamento',
    'inicio_em',
    'realizado_em',
    'executado_em',
    'start_date',
    'starts_at',
    'data'
  ]

  for (const campo of camposPreferidos) {
    const data = dataSegura(registro[campo])
    if (data) return data
  }

  const dataSeparada =
    registro.data ||
    registro.data_roteiro ||
    registro.data_trilha ||
    registro.data_inicio ||
    registro.data_saida ||
    registro.data_evento

  const horaSeparada =
    registro.hora ||
    registro.horario ||
    registro.horario_saida ||
    registro.hora_saida ||
    registro.hora_inicio

  if (dataSeparada && horaSeparada) {
    const dataComHora = dataSegura(`${String(dataSeparada).trim()} ${String(horaSeparada).trim()}`)
    if (dataComHora) return dataComHora
  }

  for (const [chave, valor] of Object.entries(registro)) {
    const chaveNormalizada = normalizar(chave)

    if (
      chaveNormalizada === 'created_at' ||
      chaveNormalizada === 'updated_at' ||
      chaveNormalizada.includes('cadastur')
    ) {
      continue
    }

    const pareceCampoDeData =
      chaveNormalizada.includes('data') ||
      chaveNormalizada.includes('date') ||
      chaveNormalizada.endsWith('_em') ||
      chaveNormalizada.endsWith('_at')

    if (!pareceCampoDeData) continue

    const data = dataSegura(valor)
    if (data) return data
  }

  return null
}

function dataExecucaoRoteiro(roteiro: Roteiro): Date | null {
  return dataExecucaoRegistro(roteiro as Record<string, unknown>)
}

function roteiroJaExecutadoPorData(roteiro: Roteiro): boolean {
  const data = dataExecucaoRoteiro(roteiro)

  if (!data) return false

  const fimDoDia = new Date(data)
  fimDoDia.setHours(23, 59, 59, 999)

  return fimDoDia.getTime() < Date.now()
}

function reservaRealizada(reserva: Reserva): boolean {
  const status = normalizar(reserva.status)
  return (
    status === 'realizada' ||
    status === 'executada' ||
    status === 'concluida' ||
    status === 'concluída' ||
    status === 'finalizada' ||
    status === 'finalizado' ||
    status === 'encerrada' ||
    status === 'encerrado'
  )
}

function reservaJaExecutadaPorData(reserva: Reserva): boolean {
  const data = dataExecucaoRegistro(reserva as Record<string, unknown>)

  if (!data) return false

  const fimDoDia = new Date(data)
  fimDoDia.setHours(23, 59, 59, 999)

  return fimDoDia.getTime() < Date.now()
}

function reservaContaParaProgressao(
  reserva: Reserva,
  roteiro?: Roteiro,
  clientesComAvaliacao?: Set<string>
): boolean {
  if (reservaRealizada(reserva)) return true

  const clienteId = reservaClienteId(reserva)
  if (clienteId && clientesComAvaliacao?.has(clienteId)) return true

  if (!pagamentoConfirmado(reserva)) return false

  if (reservaJaExecutadaPorData(reserva)) return true
  if (!roteiro) return false

  return roteiroStatusExecutado(roteiro) || roteiroJaExecutadoPorData(roteiro)
}

function roteiroContaParaProgressao(roteiro: Roteiro): boolean {
  return roteiroStatusExecutado(roteiro) || roteiroJaExecutadoPorData(roteiro)
}

function primeiroNome(nome?: string | null): string {
  const limpo = String(nome || '').trim()
  if (!limpo) return 'Guia'
  return limpo.split(' ')[0] || limpo
}

function estrelas(nota?: number | null): string {
  const valor = Math.max(0, Math.min(5, Math.round(Number(nota || 0))))
  return '★'.repeat(valor) + '☆'.repeat(5 - valor)
}

function calcularProgressoKm(km: number): number {
  let anterior = 0
  let proximo = marcosKmGuia[marcosKmGuia.length - 1].km

  for (const marco of marcosKmGuia) {
    if (km >= marco.km) anterior = marco.km
    if (km < marco.km) {
      proximo = marco.km
      break
    }
  }

  if (proximo <= anterior) return 100
  return Math.max(0, Math.min(100, Math.round(((km - anterior) / (proximo - anterior)) * 100)))
}

function nivelPorKm(km: number): string {
  let atual = marcosKmGuia[0].nome
  for (const marco of marcosKmGuia) {
    if (km >= marco.km) atual = marco.nome
  }
  return atual
}

function MedalhaImagem({ src, fallback, alt }: { src: string; fallback?: string; alt: string }) {
  const [fallbackUsado, setFallbackUsado] = useState(false)
  const [erro, setErro] = useState(false)

  if (erro) return <span className="medalFallback">🏅</span>

  return (
    <img
      src={fallbackUsado && fallback ? fallback : src}
      alt={alt}
      className="medalSvg"
      onError={() => {
        if (fallback && !fallbackUsado) {
          setFallbackUsado(true)
          return
        }
        setErro(true)
      }}
    />
  )
}

export default function PerfilPublicoGuiaPage() {
  const params = useParams()
  const router = useRouter()
  const guiaId = String(params?.id || '')

  const [guia, setGuia] = useState<Guia | null>(null)
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [stats, setStats] = useState<Stats>(statsInicial)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [reportAberto, setReportAberto] = useState(false)
  const [reportMotivo, setReportMotivo] = useState<ReportReason>('seguranca')
  const [reportTexto, setReportTexto] = useState('')
  const [reportEnviado, setReportEnviado] = useState(false)
  const [usuarioLogadoId, setUsuarioLogadoId] = useState('')
  const [seguindoPerfil, setSeguindoPerfil] = useState(false)
  const [seguidoresTotal, setSeguidoresTotal] = useState(0)
  const [seguindoSalvando, setSeguindoSalvando] = useState(false)
  const [seguindoErro, setSeguindoErro] = useState('')
  const [medalhaSelecionada, setMedalhaSelecionada] = useState<MedalhaGuia | null>(null)

  useEffect(() => {
    if (!guiaId) return
    carregarPerfil()
    carregarStatusSocial()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guiaId])

  const fotoGuia = () => guia?.avatar_url || guia?.foto_url || guia?.imagem_url || ''
  const nomeGuia = () => guia?.nome || guia?.email || 'Guia PrussikTrails'
  const bioGuia = () => guia?.bio_guia || guia?.bio || ''

  const guiaPioneiroBeta = () => {
    return Boolean(
      guia?.medalha_guia_pioneiro_beta ||
        guia?.guia_pioneiro_beta ||
        guia?.guia_beta ||
        guia?.beneficio_taxa_beta_ativo ||
        Number(guia?.taxa_plataforma_percentual || 0) === 5
    )
  }


  const carregarStatusSocial = async () => {
    try {
      setSeguindoErro('')

      const salvo = localStorage.getItem('user')
      const usuario = salvo ? JSON.parse(salvo) : null
      const idLogado = extrairUsuarioLocalId(usuario)
      setUsuarioLogadoId(idLogado)

      const { count } = await supabase
        .from('seguidores')
        .select('id', { count: 'exact', head: true })
        .eq('seguido_id', guiaId)
        .eq('status', 'ativo')

      setSeguidoresTotal(count || 0)

      if (!idLogado || idLogado === guiaId) {
        setSeguindoPerfil(false)
        return
      }

      const { data } = await supabase
        .from('seguidores')
        .select('id, status')
        .eq('seguidor_id', idLogado)
        .eq('seguido_id', guiaId)
        .maybeSingle()

      setSeguindoPerfil(data?.status === 'ativo')
    } catch (error) {
      console.warn('Não foi possível carregar status social do guia:', error)
    }
  }

  const alternarSeguir = async () => {
    if (!usuarioLogadoId) {
      router.push('/login')
      return
    }

    if (!guiaId || usuarioLogadoId === guiaId) return

    try {
      setSeguindoErro('')
      setSeguindoSalvando(true)

      const resposta = await fetch('/api/social/seguir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seguidorId: usuarioLogadoId,
          seguidoId: guiaId,
          origem: 'perfil_publico_guia'
        })
      })

      const json = await resposta.json().catch(() => null)

      if (!resposta.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível atualizar agora.')
      }

      const novoStatus = Boolean(json.seguindo)
      setSeguindoPerfil(novoStatus)
      setSeguidoresTotal((prev) => Math.max(prev + (novoStatus ? 1 : -1), 0))
    } catch (error: unknown) {
      setSeguindoErro(error instanceof Error ? error.message : 'Erro ao seguir este guia.')
    } finally {
      setSeguindoSalvando(false)
    }
  }

  const buscarRoteirosDoGuia = async (id: string) => {
    const campos = ['id_guia', 'guia_id', 'user_id', 'usuario_id']
    const mapa = new Map<string, Roteiro>()

    for (const campo of campos) {
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .eq(campo, id)
        .limit(200)

      if (!error && data) {
        ;(data as Roteiro[]).forEach((roteiro: Roteiro) => {
          if (roteiro?.id) mapa.set(roteiro.id, roteiro)
        })
      }
    }

    return Array.from(mapa.values()).filter(roteiroVisivelNoPerfil)
  }

  const buscarReservasDoGuia = async (id: string, roteiroIds: string[]) => {
    const mapa = new Map<string, Reserva>()

    if (roteiroIds.length > 0) {
      const camposRoteiro = ['roteiro_id', 'id_roteiro']

      for (const campo of camposRoteiro) {
        const { data, error } = await supabase
          .from('reservas')
          .select('*')
          .in(campo, roteiroIds)
          .limit(2000)

        if (!error && data) {
          ;(data as Reserva[]).forEach((reserva: Reserva) => {
            if (reserva?.id) mapa.set(reserva.id, reserva)
          })
        }
      }
    }

    const camposGuia = ['guia_id', 'id_guia', 'user_id', 'usuario_id']

    for (const campo of camposGuia) {
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .eq(campo, id)
        .limit(2000)

      if (!error && data) {
        ;(data as Reserva[]).forEach((reserva: Reserva) => {
          if (reserva?.id) mapa.set(reserva.id, reserva)
        })
      }
    }

    return Array.from(mapa.values())
  }

  const buscarRoteirosPorIds = async (ids: string[]) => {
    const idsUnicos = Array.from(new Set(ids.filter(Boolean)))

    if (idsUnicos.length === 0) return []

    const { data, error } = await supabase
      .from('roteiros')
      .select('*')
      .in('id', idsUnicos)
      .limit(200)

    if (error || !data) return []

    return data as Roteiro[]
  }

  const buscarAvaliacoesDoGuia = async (id: string) => {
    const campos = ['guia_id', 'id_guia']
    let lista: Avaliacao[] = []

    for (const campo of campos) {
      const { data, error } = await supabase
        .from('avaliacoes')
        .select('*')
        .eq(campo, id)
        .order('created_at', { ascending: false })
        .limit(30)

      if (!error && data) {
        lista = data as Avaliacao[]
        break
      }
    }

    lista = lista.filter((avaliacao: Avaliacao) => {
      const status = normalizar(avaliacao.status_moderacao)
      if (!status) return true
      return status === 'aprovada' || status === 'aprovado'
    })

    const clienteIds = Array.from(
      new Set(
        lista
          .map((avaliacao: Avaliacao) => avaliacao.cliente_id)
          .filter(Boolean) as string[]
      )
    )

    if (clienteIds.length === 0) return lista

    const { data: clientes } = await supabase
      .from('users')
      .select('id, nome, email, avatar_url, foto_url, imagem_url')
      .in('id', clienteIds)

    return lista.map((avaliacao: Avaliacao) => {
      const cliente = (clientes || []).find((item: any) => item.id === avaliacao.cliente_id)

      return {
        ...avaliacao,
        cliente_nome: cliente?.nome || cliente?.email || 'Cliente PrussikTrails',
        cliente_avatar: cliente?.avatar_url || cliente?.foto_url || cliente?.imagem_url || ''
      }
    })
  }

  const carregarMetricasPublicas = async (id: string): Promise<Stats | null> => {
    try {
      const response = await fetch(`/api/guia/publico/${encodeURIComponent(id)}/metricas`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        }
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.sucesso || !data?.stats) {
        console.warn('Métricas públicas do guia indisponíveis:', data)
        return null
      }

      return {
        totalKm: Number(data.stats.totalKm || 0),
        totalRoteiros: Number(data.stats.totalRoteiros || 0),
        totalReservas: Number(data.stats.totalReservas || 0),
        reservasConfirmadas: Number(data.stats.reservasConfirmadas || 0),
        totalClientes: Number(data.stats.totalClientes || 0),
        avaliacaoMedia: Number(data.stats.avaliacaoMedia || 0),
        totalAvaliacoes: Number(data.stats.totalAvaliacoes || 0)
      }
    } catch (error) {
      console.warn('Erro ao carregar métricas públicas do guia pela API:', error)
      return null
    }
  }

  const carregarPerfil = async () => {
    setCarregando(true)
    setErro('')

    try {
      const { data: guiaData, error: guiaError } = await supabase
        .from('users')
        .select('*')
        .eq('id', guiaId)
        .maybeSingle()

      if (guiaError) {
        console.error('Erro ao carregar guia:', guiaError)
        setErro('Não foi possível carregar este perfil.')
        return
      }

      if (!guiaData) {
        setErro('Guia não encontrado.')
        return
      }

      setGuia(guiaData as Guia)

      const roteirosDoGuia = await buscarRoteirosDoGuia(guiaId)
      setRoteiros(roteirosDoGuia)

      const roteiroIds = roteirosDoGuia.map((roteiro: Roteiro) => roteiro.id).filter(Boolean)
      const reservas = await buscarReservasDoGuia(guiaId, roteiroIds)

      const avaliacoesDoGuia = await buscarAvaliacoesDoGuia(guiaId)
      setAvaliacoes(avaliacoesDoGuia)

      const roteirosPorId = new Map<string, Roteiro>(
        roteirosDoGuia.map((roteiro: Roteiro) => [roteiro.id, roteiro])
      )

      const roteiroIdsReservas = Array.from(
        new Set(reservas.map((reserva: Reserva) => reservaRoteiroId(reserva)).filter(Boolean))
      )

      const roteirosFaltantes = roteiroIdsReservas.filter((idRoteiro) => !roteirosPorId.has(idRoteiro))

      if (roteirosFaltantes.length > 0) {
        const roteirosExtras = await buscarRoteirosPorIds(roteirosFaltantes)
        roteirosExtras.forEach((roteiro: Roteiro) => {
          if (roteiro?.id) roteirosPorId.set(roteiro.id, roteiro)
        })
      }

      const todosRoteirosDoCalculo = Array.from(roteirosPorId.values())

      const clientesComAvaliacao = new Set(
        avaliacoesDoGuia
          .map((avaliacao: Avaliacao) => avaliacao.cliente_id)
          .filter(Boolean) as string[]
      )

      const reservasPagas = reservas.filter((reserva: Reserva) => pagamentoConfirmado(reserva))

      const reservasExecutadas = reservas.filter((reserva: Reserva) => {
        const roteiroId = reservaRoteiroId(reserva)
        const roteiro = roteiroId ? roteirosPorId.get(roteiroId) : undefined
        return reservaContaParaProgressao(reserva, roteiro, clientesComAvaliacao)
      })

      const reservasComerciais = reservasPagas.length > 0 ? reservasPagas : reservasExecutadas

      const roteiroIdsComerciais = new Set<string>()

      todosRoteirosDoCalculo.forEach((roteiro: Roteiro) => {
        if (roteiroContaParaProgressao(roteiro)) roteiroIdsComerciais.add(roteiro.id)
      })

      reservasComerciais.forEach((reserva: Reserva) => {
        const roteiroId = reservaRoteiroId(reserva)
        if (roteiroId) roteiroIdsComerciais.add(roteiroId)
      })

      const roteirosExecutados = todosRoteirosDoCalculo.filter((roteiro: Roteiro) =>
        roteiroIdsComerciais.has(roteiro.id)
      )

      const totalKm = roteirosExecutados.reduce(
        (total: number, roteiro: Roteiro) => total + kmRoteiro(roteiro),
        0
      )

      const clientesUnicos = new Set<string>()

      reservasComerciais.forEach((reserva: Reserva) => {
        const clienteId = reservaClienteId(reserva)
        if (clienteId) clientesUnicos.add(clienteId)
      })

      clientesComAvaliacao.forEach((clienteId) => {
        if (clienteId) clientesUnicos.add(clienteId)
      })

      const avaliacaoMedia =
        avaliacoesDoGuia.length > 0
          ? avaliacoesDoGuia.reduce((total: number, avaliacao: Avaliacao) => total + Number(avaliacao.nota || 0), 0) /
            avaliacoesDoGuia.length
          : 0

      setStats({
        totalKm,
        totalRoteiros: roteirosExecutados.length,
        totalReservas: reservas.length,
        reservasConfirmadas: reservasComerciais.length,
        totalClientes: clientesUnicos.size,
        avaliacaoMedia,
        totalAvaliacoes: avaliacoesDoGuia.length
      })

      const metricasPublicas = await carregarMetricasPublicas(guiaId)

      if (metricasPublicas) {
        setStats(metricasPublicas)
      }
    } catch (error) {
      console.error('Erro inesperado ao carregar perfil público:', error)
      setErro('Erro inesperado ao carregar este perfil.')
    } finally {
      setCarregando(false)
    }
  }

  const progressoKm = useMemo(() => calcularProgressoKm(stats.totalKm), [stats.totalKm])
  const nivelAtual = useMemo(() => nivelPorKm(stats.totalKm), [stats.totalKm])
  const principaisRoteiros = useMemo(() => roteiros.filter(roteiroAtivo).slice(0, 3), [roteiros])

  const cadasturNumero = String(
    guia?.cadastur_numero ||
      guia?.cadastur ||
      ''
  ).trim()

  const cadasturStatus = normalizar(guia?.cadastur_status)

  const cadasturInformado = Boolean(cadasturNumero)

  const cadasturVerificado = Boolean(
    guia?.cadastur_verificado ||
      guia?.guia_verificado_cadastur ||
      cadasturStatus === 'verificado' ||
      cadasturStatus === 'ativo'
  )

  const cadasturValidade = String(
    guia?.cadastur_validade ||
      guia?.cadastur_data_validade ||
      guia?.cadastur_validade_ate ||
      guia?.cadastur_vencimento ||
      ''
  ).trim()

  const cadasturAtivo = Boolean(cadasturVerificado && dataValidaFutura(cadasturValidade))

  const cadasturAtivoDesde = String(
    guia?.cadastur_ativo_desde ||
      guia?.cadastur_verificado_em ||
      guia?.cadastur_data_verificacao ||
      guia?.cadastur_informado_em ||
      guia?.created_at ||
      ''
  ).trim()

  const anosCadasturAtivo = cadasturAtivo ? anosDesde(cadasturAtivoDesde) : 0

  const cadasturLabelPublico = (() => {
    if (cadasturAtivo) {
      return cadasturValidade
        ? `CADASTUR ativo até ${formatarData(cadasturValidade)}`
        : 'CADASTUR ativo'
    }

    if (cadasturVerificado) return 'Guia verificado CADASTUR'
    if (cadasturInformado) return 'CADASTUR informado'
    return 'CADASTUR não informado'
  })()

  const medalhasCadastur: MedalhaGuia[] = useMemo(
    () => [
      {
        codigo: 'cadastur_preenchido',
        nome: 'CADASTUR informado',
        descricao: 'Número CADASTUR informado pelo guia e aguardando conferência administrativa.',
        svg: `${CADASTUR_BASE}/01_cadastur_preenchido.svg`,
        desbloqueada: cadasturInformado,
        destaque: cadasturInformado && !cadasturVerificado,
        categoria: 'cadastur'
      },
      {
        codigo: 'guia_verificado_cadastur',
        nome: 'Guia verificado',
        descricao: 'CADASTUR conferido e validado pelo Admin PrussikTrails.',
        svg: `${CADASTUR_BASE}/02_guia_verificado.svg`,
        desbloqueada: cadasturVerificado,
        destaque: cadasturVerificado && !cadasturAtivo,
        categoria: 'cadastur'
      },
      {
        codigo: 'cadastur_ativo',
        nome: 'CADASTUR ativo',
        descricao: cadasturValidade
          ? `CADASTUR com validade registrada até ${formatarData(cadasturValidade)}.`
          : 'CADASTUR com validade vigente registrada pelo Admin.',
        svg: `${CADASTUR_BASE}/03_cadastur_ativo.svg`,
        desbloqueada: cadasturAtivo,
        destaque: cadasturAtivo,
        categoria: 'cadastur'
      },
      ...CADASTUR_TIERS.map((tier) => ({
        codigo: tier.codigo,
        nome: tier.nome,
        descricao: tier.descricao,
        svg: tier.svg,
        desbloqueada: cadasturAtivo && anosCadasturAtivo >= tier.anos,
        destaque: cadasturAtivo && anosCadasturAtivo >= tier.anos,
        categoria: 'cadastur' as const
      }))
    ],
    [cadasturInformado, cadasturVerificado, cadasturAtivo, cadasturValidade, anosCadasturAtivo]
  )

  const medalhas: MedalhaGuia[] = useMemo(
    () => [
      {
        codigo: 'guia_pioneiro_beta',
        nome: 'Guia Pioneiro Beta',
        descricao: 'Reconhecimento para guias que participaram da fase inicial da PrussikTrails.',
        svg: `${BETA_BASE}/04_guia_pioneiro_beta.svg`,
        fallbackSvg: `${BETA_FALLBACK_BASE}/04_guia_pioneiro_beta.svg`,
        desbloqueada: guiaPioneiroBeta(),
        destaque: true,
        categoria: 'beta'
      },
      {
        codigo: 'guia_em_jornada',
        nome: 'Guia em Jornada',
        descricao: 'Perfil público ativo na comunidade.',
        svg: `${PROGRESSAO_BASE}/01_mochila_de_partida.svg`,
        desbloqueada: true,
        categoria: 'progressao'
      },
      ...medalhasCadastur,
      {
        codigo: 'condutor_de_base',
        nome: 'Condutor de Base',
        descricao: 'Primeiros roteiros estruturados no app.',
        svg: `${PROGRESSAO_BASE}/02_barraca_base.svg`,
        desbloqueada: stats.totalRoteiros >= 1,
        categoria: 'atuacao'
      },
      {
        codigo: 'comunidade_aquecida',
        nome: 'Comunidade Aquecida',
        descricao: 'Reservas e experiências começam a formar histórico.',
        svg: `${PROGRESSAO_BASE}/03_fogueira_da_jornada.svg`,
        desbloqueada: stats.reservasConfirmadas >= 1,
        categoria: 'atuacao'
      },
      {
        codigo: 'lanterna_da_serra',
        nome: 'Lanterna da Serra',
        descricao: 'Presença ativa em orientação e condução.',
        svg: `${PROGRESSAO_BASE}/04_lanterna_da_serra.svg`,
        desbloqueada: stats.totalKm >= 96,
        categoria: 'progressao'
      },
      {
        codigo: 'rumo_certo',
        nome: 'Rumo Certo',
        descricao: 'Roteiros com leitura clara de jornada e segurança.',
        svg: `${PROGRESSAO_BASE}/05_rumo_certo.svg`,
        desbloqueada: stats.totalKm >= 192,
        categoria: 'progressao'
      },
      {
        codigo: 'prussik',
        nome: 'Técnica Prussik',
        descricao: 'Símbolo de preparo, cuidado e progressão.',
        svg: `${PROGRESSAO_BASE}/06_prussik.svg`,
        desbloqueada: stats.totalKm >= 384,
        categoria: 'progressao'
      },
      {
        codigo: 'cachoeira_viva',
        nome: 'Cachoeira Viva',
        descricao: 'Experiências que criam memória e retorno.',
        svg: `${PROGRESSAO_BASE}/07_cachoeira_viva.svg`,
        desbloqueada: stats.totalClientes >= 5,
        categoria: 'atuacao'
      },
      {
        codigo: 'amanhecer_no_cume',
        nome: 'Amanhecer no Cume',
        descricao: 'Boa reputação registrada pela comunidade.',
        svg: `${PROGRESSAO_BASE}/08_amanhecer_no_cume.svg`,
        desbloqueada: stats.avaliacaoMedia >= 4.5 && stats.totalAvaliacoes >= 3,
        categoria: 'atuacao'
      },
      {
        codigo: 'mapa_lendario',
        nome: 'Mapa Lendário',
        descricao: 'Histórico consolidado de condução e presença outdoor.',
        svg: `${PROGRESSAO_BASE}/10_mapa_lendario.svg`,
        desbloqueada: stats.totalKm >= 768,
        categoria: 'progressao'
      }
    ],
    [guia, stats, medalhasCadastur]
  )

  function enviarReporte() {
    setReportEnviado(true)
  }

  if (carregando) {
    return (
      <main className="loading">
        <style>{estilos}</style>
        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>Carregando perfil público...</div>
        </div>
      </main>
    )
  }

  if (erro || !guia) {
    return (
      <main className="emptyPage">
        <style>{estilos}</style>
        <div className="emptyCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <h1>Perfil não encontrado</h1>
          <p>{erro || 'Não foi possível localizar este guia.'}</p>
          <button type="button" onClick={() => router.push('/roteiros')}>
            Ver roteiros
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{estilos}</style>

      <header className="header">
        <div className="headerInner">
          <button
            className="brand brandLogoOnly"
            type="button"
            onClick={() => router.push('/roteiros')}
            aria-label="Voltar para roteiros"
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          </button>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroBg" />
          <div className="heroContent">
            <div className="avatarBox">
              {fotoGuia() ? <img src={fotoGuia()} alt={nomeGuia()} /> : <span>{primeiroNome(nomeGuia()).slice(0, 1)}</span>}
              {guiaPioneiroBeta() && <div className="betaSeal">Beta</div>}
            </div>

            <div className="heroTextBlock">
              <div className="eyebrow">Perfil público do guia</div>
              <h1>{nomeGuia()}</h1>
              <p>
                {bioGuia() ||
                  'Guia PrussikTrails em construção de jornada, experiências outdoor e comunidade de aventura.'}
              </p>

              <div className="heroBadges">
                {cadasturInformado && <span>{cadasturLabelPublico}</span>}
                <span>{stats.avaliacaoMedia > 0 ? `${stats.avaliacaoMedia.toFixed(1)} ★` : 'Sem avaliações ainda'}</span>
                <span>{nivelAtual}</span>
                <span>{seguidoresTotal} {seguidoresTotal === 1 ? 'seguidor' : 'seguidores'}</span>
              </div>

              {usuarioLogadoId !== guia.id && (
                <div className="followArea">
                  <button
                    type="button"
                    className={`followButton ${seguindoPerfil ? 'following' : ''}`}
                    onClick={alternarSeguir}
                    disabled={seguindoSalvando}
                  >
                    {seguindoSalvando ? 'Aguarde...' : seguindoPerfil ? 'Seguindo' : 'Seguir'}
                  </button>
                  {seguindoErro && <span className="followError">{seguindoErro}</span>}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="quickStats" aria-label="Resumo público do guia">
          <article className="quickStatsCard">
            <div className="quickStatItem">
              <strong>{stats.totalRoteiros}</strong>
              <span>roteiros realizados</span>
            </div>
            <div className="quickStatItem">
              <strong>{stats.totalKm.toFixed(0)}</strong>
              <span>km realizados</span>
            </div>
            <div className="quickStatItem">
              <strong>{stats.totalClientes}</strong>
              <span>clientes atendidos</span>
            </div>
            <div className="quickStatItem">
              <strong>{stats.totalAvaliacoes}</strong>
              <span>avaliações</span>
            </div>
          </article>
        </section>

        <section className="mainGrid">
          <div className="leftColumn">
            <section className="panel medalsPanel">
              <div className="panelHeader">
                <div>
                  <h2>Medalhas do guia</h2>
                  <p>Toque em uma medalha para ver detalhes da conquista.</p>
                </div>
              </div>

              <div className="medalGrid compactMedalGrid">
                {medalhas.map((medalha: MedalhaGuia) => (
                  <button
                    key={medalha.codigo}
                    type="button"
                    className={`medalTile ${medalha.categoria || ''} medalKey-${classeVisualMedalha(medalha.codigo || medalha.nome)} ${medalha.desbloqueada ? 'unlocked' : 'locked'} ${medalha.destaque ? 'featured' : ''}`}
                    onClick={() => setMedalhaSelecionada(medalha)}
                    aria-label={medalha.desbloqueada ? `Ver conquista ${medalha.nome}` : 'Ver conquista bloqueada'}
                  >
                    <span className="medalTileFrame">
                      <MedalhaImagem src={medalha.svg} fallback={medalha.fallbackSvg} alt={medalha.desbloqueada ? medalha.nome : 'Medalha bloqueada'} />
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel routesPanel publishedRoutesPanel">
              <div className="panelHeader">
                <div>
                  <h2>Roteiros publicados</h2>
                  <p>Roteiros do guia disponíveis para a comunidade.</p>
                </div>
              </div>

              {principaisRoteiros.length === 0 ? (
                <div className="emptyState">Este guia ainda não tem roteiros publicados.</div>
              ) : (
                <div className="routeGrid">
                  {principaisRoteiros.map((roteiro: Roteiro) => {
                    const foto = fotoRoteiro(roteiro)

                    return (
                      <article className="routeCard" key={roteiro.id} onClick={() => router.push(`/roteiros/${roteiro.id}`)}>
                        <div className="routeImage">
                          {foto ? <img src={foto} alt={tituloRoteiro(roteiro)} /> : <span>RT</span>}
                        </div>
                        <div>
                          <strong>{tituloRoteiro(roteiro)}</strong>
                          <p>{localRoteiro(roteiro)}</p>
                          <div className="routeMeta">
                            <span>{kmRoteiro(roteiro).toFixed(1)} km</span>
                            <span>{formatarMoeda(valorRoteiro(roteiro))}</span>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="rightColumn">
            <section className="panel trustPanel">
              <h2>Credenciais</h2>
              <div className="trustList">
                <div>
                  <span>CADASTUR</span>
                  <strong>{cadasturInformado ? cadasturNumero : 'Não informado'}</strong>
                </div>
                <div>
                  <span>Status CADASTUR</span>
                  <strong>{cadasturLabelPublico}</strong>
                </div>
                <div>
                  <span>Fase Beta</span>
                  <strong>{guiaPioneiroBeta() ? 'Guia pioneiro' : 'Guia cadastrado'}</strong>
                </div>
                <div>
                  <span>Comunidade</span>
                  <strong>{stats.totalClientes} cliente(s) atendido(s)</strong>
                </div>
              </div>
              <div className="progressBox">
                <div className="progressHeader">
                  <span>Progressão pública</span>
                  <strong>{progressoKm}%</strong>
                </div>
                <div className="progressTrack">
                  <div style={{ width: `${progressoKm}%` }} />
                </div>
              </div>

              <button type="button" className="reportInlineButton" onClick={() => setReportAberto(true)}>
                Reportar perfil
              </button>
            </section>

            <section className="panel reviewsPanel">
              <div className="panelHeader compact">
                <div>
                  <h2>Avaliações</h2>
                  <p>Toque em uma avaliação para ver o perfil público do cliente.</p>
                </div>
              </div>

              {avaliacoes.length === 0 ? (
                <div className="emptyState">Este guia ainda não recebeu avaliações públicas.</div>
              ) : (
                <div className="reviewList">
                  {avaliacoes.slice(0, 8).map((avaliacao: Avaliacao) => (
                    <article
                      key={avaliacao.id}
                      className={`reviewCard ${avaliacao.cliente_id ? 'clickable' : ''}`}
                      onClick={() => {
                        if (avaliacao.cliente_id) router.push(`/cliente/publico/${avaliacao.cliente_id}`)
                      }}
                    >
                      <div className="reviewTop">
                        <div className="reviewAvatar">
                          {avaliacao.cliente_avatar ? (
                            <img src={avaliacao.cliente_avatar} alt={avaliacao.cliente_nome || 'Cliente'} />
                          ) : (
                            <span>{String(avaliacao.cliente_nome || 'C').slice(0, 1)}</span>
                          )}
                        </div>
                        <div>
                          <strong>{avaliacao.cliente_nome || 'Cliente PrussikTrails'}</strong>
                          <span>{formatarData(avaliacao.created_at)}</span>
                        </div>
                      </div>
                      <div className="stars">{estrelas(avaliacao.nota)}</div>
                      <p>{avaliacao.comentario || avaliacao.observacao || avaliacao.descricao || 'Avaliação registrada.'}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </section>
      </div>

      {medalhaSelecionada && (
        <div
          className="medalOverlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setMedalhaSelecionada(null)}
        >
          <section className="medalDetailCard" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="medalDetailClose"
              onClick={() => setMedalhaSelecionada(null)}
              aria-label="Fechar detalhes da medalha"
            >
              ×
            </button>

            <div className={`medalDetailArt ${medalhaSelecionada.categoria || ''} medalKey-${classeVisualMedalha(medalhaSelecionada.codigo || medalhaSelecionada.nome)}`}>
              <MedalhaImagem
                src={medalhaSelecionada.svg}
                fallback={medalhaSelecionada.fallbackSvg}
                alt={medalhaSelecionada.desbloqueada ? medalhaSelecionada.nome : 'Medalha bloqueada'}
              />
            </div>

            <span className={medalhaSelecionada.desbloqueada ? 'medalStatus unlocked' : 'medalStatus locked'}>
              {medalhaSelecionada.desbloqueada ? 'Conquistada' : 'Bloqueada'}
            </span>

            <h3>{medalhaSelecionada.desbloqueada ? medalhaSelecionada.nome : 'Conquista bloqueada'}</h3>
            <p>
              {medalhaSelecionada.desbloqueada
                ? medalhaSelecionada.descricao
                : 'Continue acumulando experiências executadas para revelar esta conquista.'}
            </p>
          </section>
        </div>
      )}

      {reportAberto && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="reportModal">
            <div className="reportHeader">
              <div>
                <span>Segurança da comunidade</span>
                <h2>Reportar guia</h2>
                <p>Use este canal para sinalizar uma situação que precise de análise pela equipe.</p>
              </div>
              <button type="button" onClick={() => setReportAberto(false)} aria-label="Fechar">
                ×
              </button>
            </div>

            {reportEnviado ? (
              <div className="reportSuccess">
                <strong>Obrigado pelo cuidado.</strong>
                <p>Seu relato foi registrado nesta sessão para análise. Na próxima etapa, conectaremos este fluxo a uma tabela própria de denúncias.</p>
                <button type="button" onClick={() => setReportAberto(false)}>Fechar</button>
              </div>
            ) : (
              <>
                <label className="field">
                  <span>Motivo</span>
                  <select value={reportMotivo} onChange={(event) => setReportMotivo(event.target.value as ReportReason)}>
                    <option value="seguranca">Segurança</option>
                    <option value="conduta">Conduta</option>
                    <option value="informacao">Informação incorreta</option>
                    <option value="pagamento">Pagamento/serviço</option>
                    <option value="outro">Outro</option>
                  </select>
                </label>
                <label className="field">
                  <span>Observação</span>
                  <textarea
                    value={reportTexto}
                    onChange={(event) => setReportTexto(event.target.value)}
                    placeholder="Descreva brevemente o ocorrido."
                    rows={5}
                  />
                </label>
                <div className="modalActions">
                  <button type="button" className="secondary" onClick={() => setReportAberto(false)}>Cancelar</button>
                  <button type="button" className="primary" onClick={enviarReporte}>Enviar relato</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

const estilos = `
  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: #f6f7f1;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .page,
  .loading,
  .emptyPage {
    min-height: 100vh;
    min-height: 100dvh;
    background:
      radial-gradient(circle at 10% 0%, rgba(132,204,22,0.16), transparent 28%),
      radial-gradient(circle at 90% 10%, rgba(251,146,60,0.14), transparent 28%),
      linear-gradient(180deg,#fffdf7 0%,#f3f5ea 48%,#eef2e5 100%);
    color: #172018;
  }

  .loading,
  .emptyPage {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .loadingCard,
  .emptyCard {
    width: min(430px, 100%);
    background: rgba(255,255,255,0.92);
    border: 1px solid rgba(15,23,42,0.06);
    border-radius: 30px;
    padding: 28px;
    text-align: center;
    box-shadow: 0 20px 50px rgba(15,23,42,0.08);
  }

  .loadingCard img,
  .emptyCard img {
    height: 64px;
    width: auto;
    margin-bottom: 12px;
  }

  .emptyCard h1 {
    margin: 0;
    font-size: 24px;
    letter-spacing: -0.05em;
  }

  .emptyCard p {
    color: #64748b;
    font-size: 14px;
    line-height: 1.5;
    margin: 10px 0 18px;
    font-weight: 700;
  }

  .emptyCard button {
    border: 0;
    border-radius: 999px;
    background: #172018;
    color: #fff;
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
  }

  .header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(255,253,247,0.92);
    border-bottom: 1px solid rgba(15,23,42,0.06);
    backdrop-filter: blur(18px);
    padding: 8px 12px;
  }

  .headerInner {
    max-width: 1180px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .brand {
    border: 0;
    background: transparent;
    padding: 0;
    cursor: pointer;
    text-align: center;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .brandLogoOnly {
    max-width: min(260px, 62vw);
  }

  .brand img {
    width: clamp(150px, 36vw, 250px);
    max-width: 100%;
    max-height: 58px;
    height: auto;
    object-fit: contain;
    display: block;
  }

  .container {
    max-width: 1180px;
    margin: 0 auto;
    padding: 22px 16px 56px;
  }

  .hero {
    position: relative;
    overflow: hidden;
    border-radius: 36px;
    background:
      radial-gradient(circle at 14% 10%, rgba(190,242,100,0.26), transparent 28%),
      linear-gradient(135deg, #1d2e20 0%, #526e3f 54%, #d9c49a 100%);
    min-height: 318px;
    box-shadow: 0 24px 60px rgba(23,32,24,0.18);
  }

  .heroBg {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
    background-size: 46px 46px;
    opacity: 0.8;
    mask-image: linear-gradient(to bottom, black, transparent 82%);
  }

  .heroContent {
    position: relative;
    z-index: 2;
    min-height: 318px;
    padding: 30px;
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    align-items: end;
    gap: 24px;
    color: #fffdf7;
  }

  .avatarBox {
    position: relative;
    width: 160px;
    height: 160px;
    border-radius: 42px;
    overflow: visible;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.22);
    box-shadow: 0 18px 40px rgba(0,0,0,0.16);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(12px);
  }

  .avatarBox img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: inherit;
  }

  .avatarBox > span {
    font-size: 58px;
    font-family: Georgia, 'Times New Roman', serif;
    font-weight: 900;
    color: #f7fee7;
  }

  .betaSeal {
    position: absolute;
    right: -8px;
    bottom: -8px;
    background: #991b1b;
    border: 3px solid #fffdf7;
    color: #fff;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .eyebrow {
    display: inline-flex;
    width: fit-content;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.24);
    background: rgba(255,255,255,0.12);
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 14px;
  }

  .heroTextBlock h1 {
    margin: 0;
    max-width: 760px;
    font-size: clamp(38px, 6vw, 76px);
    line-height: 0.9;
    font-weight: 950;
    letter-spacing: -0.085em;
  }

  .heroTextBlock p {
    max-width: 720px;
    margin: 16px 0 0;
    color: rgba(255,255,255,0.84);
    font-size: 15px;
    line-height: 1.6;
    font-weight: 650;
  }

  .heroBadges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 16px;
  }

  .heroBadges span {
    border-radius: 999px;
    background: rgba(255,255,255,0.14);
    border: 1px solid rgba(255,255,255,0.18);
    padding: 8px 11px;
    font-size: 12px;
    font-weight: 900;
  }

  .quickStats {
    margin: 16px 0;
  }

  .quickStatsCard,
  .panel {
    background: rgba(255,255,255,0.88);
    border: 1px solid rgba(15,23,42,0.06);
    border-radius: 30px;
    box-shadow: 0 12px 34px rgba(15,23,42,0.06);
  }

  .quickStatsCard {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0;
    padding: 14px;
    overflow: hidden;
  }

  .quickStatItem {
    min-width: 0;
    padding: 12px 14px;
    text-align: center;
    border-right: 1px solid rgba(15,23,42,0.06);
  }

  .quickStatItem:last-child {
    border-right: 0;
  }

  .quickStats strong {
    display: block;
    color: #172018;
    font-size: 28px;
    font-weight: 950;
    letter-spacing: -0.06em;
    line-height: 1;
  }

  .quickStats span {
    display: block;
    margin-top: 5px;
    color: #64748b;
    font-size: 12px;
    font-weight: 850;
    line-height: 1.25;
  }

  .mainGrid {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(340px, 0.9fr);
    gap: 16px;
    align-items: start;
  }

  .leftColumn,
  .rightColumn {
    display: grid;
    gap: 16px;
  }

  .panel {
    overflow: hidden;
  }

  .panelHeader {
    padding: 20px 22px;
    border-bottom: 1px solid rgba(15,23,42,0.06);
  }

  .panelHeader.compact {
    padding-bottom: 12px;
  }

  .panel h2,
  .panelHeader h2 {
    margin: 0;
    color: #172018;
    font-size: 22px;
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

  .medalGrid {
    padding: 16px;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 12px;
  }

  .compactMedalGrid {
    padding-top: 14px;
  }

  .medalTile {
    aspect-ratio: 1 / 1;
    border: 1px solid rgba(15,23,42,0.06);
    border-radius: 24px;
    background:
      radial-gradient(circle at 50% 0%, rgba(251,146,60,0.10), transparent 52%),
      rgba(255,253,247,0.86);
    display: grid;
    place-items: center;
    padding: 12px;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }

  .medalTile:hover {
    transform: translateY(-2px);
    border-color: rgba(153,27,27,0.18);
    box-shadow: 0 14px 28px rgba(42,55,36,0.10);
  }

  .medalTile.unlocked {
    border-color: rgba(153,27,27,0.14);
    background:
      radial-gradient(circle at 50% 0%, rgba(251,146,60,0.16), transparent 54%),
      #fffdf7;
  }

  .medalTile.featured {
    border-color: rgba(153,27,27,0.22);
  }

  .medalTile.cadastur {
    border-color: rgba(37,99,235,0.16);
  }

  .medalTile.locked {
    background:
      repeating-linear-gradient(
        135deg,
        rgba(23,32,24,0.025) 0,
        rgba(23,32,24,0.025) 6px,
        transparent 6px,
        transparent 12px
      ),
      rgba(255,253,247,0.72);
  }

  .medalTileFrame {
    width: min(96px, 86%);
    height: min(96px, 86%);
    display: grid;
    place-items: center;
    background: transparent;
    overflow: visible;
  }

  .medalSvg {
    width: auto;
    height: auto;
    max-width: 86%;
    max-height: 86%;
    object-fit: contain;
    display: block;
    mix-blend-mode: multiply;
    filter: drop-shadow(0 8px 12px rgba(23,32,24,0.10));
  }

  .medalTile.beta .medalSvg {
    max-width: 82%;
    max-height: 82%;
    transform: translateY(-10%);
    transform-origin: center center;
  }

  .medalTile.cadastur .medalSvg {
    max-width: 72%;
    max-height: 84%;
    transform: translateY(-6%);
    transform-origin: center center;
  }

  /* Grupo superior CADASTUR: não subir agressivamente. */
  .medalTile.medalKey-cadastur-preenchido .medalSvg {
    max-width: 72%;
    max-height: 84%;
    transform: translateY(-6%);
  }

  .medalTile.medalKey-guia-verificado-cadastur .medalSvg {
    max-width: 72%;
    max-height: 84%;
    transform: translateY(-6%);
  }

  .medalTile.medalKey-cadastur-ativo .medalSvg {
    max-width: 68%;
    max-height: 80%;
    transform: translateY(-6%);
  }

  /* Tiers CADASTUR: SVGs verticais, então ficam menores e mais centralizados. */
  .medalTile.medalKey-cadastur-bronze .medalSvg {
    max-width: 56%;
    max-height: 70%;
    transform: translateY(-14%);
  }

  .medalTile.medalKey-cadastur-prata .medalSvg {
    max-width: 56%;
    max-height: 70%;
    transform: translateY(-14%);
  }

  .medalTile.medalKey-cadastur-ouro .medalSvg {
    max-width: 56%;
    max-height: 70%;
    transform: translateY(-14%);
  }

  .medalTile.medalKey-cadastur-platina .medalSvg {
    max-width: 56%;
    max-height: 70%;
    transform: translateY(-14%);
  }

  .medalTile.medalKey-cadastur-onyx .medalSvg {
    max-width: 56%;
    max-height: 70%;
    transform: translateY(-14%);
  }

  .medalTile.progressao .medalSvg,
  .medalTile.atuacao .medalSvg {
    max-width: 84%;
    max-height: 84%;
  }

  .medalTile.locked .medalSvg {
    filter: grayscale(1) brightness(1.12) opacity(0.76);
  }

  .medalFallback {
    font-size: 34px;
  }

  .medalOverlay {
    position: fixed;
    inset: 0;
    z-index: 105;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background: rgba(8,13,7,0.48);
    backdrop-filter: blur(10px);
  }

  .medalDetailCard {
    position: relative;
    width: min(360px, 100%);
    border-radius: 30px;
    border: 1px solid rgba(255,255,255,0.62);
    background:
      radial-gradient(circle at 50% 0%, rgba(251,146,60,0.14), transparent 45%),
      linear-gradient(180deg, #fffdf7 0%, #f3f5ea 100%);
    box-shadow: 0 32px 90px rgba(15,23,42,0.26);
    padding: 24px 22px 22px;
    text-align: center;
  }

  .medalDetailClose {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 34px;
    height: 34px;
    border-radius: 999px;
    border: 1px solid rgba(15,23,42,0.08);
    background: rgba(255,255,255,0.78);
    color: #172018;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
  }

  .medalDetailArt {
    width: 132px;
    height: 132px;
    margin: 2px auto 12px;
    display: grid;
    place-items: center;
    background: transparent;
    overflow: visible;
  }

  .medalDetailArt .medalSvg {
    max-width: 86%;
    max-height: 86%;
    filter: drop-shadow(0 12px 18px rgba(23,32,24,0.14));
  }

  .medalDetailArt.beta .medalSvg {
    max-width: 82%;
    max-height: 82%;
    transform: translateY(-10%);
  }

  .medalDetailArt.cadastur .medalSvg {
    max-width: 72%;
    max-height: 84%;
    transform: translateY(-6%);
    transform-origin: center center;
  }

  .medalDetailArt.medalKey-cadastur-preenchido .medalSvg {
    max-width: 72%;
    max-height: 84%;
    transform: translateY(-6%);
  }

  .medalDetailArt.medalKey-guia-verificado-cadastur .medalSvg {
    max-width: 72%;
    max-height: 84%;
    transform: translateY(-6%);
  }

  .medalDetailArt.medalKey-cadastur-ativo .medalSvg {
    max-width: 68%;
    max-height: 80%;
    transform: translateY(-6%);
  }

  .medalDetailArt.medalKey-cadastur-bronze .medalSvg,
  .medalDetailArt.medalKey-cadastur-prata .medalSvg,
  .medalDetailArt.medalKey-cadastur-ouro .medalSvg,
  .medalDetailArt.medalKey-cadastur-platina .medalSvg,
  .medalDetailArt.medalKey-cadastur-onyx .medalSvg {
    max-width: 56%;
    max-height: 70%;
    transform: translateY(-14%);
  }

  .medalStatus {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .medalStatus.unlocked {
    background: rgba(153,27,27,0.08);
    color: #991b1b;
    border: 1px solid rgba(153,27,27,0.14);
  }

  .medalStatus.locked {
    background: rgba(100,116,139,0.08);
    color: #64748b;
    border: 1px solid rgba(100,116,139,0.12);
  }

  .medalDetailCard h3 {
    margin: 12px 0 0;
    color: #172018;
    font-size: 22px;
    line-height: 1.05;
    letter-spacing: -0.045em;
    font-weight: 950;
  }

  .medalDetailCard p {
    margin: 10px auto 0;
    max-width: 290px;
    color: #64748b;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 750;
  }

  .routesPanel,
  .trustPanel,
  .reviewsPanel {
    padding-bottom: 16px;
  }

  .routeGrid {
    padding: 16px;
    display: grid;
    gap: 12px;
  }

  .routeCard {
    display: grid;
    grid-template-columns: 94px minmax(0, 1fr);
    gap: 13px;
    align-items: center;
    border-radius: 24px;
    background: #fffdf7;
    border: 1px solid rgba(15,23,42,0.06);
    padding: 12px;
    cursor: pointer;
    transition: 0.2s ease;
  }

  .routeCard:hover,
  .reviewCard.clickable:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 30px rgba(15,23,42,0.08);
  }

  .routeImage {
    width: 94px;
    height: 84px;
    border-radius: 22px;
    background: #e8eadf;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    color: #64748b;
    font-weight: 950;
  }

  .routeImage img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .routeCard strong {
    display: block;
    color: #172018;
    font-size: 14px;
    font-weight: 950;
    line-height: 1.25;
  }

  .routeCard p {
    margin: 5px 0 0;
    color: #64748b;
    font-size: 12px;
    font-weight: 750;
  }

  .routeMeta {
    margin-top: 8px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .routeMeta span {
    border-radius: 999px;
    background: #f0fdf4;
    color: #166534;
    padding: 6px 9px;
    font-size: 11px;
    font-weight: 950;
  }

  .trustPanel {
    padding: 20px;
  }

  .trustPanel h2 {
    margin-bottom: 14px;
  }

  .trustList {
    display: grid;
    gap: 10px;
  }

  .trustList div {
    border-radius: 20px;
    background: #fffdf7;
    border: 1px solid rgba(15,23,42,0.06);
    padding: 12px;
  }

  .trustList span,
  .progressHeader span {
    display: block;
    color: #64748b;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .trustList strong,
  .progressHeader strong {
    display: block;
    margin-top: 4px;
    color: #172018;
    font-size: 14px;
    font-weight: 950;
  }

  .progressBox {
    margin-top: 14px;
    border-radius: 20px;
    background: #fffdf7;
    border: 1px solid rgba(15,23,42,0.06);
    padding: 12px;
  }

  .progressHeader {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
  }

  .progressTrack {
    margin-top: 10px;
    height: 9px;
    border-radius: 999px;
    background: rgba(15,23,42,0.08);
    overflow: hidden;
  }

  .progressTrack div {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #365314, #84cc16, #f97316);
  }

  .reportInlineButton {
    width: 100%;
    margin-top: 12px;
    border-radius: 999px;
    border: 1px solid rgba(153,27,27,0.14);
    background: rgba(255,253,247,0.82);
    color: #991b1b;
    padding: 10px 12px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
  }

  .reviewList {
    padding: 16px;
    display: grid;
    gap: 12px;
  }

  .reviewCard {
    border-radius: 24px;
    background: #fffdf7;
    border: 1px solid rgba(15,23,42,0.06);
    padding: 13px;
    transition: 0.2s ease;
  }

  .reviewCard.clickable {
    cursor: pointer;
  }

  .reviewTop {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
  }

  .reviewAvatar {
    width: 44px;
    height: 44px;
    border-radius: 16px;
    overflow: hidden;
    background: #e8eadf;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #172018;
    font-weight: 950;
  }

  .reviewAvatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .reviewTop strong {
    display: block;
    color: #172018;
    font-size: 13px;
    font-weight: 950;
  }

  .reviewTop span {
    display: block;
    margin-top: 3px;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 800;
  }

  .stars {
    margin-top: 9px;
    color: #d97706;
    letter-spacing: 0.06em;
    font-size: 13px;
  }

  .reviewCard p {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.45;
    font-weight: 700;
  }

  .emptyState {
    margin: 16px;
    padding: 22px;
    text-align: center;
    color: #64748b;
    font-size: 13px;
    font-weight: 750;
    border-radius: 22px;
    background: #fffdf7;
    border: 1px dashed #cbd5e1;
  }

  .modalOverlay {
    position: fixed;
    inset: 0;
    z-index: 110;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background: rgba(8,13,7,0.58);
    backdrop-filter: blur(10px);
  }

  .reportModal {
    width: min(560px, 100%);
    border-radius: 30px;
    border: 1px solid rgba(255,255,255,0.56);
    background:
      radial-gradient(circle at 10% 0%, rgba(132,204,22,0.16), transparent 30%),
      linear-gradient(180deg, #fffdf7 0%, #f3f5ea 100%);
    box-shadow: 0 32px 90px rgba(0,0,0,0.34);
    padding: 20px;
  }

  .reportHeader {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 16px;
  }

  .reportHeader span {
    color: #991b1b;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .reportHeader h2 {
    margin: 5px 0 0;
    color: #172018;
    font-size: 28px;
    font-weight: 950;
    letter-spacing: -0.06em;
  }

  .reportHeader p {
    margin: 8px 0 0;
    color: #64748b;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 700;
  }

  .reportHeader button {
    width: 38px;
    height: 38px;
    border-radius: 999px;
    border: 1px solid rgba(15,23,42,0.08);
    background: rgba(255,255,255,0.78);
    color: #172018;
    font-size: 26px;
    line-height: 1;
    cursor: pointer;
  }

  .field {
    display: block;
    margin-top: 12px;
  }

  .field span {
    display: block;
    color: #25311f;
    font-size: 13px;
    font-weight: 900;
    margin-bottom: 7px;
  }

  .field select,
  .field textarea {
    width: 100%;
    border: 1px solid rgba(62,74,45,0.14);
    border-radius: 18px;
    background: rgba(255,255,255,0.78);
    color: #172018;
    padding: 13px 14px;
    font-size: 14px;
    outline: 0;
  }

  .field textarea {
    resize: vertical;
    min-height: 120px;
  }

  .modalActions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 16px;
  }

  .modalActions button,
  .reportSuccess button {
    border-radius: 999px;
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
  }

  .primary,
  .reportSuccess button {
    border: 0;
    background: #991b1b;
    color: #fffdf7;
  }

  .secondary {
    background: rgba(255,255,255,0.75);
    color: #27321f;
    border: 1px solid rgba(62,74,45,0.12);
  }

  .reportSuccess {
    border-radius: 22px;
    background: #fffdf7;
    border: 1px solid rgba(15,23,42,0.06);
    padding: 16px;
  }

  .reportSuccess strong {
    color: #172018;
    font-size: 18px;
    font-weight: 950;
  }

  .reportSuccess p {
    color: #64748b;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 700;
  }


  .followArea {
    margin-top: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .followButton {
    min-height: 42px;
    border: 0;
    border-radius: 999px;
    padding: 0 18px;
    background: #203c2e;
    color: #fffdf7;
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
    box-shadow: 0 14px 28px rgba(32, 60, 46, 0.18);
    transition: 0.18s ease;
  }

  .followButton:hover {
    transform: translateY(-1px);
    box-shadow: 0 18px 34px rgba(32, 60, 46, 0.22);
  }

  .followButton.following {
    background: rgba(255, 253, 247, 0.88);
    color: #203c2e;
    border: 1px solid rgba(32, 60, 46, 0.20);
    box-shadow: none;
  }

  .followButton:disabled {
    opacity: 0.62;
    cursor: not-allowed;
    transform: none;
  }

  .followError {
    max-width: 280px;
    color: #991b1b;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.35;
  }

  @media (max-width: 980px) {
    .mainGrid {
      grid-template-columns: 1fr;
    }

    .medalGrid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .header {
      padding: 7px 10px;
    }

    .brandLogoOnly {
      max-width: 70vw;
    }

    .brand img {
      width: clamp(142px, 52vw, 218px);
      max-height: 50px;
    }

    .container {
      padding: 14px 12px 42px;
    }

    .hero {
      border-radius: 28px;
      min-height: auto;
    }

    .heroContent {
      min-height: auto;
      padding: 18px;
      grid-template-columns: 88px minmax(0, 1fr);
      align-items: center;
      gap: 14px;
    }

    .avatarBox {
      width: 84px;
      height: 84px;
      border-radius: 24px;
    }

    .avatarBox > span {
      font-size: 34px;
    }

    .betaSeal {
      right: -4px;
      bottom: -5px;
      padding: 5px 8px;
      font-size: 9px;
      border-width: 2px;
    }

    .eyebrow {
      display: none;
    }

    .heroTextBlock h1 {
      font-size: clamp(26px, 8vw, 36px);
      letter-spacing: -0.075em;
      line-height: 0.95;
    }

    .heroTextBlock p {
      font-size: 12px;
      line-height: 1.42;
      margin-top: 8px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .heroBadges {
      margin-top: 10px;
      gap: 6px;
    }

    .heroBadges span {
      padding: 6px 8px;
      font-size: 10px;
    }

    .followArea {
      margin-top: 12px;
      gap: 7px;
    }

    .followButton {
      min-height: 38px;
      padding: 0 15px;
      font-size: 12px;
    }

    .quickStatsCard {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      padding: 10px;
      border-radius: 24px;
    }

    .quickStatItem {
      padding: 11px 8px;
      border-right: 0;
      border-bottom: 1px solid rgba(15,23,42,0.06);
    }

    .quickStatItem:nth-child(odd) {
      border-right: 1px solid rgba(15,23,42,0.06);
    }

    .quickStatItem:nth-child(n + 3) {
      border-bottom: 0;
    }

    .quickStats strong {
      font-size: 23px;
    }

    .quickStats span {
      font-size: 10.5px;
    }

    .publishedRoutesPanel {
      order: 2;
    }

    .panel {
      border-radius: 26px;
    }

    .panelHeader {
      padding: 16px;
    }

    .panel h2,
    .panelHeader h2 {
      font-size: 20px;
    }

    .panelHeader p {
      font-size: 12px;
    }

    .medalGrid {
      padding: 12px;
      gap: 9px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .medalTile {
      border-radius: 18px;
      padding: 8px;
    }

    .medalTileFrame {
      width: 82%;
      height: 82%;
    }

    .medalTile.cadastur .medalSvg {
      max-width: 56%;
      max-height: 70%;
      transform: translateY(-14%);
    }

    .medalTile.medalKey-cadastur-preenchido .medalSvg,
    .medalTile.medalKey-guia-verificado-cadastur .medalSvg {
      max-width: 72%;
      max-height: 84%;
      transform: translateY(-6%);
    }

    .medalTile.medalKey-cadastur-ativo .medalSvg {
      max-width: 68%;
      max-height: 80%;
      transform: translateY(-6%);
    }

    .medalOverlay {
      align-items: flex-end;
      padding: 10px;
    }

    .medalDetailCard {
      border-radius: 28px;
      width: 100%;
      max-height: calc(100dvh - 22px);
      overflow: auto;
    }

    .medalDetailArt {
      width: 118px;
      height: 118px;
    }

    .routeCard {
      grid-template-columns: 76px minmax(0, 1fr);
      border-radius: 22px;
    }

    .routeImage {
      width: 76px;
      height: 72px;
      border-radius: 18px;
    }

    .modalOverlay {
      align-items: flex-end;
      padding: 10px;
    }

    .reportModal {
      border-radius: 26px;
      max-height: 88vh;
      overflow: auto;
    }

    .modalActions {
      flex-direction: column-reverse;
    }

    .modalActions button {
      width: 100%;
    }
  }

`
