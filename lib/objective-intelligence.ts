import { prisma } from './prisma';
import { generateCompletion, generateJSONCompletion } from './anthropic';
import type { Objective, Task, ObjectiveProgress, ObjectiveBlocker } from '@prisma/client';

export interface ObjectiveContext {
  objective: Objective;
  company?: {
    name: string;
    industry?: string;
    stage?: string;
    revenue?: number;
  };
  projects: Array<{ id: string; name: string; taskCount: number }>;
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
  };
  progressHistory: ObjectiveProgress[];
  activeBlockers: ObjectiveBlocker[];
  pastBlockers: ObjectiveBlocker[];
  velocity: {
    tasksPerWeek: number;
    progressPerDay: number;
  };
}

export interface TrajectoryAssessment {
  status: 'on_track' | 'at_risk' | 'blocked';
  confidence: number; // 0-1
  reasoning: string;
  projectedCompletion: string | null; // ISO date
  recommendations: string[];
}

export interface BlockerDetection {
  blockers: {
    type: 'velocity' | 'resource' | 'dependency' | 'external' | 'unknown';
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    suggestion: string;
  }[];
}

/**
 * Calculate current progress for an objective
 */
export async function calculateObjectiveProgress(objectiveId: string): Promise<number> {
  const objective = await prisma.objective.findUnique({
    where: { id: objectiveId },
    include: {
      tasks: {
        where: {
          completedAt: { not: null },
        },
      },
      progressEntries: {
        orderBy: { entryDate: 'desc' },
        take: 1,
      },
    },
  });

  if (!objective) {
    throw new Error('Objective not found');
  }

  // If there's a manual progress entry, use it
  if (objective.progressEntries.length > 0) {
    const latestEntry = objective.progressEntries[0];
    return Number(latestEntry.value);
  }

  // Otherwise, calculate based on task completion
  if (objective.tasks.length === 0) {
    return Number(objective.currentValue);
  }

  // For now, return stored currentValue
  // In production, this could be more sophisticated (e.g., fetch from external APIs)
  return Number(objective.currentValue);
}

/**
 * Calculate task velocity (tasks completed per week)
 */
export async function calculateTaskVelocity(objectiveId: string): Promise<number> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const completedTasks = await prisma.task.findMany({
    where: {
      objectiveId,
      completedAt: {
        gte: sevenDaysAgo,
      },
    },
  });

  return completedTasks.length;
}

/**
 * Gather full context for objective analysis
 */
export async function gatherObjectiveContext(objectiveId: string): Promise<ObjectiveContext> {
  const objective = await prisma.objective.findUnique({
    where: { id: objectiveId },
    include: {
      company: {
        select: {
          name: true,
          industry: true,
          stage: true,
          revenue: true,
        },
      },
      projects: {
        select: {
          id: true,
          name: true,
        },
      },
      tasks: {
        select: {
          id: true,
          completedAt: true,
        },
      },
      progressEntries: {
        orderBy: { entryDate: 'desc' },
        take: 30,
      },
      blockers: {
        orderBy: { detectedAt: 'desc' },
      },
    },
  });

  if (!objective) {
    throw new Error('Objective not found');
  }

  // Calculate project task counts
  const projectsWithCounts = await Promise.all(
    objective.projects.map(async project => {
      const taskCount = await prisma.task.count({
        where: { projectId: project.id },
      });
      return {
        id: project.id,
        name: project.name,
        taskCount,
      };
    })
  );

  // Calculate task stats
  const completedTasks = objective.tasks.filter(t => t.completedAt !== null);
  const inProgressTasks = objective.tasks.filter(t => t.completedAt === null);

  // Calculate velocity
  const velocity = await calculateTaskVelocity(objectiveId);
  const progressPerDay = objective.progressEntries.length >= 2
    ? calculateProgressRate(objective.progressEntries)
    : 0;

  // Split blockers
  const activeBlockers = objective.blockers.filter(b => b.resolvedAt === null);
  const pastBlockers = objective.blockers.filter(b => b.resolvedAt !== null);

  return {
    objective,
    company: objective.company as any || undefined,
    projects: projectsWithCounts,
    tasks: {
      total: objective.tasks.length,
      completed: completedTasks.length,
      inProgress: inProgressTasks.length,
    },
    progressHistory: objective.progressEntries,
    activeBlockers,
    pastBlockers,
    velocity: {
      tasksPerWeek: velocity,
      progressPerDay,
    },
  };
}

/**
 * Calculate progress rate (value per day) from history
 */
function calculateProgressRate(entries: ObjectiveProgress[]): number {
  if (entries.length < 2) return 0;

  const recent = entries[0];
  const older = entries[entries.length - 1];

  const valueDiff = Number(recent.value) - Number(older.value);
  const timeDiff = recent.entryDate.getTime() - older.entryDate.getTime();
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

  return daysDiff > 0 ? valueDiff / daysDiff : 0;
}

/**
 * Assess objective trajectory using AI
 */
