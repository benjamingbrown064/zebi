'use server'

import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'

export interface Status {
  id: string
  name: string
  type: string
  isSystem: boolean
  sortOrder: number
}

const DEFAULT_STATUSES = [
  { name: 'Inbox', type: 'inbox', sortOrder: 0 },
  { name: 'Planned', type: 'planned', sortOrder: 1 },
  { name: 'Doing', type: 'doing', sortOrder: 2 },
  { name: 'Blocked', type: 'blocked', sortOrder: 3 },
  { name: 'Done', type: 'done', sortOrder: 4 },
]

/**
 * Get all statuses for a workspace.
 * Creates default system statuses if none exist.
 */
// Statuses almost never change — cache for 10 minutes
const _getStatusesCached = unstable_cache(
  async (workspaceId: string) => {
    return prisma.status.findMany({
      where: { workspaceId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, type: true, isSystem: true, sortOrder: true },
    })
  },
  ['statuses'],
  { revalidate: 600, tags: ['statuses'] }
)

export async function getStatuses(workspaceId: string): Promise<Status[]> {
  try {
    let statuses = await _getStatusesCached(workspaceId)

    console.log(`getStatuses: Found ${statuses.length} statuses`)

    // If no statuses exist, create defaults
    if (statuses.length === 0) {
      console.log(`getStatuses: Creating default statuses for workspace ${workspaceId}`)
      await prisma.status.createMany({
        data: DEFAULT_STATUSES.map(s => ({
          workspaceId,
          name: s.name,
          type: s.type,
          sortOrder: s.sortOrder,
          isSystem: true,
        }))
      })

      statuses = await prisma.status.findMany({
        where: { workspaceId },
        orderBy: { sortOrder: 'asc' }
      })
      console.log(`getStatuses: Created and fetched ${statuses.length} default statuses`)
    }

    return statuses.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      isSystem: s.isSystem,
      sortOrder: s.sortOrder,
    }))
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('getStatuses error for workspace', workspaceId, ':', errorMsg)
    return []
  }
}

/**
 * Get a status by type (e.g., 'inbox', 'doing')
 */
export async function getStatusByType(workspaceId: string, type: string): Promise<Status | null> {
  try {
    const status = await prisma.status.findFirst({
      where: { workspaceId, type }
    })

    if (!status) return null

    return {
      id: status.id,
      name: status.name,
      type: status.type,
      isSystem: status.isSystem,
      sortOrder: status.sortOrder,
    }
  } catch (err) {
    console.error('getStatusByType error:', err)
    return null
  }
}
