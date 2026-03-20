import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspace } from '@/lib/workspace'
import { validateAIAuth } from '@/lib/doug-auth'
import { getAffectedObjectives } from '@/lib/objective-progress'
import { queueMultipleRecalculations } from '@/lib/progress-queue'


export async function PATCH(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    // Check if using Bearer token auth or session auth
    const auth = validateAIAuth(request)
    const body = await request.json()
    
    let workspaceId: string
    
    if (auth.valid) {
      // Bearer token auth - require workspaceId in body
      workspaceId = body.workspaceId
      if (!workspaceId) {
        return NextResponse.json(
          { success: false, error: 'workspaceId is required when using API token' },
          { status: 400 }
        )
      }
    } else {
      // Session auth - get from requireWorkspace()
      workspaceId = await requireWorkspace()
    }
    const { taskId } = params

    console.log(`[API:tasks/${taskId}] PATCH request with body:`, body)

    // Verify task exists and belongs to workspace
    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, workspaceId }
    })

    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      )
    }

    // If updating status, verify it exists
    if (body.statusId) {
      const status = await prisma.status.findFirst({
        where: { id: body.statusId, workspaceId }
      })
      if (!status) {
        return NextResponse.json(
          { success: false, error: 'Invalid status' },
          { status: 400 }
        )
      }
    }

    // Update task
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(body.statusId && { statusId: body.statusId }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.completedAt !== undefined && { 
          completedAt: body.completedAt ? new Date(body.completedAt) : null 
        }),
        ...(body.dueAt !== undefined && { 
          dueAt: body.dueAt ? new Date(body.dueAt) : null 
        }),
        ...(body.plannedDate !== undefined && { 
          plannedDate: body.plannedDate ? new Date(body.plannedDate) : null 
        }),
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId }),
        // Phase 2: Outcome fields
        ...(body.expectedOutcome !== undefined && { expectedOutcome: body.expectedOutcome || null }),
        ...(body.completionNote !== undefined && { completionNote: body.completionNote || null }),
        ...(body.outputUrl !== undefined && { outputUrl: body.outputUrl || null }),
      },
      include: {
        tags: {
          include: { tag: true }
        },
        goal: true
      }
    })

    console.log(`[API:tasks/${taskId}] Task updated successfully`)

    // Trigger async objective progress recalculation (V2)
    // Queue recalc if completion status changed or objective/project changed
    const shouldRecalculate = 
      body.completedAt !== undefined ||  // Completion toggled
      body.objectiveId !== undefined ||  // Objective changed
      body.projectId !== undefined       // Project changed (may affect objective)
    
    let affectedObjectives: string[] = []
    
    if (shouldRecalculate) {
      try {
        affectedObjectives = await getAffectedObjectives(taskId)
        
        if (affectedObjectives.length > 0) {
          // Queue recalculation (async, fire-and-forget)
          queueMultipleRecalculations(affectedObjectives)
          console.log(`[API:tasks/${taskId}] Queued progress recalc for objectives:`, affectedObjectives)
        }
      } catch (err) {
        console.error(`[API:tasks/${taskId}] Failed to queue progress recalc:`, err)
        // Don't fail the request
      }
    }

    return NextResponse.json({
      success: true,
      task: {
        id: updatedTask.id,
        title: updatedTask.title,
        priority: updatedTask.priority,
        statusId: updatedTask.statusId,
        description: updatedTask.description || undefined,
        dueAt: updatedTask.dueAt?.toISOString(),
        completedAt: updatedTask.completedAt?.toISOString(),
        tags: updatedTask.tags.map(tt => tt.tag.name),
        goal: updatedTask.goal || undefined,
        goalId: updatedTask.goalId || undefined,
        projectId: updatedTask.projectId || undefined,
        assigneeId: updatedTask.assigneeId || undefined,
        workspaceId: updatedTask.workspaceId,
        createdAt: updatedTask.createdAt.toISOString(),
        updatedAt: updatedTask.updatedAt.toISOString(),
      },
      // V2: Which objectives are being recalculated
      affectedObjectives: affectedObjectives.length > 0 ? affectedObjectives : undefined,
      note: affectedObjectives.length > 0 ? 'Progress will update in a moment' : undefined
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`[API:tasks/${params.taskId}] Error:`, errorMsg)
    
    return NextResponse.json({
      success: false,
      error: errorMsg,
    }, { status: 500 })
  }
}


export async function DELETE(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const auth = validateAIAuth(request)
    const { searchParams } = new URL(request.url)

    let workspaceId: string
    if (auth.valid) {
      const wid = searchParams.get('workspaceId')
      if (!wid) return NextResponse.json({ success: false, error: 'workspaceId is required' }, { status: 400 })
      workspaceId = wid
    } else {
      workspaceId = await requireWorkspace()
    }

    const { taskId } = params
    const hardDelete = searchParams.get('hard') === 'true'

    const existing = await prisma.task.findFirst({ where: { id: taskId, workspaceId } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 })
    }

    if (hardDelete) {
      await prisma.task.delete({ where: { id: taskId } })
      return NextResponse.json({ success: true, deleted: true })
    } else {
      // Soft archive
      const task = await prisma.task.update({
        where: { id: taskId },
        data: { archivedAt: new Date() }
      })
      return NextResponse.json({ success: true, archived: true, task: { id: task.id, archivedAt: task.archivedAt } })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
