/**
 * Orchestration Resilience Layer
 *
 * Adds fault-tolerance, retry logic, deadlock detection, and
 * recovery mechanisms for the agent orchestration system.
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// ============================================================
// TYPES
// ============================================================

export interface RetryConfig {
  maxAttempts: number
  backoffMs: number
  maxBackoffMs: number
  jitter: boolean
}

export interface HandoffValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface DeadlockDetectionResult {
  hasDeadlock: boolean
  cycle?: string[]
  affectedTasks: string[]
  suggestedResolution?: string
}

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  backoffMs: 1000,
  maxBackoffMs: 30000,
  jitter: true,
}

const HANDOFF_TIMEOUT_HOURS = 48
const STUCK_TASK_TIMEOUT_HOURS = 72
const VALID_AGENTS = ['harvey', 'theo', 'doug', 'casper', 'ben']

// ============================================================
// RETRY UTILITIES
// ============================================================

/**
 * Execute an async operation with exponential backoff retry.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      
      if (attempt === cfg.maxAttempts) break

      // Calculate backoff with optional jitter
      let backoff = Math.min(cfg.backoffMs * Math.pow(2, attempt - 1), cfg.maxBackoffMs)
      if (cfg.jitter) {
        backoff = backoff * (0.5 + Math.random() * 0.5)
      }

      await new Promise(resolve => setTimeout(resolve, backoff))
    }
  }

  throw lastError || new Error('Retry failed without error')
}

/**
 * Wrap a Prisma transaction with retry logic.
 */
export async function withRetriedTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  return withRetry(
    () => prisma.$transaction(callback, {
      maxWait: 10000,
      timeout: 30000,
    }),
    config
  )
}

// ============================================================
// HANDOFF VALIDATION
// ============================================================

/**
 * Validate a handoff before creation to catch issues early.
 */
