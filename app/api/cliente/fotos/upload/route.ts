import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  ''

const BUCKET_FOTOS = 'fotos-aventuras'
const MAX_FILES = 12
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024

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

function erroDeColunaAusente(error: AnyRecord | null | undefined) {
  const texto = String(error?.message || error?.details || error?.hint || '').toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    texto.includes('could not find') ||
    texto.includes('schema cache') ||
    texto.includes('column')
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

    if (!erroDeColunaAusente(error as AnyRecord)) {
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

function normalizarExtensao(nome: string, tipo: string) {
  const extNome = String(nome || '').split('.').pop()?.toLowerCase() || ''

  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(extNome)) {
    return extNome === 'jpeg' ? 'jpg' : extNome
  }

  if (tipo.includes('png')) return 'png'
  if (tipo.includes('webp')) return 'webp'
  if (tipo.includes('gif')) return 'gif'
  if (tipo.includes('avif')) return 'avif'

  return 'jpg'
}

function isFileLike(item: FormDataEntryValue): item is File {
  return (
    typeof item === 'object' &&
    item !== null &&
    'arrayBuffer' in item &&
    'name' in item &&
    'type' in item &&
    'size' in item
  )
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()

    const clienteId = String(
      formData.get('clienteId') ||
        formData.get('userId') ||
        formData.get('usuarioId') ||
        formData.get('usuario_id') ||
        ''
    ).trim()

    if (!clienteId) {
      return json({ sucesso: false, erro: 'ID do cliente não informado.' }, 400)
    }

    const arquivos = formData
      .getAll('files')
      .filter(isFileLike)
      .slice(0, MAX_FILES)

    if (arquivos.length === 0) {
      return json({ sucesso: false, erro: 'Nenhuma foto foi enviada.' }, 400)
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
    const novasUrls: string[] = []
    const errosArquivos: string[] = []

    for (const file of arquivos) {
      const tipo = String(file.type || 'image/jpeg')

      if (!tipo.startsWith('image/')) {
        errosArquivos.push(`${file.name}: arquivo não é imagem.`)
        continue
      }

      if (Number(file.size || 0) > MAX_FILE_SIZE_BYTES) {
        errosArquivos.push(`${file.name}: imagem maior que 8MB.`)
        continue
      }

      const ext = normalizarExtensao(file.name, tipo)
      const filePath = `clientes/${clienteId}/${Date.now()}-${randomUUID()}.${ext}`
      const buffer = Buffer.from(await file.arrayBuffer())

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_FOTOS)
        .upload(filePath, buffer, {
          contentType: tipo,
          upsert: false
        })

      if (uploadError) {
        errosArquivos.push(`${file.name}: ${uploadError.message}`)
        continue
      }

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_FOTOS)
        .getPublicUrl(filePath)

      if (publicUrlData?.publicUrl) {
        novasUrls.push(publicUrlData.publicUrl)
      }
    }

    if (novasUrls.length === 0) {
      return json(
        {
          sucesso: false,
          erro: errosArquivos[0] || 'Nenhuma foto foi salva no storage.',
          errosArquivos
        },
        400
      )
    }

    const fotosAtualizadas = [...fotosAtuais, ...novasUrls]

    const usuarioAtualizado = await atualizarUsuarioComFallback(supabase, clienteId, {
      fotos_aventuras: fotosAtualizadas,
      updated_at: new Date().toISOString()
    })

    const fotosFinal = Array.isArray(usuarioAtualizado?.fotos_aventuras)
      ? usuarioAtualizado.fotos_aventuras
      : fotosAtualizadas

    return json({
      sucesso: true,
      novasUrls,
      fotos: fotosFinal,
      totalFotos: fotosFinal.length,
      errosArquivos
    })
  } catch (error: any) {
    console.error('Erro em /api/cliente/fotos/upload:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao salvar fotos.'
      },
      500
    )
  }
}
