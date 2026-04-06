import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'
import { wakeupAgent } from '@/lib/agent-wakeup'

/**
 * GET /api/handoffs
 * List handoffs with optional filters.
 * Query params: workspaceId, toAgent, fromAgent, taskId, status
 *
 * POST /api/handoffs
 * Create a new handoff record.
 */

export async function GET(request: NextRequest) {
  try {
    const auth = validateAIAuth(request)
    const { searchParams } = request.nextUrl

    let workspaceId: string
    if (auth.valid) {
      const wid = searchParams.get('workspaceId')
      if (!wid) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
      workspaceId = wid
    } else {
      workspaceId = await requireWorkspace()
    }

    const toAgent   = searchParams.get('toAgent')   || undefined
    const fromAgent = searchParams.get('fromAgent') || undefined
    const taskId    = searchParams.get('taskId')    || undefined
    const status    = searchParams.get('status')    || undefined

    const handoffs = await prisma.handoff.findMany({
      where: {
        workspaceId,
        ...(toAgent   && { toAgent }),
        ...(fromAgent && { fromAgent }),
        ...(taskId    && { taskId }),
        ...(status    && { status }),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ success: true, count: handoffs.length, handoffs })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API:handoffs GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = validateAIAuth(request)
    const body = await request.json()

    let workspaceId: string
    if (auth.valid) {
      if (!body.workspaceId) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
      workspaceId = body.workspaceId
    } else {
      workspaceId = await requireWorkspace()
    }

    // Required fields
    const required = ['fromAgent', 'toAgent', 'summary', 'requestedOutcome', 'completedWork', 'remainingWork', 'blockers']
    const missing = required.filter(f => !body[f]?.trim?.())
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    // If a taskId is provided, verify it belongs to this workspace
    if (body.taskId) {
      const task = await prisma.task.findFirst({ where: { id: body.taskId, workspaceId } })
      if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const handoff = await prisma.handoff.create({
      data: {
        workspaceId,
        taskId:           body.taskId    || null,
        companyId:        body.companyId || null,
        projectId:        body.projectId || null,
        fromAgent:        body.fromAgent.trim(),
        toAgent:          body.toAgent.trim(),
        summary:          body.summary.trim(),
        requestedOutcome: body.requestedOutcome.trim(),
        completedWork:    body.completedWork.trim(),
        remainingWork:    body.remainingWork.trim(),
        blockers:         body.blockers.trim(),
        filesChanged:     body.filesChanged    || [],
        linkedDocIds:     body.linkedDocIds    || [],
        decisionNeeded:   body.decisionNeeded  ?? false,
        decisionSummary:  body.decisionSummary || null,
        status:           'pending',
      },
    })

    // If a task was linked, stamp handoffToAgent on it
    if (body.taskId) {
      await prisma.task.update({
        where: { id: body.taskId },
        data: { handoffToAgent: body.toAgent.trim() },
      })
    }

    // Wake up the receiving agent immediately
    wakeupAgent({
      workspaceId,
      toAgent:   handoff.toAgent,
      taskId:    handoff.taskId   ?? undefined,
      handoffId: handoff.id,
      fromAgent: handoff.fromAgent,
      reason:    'handoff_created',
      companyId: handoff.companyId  ?? undefined,
      projectId: handoff.projectId  ?? undefined,
    }).catch(() => {})

    return NextResponse.json({ success: true, handoff }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API:handoffs POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
