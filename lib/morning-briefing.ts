/**
 * Morning Briefing Generator
 * 
 * Generates a morning briefing with today's tasks, objectives needing attention,
 * AI work queue status, key metrics, and yesterday's completion rate.
 */

import { prisma } from './prisma';

const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';

export interface MorningBriefingData {
  date: string;
  workspace: {
    id: string;
    name: string;
  };
  todayTasks: Array<{
    id: string;
    title: string;
    effortPoints: number | null;
    spaceName: string | null;
    priority: number;
  }>;
  objectivesNeedingAttention: Array<{
    id: string;
    title: string;
    spaceName: string | null;
    progressPercent: number;
    daysLeft: number;
    status: string;
    blockerCount: number;
    hasBlockers: boolean;
  }>;
  aiWorkQueue: {
    totalReady: number;
    byPriority: {
      urgent: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  yesterdayStats: {
    tasksCompleted: number;
    insightsGenerated: number;
    blockersResolved: number;
  };
  keyMetrics: {
    objectivesOnTrack: number;
    objectivesAtRisk: number;
    objectivesBlocked: number;
  };
}

/**
 * Generate morning briefing for a workspace
 */
export async function generateMorningBriefing(
  workspaceId: string = DEFAULT_WORKSPACE_ID
): Promise<MorningBriefingData> {
  const today = new Date();
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  // Yesterday boundaries
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const startOfYesterday = new Date(yesterday);
  startOfYesterday.setHours(0, 0, 0, 0);
  const endOfYesterday = new Date(yesterday);
  endOfYesterday.setHours(23, 59, 59, 999);

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
    todayTasks,
    allActiveObjectives,
    activeObjectivesWithBlockers,
    aiWorkQueue,
    yesterdayCompleted,
    yesterdayInsights,
    yesterdayBlockersResolved,
  ] = await Promise.all([
    // Tasks due today or high priority
    prisma.task.findMany({
      where: {
        workspaceId,
        completedAt: null,
        archivedAt: null,
        OR: [
          { dueAt: { gte: startOfToday, lte: endOfToday } },
          { priority: { lte: 2 } }, // Urgent (1) or High (2)
        ],
      },
      select: {
        id: true,
        title: true,
        effortPoints: true,
        priority: true,
        dueAt: true,
        company: { select: { name: true } },
      },
      orderBy: [
        { priority: 'asc' },
        { dueAt: 'asc' },
      ],
      take: 10, // Top 10 tasks
    }),

    // All active objectives for metrics
    prisma.objective.findMany({
      where: {
        workspaceId,
        status: 'active',
        completedAt: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        progressPercent: true,
        deadline: true,
        company: { select: { name: true } },
      },
    }),

    // Objectives with blockers
    prisma.objective.findMany({
      where: {
        workspaceId,
        status: 'active',
        completedAt: null,
        blockers: {
          some: {
            resolvedAt: null,
          },
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        progressPercent: true,
        deadline: true,
        company: { select: { name: true } },
        blockers: {
          where: { resolvedAt: null },
          select: { id: true },
        },
      },
    }),

    // AI Work Queue (unclaimed tasks)
    prisma.aIWorkQueue.findMany({
      where: {
        workspaceId,
        completedAt: null,
        claimedAt: null,
      },
      select: {
        id: true,
        priority: true,
      },
    }),

    // Yesterday's completed tasks
    prisma.task.count({
      where: {
        workspaceId,
        completedAt: { gte: startOfYesterday, lte: endOfYesterday },
      },
    }),

    // Yesterday's insights
    prisma.aIInsight.count({
      where: {
        workspaceId,
        createdAt: { gte: startOfYesterday, lte: endOfYesterday },
      },
    }),

    // Yesterday's resolved blockers
    prisma.objectiveBlocker.count({
      where: {
        objective: { workspaceId },
        resolvedAt: { gte: startOfYesterday, lte: endOfYesterday },
      },
    }),
  ]);

  // Process today's tasks
  const todayTasksFormatted = todayTasks.map(task => ({
    id: task.id,
    title: task.title,
    effortPoints: task.effortPoints,
    spaceName: task.company?.name || null,
    priority: task.priority,
  }));

  // Process objectives needing attention
  const objectivesNeedingAttention: MorningBriefingData['objectivesNeedingAttention'] = [];
  
  for (const obj of allActiveObjectives) {
    const daysLeft = Math.ceil((new Date(obj.deadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const progress = obj.progressPercent.toNumber();
    const hasBlockers = activeObjectivesWithBlockers.some(blocked => blocked.id === obj.id);
    const blockerCount = hasBlockers
      ? activeObjectivesWithBlockers.find(blocked => blocked.id === obj.id)?.blockers.length || 0
      : 0;
    
    // Flag objectives that need attention:
    // - Has active blockers
    // - Behind schedule (less than 50% progress with less than 50% time remaining)
    // - Approaching deadline with low progress (< 30 days left and < 80% complete)
    const timeElapsedPercent = daysLeft <= 0 ? 100 : 0; // Simplified
    const needsAttention = 
      hasBlockers ||
      (daysLeft < 30 && progress < 80) ||
      obj.status === 'at_risk' ||
      obj.status === 'blocked';
    
    if (needsAttention) {
      objectivesNeedingAttention.push({
        id: obj.id,
        title: obj.title,
        spaceName: obj.company?.name || null,
        progressPercent: progress,
        daysLeft,
        status: obj.status,
        blockerCount,
        hasBlockers,
      });
    }
  }

  // Sort objectives by priority (blockers first, then at risk, then by days left)
  objectivesNeedingAttention.sort((a, b) => {
    if (a.hasBlockers && !b.hasBlockers) return -1;
    if (!a.hasBlockers && b.hasBlockers) return 1;
    if (a.status === 'at_risk' && b.status !== 'at_risk') return -1;
    if (a.status !== 'at_risk' && b.status === 'at_risk') return 1;
    return a.daysLeft - b.daysLeft;
  });

  // Process AI work queue
  const aiWorkQueueStats = {
    totalReady: aiWorkQueue.length,
    byPriority: {
      urgent: aiWorkQueue.filter(q => q.priority === 1).length,
      high: aiWorkQueue.filter(q => q.priority === 2).length,
      medium: aiWorkQueue.filter(q => q.priority === 3).length,
      low: aiWorkQueue.filter(q => q.priority >= 4).length,
    },
  };

  // Calculate key metrics
  const keyMetrics = {
    objectivesOnTrack: allActiveObjectives.filter(obj => 
      obj.status === 'active' && 
      !activeObjectivesWithBlockers.some(blocked => blocked.id === obj.id)
    ).length,
    objectivesAtRisk: allActiveObjectives.filter(obj => obj.status === 'at_risk').length,
    objectivesBlocked: activeObjectivesWithBlockers.length,
  };

  return {
    date: today.toISOString().split('T')[0],
    workspace: {
      id: workspace.id,
      name: workspace.name,
    },
    todayTasks: todayTasksFormatted,
    objectivesNeedingAttention: objectivesNeedingAttention.slice(0, 5), // Top 5
    aiWorkQueue: aiWorkQueueStats,
    yesterdayStats: {
      tasksCompleted: yesterdayCompleted,
      insightsGenerated: yesterdayInsights,
      blockersResolved: yesterdayBlockersResolved,
    },
    keyMetrics,
  };
}

/**
 * Format morning briefing for Telegram (MarkdownV2)
 */
export function formatMorningBriefingForTelegram(briefing: MorningBriefingData): string {
  const lines: string[] = [];
  
  // Header
  const date = new Date(briefing.date);
  const dateStr = date.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  lines.push(`🌅 *Morning Briefing* \\- ${escapeMarkdown(dateStr)}`);
  lines.push('');

  // Today's Tasks
  if (briefing.todayTasks.length > 0) {
    lines.push('👤 *Your Tasks Today:*');
    for (const task of briefing.todayTasks.slice(0, 5)) {
      const effortStr = task.effortPoints ? ` (${task.effortPoints}pt)` : '';
      const spaceStr = task.spaceName ? ` \\- ${escapeMarkdown(task.spaceName)}` : '';
      lines.push(`• ${escapeMarkdown(task.title)}${effortStr}${spaceStr}`);
    }
    lines.push('');
  }

  // Objectives Needing Attention
  if (briefing.objectivesNeedingAttention.length > 0) {
    lines.push('🎯 *Objectives Needing Attention:*');
    for (const obj of briefing.objectivesNeedingAttention) {
      const spaceStr = obj.spaceName ? `${escapeMarkdown(obj.spaceName)} \\- ` : '';
      const statusEmoji = obj.hasBlockers ? '🚫' : obj.daysLeft < 7 ? '⚠️' : '⏰';
      const blockerNote = obj.hasBlockers ? ` \\- BLOCKED (${obj.blockerCount} issues)` : '';
      lines.push(`• ${spaceStr}${escapeMarkdown(obj.title)}: ${obj.progressPercent}% complete, ${obj.daysLeft} days left ${statusEmoji}${blockerNote}`);
    }
    lines.push('');
  }

  // AI Work Queue
  if (briefing.aiWorkQueue.totalReady > 0) {
    const { byPriority } = briefing.aiWorkQueue;
    const priorityParts: string[] = [];
    if (byPriority.urgent > 0) priorityParts.push(`${byPriority.urgent} urgent`);
    if (byPriority.high > 0) priorityParts.push(`${byPriority.high} high`);
    if (byPriority.medium > 0) priorityParts.push(`${byPriority.medium} medium`);
    
    const priorityStr = priorityParts.length > 0 ? ` (${priorityParts.join(', ')})` : '';
    lines.push(`🤖 *AI Work Queue:* ${briefing.aiWorkQueue.totalReady} tasks ready${priorityStr}`);
    lines.push('');
  }

  // Yesterday's Stats
  const stats = briefing.yesterdayStats;
  if (stats.tasksCompleted > 0 || stats.insightsGenerated > 0 || stats.blockersResolved > 0) {
    const yesterdayParts: string[] = [];
    if (stats.tasksCompleted > 0) yesterdayParts.push(`${stats.tasksCompleted} tasks completed`);
    if (stats.insightsGenerated > 0) yesterdayParts.push(`${stats.insightsGenerated} insights generated`);
    if (stats.blockersResolved > 0) yesterdayParts.push(`${stats.blockersResolved} blockers resolved`);
    
    lines.push(`📊 *Yesterday:* ${yesterdayParts.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Escape special characters for Telegram MarkdownV2
 */
function escapeMarkdown(text: string): string {
  // Telegram MarkdownV2 requires escaping these characters: _ * [ ] ( ) ~ ` > # + - = | { } . !
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

/**
 * Store briefing as ActivityLog entry
 */
export async function storeBriefing(
  workspaceId: string,
  briefingText: string,
  briefingData: MorningBriefingData
) {
  await prisma.activityLog.create({
    data: {
      workspaceId,
      eventType: 'morning_briefing',
      eventPayload: JSON.parse(JSON.stringify({
        text: briefingText,
        data: briefingData,
        generatedAt: new Date().toISOString(),
      })),
      createdBy: '00000000-0000-0000-0000-000000000000', // System user
      aiAgent: 'morning-briefing-generator',
    },
  });
}
