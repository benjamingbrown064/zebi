'use client'

import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import {
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingUp,
  Zap,
  MessageSquare,
  Target,
} from 'lucide-react'

interface AIActivityItemProps {
  activity: {
    id: string
    type: string
    title: string
    description: string
    reasoning: string
    confidence: number
    status: string
    createdAt: string
    actions: any[]
    context?: {
      entityType?: string
      entityId?: string
    }
  }
}

export default function AIActivityItem({ activity }: AIActivityItemProps) {
  const icon = getIconForType(activity.type)
  const color = getColorForType(activity.type)
  const bgColor = getBgColorForType(activity.type)
  const isCritical = activity.confidence >= 90

  // Extract navigation URL from actions
  const navigationAction = activity.actions?.find((a) => a.type === 'navigate')
  const url = navigationAction?.params?.url

  const timeAgo = formatDistanceToNow(new Date(activity.createdAt), {
    addSuffix: true,
  })

  return (
    <div
      className={`relative flex gap-3 p-3 rounded-lg border ${
        isCritical
          ? 'border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20'
          : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50'
      } transition-colors`}
    >
      {/* Icon */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${bgColor}`}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1">
            {url ? (
              <Link
                href={url}
                className="font-medium text-sm text-gray-900 dark:text-gray-100 hover:underline"
              >
                {activity.title}
              </Link>
            ) : (
              <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                {activity.title}
              </h4>
            )}
          </div>

          {/* Priority Badge */}
          {isCritical && (
            <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded">
              Critical
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          {activity.description}
        </p>

        {/* Footer */}
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
          <span>{timeAgo}</span>
          <span className="flex items-center gap-1">
            <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
            {activity.type}
          </span>
          {activity.confidence && (
            <span>{activity.confidence}% confidence</span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Get icon component for activity type
 */
function getIconForType(type: string) {
  const iconClass = 'w-4 h-4'

  switch (type) {
    case 'risk':
      return <AlertTriangle className={`${iconClass} text-red-600`} />
    case 'warning':
      return <AlertTriangle className={`${iconClass} text-orange-600`} />
    case 'opportunity':
      return <TrendingUp className={`${iconClass} text-green-600`} />
    case 'alert':
      return <Zap className={`${iconClass} text-yellow-600`} />
    case 'task':
    case 'objective':
      return <Target className={`${iconClass} text-blue-600`} />
    case 'suggestion':
      return <MessageSquare className={`${iconClass} text-purple-600`} />
    default:
      return <Info className={`${iconClass} text-gray-600`} />
  }
}

/**
 * Get color class for activity type
 */
function getColorForType(type: string): string {
  switch (type) {
    case 'risk':
      return 'bg-red-500'
    case 'warning':
      return 'bg-orange-500'
    case 'opportunity':
      return 'bg-green-500'
    case 'alert':
      return 'bg-yellow-500'
    case 'task':
    case 'objective':
      return 'bg-blue-500'
    case 'suggestion':
      return 'bg-purple-500'
    default:
      return 'bg-gray-500'
  }
}

/**
 * Get background color for icon
 */
function getBgColorForType(type: string): string {
  switch (type) {
    case 'risk':
      return 'bg-red-100 dark:bg-red-900/30'
    case 'warning':
      return 'bg-orange-100 dark:bg-orange-900/30'
    case 'opportunity':
      return 'bg-green-100 dark:bg-green-900/30'
    case 'alert':
      return 'bg-yellow-100 dark:bg-yellow-900/30'
    case 'task':
    case 'objective':
      return 'bg-blue-100 dark:bg-blue-900/30'
    case 'suggestion':
      return 'bg-purple-100 dark:bg-purple-900/30'
    default:
      return 'bg-gray-100 dark:bg-gray-800'
  }
}
