import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

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
  respostas?: any
  comentario?: string | null
  recomenda?: boolean | null
  status?: string | null
  created_at?: string | null
}

type Usuario = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
  tipo?: string | null
}

type Roteiro = {
  id: string
  titulo?: string | null
  nome?: string | null
  local?: string | null
  localizacao?: string | null
  foto_capa?: string | null
  foto_url?: string | null
  imagem_url?: string | null
  imagem?: string | null
}

const LABELS_ORIENTACOES: Record<string, string> = {
  claras_completas: 'Claras e completas',
  suficientes_melhorar: 'Suficientes, mas poderiam ser melhores',
  faltaram_informacoes: 'Faltaram informações importantes'
}

const LABELS_SEGURANCA: Record<string, string> = {
  muita_seguranca: 'Passou muita segurança',
  seguranca_suficiente: 'Passou segurança suficiente',
  mais_atencao: 'Poderia ter conduzido com mais atenção'
}

const LABELS_EXPERIENCIA: Record<string, string> = {
  superou_expectativas: 'Superou expectativas',
  atendeu_esperado: 'Atendeu ao esperado',
  abaixo_esperado: 'Ficou abaixo do esperado'
}

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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
    valor
  )
}

function arredondar(valor: number, casas = 1) {
  if (!Number.isFinite(valor)) return 0

  const fator = Math.pow(10, casas)

  return Math.round(valor * fator) / fator
}

function percentual(valor: number, total: number) {
  if (!total) return 0

  return arredondar((valor / total) * 100, 1)
}

function nomeUsuario(usuario?: Usuario | null) {
  return usuario?.nome || usuario?.name || usuario?.email || 'Usuário'
}

function tituloRoteiro(roteiro?: Roteiro | null) {
  return roteiro?.titulo || roteiro?.nome || 'Roteiro'
}

function imagemRoteiro(roteiro?: Roteiro | null) {
  return roteiro?.foto_capa || roteiro?.foto_url || roteiro?.imagem_url || roteiro?.imagem || ''
}

function localRoteiro(roteiro?: Roteiro | null) {
  return roteiro?.local || roteiro?.localizacao || 'Local a confirmar'
}

function contarPorCampo(
  avaliacoes: Avaliacao[],
  campo: 'orientacoes' | 'seguranca' | 'experiencia',
  labels: Record<string, string>
) {
  const chaves = Object.keys(labels)

  const resultado = chaves.map((chave) => {
    const quantidade = avaliacoes.filter((avaliacao) => avaliacao[campo] === chave).length

    return {
      chave,
      label: labels[chave],
      quantidade,
      percentual: percentual(quantidade, avaliacoes.length)
    }
  })

  return resultado
}

function contarNotas(avaliacoes: Avaliacao[]) {
  return [5, 4, 3, 2, 1].map((nota) => {
    const quantidade = avaliacoes.filter((avaliacao) => Number(avaliacao.nota || 0) === nota).length

    return {
      nota,
      quantidade,
      percentual: percentual(quantidade, avaliacoes.length)
    }
  })
}

function calcularResumo(avaliacoes: Avaliacao[]) {
  const total = avaliacoes.length

  const somaNotas = avaliacoes.reduce(
    (totalNota, avaliacao) => totalNota + Number(avaliacao.nota || 0),
    0
  )

  const mediaNota = total > 0 ? arredondar(somaNotas / total, 2) : 0

  const notasAltas = avaliacoes.filter((avaliacao) => Number(avaliacao.nota || 0) >= 4).length
  const notasBaixas = avaliacoes.filter((avaliacao) => Number(avaliacao.nota || 0) <= 2).length

  const recomendacoes = avaliacoes.filter((avaliacao) => avaliacao.recomenda === true).length

  const comentarios = avaliacoes.filter((avaliacao) => limparTexto(avaliacao.comentario)).length

  const orientacoesPositivas = avaliacoes.filter(
    (avaliacao) => avaliacao.orientacoes === 'claras_completas'
  ).length

  const segurancaPositiva = avaliacoes.filter(
    (avaliacao) => avaliacao.seguranca === 'muita_seguranca'
  ).length

  const experienciaPositiva = avaliacoes.filter(
    (avaliacao) => avaliacao.experiencia === 'superou_expectativas'
  ).length

  return {
    total,
    mediaNota,
    notasAltas,
    notasBaixas,
    percentualNotasAltas: percentual(notasAltas, total),
    percentualNotasBaixas: percentual(notasBaixas, total),
    recomendacoes,
    percentualRecomendacao: percentual(recomendacoes, total),
    comentarios,
    percentualComComentario: percentual(comentarios, total),
    orientacoesClarasPercentual: percentual(orientacoesPositivas, total),
    segurancaAltaPercentual: percentual(segurancaPositiva, total),
    experienciaSuperouPercentual: percentual(experienciaPositiva, total)
  }
}

