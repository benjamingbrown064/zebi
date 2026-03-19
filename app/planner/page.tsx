import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { requireWorkspace } from '@/lib/workspace'
import WeeklyPlannerClient from './client'

export const metadata = {
  title: 'Weekly Planner - Zebi',
  description: 'Plan your week with drag-and-drop task scheduling',
}

async function getWeeklyPlannerData(workspaceId: string) {
  const tasks = await prisma.task.findMany({
    where: {
      workspaceId,
      archivedAt: null,
    },
    include: {
      status: true,
      project: {
        select: { id: true, name: true },
      },
      company: {
        select: { id: true, name: true },
      },
      objective: {
        select: { id: true, title: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })

  return {
    tasks,
    workspace,
    defaultCapacity: 8,
  }
}

export default async function WeeklyPlannerPage() {
  const workspaceId = await requireWorkspace()
  const data = await getWeeklyPlannerData(workspaceId)

  return (
    <Suspense fallback={<div className="p-12">Loading planner...</div>}>
      <WeeklyPlannerClient
        initialTasks={data.tasks}
        workspaceId={workspaceId}
        defaultCapacity={data.defaultCapacity}
      />
    </Suspense>
  )
}
