'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type UsuarioLocal = {
  id: string
  nome?: string | null
  email?: string | null
  tipo?: string | null
}

type UserRow = {
  id: string
  nome?: string | null
  email?: string | null
  tipo?: string | null
  taxa_plataforma_percentual?: number | null
  pix_tipo?: string | null
  pix_chave?: string | null
  cadastur?: string | null
  [key: string]: any
}

type RoteiroRow = {
  id: string
  titulo?: string | null
  nome?: string | null
  preco?: number | null
  valor?: number | null
  id_guia?: string | null
  guia_id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  status?: string | null
  created_at?: string | null
  [key: string]: any
}

type ReservaRow = {
  id: string
  roteiro_id?: string | null
  cliente_id?: string | null
  guia_id?: string | null
  id_guia?: string | null
  user_id?: string | null
  usuario_id?: string | null
  quantidade_pessoas?: number | null
  valor_total?: number | null
  status?: string | null
  pagamento_status?: string | null
  created_at?: string | null
  [key: string]: any
}

type RepasseRow = {
  id: string
  guia_id?: string | null
  id_guia?: string | null
  user_id?: string | null
  usuario_id?: string | null
  valor?: number | null
  valor_pago?: number | null
  valor_repassado?: number | null
  status?: string | null
  tipo?: string | null
  observacao?: string | null
  descricao?: string | null
  data_pagamento?: string | null
  created_at?: string | null
  updated_at?: string | null
  [key: string]: any
}

type SaqueGuiaRow = {
  id: string
  guia_id?: string | null
  valor_solicitado?: number | null
  valor_disponivel_no_momento?: number | null
  pix_tipo?: string | null
  pix_chave?: string | null
  titular_nome?: string | null
  status?: string | null
  observacao_guia?: string | null
  observacao_admin?: string | null
  respondido_por?: string | null
  respondido_em?: string | null
  comprovante_url?: string | null
  repasse_id?: string | null
  metadata?: any
  created_at?: string | null
  updated_at?: string | null
  [key: string]: any
}

type SaqueGuiaCompleto = SaqueGuiaRow & {
  guia_nome?: string
  guia_email?: string
  guia_pix_tipo?: string
  guia_pix_chave?: string
  saldo_atual_guia?: number
}

type FiltroSaque = 'pendentes' | 'aprovados' | 'pagos' | 'recusados' | 'todos'
type AcaoSaque = 'aprovar' | 'pagar' | 'recusar'

type GuiaFinanceiro = {
  guia_id: string
  nome: string
  email: string
  pix_tipo: string
  pix_chave: string
  cadastur: string
  taxa_percentual: number
  receita_bruta: number
  taxa_plataforma: number
  liquido_guia: number
  valor_pago: number
  saldo_pendente: number
  excesso_repasse: number
  reservas_confirmadas: number
  roteiros_total: number
  ultimo_pagamento_em?: string | null
  repasses: RepasseRow[]
  reservas: ReservaRow[]
}

type ResumoFinanceiro = {
  receita_bruta: number
  taxa_plataforma: number
  liquido_guias: number
  valor_pago: number
  saldo_pendente: number
  excesso_repasse: number
  reservas_confirmadas: number
  repasses_total: number
  guias_com_saldo: number
}

const resumoInicial: ResumoFinanceiro = {
  receita_bruta: 0,
  taxa_plataforma: 0,
  liquido_guias: 0,
  valor_pago: 0,
  saldo_pendente: 0,
  excesso_repasse: 0,
  reservas_confirmadas: 0,
  repasses_total: 0,
  guias_com_saldo: 0
}

