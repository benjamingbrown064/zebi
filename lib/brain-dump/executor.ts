/**
 * Phase 3: Action Execution
 * Applies approved actions to the database
 */

import { prisma } from '@/lib/prisma';
import { ProposedAction } from './action-generator';

export interface ExecutionResult {
  actionId: string; // Database ID of the proposed action
  actionType: string; // Type of action (create_task, etc.)
  success: boolean;
  error?: string;
  createdEntityId?: string;
  createdEntityType?: string;
}

export interface ExecutionSummary {
  success: boolean;
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  results: ExecutionResult[];
  createdEntities: {
    tasks: string[];
    projects: string[];
    objectives: string[];
  };
}

/**
 * Execute multiple approved actions in a transaction
 */
export async function executeActions(
  sessionId: string,
  workspaceId: string,
  userId: string,
  approvedActions: Array<ProposedAction & { id: string }>
): Promise<ExecutionSummary> {
  const results: ExecutionResult[] = [];
  const createdEntities = {
    tasks: [] as string[],
    projects: [] as string[],
    objectives: [] as string[]
  };

  // Execute each action
  for (const action of approvedActions) {
    try {
      const result = await executeAction(workspaceId, userId, action);
      // Include database ID in result
      result.actionId = action.id;
      results.push(result);

      if (result.success && result.createdEntityId) {
        if (result.createdEntityType === 'task') {
          createdEntities.tasks.push(result.createdEntityId);
        } else if (result.createdEntityType === 'project') {
          createdEntities.projects.push(result.createdEntityId);
        } else if (result.createdEntityType === 'objective') {
          createdEntities.objectives.push(result.createdEntityId);
        }
      }
    } catch (error) {
      console.error(`Execution error for action ${action.actionType}:`, error);
      results.push({
        actionId: action.id,
        actionType: action.actionType,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  const successfulActions = results.filter(r => r.success).length;
  const failedActions = results.filter(r => !r.success).length;

  // Log execution to database
  await logExecution(sessionId, results);

  // Update session status
  const sessionStatus = failedActions === 0 ? 'applied' : 
                       successfulActions > 0 ? 'partially_applied' : 'failed';
  
  await prisma.brainDumpSession.update({
    where: { id: sessionId },
    data: { 
      status: sessionStatus,
      processingCompletedAt: new Date()
    }
  });

  return {
    success: failedActions === 0,
    totalActions: approvedActions.length,
    successfulActions,
    failedActions,
    results,
    createdEntities
  };
}

/**
 * Execute a single action
 */
async function executeAction(
  workspaceId: string,
  userId: string,
  action: ProposedAction
): Promise<ExecutionResult> {
  const result = await (async () => {
    switch (action.actionType) {
      case 'create_task':
        return executeCreateTask(workspaceId, userId, action);
      
      case 'update_task':
        return executeUpdateTask(workspaceId, action);
      
      case 'assign_task':
        return executeAssignTask(workspaceId, userId, action);
      
      case 'set_due_date':
        return executeSetDueDate(workspaceId, action);
      
      case 'set_priority':
        return executeSetPriority(workspaceId, action);
      
      case 'set_status':
        return executeSetStatus(workspaceId, action);
      
      case 'create_project':
        return executeCreateProject(workspaceId, userId, action);
      
      case 'update_project':
        return executeUpdateProject(workspaceId, action);
      
      case 'create_objective':
        return executeCreateObjective(workspaceId, userId, action);
      
      case 'update_objective':
        return executeUpdateObjective(workspaceId, action);
      
      case 'add_note':
        return executeAddNote(workspaceId, userId, action);
      
      default:
        return {
          actionId: '',
          actionType: action.actionType,
          success: false,
          error: `Unknown action type: ${action.actionType}`
        };
    }
  })();

  // Ensure actionType is always included
  result.actionType = action.actionType;
  return result;
}

/**
 * Create a new task
 */
async function executeCreateTask(
  workspaceId: string,
  userId: string,
  action: ProposedAction
): Promise<ExecutionResult> {
  try {
    const { title, description, projectId, objectiveId, companyId, dueAt, priority, status } = action.payload;

    if (!title) {
      return {
        actionId: '',
        actionType: 'create_task',
        success: false,
        error: 'Task title is required'
      };
    }

    // Get default status ID (todo/active status)
    const defaultStatus = await prisma.status.findFirst({
      where: { 
        workspaceId,
        OR: [
          { name: 'Todo' },
          { name: 'Active' },
          { name: 'To Do' }
        ]
      }
    });

    if (!defaultStatus) {
      throw new Error('No default status found in workspace');
    }

    // Map priority string to number (1=high, 2=medium, 3=low)
    const priorityMap: Record<string, number> = { high: 1, medium: 2, low: 3 };
    const priorityNum = priority ? priorityMap[priority.toLowerCase()] || 2 : 2;

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        workspaceId,
        createdBy: userId,
        projectId: projectId || null,
        objectiveId: objectiveId || null,
        companyId: companyId || null,
        dueAt: dueAt ? new Date(dueAt) : null,
        priority: priorityNum,
        statusId: defaultStatus.id,
        aiGenerated: true
      }
    });

    return {
      actionId: '',
      actionType: 'create_task',
      success: true,
      createdEntityId: task.id,
      createdEntityType: 'task'
    };
  } catch (error) {
    return {
      actionId: '',
      actionType: 'create_task',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create task'
    };
  }
}

/**
 * Update an existing task
 */
async function executeUpdateTask(
  workspaceId: string,
  action: ProposedAction
): Promise<ExecutionResult> {
  try {
    const taskId = action.targetEntityId;
    
    if (!taskId) {
      return {
        actionId: '',
        actionType: action.actionType,
        success: false,
        error: 'Task ID is required'
      };
    }

    // Verify task exists and belongs to workspace
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        workspaceId
      }
    });

    if (!existingTask) {
      return {
        actionId: '',
        actionType: action.actionType,
        success: false,
        error: 'Task not found'
      };
    }

    // Build update data (only include provided fields)
    const updateData: any = {};
    if (action.payload.title) updateData.title = action.payload.title;
    if (action.payload.description !== undefined) updateData.description = action.payload.description;
    if (action.payload.dueAt) updateData.dueAt = new Date(action.payload.dueAt);
    if (action.payload.projectId !== undefined) updateData.projectId = action.payload.projectId;
    if (action.payload.objectiveId !== undefined) updateData.objectiveId = action.payload.objectiveId;
    if (action.payload.companyId !== undefined) updateData.companyId = action.payload.companyId;
    
    // Handle status (need to look up status ID)
    if (action.payload.status) {
      const status = await prisma.status.findFirst({
        where: {
          workspaceId,
          name: { contains: action.payload.status, mode: 'insensitive' }
        }
      });
      if (status) updateData.statusId = status.id;
    }
    
    // Handle priority (convert to number)
    if (action.payload.priority) {
      const priorityMap: Record<string, number> = { high: 1, medium: 2, low: 3 };
      updateData.priority = priorityMap[action.payload.priority.toLowerCase()] || 2;
    }

    await prisma.task.update({
      where: { id: taskId },
      data: updateData
    });

    return {
      actionId: '',
        actionType: action.actionType,
      success: true,
      createdEntityId: taskId,
      createdEntityType: 'task'
    };
  } catch (error) {
    return {
      actionId: '',
        actionType: action.actionType,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update task'
    };
  }
}

