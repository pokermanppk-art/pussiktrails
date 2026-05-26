'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type UsuarioLocal = {
  id?: string | null
  user_id?: string | null
  usuario_id?: string | null
  cliente_id?: string | null
  nome?: string | null
  name?: string | null
  email?: string | null
  tipo?: string | null
}

type Reserva = Record<string, any>
type Roteiro = Record<string, any>
type Guia = Record<string, any>

type ReservaCompleta = Reserva & {
  roteiro?: Roteiro | null
  guia?: Guia | null
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

type MovimentacaoSaldo = Record<string, any>

type CancelamentoModal = {
  reserva: ReservaCompleta
  motivoCodigo: string
  motivoDescricao: string
}

const MOTIVOS_CANCELAMENTO_CLIENTE = [
  {
    codigo: 'mudanca_de_planos',
    label: 'Mudança de planos',
  },
  {
    codigo: 'problema_pessoal',
    label: 'Problema pessoal',
  },
  {
    codigo: 'clima_ou_deslocamento',
    label: 'Clima, deslocamento ou logística',
  },
  {
    codigo: 'saude',
    label: 'Saúde',
  },
  {
    codigo: 'outro',
    label: 'Outro motivo',
  },
]

function extrairUsuarioId(usuario: UsuarioLocal | null) {
  return String(
    usuario?.id ||
      usuario?.user_id ||
      usuario?.usuario_id ||
      usuario?.cliente_id ||
      ''
  ).trim()
}

function normalizar(valor: unknown) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function numero(valor: unknown) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0

  const texto = String(valor || '')
    .replace(/R\$/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  const n = Number(texto)
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

  const texto = String(valor)

  if (/^\d{2}:\d{2}/.test(texto)) return texto.slice(0, 5)

  const data = new Date(texto)

  if (Number.isNaN(data.getTime())) return ''

  return data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function tituloRoteiro(roteiro?: Roteiro | null) {
  return String(roteiro?.titulo || roteiro?.nome || 'Roteiro PrussikTrails')
}

function fotoRoteiro(roteiro?: Roteiro | null) {
  return String(
    roteiro?.foto_url ||
      roteiro?.foto_capa ||
      roteiro?.imagem_url ||
      roteiro?.imagem ||
      ''
  )
}

function guiaIdRoteiro(roteiro?: Roteiro | null) {
  return String(
    roteiro?.id_guia ||
      roteiro?.guia_id ||
      roteiro?.user_id ||
      roteiro?.usuario_id ||
      ''
  ).trim()
}

function guiaIdReserva(reserva?: Reserva | null) {
  return String(
    reserva?.guia_id ||
      reserva?.id_guia ||
      reserva?.guiaId ||
      reserva?.idGuia ||
      ''
  ).trim()
}

function roteiroIdReserva(reserva?: Reserva | null) {
  return String(
    reserva?.roteiro_id ||
      reserva?.id_roteiro ||
      reserva?.roteiroId ||
      reserva?.idRoteiro ||
      ''
  ).trim()
}

function dataRoteiro(roteiro?: Roteiro | null) {
  return (
    roteiro?.data_inicio ||
    roteiro?.data_roteiro ||
    roteiro?.data_saida ||
    roteiro?.data_trilha ||
    roteiro?.data ||
    roteiro?.embarque_data_hora ||
    roteiro?.created_at ||
    null
  )
}

function horaRoteiro(roteiro?: Roteiro | null) {
  return (
    roteiro?.hora_inicio ||
    roteiro?.hora_roteiro ||
    roteiro?.hora_saida ||
    roteiro?.hora ||
    roteiro?.embarque_data_hora ||
    null
  )
}

function localRoteiro(roteiro?: Roteiro | null) {
  return String(
    roteiro?.local ||
      roteiro?.localizacao ||
      roteiro?.local_encontro ||
      roteiro?.ponto_encontro ||
      'Local a confirmar'
  )
}

function isPago(reserva: Reserva) {
  const pagamento = normalizar(reserva.pagamento_status)
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

  return status === 'realizada' || status === 'realizado' || status === 'finalizada'
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
  const nome = String(usuario?.nome || usuario?.name || usuario?.email || '')
    .trim()

  return nome.split(' ')[0] || 'aventureiro'
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
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState<'todas' | 'ativas' | 'pendentes' | 'canceladas'>('todas')
  const [cancelamento, setCancelamento] = useState<CancelamentoModal | null>(null)
  const [cancelando, setCancelando] = useState(false)

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

      if (!usuario || !usuarioId || usuario.tipo !== 'cliente') {
        router.replace('/login')
        return
      }

      const usuarioNormalizado = {
        ...usuario,
        id: usuarioId,
      }

      setUser(usuarioNormalizado)
      await Promise.all([
        carregarReservas(usuarioId),
        carregarSaldo(usuarioId),
      ])
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

      await Promise.all([
        carregarReservas(clienteId),
        carregarSaldo(clienteId),
      ])

      setMensagem('Reservas atualizadas.')
    } catch (error) {
      console.error('Erro ao atualizar:', error)
      setErro('Não foi possível atualizar agora.')
    } finally {
      setAtualizando(false)
    }
  }

  async function carregarSaldo(clienteId: string) {
    const resposta = await fetch(`/api/cliente/saldo?clienteId=${encodeURIComponent(clienteId)}`)
    const json = await resposta.json().catch(() => null)

    if (!resposta.ok || !json?.sucesso) {
      console.warn('Saldo indisponível:', json?.erro || resposta.status)
      setSaldo({ cliente_id: clienteId, saldo_disponivel: 0, moeda: 'BRL' })
      setMovimentacoes([])
      return
    }

    setSaldo(json.saldo || { cliente_id: clienteId, saldo_disponivel: 0, moeda: 'BRL' })
    setMovimentacoes(Array.isArray(json.movimentacoes) ? json.movimentacoes : [])
  }

  async function carregarReservas(clienteId: string) {
    const { data: reservasBase, error: reservasError } = await supabase
      .from('reservas')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })

    if (reservasError) throw reservasError

    const listaReservas = (reservasBase || []) as Reserva[]
    const roteiroIds = Array.from(
      new Set(listaReservas.map(roteiroIdReserva).filter(Boolean))
    )

    let roteiros: Roteiro[] = []

    if (roteiroIds.length > 0) {
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .in('id', roteiroIds)

      if (!error && data) {
        roteiros = data as Roteiro[]
      }
    }

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
      const { data } = await supabase
        .from('users')
        .select('*')
        .in('id', guiaIds)

      if (data) {
        guias = data as Guia[]
      }
    }

    const completas = listaReservas.map((reserva) => {
      const roteiro =
        roteiros.find((item) => String(item.id) === roteiroIdReserva(reserva)) || null

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
        roteiro_titulo: tituloRoteiro(roteiro),
        roteiro_foto: fotoRoteiro(roteiro),
        guia_nome: String(guia?.nome || guia?.name || guia?.email || 'Guia PrussikTrails'),
        valor_calculado: valorBase,
      } as ReservaCompleta
    })

    setReservas(completas)
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

    const motivoSelecionado = MOTIVOS_CANCELAMENTO_CLIENTE.find(
      (item) => item.codigo === cancelamento.motivoCodigo
    )

    const motivoTexto = [
      motivoSelecionado?.label || 'Cancelamento pelo cliente',
      cancelamento.motivoDescricao,
    ]
      .filter(Boolean)
      .join(' — ')
      .trim()

    if (!motivoTexto) {
      setErro('Informe o motivo do cancelamento.')
      return
    }

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

      if (!resposta.ok || !json?.sucesso) {
        throw new Error(json?.erro || 'Não foi possível cancelar a reserva.')
      }

      const credito = numero(json.saldoCreditado)

      setMensagem(
        credito > 0
          ? `Reserva cancelada. ${formatarMoeda(credito)} foram adicionados ao seu Saldo de Jornada.`
          : 'Reserva cancelada. Esta reserva não gerou saldo automático conforme a política vigente.'
      )

      setCancelamento(null)
      await Promise.all([
        carregarReservas(user.id),
        carregarSaldo(user.id),
      ])
    } catch (error) {
      console.error('Erro ao cancelar reserva:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao cancelar reserva.')
    } finally {
      setCancelando(false)
    }
  }

  const saldoDisponivel = numero(saldo?.saldo_disponivel)
  const saldoUtilizado = numero(saldo?.saldo_utilizado)
  const saldoReservado = numero(saldo?.saldo_reservado)

  const stats = useMemo(() => {
    return reservas.reduce(
      (acc, reserva) => {
        acc.total += 1
        acc.valor += reserva.valor_calculado

        if (isPago(reserva) && !isCancelada(reserva)) acc.confirmadas += 1
        if (!isPago(reserva) && !isCancelada(reserva)) acc.pendentes += 1
        if (isCancelada(reserva)) acc.canceladas += 1

        return acc
      },
      {
        total: 0,
        confirmadas: 0,
        pendentes: 0,
        canceladas: 0,
        valor: 0,
      }
    )
  }, [reservas])

  const reservasFiltradas = useMemo(() => {
    if (filtro === 'ativas') {
      return reservas.filter((reserva) => !isCancelada(reserva))
    }

    if (filtro === 'pendentes') {
      return reservas.filter((reserva) => !isPago(reserva) && !isCancelada(reserva))
    }

    if (filtro === 'canceladas') {
      return reservas.filter(isCancelada)
    }

    return reservas
  }, [reservas, filtro])

  if (carregando) {
    return (
      <main className="loadingScreen">
        <div className="spinner" />
        <p>Carregando suas jornadas...</p>
        <style jsx>{`
          .loadingScreen {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 14px;
            background:
              radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.16), transparent 28%),
              radial-gradient(circle at 90% 10%, rgba(251, 146, 60, 0.14), transparent 28%),
              linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
            color: #203c2e;
            font-weight: 900;
          }

          .spinner {
            width: 44px;
            height: 44px;
            border-radius: 999px;
            border: 4px solid rgba(32, 60, 46, 0.12);
            border-top-color: #dc2626;
            animation: spin 0.9s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </main>
    )
  }

  return (
    <main className="page">
      <style jsx>{`
        .page {
          min-height: 100vh;
          color: #172018;
          background:
            radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.16), transparent 28%),
            radial-gradient(circle at 90% 10%, rgba(251, 146, 60, 0.14), transparent 28%),
            linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 30;
          padding: 9px 14px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          background: rgba(255, 253, 247, 0.82);
          backdrop-filter: blur(18px);
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
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
          text-align: left;
          padding: 0;
        }

        .brand img {
          width: 34px;
          height: 34px;
          object-fit: contain;
          flex: 0 0 auto;
        }

        .brandTitle {
          font-family: Georgia, 'Times New Roman', serif;
          color: #203c2e;
          font-size: clamp(25px, 3.5vw, 38px);
          line-height: 0.9;
          font-weight: 700;
          letter-spacing: -0.055em;
          white-space: nowrap;
        }

        .brandSub {
          margin-top: 3px;
          color: #7b8372;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .headerActions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .iconBtn {
          min-width: 40px;
          height: 40px;
          padding: 0 14px;
          border: 1px solid rgba(32, 60, 46, 0.12);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.68);
          color: #203c2e;
          font-size: 13px;
          font-weight: 950;
          cursor: pointer;
        }

        .container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 22px 16px 56px;
        }

        .hero {
          border-radius: 34px;
          padding: 26px;
          background:
            linear-gradient(135deg, rgba(32, 60, 46, 0.96), rgba(64, 85, 44, 0.92)),
            radial-gradient(circle at 90% 10%, rgba(212, 179, 90, 0.24), transparent 38%);
          color: #fffdf7;
          box-shadow: 0 28px 70px rgba(32, 60, 46, 0.18);
          overflow: hidden;
        }

        .heroGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.7fr);
          gap: 20px;
          align-items: stretch;
        }

        .eyebrow {
          color: #d4b35a;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          margin-bottom: 12px;
        }

        .hero h1 {
          margin: 0;
          font-size: clamp(38px, 5vw, 72px);
          line-height: 0.88;
          letter-spacing: -0.065em;
          font-weight: 950;
        }

        .hero h1 span {
          color: #d4b35a;
        }

        .heroText {
          max-width: 680px;
          margin: 18px 0 0;
          color: rgba(255, 253, 247, 0.78);
          font-size: 15px;
          line-height: 1.65;
          font-weight: 650;
        }

        .saldoCard {
          border-radius: 28px;
          padding: 22px;
          background: rgba(255, 253, 247, 0.12);
          border: 1px solid rgba(255, 253, 247, 0.18);
          backdrop-filter: blur(16px);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 18px;
        }

        .saldoLabel {
          color: rgba(255, 253, 247, 0.68);
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .saldoValor {
          margin-top: 10px;
          font-size: 42px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.055em;
          color: #fffdf7;
        }

        .saldoText {
          color: rgba(255, 253, 247, 0.72);
          font-size: 13px;
          line-height: 1.45;
          font-weight: 700;
        }

        .saldoMiniGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .saldoMini {
          border-radius: 18px;
          padding: 12px;
          background: rgba(255, 253, 247, 0.1);
        }

        .saldoMini strong {
          display: block;
          font-size: 16px;
          color: #fffdf7;
        }

        .saldoMini span {
          display: block;
          margin-top: 3px;
          color: rgba(255, 253, 247, 0.62);
          font-size: 11px;
          font-weight: 800;
        }

        .message,
        .error {
          margin-top: 16px;
          border-radius: 22px;
          padding: 14px 16px;
          font-size: 13px;
          font-weight: 850;
        }

        .message {
          background: rgba(22, 163, 74, 0.09);
          border: 1px solid rgba(22, 163, 74, 0.18);
          color: #166534;
        }

        .error {
          background: rgba(153, 27, 27, 0.08);
          border: 1px solid rgba(153, 27, 27, 0.18);
          color: #7f1d1d;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .statCard {
          border-radius: 24px;
          padding: 18px;
          background: rgba(255, 255, 255, 0.74);
          border: 1px solid rgba(32, 60, 46, 0.08);
          box-shadow: 0 18px 42px rgba(32, 60, 46, 0.08);
        }

        .statValue {
          font-size: 30px;
          font-weight: 950;
          color: #203c2e;
          letter-spacing: -0.05em;
        }

        .statLabel {
          margin-top: 5px;
          color: #64748b;
          font-size: 12px;
          font-weight: 850;
        }

        .contentGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 16px;
          margin-top: 18px;
          align-items: start;
        }

        .panel {
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(32, 60, 46, 0.08);
          box-shadow: 0 22px 52px rgba(32, 60, 46, 0.08);
          overflow: hidden;
        }

        .panelHeader {
          padding: 20px 20px 14px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          border-bottom: 1px solid rgba(32, 60, 46, 0.07);
        }

        .panelTitle {
          margin: 0;
          color: #203c2e;
          font-size: 22px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.045em;
        }

        .panelSub {
          margin-top: 6px;
          color: #64748b;
          font-size: 12px;
          font-weight: 750;
          line-height: 1.4;
        }

        .tabs {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .tab {
          border: 1px solid rgba(32, 60, 46, 0.1);
          background: rgba(255, 253, 247, 0.72);
          color: #40552c;
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
        }

        .tab.active {
          background: #203c2e;
          color: #fffdf7;
          border-color: #203c2e;
        }

        .panelBody {
          padding: 16px;
        }

        .reservasList {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .reservaCard {
          display: grid;
          grid-template-columns: 150px minmax(0, 1fr);
          gap: 16px;
          border-radius: 24px;
          padding: 12px;
          background: rgba(255, 253, 247, 0.72);
          border: 1px solid rgba(32, 60, 46, 0.07);
          transition: 0.18s ease;
        }

        .reservaCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 30px rgba(32, 60, 46, 0.09);
        }

        .thumb {
          width: 100%;
          min-height: 132px;
          border-radius: 20px;
          background:
            linear-gradient(135deg, rgba(32, 60, 46, 0.95), rgba(64, 85, 44, 0.82));
          color: #fffdf7;
          font-weight: 950;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .roteiroTitle {
          margin: 0;
          color: #172018;
          font-size: 20px;
          line-height: 1.05;
          font-weight: 950;
          letter-spacing: -0.04em;
          overflow-wrap: anywhere;
        }

        .meta {
          margin-top: 8px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.45;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .badges {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 10px;
        }

        .badge {
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
        }

        .badge.confirmada,
        .badge.pago {
          background: rgba(22, 163, 74, 0.1);
          color: #166534;
        }

        .badge.pendente {
          background: rgba(217, 119, 6, 0.1);
          color: #92400e;
        }

        .badge.cancelada {
          background: rgba(153, 27, 27, 0.09);
          color: #7f1d1d;
        }

        .badge.realizada {
          background: rgba(37, 99, 235, 0.09);
          color: #1d4ed8;
        }

        .cardFooter {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
        }

        .price {
          color: #203c2e;
          font-size: 22px;
          font-weight: 950;
          letter-spacing: -0.04em;
          white-space: nowrap;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
        }

        .btn {
          border: 1px solid rgba(32, 60, 46, 0.12);
          border-radius: 999px;
          padding: 10px 13px;
          background: rgba(255, 255, 255, 0.82);
          color: #203c2e;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
        }

        .btn.primary {
          border-color: #203c2e;
          background: #203c2e;
          color: #fffdf7;
        }

        .btn.danger {
          border-color: rgba(153, 27, 27, 0.16);
          background: rgba(153, 27, 27, 0.07);
          color: #7f1d1d;
        }

        .btn:disabled {
          opacity: 0.58;
          cursor: not-allowed;
        }

        .empty {
          border-radius: 22px;
          padding: 28px;
          text-align: center;
          color: #64748b;
          font-size: 14px;
          font-weight: 760;
          background: rgba(255, 253, 247, 0.72);
          border: 1px dashed rgba(32, 60, 46, 0.18);
        }

        .movList {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .movItem {
          border-radius: 20px;
          padding: 13px;
          background: rgba(255, 253, 247, 0.72);
          border: 1px solid rgba(32, 60, 46, 0.07);
        }

        .movTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
        }

        .movTitle {
          color: #172018;
          font-size: 13px;
          font-weight: 900;
          line-height: 1.25;
        }

        .movValor {
          color: #203c2e;
          font-size: 13px;
          font-weight: 950;
          white-space: nowrap;
        }

        .movValor.negativo {
          color: #7f1d1d;
        }

        .movMeta {
          margin-top: 6px;
          color: #64748b;
          font-size: 11px;
          font-weight: 720;
          line-height: 1.4;
        }

        .overlay {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 18px;
          background: rgba(8, 13, 7, 0.52);
          backdrop-filter: blur(10px);
        }

        .modal {
          width: min(560px, 100%);
          border-radius: 30px;
          background:
            radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.16), transparent 30%),
            linear-gradient(180deg, #fffdf7, #f3f5ea);
          border: 1px solid rgba(255, 255, 255, 0.68);
          box-shadow: 0 34px 90px rgba(0, 0, 0, 0.28);
          padding: 20px;
        }

        .modalHeader {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
        }

        .modalTitle {
          margin: 0;
          color: #203c2e;
          font-size: 28px;
          line-height: 0.95;
          font-weight: 950;
          letter-spacing: -0.055em;
        }

        .modalText {
          margin: 10px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.45;
          font-weight: 700;
        }

        .closeBtn {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          border: 1px solid rgba(32, 60, 46, 0.12);
          background: rgba(255, 255, 255, 0.74);
          color: #203c2e;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
        }

        .field {
          margin-top: 16px;
        }

        .field label {
          display: block;
          color: #203c2e;
          font-size: 12px;
          font-weight: 950;
          margin-bottom: 7px;
        }

        .field select,
        .field textarea {
          width: 100%;
          border-radius: 18px;
          border: 1px solid rgba(32, 60, 46, 0.12);
          background: rgba(255, 255, 255, 0.78);
          color: #172018;
          padding: 13px 14px;
          font: inherit;
          font-size: 13px;
          font-weight: 700;
          outline: none;
        }

        .field textarea {
          min-height: 100px;
          resize: vertical;
        }

        .policyBox {
          margin-top: 16px;
          border-radius: 18px;
          padding: 14px;
          background: rgba(212, 179, 90, 0.12);
          border: 1px solid rgba(212, 179, 90, 0.22);
          color: #5f4b1e;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 760;
        }

        .modalActions {
          margin-top: 18px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        @media (max-width: 980px) {
          .heroGrid,
          .contentGrid {
            grid-template-columns: 1fr;
          }

          .statsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 680px) {
          .container {
            padding: 14px 12px 40px;
          }

          .brand img {
            width: 30px;
            height: 30px;
          }

          .brandTitle {
            font-size: 24px;
          }

          .brandSub {
            display: none;
          }

          .hideMobile {
            display: none;
          }

          .hero {
            border-radius: 28px;
            padding: 22px;
          }

          .hero h1 {
            font-size: 40px;
          }

          .saldoValor {
            font-size: 36px;
          }

          .statsGrid {
            grid-template-columns: 1fr 1fr;
          }

          .statCard {
            padding: 14px;
          }

          .reservaCard {
            grid-template-columns: 1fr;
          }

          .thumb {
            min-height: 190px;
          }

          .cardTop,
          .cardFooter {
            flex-direction: column;
            align-items: flex-start;
          }

          .actions,
          .btn {
            width: 100%;
          }

          .modalActions {
            flex-direction: column-reverse;
          }

          .modalActions .btn {
            width: 100%;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <button
            type="button"
            className="brand"
            onClick={() => router.push('/cliente/dashboard')}
            aria-label="Voltar para dashboard do cliente"
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />
            <div>
              <div className="brandTitle">PrussikTrails</div>
              <div className="brandSub">Suas reservas</div>
            </div>
          </button>

          <div className="headerActions">
            <button
              type="button"
              className="iconBtn hideMobile"
              onClick={() => router.push('/roteiros')}
            >
              Explorar
            </button>

            <button
              type="button"
              className="iconBtn"
              onClick={() => router.push('/cliente/perfil')}
              title="Perfil"
            >
              👤
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

              <p className="heroText">
                Acompanhe pagamentos, confirmações, cancelamentos e o seu Saldo de Jornada para usar em novas experiências PrussikTrails.
              </p>
            </div>

            <aside className="saldoCard">
              <div>
                <div className="saldoLabel">Saldo de Jornada</div>
                <div className="saldoValor">{formatarMoeda(saldoDisponivel)}</div>
                <p className="saldoText">
                  {saldoDisponivel > 0
                    ? 'Você pode usar este saldo em uma nova jornada quando a função for liberada no checkout.'
                    : 'Se algum roteiro for cancelado com direito a crédito, o saldo aparecerá aqui.'}
                </p>
              </div>

              <div className="saldoMiniGrid">
                <div className="saldoMini">
                  <strong>{formatarMoeda(saldoUtilizado)}</strong>
                  <span>Já utilizado</span>
                </div>
                <div className="saldoMini">
                  <strong>{formatarMoeda(saldoReservado)}</strong>
                  <span>Reservado</span>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {mensagem && <div className="message">{mensagem}</div>}
        {erro && <div className="error">{erro}</div>}

        <section className="statsGrid">
          <article className="statCard">
            <div className="statValue">{stats.total}</div>
            <div className="statLabel">Reservas totais</div>
          </article>

          <article className="statCard">
            <div className="statValue">{stats.confirmadas}</div>
            <div className="statLabel">Confirmadas</div>
          </article>

          <article className="statCard">
            <div className="statValue">{stats.pendentes}</div>
            <div className="statLabel">Pendentes</div>
          </article>

          <article className="statCard">
            <div className="statValue">{stats.canceladas}</div>
            <div className="statLabel">Canceladas</div>
          </article>
        </section>

        <div className="contentGrid">
          <section className="panel">
            <div className="panelHeader">
              <div>
                <h2 className="panelTitle">Roteiros reservados</h2>
                <div className="panelSub">Acompanhe pagamento, status e cancelamentos.</div>
              </div>

              <div className="tabs">
                {(['todas', 'ativas', 'pendentes', 'canceladas'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`tab ${filtro === item ? 'active' : ''}`}
                    onClick={() => setFiltro(item)}
                  >
                    {item === 'todas'
                      ? 'Todas'
                      : item === 'ativas'
                        ? 'Ativas'
                        : item === 'pendentes'
                          ? 'Pendentes'
                          : 'Canceladas'}
                  </button>
                ))}
              </div>
            </div>

            <div className="panelBody">
              {reservasFiltradas.length === 0 ? (
                <div className="empty">
                  Nenhuma reserva neste filtro. Que tal escolher uma nova trilha?
                </div>
              ) : (
                <div className="reservasList">
                  {reservasFiltradas.map((reserva) => {
                    const status = badgeReserva(reserva)
                    const pagamento = badgePagamento(reserva)
                    const roteiroId = roteiroIdReserva(reserva)
                    const podeCancelar = !isCancelada(reserva) && !isRealizada(reserva)
                    const podePagar = !isPago(reserva) && !isCancelada(reserva)
                    const podeAvaliar = isPago(reserva) && !isCancelada(reserva)

                    return (
                      <article className="reservaCard" key={reserva.id}>
                        <div className="thumb">
                          {reserva.roteiro_foto ? (
                            <img src={reserva.roteiro_foto} alt={reserva.roteiro_titulo} />
                          ) : (
                            'RT'
                          )}
                        </div>

                        <div>
                          <div className="cardTop">
                            <div>
                              <h3 className="roteiroTitle">{reserva.roteiro_titulo}</h3>
                              <div className="meta">
                                {formatarDataLonga(dataRoteiro(reserva.roteiro))}
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

                          <div className="cardFooter">
                            <div className="price">{formatarMoeda(reserva.valor_calculado)}</div>

                            <div className="actions">
                              {roteiroId && (
                                <button
                                  type="button"
                                  className="btn"
                                  onClick={() => router.push(`/roteiros/${roteiroId}`)}
                                >
                                  Ver roteiro
                                </button>
                              )}

                              {podePagar && (
                                <button
                                  type="button"
                                  className="btn primary"
                                  onClick={() => router.push(`/cliente/pagamento/${reserva.id}`)}
                                >
                                  Pagar
                                </button>
                              )}

                              {podeAvaliar && (
                                <button
                                  type="button"
                                  className="btn"
                                  onClick={() => router.push(`/cliente/avaliar/${reserva.id}`)}
                                >
                                  Avaliar
                                </button>
                              )}

                              {podeCancelar && (
                                <button
                                  type="button"
                                  className="btn danger"
                                  onClick={() => abrirCancelamento(reserva)}
                                >
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </div>

                          {isCancelada(reserva) && reserva.cancelamento_motivo && (
                            <div className="meta" style={{ marginTop: 10 }}>
                              Motivo registrado: {reserva.cancelamento_motivo}
                              {numero(reserva.saldo_creditado) > 0 && (
                                <>
                                  <br />
                                  Crédito gerado: {formatarMoeda(reserva.saldo_creditado)}
                                </>
                              )}
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

          <aside className="panel">
            <div className="panelHeader">
              <div>
                <h2 className="panelTitle">Extrato do saldo</h2>
                <div className="panelSub">Movimentações recentes da sua carteira.</div>
              </div>

              <button
                type="button"
                className="btn"
                onClick={atualizar}
                disabled={atualizando}
              >
                {atualizando ? '...' : 'Atualizar'}
              </button>
            </div>

            <div className="panelBody">
              {movimentacoes.length === 0 ? (
                <div className="empty">Nenhuma movimentação de saldo ainda.</div>
              ) : (
                <div className="movList">
                  {movimentacoes.slice(0, 8).map((mov) => {
                    const valor = numero(mov.valor)
                    const negativo = valor < 0

                    return (
                      <article className="movItem" key={mov.id || `${mov.created_at}-${mov.valor}`}>
                        <div className="movTop">
                          <div className="movTitle">{resumoMovimentacao(mov)}</div>
                          <div className={`movValor ${negativo ? 'negativo' : ''}`}>
                            {negativo ? '-' : '+'}{formatarMoeda(Math.abs(valor))}
                          </div>
                        </div>

                        <div className="movMeta">
                          {formatarData(mov.created_at)}
                          {mov.motivo && ` · ${mov.motivo}`}
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {cancelamento && (
        <div className="overlay">
          <div className="modal">
            <div className="modalHeader">
              <div>
                <h2 className="modalTitle">Cancelar reserva</h2>
                <p className="modalText">
                  Você está cancelando a reserva de {cancelamento.reserva.roteiro_titulo}. O eventual crédito será calculado conforme a política vigente de cancelamento.
                </p>
              </div>

              <button
                type="button"
                className="closeBtn"
                onClick={() => setCancelamento(null)}
                disabled={cancelando}
              >
                ×
              </button>
            </div>

            <div className="field">
              <label>Motivo principal</label>
              <select
                value={cancelamento.motivoCodigo}
                onChange={(event) =>
                  setCancelamento((prev) =>
                    prev ? { ...prev, motivoCodigo: event.target.value } : prev
                  )
                }
                disabled={cancelando}
              >
                {MOTIVOS_CANCELAMENTO_CLIENTE.map((motivo) => (
                  <option key={motivo.codigo} value={motivo.codigo}>
                    {motivo.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Observação</label>
              <textarea
                value={cancelamento.motivoDescricao}
                onChange={(event) =>
                  setCancelamento((prev) =>
                    prev ? { ...prev, motivoDescricao: event.target.value } : prev
                  )
                }
                placeholder="Explique brevemente o motivo do cancelamento."
                disabled={cancelando}
              />
            </div>

            <div className="policyBox">
              O Saldo de Jornada é exibido no perfil privado do cliente e poderá ser utilizado em uma nova experiência. As regras completas ficarão disponíveis nos Termos de Cancelamento.
            </div>

            <div className="modalActions">
              <button
                type="button"
                className="btn"
                onClick={() => setCancelamento(null)}
                disabled={cancelando}
              >
                Voltar
              </button>

              <button
                type="button"
                className="btn danger"
                onClick={confirmarCancelamento}
                disabled={cancelando}
              >
                {cancelando ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
