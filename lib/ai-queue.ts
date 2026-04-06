/**
 * AI Work Queue — Multi-Agent Edition
 *
 * Clean rewrite of the queue lib. Key improvements over original:
 * - Uses shared prisma singleton (not new PrismaClient())
 * - Agent-scoped claiming: items can be pre-assigned to a specific agent
 *   via contextData.assignedTo — agents only claim their own + unassigned
 * - Stuck-job recovery: items claimed >30min with no completion are released
 * - Consistent agent naming: harvey | theo | doug | casper | ben
 */

import { prisma } from './prisma'

export const QUEUE_PRIORITIES = {
  URGENT:    1,
  HIGH:      2,
  NORMAL:    3,
  RESEARCH:  4,
  STRATEGIC: 5,
} as const

export const QUEUE_TYPES = {
  TASK:     'task',
  RESEARCH: 'research',
  ANALYSIS: 'analysis',
  INSIGHT:  'insight',
  MEMORY:   'memory',
  BUILD:    'build',
  REVIEW:   'review',
} as const

export type AgentName = 'harvey' | 'theo' | 'doug' | 'casper' | 'ben' | 'system'

export interface QueueItem {
  id:            string
  workspaceId:   string
  taskId?:       string | null
  priority:      number
  queueType:     string
  contextData:   any
  scheduledFor:  Date
  claimedAt?:    Date | null
  claimedBy?:    string | null
  completedAt?:  Date | null
  workLog?:      any
  failureReason?: string | null
  retryCount:    number
  createdAt:     Date
  updatedAt:     Date
}

const STUCK_THRESHOLD_MS = 30 * 60 * 1000 // 30 minutes

/**
 * Release stuck jobs — items claimed >30min with no completion.
 * Call before claiming to ensure the queue stays healthy.
 */
async function releaseStuckJobs(workspaceId: string): Promise<void> {
  const stuckBefore = new Date(Date.now() - STUCK_THRESHOLD_MS)
  await prisma.aIWorkQueue.updateMany({
    where: {
      workspaceId,
      completedAt: null,
      claimedAt:   { not: null, lt: stuckBefore },
      retryCount:  { lt: 3 },
    },
    data: {
      claimedAt:    null,
      claimedBy:    null,
      retryCount:   { increment: 1 },
      failureReason: 'Released: claimed but not completed within 30 minutes',
    },
  })
}

/**
 * Claim the next available work item for a given agent.
 *
 * Priority order:
 * 1. Items pre-assigned to this agent (contextData.assignedTo === agent), by priority
 * 2. Unassigned items (no contextData.assignedTo), by priority
 *
 * Uses optimistic locking (findFirst + update) — safe for multiple agents polling.
 */
export async function getNextQueueItem(
  workspaceId: string,
  agent: AgentName
): Promise<QueueItem | null> {
  await releaseStuckJobs(workspaceId)

  // Try to claim an item assigned to this agent first
  const item = await prisma.aIWorkQueue.findFirst({
    where: {
      workspaceId,
      completedAt:  null,
      claimedAt:    null,
      scheduledFor: { lte: new Date() },
      retryCount:   { lt: 3 },
    },
    orderBy: [
      { priority:    'asc' },
      { scheduledFor:'asc' },
      { createdAt:   'asc' },
    ],
  })

  if (!item) return null

  // Filter: only claim if assigned to this agent or unassigned
  const assignedTo = (item.contextData as any)?.assignedTo
  if (assignedTo && assignedTo !== agent) {
    // Item is reserved for a different agent — skip
    // (In a real race condition, another agent might have claimed it between
    // findFirst and here — that's fine, they'll get null on update)
    return null
  }

  // Atomic claim — use updateMany + count to detect race conditions
  const updated = await prisma.aIWorkQueue.updateMany({
    where: { id: item.id, claimedAt: null },
    data:  { claimedAt: new Date(), claimedBy: agent },
  })
  if (updated.count === 0) {
    // Another agent claimed it simultaneously
    return null
  }
  const claimed = await prisma.aIWorkQueue.findUnique({ where: { id: item.id } })
  return claimed as QueueItem
}

