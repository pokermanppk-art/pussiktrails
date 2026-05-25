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

type GuiaInfo = {
  id: string
  nome?: string | null
  email?: string | null
  pix_tipo?: string | null
  pix_chave?: string | null
  cadastur?: string | null
  guia_beta?: boolean | null
  guia_pioneiro_beta?: boolean | null
  medalha_guia_pioneiro_beta?: boolean | null
  beneficio_taxa_beta_ativo?: boolean | null
  taxa_plataforma_percentual?: number | null
}

type ResumoFinanceiro = {
  receita_bruta: number
  taxa_percentual: number
  taxa_plataforma: number
  taxa_paghiper: number
  valor_liquido_guia: number
  valor_pago: number
  saldo_pendente: number
  excesso_repasse?: number
  reservas_confirmadas: number
  reservas_total?: number
  roteiros_total: number
  repasses_total: number
  ultimo_pagamento_em?: string | null
}

type Roteiro = {
  id?: string | null
  titulo?: string | null
  nome?: string | null
  local?: string | null
  localizacao?: string | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  imagem?: string | null
  preco?: number | null
  valor?: number | null
  [key: string]: any
}

type ReservaFinanceira = {
  id: string
  cliente_id?: string | null
  roteiro_id?: string | null
  quantidade_pessoas?: number | null
  valor_total?: number | null
  status?: string | null
  pagamento_status?: string | null
  created_at?: string | null
  updated_at?: string | null
  data_pagamento?: string | null
  pago_em?: string | null
  order_id?: string | null
  transaction_id?: string | null
  paghiper_transaction_id?: string | null
  pix_codigo?: string | null
  comprovante_url?: string | null
  url_comprovante?: string | null
  comprovante?: string | null
  recibo_url?: string | null
  arquivo_url?: string | null
  roteiro_titulo?: string | null
  cliente_nome?: string | null
  cliente_email?: string | null
  roteiro?: Roteiro | null
  [key: string]: any
}

type RepasseFinanceiro = {
  id: string
  guia_id?: string | null
  id_guia?: string | null
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
  admin_id?: string | null
  criado_por?: string | null
  comprovante_url?: string | null
  url_comprovante?: string | null
  comprovante?: string | null
  recibo_url?: string | null
  arquivo_url?: string | null
  [key: string]: any
}

type Cliente = {
  id: string
  nome?: string | null
  email?: string | null
}

type Aba = 'geral' | 'clientes' | 'admin'

const resumoInicial: ResumoFinanceiro = {
  receita_bruta: 0,
  taxa_percentual: 5,
  taxa_plataforma: 0,
  taxa_paghiper: 0,
  valor_liquido_guia: 0,
  valor_pago: 0,
  saldo_pendente: 0,
  excesso_repasse: 0,
  reservas_confirmadas: 0,
  reservas_total: 0,
  roteiros_total: 0,
  repasses_total: 0,
  ultimo_pagamento_em: null
}

