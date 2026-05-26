import { createHmac, timingSafeEqual } from 'crypto'

export const ROLE_COOKIE = 'x-user-role'

function getHmacSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurado')
  return secret
}

function computeHmac(payload: string): string {
  return createHmac('sha256', getHmacSecret()).update(payload).digest('hex')
}

export function encodeRoleCookie(userId: string, role: string): string {
  const payload = `${userId}:${role}`
  const sig = computeHmac(payload)
  return `${payload}:${sig}`
}

export function decodeRoleCookie(raw: string | undefined, expectedUserId: string): string | null {
  if (!raw) return null

  const firstSep = raw.indexOf(':')
  if (firstSep === -1) return null
  const cookieUserId = raw.substring(0, firstSep)
  const rest = raw.substring(firstSep + 1)

  const secondSep = rest.indexOf(':')
  if (secondSep === -1) return null
  const cookieRole = rest.substring(0, secondSep)
  const cookieSig = rest.substring(secondSep + 1)

  if (cookieUserId !== expectedUserId) return null

  const expectedSig = computeHmac(`${cookieUserId}:${cookieRole}`)
  if (cookieSig.length !== expectedSig.length) return null
  if (!timingSafeEqual(Buffer.from(cookieSig), Buffer.from(expectedSig))) return null

  return cookieRole
}
