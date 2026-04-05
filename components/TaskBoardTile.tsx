'use client'

import { Task, Goal } from '@/lib/types'

interface TaskBoardTileProps {
  task: Task & {
    goal?: Goal | null
    tags?: Array<{ id: string; name: string }>
    attachments?: Array<{ id: string; filename: string }>
    blockedReason?: string
    assignee?: { id: string; name: string } | null
    project?: { id: string; name: string } | null
    space?: { id: string; name: string } | null
    assigneeName?: string | null
  }
  onDragStart?: (task: Task) => void
  onComplete?: (taskId: string) => void
  onSnooze?: (taskId: string, until: Date) => void
  onPriorityChange?: (taskId: string, priority: number) => void
  onView?: (taskId: string) => void
}

const PRIORITY_STYLES: Record<number, string> = {
  1: 'bg-[#1A1A1A] text-white',
  2: 'border border-[#1A1A1A] text-[#1A1A1A]',
  3: 'border border-[#C6C6C6] text-[#474747]',
  4: 'border border-[#E5E5E5] text-[#A3A3A3]',
}

export default function TaskBoardTile({
  task,
  onDragStart,
  onComplete,
  onView,
}: TaskBoardTileProps) {
  const context = task.project?.name || (task as any).space?.name || task.goal?.name
  const attachmentCount = task.attachments?.length || 0
  const commentCount = 0 // placeholder — wire when comments are available
  const assigneeInitial = task.assigneeName
    ? task.assigneeName.charAt(0).toUpperCase()
    : task.assigneeId
    ? task.assigneeId.charAt(0).toUpperCase()
    : null

  return (
    <div
      draggable
      onDragStart={() => onDragStart?.(task)}
      onClick={e => {
        if ((e.target as HTMLElement).closest('button')) return
        onView?.(task.id)
      }}
      className="bg-white rounded border border-[#E5E5E5] p-4 cursor-pointer hover:border-[#C6C6C6] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all group"
    >
      {/* Context label */}
      {context && (
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#A3A3A3] mb-2">
          {context}
        </p>
      )}

      {/* Title */}
      <h3 className="text-[14px] font-semibold text-[#1A1A1A] leading-snug mb-4">
        {task.title}
      </h3>

      {/* Blocked reason */}
      {task.blockedReason && (
        <p className="text-[11px] text-[#EF4444] mb-3 leading-snug">
          ⚠ {task.blockedReason}
        </p>
      )}

      {/* Footer row: priority + meta + assignee */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Priority */}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES[4]}`}>
            P{task.priority}
          </span>

          {/* Attachment count */}
          {attachmentCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-[#A3A3A3]">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {attachmentCount}
            </span>
          )}

          {/* Due date */}
          {task.dueAt && (
            <span className="text-[11px] text-[#A3A3A3]">
              {new Date(task.dueAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>

        {/* Assignee avatar */}
        {assigneeInitial && (
          <div className="w-6 h-6 rounded-full bg-[#1A1A1A] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
            {assigneeInitial}
          </div>
        )}
      </div>
    </div>
  )
}
