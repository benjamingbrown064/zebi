import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74';

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

    if (session.status !== 'ready_for_review') {
      return NextResponse.json(
        { error: 'Session not ready for task creation' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { candidateIds } = body;

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json({ error: 'No candidates selected' }, { status: 400 });
    }

    // Get default status
    const defaultStatus = await prisma.status.findFirst({
      where: { workspaceId, type: 'todo' },
      orderBy: { sortOrder: 'asc' },
    });

    if (!defaultStatus) {
      return NextResponse.json({ error: 'No default status found' }, { status: 500 });
    }

    // Get candidates
    const candidates = await prisma.generatedTaskCandidate.findMany({
      where: {
        id: { in: candidateIds },
        taskGenerationSessionId: sessionId,
        selected: true,
      },
    });

    // Create tasks
    const createdTasks = await Promise.all(
      candidates.map((candidate) =>
        prisma.task.create({
          data: {
            title: candidate.title,
            description: candidate.description,
            workspaceId,
            createdBy: PLACEHOLDER_USER_ID,
            statusId: defaultStatus.id,
            ...(session.contextType === 'project' && {
              projectId: session.contextId,
            }),
            ...(session.contextType === 'objective' && {
              objectiveId: session.contextId,
            }),
            ...(session.contextType === 'space' && {
              companyId: session.contextId,
            }),
          },
        })
      )
    );

    // Update session
    await prisma.taskGenerationSession.update({
      where: { id: sessionId },
      data: {
        status: 'applied',
        createdTaskCount: createdTasks.length,
        appliedAt: new Date(),
      },
    });

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
      success: true,
      created: createdTasks.length,
      skipped: 0,
      taskIds: createdTasks.map((t) => t.id),
      context: {
        type: session.contextType,
        id: session.contextId || undefined,
        name: contextName,
      },
    });
  } catch (error) {
    console.error('Error creating tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
