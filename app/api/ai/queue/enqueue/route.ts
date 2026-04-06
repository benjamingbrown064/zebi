import { NextRequest, NextResponse } from 'next/server'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'
import { enqueueItem, QUEUE_PRIORITIES, QUEUE_TYPES } from '@/lib/ai-queue'

export const dynamic = 'force-dynamic'

/**
 * POST /api/ai/queue/enqueue
 *
 * Add one or more work items to the queue.
 * Any agent (or the UI) can enqueue work for any agent.
 *
 * Body — single item:
 * {
 *   workspaceId: string
 *   taskId?:      string        // link to an existing Task
 *   priority?:    1|2|3|4|5    // 1=urgent … 5=strategic (default: 3)
 *   queueType?:   string        // task|research|analysis|insight|memory|build|review
 *   scheduledFor?: string       // ISO date — defer until this time
 *   contextData: {
 *     assignedTo?:  string      // "harvey"|"theo"|"doug"|"casper" — reserve for specific agent
 *     title?:       string      // human-readable description of the work
 *     description?: string
 *     [key: string]: any        // any extra context the agent will need
 *   }
 * }
 *
 * Body — batch (up to 20):
 * {
 *   workspaceId: string
 *   items: Array<{ taskId?, priority?, queueType?, scheduledFor?, contextData }>
 * }
 *
 * Response:
 * {
 *   success: true
 *   item?:  QueueItem         // single mode
 *   items?: QueueItem[]       // batch mode
 *   count?: number            // batch mode
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

  try {
    // Batch mode
    if (Array.isArray(body.items)) {
      if (body.items.length > 20) {
        return NextResponse.json({ error: 'Maximum 20 items per batch enqueue' }, { status: 400 })
      }
      for (let i = 0; i < body.items.length; i++) {
        if (!body.items[i].contextData) {
          return NextResponse.json({ error: `items[${i}].contextData is required` }, { status: 400 })
        }
      }

      const created = await Promise.all(
        body.items.map((item: any) =>
          enqueueItem({
            workspaceId,
            taskId:      item.taskId,
            priority:    item.priority ?? QUEUE_PRIORITIES.NORMAL,
            queueType:   item.queueType ?? QUEUE_TYPES.TASK,
            contextData: item.contextData,
            scheduledFor: item.scheduledFor ? new Date(item.scheduledFor) : undefined,
          })
        )
      )

      return NextResponse.json({ success: true, count: created.length, items: created }, { status: 201 })
    }

    // Single mode
    if (!body.contextData) {
      return NextResponse.json({ error: 'contextData is required' }, { status: 400 })
    }

    const item = await enqueueItem({
      workspaceId,
      taskId:      body.taskId,
      priority:    body.priority ?? QUEUE_PRIORITIES.NORMAL,
      queueType:   body.queueType ?? QUEUE_TYPES.TASK,
      contextData: body.contextData,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
    })

    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[queue/enqueue]', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
