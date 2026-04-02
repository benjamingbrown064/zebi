'use client'

import { format, isToday } from 'date-fns'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import PlannerTaskCard from './PlannerTaskCard'
import DayCapacityMeter from './DayCapacityMeter'

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

interface DayColumnProps {
  date: Date
  tasks: Task[]
  capacity: {
    totalHours: number
    percent: number
    capacity: number
  }
  onMarkComplete: (taskId: string) => void
}

export default function DayColumn({
  date,
  tasks,
  capacity,
  onMarkComplete,
}: DayColumnProps) {
  const dateKey = format(date, 'yyyy-MM-dd')
  const { setNodeRef, isOver } = useDroppable({
    id: dateKey,
  })

  const isCurrentDay = isToday(date)

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col bg-white border rounded overflow-hidden transition-all ${
        isOver
          ? 'border-[#DD3A44] shadow-[0_4px_12px_rgba(28,27,27,0.08)]'
          : 'border-[#E5E5E5]'
      } ${isCurrentDay ? 'ring-2 ring-[#DD3A44]/20' : ''}`}
    >
      {/* Day header */}
      <div className="px-4 py-3 bg-[#F9F9F9]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs font-medium text-[#A3A3A3] uppercase">
              {format(date, 'EEE')}
            </div>
            <div
              className={`text-lg font-semibold ${
                isCurrentDay ? 'text-[#DD3A44]' : 'text-[#1A1A1A]'
              }`}
            >
              {format(date, 'd')}
            </div>
          </div>
          <div className="text-xs text-[#A3A3A3]">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Capacity meter */}
        <DayCapacityMeter
          totalHours={capacity.totalHours}
          capacity={capacity.capacity}
          percent={capacity.percent}
        />
      </div>

      {/* Tasks list */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto min-h-[200px]">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-[#A3A3A3]">
              Drop tasks here
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
