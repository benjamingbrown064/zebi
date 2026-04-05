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
  const isOver = percent > 100
  const barWidth = Math.min(percent, 100)

  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1 bg-[#E5E5E5] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isOver ? 'bg-[#EF4444]' : percent >= 75 ? 'bg-[#F59E0B]' : 'bg-[#1A1A1A]'
          }`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <span className="text-[10px] font-semibold text-[#A3A3A3] flex-shrink-0 tabular-nums">
        {totalHours}h / {capacity}h
      </span>
    </div>
  )
}
