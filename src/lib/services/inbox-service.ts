/**
 * Inbox Service
 * Handles inbox item CRUD operations and conversions
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export type InboxItemSource = 'text' | 'voice' | 'ai_generated' | 'import' | 'email'
export type InboxItemStatus = 'unprocessed' | 'processed' | 'converted' | 'completed' | 'archived'

export interface CreateInboxItemParams {
  workspaceId: string
  createdBy: string
  rawText: string
  sourceType: InboxItemSource
  transcript?: string
  assigneeId?: string
  projectId?: string
  dueDate?: Date
  priority?: number
  metadata?: Record<string, any>
}

export interface UpdateInboxItemParams {
  rawText?: string
  cleanedText?: string
  assigneeId?: string | null
  projectId?: string | null
  dueDate?: Date | null
  priority?: number | null
  status?: InboxItemStatus
  aiProcessed?: boolean
  aiSummary?: string
  aiSuggestions?: Record<string, any>
  processedAt?: Date
}

export interface InboxItemFilters {
  status?: InboxItemStatus | InboxItemStatus[]
  sourceType?: InboxItemSource
  createdBy?: string
  projectId?: string
  assigneeId?: string
  fromDate?: Date
  toDate?: Date
}

/**
 * Create a new inbox item
 */
export async function createInboxItem(params: CreateInboxItemParams) {
  const { metadata, ...rest } = params
  
  return await prisma.inboxItem.create({
    data: {
      ...rest,
      metadata: metadata ? metadata : Prisma.JsonNull,
      capturedAt: new Date(),
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })
}

/**
 * Get inbox items with filters
 */
export async function getInboxItems(
  workspaceId: string,
  filters?: InboxItemFilters,
  limit = 50,
  offset = 0
) {
  const where: Prisma.InboxItemWhereInput = {
    workspaceId,
  }

  if (filters) {
    if (filters.status) {
      where.status = Array.isArray(filters.status)
        ? { in: filters.status }
        : filters.status
    }
    if (filters.sourceType) {
      where.sourceType = filters.sourceType
    }
    if (filters.createdBy) {
      where.createdBy = filters.createdBy
    }
    if (filters.projectId) {
      where.projectId = filters.projectId
    }
    if (filters.assigneeId) {
      where.assigneeId = filters.assigneeId
    }
    if (filters.fromDate || filters.toDate) {
      where.capturedAt = {}
      if (filters.fromDate) {
        where.capturedAt.gte = filters.fromDate
      }
      if (filters.toDate) {
        where.capturedAt.lte = filters.toDate
      }
    }
  }

  const [items, total] = await Promise.all([
    prisma.inboxItem.findMany({
      where,
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        capturedAt: 'desc',
      },
      take: limit,
      skip: offset,
    }),
    prisma.inboxItem.count({ where }),
  ])

  return {
    items,
    total,
    limit,
    offset,
  }
}

/**
 * Get a single inbox item
 */
export async function getInboxItem(id: string) {
  return await prisma.inboxItem.findUnique({
    where: { id },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })
}

/**
 * Update an inbox item
 */
export async function updateInboxItem(id: string, params: UpdateInboxItemParams) {
  const { aiSuggestions, ...rest } = params
  
  return await prisma.inboxItem.update({
    where: { id },
    data: {
      ...rest,
      aiSuggestions: aiSuggestions ? aiSuggestions : Prisma.JsonNull,
      updatedAt: new Date(),
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })
}

/**
 * Delete an inbox item
 */
export async function deleteInboxItem(id: string) {
  return await prisma.inboxItem.delete({
    where: { id },
  })
}

/**
 * Convert an inbox item to a task
 */
export async function convertInboxItemToTask(
  inboxItemId: string,
  taskData: {
    title: string
    description?: string
    statusId: string
    workspaceId: string
    assigneeId?: string
    projectId?: string
    dueAt?: Date
    priority?: number
    createdBy: string
  }
) {
  // Create the task
  const task = await prisma.task.create({
    data: {
      ...taskData,
      aiGenerated: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })

  // Update the inbox item
  await prisma.inboxItem.update({
    where: { id: inboxItemId },
    data: {
      status: 'converted',
      convertedTaskIds: [task.id],
      processedAt: new Date(),
    },
  })

  return task
}

/**
 * Get inbox stats for a workspace
 */
export async function getInboxStats(workspaceId: string, userId?: string) {
  const where: Prisma.InboxItemWhereInput = {
    workspaceId,
  }

  if (userId) {
    where.createdBy = userId
  }

  const [total, unprocessed, processed, converted, completed] = await Promise.all([
    prisma.inboxItem.count({ where }),
    prisma.inboxItem.count({ where: { ...where, status: 'unprocessed' } }),
    prisma.inboxItem.count({ where: { ...where, status: 'processed' } }),
    prisma.inboxItem.count({ where: { ...where, status: 'converted' } }),
    prisma.inboxItem.count({ where: { ...where, status: 'completed' } }),
  ])

  return {
    total,
    unprocessed,
    processed,
    converted,
    completed,
    archived: total - unprocessed - processed - converted - completed,
  }
}

/**
 * Bulk update inbox items
 */
export async function bulkUpdateInboxItems(
  ids: string[],
  params: UpdateInboxItemParams
) {
  const { aiSuggestions, ...rest } = params
  
  return await prisma.inboxItem.updateMany({
    where: {
      id: { in: ids },
    },
    data: {
      ...rest,
      aiSuggestions: aiSuggestions ? aiSuggestions : Prisma.JsonNull,
      updatedAt: new Date(),
    },
  })
}

/**
 * Bulk delete inbox items
 */
export async function bulkDeleteInboxItems(ids: string[]) {
  return await prisma.inboxItem.deleteMany({
    where: {
      id: { in: ids },
    },
  })
}
