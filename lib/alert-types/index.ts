/**
 * Alert Types - Individual Alert Detectors
 * 
 * Each detector is responsible for one type of alert:
 * - new-insights: AI-generated opportunities
 * - new-blockers: Obstacles preventing progress
 * - upcoming-deadlines: Time-sensitive tasks and objectives
 * - goals-at-risk: Underperforming goals and projects
 */

export { detectNewInsights } from './new-insights';
export type { Alert } from './new-insights';
export { detectNewBlockers } from './new-blockers';
export { detectUpcomingDeadlines } from './upcoming-deadlines';
export { detectGoalsAtRisk } from './goals-at-risk';
