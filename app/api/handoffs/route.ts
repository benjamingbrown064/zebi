import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'
import { createResilientHandoff } from '@/lib/ai/orchestration-resilience'

/**
 * GET /api/handoffs
 * List handoffs with optional filters.
 * Query params: workspaceId, toAgent, fromAgent, taskId, status
 *
 * POST /api/handoffs
 * Create a new handoff record with full validation and resilience.
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

    // Use resilient handoff creation with validation, transactions, and wakeup
    const result = await createResilientHandoff({
      workspaceId,
      fromAgent: body.fromAgent.trim(),
      toAgent: body.toAgent.trim(),
      taskId: body.taskId,
      companyId: body.companyId,
      projectId: body.projectId,
      summary: body.summary.trim(),
      requestedOutcome: body.requestedOutcome.trim(),
      completedWork: body.completedWork.trim(),
      remainingWork: body.remainingWork.trim(),
      blockers: body.blockers.trim(),
      filesChanged: body.filesChanged,
      linkedDocIds: body.linkedDocIds,
      decisionNeeded: body.decisionNeeded,
      decisionSummary: body.decisionSummary,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, warnings: result.warnings },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      handoff: result.handoff,
      warnings: result.warnings,
    }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API:handoffs POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
