import { AIContext } from '@/lib/ai/context-builder'

export type OperatingMode = 'pressure' | 'plateau' | 'momentum' | 'drift'

export interface ModeDetectionResult {
  suggestedMode: OperatingMode
  confidence: number // 0-100
  signals: ModeSignal[]
  reasoning: string
}

export interface ModeSignal {
  type: string
  value: string | number
  weight: 'high' | 'medium' | 'low'
  mode: OperatingMode
}

export function detectOperatingMode(context: AIContext): ModeDetectionResult {
  const signals: ModeSignal[] = []
  const scores: Record<OperatingMode, number> = {
    pressure: 0,
    plateau: 0,
    momentum: 0,
    drift: 0,
  }

  const tasks = context.workspace.recentTasks
  const objectives = context.workspace.activeObjectives
  const blockers = context.workspace.blockers
  const now = new Date()

  // ---- PRESSURE signals ----
  const overdueTasks = tasks.filter(t => t.dueAt && new Date(t.dueAt) < now)
  if (overdueTasks.length >= 5) {
    scores.pressure += 30
    signals.push({ type: 'overdue_tasks', value: overdueTasks.length, weight: 'high', mode: 'pressure' })
  } else if (overdueTasks.length >= 2) {
    scores.pressure += 15
    signals.push({ type: 'overdue_tasks', value: overdueTasks.length, weight: 'medium', mode: 'pressure' })
  }

  const urgentTasks = tasks.filter(t => t.priority === 1)
  if (urgentTasks.length >= 4) {
    scores.pressure += 20
    signals.push({ type: 'urgent_tasks', value: urgentTasks.length, weight: 'high', mode: 'pressure' })
  }

  const upcomingDeadlines = context.temporal.upcomingDeadlines.filter(d => {
    const daysUntil = (new Date(d.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return daysUntil <= 3
  })
  if (upcomingDeadlines.length >= 3) {
    scores.pressure += 25
    signals.push({ type: 'imminent_deadlines', value: upcomingDeadlines.length, weight: 'high', mode: 'pressure' })
  }

  if (blockers.length >= 2) {
    scores.pressure += 20
    signals.push({ type: 'active_blockers', value: blockers.length, weight: 'high', mode: 'pressure' })
  }

  // ---- PLATEAU signals ----
  const stagnantObjectives = objectives.filter(obj => {
    const progress = obj.progressPercent || 0
    const daysSinceActivity = (now.getTime() - new Date(obj.lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    return progress < 50 && daysSinceActivity > 7
  })
  if (stagnantObjectives.length >= 2) {
    scores.plateau += 30
    signals.push({ type: 'stagnant_objectives', value: stagnantObjectives.length, weight: 'high', mode: 'plateau' })
  } else if (stagnantObjectives.length >= 1) {
    scores.plateau += 15
    signals.push({ type: 'stagnant_objectives', value: stagnantObjectives.length, weight: 'medium', mode: 'plateau' })
  }

  const noHighPriorityWork = urgentTasks.length === 0 && overdueTasks.length < 2
  if (noHighPriorityWork && objectives.length > 0 && stagnantObjectives.length > 0) {
    scores.plateau += 20
    signals.push({ type: 'no_urgency_but_stagnant', value: 'objectives not moving', weight: 'medium', mode: 'plateau' })
  }

  // ---- MOMENTUM signals ----
  const movingObjectives = objectives.filter(obj => {
    const progress = obj.progressPercent || 0
    const daysSinceActivity = (now.getTime() - new Date(obj.lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    return progress > 20 && daysSinceActivity <= 7
  })
  if (movingObjectives.length >= 2) {
    scores.momentum += 30
    signals.push({ type: 'moving_objectives', value: movingObjectives.length, weight: 'high', mode: 'momentum' })
  }

  const priorityTasks = tasks.filter(t => t.priority <= 2)
  if (priorityTasks.length >= 3 && overdueTasks.length === 0) {
    scores.momentum += 20
    signals.push({ type: 'clear_priorities_no_overdue', value: priorityTasks.length, weight: 'medium', mode: 'momentum' })
  }

  if (blockers.length === 0 && objectives.length > 0) {
    scores.momentum += 15
    signals.push({ type: 'no_blockers', value: 'clean execution', weight: 'medium', mode: 'momentum' })
  }

  // ---- DRIFT signals ----
  const lowUrgency = urgentTasks.length === 0 && overdueTasks.length === 0
  const fewActivePriorities = priorityTasks.length <= 2
  const noMovingObjectives = movingObjectives.length === 0
  
  if (lowUrgency && fewActivePriorities && objectives.length > 0) {
    scores.drift += 25
    signals.push({ type: 'low_urgency_low_priority', value: 'no pressure or momentum', weight: 'medium', mode: 'drift' })
  }

  if (noMovingObjectives && objectives.length > 0 && stagnantObjectives.length === 0 && overdueTasks.length === 0) {
    scores.drift += 20
    signals.push({ type: 'no_objective_movement', value: 'objectives idle', weight: 'medium', mode: 'drift' })
  }

  // Default boost if nothing else is firing
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)
  if (totalScore < 20) {
    scores.momentum += 20 // Default to momentum if no strong signals
  }

  // Find winning mode
  const suggestedMode = (Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]) as OperatingMode
  const maxScore = scores[suggestedMode]
  const confidence = Math.min(Math.round((maxScore / Math.max(totalScore + 20, 1)) * 100), 95)

  const reasoningMap: Record<OperatingMode, string> = {
    pressure: `${overdueTasks.length} overdue tasks, ${blockers.length} active blockers, ${upcomingDeadlines.length} imminent deadlines.`,
    plateau: `${stagnantObjectives.length} objectives stagnant for 7+ days with low forward movement.`,
    momentum: `${movingObjectives.length} objectives moving, priorities clear, no major blockers.`,
    drift: `Low urgency, few priorities active, objectives not moving — energy may have softened.`,
  }

  return {
    suggestedMode,
    confidence,
    signals,
    reasoning: reasoningMap[suggestedMode],
  }
}

export const MODE_META: Record<OperatingMode, {
  label: string
  description: string
  suggestedShift: string
  colour: string
  bgColour: string
  borderColour: string
  icon: string
  managerRole: string
}> = {
  pressure: {
    label: 'Pressure',
    description: 'High urgency. Too many open loops, rising deadlines, or active blockers.',
    suggestedShift: 'Cut to one cash priority and defer everything ornamental.',
    colour: '#DC2626',
    bgColour: '#FEF2F2',
    borderColour: '#FECACA',
    icon: '🔴',
    managerRole: 'triage manager',
  },
  plateau: {
    label: 'Plateau',
    description: 'Business is stable but growth is flat. Progress has stalled.',
    suggestedShift: 'Pick one bottleneck and run a 14-day push against it.',
    colour: '#D97706',
    bgColour: '#FFFBEB',
    borderColour: '#FDE68A',
    icon: '🟡',
    managerRole: 'focus manager',
  },
  momentum: {
    label: 'Momentum',
    description: 'Things are moving. Execution is healthy. Protect the flow.',
    suggestedShift: 'Protect the current winning sequence and don\'t add chaos.',
    colour: '#059669',
    bgColour: '#ECFDF5',
    borderColour: '#A7F3D0',
    icon: '🟢',
    managerRole: 'performance manager',
  },
  drift: {
    label: 'Drift',
    description: 'Business is fine, but ambition or urgency has softened.',
    suggestedShift: 'Choose one neglected strategic bet and move it this week.',
    colour: '#7C3AED',
    bgColour: '#F5F3FF',
    borderColour: '#DDD6FE',
    icon: '🟣',
    managerRole: 're-engagement manager',
  },
}
