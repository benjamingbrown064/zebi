/**
 * Phase 2: Action Generation
 * Generates structured action proposals from intents and matched entities
 */

import { ExtractedIntent } from './intent-extractor';
import { MatchedEntity } from './entity-matcher';
import { prisma } from '@/lib/prisma';

export interface ProposedAction {
  actionType: string;
  targetEntityType: string;
  targetEntityId: string | null; // Null if creating new
  payload: Record<string, any>;
  reasoning: string;
  confidenceScore: number;
  needsReview: boolean; // True if ambiguous/low confidence
}

export interface ActionGroup {
  category: 'creates' | 'updates' | 'assignments' | 'scheduling' | 'notes' | 'clarification';
  actions: ProposedAction[];
}

/**
 * Generate proposed actions from intents and matched entities
 */
export async function generateActions(
  sessionId: string,
  workspaceId: string,
  intents: ExtractedIntent[],
  matchedEntitiesMap: Map<string, MatchedEntity[]>
): Promise<ProposedAction[]> {
  const actions: ProposedAction[] = [];
  
  for (const intent of intents) {
    const matchedEntities = matchedEntitiesMap.get(JSON.stringify(intent)) || [];
    
    try {
      const proposedAction = await generateActionForIntent(
        workspaceId,
        intent,
        matchedEntities
      );
      
      if (proposedAction) {
        actions.push(proposedAction);
      }
    } catch (error) {
      console.error('Action generation error:', error);
      // Continue processing other intents
    }
  }
  
  return actions;
}

async function generateActionForIntent(
  workspaceId: string,
  intent: ExtractedIntent,
  matchedEntities: MatchedEntity[]
): Promise<ProposedAction | null> {
  const { action, context, confidence } = intent;
  
  // Extract relevant entities
  const taskEntity = matchedEntities.find(e => e.type === 'task');
  const projectEntity = matchedEntities.find(e => e.type === 'project');
  const objectiveEntity = matchedEntities.find(e => e.type === 'objective');
  const companyEntity = matchedEntities.find(e => e.type === 'company');
  const dateEntity = matchedEntities.find(e => e.type === 'date');
  const priorityEntity = matchedEntities.find(e => e.type === 'priority');
  const statusEntity = matchedEntities.find(e => e.type === 'status');
  
  switch (action) {
    case 'create_task':
      return generateCreateTaskAction(
        workspaceId,
        taskEntity,
        projectEntity,
        objectiveEntity,
        companyEntity,
        dateEntity,
        priorityEntity,
        context,
        confidence
      );
    
    case 'update_task':
      return generateUpdateTaskAction(
        taskEntity,
        statusEntity,
        priorityEntity,
        dateEntity,
        context,
        confidence
      );
    
    case 'assign_task':
      const personEntity = matchedEntities.find(e => e.type === 'person');
      return generateAssignTaskAction(
        taskEntity,
        personEntity,
        context,
        confidence
      );
    
    case 'set_due_date':
      return generateSetDueDateAction(
        taskEntity,
        dateEntity,
        context,
        confidence
      );
    
    case 'set_priority':
      return generateSetPriorityAction(
        taskEntity,
        priorityEntity,
        context,
        confidence
      );
    
    case 'set_status':
      return generateSetStatusAction(
        taskEntity,
        statusEntity,
        context,
        confidence
      );
    
    case 'create_project':
      return generateCreateProjectAction(
        projectEntity,
        companyEntity,
        context,
        confidence
      );
    
    case 'update_project':
      return generateUpdateProjectAction(
        projectEntity,
        statusEntity,
        context,
        confidence
      );
    
    case 'create_objective':
      return generateCreateObjectiveAction(
        objectiveEntity,
        companyEntity,
        context,
        confidence
      );
    
    case 'update_objective':
      return generateUpdateObjectiveAction(
        objectiveEntity,
        statusEntity,
        context,
        confidence
      );
    
    case 'add_note':
      return generateAddNoteAction(
        taskEntity || projectEntity || objectiveEntity,
        context,
        confidence
      );
    
    default:
      console.warn(`Unknown action type: ${action}`);
      return null;
  }
}

