import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export const AFFILIATE_SESSION_COOKIE = 'prussik_affiliate_session'
export const AFFILIATE_SESSION_MAX_AGE = 60 * 60 * 24 * 7

export type AffiliateSessionInput = {
  affiliateId?: string
  afiliadoId?: string
  userId?: string
  id?: string
  email?: string
  nome?: string
  status?: string
}

export type AffiliateSession = {
  affiliateId: string
  afiliadoId: string
  userId: string
  id: string
  email: string
  nome?: string
  status?: string
  iat: number
  exp: number
}

function text(value: unknown) {
  return String(value ?? '').trim()
}

function getSessionSecret() {
  const secret = text(process.env.AFFILIATE_SESSION_SECRET)

  if (!secret || secret.length < 32) {
    throw new Error(
      'AFFILIATE_SESSION_SECRET ausente ou muito curta. Use uma chave aleatória com pelo menos 32 caracteres.'
    )
  }

  return secret
}

function sign(encodedPayload: string) {
  return createHmac('sha256', getSessionSecret())
    .update(encodedPayload)
    .digest('base64url')
}

function safeEqual(left: string, right: string) {
  try {
    const leftBuffer = Buffer.from(left)
    const rightBuffer = Buffer.from(right)

    if (leftBuffer.length !== rightBuffer.length) return false

    return timingSafeEqual(leftBuffer, rightBuffer)
  } catch {
    return false
  }
}

function normalizeSessionInput(
  input: AffiliateSessionInput,
  now = Math.floor(Date.now() / 1000)
): AffiliateSession {
  const affiliateId = text(
    input.affiliateId || input.afiliadoId || input.userId || input.id
  )

  if (!affiliateId) {
    throw new Error('O ID do afiliado é obrigatório para criar a sessão.')
  }

  return {
    affiliateId,
    afiliadoId: affiliateId,
    userId: affiliateId,
    id: affiliateId,
    email: text(input.email).toLowerCase(),
    nome: text(input.nome) || undefined,
    status: text(input.status) || undefined,
    iat: now,
    exp: now + AFFILIATE_SESSION_MAX_AGE,
  }
}

export function createAffiliateSessionToken(
  input: AffiliateSessionInput
): string {
  const payload = normalizeSessionInput(input)
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url'
  )
  const signature = sign(encodedPayload)

  return `${encodedPayload}.${signature}`
}

export function verifyAffiliateSessionToken(
  token: string | null | undefined
): AffiliateSession | null {
  const cleanToken = text(token)

  if (!cleanToken) return null

  const [encodedPayload, signature, extra] = cleanToken.split('.')

  if (!encodedPayload || !signature || extra) return null

  const expectedSignature = sign(encodedPayload)

  if (!safeEqual(signature, expectedSignature)) return null

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as Partial<AffiliateSession>

    const affiliateId = text(
      parsed.affiliateId ||
        parsed.afiliadoId ||
        parsed.userId ||
        parsed.id
    )
    const exp = Number(parsed.exp)

    if (!affiliateId || !Number.isFinite(exp)) return null
    if (exp <= Math.floor(Date.now() / 1000)) return null

    return {
      affiliateId,
      afiliadoId: affiliateId,
      userId: affiliateId,
      id: affiliateId,
      email: text(parsed.email).toLowerCase(),
      nome: text(parsed.nome) || undefined,
      status: text(parsed.status) || undefined,
      iat: Number(parsed.iat) || 0,
      exp,
    }
  } catch {
    return null
  }
}

export async function setAffiliateSession(
  input: AffiliateSessionInput
): Promise<string> {
  const token = createAffiliateSessionToken(input)
  const cookieStore = await cookies()

  cookieStore.set(AFFILIATE_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: AFFILIATE_SESSION_MAX_AGE,
  })

  return token
}

export async function createAffiliateSession(
  input: AffiliateSessionInput
): Promise<string> {
  return setAffiliateSession(input)
}

export async function getAffiliateSession(): Promise<AffiliateSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AFFILIATE_SESSION_COOKIE)?.value

  return verifyAffiliateSessionToken(token)
}

export async function clearAffiliateSession(): Promise<void> {
  const cookieStore = await cookies()

  cookieStore.set(AFFILIATE_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  })
}

export const deleteAffiliateSession = clearAffiliateSession
export const destroyAffiliateSession = clearAffiliateSession
