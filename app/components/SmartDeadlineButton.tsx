'use client'

import { useState } from 'react'
import { FaCalendarAlt, FaSpinner, FaLightbulb } from 'react-icons/fa'

interface SmartDeadlineButtonProps {
  taskDescription: string
  priority: number
  onDeadlineSelect: (deadline: Date, reasoning: string) => void
  disabled?: boolean
  className?: string
}

export default function SmartDeadlineButton({
  taskDescription,
  priority,
  onDeadlineSelect,
  disabled,
  className = '',
}: SmartDeadlineButtonProps) {
  const [loading, setLoading] = useState(false)
  const [showSuggestion, setShowSuggestion] = useState(false)
  const [suggestion, setSuggestion] = useState<{
    deadline: string
    reasoning: string
  } | null>(null)

  const handleSuggest = async () => {
    if (!taskDescription) {
      alert('Please enter a task description first')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/assistant/suggest-deadline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskDescription, priority }),
      })

      if (response.ok) {
        const data = await response.json()
        setSuggestion(data)
        setShowSuggestion(true)
      }
    } catch (error) {
      console.error('Failed to suggest deadline:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = () => {
    if (suggestion?.deadline) {
      onDeadlineSelect(new Date(suggestion.deadline), suggestion.reasoning)
      setShowSuggestion(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleSuggest}
        disabled={disabled || loading}
        className={`flex items-center gap-2 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition ${className}`}
      >
        {loading ? (
          <FaSpinner className="animate-spin" size={14} />
        ) : (
          <FaLightbulb className="text-yellow-500" size={14} />
        )}
        <span className="text-gray-700 dark:text-gray-300">Suggest Deadline</span>
      </button>

      {showSuggestion && suggestion && (
        <div className="absolute z-10 mt-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-80 left-0">
          <div className="flex items-start gap-2 mb-3">
            <FaCalendarAlt className="text-accent-500 mt-1" size={16} />
            <div>
              <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                Suggested: {new Date(suggestion.deadline).toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {suggestion.reasoning}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              className="flex-1 px-3 py-1 bg-accent-500 text-white text-sm rounded hover:bg-accent-600 transition"
            >
              Accept
            </button>
            <button
              onClick={() => setShowSuggestion(false)}
              className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 text-sm rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
