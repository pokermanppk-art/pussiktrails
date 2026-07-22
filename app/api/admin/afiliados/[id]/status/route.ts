import { NextResponse } from 'next/server'

import { normalizeText, validateAdminSecret } from '@/lib/affiliate-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ id: string }>
}

const allowedStatuses = new Set([
  'pending',
  'approved',
  'rejected',
  'suspended',
])

export async function PATCH(request: Request, context: RouteContext) {
  const secret = request.headers.get('x-affiliate-admin-secret')

  if (!validateAdminSecret(secret)) {
    return NextResponse.json(
      { sucesso: false, erro: 'Acesso administrativo não autorizado.' },
      { status: 401 },
    )
  }

  try {
    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const status = normalizeText(body?.status).toLowerCase()
    const reason = normalizeText(body?.motivo || body?.reason)

    if (!id || !allowedStatuses.has(status)) {
      return NextResponse.json(
        { sucesso: false, erro: 'Status administrativo inválido.' },
        { status: 400 },
      )
    }

    if (status === 'rejected' && !reason) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Informe o motivo da não aprovação.',
        },
        { status: 400 },
      )
    }

    const now = new Date().toISOString()
    const supabase = getSupabaseAdmin()

    const updatePayload: Record<string, unknown> = {
      status,
      rejection_reason: status === 'rejected' ? reason : null,
    }

    if (status === 'approved') {
      updatePayload.approved_at = now
      updatePayload.approved_by = 'admin_affiliate_portal'
    }

    if (status !== 'approved') {
      updatePayload.approved_at = null
    }

    const { data: affiliate, error } = await supabase
      .from('affiliate_accounts')
      .update(updatePayload)
      .eq('id', id)
      .select('id, full_name, email, status, rejection_reason, approved_at')
      .single()

    if (error) throw error

    await supabase.from('affiliate_audit_log').insert({
      affiliate_id: affiliate.id,
      action: `affiliate_status_changed_to_${status}`,
      actor_type: 'admin',
      actor_identifier: 'admin_affiliate_portal',
      metadata: {
        reason: reason || null,
      },
    })

    return NextResponse.json({
      sucesso: true,
      afiliado: affiliate,
    })
  } catch (error) {
    console.error('Erro ao atualizar status do afiliado:', error)

    return NextResponse.json(
      { sucesso: false, erro: 'Não foi possível atualizar o afiliado.' },
      { status: 500 },
    )
  }
}
