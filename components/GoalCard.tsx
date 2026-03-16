interface GoalCardProps {
  name: string
  current: number
  target: number
  unit?: string
  dueDate?: string
  status?: 'on-track' | 'behind' | 'at-risk'
  onClick?: () => void
}

export default function GoalCard({
  name,
  current,
  target,
  unit = '',
  dueDate,
  status = 'on-track',
  onClick,
}: GoalCardProps) {
  const progress = Math.round((current / target) * 100)

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    'on-track': {
      bg: 'bg-green-100',
      text: 'text-green-700',
      label: 'On track',
    },
    behind: {
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      label: 'Behind',
    },
    'at-risk': {
      bg: 'bg-red-100',
      text: 'text-red-700',
      label: 'At risk',
    },
  }

  const { bg, text, label } = statusColors[status]

  return (
    <div
      onClick={onClick}
      className="card-base p-4 card-hover cursor-pointer space-y-3"
    >
      <p className="font-semibold text-gray-900">{name}</p>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-600">
          <span>Progress</span>
          <span>
            {current}
            {unit && ` ${unit}`} / {target}
            {unit && ` ${unit}`}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-accent-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Status & Due Date */}
      <div className="flex items-center justify-between">
        {dueDate && <span className="text-xs text-gray-500">Due: {dueDate}</span>}
        <span className={`text-xs px-2 py-1 rounded font-medium ${bg} ${text}`}>
          {label}
        </span>
      </div>
    </div>
  )
}
