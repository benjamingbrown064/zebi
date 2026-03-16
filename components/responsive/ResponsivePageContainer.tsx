'use client'

import { ReactNode } from 'react'

interface ResponsivePageContainerProps {
  children: ReactNode
  /** Maximum width for content (default: full) */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Add padding (default: true) */
  padding?: boolean
  /** Custom className */
  className?: string
}

const maxWidthClasses = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
}

export default function ResponsivePageContainer({
  children,
  maxWidth = 'full',
  padding = true,
  className = '',
}: ResponsivePageContainerProps) {
  return (
    <div
      className={`
        w-full mx-auto
        ${maxWidthClasses[maxWidth]}
        ${padding ? 'px-4 sm:px-6 lg:px-8' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
