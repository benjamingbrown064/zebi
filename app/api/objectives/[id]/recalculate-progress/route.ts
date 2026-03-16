/**
 * POST /api/objectives/[id]/recalculate-progress
 * 
 * Trigger objective progress recalculation
 * 
 * Auth: INTERNAL_API_TOKEN header
 */

import { NextRequest, NextResponse } from 'next/server';
import { recalculateObjectiveProgress } from '@/lib/objective-progress';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check for internal API token
    const authHeader = request.headers.get('authorization');
    const internalToken = process.env.INTERNAL_API_TOKEN;
    
    if (!authHeader || !internalToken || authHeader !== `Bearer ${internalToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: objectiveId } = await context.params;

    // Recalculate progress
    const result = await recalculateObjectiveProgress(objectiveId);

    if (result.skipped) {
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: result.reason
      });
    }

    return NextResponse.json({
      success: true,
      objective: result.objective
    });

  } catch (error) {
    console.error('[Objective Progress] Recalculation failed:', error);
    return NextResponse.json(
      { error: 'Failed to recalculate progress' },
      { status: 500 }
    );
  }
}
