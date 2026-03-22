'use client'
import { cachedFetch } from '@/lib/client-cache'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFolderOpen,
  faFileLines,
  faLightbulb,
  faBrain,
  faFolder,
  faHistory,
  faGlobe,
  faEdit,
  faBuilding,
  faListCheck,
  faBullseye,
  faEllipsisH,
  faPlus,
  faTimes,
  faExternalLink,
} from '@fortawesome/pro-duotone-svg-icons'
import Sidebar from '@/components/Sidebar'
import CompanyForm from '@/components/CompanyForm'
import LoadingSpinner from '@/components/LoadingSpinner'
import ResponsivePageContainer from '@/components/responsive/ResponsivePageContainer'

interface Company {
  id: string
  name: string
  industry: string | null
  stage: string | null
  businessModel: string | null
  missionStatement: string | null
  executiveSummary: string | null
  vision: string | null
  targetCustomers: string | null
  marketSize: string | null
  coreProduct: string | null
  positioning: string | null
  logoUrl: string | null
  websiteUrl: string | null
  revenue: number | null
  createdAt: string
  updatedAt: string
  projects: any[]
  documents: any[]
  insights: any[]
  memories: any[]
  files: any[]
  objectives: any[]
  tasks: any[]
  _count: {
    projects: number
    tasks: number
    documents: number
    insights: number
    memories: number
    files: number
    objectives: number
  }
}

