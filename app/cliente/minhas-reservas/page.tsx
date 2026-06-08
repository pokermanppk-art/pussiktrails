'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type AnyRecord = Record<string, any>

type UsuarioLocal = {
  id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  cliente_id?: string | null
  nome?: string | null
  name?: string | null
  email?: string | null
  tipo?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
}

type Reserva = AnyRecord
type Roteiro = AnyRecord
type Guia = AnyRecord

type ReservaCompleta = Reserva & {
  roteiro?: Roteiro | null
  guia?: Guia | null
  grupo_id?: string | null
  roteiro_titulo: string
  roteiro_foto: string
  guia_nome: string
  valor_calculado: number
}

type SaldoCliente = {
  cliente_id?: string
  saldo_disponivel?: number | string
  saldo_reservado?: number | string
  saldo_utilizado?: number | string
  saldo_expirado?: number | string
  moeda?: string
}

type MovimentacaoSaldo = AnyRecord
type ReembolsoCliente = AnyRecord

type CancelamentoModal = {
  reserva: ReservaCompleta
  motivoCodigo: string
  motivoDescricao: string
}

type ReembolsoModal = {
  valor: string
  pixTipo: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria'
  pixChave: string
  titularNome: string
  titularDocumento: string
  motivo: string
  confirmaPixTitular: boolean
}

