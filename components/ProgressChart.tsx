'use client'

interface ProgressEntry {
  entryDate: Date
  value: number
}

interface ProgressChartProps {
  progressEntries: ProgressEntry[]
  targetValue: number
  deadline: Date
  unit?: string
  height?: number
}

export default function ProgressChart({
  progressEntries,
  targetValue,
  deadline,
  unit,
  height = 300,
}: ProgressChartProps) {
  if (progressEntries.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200"
        style={{ height }}
      >
        <p className="text-gray-500">No progress data yet</p>
      </div>
    )
  }

  // Sort entries by date
  const sortedEntries = [...progressEntries].sort(
    (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
  )

  // Calculate chart dimensions
  const padding = 40
  const chartWidth = 800
  const chartHeight = height - padding * 2

  // Find min/max values
  const minValue = 0
  const maxValue = Math.max(targetValue, ...sortedEntries.map((e) => e.value))

  // Find min/max dates
  const minDate = new Date(sortedEntries[0].entryDate).getTime()
  const maxDate = new Date(deadline).getTime()

  // Scale functions
  const scaleX = (date: Date) => {
    const time = new Date(date).getTime()
    return padding + ((time - minDate) / (maxDate - minDate)) * (chartWidth - padding * 2)
  }

  const scaleY = (value: number) => {
    return padding + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight
  }

  // Generate path for progress line
  const progressPath = sortedEntries
    .map((entry, index) => {
      const x = scaleX(entry.entryDate)
      const y = scaleY(entry.value)
      return `${index === 0 ? 'M' : 'L'} ${x},${y}`
    })
    .join(' ')

  // Generate path for target line (diagonal from start to deadline)
  const targetPath = `M ${padding},${scaleY(0)} L ${scaleX(deadline)},${scaleY(targetValue)}`

  // Format value for labels
  const formatValue = (value: number) => {
    if (unit === 'GBP') {
      return `£${(value / 1000).toFixed(0)}k`
    }
    return value.toFixed(0)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-accent-500" />
          <span className="text-sm text-gray-600">Actual Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-gray-400 border-t-2 border-dashed" />
          <span className="text-sm text-gray-600">Target Trajectory</span>
        </div>
      </div>

      {/* Chart */}
      <svg width={chartWidth} height={height} className="overflow-visible">
        {/* Grid lines (horizontal) */}
        {[0, 0.25, 0.5, 0.75, 1].map((percent) => {
          const value = minValue + (maxValue - minValue) * percent
          const y = scaleY(value)
          return (
            <g key={percent}>
              <line
                x1={padding}
                y1={y}
                x2={chartWidth - padding}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text x={padding - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#6b7280">
                {formatValue(value)}
              </text>
            </g>
          )
        })}

        {/* Target line (dashed) */}
        <path
          d={targetPath}
          stroke="#9ca3af"
          strokeWidth="2"
          strokeDasharray="5,5"
          fill="none"
        />

        {/* Progress line */}
        <path d={progressPath} stroke="#3b82f6" strokeWidth="3" fill="none" />

        {/* Progress points */}
        {sortedEntries.map((entry, index) => {
          const x = scaleX(entry.entryDate)
          const y = scaleY(entry.value)
          return (
            <g key={index}>
              <circle cx={x} cy={y} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
              {/* Tooltip on hover */}
              <title>
                {new Date(entry.entryDate).toLocaleDateString()}: {formatValue(entry.value)}
              </title>
            </g>
          )
        })}

        {/* X-axis labels (dates) */}
        {[0, 0.5, 1].map((percent) => {
          const time = minDate + (maxDate - minDate) * percent
          const date = new Date(time)
          const x = scaleX(date)
          return (
            <text
              key={percent}
              x={x}
              y={height - 10}
              textAnchor="middle"
              fontSize="12"
              fill="#6b7280"
            >
              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
