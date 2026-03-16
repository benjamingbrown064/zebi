import { NextRequest, NextResponse } from 'next/server';

import { detectAlerts, formatAlertsForTelegram } from '@/lib/alert-system';

import { Alert } from '@/lib/alert-types/new-insights';
import { prisma } from '@/lib/prisma';

import { requireApiKey } from '@/lib/auth-api';



// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * POST /api/cron/check-alerts
 * 
 * Check for important alerts every 6 hours
 * Called by Doug (external scheduler)
 * 
 * Query params:
 * - workspaceId: Workspace to check (optional, processes all workspaces if not provided)
 * - hoursAgo: How far back to check for time-based alerts (default: 6)
 * - priority: Filter by priority (comma-separated: critical,high,medium,low)
 * - format: Output format (json | telegram)
 * 
 * Returns: Alert data in requested format
 */
export async function POST(request: NextRequest) {
  try {
    // Require API authentication
    const authError = requireApiKey(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const hoursAgo = parseInt(searchParams.get('hoursAgo') || '6');
    const format = searchParams.get('format') || 'json'; // json | telegram
    const priorityParam = searchParams.get('priority');

    // Parse priority filter
    let priorityFilter: Alert['priority'][] | undefined;
    if (priorityParam) {
      priorityFilter = priorityParam.split(',').filter((p) => 
        ['critical', 'high', 'medium', 'low'].includes(p)
      ) as Alert['priority'][];
    }

    // If specific workspace requested, process only that one
    if (workspaceId) {
      return await processWorkspace(workspaceId, hoursAgo, format, priorityFilter);
    }

    // Otherwise, process all workspaces
    return await processAllWorkspaces(hoursAgo, format, priorityFilter);
  } catch (err) {
    console.error('[API:cron:check-alerts] Error:', err);
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
async function processWorkspace(
  workspaceId: string, 
  hoursAgo: number, 
  format: string, 
  priorityFilter?: Alert['priority'][]
) {
  // Detect all alerts
  const result = await detectAlerts({
    workspaceId,
    hoursAgo,
    priorityFilter,
  });

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || 'Failed to detect alerts',
        timestamp: result.timestamp,
      },
      { status: 500 }
    );
  }

  // Generate messageId for tracking (alert-check-YYYY-MM-DD-HH)
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 13).replace('T', '-'); // YYYY-MM-DD-HH
  const messageId = `alert-check-${dateStr}`;

  // Format response based on requested format
  if (format === 'telegram') {
    const formattedMessage = formatAlertsForTelegram(result.alerts);
    
    return NextResponse.json({
      success: true,
      messageId,
      timestamp: result.timestamp,
      workspaceId,
      count: result.count,
      message: formattedMessage,
      alerts: result.alerts,
    });
  }

  // Default: JSON format
  return NextResponse.json({
    success: true,
    messageId,
    timestamp: result.timestamp,
    workspaceId,
    alerts: result.alerts,
    count: result.count,
  });
}

/**
 * Process all active workspaces
 */
async function processAllWorkspaces(
  hoursAgo: number, 
  format: string, 
  priorityFilter?: Alert['priority'][]
) {
  // Get all workspaces
  const workspaces = await prisma.workspace.findMany({
    select: { id: true, name: true },
  });

  const results = [];
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 13).replace('T', '-');

  for (const workspace of workspaces) {
    try {
      // Detect alerts
      const result = await detectAlerts({
        workspaceId: workspace.id,
        hoursAgo,
        priorityFilter,
      });

      if (!result.success) {
        results.push({
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          success: false,
          error: result.error || 'Failed to detect alerts',
        });
        continue;
      }

      results.push({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        success: true,
        alertCount: result.count,
        criticalAlerts: result.alerts.filter(a => a.priority === 'critical').length,
        messageId: `alert-check-${dateStr}`,
      });
    } catch (error) {
      console.error(`Failed to check alerts for workspace ${workspace.id}:`, error);
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
    timestamp: now.toISOString(),
    workspacesProcessed: results.length,
    successfulChecks: results.filter(r => r.success).length,
    totalAlerts: results.reduce((sum, r) => sum + (r.alertCount || 0), 0),
    criticalAlerts: results.reduce((sum, r) => sum + (r.criticalAlerts || 0), 0),
    results,
  });
}

/**
 * GET /api/cron/check-alerts
 * 
 * Test endpoint (requires authentication)
 * Same functionality as POST but easier to test in browser
 */
export async function GET(request: NextRequest) {
  try {
    // Require API authentication
    const authError = requireApiKey(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const hoursAgo = parseInt(searchParams.get('hoursAgo') || '6');
    const format = searchParams.get('format') || 'json';
    const priorityParam = searchParams.get('priority');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId query parameter required for GET' },
        { status: 400 }
      );
    }

    // Parse priority filter
    let priorityFilter: Alert['priority'][] | undefined;
    if (priorityParam) {
      priorityFilter = priorityParam.split(',').filter((p) =>
        ['critical', 'high', 'medium', 'low'].includes(p)
      ) as Alert['priority'][];
    }

    // Detect all alerts
    const result = await detectAlerts({
      workspaceId,
      hoursAgo,
      priorityFilter,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to detect alerts',
          timestamp: result.timestamp,
        },
        { status: 500 }
      );
    }

    // Generate messageId for tracking
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 13).replace('T', '-');
    const messageId = `alert-check-${dateStr}`;

    // Format response
    if (format === 'telegram') {
      const formattedMessage = formatAlertsForTelegram(result.alerts);
      
      return NextResponse.json({
        success: true,
        messageId,
        timestamp: result.timestamp,
        workspaceId,
        count: result.count,
        message: formattedMessage,
        alerts: result.alerts,
      });
    }

    // Default: JSON format
    return NextResponse.json({
      success: true,
      messageId,
      timestamp: result.timestamp,
      workspaceId,
      alerts: result.alerts,
      count: result.count,
    });
  } catch (err) {
    console.error('[API:cron:check-alerts:GET] Error:', err);
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
