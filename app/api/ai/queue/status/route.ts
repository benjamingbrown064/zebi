// GET /api/ai/queue/status
// Returns an overview of the AI work queue status

import { NextResponse } from 'next/server';
import { getQueueStatus } from '@/lib/ai-queue';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    const status = await getQueueStatus(workspaceId);

    return NextResponse.json({
      message: 'Queue status retrieved',
      status,
    });
  } catch (error) {
    console.error('Error in /api/ai/queue/status:', error);
    return NextResponse.json(
      { error: 'Failed to get queue status', details: String(error) },
      { status: 500 }
    );
  }
}
