'use client'

import { format, isToday } from 'date-fns'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import PlannerTaskCard from './PlannerTaskCard'
import DayCapacityMeter from './DayCapacityMeter'

interface Task {
  id: string
  title: string
  description?: string | null
  priority: number
  effortPoints?: number | null
  status: { id: string; name: string; type: string }
  project?: { id: string; name: string } | null
  space?: { id: string; name: string } | null
}

interface DayColumnProps {
  date: Date
  tasks: Task[]
  capacity: { totalHours: number; percent: number; capacity: number }
  onMarkComplete: (taskId: string) => void
}

export default function DayColumn({ date, tasks, capacity, onMarkComplete }: DayColumnProps) {
  const dateKey = format(date, 'yyyy-MM-dd')
  const { setNodeRef, isOver } = useDroppable({ id: dateKey })
  const isCurrentDay = isToday(date)

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full overflow-hidden rounded border transition-all ${
        isOver ? 'border-[#1A1A1A]/30 shadow-md' : 'border-[#E5E5E5]'
      } ${
        isCurrentDay ? 'bg-[#1A1A1A]' : 'bg-white'
      }`}
    >
      {/* Day header */}
      <div className={`px-5 py-5 ${isCurrentDay ? 'bg-[#1A1A1A]' : 'bg-white'}`}>
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className={`text-[11px] font-semibold uppercase tracking-[0.08em] mb-1 ${
              isCurrentDay ? 'text-white/50' : 'text-[#A3A3A3]'
            }`}>
              {format(date, 'EEE')}
            </div>
            <div className={`text-[32px] font-bold leading-none ${
              isCurrentDay ? 'text-white' : 'text-[#1A1A1A]'
            }`}>
              {format(date, 'd')}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${
              isCurrentDay ? 'text-white/40' : 'text-[#C6C6C6]'
            }`}>
              Capacity
            </div>
            <div className={`text-[13px] font-semibold ${
              isCurrentDay ? 'text-white/70' : 'text-[#474747]'
            }`}>
              {capacity.totalHours}h / {capacity.capacity}h
            </div>
          </div>
        </div>

        <DayCapacityMeter
          totalHours={capacity.totalHours}
          capacity={capacity.capacity}
          percent={capacity.percent}
        />

        {tasks.length > 0 && (
          <div className={`flex items-center gap-1.5 mt-3 text-[11px] ${
            isCurrentDay ? 'text-white/50' : 'text-[#A3A3A3]'
          }`}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {tasks.length} Active Task{tasks.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className={isCurrentDay ? 'border-t border-white/10' : 'border-t border-[#F3F3F3]'} />

      {/* Tasks list — scrolls independently, header stays fixed */}
      <div className={`flex-1 p-4 space-y-2 overflow-y-auto ${
        isCurrentDay ? 'bg-[#1A1A1A]' : 'bg-[#F9F9F9]'
      }`}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className={`flex items-center justify-center h-24 rounded border-2 border-dashed text-[12px] ${
              isCurrentDay
                ? 'border-white/10 text-white/25'
                : 'border-[#E5E5E5] text-[#C6C6C6]'
            }`}>
              Drop tasks here
            </div>
          ) : (
            tasks.map(task => (
              <PlannerTaskCard
                key={task.id}
                task={task}
                onMarkComplete={onMarkComplete}
                inverted={isCurrentDay}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  )
}