async function buscarUsuarios(supabase: any, ids: string[]) {
  const idsValidos = Array.from(new Set(ids.filter(Boolean)))

  if (idsValidos.length === 0) return []

  const { data, error } = await supabase
    .from('users')
    .select('id, nome, name, email, tipo')
    .in('id', idsValidos)

  if (error) {
    console.warn('Aviso ao buscar usuários das avaliações:', error)
    return []
  }

  return (data || []) as Usuario[]
}

async function buscarRoteiros(supabase: any, ids: string[]) {
  const idsValidos = Array.from(new Set(ids.filter(Boolean)))

  if (idsValidos.length === 0) return []

  const { data, error } = await supabase
    .from('roteiros')
    .select('*')
    .in('id', idsValidos)

  if (error) {
    console.warn('Aviso ao buscar roteiros das avaliações:', error)
    return []
  }

  return (data || []) as Roteiro[]
}

async function buscarAvaliacoes(
  supabase: any,
  params: {
    guiaId?: string
    roteiroId?: string
    clienteId?: string
    reservaId?: string
    status?: string
    tipoAvaliacao?: string
    limite?: number
    todos?: boolean
  }
) {
  let query = supabase
    .from('avaliacoes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(params.limite || 500)

  const tipoAvaliacao = params.tipoAvaliacao || 'cliente_para_guia'
  query = query.eq('tipo_avaliacao', tipoAvaliacao)

  if (params.status && params.status !== 'todos') {
    query = query.eq('status', params.status)
  } else {
    query = query.in('status', ['publicada', 'pendente_moderacao'])
  }

  if (params.guiaId) {
    query = query.eq('guia_id', params.guiaId)
  }

  if (params.roteiroId) {
    query = query.eq('roteiro_id', params.roteiroId)
  }

  if (params.clienteId) {
    query = query.eq('cliente_id', params.clienteId)
  }

  if (params.reservaId) {
    query = query.eq('reserva_id', params.reservaId)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data || []) as Avaliacao[]
}

function enriquecerAvaliacoes(
  avaliacoes: Avaliacao[],
  usuarios: Usuario[],
  roteiros: Roteiro[]
) {
  return avaliacoes.map((avaliacao) => {
    const cliente = usuarios.find((usuario) => usuario.id === avaliacao.cliente_id)
    const guia = usuarios.find((usuario) => usuario.id === avaliacao.guia_id)
    const roteiro = roteiros.find((item) => item.id === avaliacao.roteiro_id)

    return {
      id: avaliacao.id,
      reserva_id: avaliacao.reserva_id || null,
      roteiro_id: avaliacao.roteiro_id || null,
      roteiro_titulo: tituloRoteiro(roteiro),
      roteiro_local: localRoteiro(roteiro),
      roteiro_imagem: imagemRoteiro(roteiro),
      guia_id: avaliacao.guia_id || null,
      guia_nome: nomeUsuario(guia),
      cliente_id: avaliacao.cliente_id || null,
      cliente_nome: nomeUsuario(cliente),
      nota: Number(avaliacao.nota || 0),
      orientacoes: avaliacao.orientacoes || null,
      orientacoes_label: avaliacao.orientacoes
        ? LABELS_ORIENTACOES[avaliacao.orientacoes] || avaliacao.orientacoes
        : null,
      seguranca: avaliacao.seguranca || null,
      seguranca_label: avaliacao.seguranca
        ? LABELS_SEGURANCA[avaliacao.seguranca] || avaliacao.seguranca
        : null,
      experiencia: avaliacao.experiencia || null,
      experiencia_label: avaliacao.experiencia
        ? LABELS_EXPERIENCIA[avaliacao.experiencia] || avaliacao.experiencia
        : null,
      comentario: avaliacao.comentario || null,
      recomenda: avaliacao.recomenda,
      status: avaliacao.status || null,
      created_at: avaliacao.created_at || null
    }
  })
}

function agruparPorGuia(avaliacoes: Avaliacao[], usuarios: Usuario[]) {
  const mapa = new Map<string, Avaliacao[]>()

  avaliacoes.forEach((avaliacao) => {
    if (!avaliacao.guia_id) return

    const lista = mapa.get(avaliacao.guia_id) || []
    lista.push(avaliacao)
    mapa.set(avaliacao.guia_id, lista)
  })

  return Array.from(mapa.entries())
    .map(([guiaId, lista]) => {
      const guia = usuarios.find((usuario) => usuario.id === guiaId)
      const resumo = calcularResumo(lista)

      return {
        guia_id: guiaId,
        guia_nome: nomeUsuario(guia),
        ...resumo
      }
    })
    .sort((a, b) => b.mediaNota - a.mediaNota)
}

function agruparPorRoteiro(avaliacoes: Avaliacao[], roteiros: Roteiro[]) {
  const mapa = new Map<string, Avaliacao[]>()

  avaliacoes.forEach((avaliacao) => {
    if (!avaliacao.roteiro_id) return

    const lista = mapa.get(avaliacao.roteiro_id) || []
    lista.push(avaliacao)
    mapa.set(avaliacao.roteiro_id, lista)
  })

  return Array.from(mapa.entries())
    .map(([roteiroId, lista]) => {
      const roteiro = roteiros.find((item) => item.id === roteiroId)
      const resumo = calcularResumo(lista)

      return {
        roteiro_id: roteiroId,
        roteiro_titulo: tituloRoteiro(roteiro),
        roteiro_local: localRoteiro(roteiro),
        roteiro_imagem: imagemRoteiro(roteiro),
        ...resumo
      }
    })
    .sort((a, b) => b.mediaNota - a.mediaNota)
}

async function montarResposta(avaliacoes: Avaliacao[], limiteComentarios: number) {
  const supabase = getSupabaseAdmin()

  const usuarioIds = Array.from(
    new Set(
      avaliacoes
        .flatMap((avaliacao) => [
          avaliacao.guia_id,
          avaliacao.cliente_id,
          avaliacao.avaliador_id,
          avaliacao.avaliado_id
        ])
        .filter(Boolean) as string[]
    )
  )

  const roteiroIds = Array.from(
    new Set(
      avaliacoes
        .map((avaliacao) => avaliacao.roteiro_id)
        .filter(Boolean) as string[]
    )
  )

  const usuarios = await buscarUsuarios(supabase, usuarioIds)
  const roteiros = await buscarRoteiros(supabase, roteiroIds)

  const resumo = calcularResumo(avaliacoes)

  const distribuicao = {
    notas: contarNotas(avaliacoes),
    orientacoes: contarPorCampo(avaliacoes, 'orientacoes', LABELS_ORIENTACOES),
    seguranca: contarPorCampo(avaliacoes, 'seguranca', LABELS_SEGURANCA),
    experiencia: contarPorCampo(avaliacoes, 'experiencia', LABELS_EXPERIENCIA)
  }

  const avaliacoesEnriquecidas = enriquecerAvaliacoes(
    avaliacoes,
    usuarios,
    roteiros
  )

  const comentariosRecentes = avaliacoesEnriquecidas
    .filter((avaliacao) => limparTexto(avaliacao.comentario))
    .slice(0, limiteComentarios)

  const porGuia = agruparPorGuia(avaliacoes, usuarios)
  const porRoteiro = agruparPorRoteiro(avaliacoes, roteiros)

  return {
    sucesso: true,
    resumo,
    distribuicao,
    comentariosRecentes,
    avaliacoes: avaliacoesEnriquecidas,
    porGuia,
    porRoteiro
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const supabase = getSupabaseAdmin()

    const guiaId = limparTexto(body.guiaId || body.guia_id)
    const roteiroId = limparTexto(body.roteiroId || body.roteiro_id)
    const clienteId = limparTexto(body.clienteId || body.cliente_id)
    const reservaId = limparTexto(body.reservaId || body.reserva_id)

    const status = limparTexto(body.status || 'publicada')
    const tipoAvaliacao = limparTexto(body.tipoAvaliacao || body.tipo_avaliacao || 'cliente_para_guia')

    const todos = Boolean(body.todos || body.admin || body.todas)
    const limite = Math.min(Number(body.limite || 500), 1000)
    const limiteComentarios = Math.min(Number(body.limiteComentarios || 12), 50)

    if (guiaId && !uuidValido(guiaId)) {
      return json(
        {
          sucesso: false,
          erro: 'guiaId inválido.'
        },
        400
      )
    }

    if (roteiroId && !uuidValido(roteiroId)) {
      return json(
        {
          sucesso: false,
          erro: 'roteiroId inválido.'
        },
        400
      )
    }

    if (clienteId && !uuidValido(clienteId)) {
      return json(
        {
          sucesso: false,
          erro: 'clienteId inválido.'
        },
        400
      )
    }

    if (reservaId && !uuidValido(reservaId)) {
      return json(
        {
          sucesso: false,
          erro: 'reservaId inválido.'
        },
        400
      )
    }

    if (!todos && !guiaId && !roteiroId && !clienteId && !reservaId) {
      return json(
        {
          sucesso: false,
          erro: 'Informe guiaId, roteiroId, clienteId, reservaId ou todos=true.'
        },
        400
      )
    }

    const avaliacoes = await buscarAvaliacoes(supabase, {
      guiaId,
      roteiroId,
      clienteId,
      reservaId,
      status,
      tipoAvaliacao,
      limite,
      todos
    })

    const resposta = await montarResposta(avaliacoes, limiteComentarios)

    return json({
      ...resposta,
      filtros: {
        guiaId: guiaId || null,
        roteiroId: roteiroId || null,
        clienteId: clienteId || null,
        reservaId: reservaId || null,
        status,
        tipoAvaliacao,
        todos,
        limite
      }
    })
  } catch (error: any) {
    console.error('Erro em /api/avaliacoes/estatisticas:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao buscar estatísticas de avaliações.'
      },
      500
    )
  }
}

export async function GET() {
  return json({
    sucesso: true,
    rota: '/api/avaliacoes/estatisticas',
    metodo: 'POST',
    mensagem:
      'Rota ativa. Envie guiaId, roteiroId, clienteId, reservaId ou todos=true para listar avaliações e estatísticas.'
  })
}