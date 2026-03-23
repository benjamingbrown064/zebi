import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/workspace';
import { validateAIAuth } from '@/lib/doug-auth';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

// GET /api/doug/note - List notes (Doug/Harvey convenience)
export async function GET(request: NextRequest) {
  try {
    const auth = validateAIAuth(request);
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId') || await requireWorkspace();
    const companyId = searchParams.get('companyId');
    const projectId = searchParams.get('projectId');
    const objectiveId = searchParams.get('objectiveId');
    const taskId = searchParams.get('taskId');
    const noteType = searchParams.get('noteType');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = { workspaceId };
    if (companyId) where.companyId = companyId;
    if (projectId) where.projectId = projectId;
    if (objectiveId) where.objectiveId = objectiveId;
    if (taskId) where.taskId = taskId;
    if (noteType) where.noteType = noteType;

    const notes = await prisma.note.findMany({
      where,
      select: {
        id: true,
        title: true,
        body: true,
        summary: true,
        noteType: true,
        author: true,
        companyId: true,
        projectId: true,
        objectiveId: true,
        taskId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ success: true, notes });

  } catch (error) {
    console.error('GET /api/doug/note error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch notes' }, { status: 500 });
  }
}

// POST /api/doug/note - Create note (Doug/Harvey convenience)
export async function POST(request: NextRequest) {
  try {
    const auth = validateAIAuth(request);
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, body: noteBody, summary, noteType, author, companyId, projectId, objectiveId, taskId } = body;
    const workspaceId = body.workspaceId || await requireWorkspace();

    if (!title) {
      return NextResponse.json({ success: false, error: 'title is required' }, { status: 400 });
    }

    const noteData = {
      workspaceId,
      title,
      body: noteBody || '',
      summary: summary || null,
      noteType: noteType || 'general',
      author: author || null,
      companyId: companyId || null,
      projectId: projectId || null,
      objectiveId: objectiveId || null,
      taskId: taskId || null,
      createdBy: DEFAULT_USER_ID,
    };

    const note = await prisma.note.create({
      data: noteData,
      select: {
        id: true,
        title: true,
        body: true,
        summary: true,
        noteType: true,
        author: true,
        companyId: true,
        projectId: true,
        objectiveId: true,
        taskId: true,
        workspaceId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, note }, { status: 201 });

  } catch (error) {
    console.error('POST /api/doug/note error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create note' }, { status: 500 });
  }
}

// PATCH /api/doug/note - Update note (Doug/Harvey convenience)
export async function PATCH(request: NextRequest) {
  try {
    const auth = validateAIAuth(request);
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, body: noteBody, summary, noteType, author, companyId, projectId, objectiveId, taskId } = body;
    const workspaceId = body.workspaceId || await requireWorkspace();

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    // Check note exists and belongs to workspace
    const existingNote = await prisma.note.findFirst({
      where: { id, workspaceId },
    });

    if (!existingNote) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    // Build update data - only include provided fields
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (noteBody !== undefined) updateData.body = noteBody;
    if (summary !== undefined) updateData.summary = summary;
    if (noteType !== undefined) updateData.noteType = noteType;
    if (author !== undefined) updateData.author = author;
    if (companyId !== undefined) updateData.companyId = companyId;
    if (projectId !== undefined) updateData.projectId = projectId;
    if (objectiveId !== undefined) updateData.objectiveId = objectiveId;
    if (taskId !== undefined) updateData.taskId = taskId;

    const note = await prisma.note.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        title: true,
        body: true,
        summary: true,
        noteType: true,
        author: true,
        companyId: true,
        projectId: true,
        objectiveId: true,
        taskId: true,
        workspaceId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, note });

  } catch (error) {
    console.error('PATCH /api/doug/note error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update note' }, { status: 500 });
  }
}
