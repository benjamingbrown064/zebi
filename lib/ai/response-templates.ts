import { PrioritizationResult, ScoredItem } from './prioritization-engine'
import { AIContext } from './context-builder'

/**
 * Generate a prioritization response based on scored items
 */
export function generatePrioritizationResponse(
  result: PrioritizationResult,
  context: AIContext
): string {
  const { topItems, blockers, missingStructure, stalledWork } = result

  // If workspace is too empty
  if (topItems.length === 0) {
    return generateEmptyWorkspaceResponse(context)
  }

  // If data is weak but we have some items
  if (topItems.length < 3 || missingStructure.tasksWithoutDates > 5) {
    return generateWeakDataResponse(topItems, missingStructure, context)
  }

  // Standard prioritization response
  return generateStandardResponse(topItems, blockers, missingStructure, stalledWork, context)
}

/**
 * Standard prioritization response (good data)
 */
function generateStandardResponse(
  topItems: ScoredItem[],
  blockers: any[],
  missingStructure: any,
  stalledWork: any[],
  context: AIContext
): string {
  const lines = []

  // Opening with context
  if (context.workspace.primaryGoal) {
    lines.push(`Your main goal: **${context.workspace.primaryGoal.name}**`)
    lines.push('')
  }

  lines.push('Based on your workspace, here\'s what to focus on today:')
  lines.push('')

  // Top 3 items
  const top3 = topItems.slice(0, 3)
  top3.forEach((item, index) => {
    lines.push(`**${index + 1}. ${item.name}** (${item.type})`)
    if (item.reasons.length > 0) {
      lines.push(`   ${item.reasons[0]}`)
    }
    lines.push('')
  })

  // Next recommended action (4th item)
  if (topItems.length > 3) {
    const nextItem = topItems[3]
    lines.push(`After that, work on **${nextItem.name}** (${nextItem.type}) because ${nextItem.reasons[0]?.toLowerCase() || 'it\'s next in priority'}.`)
    lines.push('')
  }

  // Blockers alert
  if (blockers.length > 0) {
    lines.push('⚠️ **Active Blockers:**')
    blockers.slice(0, 3).forEach(b => {
      lines.push(`- ${b.title} (${b.objective}) [${b.severity}]`)
    })
    lines.push('')
  }

  // Stalled work
  if (stalledWork.length > 0) {
    lines.push('🔔 **Stalled Work:**')
    stalledWork.slice(0, 2).forEach(item => {
      const stalledReason = item.reasons.find((r: string) => r.includes('No activity'))
      if (stalledReason) {
        lines.push(`- ${item.name} (${item.type}) - ${stalledReason}`)
      }
    })
    lines.push('')
  }

  // Missing structure warnings
  const warnings = []
  if (missingStructure.tasksWithoutDates > 0) {
    warnings.push(`${missingStructure.tasksWithoutDates} tasks without due dates`)
  }
  if (missingStructure.projectsWithoutTasks > 0) {
    warnings.push(`${missingStructure.projectsWithoutTasks} projects with no tasks`)
  }
  if (missingStructure.objectivesWithoutTasks > 0) {
    warnings.push(`${missingStructure.objectivesWithoutTasks} objectives with no tasks`)
  }

  if (warnings.length > 0) {
    lines.push('📋 **Workspace Health:**')
    warnings.forEach(w => lines.push(`- ${w}`))
    lines.push('')
    lines.push('Adding structure to these items will improve future prioritization.')
  }

  return lines.join('\n').trim()
}

/**
 * Response when data exists but is incomplete
 */
function generateWeakDataResponse(
  topItems: ScoredItem[],
  missingStructure: any,
  context: AIContext
): string {
  const lines = []

  if (context.workspace.primaryGoal) {
    lines.push(`Your main goal: **${context.workspace.primaryGoal.name}**`)
    lines.push('')
  }

  lines.push('Your workspace needs more structure for precise prioritization, but based on what\'s available:')
  lines.push('')

  // Show what we have
  topItems.slice(0, 3).forEach((item, index) => {
    lines.push(`${index + 1}. **${item.name}** (${item.type})`)
    if (item.reasons.length > 0) {
      lines.push(`   ${item.reasons[0]}`)
    } else {
      lines.push(`   Appears to be active work`)
    }
    lines.push('')
  })

  // Explain the gaps
  lines.push('⚠️ **To improve prioritization:**')
  
  const improvements = []
  if (missingStructure.tasksWithoutDates > 5) {
    improvements.push(`Add due dates to ${missingStructure.tasksWithoutDates} tasks`)
  }
  if (missingStructure.tasksWithoutOwners > 3) {
    improvements.push(`Assign owners to ${missingStructure.tasksWithoutOwners} tasks`)
  }
  if (missingStructure.projectsWithoutTasks > 0) {
    improvements.push(`Define next actions for ${missingStructure.projectsWithoutTasks} projects`)
  }
  if (missingStructure.objectivesWithoutTasks > 0) {
    improvements.push(`Create tasks for ${missingStructure.objectivesWithoutTasks} objectives`)
  }

  improvements.forEach(imp => lines.push(`- ${imp}`))

  return lines.join('\n').trim()
}

/**
 * Response when workspace is mostly empty
 */
function generateEmptyWorkspaceResponse(context: AIContext): string {
  const lines = []

  lines.push('Your workspace doesn\'t have enough structured work yet for me to prioritize properly.')
  lines.push('')
  lines.push('**The best next step is to define:**')
  lines.push('')
  lines.push('1. Your main goal (what are you trying to achieve?)')
  lines.push('2. 2-3 active projects that support that goal')
  lines.push('3. The next actionable task for each project')
  lines.push('')

  if (context.workspace.spaces.length > 0) {
    lines.push(`I can see you have ${context.workspace.spaces.length} ${context.workspace.spaces.length === 1 ? 'space' : 'spaces'} in the system: ${context.workspace.spaces.slice(0, 3).map(c => c.name).join(', ')}.`)
    lines.push('')
    lines.push('Would you like help creating objectives or projects for any of them?')
  } else {
    lines.push('I can help you create these now based on your business priorities.')
  }

  return lines.join('\n').trim()
}

/**
 * Generate a quick "Today Focus" response (shorter version)
 */
export function generateTodayFocusResponse(topItems: ScoredItem[]): string {
  if (topItems.length === 0) {
    return 'No urgent items for today. Consider planning work for the week ahead.'
  }

  const lines = ['**Today\'s Focus:**', '']

  topItems.slice(0, 3).forEach((item, index) => {
    lines.push(`${index + 1}. ${item.name}`)
    if (item.reasons[0]) {
      lines.push(`   ${item.reasons[0]}`)
    }
    lines.push('')
  })

  return lines.join('\n').trim()
}
