'use client'

import { FaCheckCircle, FaCircle, FaExclamationCircle } from 'react-icons/fa'

interface Milestone {
  id: string
  title: string
  targetValue: number
  targetDate: Date
  completedAt?: Date | null
  status: string
}

interface MilestoneTimelineProps {
  milestones: Milestone[]
  currentValue: number
  unit?: string
}

export default function MilestoneTimeline({
  milestones,
  currentValue,
  unit,
}: MilestoneTimelineProps) {
  const formatValue = (value: number) => {
    if (unit === 'GBP') {
      return `£${(value / 1000).toFixed(0)}k`
    }
    return value.toString()
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusIcon = (milestone: Milestone) => {
    if (milestone.completedAt) {
      return <FaCheckCircle className="text-green-500" size={24} />
    }
    if (milestone.status === 'at_risk') {
      return <FaExclamationCircle className="text-yellow-500" size={24} />
    }
    if (currentValue >= milestone.targetValue) {
      return <FaCheckCircle className="text-green-500" size={24} />
    }
    return <FaCircle className="text-gray-300" size={24} />
  }

  const getStatusColor = (milestone: Milestone) => {
    if (milestone.completedAt || currentValue >= milestone.targetValue) {
      return 'border-green-500 bg-green-50'
    }
    if (milestone.status === 'at_risk') {
      return 'border-yellow-500 bg-yellow-50'
    }
    return 'border-gray-300 bg-white'
  }

  return (
    <div className="space-y-4">
      {milestones.map((milestone, index) => {
        const isCompleted = milestone.completedAt || currentValue >= milestone.targetValue
        const daysUntil = Math.ceil((new Date(milestone.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        const isOverdue = daysUntil < 0 && !isCompleted

        return (
          <div key={milestone.id} className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center">
                {getStatusIcon(milestone)}
              </div>
              {index < milestones.length - 1 && (
                <div className={`w-0.5 h-12 ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
              )}
            </div>

            {/* Content */}
            <div className={`flex-1 p-4 border-2 rounded-lg ${getStatusColor(milestone)}`}>
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{milestone.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Target: <strong>{formatValue(milestone.targetValue)}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {formatDate(milestone.targetDate)}
                  </p>
                  {!isCompleted && (
                    <p className={`text-xs font-medium ${isOverdue ? 'text-red-600' : daysUntil < 7 ? 'text-orange-600' : 'text-gray-500'}`}>
                      {isOverdue ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d remaining`}
                    </p>
                  )}
                  {isCompleted && (
                    <p className="text-xs font-medium text-green-600">
                      ✓ Complete
                    </p>
                  )}
                </div>
              </div>

              {/* Progress toward this milestone */}
              {!isCompleted && currentValue < milestone.targetValue && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>
                      {formatValue(milestone.targetValue - currentValue)} to go
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-500 transition-all duration-300"
                      style={{
                        width: `${Math.min((currentValue / milestone.targetValue) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
