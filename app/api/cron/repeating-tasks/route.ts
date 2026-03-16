
// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Cron endpoint: Process due repeating tasks
// Checks all active repeating task templates and generates tasks when due
// Should be called hourly via cron

import { NextRequest, NextResponse } from 'next/server';

import { processDueRepeatingTasks } from '@/lib/repeating-tasks';

import { requireApiKey } from '@/lib/auth-api';


// System user ID for automated tasks
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

export async function POST(request: NextRequest) {
  try {
    // Require API authentication
    const authError = requireApiKey(request);
    if (authError) return authError;

    console.log('[Cron] Starting repeating task processor...');
    const startTime = Date.now();

    // Process all due templates
    const result = await processDueRepeatingTasks(SYSTEM_USER_ID);

    const duration = Date.now() - startTime;

    console.log('[Cron] Repeating task processor completed:', {
      processed: result.processed,
      created: result.created,
      errors: result.errors.length,
      durationMs: duration,
    });

    return NextResponse.json({
      success: true,
      processed: result.processed,
      created: result.created,
      errors: result.errors,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Cron] Repeating task processor error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Allow GET for manual testing (remove in production)
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
  }

  console.log('[Manual] Running repeating task processor...');
  
  try {
    const result = await processDueRepeatingTasks(SYSTEM_USER_ID);

    return NextResponse.json({
      success: true,
      processed: result.processed,
      created: result.created,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Manual] Repeating task processor error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
