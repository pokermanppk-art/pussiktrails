import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AnyRecord = Record<string, any>

type NotificacaoStatus = {
  id: string
  tipo: 'legal' | 'versao' | 'movimento' | 'reserva' | 'grupo' | 'sistema'
  titulo: string
  descricao: string
  prioridade: 'baixa' | 'normal' | 'alta' | 'critica'
  acao?: string
  href?: string
  count?: number
  metadata?: AnyRecord
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const CONTEXTO_ACEITE_RETROATIVO = 'login_retroativo_2026_06_26'

const DOCUMENTOS_BASE = [
  'termos_uso',
  'politica_privacidade',
  'politica_cookies',
]

const DOCUMENTOS_GUIA = [
  ...DOCUMENTOS_BASE,
  'termo_guia',
]

function json(data: AnyRecord, status = 200) {
  return NextResponse.json(data, { status })
}

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function tipoNormalizado(valor: unknown) {
  return texto(valor).toLowerCase()
}

function admin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Variáveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes.')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function codigoDoAceite(aceite: AnyRecord) {
  return (
    texto(aceite.codigo_documento) ||
    texto(aceite.documento_codigo) ||
    texto(aceite.documento) ||
    texto(aceite.tipo_documento)
  )
}

function erroTabelaOuColunaAusente(error: AnyRecord) {
  const mensagem = texto(error?.message || error?.details || error?.hint).toLowerCase()

  return (
    error?.code === '42P01' || // tabela inexistente
    error?.code === '42703' || // coluna inexistente
    error?.code === 'PGRST204' ||
    mensagem.includes('does not exist') ||
    mensagem.includes('schema cache') ||
    mensagem.includes('could not find') ||
    mensagem.includes('column') ||
    mensagem.includes('relation')
  )
}

function documentosObrigatorios(tipoUsuario: string) {
  if (tipoUsuario === 'guia') return DOCUMENTOS_GUIA
  return DOCUMENTOS_BASE
}

async function buscarAceitePendente(
  supabase: ReturnType<typeof admin>,
  userId: string,
  tipoUsuario: string
): Promise<NotificacaoStatus | null> {
  if (!userId) return null
  if (tipoUsuario === 'admin') return null

  const documentos = documentosObrigatorios(tipoUsuario)

  const { data, error } = await supabase
    .from('aceites_legais')
    .select('id,documento_codigo,codigo_documento,documento,documento_versao,tipo_documento,contexto,created_at,aceito_em')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    throw error
  }

  const lista = Array.isArray(data) ? data : []

  const temAceiteRetroativo = lista.some(
    (aceite) => texto(aceite.contexto) === CONTEXTO_ACEITE_RETROATIVO
  )

  if (temAceiteRetroativo) return null

  const codigosAceitos = new Set(lista.map(codigoDoAceite).filter(Boolean))
  const pendentes = documentos.filter((codigo) => !codigosAceitos.has(codigo))

  if (pendentes.length === 0) return null

  return {
    id: 'legal-aceite-pendente',
    tipo: 'legal',
    titulo: 'Confirmação legal pendente',
    descricao:
      tipoUsuario === 'guia'
        ? 'Confirme os Termos, a Política de Privacidade, a Política de Cookies e o Termo do Guia.'
        : 'Confirme os Termos, a Política de Privacidade e a Política de Cookies.',
    prioridade: 'critica',
    acao: 'Confirmar agora',
    href: '/termos',
    count: 1,
    metadata: {
      documentos_pendentes: pendentes,
      contexto: CONTEXTO_ACEITE_RETROATIVO,
    },
  }
}

async function buscarNotificacoesApp(
  supabase: ReturnType<typeof admin>,
  userId: string,
  tipoUsuario: string
): Promise<NotificacaoStatus[]> {
  /*
    Tabela opcional para o próximo passo:
    public.notificacoes_app

    Se a tabela ainda não existir, a API ignora sem quebrar.
  */
  if (!userId) return []

  const { data, error } = await supabase
    .from('notificacoes_app')
    .select('id,tipo,titulo,descricao,prioridade,acao,href,lida,metadata,created_at')
    .eq('user_id', userId)
    .eq('lida', false)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    if (erroTabelaOuColunaAusente(error)) return []
    throw error
  }

  const lista = Array.isArray(data) ? data : []

  return lista.map((item) => ({
    id: texto(item.id) || `notificacao-${Math.random().toString(36).slice(2)}`,
    tipo: (texto(item.tipo) as NotificacaoStatus['tipo']) || 'sistema',
    titulo: texto(item.titulo) || 'Nova notificação',
    descricao: texto(item.descricao) || 'Há uma nova atualização para você.',
    prioridade: (texto(item.prioridade) as NotificacaoStatus['prioridade']) || 'normal',
    acao: texto(item.acao) || 'Ver',
    href: texto(item.href) || undefined,
    count: 1,
    metadata: item.metadata || {},
  }))
}

