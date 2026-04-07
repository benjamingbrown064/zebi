// Taskbox Boards API
// GET /api/taskbox/boards - List boards
// POST /api/taskbox/boards - Create board

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/lib/workspace';
import {
  getTaskboxBoards,
  createTaskboxBoard,
} from '@/lib/taskbox/db';
import type { CreateTaskboxBoardRequest } from '@/lib/taskbox/types';

export async function GET(request: NextRequest) {
  try {
    const { user, workspace } = await requireWorkspace();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = workspace.id;

    const boards = await getTaskboxBoards(workspaceId);

    return NextResponse.json({ success: true, boards });
  } catch (error: any) {
    console.error('[Taskbox Boards GET]', error);
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
    const boardData = body as CreateTaskboxBoardRequest;
    const workspaceId = workspace.id;

    if (!boardData.name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    const board = await createTaskboxBoard(
      workspaceId,
      user.id,
      boardData
    );

    return NextResponse.json({ success: true, board }, { status: 201 });
  } catch (error: any) {
    console.error('[Taskbox Boards POST]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
