import { prisma } from '@/lib/prisma'
import { chatCompletion } from './openai-client'

export interface Alert {
  type: 'alert' | 'risk' | 'opportunity' | 'warning'
  priority: number // 0-100 (90+ = critical, 70-89 = high, 50-69 = medium, <50 = low)
  title: string
  description: string
  reasoning: string
  entityType: 'task' | 'objective' | 'project' | 'workspace'
  entityId: string | null
  actions: AlertAction[]
}

export interface AlertAction {
  type: 'navigate' | 'update_status' | 'set_deadline' | 'create_task'
  label: string
  params: Record<string, any>
}

export class AlertDetector {
  /**
   * Analyze workspace and detect alerts
   */
  async analyzeWorkspace(
    workspaceId: string,
    userId: string
  ): Promise<Alert[]> {
    const alerts: Alert[] = []

    // Run all detectors in parallel
    const [lateTaskAlerts, blockedObjAlerts, stuckTaskAlerts, momentumAlerts, deadlineAlerts] =
      await Promise.all([
        this.detectLateTasks(workspaceId),
        this.detectBlockedObjectives(workspaceId),
        this.detectStuckTasks(workspaceId),
        this.detectMomentum(workspaceId),
        this.detectDeadlineWarnings(workspaceId),
      ])

    alerts.push(
      ...lateTaskAlerts,
      ...blockedObjAlerts,
      ...stuckTaskAlerts,
      ...momentumAlerts,
      ...deadlineAlerts
    )

    // Use AI to prioritize and enhance alerts
    if (alerts.length > 0) {
      return await this.enrichAlertsWithAI(alerts, workspaceId)
    }

    return alerts
  }

  /**
   * Detect late tasks (deadline passed, not done)
   */
  private async detectLateTasks(workspaceId: string): Promise<Alert[]> {
    const now = new Date()
    const lateTasks = await prisma.task.findMany({
      where: {
        workspaceId,
        dueAt: { lt: now },
        completedAt: null,
        archivedAt: null,
      },
      select: {
        id: true,
        title: true,
        dueAt: true,
        priority: true,
        project: { select: { name: true } },
      },
      orderBy: { dueAt: 'asc' },
      take: 10,
    })

    return lateTasks.map((task) => {
      const daysLate = Math.ceil(
        (now.getTime() - task.dueAt!.getTime()) / (1000 * 60 * 60 * 24)
      )
      const priorityScore = Math.min(95, 70 + task.priority * 5 + daysLate * 2)

      return {
        type: 'risk' as const,
        priority: priorityScore,
        title: `Task overdue: ${task.title}`,
        description: `This task is ${daysLate} day${daysLate > 1 ? 's' : ''} late${task.project ? ` (${task.project.name})` : ''}.`,
        reasoning: `Late tasks can block progress and create bottlenecks. Priority ${task.priority} tasks should be addressed immediately.`,
        entityType: 'task' as const,
        entityId: task.id,
        actions: [
          {
            type: 'navigate' as const,
            label: 'View Task',
            params: { url: `/tasks/${task.id}` },
          },
        ],
      }
    })
  }

