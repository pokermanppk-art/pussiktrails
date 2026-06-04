import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  ''

const BUCKET_FOTOS = 'fotos-aventuras'

function json(data: AnyRecord, status = 200) {
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

function erroDeColunaOuTabela(error: AnyRecord | null | undefined) {
  const texto = String(error?.message || error?.details || error?.hint || '').toLowerCase()

  return (
    error?.code === '42P01' ||
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    texto.includes('could not find') ||
    texto.includes('schema cache') ||
    texto.includes('column') ||
    texto.includes('relation')
  )
}

function extrairColunaAusente(error: AnyRecord | null | undefined) {
  const texto = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ')

  const matchAspas = texto.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  const matchColumn = texto.match(/column\s+([a-zA-Z0-9_]+)/i)
  if (matchColumn?.[1]) return matchColumn[1]

  return ''
}

async function atualizarUsuarioComFallback(
  supabase: any,
  userId: string,
  payloadOriginal: AnyRecord
) {
  let payloadAtual = { ...payloadOriginal }

  for (let tentativa = 0; tentativa < 12; tentativa++) {
    const { data, error } = await supabase
      .from('users')
      .update(payloadAtual)
      .eq('id', userId)
      .select('id, fotos_aventuras')
      .maybeSingle()

    if (!error) return data

    if (!erroDeColunaOuTabela(error as AnyRecord)) {
      throw error
    }

    const coluna = extrairColunaAusente(error as AnyRecord)

    if (!coluna || !(coluna in payloadAtual)) {
      throw error
    }

    delete payloadAtual[coluna]
  }

  throw new Error('Não foi possível atualizar fotos do cliente após ajustar colunas.')
}

function extrairStoragePath(fotoUrl: string) {
  try {
    const url = new URL(fotoUrl)
    const marcador = `/storage/v1/object/public/${BUCKET_FOTOS}/`
    const indice = url.pathname.indexOf(marcador)

    if (indice >= 0) {
      return decodeURIComponent(url.pathname.slice(indice + marcador.length))
    }

    const fallback = `/object/public/${BUCKET_FOTOS}/`
    const indiceFallback = url.pathname.indexOf(fallback)

    if (indiceFallback >= 0) {
      return decodeURIComponent(url.pathname.slice(indiceFallback + fallback.length))
    }

    return ''
  } catch {
    const marcador = `${BUCKET_FOTOS}/`
    const indice = fotoUrl.indexOf(marcador)

    if (indice >= 0) {
      return decodeURIComponent(fotoUrl.slice(indice + marcador.length))
    }

    return ''
  }
}

async function removerCurtidasDaFoto(supabase: any, clienteId: string, fotoUrl: string) {
  try {
    const { error } = await supabase
      .from('curtidas_fotos')
      .delete()
      .eq('dono_id', clienteId)
      .eq('foto_url', fotoUrl)

    if (error && !erroDeColunaOuTabela(error as AnyRecord)) {
      console.warn('Não foi possível remover curtidas da foto:', error.message)
    }
  } catch (error) {
    console.warn('Erro ao remover curtidas da foto:', error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))

    const clienteId = String(
      body?.clienteId ||
        body?.userId ||
        body?.usuarioId ||
        body?.usuario_id ||
        ''
    ).trim()

    const fotoUrl = String(body?.fotoUrl || body?.url || '').trim()

    if (!clienteId) {
      return json({ sucesso: false, erro: 'ID do cliente não informado.' }, 400)
    }

    if (!fotoUrl) {
      return json({ sucesso: false, erro: 'URL da foto não informada.' }, 400)
    }

    const supabase = getSupabaseAdmin()

    const { data: usuario, error: usuarioError } = await supabase
      .from('users')
      .select('id, tipo, fotos_aventuras')
      .eq('id', clienteId)
      .maybeSingle()

    if (usuarioError) throw usuarioError

    if (!usuario?.id) {
      return json({ sucesso: false, erro: 'Cliente não encontrado.' }, 404)
    }

    if (usuario.tipo && usuario.tipo !== 'cliente') {
      return json({ sucesso: false, erro: 'Este perfil não é de cliente.' }, 403)
    }

    const fotosAtuais = Array.isArray(usuario.fotos_aventuras) ? usuario.fotos_aventuras : []
    const fotosAtualizadas = fotosAtuais.filter((url: unknown) => String(url) !== fotoUrl)

    if (fotosAtualizadas.length === fotosAtuais.length) {
      return json({
        sucesso: true,
        aviso: 'A foto já não estava mais no passaporte.',
        fotos: fotosAtuais,
        totalFotos: fotosAtuais.length
      })
    }

    const usuarioAtualizado = await atualizarUsuarioComFallback(supabase, clienteId, {
      fotos_aventuras: fotosAtualizadas,
      updated_at: new Date().toISOString()
    })

    await removerCurtidasDaFoto(supabase, clienteId, fotoUrl)

    const storagePath = extrairStoragePath(fotoUrl)
    let storageRemovido = false
    let storageAviso = ''

    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET_FOTOS)
        .remove([storagePath])

      if (storageError) {
        storageAviso = storageError.message || 'Não foi possível remover o arquivo do Storage.'
        console.warn('Foto removida do perfil, mas não do Storage:', storageAviso)
      } else {
        storageRemovido = true
      }
    }

    const fotosFinal = Array.isArray(usuarioAtualizado?.fotos_aventuras)
      ? usuarioAtualizado.fotos_aventuras
      : fotosAtualizadas

    return json({
      sucesso: true,
      fotos: fotosFinal,
      totalFotos: fotosFinal.length,
      storagePath,
      storageRemovido,
      storageAviso
    })
  } catch (error: any) {
    console.error('Erro em /api/cliente/fotos/remover:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao remover foto.'
      },
      500
    )
  }
}
