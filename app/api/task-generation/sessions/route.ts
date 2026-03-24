import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74';

/**
 * POST /api/task-generation/sessions
 * Create a new voice-to-task generation session
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[task-gen] Starting session creation...');
    
    let workspaceId: string;
    try {
      workspaceId = await requireWorkspace();
      console.log('[task-gen] WorkspaceId:', workspaceId);
    } catch (wsError: any) {
      console.error('[task-gen] Workspace error:', wsError);
      return NextResponse.json(
        { error: 'Failed to get workspace', details: wsError?.message },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { contextType, contextId } = body;
    console.log('[task-gen] Context:', contextType, contextId);

    // Validate context type
    const validContextTypes = ['project', 'objective', 'space', 'general'];
    if (!validContextTypes.includes(contextType)) {
      return NextResponse.json(
        { error: 'Invalid context type' },
        { status: 400 }
      );
    }

    // Validate context exists and user has access
    let contextName: string | undefined;

    if (contextId) {
      try {
        switch (contextType) {
          case 'project': {
            const project = await prisma.project.findFirst({
              where: { id: contextId, workspaceId },
              select: { name: true },
            });
            if (!project) {
              return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
              );
            }
            contextName = project.name;
            break;
          }
        case 'objective': {
          const objective = await prisma.objective.findFirst({
            where: { id: contextId, workspaceId },
            select: { title: true },
          });
          if (!objective) {
            return NextResponse.json(
              { error: 'Objective not found' },
              { status: 404 }
            );
          }
          contextName = objective.title;
          break;
        }
        case 'space': {
          const space = await prisma.space.findFirst({
            where: { id: contextId, workspaceId },
            select: { name: true },
          });
          if (!space) {
            return NextResponse.json(
              { error: 'Space not found' },
              { status: 404 }
            );
          }
          contextName = space.name;
          break;
        }
        }
      } catch (contextError: any) {
        console.error('[task-gen] Context validation error:', contextError);
        return NextResponse.json(
          { error: 'Failed to validate context', details: contextError?.message },
          { status: 500 }
        );
      }
    }

    // Create session
    console.log('[task-gen] Creating session with:', {
      userId: PLACEHOLDER_USER_ID,
      workspaceId,
      contextType,
      contextId: contextId || null,
    });

    let session;
    try {
      session = await prisma.taskGenerationSession.create({
        data: {
          userId: PLACEHOLDER_USER_ID,
          workspaceId,
          contextType,
          contextId: contextId || null,
          status: 'recording',
        },
      });
      console.log('[task-gen] Session created:', session.id);
    } catch (dbError: any) {
      console.error('[task-gen] Database error:', dbError);
      return NextResponse.json(
        { 
          error: 'Failed to create session in database',
          details: dbError?.message,
          code: dbError?.code
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionId: session.id,
      status: session.status,
      context: {
        type: contextType,
        id: contextId,
        name: contextName,
      },
    });
  } catch (error: any) {
    console.error('[task-gen] Error creating session:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error?.message || String(error),
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}
