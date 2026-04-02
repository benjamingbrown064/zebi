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
    <div className="absolute top-full mt-2 right-0 bg-white rounded shadow-[0_20px_40px_rgba(28,27,27,0.06)] z-40 min-w-[280px]">
      <div className="p-2">
        <h3 className="px-3 py-2 text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider">
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
            className={`w-full text-left px-3 py-3 rounded transition ${
              hoveredMode === mode.id
                ? 'bg-accent-50 border-l-2 border-accent-500'
                : 'border-l-2 border-transparent'
            } ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#F3F3F3]'
            }`}
          >
            <div className="font-medium text-sm text-[#1A1C1C]">{mode.label}</div>
            <div className="text-xs text-[#A3A3A3] mt-0.5">{mode.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
