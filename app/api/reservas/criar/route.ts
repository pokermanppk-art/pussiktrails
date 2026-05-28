import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

function getSupabaseAdmin(): any {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Variáveis de ambiente do Supabase não configuradas para a rota /api/reservas/criar.'
    )
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

function numero(valor: unknown) {
  const n = Number(valor || 0)
  return Number.isFinite(n) ? n : 0
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function serializarErro(error: any) {
  return {
    message: error?.message || null,
    code: error?.code || null,
    details: error?.details || null,
    hint: error?.hint || null,
    name: error?.name || null,
    raw: (() => {
      try {
        return JSON.parse(JSON.stringify(error || {}))
      } catch {
        return String(error)
      }
    })(),
  }
}

function erroDeColunaAusente(error: any) {
  const mensagem = String(
    error?.message ||
      error?.details ||
      error?.hint ||
      ''
  ).toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    mensagem.includes('could not find') ||
    mensagem.includes('schema cache') ||
    mensagem.includes('column')
  )
}

function extrairColunaAusente(error: any) {
  const mensagem = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')

  const matchAspas = mensagem.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  const matchColumn = mensagem.match(/column\s+"?([a-zA-Z0-9_]+)"?/i)
  if (matchColumn?.[1]) return matchColumn[1]

  return ''
}

function colunaNotNull(error: any) {
  if (error?.code !== '23502') return ''

  const mensagem = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')

  const match = mensagem.match(/null value in column "([^"]+)"/i)
  return match?.[1] || ''
}

function dataNormalizada(valor: unknown) {
  const bruto = texto(valor)
  if (!bruto) return null

  const yyyyMmDd = bruto.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return yyyyMmDd

  return null
}

function roteiroAtivo(roteiro: AnyRecord) {
  const status = normalizar(roteiro.status)

  if (roteiro.excluido_admin === true) return false
  if (status === 'excluido_admin') return false
  if (status === 'cancelado' || status === 'cancelada') return false
  if (status === 'reprovado') return false

  if (typeof roteiro.ativo === 'boolean') return roteiro.ativo

  return status === 'ativo' || status === 'publicado' || status === 'publicada' || !status
}

