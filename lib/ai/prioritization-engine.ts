import { AIContext } from './context-builder'

export interface ScoredItem {
  type: 'task' | 'project' | 'objective'
  id: string
  name: string
  score: number
  reasons: string[]
  metadata: any
}

export interface PrioritizationResult {
  topItems: ScoredItem[]
  blockers: any[]
  missingStructure: {
    tasksWithoutDates: number
    tasksWithoutOwners: number
    tasksWithoutPriority: number
    projectsWithoutTasks: number
    objectivesWithoutTasks: number
  }
  stalledWork: any[]
}

/**
 * Score a work item based on prioritization factors
 */
export function scoreWorkItem(
  item: any,
  type: 'task' | 'project' | 'objective',
  context: AIContext,
  userId?: string
): ScoredItem {
  let score = 0
  const reasons: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // ── 1. ASSIGNED TO ME (highest individual signal) ────────────────────────
  if (userId && item.assigneeId === userId) {
    score += 35
    reasons.push('Assigned to you')
  }

  // ── 2. PLANNED / PINNED FOR TODAY ────────────────────────────────────────
  if (type === 'task') {
    const todayStr = today.toISOString().split('T')[0]
    if (item.todayPinDate && item.todayPinDate.split('T')[0] === todayStr) {
      score += 35
      reasons.push('Pinned for today')
    }
    if (item.plannedDate && item.plannedDate.split('T')[0] === todayStr) {
      score += 30
      reasons.push('Planned for today')
    }
  }

  // ── 3. GOAL ALIGNMENT ────────────────────────────────────────────────────
  if (context.workspace.primaryGoal) {
    if (item.goalId === context.workspace.primaryGoal.id) {
      score += 30
      reasons.push(`Linked to primary goal: ${context.workspace.primaryGoal.name}`)
    }
  }
  // Linked to any active goal
  if (item.goalId && !reasons.some(r => r.includes('primary goal'))) {
    score += 20
    const goal = context.workspace.activeGoals.find(g => g.id === item.goalId)
    if (goal) reasons.push(`Linked to goal: ${goal.name}`)
  }

  // ── 4. URGENCY (due dates) ────────────────────────────────────────────────
  const dueField = item.dueAt || item.deadline
  if (dueField) {
    const dueDate = new Date(dueField)
    const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff < 0) {
      score += 35
      reasons.push(`Overdue by ${Math.abs(daysDiff)} day${Math.abs(daysDiff) === 1 ? '' : 's'}`)
    } else if (daysDiff === 0) {
      score += 30
      reasons.push('Due today')
    } else if (daysDiff <= 2) {
      score += 25
      reasons.push(`Due in ${daysDiff} day${daysDiff === 1 ? '' : 's'}`)
    } else if (daysDiff <= 7) {
      score += 15
      reasons.push('Due this week')
    } else if (daysDiff <= 14) {
      score += 8
      reasons.push('Due within 2 weeks')
    }
  }

  // ── 5. PRIORITY METADATA ─────────────────────────────────────────────────
  if (item.priority !== undefined && item.priority !== null) {
    if (item.priority === 1) {
      score += 25
      reasons.push('High priority')
    } else if (item.priority === 2) {
      score += 15
      reasons.push('Medium-high priority')
    } else if (item.priority === 3) {
      score += 5 // default/medium — still a small boost
    }
    // Low priority (4,5) gets no boost
  }

  // ── 6. COMMERCIAL IMPACT ─────────────────────────────────────────────────
  if (item.companyId || item.isRevenueLinked) {
    score += 20
    const company = context.workspace.companies.find(c => c.id === item.companyId)
    if (company) reasons.push(`Client work: ${company.name}`)
    else reasons.push('Client / revenue-linked')
  }

  // ── 7. BLOCKER VALUE ─────────────────────────────────────────────────────
  if (type === 'objective' && context.workspace.blockers.some(b => b.objectiveId === item.id)) {
    score += 20
    reasons.push('Has active blockers')
  }
  if (type === 'task' && item.isBlocking) {
    score += 20
    reasons.push('Blocking other work')
  }

  // ── 8. NEAR COMPLETION ───────────────────────────────────────────────────
  if (type === 'objective' && item.progressPercent >= 80) {
    score += 15
    reasons.push(`Nearly complete (${item.progressPercent}%)`)
  }
  if (type === 'task' && item.completionPercent >= 70) {
    score += 15
    reasons.push('Nearly done')
  }

  // ── 9. STALLED — gentle nudge only, not a hard penalty ──────────────────
  // Only show stale warning as a reason, don't tank the score
  if (item.lastActivity) {
    const daysSince = Math.floor((Date.now() - new Date(item.lastActivity).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSince > 30) {
      score -= 5 // very gentle — don't hide important stale tasks
      reasons.push(`No activity for ${daysSince} days`)
    }
  }

  // ── ENSURE TASKS ALWAYS GET A MINIMUM SCORE ───────────────────────────────
  // So they always appear alongside objectives/projects
  if (type === 'task' && score < 5) score = 5

  return {
    type,
    id: item.id,
    name: item.title || item.name,
    score,
    reasons: reasons.filter(r => !r.startsWith('⚠️')), // clean up old warning format
    metadata: item,
  }
}

/**
 * Prioritize all work items in the workspace
 */
export function prioritizeWorkspace(context: AIContext, userId?: string): PrioritizationResult {
  const allItems: ScoredItem[] = []

  // Score tasks — pass userId so "assigned to me" works
  context.workspace.recentTasks.forEach(task => {
    allItems.push(scoreWorkItem(task, 'task', context, userId))
  })

  // Score projects
  context.workspace.activeProjects.forEach(project => {
    allItems.push(scoreWorkItem(project, 'project', context, userId))
  })

  // Score objectives
  context.workspace.activeObjectives.forEach(objective => {
    allItems.push(scoreWorkItem(objective, 'objective', context, userId))
  })

  // Sort by score descending
  allItems.sort((a, b) => b.score - a.score)

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

  const stalledWork = allItems.filter(item =>
    item.reasons.some(r => r.includes('No activity'))
  )

  return {
    topItems: allItems.slice(0, 10),
    blockers: context.workspace.blockers,
    missingStructure: {
      tasksWithoutDates,
      tasksWithoutOwners,
      tasksWithoutPriority,
      projectsWithoutTasks,
      objectivesWithoutTasks,
    },
    stalledWork,
  }
}
