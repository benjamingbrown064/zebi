'use client'

import { useState, useEffect, useRef } from 'react'
import { FaLightbulb, FaSpinner } from 'react-icons/fa'

interface SmartTaskInputProps {
  value: string
  onChange: (value: string) => void
  onSuggestionAccept?: (suggestion: string) => void
  placeholder?: string
  className?: string
}

export default function SmartTaskInput({
  value,
  onChange,
  onSuggestionAccept,
  placeholder = 'Enter task description...',
  className = '',
}: SmartTaskInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceTimer = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Debounce autocomplete requests
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    if (value.length >= 3) {
      debounceTimer.current = setTimeout(() => {
        fetchSuggestions(value)
      }, 500) // Wait 500ms after user stops typing
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [value])

  const fetchSuggestions = async (partialText: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/assistant/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partialText }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions)
          setShowSuggestions(true)
        }
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion)
    setShowSuggestions(false)
    onSuggestionAccept?.(suggestion)
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-accent-500 focus:border-transparent bg-white dark:bg-gray-800 text-[#1c1b1b] dark:text-gray-100 ${className}`}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <FaSpinner className="animate-spin text-[#C4C0C0]" size={16} />
          </div>
        )}
        {!loading && suggestions.length > 0 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <FaLightbulb className="text-yellow-500" size={16} />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 dark:border-gray-700 rounded shadow-[0_20px_40px_rgba(28,27,27,0.06)]">
          <div className="p-2 dark:border-gray-700 bg-[#F3F3F3] dark:bg-gray-750">
            <div className="flex items-center gap-2 text-xs text-[#5a5757] dark:text-[#C4C0C0]">
              <FaLightbulb className="text-yellow-500" size={12} />
              <span>AI Suggestions</span>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left px-4 py-2 hover:bg-[#F3F3F3] dark:hover:bg-gray-700 transition-colors text-sm text-[#1c1b1b] dark:text-gray-100"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowSuggestions(false)}
            className="w-full px-4 py-2 text-xs text-[#A3A3A3] dark:text-[#C4C0C0] hover:bg-[#F3F3F3] dark:hover:bg-gray-750 dark:border-gray-700"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
