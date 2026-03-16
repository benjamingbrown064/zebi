import { NextResponse } from 'next/server';
import { assessTrajectory } from '@/lib/objective-intelligence';

/**
 * GET /api/objectives/[id]/trajectory
 * Get trajectory assessment
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const trajectory = await assessTrajectory(params.id);

    return NextResponse.json({
      success: true,
      trajectory,
    });
  } catch (err) {
    console.error('[API:objectives:trajectory] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
