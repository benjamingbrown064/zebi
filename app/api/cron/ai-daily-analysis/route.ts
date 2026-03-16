import { NextRequest, NextResponse } from 'next/server'
import { AlertDetector } from '@/lib/ai/alert-detector'
import { prisma } from '@/lib/prisma'
import { requireApiKey } from '@/lib/auth-api'


/**

// Force dynamic rendering
export const dynamic = 'force-dynamic'

 * AI Daily Analysis Cron Job
 * Runs every morning at 6am
 * Analyzes active workspaces and generates proactive alerts
 */
export async function POST(request: NextRequest) {
  try {
    // Require API authentication
    const authError = requireApiKey(request)
    if (authError) return authError

    // Get workspaceId from query param (for testing) or analyze all active workspaces
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (workspaceId) {
      // Test mode: analyze single workspace
      return await analyzeSingleWorkspace(workspaceId)
    }

    // Production mode: analyze all active workspaces
    return await analyzeAllWorkspaces()
  } catch (error) {
    console.error('AI Daily Analysis failed:', error)
    return NextResponse.json(
      {
        error: 'AI Daily Analysis failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * Analyze a single workspace (test mode)
 */
async function analyzeSingleWorkspace(workspaceId: string) {
  const detector = new AlertDetector()

  // Get workspace owner (first member with owner role)
  const owner = await prisma.workspaceMember.findFirst({
    where: { workspaceId, role: 'owner' },
  })

  if (!owner) {
    return NextResponse.json(
      { error: 'No owner found for workspace' },
      { status: 404 }
    )
  }

  // Detect alerts
  const alerts = await detector.analyzeWorkspace(workspaceId, owner.userId)

  // Save alerts to database
  const savedAlerts = await saveAlerts(workspaceId, owner.userId, alerts)

  // Send critical notifications (priority >= 90)
  const criticalAlerts = savedAlerts.filter((a) => a.priority >= 90)
  if (criticalAlerts.length > 0) {
    // TODO: Integrate with notification system
    console.log(
      `[AI] ${criticalAlerts.length} critical alerts for workspace ${workspaceId}`
    )
  }

  return NextResponse.json({
    success: true,
    workspaceId,
    alertsGenerated: savedAlerts.length,
    criticalAlerts: criticalAlerts.length,
    alerts: savedAlerts.map((a) => ({
      type: a.type,
      priority: a.priority,
      title: a.title,
    })),
  })
}

/**
 * Analyze all active workspaces (production mode)
 */
async function analyzeAllWorkspaces() {
  const detector = new AlertDetector()

  // Get all workspaces with at least one owner
  const workspaces = await prisma.workspace.findMany({
    include: {
      members: {
        where: { role: 'owner' },
        take: 1,
      },
    },
  })

  const results = []

  for (const workspace of workspaces) {
    if (workspace.members.length === 0) continue

    const owner = workspace.members[0]

    try {
      // Detect alerts
      const alerts = await detector.analyzeWorkspace(workspace.id, owner.userId)

      // Save alerts to database
      const savedAlerts = await saveAlerts(workspace.id, owner.userId, alerts)

      // Send critical notifications
      const criticalAlerts = savedAlerts.filter((a) => a.priority >= 90)
      if (criticalAlerts.length > 0) {
        // TODO: Send notification to user
        console.log(
          `[AI] ${criticalAlerts.length} critical alerts for workspace ${workspace.id}`
        )
      }

      results.push({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        alertsGenerated: savedAlerts.length,
        criticalAlerts: criticalAlerts.length,
      })
    } catch (error) {
      console.error(
        `Failed to analyze workspace ${workspace.id}:`,
        error
      )
      results.push({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    workspacesAnalyzed: results.length,
    totalAlerts: results.reduce((sum, r) => sum + (r.alertsGenerated || 0), 0),
    criticalAlerts: results.reduce((sum, r) => sum + (r.criticalAlerts || 0), 0),
    results,
  })
}

/**
 * Save alerts to database as ai_suggestions
 */
async function saveAlerts(
  workspaceId: string,
  userId: string,
  alerts: any[]
) {
  // Mark old alerts as expired (from previous runs)
  await prisma.aISuggestion.updateMany({
    where: {
      workspaceId,
      userId,
      type: { in: ['alert', 'risk', 'opportunity', 'warning'] },
      status: 'pending',
      createdAt: {
        lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Older than 24h
      },
    },
    data: {
      status: 'expired',
    },
  })

  // Save new alerts
  const savedAlerts = []
  for (const alert of alerts) {
    const saved = await prisma.aISuggestion.create({
      data: {
        workspaceId,
        userId,
        type: alert.type,
        title: alert.title,
        description: alert.description,
        reasoning: alert.reasoning,
        actions: alert.actions,
        confidence: alert.priority,
        status: 'pending',
        context: {
          entityType: alert.entityType,
          entityId: alert.entityId,
          detectedAt: new Date().toISOString(),
        },
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
      },
    })
    savedAlerts.push({
      id: saved.id,
      type: saved.type,
      priority: saved.confidence,
      title: saved.title,
    })
  }

  return savedAlerts
}
