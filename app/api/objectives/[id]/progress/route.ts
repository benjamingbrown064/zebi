import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/objectives/[id]/progress
 * Get progress history
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30');

    const progressEntries = await prisma.objectiveProgress.findMany({
      where: { objectiveId: params.id },
      orderBy: { entryDate: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      progress: progressEntries.map(p => ({
        ...p,
        value: Number(p.value),
      })),
    });
  } catch (err) {
    console.error('[API:objectives:progress:GET] Error:', err);
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
 * POST /api/objectives/[id]/progress
 * Add progress entry
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { value, entryDate, note, source = 'manual', createdBy } = body;

    if (value === undefined || !entryDate || !createdBy) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get objective to calculate progress percent
    const objective = await prisma.objective.findUnique({
      where: { id: params.id },
      select: { targetValue: true },
    });

    if (!objective) {
      return NextResponse.json(
        { success: false, error: 'Objective not found' },
        { status: 404 }
      );
    }

    // Create progress entry
    const progressEntry = await prisma.objectiveProgress.create({
      data: {
        objectiveId: params.id,
        value,
        entryDate: new Date(entryDate),
        note: note || null,
        source,
        createdBy,
      },
    });

    // Update objective currentValue and progressPercent
    const progressPercent = (value / Number(objective.targetValue)) * 100;

    await prisma.objective.update({
      where: { id: params.id },
      data: {
        currentValue: value,
        progressPercent,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      progressEntry: {
        ...progressEntry,
        value: Number(progressEntry.value),
      },
      updatedObjective: {
        currentValue: value,
        progressPercent,
      },
    });
  } catch (err) {
    console.error('[API:objectives:progress:POST] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
