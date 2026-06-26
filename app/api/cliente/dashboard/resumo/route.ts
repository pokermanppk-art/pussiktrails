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

function numero(valor: unknown) {
  const n = Number(valor || 0)
  return Number.isFinite(n) ? n : 0
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function tituloRoteiro(roteiro?: AnyRecord | null) {
  return roteiro?.titulo || roteiro?.nome || 'Roteiro'
}

function fotoRoteiro(roteiro?: AnyRecord | null) {
  return roteiro?.foto_capa || roteiro?.foto_url || roteiro?.imagem_url || ''
}

function primeiroValor(registro: AnyRecord | null | undefined, campos: string[]) {
  for (const campo of campos) {
    const valor = registro?.[campo]
    if (valor !== null && valor !== undefined && String(valor).trim() !== '') return valor
  }

  return null
}

function idRoteiroDaReserva(reserva: AnyRecord) {
  return texto(
    primeiroValor(reserva, [
      'roteiro_id',
      'id_roteiro',
      'roteiroId',
      'roteiro',
      'experiencia_id',
      'experienciaId',
    ])
  )
}

function kmRoteiro(roteiro?: AnyRecord | null) {
  return numero(
    primeiroValor(roteiro, [
      'km',
      'distancia_km',
      'distanciaKm',
      'distancia',
      'quilometragem',
      'km_total',
      'distancia_total_km',
      'percurso_km',
    ])
  )
}

function dataSegura(valor: unknown): Date | null {
  if (!valor) return null

  const raw = texto(valor)
  if (!raw) return null

  const matchDataBR = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/)
  if (matchDataBR) {
    const [, dia, mes, ano, hora = '12', minuto = '00'] = matchDataBR
    const dataBR = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto))
    if (!Number.isNaN(dataBR.getTime())) return dataBR
  }

  const data = new Date(raw)
  if (Number.isNaN(data.getTime())) return null

  const ano = data.getFullYear()
  if (ano < 2020 || ano > 2100) return null

  return data
}

function dataExecucaoRegistro(registro?: AnyRecord | null): Date | null {
  const campos = [
    'embarque_data_hora',
    'saida_data_hora',
    'data_hora',
    'data_roteiro',
    'data_trilha',
    'data_inicio',
    'data_saida',
    'data_evento',
    'data_realizacao',
    'data_execucao',
    'data_agendada',
    'data_agendamento',
    'inicio_em',
    'realizado_em',
    'executado_em',
    'start_date',
    'starts_at',
    'data',
  ]

  for (const campo of campos) {
    const data = dataSegura(registro?.[campo])
    if (data) return data
  }

  return null
}

function dataJaPassou(registro?: AnyRecord | null) {
  const data = dataExecucaoRegistro(registro)
  if (!data) return false

  const fimDoDia = new Date(data)
  fimDoDia.setHours(23, 59, 59, 999)

  return fimDoDia.getTime() < Date.now()
}

function statusExecutado(registro?: AnyRecord | null) {
  const status = normalizar(registro?.status)

  return [
    'realizado',
    'realizada',
    'executado',
    'executada',
    'concluido',
    'concluida',
    'finalizado',
    'finalizada',
    'encerrado',
    'encerrada',
  ].includes(status)
}

function reservaCancelada(reserva: AnyRecord) {
  const status = normalizar(reserva.status)

  return (
    status === 'cancelada' ||
    status === 'cancelado' ||
    status === 'cancelled' ||
    status === 'canceled'
  )
}

function pagamentoConfirmado(reserva: AnyRecord) {
  const pagamento = normalizar(
    reserva.pagamento_status ||
      reserva.status_pagamento ||
      reserva.payment_status
  )

  const status = normalizar(reserva.status)

  const statusPagos = [
    'pago',
    'paga',
    'confirmado',
    'confirmada',
    'aprovado',
    'aprovada',
    'paid',
    'approved',
    'settled',
    'completed',
    'liquidado',
    'liquidada',
  ]

  return (
    statusPagos.includes(pagamento) ||
    Boolean(texto(reserva.pagamento_confirmado_em)) ||
    status === 'confirmada' ||
    status === 'realizada'
  )
}

