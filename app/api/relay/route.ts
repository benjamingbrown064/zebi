/**
 * POST /api/relay
 *
 * Single entrypoint for all bot API calls. Accepts a structured request
 * envelope, validates the caller identity, injects X-Actor-Agent so
 * downstream writes can stamp authorAgent consistently, enforces per-bot
 * rate limits, logs every call to relay_calls, and returns the exact
 * upstream response.
 *
 * Envelope:
 *   {
 *     "method":  "GET" | "POST" | "PATCH" | "PUT" | "DELETE"  (required)
 *     "path":    "/api/tasks/direct"                           (required — must start with /api/)
 *     "query":   { "workspaceId": "...", ... }                 (optional)
 *     "body":    { ... }                                       (optional)
 *   }
 *
 * Auth: Authorization: Bearer <bot-token>
 * Identity is resolved by validateAIAuth in lib/doug-auth.ts.
 *
 * Rate limits (per bot, per minute):
 *   - Default: 60 req/min
 *   - Override per bot via env: RELAY_RATE_LIMIT_DOUG, RELAY_RATE_LIMIT_HARVEY,
 *     RELAY_RATE_LIMIT_THEO, RELAY_RATE_LIMIT_CASPER
 *
 * Every call is persisted to the relay_calls table.
 *
 * Error shape: { success: false, error: string, code: string, field?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAIAuth, AIAssistant } from '@/lib/doug-auth'
import { prisma } from '@/lib/prisma'

// ─── Rate limiting ────────────────────────────────────────────────────────────
const DEFAULT_RATE_LIMIT = 60       // requests per window
const WINDOW_MS          = 60_000   // 1 minute

// Per-bot limits — configurable via env vars
function getBotRateLimit(bot: AIAssistant): number {
  const envKey = `RELAY_RATE_LIMIT_${bot.toUpperCase()}`
  const envVal = process.env[envKey]
  if (envVal) {
    const n = parseInt(envVal, 10)
    if (!isNaN(n) && n > 0) return n
  }
  return DEFAULT_RATE_LIMIT
}

interface RateBucket { count: number; resetAt: number }
// Key: bot name (not token — buckets survive token rotation)
const rateBuckets = new Map<string, RateBucket>()

function checkRateLimit(bot: AIAssistant): { ok: boolean; remaining: number; limit: number } {
  const limit = getBotRateLimit(bot)
  const now   = Date.now()
  const bucket = rateBuckets.get(bot)

  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(bot, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true, remaining: limit - 1, limit }
  }

  bucket.count++
  const remaining = limit - bucket.count
  if (bucket.count > limit) {
    return { ok: false, remaining: 0, limit }
  }
  return { ok: true, remaining, limit }
}

// ─── Path guardrails ──────────────────────────────────────────────────────────
const ALLOWED_PREFIX = '/api/'
const BLOCKED_PATHS  = ['/api/relay', '/api/auth']

// ─── Handler ──────────────────────────────────────────────────────────────────
export const dynamic = 'force-dynamic'
export const runtime  = 'nodejs'  // must run as Node.js lambda — Prisma is not edge-compatible

export async function POST(request: NextRequest) {
  const startMs = Date.now()

  // 1. Auth — resolve bearer token to a known bot
  const auth = validateAIAuth(request)
  if (!auth.valid) {
    return NextResponse.json(
      {
        success: false,
        error:   auth.disabled
          ? 'Agent access is currently disabled.'
          : 'Unauthorized — invalid or missing Bearer token.',
        code: auth.disabled ? 'AGENT_DISABLED' : 'UNAUTHORIZED',
      },
      { status: auth.disabled ? 503 : 401 }
    )
  }

  const actor = auth.assistant as AIAssistant

  // 2. Per-bot rate limit
  const { ok: withinLimit, remaining, limit } = checkRateLimit(actor)
  if (!withinLimit) {
    console.warn(`[relay] rate limit exceeded — actor: ${actor} (limit: ${limit}/min)`)
    return NextResponse.json(
      {
        success: false,
        error:   `Rate limit exceeded. Max ${limit} requests/minute for ${actor}.`,
        code:    'RATE_LIMIT_EXCEEDED',
      },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  // 3. Parse relay envelope
  let envelope: { method?: string; path?: string; query?: Record<string, string>; body?: unknown }
  let rawBody = ''
  try {
    rawBody  = await request.text()
    envelope = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body.', code: 'INVALID_JSON' },
      { status: 400 }
    )
  }

  const method = (envelope.method ?? 'GET').toUpperCase()
  const path   = envelope.path ?? ''
  const query  = envelope.query ?? {}
  const body   = envelope.body ?? null

  // 4. Validate path
  if (!path.startsWith(ALLOWED_PREFIX)) {
    return NextResponse.json(
      {
        success: false,
        error:   `path must start with "${ALLOWED_PREFIX}". Got: "${path}"`,
        code:    'INVALID_PATH',
        field:   'path',
      },
      { status: 400 }
    )
  }
  if (BLOCKED_PATHS.some(blocked => path.startsWith(blocked))) {
    return NextResponse.json(
      {
        success: false,
        error:   `path "${path}" is not permitted through the relay.`,
        code:    'BLOCKED_PATH',
        field:   'path',
      },
      { status: 403 }
    )
  }

  // 5. Validate method
  const ALLOWED_METHODS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  if (!ALLOWED_METHODS.includes(method)) {
    return NextResponse.json(
      {
        success: false,
        error:   `method must be one of: ${ALLOWED_METHODS.join(', ')}`,
        code:    'INVALID_METHOD',
        field:   'method',
      },
      { status: 400 }
    )
  }

  // 6. Build target URL
  const base = new URL(request.url).origin
  const url  = new URL(path, base)
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.set(k, String(v))
  }

  // 7. Forward — inject X-Actor-Agent so downstream routes can stamp authorAgent
  const rawAuth = request.headers.get('authorization') ?? ''
  const token   = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7) : rawAuth

  const forwardHeaders: HeadersInit = {
    'Authorization':  `Bearer ${token}`,
    'Content-Type':   'application/json',
    'X-Actor-Agent':  actor,        // consumed by downstream writes to stamp authorAgent
    'X-Relay-Agent':  actor,        // legacy alias — keep both for compatibility
  }

  const fetchOptions: RequestInit = {
    method,
    headers: forwardHeaders,
    ...(body !== null && method !== 'GET' && method !== 'DELETE'
      ? { body: JSON.stringify(body) }
      : {}),
  }

  // 8. Structured console log (before fetch so we capture even on error)
  console.log(
    `[relay] → ${method} ${url.pathname}${url.search} | actor=${actor} remaining=${remaining}/${limit}`
  )

  let upstreamResponse: Response
  let responseText = ''
  let statusCode   = 502
  let success      = false
  let errorCode: string | undefined

  try {
    upstreamResponse = await fetch(url.toString(), fetchOptions)
    responseText     = await upstreamResponse.text()
    statusCode       = upstreamResponse.status
    success          = statusCode >= 200 && statusCode < 300
    if (!success) {
      // Try to extract structured error code from upstream
      try {
        const parsed = JSON.parse(responseText)
        errorCode = parsed.code ?? String(statusCode)
      } catch {
        errorCode = String(statusCode)
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[relay] fetch error: ${msg}`)
    errorCode = 'UPSTREAM_ERROR'

    // Log the failed call (blocking — must complete before Vercel kills the function)
    const durationMs = Date.now() - startMs
    await persistRelayCall({
      actor, method, path: url.pathname, statusCode: 502,
      latencyMs: durationMs, requestSize: rawBody.length, responseSize: 0,
      success: false, errorCode,
    })

    return NextResponse.json(
      { success: false, error: `Relay fetch failed: ${msg}`, code: 'UPSTREAM_ERROR' },
      { status: 502 }
    )
  }

  const durationMs = Date.now() - startMs
  console.log(
    `[relay] ← ${statusCode} ${method} ${url.pathname} | actor=${actor} latency=${durationMs}ms`
  )

  // 9. Persist call log — must await before returning so Vercel doesn't kill the function first
  await persistRelayCall({
    actor, method, path: url.pathname, statusCode,
    latencyMs: durationMs,
    requestSize:  rawBody.length,
    responseSize: responseText.length,
    success, errorCode,
  })

  // 10. Return upstream response exactly
  const contentType = upstreamResponse.headers.get('content-type') ?? 'application/json'
  return new NextResponse(responseText, {
    status: statusCode,
    headers: {
      'Content-Type':     contentType,
      'X-Relay-Duration': `${durationMs}ms`,
      'X-Relay-Agent':    actor,
      'X-Actor-Agent':    actor,
    },
  })
}

// ─── DB persistence ───────────────────────────────────────────────────────────
async function persistRelayCall(params: {
  actor:        string
  method:       string
  path:         string
  statusCode:   number
  latencyMs:    number
  requestSize:  number
  responseSize: number
  success:      boolean
  errorCode?:   string
}) {
  try {
    const row = await prisma.relayCall.create({
      data: {
        actor:        params.actor,
        method:       params.method,
        path:         params.path,
        statusCode:   params.statusCode,
        latencyMs:    params.latencyMs,
        requestSize:  params.requestSize,
        responseSize: params.responseSize,
        success:      params.success,
        ...(params.errorCode ? { errorCode: params.errorCode } : {}),
      },
    })
    console.log(`[relay] logged call id=${row.id} actor=${params.actor}`)
  } catch (err) {
    // Never let DB logging failures break the relay
    console.error('[relay] PERSIST FAILED actor=' + params.actor, String(err))
  }
}
