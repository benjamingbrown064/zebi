'use server'

import { prisma } from '@/lib/prisma'

export interface TodayTask {
  id: string
  title: string
  priority: number
  category: 'main' | 'secondary' | 'additional' | 'other'
  todayOrder: number
}

export interface TodaySelection {
  main: TodayTask[]        // Must complete (1)
  secondary: TodayTask[]   // Need to complete (2)
  additional: TodayTask[]  // Nice to complete (3)
  other: TodayTask[]       // Additional (5)
}

/**
 * Get today's selected tasks grouped by category
 */
export async function getTodaySelection(workspaceId: string): Promise<TodaySelection> {
  try {
    const today = new Date().toISOString().split('T')[0]

    const tasks = await prisma.task.findMany({
      where: {
        workspaceId,
        todayPinDate: new Date(today),
        archivedAt: null,
      },
      select: {
        id: true,
        title: true,
        priority: true,
        todayCategory: true,
        todayOrder: true,
      },
      orderBy: { todayOrder: 'asc' },
    })

    const selection: TodaySelection = {
      main: [],
      secondary: [],
      additional: [],
      other: [],
    }

    tasks.forEach(task => {
      const taskObj = {
        id: task.id,
        title: task.title,
        priority: task.priority,
        category: (task.todayCategory || 'other') as 'main' | 'secondary' | 'additional' | 'other',
        todayOrder: task.todayOrder || 0,
      }

      if (task.todayCategory === 'main') {
        selection.main.push(taskObj)
      } else if (task.todayCategory === 'secondary') {
        selection.secondary.push(taskObj)
      } else if (task.todayCategory === 'additional') {
        selection.additional.push(taskObj)
      } else {
        selection.other.push(taskObj)
      }
    })

    return selection
  } catch (err) {
    console.error('getTodaySelection error:', err)
    return { main: [], secondary: [], additional: [], other: [] }
  }
}

/**
 * Set a task to today with category
 */
export async function setTaskForToday(
  workspaceId: string,
  taskId: string,
  category: 'main' | 'secondary' | 'additional' | 'other',
  todayOrder: number
): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Verify task belongs to workspace
    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId },
    })

    if (!task) {
      console.error('setTaskForToday: task not found')
      return false
    }

    await prisma.task.update({
      where: { id: taskId },
      data: {
        todayPinDate: new Date(today),
        todayCategory: category,
        todayOrder,
      },
    })

    return true
  } catch (err) {
    console.error('setTaskForToday error:', err)
    return false
  }
}

/**
 * Remove task from today
 */
export async function removeTaskFromToday(
  workspaceId: string,
  taskId: string
): Promise<boolean> {
  try {
    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId },
    })

    if (!task) {
      console.error('removeTaskFromToday: task not found')
      return false
    }

    await prisma.task.update({
      where: { id: taskId },
      data: {
        todayPinDate: null,
        todayCategory: null,
        todayOrder: null,
      },
    })

    return true
  } catch (err) {
    console.error('removeTaskFromToday error:', err)
    return false
  }
}

/**
 * Reorder tasks within a category
 */
export async function reorderTodayTasks(
  workspaceId: string,
  updates: Array<{ taskId: string; order: number }>
): Promise<boolean> {
  try {
    for (const update of updates) {
      const task = await prisma.task.findFirst({
        where: { id: update.taskId, workspaceId },
      })

      if (!task) continue

      await prisma.task.update({
        where: { id: update.taskId },
        data: { todayOrder: update.order },
      })
    }

    return true
  } catch (err) {
    console.error('reorderTodayTasks error:', err)
    return false
  }
}
