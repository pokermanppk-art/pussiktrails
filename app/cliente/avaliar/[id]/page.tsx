'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type UsuarioLocal = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
  tipo?: string | null
}

type Reserva = {
  id: string
  cliente_id?: string | null
  roteiro_id?: string | null
  quantidade_pessoas?: number | null
  valor_total?: number | null
  status?: string | null
  pagamento_status?: string | null
  created_at?: string | null
}

type Roteiro = {
  id: string
  titulo?: string | null
  nome?: string | null
  descricao?: string | null
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
  data_roteiro?: string | null
  data_saida?: string | null
  data?: string | null
  hora_roteiro?: string | null
  hora_saida?: string | null
  hora?: string | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  imagem?: string | null
}

type UsuarioBanco = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
  tipo?: string | null
}

type Avaliacao = {
  id: string
  reserva_id?: string | null
  roteiro_id?: string | null
  guia_id?: string | null
  cliente_id?: string | null
  avaliador_id?: string | null
  avaliado_id?: string | null
  tipo_avaliacao?: string | null
  nota?: number | null
  orientacoes?: string | null
  seguranca?: string | null
  experiencia?: string | null
  comentario?: string | null
  recomenda?: boolean | null
  status?: string | null
  created_at?: string | null
}

type OpcaoResposta = {
  value: string
  label: string
  descricao: string
}

const OPCOES_ORIENTACOES: OpcaoResposta[] = [
  {
    value: 'claras_completas',
    label: 'Claras e completas',
    descricao: 'As informações foram bem explicadas e ajudaram na preparação.'
  },
  {
    value: 'suficientes_melhorar',
    label: 'Suficientes, mas poderiam ser melhores',
    descricao: 'Deu para participar, mas algumas orientações poderiam ser mais claras.'
  },
  {
    value: 'faltaram_informacoes',
    label: 'Faltaram informações importantes',
    descricao: 'Senti falta de detalhes antes ou durante a experiência.'
  }
]

const OPCOES_SEGURANCA: OpcaoResposta[] = [
  {
    value: 'muita_seguranca',
    label: 'Sim, passou muita segurança',
    descricao: 'O guia conduziu com domínio, cuidado e atenção.'
  },
  {
    value: 'seguranca_suficiente',
    label: 'Passou segurança suficiente',
    descricao: 'A condução foi adequada para a experiência.'
  },
  {
    value: 'mais_atencao',
    label: 'Poderia ter conduzido com mais atenção',
    descricao: 'Em alguns momentos senti que faltou mais cuidado ou orientação.'
  }
]

const OPCOES_EXPERIENCIA: OpcaoResposta[] = [
  {
    value: 'superou_expectativas',
    label: 'Superou minhas expectativas',
    descricao: 'A experiência foi melhor do que eu imaginava.'
  },
  {
    value: 'atendeu_esperado',
    label: 'Atendeu ao que eu esperava',
    descricao: 'Foi uma boa experiência dentro do esperado.'
  },
  {
    value: 'abaixo_esperado',
    label: 'Ficou abaixo do esperado',
    descricao: 'A experiência poderia ter sido melhor conduzida.'
  }
]

