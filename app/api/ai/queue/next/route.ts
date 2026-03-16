// GET /api/ai/queue/next
// Returns the next highest-priority task from the AI work queue

import { NextResponse } from 'next/server';
import { getNextQueueItem } from '@/lib/ai-queue';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const claimedBy = searchParams.get('claimedBy') || 'doug-ai';

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    const nextItem = await getNextQueueItem(workspaceId, claimedBy);

    if (!nextItem) {
      return NextResponse.json(
        { message: 'No work available', item: null },
        { status: 200 }
      );
    }

    return NextResponse.json({
      message: 'Work item claimed',
      item: {
        id: nextItem.id,
        taskId: nextItem.taskId,
        priority: nextItem.priority,
        queueType: nextItem.queueType,
        contextData: nextItem.contextData,
        scheduledFor: nextItem.scheduledFor,
        claimedAt: nextItem.claimedAt,
        claimedBy: nextItem.claimedBy,
      },
    });
  } catch (error) {
    console.error('Error in /api/ai/queue/next:', error);
    return NextResponse.json(
      { error: 'Failed to get next queue item', details: String(error) },
      { status: 500 }
    );
  }
}
