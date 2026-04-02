'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { FaPaperPlane } from 'react-icons/fa'
import { getMentionCandidate, filterUsersForMention, getMentionHandle, getUserDisplayName } from '@/lib/mentions'

export interface MentionUser {
  id: string
  name?: string
  email?: string
}

interface MentionInputProps {
  onSubmit: (body: string) => void
  workspaceMembers: MentionUser[]
  disabled?: boolean
  placeholder?: string
}

function getInitials(user: MentionUser): string {
  if (user.name) {
    const parts = user.name.split(' ')
    return parts.map(p => p[0]).slice(0, 2).join('').toUpperCase()
  }
  if (user.email) {
    return user.email.slice(0, 2).toUpperCase()
  }
  return user.id.slice(0, 2).toUpperCase()
}

export default function MentionInput({
  onSubmit,
  workspaceMembers,
  disabled = false,
  placeholder = 'Add a comment... (type @ to mention)',
}: MentionInputProps) {
  const [value, setValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<MentionUser[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Update suggestions based on input
  const updateSuggestions = useCallback((text: string, cursorPos: number) => {
    const candidate = getMentionCandidate(text, cursorPos)
    
    if (candidate) {
      const matches = filterUsersForMention(candidate.query, workspaceMembers, 5)
      setSuggestions(matches)
      setShowSuggestions(matches.length > 0)
      setMentionStartIndex(candidate.startIndex)
      setSelectedIndex(0)
    } else {
      setShowSuggestions(false)
      setSuggestions([])
      setMentionStartIndex(null)
    }
  }, [workspaceMembers])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    updateSuggestions(newValue, e.target.selectionStart || newValue.length)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % suggestions.length)
          return
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
          return
        case 'Enter':
        case 'Tab':
          e.preventDefault()
          insertMention(suggestions[selectedIndex])
          return
        case 'Escape':
          e.preventDefault()
          setShowSuggestions(false)
          return
      }
    }

    // Ctrl+Enter to submit
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const insertMention = (user: MentionUser) => {
    if (mentionStartIndex === null) return

    const handle = getMentionHandle(user)
    const before = value.slice(0, mentionStartIndex)
    const cursorPos = inputRef.current?.selectionStart || value.length
    const after = value.slice(cursorPos)
    
    const newValue = `${before}@${handle} ${after}`
    setValue(newValue)
    setShowSuggestions(false)
    setSuggestions([])
    setMentionStartIndex(null)

    // Focus back on input
    setTimeout(() => {
      inputRef.current?.focus()
      const newCursorPos = before.length + handle.length + 2
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const handleSubmit = () => {
    if (!value.trim() || disabled) return
    onSubmit(value.trim())
    setValue('')
    setShowSuggestions(false)
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative flex-1">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          className="px-3 py-2 bg-accent-500 text-white rounded hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <FaPaperPlane className="w-4 h-4" />
        </button>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute left-0 right-12 bottom-full mb-1 bg-white rounded shadow-[0_20px_40px_rgba(28,27,27,0.06)] overflow-hidden z-50"
        >
          {suggestions.map((user, index) => (
            <button
              key={user.id}
              onClick={() => insertMention(user)}
              className={`w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-[#F3F3F3] transition ${
                index === selectedIndex ? 'bg-accent-50' : ''
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                {getInitials(user)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-[#1A1C1C] truncate">
                  {getUserDisplayName(user)}
                </div>
                {user.email && (
                  <div className="text-xs text-[#A3A3A3] truncate">
                    {user.email}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
