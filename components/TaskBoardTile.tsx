'use client'

import { Task, Goal } from '@/lib/types'

interface TaskBoardTileProps {
  task: Task & {
    goal?: Goal | null
    tags?: Array<{ id: string; name: string }>
    attachments?: Array<{ id: string; filename: string }>
    blockedReason?: string
    dependencyIds?: string[]
    assignee?: { id: string; name: string } | null
    project?: { id: string; name: string } | null
    space?: { id: string; name: string } | null
    assigneeName?: string | null
    ownerAgent?: string | null
    botAssignee?: string | null
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

const AGENT_COLOURS: Record<string, string> = {
  harvey: '#2563EB',
  theo: '#7C3AED',
  doug: '#059669',
  casper: '#D97706',
}

const AGENT_LABELS: Record<string, string> = {
  harvey: 'Harvey', theo: 'Theo', doug: 'Doug', casper: 'Casper',
}

export default function TaskBoardTile({
  task,
  onDragStart,
  onComplete,
  onSnooze,
  onPriorityChange,
  onView,
}: TaskBoardTileProps) {
  const spaceName = (task as any).space?.name
  const projectName = task.project?.name
  const attachmentCount = task.attachments?.length || 0

  // Who is assigned — agent takes priority over human assignee
  const agent = task.ownerAgent || task.botAssignee
  const assigneeLabel = task.assigneeName || task.assigneeId?.slice(0, 6) || null

  return (
    <div
      draggable
      onDragStart={() => onDragStart?.(task)}
      onClick={e => {
        if ((e.target as HTMLElement).closest('button')) return
        onView?.(task.id)
      }}
      className="bg-white rounded border border-[#E5E5E5] p-4 cursor-pointer hover:border-[#C6C6C6] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all"
    >
      {/* Space + Project labels */}
      {(spaceName || projectName) && (
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {spaceName && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">
              {spaceName}
            </span>
          )}
          {spaceName && projectName && (
            <span className="text-[#D4D4D4] text-[10px]">·</span>
          )}
          {projectName && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C6C6C6]">
              {projectName}
            </span>
          )}
        </div>
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

      {/* Dependency indicator */}
      {task.dependencyIds && task.dependencyIds.length > 0 && (
        <p className="text-[11px] text-amber-600 mb-3 leading-snug">
          ⏳ {task.dependencyIds.length} prerequisite{task.dependencyIds.length > 1 ? 's' : ''} required
        </p>
      )}

      {/* Footer row: priority + meta + assignee */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Priority */}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES[4]}`}>
            P{task.priority}
          </span>

          {/* Due date */}
          {task.dueAt && (
            <span className="text-[11px] text-[#A3A3A3]">
              {new Date(task.dueAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}

          {/* Attachment count */}
          {attachmentCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-[#A3A3A3]">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {attachmentCount}
            </span>
          )}
        </div>

        {/* Assigned bot or person */}
        {agent ? (
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{
              backgroundColor: (AGENT_COLOURS[agent] || '#737373') + '18',
              color: AGENT_COLOURS[agent] || '#737373',
            }}
            title={`Assigned to ${AGENT_LABELS[agent] || agent}`}
          >
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{ backgroundColor: AGENT_COLOURS[agent] || '#737373' }}
            >
              {(AGENT_LABELS[agent] || agent).charAt(0).toUpperCase()}
            </div>
            {AGENT_LABELS[agent] || agent}
          </div>
        ) : assigneeLabel ? (
          <div
            className="w-6 h-6 rounded-full bg-[#1A1A1A] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0"
            title={`Assigned to ${assigneeLabel}`}
          >
            {assigneeLabel.charAt(0).toUpperCase()}
          </div>
        ) : (
          <div
            className="w-6 h-6 rounded-full border border-dashed border-[#D4D4D4] flex items-center justify-center flex-shrink-0"
            title="Unassigned"
          >
            <svg className="w-3 h-3 text-[#C6C6C6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