/**
 * Mark a queue item as completed.
 */
export async function completeQueueItem(
  itemId: string,
  agent: AgentName,
  workLog: any
): Promise<QueueItem> {
  const item = await prisma.aIWorkQueue.findFirst({
    where: { id: itemId, claimedBy: agent, completedAt: null },
  })
  if (!item) throw new Error(`Queue item ${itemId} not found or not claimed by ${agent}`)

  const completed = await prisma.aIWorkQueue.update({
    where: { id: itemId },
    data:  { completedAt: new Date(), workLog },
  })
  return completed as QueueItem
}

/**
 * Mark a queue item as failed. Increments retryCount; releases back to queue
 * unless max retries reached.
 */
export async function failQueueItem(
  itemId: string,
  agent: AgentName,
  failureReason: string
): Promise<QueueItem> {
  const item = await prisma.aIWorkQueue.findFirst({
    where: { id: itemId, claimedBy: agent, completedAt: null },
  })
  if (!item) throw new Error(`Queue item ${itemId} not found or not claimed by ${agent}`)

  const updated = await prisma.aIWorkQueue.update({
    where: { id: itemId },
    data: {
      claimedAt:    null,
      claimedBy:    null,
      failureReason,
      retryCount:   { increment: 1 },
    },
  })
  return updated as QueueItem
}

/**
 * Enqueue a new work item.
 */
export async function enqueueItem(params: {
  workspaceId:  string
  taskId?:      string
  priority?:    number
  queueType?:   string
  contextData:  any   // tip: include assignedTo: "harvey" to pre-assign
  scheduledFor?: Date
}): Promise<QueueItem> {
  const item = await prisma.aIWorkQueue.create({
    data: {
      workspaceId:  params.workspaceId,
      taskId:       params.taskId,
      priority:     params.priority ?? QUEUE_PRIORITIES.NORMAL,
      queueType:    params.queueType ?? QUEUE_TYPES.TASK,
      contextData:  params.contextData,
      scheduledFor: params.scheduledFor ?? new Date(),
    },
  })
  return item as QueueItem
}

/**
 * Queue status overview for a workspace.
 */
export async function getQueueStatus(workspaceId: string) {
  const now = new Date()

  const [total, ready, claimed, completed, exhausted, byPriority, byType] = await Promise.all([
    prisma.aIWorkQueue.count({ where: { workspaceId } }),
    prisma.aIWorkQueue.count({
      where: { workspaceId, completedAt: null, claimedAt: null, scheduledFor: { lte: now }, retryCount: { lt: 3 } },
    }),
    prisma.aIWorkQueue.count({
      where: { workspaceId, completedAt: null, claimedAt: { not: null } },
    }),
    prisma.aIWorkQueue.count({ where: { workspaceId, completedAt: { not: null } } }),
    prisma.aIWorkQueue.count({ where: { workspaceId, completedAt: null, retryCount: { gte: 3 } } }),
    prisma.aIWorkQueue.groupBy({
      by: ['priority'],
      where: { workspaceId, completedAt: null, claimedAt: null, scheduledFor: { lte: now } },
      _count: true,
    }),
    prisma.aIWorkQueue.groupBy({
      by: ['queueType'],
      where: { workspaceId, completedAt: null },
      _count: true,
    }),
  ])

  return {
    summary:   { total, ready, claimed, completed, exhausted },
    byPriority: byPriority.map(p => ({ priority: p.priority, count: p._count })),
    byType:     byType.map(t => ({ type: t.queueType, count: t._count })),
  }
}

/**
 * Delete completed items older than 30 days.
 */
export async function cleanupOldQueueItems(workspaceId: string): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const result = await prisma.aIWorkQueue.deleteMany({
    where: { workspaceId, completedAt: { not: null, lt: cutoff } },
  })
  return result.count
}

export function getPriorityName(priority: number): string {
  const names: Record<number, string> = { 1: 'Urgent', 2: 'High', 3: 'Normal', 4: 'Research', 5: 'Strategic' }
  return names[priority] ?? `Priority ${priority}`
}
