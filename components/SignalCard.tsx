import { FaExclamationTriangle, FaBan, FaChartLine, FaClock, FaAt } from 'react-icons/fa'

interface SignalCardProps {
  type: 'overdue' | 'blocked' | 'at-risk' | 'due-soon' | 'mentioned'
  title: string
  description: string
  onDismiss?: () => void
  onClick?: () => void
}

export default function SignalCard({
  type,
  title,
  description,
  onDismiss,
  onClick,
}: SignalCardProps) {
  const typeConfig: Record<
    string,
    { icon: React.ReactNode; label: string; color: string }
  > = {
    overdue: {
      icon: <FaExclamationTriangle />,
      label: 'Overdue',
      color: 'text-red-600',
    },
    blocked: { icon: <FaBan />, label: 'Blocked', color: 'text-orange-600' },
    'at-risk': {
      icon: <FaChartLine />,
      label: 'At risk',
      color: 'text-red-600',
    },
    'due-soon': { icon: <FaClock />, label: 'Due soon', color: 'text-orange-600' },
    mentioned: { icon: <FaAt />, label: 'Mentioned', color: 'text-[#006766]' },
  }

  const config = typeConfig[type] || typeConfig.overdue

  return (
    <div
      onClick={onClick}
      className="card-base p-4 card-hover cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`text-xs font-semibold uppercase flex items-center gap-2 ${config.color}`}>
            <span className="text-sm">{config.icon}</span>
            {config.label}
          </p>
          <p className="font-medium text-[#1c1b1b] mt-1">{title}</p>
          <p className="text-xs text-[#5a5757] mt-1">{description}</p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismiss?.()
          }}
          className="ml-2 text-[#C4C0C0] hover:text-[#5a5757] transition flex-shrink-0"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
