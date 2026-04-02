'use client'

import { useState, useEffect } from 'react'
import { FilterDefinition } from '@/app/actions/filters'
import { getStatuses, Status } from '@/app/actions/statuses'
import { FaTimes } from 'react-icons/fa'

interface FilterBuilderProps {
  definition?: FilterDefinition
  onChange: (def: FilterDefinition) => void
  workspaceId: string
}

const PRIORITY_OPTIONS = [
  { value: 1, label: 'P1 - Critical' },
  { value: 2, label: 'P2 - High' },
  { value: 3, label: 'P3 - Medium' },
  { value: 4, label: 'P4 - Low' },
]

export default function FilterBuilder({
  definition = {},
  onChange,
  workspaceId,
}: FilterBuilderProps) {
  const [statuses, setStatuses] = useState<Status[]>([])
  const [loading, setLoading] = useState(true)
  const [tagInput, setTagInput] = useState('')

  // Local state mirrors definition prop
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(definition.statuses || [])
  const [selectedPriorities, setSelectedPriorities] = useState<number[]>(definition.priorities || [])
  const [selectedTags, setSelectedTags] = useState<string[]>(definition.tags || [])
  const [dateFrom, setDateFrom] = useState<string>(definition.dueDateWindow?.from || '')
  const [dateTo, setDateTo] = useState<string>(definition.dueDateWindow?.to || '')

  // Load statuses
  useEffect(() => {
    async function loadStatuses() {
      if (!workspaceId) return
      try {
        const dbStatuses = await getStatuses(workspaceId)
        setStatuses(dbStatuses)
      } catch (err) {
        console.error('Failed to load statuses:', err)
      } finally {
        setLoading(false)
      }
    }
    loadStatuses()
  }, [workspaceId])

  // Sync with incoming definition prop
  useEffect(() => {
    setSelectedStatuses(definition.statuses || [])
    setSelectedPriorities(definition.priorities || [])
    setSelectedTags(definition.tags || [])
    setDateFrom(definition.dueDateWindow?.from || '')
    setDateTo(definition.dueDateWindow?.to || '')
  }, [definition])

  // Emit changes to parent
  const emitChange = (updates: Partial<{
    statuses: string[]
    priorities: number[]
    tags: string[]
    dateFrom: string
    dateTo: string
  }>) => {
    const newStatuses = updates.statuses ?? selectedStatuses
    const newPriorities = updates.priorities ?? selectedPriorities
    const newTags = updates.tags ?? selectedTags
    const newDateFrom = updates.dateFrom ?? dateFrom
    const newDateTo = updates.dateTo ?? dateTo

    const newDef: FilterDefinition = {}

    if (newStatuses.length > 0) {
      newDef.statuses = newStatuses
    }
    if (newPriorities.length > 0) {
      newDef.priorities = newPriorities
    }
    if (newTags.length > 0) {
      newDef.tags = newTags
    }
    if (newDateFrom || newDateTo) {
      newDef.dueDateWindow = {}
      if (newDateFrom) newDef.dueDateWindow.from = newDateFrom
      if (newDateTo) newDef.dueDateWindow.to = newDateTo
    }

    onChange(newDef)
  }

  const toggleStatus = (statusId: string) => {
    const newStatuses = selectedStatuses.includes(statusId)
      ? selectedStatuses.filter((s) => s !== statusId)
      : [...selectedStatuses, statusId]
    setSelectedStatuses(newStatuses)
    emitChange({ statuses: newStatuses })
  }

  const togglePriority = (priority: number) => {
    const newPriorities = selectedPriorities.includes(priority)
      ? selectedPriorities.filter((p) => p !== priority)
      : [...selectedPriorities, priority]
    setSelectedPriorities(newPriorities)
    emitChange({ priorities: newPriorities })
  }

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !selectedTags.includes(tag)) {
      const newTags = [...selectedTags, tag]
      setSelectedTags(newTags)
      setTagInput('')
      emitChange({ tags: newTags })
    }
  }

  const removeTag = (tag: string) => {
    const newTags = selectedTags.filter((t) => t !== tag)
    setSelectedTags(newTags)
    emitChange({ tags: newTags })
  }

  const handleDateFromChange = (value: string) => {
    setDateFrom(value)
    emitChange({ dateFrom: value })
  }

  const handleDateToChange = (value: string) => {
    setDateTo(value)
    emitChange({ dateTo: value })
  }

  if (loading) {
    return (
      <div className="py-8 text-center text-[#A3A3A3]">
        Loading filter options...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statuses */}
      <div>
        <label className="block text-sm font-medium text-[#5a5757] mb-2">
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => (
            <button
              key={status.id}
              type="button"
              onClick={() => toggleStatus(status.id)}
              className={`px-3 py-2 rounded text-sm font-medium transition ${
                selectedStatuses.includes(status.id)
                  ? 'bg-accent-500 text-white'
                  : 'bg-[#F3F3F3] text-[#5a5757] hover:bg-[#e8e4e4]'
              }`}
            >
              {status.name}
            </button>
          ))}
        </div>
        {statuses.length === 0 && (
          <p className="text-sm text-[#A3A3A3] mt-1">No statuses available</p>
        )}
      </div>

      {/* Priorities */}
      <div>
        <label className="block text-sm font-medium text-[#5a5757] mb-2">
          Priority
        </label>
        <div className="flex flex-wrap gap-2">
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => togglePriority(opt.value)}
              className={`px-3 py-2 rounded text-sm font-medium transition ${
                selectedPriorities.includes(opt.value)
                  ? 'bg-accent-500 text-white'
                  : 'bg-[#F3F3F3] text-[#5a5757] hover:bg-[#e8e4e4]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-[#5a5757] mb-2">
          Tags
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag()
              }
            }}
            placeholder="Type a tag and press Enter"
            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-4 py-2 bg-[#F3F3F3] text-[#5a5757] rounded text-sm font-medium hover:bg-[#e8e4e4] transition"
          >
            Add
          </button>
        </div>
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-accent-100 text-accent-700 rounded-full text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-accent-900"
                >
                  <FaTimes className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Due Date Range */}
      <div>
        <label className="block text-sm font-medium text-[#5a5757] mb-2">
          Due Date Range
        </label>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs text-[#A3A3A3] mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => handleDateFromChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-[#A3A3A3] mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => handleDateToChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      {(selectedStatuses.length > 0 || selectedPriorities.length > 0 || selectedTags.length > 0 || dateFrom || dateTo) && (
        <div className="pt-4">
          <p className="text-sm text-[#5a5757]">
            <span className="font-medium">Filter criteria:</span>{' '}
            {selectedStatuses.length > 0 && (
              <span className="text-accent-600">
                {selectedStatuses.length} status{selectedStatuses.length > 1 ? 'es' : ''}
              </span>
            )}
            {selectedStatuses.length > 0 && selectedPriorities.length > 0 && ' + '}
            {selectedPriorities.length > 0 && (
              <span className="text-accent-600">
                P{selectedPriorities.sort().join(', P')}
              </span>
            )}
            {(selectedStatuses.length > 0 || selectedPriorities.length > 0) && selectedTags.length > 0 && ' + '}
            {selectedTags.length > 0 && (
              <span className="text-accent-600">
                {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''}
              </span>
            )}
            {(selectedStatuses.length > 0 || selectedPriorities.length > 0 || selectedTags.length > 0) && (dateFrom || dateTo) && ' + '}
            {(dateFrom || dateTo) && (
              <span className="text-accent-600">
                date range
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
