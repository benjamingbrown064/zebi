'use client'

import { format } from 'date-fns'
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
  const endDate = visibleDays.length > 0 ? visibleDays[visibleDays.length - 1].date : currentStart

  return (
    <div className="flex items-center justify-between">
      {/* Left: month/year + range subtitle */}
      <div>
        <h1 className="text-[26px] font-bold text-[#1A1A1A] leading-tight">
          {format(currentStart, 'MMMM yyyy')}
        </h1>
        {!isMobile && (
          <p className="text-[12px] text-[#A3A3A3] mt-0.5 font-medium">
            {format(currentStart, 'EEE d')} — {format(endDate, 'EEE d MMM')}
          </p>
        )}
      </div>

      {/* Right: navigation pill group */}
      <div className="flex items-center border border-[#E5E5E5] rounded bg-white overflow-hidden">
        <button
          onClick={onPrevious}
          aria-label={isMobile ? 'Previous day' : 'Previous 3 days'}
          className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#474747] hover:bg-[#F3F3F3] transition-colors border-r border-[#E5E5E5]"
        >
          <FaChevronLeft className="w-2.5 h-2.5" />
          {isMobile ? 'Prev' : 'Prev 3 Days'}
        </button>
        <button
          onClick={onToday}
          className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1A1A1A] hover:bg-[#F3F3F3] transition-colors"
        >
          Today
        </button>
        <button
          onClick={onNext}
          aria-label={isMobile ? 'Next day' : 'Next 3 days'}
          className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#474747] hover:bg-[#F3F3F3] transition-colors border-l border-[#E5E5E5]"
        >
          {isMobile ? 'Next' : 'Next 3 Days'}
          <FaChevronRight className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  )
}
