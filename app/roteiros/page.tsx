'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type UsuarioLocal = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
  tipo?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
}

type Guia = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
}

type Roteiro = {
  id: string
  titulo?: string | null
  nome?: string | null
  descricao?: string | null
  preco?: number | null
  valor?: number | null
  status?: string | null
  ativo?: boolean | null
  excluido_admin?: boolean | null
  id_guia?: string | null
  guia_id?: string | null
  local?: string | null
  localizacao?: string | null
  local_encontro?: string | null
  ponto_encontro?: string | null
  data_roteiro?: string | null
  data_saida?: string | null
  data?: string | null
  hora_roteiro?: string | null
  hora_saida?: string | null
  hora?: string | null
  dificuldade?: string | null
  duracao_horas?: number | null
  duracao?: string | null
  km?: number | null
  distancia_km?: number | null
  limite_pessoas?: number | null
  capacidade?: number | null
  max_pessoas?: number | null
  recorrencia?: string | null
  frequencia?: string | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  imagem?: string | null
  created_at?: string | null
  updated_at?: string | null
  guia_nome?: string
  hot_score?: number
  hot_reservas?: number
  hot_confirmadas?: number
}

type ReservaCriada = {
  id: string
}

export default function RoteirosPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [reservandoId, setReservandoId] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroDificuldade, setFiltroDificuldade] = useState('todos')
  const [ordenacao, setOrdenacao] = useState<
    'quentes' | 'recentes' | 'menor_preco' | 'maior_preco'
  >('quentes')
  const [roteiroSelecionado, setRoteiroSelecionado] = useState<Roteiro | null>(null)
  const [quantidadePessoas, setQuantidadePessoas] = useState(1)

  useEffect(() => {
    if (iniciouRef.current) return
    iniciouRef.current = true
    iniciar()
  }, [])

  const iniciar = async () => {
    setCarregando(true)

    try {
      const userData = localStorage.getItem('user')

      if (userData) {
        try {
          setUser(JSON.parse(userData))
        } catch {
          localStorage.removeItem('user')
        }
      }

      await carregarRoteiros()
    } catch (error) {
      console.error('Erro ao iniciar página de roteiros:', error)
      setMensagem('Não foi possível carregar os roteiros agora.')
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

  const primeiroNome = (valor?: string | null) => {
    const nome = String(valor || '').trim()
    if (!nome) return 'Perfil'
    return nome.split(' ')[0] || 'Perfil'
  }

  const nomeUsuario = (usuario?: UsuarioLocal | null) => {
    return usuario?.nome || usuario?.name || usuario?.email || 'Perfil'
  }

  const avatarUsuario = (usuario?: UsuarioLocal | null) => {
    return usuario?.avatar_url || usuario?.foto_url || usuario?.imagem_url || ''
  }

  const inicialUsuario = (usuario?: UsuarioLocal | null) => {
    return String(nomeUsuario(usuario)).trim().charAt(0).toUpperCase() || 'P'
  }

  const rotaPainelUsuario = (usuario?: UsuarioLocal | null) => {
    if (!usuario) return '/login'
    if (usuario.tipo === 'admin') return '/admin/dashboard'
    if (usuario.tipo === 'guia') return '/guia/dashboard'
    return '/cliente/dashboard'
  }

  const rotaPerfilUsuario = (usuario?: UsuarioLocal | null) => {
    if (!usuario) return '/login'
    if (usuario.tipo === 'admin') return '/admin/dashboard'
    if (usuario.tipo === 'guia') return '/guia/perfil'
    return '/cliente/perfil'
  }

  const tituloRoteiro = (roteiro: Roteiro) => {
    return roteiro.titulo || roteiro.nome || 'Roteiro sem título'
  }

  const precoRoteiro = (roteiro: Roteiro) => {
    return Number(roteiro.preco || roteiro.valor || 0)
  }

  const guiaIdRoteiro = (roteiro: Roteiro) => {
    return roteiro.id_guia || roteiro.guia_id || ''
  }

  const localRoteiro = (roteiro: Roteiro) => {
    return (
      roteiro.local ||
      roteiro.localizacao ||
      roteiro.local_encontro ||
      roteiro.ponto_encontro ||
      'Local a confirmar'
    )
  }

  const dataRoteiro = (roteiro: Roteiro) => {
    return roteiro.data_roteiro || roteiro.data_saida || roteiro.data || null
  }

  const horaRoteiro = (roteiro: Roteiro) => {
    return roteiro.hora_roteiro || roteiro.hora_saida || roteiro.hora || ''
  }

  const imagemRoteiro = (roteiro: Roteiro) => {
    return roteiro.foto_capa || roteiro.foto_url || roteiro.imagem_url || roteiro.imagem || ''
  }

  const kmRoteiro = (roteiro: Roteiro) => {
    return Number(roteiro.km || roteiro.distancia_km || 0)
  }

  const limitePessoas = (roteiro: Roteiro) => {
    const limite = roteiro.limite_pessoas ?? roteiro.capacidade ?? roteiro.max_pessoas ?? null

    if (limite === null || limite === undefined) return 12

    const numero = Number(limite)

    if (!Number.isFinite(numero) || numero <= 0) return 12

    return numero
  }

  const recorrenciaRoteiro = (roteiro: Roteiro) => {
    return roteiro.recorrencia || roteiro.frequencia || 'Experiência única'
  }

  const formatarMoeda = (valor: any) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(valor || 0))
  }

  const formatarData = (valor?: string | null) => {
    if (!valor) return 'Data a combinar'

    const data = new Date(valor)

    if (Number.isNaN(data.getTime())) return valor

    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    })
  }

  const statusPublicavel = (roteiro: Roteiro) => {
    const status = normalizar(roteiro.status)

    if (roteiro.excluido_admin === true) return false
    if (status === 'excluido_admin') return false
    if (status === 'reprovado') return false
    if (status === 'cancelado') return false
    if (status === 'cancelada') return false
    if (status === 'pausado') return false

    if (status === 'ativo') return true
    if (roteiro.ativo === true) return true

    return true
  }

  const pagamentoConfirmado = (reserva: any) => {
    const pagamento = normalizar(reserva?.pagamento_status)
    const status = normalizar(reserva?.status)

    return (
      pagamento === 'pago' ||
      pagamento === 'confirmado' ||
      status === 'confirmada' ||
      status === 'realizada'
    )
  }

  const reservaCancelada = (reserva: any) => {
    return normalizar(reserva?.status) === 'cancelada'
  }

  const carregarRoteiros = async () => {
    setMensagem('')

    try {
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar roteiros:', error)
        setRoteiros([])
        setMensagem('Erro ao buscar roteiros.')
        return
      }

      const roteirosBase = ((data || []) as Roteiro[]).filter(statusPublicavel)

      if (roteirosBase.length === 0) {
        setRoteiros([])
        return
      }

      const guiaIds = Array.from(
        new Set(
          roteirosBase
            .map((roteiro) => guiaIdRoteiro(roteiro))
            .filter(Boolean)
        )
      )

      let guias: Guia[] = []

      if (guiaIds.length > 0) {
        const { data: guiasData, error: guiasError } = await supabase
          .from('users')
          .select('id, nome, name, email')
          .in('id', guiaIds)

        if (!guiasError) {
          guias = (guiasData || []) as Guia[]
        }
      }

      const roteiroIds = roteirosBase.map((roteiro) => roteiro.id)
      let reservas: any[] = []

      if (roteiroIds.length > 0) {
        const { data: reservasData, error: reservasError } = await supabase
          .from('reservas')
          .select('id, roteiro_id, status, pagamento_status, created_at')
          .in('roteiro_id', roteiroIds)

        if (!reservasError) {
          reservas = reservasData || []
        }
      }

      const agora = Date.now()
      const trintaDias = 1000 * 60 * 60 * 24 * 30

      const mapaHot = new Map<
        string,
        {
          score: number
          total: number
          confirmadas: number
        }
      >()

      reservas.forEach((reserva) => {
        if (!reserva.roteiro_id) return
        if (reservaCancelada(reserva)) return

        const atual = mapaHot.get(reserva.roteiro_id) || {
          score: 0,
          total: 0,
          confirmadas: 0
        }

        atual.total += 1

        if (pagamentoConfirmado(reserva)) {
          atual.score += 8
          atual.confirmadas += 1
        } else {
          atual.score += 3
        }

        const dataReserva = new Date(reserva.created_at || '').getTime()

        if (!Number.isNaN(dataReserva)) {
          const idade = agora - dataReserva

          if (idade <= trintaDias) atual.score += 4
          if (idade <= trintaDias / 2) atual.score += 2
        }

        mapaHot.set(reserva.roteiro_id, atual)
      })

      const lista = roteirosBase.map((roteiro) => {
        const guia = guias.find((item) => item.id === guiaIdRoteiro(roteiro))
        const hot = mapaHot.get(roteiro.id) || {
          score: 0,
          total: 0,
          confirmadas: 0
        }

        return {
          ...roteiro,
          guia_nome: guia?.nome || guia?.name || guia?.email || 'Guia PrussikTrails',
          hot_score: hot.score,
          hot_reservas: hot.total,
          hot_confirmadas: hot.confirmadas
        }
      })

      setRoteiros(lista)
    } catch (error) {
      console.error('Erro inesperado ao carregar roteiros:', error)
      setRoteiros([])
      setMensagem('Erro inesperado ao carregar roteiros.')
    }
  }

  const abrirDetalhesRoteiro = (roteiro: Roteiro) => {
    if (!roteiro?.id) return
    router.push(`/roteiros/${roteiro.id}`)
  }

  const abrirReserva = (roteiro: Roteiro) => {
    if (!user?.id) {
      router.push('/login')
      return
    }

    if (user.tipo !== 'cliente') {
      setMensagem('Entre como cliente para reservar um roteiro.')
      return
    }

    setQuantidadePessoas(1)
    setRoteiroSelecionado(roteiro)
  }

  const confirmarReserva = async () => {
    if (!roteiroSelecionado || !user?.id) return

    setReservandoId(roteiroSelecionado.id)
    setMensagem('')

    try {
      const quantidade = Math.max(1, Number(quantidadePessoas || 1))
      const valorUnitario = precoRoteiro(roteiroSelecionado)
      const valorTotal = valorUnitario * quantidade

      const payload = {
        clienteId: user.id,
        roteiroId: roteiroSelecionado.id,
        quantidadePessoas: quantidade,
        valorUnitario,
        valorTotal,
        origem: 'roteiros'
      }

      const response = await fetch('/api/reservas/criar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const respostaTexto = await response.text()
      let data: any = null

      try {
        data = respostaTexto ? JSON.parse(respostaTexto) : null
      } catch {
        data = {
          sucesso: false,
          erro: respostaTexto || 'Resposta não JSON da API.',
          raw: respostaTexto,
        }
      }

      if (!response.ok || data?.sucesso === false) {
        console.error('Erro ao criar reserva pela API:', {
          status: response.status,
          erro: data?.erro,
          detalhe: data?.detalhe,
          resposta: data,
          payload
        })

        setMensagem(
          data?.erro ||
            data?.message ||
            'Não foi possível criar a reserva agora. Confira os dados e tente novamente.'
        )
        return
      }

      const reserva = (data?.reserva || data) as ReservaCriada | null

      if (!reserva?.id) {
        setMensagem('Reserva criada, mas não foi possível localizar o pagamento.')
        router.push('/cliente/minhas-reservas')
        return
      }

      setRoteiroSelecionado(null)
      router.push(`/cliente/pagamento/${reserva.id}`)
    } catch (error) {
      console.error('Erro inesperado ao reservar:', error)
      setMensagem('Erro inesperado ao reservar roteiro.')
    } finally {
      setReservandoId('')
    }
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

    const filtrados = roteiros.filter((roteiro) => {
      const texto = normalizar(
        [
          tituloRoteiro(roteiro),
          roteiro.descricao,
          roteiro.guia_nome,
          localRoteiro(roteiro),
          roteiro.dificuldade,
          recorrenciaRoteiro(roteiro)
        ].join(' ')
      )

      const passaBusca = termo ? texto.includes(termo) : true

      const passaDificuldade =
        filtroDificuldade === 'todos'
          ? true
          : normalizar(roteiro.dificuldade) === normalizar(filtroDificuldade)

      return passaBusca && passaDificuldade
    })

    return filtrados.sort((a, b) => {
      if (ordenacao === 'menor_preco') return precoRoteiro(a) - precoRoteiro(b)
      if (ordenacao === 'maior_preco') return precoRoteiro(b) - precoRoteiro(a)

      if (ordenacao === 'recentes') {
        const dataA = new Date(a.created_at || '').getTime()
        const dataB = new Date(b.created_at || '').getTime()
        return (Number.isNaN(dataB) ? 0 : dataB) - (Number.isNaN(dataA) ? 0 : dataA)
      }

      if (Number(b.hot_score || 0) !== Number(a.hot_score || 0)) {
        return Number(b.hot_score || 0) - Number(a.hot_score || 0)
      }

      const dataA = new Date(a.created_at || '').getTime()
      const dataB = new Date(b.created_at || '').getTime()

      return (Number.isNaN(dataB) ? 0 : dataB) - (Number.isNaN(dataA) ? 0 : dataA)
    })
  }, [roteiros, busca, filtroDificuldade, ordenacao])

  const hotLabel = (roteiro: Roteiro) => {
    const total = Number(roteiro.hot_reservas || 0)
    const confirmadas = Number(roteiro.hot_confirmadas || 0)

    if (total === 0) return 'Novidade'
    if (confirmadas > 0) return `${confirmadas} confirmação(ões)`
    return `${total} reserva(s)`
  }

  const dificuldadeClass = (dificuldade?: string | null) => {
    const d = normalizar(dificuldade)

    if (d.includes('facil')) return 'badge-green'
    if (d.includes('medio')) return 'badge-yellow'
    if (d.includes('dificil') || d.includes('extremo')) return 'badge-red'

    return 'badge-neutral'
  }

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
              radial-gradient(circle at top left, rgba(132, 204, 22, 0.18), transparent 30%),
              linear-gradient(180deg, #fffdf7 0%, #eef2e5 100%);
            color: #374151;
          }

          .loadingCard {
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.06);
            border-radius: 30px;
            padding: 28px;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
            text-align: center;
          }

          .loadingCard img {
            width: clamp(176px, 52vw, 250px);
            height: auto;
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
        * { box-sizing: border-box; }

        body {
          margin: 0;
          background: #f6f7f1;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .page {
          min-height: 100vh;
          min-height: 100dvh;
          background:
            radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.16), transparent 28%),
            radial-gradient(circle at 90% 10%, rgba(251, 146, 60, 0.14), transparent 28%),
            linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
          color: #172018;
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(255, 253, 247, 0.88);
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(18px);
          padding: 8px 14px;
        }

        .topbarInner {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 46px minmax(0, 1fr) 46px;
          align-items: center;
          gap: 8px;
        }

        .headerGhost {
          width: 42px;
          height: 42px;
        }

        .brandCenter {
          min-width: 0;
          border: none;
          background: transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
          text-align: center;
        }

        .brandLogo {
          width: clamp(178px, 54vw, 270px);
          max-width: 100%;
          height: auto;
          object-fit: contain;
          display: block;
        }

        .brandSubtitle {
          color: #6b7280;
          font-size: clamp(9px, 2.6vw, 11px);
          line-height: 1;
          font-weight: 850;
          letter-spacing: 0.08em;
          margin-top: -3px;
          text-transform: uppercase;
          white-space: nowrap;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .profileButton,
        .loginButton {
          width: 42px;
          height: 42px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(255,255,255,0.78);
          color: #172018;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          font-weight: 950;
          transition: 0.2s ease;
          overflow: hidden;
          justify-self: end;
        }

        .profileButton:hover,
        .loginButton:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.10);
        }

        .profileButton img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .profileInitial {
          width: 100%;
          height: 100%;
          border-radius: 999px;
          background: #172018;
          color: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 950;
        }

        .container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 22px 16px 48px;
        }

        .hero {
          position: relative;
          overflow: hidden;
          border-radius: 38px;
          padding: 30px;
          min-height: 330px;
          background:
            linear-gradient(135deg, rgba(23, 32, 24, 0.76), rgba(23, 32, 24, 0.34)),
            radial-gradient(circle at top right, rgba(190, 242, 100, 0.30), transparent 34%),
            linear-gradient(135deg, #1f331f 0%, #647a49 46%, #d7c6a1 100%);
          color: #ffffff;
          box-shadow: 0 24px 60px rgba(23, 32, 24, 0.18);
          margin-bottom: 16px;
        }

        .hero::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 46px 46px;
          mask-image: linear-gradient(to bottom, black, transparent);
          pointer-events: none;
        }

        .heroContent {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 260px;
          gap: 22px;
          align-items: end;
          min-height: 265px;
        }

        .eyebrow {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.26);
          background: rgba(255, 255, 255, 0.12);
          color: #f7fee7;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .heroTitle {
          margin: 0;
          max-width: 720px;
          font-size: clamp(42px, 6vw, 72px);
          line-height: 0.92;
          font-weight: 950;
          letter-spacing: -0.085em;
        }

        .heroTitle span {
          color: #bef264;
          text-shadow: 0 0 28px rgba(190, 242, 100, 0.32);
        }

        .heroText {
          max-width: 650px;
          color: rgba(255,255,255,0.82);
          line-height: 1.62;
          margin: 16px 0 0;
          font-size: 14px;
        }

        .heroCard {
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 28px;
          padding: 18px;
          backdrop-filter: blur(16px);
        }

        .heroCardLabel {
          color: rgba(255,255,255,0.76);
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }

        .heroCardValue {
          margin-top: 8px;
          color: #ffffff;
          font-size: 38px;
          font-weight: 950;
          letter-spacing: -0.08em;
          line-height: 1;
        }

        .heroCardText {
          margin-top: 8px;
          color: rgba(255,255,255,0.78);
          font-size: 12px;
          line-height: 1.45;
        }

        .message {
          background: #ecfdf5;
          color: #166534;
          border: 1px solid #bbf7d0;
          border-radius: 18px;
          padding: 13px 15px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 800;
        }

        .toolbar {
          background: rgba(255,255,255,0.88);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 30px;
          padding: 14px;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
          display: grid;
          grid-template-columns: minmax(0, 1fr) 190px 190px;
          gap: 10px;
          margin-bottom: 16px;
        }

        .input,
        .select {
          width: 100%;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: #fffdf7;
          border-radius: 999px;
          padding: 13px 15px;
          font-size: 13px;
          color: #172018;
          outline: none;
          font-weight: 800;
        }

        .input:focus,
        .select:focus {
          border-color: #84cc16;
          box-shadow: 0 0 0 4px rgba(132, 204, 22, 0.12);
        }

        .statsRow {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .statCard {
          background: rgba(255,255,255,0.84);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 26px;
          padding: 16px;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
        }

        .statValue {
          color: #172018;
          font-size: 28px;
          font-weight: 950;
          letter-spacing: -0.07em;
        }

        .statLabel {
          color: #64748b;
          font-size: 12px;
          font-weight: 850;
          margin-top: 3px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .card {
          background: rgba(255,255,255,0.90);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 32px;
          overflow: hidden;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.07);
          transition: 0.2s ease;
          display: flex;
          flex-direction: column;
          min-height: 100%;
          cursor: pointer;
          outline: none;
        }

        .card:focus-visible {
          box-shadow:
            0 0 0 4px rgba(132, 204, 22, 0.22),
            0 22px 46px rgba(15, 23, 42, 0.12);
          transform: translateY(-3px);
        }

        .card:hover {
          transform: translateY(-3px);
          box-shadow: 0 22px 46px rgba(15, 23, 42, 0.12);
        }

        .imageBox {
          height: 210px;
          background:
            radial-gradient(circle at top right, rgba(251, 146, 60, 0.20), transparent 38%),
            linear-gradient(135deg, #dbe7c8, #aebf8d);
          position: relative;
          overflow: hidden;
        }

        .imageBox img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .imageOverlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.45), transparent 55%);
        }

        .hotPill {
          position: absolute;
          top: 14px;
          left: 14px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 237, 213, 0.94);
          color: #9a3412;
          border: 1px solid #fed7aa;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 11px;
          font-weight: 950;
          z-index: 2;
        }

        .datePill {
          position: absolute;
          right: 14px;
          bottom: 14px;
          background: rgba(255,255,255,0.92);
          color: #172018;
          border-radius: 18px;
          padding: 9px 11px;
          font-size: 12px;
          font-weight: 950;
          z-index: 2;
          text-align: center;
          min-width: 72px;
        }

        .cardBody {
          padding: 17px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .cardTitle {
          color: #172018;
          font-size: 19px;
          line-height: 1.12;
          font-weight: 950;
          letter-spacing: -0.045em;
          margin: 0;
        }

        .meta {
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 760;
          margin-top: 8px;
        }

        .desc {
          color: #475569;
          font-size: 13px;
          line-height: 1.55;
          margin: 12px 0 0;
          flex: 1;
        }

        .badgeRow {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          margin-top: 14px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
        }

        .badge-green { background: #dcfce7; color: #166534; }
        .badge-yellow { background: #fef3c7; color: #92400e; }
        .badge-red { background: #fee2e2; color: #991b1b; }
        .badge-neutral { background: #f1f5f9; color: #475569; }

        .cardFooter {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 16px;
        }

        .price {
          color: #16a34a;
          font-size: 20px;
          font-weight: 950;
          letter-spacing: -0.05em;
        }

        .price small {
          display: block;
          color: #94a3b8;
          font-size: 10px;
          letter-spacing: 0;
          font-weight: 850;
          margin-top: 1px;
        }

        .reserveBtn {
          border: none;
          border-radius: 999px;
          padding: 12px 15px;
          background: #172018;
          color: #ffffff;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
          white-space: nowrap;
        }

        .reserveBtn:hover:not(:disabled) {
          background: #16a34a;
          transform: translateY(-1px);
        }

        .reserveBtn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .empty {
          padding: 34px;
          text-align: center;
          color: #64748b;
          font-size: 14px;
          background: rgba(255,255,255,0.86);
          border-radius: 28px;
          border: 1px dashed #cbd5e1;
          font-weight: 700;
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 999;
          background: rgba(23, 32, 24, 0.58);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }

        .modal {
          width: 100%;
          max-width: 520px;
          background: #fffdf7;
          border-radius: 34px;
          overflow: hidden;
          box-shadow: 0 30px 80px rgba(15, 23, 42, 0.35);
          border: 1px solid rgba(255,255,255,0.18);
        }

        .modalHeader {
          background:
            radial-gradient(circle at top right, rgba(190, 242, 100, 0.28), transparent 36%),
            #172018;
          color: #ffffff;
          padding: 24px;
        }

        .modalTitle {
          margin: 0;
          font-size: 28px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.06em;
        }

        .modalText {
          margin: 8px 0 0;
          color: rgba(255,255,255,0.74);
          font-size: 13px;
          line-height: 1.55;
        }

        .modalBody {
          padding: 22px;
        }

        .modalInfo {
          background: #f6f7f1;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 24px;
          padding: 14px;
          margin-bottom: 14px;
          color: #475569;
          font-size: 13px;
          line-height: 1.5;
          font-weight: 750;
        }

        .quantityRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .quantityControls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .quantityBtn {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          border: 1px solid rgba(15,23,42,0.08);
          background: #ffffff;
          color: #172018;
          font-size: 18px;
          font-weight: 950;
          cursor: pointer;
        }

        .quantityValue {
          min-width: 34px;
          text-align: center;
          font-size: 20px;
          font-weight: 950;
          color: #172018;
        }

        .modalActions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .cancelBtn,
        .confirmBtn {
          border: none;
          border-radius: 999px;
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
        }

        .cancelBtn { background: #e5e7eb; color: #374151; }
        .confirmBtn { background: #172018; color: #ffffff; }

        .cancelBtn:disabled,
        .confirmBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 980px) {
          .heroContent,
          .toolbar,
          .grid {
            grid-template-columns: 1fr;
          }

          .hero {
            min-height: 0;
          }

          .heroContent {
            min-height: 0;
          }
        }

        @media (max-width: 720px) {
          .topbar {
            padding: 7px 10px;
          }

          .topbarInner {
            grid-template-columns: 40px minmax(0, 1fr) 40px;
          }

          .headerGhost,
          .profileButton,
          .loginButton {
            width: 38px;
            height: 38px;
          }

          .brandLogo {
            width: clamp(168px, 58vw, 226px);
          }

          .brandSubtitle {
            font-size: 9px;
            margin-top: -4px;
          }

          .container {
            padding: 18px 10px 42px;
          }

          .hero {
            border-radius: 30px;
            padding: 22px;
          }

          .heroTitle {
            font-size: clamp(38px, 12.5vw, 52px);
            letter-spacing: -0.095em;
          }

          .statsRow {
            grid-template-columns: 1fr;
          }

          .cardFooter,
          .quantityRow,
          .modalActions {
            display: grid;
          }

          .reserveBtn,
          .cancelBtn,
          .confirmBtn {
            width: 100%;
          }
        }

        @media (max-width: 380px) {
          .brandLogo {
            width: clamp(150px, 55vw, 198px);
          }

          .brandSubtitle {
            display: none;
          }
        }
      `}</style>

      <header className="topbar">
        <div className="topbarInner">
          <div className="headerGhost" aria-hidden="true" />

          <button
            type="button"
            className="brandCenter"
            onClick={() => router.push('/')}
            aria-label="Ir para início"
            title="PrussikTrails"
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" className="brandLogo" />
            <span className="brandSubtitle">Roteiros e experiências outdoor</span>
          </button>

          {user ? (
            <button
              type="button"
              className="profileButton"
              onClick={() => router.push(rotaPerfilUsuario(user))}
              aria-label={`Abrir ${primeiroNome(nomeUsuario(user))}`}
              title="Perfil"
            >
              {avatarUsuario(user) ? (
                <img src={avatarUsuario(user)} alt={nomeUsuario(user)} />
              ) : (
                <span className="profileInitial">{inicialUsuario(user)}</span>
              )}
            </button>
          ) : (
            <button
              type="button"
              className="loginButton"
              onClick={() => router.push('/login')}
              aria-label="Entrar"
              title="Entrar"
            >
              Entrar
            </button>
          )}
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroContent">
            <div>
              <div className="eyebrow">Escolha seu próximo caminho</div>

              <h1 className="heroTitle">
                Nem toda rota aparece no mapa.
                <br />
                Algumas começam <span>por coragem.</span>
              </h1>

              <p className="heroText">
                Encontre experiências outdoor, trilhas guiadas e jornadas para sair
                da rotina com segurança, presença e bons guias pelo caminho.
              </p>
            </div>

            <aside className="heroCard">
              <div className="heroCardLabel">Roteiros disponíveis</div>
              <div className="heroCardValue">{roteiros.length}</div>
              <div className="heroCardText">
                Use os filtros para encontrar uma experiência com o seu ritmo.
              </div>
            </aside>
          </div>
        </section>

        {mensagem && <div className="message">{mensagem}</div>}

        <section className="toolbar">
          <input
            className="input"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por trilha, local, guia ou experiência..."
          />

          <select
            className="select"
            value={filtroDificuldade}
            onChange={(event) => setFiltroDificuldade(event.target.value)}
          >
            <option value="todos">Todas as dificuldades</option>
            {dificuldadesDisponiveis.map((dificuldade) => (
              <option value={dificuldade} key={dificuldade}>
                {dificuldade}
              </option>
            ))}
          </select>

          <select
            className="select"
            value={ordenacao}
            onChange={(event) => setOrdenacao(event.target.value as any)}
          >
            <option value="quentes">Mais quentes</option>
            <option value="recentes">Mais recentes</option>
            <option value="menor_preco">Menor preço</option>
            <option value="maior_preco">Maior preço</option>
          </select>
        </section>

        <section className="statsRow">
          <article className="statCard">
            <div className="statValue">{roteirosFiltrados.length}</div>
            <div className="statLabel">roteiro(s) encontrados</div>
          </article>

          <article className="statCard">
            <div className="statValue">
              {roteiros.filter((r) => Number(r.hot_reservas || 0) > 0).length}
            </div>
            <div className="statLabel">com movimento da comunidade</div>
          </article>

          <article className="statCard">
            <div className="statValue">
              {roteiros.length > 0
                ? formatarMoeda(
                    Math.min(
                      ...roteiros
                        .map((roteiro) => precoRoteiro(roteiro))
                        .filter((preco) => preco > 0)
                    )
                  )
                : 'R$ 0,00'}
            </div>
            <div className="statLabel">menor valor disponível</div>
          </article>
        </section>

        {roteirosFiltrados.length === 0 ? (
          <div className="empty">Nenhum roteiro encontrado com os filtros atuais.</div>
        ) : (
          <section className="grid">
            {roteirosFiltrados.map((roteiro) => {
              const imagem = imagemRoteiro(roteiro)
              const preco = precoRoteiro(roteiro)
              const km = kmRoteiro(roteiro)

              return (
                <article
                  className="card"
                  key={roteiro.id}
                  onClick={() => abrirDetalhesRoteiro(roteiro)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      abrirDetalhesRoteiro(roteiro)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="imageBox">
                    {imagem && <img src={imagem} alt={tituloRoteiro(roteiro)} />}
                    <div className="imageOverlay" />
                    <div className="hotPill">🔥 {hotLabel(roteiro)}</div>
                    <div className="datePill">
                      {formatarData(dataRoteiro(roteiro))}
                      {horaRoteiro(roteiro) ? <br /> : null}
                      {horaRoteiro(roteiro)}
                    </div>
                  </div>

                  <div className="cardBody">
                    <h2 className="cardTitle">{tituloRoteiro(roteiro)}</h2>

                    <div className="meta">
                      {localRoteiro(roteiro)}
                      {roteiro.guia_nome ? ` · ${roteiro.guia_nome}` : ''}
                    </div>

                    <p className="desc">
                      {roteiro.descricao ||
                        'Experiência outdoor guiada para viver a trilha com presença, orientação e comunidade.'}
                    </p>

                    <div className="badgeRow">
                      {roteiro.dificuldade && (
                        <span className={`badge ${dificuldadeClass(roteiro.dificuldade)}`}>
                          {roteiro.dificuldade}
                        </span>
                      )}

                      {km > 0 && <span className="badge badge-neutral">{km} km</span>}

                      {roteiro.duracao_horas ? (
                        <span className="badge badge-neutral">{roteiro.duracao_horas}h</span>
                      ) : roteiro.duracao ? (
                        <span className="badge badge-neutral">{roteiro.duracao}</span>
                      ) : null}

                      <span className="badge badge-neutral">{recorrenciaRoteiro(roteiro)}</span>
                    </div>

                    <div className="cardFooter">
                      <div className="price">
                        {formatarMoeda(preco)}
                        <small>por pessoa</small>
                      </div>

                      <button
                        type="button"
                        className="reserveBtn"
                        onClick={(event) => {
                          event.stopPropagation()
                          abrirReserva(roteiro)
                        }}
                        disabled={reservandoId === roteiro.id}
                      >
                        {reservandoId === roteiro.id ? 'Reservando...' : 'Reservar'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>

      {roteiroSelecionado && (
        <div className="modalOverlay">
          <div className="modal">
            <div className="modalHeader">
              <h2 className="modalTitle">Revise sua reserva</h2>
              <p className="modalText">Confira os detalhes antes de gerar o QR Code PIX da sua jornada.</p>
            </div>

            <div className="modalBody">
              <div className="modalInfo">
                <strong>Roteiro:</strong> {tituloRoteiro(roteiroSelecionado)}
                <br />
                <strong>Local:</strong> {localRoteiro(roteiroSelecionado)}
                <br />
                <strong>Data:</strong> {formatarData(dataRoteiro(roteiroSelecionado))}{' '}
                {horaRoteiro(roteiroSelecionado)}
                <br />
                <strong>Valor por pessoa:</strong>{' '}
                {formatarMoeda(precoRoteiro(roteiroSelecionado))}
              </div>

              <div className="quantityRow">
                <div>
                  <strong>Quantidade de pessoas</strong>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                    Limite sugerido: {limitePessoas(roteiroSelecionado)}
                  </div>
                </div>

                <div className="quantityControls">
                  <button
                    type="button"
                    className="quantityBtn"
                    onClick={() => setQuantidadePessoas((prev) => Math.max(1, prev - 1))}
                  >
                    −
                  </button>

                  <div className="quantityValue">{quantidadePessoas}</div>

                  <button
                    type="button"
                    className="quantityBtn"
                    onClick={() =>
                      setQuantidadePessoas((prev) =>
                        Math.min(limitePessoas(roteiroSelecionado), prev + 1)
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="modalInfo">
                <strong>Total:</strong>{' '}
                {formatarMoeda(precoRoteiro(roteiroSelecionado) * quantidadePessoas)}
                <br />
                <span>Ao confirmar, criaremos a reserva e abriremos a tela de pagamento para gerar o QR Code PIX.</span>
              </div>

              <div className="modalActions">
                <button
                  type="button"
                  className="cancelBtn"
                  onClick={() => setRoteiroSelecionado(null)}
                  disabled={!!reservandoId}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="confirmBtn"
                  onClick={confirmarReserva}
                  disabled={!!reservandoId}
                >
                  {reservandoId ? 'Criando reserva...' : 'Confirmar e gerar QR Code PIX'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
