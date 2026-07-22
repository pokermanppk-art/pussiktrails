import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from 'node:crypto'
import { promisify } from 'node:util'
import { cookies } from 'next/headers'

const scrypt = promisify(nodeScrypt)

export const AFFILIATE_SESSION_COOKIE = 'prussik_affiliate_session'
export const AFFILIATE_SESSION_MAX_AGE = 60 * 60 * 24 * 7

const LEGACY_SESSION_COOKIES = [
  AFFILIATE_SESSION_COOKIE,
  'affiliate_session',
  'afiliado_session',
]

const PASSWORD_KEY_LENGTH = 64

export type AffiliateSessionInput = {
  affiliateId?: string
  afiliadoId?: string
  userId?: string
  id?: string
  email?: string
  nome?: string
  status?: string
  role?: string
}

export type AffiliateSession = {
  affiliateId: string
  afiliadoId: string
  userId: string
  id: string
  email: string
  nome?: string
  status?: string
  role: 'affiliate'
  iat: number
  exp: number
}

type CookieWritableResponse = {
  cookies?: {
    set: (
      name: string,
      value: string,
      options?: {
        httpOnly?: boolean
        secure?: boolean
        sameSite?: 'lax' | 'strict' | 'none'
        path?: string
        maxAge?: number
        expires?: Date
      }
    ) => unknown
  }
}

function toStringSafe(value: unknown): string {
  return String(value ?? '')
}

/**
 * Remove espaços extras e caracteres de controle.
 * Mantém acentos e caracteres válidos do nome.
 */
export function normalizeText(value: unknown): string {
  return toStringSafe(value)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normaliza o e-mail para comparação e armazenamento.
 */
export function normalizeEmail(value: unknown): string {
  return normalizeText(value).toLowerCase()
}

/**
 * Retorna somente os 11 dígitos do CPF.
 */
export function normalizeCpf(value: unknown): string {
  return toStringSafe(value).replace(/\D/g, '').slice(0, 11)
}

/**
 * Retorna somente os dígitos do telefone.
 * Aceita telefone brasileiro com ou sem DDI 55.
 */
export function normalizePhone(value: unknown): string {
  let digits = toStringSafe(value).replace(/\D/g, '')

  if (digits.startsWith('00')) {
    digits = digits.slice(2)
  }

  return digits.slice(0, 15)
}

/**
 * Validação básica e segura de e-mail.
 */
export function isValidEmail(value: unknown): boolean {
  const email = normalizeEmail(value)

  if (!email || email.length > 254) return false
  if (email.includes('..')) return false

  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)
}

/**
 * Validação completa dos dígitos verificadores do CPF.
 */
export function isValidCpf(value: unknown): boolean {
  const cpf = normalizeCpf(value)

  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const calculateDigit = (base: string, initialWeight: number): number => {
    const total = base
      .split('')
      .reduce(
        (sum, digit, index) =>
          sum + Number(digit) * (initialWeight - index),
        0
      )

    const remainder = total % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  const firstDigit = calculateDigit(cpf.slice(0, 9), 10)
  const secondDigit = calculateDigit(cpf.slice(0, 10), 11)

  return (
    firstDigit === Number(cpf[9]) &&
    secondDigit === Number(cpf[10])
  )
}

/**
 * Confirma se a pessoa possui a idade mínima.
 * O padrão do Portal do Afiliado é 18 anos.
 */
export function isAdult(
  birthDate: unknown,
  minimumAge = 18,
  referenceDate = new Date()
): boolean {
  const rawDate = normalizeText(birthDate)

  if (!rawDate) return false

  const match = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/)

  let year: number
  let month: number
  let day: number

  if (match) {
    year = Number(match[1])
    month = Number(match[2])
    day = Number(match[3])
  } else {
    const parsed = new Date(rawDate)

    if (Number.isNaN(parsed.getTime())) return false

    year = parsed.getUTCFullYear()
    month = parsed.getUTCMonth() + 1
    day = parsed.getUTCDate()
  }

  const birth = new Date(Date.UTC(year, month - 1, day))

  if (
    Number.isNaN(birth.getTime()) ||
    birth.getUTCFullYear() !== year ||
    birth.getUTCMonth() !== month - 1 ||
    birth.getUTCDate() !== day
  ) {
    return false
  }

  const todayYear = referenceDate.getFullYear()
  const todayMonth = referenceDate.getMonth() + 1
  const todayDay = referenceDate.getDate()

  let age = todayYear - year

  if (
    todayMonth < month ||
    (todayMonth === month && todayDay < day)
  ) {
    age -= 1
  }

  return age >= minimumAge
}

