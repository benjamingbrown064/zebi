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
    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 w-fit">
      <button
        onClick={() => onViewChange('active')}
        className={`px-4 py-2 rounded-md font-medium transition ${
          activeView === 'active'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Active
      </button>

      <button
        onClick={() => onViewChange('completed')}
        className={`px-4 py-2 rounded-md font-medium transition ${
          activeView === 'completed'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Completed
        {completedCount > 0 && (
          <span className="ml-2 text-xs bg-gray-300 text-gray-700 rounded-full px-2 py-0.5">
            {completedCount}
          </span>
        )}
      </button>

      <button
        onClick={() => onViewChange('archived')}
        className={`px-4 py-2 rounded-md font-medium transition ${
          activeView === 'archived'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Archived
        {archivedCount > 0 && (
          <span className="ml-2 text-xs bg-gray-300 text-gray-700 rounded-full px-2 py-0.5">
            {archivedCount}
          </span>
        )}
      </button>
    </div>
  )
}
