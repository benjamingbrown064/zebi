import { prisma } from './prisma';
import {
  assessTrajectory,
  detectBlockers,
  generateActionPlan,
  calculateObjectiveProgress,
} from './objective-intelligence';

export interface MonitoringResult {
  objectiveId: string;
  objectiveTitle: string;
  previousStatus: string;
  newStatus: string;
  statusChanged: boolean;
  newBlockers: number;
  actionsGenerated: number;
  alertRequired: boolean;
  alertMessage?: string;
}

/**
 * Monitor a single objective (called by cron)
 */
export async function monitorObjective(objectiveId: string): Promise<MonitoringResult> {
  const objective = await prisma.objective.findUnique({
    where: { id: objectiveId },
    include: {
      blockers: {
        where: { resolvedAt: null },
      },
    },
  });

  if (!objective) {
    throw new Error(`Objective ${objectiveId} not found`);
  }

  const previousStatus = objective.status;
  const previousBlockerCount = objective.blockers.length;

  // Step 1: Calculate current progress
  const currentProgress = await calculateObjectiveProgress(objectiveId);
  const progressPercent = (currentProgress / Number(objective.targetValue)) * 100;

  // Step 2: Assess trajectory
  const trajectory = await assessTrajectory(objectiveId);

  // Step 3: Detect new blockers
  const blockerDetection = await detectBlockers(objectiveId);
  
  // Create new blocker records
  const newBlockers = await Promise.all(
    blockerDetection.blockers.map(async blocker => {
      // Check if this blocker already exists
      const existing = await prisma.objectiveBlocker.findFirst({
        where: {
          objectiveId,
          title: blocker.title,
          resolvedAt: null,
        },
      });

      if (existing) return null;

      return prisma.objectiveBlocker.create({
        data: {
          objectiveId,
          blockerType: blocker.type,
          title: blocker.title,
          description: blocker.description,
          severity: blocker.severity,
          aiSuggestion: { suggestion: blocker.suggestion },
        },
      });
    })
  );

  const createdBlockers = newBlockers.filter(b => b !== null);

  // Step 4: Generate action plan if needed
  let actionsGenerated = 0;
  if (trajectory.status !== 'on_track' || createdBlockers.length > 0) {
    const allBlockers = await prisma.objectiveBlocker.findMany({
      where: {
        objectiveId,
        resolvedAt: null,
      },
    });

    if (allBlockers.length > 0) {
      const actionPlan = await generateActionPlan(objectiveId, allBlockers);

      // Create tasks from action plan
      const workspace = await prisma.workspace.findFirst({
        where: { id: objective.workspaceId },
      });

      if (workspace) {
        const defaultStatus = await prisma.status.findFirst({
          where: {
            workspaceId: objective.workspaceId,
            type: 'todo',
          },
        });

        if (defaultStatus) {
          for (const action of actionPlan.actions) {
            await prisma.task.create({
              data: {
                workspaceId: objective.workspaceId,
                title: action.title,
                description: action.description,
                statusId: defaultStatus.id,
                priority: action.priority,
                objectiveId,
                companyId: objective.companyId,
                aiGenerated: true,
                aiAgent: action.assignee === 'AI' ? 'Doug' : undefined,
                createdBy: workspace.ownerId || '00000000-0000-0000-0000-000000000000',
              },
            });
            actionsGenerated++;
          }
        }
      }

      // Store action plan in objective
      await prisma.objective.update({
        where: { id: objectiveId },
        data: {
          aiActionPlan: actionPlan,
        },
      });
    }
  }

  // Step 5: Update objective status
  await prisma.objective.update({
    where: { id: objectiveId },
    data: {
      currentValue: currentProgress,
      progressPercent,
      status: trajectory.status,
      lastChecked: new Date(),
    },
  });

  // Step 6: Determine if alert is needed
  const statusChanged = previousStatus !== trajectory.status;
  const newBlockersDetected = createdBlockers.length > 0;
  const alertRequired =
    statusChanged || newBlockersDetected || trajectory.status === 'blocked';

  let alertMessage: string | undefined;
  if (alertRequired) {
    if (trajectory.status === 'blocked') {
      alertMessage = `🚫 Objective BLOCKED: ${objective.title}\n${createdBlockers.length} active blockers detected.`;
    } else if (trajectory.status === 'at_risk') {
      alertMessage = `⚠️ Objective AT RISK: ${objective.title}\n${trajectory.reasoning}`;
    } else if (statusChanged && trajectory.status === 'on_track') {
      alertMessage = `✅ Objective back ON TRACK: ${objective.title}`;
    }
  }

  return {
    objectiveId,
    objectiveTitle: objective.title,
    previousStatus,
    newStatus: trajectory.status,
    statusChanged,
    newBlockers: createdBlockers.length,
    actionsGenerated,
    alertRequired,
    alertMessage,
  };
}

