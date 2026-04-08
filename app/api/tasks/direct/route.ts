import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'
import { wakeupAgent } from '@/lib/agent-wakeup'

// Force dynamic rendering — never cache this route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const auth = validateAIAuth(request)
    const body = await request.json()

    let workspaceId: string
    if (auth.valid) {
      workspaceId = body.workspaceId
      if (!workspaceId) {
        return NextResponse.json({ success: false, error: 'workspaceId is required' }, { status: 400 })
      }
    } else {
      workspaceId = await requireWorkspace()
    }

    // Accept description, notes, or body as aliases
    const description = body.description ?? body.notes ?? body.body
    const { title, priority, dueAt, projectId, companyId, objectiveId, goalId,
            assigneeId, botAssignee, plannedDate, expectedOutcome,
            // Multi-agent OS fields
            ownerAgent, reviewerAgent, handoffToAgent, requestedBy, taskType,
            decisionNeeded, decisionSummary, waitingOn, blockedReason,
            definitionOfDone, nextAction, dependencyIds, outputDocId } = body

    if (!title?.trim()) {
      return NextResponse.json({ success: false, error: 'title is required' }, { status: 400 })
    }

    // Resolve or find a default status for the workspace
    let statusId = body.statusId
    if (!statusId) {
      const defaultStatus = await prisma.status.findFirst({
        where: { workspaceId },
        orderBy: { sortOrder: 'asc' },
      })
      if (!defaultStatus) {
        return NextResponse.json({ success: false, error: 'No statuses found for workspace' }, { status: 400 })
      }
      statusId = defaultStatus.id
    }

    // Resolve createdBy: use provided UUID or fall back to workspace owner
    let createdBy = body.createdBy
    if (!createdBy) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { ownerId: true },
      })
      createdBy = workspace?.ownerId
    }
    if (!createdBy) {
      return NextResponse.json({ success: false, error: 'Could not resolve createdBy' }, { status: 400 })
    }

    const task = await prisma.task.create({
      data: {
        workspaceId,
        title: title.trim(),
        statusId,
        createdBy,
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority: Number(priority) }),
        ...(dueAt && { dueAt: new Date(dueAt) }),
        ...(plannedDate && { plannedDate: new Date(plannedDate) }),
        ...(projectId && { projectId }),
        ...(companyId && { companyId }),
        ...(objectiveId && { objectiveId }),
        ...(goalId && { goalId }),
        ...(assigneeId && { assigneeId }),
        ...(botAssignee && { botAssignee }),
        ...(expectedOutcome && { expectedOutcome }),
        // Multi-agent OS fields
        ...(ownerAgent       && { ownerAgent }),
        ...(reviewerAgent    && { reviewerAgent }),
        ...(handoffToAgent   && { handoffToAgent }),
        ...(requestedBy      && { requestedBy }),
        ...(taskType         && { taskType }),
        ...(decisionNeeded !== undefined && { decisionNeeded: Boolean(decisionNeeded) }),
        ...(decisionSummary  && { decisionSummary }),
        ...(waitingOn        && { waitingOn }),
        ...(blockedReason    && { blockedReason }),
        ...(definitionOfDone && { definitionOfDone }),
        ...(nextAction       && { nextAction }),
        ...(dependencyIds    && { dependencyIds }),
        ...(outputDocId      && { outputDocId }),
      },
    })

    // Wake up the assigned agent immediately if ownerAgent was set on creation
    if (ownerAgent) {
      wakeupAgent({
        workspaceId,
        toAgent:   ownerAgent,
        taskId:    task.id,
        taskTitle: task.title,
        fromAgent: auth.valid ? (auth.assistant ?? 'system') : 'ben',
        reason:    'task_assigned',
        companyId: task.companyId  ?? undefined,
        projectId: task.projectId  ?? undefined,
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        description: task.description || undefined,
        statusId: task.statusId,
        priority: task.priority,
        dueAt: task.dueAt?.toISOString(),
        plannedDate: task.plannedDate?.toISOString(),
        projectId: task.projectId || undefined,
        companyId: task.companyId || undefined,
        objectiveId: task.objectiveId || undefined,
        goalId: task.goalId || undefined,
        assigneeId: task.assigneeId || undefined,
        botAssignee: task.botAssignee || undefined,
        // Multi-agent OS fields
        ownerAgent:       task.ownerAgent       || undefined,
        reviewerAgent:    task.reviewerAgent     || undefined,
        handoffToAgent:   task.handoffToAgent    || undefined,
        requestedBy:      task.requestedBy       || undefined,
        taskType:         task.taskType          || undefined,
        decisionNeeded:   task.decisionNeeded,
        decisionSummary:  task.decisionSummary   || undefined,
        waitingOn:        task.waitingOn         || undefined,
        blockedReason:    task.blockedReason     || undefined,
        definitionOfDone: task.definitionOfDone  || undefined,
        nextAction:       task.nextAction        || undefined,
        dependencyIds:    task.dependencyIds,
        outputDocId:      task.outputDocId       || undefined,
        expectedOutcome:  task.expectedOutcome   || undefined,
        workspaceId: task.workspaceId,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      },
    }, { status: 201 })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[API:tasks/direct POST] Error:', errorMsg)
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required query parameter: workspaceId',
      }, { status: 400 })
    }

    // By default exclude archived and completed tasks.
    // Pass includeArchived=true or includeCompleted=true to override.
    const includeArchived = searchParams.get('includeArchived') === 'true'
    const includeCompleted = searchParams.get('includeCompleted') === 'true'

    // Optional filters
    const projectId  = searchParams.get('projectId')
    const goalId     = searchParams.get('goalId')
    const priority   = searchParams.get('priority')
    // Agent queue filters
    const ownerAgent      = searchParams.get('ownerAgent')
    const decisionNeeded  = searchParams.get('decisionNeeded')
    const waitingOn       = searchParams.get('waitingOn')
    const taskType        = searchParams.get('taskType')
    const search          = searchParams.get('search')

    console.log(`[API:tasks/direct] Fetching tasks for workspace ${workspaceId}`, {
      includeArchived,
      includeCompleted,
    })
    const startTime = Date.now()

    const where: any = { workspaceId }

    if (!includeArchived) where.archivedAt = null
    if (!includeCompleted) where.completedAt = null

    if (projectId)  where.projectId  = projectId
    if (goalId)     where.goalId     = goalId
    if (priority)   where.priority   = parseInt(priority, 10)
    if (ownerAgent) where.ownerAgent = ownerAgent
    if (waitingOn)  where.waitingOn  = waitingOn
    if (taskType)   where.taskType   = taskType
    if (decisionNeeded === 'true') where.decisionNeeded = true
    if (search) where.title = { contains: search, mode: 'insensitive' }

    const limitParam = searchParams.get('limit')
    const tasks = await prisma.task.findMany({
      where,
      include: {
        tags: {
          include: { tag: true },
        },
        company: {
          select: { id: true, name: true },
        },
        project: {
          select: { id: true, name: true },
        },
        objective: {
          select: { id: true, title: true },
        },
        goal: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...(limitParam ? { take: parseInt(limitParam, 10) } : {}),
    })

    const duration = Date.now() - startTime
    console.log(`[API:tasks/direct] Returned ${tasks.length} tasks in ${duration}ms`)

    return NextResponse.json({
      success: true,
      count: tasks.length,
      filters: { includeArchived, includeCompleted },
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        statusId: t.statusId,
        description: t.description || undefined,
        dueAt: t.dueAt?.toISOString(),
        completedAt: t.completedAt?.toISOString(),
        archivedAt: t.archivedAt?.toISOString(),
        tags: t.tags.map(tt => tt.tag.name),
        goalId: t.goalId || undefined,
        projectId: t.projectId || undefined,
        companyId: t.companyId || undefined,
        objectiveId: t.objectiveId || undefined,
        botAssignee: t.botAssignee || undefined,
        // Resolved relations for list/table display
        space: t.company ? { id: t.company.id, name: t.company.name } : undefined,
        project: t.project ? { id: t.project.id, name: t.project.name } : undefined,
        objective: t.objective ? { id: t.objective.id, title: t.objective.title } : undefined,
        goal: t.goal ? { id: t.goal.id, name: t.goal.name } : undefined,
        // Multi-agent OS fields
        ownerAgent:       t.ownerAgent       || undefined,
        reviewerAgent:    t.reviewerAgent     || undefined,
        handoffToAgent:   t.handoffToAgent    || undefined,
        requestedBy:      t.requestedBy       || undefined,
        taskType:         t.taskType          || undefined,
        decisionNeeded:   t.decisionNeeded,
        decisionSummary:  t.decisionSummary   || undefined,
        waitingOn:        t.waitingOn         || undefined,
        blockedReason:    t.blockedReason     || undefined,
        definitionOfDone: t.definitionOfDone  || undefined,
        nextAction:       t.nextAction        || undefined,
        dependencyIds:    t.dependencyIds,
        outputDocId:      t.outputDocId       || undefined,
        expectedOutcome:  t.expectedOutcome   || undefined,
        completionNote:   t.completionNote    || undefined,
        outputUrl:        t.outputUrl         || undefined,
        workspaceId: t.workspaceId,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[API:tasks/direct] Error:', errorMsg)

    return NextResponse.json({
      success: false,
      error: errorMsg,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
