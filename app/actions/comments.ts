'use server'

import { prisma } from '@/lib/prisma'
import { parseMentions, User } from '@/lib/mentions'

export interface TaskComment {
  id: string
  taskId: string
  workspaceId: string
  body: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export async function getTaskComments(taskId: string, workspaceId: string): Promise<TaskComment[]> {
  try {
    // SECURITY: Verify task belongs to workspace
    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId }
    })

    if (!task) {
      console.error('getTaskComments: task not found or does not belong to workspace')
      return []
    }

    const comments = await prisma.taskComment.findMany({
      where: { taskId, workspaceId },
      orderBy: { createdAt: 'asc' }
    })

    return comments.map((c) => ({
      id: c.id,
      taskId: c.taskId,
      workspaceId: c.workspaceId,
      body: typeof c.bodyRich === 'object' && c.bodyRich !== null && 'text' in c.bodyRich 
        ? String((c.bodyRich as { text: string }).text) 
        : '',
      createdBy: c.createdBy,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }))
  } catch (err) {
    console.error('getTaskComments error:', err)
    return []
  }
}

export async function createComment(
  taskId: string,
  workspaceId: string,
  userId: string,
  body: string,
  workspaceMembers?: User[]
): Promise<TaskComment | null> {
  try {
    // SECURITY: Verify task belongs to workspace
    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId }
    })

    if (!task) {
      console.error('createComment: task not found or does not belong to workspace')
      return null
    }

    // Store body as JSON with text field for compatibility with bodyRich schema
    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        workspaceId,
        createdBy: userId,
        bodyRich: { text: body },
      }
    })

    // TODO: Parse mentions and create notifications
    // if (workspaceMembers && workspaceMembers.length > 0) {
    //   const { mentionedUserIds } = parseMentions(body, workspaceMembers)
    //   if (mentionedUserIds.length > 0) {
    //     await createMentionNotifications(mentionedUserIds, userId, taskId, workspaceId)
    //   }
    // }

    return {
      id: comment.id,
      taskId: comment.taskId,
      workspaceId: comment.workspaceId,
      body,
      createdBy: comment.createdBy,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    }
  } catch (err) {
    console.error('createComment error:', err)
    return null
  }
}

export async function deleteComment(
  commentId: string,
  workspaceId: string,
  userId: string
): Promise<boolean> {
  try {
    // SECURITY: Verify comment exists and user is author or workspace owner
    const comment = await prisma.taskComment.findFirst({
      where: { id: commentId, workspaceId }
    })

    if (!comment) {
      console.error('deleteComment: comment not found or does not belong to workspace')
      return false
    }

    // Check if user is author
    if (comment.createdBy !== userId) {
      // Check if user is workspace owner
      const workspace = await prisma.workspace.findFirst({
        where: { id: workspaceId, ownerId: userId }
      })

      if (!workspace) {
        console.error('deleteComment: user is not author or workspace owner')
        return false
      }
    }

    await prisma.taskComment.delete({
      where: { id: commentId }
    })

    return true
  } catch (err) {
    console.error('deleteComment error:', err)
    return false
  }
}
