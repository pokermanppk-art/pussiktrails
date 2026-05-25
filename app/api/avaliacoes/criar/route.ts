import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

type CriarAvaliacaoBody = {
  reservaId?: string
  reserva_id?: string
  clienteId?: string
  cliente_id?: string
  avaliadorId?: string
  avaliador_id?: string
  nota?: number | string
  orientacoes?: string
  seguranca?: string
  experiencia?: string
  comentario?: string
  observacao?: string
  recomenda?: boolean
}

const ORIENTACOES_VALIDAS = [
  'claras_completas',
  'suficientes_melhorar',
  'faltaram_informacoes'
]

const SEGURANCA_VALIDA = [
  'muita_seguranca',
  'seguranca_suficiente',
  'mais_atencao'
]

const EXPERIENCIA_VALIDA = [
  'superou_expectativas',
  'atendeu_esperado',
  'abaixo_esperado'
]

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function getSupabaseAdmin() {
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ausente no ambiente.')
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente no ambiente.')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

function limparTexto(valor: any) {
  return String(valor || '').trim()
}

function normalizar(valor: any) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function uuidValido(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor
  )
}

function pagamentoConfirmado(reserva: any) {
  const pagamento = normalizar(reserva?.pagamento_status)
  const status = normalizar(reserva?.status)

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

function guiaIdDoRoteiro(roteiro: any) {
  return (
    roteiro?.id_guia ||
    roteiro?.guia_id ||
    roteiro?.user_id ||
    roteiro?.usuario_id ||
    ''
  )
}

function tituloDoRoteiro(roteiro: any) {
  return roteiro?.titulo || roteiro?.nome || 'Roteiro PrussikTrails'
}

function extrairColunaAusente(error: any) {
  const texto = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')

  const matchAspas = texto.match(/'([^']+)'/)

  if (matchAspas?.[1]) return matchAspas[1]

  const matchColumn = texto.match(/column\s+([a-zA-Z0-9_]+)/i)

  if (matchColumn?.[1]) return matchColumn[1]

  return ''
}

function erroDeColunaAusente(error: any) {
  const texto = String(
    error?.message ||
      error?.details ||
      error?.hint ||
      ''
  ).toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    texto.includes('could not find') ||
    texto.includes('schema cache') ||
    texto.includes('column')
  )
}

async function buscarReserva(supabase: any, reservaId: string) {
  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .eq('id', reservaId)
    .maybeSingle()

  if (error) throw error

  return data || null
}

async function buscarRoteiro(supabase: any, roteiroId: string) {
  const { data, error } = await supabase
    .from('roteiros')
    .select('*')
    .eq('id', roteiroId)
    .maybeSingle()

  if (error) throw error

  return data || null
}

async function buscarUsuario(supabase: any, userId: string) {
  if (!userId) return null

  const { data, error } = await supabase
    .from('users')
    .select('id, nome, name, email, tipo')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.warn('Aviso ao buscar usuário:', error)
    return null
  }

  return data || null
}

async function buscarAvaliacaoExistente(
  supabase: any,
  params: {
    reservaId: string
    avaliadorId: string
    tipoAvaliacao: string
  }
) {
  const { data, error } = await supabase
    .from('avaliacoes')
    .select('*')
    .eq('reserva_id', params.reservaId)
    .eq('avaliador_id', params.avaliadorId)
    .eq('tipo_avaliacao', params.tipoAvaliacao)
    .maybeSingle()

  if (error) throw error

  return data || null
}

