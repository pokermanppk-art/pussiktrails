import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  ''

type UsuarioBanco = {
  id: string
  nome?: string | null
  email?: string | null
  tipo?: string | null
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
    String(valor || '')
  )
}

function listaTextos(valor: any) {
  if (!Array.isArray(valor)) return []

  return valor
    .map((item) => limparTexto(item))
    .filter(Boolean)
}

function ehAdmin(valor: any) {
  const tipo = normalizar(valor)

  return (
    tipo === 'admin' ||
    tipo === 'adm' ||
    tipo === 'administrador' ||
    tipo === 'superadmin' ||
    tipo === 'super_admin'
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

async function buscarUsuarioPorId(supabase: any, userId: string) {
  if (!userId || !uuidValido(userId)) return null

  const { data, error } = await supabase
    .from('users')
    .select('id, nome, email, tipo')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.warn('Erro ao buscar usuário por ID:', error)
    return null
  }

  return (data || null) as UsuarioBanco | null
}

async function buscarUsuarioPorEmail(supabase: any, email: string) {
  const emailLimpo = limparTexto(email).toLowerCase()

  if (!emailLimpo) return null

  const { data, error } = await supabase
    .from('users')
    .select('id, nome, email, tipo')
    .ilike('email', emailLimpo)
    .maybeSingle()

  if (error) {
    console.warn('Erro ao buscar usuário por e-mail:', error)
    return null
  }

  return (data || null) as UsuarioBanco | null
}

async function buscarUsuarioPorPrefixo(supabase: any, prefixo: string) {
  const prefixoLimpo = limparTexto(prefixo)

  if (!prefixoLimpo || prefixoLimpo.length < 6) return null

  const { data, error } = await supabase
    .from('users')
    .select('id, nome, email, tipo')
    .limit(5000)

  if (error) {
    console.warn('Erro ao buscar usuários para resolver prefixo:', error)
    return null
  }

  const usuarios = (data || []) as UsuarioBanco[]

  return (
    usuarios.find((usuario) => usuario.id?.startsWith(prefixoLimpo)) ||
    null
  )
}

async function buscarAdmin(
  supabase: any,
  adminId: string,
  adminEmail: string,
  adminTipo: string
) {
  let admin: UsuarioBanco | null = null

  if (adminId && uuidValido(adminId)) {
    admin = await buscarUsuarioPorId(supabase, adminId)
  }

  if (!admin && adminEmail) {
    admin = await buscarUsuarioPorEmail(supabase, adminEmail)
  }

  if (admin?.id && ehAdmin(admin.tipo)) {
    return admin
  }

  // fallback controlado para o padrão atual do app via localStorage
  // só entra se o front enviou tipo admin e houver algum identificador mínimo
  if (ehAdmin(adminTipo) && (uuidValido(adminId) || adminEmail)) {
    return {
      id: uuidValido(adminId) ? adminId : '',
      nome: 'Admin',
      email: adminEmail || null,
      tipo: 'admin'
    } as UsuarioBanco
  }

  return null
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

async function resolverGuiaPorRoteiros(
  supabase: any,
  roteiroIds: string[]
) {
  const idsValidos = roteiroIds.filter(uuidValido)

  if (idsValidos.length === 0) return null

  const { data, error } = await supabase
    .from('roteiros')
    .select('id, id_guia, guia_id, user_id, usuario_id')
    .in('id', idsValidos)

  if (error) {
    console.warn('Erro ao resolver guia por roteiros:', error)
    return null
  }

  const roteiros = data || []

  for (const roteiro of roteiros) {
    const guiaId = guiaIdDoRoteiro(roteiro)

    if (uuidValido(guiaId)) {
      const guia = await buscarUsuarioPorId(supabase, guiaId)

      if (guia?.id) return guia
    }

    if (guiaId && !uuidValido(guiaId)) {
      const guia = await buscarUsuarioPorPrefixo(supabase, guiaId)

      if (guia?.id) return guia
    }
  }

  return null
}

async function resolverGuiaPorReservas(
  supabase: any,
  reservaIds: string[]
) {
  const idsValidos = reservaIds.filter(uuidValido)

  if (idsValidos.length === 0) return null

  const { data, error } = await supabase
    .from('reservas')
    .select('id, roteiro_id, guia_id, id_guia')
    .in('id', idsValidos)

  if (error) {
    console.warn('Erro ao resolver guia por reservas:', error)
    return null
  }

  const reservas = data || []

  for (const reserva of reservas) {
    const guiaDireto = limparTexto(reserva?.guia_id || reserva?.id_guia || '')

    if (uuidValido(guiaDireto)) {
      const guia = await buscarUsuarioPorId(supabase, guiaDireto)

      if (guia?.id) return guia
    }

    if (guiaDireto && !uuidValido(guiaDireto)) {
      const guia = await buscarUsuarioPorPrefixo(supabase, guiaDireto)

      if (guia?.id) return guia
    }
  }

  const roteiroIds = reservas
    .map((reserva: any) => limparTexto(reserva?.roteiro_id))
    .filter(Boolean)

  return resolverGuiaPorRoteiros(supabase, roteiroIds)
}

async function resolverGuia(
  supabase: any,
  guiaId: string,
  reservaIds: string[],
  roteiroIds: string[]
) {
  if (guiaId && uuidValido(guiaId)) {
    const guia = await buscarUsuarioPorId(supabase, guiaId)

    if (guia?.id) return guia
  }

  if (guiaId && !uuidValido(guiaId)) {
    const guia = await buscarUsuarioPorPrefixo(supabase, guiaId)

    if (guia?.id) return guia
  }

  const guiaPorRoteiro = await resolverGuiaPorRoteiros(supabase, roteiroIds)

  if (guiaPorRoteiro?.id) return guiaPorRoteiro

  const guiaPorReserva = await resolverGuiaPorReservas(supabase, reservaIds)

  if (guiaPorReserva?.id) return guiaPorReserva

  return null
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

    const adminEmail = limparTexto(
      body.adminEmail ||
        body.admin_email ||
        body.email ||
        ''
    )

    const adminTipo = limparTexto(
      body.adminTipo ||
        body.admin_tipo ||
        body.tipo ||
        ''
    )

    const guiaIdOriginal = limparTexto(
      body.guiaId ||
        body.guia_id ||
        body.id_guia
    )

    const guiaNomeEnviado = limparTexto(
      body.guiaNome ||
        body.guia_nome ||
        ''
    )

    const reservaIds = listaTextos(body.reservaIds || body.reserva_ids)
    const roteiroIds = listaTextos(body.roteiroIds || body.roteiro_ids)

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

    if ((!adminId || !uuidValido(adminId)) && !adminEmail && !ehAdmin(adminTipo)) {
      return json(
        {
          sucesso: false,
          erro: 'Admin inválido. Não foi enviado ID válido, e-mail ou tipo administrativo.'
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

    const admin = await buscarAdmin(supabase, adminId, adminEmail, adminTipo)

    if (!admin) {
      return json(
        {
          sucesso: false,
          erro: 'Usuário sem permissão administrativa ou admin não localizado.',
          debug: {
            adminIdRecebido: adminId || null,
            adminEmailRecebido: adminEmail || null,
            adminTipoRecebido: adminTipo || null
          }
        },
        403
      )
    }

    const guia = await resolverGuia(
      supabase,
      guiaIdOriginal,
      reservaIds,
      roteiroIds
    )

    if (!guia?.id) {
      return json(
        {
          sucesso: false,
          erro:
            'Guia não encontrado. O sistema recebeu um ID curto ou inválido e não conseguiu resolver pelo roteiro/reserva.',
          debug: {
            guiaIdRecebido: guiaIdOriginal || null,
            guiaNomeEnviado: guiaNomeEnviado || null,
            reservaIdsRecebidos: reservaIds.length,
            roteiroIdsRecebidos: roteiroIds.length
          }
        },
        404
      )
    }

    const agora = new Date().toISOString()
    const nomeGuia = guia.nome || guia.email || guiaNomeEnviado || guia.id

    const payload = {
      guia_id: guia.id,
      id_guia: guia.id,

      ...(admin?.id && uuidValido(admin.id)
        ? {
            admin_id: admin.id,
            criado_por: admin.id
          }
        : {}),

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
      admin: {
        id: admin.id || null,
        nome: admin.nome || admin.email || 'Admin',
        email: admin.email || null
      },
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