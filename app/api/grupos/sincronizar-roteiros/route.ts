import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  ''

type ResultadoSincronizacao = {
  roteiro_id: string
  grupo_id?: string | null
  titulo?: string | null
  acao: 'criado' | 'atualizado' | 'existente' | 'ignorado' | 'erro'
  mensagem: string
  erro?: string | null
}

function json(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0'
    }
  })
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
    String(valor || '')
  )
}

function tituloRoteiro(roteiro: any) {
  return (
    limparTexto(roteiro?.titulo) ||
    limparTexto(roteiro?.nome) ||
    `Roteiro ${String(roteiro?.id || '').slice(0, 8)}`
  )
}

function guiaIdDoRoteiro(roteiro: any) {
  return limparTexto(
    roteiro?.id_guia ||
      roteiro?.guia_id ||
      roteiro?.user_id ||
      roteiro?.usuario_id ||
      ''
  )
}

function statusRoteiro(roteiro: any) {
  return limparTexto(roteiro?.status || '')
}

function statusGrupoInfo(status?: string | null) {
  const valor = normalizar(status)

  if (valor === 'ativo') {
    return {
      label: 'Ativo',
      classe: 'badge-green',
      tipo: 'success'
    }
  }

  if (valor === 'encerrado' || valor === 'encerrada') {
    return {
      label: 'Encerrado',
      classe: 'badge-red',
      tipo: 'danger'
    }
  }

  if (valor === 'pendente' || valor === 'aguardando') {
    return {
      label: 'Pendente',
      classe: 'badge-yellow',
      tipo: 'warning'
    }
  }

  return {
    label: status || 'Indefinido',
    classe: 'badge-neutral',
    tipo: 'neutral'
  }
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

function extrairColunaAusente(error: any) {
  const texto = [
    error?.message,
    error?.details,
    error?.hint
  ]
    .filter(Boolean)
    .join(' ')

  const matchAspas = texto.match(/'([^']+)'/)

  if (matchAspas?.[1]) return matchAspas[1]

  const matchColumn = texto.match(/column\s+([a-zA-Z0-9_]+)/i)

  if (matchColumn?.[1]) return matchColumn[1]

  const matchSchemaCache = texto.match(/'([a-zA-Z0-9_]+)'\s+column/i)

  if (matchSchemaCache?.[1]) return matchSchemaCache[1]

  return ''
}

function erroTabelaInexistente(error: any) {
  const texto = String(
    error?.message ||
      error?.details ||
      error?.hint ||
      ''
  ).toLowerCase()

  return (
    error?.code === '42P01' ||
    texto.includes('does not exist') ||
    texto.includes('relation') ||
    texto.includes('table')
  )
}