function generateCreateTaskAction(
  workspaceId: string,
  taskEntity: MatchedEntity | undefined,
  projectEntity: MatchedEntity | undefined,
  objectiveEntity: MatchedEntity | undefined,
  companyEntity: MatchedEntity | undefined,
  dateEntity: MatchedEntity | undefined,
  priorityEntity: MatchedEntity | undefined,
  context: string,
  confidence: number
): ProposedAction {
  const payload: Record<string, any> = {
    title: taskEntity?.match.entityName || 'Untitled Task',
    workspaceId
  };
  
  // Check if entity is a company (not a project)
  if (companyEntity?.match.entityId && companyEntity.match.entityType === 'company') {
    payload.companyId = companyEntity.match.entityId;
  }
  
  if (projectEntity?.match.entityId && projectEntity.match.entityType === 'project') {
    payload.projectId = projectEntity.match.entityId;
  }
  
  if (objectiveEntity?.match.entityId) {
    payload.objectiveId = objectiveEntity.match.entityId;
  }
  
  if (dateEntity) {
    // Use parsed ISO date if available, otherwise fall back to raw value
    payload.dueAt = dateEntity.parsedDate?.iso || dateEntity.value;
  }
  
  if (priorityEntity) {
    payload.priority = priorityEntity.match.entityName;
  }
  
  const confidences = [
    taskEntity?.match.confidence,
    projectEntity?.match.confidence,
    objectiveEntity?.match.confidence
  ].filter((c): c is number => typeof c === 'number');
  
  const avgConfidence = confidences.length > 0
    ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
    : confidence;
  
  // Build context description
  let contextDesc = '';
  if (companyEntity?.match.entityType === 'company') {
    contextDesc = ` for company "${companyEntity.match.entityName}"`;
  } else if (projectEntity?.match.entityType === 'project') {
    contextDesc = ` in project "${projectEntity.match.entityName}"`;
  } else if (objectiveEntity) {
    contextDesc = ` for objective "${objectiveEntity.match.entityName}"`;
  }
  
  return {
    actionType: 'create_task',
    targetEntityType: 'task',
    targetEntityId: null,
    payload,
    reasoning: `Create task: "${payload.title}"${contextDesc}`,
    confidenceScore: avgConfidence,
    needsReview: avgConfidence < 0.7 || !taskEntity
  };
}

function generateUpdateTaskAction(
  taskEntity: MatchedEntity | undefined,
  statusEntity: MatchedEntity | undefined,
  priorityEntity: MatchedEntity | undefined,
  dateEntity: MatchedEntity | undefined,
  context: string,
  confidence: number
): ProposedAction | null {
  if (!taskEntity?.match.entityId) {
    return null; // Can't update without a target task
  }
  
  const payload: Record<string, any> = {};
  
  if (statusEntity) {
    payload.status = statusEntity.match.entityName;
  }
  
  if (priorityEntity) {
    payload.priority = priorityEntity.match.entityName;
  }
  
  if (dateEntity) {
    // Use parsed ISO date if available, otherwise fall back to raw value
    payload.dueAt = dateEntity.parsedDate?.iso || dateEntity.value;
  }
  
  if (Object.keys(payload).length === 0) {
    return null; // No updates to make
  }
  
  const updates = Object.keys(payload).map(k => `${k}: ${payload[k]}`).join(', ');
  
  return {
    actionType: 'update_task',
    targetEntityType: 'task',
    targetEntityId: taskEntity.match.entityId,
    payload,
    reasoning: `Update "${taskEntity.match.entityName}" → ${updates}`,
    confidenceScore: taskEntity.match.confidence,
    needsReview: taskEntity.match.confidence < 0.7
  };
}

function generateAssignTaskAction(
  taskEntity: MatchedEntity | undefined,
  personEntity: MatchedEntity | undefined,
  context: string,
  confidence: number
): ProposedAction | null {
  if (!taskEntity?.match.entityId || !personEntity) {
    return null;
  }
  
  return {
    actionType: 'assign_task',
    targetEntityType: 'task',
    targetEntityId: taskEntity.match.entityId,
    payload: {
      assignedTo: personEntity.value
    },
    reasoning: `Assign "${taskEntity.match.entityName}" to ${personEntity.value}`,
    confidenceScore: Math.min(taskEntity.match.confidence, personEntity.confidence),
    needsReview: true // Always review assignments in MVP
  };
}

