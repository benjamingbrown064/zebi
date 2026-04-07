// Taskbox Database Utilities
// CRUD operations for Taskbox boards, tasks, and automation logs

import { prisma } from '@/lib/prisma';
import type {
  TaskboxBoard,
  TaskboxTask,
  TaskboxAutomationLog,
  TaskboxTaskFilters,
  CreateTaskboxBoardRequest,
  UpdateTaskboxBoardRequest,
  CreateTaskboxTaskRequest,
  UpdateTaskboxTaskRequest,
} from './types';

// ==================== BOARDS ====================

export async function createTaskboxBoard(
  workspaceId: string,
  userId: string,
  data: CreateTaskboxBoardRequest
): Promise<TaskboxBoard> {
  const board = await prisma.taskboxBoard.create({
    data: {
      workspaceId,
      createdBy: userId,
      name: data.name,
      description: data.description,
      columns: data.columns || ['todo', 'in_progress', 'done'],
      automationRules: data.automationRules || null,
    },
  });

  return board as unknown as TaskboxBoard;
}

export async function getTaskboxBoards(
  workspaceId: string
): Promise<TaskboxBoard[]> {
  const boards = await prisma.taskboxBoard.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });

  return boards as unknown as TaskboxBoard[];
}

export async function getTaskboxBoard(
  id: string,
  workspaceId: string
): Promise<TaskboxBoard | null> {
  const board = await prisma.taskboxBoard.findFirst({
    where: { id, workspaceId },
  });

  return board as unknown as TaskboxBoard | null;
}

export async function updateTaskboxBoard(
  id: string,
  workspaceId: string,
  data: UpdateTaskboxBoardRequest
): Promise<TaskboxBoard> {
  const board = await prisma.taskboxBoard.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.columns && { columns: data.columns }),
      ...(data.automationRules !== undefined && {
        automationRules: data.automationRules,
      }),
    },
  });

  return board as unknown as TaskboxBoard;
}

export async function deleteTaskboxBoard(
  id: string,
  workspaceId: string
): Promise<void> {
  await prisma.taskboxBoard.delete({
    where: { id },
  });
}

// ==================== TASKS ====================

export async function createTaskboxTask(
  workspaceId: string,
  userId: string,
  data: CreateTaskboxTaskRequest
): Promise<TaskboxTask> {
  const task = await prisma.taskboxTask.create({
    data: {
      workspaceId,
      createdBy: userId,
      boardId: data.boardId,
      companyId: data.companyId,
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      status: data.status || 'todo',
      priority: data.priority || 3,
      assignedTo: data.assignedTo,
      dueAt: data.dueAt ? new Date(data.dueAt) : null,
      tags: data.tags || [],
      labels: data.labels || [],
      automationEnabled: data.automationEnabled || false,
      automationRules: data.automationRules || null,
    },
  });

  return task as unknown as TaskboxTask;
}

export async function getTaskboxTasks(
  workspaceId: string,
  filters?: TaskboxTaskFilters
): Promise<TaskboxTask[]> {
  const where: any = { workspaceId };

  if (filters) {
    if (filters.boardId) {
      where.boardId = filters.boardId;
    }
    if (filters.status) {
      where.status = Array.isArray(filters.status)
        ? { in: filters.status }
        : filters.status;
    }
    if (filters.assignedTo) {
      where.assignedTo = filters.assignedTo;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }
    if (filters.companyId) {
      where.companyId = filters.companyId;
    }
    if (filters.projectId) {
      where.projectId = filters.projectId;
    }
    if (filters.dueBefore) {
      where.dueAt = { ...where.dueAt, lte: new Date(filters.dueBefore) };
    }
    if (filters.dueAfter) {
      where.dueAt = { ...where.dueAt, gte: new Date(filters.dueAfter) };
    }
    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }
    if (filters.labels && filters.labels.length > 0) {
      where.labels = { hasSome: filters.labels };
    }
  }

  const tasks = await prisma.taskboxTask.findMany({
    where,
    orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
  });

  return tasks as unknown as TaskboxTask[];
}

export async function getTaskboxTask(
  id: string,
  workspaceId: string
): Promise<TaskboxTask | null> {
  const task = await prisma.taskboxTask.findFirst({
    where: { id, workspaceId },
  });

  return task as unknown as TaskboxTask | null;
}