/**
 * Assign a task to a user
 */
async function executeAssignTask(
  workspaceId: string,
  userId: string,
  action: ProposedAction
): Promise<ExecutionResult> {
  try {
    const taskId = action.targetEntityId;
    const assigneeId = action.payload.assigneeId || userId; // Default to current user

    if (!taskId) {
      return {
        actionId: '',
        actionType: action.actionType,
        success: false,
        error: 'Task ID is required'
      };
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { assigneeId: assigneeId }
    });

    return {
      actionId: '',
        actionType: action.actionType,
      success: true,
      createdEntityId: taskId,
      createdEntityType: 'task'
    };
  } catch (error) {
    return {
      actionId: '',
        actionType: action.actionType,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign task'
    };
  }
}

/**
 * Set or update task due date
 */
async function executeSetDueDate(
  workspaceId: string,
  action: ProposedAction
): Promise<ExecutionResult> {
  try {
    const taskId = action.targetEntityId;
    const dueAt = action.payload.dueAt;

    if (!taskId) {
      return {
        actionId: '',
        actionType: action.actionType,
        success: false,
        error: 'Task ID is required'
      };
    }

    if (!dueAt) {
      return {
        actionId: '',
        actionType: action.actionType,
        success: false,
        error: 'Due date is required'
      };
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { dueAt: new Date(dueAt) }
    });

    return {
      actionId: '',
        actionType: action.actionType,
      success: true,
      createdEntityId: taskId,
      createdEntityType: 'task'
    };
  } catch (error) {
    return {
      actionId: '',
        actionType: action.actionType,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set due date'
    };
  }
}

