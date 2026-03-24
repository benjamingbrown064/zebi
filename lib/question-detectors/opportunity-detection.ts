import { prisma } from '@/lib/prisma';

export interface OpportunityPattern {
  opportunityType: 'converging_insights' | 'strategic_alignment' | 'momentum';
  title: string;
  description: string;
  relatedInsightIds: string[];
  suggestedAction: string;
  confidence: number; // 0-100
  context: Record<string, any>;
}

/**
 * Detect opportunities when multiple insights suggest the same action
 */
export async function detectOpportunities(
  workspaceId: string
): Promise<OpportunityPattern[]> {
  const opportunities: OpportunityPattern[] = [];

  // Get recent insights (last 14 days)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const recentInsights = await prisma.aIInsight.findMany({
    where: {
      workspaceId,
      createdAt: {
        gte: fourteenDaysAgo,
      },
      status: {
        in: ['new', 'reviewed'],
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (recentInsights.length === 0) return opportunities;

  // ==================== CONVERGING INSIGHTS ====================
  
  // Group insights by suggested actions
  const actionGroups = new Map<string, typeof recentInsights>();

  for (const insight of recentInsights) {
    const suggestedActions = insight.suggestedActions as any[];
    if (!suggestedActions || !Array.isArray(suggestedActions)) continue;

    for (const action of suggestedActions) {
      const actionKey = action.action || action.type || 'unknown';
      if (!actionGroups.has(actionKey)) {
        actionGroups.set(actionKey, []);
      }
      actionGroups.get(actionKey)!.push(insight);
    }
  }

  // Find actions suggested by 3+ insights
  for (const [action, insights] of actionGroups.entries()) {
    if (insights.length >= 3) {
      opportunities.push({
        opportunityType: 'converging_insights',
        title: `Multiple Insights Suggest: ${action}`,
        description: `${insights.length} insights from the past 2 weeks all suggest taking action on: ${action}`,
        relatedInsightIds: insights.map(i => i.id),
        suggestedAction: action,
        confidence: Math.min(90, 60 + insights.length * 10),
        context: {
          insightCount: insights.length,
          insightTypes: insights.map(i => i.insightType),
          spaces: [
            ...new Set(insights.map(i => i.companyId).filter(Boolean)),
          ],
        },
      });
    }
  }

  // ==================== STRATEGIC ALIGNMENT ====================
  
  // Find insights related to objectives that are behind schedule
  const behindObjectives = await prisma.objective.findMany({
    where: {
      workspaceId,
      status: 'active',
      progressPercent: {
        lt: 50,
      },
      deadline: {
        gte: new Date(), // Not yet passed
        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Within 30 days
      },
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  for (const objective of behindObjectives) {
    if (!objective.companyId) continue;

    // Find insights for this space
    const spaceInsights = recentInsights.filter(
      i => i.companyId === objective.companyId
    );

    if (spaceInsights.length >= 2) {
      opportunities.push({
        opportunityType: 'strategic_alignment',
        title: `Insights Available for At-Risk Objective`,
        description: `Objective "${objective.title}" is behind schedule (${Number(objective.progressPercent).toFixed(0)}% complete) with ${spaceInsights.length} recent insights that could help.`,
        relatedInsightIds: spaceInsights.map(i => i.id),
        suggestedAction: 'review_insights_for_objective',
        confidence: 75,
        context: {
          objectiveId: objective.id,
          objectiveTitle: objective.title,
          progress: Number(objective.progressPercent),
          deadline: objective.deadline,
          spaceName: objective.company?.name,
          insightCount: spaceInsights.length,
        },
      });
    }
  }

  // ==================== MOMENTUM OPPORTUNITIES ====================
  
  // Find spaces with high velocity + positive insights
  const spaces = await prisma.space.findMany({
    where: {
      workspaceId,
      archivedAt: null,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  for (const space of spaces) {
    // Check task completion velocity
    const completedTasks = await prisma.task.count({
      where: {
        companyId: space.id,
        completedAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    // Check for positive insights
    const positiveInsights = recentInsights.filter(
      i => i.companyId === space.id && i.priority <= 2
    );

    // High velocity (5+ tasks/week) + 2+ positive insights = momentum opportunity
    if (completedTasks >= 5 && positiveInsights.length >= 2) {
      opportunities.push({
        opportunityType: 'momentum',
        title: `Strong Momentum at ${space.name}`,
        description: `${space.name} completed ${completedTasks} tasks this week with ${positiveInsights.length} positive insights. Great time to scale up.`,
        relatedInsightIds: positiveInsights.map(i => i.id),
        suggestedAction: 'scale_up_space',
        confidence: 80,
        context: {
          companyId: space.id,
          spaceName: space.name,
          weeklyVelocity: completedTasks,
          positiveInsightCount: positiveInsights.length,
        },
      });
    }
  }

  // Sort by confidence (highest first)
  return opportunities.sort((a, b) => b.confidence - a.confidence);
}
