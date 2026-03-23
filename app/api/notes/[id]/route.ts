import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/workspace';
import { validateAIAuth } from '@/lib/doug-auth';

// GET /api/notes/[id] - Get single note
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = validateAIAuth(request);
    let workspaceId: string;

    if (auth.valid) {
      const wid = new URL(request.url).searchParams.get('workspaceId');
      if (!wid) return NextResponse.json({ success: false, error: 'workspaceId is required' }, { status: 400 });
      workspaceId = wid;
    } else {
      workspaceId = await requireWorkspace();
    }

    const note = await prisma.note.findFirst({
      where: {
        id: params.id,
        workspaceId,
      },
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

    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, note });

  } catch (error) {
    console.error('GET /api/notes/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch note' }, { status: 500 });
  }
}

// PATCH /api/notes/[id] - Update note
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = validateAIAuth(request);
    let workspaceId: string;

    const body = await request.json();
    const { title, body: noteBody, summary, noteType, author, companyId, projectId, objectiveId, taskId } = body;

    if (auth.valid) {
      if (!body.workspaceId) return NextResponse.json({ success: false, error: 'workspaceId is required' }, { status: 400 });
      workspaceId = body.workspaceId;
    } else {
      workspaceId = await requireWorkspace();
    }

    // Check note exists and belongs to workspace
    const existingNote = await prisma.note.findFirst({
      where: {
        id: params.id,
        workspaceId,
      },
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
      where: { id: params.id },
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
    console.error('PATCH /api/notes/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update note' }, { status: 500 });
  }
}

// DELETE /api/notes/[id] - Delete note
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = validateAIAuth(request);
    let workspaceId: string;

    if (auth.valid) {
      const wid = new URL(request.url).searchParams.get('workspaceId');
      if (!wid) return NextResponse.json({ success: false, error: 'workspaceId is required' }, { status: 400 });
      workspaceId = wid;
    } else {
      workspaceId = await requireWorkspace();
    }

    // Check note exists and belongs to workspace
    const existingNote = await prisma.note.findFirst({
      where: {
        id: params.id,
        workspaceId,
      },
    });

    if (!existingNote) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    await prisma.note.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('DELETE /api/notes/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete note' }, { status: 500 });
  }
}
