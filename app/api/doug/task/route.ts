import { NextRequest, NextResponse } from 'next/server'
import { requireDougAuth } from '@/lib/doug-auth'
import { getDougWorkspaceId } from '@/lib/doug-workspace'
import { prisma } from '@/lib/prisma'
import { getAffectedObjectives } from '@/lib/objective-progress'
import { queueMultipleRecalculations } from '@/lib/progress-queue'

const DEFAULT_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

/**
 * POST /api/doug/task
 * 
 * Create a new task (optionally linked to objective/project)
 * 
 * Body:
 * {
 *   "title": "Set up campaign landing page",
 *   "description": "...",
 *   "objectiveId": "uuid" (optional),
 *   "projectId": "uuid" (optional),
 *   "priority": 1-4 (default 3),
 *   "statusId": "uuid" (optional, defaults to first status),
 *   "aiGenerated": false,
 *   "aiAgent": "doug" (optional),
 *   "botAssignee": "doug" | "harvey" (optional - assign to specific bot)
 * }
 */
export async function POST(request: NextRequest) {
  const authError = requireDougAuth(request)
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  try {
    const body = await request.json()
    const {
      title,
      description,
      objectiveId,
      projectId,
      priority = 3,
      statusId,
      aiGenerated = false,
      aiAgent = 'doug',
      botAssignee,
      userId,
    } = body

    // Resolve workspace from Doug API context
    const workspaceId = await getDougWorkspaceId(userId)

    if (!title) {
      return NextResponse.json(
        { error: 'Missing required field: title' },
        { status: 400 }
      )
    }

    // Get default status if not provided
    let finalStatusId = statusId
    if (!finalStatusId) {
      const defaultStatus = await prisma.status.findFirst({
        where: { workspaceId },
        orderBy: { sortOrder: 'asc' },
      })
      if (defaultStatus) {
        finalStatusId = defaultStatus.id
      }
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        workspaceId,
        title,
        description: description || null,
        objectiveId: objectiveId || null,
        projectId: projectId || null,
        priority,
        statusId: finalStatusId,
        createdBy: userId || DEFAULT_USER_ID,
        botAssignee: botAssignee || null, // "doug", "harvey", or null
        aiGenerated,
        aiAgent: aiGenerated ? aiAgent : null,
      },
      include: {
        status: { select: { name: true } },
        objective: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
      },
    })

    // Trigger async objective progress recalculation (V2)
    if (objectiveId || projectId) {
      try {
        const affectedObjectives = await getAffectedObjectives(task.id)
        if (affectedObjectives.length > 0) {
          queueMultipleRecalculations(affectedObjectives)
          console.log(`[Doug API] Queued progress recalc for objectives:`, affectedObjectives)
        }
      } catch (err) {
        console.error('[Doug API] Failed to queue progress recalc:', err)
        // Don't fail the request
      }
    }

    return NextResponse.json({
      task: {
        id: task.id,
        title: task.title,
        status: task.status?.name,
        objective: task.objective?.title,
        project: task.project?.name,
        priority: task.priority,
        aiGenerated: task.aiGenerated,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[Doug API] Failed to create task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/doug/task
 * 
 * Update a task (status, completion, etc.)
 * 
 * Body:
 * {
 *   "taskId": "uuid",
 *   "statusId": "uuid" (optional),
 *   "completed": true/false (optional),
 *   "title": "new title" (optional),
 *   "description": "..." (optional)
 * }
 */
export async function PATCH(request: NextRequest) {
  const authError = requireDougAuth(request)
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  try {
    const body = await request.json()
    const { taskId, statusId, completed, title, description } = body

    if (!taskId) {
      return NextResponse.json(
        { error: 'Missing required field: taskId' },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: any = {}
    
    if (statusId !== undefined) updateData.statusId = statusId
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    
    if (completed !== undefined) {
      updateData.completedAt = completed ? new Date() : null
    }

    // Update task
    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        status: { select: { name: true } },
        objective: { select: { title: true } },
      },
    })

    // Trigger async objective progress recalculation (V2)
    // Queue recalc if completion status changed
    if (completed !== undefined) {
      try {
        const affectedObjectives = await getAffectedObjectives(taskId)
        if (affectedObjectives.length > 0) {
          queueMultipleRecalculations(affectedObjectives)
          console.log(`[Doug API] Queued progress recalc for objectives:`, affectedObjectives)
        }
      } catch (err) {
        console.error('[Doug API] Failed to queue progress recalc:', err)
        // Don't fail the request
      }
    }

    return NextResponse.json({
      task: {
        id: task.id,
        title: task.title,
        status: task.status?.name,
        objective: task.objective?.title,
        completed: !!task.completedAt,
      },
    })
  } catch (error) {
    console.error('[Doug API] Failed to update task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}
