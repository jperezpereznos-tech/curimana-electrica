export const ROLE_COOKIE = 'x-user-role'

export function encodeRoleCookie(userId: string, role: string): string {
  return `${userId}:${role}`
}

export function decodeRoleCookie(raw: string | undefined, expectedUserId: string): string | null {
  if (!raw) return null
  const sep = raw.indexOf(':')
  if (sep === -1) return null
  const cookieUserId = raw.substring(0, sep)
  const cookieRole = raw.substring(sep + 1)
  if (cookieUserId !== expectedUserId) return null
  return cookieRole
}
