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
        className={`flex items-center gap-2 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-[#F3F3F3] dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition ${className}`}
      >
        {loading ? (
          <FaSpinner className="animate-spin" size={14} />
        ) : (
          <FaLightbulb className="text-yellow-500" size={14} />
        )}
        <span className="text-[#474747] dark:text-gray-300">Suggest Deadline</span>
      </button>

      {showSuggestion && suggestion && (
        <div className="absolute z-10 mt-2 p-4 bg-white dark:bg-gray-800 dark:border-gray-700 rounded shadow-[0_20px_40px_rgba(28,27,27,0.06)] w-80 left-0">
          <div className="flex items-start gap-2 mb-3">
            <FaCalendarAlt className="text-accent-500 mt-1" size={16} />
            <div>
              <p className="font-semibold text-sm text-[#1A1C1C] dark:text-gray-100">
                Suggested: {new Date(suggestion.deadline).toLocaleDateString()}
              </p>
              <p className="text-xs text-[#474747] dark:text-[#C4C0C0] mt-1">
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
              className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 text-sm rounded hover:bg-[#F3F3F3] dark:hover:bg-gray-700 transition text-[#474747] dark:text-gray-300"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