const MOTIVOS_CANCELAMENTO_CLIENTE = [
  { codigo: 'mudanca_de_planos', label: 'Mudança de planos' },
  { codigo: 'problema_pessoal', label: 'Problema pessoal' },
  { codigo: 'clima_ou_deslocamento', label: 'Clima, deslocamento ou logística' },
  { codigo: 'saude', label: 'Saúde' },
  { codigo: 'outro', label: 'Outro motivo' },
]

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function extrairUsuarioId(usuario: UsuarioLocal | null) {
  return texto(usuario?.id || usuario?.user_id || usuario?.usuario_id || usuario?.cliente_id)
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function numero(valor: unknown) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0

  const limpo = texto(valor)
    .replace(/R\$/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  const n = Number(limpo)
  return Number.isFinite(n) ? n : 0
}

function formatarMoeda(valor: unknown) {
  return numero(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatarData(valor: unknown) {
  if (!valor) return 'Data a confirmar'

  const data = new Date(String(valor))
  if (Number.isNaN(data.getTime())) return 'Data a confirmar'

  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatarDataLonga(valor: unknown) {
  if (!valor) return 'Data a confirmar'

  const data = new Date(String(valor))
  if (Number.isNaN(data.getTime())) return 'Data a confirmar'

  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatarHora(valor: unknown) {
  if (!valor) return ''

  const raw = String(valor)
  if (/^\d{2}:\d{2}/.test(raw)) return raw.slice(0, 5)

  const data = new Date(raw)
  if (Number.isNaN(data.getTime())) return ''

  return data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function tituloRoteiro(roteiro?: Roteiro | null) {
  return texto(roteiro?.titulo || roteiro?.nome) || 'Roteiro PrussikTrails'
}

function fotoRoteiro(roteiro?: Roteiro | null) {
  return texto(roteiro?.foto_url || roteiro?.foto_capa || roteiro?.imagem_url || roteiro?.imagem || roteiro?.image_url || roteiro?.capa_url)
}

function guiaIdRoteiro(roteiro?: Roteiro | null) {
  return texto(roteiro?.id_guia || roteiro?.guia_id || roteiro?.user_id || roteiro?.usuario_id || roteiro?.criado_por || roteiro?.created_by || roteiro?.owner_id)
}

function guiaIdReserva(reserva?: Reserva | null) {
  return texto(reserva?.guia_id || reserva?.id_guia || reserva?.guiaId || reserva?.idGuia)
}

function roteiroIdReserva(reserva?: Reserva | null) {
  return texto(reserva?.roteiro_id || reserva?.id_roteiro || reserva?.roteiroId || reserva?.idRoteiro)
}

function dataRoteiro(roteiro?: Roteiro | null, reserva?: Reserva | null) {
  return (
    reserva?.data_trilha ||
    reserva?.data_reserva ||
    roteiro?.proxima_data ||
    roteiro?.embarque_data_hora ||
    roteiro?.data_inicio ||
    roteiro?.data_roteiro ||
    roteiro?.data_saida ||
    roteiro?.data_trilha ||
    roteiro?.data ||
    roteiro?.created_at ||
    null
  )
}

function horaRoteiro(roteiro?: Roteiro | null) {
  return roteiro?.hora_inicio || roteiro?.hora_roteiro || roteiro?.hora_saida || roteiro?.hora || roteiro?.hora_trilha || roteiro?.embarque_data_hora || null
}

function localRoteiro(roteiro?: Roteiro | null) {
  return texto(roteiro?.local || roteiro?.localizacao || roteiro?.cidade || roteiro?.local_encontro || roteiro?.ponto_encontro) || 'Local a confirmar'
}

function isPago(reserva: Reserva) {
  const pagamento = normalizar(reserva.pagamento_status || reserva.status_pagamento || reserva.payment_status)
  const status = normalizar(reserva.status)

  return (
    pagamento === 'pago' ||
    pagamento === 'confirmado' ||
    pagamento === 'aprovado' ||
    pagamento === 'paid' ||
    pagamento === 'approved' ||
    status === 'pago' ||
    status === 'paga' ||
    status === 'confirmada' ||
    status === 'realizada'
  )
}

function isCancelada(reserva: Reserva) {
  const status = normalizar(reserva.status)
  return status === 'cancelada' || status === 'cancelado'
}

function isRealizada(reserva: Reserva) {
  const status = normalizar(reserva.status)
  return status === 'realizada' || status === 'realizado' || status === 'finalizada' || status === 'concluida' || status === 'concluída'
}

function badgeReserva(reserva: Reserva) {
  if (isCancelada(reserva)) return { label: 'Cancelada', classe: 'cancelada' }
  if (isRealizada(reserva)) return { label: 'Realizada', classe: 'realizada' }
  if (isPago(reserva)) return { label: 'Confirmada', classe: 'confirmada' }
  return { label: 'Aguardando pagamento', classe: 'pendente' }
}

function badgePagamento(reserva: Reserva) {
  if (isPago(reserva)) return { label: 'Pago', classe: 'pago' }
  if (isCancelada(reserva)) return { label: 'Cancelado', classe: 'cancelada' }
  return { label: 'Pendente', classe: 'pendente' }
}

function primeiroNome(usuario?: UsuarioLocal | null) {
  const nome = texto(usuario?.nome || usuario?.name || usuario?.email)
  return nome.split(' ')[0] || 'aventureiro'
}

function avatarUsuario(usuario?: UsuarioLocal | null) {
  return texto(usuario?.avatar_url || usuario?.foto_url || usuario?.imagem_url)
}

function inicialUsuario(usuario?: UsuarioLocal | null) {
  return primeiroNome(usuario).slice(0, 1).toUpperCase()
}

function resumoMovimentacao(mov: MovimentacaoSaldo) {
  const tipo = normalizar(mov.tipo)

  if (tipo.includes('cancelamento_guia')) return 'Crédito por cancelamento do guia'
  if (tipo.includes('cancelamento_cliente')) return 'Crédito por cancelamento'
  if (tipo.includes('arrependimento')) return 'Crédito por arrependimento'
  if (tipo.includes('debito')) return 'Débito administrativo'
  if (tipo.includes('uso_saldo')) return 'Uso de saldo em reserva'
  if (tipo.includes('credito')) return 'Crédito administrativo'

  return mov.descricao || 'Movimentação de saldo'
}

export default function ClienteMinhasReservasPage() {
  const router = useRouter()

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [reservas, setReservas] = useState<ReservaCompleta[]>([])
  const [saldo, setSaldo] = useState<SaldoCliente | null>(null)
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoSaldo[]>([])
  const [reembolsos, setReembolsos] = useState<ReembolsoCliente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState<'todas' | 'ativas' | 'pendentes' | 'canceladas'>('todas')
  const [cancelamento, setCancelamento] = useState<CancelamentoModal | null>(null)
  const [cancelando, setCancelando] = useState(false)
  const [abrindoGrupoId, setAbrindoGrupoId] = useState('')

  const [modalReembolsoAberto, setModalReembolsoAberto] = useState(false)
  const [solicitandoReembolso, setSolicitandoReembolso] = useState(false)
  const [erroReembolso, setErroReembolso] = useState('')
  const [reembolsoForm, setReembolsoForm] = useState<ReembolsoModal>({
    valor: '',
    pixTipo: 'cpf',
    pixChave: '',
    titularNome: '',
    titularDocumento: '',
    motivo: '',
    confirmaPixTitular: false,
  })

  useEffect(() => {
    iniciar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function iniciar() {
    try {
      setCarregando(true)
      setErro('')

      const salvo = localStorage.getItem('user')
      const usuario = salvo ? (JSON.parse(salvo) as UsuarioLocal) : null
      const usuarioId = extrairUsuarioId(usuario)

      if (!usuario || !usuarioId || normalizar(usuario.tipo) !== 'cliente') {
        router.replace('/login')
        return
      }

      let usuarioNormalizado: UsuarioLocal = { ...usuario, id: usuarioId }

      try {
        const { data: perfilAtualizado, error: perfilError } = await supabase
          .from('users')
          .select('nome, name, email, avatar_url, foto_url, imagem_url')
          .eq('id', usuarioId)
          .maybeSingle()

        if (!perfilError && perfilAtualizado) {
          usuarioNormalizado = {
            ...usuarioNormalizado,
            nome: perfilAtualizado.nome || usuarioNormalizado.nome || null,
            name: perfilAtualizado.name || usuarioNormalizado.name || null,
            email: perfilAtualizado.email || usuarioNormalizado.email || null,
            avatar_url: perfilAtualizado.avatar_url || usuarioNormalizado.avatar_url || null,
            foto_url: perfilAtualizado.foto_url || usuarioNormalizado.foto_url || null,
            imagem_url: perfilAtualizado.imagem_url || usuarioNormalizado.imagem_url || null,
          }

          localStorage.setItem('user', JSON.stringify(usuarioNormalizado))
        }
      } catch (avatarError) {
        console.warn('Não foi possível sincronizar o avatar do cliente:', avatarError)
      }

      setUser(usuarioNormalizado)
      await Promise.all([carregarReservas(usuarioId), carregarSaldo(usuarioId)])
    } catch (error) {
      console.error('Erro ao iniciar minhas reservas:', error)
      setErro('Não foi possível carregar suas reservas agora.')
    } finally {
      setCarregando(false)
    }
  }

  async function atualizar() {
    const clienteId = extrairUsuarioId(user)
    if (!clienteId) return

    try {
      setAtualizando(true)
      setMensagem('')
      setErro('')
      await Promise.all([carregarReservas(clienteId), carregarSaldo(clienteId)])
      setMensagem('Reservas atualizadas.')
    } catch (error) {
      console.error('Erro ao atualizar:', error)
      setErro('Não foi possível atualizar agora.')
    } finally {
      setAtualizando(false)
    }
  }

  async function carregarSaldo(clienteId: string) {
    try {
      const resposta = await fetch(`/api/cliente/saldo?clienteId=${encodeURIComponent(clienteId)}`)
      const json = await resposta.json().catch(() => null)

      if (!resposta.ok || !json?.sucesso) {
        setSaldo({ cliente_id: clienteId, saldo_disponivel: 0, moeda: 'BRL' })
        setMovimentacoes([])
        setReembolsos([])
        return
      }

      setSaldo(json.saldo || { cliente_id: clienteId, saldo_disponivel: 0, moeda: 'BRL' })
      setMovimentacoes(Array.isArray(json.movimentacoes) ? json.movimentacoes : [])
      setReembolsos(Array.isArray(json.reembolsos) ? json.reembolsos : [])
    } catch (error) {
      console.warn('Saldo indisponível:', error)
      setSaldo({ cliente_id: clienteId, saldo_disponivel: 0, moeda: 'BRL' })
      setMovimentacoes([])
      setReembolsos([])
    }
  }

  async function carregarGruposPorRoteiro(roteiroIds: string[]) {
    const mapa = new Map<string, string>()
    const ids = Array.from(new Set(roteiroIds.filter(Boolean)))

    if (ids.length === 0) return mapa

    try {
      const { data, error } = await supabase
        .from('grupos_roteiros')
        .select('id, roteiro_id')
        .in('roteiro_id', ids)

      if (error) return mapa

      ;((data || []) as AnyRecord[]).forEach((grupo) => {
        if (grupo?.roteiro_id && grupo?.id) mapa.set(String(grupo.roteiro_id), String(grupo.id))
      })
    } catch (error) {
      console.warn('Não foi possível carregar grupos dos roteiros:', error)
    }

    return mapa
  }

  async function carregarReservas(clienteId: string) {
    const { data: reservasBase, error: reservasError } = await supabase
      .from('reservas')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })

    if (reservasError) throw reservasError

    const listaReservas = (reservasBase || []) as Reserva[]
    const roteiroIds = Array.from(new Set(listaReservas.map(roteiroIdReserva).filter(Boolean)))

    let roteiros: Roteiro[] = []

    if (roteiroIds.length > 0) {
      const { data, error } = await supabase.from('roteiros').select('*').in('id', roteiroIds)
      if (!error && data) roteiros = data as Roteiro[]
    }

    const gruposPorRoteiro = await carregarGruposPorRoteiro(roteiroIds)

    const guiaIds = Array.from(
      new Set(
        listaReservas
          .flatMap((reserva) => {
            const roteiro = roteiros.find((item) => String(item.id) === roteiroIdReserva(reserva))
            return [guiaIdReserva(reserva), guiaIdRoteiro(roteiro)]
          })
          .filter(Boolean)
      )
    )

    let guias: Guia[] = []

    if (guiaIds.length > 0) {
      const { data } = await supabase.from('users').select('*').in('id', guiaIds)
      if (data) guias = data as Guia[]
    }

    const completas = listaReservas.map((reserva) => {
      const roteiroId = roteiroIdReserva(reserva)
      const roteiro = roteiros.find((item) => String(item.id) === roteiroId) || null
      const guiaId = guiaIdReserva(reserva) || guiaIdRoteiro(roteiro)
      const guia = guias.find((item) => String(item.id) === guiaId) || null
      const quantidade = Math.max(1, numero(reserva.quantidade_pessoas) || 1)
      const valorBase =
        numero(reserva.valor_total) ||
        numero(reserva.valor_pago) ||
        numero(reserva.valor) ||
        numero(roteiro?.preco) * quantidade ||
        numero(roteiro?.valor) * quantidade ||
        0

      return {
        ...reserva,
        roteiro,
        guia,
        grupo_id: gruposPorRoteiro.get(roteiroId) || null,
        roteiro_titulo: tituloRoteiro(roteiro),
        roteiro_foto: fotoRoteiro(roteiro),
        guia_nome: texto(guia?.nome || guia?.name || guia?.email) || 'Guia PrussikTrails',
        valor_calculado: valorBase,
      } as ReservaCompleta
    })

    setReservas(completas)
  }

  function abrirReembolso() {
    setMensagem('')
    setErro('')
    setErroReembolso('')

    if (saldoDisponivel <= 0) {
      setErro('Não há saldo disponível para solicitar reembolso neste momento.')
      return
    }

    setReembolsoForm({
      valor: String(saldoDisponivel.toFixed(2)).replace('.', ','),
      pixTipo: 'cpf',
      pixChave: '',
      titularNome: user?.nome || user?.name || '',
      titularDocumento: '',
      motivo: 'Solicitação de reembolso do Saldo de Jornada.',
      confirmaPixTitular: false,
    })

    setModalReembolsoAberto(true)
  }

  async function solicitarReembolso(event?: FormEvent) {
    event?.preventDefault()
    if (!user?.id) return

    const valor = numero(reembolsoForm.valor)

    if (!Number.isFinite(valor) || valor <= 0) {
      setErroReembolso('Informe um valor válido para o reembolso.')
      return
    }

    if (valor > saldoDisponivel) {
      setErroReembolso('O valor solicitado não pode ser maior que o saldo disponível.')
      return
    }

    if (!reembolsoForm.pixChave.trim()) {
      setErroReembolso('Informe a chave PIX para o reembolso.')
      return
    }

    if (!reembolsoForm.titularNome.trim()) {
      setErroReembolso('Informe o nome do titular do PIX.')
      return
    }

    if (!reembolsoForm.confirmaPixTitular) {
      setErroReembolso('Confirme que a chave PIX está no seu nome antes de solicitar o reembolso.')
      return
    }

    try {
      setSolicitandoReembolso(true)
      setErroReembolso('')
      setErro('')
      setMensagem('')

      const resposta = await fetch('/api/cliente/saldo/solicitar-reembolso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: user.id,
          valorSolicitado: valor,
          pixTipo: reembolsoForm.pixTipo,
          chavePix: reembolsoForm.pixChave,
          titularNome: reembolsoForm.titularNome,
          titularDocumento: reembolsoForm.titularDocumento,
          motivo: reembolsoForm.motivo,
        }),
      })

      const json = await resposta.json().catch(() => null)
      if (!resposta.ok || !json?.sucesso) throw new Error(json?.erro || 'Não foi possível registrar a solicitação de reembolso.')

      setMensagem('Solicitação de reembolso enviada ao Admin. Você poderá acompanhar o status pelo extrato.')
      setModalReembolsoAberto(false)
      await carregarSaldo(user.id)
    } catch (error) {
      console.error('Erro ao solicitar reembolso:', error)
      setErroReembolso(error instanceof Error ? error.message : 'Erro ao solicitar reembolso.')
    } finally {
      setSolicitandoReembolso(false)
    }
  }

  function abrirCancelamento(reserva: ReservaCompleta) {
    setMensagem('')
    setErro('')
    setCancelamento({
      reserva,
      motivoCodigo: 'mudanca_de_planos',
      motivoDescricao: '',
    })
  }

  async function confirmarCancelamento() {
    if (!cancelamento || !user?.id) return

    const motivoSelecionado = MOTIVOS_CANCELAMENTO_CLIENTE.find((item) => item.codigo === cancelamento.motivoCodigo)
    const motivoTexto = [motivoSelecionado?.label || 'Cancelamento pelo cliente', cancelamento.motivoDescricao].filter(Boolean).join(' — ').trim()

    try {
      setCancelando(true)
      setErro('')
      setMensagem('')

      const resposta = await fetch('/api/reservas/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservaId: cancelamento.reserva.id,
          canceladoPorTipo: 'cliente',
          canceladoPorId: user.id,
          motivoCodigo: cancelamento.motivoCodigo,
          motivoDescricao: motivoTexto,
        }),
      })

      const json = await resposta.json().catch(() => null)
      if (!resposta.ok || !json?.sucesso) throw new Error(json?.erro || 'Não foi possível cancelar a reserva.')

      const credito = numero(json.saldoCreditado)
      setMensagem(credito > 0 ? `Reserva cancelada. ${formatarMoeda(credito)} foram adicionados ao seu Saldo de Jornada.` : 'Reserva cancelada.')
      setCancelamento(null)
      await Promise.all([carregarReservas(user.id), carregarSaldo(user.id)])
    } catch (error) {
      console.error('Erro ao cancelar reserva:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao cancelar reserva.')
    } finally {
      setCancelando(false)
    }
  }

  async function abrirGrupoDaReserva(reserva: ReservaCompleta) {
    const roteiroId = roteiroIdReserva(reserva)
    const clienteId = extrairUsuarioId(user)

    if (!roteiroId || !clienteId) {
      setErro('Não foi possível identificar o grupo desta reserva.')
      return
    }

    if (!isPago(reserva)) {
      setErro('O grupo será liberado após a confirmação do pagamento.')
      return
    }

    try {
      setAbrindoGrupoId(String(reserva.id))
      setErro('')
      setMensagem('Abrindo grupo da experiência...')

      const response = await fetch('/api/grupos/garantir-grupo-roteiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservaId: reserva.id,
          reserva_id: reserva.id,
          roteiroId,
          roteiro_id: roteiroId,
          clienteId,
          cliente_id: clienteId,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.erro || 'Não foi possível liberar o grupo agora.')
      }

      const redirectClienteUrl = texto(data?.redirectClienteUrl || data?.redirectUrl)
      const grupoId = texto(
        data?.grupo_id ||
          data?.grupo?.id ||
          (redirectClienteUrl.includes('/cliente/grupos/')
            ? redirectClienteUrl.split('/cliente/grupos/')[1]
            : '')
      )

      if (grupoId) {
        router.push(`/cliente/grupos/${encodeURIComponent(grupoId)}`)
        return
      }

      router.push('/cliente/grupos')
    } catch (error) {
      console.error('Erro ao abrir grupo:', error)
      setErro(error instanceof Error ? error.message : 'Não foi possível abrir o grupo agora.')
    } finally {
      setAbrindoGrupoId('')
      setMensagem('')
    }
  }

  const saldoDisponivel = numero(saldo?.saldo_disponivel)
  const saldoUtilizado = numero(saldo?.saldo_utilizado)
  const saldoReservado = numero(saldo?.saldo_reservado)
  const reembolsoPendente = reembolsos.some((item) => ['pendente', 'em_analise', 'aprovado'].includes(normalizar(item.status)))

  const stats = useMemo(() => {
    return reservas.reduce(
      (acc, reserva) => {
        acc.total += 1
        if (isPago(reserva) && !isCancelada(reserva)) acc.confirmadas += 1
        if (!isPago(reserva) && !isCancelada(reserva)) acc.pendentes += 1
        if (isCancelada(reserva)) acc.canceladas += 1
        return acc
      },
      { total: 0, confirmadas: 0, pendentes: 0, canceladas: 0 }
    )
  }, [reservas])



  const gruposLiberados = useMemo(() => {
    return reservas.filter((reserva) => {
      return isPago(reserva) && !isCancelada(reserva) && Boolean(roteiroIdReserva(reserva))
    }).length
  }, [reservas])

  const gruposPendentes = useMemo(() => {
    return reservas.filter((reserva) => {
      return !isPago(reserva) && !isCancelada(reserva) && Boolean(roteiroIdReserva(reserva))
    }).length
  }, [reservas])

  const reservasFiltradas = useMemo(() => {
    if (filtro === 'ativas') return reservas.filter((reserva) => !isCancelada(reserva))
    if (filtro === 'pendentes') return reservas.filter((reserva) => !isPago(reserva) && !isCancelada(reserva))
    if (filtro === 'canceladas') return reservas.filter(isCancelada)
    return reservas
  }, [reservas, filtro])

  if (carregando) {
    return (
      <main className="loadingScreen">
        <div className="spinner" />
        <p>Carregando suas jornadas...</p>
        <style jsx>{loadingStyles}</style>
      </main>
    )
  }

  return (
    <main className="page">
      <style jsx>{styles}</style>

      <header className="topbar">
        <div className="topbarInner">
          <div className="topbarSpacer" aria-hidden="true" />

          <button
            type="button"
            className="brand brandLogoOnly"
            onClick={() => router.push('/cliente/dashboard')}
            aria-label="Voltar para a dashboard do cliente"
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />
            <span>Minhas reservas</span>
          </button>

          <div className="topActions">
            <button
              type="button"
              className="profileButton"
              onClick={() => router.push('/cliente/perfil')}
              title="Perfil"
              aria-label="Abrir perfil"
            >
              {avatarUsuario(user) ? (
                <img src={avatarUsuario(user)} alt={user?.nome || user?.name || user?.email || 'Perfil do cliente'} />
              ) : (
                <span>{inicialUsuario(user)}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroGrid">
            <div>
              <div className="eyebrow">Minhas jornadas</div>
              <h1>
                Oi, {primeiroNome(user)}.
                <br />
                suas reservas ficam <span>por aqui.</span>
              </h1>
              <p className="heroText">Acompanhe pagamentos, confirmações, grupos liberados, cancelamentos e o seu Saldo de Jornada.</p>
            </div>

            <aside className="saldoCard">
              <div>
                <div className="saldoLabel">Saldo de Jornada</div>
                <div className="saldoValor">{formatarMoeda(saldoDisponivel)}</div>
                <p className="saldoText">{saldoDisponivel > 0 ? 'Use este saldo em uma nova jornada ou solicite reembolso quando aplicável.' : 'Se algum roteiro for cancelado com direito a crédito, o saldo aparecerá aqui.'}</p>
              </div>

              <div className="saldoMiniGrid">
                <div className="saldoMini"><strong>{formatarMoeda(saldoUtilizado)}</strong><span>Já utilizado</span></div>
                <div className="saldoMini"><strong>{formatarMoeda(saldoReservado)}</strong><span>Reservado</span></div>
              </div>

              <button type="button" className="saldoAction" onClick={abrirReembolso} disabled={saldoDisponivel <= 0 || reembolsoPendente}>
                {reembolsoPendente ? 'Reembolso em análise' : 'Solicitar reembolso'}
              </button>
            </aside>
          </div>
        </section>

        {mensagem && <div className="message">{mensagem}</div>}
        {erro && <div className="error">{erro}</div>}

        <section className="summaryCard">
          <div className="summaryHeader">
            <span>Resumo das reservas</span>
          </div>
          <div className="summaryGrid">
            <button type="button" className={filtro === 'todas' ? 'summaryItem active' : 'summaryItem'} onClick={() => setFiltro('todas')}>
              <strong>{stats.total}</strong><span>Reservas totais</span>
            </button>
            <button type="button" className={filtro === 'ativas' ? 'summaryItem active' : 'summaryItem'} onClick={() => setFiltro('ativas')}>
              <strong>{stats.confirmadas}</strong><span>Confirmadas</span>
            </button>
            <button type="button" className={filtro === 'pendentes' ? 'summaryItem active' : 'summaryItem'} onClick={() => setFiltro('pendentes')}>
              <strong>{stats.pendentes}</strong><span>Pendentes</span>
            </button>
            <button type="button" className={filtro === 'canceladas' ? 'summaryItem active' : 'summaryItem'} onClick={() => setFiltro('canceladas')}>
              <strong>{stats.canceladas}</strong><span>Canceladas</span>
            </button>
          </div>
        </section>

        <div className="contentGrid">
          <section className="panel">
            <div className="panelHeader">
              <div>
                <h2 className="panelTitle">Roteiros reservados</h2>
                <div className="panelSub">O grupo da experiência fica disponível após a confirmação do pagamento.</div>
              </div>
              <button type="button" className="btn" onClick={atualizar} disabled={atualizando}>{atualizando ? 'Atualizando...' : 'Atualizar'}</button>
            </div>

            <div className="panelBody">
              {reservasFiltradas.length === 0 ? (
                <div className="empty">Nenhuma reserva neste filtro. Que tal escolher uma nova trilha?</div>
              ) : (
                <div className="reservasList">
                  {reservasFiltradas.map((reserva) => {
                    const status = badgeReserva(reserva)
                    const pagamento = badgePagamento(reserva)
                    const roteiroId = roteiroIdReserva(reserva)
                    const podeCancelar = !isCancelada(reserva) && !isRealizada(reserva)
                    const podePagar = !isPago(reserva) && !isCancelada(reserva)
                    const podeAvaliar = isPago(reserva) && !isCancelada(reserva)
                    const grupoLiberado = isPago(reserva) && !isCancelada(reserva)

                    return (
                      <article className="reservaCard" key={reserva.id}>
                        <div className="thumb">{reserva.roteiro_foto ? <img src={reserva.roteiro_foto} alt={reserva.roteiro_titulo} /> : 'RT'}</div>

                        <div>
                          <div className="cardTop">
                            <div>
                              <h3 className="roteiroTitle">{reserva.roteiro_titulo}</h3>
                              <div className="meta">
                                {formatarDataLonga(dataRoteiro(reserva.roteiro, reserva))}
                                {formatarHora(horaRoteiro(reserva.roteiro)) && ` · ${formatarHora(horaRoteiro(reserva.roteiro))}`}
                                <br />
                                {localRoteiro(reserva.roteiro)}
                                <br />
                                Guia: {reserva.guia_nome} · {Math.max(1, numero(reserva.quantidade_pessoas) || 1)} pessoa(s)
                              </div>
                            </div>
                            <div className="badges">
                              <span className={`badge ${status.classe}`}>{status.label}</span>
                              <span className={`badge ${pagamento.classe}`}>{pagamento.label}</span>
                            </div>
                          </div>

                          {grupoLiberado && (
                            <button type="button" className="groupAccessCard" onClick={() => abrirGrupoDaReserva(reserva)} disabled={abrindoGrupoId === String(reserva.id)}>
                              <span>💬</span>
                              <strong>{abrindoGrupoId === String(reserva.id) ? 'Abrindo grupo...' : 'Grupo da experiência liberado'}</strong>
                              <small>Toque para acessar o grupo oficial deste roteiro.</small>
                            </button>
                          )}

                          {!grupoLiberado && !isCancelada(reserva) && (
                            <div className="groupLockedCard">
                              <span>🔒</span>
                              <strong>Grupo disponível após pagamento</strong>
                              <small>Assim que o pagamento for confirmado, o grupo deste roteiro será liberado.</small>
                            </div>
                          )}

                          <div className="cardFooter">
                            <div className="price">{formatarMoeda(reserva.valor_calculado)}</div>
                            <div className="actions">
                              {roteiroId && <button type="button" className="btn" onClick={() => router.push(`/roteiros/${roteiroId}`)}>Ver roteiro</button>}
                              {podePagar && <button type="button" className="btn primary" onClick={() => router.push(`/cliente/pagamento/${reserva.id}`)}>Pagar</button>}
                              {podeAvaliar && <button type="button" className="btn" onClick={() => router.push(`/cliente/avaliar/${reserva.id}`)}>Avaliar</button>}
                              {podeCancelar && <button type="button" className="btn danger" onClick={() => abrirCancelamento(reserva)}>Cancelar</button>}
                            </div>
                          </div>

                          {isCancelada(reserva) && reserva.cancelamento_motivo && (
                            <div className="meta cancelReason">
                              Motivo registrado: {reserva.cancelamento_motivo}
                              {numero(reserva.saldo_creditado) > 0 && <><br />Crédito gerado: {formatarMoeda(reserva.saldo_creditado)}</>}
                            </div>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

          <aside className="panel groupsPanel">
            <div className="panelHeader compact">
              <div>
                <h2 className="panelTitle">Grupos das experiências</h2>
                <div className="panelSub">Acesse os grupos dos roteiros pagos e confirmados.</div>
              </div>
            </div>

            <div className="panelBody">
              <button
                type="button"
                className="reservedGroupsCard"
                onClick={() => router.push('/cliente/grupos')}
                aria-label="Abrir grupos reservados"
              >
                <span className="reservedGroupsIcon">💬</span>
                <span className="reservedGroupsContent">
                  <strong>Meus grupos reservados</strong>
                  <small>
                    {gruposLiberados > 0
                      ? `${gruposLiberados} grupo(s) liberado(s) após pagamento.`
                      : 'Os grupos aparecem aqui depois da confirmação do pagamento.'}
                  </small>
                </span>
                <span className="reservedGroupsArrow">›</span>
              </button>

              <div className="groupsMiniStats">
                <div>
                  <strong>{gruposLiberados}</strong>
                  <span>Liberados</span>
                </div>
                <div>
                  <strong>{gruposPendentes}</strong>
                  <span>Aguardando pagamento</span>
                </div>
              </div>

              <p className="groupsPanelHint">
                O cliente só acessa o grupo oficial da experiência quando o pagamento estiver confirmado.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {modalReembolsoAberto && (
        <div className="overlay">
          <form className="modal" onSubmit={solicitarReembolso}>
            <div className="modalHeader"><div><h2 className="modalTitle">Solicitar reembolso</h2><p className="modalText">O reembolso será analisado pelo Admin. O PIX informado precisa estar no nome do cliente titular.</p></div><button type="button" className="closeBtn" onClick={() => setModalReembolsoAberto(false)} disabled={solicitandoReembolso}>×</button></div>
            <div className="field"><label>Valor solicitado</label><input value={reembolsoForm.valor} onChange={(event) => setReembolsoForm((prev) => ({ ...prev, valor: event.target.value }))} inputMode="decimal" disabled={solicitandoReembolso} /></div>
            <div className="field"><label>Tipo da chave PIX</label><select value={reembolsoForm.pixTipo} onChange={(event) => setReembolsoForm((prev) => ({ ...prev, pixTipo: event.target.value as ReembolsoModal['pixTipo'] }))} disabled={solicitandoReembolso}><option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">E-mail</option><option value="telefone">Telefone</option><option value="aleatoria">Chave aleatória</option></select></div>
            <div className="field"><label>Chave PIX</label><input value={reembolsoForm.pixChave} onChange={(event) => setReembolsoForm((prev) => ({ ...prev, pixChave: event.target.value }))} disabled={solicitandoReembolso} /></div>
            <div className="field"><label>Nome do titular</label><input value={reembolsoForm.titularNome} onChange={(event) => setReembolsoForm((prev) => ({ ...prev, titularNome: event.target.value }))} disabled={solicitandoReembolso} /></div>
            <div className="field"><label>CPF/CNPJ do titular, opcional</label><input value={reembolsoForm.titularDocumento} onChange={(event) => setReembolsoForm((prev) => ({ ...prev, titularDocumento: event.target.value }))} disabled={solicitandoReembolso} /></div>
            <div className="field"><label>Motivo/observação</label><textarea value={reembolsoForm.motivo} onChange={(event) => setReembolsoForm((prev) => ({ ...prev, motivo: event.target.value }))} disabled={solicitandoReembolso} /></div>
            <label className="checkField"><input type="checkbox" checked={reembolsoForm.confirmaPixTitular} onChange={(event) => setReembolsoForm((prev) => ({ ...prev, confirmaPixTitular: event.target.checked }))} disabled={solicitandoReembolso} /><span>Confirmo que a chave PIX informada está no meu nome.</span></label>
            <div className="policyBox">Saldo disponível atual: <strong>{formatarMoeda(saldoDisponivel)}</strong>.</div>
            {erroReembolso && <div className="error modalError">{erroReembolso}</div>}
            <div className="modalActions"><button type="button" className="btn" onClick={() => setModalReembolsoAberto(false)} disabled={solicitandoReembolso}>Voltar</button><button type="submit" className="btn danger" disabled={solicitandoReembolso}>{solicitandoReembolso ? 'Enviando...' : 'Enviar solicitação'}</button></div>
          </form>
        </div>
      )}

      {cancelamento && (
        <div className="overlay">
          <div className="modal">
            <div className="modalHeader"><div><h2 className="modalTitle">Cancelar reserva</h2><p className="modalText">Você está cancelando a reserva de {cancelamento.reserva.roteiro_titulo}.</p></div><button type="button" className="closeBtn" onClick={() => setCancelamento(null)} disabled={cancelando}>×</button></div>
            <div className="field"><label>Motivo principal</label><select value={cancelamento.motivoCodigo} onChange={(event) => setCancelamento((prev) => prev ? { ...prev, motivoCodigo: event.target.value } : prev)} disabled={cancelando}>{MOTIVOS_CANCELAMENTO_CLIENTE.map((motivo) => <option key={motivo.codigo} value={motivo.codigo}>{motivo.label}</option>)}</select></div>
            <div className="field"><label>Observação</label><textarea value={cancelamento.motivoDescricao} onChange={(event) => setCancelamento((prev) => prev ? { ...prev, motivoDescricao: event.target.value } : prev)} disabled={cancelando} /></div>
            <div className="policyBox">O eventual crédito será calculado conforme a política vigente de cancelamento.</div>
            <div className="modalActions"><button type="button" className="btn" onClick={() => setCancelamento(null)} disabled={cancelando}>Voltar</button><button type="button" className="btn danger" onClick={confirmarCancelamento} disabled={cancelando}>{cancelando ? 'Cancelando...' : 'Confirmar cancelamento'}</button></div>
          </div>
        </div>
      )}
    </main>
  )
}

const loadingStyles = `
  .loadingScreen { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; background: radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.16), transparent 28%), radial-gradient(circle at 90% 10%, rgba(251, 146, 60, 0.14), transparent 28%), linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%); color: #203c2e; font-weight: 900; }
  .spinner { width: 44px; height: 44px; border-radius: 999px; border: 4px solid rgba(32, 60, 46, 0.12); border-top-color: #dc2626; animation: spin 0.9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`

const styles = `
  .page { min-height: 100vh; color: #172018; background: radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.16), transparent 28%), radial-gradient(circle at 90% 10%, rgba(251, 146, 60, 0.14), transparent 28%), linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  button { font: inherit; }
  .topbar {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(255,253,247,0.92);
    border-bottom: 1px solid rgba(15,23,42,0.06);
    backdrop-filter: blur(18px);
    padding: 9px 14px;
  }

  .topbarInner {
    max-width: 1180px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) 42px;
    align-items: center;
    gap: 10px;
  }

  .topbarSpacer {
    width: 42px;
    height: 42px;
    pointer-events: none;
  }

  .brand {
    grid-column: 2;
    justify-self: center;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-width: 0;
    max-width: min(520px, calc(100vw - 120px));
    border: 0;
    background: transparent;
    padding: 0;
    text-align: center;
    cursor: pointer;
    color: #172018;
  }

  .brand img {
    width: clamp(140px, 34vw, 250px);
    height: auto;
    max-height: 58px;
    object-fit: contain;
    display: block;
    filter: drop-shadow(0 8px 18px rgba(32, 60, 46, 0.08));
  }

  .brand span {
    display: block;
    color: #7b8375;
    font-size: clamp(8px, 1.05vw, 12px);
    font-weight: 850;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .topActions {
    grid-column: 3;
    justify-self: end;
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
    justify-content: flex-end;
  }

  .profileButton {
    width: 42px;
    height: 42px;
    border-radius: 999px;
    border: 1px solid rgba(15,23,42,0.08);
    background: rgba(255,255,255,0.86);
    color: #1f3f2d;
    box-shadow: 0 10px 22px rgba(15,23,42,0.08);
    cursor: pointer;
    padding: 0;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .profileButton img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .profileButton span {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #203c2e;
    font-size: 14px;
    font-weight: 950;
    line-height: 1;
  }
  .container { max-width: 1180px; margin: 0 auto; padding: 22px 16px 56px; }
  .hero { border-radius: 34px; padding: 26px; background: linear-gradient(135deg, rgba(32, 60, 46, 0.96), rgba(64, 85, 44, 0.92)), radial-gradient(circle at 90% 10%, rgba(212, 179, 90, 0.24), transparent 38%); color: #fffdf7; box-shadow: 0 28px 70px rgba(32, 60, 46, 0.18); overflow: hidden; }
  .heroGrid { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.7fr); gap: 20px; align-items: stretch; }
  .eyebrow { color: #d4b35a; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: 0.16em; margin-bottom: 12px; }
  .hero h1 { margin: 0; font-size: clamp(38px, 5vw, 72px); line-height: 0.88; letter-spacing: -0.065em; font-weight: 950; }
  .hero h1 span { color: #d4b35a; }
  .heroText { max-width: 680px; margin: 18px 0 0; color: rgba(255, 253, 247, 0.78); font-size: 15px; line-height: 1.65; font-weight: 650; }
  .saldoCard { border-radius: 28px; padding: 22px; background: rgba(255, 253, 247, 0.12); border: 1px solid rgba(255, 253, 247, 0.18); backdrop-filter: blur(16px); display: flex; flex-direction: column; justify-content: space-between; gap: 18px; }
  .saldoLabel { color: rgba(255, 253, 247, 0.68); font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; }
  .saldoValor { margin-top: 10px; font-size: 42px; line-height: 1; font-weight: 950; letter-spacing: -0.055em; color: #fffdf7; }
  .saldoText { color: rgba(255, 253, 247, 0.72); font-size: 13px; line-height: 1.45; font-weight: 700; }
  .saldoMiniGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .saldoMini { border-radius: 18px; padding: 12px; background: rgba(255, 253, 247, 0.1); }
  .saldoMini strong { display: block; font-size: 16px; color: #fffdf7; }
  .saldoMini span { display: block; margin-top: 3px; color: rgba(255, 253, 247, 0.62); font-size: 11px; font-weight: 800; }
  .saldoAction { width: 100%; border: 1px solid rgba(255,253,247,0.24); border-radius: 999px; background: #fffdf7; color: #203c2e; padding: 12px 14px; font-size: 12px; font-weight: 950; cursor: pointer; }
  .saldoAction:disabled { opacity: 0.58; cursor: not-allowed; }
  .message, .error { margin-top: 16px; border-radius: 22px; padding: 14px 16px; font-size: 13px; font-weight: 850; }
  .message { background: rgba(22, 163, 74, 0.09); border: 1px solid rgba(22, 163, 74, 0.18); color: #166534; }
  .error { background: rgba(153, 27, 27, 0.08); border: 1px solid rgba(153, 27, 27, 0.18); color: #7f1d1d; }
  .summaryCard { margin-top: 16px; border-radius: 28px; padding: 18px; background: rgba(255,255,255,0.76); border: 1px solid rgba(32,60,46,0.08); box-shadow: 0 18px 42px rgba(32,60,46,0.08); }
  .summaryHeader { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 12px; }
  .summaryHeader span { color: #203c2e; font-size: 13px; font-weight: 950; text-transform: uppercase; letter-spacing: .08em; }
  .summaryHeader strong { color: #203c2e; font-size: 22px; font-weight: 950; letter-spacing: -.04em; }
  .summaryGrid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
  .summaryItem { border: 1px solid rgba(32,60,46,0.08); border-radius: 20px; background: rgba(255,253,247,.78); padding: 13px; text-align: left; cursor: pointer; }
  .summaryItem.active { background: #203c2e; color: #fffdf7; border-color: #203c2e; }
  .summaryItem strong { display: block; font-size: 24px; font-weight: 950; }
  .summaryItem span { display: block; margin-top: 4px; color: #64748b; font-size: 11px; font-weight: 900; }
  .summaryItem.active span { color: rgba(255,253,247,.76); }
  .contentGrid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 16px; margin-top: 18px; align-items: start; }
  .panel { border-radius: 30px; background: rgba(255, 255, 255, 0.78); border: 1px solid rgba(32, 60, 46, 0.08); box-shadow: 0 22px 52px rgba(32, 60, 46, 0.08); overflow: hidden; }
  .panelHeader { padding: 20px 20px 14px; display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; border-bottom: 1px solid rgba(32, 60, 46, 0.07); }
  .panelTitle { margin: 0; color: #203c2e; font-size: 22px; line-height: 1; font-weight: 950; letter-spacing: -0.045em; }
  .panelSub { margin-top: 6px; color: #64748b; font-size: 12px; font-weight: 750; line-height: 1.4; }
  .panelBody { padding: 16px; }
  .reservasList, .movList { display: flex; flex-direction: column; gap: 12px; }
  .reservaCard { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 16px; border-radius: 24px; padding: 12px; background: rgba(255,253,247,0.72); border: 1px solid rgba(32,60,46,0.07); }
  .thumb { width: 100%; min-height: 132px; border-radius: 20px; background: linear-gradient(135deg, rgba(32,60,46,0.95), rgba(64,85,44,0.82)); color: #fffdf7; font-weight: 950; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .thumb img { width: 100%; height: 100%; object-fit: cover; }
  .cardTop { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .roteiroTitle { margin: 0; color: #172018; font-size: 20px; line-height: 1.05; font-weight: 950; letter-spacing: -0.04em; overflow-wrap: anywhere; }
  .meta { margin-top: 8px; color: #64748b; font-size: 13px; line-height: 1.45; font-weight: 700; overflow-wrap: anywhere; }
  .badges { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; }
  .badge { border-radius: 999px; padding: 7px 10px; font-size: 11px; font-weight: 950; white-space: nowrap; }
  .badge.confirmada, .badge.pago { background: rgba(22,163,74,0.1); color: #166534; }
  .badge.pendente { background: rgba(217,119,6,0.1); color: #92400e; }
  .badge.cancelada { background: rgba(153,27,27,0.09); color: #7f1d1d; }
  .badge.realizada { background: rgba(37,99,235,0.09); color: #1d4ed8; }
  .groupAccessCard, .groupLockedCard { width: 100%; margin-top: 14px; border-radius: 20px; padding: 13px; display: grid; grid-template-columns: 38px minmax(0, 1fr); column-gap: 10px; align-items: center; text-align: left; }
  .groupAccessCard { border: 1px solid rgba(22,163,74,.18); background: rgba(236,253,245,.86); color: #14532d; cursor: pointer; }
  .groupAccessCard:disabled { opacity: .7; cursor: wait; }
  .groupLockedCard { border: 1px solid rgba(217,119,6,.16); background: rgba(254,243,199,.72); color: #92400e; }
  .groupAccessCard > span, .groupLockedCard > span { grid-row: 1 / span 2; width: 38px; height: 38px; border-radius: 14px; background: rgba(255,255,255,.72); display: flex; align-items: center; justify-content: center; }
  .groupAccessCard strong, .groupLockedCard strong { font-size: 13px; font-weight: 950; }
  .groupAccessCard small, .groupLockedCard small { margin-top: 3px; color: inherit; opacity: .72; font-size: 11px; font-weight: 800; }
  .groupsPanel { position: sticky; top: 88px; }
  .reservedGroupsCard { width: 100%; border: 1px solid rgba(32,60,46,.10); border-radius: 24px; background: radial-gradient(circle at 100% 0%, rgba(132,204,22,.14), transparent 38%), rgba(255,253,247,.84); padding: 16px; display: grid; grid-template-columns: 46px minmax(0,1fr) 22px; gap: 12px; align-items: center; text-align: left; color: #172018; cursor: pointer; box-shadow: 0 14px 34px rgba(32,60,46,.07); transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
  .reservedGroupsCard:hover { transform: translateY(-2px); border-color: rgba(32,60,46,.18); box-shadow: 0 20px 42px rgba(32,60,46,.11); }
  .reservedGroupsIcon { width: 46px; height: 46px; border-radius: 18px; background: #203c2e; color: #fffdf7; display: flex; align-items: center; justify-content: center; font-size: 21px; }
  .reservedGroupsContent { display: grid; gap: 4px; min-width: 0; }
  .reservedGroupsContent strong { color: #203c2e; font-size: 15px; line-height: 1.15; font-weight: 950; letter-spacing: -.03em; }
  .reservedGroupsContent small { color: #64748b; font-size: 12px; line-height: 1.35; font-weight: 780; }
  .reservedGroupsArrow { color: #203c2e; font-size: 28px; line-height: 1; font-weight: 800; }
  .groupsMiniStats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
  .groupsMiniStats div { border-radius: 20px; background: rgba(32,60,46,.055); border: 1px solid rgba(32,60,46,.07); padding: 12px; }
  .groupsMiniStats strong { display: block; color: #203c2e; font-size: 22px; line-height: 1; font-weight: 950; }
  .groupsMiniStats span { display: block; margin-top: 5px; color: #64748b; font-size: 11px; line-height: 1.25; font-weight: 850; }
  .groupsPanelHint { margin: 12px 0 0; border-radius: 18px; background: rgba(212,179,90,.10); border: 1px solid rgba(212,179,90,.18); color: #5f4b1e; padding: 12px; font-size: 12px; line-height: 1.45; font-weight: 800; }

  .cardFooter { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 16px; }
  .price { color: #203c2e; font-size: 22px; font-weight: 950; letter-spacing: -0.04em; white-space: nowrap; }
  .actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
  .btn { border: 1px solid rgba(32,60,46,0.12); border-radius: 999px; padding: 10px 13px; background: rgba(255,255,255,0.82); color: #203c2e; font-size: 12px; font-weight: 950; cursor: pointer; }
  .btn.primary { border-color: #203c2e; background: #203c2e; color: #fffdf7; }
  .btn.danger { border-color: rgba(153,27,27,.16); background: rgba(153,27,27,.07); color: #7f1d1d; }
  .btn:disabled { opacity: .58; cursor: not-allowed; }
  .empty { border-radius: 22px; padding: 28px; text-align: center; color: #64748b; font-size: 14px; font-weight: 760; background: rgba(255,253,247,.72); border: 1px dashed rgba(32,60,46,.18); }
  .movItem { border-radius: 20px; padding: 13px; background: rgba(255,253,247,.72); border: 1px solid rgba(32,60,46,.07); }
  .movTop { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
  .movTitle { color: #172018; font-size: 13px; font-weight: 900; line-height: 1.25; }
  .movValor { color: #203c2e; font-size: 13px; font-weight: 950; white-space: nowrap; }
  .movValor.negativo { color: #7f1d1d; }
  .movMeta { margin-top: 6px; color: #64748b; font-size: 11px; font-weight: 720; line-height: 1.4; }
  .overlay { position: fixed; inset: 0; z-index: 80; display: flex; justify-content: center; align-items: center; padding: 18px; background: rgba(8,13,7,.52); backdrop-filter: blur(10px); }
  .modal { width: min(560px, 100%); max-height: calc(100dvh - 28px); overflow: auto; border-radius: 30px; background: radial-gradient(circle at 10% 0%, rgba(132,204,22,.16), transparent 30%), linear-gradient(180deg,#fffdf7,#f3f5ea); border: 1px solid rgba(255,255,255,.68); box-shadow: 0 34px 90px rgba(0,0,0,.28); padding: 20px; }
  .modalHeader { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; }
  .modalTitle { margin: 0; color: #203c2e; font-size: 28px; line-height: .95; font-weight: 950; letter-spacing: -.055em; }
  .modalText { margin: 10px 0 0; color: #64748b; font-size: 13px; line-height: 1.45; font-weight: 700; }
  .closeBtn { width: 38px; height: 38px; border-radius: 999px; border: 1px solid rgba(32,60,46,.12); background: rgba(255,255,255,.74); color: #203c2e; font-size: 24px; line-height: 1; cursor: pointer; }
  .field { margin-top: 16px; }
  .field label { display: block; color: #203c2e; font-size: 12px; font-weight: 950; margin-bottom: 7px; }
  .field select, .field input, .field textarea { width: 100%; border-radius: 18px; border: 1px solid rgba(32,60,46,.12); background: rgba(255,255,255,.78); color: #172018; padding: 13px 14px; font: inherit; font-size: 13px; font-weight: 700; outline: none; }
  .field textarea { min-height: 100px; resize: vertical; }
  .checkField { margin-top: 16px; display: flex; align-items: flex-start; gap: 10px; color: #334155; font-size: 12px; line-height: 1.45; font-weight: 820; }
  .policyBox { margin-top: 16px; border-radius: 18px; padding: 14px; background: rgba(212,179,90,.12); border: 1px solid rgba(212,179,90,.22); color: #5f4b1e; font-size: 12px; line-height: 1.45; font-weight: 760; }
  .modalActions { margin-top: 18px; display: flex; justify-content: flex-end; gap: 10px; }
  .modalError { margin-top: 12px; }
  .cancelReason { margin-top: 10px; }
  @media (max-width: 980px) { .heroGrid, .contentGrid { grid-template-columns: 1fr; } .summaryGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .groupsPanel { position: static; } }
  @media (max-width: 680px) { .container { padding: 14px 12px 40px; } .topbar { padding: 7px 10px; } .topbarInner { grid-template-columns: 36px minmax(0, 1fr) 36px; gap: 8px; align-items: center; } .topbarSpacer { width: 36px; height: 36px; } .brand { gap: 4px; min-width: 0; max-width: calc(100vw - 92px); overflow: hidden; } .brand img { width: clamp(134px, 46vw, 210px); height: auto; max-height: 50px; object-fit: contain; } .brand span { font-size: 7.5px; letter-spacing: 0.12em; max-width: calc(100vw - 112px); overflow: hidden; text-overflow: ellipsis; } .profileButton { width: 36px; height: 36px; box-shadow: none; } .hero { border-radius: 28px; padding: 22px; } .hero h1 { font-size: 40px; } .saldoValor { font-size: 36px; } .summaryGrid { grid-template-columns: 1fr 1fr; } .reservaCard { grid-template-columns: 1fr; } .thumb { min-height: 190px; } .cardTop, .cardFooter { flex-direction: column; align-items: flex-start; } .actions, .btn { width: 100%; } .modalActions { flex-direction: column-reverse; } .modalActions .btn { width: 100%; } .overlay { align-items: flex-end; padding: 10px; } .modal { border-radius: 26px; max-height: calc(100dvh - 20px); } }
`
