'use client'

import { format, addDays } from 'date-fns'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

interface WeekNavigatorProps {
  weekStart: Date
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
}

export default function WeekNavigator({
  weekStart,
  onPrevious,
  onNext,
  onToday,
}: WeekNavigatorProps) {
  const weekEnd = addDays(weekStart, 6)

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onPrevious}
        className="p-2 text-[#525252] hover:bg-[#F5F5F5] rounded-[10px] transition-colors"
        aria-label="Previous week"
      >
        <FaChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-3">
        <span className="text-lg font-medium text-[#1A1A1A]">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </span>

        <button
          onClick={onToday}
          className="px-4 py-2 text-sm font-medium text-[#525252] hover:bg-[#F5F5F5] rounded-[10px] transition-colors"
        >
          Today
        </button>
      </div>

      <button
        onClick={onNext}
        className="p-2 text-[#525252] hover:bg-[#F5F5F5] rounded-[10px] transition-colors"
        aria-label="Next week"
      >
        <FaChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