/**
 * Set or update task priority
 */
async function executeSetPriority(
  workspaceId: string,
  action: ProposedAction
): Promise<ExecutionResult> {
  try {
    const taskId = action.targetEntityId;
    const priority = action.payload.priority;

    if (!taskId) {
      return {
        actionId: '',
        actionType: action.actionType,
        success: false,
        error: 'Task ID is required'
      };
    }

    if (!priority) {
      return {
        actionId: '',
        actionType: action.actionType,
        success: false,
        error: 'Priority is required'
      };
    }

    // Convert priority string to number
    const priorityMap: Record<string, number> = { high: 1, medium: 2, low: 3 };
    const priorityNum = priorityMap[priority.toLowerCase()] || 2;

    await prisma.task.update({
      where: { id: taskId },
      data: { priority: priorityNum }
    });

    return {
      actionId: '',
        actionType: action.actionType,
      success: true,
      createdEntityId: taskId,
      createdEntityType: 'task'
    };
  } catch (error) {
    return {
      actionId: '',
        actionType: action.actionType,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set priority'
    };
  }
}

/**
 * Set or update task status
 */
async function executeSetStatus(
  workspaceId: string,
  action: ProposedAction
): Promise<ExecutionResult> {
  try {
    const taskId = action.targetEntityId;
    const statusName = action.payload.status;

    if (!taskId) {
      return {
        actionId: '',
        actionType: action.actionType,
        success: false,
        error: 'Task ID is required'
      };
    }

    if (!statusName) {
      return {
        actionId: '',
        actionType: action.actionType,
        success: false,
        error: 'Status is required'
      };
    }

    // Look up status by name
    const status = await prisma.status.findFirst({
      where: {
        workspaceId,
        name: { contains: statusName, mode: 'insensitive' }
      }
    });

    if (!status) {
      return {
        actionId: '',
        actionType: action.actionType,
        success: false,
        error: `Status "${statusName}" not found in workspace`
      };
    }

    const updateData: any = { statusId: status.id };
    
    // If marking as completed (status name contains "done" or "complete"), set completedAt
    const isComplete = statusName.toLowerCase().includes('done') || 
                      statusName.toLowerCase().includes('complete');
    
    if (isComplete) {
      updateData.completedAt = new Date();
    } else {
      // If changing from completed to something else, clear completedAt
      updateData.completedAt = null;
    }

    await prisma.task.update({
      where: { id: taskId },
      data: updateData
    });

    return {
      actionId: '',
        actionType: action.actionType,
      success: true,
      createdEntityId: taskId,
      createdEntityType: 'task'
    };
  } catch (error) {
    return {
      actionId: '',
        actionType: action.actionType,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set status'
    };
  }
}

/**
 * Create a new project
 */
