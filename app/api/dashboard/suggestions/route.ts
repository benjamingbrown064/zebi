import { NextRequest, NextResponse } from 'next/server'
import { buildContext } from '@/lib/ai/context-builder'
import { prioritizeWorkspace } from '@/lib/ai/prioritization-engine'
import { requireWorkspace } from '@/lib/workspace'
import { createClient } from '@/lib/supabase-server'

// Mark as dynamic route (uses searchParams)
export const dynamic = 'force-dynamic'

// In-process result cache per workspace — TTL 3 minutes
// buildContext runs 7 DB queries; this avoids doing it on every dashboard load
const suggestionsCache = new Map<string, { result: any; expiresAt: number }>()
const CACHE_TTL_MS = 60 * 1000 // 1 minute — refresh suggestions regularly

/**
 * GET /api/dashboard/suggestions
 * Get AI-prioritized work suggestions
 */
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await requireWorkspace()

    // Serve from cache if fresh
    const cached = suggestionsCache.get(workspaceId)
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(cached.result)
    }

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? (await supabase.auth.getUser()).data.user
    const userId = user?.id || 'system'

    // Build workspace context (7 DB queries)
    const context = await buildContext(workspaceId, userId)

    if (!context.workspace || !context.workspace.id) {
      return NextResponse.json({
        suggestions: [],
        blockers: [],
        stalledWork: [],
        missingStructure: [],
        primaryGoal: null,
      })
    }

    const result = prioritizeWorkspace(context, userId)

    const payload = {
      suggestions: result.topItems.slice(0, 10),
      blockers: result.blockers,
      stalledWork: result.stalledWork,
      missingStructure: result.missingStructure,
      primaryGoal: context.workspace.primaryGoal,
    }

    // Cache the result
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
    })
  }
}