async function insertComFallback(
  supabase: any,
  tabela: string,
  payloadOriginal: Record<string, any>
) {
  let payloadAtual = { ...payloadOriginal }
  const colunasIgnoradas: string[] = []

  for (let tentativa = 0; tentativa < 25; tentativa++) {
    const { data, error } = await supabase
      .from(tabela)
      .insert(payloadAtual)
      .select('*')
      .maybeSingle()

    if (!error) {
      return {
        data,
        colunasIgnoradas
      }
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

  throw new Error(`Não foi possível inserir em ${tabela} após ajustar colunas.`)
}

async function updateComFallback(
  supabase: any,
  tabela: string,
  id: string,
  payloadOriginal: Record<string, any>
) {
  let payloadAtual = { ...payloadOriginal }
  const colunasIgnoradas: string[] = []

  for (let tentativa = 0; tentativa < 25; tentativa++) {
    const { data, error } = await supabase
      .from(tabela)
      .update(payloadAtual)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (!error) {
      return {
        data,
        colunasIgnoradas
      }
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

  throw new Error(`Não foi possível atualizar ${tabela} após ajustar colunas.`)
}

async function buscarRoteiros(supabase: any, filtros: {
  roteiroId?: string
  guiaId?: string
  apenasComGuia?: boolean
}) {
  let query = supabase
    .from('roteiros')
    .select('*')
    .order('created_at', { ascending: false })

  if (filtros.roteiroId) {
    query = query.eq('id', filtros.roteiroId)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  let roteiros = Array.isArray(data) ? data : []

  if (filtros.guiaId) {
    roteiros = roteiros.filter((roteiro: any) => guiaIdDoRoteiro(roteiro) === filtros.guiaId)
  }

  if (filtros.apenasComGuia) {
    roteiros = roteiros.filter((roteiro: any) => Boolean(guiaIdDoRoteiro(roteiro)))
  }

  return roteiros
}

async function buscarGrupoPorRoteiro(supabase: any, roteiroId: string) {
  const { data, error } = await supabase
    .from('grupos_roteiros')
    .select('*')
    .eq('roteiro_id', roteiroId)
    .maybeSingle()

  if (!error) return data || null

  if (erroTabelaInexistente(error)) {
    throw new Error('Tabela grupos_roteiros não existe. Rode o SQL dos grupos antes de sincronizar.')
  }

  if (erroDeColunaAusente(error)) {
    return null
  }

  throw error
}

async function buscarMembroGrupo(supabase: any, grupoId: string, userId: string) {
  const { data, error } = await supabase
    .from('grupo_membros')
    .select('*')
    .eq('grupo_id', grupoId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!error) return data || null

  if (erroTabelaInexistente(error)) {
    return null
  }

  if (erroDeColunaAusente(error)) {
    return null
  }

  throw error
}

async function garantirGuiaComoAdmin(supabase: any, grupoId: string, guiaId: string) {
  if (!grupoId || !guiaId) {
    return {
      sucesso: false,
      mensagem: 'Grupo ou guia não informado.'
    }
  }

  try {
    const membroExistente = await buscarMembroGrupo(supabase, grupoId, guiaId)

    if (membroExistente?.id) {
      const payloadUpdate = {
        papel: membroExistente.papel || 'guia',
        role: membroExistente.role || 'admin',
        tipo: membroExistente.tipo || 'guia',
        status: membroExistente.status || 'ativo',
        ativo: true,
        updated_at: new Date().toISOString()
      }

      await updateComFallback(supabase, 'grupo_membros', membroExistente.id, payloadUpdate)

      return {
        sucesso: true,
        mensagem: 'Guia já estava no grupo e foi mantido como administrador.'
      }
    }

    const agora = new Date().toISOString()

    const payload = {
      grupo_id: grupoId,
      user_id: guiaId,
      usuario_id: guiaId,
      guia_id: guiaId,
      papel: 'guia',
      role: 'admin',
      tipo: 'guia',
      status: 'ativo',
      ativo: true,
      created_at: agora,
      updated_at: agora
    }

    await insertComFallback(supabase, 'grupo_membros', payload)

    return {
      sucesso: true,
      mensagem: 'Guia adicionado como administrador do grupo.'
    }
  } catch (error: any) {
    if (erroTabelaInexistente(error)) {
      return {
        sucesso: false,
        mensagem: 'Tabela grupo_membros não existe. Grupo criado, mas membro não foi sincronizado.'
      }
    }

    console.warn('Erro ao garantir guia como admin do grupo:', error)

    return {
      sucesso: false,
      mensagem: error?.message || 'Não foi possível adicionar o guia como administrador do grupo.'
    }
  }
}

async function criarGrupoParaRoteiro(supabase: any, roteiro: any) {
  const roteiroId = limparTexto(roteiro?.id)
  const guiaId = guiaIdDoRoteiro(roteiro)
  const titulo = tituloRoteiro(roteiro)
  const agora = new Date().toISOString()

  if (!roteiroId) {
    return {
      roteiro_id: '',
      grupo_id: null,
      titulo,
      acao: 'erro' as const,
      mensagem: 'Roteiro sem ID.',
      erro: 'Roteiro sem ID.'
    }
  }

  if (!guiaId) {
    return {
      roteiro_id: roteiroId,
      grupo_id: null,
      titulo,
      acao: 'ignorado' as const,
      mensagem: 'Roteiro ignorado porque não possui guia vinculado.',
      erro: null
    }
  }

  const payload = {
    roteiro_id: roteiroId,
    guia_id: guiaId,
    id_guia: guiaId,
    admin_id: guiaId,
    titulo,
    nome: titulo,
    descricao:
      limparTexto(roteiro?.descricao) ||
      `Grupo interno do roteiro ${titulo}.`,
    status: 'ativo',
    ativo: true,
    tipo: 'roteiro',
    origem: 'sincronizacao',
    aviso_fixado: null,
    created_at: agora,
    updated_at: agora
  }

  const resultado = await insertComFallback(supabase, 'grupos_roteiros', payload)
  const grupo = resultado.data

  if (!grupo?.id) {
    return {
      roteiro_id: roteiroId,
      grupo_id: null,
      titulo,
      acao: 'erro' as const,
      mensagem: 'Grupo inserido, mas ID não retornou.',
      erro: 'Grupo inserido, mas ID não retornou.'
    }
  }

  const membro = await garantirGuiaComoAdmin(supabase, grupo.id, guiaId)

  return {
    roteiro_id: roteiroId,
    grupo_id: grupo.id,
    titulo,
    acao: 'criado' as const,
    mensagem: membro.sucesso
      ? 'Grupo criado e guia adicionado como administrador.'
      : `Grupo criado. ${membro.mensagem}`,
    erro: membro.sucesso ? null : membro.mensagem
  }
}

async function atualizarGrupoDoRoteiro(supabase: any, grupo: any, roteiro: any) {
  const roteiroId = limparTexto(roteiro?.id)
  const guiaId = guiaIdDoRoteiro(roteiro)
  const titulo = tituloRoteiro(roteiro)

  if (!grupo?.id) {
    return {
      roteiro_id: roteiroId,
      grupo_id: null,
      titulo,
      acao: 'erro' as const,
      mensagem: 'Grupo existente sem ID.',
      erro: 'Grupo existente sem ID.'
    }
  }

  const payload = {
    roteiro_id: roteiroId,
    guia_id: guiaId || grupo?.guia_id || grupo?.id_guia || null,
    id_guia: guiaId || grupo?.id_guia || grupo?.guia_id || null,
    titulo: grupo?.titulo || titulo,
    nome: grupo?.nome || titulo,
    descricao:
      grupo?.descricao ||
      limparTexto(roteiro?.descricao) ||
      `Grupo interno do roteiro ${titulo}.`,
    status: grupo?.status || 'ativo',
    ativo: grupo?.ativo ?? true,
    updated_at: new Date().toISOString()
  }

  await updateComFallback(supabase, 'grupos_roteiros', grupo.id, payload)

  let membroMensagem = 'Guia não informado para sincronizar membro.'

  if (guiaId) {
    const membro = await garantirGuiaComoAdmin(supabase, grupo.id, guiaId)
    membroMensagem = membro.mensagem
  }

  return {
    roteiro_id: roteiroId,
    grupo_id: grupo.id,
    titulo,
    acao: 'atualizado' as const,
    mensagem: `Grupo existente atualizado. ${membroMensagem}`,
    erro: null
  }
}

async function sincronizarRoteiro(supabase: any, roteiro: any) {
  const roteiroId = limparTexto(roteiro?.id)
  const titulo = tituloRoteiro(roteiro)

  try {
    if (!roteiroId) {
      return {
        roteiro_id: '',
        grupo_id: null,
        titulo,
        acao: 'erro' as const,
        mensagem: 'Roteiro sem ID.',
        erro: 'Roteiro sem ID.'
      }
    }

    const grupoExistente = await buscarGrupoPorRoteiro(supabase, roteiroId)

    if (grupoExistente?.id) {
      return await atualizarGrupoDoRoteiro(supabase, grupoExistente, roteiro)
    }

    return await criarGrupoParaRoteiro(supabase, roteiro)
  } catch (error: any) {
    console.error(`Erro ao sincronizar grupo do roteiro ${roteiroId}:`, error)

    return {
      roteiro_id: roteiroId,
      grupo_id: null,
      titulo,
      acao: 'erro' as const,
      mensagem: error?.message || 'Erro ao sincronizar roteiro.',
      erro: error?.message || 'Erro ao sincronizar roteiro.'
    }
  }
}

function resumirResultados(resultados: ResultadoSincronizacao[]) {
  return {
    total: resultados.length,
    criados: resultados.filter((item) => item.acao === 'criado').length,
    atualizados: resultados.filter((item) => item.acao === 'atualizado').length,
    existentes: resultados.filter((item) => item.acao === 'existente').length,
    ignorados: resultados.filter((item) => item.acao === 'ignorado').length,
    erros: resultados.filter((item) => item.acao === 'erro').length
  }
}

async function executarSincronizacao(request: NextRequest, metodo: 'GET' | 'POST') {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)

    let body: any = {}

    if (metodo === 'POST') {
      body = await request.json().catch(() => ({}))
    }

    const roteiroId = limparTexto(
      body.roteiroId ||
        body.roteiro_id ||
        searchParams.get('roteiroId') ||
        searchParams.get('roteiro_id') ||
        ''
    )

    const guiaId = limparTexto(
      body.guiaId ||
        body.guia_id ||
        body.id_guia ||
        searchParams.get('guiaId') ||
        searchParams.get('guia_id') ||
        searchParams.get('id_guia') ||
        ''
    )

    const limiteRaw =
      body.limite ||
      body.limit ||
      searchParams.get('limite') ||
      searchParams.get('limit') ||
      ''

    const limite = Math.max(
      1,
      Math.min(
        Number(limiteRaw || 500),
        2000
      )
    )

    if (roteiroId && !uuidValido(roteiroId)) {
      return json(
        {
          sucesso: false,
          erro: 'roteiroId inválido.'
        },
        400
      )
    }

    if (guiaId && !uuidValido(guiaId)) {
      return json(
        {
          sucesso: false,
          erro: 'guiaId inválido.'
        },
        400
      )
    }

    const roteirosTodos = await buscarRoteiros(supabase, {
      roteiroId: roteiroId || undefined,
      guiaId: guiaId || undefined,
      apenasComGuia: true
    })

    const roteiros = roteirosTodos.slice(0, limite)

    const resultados: ResultadoSincronizacao[] = []

    for (const roteiro of roteiros) {
      const resultado = await sincronizarRoteiro(supabase, roteiro)
      resultados.push(resultado)
    }

    const resumo = resumirResultados(resultados)

    return json({
      sucesso: resumo.erros === 0,
      mensagem:
        resumo.erros === 0
          ? 'Sincronização de grupos concluída.'
          : 'Sincronização concluída com alguns erros.',
      resumo,
      filtros: {
        roteiro_id: roteiroId || null,
        guia_id: guiaId || null,
        limite,
        roteiros_encontrados: roteirosTodos.length,
        roteiros_processados: roteiros.length
      },
      resultados
    })
  } catch (error: any) {
    console.error('Erro em /api/grupos/sincronizar-roteiros:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao sincronizar grupos dos roteiros.'
      },
      500
    )
  }
}

export async function GET(request: NextRequest) {
  return executarSincronizacao(request, 'GET')
}

export async function POST(request: NextRequest) {
  return executarSincronizacao(request, 'POST')
}