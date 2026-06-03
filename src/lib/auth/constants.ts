export const ROLE_COOKIE = 'x-user-role'
export const ROLE_CLIENT_COOKIE = 'x-user-role-client'

let cachedKey: CryptoKey | null = null

function getHmacKey(): Promise<CryptoKey> {
  if (cachedKey) return Promise.resolve(cachedKey)
  const secret = process.env.ROLE_COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ROLE_COOKIE_SECRET is required in production')
    }
    console.warn('ROLE_COOKIE_SECRET not set — role cookies will be unsigned in development')
    cachedKey = null as unknown as CryptoKey
    return Promise.resolve(null as unknown as CryptoKey)
  }
  const encoder = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  ).then(key => {
    cachedKey = key
    return key
  })
}

async function computeHmac(payload: string): Promise<string> {
  const key = await getHmacKey()
  const encoder = new TextEncoder()
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes.buffer
}

export async function encodeRoleCookie(userId: string, role: string): Promise<string> {
  const payload = `${userId}:${role}`
  const key = await getHmacKey()
  if (!key) return `${payload}:unsigned:dev`
  const sig = await computeHmac(payload)
  return `${payload}:${sig}`
}

export function parseRoleCookie(raw: string | undefined): { userId: string; role: string; sig: string } | null {
  if (!raw) return null

  const firstSep = raw.indexOf(':')
  if (firstSep === -1) return null
  const userId = raw.substring(0, firstSep)
  const rest = raw.substring(firstSep + 1)

  const secondSep = rest.indexOf(':')
  if (secondSep === -1) return null
  const role = rest.substring(0, secondSep)
  const sig = rest.substring(secondSep + 1)

  return { userId, role, sig }
}

export function decodeRoleCookieClient(raw: string | undefined, expectedUserId: string): string | null {
  const parsed = parseRoleCookie(raw)
  if (!parsed) return null
  if (parsed.userId !== expectedUserId) return null
  return parsed.role
}

export async function decodeRoleCookie(raw: string | undefined, expectedUserId: string): Promise<string | null> {
  const parsed = parseRoleCookie(raw)
  if (!parsed) return null
  if (parsed.userId !== expectedUserId) return null

  if (parsed.sig === 'unsigned:dev') {
    if (process.env.NODE_ENV === 'production') return null
    return parsed.role
  }

  const key = await getHmacKey()
  if (!key) return null
  const encoder = new TextEncoder()
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    hexToBuffer(parsed.sig),
    encoder.encode(`${parsed.userId}:${parsed.role}`)
  )
  if (!valid) return null

  return parsed.role
}
