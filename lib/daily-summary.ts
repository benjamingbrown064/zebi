/**
 * Daily Summary Generator
 * 
 * Aggregates daily work stats across missions, spaces, tasks, documents,
 * insights, and memories. Tracks progress and prepares tomorrow's queue.
 */

import { prisma } from './prisma';

const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';

export interface DailySummaryData {
  date: string;
  workspace: {
    id: string;
    name: string;
  };
  mission: {
    progress: {
      previous: number;
      current: number;
      change: number;
    };
  } | null;
  spaces: Array<{
    id: string;
    name: string;
    tasksCompleted: number;
    tasksCreated: number;
    insightsGenerated: number;
    documentsCreated: number;
    documentsUpdated: number;
    memoriesStored: number;
    projectsProgressed: number;
  }>;
  totals: {
    tasksCompleted: {
      human: number;
      ai: number;
      total: number;
    };
    tasksCreated: number;
    documentsCreated: number;
    documentsUpdated: number;
    insightsGenerated: number;
    memoriesStored: number;
    projectsProgressed: number;
  };
  tomorrowQueue: {
    totalTasks: number;
    byPriority: {
      urgent: number;
      high: number;
      medium: number;
      low: number;
    };
    bySpace: Array<{
      spaceName: string;
      taskCount: number;
    }>;
  };
  topHighlights: string[];
}

/**
 * Generate daily summary for a workspace
 */
