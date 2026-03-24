import { NextRequest, NextResponse } from 'next/server'
import { requireDougAuth } from '@/lib/doug-auth'
import { getDougWorkspaceId } from '@/lib/doug-workspace'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/doug/weekly-plan
 * 
 * Generate a weekly planning summary
 * Called every Monday at 8am
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
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Fetch data
    const [objectives, thisWeekTasks, lastWeekCompleted, blockers] = await Promise.all([
      // Active objectives by priority
      prisma.objective.findMany({
        where: {
          workspaceId,
          status: { in: ['active', 'on_track', 'at_risk', 'blocked'] },
        },
        include: {
          company: { select: { name: true } },
          milestones: {
            where: {
              completedAt: null,
              targetDate: { lte: weekEnd },
            },
            orderBy: { targetDate: 'asc' },
            take: 1,
          },
          _count: { select: { tasks: true } },
        },
        orderBy: [{ priority: 'asc' }, { deadline: 'asc' }],
        take: 10,
      }),

      // Tasks due this week
      prisma.task.findMany({
        where: {
          workspaceId,
          completedAt: null,
          archivedAt: null,
          OR: [
            { dueAt: { gte: now, lte: weekEnd } },
            { priority: 1 }, // Always include P1 tasks
          ],
        },
        include: {
          objective: { select: { id: true, title: true } },
          project: { select: { name: true } },
        },
        orderBy: [{ priority: 'asc' }, { dueAt: 'asc' }],
        take: 20,
      }),

      // Completed last week
      prisma.task.findMany({
        where: {
          workspaceId,
          completedAt: { gte: lastWeek, lt: now },
        },
        select: {
          title: true,
          objective: { select: { title: true } },
        },
      }),

      // Active blockers
      prisma.objectiveBlocker.findMany({
        where: {
          resolvedAt: null,
          objective: {
            workspaceId,
          },
        },
        include: {
          objective: {
            select: { title: true, company: { select: { name: true } } },
          },
        },
      }),
    ])

    // Group tasks by objective
    const tasksByObjective = new Map<string, typeof thisWeekTasks>()
    const standaloneHighPriority: typeof thisWeekTasks = []

    thisWeekTasks.forEach((task) => {
      if (task.objectiveId) {
        const existing = tasksByObjective.get(task.objectiveId) || []
        tasksByObjective.set(task.objectiveId, [...existing, task])
      } else if (task.priority === 1) {
        standaloneHighPriority.push(task)
      }
    })

    // Build weekly plan
    const plan = {
      week: {
        start: now.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0],
      },
      
      lastWeekSummary: {
        tasksCompleted: lastWeekCompleted.length,
        topCompletions: lastWeekCompleted.slice(0, 5).map((t) => ({
          title: t.title,
          objective: t.objective?.title,
        })),
      },

      focusObjectives: objectives.slice(0, 5).map((o) => {
        const objTasks = tasksByObjective.get(o.id) || []
        const daysUntilDeadline = Math.ceil((o.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        return {
          id: o.id,
          title: o.title,
          space: o.company?.name,
          status: o.status,
          priority: o.priority,
          daysUntilDeadline,
          tasksThisWeek: objTasks.length,
          nextMilestone: o.milestones[0]
            ? {
                title: o.milestones[0].title,
                targetDate: o.milestones[0].targetDate.toISOString().split('T')[0],
                daysUntil: Math.ceil(
                  (o.milestones[0].targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                ),
              }
            : null,
          topTasks: objTasks.slice(0, 5).map((t) => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            dueAt: t.dueAt?.toISOString().split('T')[0],
          })),
        }
      }),

      highPriorityTasks: standaloneHighPriority.map((t) => ({
        id: t.id,
        title: t.title,
        project: t.project?.name,
        dueAt: t.dueAt?.toISOString().split('T')[0],
      })),

      blockers: blockers.map((b) => ({
        id: b.id,
        title: b.title,
        objective: b.objective.title,
        space: b.objective.company?.name,
        severity: b.severity,
      })),

      recommendations: generateRecommendations(objectives, thisWeekTasks, blockers),
    }

    return NextResponse.json(plan)
  } catch (error) {
    console.error('[Doug API] Failed to generate weekly plan:', error)
    return NextResponse.json(
      { error: 'Failed to generate weekly plan' },
      { status: 500 }
    )
  }
}

function generateRecommendations(
  objectives: any[],
  tasks: any[],
  blockers: any[]
): string[] {
  const recs: string[] = []

  // Check for stalled objectives
  const stalled = objectives.filter((o) => {
    const taskCount = tasks.filter((t) => t.objectiveId === o.id).length
    return taskCount === 0 && o._count.tasks === 0
  })
  if (stalled.length > 0) {
    recs.push(`${stalled.length} objective(s) have no tasks - consider breaking them down`)
  }

  // Check for overloaded objectives
  const overloaded = objectives.filter((o) => {
    const thisWeekCount = tasks.filter((t) => t.objectiveId === o.id && t.priority <= 2).length
    return thisWeekCount > 10
  })
  if (overloaded.length > 0) {
    recs.push(`${overloaded.length} objective(s) have >10 high-priority tasks - may need to prioritize`)
  }

  // Check for unaddressed blockers
  if (blockers.length > 0) {
    const critical = blockers.filter((b) => b.severity === 'critical' || b.severity === 'high')
    if (critical.length > 0) {
      recs.push(`${critical.length} critical blocker(s) need resolution this week`)
    }
  }

  // Check for approaching deadlines
  const urgent = objectives.filter((o) => {
    const days = Math.ceil((o.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days <= 14 && Number(o.progressPercent) < 70
  })
  if (urgent.length > 0) {
    recs.push(`${urgent.length} objective(s) have <14 days and <70% progress - need focus`)
  }

  if (recs.length === 0) {
    recs.push('Week looks balanced - focus on completing high-priority tasks')
  }

  return recs
}
