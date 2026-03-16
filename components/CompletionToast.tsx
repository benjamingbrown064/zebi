'use client'

import React, { useEffect, useState } from 'react'
import { FaCheckCircle, FaTimes } from 'react-icons/fa'

interface CompletionToastProps {
  isVisible: boolean
  onClose: () => void
  onArchiveNow: () => void
  onUndo: () => void
  retentionDays: number
  taskTitle?: string
}

export default function CompletionToast({
  isVisible,
  onClose,
  onArchiveNow,
  onUndo,
  retentionDays,
  taskTitle = 'Task',
}: CompletionToastProps) {
  const [dismissing, setDismissing] = useState(false)

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!isVisible) return

    const timeout = setTimeout(() => {
      setDismissing(true)
      setTimeout(() => {
        onClose()
        setDismissing(false)
      }, 300)
    }, 5000)

    return () => clearTimeout(timeout)
  }, [isVisible, onClose])

  if (!isVisible) return null

  const getRetentionText = () => {
    if (retentionDays === 0) return 'Never'
    if (retentionDays === 1) return 'today'
    return `in ${retentionDays} days`
  }

  return (
    <div
      className={`fixed bottom-6 right-6 bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 max-w-sm transform transition-all duration-300 ${
        dismissing ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="flex items-start gap-3">
        <FaCheckCircle className="text-green-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            Task completed · Will archive {getRetentionText()}
          </p>
          <p className="text-xs text-gray-600 mt-1 truncate">{taskTitle}</p>
        </div>
        <button
          onClick={() => {
            setDismissing(true)
            setTimeout(() => {
              onClose()
              setDismissing(false)
            }, 300)
          }}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          <FaTimes />
        </button>
      </div>

      <div className="flex items-center gap-2 mt-3 ml-7">
        <button
          onClick={() => {
            onArchiveNow()
            onClose()
          }}
          className="text-xs font-medium text-green-600 hover:text-green-700 bg-green-100 hover:bg-green-200 px-2 py-1 rounded transition"
        >
          Archive now
        </button>
        <button
          onClick={() => {
            onUndo()
            onClose()
          }}
          className="text-xs font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-100 px-2 py-1 rounded transition"
        >
          Undo
        </button>
      </div>
    </div>
  )
}
