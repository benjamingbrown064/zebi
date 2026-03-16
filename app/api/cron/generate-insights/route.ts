import { NextRequest, NextResponse } from 'next/server';

import { generateWorkspaceInsights } from '@/lib/insight-generator';

import { prisma } from '@/lib/prisma';

import { requireApiKey } from '@/lib/auth-api';


/**

// Force dynamic rendering
export const dynamic = 'force-dynamic'

 * Cron endpoint to generate daily AI insights for all workspaces
 * 
 * This should be triggered daily (e.g., 6am) via Vercel Cron or similar.
 * 
 * Usage:
 * POST /api/cron/generate-insights
 * Authorization: Bearer <CRON_SECRET>
 * 
 * Optional query params:
 * - workspaceId: Generate insights for a specific workspace only
 */
export async function POST(request: NextRequest) {
  try {
    // Require API authentication
    const authError = requireApiKey(request);
    if (authError) return authError;

    // Get optional workspaceId from query params
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    let workspaceIds: string[];

    if (workspaceId) {
      // Generate for specific workspace
      workspaceIds = [workspaceId];
    } else {
      // Generate for all workspaces
      const workspaces = await prisma.workspace.findMany({
        select: { id: true },
      });
      workspaceIds = workspaces.map(w => w.id);
    }

    const results = [];
    let totalInsights = 0;
    let totalCompanies = 0;

    for (const wsId of workspaceIds) {
      try {
        console.log(`Generating insights for workspace ${wsId}...`);
        
        const workspaceResults = await generateWorkspaceInsights(wsId);
        
        const insightCount = workspaceResults.reduce(
          (sum, r) => sum + r.insightCount,
          0
        );
        
        totalInsights += insightCount;
        totalCompanies += workspaceResults.length;

        results.push({
          workspaceId: wsId,
          companies: workspaceResults.length,
          insights: insightCount,
          details: workspaceResults.map(r => ({
            companyId: r.companyId,
            companyName: r.companyName,
            insights: r.insightCount,
          })),
        });

        console.log(
          `✓ Workspace ${wsId}: ${insightCount} insights for ${workspaceResults.length} companies`
        );
      } catch (error) {
        console.error(`Failed to generate insights for workspace ${wsId}:`, error);
        results.push({
          workspaceId: wsId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Log activity
    if (workspaceIds.length > 0 && totalInsights > 0) {
      try {
        await prisma.activityLog.create({
          data: {
            workspaceId: workspaceIds[0], // Use first workspace for logging
            eventType: 'ai.insights.generated',
            eventPayload: {
              totalWorkspaces: workspaceIds.length,
              totalCompanies,
              totalInsights,
              timestamp: new Date().toISOString(),
            },
            createdBy: '00000000-0000-0000-0000-000000000000', // System user
            aiAgent: 'insight-generator',
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
        // Don't fail the whole request if logging fails
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        workspaces: workspaceIds.length,
        companies: totalCompanies,
        insights: totalInsights,
      },
      results,
    });
  } catch (error) {
    console.error('Failed to generate insights:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for manual testing
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');

  if (!workspaceId) {
    return NextResponse.json(
      {
        error: 'Missing workspaceId query parameter',
        usage: 'GET /api/cron/generate-insights?workspaceId=xxx',
      },
      { status: 400 }
    );
  }

  try {
    const results = await generateWorkspaceInsights(workspaceId);
    
    return NextResponse.json({
      success: true,
      workspaceId,
      companies: results.length,
      totalInsights: results.reduce((sum, r) => sum + r.insightCount, 0),
      results: results.map(r => ({
        companyId: r.companyId,
        companyName: r.companyName,
        insights: r.insights,
      })),
    });
  } catch (error) {
    console.error('Failed to generate insights:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
