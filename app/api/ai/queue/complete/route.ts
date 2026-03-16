// POST /api/ai/queue/complete
// Marks a work queue item as completed and logs the work done

import { NextResponse } from 'next/server';
import { completeQueueItem, failQueueItem } from '@/lib/ai-queue';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemId, success, workLog, failureReason } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: 'itemId is required' },
        { status: 400 }
      );
    }

    // If the work failed, mark as failed and increment retry count
    if (success === false) {
      if (!failureReason) {
        return NextResponse.json(
          { error: 'failureReason is required when success is false' },
          { status: 400 }
        );
      }

      const failedItem = await failQueueItem(itemId, failureReason);

      return NextResponse.json({
        message: 'Work item marked as failed',
        item: {
          id: failedItem.id,
          failureReason: failedItem.failureReason,
          retryCount: failedItem.retryCount,
          willRetry: failedItem.retryCount < 3,
        },
      });
    }

    // Mark as completed
    const completedItem = await completeQueueItem(itemId, workLog || {});

    return NextResponse.json({
      message: 'Work item completed successfully',
      item: {
        id: completedItem.id,
        completedAt: completedItem.completedAt,
        workLog: completedItem.workLog,
      },
    });
  } catch (error) {
    console.error('Error in /api/ai/queue/complete:', error);
    return NextResponse.json(
      { error: 'Failed to complete queue item', details: String(error) },
      { status: 500 }
    );
  }
}
