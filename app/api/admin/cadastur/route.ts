import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type AnyRecord = Record<string, any>

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Variáveis de ambiente do Supabase não configuradas.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function dataOuNull(valor: unknown) {
  const raw = texto(valor)

  if (!raw) return null

  const data = new Date(raw)

  if (Number.isNaN(data.getTime())) return null

  return raw.slice(0, 10)
}

function erroColunaAusente(error: any) {
  const mensagem = String(
    error?.message ||
      error?.details ||
      error?.hint ||
      ''
  ).toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    mensagem.includes('column') ||
    mensagem.includes('schema cache') ||
    mensagem.includes('could not find')
  )
}

function extrairColunaAusente(error: any) {
  const mensagem = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')

  const matchAspas = mensagem.match(/'([^']+)'/)

  if (matchAspas?.[1]) return matchAspas[1]

  const matchColumn = mensagem.match(/column\s+([a-zA-Z0-9_]+)/i)

  if (matchColumn?.[1]) return matchColumn[1]

  return ''
}

async function atualizarUsuarioComFallback(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  payloadOriginal: AnyRecord
) {
  let payload: AnyRecord = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 18; tentativa++) {
    if (Object.keys(payload).length === 0) {
      throw new Error('Nenhuma coluna disponível para atualizar.')
    }

    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', userId)
      .select('*')
      .maybeSingle()

    if (!error) return data as AnyRecord | null

    if (!erroColunaAusente(error)) throw error

    const coluna = extrairColunaAusente(error)

    if (!coluna || !(coluna in payload)) throw error

    delete payload[coluna]
  }

  throw new Error('Não foi possível atualizar o guia após ajustar colunas.')
}

