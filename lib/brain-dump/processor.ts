/**
 * Phase 2: Brain Dump Processor
 * Orchestrates the full intelligence pipeline
 */

import { prisma } from '@/lib/prisma';
import { extractIntents } from './intent-extractor';
import { matchAllEntities, MatchedEntity } from './entity-matcher';
import { generateActions, saveProposedActions, ProposedAction } from './action-generator';

export interface ProcessingResult {
  success: boolean;
  actionsGenerated: number;
  highConfidenceActions: number;
  needsReviewActions: number;
  error?: string;
}

/**
 * Process a brain dump session through Phase 2 pipeline
 */
export async function processBrainDumpSession(
  sessionId: string
): Promise<ProcessingResult> {
  try {
    // 1. Get the session
    const session = await prisma.brainDumpSession.findUnique({
      where: { id: sessionId }
    });
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    if (!session.transcriptClean) {
      throw new Error('No transcript available');
    }
    
    // Update status to processing
    await prisma.brainDumpSession.update({
      where: { id: sessionId },
      data: {
        status: 'processing',
        processingStartedAt: new Date()
      }
    });
    
    // 2. Extract intents from transcript
    console.log(`[${sessionId}] Extracting intents...`);
    const intents = await extractIntents(session.transcriptClean);
    console.log(`[${sessionId}] Found ${intents.length} intents`);
    
    if (intents.length === 0) {
      await prisma.brainDumpSession.update({
        where: { id: sessionId },
        data: {
          status: 'completed',
          summary: 'No actionable items found in transcript'
        }
      });
      
      return {
        success: true,
        actionsGenerated: 0,
        highConfidenceActions: 0,
        needsReviewActions: 0
      };
    }
    
    // 3. Match entities for each intent
    console.log(`[${sessionId}] Matching entities...`);
    const matchedEntitiesMap = new Map<string, MatchedEntity[]>();
    
    for (const intent of intents) {
      const matched = await matchAllEntities(session.workspaceId, intent.entities);
      matchedEntitiesMap.set(JSON.stringify(intent), matched);
      
      // Save entity mentions to database
      await saveEntityMentions(sessionId, matched);
    }
    
    // 4. Generate proposed actions
    console.log(`[${sessionId}] Generating actions...`);
    const actions = await generateActions(
      sessionId,
      session.workspaceId,
      intents,
      matchedEntitiesMap
    );
    
    console.log(`[${sessionId}] Generated ${actions.length} actions`);
    
    // 5. Save actions to database
    await saveProposedActions(sessionId, actions);
    
    // 6. Check for ambiguous matches (resolution issues)
    const resolutionIssues = findResolutionIssues(matchedEntitiesMap);
    if (resolutionIssues.length > 0) {
      await saveResolutionIssues(sessionId, resolutionIssues);
    }
    
    // 7. Update session status
    const highConfidenceActions = actions.filter(a => a.confidenceScore >= 0.8 && !a.needsReview).length;
    const needsReviewActions = actions.filter(a => a.needsReview || a.confidenceScore < 0.6).length;
    
    const summary = generateSummary(actions, highConfidenceActions, needsReviewActions);
    
    await prisma.brainDumpSession.update({
      where: { id: sessionId },
      data: {
        status: 'ready_for_review',
        summary,
        processingCompletedAt: new Date()
      }
    });
    
    return {
      success: true,
      actionsGenerated: actions.length,
      highConfidenceActions,
      needsReviewActions
    };
  } catch (error) {
    console.error(`[${sessionId}] Processing error:`, error);
    
    // Update session to failed
    await prisma.brainDumpSession.update({
      where: { id: sessionId },
      data: {
        status: 'failed',
        summary: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }).catch(() => {});
    
    return {
      success: false,
      actionsGenerated: 0,
      highConfidenceActions: 0,
      needsReviewActions: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Save entity mentions to database
 */
async function saveEntityMentions(
  sessionId: string,
  matchedEntities: MatchedEntity[]
): Promise<void> {
  await prisma.brainDumpEntityMention.createMany({
    data: matchedEntities.map(entity => ({
      brainDumpSessionId: sessionId,
      mentionText: entity.mentionText,
      mentionType: entity.type,
      matchedEntityType: entity.match.entityType,
      matchedEntityId: entity.match.entityId,
      confidence: entity.match.confidence,
      resolutionStatus: entity.match.isNewEntity ? 'unmatched' : (entity.match.confidence > 0.7 ? 'matched' : 'ambiguous')
    })),
    skipDuplicates: true
  });
}

/**
 * Find entities that have ambiguous matches
 */
function findResolutionIssues(
  matchedEntitiesMap: Map<string, MatchedEntity[]>
): Array<{ entity: MatchedEntity; issueType: string }> {
  const issues: Array<{ entity: MatchedEntity; issueType: string }> = [];
  
  for (const entities of matchedEntitiesMap.values()) {
    for (const entity of entities) {
      // Low confidence match
      if (entity.match.confidence < 0.6 && !entity.match.isNewEntity) {
        issues.push({
          entity,
          issueType: 'low_confidence_match'
        });
      }
      
      // Multiple similar candidates
      if (entity.match.candidates && entity.match.candidates.length > 1) {
        const topTwo = entity.match.candidates.slice(0, 2);
        if (topTwo.length === 2 && topTwo[0].score - topTwo[1].score < 0.2) {
          issues.push({
            entity,
            issueType: 'ambiguous_match'
          });
        }
      }
      
      // Vague dates
      if (entity.type === 'date' && (
        entity.value.toLowerCase().includes('next') ||
        entity.value.toLowerCase().includes('this') ||
        entity.value.toLowerCase().includes('soon')
      )) {
        issues.push({
          entity,
          issueType: 'vague_date'
        });
      }
    }
  }
  
  return issues;
}

/**
 * Save resolution issues to database
 */
async function saveResolutionIssues(
  sessionId: string,
  issues: Array<{ entity: MatchedEntity; issueType: string }>
): Promise<void> {
  await prisma.brainDumpResolutionIssue.createMany({
    data: issues.map(issue => ({
      brainDumpSessionId: sessionId,
      issueType: issue.issueType,
      sourceText: issue.entity.mentionText,
      candidateMatchesJson: issue.entity.match.candidates ? issue.entity.match.candidates as any : undefined,
      resolutionStatus: 'open'
    }))
  });
}

/**
 * Generate summary text for session
 */
function generateSummary(
  actions: ProposedAction[],
  highConfidence: number,
  needsReview: number
): string {
  const creates = actions.filter(a => a.actionType.startsWith('create_')).length;
  const updates = actions.filter(a => a.actionType.startsWith('update_') || a.actionType.startsWith('set_')).length;
  const assigns = actions.filter(a => a.actionType === 'assign_task').length;
  
  const parts: string[] = [];
  
  if (creates > 0) {
    parts.push(`${creates} ${creates === 1 ? 'item' : 'items'} to create`);
  }
  
  if (updates > 0) {
    parts.push(`${updates} ${updates === 1 ? 'update' : 'updates'}`);
  }
  
  if (assigns > 0) {
    parts.push(`${assigns} ${assigns === 1 ? 'assignment' : 'assignments'}`);
  }
  
  if (needsReview > 0) {
    parts.push(`${needsReview} ${needsReview === 1 ? 'needs' : 'need'} review`);
  }
  
  return parts.join(', ') || 'No actions proposed';
}
