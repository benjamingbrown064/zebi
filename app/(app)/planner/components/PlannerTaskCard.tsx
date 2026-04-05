'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FaCheck, FaClock } from 'react-icons/fa'

interface Task {
  id: string
  title: string
  description?: string | null
  priority: number
  effortPoints?: number | null
  status: {
    id: string
    name: string
    type: string
  }
  project?: {
    id: string
    name: string
  } | null
  space?: {
    id: string
    name: string
  } | null
}

interface PlannerTaskCardProps {
  task: Task
  isDragging?: boolean
  onMarkComplete?: (taskId: string) => void
  inverted?: boolean // true when rendered inside the "today" black column
}

const PRIORITY_LABELS: Record<number, string> = {
  1: 'CRITICAL',
  2: 'HIGH',
  3: 'MEDIUM',
  4: 'LOW',
}

const PRIORITY_DOT: Record<number, string> = {
  1: 'bg-[#EF4444]',
  2: 'bg-[#F59E0B]',
  3: 'bg-[#A3A3A3]',
  4: 'bg-[#D4D4D4]',
}

export default function PlannerTaskCard({
  task,
  isDragging = false,
  onMarkComplete,
  inverted = false,
}: PlannerTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleMarkComplete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onMarkComplete?.(task.id)
  }

  const context = task.project?.name || task.space?.name

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative rounded p-3.5 cursor-grab active:cursor-grabbing transition-all select-none ${
        isSortableDragging || isDragging ? 'opacity-40' : ''
      } ${
        inverted
          ? 'bg-white/10 hover:bg-white/15 border border-white/20'
          : 'bg-white border border-[#E5E5E5] hover:border-[#C6C6C6] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Priority label */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority] || PRIORITY_DOT[4]}`} />
            <span className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${inverted ? 'text-white/50' : 'text-[#A3A3A3]'}`}>
              {PRIORITY_LABELS[task.priority] || 'NORMAL'}
            </span>
          </div>

          {/* Title */}
          <p className={`text-[13px] font-medium leading-snug mb-2 ${inverted ? 'text-white' : 'text-[#1A1A1A]'}`}>
            {task.title}
          </p>

          {/* Meta row */}
          <div className={`flex items-center gap-2 flex-wrap ${inverted ? 'text-white/50' : 'text-[#A3A3A3]'}`}>
            {context && (
              <span className={`text-[11px] px-2 py-0.5 rounded ${inverted ? 'bg-white/10' : 'bg-[#F3F3F3]'}`}>
                {context}
              </span>
            )}
            {task.effortPoints && (
              <span className="text-[11px] flex items-center gap-1">
                <FaClock className="w-2.5 h-2.5" />
                {task.effortPoints}h
              </span>
            )}
          </div>
        </div>

        {/* Complete button */}
        {onMarkComplete && (
          <button
            onClick={handleMarkComplete}
            onPointerDown={(e) => e.stopPropagation()} // prevent drag start
            className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 ${
              inverted
                ? 'border-white/40 hover:border-white hover:bg-white hover:text-[#1A1A1A]'
                : 'border-[#D4D4D4] hover:border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white'
            }`}
            aria-label="Mark complete"
          >
            <FaCheck className="w-2 h-2" />
          </button>
        )}
      </div>
    </div>
  )
}
