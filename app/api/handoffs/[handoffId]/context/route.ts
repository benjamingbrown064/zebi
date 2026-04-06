import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'

export const dynamic = 'force-dynamic'

/**
 * GET /api/handoffs/[handoffId]/context
 *
 * Returns a full context bundle for the receiving agent to use when
 * accepting and starting work on a handoff.
 *
 * Bundle includes:
 * - The handoff itself
 * - The linked task (if any) with all agent fields
 * - Recent AIMemory entries for the same space/project/objective
 * - Recent AIInsights for the same space
 * - Recent decisions from tasks in the same space
 * - Sibling tasks in the same project/objective (for situational awareness)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handoffId: string }> }
) {
  try {
    const { handoffId } = await params
    const auth = validateAIAuth(request)

    let workspaceId: string
    if (auth.valid) {
      const wid = request.nextUrl.searchParams.get('workspaceId')
      if (!wid) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
      workspaceId = wid
    } else {
      workspaceId = await requireWorkspace()
    }

    // 1. Fetch the handoff
    const handoff = await prisma.handoff.findFirst({
      where: { id: handoffId, workspaceId },
    })
    if (!handoff) return NextResponse.json({ error: 'Handoff not found' }, { status: 404 })

    // 2. Fetch the linked task (if any)
    const task = handoff.taskId
      ? await prisma.task.findFirst({
          where: { id: handoff.taskId, workspaceId },
          include: {
            company: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } },
          },
        })
      : null

    // Derive scope for memory/insight queries
    const companyId  = handoff.companyId  ?? task?.companyId  ?? null
    const projectId  = handoff.projectId  ?? task?.projectId  ?? null
    const objectiveId = task?.objectiveId ?? null

    // 3. Parallel context queries
    const [
      recentMemory,
      recentInsights,
      recentDecisions,
      siblingTasks,
      linkedDocs,
    ] = await Promise.all([

      // Recent AIMemory for same space / project / objective (last 10)
      prisma.aIMemory.findMany({
        where: {
          workspaceId,
          ...(companyId   && { companyId }),
          ...(projectId   && { projectId }),
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          description: true,
          memoryType: true,
          entryType: true,
          authorAgent: true,
          createdAt: true,
          completed: true,
          decisions: true,
          blockers: true,
          pending: true,
          tomorrowFirst: true,
        },
      }),

      // Recent AIInsights for same space (last 10)
      prisma.aIInsight.findMany({
        where: {
          workspaceId,
          ...(companyId && { companyId }),
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          summary: true,
          insightType: true,
          priority: true,
          tags: true,
          createdBy: true,
          createdAt: true,
          detailedAnalysis: true,
          suggestedActions: true,
        },
      }),

      // Recent decisions from tasks in same space
      prisma.task.findMany({
        where: {
          workspaceId,
          ...(companyId && { companyId }),
          decisionNeeded: true,
          archivedAt: null,
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          decisionSummary: true,
          ownerAgent: true,
          updatedAt: true,
        },
      }),

      // Sibling tasks in same project/objective (not yet done, not this task)
      prisma.task.findMany({
        where: {
          workspaceId,
          completedAt: null,
          archivedAt: null,
          ...(handoff.taskId && { NOT: { id: handoff.taskId } }),
          OR: [
            ...(projectId   ? [{ projectId }]   : []),
            ...(objectiveId ? [{ objectiveId }] : []),
          ].length > 0
            ? [
                ...(projectId   ? [{ projectId }]   : []),
                ...(objectiveId ? [{ objectiveId }] : []),
              ]
            : [{ id: '__no_match__' }], // no-op if no scope
        },
        orderBy: { priority: 'asc' },
        take: 10,
        select: {
          id: true,
          title: true,
          ownerAgent: true,
          taskType: true,
          priority: true,
          blockedReason: true,
          waitingOn: true,
          definitionOfDone: true,
          nextAction: true,
        },
      }),

      // Linked documents / insights from the handoff's linkedDocIds
      handoff.linkedDocIds.length > 0
        ? prisma.document.findMany({
            where: { id: { in: handoff.linkedDocIds }, workspaceId },
            select: { id: true, title: true, updatedAt: true },
          })
        : Promise.resolve([]),
    ])

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      handoff,
      task,
      context: {
        companyId,
        projectId,
        objectiveId,
        recentMemory,
        recentInsights,
        recentDecisions,
        siblingTasks,
        linkedDocs,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API:handoffs/context]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