async function executeCreateProject(
  workspaceId: string,
  userId: string,
  action: ProposedAction
): Promise<ExecutionResult> {
  try {
    const { name, description, companyId, objectiveId } = action.payload;

    if (!name) {
      return {
        actionId: '',
        actionType: action.actionType,
        success: false,
        error: 'Project name is required'
      };
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        workspaceId,
        companyId: companyId || null,
        objectiveId: objectiveId || null
      }
    });

    return {
      actionId: '',
        actionType: action.actionType,
      success: true,
      createdEntityId: project.id,
      createdEntityType: 'project'
    };
  } catch (error) {
    return {
      actionId: '',
        actionType: action.actionType,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create project'
    };
  }
}

/**
 * Update an existing project
 */
async function executeUpdateProject(
  workspaceId: string,
  action: ProposedAction
): Promise<ExecutionResult> {
  try {
    const projectId = action.targetEntityId;

    if (!projectId) {
      return {
        actionId: '',
        actionType: action.actionType,
        success: false,
        error: 'Project ID is required'
      };
    }

    // Verify project exists and belongs to workspace
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId
      }
    });

    if (!existingProject) {
      return {
        actionId: '',
        actionType: action.actionType,
        success: false,
        error: 'Project not found'
      };
    }

    // Build update data
    const updateData: any = {};
    if (action.payload.name) updateData.name = action.payload.name;
    if (action.payload.description !== undefined) updateData.description = action.payload.description;
    if (action.payload.companyId !== undefined) updateData.companyId = action.payload.companyId;
    if (action.payload.objectiveId !== undefined) updateData.objectiveId = action.payload.objectiveId;

    await prisma.project.update({
      where: { id: projectId },
      data: updateData
    });

    return {
      actionId: '',
        actionType: action.actionType,
      success: true,
      createdEntityId: projectId,
      createdEntityType: 'project'
    };
  } catch (error) {
    return {
      actionId: '',
        actionType: action.actionType,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update project'
    };
  }
}

/**
 * Create a new objective
 */
async function executeCreateObjective(
  workspaceId: string,
  userId: string,
  action: ProposedAction
): Promise<ExecutionResult> {
  try {
    const { title, description, companyId, targetDate, deadline, goalId } = action.payload;

    if (!title) {
      return {
        actionId: '',
        actionType: action.actionType,
        success: false,
        error: 'Objective title is required'
      };
    }

    // Required fields with defaults
    const now = new Date();
    const defaultDeadline = deadline ? new Date(deadline) : 
                           targetDate ? new Date(targetDate) :
                           new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

    const objective = await prisma.objective.create({
      data: {
        title,
        description: description || null,
        workspaceId,
        createdBy: userId,
        companyId: companyId || null,
        goalId: goalId || null,
        objectiveType: 'milestone', // Default type
        metricType: 'completion', // Default metric
        targetValue: 100, // 100% completion
        currentValue: 0,
        unit: '%',
        startDate: now,
        deadline: defaultDeadline,
        status: 'active'
      }
    });

    return {
      actionId: '',
        actionType: action.actionType,
      success: true,
      createdEntityId: objective.id,
      createdEntityType: 'objective'
    };
  } catch (error) {
    return {
      actionId: '',
        actionType: action.actionType,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create objective'
    };
  }
}

/**
 * Update an existing objective
 */