function contaParaJornada(reserva: AnyRecord, roteiro?: AnyRecord | null) {
  if (reservaCancelada(reserva)) return false

  const roteiroStatus = normalizar(roteiro?.status)
  if (
    roteiroStatus === 'rascunho' ||
    roteiroStatus === 'cancelado' ||
    roteiroStatus === 'cancelada' ||
    roteiroStatus === 'excluido' ||
    roteiroStatus === 'excluida' ||
    roteiroStatus === 'rejeitado' ||
    roteiroStatus === 'rejeitada' ||
    roteiroStatus === 'inativo' ||
    roteiroStatus === 'inativa'
  ) {
    return false
  }

  // Regra operacional final:
  // pagamento confirmado libera grupo/comunicação;
  // somente reserva marcada como realizada soma trilhas, KM e medalhas.
  if (statusExecutado(reserva)) return true

  return false
}
function tempoRelativo(valor?: string | null) {
  if (!valor) return ''

  const data = new Date(valor).getTime()

  if (Number.isNaN(data)) return ''

  const diff = Date.now() - data
  const minutos = Math.floor(diff / 60000)
  const horas = Math.floor(minutos / 60)
  const dias = Math.floor(horas / 24)

  if (minutos < 1) return 'agora'
  if (minutos < 60) return `${minutos}min atrás`
  if (horas < 24) return `${horas}h atrás`
  if (dias === 1) return 'ontem'
  if (dias < 7) return `${dias} dias atrás`

  return new Date(valor).toLocaleDateString('pt-BR')
}

function medalhaRelacionada(item: AnyRecord) {
  if (Array.isArray(item.medalhas)) return item.medalhas[0] || null
  return item.medalhas || null
}

function progressoPercentual(item: AnyRecord) {
  const atual = numero(item.progresso_atual)
  const total = numero(item.progresso_total) || 1

  return Math.min(100, Math.max(0, Math.round((atual / total) * 100)))
}

