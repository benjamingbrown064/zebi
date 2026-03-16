'use server'

import { prisma } from '@/lib/prisma'

export interface WorkspaceMember {
  id: string
  name?: string
  email?: string
  role: string
}

/**
 * Get all members of a workspace
 */
export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  try {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
    })

    // For now, return member data with userId as id
    // In a full implementation, you'd join with auth.users table
    return members.map((m) => ({
      id: m.userId,
      name: undefined, // Would come from auth.users
      email: undefined, // Would come from auth.users
      role: m.role,
    }))
  } catch (err) {
    console.error('getWorkspaceMembers error:', err)
    return []
  }
}

/**
 * Get workspace owner info
 */
export async function getWorkspaceOwner(workspaceId: string): Promise<WorkspaceMember | null> {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    })

    if (!workspace || !workspace.ownerId) return null

    return {
      id: workspace.ownerId,
      name: undefined,
      email: undefined,
      role: 'owner',
    }
  } catch (err) {
    console.error('getWorkspaceOwner error:', err)
    return null
  }
}
