// AI Work Queue - Priority Logic & Queue Management

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Priority levels (lower number = higher priority)
export const QUEUE_PRIORITIES = {
  REPEATING: 1,   // Scheduled repeating tasks (highest priority)
  URGENT: 2,      // Urgent tasks with near deadlines
  ACTIVE: 3,      // Currently active tasks
  RESEARCH: 4,    // Research and analysis tasks
  STRATEGIC: 5,   // Strategic planning tasks (lowest priority)
} as const;

export const QUEUE_TYPES = {
  TASK: 'task',
  ANALYSIS: 'analysis',
  RESEARCH: 'research',
  INSIGHT: 'insight',
  MEMORY: 'memory',
} as const;

export interface QueueItem {
  id: string;
  workspaceId: string;
  taskId?: string | null;
  priority: number;
  queueType: string;
  contextData: any;
  scheduledFor: Date;
  claimedAt?: Date | null;
  claimedBy?: string | null;
  completedAt?: Date | null;
  workLog?: any;
  failureReason?: string | null;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get the next available work item from the queue
 * Priority order: repeating → urgent → active → research → strategic
 */
export async function getNextQueueItem(
  workspaceId: string,
  claimedBy: string = 'doug-ai'
): Promise<QueueItem | null> {
  try {
    // Find the highest priority unclaimed item that's scheduled to run
    const item = await prisma.aIWorkQueue.findFirst({
      where: {
        workspaceId,
        completedAt: null,
        claimedAt: null,
        scheduledFor: {
          lte: new Date(),
        },
        retryCount: {
          lt: 3, // Max 3 retries
        },
      },
      orderBy: [
        { priority: 'asc' },      // Lower priority number = higher priority
        { scheduledFor: 'asc' },  // Earlier scheduled items first
        { createdAt: 'asc' },     // Older items first
      ],
    });

    if (!item) {
      return null;
    }

    // Claim the item
    const claimedItem = await prisma.aIWorkQueue.update({
      where: { id: item.id },
      data: {
        claimedAt: new Date(),
        claimedBy,
      },
    });

    return claimedItem as QueueItem;
  } catch (error) {
    console.error('Error getting next queue item:', error);
    throw error;
  }
}

/**
 * Mark a queue item as completed
 */
export async function completeQueueItem(
  itemId: string,
  workLog: any
): Promise<QueueItem> {
  try {
    const completed = await prisma.aIWorkQueue.update({
      where: { id: itemId },
      data: {
        completedAt: new Date(),
        workLog,
      },
    });

    return completed as QueueItem;
  } catch (error) {
    console.error('Error completing queue item:', error);
    throw error;
  }
}

/**
 * Mark a queue item as failed and increment retry count
 */
export async function failQueueItem(
  itemId: string,
  failureReason: string
): Promise<QueueItem> {
  try {
    const failed = await prisma.aIWorkQueue.update({
      where: { id: itemId },
      data: {
        claimedAt: null,
        claimedBy: null,
        failureReason,
        retryCount: {
          increment: 1,
        },
      },
    });

    return failed as QueueItem;
  } catch (error) {
    console.error('Error failing queue item:', error);
    throw error;
  }
}

/**
 * Add a new item to the work queue
 */
export async function addToQueue(params: {
  workspaceId: string;
  taskId?: string;
  priority: number;
  queueType: string;
  contextData: any;
  scheduledFor?: Date;
}): Promise<QueueItem> {
  try {
    const item = await prisma.aIWorkQueue.create({
      data: {
        workspaceId: params.workspaceId,
        taskId: params.taskId,
        priority: params.priority,
        queueType: params.queueType,
        contextData: params.contextData,
        scheduledFor: params.scheduledFor || new Date(),
      },
    });

    return item as QueueItem;
  } catch (error) {
    console.error('Error adding to queue:', error);
    throw error;
  }
}

/**
 * Get queue status overview
 */
export async function getQueueStatus(workspaceId: string) {
  try {
    const [total, pending, claimed, completed, failed] = await Promise.all([
      // Total items
      prisma.aIWorkQueue.count({
        where: { workspaceId },
      }),
      // Pending (unclaimed, not completed, ready to run)
      prisma.aIWorkQueue.count({
        where: {
          workspaceId,
          completedAt: null,
          claimedAt: null,
          scheduledFor: { lte: new Date() },
          retryCount: { lt: 3 },
        },
      }),
      // Currently claimed
      prisma.aIWorkQueue.count({
        where: {
          workspaceId,
          completedAt: null,
          claimedAt: { not: null },
        },
      }),
      // Completed
      prisma.aIWorkQueue.count({
        where: {
          workspaceId,
          completedAt: { not: null },
        },
      }),
      // Failed (max retries)
      prisma.aIWorkQueue.count({
        where: {
          workspaceId,
          completedAt: null,
          retryCount: { gte: 3 },
        },
      }),
    ]);

    // Get breakdown by priority
    const byPriority = await prisma.aIWorkQueue.groupBy({
      by: ['priority'],
      where: {
        workspaceId,
        completedAt: null,
        claimedAt: null,
        scheduledFor: { lte: new Date() },
      },
      _count: true,
    });

    // Get breakdown by type
    const byType = await prisma.aIWorkQueue.groupBy({
      by: ['queueType'],
      where: {
        workspaceId,
        completedAt: null,
      },
      _count: true,
    });

    // Get next scheduled items
    const upcoming = await prisma.aIWorkQueue.findMany({
      where: {
        workspaceId,
        completedAt: null,
        claimedAt: null,
        scheduledFor: { gt: new Date() },
      },
      orderBy: { scheduledFor: 'asc' },
      take: 5,
      select: {
        id: true,
        queueType: true,
        priority: true,
        scheduledFor: true,
        contextData: true,
      },
    });

    return {
      summary: {
        total,
        pending,
        claimed,
        completed,
        failed,
      },
      breakdown: {
        byPriority: byPriority.map((p) => ({
          priority: p.priority,
          priorityName: getPriorityName(p.priority),
          count: p._count,
        })),
        byType: byType.map((t) => ({
          type: t.queueType,
          count: t._count,
        })),
      },
      upcoming,
    };
  } catch (error) {
    console.error('Error getting queue status:', error);
    throw error;
  }
}

/**
 * Get human-readable priority name
 */
function getPriorityName(priority: number): string {
  switch (priority) {
    case QUEUE_PRIORITIES.REPEATING:
      return 'Repeating';
    case QUEUE_PRIORITIES.URGENT:
      return 'Urgent';
    case QUEUE_PRIORITIES.ACTIVE:
      return 'Active';
    case QUEUE_PRIORITIES.RESEARCH:
      return 'Research';
    case QUEUE_PRIORITIES.STRATEGIC:
      return 'Strategic';
    default:
      return `Priority ${priority}`;
  }
}

/**
 * Determine priority based on task properties
 */
export function calculateTaskPriority(task: {
  repeatingTaskId?: string | null;
  priority?: number;
  dueAt?: Date | null;
}): number {
  // Repeating tasks get highest priority
  if (task.repeatingTaskId) {
    return QUEUE_PRIORITIES.REPEATING;
  }

  // Urgent: due within 24 hours
  if (task.dueAt) {
    const hoursUntilDue = (task.dueAt.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilDue <= 24 && hoursUntilDue > 0) {
      return QUEUE_PRIORITIES.URGENT;
    }
  }

  // Map task priority to queue priority
  if (task.priority === 1) return QUEUE_PRIORITIES.URGENT;
  if (task.priority === 2) return QUEUE_PRIORITIES.ACTIVE;
  if (task.priority === 3) return QUEUE_PRIORITIES.ACTIVE;
  if (task.priority === 4) return QUEUE_PRIORITIES.RESEARCH;
  if (task.priority === 5) return QUEUE_PRIORITIES.STRATEGIC;

  return QUEUE_PRIORITIES.ACTIVE; // Default
}

/**
 * Clean up old completed items (older than 30 days)
 */
export async function cleanupOldQueueItems(workspaceId: string): Promise<number> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.aIWorkQueue.deleteMany({
      where: {
        workspaceId,
        completedAt: {
          not: null,
          lt: thirtyDaysAgo,
        },
      },
    });

    return result.count;
  } catch (error) {
    console.error('Error cleaning up queue items:', error);
    throw error;
  }
}
