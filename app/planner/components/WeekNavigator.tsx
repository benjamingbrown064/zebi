'use client'

import { format, addDays } from 'date-fns'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

interface VisibleDay {
  date: Date
  dayIndex: number
}

interface WeekNavigatorProps {
  currentStart: Date
  visibleDays: VisibleDay[]
  isMobile: boolean
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
}

export default function WeekNavigator({
  currentStart,
  visibleDays,
  isMobile,
  onPrevious,
  onNext,
  onToday,
}: WeekNavigatorProps) {
  // Calculate the end date based on visible days
  const endDate = visibleDays.length > 0 
    ? visibleDays[visibleDays.length - 1].date 
    : currentStart

  // Format the date range label
  const getRangeLabel = () => {
    if (isMobile) {
      // Mobile: just show the single day
      return format(currentStart, 'EEEE, MMM d, yyyy')
    } else {
      // Desktop: show 3-day range
      const start = format(currentStart, 'EEE d')
      const end = format(endDate, 'EEE d, MMM yyyy')
      return `${start} - ${end}`
    }
  }

  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onPrevious}
        className="flex items-center gap-2 px-4 py-2 text-[#525252] hover:bg-[#F5F5F5] rounded-[10px] transition-colors"
        aria-label={isMobile ? 'Previous day' : 'Previous 3 days'}
      >
        <FaChevronLeft className="w-4 h-4" />
        <span className="text-sm font-medium hidden sm:inline">
          {isMobile ? 'Prev Day' : 'Prev 3 Days'}
        </span>
      </button>

      <div className="flex items-center gap-3">
        <span className="text-lg font-medium text-[#1A1A1A]">
          {getRangeLabel()}
        </span>

        <button
          onClick={onToday}
          className="px-4 py-2 text-sm font-medium text-white bg-[#DD3A44] hover:bg-[#C2323B] rounded-[10px] transition-colors"
        >
          Today
        </button>
      </div>

      <button
        onClick={onNext}
        className="flex items-center gap-2 px-4 py-2 text-[#525252] hover:bg-[#F5F5F5] rounded-[10px] transition-colors"
        aria-label={isMobile ? 'Next day' : 'Next 3 days'}
      >
        <span className="text-sm font-medium hidden sm:inline">
          {isMobile ? 'Next Day' : 'Next 3 Days'}
        </span>
        <FaChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
