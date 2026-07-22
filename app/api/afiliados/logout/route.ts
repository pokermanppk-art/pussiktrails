import { NextResponse } from 'next/server'

import {
  AFFILIATE_COOKIE_NAME,
  affiliateCookieOptions,
} from '@/lib/affiliate-auth'

export const runtime = 'nodejs'

export async function POST() {
  const response = NextResponse.json({ sucesso: true })

  response.cookies.set(AFFILIATE_COOKIE_NAME, '', {
    ...affiliateCookieOptions(),
    maxAge: 0,
  })

  return response
}
