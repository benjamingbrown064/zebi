import { NextRequest, NextResponse } from 'next/server'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'
import { getNextQueueItem } from '@/lib/ai-queue'
import type { AgentName } from '@/lib/ai-queue'

export const dynamic = 'force-dynamic'

/**
 * GET /api/ai/queue/next?workspaceId=...
 *
 * Claim the next available work item for the calling agent.
 * Agent is determined from the Bearer token (harvey / theo / doug / casper).
 *
 * Items pre-assigned via contextData.assignedTo are only returned to that agent.
 * Unassigned items are first-come-first-served by priority.
 *
 * Returns 200 with item: null if no work is available.
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

  const agent = (auth.assistant ?? request.nextUrl.searchParams.get('agent') ?? 'doug') as AgentName

  try {
    const item = await getNextQueueItem(workspaceId, agent)
    if (!item) {
      return NextResponse.json({ success: true, message: 'No work available', item: null })
    }
    return NextResponse.json({ success: true, message: 'Work item claimed', item })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[queue/next]', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