export async function validateHandoff(params: {
  workspaceId: string
  fromAgent: string
  toAgent: string
  taskId?: string
  summary: string
  requestedOutcome: string
  completedWork: string
  remainingWork: string
}): Promise<HandoffValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  // Agent validation
  if (!VALID_AGENTS.includes(params.fromAgent)) {
    errors.push(`Invalid fromAgent: ${params.fromAgent}`)
  }
  if (!VALID_AGENTS.includes(params.toAgent)) {
    errors.push(`Invalid toAgent: ${params.toAgent}`)
  }
  if (params.fromAgent === params.toAgent) {
    warnings.push('Handoff to self detected — consider using task update instead')
  }

  // Content validation
  if (!params.summary.trim()) errors.push('Summary is required')
  if (!params.requestedOutcome.trim()) errors.push('Requested outcome is required')
  if (!params.remainingWork.trim()) errors.push('Remaining work description is required')

  // Check for duplicate pending handoffs
  if (params.taskId) {
    const existing = await prisma.handoff.findFirst({
      where: {
        workspaceId: params.workspaceId,
        taskId: params.taskId,
        status: 'pending',
      },
    })
    if (existing) {
      warnings.push(`A pending handoff already exists for task ${params.taskId}`)
    }
  }

  // Check if target agent is overwhelmed
  const targetWorkload = await prisma.task.count({
    where: {
      workspaceId: params.workspaceId,
      ownerAgent: params.toAgent,
      completedAt: null,
      archivedAt: null,
    },
  })
  if (targetWorkload > 20) {
    warnings.push(`Target agent ${params.toAgent} has ${targetWorkload} active tasks — may be overloaded`)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================================
// TIMEOUT & CLEANUP
// ============================================================

/**
 * Find and mark stale handoffs as rejected.
 * Run periodically (e.g., daily cron).
 */
export async function cleanupStaleHandoffs(workspaceId: string): Promise<{
  expired: number
  taskIds: string[]
}> {
  const cutoff = new Date(Date.now() - HANDOFF_TIMEOUT_HOURS * 60 * 60 * 1000)

  const staleHandoffs = await prisma.handoff.findMany({
    where: {
      workspaceId,
      status: 'pending',
      createdAt: { lt: cutoff },
    },
    select: { id: true, taskId: true, toAgent: true },
  })

  if (staleHandoffs.length === 0) return { expired: 0, taskIds: [] }

  await prisma.handoff.updateMany({
    where: { id: { in: staleHandoffs.map(h => h.id) } },
    data: { status: 'rejected' },
  })

  // Log activity
  for (const handoff of staleHandoffs) {
    await prisma.activityLog.create({
      data: {
        workspaceId,
        eventType: 'handoff_expired',
        eventPayload: {
          handoffId: handoff.id,
          taskId: handoff.taskId,
          toAgent: handoff.toAgent,
          reason: `No action taken within ${HANDOFF_TIMEOUT_HOURS}h`,
        },
        createdBy: '00000000-0000-0000-0000-000000000000',
        aiAgent: 'system',
      },
    }).catch(() => {})
  }

  return {
    expired: staleHandoffs.length,
    taskIds: staleHandoffs.map(h => h.taskId).filter((id): id is string => id !== null),
  }
}

/**
 * Find tasks stuck in waitingOn state for too long.
 */
export async function detectStuckTasks(workspaceId: string): Promise<{
  taskId: string
  title: string
  waitingOn: string | null
  blockedReason: string | null
  stuckSince: Date
}[]> {
  const cutoff = new Date(Date.now() - STUCK_TASK_TIMEOUT_HOURS * 60 * 60 * 1000)

  const tasks = await prisma.task.findMany({
    where: {
      workspaceId,
      completedAt: null,
      archivedAt: null,
      updatedAt: { lt: cutoff },
      OR: [
        { waitingOn: { not: null } },
        { blockedReason: { not: null } },
      ],
    },
    select: {
      id: true,
      title: true,
      waitingOn: true,
      blockedReason: true,
      updatedAt: true,
    },
  })

  return tasks.map(t => ({
    taskId: t.id,
    title: t.title,
    waitingOn: t.waitingOn,
    blockedReason: t.blockedReason,
    stuckSince: t.updatedAt,
  }))
}

// ============================================================
// DEADLOCK DETECTION
// ============================================================

/**
 * Detect circular dependencies in task waitingOn relationships.
 * Returns cycles if found.
 */
export async function detectDeadlocks(workspaceId: string): Promise<DeadlockDetectionResult> {
  const tasks = await prisma.task.findMany({
    where: {
      workspaceId,
      completedAt: null,
      archivedAt: null,
      waitingOn: { not: null },
    },
    select: {
      id: true,
      title: true,
      ownerAgent: true,
      waitingOn: true,
    },
  })

  // Build adjacency graph: taskId -> waitingOnAgent
  const graph = new Map<string, string>()
  const tasksByAgent = new Map<string, string[]>()

  for (const task of tasks) {
    if (task.waitingOn && VALID_AGENTS.includes(task.waitingOn)) {
      graph.set(task.id, task.waitingOn)
      if (!tasksByAgent.has(task.ownerAgent ?? '')) {
        tasksByAgent.set(task.ownerAgent ?? '', [])
      }
      tasksByAgent.get(task.ownerAgent ?? '')!.push(task.id)
    }
  }

  // Detect cycle: if agent A owns task waiting on agent B,
  // and agent B owns task waiting on agent A => deadlock
  const agentEdges = new Map<string, Set<string>>()
  for (const [taskId, waitingAgent] of graph.entries()) {
    const ownerTask = tasks.find(t => t.id === taskId)
    if (ownerTask?.ownerAgent) {
      if (!agentEdges.has(ownerTask.ownerAgent)) {
        agentEdges.set(ownerTask.ownerAgent, new Set())
      }
      agentEdges.get(ownerTask.ownerAgent)!.add(waitingAgent)
    }
  }

  // Simple cycle detection (2-agent cycle)
  for (const [agentA, waiting] of agentEdges.entries()) {
    for (const agentB of waiting) {
      if (agentEdges.get(agentB)?.has(agentA)) {
        const affectedTasks = [
          ...(tasksByAgent.get(agentA) ?? []),
          ...(tasksByAgent.get(agentB) ?? []),
        ]
        return {
          hasDeadlock: true,
          cycle: [agentA, agentB, agentA],
          affectedTasks,
          suggestedResolution: `Break the cycle by reassigning tasks or clearing waitingOn for ${agentA} or ${agentB}`,
        }
      }
    }
  }

  return { hasDeadlock: false, affectedTasks: [] }
}

// ============================================================
// SAFE HANDOFF CREATION
// ============================================================

/**
 * Create a handoff with full validation and atomicity.
 */
export async function createResilientHandoff(params: {
  workspaceId: string
  fromAgent: string
  toAgent: string
  taskId?: string
  companyId?: string
  projectId?: string
  summary: string
  requestedOutcome: string
  completedWork: string
  remainingWork: string
  blockers: string
  filesChanged?: string[]
  linkedDocIds?: string[]
  decisionNeeded?: boolean
  decisionSummary?: string | null
}): Promise<{ success: boolean; handoff?: any; error?: string; warnings?: string[] }> {
  
  // Validate first
  const validation = await validateHandoff(params)
  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.join('; '),
      warnings: validation.warnings,
    }
  }

  try {
    const handoff = await withRetriedTransaction(async (tx) => {
      // Create handoff
      const newHandoff = await tx.handoff.create({
        data: {
          workspaceId: params.workspaceId,
          taskId: params.taskId ?? null,
          companyId: params.companyId ?? null,
          projectId: params.projectId ?? null,
          fromAgent: params.fromAgent,
          toAgent: params.toAgent,
          summary: params.summary,
          requestedOutcome: params.requestedOutcome,
          completedWork: params.completedWork,
          remainingWork: params.remainingWork,
          blockers: params.blockers,
          filesChanged: params.filesChanged ?? [],
          linkedDocIds: params.linkedDocIds ?? [],
          decisionNeeded: params.decisionNeeded ?? false,
          decisionSummary: params.decisionSummary ?? null,
          status: 'pending',
        },
      })

      // Update task if linked
      if (params.taskId) {
        await tx.task.update({
          where: { id: params.taskId },
          data: {
            handoffToAgent: params.toAgent,
            waitingOn: params.toAgent,
          },
        })
      }

      // Create wakeup message
      await tx.agentMessage.create({
        data: {
          workspaceId: params.workspaceId,
          threadId: '', // will be set to own id
          fromAgent: params.fromAgent,
          toAgent: params.toAgent,
          subject: `Handoff: ${params.summary}`,
          body: `${params.fromAgent} has handed off work to you.\n\n${params.requestedOutcome}\n\nRemaining: ${params.remainingWork}`,
          taskId: params.taskId ?? null,
          handoffId: newHandoff.id,
          companyId: params.companyId ?? null,
          projectId: params.projectId ?? null,
          actionRequired: true,
        },
      }).then(async (msg) => {
        await tx.agentMessage.update({
          where: { id: msg.id },
          data: { threadId: msg.id },
        })
      })

      // Log activity
      await tx.activityLog.create({
        data: {
          workspaceId: params.workspaceId,
          eventType: 'handoff_created',
          eventPayload: {
            handoffId: newHandoff.id,
            fromAgent: params.fromAgent,
            toAgent: params.toAgent,
            taskId: params.taskId ?? null,
            summary: params.summary,
          },
          createdBy: '00000000-0000-0000-0000-000000000000',
          aiAgent: params.fromAgent,
          taskId: params.taskId ?? null,
          companyId: params.companyId ?? null,
          projectId: params.projectId ?? null,
        },
      })

      return newHandoff
    })

    return {
      success: true,
      handoff,
      warnings: validation.warnings,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ============================================================
// TASK COMPLETION WITH HANDOFF CLEANUP
// ============================================================

/**
 * Mark a task as complete and clean up any related handoffs.
 */
export async function completeTaskWithCleanup(
  taskId: string,
  workspaceId: string,
  completionNote?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await withRetriedTransaction(async (tx) => {
      // Update task
      await tx.task.update({
        where: { id: taskId },
        data: {
          completedAt: new Date(),
          completionNote: completionNote ?? null,
          waitingOn: null,
          blockedReason: null,
        },
      })

      // Mark any pending handoffs as done
      await tx.handoff.updateMany({
        where: {
          workspaceId,
          taskId,
          status: { in: ['pending', 'accepted'] },
        },
        data: { status: 'done' },
      })

      // Clear work queue items
      await tx.aIWorkQueue.updateMany({
        where: {
          workspaceId,
          completedAt: null,
          contextData: {
            path: ['taskId'],
            equals: taskId,
          },
        },
        data: { completedAt: new Date() },
      })
    })

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ============================================================
// HEALTH CHECK
// ============================================================

/**
 * Run a full orchestration health check.
 */
export async function orchestrationHealthCheck(workspaceId: string): Promise<{
  healthy: boolean
  issues: string[]
  stats: {
    activeHandoffs: number
    staleHandoffs: number
    stuckTasks: number
    deadlockDetected: boolean
  }
}> {
  const issues: string[] = []

  const [
    activeHandoffs,
    staleResult,
    stuckTasks,
    deadlockResult,
  ] = await Promise.all([
    prisma.handoff.count({ where: { workspaceId, status: 'pending' } }),
    cleanupStaleHandoffs(workspaceId),
    detectStuckTasks(workspaceId),
    detectDeadlocks(workspaceId),
  ])

  if (staleResult.expired > 0) {
    issues.push(`${staleResult.expired} handoff(s) expired due to timeout`)
  }
  if (stuckTasks.length > 0) {
    issues.push(`${stuckTasks.length} task(s) stuck in blocked/waiting state for >72h`)
  }
  if (deadlockResult.hasDeadlock) {
    issues.push(`Deadlock detected: ${deadlockResult.cycle?.join(' -> ')}`)
    issues.push(deadlockResult.suggestedResolution ?? 'Manual intervention required')
  }

  return {
    healthy: issues.length === 0,
    issues,
    stats: {
      activeHandoffs,
      staleHandoffs: staleResult.expired,
      stuckTasks: stuckTasks.length,
      deadlockDetected: deadlockResult.hasDeadlock,
    },
  }
}
