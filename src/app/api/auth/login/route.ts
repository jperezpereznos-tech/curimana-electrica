import { NextRequest, NextResponse } from 'next/server'

const MAX_ATTEMPTS = 5
const WINDOW_MS = 60_000
const attempts = new Map<string, { count: number; windowStart: number }>()

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const now = Date.now()
  const entry = attempts.get(ip)

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(ip, { count: 1, windowStart: now })
    return NextResponse.json({ allowed: true, remaining: MAX_ATTEMPTS - 1 })
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000)
    return NextResponse.json(
      { allowed: false, remaining: 0, retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  entry.count++
  return NextResponse.json({ allowed: true, remaining: MAX_ATTEMPTS - entry.count })
}
