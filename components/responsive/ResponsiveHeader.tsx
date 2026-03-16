'use client'

import { ReactNode } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEllipsisVertical } from '@fortawesome/pro-duotone-svg-icons'
import OverflowMenu from './OverflowMenu'

interface ResponsiveHeaderProps {
  /** Page title */
  title: string
  /** Optional subtitle/breadcrumb */
  subtitle?: string
  /** Primary action button (always visible) */
  primaryAction?: ReactNode
  /** Secondary actions (visible on desktop, overflow menu on mobile) */
  secondaryActions?: Array<{
    label: string
    icon?: ReactNode
    onClick: () => void
    variant?: 'default' | 'danger'
  }>
  /** Custom content between title and actions */
  children?: ReactNode
}

export default function ResponsiveHeader({
  title,
  subtitle,
  primaryAction,
  secondaryActions = [],
  children,
}: ResponsiveHeaderProps) {
  return (
    <div className="bg-white border-b border-[#E5E5E5] sticky top-0 z-10">
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Mobile Layout (< 768px) */}
        <div className="block md:hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-[#1A1A1A] truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-[#A3A3A3] truncate mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            <div className="ml-4 flex items-center gap-2">
              {primaryAction}
              {secondaryActions.length > 0 && (
                <OverflowMenu actions={secondaryActions} />
              )}
            </div>
          </div>
          {children && <div className="mt-3">{children}</div>}
        </div>

        {/* Tablet/Desktop Layout (>= 768px) */}
        <div className="hidden md:block">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl lg:text-3xl font-semibold text-[#1A1A1A]">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-[#A3A3A3] mt-1">
                  {subtitle}
                </p>
              )}
              {children && <div className="mt-4">{children}</div>}
            </div>
            <div className="ml-6 flex items-center gap-2 flex-shrink-0">
              {/* Desktop: Show all secondary actions */}
              {secondaryActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`
                    hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-medium transition min-h-[44px]
                    ${
                      action.variant === 'danger'
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-[#F5F5F5] text-[#525252] hover:bg-[#E5E5E5]'
                    }
                  `}
                >
                  {action.icon && <span className="text-base">{action.icon}</span>}
                  <span>{action.label}</span>
                </button>
              ))}
              {/* Tablet: Overflow menu for secondary actions if space is tight */}
              {secondaryActions.length > 2 && (
                <div className="lg:hidden">
                  <OverflowMenu actions={secondaryActions} />
                </div>
              )}
              {/* Primary action always visible */}
              {primaryAction}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
