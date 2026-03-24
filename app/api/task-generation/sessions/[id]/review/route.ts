import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = await requireWorkspace();
    const sessionId = params.id;

    const session = await prisma.taskGenerationSession.findFirst({
      where: { id: sessionId, workspaceId },
      include: {
        candidates: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get context name
    let contextName: string | undefined;
    if (session.contextId) {
      switch (session.contextType) {
        case 'project':
          const project = await prisma.project.findUnique({
            where: { id: session.contextId },
            select: { name: true },
          });
          contextName = project?.name;
          break;
        case 'objective':
          const objective = await prisma.objective.findUnique({
            where: { id: session.contextId },
            select: { title: true },
          });
          contextName = objective?.title;
          break;
        case 'space':
          const space = await prisma.space.findUnique({
            where: { id: session.contextId },
            select: { name: true },
          });
          contextName = space?.name;
          break;
      }
    }

    return NextResponse.json({
      sessionId: session.id,
      status: session.status,
      context: {
        type: session.contextType,
        id: session.contextId || undefined,
        name: contextName,
      },
      transcriptSummary: session.transcriptClean
        ? `Extracted ${session.generatedTaskCount} tasks from your dictation.`
        : undefined,
      candidates: session.candidates.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        selected: c.selected,
        duplicateStatus: c.duplicateStatus,
        confidence: c.confidenceScore ? Number(c.confidenceScore) : undefined,
        sortOrder: c.sortOrder,
      })),
    });
  } catch (error) {
    console.error('Error getting session review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