export default function ClienteAvaliarReservaPage() {
  const router = useRouter()
  const params = useParams()
  const iniciouRef = useRef(false)

  const reservaId = String(params?.id || '')

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [reserva, setReserva] = useState<Reserva | null>(null)
  const [roteiro, setRoteiro] = useState<Roteiro | null>(null)
  const [guia, setGuia] = useState<UsuarioBanco | null>(null)
  const [avaliacaoExistente, setAvaliacaoExistente] = useState<Avaliacao | null>(null)

  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  const [nota, setNota] = useState(0)
  const [orientacoes, setOrientacoes] = useState('')
  const [seguranca, setSeguranca] = useState('')
  const [experiencia, setExperiencia] = useState('')
  const [comentario, setComentario] = useState('')

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

      if (parsedUser.tipo !== 'cliente') {
        router.replace('/login')
        return
      }

      setUser(parsedUser)

      await carregarDados(parsedUser)
    } catch (error) {
      console.error('Erro ao iniciar avaliação:', error)
      setErro('Não foi possível carregar a avaliação agora.')
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

  const primeiroNome = (valor?: string | null) => {
    const nome = String(valor || 'Aventureiro').trim()
    return nome.split(' ')[0] || 'Aventureiro'
  }

  const tituloRoteiro = (item?: Roteiro | null) => {
    return item?.titulo || item?.nome || 'Roteiro'
  }

  const guiaIdDoRoteiro = (item?: Roteiro | null) => {
    return item?.id_guia || item?.guia_id || item?.user_id || item?.usuario_id || ''
  }

  const imagemRoteiro = (item?: Roteiro | null) => {
    return item?.foto_capa || item?.foto_url || item?.imagem_url || item?.imagem || ''
  }

  const localRoteiro = (item?: Roteiro | null) => {
    return (
      item?.local ||
      item?.localizacao ||
      item?.local_encontro ||
      item?.ponto_encontro ||
      'Local a confirmar'
    )
  }

  const dataRoteiro = (item?: Roteiro | null) => {
    return item?.data_roteiro || item?.data_saida || item?.data || null
  }

  const horaRoteiro = (item?: Roteiro | null) => {
    return item?.hora_roteiro || item?.hora_saida || item?.hora || ''
  }

  const pagamentoConfirmado = (item?: Reserva | null) => {
    const pagamento = normalizar(item?.pagamento_status)
    const status = normalizar(item?.status)

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

  const textoNota = () => {
    if (nota === 5) return 'Excelente'
    if (nota === 4) return 'Muito bom'
    if (nota === 3) return 'Bom, com pontos a melhorar'
    if (nota === 2) return 'Abaixo do esperado'
    if (nota === 1) return 'Ruim'

    return 'Escolha uma nota'
  }

  const textoResposta = (opcoes: OpcaoResposta[], value?: string | null) => {
    return opcoes.find((opcao) => opcao.value === value)?.label || '-'
  }

  const carregarDados = async (usuario: UsuarioLocal) => {
    if (!reservaId) {
      setErro('Reserva não identificada.')
      return
    }

    const { data: reservaData, error: reservaError } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', reservaId)
      .maybeSingle()

    if (reservaError) {
      console.error('Erro ao buscar reserva:', reservaError)
      setErro('Não foi possível localizar a reserva.')
      return
    }

    if (!reservaData?.id) {
      setErro('Reserva não encontrada.')
      return
    }

    const reservaAtual = reservaData as Reserva

    if (reservaAtual.cliente_id !== usuario.id) {
      setErro('Esta reserva não pertence ao cliente logado.')
      return
    }

    setReserva(reservaAtual)

    if (!pagamentoConfirmado(reservaAtual)) {
      setErro('A avaliação é liberada apenas após pagamento confirmado ou reserva realizada.')
    }

    if (!reservaAtual.roteiro_id) {
      setErro('Reserva sem roteiro vinculado.')
      return
    }

    const { data: roteiroData, error: roteiroError } = await supabase
      .from('roteiros')
      .select('*')
      .eq('id', reservaAtual.roteiro_id)
      .maybeSingle()

    if (roteiroError) {
      console.error('Erro ao buscar roteiro:', roteiroError)
      setErro('Não foi possível carregar o roteiro da reserva.')
      return
    }

    if (!roteiroData?.id) {
      setErro('Roteiro da reserva não encontrado.')
      return
    }

    const roteiroAtual = roteiroData as Roteiro
    setRoteiro(roteiroAtual)

    const guiaId = guiaIdDoRoteiro(roteiroAtual)

    if (guiaId) {
      const { data: guiaData } = await supabase
        .from('users')
        .select('id, nome, name, email, tipo')
        .eq('id', guiaId)
        .maybeSingle()

      if (guiaData) {
        setGuia(guiaData as UsuarioBanco)
      }
    }

    const { data: avaliacaoData, error: avaliacaoError } = await supabase
      .from('avaliacoes')
      .select('*')
      .eq('reserva_id', reservaAtual.id)
      .eq('avaliador_id', usuario.id)
      .eq('tipo_avaliacao', 'cliente_para_guia')
      .maybeSingle()

    if (!avaliacaoError && avaliacaoData?.id) {
      const avaliacao = avaliacaoData as Avaliacao

      setAvaliacaoExistente(avaliacao)
      setNota(Number(avaliacao.nota || 0))
      setOrientacoes(avaliacao.orientacoes || '')
      setSeguranca(avaliacao.seguranca || '')
      setExperiencia(avaliacao.experiencia || '')
      setComentario(avaliacao.comentario || '')
    }
  }

  const validarFormulario = () => {
    if (!reserva?.id) return 'Reserva não carregada.'

    if (!pagamentoConfirmado(reserva)) {
      return 'A avaliação só pode ser enviada após pagamento confirmado ou reserva realizada.'
    }

    if (avaliacaoExistente?.id) {
      return 'Esta experiência já foi avaliada.'
    }

    if (nota < 1 || nota > 5) {
      return 'Escolha uma nota de 1 a 5.'
    }

    if (!orientacoes) {
      return 'Responda como foram as orientações do guia.'
    }

    if (!seguranca) {
      return 'Responda se o guia transmitiu segurança.'
    }

    if (!experiencia) {
      return 'Responda como foi sua experiência geral.'
    }

    return ''
  }

  const enviarAvaliacao = async (event: FormEvent) => {
    event.preventDefault()

    if (!user?.id) {
      router.replace('/login')
      return
    }

    setErro('')
    setMensagem('')

    const erroValidacao = validarFormulario()

    if (erroValidacao) {
      setErro(erroValidacao)
      return
    }

    setEnviando(true)

    try {
      const response = await fetch('/api/avaliacoes/criar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reservaId: reserva?.id,
          avaliadorId: user.id,
          nota,
          orientacoes,
          seguranca,
          experiencia,
          comentario,
          recomenda: nota >= 4
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        setErro(data?.erro || data?.message || 'Não foi possível enviar a avaliação.')
        return
      }

      setMensagem('Avaliação enviada com sucesso. Obrigado por ajudar a melhorar as experiências PrussikTrails.')

      if (data?.avaliacao?.id) {
        setAvaliacaoExistente(data.avaliacao as Avaliacao)
      }

      setTimeout(() => {
        router.push('/cliente/minhas-reservas')
      }, 1300)
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error)
      setErro('Erro ao enviar avaliação.')
    } finally {
      setEnviando(false)
    }
  }

  const renderOpcoes = (
    titulo: string,
    subtitulo: string,
    opcoes: OpcaoResposta[],
    valorAtual: string,
    setValor: (valor: string) => void
  ) => {
    return (
      <section className="questionBlock">
        <div className="questionHeader">
          <h3>{titulo}</h3>
          <p>{subtitulo}</p>
        </div>

        <div className="optionsGrid">
          {opcoes.map((opcao) => (
            <button
              type="button"
              key={opcao.value}
              className={`optionCard ${valorAtual === opcao.value ? 'active' : ''}`}
              onClick={() => {
                if (!avaliacaoExistente?.id) {
                  setValor(opcao.value)
                }
              }}
              disabled={!!avaliacaoExistente?.id}
            >
              <strong>{opcao.label}</strong>
              <span>{opcao.descricao}</span>
            </button>
          ))}
        </div>
      </section>
    )
  }

  if (carregando) {
    return (
      <main className="loading">
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
            height: 68px;
            width: auto;
            margin-bottom: 12px;
          }
        `}</style>

        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>Preparando avaliação...</div>
        </div>
      </main>
    )
  }

  const foto = imagemRoteiro(roteiro)
  const avaliacaoBloqueada = !!avaliacaoExistente?.id
  const podeAvaliar = !!reserva?.id && pagamentoConfirmado(reserva) && !avaliacaoBloqueada

  return (
    <main className="page">
      <style>{`
        * {
          box-sizing: border-box;
        }

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
            radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.16), transparent 28%),
            radial-gradient(circle at 90% 10%, rgba(251, 146, 60, 0.14), transparent 28%),
            linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
          color: #172018;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(255, 253, 247, 0.86);
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
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
          font-size: 18px;
          font-weight: 950;
          color: #dc2626;
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .brandSub {
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          margin-top: 3px;
        }

        .headerActions {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .iconBtn {
          height: 38px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(255,255,255,0.78);
          border-radius: 999px;
          padding: 0 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          font-weight: 900;
          transition: 0.2s ease;
          color: #172018;
          white-space: nowrap;
        }

        .iconBtn.primary {
          background: #172018;
          color: #ffffff;
          border-color: #172018;
        }

        .iconBtn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
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
          min-height: 310px;
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
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: 24px;
          align-items: end;
          min-height: 245px;
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
          max-width: 780px;
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
          border-radius: 30px;
          padding: 20px;
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
          margin-top: 9px;
          color: #ffffff;
          font-size: 32px;
          line-height: 1.05;
          font-weight: 950;
          letter-spacing: -0.07em;
        }

        .heroCardText {
          margin-top: 8px;
          color: rgba(255,255,255,0.78);
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
        }

        .alert {
          border-radius: 18px;
          padding: 13px 15px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.45;
        }

        .alert.success {
          background: #ecfdf5;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .alert.error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .mainGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 16px;
          align-items: start;
        }

        .panel {
          background: rgba(255,255,255,0.90);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 32px;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.07);
          overflow: hidden;
        }

        .panelHeader {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
        }

        .panelTitle {
          margin: 0;
          color: #172018;
          font-size: 20px;
          line-height: 1.15;
          font-weight: 950;
          letter-spacing: -0.045em;
        }

        .panelSub {
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.45;
          margin-top: 4px;
        }

        .panelBody {
          padding: 18px;
        }

        .ratingBox {
          background:
            radial-gradient(circle at top right, rgba(190, 242, 100, 0.18), transparent 38%),
            #172018;
          color: #ffffff;
          border-radius: 30px;
          padding: 22px;
          margin-bottom: 16px;
        }

        .ratingLabel {
          color: rgba(255,255,255,0.70);
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.10em;
        }

        .stars {
          display: flex;
          gap: 6px;
          margin-top: 14px;
          flex-wrap: wrap;
        }

        .starBtn {
          width: 48px;
          height: 48px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.20);
          background: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.55);
          font-size: 24px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .starBtn.active {
          background: #bef264;
          color: #172018;
          border-color: #bef264;
          box-shadow: 0 10px 24px rgba(190, 242, 100, 0.25);
        }

        .starBtn:disabled {
          cursor: not-allowed;
          opacity: 0.72;
        }

        .ratingText {
          color: rgba(255,255,255,0.82);
          font-size: 13px;
          font-weight: 800;
          line-height: 1.45;
          margin-top: 12px;
        }

        .questionBlock {
          padding: 18px 0;
          border-top: 1px solid rgba(15, 23, 42, 0.06);
        }

        .questionBlock:first-of-type {
          border-top: none;
          padding-top: 0;
        }

        .questionHeader h3 {
          margin: 0;
          color: #172018;
          font-size: 17px;
          line-height: 1.2;
          font-weight: 950;
          letter-spacing: -0.035em;
        }

        .questionHeader p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 700;
        }

        .optionsGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 13px;
        }

        .optionCard {
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: #fffdf7;
          border-radius: 22px;
          padding: 14px;
          cursor: pointer;
          text-align: left;
          transition: 0.2s ease;
        }

        .optionCard:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
        }

        .optionCard.active {
          background: #f0fdf4;
          border-color: #16a34a;
          box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.08);
        }

        .optionCard:disabled {
          cursor: not-allowed;
          opacity: 0.9;
        }

        .optionCard strong {
          display: block;
          color: #172018;
          font-size: 13px;
          line-height: 1.25;
          font-weight: 950;
        }

        .optionCard span {
          display: block;
          color: #64748b;
          font-size: 11px;
          line-height: 1.42;
          font-weight: 700;
          margin-top: 5px;
        }

        .textarea {
          width: 100%;
          min-height: 135px;
          resize: vertical;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: #fffdf7;
          border-radius: 22px;
          padding: 14px 15px;
          outline: none;
          color: #172018;
          font-size: 14px;
          line-height: 1.55;
          font-weight: 750;
        }

        .textarea:focus {
          border-color: #84cc16;
          box-shadow: 0 0 0 4px rgba(132, 204, 22, 0.12);
        }

        .textarea:disabled {
          opacity: 0.8;
          cursor: not-allowed;
        }

        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .btn {
          border: none;
          border-radius: 999px;
          padding: 14px 18px;
          font-size: 13px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.10);
        }

        .btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .btn.primary {
          background: #16a34a;
          color: #ffffff;
        }

        .btn.dark {
          background: #172018;
          color: #ffffff;
        }

        .btn.light {
          background: #eef2e5;
          color: #475569;
        }

        .sideCard {
          background: rgba(255,255,255,0.90);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 32px;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.07);
          overflow: hidden;
        }

        .imageBox {
          height: 230px;
          background:
            radial-gradient(circle at top right, rgba(251, 146, 60, 0.20), transparent 38%),
            linear-gradient(135deg, #dbe7c8, #aebf8d);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-weight: 950;
          overflow: hidden;
        }

        .imageBox img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .sideBody {
          padding: 18px;
        }

        .routeTitle {
          margin: 0;
          color: #172018;
          font-size: 24px;
          line-height: 1.08;
          font-weight: 950;
          letter-spacing: -0.055em;
        }

        .routeMeta {
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
          font-weight: 750;
          margin-top: 8px;
        }

        .infoRows {
          display: grid;
          gap: 9px;
          margin-top: 16px;
        }

        .infoRow {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          background: #fffdf7;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 18px;
          padding: 11px 12px;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
        }

        .infoRow strong {
          color: #172018;
          text-align: right;
        }

        .existingBox {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
          border-radius: 24px;
          padding: 15px;
          font-size: 13px;
          line-height: 1.5;
          font-weight: 800;
          margin-bottom: 16px;
        }

        .summaryBox {
          background: #fffdf7;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 24px;
          padding: 15px;
          margin-top: 16px;
        }

        .summaryTitle {
          color: #172018;
          font-size: 14px;
          font-weight: 950;
        }

        .summaryLine {
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
          margin-top: 7px;
        }

        @media (max-width: 1040px) {
          .heroContent,
          .mainGrid {
            grid-template-columns: 1fr;
          }

          .optionsGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .header {
            padding: 9px 12px;
          }

          .brandTitle,
          .brandSub {
            display: none;
          }

          .headerActions .hideMobile {
            display: none;
          }

          .container {
            padding: 16px 12px 42px;
          }

          .hero,
          .panel,
          .sideCard {
            border-radius: 28px;
          }

          .hero {
            padding: 22px;
            min-height: auto;
          }

          .heroContent {
            min-height: auto;
          }

          .actions {
            display: grid;
          }

          .btn {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .heroTitle {
            font-size: 40px;
          }

          .brand img {
            height: 38px;
          }

          .starBtn {
            width: 44px;
            height: 44px;
            border-radius: 16px;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <div
            className="brand"
            onClick={() => router.push('/cliente/dashboard')}
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />

            <div>
              <div className="brandTitle">PrussikTrails</div>
              <div className="brandSub">Avaliação da experiência</div>
            </div>
          </div>

          <div className="headerActions">
            <button
              type="button"
              className="iconBtn hideMobile"
              onClick={() => router.push('/cliente/minhas-reservas')}
            >
              Reservas
            </button>

            <button
              type="button"
              className="iconBtn primary"
              onClick={() => router.push('/cliente/perfil')}
            >
              Perfil
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroContent">
            <div>
              <div className="eyebrow">Avaliação do guia</div>

              <h1 className="heroTitle">
                {primeiroNome(nomeUsuario(user))}, como foi sua <span>experiência?</span>
              </h1>

              <p className="heroText">
                Sua avaliação ajuda outros aventureiros, fortalece os bons guias e melhora a qualidade das próximas jornadas.
              </p>
            </div>

            <aside className="heroCard">
              <div className="heroCardLabel">Guia avaliado</div>
              <div className="heroCardValue">
                {nomeUsuario(guia)}
              </div>
              <div className="heroCardText">
                A avaliação fica vinculada à reserva, ao roteiro e ao guia.
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

        <section className="mainGrid">
          <form className="panel" onSubmit={enviarAvaliacao}>
            <div className="panelHeader">
              <h2 className="panelTitle">Avalie a condução do guia</h2>
              <div className="panelSub">
                São apenas três perguntas objetivas, uma nota geral e um campo opcional de observação.
              </div>
            </div>

            <div className="panelBody">
              {avaliacaoBloqueada && (
                <div className="existingBox">
                  Esta experiência já foi avaliada. Abaixo você pode visualizar as respostas enviadas.
                </div>
              )}

              <section className="ratingBox">
                <div className="ratingLabel">Nota geral</div>

                <div className="stars">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`starBtn ${nota >= item ? 'active' : ''}`}
                      onClick={() => {
                        if (!avaliacaoBloqueada) {
                          setNota(item)
                        }
                      }}
                      disabled={avaliacaoBloqueada}
                      aria-label={`Nota ${item}`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <div className="ratingText">
                  {textoNota()}
                </div>
              </section>

              {renderOpcoes(
                '1. Como foram as orientações do guia?',
                'Avalie se as informações foram claras antes e durante a experiência.',
                OPCOES_ORIENTACOES,
                orientacoes,
                setOrientacoes
              )}

              {renderOpcoes(
                '2. O guia transmitiu segurança durante a experiência?',
                'Segurança é um valor central do PrussikTrails.',
                OPCOES_SEGURANCA,
                seguranca,
                setSeguranca
              )}

              {renderOpcoes(
                '3. Como foi sua experiência geral com o guia?',
                'Conte de forma objetiva como a condução correspondeu às suas expectativas.',
                OPCOES_EXPERIENCIA,
                experiencia,
                setExperiencia
              )}

              <section className="questionBlock">
                <div className="questionHeader">
                  <h3>Observação</h3>
                  <p>
                    Campo opcional. Conte em poucas palavras o que mais gostou ou o que poderia melhorar.
                  </p>
                </div>

                <textarea
                  className="textarea"
                  value={comentario}
                  onChange={(event) => setComentario(event.target.value)}
                  disabled={avaliacaoBloqueada}
                  placeholder="Ex.: O guia foi atencioso, explicou bem o percurso e passou segurança durante toda a experiência."
                  maxLength={1200}
                />
              </section>

              <div className="actions">
                {!avaliacaoBloqueada && (
                  <button
                    type="submit"
                    className="btn primary"
                    disabled={enviando || !podeAvaliar}
                  >
                    {enviando ? 'Enviando avaliação...' : 'Enviar avaliação'}
                  </button>
                )}

                <button
                  type="button"
                  className="btn light"
                  onClick={() => router.push('/cliente/minhas-reservas')}
                >
                  Voltar para reservas
                </button>

                {reserva?.id && pagamentoConfirmado(reserva) && (
                  <button
                    type="button"
                    className="btn dark"
                    onClick={() => router.push('/cliente/grupos')}
                  >
                    Meus grupos
                  </button>
                )}
              </div>
            </div>
          </form>

          <aside className="sideCard">
            <div className="imageBox">
              {foto ? (
                <img src={foto} alt={tituloRoteiro(roteiro)} />
              ) : (
                'Roteiro'
              )}
            </div>

            <div className="sideBody">
              <h2 className="routeTitle">
                {tituloRoteiro(roteiro)}
              </h2>

              <div className="routeMeta">
                {localRoteiro(roteiro)}
                <br />
                Guia: {nomeUsuario(guia)}
              </div>

              <div className="infoRows">
                <div className="infoRow">
                  <span>Data</span>
                  <strong>{formatarData(dataRoteiro(roteiro))}</strong>
                </div>

                <div className="infoRow">
                  <span>Hora</span>
                  <strong>{horaRoteiro(roteiro) || '-'}</strong>
                </div>

                <div className="infoRow">
                  <span>Pessoas</span>
                  <strong>{reserva?.quantidade_pessoas || 1}</strong>
                </div>

                <div className="infoRow">
                  <span>Valor</span>
                  <strong>{formatarMoeda(reserva?.valor_total || 0)}</strong>
                </div>

                <div className="infoRow">
                  <span>Status</span>
                  <strong>{reserva?.status || '-'}</strong>
                </div>

                <div className="infoRow">
                  <span>Pagamento</span>
                  <strong>{reserva?.pagamento_status || '-'}</strong>
                </div>
              </div>

              {(nota > 0 || orientacoes || seguranca || experiencia) && (
                <div className="summaryBox">
                  <div className="summaryTitle">Resumo da avaliação</div>

                  <div className="summaryLine">
                    <strong>Nota:</strong> {nota || '-'} de 5
                  </div>

                  <div className="summaryLine">
                    <strong>Orientações:</strong> {textoResposta(OPCOES_ORIENTACOES, orientacoes)}
                  </div>

                  <div className="summaryLine">
                    <strong>Segurança:</strong> {textoResposta(OPCOES_SEGURANCA, seguranca)}
                  </div>

                  <div className="summaryLine">
                    <strong>Experiência:</strong> {textoResposta(OPCOES_EXPERIENCIA, experiencia)}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}