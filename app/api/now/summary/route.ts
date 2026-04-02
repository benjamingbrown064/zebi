import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspace } from '@/lib/workspace'

export const dynamic = 'force-dynamic'

const AGENTS = ['harvey', 'theo', 'doug', 'casper'] as const

/**
 * GET /api/now/summary
 *
 * Returns everything the Now screen needs in a single request:
 * - myQueue         Ben's personal task queue (tasks with no ownerAgent or assigneeId = ben)
 * - agentStatus     Per-agent: active, blocked, waitingOnBen, pendingHandoffs, decisionsNeeded
 * - needsAttention  Decisions needed, waiting on Ben, overdue, stale (48h+)
 * - recentWins      Tasks completed in the last 24h
 */
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await requireWorkspace()
    const now = new Date()
    const staleThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000)
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const [
      myQueueTasks,
      allActiveTasks,
      decisionTasks,
      waitingOnBenTasks,
      overdueTasks,
      staleTasks,
      pendingHandoffs,
      recentCompletions,
    ] = await Promise.all([
      // My Queue — Ben's tasks (no ownerAgent set, or explicitly assigned)
      prisma.task.findMany({
        where: {
          workspaceId,
          archivedAt: null,
          completedAt: null,
          ownerAgent: null,
        },
        orderBy: [{ priority: 'asc' }, { dueAt: 'asc' }, { createdAt: 'asc' }],
        take: 20,
        select: {
          id: true, title: true, priority: true, dueAt: true,
          taskType: true, waitingOn: true, decisionNeeded: true,
          company: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          status: { select: { name: true, type: true } },
        },
      }),

      // All active tasks for agent workload
      prisma.task.findMany({
        where: { workspaceId, archivedAt: null, completedAt: null },
        select: {
          id: true, title: true, priority: true, dueAt: true,
          ownerAgent: true, blockedReason: true, waitingOn: true,
          decisionNeeded: true, taskType: true, updatedAt: true,
          company: { select: { id: true, name: true } },
          status: { select: { name: true, type: true } },
        },
      }),

      // Decisions needed — any agent
      prisma.task.findMany({
        where: { workspaceId, archivedAt: null, completedAt: null, decisionNeeded: true },
        orderBy: { priority: 'asc' },
        take: 10,
        select: {
          id: true, title: true, priority: true, ownerAgent: true,
          decisionSummary: true, dueAt: true,
          company: { select: { id: true, name: true } },
        },
      }),

      // Waiting on Ben
      prisma.task.findMany({
        where: { workspaceId, archivedAt: null, completedAt: null, waitingOn: 'ben' },
        orderBy: { priority: 'asc' },
        take: 10,
        select: {
          id: true, title: true, priority: true, ownerAgent: true,
          blockedReason: true, dueAt: true,
          company: { select: { id: true, name: true } },
        },
      }),

      // Overdue tasks
      prisma.task.findMany({
        where: {
          workspaceId, archivedAt: null, completedAt: null,
          dueAt: { lt: now },
        },
        orderBy: { dueAt: 'asc' },
        take: 10,
        select: {
          id: true, title: true, priority: true, dueAt: true,
          ownerAgent: true,
          company: { select: { id: true, name: true } },
          status: { select: { name: true } },
        },
      }),

      // Stale tasks — not updated in 48h
      prisma.task.findMany({
        where: {
          workspaceId, archivedAt: null, completedAt: null,
          NOT: { ownerAgent: null },
          updatedAt: { lt: staleThreshold },
        },
        orderBy: { updatedAt: 'asc' },
        take: 10,
        select: {
          id: true, title: true, ownerAgent: true, updatedAt: true,
          company: { select: { id: true, name: true } },
        },
      }),

      // Pending handoffs
      prisma.handoff.findMany({
        where: { workspaceId, status: 'pending' },
        orderBy: { createdAt: 'asc' },
        take: 20,
        select: {
          id: true, fromAgent: true, toAgent: true,
          summary: true, createdAt: true, decisionNeeded: true,
          taskId: true,
        },
      }),

      // Recent completions (last 24h)
      prisma.task.findMany({
        where: { workspaceId, completedAt: { gte: last24h } },
        orderBy: { completedAt: 'desc' },
        take: 10,
        select: {
          id: true, title: true, ownerAgent: true, completedAt: true,
          company: { select: { id: true, name: true } },
        },
      }),
    ])

    // Build per-agent status
    const agentStatus = AGENTS.map(agent => {
      const agentTasks = allActiveTasks.filter(t => t.ownerAgent === agent)
      const blocked = agentTasks.filter(t => !!t.blockedReason)
      const waitingOnBen = agentTasks.filter(t => t.waitingOn === 'ben')
      const decisions = agentTasks.filter(t => t.decisionNeeded)
      const myHandoffs = pendingHandoffs.filter(h => h.toAgent === agent)

      let statusSignal: 'active' | 'waiting' | 'blocked' = 'active'
      if (blocked.length > 0) statusSignal = 'blocked'
      else if (waitingOnBen.length > 0 || myHandoffs.length > 0) statusSignal = 'waiting'

      return {
        agent,
        status: statusSignal,
        activeCount: agentTasks.length,
        blockedCount: blocked.length,
        waitingOnBenCount: waitingOnBen.length,
        decisionsNeededCount: decisions.length,
        pendingHandoffsCount: myHandoffs.length,
        topTasks: agentTasks
          .filter(t => !t.blockedReason)
          .sort((a, b) => a.priority - b.priority)
          .slice(0, 2)
          .map(t => ({
            id: t.id,
            title: t.title,
            spaceName: t.company?.name || null,
            statusName: t.status?.name || null,
          })),
      }
    })

    // Dedupe needsAttention items
    const decisionIds = new Set(decisionTasks.map(t => t.id))
    const waitingIds = new Set(waitingOnBenTasks.map(t => t.id))
    const overdueNotDecision = overdueTasks.filter(t => !decisionIds.has(t.id) && !waitingIds.has(t.id))
    const staleNotOther = staleTasks.filter(t => !decisionIds.has(t.id) && !waitingIds.has(t.id))

    return NextResponse.json({
      myQueue: myQueueTasks.map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        dueAt: t.dueAt?.toISOString() || null,
        taskType: t.taskType,
        spaceName: t.company?.name || null,
        spaceId: t.company?.id || null,
        projectName: t.project?.name || null,
        statusName: t.status?.name || null,
        decisionNeeded: t.decisionNeeded,
      })),
      agentStatus,
      needsAttention: {
        decisions: decisionTasks.map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          ownerAgent: t.ownerAgent,
          decisionSummary: t.decisionSummary,
          dueAt: t.dueAt?.toISOString() || null,
          spaceName: t.company?.name || null,
        })),
        waitingOnBen: waitingOnBenTasks.map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          ownerAgent: t.ownerAgent,
          blockedReason: t.blockedReason,
          dueAt: t.dueAt?.toISOString() || null,
          spaceName: t.company?.name || null,
        })),
        overdue: overdueNotDecision.map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          dueAt: t.dueAt?.toISOString() || null,
          ownerAgent: t.ownerAgent,
          spaceName: t.company?.name || null,
        })),
        stale: staleNotOther.map(t => ({
          id: t.id,
          title: t.title,
          ownerAgent: t.ownerAgent,
          updatedAt: t.updatedAt.toISOString(),
          spaceName: t.company?.name || null,
        })),
      },
      recentWins: recentCompletions.map(t => ({
        id: t.id,
        title: t.title,
        ownerAgent: t.ownerAgent,
        completedAt: t.completedAt?.toISOString() || null,
        spaceName: t.company?.name || null,
      })),
      counts: {
        totalActive: allActiveTasks.length,
        totalDecisions: decisionTasks.length,
        totalWaitingOnBen: waitingOnBenTasks.length,
        totalOverdue: overdueTasks.length,
        totalStale: staleTasks.length,
        totalPendingHandoffs: pendingHandoffs.length,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Now] Failed to load summary:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
