import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspace } from '@/lib/workspace'
import { validateAIAuth } from '@/lib/doug-auth'
import { getAffectedObjectives } from '@/lib/objective-progress'
import { queueMultipleRecalculations } from '@/lib/progress-queue'
import { propagateTaskCompletion } from '@/lib/context-propagation'
import { wakeupAgent } from '@/lib/agent-wakeup'


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

    // If updating status, verify it exists + enforce transition gates
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

      // ── Workflow transition gates ────────────────────────────────────────
      // Merge incoming body with existing task fields for gate evaluation
      const merged = {
        ownerAgent:       body.ownerAgent       ?? existingTask.ownerAgent,
        expectedOutcome:  body.expectedOutcome   ?? existingTask.expectedOutcome,
        definitionOfDone: body.definitionOfDone  ?? existingTask.definitionOfDone,
        blockedReason:    body.blockedReason      ?? existingTask.blockedReason,
        waitingOn:        body.waitingOn          ?? existingTask.waitingOn,
        handoffToAgent:   body.handoffToAgent     ?? existingTask.handoffToAgent,
        completionNote:   body.completionNote     ?? existingTask.completionNote,
        outputDocId:      body.outputDocId        ?? existingTask.outputDocId,
        outputUrl:        body.outputUrl          ?? existingTask.outputUrl,
      }

      const statusName = status.name.toLowerCase().replace(/\s+/g, '_')
      const gateErrors: string[] = []

      if (statusName === 'in_progress' || statusName === 'doing' || statusName === 'in progress') {
        if (!merged.ownerAgent)       gateErrors.push('ownerAgent is required to start work')
        if (!merged.expectedOutcome && !merged.definitionOfDone)
          gateErrors.push('expectedOutcome or definitionOfDone is required to start work')
      }

      if (statusName === 'blocked') {
        if (!merged.blockedReason) gateErrors.push('blockedReason is required when blocking a task')
        if (!merged.waitingOn)     gateErrors.push('waitingOn is required when blocking a task')
      }

      if (statusName === 'handed_off' || statusName === 'handoff') {
        if (!merged.handoffToAgent) gateErrors.push('handoffToAgent is required for a handoff')
        // Check a handoff record exists for this task
        const handoff = await prisma.handoff.findFirst({
          where: { taskId, workspaceId, status: { in: ['pending', 'accepted'] } }
        })
        if (!handoff) gateErrors.push('A handoff record must be created before marking as handed_off')
      }

      if (statusName === 'done' || statusName === 'complete' || statusName === 'completed') {
        const hasOutput = merged.completionNote || merged.outputDocId || merged.outputUrl
        if (!hasOutput) gateErrors.push('completionNote, outputDocId, or outputUrl is required to mark done')
      }

      // Soft gates — return warnings but allow bypass with { force: true }
      if (gateErrors.length > 0 && !body.force) {
        return NextResponse.json({
          success: false,
          gateBlocked: true,
          errors: gateErrors,
          hint: 'Pass force: true to bypass these gates'
        }, { status: 422 })
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
        // Accept description, notes, or body as aliases
        ...((body.description !== undefined || body.notes !== undefined || body.body !== undefined) && {
          description: body.description ?? body.notes ?? body.body
        }),
        ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId }),
        ...(body.botAssignee !== undefined && { botAssignee: body.botAssignee || null }),
        // Phase 2: Outcome fields
        ...(body.expectedOutcome !== undefined && { expectedOutcome: body.expectedOutcome || null }),
        ...(body.completionNote !== undefined && { completionNote: body.completionNote || null }),
        ...(body.outputUrl !== undefined && { outputUrl: body.outputUrl || null }),
        // Multi-agent OS fields
        ...(body.ownerAgent !== undefined && { ownerAgent: body.ownerAgent || null }),
        ...(body.reviewerAgent !== undefined && { reviewerAgent: body.reviewerAgent || null }),
        ...(body.handoffToAgent !== undefined && { handoffToAgent: body.handoffToAgent || null }),
        ...(body.requestedBy !== undefined && { requestedBy: body.requestedBy || null }),
        ...(body.taskType !== undefined && { taskType: body.taskType || null }),
        ...(body.decisionNeeded !== undefined && { decisionNeeded: Boolean(body.decisionNeeded) }),
        ...(body.decisionSummary !== undefined && { decisionSummary: body.decisionSummary || null }),
        ...(body.waitingOn !== undefined && { waitingOn: body.waitingOn || null }),
        ...(body.blockedReason !== undefined && { blockedReason: body.blockedReason || null }),
        ...(body.definitionOfDone !== undefined && { definitionOfDone: body.definitionOfDone || null }),
        ...(body.nextAction !== undefined && { nextAction: body.nextAction || null }),
        ...(body.dependencyIds !== undefined && { dependencyIds: body.dependencyIds }),
        ...(body.outputDocId !== undefined && { outputDocId: body.outputDocId || null }),
        // Context linking
        ...(body.companyId !== undefined && { companyId: body.companyId || null }),
        ...(body.projectId !== undefined && { projectId: body.projectId || null }),
        ...(body.objectiveId !== undefined && { objectiveId: body.objectiveId || null }),
        ...(body.goalId !== undefined && { goalId: body.goalId || null }),
      },
      include: {
        tags: {
          include: { tag: true }
        },
        goal: true
      }
    })

    console.log(`[API:tasks/${taskId}] Task updated successfully`)

    // Agent wakeup — fires when ownerAgent is newly assigned or changed
    const prevOwner = existingTask.ownerAgent ?? null
    const newOwner  = updatedTask.ownerAgent  ?? null
    if (body.ownerAgent !== undefined && newOwner && newOwner !== prevOwner) {
      wakeupAgent({
        workspaceId:  updatedTask.workspaceId,
        toAgent:      newOwner,
        taskId:       updatedTask.id,
        taskTitle:    updatedTask.title,
        fromAgent:    auth.valid ? (auth.assistant ?? 'system') : 'ben',
        reason:       'task_assigned',
        companyId:    updatedTask.companyId  ?? undefined,
        projectId:    updatedTask.projectId  ?? undefined,
      }).catch(() => {})
    }

    // Context propagation — fires when a task is marked done
    // Writes AIMemory entries for dependent tasks (fire-and-forget, never blocks response)
    const isNowComplete = updatedTask.completedAt !== null && body.completedAt !== undefined
    if (isNowComplete) {
      // P1 completion alert — immediately notify Ben for priority 1 tasks
      if (updatedTask.priority === 1) {
        const agent     = updatedTask.ownerAgent ?? 'an agent'
        const space     = (updatedTask as any).company?.name ?? null
        const outputRef = updatedTask.outputUrl ?? updatedTask.outputDocId ?? null
        prisma.agentMessage.create({
          data: {
            workspaceId:    updatedTask.workspaceId,
            threadId:       '',
            fromAgent:      'system',
            toAgent:        'ben',
            subject:        `✅ P1 complete: ${updatedTask.title}`,
            body:           [
              `${agent.charAt(0).toUpperCase() + agent.slice(1)} just marked a Priority 1 task as done:`,
              `"${updatedTask.title}"${space ? ` · ${space}` : ''}`,
              updatedTask.completionNote ? `\nNote: ${updatedTask.completionNote}` : '',
              outputRef ? `\nOutput: ${outputRef}` : '',
            ].filter(Boolean).join('\n'),
            taskId:         updatedTask.id,
            companyId:      updatedTask.companyId ?? null,
            projectId:      updatedTask.projectId ?? null,
            actionRequired: false,
          },
        }).then(async (msg) => {
          await prisma.agentMessage.update({ where: { id: msg.id }, data: { threadId: msg.id } })
          await prisma.activityLog.create({
            data: {
              workspaceId:  updatedTask.workspaceId,
              eventType:    'agent_message',
              eventPayload: {
                messageId:       msg.id,
                threadId:        msg.id,
                fromAgent:       'system',
                toAgent:         'ben',
                subject:         msg.subject,
                bodyPreview:     msg.body.slice(0, 200),
                actionRequired:  false,
                p1Completion:    true,
                completedBy:     agent,
              },
              createdBy: '00000000-0000-0000-0000-000000000000',
              aiAgent:   agent,
              taskId:    updatedTask.id,
              companyId: updatedTask.companyId ?? null,
              projectId: updatedTask.projectId ?? null,
            },
          })
        }).catch(() => {})
      }

      propagateTaskCompletion({
        id: updatedTask.id,
        workspaceId: updatedTask.workspaceId,
        title: updatedTask.title,
        ownerAgent: updatedTask.ownerAgent ?? null,
        completionNote: updatedTask.completionNote ?? null,
        outputUrl: updatedTask.outputUrl ?? null,
        outputDocId: updatedTask.outputDocId ?? null,
        companyId: updatedTask.companyId ?? null,
        projectId: updatedTask.projectId ?? null,
        objectiveId: updatedTask.objectiveId ?? null,
        dependencyIds: updatedTask.dependencyIds ?? [],
      }).catch(err => console.error('[propagation] failed:', err))
    }

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
        companyId: updatedTask.companyId || undefined,
        objectiveId: updatedTask.objectiveId || undefined,
        assigneeId: updatedTask.assigneeId || undefined,
        botAssignee: updatedTask.botAssignee || undefined,
        // Outcome fields
        expectedOutcome: updatedTask.expectedOutcome || undefined,
        completionNote: updatedTask.completionNote || undefined,
        outputUrl: updatedTask.outputUrl || undefined,
        // Multi-agent OS fields
        ownerAgent: updatedTask.ownerAgent || undefined,
        reviewerAgent: updatedTask.reviewerAgent || undefined,
        handoffToAgent: updatedTask.handoffToAgent || undefined,
        requestedBy: updatedTask.requestedBy || undefined,
        taskType: updatedTask.taskType || undefined,
        decisionNeeded: updatedTask.decisionNeeded,
        decisionSummary: updatedTask.decisionSummary || undefined,
        waitingOn: updatedTask.waitingOn || undefined,
        blockedReason: updatedTask.blockedReason || undefined,
        definitionOfDone: updatedTask.definitionOfDone || undefined,
        nextAction: updatedTask.nextAction || undefined,
        dependencyIds: updatedTask.dependencyIds,
        outputDocId: updatedTask.outputDocId || undefined,
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
