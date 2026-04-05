'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { useWorkspace } from '@/lib/use-workspace'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { workspaceId, loading } = useWorkspace()
  const router = useRouter()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!loading && !workspaceId) {
      router.replace('/login')
    }
  }, [loading, workspaceId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F3F3] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#E5E5E5] border-t-[#1A1C1C] rounded-full animate-spin" />
      </div>
    )
  }

  if (!workspaceId) return null

  const mainClass = isMobile ? '' : sidebarCollapsed ? 'ml-[60px]' : 'ml-64'

  return (
    <div className="min-h-screen bg-[#F3F3F3]">
      {/* Sidebar renders ONCE — never remounts on navigation */}
      <Sidebar
        workspaceName="Zebi"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div className={`${mainClass} transition-all duration-200`}>
        {children}
      </div>
    </div>
  )
}
