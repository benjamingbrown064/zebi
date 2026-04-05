import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspace } from '@/lib/workspace'

export const dynamic = 'force-dynamic'

// Per-workspace in-memory cache — 60s TTL
const summaryCache = new Map<string, { data: any; expiresAt: number }>()
const SUMMARY_TTL = 60 * 1000

const AGENTS = ['harvey', 'theo', 'doug', 'casper'] as const

// How long until an agent is considered "stale" / idle based on heartbeat
const AGENT_ACTIVE_THRESHOLD_MS  = 10 * 60 * 1000  // 10 min  → ACTIVE
const AGENT_IDLE_THRESHOLD_MS    = 60 * 60 * 1000  // 1 hour  → IDLE
// Beyond 1 hour with no ping → OFFLINE

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await requireWorkspace()

    const cached = summaryCache.get(workspaceId)
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(cached.data)
    }

    const now = new Date()
    const staleThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000)
    const last24h        = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const [
      myQueueTasks,
      allActiveTasks,
      decisionTasks,
      waitingOnBenTasks,
      overdueTasks,
      staleTasks,
      pendingHandoffs,
      recentCompletions,
      agentHeartbeats,
    ] = await Promise.all([
      // My Queue — Ben's tasks (no ownerAgent set)
      prisma.task.findMany({
        where: { workspaceId, archivedAt: null, completedAt: null, ownerAgent: null },
        orderBy: [{ priority: 'asc' }, { dueAt: 'asc' }, { createdAt: 'asc' }],
        take: 20,
        select: {
          id: true, title: true, priority: true, dueAt: true,
          taskType: true, waitingOn: true, decisionNeeded: true, ownerAgent: true,
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

      // Decisions needed
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

      // Overdue
      prisma.task.findMany({
        where: { workspaceId, archivedAt: null, completedAt: null, dueAt: { lt: now } },
        orderBy: { dueAt: 'asc' },
        take: 10,
        select: {
          id: true, title: true, priority: true, dueAt: true,
          ownerAgent: true,
          company: { select: { id: true, name: true } },
          status: { select: { name: true } },
        },
      }),

      // Stale (not updated in 48h)
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
          summary: true, createdAt: true, decisionNeeded: true, taskId: true,
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

      // ── Real agent heartbeats ──────────────────────────────────────────────
      prisma.agentHeartbeat.findMany({
        where: { workspaceId },
        select: {
          agent: true,
          lastSeenAt: true,
          event: true,
          currentTaskId: true,
          currentTaskTitle: true,
        },
      }),
    ])

    // Build a quick lookup: agent → heartbeat row
    const hbMap = new Map(agentHeartbeats.map(h => [h.agent, h]))

    // Build per-agent status — heartbeat takes priority over task inference
    const agentStatus = AGENTS.map(agent => {
      const agentTasks   = allActiveTasks.filter(t => t.ownerAgent === agent)
      const blocked      = agentTasks.filter(t => !!t.blockedReason)
      const waitingOnBen = agentTasks.filter(t => t.waitingOn === 'ben')
      const decisions    = agentTasks.filter(t => t.decisionNeeded)
      const myHandoffs   = pendingHandoffs.filter(h => h.toAgent === agent)

      const hb = hbMap.get(agent)
      const msSinceLastSeen = hb
        ? now.getTime() - new Date(hb.lastSeenAt).getTime()
        : null

      // Determine online presence from heartbeat
      let presenceSignal: 'online' | 'idle' | 'offline' =
        msSinceLastSeen === null
          ? 'offline'
          : msSinceLastSeen <= AGENT_ACTIVE_THRESHOLD_MS
          ? 'online'
          : msSinceLastSeen <= AGENT_IDLE_THRESHOLD_MS
          ? 'idle'
          : 'offline'

      // Determine work status from task data
      let workSignal: 'active' | 'waiting' | 'blocked' = 'active'
      if (blocked.length > 0) workSignal = 'blocked'
      else if (waitingOnBen.length > 0 || myHandoffs.length > 0) workSignal = 'waiting'

      // Combined status label shown in UI
      // If offline/idle — show that. If online — show work signal.
      let statusSignal: 'active' | 'waiting' | 'blocked' | 'idle' | 'offline' =
        presenceSignal === 'offline'
          ? 'offline'
          : presenceSignal === 'idle'
          ? 'idle'
          : workSignal  // 'active' | 'waiting' | 'blocked'

      return {
        agent,
        // UI-facing combined status
        status: statusSignal,
        // Presence info for "last seen" display
        lastSeenAt: hb?.lastSeenAt?.toISOString() ?? null,
        lastEvent: hb?.event ?? null,
        currentTaskId: hb?.currentTaskId ?? null,
        currentTaskTitle: hb?.currentTaskTitle ?? null,
        // Task counts
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

    const decisionIds = new Set(decisionTasks.map(t => t.id))
    const waitingIds  = new Set(waitingOnBenTasks.map(t => t.id))
    const overdueNotDecision = overdueTasks.filter(t => !decisionIds.has(t.id) && !waitingIds.has(t.id))
    const staleNotOther      = staleTasks.filter(t => !decisionIds.has(t.id) && !waitingIds.has(t.id))

    const responseData = {
      myQueue: myQueueTasks.map(t => ({
        id: t.id, title: t.title, priority: t.priority,
        dueAt: t.dueAt?.toISOString() || null, taskType: t.taskType,
        spaceName: t.company?.name || null, spaceId: t.company?.id || null,
        projectName: t.project?.name || null, statusName: t.status?.name || null,
        decisionNeeded: t.decisionNeeded, ownerAgent: (t as any).ownerAgent || null,
      })),
      agentStatus,
      needsAttention: {
        decisions: decisionTasks.map(t => ({
          id: t.id, title: t.title, priority: t.priority, ownerAgent: t.ownerAgent,
          decisionSummary: t.decisionSummary, dueAt: t.dueAt?.toISOString() || null,
          spaceName: t.company?.name || null,
        })),
        waitingOnBen: waitingOnBenTasks.map(t => ({
          id: t.id, title: t.title, priority: t.priority, ownerAgent: t.ownerAgent,
          blockedReason: t.blockedReason, dueAt: t.dueAt?.toISOString() || null,
          spaceName: t.company?.name || null,
        })),
        overdue: overdueNotDecision.map(t => ({
          id: t.id, title: t.title, priority: t.priority,
          dueAt: t.dueAt?.toISOString() || null, ownerAgent: t.ownerAgent,
          spaceName: t.company?.name || null,
        })),
        stale: staleNotOther.map(t => ({
          id: t.id, title: t.title, ownerAgent: t.ownerAgent,
          updatedAt: t.updatedAt.toISOString(), spaceName: t.company?.name || null,
        })),
      },
      recentWins: recentCompletions.map(t => ({
        id: t.id, title: t.title, ownerAgent: t.ownerAgent,
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
    }

    summaryCache.set(workspaceId, { data: responseData, expiresAt: Date.now() + SUMMARY_TTL })
    return NextResponse.json(responseData)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Now] Failed to load summary:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
