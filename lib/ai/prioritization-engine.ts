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
  context: AIContext
): ScoredItem {
  let score = 0
  const reasons: string[] = []

  // 1. GOAL ALIGNMENT (+40 if directly linked to primary goal)
  if (context.workspace.primaryGoal) {
    if (type === 'objective' && item.goalId === context.workspace.primaryGoal.id) {
      score += 40
      reasons.push(`Directly linked to primary goal: ${context.workspace.primaryGoal.name}`)
    } else if (type === 'task' && item.goalId === context.workspace.primaryGoal.id) {
      score += 40
      reasons.push(`Directly linked to primary goal: ${context.workspace.primaryGoal.name}`)
    } else if (type === 'project' && item.goalId === context.workspace.primaryGoal.id) {
      score += 40
      reasons.push(`Directly linked to primary goal: ${context.workspace.primaryGoal.name}`)
    }
  }

  // Linked to any active goal (+25)
  if (item.goalId && !reasons.some(r => r.includes('primary goal'))) {
    score += 25
    const goal = context.workspace.activeGoals.find(g => g.id === item.goalId)
    if (goal) {
      reasons.push(`Linked to active goal: ${goal.name}`)
    }
  }

  // 2. URGENCY (dates)
  if (type === 'task' && item.dueAt) {
    const dueDate = new Date(item.dueAt)
    const now = new Date()
    const daysDiff = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff < 0) {
      score += 30
      reasons.push(`Overdue by ${Math.abs(daysDiff)} days`)
    } else if (daysDiff === 0) {
      score += 25
      reasons.push('Due today')
    } else if (daysDiff <= 3) {
      score += 20
      reasons.push(`Due in ${daysDiff} days`)
    } else if (daysDiff <= 7) {
      score += 10
      reasons.push(`Due within a week`)
    }
  } else if ((type === 'objective' || type === 'project') && item.deadline) {
    const deadline = new Date(item.deadline)
    const now = new Date()
    const daysDiff = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff < 0) {
      score += 30
      reasons.push(`Overdue by ${Math.abs(daysDiff)} days`)
    } else if (daysDiff <= 7) {
      score += 20
      reasons.push(`Deadline in ${daysDiff} days`)
    } else if (daysDiff <= 14) {
      score += 10
      reasons.push(`Deadline approaching`)
    }
  }

  // 3. BLOCKER VALUE
  if (type === 'objective' && context.workspace.blockers.some(b => b.objectiveId === item.id)) {
    score += 25
    reasons.push('Has active blockers that need resolution')
  }

  // Check if this task is blocking other work (based on dependencies)
  if (type === 'task' && item.isBlocking) {
    score += 25
    reasons.push('Blocking other tasks')
  }

  // 4. COMMERCIAL IMPACT
  if (item.isRevenueLinked || item.companyId) {
    score += 25
    const company = context.workspace.companies.find(c => c.id === item.companyId)
    if (company) {
      reasons.push(`Tied to ${company.name} (revenue-linked)`)
    } else {
      reasons.push('Tied to revenue/client delivery')
    }
  }

  // 5. PROGRESS LEVERAGE
  if (type === 'objective' && item.progressPercent) {
    const progress = Number(item.progressPercent)
    if (progress >= 80) {
      score += 15
      reasons.push(`Nearly complete (${progress}%) - quick win`)
    } else if (progress > 0 && progress < 20) {
      score += 5
      reasons.push('Early stage - momentum builder')
    }
  }

  // Task completion state
  if (type === 'task' && item.completionPercent && item.completionPercent >= 70) {
    score += 15
    reasons.push('Nearly complete - quick win')
  }

  // 6. PRIORITY METADATA
  if (item.priority !== undefined) {
    // Lower number = higher priority (1 = high, 3 = medium, 5 = low)
    if (item.priority === 1) {
      score += 15
      reasons.push('Marked as high priority')
    } else if (item.priority === 2) {
      score += 8
      reasons.push('Marked as medium priority')
    }
  }

  // 7. OWNERSHIP AND STRUCTURE
  if (item.assigneeId || item.owner) {
    score += 5
  } else {
    score -= 5
    reasons.push('⚠️ Missing owner')
  }

  if (!item.dueAt && type === 'task') {
    score -= 5
  }

  if (!item.deadline && (type === 'objective' || type === 'project')) {
    score -= 5
  }

  // 8. STALLED WORK (negative impact)
  if (item.lastActivity) {
    const lastActivity = new Date(item.lastActivity)
    const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceActivity > 14) {
      score -= 15
      reasons.push(`⚠️ No activity for ${daysSinceActivity} days`)
    }
  }

  return {
    type,
    id: item.id,
    name: item.title || item.name,
    score,
    reasons,
    metadata: item,
  }
}

/**
 * Prioritize all work items in the workspace
 */
export function prioritizeWorkspace(context: AIContext): PrioritizationResult {
  const allItems: ScoredItem[] = []

  // Score all tasks
  context.workspace.recentTasks.forEach(task => {
    allItems.push(scoreWorkItem(task, 'task', context))
  })

  // Score all projects
  context.workspace.activeProjects.forEach(project => {
    allItems.push(scoreWorkItem(project, 'project', context))
  })

  // Score all objectives
  context.workspace.activeObjectives.forEach(objective => {
    allItems.push(scoreWorkItem(objective, 'objective', context))
  })

  // Sort by score (highest first)
  allItems.sort((a, b) => b.score - a.score)

  // Detect missing structure
  const tasksWithoutDates = context.workspace.recentTasks.filter(t => !t.dueAt).length
  const tasksWithoutOwners = context.workspace.recentTasks.filter(t => !t.assigneeId).length
  const tasksWithoutPriority = context.workspace.recentTasks.filter(t => t.priority === 3 || t.priority > 3).length

  // Count projects/objectives with no tasks
  const projectsWithoutTasks = context.workspace.activeProjects.filter(
    p => !context.workspace.recentTasks.some(t => t.projectId === p.id)
  ).length

  const objectivesWithoutTasks = context.workspace.activeObjectives.filter(
    obj => !context.workspace.recentTasks.some(t => t.objectiveId === obj.id)
  ).length

  // Find stalled work (no recent activity)
  const stalledWork = allItems.filter(item => 
    item.reasons.some(r => r.includes('No activity'))
  )

  return {
    topItems: allItems.slice(0, 10), // Top 10 items
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
