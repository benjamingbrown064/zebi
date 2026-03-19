'use client'

import { useState } from 'react'
import { FaSearch, FaTimes, FaFilter } from 'react-icons/fa'

interface TasksTableToolbarProps {
  searchQuery?: string
  onSearchChange?: (query: string) => void
  selectedPriorities?: number[]
  onPriorityChange?: (priorities: number[]) => void
  selectedStatuses?: string[]
  onStatusChange?: (statuses: string[]) => void
  onClearFilters?: () => void
  statuses?: Array<{ id: string; name: string }>
}

const PRIORITY_OPTIONS = [
  { num: 1, label: 'P1 - Urgent' },
  { num: 2, label: 'P2 - High' },
  { num: 3, label: 'P3 - Medium' },
  { num: 4, label: 'P4 - Low' },
]

export default function TasksTableToolbar({
  searchQuery = '',
  onSearchChange,
  selectedPriorities = [],
  onPriorityChange,
  selectedStatuses = [],
  onStatusChange,
  onClearFilters,
  statuses = [],
}: TasksTableToolbarProps) {
  const [showFilters, setShowFilters] = useState(false)

  const hasActiveFilters = searchQuery || selectedPriorities.length > 0 || selectedStatuses.length > 0

  const handlePriorityToggle = (priority: number) => {
    const newPriorities = selectedPriorities.includes(priority)
      ? selectedPriorities.filter(p => p !== priority)
      : [...selectedPriorities, priority]
    onPriorityChange?.(newPriorities)
  }

  const handleStatusToggle = (statusId: string) => {
    const newStatuses = selectedStatuses.includes(statusId)
      ? selectedStatuses.filter(s => s !== statusId)
      : [...selectedStatuses, statusId]
    onStatusChange?.(newStatuses)
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <FaSearch className="absolute left-4 top-3.5 text-[#C4C0C0] w-4 h-4" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search tasks..."
          className="w-full pl-10 pr-4 py-3 rounded-[10px] focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      </div>

      {/* Filter Toggle & Clear */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 rounded-[10px] border transition flex items-center gap-2 ${
            showFilters
              ? 'bg-accent-50 border-accent-200 text-accent-700'
              : 'bg-white border-gray-200 text-[#5a5757] hover:bg-[#f6f3f2]'
          }`}
        >
          <FaFilter className="w-4 h-4" />
          Filters
        </button>

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2 rounded-[10px] bg-white text-[#5a5757] hover:bg-[#f6f3f2] transition flex items-center gap-2"
          >
            <FaTimes className="w-4 h-4" />
            Clear filters
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="p-4 bg-[#f6f3f2] rounded-[10px] space-y-4">
          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-[#1c1b1b] mb-2">
              Priority
            </label>
            <div className="space-y-2">
              {PRIORITY_OPTIONS.map((p) => (
                <label key={p.num} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPriorities.includes(p.num)}
                    onChange={() => handlePriorityToggle(p.num)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-[#5a5757]">{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          {statuses.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[#1c1b1b] mb-2">
                Status
              </label>
              <div className="space-y-2">
                {statuses.map((status) => (
                  <label key={status.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(status.id)}
                      onChange={() => handleStatusToggle(status.id)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-[#5a5757]">{status.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Due Date Range (simplified) */}
          <div>
            <label className="block text-sm font-medium text-[#1c1b1b] mb-2">
              Due Date
            </label>
            <div className="space-y-2">
              {['Overdue', 'Today', 'Next 7 days', 'This month'].map((label) => (
                <label key={label} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled
                    className="rounded border-gray-300 opacity-50"
                  />
                  <span className="text-sm text-[#A3A3A3]">{label}</span>
                  <span className="text-xs text-[#C4C0C0]">(coming soon)</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
