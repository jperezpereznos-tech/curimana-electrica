export const ROLE_COOKIE = 'x-user-role'

let cachedKey: CryptoKey | null = null

function getHmacKey(): Promise<CryptoKey> {
  if (cachedKey) return Promise.resolve(cachedKey)
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'fallback-secret-key-curimana-electrica'
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
  const sig = await computeHmac(payload)
  return `${payload}:${sig}`
}

export async function decodeRoleCookie(raw: string | undefined, expectedUserId: string): Promise<string | null> {
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

  const key = await getHmacKey()
  const encoder = new TextEncoder()
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    hexToBuffer(cookieSig),
    encoder.encode(`${cookieUserId}:${cookieRole}`)
  )
  if (!valid) return null

  return cookieRole
}
