import { NextRequest, NextResponse } from 'next/server'

/**
 * Require API key authentication for server-to-server endpoints (cron jobs, webhooks)
 * 
 * Usage in API route:
 * ```typescript
 * import { requireApiKey } from '@/lib/auth-api'
 * 
 * export async function GET(request: NextRequest) {
 *   const authError = requireApiKey(request)
 *   if (authError) return authError
 *   
 *   // ... your endpoint logic
 * }
 * ```
 */
export function requireApiKey(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get('authorization')
  const apiKey = process.env.CRON_SECRET || process.env.API_SECRET_KEY
  
  if (!apiKey) {
    console.error('CRON_SECRET or API_SECRET_KEY environment variable not set')
    return NextResponse.json(
      { error: 'Server misconfiguration' }, 
      { status: 500 }
    )
  }
  
  if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json(
      { error: 'Unauthorized' }, 
      { status: 401 }
    )
  }
  
  return null // Auth passed
}
