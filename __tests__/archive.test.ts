/**
 * Task Archiving Feature Tests
 * 
 * Tests for:
 * - archiveTask()
 * - restoreTask()
 * - bulkArchiveTasks()
 * - autoArchiveCompleted()
 * - getCompletedTasks()
 * - getArchivedTasks()
 * - getArchiveSettings()
 * - updateArchiveSettings()
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
  archiveTask,
  restoreTask,
  bulkArchiveTasks,
  autoArchiveCompleted,
  getCompletedTasks,
  getArchivedTasks,
  getArchiveSettings,
  updateArchiveSettings,
} from '@/app/actions/archive'
import { createTask, updateTask } from '@/app/actions/tasks'

// Mock workspace and user
const TEST_WORKSPACE_ID = 'test-workspace-123'
const TEST_USER_ID = 'test-user-456'

describe('Archive Actions', () => {
  beforeEach(async () => {
    // Setup: Create test workspace
    await prisma.workspace.upsert({
      where: { id: TEST_WORKSPACE_ID },
      create: {
        id: TEST_WORKSPACE_ID,
        name: 'Test Workspace',
        ownerId: TEST_USER_ID as any,
        plan: 'free',
      },
      update: {},
    })

    // Setup: Create inbox status
    await prisma.status.upsert({
      where: { workspaceId_name: { workspaceId: TEST_WORKSPACE_ID, name: 'Inbox' } },
      create: {
        workspaceId: TEST_WORKSPACE_ID,
        name: 'Inbox',
        type: 'inbox',
        isSystem: true,
      },
      update: {},
    })
  })

  afterEach(async () => {
    // Cleanup
    await prisma.task.deleteMany({ where: { workspaceId: TEST_WORKSPACE_ID } })
    await prisma.status.deleteMany({ where: { workspaceId: TEST_WORKSPACE_ID } })
    await prisma.workspace.delete({ where: { id: TEST_WORKSPACE_ID } })
  })

  describe('archiveTask()', () => {
    it('should archive a task', async () => {
      const task = await createTask(TEST_WORKSPACE_ID, TEST_USER_ID, {
        title: 'Test task',
        statusId: (await prisma.status.findFirst({ where: { workspaceId: TEST_WORKSPACE_ID } }))!.id,
      })

      expect(task).not.toBeNull()

      const result = await archiveTask(TEST_WORKSPACE_ID, task!.id)
      expect(result).toBe(true)

      const archivedTask = await prisma.task.findUnique({
        where: { id: task!.id },
      })

      expect(archivedTask?.archivedAt).not.toBeNull()
    })

    it('should return false if task does not belong to workspace', async () => {
      const result = await archiveTask(TEST_WORKSPACE_ID, 'non-existent-id')
      expect(result).toBe(false)
    })

    it('should preserve completedAt when archiving', async () => {
      const completedDate = new Date('2024-01-15')
      const task = await createTask(TEST_WORKSPACE_ID, TEST_USER_ID, {
        title: 'Completed task',
        statusId: (await prisma.status.findFirst({ where: { workspaceId: TEST_WORKSPACE_ID } }))!.id,
      })

      // Mark as completed
      await updateTask(TEST_WORKSPACE_ID, task!.id, {
        completedAt: completedDate.toISOString(),
      })

      // Archive
      await archiveTask(TEST_WORKSPACE_ID, task!.id)

      const archived = await prisma.task.findUnique({
        where: { id: task!.id },
      })

      expect(archived?.completedAt?.getTime()).toBe(completedDate.getTime())
      expect(archived?.archivedAt).not.toBeNull()
    })
  })

  describe('restoreTask()', () => {
    it('should restore an archived task', async () => {
      const task = await createTask(TEST_WORKSPACE_ID, TEST_USER_ID, {
        title: 'Test task',
        statusId: (await prisma.status.findFirst({ where: { workspaceId: TEST_WORKSPACE_ID } }))!.id,
      })

      // Archive
      await archiveTask(TEST_WORKSPACE_ID, task!.id)

      // Restore
      const result = await restoreTask(TEST_WORKSPACE_ID, task!.id)
      expect(result).toBe(true)

      const restoredTask = await prisma.task.findUnique({
        where: { id: task!.id },
      })

      expect(restoredTask?.archivedAt).toBeNull()
    })

    it('should preserve completedAt when restoring', async () => {
      const completedDate = new Date('2024-01-15')
      const task = await createTask(TEST_WORKSPACE_ID, TEST_USER_ID, {
        title: 'Completed task',
        statusId: (await prisma.status.findFirst({ where: { workspaceId: TEST_WORKSPACE_ID } }))!.id,
      })

      // Mark as completed and archive
      await updateTask(TEST_WORKSPACE_ID, task!.id, {
        completedAt: completedDate.toISOString(),
      })
      await archiveTask(TEST_WORKSPACE_ID, task!.id)

      // Restore
      await restoreTask(TEST_WORKSPACE_ID, task!.id)

      const restored = await prisma.task.findUnique({
        where: { id: task!.id },
      })

      expect(restored?.completedAt?.getTime()).toBe(completedDate.getTime())
      expect(restored?.archivedAt).toBeNull()
    })
  })

  describe('bulkArchiveTasks()', () => {
    it('should archive multiple tasks', async () => {
      const statusId = (await prisma.status.findFirst({ where: { workspaceId: TEST_WORKSPACE_ID } }))!.id

      const task1 = await createTask(TEST_WORKSPACE_ID, TEST_USER_ID, {
        title: 'Task 1',
        statusId,
      })
      const task2 = await createTask(TEST_WORKSPACE_ID, TEST_USER_ID, {
        title: 'Task 2',
        statusId,
      })

      const archivedCount = await bulkArchiveTasks(TEST_WORKSPACE_ID, [task1!.id, task2!.id])
      expect(archivedCount).toBe(2)

      const archived = await prisma.task.findMany({
        where: { id: { in: [task1!.id, task2!.id] } },
      })

      expect(archived).toHaveLength(2)
      expect(archived.every(t => t.archivedAt !== null)).toBe(true)
    })

    it('should return 0 if any task does not belong to workspace', async () => {
      const task = await createTask(TEST_WORKSPACE_ID, TEST_USER_ID, {
        title: 'Task 1',
        statusId: (await prisma.status.findFirst({ where: { workspaceId: TEST_WORKSPACE_ID } }))!.id,
      })

      const archivedCount = await bulkArchiveTasks(TEST_WORKSPACE_ID, [task!.id, 'non-existent-id'])
      expect(archivedCount).toBe(0)
    })
  })

  describe('getCompletedTasks()', () => {
    it('should return completed but not archived tasks', async () => {
      const statusId = (await prisma.status.findFirst({ where: { workspaceId: TEST_WORKSPACE_ID } }))!.id
      const now = new Date()

      // Create completed task
      const task1 = await createTask(TEST_WORKSPACE_ID, TEST_USER_ID, {
        title: 'Completed task',
        statusId,
      })
      await updateTask(TEST_WORKSPACE_ID, task1!.id, {
        completedAt: now.toISOString(),
      })

      // Create completed + archived task
      const task2 = await createTask(TEST_WORKSPACE_ID, TEST_USER_ID, {
        title: 'Archived task',
        statusId,
      })
      await updateTask(TEST_WORKSPACE_ID, task2!.id, {
        completedAt: now.toISOString(),
      })
      await archiveTask(TEST_WORKSPACE_ID, task2!.id)

      // Create incomplete task
      await createTask(TEST_WORKSPACE_ID, TEST_USER_ID, {
        title: 'Incomplete task',
        statusId,
      })

      const completed = await getCompletedTasks(TEST_WORKSPACE_ID)

      expect(completed).toHaveLength(1)
      expect(completed[0].id).toBe(task1!.id)
      expect(completed[0].completedAt).not.toBeNull()
      expect(completed[0].archivedAt).toBeNull()
    })
  })

  describe('getArchivedTasks()', () => {
    it('should return archived tasks', async () => {
      const statusId = (await prisma.status.findFirst({ where: { workspaceId: TEST_WORKSPACE_ID } }))!.id

      // Create archived task
      const task1 = await createTask(TEST_WORKSPACE_ID, TEST_USER_ID, {
        title: 'Archived task 1',
        statusId,
      })
      await archiveTask(TEST_WORKSPACE_ID, task1!.id)

      // Create another archived task
      const task2 = await createTask(TEST_WORKSPACE_ID, TEST_USER_ID, {
        title: 'Archived task 2',
        statusId,
      })
      await archiveTask(TEST_WORKSPACE_ID, task2!.id)

      // Create active task
      await createTask(TEST_WORKSPACE_ID, TEST_USER_ID, {
        title: 'Active task',
        statusId,
      })

      const archived = await getArchivedTasks(TEST_WORKSPACE_ID)

      expect(archived).toHaveLength(2)
      expect(archived.every(t => t.archivedAt !== null)).toBe(true)
    })
  })

  describe('getArchiveSettings()', () => {
    it('should return workspace archive settings', async () => {
      const settings = await getArchiveSettings(TEST_WORKSPACE_ID)

      expect(settings).toHaveProperty('autoArchiveRetentionDays')
      expect(settings.autoArchiveRetentionDays).toBe(7) // Default
    })

    it('should return default if workspace not found', async () => {
      const settings = await getArchiveSettings('non-existent-workspace')

      expect(settings.autoArchiveRetentionDays).toBe(7)
    })
  })

  describe('updateArchiveSettings()', () => {
    it('should update retention days', async () => {
      const result = await updateArchiveSettings(TEST_WORKSPACE_ID, 14)
      expect(result).toBe(true)

      const settings = await getArchiveSettings(TEST_WORKSPACE_ID)
      expect(settings.autoArchiveRetentionDays).toBe(14)
    })

    it('should handle setting retention to 0 (never)', async () => {
      const result = await updateArchiveSettings(TEST_WORKSPACE_ID, 0)
      expect(result).toBe(true)

      const settings = await getArchiveSettings(TEST_WORKSPACE_ID)
      expect(settings.autoArchiveRetentionDays).toBe(0)
    })

    it('should reject negative values', async () => {
      const result = await updateArchiveSettings(TEST_WORKSPACE_ID, -1)
      expect(result).toBe(false)
    })
  })

  describe('autoArchiveCompleted()', () => {
    it('should archive completed tasks older than retention period', async () => {
      await updateArchiveSettings(TEST_WORKSPACE_ID, 7) // 7 days

      const statusId = (await prisma.status.findFirst({ where: { workspaceId: TEST_WORKSPACE_ID } }))!.id

      // Create task completed 8 days ago (should be archived)
      const eightDaysAgo = new Date()
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)

      const task1 = await prisma.task.create({
        data: {
          workspaceId: TEST_WORKSPACE_ID,
          statusId,
          title: 'Old completed task',
          createdBy: TEST_USER_ID as any,
          completedAt: eightDaysAgo,
        },
      })

      // Create task completed 3 days ago (should NOT be archived)
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

      const task2 = await prisma.task.create({
        data: {
          workspaceId: TEST_WORKSPACE_ID,
          statusId,
          title: 'Recent completed task',
          createdBy: TEST_USER_ID as any,
          completedAt: threeDaysAgo,
        },
      })

      // Run auto-archive
      const archivedCount = await autoArchiveCompleted(TEST_WORKSPACE_ID)

      expect(archivedCount).toBe(1)

      const archived1 = await prisma.task.findUnique({ where: { id: task1.id } })
      const archived2 = await prisma.task.findUnique({ where: { id: task2.id } })

      expect(archived1?.archivedAt).not.toBeNull()
      expect(archived2?.archivedAt).toBeNull()
    })

    it('should skip auto-archive if retention is 0', async () => {
      await updateArchiveSettings(TEST_WORKSPACE_ID, 0) // Never auto-archive

      const statusId = (await prisma.status.findFirst({ where: { workspaceId: TEST_WORKSPACE_ID } }))!.id

      const eightDaysAgo = new Date()
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)

      await prisma.task.create({
        data: {
          workspaceId: TEST_WORKSPACE_ID,
          statusId,
          title: 'Old completed task',
          createdBy: TEST_USER_ID as any,
          completedAt: eightDaysAgo,
        },
      })

      const archivedCount = await autoArchiveCompleted(TEST_WORKSPACE_ID)

      expect(archivedCount).toBe(0)
    })
  })

  describe('Query Filtering', () => {
    it('should filter out archived tasks in getTasks()', async () => {
      const statusId = (await prisma.status.findFirst({ where: { workspaceId: TEST_WORKSPACE_ID } }))!.id

      // Create active task
      await createTask(TEST_WORKSPACE_ID, TEST_USER_ID, {
        title: 'Active task',
        statusId,
      })

      // Create archived task
      const archived = await createTask(TEST_WORKSPACE_ID, TEST_USER_ID, {
        title: 'Archived task',
        statusId,
      })
      await archiveTask(TEST_WORKSPACE_ID, archived!.id)

      // Query should only return active task
      const allTasks = await prisma.task.findMany({
        where: {
          workspaceId: TEST_WORKSPACE_ID,
          archivedAt: null,
        },
      })

      expect(allTasks).toHaveLength(1)
      expect(allTasks[0].title).toBe('Active task')
    })
  })
})