/**
 * Monitor all active objectives (called by cron)
 */
export async function monitorAllObjectives(
  workspaceId?: string
): Promise<MonitoringResult[]> {
  const whereClause = workspaceId
    ? { workspaceId, status: { in: ['active', 'on_track', 'at_risk', 'blocked'] } }
    : { status: { in: ['active', 'on_track', 'at_risk', 'blocked'] } };

  const objectives = await prisma.objective.findMany({
    where: whereClause,
    select: { id: true },
  });

  const results: MonitoringResult[] = [];

  for (const objective of objectives) {
    try {
      const result = await monitorObjective(objective.id);
      results.push(result);
    } catch (err) {
      console.error(`Failed to monitor objective ${objective.id}:`, err);
      results.push({
        objectiveId: objective.id,
        objectiveTitle: 'Error',
        previousStatus: 'unknown',
        newStatus: 'unknown',
        statusChanged: false,
        newBlockers: 0,
        actionsGenerated: 0,
        alertRequired: false,
      });
    }
  }

  return results;
}

/**
 * Generate daily summary of all objectives
 */
export async function generateDailySummary(workspaceId: string): Promise<string> {
  const objectives = await prisma.objective.findMany({
    where: {
      workspaceId,
      status: { in: ['active', 'on_track', 'at_risk', 'blocked'] },
    },
    include: {
      company: {
        select: { name: true },
      },
      blockers: {
        where: { resolvedAt: null },
      },
    },
    orderBy: { deadline: 'asc' },
  });

  if (objectives.length === 0) {
    return '📊 No active objectives to report.';
  }

  const byStatus = {
    on_track: objectives.filter(o => o.status === 'on_track' || o.status === 'active'),
    at_risk: objectives.filter(o => o.status === 'at_risk'),
    blocked: objectives.filter(o => o.status === 'blocked'),
  };

  let summary = '📊 Objective Status Summary\n\n';

  if (byStatus.on_track.length > 0) {
    summary += `✅ ON TRACK (${byStatus.on_track.length}):\n`;
    for (const obj of byStatus.on_track) {
      const progress = ((Number(obj.currentValue) / Number(obj.targetValue)) * 100).toFixed(0);
      summary += `  • ${obj.company?.name || 'General'}: ${obj.title} - ${progress}%\n`;
    }
    summary += '\n';
  }

  if (byStatus.at_risk.length > 0) {
    summary += `⚠️ AT RISK (${byStatus.at_risk.length}):\n`;
    for (const obj of byStatus.at_risk) {
      const progress = ((Number(obj.currentValue) / Number(obj.targetValue)) * 100).toFixed(0);
      summary += `  • ${obj.company?.name || 'General'}: ${obj.title} - ${progress}%\n`;
    }
    summary += '\n';
  }

  if (byStatus.blocked.length > 0) {
    summary += `🚫 BLOCKED (${byStatus.blocked.length}):\n`;
    for (const obj of byStatus.blocked) {
      const blockerCount = obj.blockers.length;
      summary += `  • ${obj.company?.name || 'General'}: ${obj.title} - ${blockerCount} blockers\n`;
    }
    summary += '\n';
  }

  return summary;
}
