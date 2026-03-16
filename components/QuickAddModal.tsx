'use client'

import { useState, useRef, useEffect } from 'react'
import { FaTimes } from 'react-icons/fa'
import { getGoals, Goal } from '@/app/actions/goals'
import SmartTaskInput from '@/app/components/SmartTaskInput'
import SmartDeadlineButton from '@/app/components/SmartDeadlineButton'

interface QuickAddModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd?: (task: { title: string; priority: number; tags: string[]; goalId?: string; dueAt?: Date }) => void
  workspaceId?: string
  isMobile?: boolean
}

const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'

/**
 * Parse quick add format: "Task title p1 #tag"
 * No longer need goal:name syntax - use dropdown instead
 */
function parseQuickAdd(input: string) {
  let title = input
  let priority = 3
  let tags: string[] = []

  const priorityMatch = input.match(/\bp([1-4])\b/i)
  if (priorityMatch) {
    priority = parseInt(priorityMatch[1])
    title = title.replace(priorityMatch[0], '').trim()
  }

  const tagMatches = input.match(/#(\w+)/g)
  if (tagMatches) {
    tags = tagMatches.map((t) => t.slice(1))
    title = title.replace(/#\w+/g, '').trim()
  }

  return { title, priority, tags }
}

export default function QuickAddModal({
  isOpen,
  onClose,
  onAdd,
  workspaceId = DEFAULT_WORKSPACE_ID,
}: QuickAddModalProps) {
  const [input, setInput] = useState('')
  const [parsed, setParsed] = useState<ReturnType<typeof parseQuickAdd>>({ title: '', priority: 3, tags: [] })
  const [error, setError] = useState('')
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [selectedPriority, setSelectedPriority] = useState(3)
  const [dueAt, setDueAt] = useState<Date | null>(null)
  const [loadingGoals, setLoadingGoals] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load goals when modal opens and reset state
  useEffect(() => {
    if (isOpen) {
      loadGoalsData()
      setSelectedPriority(3)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const loadGoalsData = async () => {
    try {
      setLoadingGoals(true)
      const fetchedGoals = await getGoals(workspaceId)
      setGoals(fetchedGoals)
    } catch (err) {
      console.error('Failed to load goals:', err)
      setGoals([])
    } finally {
      setLoadingGoals(false)
    }
  }

  const handleInputChange = (value: string) => {
    setInput(value)
    setParsed(parseQuickAdd(value))
    setError('')
  }

  const handleAdd = () => {
    if (!parsed.title) return

    try {
      onAdd?.({
        title: parsed.title,
        priority: selectedPriority,
        tags: parsed.tags,
        goalId: selectedGoalId || undefined,
        dueAt: dueAt || undefined,
      })

      // Reset
      setInput('')
      setSelectedGoalId(null)
      setSelectedPriority(3)
      setDueAt(null)
      setParsed({ title: '', priority: 3, tags: [] })
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      console.error('Error:', err)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  const priorityColors: Record<number, string> = {
    1: 'bg-red-100 text-red-700',
    2: 'bg-orange-100 text-orange-700',
    3: 'bg-yellow-100 text-yellow-700',
    4: 'bg-gray-100 text-gray-700',
  }

  const priorityLabels: Record<number, string> = {
    1: 'P1 - Urgent',
    2: 'P2 - High',
    3: 'P3 - Medium',
    4: 'P4 - Low',
  }

  const selectedGoalName = selectedGoalId
    ? goals.find((g) => g.id === selectedGoalId)?.name
    : null

  return (
    <div className={`fixed inset-0 bg-black z-50 flex items-end md:items-center justify-center md:p-4 ${isMobile ? 'bg-opacity-0' : 'bg-opacity-50'}`}>
      <div className={`bg-white w-full md:max-w-md md:rounded-lg shadow-lg overflow-y-auto flex flex-col ${
        isMobile 
          ? 'h-screen rounded-t-2xl max-h-[95vh]' 
          : 'max-h-[90vh]'
      }`}>
        {/* Header */}
        <div className={`sticky top-0 bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex justify-between items-center min-h-[56px] md:min-h-auto`}>
          {isMobile ? (
            <>
              <button
                onClick={onClose}
                className="text-gray-700 hover:bg-gray-100 rounded-lg transition p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Go back"
              >
                <FaTimes className="text-lg" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900 flex-1 text-center">
                Quick add
              </h2>
              <div className="w-[44px]" />
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900">Quick add</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <FaTimes />
              </button>
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {/* Task input with AI suggestions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              What needs to be done?
            </label>
            <SmartTaskInput
              value={input}
              onChange={handleInputChange}
              placeholder="Task title [#tag] - AI suggestions after 3 chars"
              onSuggestionAccept={(suggestion) => {
                const parsed = parseQuickAdd(suggestion)
                setParsed(parsed)
              }}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Format: task text [#tag] • Type 3+ characters for AI suggestions
            </p>
          </div>

          {/* Priority dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 min-h-[44px]"
            >
              <option value={1}>P1 - Urgent</option>
              <option value={2}>P2 - High</option>
              <option value={3}>P3 - Medium</option>
              <option value={4}>P4 - Low</option>
            </select>
          </div>

          {/* Deadline with AI suggestion */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Deadline (optional)
            </label>
            <div className="flex gap-2 flex-wrap">
              <input
                type="date"
                value={dueAt ? dueAt.toISOString().split('T')[0] : ''}
                onChange={(e) => setDueAt(e.target.value ? new Date(e.target.value + 'T12:00:00') : null)}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 min-h-[44px]"
              />
              <SmartDeadlineButton
                taskDescription={parsed.title}
                priority={selectedPriority}
                onDeadlineSelect={(deadline) => setDueAt(deadline)}
                disabled={!parsed.title}
              />
            </div>
            {dueAt && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Due: {dueAt.toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Goal dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Link to goal (optional)
            </label>
            <select
              value={selectedGoalId || ''}
              onChange={(e) => setSelectedGoalId(e.target.value || null)}
              disabled={loadingGoals || goals.length === 0}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 min-h-[44px]"
            >
              <option value="">
                {loadingGoals ? 'Loading goals...' : goals.length === 0 ? 'No goals yet' : 'Select a goal'}
              </option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.name}
                </option>
              ))}
            </select>
            {goals.length === 0 && !loadingGoals && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Create a goal in /goals first
              </p>
            )}
          </div>

          {/* Preview */}
          {parsed.title && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Title</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">{parsed.title}</p>
              </div>

              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Priority</p>
                <p className={`text-xs font-semibold ${priorityColors[selectedPriority]} px-2 py-1 rounded w-fit`}>
                  {priorityLabels[selectedPriority]}
                </p>
              </div>

              {dueAt && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Deadline</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{dueAt.toLocaleDateString()}</p>
                </div>
              )}

              {parsed.tags.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {parsed.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedGoalName && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Goal</p>
                  <p className="text-sm text-accent-600 dark:text-accent-400 font-medium">{selectedGoalName}</p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className={`flex flex-col-reverse md:flex-row gap-3 px-4 md:px-6 py-4 border-t border-gray-200 ${isMobile ? 'safe-area-inset-bottom' : ''}`}>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition font-medium min-h-[44px] flex items-center justify-center"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!parsed.title}
            className="flex-1 px-4 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center"
          >
            Add task
          </button>
        </div>
      </div>
    </div>
  )
}
