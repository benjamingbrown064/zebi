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
  selectedTaskTypes?: string[]
  onTaskTypeChange?: (types: string[]) => void
  selectedAgents?: string[]
  onAgentChange?: (agents: string[]) => void
  selectedDueDateRange?: string | null
  onDueDateRangeChange?: (range: string | null) => void
  selectedWaitingOn?: string[]
  onWaitingOnChange?: (vals: string[]) => void
  decisionNeededFilter?: boolean | null
  onDecisionNeededChange?: (val: boolean | null) => void
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
  selectedTaskTypes = [],
  onTaskTypeChange,
  selectedAgents = [],
  onAgentChange,
  selectedDueDateRange = null,
  onDueDateRangeChange,
  selectedWaitingOn = [],
  onWaitingOnChange,
  decisionNeededFilter = null,
  onDecisionNeededChange,
  onClearFilters,
  statuses = [],
}: TasksTableToolbarProps) {
  const [showFilters, setShowFilters] = useState(false)

  const hasActiveFilters = searchQuery || selectedPriorities.length > 0 || selectedStatuses.length > 0 ||
    selectedTaskTypes.length > 0 || selectedAgents.length > 0 || selectedDueDateRange !== null ||
    selectedWaitingOn.length > 0 || decisionNeededFilter !== null

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

  const handleTaskTypeToggle = (type: string) => {
    const newTypes = selectedTaskTypes.includes(type)
      ? selectedTaskTypes.filter(t => t !== type)
      : [...selectedTaskTypes, type]
    onTaskTypeChange?.(newTypes)
  }

  const handleAgentToggle = (agent: string) => {
    const newAgents = selectedAgents.includes(agent)
      ? selectedAgents.filter(a => a !== agent)
      : [...selectedAgents, agent]
    onAgentChange?.(newAgents)
  }

  const handleWaitingOnToggle = (val: string) => {
    const newVals = selectedWaitingOn.includes(val)
      ? selectedWaitingOn.filter(w => w !== val)
      : [...selectedWaitingOn, val]
    onWaitingOnChange?.(newVals)
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
          className="w-full pl-10 pr-4 py-3 rounded focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      </div>

      {/* Filter Toggle & Clear */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 rounded border transition flex items-center gap-2 ${
            showFilters
              ? 'bg-[#F3F3F3] border-[#C6C6C6] text-[#1A1A1A]'
              : 'bg-white border-gray-200 text-[#474747] hover:bg-[#F3F3F3]'
          }`}
        >
          <FaFilter className="w-4 h-4" />
          Filters
        </button>

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2 rounded bg-white text-[#474747] hover:bg-[#F3F3F3] transition flex items-center gap-2"
          >
            <FaTimes className="w-4 h-4" />
            Clear filters
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="p-4 bg-[#F3F3F3] rounded space-y-4">
          {/* Priority Filter */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2 block">
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
                  <span className="text-sm text-[#474747]">{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          {statuses.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2 block">
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
                    <span className="text-sm text-[#474747]">{status.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Task Type Filter */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2 block">
              Task Type
            </label>
            <div className="space-y-2">
              {['strategy', 'research', 'build', 'ops', 'routine', 'admin', 'review', 'bug', 'briefing'].map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTaskTypes.includes(type)}
                    onChange={() => handleTaskTypeToggle(type)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-[#474747] capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Assigned Agent Filter */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2 block">
              Assigned Agent
            </label>
            <div className="space-y-2">
              {['harvey', 'theo', 'doug', 'casper', 'unassigned'].map((agent) => (
                <label key={agent} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAgents.includes(agent)}
                    onChange={() => handleAgentToggle(agent)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-[#474747] capitalize">{agent}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Due Date Range */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2 block">
              Due Date
            </label>
            <div className="space-y-2">
              {['Overdue', 'Today', 'This week', 'This month', 'No due date'].map((range) => (
                <label key={range} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dueDate"
                    checked={selectedDueDateRange === range}
                    onChange={() => onDueDateRangeChange?.(selectedDueDateRange === range ? null : range)}
                    className="rounded-full border-gray-300"
                  />
                  <span className="text-sm text-[#474747]">{range}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Waiting On Filter */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2 block">
              Waiting On
            </label>
            <div className="space-y-2">
              {['ben', 'harvey', 'theo', 'doug', 'casper', 'external', 'none'].map((val) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedWaitingOn.includes(val)}
                    onChange={() => handleWaitingOnToggle(val)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-[#474747] capitalize">{val}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Decision Needed Filter */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2 block">
              Decision Needed
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={decisionNeededFilter === true}
                onChange={() => onDecisionNeededChange?.(decisionNeededFilter === true ? null : true)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-[#474747]">Show only tasks needing decisions</span>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