async function executeUpdateObjective(
  workspaceId: string,
  action: ProposedAction
): Promise<ExecutionResult> {
  try {
    const objectiveId = action.targetEntityId;

    if (!objectiveId) {
      return {
        actionId: '',
        actionType: action.actionType,
        success: false,
        error: 'Objective ID is required'
      };
    }

    // Verify objective exists and belongs to workspace
    const existingObjective = await prisma.objective.findFirst({
      where: {
        id: objectiveId,
        workspaceId
      }
    });

    if (!existingObjective) {
      return {
        actionId: '',
        actionType: action.actionType,
        success: false,
        error: 'Objective not found'
      };
    }

    // Build update data
    const updateData: any = {};
    if (action.payload.title) updateData.title = action.payload.title;
    if (action.payload.description !== undefined) updateData.description = action.payload.description;
    if (action.payload.status) updateData.status = action.payload.status;
    if (action.payload.targetDate || action.payload.deadline) {
      updateData.deadline = new Date(action.payload.deadline || action.payload.targetDate);
    }
    if (action.payload.companyId !== undefined) updateData.companyId = action.payload.companyId;

    await prisma.objective.update({
      where: { id: objectiveId },
      data: updateData
    });

    return {
      actionId: '',
        actionType: action.actionType,
      success: true,
      createdEntityId: objectiveId,
      createdEntityType: 'objective'
    };
  } catch (error) {
    return {
      actionId: '',
        actionType: action.actionType,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update objective'
    };
  }
}

/**
 * Add a note to a task, project, or objective
 */
async function executeAddNote(
  workspaceId: string,
  userId: string,
  action: ProposedAction
): Promise<ExecutionResult> {
  try {
    const { taskId, projectId, objectiveId, note } = action.payload;

    if (!note) {
      return {
        actionId: '',
        actionType: action.actionType,
        success: false,
        error: 'Note content is required'
      };
    }

    // Determine which entity to add note to
    if (taskId) {
      // Add note to task description or create a comment (if comments system exists)
      const task = await prisma.task.findFirst({
        where: { id: taskId, workspaceId }
      });

      if (!task) {
        return {
          actionId: '',
        actionType: action.actionType,
          success: false,
          error: 'Task not found'
        };
      }

      // Append note to description
      const newDescription = task.description 
        ? `${task.description}\n\n---\n${note}`
        : note;

      await prisma.task.update({
        where: { id: taskId },
        data: { description: newDescription }
      });

      return {
        actionId: '',
        actionType: action.actionType,
        success: true,
        createdEntityId: taskId,
        createdEntityType: 'task'
      };
    }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, workspaceId }
      });

      if (!project) {
        return {
          actionId: '',
        actionType: action.actionType,
          success: false,
          error: 'Project not found'
        };
      }

      const newDescription = project.description 
        ? `${project.description}\n\n---\n${note}`
        : note;

      await prisma.project.update({
        where: { id: projectId },
        data: { description: newDescription }
      });

      return {
        actionId: '',
        actionType: action.actionType,
        success: true,
        createdEntityId: projectId,
        createdEntityType: 'project'
      };
    }

    if (objectiveId) {
      const objective = await prisma.objective.findFirst({
        where: { id: objectiveId, workspaceId }
      });

      if (!objective) {
        return {
          actionId: '',
        actionType: action.actionType,
          success: false,
          error: 'Objective not found'
        };
      }

      const newDescription = objective.description 
        ? `${objective.description}\n\n---\n${note}`
        : note;

      await prisma.objective.update({
        where: { id: objectiveId },
        data: { description: newDescription }
      });

      return {
        actionId: '',
        actionType: action.actionType,
        success: true,
        createdEntityId: objectiveId,
        createdEntityType: 'objective'
      };
    }

    return {
      actionId: '',
        actionType: action.actionType,
      success: false,
      error: 'No target entity specified for note'
    };
  } catch (error) {
    return {
      actionId: '',
        actionType: action.actionType,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add note'
    };
  }
}

/**
 * Log execution results to database
 */
async function logExecution(
  sessionId: string,
  results: ExecutionResult[]
): Promise<void> {
  try {
    const logs = results.map(result => ({
      brainDumpSessionId: sessionId,
      proposedActionId: result.actionId,
      executionStatus: result.success ? 'success' : 'failed',
      executionMessage: result.error || null,
      resultingEntityId: result.createdEntityId || null,
      resultingEntityType: result.createdEntityType || null
    }));

    await prisma.brainDumpExecutionLog.createMany({
      data: logs
    });
  } catch (error) {
    console.error('Failed to log execution:', error);
    // Don't throw - logging failure shouldn't break execution
  }
}
