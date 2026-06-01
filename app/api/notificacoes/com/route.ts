import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

type UsuarioPublico = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
  tipo?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
}

type NotificacaoCom = {
  id: string
  tipo: string
  titulo: string
  mensagem: string
  destino_url: string
  created_at: string | null
  ator_id: string
  ator_nome: string
  ator_tipo: string
  ator_avatar_url: string
  lida: boolean
  metadata?: AnyRecord
}

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function getSupabaseAdmin(): any {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

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

function extrairUsuarioId(request: Request) {
  const { searchParams } = new URL(request.url)

  return texto(
    searchParams.get('usuarioId') ||
      searchParams.get('usuario_id') ||
      searchParams.get('userId') ||
      searchParams.get('user_id') ||
      searchParams.get('clienteId') ||
      searchParams.get('guiaId')
  )
}

function dataEvento(item: AnyRecord) {
  return texto(
    item.created_at ||
      item.criado_em ||
      item.createdAt ||
      item.data ||
      item.updated_at ||
      item.aprovado_em ||
      item.publicado_em
  ) || null
}

function metadataDoItem(item: AnyRecord) {
  return item.metadata && typeof item.metadata === 'object' ? item.metadata : {}
}

function idDoAtor(item: AnyRecord) {
  const metadata = metadataDoItem(item)

  return texto(
    item.seguidor_id ||
      item.ator_id ||
      item.usuario_id ||
      item.user_id ||
      item.autor_id ||
      item.curtidor_id ||
      item.cliente_id ||
      item.guia_id ||
      item.quem_curtiu_id ||
      item.created_by ||
      metadata.ator_id ||
      metadata.usuario_id ||
      metadata.guia_id ||
      metadata.cliente_id
  )
}

function idDoAlvo(item: AnyRecord) {
  const metadata = metadataDoItem(item)

  return texto(
    item.alvo_id ||
      item.destino_id ||
      item.usuario_destino_id ||
      item.usuario_alvo_id ||
      item.dono_id ||
      item.dono_usuario_id ||
      item.perfil_id ||
      item.target_id ||
      item.target_user_id ||
      item.seguido_id ||
      item.receptor_id ||
      item.recebedor_id ||
      metadata.alvo_id ||
      metadata.destino_id ||
      metadata.usuario_destino_id ||
      metadata.usuario_alvo_id ||
      metadata.dono_id ||
      metadata.target_id ||
      metadata.target_user_id ||
      metadata.seguido_id ||
      metadata.receptor_id
  )
}

function idDoSeguidor(item: AnyRecord) {
  const metadata = metadataDoItem(item)

  return texto(
    item.seguidor_id ||
      item.follower_id ||
      item.usuario_id ||
      item.user_id ||
      item.cliente_id ||
      item.ator_id ||
      metadata.seguidor_id ||
      metadata.follower_id ||
      metadata.usuario_id ||
      metadata.user_id ||
      metadata.cliente_id ||
      metadata.ator_id
  )
}

function idDoSeguido(item: AnyRecord) {
  const metadata = metadataDoItem(item)

  return texto(
    item.seguido_id ||
      item.following_id ||
      item.alvo_id ||
      item.usuario_alvo_id ||
      item.target_id ||
      item.target_user_id ||
      item.guia_id ||
      item.perfil_id ||
      item.dono_id ||
      metadata.seguido_id ||
      metadata.following_id ||
      metadata.alvo_id ||
      metadata.usuario_alvo_id ||
      metadata.target_id ||
      metadata.target_user_id ||
      metadata.guia_id ||
      metadata.perfil_id ||
      metadata.dono_id
  )
}

function guiaIdDoRoteiro(roteiro: AnyRecord) {
  return texto(
    roteiro.id_guia ||
      roteiro.guia_id ||
      roteiro.user_id ||
      roteiro.usuario_id ||
      roteiro.criado_por ||
      roteiro.created_by ||
      roteiro.owner_id ||
      roteiro.autor_id
  )
}

function tituloRoteiro(roteiro: AnyRecord) {
  return texto(roteiro.titulo || roteiro.nome || roteiro.nome_roteiro || 'Roteiro')
}

function localRoteiro(roteiro: AnyRecord) {
  return texto(
    roteiro.local ||
      roteiro.localizacao ||
      roteiro.cidade ||
      roteiro.destino ||
      roteiro.embarque_local ||
      roteiro.local_encontro ||
      roteiro.ponto_encontro ||
      ''
  )
}

function statusRoteiro(roteiro: AnyRecord) {
  return normalizar(roteiro.status || roteiro.publicacao || roteiro.situacao || roteiro.estado)
}

function roteiroPublicado(roteiro: AnyRecord) {
  const status = statusRoteiro(roteiro)

  const removido =
    Boolean(roteiro.removido_em) ||
    Boolean(roteiro.excluido_em) ||
    roteiro.removido_pelo_admin === true ||
    roteiro.removido_pelo_guia === true ||
    status.includes('remov') ||
    status.includes('exclu') ||
    status.includes('arquiv') ||
    status.includes('cancel')

  if (removido) return false

  return (
    roteiro.ativo === true ||
    status === 'ativo' ||
    status === 'aprovado' ||
    status === 'aprovada' ||
    status === 'publicado' ||
    status === 'publicada' ||
    status === 'confirmado' ||
    status === 'confirmada'
  )
}

function nomeUsuario(usuario?: UsuarioPublico | null) {
  return texto(usuario?.nome || usuario?.name || usuario?.email || 'Usuário')
}

function avatarUsuario(usuario?: UsuarioPublico | null) {
  return texto(usuario?.avatar_url || usuario?.foto_url || usuario?.imagem_url)
}

function rotaPerfil(usuario: UsuarioPublico | undefined, usuarioId: string) {
  const tipo = normalizar(usuario?.tipo)

  if (tipo === 'guia') return `/guia/publico/${usuarioId}`
  return `/cliente/publico/${usuarioId}`
}

async function buscarUsuarios(supabase: any, ids: string[]) {
  const unicos = Array.from(new Set(ids.filter(Boolean)))
  const mapa = new Map<string, UsuarioPublico>()

  if (unicos.length === 0) return mapa

  const { data, error } = await supabase
    .from('users')
    .select('id, nome, name, email, tipo, avatar_url, foto_url, imagem_url')
    .in('id', unicos)

  if (error) {
    console.warn('[notificacoes/com] Erro ao buscar usuários:', error)
    return mapa
  }

  ;((data || []) as UsuarioPublico[]).forEach((usuario) => {
    if (usuario.id) mapa.set(usuario.id, usuario)
  })

  return mapa
}

async function buscarSeguidores(supabase: any, usuarioId: string): Promise<AnyRecord[]> {
  const tabelas = [
    'seguidores',
    'usuarios_seguidores',
    'com_seguidores',
    'seguidores_perfil',
    'follows',
  ]

  const encontrados: AnyRecord[] = []

  for (const tabela of tabelas) {
    try {
      const { data, error } = await supabase
        .from(tabela)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(180)

      if (error || !data) continue

      ;((data || []) as AnyRecord[]).forEach((item) => {
        const alvo = idDoSeguido(item) || idDoAlvo(item)

        if (alvo === usuarioId) {
          encontrados.push({ ...item, __tabela: tabela })
        }
      })
    } catch {
      // tabela pode não existir; segue para a próxima
    }
  }

  return deduplicarPorChave(encontrados, (item) => {
    return `${texto(item.__tabela)}-${texto(item.id) || idDoSeguidor(item)}-${dataEvento(item) || ''}`
  })
}

async function buscarGuiasSeguidos(supabase: any, usuarioId: string): Promise<string[]> {
  const tabelas = [
    'seguidores',
    'usuarios_seguidores',
    'com_seguidores',
    'seguidores_perfil',
    'follows',
  ]

  const ids: string[] = []

  for (const tabela of tabelas) {
    try {
      const { data, error } = await supabase
        .from(tabela)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error || !data) continue

      ;((data || []) as AnyRecord[]).forEach((item) => {
        const seguidor = idDoSeguidor(item)
        const seguido = idDoSeguido(item) || idDoAlvo(item)

        if (seguidor === usuarioId && seguido && seguido !== usuarioId) {
          ids.push(seguido)
        }
      })
    } catch {
      // tabela pode não existir; segue para a próxima
    }
  }

  return Array.from(new Set(ids.filter(Boolean)))
}

