'use client'

import { useEffect, useState } from 'react'
import { FaPlus, FaBuilding, FaMicrophone } from 'react-icons/fa'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react'
import Sidebar from '@/components/Sidebar'
import SpaceCard from '@/components/SpaceCard'
import SpaceForm from '@/components/SpaceForm'
import LoadingScreen from '@/components/LoadingScreen'
import ResponsivePageContainer from '@/components/responsive/ResponsivePageContainer'
import ResponsiveHeader from '@/components/responsive/ResponsiveHeader'
import VoiceEntityModal from '@/components/voice-entity/VoiceEntityModal'
import { useWorkspace } from '@/lib/use-workspace'
import { cachedFetch, invalidateCache } from '@/lib/client-cache'

interface Space {
  id: string
  name: string
  industry: string | null
  stage: string | null
  revenue: number | null
  logoUrl: string | null
  websiteUrl: string | null
  _count: {
    projects: number
    tasks: number
    documents: number
    insights: number
  }
}

export default function SpacesPage() {
  const { workspaceId, loading: workspaceLoading } = useWorkspace()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (workspaceLoading || !workspaceId) return
    loadSpaces()
  }, [workspaceId, workspaceLoading])

  async function loadSpaces() {
    if (!workspaceId) return
    try {
      const data = await cachedFetch<any[]>(`/api/spaces?workspaceId=${workspaceId}`)
      setSpaces(data)
    } catch (error) {
      console.error('Failed to load spaces:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateSpace(formData: any) {
    if (!workspaceId) return
    setIsSaving(true)
    try {
      const response = await fetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, workspaceId }),
      })

      if (response.ok) {
        const newSpace = await response.json()
        setSpaces([newSpace, ...spaces])
        setIsAdding(false)
      } else {
        alert('Failed to create space')
      }
    } catch (error) {
      console.error('Failed to create space:', error)
      alert('Failed to create space')
    } finally {
      setIsSaving(false)
    }
  }

  function handleVoiceSuccess(companyId: string) {
    loadSpaces()
  }

  const mainPaddingClass = isMobile ? '' : sidebarCollapsed ? 'ml-16' : 'ml-64'

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div className={mainPaddingClass}>
        <ResponsiveHeader
          title="Spaces"
          subtitle="Manage your business units and ventures"
          primaryAction={
            <Dropdown>
              <DropdownTrigger>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-[#000000] hover:bg-[#1A1C1C] text-white rounded font-medium text-[13px] transition-colors min-h-[44px]">
                  <FaPlus className="text-sm" />
                  <span className="hidden sm:inline">Add Space</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Create space options">
                <DropdownItem
                  key="form"
                  startContent={<FaPlus className="text-lg" />}
                  onPress={() => setIsAdding(true)}
                >
                  Create with Form
                </DropdownItem>
                <DropdownItem
                  key="voice"
                  startContent={<FaMicrophone className="text-lg" />}
                  onPress={() => setIsVoiceModalOpen(true)}
                  className="text-[#1A1C1C]"
                >
                  Create via Voice
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          }
        />

        <ResponsivePageContainer>
          <main className="py-6 md:py-12">
            {loading ? (
              <LoadingScreen message="Loading spaces..." fullPage={false} />
            ) : spaces.length === 0 ? (
              <div className="text-center py-12 bg-white rounded">
                <FaBuilding className="mx-auto text-4xl text-[#E5E5E5] mb-4" />
                <p className="text-[#474747] mb-4 px-4">No spaces yet. Create one to get started.</p>
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-4 py-2.5 bg-[#000000] text-white rounded hover:bg-[#1A1C1C] transition inline-flex items-center gap-2 min-h-[44px]"
                >
                  <FaPlus /> Create Your First Space
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {spaces.map((space) => (
                  <SpaceCard
                    key={space.id}
                    id={space.id}
                    name={space.name}
                    industry={space.industry}
                    stage={space.stage}
                    revenue={space.revenue ? Number(space.revenue) : null}
                    projectCount={space._count.projects}
                    taskCount={space._count.tasks}
                    documentCount={space._count.documents}
                    insightCount={space._count.insights}
                    logoUrl={space.logoUrl}
                    websiteUrl={space.websiteUrl}
                  />
                ))}
              </div>
            )}
          </main>
        </ResponsivePageContainer>

      </div>

      {/* Add Space Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 md:p-4">
          <div className={`
            bg-white shadow-[0_20px_40px_rgba(28,27,27,0.06)] w-full overflow-y-auto
            ${isMobile 
              ? 'h-full rounded-none' 
              : 'rounded max-w-2xl max-h-[90vh]'
            }
          `}>
            <div className="sticky top-0 bg-white px-4 md:px-8 py-4 md:py-6">
              <h2 className="text-lg md:text-xl font-semibold text-[#1A1A1A]">Add a new space</h2>
            </div>
            <div className="px-4 md:px-8 py-4 md:py-6">
              <SpaceForm
                onSubmit={handleCreateSpace}
                onCancel={() => setIsAdding(false)}
                submitLabel="Create Space"
                isLoading={isSaving}
              />
            </div>
          </div>
        </div>
      )}

      {/* Voice Entity Modal */}
      <VoiceEntityModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        entityType="space"
        onSuccess={handleVoiceSuccess}
      />
    </div>
  )
}
