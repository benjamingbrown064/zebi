'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faHouse,
  faBox,
  faBrain,
  faGear,
  faRightFromBracket,
  faChevronLeft,
  faChevronRight,
  faBars,
  faTimes,
  faInbox,
  faBullseyeArrow,
  faFlagCheckered,
  faFolderOpen,
  faListCheck,
  faGrid2,
  faCalendarWeek,
  faFileLines,
  faLightbulb,
  faChartLine,
  faMicrochip,
  faTimeline,
  faSearch,
} from '@fortawesome/pro-duotone-svg-icons'
import GlobalSearch from './GlobalSearch'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  href: string
  icon: any
  label: string
}

interface SidebarProps {
  workspaceName?: string
  isCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

// ─── Nav definitions ─────────────────────────────────────────────────────────

const PRIMARY_NAV: NavItem[] = [
  { href: '/now',      icon: faHouse,  label: 'Now' },
  { href: '/spaces',   icon: faBox,    label: 'Spaces' },
  { href: '/memory',   icon: faBrain,  label: 'Memory' },
]

const MORE_NAV: NavItem[] = [
  { href: '/tasks',       icon: faListCheck,     label: 'Tasks' },
  { href: '/board',       icon: faGrid2,         label: 'Board' },
  { href: '/planner',     icon: faCalendarWeek,  label: 'Weekly Planner' },
  { href: '/projects',    icon: faFolderOpen,    label: 'Projects' },
  { href: '/objectives',  icon: faFlagCheckered, label: 'Objectives' },
  { href: '/goals',       icon: faBullseyeArrow, label: 'Goals' },
  { href: '/documents',   icon: faFileLines,     label: 'Documents' },
  { href: '/inbox',       icon: faInbox,         label: 'Inbox' },
  { href: '/insights',    icon: faLightbulb,     label: 'AI Insights' },
  { href: '/founder',     icon: faChartLine,     label: 'Founder View' },
  { href: '/queue',       icon: faMicrochip,     label: 'Agent Queue' },
  { href: '/activity',    icon: faTimeline,      label: 'Activity Feed' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function NavLink({
  item,
  collapsed,
  onClick,
}: {
  item: NavItem
  collapsed: boolean
  onClick?: () => void
}) {
  const pathname = usePathname()
  const active = pathname === item.href || pathname?.startsWith(item.href + '/')

  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded text-[13px] font-medium transition min-h-[44px] ${
        collapsed ? 'justify-center' : ''
      } ${
        active
          ? 'bg-[#1A1A1A] text-white'
          : 'text-[#525252] hover:bg-[#F3F3F3]'
      }`}
    >
      <span className="text-base w-5 flex items-center justify-center flex-shrink-0">
        <FontAwesomeIcon icon={item.icon} />
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────

function DesktopSidebar({
  workspaceName,
  isCollapsed,
  onCollapsedChange,
}: {
  workspaceName: string
  isCollapsed: boolean
  onCollapsedChange: (v: boolean) => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // CMD+K / CTRL+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  async function handleLogout() {
    setIsLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      if (typeof window !== 'undefined') { localStorage.clear(); sessionStorage.clear() }
      window.location.href = '/login'
    } catch {
      window.location.href = '/login'
    }
  }

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-[#F3F3F3] flex flex-col transition-all duration-300 z-20 ${
        isCollapsed ? 'w-[60px]' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 bg-[#000000] rounded flex items-center justify-center flex-shrink-0 text-sm font-bold text-white">
          Z
        </div>
        {!isCollapsed && (
          <span className="font-semibold text-[14px] text-[#1A1A1A] truncate">{workspaceName}</span>
        )}
      </div>

      {/* Search button */}
      <div className="px-3 mb-2">
        <button
          onClick={() => setIsSearchOpen(true)}
          title={isCollapsed ? 'Search (Cmd+K)' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-[13px] font-medium transition min-h-[44px] text-[#525252] hover:bg-[#F3F3F3] ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <span className="text-base w-5 flex items-center justify-center flex-shrink-0">
            <FontAwesomeIcon icon={faSearch} />
          </span>
          {!isCollapsed && <span className="truncate">Search</span>}
          {!isCollapsed && (
            <span className="ml-auto text-[10px] text-[#A3A3A3] font-mono">⌘K</span>
          )}
        </button>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 overflow-y-auto">
        <div className="space-y-0.5 mb-2">
          {PRIMARY_NAV.map(item => (
            <NavLink key={item.href} item={item} collapsed={isCollapsed} />
          ))}
        </div>

        {/* Divider */}
        {!isCollapsed && (
          <div className="my-2 border-t border-[#E5E5E5]" />
        )}

        {/* All navigation items */}
        <div className="space-y-0.5">
          {MORE_NAV.map(item => (
            <NavLink key={item.href} item={item} collapsed={isCollapsed} />
          ))}
        </div>
      </nav>

      {/* Bottom: settings + logout */}
      <div className="px-3 py-4 space-y-0.5 border-t border-[#E5E5E5]">
        <NavLink item={{ href: '/settings', icon: faGear, label: 'Settings' }} collapsed={isCollapsed} />
        <button
          onClick={handleLogout}
          disabled={isLoading}
          title={isCollapsed ? 'Sign out' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-[13px] font-medium text-[#525252] hover:bg-[#F3F3F3] transition disabled:opacity-50 min-h-[44px] ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <span className="text-base w-5 flex items-center justify-center flex-shrink-0">
            <FontAwesomeIcon icon={faRightFromBracket} />
          </span>
          {!isCollapsed && <span>{isLoading ? 'Signing out…' : 'Sign out'}</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <div className="px-3 pb-4">
        <button
          onClick={() => onCollapsedChange(!isCollapsed)}
          title={isCollapsed ? 'Expand' : 'Collapse'}
          className="w-full flex items-center justify-center py-2 rounded text-[#A3A3A3] hover:text-[#525252] hover:bg-[#F3F3F3] transition"
        >
          <FontAwesomeIcon icon={isCollapsed ? faChevronRight : faChevronLeft} />
        </button>
      </div>

      {/* Global Search Modal */}
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  )
}

// ─── Mobile Sidebar ───────────────────────────────────────────────────────────

function MobileSidebar({ workspaceName }: { workspaceName: string }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // CMD+K / CTRL+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  async function handleLogout() {
    setIsLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      if (typeof window !== 'undefined') { localStorage.clear(); sessionStorage.clear() }
      window.location.href = '/login'
    } catch {
      window.location.href = '/login'
    }
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-[#F3F3F3] border-b border-[#E5E5E5] flex items-center px-4 z-30">
        <button
          onClick={() => setOpen(v => !v)}
          className="p-2 text-[#525252] rounded hover:bg-[#F3F3F3] transition"
        >
          <FontAwesomeIcon icon={open ? faTimes : faBars} />
        </button>
        <div className="ml-3 flex items-center gap-2">
          <div className="w-7 h-7 bg-[#000000] rounded flex items-center justify-center text-xs font-bold text-white">Z</div>
          <span className="font-semibold text-[13px] text-[#1A1A1A]">Zebi</span>
        </div>
        <button
          onClick={() => setIsSearchOpen(true)}
          className="ml-auto p-2 text-[#525252] rounded hover:bg-[#F3F3F3] transition"
        >
          <FontAwesomeIcon icon={faSearch} />
        </button>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-20"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed left-0 top-14 w-64 h-[calc(100vh-56px)] bg-[#F3F3F3] flex flex-col z-30 transition-transform duration-300 overflow-y-auto ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="flex-1 px-3 py-4">
          <div className="space-y-0.5 mb-2">
            {PRIMARY_NAV.map(item => (
              <NavLink key={item.href} item={item} collapsed={false} onClick={() => setOpen(false)} />
            ))}
          </div>

          <div className="my-2 border-t border-[#E5E5E5]" />

          <div className="space-y-0.5">
            {MORE_NAV.map(item => (
              <NavLink key={item.href} item={item} collapsed={false} onClick={() => setOpen(false)} />
            ))}
          </div>
        </nav>

        <div className="px-3 py-4 border-t border-[#E5E5E5] space-y-0.5">
          <NavLink item={{ href: '/settings', icon: faGear, label: 'Settings' }} collapsed={false} onClick={() => setOpen(false)} />
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-[13px] font-medium text-[#525252] hover:bg-[#F3F3F3] transition min-h-[44px]"
          >
            <span className="text-base w-5 flex items-center justify-center flex-shrink-0">
              <FontAwesomeIcon icon={faRightFromBracket} />
            </span>
            <span>{isLoading ? 'Signing out…' : 'Sign out'}</span>
          </button>
        </div>
      </div>

      {/* Spacer so page content clears the top bar */}
      <div className="h-14" />

      {/* Global Search Modal */}
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function Sidebar({
  workspaceName = 'My Workspace',
  isCollapsed: initialCollapsed = false,
  onCollapsedChange,
}: SidebarProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleCollapse = (v: boolean) => {
    setIsCollapsed(v)
    onCollapsedChange?.(v)
  }

  if (isMobile) return <MobileSidebar workspaceName={workspaceName} />

  return (
    <DesktopSidebar
      workspaceName={workspaceName}
      isCollapsed={isCollapsed}
      onCollapsedChange={handleCollapse}
    />
  )
}
