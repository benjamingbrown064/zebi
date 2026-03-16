import { NextRequest, NextResponse } from 'next/server'
import { buildContext } from '@/lib/ai/context-builder'
import { prioritizeWorkspace } from '@/lib/ai/prioritization-engine'
import { requireWorkspace } from '@/lib/workspace'
import { createClient } from '@/lib/supabase-server'

// Mark as dynamic route (uses searchParams)
export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/suggestions
 * Get AI-prioritized work suggestions
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user's workspace
    const workspaceId = await requireWorkspace()
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || 'system'
    
    // Build workspace context
    const context = await buildContext(workspaceId, userId)
    
    // If workspace not found or empty, return empty suggestions
    if (!context.workspace || !context.workspace.id) {
      return NextResponse.json({
        suggestions: [],
        blockers: [],
        stalledWork: [],
        missingStructure: [],
        primaryGoal: null,
      })
    }
    
    // Run prioritization engine
    const result = prioritizeWorkspace(context)
    
    // Return top suggestions with metadata
    return NextResponse.json({
      suggestions: result.topItems.slice(0, 10), // Top 10 suggestions
      blockers: result.blockers,
      stalledWork: result.stalledWork,
      missingStructure: result.missingStructure,
      primaryGoal: context.workspace.primaryGoal,
    })
  } catch (error) {
    console.error('Failed to generate suggestions:', error)
    // Return empty suggestions instead of 500 error
    return NextResponse.json({
      suggestions: [],
      blockers: [],
      stalledWork: [],
      missingStructure: [],
      primaryGoal: null,
    })
  }
}
