import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  ''

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

function normalizarNumero(valor: any) {
  const limpo = String(valor || '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '')

  const numero = Number(limpo)

  if (!Number.isFinite(numero)) return 0

  return numero
}

function uuidValido(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
    valor
  )
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
  const texto = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')

  const matchAspas = texto.match(/'([^']+)'/)

  if (matchAspas?.[1]) return matchAspas[1]

  const matchColumn = texto.match(/column\s+([a-zA-Z0-9_]+)/i)

  if (matchColumn?.[1]) return matchColumn[1]

  return ''
}

function tabelaNaoExiste(error: any) {
  const texto = String(
    error?.message ||
      error?.details ||
      error?.hint ||
      ''
  ).toLowerCase()

  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    texto.includes('does not exist') ||
    texto.includes('not exist') ||
    texto.includes('schema cache')
  )
}

async function buscarUsuario(supabase: any, userId: string) {
  if (!userId || !uuidValido(userId)) return null

  const { data, error } = await supabase
    .from('users')
    .select('id, nome, name, email, tipo')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.warn('Erro ao buscar usuário:', error)
    return null
  }

  return data || null
}

async function inserirRepasseComFallback(
  supabase: any,
  payloadOriginal: Record<string, any>
) {
  let payloadAtual = { ...payloadOriginal }
  const colunasIgnoradas: string[] = []

  for (let tentativa = 0; tentativa < 15; tentativa++) {
    const { data, error } = await supabase
      .from('repasses_guias')
      .insert(payloadAtual)
      .select('*')
      .maybeSingle()

    if (!error) {
      return {
        data,
        colunasIgnoradas
      }
    }

    if (tabelaNaoExiste(error)) {
      throw new Error(
        'A tabela repasses_guias ainda não existe. Rode o SQL financeiro antes de registrar pagamentos.'
      )
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

  throw new Error('Não foi possível registrar o repasse após ajustar colunas.')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const adminId = limparTexto(
      body.adminId ||
        body.admin_id ||
        body.userId ||
        body.usuarioId ||
        body.usuario_id
    )

    const guiaId = limparTexto(
      body.guiaId ||
        body.guia_id ||
        body.id_guia
    )

    const valor = normalizarNumero(
      body.valor ||
        body.valorPago ||
        body.valor_pago ||
        body.valorRepassado ||
        body.valor_repassado
    )

    const observacao = limparTexto(
      body.observacao ||
        body.descricao ||
        ''
    )

    if (!adminId || !uuidValido(adminId)) {
      return json(
        {
          sucesso: false,
          erro: 'Admin inválido.'
        },
        400
      )
    }

    if (!guiaId || !uuidValido(guiaId)) {
      return json(
        {
          sucesso: false,
          erro: 'Guia inválido.'
        },
        400
      )
    }

    if (valor <= 0) {
      return json(
        {
          sucesso: false,
          erro: 'Informe um valor maior que zero.'
        },
        400
      )
    }

    const admin = await buscarUsuario(supabase, adminId)

    if (!admin?.id || normalizar(admin.tipo) !== 'admin') {
      return json(
        {
          sucesso: false,
          erro: 'Usuário sem permissão administrativa.'
        },
        403
      )
    }

    const guia = await buscarUsuario(supabase, guiaId)

    if (!guia?.id) {
      return json(
        {
          sucesso: false,
          erro: 'Guia não encontrado.'
        },
        404
      )
    }

    const agora = new Date().toISOString()
    const nomeGuia = guia.nome || guia.name || guia.email || guiaId

    const payload = {
      guia_id: guiaId,
      id_guia: guiaId,

      admin_id: adminId,
      criado_por: adminId,

      valor,
      valor_pago: valor,
      valor_repassado: valor,

      status: 'pago',
      tipo: 'repasse_guia',

      observacao: observacao || null,
      descricao: observacao || `Repasse ao guia ${nomeGuia}`,

      data_pagamento: agora,
      created_at: agora,
      updated_at: agora
    }

    const resultado = await inserirRepasseComFallback(supabase, payload)

    return json({
      sucesso: true,
      mensagem: 'Repasse registrado com sucesso.',
      repasse: resultado.data,
      guia: {
        id: guia.id,
        nome: nomeGuia,
        email: guia.email || null
      },
      colunasIgnoradas: resultado.colunasIgnoradas
    })
  } catch (error: any) {
    console.error('Erro em /api/admin/financeiro/registrar-repasse:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao registrar repasse.'
      },
      500
    )
  }
}

export async function GET() {
  return json({
    sucesso: true,
    rota: '/api/admin/financeiro/registrar-repasse',
    metodo: 'POST'
  })
}