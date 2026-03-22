import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'

// Force dynamic rendering
export const revalidate = 30 // Cache for 30s — invalidated on writes

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

    const { title, description, priority, dueAt, projectId, companyId, objectiveId, goalId,
            assigneeId, botAssignee, plannedDate, expectedOutcome } = body

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
      },
    })

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
    const projectId = searchParams.get('projectId')
    const goalId = searchParams.get('goalId')
    const priority = searchParams.get('priority')

    console.log(`[API:tasks/direct] Fetching tasks for workspace ${workspaceId}`, {
      includeArchived,
      includeCompleted,
    })
    const startTime = Date.now()

    const where: any = { workspaceId }

    if (!includeArchived) where.archivedAt = null
    if (!includeCompleted) where.completedAt = null

    if (projectId) where.projectId = projectId
    if (goalId) where.goalId = goalId
    if (priority) where.priority = parseInt(priority, 10)

    const tasks = await prisma.task.findMany({
      where,
      include: {
        tags: {
          include: { tag: true },
        },
      },
      orderBy: { createdAt: 'desc' },
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
