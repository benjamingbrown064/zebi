interface TaskCardProps {
  title: string
  priority?: number
  goalTag?: string
  dueTime?: string
  completed?: boolean
  onCheck?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClick?: () => void
}

export default function TaskCard({
  title,
  priority = 3,
  goalTag,
  dueTime,
  completed = false,
  onCheck,
  onClick,
}: TaskCardProps) {
  const priorityColors: Record<number, string> = {
    1: 'bg-red-100 text-red-700',
    2: 'bg-orange-100 text-orange-700',
    3: 'bg-yellow-100 text-yellow-700',
    4: 'bg-gray-100 text-gray-700',
  }

  const priorityLabels: Record<number, string> = {
    1: 'P1',
    2: 'P2',
    3: 'P3',
    4: 'P4',
  }

  return (
    <div
      onClick={onClick}
      className="card-base p-4 card-hover group min-h-[44px] flex items-center"
    >
      <div className="flex items-center gap-3 w-full">
        <input
          type="checkbox"
          checked={completed}
          onChange={onCheck}
          onClick={(e) => e.stopPropagation()}
          className="w-5 h-5 rounded border-gray-300 cursor-pointer flex-shrink-0 accent-accent-500"
        />

        <div className="flex-1 min-w-0">
          <p
            className={`font-medium text-gray-900 truncate ${
              completed ? 'line-through text-gray-500' : ''
            }`}
          >
            {title}
          </p>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-1 rounded font-medium ${priorityColors[priority]}`}>
              {priorityLabels[priority]}
            </span>

            {goalTag && (
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                {goalTag}
              </span>
            )}

            {dueTime && (
              <span className="text-xs text-gray-500">{dueTime}</span>
            )}
          </div>
        </div>

        {/* Hover actions */}
        <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
            }}
            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition"
            title="More options"
          >
            ⋯
          </button>
        </div>
      </div>
    </div>
  )
}
