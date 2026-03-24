import { NextRequest, NextResponse } from 'next/server'
import { requireDougAuth } from '@/lib/doug-auth'
import { getDougWorkspaceId } from '@/lib/doug-workspace'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/doug/summary
 * 
 * Generate a daily summary for morning briefing
 * Called by cron job at 7am daily
 */
export async function GET(request: NextRequest) {
  const authError = requireDougAuth(request)
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  try {
    // Resolve workspace from Doug API context
    const workspaceId = await getDougWorkspaceId()

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    // Fetch data in parallel
    const [objectives, dueSoonTasks, overdueObjectives, recentBlockers, completedYesterday] = await Promise.all([
      // Active objectives
      prisma.objective.findMany({
        where: {
          workspaceId,
          status: { in: ['active', 'on_track', 'at_risk', 'blocked'] },
        },
        include: {
          company: { select: { name: true } },
          _count: { select: { tasks: true } },
        },
        orderBy: { deadline: 'asc' },
        take: 10,
      }),

      // Tasks due soon (next 7 days)
      prisma.task.findMany({
        where: {
          workspaceId,
          completedAt: null,
          archivedAt: null,
          dueAt: {
            gte: today,
            lte: nextWeek,
          },
        },
        include: {
          objective: { select: { title: true } },
          project: { select: { name: true } },
        },
        orderBy: [{ priority: 'asc' }, { dueAt: 'asc' }],
        take: 10,
      }),

      // Overdue objectives (deadline passed)
      prisma.objective.findMany({
        where: {
          workspaceId,
          status: { in: ['active', 'on_track', 'at_risk'] },
          deadline: { lt: today },
        },
        select: {
          title: true,
          deadline: true,
          company: { select: { name: true } },
          currentValue: true,
          targetValue: true,
          unit: true,
        },
      }),

      // Recent blockers (last 24 hours)
      prisma.objectiveBlocker.findMany({
        where: {
          detectedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          resolvedAt: null,
        },
        include: {
          objective: {
            select: {
              title: true,
              company: { select: { name: true } },
            },
          },
        },
        orderBy: { detectedAt: 'desc' },
      }),

      // Tasks completed yesterday
      prisma.task.findMany({
        where: {
          workspaceId,
          completedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            lt: today,
          },
        },
        select: {
          title: true,
          objective: { select: { title: true } },
        },
        take: 5,
      }),
    ])

    // Calculate stats
    const urgentTasks = dueSoonTasks.filter((t) => {
      if (!t.dueAt) return false
      const daysUntil = Math.ceil((t.dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntil <= 2
    })

    const atRiskObjectives = objectives.filter((o) => o.status === 'at_risk' || o.status === 'blocked')

    // Build summary
    const summary = {
      date: today.toISOString().split('T')[0],
      greeting: getGreeting(),
      
      highlights: {
        activeObjectives: objectives.length,
        urgentTasks: urgentTasks.length,
        dueSoonTasks: dueSoonTasks.length,
        atRisk: atRiskObjectives.length,
        newBlockers: recentBlockers.length,
        completedYesterday: completedYesterday.length,
      },

      urgentItems: urgentTasks.map((t) => ({
        title: t.title,
        objective: t.objective?.title,
        project: t.project?.name,
        priority: t.priority,
        dueAt: t.dueAt?.toISOString().split('T')[0],
        daysUntil: t.dueAt
          ? Math.ceil((t.dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      })),

      overdueObjectives: overdueObjectives.map((o) => ({
        title: o.title,
        space: o.company?.name,
        deadline: o.deadline.toISOString().split('T')[0],
        daysOverdue: Math.ceil((now.getTime() - o.deadline.getTime()) / (1000 * 60 * 60 * 24)),
        progress: `${o.currentValue}/${o.targetValue} ${o.unit || ''}`,
      })),

      newBlockers: recentBlockers.map((b) => ({
        title: b.title,
        objective: b.objective.title,
        space: b.objective.company?.name,
        severity: b.severity,
      })),

      topObjectives: objectives.slice(0, 5).map((o) => ({
        title: o.title,
        space: o.company?.name,
        status: o.status,
        deadline: o.deadline.toISOString().split('T')[0],
        daysUntil: Math.ceil((o.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        taskCount: o._count.tasks,
      })),

      completedYesterday: completedYesterday.map((t) => ({
        title: t.title,
        objective: t.objective?.title,
      })),
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('[Doug API] Failed to generate summary:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