function getCpfPepper(): string {
  const pepper = normalizeText(
    process.env.AFFILIATE_DATA_PEPPER ||
      process.env.AFFILIATE_SESSION_SECRET
  )

  if (!pepper || pepper.length < 16) {
    throw new Error(
      'AFFILIATE_DATA_PEPPER ausente ou muito curta. Configure uma chave secreta aleatória com pelo menos 16 caracteres.'
    )
  }

  return pepper
}

/**
 * Gera uma impressão irreversível do CPF para localizar duplicidades
 * sem utilizar o CPF puro como chave de comparação.
 */
export function cpfFingerprint(value: unknown): string {
  const cpf = normalizeCpf(value)

  if (!isValidCpf(cpf)) {
    throw new Error('CPF inválido para geração da impressão de segurança.')
  }

  return createHmac('sha256', getCpfPepper())
    .update(cpf)
    .digest('hex')
}

/**
 * Hash auxiliar genérico para auditoria e comparação.
 */
export function sha256(value: unknown): string {
  return createHash('sha256')
    .update(toStringSafe(value))
    .digest('hex')
}

/**
 * Cria hash de senha usando scrypt e salt individual.
 * Formato salvo:
 * scrypt$<salt em base64url>$<hash em base64url>
 */
export async function hashPassword(password: unknown): Promise<string> {
  const cleanPassword = toStringSafe(password)

  if (cleanPassword.length < 8) {
    throw new Error('A senha deve possuir pelo menos 8 caracteres.')
  }

  if (cleanPassword.length > 200) {
    throw new Error('A senha excede o tamanho máximo permitido.')
  }

  const salt = randomBytes(16)
  const derivedKey = (await scrypt(
    cleanPassword,
    salt,
    PASSWORD_KEY_LENGTH
  )) as Buffer

  return [
    'scrypt',
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$')
}

/**
 * Compara uma senha informada com o hash salvo.
 */
export async function verifyPassword(
  password: unknown,
  storedHash: unknown
): Promise<boolean> {
  try {
    const cleanPassword = toStringSafe(password)
    const encodedHash = normalizeText(storedHash)
    const [algorithm, saltValue, hashValue, extra] =
      encodedHash.split('$')

    if (
      algorithm !== 'scrypt' ||
      !saltValue ||
      !hashValue ||
      extra
    ) {
      return false
    }

    const salt = Buffer.from(saltValue, 'base64url')
    const expectedHash = Buffer.from(hashValue, 'base64url')

    const calculatedHash = (await scrypt(
      cleanPassword,
      salt,
      expectedHash.length
    )) as Buffer

    if (calculatedHash.length !== expectedHash.length) {
      return false
    }

    return timingSafeEqual(calculatedHash, expectedHash)
  } catch {
    return false
  }
}

/**
 * Alias para compatibilidade com rotas que usam comparePassword.
 */
export const comparePassword = verifyPassword

function getSessionSecret(): string {
  const secret = normalizeText(process.env.AFFILIATE_SESSION_SECRET)

  if (!secret || secret.length < 32) {
    throw new Error(
      'AFFILIATE_SESSION_SECRET ausente ou muito curta. Use uma chave aleatória com pelo menos 32 caracteres.'
    )
  }

  return secret
}

function signSessionPayload(encodedPayload: string): string {
  return createHmac('sha256', getSessionSecret())
    .update(encodedPayload)
    .digest('base64url')
}

function safeEqual(left: string, right: string): boolean {
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
  const affiliateId = normalizeText(
    input.affiliateId ||
      input.afiliadoId ||
      input.userId ||
      input.id
  )

  if (!affiliateId) {
    throw new Error(
      'O ID do afiliado é obrigatório para criar a sessão.'
    )
  }

  return {
    affiliateId,
    afiliadoId: affiliateId,
    userId: affiliateId,
    id: affiliateId,
    email: normalizeEmail(input.email),
    nome: normalizeText(input.nome) || undefined,
    status: normalizeText(input.status) || undefined,
    role: 'affiliate',
    iat: now,
    exp: now + AFFILIATE_SESSION_MAX_AGE,
  }
}

export function createAffiliateSessionToken(
  input: AffiliateSessionInput
): string {
  const payload = normalizeSessionInput(input)
  const encodedPayload = Buffer.from(
    JSON.stringify(payload)
  ).toString('base64url')
  const signature = signSessionPayload(encodedPayload)

  return `${encodedPayload}.${signature}`
}

export function verifyAffiliateSessionToken(
  token: string | null | undefined
): AffiliateSession | null {
  const cleanToken = normalizeText(token)

  if (!cleanToken) return null

  const [encodedPayload, signature, extra] =
    cleanToken.split('.')

  if (!encodedPayload || !signature || extra) return null

  const expectedSignature =
    signSessionPayload(encodedPayload)

  if (!safeEqual(signature, expectedSignature)) {
    return null
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as Partial<AffiliateSession>

    const affiliateId = normalizeText(
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
      email: normalizeEmail(parsed.email),
      nome: normalizeText(parsed.nome) || undefined,
      status: normalizeText(parsed.status) || undefined,
      role: 'affiliate',
      iat: Number(parsed.iat) || 0,
      exp,
    }
  } catch {
    return null
  }
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: AFFILIATE_SESSION_MAX_AGE,
  }
}

