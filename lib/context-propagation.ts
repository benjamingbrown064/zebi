/**
 * Context Propagation
 *
 * When a task is marked done, this module:
 * 1. Writes an AIMemory entry capturing the output (for the agent that completed it)
 * 2. Finds tasks that depend on this one (via dependencyIds) and unlocks them
 * 3. Writes a context-injection AIMemory entry scoped to each dependent task's space
 *    so the next agent picks up the output without needing to manually search
 *
 * This is intentionally fire-and-forget: the task PATCH route awaits it but
 * any error here should NOT block the task update itself.
 */

import { prisma } from './prisma'

interface CompletedTask {
  id: string
  workspaceId: string
  title: string
  ownerAgent: string | null
  completionNote: string | null
  outputUrl: string | null
  outputDocId: string | null
  companyId: string | null
  projectId: string | null
  objectiveId?: string | null
  dependencyIds: string[]
}

export async function propagateTaskCompletion(task: CompletedTask): Promise<void> {
  try {
    // 1. Write an AIMemory entry for the completed task (authored by the completing agent)
    const outputSummary = [
      task.completionNote,
      task.outputUrl ? `Output: ${task.outputUrl}` : null,
      task.outputDocId ? `Doc: ${task.outputDocId}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    await prisma.aIMemory.create({
      data: {
        workspaceId: task.workspaceId,
        companyId:   task.companyId,
        projectId:   task.projectId,
        objectiveId: task.objectiveId ?? undefined,
        taskId:      task.id,
        memoryType:  'task_completion',
        entryType:   'progress',
        title:       `Completed: ${task.title}`,
        description: outputSummary || `Task "${task.title}" marked as done.`,
        confidenceScore: 100,
        authorAgent: task.ownerAgent ?? 'system',
        createdBy:   task.ownerAgent ?? 'system',
        completed:   [{ taskId: task.id, title: task.title, note: task.completionNote }],
      },
    })

    // 2. Find tasks that list this task in their dependencyIds
    if (!task.dependencyIds || task.dependencyIds.length === 0) return

    // Find any tasks that depended on this one
    const dependentTasks = await prisma.task.findMany({
      where: {
        workspaceId: task.workspaceId,
        completedAt: null,
        archivedAt:  null,
        dependencyIds: { has: task.id },
      },
      select: {
        id: true,
        title: true,
        ownerAgent: true,
        companyId: true,
        projectId: true,
        objectiveId: true,
        waitingOn: true,
        blockedReason: true,
      },
    })

    if (dependentTasks.length === 0) return

    // 3. For each dependent task, write a context-injection memory entry
    //    scoped to that task so the owning agent gets the output on next poll
    const memoryInserts = dependentTasks.map(dep => ({
      workspaceId: task.workspaceId,
      companyId:   dep.companyId,
      projectId:   dep.projectId,
      objectiveId: dep.objectiveId ?? undefined,
      taskId:      dep.id,
      memoryType:  'dependency_resolved',
      entryType:   'handoff' as const,
      title:       `Dependency resolved: "${task.title}" is done`,
      description: [
        `Task "${dep.title}" was waiting on "${task.title}".`,
        outputSummary ? `Output from ${task.ownerAgent ?? 'agent'}: ${outputSummary}` : `It has now been completed by ${task.ownerAgent ?? 'an agent'}.`,
        'This task is now unblocked.',
      ].join('\n'),
      confidenceScore: 100,
      authorAgent: 'system',
      createdBy:   'system',
      pending: [{ taskId: dep.id, title: dep.title, unblocked: true }],
    }))

    await prisma.aIMemory.createMany({ data: memoryInserts })

    // 4. Clear waitingOn if the task was waiting on the completing agent
    //    (e.g. waitingOn: "harvey" and harvey just completed the dependency)
    const agentName = task.ownerAgent
    if (agentName) {
      const waitingOnAgent = dependentTasks.filter(
        dep => dep.waitingOn === agentName
      )
      if (waitingOnAgent.length > 0) {
        await prisma.task.updateMany({
          where: { id: { in: waitingOnAgent.map(d => d.id) } },
          data: { waitingOn: 'none' },
        })
      }
    }
  } catch (err) {
    // Never throw — this is a best-effort propagation
    console.error('[context-propagation] Error during propagation:', err)
  }
}
