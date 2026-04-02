'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faHouse,
  faInbox,
  faBullseyeArrow,
  faBox,
  faFlagCheckered,
  faFolderOpen,
  faListCheck,
  faGrid2,
  faFileLines,
  faBrain,
  faLightbulb,
  faChartLine,
  faMicrochip,
  faTimeline,
  faGear,
  faRightFromBracket,
  faChevronLeft,
  faChevronRight,
  faBars,
  faTimes,
  faCalendarWeek,
} from '@fortawesome/pro-duotone-svg-icons'

interface SidebarProps {
  workspaceName?: string
  isCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

interface NavItem {
  href: string
  icon: React.ReactNode
  label: string
}

export default function Sidebar({
  workspaceName = 'My Workspace',
  isCollapsed: initialCollapsed = false,
  onCollapsedChange,
}: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    onCollapsedChange?.(newState)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const NAV_ITEMS: NavItem[] = [
    { href: '/now', icon: <FontAwesomeIcon icon={faHouse} />, label: 'Now' },
    { href: '/inbox', icon: <FontAwesomeIcon icon={faInbox} />, label: 'Inbox' },
    { href: '/goals', icon: <FontAwesomeIcon icon={faBullseyeArrow} />, label: 'Goals' },
    { href: '/spaces', icon: <FontAwesomeIcon icon={faBox} />, label: 'Spaces' },
    { href: '/objectives', icon: <FontAwesomeIcon icon={faFlagCheckered} />, label: 'Objectives' },
    { href: '/projects', icon: <FontAwesomeIcon icon={faFolderOpen} />, label: 'Projects' },
    { href: '/tasks', icon: <FontAwesomeIcon icon={faListCheck} />, label: 'Tasks' },
    { href: '/board', icon: <FontAwesomeIcon icon={faGrid2} />, label: 'Board' },
    { href: '/planner', icon: <FontAwesomeIcon icon={faCalendarWeek} />, label: 'Weekly Planner' },
    { href: '/documents', icon: <FontAwesomeIcon icon={faFileLines} />, label: 'Documents' },
    { href: '/founder', icon: <FontAwesomeIcon icon={faChartLine} />, label: 'Founder View' },
    { href: '/queue', icon: <FontAwesomeIcon icon={faMicrochip} />, label: 'Agent Queue' },
    { href: '/activity', icon: <FontAwesomeIcon icon={faTimeline} />, label: 'Activity Feed' },
    { href: '/memory', icon: <FontAwesomeIcon icon={faBrain} />, label: 'AI Memory' },
    { href: '/insights', icon: <FontAwesomeIcon icon={faLightbulb} />, label: 'AI Insights' },
  ]

  async function handleLogout() {
    setIsLoading(true)
    try {
      // Call server-side logout API to clear all cookies
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }
      
      // Force a hard redirect to clear all client state
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout error:', error)
      // Even if API fails, try to redirect
      window.location.href = '/login'
    }
  }

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/')

  // Mobile
  if (isMobile) {
    return (
      <>
        {/* Mobile Header */}
        <div className="fixed top-0 left-0 right-0 h-16 bg-[#f6f3f2] flex items-center px-4 z-30">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-[#525252] hover:bg-[#F5F5F5] rounded-[10px] transition min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {isMobileMenuOpen ? <FontAwesomeIcon icon={faTimes} /> : <FontAwesomeIcon icon={faBars} />}
          </button>
          <div className="ml-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-[#DD3A44] rounded-[10px] flex items-center justify-center flex-shrink-0 text-sm font-bold text-white">
              Z
            </div>
            <span className="font-medium text-[#1A1A1A]">Zebi</span>
          </div>
        </div>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-20"
            onClick={closeMobileMenu}
          />
        )}

        {/* Mobile Sidebar */}
        <div
          className={`fixed left-0 top-16 w-64 h-[calc(100vh-64px)] bg-[#f6f3f2] flex flex-col transition-transform duration-300 z-30 ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium transition min-h-[44px] ${
                  isActive(item.href)
                    ? 'bg-[#FEF2F2] text-[#DD3A44]'
                    : 'text-[#525252] hover:bg-[#F5F5F5]'
                }`}
                onClick={closeMobileMenu}
              >
                <span className="text-base w-5 flex items-center justify-center">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="px-3 py-6 space-y-1">
            <Link
              href="/settings"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium transition min-h-[44px] ${
                isActive('/settings')
                  ? 'bg-[#FEF2F2] text-[#DD3A44]'
                  : 'text-[#525252] hover:bg-[#F5F5F5]'
              }`}
              onClick={closeMobileMenu}
            >
              <FontAwesomeIcon icon={faGear} className="w-5 text-base" />
              <span>Settings</span>
            </Link>

            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-[#525252] hover:bg-[#F5F5F5] transition disabled:opacity-50 min-h-[44px]"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="w-5 text-base" />
              <span>{isLoading ? 'Signing out...' : 'Sign out'}</span>
            </button>
          </div>
        </div>

        <div className="h-16" />
      </>
    )
  }

  // Desktop
  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-[#f6f3f2] flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className={`px-6 py-6 ${isCollapsed ? 'px-4' : ''}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-[#DD3A44] rounded-[10px] flex items-center justify-center flex-shrink-0 text-sm font-bold text-white">
            Z
          </div>
          {!isCollapsed && <span className="font-medium text-[#1A1A1A]">Zebi</span>}
        </div>

        {!isCollapsed && (
          <div className="px-3 py-2 rounded-[10px] hover:bg-[#F5F5F5] transition cursor-pointer">
            <p className="text-[12px] text-[#A3A3A3]">Workspace</p>
            <p className="text-[13px] font-medium text-[#1A1A1A] truncate">
              {workspaceName}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium transition min-h-[44px] ${
              isCollapsed ? 'justify-center' : ''
            } ${
              isActive(item.href)
                ? 'nav-item-active'
                : 'nav-item'
            }`}
            title={isCollapsed ? item.label : ''}
          >
            <span className="text-base w-5 flex items-center justify-center">
              {item.icon}
            </span>
            {!isCollapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Settings & Logout */}
      <div className="px-3 py-6 space-y-1">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium transition min-h-[44px] ${
            isCollapsed ? 'justify-center' : ''
          } ${
            isActive('/settings')
              ? 'nav-item-active'
              : 'nav-item'
          }`}
          title={isCollapsed ? 'Settings' : ''}
        >
          <FontAwesomeIcon icon={faGear} className="w-5 text-base" />
          {!isCollapsed && <span>Settings</span>}
        </Link>

        <button
          onClick={handleLogout}
          disabled={isLoading}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-[#525252] hover:bg-[#F5F5F5] transition disabled:opacity-50 min-h-[44px] ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Sign out' : ''}
        >
          <FontAwesomeIcon icon={faRightFromBracket} className="w-5 text-base" />
          {!isCollapsed && <span>{isLoading ? 'Signing out...' : 'Sign out'}</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <div className="px-3 py-4">
        <button
          onClick={toggleCollapse}
          className="w-full flex items-center justify-center px-3 py-2.5 rounded-[10px] text-[#525252] hover:bg-[#F5F5F5] transition min-h-[44px]"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? <FontAwesomeIcon icon={faChevronRight} /> : <FontAwesomeIcon icon={faChevronLeft} />}
        </button>
      </div>
    </div>
  )
}
