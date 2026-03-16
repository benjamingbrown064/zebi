import { Alert } from './alert-types/new-insights';
import { detectNewInsights } from './alert-types/new-insights';
import { detectNewBlockers } from './alert-types/new-blockers';
import { detectUpcomingDeadlines } from './alert-types/upcoming-deadlines';
import { detectGoalsAtRisk } from './alert-types/goals-at-risk';

export interface AlertResponse {
  success: boolean;
  alerts: Alert[];
  count: number;
  timestamp: string;
  error?: string;
}

export interface AlertSystemOptions {
  workspaceId: string;
  hoursAgo?: number; // For time-based checks (default: 6)
  priorityFilter?: Alert['priority'][]; // Filter by priority
}

/**
 * Main alert detection system
 * Runs all alert detectors and returns consolidated results
 */
export async function detectAlerts(
  options: AlertSystemOptions
): Promise<AlertResponse> {
  const { workspaceId, hoursAgo = 6, priorityFilter } = options;

  try {
    // Run all detectors in parallel
    const [
      insightAlerts,
      blockerAlerts,
      deadlineAlerts,
      riskAlerts,
    ] = await Promise.all([
      detectNewInsights(workspaceId, hoursAgo),
      detectNewBlockers(workspaceId, hoursAgo),
      detectUpcomingDeadlines(workspaceId),
      detectGoalsAtRisk(workspaceId),
    ]);

    // Combine all alerts
    let allAlerts = [
      ...insightAlerts,
      ...blockerAlerts,
      ...deadlineAlerts,
      ...riskAlerts,
    ];

    // Apply priority filter if specified
    if (priorityFilter && priorityFilter.length > 0) {
      allAlerts = allAlerts.filter((alert) =>
        priorityFilter.includes(alert.priority)
      );
    }

    // Sort by priority (critical > high > medium > low) then by timestamp
    const priorityOrder: Record<Alert['priority'], number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    allAlerts.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // If same priority, sort by timestamp (newest first)
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return {
      success: true,
      alerts: allAlerts,
      count: allAlerts.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[alert-system] Error detecting alerts:', error);
    return {
      success: false,
      alerts: [],
      count: 0,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get alerts by type
 */
export async function getAlertsByType(
  workspaceId: string,
  type: string,
  hoursAgo: number = 6
): Promise<Alert[]> {
  switch (type) {
    case 'new_insight':
      return detectNewInsights(workspaceId, hoursAgo);
    case 'new_blocker':
      return detectNewBlockers(workspaceId, hoursAgo);
    case 'upcoming_deadline':
      return detectUpcomingDeadlines(workspaceId);
    case 'goal_at_risk':
      return detectGoalsAtRisk(workspaceId);
    default:
      return [];
  }
}

/**
 * Format alerts for Telegram
 */
export function formatAlertsForTelegram(alerts: Alert[]): string {
  if (alerts.length === 0) {
    return '✅ All clear! No alerts at this time.';
  }

  const grouped = alerts.reduce((acc, alert) => {
    if (!acc[alert.priority]) {
      acc[alert.priority] = [];
    }
    acc[alert.priority].push(alert);
    return acc;
  }, {} as Record<string, Alert[]>);

  let message = `🔔 *Alert Summary* (${alerts.length} total)\n\n`;

  // Show critical first
  if (grouped.critical) {
    message += `🚨 *CRITICAL* (${grouped.critical.length})\n`;
    grouped.critical.forEach((alert) => {
      message += `${alert.message}\n`;
    });
    message += '\n';
  }

  // Then high
  if (grouped.high) {
    message += `⚠️ *HIGH* (${grouped.high.length})\n`;
    grouped.high.forEach((alert) => {
      message += `${alert.message}\n`;
    });
    message += '\n';
  }

  // Then medium
  if (grouped.medium) {
    message += `📌 *MEDIUM* (${grouped.medium.length})\n`;
    grouped.medium.forEach((alert) => {
      message += `${alert.message}\n`;
    });
    message += '\n';
  }

  // Low priority at the end
  if (grouped.low) {
    message += `ℹ️ *LOW* (${grouped.low.length})\n`;
    grouped.low.forEach((alert) => {
      message += `${alert.message}\n`;
    });
  }

  return message.trim();
}
