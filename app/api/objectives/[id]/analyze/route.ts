import { NextResponse } from 'next/server';
import { assessTrajectory, gatherObjectiveContext } from '@/lib/objective-intelligence';

/**
 * POST /api/objectives/[id]/analyze
 * Run AI analysis on objective
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Gather full context
    const context = await gatherObjectiveContext(params.id);

    // Assess trajectory
    const trajectory = await assessTrajectory(params.id);

    return NextResponse.json({
      success: true,
      analysis: {
        trajectory,
        context: {
          objective: {
            id: context.objective.id,
            title: context.objective.title,
            currentValue: Number(context.objective.currentValue),
            targetValue: Number(context.objective.targetValue),
            progressPercent: Number(context.objective.progressPercent),
          },
          company: context.company,
          tasks: context.tasks,
          velocity: context.velocity,
          activeBlockers: context.activeBlockers.length,
          recentProgress: context.progressHistory.slice(0, 7).map(p => ({
            date: p.entryDate.toISOString().split('T')[0],
            value: Number(p.value),
          })),
        },
      },
    });
  } catch (err) {
    console.error('[API:objectives:analyze] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
