import { AIContext } from '@/lib/ai/context-builder'
import { ScoredItem, scoreWorkItem } from '@/lib/ai/prioritization-engine'
import { OperatingMode } from '@/lib/operating-mode/detector'

export interface ModePrioritizationResult {
  topItems: ScoredItem[]
  hiddenCount: number
  focusMessage: string
  ignoreMessage: string | null
  blockers: any[]
  stalledWork: any[]
  missingStructure: {
    tasksWithoutDates: number
    tasksWithoutOwners: number
    tasksWithoutPriority: number
    projectsWithoutTasks: number
    objectivesWithoutTasks: number
  }
}

/**
 * Apply mode-specific scoring modifiers on top of the base score
 */
function applyModeModifiers(item: ScoredItem, mode: OperatingMode, context: AIContext): number {
  let score = item.score
  const meta = item.metadata
  const now = new Date()

  switch (mode) {
    case 'pressure': {
      // Boost: overdue, urgent, revenue-linked, due today/tomorrow
      if (meta.dueAt && new Date(meta.dueAt) < now) score += 40 // overdue
      if (meta.priority === 1) score += 30 // urgent
      if (meta.companyId || meta.isRevenueLinked) score += 25 // cash-linked
      const daysUntil = meta.dueAt ? Math.floor((new Date(meta.dueAt).getTime() - now.getTime()) / 86400000) : 99
      if (daysUntil <= 1 && daysUntil >= 0) score += 20 // due today/tomorrow

      // Suppress: long-term objectives, projects with no deadline, low-priority tasks
      if (item.type === 'objective' && meta.progressPercent < 10) score -= 30
      if (item.type === 'project' && !meta.deadline) score -= 20
      if (meta.priority >= 4) score -= 25
      break
    }

    case 'plateau': {
      // Boost: stagnant objectives, avoided decisions, strategic work
      if (item.type === 'objective') {
        const daysSince = meta.lastActivity ? Math.floor((Date.now() - new Date(meta.lastActivity).getTime()) / 86400000) : 0
        if (daysSince > 7 && meta.progressPercent < 50) score += 40 // stagnant objective
      }
      if (item.type === 'project' && meta.priority === 1) score += 20
      if (meta.companyId || meta.isRevenueLinked) score += 15

      // Suppress: routine admin tasks, repeating maintenance work
      if (meta.priority >= 4) score -= 20
      if (item.type === 'task' && !meta.objectiveId && !meta.goalId && !meta.companyId) score -= 15
      break
    }

    case 'momentum': {
      // Boost: items linked to moving objectives, near-complete work, clear sprint items
      if (item.type === 'objective' && meta.progressPercent >= 30) score += 20
      if (item.type === 'task' && (meta.objectiveId || meta.goalId)) score += 15
      if (meta.priority <= 2) score += 10
      const daysUntil = meta.dueAt ? Math.floor((new Date(meta.dueAt).getTime() - now.getTime()) / 86400000) : 99
      if (daysUntil >= 0 && daysUntil <= 14) score += 15 // upcoming

      // Light suppression of very low priority
      if (meta.priority >= 4) score -= 10
      break
    }

    case 'drift': {
      // Boost: high-value neglected work, strategic bets, founder-level decisions
      if (item.type === 'objective') score += 25 // always surface objectives in drift
      if (meta.priority === 1 && item.type === 'task') score += 30
      if (meta.companyId || meta.isRevenueLinked) score += 20
      if (item.type === 'project' && meta.priority === 1) score += 25

      // Suppress: routine low-value tasks
      if (meta.priority >= 4) score -= 30
      if (item.type === 'task' && !meta.objectiveId && !meta.goalId && !meta.companyId && meta.priority >= 3) score -= 20
      break
    }
  }

  return score
}

const MODE_FOCUS: Record<OperatingMode, { focus: string; ignore: string | null; maxItems: number }> = {
  pressure: {
    focus: 'Showing only urgent, cash-moving, and overdue work.',
    ignore: 'Long-term planning, low-priority tasks, and broad objectives are hidden.',
    maxItems: 5,
  },
  plateau: {
    focus: 'Showing stagnant objectives, strategic decisions, and leverage moves.',
    ignore: 'Routine admin and low-value maintenance tasks are deprioritised.',
    maxItems: 6,
  },
  momentum: {
    focus: 'Showing sprint priorities, moving objectives, and upcoming commitments.',
    ignore: null,
    maxItems: 8,
  },
  drift: {
    focus: 'Showing high-value neglected work, strategic bets, and objectives.',
    ignore: 'Routine maintenance tasks are hidden — focus on what moves the needle.',
    maxItems: 6,
  },
}

export function prioritizeForMode(
  context: AIContext,
  mode: OperatingMode,
  userId?: string
): ModePrioritizationResult {
  const allItems: ScoredItem[] = []

  // Score all items with base engine first
  context.workspace.recentTasks.forEach(task => {
    allItems.push(scoreWorkItem(task, 'task', context, userId))
  })
  context.workspace.activeProjects.forEach(project => {
    allItems.push(scoreWorkItem(project, 'project', context, userId))
  })
  context.workspace.activeObjectives.forEach(objective => {
    allItems.push(scoreWorkItem(objective, 'objective', context, userId))
  })

  // Apply mode modifiers
  const modifiedItems = allItems.map(item => ({
    ...item,
    score: applyModeModifiers(item, mode, context),
  }))

  // In pressure mode, filter out very low scorers entirely
  let filtered = modifiedItems
  if (mode === 'pressure') {
    const highScorers = modifiedItems.filter(i => i.score >= 20)
    filtered = highScorers.length >= 3 ? highScorers : modifiedItems
  }
  if (mode === 'drift') {
    const meaningful = modifiedItems.filter(i => i.score >= 10)
    filtered = meaningful.length >= 3 ? meaningful : modifiedItems
  }

  // Sort descending
  filtered.sort((a, b) => b.score - a.score)

  const config = MODE_FOCUS[mode]
  const topItems = filtered.slice(0, config.maxItems)
  const hiddenCount = Math.max(0, filtered.length - config.maxItems)

  // Structure analysis
  const tasksWithoutDates = context.workspace.recentTasks.filter(t => !t.dueAt).length
  const tasksWithoutOwners = context.workspace.recentTasks.filter(t => !t.assigneeId).length
  const tasksWithoutPriority = context.workspace.recentTasks.filter(t => !t.priority || t.priority >= 4).length
  const projectsWithoutTasks = context.workspace.activeProjects.filter(
    p => !context.workspace.recentTasks.some(t => t.projectId === p.id)
  ).length
  const objectivesWithoutTasks = context.workspace.activeObjectives.filter(
    obj => !context.workspace.recentTasks.some(t => t.objectiveId === obj.id)
  ).length

  const stalledWork = modifiedItems.filter(item =>
    item.reasons.some(r => r.includes('No activity'))
  )

  return {
    topItems,
    hiddenCount,
    focusMessage: config.focus,
    ignoreMessage: config.ignore,
    blockers: context.workspace.blockers,
    stalledWork,
    missingStructure: {
      tasksWithoutDates,
      tasksWithoutOwners,
      tasksWithoutPriority,
      projectsWithoutTasks,
      objectivesWithoutTasks,
    },
  }
}
