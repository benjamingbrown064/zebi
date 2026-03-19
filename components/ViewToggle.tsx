'use client'

import React from 'react'

type ViewType = 'active' | 'completed' | 'archived'

interface ViewToggleProps {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
  completedCount?: number
  archivedCount?: number
}

export default function ViewToggle({
  activeView,
  onViewChange,
  completedCount = 0,
  archivedCount = 0,
}: ViewToggleProps) {
  return (
    <div className="flex items-center gap-2 bg-[#f0eded] rounded-[10px] p-1 w-fit">
      <button
        onClick={() => onViewChange('active')}
        className={`px-4 py-2 rounded-md font-medium transition ${
          activeView === 'active'
            ? 'bg-white text-[#1c1b1b] shadow-[0_1px_3px_rgba(28,27,27,0.06)]'
            : 'text-[#5a5757] hover:text-[#1c1b1b]'
        }`}
      >
        Active
      </button>

      <button
        onClick={() => onViewChange('completed')}
        className={`px-4 py-2 rounded-md font-medium transition ${
          activeView === 'completed'
            ? 'bg-white text-[#1c1b1b] shadow-[0_1px_3px_rgba(28,27,27,0.06)]'
            : 'text-[#5a5757] hover:text-[#1c1b1b]'
        }`}
      >
        Completed
        {completedCount > 0 && (
          <span className="ml-2 text-xs bg-gray-300 text-[#5a5757] rounded-full px-2 py-0.5">
            {completedCount}
          </span>
        )}
      </button>

      <button
        onClick={() => onViewChange('archived')}
        className={`px-4 py-2 rounded-md font-medium transition ${
          activeView === 'archived'
            ? 'bg-white text-[#1c1b1b] shadow-[0_1px_3px_rgba(28,27,27,0.06)]'
            : 'text-[#5a5757] hover:text-[#1c1b1b]'
        }`}
      >
        Archived
        {archivedCount > 0 && (
          <span className="ml-2 text-xs bg-gray-300 text-[#5a5757] rounded-full px-2 py-0.5">
            {archivedCount}
          </span>
        )}
      </button>
    </div>
  )
}
