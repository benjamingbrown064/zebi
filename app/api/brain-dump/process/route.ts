import { NextRequest, NextResponse } from 'next/server';
import { processBrainDumpSession } from '@/lib/brain-dump/processor';

export const dynamic = 'force-dynamic';

/**
 * Process a brain dump session through Phase 2 intelligence pipeline
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId required' },
        { status: 400 }
      );
    }
    
    console.log(`Processing brain dump session: ${sessionId}`);
    
    const result = await processBrainDumpSession(sessionId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Processing failed' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Brain dump processing error:', error);
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }
}
