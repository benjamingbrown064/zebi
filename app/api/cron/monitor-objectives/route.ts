import { NextRequest, NextResponse } from 'next/server';

import { monitorAllObjectives, generateDailySummary } from '@/lib/objective-monitoring';

import { prisma } from '@/lib/prisma';

import { requireApiKey } from '@/lib/auth-api';


/**

// Force dynamic rendering
export const dynamic = 'force-dynamic'

 * POST /api/cron/monitor-objectives
 * Daily objective monitoring (called by cron)
 * 
 * This should be configured in vercel.json or called via external cron
 */
export async function POST(request: NextRequest) {
  try {
    // Require API authentication
    const authError = requireApiKey(request);
    if (authError) return authError;

    // Get all workspaces
    const workspaces = await prisma.workspace.findMany({
      select: { id: true, name: true },
    });

    const results = [];

    for (const workspace of workspaces) {
      // Monitor all objectives for this workspace
      const monitoringResults = await monitorAllObjectives(workspace.id);

      // Generate daily summary
      const summary = await generateDailySummary(workspace.id);

      results.push({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        objectivesMonitored: monitoringResults.length,
        statusChanges: monitoringResults.filter(r => r.statusChanged).length,
        newBlockers: monitoringResults.reduce((sum, r) => sum + r.newBlockers, 0),
        actionsGenerated: monitoringResults.reduce((sum, r) => sum + r.actionsGenerated, 0),
        alertsRequired: monitoringResults.filter(r => r.alertRequired).length,
        summary,
        results: monitoringResults,
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      workspaces: results.length,
      results,
    });
  } catch (err) {
    console.error('[API:cron:monitor-objectives] Error:', err);
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
 * GET /api/cron/monitor-objectives
 * Test endpoint (no auth required)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'workspaceId required for test' },
        { status: 400 }
      );
    }

    const monitoringResults = await monitorAllObjectives(workspaceId);
    const summary = await generateDailySummary(workspaceId);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      objectivesMonitored: monitoringResults.length,
      summary,
      results: monitoringResults,
    });
  } catch (err) {
    console.error('[API:cron:monitor-objectives:GET] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