function generateSetDueDateAction(
  taskEntity: MatchedEntity | undefined,
  dateEntity: MatchedEntity | undefined,
  context: string,
  confidence: number
): ProposedAction | null {
  if (!taskEntity?.match.entityId || !dateEntity) {
    return null;
  }
  
  // Use parsed ISO date if available
  const dueDate = dateEntity.parsedDate?.iso || dateEntity.value;
  
  // Better reasoning with parsed date context
  let reasoning = `Set "${taskEntity.match.entityName}" due date to ${dateEntity.mentionText}`;
  if (dateEntity.parsedDate) {
    const formattedDate = new Date(dateEntity.parsedDate.iso).toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    reasoning += ` (${formattedDate})`;
  }
  
  // Need review if: ambiguous date, low confidence parsing, or unclear reference
  const needsReview = dateEntity.parsedDate?.ambiguous || 
                     (dateEntity.parsedDate?.confidence || 1) < 0.7 ||
                     !dateEntity.parsedDate; // No successful parse
  
  return {
    actionType: 'set_due_date',
    targetEntityType: 'task',
    targetEntityId: taskEntity.match.entityId,
    payload: {
      dueAt: dueDate
    },
    reasoning,
    confidenceScore: Math.min(
      taskEntity.match.confidence,
      dateEntity.parsedDate?.confidence || 0.5
    ),
    needsReview
  };
}

function generateSetPriorityAction(
  taskEntity: MatchedEntity | undefined,
  priorityEntity: MatchedEntity | undefined,
  context: string,
  confidence: number
): ProposedAction | null {
  if (!taskEntity?.match.entityId || !priorityEntity) {
    return null;
  }
  
  return {
    actionType: 'set_priority',
    targetEntityType: 'task',
    targetEntityId: taskEntity.match.entityId,
    payload: {
      priority: priorityEntity.match.entityName
    },
    reasoning: `Set "${taskEntity.match.entityName}" priority to ${priorityEntity.match.entityName}`,
    confidenceScore: taskEntity.match.confidence,
    needsReview: false
  };
}

function generateSetStatusAction(
  taskEntity: MatchedEntity | undefined,
  statusEntity: MatchedEntity | undefined,
  context: string,
  confidence: number
): ProposedAction | null {
  if (!taskEntity?.match.entityId || !statusEntity) {
    return null;
  }
  
  return {
    actionType: 'set_status',
    targetEntityType: 'task',
    targetEntityId: taskEntity.match.entityId,
    payload: {
      status: statusEntity.match.entityName
    },
    reasoning: `Set "${taskEntity.match.entityName}" status to ${statusEntity.match.entityName}`,
    confidenceScore: taskEntity.match.confidence,
    needsReview: false
  };
}

function generateCreateProjectAction(
  projectEntity: MatchedEntity | undefined,
  companyEntity: MatchedEntity | undefined,
  context: string,
  confidence: number
): ProposedAction | null {
  if (!projectEntity) {
    return null;
  }
  
  const payload: Record<string, any> = {
    name: projectEntity.match.entityName
  };
  
  if (companyEntity?.match.entityId) {
    payload.companyId = companyEntity.match.entityId;
  }
  
  return {
    actionType: 'create_project',
    targetEntityType: 'project',
    targetEntityId: null,
    payload,
    reasoning: `Create project: "${payload.name}"${companyEntity ? ` for ${companyEntity.match.entityName}` : ''}`,
    confidenceScore: projectEntity.match.confidence,
    needsReview: projectEntity.match.confidence < 0.7
  };
}

function generateUpdateProjectAction(
  projectEntity: MatchedEntity | undefined,
  statusEntity: MatchedEntity | undefined,
  context: string,
  confidence: number
): ProposedAction | null {
  if (!projectEntity?.match.entityId) {
    return null;
  }
  
  const payload: Record<string, any> = {};
  
  if (statusEntity) {
    payload.status = statusEntity.match.entityName;
  }
  
  if (Object.keys(payload).length === 0) {
    return null;
  }
  
  return {
    actionType: 'update_project',
    targetEntityType: 'project',
    targetEntityId: projectEntity.match.entityId,
    payload,
    reasoning: `Update project "${projectEntity.match.entityName}"`,
    confidenceScore: projectEntity.match.confidence,
    needsReview: projectEntity.match.confidence < 0.7
  };
}

