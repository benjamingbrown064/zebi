'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SavedFilter } from '@/app/actions/filters'
import { FaFilter, FaChevronDown, FaTimes, FaCog } from 'react-icons/fa'

interface FilterDropdownProps {
  filters: SavedFilter[]
  activeFilterId?: string | null
  onFilterSelect: (filterId: string | null) => void
  onManageClick?: () => void
}

export default function FilterDropdown({
  filters,
  activeFilterId,
  onFilterSelect,
  onManageClick,
}: FilterDropdownProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const activeFilter = filters.find((f) => f.id === activeFilterId)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (filterId: string | null) => {
    onFilterSelect(filterId)
    setIsOpen(false)
  }

  const handleManage = () => {
    setIsOpen(false)
    if (onManageClick) {
      onManageClick()
    } else {
      router.push('/filters')
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-3 rounded border transition min-h-[44px] ${
          activeFilter
            ? 'bg-accent-50 border-accent-200 text-accent-700'
            : 'bg-white border-gray-200 text-[#5a5757] hover:bg-[#F3F3F3]'
        }`}
      >
        <FaFilter className="w-3.5 h-3.5" />
        <span className="text-sm font-medium">
          {activeFilter ? activeFilter.name : 'All tasks'}
        </span>
        <FaChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Active Filter Badge with Clear */}
      {activeFilter && (
        <button
          onClick={() => onFilterSelect(null)}
          className="ml-2 inline-flex items-center gap-1 px-2 py-2 bg-accent-100 text-accent-700 rounded-full text-xs hover:bg-accent-200 transition min-h-[44px]"
          title="Clear filter"
        >
          <FaTimes className="w-2.5 h-2.5" />
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-white rounded shadow-[0_20px_40px_rgba(28,27,27,0.06)] z-50 overflow-hidden max-h-[80vh] overflow-y-auto">
          {/* All Tasks Option */}
          <button
            onClick={() => handleSelect(null)}
            className={`w-full px-4 py-3 text-left text-sm hover:bg-[#F3F3F3] transition flex items-center gap-3 min-h-[44px] ${
              !activeFilterId ? 'bg-accent-50 text-accent-700' : 'text-[#5a5757]'
            }`}
          >
            <span className="flex-1">All tasks</span>
            {!activeFilterId && (
              <span className="text-xs text-accent-500">Active</span>
            )}
          </button>

          {/* Divider */}
          {filters.length > 0 && (
            <div className="border-t border-gray-100" />
          )}

          {/* Saved Filters */}
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => handleSelect(filter.id)}
              className={`w-full px-4 py-3 text-left text-sm hover:bg-[#F3F3F3] transition flex items-center gap-3 min-h-[44px] ${
                activeFilterId === filter.id ? 'bg-accent-50 text-accent-700' : 'text-[#5a5757]'
              }`}
            >
              <span className="flex-1 truncate">{filter.name}</span>
              {activeFilterId === filter.id && (
                <span className="text-xs text-accent-500">Active</span>
              )}
            </button>
          ))}

          {/* Empty State */}
          {filters.length === 0 && (
            <div className="px-4 py-3 text-sm text-[#A3A3A3] min-h-[44px] flex items-center">
              No saved filters yet
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Manage Filters Link */}
          <button
            onClick={handleManage}
            className="w-full px-4 py-3 text-left text-sm text-[#5a5757] hover:bg-[#F3F3F3] transition flex items-center gap-3 min-h-[44px]"
          >
            <FaCog className="w-3.5 h-3.5" />
            <span>Manage filters</span>
          </button>
        </div>
      )}
    </div>
  )
}
