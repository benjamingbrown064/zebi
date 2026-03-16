'use server'

import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

export interface ShareLink {
  id: string
  taskId: string
  workspaceId: string
  shareSlug: string
  isActive: boolean
  createdBy: string
  createdAt: string
  revokedAt: string | null
}

export interface SharedTask {
  id: string
  title: string
  description: string | null
  priority: number
  status: string
  dueAt: string | null
  goalName: string | null
  comments: {
    body: string
    createdAt: string
  }[]
}

/**
 * Create a share link for a task
 */
export async function createShareLink(
  taskId: string,
  workspaceId: string,
  userId: string
): Promise<ShareLink | null> {
  try {
    // SECURITY: Verify task belongs to workspace
    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId }
    })

    if (!task) {
      console.error('createShareLink: task not found or does not belong to workspace')
      return null
    }

    // Check if an active share link already exists
    const existing = await prisma.shareLink.findFirst({
      where: { taskId, isActive: true }
    })

    if (existing) {
      return {
        id: existing.id,
        taskId: existing.taskId,
        workspaceId: existing.workspaceId,
        shareSlug: existing.shareSlug,
        isActive: existing.isActive,
        createdBy: existing.createdBy,
        createdAt: existing.createdAt.toISOString(),
        revokedAt: existing.revokedAt?.toISOString() ?? null,
      }
    }

    // Generate unique slug
    const shareSlug = nanoid(10)

    const shareLink = await prisma.shareLink.create({
      data: {
        taskId,
        workspaceId,
        shareSlug,
        createdBy: userId,
        isActive: true,
      }
    })

    return {
      id: shareLink.id,
      taskId: shareLink.taskId,
      workspaceId: shareLink.workspaceId,
      shareSlug: shareLink.shareSlug,
      isActive: shareLink.isActive,
      createdBy: shareLink.createdBy,
      createdAt: shareLink.createdAt.toISOString(),
      revokedAt: shareLink.revokedAt?.toISOString() ?? null,
    }
  } catch (err) {
    console.error('createShareLink error:', err)
    return null
  }
}

/**
 * Get existing share link for a task
 */
export async function getShareLink(
  taskId: string,
  workspaceId: string
): Promise<ShareLink | null> {
  try {
    const shareLink = await prisma.shareLink.findFirst({
      where: { taskId, workspaceId, isActive: true }
    })

    if (!shareLink) return null

    return {
      id: shareLink.id,
      taskId: shareLink.taskId,
      workspaceId: shareLink.workspaceId,
      shareSlug: shareLink.shareSlug,
      isActive: shareLink.isActive,
      createdBy: shareLink.createdBy,
      createdAt: shareLink.createdAt.toISOString(),
      revokedAt: shareLink.revokedAt?.toISOString() ?? null,
    }
  } catch (err) {
    console.error('getShareLink error:', err)
    return null
  }
}

/**
 * Revoke (delete) a share link
 */
export async function revokeShareLink(
  linkId: string,
  workspaceId: string,
  userId: string
): Promise<boolean> {
  try {
    // SECURITY: Verify share link belongs to workspace
    const shareLink = await prisma.shareLink.findFirst({
      where: { id: linkId, workspaceId }
    })

    if (!shareLink) {
      console.error('revokeShareLink: share link not found or does not belong to workspace')
      return false
    }

    await prisma.shareLink.update({
      where: { id: linkId },
      data: {
        isActive: false,
        revokedAt: new Date(),
      }
    })

    return true
  } catch (err) {
    console.error('revokeShareLink error:', err)
    return false
  }
}

/**
 * Get shared task by slug (public endpoint, no auth required)
 */
export async function getTaskByShareSlug(slug: string): Promise<SharedTask | null> {
  try {
    // Find active share link
    const shareLink = await prisma.shareLink.findFirst({
      where: { shareSlug: slug, isActive: true }
    })

    if (!shareLink) {
      return null
    }

    // Get task with limited info (public view)
    const task = await prisma.task.findUnique({
      where: { id: shareLink.taskId },
      include: {
        status: true,
        goal: true,
        comments: {
          orderBy: { createdAt: 'asc' },
          take: 20, // Limit comments for public view
        },
      }
    })

    if (!task) return null

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status.name,
      dueAt: task.dueAt?.toISOString() ?? null,
      goalName: task.goal?.name ?? null,
      comments: task.comments.map(c => ({
        body: typeof c.bodyRich === 'object' && c.bodyRich !== null && 'text' in c.bodyRich
          ? String((c.bodyRich as { text: string }).text)
          : '',
        createdAt: c.createdAt.toISOString(),
      })),
    }
  } catch (err) {
    console.error('getTaskByShareSlug error:', err)
    return null
  }
}
