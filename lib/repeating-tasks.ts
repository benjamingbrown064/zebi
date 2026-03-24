// Repeating Task Template Expansion Logic
// Generates tasks from repeating task templates on schedule

import { prisma } from '@/lib/prisma';

export interface TaskTemplateData {
  title: string;
  description?: string;
  priority?: number;
  dueAt?: string; // ISO date string or relative like "+7d"
  statusId?: string;
  tags?: string[];
  effortPoints?: number;
}

export interface RepeatingTaskTemplate {
  id: string;
  workspaceId: string;
  companyId?: string | null;
  projectId?: string | null;
  title: string;
  description?: string | null;
  frequency: string; // daily, weekly, monthly, custom
  customInterval?: any;
  nextRun: Date;
  lastRun?: Date | null;
  taskTemplate: TaskTemplateData;
  isActive: boolean;
}

/**
 * Calculate next run date based on frequency
 */
export function calculateNextRun(
  frequency: string,
  currentNextRun: Date,
  customInterval?: any
): Date {
  const now = new Date();
  const next = new Date(currentNextRun);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    
    case 'custom':
      if (customInterval?.days) {
        next.setDate(next.getDate() + customInterval.days);
      } else if (customInterval?.weeks) {
        next.setDate(next.getDate() + (customInterval.weeks * 7));
      } else if (customInterval?.months) {
        next.setMonth(next.getMonth() + customInterval.months);
      }
      break;
  }

  // If the next run is in the past (e.g., first run or long gap), set to now + frequency
  if (next < now) {
    return calculateNextRun(frequency, now, customInterval);
  }

  return next;
}

/**
 * Parse relative date strings like "+7d" or "+2w"
 */
export function parseRelativeDate(relativeDate: string): Date {
  const now = new Date();
  const match = relativeDate.match(/^([+-])(\d+)([dwmy])$/);
  
  if (!match) {
    return now;
  }

  const [, sign, amount, unit] = match;
  const value = parseInt(amount, 10) * (sign === '+' ? 1 : -1);

  switch (unit) {
    case 'd':
      now.setDate(now.getDate() + value);
      break;
    case 'w':
      now.setDate(now.getDate() + (value * 7));
      break;
    case 'm':
      now.setMonth(now.getMonth() + value);
      break;
    case 'y':
      now.setFullYear(now.getFullYear() + value);
      break;
  }

  return now;
}

/**
 * Expand template variables in task data
 */
export function expandTemplate(
  template: TaskTemplateData,
  context: {
    spaceName?: string;
    projectName?: string;
    date: Date;
  }
): TaskTemplateData {
  const expanded = { ...template };
  const dateStr = context.date.toISOString().split('T')[0];
  const weekNum = getWeekNumber(context.date);
  const monthName = context.date.toLocaleDateString('en-US', { month: 'long' });
  const year = context.date.getFullYear();

  // Replace variables in title
  if (expanded.title) {
    expanded.title = expanded.title
      .replace(/\{space\}/g, context.spaceName || 'Space')
      .replace(/\{project\}/g, context.projectName || 'Project')
      .replace(/\{date\}/g, dateStr)
      .replace(/\{week\}/g, `Week ${weekNum}`)
      .replace(/\{month\}/g, monthName)
      .replace(/\{year\}/g, String(year));
  }

  // Replace variables in description
  if (expanded.description) {
    expanded.description = expanded.description
      .replace(/\{space\}/g, context.spaceName || 'Space')
      .replace(/\{project\}/g, context.projectName || 'Project')
      .replace(/\{date\}/g, dateStr)
      .replace(/\{week\}/g, `Week ${weekNum}`)
      .replace(/\{month\}/g, monthName)
      .replace(/\{year\}/g, String(year));
  }

  // Parse relative due date
  if (expanded.dueAt && expanded.dueAt.startsWith('+')) {
    expanded.dueAt = parseRelativeDate(expanded.dueAt).toISOString();
  }

  return expanded;
}

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Generate task from repeating task template
 */
export async function generateTaskFromTemplate(
  template: RepeatingTaskTemplate,
  userId: string
): Promise<string> {
  const now = new Date();

  // Fetch context for template expansion
  let spaceName: string | undefined;
  let projectName: string | undefined;

  if (template.companyId) {
    const space = await prisma.space.findUnique({
      where: { id: template.companyId },
      select: { name: true },
    });
    spaceName = space?.name;
  }

  if (template.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: template.projectId },
      select: { name: true },
    });
    projectName = project?.name;
  }

  // Expand template
  const expandedTemplate = expandTemplate(template.taskTemplate, {
    spaceName,
    projectName,
    date: now,
  });

  // Get default status (prefer todo, otherwise first available)
  let defaultStatus = await prisma.status.findFirst({
    where: {
      workspaceId: template.workspaceId,
      type: 'todo',
    },
    orderBy: { sortOrder: 'asc' },
  });

  // Fallback: get any status for this workspace
  if (!defaultStatus) {
    defaultStatus = await prisma.status.findFirst({
      where: {
        workspaceId: template.workspaceId,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  if (!defaultStatus) {
    throw new Error(`No status found for workspace ${template.workspaceId}`);
  }

  // Create the task
  const task = await prisma.task.create({
    data: {
      workspaceId: template.workspaceId,
      title: expandedTemplate.title,
      description: expandedTemplate.description,
      priority: expandedTemplate.priority || 3,
      statusId: expandedTemplate.statusId || defaultStatus.id,
      dueAt: expandedTemplate.dueAt ? new Date(expandedTemplate.dueAt) : null,
      companyId: template.companyId,
      projectId: template.projectId,
      repeatingTaskId: template.id,
      aiGenerated: true,
      aiAgent: 'repeating-task-executor',
      createdBy: userId,
      effortPoints: expandedTemplate.effortPoints,
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      workspaceId: template.workspaceId,
      taskId: task.id,
      companyId: template.companyId,
      projectId: template.projectId,
      eventType: 'task.created.auto',
      eventPayload: {
        source: 'repeating-task',
        templateId: template.id,
        templateTitle: template.title,
      },
      aiAgent: 'repeating-task-executor',
      createdBy: userId,
    },
  });

  return task.id;
}

/**
 * Process all due repeating tasks
 */
export async function processDueRepeatingTasks(userId: string): Promise<{
  processed: number;
  created: number;
  errors: Array<{ templateId: string; error: string }>;
}> {
  const now = new Date();
  
  // Find all active templates that are due
  const dueTemplates = await prisma.repeatingTask.findMany({
    where: {
      isActive: true,
      nextRun: {
        lte: now,
      },
    },
  });

  let created = 0;
  const errors: Array<{ templateId: string; error: string }> = [];

  // Process each template
  for (const template of dueTemplates) {
    try {
      await generateTaskFromTemplate(template as any as RepeatingTaskTemplate, userId);
      
      // Update template's next run and last run
      const nextRun = calculateNextRun(
        template.frequency,
        template.nextRun,
        template.customInterval
      );

      await prisma.repeatingTask.update({
        where: { id: template.id },
        data: {
          lastRun: now,
          nextRun,
        },
      });

      created++;
    } catch (error) {
      console.error(`Error processing template ${template.id}:`, error);
      errors.push({
        templateId: template.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    processed: dueTemplates.length,
    created,
    errors,
  };
}
