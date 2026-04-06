import { NextRequest, NextResponse } from 'next/server'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'
import { getQueueStatus } from '@/lib/ai-queue'

export const dynamic = 'force-dynamic'

/**
 * GET /api/ai/queue/status?workspaceId=...
 *
 * Returns current queue state: ready, claimed, completed, exhausted counts
 * broken down by priority and type.
 */
export async function GET(request: NextRequest) {
  const auth = validateAIAuth(request)

  let workspaceId: string
  if (auth.valid) {
    const wid = request.nextUrl.searchParams.get('workspaceId')
    if (!wid) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    workspaceId = wid
  } else {
    workspaceId = await requireWorkspace()
  }

  try {
    const status = await getQueueStatus(workspaceId)
    return NextResponse.json({ success: true, status })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