export async function updateTaskboxTask(
  id: string,
  workspaceId: string,
  data: UpdateTaskboxTaskRequest
): Promise<TaskboxTask> {
  const updateData: any = {};

  if (data.boardId !== undefined) updateData.boardId = data.boardId;
  if (data.title) updateData.title = data.title;
  if (data.description !== undefined)
    updateData.description = data.description;
  if (data.status) updateData.status = data.status;
  if (data.priority) updateData.priority = data.priority;
  if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
  if (data.dueAt !== undefined)
    updateData.dueAt = data.dueAt ? new Date(data.dueAt) : null;
  if (data.blockedReason !== undefined)
    updateData.blockedReason = data.blockedReason;
  if (data.tags) updateData.tags = data.tags;
  if (data.labels) updateData.labels = data.labels;
  if (data.position !== undefined) updateData.position = data.position;
  if (data.automationEnabled !== undefined)
    updateData.automationEnabled = data.automationEnabled;
  if (data.automationRules !== undefined)
    updateData.automationRules = data.automationRules;

  // Auto-set blockedAt when blockedReason is set
  if (data.blockedReason && data.status === 'blocked') {
    updateData.blockedAt = new Date();
  }

  // Auto-set completedAt when status changes to done
  if (data.status === 'done') {
    updateData.completedAt = new Date();
  }

  const task = await prisma.taskboxTask.update({
    where: { id },
    data: updateData,
  });

  return task as unknown as TaskboxTask;
}

export async function deleteTaskboxTask(
  id: string,
  workspaceId: string
): Promise<void> {
  await prisma.taskboxTask.delete({
    where: { id },
  });
}

// ==================== AUTOMATION LOGS ====================

export async function createTaskboxAutomationLog(data: {
  taskId?: string;
  boardId?: string;
  triggerType: string;
  actionType: string;
  status?: 'pending' | 'executed' | 'failed';
  metadata?: Record<string, any>;
}): Promise<TaskboxAutomationLog> {
  const log = await prisma.taskboxAutomationLog.create({
    data: {
      taskId: data.taskId,
      boardId: data.boardId,
      triggerType: data.triggerType,
      actionType: data.actionType,
      status: data.status || 'pending',
      metadata: data.metadata || null,
    },
  });

  return log as unknown as TaskboxAutomationLog;
}

export async function getTaskboxAutomationLogs(params: {
  taskId?: string;
  boardId?: string;
  status?: 'pending' | 'executed' | 'failed';
  limit?: number;
}): Promise<TaskboxAutomationLog[]> {
  const where: any = {};

  if (params.taskId) where.taskId = params.taskId;
  if (params.boardId) where.boardId = params.boardId;
  if (params.status) where.status = params.status;

  const logs = await prisma.taskboxAutomationLog.findMany({
    where,
    orderBy: { triggeredAt: 'desc' },
    take: params.limit || 100,
  });

  return logs as unknown as TaskboxAutomationLog[];
}

export async function updateTaskboxAutomationLog(
  id: string,
  data: {
    status?: 'pending' | 'executed' | 'failed';
    executedAt?: Date;
    errorMessage?: string;
  }
): Promise<TaskboxAutomationLog> {
  const log = await prisma.taskboxAutomationLog.update({
    where: { id },
    data: {
      ...(data.status && { status: data.status }),
      ...(data.executedAt && { executedAt: data.executedAt }),
      ...(data.errorMessage !== undefined && {
        errorMessage: data.errorMessage,
      }),
    },
  });

  return log as unknown as TaskboxAutomationLog;
}

// ==================== HELPER QUERIES ====================

export async function getTaskboxBoardWithTasks(
  boardId: string,
  workspaceId: string
) {
  const board = await getTaskboxBoard(boardId, workspaceId);
  if (!board) return null;

  const tasks = await getTaskboxTasks(workspaceId, { boardId });

  return {
    ...board,
    tasks,
  };
}

export async function getTaskboxTasksByStatus(
  workspaceId: string,
  boardId?: string
) {
  const filters: TaskboxTaskFilters = {};
  if (boardId) filters.boardId = boardId;

  const tasks = await getTaskboxTasks(workspaceId, filters);

  const grouped: Record<string, TaskboxTask[]> = {};
  for (const task of tasks) {
    if (!grouped[task.status]) grouped[task.status] = [];
    grouped[task.status].push(task);
  }

  return grouped;
}
