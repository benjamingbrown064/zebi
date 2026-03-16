'use server'

import { prisma } from '@/lib/prisma'

export interface Workspace {
  id: string
  name: string
  plan: string
  ownerId: string | null
}

/**
 * Ensure a workspace exists for the user. Creates one if it doesn't.
 * Returns the workspace ID.
 */
export async function ensureWorkspace(userId: string): Promise<string | null> {
  try {
    // Check for existing workspace where user is owner
    let workspace = await prisma.workspace.findFirst({
      where: { ownerId: userId }
    })

    // If no workspace exists, create one
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          name: 'My Workspace',
          plan: 'free',
          ownerId: userId,
        }
      })
      console.log('Created workspace:', workspace.id)
    }

    return workspace.id
  } catch (err) {
    console.error('ensureWorkspace error:', err)
    // Fallback: generate workspace ID from userId
    // This allows the app to work even if database is temporarily unavailable
    const fallbackId = `ws_${userId.slice(0, 12)}_default`
    console.log('Using fallback workspace ID:', fallbackId)
    return fallbackId
  }
}

/**
 * Get workspace by ID
 */
export async function getWorkspace(workspaceId: string): Promise<Workspace | null> {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    })

    if (!workspace) return null

    return {
      id: workspace.id,
      name: workspace.name,
      plan: workspace.plan,
      ownerId: workspace.ownerId,
    }
  } catch (err) {
    console.error('getWorkspace error:', err)
    return null
  }
}
