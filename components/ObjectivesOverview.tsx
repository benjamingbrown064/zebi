'use client'

import Link from 'next/link'
import { FaFlag, FaRobot, FaUser, FaExclamationTriangle } from 'react-icons/fa'

interface Objective {
  id: string
  title: string
  spaceName?: string
  status: string
  progressPercent: number
  currentValue: number
  targetValue: number
  unit?: string
  nextMilestone?: {
    title: string
    daysUntil: number
  }
  aiWork?: string
  humanWork?: string
  activeBlockers: number
}

interface ObjectivesOverviewProps {
  objectives: Objective[]
}

export default function ObjectivesOverview({ objectives }: ObjectivesOverviewProps) {
  if (objectives.length === 0) {
    return (
      <div className="card-base p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1A1C1C]">🎯 Active Objectives</h2>
          <Link
            href="/objectives"
            className="text-sm text-accent-600 hover:text-accent-700 font-medium"
          >
            View All
          </Link>
        </div>
        <div className="text-center py-8">
          <p className="text-[#A3A3A3] mb-4">No active objectives</p>
          <Link
            href="/objectives"
            className="inline-block px-4 py-2 bg-accent-500 text-white rounded hover:bg-accent-600 transition"
          >
            Create Your First Objective
          </Link>
        </div>
      </div>
    )
  }

  const statusConfig: any = {
    on_track: { bg: 'bg-[#e6f4f4]', text: 'text-[#006766]', bar: 'bg-[#f0fafa]0', icon: '✅' },
    at_risk: { bg: 'bg-yellow-100', text: 'text-yellow-700', bar: 'bg-yellow-500', icon: '⚠️' },
    blocked: { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500', icon: '🚫' },
    active: { bg: 'bg-[#F3F3F3]', text: 'text-[#474747]', bar: 'bg-accent-500', icon: '🎯' },
  }

  const formatValue = (value: number, unit?: string) => {
    if (unit === 'GBP') {
      return `£${(value / 1000).toFixed(0)}k`
    }
    return value.toString()
  }

  // Show top 3 objectives
  const topObjectives = objectives.slice(0, 3)

  return (
    <div className="card-base p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-[#1A1C1C] flex items-center gap-2">
          <FaFlag className="text-accent-500" />
          Active Objectives ({objectives.length})
        </h2>
        <Link
          href="/objectives"
          className="text-sm text-accent-600 hover:text-accent-700 font-medium"
        >
          View All →
        </Link>
      </div>

      <div className="space-y-6">
        {topObjectives.map((objective) => {
          const statusStyle = statusConfig[objective.status] || statusConfig.active

          return (
            <div key={objective.id} className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {objective.spaceName && (
                    <p className="text-xs text-[#A3A3A3] mb-1">{objective.spaceName}</p>
                  )}
                  <Link
                    href={`/objectives/${objective.id}`}
                    className="font-semibold text-[#1A1C1C] hover:text-accent-600 transition"
                  >
                    {objective.title}
                  </Link>
                </div>
                <div className={`px-2 py-1 rounded ${statusStyle.bg} flex items-center gap-1`}>
                  <span className="text-xs">{statusStyle.icon}</span>
                  <span className={`text-xs font-medium ${statusStyle.text}`}>
                    {objective.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-xs text-[#474747] mb-1">
                  <span>
                    {formatValue(objective.currentValue, objective.unit)} → {formatValue(objective.targetValue, objective.unit)}
                  </span>
                  <span className="font-semibold">{Math.round(objective.progressPercent)}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#e8e4e4] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${statusStyle.bar} transition-all duration-300`}
                    style={{ width: `${Math.min(objective.progressPercent, 100)}%` }}
                  />
                </div>
              </div>

              {/* Next Milestone */}
              {objective.nextMilestone && (
                <div className="text-xs text-[#474747]">
                  Next: <strong>{objective.nextMilestone.title}</strong> in{' '}
                  <strong className={objective.nextMilestone.daysUntil < 7 ? 'text-orange-600' : ''}>
                    {objective.nextMilestone.daysUntil} days
                  </strong>
                </div>
              )}

              {/* Blocker Alert */}
              {objective.activeBlockers > 0 && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  <FaExclamationTriangle />
                  <span>
                    <strong>{objective.activeBlockers} blocker{objective.activeBlockers > 1 ? 's' : ''}</strong> need attention
                  </span>
                </div>
              )}

              {/* AI & Human Work */}
              <div className="grid grid-cols-2 gap-2">
                {objective.aiWork && (
                  <div className="flex items-start gap-2 text-xs">
                    <FaRobot className="text-accent-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-[#474747]">Doug:</span>
                      <p className="text-[#1A1C1C] line-clamp-1">{objective.aiWork}</p>
                    </div>
                  </div>
                )}
                {objective.humanWork && (
                  <div className="flex items-start gap-2 text-xs">
                    <FaUser className="text-[#006766] mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-[#474747]">You:</span>
                      <p className="text-[#1A1C1C] font-medium line-clamp-1">{objective.humanWork}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              {topObjectives.indexOf(objective) < topObjectives.length - 1 && (
                <div className="border-t border-gray-200 pt-3" />
              )}
            </div>
          )
        })}
      </div>

      {objectives.length > 3 && (
        <div className="mt-6 pt-4 text-center">
          <Link
            href="/objectives"
            className="text-sm text-accent-600 hover:text-accent-700 font-medium"
          >
            View {objectives.length - 3} more objective{objectives.length - 3 > 1 ? 's' : ''} →
          </Link>
        </div>
      )}
    </div>
  )
}
