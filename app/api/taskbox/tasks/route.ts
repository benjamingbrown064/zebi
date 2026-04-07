// Taskbox Tasks API
// GET /api/taskbox/tasks - List tasks
// POST /api/taskbox/tasks - Create task

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/lib/workspace';
import {
  getTaskboxTasks,
  createTaskboxTask,
} from '@/lib/taskbox/db';
import type {
  TaskboxTaskFilters,
  CreateTaskboxTaskRequest,
} from '@/lib/taskbox/types';

export async function GET(request: NextRequest) {
  try {
    const { user, workspace } = await requireWorkspace();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = workspace.id;

    // Build filters from query params
    const filters: TaskboxTaskFilters = {};

    if (searchParams.get('boardId')) {
      filters.boardId = searchParams.get('boardId')!;
    }
    if (searchParams.get('status')) {
      const statusParam = searchParams.get('status')!;
      filters.status = statusParam.includes(',')
        ? (statusParam.split(',') as any)
        : (statusParam as any);
    }
    if (searchParams.get('assignedTo')) {
      filters.assignedTo = searchParams.get('assignedTo')!;
    }
    if (searchParams.get('priority')) {
      filters.priority = parseInt(searchParams.get('priority')!) as any;
    }
    if (searchParams.get('companyId')) {
      filters.companyId = searchParams.get('companyId')!;
    }
    if (searchParams.get('projectId')) {
      filters.projectId = searchParams.get('projectId')!;
    }
    if (searchParams.get('tags')) {
      filters.tags = searchParams.get('tags')!.split(',');
    }
    if (searchParams.get('labels')) {
      filters.labels = searchParams.get('labels')!.split(',');
    }
    if (searchParams.get('dueBefore')) {
      filters.dueBefore = searchParams.get('dueBefore')!;
    }
    if (searchParams.get('dueAfter')) {
      filters.dueAfter = searchParams.get('dueAfter')!;
    }

    const tasks = await getTaskboxTasks(workspaceId, filters);

    return NextResponse.json({ success: true, tasks });
  } catch (error: any) {
    console.error('[Taskbox Tasks GET]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, workspace } = await requireWorkspace();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const taskData = body as CreateTaskboxTaskRequest;
    const workspaceId = workspace.id;

    if (!taskData.title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      );
    }

    const task = await createTaskboxTask(
      workspaceId,
      user.id,
      taskData
    );

    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (error: any) {
    console.error('[Taskbox Tasks POST]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