function montarResumoCadastur(guia: AnyRecord) {
  const cadasturNumero = texto(guia.cadastur_numero || guia.cadastur)
  const statusRaw = normalizar(guia.cadastur_status)

  const verificado = Boolean(
    guia.cadastur_verificado ||
      guia.guia_verificado_cadastur ||
      statusRaw === 'verificado' ||
      statusRaw === 'ativo'
  )

  const validadeRaw =
    guia.cadastur_validade ||
    guia.cadastur_data_validade ||
    guia.cadastur_validade_ate ||
    null

  const validade = validadeRaw ? new Date(String(validadeRaw)) : null

  const ativo =
    Boolean(verificado && validade && !Number.isNaN(validade.getTime())) &&
    (() => {
      const fim = new Date(validade as Date)
      fim.setHours(23, 59, 59, 999)
      return fim.getTime() >= Date.now()
    })()

  let status = 'sem_cadastur'

  if (cadasturNumero && !verificado) status = 'informado'
  if (verificado && !ativo) status = 'verificado'
  if (ativo) status = 'ativo'

  return {
    cadastur_numero: cadasturNumero,
    status,
    verificado,
    ativo,
    validade: validadeRaw,
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)

    const busca = normalizar(searchParams.get('busca'))
    const filtro = normalizar(searchParams.get('status') || 'todos')
    const limite = Math.min(
      500,
      Math.max(20, Number(searchParams.get('limite') || 250))
    )

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('tipo', 'guia')
      .order('updated_at', { ascending: false })
      .limit(limite)

    if (error) throw error

    const guiasBase: AnyRecord[] = (data || []) as AnyRecord[]

    const guias: AnyRecord[] = guiasBase.map(
      (guia: AnyRecord): AnyRecord => {
        const resumo = montarResumoCadastur(guia)

        return {
          ...guia,
          id: guia.id,
          cadastur_numero_exibicao: resumo.cadastur_numero,
          cadastur_status_exibicao: resumo.status,
          cadastur_verificado_exibicao: resumo.verificado,
          cadastur_ativo_exibicao: resumo.ativo,
          cadastur_validade_exibicao: resumo.validade,
          nome_exibicao:
            guia.nome ||
            guia.name ||
            guia.full_name ||
            guia.email ||
            'Guia',
        }
      }
    )

    const filtradosPorStatus: AnyRecord[] =
      filtro === 'todos'
        ? guias
        : guias.filter(
            (guia: AnyRecord) => guia.cadastur_status_exibicao === filtro
          )

    const filtrados: AnyRecord[] = busca
      ? filtradosPorStatus.filter((guia: AnyRecord) => {
          const alvo = normalizar(
            [
              guia.nome_exibicao,
              guia.email,
              guia.cadastur,
              guia.cadastur_numero,
              guia.cadastur_status_exibicao,
              guia.id,
            ].join(' ')
          )

          return alvo.includes(busca)
        })
      : filtradosPorStatus

    const resumo = filtrados.reduce<Record<string, number>>(
      (acc: Record<string, number>, guia: AnyRecord) => {
        const chave = texto(guia.cadastur_status_exibicao || 'sem_cadastur')

        acc.total = (acc.total || 0) + 1
        acc[chave] = (acc[chave] || 0) + 1

        return acc
      },
      {
        total: 0,
        sem_cadastur: 0,
        informado: 0,
        verificado: 0,
        ativo: 0,
      }
    )

    return NextResponse.json({
      sucesso: true,
      guias: filtrados,
      resumo,
    })
  } catch (error) {
    console.error('Erro em GET /api/admin/cadastur:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao carregar guias/CADASTUR.',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()

    const guiaId = texto(body.guiaId || body.guia_id || body.id)
    const adminId = texto(
      body.adminId || body.admin_id || body.usuarioId || body.usuario_id
    )
    const acao = normalizar(body.acao || body.action)

    if (!guiaId) {
      return NextResponse.json(
        { sucesso: false, erro: 'guiaId é obrigatório.' },
        { status: 400 }
      )
    }

    const { data: guiaAtual, error: guiaError } = await supabase
      .from('users')
      .select('*')
      .eq('id', guiaId)
      .maybeSingle()

    if (guiaError) throw guiaError

    if (!guiaAtual) {
      return NextResponse.json(
        { sucesso: false, erro: 'Guia não encontrado.' },
        { status: 404 }
      )
    }

    const guiaAtualSeguro: AnyRecord = guiaAtual as AnyRecord

    const cadasturNumeroAtual = texto(
      body.cadasturNumero ||
        body.cadastur_numero ||
        guiaAtualSeguro.cadastur_numero ||
        guiaAtualSeguro.cadastur
    )

    if (acao !== 'limpar' && !cadasturNumeroAtual) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'O guia ainda não possui número CADASTUR informado.',
        },
        { status: 400 }
      )
    }

    const observacaoAdmin = texto(body.observacaoAdmin || body.observacao_admin)
    const validade = dataOuNull(
      body.cadasturValidade || body.cadastur_validade || body.validade
    )

    let payload: AnyRecord = {
      updated_at: new Date().toISOString(),
      cadastur_observacao_admin:
        observacaoAdmin || guiaAtualSeguro.cadastur_observacao_admin || null,
    }

    if (acao === 'verificar') {
      payload = {
        ...payload,
        cadastur: cadasturNumeroAtual,
        cadastur_numero: cadasturNumeroAtual,
        cadastur_status: validade ? 'ativo' : 'verificado',
        cadastur_verificado: true,
        guia_verificado_cadastur: true,
        cadastur_verificado_em:
          guiaAtualSeguro.cadastur_verificado_em || new Date().toISOString(),
        cadastur_verificado_por: adminId || null,
        cadastur_ativo_desde: validade
          ? guiaAtualSeguro.cadastur_ativo_desde ||
            guiaAtualSeguro.cadastur_verificado_em ||
            new Date().toISOString()
          : guiaAtualSeguro.cadastur_ativo_desde || null,
      }

      if (validade) {
        payload.cadastur_validade = validade
        payload.cadastur_data_validade = validade
        payload.cadastur_validade_ate = validade
      }
    } else if (acao === 'validade') {
      if (!validade) {
        return NextResponse.json(
          { sucesso: false, erro: 'Informe uma data de validade válida.' },
          { status: 400 }
        )
      }

      payload = {
        ...payload,
        cadastur: cadasturNumeroAtual,
        cadastur_numero: cadasturNumeroAtual,
        cadastur_status: 'ativo',
        cadastur_verificado: true,
        guia_verificado_cadastur: true,
        cadastur_verificado_em:
          guiaAtualSeguro.cadastur_verificado_em || new Date().toISOString(),
        cadastur_verificado_por: adminId || null,
        cadastur_validade: validade,
        cadastur_data_validade: validade,
        cadastur_validade_ate: validade,
        cadastur_ativo_desde:
          guiaAtualSeguro.cadastur_ativo_desde ||
          guiaAtualSeguro.cadastur_verificado_em ||
          new Date().toISOString(),
      }
    } else if (acao === 'pendente') {
      payload = {
        ...payload,
        cadastur: cadasturNumeroAtual,
        cadastur_numero: cadasturNumeroAtual,
        cadastur_status: 'informado',
        cadastur_verificado: false,
        guia_verificado_cadastur: false,
        cadastur_verificado_em: null,
        cadastur_verificado_por: null,
        cadastur_ativo_desde: null,
      }
    } else if (acao === 'limpar') {
      payload = {
        ...payload,
        cadastur: null,
        cadastur_numero: null,
        cadastur_status: null,
        cadastur_informado_em: null,
        cadastur_verificado: false,
        guia_verificado_cadastur: false,
        cadastur_verificado_em: null,
        cadastur_verificado_por: null,
        cadastur_validade: null,
        cadastur_data_validade: null,
        cadastur_validade_ate: null,
        cadastur_ativo_desde: null,
      }
    } else {
      return NextResponse.json(
        { sucesso: false, erro: 'Ação inválida.' },
        { status: 400 }
      )
    }

    const atualizado = await atualizarUsuarioComFallback(
      supabase,
      guiaId,
      payload
    )

    return NextResponse.json({
      sucesso: true,
      guia: atualizado,
      resumo: montarResumoCadastur(atualizado || payload),
    })
  } catch (error) {
    console.error('Erro em PATCH /api/admin/cadastur:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao atualizar CADASTUR do guia.',
      },
      { status: 500 }
    )
  }
}