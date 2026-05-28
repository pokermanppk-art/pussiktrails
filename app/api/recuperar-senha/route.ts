import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AnyRecord = Record<string, any>

const CAMPOS_USUARIO_BASE = [
  'id',
  'nome',
  'email',
  'status',
  'tipo',
  'ativo',
]

function getSupabaseAdmin(): any {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function validarEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function appUrl() {
  const explicitUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL

  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, '')
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '')
  }

  return 'http://localhost:3000'
}

function hashToken(token: string) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex')
}

function gerarTokenSeguro() {
  return crypto.randomBytes(32).toString('hex')
}

function nomeUsuario(user: AnyRecord) {
  return user.nome || user.email || 'Aventureiro'
}

function respostaGenerica() {
  return NextResponse.json({
    sucesso: true,
    mensagem:
      'Se este e-mail estiver cadastrado, enviaremos as instruções de recuperação.',
  })
}

function erroColunaInexistente(error: any) {
  const mensagem = String(
    error?.message ||
      error?.details ||
      error?.hint ||
      ''
  ).toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    mensagem.includes('column') ||
    mensagem.includes('schema cache') ||
    mensagem.includes('does not exist') ||
    mensagem.includes('could not find')
  )
}

function extrairColunaInexistente(error: any) {
  const textoErro = [
    error?.message,
    error?.details,
    error?.hint,
  ]
    .filter(Boolean)
    .join(' ')

  const matchUsers = textoErro.match(/users\.([a-zA-Z0-9_]+)/)

  if (matchUsers?.[1]) return matchUsers[1]

  const matchColumn = textoErro.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i)

  if (matchColumn?.[1]) return matchColumn[1]

  const matchAspas = textoErro.match(/'([^']+)'/)

  if (matchAspas?.[1]) return matchAspas[1]

  return ''
}

async function buscarUsuarioPorEmailComFallback(supabase: any, emailEntrada: string) {
  const email = normalizar(emailEntrada)

  if (!email || !email.includes('@')) return null

  let campos = [...CAMPOS_USUARIO_BASE]

  for (let tentativa = 0; tentativa < 12; tentativa++) {
    const select = campos.join(', ')

    const { data, error } = await supabase
      .from('users')
      .select(select)
      .ilike('email', email)
      .limit(1)

    if (!error) {
      if (Array.isArray(data) && data[0]?.id) {
        return data[0] as AnyRecord
      }

      return null
    }

    if (!erroColunaInexistente(error)) {
      console.warn('[recuperar-senha] Erro ao buscar usuário por e-mail:', {
        email,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      })

      return null
    }

    const coluna = extrairColunaInexistente(error)

    if (!coluna) {
      console.warn('[recuperar-senha] Erro de coluna sem identificação:', {
        email,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      })

      return null
    }

    campos = campos.filter((campo) => campo !== coluna)

    console.warn('[recuperar-senha] Coluna removida do SELECT por não existir:', coluna)

    if (campos.length === 0) {
      return null
    }
  }

  return null
}

function htmlEmailReset(params: {
  nome: string
  link: string
  emailSolicitado: string
  destinatarioReal: string
  modoTeste: boolean
}) {
  const { nome, link, emailSolicitado, destinatarioReal, modoTeste } = params

  return `
    <div style="margin:0;padding:0;background:#f3f5ea;font-family:Inter,Arial,sans-serif;color:#172018;">
      <div style="max-width:560px;margin:0 auto;padding:32px 18px;">
        <div style="background:#fffdf7;border-radius:28px;padding:32px;border:1px solid #e5e7eb;box-shadow:0 18px 42px rgba(32,60,46,0.10);">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:800;color:#1f3f2d;letter-spacing:-0.05em;">
              PrussikTrails
            </div>
            <div style="font-size:12px;font-weight:800;color:#7b8372;text-transform:uppercase;letter-spacing:0.12em;margin-top:6px;">
              Recuperação de senha
            </div>
          </div>

          <h1 style="font-size:28px;line-height:1.08;letter-spacing:-0.04em;margin:0 0 14px;color:#172018;">
            Olá, ${nome}.
          </h1>

          <p style="font-size:15px;line-height:1.65;color:#475569;margin:0 0 22px;">
            Recebemos uma solicitação para redefinir a senha da sua conta no PrussikTrails.
          </p>

          ${
            modoTeste
              ? `
                <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:18px;padding:14px;margin:0 0 22px;color:#92400e;font-size:13px;line-height:1.55;font-weight:700;">
                  Modo teste ativo: a solicitação foi feita para <strong>${emailSolicitado}</strong>, mas este e-mail foi enviado para <strong>${destinatarioReal}</strong> por causa da limitação do Resend sem domínio verificado.
                </div>
              `
              : ''
          }

          <div style="text-align:center;margin:30px 0;">
            <a href="${link}" style="display:inline-block;background:#203c2e;color:#ffffff;text-decoration:none;border-radius:999px;padding:15px 24px;font-size:15px;font-weight:900;">
              Redefinir minha senha
            </a>
          </div>

          <p style="font-size:13px;line-height:1.55;color:#64748b;margin:0 0 12px;">
            Este link é válido por 30 minutos. Se você não solicitou esta alteração, ignore este e-mail.
          </p>

          <p style="font-size:12px;line-height:1.55;color:#94a3b8;margin:20px 0 0;">
            Solicitação para: ${emailSolicitado}
          </p>

          <div style="height:1px;background:#e5e7eb;margin:26px 0;"></div>

          <p style="font-size:11px;line-height:1.55;color:#94a3b8;margin:0;">
            Caso o botão não funcione, copie e cole este link no navegador:<br />
            <span style="word-break:break-all;">${link}</span>
          </p>
        </div>
      </div>
    </div>
  `
}

