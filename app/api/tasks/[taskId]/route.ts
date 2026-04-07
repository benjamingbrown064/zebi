import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspace } from '@/lib/workspace'
import { validateAIAuth } from '@/lib/doug-auth'
import { getAffectedObjectives } from '@/lib/objective-progress'
import { queueMultipleRecalculations } from '@/lib/progress-queue'
import { propagateTaskCompletion } from '@/lib/context-propagation'
import { wakeupAgent } from '@/lib/agent-wakeup'


export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const auth = validateAIAuth(request)
    const { searchParams } = new URL(request.url)

    let workspaceId: string
    if (auth.valid) {
      const wid = searchParams.get('workspaceId')
      if (!wid) {
        return NextResponse.json(
          { success: false, error: 'workspaceId is required when using API token' },
          { status: 400 }
        )
      }
      workspaceId = wid
    } else {
      workspaceId = await requireWorkspace()
    }

    const { taskId } = params

    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId },
      include: {
        status: true,
        tags: {
          include: { tag: true }
        },
        goal: true,
        company: true,
        project: true,
        objective: true,
      }
    })

    // Fetch dependency task objects if any
    const dependencyTasks = task && task.dependencyIds.length > 0
      ? await prisma.task.findMany({
          where: { id: { in: task.dependencyIds } },
          include: { status: true },
          orderBy: { createdAt: 'asc' },
        })
      : []

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        description: task.description || undefined,
        priority: task.priority,
        status: task.status.name,
        statusId: task.statusId,
        dueAt: task.dueAt?.toISOString(),
        plannedDate: task.plannedDate?.toISOString(),
        completedAt: task.completedAt?.toISOString(),
        archivedAt: task.archivedAt?.toISOString(),
        tags: task.tags.map(tt => tt.tag.name),
        goal: task.goal || undefined,
        goalId: task.goalId || undefined,
        company: task.company || undefined,
        companyId: task.companyId || undefined,
        project: task.project || undefined,
        projectId: task.projectId || undefined,
        objective: task.objective || undefined,
        objectiveId: task.objectiveId || undefined,
        assigneeId: task.assigneeId || undefined,
        botAssignee: task.botAssignee || undefined,
        // Outcome fields
        expectedOutcome: task.expectedOutcome || undefined,
        completionNote: task.completionNote || undefined,
        outputUrl: task.outputUrl || undefined,
        // Multi-agent OS fields
        ownerAgent: task.ownerAgent || undefined,
        reviewerAgent: task.reviewerAgent || undefined,
        handoffToAgent: task.handoffToAgent || undefined,
        requestedBy: task.requestedBy || undefined,
        taskType: task.taskType || undefined,
        decisionNeeded: task.decisionNeeded,
        decisionSummary: task.decisionSummary || undefined,
        waitingOn: task.waitingOn || undefined,
        blockedReason: task.blockedReason || undefined,
        definitionOfDone: task.definitionOfDone || undefined,
        nextAction: task.nextAction || undefined,
        dependencyIds: task.dependencyIds,
        dependencies: dependencyTasks.map(d => ({
          id: d.id,
          title: d.title,
          statusId: d.statusId,
          status: d.status.name,
          isDone: d.status.name.toLowerCase() === 'done',
        })),
        outputDocId: task.outputDocId || undefined,
        workspaceId: task.workspaceId,
        createdBy: task.createdBy,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      }
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`[API:tasks/GET ${params.taskId}]`, errorMsg)
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 })
  }
}


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
        skillId:              body.skillId              ?? existingTask.skillId,
        skipEvaluation:       body.skipEvaluation       ?? (existingTask as any).skipEvaluation ?? false,
        skipEvaluationReason: body.skipEvaluationReason ?? (existingTask as any).skipEvaluationReason ?? null,
        dependencyIds:        body.dependencyIds        ?? existingTask.dependencyIds ?? [],
      }

      // Normalise status name for gate matching
      const statusName = status.name.toLowerCase().replace(/[\s-]+/g, '_')
      const gateErrors: string[] = []

      // ── Gate: Inbox → To-Do (no requirements, free transition) ──────────

      // ── Gate: → Doing ────────────────────────────────────────────────────
      if (statusName === 'doing' || statusName === 'in_progress') {
        if (!merged.ownerAgent)
          gateErrors.push('ownerAgent is required before starting work — which agent owns this?')
        if (!merged.expectedOutcome && !merged.definitionOfDone)
          gateErrors.push('expectedOutcome or definitionOfDone is required before starting work')

        // Dependency gate — all prerequisites must be Done
        if (merged.dependencyIds && merged.dependencyIds.length > 0 && !body.force) {
          const deps = await prisma.task.findMany({
            where: { id: { in: merged.dependencyIds } },
            include: { status: true },
          })
          const incomplete = deps.filter(d => d.status.name.toLowerCase() !== 'done')
          if (incomplete.length > 0) {
            gateErrors.push(
              'Cannot start: ' + incomplete.length + ' prerequisite task(s) are not yet Done: ' +
              incomplete.map(d => `"${d.title}" (${d.status.name})`).join(', ')
            )
          }
        }
      }

      // ── Gate: → Review ───────────────────────────────────────────────────
      // Agents move tasks here when done. Requires full completion evidence.
      if (statusName === 'review') {
        if (!merged.completionNote)
          gateErrors.push('completionNote is required — write exactly what was done and what the outcome is')
        if (!merged.outputDocId && !merged.outputUrl && !merged.completionNote)
          gateErrors.push('outputUrl or outputDocId is required — link to the deliverable or output')
        if (!merged.ownerAgent)
          gateErrors.push('ownerAgent is required on tasks moved to Review')

        // Skill evaluation gate
        if (merged.skillId && !body.force) {
          if (body.skipEvaluation) {
            // Bypass allowed only with a valid reason
            const validReasons = ['wrong_skill_linked','skill_obsolete','admin_or_trivial_task','emergency_override','reviewer_requested_bypass']
            if (!body.skipEvaluationReason || !validReasons.includes(body.skipEvaluationReason)) {
              gateErrors.push('skipEvaluationReason is required when bypassing evaluation. Valid values: ' + validReasons.join(', '))
            }
          } else {
            const existingEval = await prisma.skillEvaluation.findFirst({
              where: { taskId, skillId: merged.skillId }
            })
            if (!existingEval) {
              gateErrors.push('A skill evaluation is required. Submit via POST /api/skills/' + merged.skillId + '/evaluate with taskId, or pass skipEvaluation: true with skipEvaluationReason to bypass.')
            }
          }
        }
      }

      // ── Gate: → Done ─────────────────────────────────────────────────────
      // Done is set by Benjamin only. Agents must not move tasks to Done.
      if (statusName === 'done' || statusName === 'complete' || statusName === 'completed') {
        const hasOutput = merged.completionNote || merged.outputDocId || merged.outputUrl
        if (!hasOutput) gateErrors.push('completionNote or output link is required to mark done')
      }

      // ── Gate: → handed_off ───────────────────────────────────────────────
      if (statusName === 'handed_off' || statusName === 'handoff') {
        if (!merged.handoffToAgent) gateErrors.push('handoffToAgent is required for a handoff')
        const handoff = await prisma.handoff.findFirst({
          where: { taskId, workspaceId, status: { in: ['pending', 'accepted'] } }
        })
        if (!handoff) gateErrors.push('A handoff record must be created before marking as handed_off')
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
        // Skill linking
        ...(body.skillId !== undefined && { skillId: body.skillId || null }),
        ...(body.skipEvaluation !== undefined && { skipEvaluation: Boolean(body.skipEvaluation) }),
        ...(body.skipEvaluationReason !== undefined && { skipEvaluationReason: body.skipEvaluationReason || null }),
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

      // Downstream dependency recheck — log which tasks just became unblocked
      prisma.task.findMany({
        where: {
          workspaceId: updatedTask.workspaceId,
          dependencyIds: { has: updatedTask.id },
          archivedAt: null,
        },
        include: { status: true },
      }).then(async (downstream) => {
        for (const dt of downstream) {
          // Check if ALL deps are now done
          const deps = await prisma.task.findMany({
            where: { id: { in: dt.dependencyIds } },
            include: { status: true },
          })
          const allDone = deps.every(d => d.status.name.toLowerCase() === 'done')
          if (allDone) {
            console.log(`[deps] Task "${dt.title}" is now unblocked — all prerequisites done`)
            await prisma.activityLog.create({
              data: {
                workspaceId: updatedTask.workspaceId,
                eventType: 'task_unblocked',
                eventPayload: { taskId: dt.id, taskTitle: dt.title, unlockedBy: updatedTask.id },
                createdBy: '00000000-0000-0000-0000-000000000000',
                aiAgent: updatedTask.ownerAgent ?? null,
                taskId: dt.id,
                companyId: dt.companyId ?? null,
              },
            }).catch(() => {})
          }
        }
      }).catch(() => {})
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
