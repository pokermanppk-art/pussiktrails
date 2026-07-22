import 'server-only'

import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto'
import { cookies } from 'next/headers'

export const AFFILIATE_COOKIE_NAME = 'prussik_affiliate_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

type AffiliateSessionPayload = {
  sub: string
  email: string
  iat: number
  exp: number
  nonce: string
}

function getSessionSecret() {
  const secret = process.env.AFFILIATE_SESSION_SECRET

  if (!secret || secret.length < 32) {
    throw new Error(
      'AFFILIATE_SESSION_SECRET deve estar configurada com pelo menos 32 caracteres.',
    )
  }

  return secret
}

function base64UrlEncode(value: Buffer | string) {
  return Buffer.from(value).toString('base64url')
}

function safeEqualText(a: string, b: string) {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)

  if (aBuffer.length !== bBuffer.length) return false

  return timingSafeEqual(aBuffer, bBuffer)
}

function sign(encodedPayload: string) {
  return createHmac('sha256', getSessionSecret())
    .update(encodedPayload)
    .digest('base64url')
}

export function createAffiliateSessionToken(input: {
  affiliateId: string
  email: string
}) {
  const now = Math.floor(Date.now() / 1000)

  const payload: AffiliateSessionPayload = {
    sub: input.affiliateId,
    email: input.email.toLowerCase(),
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
    nonce: randomBytes(12).toString('hex'),
  }

  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = sign(encodedPayload)

  return `${encodedPayload}.${signature}`
}

export function verifyAffiliateSessionToken(
  token?: string | null,
): AffiliateSessionPayload | null {
  if (!token) return null

  const [encodedPayload, signature, extra] = token.split('.')

  if (!encodedPayload || !signature || extra) return null

  const expectedSignature = sign(encodedPayload)

  if (!safeEqualText(signature, expectedSignature)) return null

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as AffiliateSessionPayload

    const now = Math.floor(Date.now() / 1000)

    if (!payload?.sub || !payload?.email || !payload?.exp) return null
    if (payload.exp <= now) return null

    return payload
  } catch {
    return null
  }
}

export async function getAffiliateSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(AFFILIATE_COOKIE_NAME)?.value
  return verifyAffiliateSessionToken(token)
}

export function affiliateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  }
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${derivedKey}`
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, expectedHex] = String(storedHash || '').split('$')

  if (algorithm !== 'scrypt' || !salt || !expectedHex) return false

  const actual = Buffer.from(scryptSync(password, salt, 64).toString('hex'))
  const expected = Buffer.from(expectedHex)

  if (actual.length !== expected.length) return false

  return timingSafeEqual(actual, expected)
}

export function normalizeText(value: unknown) {
  return String(value ?? '').trim()
}

export function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase()
}

export function onlyDigits(value: unknown) {
  return normalizeText(value).replace(/\D/g, '')
}

export function normalizeCpf(value: unknown) {
  return onlyDigits(value).slice(0, 11)
}

export function normalizePhone(value: unknown) {
  return onlyDigits(value).slice(0, 11)
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidCpf(value: unknown) {
  const cpf = normalizeCpf(value)

  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  let sum = 0

  for (let index = 0; index < 9; index += 1) {
    sum += Number(cpf[index]) * (10 - index)
  }

  let digit = (sum * 10) % 11
  if (digit === 10) digit = 0
  if (digit !== Number(cpf[9])) return false

  sum = 0

  for (let index = 0; index < 10; index += 1) {
    sum += Number(cpf[index]) * (11 - index)
  }

  digit = (sum * 10) % 11
  if (digit === 10) digit = 0

  return digit === Number(cpf[10])
}

export function cpfFingerprint(cpf: string) {
  const pepper = process.env.AFFILIATE_DATA_PEPPER || getSessionSecret()
  return createHash('sha256')
    .update(`${normalizeCpf(cpf)}:${pepper}`)
    .digest('hex')
}

export function isAdult(birthDate: string) {
  const birth = new Date(`${birthDate}T12:00:00`)
  if (Number.isNaN(birth.getTime())) return false

  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDifference = today.getMonth() - birth.getMonth()

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birth.getDate())
  ) {
    age -= 1
  }

  return age >= 18
}

export function validateAdminSecret(value?: string | null) {
  const expected = process.env.ADMIN_AFFILIATE_APPROVAL_SECRET

  if (!expected || expected.length < 20 || !value) return false

  return safeEqualText(value, expected)
}
