import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspace } from '@/lib/workspace'


export const dynamic = 'force-dynamic'

/**
 * GET /api/tasks/bot
 * Returns all tasks for the workspace in a format suitable for bot consumption
 * 
 * Query parameters:
 * - status: Filter by status (inbox, planned, doing, blocked, done)
 * - priority: Filter by priority (1-4)
 * - limit: Max tasks to return (default: 100)
 * - includeCompleted: Include completed tasks (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await requireWorkspace()
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const includeCompleted = searchParams.get('includeCompleted') === 'true'

    // Build where clause
    const where: any = {
      workspaceId,
    }

    // Filter by status if provided
    if (status) {
      where.status = {
        type: status,
      }
    }

    // Filter by priority if provided
    if (priority) {
      where.priority = parseInt(priority)
    }

    // Exclude completed tasks unless explicitly included
    if (!includeCompleted) {
      where.completedAt = null
    }

    // Fetch tasks with related data
    const tasks = await prisma.task.findMany({
      where,
      include: {
        status: true,
        goal: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: [
        { priority: 'asc' }, // P1 first
        { createdAt: 'desc' }, // Newest first
      ],
      take: limit,
    })

    // Format response
    const formattedTasks = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      priorityLabel: ['P1 - Urgent', 'P2 - High', 'P3 - Medium', 'P4 - Low'][task.priority - 1],
      status: task.status.name,
      statusType: task.status.type,
      dueDate: task.dueAt ? task.dueAt.toISOString().split('T')[0] : null,
      goal: task.goal
        ? {
            id: task.goal.id,
            name: task.goal.name,
          }
        : null,
      tags: task.tags.map((tt) => tt.tag.name),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      count: formattedTasks.length,
      data: formattedTasks,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('GET /api/tasks/bot error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tasks',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
