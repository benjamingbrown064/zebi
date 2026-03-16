import { prisma } from '@/lib/prisma';
import { Alert } from './new-insights';

/**
 * Detect new blockers created in the last 6 hours
 * Priority order: critical > high > medium
 */
export async function detectNewBlockers(
  workspaceId: string,
  hoursAgo: number = 6
): Promise<Alert[]> {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - hoursAgo);

  const newBlockers = await prisma.objectiveBlocker.findMany({
    where: {
      objective: {
        workspaceId,
      },
      detectedAt: {
        gte: cutoffTime,
      },
      resolvedAt: null, // Only unresolved blockers
    },
    include: {
      objective: {
        select: {
          title: true,
        },
      },
    },
    orderBy: [
      { severity: 'desc' },
      { detectedAt: 'desc' },
    ],
  });

  return newBlockers.map((blocker) => {
    const severity = blocker.severity.toLowerCase();
    let priority: Alert['priority'] = 'medium';
    
    if (severity === 'critical') priority = 'critical';
    else if (severity === 'high') priority = 'high';
    else if (severity === 'medium') priority = 'medium';
    else priority = 'low';

    return {
      id: `blocker-${blocker.id}`,
      type: 'new_blocker',
      priority,
      title: `${blocker.severity} blocker detected`,
      message: `🚫 New blocker: ${blocker.title} - Severity: ${blocker.severity}`,
      actionUrl: `/objectives/${blocker.objectiveId}`,
      timestamp: blocker.detectedAt.toISOString(),
    };
  });
}
