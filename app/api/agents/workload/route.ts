import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'

export const dynamic = 'force-dynamic'

/**
 * GET /api/agents/workload?workspaceId=...
 *
 * Returns everything an agent needs to decide what to work on next.
 * Called at the start of each agent poll cycle.
 *
 * Returns:
 * - agent:          which agent this is for (from token)
 * - pendingHandoffs: handoffs addressed to this agent, status=pending
 * - unreadMessages:  bus messages addressed to this agent, unread
 * - actionRequired:  unread messages with actionRequired=true
 * - readyTasks:      tasks owned by this agent, not done, not blocked
 * - blockedTasks:    tasks owned by this agent that are blocked
 * - queueItem:       next work queue item (claimed immediately if available)
 * - hasWork:         boolean — quick check if there's anything to do
 * - summary:         human-readable summary for agent reasoning
 */
export async function GET(request: NextRequest) {
  const auth = validateAIAuth(request)
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const wid = request.nextUrl.searchParams.get('workspaceId')
  if (!wid) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })

  const agent = auth.assistant!
  const now   = new Date()

  // Ping heartbeat automatically
  await prisma.agentHeartbeat.upsert({
    where:  { workspaceId_agent: { workspaceId: wid, agent } },
    create: { workspaceId: wid, agent, lastSeenAt: now, event: 'poll' },
    update: { lastSeenAt: now, event: 'poll' },
  }).catch(() => {})

  const [
    pendingHandoffs,
    unreadMessages,
    allTasks,
    queueItem,
  ] = await Promise.all([

    prisma.handoff.findMany({
      where: { workspaceId: wid, toAgent: agent, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, fromAgent: true, summary: true,
        requestedOutcome: true, remainingWork: true,
        taskId: true, decisionNeeded: true, createdAt: true,
      },
    }),

    prisma.agentMessage.findMany({
      where: {
        workspaceId: wid,
        readAt: null,
        OR: [{ toAgent: agent }, { toAgent: 'all' }],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, threadId: true, fromAgent: true, toAgent: true,
        subject: true, body: true, taskId: true,
        actionRequired: true, actionDeadline: true, createdAt: true,
      },
    }),

    prisma.task.findMany({
      where: {
        workspaceId: wid,
        ownerAgent: agent,
        completedAt: null,
        archivedAt: null,
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      take: 20,
      select: {
        id: true, title: true, priority: true, taskType: true,
        blockedReason: true, waitingOn: true, decisionNeeded: true,
        definitionOfDone: true, expectedOutcome: true, nextAction: true,
        dueAt: true, companyId: true, projectId: true,
        company: { select: { name: true } },
      },
    }),

    // Claim next queue item
    (async () => {
      // Release stuck jobs first
      const stuckBefore = new Date(now.getTime() - 30 * 60 * 1000)
      await prisma.aIWorkQueue.updateMany({
        where: {
          workspaceId: wid, completedAt: null,
          claimedAt: { not: null, lt: stuckBefore },
          retryCount: { lt: 3 },
        },
        data: { claimedAt: null, claimedBy: null, retryCount: { increment: 1 } },
      })

      const item = await prisma.aIWorkQueue.findFirst({
        where: {
          workspaceId: wid,
          completedAt: null,
          claimedAt: null,
          scheduledFor: { lte: now },
          retryCount: { lt: 3 },
        },
        orderBy: [{ priority: 'asc' }, { scheduledFor: 'asc' }],
      })
      if (!item) return null
      const assignedTo = (item.contextData as any)?.assignedTo
      if (assignedTo && assignedTo !== agent) return null
      const updated = await prisma.aIWorkQueue.updateMany({
        where: { id: item.id, claimedAt: null },
        data:  { claimedAt: now, claimedBy: agent },
      })
      if (updated.count === 0) return null
      return await prisma.aIWorkQueue.findUnique({ where: { id: item.id } })
    })(),
  ])

  const readyTasks   = allTasks.filter(t => !t.blockedReason && t.waitingOn !== 'ben' && t.waitingOn !== 'external')
  const blockedTasks = allTasks.filter(t => t.blockedReason || t.waitingOn === 'ben' || t.waitingOn === 'external')
  const actionMessages = unreadMessages.filter(m => m.actionRequired)

  const hasWork = pendingHandoffs.length > 0 || actionMessages.length > 0 ||
                  readyTasks.length > 0 || queueItem !== null

  // Build a plain-text summary the agent can reason from
  const summaryLines: string[] = [`Agent: ${agent} | Poll: ${now.toISOString()}`]

  if (pendingHandoffs.length > 0) {
    summaryLines.push(`\nPENDING HANDOFFS (${pendingHandoffs.length}) — accept these first:`)
    for (const h of pendingHandoffs) {
      summaryLines.push(`  • [${h.id.slice(0,8)}] From ${h.fromAgent}: ${h.summary}`)
      summaryLines.push(`    Outcome needed: ${h.requestedOutcome}`)
      if (h.taskId) summaryLines.push(`    Linked task: ${h.taskId}`)
    }
  }

  if (actionMessages.length > 0) {
    summaryLines.push(`\nMESSAGES REQUIRING ACTION (${actionMessages.length}):`)
    for (const m of actionMessages) {
      summaryLines.push(`  • From ${m.fromAgent}: ${m.subject ?? m.body.slice(0, 80)}`)
      if (m.taskId) summaryLines.push(`    Task: ${m.taskId}`)
    }
  }

  if (unreadMessages.length > actionMessages.length) {
    const infoOnly = unreadMessages.filter(m => !m.actionRequired)
    summaryLines.push(`\nUNREAD MESSAGES (${infoOnly.length} info, no action needed):`)
    for (const m of infoOnly) {
      summaryLines.push(`  • From ${m.fromAgent}: ${m.body.slice(0, 80)}`)
    }
  }

  if (queueItem) {
    const ctx = queueItem.contextData as any
    summaryLines.push(`\nWORK QUEUE ITEM CLAIMED:`)
    summaryLines.push(`  • [${queueItem.id.slice(0,8)}] ${ctx?.title ?? queueItem.queueType}`)
    if (ctx?.description) summaryLines.push(`    ${ctx.description}`)
  }

  if (readyTasks.length > 0) {
    summaryLines.push(`\nYOUR READY TASKS (${readyTasks.length}):`)
    for (const t of readyTasks) {
      const space = t.company?.name ? ` [${t.company.name}]` : ''
      const due = t.dueAt ? ` due ${new Date(t.dueAt).toLocaleDateString('en-GB')}` : ''
      summaryLines.push(`  • [${t.id.slice(0,8)}] P${t.priority} ${t.title}${space}${due}`)
      if (t.nextAction) summaryLines.push(`    Next: ${t.nextAction}`)
      if (t.definitionOfDone) summaryLines.push(`    Done when: ${t.definitionOfDone}`)
    }
  }

  if (blockedTasks.length > 0) {
    summaryLines.push(`\nYOUR BLOCKED TASKS (${blockedTasks.length}) — cannot work on these:`)
    for (const t of blockedTasks) {
      summaryLines.push(`  • ${t.title} — ${t.blockedReason ?? `waiting on ${t.waitingOn}`}`)
    }
  }

  if (!hasWork) {
    summaryLines.push('\nNO WORK AVAILABLE — all tasks blocked or queue empty.')
  }

  return NextResponse.json({
    success:         true,
    agent,
    polledAt:        now.toISOString(),
    hasWork,
    pendingHandoffs,
    unreadMessages,
    actionMessages,
    readyTasks,
    blockedTasks,
    queueItem,
    counts: {
      pendingHandoffs: pendingHandoffs.length,
      unreadMessages:  unreadMessages.length,
      actionMessages:  actionMessages.length,
      readyTasks:      readyTasks.length,
      blockedTasks:    blockedTasks.length,
      queueItem:       queueItem ? 1 : 0,
    },
    summary: summaryLines.join('\n'),
  })
}