/**
 * Grava a sessão pelo cookies() do Next.js.
 */
export async function setAffiliateSession(
  input: AffiliateSessionInput
): Promise<string> {
  const token = createAffiliateSessionToken(input)
  const cookieStore = await cookies()

  cookieStore.set(
    AFFILIATE_SESSION_COOKIE,
    token,
    sessionCookieOptions()
  )

  return token
}

/**
 * Compatibilidade com duas formas:
 *
 * createAffiliateSession(dadosDoAfiliado)
 * createAffiliateSession(respostaNextResponse, dadosDoAfiliado)
 */
export async function createAffiliateSession(
  inputOrResponse: AffiliateSessionInput | CookieWritableResponse,
  possibleInput?: AffiliateSessionInput
): Promise<string> {
  const input = possibleInput
    ? possibleInput
    : (inputOrResponse as AffiliateSessionInput)

  const token = createAffiliateSessionToken(input)

  if (
    possibleInput &&
    (inputOrResponse as CookieWritableResponse).cookies?.set
  ) {
    ;(inputOrResponse as CookieWritableResponse).cookies!.set(
      AFFILIATE_SESSION_COOKIE,
      token,
      sessionCookieOptions()
    )

    return token
  }

  const cookieStore = await cookies()

  cookieStore.set(
    AFFILIATE_SESSION_COOKIE,
    token,
    sessionCookieOptions()
  )

  return token
}

export async function getAffiliateSession(): Promise<AffiliateSession | null> {
  const cookieStore = await cookies()

  for (const cookieName of LEGACY_SESSION_COOKIES) {
    const token = cookieStore.get(cookieName)?.value
    const session = verifyAffiliateSessionToken(token)

    if (session) return session
  }

  return null
}

/**
 * Remove a sessão atual.
 * Também aceita uma NextResponse como argumento para compatibilidade.
 */
export async function clearAffiliateSession(
  response?: CookieWritableResponse
): Promise<void> {
  const expiredOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  }

  if (response?.cookies?.set) {
    for (const cookieName of LEGACY_SESSION_COOKIES) {
      response.cookies.set(cookieName, '', expiredOptions)
    }

    return
  }

  const cookieStore = await cookies()

  for (const cookieName of LEGACY_SESSION_COOKIES) {
    cookieStore.set(cookieName, '', expiredOptions)
  }
}

export const deleteAffiliateSession = clearAffiliateSession
export const destroyAffiliateSession = clearAffiliateSession
