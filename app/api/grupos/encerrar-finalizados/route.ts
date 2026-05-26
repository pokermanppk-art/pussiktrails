import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

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

function normalizar(valor: unknown) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function extrairDataFinalRoteiro(roteiro: Record<string, unknown>) {
  const candidatos = [
    roteiro.data_fim,
    roteiro.data_final,
    roteiro.data_trilha,
    roteiro.data_roteiro,
    roteiro.embarque_data_hora,
    roteiro.data,
  ]

  for (const item of candidatos) {
    if (!item) continue

    const data = new Date(String(item))

    if (!Number.isNaN(data.getTime())) {
      return data
    }
  }

  return null
}

function roteiroEstaFinalizado(roteiro: Record<string, unknown>, diasApos: number) {
  const status = normalizar(roteiro.status)

  if (
    status === 'realizado' ||
    status === 'realizada' ||
    status === 'finalizado' ||
    status === 'finalizada' ||
    status === 'encerrado' ||
    status === 'encerrada'
  ) {
    return true
  }

  const dataFinal = extrairDataFinalRoteiro(roteiro)

  if (!dataFinal) return false

  const limite = new Date()
  limite.setDate(limite.getDate() - diasApos)

  return dataFinal.getTime() < limite.getTime()
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const grupoId = body.grupoId || body.grupo_id || null
    const diasApos = Number(body.diasApos ?? body.dias_apos ?? 0)

    if (grupoId) {
      const { data, error } = await supabase.rpc('encerrar_grupo_roteiro', {
        p_grupo_id: grupoId,
        p_motivo: 'roteiro_finalizado',
      })

      if (error) throw error

      return NextResponse.json({
        sucesso: true,
        encerrados: data ? 1 : 0,
      })
    }

    const { data: grupos, error: gruposError } = await supabase
      .from('grupos_roteiros')
      .select('*')
      .neq('status', 'encerrado')
      .limit(200)

    if (gruposError) throw gruposError

    let encerrados = 0
    const detalhes: Array<{
      grupoId: string
      roteiroId: string | null
      encerrado: boolean
    }> = []

    for (const grupo of grupos || []) {
      const roteiroId = grupo.roteiro_id || null

      if (!roteiroId) {
        detalhes.push({
          grupoId: grupo.id,
          roteiroId: null,
          encerrado: false,
        })
        continue
      }

      const { data: roteiro, error: roteiroError } = await supabase
        .from('roteiros')
        .select('*')
        .eq('id', roteiroId)
        .maybeSingle()

      if (roteiroError || !roteiro) {
        detalhes.push({
          grupoId: grupo.id,
          roteiroId,
          encerrado: false,
        })
        continue
      }

      const deveEncerrar = roteiroEstaFinalizado(
        roteiro as Record<string, unknown>,
        diasApos
      )

      if (!deveEncerrar) {
        detalhes.push({
          grupoId: grupo.id,
          roteiroId,
          encerrado: false,
        })
        continue
      }

      const { data: ok, error: encerrarError } = await supabase.rpc(
        'encerrar_grupo_roteiro',
        {
          p_grupo_id: grupo.id,
          p_motivo: 'roteiro_finalizado',
        }
      )

      if (encerrarError) {
        detalhes.push({
          grupoId: grupo.id,
          roteiroId,
          encerrado: false,
        })
        continue
      }

      if (ok) encerrados += 1

      detalhes.push({
        grupoId: grupo.id,
        roteiroId,
        encerrado: Boolean(ok),
      })
    }

    return NextResponse.json({
      sucesso: true,
      analisados: grupos?.length || 0,
      encerrados,
      detalhes,
    })
  } catch (error) {
    console.error('Erro em /api/grupos/encerrar-finalizados:', error)

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : 'Erro ao encerrar grupos finalizados.',
      },
      { status: 500 }
    )
  }
}