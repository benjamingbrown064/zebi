'use client'

interface DayCapacityMeterProps {
  totalHours: number
  capacity: number
  percent: number
}

export default function DayCapacityMeter({
  totalHours,
  capacity,
  percent,
}: DayCapacityMeterProps) {
  // Color coding based on capacity
  const getColor = () => {
    if (percent < 60) return 'bg-[#10B981]' // Green
    if (percent < 90) return 'bg-[#F59E0B]' // Yellow
    return 'bg-[#EF4444]' // Red
  }

  const getBgColor = () => {
    if (percent < 60) return 'bg-[#ECFDF5]' // Green bg
    if (percent < 90) return 'bg-[#FFFBEB]' // Yellow bg
    return 'bg-[#FEF2F2]' // Red bg
  }

  const getTextColor = () => {
    if (percent < 60) return 'text-[#10B981]'
    if (percent < 90) return 'text-[#F59E0B]'
    return 'text-[#EF4444]'
  }

  const cappedPercent = Math.min(percent, 100)

  return (
    <div className="space-y-1">
      {/* Progress bar */}
      <div className={`h-1.5 rounded-full overflow-hidden ${getBgColor()}`}>
        <div
          className={`h-full transition-all duration-300 ${getColor()}`}
          style={{ width: `${cappedPercent}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium ${getTextColor()}`}>
          {totalHours}h / {capacity}h
        </span>
        <span className={`${getTextColor()}`}>
          {Math.round(percent)}%
        </span>
      </div>
    </div>
  )
}
