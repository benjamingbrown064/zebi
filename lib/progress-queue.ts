/**
 * Progress Recalculation Queue (MVP)
 * 
 * Simple debouncing to avoid duplicate recalculations
 * 
 * Future: Replace with proper queue (Upstash, BullMQ, etc.)
 */

// In-memory tracking of recent recalculations (per-process)
// Note: This is NOT reliable across serverless instances
// For production scale, use Redis or proper queue
const recentRecalculations = new Map<string, number>()

const DEDUP_WINDOW_MS = 2000  // 2 seconds

/**
 * Queue a progress recalculation for an objective
 * 
 * Deduplicates within DEDUP_WINDOW_MS
 * Triggers async API call to recalculation endpoint
 * 
 * @param objectiveId - Objective to recalculate
 */
export async function queueProgressRecalculation(objectiveId: string): Promise<void> {
  const now = Date.now()
  const lastRecalc = recentRecalculations.get(objectiveId)
  
  // Check if recently queued
  if (lastRecalc && (now - lastRecalc) < DEDUP_WINDOW_MS) {
    console.log(`[Progress Queue] Dedup: ${objectiveId} already queued recently`)
    return
  }
  
  // Mark as queued
  recentRecalculations.set(objectiveId, now)
  
  // Clean up old entries (prevent memory leak)
  if (recentRecalculations.size > 1000) {
    const cutoff = now - DEDUP_WINDOW_MS
    for (const [id, time] of recentRecalculations.entries()) {
      if (time < cutoff) {
        recentRecalculations.delete(id)
      }
    }
  }
  
  // Trigger recalculation (fire and forget)
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const apiToken = process.env.INTERNAL_API_TOKEN
    
    if (!apiToken) {
      console.error('[Progress Queue] INTERNAL_API_TOKEN not configured')
      return
    }
    
    // Don't await - fire and forget
    fetch(`${appUrl}/api/objectives/${objectiveId}/recalculate-progress`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    }).catch(err => {
      console.error(`[Progress Queue] Failed to trigger recalc for ${objectiveId}:`, err)
    })
    
    console.log(`[Progress Queue] Queued recalculation for ${objectiveId}`)
    
  } catch (err) {
    console.error(`[Progress Queue] Error queueing ${objectiveId}:`, err)
  }
}

/**
 * Queue recalculation for multiple objectives
 * 
 * @param objectiveIds - Array of objective IDs
 */
export async function queueMultipleRecalculations(objectiveIds: string[]): Promise<void> {
  for (const objectiveId of objectiveIds) {
    await queueProgressRecalculation(objectiveId)
  }
}
