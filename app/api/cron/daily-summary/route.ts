import { NextRequest, NextResponse } from 'next/server';

import { generateDailySummary, storeSummary } from '@/lib/daily-summary';

import { formatSummaryForTelegram, formatSummaryPlain } from '@/lib/summary-formatter';

import { prisma } from '@/lib/prisma';

import { requireApiKey } from '@/lib/auth-api';



// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * POST /api/cron/daily-summary
 * 
 * Generate daily work summary at 6pm
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
    const format = searchParams.get('format') || 'telegram'; // telegram | plain

    // If specific workspace requested, process only that one
    if (workspaceId) {
      return await processWorkspace(workspaceId, format);
    }

    // Otherwise, process all workspaces
    return await processAllWorkspaces(format);
  } catch (err) {
    console.error('[API:cron:daily-summary] Error:', err);
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
async function processWorkspace(workspaceId: string, format: string) {
  // Generate summary data
  const summaryData = await generateDailySummary(workspaceId);

  // Format for output
  const summaryText = format === 'telegram'
    ? formatSummaryForTelegram(summaryData)
    : formatSummaryPlain(summaryData);

  // Store as ActivityLog entry
  await storeSummary(workspaceId, summaryText, summaryData);

  // Generate messageId for tracking (summary-YYYY-MM-DD)
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const messageId = `summary-${dateStr}`;

  return NextResponse.json({
    success: true,
    timestamp: today.toISOString(),
    messageId,
    workspaceId,
    summary: summaryText,
    data: summaryData,
  });
}

/**
 * Process all active workspaces
 */
async function processAllWorkspaces(format: string) {
  // Get all workspaces
  const workspaces = await prisma.workspace.findMany({
    select: { id: true, name: true },
  });

  const results = [];
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  for (const workspace of workspaces) {
    try {
      // Generate summary data
      const summaryData = await generateDailySummary(workspace.id);

      // Format for output
      const summaryText = format === 'telegram'
        ? formatSummaryForTelegram(summaryData)
        : formatSummaryPlain(summaryData);

      // Store as ActivityLog entry
      await storeSummary(workspace.id, summaryText, summaryData);

      results.push({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        success: true,
        summaryLength: summaryText.length,
        messageId: `summary-${dateStr}`,
      });
    } catch (error) {
      console.error(`Failed to generate summary for workspace ${workspace.id}:`, error);
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
    timestamp: today.toISOString(),
    workspacesProcessed: results.length,
    successfulSummaries: results.filter(r => r.success).length,
    results,
  });
}

/**
 * GET /api/cron/daily-summary
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
    const format = searchParams.get('format') || 'telegram';

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId query parameter required for GET' },
        { status: 400 }
      );
    }

    // Generate summary data
    const summaryData = await generateDailySummary(workspaceId);

    // Format for output
    const summaryText = format === 'telegram'
      ? formatSummaryForTelegram(summaryData)
      : formatSummaryPlain(summaryData);

    // Generate messageId for tracking (summary-YYYY-MM-DD)
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const messageId = `summary-${dateStr}`;

    return NextResponse.json({
      success: true,
      timestamp: today.toISOString(),
      messageId,
      workspaceId,
      summary: summaryText,
      data: summaryData,
    });
  } catch (err) {
    console.error('[API:cron:daily-summary:GET] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
