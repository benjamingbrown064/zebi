'use client'

import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import PlannerTaskCard from './PlannerTaskCard'
import { FaInbox } from 'react-icons/fa'

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
  company?: {
    id: string
    name: string
  } | null
}

interface BacklogSectionProps {
  tasks: Task[]
  onMarkComplete: (taskId: string) => void
}

export default function BacklogSection({
  tasks,
  onMarkComplete,
}: BacklogSectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'backlog',
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full bg-white border rounded-[14px] overflow-hidden transition-all ${
        isOver
          ? 'border-[#DD3A44] shadow-md'
          : 'border-[#E5E5E5]'
      }`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#E5E5E5] bg-[#FAFAFA]">
        <div className="flex items-center gap-2 mb-1">
          <FaInbox className="w-4 h-4 text-[#A3A3A3]" />
          <h3 className="text-base font-semibold text-[#1A1A1A]">
            Backlog
          </h3>
        </div>
        <p className="text-xs text-[#A3A3A3]">
          {tasks.length} unplanned task{tasks.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tasks list */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <FaInbox className="w-8 h-8 text-[#D4D4D4] mb-2" />
              <p className="text-sm text-[#A3A3A3]">
                All tasks are planned!
              </p>
            </div>
          ) : (
            tasks.map((task) => (
              <PlannerTaskCard
                key={task.id}
                task={task}
                onMarkComplete={onMarkComplete}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  )
}