export async function assessTrajectory(
  objectiveId: string
): Promise<TrajectoryAssessment> {
  const context = await gatherObjectiveContext(objectiveId);
  const { objective, velocity, progressHistory } = context;

  const daysRemaining = Math.ceil(
    (objective.deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const currentProgress = Number(objective.currentValue);
  const targetProgress = Number(objective.targetValue);
  const progressGap = targetProgress - currentProgress;

  const prompt = `Analyze this objective's trajectory and determine if it's on track.

Objective: ${objective.title}
Current: ${currentProgress} ${objective.unit || ''}
Target: ${targetProgress} ${objective.unit || ''}
Gap: ${progressGap} ${objective.unit || ''}
Days Remaining: ${daysRemaining}

Task Velocity: ${velocity.tasksPerWeek} tasks/week
Progress Rate: ${velocity.progressPerDay.toFixed(2)} ${objective.unit || 'units'}/day

Recent Progress (last 30 days):
${progressHistory
  .slice(0, 5)
  .map(p => `- ${p.entryDate.toISOString().split('T')[0]}: ${p.value}`)
  .join('\n')}

Active Blockers: ${context.activeBlockers.length}
${context.activeBlockers.map(b => `- ${b.title} (${b.severity})`).join('\n')}

Based on this data, assess:
1. Will this objective be completed on time?
2. What is the confidence level (0-1)?
3. If current rate continues, when will it complete?
4. What are the key risks?
5. What should be done to stay on track?

Return ONLY valid JSON:
{
  "status": "on_track" | "at_risk" | "blocked",
  "confidence": 0.85,
  "reasoning": "Brief explanation of the assessment",
  "projectedCompletion": "2026-06-30" or null,
  "recommendations": ["Specific action 1", "Specific action 2"]
}`;

  try {
    const assessment = await generateJSONCompletion<TrajectoryAssessment>(
      [{ role: 'user', content: prompt }],
      { maxTokens: 1024, temperature: 0.3 }
    );

    return assessment;
  } catch (err) {
    console.error('Failed to assess trajectory:', err);
    
    // Fallback to simple calculation
    const requiredRate = daysRemaining > 0 ? progressGap / daysRemaining : Infinity;
    const isOnTrack = velocity.progressPerDay >= requiredRate * 0.8; // 80% threshold

    return {
      status: context.activeBlockers.length > 0 ? 'blocked' : isOnTrack ? 'on_track' : 'at_risk',
      confidence: 0.5,
      reasoning: 'AI analysis failed, using fallback calculation',
      projectedCompletion: null,
      recommendations: ['Review progress manually', 'Check for blockers'],
    };
  }
}

/**
 * Detect blockers using AI
 */
export async function detectBlockers(objectiveId: string): Promise<BlockerDetection> {
  const context = await gatherObjectiveContext(objectiveId);
  const { objective, velocity, tasks } = context;

  const daysRemaining = Math.ceil(
    (objective.deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const tasksRemaining = tasks.total - tasks.completed;
  const requiredVelocity = daysRemaining > 0 ? (tasksRemaining / daysRemaining) * 7 : Infinity;

  const prompt = `Analyze this objective for potential blockers.

Objective: ${objective.title}
Target: ${objective.targetValue} ${objective.unit || ''} by ${objective.deadline.toISOString().split('T')[0]}
Days Remaining: ${daysRemaining}

Tasks: ${tasks.completed}/${tasks.total} completed
Current Velocity: ${velocity.tasksPerWeek} tasks/week
Required Velocity: ${requiredVelocity.toFixed(1)} tasks/week

Active Blockers Already Known: ${context.activeBlockers.length}

Detect potential new blockers:
1. Velocity blockers (too slow progress)
2. Resource blockers (team capacity issues)
3. Dependency blockers (waiting on external factors)
4. External blockers (market, competition, etc.)

Return ONLY valid JSON:
{
  "blockers": [
    {
      "type": "velocity",
      "title": "Short title",
      "description": "Detailed description",
      "severity": "high",
      "suggestion": "Actionable suggestion to resolve"
    }
  ]
}

If no new blockers detected, return empty array.`;

  try {
    const detection = await generateJSONCompletion<BlockerDetection>(
      [{ role: 'user', content: prompt }],
      { maxTokens: 2048, temperature: 0.3 }
    );

    return detection;
  } catch (err) {
    console.error('Failed to detect blockers:', err);
    return { blockers: [] };
  }
}

/**
 * Generate action plan to resolve blockers
 */
export async function generateActionPlan(
  objectiveId: string,
  blockers: ObjectiveBlocker[]
): Promise<{
  actions: Array<{
    title: string;
    description: string;
    priority: number;
    assignee: 'AI' | 'Human';
    estimatedHours: number;
  }>;
  requiresHumanDecision: boolean;
}> {
  const context = await gatherObjectiveContext(objectiveId);

  const prompt = `Generate an action plan to resolve these blockers for objective "${context.objective.title}".

Blockers:
${blockers.map(b => `- ${b.title} (${b.severity}): ${b.description}`).join('\n')}

Context:
- Current: ${context.objective.currentValue}/${context.objective.targetValue}
- Deadline: ${context.objective.deadline.toISOString().split('T')[0]}
- Velocity: ${context.velocity.tasksPerWeek} tasks/week

Generate 3-7 specific, actionable tasks to address these blockers.
Mark tasks as "AI" if they're research/analysis/automation.
Mark tasks as "Human" if they require decisions, external communication, or implementation.

Return ONLY valid JSON:
{
  "actions": [
    {
      "title": "Action title",
      "description": "Detailed description",
      "priority": 1,
      "assignee": "AI",
      "estimatedHours": 2
    }
  ],
  "requiresHumanDecision": true
}`;

  try {
    const plan = await generateJSONCompletion<{
      actions: Array<{
        title: string;
        description: string;
        priority: number;
        assignee: 'AI' | 'Human';
        estimatedHours: number;
      }>;
      requiresHumanDecision: boolean;
    }>([{ role: 'user', content: prompt }], {
      maxTokens: 2048,
      temperature: 0.5,
    });

    return plan;
  } catch (err) {
    console.error('Failed to generate action plan:', err);
    return {
      actions: [],
      requiresHumanDecision: true,
    };
  }
}