type TabType = 'overview' | 'projects' | 'documents' | 'objectives' | 'tasks'
type MoreMenuType = 'insights' | 'memory' | 'files' | 'activity'

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string

  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [moreMenuTab, setMoreMenuTab] = useState<MoreMenuType | null>(null)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [loadingActivity, setLoadingActivity] = useState(false)

  // Modal states
  const [selectedDocument, setSelectedDocument] = useState<any>(null)
  const [selectedInsight, setSelectedInsight] = useState<any>(null)
  const [selectedMemory, setSelectedMemory] = useState<any>(null)
  const [selectedFile, setSelectedFile] = useState<any>(null)
  
  // Creation modals
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [projectFormData, setProjectFormData] = useState({ title: '', description: '' })
  const [creatingProject, setCreatingProject] = useState(false)
  
  const [showCreateDocument, setShowCreateDocument] = useState(false)
  const [documentFormData, setDocumentFormData] = useState({ title: '', documentType: 'general' })
  const [creatingDocument, setCreatingDocument] = useState(false)
  
  const [showCreateObjective, setShowCreateObjective] = useState(false)
  const [objectiveFormData, setObjectiveFormData] = useState({ title: '', description: '' })
  const [creatingObjective, setCreatingObjective] = useState(false)
  
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [taskFormData, setTaskFormData] = useState({ title: '', description: '' })
  const [creatingTask, setCreatingTask] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    loadCompany()
  }, [companyId])

  useEffect(() => {
    if (moreMenuTab === 'activity') {
      loadActivity()
    }
  }, [moreMenuTab])

  // Close More dropdown when clicking outside
  useEffect(() => {
    if (!showMoreMenu) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.more-menu-container')) {
        setShowMoreMenu(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showMoreMenu])

  async function loadCompany() {
    try {
      const data = await cachedFetch<Company>(`/api/companies/${companyId}`)
      setCompany(data)
    } catch (error: any) {
      console.error('Failed to load company:', error)
      if (error?.message?.includes('404')) {
        router.push('/companies')
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadActivity() {
    setLoadingActivity(true)
    try {
      const response = await fetch(`/api/activity?companyId=${companyId}&limit=50`)
      if (response.ok) {
        const data = await response.json()
        setActivityLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Failed to load activity:', error)
    } finally {
      setLoadingActivity(false)
    }
  }

  async function handleUpdateCompany(formData: any) {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const updatedCompany = await response.json()
        setCompany(updatedCompany)
        setIsEditing(false)
      } else {
        alert('Failed to update company')
      }
    } catch (error) {
      console.error('Failed to update company:', error)
      alert('Failed to update company')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCreateProject() {
    if (!projectFormData.title.trim()) {
      alert('Project title is required')
      return
    }

    setCreatingProject(true)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: 'dfd6d384-9e2f-4145-b4f3-254aa82c0237',
          companyId: companyId,
          title: projectFormData.title,
          description: projectFormData.description,
          createdBy: 'user-id', // TODO: Get from auth
        }),
      })

      if (response.ok) {
        await loadCompany()
        setShowCreateProject(false)
        setProjectFormData({ title: '', description: '' })
      } else {
        alert('Failed to create project')
      }
    } catch (error) {
      console.error('Failed to create project:', error)
      alert('Failed to create project')
    } finally {
      setCreatingProject(false)
    }
  }

  async function handleCreateDocument() {
    if (!documentFormData.title.trim()) {
      alert('Document title is required')
      return
    }

    setCreatingDocument(true)
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: 'dfd6d384-9e2f-4145-b4f3-254aa82c0237',
          companyId: companyId,
          title: documentFormData.title,
          documentType: documentFormData.documentType,
        }),
      })

      if (response.ok) {
        await loadCompany()
        setShowCreateDocument(false)
        setDocumentFormData({ title: '', documentType: 'general' })
      } else {
        alert('Failed to create document')
      }
    } catch (error) {
      console.error('Failed to create document:', error)
      alert('Failed to create document')
    } finally {
      setCreatingDocument(false)
    }
  }

  async function handleCreateObjective() {
    if (!objectiveFormData.title.trim()) {
      alert('Objective title is required')
      return
    }

    setCreatingObjective(true)
    try {
      const response = await fetch('/api/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: 'dfd6d384-9e2f-4145-b4f3-254aa82c0237',
          companyId: companyId,
          title: objectiveFormData.title,
          description: objectiveFormData.description,
        }),
      })

      if (response.ok) {
        await loadCompany()
        setShowCreateObjective(false)
        setObjectiveFormData({ title: '', description: '' })
      } else {
        alert('Failed to create objective')
      }
    } catch (error) {
      console.error('Failed to create objective:', error)
      alert('Failed to create objective')
    } finally {
      setCreatingObjective(false)
    }
  }

  async function handleCreateTask() {
    if (!taskFormData.title.trim()) {
      alert('Task title is required')
      return
    }

    setCreatingTask(true)
    try {
      const response = await fetch('/api/tasks/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: 'dfd6d384-9e2f-4145-b4f3-254aa82c0237',
          companyId: companyId,
          title: taskFormData.title,
          description: taskFormData.description,
        }),
      })

      if (response.ok) {
        await loadCompany()
        setShowCreateTask(false)
        setTaskFormData({ title: '', description: '' })
      } else {
        alert('Failed to create task')
      }
    } catch (error) {
      console.error('Failed to create task:', error)
      alert('Failed to create task')
    } finally {
      setCreatingTask(false)
    }
  }

  function handleMoreMenuClick(tab: MoreMenuType) {
    setActiveTab('overview' as any) // Reset main tab
    setMoreMenuTab(tab)
    setShowMoreMenu(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcf9f8] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!company) {
    return null
  }

  const mainTabs = [
    { id: 'overview', label: 'Overview', icon: faBuilding },
    { id: 'projects', label: 'Projects', icon: faFolderOpen, count: company._count.projects },
    { id: 'documents', label: 'Documents', icon: faFileLines, count: company._count.documents },
    { id: 'objectives', label: 'Objectives', icon: faBullseye, count: company._count.objectives },
    { id: 'tasks', label: 'Tasks', icon: faListCheck, count: company._count.tasks },
  ]

  const moreMenuItems = [
    { id: 'insights', label: 'Insights', icon: faLightbulb, count: company._count.insights },
    { id: 'memory', label: 'Memory', icon: faBrain, count: company._count.memories },
    { id: 'files', label: 'Files', icon: faFolder, count: company._count.files },
    { id: 'activity', label: 'Activity', icon: faHistory },
  ]

  const mainPaddingClass = isMobile ? '' : sidebarCollapsed ? 'ml-16' : 'ml-64'
  const activeView = moreMenuTab || activeTab

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div className={mainPaddingClass}>
        {/* Header - Tabs Only */}
        <header className="bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 md:px-12 py-4 md:py-6">
            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto flex-1 mr-4 scrollbar-hide">
              {mainTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as TabType)
                    setMoreMenuTab(null)
                  }}
                  className={`px-3 md:px-4 py-2 rounded-[10px] text-[12px] md:text-[13px] font-medium flex items-center gap-2 whitespace-nowrap transition min-h-[44px] ${
                    activeTab === tab.id && !moreMenuTab
                      ? 'bg-[#FEF2F2] text-[#DD3A44]'
                      : 'text-[#525252] hover:bg-[#F5F5F5]'
                  }`}
                >
                  <FontAwesomeIcon icon={tab.icon} />
                  <span className={isMobile ? 'hidden' : ''}>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="px-2 py-0.5 bg-[#E5E5E5] text-[#525252] rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}

              {/* More Menu */}
              <div className="relative more-menu-container">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className={`px-3 md:px-4 py-2 rounded-[10px] text-[12px] md:text-[13px] font-medium flex items-center gap-2 whitespace-nowrap transition min-h-[44px] ${
                    moreMenuTab
                      ? 'bg-[#FEF2F2] text-[#DD3A44]'
                      : 'text-[#525252] hover:bg-[#F5F5F5]'
                  }`}
                >
                  <FontAwesomeIcon icon={faEllipsisH} />
                  <span className={isMobile ? 'hidden' : ''}>More</span>
                </button>

                {showMoreMenu && (
                  <div className="absolute top-full mt-2 right-0 bg-white  rounded-[10px] shadow-[0_20px_40px_rgba(28,27,27,0.06)] min-w-[180px] py-2 z-20">
                    {moreMenuItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleMoreMenuClick(item.id as MoreMenuType)}
                        className={`w-full px-4 py-2 text-left text-[13px] flex items-center gap-3 hover:bg-[#F5F5F5] transition ${
                          moreMenuTab === item.id ? 'text-[#DD3A44] bg-[#FEF2F2]' : 'text-[#525252]'
                        }`}
                      >
                        <FontAwesomeIcon icon={item.icon} className="w-4" />
                        <span className="flex-1">{item.label}</span>
                        {item.count !== undefined && item.count > 0 && (
                          <span className="px-2 py-0.5 bg-[#E5E5E5] text-[#525252] rounded-full text-xs">
                            {item.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Edit Button */}
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 md:px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-white rounded-[10px] transition flex items-center gap-2 min-h-[44px] text-[12px] md:text-[13px] flex-shrink-0"
            >
              <FontAwesomeIcon icon={faEdit} />
              <span className="hidden sm:inline">Edit</span>
            </button>
          </div>
        </header>

        {/* Tab Content */}
        <ResponsivePageContainer>
          <main className="py-6 md:py-12 w-full">
            {/* Company Info */}
            <div className="max-w-full mb-6 md:mb-8">
              <div className="flex items-start gap-4 md:gap-6 mb-4 md:mb-6">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-[#F5F5F5] rounded-[14px] flex items-center justify-center flex-shrink-0">
                  {company.logoUrl ? (
                    <img
                      src={company.logoUrl}
                      alt={company.name}
                      className="w-full h-full object-cover rounded-[14px]"
                    />
                  ) : (
                    <FontAwesomeIcon icon={faBuilding} className="text-[#737373] text-2xl md:text-3xl" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h1 className="text-[20px] md:text-[30px] leading-[28px] md:leading-[36px] font-medium text-[#1A1A1A] mb-2">{company.name}</h1>
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[12px] md:text-[13px] text-[#525252] mb-2">
                    {company.industry && <span>{company.industry}</span>}
                    {company.industry && company.stage && <span>•</span>}
                    {company.stage && <span className="capitalize">{company.stage}</span>}
                    {company.revenue && (
                      <>
                        <span>•</span>
                        <span className="font-semibold">£{(Number(company.revenue) / 1000).toFixed(1)}k MRR</span>
                      </>
                    )}
                  </div>
                  {company.websiteUrl && (
                    <a
                      href={company.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[13px] text-[#DD3A44] hover:text-[#C7333D] transition"
                    >
                      <FontAwesomeIcon icon={faGlobe} />
                      {company.websiteUrl.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Overview Tab */}
            {activeView === 'overview' && (
              <div className="w-full space-y-6">
                {company.missionStatement && (
                  <div className="bg-white  rounded-[14px] p-6">
                    <h3 className="font-semibold text-[#1A1A1A] mb-2">Mission Statement</h3>
                    <p className="text-[#525252] text-[15px]">{company.missionStatement}</p>
                  </div>
                )}

                {company.executiveSummary && (
                  <div className="bg-white  rounded-[14px] p-6">
                    <h3 className="font-semibold text-[#1A1A1A] mb-2">Executive Summary</h3>
                    <p className="text-[#525252] text-[15px] whitespace-pre-wrap">{company.executiveSummary}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {company.vision && (
                    <div className="bg-white  rounded-[14px] p-6">
                      <h3 className="font-semibold text-[#1A1A1A] mb-2">Vision</h3>
                      <p className="text-[#525252] text-[15px] whitespace-pre-wrap">{company.vision}</p>
                    </div>
                  )}

                  {company.businessModel && (
                    <div className="bg-white  rounded-[14px] p-6">
                      <h3 className="font-semibold text-[#1A1A1A] mb-2">Business Model</h3>
                      <p className="text-[#525252] text-[15px]">{company.businessModel}</p>
                    </div>
                  )}

                  {company.targetCustomers && (
                    <div className="bg-white  rounded-[14px] p-6">
                      <h3 className="font-semibold text-[#1A1A1A] mb-2">Target Customers</h3>
                      <p className="text-[#525252] text-[15px] whitespace-pre-wrap">{company.targetCustomers}</p>
                    </div>
                  )}

                  {company.marketSize && (
                    <div className="bg-white  rounded-[14px] p-6">
                      <h3 className="font-semibold text-[#1A1A1A] mb-2">Market Size</h3>
                      <p className="text-[#525252] text-[15px]">{company.marketSize}</p>
                    </div>
                  )}

                  {company.coreProduct && (
                    <div className="bg-white  rounded-[14px] p-6">
                      <h3 className="font-semibold text-[#1A1A1A] mb-2">Core Product</h3>
                      <p className="text-[#525252] text-[15px] whitespace-pre-wrap">{company.coreProduct}</p>
                    </div>
                  )}

                  {company.positioning && (
                    <div className="bg-white  rounded-[14px] p-6">
                      <h3 className="font-semibold text-[#1A1A1A] mb-2">Positioning</h3>
                      <p className="text-[#525252] text-[15px] whitespace-pre-wrap">{company.positioning}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Projects Tab */}
            {activeView === 'projects' && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[20px] font-medium text-[#1A1A1A]">Projects</h2>
                  <button 
                    onClick={() => setShowCreateProject(true)}
                    className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] flex items-center gap-2 text-[13px] font-medium transition"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    Add Project
                  </button>
                </div>

                {company.projects.length === 0 ? (
                  <div className="bg-white  rounded-[14px] p-8 text-center">
                    <FontAwesomeIcon icon={faFolderOpen} className="mx-auto text-4xl text-[#E5E5E5] mb-4" />
                    <p className="text-[#A3A3A3] text-[15px]">No projects yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {company.projects.map((project) => (
                      <Link key={project.id} href={`/projects/${project.id}`}>
                        <div className="bg-white  rounded-[14px] p-6 hover:shadow-[0_4px_12px_rgba(28,27,27,0.08)] transition cursor-pointer">
                          <h3 className="font-semibold text-[#1A1A1A] mb-2">{project.name}</h3>
                          {project.description && (
                            <p className="text-[13px] text-[#525252] mb-3 line-clamp-2">{project.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-[12px] text-[#A3A3A3]">
                            <span>{project.tasks?.length || 0} tasks</span>
                            {project.objective && (
                              <span className="px-2 py-1 bg-[#FEF2F2] text-[#DD3A44] rounded-[6px]">
                                🎯 {project.objective.title}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Documents Tab */}
            {activeView === 'documents' && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[20px] font-medium text-[#1A1A1A]">Documents</h2>
                  <button 
                    onClick={() => setShowCreateDocument(true)}
                    className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] flex items-center gap-2 text-[13px] font-medium transition"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    Add Document
                  </button>
                </div>

                {company.documents.length === 0 ? (
                  <div className="bg-white  rounded-[14px] p-8 text-center">
                    <FontAwesomeIcon icon={faFileLines} className="mx-auto text-4xl text-[#E5E5E5] mb-4" />
                    <p className="text-[#A3A3A3] text-[15px]">No documents yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {company.documents.map((doc: any) => (
                      <div 
                        key={doc.id} 
                        onClick={() => setSelectedDocument(doc)}
                        className="bg-white  rounded-[14px] p-6 hover:shadow-[0_4px_12px_rgba(28,27,27,0.08)] transition cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-[#1A1A1A]">{doc.title}</h3>
                            <p className="text-[12px] text-[#A3A3A3] mt-1">
                              {doc.documentType} • Updated {new Date(doc.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <FontAwesomeIcon icon={faExternalLink} className="text-[#A3A3A3]" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Objectives Tab */}
            {activeView === 'objectives' && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[20px] font-medium text-[#1A1A1A]">Objectives</h2>
                  <button 
                    onClick={() => setShowCreateObjective(true)}
                    className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] flex items-center gap-2 text-[13px] font-medium transition"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    Add Objective
                  </button>
                </div>

                {company.objectives.length === 0 ? (
                  <div className="bg-white  rounded-[14px] p-8 text-center">
                    <FontAwesomeIcon icon={faBullseye} className="mx-auto text-4xl text-[#E5E5E5] mb-4" />
                    <p className="text-[#A3A3A3] text-[15px]">No objectives linked to this company.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {company.objectives.map((objective: any) => (
                      <Link key={objective.id} href={`/objectives/${objective.id}`}>
                        <div className="bg-white  rounded-[14px] p-6 hover:shadow-[0_4px_12px_rgba(28,27,27,0.08)] transition cursor-pointer">
                          <div className="flex items-center justify-between mb-3">
                            <span
                              className={`px-2 py-1 rounded-[6px] text-[12px] font-medium ${
                                objective.status === 'active'
                                  ? 'bg-[#f0fafa] text-[#006766]'
                                  : objective.status === 'on_track'
                                  ? 'bg-[#f0fafa] text-[#006766]'
                                  : objective.status === 'at_risk'
                                  ? 'bg-yellow-50 text-yellow-700'
                                  : 'bg-[#f6f3f2] text-[#5a5757]'
                              }`}
                            >
                              {objective.status.replace('_', ' ')}
                            </span>
                          </div>
                          <h3 className="font-semibold text-[#1A1A1A] mb-2">{objective.title}</h3>
                          {objective.description && (
                            <p className="text-[13px] text-[#525252] line-clamp-2">{objective.description}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tasks Tab */}
            {activeView === 'tasks' && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[20px] font-medium text-[#1A1A1A]">Tasks</h2>
                  <button 
                    onClick={() => setShowCreateTask(true)}
                    className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] flex items-center gap-2 text-[13px] font-medium transition"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    Add Task
                  </button>
                </div>

                {company.tasks.length === 0 ? (
                  <div className="bg-white  rounded-[14px] p-8 text-center">
                    <FontAwesomeIcon icon={faListCheck} className="mx-auto text-4xl text-[#E5E5E5] mb-4" />
                    <p className="text-[#A3A3A3] text-[15px]">No tasks assigned to this company.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {company.tasks.map((task: any) => (
                      <div 
                        key={task.id}
                        className="bg-white  rounded-[14px] p-4 hover:shadow-[0_4px_12px_rgba(28,27,27,0.08)] transition cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <input 
                            type="checkbox" 
                            checked={!!task.completedAt}
                            className="mt-1 w-4 h-4 rounded border-[#D4D4D4]"
                            readOnly
                          />
                          <div className="flex-1">
                            <h3 className="font-medium text-[#1A1A1A] mb-1">{task.title}</h3>
                            <div className="flex items-center gap-2 text-[12px] text-[#A3A3A3]">
                              {task.project && <span>{task.project.name}</span>}
                              {task.objective && (
                                <>
                                  <span>•</span>
                                  <span>{task.objective.title}</span>
                                </>
                              )}
                              {task.dueAt && (
                                <>
                                  <span>•</span>
                                  <span>Due {new Date(task.dueAt).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Insights (More Menu) */}
            {activeView === 'insights' && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[20px] font-medium text-[#1A1A1A]">Insights</h2>
                  <button className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] flex items-center gap-2 text-[13px] font-medium transition">
                    <FontAwesomeIcon icon={faPlus} />
                    Add Insight
                  </button>
                </div>

                {company.insights.length === 0 ? (
                  <div className="bg-white  rounded-[14px] p-8 text-center">
                    <FontAwesomeIcon icon={faLightbulb} className="mx-auto text-4xl text-[#E5E5E5] mb-4" />
                    <p className="text-[#A3A3A3] text-[15px]">No insights yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {company.insights.map((insight: any) => (
                      <div 
                        key={insight.id}
                        onClick={() => setSelectedInsight(insight)}
                        className="bg-white  rounded-[14px] p-6 hover:shadow-[0_4px_12px_rgba(28,27,27,0.08)] transition cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 rounded-[6px] text-[12px] font-medium ${
                                insight.status === 'new'
                                  ? 'bg-[#f0fafa] text-[#006766]'
                                  : 'bg-[#f6f3f2] text-[#5a5757]'
                              }`}
                            >
                              {insight.status}
                            </span>
                            <span className="text-[12px] text-[#A3A3A3]">{insight.insightType}</span>
                          </div>
                          <FontAwesomeIcon icon={faExternalLink} className="text-[#A3A3A3]" />
                        </div>
                        <h3 className="font-semibold text-[#1A1A1A] mb-2">{insight.title}</h3>
                        <p className="text-[#525252] text-[15px]">{insight.summary}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Memory (More Menu) */}
            {activeView === 'memory' && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[20px] font-medium text-[#1A1A1A]">Memory</h2>
                  <button className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] flex items-center gap-2 text-[13px] font-medium transition">
                    <FontAwesomeIcon icon={faPlus} />
                    Add Memory
                  </button>
                </div>

                {company.memories.length === 0 ? (
                  <div className="bg-white  rounded-[14px] p-8 text-center">
                    <FontAwesomeIcon icon={faBrain} className="mx-auto text-4xl text-[#E5E5E5] mb-4" />
                    <p className="text-[#A3A3A3] text-[15px]">No memories yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {company.memories.map((memory: any) => (
                      <div 
                        key={memory.id}
                        onClick={() => setSelectedMemory(memory)}
                        className="bg-white  rounded-[14px] p-6 hover:shadow-[0_4px_12px_rgba(28,27,27,0.08)] transition cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-[12px] text-[#A3A3A3]">{memory.memoryType}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-[#A3A3A3]">
                              Confidence: {memory.confidenceScore}/10
                            </span>
                            <FontAwesomeIcon icon={faExternalLink} className="text-[#A3A3A3]" />
                          </div>
                        </div>
                        <h3 className="font-semibold text-[#1A1A1A] mb-2">{memory.title}</h3>
                        <p className="text-[#525252] text-[15px]">{memory.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Files (More Menu) */}
            {activeView === 'files' && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[20px] font-medium text-[#1A1A1A]">Files</h2>
                  <button className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] flex items-center gap-2 text-[13px] font-medium transition">
                    <FontAwesomeIcon icon={faPlus} />
                    Upload File
                  </button>
                </div>

                {company.files.length === 0 ? (
                  <div className="bg-white  rounded-[14px] p-8 text-center">
                    <FontAwesomeIcon icon={faFolder} className="mx-auto text-4xl text-[#E5E5E5] mb-4" />
                    <p className="text-[#A3A3A3] text-[15px]">No files yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {company.files.map((file: any) => (
                      <div 
                        key={file.id}
                        onClick={() => setSelectedFile(file)}
                        className="bg-white  rounded-[14px] p-4 hover:shadow-[0_4px_12px_rgba(28,27,27,0.08)] transition cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <h3 className="font-medium text-[#1A1A1A]">{file.filename}</h3>
                          <p className="text-[12px] text-[#A3A3A3] mt-1">
                            {(Number(file.sizeBytes) / 1024).toFixed(1)} KB • Uploaded{' '}
                            {new Date(file.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <FontAwesomeIcon icon={faExternalLink} className="text-[#A3A3A3]" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Activity (More Menu) */}
            {activeView === 'activity' && (
              <div className="w-full">
                <h2 className="text-[20px] font-medium text-[#1A1A1A] mb-6">Activity</h2>

                {loadingActivity ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner />
                  </div>
                ) : activityLogs.length === 0 ? (
                  <div className="bg-white  rounded-[14px] p-8 text-center">
                    <FontAwesomeIcon icon={faHistory} className="mx-auto text-4xl text-[#E5E5E5] mb-4" />
                    <p className="text-[#A3A3A3] text-[15px]">No activity yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activityLogs.map((log: any) => (
                      <div key={log.id} className="bg-white  rounded-[14px] p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-[#F5F5F5] rounded-full flex items-center justify-center flex-shrink-0">
                            <FontAwesomeIcon icon={faHistory} className="text-[#A3A3A3] text-xs" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[15px] text-[#1A1A1A]">
                              <span className="font-medium">{log.eventType.replace(/_/g, ' ')}</span>
                            </p>
                            <p className="text-[12px] text-[#A3A3A3] mt-1">
                              {new Date(log.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </ResponsivePageContainer>

        {/* Edit Modal */}
        {isEditing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 md:p-4">
            <div className={`
              bg-white shadow-[0_20px_40px_rgba(28,27,27,0.06)] w-full overflow-y-auto
              ${isMobile 
                ? 'h-full rounded-none' 
                : 'rounded-[14px] max-w-2xl max-h-[90vh]'
              }
            `}>
              <div className="sticky top-0 bg-white px-4 md:px-8 py-4 md:py-6">
                <h2 className="text-lg md:text-xl font-semibold text-[#1A1A1A]">Edit {company.name}</h2>
              </div>
              <div className="px-4 md:px-8 py-4 md:py-6">
                <CompanyForm
                  initialData={{
                    name: company.name,
                    industry: company.industry || '',
                    stage: company.stage || 'startup',
                    businessModel: company.businessModel || '',
                    missionStatement: company.missionStatement || '',
                    executiveSummary: company.executiveSummary || '',
                    vision: company.vision || '',
                    targetCustomers: company.targetCustomers || '',
                    marketSize: company.marketSize || '',
                    coreProduct: company.coreProduct || '',
                    positioning: company.positioning || '',
                    logoUrl: company.logoUrl || '',
                    websiteUrl: company.websiteUrl || '',
                    revenue: company.revenue ? String(company.revenue) : '',
                  }}
                  onSubmit={handleUpdateCompany}
                  onCancel={() => setIsEditing(false)}
                  submitLabel="Save Changes"
                  isLoading={isSaving}
                />
              </div>
            </div>
          </div>
        )}

        {/* Document Modal */}
        {selectedDocument && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[14px] max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">{selectedDocument.title}</h2>
                <div className="flex items-center gap-2">
                  <Link href={`/documents/${selectedDocument.id}`}>
                    <button className="px-3 py-2 text-[#DD3A44] hover:bg-[#FEF2F2] rounded-[10px] text-[13px] font-medium transition">
                      View Full
                    </button>
                  </Link>
                  <button 
                    onClick={() => setSelectedDocument(null)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-[#F5F5F5] rounded-[10px] transition"
                  >
                    <FontAwesomeIcon icon={faTimes} className="text-[#A3A3A3]" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4 text-[12px] text-[#A3A3A3]">
                  {selectedDocument.documentType} • Updated {new Date(selectedDocument.updatedAt).toLocaleDateString()}
                </div>
                <div className="prose max-w-none">
                  {/* Document content would go here */}
                  <p className="text-[#525252]">Document preview coming soon...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Insight Modal */}
        {selectedInsight && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[14px] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">{selectedInsight.title}</h2>
                <div className="flex items-center gap-2">
                  <Link href={`/insights/${selectedInsight.id}`}>
                    <button className="px-3 py-2 text-[#DD3A44] hover:bg-[#FEF2F2] rounded-[10px] text-[13px] font-medium transition">
                      View Full
                    </button>
                  </Link>
                  <button 
                    onClick={() => setSelectedInsight(null)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-[#F5F5F5] rounded-[10px] transition"
                  >
                    <FontAwesomeIcon icon={faTimes} className="text-[#A3A3A3]" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2 py-1 rounded-[6px] text-[12px] font-medium ${
                    selectedInsight.status === 'new' ? 'bg-[#f0fafa] text-[#006766]' : 'bg-[#f6f3f2] text-[#5a5757]'
                  }`}>
                    {selectedInsight.status}
                  </span>
                  <span className="text-[12px] text-[#A3A3A3]">{selectedInsight.insightType}</span>
                </div>
                <p className="text-[#525252] text-[15px]">{selectedInsight.summary}</p>
              </div>
            </div>
          </div>
        )}

        {/* Memory Modal */}
        {selectedMemory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[14px] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">{selectedMemory.title}</h2>
                <div className="flex items-center gap-2">
                  <Link href={`/memory/${selectedMemory.id}`}>
                    <button className="px-3 py-2 text-[#DD3A44] hover:bg-[#FEF2F2] rounded-[10px] text-[13px] font-medium transition">
                      View Full
                    </button>
                  </Link>
                  <button 
                    onClick={() => setSelectedMemory(null)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-[#F5F5F5] rounded-[10px] transition"
                  >
                    <FontAwesomeIcon icon={faTimes} className="text-[#A3A3A3]" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[12px] text-[#A3A3A3]">{selectedMemory.memoryType}</span>
                  <span className="text-[12px] text-[#525252]">
                    Confidence: {selectedMemory.confidenceScore}/10
                  </span>
                </div>
                <p className="text-[#525252] text-[15px]">{selectedMemory.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* File Modal */}
        {selectedFile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[14px] max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">{selectedFile.filename}</h2>
                <div className="flex items-center gap-2">
                  <a 
                    href={selectedFile.url}
                    download
                    className="px-3 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] text-[13px] font-medium transition"
                  >
                    Download
                  </a>
                  <button 
                    onClick={() => setSelectedFile(null)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-[#F5F5F5] rounded-[10px] transition"
                  >
                    <FontAwesomeIcon icon={faTimes} className="text-[#A3A3A3]" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4 text-[12px] text-[#A3A3A3]">
                  {(Number(selectedFile.sizeBytes) / 1024).toFixed(1)} KB • Uploaded{' '}
                  {new Date(selectedFile.uploadedAt).toLocaleDateString()}
                </div>
                <div className="bg-[#F5F5F5] rounded-[10px] p-8 text-center">
                  <p className="text-[#525252]">File preview coming soon...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Project Modal */}
        {showCreateProject && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[14px] max-w-lg w-full">
              <div className="border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">Create Project</h2>
                <button 
                  onClick={() => {
                    setShowCreateProject(false)
                    setProjectFormData({ title: '', description: '' })
                  }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[#F5F5F5] rounded-[10px] transition"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-[#A3A3A3]" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={projectFormData.title}
                    onChange={(e) => setProjectFormData({ ...projectFormData, title: e.target.value })}
                    placeholder="Enter project name"
                    className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                    Description
                  </label>
                  <textarea
                    value={projectFormData.description}
                    onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
                    placeholder="Enter project description (optional)"
                    rows={4}
                    className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition resize-none"
                  />
                </div>

                <div className="text-[13px] text-[#A3A3A3]">
                  This project will be linked to <span className="font-medium text-[#1A1A1A]">{company?.name}</span>
                </div>
              </div>
              <div className="border-t border-[#E5E5E5] px-6 py-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateProject(false)
                    setProjectFormData({ title: '', description: '' })
                  }}
                  className="px-4 py-2 text-[#525252] hover:bg-[#F5F5F5] rounded-[10px] text-[13px] font-medium transition"
                  disabled={creatingProject}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={creatingProject || !projectFormData.title.trim()}
                  className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] text-[13px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingProject ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Document Modal */}
        {showCreateDocument && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[14px] max-w-lg w-full">
              <div className="border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">Create Document</h2>
                <button 
                  onClick={() => {
                    setShowCreateDocument(false)
                    setDocumentFormData({ title: '', documentType: 'general' })
                  }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[#F5F5F5] rounded-[10px] transition"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-[#A3A3A3]" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    value={documentFormData.title}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, title: e.target.value })}
                    placeholder="Enter document title"
                    className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                    Document Type
                  </label>
                  <select
                    value={documentFormData.documentType}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, documentType: e.target.value })}
                    className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] focus:outline-none focus:border-[#DD3A44] transition"
                  >
                    <option value="general">General</option>
                    <option value="strategy">Strategy</option>
                    <option value="plan">Plan</option>
                    <option value="analysis">Analysis</option>
                    <option value="report">Report</option>
                  </select>
                </div>

                <div className="text-[13px] text-[#A3A3A3]">
                  This document will be linked to <span className="font-medium text-[#1A1A1A]">{company?.name}</span>
                </div>
              </div>
              <div className="border-t border-[#E5E5E5] px-6 py-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateDocument(false)
                    setDocumentFormData({ title: '', documentType: 'general' })
                  }}
                  className="px-4 py-2 text-[#525252] hover:bg-[#F5F5F5] rounded-[10px] text-[13px] font-medium transition"
                  disabled={creatingDocument}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateDocument}
                  disabled={creatingDocument || !documentFormData.title.trim()}
                  className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] text-[13px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingDocument ? 'Creating...' : 'Create Document'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Objective Modal */}
        {showCreateObjective && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[14px] max-w-lg w-full">
              <div className="border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">Create Objective</h2>
                <button 
                  onClick={() => {
                    setShowCreateObjective(false)
                    setObjectiveFormData({ title: '', description: '' })
                  }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[#F5F5F5] rounded-[10px] transition"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-[#A3A3A3]" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                    Objective Title *
                  </label>
                  <input
                    type="text"
                    value={objectiveFormData.title}
                    onChange={(e) => setObjectiveFormData({ ...objectiveFormData, title: e.target.value })}
                    placeholder="Enter objective title"
                    className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                    Description
                  </label>
                  <textarea
                    value={objectiveFormData.description}
                    onChange={(e) => setObjectiveFormData({ ...objectiveFormData, description: e.target.value })}
                    placeholder="Enter objective description (optional)"
                    rows={4}
                    className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition resize-none"
                  />
                </div>

                <div className="text-[13px] text-[#A3A3A3]">
                  This objective will be linked to <span className="font-medium text-[#1A1A1A]">{company?.name}</span>
                </div>
              </div>
              <div className="border-t border-[#E5E5E5] px-6 py-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateObjective(false)
                    setObjectiveFormData({ title: '', description: '' })
                  }}
                  className="px-4 py-2 text-[#525252] hover:bg-[#F5F5F5] rounded-[10px] text-[13px] font-medium transition"
                  disabled={creatingObjective}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateObjective}
                  disabled={creatingObjective || !objectiveFormData.title.trim()}
                  className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] text-[13px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingObjective ? 'Creating...' : 'Create Objective'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Task Modal */}
        {showCreateTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[14px] max-w-lg w-full">
              <div className="border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">Create Task</h2>
                <button 
                  onClick={() => {
                    setShowCreateTask(false)
                    setTaskFormData({ title: '', description: '' })
                  }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[#F5F5F5] rounded-[10px] transition"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-[#A3A3A3]" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={taskFormData.title}
                    onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                    placeholder="Enter task title"
                    className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                    Description
                  </label>
                  <textarea
                    value={taskFormData.description}
                    onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                    placeholder="Enter task description (optional)"
                    rows={4}
                    className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition resize-none"
                  />
                </div>

                <div className="text-[13px] text-[#A3A3A3]">
                  This task will be linked to <span className="font-medium text-[#1A1A1A]">{company?.name}</span>
                </div>
              </div>
              <div className="border-t border-[#E5E5E5] px-6 py-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateTask(false)
                    setTaskFormData({ title: '', description: '' })
                  }}
                  className="px-4 py-2 text-[#525252] hover:bg-[#F5F5F5] rounded-[10px] text-[13px] font-medium transition"
                  disabled={creatingTask}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTask}
                  disabled={creatingTask || !taskFormData.title.trim()}
                  className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] text-[13px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingTask ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
