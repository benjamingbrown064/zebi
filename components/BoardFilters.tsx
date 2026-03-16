'use client'

import { useState } from 'react'
import { FaFilter, FaTimes } from 'react-icons/fa'

export interface BoardFiltersState {
  goals: string[]
  priorities: number[]
  assignees: string[]
  dates: 'overdue' | 'today' | 'thisWeek' | 'all'
}

interface BoardFiltersProps {
  filters: BoardFiltersState
  onFiltersChange: (filters: BoardFiltersState) => void
  availableGoals: Array<{ id: string; name: string }>
  availableAssignees: Array<{ id: string; name: string }>
}

export default function BoardFilters({
  filters,
  onFiltersChange,
  availableGoals,
  availableAssignees,
}: BoardFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggleGoal = (goalId: string) => {
    const newGoals = filters.goals.includes(goalId)
      ? filters.goals.filter(g => g !== goalId)
      : [...filters.goals, goalId]
    onFiltersChange({ ...filters, goals: newGoals })
  }

  const handleTogglePriority = (priority: number) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority]
    onFiltersChange({ ...filters, priorities: newPriorities })
  }

  const handleToggleAssignee = (assigneeId: string) => {
    const newAssignees = filters.assignees.includes(assigneeId)
      ? filters.assignees.filter(a => a !== assigneeId)
      : [...filters.assignees, assigneeId]
    onFiltersChange({ ...filters, assignees: newAssignees })
  }

  const handleClearFilters = () => {
    onFiltersChange({
      goals: [],
      priorities: [],
      assignees: [],
      dates: 'all',
    })
  }

  const activeFilterCount =
    filters.goals.length +
    filters.priorities.length +
    filters.assignees.length +
    (filters.dates !== 'all' ? 1 : 0)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
      >
        <FaFilter size={14} />
        Filters
        {activeFilterCount > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-accent-500 text-white rounded text-xs font-semibold">
            {activeFilterCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-40 p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Filters</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <FaTimes size={16} />
            </button>
          </div>

          {/* Goals */}
          {availableGoals.length > 0 && (
            <div className="mb-4 pb-4 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-700 uppercase mb-2">Goals</p>
              <div className="space-y-2">
                {availableGoals.map(goal => (
                  <label key={goal.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.goals.includes(goal.id)}
                      onChange={() => handleToggleGoal(goal.id)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-gray-700">{goal.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Priority */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-700 uppercase mb-2">Priority</p>
            <div className="space-y-2">
              {[
                { num: 1, label: 'P1 - Urgent' },
                { num: 2, label: 'P2 - High' },
                { num: 3, label: 'P3 - Medium' },
                { num: 4, label: 'P4 - Low' },
              ].map(p => (
                <label key={p.num} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.priorities.includes(p.num)}
                    onChange={() => handleTogglePriority(p.num)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-700">{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Assignees */}
          {availableAssignees.length > 0 && (
            <div className="mb-4 pb-4 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-700 uppercase mb-2">Assigned to</p>
              <div className="space-y-2">
                {availableAssignees.map(assignee => (
                  <label key={assignee.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.assignees.includes(assignee.id)}
                      onChange={() => handleToggleAssignee(assignee.id)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-gray-700">{assignee.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Date */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-700 uppercase mb-2">Date</p>
            <div className="space-y-2">
              {[
                { value: 'overdue', label: 'Overdue' },
                { value: 'today', label: 'Today' },
                { value: 'thisWeek', label: 'This Week' },
                { value: 'all', label: 'All' },
              ].map(d => (
                <label key={d.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="date"
                    value={d.value}
                    checked={filters.dates === d.value}
                    onChange={() => onFiltersChange({ ...filters, dates: d.value as any })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-700">{d.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm font-medium mt-2"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
