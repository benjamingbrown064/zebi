import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'

export const dynamic = 'force-dynamic'

/**
 * GET /api/orchestration/monitor?workspaceId=...
 *
 * Real-time orchestration monitoring dashboard data.
 * Returns current state of all agents, handoffs, and tasks.
 */
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
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    const [
      agentHeartbeats,
      activeHandoffs,
      recentHandoffs,
      tasksByAgent,
      recentMessages,
      workQueueDepth,
    ] = await Promise.all([
      // Agent heartbeats (last seen)
      prisma.agentHeartbeat.findMany({
        where: { workspaceId },
        orderBy: { lastSeenAt: 'desc' },
      }),

      // Active handoffs
      prisma.handoff.findMany({
        where: {
          workspaceId,
          status: { in: ['pending', 'accepted'] },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          workspace: { select: { id: true } },
        },
      }),

      // Recent handoff activity (last hour)
      prisma.handoff.findMany({
        where: {
          workspaceId,
          createdAt: { gte: hourAgo },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // Tasks by agent
      prisma.task.groupBy({
        by: ['ownerAgent'],
        where: {
          workspaceId,
          completedAt: null,
          archivedAt: null,
        },
        _count: {
          id: true,
        },
      }),

      // Recent agent messages
      prisma.agentMessage.findMany({
        where: {
          workspaceId,
          createdAt: { gte: hourAgo },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          fromAgent: true,
          toAgent: true,
          subject: true,
          actionRequired: true,
          readAt: true,
          createdAt: true,
        },
      }),

      // Work queue depth
      prisma.aIWorkQueue.count({
        where: {
          workspaceId,
          completedAt: null,
          scheduledFor: { lte: now },
        },
      }),
    ])

    // Calculate agent status
    const agentStatus = agentHeartbeats.map(hb => {
      const lastSeenMs = now.getTime() - new Date(hb.lastSeenAt).getTime()
      const lastSeenMin = Math.floor(lastSeenMs / 60000)
      
      let status: 'active' | 'idle' | 'offline'
      if (lastSeenMin < 2) status = 'active'
      else if (lastSeenMin < 60) status = 'idle'
      else status = 'offline'

      const taskCount = tasksByAgent.find(t => t.ownerAgent === hb.agent)?._count.id ?? 0
      const pendingHandoffs = activeHandoffs.filter(h => h.toAgent === hb.agent && h.status === 'pending').length
      const activeHandoffCount = activeHandoffs.filter(h => h.toAgent === hb.agent || h.fromAgent === hb.agent).length

      return {
        agent: hb.agent,
        status,
        lastSeen: hb.lastSeenAt,
        lastSeenMinutesAgo: lastSeenMin,
        lastEvent: hb.event,
        activeTasks: taskCount,
        pendingHandoffs,
        activeHandoffCount,
      }
    })

    // Handoff flow stats
    const handoffStats = {
      pending: activeHandoffs.filter(h => h.status === 'pending').length,
      accepted: activeHandoffs.filter(h => h.status === 'accepted').length,
      recentCompletedCount: recentHandoffs.filter(h => h.status === 'done').length,
      recentRejectedCount: recentHandoffs.filter(h => h.status === 'rejected').length,
      avgAcceptanceTimeMinutes: calculateAvgAcceptanceTime(activeHandoffs),
    }

    // Message flow stats
    const messageStats = {
      totalRecentMessages: recentMessages.length,
      unreadMessages: recentMessages.filter(m => !m.readAt).length,
      actionRequiredMessages: recentMessages.filter(m => m.actionRequired && !m.readAt).length,
      messagesByAgent: groupMessagesByAgent(recentMessages),
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      workspaceId,
      monitor: {
        agentStatus,
        handoffStats,
        messageStats,
        workQueueDepth,
        activeHandoffs: activeHandoffs.map(h => ({
          id: h.id,
          fromAgent: h.fromAgent,
          toAgent: h.toAgent,
          status: h.status,
          summary: h.summary,
          createdAt: h.createdAt,
          acceptedAt: h.acceptedAt,
        })),
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API:orchestration/monitor]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function calculateAvgAcceptanceTime(handoffs: any[]): number | null {
  const accepted = handoffs.filter(h => h.acceptedAt)
  if (accepted.length === 0) return null
  
  const totalMs = accepted.reduce((sum, h) => {
    return sum + (new Date(h.acceptedAt).getTime() - new Date(h.createdAt).getTime())
  }, 0)
  
  return Math.round(totalMs / accepted.length / 60000) // minutes
}

function groupMessagesByAgent(messages: any[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const msg of messages) {
    const key = `${msg.fromAgent}->${msg.toAgent}`
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
}
