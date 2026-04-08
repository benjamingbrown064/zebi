/**
 * POST /api/relay
 *
 * Thin passthrough relay for sandboxed environments that cannot reach
 * zebi.app directly. Accepts a structured request, forwards it to the
 * Zebi API internally (same process), and returns the exact response.
 *
 * Body:
 *   {
 *     "method":   "GET" | "POST" | "PATCH" | "PUT" | "DELETE"   (required)
 *     "path":     "/api/tasks/direct"                            (required — must start with /api/)
 *     "query":    { "workspaceId": "...", ... }                  (optional — appended as query string)
 *     "body":     { ... }                                        (optional — forwarded as JSON body)
 *   }
 *
 * Auth: pass the same Bearer token you would use on direct API calls.
 * The relay validates the token and forwards it to the target endpoint.
 *
 * Rate limit: 120 requests / minute per token (in-memory, resets on cold start).
 *
 * All relay calls are logged to console for auditability.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAIAuth } from '@/lib/doug-auth'

// ─── Rate limiting ────────────────────────────────────────────────────────────
// Simple in-memory window counter. Resets on Vercel cold start.
const RATE_LIMIT = 120          // requests per window
const WINDOW_MS  = 60 * 1000    // 1 minute

interface RateBucket { count: number; resetAt: number }
const rateBuckets = new Map<string, RateBucket>()

function checkRateLimit(token: string): { ok: boolean; remaining: number } {
  const now = Date.now()
  const bucket = rateBuckets.get(token)

  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(token, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true, remaining: RATE_LIMIT - 1 }
  }

  bucket.count++
  const remaining = RATE_LIMIT - bucket.count
  if (bucket.count > RATE_LIMIT) {
    return { ok: false, remaining: 0 }
  }
  return { ok: true, remaining }
}

// ─── Allowed path prefix ──────────────────────────────────────────────────────
const ALLOWED_PREFIX = '/api/'

// Endpoints the relay must never forward (prevent self-loops and auth bypass)
const BLOCKED_PATHS = ['/api/relay', '/api/auth']

// ─── Handler ──────────────────────────────────────────────────────────────────
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const startMs = Date.now()

  // 1. Auth — validate bearer token
  const auth = validateAIAuth(request)
  if (!auth.valid) {
    return NextResponse.json(
      { success: false, error: auth.disabled ? 'Agent access is currently disabled.' : 'Unauthorized — invalid or missing Bearer token.' },
      { status: auth.disabled ? 503 : 401 }
    )
  }

  // 2. Rate limit per token
  const rawAuth = request.headers.get('authorization') ?? ''
  const token = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7) : rawAuth
  const { ok: withinLimit, remaining } = checkRateLimit(token)
  if (!withinLimit) {
    console.warn(`[relay] Rate limit exceeded — agent: ${auth.assistant}`)
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Max 120 requests/minute.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  // 3. Parse relay envelope
  let envelope: { method?: string; path?: string; query?: Record<string, string>; body?: any }
  try {
    envelope = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 })
  }

  const method = (envelope.method ?? 'GET').toUpperCase()
  const path   = envelope.path ?? ''
  const query  = envelope.query ?? {}
  const body   = envelope.body ?? null

  // 4. Validate path
  if (!path.startsWith(ALLOWED_PREFIX)) {
    return NextResponse.json(
      { success: false, error: `path must start with "${ALLOWED_PREFIX}". Got: "${path}"` },
      { status: 400 }
    )
  }
  if (BLOCKED_PATHS.some(blocked => path.startsWith(blocked))) {
    return NextResponse.json(
      { success: false, error: `path "${path}" is not permitted through the relay.` },
      { status: 403 }
    )
  }

  // 5. Validate method
  const ALLOWED_METHODS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  if (!ALLOWED_METHODS.includes(method)) {
    return NextResponse.json(
      { success: false, error: `method must be one of: ${ALLOWED_METHODS.join(', ')}` },
      { status: 400 }
    )
  }

  // 6. Build target URL
  const base = new URL(request.url).origin   // e.g. https://zebi.app
  const url  = new URL(path, base)
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.set(k, String(v))
  }

  // 7. Forward request
  const forwardHeaders: HeadersInit = {
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
    'X-Relay-Agent': auth.assistant ?? 'unknown',
  }

  const fetchOptions: RequestInit = {
    method,
    headers: forwardHeaders,
    ...(body !== null && method !== 'GET' && method !== 'DELETE'
      ? { body: JSON.stringify(body) }
      : {}),
  }

  // 8. Audit log
  console.log(`[relay] ${method} ${url.pathname}${url.search} — agent: ${auth.assistant} — remaining: ${remaining}/min`)

  let upstreamResponse: Response
  try {
    upstreamResponse = await fetch(url.toString(), fetchOptions)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[relay] fetch error: ${msg}`)
    return NextResponse.json(
      { success: false, error: `Relay fetch failed: ${msg}` },
      { status: 502 }
    )
  }

  // 9. Stream response body back exactly
  const responseText = await upstreamResponse.text()
  const durationMs   = Date.now() - startMs

  console.log(`[relay] ← ${upstreamResponse.status} ${method} ${url.pathname} (${durationMs}ms) — agent: ${auth.assistant}`)

  // Return with exact upstream status + Content-Type
  const contentType = upstreamResponse.headers.get('content-type') ?? 'application/json'
  return new NextResponse(responseText, {
    status: upstreamResponse.status,
    headers: {
      'Content-Type':    contentType,
      'X-Relay-Duration': `${durationMs}ms`,
      'X-Relay-Agent':    auth.assistant ?? 'unknown',
    },
  })
}