export default function GuiaFinanceiroPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [guia, setGuia] = useState<GuiaInfo | null>(null)
  const [resumo, setResumo] = useState<ResumoFinanceiro>(resumoInicial)
  const [reservas, setReservas] = useState<ReservaFinanceira[]>([])
  const [repasses, setRepasses] = useState<RepasseFinanceiro[]>([])

  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('')

  const [busca, setBusca] = useState('')
  const [aba, setAba] = useState<Aba>('geral')

  const [menuAberto, setMenuAberto] = useState(false)
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [alterandoSenha, setAlterandoSenha] = useState(false)

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

      const parsed = JSON.parse(userData) as UsuarioLocal

      if (parsed.tipo !== 'guia') {
        router.replace('/login')
        return
      }

      setUser(parsed)
      await carregarFinanceiro(parsed.id)
    } catch (error) {
      console.error('Erro ao iniciar financeiro do guia:', error)
      setErro('Não foi possível carregar seu financeiro agora.')
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

  const primeiroNome = (valor?: string | null) => {
    const nome = String(valor || 'Guia').trim()
    return nome.split(' ')[0] || 'Guia'
  }

  const nomeGuia = () => {
    return guia?.nome || user?.nome || user?.email || 'Guia'
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

  const formatarDataCurta = (valor?: string | null) => {
    if (!valor) return '-'

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return '-'

    return data.toLocaleDateString('pt-BR')
  }

  const dataReserva = (reserva: ReservaFinanceira) => {
    return (
      reserva.data_pagamento ||
      reserva.pago_em ||
      reserva.updated_at ||
      reserva.created_at ||
      null
    )
  }

  const dataRepasse = (repasse: RepasseFinanceiro) => {
    return repasse.data_pagamento || repasse.created_at || repasse.updated_at || null
  }

  const valorReserva = (reserva: ReservaFinanceira) => {
    return Number(reserva.valor_total || 0)
  }

  const valorRepasse = (repasse: RepasseFinanceiro) => {
    return Number(
      repasse.valor_pago ??
        repasse.valor_repassado ??
        repasse.valor ??
        repasse.valor_total ??
        0
    )
  }

  const tituloRoteiro = (reserva: ReservaFinanceira) => {
    return (
      reserva.roteiro_titulo ||
      reserva.roteiro?.titulo ||
      reserva.roteiro?.nome ||
      'Roteiro'
    )
  }

  const localRoteiro = (reserva: ReservaFinanceira) => {
    return (
      reserva.roteiro?.local ||
      reserva.roteiro?.localizacao ||
      reserva.roteiro?.local_encontro ||
      reserva.roteiro?.ponto_encontro ||
      ''
    )
  }

  const comprovanteReserva = (reserva: ReservaFinanceira) => {
    return (
      reserva.comprovante_url ||
      reserva.url_comprovante ||
      reserva.comprovante ||
      reserva.recibo_url ||
      reserva.arquivo_url ||
      reserva.comprovante_pagamento_url ||
      ''
    )
  }

  const comprovanteRepasse = (repasse: RepasseFinanceiro) => {
    return (
      repasse.comprovante_url ||
      repasse.url_comprovante ||
      repasse.comprovante ||
      repasse.recibo_url ||
      repasse.arquivo_url ||
      repasse.comprovante_pagamento_url ||
      ''
    )
  }

  const statusPagamentoLabel = (valor?: string | null) => {
    const status = normalizar(valor)

    if (
      status === 'pago' ||
      status === 'confirmado' ||
      status === 'aprovado' ||
      status === 'paid' ||
      status === 'approved'
    ) {
      return 'Pago'
    }

    if (status === 'cancelado' || status === 'cancelada') return 'Cancelado'
    if (status === 'estornado' || status === 'estornada') return 'Estornado'

    return valor || 'Pendente'
  }

  const badgeClasse = (status?: string | null) => {
    const atual = normalizar(status)

    if (
      atual === 'pago' ||
      atual === 'confirmado' ||
      atual === 'aprovado' ||
      atual === 'paid' ||
      atual === 'approved'
    ) {
      return 'success'
    }

    if (
      atual === 'cancelado' ||
      atual === 'cancelada' ||
      atual === 'estornado' ||
      atual === 'estornada'
    ) {
      return 'danger'
    }

    return 'warning'
  }

  const carregarFinanceiro = async (guiaId: string) => {
    setErro('')
    setMensagem('')

    const response = await fetch(
      `/api/guia/financeiro/resumo?guiaId=${encodeURIComponent(guiaId)}&_ts=${Date.now()}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        }
      }
    )

    const data = await response.json().catch(() => null)

    if (!response.ok || data?.sucesso === false) {
      throw new Error(data?.erro || 'Não foi possível carregar o financeiro.')
    }

    const reservasBase = Array.isArray(data?.reservas)
      ? (data.reservas as ReservaFinanceira[])
      : []

    const repassesBase = Array.isArray(data?.repasses)
      ? (data.repasses as RepasseFinanceiro[])
      : []

    const reservasComClientes = await enriquecerClientes(reservasBase)

    setGuia(data?.guia || null)
    setResumo({
      ...resumoInicial,
      ...(data?.resumo || {})
    })
    setReservas(reservasComClientes)
    setRepasses(repassesBase)
    setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
  }

  const enriquecerClientes = async (reservasBase: ReservaFinanceira[]) => {
    const clienteIds = Array.from(
      new Set(
        reservasBase
          .map((reserva) => reserva.cliente_id)
          .filter(Boolean) as string[]
      )
    )

    if (clienteIds.length === 0) return reservasBase

    const { data, error } = await supabase
      .from('users')
      .select('id, nome, email')
      .in('id', clienteIds)

    if (error || !data) {
      console.warn('Não foi possível buscar nomes dos clientes:', error)
      return reservasBase
    }

    const clientes = data as Cliente[]

    return reservasBase.map((reserva) => {
      const cliente = clientes.find((item) => item.id === reserva.cliente_id)

      return {
        ...reserva,
        cliente_nome: reserva.cliente_nome || cliente?.nome || cliente?.email || 'Cliente',
        cliente_email: reserva.cliente_email || cliente?.email || ''
      }
    })
  }

  const atualizar = async () => {
    if (!user?.id) return

    setAtualizando(true)
    setErro('')
    setMensagem('')

    try {
      await carregarFinanceiro(user.id)
      setMensagem('Financeiro atualizado.')
      setTimeout(() => setMensagem(''), 2600)
    } catch (error: any) {
      console.error('Erro ao atualizar financeiro:', error)
      setErro(error?.message || 'Não foi possível atualizar o financeiro.')
    } finally {
      setAtualizando(false)
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

  const reservasFiltradas = useMemo(() => {
    const termo = normalizar(busca)

    if (!termo) return reservas

    return reservas.filter((reserva) => {
      const texto = normalizar(
        [
          reserva.id,
          reserva.cliente_nome,
          reserva.cliente_email,
          reserva.order_id,
          reserva.transaction_id,
          reserva.paghiper_transaction_id,
          reserva.status,
          reserva.pagamento_status,
          tituloRoteiro(reserva),
          localRoteiro(reserva)
        ].join(' ')
      )

      return texto.includes(termo)
    })
  }, [reservas, busca])

  const repassesFiltrados = useMemo(() => {
    const termo = normalizar(busca)

    if (!termo) return repasses

    return repasses.filter((repasse) => {
      const texto = normalizar(
        [
          repasse.id,
          repasse.status,
          repasse.tipo,
          repasse.observacao,
          repasse.descricao,
          repasse.admin_id,
          repasse.criado_por
        ].join(' ')
      )

      return texto.includes(termo)
    })
  }, [repasses, busca])

  const historicoGeral = useMemo(() => {
    const pagamentosCliente = reservas.map((reserva) => ({
      id: `reserva-${reserva.id}`,
      tipo: 'cliente' as const,
      titulo: `Pagamento de cliente · ${tituloRoteiro(reserva)}`,
      subtitulo: `${reserva.cliente_nome || 'Cliente'} · ${reserva.quantidade_pessoas || 1} pessoa(s)`,
      valor: valorReserva(reserva),
      status: statusPagamentoLabel(reserva.pagamento_status || reserva.status),
      data: dataReserva(reserva),
      comprovante: comprovanteReserva(reserva),
      destino: reserva.id
    }))

    const repassesAdmin = repasses.map((repasse) => ({
      id: `repasse-${repasse.id}`,
      tipo: 'admin' as const,
      titulo: repasse.descricao || 'Repasse do ADMIN para o guia',
      subtitulo: repasse.observacao || 'Pagamento registrado pelo administrativo',
      valor: valorRepasse(repasse),
      status: statusPagamentoLabel(repasse.status),
      data: dataRepasse(repasse),
      comprovante: comprovanteRepasse(repasse),
      destino: repasse.id
    }))

    return [...pagamentosCliente, ...repassesAdmin].sort((a, b) => {
      const dataA = a.data ? new Date(a.data).getTime() : 0
      const dataB = b.data ? new Date(b.data).getTime() : 0
      return dataB - dataA
    })
  }, [reservas, repasses])

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
          <div>Carregando financeiro do guia...</div>
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
          object-fit: contain;
          display: block;
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

        .settingsWrap {
          position: relative;
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
          grid-template-columns: minmax(0,1fr) 340px;
          gap: 22px;
          align-items: end;
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
          font-size: clamp(42px, 6vw, 72px);
          line-height: 0.92;
          font-weight: 950;
          letter-spacing: -0.085em;
        }

        .heroTitle span {
          color: #bef264;
        }

        .heroText {
          max-width: 680px;
          color: rgba(255,255,255,0.82);
          line-height: 1.6;
          margin: 14px 0 0;
          font-size: 14px;
          font-weight: 650;
        }

        .heroCard {
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 30px;
          padding: 18px;
          backdrop-filter: blur(14px);
        }

        .heroCardLabel {
          color: rgba(255,255,255,0.70);
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }

        .heroCardValue {
          margin-top: 8px;
          color: #bef264;
          font-size: 34px;
          font-weight: 950;
          letter-spacing: -0.07em;
        }

        .heroCardText {
          margin-top: 8px;
          color: rgba(255,255,255,0.74);
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
        }

        .heroActions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 18px;
        }

        .heroBtn {
          border: 1px solid rgba(255,255,255,0.20);
          background: rgba(255,255,255,0.14);
          color: #ffffff;
          border-radius: 999px;
          padding: 10px 13px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
        }

        .heroBtn.primary {
          background: #bef264;
          color: #172018;
          border-color: #bef264;
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
          grid-template-columns: repeat(6, minmax(0,1fr));
          gap: 10px;
          margin-bottom: 16px;
        }

        .statCard {
          background: rgba(255,255,255,0.90);
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 24px;
          padding: 14px;
          box-shadow: 0 10px 30px rgba(15,23,42,0.055);
        }

        .statIcon {
          font-size: 22px;
          margin-bottom: 7px;
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

        .toolbar {
          background: rgba(255,255,255,0.90);
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 28px;
          padding: 14px;
          box-shadow: 0 12px 34px rgba(15,23,42,0.06);
          display: grid;
          grid-template-columns: minmax(0,1fr) auto;
          gap: 10px;
          align-items: center;
          margin-bottom: 16px;
        }

        .input {
          width: 100%;
          border: 1px solid rgba(15,23,42,0.08);
          background: #fffdf7;
          border-radius: 999px;
          padding: 13px 15px;
          font-size: 14px;
          color: #172018;
          outline: none;
          font-weight: 750;
        }

        .input:focus {
          border-color: #84cc16;
          box-shadow: 0 0 0 4px rgba(132,204,22,0.12);
        }

        .tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .tab {
          border: none;
          border-radius: 999px;
          padding: 11px 13px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          background: #eef2e5;
          color: #475569;
        }

        .tab.active {
          background: #172018;
          color: #ffffff;
        }

        .grid {
          display: grid;
          grid-template-columns: minmax(0,1fr) 360px;
          gap: 16px;
          align-items: start;
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
          font-size: 19px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .cardSub {
          margin-top: 3px;
          color: #64748b;
          font-size: 12px;
          font-weight: 750;
          line-height: 1.45;
        }

        .cardBody {
          padding: 16px;
        }

        .list {
          display: grid;
          gap: 11px;
        }

        .item {
          background: #fffdf7;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 22px;
          padding: 14px;
        }

        .itemTop {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .itemTitle {
          color: #172018;
          font-size: 14px;
          font-weight: 950;
          line-height: 1.3;
        }

        .itemText {
          margin-top: 5px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
          font-weight: 750;
        }

        .itemValue {
          color: #16a34a;
          font-size: 16px;
          font-weight: 950;
          white-space: nowrap;
        }

        .itemFooter {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          margin-top: 12px;
        }

        .badge {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 950;
        }

        .badge.success {
          background: #dcfce7;
          color: #166534;
        }

        .badge.warning {
          background: #fef3c7;
          color: #92400e;
        }

        .badge.danger {
          background: #fee2e2;
          color: #991b1b;
        }

        .proofLink {
          border: none;
          background: #172018;
          color: #ffffff;
          border-radius: 999px;
          padding: 8px 11px;
          font-size: 11px;
          font-weight: 950;
          text-decoration: none;
          cursor: pointer;
        }

        .mutedProof {
          color: #94a3b8;
          font-size: 11px;
          font-weight: 800;
        }

        .sideStack {
          display: grid;
          gap: 16px;
        }

        .financeBox {
          background:
            radial-gradient(circle at top right, rgba(190,242,100,0.24), transparent 38%),
            #172018;
          color: #ffffff;
          border-radius: 30px;
          padding: 22px;
        }

        .financeLabel {
          color: rgba(255,255,255,0.70);
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.10em;
        }

        .financeValue {
          color: #bef264;
          font-size: 34px;
          font-weight: 950;
          letter-spacing: -0.07em;
          margin-top: 8px;
        }

        .financeText {
          margin-top: 8px;
          color: rgba(255,255,255,0.72);
          font-size: 13px;
          line-height: 1.55;
          font-weight: 700;
        }

        .financeRows {
          display: grid;
          gap: 8px;
          margin-top: 15px;
        }

        .financeRow {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: rgba(255,255,255,0.82);
          font-size: 12px;
          font-weight: 800;
        }

        .betaBox {
          background: #fffdf7;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 26px;
          padding: 16px;
        }

        .betaTitle {
          color: #172018;
          font-size: 15px;
          font-weight: 950;
          line-height: 1.3;
        }

        .betaText {
          margin-top: 6px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.55;
          font-weight: 750;
        }

        .empty {
          border: 1px dashed rgba(15,23,42,0.14);
          background: #fffdf7;
          border-radius: 22px;
          padding: 26px;
          text-align: center;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
          font-weight: 750;
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

        .passwordInput {
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

        .modalActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 8px;
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

        .btn.dark {
          background: #172018;
          color: #ffffff;
        }

        .btn.light {
          background: #eef2e5;
          color: #475569;
        }

        .btn:disabled {
          opacity: 0.62;
          cursor: not-allowed;
        }

        @media (max-width: 1080px) {
          .heroGrid,
          .grid {
            grid-template-columns: 1fr;
          }

          .statsGrid {
            grid-template-columns: repeat(3, minmax(0,1fr));
          }

          .toolbar {
            grid-template-columns: 1fr;
          }

          .tabs {
            justify-content: flex-start;
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

          .heroTitle {
            font-size: 40px;
          }

          .statsGrid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 480px) {
          .statsGrid {
            grid-template-columns: 1fr;
          }

          .itemTop,
          .itemFooter,
          .modalActions {
            display: grid;
          }

          .btn,
          .proofLink {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <div className="brand" onClick={() => router.push('/guia/dashboard')}>
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />

            <div>
              <div className="brandTitle">PrussikTrails</div>
              <div className="brandSub">Financeiro do guia</div>
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
                  onClick={() => {
                    setMenuAberto(false)
                    router.push('/guia/dashboard')
                  }}
                >
                  🏠 Dashboard
                </button>

                <button
                  type="button"
                  className="menuButton"
                  onClick={() => {
                    setMenuAberto(false)
                    router.push('/guia/perfil')
                  }}
                >
                  👤 Perfil
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
            <div>
              <div className="eyebrow">Financeiro do guia</div>

              <h1 className="heroTitle">
                {primeiroNome(nomeGuia())}, aqui está seu histórico <span>financeiro.</span>
              </h1>

              <p className="heroText">
                Acompanhe pagamentos dos clientes, valores líquidos, taxa da plataforma,
                repasses do ADMIN e comprovantes quando houver.
                {ultimaAtualizacao && (
                  <>
                    <br />
                    Atualizado às {ultimaAtualizacao}.
                  </>
                )}
              </p>

              <div className="heroActions">
                <button
                  type="button"
                  className="heroBtn primary"
                  onClick={atualizar}
                  disabled={atualizando}
                >
                  {atualizando ? 'Atualizando...' : 'Atualizar financeiro'}
                </button>

                <button
                  type="button"
                  className="heroBtn"
                  onClick={() => router.push('/guia/dashboard')}
                >
                  Voltar ao dashboard
                </button>
              </div>
            </div>

            <aside className="heroCard">
              <div className="heroCardLabel">Saldo pendente</div>
              <div className="heroCardValue">{formatarMoeda(resumo.saldo_pendente)}</div>
              <div className="heroCardText">
                {resumo.repasses_total} repasse(s) registrado(s) · {resumo.reservas_confirmadas} pagamento(s) confirmado(s) de clientes.
              </div>
            </aside>
          </div>
        </section>

        {mensagem && <div className="alert success">{mensagem}</div>}
        {erro && <div className="alert error">{erro}</div>}

        <section className="statsGrid">
          <article className="statCard">
            <div className="statIcon">💰</div>
            <div className="statValue">{formatarMoeda(resumo.receita_bruta)}</div>
            <div className="statLabel">bruto pago pelos clientes</div>
          </article>

          <article className="statCard">
            <div className="statIcon">🏷️</div>
            <div className="statValue">{formatarMoeda(resumo.taxa_plataforma)}</div>
            <div className="statLabel">taxa PrussikTrails {resumo.taxa_percentual}%</div>
          </article>

          <article className="statCard">
            <div className="statIcon">🧭</div>
            <div className="statValue">{formatarMoeda(resumo.valor_liquido_guia)}</div>
            <div className="statLabel">líquido do guia</div>
          </article>

          <article className="statCard">
            <div className="statIcon">✅</div>
            <div className="statValue">{formatarMoeda(resumo.valor_pago)}</div>
            <div className="statLabel">já repassado pelo ADMIN</div>
          </article>

          <article className="statCard">
            <div className="statIcon">⏳</div>
            <div className="statValue">{formatarMoeda(resumo.saldo_pendente)}</div>
            <div className="statLabel">saldo pendente</div>
          </article>

          <article className="statCard">
            <div className="statIcon">🧾</div>
            <div className="statValue">{historicoGeral.length}</div>
            <div className="statLabel">movimentos no histórico</div>
          </article>
        </section>

        <section className="toolbar">
          <input
            className="input"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por cliente, roteiro, transação, status, descrição ou ID..."
          />

          <div className="tabs">
            <button
              type="button"
              className={`tab ${aba === 'geral' ? 'active' : ''}`}
              onClick={() => setAba('geral')}
            >
              Histórico geral
            </button>

            <button
              type="button"
              className={`tab ${aba === 'clientes' ? 'active' : ''}`}
              onClick={() => setAba('clientes')}
            >
              Pagamentos de clientes
            </button>

            <button
              type="button"
              className={`tab ${aba === 'admin' ? 'active' : ''}`}
              onClick={() => setAba('admin')}
            >
              Repasses do ADMIN
            </button>
          </div>
        </section>

        <section className="grid">
          <div>
            {aba === 'geral' && (
              <section className="card">
                <div className="cardHeader">
                  <div>
                    <h2 className="cardTitle">Histórico geral</h2>
                    <div className="cardSub">
                      Pagamentos de clientes e repasses administrativos em ordem cronológica.
                    </div>
                  </div>
                </div>

                <div className="cardBody">
                  {historicoGeral.length === 0 ? (
                    <div className="empty">Nenhum movimento financeiro encontrado.</div>
                  ) : (
                    <div className="list">
                      {historicoGeral
                        .filter((item) => {
                          const termo = normalizar(busca)
                          if (!termo) return true
                          return normalizar(
                            [
                              item.id,
                              item.titulo,
                              item.subtitulo,
                              item.status,
                              item.destino
                            ].join(' ')
                          ).includes(termo)
                        })
                        .map((item) => (
                          <article className="item" key={item.id}>
                            <div className="itemTop">
                              <div>
                                <div className="itemTitle">
                                  {item.tipo === 'cliente' ? '🎒 ' : '✅ '}
                                  {item.titulo}
                                </div>
                                <div className="itemText">
                                  {item.subtitulo}
                                  <br />
                                  {formatarData(item.data)}
                                </div>
                              </div>

                              <div className="itemValue">{formatarMoeda(item.valor)}</div>
                            </div>

                            <div className="itemFooter">
                              <span className={`badge ${badgeClasse(item.status)}`}>
                                {item.status}
                              </span>

                              {item.comprovante ? (
                                <a
                                  className="proofLink"
                                  href={item.comprovante}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Ver comprovante
                                </a>
                              ) : (
                                <span className="mutedProof">Sem comprovante anexado</span>
                              )}
                            </div>
                          </article>
                        ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {aba === 'clientes' && (
              <section className="card">
                <div className="cardHeader">
                  <div>
                    <h2 className="cardTitle">Pagamentos dos clientes</h2>
                    <div className="cardSub">
                      Reservas confirmadas/pagas vinculadas aos seus roteiros.
                    </div>
                  </div>
                </div>

                <div className="cardBody">
                  {reservasFiltradas.length === 0 ? (
                    <div className="empty">Nenhum pagamento de cliente encontrado.</div>
                  ) : (
                    <div className="list">
                      {reservasFiltradas.map((reserva) => {
                        const comprovante = comprovanteReserva(reserva)

                        return (
                          <article className="item" key={reserva.id}>
                            <div className="itemTop">
                              <div>
                                <div className="itemTitle">
                                  🎒 {tituloRoteiro(reserva)}
                                </div>

                                <div className="itemText">
                                  Cliente: {reserva.cliente_nome || 'Cliente'}
                                  {reserva.cliente_email ? ` · ${reserva.cliente_email}` : ''}
                                  <br />
                                  {localRoteiro(reserva) && (
                                    <>
                                      Local: {localRoteiro(reserva)}
                                      <br />
                                    </>
                                  )}
                                  Pessoas: {reserva.quantidade_pessoas || 1}
                                  <br />
                                  Data: {formatarData(dataReserva(reserva))}
                                  <br />
                                  Reserva: {reserva.id}
                                  {reserva.order_id && (
                                    <>
                                      <br />
                                      Pedido: {reserva.order_id}
                                    </>
                                  )}
                                  {(reserva.transaction_id || reserva.paghiper_transaction_id) && (
                                    <>
                                      <br />
                                      Transação: {reserva.transaction_id || reserva.paghiper_transaction_id}
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="itemValue">{formatarMoeda(valorReserva(reserva))}</div>
                            </div>

                            <div className="itemFooter">
                              <span className={`badge ${badgeClasse(reserva.pagamento_status || reserva.status)}`}>
                                {statusPagamentoLabel(reserva.pagamento_status || reserva.status)}
                              </span>

                              {comprovante ? (
                                <a
                                  className="proofLink"
                                  href={comprovante}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Ver comprovante do cliente
                                </a>
                              ) : (
                                <span className="mutedProof">Sem comprovante do cliente</span>
                              )}
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}

            {aba === 'admin' && (
              <section className="card">
                <div className="cardHeader">
                  <div>
                    <h2 className="cardTitle">Repasses do ADMIN</h2>
                    <div className="cardSub">
                      Pagamentos registrados pelo administrativo para este guia.
                    </div>
                  </div>
                </div>

                <div className="cardBody">
                  {repassesFiltrados.length === 0 ? (
                    <div className="empty">Nenhum repasse administrativo encontrado.</div>
                  ) : (
                    <div className="list">
                      {repassesFiltrados.map((repasse) => {
                        const comprovante = comprovanteRepasse(repasse)

                        return (
                          <article className="item" key={repasse.id}>
                            <div className="itemTop">
                              <div>
                                <div className="itemTitle">
                                  ✅ {repasse.descricao || 'Repasse do ADMIN para o guia'}
                                </div>

                                <div className="itemText">
                                  {repasse.observacao || 'Pagamento registrado pelo administrativo.'}
                                  <br />
                                  Data: {formatarData(dataRepasse(repasse))}
                                  <br />
                                  Repasse: {repasse.id}
                                  {repasse.admin_id && (
                                    <>
                                      <br />
                                      Admin: {repasse.admin_id}
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="itemValue">{formatarMoeda(valorRepasse(repasse))}</div>
                            </div>

                            <div className="itemFooter">
                              <span className={`badge ${badgeClasse(repasse.status)}`}>
                                {statusPagamentoLabel(repasse.status)}
                              </span>

                              {comprovante ? (
                                <a
                                  className="proofLink"
                                  href={comprovante}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Ver comprovante do repasse
                                </a>
                              ) : (
                                <span className="mutedProof">Sem comprovante anexado pelo ADMIN</span>
                              )}
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          <aside className="sideStack">
            <section className="financeBox">
              <div className="financeLabel">Resumo financeiro</div>
              <div className="financeValue">{formatarMoeda(resumo.saldo_pendente)}</div>
              <div className="financeText">
                Saldo pendente após descontar repasses já registrados pelo ADMIN.
              </div>

              <div className="financeRows">
                <div className="financeRow">
                  <span>Bruto dos clientes</span>
                  <strong>{formatarMoeda(resumo.receita_bruta)}</strong>
                </div>

                <div className="financeRow">
                  <span>Taxa PrussikTrails {resumo.taxa_percentual}%</span>
                  <strong>{formatarMoeda(resumo.taxa_plataforma)}</strong>
                </div>

                <div className="financeRow">
                  <span>Líquido do guia</span>
                  <strong>{formatarMoeda(resumo.valor_liquido_guia)}</strong>
                </div>

                <div className="financeRow">
                  <span>Já repassado</span>
                  <strong>{formatarMoeda(resumo.valor_pago)}</strong>
                </div>

                <div className="financeRow">
                  <span>Saldo pendente</span>
                  <strong>{formatarMoeda(resumo.saldo_pendente)}</strong>
                </div>

                {Number(resumo.excesso_repasse || 0) > 0 && (
                  <div className="financeRow">
                    <span>Excesso de repasse</span>
                    <strong>{formatarMoeda(resumo.excesso_repasse)}</strong>
                  </div>
                )}
              </div>
            </section>

            <section className="betaBox">
              <div className="betaTitle">Taxa Beta e Guia Pioneiro</div>
              <div className="betaText">
                Durante a fase Beta, a taxa PrussikTrails é de <strong>5%</strong>.
                Após o Beta, a taxa padrão passa para <strong>7%</strong>.
                Guias ativos na fase Beta poderão manter o benefício de fundador por tempo determinado
                e receber a medalha especial de Guia Pioneiro.
              </div>
            </section>

            <section className="betaBox">
              <div className="betaTitle">Dados para recebimento</div>
              <div className="betaText">
                PIX: {guia?.pix_chave ? `${guia.pix_tipo || 'Chave'} · ${guia.pix_chave}` : 'não informado'}
                <br />
                CADASTUR: {guia?.cadastur || 'não informado'}
                <br />
                Último repasse: {formatarDataCurta(resumo.ultimo_pagamento_em)}
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
                  className="passwordInput"
                  type="password"
                  value={senhaAtual}
                  onChange={(event) => setSenhaAtual(event.target.value)}
                  placeholder="Digite sua senha atual"
                />
              </div>

              <div className="field">
                <label className="label">Nova senha</label>
                <input
                  className="passwordInput"
                  type="password"
                  value={novaSenha}
                  onChange={(event) => setNovaSenha(event.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                />
              </div>

              <div className="field">
                <label className="label">Confirmar nova senha</label>
                <input
                  className="passwordInput"
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