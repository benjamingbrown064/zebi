'use client'

import Link from 'next/link'
import { FaProjectDiagram, FaTasks, FaBuilding, FaBullseye } from 'react-icons/fa'

interface ProjectCardProps {
  id: string
  name: string
  description?: string | null
  companyName?: string | null
  companyId?: string | null
  objectiveTitle?: string | null
  objectiveStatus?: string | null
  taskCount?: number
  completedTaskCount?: number
  priority?: number | null
}

export default function ProjectCard({
  id,
  name,
  description,
  companyName,
  companyId,
  objectiveTitle,
  objectiveStatus,
  taskCount = 0,
  completedTaskCount = 0,
  priority,
}: ProjectCardProps) {
  const completionPercent = taskCount > 0 ? (completedTaskCount / taskCount) * 100 : 0

  const priorityColors: Record<number, string> = {
    1: 'bg-red-100 text-red-700 border-red-200',
    2: 'bg-orange-100 text-orange-700 border-orange-200',
    3: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    4: 'bg-[#f0eded] text-[#5a5757] border-gray-200',
  }

  const priorityLabels: Record<number, string> = {
    1: 'P1 - Urgent',
    2: 'P2 - High',
    3: 'P3 - Medium',
    4: 'P4 - Low',
  }

  return (
    <Link href={`/projects/${id}`}>
      <div className="card-base p-6 card-hover group">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-accent-100 rounded-[10px] flex items-center justify-center flex-shrink-0">
            <FaProjectDiagram className="text-accent-600" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#1c1b1b] truncate group-hover:text-accent-600 transition">
              {name}
            </h3>

            {/* Breadcrumb: Company → Objective */}
            <div className="flex items-center gap-1 mt-1 text-xs text-[#A3A3A3]">
              {companyName && (
                <>
                  <FaBuilding className="text-[#C4C0C0]" />
                  <Link
                    href={`/companies/${companyId}`}
                    className="hover:text-accent-600 transition truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {companyName}
                  </Link>
                </>
              )}
              {objectiveTitle && (
                <>
                  {companyName && <span>•</span>}
                  <FaBullseye className="text-[#C4C0C0]" />
                  <span className="truncate">🎯 {objectiveTitle}</span>
                  {objectiveStatus && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        objectiveStatus === 'active'
                          ? 'bg-[#e6f4f4] text-[#006766]'
                          : objectiveStatus === 'blocked'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-[#f0eded] text-[#5a5757]'
                      }`}
                    >
                      {objectiveStatus}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Priority Badge */}
          {priority && priority <= 2 && (
            <span
              className={`px-2 py-1 rounded text-xs font-medium border ${priorityColors[priority]}`}
            >
              {priorityLabels[priority]}
            </span>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-[#5a5757] mb-4 line-clamp-2">{description}</p>
        )}

        {/* Progress Bar */}
        {taskCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#5a5757]">
              <span className="flex items-center gap-1">
                <FaTasks className="text-[#C4C0C0]" />
                {completedTaskCount} / {taskCount} tasks
              </span>
              <span className="font-medium">{Math.round(completionPercent)}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#e8e4e4] rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-500 transition-all duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {taskCount === 0 && (
          <div className="text-xs text-[#C4C0C0] italic">No tasks yet</div>
        )}
      </div>
    </Link>
  )
}
