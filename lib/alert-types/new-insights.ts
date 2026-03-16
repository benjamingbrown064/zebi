import { prisma } from '@/lib/prisma';

export interface Alert {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  actionUrl?: string;
  timestamp: string;
}

/**
 * Detect new insights created in the last 6 hours
 */
export async function detectNewInsights(
  workspaceId: string,
  hoursAgo: number = 6
): Promise<Alert[]> {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - hoursAgo);

  const newInsights = await prisma.aIInsight.findMany({
    where: {
      workspaceId,
      createdAt: {
        gte: cutoffTime,
      },
    },
    include: {
      company: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return newInsights.map((insight) => ({
    id: `insight-${insight.id}`,
    type: 'new_insight',
    priority: insight.priority >= 3 ? 'high' : 'medium',
    title: 'New opportunity identified',
    message: `💡 New insight: ${insight.title}${insight.company ? ` - ${insight.company.name}` : ''}`,
    actionUrl: `/ai-insights/${insight.id}`,
    timestamp: insight.createdAt.toISOString(),
  }));
}