  /**
   * Detect blocked objectives (no tasks in 7+ days)
   */
  private async detectBlockedObjectives(
    workspaceId: string
  ): Promise<Alert[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const objectives = await prisma.objective.findMany({
      where: {
        workspaceId,
        status: { in: ['active', 'on_track', 'at_risk'] },
      },
      select: {
        id: true,
        title: true,
        deadline: true,
        progressPercent: true,
        company: { select: { name: true } },
        tasks: {
          where: {
            createdAt: { gte: sevenDaysAgo },
          },
          select: { id: true },
        },
      },
    })

    const blockedObjectives = objectives.filter((obj) => obj.tasks.length === 0)

    return blockedObjectives.map((obj) => {
      const daysUntilDeadline = Math.ceil(
        (new Date(obj.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      const progressPercent = Number(obj.progressPercent)
      const priorityScore = Math.min(
        95,
        60 + (daysUntilDeadline < 14 ? 20 : 0) + (progressPercent < 30 ? 10 : 0)
      )

      return {
        type: 'risk' as const,
        priority: priorityScore,
        title: `Objective inactive: ${obj.title}`,
        description: `No tasks created in the last 7 days${obj.company ? ` for ${obj.company.name}` : ''}. Progress: ${progressPercent.toFixed(0)}%`,
        reasoning: `Objectives need consistent momentum. 7 days without new tasks suggests this may be stuck or forgotten.`,
        entityType: 'objective' as const,
        entityId: obj.id,
        actions: [
          {
            type: 'navigate' as const,
            label: 'View Objective',
            params: { url: `/objectives/${obj.id}` },
          },
        ],
      }
    })
  }

  /**
   * Detect stuck tasks (status unchanged >5 days)
   */
  private async detectStuckTasks(workspaceId: string): Promise<Alert[]> {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    const tasks = await prisma.task.findMany({
      where: {
        workspaceId,
        completedAt: null,
        archivedAt: null,
        updatedAt: { lt: fiveDaysAgo },
      },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        status: { select: { name: true } },
        project: { select: { name: true } },
      },
      orderBy: { updatedAt: 'asc' },
      take: 5,
    })

    return tasks.map((task) => {
      const daysStuck = Math.ceil(
        (Date.now() - task.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      return {
        type: 'warning' as const,
        priority: Math.min(80, 50 + daysStuck * 3),
        title: `Task stuck: ${task.title}`,
        description: `No updates in ${daysStuck} days${task.project ? ` (${task.project.name})` : ''}. Current status: ${task.status.name}`,
        reasoning: `Tasks that remain unchanged for >5 days may need attention, re-prioritization, or removal.`,
        entityType: 'task' as const,
        entityId: task.id,
        actions: [
          {
            type: 'navigate' as const,
            label: 'Review Task',
            params: { url: `/tasks/${task.id}` },
          },
        ],
      }
    })
  }

  /**
   * Detect good momentum (3+ tasks done this week)
   */
  private async detectMomentum(workspaceId: string): Promise<Alert[]> {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    // Count tasks completed in last 7 days
    const completedCount = await prisma.task.count({
      where: {
        workspaceId,
        completedAt: { gte: weekAgo },
      },
    })

    if (completedCount >= 3) {
      return [
        {
          type: 'opportunity' as const,
          priority: 65,
          title: '🎉 Great momentum this week!',
          description: `You've completed ${completedCount} task${completedCount > 1 ? 's' : ''} in the last 7 days. Keep it up!`,
          reasoning: `Consistent progress builds momentum. Celebrate wins and maintain this pace.`,
          entityType: 'workspace' as const,
          entityId: null,
          actions: [
            {
              type: 'navigate' as const,
              label: 'View Completed',
              params: { url: '/tasks?status=done' },
            },
          ],
        },
      ]
    }

    return []
  }

  /**
   * Detect deadline warnings
   */
  private async detectDeadlineWarnings(
    workspaceId: string
  ): Promise<Alert[]> {
    const now = new Date()
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
    const fourteenDaysFromNow = new Date(
      now.getTime() + 14 * 24 * 60 * 60 * 1000
    )

    const alerts: Alert[] = []

    // Tasks <5 days to deadline, 0% progress (completedAt is null)
    const urgentTasks = await prisma.task.findMany({
      where: {
        workspaceId,
        dueAt: { gte: now, lte: fiveDaysFromNow },
        completedAt: null,
        archivedAt: null,
      },
      select: {
        id: true,
        title: true,
        dueAt: true,
        priority: true,
      },
      take: 5,
    })

    alerts.push(
      ...urgentTasks.map((task) => {
        const daysUntil = Math.ceil(
          (task.dueAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        return {
          type: 'warning' as const,
          priority: Math.min(90, 75 + (5 - daysUntil) * 3),
          title: `Deadline approaching: ${task.title}`,
          description: `Due in ${daysUntil} day${daysUntil > 1 ? 's' : ''} with no progress yet.`,
          reasoning: `Tasks with approaching deadlines need immediate attention to avoid last-minute rushing.`,
          entityType: 'task' as const,
          entityId: task.id,
          actions: [
            {
              type: 'navigate' as const,
              label: 'Start Now',
              params: { url: `/tasks/${task.id}` },
            },
          ],
        }
      })
    )

    // Objectives <14 days to deadline, <50% complete
    const urgentObjectives = await prisma.objective.findMany({
      where: {
        workspaceId,
        deadline: { gte: now, lte: fourteenDaysFromNow },
        progressPercent: { lt: 50 },
        status: { in: ['active', 'on_track', 'at_risk'] },
      },
      select: {
        id: true,
        title: true,
        deadline: true,
        progressPercent: true,
        company: { select: { name: true } },
      },
      take: 3,
    })

    alerts.push(
      ...urgentObjectives.map((obj) => {
        const daysUntil = Math.ceil(
          (new Date(obj.deadline).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        )
        return {
          type: 'warning' as const,
          priority: Math.min(90, 70 + (14 - daysUntil) * 2),
          title: `Objective behind schedule: ${obj.title}`,
          description: `${Number(obj.progressPercent).toFixed(0)}% complete with ${daysUntil} days until deadline${obj.company ? ` (${obj.company.name})` : ''}.`,
          reasoning: `Objectives less than 50% complete with <14 days remaining need urgent attention to hit the target.`,
          entityType: 'objective' as const,
          entityId: obj.id,
          actions: [
            {
              type: 'navigate' as const,
              label: 'Review Objective',
              params: { url: `/objectives/${obj.id}` },
            },
          ],
        }
      })
    )

    return alerts
  }

  /**
   * Use AI to prioritize and add context to alerts
   */
  private async enrichAlertsWithAI(
    alerts: Alert[],
    workspaceId: string
  ): Promise<Alert[]> {
    try {
      const prompt = `You are analyzing a workspace with ${alerts.length} detected alerts.

Review these alerts and determine which are most critical for the user to address today:

${alerts
  .map(
    (a, i) =>
      `${i + 1}. [${a.type.toUpperCase()}] ${a.title}
   Priority: ${a.priority}
   ${a.description}
   Reasoning: ${a.reasoning}`
  )
  .join('\n\n')}

For each alert:
1. Confirm the priority score (0-100)
2. Improve the reasoning to be more actionable
3. Return in JSON format

Output JSON only:
{
  "alerts": [
    {
      "index": 0,
      "priority": 85,
      "reasoning": "Improved reasoning here"
    }
  ]
}`

      const response = await chatCompletion(
        [
          {
            role: 'system',
            content:
              'You are a productivity AI analyzing workspace alerts. Be concise and actionable.',
          },
          { role: 'user', content: prompt },
        ],
        {
          model: 'gpt-4o-mini',
          temperature: 0.5,
          maxTokens: 1500,
        }
      )

      // Parse AI response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const aiEnhanced = JSON.parse(jsonMatch[0])
        aiEnhanced.alerts.forEach((enhancement: any) => {
          if (enhancement.index < alerts.length) {
            alerts[enhancement.index].priority = enhancement.priority
            alerts[enhancement.index].reasoning = enhancement.reasoning
          }
        })
      }
    } catch (error) {
      console.error('Failed to enrich alerts with AI:', error)
      // Continue with original alerts if AI fails
    }

    return alerts.sort((a, b) => b.priority - a.priority)
  }
}
