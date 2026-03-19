'use client'

import { useState, useMemo } from 'react'
import { Task } from '@/app/actions/tasks'
import { FaChevronUp, FaChevronDown, FaCheck } from 'react-icons/fa'

interface TasksTableProps {
  tasks: (Task & { 
    goal?: { id: string; name: string }
    company?: { id: string; name: string }
    project?: { id: string; name: string }
    objective?: { id: string; title: string }
  })[]
  onTaskClick?: (task: Task) => void
  onComplete?: (taskId: string) => void
  sortBy?: 'dueDate' | 'priority' | 'status' | 'updated' | 'created'
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  statuses?: Array<{ id: string; name: string; type: string }>
}

const PRIORITY_LABELS: Record<number, string> = {
  1: 'P1 - Urgent',
  2: 'P2 - High',
  3: 'P3 - Medium',
  4: 'P4 - Low',
}

const PRIORITY_COLORS: Record<number, string> = {
  1: 'text-red-600',
  2: 'text-orange-600',
  3: 'text-yellow-600',
  4: 'text-[#5a5757]',
}

export default function TasksTable({
  tasks,
  onTaskClick,
  onComplete,
  sortBy = 'dueDate',
  sortOrder = 'asc',
  onSortChange,
  statuses = [],
}: TasksTableProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())

  // Helper to get status name from ID
  const getStatusName = (statusId: string): string => {
    const status = statuses.find(s => s.id === statusId)
    return status?.name || statusId.slice(0, 8) || '—'
  }

  // Helper to get status type for coloring
  const getStatusType = (statusId: string): string => {
    const status = statuses.find(s => s.id === statusId)
    return status?.type || ''
  }

  const STATUS_BADGE_COLORS: Record<string, string> = {
    inbox: 'bg-[#f0eded] text-[#5a5757]',
    planned: 'bg-[#e6f4f4] text-[#006766]',
    doing: 'bg-amber-100 text-amber-700',
    blocked: 'bg-red-100 text-red-700',
    done: 'bg-[#e6f4f4] text-[#006766]',
    check: 'bg-purple-100 text-purple-700', // Match board lane color
  }

  const sortedTasks = useMemo(() => {
    const sorted = [...tasks]

    sorted.sort((a, b) => {
      let compareA: any = a[sortBy as keyof Task]
      let compareB: any = b[sortBy as keyof Task]

      // Handle null values
      if (compareA === null || compareA === undefined) {
        return sortOrder === 'asc' ? 1 : -1
      }
      if (compareB === null || compareB === undefined) {
        return sortOrder === 'asc' ? -1 : 1
      }

      // Date comparison
      if (sortBy === 'dueDate' && a.dueAt && b.dueAt) {
        compareA = new Date(a.dueAt).getTime()
        compareB = new Date(b.dueAt).getTime()
      }

      // String comparison
      if (typeof compareA === 'string') {
        compareA = compareA.toLowerCase()
        compareB = (compareB as string).toLowerCase()
        return sortOrder === 'asc'
          ? compareA.localeCompare(compareB)
          : compareB.localeCompare(compareA)
      }

      // Number comparison
      return sortOrder === 'asc' ? compareA - compareB : compareB - compareA
    })

    return sorted
  }, [tasks, sortBy, sortOrder])

  const handleSort = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      // Toggle order
      onSortChange?.(newSortBy, sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // New sort, default ascending
      onSortChange?.(newSortBy, 'asc')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(new Set(tasks.map(t => t.id)))
    } else {
      setSelectedTasks(new Set())
    }
  }

  const handleSelectTask = (taskId: string, checked: boolean) => {
    const newSelected = new Set(selectedTasks)
    if (checked) {
      newSelected.add(taskId)
    } else {
      newSelected.delete(taskId)
    }
    setSelectedTasks(newSelected)
  }

  const formatDueDate = (date: string | undefined) => {
    if (!date) return '—'

    const d = new Date(date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'

    const daysUntil = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntil > 0 && daysUntil <= 7) {
      return d.toLocaleDateString('en-US', { weekday: 'short' })
    }

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: string }) => (
    <button
      onClick={() => handleSort(sortKey)}
      className="flex items-center gap-1 text-left hover:text-accent-600 transition"
    >
      {label}
      {sortBy === sortKey && (
        <>
          {sortOrder === 'asc' ? (
            <FaChevronUp className="w-3 h-3" />
          ) : (
            <FaChevronDown className="w-3 h-3" />
          )}
        </>
      )}
    </button>
  )

  return (
    <div className="w-full overflow-x-auto rounded-[10px]">
      <table className="w-full">
        {/* Header */}
        <thead className="bg-[#f6f3f2] sticky top-0 z-10">
          <tr>
            <th className="px-4 py-3 text-left w-12">
              <input
                type="checkbox"
                checked={selectedTasks.size === tasks.length && tasks.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-gray-300"
              />
            </th>
            <th className="px-4 py-3 text-left font-semibold text-[#1c1b1b] text-sm">
              <SortHeader label="Title" sortKey="title" />
            </th>
            <th className="px-4 py-3 text-left font-semibold text-[#1c1b1b] text-sm whitespace-nowrap">
              <SortHeader label="Status" sortKey="statusId" />
            </th>
            <th className="px-4 py-3 text-left font-semibold text-[#1c1b1b] text-sm whitespace-nowrap">
              <SortHeader label="Priority" sortKey="priority" />
            </th>
            <th className="px-4 py-3 text-left font-semibold text-[#1c1b1b] text-sm whitespace-nowrap">
              Company
            </th>
            <th className="px-4 py-3 text-left font-semibold text-[#1c1b1b] text-sm whitespace-nowrap">
              Project
            </th>
            <th className="px-4 py-3 text-left font-semibold text-[#1c1b1b] text-sm whitespace-nowrap">
              Objective
            </th>
            <th className="px-4 py-3 text-left font-semibold text-[#1c1b1b] text-sm whitespace-nowrap">
              Goal
            </th>
            <th className="px-4 py-3 text-left font-semibold text-[#1c1b1b] text-sm whitespace-nowrap">
              <SortHeader label="Due Date" sortKey="dueAt" />
            </th>
            <th className="px-4 py-3 text-left font-semibold text-[#1c1b1b] text-sm whitespace-nowrap">
              Updated
            </th>
            <th className="px-4 py-3 text-right font-semibold text-[#1c1b1b] text-sm">
              Actions
            </th>
          </tr>
        </thead>

        {/* Body */}
        <tbody className="bg-white">
          {sortedTasks.length === 0 ? (
            <tr>
              <td colSpan={11} className="px-4 py-12 text-center text-[#A3A3A3] text-sm">
                No tasks
              </td>
            </tr>
          ) : (
            sortedTasks.map((task) => (
              <tr
                key={task.id}
                className="border-b border-gray-100 hover:bg-[#f6f3f2] transition"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedTasks.has(task.id)}
                    onChange={(e) => handleSelectTask(task.id, e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </td>
                <td
                  className="px-4 py-3 text-sm font-medium text-[#1c1b1b] cursor-pointer hover:text-accent-600"
                  onClick={() => onTaskClick?.(task)}
                >
                  <div className="truncate max-w-xs" title={task.title}>
                    {task.title}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-[#5a5757] whitespace-nowrap">
                  <span className={`text-xs px-2 py-1 rounded font-medium ${STATUS_BADGE_COLORS[getStatusType(task.statusId)] || 'bg-[#f0eded] text-[#5a5757]'}`}>
                    {getStatusName(task.statusId)}
                  </span>
                </td>
                <td
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${PRIORITY_COLORS[task.priority]}`}
                >
                  {PRIORITY_LABELS[task.priority]}
                </td>
                <td className="px-4 py-3 text-sm text-[#5a5757] whitespace-nowrap">
                  {task.company ? (
                    <span className="truncate max-w-[150px] block" title={task.company.name}>
                      {task.company.name}
                    </span>
                  ) : (
                    <span className="text-[#C4C0C0]">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-[#5a5757] whitespace-nowrap">
                  {task.project ? (
                    <span className="truncate max-w-[150px] block" title={task.project.name}>
                      {task.project.name}
                    </span>
                  ) : (
                    <span className="text-[#C4C0C0]">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-[#5a5757] whitespace-nowrap">
                  {task.objective ? (
                    <span className="truncate max-w-[150px] block" title={task.objective.title}>
                      {task.objective.title}
                    </span>
                  ) : (
                    <span className="text-[#C4C0C0]">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-[#5a5757] whitespace-nowrap">
                  {task.goal ? (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium text-xs">
                      {task.goal.name}
                    </span>
                  ) : (
                    <span className="text-[#C4C0C0]">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-[#5a5757] whitespace-nowrap">
                  {formatDueDate(task.dueAt?.toString())}
                </td>
                <td className="px-4 py-3 text-sm text-[#A3A3A3] whitespace-nowrap">
                  {task.updatedAt
                    ? new Date(task.updatedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onComplete?.(task.id)}
                    className="p-2 text-[#A3A3A3] hover:text-accent-600 hover:bg-accent-50 rounded transition"
                    title="Complete task"
                  >
                    <FaCheck className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Summary */}
      {selectedTasks.size > 0 && (
        <div className="bg-[#f0fafa] border-t border-transparent px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-blue-900">
            {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-sm bg-white text-[#5a5757] rounded hover:bg-[#f6f3f2]">
              Change Status
            </button>
            <button className="px-3 py-1 text-sm bg-white text-[#5a5757] rounded hover:bg-[#f6f3f2]">
              Change Priority
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
