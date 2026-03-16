import { prisma } from '@/lib/prisma';
import { Alert } from './new-insights';

/**
 * Detect upcoming deadlines:
 * - Tasks due in next 24 hours with no progress (not completed)
 * - Objectives at risk of missing deadline (<7 days, <80% complete)
 */
export async function detectUpcomingDeadlines(
  workspaceId: string
): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 1. Tasks due in next 24 hours (not completed)
  const urgentTasks = await prisma.task.findMany({
    where: {
      workspaceId,
      dueAt: {
        gte: now,
        lte: in24Hours,
      },
      completedAt: null,
      archivedAt: null,
    },
    include: {
      project: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      dueAt: 'asc',
    },
  });

  for (const task of urgentTasks) {
    const hoursUntilDue = Math.floor(
      (task.dueAt!.getTime() - now.getTime()) / (1000 * 60 * 60)
    );

    alerts.push({
      id: `deadline-task-${task.id}`,
      type: 'upcoming_deadline',
      priority: hoursUntilDue < 6 ? 'critical' : 'high',
      title: 'Task deadline approaching',
      message: `⏰ Deadline: ${task.title} due in ${hoursUntilDue} hours`,
      actionUrl: `/tasks/${task.id}`,
      timestamp: now.toISOString(),
    });
  }

  // 2. Objectives at risk (<7 days to deadline, <80% complete)
  const riskyObjectives = await prisma.objective.findMany({
    where: {
      workspaceId,
      status: 'active',
      deadline: {
        gte: now,
        lte: in7Days,
      },
      progressPercent: {
        lt: 80,
      },
    },
    include: {
      company: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      deadline: 'asc',
    },
  });

  for (const objective of riskyObjectives) {
    const daysUntilDeadline = Math.floor(
      (objective.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const progress = Number(objective.progressPercent);

    alerts.push({
      id: `deadline-objective-${objective.id}`,
      type: 'upcoming_deadline',
      priority: daysUntilDeadline < 3 ? 'critical' : 'high',
      title: 'Objective at risk',
      message: `⏰ Deadline: ${objective.title} - ${progress}% complete, ${daysUntilDeadline} days left`,
      actionUrl: `/objectives/${objective.id}`,
      timestamp: now.toISOString(),
    });
  }

  return alerts;
}
