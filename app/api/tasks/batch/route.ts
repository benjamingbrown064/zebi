import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'

export const dynamic = 'force-dynamic'

/**
 * POST /api/tasks/batch
 *
 * Atomically create multiple tasks for one or more agents, with an optional
 * Handoff record linking the requesting agent to the receiving agents.
 *
 * Designed for Harvey spawning subtasks for Doug, Theo creating a build
 * list for Casper, etc.
 *
 * Request body:
 * {
 *   workspaceId: string
 *
 *   // Optional parent context — inherited by all tasks that don't override
 *   parentTaskId?:   string   // task this batch was spawned from
 *   companyId?:      string   // inherited by all tasks
 *   projectId?:      string   // inherited by all tasks
 *   objectiveId?:    string   // inherited by all tasks
 *   requestedBy?:    string   // "harvey" | "theo" | "doug" | "casper" | "ben"
 *
 *   // The tasks to create
 *   tasks: Array<{
 *     title:            string   // required
 *     ownerAgent?:      string   // "harvey" | "theo" | "doug" | "casper"
 *     taskType?:        string
 *     priority?:        number   // 1–5
 *     description?:     string
 *     definitionOfDone?: string
 *     expectedOutcome?: string
 *     nextAction?:      string
 *     dueAt?:           string   // ISO date
 *     dependsOnIndex?:  number   // index into THIS batch (0-based) to set as dependency
 *     dependencyIds?:   string[] // explicit existing task IDs
 *     // any other per-task overrides (companyId, projectId, objectiveId)
 *     companyId?:       string
 *     projectId?:       string
 *     objectiveId?:     string
 *   }>
 *
 *   // Optional: auto-create a Handoff record linking requestedBy → primary ownerAgent
 *   createHandoff?: boolean
 *   handoff?: {
 *     fromAgent:        string   // who is delegating
 *     toAgent:          string   // primary receiving agent
 *     summary:          string
 *     requestedOutcome: string
 *     completedWork?:   string
 *     remainingWork?:   string
 *     blockers?:        string
 *   }
 * }
 *
 * Response:
 * {
 *   success: true
 *   tasks: Task[]          // all created tasks, in order
 *   handoff?: Handoff      // created handoff (if requested)
 *   count: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = validateAIAuth(request)
    const body = await request.json()

    let workspaceId: string
    if (auth.valid) {
      if (!body.workspaceId) {
        return NextResponse.json({ success: false, error: 'workspaceId is required' }, { status: 400 })
      }
      workspaceId = body.workspaceId
    } else {
      workspaceId = await requireWorkspace()
    }

    const {
      tasks: taskDefs,
      parentTaskId,
      companyId:   parentCompanyId,
      projectId:   parentProjectId,
      objectiveId: parentObjectiveId,
      requestedBy,
      createHandoff,
      handoff: handoffDef,
    } = body

    // Validate
    if (!Array.isArray(taskDefs) || taskDefs.length === 0) {
      return NextResponse.json({ success: false, error: 'tasks array is required and must not be empty' }, { status: 400 })
    }
    if (taskDefs.length > 50) {
      return NextResponse.json({ success: false, error: 'Maximum 50 tasks per batch' }, { status: 400 })
    }
    for (let i = 0; i < taskDefs.length; i++) {
      if (!taskDefs[i].title?.trim()) {
        return NextResponse.json({ success: false, error: `tasks[${i}].title is required` }, { status: 400 })
      }
    }
    if (createHandoff && !handoffDef) {
      return NextResponse.json({ success: false, error: 'handoff object is required when createHandoff is true' }, { status: 400 })
    }
    if (createHandoff) {
      const required = ['fromAgent', 'toAgent', 'summary', 'requestedOutcome']
      for (const field of required) {
        if (!handoffDef[field]) {
          return NextResponse.json({ success: false, error: `handoff.${field} is required` }, { status: 400 })
        }
      }
    }

    // Resolve default status for the workspace
    const defaultStatus = await prisma.status.findFirst({
      where: { workspaceId },
      orderBy: { sortOrder: 'asc' },
    })
    if (!defaultStatus) {
      return NextResponse.json({ success: false, error: 'No statuses found for workspace' }, { status: 400 })
    }

    // Resolve createdBy
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    })
    const createdBy = workspace?.ownerId
    if (!createdBy) {
      return NextResponse.json({ success: false, error: 'Could not resolve workspace owner' }, { status: 400 })
    }

    // Build task data — we do two passes:
    // Pass 1: create all tasks (so we have their IDs)
    // Pass 2: resolve dependsOnIndex references and update dependencyIds

    // Pass 1: create all tasks
    const createdTasks = []
    for (const def of taskDefs) {
      const effectiveCompanyId   = def.companyId   ?? parentCompanyId   ?? null
      const effectiveProjectId   = def.projectId   ?? parentProjectId   ?? null
      const effectiveObjectiveId = def.objectiveId ?? parentObjectiveId ?? null

      const task = await prisma.task.create({
        data: {
          workspaceId,
          title:     def.title.trim(),
          statusId:  defaultStatus.id,
          createdBy,
          ...(def.description     !== undefined && { description:     def.description }),
          ...(def.priority        !== undefined && { priority:        Number(def.priority) }),
          ...(def.dueAt                         && { dueAt:           new Date(def.dueAt) }),
          ...(effectiveCompanyId                && { companyId:       effectiveCompanyId }),
          ...(effectiveProjectId                && { projectId:       effectiveProjectId }),
          ...(effectiveObjectiveId              && { objectiveId:     effectiveObjectiveId }),
          // Agent fields
          ...(def.ownerAgent       !== undefined && { ownerAgent:       def.ownerAgent || null }),
          ...(def.taskType         !== undefined && { taskType:         def.taskType }),
          ...(def.definitionOfDone !== undefined && { definitionOfDone: def.definitionOfDone }),
          ...(def.expectedOutcome  !== undefined && { expectedOutcome:  def.expectedOutcome }),
          ...(def.nextAction       !== undefined && { nextAction:       def.nextAction }),
          ...(requestedBy                        && { requestedBy }),
          ...(def.dependencyIds                  && { dependencyIds:    def.dependencyIds }),
          // Link to parent task if provided
          ...(parentTaskId && { dependencyIds: [...(def.dependencyIds ?? []), parentTaskId] }),
        },
      })
      createdTasks.push(task)
    }

    // Pass 2: resolve dependsOnIndex references
    const indexUpdates: Promise<unknown>[] = []
    for (let i = 0; i < taskDefs.length; i++) {
      const def = taskDefs[i]
      if (def.dependsOnIndex !== undefined && def.dependsOnIndex >= 0 && def.dependsOnIndex < createdTasks.length) {
        const depTaskId = createdTasks[def.dependsOnIndex].id
        const existing  = createdTasks[i].dependencyIds ?? []
        if (!existing.includes(depTaskId)) {
          indexUpdates.push(
            prisma.task.update({
              where: { id: createdTasks[i].id },
              data:  { dependencyIds: [...existing, depTaskId] },
            })
          )
        }
      }
    }
    const updated = await Promise.all(indexUpdates)

    // Merge any index-update results back into createdTasks for the response
    const updatedById: Record<string, any> = {}
    for (const u of updated as any[]) {
      if (u?.id) updatedById[u.id] = u
    }
    const finalTasks = createdTasks.map(t => updatedById[t.id] ?? t)

    // Create Handoff if requested
    let handoff = null
    if (createHandoff && handoffDef) {
      handoff = await prisma.handoff.create({
        data: {
          workspaceId,
          ...(parentTaskId && { taskId: parentTaskId }),
          ...(parentCompanyId  && { companyId:  parentCompanyId }),
          ...(parentProjectId  && { projectId:  parentProjectId }),
          fromAgent:        handoffDef.fromAgent,
          toAgent:          handoffDef.toAgent,
          summary:          handoffDef.summary,
          requestedOutcome: handoffDef.requestedOutcome,
          completedWork:    handoffDef.completedWork    ?? '',
          remainingWork:    handoffDef.remainingWork    ?? finalTasks.map(t => `- ${t.title}`).join('\n'),
          blockers:         handoffDef.blockers         ?? 'none',
          linkedDocIds:     finalTasks.map(t => t.id), // link all created tasks
        },
      })

      // Stamp handoffToAgent on parent task if provided
      if (parentTaskId) {
        await prisma.task.update({
          where: { id: parentTaskId },
          data:  { handoffToAgent: handoffDef.toAgent },
        }).catch(() => { /* parent task might not exist */ })
      }
    }

    return NextResponse.json({
      success: true,
      count: finalTasks.length,
      tasks: finalTasks.map(t => ({
        id:               t.id,
        title:            t.title,
        ownerAgent:       t.ownerAgent       || undefined,
        taskType:         t.taskType         || undefined,
        priority:         t.priority,
        statusId:         t.statusId,
        companyId:        t.companyId        || undefined,
        projectId:        t.projectId        || undefined,
        objectiveId:      t.objectiveId      || undefined,
        requestedBy:      t.requestedBy      || undefined,
        definitionOfDone: t.definitionOfDone || undefined,
        expectedOutcome:  t.expectedOutcome  || undefined,
        nextAction:       t.nextAction       || undefined,
        dependencyIds:    t.dependencyIds,
        createdAt:        t.createdAt.toISOString(),
      })),
      ...(handoff && { handoff }),
    }, { status: 201 })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API:tasks/batch]', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
