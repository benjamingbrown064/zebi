import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'

export const dynamic = 'force-dynamic'

/**
 * GET /api/founder/summary?workspaceId=...
 *
 * Returns a single consolidated founder-facing summary:
 * - topPriorities       Top 5 high-priority active tasks across all agents
 * - agentWorkloads      Task count + blocked count per ownerAgent
 * - blockedTasks        All tasks with a blockedReason, with owner + reason
 * - decisionInbox       Tasks where decisionNeeded=true
 * - waitingOnBen        Tasks where waitingOn="ben"
 * - recentCompletions   Tasks completed in the last 24h
 * - pendingHandoffs     Handoffs with status="pending", grouped by toAgent
 * - workflowHealth      Quick compliance metrics
 */

const AGENTS = ['harvey', 'theo', 'doug', 'casper'] as const

export async function GET(request: NextRequest) {
  try {
    const auth = validateAIAuth(request)
    let workspaceId: string
    if (auth.valid) {
      const wid = request.nextUrl.searchParams.get('workspaceId')
      if (!wid) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
      workspaceId = wid
    } else {
      workspaceId = await requireWorkspace()
    }

    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Run all queries in parallel
    const [
      topPriorityTasks,
      allActiveTasks,
      blockedTasks,
      decisionTasks,
      waitingOnBenTasks,
      recentCompletions,
      pendingHandoffs,
      // Workflow health counts
      noOwnerCount,
      doneNoOutputCount,
      stalledCount,
    ] = await Promise.all([
      // Top 5 high-priority active tasks (priority 1-2, or top 5 by priority)
      prisma.task.findMany({
        where: {
          workspaceId,
          archivedAt: null,
          completedAt: null,
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        take: 5,
        select: {
          id: true, title: true, priority: true, taskType: true,
          ownerAgent: true, waitingOn: true, decisionNeeded: true,
          blockedReason: true, dueAt: true, companyId: true, projectId: true,
          company: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      }),

      // All active tasks — for agent workload calculation
      prisma.task.findMany({
        where: { workspaceId, archivedAt: null, completedAt: null },
        select: {
          id: true,
          ownerAgent: true,
          blockedReason: true,
          waitingOn: true,
          decisionNeeded: true,
          taskType: true,
          priority: true,
        },
      }),

      // Blocked tasks with context
      prisma.task.findMany({
        where: {
          workspaceId,
          archivedAt: null,
          completedAt: null,
          NOT: { blockedReason: null },
        },
        orderBy: { priority: 'asc' },
        take: 20,
        select: {
          id: true, title: true, priority: true,
          ownerAgent: true, blockedReason: true, waitingOn: true,
          company: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      }),

      // Decision inbox
      prisma.task.findMany({
        where: { workspaceId, archivedAt: null, completedAt: null, decisionNeeded: true },
        orderBy: { priority: 'asc' },
        take: 20,
        select: {
          id: true, title: true, priority: true,
          ownerAgent: true, decisionSummary: true, requestedBy: true,
          company: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          createdAt: true,
        },
      }),

      // Waiting on Ben
      prisma.task.findMany({
        where: { workspaceId, archivedAt: null, completedAt: null, waitingOn: 'ben' },
        orderBy: { priority: 'asc' },
        take: 20,
        select: {
          id: true, title: true, priority: true,
          ownerAgent: true, nextAction: true, decisionSummary: true,
          company: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          updatedAt: true,
        },
      }),

      // Recent completions (last 24h)
      prisma.task.findMany({
        where: { workspaceId, completedAt: { gte: last24h } },
        orderBy: { completedAt: 'desc' },
        take: 20,
        select: {
          id: true, title: true, taskType: true,
          ownerAgent: true, completionNote: true, outputUrl: true, outputDocId: true,
          completedAt: true,
          company: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      }),

      // Pending handoffs
      prisma.handoff.findMany({
        where: { workspaceId, status: 'pending' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // Workflow health: active tasks with no owner
      prisma.task.count({
        where: { workspaceId, archivedAt: null, completedAt: null, ownerAgent: null },
      }),

      // Workflow health: done tasks with no completionNote and no outputDocId
      prisma.task.count({
        where: {
          workspaceId,
          archivedAt: null,
          NOT: { completedAt: null },
          completionNote: null,
          outputDocId: null,
        },
      }),

      // Workflow health: in-progress tasks not updated in 48h
      prisma.task.count({
        where: {
          workspaceId,
          archivedAt: null,
          completedAt: null,
          updatedAt: { lt: new Date(now.getTime() - 48 * 60 * 60 * 1000) },
        },
      }),
    ])

    // Build agent workloads from allActiveTasks
    const agentWorkloads = AGENTS.map(agent => {
      const agentTasks = allActiveTasks.filter(t => t.ownerAgent === agent)
      return {
        agent,
        totalActive:   agentTasks.length,
        blocked:       agentTasks.filter(t => t.blockedReason).length,
        decisionNeeded: agentTasks.filter(t => t.decisionNeeded).length,
        waitingOnBen:  agentTasks.filter(t => t.waitingOn === 'ben').length,
        highPriority:  agentTasks.filter(t => t.priority <= 2).length,
      }
    })

    // Group pending handoffs by toAgent
    const handoffsByAgent: Record<string, typeof pendingHandoffs> = {}
    for (const h of pendingHandoffs) {
      if (!handoffsByAgent[h.toAgent]) handoffsByAgent[h.toAgent] = []
      handoffsByAgent[h.toAgent].push(h)
    }

    const totalActiveTasks = allActiveTasks.length
    const tasksWithOwner   = allActiveTasks.filter(t => t.ownerAgent).length
    const ownerCoverage    = totalActiveTasks > 0
      ? Math.round((tasksWithOwner / totalActiveTasks) * 100)
      : 100

    return NextResponse.json({
      success: true,
      generatedAt: now.toISOString(),
      workspaceId,

      topPriorities: topPriorityTasks,

      agentWorkloads,

      blockedTasks,

      decisionInbox: decisionTasks,

      waitingOnBen: waitingOnBenTasks,

      recentCompletions,

      pendingHandoffs: {
        total: pendingHandoffs.length,
        byAgent: handoffsByAgent,
      },

      workflowHealth: {
        totalActiveTasks,
        ownerCoveragePercent: ownerCoverage,
        tasksWithNoOwner:     noOwnerCount,
        doneWithNoOutput:     doneNoOutputCount,
        stalledTasks:         stalledCount, // not updated in 48h
        openDecisions:        decisionTasks.length,
        waitingOnBenCount:    waitingOnBenTasks.length,
        pendingHandoffCount:  pendingHandoffs.length,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API:founder/summary]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
