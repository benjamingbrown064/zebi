'use client'

import { FaExclamationTriangle, FaBan, FaClock, FaCheckCircle } from 'react-icons/fa'

interface Blocker {
  id: string
  blockerType: string
  title: string
  description: string
  severity: string
  detectedAt: Date
  resolvedAt?: Date | null
  aiSuggestion?: any
}

interface BlockerCardProps {
  blocker: Blocker
  onResolve?: (blockerId: string) => void
}

export default function BlockerCard({ blocker, onResolve }: BlockerCardProps) {
  const isResolved = !!blocker.resolvedAt

  const severityConfig = {
    critical: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', icon: <FaBan /> },
    high: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', icon: <FaExclamationTriangle /> },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', icon: <FaExclamationTriangle /> },
    low: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', icon: <FaClock /> },
  }

  const config = severityConfig[blocker.severity as keyof typeof severityConfig] || severityConfig.medium

  const typeLabels: Record<string, string> = {
    velocity: 'Velocity',
    resource: 'Resource',
    dependency: 'Dependency',
    external: 'External',
    unknown: 'Unknown',
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div
      className={`p-4 border-2 rounded-lg ${
        isResolved ? 'bg-gray-50 border-gray-300 opacity-60' : `${config.bg} ${config.border}`
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`${isResolved ? 'text-gray-400' : config.text} text-xl`}>
          {isResolved ? <FaCheckCircle /> : config.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${isResolved ? 'bg-gray-200 text-gray-600' : `${config.bg} ${config.text}`}`}>
              {blocker.severity.toUpperCase()}
            </span>
            <span className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700">
              {typeLabels[blocker.blockerType]}
            </span>
            {isResolved && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                ✓ RESOLVED
              </span>
            )}
          </div>
          <h4 className="font-semibold text-gray-900">{blocker.title}</h4>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-700 mb-3">{blocker.description}</p>

      {/* AI Suggestion */}
      {blocker.aiSuggestion && !isResolved && (
        <div className="mb-3 p-3 bg-white border border-accent-200 rounded-lg">
          <p className="text-xs font-medium text-accent-700 mb-1">💡 AI Suggestion:</p>
          <p className="text-sm text-gray-700">{blocker.aiSuggestion.suggestion || JSON.stringify(blocker.aiSuggestion)}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>
          {isResolved ? 'Resolved' : 'Detected'}: {formatDate(isResolved ? blocker.resolvedAt! : blocker.detectedAt)}
        </span>
        {!isResolved && onResolve && (
          <button
            onClick={() => onResolve(blocker.id)}
            className="px-3 py-1 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Mark Resolved
          </button>
        )}
      </div>
    </div>
  )
}
