// GET  /api/tasks — paginated task list (agent + session auth)
// POST /api/tasks — create a task (canonical alias for /api/tasks/direct)
//
// Auth: validateAIAuth (agent bearer token) OR requireWorkspace (session cookie)
//
// GET query params:
//   workspaceId       required for agent auth; inferred from session otherwise
//   ownerAgent        "doug" | "harvey" | "casper" | "theo"
//   status            status name, case-insensitive (e.g. "doing", "blocked")
//   statusId          exact status UUID
//   priority          1–5
//   limit             default 50, max 200
//   offset            default 0
//   search            title contains (case-insensitive)
//   companyId         filter by space/company
//   projectId         filter by project
//   objectiveId       filter by objective
//   includeArchived   "true" to include archived tasks (default false)
//   includeCompleted  "true" to include completed tasks (default false)
//   decisionNeeded    "true" to filter tasks requiring a decision
//   waitingOn         "ben" | "harvey" | "doug" | etc.
//   taskType          "build" | "research" | "ops" | etc.
//   sort              "priority" | "dueAt" | "createdAt" | "updatedAt" | "title"
//                     prefix with "-" for descending, e.g. "-priority"

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspace } from '@/lib/workspace'
import { validateAIAuth } from '@/lib/doug-auth'
import { wakeupAgent } from '@/lib/agent-wakeup'

export const dynamic = 'force-dynamic'

// Shared task shape for list responses (matches individual GET shape)
function serializeTask(t: any) {
  return {
    id:               t.id,
    title:            t.title,
    description:      t.description      || undefined,
    priority:         t.priority,
    status:           t.status?.name     || undefined,
    statusId:         t.statusId,
    dueAt:            t.dueAt?.toISOString(),
    plannedDate:      t.plannedDate?.toISOString(),
    completedAt:      t.completedAt?.toISOString(),
    archivedAt:       t.archivedAt?.toISOString(),
    tags:             (t.tags ?? []).map((tt: any) => tt.tag.name),
    // Relations
    space:            t.company   ? { id: t.company.id,    name: t.company.name }    : undefined,
    project:          t.project   ? { id: t.project.id,    name: t.project.name }    : undefined,
    objective:        t.objective ? { id: t.objective.id,  title: t.objective.title } : undefined,
    goal:             t.goal      ? { id: t.goal.id,       name: t.goal.name }       : undefined,
    companyId:        t.companyId    || undefined,
    projectId:        t.projectId    || undefined,
    objectiveId:      t.objectiveId  || undefined,
    goalId:           t.goalId       || undefined,
    assigneeId:       t.assigneeId   || undefined,
    botAssignee:      t.botAssignee  || undefined,
    // Outcome fields
    expectedOutcome:  t.expectedOutcome  || undefined,
    completionNote:   t.completionNote   || undefined,
    outputUrl:        t.outputUrl        || undefined,
    outputDocId:      t.outputDocId      || undefined,
    linkedDocIds:     t.linkedDocIds     ?? [],
    // Multi-agent OS fields
    ownerAgent:       t.ownerAgent       || undefined,
    reviewerAgent:    t.reviewerAgent    || undefined,
    handoffToAgent:   t.handoffToAgent   || undefined,
    requestedBy:      t.requestedBy      || undefined,
    taskType:         t.taskType         || undefined,
    decisionNeeded:   t.decisionNeeded,
    decisionSummary:  t.decisionSummary  || undefined,
    waitingOn:        t.waitingOn        || undefined,
    blockedReason:    t.blockedReason    || undefined,
    definitionOfDone: t.definitionOfDone || undefined,
    nextAction:       t.nextAction       || undefined,
    dependencyIds:    t.dependencyIds    ?? [],
    skillId:          t.skillId          || undefined,
    workspaceId:      t.workspaceId,
    createdBy:        t.createdBy,
    createdAt:        t.createdAt.toISOString(),
    updatedAt:        t.updatedAt.toISOString(),
  }
}

