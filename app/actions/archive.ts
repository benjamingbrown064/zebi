'use server'

import { prisma } from '@/lib/prisma'

/**
 * Archive a single task
 * Sets archivedAt to current timestamp
 */
export async function archiveTask(
  workspaceId: string,
  taskId: string
): Promise<boolean> {
  try {
    // SECURITY: Verify task belongs to this workspace
    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, workspaceId }
    })

    if (!existingTask) {
      console.error('archiveTask: task not found or does not belong to workspace')
      return false
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { archivedAt: new Date() }
    })

    console.log(`Task ${taskId} archived`)
    return true
  } catch (err) {
    console.error('archiveTask error:', err)
    return false
  }
}

/**
 * Restore an archived task
 * Clears archivedAt but preserves completedAt
 */
export async function restoreTask(
  workspaceId: string,
  taskId: string
): Promise<boolean> {
  try {
    // SECURITY: Verify task belongs to this workspace
    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, workspaceId }
    })

    if (!existingTask) {
      console.error('restoreTask: task not found or does not belong to workspace')
      return false
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { archivedAt: null }
    })

    console.log(`Task ${taskId} restored`)
    return true
  } catch (err) {
    console.error('restoreTask error:', err)
    return false
  }
}

/**
 * Bulk archive tasks (used for bulk actions)
 */
export async function bulkArchiveTasks(
  workspaceId: string,
  taskIds: string[]
): Promise<number> {
  try {
    // Verify all tasks belong to workspace
    const existingCount = await prisma.task.count({
      where: {
        id: { in: taskIds },
        workspaceId
      }
    })

    if (existingCount !== taskIds.length) {
      console.error('bulkArchiveTasks: not all tasks found or do not belong to workspace')
      return 0
    }

    const result = await prisma.task.updateMany({
      where: {
        id: { in: taskIds },
        workspaceId
      },
      data: { archivedAt: new Date() }
    })

    console.log(`Bulk archived ${result.count} tasks`)
    return result.count
  } catch (err) {
    console.error('bulkArchiveTasks error:', err)
    return 0
  }
}

/**
 * Get completed (but not archived) tasks for a workspace
 * Used for "Completed" view in list
 */
export async function getCompletedTasks(
  workspaceId: string,
  limit: number = 100,
  offset: number = 0
): Promise<any[]> {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        workspaceId,
        completedAt: { not: null },
        archivedAt: null
      },
      include: {
        tags: {
          include: { tag: true }
        }
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
      skip: offset
    })

    return tasks
  } catch (err) {
    console.error('getCompletedTasks error:', err)
    return []
  }
}

/**
 * Get archived tasks for a workspace
 * Used for "Archived" view in list
 */
export async function getArchivedTasks(
  workspaceId: string,
  limit: number = 100,
  offset: number = 0
): Promise<any[]> {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        workspaceId,
        archivedAt: { not: null }
      },
      include: {
        tags: {
          include: { tag: true }
        }
      },
      orderBy: { archivedAt: 'desc' },
      take: limit,
      skip: offset
    })

    return tasks
  } catch (err) {
    console.error('getArchivedTasks error:', err)
    return []
  }
}

/**
 * Auto-archive completed tasks
 * Called by cron job at midnight UTC
 * Finds tasks where completedAt < now() - retention_period and archives them
 */
export async function autoArchiveCompleted(workspaceId: string): Promise<number> {
  try {
    // Get workspace
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    })

    if (!workspace) {
      console.error('autoArchiveCompleted: workspace not found')
      return 0
    }

    // Default retention: 7 days (auto-archive disabled for now as field not in schema)
    const retentionDays = 7
    
    // Calculate cutoff date
    const now = new Date()
    const cutoffDate = new Date(
      now.getTime() - retentionDays * 24 * 60 * 60 * 1000
    )

    // Find and archive eligible tasks
    const result = await prisma.task.updateMany({
      where: {
        workspaceId,
        completedAt: { not: null, lt: cutoffDate },
        archivedAt: null
      },
      data: { archivedAt: now }
    })

    console.log(
      `Auto-archived ${result.count} tasks in workspace ${workspaceId}. ` +
      `Retention: ${retentionDays} days, cutoff: ${cutoffDate.toISOString()}`
    )
    return result.count
  } catch (err) {
    console.error('autoArchiveCompleted error:', err)
    return 0
  }
}

/**
 * Get archive retention settings for a workspace
 * Returns default 7 days (field removed from schema)
 */
export async function getArchiveSettings(workspaceId: string) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    })

    if (!workspace) {
      console.error('getArchiveSettings: workspace not found')
      return { autoArchiveRetentionDays: 7 }
    }

    // Default retention: 7 days
    return { autoArchiveRetentionDays: 7 }
  } catch (err) {
    console.error('getArchiveSettings error:', err)
    return { autoArchiveRetentionDays: 7 }
  }
}

/**
 * Update archive retention settings for a workspace
 * Currently disabled (field removed from schema)
 */
export async function updateArchiveSettings(
  workspaceId: string,
  autoArchiveRetentionDays: number
): Promise<boolean> {
  try {
    // Placeholder - archive retention removed from schema
    console.log(`Archive retention update requested for workspace ${workspaceId} to ${autoArchiveRetentionDays} days (disabled)`)
    return true
  } catch (err) {
    console.error('updateArchiveSettings error:', err)
    return false
  }
}
