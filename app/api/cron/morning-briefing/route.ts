import { NextRequest, NextResponse } from 'next/server';

import { generateMorningBriefing, formatMorningBriefingForTelegram, storeBriefing } from '@/lib/morning-briefing';
import { prisma } from '@/lib/prisma';

import { requireApiKey } from '@/lib/auth-api';



// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * POST /api/cron/morning-briefing
 * 
 * Generate morning briefing at 8am daily
 * Called by Vercel cron or external scheduler
 * 
 * Processes all workspaces or a specific workspace if provided
 */
export async function POST(request: NextRequest) {
  try {
    // Require API authentication
    const authError = requireApiKey(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    // If specific workspace requested, process only that one
    if (workspaceId) {
      return await processWorkspace(workspaceId);
    }

    // Otherwise, process all workspaces
    return await processAllWorkspaces();
  } catch (err) {
    console.error('[API:cron:morning-briefing] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Process a single workspace
 */
async function processWorkspace(workspaceId: string) {
  // Generate briefing data
  const briefingData = await generateMorningBriefing(workspaceId);

  // Format for Telegram
  const briefingText = formatMorningBriefingForTelegram(briefingData);

  // Store as ActivityLog entry
  await storeBriefing(workspaceId, briefingText, briefingData);

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    workspaceId,
    briefing: briefingText,
    data: briefingData,
  });
}

/**
 * Process all active workspaces
 */
async function processAllWorkspaces() {
  // Get all workspaces
  const workspaces = await prisma.workspace.findMany({
    select: { id: true, name: true },
  });

  const results = [];

  for (const workspace of workspaces) {
    try {
      // Generate briefing data
      const briefingData = await generateMorningBriefing(workspace.id);

      // Format for Telegram
      const briefingText = formatMorningBriefingForTelegram(briefingData);

      // Store as ActivityLog entry
      await storeBriefing(workspace.id, briefingText, briefingData);

      results.push({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        success: true,
        briefingLength: briefingText.length,
      });
    } catch (error) {
      console.error(`Failed to generate briefing for workspace ${workspace.id}:`, error);
      results.push({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    workspacesProcessed: results.length,
    successfulBriefings: results.filter(r => r.success).length,
    results,
  });
}

/**
 * GET /api/cron/morning-briefing
 * 
 * Test endpoint (requires authentication)
 */
export async function GET(request: NextRequest) {
  try {
    // Require API authentication
    const authError = requireApiKey(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId query parameter required for GET' },
        { status: 400 }
      );
    }

    // Generate briefing data
    const briefingData = await generateMorningBriefing(workspaceId);

    // Format for Telegram
    const briefingText = formatMorningBriefingForTelegram(briefingData);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      workspaceId,
      briefing: briefingText,
      data: briefingData,
    });
  } catch (err) {
    console.error('[API:cron:morning-briefing:GET] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