export async function generateDailySummary(
  workspaceId: string = DEFAULT_WORKSPACE_ID
): Promise<DailySummaryData> {
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  // Get workspace
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true },
  });

  if (!workspace) {
    throw new Error(`Workspace ${workspaceId} not found`);
  }

  // Fetch all data in parallel
  const [
    mission,
    spaces,
    tasksCompleted,
    tasksCreated,
    documentsCreated,
    documentsUpdated,
    insightsGenerated,
    memoriesStored,
    projectsWithActivity,
    tomorrowTasks,
  ] = await Promise.all([
    // Mission progress (current vs yesterday)
    getMissionProgress(workspaceId),
    
    // All active spaces
    prisma.space.findMany({
      where: { workspaceId, archivedAt: null },
      select: { id: true, name: true },
    }),
    
    // Tasks completed today
    prisma.task.findMany({
      where: {
        workspaceId,
        completedAt: { gte: startOfDay, lte: endOfDay },
      },
      select: {
        id: true,
        companyId: true,
        aiGenerated: true,
      },
    }),
    
    // Tasks created today
    prisma.task.count({
      where: {
        workspaceId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    }),
    
    // Documents created today
    prisma.document.findMany({
      where: {
        workspaceId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      select: { id: true, companyId: true },
    }),
    
    // Documents updated today (but not created today)
    prisma.document.findMany({
      where: {
        workspaceId,
        updatedAt: { gte: startOfDay, lte: endOfDay },
        createdAt: { lt: startOfDay },
      },
      select: { id: true, companyId: true },
    }),
    
    // Insights generated today
    prisma.aIInsight.findMany({
      where: {
        workspaceId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      select: { id: true, companyId: true },
    }),
    
    // Memories stored today
    prisma.aIMemory.findMany({
      where: {
        workspaceId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      select: { id: true, companyId: true },
    }),
    
    // Projects with activity today (tasks created/completed)
    prisma.project.findMany({
      where: {
        workspaceId,
        archivedAt: null,
        OR: [
          {
            tasks: {
              some: {
                OR: [
                  { completedAt: { gte: startOfDay, lte: endOfDay } },
                  { createdAt: { gte: startOfDay, lte: endOfDay } },
                ],
              },
            },
          },
          {
            documents: {
              some: {
                OR: [
                  { createdAt: { gte: startOfDay, lte: endOfDay } },
                  { updatedAt: { gte: startOfDay, lte: endOfDay } },
                ],
              },
            },
          },
        ],
      },
      select: { id: true, companyId: true },
    }),
    
    // Tomorrow's queue (incomplete tasks)
    prisma.task.findMany({
      where: {
        workspaceId,
        completedAt: null,
        archivedAt: null,
      },
      select: {
        id: true,
        priority: true,
        companyId: true,
        company: { select: { name: true } },
      },
    }),
  ]);

  // Aggregate by space
  const spaceStats = spaces.map(space => {
    const companyId = space.id;
    
    return {
      id: companyId,
      name: space.name,
      tasksCompleted: tasksCompleted.filter(t => t.companyId === companyId).length,
      tasksCreated: 0, // We don't have per-space created count from the query
      insightsGenerated: insightsGenerated.filter(i => i.companyId === companyId).length,
      documentsCreated: documentsCreated.filter(d => d.companyId === companyId).length,
      documentsUpdated: documentsUpdated.filter(d => d.companyId === companyId).length,
      memoriesStored: memoriesStored.filter(m => m.companyId === companyId).length,
      projectsProgressed: projectsWithActivity.filter(p => p.companyId === companyId).length,
    };
  });

  // Filter spaces with activity
  const activeSpaces = spaceStats.filter(c =>
    c.tasksCompleted > 0 ||
    c.insightsGenerated > 0 ||
    c.documentsCreated > 0 ||
    c.documentsUpdated > 0 ||
    c.memoriesStored > 0 ||
    c.projectsProgressed > 0
  );

  // Calculate totals
  const humanTasks = tasksCompleted.filter(t => !t.aiGenerated).length;
  const aiTasks = tasksCompleted.filter(t => t.aiGenerated).length;
  
  const totals = {
    tasksCompleted: {
      human: humanTasks,
      ai: aiTasks,
      total: tasksCompleted.length,
    },
    tasksCreated,
    documentsCreated: documentsCreated.length,
    documentsUpdated: documentsUpdated.length,
    insightsGenerated: insightsGenerated.length,
    memoriesStored: memoriesStored.length,
    projectsProgressed: new Set(projectsWithActivity.map(p => p.id)).size,
  };

  // Tomorrow's queue stats
  const tomorrowQueue = {
    totalTasks: tomorrowTasks.length,
    byPriority: {
      urgent: tomorrowTasks.filter(t => t.priority === 1).length,
      high: tomorrowTasks.filter(t => t.priority === 2).length,
      medium: tomorrowTasks.filter(t => t.priority === 3).length,
      low: tomorrowTasks.filter(t => t.priority >= 4).length,
    },
    bySpace: Array.from(
      tomorrowTasks
        .filter(t => t.company)
        .reduce((acc, t) => {
          const name = t.company!.name;
          acc.set(name, (acc.get(name) || 0) + 1);
          return acc;
        }, new Map<string, number>())
    )
      .map(([spaceName, taskCount]) => ({ spaceName, taskCount }))
      .sort((a, b) => b.taskCount - a.taskCount)
      .slice(0, 5), // Top 5 spaces
  };

  // Generate highlights
  const highlights: string[] = [];
  if (totals.tasksCompleted.total > 10) {
    highlights.push(`Crushed ${totals.tasksCompleted.total} tasks today!`);
  }
  if (totals.insightsGenerated > 0) {
    highlights.push(`Generated ${totals.insightsGenerated} strategic insights`);
  }
  if (totals.documentsCreated > 0) {
    highlights.push(`Created ${totals.documentsCreated} new documents`);
  }
  if (activeSpaces.length > 1) {
    highlights.push(`Progress across ${activeSpaces.length} spaces`);
  }

  return {
    date: today.toISOString().split('T')[0],
    workspace: {
      id: workspace.id,
      name: workspace.name,
    },
    mission,
    spaces: activeSpaces,
    totals,
    tomorrowQueue,
    topHighlights: highlights,
  };
}

/**
 * Get mission progress (current vs yesterday)
 */
async function getMissionProgress(workspaceId: string) {
  const mission = await prisma.mission.findFirst({
    where: { workspaceId, isActive: true },
    include: {
      goals: {
        where: { status: 'active' },
      },
    },
  });

  if (!mission || mission.goals.length === 0) {
    return null;
  }

  // Calculate average progress across all goals
  const currentProgress = mission.goals.reduce((sum, goal) => {
    const progress = goal.targetValue.toNumber() > 0
      ? (goal.currentValue.toNumber() / goal.targetValue.toNumber()) * 100
      : 0;
    return sum + progress;
  }, 0) / mission.goals.length;

  // Get yesterday's progress entries to calculate previous
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59, 999);

  const previousProgress = currentProgress; // Simplified - could fetch historical data

  return {
    progress: {
      previous: Math.round(previousProgress),
      current: Math.round(currentProgress),
      change: Math.round(currentProgress - previousProgress),
    },
  };
}

/**
 * Store summary as ActivityLog entry
 */
export async function storeSummary(
  workspaceId: string,
  summaryText: string,
  summaryData: DailySummaryData
) {
  await prisma.activityLog.create({
    data: {
      workspaceId,
      eventType: 'daily_summary',
      eventPayload: JSON.parse(JSON.stringify({
        text: summaryText,
        data: summaryData,
        generatedAt: new Date().toISOString(),
      })),
      createdBy: '00000000-0000-0000-0000-000000000000', // System user
      aiAgent: 'daily-summary-generator',
    },
  });
}