function generateCreateObjectiveAction(
  objectiveEntity: MatchedEntity | undefined,
  companyEntity: MatchedEntity | undefined,
  context: string,
  confidence: number
): ProposedAction | null {
  if (!objectiveEntity) {
    return null;
  }
  
  const payload: Record<string, any> = {
    title: objectiveEntity.match.entityName
  };
  
  if (companyEntity?.match.entityId) {
    payload.companyId = companyEntity.match.entityId;
  }
  
  return {
    actionType: 'create_objective',
    targetEntityType: 'objective',
    targetEntityId: null,
    payload,
    reasoning: `Create objective: "${payload.title}"${companyEntity ? ` for ${companyEntity.match.entityName}` : ''}`,
    confidenceScore: objectiveEntity.match.confidence,
    needsReview: objectiveEntity.match.confidence < 0.7
  };
}

function generateUpdateObjectiveAction(
  objectiveEntity: MatchedEntity | undefined,
  statusEntity: MatchedEntity | undefined,
  context: string,
  confidence: number
): ProposedAction | null {
  if (!objectiveEntity?.match.entityId) {
    return null;
  }
  
  const payload: Record<string, any> = {};
  
  if (statusEntity) {
    payload.status = statusEntity.match.entityName;
  }
  
  if (Object.keys(payload).length === 0) {
    return null;
  }
  
  return {
    actionType: 'update_objective',
    targetEntityType: 'objective',
    targetEntityId: objectiveEntity.match.entityId,
    payload,
    reasoning: `Update objective "${objectiveEntity.match.entityName}" status to ${statusEntity?.match.entityName}`,
    confidenceScore: objectiveEntity.match.confidence,
    needsReview: objectiveEntity.match.confidence < 0.7
  };
}

function generateAddNoteAction(
  targetEntity: MatchedEntity | undefined,
  context: string,
  confidence: number
): ProposedAction | null {
  if (!targetEntity?.match.entityId) {
    return null;
  }
  
  return {
    actionType: 'add_note',
    targetEntityType: targetEntity.type,
    targetEntityId: targetEntity.match.entityId,
    payload: {
      note: context
    },
    reasoning: `Add note to "${targetEntity.match.entityName}"`,
    confidenceScore: targetEntity.match.confidence,
    needsReview: false
  };
}

/**
 * Group actions by category for review UI
 */
export function groupActions(actions: ProposedAction[]): ActionGroup[] {
  const groups: Record<string, ProposedAction[]> = {
    creates: [],
    updates: [],
    assignments: [],
    scheduling: [],
    notes: [],
    clarification: []
  };
  
  for (const action of actions) {
    if (action.actionType.startsWith('create_')) {
      groups.creates.push(action);
    } else if (action.actionType === 'assign_task') {
      groups.assignments.push(action);
    } else if (action.actionType === 'set_due_date') {
      groups.scheduling.push(action);
    } else if (action.actionType === 'add_note') {
      groups.notes.push(action);
    } else if (action.needsReview || action.confidenceScore < 0.6) {
      groups.clarification.push(action);
    } else {
      groups.updates.push(action);
    }
  }
  
  return Object.entries(groups)
    .filter(([_, actions]) => actions.length > 0)
    .map(([category, actions]) => ({
      category: category as any,
      actions
    }));
}

/**
 * Save proposed actions to database
 */
export async function saveProposedActions(
  sessionId: string,
  actions: ProposedAction[]
): Promise<void> {
  await prisma.brainDumpProposedAction.createMany({
    data: actions.map(action => ({
      brainDumpSessionId: sessionId,
      actionType: action.actionType,
      targetEntityType: action.targetEntityType,
      targetEntityId: action.targetEntityId,
      payloadJson: action.payload,
      reasonSummary: action.reasoning,
      confidenceScore: action.confidenceScore,
      confidenceLevel: action.confidenceScore >= 0.8 ? 'high' : action.confidenceScore >= 0.6 ? 'medium' : 'low',
      requiresConfirmation: action.needsReview,
      status: 'proposed'
    }))
  });
}
