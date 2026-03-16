import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = await requireWorkspace();
    const sessionId = params.id;

    const session = await prisma.taskGenerationSession.findFirst({
      where: { id: sessionId, workspaceId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'Updates array required' }, { status: 400 });
    }

    await Promise.all(
      updates.map((update: any) =>
        prisma.generatedTaskCandidate.updateMany({
          where: {
            id: update.id,
            taskGenerationSessionId: sessionId,
          },
          data: {
            ...(update.title !== undefined && { title: update.title }),
            ...(update.description !== undefined && { description: update.description }),
            ...(update.selected !== undefined && { selected: update.selected }),
          },
        })
      )
    );

    return NextResponse.json({ updated: updates.length });
  } catch (error) {
    console.error('Error updating candidates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = await requireWorkspace();
    const sessionId = params.id;

    const session = await prisma.taskGenerationSession.findFirst({
      where: { id: sessionId, workspaceId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 });
    }

    const maxSortOrder = await prisma.generatedTaskCandidate.findFirst({
      where: { taskGenerationSessionId: sessionId },
      select: { sortOrder: true },
      orderBy: { sortOrder: 'desc' },
    });

    const candidate = await prisma.generatedTaskCandidate.create({
      data: {
        taskGenerationSessionId: sessionId,
        title: title.trim(),
        description: description?.trim() || null,
        selected: true,
        sortOrder: (maxSortOrder?.sortOrder ?? -1) + 1,
        duplicateStatus: 'none',
      },
    });

    return NextResponse.json({
      candidate: {
        id: candidate.id,
        title: candidate.title,
        description: candidate.description,
        selected: candidate.selected,
        duplicateStatus: candidate.duplicateStatus,
        sortOrder: candidate.sortOrder,
      },
    });
  } catch (error) {
    console.error('Error adding candidate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
