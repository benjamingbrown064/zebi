'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEllipsisVertical } from '@fortawesome/pro-duotone-svg-icons'

interface OverflowMenuAction {
  label: string
  icon?: ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
  disabled?: boolean
}

interface OverflowMenuProps {
  actions: OverflowMenuAction[]
  /** Button variant */
  buttonVariant?: 'icon' | 'button'
  /** Button label (for 'button' variant) */
  buttonLabel?: string
}

export default function OverflowMenu({
  actions,
  buttonVariant = 'icon',
  buttonLabel = 'More',
}: OverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleActionClick = (action: OverflowMenuAction) => {
    if (!action.disabled) {
      action.onClick()
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      {buttonVariant === 'icon' ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2.5 text-[#525252] hover:bg-[#F5F5F5] rounded-[10px] transition min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="More actions"
        >
          <FontAwesomeIcon icon={faEllipsisVertical} className="text-lg" />
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#F5F5F5] text-[#525252] hover:bg-[#E5E5E5] rounded-[10px] text-[13px] font-medium transition min-h-[44px]"
        >
          <span>{buttonLabel}</span>
          <FontAwesomeIcon icon={faEllipsisVertical} className="text-base" />
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white  rounded-[10px] shadow-[0_20px_40px_rgba(28,27,27,0.06)] overflow-hidden z-50">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              disabled={action.disabled}
              className={`
                w-full flex items-center gap-3 px-4 py-3 text-left text-[13px] font-medium transition min-h-[44px]
                ${
                  action.variant === 'danger'
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-[#525252] hover:bg-[#F5F5F5]'
                }
                ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${index !== actions.length - 1 ? 'border-b border-[#E5E5E5]' : ''}
              `}
            >
              {action.icon && (
                <span className="text-base w-5 flex items-center justify-center flex-shrink-0">
                  {action.icon}
                </span>
              )}
              <span className="flex-1">{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
