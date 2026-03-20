import { NextRequest, NextResponse } from 'next/server'
import { buildContext } from '@/lib/ai/context-builder'
import { prioritizeWorkspace } from '@/lib/ai/prioritization-engine'
import { prioritizeForMode } from '@/lib/operating-mode/mode-prioritizer'
import { requireWorkspace } from '@/lib/workspace'
import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { OperatingMode } from '@/lib/operating-mode/detector'

export const dynamic = 'force-dynamic'

const suggestionsCache = new Map<string, { result: any; expiresAt: number }>()
const CACHE_TTL_MS = 60 * 1000 // 1 minute

const VALID_MODES: OperatingMode[] = ['pressure', 'plateau', 'momentum', 'drift']

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await requireWorkspace()

    const cached = suggestionsCache.get(workspaceId)
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(cached.result)
    }

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? (await supabase.auth.getUser()).data.user
    const userId = user?.id || 'system'

    // Get current operating mode
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { operatingMode: true, modeSetBy: true, modeExpiresAt: true },
    })

    let activeMode: OperatingMode = 'momentum'
    if (workspace?.operatingMode && VALID_MODES.includes(workspace.operatingMode as OperatingMode)) {
      // Check manual override hasn't expired
      if (workspace.modeSetBy === 'manual' && workspace.modeExpiresAt && new Date() > workspace.modeExpiresAt) {
        activeMode = 'momentum' // expired, fall back
      } else {
        activeMode = workspace.operatingMode as OperatingMode
      }
    }

    const context = await buildContext(workspaceId, userId)

    if (!context.workspace || !context.workspace.id) {
      return NextResponse.json({
        suggestions: [],
        blockers: [],
        stalledWork: [],
        missingStructure: [],
        primaryGoal: null,
        mode: activeMode,
        focusMessage: null,
        ignoreMessage: null,
      })
    }

    // Use mode-aware prioritisation
    const modeResult = prioritizeForMode(context, activeMode, userId)

    // Also run base prioritisation for fallback compatibility
    const baseResult = prioritizeWorkspace(context, userId)

    const payload = {
      suggestions: modeResult.topItems.slice(0, 10),
      blockers: modeResult.blockers,
      stalledWork: modeResult.stalledWork,
      missingStructure: modeResult.missingStructure,
      primaryGoal: context.workspace.primaryGoal,
      mode: activeMode,
      focusMessage: modeResult.focusMessage,
      ignoreMessage: modeResult.ignoreMessage,
      hiddenCount: modeResult.hiddenCount,
    }

    suggestionsCache.set(workspaceId, { result: payload, expiresAt: Date.now() + CACHE_TTL_MS })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Failed to generate suggestions:', error)
    return NextResponse.json({
      suggestions: [],
      blockers: [],
      stalledWork: [],
      missingStructure: [],
      primaryGoal: null,
      mode: 'momentum',
      focusMessage: null,
      ignoreMessage: null,
    })
  }
}
