'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type UsuarioLocal = {
  id?: string | null
  nome?: string | null
  email?: string | null
  tipo?: string | null
  user_id?: string | null
  usuario_id?: string | null
  uid?: string | null
  email_admin?: string | null
}

type UsuarioBanco = {
  id: string
  nome?: string | null
  email?: string | null
  tipo?: string | null
}

type Roteiro = {
  id: string
  titulo?: string | null
  nome?: string | null
  preco?: number | null
  valor?: number | null
  id_guia?: string | null
  guia_id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  local?: string | null
  localizacao?: string | null
}

type Reserva = {
  id: string
  cliente_id?: string | null
  roteiro_id?: string | null
  guia_id?: string | null
  id_guia?: string | null
  quantidade_pessoas?: number | null
  valor_total?: number | null
  status?: string | null
  pagamento_status?: string | null
  order_id?: string | null
  transaction_id?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type RepasseGuia = {
  id: string
  guia_id?: string | null
  id_guia?: string | null
  valor?: number | null
  valor_pago?: number | null
  valor_repassado?: number | null
  status?: string | null
  observacao?: string | null
  descricao?: string | null
  data_pagamento?: string | null
  created_at?: string | null
  updated_at?: string | null
  [key: string]: any
}

type ReservaCompleta = Reserva & {
  roteiro?: Roteiro | null
  guia?: UsuarioBanco | null
  guia_id_original?: string | null
  guia_id_real?: string | null
  guia_nome?: string
  roteiro_titulo?: string
}

type GuiaFinanceiro = {
  guia_id: string
  guia_nome: string
  guia_email: string
  reservas: ReservaCompleta[]
  repasses: RepasseGuia[]
  receita_bruta: number
  taxa_plataforma: number
  taxa_paghiper: number
  valor_liquido_guia: number
  valor_pago: number
  saldo_pendente: number
  reservas_confirmadas: number
  ultima_reserva_em?: string | null
  ultimo_pagamento_em?: string | null
}

type Stats = {
  receitaBrutaTotal: number
  receitaBrutaMes: number
  taxaPlataformaTotal: number
  taxaPlataformaMes: number
  taxaPagHiperTotal: number
  taxaPagHiperMes: number
  repasseGuiasTotal: number
  repasseGuiasMes: number
  pagoGuiasTotal: number
  saldoGuiasTotal: number
  resultadoPlataformaTotal: number
  resultadoPlataformaMes: number
  reservasConfirmadas: number
  guiasComSaldo: number
}

type FiltroFinanceiro = 'todos' | 'com_saldo' | 'quitados' | 'sem_repasses'

const statsInicial: Stats = {
  receitaBrutaTotal: 0,
  receitaBrutaMes: 0,
  taxaPlataformaTotal: 0,
  taxaPlataformaMes: 0,
  taxaPagHiperTotal: 0,
  taxaPagHiperMes: 0,
  repasseGuiasTotal: 0,
  repasseGuiasMes: 0,
  pagoGuiasTotal: 0,
  saldoGuiasTotal: 0,
  resultadoPlataformaTotal: 0,
  resultadoPlataformaMes: 0,
  reservasConfirmadas: 0,
  guiasComSaldo: 0
}

export default function AdminFinanceiroPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [guiasFinanceiros, setGuiasFinanceiros] = useState<GuiaFinanceiro[]>([])
  const [stats, setStats] = useState<Stats>(statsInicial)

  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)
  const [repassesOk, setRepassesOk] = useState(true)

  const [busca, setBusca] = useState('')
  const [filtroFinanceiro, setFiltroFinanceiro] = useState<FiltroFinanceiro>('todos')

  const [guiaSelecionado, setGuiaSelecionado] = useState<GuiaFinanceiro | null>(null)
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false)
  const [valorPagamento, setValorPagamento] = useState('')
  const [observacaoPagamento, setObservacaoPagamento] = useState('')
  const [registrandoPagamento, setRegistrandoPagamento] = useState(false)

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
      await carregarFinanceiro()
    } catch (error) {
      console.error('Erro ao iniciar financeiro admin:', error)
      setErro('Não foi possível carregar o financeiro agora.')
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

  const normalizarNumero = (valor: string, fallback = 0) => {
    const limpo = String(valor || '')
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^\d.]/g, '')

    const numero = Number(limpo)

    if (!Number.isFinite(numero)) return fallback

    return numero
  }

  const uuidValido = (valor?: string | null) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
      String(valor || '')
    )
  }

  const nomeUsuario = (usuario?: UsuarioLocal | UsuarioBanco | null) => {
    return usuario?.nome || usuario?.email || ''
  }

  const tituloRoteiro = (roteiro?: Roteiro | null) => {
    return roteiro?.titulo || roteiro?.nome || 'Roteiro'
  }

  const guiaIdDoRoteiro = (roteiro?: Roteiro | null) => {
    return roteiro?.id_guia || roteiro?.guia_id || roteiro?.user_id || roteiro?.usuario_id || ''
  }

  const guiaIdDaReserva = (reserva?: Reserva | null) => {
    return reserva?.guia_id || reserva?.id_guia || ''
  }

  const guiaIdDoRepasse = (repasse?: RepasseGuia | null) => {
    return repasse?.guia_id || repasse?.id_guia || ''
  }

  const valorDoRepasse = (repasse?: RepasseGuia | null) => {
    return Number(repasse?.valor_pago || repasse?.valor_repassado || repasse?.valor || 0)
  }

  const dataDoRepasse = (repasse?: RepasseGuia | null) => {
    return repasse?.data_pagamento || repasse?.created_at || null
  }

  const repasseCancelado = (repasse?: RepasseGuia | null) => {
    const status = normalizar(repasse?.status)
    return status === 'cancelado' || status === 'cancelada' || status === 'estornado'
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

  const dentroDoMesAtual = (valor?: string | null) => {
    if (!valor) return false

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return false

    const agora = new Date()

    return data.getFullYear() === agora.getFullYear() && data.getMonth() === agora.getMonth()
  }

  const formatarData = (valor?: string | null) => {
    if (!valor) return '-'

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return valor

    return data.toLocaleDateString('pt-BR')
  }

  const formatarMoeda = (valor: any) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(valor || 0))
  }

  const localizarGuiaPorIdOuPrefixo = (guiaId: string, lista: UsuarioBanco[]) => {
    const id = String(guiaId || '').trim()

    if (!id) return null

    const exato = lista.find((guia) => guia.id === id)

    if (exato) return exato

    if (!uuidValido(id)) {
      return lista.find((guia) => guia.id?.startsWith(id)) || null
    }

    return null
  }

  const nomeGuiaComFallback = (guiaId: string, guia?: UsuarioBanco | null) => {
    const nome = nomeUsuario(guia)

    if (nome) return nome
    if (guiaId) return `Guia ${guiaId.slice(0, 8)}`

    return 'Guia não identificado'
  }

  const carregarRepassesPelaApi = async () => {
    try {
      const response = await fetch('/api/admin/financeiro/repasses', {
        method: 'GET',
        cache: 'no-store'
      })

      const json = await response.json().catch(() => null)

      if (!response.ok || json?.sucesso === false) {
        setRepassesOk(false)
        console.warn('Erro ao carregar repasses pela rota backend:', json)
        return [] as RepasseGuia[]
      }

      setRepassesOk(true)
      return (json?.repasses || []) as RepasseGuia[]
    } catch (error) {
      setRepassesOk(false)
      console.warn('Erro ao carregar repasses pela rota backend:', error)
      return [] as RepasseGuia[]
    }
  }

  const carregarFinanceiro = async () => {
    setErro('')

    const { data: reservasData, error: reservasError } = await supabase
      .from('reservas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2500)

    if (reservasError) {
      console.error('Erro ao carregar reservas:', reservasError)
      setErro('Não foi possível carregar reservas para o financeiro.')
      return
    }

    const reservasBase = ((reservasData || []) as Reserva[]).filter(pagamentoConfirmado)

    const roteiroIds = Array.from(
      new Set(
        reservasBase
          .map((reserva) => reserva.roteiro_id)
          .filter(Boolean) as string[]
      )
    )

    let roteiros: Roteiro[] = []
    let guias: UsuarioBanco[] = []

    if (roteiroIds.length > 0) {
      const { data: roteirosData, error: roteirosError } = await supabase
        .from('roteiros')
        .select('*')
        .in('id', roteiroIds)

      if (roteirosError) {
        console.warn('Erro ao buscar roteiros do financeiro:', roteirosError)
      }

      roteiros = (roteirosData || []) as Roteiro[]
    }

    const guiaIdsDosRoteiros = roteiros.map(guiaIdDoRoteiro).filter(Boolean)
    const guiaIdsDasReservas = reservasBase.map(guiaIdDaReserva).filter(Boolean)

    const guiaIdsBrutos = Array.from(
      new Set([...guiaIdsDosRoteiros, ...guiaIdsDasReservas])
    ) as string[]

    const guiaIdsUuid = guiaIdsBrutos.filter(uuidValido)
    const guiaIdsCurtos = guiaIdsBrutos.filter((id) => id && !uuidValido(id))

    if (guiaIdsUuid.length > 0) {
      const { data: guiasData, error: guiasError } = await supabase
        .from('users')
        .select('id, nome, email, tipo')
        .in('id', guiaIdsUuid)

      if (guiasError) {
        console.warn('Erro ao buscar guias por UUID:', guiasError)
      }

      guias = (guiasData || []) as UsuarioBanco[]
    }

    if (guiaIdsCurtos.length > 0) {
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('users')
        .select('id, nome, email, tipo')
        .limit(5000)

      if (usuariosError) {
        console.warn('Erro ao resolver guias por prefixo:', usuariosError)
      } else {
        const usuarios = (usuariosData || []) as UsuarioBanco[]

        const encontradosPorPrefixo = usuarios.filter((usuario) =>
          guiaIdsCurtos.some((prefixo) => usuario.id?.startsWith(prefixo))
        )

        const mapa = new Map<string, UsuarioBanco>()

        ;[...guias, ...encontradosPorPrefixo].forEach((guia) => {
          mapa.set(guia.id, guia)
        })

        guias = Array.from(mapa.values())
      }
    }

    const repasses = await carregarRepassesPelaApi()

    const reservasCompletas: ReservaCompleta[] = reservasBase.map((reserva) => {
      const roteiro = roteiros.find((item) => item.id === reserva.roteiro_id) || null
      const guiaIdOriginal = guiaIdDoRoteiro(roteiro) || guiaIdDaReserva(reserva)
      const guia = localizarGuiaPorIdOuPrefixo(guiaIdOriginal, guias)
      const guiaIdReal = guia?.id || guiaIdOriginal

      return {
        ...reserva,
        roteiro,
        guia,
        guia_id_original: guiaIdOriginal,
        guia_id_real: guiaIdReal,
        guia_nome: nomeGuiaComFallback(guiaIdReal, guia),
        roteiro_titulo: tituloRoteiro(roteiro)
      }
    })

    const reservasComGuia = reservasCompletas.filter((reserva) => reserva.guia_id_real)

    const guiasIdsFinanceiro = Array.from(
      new Set(
        reservasComGuia
          .map((reserva) => reserva.guia_id_real)
          .filter(Boolean) as string[]
      )
    )

    const guiasCalculados: GuiaFinanceiro[] = guiasIdsFinanceiro.map((guiaId) => {
      const guia = localizarGuiaPorIdOuPrefixo(guiaId, guias) || null
      const reservasDoGuia = reservasComGuia.filter((reserva) => reserva.guia_id_real === guiaId)

      const repassesDoGuia = repasses.filter((repasse) => {
        const idRepasse = guiaIdDoRepasse(repasse)

        return (
          !repasseCancelado(repasse) &&
          (
            idRepasse === guiaId ||
            Boolean(idRepasse && guiaId && idRepasse.startsWith(guiaId)) ||
            Boolean(idRepasse && guiaId && guiaId.startsWith(idRepasse))
          )
        )
      })

      const receitaBruta = reservasDoGuia.reduce(
        (total, reserva) => total + Number(reserva.valor_total || 0),
        0
      )

      const taxaPlataforma = receitaBruta * 0.05
      const taxaPagHiper = 0
      const valorLiquidoGuia = Math.max(0, receitaBruta - taxaPlataforma - taxaPagHiper)

      const valorPago = repassesDoGuia.reduce(
        (total, repasse) => total + valorDoRepasse(repasse),
        0
      )

      const saldoPendente = Math.max(0, valorLiquidoGuia - valorPago)

      const reservasOrdenadas = reservasDoGuia
        .slice()
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())

      const repassesOrdenados = repassesDoGuia
        .slice()
        .sort((a, b) => new Date(dataDoRepasse(b) || 0).getTime() - new Date(dataDoRepasse(a) || 0).getTime())

      return {
        guia_id: guia?.id || guiaId,
        guia_nome: nomeGuiaComFallback(guia?.id || guiaId, guia),
        guia_email: guia?.email || '',
        reservas: reservasDoGuia,
        repasses: repassesDoGuia,
        receita_bruta: receitaBruta,
        taxa_plataforma: taxaPlataforma,
        taxa_paghiper: taxaPagHiper,
        valor_liquido_guia: valorLiquidoGuia,
        valor_pago: valorPago,
        saldo_pendente: saldoPendente,
        reservas_confirmadas: reservasDoGuia.length,
        ultima_reserva_em: reservasOrdenadas[0]?.created_at || null,
        ultimo_pagamento_em: dataDoRepasse(repassesOrdenados[0])
      }
    })

    const receitaBrutaTotal = reservasComGuia.reduce(
      (total, reserva) => total + Number(reserva.valor_total || 0),
      0
    )

    const reservasDoMes = reservasComGuia.filter((reserva) => dentroDoMesAtual(reserva.created_at))

    const receitaBrutaMes = reservasDoMes.reduce(
      (total, reserva) => total + Number(reserva.valor_total || 0),
      0
    )

    const taxaPlataformaTotal = receitaBrutaTotal * 0.05
    const taxaPlataformaMes = receitaBrutaMes * 0.05

    const taxaPagHiperTotal = 0
    const taxaPagHiperMes = 0

    const repasseGuiasTotal = Math.max(0, receitaBrutaTotal - taxaPlataformaTotal - taxaPagHiperTotal)
    const repasseGuiasMes = Math.max(0, receitaBrutaMes - taxaPlataformaMes - taxaPagHiperMes)

    const pagoGuiasTotal = guiasCalculados.reduce(
      (total, guia) => total + guia.valor_pago,
      0
    )

    const saldoGuiasTotal = guiasCalculados.reduce(
      (total, guia) => total + guia.saldo_pendente,
      0
    )

    setGuiasFinanceiros(guiasCalculados)

    setStats({
      receitaBrutaTotal,
      receitaBrutaMes,
      taxaPlataformaTotal,
      taxaPlataformaMes,
      taxaPagHiperTotal,
      taxaPagHiperMes,
      repasseGuiasTotal,
      repasseGuiasMes,
      pagoGuiasTotal,
      saldoGuiasTotal,
      resultadoPlataformaTotal: taxaPlataformaTotal - taxaPagHiperTotal,
      resultadoPlataformaMes: taxaPlataformaMes - taxaPagHiperMes,
      reservasConfirmadas: reservasComGuia.length,
      guiasComSaldo: guiasCalculados.filter((guia) => guia.saldo_pendente > 0).length
    })

    setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
  }

  const atualizar = async () => {
    setAtualizando(true)
    setMensagem('')
    setErro('')

    try {
      await carregarFinanceiro()
      setMensagem('Financeiro atualizado.')
    } catch (error) {
      console.error('Erro ao atualizar financeiro:', error)
      setErro('Não foi possível atualizar o financeiro agora.')
    } finally {
      setAtualizando(false)
    }
  }

  const abrirPagamento = (guia: GuiaFinanceiro, valorPadrao?: number) => {
    setGuiaSelecionado(guia)
    setValorPagamento(valorPadrao ? String(valorPadrao.toFixed(2)).replace('.', ',') : '')
    setObservacaoPagamento('')
    setModalPagamentoAberto(true)
    setErro('')
    setMensagem('')
  }

  const registrarPagamento = async (event: FormEvent) => {
    event.preventDefault()

    if (!user?.id && !user?.email) {
      router.replace('/login')
      return
    }

    if (!guiaSelecionado?.guia_id) {
      setErro('Selecione um guia para registrar o pagamento.')
      return
    }

    const valor = normalizarNumero(valorPagamento, 0)

    if (valor <= 0) {
      setErro('Informe um valor de pagamento maior que zero.')
      return
    }

    if (valor > guiaSelecionado.saldo_pendente + 0.01) {
      setErro('O valor informado é maior que o saldo pendente do guia.')
      return
    }

    setRegistrandoPagamento(true)
    setErro('')
    setMensagem('')

    try {
      const response = await fetch('/api/admin/financeiro/registrar-repasse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          adminId: user.id || user.user_id || user.usuario_id || user.uid || '',
          adminEmail: user.email || user.email_admin || '',
          adminTipo: user.tipo || '',

          guiaId: guiaSelecionado.guia_id,
          guiaNome: guiaSelecionado.guia_nome,

          valor,
          observacao: observacaoPagamento || '',

          reservaIds: guiaSelecionado.reservas
            .map((reserva) => reserva.id)
            .filter(Boolean),

          roteiroIds: guiaSelecionado.reservas
            .map((reserva) => reserva.roteiro_id)
            .filter(Boolean)
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        setErro(data?.erro || data?.message || 'Não foi possível registrar o pagamento.')
        return
      }

      setMensagem('Pagamento registrado com sucesso.')
      setModalPagamentoAberto(false)
      setGuiaSelecionado(null)
      setValorPagamento('')
      setObservacaoPagamento('')

      await carregarFinanceiro()
    } catch (error: any) {
      console.error('Erro ao registrar pagamento:', error)
      setErro(error?.message || 'Erro ao registrar pagamento.')
    } finally {
      setRegistrandoPagamento(false)
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

  const guiasFiltrados = useMemo(() => {
    const termo = normalizar(busca)

    return guiasFinanceiros.filter((guia) => {
      const passaFiltro =
        filtroFinanceiro === 'todos' ||
        (filtroFinanceiro === 'com_saldo' && guia.saldo_pendente > 0) ||
        (filtroFinanceiro === 'quitados' && guia.saldo_pendente <= 0 && guia.valor_liquido_guia > 0) ||
        (filtroFinanceiro === 'sem_repasses' && guia.valor_pago <= 0)

      if (!passaFiltro) return false

      if (!termo) return true

      const texto = normalizar(
        [
          guia.guia_id,
          guia.guia_nome,
          guia.guia_email,
          guia.reservas.map((reserva) => reserva.roteiro_titulo).join(' ')
        ].join(' ')
      )

      return texto.includes(termo)
    })
  }, [guiasFinanceiros, busca, filtroFinanceiro])

  if (carregando || !user) {
    return (
      <main className="loading">
        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f172a; }
          .loading { min-height: 100vh; min-height: 100dvh; display: flex; align-items: center; justify-content: center; color: #e5e7eb; background: radial-gradient(circle at top left, rgba(34,197,94,0.16), transparent 30%), linear-gradient(135deg, #020617, #0f172a); }
          .loadingCard { background: rgba(15, 23, 42, 0.92); border: 1px solid rgba(148, 163, 184, 0.18); border-radius: 26px; padding: 28px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.35); }
          .loadingCard img { height: 58px; width: auto; margin-bottom: 12px; }
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
        body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; }
        .page { min-height: 100vh; min-height: 100dvh; background: radial-gradient(circle at 0% 0%, rgba(34, 197, 94, 0.10), transparent 30%), radial-gradient(circle at 100% 0%, rgba(59, 130, 246, 0.10), transparent 30%), linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%); color: #0f172a; }
        .header { position: sticky; top: 0; z-index: 50; background: rgba(248, 250, 252, 0.88); border-bottom: 1px solid rgba(15, 23, 42, 0.08); backdrop-filter: blur(18px); padding: 12px 18px; }
        .headerInner { max-width: 1240px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .brand { display: flex; align-items: center; gap: 10px; cursor: pointer; min-width: 0; }
        .brand img { height: 40px; width: auto; display: block; }
        .brandTitle { font-size: 17px; font-weight: 950; color: #0f172a; letter-spacing: -0.045em; line-height: 1; }
        .brandSub { color: #64748b; font-size: 11px; font-weight: 800; margin-top: 3px; }
        .settingsWrap { position: relative; display: flex; align-items: center; justify-content: flex-end; }
        .gearBtn { width: 42px; height: 42px; border: 1px solid rgba(15, 23, 42, 0.10); background: rgba(255, 255, 255, 0.86); color: #0f172a; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; font-size: 18px; cursor: pointer; transition: 0.2s ease; }
        .settingsMenu { position: absolute; top: 50px; right: 0; width: 220px; background: #ffffff; border: 1px solid rgba(15, 23, 42, 0.10); border-radius: 22px; box-shadow: 0 22px 60px rgba(15, 23, 42, 0.16); padding: 8px; z-index: 80; }
        .menuButton { width: 100%; border: none; background: transparent; color: #0f172a; padding: 12px 13px; border-radius: 16px; text-align: left; font-size: 13px; font-weight: 900; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .menuButton:hover { background: #f8fafc; }
        .menuButton.danger { color: #991b1b; }
        .container { max-width: 1240px; margin: 0 auto; padding: 24px 18px 52px; }
        .hero { background: radial-gradient(circle at top right, rgba(34, 197, 94, 0.18), transparent 30%), linear-gradient(135deg, #0f172a, #1e293b); color: #ffffff; border-radius: 34px; padding: 28px; box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22); margin-bottom: 18px; overflow: hidden; position: relative; }
        .heroInner { position: relative; z-index: 2; display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 22px; align-items: end; }
        .eyebrow { display: inline-flex; width: fit-content; border-radius: 999px; padding: 8px 12px; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.08); color: #bbf7d0; font-size: 11px; font-weight: 950; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 14px; }
        .heroTitle { margin: 0; font-size: clamp(38px, 5.5vw, 66px); line-height: 0.94; font-weight: 950; letter-spacing: -0.08em; }
        .heroTitle span { color: #86efac; }
        .heroText { max-width: 720px; color: rgba(255,255,255,0.76); font-size: 14px; line-height: 1.6; font-weight: 650; margin: 16px 0 0; }
        .heroCard { border-radius: 28px; background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.16); padding: 20px; backdrop-filter: blur(14px); }
        .heroLabel { color: rgba(255,255,255,0.66); font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: 0.10em; }
        .heroValue { margin-top: 8px; color: #ffffff; font-size: 38px; line-height: 1; font-weight: 950; letter-spacing: -0.07em; }
        .heroSmall { color: rgba(255,255,255,0.72); font-size: 12px; font-weight: 750; line-height: 1.45; margin-top: 8px; }
        .alert { border-radius: 18px; padding: 13px 15px; margin-bottom: 16px; font-size: 13px; font-weight: 800; }
        .alert.success { background: #ecfdf5; border: 1px solid #bbf7d0; color: #166534; }
        .alert.error { background: #fee2e2; border: 1px solid #fecaca; color: #991b1b; }
        .alert.warning { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
        .statsGrid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
        .statCard { background: rgba(255,255,255,0.88); border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 24px; padding: 15px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06); cursor: pointer; transition: 0.2s ease; }
        .statCard:hover { transform: translateY(-2px); box-shadow: 0 16px 34px rgba(15, 23, 42, 0.10); }
        .statIcon { width: 38px; height: 38px; border-radius: 16px; background: #ecfdf5; display: flex; align-items: center; justify-content: center; font-size: 19px; margin-bottom: 11px; }
        .statValue { font-size: 25px; font-weight: 950; line-height: 1; letter-spacing: -0.06em; color: #0f172a; }
        .statLabel { color: #64748b; font-size: 12px; font-weight: 850; line-height: 1.35; margin-top: 7px; }
        .toolbar { background: rgba(255,255,255,0.92); border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 26px; padding: 14px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06); display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; margin-bottom: 18px; }
        .input { width: 100%; border: 1px solid rgba(15, 23, 42, 0.10); background: #ffffff; color: #0f172a; border-radius: 999px; padding: 12px 14px; font-size: 13px; font-weight: 800; outline: none; }
        .filters { display: flex; gap: 8px; flex-wrap: wrap; }
        .filterBtn { border: 1px solid rgba(15, 23, 42, 0.10); background: #ffffff; color: #475569; border-radius: 999px; padding: 10px 13px; font-size: 12px; font-weight: 950; cursor: pointer; white-space: nowrap; }
        .filterBtn.active { background: #0f172a; color: #ffffff; border-color: #0f172a; }
        .panel { background: rgba(255,255,255,0.92); border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 28px; box-shadow: 0 12px 34px rgba(15, 23, 42, 0.07); overflow: hidden; }
        .panelHeader { padding: 16px 18px; border-bottom: 1px solid rgba(15, 23, 42, 0.08); display: flex; justify-content: space-between; gap: 12px; align-items: center; flex-wrap: wrap; }
        .panelTitle { margin: 0; color: #0f172a; font-size: 18px; line-height: 1.15; font-weight: 950; letter-spacing: -0.04em; }
        .panelSub { color: #64748b; font-size: 12px; line-height: 1.45; font-weight: 750; margin-top: 4px; }
        .panelBody { padding: 14px; }
        .textLink { border: none; background: transparent; color: #16a34a; font-size: 12px; font-weight: 950; cursor: pointer; padding: 0; }
        .guideList { display: grid; gap: 10px; }
        .guideCard { background: #ffffff; border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 22px; padding: 13px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 14px; align-items: center; transition: 0.2s ease; }
        .guideCard:hover { transform: translateY(-1px); box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08); }
        .guideTitle { color: #0f172a; font-size: 15px; font-weight: 950; line-height: 1.3; }
        .guideMeta { color: #64748b; font-size: 12px; line-height: 1.45; font-weight: 750; margin-top: 4px; }
        .guideRows { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin-top: 11px; }
        .miniMetric { background: #f8fafc; border: 1px solid rgba(15, 23, 42, 0.06); border-radius: 16px; padding: 10px; }
        .miniLabel { color: #64748b; font-size: 10px; font-weight: 950; text-transform: uppercase; letter-spacing: 0.06em; }
        .miniValue { color: #0f172a; font-size: 13px; font-weight: 950; margin-top: 4px; }
        .actions { display: grid; gap: 8px; min-width: 170px; }
        .actionBtn { border: 1px solid rgba(15, 23, 42, 0.10); background: #ffffff; color: #0f172a; border-radius: 999px; padding: 9px 12px; font-size: 11px; font-weight: 950; cursor: pointer; transition: 0.2s ease; white-space: nowrap; }
        .actionBtn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08); }
        .actionBtn.primary { background: #0f172a; color: #ffffff; border-color: #0f172a; }
        .actionBtn.green { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
        .actionBtn:disabled { opacity: 0.55; cursor: not-allowed; }
        .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 5px 8px; font-size: 10px; font-weight: 950; margin-top: 8px; }
        .badge.green { background: #dcfce7; color: #166534; }
        .badge.yellow { background: #fef3c7; color: #92400e; }
        .empty { padding: 24px; text-align: center; color: #64748b; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 22px; font-size: 13px; font-weight: 750; }
        .modalOverlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.54); display: flex; align-items: center; justify-content: center; padding: 18px; z-index: 100; }
        .modal { width: 100%; max-width: 470px; background: #ffffff; border-radius: 28px; box-shadow: 0 28px 90px rgba(15, 23, 42, 0.30); overflow: hidden; max-height: 90vh; overflow-y: auto; }
        .modalHeader { padding: 20px; border-bottom: 1px solid rgba(15, 23, 42, 0.08); }
        .modalTitle { margin: 0; color: #0f172a; font-size: 20px; font-weight: 950; letter-spacing: -0.04em; }
        .modalSub { color: #64748b; font-size: 12px; font-weight: 750; line-height: 1.45; margin-top: 5px; }
        .modalBody { padding: 20px; display: grid; gap: 12px; }
        .field { display: grid; gap: 6px; }
        .label { color: #475569; font-size: 12px; font-weight: 950; text-transform: uppercase; letter-spacing: 0.06em; }
        .modalInput, .modalTextarea { width: 100%; border: 1px solid rgba(15, 23, 42, 0.10); background: #ffffff; color: #0f172a; border-radius: 16px; padding: 13px 14px; font-size: 14px; font-weight: 800; outline: none; }
        .modalTextarea { min-height: 90px; resize: vertical; line-height: 1.45; }
        .modalActions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
        .btn { border: none; border-radius: 999px; padding: 12px 15px; font-size: 12px; font-weight: 950; cursor: pointer; transition: 0.2s ease; }
        .btn.primary { background: #0f172a; color: #ffffff; }
        .btn.light { background: #f1f5f9; color: #475569; }
        .btn.green { background: #dcfce7; color: #166534; }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .historyBox { background: #f8fafc; border: 1px solid rgba(15, 23, 42, 0.06); border-radius: 18px; padding: 12px; color: #475569; font-size: 12px; line-height: 1.45; font-weight: 750; }
        @media (max-width: 1180px) { .statsGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); } .toolbar { grid-template-columns: 1fr; } .guideRows { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width: 1040px) { .heroInner { grid-template-columns: 1fr; } .guideCard { grid-template-columns: 1fr; } .actions { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width: 720px) { .header { padding: 10px 12px; } .brandTitle, .brandSub { display: none; } .container { padding: 16px 12px 42px; } .hero, .panel { border-radius: 24px; } .hero { padding: 22px; } .statsGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .filters { display: grid; grid-template-columns: 1fr 1fr; } .filterBtn { width: 100%; } .guideRows { grid-template-columns: 1fr; } .actions { grid-template-columns: 1fr; } }
        @media (max-width: 480px) { .heroTitle { font-size: 38px; } .statsGrid { grid-template-columns: 1fr; } .modalActions { display: grid; } .btn { width: 100%; } }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <div className="brand" onClick={() => router.push('/admin/dashboard')}>
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />

            <div>
              <div className="brandTitle">PrussikTrails Admin</div>
              <div className="brandSub">Financeiro e repasses</div>
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
          <div className="heroInner">
            <div>
              <div className="eyebrow">Central financeira</div>

              <h1 className="heroTitle">
                Receita, taxa da plataforma e repasses em <span>visão única.</span>
              </h1>

              <p className="heroText">
                Controle valores confirmados, taxa PrussikTrails de 5%, repasses aos guias, pagamentos registrados e saldo pendente.
                {ultimaAtualizacao && (
                  <>
                    <br />
                    Atualizado às {ultimaAtualizacao}.
                  </>
                )}
              </p>
            </div>

            <aside className="heroCard">
              <div className="heroLabel">Resultado estimado do mês</div>
              <div className="heroValue">{formatarMoeda(stats.resultadoPlataformaMes)}</div>
              <div className="heroSmall">
                Receita bruta do mês: {formatarMoeda(stats.receitaBrutaMes)} · taxa 5%: {formatarMoeda(stats.taxaPlataformaMes)}.
              </div>
            </aside>
          </div>
        </section>

        {!repassesOk && (
          <div className="alert warning">
            A tela não conseguiu carregar os repasses pela rota segura. Confira se a rota /api/admin/financeiro/repasses existe e se a SERVICE_ROLE está configurada.
          </div>
        )}

        {mensagem && <div className="alert success">{mensagem}</div>}
        {erro && <div className="alert error">{erro}</div>}

        <section className="statsGrid">
          <article className="statCard" onClick={() => router.push('/admin/reservas')}>
            <div className="statIcon">💰</div>
            <div className="statValue">{formatarMoeda(stats.receitaBrutaTotal)}</div>
            <div className="statLabel">receita bruta confirmada</div>
          </article>

          <article className="statCard" onClick={() => setFiltroFinanceiro('todos')}>
            <div className="statIcon">🏷️</div>
            <div className="statValue">{formatarMoeda(stats.taxaPlataformaTotal)}</div>
            <div className="statLabel">taxa plataforma 5%</div>
          </article>

          <article className="statCard" onClick={() => setFiltroFinanceiro('todos')}>
            <div className="statIcon">🧭</div>
            <div className="statValue">{formatarMoeda(stats.repasseGuiasTotal)}</div>
            <div className="statLabel">valor líquido estimado dos guias</div>
          </article>

          <article className="statCard" onClick={() => setFiltroFinanceiro('com_saldo')}>
            <div className="statIcon">⏳</div>
            <div className="statValue">{formatarMoeda(stats.saldoGuiasTotal)}</div>
            <div className="statLabel">saldo pendente para guias</div>
          </article>

          <article className="statCard" onClick={() => setFiltroFinanceiro('quitados')}>
            <div className="statIcon">✅</div>
            <div className="statValue">{formatarMoeda(stats.pagoGuiasTotal)}</div>
            <div className="statLabel">pagamentos registrados</div>
          </article>

          <article className="statCard" onClick={() => router.push('/admin/reservas')}>
            <div className="statIcon">🎒</div>
            <div className="statValue">{stats.reservasConfirmadas}</div>
            <div className="statLabel">reservas pagas/confirmadas</div>
          </article>
        </section>

        <section className="toolbar">
          <input
            className="input"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por guia, e-mail, roteiro ou ID..."
          />

          <div className="filters">
            <button type="button" className={`filterBtn ${filtroFinanceiro === 'todos' ? 'active' : ''}`} onClick={() => setFiltroFinanceiro('todos')}>
              Todos
            </button>

            <button type="button" className={`filterBtn ${filtroFinanceiro === 'com_saldo' ? 'active' : ''}`} onClick={() => setFiltroFinanceiro('com_saldo')}>
              Com saldo
            </button>

            <button type="button" className={`filterBtn ${filtroFinanceiro === 'quitados' ? 'active' : ''}`} onClick={() => setFiltroFinanceiro('quitados')}>
              Quitados
            </button>

            <button type="button" className={`filterBtn ${filtroFinanceiro === 'sem_repasses' ? 'active' : ''}`} onClick={() => setFiltroFinanceiro('sem_repasses')}>
              Sem repasses
            </button>
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

            <button type="button" className="textLink" onClick={atualizar} disabled={atualizando}>
              {atualizando ? 'Atualizando...' : 'Atualizar financeiro'}
            </button>
          </div>

          <div className="panelBody">
            {guiasFiltrados.length === 0 ? (
              <div className="empty">Nenhum guia encontrado com os filtros atuais.</div>
            ) : (
              <div className="guideList">
                {guiasFiltrados.map((guia) => (
                  <article className="guideCard" key={guia.guia_id}>
                    <div>
                      <div className="guideTitle">{guia.guia_nome}</div>

                      <div className="guideMeta">
                        {guia.guia_email || 'E-mail não informado'} · {guia.reservas_confirmadas} reserva(s) confirmada(s)
                        <br />
                        Última reserva: {formatarData(guia.ultima_reserva_em)} · último pagamento: {formatarData(guia.ultimo_pagamento_em)}
                      </div>

                      {guia.saldo_pendente > 0 ? (
                        <span className="badge yellow">Saldo pendente</span>
                      ) : (
                        <span className="badge green">Sem saldo pendente</span>
                      )}

                      <div className="guideRows">
                        <div className="miniMetric">
                          <div className="miniLabel">Receita bruta</div>
                          <div className="miniValue">{formatarMoeda(guia.receita_bruta)}</div>
                        </div>

                        <div className="miniMetric">
                          <div className="miniLabel">Taxa 5%</div>
                          <div className="miniValue">{formatarMoeda(guia.taxa_plataforma)}</div>
                        </div>

                        <div className="miniMetric">
                          <div className="miniLabel">Líquido guia</div>
                          <div className="miniValue">{formatarMoeda(guia.valor_liquido_guia)}</div>
                        </div>

                        <div className="miniMetric">
                          <div className="miniLabel">Já pago</div>
                          <div className="miniValue">{formatarMoeda(guia.valor_pago)}</div>
                        </div>

                        <div className="miniMetric">
                          <div className="miniLabel">Saldo</div>
                          <div className="miniValue">{formatarMoeda(guia.saldo_pendente)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="actions">
                      <button type="button" className="actionBtn primary" onClick={() => abrirPagamento(guia)} disabled={guia.saldo_pendente <= 0}>
                        Registrar pagamento
                      </button>

                      <button type="button" className="actionBtn green" onClick={() => abrirPagamento(guia, guia.saldo_pendente)} disabled={guia.saldo_pendente <= 0}>
                        Pagar saldo total
                      </button>

                      <button
                        type="button"
                        className="actionBtn"
                        onClick={() => {
                          setGuiaSelecionado(guia)
                          setModalPagamentoAberto(false)
                        }}
                      >
                        Ver histórico
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {modalPagamentoAberto && guiaSelecionado && (
        <div className="modalOverlay">
          <form className="modal" onSubmit={registrarPagamento}>
            <div className="modalHeader">
              <h2 className="modalTitle">Registrar pagamento ao guia</h2>
              <div className="modalSub">
                Guia: {guiaSelecionado.guia_nome} · saldo atual: {formatarMoeda(guiaSelecionado.saldo_pendente)}
              </div>
            </div>

            <div className="modalBody">
              <div className="field">
                <label className="label">Valor pago</label>
                <input
                  className="modalInput"
                  value={valorPagamento}
                  onChange={(event) => setValorPagamento(event.target.value)}
                  placeholder="Ex.: 250,00"
                  inputMode="decimal"
                />
              </div>

              <div className="field">
                <label className="label">Observação</label>
                <textarea
                  className="modalTextarea"
                  value={observacaoPagamento}
                  onChange={(event) => setObservacaoPagamento(event.target.value)}
                  placeholder="Ex.: Repasse parcial via Pix."
                />
              </div>

              <div className="historyBox">
                Este pagamento reduzirá o saldo pendente do guia. Para evitar duplicidade, cada registro ficará no histórico de repasses.
              </div>

              <div className="modalActions">
                <button type="submit" className="btn primary" disabled={registrandoPagamento}>
                  {registrandoPagamento ? 'Registrando...' : 'Confirmar pagamento'}
                </button>

                <button type="button" className="btn light" disabled={registrandoPagamento} onClick={() => setModalPagamentoAberto(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {guiaSelecionado && !modalPagamentoAberto && (
        <div className="modalOverlay">
          <div className="modal">
            <div className="modalHeader">
              <h2 className="modalTitle">Histórico do guia</h2>
              <div className="modalSub">{guiaSelecionado.guia_nome}</div>
            </div>

            <div className="modalBody">
              <div className="historyBox">
                <strong>Reservas confirmadas:</strong>
                <br />
                {guiaSelecionado.reservas.length > 0 ? (
                  guiaSelecionado.reservas.slice(0, 8).map((reserva) => (
                    <div key={reserva.id} style={{ marginTop: 8 }}>
                      {reserva.roteiro_titulo || 'Roteiro'} · {formatarMoeda(reserva.valor_total || 0)} · {formatarData(reserva.created_at)}
                    </div>
                  ))
                ) : (
                  <span style={{ display: 'block', marginTop: 8 }}>
                    Nenhuma reserva confirmada encontrada.
                  </span>
                )}
              </div>

              <div className="historyBox">
                <strong>Pagamentos registrados:</strong>
                <br />
                {guiaSelecionado.repasses.length > 0 ? (
                  guiaSelecionado.repasses.slice(0, 8).map((repasse) => (
                    <div key={repasse.id} style={{ marginTop: 8 }}>
                      {formatarMoeda(valorDoRepasse(repasse))} · {formatarData(dataDoRepasse(repasse))} · {repasse.observacao || repasse.descricao || 'Sem observação'}
                    </div>
                  ))
                ) : (
                  <span style={{ display: 'block', marginTop: 8 }}>
                    Nenhum pagamento registrado para este guia.
                  </span>
                )}
              </div>

              <div className="modalActions">
                <button type="button" className="btn primary" onClick={() => setGuiaSelecionado(null)}>
                  Fechar
                </button>

                <button
                  type="button"
                  className="btn green"
                  disabled={guiaSelecionado.saldo_pendente <= 0}
                  onClick={() => {
                    setValorPagamento(String(guiaSelecionado.saldo_pendente.toFixed(2)).replace('.', ','))
                    setObservacaoPagamento('')
                    setModalPagamentoAberto(true)
                  }}
                >
                  Registrar pagamento
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
              <div className="modalSub">Atualize sua senha de acesso administrativo.</div>
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
                <button type="submit" className="btn primary" disabled={alterandoSenha}>
                  {alterandoSenha ? 'Alterando...' : 'Salvar nova senha'}
                </button>

                <button type="button" className="btn light" disabled={alterandoSenha} onClick={() => setModalSenhaAberto(false)}>
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