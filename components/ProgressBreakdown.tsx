'use client'

import { useState } from 'react'
import { FaChevronDown, FaChevronUp, FaInfoCircle } from 'react-icons/fa'

interface ProgressBreakdownProps {
  totalTasks: number
  completedTasks: number
  progressPercent: number
  directTasks?: {
    total: number
    completed: number
  }
  projectTasks?: {
    total: number
    completed: number
  }
  scopeChangeNote?: string
  lastRecalc?: string
}

export default function ProgressBreakdown({
  totalTasks,
  completedTasks,
  progressPercent,
  directTasks,
  projectTasks,
  scopeChangeNote,
  lastRecalc
}: ProgressBreakdownProps) {
  const [expanded, setExpanded] = useState(false)

  if (totalTasks === 0) {
    return (
      <div className="bg-white rounded-[14px] p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-4">
            <FaInfoCircle className="text-[#A3A3A3] text-2xl" />
          </div>
          <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">No tasks yet</h3>
          <p className="text-[#A3A3A3] text-sm mb-4">
            Break this objective into tasks to track progress automatically.
          </p>
          <p className="text-xs text-[#A3A3A3]">
            Progress is based on completed tasks linked to this objective.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-[14px] p-6">
      {/* Scope Change Notification */}
      {scopeChangeNote && (
        <div className="mb-4 p-3 bg-[#f0fafa] border border-transparent rounded-[10px] flex items-start gap-3">
          <FaInfoCircle className="text-[#006766] flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-blue-900 font-medium">Progress updated</p>
            <p className="text-sm text-[#006766]">{scopeChangeNote}</p>
          </div>
        </div>
      )}

      {/* Main Progress Display */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[17px] font-semibold text-[#1A1A1A]">Progress</h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#e6f4f4] text-[#006766]">
              AUTO
            </span>
          </div>
          <p className="text-[15px] text-[#A3A3A3]">
            {completedTasks} of {totalTasks} tasks completed
          </p>
        </div>
        <span className="px-3 py-1.5 rounded-[6px] text-[13px] font-semibold bg-[#e6f4f4] text-[#006766]">
          {progressPercent}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full h-3 bg-[#F5F5F5] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#f0fafa]0 transition-all duration-300"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Explanation */}
      <div className="mb-4 p-3 bg-[#F5F5F5] rounded-[10px]">
        <p className="text-xs text-[#525252]">
          <FaInfoCircle className="inline mr-1" />
          Progress is based on completed tasks linked directly to this objective and tasks inside linked projects.
        </p>
      </div>

      {/* Expandable Breakdown */}
      {(directTasks || projectTasks) && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between py-2 text-[15px] font-medium text-[#525252] hover:text-[#1A1A1A] transition-colors"
          >
            <span>Progress Details</span>
            {expanded ? <FaChevronUp /> : <FaChevronDown />}
          </button>

          {expanded && (
            <div className="mt-3 pt-3 space-y-2">
              {directTasks && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#525252]">Direct Tasks:</span>
                  <span className="font-medium text-[#1A1A1A]">
                    {directTasks.completed} / {directTasks.total} completed ({Math.round((directTasks.completed / Math.max(1, directTasks.total)) * 100)}%)
                  </span>
                </div>
              )}
              
              {projectTasks && projectTasks.total > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#525252]">Project Tasks:</span>
                  <span className="font-medium text-[#1A1A1A]">
                    {projectTasks.completed} / {projectTasks.total} completed ({Math.round((projectTasks.completed / Math.max(1, projectTasks.total)) * 100)}%)
                  </span>
                </div>
              )}

              <div className="pt-2 mt-2">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-[#1A1A1A]">Total (unique):</span>
                  <span className="text-[#1A1A1A]">
                    {completedTasks} / {totalTasks} completed ({progressPercent}%)
                  </span>
                </div>
              </div>

              <div className="mt-3 p-2 bg-[#fcf9f8] rounded-[6px]">
                <p className="text-xs text-[#525252]">
                  Tasks are counted once, even if linked both directly and through a project.
                </p>
              </div>

              {lastRecalc && (
                <p className="text-xs text-[#A3A3A3] mt-2">
                  Last updated: {new Date(lastRecalc).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
