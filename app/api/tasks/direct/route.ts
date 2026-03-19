import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const revalidate = 30 // Cache for 30s — invalidated on writes

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
