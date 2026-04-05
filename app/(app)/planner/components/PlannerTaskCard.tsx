'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

interface Task {
  id: string
  title: string
  description?: string | null
  priority: number
  effortPoints?: number | null
  status: { id: string; name: string; type: string }
  project?: { id: string; name: string } | null
  space?: { id: string; name: string } | null
  ownerAgent?: string | null
  botAssignee?: string | null
  assigneeId?: string | null
}

interface PlannerTaskCardProps {
  task: Task
  isDragging?: boolean
  onMarkComplete?: (taskId: string) => void
  inverted?: boolean
}

const PRIORITY_LABEL: Record<number, string> = { 1: 'CRITICAL', 2: 'HIGH', 3: 'MEDIUM', 4: 'LOW' }
const PRIORITY_BADGE: Record<number, string> = {
  1: 'bg-[#1A1A1A] text-white',
  2: 'bg-[#474747] text-white',
  3: 'bg-[#F3F3F3] text-[#474747]',
  4: 'bg-[#F3F3F3] text-[#A3A3A3]',
}
const PRIORITY_BADGE_INVERTED: Record<number, string> = {
  1: 'bg-white text-[#1A1A1A]',
  2: 'bg-white/20 text-white',
  3: 'bg-white/10 text-white/60',
  4: 'bg-white/10 text-white/40',
}

const AGENT_COLOURS: Record<string, string> = {
  harvey: '#2563EB', theo: '#7C3AED', doug: '#059669', casper: '#D97706',
}
const AGENT_LABELS: Record<string, string> = {
  harvey: 'Harvey', theo: 'Theo', doug: 'Doug', casper: 'Casper',
}

export default function PlannerTaskCard({
  task,
  isDragging = false,
  onMarkComplete,
  inverted = false,
}: PlannerTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isActiveDragging } = useDraggable({
    id: task.id,
  })

  const style = transform ? { transform: CSS.Translate.toString(transform), zIndex: 999 } : undefined

  const handleMarkComplete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onMarkComplete?.(task.id)
  }

  // Context label — space takes priority, then project
  const contextLabel = task.space?.name || task.project?.name

  // Assignee — agent or human
  const agent = task.ownerAgent || task.botAssignee
  const agentLabel = agent ? (AGENT_LABELS[agent] || agent) : null
  const agentColour = agent ? (AGENT_COLOURS[agent] || '#737373') : null
  const agentInitial = agentLabel?.charAt(0).toUpperCase()

  const humanInitial = task.assigneeId
    ? task.assigneeId.charAt(0).toUpperCase()
    : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative rounded border cursor-grab active:cursor-grabbing select-none transition-all ${
        isActiveDragging || isDragging ? 'opacity-30 shadow-xl' : ''
      } ${
        inverted
          ? 'bg-white/10 border-white/15 hover:bg-white/15'
          : 'bg-white border-[#E5E5E5] hover:border-[#C6C6C6] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]'
      }`}
    >
      <div className="p-4">
        {/* Top row: label badge + complete button */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className={`text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded ${
            inverted ? PRIORITY_BADGE_INVERTED[task.priority] : PRIORITY_BADGE[task.priority]
          }`}>
            {contextLabel || PRIORITY_LABEL[task.priority] || 'TASK'}
          </span>

          {onMarkComplete && (
            <button
              onClick={handleMarkComplete}
              onPointerDown={e => e.stopPropagation()}
              className={`opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                inverted
                  ? 'border-white/40 hover:border-white hover:bg-white'
                  : 'border-[#D4D4D4] hover:border-[#1A1A1A] hover:bg-[#1A1A1A]'
              }`}
              aria-label="Mark complete"
            >
              <svg className={`w-2 h-2 ${inverted ? 'text-[#1A1A1A]' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Title */}
        <p className={`text-[14px] font-semibold leading-snug mb-4 ${
          inverted ? 'text-white' : 'text-[#1A1A1A]'
        }`}>
          {task.title}
        </p>

        {/* Bottom row: effort + assignee */}
        <div className="flex items-center justify-between gap-2">
          {/* Effort estimate */}
          {task.effortPoints ? (
            <div className={`flex items-center gap-1.5 text-[11px] ${inverted ? 'text-white/50' : 'text-[#A3A3A3]'}`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Est. {task.effortPoints}h
            </div>
          ) : (
            <div />
          )}

          {/* Assignee */}
          {agent ? (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ backgroundColor: agentColour! }}
              title={agentLabel!}
            >
              {agentInitial}
            </div>
          ) : humanInitial ? (
            <div
              className="w-6 h-6 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              title="Assigned"
            >
              {humanInitial}
            </div>
          ) : (
            <div
              className={`w-6 h-6 rounded-full border-2 border-dashed flex items-center justify-center flex-shrink-0 ${
                inverted ? 'border-white/20' : 'border-[#E5E5E5]'
              }`}
            />
          )}
        </div>
      </div>
    </div>
  )
}
