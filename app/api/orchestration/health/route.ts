import { NextRequest, NextResponse } from 'next/server'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'
import { orchestrationHealthCheck } from '@/lib/ai/orchestration-resilience'

export const dynamic = 'force-dynamic'

/**
 * GET /api/orchestration/health?workspaceId=...
 *
 * Run a full orchestration health check:
 * - Detect and clean up stale handoffs
 * - Find stuck tasks
 * - Detect deadlocks
 * - Return health report
 *
 * Can be called by:
 * - Cron job (with AI auth)
 * - Founder dashboard (with session)
 * - System monitoring
 */
export async function GET(request: NextRequest) {
  try {
    const auth = validateAIAuth(request)
    
    let workspaceId: string
    if (auth.valid) {
      const wid = request.nextUrl.searchParams.get('workspaceId')
      if (!wid) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
      workspaceId = wid
    } else {
      workspaceId = await requireWorkspace()
    }

    const healthReport = await orchestrationHealthCheck(workspaceId)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      workspaceId,
      health: healthReport,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API:orchestration/health]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