async function inserirAvaliacaoComFallback(
  supabase: any,
  payloadOriginal: Record<string, any>
) {
  let payloadAtual = { ...payloadOriginal }
  const colunasIgnoradas: string[] = []

  for (let tentativa = 0; tentativa < 20; tentativa++) {
    const { data, error } = await supabase
      .from('avaliacoes')
      .insert(payloadAtual)
      .select('*')
      .maybeSingle()

    if (!error) {
      return {
        data,
        colunasIgnoradas
      }
    }

    if (error?.code === '23505') {
      throw new Error('Esta reserva já foi avaliada por este cliente.')
    }

    if (!erroDeColunaAusente(error)) {
      throw error
    }

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payloadAtual)) {
      throw error
    }

    delete payloadAtual[coluna]
    colunasIgnoradas.push(coluna)
  }

  throw new Error('Não foi possível salvar a avaliação.')
}

function validarNota(valor: any) {
  const nota = Number(valor)

  if (!Number.isFinite(nota)) return 0

  return Math.round(nota)
}

function validarResposta(
  valor: string,
  permitidas: string[],
  nomeCampo: string
) {
  const limpo = limparTexto(valor)

  if (!limpo) {
    return {
      ok: false,
      erro: `Informe a resposta de ${nomeCampo}.`
    }
  }

  if (!permitidas.includes(limpo)) {
    return {
      ok: false,
      erro: `Resposta inválida para ${nomeCampo}.`
    }
  }

  return {
    ok: true,
    valor: limpo
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = (await request.json().catch(() => ({}))) as CriarAvaliacaoBody

    const reservaId = limparTexto(body.reservaId || body.reserva_id)
    const clienteId = limparTexto(body.clienteId || body.cliente_id)
    const avaliadorId = limparTexto(body.avaliadorId || body.avaliador_id || clienteId)

    const nota = validarNota(body.nota)
    const orientacoes = limparTexto(body.orientacoes)
    const seguranca = limparTexto(body.seguranca)
    const experiencia = limparTexto(body.experiencia)
    const comentario = limparTexto(body.comentario || body.observacao)
    const recomenda =
      typeof body.recomenda === 'boolean'
        ? body.recomenda
        : nota >= 4

    if (!reservaId || !uuidValido(reservaId)) {
      return json(
        {
          sucesso: false,
          erro: 'Informe uma reserva válida.'
        },
        400
      )
    }

    if (!avaliadorId || !uuidValido(avaliadorId)) {
      return json(
        {
          sucesso: false,
          erro: 'Informe o cliente avaliador.'
        },
        400
      )
    }

    if (nota < 1 || nota > 5) {
      return json(
        {
          sucesso: false,
          erro: 'A nota deve ser entre 1 e 5.'
        },
        400
      )
    }

    const orientacoesValidada = validarResposta(
      orientacoes,
      ORIENTACOES_VALIDAS,
      'orientações'
    )

    if (!orientacoesValidada.ok) {
      return json(
        {
          sucesso: false,
          erro: orientacoesValidada.erro
        },
        400
      )
    }

    const segurancaValidada = validarResposta(
      seguranca,
      SEGURANCA_VALIDA,
      'segurança'
    )

    if (!segurancaValidada.ok) {
      return json(
        {
          sucesso: false,
          erro: segurancaValidada.erro
        },
        400
      )
    }

    const experienciaValidada = validarResposta(
      experiencia,
      EXPERIENCIA_VALIDA,
      'experiência'
    )

    if (!experienciaValidada.ok) {
      return json(
        {
          sucesso: false,
          erro: experienciaValidada.erro
        },
        400
      )
    }

    const reserva = await buscarReserva(supabase, reservaId)

    if (!reserva?.id) {
      return json(
        {
          sucesso: false,
          erro: 'Reserva não encontrada.'
        },
        404
      )
    }

    if (!reserva.cliente_id) {
      return json(
        {
          sucesso: false,
          erro: 'Reserva sem cliente vinculado.'
        },
        400
      )
    }

    if (reserva.cliente_id !== avaliadorId) {
      return json(
        {
          sucesso: false,
          erro: 'Esta reserva não pertence ao cliente avaliador informado.'
        },
        403
      )
    }

    if (!pagamentoConfirmado(reserva)) {
      return json(
        {
          sucesso: false,
          erro: 'A avaliação só é liberada após pagamento confirmado ou reserva realizada.',
          reserva: {
            id: reserva.id,
            status: reserva.status,
            pagamento_status: reserva.pagamento_status
          }
        },
        403
      )
    }

    if (!reserva.roteiro_id) {
      return json(
        {
          sucesso: false,
          erro: 'Reserva sem roteiro vinculado.'
        },
        400
      )
    }

    const roteiro = await buscarRoteiro(supabase, reserva.roteiro_id)

    if (!roteiro?.id) {
      return json(
        {
          sucesso: false,
          erro: 'Roteiro da reserva não encontrado.'
        },
        404
      )
    }

    const guiaId = limparTexto(guiaIdDoRoteiro(roteiro))

    if (!guiaId) {
      return json(
        {
          sucesso: false,
          erro: 'Roteiro sem guia vinculado.'
        },
        400
      )
    }

    const tipoAvaliacao = 'cliente_para_guia'

    const avaliacaoExistente = await buscarAvaliacaoExistente(supabase, {
      reservaId: reserva.id,
      avaliadorId,
      tipoAvaliacao
    })

    if (avaliacaoExistente?.id) {
      return json(
        {
          sucesso: false,
          erro: 'Esta experiência já foi avaliada.',
          avaliacao: {
            id: avaliacaoExistente.id,
            nota: avaliacaoExistente.nota,
            created_at: avaliacaoExistente.created_at
          }
        },
        409
      )
    }

    const cliente = await buscarUsuario(supabase, reserva.cliente_id)
    const guia = await buscarUsuario(supabase, guiaId)

    const respostas = {
      orientacoes,
      seguranca,
      experiencia,
      perguntas: {
        orientacoes: 'Como foram as orientações do guia?',
        seguranca: 'O guia transmitiu segurança durante a experiência?',
        experiencia: 'Como foi sua experiência geral com o guia?'
      }
    }

    const agora = new Date().toISOString()

    const payload: Record<string, any> = {
      reserva_id: reserva.id,
      roteiro_id: roteiro.id,
      guia_id: guiaId,
      cliente_id: reserva.cliente_id,

      avaliador_id: avaliadorId,
      avaliado_id: guiaId,

      tipo_avaliacao: tipoAvaliacao,

      nota,
      orientacoes,
      seguranca,
      experiencia,
      respostas,

      comentario: comentario || null,
      recomenda,

      status: 'publicada',

      created_at: agora,
      updated_at: agora
    }

    const resultado = await inserirAvaliacaoComFallback(supabase, payload)

    return json({
      sucesso: true,
      mensagem: 'Avaliação enviada com sucesso.',
      avaliacao: {
        id: resultado.data?.id,
        reserva_id: reserva.id,
        roteiro_id: roteiro.id,
        roteiro_titulo: tituloDoRoteiro(roteiro),
        guia_id: guiaId,
        guia_nome: guia?.nome || guia?.name || guia?.email || 'Guia',
        cliente_id: reserva.cliente_id,
        cliente_nome: cliente?.nome || cliente?.name || cliente?.email || 'Cliente',
        nota,
        orientacoes,
        seguranca,
        experiencia,
        comentario: comentario || null,
        recomenda,
        status: resultado.data?.status || 'publicada',
        created_at: resultado.data?.created_at || agora
      },
      colunasIgnoradas: resultado.colunasIgnoradas
    })
  } catch (error: any) {
    console.error('Erro em /api/avaliacoes/criar:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao criar avaliação.'
      },
      500
    )
  }
}

export async function GET() {
  return json({
    sucesso: true,
    rota: '/api/avaliacoes/criar',
    metodo: 'POST',
    mensagem:
      'Rota ativa. Envie reservaId, avaliadorId, nota, orientacoes, seguranca, experiencia e comentario opcional.'
  })
}