// ---------------------------------------------------------------------------
// GET /api/tasks
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
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
      try {
        workspaceId = await requireWorkspace()
      } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Pagination
    const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '50',  10), 200)
    const offset =          parseInt(searchParams.get('offset') ?? '0',   10)

    // Filters
    const ownerAgent     = searchParams.get('ownerAgent')
    const statusName     = searchParams.get('status')
    const statusId       = searchParams.get('statusId')
    const priority       = searchParams.get('priority')
    const search         = searchParams.get('search')
    const companyId      = searchParams.get('companyId')
    const projectId      = searchParams.get('projectId')
    const objectiveId    = searchParams.get('objectiveId')
    const waitingOn      = searchParams.get('waitingOn')
    const taskType       = searchParams.get('taskType')
    const decisionNeeded = searchParams.get('decisionNeeded')
    const includeArchived   = searchParams.get('includeArchived')   === 'true'
    const includeCompleted  = searchParams.get('includeCompleted')  === 'true'

    // Resolve statusId from name if provided
    let resolvedStatusId = statusId ?? undefined
    if (statusName && !resolvedStatusId) {
      const statusRow = await prisma.status.findFirst({
        where: {
          workspaceId,
          name: { equals: statusName, mode: 'insensitive' },
        },
      })
      if (statusRow) {
        resolvedStatusId = statusRow.id
      }
      // If name doesn't match, we still run the query — returns 0 results cleanly
    }

    // Sort
    const sortParam = searchParams.get('sort') ?? 'priority'
    const sortDesc  = sortParam.startsWith('-')
    const sortField = sortDesc ? sortParam.slice(1) : sortParam
    const validSorts: Record<string, any> = {
      priority:  [{ priority: 'asc' }, { createdAt: 'asc' }],
      dueAt:     [{ dueAt: sortDesc ? 'desc' : 'asc' }],
      createdAt: [{ createdAt: sortDesc ? 'desc' : 'asc' }],
      updatedAt: [{ updatedAt: sortDesc ? 'desc' : 'asc' }],
      title:     [{ title: sortDesc ? 'desc' : 'asc' }],
    }
    const orderBy = validSorts[sortField] ?? validSorts['priority']

    // Build where clause
    const where: any = { workspaceId }
    if (!includeArchived)  where.archivedAt  = null
    if (!includeCompleted) where.completedAt = null
    if (resolvedStatusId)  where.statusId    = resolvedStatusId
    if (ownerAgent)        where.ownerAgent  = ownerAgent
    if (priority)          where.priority    = parseInt(priority, 10)
    if (companyId)         where.companyId   = companyId
    if (projectId)         where.projectId   = projectId
    if (objectiveId)       where.objectiveId = objectiveId
    if (waitingOn)         where.waitingOn   = waitingOn
    if (taskType)          where.taskType    = taskType
    if (decisionNeeded === 'true') where.decisionNeeded = true
    if (search) where.title = { contains: search, mode: 'insensitive' }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          status:    true,
          tags:      { include: { tag: true } },
          company:   { select: { id: true, name: true } },
          project:   { select: { id: true, name: true } },
          objective: { select: { id: true, title: true } },
          goal:      { select: { id: true, name: true } },
        },
        orderBy,
        take:  limit,
        skip:  offset,
      }),
      prisma.task.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      total,
      limit,
      offset,
      hasMore: offset + tasks.length < total,
      tasks: tasks.map(serializeTask),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/tasks]', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST /api/tasks — canonical task creation (mirrors /api/tasks/direct)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const auth = validateAIAuth(request)
    const body = await request.json()

    let workspaceId: string
    if (auth.valid) {
      if (!body.workspaceId) {
        return NextResponse.json(
          { success: false, error: 'workspaceId is required when using API token' },
          { status: 400 }
        )
      }
      workspaceId = body.workspaceId
    } else {
      try {
        workspaceId = await requireWorkspace()
      } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }
    }

    const description = body.description ?? body.notes ?? body.body
    const {
      title, priority, dueAt, projectId, companyId, objectiveId, goalId,
      assigneeId, botAssignee, plannedDate, expectedOutcome,
      ownerAgent, reviewerAgent, handoffToAgent, requestedBy, taskType,
      decisionNeeded, decisionSummary, waitingOn, blockedReason,
      definitionOfDone, nextAction, dependencyIds, outputDocId,
      linkedDocIds, skillId,
    } = body

    if (!title?.trim()) {
      return NextResponse.json({ success: false, error: 'title is required' }, { status: 400 })
    }

    // Resolve statusId
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

    // Resolve createdBy
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
        title:   title.trim(),
        statusId,
        createdBy,
        ...(description      !== undefined && { description }),
        ...(priority         !== undefined && { priority: Number(priority) }),
        ...(dueAt                          && { dueAt: new Date(dueAt) }),
        ...(plannedDate                    && { plannedDate: new Date(plannedDate) }),
        ...(projectId                      && { projectId }),
        ...(companyId                      && { companyId }),
        ...(objectiveId                    && { objectiveId }),
        ...(goalId                         && { goalId }),
        ...(assigneeId                     && { assigneeId }),
        ...(botAssignee                    && { botAssignee }),
        ...(expectedOutcome                && { expectedOutcome }),
        ...(ownerAgent                     && { ownerAgent }),
        ...(reviewerAgent                  && { reviewerAgent }),
        ...(handoffToAgent                 && { handoffToAgent }),
        ...(requestedBy                    && { requestedBy }),
        ...(taskType                       && { taskType }),
        ...(decisionNeeded !== undefined   && { decisionNeeded: Boolean(decisionNeeded) }),
        ...(decisionSummary                && { decisionSummary }),
        ...(waitingOn                      && { waitingOn }),
        ...(blockedReason                  && { blockedReason }),
        ...(definitionOfDone               && { definitionOfDone }),
        ...(nextAction                     && { nextAction }),
        ...(dependencyIds                  && { dependencyIds }),
        ...(outputDocId                    && { outputDocId }),
        ...(linkedDocIds                   && { linkedDocIds }),
        ...(skillId                        && { skillId }),
      },
    })

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
        id:               task.id,
        title:            task.title,
        description:      task.description    || undefined,
        statusId:         task.statusId,
        priority:         task.priority,
        dueAt:            task.dueAt?.toISOString(),
        plannedDate:      task.plannedDate?.toISOString(),
        projectId:        task.projectId      || undefined,
        companyId:        task.companyId      || undefined,
        objectiveId:      task.objectiveId    || undefined,
        goalId:           task.goalId         || undefined,
        assigneeId:       task.assigneeId     || undefined,
        botAssignee:      task.botAssignee    || undefined,
        expectedOutcome:  task.expectedOutcome || undefined,
        ownerAgent:       task.ownerAgent     || undefined,
        reviewerAgent:    task.reviewerAgent   || undefined,
        handoffToAgent:   task.handoffToAgent  || undefined,
        requestedBy:      task.requestedBy    || undefined,
        taskType:         task.taskType       || undefined,
        decisionNeeded:   task.decisionNeeded,
        decisionSummary:  task.decisionSummary || undefined,
        waitingOn:        task.waitingOn      || undefined,
        blockedReason:    task.blockedReason  || undefined,
        definitionOfDone: task.definitionOfDone || undefined,
        nextAction:       task.nextAction     || undefined,
        dependencyIds:    task.dependencyIds,
        outputDocId:      task.outputDocId    || undefined,
        linkedDocIds:     task.linkedDocIds   ?? [],
        skillId:          task.skillId        || undefined,
        workspaceId:      task.workspaceId,
        createdBy:        task.createdBy,
        createdAt:        task.createdAt.toISOString(),
        updatedAt:        task.updatedAt.toISOString(),
      },
    }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/tasks]', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
