import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const resendApiKey = process.env.RESEND_API_KEY || ''

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function getAppUrl() {
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL

  if (publicUrl && publicUrl.startsWith('https://')) {
    return publicUrl.replace(/\/$/, '')
  }

  const vercelUrl = process.env.VERCEL_URL

  if (vercelUrl) {
    return `https://${vercelUrl}`.replace(/\/$/, '')
  }

  return 'https://prussiktrails.vercel.app'
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

function emailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function gerarTokenSeguro() {
  return crypto.randomBytes(32).toString('hex')
}

function extrairColunaAusente(error: any) {
  const texto = [
    error?.message,
    error?.details,
    error?.hint
  ]
    .filter(Boolean)
    .join(' ')

  const matchAspas = texto.match(/'([^']+)'/)

  if (matchAspas?.[1]) {
    return matchAspas[1]
  }

  const matchColumn = texto.match(/column\s+([a-zA-Z0-9_]+)/i)

  if (matchColumn?.[1]) {
    return matchColumn[1]
  }

  return ''
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

async function atualizarUsuarioComFallback(
  supabase: any,
  userId: string,
  payloadOriginal: Record<string, any>
) {
  let payloadAtual = { ...payloadOriginal }
  const colunasIgnoradas: string[] = []

  for (let tentativa = 0; tentativa < 10; tentativa++) {
    const { data, error } = await supabase
      .from('users')
      .update(payloadAtual)
      .eq('id', userId)
      .select()
      .maybeSingle()

    if (!error) {
      return {
        data,
        colunasIgnoradas
      }
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

  throw new Error('Não foi possível atualizar usuário.')
}

async function enviarEmailRecuperacao({
  email,
  nome,
  link
}: {
  email: string
  nome: string
  link: string
}) {
  if (!resendApiKey) {
    return {
      enviado: false,
      motivo: 'RESEND_API_KEY ausente.'
    }
  }

  const from =
    process.env.RESEND_FROM_EMAIL ||
    'PrussikTrails <onboarding@resend.dev>'

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: 'Recuperação de senha - PrussikTrails',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #111827;">Recuperação de senha</h2>
          <p>Olá${nome ? `, ${nome}` : ''}.</p>
          <p>Recebemos uma solicitação para redefinir sua senha no PrussikTrails.</p>
          <p>Clique no botão abaixo para criar uma nova senha:</p>
          <p style="margin: 28px 0;">
            <a href="${link}" style="background: #16a34a; color: #ffffff; padding: 14px 22px; border-radius: 999px; text-decoration: none; font-weight: bold;">
              Redefinir senha
            </a>
          </p>
          <p>Se o botão não abrir, copie e cole este link no navegador:</p>
          <p style="word-break: break-all; color: #2563eb;">${link}</p>
          <p style="color: #6b7280; font-size: 13px;">
            Este link expira em 1 hora. Se você não solicitou esta alteração, ignore este e-mail.
          </p>
        </div>
      `
    })
  })

  const texto = await response.text()

  let data: any = null

  try {
    data = texto ? JSON.parse(texto) : null
  } catch {
    data = {
      raw: texto
    }
  }

  if (!response.ok) {
    return {
      enviado: false,
      erro:
        data?.message ||
        data?.error ||
        data?.raw ||
        `Erro HTTP ${response.status} ao enviar e-mail.`
    }
  }

  return {
    enviado: true,
    data
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))

    const email = limparTexto(body.email).toLowerCase()

    if (!email || !emailValido(email)) {
      return json(
        {
          sucesso: false,
          erro: 'Informe um e-mail válido.'
        },
        400
      )
    }

    const { data: usuario, error: usuarioError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (usuarioError) {
      throw usuarioError
    }

    /*
      Por segurança, não informamos publicamente se o e-mail existe ou não.
      Mas para debug retornamos sucesso sem link.
    */
    if (!usuario) {
      return json({
        sucesso: true,
        mensagem:
          'Se este e-mail estiver cadastrado, enviaremos as instruções de recuperação.'
      })
    }

    const token = gerarTokenSeguro()
    const expiraEm = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const link = `${getAppUrl()}/resetar-senha?token=${token}`

    await atualizarUsuarioComFallback(supabase, usuario.id, {
      reset_token: token,
      reset_token_expires_at: expiraEm,
      updated_at: new Date().toISOString()
    })

    const envio = await enviarEmailRecuperacao({
      email,
      nome: usuario.nome || usuario.name || '',
      link
    })

    return json({
      sucesso: true,
      mensagem:
        'Se este e-mail estiver cadastrado, enviaremos as instruções de recuperação.',
      emailEnviado: envio.enviado,
      aviso:
        envio.enviado
          ? undefined
          : 'E-mail não enviado porque RESEND_API_KEY não está configurada ou falhou.',
      erroEmail: envio.enviado ? undefined : envio.erro || envio.motivo,
      /*
        Mantive o link no retorno para teste do MVP.
        Depois podemos remover para produção.
      */
      linkRecuperacao: link
    })
  } catch (error: any) {
    console.error('Erro em recuperar senha:', error)

    return json(
      {
        sucesso: false,
        erro: error?.message || 'Erro interno ao solicitar recuperação de senha.'
      },
      500
    )
  }
}

export async function GET() {
  return json({
    sucesso: true,
    rota: '/api/recuperar-senha',
    metodo: 'POST',
    mensagem: 'Rota de recuperação de senha ativa.'
  })
}