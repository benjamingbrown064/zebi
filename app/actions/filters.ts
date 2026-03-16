'use server'

import { prisma } from '@/lib/prisma'

export interface FilterDefinition {
  statuses?: string[]
  priorities?: number[]
  tags?: string[]
  dueDateWindow?: {
    from?: string
    to?: string
  }
  project?: string
  goal?: string
  assignedTo?: string
  hasAttachments?: boolean
  isBlocked?: boolean
}

export interface SavedFilter {
  id: string
  workspaceId: string
  name: string
  definition: FilterDefinition
  defaultView: 'list' | 'board'
  createdAt: string
  updatedAt: string
}

export async function getFilters(workspaceId: string): Promise<SavedFilter[]> {
  try {
    console.log(`getFilters: Fetching filters for workspace ${workspaceId}`)
    
    const filters = await prisma.savedFilter.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' }
    })

    console.log(`getFilters: Found ${filters.length} filters`)

    return filters.map((f) => ({
      id: f.id,
      workspaceId: f.workspaceId,
      name: f.name,
      definition: (f.definition as FilterDefinition) || {},
      defaultView: (f.defaultView as 'list' | 'board') || 'list',
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }))
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('getFilters error for workspace', workspaceId, ':', errorMsg)
    return []
  }
}

export async function createFilter(
  workspaceId: string,
  input: {
    name: string
    definition: FilterDefinition
    defaultView?: 'list' | 'board'
  }
): Promise<SavedFilter | null> {
  try {
    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    })

    if (!workspace) {
      console.error('createFilter: workspace not found')
      return null
    }

    const filter = await prisma.savedFilter.create({
      data: {
        workspaceId,
        name: input.name,
        definition: input.definition as object,
        defaultView: input.defaultView || 'list',
      }
    })

    return {
      id: filter.id,
      workspaceId: filter.workspaceId,
      name: filter.name,
      definition: (filter.definition as FilterDefinition) || {},
      defaultView: (filter.defaultView as 'list' | 'board') || 'list',
      createdAt: filter.createdAt.toISOString(),
      updatedAt: filter.updatedAt.toISOString(),
    }
  } catch (err) {
    console.error('createFilter error:', err)
    return null
  }
}

export async function updateFilter(
  workspaceId: string,
  filterId: string,
  updates: Partial<Omit<SavedFilter, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>>
): Promise<SavedFilter | null> {
  try {
    // SECURITY: Verify filter belongs to this workspace before updating
    const existingFilter = await prisma.savedFilter.findFirst({
      where: { id: filterId, workspaceId }
    })

    if (!existingFilter) {
      console.error('updateFilter: filter not found or does not belong to workspace')
      return null
    }

    const filter = await prisma.savedFilter.update({
      where: { id: filterId },
      data: {
        name: updates.name,
        definition: updates.definition as object | undefined,
        defaultView: updates.defaultView,
      }
    })

    return {
      id: filter.id,
      workspaceId: filter.workspaceId,
      name: filter.name,
      definition: (filter.definition as FilterDefinition) || {},
      defaultView: (filter.defaultView as 'list' | 'board') || 'list',
      createdAt: filter.createdAt.toISOString(),
      updatedAt: filter.updatedAt.toISOString(),
    }
  } catch (err) {
    console.error('updateFilter error:', err)
    return null
  }
}

export async function deleteFilter(workspaceId: string, filterId: string): Promise<boolean> {
  try {
    // SECURITY: Verify filter belongs to this workspace before deleting
    const existingFilter = await prisma.savedFilter.findFirst({
      where: { id: filterId, workspaceId }
    })

    if (!existingFilter) {
      console.error('deleteFilter: filter not found or does not belong to workspace')
      return false
    }

    await prisma.savedFilter.delete({
      where: { id: filterId }
    })

    return true
  } catch (err) {
    console.error('deleteFilter error:', err)
    return false
  }
}
