'use client'

import { useState, ReactNode } from 'react'
import Sidebar from './Sidebar'

interface DashboardLayoutProps {
  children: ReactNode
  workspaceName?: string
}

export default function DashboardLayout({
  children,
  workspaceName,
}: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-[#f6f3f2]">
      <Sidebar
        workspaceName={workspaceName}
        isCollapsed={isCollapsed}
        onCollapsedChange={setIsCollapsed}
      />

      {/* Main content with dynamic margin */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        {children}
      </div>
    </div>
  )
}
