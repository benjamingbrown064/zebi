'use client'

import { format, isToday } from 'date-fns'
import { useDroppable } from '@dnd-kit/core'
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
  ownerAgent?: string | null
  botAssignee?: string | null
  assigneeId?: string | null
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
        isOver ? 'border-[#1A1A1A]/40 shadow-lg' : 'border-[#E5E5E5]'
      } ${
        isCurrentDay ? 'bg-[#1A1A1A]' : 'bg-white'
      }`}
    >
      {/* ── Column header — compact, matches board column headers ── */}
      <div className={`px-4 py-4 flex-shrink-0 ${isCurrentDay ? '' : ''}`}>
        {/* Day + date + task count — same pattern as board */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold uppercase tracking-[0.1em] ${
              isCurrentDay ? 'text-white/60' : 'text-[#A3A3A3]'
            }`}>
              {format(date, 'EEE d MMM')}
            </span>
            {isCurrentDay && (
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] bg-white text-[#1A1A1A] px-2 py-0.5 rounded-full">
                Today
              </span>
            )}
          </div>
          <span className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full border ${
            isCurrentDay
              ? 'border-white/30 text-white/70'
              : 'border-[#E5E5E5] text-[#1A1A1A]'
          }`}>
            {tasks.length}
          </span>
        </div>

        {/* Capacity bar */}
        <DayCapacityMeter
          totalHours={capacity.totalHours}
          capacity={capacity.capacity}
          percent={capacity.percent}
        />
      </div>

      {/* Divider */}
      <div className={isCurrentDay ? 'border-t border-white/10' : 'border-t border-[#E5E5E5]'} />

      {/* Tasks — scrolls, cards match board tiles */}
      <div className={`flex-1 p-3 space-y-3 overflow-y-auto ${
        isCurrentDay ? '' : 'bg-[#F9F9F9]'
      }`}>
        {tasks.length === 0 ? (
          <div className={`flex items-center justify-center h-24 rounded border-2 border-dashed text-[12px] ${
            isCurrentDay
              ? 'border-white/15 text-white/30'
              : 'border-[#E5E5E5] text-[#C6C6C6]'
          }`}>
            Drop tasks here
          </div>
        ) : (
          tasks.map(task => (
            <PlannerTaskCard
              key={task.id}
              task={task as any}
              onMarkComplete={onMarkComplete}
              inverted={isCurrentDay}
            />
          ))
        )}
      </div>
    </div>
  )
}
