'use client'

/**
 * PageShell — Monolith Editorial
 *
 * Consistent page wrapper used by every top-level page.
 * Provides: sidebar, sticky top bar with CaptureBar, page header.
 * Use instead of rolling each page's own layout.
 */

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import CaptureBar from '@/components/CaptureBar'

interface PageShellProps {
  /** Page title shown in the sticky header */
  title: string
  /** Optional subtitle / breadcrumb below title */
  subtitle?: string
  /** Optional right-side action buttons in the header */
  actions?: React.ReactNode
  /** Page body content */
  children: React.ReactNode
  /** Called when capture bar captures something */
  onCapture?: () => void
}

export default function PageShell({
  title,
  subtitle,
  actions,
  children,
  onCapture,
}: PageShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const mainClass = isMobile ? '' : sidebarCollapsed ? 'ml-[60px]' : 'ml-64'

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <div className={`${mainClass} transition-all duration-200`}>
        {/* ── Sticky top bar ── */}
        <div className="sticky top-0 z-30 bg-[#F9F9F9] border-b border-[#E5E5E5] px-4 md:px-8 py-3">
          <div className="max-w-[1400px] mx-auto">
            <CaptureBar onCaptured={onCapture} />
          </div>
        </div>

        {/* ── Page content ── */}
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-6 pb-12">
          {/* Page header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-[22px] font-bold text-[#1A1C1C] leading-tight">{title}</h1>
              {subtitle && (
                <p className="text-[13px] text-[#474747] mt-0.5">{subtitle}</p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {actions}
              </div>
            )}
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
