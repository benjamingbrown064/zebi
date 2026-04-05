'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import ResponsiveHeader from '@/components/responsive/ResponsiveHeader'
import ResponsivePageContainer from '@/components/responsive/ResponsivePageContainer'
import { FaCog, FaFilter } from 'react-icons/fa'

export default function SettingsPage() {
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load dark mode preference on mount
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true'
    setDarkMode(savedDarkMode)
    if (savedDarkMode) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', String(newDarkMode))
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }


  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
        <ResponsiveHeader
          title="Settings"
          subtitle="Manage your preferences"
        />

        <ResponsivePageContainer>
          <main className="py-6 md:py-8">
            <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
              {/* Workspace Section */}
              <div className="bg-white rounded p-4 md:p-6">
              <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">Workspace</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#474747] mb-2">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value="My Workspace"
                    disabled
                    className="w-full px-4 py-2.5  rounded bg-[#F3F3F3] text-[#474747] min-h-[44px]"
                  />
                  <p className="text-xs text-[#A3A3A3] mt-1">Workspace name cannot be changed</p>
                </div>
              </div>
            </div>

              {/* Preferences Section */}
              <div className="bg-white rounded p-4 md:p-6">
              <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">Preferences</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[#474747]">
                    Default view
                  </label>
                  <select className="px-3 py-2.5  rounded text-sm min-h-[44px]">
                    <option>Dashboard</option>
                    <option>Board</option>
                    <option>Tasks</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div>
                    <label className="text-sm font-medium text-[#474747]">
                      Dark mode
                    </label>
                    <p className="text-xs text-[#A3A3A3] mt-1">
                      Switch between light and dark themes
                    </p>
                  </div>
                  <button
                    onClick={toggleDarkMode}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      darkMode ? 'bg-[#000000]' : 'bg-[#E5E5E5]'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        darkMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

              {/* Filters Section */}
              <div className="bg-white rounded p-4 md:p-6">
              <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">Filters</h2>
              <p className="text-[13px] text-[#A3A3A3] mb-4">
                Create and manage custom task filters to quickly find what you need.
              </p>
              <button
                onClick={() => router.push('/filters')}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#000000] hover:bg-[#1A1C1C] text-white rounded font-medium text-[13px] transition-colors min-h-[44px]"
              >
                <FaFilter />
                Manage Filters
              </button>
            </div>

              {/* About Section */}
              <div className="bg-white rounded p-4 md:p-6">
              <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">About</h2>
              <p className="text-[13px] text-[#A3A3A3]">
                Zebi v0.1.0
              </p>
              <p className="text-xs text-[#A3A3A3] mt-2">
                A calm task manager for solopreneurs and founders.
              </p>
              </div>
            </div>
          </main>
        </ResponsivePageContainer>    </div>
  )
}
