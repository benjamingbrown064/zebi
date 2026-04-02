'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FaGripVertical, FaCheck, FaClock } from 'react-icons/fa'

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
}

export default function PlannerTaskCard({
  task,
  isDragging = false,
  onMarkComplete,
}: PlannerTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const getPriorityColor = (priority: number) => {
    if (priority === 1) return 'border-l-[#EF4444]' // High
    if (priority === 2) return 'border-l-[#F59E0B]' // Medium
    return 'border-l-[#A3A3A3]' // Low
  }

  const handleMarkComplete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onMarkComplete) {
      onMarkComplete(task.id)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-white border border-[#E5E5E5] rounded p-3 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing border-l-4 ${getPriorityColor(
        task.priority
      )} ${isSortableDragging || isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 p-1 text-[#A3A3A3] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          aria-label="Drag task"
        >
          <FaGripVertical className="w-3 h-3" />
        </button>

        {/* Task content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-[#1A1A1A] line-clamp-2 mb-1">
            {task.title}
          </h4>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#A3A3A3]">
            {task.project && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F3F3F3] rounded-md">
                {task.project.name}
              </span>
            )}
            {task.space && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F3F3F3] rounded-md">
                {task.space.name}
              </span>
            )}
            {task.effortPoints && (
              <span className="inline-flex items-center gap-1">
                <FaClock className="w-3 h-3" />
                {task.effortPoints}h
              </span>
            )}
          </div>
        </div>

        {/* Complete button */}
        {onMarkComplete && (
          <button
            onClick={handleMarkComplete}
            className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-[#D4D4D4] hover:border-[#10B981] hover:bg-[#10B981] hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
            aria-label="Mark complete"
          >
            <FaCheck className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  )
}