async function buscarMovimentosReservasCliente(
  supabase: ReturnType<typeof admin>,
  userId: string,
  tipoUsuario: string
): Promise<NotificacaoStatus | null> {
  /*
    Movimento inicial para cliente:
    se houver reserva paga/confirmada recente que ainda não foi marcada como lida
    em uma tabela própria, preferimos notificacoes_app. Esta função tenta um resumo
    leve em reservas sem exigir novas colunas. Se a tabela/coluna não existir, ignora.
  */
  if (!userId || tipoUsuario !== 'cliente') return null

  const { data, error } = await supabase
    .from('reservas')
    .select('id,status,created_at')
    .eq('cliente_id', userId)
    .in('status', ['paga', 'pago', 'confirmada', 'confirmado'])
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    if (erroTabelaOuColunaAusente(error)) return null
    throw error
  }

  const total = Array.isArray(data) ? data.length : 0

  if (total <= 0) return null

  return {
    id: 'cliente-reservas-recentes',
    tipo: 'reserva',
    titulo: total === 1 ? 'Reserva confirmada' : 'Reservas confirmadas',
    descricao:
      total === 1
        ? 'Há uma reserva confirmada na sua conta.'
        : `Há ${total} reservas confirmadas recentes na sua conta.`,
    prioridade: 'normal',
    acao: 'Ver reservas',
    href: '/cliente/reservas',
    count: total,
    metadata: {
      origem: 'reservas',
    },
  }
}

async function buscarMovimentosReservasGuia(
  supabase: ReturnType<typeof admin>,
  userId: string,
  tipoUsuario: string
): Promise<NotificacaoStatus | null> {
  /*
    Movimento inicial para guia:
    tenta localizar reservas pagas/confirmadas relacionadas a roteiros do guia.
    Se a estrutura real for diferente, a função ignora sem quebrar.
  */
  if (!userId || tipoUsuario !== 'guia') return null

  const { data: roteiros, error: erroRoteiros } = await supabase
    .from('roteiros')
    .select('id')
    .eq('guia_id', userId)
    .limit(100)

  if (erroRoteiros) {
    if (erroTabelaOuColunaAusente(erroRoteiros)) return null
    throw erroRoteiros
  }

  const roteiroIds = Array.isArray(roteiros)
    ? roteiros.map((roteiro) => texto(roteiro.id)).filter(Boolean)
    : []

  if (roteiroIds.length === 0) return null

  const { data, error } = await supabase
    .from('reservas')
    .select('id,status,created_at,roteiro_id')
    .in('roteiro_id', roteiroIds)
    .in('status', ['paga', 'pago', 'confirmada', 'confirmado'])
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    if (erroTabelaOuColunaAusente(error)) return null
    throw error
  }

  const total = Array.isArray(data) ? data.length : 0

  if (total <= 0) return null

  return {
    id: 'guia-reservas-recentes',
    tipo: 'reserva',
    titulo: total === 1 ? 'Nova reserva confirmada' : 'Novas reservas confirmadas',
    descricao:
      total === 1
        ? 'Há uma reserva confirmada em um dos seus roteiros.'
        : `Há ${total} reservas confirmadas recentes nos seus roteiros.`,
    prioridade: 'normal',
    acao: 'Ver reservas',
    href: '/guia/reservas',
    count: total,
    metadata: {
      origem: 'reservas',
    },
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const supabase = admin()

    const userId = texto(url.searchParams.get('userId') || url.searchParams.get('user_id'))
    const tipoUsuario = tipoNormalizado(
      url.searchParams.get('tipoUsuario') ||
        url.searchParams.get('tipo_usuario') ||
        url.searchParams.get('tipo')
    )

    if (!userId) {
      return json({
        sucesso: true,
        total: 0,
        badge: 0,
        notificacoes: [],
        avisos: ['userId não informado.'],
      })
    }

    const notificacoes: NotificacaoStatus[] = []

    const aceitePendente = await buscarAceitePendente(supabase, userId, tipoUsuario)
    if (aceitePendente) notificacoes.push(aceitePendente)

    const notificacoesApp = await buscarNotificacoesApp(supabase, userId, tipoUsuario)
    notificacoes.push(...notificacoesApp)

    const movimentoCliente = await buscarMovimentosReservasCliente(supabase, userId, tipoUsuario)
    if (movimentoCliente) notificacoes.push(movimentoCliente)

    const movimentoGuia = await buscarMovimentosReservasGuia(supabase, userId, tipoUsuario)
    if (movimentoGuia) notificacoes.push(movimentoGuia)

    const total = notificacoes.reduce((soma, item) => soma + Math.max(1, Number(item.count || 1)), 0)

    return json({
      sucesso: true,
      userId,
      tipoUsuario,
      total,
      badge: total,
      notificacoes,
      generatedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Erro em /api/notificacoes/status:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro ao carregar status de notificações.',
        total: 0,
        badge: 0,
        notificacoes: [],
      },
      500
    )
  }
}
