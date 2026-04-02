'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faKeyboard, 
  faMicrophone, 
  faRobot,
  faCircleCheck,
  faArrowRight,
  faTrash,
  faEllipsisV,
  faClock
} from '@fortawesome/pro-duotone-svg-icons'

interface InboxItem {
  id: string
  rawText: string
  sourceType: string
  status: string
  capturedAt: string
  processedAt?: string
  transcript?: string
  cleanedText?: string
  assigneeId?: string
  projectId?: string
  dueDate?: string
  priority?: number
  aiProcessed: boolean
  aiSummary?: string
  aiSuggestions?: any
  convertedTaskIds?: string[]
  workspace?: { id: string; name: string }
  project?: { id: string; name: string }
}

interface InboxItemCardProps {
  item: InboxItem
  onUpdateStatus: (itemId: string, status: string) => void
  onDelete: (itemId: string) => void
  onConvert: (item: InboxItem) => void
}

const SOURCE_ICONS = {
  text: faKeyboard,
  voice: faMicrophone,
  ai_generated: faRobot,
}

const STATUS_COLORS = {
  unprocessed: 'bg-red-50 text-red-700 border-red-200',
  processed: 'bg-[#f0fafa] text-[#006766] border-transparent',
  converted: 'bg-[#f0fafa] text-[#006766] border-green-200',
  completed: 'bg-[#F3F3F3] text-[#5a5757] border-gray-200',
  archived: 'bg-[#F3F3F3] text-[#A3A3A3] border-gray-200',
}

export default function InboxItemCard({
  item,
  onUpdateStatus,
  onDelete,
  onConvert,
}: InboxItemCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const sourceIcon = SOURCE_ICONS[item.sourceType as keyof typeof SOURCE_ICONS] || faKeyboard
  const statusColor = STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.unprocessed

  const getRelativeTime = (timestamp: string) => {
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return then.toLocaleDateString()
  }

  const displayText = item.cleanedText || item.rawText
  const isLongText = displayText.length > 200

  return (
    <div className="bg-white rounded hover:border-gray-200 hover:shadow-[0_1px_3px_rgba(28,27,27,0.06)] transition">
      {/* Main Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Source Icon */}
          <div className="flex-shrink-0 w-10 h-10 bg-[#F3F3F3] rounded flex items-center justify-center">
            <FontAwesomeIcon icon={sourceIcon} className="text-[#5a5757]" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Text */}
            <div className="text-[#1c1b1b] mb-2">
              {isLongText && !isExpanded ? (
                <>
                  {displayText.substring(0, 200)}...{' '}
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="text-[#DD3A44] hover:underline text-sm font-medium"
                  >
                    Read more
                  </button>
                </>
              ) : (
                <>
                  {displayText}
                  {isLongText && isExpanded && (
                    <>
                      {' '}
                      <button
                        onClick={() => setIsExpanded(false)}
                        className="text-[#DD3A44] hover:underline text-sm font-medium"
                      >
                        Show less
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#A3A3A3]">
              <span className="flex items-center gap-1">
                <FontAwesomeIcon icon={faClock} />
                {getRelativeTime(item.capturedAt)}
              </span>

              {item.project && (
                <span className="px-2 py-0.5 bg-[#F3F3F3] rounded-md">
                  {item.project.name}
                </span>
              )}

              {item.aiProcessed && (
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md flex items-center gap-1">
                  <FontAwesomeIcon icon={faRobot} />
                  AI Enhanced
                </span>
              )}
            </div>

            {/* AI Summary */}
            {item.aiSummary && isExpanded && (
              <div className="mt-3 p-3 bg-purple-50 rounded border border-purple-100">
                <div className="text-xs font-semibold text-purple-900 mb-1">AI Summary</div>
                <div className="text-sm text-purple-800">{item.aiSummary}</div>
              </div>
            )}
          </div>

          {/* Actions Menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 hover:bg-[#F3F3F3] rounded transition"
            >
              <FontAwesomeIcon icon={faEllipsisV} className="text-[#5a5757]" />
            </button>

            {showActions && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowActions(false)}
                />
                {/* Menu */}
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded shadow-[0_20px_40px_rgba(28,27,27,0.06)] py-1 z-20">
                  {item.status === 'unprocessed' && (
                    <>
                      <button
                        onClick={() => {
                          onConvert(item)
                          setShowActions(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-[#5a5757] hover:bg-[#F3F3F3] flex items-center gap-2"
                      >
                        <FontAwesomeIcon icon={faArrowRight} className="text-[#006766]" />
                        Convert to Task
                      </button>
                      <button
                        onClick={() => {
                          onUpdateStatus(item.id, 'completed')
                          setShowActions(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-[#5a5757] hover:bg-[#F3F3F3] flex items-center gap-2"
                      >
                        <FontAwesomeIcon icon={faCircleCheck} className="text-[#006766]" />
                        Mark Complete
                      </button>
                    </>
                  )}

                  {item.status === 'processed' && (
                    <button
                      onClick={() => {
                        onConvert(item)
                        setShowActions(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-[#5a5757] hover:bg-[#F3F3F3] flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faArrowRight} className="text-[#006766]" />
                      Convert to Task
                    </button>
                  )}

                  <div className="border-t border-gray-100 my-1" />

                  <button
                    onClick={() => {
                      onDelete(item.id)
                      setShowActions(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="px-4 pb-3">
        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-md border ${statusColor}`}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </span>
      </div>
    </div>
  )
}
