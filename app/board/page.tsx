import { prisma } from '@/lib/prisma'
import BoardClient from './client'
import { requireWorkspace } from '@/lib/workspace'

// Revalidate the page every 5 seconds so new tasks appear quickly
export const revalidate = 5

export default async function BoardPage() {
  try {
    // Get workspace from auth session
    const workspaceId = await requireWorkspace()
    
    // Fetch data server-side
    // OPTIMIZED: Added limit to prevent loading too many tasks at once
    const [tasks, statuses] = await Promise.all([
      prisma.task.findMany({
        where: { 
          workspaceId,
          archivedAt: null
        },
        include: {
          tags: {
            include: { tag: true }
          },
          project: {
            select: { id: true, name: true }
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 500 // Limit to 500 most recent tasks (prevents loading thousands)
      }),
      prisma.status.findMany({
        where: { workspaceId },
        orderBy: { sortOrder: 'asc' }
      })
    ])

    // Pass data to client component
    return <BoardClient initialTasks={tasks} initialStatuses={statuses} />
  } catch (err) {
    console.error('Failed to load board data:', err)
    return (
      <div className="min-h-screen bg-bg-cream flex items-center justify-center">
        <div className="text-red-600">Failed to load board</div>
      </div>
    )
  }
}
