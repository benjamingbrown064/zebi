import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { groupActions } from '@/lib/brain-dump/action-generator';

export const dynamic = 'force-dynamic';

/**
 * Get proposed actions for a brain dump session
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId required' },
        { status: 400 }
      );
    }
    
    // Get session
    const session = await prisma.brainDumpSession.findUnique({
      where: { id: sessionId }
    });
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Get all proposed actions
    const actions = await prisma.brainDumpProposedAction.findMany({
      where: { brainDumpSessionId: sessionId },
      orderBy: { createdAt: 'asc' }
    });
    
    // Get entity mentions
    const mentions = await prisma.brainDumpEntityMention.findMany({
      where: { brainDumpSessionId: sessionId }
    });
    
    // Get resolution issues
    const issues = await prisma.brainDumpResolutionIssue.findMany({
      where: { 
        brainDumpSessionId: sessionId,
        resolutionStatus: { not: 'resolved' }
      }
    });
    
    // Transform actions to ProposedAction format
    const proposedActions = actions.map(action => ({
      id: action.id,
      actionType: action.actionType,
      targetEntityType: action.targetEntityType,
      targetEntityId: action.targetEntityId,
      payload: action.payloadJson as Record<string, any>,
      reasoning: action.reasonSummary || '',
      confidenceScore: Number(action.confidenceScore),
      needsReview: action.requiresConfirmation,
      status: action.status
    }));
    
    // Group actions by category
    const grouped = groupActions(proposedActions as any);
    
    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        transcript: session.transcriptClean,
        summary: session.summary,
        createdAt: session.createdAt
      },
      actions: proposedActions,
      grouped,
      mentions: mentions.map(m => ({
        mentionText: m.mentionText,
        mentionType: m.mentionType,
        matchedEntityType: m.matchedEntityType,
        matchedEntityId: m.matchedEntityId,
        confidence: Number(m.confidence),
        resolutionStatus: m.resolutionStatus
      })),
      issues: issues.map(i => ({
        id: i.id,
        issueType: i.issueType,
        sourceText: i.sourceText,
        candidates: i.candidateMatchesJson || null,
        suggestedResolution: i.suggestedResolution
      }))
    });
  } catch (error) {
    console.error('Brain dump actions fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch actions' },
      { status: 500 }
    );
  }
}

/**
 * Update action status or payload (approve/reject/edit)
 */
export async function PATCH(req: NextRequest) {
  try {
    const { actionId, status, payload } = await req.json();
    
    if (!actionId) {
      return NextResponse.json(
        { error: 'actionId required' },
        { status: 400 }
      );
    }
    
    const updateData: any = {};
    
    // Update status if provided
    if (status) {
      if (!['approved', 'rejected', 'needs_review', 'proposed'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        );
      }
      updateData.status = status;
    }
    
    // Update payload if provided (for manual edits)
    if (payload) {
      // Get current action
      const currentAction = await prisma.brainDumpProposedAction.findUnique({
        where: { id: actionId }
      });
      
      if (!currentAction) {
        return NextResponse.json(
          { error: 'Action not found' },
          { status: 404 }
        );
      }
      
      // Merge edited payload with existing
      const currentPayload = currentAction.payloadJson as Record<string, any>;
      const mergedPayload = { ...currentPayload, ...payload };
      updateData.payloadJson = mergedPayload;
    }
    
    await prisma.brainDumpProposedAction.update({
      where: { id: actionId },
      data: updateData
    });
    
    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Brain dump action update error:', error);
    return NextResponse.json(
      { error: 'Failed to update action' },
      { status: 500 }
    );
  }
}
