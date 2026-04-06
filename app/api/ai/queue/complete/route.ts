import { NextRequest, NextResponse } from 'next/server'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'
import { completeQueueItem, failQueueItem } from '@/lib/ai-queue'
import type { AgentName } from '@/lib/ai-queue'

export const dynamic = 'force-dynamic'

/**
 * POST /api/ai/queue/complete
 *
 * Mark a work item as completed or failed.
 * Must be called by the same agent that claimed the item.
 *
 * Body:
 * {
 *   workspaceId: string
 *   itemId:      string
 *   success:     boolean
 *   workLog?:    object   // what was done, output, links
 *   failureReason?: string  // required if success: false
 * }
 */
export async function POST(request: NextRequest) {
  const auth = validateAIAuth(request)
  const body = await request.json()

  let workspaceId: string
  if (auth.valid) {
    if (!body.workspaceId) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    workspaceId = body.workspaceId
  } else {
    workspaceId = await requireWorkspace()
  }

  const { itemId, success, workLog, failureReason } = body
  if (!itemId) return NextResponse.json({ error: 'itemId is required' }, { status: 400 })

  const agent = (auth.assistant ?? body.agent ?? 'doug') as AgentName

  try {
    if (success === false) {
      if (!failureReason) return NextResponse.json({ error: 'failureReason is required when success is false' }, { status: 400 })
      const item = await failQueueItem(itemId, agent, failureReason)
      return NextResponse.json({
        success: true,
        message: item.retryCount >= 3 ? 'Work item exhausted (max retries)' : 'Work item failed — will retry',
        item: {
          id:            item.id,
          failureReason: item.failureReason,
          retryCount:    item.retryCount,
          willRetry:     item.retryCount < 3,
        },
      })
    }

    const item = await completeQueueItem(itemId, agent, workLog ?? {})
    return NextResponse.json({
      success: true,
      message: 'Work item completed',
      item: {
        id:          item.id,
        completedAt: item.completedAt,
        workLog:     item.workLog,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[queue/complete]', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
