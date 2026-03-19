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
      className={`fixed bottom-6 right-6 bg-[#f0fafa] border border-green-200 rounded-[10px] shadow-[0_20px_40px_rgba(28,27,27,0.06)] p-4 max-w-sm transform transition-all duration-300 ${
        dismissing ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="flex items-start gap-3">
        <FaCheckCircle className="text-[#006766] flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#1c1b1b]">
            Task completed · Will archive {getRetentionText()}
          </p>
          <p className="text-xs text-[#5a5757] mt-1 truncate">{taskTitle}</p>
        </div>
        <button
          onClick={() => {
            setDismissing(true)
            setTimeout(() => {
              onClose()
              setDismissing(false)
            }, 300)
          }}
          className="text-[#C4C0C0] hover:text-[#5a5757] flex-shrink-0"
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
          className="text-xs font-medium text-[#006766] hover:text-[#006766] bg-[#e6f4f4] hover:bg-green-200 px-2 py-1 rounded transition"
        >
          Archive now
        </button>
        <button
          onClick={() => {
            onUndo()
            onClose()
          }}
          className="text-xs font-medium text-[#5a5757] hover:text-[#5a5757] hover:bg-[#f0eded] px-2 py-1 rounded transition"
        >
          Undo
        </button>
      </div>
    </div>
  )
}
