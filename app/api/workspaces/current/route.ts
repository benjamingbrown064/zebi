import { NextResponse } from 'next/server'
import { getWorkspaceFromAuth } from '@/lib/workspace'

export const revalidate = 300 // Cache 300s for read-heavy route

/**
 * GET /api/workspaces/current
 * Get current user's workspace
 * Used by client-side useWorkspace hook
 */
export async function GET() {
  try {
    const workspace = await getWorkspaceFromAuth()

    if (!workspace) {
      return NextResponse.json(
        { error: 'No workspace found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        role: workspace.role,
      },
    })
  } catch (error) {
    console.error('Failed to get workspace:', error)
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    return NextResponse.json(
      { error: 'Failed to get workspace' },
      { status: 500 }
    )
  }
}
