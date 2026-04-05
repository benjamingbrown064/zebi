export const revalidate = 30

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
    select: {
      id: true,
      title: true,
      description: true,
      priority: true,
      dueAt: true,
      completedAt: true,
      plannedDate: true,
      effortPoints: true,
      ownerAgent: true,
      botAssignee: true,
      assigneeId: true,
      status: { select: { id: true, name: true, type: true } },
      project: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
      objective: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })

  // Map company → space so client components use consistent field name
  const mappedTasks = tasks.map((t: any) => ({
    ...t,
    space: t.company || null,
  }))

  return {
    tasks: mappedTasks,
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
