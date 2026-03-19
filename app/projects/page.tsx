'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react'
import Sidebar from '@/components/Sidebar'
import ResponsivePageContainer from '@/components/responsive/ResponsivePageContainer'
import ResponsiveHeader from '@/components/responsive/ResponsiveHeader'
import MobileListItem from '@/components/responsive/MobileListItem'
import VoiceEntityModal from '@/components/voice-entity/VoiceEntityModal'
import { FaPlus, FaSearch, FaFolder, FaTasks, FaBuilding, FaFlag, FaMicrophone } from 'react-icons/fa'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFolderOpen, faFlagCheckered } from '@fortawesome/pro-duotone-svg-icons'
import { useWorkspace } from '@/lib/use-workspace'
import LoadingScreen from '@/components/LoadingScreen'

interface Project {
  id: string
  title: string
  description: string | null
  status: string
  progress: number
  color: string | null
  startDate: Date | null
  deadline: Date | null
  company: {
    id: string
    name: string
  } | null
  objective: {
    id: string
    title: string
  } | null
  _count: {
    tasks: number
  }
}

interface Objective {
  id: string
  title: string
}

interface Company {
  id: string
  name: string
}

export default function ProjectsPage() {
  const { workspaceId, loading: workspaceLoading } = useWorkspace()
  const [projects, setProjects] = useState<Project[]>([])
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!workspaceLoading && workspaceId) {
      fetchData()
    }
  }, [workspaceId, workspaceLoading])

  const fetchData = async () => {
    try {
      const [projectsRes, objectivesRes, companiesRes] = await Promise.all([
        fetch(`/api/projects?workspaceId=${workspaceId}`),
        fetch(`/api/objectives?workspaceId=${workspaceId}`),
        fetch(`/api/companies?workspaceId=${workspaceId}`)
      ])
      
      if (projectsRes.ok) {
        const data = await projectsRes.json()
        setProjects(data.projects || [])
      }
      
      if (objectivesRes.ok) {
        const data = await objectivesRes.json()
        const objectivesList = (data.objectives || []).map((obj: any) => ({
          id: obj.id,
          title: obj.title
        }))
        setObjectives(objectivesList)
      }
      
      if (companiesRes.ok) {
        const data = await companiesRes.json()
        const companiesList = (data || []).map((company: any) => ({
          id: company.id,
          name: company.name
        }))
        setCompanies(companiesList)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      (project.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (project.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'active': return 'bg-blue-100 text-blue-800'
      case 'planning': return 'bg-yellow-100 text-yellow-800'
      case 'on_hold': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed'
      case 'active': return 'Active'
      case 'planning': return 'Planning'
      case 'on_hold': return 'On Hold'
      default: return status
    }
  }

  const getStatusBadge = (status: string) => (
    <span className={`px-2 py-1 rounded-[6px] text-[11px] font-semibold ${getStatusColor(status)}`}>
      {getStatusLabel(status)}
    </span>
  )

  if (loading) {
    return <LoadingScreen message="Loading projects..." />
  }

  const mainPaddingClass = isMobile ? '' : sidebarCollapsed ? 'ml-20' : 'ml-64'

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onCollapsedChange={setSidebarCollapsed}
        workspaceName="My Workspace"
      />
      
      <div className={mainPaddingClass}>
        <ResponsiveHeader
          title="Projects"
          subtitle={`${filteredProjects.length} project${filteredProjects.length !== 1 ? 's' : ''}`}
          primaryAction={
            <Dropdown>
              <DropdownTrigger>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] font-medium text-[13px] transition-colors min-h-[44px]">
                  <FaPlus className="text-sm" />
                  <span className="hidden sm:inline">New Project</span>
                  <span className="sm:hidden">New</span>
                </button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Create project options">
                <DropdownItem
                  key="form"
                  startContent={<FaPlus className="text-lg" />}
                  as={Link}
                  href="/projects/new"
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
          secondaryActions={[
            {
              label: 'Search',
              icon: <FaSearch />,
              onClick: () => setIsSearchOpen(true),
            },
          ]}
        >
          {/* Filters - Horizontal scroll on mobile */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide mt-4">
            {[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'planning', label: 'Planning' },
              { value: 'on_hold', label: 'On Hold' },
              { value: 'completed', label: 'Completed' },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setFilterStatus(filter.value)}
                className={`
                  px-4 py-2 rounded-[10px] text-[13px] font-medium transition-colors whitespace-nowrap min-h-[44px]
                  ${
                    filterStatus === filter.value
                      ? 'bg-[#FEF2F2] text-[#DD3A44] border border-[#DD3A44]'
                      : 'bg-white text-[#525252] border border-[#E5E5E5] hover:bg-[#F5F5F5]'
                  }
                `}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </ResponsiveHeader>

        <ResponsivePageContainer>
          <div className="py-6 md:py-12">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12 md:py-20">
                <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-4">
                  <FaFolder className="text-[#A3A3A3] text-2xl" />
                </div>
                <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">No projects found</h3>
                <p className="text-[#A3A3A3] mb-6">
                  {searchQuery || filterStatus !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Get started by creating your first project'}
                </p>
                {!searchQuery && filterStatus === 'all' && (
                  <Link
                    href="/projects/new"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] font-medium transition-colors min-h-[44px]"
                  >
                    <FaPlus size={14} />
                    Create Project
                  </Link>
                )}
              </div>
            ) : (
              <>
                {/* Mobile: List View */}
                <div className="block lg:hidden space-y-3">
                  {filteredProjects.map((project) => (
                    <MobileListItem
                      key={project.id}
                      title={project.title}
                      description={project.description || undefined}
                      icon={
                        <div className="w-10 h-10 rounded-[6px] bg-[#FEF2F2] flex items-center justify-center">
                          <FontAwesomeIcon icon={faFolderOpen} className="text-[#DD3A44]" />
                        </div>
                      }
                      badge={getStatusBadge(project.status)}
                      metadata={[
                        ...(project.company ? [{ label: 'Company', value: project.company.name }] : []),
                        ...(project.objective ? [{ label: 'Objective', value: project.objective.title }] : []),
                        { label: 'Tasks', value: `${project._count.tasks}` },
                        { label: 'Progress', value: `${project.progress}%` },
                      ]}
                      href={`/projects/${project.id}`}
                    />
                  ))}
                </div>

                {/* Desktop: Card Grid */}
                <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="bg-white rounded-[10px] border border-[#E5E5E5] p-6 hover:shadow-lg transition-shadow"
                    >
                      {/* Header */}
                      <div className="mb-4">
                        {/* Project name with icon */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-[6px] bg-[#FEF2F2] flex items-center justify-center">
                            <FontAwesomeIcon icon={faFolderOpen} className="text-[#DD3A44] text-sm" />
                          </div>
                          <h3 className="text-[15px] font-medium text-[#1A1A1A] truncate">
                            {project.title}
                          </h3>
                        </div>

                        {/* Company */}
                        {project.company && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 rounded-[4px] bg-[#F5F5F5] flex items-center justify-center">
                              <FaBuilding className="text-[#737373] text-[10px]" />
                            </div>
                            <span className="text-[13px] text-[#525252]">{project.company.name}</span>
                          </div>
                        )}

                        {/* Objective */}
                        {project.objective && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 rounded-[4px] bg-[#F5F5F5] flex items-center justify-center">
                              <FontAwesomeIcon icon={faFlagCheckered} className="text-[#737373] text-[10px]" />
                            </div>
                            <span className="text-[13px] text-[#A3A3A3] truncate">{project.objective.title}</span>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      {project.description && (
                        <p className="text-[13px] text-[#A3A3A3] line-clamp-2 mb-4">
                          {project.description}
                        </p>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-[#E5E5E5]">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-[12px] text-[#525252]">
                            <FaTasks className="text-[#A3A3A3]" />
                            {project._count.tasks}
                          </div>
                          <div className="flex items-center gap-1.5 text-[12px] text-[#525252]">
                            <span className="font-medium">{project.progress}%</span>
                          </div>
                        </div>
                        {getStatusBadge(project.status)}
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </ResponsivePageContainer>
      </div>

      {/* Search Modal */}
      {isSearchOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-12 md:pt-20 px-4"
          onClick={() => setIsSearchOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-2xl rounded-[14px] shadow-lg p-4 md:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border border-[#E5E5E5] rounded-[10px] px-4 py-3">
              <FaSearch className="text-[#A3A3A3]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="flex-1 outline-none bg-transparent text-[#1A1A1A] text-[15px] placeholder-[#A3A3A3]"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[#A3A3A3] hover:text-[#525252] min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Voice Entity Modal */}
      <VoiceEntityModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        entityType="project"
        onSuccess={() => fetchData()}
        context={{
          existingObjectives: objectives,
          existingCompanies: companies,
        }}
      />
    </div>
  )
}
