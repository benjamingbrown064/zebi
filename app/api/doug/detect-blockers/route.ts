import { NextRequest, NextResponse } from 'next/server'
import { requireDougAuth } from '@/lib/doug-auth'
import { getDougWorkspaceId } from '@/lib/doug-workspace'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/doug/detect-blockers
 * 
 * Proactively detect potential blockers:
 * - Tasks stuck for >5 days
 * - Objectives with no progress in 7 days
 * - Objectives at risk of missing deadline
 * - Tasks overdue by >3 days
 * 
 * Called by cron every 6 hours
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
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

    // Fetch potential issues
    const [stuckTasks, staleObjectives, atRiskObjectives, overdueTasks] = await Promise.all([
      // Tasks created >5 days ago, still not done, no recent updates
      prisma.task.findMany({
        where: {
          workspaceId,
          completedAt: null,
          archivedAt: null,
          createdAt: { lt: fiveDaysAgo },
          updatedAt: { lt: fiveDaysAgo },
        },
        include: {
          objective: { select: { title: true } },
          project: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      }),

      // Objectives with no progress updates in 7 days
      prisma.objective.findMany({
        where: {
          workspaceId,
          status: { in: ['active', 'on_track'] },
          updatedAt: { lt: sevenDaysAgo },
        },
        include: {
          company: { select: { name: true } },
          progressEntries: {
            orderBy: { entryDate: 'desc' },
            take: 1,
          },
        },
      }),

      // Objectives at risk of missing deadline (<30 days, <50% progress)
      prisma.objective.findMany({
        where: {
          workspaceId,
          status: { in: ['active', 'on_track'] },
          deadline: {
            gte: now,
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          progressPercent: { lt: 50 },
        },
        include: {
          company: { select: { name: true } },
        },
      }),

      // Tasks overdue by >3 days
      prisma.task.findMany({
        where: {
          workspaceId,
          completedAt: null,
          archivedAt: null,
          dueAt: { lt: threeDaysAgo },
        },
        include: {
          objective: { select: { title: true } },
        },
        orderBy: { dueAt: 'asc' },
        take: 10,
      }),
    ])

    const issues = {
      timestamp: now.toISOString(),
      totalIssues: stuckTasks.length + staleObjectives.length + atRiskObjectives.length + overdueTasks.length,
      
      stuckTasks: stuckTasks.map((t) => ({
        id: t.id,
        title: t.title,
        objective: t.objective?.title,
        project: t.project?.name,
        daysStuck: Math.ceil((now.getTime() - t.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
        suggestion: 'This task has been inactive for ' + 
          Math.ceil((now.getTime() - t.updatedAt.getTime()) / (1000 * 60 * 60 * 24)) + 
          ' days. Should we break it down or reassign?',
      })),

      staleObjectives: staleObjectives.map((o) => ({
        id: o.id,
        title: o.title,
        company: o.company?.name,
        daysSinceUpdate: Math.ceil((now.getTime() - o.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
        progress: `${o.currentValue}/${o.targetValue} ${o.unit || ''}`,
        suggestion: 'No progress logged in ' + 
          Math.ceil((now.getTime() - o.updatedAt.getTime()) / (1000 * 60 * 60 * 24)) + 
          ' days. Is this still active?',
      })),

      atRiskObjectives: atRiskObjectives.map((o) => {
        const daysUntilDeadline = Math.ceil((o.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return {
          id: o.id,
          title: o.title,
          company: o.company?.name,
          daysUntilDeadline,
          progressPercent: Number(o.progressPercent),
          suggestion: `Only ${daysUntilDeadline} days left and ${Number(o.progressPercent)}% complete. Need to accelerate?`,
        }
      }),

      overdueTasks: overdueTasks.map((t) => {
        const daysOverdue = Math.ceil((now.getTime() - t.dueAt!.getTime()) / (1000 * 60 * 60 * 24))
        return {
          id: t.id,
          title: t.title,
          objective: t.objective?.title,
          daysOverdue,
          suggestion: `Overdue by ${daysOverdue} days. Should we reschedule or mark as blocked?`,
        }
      }),
    }

    return NextResponse.json(issues)
  } catch (error) {
    console.error('[Doug API] Failed to detect blockers:', error)
    return NextResponse.json(
      { error: 'Failed to detect blockers' },
      { status: 500 }
    )
  }
}
