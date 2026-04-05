'use client'

import { useState, useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { FaSearch, FaTimes } from 'react-icons/fa'

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

interface BacklogSectionProps {
  tasks: Task[]
  onMarkComplete: (taskId: string) => void
  workspaceId: string
}

type SortOption = 'priority' | 'created' | 'effort'
type PriorityFilter = 'all' | 1 | 2 | 3 | 4

const PRIORITY_LABELS: Record<number, string> = { 1: 'CRITICAL', 2: 'HIGH PRIORITY', 3: 'MEDIUM', 4: 'LOW' }
const PRIORITY_DOT: Record<number, string> = {
  1: 'bg-[#EF4444]',
  2: 'bg-[#F59E0B]',
  3: 'bg-[#A3A3A3]',
  4: 'bg-[#D4D4D4]',
}

function BacklogRow({
  task,
  onMarkComplete,
}: {
  task: Task
  onMarkComplete: (id: string) => void
}) {
  const [completing, setCompleting] = useState(false)
  const context = task.project?.name || task.space?.name

  const handleComplete = async () => {
    setCompleting(true)
    onMarkComplete(task.id)
  }

  return (
    <div className="group flex items-start gap-3 py-3.5 px-4 border-b border-[#F3F3F3] hover:bg-[#F9F9F9] transition-colors cursor-default">
      {/* Complete button */}
      <button
        onClick={handleComplete}
        disabled={completing}
        className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full border border-[#D4D4D4] hover:border-[#1A1A1A] hover:bg-[#1A1A1A] transition-all opacity-0 group-hover:opacity-100"
        aria-label="Mark complete"
      />

      <div className="flex-1 min-w-0">
        {/* Priority + context row */}
        <div className="flex items-center gap-1.5 mb-1">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority] || PRIORITY_DOT[4]}`} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">
            {PRIORITY_LABELS[task.priority] || 'NORMAL'}
          </span>
        </div>

        {/* Title */}
        <p className="text-[13px] font-medium text-[#1A1A1A] leading-snug mb-1">
          {task.title}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-2 flex-wrap">
          {context && (
            <span className="text-[11px] text-[#A3A3A3]">{context}</span>
          )}
          {task.effortPoints && (
            <span className="text-[11px] text-[#C6C6C6]">Est. {task.effortPoints}h</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BacklogSection({ tasks, onMarkComplete }: BacklogSectionProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'backlog' })

  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('priority')

  const filteredTasks = useMemo(() => {
    let filtered = tasks

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        t =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.project?.name.toLowerCase().includes(q) ||
          t.space?.name.toLowerCase().includes(q)
      )
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === priorityFilter)
    }

    const sorted = [...filtered]
    if (sortBy === 'priority') sorted.sort((a, b) => a.priority - b.priority)
    if (sortBy === 'effort') sorted.sort((a, b) => (b.effortPoints || 0) - (a.effortPoints || 0))

    return sorted
  }, [tasks, searchQuery, priorityFilter, sortBy])

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full bg-white border rounded overflow-hidden transition-all ${
        isOver ? 'ring-2 ring-[#1A1A1A]/20 border-[#1A1A1A]' : 'border-[#E5E5E5]'
      }`}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[#1A1A1A]">Backlog</h3>
          <span className="text-[11px] font-semibold bg-[#1A1A1A] text-white px-2 py-0.5 rounded-full">
            {tasks.length} Total
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[#C6C6C6]" />
          <input
            type="text"
            placeholder="Filter backlog tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-2 text-[12px] bg-[#F9F9F9] border border-[#E5E5E5] rounded focus:outline-none focus:border-[#1A1A1A] text-[#1A1A1A] placeholder:text-[#C6C6C6]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C6C6C6] hover:text-[#474747]"
            >
              <FaTimes className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Priority filter pills */}
      <div className="px-4 pb-3 flex items-center gap-1.5">
        {(['all', 1, 2, 3, 4] as PriorityFilter[]).map(p => (
          <button
            key={p}
            onClick={() => setPriorityFilter(p)}
            className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] rounded transition-colors ${
              priorityFilter === p
                ? 'bg-[#1A1A1A] text-white'
                : 'bg-[#F3F3F3] text-[#474747] hover:bg-[#E5E5E5]'
            }`}
          >
            {p === 'all' ? 'All' : p === 1 ? 'Critical' : p === 2 ? 'High' : p === 3 ? 'Med' : 'Low'}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-[#F3F3F3]" />

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        <SortableContext items={filteredTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <p className="text-[12px] text-[#C6C6C6]">
                {tasks.length === 0 ? 'All tasks are planned!' : 'No tasks match your filters'}
              </p>
            </div>
          ) : (
            filteredTasks.map(task => (
              <BacklogRow key={task.id} task={task} onMarkComplete={onMarkComplete} />
            ))
          )}
        </SortableContext>

        {/* Create backlog item CTA */}
        <div className="px-4 py-4 border-t border-dashed border-[#E5E5E5] mt-2">
          <button className="w-full flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] hover:text-[#1A1A1A] transition-colors py-2">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create Backlog Item
          </button>
        </div>
      </div>
    </div>
  )
}
