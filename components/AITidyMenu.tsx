'use client'

import { useState } from 'react'
import { FaCheckCircle } from 'react-icons/fa'
import { TidyMode } from '@/app/actions/ai-tidy'

interface AITidyMenuProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (mode: TidyMode) => void
  isLoading?: boolean
}

const TIDY_MODES: Array<{ id: TidyMode; label: string; description: string }> = [
  {
    id: 'development',
    label: '👨‍💻 Development',
    description: 'Rewrite for technical clarity, acceptance criteria, and implementation',
  },
  {
    id: 'marketing',
    label: '📢 Marketing',
    description: 'Focus on user value, business impact, and key messaging',
  },
  {
    id: 'business-dev',
    label: '💼 Business Development',
    description: 'Emphasize outcomes, stakeholder value, and strategic importance',
  },
  {
    id: 'overview',
    label: '📋 Task Overview',
    description: 'Structure with Purpose, Key Points, and Success Criteria',
  },
  {
    id: 'clarity',
    label: '✨ General Clarity',
    description: 'Improve clarity, remove jargon, use simple language',
  },
]

export default function AITidyMenu({
  isOpen,
  onClose,
  onSelect,
  isLoading = false,
}: AITidyMenuProps) {
  const [hoveredMode, setHoveredMode] = useState<TidyMode | null>(null)

  if (!isOpen) return null

  return (
    <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-40 min-w-[280px]">
      <div className="p-2">
        <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Rewrite For
        </h3>
        {TIDY_MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => {
              onSelect(mode.id)
              onClose()
            }}
            disabled={isLoading}
            onMouseEnter={() => setHoveredMode(mode.id)}
            onMouseLeave={() => setHoveredMode(null)}
            className={`w-full text-left px-3 py-3 rounded-lg transition ${
              hoveredMode === mode.id
                ? 'bg-accent-50 border-l-2 border-accent-500'
                : 'border-l-2 border-transparent'
            } ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
            }`}
          >
            <div className="font-medium text-sm text-gray-900">{mode.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{mode.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
