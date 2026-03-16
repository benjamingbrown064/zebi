import { CompanyAnalysis, CompanyMetrics } from './company-analyzer';

export interface DetectedPattern {
  type: 'positive' | 'negative' | 'neutral';
  category: 'velocity' | 'quality' | 'risk' | 'opportunity';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  metrics?: Record<string, any>;
}

/**
 * Detect patterns and anomalies in company data
 */
export function detectPatterns(analysis: CompanyAnalysis): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const { metrics, recentActivity, strategicContext } = analysis;

  // ==================== VELOCITY PATTERNS ====================
  
  // Low task completion rate
  if (metrics.completionRate < 40 && metrics.totalTasks > 5) {
    patterns.push({
      type: 'negative',
      category: 'velocity',
      title: 'Low Task Completion Rate',
      description: `Only ${metrics.completionRate.toFixed(1)}% of tasks completed. This indicates potential bottlenecks or overcommitment.`,
      severity: 'high',
      metrics: {
        completionRate: metrics.completionRate,
        totalTasks: metrics.totalTasks,
        completedTasks: metrics.completedTasks,
      },
    });
  }

  // High velocity (good)
  if (metrics.tasksCompleted7Days > 10 && metrics.totalTasks > 0) {
    patterns.push({
      type: 'positive',
      category: 'velocity',
      title: 'High Execution Velocity',
      description: `${metrics.tasksCompleted7Days} tasks completed in the last 7 days. Strong momentum.`,
      severity: 'low',
      metrics: {
        tasksCompleted7Days: metrics.tasksCompleted7Days,
      },
    });
  }

  // Stagnant (no recent completions)
  if (metrics.tasksCompleted7Days === 0 && metrics.totalTasks > 3) {
    patterns.push({
      type: 'negative',
      category: 'velocity',
      title: 'Execution Stalled',
      description: 'No tasks completed in the last 7 days. Work may be blocked or deprioritized.',
      severity: 'high',
      metrics: {
        tasksCompleted7Days: metrics.tasksCompleted7Days,
        totalTasks: metrics.totalTasks,
      },
    });
  }

  // ==================== QUALITY PATTERNS ====================

  // High overdue rate
  if (metrics.overdueTasks > 0 && metrics.totalTasks > 0) {
    const overdueRate = (metrics.overdueTasks / metrics.totalTasks) * 100;
    if (overdueRate > 20) {
      patterns.push({
        type: 'negative',
        category: 'quality',
        title: 'High Overdue Task Rate',
        description: `${metrics.overdueTasks} tasks are overdue (${overdueRate.toFixed(1)}%). This suggests planning issues or resource constraints.`,
        severity: overdueRate > 40 ? 'high' : 'medium',
        metrics: {
          overdueTasks: metrics.overdueTasks,
          overdueRate,
        },
      });
    }
  }

  // Good project organization
  if (metrics.activeProjects > 2 && metrics.totalTasks > 10) {
    const tasksPerProject = metrics.totalTasks / metrics.activeProjects;
    if (tasksPerProject >= 3 && tasksPerProject <= 15) {
      patterns.push({
        type: 'positive',
        category: 'quality',
        title: 'Well-Organized Project Structure',
        description: `${metrics.activeProjects} active projects with balanced task distribution (avg ${tasksPerProject.toFixed(1)} tasks per project).`,
        severity: 'low',
        metrics: {
          activeProjects: metrics.activeProjects,
          tasksPerProject,
        },
      });
    }
  }

  // ==================== RISK PATTERNS ====================

  // Objectives at risk
  if (metrics.atRiskObjectives > 0) {
    patterns.push({
      type: 'negative',
      category: 'risk',
      title: 'Objectives At Risk',
      description: `${metrics.atRiskObjectives} objective(s) are behind schedule with approaching deadlines. Immediate action needed.`,
      severity: metrics.atRiskObjectives > 2 ? 'high' : 'medium',
      metrics: {
        atRiskObjectives: metrics.atRiskObjectives,
        objectives: recentActivity.objectives
          .filter(obj => obj.progressPercent < 50)
          .map(obj => ({ title: obj.title, progress: obj.progressPercent })),
      },
    });
  }

  // Low objective progress overall
  if (metrics.activeObjectives > 0 && metrics.avgProgress < 30) {
    patterns.push({
      type: 'negative',
      category: 'risk',
      title: 'Low Objective Progress',
      description: `Average progress across objectives is only ${metrics.avgProgress.toFixed(1)}%. Strategic goals may be neglected.`,
      severity: 'medium',
      metrics: {
        avgProgress: metrics.avgProgress,
        activeObjectives: metrics.activeObjectives,
      },
    });
  }

  // No objectives set
  if (metrics.totalObjectives === 0 && metrics.totalTasks > 5) {
    patterns.push({
      type: 'negative',
      category: 'risk',
      title: 'Missing Strategic Objectives',
      description: 'Tasks exist but no objectives are defined. Work may lack strategic direction.',
      severity: 'medium',
      metrics: {
        totalTasks: metrics.totalTasks,
        totalObjectives: metrics.totalObjectives,
      },
    });
  }

  // ==================== OPPORTUNITY PATTERNS ====================

  // Strong progress on objectives
  if (metrics.onTrackObjectives > 0 && metrics.activeObjectives > 0) {
    const onTrackRate = (metrics.onTrackObjectives / metrics.activeObjectives) * 100;
    if (onTrackRate >= 70) {
      patterns.push({
        type: 'positive',
        category: 'opportunity',
        title: 'Strong Objective Momentum',
        description: `${metrics.onTrackObjectives}/${metrics.activeObjectives} objectives on track (${onTrackRate.toFixed(0)}%). Consider setting ambitious new goals.`,
        severity: 'low',
        metrics: {
          onTrackObjectives: metrics.onTrackObjectives,
          onTrackRate,
        },
      });
    }
  }

  // Recent documentation activity
  if (metrics.recentDocuments > 3) {
    patterns.push({
      type: 'positive',
      category: 'opportunity',
      title: 'High Documentation Activity',
      description: `${metrics.recentDocuments} documents created recently. Strong knowledge capture. Consider leveraging for marketing/content.`,
      severity: 'low',
      metrics: {
        recentDocuments: metrics.recentDocuments,
      },
    });
  }

  // Strategic context complete
  const hasStrategicContext = 
    strategicContext.missionStatement && 
    strategicContext.targetCustomers &&
    strategicContext.competitors;
  
  if (hasStrategicContext && metrics.activeProjects > 1) {
    patterns.push({
      type: 'positive',
      category: 'opportunity',
      title: 'Strong Strategic Foundation',
      description: 'Company has clear mission, target customers, and competitive positioning. Ready for accelerated execution.',
      severity: 'low',
    });
  }

  // Missing strategic context
  if (!hasStrategicContext && metrics.totalTasks > 10) {
    patterns.push({
      type: 'negative',
      category: 'opportunity',
      title: 'Incomplete Strategic Context',
      description: 'Missing key strategic information (mission, customers, or competitors). Defining these could improve focus.',
      severity: 'medium',
      metrics: {
        hasMission: !!strategicContext.missionStatement,
        hasCustomers: !!strategicContext.targetCustomers,
        hasCompetitors: !!strategicContext.competitors,
      },
    });
  }

  // Growth opportunity (many completed tasks, high velocity)
  if (
    metrics.completionRate > 70 &&
    metrics.tasksCompleted7Days > 5 &&
    metrics.onTrackObjectives > 0
  ) {
    patterns.push({
      type: 'positive',
      category: 'opportunity',
      title: 'Ready for Scale',
      description: 'High completion rate, strong velocity, and objectives on track. Company is executing well and ready to take on more.',
      severity: 'low',
      metrics: {
        completionRate: metrics.completionRate,
        tasksCompleted7Days: metrics.tasksCompleted7Days,
        onTrackObjectives: metrics.onTrackObjectives,
      },
    });
  }

  return patterns;
}

/**
 * Prioritize patterns by severity and type
 */
export function prioritizePatterns(patterns: DetectedPattern[]): DetectedPattern[] {
  const severityWeight = { high: 3, medium: 2, low: 1 };
  const typeWeight = { negative: 2, neutral: 1, positive: 0.5 };

  return patterns.sort((a, b) => {
    const scoreA = severityWeight[a.severity] * typeWeight[a.type];
    const scoreB = severityWeight[b.severity] * typeWeight[b.type];
    return scoreB - scoreA; // Descending order
  });
}