export default function AdminFinanceiroPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)

  const [admin, setAdmin] = useState<UsuarioLocal | null>(null)
  const [guias, setGuias] = useState<GuiaFinanceiro[]>([])
  const [resumo, setResumo] = useState<ResumoFinanceiro>(resumoInicial)
  const [saques, setSaques] = useState<SaqueGuiaCompleto[]>([])
  const [filtroSaque, setFiltroSaque] = useState<FiltroSaque>('pendentes')

  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [busca, setBusca] = useState('')

  const [modalAberto, setModalAberto] = useState(false)
  const [guiaSelecionado, setGuiaSelecionado] = useState<GuiaFinanceiro | null>(null)
  const [valorPagamento, setValorPagamento] = useState('')
  const [observacao, setObservacao] = useState('Pix')
  const [registrando, setRegistrando] = useState(false)

  const [modalSaqueAberto, setModalSaqueAberto] = useState(false)
  const [saqueSelecionado, setSaqueSelecionado] = useState<SaqueGuiaCompleto | null>(null)
  const [acaoSaque, setAcaoSaque] = useState<AcaoSaque>('aprovar')
  const [observacaoSaque, setObservacaoSaque] = useState('')
  const [comprovanteSaqueUrl, setComprovanteSaqueUrl] = useState('')
  const [processandoSaque, setProcessandoSaque] = useState(false)

  useEffect(() => {
    if (iniciouRef.current) return
    iniciouRef.current = true
    iniciar()
  }, [])

  const iniciar = async () => {
    setCarregando(true)
    setErro('')
    setAviso('')
    setMensagem('')

    try {
      const userData = localStorage.getItem('user')

      if (!userData) {
        router.replace('/login')
        return
      }

      const parsed = JSON.parse(userData) as UsuarioLocal

      if (parsed.tipo !== 'admin') {
        router.replace('/login')
        return
      }

      setAdmin(parsed)
      await carregarFinanceiro()
    } catch (error) {
      console.error('Erro ao iniciar financeiro admin:', error)
      setErro('Não foi possível carregar o financeiro agora.')
    } finally {
      setCarregando(false)
    }
  }

  const limparTexto = (valor: any) => {
    return String(valor || '').trim()
  }

  const normalizar = (valor: any) => {
    return String(valor || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }

  const normalizarNumero = (valor: any, fallback = 0) => {
    if (typeof valor === 'number') {
      return Number.isFinite(valor) ? valor : fallback
    }

    let texto = String(valor || '')
      .trim()
      .replace(/\s/g, '')
      .replace(/R\$/gi, '')

    if (!texto) return fallback

    const temVirgula = texto.includes(',')
    const temPonto = texto.includes('.')

    if (temVirgula && temPonto) {
      texto = texto.replace(/\./g, '').replace(',', '.')
    } else if (temVirgula) {
      texto = texto.replace(',', '.')
    }

    texto = texto.replace(/[^\d.]/g, '')

    const numero = Number(texto)

    if (!Number.isFinite(numero)) return fallback

    return numero
  }

  const arredondarMoeda = (valor: any) => {
    return Math.round(Number(valor || 0) * 100) / 100
  }

  const emCentavos = (valor: any) => {
    return Math.round(Number(valor || 0) * 100)
  }

  const deCentavos = (valor: any) => {
    return Math.round(Number(valor || 0)) / 100
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

    return data.toLocaleString('pt-BR')
  }

  const formatarValorInput = (valor: any) => {
    return Number(valor || 0)
      .toFixed(2)
      .replace('.', ',')
  }

  const pagamentoConfirmado = (reserva: ReservaRow) => {
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

  const repasseCancelado = (repasse: RepasseRow) => {
    const status = normalizar(repasse.status)

    return (
      status === 'cancelado' ||
      status === 'cancelada' ||
      status === 'estornado' ||
      status === 'estornada'
    )
  }

  const statusSaqueNormalizado = (saque?: SaqueGuiaRow | null) => {
    return normalizar(saque?.status || 'novo')
  }

  const saquePendente = (saque?: SaqueGuiaRow | null) => {
    const status = statusSaqueNormalizado(saque)

    return (
      status === 'novo' ||
      status === 'pendente' ||
      status === 'solicitado' ||
      status === 'em_analise'
    )
  }

  const saqueAprovado = (saque?: SaqueGuiaRow | null) => {
    const status = statusSaqueNormalizado(saque)
    return status === 'aprovado' || status === 'aprovada'
  }

  const saquePago = (saque?: SaqueGuiaRow | null) => {
    const status = statusSaqueNormalizado(saque)
    return status === 'pago' || status === 'paga' || status === 'concluido' || status === 'concluida'
  }

  const saqueRecusado = (saque?: SaqueGuiaRow | null) => {
    const status = statusSaqueNormalizado(saque)
    return status === 'recusado' || status === 'recusada' || status === 'cancelado' || status === 'cancelada'
  }

  const valorDoSaque = (saque?: SaqueGuiaRow | null) => {
    return Number(saque?.valor_solicitado || 0)
  }

  const badgeSaque = (saque: SaqueGuiaRow) => {
    if (saquePago(saque)) return <span className="badge green">Pago</span>
    if (saqueAprovado(saque)) return <span className="badge blue">Aprovado</span>
    if (saqueRecusado(saque)) return <span className="badge red">Recusado</span>
    return <span className="badge yellow">Pendente</span>
  }

  const guiaIdDoRoteiro = (roteiro?: RoteiroRow | null) => {
    return limparTexto(
      roteiro?.id_guia ||
        roteiro?.guia_id ||
        roteiro?.user_id ||
        roteiro?.usuario_id ||
        ''
    )
  }

  const guiaIdDaReserva = (reserva: ReservaRow, roteiro?: RoteiroRow | null) => {
    return limparTexto(
      reserva.guia_id ||
        reserva.id_guia ||
        reserva.user_id ||
        reserva.usuario_id ||
        guiaIdDoRoteiro(roteiro)
    )
  }

  const guiaIdDoRepasse = (repasse: RepasseRow) => {
    return limparTexto(
      repasse.guia_id ||
        repasse.id_guia ||
        repasse.user_id ||
        repasse.usuario_id ||
        repasse.guiaId ||
        ''
    )
  }

  const valorDoRepasse = (repasse: RepasseRow) => {
    return Number(
      repasse.valor_pago ??
        repasse.valor_repassado ??
        repasse.valor ??
        repasse.valor_total ??
        0
    )
  }

  const valorDaReserva = (reserva: ReservaRow, roteiro?: RoteiroRow | null) => {
    const valorTotal = Number(reserva.valor_total || 0)

    if (valorTotal > 0) return valorTotal

    const preco = Number(roteiro?.preco || roteiro?.valor || 0)
    const pessoas = Math.max(1, Number(reserva.quantidade_pessoas || 1))

    return preco * pessoas
  }

  const nomeDoGuia = (guiaId: string, usuario?: UserRow | null) => {
    return (
      usuario?.nome ||
      usuario?.email ||
      `Guia ${guiaId.slice(0, 8)}`
    )
  }

  const carregarRepassesViaBackend = async () => {
    try {
      const response = await fetch(`/api/admin/financeiro/repasses?_ts=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        }
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        setAviso(
          data?.erro ||
            'A tabela de repasses não pôde ser lida diretamente. O registro de pagamento continuará usando a rota segura do backend.'
        )
        return [] as RepasseRow[]
      }

      const lista =
        data?.repasses ||
        data?.data ||
        data?.registros ||
        data?.items ||
        data

      return Array.isArray(lista) ? (lista as RepasseRow[]) : []
    } catch (error) {
      console.warn('Erro ao carregar repasses via backend:', error)
      setAviso(
        'A lista de repasses não pôde ser carregada agora. O registro de pagamento continuará usando a rota segura do backend.'
      )
      return [] as RepasseRow[]
    }
  }

  const carregarSaquesAdmin = async () => {
    try {
      const response = await fetch(`/api/admin/financeiro/saques?_ts=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        }
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        console.warn('Aviso ao carregar solicitações de saque:', data)
        return [] as SaqueGuiaCompleto[]
      }

      const lista = data?.saques || data?.data || data?.items || []
      return Array.isArray(lista) ? (lista as SaqueGuiaCompleto[]) : []
    } catch (error) {
      console.warn('Erro ao carregar solicitações de saque:', error)
      return [] as SaqueGuiaCompleto[]
    }
  }

  const carregarFinanceiro = async () => {
    setErro('')
    setAviso('')

    const [
      usuariosResult,
      roteirosResult,
      reservasResult,
      repassesBackend,
      saquesBackend
    ] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('roteiros').select('*'),
      supabase.from('reservas').select('*').order('created_at', { ascending: false }),
      carregarRepassesViaBackend(),
      carregarSaquesAdmin()
    ])

    if (usuariosResult.error) {
      throw usuariosResult.error
    }

    if (roteirosResult.error) {
      throw roteirosResult.error
    }

    if (reservasResult.error) {
      throw reservasResult.error
    }

    const usuarios = (usuariosResult.data || []) as UserRow[]
    const roteiros = (roteirosResult.data || []) as RoteiroRow[]
    const reservas = (reservasResult.data || []) as ReservaRow[]
    const repasses = (repassesBackend || []) as RepasseRow[]
    const saquesBase = (saquesBackend || []) as SaqueGuiaCompleto[]

    const usuariosPorId = new Map<string, UserRow>()
    usuarios.forEach((usuario) => {
      if (usuario?.id) usuariosPorId.set(usuario.id, usuario)
    })

    const saquesEnriquecidos = saquesBase.map((saque) => {
      const usuario = saque.guia_id ? usuariosPorId.get(String(saque.guia_id)) : null

      return {
        ...saque,
        guia_nome: saque.guia_nome || usuario?.nome || usuario?.email || `Guia ${String(saque.guia_id || '').slice(0, 8)}`,
        guia_email: saque.guia_email || usuario?.email || '',
        guia_pix_tipo: saque.guia_pix_tipo || usuario?.pix_tipo || '',
        guia_pix_chave: saque.guia_pix_chave || usuario?.pix_chave || ''
      }
    })

    setSaques(saquesEnriquecidos)

    const roteirosPorId = new Map<string, RoteiroRow>()
    roteiros.forEach((roteiro) => {
      if (roteiro?.id) roteirosPorId.set(roteiro.id, roteiro)
    })

    const guiasMap = new Map<string, GuiaFinanceiro>()

    const garantirGuia = (guiaId: string) => {
      const id = limparTexto(guiaId)

      if (!id) return null

      if (guiasMap.has(id)) {
        return guiasMap.get(id) as GuiaFinanceiro
      }

      const usuario = usuariosPorId.get(id)

      const novo: GuiaFinanceiro = {
        guia_id: id,
        nome: nomeDoGuia(id, usuario),
        email: usuario?.email || '',
        pix_tipo: usuario?.pix_tipo || '',
        pix_chave: usuario?.pix_chave || '',
        cadastur: usuario?.cadastur || '',
        taxa_percentual: Number(usuario?.taxa_plataforma_percentual || 5),
        receita_bruta: 0,
        taxa_plataforma: 0,
        liquido_guia: 0,
        valor_pago: 0,
        saldo_pendente: 0,
        excesso_repasse: 0,
        reservas_confirmadas: 0,
        roteiros_total: 0,
        ultimo_pagamento_em: null,
        repasses: [],
        reservas: []
      }

      guiasMap.set(id, novo)
      return novo
    }

    usuarios
      .filter((usuario) => normalizar(usuario.tipo) === 'guia')
      .forEach((usuario) => garantirGuia(usuario.id))

    roteiros.forEach((roteiro) => {
      const guiaId = guiaIdDoRoteiro(roteiro)
      const guia = garantirGuia(guiaId)

      if (guia) {
        guia.roteiros_total += 1
      }
    })

    reservas.forEach((reserva) => {
      const roteiro = reserva.roteiro_id ? roteirosPorId.get(reserva.roteiro_id) : null
      const guiaId = guiaIdDaReserva(reserva, roteiro)
      const guia = garantirGuia(guiaId)

      if (!guia) return

      if (!pagamentoConfirmado(reserva)) return

      const valor = valorDaReserva(reserva, roteiro)

      guia.receita_bruta += valor
      guia.reservas_confirmadas += 1
      guia.reservas.push(reserva)
    })

    repasses
      .filter((repasse) => !repasseCancelado(repasse))
      .forEach((repasse) => {
        const guiaId = guiaIdDoRepasse(repasse)
        const guia = garantirGuia(guiaId)

        if (!guia) return

        const valor = valorDoRepasse(repasse)

        guia.valor_pago += valor
        guia.repasses.push(repasse)

        const dataRepasse = repasse.data_pagamento || repasse.created_at || repasse.updated_at || null

        if (!guia.ultimo_pagamento_em || (dataRepasse && new Date(dataRepasse) > new Date(guia.ultimo_pagamento_em))) {
          guia.ultimo_pagamento_em = dataRepasse
        }
      })

    const listaGuias = Array.from(guiasMap.values()).map((guia) => {
      const receita = arredondarMoeda(guia.receita_bruta)
      const taxa = arredondarMoeda(receita * (guia.taxa_percentual / 100))
      const liquido = arredondarMoeda(Math.max(0, receita - taxa))
      const pago = arredondarMoeda(guia.valor_pago)

      const saldoCentavos = emCentavos(liquido) - emCentavos(pago)

      return {
        ...guia,
        receita_bruta: receita,
        taxa_plataforma: taxa,
        liquido_guia: liquido,
        valor_pago: pago,
        saldo_pendente: deCentavos(Math.max(0, saldoCentavos)),
        excesso_repasse: deCentavos(Math.max(0, Math.abs(Math.min(0, saldoCentavos))))
      }
    })

    listaGuias.sort((a, b) => {
      if (b.saldo_pendente !== a.saldo_pendente) {
        return b.saldo_pendente - a.saldo_pendente
      }

      return b.receita_bruta - a.receita_bruta
    })

    const resumoCalculado = listaGuias.reduce<ResumoFinanceiro>(
      (acc, guia) => {
        acc.receita_bruta += guia.receita_bruta
        acc.taxa_plataforma += guia.taxa_plataforma
        acc.liquido_guias += guia.liquido_guia
        acc.valor_pago += guia.valor_pago
        acc.saldo_pendente += guia.saldo_pendente
        acc.excesso_repasse += guia.excesso_repasse
        acc.reservas_confirmadas += guia.reservas_confirmadas
        acc.repasses_total += guia.repasses.length

        if (guia.saldo_pendente > 0) {
          acc.guias_com_saldo += 1
        }

        return acc
      },
      { ...resumoInicial }
    )

    setGuias(listaGuias)
    setResumo({
      receita_bruta: arredondarMoeda(resumoCalculado.receita_bruta),
      taxa_plataforma: arredondarMoeda(resumoCalculado.taxa_plataforma),
      liquido_guias: arredondarMoeda(resumoCalculado.liquido_guias),
      valor_pago: arredondarMoeda(resumoCalculado.valor_pago),
      saldo_pendente: arredondarMoeda(resumoCalculado.saldo_pendente),
      excesso_repasse: arredondarMoeda(resumoCalculado.excesso_repasse),
      reservas_confirmadas: resumoCalculado.reservas_confirmadas,
      repasses_total: resumoCalculado.repasses_total,
      guias_com_saldo: resumoCalculado.guias_com_saldo
    })
  }

  const atualizar = async () => {
    setAtualizando(true)
    setMensagem('')
    setErro('')

    try {
      await carregarFinanceiro()
      setMensagem('Financeiro atualizado.')
      setTimeout(() => setMensagem(''), 2600)
    } catch (error: any) {
      console.error('Erro ao atualizar financeiro:', error)
      setErro(error?.message || 'Não foi possível atualizar o financeiro.')
    } finally {
      setAtualizando(false)
    }
  }

  const abrirModalRepasse = (guia: GuiaFinanceiro) => {
    setErro('')
    setMensagem('')
    setGuiaSelecionado(guia)
    setValorPagamento(formatarValorInput(guia.saldo_pendente))
    setObservacao('Pix')
    setModalAberto(true)
  }

  const fecharModal = () => {
    if (registrando) return

    setModalAberto(false)
    setGuiaSelecionado(null)
    setValorPagamento('')
    setObservacao('Pix')
  }

  const valorInformado = normalizarNumero(valorPagamento, 0)
  const saldoDisponivel = Number(guiaSelecionado?.saldo_pendente || 0)
  const valorMaiorQueSaldo =
    guiaSelecionado && emCentavos(valorInformado) > emCentavos(saldoDisponivel)
  const valorInvalido = valorInformado <= 0 || !Number.isFinite(valorInformado)

  const registrarPagamento = async (event?: FormEvent) => {
    event?.preventDefault()

    if (!guiaSelecionado) {
      setErro('Guia não selecionado.')
      return
    }

    setErro('')
    setMensagem('')

    const valorNumero = arredondarMoeda(normalizarNumero(valorPagamento, 0))
    const saldo = arredondarMoeda(guiaSelecionado.saldo_pendente)

    if (valorNumero <= 0) {
      setErro('Informe um valor maior que zero.')
      return
    }

    if (emCentavos(saldo) <= 0) {
      setErro('Este guia não possui saldo pendente para repasse.')
      return
    }

    if (emCentavos(valorNumero) > emCentavos(saldo)) {
      setErro(
        `O valor informado é maior que o saldo disponível do guia. Valor máximo permitido: ${formatarMoeda(saldo)}.`
      )
      return
    }

    setRegistrando(true)

    try {
      const response = await fetch('/api/admin/financeiro/registrar-repasse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        body: JSON.stringify({
          guiaId: guiaSelecionado.guia_id,
          guia_id: guiaSelecionado.guia_id,
          id_guia: guiaSelecionado.guia_id,
          adminId: admin?.id || null,
          admin_id: admin?.id || null,
          criado_por: admin?.id || null,
          valorPago: valorNumero,
          valor_pago: valorNumero,
          valor: valorNumero,
          observacao: limparTexto(observacao) || 'Repasse ao guia'
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        setErro(data?.erro || data?.message || 'Não foi possível registrar o repasse.')
        return
      }

      setMensagem('Repasse registrado com sucesso.')
      setModalAberto(false)
      setGuiaSelecionado(null)
      setValorPagamento('')
      setObservacao('Pix')

      await carregarFinanceiro()
      setTimeout(() => setMensagem(''), 2800)
    } catch (error: any) {
      console.error('Erro ao registrar pagamento:', error)
      setErro(error?.message || 'Erro ao registrar pagamento.')
    } finally {
      setRegistrando(false)
    }
  }

  const abrirModalSaque = (saque: SaqueGuiaCompleto, acao: AcaoSaque) => {
    setErro('')
    setMensagem('')
    setSaqueSelecionado(saque)
    setAcaoSaque(acao)
    setObservacaoSaque(
      acao === 'aprovar'
        ? 'Saque aprovado para pagamento administrativo.'
        : acao === 'pagar'
          ? 'Pagamento do saque registrado pelo Admin.'
          : ''
    )
    setComprovanteSaqueUrl('')
    setModalSaqueAberto(true)
  }

  const fecharModalSaque = () => {
    if (processandoSaque) return

    setModalSaqueAberto(false)
    setSaqueSelecionado(null)
    setAcaoSaque('aprovar')
    setObservacaoSaque('')
    setComprovanteSaqueUrl('')
  }

  const atualizarStatusSaque = async (params: {
    saqueId: string
    status: string
    observacaoAdmin?: string
    comprovanteUrl?: string
    repasseId?: string | null
  }) => {
    const response = await fetch('/api/admin/financeiro/saques', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify({
        saqueId: params.saqueId,
        status: params.status,
        observacaoAdmin: params.observacaoAdmin || '',
        comprovanteUrl: params.comprovanteUrl || '',
        repasseId: params.repasseId || null,
        adminId: admin?.id || null
      })
    })

    const data = await response.json().catch(() => null)

    if (!response.ok || data?.sucesso === false) {
      throw new Error(data?.erro || data?.message || 'Não foi possível atualizar a solicitação de saque.')
    }

    return data
  }

  const processarSaque = async (event?: FormEvent) => {
    event?.preventDefault()

    if (!saqueSelecionado?.id) {
      setErro('Solicitação de saque não selecionada.')
      return
    }

    setErro('')
    setMensagem('')
    setProcessandoSaque(true)

    try {
      if (acaoSaque === 'recusar' && !limparTexto(observacaoSaque)) {
        setErro('Informe uma observação para recusar o saque.')
        return
      }

      if (acaoSaque === 'aprovar') {
        await atualizarStatusSaque({
          saqueId: saqueSelecionado.id,
          status: 'aprovado',
          observacaoAdmin: observacaoSaque || 'Saque aprovado pelo Admin.'
        })

        setMensagem('Solicitação de saque aprovada.')
      }

      if (acaoSaque === 'recusar') {
        await atualizarStatusSaque({
          saqueId: saqueSelecionado.id,
          status: 'recusado',
          observacaoAdmin: observacaoSaque
        })

        setMensagem('Solicitação de saque recusada.')
      }

      if (acaoSaque === 'pagar') {
        const guia = guias.find((item) => item.guia_id === saqueSelecionado.guia_id) || null
        const valorSolicitado = arredondarMoeda(valorDoSaque(saqueSelecionado))
        const saldoAtual = arredondarMoeda(guia?.saldo_pendente || 0)

        if (!guia) {
          setErro('Guia não localizado na lista financeira atual. Recarregue a página.')
          return
        }

        if (valorSolicitado <= 0) {
          setErro('Valor solicitado inválido.')
          return
        }

        if (emCentavos(valorSolicitado) > emCentavos(saldoAtual)) {
          setErro(`O valor solicitado (${formatarMoeda(valorSolicitado)}) é maior que o saldo líquido disponível do guia (${formatarMoeda(saldoAtual)}).`)
          return
        }

        const response = await fetch('/api/admin/financeiro/registrar-repasse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
          },
          body: JSON.stringify({
            guiaId: guia.guia_id,
            guia_id: guia.guia_id,
            id_guia: guia.guia_id,
            adminId: admin?.id || null,
            admin_id: admin?.id || null,
            criado_por: admin?.id || null,
            valorPago: valorSolicitado,
            valor_pago: valorSolicitado,
            valor: valorSolicitado,
            observacao: limparTexto(observacaoSaque) || `Saque solicitado pelo guia. PIX: ${saqueSelecionado.pix_tipo || ''} ${saqueSelecionado.pix_chave || ''}. Titular: ${saqueSelecionado.titular_nome || ''}.`
          })
        })

        const data = await response.json().catch(() => null)

        if (!response.ok || data?.sucesso === false) {
          throw new Error(data?.erro || data?.message || 'Não foi possível registrar o pagamento do saque.')
        }

        await atualizarStatusSaque({
          saqueId: saqueSelecionado.id,
          status: 'pago',
          observacaoAdmin: observacaoSaque || 'Pagamento de saque registrado pelo Admin.',
          comprovanteUrl: comprovanteSaqueUrl,
          repasseId: data?.repasse?.id || data?.data?.id || data?.registro?.id || null
        })

        setMensagem('Saque pago e repasse registrado no financeiro.')
      }

      setModalSaqueAberto(false)
      setSaqueSelecionado(null)
      setAcaoSaque('aprovar')
      setObservacaoSaque('')
      setComprovanteSaqueUrl('')

      await carregarFinanceiro()
      setTimeout(() => setMensagem(''), 3000)
    } catch (error: any) {
      console.error('Erro ao processar saque:', error)
      setErro(error?.message || 'Erro ao processar solicitação de saque.')
    } finally {
      setProcessandoSaque(false)
    }
  }

  const guiasFiltrados = useMemo(() => {
    const termo = normalizar(busca)

    if (!termo) return guias

    return guias.filter((guia) => {
      const texto = normalizar(
        [
          guia.nome,
          guia.email,
          guia.guia_id,
          guia.pix_chave,
          guia.cadastur
        ].join(' ')
      )

      return texto.includes(termo)
    })
  }, [guias, busca])

  const resumoSaques = useMemo(() => {
    return {
      total: saques.length,
      pendentes: saques.filter(saquePendente).length,
      aprovados: saques.filter(saqueAprovado).length,
      pagos: saques.filter(saquePago).length,
      recusados: saques.filter(saqueRecusado).length,
      valorPendente: saques.filter(saquePendente).reduce((total, saque) => total + valorDoSaque(saque), 0),
      valorPago: saques.filter(saquePago).reduce((total, saque) => total + valorDoSaque(saque), 0),
    }
  }, [saques])

  const saquesFiltrados = useMemo(() => {
    if (filtroSaque === 'todos') return saques
    if (filtroSaque === 'pendentes') return saques.filter(saquePendente)
    if (filtroSaque === 'aprovados') return saques.filter(saqueAprovado)
    if (filtroSaque === 'pagos') return saques.filter(saquePago)
    if (filtroSaque === 'recusados') return saques.filter(saqueRecusado)

    return saques
  }, [saques, filtroSaque])


  if (carregando) {    return (
      <main className="loading">
        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; background: #f8fafc; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
          .loading {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8fafc;
            color: #0f172a;
          }
          .loadingCard {
            background: #ffffff;
            border-radius: 28px;
            padding: 28px;
            text-align: center;
            box-shadow: 0 18px 50px rgba(15,23,42,0.08);
          }
          .loadingCard img {
            height: 64px;
            margin-bottom: 12px;
          }
        `}</style>

        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>Carregando financeiro...</div>
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
          background: #f8fafc;
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
          background:
            radial-gradient(circle at top left, rgba(34,197,94,0.08), transparent 28%),
            linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
          color: #0f172a;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(255,255,255,0.90);
          border-bottom: 1px solid rgba(15,23,42,0.08);
          backdrop-filter: blur(16px);
          padding: 12px 18px;
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
        }

        .brandTitle {
          font-size: 18px;
          font-weight: 950;
          color: #0f172a;
          letter-spacing: -0.05em;
          line-height: 1;
        }

        .brandSub {
          margin-top: 3px;
          font-size: 11px;
          color: #64748b;
          font-weight: 800;
        }

        .headerActions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .iconBtn {
          border: none;
          border-radius: 999px;
          padding: 10px 14px;
          background: #e2e8f0;
          color: #0f172a;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .iconBtn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(15,23,42,0.12);
        }

        .iconBtn.dark {
          background: #0f172a;
          color: #ffffff;
        }

        .iconBtn.green {
          background: #16a34a;
          color: #ffffff;
        }

        .iconBtn:disabled {
          opacity: 0.62;
          cursor: not-allowed;
        }

        .container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 22px 16px 56px;
        }

        .hero {
          border-radius: 34px;
          padding: 30px;
          background:
            radial-gradient(circle at top right, rgba(34,197,94,0.22), transparent 36%),
            linear-gradient(135deg, #0f172a 0%, #1e293b 58%, #334155 100%);
          color: #ffffff;
          box-shadow: 0 24px 70px rgba(15,23,42,0.22);
          margin-bottom: 16px;
          overflow: hidden;
        }

        .heroGrid {
          display: grid;
          grid-template-columns: minmax(0,1fr) 300px;
          gap: 22px;
          align-items: end;
        }

        .eyebrow {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          padding: 8px 12px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.16);
          color: #bbf7d0;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .heroTitle {
          margin: 0;
          max-width: 760px;
          font-size: clamp(42px, 6vw, 74px);
          line-height: 0.92;
          font-weight: 950;
          letter-spacing: -0.085em;
        }

        .heroTitle span {
          color: #86efac;
        }

        .heroText {
          max-width: 680px;
          margin: 14px 0 0;
          color: rgba(255,255,255,0.76);
          font-size: 14px;
          line-height: 1.6;
          font-weight: 650;
        }

        .heroCard {
          border-radius: 28px;
          padding: 18px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.16);
          backdrop-filter: blur(14px);
        }

        .heroCardLabel {
          color: rgba(255,255,255,0.68);
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }

        .heroCardValue {
          margin-top: 8px;
          color: #86efac;
          font-size: 32px;
          font-weight: 950;
          letter-spacing: -0.06em;
        }

        .heroCardText {
          margin-top: 8px;
          color: rgba(255,255,255,0.74);
          font-size: 12px;
          font-weight: 750;
          line-height: 1.45;
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
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .alert.error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .alert.warning {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0,1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .statCard {
          background: rgba(255,255,255,0.92);
          border: 1px solid rgba(15,23,42,0.07);
          border-radius: 26px;
          padding: 16px;
          box-shadow: 0 12px 34px rgba(15,23,42,0.06);
        }

        .statIcon {
          width: 40px;
          height: 40px;
          border-radius: 16px;
          background: #ecfdf5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          margin-bottom: 10px;
        }

        .statValue {
          color: #0f172a;
          font-size: 24px;
          font-weight: 950;
          letter-spacing: -0.06em;
          line-height: 1;
        }

        .statLabel {
          margin-top: 6px;
          color: #64748b;
          font-size: 11px;
          font-weight: 850;
          line-height: 1.35;
        }

        .toolbar {
          background: rgba(255,255,255,0.92);
          border: 1px solid rgba(15,23,42,0.07);
          border-radius: 28px;
          padding: 14px;
          box-shadow: 0 12px 34px rgba(15,23,42,0.06);
          display: grid;
          grid-template-columns: minmax(0,1fr) auto;
          gap: 10px;
          align-items: center;
          margin-bottom: 16px;
        }

        .input,
        .textarea {
          width: 100%;
          border: 1px solid rgba(15,23,42,0.10);
          background: #ffffff;
          color: #0f172a;
          border-radius: 18px;
          padding: 13px 14px;
          font-size: 14px;
          font-weight: 750;
          outline: none;
        }

        .input:focus,
        .textarea:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 4px rgba(22,163,74,0.12);
        }

        .textarea {
          min-height: 92px;
          resize: vertical;
          line-height: 1.5;
        }

        .panel {
          background: rgba(255,255,255,0.92);
          border: 1px solid rgba(15,23,42,0.07);
          border-radius: 30px;
          box-shadow: 0 12px 34px rgba(15,23,42,0.06);
          overflow: hidden;
        }

        .panelHeader {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(15,23,42,0.07);
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .panelTitle {
          margin: 0;
          color: #0f172a;
          font-size: 20px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .panelSub {
          margin-top: 3px;
          color: #64748b;
          font-size: 12px;
          font-weight: 750;
        }

        .panelBody {
          padding: 16px;
        }

        .guideList {
          display: grid;
          gap: 12px;
        }

        .guideCard {
          border: 1px solid rgba(15,23,42,0.08);
          background: #ffffff;
          border-radius: 24px;
          padding: 15px;
        }

        .guideTop {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .guideName {
          color: #0f172a;
          font-size: 16px;
          font-weight: 950;
          letter-spacing: -0.03em;
        }

        .guideMeta {
          margin-top: 4px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
        }

        .badge {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 950;
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

        .saqueTabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tabBtn {
          border: 1px solid rgba(15,23,42,0.10);
          background: #ffffff;
          color: #475569;
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 11px;
          font-weight: 950;
          cursor: pointer;
        }

        .tabBtn.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        .saqueList {
          display: grid;
          gap: 10px;
        }

        .saqueCard {
          border: 1px solid rgba(15,23,42,0.08);
          background: #ffffff;
          border-radius: 22px;
          padding: 14px;
          display: grid;
          gap: 12px;
        }

        .saqueTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .saqueTitle {
          color: #0f172a;
          font-size: 15px;
          font-weight: 950;
          letter-spacing: -0.03em;
        }

        .saqueMeta {
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
          margin-top: 4px;
        }

        .saqueValue {
          color: #16a34a;
          font-size: 22px;
          font-weight: 950;
          letter-spacing: -0.05em;
          text-align: right;
        }

        .saqueActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }


        .guideMetrics {
          display: grid;
          grid-template-columns: repeat(5, minmax(0,1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .metric {
          background: #f8fafc;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 18px;
          padding: 11px;
        }

        .metricLabel {
          color: #64748b;
          font-size: 10px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .metricValue {
          margin-top: 6px;
          color: #0f172a;
          font-size: 14px;
          font-weight: 950;
        }

        .guideActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 14px;
        }

        .smallBtn {
          border: none;
          border-radius: 999px;
          padding: 10px 13px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .smallBtn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(15,23,42,0.10);
        }

        .smallBtn.green {
          background: #16a34a;
          color: #ffffff;
        }

        .smallBtn.dark {
          background: #0f172a;
          color: #ffffff;
        }

        .smallBtn.light {
          background: #e2e8f0;
          color: #0f172a;
        }

        .smallBtn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .history {
          margin-top: 12px;
          border-top: 1px solid rgba(15,23,42,0.07);
          padding-top: 12px;
          display: grid;
          gap: 8px;
        }

        .historyItem {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: #475569;
          font-size: 12px;
          font-weight: 750;
          background: #f8fafc;
          border-radius: 14px;
          padding: 9px 10px;
        }

        .empty {
          border: 1px dashed rgba(15,23,42,0.16);
          border-radius: 24px;
          padding: 28px;
          text-align: center;
          color: #64748b;
          font-weight: 750;
          background: #ffffff;
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(15,23,42,0.56);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 18px;
        }

        .modal {
          width: 100%;
          max-width: 520px;
          background: #ffffff;
          border-radius: 30px;
          box-shadow: 0 28px 90px rgba(15,23,42,0.30);
          overflow: hidden;
        }

        .modalHeader {
          padding: 21px;
          border-bottom: 1px solid rgba(15,23,42,0.08);
        }

        .modalTitle {
          margin: 0;
          color: #0f172a;
          font-size: 21px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .modalSub {
          margin-top: 5px;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.45;
        }

        .modalBody {
          padding: 21px;
          display: grid;
          gap: 13px;
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

        .helperBox {
          border-radius: 20px;
          background: #f8fafc;
          border: 1px solid rgba(15,23,42,0.07);
          padding: 13px;
          color: #475569;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
        }

        .modalActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        @media (max-width: 1100px) {
          .heroGrid {
            grid-template-columns: 1fr;
          }

          .statsGrid {
            grid-template-columns: repeat(3, minmax(0,1fr));
          }

          .guideMetrics {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }
        }

        @media (max-width: 760px) {
          .header {
            padding: 10px 12px;
          }

          .brandTitle,
          .brandSub {
            display: none;
          }

          .container {
            padding: 16px 12px 44px;
          }

          .hero,
          .panel {
            border-radius: 26px;
          }

          .hero {
            padding: 22px;
          }

          .heroTitle {
            font-size: 40px;
          }

          .statsGrid,
          .guideMetrics,
          .toolbar {
            grid-template-columns: 1fr;
          }

          .headerActions {
            justify-content: flex-end;
          }
        }

        @media (max-width: 480px) {
          .guideTop {
            display: grid;
          }

          .guideActions,
          .modalActions {
            display: grid;
          }

          .smallBtn,
          .iconBtn {
            width: 100%;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <div className="brand" onClick={() => router.push('/admin/dashboard')}>
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />

            <div>
              <div className="brandTitle">PrussikTrails</div>
              <div className="brandSub">Financeiro administrativo</div>
            </div>
          </div>

          <div className="headerActions">
            <button
              type="button"
              className="iconBtn"
              onClick={() => router.push('/admin/dashboard')}
            >
              Dashboard
            </button>

            <button
              type="button"
              className="iconBtn green"
              onClick={atualizar}
              disabled={atualizando}
            >
              {atualizando ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroGrid">
            <div>
              <div className="eyebrow">Financeiro ADMIN</div>

              <h1 className="heroTitle">
                Receita, taxa, repasses e saldo em <span>visão única.</span>
              </h1>

              <p className="heroText">
                Controle valores confirmados, taxa da plataforma, repasses aos guias e saldo pendente.
                O sistema bloqueia repasses maiores que o saldo disponível para evitar pagamentos duplicados ou superiores ao devido.
              </p>
            </div>

            <aside className="heroCard">
              <div className="heroCardLabel">Saldo pendente geral</div>
              <div className="heroCardValue">{formatarMoeda(resumo.saldo_pendente)}</div>
              <div className="heroCardText">
                {resumo.guias_com_saldo} guia(s) com saldo pendente · {resumo.repasses_total} repasse(s) registrado(s).
              </div>
            </aside>
          </div>
        </section>

        {mensagem && <div className="alert success">{mensagem}</div>}
        {erro && <div className="alert error">{erro}</div>}
        {aviso && <div className="alert warning">{aviso}</div>}

        <section className="statsGrid">
          <article className="statCard">
            <div className="statIcon">💰</div>
            <div className="statValue">{formatarMoeda(resumo.receita_bruta)}</div>
            <div className="statLabel">receita bruta confirmada</div>
          </article>

          <article className="statCard">
            <div className="statIcon">🏷️</div>
            <div className="statValue">{formatarMoeda(resumo.taxa_plataforma)}</div>
            <div className="statLabel">taxa plataforma</div>
          </article>

          <article className="statCard">
            <div className="statIcon">🧭</div>
            <div className="statValue">{formatarMoeda(resumo.liquido_guias)}</div>
            <div className="statLabel">líquido dos guias</div>
          </article>

          <article className="statCard">
            <div className="statIcon">✅</div>
            <div className="statValue">{formatarMoeda(resumo.valor_pago)}</div>
            <div className="statLabel">já repassado</div>
          </article>

          <article className="statCard">
            <div className="statIcon">⏳</div>
            <div className="statValue">{formatarMoeda(resumo.saldo_pendente)}</div>
            <div className="statLabel">saldo pendente</div>
          </article>

          <article className="statCard">
            <div className="statIcon">🏦</div>
            <div className="statValue">{resumoSaques.pendentes}</div>
            <div className="statLabel">saque(s) pendente(s) · {formatarMoeda(resumoSaques.valorPendente)} solicitado(s)</div>
          </article>

          <article className="statCard">
            <div className="statIcon">⚠️</div>
            <div className="statValue">{formatarMoeda(resumo.excesso_repasse)}</div>
            <div className="statLabel">excesso de repasse</div>
          </article>
        </section>

        <section className="toolbar">
          <input
            className="input"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por guia, e-mail, PIX, CADASTUR ou ID..."
          />

          <div className="headerActions">
            {busca && (
              <button
                type="button"
                className="iconBtn"
                onClick={() => setBusca('')}
              >
                Limpar busca
              </button>
            )}

            <button
              type="button"
              className="iconBtn dark"
              onClick={() => router.push('/admin/dashboard')}
            >
              Voltar
            </button>
          </div>
        </section>

        <section className="panel" style={{ marginBottom: 16 }}>
          <div className="panelHeader">
            <div>
              <h2 className="panelTitle">Solicitações de saque dos guias</h2>
              <div className="panelSub">
                {resumoSaques.pendentes} pendente(s), {resumoSaques.aprovados} aprovado(s), {resumoSaques.pagos} pago(s).
              </div>
            </div>

            <div className="saqueTabs">
              <button type="button" className={`tabBtn ${filtroSaque === 'pendentes' ? 'active' : ''}`} onClick={() => setFiltroSaque('pendentes')}>Pendentes</button>
              <button type="button" className={`tabBtn ${filtroSaque === 'aprovados' ? 'active' : ''}`} onClick={() => setFiltroSaque('aprovados')}>Aprovados</button>
              <button type="button" className={`tabBtn ${filtroSaque === 'pagos' ? 'active' : ''}`} onClick={() => setFiltroSaque('pagos')}>Pagos</button>
              <button type="button" className={`tabBtn ${filtroSaque === 'recusados' ? 'active' : ''}`} onClick={() => setFiltroSaque('recusados')}>Recusados</button>
              <button type="button" className={`tabBtn ${filtroSaque === 'todos' ? 'active' : ''}`} onClick={() => setFiltroSaque('todos')}>Todos</button>
            </div>
          </div>

          <div className="panelBody">
            {saquesFiltrados.length === 0 ? (
              <div className="empty">
                Nenhuma solicitação de saque encontrada neste filtro.
              </div>
            ) : (
              <div className="saqueList">
                {saquesFiltrados.slice(0, 8).map((saque) => {
                  const guia = guias.find((item) => item.guia_id === saque.guia_id) || null
                  const saldoAtual = Number(guia?.saldo_pendente || saque.saldo_atual_guia || 0)
                  const valorSaque = valorDoSaque(saque)

                  return (
                    <article className="saqueCard" key={saque.id}>
                      <div className="saqueTop">
                        <div>
                          <div className="saqueTitle">{saque.guia_nome || guia?.nome || `Guia ${String(saque.guia_id || '').slice(0, 8)}`}</div>
                          <div className="saqueMeta">
                            {saque.guia_email || guia?.email || 'E-mail não informado'} · solicitado em {formatarData(saque.created_at)}
                            <br />
                            PIX informado: {saque.pix_tipo || '-'} · {saque.pix_chave || '-'}
                            <br />
                            Titular informado: {saque.titular_nome || '-'}
                            <br />
                            Saldo líquido atual do guia: {formatarMoeda(saldoAtual)}
                            {saque.observacao_guia && (
                              <>
                                <br />
                                Observação do guia: {saque.observacao_guia}
                              </>
                            )}
                            {saque.observacao_admin && (
                              <>
                                <br />
                                Observação Admin: {saque.observacao_admin}
                              </>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="saqueValue">{formatarMoeda(valorSaque)}</div>
                          {badgeSaque(saque)}
                        </div>
                      </div>

                      <div className="saqueActions">
                        {saquePendente(saque) && (
                          <button type="button" className="smallBtn green" onClick={() => abrirModalSaque(saque, 'aprovar')}>
                            Aprovar
                          </button>
                        )}

                        {(saquePendente(saque) || saqueAprovado(saque)) && (
                          <button
                            type="button"
                            className="smallBtn dark"
                            disabled={valorSaque <= 0 || valorSaque > saldoAtual}
                            onClick={() => abrirModalSaque(saque, 'pagar')}
                          >
                            Registrar pagamento
                          </button>
                        )}

                        {(saquePendente(saque) || saqueAprovado(saque)) && (
                          <button type="button" className="smallBtn light" onClick={() => abrirModalSaque(saque, 'recusar')}>
                            Recusar
                          </button>
                        )}

                        {valorSaque > saldoAtual && !saquePago(saque) && (
                          <span className="badge red">Valor acima do saldo atual</span>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2 className="panelTitle">Guias e valores a receber</h2>
              <div className="panelSub">
                {guiasFiltrados.length} guia(s) encontrado(s) no filtro atual.
              </div>
            </div>
          </div>

          <div className="panelBody">
            {guiasFiltrados.length === 0 ? (
              <div className="empty">
                Nenhum guia encontrado com os filtros atuais.
              </div>
            ) : (
              <div className="guideList">
                {guiasFiltrados.map((guia) => (
                  <article className="guideCard" key={guia.guia_id}>
                    <div className="guideTop">
                      <div>
                        <div className="guideName">{guia.nome}</div>
                        <div className="guideMeta">
                          {guia.email || 'E-mail não informado'} · {guia.reservas_confirmadas} reserva(s) confirmada(s)
                          <br />
                          ID: {guia.guia_id}
                          {guia.pix_chave && (
                            <>
                              <br />
                              PIX: {guia.pix_tipo ? `${guia.pix_tipo} · ` : ''}{guia.pix_chave}
                            </>
                          )}
                          {guia.cadastur && (
                            <>
                              <br />
                              CADASTUR: {guia.cadastur}
                            </>
                          )}
                        </div>
                      </div>

                      <div>
                        {guia.excesso_repasse > 0 ? (
                          <span className="badge red">Excesso de repasse</span>
                        ) : guia.saldo_pendente > 0 ? (
                          <span className="badge yellow">Saldo pendente</span>
                        ) : (
                          <span className="badge green">Sem saldo pendente</span>
                        )}
                      </div>
                    </div>

                    <div className="guideMetrics">
                      <div className="metric">
                        <div className="metricLabel">Receita bruta</div>
                        <div className="metricValue">{formatarMoeda(guia.receita_bruta)}</div>
                      </div>

                      <div className="metric">
                        <div className="metricLabel">Taxa {guia.taxa_percentual}%</div>
                        <div className="metricValue">{formatarMoeda(guia.taxa_plataforma)}</div>
                      </div>

                      <div className="metric">
                        <div className="metricLabel">Líquido guia</div>
                        <div className="metricValue">{formatarMoeda(guia.liquido_guia)}</div>
                      </div>

                      <div className="metric">
                        <div className="metricLabel">Já pago</div>
                        <div className="metricValue">{formatarMoeda(guia.valor_pago)}</div>
                      </div>

                      <div className="metric">
                        <div className="metricLabel">Saldo</div>
                        <div className="metricValue">{formatarMoeda(guia.saldo_pendente)}</div>
                      </div>
                    </div>

                    <div className="guideActions">
                      <button
                        type="button"
                        className="smallBtn green"
                        disabled={guia.saldo_pendente <= 0}
                        onClick={() => abrirModalRepasse(guia)}
                      >
                        Registrar pagamento
                      </button>

                      <button
                        type="button"
                        className="smallBtn light"
                        onClick={() => router.push(`/guias/${guia.guia_id}`)}
                      >
                        Ver perfil público
                      </button>

                      <button
                        type="button"
                        className="smallBtn dark"
                        onClick={() => {
                          setBusca(guia.guia_id)
                        }}
                      >
                        Filtrar histórico
                      </button>
                    </div>

                    {guia.repasses.length > 0 && (
                      <div className="history">
                        {guia.repasses.slice(0, 2).map((repasse) => (
                          <div className="historyItem" key={repasse.id}>
                            <span>
                              {repasse.descricao || repasse.observacao || 'Repasse registrado'}
                              <br />
                              {formatarData(repasse.data_pagamento || repasse.created_at)}
                            </span>
                            <strong>{formatarMoeda(valorDoRepasse(repasse))}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {modalSaqueAberto && saqueSelecionado && (
        <div className="modalOverlay">
          <form className="modal" onSubmit={processarSaque}>
            <div className="modalHeader">
              <h2 className="modalTitle">
                {acaoSaque === 'aprovar' && 'Aprovar solicitação de saque'}
                {acaoSaque === 'pagar' && 'Registrar pagamento do saque'}
                {acaoSaque === 'recusar' && 'Recusar solicitação de saque'}
              </h2>
              <div className="modalSub">
                Guia: {saqueSelecionado.guia_nome || `Guia ${String(saqueSelecionado.guia_id || '').slice(0, 8)}`} · valor solicitado: {formatarMoeda(valorDoSaque(saqueSelecionado))}
              </div>
            </div>

            <div className="modalBody">
              <div className="helperBox">
                <strong>PIX informado pelo guia</strong>
                <br />
                Tipo: {saqueSelecionado.pix_tipo || '-'}
                <br />
                Chave: {saqueSelecionado.pix_chave || '-'}
                <br />
                Titular: {saqueSelecionado.titular_nome || '-'}
                <br />
                O Admin deve conferir se a chave PIX está no nome do guia antes de registrar o pagamento.
              </div>

              {acaoSaque === 'pagar' && (
                <div className="field">
                  <label className="label">Comprovante ou referência do pagamento</label>
                  <input
                    className="input"
                    value={comprovanteSaqueUrl}
                    onChange={(event) => setComprovanteSaqueUrl(event.target.value)}
                    placeholder="Link, ID da transação, comprovante ou observação curta"
                  />
                </div>
              )}

              <div className="field">
                <label className="label">Observação administrativa</label>
                <textarea
                  className="textarea"
                  value={observacaoSaque}
                  onChange={(event) => setObservacaoSaque(event.target.value)}
                  placeholder={acaoSaque === 'recusar' ? 'Informe o motivo da recusa.' : 'Observação para histórico administrativo.'}
                />
              </div>

              <div className="modalActions">
                <button
                  type="submit"
                  className={acaoSaque === 'recusar' ? 'smallBtn light' : 'smallBtn dark'}
                  disabled={processandoSaque}
                >
                  {processandoSaque ? 'Processando...' : acaoSaque === 'aprovar' ? 'Confirmar aprovação' : acaoSaque === 'pagar' ? 'Confirmar pagamento' : 'Confirmar recusa'}
                </button>

                <button
                  type="button"
                  className="smallBtn light"
                  disabled={processandoSaque}
                  onClick={fecharModalSaque}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {modalAberto && guiaSelecionado && (
        <div className="modalOverlay">
          <form className="modal" onSubmit={registrarPagamento}>
            <div className="modalHeader">
              <h2 className="modalTitle">Registrar pagamento ao guia</h2>
              <div className="modalSub">
                Guia: {guiaSelecionado.nome} · saldo atual: {formatarMoeda(guiaSelecionado.saldo_pendente)}
              </div>
            </div>

            <div className="modalBody">
              <div className="field">
                <label className="label">Valor pago</label>
                <input
                  className="input"
                  value={valorPagamento}
                  onChange={(event) => {
                    setErro('')
                    setValorPagamento(event.target.value)
                  }}
                  onBlur={() => {
                    const valor = normalizarNumero(valorPagamento, 0)

                    if (valor <= 0) {
                      setValorPagamento('')
                      return
                    }

                    if (emCentavos(valor) > emCentavos(saldoDisponivel)) {
                      setValorPagamento(formatarValorInput(saldoDisponivel))
                      setErro(
                        `Valor ajustado ao saldo disponível: ${formatarMoeda(saldoDisponivel)}.`
                      )
                      return
                    }

                    setValorPagamento(formatarValorInput(valor))
                  }}
                  inputMode="decimal"
                  placeholder="0,00"
                />

                <div className="helperBox">
                  Valor máximo permitido para este guia: <strong>{formatarMoeda(saldoDisponivel)}</strong>.
                  {valorMaiorQueSaldo && (
                    <>
                      <br />
                      <strong style={{ color: '#991b1b' }}>
                        O valor informado ultrapassa o saldo disponível e não será enviado.
                      </strong>
                    </>
                  )}
                </div>
              </div>

              <div className="field">
                <label className="label">Observação</label>
                <textarea
                  className="textarea"
                  value={observacao}
                  onChange={(event) => setObservacao(event.target.value)}
                  placeholder="Ex.: Pix, TED, pagamento parcial, comprovante..."
                />
              </div>

              <div className="helperBox">
                Este pagamento reduzirá o saldo pendente do guia. Para evitar duplicidade,
                cada registro ficará no histórico de repasses. O backend também bloqueia
                qualquer valor maior que o saldo disponível.
              </div>

              <div className="modalActions">
                <button
                  type="submit"
                  className="smallBtn dark"
                  disabled={
                    registrando ||
                    valorInvalido ||
                    Boolean(valorMaiorQueSaldo) ||
                    saldoDisponivel <= 0
                  }
                >
                  {registrando ? 'Registrando...' : 'Confirmar pagamento'}
                </button>

                <button
                  type="button"
                  className="smallBtn light"
                  disabled={registrando}
                  onClick={fecharModal}
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