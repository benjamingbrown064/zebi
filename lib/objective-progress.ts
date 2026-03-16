/**
 * Objective Progress Calculation (V2)
 * 
 * Auto-calculates progress from task completion.
 * Implements explicit task deduplication to prevent double-counting.
 * 
 * Spec: /Users/botbot/.openclaw/workspace/zebi/docs/OBJECTIVE_PROGRESS_SPEC_V2.md
 */

import { prisma } from '@/lib/prisma';

/**
 * Calculate progress for an objective based on task completion
 * 
 * Formula: progressPercent = (completed_unique_active_linked_tasks / total_unique_active_linked_tasks) * 100
 * 
 * CRITICAL: Task deduplication by ID
 * - Tasks can be linked both directly to objective AND via project
 * - Must count each task only ONCE using DISTINCT ON task.id
 * 
 * @param objectiveId - Objective to recalculate
 * @returns { progressPercent, completedTaskCount, totalTaskCount }
 */
export async function calculateObjectiveProgressOptimized(objectiveId: string) {
  // Get objective with mode check
  const objective = await prisma.objective.findUnique({
    where: { id: objectiveId },
    select: { 
      id: true, 
      progressMode: true,
      workspaceId: true
    }
  });

  if (!objective) {
    throw new Error(`Objective ${objectiveId} not found`);
  }

  // Skip if manual mode
  if (objective.progressMode === 'manual') {
    return {
      progressPercent: 0,
      completedTaskCount: 0,
      totalTaskCount: 0,
      skipped: true,
      reason: 'manual_mode'
    };
  }

  // Find all linked tasks (deduplicated by task ID)
  // A task is linked if:
  // 1. Task.objectiveId = this objective, OR
  // 2. Task.projectId → Project.objectiveId = this objective
  
  const linkedTasksQuery = await prisma.$queryRaw<Array<{ id: string, completed: boolean }>>`
    WITH linked_tasks AS (
      -- Direct objective tasks
      SELECT DISTINCT t.id, t."completedAt" IS NOT NULL AS completed
      FROM "Task" t
      WHERE t."objectiveId" = ${objectiveId}
        AND t."archivedAt" IS NULL
      
      UNION
      
      -- Tasks linked via projects
      SELECT DISTINCT t.id, t."completedAt" IS NOT NULL AS completed
      FROM "Task" t
      INNER JOIN "Project" p ON t."projectId" = p.id
      WHERE p."objectiveId" = ${objectiveId}
        AND p."archivedAt" IS NULL
        AND t."archivedAt" IS NULL
    )
    SELECT DISTINCT id, completed
    FROM linked_tasks
  `;

  // Count totals
  const totalTaskCount = linkedTasksQuery.length;
  const completedTaskCount = linkedTasksQuery.filter(t => t.completed).length;
  
  // Calculate percentage (avoid division by zero)
  const progressPercent = totalTaskCount > 0 
    ? Math.round((completedTaskCount / totalTaskCount) * 100) 
    : 0;

  return {
    progressPercent,
    completedTaskCount,
    totalTaskCount,
    skipped: false
  };
}

/**
 * Recalculate and persist objective progress
 * 
 * Updates Objective.progressPercent, completedTaskCount, totalTaskCount, lastProgressRecalc
 * 
 * @param objectiveId - Objective to recalculate
 * @returns Updated objective
 */
export async function recalculateObjectiveProgress(objectiveId: string) {
  const result = await calculateObjectiveProgressOptimized(objectiveId);

  if (result.skipped) {
    return { skipped: true, reason: result.reason };
  }

  // Persist to database
  const updated = await prisma.objective.update({
    where: { id: objectiveId },
    data: {
      progressPercent: result.progressPercent,
      completedTaskCount: result.completedTaskCount,
      totalTaskCount: result.totalTaskCount,
      lastProgressRecalc: new Date()
    },
    select: {
      id: true,
      title: true,
      progressPercent: true,
      completedTaskCount: true,
      totalTaskCount: true,
      lastProgressRecalc: true
    }
  });

  return { skipped: false, objective: updated };
}

/**
 * Queue objective progress recalculation (async)
 * 
 * Uses a simple in-memory deduplication window (2 seconds).
 * For production scale, migrate to Upstash queue.
 * 
 * @param objectiveId - Objective to recalculate
 */
const recalcQueue = new Map<string, NodeJS.Timeout>();

export function queueObjectiveRecalculation(objectiveId: string) {
  // Clear existing timer for this objective
  const existing = recalcQueue.get(objectiveId);
  if (existing) {
    clearTimeout(existing);
  }

  // Set new timer (2-second deduplication window)
  const timer = setTimeout(async () => {
    try {
      await recalculateObjectiveProgress(objectiveId);
      recalcQueue.delete(objectiveId);
    } catch (error) {
      console.error(`[Objective Progress] Failed to recalculate ${objectiveId}:`, error);
      recalcQueue.delete(objectiveId);
    }
  }, 2000);

  recalcQueue.set(objectiveId, timer);
}

/**
 * Find all objectives affected by a task change
 * 
 * A task affects an objective if:
 * 1. Task.objectiveId = objective, OR
 * 2. Task.projectId → Project.objectiveId = objective
 * 
 * @param taskId - Task that changed
 * @returns Array of affected objective IDs
 */
export async function getAffectedObjectives(taskId: string): Promise<string[]> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      objectiveId: true,
      projectId: true,
      project: {
        select: { objectiveId: true }
      }
    }
  });

  if (!task) return [];

  const objectiveIds = new Set<string>();
  
  // Direct objective link
  if (task.objectiveId) {
    objectiveIds.add(task.objectiveId);
  }

  // Indirect via project
  if (task.project?.objectiveId) {
    objectiveIds.add(task.project.objectiveId);
  }

  return Array.from(objectiveIds);
}

/**
 * Trigger recalculation for all objectives affected by a task change
 * 
 * Called from task create/update/delete handlers
 * 
 * @param taskId - Task that changed
 */
export async function recalculateAffectedObjectives(taskId: string) {
  const objectiveIds = await getAffectedObjectives(taskId);
  
  for (const objectiveId of objectiveIds) {
    queueObjectiveRecalculation(objectiveId);
  }

  return { affectedObjectives: objectiveIds.length };
}
