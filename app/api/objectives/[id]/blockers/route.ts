import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { detectBlockers, generateActionPlan } from '@/lib/objective-intelligence';

/**
 * GET /api/objectives/[id]/blockers
 * Get blockers for objective
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const includeResolved = searchParams.get('includeResolved') === 'true';

    const where: any = { objectiveId: params.id };
    if (!includeResolved) {
      where.resolvedAt = null;
    }

    const blockers = await prisma.objectiveBlocker.findMany({
      where,
      orderBy: { detectedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      blockers,
    });
  } catch (err) {
    console.error('[API:objectives:blockers:GET] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/objectives/[id]/blockers
 * Create blocker (manual or run detection)
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { autoDetect = false } = body;

    if (autoDetect) {
      // Run AI blocker detection
      const detection = await detectBlockers(params.id);

      // Create new blockers
      const createdBlockers = [];
      for (const blocker of detection.blockers) {
        // Check if blocker already exists
        const existing = await prisma.objectiveBlocker.findFirst({
          where: {
            objectiveId: params.id,
            title: blocker.title,
            resolvedAt: null,
          },
        });

        if (!existing) {
          const created = await prisma.objectiveBlocker.create({
            data: {
              objectiveId: params.id,
              blockerType: blocker.type,
              title: blocker.title,
              description: blocker.description,
              severity: blocker.severity,
              aiSuggestion: { suggestion: blocker.suggestion },
            },
          });
          createdBlockers.push(created);
        }
      }

      // Generate action plan if blockers found
      let actionPlan = null;
      if (createdBlockers.length > 0) {
        const allBlockers = await prisma.objectiveBlocker.findMany({
          where: {
            objectiveId: params.id,
            resolvedAt: null,
          },
        });

        actionPlan = await generateActionPlan(params.id, allBlockers);

        // Update objective with action plan
        await prisma.objective.update({
          where: { id: params.id },
          data: {
            aiActionPlan: actionPlan,
          },
        });
      }

      return NextResponse.json({
        success: true,
        blockersDetected: createdBlockers.length,
        blockers: createdBlockers,
        actionPlan,
      });
    } else {
      // Manual blocker creation
      const { blockerType, title, description, severity } = body;

      if (!blockerType || !title || !description || !severity) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      const blocker = await prisma.objectiveBlocker.create({
        data: {
          objectiveId: params.id,
          blockerType,
          title,
          description,
          severity,
        },
      });

      return NextResponse.json({
        success: true,
        blocker,
      });
    }
  } catch (err) {
    console.error('[API:objectives:blockers:POST] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
