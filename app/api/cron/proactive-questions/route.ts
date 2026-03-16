import { NextRequest, NextResponse } from 'next/server';

import { generateProactiveQuestions } from '@/lib/proactive-questions';

import { prisma } from '@/lib/prisma';

import { requireApiKey } from '@/lib/auth-api';


/**

// Force dynamic rendering
export const dynamic = 'force-dynamic'

 * Cron endpoint to generate proactive questions for workspaces
 * 
 * This should be triggered daily at 10am via Doug/cron.
 * 
 * Usage:
 * POST /api/cron/proactive-questions
 * Authorization: Bearer <CRON_SECRET>
 * 
 * Optional query params:
 * - workspaceId: Generate questions for a specific workspace only
 * 
 * Response format:
 * {
 *   "success": true,
 *   "questions": [
 *     {
 *       "id": "question-123",
 *       "type": "stalled_project",
 *       "priority": "medium",
 *       "question": "Project 'X' hasn't had activity in 2 weeks. Should I:",
 *       "options": [
 *         { "id": "pause", "label": "Pause it", "action": "pause_project" },
 *         { "id": "checkin", "label": "Create check-in task", "action": "create_task" },
 *         { "id": "archive", "label": "Archive it", "action": "archive_project" }
 *       ],
 *       "context": {
 *         "projectId": "abc-123",
 *         "lastActivity": "2026-02-18",
 *         "daysStalled": 15
 *       },
 *       "timestamp": "2026-03-04T10:00:00Z"
 *     }
 *   ],
 *   "count": 1
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Require API authentication
    const authError = requireApiKey(request);
    if (authError) return authError;

    // Get optional workspaceId from query params
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (workspaceId) {
      // Generate for specific workspace
      console.log(`Generating proactive questions for workspace ${workspaceId}...`);
      
      const result = await generateProactiveQuestions(workspaceId);
      
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        workspaceId,
        questions: result.questions,
        count: result.count,
        detectedPatterns: result.detectedPatterns,
      });
    } else {
      // Generate for all workspaces
      const workspaces = await prisma.workspace.findMany({
        select: { id: true, name: true },
      });

      const allResults = [];
      let totalQuestions = 0;

      for (const workspace of workspaces) {
        try {
          console.log(`Generating proactive questions for workspace ${workspace.id} (${workspace.name})...`);
          
          const result = await generateProactiveQuestions(workspace.id);
          
          allResults.push({
            workspaceId: workspace.id,
            workspaceName: workspace.name,
            questions: result.questions,
            count: result.count,
            detectedPatterns: result.detectedPatterns,
          });

          totalQuestions += result.count;

          console.log(
            `✓ Workspace ${workspace.name}: ${result.count} question(s) generated`
          );
        } catch (error) {
          console.error(`Failed to generate questions for workspace ${workspace.id}:`, error);
          allResults.push({
            workspaceId: workspace.id,
            workspaceName: workspace.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        summary: {
          workspaces: workspaces.length,
          totalQuestions,
        },
        results: allResults,
      });
    }
  } catch (error) {
    console.error('Failed to generate proactive questions:', error);
    
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
 * GET endpoint for manual testing (requires authentication)
 */
export async function GET(request: NextRequest) {
  // Require API authentication
  const authError = requireApiKey(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');

  if (!workspaceId) {
    return NextResponse.json(
      {
        error: 'Missing workspaceId query parameter',
        usage: 'GET /api/cron/proactive-questions?workspaceId=xxx',
        example: 'GET /api/cron/proactive-questions?workspaceId=dfd6d384-9e2f-4145-b4f3-254aa82c0237',
      },
      { status: 400 }
    );
  }

  try {
    console.log(`[TEST] Generating proactive questions for workspace ${workspaceId}...`);
    
    const result = await generateProactiveQuestions(workspaceId);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      workspaceId,
      questions: result.questions,
      count: result.count,
      detectedPatterns: result.detectedPatterns,
      debug: {
        note: 'This is a test endpoint. Questions have been generated and logged.',
      },
    });
  } catch (error) {
    console.error('Failed to generate proactive questions:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
