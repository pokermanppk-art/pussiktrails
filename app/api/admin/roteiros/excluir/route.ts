import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurada.')
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>

async function registrarLog(params: {
  supabase: SupabaseAdmin
  adminId: string | null
  roteiroId: string
  motivo: string
  tipoExclusao: string
  roteiro: AnyRecord | null
}) {
  const { supabase, adminId, roteiroId, motivo, tipoExclusao, roteiro } = params

  try {
    await supabase.from('logs_atividades').insert({
      usuario_id: adminId || null,
      tipo_usuario: 'admin',
      escopo: 'admin',
      tipo_evento: 'roteiro_excluido_admin',
      titulo: 'Roteiro removido pelo Admin',
      mensagem: `Roteiro removido pelo Admin. Tipo: ${tipoExclusao}. Motivo: ${motivo}`,
      metadata: {
        roteiro_id: roteiroId,
        motivo,
        tipo_exclusao: tipoExclusao,
        roteiro_snapshot: roteiro || null,
      },
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.warn('[admin/roteiros/excluir] Não foi possível registrar log:', error)
  }
}

async function tentarOcultarRoteiro(params: {
  supabase: SupabaseAdmin
  roteiroId: string
  adminId: string | null
  motivo: string
}) {
  const { supabase, roteiroId, adminId, motivo } = params
  const agora = new Date().toISOString()

  const tentativas = [
    {
      excluido_admin: true,
      ativo: false,
      excluido_em: agora,
      excluido_por: adminId,
      motivo_exclusao: motivo,
      exclusao_tipo: 'ocultado_admin',
      updated_at: agora,
    },
    {
      excluido_admin: true,
      ativo: false,
      excluido_em: agora,
      motivo_exclusao: motivo,
      updated_at: agora,
    },
    {
      ativo: false,
      status: 'pausado',
      updated_at: agora,
    },
    {
      ativo: false,
    },
  ]

  let ultimoErro: any = null

  for (const payload of tentativas) {
    const { data, error } = await supabase
      .from('roteiros')
      .update(payload)
      .eq('id', roteiroId)
      .select('id')
      .maybeSingle()

    if (!error && data?.id) {
      return {
        ok: true,
        payload,
      }
    }

    ultimoErro = error
  }

  return {
    ok: false,
    error: ultimoErro,
  }
}

async function tentarExcluirDefinitivo(params: {
  supabase: SupabaseAdmin
  roteiroId: string
}) {
  const { supabase, roteiroId } = params

  try {
    const { data: grupos } = await supabase
      .from('grupos_roteiros')
      .select('id')
      .eq('roteiro_id', roteiroId)

    const grupoIds = Array.isArray(grupos)
      ? grupos.map((grupo: AnyRecord) => grupo.id).filter(Boolean)
      : []

    if (grupoIds.length > 0) {
      await supabase.from('grupo_mensagens').delete().in('grupo_id', grupoIds)
      await supabase.from('grupo_notificacoes').delete().in('grupo_id', grupoIds)
      await supabase.from('grupo_membros').delete().in('grupo_id', grupoIds)
      await supabase.from('grupos_roteiros').delete().in('id', grupoIds)
    }
  } catch (error) {
    console.warn(
      '[admin/roteiros/excluir] Não foi possível limpar grupos vinculados:',
      error
    )
  }

  const { error } = await supabase
    .from('roteiros')
    .delete()
    .eq('id', roteiroId)

  if (error) {
    return {
      ok: false,
      error,
    }
  }

  return {
    ok: true,
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const roteiroId = texto(body.roteiroId || body.id)
    const adminId = texto(body.adminId) || null
    const motivo =
      texto(body.motivo) ||
      'Exclusão administrativa realizada pelo painel Admin.'
    const definitivo = body.definitivo === true

    if (!roteiroId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'roteiroId é obrigatório.',
        },
        { status: 400 }
      )
    }

    const { data: roteiro, error: roteiroError } = await supabase
      .from('roteiros')
      .select('*')
      .eq('id', roteiroId)
      .maybeSingle()

    if (roteiroError) {
      return NextResponse.json(
        {
          ok: false,
          error: roteiroError.message,
        },
        { status: 500 }
      )
    }

    if (!roteiro) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Roteiro não encontrado.',
        },
        { status: 404 }
      )
    }

    const { data: reservas, error: reservasError } = await supabase
      .from('reservas')
      .select('id, status, pagamento_status')
      .eq('roteiro_id', roteiroId)

    if (reservasError) {
      console.warn(
        '[admin/roteiros/excluir] Não foi possível verificar reservas:',
        reservasError
      )
    }

    const listaReservas = Array.isArray(reservas) ? reservas : []
    const temReservas = listaReservas.length > 0

    const temPagamentoOuReservaSensivel = listaReservas.some((reserva: AnyRecord) => {
      const status = normalizar(reserva.status)
      const pagamentoStatus = normalizar(reserva.pagamento_status)

      return (
        status === 'confirmada' ||
        status === 'realizada' ||
        status === 'pago' ||
        status === 'paga' ||
        pagamentoStatus === 'pago' ||
        pagamentoStatus === 'aprovado' ||
        pagamentoStatus === 'confirmado' ||
        pagamentoStatus === 'paid' ||
        pagamentoStatus === 'approved'
      )
    })

    if (definitivo && !temReservas && !temPagamentoOuReservaSensivel) {
      const exclusao = await tentarExcluirDefinitivo({
        supabase,
        roteiroId,
      })

      if (!exclusao.ok) {
        return NextResponse.json(
          {
            ok: false,
            error:
              exclusao.error?.message ||
              'Não foi possível excluir definitivamente o roteiro.',
          },
          { status: 500 }
        )
      }

      await registrarLog({
        supabase,
        adminId,
        roteiroId,
        motivo,
        tipoExclusao: 'definitiva',
        roteiro,
      })

      return NextResponse.json({
        ok: true,
        tipo: 'definitiva',
        message: 'Roteiro excluído definitivamente.',
      })
    }

    const ocultacao = await tentarOcultarRoteiro({
      supabase,
      roteiroId,
      adminId,
      motivo,
    })

    if (!ocultacao.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            ocultacao.error?.message ||
            'Não foi possível ocultar/desativar o roteiro.',
        },
        { status: 500 }
      )
    }

    await registrarLog({
      supabase,
      adminId,
      roteiroId,
      motivo,
      tipoExclusao: definitivo
        ? 'ocultado_por_segurança_havia_vinculos'
        : 'ocultado_admin',
      roteiro,
    })

    return NextResponse.json({
      ok: true,
      tipo: 'ocultado_admin',
      message: temReservas
        ? 'Roteiro ocultado/desativado. Havia reservas vinculadas, por isso o histórico foi preservado.'
        : 'Roteiro ocultado/desativado pelo Admin.',
      reservas_vinculadas: listaReservas.length,
    })
  } catch (error: any) {
    console.error('[admin/roteiros/excluir] Erro:', error)

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Erro interno ao excluir roteiro.',
      },
      { status: 500 }
    )
  }
}
