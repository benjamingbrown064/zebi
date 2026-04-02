'use client'

import { ReactNode } from 'react'
import Link from 'next/link'

interface MobileListItemProps {
  /** Item title */
  title: string
  /** Item description/subtitle */
  description?: string
  /** Icon or avatar (left side) */
  icon?: ReactNode
  /** Status badge or metadata */
  badge?: ReactNode
  /** Additional metadata (bottom) */
  metadata?: Array<{
    label: string
    value: string | ReactNode
  }>
  /** Click handler (if not using href) */
  onClick?: () => void
  /** Link href (if using as link) */
  href?: string
  /** Action buttons (right side on desktop, bottom on mobile) */
  actions?: ReactNode
}

export default function MobileListItem({
  title,
  description,
  icon,
  badge,
  metadata,
  onClick,
  href,
  actions,
}: MobileListItemProps) {
  const content = (
    <>
      {/* Main content */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {/* Icon/Avatar */}
        {icon && (
          <div className="flex-shrink-0 mt-1">
            {icon}
          </div>
        )}

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-medium text-[#1A1A1A] truncate">
              {title}
            </h3>
            {badge && (
              <div className="flex-shrink-0">
                {badge}
              </div>
            )}
          </div>

          {description && (
            <p className="text-[13px] text-[#A3A3A3] line-clamp-2 mt-1">
              {description}
            </p>
          )}

          {/* Metadata */}
          {metadata && metadata.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {metadata.map((item, index) => (
                <div key={index} className="flex items-center gap-1.5 text-[12px]">
                  <span className="text-[#A3A3A3]">{item.label}:</span>
                  <span className="text-[#525252] font-medium">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions (mobile: full-width at bottom, desktop: right side) */}
      {actions && (
        <>
          {/* Desktop: Right side */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0 ml-4">
            {actions}
          </div>

          {/* Mobile: Bottom */}
          <div className="flex md:hidden items-center gap-2 mt-3 pt-3">
            {actions}
          </div>
        </>
      )}
    </>
  )

  // Wrapper (link or button)
  if (href) {
    return (
      <Link
        href={href}
        className="block bg-white  rounded p-4 hover:shadow-[0_4px_12px_rgba(28,27,27,0.08)] transition"
      >
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left bg-white  rounded p-4 hover:shadow-[0_4px_12px_rgba(28,27,27,0.08)] transition"
      >
        {content}
      </button>
    )
  }

  return (
    <div className="bg-white  rounded p-4">
      {content}
    </div>
  )
}
