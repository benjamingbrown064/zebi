'use client'

import React, { useState } from 'react'
import { FaArchive, FaUndo } from 'react-icons/fa'

interface ArchiveActionsMenuProps {
  taskId: string
  isArchived: boolean
  onArchive: (taskId: string) => Promise<void>
  onRestore: (taskId: string) => Promise<void>
  archivedAt?: string
  onActionStart?: () => void
  onActionComplete?: () => void
}

export default function ArchiveActionsMenu({
  taskId,
  isArchived,
  onArchive,
  onRestore,
  archivedAt,
  onActionStart,
  onActionComplete,
}: ArchiveActionsMenuProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleArchive = async () => {
    setIsLoading(true)
    onActionStart?.()
    try {
      await onArchive(taskId)
    } finally {
      setIsLoading(false)
      onActionComplete?.()
    }
  }

  const handleRestore = async () => {
    setIsLoading(true)
    onActionStart?.()
    try {
      await onRestore(taskId)
    } finally {
      setIsLoading(false)
      onActionComplete?.()
    }
  }

  if (!isArchived) {
    return (
      <button
        onClick={handleArchive}
        disabled={isLoading}
        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#474747] hover:bg-[#F3F3F3] rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FaArchive className="text-[#A3A3A3]" />
        <span>{isLoading ? 'Archiving...' : 'Archive'}</span>
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleRestore}
        disabled={isLoading}
        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#474747] hover:bg-[#F3F3F3] rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FaUndo className="text-[#A3A3A3]" />
        <span>{isLoading ? 'Restoring...' : 'Restore'}</span>
      </button>
      {archivedAt && (
        <div className="px-4 py-2 text-xs text-[#A3A3A3] bg-[#F3F3F3] rounded">
          Archived {new Date(archivedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}
