import { NextRequest, NextResponse } from 'next/server'
import { generateMorningBriefing, formatMorningBriefing, storeBriefing } from '@/lib/morning-briefing'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'

/**
 * Verify cron secret.
 * Vercel sends: Authorization: Bearer <CRON_SECRET>
 * We also allow a bare x-cron-secret header for manual/test calls.
 */
function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[morning-briefing] CRON_SECRET not set')
    return false
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${cronSecret}`) return true
  const legacyHeader = request.headers.get('x-cron-secret')
  if (legacyHeader === cronSecret) return true
  return false
}

/**
 * GET /api/cron/morning-briefing
 *
 * Called by Vercel cron at 08:00 UTC daily (see vercel.json).
 * Also callable manually for testing with the cron secret.
 *
 * Returns the generated briefing text + full data object.
 * Stores the briefing as an ActivityLog entry.
 */
export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workspaceId =
    request.nextUrl.searchParams.get('workspaceId') ?? DEFAULT_WORKSPACE_ID

  try {
    const briefingData = await generateMorningBriefing(workspaceId)
    const briefingText = formatMorningBriefing(briefingData)
    await storeBriefing(workspaceId, briefingText, briefingData)

    return NextResponse.json({
      success: true,
      timestamp: briefingData.generatedAt,
      workspaceId,
      briefing: briefingText,
      data: briefingData,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[morning-briefing] Error:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

/**
 * POST /api/cron/morning-briefing
 *
 * Batch endpoint: process all workspaces (or a specific one in the body).
 */
export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { workspaceId?: string } = {}
  try { body = await request.json() } catch { /* no body is fine */ }

  if (body.workspaceId) {
    try {
      const briefingData = await generateMorningBriefing(body.workspaceId)
      const briefingText = formatMorningBriefing(briefingData)
      await storeBriefing(body.workspaceId, briefingText, briefingData)
      return NextResponse.json({
        success: true,
        timestamp: briefingData.generatedAt,
        workspaceId: body.workspaceId,
        briefing: briefingText,
        data: briefingData,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ success: false, error: msg }, { status: 500 })
    }
  }

  // All workspaces
  const workspaces = await prisma.workspace.findMany({ select: { id: true, name: true } })
  const results = []

  for (const ws of workspaces) {
    try {
      const briefingData = await generateMorningBriefing(ws.id)
      const briefingText = formatMorningBriefing(briefingData)
      await storeBriefing(ws.id, briefingText, briefingData)
      results.push({ workspaceId: ws.id, workspaceName: ws.name, success: true })
    } catch (error) {
      results.push({
        workspaceId: ws.id,
        workspaceName: ws.name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    workspacesProcessed: results.length,
    successfulBriefings: results.filter(r => r.success).length,
    results,
  })
}
