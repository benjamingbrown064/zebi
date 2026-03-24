import { prisma } from '@/lib/prisma';

export interface RevenueDropPattern {
  companyId: string;
  spaceName: string;
  currentRevenue: number;
  previousRevenue: number;
  dropPercent: number;
  weekRange: string;
}

/**
 * Detect spaces with >10% revenue drop week-over-week
 * 
 * Note: This looks at the space.revenue field which should be updated regularly.
 * For more sophisticated tracking, implement ObjectiveProgress tracking for revenue objectives.
 */
export async function detectRevenueDrops(
  workspaceId: string
): Promise<RevenueDropPattern[]> {
  const drops: RevenueDropPattern[] = [];

  // Get all active spaces with revenue
  const spaces = await prisma.space.findMany({
    where: {
      workspaceId,
      archivedAt: null,
      revenue: {
        not: null,
      },
    },
    select: {
      id: true,
      name: true,
      revenue: true,
      objectives: {
        where: {
          metricType: 'revenue',
          status: 'active',
        },
        include: {
          progressEntries: {
            orderBy: {
              entryDate: 'desc',
            },
            take: 14, // Get last 2 weeks
          },
        },
      },
    },
  });

  for (const space of spaces) {
    // Find revenue objectives with progress tracking
    const revenueObjective = space.objectives.find(
      obj => obj.progressEntries.length >= 2
    );

    if (!revenueObjective) continue;

    const entries = revenueObjective.progressEntries;
    
    // Get entries from this week and last week (7 days each)
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(today.getDate() - 14);

    const thisWeekEntries = entries.filter(
      e => new Date(e.entryDate) >= sevenDaysAgo && new Date(e.entryDate) <= today
    );
    const lastWeekEntries = entries.filter(
      e => new Date(e.entryDate) >= fourteenDaysAgo && new Date(e.entryDate) < sevenDaysAgo
    );

    if (thisWeekEntries.length === 0 || lastWeekEntries.length === 0) continue;

    // Average the entries for each week
    const thisWeekAvg =
      thisWeekEntries.reduce((sum, e) => sum + Number(e.value), 0) /
      thisWeekEntries.length;
    const lastWeekAvg =
      lastWeekEntries.reduce((sum, e) => sum + Number(e.value), 0) /
      lastWeekEntries.length;

    // Calculate drop percentage
    if (lastWeekAvg === 0) continue;
    const dropPercent = ((lastWeekAvg - thisWeekAvg) / lastWeekAvg) * 100;

    // Only flag if drop is >10%
    if (dropPercent > 10) {
      drops.push({
        companyId: space.id,
        spaceName: space.name,
        currentRevenue: thisWeekAvg,
        previousRevenue: lastWeekAvg,
        dropPercent,
        weekRange: `${sevenDaysAgo.toLocaleDateString()} - ${today.toLocaleDateString()}`,
      });
    }
  }

  // Sort by drop percentage (biggest drops first)
  return drops.sort((a, b) => b.dropPercent - a.dropPercent);
}
