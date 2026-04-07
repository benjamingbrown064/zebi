// Taskbox Board Detail API
// GET /api/taskbox/boards/:id - Get board with tasks
// PATCH /api/taskbox/boards/:id - Update board
// DELETE /api/taskbox/boards/:id - Delete board

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/lib/workspace';
import {
  getTaskboxBoard,
  getTaskboxBoardWithTasks,
  updateTaskboxBoard,
  deleteTaskboxBoard,
} from '@/lib/taskbox/db';
import type { UpdateTaskboxBoardRequest } from '@/lib/taskbox/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const includeTasks = searchParams.get('includeTasks') === 'true';

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    if (includeTasks) {
      const board = await getTaskboxBoardWithTasks(params.id, workspaceId);
      if (!board) {
        return NextResponse.json({ error: 'Board not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, board });
    } else {
      const board = await getTaskboxBoard(params.id, workspaceId);
      if (!board) {
        return NextResponse.json({ error: 'Board not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, board });
    }
  } catch (error: any) {
    console.error('[Taskbox Board GET]', error);
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, ...updateData } = body as {
      workspaceId: string;
    } & UpdateTaskboxBoardRequest;

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    // Verify board exists
    const existing = await getTaskboxBoard(params.id, workspaceId);
    if (!existing) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const board = await updateTaskboxBoard(params.id, workspaceId, updateData);

    return NextResponse.json({ success: true, board });
  } catch (error: any) {
    console.error('[Taskbox Board PATCH]', error);
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    // Verify board exists
    const existing = await getTaskboxBoard(params.id, workspaceId);
    if (!existing) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    await deleteTaskboxBoard(params.id, workspaceId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Taskbox Board DELETE]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
