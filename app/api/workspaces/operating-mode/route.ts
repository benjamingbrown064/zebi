import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspace } from '@/lib/workspace'
import { buildContext } from '@/lib/ai/context-builder'
import { detectOperatingMode } from '@/lib/operating-mode/detector'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/workspaces/operating-mode
 * Returns current mode, suggested mode, and signals
 */
export async function GET() {
  try {
    const workspaceId = await requireWorkspace()
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? (await supabase.auth.getUser()).data.user
    const userId = user?.id || 'system'

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        operatingMode: true,
        modeSetBy: true,
        modeUpdatedAt: true,
        modeExpiresAt: true,
        modeSuggested: true,
        modeSignals: true,
      },
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Check if manual override has expired
    let effectiveMode = workspace.operatingMode
    let isExpired = false
    if (workspace.modeSetBy === 'manual' && workspace.modeExpiresAt) {
      if (new Date() > workspace.modeExpiresAt) {
        isExpired = true
        // Fall back to suggested mode or momentum
        effectiveMode = workspace.modeSuggested || 'momentum'
      }
    }

    // Run detection if no suggestion exists or it's stale (older than 24h)
    let detection = null
    const modeUpdatedAt = workspace.modeUpdatedAt
    const isStale = !modeUpdatedAt || (Date.now() - new Date(modeUpdatedAt).getTime()) > 24 * 60 * 60 * 1000
    
    if (isStale || !workspace.modeSuggested) {
      try {
        const context = await buildContext(workspaceId, userId)
        detection = detectOperatingMode(context)
        // Update suggested mode in background
        await prisma.workspace.update({
          where: { id: workspaceId },
          data: {
            modeSuggested: detection.suggestedMode,
            modeSignals: detection.signals as any,
            modeUpdatedAt: new Date(),
            ...(isExpired ? {
              operatingMode: detection.suggestedMode,
              modeSetBy: 'auto',
              modeExpiresAt: null,
            } : {}),
          },
        })
      } catch (err) {
        console.error('Mode detection failed:', err)
      }
    }

    return NextResponse.json({
      mode: effectiveMode,
      setBy: isExpired ? 'auto' : workspace.modeSetBy,
      expiresAt: isExpired ? null : workspace.modeExpiresAt,
      suggested: detection?.suggestedMode || workspace.modeSuggested,
      signals: detection?.signals || workspace.modeSignals,
      reasoning: detection?.reasoning || null,
      isExpired,
    })
  } catch (error) {
    console.error('Failed to get operating mode:', error)
    return NextResponse.json({ error: 'Failed to get operating mode' }, { status: 500 })
  }
}

/**
 * PATCH /api/workspaces/operating-mode
 * Set mode manually or reset to auto
 */
export async function PATCH(request: NextRequest) {
  try {
    const workspaceId = await requireWorkspace()
    const body = await request.json()
    const { mode, setBy = 'manual' } = body

    if (!['pressure', 'plateau', 'momentum', 'drift'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
    }

    const expiresAt = setBy === 'manual'
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      : null

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        operatingMode: mode,
        modeSetBy: setBy,
        modeUpdatedAt: new Date(),
        modeExpiresAt: expiresAt,
      },
    })

    return NextResponse.json({ mode, setBy, expiresAt })
  } catch (error) {
    console.error('Failed to set operating mode:', error)
    return NextResponse.json({ error: 'Failed to set operating mode' }, { status: 500 })
  }
}