function textoEmailReset(params: {
  nome: string
  link: string
  emailSolicitado: string
  destinatarioReal: string
  modoTeste: boolean
}) {
  const avisoTeste = params.modoTeste
    ? `\n\nModo teste ativo: a solicitação foi feita para ${params.emailSolicitado}, mas este e-mail foi enviado para ${params.destinatarioReal} por causa da limitação do Resend sem domínio verificado.`
    : ''

  return `Olá, ${params.nome}.

Recebemos uma solicitação para redefinir sua senha no PrussikTrails.

Acesse o link abaixo para criar uma nova senha:
${params.link}

Este link é válido por 30 minutos.

Se você não solicitou essa alteração, ignore este e-mail.${avisoTeste}`
}

function escolherDestinatario(params: {
  emailSolicitado: string
  from: string
}) {
  const emailSolicitado = normalizar(params.emailSolicitado)
  const from = texto(params.from)
  const testTo = normalizar(process.env.RESEND_TEST_TO_EMAIL)

  const usandoDominioTesteResend =
    from.includes('@resend.dev') ||
    from.includes('onboarding@resend.dev')

  if (testTo) {
    return {
      destinatario: testTo,
      modoTeste: true,
    }
  }

  if (usandoDominioTesteResend) {
    return {
      destinatario: 'pokermanppk@gmail.com',
      modoTeste: true,
    }
  }

  return {
    destinatario: emailSolicitado,
    modoTeste: false,
  }
}

export async function POST(request: Request) {
  let body: AnyRecord = {}

  try {
    const supabase = getSupabaseAdmin()

    body = await request.json().catch(() => ({}))

    const email = normalizar(body.email)

    if (!email || !validarEmail(email)) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Informe um e-mail válido.',
        },
        { status: 400 }
      )
    }

    const user = await buscarUsuarioPorEmailComFallback(supabase, email)

    if (!user?.id) {
      console.warn('[recuperar-senha] Solicitação para e-mail não encontrado:', {
        email,
      })

      return respostaGenerica()
    }

    const status = normalizar(user.status)

    if (
      status === 'inativo' ||
      status === 'bloqueado' ||
      status === 'suspenso' ||
      status === 'pendente' ||
      status === 'aguardando' ||
      status === 'aguardando_aprovacao' ||
      user.ativo === false
    ) {
      console.warn('[recuperar-senha] Usuário sem permissão para reset:', {
        userId: user.id,
        status: user.status,
        ativo: user.ativo,
      })

      return respostaGenerica()
    }

    const token = gerarTokenSeguro()
    const tokenHash = hashToken(token)
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString()
    const resetLink = `${appUrl()}/redefinir-senha?token=${encodeURIComponent(token)}`

    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      ''

    const userAgent = request.headers.get('user-agent') || ''

    await supabase
      .from('senha_reset_tokens')
      .update({
        status: 'cancelado',
        used_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('status', 'ativo')

    const { error: insertError } = await supabase
      .from('senha_reset_tokens')
      .insert({
        user_id: user.id,
        email,
        token_hash: tokenHash,
        status: 'ativo',
        expires_at: expiresAt,
        ip,
        user_agent: userAgent,
      })

    if (insertError) {
      console.error('[recuperar-senha] Erro ao inserir token:', insertError)

      return NextResponse.json(
        {
          sucesso: false,
          erro:
            'Não foi possível gerar o link de recuperação. Verifique se a tabela senha_reset_tokens foi criada.',
        },
        { status: 500 }
      )
    }

    const apiKey = texto(process.env.RESEND_API_KEY)

    if (!apiKey) {
      console.error('[recuperar-senha] RESEND_API_KEY ausente.')

      return NextResponse.json(
        {
          sucesso: false,
          erro: 'RESEND_API_KEY não configurada.',
        },
        { status: 500 }
      )
    }

    const from =
      texto(process.env.RESEND_FROM_EMAIL) ||
      'PrussikTrails <onboarding@resend.dev>'

    const { destinatario, modoTeste } = escolherDestinatario({
      emailSolicitado: email,
      from,
    })

    console.log('[recuperar-senha] Enviando e-mail de recuperação:', {
      emailSolicitado: email,
      destinatarioReal: destinatario,
      modoTeste,
      from,
      appUrl: appUrl(),
    })

    const resend = new Resend(apiKey)

    const { error: resendError } = await resend.emails.send({
      from,
      to: [destinatario],
      subject: 'Redefinição de senha | PrussikTrails',
      html: htmlEmailReset({
        nome: nomeUsuario(user),
        link: resetLink,
        emailSolicitado: email,
        destinatarioReal: destinatario,
        modoTeste,
      }),
      text: textoEmailReset({
        nome: nomeUsuario(user),
        link: resetLink,
        emailSolicitado: email,
        destinatarioReal: destinatario,
        modoTeste,
      }),
    })

    if (resendError) {
      console.error('[recuperar-senha] Erro Resend:', resendError)

      return NextResponse.json(
        {
          sucesso: false,
          erro:
            resendError.message ||
            'Erro ao enviar o e-mail de recuperação pelo Resend.',
        },
        { status: 500 }
      )
    }

    return respostaGenerica()
  } catch (error: any) {
    console.error('Erro em POST /api/recuperar-senha:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack,
      body,
    })

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error?.message ||
          'Erro interno ao solicitar recuperação de senha.',
      },
      { status: 500 }
    )
  }
}