function montarNotificacao(log: AnyRecord, clienteId: string, email?: string | null) {
  const textoBusca = normalizar(
    [
      log.tipo_usuario,
      log.tipo,
      log.acao,
      log.descricao,
      log.detalhes,
      log.origem,
      log.destino,
      log.rota,
    ].join(' ')
  )

  if (
    textoBusca.includes('admin') ||
    textoBusca.includes('administrador') ||
    textoBusca.includes('/admin')
  ) {
    return null
  }

  const metadata =
    log.metadata && typeof log.metadata === 'object' ? log.metadata : {}

  const acao = normalizar(log.acao || log.tipo || log.descricao)

  const isDoUsuario =
    log.usuario_id === clienteId ||
    log.user_id === clienteId ||
    log.cliente_id === clienteId ||
    log.email === email

  const nome =
    log.primeiro_nome ||
    log.nome ||
    log.nome_usuario ||
    log.guia_nome ||
    'Alguém'

  const destinoLog =
    typeof log.destino === 'string' && log.destino.startsWith('/')
      ? log.destino
      : typeof metadata.destino === 'string' && metadata.destino.startsWith('/')
        ? metadata.destino
        : ''

  const roteiroId =
    log.roteiro_id ||
    log.id_roteiro ||
    metadata.roteiro_id ||
    metadata.roteiroId ||
    metadata.id_roteiro ||
    ''

  const perfilUsuarioId =
    log.perfil_usuario_id ||
    log.usuario_alvo_id ||
    log.cliente_id ||
    metadata.perfil_usuario_id ||
    metadata.usuario_alvo_id ||
    metadata.cliente_id ||
    metadata.userId ||
    ''

  const fotoId =
    log.foto_id ||
    metadata.foto_id ||
    metadata.fotoId ||
    ''

  if (acao.includes('roteiro') || acao.includes('criou')) {
    return {
      id: String(log.id),
      titulo: 'Novo roteiro no ar',
      texto: `${nome} criou uma nova experiência outdoor.`,
      emoji: '🧭',
      tipo: isDoUsuario ? 'all' : 'com',
      destino: roteiroId ? `/roteiros/${roteiroId}` : destinoLog || '/roteiros',
      created_at: log.created_at,
    }
  }

  if (acao.includes('curtiu') || acao.includes('like')) {
    return {
      id: String(log.id),
      titulo: 'Foto curtida',
      texto: `${nome} curtiu uma foto da comunidade.`,
      emoji: '❤️',
      tipo: isDoUsuario ? 'all' : 'com',
      destino: perfilUsuarioId
        ? `/cliente/publico/${perfilUsuarioId}${fotoId ? `?foto=${fotoId}` : ''}`
        : destinoLog || '/cliente/perfil',
      created_at: log.created_at,
    }
  }

  if (acao.includes('medalha') || acao.includes('badge') || acao.includes('conquista')) {
    return {
      id: String(log.id),
      titulo: 'Conquista desbloqueada',
      texto: `${nome} ganhou uma nova medalha.`,
      emoji: '🏅',
      tipo: isDoUsuario ? 'all' : 'com',
      destino: '/cliente/perfil',
      created_at: log.created_at,
    }
  }

  if (acao.includes('avaliou') || acao.includes('avalia')) {
    return {
      id: String(log.id),
      titulo: 'Nova avaliação',
      texto: `${nome} avaliou uma experiência.`,
      emoji: '⭐',
      tipo: isDoUsuario ? 'all' : 'com',
      destino: '/roteiros',
      created_at: log.created_at,
    }
  }

  if (acao.includes('reservou') || acao.includes('reserva')) {
    return {
      id: String(log.id),
      titulo: 'Reserva feita',
      texto: `${nome} reservou uma aventura.`,
      emoji: '🎒',
      tipo: isDoUsuario ? 'all' : 'com',
      destino: roteiroId ? `/roteiros/${roteiroId}` : destinoLog || '/cliente/minhas-reservas',
      created_at: log.created_at,
    }
  }

  return {
    id: String(log.id),
    titulo: 'Movimento na comunidade',
    texto: log.detalhes || log.descricao || `${nome} interagiu no PrussikTrails.`,
    emoji: '🌿',
    tipo: isDoUsuario ? 'all' : 'com',
    destino: destinoLog || '/cliente/dashboard',
    created_at: log.created_at,
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)

    const clienteId = texto(
      searchParams.get('clienteId') ||
        searchParams.get('cliente_id') ||
        searchParams.get('usuarioId') ||
        searchParams.get('usuario_id')
    )

    if (!clienteId) {
      return NextResponse.json(
        { sucesso: false, erro: 'clienteId é obrigatório.' },
        { status: 400 }
      )
    }

    const [
      usuarioResult,
      reservasResult,
      medalhasResult,
      logsResult,
      roteirosAtivosResult,
    ] = await Promise.all([
      supabase
        .from('users')
        .select('*')
        .eq('id', clienteId)
        .maybeSingle(),

      supabase
        .from('reservas')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })
        .limit(1000),

      supabase
        .from('usuarios_medalhas')
        .select(`
          id,
          usuario_id,
          medalha_id,
          status,
          progresso_atual,
          progresso_total,
          conquistada_em,
          medalhas (
            id,
            codigo,
            nome,
            descricao,
            categoria,
            nivel,
            icone,
            cor,
            especial,
            ordem
          )
        `)
        .eq('usuario_id', clienteId)
        .limit(40),

      supabase
        .from('logs_atividades')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(24),

      supabase
        .from('roteiros')
        .select('*')
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })
        .limit(16),
    ])

    if (usuarioResult.error) throw usuarioResult.error

    const usuario: AnyRecord | null = usuarioResult.data || null

    if (!usuario?.id) {
      return NextResponse.json(
        { sucesso: false, erro: 'Cliente não encontrado.' },
        { status: 404 }
      )
    }

    const reservasBase: AnyRecord[] = Array.isArray(reservasResult.data)
      ? (reservasResult.data as AnyRecord[])
      : []

    const medalhasBase: AnyRecord[] = Array.isArray(medalhasResult.data)
      ? (medalhasResult.data as AnyRecord[])
      : []

    const logsBase: AnyRecord[] = Array.isArray(logsResult.data)
      ? (logsResult.data as AnyRecord[])
      : []

    const roteirosAtivos: AnyRecord[] = Array.isArray(roteirosAtivosResult.data)
      ? (roteirosAtivosResult.data as AnyRecord[])
      : []

    const roteiroIdsReservas = Array.from(
      new Set(
        reservasBase
          .map((reserva: AnyRecord) => idRoteiroDaReserva(reserva))
          .filter(Boolean)
      )
    )

    const roteiroIdsAtivos = Array.from(
      new Set(
        roteirosAtivos
          .map((roteiro: AnyRecord) => texto(roteiro.id))
          .filter(Boolean)
      )
    )

    let roteirosReservados: AnyRecord[] = []
    let reservasHot: AnyRecord[] = []

    if (roteiroIdsReservas.length > 0) {
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .in('id', roteiroIdsReservas)

      if (error) {
        console.warn('[cliente/dashboard/resumo] Erro ao buscar roteiros reservados:', error)
      } else {
        roteirosReservados = Array.isArray(data) ? (data as AnyRecord[]) : []
      }
    }

    if (roteiroIdsAtivos.length > 0) {
      const { data, error } = await supabase
        .from('reservas')
        .select('id, roteiro_id, status, pagamento_status, status_pagamento, pagamento_confirmado_em, created_at')
        .in('roteiro_id', roteiroIdsAtivos)
        .order('created_at', { ascending: false })
        .limit(160)

      if (error) {
        console.warn('[cliente/dashboard/resumo] Erro ao buscar reservas dos roteiros ativos:', error)
      } else {
        reservasHot = Array.isArray(data) ? (data as AnyRecord[]) : []
      }
    }

    const reservasComRoteiro: AnyRecord[] = reservasBase.map(
      (reserva: AnyRecord): AnyRecord => {
        const roteiroId = idRoteiroDaReserva(reserva)
        const roteiro =
          roteirosReservados.find(
            (item: AnyRecord) => String(item.id) === roteiroId
          ) || null

        return {
          ...reserva,
          roteiro_id_resolvido: roteiroId,
          roteiro,
          roteiro_titulo: tituloRoteiro(roteiro),
          roteiro_foto: fotoRoteiro(roteiro),
        }
      }
    )

    const reservasJornada: AnyRecord[] = reservasComRoteiro.filter((reserva: AnyRecord) => {
      return contaParaJornada(reserva, reserva.roteiro)
    })

    const totalKm = reservasJornada.reduce((soma: number, reserva: AnyRecord) => {
      return soma + kmRoteiro(reserva.roteiro)
    }, 0)

    const reservasPendentes = reservasComRoteiro.filter((reserva: AnyRecord) => {
      const status = normalizar(reserva.status)
      return !reservaCancelada(reserva) && !pagamentoConfirmado(reserva) && (status === 'pendente' || status === 'aguardando')
    }).length

    const reservasConfirmadas = reservasComRoteiro.filter((reserva: AnyRecord) => {
      return !reservaCancelada(reserva) && pagamentoConfirmado(reserva)
    }).length

    const proximasReservas: AnyRecord[] = reservasComRoteiro
      .filter((reserva: AnyRecord) => {
        if (reservaCancelada(reserva)) return false

        const status = normalizar(reserva.status)

        return (
          status === 'confirmada' ||
          status === 'pendente' ||
          status === 'aguardando'
        )
      })
      .slice(0, 3)

    const conquistadas: AnyRecord[] = medalhasBase
      .filter((item: AnyRecord) => normalizar(item.status) === 'conquistada')
      .sort((a: AnyRecord, b: AnyRecord) => {
        const medalhaA = medalhaRelacionada(a)
        const medalhaB = medalhaRelacionada(b)

        return numero(medalhaA?.ordem) - numero(medalhaB?.ordem)
      })

    const proximaMedalha: AnyRecord | null =
      medalhasBase
        .filter((item: AnyRecord) => normalizar(item.status) !== 'conquistada')
        .sort((a: AnyRecord, b: AnyRecord) => progressoPercentual(b) - progressoPercentual(a))[0] ||
      null

    const mapaHot = new Map<string, { score: number; total: number; confirmadas: number }>()
    const agoraMs = Date.now()
    const trintaDias = 1000 * 60 * 60 * 24 * 30

    reservasHot.forEach((reserva: AnyRecord) => {
      const roteiroId = texto(reserva.roteiro_id)

      if (!roteiroId) return
      if (reservaCancelada(reserva)) return

      const atual = mapaHot.get(roteiroId) || {
        score: 0,
        total: 0,
        confirmadas: 0,
      }

      atual.total += 1

      if (pagamentoConfirmado(reserva)) {
        atual.score += 8
        atual.confirmadas += 1
      } else {
        atual.score += 3
      }

      const data = new Date(reserva.created_at || '').getTime()

      if (!Number.isNaN(data)) {
        const idade = agoraMs - data
        if (idade <= trintaDias) atual.score += 4
        if (idade <= trintaDias / 2) atual.score += 2
      }

      mapaHot.set(roteiroId, atual)
    })

    const roteirosQuentes: AnyRecord[] = roteirosAtivos
      .map((roteiro: AnyRecord): AnyRecord => {
        const info = mapaHot.get(String(roteiro.id)) || {
          score: 0,
          total: 0,
          confirmadas: 0,
        }

        return {
          ...roteiro,
          hot_score: info.score,
          hot_reservas: info.total,
          hot_confirmadas: info.confirmadas,
        }
      })
      .sort((a: AnyRecord, b: AnyRecord) => {
        if (numero(b.hot_score) !== numero(a.hot_score)) {
          return numero(b.hot_score) - numero(a.hot_score)
        }

        const dataA = new Date(a.created_at || '').getTime()
        const dataB = new Date(b.created_at || '').getTime()

        return (Number.isNaN(dataB) ? 0 : dataB) - (Number.isNaN(dataA) ? 0 : dataA)
      })
      .slice(0, 5)

    const notificacoesLogs: AnyRecord[] = logsBase
      .map((log: AnyRecord) => montarNotificacao(log, clienteId, usuario.email))
      .filter(Boolean) as AnyRecord[]

    const notificacoesFallback: AnyRecord[] = proximasReservas
      .slice(0, 6)
      .map((reserva: AnyRecord): AnyRecord => {
        return {
          id: `reserva-${reserva.id}`,
          titulo: pagamentoConfirmado(reserva)
            ? 'Sua aventura foi confirmada'
            : 'Reserva aguardando confirmação',
          texto: `${reserva.roteiro_titulo || 'Roteiro'} · ${numero(reserva.valor_total).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}`,
          emoji: pagamentoConfirmado(reserva) ? '✅' : '🎒',
          tipo: 'all',
          destino: '/cliente/minhas-reservas',
          created_at: reserva.created_at,
        }
      })

    const notificacoes: AnyRecord[] =
      notificacoesLogs.length > 0
        ? notificacoesLogs.slice(0, 12)
        : [
            ...notificacoesFallback,
            {
              id: 'com-roteiro-1',
              titulo: 'Novo roteiro chegando',
              texto: 'Um guia publicou uma nova experiência para a comunidade.',
              emoji: '🧭',
              tipo: 'com',
              destino: '/roteiros',
              created_at: new Date().toISOString(),
            },
          ].slice(0, 12)

    return NextResponse.json({
      sucesso: true,
      usuario: {
        id: usuario.id,
        nome: usuario.nome || usuario.name || usuario.full_name || usuario.email || '',
        email: usuario.email || '',
        tipo: usuario.tipo || 'cliente',
        avatar_url: usuario.avatar_url || null,
        foto_url: usuario.foto_url || null,
        imagem_url: usuario.imagem_url || null,
      },
      stats: {
        totalKm,
        totalTrilhas: reservasJornada.length,
        reservasPendentes,
        reservasConfirmadas,
        reservasRealizadas: reservasJornada.length,
        totalMedalhas: conquistadas.length,
        ultimaAtividade: reservasComRoteiro[0]?.created_at
          ? tempoRelativo(reservasComRoteiro[0].created_at)
          : 'Sem histórico',
      },
      proximasReservas,
      roteirosQuentes,
      notificacoes,
      medalhasConquistadas: conquistadas.slice(0, 12),
      proximaMedalha,
      ultimaAtualizacao: new Date().toLocaleTimeString('pt-BR'),
      avisos: {
        reservasErro: reservasResult.error?.message || null,
        medalhasErro: medalhasResult.error?.message || null,
        logsErro: logsResult.error?.message || null,
        roteirosErro: roteirosAtivosResult.error?.message || null,
      },
    })
  } catch (error: any) {
    console.error('Erro em GET /api/cliente/dashboard/resumo:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack,
    })

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error?.message ||
          'Erro ao carregar resumo da dashboard do cliente.',
        detalhe: {
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          message: error?.message,
        },
      },
      { status: 500 }
    )
  }
}