// Taskbox Task Detail API
// GET /api/taskbox/tasks/:id - Get task
// PATCH /api/taskbox/tasks/:id - Update task
// DELETE /api/taskbox/tasks/:id - Delete task

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/lib/workspace';
import {
  getTaskboxTask,
  updateTaskboxTask,
  deleteTaskboxTask,
} from '@/lib/taskbox/db';
import type { UpdateTaskboxTaskRequest } from '@/lib/taskbox/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, workspace } = await requireWorkspace();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = workspace.id;

    const task = await getTaskboxTask(params.id, workspaceId);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error('[Taskbox Task GET]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, workspace } = await requireWorkspace();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updateData = body as UpdateTaskboxTaskRequest;
    const workspaceId = workspace.id;

    // Verify task exists
    const existing = await getTaskboxTask(params.id, workspaceId);
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = await updateTaskboxTask(params.id, workspaceId, updateData);

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error('[Taskbox Task PATCH]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, workspace } = await requireWorkspace();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = workspace.id;

    // Verify task exists
    const existing = await getTaskboxTask(params.id, workspaceId);
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await deleteTaskboxTask(params.id, workspaceId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Taskbox Task DELETE]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
