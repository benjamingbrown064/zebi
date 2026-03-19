'use client'

import { useState } from 'react'
import { FaCheck, FaClock, FaEye, FaPaperclip, FaStickyNote, FaFileAlt, FaComment, FaFolder, FaUser } from 'react-icons/fa'
import { Task, Goal } from '@/lib/types'

interface TaskBoardTileProps {
  task: Task & {
    goal?: Goal | null
    tags?: Array<{ id: string; name: string }>
    attachments?: Array<{ id: string; filename: string }>
    blockedReason?: string
    assignee?: { id: string; name: string } | null
    project?: { id: string; name: string } | null
  }
  onDragStart?: (task: Task) => void
  onComplete?: (taskId: string) => void
  onSnooze?: (taskId: string, until: Date) => void
  onPriorityChange?: (taskId: string, priority: number) => void
  onView?: (taskId: string) => void
}

export default function TaskBoardTile({
  task,
  onDragStart,
  onComplete,
  onSnooze,
  onPriorityChange,
  onView,
}: TaskBoardTileProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [showPriorityPicker, setShowPriorityPicker] = useState(false)

  // Format date helper
  const formatDueDate = (dueAt?: string | Date): string | null => {
    if (!dueAt) return null

    const date = typeof dueAt === 'string' ? new Date(dueAt) : dueAt
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Reset time for date comparison
    today.setHours(0, 0, 0, 0)
    tomorrow.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)

    if (date.getTime() === today.getTime()) {
      return 'Today'
    } else if (date.getTime() === tomorrow.getTime()) {
      return 'Tomorrow'
    } else {
      // Format as "Fri 12 Mar"
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ]
      return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`
    }
  }

  // Get priority label
  const getPriorityLabel = (priority: number): string => {
    return `P${priority}`
  }

  // Get priority color (monochrome + accent)
  const getPriorityColor = (priority: number): string => {
    switch (priority) {
      case 1:
        return 'text-red-500 bg-red-50'
      case 2:
        return 'text-orange-500 bg-orange-50'
      case 3:
        return 'text-amber-500 bg-amber-50'
      case 4:
        return 'text-gray-400 bg-gray-50'
      default:
        return 'text-gray-400 bg-gray-50'
    }
  }

  const dueDate = formatDueDate(task.dueAt)
  const displayTags = task.tags?.slice(0, 2) || []
  const remainingTags = (task.tags?.length || 0) - displayTags.length
  const hasAttachments = (task.attachments?.length || 0) > 0
  const hasBlockedReason = !!task.blockedReason
  const hasAssignee = !!task.assignee
  const showRow3 = hasBlockedReason || hasAssignee

  return (
    <div
      draggable
      onDragStart={() => onDragStart?.(task)}
      onClick={(e) => {
        // Only trigger view if not clicking on interactive elements
        if ((e.target as HTMLElement).closest('button')) return
        onView?.(task.id)
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false)
        setShowPriorityPicker(false)
      }}
      className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow duration-200 relative group"
    >
      {/* ROW 1: Title + Indicators + Assignee */}
      <div className="flex items-start justify-between gap-2 mb-3 relative">
        <div className="flex-1 min-w-0">
          <h3
            title={task.title}
            className="text-sm font-medium text-gray-900 truncate leading-tight"
          >
            {task.title}
          </h3>
        </div>
        {/* Indicators for description, attachments, notes */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {task.description && (
            <FaFileAlt
              size={12}
              className="text-gray-400 hover:text-gray-600"
              title="Has description"
            />
          )}
          {hasAttachments && (
            <FaPaperclip
              size={12}
              className="text-gray-400 hover:text-gray-600"
              title={`${task.attachments?.length} attachment(s)`}
            />
          )}
        </div>
        {/* Assignee Badge */}
        {task.assigneeId && (
          <div
            title={`Assigned to: ${task.assigneeId}`}
            className="flex-shrink-0 w-7 h-7 rounded-full bg-accent-500 text-white text-xs font-medium flex items-center justify-center flex-col"
          >
            {task.assigneeId.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* ROW 1b: Project + Assignee */}
      {(task.project || task.assignee) && (
        <div className="flex items-center gap-3 mb-2 text-xs text-[#737373]">
          {task.project && (
            <div className="flex items-center gap-1 min-w-0">
              <FaFolder size={10} className="text-[#A3A3A3] flex-shrink-0" />
              <span className="truncate">{task.project.name}</span>
            </div>
          )}
          {task.assignee && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="w-4 h-4 rounded-full bg-[#DD3A44] text-white flex items-center justify-center text-[9px] font-medium flex-shrink-0">
                {task.assignee.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate max-w-[80px]">{task.assignee.name}</span>
            </div>
          )}
        </div>
      )}

      {/* ROW 2: Metadata */}
      <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
        {/* Due Date */}
        {dueDate && (
          <span className="text-gray-600">{dueDate}</span>
        )}

        {/* Priority */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (isHovering) setShowPriorityPicker(!showPriorityPicker)
            }}
            className={`px-2 py-1 rounded font-medium transition-all ${getPriorityColor(
              task.priority
            )} ${isHovering ? 'cursor-pointer hover:shadow-sm' : ''}`}
            title="Priority"
          >
            {getPriorityLabel(task.priority)}
          </button>

          {/* Priority Picker - appears on hover */}
          {showPriorityPicker && isHovering && (
            <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
              {[1, 2, 3, 4].map((p) => (
                <button
                  key={p}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onPriorityChange?.(task.id, p)
                    setShowPriorityPicker(false)
                  }}
                  className={`block w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-100 transition-colors ${
                    task.priority === p ? 'bg-gray-50' : ''
                  }`}
                >
                  {getPriorityLabel(p)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tags (max 2 + "+N") */}
        {displayTags.length > 0 && (
          <div className="flex items-center gap-1">
            {displayTags.map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium"
              >
                {tag.name}
              </span>
            ))}
            {remainingTags > 0 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded font-medium">
                +{remainingTags}
              </span>
            )}
          </div>
        )}

        {/* Goal */}
        {task.goal && (
          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium">
            {task.goal.name}
          </span>
        )}

        {/* Attachments */}
        {hasAttachments && (
          <span
            className="flex items-center gap-1 text-gray-500"
            title={`${task.attachments?.length} attachment(s)`}
          >
            <FaPaperclip size={12} /> {task.attachments?.length}
          </span>
        )}
      </div>

      {/* ROW 3 (Conditional): Blocked Reason OR Assignee */}
      {showRow3 && (
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100 text-xs">
          {hasBlockedReason && (
            <div className="flex items-center gap-1 text-red-600">
              <span className="font-medium">Blocked:</span>
              <span className="text-red-500">{task.blockedReason}</span>
            </div>
          )}
          {hasAssignee && !hasBlockedReason && (
            <div className="flex items-center gap-1 text-gray-600">
              <span className="font-medium">Assigned to:</span>
              <span className="text-gray-700">{task.assignee?.name}</span>
            </div>
          )}
        </div>
      )}

      {/* HOVER ACTIONS - Subtle, no layout shift */}
      {isHovering && (
        <div className="absolute inset-0 pointer-events-none rounded-lg bg-gradient-to-t from-black/0 to-transparent" />
      )}

      {isHovering && (
        <div className="absolute bottom-0 left-0 right-0 flex gap-2 p-3 bg-white border-t border-gray-100 rounded-b-lg pointer-events-auto">
          {/* Complete button */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onComplete?.(task.id)
            }}
            className="text-xs font-medium px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded transition-colors flex items-center gap-1"
            title="Mark complete"
          >
            <FaCheck size={12} />
            Complete
          </button>

          {/* Snooze button */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              // Snooze for 1 hour
              const snoozeUntil = new Date()
              snoozeUntil.setHours(snoozeUntil.getHours() + 1)
              onSnooze?.(task.id, snoozeUntil)
            }}
            className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition-colors flex items-center gap-1"
            title="Snooze for 1 hour"
          >
            <FaClock size={12} />
            Snooze
          </button>

          {/* View button */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onView?.(task.id)
            }}
            className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition-colors ml-auto flex items-center gap-1"
            title="View task details"
          >
            <FaEye size={12} />
            View
          </button>
        </div>
      )}
    </div>
  )
}
