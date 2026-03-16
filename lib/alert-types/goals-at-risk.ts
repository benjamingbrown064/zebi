import { prisma } from '@/lib/prisma';
import { Alert } from './new-insights';

/**
 * Detect goals at risk:
 * - Goals with <40% progress and <30 days to deadline
 * - Objectives blocked >3 days
 * - Projects with velocity drop >50% (simplified: check tasks completion rate)
 */
export async function detectGoalsAtRisk(
  workspaceId: string
): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  // 1. Goals with <40% progress and <30 days to deadline
  const riskyGoals = await prisma.goal.findMany({
    where: {
      workspaceId,
      status: 'active',
      endDate: {
        gte: now,
        lte: in30Days,
      },
    },
  });

  for (const goal of riskyGoals) {
    const progress = Number(goal.currentValue);
    const target = Number(goal.targetValue);
    const progressPercent = target > 0 ? (progress / target) * 100 : 0;

    if (progressPercent < 40) {
      const daysLeft = Math.floor(
        (goal.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      alerts.push({
        id: `risk-goal-${goal.id}`,
        type: 'goal_at_risk',
        priority: 'high',
        title: 'Goal behind schedule',
        message: `⚠️ Risk: ${goal.name} - ${Math.round(progressPercent)}% complete, ${daysLeft} days left`,
        actionUrl: `/goals/${goal.id}`,
        timestamp: now.toISOString(),
      });
    }
  }

  // 2. Objectives blocked >3 days
  const blockedObjectives = await prisma.objective.findMany({
    where: {
      workspaceId,
      status: 'active',
      blockers: {
        some: {
          detectedAt: {
            lte: threeDaysAgo,
          },
          resolvedAt: null,
        },
      },
    },
    include: {
      blockers: {
        where: {
          detectedAt: {
            lte: threeDaysAgo,
          },
          resolvedAt: null,
        },
        orderBy: {
          detectedAt: 'asc',
        },
        take: 1,
      },
      company: {
        select: {
          name: true,
        },
      },
    },
  });

  for (const objective of blockedObjectives) {
    const oldestBlocker = objective.blockers[0];
    const daysBlocked = Math.floor(
      (now.getTime() - oldestBlocker.detectedAt.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    alerts.push({
      id: `risk-blocked-${objective.id}`,
      type: 'goal_at_risk',
      priority: 'high',
      title: 'Objective blocked',
      message: `⚠️ Risk: ${objective.title} - Blocked for ${daysBlocked} days${objective.company ? ` (${objective.company.name})` : ''}`,
      actionUrl: `/objectives/${objective.id}`,
      timestamp: now.toISOString(),
    });
  }

  // 3. Projects with velocity drop (simplified: check recent task completion)
  // Compare tasks completed in last 7 days vs previous 7 days
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const projects = await prisma.project.findMany({
    where: {
      workspaceId,
      archivedAt: null,
    },
    include: {
      tasks: {
        where: {
          completedAt: {
            gte: fourteenDaysAgo,
          },
        },
        select: {
          completedAt: true,
        },
      },
    },
  });

  for (const project of projects) {
    const recentCompletions = project.tasks.filter(
      (t) => t.completedAt && t.completedAt >= sevenDaysAgo
    ).length;
    const previousCompletions = project.tasks.filter(
      (t) =>
        t.completedAt &&
        t.completedAt >= fourteenDaysAgo &&
        t.completedAt < sevenDaysAgo
    ).length;

    // Only alert if there was significant activity before
    if (previousCompletions >= 3) {
      const velocityDrop =
        ((previousCompletions - recentCompletions) / previousCompletions) * 100;

      if (velocityDrop >= 50) {
        alerts.push({
          id: `risk-velocity-${project.id}`,
          type: 'goal_at_risk',
          priority: 'medium',
          title: 'Project velocity dropped',
          message: `⚠️ Risk: ${project.name} - Velocity dropped ${Math.round(velocityDrop)}% (${previousCompletions} → ${recentCompletions} tasks/week)`,
          actionUrl: `/projects/${project.id}`,
          timestamp: now.toISOString(),
        });
      }
    }
  }

  return alerts;
}
