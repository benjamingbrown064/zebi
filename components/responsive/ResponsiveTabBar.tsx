'use client'

import { useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'

export interface Tab {
  id: string
  label: string
  icon?: IconDefinition
  count?: number
}

interface ResponsiveTabBarProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  /** Stick to top when scrolling (default: false) */
  sticky?: boolean
}

export default function ResponsiveTabBar({
  tabs,
  activeTab,
  onTabChange,
  sticky = false,
}: ResponsiveTabBarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLButtonElement>(null)

  // Auto-scroll to active tab on mobile
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const activeElement = activeTabRef.current
      const containerRect = container.getBoundingClientRect()
      const activeRect = activeElement.getBoundingClientRect()

      if (
        activeRect.left < containerRect.left ||
        activeRect.right > containerRect.right
      ) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        })
      }
    }
  }, [activeTab])

  return (
    <div
      className={`
        bg-white border-b border-[#E5E5E5]
        ${sticky ? 'sticky top-0 z-10' : ''}
      `}
    >
      {/* Mobile: Horizontal scroll */}
      <div
        ref={scrollContainerRef}
        className="
          flex gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8 py-2
          scrollbar-hide
          [-webkit-overflow-scrolling:touch]
        "
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab

          return (
            <button
              key={tab.id}
              ref={isActive ? activeTabRef : null}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-medium
                transition whitespace-nowrap min-h-[44px]
                ${
                  isActive
                    ? 'bg-[#FEF2F2] text-[#DD3A44]'
                    : 'text-[#525252] hover:bg-[#F5F5F5]'
                }
              `}
            >
              {tab.icon && (
                <FontAwesomeIcon icon={tab.icon} className="text-base" />
              )}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`
                    px-2 py-0.5 rounded-full text-[11px] font-semibold
                    ${
                      isActive
                        ? 'bg-[#DD3A44] text-white'
                        : 'bg-[#E5E5E5] text-[#525252]'
                    }
                  `}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
