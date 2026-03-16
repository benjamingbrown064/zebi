import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/objectives/[id]/blockers/[blockerId]/resolve
 * Mark blocker as resolved
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string; blockerId: string } }
) {
  try {
    const body = await request.json();
    const { note } = body;

    // Get existing blocker first
    const existingBlocker = await prisma.objectiveBlocker.findUnique({
      where: { id: params.blockerId },
    });

    if (!existingBlocker) {
      return NextResponse.json(
        { success: false, error: 'Blocker not found' },
        { status: 404 }
      );
    }

    const blocker = await prisma.objectiveBlocker.update({
      where: { id: params.blockerId },
      data: {
        resolvedAt: new Date(),
        description: note
          ? `${existingBlocker.description}\n\nResolution: ${note}`
          : existingBlocker.description,
      },
    });

    // Check if all blockers resolved
    const remainingBlockers = await prisma.objectiveBlocker.count({
      where: {
        objectiveId: params.id,
        resolvedAt: null,
      },
    });

    // If no blockers remain and objective was blocked, update status
    if (remainingBlockers === 0) {
      const objective = await prisma.objective.findUnique({
        where: { id: params.id },
        select: { status: true },
      });

      if (objective?.status === 'blocked') {
        await prisma.objective.update({
          where: { id: params.id },
          data: { status: 'active' },
        });
      }
    }

    return NextResponse.json({
      success: true,
      blocker,
      remainingBlockers,
    });
  } catch (err) {
    console.error('[API:objectives:blockers:resolve] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
