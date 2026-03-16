import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import TaskDetailClient from './client'
import { requireWorkspace } from '@/lib/workspace'

interface PageProps {
  params: Promise<{
    taskId: string
  }>
}

export default async function TaskDetailPage({ params }: PageProps) {
  const { taskId } = await params

  try {
    // Get workspace from auth session
    const workspaceId = await requireWorkspace()
    
    // Fetch the task
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        workspaceId,
        archivedAt: null,
      },
      include: {
        tags: {
          include: { tag: true },
        },
      },
    })

    // If task doesn't exist or user doesn't have access, redirect to board
    if (!task) {
      redirect('/board')
    }

    // Fetch statuses for the modal
    const statuses = await prisma.status.findMany({
      where: { workspaceId },
      orderBy: { sortOrder: 'asc' },
    })

    return (
      <TaskDetailClient
        task={task}
        statuses={statuses}
        workspaceId={workspaceId}
      />
    )
  } catch (error) {
    console.error('Error loading task:', error)
    redirect('/board')
  }
}