async function inserirReservaComFallback(params: {
  supabase: any
  payloadOriginal: AnyRecord
}) {
  const { supabase } = params
  let payload: AnyRecord = { ...params.payloadOriginal }

  const statusAlternativos = [
    { status: 'pendente', pagamento_status: 'pendente' },
    { status: 'aguardando', pagamento_status: 'pendente' },
    { status: 'aguardando_pagamento', pagamento_status: 'pendente' },
    { status: 'pendente', pagamento_status: 'aguardando_pagamento' },
  ]

  const defaultsPorColuna: Record<string, any> = {
    status: 'pendente',
    pagamento_status: 'pendente',
    forma_pagamento: 'pix',
    quantidade_pessoas: 1,
    quantidade: 1,
    valor_total: 0,
    valor: 0,
    preco: 0,
    saldo_utilizado: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  let ultimoErro: any = null

  for (const statusPayload of statusAlternativos) {
    payload = {
      ...payload,
      ...statusPayload,
    }

    for (let tentativa = 0; tentativa < 18; tentativa++) {
      const { data, error } = await supabase
        .from('reservas')
        .insert(payload)
        .select('*')
        .maybeSingle()

      if (!error) return data

      ultimoErro = error

      if (erroDeColunaAusente(error)) {
        const coluna = extrairColunaAusente(error)

        if (coluna && coluna in payload) {
          delete payload[coluna]
          continue
        }
      }

      const colunaObrigatoria = colunaNotNull(error)

      if (colunaObrigatoria && !(colunaObrigatoria in payload)) {
        payload[colunaObrigatoria] =
          defaultsPorColuna[colunaObrigatoria] ?? texto(defaultsPorColuna[colunaObrigatoria])
        continue
      }

      if (String(error?.message || '').toLowerCase().includes('check constraint')) {
        break
      }

      throw error
    }
  }

  throw ultimoErro || new Error('Não foi possível criar a reserva.')
}

export async function GET() {
  return NextResponse.json({
    sucesso: true,
    rota: '/api/reservas/criar',
    metodo: 'GET',
    mensagem: 'Rota ativa. Use POST para criar reserva.',
    timestamp: new Date().toISOString(),
  })
}

export async function POST(request: NextRequest) {
  let body: AnyRecord = {}

  try {
    const supabase = getSupabaseAdmin()
    body = await request.json().catch(() => ({}))

    const clienteId = texto(
      body.clienteId ||
        body.cliente_id ||
        body.usuarioId ||
        body.usuario_id ||
        body.userId ||
        body.user_id
    )

    const roteiroId = texto(
      body.roteiroId ||
        body.roteiro_id ||
        body.idRoteiro ||
        body.id_roteiro
    )

    const quantidadePessoas = Math.max(
      1,
      Math.floor(numero(body.quantidadePessoas || body.quantidade_pessoas || 1))
    )

    if (!clienteId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'clienteId é obrigatório para criar a reserva.',
          recebido: body,
        },
        { status: 400 }
      )
    }

    if (!roteiroId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'roteiroId é obrigatório para criar a reserva.',
          recebido: body,
        },
        { status: 400 }
      )
    }

    const { data: cliente, error: clienteError } = await supabase
      .from('users')
      .select('id, nome, name, email, tipo')
      .eq('id', clienteId)
      .maybeSingle()

    if (clienteError) throw clienteError

    if (!cliente?.id) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Cliente não encontrado. Faça login novamente.',
          clienteId,
        },
        { status: 404 }
      )
    }

    if (normalizar(cliente.tipo) !== 'cliente') {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'A reserva só pode ser criada por um perfil de cliente.',
          tipoEncontrado: cliente.tipo || null,
        },
        { status: 403 }
      )
    }

    const { data: roteiro, error: roteiroError } = await supabase
      .from('roteiros')
      .select('*')
      .eq('id', roteiroId)
      .maybeSingle()

    if (roteiroError) throw roteiroError

    if (!roteiro?.id) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Roteiro não encontrado.',
          roteiroId,
        },
        { status: 404 }
      )
    }

    if (!roteiroAtivo(roteiro as AnyRecord)) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Este roteiro não está disponível para reserva no momento.',
          statusRoteiro: roteiro.status || null,
          ativo: roteiro.ativo ?? null,
        },
        { status: 409 }
      )
    }

    const valorUnitarioServidor = numero(
      (roteiro as AnyRecord).preco || (roteiro as AnyRecord).valor || body.valorUnitario || body.valor_unitario
    )

    if (valorUnitarioServidor <= 0) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Este roteiro está sem valor válido para reserva.',
          preco: (roteiro as AnyRecord).preco ?? null,
          valor: (roteiro as AnyRecord).valor ?? null,
        },
        { status: 409 }
      )
    }

    const limitePessoas = numero(
      (roteiro as AnyRecord).limite_pessoas ||
        (roteiro as AnyRecord).capacidade ||
        (roteiro as AnyRecord).max_pessoas
    )

    if (limitePessoas > 0 && quantidadePessoas > limitePessoas) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: `Este roteiro permite no máximo ${limitePessoas} pessoa(s) por reserva.`,
        },
        { status: 409 }
      )
    }

    const valorTotal = Number((valorUnitarioServidor * quantidadePessoas).toFixed(2))
    const agora = new Date().toISOString()

    const dataTrilha =
      dataNormalizada(body.dataTrilha || body.data_trilha) ||
      dataNormalizada(
        (roteiro as AnyRecord).data_roteiro ||
          (roteiro as AnyRecord).data_saida ||
          (roteiro as AnyRecord).data_trilha ||
          (roteiro as AnyRecord).proxima_data ||
          (roteiro as AnyRecord).data
      )

    const payload: AnyRecord = {
      cliente_id: clienteId,
      roteiro_id: roteiroId,
      quantidade_pessoas: quantidadePessoas,
      quantidade: quantidadePessoas,
      valor_total: valorTotal,
      valor: valorTotal,
      status: 'pendente',
      pagamento_status: 'pendente',
      forma_pagamento: 'pix',
      saldo_utilizado: 0,
      data_trilha: dataTrilha,
      created_at: agora,
      updated_at: agora,
    }

    const reserva = await inserirReservaComFallback({
      supabase,
      payloadOriginal: payload,
    })

    if (!reserva?.id) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Reserva criada sem identificador. Verifique a tabela reservas.',
          payloadTentado: payload,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sucesso: true,
      reserva,
      reservaId: reserva.id,
      valorUnitario: valorUnitarioServidor,
      valorTotal,
      quantidadePessoas,
    })
  } catch (error: any) {
    const detalhe = serializarErro(error)

    console.error('Erro em POST /api/reservas/criar:', {
      detalhe,
      body,
    })

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          detalhe.message ||
          'Erro interno ao criar reserva.',
        detalhe,
        recebido: body,
      },
      { status: 500 }
    )
  }
}
