'use client'

import { useState, useRef, useEffect } from 'react'
import { FaUser, FaChevronDown, FaTimes } from 'react-icons/fa'

export interface AssigneeUser {
  id: string
  name?: string
  email?: string
}

interface TaskAssigneeProps {
  assignedTo?: string
  workspaceMembers: AssigneeUser[]
  onAssign: (userId: string | null) => void
  disabled?: boolean
}

function getInitials(user: AssigneeUser): string {
  if (user.name) {
    const parts = user.name.split(' ')
    return parts.map(p => p[0]).slice(0, 2).join('').toUpperCase()
  }
  if (user.email) {
    return user.email.slice(0, 2).toUpperCase()
  }
  return user.id.slice(0, 2).toUpperCase()
}

function getDisplayName(user: AssigneeUser): string {
  if (user.name) return user.name
  if (user.email) return user.email.split('@')[0]
  return user.id.slice(0, 8)
}

export default function TaskAssignee({
  assignedTo,
  workspaceMembers,
  onAssign,
  disabled = false,
}: TaskAssigneeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const assignee = assignedTo
    ? workspaceMembers.find(m => m.id === assignedTo)
    : null

  // Filter members based on search
  const filteredMembers = workspaceMembers.filter(m => {
    const q = searchQuery.toLowerCase()
    const nameMatch = m.name?.toLowerCase().includes(q)
    const emailMatch = m.email?.toLowerCase().includes(q)
    return nameMatch || emailMatch || !searchQuery
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (userId: string | null) => {
    onAssign(userId)
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-[#1c1b1b] mb-2">
        Assigned To
      </label>

      {/* Current assignee button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded text-left transition ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-300 cursor-pointer'
        }`}
      >
        {assignee ? (
          <>
            <div className="w-8 h-8 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-sm font-medium flex-shrink-0">
              {getInitials(assignee)}
            </div>
            <span className="flex-1 text-[#1c1b1b]">{getDisplayName(assignee)}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleSelect(null)
              }}
              className="text-[#C4C0C0] hover:text-red-500 transition p-1"
              title="Unassign"
            >
              <FaTimes className="w-3 h-3" />
            </button>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full bg-[#F3F3F3] text-[#C4C0C0] flex items-center justify-center flex-shrink-0">
              <FaUser className="w-4 h-4" />
            </div>
            <span className="flex-1 text-[#A3A3A3]">Unassigned</span>
            <FaChevronDown className="w-4 h-4 text-[#C4C0C0]" />
          </>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded shadow-[0_20px_40px_rgba(28,27,27,0.06)] z-50 max-h-64 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members..."
              className="w-full px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            />
          </div>

          {/* Members list */}
          <div className="overflow-y-auto max-h-48">
            {/* Unassign option */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-[#F3F3F3] transition"
            >
              <div className="w-7 h-7 rounded-full bg-[#F3F3F3] text-[#C4C0C0] flex items-center justify-center flex-shrink-0">
                <FaTimes className="w-3 h-3" />
              </div>
              <span className="text-sm text-[#5a5757]">Unassigned</span>
            </button>

            {filteredMembers.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[#A3A3A3] text-center">
                No members found
              </div>
            ) : (
              filteredMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleSelect(member.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-[#F3F3F3] transition ${
                    member.id === assignedTo ? 'bg-accent-50' : ''
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {getInitials(member)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[#1c1b1b] truncate">
                      {getDisplayName(member)}
                    </div>
                    {member.email && (
                      <div className="text-xs text-[#A3A3A3] truncate">
                        {member.email}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
