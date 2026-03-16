/**
 * GET /api/cron/reconcile-progress
 * 
 * Reconciliation cron job (runs every 6 hours)
 * Recalculates progress for all auto-mode objectives
 * 
 * Spec: /Users/botbot/.openclaw/workspace/zebi/docs/OBJECTIVE_PROGRESS_SPEC_V2.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recalculateObjectiveProgress } from '@/lib/objective-progress';

export const dynamic = 'force-dynamic';

// Vercel cron authorization
function verifyVercelCron(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.error('[Reconcile Progress] CRON_SECRET not configured');
    return false;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify cron authorization
    if (!verifyVercelCron(request)) {
      console.error('[Reconcile Progress] Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Reconcile Progress] Starting reconciliation...');

    // Find all auto-mode objectives
    const objectives = await prisma.objective.findMany({
      where: {
        progressMode: 'auto',
        completedAt: null, // Skip completed objectives
      },
      select: {
        id: true,
        title: true,
        progressPercent: true,
        completedTaskCount: true,
        totalTaskCount: true,
      },
    });

    console.log(`[Reconcile Progress] Found ${objectives.length} auto-mode objectives`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;
    let slowCount = 0;

    // Recalculate each objective
    for (const objective of objectives) {
      const objStartTime = Date.now();
      
      try {
        const oldProgress = Number(objective.progressPercent);
        const oldCompleted = objective.completedTaskCount;
        const oldTotal = objective.totalTaskCount;

        const result = await recalculateObjectiveProgress(objective.id);

        const duration = Date.now() - objStartTime;

        if (result.skipped) {
          results.push({
            objectiveId: objective.id,
            title: objective.title,
            status: 'skipped',
            reason: result.reason,
            duration,
          });
          continue;
        }

        const newProgress = Number(result.objective!.progressPercent);
        const newCompleted = result.objective!.completedTaskCount;
        const newTotal = result.objective!.totalTaskCount;

        const changed = 
          oldProgress !== newProgress || 
          oldCompleted !== newCompleted || 
          oldTotal !== newTotal;

        // Alert if slow (>5s)
        if (duration > 5000) {
          console.warn(`[Reconcile Progress] SLOW: ${objective.title} took ${duration}ms`);
          slowCount++;
        }

        results.push({
          objectiveId: objective.id,
          title: objective.title,
          status: 'success',
          changed,
          old: {
            progressPercent: oldProgress,
            completedTaskCount: oldCompleted,
            totalTaskCount: oldTotal,
          },
          new: {
            progressPercent: newProgress,
            completedTaskCount: newCompleted,
            totalTaskCount: newTotal,
          },
          duration,
        });

        successCount++;

      } catch (err) {
        const duration = Date.now() - objStartTime;
        console.error(`[Reconcile Progress] Failed to recalculate ${objective.id}:`, err);
        
        results.push({
          objectiveId: objective.id,
          title: objective.title,
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
          duration,
        });

        errorCount++;
      }
    }

    const totalDuration = Date.now() - startTime;

    const summary = {
      timestamp: new Date().toISOString(),
      totalObjectives: objectives.length,
      successCount,
      errorCount,
      slowCount,
      totalDuration,
      results: results.filter(r => r.changed || r.status === 'error' || r.duration > 5000), // Only log changed/errors/slow
    };

    console.log('[Reconcile Progress] Completed:', summary);

    return NextResponse.json({
      success: true,
      summary,
    });

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error('[Reconcile Progress] Reconciliation failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: totalDuration,
      },
      { status: 500 }
    );
  }
}