async function buscarLogsCom(supabase: any, usuarioId: string): Promise<AnyRecord[]> {
  try {
    const { data, error } = await supabase
      .from('logs_atividades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(220)

    if (error || !data) return []

    return ((data || []) as AnyRecord[]).filter((log) => {
      const textoLog = normalizar([
        log.acao,
        log.tipo,
        log.descricao,
        log.detalhes,
        log.origem,
        log.contexto,
      ].join(' '))

      const pareceSocial =
        textoLog.includes('curt') ||
        textoLog.includes('like') ||
        textoLog.includes('seguiu') ||
        textoLog.includes('seguir') ||
        textoLog.includes('follow')

      if (!pareceSocial) return false

      const alvo = idDoAlvo(log)
      return alvo === usuarioId
    })
  } catch {
    return []
  }
}

async function buscarCurtidasEmTabelas(supabase: any, usuarioId: string): Promise<AnyRecord[]> {
  const tabelas = [
    'curtidas',
    'curtidas_fotos',
    'curtidas_perfil',
    'com_curtidas',
    'fotos_curtidas',
    'likes',
    'com_likes',
  ]

  const encontrados: AnyRecord[] = []

  for (const tabela of tabelas) {
    try {
      const { data, error } = await supabase
        .from(tabela)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(160)

      if (error || !data) continue

      ;((data || []) as AnyRecord[]).forEach((item) => {
        const alvo = idDoAlvo(item)

        if (alvo === usuarioId) {
          encontrados.push({ ...item, __tabela: tabela })
        }
      })
    } catch {
      // tabela pode não existir; segue para a próxima
    }
  }

  return encontrados
}

async function buscarRoteirosDeGuiasSeguidos(
  supabase: any,
  usuarioId: string
): Promise<AnyRecord[]> {
  const guiaIds = await buscarGuiasSeguidos(supabase, usuarioId)

  if (guiaIds.length === 0) return []

  try {
    const { data, error } = await supabase
      .from('roteiros')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(260)

    if (error || !data) return []

    return ((data || []) as AnyRecord[])
      .filter((roteiro) => {
        const guiaId = guiaIdDoRoteiro(roteiro)
        return guiaId && guiaIds.includes(guiaId) && roteiroPublicado(roteiro)
      })
      .slice(0, 24)
  } catch {
    return []
  }
}

function deduplicarPorChave<T>(itens: T[], chaveFn: (item: T) => string) {
  const mapa = new Map<string, T>()

  itens.forEach((item) => {
    const chave = chaveFn(item)
    if (chave && !mapa.has(chave)) mapa.set(chave, item)
  })

  return Array.from(mapa.values())
}

function montarNotificacaoSeguidor(
  item: AnyRecord,
  usuario: UsuarioPublico | undefined
): NotificacaoCom | null {
  const atorId = idDoSeguidor(item)
  if (!atorId || !usuario) return null

  const nome = nomeUsuario(usuario)

  return {
    id: `seguir-${texto(item.id) || atorId}-${dataEvento(item) || ''}`,
    tipo: 'seguir',
    titulo: `${nome} começou a seguir você`,
    mensagem: 'Abra o perfil para conhecer e, se fizer sentido, seguir de volta.',
    destino_url: rotaPerfil(usuario, atorId),
    created_at: dataEvento(item),
    ator_id: atorId,
    ator_nome: nome,
    ator_tipo: texto(usuario.tipo || 'cliente') || 'cliente',
    ator_avatar_url: avatarUsuario(usuario),
    lida: false,
    metadata: {
      origem: texto(item.__tabela),
    },
  }
}

function montarNotificacaoCurtida(
  item: AnyRecord,
  usuario: UsuarioPublico | undefined
): NotificacaoCom | null {
  const atorId = idDoAtor(item)
  if (!atorId || !usuario) return null

  const nome = nomeUsuario(usuario)
  const origem = texto(item.__tabela)
  const idBase = texto(item.id) || `${atorId}-${dataEvento(item) || ''}-${origem}`

  return {
    id: `curtida-${idBase}`,
    tipo: 'curtida',
    titulo: `${nome} curtiu algo seu`,
    mensagem: 'Clique para abrir o perfil dessa pessoa na COM.',
    destino_url: rotaPerfil(usuario, atorId),
    created_at: dataEvento(item),
    ator_id: atorId,
    ator_nome: nome,
    ator_tipo: texto(usuario.tipo || 'cliente') || 'cliente',
    ator_avatar_url: avatarUsuario(usuario),
    lida: false,
    metadata: {
      origem,
    },
  }
}

function montarNotificacaoRoteiroPublicado(
  roteiro: AnyRecord,
  guia: UsuarioPublico | undefined
): NotificacaoCom | null {
  const guiaId = guiaIdDoRoteiro(roteiro)
  if (!guiaId) return null

  const nome = nomeUsuario(guia || { id: guiaId, nome: 'Guia', tipo: 'guia' })
  const titulo = tituloRoteiro(roteiro)
  const local = localRoteiro(roteiro)
  const data = dataEvento(roteiro)

  return {
    id: `roteiro-publicado-${texto(roteiro.id)}-${data || ''}`,
    tipo: 'roteiro_publicado',
    titulo: `${nome} publicou um novo roteiro`,
    mensagem: local ? `${titulo} · ${local}` : titulo,
    destino_url: `/roteiros/${texto(roteiro.id)}`,
    created_at: data,
    ator_id: guiaId,
    ator_nome: nome,
    ator_tipo: 'guia',
    ator_avatar_url: avatarUsuario(guia),
    lida: false,
    metadata: {
      roteiro_id: texto(roteiro.id),
      roteiro_titulo: titulo,
      local,
    },
  }
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin()
    const usuarioId = extrairUsuarioId(request)

    if (!usuarioId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'usuarioId não informado.',
        },
        { status: 400 }
      )
    }

    const [seguidores, logsSociais, curtidasTabelas, roteirosSeguidos] = await Promise.all([
      buscarSeguidores(supabase, usuarioId),
      buscarLogsCom(supabase, usuarioId),
      buscarCurtidasEmTabelas(supabase, usuarioId),
      buscarRoteirosDeGuiasSeguidos(supabase, usuarioId),
    ])

    const eventosDeCurtida = [
      ...logsSociais.filter((item) => {
        const acao = normalizar([item.acao, item.tipo, item.descricao, item.detalhes].join(' '))
        return acao.includes('curt') || acao.includes('like')
      }),
      ...curtidasTabelas,
    ]

    const atorIds = [
      ...seguidores.map((item) => idDoSeguidor(item)),
      ...eventosDeCurtida.map((item) => idDoAtor(item)),
      ...roteirosSeguidos.map((roteiro) => guiaIdDoRoteiro(roteiro)),
    ].filter((id) => id && id !== usuarioId)

    const usuarios = await buscarUsuarios(supabase, atorIds)

    const notificacoes: NotificacaoCom[] = []

    seguidores.forEach((item) => {
      const atorId = idDoSeguidor(item)
      if (!atorId || atorId === usuarioId) return

      const notificacao = montarNotificacaoSeguidor(item, usuarios.get(atorId))
      if (notificacao) notificacoes.push(notificacao)
    })

    eventosDeCurtida.forEach((item) => {
      const atorId = idDoAtor(item)
      if (!atorId || atorId === usuarioId) return

      const notificacao = montarNotificacaoCurtida(item, usuarios.get(atorId))
      if (notificacao) notificacoes.push(notificacao)
    })

    roteirosSeguidos.forEach((roteiro) => {
      const guiaId = guiaIdDoRoteiro(roteiro)
      if (!guiaId || guiaId === usuarioId) return

      const notificacao = montarNotificacaoRoteiroPublicado(roteiro, usuarios.get(guiaId))
      if (notificacao) notificacoes.push(notificacao)
    })

    const ordenadas = deduplicarPorChave(notificacoes, (notificacao) => {
      return `${notificacao.tipo}-${notificacao.ator_id}-${notificacao.metadata?.roteiro_id || ''}-${notificacao.created_at || notificacao.id}`
    })
      .sort((a, b) => {
        const dataA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dataB = b.created_at ? new Date(b.created_at).getTime() : 0
        return dataB - dataA
      })
      .slice(0, 20)

    return NextResponse.json({
      sucesso: true,
      notificacoes: ordenadas,
    })
  } catch (error: any) {
    console.error('Erro em GET /api/notificacoes/com:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    })

    return NextResponse.json(
      {
        sucesso: false,
        erro: error?.message || 'Erro ao carregar notificações da COM.',
      },
      { status: 500 }
    )
  }
}
