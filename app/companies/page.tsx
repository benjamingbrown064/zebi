'use client'

import { useEffect, useState } from 'react'
import { FaPlus, FaBuilding, FaMicrophone } from 'react-icons/fa'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react'
import Sidebar from '@/components/Sidebar'
import CompanyCard from '@/components/CompanyCard'
import CompanyForm from '@/components/CompanyForm'
import LoadingScreen from '@/components/LoadingScreen'
import ResponsivePageContainer from '@/components/responsive/ResponsivePageContainer'
import ResponsiveHeader from '@/components/responsive/ResponsiveHeader'
import VoiceEntityModal from '@/components/voice-entity/VoiceEntityModal'
import { useWorkspace } from '@/lib/use-workspace'

interface Company {
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

export default function CompaniesPage() {
  const { workspaceId, loading: workspaceLoading } = useWorkspace()
  const [companies, setCompanies] = useState<Company[]>([])
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
    loadCompanies()
  }, [workspaceId, workspaceLoading])

  async function loadCompanies() {
    if (!workspaceId) return
    try {
      const response = await fetch(`/api/companies?workspaceId=${workspaceId}`)
      if (response.ok) {
        const data = await response.json()
        setCompanies(data)
      } else {
        console.error('Failed to load companies:', response.status, await response.text())
      }
    } catch (error) {
      console.error('Failed to load companies:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateCompany(formData: any) {
    if (!workspaceId) return
    setIsSaving(true)
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, workspaceId }),
      })

      if (response.ok) {
        const newCompany = await response.json()
        setCompanies([newCompany, ...companies])
        setIsAdding(false)
      } else {
        alert('Failed to create company')
      }
    } catch (error) {
      console.error('Failed to create company:', error)
      alert('Failed to create company')
    } finally {
      setIsSaving(false)
    }
  }

  function handleVoiceSuccess(companyId: string) {
    loadCompanies()
  }

  const mainPaddingClass = isMobile ? '' : sidebarCollapsed ? 'ml-16' : 'ml-64'

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div className={mainPaddingClass}>
        <ResponsiveHeader
          title="Companies"
          subtitle="Manage your business units and ventures"
          primaryAction={
            <Dropdown>
              <DropdownTrigger>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] font-medium text-[13px] transition-colors min-h-[44px]">
                  <FaPlus className="text-sm" />
                  <span className="hidden sm:inline">Add Company</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Create company options">
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
                  className="text-blue-600"
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
              <LoadingScreen message="Loading companies..." fullPage={false} />
            ) : companies.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-[14px] border border-[#E5E5E5]">
                <FaBuilding className="mx-auto text-4xl text-[#E5E5E5] mb-4" />
                <p className="text-[#525252] mb-4 px-4">No companies yet. Create one to get started.</p>
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-4 py-2.5 bg-[#DD3A44] text-white rounded-[10px] hover:bg-[#C7333D] transition inline-flex items-center gap-2 min-h-[44px]"
                >
                  <FaPlus /> Create Your First Company
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {companies.map((company) => (
                  <CompanyCard
                    key={company.id}
                    id={company.id}
                    name={company.name}
                    industry={company.industry}
                    stage={company.stage}
                    revenue={company.revenue ? Number(company.revenue) : null}
                    projectCount={company._count.projects}
                    taskCount={company._count.tasks}
                    documentCount={company._count.documents}
                    insightCount={company._count.insights}
                    logoUrl={company.logoUrl}
                    websiteUrl={company.websiteUrl}
                  />
                ))}
              </div>
            )}
          </main>
        </ResponsivePageContainer>

      </div>

      {/* Add Company Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 md:p-4">
          <div className={`
            bg-white shadow-lg w-full overflow-y-auto
            ${isMobile 
              ? 'h-full rounded-none' 
              : 'rounded-[14px] max-w-2xl max-h-[90vh]'
            }
          `}>
            <div className="sticky top-0 bg-white border-b border-[#E5E5E5] px-4 md:px-8 py-4 md:py-6">
              <h2 className="text-lg md:text-xl font-semibold text-[#1A1A1A]">Add a new company</h2>
            </div>
            <div className="px-4 md:px-8 py-4 md:py-6">
              <CompanyForm
                onSubmit={handleCreateCompany}
                onCancel={() => setIsAdding(false)}
                submitLabel="Create Company"
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
        entityType="company"
        onSuccess={handleVoiceSuccess}
      />
    </div>
  )
}
